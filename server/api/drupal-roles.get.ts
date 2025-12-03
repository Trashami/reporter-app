import { defineEventHandler, createError, getQuery } from "h3";
import { Agent } from "undici";
import { getDrupalApiBase } from "../utils/drupal";

export default defineEventHandler(async (event) => {
  // Scoop query params out of the request like snacks out of a bag
  const query = getQuery(event);
  const site = (query.site as string) || "county";

  // Turn "site" into an actual Drupal base URL or throw a stylish tantrum
  const apiBase = getDrupalApiBase(site);
  if (!apiBase) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown site "${site}".`,
    });
  }

  // Drupal says: "Basic auth please." We sigh and obey.
  const auth = Buffer.from(
    `${process.env.DRUPAL_USER}:${process.env.DRUPAL_PASS}`
  ).toString("base64");

  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/vnd.api+json",
  };

  // Undici Agent: the “please don’t yell about TLS” setting
  const agent = new Agent({
    connect: { rejectUnauthorized: false },
  });

  // JSON:API endpoint to list user roles. Very normal. Very chill. (Lies.)
  const url = `${apiBase}/jsonapi/user_role/user_role?fields[user_role--user_role]=label,drupal_internal__id`;
  const res = await fetch(url, { dispatcher: agent, headers } as any);

  if (!res.ok) {
    // If Drupal comes back upset, we surface its feelings as an HTTP error
    const body = await res.text();
    throw createError({
      statusCode: res.status,
      statusMessage: `Failed to load roles for ${site}. ${
        body || res.statusText
      }`,
    });
  }

  const json = await res.json();

  // Normalize the chaos:
  // turn JSON:API shape into a simple array of { value, label } role options
  const roles = (json.data || [])
    .map((role: any) => {
      const value =
        role.attributes?.drupal_internal__id ||
        role.attributes?.id ||
        role.attributes?.label;

      // If we can't find anything to use as an ID, we just quietly drop this role.
      if (!value) {
        return null;
      }

      return {
        value,
        // Prefer the pretty label, fall back to whatever we found as value
        label: role.attributes?.label || value,
      };
    })
    // Filter out the nulls like picking rocks out of your trail mix
    .filter(Boolean);

  console.log(`[drupal-roles] Loaded ${roles.length} roles for ${site}`);

  // Caller gets a tiny, tidy bundle: which site we hit and what roles exist there
  return { site, roles };
});
