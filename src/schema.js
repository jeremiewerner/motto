/**
 * Motto skill-schema validator.
 *
 * Pure object validator — no filesystem, no YAML parsing, no imports beyond
 * this file's own scope (except the pure-data `./templates.js` registry and
 * `node:path`, which is pure string math and never touches the filesystem).
 * NEVER throws (D-01). All validation failures surface through the returned
 * errors[].
 *
 * Exports:
 *   - NAME_KEBAB {RegExp}  — canonical letter-start kebab regex (D-08, D-16)
 *   - hasClosedSection(body, tagName) -> boolean
 *   - hasNonEmptyClosedSection(body, tagName) -> boolean
 *   - isOutputPathLexicallySafe(entry) -> boolean
 *   - validateSkill(skill, sharedRefs?, templatesRegistry?, skillNames?, audienceMap?) -> Array<{ skill, message }>
 */

import { normalize, sep, isAbsolute } from "node:path";

import { SECTIONS, TEMPLATES, BASE_SPINE } from "./templates.js";

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
 * pitfall: (1) a single pass over the lines tracks the currently-open fence's
 * character and length (3+ backticks or 3+ tildes, up to 3 leading spaces,
 * matching CommonMark fence semantics) — a fence opens on any marker line
 * when none is open, and closes only on a later marker line with the SAME
 * character and length >= the opener's; any other marker line encountered
 * while a fence is open (e.g. a mismatched-character line) is literal fenced
 * content, not a boundary — and collects only unfenced, non-marker lines;
 * (2) the collected text is matched once with two anchored multiline
 * regexes, requiring the open-tag match to precede the close-tag match
 * (a genuinely ordered, matched pair — WR-01).
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
  let fence = null; // { ch, len } | null — the currently-open fence, if any
  for (const line of lines) {
    const m = fenceRe.exec(line);
    if (m) {
      const ch = m[1][0];
      const len = m[1].length;
      if (!fence) {
        fence = { ch, len };
      } else if (ch === fence.ch && len >= fence.len) {
        fence = null;
      }
      // Any other marker line (no fence open -> just opened; mismatched
      // char/length while a fence IS open -> literal fenced content) is a
      // boundary or content, never collected.
      continue;
    }
    if (!fence) unfencedLines.push(line);
  }
  const text = unfencedLines.join("\n");
  const openRe = new RegExp(`^<${tagName}>`, "m");
  const closeRe = new RegExp(`^</${tagName}>`, "m");
  const openMatch = openRe.exec(text);
  const closeMatch = closeRe.exec(text);
  return !!openMatch && !!closeMatch && openMatch.index < closeMatch.index;
}

/**
 * Determine whether `body` contains a matched, line-anchored `<tagName>` /
 * `</tagName>` pair (per `hasClosedSection`) AND the unfenced text strictly
 * between the open and close tags contains at least one non-whitespace
 * character (D-05). Isolated as its own function (D-06) so generalizing the
 * non-empty check to other sections later is a one-liner, and so this
 * riskier new validator path — plus its never-throw guarantee — has its own
 * reviewable, adversarially-tested surface, independent of `hasClosedSection`.
 *
 * Delegates to `hasClosedSection` first: if the section is not matched and
 * closed at all, this returns false immediately (D-05 only tightens the
 * ALREADY-closed case; "missing" and "empty" stay two distinct checks/errors
 * — D-08). Otherwise this reuses the exact same fence-aware unfenced-line
 * collection strategy as `hasClosedSection` (same fence-tracking loop) to
 * find the first unfenced open-tag line and the first following unfenced
 * close-tag line, and tests the unfenced text strictly between them for
 * non-whitespace content.
 *
 * `body` is coerced to a string (any non-string input — null, undefined, a
 * number, an object, an array — becomes `""`) BEFORE it is ever passed to
 * `hasClosedSection` or used in a string method here. `hasClosedSection`'s
 * own `body || ""` only coerces FALSY values; a truthy non-string (e.g. `123`,
 * `{}`, `[]`) would otherwise reach its internal `.split()` call unguarded
 * and throw. Coercing here — strictly ahead of the delegated call — keeps
 * this function's never-throw guarantee (D-01) intact without modifying
 * `hasClosedSection` itself (out of scope for this plan).
 *
 * @param {string} body
 * @param {string} tagName
 * @returns {boolean}
 */
