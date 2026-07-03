# Phase 18: Role Section Tag Migration - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 9 (2 mechanism, 2 live skills, 1 starter, 2 docs/tests, ~4 test files as bulk fixture group)
**Analogs found:** 9 / 9 (all in-repo, self-referential migration — every "analog" is the current implementation of the pattern being replaced)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/templates.js` (add `role` to SECTIONS, add `BASE_SPINE`) | config (data registry) | CRUD (data-only, no logic) | itself (`SECTIONS`/`TEMPLATES` existing shape) | exact |
| `src/schema.js` (replace role-regex block ~322-329 with BASE_SPINE loop) | service/validator | transform (string scan -> error list) | `src/schema.js` lines 296-306 (template `requiredSections` loop — same `hasClosedSection` + `SEC[...]` composition shape) | exact |
| `skills/release/SKILL.md` | content (skill doc) | transform (prose only) | `skills/build-skill/SKILL.md` (sibling live skill, same `**Role:**` line shape) | exact |
| `skills/build-skill/SKILL.md` (role line + gen-instructions + quality-gate prose) | content (skill doc) | transform (prose only) | `skills/release/SKILL.md` (sibling) | exact |
| `src/init.js` (hello-world starter, line ~46) | config/template string | transform (string literal) | `skills/release/SKILL.md` / `skills/build-skill/SKILL.md` role lines | exact |
| `shared/references/skill-schema.md` (§ base spine, error tables, ~lines 95-103, 305) | documentation | transform (prose + tables) | itself — existing "Check 1 — Title" section directly above (parallel structure to mirror) | exact |
| `test/doc-sync.test.js` (`staticSegments` array, line 38) | test | transform (string-literal assertion list) | itself — adjacent `staticSegments` entries (lines 37, 41-43) already showing the composed-string pattern for title/template errors | exact |
| `README.md` (spine example ~108, rule description ~114) | documentation | transform (prose) | `shared/references/skill-schema.md` §Role (more detailed twin doc) | exact |
| Test fixtures across `test/schema.test.js`, `test/lint.test.js`, `test/build.test.js`, `test/frontmatter.test.js` (~30 `**Role:**` bodies) | test | transform (fixture strings) | `test/doc-sync.test.js` extraction pattern for locating fixture role lines; `src/init.js` for the canonical replacement string shape | role-match |

## Pattern Assignments

### `src/templates.js` (config, data-only registry)

**Analog:** itself — current `SECTIONS`/`TEMPLATES` shape (full file, 30 lines, already read in full above)

**Current shape to extend** (lines 19-29):
```javascript
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
```

**Pattern to apply (D-03):** add `role` as a new key in `SECTIONS` (human description, doubles as doc source per the file's own header comment) and add a new `BASE_SPINE` export (array, e.g. `export const BASE_SPINE = ["role"];`) — a sibling data export, same "pure data — no functions, no filesystem/YAML access, no imports" constraint stated in the file's header comment (lines 1-17). Do not touch `TEMPLATES` — `role` is a base-spine tag, not a template-required section, so it must NOT be added to `procedure.requiredSections`.

---

### `src/schema.js` (validator, role-check block)

**Analog:** the template `requiredSections` loop in the same file (lines 296-306), which is the closest existing consumer of `hasClosedSection` + `SEC[...]` composed error strings.

**Core pattern to copy from** (lines 296-306):
```javascript
      const { requiredSections = [], waives = [] } = TPL[tpl];
      waivedSections = new Set(waives);
      for (const section of requiredSections) {
        if (!hasClosedSection(bodyStr, section)) {
          err(
            `template "${tpl}" requires <${section}>…</${section}> section — ${SEC[section] ?? ""}`
          );
        }
      }
```

**Block being replaced** (lines 322-329 — delete this regex form):
```javascript
  // Role check: body must contain at least one line starting with "**Role:".
  // Anchored multiline regex; `^` matches start of any line with the `m` flag
  // (T-02-01). Skipped when a template waives "role".
  if (!waivedSections.has("role")) {
    if (!/^\*\*Role:/m.test(bodyStr)) {
      err("body must contain a **Role:** line");
    }
  }
```

**New shape (user-approved preview from CONTEXT.md D-specifics, refine as needed):**
```javascript
  for (const s of BASE_SPINE) {
    if (!waivedSections.has(s) && !hasClosedSection(bodyStr, s)) {
      err(`body must contain <${s}>…</${s}> — ${SEC[s] ?? ""}`);
    }
  }
