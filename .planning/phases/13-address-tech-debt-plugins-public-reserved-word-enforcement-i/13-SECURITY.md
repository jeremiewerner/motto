---
phase: 13
slug: address-tech-debt-plugins-public-reserved-word-enforcement-i
status: secured
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-02
---

# Phase 13 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| child process → CLI (git stderr) | `resolveGitOwnerName` spawns `git config user.name`; git's stderr can carry attacker-influenced or corrupt `~/.gitconfig` text into the parent's terminal | git error text (untrusted user config) |
| user-supplied project name → filesystem path | `motto init <name>` accepts a name that must never be used as a path segment that escapes the target directory | CLI argument (untrusted input) |
| documentation → user action | README instructs the maintainer to invoke a command; an incorrect name causes a failed/confusing action but crosses no security boundary | doc text |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-13-01 | Information Disclosure | `resolveGitOwnerName` execFileSync (src/init.js) | low | mitigate | `stdio: ['ignore', 'pipe', 'ignore']` at src/init.js:96 suppresses git stderr; never-throw fallback intact (verified live in 13-VERIFICATION.md: `error.stderr === null` with malformed gitconfig) | closed |
| T-13-02 | Tampering (path traversal) | scaffoldProject name→path (src/init.js) + regression guard (test/init.test.js) | low | mitigate | Adversarial-name test nests target under `scratchDir` and asserts parent contents for 4 hostile names incl. `../evil` (test/init.test.js:49-65, 107-154); no live vuln — name used as content, never a path segment | closed |
| T-13-03 | Denial of Service (false-positive over-rejection) | plugins.public/private name validation (src/config.js) | low | accept | No RESERVED check added (grep `RESERVED` in src/config.js = 0 matches, by design) — over-strict rejection of spec-conformant names like `claude-notes-sync` is the defect avoided; per official plugin.json spec, reserved words apply to SKILL.md `name` only | closed |
| T-13-04 | Information Disclosure (documentation accuracy) | README.md release-skill reference | low | mitigate | README.md:173 references `skills/release/SKILL.md` by file path; `/motto:release` occurrences = 0; branch selected via human-verify checkpoint (maintainer confirmed slash command does not resolve) | closed |
| T-13-SC | Tampering (supply chain) | npm/pip/cargo installs | low | accept | Zero new dependencies this phase (git diff on package.json/package-lock.json since phase base = empty); supply-chain surface unchanged | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-13-01 | T-13-03 | Adding a reserved-word check to plugins.public/private would wrongly reject spec-conformant plugin names; official plugin.json spec has no such restriction (verified against live docs in 13-RESEARCH.md) | planner + maintainer (plan approved via checker pass) | 2026-07-02 |
| AR-13-02 | T-13-SC | No packages installed during phase 13 (docs + one-line code edits only); nothing to audit | planner (plan approved via checker pass) | 2026-07-02 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-02 | 5 | 5 | 0 | gsd-secure-phase (L1 short-circuit — plan-time register, grep-verified mitigations) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
