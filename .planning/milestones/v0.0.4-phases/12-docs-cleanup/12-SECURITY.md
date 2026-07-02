---
phase: 12
slug: docs-cleanup
status: secured
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-02
---

# Phase 12 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| README instructions → user's public GitHub repo | Users follow Ship-your-plugin guidance to commit built output and push public | Built plugin content (dist/public/ only) |
| Working tree → main branch (pre-commit hook) | Delete + test edits must pass the full suite before commit is accepted | Repo source + tests |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-12-01 | Information Disclosure | Ship-your-plugin guidance (commit + push public) | medium | mitigate | README ship step (line 158) instructs committing `dist/public/` only; scaffolded `.gitignore` ignores `dist/private/` (src/init.js:152, INIT-06); the two other `dist/private` mentions (lines 103, 214) are descriptive, not commit instructions | closed |
| T-12-02 | Tampering (doc drift) | README examples vs real init/CLI output | low | mitigate | Scaffold example mirrors src/init.js templates verbatim (test/init-dogfood.test.js guards end-to-end); README:129 `✓ 2 skills OK` matches live `motto lint`; CLI list mirrors bin/motto.js help strings; 12-03 gap-closure greps re-asserted all examples | closed |
| T-12-03 | Denial of Service (main breakage) | Split commit — delete without dogfood-count sync fails pre-commit suite | high | mitigate | Delete + test sync landed as ONE atomic commit (`b437c84`: skills/setup-project/SKILL.md deleted + test/dogfood.test.js synced); full `node --test` 131/131 green | closed |
| T-12-04 | Tampering | Over-deletion — removing shared/references/skill-schema.md or non-setup-project assertions | low | mitigate | Only `skills/setup-project/` removed; `shared/references/skill-schema.md` present on disk; `skills/` contains author-skill + release; 9 surviving author-skill/release assertions in test/dogfood.test.js | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Note: T-12-SC (supply chain) ruled not applicable at plan time — no package-manager installs occur in this phase.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-02 | 4 | 4 | 0 | Claude (secure-phase L1, live-command verification) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
