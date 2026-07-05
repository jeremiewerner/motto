---
phase: 22-public-flip-token-hardening
plan: 02
subsystem: infra
tags: [github-actions, ci, npm, oidc, trusted-publishing, provenance]

# Dependency graph
requires:
  - phase: 21-publish-automation-release-rewrite
    provides: publish job with version_guard/npm_guard/gh_guard, NPM_TOKEN-based auth (interim), node-version 24 pinned ahead of OIDC
provides:
  - Publish job npm authentication migrated from NPM_TOKEN/NODE_AUTH_TOKEN to OIDC trusted publishing (id-token: write)
  - npm publish --provenance flag
  - Structural regression test for the OIDC contract (permissions, flag, token-free env)
  - Ship-time-only zero-tokens follow-through runbook in skills/release/SKILL.md (Step 9)
affects: [22-03-pre-public-gate-and-flip, ship-tag-v0.0.6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GitHub Actions OIDC trusted publishing: id-token: write permission + no stored secret, npm resolves auth via the workflow's OIDC claims"

key-files:
  created: []
  modified:
    - .github/workflows/ci.yml
    - test/ci-workflow.test.js
    - skills/release/SKILL.md

key-decisions:
  - "publish job's permissions block carries both contents: write and id-token: write together (neither replaces the other)"
  - "npm publish step's env block removed entirely rather than left empty — OIDC needs no env var"
  - "OIDC structural test scoped to the npm publish step's own env object (JSON.stringify + regex), not a whole-file grep, per plan's precision requirement"
  - "Zero-tokens follow-through (token revocation, npm-side lockdown, provenance verification) documented as a distinct one-time Step 9, explicitly not a per-release step"

requirements-completed: [PUB-05]

coverage:
  - id: D1
    description: "Publish job authenticates to npm via OIDC (id-token: write) instead of NPM_TOKEN/NODE_AUTH_TOKEN"
    requirement: "PUB-05"
    verification:
      - kind: unit
        ref: "test/ci-workflow.test.js#ci.yml publish job OIDC contract (PUB-05) - jobs.publish.permissions['id-token'] equals 'write'"
        status: pass
      - kind: unit
        ref: "test/ci-workflow.test.js#ci.yml publish job OIDC contract (PUB-05) - the 'npm publish' step's own env does not reference NPM_TOKEN/NODE_AUTH_TOKEN"
        status: pass
    human_judgment: false
  - id: D2
    description: "npm publish step passes --provenance"
    requirement: "PUB-05"
    verification:
      - kind: unit
        ref: "test/ci-workflow.test.js#ci.yml publish job OIDC contract (PUB-05) - the 'npm publish' step's run field matches /--provenance/"
        status: pass
    human_judgment: false
  - id: D3
    description: "Existing publish-job structure (version_guard/npm_guard/gh_guard, contents: write) unchanged by the OIDC migration"
    verification:
      - kind: unit
        ref: "test/ci-workflow.test.js#ci.yml publish job structural contract (CR-01 / Truth #6) - all 3 existing cases"
        status: pass
      - kind: unit
        ref: "test/ci-workflow.test.js#ci.yml publish job OIDC contract (PUB-05) - jobs.publish.permissions.contents still equals 'write' (regression guard)"
        status: pass
    human_judgment: false
  - id: D4
    description: "release/SKILL.md documents the ship-time-only zero-tokens follow-through (token revocation + secret deletion, npm-side trusted-publisher-only lockdown, provenance verification) so D-15/D-16/D-17 are not forgotten"
    verification:
      - kind: other
        ref: "node bin/motto.js lint --quiet (exit 0); git diff --stat skills/release/SKILL.md shows only additions"
        status: pass
    human_judgment: true
    rationale: "Whether the runbook content is complete and accurate enough for the maintainer to actually execute at ship time is a judgment call about documentation quality, not something a lint pass can verify."

# Metrics
duration: 15min
completed: 2026-07-05
status: complete
---

# Phase 22 Plan 02: OIDC Trusted Publishing Migration Summary

**Publish job's npm auth flipped from a stored NPM_TOKEN secret to OIDC trusted publishing with --provenance, guarded by a new 4-case structural test and a ship-time-only token-retirement runbook in the release skill**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-05T08:05:21Z
- **Completed:** 2026-07-05T08:07:57Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `.github/workflows/ci.yml` publish job now declares `id-token: write` alongside the existing `contents: write`, and its "npm publish" step runs `npm publish --provenance` with no `env:` block (NODE_AUTH_TOKEN/NPM_TOKEN reference fully removed from the code path)
- `test/ci-workflow.test.js` gained a new `describe('ci.yml publish job OIDC contract (PUB-05)', ...)` block with 4 cases: id-token permission present, contents permission unchanged (regression guard), `--provenance` flag present, and the npm-publish step's own env is token-free
- `skills/release/SKILL.md` gained a new "Step 9 — Zero-Tokens Follow-Through (first OIDC-live release only)" section documenting D-15 (revoke token + delete GitHub secret), D-16 (npm-side trusted-publisher-only lockdown), and D-17 (provenance verification via registry check), plus a troubleshooting note on the `package.json` `repository` shorthand; `<success_criteria>` updated to note this is a one-time step, not per-release

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate the publish job's npm auth from NPM_TOKEN to OIDC trusted publishing** - `5418d55` (feat)
2. **Task 2: Add a structural regression test for the OIDC publish contract** - `03c3cc0` (test)
3. **Task 3: Document the ship-time zero-tokens follow-through in the release skill** - `20037b6` (docs)

_No TDD tasks in this plan; each task is a single commit._

## Files Created/Modified
- `.github/workflows/ci.yml` - publish job: added `id-token: write`, removed the `env:` block with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`, changed `run: npm publish` to `run: npm publish --provenance`
- `test/ci-workflow.test.js` - new `describe('ci.yml publish job OIDC contract (PUB-05)', ...)` block appended after the existing CR-01 block, 4 new `it()` cases
- `skills/release/SKILL.md` - new "Step 9 — Zero-Tokens Follow-Through" subsection after Step 8, plus one added line in `<success_criteria>`

## Decisions Made
- Kept `contents: write` and `id-token: write` together in the publish job's `permissions:` block (neither replaces the other) — matches the plan's explicit `key_links` requirement
- Removed the `env:` key entirely from the "npm publish" step rather than leaving an empty `env: {}` — OIDC needs no environment variable, and the test asserts the step's own env (defaulting to `{}`) has no token reference, which passes cleanly either way
- Added a short neutral comment (`# OIDC trusted publishing — authenticates npm publish below`) on the new `id-token: write` line without naming the retired secret/env-var string, per the plan's explicit constraint
- Documented D-15/D-16/D-17 as a distinct "Step 9" rather than folding into Step 8, since it fires exactly once (first OIDC-live release) rather than on every release — kept it clearly separable from the per-release checklist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. This plan is purely static configuration (workflow YAML + tests + docs); the live OIDC handshake and the npmjs.com Trusted Publisher record itself are out of scope here (deferred to plan 22-03's checkpoint and the v0.0.6 ship tag per D-13, per the plan's own objective statement).

## Next Phase Readiness
- PUB-05's static half (OIDC-only auth path in code, `--provenance`, no token env) is complete and test-guarded
- The `npm-drift` CI check will keep reporting yellow (0.0.3 registry vs. a higher package.json version) until the v0.0.6 ship tag — expected per D-14, not a regression from this plan
- Plan 22-03 (pre-public gate + flip) can proceed; the npmjs.com Trusted Publisher record configuration and the live first-OIDC-publish proof remain ship-time actions, with Step 9's runbook now in place to catch the token-retirement follow-through when that moment arrives

---
*Phase: 22-public-flip-token-hardening*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: .github/workflows/ci.yml
- FOUND: test/ci-workflow.test.js
- FOUND: skills/release/SKILL.md
- FOUND: .planning/phases/22-public-flip-token-hardening/22-02-SUMMARY.md
- FOUND: commit 5418d55
- FOUND: commit 03c3cc0
- FOUND: commit 20037b6
