import { defineEventHandler, readBody } from "h3";
import { Agent } from "undici";
import {
  getDrupalApiBase,
  getWorkbenchConfig,
  resolveWorkbenchField,
} from "../utils/drupal";

// Tiny in-memory cache so we don't keep asking Drupal the same
// “what's the UUID for this role” question like a confused goldfish.
const roleUuidCache: Record<string, Record<string, string>> = {};

export default defineEventHandler(async (event) => {
  // We expect JSON in the body because we are civilized(ish).
  const body = await readBody(event);

  const { sites, email, roles, sections } = body || {};

  // Bare-minimum sanity check:
  //  - email is required
  //  - sites must be an array
  //  - roles must be an array
  if (!email || !Array.isArray(sites) || !Array.isArray(roles)) {
    return { error: "Missing required fields" };
  }

  const trimmedEmail = email.trim();
  const results: Record<string, string> = {};

  // Agent that politely ignores TLS drama in dev / training environments.
  const agent = new Agent({
    connect: { rejectUnauthorized: false },
  });

  // Drupal’s love language: Basic Auth with a side of existential dread.
  const auth = Buffer.from(
    `${process.env.DRUPAL_USER}:${process.env.DRUPAL_PASS}`
  ).toString("base64");

  // JSON:API headers: the canonical way to talk to Drupal when it’s feeling fancy.
  const jsonApiHeaders = {
    Authorization: `Basic ${auth}`,
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
  };

  // REST headers: for when JSON:API says “no” and we go around back to kick the old REST door.
  const restHeaders = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Loop over each Drupal site and try to update the same user across all of them.
  for (const site of sites) {
    const apiBase = getDrupalApiBase(site);
    const workbench = getWorkbenchConfig(site);

    try {
      // Build a lookup URL to find the user by email/username.
      // Optionally include the workbench field so relationships come preloaded.
      const includeParam = workbench?.field
        ? `&include=${workbench.field}`
        : "";
      const lookupUrl = `${apiBase}/jsonapi/user/user?filter[name]=${encodeURIComponent(
        trimmedEmail
      )}${includeParam}`;

      const lookupRes = await fetch(lookupUrl, {
        dispatcher: agent,
        headers: jsonApiHeaders,
      } as any);

      // If the site is mad at us, we log the tantrum and move on to the next site.
      if (!lookupRes.ok) {
        const bodyText = await lookupRes.text();
        results[site] = formatFailure("Lookup", lookupRes.status, bodyText);
        continue;
      }

      const lookupJson = await lookupRes.json();
      const user = lookupJson.data?.[0];

      // No user here? Cool, we record that and keep going. No need to explode.
      if (!user) {
        results[site] = "User not found";
        continue;
      }

      const userId = user.id; // UUID form
      const userNumericId = user.attributes?.drupal_internal__uid; // integer ID for REST fallback

      // We'll gather roles that we can map to JSON:API entities here
      const availableJsonApiRoles: { name: string; id: string }[] = [];
      const missingRoles: string[] = [];

      // For each desired role name, turn it into a JSON:API role UUID.
      for (const roleName of roles) {
        const uuid = await getRoleUuid(
          site,
          apiBase,
          roleName,
          agent,
          jsonApiHeaders,
          restHeaders
        );
        if (uuid) {
          availableJsonApiRoles.push({ name: roleName, id: uuid });
        } else {
          missingRoles.push(roleName);
        }
      }

      // If literally none of the requested roles exist on this site,
      // there's nothing useful to do here.
      if (!availableJsonApiRoles.length) {
        results[site] = `No valid roles found for site (${missingRoles.join(
          ", "
        )})`;
        continue;
      }

      // JSON:API relationships want role entities by type+id
      const jsonApiRoles = availableJsonApiRoles.map((role) => ({
        type: "user_role--user_role",
        id: role.id,
      }));

      // REST fallback wants the machine names instead.
      const restRoleNames = availableJsonApiRoles.map((role) => role.name);

      // Workbench section field can be weird per site, so we resolve it dynamically.
      const resolvedWorkbenchField = resolveWorkbenchField(user, workbench);

      const patchUrl = `${apiBase}/jsonapi/user/user/${userId}`;

      // Start building our relationship payload with just roles.
      const payloadRelationships: Record<string, any> = {
        roles: { data: jsonApiRoles },
      };

      // Check if we actually have sections to apply and a field to attach them to.
      const hasSections = resolvedWorkbenchField && Array.isArray(sections);

      // If sections are provided and we know which relationship to use,
      // attach them as JSON:API relationships too.
      if (resolvedWorkbenchField && Array.isArray(sections)) {
        payloadRelationships[resolvedWorkbenchField] = {
          data: sections.map((id: string) => ({
            type: workbench!.resourceType,
            id,
          })),
        };
      }

      // First attempt: JSON:API PATCH
      const jsonApiResult = await fetchWithBody(patchUrl, {
        method: "PATCH",
        dispatcher: agent,
        headers: jsonApiHeaders,
        body: JSON.stringify({
          data: {
            type: "user--user",
            id: userId,
            relationships: payloadRelationships,
          },
        }),
      });

      if (jsonApiResult.ok) {
        // JSON:API did the thing 🎉
        const successBase = hasSections
          ? "Updated (sections applied)"
          : "Updated";
        results[site] = missingRoles.length
          ? `${successBase}; skipped missing roles: ${missingRoles.join(", ")}`
          : successBase;
        continue;
      }

      // If JSON:API refused but we still have a numeric user ID,
      // we fall back to the old-school Drupal REST user endpoint.
      if (userNumericId) {
        const restUrl = `${apiBase}/user/${userNumericId}?_format=json`;
        const restResult = await fetchWithBody(restUrl, {
          method: "PATCH",
          dispatcher: agent,
          headers: restHeaders,
          body: JSON.stringify({
            roles: restRoleNames.map((role: string) => ({ target_id: role })),
          }),
        });

        if (restResult.ok) {
          const successBase = hasSections
            ? "Updated (sections applied)"
            : "Updated";
          results[site] = missingRoles.length
            ? `${successBase}; skipped missing roles: ${missingRoles.join(
                ", "
              )}`
            : successBase;
          continue;
        }

        // Both JSON:API and REST failed. We report both horror stories.
        results[site] = [
          formatFailure("JSON:API", jsonApiResult.status, jsonApiResult.body),
          formatFailure("REST", restResult.status, restResult.body),
        ].join(" | ");
        continue;
      }

      // We got this far with no numeric ID and a failed JSON:API.
      // Not ideal. Not your fault. We log JSON:API's failure and move on.
      results[site] = formatFailure(
        "JSON:API",
        jsonApiResult.status,
        jsonApiResult.body
      );
    } catch (err: any) {
      // Hard error at the site level: network, parse, etc.
      results[site] = `Error: ${err.message || err}`;
    }
  }

  // Return a site→message map so the UI can show per-site status.
  return { results };
});

