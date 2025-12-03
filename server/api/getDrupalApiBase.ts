export function getDrupalApiBase(site: string) {
  // Lowercase the site so "County", "COUNTY", and "cOuNtY"
  // all end up in the same sad little bucket.
  const key = (site || "").toLowerCase();

  // This will hold the raw URL we pull out of the .env dumpster.
  let raw: string | undefined;

  switch (key) {
    case "county":
      // Default county Drupal: the mothership.
      raw = process.env.DRUPAL_BASE_URL;
      break;
    case "stepup":
      // StepUpTC — same Drupal, different flavor of politics.
      raw = process.env.DRUPAL_STEPUP_URL;
      break;
    case "animal":
      // Animal Services — where the good doggos (and bite reports) live.
      raw = process.env.DRUPAL_ANIMAL_URL;
      break;
    case "hhsa":
      // HHSA — the big ol' health & human services beast.
      raw = process.env.DRUPAL_HHSA_URL;
      break;
    default:
      // If we don’t recognize the site key, we quietly fall back
      // to the main county Drupal instead of exploding.
      raw = process.env.DRUPAL_BASE_URL;
      break;
  }

  // No matching env var? We just return an empty string and let
  // the caller decide how dramatic they want to be about it.
  if (!raw) return "";

  // Normalize the URL:
  // strip any trailing slashes so `${base}/jsonapi/...` doesn’t turn
  // into `https://drupal//jsonapi` and offend everyone’s eyes.
  return raw.replace(/\/+$/, "");
}
