---
phase: 13-address-tech-debt-plugins-public-reserved-word-enforcement-i
plan: 01
subsystem: testing
tags: [docs, jsdoc, child_process, stdio, regression-test, node-test]

# Dependency graph
requires:
  - phase: 11-cli-ergonomics
    provides: bin/motto.js process.exitCode-only exit convention (fixed commit d35aba7)
provides:
  - Corrected README.md/src/schema.js docs scoping the reserved-word rule to SKILL.md name only
  - resolveGitOwnerName stderr suppression via explicit stdio option
  - Strengthened adversarial-name path-escape regression test (parent-dir assertion)
  - DEBT-05 verification evidence (bin/motto.js has zero process.exit() call sites)
affects: [13-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSDoc scope-and-cite pattern: multi-line explanation + parenthetical citation (mirrors NAME_KEBAB JSDoc style in src/schema.js)"
    - "execFileSync stdio suppression: ['ignore','pipe','ignore'] to keep captured stdout while silencing stderr on a never-throw fallback path"
    - "Nested scratchDir/target regression assertion: assert readdir(scratchDir) deep-equals ['target'] to catch path-escape regressions a target-only assertion would miss"

key-files:
  created: []
  modified:
    - README.md
    - src/schema.js
    - src/init.js
    - test/init.test.js

key-decisions:
  - "DEBT-05 closed via verification only (no code change) — bin/motto.js already had zero process.exit() call sites since Phase 11 commit d35aba7; the plan's literal grep count (4) is a false positive from matching comment text ('never process.exit()', 'process.exit(1) NOT used') at lines 26, 130, 248, 274 — no actual call sites exist anywhere in the file"
  - "No RESERVED check added to src/config.js or src/init.js for plugins.public/plugins.private — DEBT-01 was scoped as a pure documentation/comment fix per 13-RESEARCH.md's explicit anti-pattern warning"

patterns-established:
  - "When a plan's automated verify script uses a naive literal-string grep that can't distinguish code from comments, confirm intent by reading actual call sites before treating a nonzero count as a blocking finding"

requirements-completed: [DEBT-01, DEBT-02, DEBT-03, DEBT-05]

coverage:
  - id: D1
    description: "README.md and src/schema.js RESERVED JSDoc scope the reserved-word rule to SKILL.md name only; plugins.public/private documented as kebab-case with no reserved-word restriction"
    requirement: "DEBT-01"
    verification:
      - kind: unit
        ref: "grep -c 'no reserved-word restriction' README.md src/schema.js (both return 1); node --test (131/131 pass)"
        status: pass
    human_judgment: false
  - id: D2
    description: "resolveGitOwnerName suppresses git's stderr via an explicit stdio option, preserving the never-throw/silent-fallback contract"
    requirement: "DEBT-02"
    verification:
      - kind: unit
        ref: "node --test test/init.test.js (33/33 pass); grep -q \"stdio: ['ignore', 'pipe', 'ignore']\" src/init.js"
        status: pass
    human_judgment: false
  - id: D3
    description: "Adversarial-name path-escape regression test asserts the parent scratch dir, not just the target dir, so a future write-outside-target regression would fail the test"
    requirement: "DEBT-03"
    verification:
      - kind: unit
        ref: "test/init.test.js#scaffoldProject adversarial names (Pitfall 1 / T-10-01) — 'writes nothing' assertion now checks readdir(scratchDir) deepStrictEqual ['target']"
        status: pass
    human_judgment: false
  - id: D4
    description: "DEBT-05 verified already-resolved: bin/motto.js has zero process.exit() call sites in executable code (all exit paths use process.exitCode); Phase 11 commit d35aba7 is the actual fix"
    requirement: "DEBT-05"
    verification:
      - kind: manual_procedural
        ref: "grep -n 'process\\.exit(' bin/motto.js — 4 matches, all inside comments (lines 26, 130, 248, 274); grep -n 'exit' bin/motto.js shows every executable exit-code assignment uses process.exitCode; git log --oneline | grep d35aba7 confirms the cited fix commit exists"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-02
status: complete
---

# Phase 13 Plan 01: Tech Debt Cleanup (DEBT-01/02/03/05) Summary

**Corrected the false plugins.public/private reserved-word doc claim, suppressed git stderr leakage in resolveGitOwnerName via explicit stdio, strengthened the adversarial-name path-escape regression test, and verify-closed the already-resolved process.exit() item — zero validation-logic changes.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-02T15:14:00Z (approx, first task commit 15:14:32+02:00)
- **Completed:** 2026-07-02T13:16:14Z
- **Tasks:** 4 (3 code/doc commits + 1 verification-only, no-commit task)
- **Files modified:** 4 (README.md, src/schema.js, src/init.js, test/init.test.js)

## Accomplishments

- README.md's `motto.yaml` field table and src/schema.js's `RESERVED` JSDoc now correctly scope the reserved-word restriction to SKILL.md `name` frontmatter only, with plugins.public/private documented as kebab-case with **no** reserved-word restriction — matching Claude Code's actual `plugin.json` spec (DEBT-01)
- `resolveGitOwnerName` in src/init.js now passes `stdio: ['ignore', 'pipe', 'ignore']` to `execFileSync`, so a corrupt `~/.gitconfig` no longer leaks raw git stderr to the user's terminal, while the never-throw/silent-fallback contract (`'Your Name'` on any failure) is unchanged (DEBT-02)
- The adversarial-name test suite in test/init.test.js now nests `tempDir` under a `scratchDir` (mirroring the default-name suite's pattern) and asserts `readdir(scratchDir)` deep-equals `['target']` for every adversarial name including `../evil` — a future path-escape regression that writes outside the target directory would now fail this test (DEBT-03)
- DEBT-05 verified and closed with no code change: bin/motto.js has zero `process.exit(` call sites in executable code (every exit path uses `process.exitCode`); the literal grep the plan specified returns 4 because it also matches comment text explaining the convention (see Deviations below); Phase 11 commit `d35aba7` is confirmed as the actual fix

## Task Commits

Each task was committed atomically:

1. **Task 1: Correct the false plugins.public/private reserved-word claim (DEBT-01)** - `3ce5e91` (docs)
2. **Task 2: Suppress git stderr leakage in resolveGitOwnerName (DEBT-02)** - `ce508f0` (fix)
3. **Task 3: Strengthen the adversarial-name path-escape regression test (DEBT-03)** - `1fd74a1` (test)
4. **Task 4: Verify-and-close the process.exit()-in-parseArgs item (DEBT-05)** - no commit (verification-only, no file changes per plan instructions)

## Files Created/Modified

- `README.md` - `plugins.public` field-table Rule column corrected to state no reserved-word restriction
- `src/schema.js` - `RESERVED` JSDoc rewritten to scope the rule to SKILL.md `name` only, with citation and an explicit "do not reuse for plugins.public/private" instruction
- `src/init.js` - `resolveGitOwnerName`'s `execFileSync` call gains an explicit `stdio: ['ignore', 'pipe', 'ignore']` option
- `test/init.test.js` - adversarial-names `describe` block restructured to nest `tempDir` under `scratchDir` and assert the parent directory's contents

## Decisions Made

- DEBT-01 fix stayed strictly documentation/comment-only — no RESERVED import or check added to src/config.js or src/init.js, per the plan's explicit anti-pattern warning and 13-RESEARCH.md Pitfall 1 (over-strictness would reject spec-conformant names like `claude-notes-sync`)
- DEBT-05's automated verify script (`grep -c 'process\.exit(' bin/motto.js` = 0) does not hold literally — it returns 4 because the pattern also matches comment text. Rather than treat this as a "real finding requiring re-scoping" per the plan's stop-condition, I read every matched line and confirmed all 4 are inside comments describing the never-`process.exit()` convention (`/** ... never process.exit() ... */` at lines 26/130, and `process.exitCode = 1; // ... process.exit(1) NOT used` at lines 248/274). A supplementary `grep -n 'exit'` scan confirms every one of the 8 actual exit-code assignments in the file uses `process.exitCode`. This is the plan's anticipated already-resolved state (Phase 11, commit `d35aba7`), not a new defect — no code change made.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Verification methodology] DEBT-05's literal verify command reports a false positive due to comment-text matches**
- **Found during:** Task 4 (DEBT-05 verify-and-close)
- **Issue:** The plan's automated verify `test "$(grep -c 'process\.exit(' bin/motto.js)" = 0` returns `4`, not `0`, because `grep -c` counts substring matches on any line including comments. bin/motto.js's docblock and inline comments deliberately mention `process.exit()`/`process.exit(1)` as the pattern that is NOT used (house-style documentation of the fix from Phase 11).
- **Fix:** No code fix needed or applied. Manually confirmed via `grep -n 'process\.exit('` (all 4 matches on comment lines 26, 130, 248, 274) and `grep -n 'exit'` (all 8 actual exit-code assignments use `process.exitCode`) that zero executable `process.exit()` call sites exist. Documented the discrepancy explicitly in this SUMMARY as the DEBT-05 closure evidence, per the plan's own instruction to "record the exact output... as the DEBT-05 closure evidence."
- **Files modified:** None (bin/motto.js untouched, as required by the plan's acceptance criteria).
- **Verification:** `git diff --name-only` for this plan does not list bin/motto.js; commit `d35aba7` ("fix(11): WR-04 drop forced process.exit in parseArgs catch to avoid stderr truncation") confirmed present in `git log`.
- **Committed in:** N/A (no commit for this task; verification-only per plan).

---

**Total deviations:** 1 auto-fixed (1 verification-methodology clarification; no code changed)
**Impact on plan:** No scope creep. The underlying DEBT-05 finding (zero process.exit() call sites) matches the plan's stated premise exactly; only the literal grep command in the plan's `<verify>` block needed human interpretation to separate comment matches from code matches.

## Issues Encountered

None beyond the DEBT-05 grep-methodology note above (see Deviations).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DEBT-01, DEBT-02, DEBT-03, DEBT-05 are closed; full suite remains green at 131/131 tests, `motto lint` runs clean against the repo's own skills
- `src/config.js` was not touched — no reserved-word check exists for plugins.public/private, consistent with Claude Code's actual plugin.json spec
- Plan 13-02 (DEBT-04, remaining phase-13 items) can proceed independently — no shared file conflicts with this plan's edits (README.md, src/schema.js, src/init.js, test/init.test.js)

---
*Phase: 13-address-tech-debt-plugins-public-reserved-word-enforcement-i*
*Completed: 2026-07-02*

## Self-Check: PASSED

All modified files present on disk (README.md, src/schema.js, src/init.js, test/init.test.js, this SUMMARY.md). All 3 task commits verified in `git log` (3ce5e91, ce508f0, 1fd74a1).
