# Phase 22: Public Flip & Token Hardening - Research

**Researched:** 2026-07-04
**Domain:** Repo visibility flip (one-way door), git-history secrets scanning, npm OIDC trusted publishing, GitHub branch protection
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**.planning/ visibility (OPEN-02)**
- D-01: `.planning/` goes public as-is. No history rewrite, no gitignore-forward. Tags stay valid, history stays honest; the planning record is a feature for a dev-tooling repo.
- D-02: The decision is recorded as a row in PROJECT.md's Key Decisions table (decision + rationale + date). Phase artifacts carry the detail; no dedicated flip doc.
- D-03: Beyond gitleaks, a targeted prose sweep runs pre-flip: mechanical grep for emails/tokens/internal-URL patterns across `.planning/`, plus a human skim of the few high-risk files (STATE.md, review reports, milestone audits). Not a 190-file agent audit.
- D-04: Sweep scope is working tree + one mechanical history pass (`git log -p` piped through PII patterns — emails/URLs/names). Secrets in history are gitleaks' job; this adds only the PII layer.

**Secrets scan protocol (OPEN-01)**
- D-05: Scan result recorded as a committed leak-safe summary in the phase dir: exact command, gitleaks version, HEAD SHA scanned, exit code, findings count, per-hit triage (rule + file — never matched values). Raw gitleaks JSON is never committed (a hit report embeds the secret itself).
- D-06: Real secret found in history → rotate only. The dead credential stays in history; no filter-repo purge (same no-surgery stance as D-01).
- D-07: False positives are triaged in the record only — no `.gitleaks.toml` unless FP volume actually demands rescan reproducibility (YAGNI).
- D-08: Rescan as the final pre-flip step so the recorded HEAD SHA equals the flipped HEAD — no unscanned trailing-commit window. (First scan earlier in the phase for triage lead time.)

**Stranger verification + public pass (OPEN-03)**
- D-09: Verification is a manual checklist walkthrough: logged-out browser + clean shell; README links resolve, `npm i -g @jeremiewerner/motto` works, marketplace add + plugin install work. Results recorded per checklist item. (The npm tarball → init → lint → build path is already machine-proven every push by CI pack-E2E — don't re-prove it.)
- D-10: Marketplace leg depth: add + install + skills appear in Claude Code's skill list. No skill invocation — skill behavior is v0.0.5-verified; this proves the distribution path only.
- D-11: README public pass = CI badge + npm version badge + accuracy fixes for whatever the walkthrough finds. Bounded by findings; no rewrite, no contributing-section expansion.
- D-12: Branch protection lands in this phase, folded into the flip's repo-settings action: `main` requires PRs + green CI checks (the four Phase-20 jobs). Honors the Phase 20 D-03 promise; makes the CI gate unbypassable.

**OIDC migration + proof publish (PUB-05)**
- D-13: The v0.0.6 milestone ship itself is the OIDC proof publish. Trusted publisher configured in-phase; the milestone's own `v0.0.6` tag exercises it live. No pre-release proof tag, no version burned. PUB-05's final verification lands at ship time — accepted.
- D-14: The 0.0.5 catch-up publish is formally abandoned — its window closed when Phase 21 rewrote the release skill (laptops no longer publish) and the tree moved past v0.0.5 content. Registry jumps 0.0.3 → 0.0.6; the npm-drift warning stays yellow until ship — expected, not a bug.
- D-15: `NPM_TOKEN` dies after the first successful OIDC publish: revoke the granular token on npmjs.com AND delete the GitHub secret, both recorded. Token stays as fallback through the ship publish only; milestone still ends at zero long-lived tokens.
- D-16: npm-side enforcement: after the OIDC publish succeeds, set the package's publishing access on npmjs.com to trusted-publisher-only (tokens disallowed). Zero-tokens becomes structurally enforced, not just currently true.
- D-17: Provenance verified via registry check — provenance badge/attestation on the npmjs.com package page (or `npm view` attestations), recorded. No `npm audit signatures` ceremony.

### Claude's Discretion
- Flip-step sequencing and operator-checkpoint structure (rescan → flip → branch protection → walkthrough → OIDC config → ship handoff) — planner sequences within the locked decisions; the flip click, npmjs.com config, and repo-settings changes are operator actions (cannot be done by agents).
- Exact ci.yml publish-job changes for OIDC (`permissions: id-token: write`, drop `NODE_AUTH_TOKEN`, `--provenance` flag placement), keeping the existing npm_guard/version_guard/gh-release structure intact.
- Walkthrough checklist wording and where the per-item results are recorded.
- Grep pattern set for the D-03/D-04 prose sweep.
- Badge markdown/placement in README.

### Deferred Ideas (OUT OF SCOPE)
- Fuller public polish (contributing section, issue templates, repo topics/description pass) — beyond D-11's bounded scope; future milestone if the public repo attracts contributors.
- `.gitleaks.toml` allowlist — only if FP volume ever demands reproducible clean rescans (D-07).
- Continuous secrets scanning in CI — explicitly out of scope (REQUIREMENTS.md); GitHub secret scanning covers post-flip.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| OPEN-01 | Full git history passes a secrets scan (`gitleaks git .`); any hit triaged and rotated before flip; result recorded | Live-verified command (`gitleaks git .`), exact CLI shape confirmed against installed `gitleaks 8.30.1`; live baseline scan already run against current HEAD (see Summary — zero findings today); leak-safe record format in Code Examples |
| OPEN-02 | `.planning/` visibility is an explicit recorded decision, not a default | PROJECT.md Key Decisions table format confirmed (existing rows read); D-01/D-02 already lock the answer — research adds the concrete PII-sweep finding (git commit metadata emails) the decision record should acknowledge |
| OPEN-03 | Repo flips public; README/npm/marketplace verified for a logged-out stranger | README structure read (stale "Publish to npm" section identified as a near-certain walkthrough finding); marketplace.json read; branch-protection check-name mechanics and the release-skill/branch-protection interaction documented as a Critical Pitfall |
| PUB-05 | CI publish migrates `NPM_TOKEN` → npm trusted publishing (OIDC) with `--provenance`; zero long-lived tokens | Exact npmjs.com Trusted Publisher UI fields verified (WebFetch, official docs); exact ci.yml diff scoped against the live file; publishing-access lockdown steps and provenance-verification path confirmed |
</phase_requirements>

## Summary

This phase is almost entirely repo-settings, workflow-YAML, and documentation work — no `src/` changes, zero new dependencies, consistent with the milestone's "additive wrapping, never-throw core untouched" pattern already held through Phases 19-21. Three things make it different from prior phases: (1) it flips a **one-way door** (public visibility can't be undone), so the gating scan must be genuinely final, not "run once, hope nothing changed since"; (2) two of its four requirements are **operator actions** (clicking a visibility toggle, configuring npmjs.com) that no agent can perform — the plan must produce `checkpoint:human-verify` tasks for these, following the exact pattern Phase 21-03 already established for `NPM_TOKEN`; (3) the OIDC migration's own live proof is **explicitly deferred to ship time** (D-13) — the phase's own verification loop cannot exercise a real tag-triggered OIDC publish, only the static config (npmjs.com Trusted Publisher fields + ci.yml diff).

