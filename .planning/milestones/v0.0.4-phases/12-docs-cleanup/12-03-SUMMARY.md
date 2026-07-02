---
phase: 12-docs-cleanup
plan: 03
subsystem: docs
tags: [readme, documentation-accuracy, marketplace, init]

# Dependency graph
requires:
  - phase: 12-docs-cleanup (plans 01-02)
    provides: README ship-your-plugin section, motto-init-based scaffold section, setup-project deletion
provides:
  - README.md's clean-lint example matches live `motto lint` output (2 skills)
  - README.md's `/plugin install` one-liner uses the correct `<marketplace>` placeholder (both occurrences) with an explanatory prerequisite note
  - README.md's `--force` bullet discloses that the five scaffold paths are overwritten if they already exist
affects: [docs-cleanup verification, README accuracy]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "Used code review WR-02's exact replacement text for the install one-liner and prerequisite note verbatim"
  - "Used code review WR-04's exact replacement text for the --force bullet verbatim"
  - "Left WR-01 (line 83, plugins.public reserved-word claim) and WR-03 (line 173, /motto:release) untouched — both explicitly deferred as out-of-Phase-12 scope by 12-VERIFICATION.md"

requirements-completed: [DOC-04, DOC-05]

coverage:
  - id: D1
    description: "README.md's Validate-and-build clean-lint example shows the current skill count (2), matching live `node bin/motto.js lint` output"
    requirement: "DOC-05"
    verification:
      - kind: unit
        ref: "grep -q '✓ 2 skills OK' README.md && ! grep -q '3 skills OK' README.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "README.md's ship-your-plugin install one-liner uses the `<marketplace>` placeholder in both occurrences (lines 164, 226), with the prerequisite note explaining that placeholder is marketplace.json's `name` field (== project name), not the repo name"
    requirement: "DOC-04"
    verification:
      - kind: unit
        ref: "grep -c '@<marketplace>' README.md == 2 && ! grep -q '@<repo>' README.md && grep -q \"name. field of the scaffolded\" README.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "README.md's `--force` description discloses that the five scaffold paths are overwritten if they already exist"
    requirement: "DOC-05"
    verification:
      - kind: unit
        ref: "grep -q 'are \\*\\*overwritten\\*\\* if they already exist' README.md && ! grep -q 'only skips the empty-directory check' README.md"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-02
status: complete
---

# Phase 12 Plan 03: README Accuracy Gap Closure Summary

**Closed the three README.md accuracy gaps flagged by 12-VERIFICATION.md (stale skill count, wrong marketplace-install placeholder, misleading `--force` overwrite claim) with copy-only edits — no source or test changes.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-02T10:41:00Z (approx)
- **Completed:** 2026-07-02T10:45:40Z
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments
- README.md:129 clean-lint example now reads `✓ 2 skills OK`, matching live `node bin/motto.js lint` output post-setup-project-deletion (closes gap #1 / T-12-02 materialized instance).
- Both `/plugin install <plugin>@<repo>` occurrences (README.md:164, :226) corrected to `/plugin install <plugin>@<marketplace>`, and the prerequisite blockquote at line 167 now explains `<marketplace>` is the scaffolded `.claude-plugin/marketplace.json`'s `name` field (== project name, set by `motto init`), not the GitHub repo name (closes gap #2 / WR-02 / DOC-04).
- README.md:89 `--force` bullet reworded to disclose that the five scaffold paths (`motto.yaml`, `.gitignore`, `skills/hello-world/SKILL.md`, `shared/references/.gitkeep`, `.claude-plugin/marketplace.json`) are overwritten if they already exist, replacing the misleading "only skips the empty-directory check" framing (closes gap #3 / WR-04 / DOC-05).

## Task Commits

Each task was committed atomically:

1. **Task 1: Correct three README accuracy defects (skill count, install placeholder, --force disclosure)** - `b078c8f` (docs)

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `README.md` - Three line-level accuracy corrections: clean-lint skill count (line 129), `/plugin install` marketplace placeholder in both occurrences plus prerequisite note (lines 164, 167, 226), `--force` overwrite disclosure (line 89)

## Decisions Made
- Used code review WR-02 and WR-04's exact replacement text verbatim rather than paraphrasing, since the review had already confirmed both against the source (`src/init.js`).
- Left WR-01 (line 83, `plugins.public` reserved-word claim) and WR-03 (line 173, `/motto:release`) byte-for-byte unchanged — 12-VERIFICATION.md explicitly ruled both out of Phase 12 scope as pre-existing defects unrelated to DOC-04/DOC-05.

## Deviations from Plan

None - plan executed exactly as written. All three edits match the plan's specified replacement text exactly; `git diff README.md` confirms only the four intended lines changed (129, 164, 167, 226) with no collateral reflow.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All three accuracy gaps from 12-VERIFICATION.md are closed. `node --test` remains green (131/131 pass, 0 fail). DOC-04 and DOC-05 accuracy caveats from verification are resolved — a follow-up `/gsd-verify-work` or re-run of 12-VERIFICATION.md's gap checks should now find `status: complete` with zero gaps.

---
*Phase: 12-docs-cleanup*
*Completed: 2026-07-02*

## Self-Check: PASSED
- FOUND: README.md
- FOUND: b078c8f (commit)
- FOUND: .planning/phases/12-docs-cleanup/12-03-SUMMARY.md
