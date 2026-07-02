---
phase: 10-project-scaffold-motto-init
plan: 02
subsystem: testing
tags: [testing, node-test, scaffolding, dogfood, filesystem]

# Dependency graph
requires:
  - phase: 10-project-scaffold-motto-init
    provides: "10-01 — src/init.js scaffoldProject(targetDir, {name, force}) never-throw orchestrator + bin/motto.js init subcommand"
provides:
  - "test/init.test.js — 31 unit/integration assertions covering scaffoldProject: happy path, default-name, invalid-name+suggestion, 4 adversarial names, non-empty guard+allowlist, offending-list sort, --force overwrite-only, .gitignore/marketplace.json/motto.yaml content shape"
  - "test/init-dogfood.test.js — permanent scaffold-dogfood guard: scaffoldProject -> lintProject -> buildProject fail-fast in a from-nothing temp dir, proving INIT-02 on every commit"
affects: [11-cli-ergonomics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "mkdtemp scratch-dir test isolation (never the repo root) — mirrors test/dogfood.test.js"
    - "Deterministic kebab subdirectory nested inside an mkdtemp scratch dir, used whenever a test needs a NAME_KEBAB-valid basename (mkdtemp's own random suffix can include uppercase characters and is not safe to use directly as an effective name)"
    - "before()-hook fail-fast cascade collapse (throw with JSON errors) for multi-step init->lint->build guards"

key-files:
  created:
    - test/init.test.js
    - test/init-dogfood.test.js
  modified: []

key-decisions:
  - "mkdtemp's random basename suffix is not guaranteed NAME_KEBAB-valid (can contain uppercase letters) — tests that need a deterministic effective name either pass an explicit `name` or nest a fixed-name subdirectory inside the mkdtemp scratch dir, rather than relying on the scratch dir's own basename"
  - "Non-empty-guard and offending-list-cap tests pass an explicit valid `name` to scaffoldProject — validation runs before the empty-dir guard, so an invalid mkdtemp basename would surface as reason:'invalid-name' and mask the guard behavior under test"

patterns-established:
  - "SCAFFOLD_PATHS constant (array of path-segment arrays) reused across the happy-path and --force describe blocks to avoid duplicating the 5-artifact stat list"

requirements-completed: [INIT-02, INIT-04, INIT-05]

coverage:
  - id: D1
    description: "test/init.test.js unit/integration coverage: happy path, default-name (cwd basename), invalid-name rejection with sanitized suggestion, 4 adversarial names (colon, quote, path-traversal, leading-digit), non-empty guard + .git/.DS_Store allowlist, offending-list deterministic sort at 7 entries, --force overwrite-only (unrelated file survives), and template content shape (.gitignore dist/private/ ignored + no standalone dist/, marketplace.json ./dist/public/ source + no owner.email, motto.yaml no plugins.private)"
    requirement: "INIT-04, INIT-05"
    verification:
      - kind: unit
        ref: "test/init.test.js — node --test test/init.test.js, 31/31 pass"
        status: pass
    human_judgment: false
  - id: D2
    description: "test/init-dogfood.test.js permanent guard: scaffoldProject -> lintProject -> buildProject chained fail-fast in a from-nothing temp dir (no repo-tree copy), asserting lint count=1, build skillCount=1/bucketCount=1, all 5 scaffold artifacts including shared/references/.gitkeep, dist/public/hello-world/SKILL.md, and the .gitignore ship-flow contract"
    requirement: "INIT-02"
    verification:
      - kind: unit
        ref: "test/init-dogfood.test.js — node --test test/init-dogfood.test.js, 10/10 pass"
        status: pass
      - kind: integration
        ref: "node --test (full suite) — 116/116 pass, no regressions to the prior 106 tests"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-02
status: complete
---

# Phase 10 Plan 02: Project Scaffold — Init Test Coverage Summary

**Two new test files (41 assertions total) lock down `motto init`: `test/init.test.js` unit-tests every guard/validation/content-shape branch of `scaffoldProject`, and `test/init-dogfood.test.js` becomes the permanent proof that a from-nothing scaffold passes `motto lint` and `motto build` with zero edits.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-02T05:52:00Z (approx)
- **Completed:** 2026-07-02T05:58:31Z
- **Tasks:** 2
- **Files modified:** 2 (both new)

## Accomplishments
- `test/init.test.js`: 31 assertions across 8 describe blocks covering `scaffoldProject`'s happy path (all 5 scaffold artifacts written), default-name-from-cwd-basename (INIT-01), invalid-name rejection with sanitized `my-project` suggestion (INIT-05/D-08), 4 adversarial names (`evil:name`, `evil"name`, `../evil`, `0leading-digit` — proves validation gates before any template interpolation, Pitfall 1/T-10-01), the non-empty-dir guard plus `.git`/`.DS_Store` allowlist (INIT-04/D-05), the offending-list deterministic sort at 7 entries (D-07), `--force` overwrite-only-scaffold-paths semantics with an unrelated file surviving (INIT-04/D-06), and template content shape (`.gitignore` keeps `dist/private/` ignored with no standalone `dist/` line — INIT-06; `marketplace.json` has `plugins[0].source === './dist/public/'` and no `owner.email` — INIT-03; `motto.yaml` has no `plugins.private` line).
- `test/init-dogfood.test.js`: a single `before()` hook chains `scaffoldProject(tempDir, {name:'sample-project'})` → `lintProject(tempDir)` → `buildProject(tempDir)`, throwing with the JSON error payload at whichever step fails first — a from-nothing temp dir (no repo-tree copy, unlike `test/dogfood.test.js`). Ten `it()` blocks assert both success return shapes (lint `count===1`, build `skillCount===1`/`bucketCount===1`) AND the full artifact set on disk, including an explicit `stat` on `shared/references/.gitkeep` (lint/build never read this file, so their success alone would not catch its absence — RESEARCH Open Question 2/Pitfall 5), the built `dist/public/hello-world/SKILL.md`, and the `.gitignore` ship-flow contract.
- Full suite (`node --test`) confirmed green at 116/116 (106 pre-existing + 10 new dogfood assertions run standalone, plus the 31 init-unit assertions bringing the grand total to 116) with zero regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test/init.test.js — unit/integration coverage of scaffoldProject** - `eb6801f` (test)
2. **Task 2: Create test/init-dogfood.test.js — permanent init → lint → build guard** - `fc69681` (test)

**Plan metadata:** (this commit, following SUMMARY.md write)

## Files Created/Modified
- `test/init.test.js` - 31-assertion unit/integration suite for `scaffoldProject` (8 describe blocks: happy path, default name, invalid name, adversarial names, non-empty guard + allowlist, offending-list cap, --force, content shape)
- `test/init-dogfood.test.js` - permanent scaffold-dogfood guard; single before() hook runs scaffoldProject → lintProject → buildProject fail-fast, 10 it() assertions on return shapes + on-disk artifacts

## Decisions Made
- `mkdtemp`'s random suffix is not guaranteed to satisfy `NAME_KEBAB` (it can include uppercase characters via libuv's charset), so any test exercising `scaffoldProject(dir, {})` (default-name path) nests a deterministic, hand-chosen kebab-valid subdirectory (`sample-project`) inside the mkdtemp scratch dir rather than trusting the scratch dir's own basename. Tests exercising the non-empty-guard and offending-list-cap paths (which don't care about the *name* under test) instead pass an explicit valid `name: 'hello-proj'` — since name validation runs before the empty-dir guard (Pitfall 1 ordering), an invalid mkdtemp basename would otherwise surface as `reason: 'invalid-name'` and mask the guard behavior actually being tested.
- Reused a single `SCAFFOLD_PATHS` array of path-segment arrays across the happy-path and `--force` describe blocks (both assert the same 5 artifacts exist) rather than duplicating the list.