A live baseline scan run during this research (not a substitute for the phase's own recorded scan) confirms the repo is clean **today**: `gitleaks git .` on `HEAD=97c71fd`, gitleaks 8.30.1, scanned 403 commits, zero leaks. A parallel mechanical PII pass (per D-03/D-04) over the working tree and full history found exactly one item worth flagging to the maintainer before the flip: **git commit author/committer metadata** — invisible to gitleaks, which scans diff content, not commit headers — carries `jeremie@studiometa.fr` (a personal/work-domain email, distinct from the `jeremiew@pm.me` address already deliberately public in `marketplace.json`) across every recent commit. Since D-01/D-06 already reject history rewrite, this is not a "fix it" finding — it is a "the maintainer should knowingly accept this before the flip, not discover it after" finding, and the D-02 PROJECT.md decision row is the natural place to note it.

The second load-bearing finding is a genuine tension between D-12 ("branch protection... makes the CI gate unbypassable") and the already-shipped `release` skill (Phase 21, `skills/release/SKILL.md`), whose Step 4 is a **direct push to `main`** (`git push --follow-tags`, no PR). GitHub branch protection's required-PR rule has a separate "include administrators" toggle; if the planner enables strict enforcement for everyone (including the repo-owning maintainer), the very next release breaks. The pragmatic, YAGNI-aligned reading of D-12 — and the one that doesn't require rewriting Phase 21's just-shipped skill — is: require PRs + green checks for everyone *except* the repo owner (GitHub's default posture, "do not enforce on administrators"), so external/future contributors are gated while the existing solo-maintainer release flow is untouched. This must be an explicit, recorded choice in the plan, not an accident of whichever checkbox the operator happens to leave at its default.

**Primary recommendation:** Sequence the phase as: (1) first gitleaks scan + PII sweep for triage lead time → (2) `.planning/` visibility decision recorded in PROJECT.md → (3) OIDC static config (ci.yml diff + npmjs.com Trusted Publisher checkpoint, both artifacts of this phase, live proof deferred to ship per D-13) → (4) branch protection checkpoint (explicitly non-enforced-for-administrators) → (5) final gitleaks rescan at the literal pre-flip HEAD (D-08) → (6) flip-to-public checkpoint → (7) stranger walkthrough (logged-out browser) → (8) README accuracy pass fixing whatever the walkthrough surfaces (the stale "Publish to npm" section is a near-certain hit). NPM_TOKEN revocation (D-15), npm-side lockdown (D-16), and provenance verification (D-17) are ship-time follow-through, not phase-22-verifiable — the plan should say so explicitly rather than leave them as unverified success criteria.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|-----------------|-----------|
| Git-history secrets scan | Local/CI tooling (standalone binary) | — | `gitleaks` is a Go binary invoked from the maintainer's shell, not part of the Node/npm dependency tree; result is committed as a markdown record, not code |
| `.planning/` visibility decision | Documentation (PROJECT.md) | — | Pure record-keeping; no runtime component |
| Repo visibility flip | GitHub platform settings | — | A GitHub repo-level setting (`gh repo edit --visibility public` or Settings UI); not expressible in any file in the repo |
| Branch protection | GitHub platform settings (API/UI) | CI workflow (`ci.yml`, indirectly — the check names it must match) | Branch protection rules live in GitHub's own config, but the required-check *names* are derived from `ci.yml` job/matrix structure, coupling the two |
| OIDC trusted publishing | CI / Backend (publish job in `ci.yml`) | External platform config (npmjs.com Trusted Publisher record) | The workflow YAML declares `id-token: write` and calls `npm publish`; npmjs.com holds the matching trust record (org/repo/workflow-filename/action) that authorizes the exchange — both sides must agree, neither alone is sufficient |
| Provenance attestation | CI (automatic, npm CLI ≥ 11.5.1 + OIDC) | Registry (npmjs.com package page / Sigstore Rekor log) | Generated automatically by npm during OIDC publish from a public GitHub Actions repo; verified by reading the registry, not by running local tooling |
| README/marketplace stranger-usability | Documentation + Distribution config | — | `README.md` prose and `.claude-plugin/marketplace.json` are both static, human/Claude-Code-consumed artifacts; no runtime code path |

