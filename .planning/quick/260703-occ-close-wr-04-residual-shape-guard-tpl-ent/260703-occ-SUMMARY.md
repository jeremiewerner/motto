---
phase: quick-260703-occ
plan: 01
subsystem: testing
tags: [validateSkill, template-cascade, never-throw, maintainer-integrity, node-test]

# Dependency graph
requires:
  - phase: 14-template-mechanism
    provides: TEMPLATES registry, template cascade in validateSkill (TPL[tpl] destructure)
  - phase: 18-migrate-base-spine-role-to-role-section-tag
    provides: CR-01 fix guarding BASE_SPINE key shape (companion never-throw hardening)
provides:
  - Shape guard in src/schema.js template cascade that rejects null/string/number/array TPL[tpl] entries before the throwing destructure
  - Adversarial DI tests proving no-throw + one invalid-registry-entry error per bad shape
  - Positive-path test proving the real TEMPLATES.procedure cascade is unchanged
  - v0.0.5-MILESTONE-AUDIT.md WR-04 tech_debt entry marked closed
affects: [milestone-audit, schema-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Registry entry shape guard: null/typeof-non-object/Array.isArray check inserted as an else-if branch strictly before a destructuring read, matching the house error style `<subject> has an invalid registry entry (got <descriptor>)`"

key-files:
  created: []
  modified:
    - src/schema.js
    - test/schema.test.js
    - .planning/v0.0.5-MILESTONE-AUDIT.md

key-decisions:
  - "Shape guard computes descriptor as 'null' for null, 'array' for Array.isArray, otherwise typeof — matching the CR-01/BASE_SPINE precedent's descriptor style"
  - "New error string `template \"<name>\" has an invalid registry entry (got <descriptor>)` is a maintainer-integrity error, kept OUT of shared/references/skill-schema.md and OUT of test/doc-sync.test.js staticSegments — doc-sync stays green with zero edits"
  - "Guard ordered strictly between the unknown-template hasOwnProperty check and the `const { requiredSections, waives } = TPL[tpl]` destructure — no existing error string changed"

patterns-established:
  - "Registry-entry shape guards precede any destructure of a DI-injected registry value; house style is `<subject> has an invalid registry entry (got <descriptor>)`"

requirements-completed: [WR-04]

coverage:
  - id: D1
    description: "validateSkill never throws when TEMPLATES[tpl] is null, a string, a number, or an array — it accumulates one invalid-registry-entry error instead of crashing on the destructure"
    requirement: "WR-04"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill never throws for a null/string/number/array template registry entry — accumulates one invalid-registry-entry error per shape (WR-04, D-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Existing template cascade behavior (non-string template, unknown template, valid TEMPLATES.procedure requiredSections/waives resolution) is unchanged"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill still resolves a valid object template entry — normal requires-<section> errors are unchanged (WR-04 guard does not swallow the real cascade)"
        status: pass
      - kind: unit
        ref: "test/schema.test.js — template cascade (TMPL-01, TMPL-04, TMPL-05) suite (11 tests, unchanged)"
        status: pass
    human_judgment: false
  - id: D3
    description: "doc-sync (DOC-06) stays green with zero edits to skill-schema.md or the doc-sync staticSegments allowlist"
    verification:
      - kind: unit
        ref: "test/doc-sync.test.js#every curated static segment is live source text AND is quoted in skill-schema.md"
        status: pass
      - kind: other
        ref: "grep -c 'invalid registry entry' shared/references/skill-schema.md test/doc-sync.test.js -> 0, 0"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-07-03
status: complete
---

# Quick Task 260703-occ: Close WR-04 residual shape guard on TPL[tpl] entry Summary

**Guarded the template cascade's `TPL[tpl]` destructure in `src/schema.js` against null/string/number/array registry entries, closing the last WR-04 never-throw gap carried since Phase 14.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-03T15:12:18Z (approx, per STATE.md prior activity timestamp)
- **Completed:** 2026-07-03T15:36:58Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added an `else if` shape guard in `validateSkill`'s template cascade, sitting between the unknown-template `hasOwnProperty` check and the `const { requiredSections, waives } = TPL[tpl]` destructure. A null, non-object, or array entry now emits `template "<name>" has an invalid registry entry (got <descriptor>)` instead of throwing `Cannot read properties of null (reading 'requiredSections')`.
- Added an adversarial test iterating `[null, "role", 123, []]` injected via the `templatesRegistry` DI seam (param 3 of `validateSkill`) — asserts `doesNotThrow`, asserts the result is an array, and asserts exactly the expected descriptor (`null`/`string`/`number`/`array`) appears in the error message for each bad shape.
- Added a positive-path test confirming the real `TEMPLATES.procedure` entry still resolves `requiredSections`/`waives` and produces the normal `requires-<section>` errors — the guard does not swallow the real cascade.
- Confirmed doc-sync stays green untouched: `grep -c "invalid registry entry"` returns `0` in both `shared/references/skill-schema.md` and `test/doc-sync.test.js`.
- Marked the WR-04 tech_debt entry closed in `.planning/v0.0.5-MILESTONE-AUDIT.md` (frontmatter `tech_debt` list item and the prose "Tech Debt (carried)" summary), with the fix commit ref (`9e36477`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Guard TPL[tpl] entry shape before destructure + adversarial never-throw tests** - `9e36477` (fix)
2. **Task 2: Mark WR-04 tech_debt entry closed in the milestone audit** - `2f3e601` (fix)

_Note: docs commit for STATE.md/SUMMARY.md/ROADMAP.md is applied separately by the orchestrator, not by this executor per the constraint to leave docs artifacts uncommitted._

## Files Created/Modified
- `src/schema.js` - Added the shape-guard `else if` branch in the template cascade, before the `TPL[tpl]` destructure
- `test/schema.test.js` - Added the adversarial null/string/number/array registry-entry test and the positive-path unchanged-behavior test
- `.planning/v0.0.5-MILESTONE-AUDIT.md` - WR-04 tech_debt entry and prose Tech Debt summary marked closed with commit ref

## Decisions Made
- Descriptor computation follows the established house style: `"null"` for `null`, `"array"` for `Array.isArray`, otherwise `typeof` — same shape as the Phase 18 CR-01 BASE_SPINE guard precedent.
- The new error string is explicitly a maintainer-integrity error (reachable only via hand-edited `src/templates.js` or test-only DI), so it was deliberately kept out of `shared/references/skill-schema.md`'s author-facing error tables and out of `test/doc-sync.test.js`'s `staticSegments` allowlist, per the plan's scope boundary.

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 auto-fixes were needed; the fix site, test DI seam, and audit file structure matched the plan's context exactly.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WR-04 is fully closed; the milestone audit's tech_debt list for Phase 14 no longer has an open shape-guard gap. Remaining tech debt is limited to the 3 human-verify items for build-skill live behavior (Phase 16) and 1 info-level prose gap (Phase 16 IN-02) — neither touched by this quick task.
- Full suite (213 tests across 49 suites) is green; `node bin/motto.js lint` reports `✓ 2 skills OK`; doc-sync is green with zero doc edits, as required by the plan's success criteria.

---
*Phase: quick-260703-occ*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/schema.js
- FOUND: test/schema.test.js
- FOUND: .planning/v0.0.5-MILESTONE-AUDIT.md
- FOUND: .planning/quick/260703-occ-close-wr-04-residual-shape-guard-tpl-ent/260703-occ-SUMMARY.md
- FOUND commit: 9e36477
- FOUND commit: 2f3e601
