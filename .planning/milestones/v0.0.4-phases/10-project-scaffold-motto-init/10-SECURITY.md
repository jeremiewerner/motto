---
phase: 10
slug: project-scaffold-motto-init
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-02
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| user terminal → CLI (`[name]` arg, cwd basename) | Only user-controlled input; flows into file CONTENTS (YAML/JSON values), never path segments | untrusted string |
| user shell → `motto init` (bin/motto.js) | Untrusted cwd state: target may be a file, unwritable, or contain path-blocking entries | filesystem state |
| CLI → git subprocess (`git config user.name`) | External process for owner lookup; may fail (git missing / key unset) | config string |
| CLI → filesystem (scaffold writes under targetDir) | Fixed set of relative paths; overwrite-by-default, never delete | scaffold files |
| test harness → src/init.js + mkdtemp temp dirs | Adversarial-input tests confined to `tmpdir()` scratch dirs | test fixtures |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-10-01 | Tampering | Name → motto.yaml / marketplace.json content | high | mitigate | `NAME_KEBAB.test(effectiveName)` gates before any template interpolation (src/init.js:206); `[a-z][a-z0-9-]*` makes YAML/JSON-breaking chars structurally unreachable | closed |
| T-10-02 | Tampering | `git config` invocation in resolveGitOwnerName | medium | mitigate | `execFileSync('git', ['config', 'user.name'])` array-args form, no shell (src/init.js:94); try/catch with `'Your Name'` fallback | closed |
| T-10-03 | Tampering / EoP | Scaffold write paths | high | mitigate | All scaffold paths hardcoded relative to targetDir; validated name used only as file content, never a path segment; `NAME_KEBAB` rejects `/` and `.` | closed |
| T-10-04 | Tampering (data loss) | Non-empty-dir overwrite | high | mitigate | Refuse by default (allowlist), explicit `--force` skips only the check; zero `rm`/`rmdir` operations in src/init.js (grep count 0) | closed |
| T-10-05 | Tampering | Regression: NAME_KEBAB gate / empty-dir guard weakened | high | mitigate | test/init.test.js adversarial-name + non-empty-guard cases fail loudly on regression (43 tests) | closed |
| T-10-06 | Tampering | Regression: scaffold output stops linting/building | high | mitigate | test/init-dogfood.test.js runs init → lint → build on every commit | closed |
| T-10-07 | Denial of Service | scaffoldProject STEP 2/STEP 4 fs failures | medium | mitigate | try/catch wraps readdir + writeScaffold (src/init.js:227-233, 246-254), mapping ENOTDIR/EACCES/ENOSPC to `{ ok:false, errors }` + `✗` CLI line; 2 adversarial regression tests; independently reproduced in verification (9/9) | closed |
| T-10-08 | Information Disclosure | fs `e.message` in stdout may include absolute target path | low | accept | User already supplied/owns that path; no cross-user leakage | closed |
| T-10-09 | Tampering | Partial scaffold left on mid-write failure | low | accept | `{ ok:false, errors }` signals failure; user re-runs with fixed target. No delete/rollback (zero-delete hard invariant) | closed |
| T-10-SC | Tampering | npm/pip/cargo supply chain | high | accept | No packages installed this phase — stdlib + first-party modules only (Package Legitimacy Audit: empty) | closed |

*Note: 10-03-PLAN.md reused IDs T-10-01..03 for its own register; renumbered here as T-10-07..09 to keep the phase-level register collision-free.*

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-10-01 | T-10-08 | Error messages may echo the user's own target path; single-user CLI, no cross-user surface | plan 10-03 threat model (user-approved plan) | 2026-07-02 |
| AR-10-02 | T-10-09 | Partial scaffold on mid-write failure; rollback would violate the zero-delete invariant (YAGNI) | plan 10-03 threat model (user-approved plan) | 2026-07-02 |
| AR-10-03 | T-10-SC | Zero new dependencies this phase — no supply-chain surface introduced | plans 10-01/10-02 threat models | 2026-07-02 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-02 | 10 | 10 | 0 | gsd-secure-phase (L1 short-circuit: plan-time register, threats_open 0, ASVS 1; mitigations grep-evidenced + independently reproduced by gsd-verifier same day) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-02
