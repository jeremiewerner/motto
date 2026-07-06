---
phase: 25-v0-0-6-operator-debt-closure
plan: 01
subsystem: infra
tags: [npm, github-actions, oidc, trusted-publisher, security]

# Dependency graph
requires:
  - phase: 22-public-flip-token-hardening
    provides: OIDC-based publish job and the original NPM_TOKEN fallback secret
  - phase: 21
    provides: The Trusted Publisher CI configuration proven live by the 2026-07-05 OIDC publish
provides:
  - Confirmed absence of the GitHub Actions NPM_TOKEN secret (CI-side half of DEBT-07)
  - Maintainer-attested revocation of the granular npm access token on npmjs.com (registry-side half of DEBT-07)
  - Maintainer-attested trusted-publisher-only publishing lock for @jeremiewerner/motto (DEBT-08)
  - Leak-safe, committed evidence record (25-TOKEN-LOCKDOWN.md) with no credential values
affects: [25-02, future release/SKILL.md Step 10 executions]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/25-v0-0-6-operator-debt-closure/25-TOKEN-LOCKDOWN.md
  modified: []

key-decisions:
  - "Task 1 found NPM_TOKEN already absent from GitHub secrets (zero entries returned) — recorded the fact rather than running a needless delete"
  - "Task 2 recording relies on maintainer attestation only (no CLI/API surface exists for npmjs.com token revocation or publishing-access settings) plus an agent-run npm view cross-check as corroborating (not primary) evidence"

patterns-established:
  - "Leak-safe evidence record shape (opening no-token-value statement + per-debt section with command/result/date) reused from 22-SECRETS-SCAN.md for a second debt-closure record"

requirements-completed: [DEBT-07, DEBT-08]

coverage:
  - id: D1
    description: "GitHub Actions NPM_TOKEN secret confirmed absent, recorded in 25-TOKEN-LOCKDOWN.md"
    requirement: "DEBT-07"
    verification:
      - kind: other
        ref: "gh secret list --repo jeremiewerner/motto (zero NPM_TOKEN entries, both plain and --json name forms)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Granular npm access token revoked on npmjs.com and publishing access locked to trusted-publisher-only for @jeremiewerner/motto"
    requirement: "DEBT-08"
    verification:
      - kind: manual_procedural
        ref: "Maintainer attestation: '1. done 2. done' (2026-07-06), both npmjs.com dashboard pages reloaded and confirmed"
        status: pass
    human_judgment: true
    rationale: "npmjs.com token revocation and publishing-access settings have no CLI/API surface — only the dashboard can perform or confirm them; the npm view cross-check corroborates but cannot independently prove the token is revoked or that publishing is locked."
  - id: D3
    description: "Leak-safe committed record (25-TOKEN-LOCKDOWN.md) documents both actions with no token value present"
    verification:
      - kind: other
        ref: "grep -i 'npm_' and manual review of 25-TOKEN-LOCKDOWN.md content — no credential/token value present, only command/result/date metadata"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-06
status: complete
---

# Phase 25 Plan 01: Token Lockdown Summary

**Closed both v0.0.6 Step 10 operator debts — NPM_TOKEN confirmed absent and npm publishing structurally locked to trusted-publisher-only, recorded in a leak-safe evidence file with zero credential values.**

## Performance

- **Duration:** 6 min (across two sessions, spanning a blocking human checkpoint)
- **Started:** 2026-07-06T17:09:56Z
- **Completed:** 2026-07-06
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments
- Confirmed the GitHub Actions `NPM_TOKEN` secret was already absent (`gh secret list` returned zero entries) — no delete action was needed, DEBT-07's CI-side half closed by observation
- Maintainer revoked the granular npm access token on npmjs.com (DEBT-07's registry-side half)
- Maintainer locked `@jeremiewerner/motto` publishing access to trusted-publisher-only, disallowing token-based publishing entirely (DEBT-08)
- Cross-checked via `npm view @jeremiewerner/motto --json`: the live `0.0.6` package carries a SLSA v1 provenance attestation and was published by the `GitHub Actions <npm-oidc-no-reply@github.com>` OIDC identity — corroborating (not replacing) the maintainer's attestation and the 2026-07-05 verification
- Produced `25-TOKEN-LOCKDOWN.md`, a committed, leak-safe evidence record following the `22-SECRETS-SCAN.md` shape, containing zero token/credential values

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete the NPM_TOKEN GitHub secret and confirm absent** - `601ddbd` (docs)
2. **Task 2: Maintainer revokes the npm token and locks publishing to trusted-publisher-only** - `1f16f72` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `.planning/phases/25-v0-0-6-operator-debt-closure/25-TOKEN-LOCKDOWN.md` - Leak-safe evidence record for DEBT-07 (token revocation + secret deletion/absence) and DEBT-08 (trusted-publisher-only lock), with maintainer attestation and an agent-run npm view cross-check; no token values

## Decisions Made
- Task 1 recorded absence rather than running `gh secret delete` since the secret list was already empty — matches the plan's explicit "if already absent, record that fact instead" instruction
- Task 2's record leans entirely on maintainer attestation for the two npmjs.com dashboard actions (no scriptable verification exists for either), supplemented by an `npm view` cross-check as corroborating evidence only, per the plan's Step 10 item 3 guidance

## Deviations from Plan

None - plan executed exactly as written. The blocking human checkpoint (Task 2) was resolved by the maintainer's "1. done 2. done" response confirming both npmjs.com dashboard actions; the resuming agent recorded the attestation and ran the prescribed `npm view` verification exactly as the plan's read_first/action guidance specified.

## Issues Encountered
None.

## User Setup Required
None - the two required dashboard actions (token revocation, publishing-access lock) were the checkpoint itself and are now complete, per maintainer attestation.

## Next Phase Readiness
- Both v0.0.6 Step 10 operator debts (DEBT-07, DEBT-08) are closed; zero-tokens is now a structural guarantee (trusted-publisher-only), not an incidental state
- Any patch release triggered by Plan 25-02 will publish through the now-locked config, live-proving the lock holds (per plan's D-02/D-03 framing)
- No blockers for Plan 25-02 or subsequent phases

---
*Phase: 25-v0-0-6-operator-debt-closure*
*Completed: 2026-07-06*
