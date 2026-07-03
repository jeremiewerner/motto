---
phase: 18-migrate-base-spine-role-to-role-section-tag
reviewed: 2026-07-03T15:00:46Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/schema.js
  - src/templates.js
  - src/init.js
  - skills/release/SKILL.md
  - skills/build-skill/SKILL.md
  - shared/references/skill-schema.md
  - test/schema.test.js
  - test/lint.test.js
  - test/build.test.js
  - test/doc-sync.test.js
  - README.md
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: remediated
---

# Phase 18: Code Review Report

**Reviewed:** 2026-07-03T15:00:46Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the phase-18 migration of the base-spine role declaration from the `**Role:**` bold-line to the `<role>…</role>` section tag: the `BASE_SPINE`/`SECTIONS.role` registry additions (src/templates.js), the registry-driven spine loop and new `hasNonEmptyClosedSection` validator (src/schema.js), the scaffold/skill/doc migrations, and the test updates. All findings below were verified by executing the code, not just reading it.

**Invariants verified as holding:**
- **Hard break (D-01):** no lingering `**Role:**` acceptance path anywhere in `src/`, `bin/`, `skills/`, or `shared/` — grep hits are only comments and regression tests. A legacy-only body correctly reports the missing-role error (test at test/schema.test.js:552).
- **Fence-aware matching unchanged:** `hasClosedSection` is byte-identical to the pre-phase version per the diff.
- **D-08 exactly-one-error:** the spine loop `continue`s after the missing-section error, so missing/empty never both fire per tag; guarded by test/schema.test.js:535.
- **Never-throw at the validateSkill default path:** the `body || ""` → `typeof` coercion fix (src/schema.js:344) closes the truthy-non-string body hole; adversarially tested (test/schema.test.js:565, 692).
- **Doc strings:** both new error strings are quoted verbatim in shared/references/skill-schema.md §4; doc-sync self-check and containment pass.
- 205/205 tests pass; dogfood `motto lint` reports `✓ 2 skills OK`; the `motto init` hello-world scaffold lints clean under the new schema.

**However**, the phase introduces one genuine never-throw boundary violation (the recurring 3-milestone failure class), a misleading-diagnostic edge case in the new emptiness check, and a partially-hollow doc-sync guarantee. Details below.

## Critical Issues

### CR-01: `validateSkill` now throws for the previously-documented registry shape — never-throw boundary violation (D-01)

**File:** `src/schema.js:269` (destructuring), `src/schema.js:401` (spine loop)
**Issue:** `validateSkill`'s contract is unconditional: "NEVER throws (D-01). All validation failures surface through the returned errors[]" (src/schema.js:7). The `templatesRegistry` parameter is a documented, public injection seam (JSDoc at src/schema.js:245), and `src/schema.js` ships in the npm tarball. Before this phase the documented shape was `{ SECTIONS, TEMPLATES }`. Phase 18 silently made `BASE_SPINE` a required key: the default parameter only applies when `templatesRegistry` is `undefined`, so any caller passing the pre-18 shape gets `SPINE === undefined`, and `for (const s of SPINE)` throws unconditionally on every call. Verified empirically:

```
validateSkill(validSkill, new Set(), { SECTIONS: {}, TEMPLATES: {} })
→ TypeError: SPINE is not iterable
```

This is exactly the tests-green-but-broken never-throw class that regressed in v0.0.2, Phase 10, and Phase 15 — the in-repo caller (src/lint.js:288 passes `undefined`) and the test fixture (test/schema.test.js:895 includes `BASE_SPINE`) both take the happy path, so the suite cannot see it. Unlike the pre-existing partial-registry exposure on `TEMPLATES` (which only throws when a `template:` key is present), this throw fires on *every* skill for a registry that was fully valid under the previous contract.
**Fix:** Make the new key fail-soft at the destructuring site so an old-shape registry degrades to the real spine instead of crashing:

