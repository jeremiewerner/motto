---
phase: 18-migrate-base-spine-role-to-role-section-tag
plan: 01
subsystem: testing
tags: [validator, schema, templates, regex, never-throw]

# Dependency graph
requires:
  - phase: 14-template-mechanism
    provides: hasClosedSection fence-aware scanner, SECTIONS/TEMPLATES registry shape
provides:
  - BASE_SPINE registry export (["role"]) and SECTIONS.role description in src/templates.js
  - hasNonEmptyClosedSection(body, tagName) exported from src/schema.js, adversarially tested, unwired
affects: [18-02-migrate-base-spine-role-to-role-section-tag]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-empty section check isolated as its own function that delegates to hasClosedSection rather than duplicating the fence-aware scan"
    - "Never-throw boundary re-verified: any new validator path gets an explicit body-type coercion ahead of downstream string ops, plus a mandatory adversarial (null/undefined/number/object/array) test group"

key-files:
  created: []
  modified:
    - src/templates.js
    - src/schema.js
    - test/schema.test.js

key-decisions:
  - "hasNonEmptyClosedSection coerces body via `typeof body === 'string' ? body : ''` BEFORE calling hasClosedSection — not via hasClosedSection's own `body || ''`, which only guards falsy values and lets a truthy non-string (123, {}, []) reach an unguarded `.split()` and throw. Fixed only in the new function; hasClosedSection itself is untouched (out of scope for this plan, reserved for a future pass)."
  - "role added to SECTIONS but deliberately NOT added to TEMPLATES.procedure.requiredSections — role is base-spine data (BASE_SPINE), not a per-template requirement (D-03)."
  - "hasNonEmptyClosedSection is exported but not called anywhere inside validateSkill in this plan — the legacy **Role:** regex check stays live so this commit is independently green; wiring happens atomically in Plan 18-02."

requirements-completed: [D-03, D-05, D-06]

coverage:
  - id: D1
    description: "BASE_SPINE array (['role']) and SECTIONS.role one-line description added to src/templates.js as pure data; TEMPLATES.procedure.requiredSections unchanged"
    requirement: "D-03"
    verification:
      - kind: unit
        ref: "node -e import check (BASE_SPINE===['role'], SECTIONS.role non-empty, requiredSections excludes role) — plan verify command"
        status: pass
      - kind: unit
        ref: "test/schema.test.js — full existing suite (202 tests) still green with the new registry keys present"
        status: pass
    human_judgment: false
  - id: D2
    description: "hasNonEmptyClosedSection(body, tagName) exported from src/schema.js: true for non-empty closed <role>, false for whitespace-only/fenced-only/unclosed/missing, boolean never-throw for null/undefined/number/object/array body"
    requirement: "D-05, D-06"
    verification:
      - kind: unit
        ref: "test/schema.test.js#hasNonEmptyClosedSection (7 tests: true-case, whitespace-only, empty-between-tags, fenced-only, unclosed, missing, adversarial never-throw group)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Legacy **Role:** regex check in validateSkill left untouched; hasNonEmptyClosedSection not called from validateSkill; full test suite (202 tests) stays green"
    verification:
      - kind: unit
        ref: "node --test (full suite) — 202/202 pass; grep confirms zero call sites inside validateSkill"
        status: pass
    human_judgment: false

# Metrics
duration: 7min
completed: 2026-07-03
status: complete
---

# Phase 18 Plan 01: Base-Spine Role Registry Data + Isolated Non-Empty Scanner Summary

**Added BASE_SPINE/SECTIONS.role registry data and an adversarially-tested, never-throw hasNonEmptyClosedSection helper — fully unwired, so the legacy `**Role:**` check and all 202 existing tests stay exactly as they were.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-03T14:35:00Z (approx, first commit 16:35:52+02:00)
- **Completed:** 2026-07-03T14:37:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `src/templates.js`: `SECTIONS.role` (one-line description) and new `BASE_SPINE = ["role"]` export added as pure data; `TEMPLATES` untouched.
- `src/schema.js`: new exported `hasNonEmptyClosedSection(body, tagName)` — delegates to `hasClosedSection`, then checks the unfenced text strictly between the matched tags for non-whitespace content.
- `test/schema.test.js`: new `hasNonEmptyClosedSection` describe block with 7 tests covering the true-case, whitespace-only, empty-between-tags, fenced-only-content, unclosed, missing, and a malformed-input never-throw group (`null`, `undefined`, `123`, `{}`, `[]`).
- Full test suite green throughout (195 → 202 tests as the new describe block was added), confirming the legacy `**Role:**` regex check and all existing behavior are completely unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add BASE_SPINE export and role description to the template registry** - `dc02a93` (feat)
2. **Task 2: Add and adversarially test hasNonEmptyClosedSection (unwired)** - `49a801e` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `src/templates.js` - Added `SECTIONS.role` description and `BASE_SPINE` array export (pure data, no functions/imports).
- `src/schema.js` - Added exported `hasNonEmptyClosedSection(body, tagName)`; header Exports list updated; no changes to `validateSkill` or `hasClosedSection`.
- `test/schema.test.js` - Added `hasNonEmptyClosedSection` import and a new adversarial describe block.

