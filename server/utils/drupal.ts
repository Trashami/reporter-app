export type WorkbenchConfig = {
  field: string;
  vocabulary: string;
  resourceType: string;
  /**
   * Workbench Access scheme ID (e.g. "department_editor").
   * Optional so non-Workbench sites don’t have to define it.
   *
   * Translation: some sites are feral and don't use Workbench,
   * and we graciously tolerate their life choices.
   */
  schemeId?: string;
};

// Global defaults for Workbench settings, so we don’t have to
// repeat ourselves 47 times in .env like true goblins.
const DEFAULT_WORKBENCH_FIELD =
  process.env.DRUPAL_WORKBENCH_FIELD || "field_department";

const DEFAULT_WORKBENCH_VOCAB =
  process.env.DRUPAL_WORKBENCH_VOCAB || "departments";

/**
 * Optional: default Workbench Access scheme ID.
 * Example for county main: "department_editor".
 *
 * If a specific site doesn't override this, we assume it's
 * using the same basic "editor-by-department" setup.
 */
const DEFAULT_WORKBENCH_SCHEME =
  process.env.DRUPAL_WORKBENCH_SCHEME || "department_editor";

/**
 * Turn a friendly site key ("county", "animal", etc.)
 * into a base Drupal URL from the environment.
 *
 * If in doubt, we punt everything to DRUPAL_BASE_URL like
 * every ticket you've ever gotten that says "just put it on main".
 */
export function getDrupalApiBase(site: string) {
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
      // Unknown site? Shrug and send it to the main Drupal.
      return process.env.DRUPAL_BASE_URL!;
  }
}

/**
 * Build the Workbench configuration for a given site:
 *  - which relationship field holds the sections
 *  - which vocabulary those sections belong to
 *  - what the taxonomy resource type is
 *  - optional Workbench scheme ID
 *
 * Reads from env vars when present, falls back to global defaults
 * so you don't have to configure every site by hand unless you're into that.
 */
export function getWorkbenchConfig(site: string): WorkbenchConfig | null {
  const upper = site?.toUpperCase?.() || "";

  // Site-specific overrides, if they exist:
  // DRUPAL_COUNTY_WORKBENCH_FIELD, DRUPAL_ANIMAL_WORKBENCH_VOCAB, etc.
  const siteField =
    (process.env[`DRUPAL_${upper}_WORKBENCH_FIELD`] as string) || "";
  const siteVocab =
    (process.env[`DRUPAL_${upper}_WORKBENCH_VOCAB`] as string) || "";
  const siteScheme =
    (process.env[`DRUPAL_${upper}_WORKBENCH_SCHEME`] as string) || "";

  // Fall back to defaults if a site hasn’t been bougie enough to override them.
  const field = siteField || DEFAULT_WORKBENCH_FIELD;
  const vocabulary = siteVocab || DEFAULT_WORKBENCH_VOCAB;
  const schemeId = siteScheme || DEFAULT_WORKBENCH_SCHEME || "";

  // If somehow we ended up with neither field nor vocab,
  // this site does not get Workbench privileges today.
  if (!field || !vocabulary) {
    return null;
  }

  return {
    field,
    vocabulary,
    // JSON:API resource type that Workbench sections live under.
    resourceType: `taxonomy_term--${vocabulary}`,
    // Pass undefined instead of "" so downstream checks can use truthiness.
    schemeId: schemeId || undefined,
  };
}

/**
 * Try to figure out which relationship field actually holds
 * the Workbench sections for this user.
 *
 * Some sites/configs lie. Some rename fields. Some just enjoy pain.
 * So we:
 *  1) Try the configured field directly
 *  2) If that fails, scan relationships and find one whose items match
 *     the vocabulary’s resource type (e.g. taxonomy_term--departments)
 */
export function resolveWorkbenchField(
  user: any,
  workbench: WorkbenchConfig | null
) {
  if (!workbench || !user?.relationships) {
    // If we don't even have relationships to inspect, just return the configured
    // field (or null) and let the caller decide how sad to be about it.
    return workbench?.field || null;
  }

  const relationships = user.relationships || {};

  // Exact match first: if the configured field exists and has data,
  // we trust it and move on with our lives.
  if (relationships[workbench.field]?.data) {
    return workbench.field;
  }

  // Fallback search:
  // Find any relationship whose items are taxonomy terms of the expected type.
  // e.g. type === "taxonomy_term--departments"
  const match = Object.entries(relationships).find(([_, rel]: any) => {
    const data = rel?.data;
    if (!Array.isArray(data)) {
      return false;
    }
    return data.some((item: any) => item.type === workbench.resourceType);
  });

  // If we find one, use that key as the “real” field name.
  // Otherwise we limp along with the configured one anyway.
  return match ? (match[0] as string) : workbench.field;
}
