---
phase: 22
slug: public-flip-token-hardening
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-05
---

# Phase 22 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Private git history → public git history | One-way visibility flip (22-04); every commit ever made became world-readable | Full history: diffs, planning docs, commit metadata |
| GitHub Actions workflow → npm registry | Publish job authenticates via short-lived workflow-scoped OIDC token, no stored secret | OIDC claims, package tarball |
| GitHub Actions OIDC token → npm Trusted Publisher record | npm authorizes exchange only on exact org/repo/workflow-filename match | OIDC identity claims |
| External contributor PR → `main` | Branch protection gates merges on 5 exactly-named green CI checks | Untrusted code contributions |
| Public README/npm/marketplace → logged-out stranger | First-contact experience; accuracy of install/publish instructions | Documentation only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-22-01 | Information Disclosure | Full git history at flip time | high | mitigate | Two full-history gitleaks scans recorded leak-safe in 22-SECRETS-SCAN.md: Scan #1 (405 commits, HEAD 1b1814c, 0 findings) and final Scan #2 at the literal pre-flip HEAD (415 commits, HEAD e85c410, exit 0, 0 findings); flip executed only after Scan #2 clean | closed |
| T-22-02 | Information Disclosure (PII) | Commit author/committer email `jeremie@studiometa.fr` in commit metadata (invisible to gitleaks) | medium | accept | Informed maintainer consent recorded in PROJECT.md Key Decisions ("`.planning/` ships public as-is" row, ✓ Accepted — Phase 22); D-01/D-06 forbid history rewrite | closed |
| T-22-03 | Elevation of Privilege | `NPM_TOKEN` standing long-lived credential | high | mitigate | Token-based auth removed from ci.yml publish path entirely (id-token: write, publish step env removed; no NPM_TOKEN/NODE_AUTH_TOKEN in workflow); structural regression test PUB-05 in test/ci-workflow.test.js; revocation runbook = skills/release/SKILL.md Step 9 (ship-time follow-through) | closed |
| T-22-04 | Spoofing / DoS | npmjs.com Trusted Publisher record vs workflow identity | medium | mitigate | Record configured from live `ci.yml` filename (org=jeremiewerner, repo=motto, workflow=ci.yml, no environment); maintainer-attested in 22-03-SUMMARY and re-confirmed in 22-UAT test 1 (pass, 2026-07-05) | closed |
| T-22-05 | Tampering / DoS | Branch protection on `main` | high | mitigate | Applied and re-verified live via `gh api`: checks exactly `test (20)`, `test (22)`, `test (24)`, `dogfood`, `pack-install-e2e` (pulled from a real CI run, not guessed), `enforce_admins: false` (preserves release direct-push), `npm-drift` deliberately excluded (never reports on PRs) | closed |
| T-22-06 | Information Disclosure | Commit landing between final scan and flip (unscanned window) | high | mitigate | Flip proceeded at 9970842 whose only diff is the Scan #2 record itself (documents a clean scan at its parent HEAD e85c410); no source-changing commit intervened — recorded in 22-04-SUMMARY | closed |
| T-22-07 | Information Disclosure (misleading process) | README describing retired local-publish flow | low | mitigate | README publish-flow rewritten from a recorded logged-out walkthrough (tests → npm version → git push --follow-tags → CI OIDC publish); stale local `npm publish` step removed; CI + npm badges added (22-05-SUMMARY) | closed |
| T-22-SC | Tampering | Supply chain (npm/pip/cargo installs) | low | accept | Zero new packages across all 5 plans; only already-installed tools (gitleaks, git, gh) and the already-audited published package used | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-22-01 | T-22-02 | Commit-metadata author email exposure; no technical mitigation without history rewrite, which D-01/D-06 reject. Informed consent recorded in PROJECT.md Key Decisions and 22-SECRETS-SCAN.md PII Sweep | Maintainer (Jérémie Werner) | 2026-07-05 |
| AR-22-02 | T-22-SC | Zero new dependencies introduced this phase; residual supply-chain exposure limited to pre-existing, already-audited tooling | Maintainer (Jérémie Werner) | 2026-07-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-05 | 8 | 8 | 0 | gsd-secure-phase (L1 grep-depth, short-circuit: plan-time register, threats_open 0, asvs_level 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-05
