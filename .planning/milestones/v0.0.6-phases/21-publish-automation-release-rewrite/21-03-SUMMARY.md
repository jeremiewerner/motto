---
phase: 21-publish-automation-release-rewrite
plan: 03
subsystem: infra
tags: [secrets, npm, github-actions, checkpoint]

# Dependency graph
requires:
  - phase: 21-publish-automation-release-rewrite
    provides: "Plan 21-01's ci.yml publish job whose npm publish step reads NODE_AUTH_TOKEN from secrets.NPM_TOKEN — this plan supplies that secret"
provides:
  - "GitHub Actions repository secret NPM_TOKEN on jeremiewerner/motto (name exactly matches the secrets.NPM_TOKEN reference in the ci.yml publish job)"
affects: [22-public-flip-token-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Interim static credential posture: granular, package-scoped, publish-only npm token with expiry; OIDC trusted publishing replaces it in Phase 22 / PUB-05"

key-files:
  created: []
  modified: []

key-decisions:
  - "Checkpoint closed against API reality, not attestation alone: first 'approved' failed verification (secrets API returned total_count 0); closed only after gh api showed NPM_TOKEN present"

patterns-established: []

requirements-completed: [PUB-01]

# Metrics
duration: human checkpoint (maintainer action)
completed: 2026-07-04
---

# Phase 21 Plan 03: NPM_TOKEN publish secret — Summary

**One-liner:** Maintainer minted a granular, package-scoped, publish-only npm token (with expiry) and stored it as the GitHub Actions repository secret `NPM_TOKEN`, unblocking the real tag-triggered publish path built in plan 21-01.

## What exists now

- GitHub Actions repository secret `NPM_TOKEN` on `jeremiewerner/motto`.
  Verified via `gh api repos/jeremiewerner/motto/actions/secrets`:
  `{"total_count":1,"secrets":[{"name":"NPM_TOKEN","created_at":"2026-07-04T19:15:32Z","updated_at":"2026-07-04T19:16:26Z"}]}`
- Secret name exactly matches the `secrets.NPM_TOKEN` reference consumed as `NODE_AUTH_TOKEN` in the ci.yml `publish` job (plan 21-01).

## Maintainer attestation (T-21-07 posture)

Maintainer attests the token is:
- a **granular** npm access token (not classic account-wide),
- **package-scoped** to `@jeremiewerner/motto`,
- **publish-only** (Read and write on that single package),
- created **with an expiry** — interim credential, time-boxed until Phase 22 / PUB-05 migrates publishing to OIDC trusted publishing and removes it.

No token value was recorded in any file, commit, log, or chat (T-21-08); only the secret's name and existence are recorded here.

## Deviations from plan

- First checkpoint approval was rejected by the orchestrator: `gh secret list` / secrets API showed zero secrets despite "approved". Secret was then actually stored and re-verified before this SUMMARY was written. No plan content changed.

## Verification

- `gh api repos/jeremiewerner/motto/actions/secrets` → total_count 1, name `NPM_TOKEN` ✓
- Name matches ci.yml publish job reference ✓
- No token value in any committed artifact ✓

## Next phase readiness

- PUB-01 real publish path is unblocked: next tag push (v0.0.6) can authenticate `npm publish` in CI.
- Phase 22 must revoke this token after OIDC trusted publishing lands (PUB-05).
