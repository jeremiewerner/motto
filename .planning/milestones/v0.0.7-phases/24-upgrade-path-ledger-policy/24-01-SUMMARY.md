---
phase: 24-upgrade-path-ledger-policy
plan: 01
subsystem: docs
tags: [markdown, node-test, upgrade-path, version-skew]

# Dependency graph
requires:
  - phase: 23-version-stamping-skew-detection
    provides: checkSkew() skew warning message and mottoVersion stamping at motto init
provides:
  - "UPGRADING.md — the breaking-change ledger at repo root, seeded with the v0.0.5 <role> migration and v0.0.7 mottoVersion stamp-adoption entries"
  - "checkSkew() remedy phrase names UPGRADING.md by filename"
  - "test/upgrading-ledger.test.js backstop guarding the ledger's existence and both seed headings"
affects: [24-02-release-skill-gate-policy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ledger entry depth contract (D-05): what-breaks + numbered steps + one before/after snippet + verify command, no rationale essays"
    - "Newest-first, version-keyed heading scheme (## vX.Y.Z — <short break description>), not date-keyed"

key-files:
  created:
    - UPGRADING.md
    - test/upgrading-ledger.test.js
  modified:
    - src/version.js
    - test/version.test.js
    - test/lint.test.js
    - test/cli.test.js
    - test/build.test.js

key-decisions:
  - "UPGRADING.md lives at repo root (sibling to README.md), not under docs/ — no docs/ dir exists, and creating one for one file would be doc sprawl (D-04/D-05)"
  - "Skew message names UPGRADING.md explicitly (Open Question 1 resolved: name the file, not a generic 'upgrade ledger' phrase) — v0.0.7 still unreleased, so the wording was freely editable"
  - "Backstop test is existence + seed-heading only, no source-text parity and no git-tag parsing (Open Question 2 resolved: no source-of-truth code file exists for the ledger to mirror, and future-entry judgment stays human/agent-side per D-01)"

patterns-established:
  - "Ledger Entry Template (Pattern 1, 24-RESEARCH.md): copy verbatim, adjust only heading scheme/ordering for future entries"

requirements-completed: [UPG-01]

coverage:
  - id: D1
    description: "UPGRADING.md exists at repo root with v0.0.5 and v0.0.7 seed entries, each conforming to the D-05 depth contract"
    requirement: "UPG-01"
    verification:
      - kind: unit
        ref: "test/upgrading-ledger.test.js#UPGRADING.md exists and contains both seed entries"
        status: pass
    human_judgment: false
  - id: D2
    description: "checkSkew() older-than-tool remedy names UPGRADING.md by filename; version.test.js, lint.test.js, cli.test.js, build.test.js all updated in lockstep"
    requirement: "UPG-01"
    verification:
      - kind: unit
        ref: "test/version.test.js#project older than tool -> 'check UPGRADING.md' remedy, names both versions"
        status: pass
      - kind: unit
        ref: "test/lint.test.js#a project whose mottoVersion is OLDER than the live tool warns \"check UPGRADING.md\""
        status: pass
      - kind: integration
        ref: "test/cli.test.js#CLI skew warning is non-blocking (VER-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Success criterion 2 (v0.0.5 <role> entry findable with accurate migration steps) is satisfiable by reading UPGRADING.md — content fidelity against commit d402e15"
    requirement: "UPG-01"
    verification: []
    human_judgment: true
    rationale: "Content accuracy of prose migration steps against a historical commit diff is a judgment call about readability and correctness that a substring/heading test cannot verify — this is the same manual-only classification RESEARCH.md's Test Framework section already assigned to this success criterion."

# Metrics
duration: 12min
completed: 2026-07-06
status: complete
---

# Phase 24 Plan 1: Upgrade-Path Ledger Content Summary

**Authored `UPGRADING.md` with the two seed entries (v0.0.5 `<role>` migration, v0.0.7 `mottoVersion` stamp adoption) and made the Phase 23 skew warning resolve to it by filename.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-06T11:45:00Z (approx)
- **Completed:** 2026-07-06
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- `UPGRADING.md` created at repo root with exactly two entries, newest-first, each following the what-breaks + numbered steps + one before/after snippet + verify-command depth contract (D-05)
- `checkSkew()`'s older-than-tool remedy now names `UPGRADING.md` explicitly instead of the generic "check the upgrade ledger" phrase — the skew warning's remedy now resolves to a real file
- New `test/upgrading-ledger.test.js` backstop guards the ledger's existence and both seed headings, mirroring `test/doc-sync.test.js`'s REPO_ROOT-anchoring convention

## Task Commits

Each task was committed atomically:

1. **Task 1: Author UPGRADING.md with the two seed entries** - `d73ac20` (docs)
2. **Task 2: Point the skew warning at UPGRADING.md and update its test in lockstep** - `6375e5f` (fix)
3. **Task 3: Add the ledger backstop test** - `731bfc4` (test)

_No TDD tasks in this plan; each task is a single commit._

## Files Created/Modified
- `UPGRADING.md` - New breaking-change ledger, root-level, two seed entries
- `test/upgrading-ledger.test.js` - New existence + seed-heading backstop test
- `src/version.js` - `checkSkew()` older-than-tool message now names `UPGRADING.md`
- `test/version.test.js` - Two skew-message assertions updated to match new wording
- `test/lint.test.js` - Deviation fix: test name string + regex assertion updated in lockstep
- `test/cli.test.js` - Deviation fix: two stderr regex assertions updated in lockstep
- `test/build.test.js` - Deviation fix: one warning-message regex assertion updated in lockstep

## Decisions Made
- `UPGRADING.md` placed at repo root, not under `docs/` — no `docs/` directory exists in the repo and creating one for a single file would be doc sprawl (D-04/D-05 lightweight principle)
- Skew message names the file explicitly (`check UPGRADING.md`) rather than staying generic — resolved RESEARCH.md's Open Question 1 in favor of concrete discoverability since v0.0.7 was still unreleased and the string freely editable
- Backstop test scoped to existence + heading presence only, no source-text parity check and no git-tag parsing — resolved Open Question 2: there is no source-of-truth code file for the ledger to mirror, and judging whether *future* entries exist is deliberately kept human/agent-side (D-01), not mechanized

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated three additional test files pinned to the old "check the upgrade ledger" wording**
- **Found during:** Task 2 (after editing `src/version.js` and `test/version.test.js` per the plan's exact file scope, the plan's own `<verification>` block requires the full `node --test` suite to pass — running it surfaced 4 failures)
- **Issue:** The plan's Task 2 `<read_first>`/`<action>` scoped the lockstep update to `test/version.test.js` only (confirmed via grep, "exactly two occurrences"), but `test/lint.test.js`, `test/cli.test.js`, and `test/build.test.js` independently pin the same skew-message substring via their own regex/name-string assertions (5 occurrences total across 3 files) — these are downstream consumers of `checkSkew()`'s message through `lintProject`/`buildProject`/the CLI, not duplicates of the direct unit test.
- **Fix:** Updated all 5 occurrences (`test/lint.test.js` lines 839/848/889, `test/cli.test.js` lines 466/478, `test/build.test.js` line 548) to match the new `/check UPGRADING\.md/` wording, identical in spirit to the plan's own Task 2 edit.
- **Files modified:** `test/lint.test.js`, `test/cli.test.js`, `test/build.test.js`
- **Verification:** Full suite re-run: `node --test` → 293 tests, `fail 0`. Grep for `check the upgrade ledger` across `src/` and `test/` returns zero occurrences in both directories.
- **Committed in:** `6375e5f` (part of Task 2 commit — same lockstep-wording-update rationale as the plan's own scoped edit)

---

**Total deviations:** 1 auto-fixed (1 bug/blocking — the plan's own full-suite verification requirement would have failed otherwise)
**Impact on plan:** Necessary to satisfy the plan's own stated verification (`node --test` full suite `# fail 0`). No scope creep — same wording-only change, same files' existing assertions, no new behavior introduced.

## Issues Encountered
None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `UPGRADING.md` exists and is live-referenced by the skew warning — Plan 02 (release-skill gate + CLAUDE.md/PROJECT.md constraints wiring, UPG-02) can now build its "Ledger Gate" step against a real target file.
- Repo's own `motto.yaml` was not touched (Pitfall 4 respected) — `test/dogfood.test.js`'s zero-skew-warning assertion on `REPO_ROOT` remains valid.
- Full suite green: 293 tests, `fail 0`.

---
*Phase: 24-upgrade-path-ledger-policy*
*Completed: 2026-07-06*

## Self-Check: PASSED

- FOUND: UPGRADING.md
- FOUND: test/upgrading-ledger.test.js
- FOUND: .planning/phases/24-upgrade-path-ledger-policy/24-01-SUMMARY.md
- FOUND: d73ac20 (Task 1 commit)
- FOUND: 6375e5f (Task 2 commit)
- FOUND: 731bfc4 (Task 3 commit)
