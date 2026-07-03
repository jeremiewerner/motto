---
phase: 20-ci-workflow
plan: 03
subsystem: infra
tags: [github-actions, ci, gh-cli, node-matrix]

# Dependency graph
requires:
  - phase: 20-ci-workflow (plan 01)
    provides: scripts/prepare.mjs husky guard + scripts/prepare-guard-check.mjs (D-13/D-14/D-15 closure)
  - phase: 20-ci-workflow (plan 02)
    provides: scripts/pack-install-e2e.mjs + scripts/npm-drift-check.mjs
provides:
  - ".github/workflows/ci.yml — single workflow, four parallel jobs (test, dogfood, pack-install-e2e, npm-drift), no needs edges"
  - "A verified live green CI run (all 4 jobs) proving the gate works before the repo goes public"
affects: [21-publish-automation, 22-public-flip-token-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single ci.yml with sibling jobs (zero needs edges) — Phase 21's publish job is the first to add needs: gating"
    - "PR-against-main is a legitimate live-CI-trigger mechanism on a milestone-branch workflow, without merging — closed (not merged) once the run was verified"

key-files:
  created:
    - .github/workflows/ci.yml
  modified: []

key-decisions:
  - "workflow_dispatch added as a convenience trigger (Claude's discretion per 20-CONTEXT.md), but it requires the workflow file to already exist on the default branch — unusable for this milestone-branch flow until main has ci.yml. Used a PR-against-main instead to get a live pull_request-triggered run without merging early."
  - "Opened PR #3 (gsd/v0.0.6-prove-publish -> main) solely to trigger a real pull_request-event CI run; closed (not merged) after confirming green, since this milestone uses a single long-lived branch (branching_strategy: milestone) that merges to main at milestone completion via the standard ship flow, not per-phase."

patterns-established:
  - "CI job naming (test, dogfood, pack-install-e2e, npm-drift) is the fixed contract Phase 21's publish job will reference in needs:"

requirements-completed: [CIW-01, CIW-02]

coverage:
  - id: D1
    description: "ci.yml defines exactly 4 jobs (test/dogfood/pack-install-e2e/npm-drift), zero needs edges, test matrix node-version [20,22,24], concurrency group includes github.ref with cancel-in-progress, top-level permissions contents:read, no pull_request_target or paths/paths-ignore keys"
    requirement: "CIW-01"
    verification:
      - kind: unit
        ref: "node -e YAML structural check (Task 1 <verify>) — printed CI-YAML-OK"
        status: pass
      - kind: integration
        ref: "grep -n 'pull_request_target|paths' .github/workflows/ci.yml — no match"
        status: pass
    human_judgment: false
  - id: D2
    description: "dogfood job runs motto lint --quiet and motto build --quiet against Motto's own skills/ tree on a clean checkout, asserting empty stdout + exit 0"
    requirement: "CIW-02"
    verification:
      - kind: e2e
        ref: "gh run 28684444687, job 'dogfood' (ID 85074347256) — both --quiet steps green"
        status: pass
    human_judgment: false
  - id: D3
    description: "pack-install-e2e and npm-drift jobs live-wire CIW-03/04/05 scripts from plans 20-01/20-02 into real CI jobs and run green"
    requirement: "CIW-01"
    verification:
      - kind: e2e
        ref: "gh run 28684444687 — jobs 'pack-install-e2e' (ID 85074347265) and 'npm-drift' (ID 85074347266), both green; npm-drift log has no ::warning:: line (0.0.3 matches registry today)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-03
status: complete
---

# Phase 20 Plan 03: CI Workflow — ci.yml Summary

**Single `.github/workflows/ci.yml` gating every push/PR to main with four independent parallel jobs (Node 20/22/24 test matrix, --quiet dogfood, pack-install-e2e, npm-drift), proven green on a real GitHub Actions run while the repo is still private.**

## Performance

- **Duration:** ~5 min (task execution only; excludes context-load/read time)
- **Started:** 2026-07-03T21:35:59Z (approx., per STATE.md session marker)
- **Completed:** 2026-07-03T21:39:24Z
- **Tasks:** 2/2 completed
- **Files modified:** 1 (created)

## Accomplishments

- `.github/workflows/ci.yml` created: `name: CI`, triggers on `push`/`pull_request` to `main` plus `workflow_dispatch`, no path filters (D-01/D-03), `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` (D-02), top-level `permissions: { contents: read }`.
- Four sibling jobs with zero `needs:` edges (D-04): `test` (Node 20/22/24 matrix, CIW-01), `dogfood` (Node 20, `--quiet` lint/build assertions against Motto's own `skills/` tree, CIW-02), `pack-install-e2e` (Node 20, runs `scripts/pack-install-e2e.mjs` then `scripts/prepare-guard-check.mjs` as two distinct named steps, CIW-03/05), `npm-drift` (Node 20, `scripts/npm-drift-check.mjs`, CIW-04).
- Structural YAML verification passed (`CI-YAML-OK`): 4 named jobs present, no `needs` key anywhere, matrix `node-version` = `20,22,24`, `concurrency.group` includes `github.ref`. `pull_request_target`/`paths`/`paths-ignore` confirmed absent by grep.
- Live proof: pushed the branch, opened PR #3 (`gsd/v0.0.6-prove-publish` -> `main`) to trigger a real `pull_request`-event CI run (workflow_dispatch was unusable — GitHub requires the workflow file to already exist on the default branch, which it doesn't yet on this milestone-branch flow). Run 28684444687 completed with conclusion `success`: all 3 test-matrix legs (Node 20/22/24), `dogfood`, `pack-install-e2e` (including the `prepare-guard-check` step), and `npm-drift` all green. `npm-drift`'s log contains no `::warning::` line — correct, since `package.json` (0.0.3) matches the npm registry today.
- PR #3 closed without merging (commented with the run link/rationale) — this milestone merges to `main` at milestone completion via the standard ship flow, not per-phase.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author ci.yml — four parallel jobs (CIW-01, CIW-02; wires CIW-03/04/05)** - `f28a634` (feat)
2. **Task 2: Prove the gate live — push and verify a green run** - no file changes (verification-only task; see PR #3 / run 28684444687 for evidence)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `.github/workflows/ci.yml` - single CI workflow: 4 parallel jobs (test, dogfood, pack-install-e2e, npm-drift), no needs edges, least-privilege permissions

## Decisions Made

- `workflow_dispatch` was added per 20-CONTEXT.md's "Claude's Discretion," but discovered live that GitHub rejects `gh workflow run` for a workflow file not yet present on the default branch (`main`) — a real constraint for a milestone-branch flow where phase work lands on a long-lived branch before merge. Worked around by opening a PR targeting `main` instead, which triggers the `pull_request` event using the merge-preview of the PR branch's workflow file, without requiring the file to be on `main` first.
- Closed PR #3 without merging after the run went green: merging to `main` belongs to the milestone's ship step (Phase 21/22 still pending on this branch), not this plan.

## Deviations from Plan

None - plan executed exactly as written. Task 2's action anticipated the "PR targeting main" trigger path explicitly as an alternative to a direct push/merge, and that is the path used.

## Issues Encountered

- `gh workflow run ci.yml` failed with `HTTP 404: workflow ci.yml not found on the default branch` — expected GitHub behavior for `workflow_dispatch` (requires the workflow file on the default branch first), not a bug in the authored YAML. Resolved by using the PR-trigger path already anticipated in the plan's Task 2 action text.

## User Setup Required

None - no external service configuration required. `gh` was already authenticated as `jeremiewerner` with an active token.

## Next Phase Readiness

- CIW-01/02 validated live; CIW-03/04/05 (from plans 20-01/20-02) are now wired into real, green CI jobs — not just unit-verified.
- Job names (`test`, `dogfood`, `pack-install-e2e`, `npm-drift`) are locked as the contract Phase 21's publish job will reference via `needs:`.
- No blockers. Phase 20 (ci-workflow) is complete: all 3 plans (20-01, 20-02, 20-03) done, CIW-01..05 all closed.

---
*Phase: 20-ci-workflow*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: .github/workflows/ci.yml
- FOUND: f28a634 (Task 1 commit)
- FOUND: .planning/phases/20-ci-workflow/20-03-SUMMARY.md
