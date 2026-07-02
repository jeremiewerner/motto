/**
 * Motto skill-schema validator.
 *
 * Pure object validator — no filesystem, no YAML parsing, no imports beyond
 * this file's own scope (except the pure-data `./templates.js` registry).
 * NEVER throws (D-01). All validation failures surface through the returned
 * errors[].
 *
 * Exports:
 *   - NAME_KEBAB {RegExp}  — canonical letter-start kebab regex (D-08, D-16)
 *   - hasClosedSection(body, tagName) -> boolean
 *   - validateSkill(skill, sharedRefs?, templatesRegistry?) -> Array<{ skill, message }>
 */

import { SECTIONS, TEMPLATES } from "./templates.js";

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
 * Determine whether `body` contains a matched, line-anchored pair of
 * `<tagName>` / `</tagName>` markers OUTSIDE any fenced code block (TMPL-03).
 *
 * Two-phase implementation (PATTERNS.md Pattern 2) to avoid a hot-loop regex
 * pitfall: (1) a single pass over the lines toggles an `inFence` flag on any
 * fence-marker line (3+ backticks or 3+ tildes, up to 3 leading spaces,
 * matching CommonMark fence semantics) and collects only unfenced,
 * non-marker lines; (2) the collected text is tested once with two anchored
 * multiline regexes.
 *
 * `tagName` is always sourced from the trusted internal registry
 * (`TEMPLATES[...].requiredSections`), never from raw `data.template` — safe
 * to interpolate into `new RegExp(...)` with no injection risk (T-Q-01
 * precedent).
 *
 * No end-of-line anchor on the open matcher: per Assumption A2, a tag that
 * "starts the line" still counts even with trailing same-line content
 * (e.g. `<process> notes`).
 *
 * @param {string} body
 * @param {string} tagName
 * @returns {boolean}
 */
