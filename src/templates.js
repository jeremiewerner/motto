/**
 * Motto template registry.
 *
 * Pure data — no functions, no filesystem or YAML access, no imports (TMPL-02).
 * Adding a template is a data-only edit to this file; no linter code change
 * is required. `src/schema.js` imports SECTIONS/TEMPLATES and enforces them.
 *
 * Exports:
 *   - SECTIONS  {Object<string,string>} — body-tag name -> human description.
 *     Descriptions double as the schema doc source (D-07) and are quoted back
 *     to skill authors in lint error messages.
 *   - TEMPLATES {Object<string,object>} — template name -> rules.
 *     Each rule object may declare `requiredSections` (tag names that must be
 *     present, matched, and closed in the body — see `hasClosedSection` in
 *     src/schema.js). Future keys `requiredFields` and `waives` are part of
 *     the mechanism but unused by `procedure`.
 */

export const SECTIONS = {
  process: "Numbered steps the agent executes, in order.",
  success_criteria: "Checkable conditions that define done.",
};

export const TEMPLATES = {
  procedure: {
    requiredSections: ["process", "success_criteria"],
    // future keys: requiredFields, waives ("title" | "role")
  },
};