```
Note: this reuses `waivedSections` (already resolved above at line 284/298, before the Title/Role checks per the comment at line 279) and `hasClosedSection` (defined lines 72-101, fence-aware, open-before-close — same function, verbatim reuse, no modification needed). `BASE_SPINE` must be imported alongside `SECTIONS, TEMPLATES` at line 19 (`import { SECTIONS, TEMPLATES, BASE_SPINE } from "./templates.js";`) and threaded through the `templatesRegistry` default parameter (line 196) and destructure (line 202) the same way `SECTIONS`/`TEMPLATES` currently are, if the function signature is meant to stay test-injectable (see `@param {{ SECTIONS: object, TEMPLATES: object }}` at line 178 — likely needs a doc/type update too).

**Non-empty check (D-05, new behavior — no existing analog in this file):** `hasClosedSection` only proves open+close tags exist in order; it does NOT check for non-whitespace content between them. A new small helper is required (D-06 asks for isolation so later generalization to `<process>`/`<success_criteria>` is a one-liner). Suggested shape — a sibling exported function next to `hasClosedSection`:
```javascript
export function hasNonEmptyClosedSection(body, tagName) {
  if (!hasClosedSection(body, tagName)) return false;
  // extract text strictly between the first <tag> and </tag> (fence-aware,
  // reuse the same unfencedLines scan) and test for non-whitespace content
}
```
This emits the second, distinct error string per D-08 (missing vs empty are separate errors).

---

### `skills/release/SKILL.md` and `skills/build-skill/SKILL.md` (content, mechanical swap)

**Analog:** each is the other's sibling — both currently show the exact same `**Role:**` line convention.

**Current pattern** (`skills/release/SKILL.md` line 14):
```
**Role:** You are the Motto release assistant for the maintainer. Guide through each release step in order: tests, version bump, dogfood check, tarball verify, publish, and post-release housekeeping.
```
```
**Role:** You structure freeform input — pasted text, a document, a conversation transcript — into a complete, conforming Motto skill: extract what's already given, gap-fill only what's genuinely missing, write the files, self-verify against the real linter, self-review for hollow content, then report back.
```
(`skills/build-skill/SKILL.md` line 16)

**New pattern:** wrap the same prose in `<role>...</role>` tags, e.g.:
```
<role>
You are the Motto release assistant for the maintainer. Guide through each release step in order: tests, version bump, dogfood check, tarball verify, publish, and post-release housekeeping.
</role>
```
D-10 notes multi-line role content is now unlocked (bold-line form was single-line by convention) — scaffold/doc examples may show a multi-line role, but this migration is a mechanical 1:1 wrap unless discretion calls for reformatting.

`skills/build-skill/SKILL.md` additionally has two prose references to migrate (generation instructions ~line 68, quality gate ~line 90):
```
1. The `**Role:**` line is a real, behavioral sentence describing what it does, not a bare label.
```
```
- The generated skill's `**Role:**` line is behavioral, not a bare label.
```
Both become `<role>` section references (e.g. "The `<role>` section..." / "the generated skill's `<role>` section..."), keeping the same "behavioral, not a bare label" content-quality language (Claude's Discretion — lint now covers emptiness, but content quality stays build-skill's job per decisions section).

---

### `src/init.js` (starter template string)

**Analog:** same role-line convention as the two live skills above; this is the hello-world seed a new author copies.

**Current pattern** (line ~46):
```
**Role:** You are a minimal example skill. Replace this with your own skill's purpose.
```
**New pattern:** same mechanical wrap:
```
<role>
You are a minimal example skill. Replace this with your own skill's purpose.
</role>
```

---

### `shared/references/skill-schema.md` (documentation, base-spine section)

**Analog:** the file's own adjacent "Check 1 — Title" section (structure to mirror for "Check 2 — Role").

**Current pattern to replace** (lines 95, 98, 101, 103):
```
**Check 2 — Role line:** The body must contain at least one line that starts with `**Role:` (multiline match).
...
**Role:** You are a hands-on guide who walks the author through...
...
The Role line content after `:` is not validated. An empty `**Role:**` passes the regex but produces unusable agent instruction content. Write Role lines as complete, behavioral sentences.
...
**Lint error if missing:** `body must contain a **Role:** line`
```
Also line 305 shows a second inline example: `**Role:** You are...`

**New pattern:** describe `<role>...</role>` matching via `hasClosedSection` semantics (fence-aware, open-before-close, matches Phase 14's documented section-tag behavior elsewhere in this same doc — search the doc for how `<process>`/`<success_criteria>` are documented, since those already use this file's established tag-section doc convention, and mirror that prose exactly for `<role>`). Remove the "empty Role passes" caveat entirely (D-05 closes this gap) and instead document the new empty-check error string. Per D-09, no legacy/migration mention — describe only the current validator. Add BOTH new error strings (missing + empty) to the error tables, replacing the single old string.

---

### `test/doc-sync.test.js` (test, staticSegments array)

**Analog:** itself — adjacent entries in the same array already show the composed-string pattern (lines 37, 41-43).

**Line to replace** (line 38):
```javascript
  'body must contain a **Role:** line',
