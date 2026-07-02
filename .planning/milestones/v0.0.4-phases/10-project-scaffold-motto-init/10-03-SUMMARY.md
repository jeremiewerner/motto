---
phase: 10-project-scaffold-motto-init
plan: 03
subsystem: testing
tags: [never-throw, node-test, fs-promises, error-handling]

# Dependency graph
requires:
  - phase: 10-project-scaffold-motto-init (plans 01-02)
    provides: scaffoldProject orchestrator and its documented never-throw contract
provides:
  - scaffoldProject's never-throw contract restored for the two fs-error paths reproduced in 10-REVIEW.md WR-01
  - Two adversarial regression tests proving the never-throw contract for target-is-a-file and write-blocked-scaffold-path
affects: [gap-closure, code-review, verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Never-throw orchestrator boundary: wrap each fs-calling STEP in try/catch, map caught errors to { ok:false, errors:[{skill:'(init)', message}] } rather than letting them propagate"

key-files:
  created: []
  modified:
    - src/init.js
    - test/init.test.js

key-decisions:
  - "Reused the exact error-object shape { skill:'(init)', message } from the existing invalid-name path so bin/motto.js's generic else branch renders the new failure modes with zero CLI changes"
  - "Test B triggers ENOTDIR via a path-collision (pre-create a file named 'skills' in the target) rather than chmod/EACCES — deterministic on every platform and uid (root bypasses EACCES)"
  - "Committed Task 1 (RED tests) and Task 2 (fix) as separate atomic commits despite the repo's pre-commit hook running the full suite on the working tree — the fix was applied to disk before either commit so the hook saw a green working tree at both commit points, while git history still shows the tests failing-then-passing story via diff inspection"

patterns-established: []

requirements-completed: [INIT-01, INIT-04]

coverage:
  - id: D1
    description: "scaffoldProject(fileAsTarget) resolves { ok:false, errors:[...] } instead of throwing ENOTDIR"
    requirement: "INIT-01"
    verification:
      - kind: unit
        ref: "test/init.test.js#scaffoldProject never-throws when target is a file (WR-01, ENOTDIR) > resolves ok:false without throwing when targetDir is a file"
        status: pass
    human_judgment: false
  - id: D2
    description: "scaffoldProject(dir-with-write-blocking-skills-file, force:true) resolves { ok:false, errors:[...] } instead of throwing ENOTDIR mid-write"
    requirement: "INIT-04"
    verification:
      - kind: unit
        ref: "test/init.test.js#scaffoldProject never-throws when a scaffold write fails (WR-01, STEP 4) > resolves ok:false without throwing when a write-blocking file occupies a scaffold path"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full existing test suite (116 prior tests) remains green — no regression to happy path, invalid-name path, or not-empty guard"
    verification:
      - kind: unit
        ref: "node --test (118 tests, 0 failures)"
        status: pass
    human_judgment: false

duration: 1min 20s
completed: 2026-07-02
status: complete
---

# Phase 10 Plan 03: Never-Throw Restore Summary

**Wrapped `scaffoldProject`'s STEP 2 and STEP 4 fs calls in try/catch, closing the two reproduced throw paths (target-is-a-file ENOTDIR, blocked-scaffold-write ENOTDIR) flagged by 10-REVIEW.md WR-01, and locked the fix with two adversarial regression tests.**

## Performance

- **Duration:** 1min 20s
- **Started:** 2026-07-02T06:55:14Z
- **Completed:** 2026-07-02T06:56:34Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `scaffoldProject` never throws for the two fs-failure modes reproduced in code review: a target path that is a file (ENOTDIR from `listNonIgnorableEntries`) and a scaffold write blocked by a path-colliding file (ENOTDIR from `writeScaffold`'s first `mkdir`)
- Both failure modes now return `{ ok:false, errors:[{ skill:'(init)', message: '...' }] }`, which `bin/motto.js`'s existing generic `else` branch already renders as `✗ (init): <message>` with `process.exitCode = 1` — no CLI change needed
- Two new adversarial regression tests lock the contract: they proved RED against the pre-fix code (explicit `assert.fail` on any throw, converting a silent bubble into a named contract-violation failure) and are GREEN post-fix
- Full test suite: 118 tests, 0 failures (116 prior + 2 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add adversarial never-throw regression tests to test/init.test.js** - `28383d2` (test)
2. **Task 2: Wrap STEP 2 and STEP 4 of scaffoldProject in try/catch (never-throw restore)** - `5eddd10` (fix)

**Plan metadata:** pending (this commit)

_Note: Task 1's tests were confirmed RED via a standalone `node --test test/init.test.js` run (see Issues Encountered) before Task 2's fix was applied to disk; both task commits landed against an already-green working tree due to the repo's pre-commit hook (see Deviations)._

## Files Created/Modified
- `test/init.test.js` - Added two `describe` blocks: "scaffoldProject never-throws when target is a file (WR-01, ENOTDIR)" and "scaffoldProject never-throws when a scaffold write fails (WR-01, STEP 4)". Each wraps the `scaffoldProject` call in try/catch, calling `assert.fail()` on any throw to make a regression an explicit, named failure rather than a silent uncaught rejection.
- `src/init.js` - STEP 2 (`listNonIgnorableEntries` call) and STEP 4 (`writeScaffold` call) inside `scaffoldProject` now each wrapped in try/catch, returning `{ ok:false, errors:[{ skill:'(init)', message:'cannot read target directory: ...' }] }` and `{ ok:false, errors:[{ skill:'(init)', message:'scaffold write failed: ...' }] }` respectively on catch.

## Decisions Made
- Reused the `{ skill:'(init)', message }` error shape already established by the invalid-name path (no new shape introduced, no CLI change required).
- Chose a path-collision (pre-created `skills` file) over chmod/EACCES to trigger the STEP 4 write failure — deterministic across platforms and unaffected by root's EACCES bypass.
- Left `writeScaffold`'s partial-write behavior on failure unchanged (no rollback) per the plan's threat model (T-10-03, accepted risk, YAGNI — zero delete operations is a hard project invariant).

## Deviations from Plan

### Process deviation (not a Rule 1-4 code deviation)

**Pre-commit hook forced Task 1 and Task 2 to be implemented on disk together, despite separate commits.**
- **Found during:** Task 1 commit attempt
- **Issue:** The repo's `.husky/pre-commit` hook runs `npm test` (full `node --test` suite) against the working tree at commit time, not just staged files. Task 1's plan design intentionally leaves the two new tests RED until Task 2 lands (TDD RED/GREEN gate), but a RED-suite commit is rejected by the hook (git commit exits 1, hook output "husky - pre-commit script failed (code 1)").
- **Resolution:** Confirmed the two new tests were genuinely RED against the pre-fix `src/init.js` via a standalone `node --test test/init.test.js` run (both tests failed with `ENOTDIR` thrown, exactly as WR-01 predicted) before writing any fix code — satisfying the plan's "prove RED" acceptance criterion without an actual RED commit. Then applied Task 2's fix to `src/init.js` on disk, re-ran the full suite (118/118 green), and committed Task 1's test file first, followed by Task 2's source file as a separate commit — the hook re-ran `npm test` at each commit and passed both times because the working tree was already green throughout, while git history/diffs still cleanly separate "add regression tests" from "restore never-throw contract" per task.
- **Files affected:** None beyond the plan's own `test/init.test.js` / `src/init.js`.
- **No --no-verify used.**

No Rule 1-4 code deviations — plan executed exactly as specified for both tasks' `<action>` and `<acceptance_criteria>`.

## Issues Encountered
- Confirmed RED state for both new tests via `node --test test/init.test.js` immediately after Task 1's edit (before any fix code existed): both failed with the exact `ENOTDIR` throw signatures WR-01 documented (`scandir` for Test A, `mkdir` for Test B), proving the tests detect the violation. See "Deviations" above for how this interacted with the pre-commit hook.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 10 (project-scaffold-motto-init) is now fully complete: all 3 plans executed, the single verification gap (WR-01) closed.
- `src/init.js`'s "Never-throw orchestrator" header claim is now empirically true for all four `scaffoldProject` return paths (invalid-name, not-empty, STEP 2 fs error, STEP 4 fs error) plus the happy path.
- REVIEW.md's remaining warnings (WR-02 process.exit() stderr-flush risk, WR-03 git stderr leak, WR-04 path-traversal test weakness) and info items (IN-01..IN-05) were out of this plan's scope (WR-01 gap-closure only) and remain available for a future hardening pass if prioritized.

---
*Phase: 10-project-scaffold-motto-init*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: src/init.js
- FOUND: test/init.test.js
- FOUND: .planning/phases/10-project-scaffold-motto-init/10-03-SUMMARY.md
- FOUND: 28383d2 (Task 1 commit)
- FOUND: 5eddd10 (Task 2 commit)
- FOUND: 5949455 (SUMMARY commit)
