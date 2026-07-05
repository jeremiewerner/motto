---
phase: 20
slug: ci-workflow
status: secured
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-04
---

# Phase 20 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm lifecycle → shell (`execSync('npx --no husky')`) | prepare guard shells out; no external/user input reaches the command string | none (fixed literal) |
| committed tree → tmp extraction (`git archive` → tar) | guard-check extracts and runs `npm ci` in a throwaway tmp dir | committed repo contents only |
| CI runner → registry.npmjs.org (read-only fetch) | untrusted external HTTP response parsed by drift check | version string, low sensitivity |
| repo root → tmp consumer project (`npm install <tarball>`) | tarball's own manifest drives install; no third-party packages beyond committed lockfile deps | locally-packed tarball |
| Fork PR → CI runner | untrusted PR code executes in the workflow (post-public-flip concern; private today) | repo contents, read-only token |
| Workflow → third-party action tags (`actions/*@v6`) | mutable major-version tags resolved at run time | runner environment |
| GITHUB_TOKEN → repo | token permissions scope what workflow code can touch | read-only (`contents: read`) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-20-01 | Tampering | scripts/prepare.mjs `execSync` | low | mitigate | Fixed literal `npx --no husky`; no interpolation; runs only when `.git` present (`scripts/prepare.mjs:26,30`) | closed |
| T-20-02 | Denial of Service | scripts/prepare-guard-check.mjs tmp dir | low | mitigate | `rm(dir, {recursive:true,force:true})` in `finally` (`scripts/prepare-guard-check.mjs:69-70`); unique `mkdtemp` prefix | closed |
| T-20-03 | Tampering | drift-check registry response | low | mitigate | Response string-compared only; never eval'd or shell-interpolated; malformed JSON → catch → inconclusive `::warning::` (`scripts/npm-drift-check.mjs:27-35`); post-review fix WR-01 made the never-red guarantee structural (top-level `.catch`) | closed |
| T-20-04 | Denial of Service | drift-check network hang blocking CI | low | accept | Job is advisory (D-10); hang delays only the non-blocking npm-drift job; GitHub default job timeout bounds it | closed (accepted) |
| T-20-05 | Information Disclosure | pack-E2E failure logs echoing stdout/stderr | low | accept | Repo private this phase; output is CLI/npm diagnostics only; no tokens exist until Phase 21 | closed (accepted) |
| T-20-06 | Elevation of Privilege | PR trigger | high | mitigate | `pull_request` trigger (read-only fork-scoped token, no secrets); zero occurrences of `pull_request_target` in `.github/workflows/ci.yml` (grep-verified) | closed |
| T-20-07 | Elevation of Privilege | workflow token permissions | medium | mitigate | Explicit top-level `permissions: contents: read` (`.github/workflows/ci.yml:14-15`) — least-privilege baseline before Phase 21 adds write scope to one job | closed |
| T-20-08 | Tampering | `actions/checkout@v6` / `actions/setup-node@v6` tag pins | medium | accept | First-party GitHub actions pinned by major tag; SHA-pinning documented as stricter alternative, deliberately not adopted at single-maintainer risk tolerance (also review finding IN-01, open info item) | closed (accepted) |
| T-20-SC | Tampering | npm/pip/cargo installs (supply chain) | n/a | accept | Zero new packages this phase (RESEARCH Package Legitimacy Audit: N/A); `npm ci`/E2E install only committed-lockfile deps (yaml, husky) + locally-packed tarball. Post-review fix CR-01 hardened further: E2E invokes `node_modules/.bin/motto` directly, eliminating npx registry-substitution fallback | closed (accepted) |

---

## Accepted Risks

| Threat ID | Risk | Rationale | Revisit When |
|-----------|------|-----------|--------------|
| T-20-04 | npm-drift job can hang on slow registry | Advisory-only job (D-10); bounded by GitHub's default job timeout | Adding `timeout-minutes` (review IN-02) |
| T-20-05 | E2E failure logs echo full stdout/stderr | Private repo; no secrets in scope this phase | Phase 22 public flip — re-check log content policy |
| T-20-08 | Major-tag action pins are mutable | First-party GitHub actions; single-maintainer risk tolerance; recorded tradeoff | Repo goes public or org policy requires SHA pins |
| T-20-SC | Supply chain trust in lockfile deps | Zero new packages; lockfile-committed deps only | Any new dependency addition |

---

## Audit Trail

## Security Audit 2026-07-04

| Metric | Count |
|--------|-------|
| Threats found | 9 |
| Closed | 9 (5 mitigated + verified, 4 accepted + documented) |
| Open | 0 |

Register authored at plan time (all 3 PLAN.md files carry `<threat_model>` blocks, ASVS L1, block on high). Short-circuit path: every `mitigate` disposition verified by grep/read against live source post-fix (commits e0427d0..0c0dd9e included); every `accept` disposition documented above. Independent corroboration: phase code review (20-REVIEW.md, 11 findings, Critical + Warnings fixed) and verifier (20-VERIFICATION.md, passed 5/5) both confirmed trigger security (`pull_request`, `contents: read`, no untrusted interpolation) and tmp-dir cleanup on failure paths. Live CI runs 28684444687 + 28685021049 green.
