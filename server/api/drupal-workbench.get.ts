import { defineEventHandler, createError, getQuery } from "h3";
import { Agent } from "undici";
import {
  getDrupalApiBase,
  getWorkbenchConfig,
  resolveWorkbenchField,
} from "../utils/drupal";

export default defineEventHandler(async (event) => {
  // Grab query like a raccoon going through a trash can
  const query = getQuery(event);
  const site = (query.site as string) || "county";
  const email = (query.email as string) || "";

  // No email? No party. We bail loudly and immediately.
  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email is required.",
    });
  }

  // Figure out which Drupal we’re talking to and how Workbench is wired there
  const base = getDrupalApiBase(site);
  const workbench = getWorkbenchConfig(site);

  console.log("[drupal-workbench] resolved base", {
    site,
    apiBase: base,
    DRUPAL_ANIMAL_URL: process.env.DRUPAL_ANIMAL_URL,
  });

  // If we can’t even resolve the base URL or workbench config,
  // we just shrug and give the caller an “empty but valid” response.
  if (!base || !workbench) {
    return { site, field: null, vocabulary: null, terms: [], assigned: [] };
  }

  // Drupal basic auth (yes, it’s still A Thing™)
  const auth = Buffer.from(
    `${process.env.DRUPAL_USER}:${process.env.DRUPAL_PASS}`
  ).toString("base64");

  const jsonApiHeaders = {
    Authorization: `Basic ${auth}`,
    Accept: "application/vnd.api+json",
  };

  // undici Agent with TLS turned “don’t freak out” mode on
  const agent = new Agent({
    connect: { rejectUnauthorized: false },
  });

  // Tiny helper: fetch JSON or scream in a structured, HTTP-friendly way
  async function fetchJsonOrThrow(
    url: string,
    init: any,
    label: string
  ): Promise<any> {
    const res = await fetch(url, init);
    const bodyText = await res.text();
    const status = res.status;
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      console.error(
        `[drupal-workbench] ${label} failed ${status} ${contentType}`,
        bodyText.slice(0, 500)
      );
      throw createError({
        statusCode: status,
        statusMessage: `${label} failed with status ${status}.`,
      });
    }

    try {
      return JSON.parse(bodyText);
    } catch (err) {
      console.error(
        `[drupal-workbench] ${label} did not return JSON. status=${status} content-type=${contentType}`,
        bodyText.slice(0, 500)
      );
      throw createError({
        statusCode: 500,
        statusMessage: `${label} did not return JSON.`,
      });
    }
  }

  //
  // 1) TAXONOMY TERMS
  //    “Who are all the possible sections this poor user could belong to?”
  //
  const termsUrl =
    `${base}/jsonapi/taxonomy_term/${workbench.vocabulary}` +
    `?page[limit]=200` +
    `&fields[taxonomy_term--${workbench.vocabulary}]=name,drupal_internal__tid`;

  console.log("Fetching taxonomy from", termsUrl);

  const termsJson = await fetchJsonOrThrow(
    termsUrl,
    { dispatcher: agent, headers: jsonApiHeaders } as any,
    `Taxonomy terms for ${workbench.vocabulary} on ${site}`
  );

  // Normalize the JSON:API chaos into a nice, small array of {id, label, value, type}
  const terms =
    termsJson.data?.map((term: any) => {
      const tid = term.attributes?.drupal_internal__tid;
      return {
        id: term.id,
        label: term.attributes?.name || String(tid ?? term.id),
        value:
          tid !== undefined && tid !== null ? String(tid) : String(term.id),
        type: term.type,
      };
    }) || [];

  //
  // 2) USER LOOKUP
  //    “Okay, which Drupal human are we actually talking about?”
  //
  const includeParam = workbench.field ? `&include=${workbench.field}` : "";
  const userUrl =
    `${base}/jsonapi/user/user?filter[name]=${encodeURIComponent(email)}` +
    includeParam;

  const userJson = await fetchJsonOrThrow(
    userUrl,
    { dispatcher: agent, headers: jsonApiHeaders } as any,
    `User for workbench access (${email}) on ${site}`
  );

  const user = userJson.data?.[0];

  // No user? We don’t error; we just admit defeat and return “no sections”.
  if (!user) {
    console.warn(`[drupal-workbench] User not found for ${email} on ${site}`);
    return {
      site,
      field: workbench.field,
      vocabulary: workbench.vocabulary,
      resourceType: workbench.resourceType,
      terms,
      assigned: [],
    };
  }

  const uid = user.attributes?.drupal_internal__uid;
  if (!uid) {
    // User exists but no internal id? This is where we quietly scream into the logs.
    console.warn(
      `[drupal-workbench] Missing drupal_internal__uid for ${email} on ${site}`
    );
    return {
      site,
      field: workbench.field,
      vocabulary: workbench.vocabulary,
      resourceType: workbench.resourceType,
      terms,
      assigned: [],
    };
  }

  // Workbench fields can be… “creative”, so we resolve the field that actually exists.
  const resolvedField = resolveWorkbenchField(user, workbench);

  // Helpful debug output in non-prod so Future Jason can understand Past Jason’s choices
  if (process.env.NODE_ENV !== "production") {
    const relationshipKeys = Object.keys(user.relationships || {});
    console.log(
      `[drupal-workbench] relationships for ${email}`,
      relationshipKeys
    );
    if (!user.relationships?.[resolvedField || ""]) {
      console.log(
        `[drupal-workbench] configured field "${workbench.field}" missing. Using resolved field "${resolvedField}". Available relationships:`,
        relationshipKeys
      );
    }
  }

  //
  // 3) WORKBENCH SECTIONS
  //    This is the heart: “Which taxonomy terms is this user actually assigned to?”
  //
  let assigned: string[] = [];

  if (workbench.schemeId) {
    // Newer Workbench Access API: ask the nice JSON endpoint which sections the user has.
    const wbUrl = `${base}/api/workbench-access/${workbench.schemeId}/users/${uid}`;

    let wbJson: any = null;
    try {
      wbJson = await fetchJsonOrThrow(
        wbUrl,
        {
          dispatcher: agent,
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
          } as any,
        },
        `Workbench sections for uid=${uid} on ${site}`
      );
    } catch (e) {
      // If this fails, we log it but don’t take the whole request down with it.
      console.warn(
        `[drupal-workbench] Failed to load Workbench sections for uid=${uid} on ${site}`,
        e
      );
    }

    const rawSections = Array.isArray(wbJson?.sections) ? wbJson.sections : [];
    assigned = rawSections
      .map((s: any) => String(s))
      .filter((s: string) => /^\d+$/.test(s)); // keep only numeric ids, toss the rest
  } else {
    // Older / relationship-based approach:
    // Look at user.relationships[field].data and pull out the internal IDs.
    const relationshipData = resolvedField
      ? user?.relationships?.[resolvedField]?.data
      : null;

    if (Array.isArray(relationshipData)) {
      assigned = relationshipData.map((item: any) =>
        String(item.meta?.drupal_internal__target_id ?? item.id)
      );
    }

    // If that comes up empty, we fall back to included resources
    // like raccoons going back for one more trash bag.
    if (!assigned.length && Array.isArray(userJson.included)) {
      const fallback = userJson.included
        .filter((item: any) => item.type === workbench.resourceType)
        .map((item: any) =>
          String(item.attributes?.drupal_internal__tid ?? item.id)
        );
      if (fallback.length) {
        assigned = fallback;
      }
    }
  }

  console.log(
    `[drupal-workbench] site=${site} terms=${terms.length} assigned=${assigned.length}`
  );

  // Final tidy bundle for the frontend:
  //  - which site we hit
  //  - which field ended up being used
  //  - the vocabulary and resource type
  //  - all the possible terms
  //  - and which ones this user is actually tied to
  return {
    site,
    field: resolvedField || workbench.field,
    vocabulary: workbench.vocabulary,
    resourceType: workbench.resourceType,
    terms,
    assigned,
  };
});