## Standard Stack

### Core

No new dependencies. Every tool this phase touches already exists in the repo or on the machine:

| Tool | Version (verified) | Purpose | Why Standard |
|------|---------------------|---------|---------------|
| `gitleaks` | 8.30.1 [VERIFIED: local `gitleaks version`] | Full-history secrets scan, one-shot pre-flip gate | Already the milestone's chosen tool (STACK.md, prior research); confirmed installed and working locally, live-tested against this repo during this research |
| `gh` CLI | authenticated, scopes `gist,read:org,repo,workflow` [VERIFIED: local `gh auth status`] | Repo visibility flip, branch protection API, secret management, release checks | Preinstalled/already-used pattern (Phase 21 `NPM_TOKEN` checkpoint used `gh secret set`); `workflow` scope present, needed to push `ci.yml` changes |
| `npm` CLI | 11.11.0 locally [VERIFIED: local `npm --version`]; CI publish job pinned to Node 24 (bundles npm ≥ 11.x) [CITED: docs.npmjs.com/trusted-publishers/] | Trusted publishing / OIDC exchange, `npm publish --provenance` | Meets the ≥ 11.5.1 trusted-publishing floor both locally and in the CI publish job (already pinned to Node 24 in Phase 21, specifically ahead of this migration) |
| GitHub Actions OIDC (`permissions: id-token: write`) | n/a (platform feature) | Short-lived, workflow-scoped auth token exchanged with npm at publish time | Removes the long-lived `NPM_TOKEN` secret entirely — the explicit PUB-05 goal |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `git log -p --all` / `git log --all --format='%ae\|%ce'` | Mechanical PII sweep (D-04) | Full-history pass for emails/URLs in diff content AND commit metadata (gitleaks does not scan commit author/committer headers — see Common Pitfalls) |
| `gh api repos/{owner}/{repo}/branches/main/protection` (PUT) | Configure branch protection programmatically | Alternative to the Settings UI; useful for a reproducible, scriptable checkpoint record |
| `npm view <pkg>@<version> --json` | Inspect published package metadata | Sanity-check `repository`/`dist` fields before relying on `repository.url` matching for the Trusted Publisher record |

### Package Legitimacy Audit

Not applicable — this phase installs zero new packages (npm, PyPI, or otherwise). All tools used (`gitleaks`, `gh`, `npm`, GitHub Actions built-ins) are either already present in the repo/toolchain or standalone binaries outside the npm dependency tree.

## Architecture Patterns

### Sequencing Diagram (data/decision flow through the phase)

```
 [gitleaks scan #1]──┐                          ┌─▶[gh_guard checkpoint: NPM_TOKEN
  (triage lead time)  │                          │   revocation + npm-side lockdown]
                       ▼                          │        (ship-time follow-through,
 [.planning/ visibility]                          │         D-15/D-16 — NOT phase-22
  decision → PROJECT.md                           │         verifiable, document as such)
  Key Decisions row (D-02)                        │
       │                                          │
       ▼                                          │
 [ci.yml OIDC diff]──────▶[npmjs.com Trusted     │
  (id-token: write,        Publisher checkpoint]  │
  drop NODE_AUTH_TOKEN,    (operator action,      │
  --provenance)            checkpoint:human-verify)│
       │                          │                │
       └──────────┬───────────────┘                │
                   ▼                                │
     [branch protection checkpoint]                 │
     (main: require PR + green checks;              │
      exclude administrators — see Pitfall)         │
                   │                                │
                   ▼                                │
     [gitleaks rescan — FINAL]                      │
     (D-08: HEAD at rescan == HEAD at flip)          │
                   │                                │
                   ▼                                │
     [flip-to-public checkpoint]                    │
     (operator action, one-way door)                │
                   │                                │
                   ▼                                │
     [stranger walkthrough]                         │
     (logged-out browser: README → npm install      │
      → marketplace add → skill list)                │
                   │                                │
                   ▼                                │
     [README accuracy pass]                         │
     (badges + fix whatever walkthrough found,       │
      e.g. stale "Publish to npm" section)           │
                   │                                │
                   ▼                                │
        [Phase 22 verification: DONE]                │
        (PUB-05's live-proof leg explicitly           │
         deferred — points forward to)───────────────┘
                   │
                   ▼
        [v0.0.6 ship: real tag push exercises
         OIDC live; D-13/D-15/D-16/D-17 close out]
```

This is the dependency-respecting order; exact task/plan boundaries and checkpoint framing are Claude's discretion per CONTEXT.md, but the ordering constraints themselves are not: the visibility decision and both scans must precede the flip; the flip must precede the stranger walkthrough (a logged-out stranger cannot reach a private repo); branch protection has no ordering dependency on the flip itself but is bundled into "the flip's repo-settings action" per D-12.

### Pattern 1: Operator Checkpoint for Non-Agent Actions

**What:** A `checkpoint:human-verify` task (`gate="blocking-human"`) with no automated implementation — the maintainer performs a platform-UI action (npmjs.com config, GitHub Settings toggle) that has no code representation, then confirms via a CLI command the agent can verify.

**When to use:** Any action that only exists in a web UI outside the repo (npm account/package settings, GitHub repo visibility, GitHub branch protection when done via Settings rather than `gh api`).