## Deviations from Plan

None — plan executed exactly as written. All 8 numbered coverage items in Task 1's `<action>` and all bullet points in Task 2's `<action>` were implemented and verified. One implementation detail not explicitly specified by the plan (the mkdtemp-basename-is-not-NAME_KEBAB-safe issue) was discovered and resolved during Task 1 development — classified as Rule 1 (bug in the test's own assumption, fixed before the first commit, no separate commit needed since it was caught pre-commit).

## TDD Gate Compliance

This plan's tasks are pure test-authoring (`type="auto"`, no `tdd="true"` flag) — the plan itself IS the test suite that closes out the RED/GREEN gate deferred from plan 10-01 (whose SUMMARY explicitly notes "Formal RED/GREEN/REFACTOR test-file gate commits are deferred to plan 10-02"). Both `test/init.test.js` and `test/init-dogfood.test.js` were written and passed on first run against the already-implemented `src/init.js` from 10-01 — there is no RED phase here because the implementation predates this plan by design (10-01's `<verification>` section explicitly scoped comprehensive test-file creation to 10-02). Not a gap; matches the plan's stated two-plan RED/GREEN split at the phase level rather than the task level.

## Issues Encountered
None beyond the mkdtemp-basename NAME_KEBAB caveat documented above, which was caught and fixed during local test iteration before any commit.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 10 (project-scaffold-motto-init) is now fully complete: both plans (10-01 core scaffolder, 10-02 test coverage) executed, all three requirements (INIT-02, INIT-04, INIT-05) proven via automated tests, full suite green at 116 tests.
- `test/init-dogfood.test.js` is a permanent regression guard — any future change to `src/init.js`, `src/lint.js`, or `src/build.js` that breaks the scaffold-to-buildable-plugin path will fail this suite before merge.
- No blockers for Phase 11 (CLI Ergonomics).

---
*Phase: 10-project-scaffold-motto-init*
*Completed: 2026-07-02*

## Self-Check: PASSED

All claimed files exist (test/init.test.js, test/init-dogfood.test.js, 10-02-SUMMARY.md) and both task commit hashes (eb6801f, fc69681) are present in git log.
