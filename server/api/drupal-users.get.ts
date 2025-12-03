import { defineEventHandler, createError } from "h3";

export default defineEventHandler(async () => {
  // Base Drupal URL:
  //  - prefer env var
  //  - fall back to training if someone forgot to configure things (never happens, right?)
  const baseUrl =
    process.env.DRUPAL_BASE_URL || "http://training.tcweb.acsitefactory.com";
  const url = `${baseUrl}/jsonapi/user/user`;

  // Old-school Basic Auth: like a motel key in a world of keycards
  const credentials = Buffer.from(
    `${process.env.DRUPAL_USER}:${process.env.DRUPAL_PASS}`
  ).toString("base64");

  try {
    // Go poke Drupal and ask it for all the users it’s hoarding
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    // If Drupal comes back with anything but “ok”, we log the drama and bail
    if (!res.ok) {
      const body = await res.text();
      console.error("Drupal returned", res.status, body);
      throw new Error(`Drupal returned ${res.status}`);
    }

    const json = await res.json();

    // Flatten JSON:API’s “I have 400 layers” structure into something humane:
    //  - id
    //  - name (prefer display_name, fall back to username)
    //  - email (same as name for Drupal’s user entity)
    //  - roles (internal IDs pulled out of relationships)
    const users = json.data.map((u: any) => ({
      id: u.id,
      name: u.attributes.display_name || u.attributes.name,
      email: u.attributes.name,
      roles:
        u.relationships?.roles?.data?.map(
          (r: any) => r.meta?.drupal_internal__target_id
        ) || [],
    }));

    // Return a nice clean array instead of the eldritch JSON:API beast we received
    return users;
  } catch (err) {
    // We log the chaos for Future You, then throw a friendly 500 for the client
    console.error("Failed to fetch users from Drupal:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch users from Drupal.",
    });
  }
});
