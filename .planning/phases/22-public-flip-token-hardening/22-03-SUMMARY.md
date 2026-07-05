---
phase: 22-public-flip-token-hardening
plan: 03
subsystem: infra
tags: [github-branch-protection, ci-gate, npm, oidc, trusted-publisher]

# Dependency graph
requires:
  - phase: 22-public-flip-token-hardening
    provides: "Plan 22-02's id-token:write / npm publish --provenance OIDC publish job (ci.yml); GitHub repo-admin access confirmed for jeremiewerner/motto (D-12)"
provides:
  - "Live GitHub branch protection rule on jeremiewerner/motto:main gating merges on the 5 real CI status checks, enforce_admins: false"
  - "Maintainer-attested npmjs.com Trusted Publisher record for @jeremiewerner/motto (org jeremiewerner, repo motto, workflow ci.yml, no environment, allowed action npm publish)"
affects: [22-04-pre-public-gate-and-flip, ship-tag-v0.0.6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Required-status-check context strings pulled live from a real CI run's job names immediately before applying branch protection, never guessed or copied from a template (T-22-05 mitigation)"

key-files:
  created:
    - .planning/phases/22-public-flip-token-hardening/22-03-SUMMARY.md
  modified: []

key-decisions:
  - "enforce_admins pinned false to deliberately preserve the release skill's existing solo-maintainer git push --follow-tags direct-to-main flow (Pitfall 1)"
  - "npm-drift deliberately excluded from the required-checks list — its job-level if: github.ref == 'refs/heads/main' means it never reports on a PR-triggered run, which would leave a required check permanently pending"
  - "No npm credential/token value recorded anywhere in this plan or SUMMARY — only the maintainer's field-match attestation"

requirements-completed: [OPEN-03, PUB-05]

coverage:
  - id: D1
    description: "GitHub branch protection on main requires the 5 real CI status checks to pass, with enforce_admins: false"
    requirement: "OPEN-03"
    verification:
      - kind: other
        ref: "gh api repos/jeremiewerner/motto/branches/main/protection --jq '{enforce_admins: .enforce_admins.enabled, checks: [.required_status_checks.checks[].context]}' -> {\"checks\":[\"test (20)\",\"test (22)\",\"test (24)\",\"dogfood\",\"pack-install-e2e\"],\"enforce_admins\":false}"
        status: pass
    human_judgment: false
  - id: D2
    description: "npmjs.com Trusted Publisher record exists for @jeremiewerner/motto matching org=jeremiewerner, repo=motto, workflow=ci.yml, no environment, allowed action=npm publish"
    requirement: "PUB-05"
    verification: []
    human_judgment: true
    rationale: "npmjs.com's Trusted Publisher configuration has no CLI/API surface — only the maintainer can confirm the Settings page shows the record with the exact fields via the web UI. The live OIDC publish exchange itself is deferred to the v0.0.6 ship tag per D-13."

# Metrics
duration: 20min
completed: 2026-07-05
status: complete
---

# Phase 22 Plan 03: Branch Protection & Trusted Publisher Configuration Summary

**Live `main` branch protection requiring the 5 real CI checks (enforce_admins: false) plus a maintainer-attested npmjs.com Trusted Publisher record for @jeremiewerner/motto matching ci.yml exactly**

## Performance

- **Duration:** ~20 min (across a blocking-human checkpoint)
- **Started:** 2026-07-05T08:09:53Z
- **Completed:** 2026-07-05T08:30:00Z
- **Tasks:** 2
- **Files modified:** 0 (repo/registry-level configuration only, `files_modified: []` per plan)

## Accomplishments
- GitHub branch protection applied to `jeremiewerner/motto:main` via `gh api ... --method PUT`: `required_status_checks.strict: true`, required checks exactly `test (20)`, `test (22)`, `test (24)`, `dogfood`, `pack-install-e2e` (confirmed live against the branch's actual check-run names before applying), `enforce_admins: false`, `required_pull_request_reviews: null`, `restrictions: null`. `npm-drift` deliberately excluded.
- Re-verified live post-apply: `gh api repos/jeremiewerner/motto/branches/main/protection --jq '{enforce_admins: .enforce_admins.enabled, checks: [.required_status_checks.checks[].context]}'` returned `{"checks":["test (20)","test (22)","test (24)","dogfood","pack-install-e2e"],"enforce_admins":false}` — matches the plan's acceptance criteria exactly (HTTP 200, `enforce_admins.enabled: false`, checks array exact match, `npm-drift` absent).
- Maintainer confirmed the npmjs.com Trusted Publisher record for `@jeremiewerner/motto` now exists via the Settings page, with exactly: Organization/user = `jeremiewerner`, Repository = `motto`, Workflow filename = `ci.yml`, Environment name = blank, Allowed actions = `npm publish`. Attestation recorded here per the plan's `acceptance_criteria` — no credential or token value is recorded anywhere in this plan or SUMMARY.

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure GitHub branch protection on `main`** - No repo-file commit (plan declares `files_modified: []`; this is a pure GitHub API/repo-settings change with no tracked-file diff to commit).
2. **Task 2: Maintainer configures the npm Trusted Publisher** - Blocking-human checkpoint; maintainer performed the npmjs.com web-UI configuration (no CLI/API surface exists) and returned "approved". No repo-file commit (npmjs.com registry-side configuration, not a repo change).

**Plan metadata:** commit created via `docs({phase}-{plan}): complete` at final-commit step (see below).

_No TDD tasks in this plan; both tasks are configuration/checkpoint actions with no source-file diff._

## Files Created/Modified
- `.planning/phases/22-public-flip-token-hardening/22-03-SUMMARY.md` - this summary (only file this plan writes to the repo, per `files_modified: []`)

## Decisions Made
- `enforce_admins: false` pinned deliberately — preserves the already-shipped `release` skill's direct `git push --follow-tags` flow to `main` for the solo maintainer (Pitfall 1, T-22-05 mitigation)
- `npm-drift` excluded from the required-status-checks list — its job-level `if: github.ref == 'refs/heads/main'` guard means it never reports on a PR-triggered run, which would otherwise leave a required check permanently pending on every PR
- Required-check context strings reconfirmed live via `gh api` against the actual branch protection state (not re-guessed from the plan text) before treating Task 1 as complete for this continuation
- Live OIDC publish exchange itself remains out of scope for this plan — deferred to the v0.0.6 ship tag per D-13, consistent with plan 22-02's summary

## Deviations from Plan

None - plan executed exactly as written. Task 1 had been applied in a prior session; this continuation re-verified it live (per the plan's own acceptance criteria) rather than re-applying, since branch protection is idempotent-but-unnecessary to redo, and re-running the destructive PUT was avoided in favor of a read-only GET/jq re-check.

## Issues Encountered
None.

## User Setup Required

None remaining for this plan — the one external service configuration this plan required (npmjs.com Trusted Publisher) is now complete per the maintainer's checkpoint approval. No npm auth token or credential value was requested, generated, or recorded at any point (Task 2 acceptance criteria).

## Next Phase Readiness
- `main` is now protected with the real 5-check CI gate without breaking the solo-maintainer release flow (OPEN-03/D-12 closed)
- The npmjs.com Trusted Publisher record exists and matches `ci.yml`'s publish job identity exactly (PUB-05 static half, D-13 closed for this plan's scope)
- Live proof of the first OIDC-authenticated `npm publish --provenance` exchange is deferred to the v0.0.6 ship tag, as planned — nothing further is needed from this plan to reach that point
- Plan 22-04 (pre-public gate + flip) can proceed

---
*Phase: 22-public-flip-token-hardening*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: .planning/phases/22-public-flip-token-hardening/22-03-SUMMARY.md
- FOUND (live re-verify): gh api repos/jeremiewerner/motto/branches/main/protection matches acceptance criteria exactly
- ATTESTED: npmjs.com Trusted Publisher record per maintainer checkpoint approval (not independently verifiable by this agent — no CLI/API surface exists, per plan design)
