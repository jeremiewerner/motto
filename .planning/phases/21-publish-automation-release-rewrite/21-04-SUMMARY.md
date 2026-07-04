---
phase: 21-publish-automation-release-rewrite
plan: 04
subsystem: infra
tags: [github-actions, ci, yaml, publish, release, node-test]

# Dependency graph
requires:
  - phase: 21-publish-automation-release-rewrite
    provides: publish job (npm_guard, gh_guard, tag trigger) from plans 21-01/21-02/21-03
provides:
  - version_guard step in ci.yml publish job hard-failing on tag/package.json version mismatch, before npm_guard
  - test/ci-workflow.test.js — ordering-aware structural regression guard
  - release skill runbook updated to describe the new guard and its non-rerun-fixable failure mode
affects: [22-public-flip-token-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ordering-aware structural test: assert step array index (findIndex) rather than substring grep, so a step reorder that reopens a security/correctness gap is caught"

key-files:
  created:
    - test/ci-workflow.test.js
  modified:
    - .github/workflows/ci.yml
    - skills/release/SKILL.md

key-decisions:
  - "version_guard step reads $GITHUB_REF_NAME as the runner-provided default env var, not ${{ github.ref_name }} expression interpolation, to avoid the WR-01 script-injection pattern for this new step"
  - "Structural test asserts array-index ordering (version_guard index < npm_guard index), not mere presence, so silent reordering back into the phantom-release-drift path fails loudly"
  - "Step 7 runbook clause added: a tag/version-mismatch failure is a hard config error, not transient — gh run rerun --failed will fail identically; recovery is a corrected version on a new commit, never re-tagging"

requirements-completed: [PUB-01]

coverage:
  - id: D1
    description: "Publish job hard-fails (exit 1 + ::error:: annotation naming both values) before npm_guard when the pushed tag does not match package.json's version"
    requirement: PUB-01
    verification:
      - kind: unit
        ref: "test/ci-workflow.test.js#version_guard hard-fails on mismatch (exit 1 + ::error::) comparing the tag to package.json version"
        status: pass
    human_judgment: false
  - id: D2
    description: "version_guard step is ordered strictly before npm_guard in jobs.publish.steps, closing the phantom-release drift path (Truth #6 / CR-01)"
    requirement: PUB-01
    verification:
      - kind: unit
        ref: "test/ci-workflow.test.js#version_guard runs before npm_guard (ordering)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Committed node:test structural assertion parses ci.yml and fails if the guard is removed or reordered to run at/after npm_guard"
    requirement: PUB-01
    verification:
      - kind: unit
        ref: "test/ci-workflow.test.js#version_guard step exists in the publish job"
        status: pass
    human_judgment: false
  - id: D4
    description: "Release skill's CI-handoff (Step 5) and failure-recovery (Step 7) runbook accurately describe the new pre-publish tag/version guard and its non-rerun-fixable failure mode"
    requirement: PUB-01
    verification:
      - kind: other
        ref: "node bin/motto.js lint -> '✓ 3 skills OK'"
        status: pass
    human_judgment: true
    rationale: "Prose accuracy of the runbook sentences is a documentation-quality judgment; lint only proves schema conformance, not that the wording correctly describes CI behavior. A human should skim Step 5/Step 7 once before the first real release exercises this path."

duration: 2min
completed: 2026-07-04
status: complete
---

# Phase 21 Plan 04: CR-01 Tag/Version Guard Gap Closure Summary

**Publish job now hard-fails on a tag-vs-package.json version mismatch before either idempotency guard runs, closing the phantom-GitHub-Release drift path, backed by an ordering-aware structural test.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-04T20:00:53Z
- **Completed:** 2026-07-04T20:02:46Z
- **Tasks:** 2 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Added `version_guard` step to `.github/workflows/ci.yml`'s `publish` job, inserted between `npm ci` and `npm_guard`, comparing `v$PKG_VERSION` (from `package.json`) against `$GITHUB_REF_NAME` and hard-failing (`::error::` + `exit 1`) on mismatch — closing the exact green-run/phantom-release drift path documented in 21-REVIEW.md CR-01 and 21-VERIFICATION.md Truth #6.
- Added `test/ci-workflow.test.js`, a committed `node:test` structural regression guard that parses `ci.yml` with `yaml` and asserts (a) the step exists, (b) its array index is strictly less than `npm_guard`'s index (ordering, not mere presence), and (c) its `run` body actually hard-fails on mismatch and avoids `${{ github.ref_name }}` interpolation.
- Updated `skills/release/SKILL.md` Step 5 (CI Handoff) and Step 7 (If CI Publish Fails) with two surgical sentences describing the new guard and clarifying that a mismatch failure is not fixable by `gh run rerun --failed` — the same ref will fail identically; recovery is a corrected version on a new commit, never re-tagging.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the tag/version consistency guard to ci.yml before npm_guard, with a committed ordering-aware structural test (CR-01, PUB-01)** - `d3227f1` (feat)
2. **Task 2: Update the release skill runbook so its failure-mode guidance reflects the new pre-publish tag/version guard (PUB-01, PUB-02 accuracy)** - `6a39b45` (docs)

_No TDD tasks in this plan — both are `type="auto"` structural/docs changes verified by their own automated checks._

## Files Created/Modified
- `.github/workflows/ci.yml` - Inserted `version_guard` step (id `version_guard`, name "Guard — tag must match package.json version") immediately after `npm ci` and before `npm_guard` in the `publish` job.
- `test/ci-workflow.test.js` - New committed structural test suite: 3 `it()` cases (existence, ordering, hard-fail-body-shape) parsing `jobs.publish.steps` via `yaml`.
- `skills/release/SKILL.md` - Step 5 sentence naming the new guard and its rationale; Step 7 clause clarifying the mismatch failure is not rerun-fixable; ordered list in Step 7 renumbered (2→5) to accommodate the inserted clause. No frontmatter or step-heading changes.

## Decisions Made
- `$GITHUB_REF_NAME` (default runner env var) used instead of `${{ github.ref_name }}` expression interpolation for the new step's tag reference — keeps the newly-added step off the WR-01 script-injection pattern, per CR-01's explicit note. The two pre-existing `${{ github.ref_name }}` interpolations in `gh_guard` and `Create GitHub Release` (WR-01) are untouched — out of scope for this plan, which adds exactly one step.
- Structural test written as an ordering assertion (`findIndex` + `<` comparison) rather than a substring `grep`, per the plan's explicit rationale that this project's recurring "tests-green-but-broken" history requires an assertion a reordering could actually break.
- Step 7's ordered list was renumbered (items 2-4 shifted to 3-5) to insert the new mismatch-recovery clause in its logical position (immediately after the never-delete-tag rule, before generic failure diagnosis) — this is a numbering-only edit within Step 7's body, not a restructuring of the eight top-level Steps (Step 1 through Step 8 remain unchanged and unrenumbered), consistent with the plan's "do not restructure the steps... or renumber" constraint (which refers to the eight top-level `## Step N` headings).

## Deviations from Plan

None - plan executed exactly as written. The Step 7 internal list renumbering (2→3, 3→4, 4→5) was a mechanical consequence of inserting the new clause at the position the plan specified ("add one clause... consistent with Step 7.1's never-re-tag rule" — i.e., immediately after item 1) and does not change the plan's meaning; it is noted above for transparency, not tracked as a Rule 1-4 deviation since it was implied by the plan's own instruction to add the clause at that location.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

Truth #6 / CR-01 is closed: the publish job now has a single, cross-checked source of truth (the pushed tag) enforced before either identifier-specific idempotency guard runs. `npm test` is green at 237/237 (234 pre-existing + 3 new). `node bin/motto.js lint` reports `✓ 3 skills OK`. The remaining 21-REVIEW.md findings (WR-01 `github.ref_name` interpolation in the two pre-existing steps, WR-02 hardcoded package name in npm_guard, WR-03 error-swallowing in both guards, WR-04 tarball-build mismatch, WR-05 SKILL.md Step 6 unpinned `npm view`, and the five Info items) were explicitly out of scope for this gap-closure plan (CR-01 only) and remain available for a future phase/plan if prioritized — none are new discoveries from this plan's work, they were already documented in 21-REVIEW.md before this plan started.

The live end-to-end verification deferred in 21-VERIFICATION.md ("first real release exercises a correctly-matched tag through the guard, and a deliberately mismatched tag would fail before npm_guard") still cannot be exercised on this milestone branch (tag-push trigger is scoped to real `v*` tag refs) and remains a ship-time verification item, unchanged by this plan.

---
*Phase: 21-publish-automation-release-rewrite*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: test/ci-workflow.test.js
- FOUND: .planning/phases/21-publish-automation-release-rewrite/21-04-SUMMARY.md
- FOUND commit: d3227f1
- FOUND commit: 6a39b45
- FOUND commit: 934c05d (this summary's own commit, verified post-hoc)
