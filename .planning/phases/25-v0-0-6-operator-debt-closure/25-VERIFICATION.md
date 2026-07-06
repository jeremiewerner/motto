---
phase: 25-v0-0-6-operator-debt-closure
verified: 2026-07-06T18:14:50Z
status: gaps_found
score: 4/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "README's marketplace install section documents the Claude Code plugin-cache caveat so a stranger who hits a stale cache knows how to refresh (DEBT-06)"
    status: partial
    reason: "The caveat exists and is grep-verifiable (contains literal 'plugin cache'), but the code review (25-REVIEW.md WR-01) found the primary remediation instruction is very likely wrong: it tells the stranger to re-run '/plugin marketplace add jeremiewerner/motto' to force a re-pull, but marketplace add operates on the marketplace manifest, not installed plugin content, and for this unpinned npm source the manifest is byte-identical across releases — re-adding cannot even signal a refresh is needed. The correct command is 'claude plugin update <plugin>' (or 'claude plugin marketplace update'), which is not mentioned. The one behavioral claim the caveat makes was also never exercised by 25-REWALK.md (its walkthrough used a clean session, not a stale-cache scenario), so the wrong guidance was never caught by the phase's own verification."
    artifacts:
      - path: "README.md"
        issue: "Line 241 blockquote leads with an instruction ('/plugin marketplace add') that does not perform the refresh it claims to; the working command ('/plugin update' or 'claude plugin update') is omitted."
    missing:
      - "Reword the caveat to lead with 'claude plugin update motto@motto' (or equivalent installed-plugin refresh command), keep reinstall as fallback, drop or demote the marketplace-add instruction, and note the restart-required nuance."
      - "Validate the reworded guidance against a real stale-cache scenario (not just a clean install) and record the observation, per 25-REVIEW.md IN-01."
deferred: []
---

# Phase 25: v0.0.6 Operator Debt Closure Verification Report

**Phase Goal:** The v0.0.6 ship's three deferred operator loose ends are closed and verified against reality: the marketplace install path works for a stranger against npm latest = 0.0.6 with build-skill visible, verified by diffing actual installed plugin content against source (not trusting cache status), with the Claude Code plugin-cache caveat documented (DEBT-06); the granular npm token is revoked and NPM_TOKEN deleted from GitHub secrets, confirmed absent (DEBT-07); npm publishing for @jeremiewerner/motto is locked to trusted-publisher-only (DEBT-08).
**Verified:** 2026-07-06T18:14:50Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

This is a pure operator-checkpoint phase — no `src/` changes. Evidence artifacts are two maintainer-attestation records (`25-TOKEN-LOCKDOWN.md`, `25-REWALK.md`) documenting npmjs.com dashboard actions and a stranger re-walk, neither of which has a CLI/API surface an agent can independently observe. Where an agent-checkable fact exists (GitHub secret state, npm registry state, provenance attestation, README content), it was checked directly against live systems rather than trusted from SUMMARY.md.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GitHub Actions `NPM_TOKEN` secret is deleted/absent, confirmed by `gh secret list` (DEBT-07 CI-side) | VERIFIED | Agent-run `gh secret list --repo jeremiewerner/motto` returns zero entries — matches `25-TOKEN-LOCKDOWN.md`'s claim exactly. |
| 2 | Granular npm access token is revoked on npmjs.com (DEBT-07 registry-side) | UNCERTAIN (human-attested, no CLI surface) | `25-TOKEN-LOCKDOWN.md` records maintainer attestation "1. done 2. done" (2026-07-06). npmjs.com Access Tokens has no read API reachable from this session. Corroborating signal: `npm view @jeremiewerner/motto --json` shows the live `0.0.6` publish was made by `GitHub Actions <npm-oidc-no-reply@github.com>` with a SLSA v1 provenance attestation (agent-verified) — consistent with, but not proof of, token revocation. |
| 3 | npm publishing for `@jeremiewerner/motto` is locked to trusted-publisher-only (DEBT-08) | UNCERTAIN (human-attested, no CLI surface) | `25-TOKEN-LOCKDOWN.md` records maintainer attestation for the Publishing-access setting change. No npm registry API exposes this setting for external read. Same provenance corroboration as above applies. |
| 4 | A stranger's marketplace install shows `build-skill` and hides retired `author-skill`/`setup-project`, proven by content diff against source (not cache status) (DEBT-06) | UNCERTAIN (human-attested, no CLI surface for a genuinely stranger environment) | `25-REWALK.md` records npm `latest`=0.0.6 (agent-verified), and maintainer attestation for marketplace add/install, skill-list check, and a content diff of the installed plugin dir against `dist/public` rebuilt from the `v0.0.6` tag showing a match. Design of the plan correctly scoped this to maintainer-only (Claude Code's local plugin cache is not agent-inspectable from this session). |
| 5 | README's marketplace install section documents the Claude Code plugin-cache caveat so a stranger who hits a stale cache knows how to refresh (DEBT-06) | FAILED (partial) | Caveat exists at README.md:241 and is grep-verifiable (`plugin cache` literal present), but 25-REVIEW.md (WR-01) found the primary remediation instruction — re-running `/plugin marketplace add` — very likely does not refresh installed plugin content; the correct command (`claude plugin update <plugin>`) is omitted. See Gaps below. |