export function hasClosedSection(body, tagName) {
  const bodyStr = body || "";
  const lines = bodyStr.split("\n");
  const fenceRe = /^ {0,3}(`{3,}|~{3,})/;
  const unfencedLines = [];
  let inFence = false;
  for (const line of lines) {
    if (fenceRe.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) unfencedLines.push(line);
  }
  const text = unfencedLines.join("\n");
  const openRe = new RegExp(`^<${tagName}>`, "m");
  const closeRe = new RegExp(`^</${tagName}>`, "m");
  return openRe.test(text) && closeRe.test(text);
}

/**
 * Reserved substrings that must not appear in a skill's SKILL.md `name`
 * frontmatter field (LINT-02, D-09).
 *
 * Scope: SKILL.md `name` ONLY. Claude Code's `plugin.json` `name` field
 * (motto.yaml's `plugins.public`/`plugins.private`) has no reserved-word restriction
 * — see code.claude.com/docs/en/plugins-reference (verified 2026-07-02).
 * Do NOT reuse RESERVED for plugins.public/plugins.private validation in
 * src/config.js or src/init.js.
 *
 * @type {string[]}
 */
const RESERVED = ["anthropic", "claude"];

/**
 * Validate a parsed skill object against the Motto schema.
 *
 * Error-aggregation model (D-13):
 *   - NAME checks CASCADE: missing/falsy → non-string → non-kebab → max-64 → reserved-word → ≠folder.
 *     The chain stops at the first failure; subsequent name checks are skipped
 *     because they are meaningless once an earlier check fails.
 *   - TEMPLATE (`data.template`, TMPL-01/02/04/05) is its own internal
 *     CASCADE: non-string → stop; unknown template name → stop; else check
 *     each required section. Resolves `waivedSections`, consulted by the
 *     Title/Role checks below, BEFORE they run.
 *   - All OTHER checks (description, audience, body Title, body Role, each
 *     shared_references entry) are INDEPENDENT: they all run and all errors
 *     are collected together regardless of what other checks find.
 *
 * `dependencies` (and any other unknown frontmatter key) is accepted without
 * error (D-14). `template` is no longer a passthrough key as of TMPL-01 — see
 * the TEMPLATE cascade below.
 *
 * @param {{ dirName: string, data: object, body: string }} skill
 *   `dirName` — the skill's source folder name (cascade anchor + error.skill)
 *   `data`    — parsed YAML frontmatter object (plain JS; never mutated)
 *   `body`    — Markdown body string after the closing `---` delimiter
 * @param {Set<string>} [sharedRefs]
 *   Set of available shared-reference basenames (without `.md`). Defaults to
 *   an empty Set; entries in data.shared_references are resolved against it.
 * @param {{ SECTIONS: object, TEMPLATES: object }} [templatesRegistry]
 *   Injectable template registry, defaulting to the real `./templates.js`
 *   exports. Tests use this to exercise the `waives` merge logic via a
 *   fixture template without mutating `src/templates.js` (TMPL-02).
 * @returns {Array<{ skill: string, message: string }>}
 *   Empty array when the skill is fully valid; one object per error otherwise.
 *   Each object's `skill` field equals `dirName`.
 */
export function validateSkill(
  skill,
  sharedRefs = new Set(),
  templatesRegistry = { SECTIONS, TEMPLATES }
) {
  const { dirName, data, body } = skill;
  const errors = [];
  const { SECTIONS: SEC, TEMPLATES: TPL } = templatesRegistry;

  /** Push one error attributed to this skill's dirName. */
  const err = (message) => errors.push({ skill: dirName, message });

  // ── NAME (cascade — D-08, D-09, D-13) ─────────────────────────────────────
  // Stop at the first failure. Do NOT accumulate multiple name errors.
  const name = data.name;
  if (!name) {
    // Step 1: missing / empty / falsy name (false, 0, "", null, undefined)
    err("name is required");
  } else if (typeof name !== "string") {
    // Step 2: non-string truthy name (e.g. YAML boolean true, number 123, array, object).
    // Must guard BEFORE NAME_KEBAB.test() and RESERVED.includes() — both coerce and
    // may throw (`.includes` is not defined on booleans). D-01: never throw. (REVIEW-01)
    err(`name must be a string (got ${typeof name})`);
  } else if (!NAME_KEBAB.test(name)) {
    // Step 3: not letter-start kebab-case (D-08)
    err(
      `name must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/): "${name}"`
    );
  } else if (name.length > 64) {
    // Step 3: name exceeds maximum length of 64 characters (D-03)
    err(`name must not exceed 64 characters (got ${name.length}): "${name}"`);
  } else if (RESERVED.some((r) => name.includes(r))) {
    // Step 4: contains a reserved substring (D-09)
    err(
      `name must not contain the reserved substrings "anthropic" or "claude": "${name}"`
    );
  } else if (name !== dirName) {
    // Step 5: name does not match folder
    err(`name "${name}" must equal its folder name "${dirName}"`);
  }

  // ── DESCRIPTION (LINT-01, independent) ────────────────────────────────────
  if (!data.description) {
    err("description is required");
  } else {
    // Both checks run independently — neither guards the other (D-13).
    // Guards are inside the else branch so a falsy description cannot throw (D-01).
    if (data.description.length > 1024) {
      // D-03: description must not exceed 1024 characters
      err(
        `description must not exceed 1024 characters (got ${data.description.length})`
      );
    }
    // D-05: description must not contain XML-tag shapes. Pattern matches only
    // real tag-like constructs (optional leading /, letter-led tag name,
    // optional trailing whitespace + optional self-close /, then >) so that
    // ordinary comparison/math prose like "a<b and b>c" is NOT flagged.
    // Adjacent quantifiers cover disjoint character classes ([a-zA-Z0-9-] vs \s)
    // — no catastrophic backtracking (T-Q-01). (REVIEW-04)
    if (/<\/?[a-zA-Z][a-zA-Z0-9-]*\s*\/?>/.test(data.description)) {
      err("description must not contain XML tags (e.g. <example>)");
    }
  }

  // ── AUDIENCE (LINT-03, D-11, independent) ─────────────────────────────────
  // Missing and invalid values both produce the same error message (D-11).
  if (data.audience !== "public" && data.audience !== "private") {
    err("audience must be public|private");
  }

  const bodyStr = body || "";
  const bodyLines = bodyStr.split("\n");

  // ── TEMPLATE (TMPL-01, TMPL-02, TMPL-04, TMPL-05) ──────────────────────────
  // Own internal cascade (non-string → stop; unknown name → stop; else check
  // sections), independent of NAME/DESCRIPTION/AUDIENCE (D-13). Must run and
  // resolve `waivedSections` BEFORE the Title/Role checks below so waives can
  // gate them (Pitfall 2). hasOwnProperty, NOT a truthy check — an explicitly
  // present falsy value (empty string, YAML null, etc.) must error, never
  // silently skip (D-07 intent-declared).
  const hasTemplateKey = Object.prototype.hasOwnProperty.call(data, "template");
  let waivedSections = new Set();

  if (hasTemplateKey) {
    const tpl = data.template;
    if (typeof tpl !== "string") {
      // Guard BEFORE any string-only method / coercion — mirrors the NAME
      // non-string guard above. Short-circuits a throwing toString/
      // Symbol.toPrimitive before it is ever invoked (D-01, T-14-03).
      err(`template must be a string (got ${typeof tpl})`);
    } else if (!Object.prototype.hasOwnProperty.call(TPL, tpl)) {
      const available = Object.keys(TPL).sort().join(", ");
      err(`unknown template "${tpl}" (available: ${available})`);
    } else {
      const { requiredSections = [], waives = [] } = TPL[tpl];
      waivedSections = new Set(waives);
      for (const section of requiredSections) {
        if (!hasClosedSection(bodyStr, section)) {
          err(
            `template "${tpl}" requires <${section}>…</${section}> section — ${SEC[section] ?? ""}`
          );
        }
      }
    }
  }

  // ── BODY SPINE (LINT-04, D-12) — two INDEPENDENT checks ──────────────────
  // Title check: the first non-blank line must be an H1 ("# " + non-space char).
  // Regex is anchored and linear-time (T-02-01). Skipped when a template
  // waives "title".
  if (!waivedSections.has("title")) {
    const firstNonBlankLine = bodyLines.find((l) => l.trim() !== "");
    if (!firstNonBlankLine || !/^# \S/.test(firstNonBlankLine)) {
      err(
        "body must begin with an H1 title line (# Title) as its first non-blank line"
      );
    }
  }

  // Role check: body must contain at least one line starting with "**Role:".
  // Anchored multiline regex; `^` matches start of any line with the `m` flag
  // (T-02-01). Skipped when a template waives "role".
  if (!waivedSections.has("role")) {
    if (!/^\*\*Role:/m.test(bodyStr)) {
      err("body must contain a **Role:** line");
    }
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
