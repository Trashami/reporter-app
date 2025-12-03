import { defineEventHandler, readBody } from "h3";
import { Agent } from "undici";

export default defineEventHandler(async (event) => {
  // Expecting a nice tidy JSON body with { email, sites, roles }
  const { email, sites, roles } = await readBody(event);

  // Bare-minimum sanity check:
  // if you can’t give me these three, we’re not doing anything spicy.
  if (!email || !sites || !roles) {
    return { error: "Missing required fields" };
  }

  // Acquia Site Factory credentials:
  // Yes, it’s Basic Auth. No, we don’t like it. Yes, we still do it.
  const auth = Buffer.from(
    `${process.env.ASF_USER}:${process.env.ASF_KEY}`
  ).toString("base64");

  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
  };

  // Results keyed by siteId → status string
  const results: any = {};

  // Undici Agent set to “please don’t scream about certs”
  const agent = new Agent({
    connect: { rejectUnauthorized: false },
  });

  // Loop through each Acquia site ID and try to update the user there.
  for (const siteId of sites) {
    try {
      // ASF endpoint to assign roles to a user on a specific site.
      // We’re basically emailing the landlord saying
      // “this person lives here now and gets these keys.”
      const res = await (fetch as any)(
        `https://www.acsitefactory.com/api/v1/sites/${siteId}/users`,
        {
          method: "POST",
          dispatcher: agent,
          headers,
          body: JSON.stringify({ email, roles }),
        }
      );

      // If ASF says “ok”, we assume it did the thing.
      // If not, we log the status code so someone can cry about it later.
      results[siteId] = res.ok ? "Updated" : `Failed (${res.status})`;
    } catch (err: any) {
      // Network / runtime error: we capture the message instead of exploding the whole batch.
      results[siteId] = `Error: ${err.message}`;
    }
  }

  // Caller gets a siteId → status map so they can see which sites behaved
  // and which ones need to be put in timeout.
  return { results };
});
