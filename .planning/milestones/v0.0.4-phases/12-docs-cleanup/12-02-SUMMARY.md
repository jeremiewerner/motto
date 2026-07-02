---
phase: 12-docs-cleanup
plan: 02
subsystem: docs
tags: [dogfood-tests, skill-deletion, salvage-check]

# Dependency graph
requires:
  - phase: 12-docs-cleanup
    provides: "Plan 01's README.md rewrite (motto-init scaffold section, Ship-your-plugin section) — the destination the salvage-check verifies covers setup-project's content"
provides:
  - "skills/setup-project/ removed from the repo (DOC-05)"
  - "test/dogfood.test.js count assertions truthful at 2 skills (lint count, build skillCount)"
  - "Recorded salvage-check disposition proving no setup-project content was lost silently (D-10)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Salvage-check-before-delete: diff each section of a retiring doc against its replacement and record an explicit disposition (covered / superseded / dropped-with-rationale) before deletion"

key-files:
  created: []
  modified:
    - test/dogfood.test.js

key-decisions:
  - "Task 1 salvage-check found README.md (from Plan 01) already covers all 6 setup-project SKILL.md sections — no README edit was needed in this plan"
  - "Deletion + test-count sync landed as a single amended commit after an initial staging mistake split them across two states — amended before any other work touched the branch, per the plan's hard SC3/D-09 atomic-commit constraint"

patterns-established: []

requirements-completed: [DOC-05]

coverage:
  - id: D1
    description: "Salvage-check: all 6 sections of skills/setup-project/SKILL.md have a recorded disposition against the rewritten README.md, with no silent content loss"
    requirement: "DOC-05"
    verification:
      - kind: other
        ref: "grep -q 'hello-world' README.md && grep -q '^## Ship your plugin' README.md && grep -q 'Validate and build' README.md && grep -q 'Field' README.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "skills/setup-project/ deleted from the repository"
    requirement: "DOC-05"
    verification:
      - kind: other
        ref: "test ! -d skills/setup-project"
        status: pass
    human_judgment: false
  - id: D3
    description: "test/dogfood.test.js asserts lint count=2 and build skillCount=2, with the two setup-project artifact it-blocks removed"
    requirement: "DOC-05"
    verification:
      - kind: unit
        ref: "test/dogfood.test.js — dogfood lint (DOG-03) / dogfood build (DOG-03) describe blocks"
        status: pass
    human_judgment: false
  - id: D4
    description: "Deletion and test-count sync land in one atomic commit; full node --test and motto lint pass so main never goes red"
    requirement: "DOC-05"
    verification:
      - kind: other
        ref: "git log --stat -1 (commit b437c84 — 2 files changed: skills/setup-project/SKILL.md deleted, test/dogfood.test.js modified); node --test (131/131 pass); motto lint (2 skills OK)"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-02
status: complete
---

# Phase 12 Plan 02: Salvage-Check + Delete setup-project Summary

**Deleted `skills/setup-project/` and synced `test/dogfood.test.js` counts (3→2) in one atomic commit, after confirming Plan 01's README rewrite already covers every section of the retiring skill.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-07-02T10:18:11Z
- **Tasks:** 2
- **Files modified:** 1 (test/dogfood.test.js) + 1 deletion (skills/setup-project/SKILL.md)

## Accomplishments
- Salvage-checked all 6 sections of `skills/setup-project/SKILL.md` against the rewritten `README.md` (Plan 01) — every section already covered, no README edit needed (see Decisions Made / salvage table below)
- Deleted `skills/setup-project/` (`git rm -r`)
- Synced `test/dogfood.test.js`: lint `count` assertion 3→2 (with message text), build `skillCount` assertion 3→2, removed the two setup-project artifact `it` blocks (`dist/public/setup-project/SKILL.md exists`, `setup-project has references/skill-schema.md bundled`)
- Verified `motto lint` reports "2 skills OK", full `node --test` suite is green (131/131), and both changes landed in a single commit

## Task Commits

Each task was committed atomically:

1. **Task 1: Salvage-check setup-project SKILL.md against the rewritten README** - no commit (no README changes were required; see Salvage-Check Findings below)
2. **Task 2: Delete skills/setup-project/ and sync test/dogfood.test.js in one atomic commit** - `b437c84` (feat)

## Salvage-Check Findings (D-10)

Every section of `skills/setup-project/SKILL.md` (133 lines) was diffed against the current `README.md` (post-Plan-01):

