# Phase 22: Public Flip & Token Hardening - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The repo crosses the one-way door to public and the publish pipeline ends token-free: a gitleaks full-history secrets scan gates the flip (result recorded), `.planning/` visibility is an explicit recorded decision, `jeremiewerner/motto` flips public with a verified logged-out-stranger path (README, npm links, marketplace install), and CI publish migrates from `NPM_TOKEN` to npm trusted publishing (OIDC) with `--provenance`. Requirements: OPEN-01..03, PUB-05. Zero new deps; no `src/` code changes expected — this phase is repo settings, workflow YAML, docs, and operator actions.

</domain>

<decisions>
## Implementation Decisions

### .planning/ visibility (OPEN-02)
- **D-01:** `.planning/` goes **public as-is**. No history rewrite, no gitignore-forward. Tags stay valid, history stays honest; the planning record is a feature for a dev-tooling repo.
- **D-02:** The decision is recorded as a **row in PROJECT.md's Key Decisions table** (decision + rationale + date). Phase artifacts carry the detail; no dedicated flip doc.
- **D-03:** Beyond gitleaks, a **targeted prose sweep** runs pre-flip: mechanical grep for emails/tokens/internal-URL patterns across `.planning/`, plus a human skim of the few high-risk files (STATE.md, review reports, milestone audits). Not a 190-file agent audit.
- **D-04:** Sweep scope is **working tree + one mechanical history pass** (`git log -p` piped through PII patterns — emails/URLs/names). Secrets in history are gitleaks' job; this adds only the PII layer.

### Secrets scan protocol (OPEN-01)
- **D-05:** Scan result recorded as a **committed leak-safe summary** in the phase dir: exact command, gitleaks version, HEAD SHA scanned, exit code, findings count, per-hit triage (rule + file — **never matched values**). Raw gitleaks JSON is never committed (a hit report embeds the secret itself).
- **D-06:** Real secret found in history → **rotate only**. The dead credential stays in history; no filter-repo purge (same no-surgery stance as D-01).
- **D-07:** False positives are **triaged in the record only** — no `.gitleaks.toml` unless FP volume actually demands rescan reproducibility (YAGNI).
- **D-08:** **Rescan as the final pre-flip step** so the recorded HEAD SHA equals the flipped HEAD — no unscanned trailing-commit window. (First scan earlier in the phase for triage lead time.)