**Example (established in this codebase, Phase 21-03):**
```markdown
<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task N: Maintainer configures the npm Trusted Publisher</name>
  <action>
    Blocking human checkpoint: on npmjs.com, package @jeremiewerner/motto ->
    Settings -> Trusted Publisher -> Add GitHub Actions publisher.
    Organization/user: jeremiewerner. Repository: motto.
    Workflow filename: ci.yml (filename only, not full path).
    Environment name: leave blank (no GitHub Environment is declared in ci.yml).
    Allowed actions: npm publish.
  </action>
  <verify>
    <human-check>npmjs.com package Settings page shows the Trusted Publisher
    record for jeremiewerner/motto, workflow ci.yml.</human-check>
  </verify>
</task>
```
This phase needs at least three such checkpoints: npmjs.com Trusted Publisher config, branch protection settings, and the repo visibility flip itself (the flip could alternatively be scripted via `gh repo edit --visibility public --accept-visibility-change-consequences`, which IS agent-executable — see Open Questions on whether to checkpoint or script it).

### Pattern 2: Leak-Safe Recorded Verification (established in Phase 21)

**What:** A committed markdown record of a security-relevant check that never embeds the sensitive material itself (matched secret values, raw gitleaks JSON with match context).

**When to use:** OPEN-01's gitleaks record (D-05) and the PII sweep findings (D-03/D-04) both need this shape.

**Example structure for the OPEN-01 scan record:**
```markdown
## Secrets Scan Record

- Command: `gitleaks git . --exit-code 0`
- gitleaks version: 8.30.1
- HEAD SHA scanned: <sha>
- Commits scanned: <N> (per gitleaks' own "N commits scanned" log line)
- Exit code: 0
- Findings: 0

(If findings > 0: a table of {commit SHA (short), file path, rule ID,
maintainer action taken} — never the matched string itself.)
```
Live-verified during this research: `gitleaks git . -r <tmp>.json -f json` against HEAD `97c71fd`, gitleaks 8.30.1, "403 commits scanned... no leaks found", exit 0, `[]` findings array. This is not a substitute for the phase's own recorded scan (HEAD will have moved by then, and D-08 requires the *final* pre-flip HEAD specifically) but confirms the command/tooling shape works exactly as researched.

### Pattern 3: Structural Workflow Regression Test (established, `test/ci-workflow.test.js`)

**What:** Parse `ci.yml` with the `yaml` package and assert on job/step structure (existence, ordering, specific `run:`/`id:` content) rather than string-matching the raw YAML text — this project's existing pattern for guarding CI-workflow contracts (Phase 21's `version_guard` ordering test).

**When to use:** After the OIDC diff, add or extend an assertion that the `publish` job's `npm publish` step no longer references `secrets.NPM_TOKEN`/`NODE_AUTH_TOKEN`, and that job-level `permissions` includes `id-token: write`. This mirrors the existing test's own style and protects the OIDC migration from an accidental regression back to token auth.

**Example (extending the existing describe block):**
```javascript
// Source: existing test/ci-workflow.test.js pattern (Phase 21)
it('publish job uses OIDC, not NODE_AUTH_TOKEN/NPM_TOKEN', () => {
  const publishJob = workflow.jobs.publish;
  assert.ok(
    publishJob.permissions && publishJob.permissions['id-token'] === 'write',
    'publish job must declare id-token: write for OIDC',
  );
  const npmPublishStep = steps.find((s) => s.name === 'npm publish');
  assert.doesNotMatch(
    JSON.stringify(npmPublishStep.env ?? {}),
    /NPM_TOKEN|NODE_AUTH_TOKEN/,
    'npm publish step must not reference the retired NPM_TOKEN secret',
  );
});
```

### Anti-Patterns to Avoid

- **Treating the branch-protection required-check list as "add all Phase 20/21 job names and done":** matrix jobs report as `"test (20)"`, `"test (22)"`, `"test (24)"` (job id + matrix value), not `"test"` — the literal string `test` will never match a check run and the required check will hang in "Expected — Waiting for status to be reported" forever. Confirm exact check names from a real run's Checks tab or `gh api repos/{owner}/{repo}/commits/{sha}/check-runs` before configuring.
- **Enforcing branch protection on administrators without deciding to do so on purpose:** see Common Pitfalls — this silently breaks the already-shipped `release` skill's direct-push flow.
- **Running the gitleaks "final" rescan before the last content-changing commit of the phase:** D-08 is explicit that the recorded SHA must equal the flipped HEAD — a scan run, then one more doc fix committed, then flip, reopens exactly the "unscanned trailing-commit window" D-08 exists to close.
- **Adding `--provenance` and assuming it changes behavior:** per npm's own docs, trusted publishing from a public GitHub Actions repo generates provenance automatically; `--provenance` is a harmless, idempotent no-op in that context. Add it anyway (PUB-05's literal wording asks for it, and it's honest self-documentation for a future reader who doesn't know the automatic behavior) — just don't expect it to be the mechanism that makes provenance happen.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|--------------|--------------|-----|
| Full-history secret detection | A custom regex/entropy scanner over `git log -p` | `gitleaks git .` | 150+ maintained detection rules, sub-second on this repo size (verified: 403 commits, 3.97MB, 325ms), zero network calls |
| npm publish authentication | A custom OIDC token exchange client | `npm publish` (npm CLI ≥ 11.5.1 handles the OIDC handshake internally once the workflow has `id-token: write` and npmjs.com has a matching Trusted Publisher record) | npm's own CLI is the only supported client for this exchange; there is no documented lower-level API to hand-roll against |
| Provenance attestation generation/signing | Any custom Sigstore/cosign signing step | Automatic generation by `npm publish` during OIDC trusted publishing from a public repo | Requires no extra step at all — added complexity would be strictly redundant |
| Branch protection required-check matching | A custom script polling check-run statuses before allowing merge | GitHub's native branch protection `required_status_checks.checks` (exact context-name array) | Native, atomic with the merge button; a custom poller would race the same check-run API GitHub already gates on |

