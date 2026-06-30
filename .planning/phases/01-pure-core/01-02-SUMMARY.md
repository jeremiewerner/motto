---
phase: 01-pure-core
plan: 02
subsystem: validation
tags: [node-test, esm, schema, lint, validateSkill, kebab-regex]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Project scaffold (ESM, yaml, husky), uniform errors[] model (D-01)"
provides:
  - "validateSkill(skill, sharedRefs?) -> Array<{skill,message}> — pure never-throw schema validator (LINT-01..05)"
  - "NAME_KEBAB /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/ — exported canonical kebab regex (D-08, D-16)"
affects: [discoverSkills, lint, loadConfig, config.js]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Name-cascade pattern (D-13): stop at first name failure, collect all other errors independently"
    - "Safe-basename-before-membership pattern (D-10): unsafe path check runs before Set lookup"
    - "Multiline anchored regex for body-spine checks (/^# \\S/ and /^\\*\\*Role:/m) — linear-time (T-02-01)"

key-files:
  created:
    - src/schema.js
    - test/schema.test.js
  modified: []

key-decisions:
  - "RED+GREEN committed together: husky pre-commit runs full node --test suite; standalone failing RED would be rejected. RED (ERR_MODULE_NOT_FOUND) verified locally first."
  - "D-08 fix applied: NAME_KEBAB is /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/ (letter-start), not the prior-art /^[a-z0-9]+/ which accepted leading digits."
  - "D-09 reserved-substring check: name.includes('anthropic') || name.includes('claude') — substring not whole-word."
  - "D-10 safe-basename before membership: entries with '/' or '.' get an unsafe error and skip the Set lookup."
  - "D-11 single error message for audience: missing and invalid both produce 'audience must be public|private'."
  - "D-12 independent body-spine checks: Title and Role run separately so both can be reported on the same skill."
  - "D-13 cascade vs collect: name chain stops at first failure; all other checks collect independently."
  - "D-14 template/dependencies accepted-but-not-validated: no error for unknown frontmatter keys."
  - "D-16 NAME_KEBAB exported: src/config.js will import and reuse the same regex to stay in sync."

patterns-established:
  - "Error cascade pattern: for a multi-step chain where downstream checks are meaningless if an upstream one fails, use if/else-if to stop at the first failure"
  - "Error collection pattern: for independent checks, push all errors into a shared errors[] with no short-circuit"

requirements-completed: [LINT-01, LINT-02, LINT-03, LINT-04, LINT-05]

coverage:
  - id: D1
    description: "validateSkill returns [] for a fully valid skill (happy path)"
    requirement: "LINT-01"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B1: valid skill returns empty errors array"
        status: pass
    human_judgment: false
  - id: D2
    description: "Missing name reports a name error and the cascade stops (no kebab/reserved/folder errors)"
    requirement: "LINT-01"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B2: missing name reports missing-name error and stops the name cascade (D-13)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Leading-digit name '0bad' reports a non-kebab error and the cascade stops (D-08 regression guard)"
    requirement: "LINT-02"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B3: leading-digit name '0bad' reports non-kebab error; no downstream name errors"
        status: pass
    human_judgment: false
  - id: D4
    description: "Underscore/uppercase name reports a non-kebab error"
    requirement: "LINT-02"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B4: underscore name 'My_Skill' reports non-kebab error"
        status: pass
    human_judgment: false
  - id: D5
    description: "Reserved-word name 'claude-helper' reports a reserved-word error; cascade stops before folder check (D-09)"
    requirement: "LINT-02"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B5: reserved-word name 'claude-helper' reports reserved-word error; no folder error"
        status: pass
    human_judgment: false
  - id: D6
    description: "Name that doesn't match its folder reports a name-not-equal-folder error"
    requirement: "LINT-02"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B6: name 'other' with dirName 'my-skill' reports name-not-equal-folder error"
        status: pass
    human_judgment: false
  - id: D7
    description: "Missing description reports a description-required error (LINT-01)"
    requirement: "LINT-01"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B7: missing description reports missing-description error"
        status: pass
    human_judgment: false
  - id: D8
    description: "Invalid and absent audience both produce the same 'public|private' error (LINT-03, D-11)"
    requirement: "LINT-03"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B8: audience 'both' and absent audience produce the same public|private error (D-11)"
        status: pass
    human_judgment: false
  - id: D9
    description: "Body without H1 title or **Role:** line reports both errors independently (LINT-04, D-12)"
    requirement: "LINT-04"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B9: body without H1 title or Role line reports both errors independently (D-12)"
        status: pass
    human_judgment: false
  - id: D10
    description: "Resolved shared_references not reported; unresolved entry is reported (LINT-05)"
    requirement: "LINT-05"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B10: resolved shared_references entry is not reported; unresolved is"
        status: pass
    human_judgment: false
  - id: D11
    description: "Unsafe shared_references basenames (/ or .) get unsafe errors; no 'not found' for those entries (LINT-05, D-10)"
    requirement: "LINT-05"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B11: unsafe shared_references basenames get unsafe errors; no 'not found' for them (D-10)"
        status: pass
    human_judgment: false
  - id: D12
    description: "Multiple independent errors (audience + description + role) all collected and reported together (D-13)"
    requirement: "LINT-01"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B12: audience 'both' + missing description + body missing Role all reported together (D-13)"
        status: pass
    human_judgment: false
  - id: D13
    description: "template and dependencies frontmatter keys accepted without error (D-14)"
    requirement: "LINT-01"
    verification:
      - kind: unit
        ref: "test/schema.test.js#B13: template and dependencies keys in data cause no errors (D-14)"
        status: pass
    human_judgment: false
  - id: D14
    description: "NAME_KEBAB exported, is a RegExp, matches letter-start kebab, rejects leading-digit/underscore/double-dash (D-08, D-16)"
    requirement: "LINT-02"
    verification:
      - kind: unit
        ref: "test/schema.test.js#NAME_KEBAB is exported and is the letter-start kebab regex (D-08, D-16)"
        status: pass
    human_judgment: false

