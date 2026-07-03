---
phase: quick-260703-nya
plan: 01
subsystem: schema-validation
tags: [schema, refactor, fence-tracking, code-review-remediation]

requires:
  - phase: 18-migrate-base-spine-role-to-role-section-tag
    provides: hasClosedSection / hasNonEmptyClosedSection validators (each carrying its own duplicated fence-tracking loop, flagged as IN-02 in 18-REVIEW.md)
provides:
  - Single internal collectUnfencedLines(bodyStr) helper in src/schema.js shared by hasClosedSection and hasNonEmptyClosedSection
  - 18-REVIEW.md IN-02 remediation row updated to fixed with commit ref
affects: [schema.js, future fence-semantics changes to <tag> section detection]

tech-stack:
  added: []
  patterns:
    - "Shared internal (non-exported) helper for logic duplicated across sibling exported functions, with typeof/never-throw guards kept at the exported boundary rather than pushed into the helper"

key-files:
  created: []
  modified:
    - src/schema.js
    - .planning/phases/18-migrate-base-spine-role-to-role-section-tag/18-REVIEW.md

key-decisions:
  - "collectUnfencedLines is internal (not exported) and assumes a string argument — the never-throw typeof guards stay at hasClosedSection/hasNonEmptyClosedSection's boundaries (D-01 preserved)"
  - "Pure refactor: no error-string changes, no behavior changes — verified via full 211-test suite and doc-sync test staying green"

requirements-completed: [IN-02]

coverage:
  - id: D1
    description: "hasClosedSection and hasNonEmptyClosedSection both call one shared collectUnfencedLines helper instead of each carrying an independent copy of the fence-tracking loop"
    requirement: IN-02
    verification:
      - kind: unit
        ref: "test/schema.test.js — hasClosedSection and hasNonEmptyClosedSection suites (22 tests)"
        status: pass
      - kind: unit
        ref: "node --test (full suite, 211 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "18-REVIEW.md IN-02 remediation row marked fixed with commit ref"
    requirement: IN-02
    verification:
      - kind: other
        ref: "grep -E '^\\| IN-02 \\| fixed' 18-REVIEW.md"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-03
status: complete
---

# Quick Task 260703-nya: Extract Shared Fence-Tracking Helper Summary

**Closed code-review finding IN-02 by extracting the 17-line fence-tracking loop duplicated in `hasClosedSection` and `hasNonEmptyClosedSection` into one shared internal `collectUnfencedLines` helper in src/schema.js.**

## Performance

- **Duration:** 8 min
- **Tasks:** 2/2 completed
- **Files modified:** 2

## Accomplishments

- Extracted `collectUnfencedLines(bodyStr)` as a single non-exported helper encapsulating the CommonMark-style fence-tracking loop (3+ backticks/tildes, up to 3 leading spaces, same-char/length-or-greater close match).
- Rewired both `hasClosedSection` and `hasNonEmptyClosedSection` to call the shared helper — only ONE `fenceRe` literal now exists in src/schema.js.
- Preserved the never-throw typeof guards (`typeof body === "string" ? body : ""`) at both exported functions' boundaries; the new helper itself assumes a string argument since both callers coerce first.
- Updated `hasNonEmptyClosedSection`'s docblock to reflect the shared-helper strategy (no longer describing "the same fence-tracking loop" as an independently maintained copy).
- Marked IN-02 `fixed` in `18-REVIEW.md`'s remediation table with the commit ref.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared collectUnfencedLines helper and rewire both validators** - `fdede19` (refactor)
2. **Task 2: Mark IN-02 fixed in the phase 18 remediation table** - `634aa1f` (docs)

_Plan metadata commit (STATE.md/SUMMARY.md) is handled by the orchestrator, not this executor, per quick-task constraints._

## Files Created/Modified

- `src/schema.js` - Added internal `collectUnfencedLines(bodyStr)` helper; both `hasClosedSection` and `hasNonEmptyClosedSection` now call it instead of carrying their own fence loop.
- `.planning/phases/18-migrate-base-spine-role-to-role-section-tag/18-REVIEW.md` - IN-02 remediation row updated from "deferred" to "fixed" with commit `fdede19`.

## Decisions Made

- Kept `collectUnfencedLines` internal/non-exported and string-only (no internal typeof guard) — the never-throw boundary property (D-01) stays owned by the two exported functions, matching the plan's constraint.
- No error strings changed anywhere in `validateSkill`'s output; doc-sync test (`test/doc-sync.test.js`) confirmed unaffected.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- IN-02 is fully closed; the D-06 deferred-duplication debt item from phase 18 is resolved.
- No blockers. `node --test` reports 211/211 pass; `node bin/motto.js lint` reports "2 skills OK".

---
*Quick task: 260703-nya-close-in-02-extract-shared-fence-trackin*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/schema.js
- FOUND: .planning/phases/18-migrate-base-spine-role-to-role-section-tag/18-REVIEW.md
- FOUND: .planning/quick/260703-nya-close-in-02-extract-shared-fence-trackin/260703-nya-SUMMARY.md
- FOUND commit: fdede19
- FOUND commit: 634aa1f
