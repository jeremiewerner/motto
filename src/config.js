/**
 * Motto project-config validator.
 *
 * Pure validator — no filesystem I/O, never throws (D-01). All validation failures
 * surface through the returned errors[].
 *
 * Exports:
 *   - loadConfig(text: string) -> { config: object, errors: Array<{ message: string }> }
 */

import { parseDocument } from "yaml";
import { safeToJS } from "./frontmatter.js";
// src/schema.js is the sole source of NAME_KEBAB (REVIEW-11, D-16).
// schema.js has no imports, so there is no circular dependency.
import { NAME_KEBAB } from "./schema.js";
// src/version.js is the sole source of parseVersion (single-source-of-truth
// import edge, mirrors the NAME_KEBAB import above).
import { parseVersion } from "./version.js";

// Re-export so config.js's public surface is preserved — dogfood DOG-04 imports
// NAME_KEBAB from config.js to assert reference identity with schema.js.
export { NAME_KEBAB };

/**
 * Describe the JS type of a value for use in a validation error message.
 * Pure, never throws. Distinguishes array/null from generic "object" since
 * typeof collapses all three to "object".
 * @param {unknown} v
 * @returns {string}
 */
function describeType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/**
 * Parse and validate a raw motto.yaml text string.
 *
 * Error-aggregation model:
 *   - YAML parse errors are mapped from doc.errors[] into returned errors[] (D-02, D-18).
 *   - ALL missing required fields are collected together — no short-circuit (D-15, CONF-01).
 *   - Plugin names are validated against NAME_KEBAB only when the field is present (D-16).
 *   - plugins.private is optional — its ABSENCE is never an error (CONF-03, D-17).
 *
 * This function performs NO filesystem I/O. Phase 2 wires in the file read; this
 * function owns only the parse + validation logic.
 *
 * @param {string} text — raw motto.yaml content (a string, not a path)
 * @returns {{ config: object, errors: Array<{ message: string }> }}
 *   `config` — the parsed JS object (possibly partial on parse error; {} when null/empty).
 *   `errors` — empty array when the config is fully valid; one object per error otherwise.
 */
export function loadConfig(text) {
  const errors = [];
  let config = {};

  // ── YAML PARSE (D-02, D-18) ────────────────────────────────────────────────
  // parseDocument accumulates errors in doc.errors[] without throwing (D-01).
  let doc;
  try {
    doc = parseDocument(text);
  } catch (e) {
    // Defensive: parseDocument is specified not to throw, but D-01 requires we
    // never throw regardless of input. Catch and surface any unexpected exception.
    errors.push({ message: String(e.message || e) });
    return { config, errors };
  }

  // Map each YAML parse error into the returned errors[] (D-18).
  for (const yamlErr of doc.errors) {
    errors.push({ message: yamlErr.message || String(yamlErr) });
  }

  // Resolve to a plain JS object. safeToJS guards against toJS() throwing on an
  // unresolved alias (e.g. `name: *foo` — D-01, REVIEW-03). src/schema.js is
  // the sole source of NAME_KEBAB (REVIEW-11); safeToJS is the sole helper (REVIEW-02/03).
  const { value, threw, message } = safeToJS(doc);
  if (threw) {
    errors.push({ message });
  }
  config = value != null && typeof value === "object" ? value : {};

  // ── REQUIRED FIELDS (CONF-01, D-15) ───────────────────────────────────────
  // Collect ALL missing required fields together — no short-circuit (D-15).
  if (!config.name) {
    errors.push({ message: "missing name" });
  }
  if (!config.version) {
    errors.push({ message: "missing version" });
  }
  if (!config.description) {
    errors.push({ message: "missing description" });
  }

  // ── PLUGIN NAMES (CONF-02, D-16) ──────────────────────────────────────────
  const plugins =
    config.plugins != null && typeof config.plugins === "object"
      ? config.plugins
      : {};

  // plugins.public is required (CONF-01). Validate its format only when present.
  if (!plugins.public) {
    errors.push({ message: "missing plugins.public" });
  } else if (!NAME_KEBAB.test(plugins.public)) {
    errors.push({
      message: `plugins.public "${plugins.public}" must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)`,
    });
  }

  // plugins.private is OPTIONAL (CONF-03, D-17). Only validate format when present.
  if (plugins.private != null) {
    if (!NAME_KEBAB.test(plugins.private)) {
      errors.push({
        message: `plugins.private "${plugins.private}" must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)`,
      });
    }
  }

  // ── mottoVersion (VER-05, D-R1) ────────────────────────────────────────────
  // mottoVersion is OPTIONAL (VER-04/D-04) — its ABSENCE is never an error,
  // mirroring plugins.private (CONF-03, D-17). Presence is validated for
  // SHAPE only — malformed values are a clean error entry, never a throw.
  // Use `!== undefined` (NOT `!= null` and NOT a falsy check) — an empty
  // string is a real malformed case (Pitfall 1) that must NOT be swallowed
  // by the absence gate.
  if (config.mottoVersion !== undefined) {
    if (
      typeof config.mottoVersion !== "string" ||
      config.mottoVersion.trim() === ""
    ) {
      errors.push({
        message: `mottoVersion must be a version string like "0.0.7", got ${describeType(config.mottoVersion)}`,
      });
    } else if (!parseVersion(config.mottoVersion)) {
      errors.push({
        message: `mottoVersion "${config.mottoVersion}" is not a recognizable version string`,
      });
    }
  }

  return { config, errors };
}