# Metrics
duration: ~10min
completed: 2026-06-30
status: complete
---

# Phase 1 Plan 02: Pure Core — validateSkill Summary

**`validateSkill` — a pure never-throw schema validator enforcing name cascade (missing/non-kebab/reserved/folder), independent description/audience/body-spine/shared_references checks, and the exported `NAME_KEBAB` letter-start kebab regex, covering LINT-01..05.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-30T08:30Z
- **Completed:** 2026-06-30T08:40Z
- **Tasks:** 1 (TDD auto task)
- **Files modified:** 2

## Accomplishments

- `validateSkill(skill, sharedRefs?)` exported from `src/schema.js`: a pure object validator (no filesystem, no YAML import, never throws — D-01) that returns `Array<{skill: dirName, message}>`.
- Name checks cascade (D-13): missing → non-kebab → reserved-word (`anthropic`/`claude`) → ≠folder — one at a time, stopping at the first failure so downstream name errors aren't reported when they're meaningless.
- Letter-start kebab regex `NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` defined as a module-level exported constant (D-08 regression fix over the prior-art `/^[a-z0-9]+/`; exported for `src/config.js` reuse per D-16).
- Missing and invalid `audience` both produce the same `"audience must be public|private"` message (D-11).
- Body-spine Title and Role checks are independent so both can surface together (D-12): first non-blank line matched against `/^# \S/`; body matched against `/^\*\*Role:/m`.
- `shared_references` safe-basename check (contains `/` or `.`) precedes the Set-membership check for each entry (D-10, T-02-02): unsafe entries get an unsafe-basename error and skip the "not found" check.
- `template` and `dependencies` frontmatter keys are silently accepted (D-14).
- 14 behavior tests (B1–B13 + NAME_KEBAB) in `test/schema.test.js`; all 21 tests across both suites pass under `node --test`.

## Task Commits

1. **Task 1: Implement validateSkill (TDD — B1..B13 + NAME_KEBAB)** — `54a815d` (feat; RED verified locally via ERR_MODULE_NOT_FOUND, then RED+GREEN committed together — same constraint as 01-01)

**Plan metadata:** committed separately with this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates.

_Note: the husky pre-commit hook runs the full `node --test` suite, so a standalone failing RED commit is impossible without `--no-verify` (prohibited); RED was verified locally first._

## Files Created/Modified

- `src/schema.js` — `validateSkill(skill, sharedRefs?)` and exported `NAME_KEBAB`. Pure object validator, no imports, no I/O, never throws.
- `test/schema.test.js` — 14 node:test behaviors (B1–B13 + NAME_KEBAB export test) asserting on errors[] content.

## Decisions Made

- **RED+GREEN in one commit.** Identical constraint to plan 01-01: husky pre-commit runs `npm test`; a standalone RED commit would be rejected; `--no-verify` is prohibited. RED failure (ERR_MODULE_NOT_FOUND) was observed locally before implementing.
- **D-08 letter-start fix applied.** `NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` starts with `[a-z]`, not `[a-z0-9]`. The prior-art regex `/^[a-z0-9]+(-[a-z0-9]+)*$/` wrongly accepts `"0bad"`.
- **D-09 substring check.** `name.includes("anthropic") || name.includes("claude")` — substring match, not word-boundary, so `"claude-helper"` is caught.
- **D-10 order enforced.** For each `shared_references` entry the unsafe-basename check runs first (contains `/` or `.`). If unsafe, an unsafe-basename error is pushed and the `sharedRefs.has(entry)` check is skipped entirely for that entry.
- **D-11 single audience message.** `data.audience !== "public" && data.audience !== "private"` — one condition covers both missing (`undefined`) and invalid values.
- **D-12 independent body checks.** H1 check and Role check use separate `if` statements (not `else if`) so both can push errors.
- **D-14 ignored keys.** No validation of `template` or `dependencies`; the validator only destructures `name`, `description`, `audience`, `shared_references` from `data`.

## Deviations from Plan

None — plan executed exactly as written. (Rules 1–3 not triggered; no architectural changes needed.)

## Known Stubs

None. `validateSkill` is fully implemented and tested; no placeholder paths.

## Issues Encountered

- **TDD RED commit vs. pre-commit hook** — resolved identically to 01-01: RED verified locally, RED+GREEN committed together. No `--no-verify` used.

## Threat Flags

None beyond the plan's existing `<threat_model>`. T-02-01 (ReDoS): `NAME_KEBAB` is anchored and unambiguous — each `-` unambiguously starts exactly one group; `-` cannot appear in `[a-z0-9]`, so no catastrophic backtracking. T-02-02 (path traversal): the safe-basename check rejects `/` and `.` before any resolution, implemented as coded (confirmed by B11).

## Known Limitations

None introduced by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `validateSkill` signature is stable for Phase 2: `discoverSkills` will call `parseFrontmatter` per file and pass the result to `validateSkill`; `lint` will concatenate parse + schema errors.
- `NAME_KEBAB` is available for `src/config.js` (plan 01-03) to import and validate `plugins.public` / `plugins.private` plugin names (D-16).
- All 21 tests across `frontmatter` + `schema` suites are green.

## Self-Check: PASSED

- `src/schema.js` exists and exports `validateSkill` and `NAME_KEBAB`.
- `test/schema.test.js` exists with 14 behavior tests.
- Commit `54a815d` is present in git history.
- `node --test` passes 21/21.

---
*Phase: 01-pure-core*
*Completed: 2026-06-30*