```
**Pattern to follow** — this is a flat array of pure-literal substrings (comment at lines 22-24 warns: choose segments that do NOT span a `${...}` interpolation boundary). Replace with TWO entries (D-08: two distinct errors), matching whatever literal prefix the new `src/schema.js` error strings use before their `${...}` interpolation point — e.g. if the code emits `` `body must contain <${s}>…</${s}> — ${SEC[s] ?? ""}` ``, the safe literal segment is `'body must contain <'` (mirrors how the template error at line 43 uses `'requires <'` as its non-interpolated anchor). Add a second segment for the empty-role error string once its exact wording is finalized in `src/schema.js`.

---

### `README.md` (documentation, spine example + rule description)

**Analog:** `shared/references/skill-schema.md` (more detailed twin doc covering the same rule).

**Current pattern** (lines 108, 114):
```
**Role:** You are a guide who walks the author through X step by step.
...
- Body spine: first non-blank line is an H1 title; body contains at least one `**Role:**` line.
```
**New pattern:** same mechanical wrap for the example block; rule description sentence becomes e.g. "body contains a non-empty `<role>...</role>` section" (wording should stay consistent with whatever phrasing lands in skill-schema.md per D-09/D-08, since these are sibling docs describing the same rule).

---

### Test fixtures (`test/schema.test.js`, `test/lint.test.js`, `test/build.test.js`, `test/frontmatter.test.js`)

**Analog:** `src/init.js` canonical role string (for the replacement content shape) + `test/doc-sync.test.js`'s own source-text extraction pattern (for how to locate/verify fixture strings systematically).

**Pattern:** ~30 inline fixture bodies currently embed `**Role:** <some text>` as a one-line string inside JS template literals / string constants. Each becomes `<role>\n<some text>\n</role>` (or single-line `<role>text</role>` if the fixture is itself a single-line string literal — do not introduce unnecessary multi-line diffs where the fixture body is already a compact one-liner). Use `grep -n '\*\*Role:' test/*.test.js` to enumerate exact occurrences before editing (mechanical, high-volume, low-risk — the main risk is under-migrating one and leaving a stale `**Role:**` fixture that the new BASE_SPINE check now correctly fails on, which is the desired behavior per D-01 hard break, so any missed fixture will surface as a test failure, not a silent gap).

**Exception — do NOT migrate:** `frontmatter.js`'s B8 regression-guard fixture (`**Role:** Guide.` before a `---`), per CONTEXT.md Claude's Discretion note — it guards a YAML alias-parsing property unrelated to the spine rule; leave that specific fixture string untouched even though it contains `**Role:**` text.

---

## Shared Patterns

### `hasClosedSection` reuse (fence-aware section matcher)
**Source:** `src/schema.js` lines 72-101 (already read in full above)
**Apply to:** the new BASE_SPINE loop in `src/schema.js` — reused verbatim, no modification. This is the single existing scanner for both template `requiredSections` and the new role tag; do not write a second regex-based scanner.

### `waivedSections` cascade
**Source:** `src/schema.js` lines 279-284, 297-298 (resolved from `TPL[tpl].waives` before Title/Role checks run)
**Apply to:** BASE_SPINE loop must check `waivedSections.has(s)` per tag, exactly as the current Title check does at line 313 (`if (!waivedSections.has("title"))`) and the current Role check does at line 325. No template in `src/templates.js` currently sets `waives: ["role"]`, but the mechanism must keep working if one is added later (D-03 says "waives: [\"role\"] semantics carry over unchanged").

### Error-string house style (Phases 14/15)
**Source:** `src/schema.js` line 302 (`template "${tpl}" requires <${section}>…</${section}> section — ${SEC[section] ?? ""}`)
**Apply to:** the new missing-`<role>` error string — one line, quoted/interpolated value, inline hint from `SECTIONS.role` description, composed the same way template-required-section errors already are (per D-03/D-08).

### doc-sync drift guard discipline (Phase 17)
**Source:** `test/doc-sync.test.js` lines 13-24 (comment explaining code -> doc direction, literal-substring-not-spanning-interpolation rule)
**Apply to:** any new error string added to `src/schema.js` in this phase MUST get a corresponding literal-substring entry in `staticSegments`, and the corresponding prose in `shared/references/skill-schema.md` must contain that exact substring verbatim — this is the mechanism that will fail CI if the two drift apart.

## No Analog Found

None — every file in scope has a direct sibling or self-referential prior-version analog, since this phase is a like-for-like mechanical migration of an existing, well-documented convention rather than new-feature construction.

## Metadata

**Analog search scope:** `src/schema.js`, `src/templates.js`, `src/init.js`, `skills/release/SKILL.md`, `skills/build-skill/SKILL.md`, `shared/references/skill-schema.md`, `README.md`, `test/doc-sync.test.js`
**Files scanned:** 8 read/grepped directly; ~4 additional test files identified via grep for bulk-fixture scope (not individually read — pattern is mechanical and uniform)
**Pattern extraction date:** 2026-07-03
</content>
