---
phase: 18-migrate-base-spine-role-to-role-section-tag
plan: 02
subsystem: testing
tags: [validator, schema, templates, migration, never-throw, docs]

# Dependency graph
requires:
  - phase: 18-migrate-base-spine-role-to-role-section-tag
    provides: "BASE_SPINE registry export, hasNonEmptyClosedSection helper (Plan 18-01)"
provides:
  - "src/schema.js validateSkill enforces <role>...</role> as the only accepted role declaration, registry-driven via BASE_SPINE"
  - "Two distinct, registry-composed lint errors: missing-role and empty-role (D-08)"
  - "All live skills, the motto init starter, README, and skill-schema.md migrated to the <role> tag"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Base-spine sections enforced via a for-loop over a registry array (BASE_SPINE), mirroring the existing template requiredSections loop shape — adding a future spine tag is a one-line registry data change, no new validator code"
    - "Body coercion via typeof guard (`typeof body === 'string' ? body : ''`) rather than `body || ''`, which only guards falsy values and lets a truthy non-string reach `.split()` unguarded — same fix shape as Plan 18-01's hasNonEmptyClosedSection"

key-files:
  created: []
  modified:
    - src/schema.js
    - test/schema.test.js
    - skills/release/SKILL.md
    - skills/build-skill/SKILL.md
    - src/init.js
    - test/lint.test.js
    - test/build.test.js
    - shared/references/skill-schema.md
    - test/doc-sync.test.js
    - README.md

key-decisions:
  - "Legacy **Role:** bold-line regex fully removed from src/schema.js (D-01 hard break) — a leftover legacy line is now inert body text, producing the missing-role error, not a separate 'legacy line detected' check (D-02)"
  - "BASE_SPINE threaded through the injectable templatesRegistry parameter (default + destructure + JSDoc) exactly like SECTIONS/TEMPLATES, so tests can still inject a fixture registry without mutating src/templates.js"
  - "validateSkill's top-level bodyStr coercion changed from `body || ''` to a typeof guard — a pre-existing latent gap (truthy non-string body would throw on `.split()`), newly exercised by the plan-mandated adversarial null/non-string-body test"
  - "frontmatter.js and its B8 alias-guard fixture (test/frontmatter.test.js) deliberately left untouched — that fixture guards a YAML alias-parsing property unrelated to the spine rule"
  - "skill-schema.md's §6 'Current registry' code sample updated to include `role` in SECTIONS and the new `BASE_SPINE` export (not explicitly requested by the plan action text, but left stale it would visibly contradict the rewritten §4 Check 2 prose in the same file — Rule 2, documentation-consistency)"

requirements-completed: [D-01, D-02, D-04, D-07, D-08, D-09]

coverage:
  - id: D1
    description: "src/schema.js validateSkill replaces the legacy **Role:** regex with a BASE_SPINE loop emitting two distinct, registry-composed errors (missing / empty), Title check and never-throw behavior preserved"
    requirement: "D-01, D-03, D-04, D-08"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill — role spine (D-01, D-02, D-05, D-08) (3 tests)"
        status: pass
      - kind: unit
        ref: "test/schema.test.js full file (80/80 pass)"
        status: pass
      - kind: other
        ref: "plan Task 1 <verify> inline node -e script (clean/missing/empty/no-double-error assertions)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Live skills (release, build-skill), the motto init hello-world starter, and all applicable test fixtures across test/schema.test.js, test/lint.test.js, test/build.test.js migrated to <role> section tag; frontmatter.js B8 fixture deliberately untouched"
    requirement: "D-01, D-02"
    verification:
      - kind: unit
        ref: "full node --test suite (205/205 pass)"
        status: pass
      - kind: other
        ref: "grep -rn '**Role:' skills/ src/init.js -> 0 matches; git diff --stat src/frontmatter.js -> no output"
        status: pass
    human_judgment: false
  - id: D3
    description: "shared/references/skill-schema.md, test/doc-sync.test.js, and README.md updated to describe/quote/assert the two new error strings; no legacy mention remains (D-09)"
    requirement: "D-05, D-08, D-09"
    verification:
      - kind: unit
        ref: "test/doc-sync.test.js#doc-sync (DOC-06) — every curated static segment is live source text AND is quoted in skill-schema.md"
        status: pass
      - kind: other
        ref: "grep -Fc 'body must contain <'/'section must not be empty' in skill-schema.md and doc-sync.test.js (>=1 each); grep -c '**Role:' skill-schema.md README.md -> 0"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-07-03