**Key insight:** every mechanism this phase needs is either a maintained standalone security tool (`gitleaks`) or a platform-native feature (GitHub branch protection, npm trusted publishing) — there is no code-level "don't hand-roll" surface here in the usual `src/` sense; the discipline is procedural (checkpoint ordering, exact string matching for check names and workflow filenames) rather than algorithmic.

## Common Pitfalls

### Pitfall 1: Branch protection required-PR enforcement silently breaks the existing direct-push release flow

**What goes wrong:** Enabling "Require a pull request before merging" + "Require status checks to pass" on `main`, with the (non-default, but easy to check) "Do not allow bypassing the above settings" option enabled, blocks **all** direct pushes to `main` — including the repo-owning maintainer's own `git push --follow-tags` in `skills/release/SKILL.md` Step 4 (Phase 21's already-shipped release flow: `npm version` commits directly to `main`, then pushes). The very next release attempt fails with a rejected push.

**Why it happens:** GitHub's branch protection has two independently togglable layers — "require PR + checks" (gates collaborators) and a separate "include administrators / do not allow bypassing" toggle (gates the repo owner too). D-12's phrase "makes the CI gate unbypassable" is ambiguous about which layer it means, and the two defaults point opposite ways: leaving "include administrators" **off** (GitHub's default) preserves the existing solo-maintainer flow; turning it **on** enforces the rule universally and breaks that flow.

**How to avoid:** Configure branch protection with "Require a pull request before merging" + required status checks (the four Phase 20 job/matrix check names) **but leave "Do not allow bypassing the above settings" unchecked** (GitHub's default) — this satisfies D-12's actual purpose (external contributions and any collaborator PRs must pass green CI) without requiring a rewrite of the Phase-21 release skill. Record this as an explicit, deliberate choice in the phase's decision trail (not a default left unexamined), since it is exactly the kind of setting an operator could flip either way without realizing the release-flow consequence.

**Warning signs:** The next `git push --follow-tags` in a real release returns a "protected branch" rejection instead of succeeding.

### Pitfall 2: `gitleaks` does not scan commit author/committer metadata — a real, live finding in this repo

**What goes wrong:** A maintainer might assume "gitleaks clean" means "nothing personally identifying is in the history." Gitleaks scans diff *content* (file additions/changes per commit), not commit *headers*. Live-verified in this repo: `git log --all --format='%ae|%ce'` returns exactly two distinct addresses across all 412 commits — `jeremie@studiometa.fr` (the git-config author/committer email used for the majority of recent commits) and `noreply@github.com` — neither of which gitleaks flags, because neither appears in a diff.

**Why it happens:** Git commit metadata (author name/email, committer name/email) is a separate data structure from the tree/blob content gitleaks walks; "full history scan" tools targeting *secrets* are, by design, scoped to content that could be a credential, not to headers that are always plaintext by git's own design.

**How to avoid:** Treat D-04's "one mechanical history pass" as needing to include `git log --all --format='%ae|%ce' | sort -u` (or equivalent) specifically, not just `git log -p` content grep. Surface the result to the maintainer as an explicit decision point: `jeremie@studiometa.fr` will become publicly attributed to every recent commit once the repo flips (distinct from the `jeremiew@pm.me` address already intentionally public in `marketplace.json`). Since D-01/D-06 already forbid history rewrite, the only real choices are: accept it (record the acceptance, e.g. as a line in the D-02 PROJECT.md row or the phase's PII-sweep record), or change `git config user.email` going forward (does not affect already-pushed commits without a rewrite this phase explicitly rejects).

**Warning signs:** None automated — this is exactly the class of finding a human skim (D-03) exists to catch, not a scanner.

### Pitfall 3: README's "Publish to npm" section is already stale — a near-certain walkthrough finding

**What goes wrong:** `README.md` lines 173-183 ("Publish to npm") documents the **pre-Phase-21** flow: `npm version` → dogfood → **`npm publish`** (local) → `git push --follow-tags`. Phase 21 rewrote `skills/release/SKILL.md` so the local flow ends at `git push --follow-tags` with **no local `npm publish`** — CI does the publishing. A logged-out stranger reading the README today would be told an inaccurate maintainer workflow (this doesn't block their own `npm i -g` install, but it's exactly the "accuracy fixes" D-11 exists to catch).

**Why it happens:** The README wasn't updated when Phase 21 changed the release skill it summarizes — a doc-drift gap of the same shape Phase 17's doc-sync test was built to catch for `skill-schema.md`, but README's "Publish to npm" section has no equivalent automated drift guard.

**How to avoid:** Include this section explicitly in the D-11 README accuracy pass — replace the local-`npm publish` line with the actual current flow (tests → bump → push; CI publishes) or a pointer to the now-current `release` skill.

**Warning signs:** Walkthrough step "follow README's publish instructions" produces a workflow that doesn't match what actually happens.

### Pitfall 4: OIDC config/workflow-filename mismatch → silent 404/401 on the first real (ship-time) publish

**What goes wrong:** npm's Trusted Publisher record must match the workflow **filename** exactly (`ci.yml`, not a display name, not a path variant) and the exact org/repo. A typo or a later workflow rename breaks the OIDC exchange invisibly until the first real publish attempt — which, per D-13, is the v0.0.6 ship tag, i.e. **after** this phase's own verification loop has already closed. [CITED: docs.npmjs.com/trusted-publishers/]

**How to avoid:** Configure the Trusted Publisher's "Workflow filename" field as exactly `ci.yml` (this repo keeps everything in one workflow file, confirmed — no separate `publish.yml`); leave "Environment name" blank (no GitHub Environment is declared anywhere in `ci.yml`); select "npm publish" under "Allowed actions." Since the live proof can't happen until ship, the plan should record the *static* configuration as this phase's verifiable artifact and explicitly flag the live-publish outcome as a ship-time follow-up, not silently assume it will work.

**Warning signs:** (at ship time, out of this phase's window) `npm publish` in the tag-triggered CI run returns 404/401 despite everything "looking" configured.

### Pitfall 5: `repository` field shorthand form — unresolved nuance flagged, not confirmed either way

**What goes wrong:** `package.json`'s `"repository": "github:jeremiewerner/motto"` is npm-shorthand, not the expanded `git+https://github.com/...` form shown in npm's own Trusted Publisher setup examples. Prior milestone research flagged this as an open nuance (MEDIUM confidence — not independently confirmed whether npm's matching logic normalizes the shorthand before comparing against the Trusted Publisher record).

**How to avoid:** Not a blocker for configuring the Trusted Publisher record itself (the record matches against org/repo/workflow-filename from the GitHub Actions OIDC token claims, not directly against `package.json`'s `repository` field for the *authorization* decision) — but worth a dry-run mental note. If the ship-time publish 404s for no other obvious reason, this field is the first thing to check/expand.

## Code Examples

### ci.yml publish job — target shape after the OIDC diff

```yaml
# Source: this repo's .github/workflows/ci.yml, publish job, with the OIDC
# migration applied per CONTEXT.md's Claude's-Discretion scope (id-token:
# write, drop NODE_AUTH_TOKEN, --provenance placement). npm_guard/
# version_guard/gh_guard structure is unchanged verbatim.
publish:
  needs: [test, dogfood, pack-install-e2e]
  if: startsWith(github.ref, 'refs/tags/v')
  runs-on: ubuntu-latest
  permissions:
    contents: write   # gh release create (unchanged from Phase 21)
    id-token: write    # NEW — OIDC token for npm trusted publishing
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: 24              # already ships npm >=11.5.1
        registry-url: 'https://registry.npmjs.org'
        cache: 'npm'
    - run: npm ci
    - name: Guard — tag must match package.json version
      id: version_guard
      run: |
        PKG_VERSION=$(node -p "require('./package.json').version")
        if [ "v$PKG_VERSION" != "$GITHUB_REF_NAME" ]; then
          echo "::error::tag $GITHUB_REF_NAME does not match package.json version $PKG_VERSION" >&2
          exit 1
        fi
    - name: Guard — skip npm publish if version already exists
      id: npm_guard
      run: |
        PKG_VERSION=$(node -p "require('./package.json').version")
        if npm view "@jeremiewerner/motto@$PKG_VERSION" version >/dev/null 2>&1; then
          echo "already_published=true" >> "$GITHUB_OUTPUT"
        else
          echo "already_published=false" >> "$GITHUB_OUTPUT"
        fi
    - name: npm publish
      if: steps.npm_guard.outputs.already_published == 'false'
      run: npm publish --provenance
      # NODE_AUTH_TOKEN / secrets.NPM_TOKEN REMOVED — OIDC handles auth.
      # NPM_TOKEN secret is NOT deleted yet (D-15: stays as a manual escape
      # hatch until the first successful OIDC publish at ship time).
    - name: Guard — skip GitHub Release if it already exists
      id: gh_guard
      run: |
        if gh release view "$GITHUB_REF_NAME" >/dev/null 2>&1; then
          echo "already_released=true" >> "$GITHUB_OUTPUT"
        else
          echo "already_released=false" >> "$GITHUB_OUTPUT"
        fi
      env:
        GH_TOKEN: ${{ github.token }}
    - name: Create GitHub Release
      if: steps.gh_guard.outputs.already_released == 'false'
      run: gh release create "$GITHUB_REF_NAME" --generate-notes
      env:
        GH_TOKEN: ${{ github.token }}
```

### Branch protection via `gh api` (scriptable alternative to Settings UI)

```bash
# Source: GitHub REST API docs, branch-protection endpoint; exact check-name
# array must be confirmed from a real run first (see Pitfall: matrix naming).
gh api repos/jeremiewerner/motto/branches/main/protection \
  --method PUT \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "test (20)" },
      { "context": "test (22)" },
      { "context": "test (24)" },
      { "context": "dogfood" },
      { "context": "pack-install-e2e" }
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON
```
`"enforce_admins": false` is the deliberate Pitfall-1 mitigation — required checks apply to collaborator PRs; the repo owner's existing direct-push release flow is unaffected. `npm-drift` is deliberately excluded from the required-check list: it only runs `if: github.ref == 'refs/heads/main'`, so on every PR-triggered run the job is skipped — GitHub reports a skipped job as a passing status check [CITED: docs.github.com, cross-checked via community sources], making it a harmless no-op if included but adding no real protection on PRs either way; omitting it keeps the required-check list honest about what's actually being enforced pre-merge.

### Live-verified gitleaks scan record shape

```
$ gitleaks git . --exit-code 0
403 commits scanned.
scanned ~3973101 bytes (3.97 MB) in 325ms
no leaks found
```
(Run against this repo's HEAD `97c71fd616ad3f9353e19f4a8b569f98e231efdd` during this research, gitleaks 8.30.1, JSON report `[]`. Confirms the command shape and expected log format the phase's own committed record should match — but is not itself the phase's required D-08 final scan, since HEAD will have advanced.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|--------------------|----------------|--------|
| `NPM_TOKEN` (granular access token) via `NODE_AUTH_TOKEN` env | npm trusted publishing (OIDC), `id-token: write`, no stored secret | This phase (PUB-05) | Removes the last long-lived credential from the publish pipeline; short-lived, workflow-scoped tokens replace it |
| GitHub secret scanning as the only safety net | Pre-flight `gitleaks git .` full-history scan + GitHub's automatic post-flip scanning | This phase (OPEN-01) | GitHub's own scanning only activates *after* a repo goes public — the pre-flight scan is the only check that runs before exposure, not after |
| Implicit/default `.planning/` visibility | Explicit recorded decision (D-01/D-02) | This phase (OPEN-02) | Matches the milestone's stated principle that a one-way door needs an examined choice, not a default |

**Deprecated/outdated:**
- `NPM_TOKEN` as a permanent mechanism: explicitly interim per Phase 21's own framing; this phase is its planned retirement, not a new decision.
- README's "Publish to npm" local-`npm publish` instructions: stale since Phase 21's release-skill rewrite (see Pitfall 3) — this phase is the natural place to fix it (D-11).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|-----------------|
| A1 | `package.json`'s `"repository": "github:jeremiewerner/motto"` shorthand form does not block npm Trusted Publisher matching | Common Pitfalls (Pitfall 5) | If wrong, the ship-time OIDC publish 404s and the `repository` field needs expanding to the full `git+https://...` form as a follow-up fix — low severity, easily diagnosed, but only discoverable at ship time per D-13's deferred-verification design |
| A2 | GitHub's default "do not enforce on administrators" branch-protection posture is what D-12 intends (vs. universal enforcement) | Common Pitfalls (Pitfall 1), Architecture Patterns | If the maintainer actually wants universal enforcement, the plan must additionally rewrite the release skill's Step 4 to route through a PR — a materially larger scope than currently planned; flagged here so the planner surfaces this choice explicitly rather than picking silently |
| A3 | `npm-drift`'s job-level `if: github.ref == 'refs/heads/main'` causes it to report as a passing ("skipped") status check on PR-triggered runs, not a stuck/pending one | Code Examples (branch protection) | If wrong (e.g., a GitHub policy change reverts this behavior), including `npm-drift` in a required-check list would hang every PR in "Expected — Waiting for status to be reported"; mitigated here by recommending it simply not be added to the required list at all, sidestepping the question |

**Confirmed via live tooling this session (not assumptions):** gitleaks 8.30.1 installed and scans this repo clean (403 commits, 0 findings); `gh` CLI authenticated with `workflow`/`repo` scopes; repo currently PRIVATE (confirmed via `gh repo view`); no `.gitleaks.toml`/`.gitleaksignore` exists; branch `main` currently has no protection rule configured (404 on the protection endpoint) — this phase is configuring it from a clean slate, not modifying an existing rule.

## Open Questions

1. **Should the repo-visibility flip itself be a `checkpoint:human-verify` task, or can it be scripted via `gh repo edit --visibility public --accept-visibility-change-consequences`?**
   - What we know: `gh repo edit` supports a `--visibility` flag; the `--accept-visibility-change-consequences` flag exists specifically to allow scripting a change that would otherwise require an interactive confirmation.
   - What's unclear: whether the maintainer wants the literal flip click to remain a manual, deliberate human action (matching the "one-way door" gravity CONTEXT.md repeatedly emphasizes) even though it is technically automatable.
   - Recommendation: treat it as a `checkpoint:human-verify` regardless of technical feasibility — CONTEXT.md's repeated framing ("the flip click... are operator actions" in Claude's Discretion) already answers this in favor of a human action, not a scripted one; noting the technical alternative here only so the planner doesn't have to re-research it later if that framing is revisited.

2. **Does D-15's "Token stays as fallback through the ship publish only" imply the workflow itself should retain a token-auth fallback branch, or only that the secret isn't deleted yet?**
   - What we know: D-15's own next sentence says "revoke... AND delete the GitHub secret" happens "after the first successful OIDC publish" — i.e., a sequencing statement about *when* to delete, not a request for a coded fallback path in `ci.yml`.
   - What's unclear: nothing materially — this is resolved by reading D-15 as sequencing, not architecture. Recorded here only to make explicit that the Code Examples' ci.yml diff (pure OIDC, no conditional token branch) is the correct interpretation, not an oversight.
   - Recommendation: implement pure OIDC in `ci.yml` (no token-auth code path at all); the "fallback" is operational (the secret still exists so a human could manually intervene if OIDC fails at ship time), not a second code branch.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|------------|---------|-----------|
| `gitleaks` | OPEN-01 scan | ✓ [VERIFIED: local] | 8.30.1 | Docker (`ghcr.io/gitleaks/gitleaks`) if the local binary is ever unavailable |
| `gh` CLI (authenticated) | Branch protection, secrets, release checks, repo visibility | ✓ [VERIFIED: local `gh auth status`] | — (scopes: gist, read:org, repo, workflow) | GitHub Settings UI for any action `gh` can't reach |
| `npm` CLI | Trusted publishing floor (≥ 11.5.1) | ✓ locally [VERIFIED: `npm --version` → 11.11.0]; ✓ in CI (Node 24 pin, established Phase 21) | 11.11.0 local / npm 11.x in CI | — |
| Node.js | Runtime for `npm`/CI | ✓ [VERIFIED: local `node --version` → v24.14.1] | v24.14.1 local | — |
| GitHub repo admin access | Branch protection, visibility flip, secrets | ✓ (repo owner, confirmed via successful `gh api` calls) | — | — |
| npmjs.com package admin access | Trusted Publisher config, publishing-access lockdown | Not verified in this session (requires npmjs.com login, outside this tool's reach) — assumed available since the maintainer already manages `NPM_TOKEN` on this package | — | If unavailable, PUB-05 cannot proceed at all — this would be a phase-blocking discovery, not a fallback scenario |

**Missing dependencies with no fallback:** None identified as missing.

**Missing dependencies with fallback:** None — all required tooling confirmed present.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|-----------------|---------|---------------------|
| V4 Access Control | Yes | Branch protection (required PR + status checks on `main`); npm publishing-access lockdown to trusted-publisher-only (D-16); npm Trusted Publisher record scoped to exact org/repo/workflow-filename |
| V6 Cryptography | Yes (via platform, not hand-rolled) | OIDC token exchange (short-lived, workflow-scoped JWT) replaces a long-lived static secret; provenance attestations signed by Sigstore's public-good instance — never hand-roll signing, this is entirely npm CLI + GitHub Actions native behavior |
| V14 Configuration | Yes | Workflow `permissions:` scoped to job level (`id-token: write` only on the `publish` job, not workflow-wide); `contents: read` remains the workflow default |
| V2 Authentication | No | No end-user authentication surface in this phase — OIDC here authenticates a CI *workflow* to npm's registry, not a human user |
| V3 Session Management | No | Not applicable — no session concept in this phase's scope |

### Known Threat Patterns for this phase's stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Long-lived publish credential leaked/misused | Elevation of Privilege | OIDC trusted publishing (short-lived, per-run tokens); this phase's entire PUB-05 purpose |
| Historical secret exposed by a public visibility flip | Information Disclosure | Full-history `gitleaks` scan before flip (OPEN-01); rotate-not-purge on any hit (D-06) |
| Branch-protection bypass via unscoped admin exception, or conversely an over-broad enforcement breaking the legitimate release path | Tampering / Denial of Service (of the release process itself) | Explicit, deliberate choice of `enforce_admins: false` scoped to preserve the known-good release flow while still gating collaborator PRs (Pitfall 1) |
| OIDC Trusted Publisher misconfiguration (wrong workflow filename/org/repo) impersonation or publish failure | Spoofing / Denial of Service | Exact-match configuration verified against the live `ci.yml` filename; npm's own matching is strict by design (no wildcard/fuzzy match) |
| PII (personal email) baked into public commit history | Information Disclosure (privacy, not credential) | No technical mitigation available without history rewrite (explicitly rejected, D-01/D-06) — mitigation here is informed maintainer consent, recorded as part of the phase's decision trail |

## Sources

### Primary (HIGH confidence)
- Local live verification this session: `gitleaks version` (8.30.1), `gitleaks git .` full scan (403 commits, 0 findings, HEAD `97c71fd`), `gh auth status`, `gh repo view jeremiewerner/motto` (confirms PRIVATE), `gh api repos/jeremiewerner/motto/branches/main/protection` (confirms no existing rule), `npm --version` (11.11.0), `node --version` (v24.14.1), `git log --all --format='%ae|%ce'` (PII sweep), `git log -p --all` grep pass (emails/URLs)
- Direct codebase inspection: `.github/workflows/ci.yml`, `skills/release/SKILL.md`, `test/ci-workflow.test.js`, `package.json`, `README.md`, `.claude-plugin/marketplace.json`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, prior-phase CONTEXT/RESEARCH files (Phase 20, Phase 21)
- `docs.npmjs.com/trusted-publishers/` (WebFetch, this session) — exact Trusted Publisher UI fields, required workflow permissions, publishing-access lockdown steps, automatic provenance behavior. Confidence: HIGH (official npm docs, directly fetched).
- `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`, `.planning/research/SUMMARY.md` — milestone-level research (2026-07-03) already covering OIDC requirements, gitleaks tool choice, and the 7 cross-phase pitfalls; re-verified against this phase's live repo state rather than re-researched from scratch.

### Secondary (MEDIUM confidence)
- GitHub required-status-check skip-as-pass behavior — WebSearch synthesis this session, cross-checked across docs.github.com's own troubleshooting page and independent community write-ups (emmer.dev, GitHub community discussions #26698/#57334). Confidence: MEDIUM-HIGH (consistent across official docs + multiple independent sources).
- `repository` field shorthand-matching nuance for Trusted Publisher — carried from prior milestone research (STACK.md), explicitly flagged there as unconfirmed; not independently re-resolved this session.

### Tertiary (LOW confidence)
- None — all claims in this document are either live-verified this session, directly cited from official docs, or explicitly logged in the Assumptions table above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, every tool version-confirmed live on this machine
- Architecture (sequencing, checkpoints): HIGH — pattern directly precedented by Phase 21-03's already-shipped `NPM_TOKEN` checkpoint
- Pitfalls: HIGH for the three live-discovered items (branch-protection/release-flow conflict, commit-metadata PII, stale README section — all confirmed against this repo's actual state, not inferred); MEDIUM for OIDC config-drift (well-documented pattern, but its live proof is out of this phase's window per D-13)

**Research date:** 2026-07-04
**Valid until:** 14 days (repo visibility state, branch protection state, and npm registry policy around Trusted Publisher UI are all live/mutable; re-verify immediately before executing if more than 2 weeks elapse)
