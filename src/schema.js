/**
 * Motto skill-schema validator.
 *
 * Pure object validator — no filesystem, no YAML parsing, no imports beyond
 * this file's own scope. NEVER throws (D-01). All validation failures surface
 * through the returned errors[].
 *
 * Exports:
 *   - NAME_KEBAB {RegExp}  — canonical letter-start kebab regex (D-08, D-16)
 *   - validateSkill(skill, sharedRefs?) -> Array<{ skill, message }>
 */

/**
 * Canonical letter-start kebab-case regex for skill and plugin names.
 *
 * Pattern: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
 *   - starts with exactly one lowercase letter (letter-start — D-08 fix; the
 *     prior-art /^[a-z0-9]+/ wrongly allowed a leading digit)
 *   - followed by zero or more lowercase letters or digits
 *   - then zero or more groups of (one hyphen + one or more lowercase letters/digits)
 *
 * Valid examples:   "my-skill", "abc", "a1", "abc-def-123"
 * Invalid examples: "0bad" (leading digit), "My_Skill" (uppercase/underscore),
 *                   "my--skill" (double dash), "-bad" (leading dash), "bad-" (trailing dash)
 *
 * Anchored and unambiguous — no catastrophic backtracking (T-02-01): each `-`
 * unambiguously opens exactly one group; `-` cannot appear in [a-z0-9].
 *
 * Exported so src/config.js can reuse the same regex without diverging (D-16).
 *
 * @type {RegExp}
 */
export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Reserved substrings that must not appear in skill or plugin names (LINT-02, D-09).
 * @type {string[]}
 */
const RESERVED = ["anthropic", "claude"];

/**
 * Validate a parsed skill object against the Motto schema.
 *
 * Error-aggregation model (D-13):
 *   - NAME checks CASCADE: missing → non-kebab → reserved-word → ≠folder.
 *     The chain stops at the first failure; subsequent name checks are skipped
 *     because they are meaningless once an earlier check fails.
 *   - All OTHER checks (description, audience, body Title, body Role, each
 *     shared_references entry) are INDEPENDENT: they all run and all errors
 *     are collected together regardless of what other checks find.
 *
 * Unknown frontmatter keys (`template`, `dependencies`, …) are accepted
 * without error (D-14).
 *
 * @param {{ dirName: string, data: object, body: string }} skill
 *   `dirName` — the skill's source folder name (cascade anchor + error.skill)
 *   `data`    — parsed YAML frontmatter object (plain JS; never mutated)
 *   `body`    — Markdown body string after the closing `---` delimiter
 * @param {Set<string>} [sharedRefs]
 *   Set of available shared-reference basenames (without `.md`). Defaults to
 *   an empty Set; entries in data.shared_references are resolved against it.
 * @returns {Array<{ skill: string, message: string }>}
 *   Empty array when the skill is fully valid; one object per error otherwise.
 *   Each object's `skill` field equals `dirName`.
 */
export function validateSkill(skill, sharedRefs = new Set()) {
  const { dirName, data, body } = skill;
  const errors = [];

  /** Push one error attributed to this skill's dirName. */
  const err = (message) => errors.push({ skill: dirName, message });

  // ── NAME (cascade — D-08, D-09, D-13) ─────────────────────────────────────
  // Stop at the first failure. Do NOT accumulate multiple name errors.
  const name = data.name;
  if (!name) {
    // Step 1: missing / empty name
    err("name is required");
  } else if (!NAME_KEBAB.test(name)) {
    // Step 2: not letter-start kebab-case (D-08)
    err(
      `name must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/): "${name}"`
    );
  } else if (RESERVED.some((r) => name.includes(r))) {
    // Step 3: contains a reserved substring (D-09)
    err(
      `name must not contain the reserved substrings "anthropic" or "claude": "${name}"`
    );
  } else if (name !== dirName) {
    // Step 4: name does not match folder
    err(`name "${name}" must equal its folder name "${dirName}"`);
  }

  // ── DESCRIPTION (LINT-01, independent) ────────────────────────────────────
  if (!data.description) {
    err("description is required");
  }

  // ── AUDIENCE (LINT-03, D-11, independent) ─────────────────────────────────
  // Missing and invalid values both produce the same error message (D-11).
  if (data.audience !== "public" && data.audience !== "private") {
    err("audience must be public|private");
  }

  // ── BODY SPINE (LINT-04, D-12) — two INDEPENDENT checks ──────────────────
  const bodyStr = body || "";
  const bodyLines = bodyStr.split("\n");

  // Title check: the first non-blank line must be an H1 ("# " + non-space char).
  // Regex is anchored and linear-time (T-02-01).
  const firstNonBlankLine = bodyLines.find((l) => l.trim() !== "");
  if (!firstNonBlankLine || !/^# \S/.test(firstNonBlankLine)) {
    err(
      "body must begin with an H1 title line (# Title) as its first non-blank line"
    );
  }

  // Role check: body must contain at least one line starting with "**Role:".
  // Anchored multiline regex; `^` matches start of any line with the `m` flag (T-02-01).
  if (!/^\*\*Role:/m.test(bodyStr)) {
    err("body must contain a **Role:** line");
  }

  // ── SHARED_REFERENCES (LINT-05, D-10) — each entry is independent ─────────
  // For each entry, the safe-basename check runs FIRST (D-10): if the entry
  // contains "/" or ".", it is immediately flagged as an unsafe path reference
  // and the membership check is skipped for that entry. This prevents a
  // malicious reference from escaping shared/references/ in the build step
  // (T-02-02).
  const refs = Array.isArray(data.shared_references) ? data.shared_references : [];
  for (const entry of refs) {
    if (typeof entry === "string" && (entry.includes("/") || entry.includes("."))) {
      // Unsafe basename: contains a path separator or extension dot.
      err(
        `shared_references entry "${entry}" is an unsafe basename (must not contain "/" or ".")`
      );
    } else if (!sharedRefs.has(entry)) {
      // Safe basename but not in the available set.
      err(`shared_references entry "${entry}" not found in shared/references/`);
    }
  }

  return errors;
}
