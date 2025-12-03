import { defineEventHandler } from "h3";
import { Agent } from "undici";

export default defineEventHandler(async (event) => {
  // Manually decode query params like the little control freaks we are
  const query = getQuery(event);

  // Expecting ?sites=["county","animal",...]
  const sites = JSON.parse(query.sites || "[]");
  const user = query.user || "";
  const departmentFilter = query.department || "";

  const results: any[] = [];

  // Accept invalid TLS certs because Acquia dev/training said:
  // "What if security, but with vibes?"
  const agent = new Agent({
    connect: { rejectUnauthorized: false },
  });

  // Basic auth, again. Drupal’s love language is “credentials in headers.”
  const auth = Buffer.from(
    `${process.env.DRUPAL_USER}:${process.env.DRUPAL_PASS}`
  ).toString("base64");

  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  };

  // Walk through each requested site and ask:
  // “Does this user exist here, and if so, who are they socially?”
  for (const site of sites) {
    const apiBase = getDrupalApiBase(site);
    let userData = null;

    // ---- Build dynamic JSON:API URL ----
    // Start with users + their roles + their department
    let url = `${apiBase}/jsonapi/user/user?include=roles,field_department`;

    // Drupal JSON:API filters are basically query-string fanfiction.
    const filters: string[] = [];

    if (user) {
      // Filter by email/username containing the search text
      filters.push(
        `filter[mail][operator]=CONTAINS&filter[mail][value]=${encodeURIComponent(
          user
        )}`
      );
    }

    if (departmentFilter) {
      // Filter by department name containing the requested text
      filters.push(
        `filter[field_department.name][CONTAINS]=${encodeURIComponent(
          departmentFilter
        )}`
      );
    }

    if (filters.length) {
      // Attach all compiled filters to the URL like Christmas ornaments
      url += `&${filters.join("&")}`;
    }

    // ---- Execute request ----
    const init: any = { dispatcher: agent, headers };
    const res = await fetch(url, init);
    const text = await res.text();

    let json: any = null;
    try {
      // If this explodes, Drupal probably handed us HTML or a redirect page
      json = JSON.parse(text);
    } catch (e) {
      console.error(`Non-JSON response from ${site}:`, text.slice(0, 200));
      continue;
    }

    // We only care about the first match here — this is “does this user exist”, not a full search tool
    userData = json.data?.[0] || null;

    // Extract role IDs from the relationships, if we even have a user
    const roles =
      userData?.relationships?.roles?.data?.map((r: any) => {
        return r.meta?.drupal_internal__target_id;
      }) || [];

    let department = "—";

    // Resolve department from included resources, if Drupal was kind enough to send them
    if (json?.included?.length) {
      const depRel = userData?.relationships?.field_department?.data?.[0];
      if (depRel) {
        const depObj = json.included.find((i: any) => i.id === depRel.id);
        department = depObj?.attributes?.name || "—";
      }
    }

    // Push a single summary row for this site:
    //  - does the user exist?
    //  - what roles do they have?
    //  - what department do they belong to?
    //  - are they blocked or active?
    //  - when did they last bother to log in?
    results.push({
      site,
      siteLabel: siteLabels[site] || site,
      exists: !!userData,
      roles,
      department,
      status: userData?.attributes?.status ? "Active" : "Blocked",
      lastLogin: userData?.attributes?.login || "—",
    });
  }

  // Caller gets an array: one object per site, nice and flat,
  // instead of the fourteen layers of Drupal nesting we started with.
  return results;
});

// Tiny helper instead of relying on h3's sugar,
// because sometimes we like to see exactly what’s happening.
function getDrupalApiBase(site: string) {
  switch (site) {
    case "county":
      return process.env.DRUPAL_BASE_URL!;
    case "stepup":
      return process.env.DRUPAL_STEPUP_URL!;
    case "animal":
      return process.env.DRUPAL_ANIMAL_URL!;
    case "hhsa":
      return process.env.DRUPAL_HHSA_URL!;
    default:
      // Unknown? Shrug and send it to main county like everything else in your life.
      return process.env.DRUPAL_BASE_URL!;
  }
}

// Friendly display labels for the UI so we don’t show raw keys like goblins.
// (We are goblins, but we’re *thoughtful* goblins.)
const siteLabels: Record<string, string> = {
  county: "Training Site",
  stepup: "StepUpTC",
  animal: "Animal Services",
  hhsa: "HHSA",
};

// Homemade query parser: extract search params from the incoming request URL.
function getQuery(event: any) {
  const reqUrl = event.node?.req?.url || "";
  const u = new URL(reqUrl, "http://localhost");
  return Object.fromEntries(u.searchParams.entries());
}
