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

/**
 * Letter-start kebab-case regex for plugin names.
 *
 * Intentional duplicate of NAME_KEBAB exported from src/schema.js (D-08, D-16).
 * The two regex literals MUST stay identical; this comment is the cross-reference.
 * Source of truth: src/schema.js export `NAME_KEBAB`.
 *
 * Pattern: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
 *   - starts with exactly one lowercase letter (letter-start — D-08 fix; the
 *     prior-art /^[a-z0-9]+/ wrongly allowed a leading digit)
 *   - followed by zero or more lowercase letters or digits
 *   - then zero or more groups of (one hyphen + one or more lowercase letters/digits)
 *
 * Valid examples:   "poems", "poems-pro", "abc-def-123"
 * Invalid examples: "0bad" (leading digit), "Bad_Name" (uppercase/underscore),
 *                   "Bad/Name" (slash), "my--skill" (double dash)
 *
 * Anchored and unambiguous — no catastrophic backtracking (T-03-01): each `-`
 * unambiguously opens exactly one group; `-` cannot appear in [a-z0-9].
 *
 * @type {RegExp}
 */
export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

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

  // Resolve to a plain JS object. doc.toJS() returns null for a null/empty document.
  const parsed = doc.toJS();
  config = parsed != null && typeof parsed === "object" ? parsed : {};

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

  return { config, errors };
}