**Score:** 4/5 truths present and evidenced (2 fully agent-verified, 2 legitimately human-attested per plan design); 1 failed on a reviewer-identified factual defect.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/phases/25-v0-0-6-operator-debt-closure/25-TOKEN-LOCKDOWN.md` | Leak-safe DEBT-07/DEBT-08 evidence record | VERIFIED | Exists, contains DEBT-07 and DEBT-08 sections, command/result/date structure, no token values (grep for `npm_`/token patterns found none). |
| `.planning/phases/25-v0-0-6-operator-debt-closure/25-REWALK.md` | Leak-safe DEBT-06 stranger-walkthrough + content-diff record | VERIFIED | Exists, records precondition check, 3-item checklist attestation, and outcome section; no credential values. |
| `README.md` marketplace install section with plugin-cache caveat | Grep-verifiable caveat with correct refresh guidance | PARTIAL — present but factually flawed | Caveat exists (line 241) and is grep-verifiable, but its primary instruction is very likely incorrect per code review (WR-01). Presence ≠ correctness here — see Anti-Patterns below. |
| npmjs.com publishing-access setting: trusted-publisher-only | Registry-side structural lock | UNCERTAIN — no external read API | Maintainer-attested only; corroborated by provenance attestation on the live 0.0.6 publish. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `gh secret delete`/absence check | `gh secret list` output | CLI verification | VERIFIED | Agent-run, zero `NPM_TOKEN` entries confirmed live. |
| Trusted-publisher-only lock | 2026-07-05 OIDC publish path | Must not break existing publish | VERIFIED (indirectly) | `npm view` shows the 0.0.6 tarball's provenance attestation and OIDC publisher identity are intact/unchanged, i.e., the lock (if applied) has not broken the proven-live publish path. |
| Content diff (installed plugin vs. `dist/public` from `v0.0.6` tag) | DEBT-06 pass condition | Maintainer-run diff, not cache-status trust | UNCERTAIN — cannot be agent-replicated (Claude Code's local plugin cache is not inspectable from this session) | `25-REWALK.md` records a match; git tag `v0.0.6` exists and is agent-verifiable as the correct base for the rebuild the maintainer performed. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `NPM_TOKEN` absent from GitHub secrets | `gh secret list --repo jeremiewerner/motto` | Empty output | PASS |
| npm `latest` = 0.0.6 | `npm view @jeremiewerner/motto version` | `0.0.6` | PASS |
| npm dist-tags confirm latest | `npm view @jeremiewerner/motto dist-tags --json` | `{"latest":"0.0.6"}` | PASS |
| Provenance attestation present on live publish | `npm view @jeremiewerner/motto --json` | SLSA v1 provenance, publisher `GitHub Actions <npm-oidc-no-reply@github.com>` | PASS (corroborating evidence for DEBT-08, not primary proof) |
| README caveat contains grep-verifiable string | `grep -c 'plugin cache' README.md` | 1 | PASS (presence only — see gap on correctness) |
| Evidence files contain no credential values | `grep -riE "npm_[a-zA-Z0-9]{20,}\|ghp_[a-zA-Z0-9]{20,}"` on both evidence files | No matches | PASS |
| `v0.0.6` git tag exists (basis for the maintainer's content-diff rebuild) | `git tag -l v0.0.6` / `git show v0.0.6 --stat` | Tag exists, dated 2026-07-05 | PASS |

### Probe Execution

Not applicable — no `scripts/*/tests/probe-*.sh` conventions or phase-declared probes found for this operator-checkpoint phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|-------------|--------|----------|
| DEBT-06 | 25-02-PLAN.md | Marketplace stranger re-walk vs. npm latest=0.0.6, build-skill visible, content-diff proof, cache caveat documented | PARTIAL | Re-walk substance (build-skill visible, content diff match) is human-attested and plan-appropriate; the cache-caveat documentation sub-requirement has a reviewer-identified factual defect (WR-01) that undermines its purpose. |
| DEBT-07 | 25-01-PLAN.md | Granular npm token revoked + `NPM_TOKEN` deleted from GitHub secrets, confirmed absent | SATISFIED | GitHub-secret half agent-verified directly; npmjs.com token-revocation half is maintainer-attested (no CLI surface exists — this is the correct/only possible verification method). |
| DEBT-08 | 25-01-PLAN.md | npm publishing locked to trusted-publisher-only | SATISFIED (human-attested + corroborated) | Maintainer-attested; corroborated by live provenance/OIDC-publisher evidence that the trusted-publisher path remains the one actually publishing. |

No orphaned requirements: REQUIREMENTS.md maps DEBT-06/07/08 to Phase 25, and both plans (`25-01-PLAN.md`, `25-02-PLAN.md`) declare exactly these three IDs between them — full accounting, no gaps in traceability.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| README.md | 241 | Factually incorrect primary remediation instruction (documented by 25-REVIEW.md WR-01, not newly found here — cross-checked and confirmed reasoning holds) | Warning | The caveat's own stated purpose — "so a stranger who hits a stale cache knows how to refresh" — is undermined for the primary path readers will try first (`/plugin marketplace add`, which the review shows cannot signal or force a refresh for this unpinned npm source). The parenthetical fallback ("or reinstall the plugin") is what actually works, but it's secondary framing. |
| README.md | 241 | Caveat's one behavioral claim never exercised (25-REVIEW.md IN-01) | Info | 25-REWALK.md's walkthrough used a clean install, not a stale-cache scenario, so the refresh guidance was never observed working — a "grep-passes, substance-unverified" gap consistent with the project's documented never-throw/tests-green-but-broken pattern history (see MEMORY.md `motto-never-throw-invariant`). |

No TBD/FIXME/XXX markers found in README.md or either evidence file. No credential values leaked in either evidence file (verified directly, not merely per SUMMARY claim).

### Human Verification Required

None beyond what is already resolved via maintainer attestation in the evidence files (DEBT-07/DEBT-08 dashboard actions, DEBT-06 stranger walkthrough) — these are correctly scoped by plan design as unfalsifiable by an agent (no CLI/API surface for npmjs.com token/publishing settings or for Claude Code's local plugin cache from this session). The one open item is not a "needs human observation" gap but a "needs a content fix" gap — see Gaps Summary.

### Gaps Summary

Phase 25 substantially achieves its goal: DEBT-07 (token revocation + secret deletion) is closed with one half directly agent-verified and the other half correctly maintainer-attested; DEBT-08 (trusted-publisher-only lock) is maintainer-attested and corroborated by live provenance evidence that the OIDC-only publish path remains intact; DEBT-06's substantive re-walk (build-skill visible, retired skills absent, content-diff match against source-built-from-tag) is maintainer-attested per correctly-scoped plan design.

The one real gap: DEBT-06's third sub-truth — the README plugin-cache caveat existing "so a stranger... knows how to refresh" — fails on substance, not presence. The phase's own code review (25-REVIEW.md, WR-01) already identified that the caveat's primary instruction (`/plugin marketplace add`) is very likely a no-op for this unpinned npm-source marketplace entry, and the correct command (`claude plugin update <plugin>`) is omitted entirely. This was not caught by the phase's automated check (`grep -c 'plugin cache' README.md`), which validates presence only, and was not caught by 25-REWALK.md's walkthrough, which exercised a clean install rather than a stale-cache scenario (25-REVIEW.md IN-01). Since the review's own fix (reword the caveat, lead with `claude plugin update motto@motto`, validate against a real stale-cache scenario) has not yet been applied to README.md, this gap is still open at verification time, not merely flagged-and-deferred.

This is a narrow, self-contained content fix — it does not implicate DEBT-07/DEBT-08 or the substantive re-walk evidence, and does not block trust in the credential-lockdown half of this phase. It should be closed (reword per WR-01's suggested fix, then validate once against a real stale-cache scenario per IN-01) before the phase is marked fully passed.

---

_Verified: 2026-07-06T18:14:50Z_
_Verifier: Claude (gsd-verifier)_