status: complete
---

# Phase 18 Plan 02: Base-Spine Role Section Tag Migration Summary

**Registry-driven `<role>` section check replaces the legacy `**Role:**` bold-line regex in src/schema.js, with every live skill, doc, and test fixture migrated in the same atomic commit.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-07-03T14:43:00Z (approx)
- **Completed:** 2026-07-03T14:52:49Z
- **Tasks:** 3 (landed as a single atomic commit, per plan's explicit instruction)
- **Files modified:** 10

## Accomplishments
- `src/schema.js`: legacy `/^\*\*Role:/m` regex and its single error string removed; replaced by a `for (const s of BASE_SPINE)` loop composing two distinct errors from `SECTIONS[s]` — missing (`body must contain <role>…</role> — ...`) and empty (`<role>…</role> section must not be empty — ...`) — never both (D-08). `BASE_SPINE` threaded through the injectable `templatesRegistry` parameter alongside `SECTIONS`/`TEMPLATES`.
- `skills/release/SKILL.md`, `skills/build-skill/SKILL.md` (plus its two prose references to the role convention), and `src/init.js`'s hello-world starter all migrated to `<role>...</role>`.
- Test fixtures across `test/schema.test.js`, `test/lint.test.js`, `test/build.test.js` migrated to the section tag so the hard break doesn't turn previously-clean fixtures red; three new adversarial `test/schema.test.js` cases added (empty-role distinct-error, legacy-line-is-inert, never-throw-on-non-string-body).
- `shared/references/skill-schema.md` §4 rewritten to describe `<role>` via `hasClosedSection`/non-empty semantics and quote both new lint errors verbatim (empty-Role-passes caveat removed per D-05); §6's registry code sample and the §10 frontmatter example updated to match; `test/doc-sync.test.js` staticSegments and `README.md`'s spine example/rule sentence updated to match.
- Full `node --test` suite green (205/205) in one commit; `motto lint` dogfoods clean against the migrated `skills/` tree.

## Task Commits

All three tasks landed as ONE atomic commit, per the plan's explicit "ATOMIC COMMIT REQUIREMENT" (husky's pre-commit `npm test` runs dogfood + doc-sync guards, which are mutually consistent only when the linter, live skills, and docs move together):

1. **Tasks 1-3: migrate base-spine role check to `<role>` section tag** - `d402e15` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `src/schema.js` - Legacy role regex replaced by BASE_SPINE loop; `bodyStr` coercion hardened against truthy non-string bodies.
- `test/schema.test.js` - All role fixtures migrated to `<role>` tag; `FIXTURE_TEMPLATES` extended with `BASE_SPINE: ["role"]`; new `validateSkill — role spine` describe block (3 tests).
- `skills/release/SKILL.md` - Role line wrapped in `<role>...</role>`.
- `skills/build-skill/SKILL.md` - Role line wrapped in `<role>...</role>`; two prose references (Step 7 quality gate, success_criteria) updated to name the section tag.
- `src/init.js` - HELLO_WORLD_SKILL_MD starter's role line wrapped in `<role>...</role>`.
- `test/lint.test.js` - `makeSkillMd`/`makeSkillWithRefs`/`makeSkillWithExtra` helpers and two malformed-skill inline fixtures migrated.
- `test/build.test.js` - `makeSkillMd`/`makePrivateSkillMd`/`makeSkillWithRefs` helpers and two invalid-name inline fixtures migrated.
- `shared/references/skill-schema.md` - §4 Check 2 rewritten for `<role>` semantics + both new error strings; §6 registry sample and §10 frontmatter example updated.
- `test/doc-sync.test.js` - Old role staticSegment removed; two new literal-anchor segments added (`body must contain <`, `section must not be empty`).
- `README.md` - Spine example and rule sentence updated to describe a non-empty `<role>...</role>` section.