## Decisions Made
- Isolated `hasNonEmptyClosedSection` as a standalone function delegating to `hasClosedSection` (D-06) rather than writing a second regex scanner, so future generalization to other sections (e.g. `<process>`) is a one-liner.
- Coerced `body` to a string with `typeof body === "string" ? body : ""` inside the new function, ahead of the delegated `hasClosedSection` call — see Deviations below.
- Kept the legacy `**Role:**` regex check in `validateSkill` completely untouched; wiring `BASE_SPINE`/`hasNonEmptyClosedSection` into `validateSkill` and removing the legacy check is deliberately deferred to Plan 18-02 (atomic flip).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guarded hasNonEmptyClosedSection against hasClosedSection's incomplete falsy-only coercion**
- **Found during:** Task 2 (writing the adversarial never-throw test group)
- **Issue:** The plan's suggested implementation delegates directly to `hasClosedSection(body, tagName)`. `hasClosedSection` coerces its `body` argument via `body || ""`, which only replaces *falsy* values (`null`, `undefined`, `""`, `0`, `NaN`) with `""`. A *truthy* non-string body — `123`, `{}`, `[]` — passes through unchanged and reaches `bodyStr.split("\n")` inside `hasClosedSection`, which throws `TypeError: bodyStr.split is not a function`. This is a pre-existing latent gap in `hasClosedSection` (never previously exercised because its own test suite only adversarially tests `undefined`/empty string, not truthy non-strings), but it would have caused `hasNonEmptyClosedSection` to violate its own never-throw acceptance criterion, which explicitly requires `123`, `{}`, and `[]` as adversarial cases.
- **Fix:** `hasNonEmptyClosedSection` now coerces its own `body` parameter with `typeof body === "string" ? body : ""` BEFORE ever calling `hasClosedSection`, guaranteeing `hasClosedSection` is always invoked with a real string. `hasClosedSection` itself is left completely untouched, per the plan's explicit instruction not to modify it in this plan.
- **Files modified:** `src/schema.js` (only inside the new `hasNonEmptyClosedSection` function; `hasClosedSection` body unchanged).
- **Verification:** All 5 adversarial malformed-input cases (`null`, `undefined`, `123`, `{}`, `[]`) now return `false` without throwing; full suite (202 tests) green.
- **Committed in:** `49a801e` (Task 2 commit).

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary to satisfy the plan's own acceptance criteria (never-throw for truthy non-string bodies). No scope creep — `hasClosedSection` itself remains untouched, and the fix is scoped entirely to the new function's own input boundary. Flagging for future attention: `hasClosedSection`'s `body || ""` coercion has the same latent gap for any future caller that might pass a truthy non-string body directly to it; out of scope here since no such caller currently exists, but worth a note for whoever eventually revisits that function (recurring never-throw theme per project memory — this pattern has surfaced in three prior milestones).

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 18-02 can now perform the atomic flip: import `BASE_SPINE` alongside `SECTIONS`/`TEMPLATES` in `src/schema.js`, replace the legacy `**Role:**` regex block with a `BASE_SPINE` loop using `hasNonEmptyClosedSection` (missing vs. empty as two distinct errors per D-08), update `test/doc-sync.test.js`'s `staticSegments`, migrate `shared/references/skill-schema.md` / `README.md` prose, and mechanically wrap `**Role:**` lines to `<role>...</role>` across live skills, `src/init.js`, and ~30 test fixtures.
- No blockers. `hasNonEmptyClosedSection`'s never-throw property is now proven against the exact adversarial set the migration plan requires, de-risking the cross-cutting flip.

---
*Phase: 18-migrate-base-spine-role-to-role-section-tag*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/templates.js
- FOUND: src/schema.js
- FOUND: test/schema.test.js
- FOUND commit dc02a93 (Task 1)
- FOUND commit 49a801e (Task 2)
