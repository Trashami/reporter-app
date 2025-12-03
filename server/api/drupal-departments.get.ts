// server/api/drupal-departments.get.ts

import { defineEventHandler, EventHandlerRequest, H3Event } from "h3";
import { Agent } from "undici";
import { getDrupalApiBase } from "../utils/drupal";

export default defineEventHandler(async (event) => {
  // Manually parse the query string because sometimes we like control
  // and also h3's helpers aren't always where we want them.
  const query = getQuery(event);

  // Expecting ?sites=["county","animal",...]
  // If this blows up, we gracefully pretend the user sent "[]".
  const sites = JSON.parse(query.sites || "[]");

  // Use a Set so duplicate department/site combos can't sneak in
  // like raccoons trying to go through the same trash twice.
  const results = new Set<string>();

  // Undici agent: "please don't yell about self-signed certs today"
  const agent = new Agent({
    connect: { rejectUnauthorized: false },
  });

  // Yeah, it's Basic Auth. Yeah, it's 2025, but we do what Drupal demands.
  const auth = Buffer.from(
    `${process.env.DRUPAL_USER}:${process.env.DRUPAL_PASS}`
  ).toString("base64");

  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  };

  // Loop through each requested site and try very hard
  // to figure out what “departments” means over there.
  for (const site of sites) {
    const base = getDrupalApiBase(site);

    let url = `${base}/jsonapi/taxonomy_term/departments`;

    console.log(`Fetching taxonomy from ${url}`);

    try {
      // First attempt: the “nice” way — hit the departments endpoint directly.
      const res = await fetch(url, { dispatcher: agent, headers } as any);
      const text = await res.text();

      // If the response doesn’t even look like JSON,
      // assume it’s HTML, a redirect page, or some Drupal gremlin.
      if (!text.startsWith("{")) throw new Error("HTML-redirect or empty");

      const taxJson = JSON.parse(text);

      // Normalize the result into { name, site } records,
      // but store them as JSON strings so the Set can de-dup them reliably.
      taxJson.data?.forEach((t: { attributes: { name: any } }) =>
        results.add(JSON.stringify({ name: t.attributes.name, site }))
      );

      // If this worked, no need for fallback — on to the next site.
      continue;
    } catch (err) {
      // If we’re here, either the endpoint is missing, HTML, or otherwise cursed.
      console.warn(
        `Direct department fetch failed on ${site}, attempting fallback...`
      );
    }

    // Fallback Plan B:
    // Ask the vocabularies what the ID of the "departments" vocab is,
    // then filter taxonomy terms by that ID like it’s 2014 again.
    try {
      const vocabRes = await fetch(
        `${base}/jsonapi/taxonomy_vocabulary/taxonomy_vocabulary`,
        { dispatcher: agent, headers } as any
      );

      const vocabJson = await vocabRes.json();

      const dep = vocabJson.data?.find(
        (v: { attributes: { drupal_internal__vid: string } }) =>
          v.attributes.drupal_internal__vid === "departments"
      );

      // If there’s no departments vocab here, we just shrug and move on.
      if (!dep) continue;

      const fallbackUrl = `${base}/jsonapi/taxonomy_term/departments?filter[vocabulary.id]=${dep.id}`;
      console.log(`Fallback taxonomy fetch → ${fallbackUrl}`);

      const depRes = await fetch(fallbackUrl, {
        dispatcher: agent,
        headers,
      } as any);

      const depJson = await depRes.json();

      // Same trick as above: store { name, site } as JSON string in the Set.
      depJson.data?.forEach((t: { attributes: { name: any } }) =>
        results.add(JSON.stringify({ name: t.attributes.name, site }))
      );
    } catch (err) {
      // When even fallback fails, we log it and keep going.
      console.warn(`Fallback failed on ${site}`, err);
    }
  }

  // Finally turn our Set of JSON strings back into actual objects
  // so the caller gets nice clean data instead of raccoon-strings.
  return Array.from(results).map((r) => JSON.parse(r));
});

// Minimal query parser because we don’t trust anything, including ourselves.
function getQuery(event: H3Event<EventHandlerRequest>) {
  const reqUrl = event.node?.req?.url || "";
  const u = new URL(reqUrl, "http://localhost");
  return Object.fromEntries(u.searchParams.entries());
}
