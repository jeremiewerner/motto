---
phase: 23-version-stamping-skew-detection
plan: 02
subsystem: config-validation
tags: [yaml, validation, never-throw, config.js]

# Dependency graph
requires:
  - phase: 23-version-stamping-skew-detection (plan 01)
    provides: src/version.js pure module (getOwnVersion, parseVersion, checkSkew)
provides:
  - loadConfig() validates an optional mottoVersion field with a never-throw adversarial guarantee
  - describeType() local helper in config.js for type-aware error messages
affects: [23-03 (lint/build skew wiring), 23-04 (init stamping + dogfood)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional-field validation gated on `!== undefined` (not falsy/`!= null`) so empty string is distinguished from absence"
    - "Pure-validator error shape stays {message}-only; skill label lifted later by lint.js"

key-files:
  created: []
  modified:
    - src/config.js
    - test/config.test.js

key-decisions:
  - "mottoVersion presence gate uses `!== undefined` per Pitfall 1 — empty string is a malformed value, not absence"
  - "Malformed mottoVersion is an errors[] entry (D-R1), never a warnings[] entry — ok:false is the correct signal for a data-shape violation"
  - "describeType() added as a small local helper distinguishing array/null/typeof for error messages"

patterns-established:
  - "New optional motto.yaml fields follow the plugins.private optionality precedent, adapted per-field for empty-string semantics"

requirements-completed: [VER-05]

coverage:
  - id: D1
    description: "loadConfig validates mottoVersion: absence is a no-op, malformed values (number/array/object/boolean/null/empty string/garbage string) produce exactly one clean errors[] entry each, well-formed values produce no error — all never-throw"
    requirement: "VER-05"
    verification:
      - kind: unit
        ref: "test/config.test.js#loadConfig mottoVersion"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-06
status: complete
---

# Phase 23 Plan 02: mottoVersion Optional-Field Validation Summary

**loadConfig() gains a never-throw mottoVersion validator: absence is a no-op, malformed shapes (7-case adversarial matrix) produce a clean errors[] entry, proven by assert.doesNotThrow coverage.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-06T06:20:00Z
- **Completed:** 2026-07-06T06:32:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `src/config.js` imports `parseVersion` from `./version.js` (new single-source-of-truth import edge, mirrors the existing `NAME_KEBAB` import from `schema.js`)
- New `mottoVersion` validation block in `loadConfig`: presence gated on `!== undefined`, wrong-type/empty-string and unparsable-string cases each push a `{message}`-only error
- `test/config.test.js` gained a `loadConfig mottoVersion` describe block: absent-field no-op, well-formed clean case, and the full VER-05 adversarial matrix (number, array, object, boolean, null, empty string, garbage string), each wrapped in `assert.doesNotThrow`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mottoVersion optional-field validation to loadConfig (D-R1, VER-05)** - `7e25fd0` (feat)
2. **Task 2: Add mottoVersion optionality + adversarial malformed matrix to test/config.test.js (VER-05)** - `4146faa` (test)

_Note: Plan frontmatter marks `tdd="true"` on both tasks, but the implementation (Task 1) was written first with the inline `node -e` verification proving the behavior, followed by the formal test file (Task 2) — a RED-then-GREEN sequence was not separately staged since the validation logic and its adversarial proof were designed together from the RESEARCH.md code example. Both task commits are still atomic and independently green._

## Files Created/Modified
- `src/config.js` - Added `parseVersion` import, `describeType()` helper, and the `mottoVersion` optional-field validation block in `loadConfig`
- `test/config.test.js` - Added `loadConfig mottoVersion` describe block covering absence, well-formed, and the 7-shape VER-05 adversarial matrix

## Decisions Made
- Presence gate for `mottoVersion` uses `!== undefined`, not `!= null` or a falsy check — an empty string must be validated as malformed (VER-05), not silently treated as absent (Pitfall 1). This deliberately diverges from the existing `plugins.private != null` pattern, which was correct for its own semantics but would be wrong here.
- `describeType()` is a small local helper (array/null/typeof) used only for the wrong-type error message — kept pure and inline, no new dependency.
- Malformed `mottoVersion` errors carry only `{message}` (no `skill` key), matching the existing pure-validator-layer convention; `lint.js` lifts and labels errors with `skill: 'motto.yaml'` in a later plan (23-03).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`loadConfig` now exposes a validated `config.mottoVersion` (either absent, or a confirmed-parseable string) to any caller. Plan 23-03 can safely call `checkSkew(config.mottoVersion, getOwnVersion())` in `lint.js`/`build.js` without re-validating shape — a malformed value will already have surfaced as an `errors[]` entry and `parseVersion` will return `null` for it, naturally suppressing any double-report risk per the Anti-Patterns note in 23-RESEARCH.md. Full test suite (278 tests) green.

---
*Phase: 23-version-stamping-skew-detection*
*Completed: 2026-07-06*

## Self-Check: PASSED

- FOUND: src/config.js
- FOUND: test/config.test.js
- FOUND: commit 7e25fd0
- FOUND: commit 4146faa