```js
const {
  SECTIONS: SEC,
  TEMPLATES: TPL,
  BASE_SPINE: SPINE = BASE_SPINE,
} = templatesRegistry;
// belt-and-braces at the loop:
for (const s of Array.isArray(SPINE) ? SPINE : BASE_SPINE) {
```

Add a regression test: `validateSkill(skill, new Set(), { SECTIONS: {}, TEMPLATES: {} })` must not throw and must still report the role error.

## Warnings

### WR-01: Same-line trailing content after `<role>` counts for presence (A2) but is invisible to the emptiness check — false "section must not be empty" error

**File:** `src/schema.js:158-167`; doc: `shared/references/skill-schema.md:95`
**Issue:** Per Assumption A2 (and §6 of skill-schema.md, which explicitly teaches it), `<role> some trailing text` counts as opening the section. But `hasNonEmptyClosedSection` computes emptiness only from full lines *strictly between the open and close tag lines* (`unfencedLines.slice(openIdx + 1, closeIdx)`), so the open line's own trailing content is discarded. Verified empirically:

```
body: "# T\n<role> You are a helper.\n</role>\n"
→ [{ message: '<role>…</role> section must not be empty — Behavioral instruction …' }]
```

The author sees a section with visible content and gets told it is empty — a misleading diagnostic on a plausible one-line authoring shape, and the two docs contradict each other: §6 says trailing text counts, §4 says only "the unfenced text strictly between the tags" counts without disclosing that the open tag's own line is excluded. No test covers this interplay.
**Fix:** Include the open line's post-tag remainder in the emptiness text:

```js
const openRemainder = unfencedLines[openIdx].replace(openRe, "");
const between = unfencedLines.slice(openIdx + 1, closeIdx).join("\n");
return (openRemainder + "\n" + between).trim().length > 0;
```

(The close tag is line-anchored, so nothing precedes it on its line; trailing text after `</role>` is correctly outside the section.) Alternatively, keep the behavior and state the exclusion explicitly in §4 — either way, add a test for `"<role> content\n</role>"`.

### WR-02: Exported `hasClosedSection` still throws on truthy non-string body, contradicting the module's "NEVER throws" header

**File:** `src/schema.js:74`
**Issue:** The module header (src/schema.js:7) claims "NEVER throws (D-01)" for the file's exports, yet `hasClosedSection(123, "role")` throws `TypeError: bodyStr.split is not a function` (verified empirically) — `body || ""` coerces only falsy values. The sibling export `hasNonEmptyClosedSection(123, "role")` returns `false`. The gap is pre-existing and was consciously deferred ("out of scope for this plan", src/schema.js:127-129), but this phase widened the export surface with a hardened sibling while leaving the original helper as the one exported validator in the module that can throw, and the phase's own docblock now advertises the throw path to anyone reading the file. The fix is the exact one-line guard already applied twice elsewhere this phase.
**Fix:** In `hasClosedSection`, replace `const bodyStr = body || "";` with `const bodyStr = typeof body === "string" ? body : "";` and extend the existing never-throw test (test/schema.test.js:629) to cover `123`, `{}`, `[]`.

### WR-03: Doc-sync guard does not cover the interpolated `SECTIONS` description that skill-schema.md quotes verbatim — a templates.js edit stales the doc silently

**File:** `test/doc-sync.test.js:38-39, 70-75`; `shared/references/skill-schema.md:104-105, 168-182`
**Issue:** The phase's stated guarantee is that the two role error strings are "quoted verbatim in skill-schema.md and guarded by doc-sync". Only the static prefixes are guarded: `'body must contain <'` and `'section must not be empty'`. The doc quotes the *full* errors including the interpolated registry description ("— Behavioral instruction that tells the agent who it is and how to act.", skill-schema.md:104-105) and also transcribes the entire registry — `SECTIONS.role` and `BASE_SPINE = ["role"]` — as a verbatim snippet (skill-schema.md:168-182). That description lives in `src/templates.js`, which doc-sync never reads (it reads only schema.js, lint.js, frontmatter.js — test/doc-sync.test.js:70-74). Consequence: editing `SECTIONS.role` or `BASE_SPINE` in templates.js changes the live lint error text while doc-sync stays green — precisely the drift DOC-06 exists to catch, on the strings this phase just added. The `'body must contain <'` prefix is also weak enough that a doc misquote of the tag rendering (e.g. ASCII `...` instead of `…`) passes.
**Fix:** Add `src/templates.js` to the sources read by the self-check, and add segments sourced from it:

```js
'Behavioral instruction that tells the agent who it is and how to act.',
'BASE_SPINE = ["role"]',
```

(Both are pure literals in templates.js source and in the doc, so the code→doc direction is preserved.)

## Info

### IN-01: README still describes a "two-line body spine"

**File:** `README.md:97`
**Issue:** "Every `SKILL.md` requires three frontmatter fields and a two-line body spine" — accurate for the H1 + `**Role:**` line era; the role spine element is now a multi-line `<role>…</role>` section (the adjacent example itself spans four body lines).
**Fix:** Reword, e.g. "…three frontmatter fields and a body spine: an H1 title line plus a non-empty `<role>…</role>` section."

### IN-02: Fence-tracking loop duplicated verbatim between `hasClosedSection` and `hasNonEmptyClosedSection`

**File:** `src/schema.js:76-95` and `src/schema.js:139-156`
**Issue:** The 17-line fence-state loop is copied byte-for-byte. The duplication is a deliberate, documented D-06 decision, but the D-08 "exactly one of two errors" invariant depends on both copies computing the *same* unfenced-line set — a future fence-semantics fix applied to one copy silently desynchronizes missing vs. empty verdicts (e.g. both errors suppressed, or the empty check evaluating different text than the presence check).
**Fix:** When next touching this file, extract a shared `collectUnfencedLines(bodyStr)` helper both functions consume; the two regex-matching tails stay separate.

---

## Remediation (2026-07-03, same session)

CR-01, WR-01, WR-02, WR-03, and IN-01 fixed by gsd-code-fixer before phase verification; suite 211/211 green and `motto lint` clean after every commit. IN-02 deferred (structural refactor, recorded as debt):

| Finding | Status | Commit |
|---------|--------|--------|
| CR-01 | fixed — `BASE_SPINE: SPINE = BASE_SPINE` destructuring default + `Array.isArray` fallback at the spine loop; pre-18 `{ SECTIONS, TEMPLATES }` registry shape regression-tested (no throw, role error still reported) | `878d8dc` |
| WR-01 | fixed — emptiness check now includes the open tag's same-line trailing remainder (A2 parity with `hasClosedSection`); §4 of skill-schema.md updated to match; helper + validateSkill regression tests added | `3a7065c` |
| WR-02 | fixed — `hasClosedSection` uses the typeof guard (`body || ""` → `typeof body === "string" ? body : ""`); never-throw test extended to `123`/`{}`/`[]`/`true`; the stale `hasNonEmptyClosedSection` docblock paragraph advertising the throw path rewritten | `515f676` |
| WR-03 | fixed — doc-sync reads `src/templates.js` and guards `'Behavioral instruction that tells the agent who it is and how to act.'` and `'BASE_SPINE = ["role"]'` (code→doc direction preserved) | `0c39187` |
| IN-01 | fixed — README reworded: "a body spine — an H1 title line plus a non-empty `<role>…</role>` section" | `2027a15` |
| IN-02 | deferred — fence-loop duplication is a documented D-06 decision; extracting a shared `collectUnfencedLines` helper is a structural refactor out of fix scope. Do it when next touching src/schema.js to keep the D-08 missing/empty verdicts computed from one unfenced-line set. | — |

_Reviewed: 2026-07-03T15:00:46Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
