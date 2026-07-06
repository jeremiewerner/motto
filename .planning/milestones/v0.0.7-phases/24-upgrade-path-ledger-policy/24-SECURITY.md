---
phase: 24
slug: upgrade-path-ledger-policy
status: secured
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-06
---

# Phase 24 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| project motto.yaml → checkSkew() | Untrusted `mottoVersion` string crosses into the skew comparator; handled by the never-throw parseVersion contract (Phase 23, VER-05). Phase 24's message-wording edit did not widen this surface. | Untrusted YAML string value |
| UPGRADING.md → human reader | Static doc content; no code parses it except the backstop test's substring check. No injection surface. | Public migration prose |
| contributor/agent → release process | The Ledger Gate is a procedural control at the single release choke point (D-01, deliberately not CI); strength is human/agent adherence. | Release intent / verdicts |
| .claude/CLAUDE.md managed block ↔ PROJECT.md source | GSD-synced block; Phase 24's manual sync stayed inside the markers so future regeneration is a no-op. | Constraint text |
| this repo ↔ ~/Projects/magma | External repo edited during checkpoint validation; magma changes are not part of this repo's changeset. | mottoVersion stamp |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-24-01 | Tampering | src/version.js checkSkew() message edit | low | mitigate | Wording-only change in existing template literal (src/version.js:101); no new input handling, I/O, or throw path — never-throw invariant intact (only pre-existing Phase 23 try-collapse-to-null guard present; verifier + grep confirmed) | closed |
| T-24-02 | Denial of Service | checkSkew() on malformed mottoVersion | low | accept | Pre-existing parseVersion never-throw guard (Phase 23) collapses malformed strings to null; unchanged by this phase | closed |
| T-24-03 | Information Disclosure | UPGRADING.md content | low | accept | Public doc: migration steps + non-secret before/after snippets only; no credentials or internal-only paths | closed |
| T-24-04 | Repudiation | Ledger Gate skipped silently at a future release | medium | mitigate | Gate mandates explicit "not breaking, no entry needed" verdict — "silence is not a verdict, state it out loud" (skills/release/SKILL.md:44); mechanical git-diff trigger removes the "didn't notice" excuse; gate runs before the version bump (CR-01 fix, commit 51ddacf) so it can actually block | closed |
| T-24-05 | Tampering | Editing Motto's own motto.yaml during magma validation | high | mitigate | Checkpoint forbade touching repo-root motto.yaml; verified post-execution: motto.yaml has no mottoVersion key, dogfood.test.js zero-skew assertion green (10/10) | closed |
| T-24-06 | Denial of Service | Gate file-list going stale, missing a future break | medium | mitigate | Inline snapshot rationale + "add it to this list here" maintainer prompt (skills/release/SKILL.md:39); human/agent verdict documented as the real backstop; list already extended once (WR-02: build.js, frontmatter.js) | closed |
| T-24-SC | Tampering | npm/pip/cargo installs (supply chain) | n/a | accept | Zero new dependencies in this phase (RESEARCH.md Package Legitimacy Audit: not applicable) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-24-01 | T-24-02 | Malformed-stamp handling owned by Phase 23's parseVersion contract; re-mitigating here would duplicate a verified control | plan-time register (24-01-PLAN.md) | 2026-07-06 |
| AR-24-02 | T-24-03 | UPGRADING.md is intentionally public documentation; contains no sensitive data by construction (D-05 content contract) | plan-time register (24-01-PLAN.md) | 2026-07-06 |
| AR-24-03 | T-24-SC | No package installs occurred in this phase; supply-chain surface unchanged | plan-time register (both plans) | 2026-07-06 |

---

## Audit Trail

## Security Audit 2026-07-06

| Metric | Count |
|--------|-------|
| Threats found | 7 |
| Closed | 7 |
| Open | 0 |

Register authored at plan time (both PLAN.md files carried `<threat_model>` blocks). ASVS L1 grep-depth verification; short-circuit rule applied (threats_open: 0, plan-time register, L1) — no auditor agent required. Evidence gathered live: src/version.js grep (never-throw intact), skills/release/SKILL.md:39,44 (verdict clause + snapshot rationale), motto.yaml unstamped + dogfood 10/10, verifier report 24-VERIFICATION.md (8/8, CR-01 gate fix functionally re-verified).