export function hasNonEmptyClosedSection(body, tagName) {
  const bodyStr = typeof body === "string" ? body : "";
  if (!hasClosedSection(bodyStr, tagName)) return false;

  const lines = bodyStr.split("\n");
  const fenceRe = /^ {0,3}(`{3,}|~{3,})/;
  const unfencedLines = [];
  let fence = null;
  for (const line of lines) {
    const m = fenceRe.exec(line);
    if (m) {
      const ch = m[1][0];
      const len = m[1].length;
      if (!fence) {
        fence = { ch, len };
      } else if (ch === fence.ch && len >= fence.len) {
        fence = null;
      }
      continue;
    }
    if (!fence) unfencedLines.push(line);
  }

  const openRe = new RegExp(`^<${tagName}>`);
  const closeRe = new RegExp(`^</${tagName}>`);
  const openIdx = unfencedLines.findIndex((l) => openRe.test(l));
  const closeIdx = unfencedLines.findIndex(
    (l, i) => i > openIdx && closeRe.test(l)
  );
  if (openIdx === -1 || closeIdx === -1) return false;

  const between = unfencedLines.slice(openIdx + 1, closeIdx).join("\n");
  return between.trim().length > 0;
}

/**
 * Determine whether a relative `outputs:` entry stays lexically contained
 * inside the skill's own directory — no absolute path, no `..` traversal
 * escape. Pure `node:path` string math only; does NOT touch the filesystem
 * (existence and symlink-escape checks are the fs-dependent layer's job —
 * `src/lint.js`'s `checkOutputsFs`, which reuses this exact predicate to
 * decide which entries are even eligible for an fs check, so the lexical
 * cascade lives in exactly one place — Pitfall/anti-pattern: do not
 * reimplement this logic in lint.js).
 *
 * ROOT-INDEPENDENT by construction (phase-15 review CR-01): the predicate
 * takes no base-directory argument and never calls resolve(), so its verdict
 * cannot depend on process.cwd() — the earlier two-argument shape resolved
 * the entry against whatever root each caller happened to pass, and the two
 * layers (validateSkill's cwd-relative root vs checkOutputsFs's real skill
 * directory) could disagree, silently bypassing BOTH checks for `..`-re-entry
 * paths. An entry is safe iff it is a non-empty relative string whose
 * normalize()d form is not `..` and does not start with a `..` segment.
 * Deliberately strict: a `..`-re-entry path like "../my-skill/x" that would
 * lexically land back inside the skill directory is still rejected — outputs
 * must be declared without leaving the skill directory even transiently.
 * (normalize() also collapses interior traversal, so "a/../../x" → "../x"
 * is caught.)
 *
 * @param {string} entry — the raw `outputs:` value to check
 * @returns {boolean}
 */
export function isOutputPathLexicallySafe(entry) {
  if (typeof entry !== "string" || entry === "") return false;
  if (isAbsolute(entry)) return false;
  const norm = normalize(entry);
  return norm !== ".." && !norm.startsWith(".." + sep);
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
 * Any other genuinely unknown frontmatter key is accepted without error.
 * `template` (TMPL-01) and `dependencies`/`outputs`/`allowed-tools` (VAL-01..06)
 * are all now validated fields — see the TEMPLATE cascade and the outputs/
 * dependencies/allowed-tools blocks below.
 *
 * @param {{ dirName: string, data: object, body: string }} skill
 *   `dirName` — the skill's source folder name (cascade anchor + error.skill)
 *   `data`    — parsed YAML frontmatter object (plain JS; never mutated)
 *   `body`    — Markdown body string after the closing `---` delimiter
 * @param {Set<string>} [sharedRefs]
 *   Set of available shared-reference basenames (without `.md`). Defaults to
 *   an empty Set; entries in data.shared_references are resolved against it.
 * @param {{ SECTIONS: object, TEMPLATES: object, BASE_SPINE?: string[] }} [templatesRegistry]
 *   Injectable template registry, defaulting to the real `./templates.js`
 *   exports. Tests use this to exercise the `waives` merge logic via a
 *   fixture template without mutating `src/templates.js` (TMPL-02).
 *   `BASE_SPINE` is optional and fail-soft (review CR-01): a registry in the
 *   pre-phase-18 `{ SECTIONS, TEMPLATES }` shape — or one carrying a
 *   non-array `BASE_SPINE` — degrades to the real `./templates.js` spine
 *   instead of throwing (D-01).
 * @param {Set<string>} [skillNames]
 *   Set of all discovered skill dirNames in the project tree. Defaults to an
 *   empty Set; bare `dependencies:` entries are resolved against it (VAL-02).
 * @param {Map<string,string>} [audienceMap]
 *   Map of dirName -> audience ("public"|"private") for every discoverable
 *   skill in the tree. Defaults to an empty Map; consulted by the
 *   `dependencies:` audience-direction guard (VAL-03).
 * @returns {Array<{ skill: string, message: string }>}
 *   Empty array when the skill is fully valid; one object per error otherwise.
 *   Each object's `skill` field equals `dirName`.
 */
export function validateSkill(
  skill,
  sharedRefs = new Set(),
  templatesRegistry = { SECTIONS, TEMPLATES, BASE_SPINE },
  skillNames = new Set(),
  audienceMap = new Map()
) {
  const { dirName, data, body } = skill;
  const errors = [];
  // Fail-soft on the phase-18 registry key (never-throw D-01, review CR-01):
  // the default PARAMETER above only applies when templatesRegistry itself is
  // undefined. A caller injecting the previously-documented registry shape
  // { SECTIONS, TEMPLATES } (no BASE_SPINE) must degrade to the real spine —
  // the destructuring default covers a missing key, and the Array.isArray
  // guard at the spine loop below covers a present-but-non-array value.
  const {
    SECTIONS: SEC,
    TEMPLATES: TPL,
    BASE_SPINE: SPINE = BASE_SPINE,
  } = templatesRegistry;

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
  } else if (typeof data.description !== "string") {
    // Non-string guard BEFORE .length / regex .test() — mirrors the NAME and
    // TEMPLATE guards (D-01, T-14-03): RegExp.prototype.test coerces via
    // ToString, so a throwing toString/Symbol.toPrimitive object would throw,
    // and a number/array description would silently pass. (Phase-15 review WR-01)
    err(
      `description must be a string (got ${Array.isArray(data.description) ? "array" : typeof data.description})`
    );
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

  // Coerce via a typeof guard (not `body || ""`), which only replaces FALSY
  // values — a truthy non-string (e.g. `123`, `{}`, `[]`) would otherwise
  // reach `.split()` below unguarded and throw. Same fix shape as
  // hasNonEmptyClosedSection's own body coercion (Plan 18-01 deviation).
  const bodyStr = typeof body === "string" ? body : "";
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

  // Role check: driven by the BASE_SPINE registry (D-03), not a hardcoded
  // regex. For each base-spine tag (today: only "role"), skipped when the
  // resolved template waives it; otherwise the tag's <tag>...</tag> section
  // must be present and closed (else the missing-section error) and, if
  // present, must be non-empty (else the distinct empty-section error,
  // D-05). Exactly one of the two errors fires per tag — never both (D-08).
  // The legacy **Role:** bold-line convention is no longer recognized at all
  // (D-01 hard break) — any leftover line is inert body text (D-02).
  // Belt-and-braces (review CR-01): a registry carrying a non-array
  // BASE_SPINE falls back to the real spine instead of throwing.
  for (const s of Array.isArray(SPINE) ? SPINE : BASE_SPINE) {
    if (waivedSections.has(s)) continue;
    if (!hasClosedSection(bodyStr, s)) {
      err(`body must contain <${s}>…</${s}> — ${SEC[s] ?? ""}`);
      continue;
    }
    if (!hasNonEmptyClosedSection(bodyStr, s)) {
      err(`<${s}>…</${s}> section must not be empty — ${SEC[s] ?? ""}`);
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

  // ── OUTPUTS (VAL-01, lexical half — hasOwnProperty-gated, D-07 precedent) ─
  // Existence + symlink-escape checks are fs-dependent and deferred to the
  // lint.js orchestration layer (Plan 02), which reuses the exported
  // isOutputPathLexicallySafe predicate above so the cascade lives in one
  // place only. The predicate is root-independent (CR-01): no path is ever
  // resolved against process.cwd(), so this validator stays pure and both
  // layers agree by construction.
  if (Object.prototype.hasOwnProperty.call(data, "outputs")) {
    const outputs = data.outputs;
    if (outputs === null || typeof outputs !== "object" || Array.isArray(outputs)) {
      // Pitfall 4: typeof null === 'object' and arrays are objects too —
      // both must route here, not into Object.entries() below.
      err(
        `outputs must be a map of name -> file (got ${Array.isArray(outputs) ? "array" : typeof outputs})`
      );
    } else {
      for (const [key, value] of Object.entries(outputs)) {
        if (typeof value !== "string" || value === "") {
          err(`outputs.${key} must be a non-empty string path (got ${typeof value})`);
          continue;
        }
        if (!isOutputPathLexicallySafe(value)) {
          err(
            `outputs.${key} path "${value}" is unsafe (must not be absolute or contain ".." traversal)`
          );
          continue;
        }
        // Lexically safe — existence/symlink-escape are checked by lint.js's
        // fs layer (Plan 02), not here.
      }
    }
  }

  // ── DEPENDENCIES (VAL-02/03/04, hasOwnProperty-gated) ─────────────────────
  // Per-entry independent cascade (D-10 shape): namespaced (plugin:skill)
  // entries are format-checked only and exempt from resolution/audience
  // guard (D-05 — external, audience unknowable). Bare entries: self-
  // dependency check MUST run BEFORE the skillNames.has(entry) membership
  // check — dirName is always a member of skillNames, so checking membership
  // first would silently misclassify a self-dep as resolved (Pitfall 2).
  if (Object.prototype.hasOwnProperty.call(data, "dependencies")) {
    const deps = data.dependencies;
    if (!Array.isArray(deps)) {
      err(`dependencies must be an array (got ${typeof deps})`);
    } else {
      for (const entry of deps) {
        if (typeof entry !== "string" || entry === "") {
          err(`dependencies entry must be a non-empty string (got ${typeof entry})`);
          continue;
        }
        if (entry.includes(":")) {
          // Namespaced plugin:skill entry — format-checked only.
          const parts = entry.split(":");
          if (
            parts.length !== 2 ||
            !NAME_KEBAB.test(parts[0]) ||
            !NAME_KEBAB.test(parts[1])
          ) {
            err(`dependencies entry "${entry}" is not valid "plugin:skill" format`);
          }
          continue;
        }
        // Bare entry — self-dependency check FIRST (Pitfall 2 / VAL-04-before-VAL-02).
        if (entry === dirName) {
          err(`dependencies entry "${entry}" is a self-dependency`);
          continue;
        }
        if (!skillNames.has(entry)) {
          const available = [...skillNames].sort().join(", ");
          err(`dependency "${entry}" not found (available: ${available})`);
          continue;
        }
        // Resolved — audience-direction guard: ONLY public->private fails (VAL-03).
        if (data.audience === "public" && audienceMap.get(entry) === "private") {
          err(
            `dependencies entry "${entry}" is private but this skill is public (audience-direction guard)`
          );
        }
      }
    }
  }

  // ── ALLOWED-TOOLS (VAL-05, hasOwnProperty-gated, bracket access) ──────────
  // Option A locked (format-only, no shape regex, no tokenizing). String or
  // array of non-empty strings. Empty array passes ("zero tools"); empty
  // string errors (Empty-field policy).
  if (Object.prototype.hasOwnProperty.call(data, "allowed-tools")) {
    const val = data["allowed-tools"];
    if (typeof val === "string") {
      if (val.trim() === "") {
        err(`allowed-tools must be a non-empty string or array (got an empty string)`);
      }
      // Non-empty string passes trivially — a parenthesized rule like
      // "Bash(git add *)" is one valid permission rule by construction.
    } else if (Array.isArray(val)) {
      val.forEach((entry, i) => {
        // trim() mirrors the scalar branch above (phase-15 review WR-03):
        // a whitespace-only entry is as meaningless as a whitespace-only
        // scalar — the Empty-field policy applies to both shapes.
        if (typeof entry !== "string" || entry.trim() === "") {
          err(`allowed-tools[${i}] must be a non-empty string (got ${typeof entry})`);
        }
      });
      // Empty array [] passes — coherent "zero tools" declaration.
    } else {
      err(`allowed-tools must be a string or array (got ${typeof val})`);
    }
  }

  return errors;
}