// Small helper that wraps fetch and always returns the response body text
// so we can log it / include snippets in error messages.
async function fetchWithBody(url: string, init: any) {
  const res = await fetch(url, init);
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

// Make error messages compact and slightly less awful to read.
function formatFailure(source: string, status: number, body: string) {
  const snippet = (body || "").trim().slice(0, 180);
  return snippet
    ? `${source} failed (${status}): ${snippet}`
    : `${source} failed (${status})`;
}

// Resolve a role name → role UUID using:
//  1) in-memory cache per site
//  2) JSON:API role map
//  3) single-role REST lookup
//  4) refresh role map and try again
async function getRoleUuid(
  site: string,
  apiBase: string,
  roleName: string,
  agent: Agent,
  jsonApiHeaders: Record<string, string>,
  restHeaders: Record<string, string>
) {
  const normalized = roleName.toLowerCase();

  if (!roleUuidCache[site]) {
    roleUuidCache[site] = await fetchRoleMap(apiBase, agent, jsonApiHeaders);
  }

  let uuid = roleUuidCache[site][normalized];
  if (uuid) {
    return uuid;
  }

  // Try the legacy REST endpoint for a single role name
  uuid = await fetchSingleRoleUuid(apiBase, normalized, agent, restHeaders);
  if (uuid) {
    roleUuidCache[site][normalized] = uuid;
    return uuid;
  }

  // If that didn’t help, refresh the entire role map
  // in case something changed in Drupal since last time.
  roleUuidCache[site] = await fetchRoleMap(apiBase, agent, jsonApiHeaders);
  return roleUuidCache[site][normalized] || null;
}

// Fetch a full map of machine_name → role UUID from JSON:API
async function fetchRoleMap(
  apiBase: string,
  agent: Agent,
  headers: Record<string, string>
) {
  const url = `${apiBase}/jsonapi/user_role/user_role?fields[user_role--user_role]=drupal_internal__id,id`;
  const res = await fetch(url, { dispatcher: agent, headers } as any);

  if (!res.ok) {
    const body = await res.text();
    console.error("Failed to load role map", url, res.status, body);
    return {};
  }

  const json = await res.json();
  const map: Record<string, string> = {};

  for (const role of json.data || []) {
    const rawMachineName =
      role.attributes?.drupal_internal__id ||
      role.attributes?.id ||
      role.attributes?.label;

    if (rawMachineName) {
      const machineName = String(rawMachineName).toLowerCase();
      map[machineName] = role.id;
    }
  }

  return map;
}

// Fallback for a single role: hit /entity/user_role/{machine_name}
// and try to pull the UUID out of the legacy REST response.
async function fetchSingleRoleUuid(
  apiBase: string,
  roleName: string,
  agent: Agent,
  headers: Record<string, string>
) {
  const url = `${apiBase}/entity/user_role/${roleName}?_format=json`;
  const res = await fetch(url, { dispatcher: agent, headers } as any);

  if (!res.ok) {
    return null;
  }

  try {
    const json = await res.json();
    return json?.uuid?.[0]?.value || null;
  } catch {
    return null;
  }
}