## Decisions Made
- Threaded `BASE_SPINE` through the injectable `templatesRegistry` parameter (default value, destructure, JSDoc) the same way `SECTIONS`/`TEMPLATES` already were, keeping the function test-injectable without a shape change to the public API surface.
- Updated the pre-existing `FIXTURE_TEMPLATES` waives-test fixture in `test/schema.test.js` to add `BASE_SPINE: ["role"]` — without it, the injected fixture registry would leave `SPINE` `undefined` inside the loop and throw when iterating, even though `waivedSections.has("role")` would have short-circuited it.
- Kept `src/frontmatter.js` and its B8 alias-guard fixture in `test/frontmatter.test.js` completely untouched, per the plan's explicit exception (guards a YAML alias-parsing property, unrelated to the spine rule) — confirmed via `git diff --stat src/frontmatter.js` producing no output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Hardened validateSkill's top-level `bodyStr` coercion against truthy non-string bodies**
- **Found during:** Task 1 (writing the plan-mandated adversarial null/non-string-body test)
- **Issue:** `validateSkill` coerced its `body` parameter via `const bodyStr = body || "";`, which only replaces *falsy* values (`null`, `undefined`, `""`, `0`, `NaN`). A *truthy* non-string body — `123`, `{}`, `[]` — passed through unchanged and reached `bodyStr.split("\n")` a few lines later, throwing `TypeError: bodyStr.split is not a function`. This is the same class of latent gap identified and fixed in Plan 18-01's `hasNonEmptyClosedSection` (that fix was scoped only to the new helper function, explicitly leaving this exact call site in `validateSkill` unaddressed as "out of scope for this plan"). The plan's Task 1 explicitly requires "Keep an adversarial case asserting a null/non-string body still returns errors without throwing," which exercises this exact path.
- **Fix:** Changed the coercion to `const bodyStr = typeof body === "string" ? body : "";`, mirroring the exact fix shape used in `hasNonEmptyClosedSection`. All downstream body checks (Title, TEMPLATE cascade, and the new BASE_SPINE role loop) already consume `bodyStr`, so this single change closes the gap for the whole function.
- **Files modified:** `src/schema.js` (the top-level `bodyStr` assignment only).
- **Verification:** New test `validateSkill never throws for a null/non-string body and still reports the missing-role error (D-01 never-throw)` covers `[null, undefined, 123, {}, []]` — all pass without throwing; full suite (205 tests) green.
- **Committed in:** `d402e15` (the single atomic commit).

**2. [Rule 2 - Missing Critical] Updated skill-schema.md §6's stale registry code sample**
- **Found during:** Task 3 (rewriting §4's Check 2 to describe the registry-driven role check)
- **Issue:** §6's "Current registry" code sample (a literal `src/templates.js` excerpt) still showed the pre-18-01 `SECTIONS` object without the `role` key and without the `BASE_SPINE` export — stale since Plan 18-01 added both without updating this doc. The plan's Task 3 action text didn't explicitly call out this code sample, but leaving it unrewritten would have visibly contradicted the newly-rewritten §4 Check 2 prose two sections above it, in the same file, describing a `role`/`BASE_SPINE`-driven check the code sample doesn't show.
- **Fix:** Added `role` to the `SECTIONS` object and the `export const BASE_SPINE = ["role"];` line to the code sample, matching the real `src/templates.js` verbatim.
- **Files modified:** `shared/references/skill-schema.md` (the §6 code fence only).
- **Verification:** `test/doc-sync.test.js`'s DOC-06 self-check still passes (this sample isn't part of the curated `staticSegments`, so it wasn't a hard requirement, but it is now byte-consistent with `src/templates.js`).
- **Committed in:** `d402e15` (the single atomic commit).

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing-critical/documentation-consistency)
**Impact on plan:** Both fixes were necessary to satisfy the plan's own explicit requirements (the never-throw adversarial test) or to avoid a doc self-contradiction introduced by this same plan's other required edits. No scope creep — `hasClosedSection` itself remains untouched, and the doc code-sample fix is a byte-for-byte source citation.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 18 (base-spine role migration) is now complete: `<role>...</role>` is the only accepted role declaration, enforced via the registry-driven `BASE_SPINE` loop, with two distinct, drift-guarded lint errors.
- No blockers. The only deliberately-retained legacy artifact is the `frontmatter.js` B8 alias-guard fixture, which is unrelated to the spine rule and explicitly out of scope.

---
*Phase: 18-migrate-base-spine-role-to-role-section-tag*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/schema.js
- FOUND: test/schema.test.js
- FOUND: skills/release/SKILL.md
- FOUND: skills/build-skill/SKILL.md
- FOUND: src/init.js
- FOUND: test/lint.test.js
- FOUND: test/build.test.js
- FOUND: shared/references/skill-schema.md
- FOUND: test/doc-sync.test.js
- FOUND: README.md
- FOUND commit d402e15 (Tasks 1-3, single atomic commit)
- Full `node --test` suite: 205/205 pass
- `motto lint` (dogfood): `✓ 2 skills OK`
