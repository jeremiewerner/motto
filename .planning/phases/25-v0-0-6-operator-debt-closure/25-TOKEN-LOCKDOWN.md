# Phase 25: Token Lockdown — DEBT-07/DEBT-08 Evidence Record

This file is the committed, leak-safe record required by DEBT-07 (npm token revocation
and `NPM_TOKEN` secret deletion) and DEBT-08 (npmjs.com trusted-publisher-only publishing
lock). It never contains any token value, secret value, or credential — only structured
metadata (command run, verification result interpreted as present/absent, date).

## DEBT-07 — Token Revocation & Secret Deletion

**GitHub Actions secret (`NPM_TOKEN`) — CI-side half:**

- **Command run:** `gh secret list --repo jeremiewerner/motto`
- **Result:** `NPM_TOKEN` was already absent — the secret list returned zero entries
  (`[]` in `--json name` form). No `gh secret delete` was necessary; this fact is
  recorded instead of a delete action, per the plan's "if already absent, record that
  fact instead of running delete" instruction.
- **Verification:** Re-ran `gh secret list --repo jeremiewerner/motto` (both plain and
  `--json name` output forms) and confirmed no `NPM_TOKEN` entry appears in either.
- **Date:** 2026-07-06

**npmjs.com granular access token — registry-side half:**

- **Status:** Pending maintainer attestation (Task 2 checkpoint). This section will be
  updated with the attestation once the maintainer confirms the token is revoked on
  npmjs.com's Access Tokens page.

## DEBT-08 — Trusted-Publisher-Only Lock

**Status:** Pending maintainer attestation (Task 2 checkpoint). This section will be
added once the maintainer confirms `@jeremiewerner/motto`'s publishing access is set to
trusted-publisher-only on npmjs.com.