### Stranger verification + public pass (OPEN-03)
- **D-09:** Verification is a **manual checklist walkthrough**: logged-out browser + clean shell; README links resolve, `npm i -g @jeremiewerner/motto` works, marketplace add + plugin install work. Results recorded per checklist item. (The npm tarball → init → lint → build path is already machine-proven every push by CI pack-E2E — don't re-prove it.)
- **D-10:** Marketplace leg depth: **add + install + skills appear in Claude Code's skill list**. No skill invocation — skill behavior is v0.0.5-verified; this proves the distribution path only.
- **D-11:** README public pass = **CI badge + npm version badge + accuracy fixes** for whatever the walkthrough finds. Bounded by findings; no rewrite, no contributing-section expansion.
- **D-12:** **Branch protection lands in this phase**, folded into the flip's repo-settings action: `main` requires PRs + green CI checks (the four Phase-20 jobs). Honors the Phase 20 D-03 promise; makes the CI gate unbypassable.

### OIDC migration + proof publish (PUB-05)
- **D-13:** The **v0.0.6 milestone ship itself is the OIDC proof publish**. Trusted publisher configured in-phase; the milestone's own `v0.0.6` tag exercises it live. No pre-release proof tag, no version burned. PUB-05's final verification lands at ship time — accepted.
- **D-14:** The **0.0.5 catch-up publish is formally abandoned** — its window closed when Phase 21 rewrote the release skill (laptops no longer publish) and the tree moved past v0.0.5 content. Registry jumps 0.0.3 → 0.0.6; the npm-drift warning stays yellow until ship — expected, not a bug.
- **D-15:** `NPM_TOKEN` dies **after the first successful OIDC publish**: revoke the granular token on npmjs.com AND delete the GitHub secret, both recorded. Token stays as fallback through the ship publish only; milestone still ends at zero long-lived tokens.
- **D-16:** **npm-side enforcement**: after the OIDC publish succeeds, set the package's publishing access on npmjs.com to trusted-publisher-only (tokens disallowed). Zero-tokens becomes structurally enforced, not just currently true.
- **D-17:** Provenance verified via **registry check** — provenance badge/attestation on the npmjs.com package page (or `npm view` attestations), recorded. No `npm audit signatures` ceremony.

### Claude's Discretion
- Flip-step sequencing and operator-checkpoint structure (rescan → flip → branch protection → walkthrough → OIDC config → ship handoff) — planner sequences within the locked decisions; the flip click, npmjs.com config, and repo-settings changes are operator actions (cannot be done by agents).
- Exact ci.yml publish-job changes for OIDC (`permissions: id-token: write`, drop `NODE_AUTH_TOKEN`, `--provenance` flag placement), keeping the existing npm_guard/version_guard/gh-release structure intact.
- Walkthrough checklist wording and where the per-item results are recorded.
- Grep pattern set for the D-03/D-04 prose sweep.
- Badge markdown/placement in README.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — OPEN-01..03, PUB-05 exact wording; Out of Scope (no continuous CI scanning, no third-party release actions, no new deps)
- `.planning/ROADMAP.md` — Phase 22 goal + 4 success criteria; Phase 21 dependency

### Consumed contracts (Phases 20–21)
- `.github/workflows/ci.yml` — the publish job to migrate: Node 24 pin, `NPM_TOKEN`/`NODE_AUTH_TOKEN` at the `npm publish` step, npm_guard + version_guard + gh-release steps that must survive the OIDC rewrite
- `.planning/phases/20-ci-workflow/20-CONTEXT.md` — D-03: no path filters *because* Phase 22 adds branch protection (required-status-checks interaction); deferred README CI badge
- `skills/release/SKILL.md` — Phase 21 rewrite: local flow = tests → bump → tag → push; CI handoff + never-re-tag runbook; the v0.0.6 ship follows this skill and doubles as the OIDC proof (D-13)
- `test/ci-workflow.test.js` — structural assertions on ci.yml (step ordering, findIndex-based); OIDC edits to the publish job must keep this suite green or update it deliberately

### Milestone research
- `.planning/research/SUMMARY.md` — trusted-publishing floor (npm ≥11.5.1 / Node 24), OIDC-after-flip ordering rationale, gitleaks choice

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/ci.yml` publish job — already pinned Node 24 ahead of this migration (Phase 21 decision); has job-level `permissions` block ready to receive `id-token: write`
- CI pack-E2E + dogfood jobs — already prove the npm-consumer and skill-tree paths every push; the stranger walkthrough only covers what they can't (logged-out web, marketplace, Claude Code session)
- `gitleaks` 8.30.1 installed locally; `gh` CLI authenticated (repo currently PRIVATE, confirmed)
- `LICENSE` (MIT) exists; `package.json` has repository/homepage links already pointing at the public URL shape

### Established Patterns
- Operator checkpoints as plans (Phase 21-03 `NPM_TOKEN` secret creation) — the flip click, npmjs.com trusted-publisher config, and branch-protection settings follow the same maintainer-checkpoint pattern
- Leak-safe recording, never-re-tag runbook, structural workflow tests — all Phase 20/21 conventions this phase must not regress

### Integration Points
- `package.json` at 0.0.3 = registry: npm-drift warning stays silent until the v0.0.6 bump at ship (D-14)
- Milestone branch `gsd/v0.0.6-prove-publish` merges to main via the standard ship flow; branch protection (D-12) must be sequenced so it doesn't block that merge path (PRs + green CI is the ship flow anyway)
- GitHub secret scanning activates automatically post-flip (free for public repos) — complements, doesn't replace, the one-shot gate

</code_context>

<specifics>
## Specific Ideas

- The scan record's value is auditability by strangers: a public repo whose history says "scanned with gitleaks X.Y at SHA Z, clean" — that's the OPEN-01 bar.
- D-13/D-14 mean the milestone's final act (ship) IS the phase's final verification — plan the phase so everything except the OIDC live-proof is verifiable before ship, and the ship record captures the proof.

</specifics>

<deferred>
## Deferred Ideas

- Fuller public polish (contributing section, issue templates, repo topics/description pass) — beyond D-11's bounded scope; future milestone if the public repo attracts contributors.
- `.gitleaks.toml` allowlist — only if FP volume ever demands reproducible clean rescans (D-07).
- Continuous secrets scanning in CI — explicitly out of scope (REQUIREMENTS.md); GitHub secret scanning covers post-flip.

</deferred>

---

*Phase: 22-Public Flip & Token Hardening*
*Context gathered: 2026-07-04*
