---
phase: 19
slug: cli-ergonomics-build-skill-verification
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-03
---

# Phase 19 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| CLI argv → bin/motto.js | Operator/CI-supplied `--format` value and `[path]` cross into the process | Untrusted strings (flag values, paths) |
| bin/motto.js stdout → downstream CI parser (Phase 20) | The JSON document is a de-facto external schema once `--format json` ships | Machine-parsed JSON result |
| Staged freeform brief → build-skill LLM agent | Untrusted-shaped free text fed to an agent that authors files under skills/ | Freeform natural language |
| Verification claim → phase completion | A "BSKV-01 done" claim could be recorded without an actual run | Completion assertions |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-19-01 | Tampering | `--format` unknown-value error message | low | accept | Reflected value written to stderr only via `process.stderr.write`, never shell/eval; inert | closed |
| T-19-02 | Tampering | JSON output shape consumed by Phase 20 CI | medium | mitigate | D-01 verbatim core result; 8 `--format json` tests `JSON.parse` stdout and assert exact key shape (`test/cli.test.js:283-320`) | closed |
| T-19-03 | Tampering | stdout pipe-safety (Pitfall 7) | medium | mitigate | Every `✗` line (lint/build/init) on stderr — 21 `process.stderr.write` call sites in `bin/motto.js`; stream-split tests assert clean stdout on failing targets | closed |
| T-19-04 | Elevation of Privilege | build-skill treats brief as instructions | medium | mitigate | `skills/build-skill/SKILL.md` Step 1 data-not-instructions guard; observed holding during the live BSKV-01 run (brief structured as data) | closed |
| T-19-05 | Repudiation | BSKV-01 documented-not-run (Pitfall 4) | high | mitigate | Blocking `checkpoint:human-verify` ran live in-session; `19-BSKV-FINDINGS.md` on disk with 5 non-placeholder Verdict lines; verifier re-checked all three targets | closed |
| T-19-SC | Tampering | npm/pip/cargo installs | low | accept | Zero new dependencies — `package.json` unchanged this phase (deps: `yaml` only) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-19-01 | T-19-01 | Reflected flag value is inert (stderr-only, no shell/eval path); escaping would add code for no exposure | plan 19-01 threat model (operator-approved plans) | 2026-07-03 |
| AR-19-02 | T-19-SC | No package installs this phase; supply-chain surface unchanged | plan 19-01/19-02 threat models | 2026-07-03 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-03 | 6 | 6 | 0 | gsd-secure-phase (L1 short-circuit — plan-time register, all mitigations grep-verified + live-run evidence) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-03
