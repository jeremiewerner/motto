---
phase: 13-address-tech-debt-plugins-public-reserved-word-enforcement-i
plan: 02
subsystem: docs
tags: [readme, plugin-namespace, release-skill]

# Dependency graph
requires:
  - phase: 13-address-tech-debt-plugins-public-reserved-word-enforcement-i
    provides: 13-01 closed DEBT-01/DEBT-05 in the same phase's tech-debt sweep
provides:
  - README.md release-skill reference corrected to match its actual audience:private routing
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "Checkpoint result: /motto-private:release does not resolve in the maintainer's live Claude Code session (no .claude/skills/ symlink, no motto-private marketplace entry) — took the file-path branch, not the private-namespace branch"

patterns-established: []

requirements-completed: [DEBT-04]

coverage:
  - id: D1
    description: "README.md no longer claims /motto:release resolves; line 173 references the release skill by file path (skills/release/SKILL.md) instead of an unresolvable slash command"
    requirement: "DEBT-04"
    verification:
      - kind: other
        ref: "grep -c '/motto:release' README.md returns 0"
        status: pass
      - kind: unit
        ref: "node --test (131 tests, full suite, docs-only change)"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-07-02
status: complete
---

# Phase 13 Plan 02: Fix release-skill reference in README Summary

**README.md line 173 no longer claims `/motto:release` resolves — it now points to `skills/release/SKILL.md` by file path, per the maintainer's live-session verification that `/motto-private:release` does not resolve either.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-02T13:37:00Z (continuation after checkpoint)
- **Completed:** 2026-07-02T13:42:15Z
- **Tasks:** 1 (plus the checkpoint that gated it)
- **Files modified:** 1

## Accomplishments
- Closed DEBT-04: `/motto:release` (a slash command that never resolves — the release skill is `audience: private`, routed to the `motto-private` bucket) is gone from README.md
- README.md line 173 now reads "The release skill at `skills/release/SKILL.md` carries the full maintainer checklist" — consistent with how the README already references other file paths (e.g. `.claude-plugin/marketplace.json`)
- Verified the correct public-skill references (`/motto:author-skill`, 3 occurrences) are untouched

## Task Commits

Checkpoint (no commit — human-verify gate only): Confirmed `/motto-private:release` does not resolve in the maintainer's session.

1. **Task 1: Correct the release-skill reference on README.md line 173 (DEBT-04)** - `dd8acbc` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `README.md` - Line 173 changed from `The \`release\` skill (\`/motto:release\`) carries the full maintainer checklist.` to `The release skill at \`skills/release/SKILL.md\` carries the full maintainer checklist.`

## Decisions Made
- Checkpoint result was "does not resolve" — the maintainer's live Claude Code session does not recognize `/motto-private:release` (no `.claude/skills/` symlink, no `motto-private` entry in `.claude-plugin/marketplace.json`). Per plan instructions, this selected the file-path branch over the private-namespace branch. README.md now names no slash command for the release skill at all — only the file path.
- Line 182's note ("See the `release` skill for the full tarball-verify step...") was left unchanged — it references the release skill by name, not by slash command, and contains no `/motto:release` string, so the plan's leave-unless-affected instruction applied.

## Deviations from Plan

None - plan executed exactly as written (file-path branch, per checkpoint result).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 13 (Address tech debt: plugins.public reserved-word enforcement + init/CLI review items) is now fully executed — both 13-01 (DEBT-01, DEBT-05) and 13-02 (DEBT-04) are complete.
- No blockers carried forward from this plan.

---
*Phase: 13-address-tech-debt-plugins-public-reserved-word-enforcement-i*
*Completed: 2026-07-02*
