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

- **Action:** Maintainer revoked the granular npm access token (the one previously used
  as the `NPM_TOKEN` GitHub Actions secret fallback) on npmjs.com's Access Tokens page.
- **Verification:** Maintainer confirmed the token no longer appears on the Access
  Tokens page after reload.
- **Attestation:** Maintainer response "1. done 2. done" (2026-07-06) confirms this
  action complete and verified. No token value was shared or recorded, per the leak-safe
  discipline stated above.
- **Date:** 2026-07-06

## DEBT-08 — Trusted-Publisher-Only Lock

- **Action:** Maintainer set publishing access for `@jeremiewerner/motto` to
  trusted-publisher-only (tokens disallowed) on npmjs.com, at package
  `@jeremiewerner/motto` -> Settings -> Publishing access.
- **Verification:** Maintainer confirmed the Publishing access setting shows
  trusted-publisher-only after reload, and that only the configured GitHub Actions
  Trusted Publisher (org `jeremiewerner`, repo `motto`, workflow `ci.yml`) can publish.
- **Attestation:** Maintainer response "1. done 2. done" (2026-07-06) confirms this
  action complete and verified.
- **Date:** 2026-07-06

**Agent-verifiable cross-check (Step 10 item 3 — provenance via the registry):**

- **Command run:** `npm view @jeremiewerner/motto --json`
- **Result:** The published `0.0.6` version carries a provenance attestation
  (`dist.attestations.provenance.predicateType`: `https://slsa.dev/provenance/v1`) and
  was published by npm user `GitHub Actions <npm-oidc-no-reply@github.com>` — consistent
  with an OIDC/Trusted-Publisher-originated publish, not a personal-token publish. This
  reconfirms (does not replace) the provenance verification already recorded on
  2026-07-05.
- **Date:** 2026-07-06

**No replacement `NPM_TOKEN` was minted or referenced anywhere in this record**, per
D-04/Step 8 item 4.
