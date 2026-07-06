---
phase: 25
slug: v0-0-6-operator-debt-closure
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-06
---

# Phase 25 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Stolen/leaked npm token → npm registry publish | Trusted-publisher-only lock closes the boundary structurally — a token alone can no longer publish | npm publish authority |
| GitHub Actions repo secret store → CI publish job | `NPM_TOKEN` deleted; no long-lived credential readable by any workflow or compromised action | publish credential (removed) |
| npm published tarball → stranger's installed plugin | Installed content may differ from repo source; content diff against source-built-from-tag is the only trustworthy check | published skill content |
| Claude Code plugin cache → what the user actually loads | Stale local cache can mask real published content; README caveat + content diff (not cache status) address this | cached plugin content |
| README documented instruction → stranger's actions | A stranger follows the caveat verbatim; instruction proven to actually refresh (not a no-op) via one real stale-cache validation | operator guidance |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-25-01 | Elevation of Privilege | npm publish path accepting a token after OIDC migration | high | mitigate | Publishing access set to trusted-publisher-only (DEBT-08); fallback token revoked (DEBT-07). Maintainer-attested in 25-TOKEN-LOCKDOWN.md; corroborated by SLSA provenance + OIDC publisher identity on live 0.0.6 publish; `gh secret list` empty (agent-verified twice) | closed |
| T-25-02 | Information Disclosure | Token value recorded into a committed phase artifact | high | mitigate | Leak-safe record discipline: command/result/date only. Credential-pattern grep on 25-TOKEN-LOCKDOWN.md + 25-REWALK.md clean (verified at execution, re-verified at phase re-verification, re-checked this audit) | closed |
| T-25-03 | Denial of Service | Lock breaking publish path, tempting token re-mint | medium | mitigate | D-04 stance recorded: fix Trusted Publisher config on npmjs.com and re-run, never re-mint; OIDC path proven live 2026-07-05; 25-REWALK.md Outcome confirms no token re-minted or referenced | closed |
| T-25-04 | Spoofing / Tampering | Trusting `/plugin` cache status instead of installed content | medium | mitigate | 25-REWALK.md records explicit content diff of installed plugin vs `dist/public/` rebuilt from `v0.0.6` tag; cache status rejected as proof by plan design | closed |
| T-25-05 | Denial of Service | Defective published tarball breaking install path | high | mitigate | Re-walk found no defect (D-01/D-02 contingency not triggered); install path proven for a stranger against npm `latest` = 0.0.6 | closed |
| T-25-06 | Elevation of Privilege | Publish failure during patch release tempting token re-mint | high | mitigate | No patch release needed; D-04 never-re-mint stance recorded in evidence records | closed |
| T-25-07 | Tampering / Repudiation | README caveat documenting a refresh command that does not refresh (WR-01) | high | mitigate | Caveat reworded to lead with `claude plugin update motto@motto` (commit 43fb37a); marketplace-add-as-refresh framing removed; fresh code review confirms WR-01 resolved | closed |
| T-25-08 | Repudiation | Grep gate passing on caveat presence while refresh claim unverified (IN-01) | medium | mitigate | Real stale-cache validation performed by maintainer and recorded in 25-REWALK.md "Stale-Cache Validation" (commit 76c3df6); guidance substance-verified, not presence-only | closed |
| T-25-SC | Tampering | npm/pip/cargo installs (supply chain) | low | accept | Zero new packages across all three plans; only install exercised is the already-published, provenance-attested `@jeremiewerner/motto` tarball, verified by content diff against source | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-25-01 | T-25-SC | No new packages introduced anywhere in the phase; the only artifact installed is the provenance-attested published tarball, content-diffed against source built from the released tag | Maintainer (plan-time disposition, all 3 plans) | 2026-07-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-06 | 9 | 9 | 0 | /gsd-secure-phase (orchestrator short-circuit: plan-time register, ASVS L1, all mitigations evidence-checked) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-06
