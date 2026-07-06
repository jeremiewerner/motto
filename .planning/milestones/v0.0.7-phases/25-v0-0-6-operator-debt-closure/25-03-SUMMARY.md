---
phase: 25-v0-0-6-operator-debt-closure
plan: 03
subsystem: docs
tags: [readme, plugin-cache, operator-docs, gap-closure]

# Dependency graph
requires:
  - phase: 25-02
    provides: DEBT-06 marketplace stranger re-walk record (25-REWALK.md), which this plan appends to
provides:
  - README plugin-cache caveat reworded to lead with the working `claude plugin update motto@motto` refresh command
  - A maintainer-attested stale-cache validation of that command, recorded in 25-REWALK.md
affects: [future-README-edits, future-operator-debt-audits]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - README.md
    - .planning/phases/25-v0-0-6-operator-debt-closure/25-REWALK.md

key-decisions:
  - "README caveat's primary refresh instruction is claude plugin update motto@motto (re-pulls installed content), not the marketplace-add command (only refreshes an unpinned npm manifest that is byte-identical across releases)"
  - "Uninstall+reinstall retained as documented fallback; restart-required nuance stated"
  - "Stale-cache validation recorded via maintainer attestation (no agent-reachable CLI surface for Claude Code's local plugin cache), matching the attestation pattern already used in 25-02 and 25-TOKEN-LOCKDOWN.md"

patterns-established:
  - "Gap-closure plans append a new dated section to an existing evidence-record file (25-REWALK.md) rather than rewriting prior content"

requirements-completed: [DEBT-06]

coverage:
  - id: D1
    description: "README plugin-cache caveat reworded to lead with claude plugin update motto@motto, keep uninstall+reinstall fallback, state restart-required, and drop marketplace-add-as-refresh framing"
    requirement: "DEBT-06"
    verification:
      - kind: other
        ref: "grep -c 'plugin cache' README.md; grep -c 'claude plugin update motto@motto' README.md; awk NR==241 marketplace-add absence check"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reworded refresh guidance validated against a real stale-cache scenario (not a clean install) and the observation recorded in 25-REWALK.md, closing 25-REVIEW.md IN-01"
    requirement: "DEBT-06"
    verification: []
    human_judgment: true
    rationale: "No agent-reachable CLI surface exists for Claude Code's local plugin cache from this session; the stale-cache reproduction, command execution, and refresh confirmation could only be performed and attested by the maintainer in a live Claude Code session."

# Metrics
duration: 6min
completed: 2026-07-06
status: complete
---

# Phase 25 Plan 03: README Plugin-Cache Refresh Rewording + Stale-Cache Validation Summary

**Reworded the README plugin-cache caveat to lead with the working `claude plugin update motto@motto` command and validated it against a real stale-cache scenario, closing the last open DEBT-06 gap (25-REVIEW.md WR-01/IN-01).**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-06
- **Completed:** 2026-07-06
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- README.md's plugin-cache caveat now leads with `claude plugin update motto@motto` (the command that actually re-pulls installed plugin content), keeps uninstall+reinstall as a documented fallback, and states the restart-required nuance — the marketplace-add command is no longer presented as a refresh mechanism.
- The reworded guidance was exercised against a real stale-cache scenario: the maintainer reproduced an installed `motto@motto` plugin lagging npm `latest` (0.0.6), ran the documented primary command plus restart, and confirmed the installed content refreshed — the fallback was not needed.
- 25-REWALK.md now carries a "Stale-Cache Validation" addendum recording that observation, converting the caveat's substance from unverified (grep-pass-only) to maintainer-confirmed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reword the README plugin-cache caveat to lead with the working refresh command** - `43fb37a` (docs)
2. **Task 2: Validate the reworded refresh guidance against a real stale-cache scenario and record it** - `76c3df6` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `README.md` - Plugin-cache caveat blockquote reworded: leads with `claude plugin update motto@motto`, keeps uninstall+reinstall fallback, notes restart-required, drops marketplace-add-as-refresh framing.
- `.planning/phases/25-v0-0-6-operator-debt-closure/25-REWALK.md` - Appended "Stale-Cache Validation" section recording the maintainer-attested stale-cache reproduction, command run, outcome, and date.

## Decisions Made
- The primary refresh command must be the installed-plugin update command (`claude plugin update motto@motto`), not marketplace-add, because the marketplace source is an unpinned npm package whose manifest is byte-identical across releases and cannot re-pull installed content (25-REVIEW.md WR-01).
- The stale-cache validation is recorded as a maintainer attestation rather than agent-observed output, since there is no CLI/API surface reachable from this session for Claude Code's local plugin cache — this mirrors the attestation pattern already established in 25-02-SUMMARY.md and 25-TOKEN-LOCKDOWN.md.

## Deviations from Plan

None - plan executed exactly as written. Task 1's verification gates all passed (grep gates for `plugin cache` and `claude plugin update motto@motto`, no marketplace-add refresh framing at line 241, restart+reinstall present). Task 2's checkpoint was approved by the maintainer with the exact attested outcome ("Ran it — plugin update worked") and recorded verbatim, without embellishment beyond what was attested.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DEBT-06 is now fully closed: both the rewording (WR-01) and the substance validation (IN-01) gaps from 25-REVIEW.md are resolved.
- DEBT-07 and DEBT-08 remain untouched (already SATISFIED per Phase 25 Plan 01) — no `src/` changes were made in this plan.
- Phase 25 has no further open gaps from 25-VERIFICATION.md; the phase is ready to be re-closed.

---
*Phase: 25-v0-0-6-operator-debt-closure*
*Completed: 2026-07-06*

## Self-Check: PASSED

- FOUND: `.planning/phases/25-v0-0-6-operator-debt-closure/25-03-SUMMARY.md`
- FOUND commit: `43fb37a` (Task 1)
- FOUND commit: `76c3df6` (Task 2)