| SKILL.md section | Disposition | Evidence |
|---|---|---|
| Directory Layout | Covered — README `## Scaffold a project` shows the actual `motto init` output (`skills/hello-world/`, `.gitignore`, `.claude-plugin/marketplace.json`), which supersedes the SKILL.md's generic `my-skill/`/`another-skill/` example | `grep -q 'hello-world' README.md` |
| `motto.yaml` Fields table | Covered — README's existing field table (Required/Rule columns) | `grep -q 'Field' README.md` |
| Running Lint | Covered — README `## Validate and build` documents `motto lint [path]` and clean-output example | `grep -q 'Validate and build' README.md` |
| Running Build | Covered — README `## Validate and build` documents `motto build [path]` and the lint-gate behavior | same section |
| What `dist/` Contains | Covered — README `## Validate and build` shows the `dist/` tree with `plugin.json` | same section |
| Installing the Built Plugin in Claude Code (`claude plugin add`) | Superseded by README's new `## Ship your plugin` section, which documents the `/plugin marketplace add` + `/plugin install` flow instead of the older direct `claude plugin add` path — this is the correct, already-established pattern elsewhere in README (`## Add the marketplace to Claude Code`) | `grep -q '^## Ship your plugin' README.md` |

**Conclusion:** No content gap found. No README edit was required for Task 1 — Plan 01's rewrite had already fully absorbed setup-project's content. Task 1's `<verify>` grep checks were confirmed to pass against the pre-existing README.md before any Task 1 work began.

## Files Created/Modified
- `test/dogfood.test.js` - lint count assertion (3→2, incl. message), build skillCount assertion (3→2), removed 2 setup-project artifact `it` blocks
- `skills/setup-project/SKILL.md` - deleted (directory removed)

## Decisions Made
- Task 1 required no README edit — the salvage-check confirmed Plan 01 already covered all 6 sections; recording the disposition table (above) satisfies D-10 without touching README.md, since the plan permits (but does not require) a fold-in edit only "for any section NOT already covered."
- Fixed an operational mistake during Task 2: the first `git add` invocation listed both the deleted file and `test/dogfood.test.js`, but `git add` failed on the already-deleted `skills/setup-project/SKILL.md` pathspec and silently left `test/dogfood.test.js` unstaged. The resulting first commit contained only the deletion — a red intermediate state (stale test still expected count=3 and a now-deleted `dist/public/setup-project/` path), which directly violates the plan's hard SC3/D-09 constraint. Caught immediately via `git show --stat HEAD` before any other work touched the branch; fixed by staging the missing file and running `git commit --amend --no-edit` (re-verifying the full suite green first). The final commit `b437c84` contains both files together, satisfying atomicity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Amended split commit to restore SC3/D-09 atomicity**
- **Found during:** Task 2 (post-commit verification)
- **Issue:** Initial `git add` + commit only staged the deletion of `skills/setup-project/SKILL.md`; `test/dogfood.test.js` edits were left unstaged, producing a commit that would fail the full test suite if checked out standalone (stale count=3 assertions, missing dist path assertions against a now-deleted skill) — a direct violation of the plan's explicit "ONE commit, no red intermediate" requirement (ROADMAP SC3, D-09, threat T-12-03).
- **Fix:** Staged `test/dogfood.test.js`, re-ran the full `node --test` suite to confirm green, then `git commit --amend --no-edit` to fold both changes into the single existing commit (not yet referenced elsewhere on the branch).
- **Files modified:** test/dogfood.test.js (staged into the amended commit)
- **Verification:** `git log --stat -1` on the amended commit `b437c84` shows both `skills/setup-project/SKILL.md` (deleted) and `test/dogfood.test.js` (modified); `node --test` and `motto lint` re-run green post-amend.
- **Committed in:** b437c84 (amended)

---

**Total deviations:** 1 auto-fixed (1 bug — self-caught staging mistake, corrected before proceeding)
**Impact on plan:** No scope creep; the fix restores exact compliance with the plan's explicit atomic-commit requirement.

## Issues Encountered
None beyond the self-corrected staging mistake documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DOC-05 is now fully satisfied: `skills/setup-project/` is gone, `test/dogfood.test.js` truthfully asserts 2 skills, and `motto lint` reports "2 skills OK".
- Full test suite (131/131) passes; `shared/references/skill-schema.md` remains bundled into `author-skill` (verified by the surviving dogfood assertion), and the `author-skill`/`release`/plugin.json assertions were untouched.
- Phase 12 (docs-cleanup) is complete — both plans (12-01, 12-02) executed.

---
*Phase: 12-docs-cleanup*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: test/dogfood.test.js
- FOUND: skills/setup-project deleted
- FOUND: .planning/phases/12-docs-cleanup/12-02-SUMMARY.md
- FOUND: b437c84 (Task 2 commit)
