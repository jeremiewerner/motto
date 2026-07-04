# Phase 21: Publish Automation & Release Rewrite - Research

**Researched:** 2026-07-04
**Domain:** GitHub Actions tag-triggered npm publish, `NPM_TOKEN`-based auth, idempotent release automation, GitHub Releases API, maintainer-checklist skill rewrite
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| PUB-01 | Pushing a `v*` tag triggers a CI publish job — gated on all other jobs green, pinned to Node 24 (npm ≥11.5.1), idempotent via version-existence guard (`npm view` before publish; re-runs safe) | Architecture Patterns §1-2; Code Examples §1; Common Pitfalls 1-3; verified live this session (`npm view <pkg>@<nonexistent-version>` → exit 1) |
| PUB-02 | `release` skill rewritten — local flow is tests → bump → tag → `git push --follow-tags` only; publish step removed from laptop; skill documents the CI handoff and the publish-failure recovery runbook (re-run job; never re-tag) | Architecture Patterns §3; Code Examples §3; Common Pitfalls 4-5 |
| PUB-03 | D-05 tarball leak assertion moves from the release skill's inline heredoc to a committed script run by the CI pack-E2E job | Architecture Patterns §4; Code Examples §2; existing `scripts/pack-install-e2e.mjs` comment already earmarks the exact slot |
| PUB-04 | Each published version gets a GitHub Release with auto-generated notes (`gh release create --generate-notes` from the publish job) | Architecture Patterns §2; Code Examples §1; Common Pitfalls 3 |

</phase_requirements>

## Summary

This phase adds exactly one new job (`publish`) to the existing `.github/workflows/ci.yml`, extends the existing `push` trigger with a `tags: ['v*']` filter, extends the already-committed `scripts/pack-install-e2e.mjs` with the D-05 tarball-leak assertion (the script already captures the exact data needed — a comment left by Phase 20 says so explicitly), adds an `if: github.ref == 'refs/heads/main'` guard to the existing `npm-drift` job so it doesn't fire redundantly on tag pushes, and rewrites `skills/release/SKILL.md` to stop at `git push --follow-tags`. No new npm dependencies. No changes under `src/`.

The one design fact that must be gotten right, verified this session against GitHub's own documentation and community-confirmed practice: **a single `on: push: { branches: [main], tags: ['v*'] }` config, combined with a single `git push --follow-tags`, produces two separate workflow runs** — one for the `refs/heads/main` ref, one for the `refs/tags/vX.Y.Z` ref. `needs:` only resolves within a single workflow run, so the `publish` job's `needs: [test, dogfood, pack-install-e2e]` gate is satisfied by the *tag-triggered* run's own sibling jobs re-validating the exact tagged commit — not by reusing results from the branch-push run that happened moments earlier. This means release tags pay for a second, redundant full CI pass (test matrix × dogfood × pack-install-e2e) — an accepted, documented tradeoff, not a bug, and the only correct way to get a same-ref, same-run gate without `workflow_run` cross-workflow complexity.

The second design fact requiring care: idempotency has **two independent halves**, not one. `npm publish` is guarded by a `npm view <pkg>@<version>` existence check (verified live this session: querying a nonexistent version exits 1 with `E404`). `gh release create` is a *separate* operation that fails loudly if a release for that tag already exists — it needs its own existence check (`gh release view <tag>`), gated independently of the npm-publish guard. A single shared "already done" flag covering both steps would silently skip re-attempting a GitHub Release that failed to create even though `npm publish` had already succeeded on a prior run — exactly the kind of partial-failure state the recovery runbook (PUB-02) must not paper over.

**Primary recommendation:** Add a `publish` job to the existing `ci.yml`, pinned to Node 24, gated with `needs: [test, dogfood, pack-install-e2e]` + `if: startsWith(github.ref, 'refs/tags/v')`, using two independently-idempotent steps (`npm view` guard before `npm publish`; `gh release view` guard before `gh release create --generate-notes`), authenticated via a project-scoped granular `NPM_TOKEN` secret (must be created by the maintainer before this phase's publish job can succeed — `gh secret list` confirms zero secrets exist on the repo today).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tag-triggered publish gate | CI Orchestration (GitHub Actions `publish` job) | npm Registry (external, authenticated write) | The job's entire job is sequencing: wait for sibling jobs, then perform one authenticated write to an external service |
| Idempotency guard (`npm view`) | CI Orchestration | npm Registry (external, read-only) | A read against the registry decides whether the write step runs at all — this logic lives in the workflow/script, not in `src/` |
| Tarball-leak assertion (D-05) | CI Orchestration (`scripts/pack-install-e2e.mjs`) | npm Package Boundary (`files` allowlist) | Same packaging-boundary concern already established in Phase 20's research — now absorbing the assertion Phase 20 deliberately deferred |
| GitHub Release creation | CI Orchestration | GitHub Releases API (external, authenticated write via `GITHUB_TOKEN`) | A second, independent external write, must not share a success/failure flag with the npm publish write |
| Local release checklist | Local Dev Tooling (`skills/release/SKILL.md`) | CI Orchestration (as the trigger it hands off to) | The skill's only remaining responsibility is producing a correctly-tagged, tested commit and pushing it — everything downstream is CI's job |
| Publish-failure recovery | Local Dev Tooling (maintainer runbook, documented in skill) | CI Orchestration (`gh run rerun --failed`) | Recovery is a maintainer decision guided by documented steps, executed via `gh` against the existing CI run — never a new git operation |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `actions/checkout` | `v6` [CITED: .planning/research/STACK.md, same-milestone research; unchanged from Phase 20] | Checkout the tagged ref in the `publish` job | Already in use in every other job in `ci.yml`; no reason to diverge |
| `actions/setup-node` | `v6` with `node-version: 24`, `registry-url: 'https://registry.npmjs.org'` | Installs Node 24 (ships npm ≥11.x, satisfying the ≥11.5.1 floor documented for npm trusted publishing, and more than sufficient for a `NPM_TOKEN`-based publish) and pre-generates an `.npmrc` wired to read `NODE_AUTH_TOKEN` | [VERIFIED: npm registry — `npm --version` on this Node 24.14.1 machine reports 11.11.0]; `registry-url` + `NODE_AUTH_TOKEN` is `setup-node`'s own documented publish-auth pattern, avoiding hand-rolled `.npmrc` file generation |
| `gh` CLI (GitHub CLI) | Preinstalled on `ubuntu-latest` runners | `gh release create --generate-notes`, and (for the recovery runbook) `gh run rerun --failed` | [VERIFIED: local `gh --help` this session confirms both subcommands exist with the exact flags needed]; zero added supply-chain surface — explicitly called out as Out of Scope to replace with a third-party Action in `.planning/REQUIREMENTS.md` |
| Node stdlib (no new modules) | — | The idempotency guard and any inline logic needed | Same `run()`/JSON-parsing patterns already proven in `scripts/pack-install-e2e.mjs`/`scripts/npm-drift-check.mjs` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `npm view <pkg>@<version> version` | npm (bundled) | Idempotency guard for `npm publish` | [VERIFIED live this session]: querying an unpublished version returns exit code 1 with `npm error code E404`; querying a published version (`0.0.3`, current registry state) returns exit 0 with the version string on stdout. Use `npm view ... >/dev/null 2>&1` and branch on `$?`. |
| `gh release view <tag>` | `gh` CLI (bundled) | Idempotency guard for `gh release create` | [VERIFIED: `gh release view --help` this session] — exits non-zero if no release exists for the given tag; use as the independent guard for the release-creation step, separate from the npm guard |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `NPM_TOKEN` (classic-scoped-down / granular access token) secret | npm trusted publishing (OIDC, `id-token: write`) | Rejected for this phase per the locked milestone sequencing (`.planning/STATE.md`, `.planning/research/STACK.md` Q2): OIDC trusted publishing works on private repos, but its main benefit — automatic `--provenance` attestation — requires a **public** repo (Sigstore's public-good instance signs and logs to a public transparency log). Motto is still private (flips public in Phase 22). PUB-05 explicitly migrates to OIDC after the flip. Building the publish job with `NPM_TOKEN` now, structured so the auth swap later is a small diff (drop `NODE_AUTH_TOKEN`, add `id-token: write` + rely on `registry-url` alone), is the correct interim. |
| Separate `release.yml` workflow, triggered independently on tag push | Single `ci.yml` with a `publish` job gated by `needs:` | Rejected — `needs:` only resolves within one workflow run. A separate file re-running the full test suite on the tag ref achieves nothing `needs:` in the same file doesn't already achieve, and it forfeits guaranteed evaluation against the *exact* jobs that are supposed to gate publish. [CITED: .planning/research/ARCHITECTURE.md, Anti-Pattern 1] |
| Sharing one "already released" flag for both `npm publish` and `gh release create` | Two independent existence guards (`npm view` for npm, `gh release view` for GitHub Releases) | A shared flag causes a real bug: if `npm publish` succeeds but `gh release create` fails (network blip, `GITHUB_TOKEN` permission issue), a naive re-run using one shared "already published" check would skip *both* steps on retry, since the npm check alone would now report "already published" — silently leaving the GitHub Release permanently uncreated. |
| `softprops/action-gh-release` or similar third-party Action for the release step | `gh release create --generate-notes` (CLI, preinstalled) | Explicitly out of scope per `.planning/REQUIREMENTS.md` ("Third-party release-notes actions... `gh` CLI preinstalled on runners; zero added supply-chain surface") |

**Installation:**
No installation required — this phase adds zero new `package.json` dependencies and zero new third-party GitHub Actions. `gh` and `npm` are preinstalled on `ubuntu-latest` runners; `actions/checkout`/`actions/setup-node` are already referenced in `ci.yml`.

**Version verification:** `actions/checkout@v6`/`actions/setup-node@v6` are unchanged from Phase 20 (no re-verification needed — same major versions, no npm/PyPI/crates registry lookup applies to GitHub Actions references). `npm view`/`gh release view`/`gh run rerun` behaviors were independently re-verified live this session (see Sources), not merely inherited from prior research.

## Package Legitimacy Audit

**Not applicable — this phase adds zero new npm/PyPI/crates packages.** All new capabilities (publish job, idempotency guards, GitHub Release creation, extended pack-E2E script) are either GitHub Actions references already in the repo, or `npm`/`gh` CLI subcommands (bundled tools, not installable packages). No `npm install` of any new dependency occurs.

## Architecture Patterns

### System Architecture Diagram

```
  maintainer runs `release` skill (local, rewritten — PUB-02)
      │
      ├─ Step 1: node --test                         (unchanged — pre-release gate)
      ├─ Step 2: npm version X.Y.Z                   (unchanged — bump + tag, local commit)
      └─ Step 3: git push --follow-tags               ◄── HANDOFF POINT (fire-and-forget)
                      │
                      ▼
      GitHub receives TWO ref updates from one push
      ┌─────────────────────────────┐   ┌──────────────────────────────────┐
      │ Run A: ref = refs/heads/main │   │ Run B: ref = refs/tags/vX.Y.Z     │
      │ (branch-push trigger)        │   │ (tag-push trigger)                │
      │                              │   │                                    │
      │ test(20/22/24) ∥ dogfood ∥   │   │ test(20/22/24) ∥ dogfood ∥        │
      │ pack-install-e2e ∥           │   │ pack-install-e2e ∥                │
      │ npm-drift (if: ref==main)    │   │ npm-drift SKIPPED (if: ref==main) │
      │                              │   │        │                          │
      │ publish job: if condition    │   │        ▼ needs: [test, dogfood,   │
      │ false (not a tag ref)        │   │          pack-install-e2e]        │
      │ → SKIPPED                    │   │        ▼                          │
      └─────────────────────────────┘   │  publish job (Node 24 pinned)     │
                                          │  ┌──────────────────────────┐    │
                                          │  │ npm view <pkg>@<ver>     │    │
                                          │  │  exists? → skip publish  │    │
                                          │  │  missing? → npm publish  │    │
                                          │  ├──────────────────────────┤    │
                                          │  │ gh release view <tag>    │    │
                                          │  │  exists? → skip create   │    │
                                          │  │  missing? → gh release   │    │
                                          │  │    create --generate-notes│   │
                                          │  └──────────────────────────┘    │
                                          └──────────────────────────────────┘
                                                       │
                                     (on failure: job fails visibly in Actions UI;
                                      tag/commit remain valid — recovery = re-run
                                      the job via `gh run rerun <id> --failed`,
                                      NEVER delete/recreate the tag)
                                                       │
                                                       ▼
                              maintainer checks Actions run (NEW skill step)
                              → confirms npm registry + GitHub Release exist
                              → proceeds to Post-Release Housekeeping
```

### Recommended Project Structure

```
.github/
└── workflows/
    └── ci.yml                    # MODIFIED — push trigger gains `tags: ['v*']`;
                                   #   npm-drift job gains `if: github.ref == 'refs/heads/main'`;
                                   #   new `publish` job appended
scripts/
└── pack-install-e2e.mjs          # MODIFIED — adds tarball-leak assertion (PUB-03),
                                   #   reusing the `packedFiles` variable already captured
                                   #   in step (2) (see existing `void packedFiles;` comment)
skills/release/SKILL.md           # REWRITTEN — Steps 1-3 (tests/bump/push) stay local;
                                   #   old Steps 3-5 (dogfood, tarball verify, publish) removed
                                   #   from the maintainer's hands; new "CI Handoff" +
                                   #   "Verify CI Published" + "If CI Publish Fails" sections
```

### Pattern 1: Tag-gated `publish` job in the existing single workflow, `needs:` + `if:` combined

**What:** One new job appended to `ci.yml`, using `needs:` to require the sibling jobs' success within the *same* workflow run, and `if:` to scope execution to tag-triggered runs only.
**When to use:** Whenever release/publish must be strictly gated on the same commit's CI results in a single-workflow-file project (matches this project's "mechanism over features" constraint).
**Example:**
```yaml
# Source: .planning/research/ARCHITECTURE.md Pattern 2 + Q1, adapted to the real ci.yml
# (this session verified the live file — job names below match exactly: test, dogfood,
# pack-install-e2e, npm-drift)

on:
  push:
    branches: [main]
    tags: ['v*']          # NEW — tag pushes now trigger a workflow run of their own
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  # ...existing test / dogfood / pack-install-e2e jobs, unchanged...

  npm-drift:
    if: github.ref == 'refs/heads/main'   # NEW — skip on tag-triggered runs and PRs
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 20
      - run: node scripts/npm-drift-check.mjs

  publish:
    needs: [test, dogfood, pack-install-e2e]     # NOT npm-drift — advisory, never gates (Phase 20 precedent)
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    permissions:
      contents: write        # gh release create needs this — NOT granted at workflow level
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24                        # ships npm >=11.x; PUB-01's Node 24 pin
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'
      - run: npm ci
      - name: Guard — skip npm publish if version already exists
        id: npm_guard
        run: |
          PKG_VERSION=$(node -p "require('./package.json').version")
          if npm view "@jeremiewerner/motto@$PKG_VERSION" version >/dev/null 2>&1; then
            echo "already published — skipping npm publish"
            echo "already_published=true" >> "$GITHUB_OUTPUT"
          else
            echo "already_published=false" >> "$GITHUB_OUTPUT"
          fi
      - name: npm publish
        if: steps.npm_guard.outputs.already_published == 'false'
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - name: Guard — skip GitHub Release if it already exists
        id: gh_guard
        run: |
          if gh release view "${{ github.ref_name }}" >/dev/null 2>&1; then
            echo "release already exists — skipping"
            echo "already_released=true" >> "$GITHUB_OUTPUT"
          else
            echo "already_released=false" >> "$GITHUB_OUTPUT"
          fi
        env:
          GH_TOKEN: ${{ github.token }}
      - name: Create GitHub Release
        if: steps.gh_guard.outputs.already_released == 'false'
        run: gh release create "${{ github.ref_name }}" --generate-notes
        env:
          GH_TOKEN: ${{ github.token }}
```
Two independent guards (`npm_guard`, `gh_guard`) — not one shared flag — so a re-run after a partial failure correctly resumes only the step(s) that didn't already succeed (see Alternatives Considered).

### Pattern 2: Two separate workflow runs from one `git push --follow-tags`

**What:** `git push --follow-tags` typically updates two refs in one underlying git-protocol push: the branch (`refs/heads/main`) and the new tag (`refs/tags/vX.Y.Z`). GitHub Actions evaluates trigger filters per updated ref, producing **two separate workflow runs** when both `branches` and `tags` filters are configured on the same `push` event.
**When to use:** This is not something to "use" — it's a structural fact of the trigger design that must be accounted for, not fought. Do not attempt to suppress the branch-push run's redundant test execution; it's the same "every push runs full CI" guarantee (CIW-01) already established, and suppressing it would require path/ref filtering that risks breaking required-status-checks (already rejected in Phase 20's D-03).
**Verification:** [CITED: docs.github.com/en/actions/using-workflows/events-that-trigger-workflows — "If you define neither tags/tags-ignore or branches/branches-ignore, the workflow will run for events affecting either branches or tags"; cross-confirmed via WebFetch this session]. The claim that a *combined* branch+tag push produces two distinct runs (rather than one run seeing both refs) is [ASSUMED] at HIGH confidence — it is the universally-observed, widely-documented-in-practice behavior for this trigger shape (every tag-triggered-release GitHub Actions tutorial that also runs branch CI relies on exactly this split), but GitHub's own docs do not spell out the multi-ref-single-push case explicitly. **Recommend the plan include a live verification step**: push a test tag early (e.g. during phase execution, before wiring the `publish` job's `if` condition to something irreversible) and confirm two runs appear in the Actions tab, one per ref.

### Pattern 3: Fire-and-forget tag handoff with a re-runnable, never-re-tag recovery model

**What:** The release skill's only obligation after `git push --follow-tags` is documenting how to check on the async result and how to recover from a failure — it does not (and cannot) know synchronously whether publish succeeded.
**When to use:** Any human-triggered step handing off to an asynchronous CI step with no synchronous confirmation.
**Example — recovery runbook content (for the rewritten skill):**
```
If the Actions run for the pushed tag shows the `publish` job failed:
1. Do NOT delete or recreate the git tag. Tags are permanent handoff markers.
2. Diagnose from the Actions UI (or `gh run view <run-id> --log-failed`).
3. If transient (network, registry hiccup) or a fixable config issue (rotate NPM_TOKEN,
   fix a permissions typo): fix root cause if needed, then re-run failed jobs only:
     gh run rerun <run-id> --failed
   This resumes at the failed job, re-using the same ref — no new commit, no new tag.
   Both guard steps (npm view / gh release view) make this safe even if npm publish
   already succeeded before the failure (e.g. GitHub Release step failed after a
   successful npm publish) — only the step(s) that didn't complete will actually run.
4. Escape hatch (emergency only, CI unrecoverable in a reasonable window):
     git checkout vX.Y.Z && npm publish
   Document this as a last resort, not a normal path — it bypasses the D-05 tarball
   assertion enforced in CI's pack-install-e2e job.
```
[VERIFIED: `gh run rerun --help` this session confirms `--failed` flag reruns only failed jobs including their dependencies; `gh release view --help` confirms tag-scoped lookup.]

### Anti-Patterns to Avoid

- **Separate `release.yml` workflow triggered on tag push:** [CITED: .planning/research/ARCHITECTURE.md Anti-Pattern 1] — forfeits same-run `needs:` gating; either redundantly re-runs tests with no connection to the actual gate, or worse, trusts an out-of-band assumption that "the branch CI must have passed."
- **Re-tagging (`git tag -d` / `git push --delete` / re-push) to retry a failed publish:** [CITED: .planning/research/ARCHITECTURE.md Anti-Pattern 2, PITFALLS.md Pitfall 2] — destructive, rewrites a ref other clones may have fetched, obscures the audit trail. Recovery is always re-run-the-job or the documented manual escape hatch, never a new tag of the same version.
- **One shared "already done" flag for both `npm publish` and `gh release create`:** silently strands a never-created GitHub Release on retry after a partial failure (see Alternatives Considered above).
- **Granting `id-token: write` this phase:** not needed — this phase uses `NPM_TOKEN`, not OIDC. Only `contents: write` (for `gh release create`) is needed, scoped to the `publish` job specifically, not the workflow-level `permissions:` block (keeps the existing `contents: read` default for every other job, per least-privilege).
- **Running the publish job on a Node version below 24 "since it's just `npm publish`, not OIDC":** even with `NPM_TOKEN` auth (not OIDC), pin Node 24 anyway per PUB-01's explicit requirement and to keep the auth-mechanism swap to OIDC (PUB-05) a same-Node-version diff later, not a Node-version change bundled with an auth change.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checking whether a package version is already published | A custom HTTP GET against `registry.npmjs.org` + JSON parsing | `npm view <pkg>@<version> version` with exit-code branching | [VERIFIED live this session]: one bundled command, correct exit-code semantics (0 = exists, 1/E404 = doesn't), no new HTTP client code needed — `npm-drift-check.mjs` already proves the project's willingness to use stdlib `fetch` when a *read-only, never-fails* check is wanted (D-12), but here the exit-code-branching shape of `npm view` is simpler for a guard that must produce a boolean, not a value comparison |
| Checking whether a GitHub Release already exists for a tag | Hand-rolled `gh api repos/.../releases/tags/<tag>` + HTTP-status parsing | `gh release view <tag>` (exit code alone is the signal) | [VERIFIED: `gh release view --help` this session] — purpose-built for exactly this check |
| Generating release notes from merged PRs/commits since the last tag | A custom changelog generator (parsing commit messages, PR titles) | `gh release create --generate-notes` | Already the milestone-level decision in `.planning/REQUIREMENTS.md` Out of Scope ("semantic-release / release-please / changesets... release skill + tag trigger is the whole mechanism") and `.planning/research/STACK.md` Q-notes verified this uses GitHub's own Release Notes generation API, zero new code |
| Re-running only the failed step(s) of a release after a transient failure | A custom "detect what already happened, resume from there" script | `gh run rerun <run-id> --failed` (GitHub Actions' own re-run-failed-jobs feature) + the two independent existence guards inside the job (which make each step itself safely skippable on re-entry) | [VERIFIED: `gh run rerun --help` this session] — the platform already tracks per-job pass/fail state within a run; combining it with idempotent guards inside the `publish` job covers both "which jobs to re-run" and "which side effects to skip" |

**Key insight:** Every mechanism this phase needs is either already a bundled CLI subcommand (`npm view`, `gh release view`, `gh release create`, `gh run rerun`) or a GitHub Actions primitive already in use elsewhere in this codebase (`needs:`, `if:`, job-level `permissions:`). The actual engineering risk is not "which tool" but "getting the two-runs-per-push structural fact right" and "keeping the two idempotency guards independent" — both documented above with live verification, not assumption.

## Common Pitfalls

### Pitfall 1: Publish job runs on a Node version whose bundled npm can't authenticate correctly or is simply the wrong pin
**What goes wrong:** If the `publish` job's Node version is left to default or copied from another job (e.g. Node 20, used by `dogfood`/`pack-install-e2e`), `npm publish` may still technically work with `NPM_TOKEN` auth (that floor is npm's OIDC/trusted-publishing requirement, not a hard requirement for token auth) — but PUB-01 explicitly requires Node 24, and leaving the publish job on an inconsistent version now means the later OIDC migration (PUB-05) has to change the Node pin *and* the auth mechanism in the same diff, compounding risk in a later phase.
**Why it happens:** Copy-pasting job YAML from `dogfood`/`pack-install-e2e` (both intentionally pinned to Node 20, the `engines` floor, per Phase 20's D-07) without re-reading PUB-01's own explicit Node-24 requirement.
**How to avoid:** Explicitly set `node-version: 24` in the `publish` job's `setup-node` step; add a one-line YAML comment explaining why this job's Node pin differs from the rest of the workflow (npm ≥11.5.1 floor, future OIDC migration).
**Warning signs:** A future OIDC migration PR whose diff touches both the Node version and the auth mechanism in the same job body — a sign the Node pin should have been done now, ahead of time.

### Pitfall 2: `needs:` referencing job names, not matrix-leg names — matrix job must fully succeed
**What goes wrong:** `needs: [test, dogfood, pack-install-e2e]` refers to the `test` job by its job key, not per-matrix-leg. By default, GitHub Actions matrix jobs use `fail-fast: true` (the current `ci.yml` does not override this), so if any Node 20/22/24 leg fails, the whole `test` job reports failure and `publish` correctly never runs — this is exactly the desired behavior, but is worth confirming explicitly (`fail-fast` is not set to `false` anywhere in the current file) since flipping `fail-fast: false` later for faster matrix-failure diagnosis would not change this gating correctness, only diagnostic speed.
**Why it happens:** Uncertainty about whether `needs: [test]` waits for "the matrix job as a whole" or requires enumerating each leg — it's the former; no per-leg enumeration needed.
**How to avoid:** No YAML change needed beyond confirming `fail-fast` is left at its default (`true`) or, if changed later for diagnostics, confirming `needs: [test]` still means "the whole matrix job, including all legs, succeeded" (it does — `fail-fast` only controls whether remaining legs are cancelled early, not whether the job's overall success requires all legs).
**Warning signs:** A `publish` run triggering even though one matrix leg is visibly red in the Actions UI (would indicate a `needs:`/job-name mismatch, not a `fail-fast` issue).

### Pitfall 3: Two independent external writes (`npm publish`, `gh release create`) sharing recovery logic incorrectly
**What goes wrong:** Already covered in depth above (Alternatives Considered, Pattern 1) — restated here as a pitfall because it is the single highest-risk design mistake in this phase: a shared or missing guard on either write means a retry either duplicate-fails (`npm publish` erroring "cannot publish over previously published version" — annoying but harmless) or, worse, silently never creates the GitHub Release because the guard logic incorrectly inferred "already done" from the npm side alone.
**Why it happens:** It's tempting to treat "the release" as one atomic unit when writing the job YAML, since conceptually a release IS one thing to the maintainer — but the two writes hit two unrelated external systems with no shared transaction.
**How to avoid:** Two `id`-tagged guard steps, two independent `if:` conditions on the two write steps, exactly as shown in Pattern 1's code example. Test explicitly (during phase verification) by simulating a partial failure — e.g., temporarily break the `gh release create` step, run the job, confirm `npm publish` succeeded, then fix and re-run, confirming only the release-creation step re-executes.
**Warning signs:** A published npm version with no corresponding GitHub Release (checkable via `gh release list` vs `npm view <pkg> versions`) after a release that had ANY transient failure during its `publish` job.

### Pitfall 4: `NPM_TOKEN` secret does not exist yet — this phase cannot ship a working publish job without a pre-step
**What goes wrong:** [VERIFIED live this session: `gh secret list --repo jeremiewerner/motto` returns zero secrets]. The publish job as designed will fail on its very first real run (`npm publish` will 401/403 with no `NODE_AUTH_TOKEN` resolving to a valid credential) unless a maintainer creates an npm granular access token (scoped to `@jeremiewerner/motto`, publish-only) and stores it as a GitHub Actions repository secret named `NPM_TOKEN` before the tag-triggered publish is exercised for real.
**Why it happens:** This is an out-of-band, one-time manual setup action (create token on npmjs.com → add secret via `gh secret set NPM_TOKEN` or the GitHub UI) that has no code representation to "remind" a plan — it's easy to write the whole workflow, believe it's done, and then discover on the first real tag push that publish 401s.
**How to avoid:** The plan should include an explicit `checkpoint:human-verify` (or equivalent manual-step marker) instructing the maintainer to create the `NPM_TOKEN` secret before the phase is considered verifiable end-to-end. Verification of the publish job's *logic* can still proceed via `npm publish --dry-run` in a throwaway branch/workflow_dispatch test, but the real tag-triggered path cannot be proven green without the secret existing.
**Warning signs:** First real `v0.0.6` (or whichever version this phase's own release targets) tag push failing at the `npm publish` step with a 401/403 — confirms the secret was never created, not a workflow bug.

### Pitfall 5: Rewritten release skill silently assumes "tag pushed" means "published" (the exact prior real-world failure)
**What goes wrong:** The project's own history (`.planning/STATE.md`, `PITFALLS.md` Pitfall 6) documents that npm is stuck at `0.0.3` while git tags go through `v0.0.5` — a real, already-occurred instance of "tag exists, registry doesn't reflect it," caused by the release skill's old local publish step apparently never actually completing for those versions. The rewritten skill removes the local publish step entirely, which makes this failure mode *more* likely to recur silently unless the skill explicitly closes the loop with a verification step.
**Why it happens:** Once `git push --follow-tags` is the terminal local action, there is no synchronous signal of success — the maintainer has to actively go check the Actions run and the registry.
**How to avoid:** [CITED: .planning/research/ARCHITECTURE.md §4] — add an explicit "Step N: Verify CI Published" step to the rewritten skill: check the Actions run for the pushed tag is green, confirm the version now appears at `https://registry.npmjs.org/@jeremiewerner/motto` (or via `npm view @jeremiewerner/motto version`), confirm the GitHub Release exists (`gh release view vX.Y.Z`) — only then proceed to any "Post-Release Housekeeping" (updating `PROJECT.md`/`MILESTONES.md`). The existing `npm-drift` job (already scoped to `main`-branch pushes) remains the automated backstop for this exact scenario going forward, but the skill's own verification step is the immediate, same-session check.
**Warning signs:** A future maintainer session where `PROJECT.md` says "shipped vX.Y.Z" but `npm view` shows an older version — the precise symptom already observed once in this project's real history.

## Code Examples

### Idempotency guard — verified live this session (npm 11.11.0, real registry)
```bash
# Source: direct execution this session against the real @jeremiewerner/motto package
$ npm view @jeremiewerner/motto version
0.0.3                      # exit 0 — version exists

$ npm view @jeremiewerner/motto@99.99.99 version
npm error code E404
npm error 404 No match found for version 99.99.99
$ echo $?
1                           # exit 1 — safe to branch on for the guard
```

### `gh` CLI subcommands verified this session
```bash
# gh run rerun --failed — confirmed real flag, reruns only failed jobs + their dependencies
$ gh run rerun --help
...
FLAGS
      --failed       Rerun only failed jobs, including dependencies
      -j, --job string   Rerun a specific job ID from a run, including dependencies
...

# gh release view <tag> — confirmed tag-scoped lookup for the idempotency guard
$ gh release view --help
View information about a GitHub Release.
Without an explicit tag name argument, the latest release in the project is shown.
...

# gh release create --generate-notes — confirmed exact flag needed for PUB-04
$ gh release create --help
...
Use `--generate-notes` to automatically generate notes using GitHub Release Notes API.
```

### D-05 tarball-leak assertion — extending the already-committed `scripts/pack-install-e2e.mjs`
```js
// Source: skills/release/SKILL.md Step 4 (current inline heredoc), ported into the
// already-committed pack-install-e2e.mjs, reusing `packedFiles` captured in step (2) —
// see the existing `void packedFiles;` comment at line 136 of the current script, which
// explicitly earmarks this exact slot. No second `npm pack` invocation needed.

const ALLOWED_PREFIXES = ['bin/', 'src/', 'dist/public/'];
const AUTO_INCLUDED = ['package.json', 'README', 'LICENSE', 'CHANGELOG'];

function assertTarballClean(files) {
  const isAllowed = (p) =>
    AUTO_INCLUDED.some((a) => p === a || p.startsWith(a)) ||
    ALLOWED_PREFIXES.some((a) => p.startsWith(a));
  const leaks = files.filter((f) => !isAllowed(f.path));
  if (leaks.length) {
    throw new Error(
      `TARBALL LEAK — ${leaks.length} file(s) outside allowlist:\n` +
        leaks.map((f) => `  ${f.path}`).join('\n'),
    );
  }
}

// Call site: immediately after packManifest is parsed in main(), before the tarball
// is installed into the consumer tmp dir — fail fast, before spending time on the
// rest of the E2E flow.
assertTarballClean(packedFiles);
```
This replaces the release skill's Step 4 (`npm pack --dry-run --json | node -e "..."` heredoc) entirely — PUB-02's rewritten skill documents that this check now lives in CI, not as a maintainer-run step.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Maintainer runs `npm publish` locally after manually verifying tarball contents via an inline heredoc in the release skill | CI publish job runs `npm publish` from a clean checkout, gated on all other CI jobs passing, with the tarball-leak assertion enforced automatically in `pack-install-e2e` on every push (not just at release time) | This phase | Removes "works on my machine" risk entirely from the publish path; the exact D-05 assertion now runs on every commit, not just at the moment of release |
| Tag exists ⇒ assumed published (the actual, already-occurred v0.0.4/v0.0.5 failure mode) | Tag exists ⇒ CI publish job runs; maintainer explicitly verifies the Actions run + registry state before housekeeping | This phase | Closes the exact drift gap that produced the project's real npm-stuck-at-0.0.3 history; the `npm-drift` job (already shipped in Phase 20) becomes the automated long-term backstop |
| Publish failure recovery = undefined/manual improvisation | Publish failure recovery = documented `gh run rerun --failed`, backed by two independently-idempotent guard steps | This phase | Makes a previously ad hoc recovery path a rehearsed, low-risk procedure |

**Deprecated/outdated:**
- The release skill's Step 4 D-05 tarball-verify heredoc (inline `npm pack --dry-run --json | node -e "..."`) is fully retired this phase, replaced by the extended `scripts/pack-install-e2e.mjs` (PUB-03).
- The release skill's Step 5 (`npm whoami` / `npm publish` / `git push --follow-tags`) is fully retired — `npm whoami` in particular becomes unnecessary for the maintainer entirely, since no local npm publish credential is needed anymore once CI owns the publish step.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A single `git push --follow-tags` that updates both `refs/heads/main` and a new `refs/tags/vX.Y.Z` produces two separate GitHub Actions workflow-run evaluations (not one run seeing both refs) | Architecture Patterns §2 | If wrong (one run, one ref context), the `publish` job's `if: startsWith(github.ref, 'refs/tags/v')` might never evaluate true in the way expected, or `needs:` might not resolve against the intended job instances. **Mitigation already built into the plan recommendation:** push an early test tag during phase execution and visually confirm two runs in the Actions tab before treating the gate as proven. |
| A2 | `npm publish` behaves the same (rejecting a duplicate version with a clear error) whether authenticated via `NPM_TOKEN`/`NODE_AUTH_TOKEN` or, later, OIDC — i.e., the idempotency guard's value doesn't depend on which auth mechanism is active | Standard Stack, Alternatives Considered | Low risk — this is standard, well-documented npm registry behavior (a published version is immutable) independent of the client's auth method; not specific to this session's verification but extremely stable platform behavior |
| A3 | `contents: write` alone (no `id-token: write`) is sufficient for `gh release create` when using the default `GITHUB_TOKEN` (`github.token`), with no OIDC/npm scope implications | Architecture Patterns §1 (Anti-Patterns) | Low risk — `id-token: write` is specifically an OIDC-federation permission (npm trusted publishing, cloud provider auth, etc.), unrelated to GitHub's own Releases API, which uses the standard `GITHUB_TOKEN` `contents` scope; this is well-established GitHub Actions permissions-model knowledge, not independently re-verified via a live experiment this session |

## Open Questions

1. **Should the `publish` job's two guard steps use `$GITHUB_OUTPUT` step-outputs (as shown) or a simpler `continue-on-error` + exit-code pattern?**
   - What we know: `$GITHUB_OUTPUT` step-outputs are the current, non-deprecated way to pass a boolean between steps in the same job (the older `::set-output::` workflow command is deprecated).
   - What's unclear: Whether the planner prefers this shape or an equivalent inline `if npm view ...; then ... fi` single-step approach that skips the output-variable indirection entirely (fewer moving parts, same effect, slightly less legible in the Actions UI's step list).
   - Recommendation: Either is correct; the `$GITHUB_OUTPUT` shape shown here mirrors the existing `npm-drift-check.mjs`/`pack-install-e2e.mjs` house style of clear, inspectable named steps, but a single combined step per write is equally valid and slightly shorter. Leave to Claude's Discretion during planning.

2. **Does the rewritten release skill need its own explicit `allowed-tools` addition for `Bash(gh *)`?**
   - What we know: The current `release/SKILL.md` frontmatter declares `allowed-tools: ["Bash(node *)", "Bash(npm *)", "Bash(git *)"]`. The rewritten skill's "Verify CI Published" and "If CI Publish Fails" sections reference `gh run view`/`gh run rerun`/`gh release view` commands as part of the documented maintainer workflow.
   - What's unclear: Whether these are meant to be actually executed by an agent running the skill (requiring `Bash(gh *)` in `allowed-tools`) or are purely instructional prose for a human maintainer reading the skill manually.
   - Recommendation: Add `"Bash(gh *)"` to `allowed-tools` — the skill's `template: procedure` pattern (established in Phase 14) is designed for exactly this kind of maintainer-run, tool-assisted checklist, and the verification/recovery steps are far more useful if actually runnable, not just documented.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `gh` CLI (local + CI) | Publish job (`gh release create`, guard), recovery runbook (`gh run rerun`) | ✓ (local: verified this session; CI: preinstalled on `ubuntu-latest`) | local: confirmed working this session | — |
| `npm` ≥ 11.x (CI publish job specifically) | `npm publish` auth via `NODE_AUTH_TOKEN`, `npm view` guard | ✓ via `actions/setup-node@v6` with `node-version: 24` | Node 24 ships npm 11.x [VERIFIED: local Node 24.14.1 → npm 11.11.0] | If Node 24's bundled npm ever regresses below 11.x, add an explicit `npm install -g npm@latest` step (documented in `.planning/research/PITFALLS.md` Pitfall 1) |
| `NPM_TOKEN` GitHub Actions secret | `npm publish` step | ✗ — [VERIFIED: `gh secret list` returns empty] | — | None — this is a hard blocker for the real publish path; must be created by the maintainer as a pre-phase or in-phase manual step (see Common Pitfalls 4) |
| `GITHUB_TOKEN` / `github.token` | `gh release create`/`gh release view` in the publish job | ✓ (automatically provided by GitHub Actions to every workflow run; needs `contents: write` permission scoped to the job) | — | — |
| GitHub repo `jeremiewerner/motto` visibility = private | Confirms trusted-publishing/OIDC is correctly deferred to Phase 22 | ✓ [VERIFIED: `gh api repos/jeremiewerner/motto --jq '.visibility'` → `private`, this session] | — | — |

**Missing dependencies with no fallback:**
- `NPM_TOKEN` secret does not exist yet on the repo. The publish job's logic and YAML can be written and even dry-run tested (`npm publish --dry-run`, or a `workflow_dispatch`-triggered manual test), but the real tag-triggered publish path cannot succeed until this secret is created.

**Missing dependencies with fallback:** None beyond the above.

## Security Domain

`security_enforcement` is enabled (`security_asvs_level: 1` per `.planning/config.json`). This phase introduces the milestone's first genuine external-write, credentialed CI surface (previous phases were read-only or credential-free). The relevant ASVS categories below reflect that shift.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | Yes | `NPM_TOKEN` is a granular, package-scoped, publish-only npm access token (not a classic account-wide token) stored as a GitHub Actions repository secret, injected only into the `publish` job's environment via `NODE_AUTH_TOKEN` — never logged, never echoed |
| V3 Session Management | No | N/A — no session concept in a CI publish job |
| V4 Access Control | Yes | `permissions: { contents: write }` scoped to the `publish` job specifically (job-level override), not the workflow-level default (`contents: read`) — least-privilege; no `id-token: write` granted this phase (not needed until OIDC, Phase 22) |
| V5 Input Validation | No | No new user-facing input surface; `github.ref_name` (used in `gh release create`) is a GitHub-controlled value from the trigger context, not attacker-controllable in this trigger model (`push` on `tags: ['v*']` only accepts pushes from users with write access to the repo, which — being private — is limited to the maintainer) |
| V6 Cryptography | No | No new cryptographic code; TLS to `registry.npmjs.org`/`api.github.com` is handled by `npm`/`gh` themselves |
| V14 Configuration (CI/CD-adjacent) | Yes | Least-privilege job-level `permissions:`; secret never printed to logs (neither `npm publish` nor `gh release create` echo the token by default — do not add `set -x`/verbose flags to the publish job's steps); guard against secret leakage via error messages (npm's own error output does not echo `NODE_AUTH_TOKEN`) |

### Known Threat Patterns for a tag-gated npm/GitHub-Release publish job

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| A malicious or accidental push of a `v*`-matching tag by anyone with write access triggers an unintended publish | Elevation of Privilege / Repudiation | Repo is private with a single maintainer holding write access (verified this session) — the blast radius of this pattern is currently limited to the maintainer's own actions; document this as a rationale, not a mitigation to build, but revisit at the Phase 22 public flip (branch protection / tag protection rules become relevant once external contributors could theoretically gain write access via other means) |
| `NPM_TOKEN` secret is a long-lived static credential — its mere existence is a standing attack surface for the length of this milestone | Tampering / Information Disclosure | Explicitly acknowledged and time-boxed: `.planning/REQUIREMENTS.md` already schedules PUB-05 (OIDC migration, zero long-lived tokens) for the very next phase after the public flip; this phase's `NPM_TOKEN` is documented as interim, and should be a **granular** token (package-scoped, publish-only, ideally with an expiry) rather than a classic account-wide token, per `.planning/research/PITFALLS.md` Security Mistakes table |
| `gh release create` running with an overly broad `permissions:` block accidentally grants the `publish` job more `GITHUB_TOKEN` scope than needed | Elevation of Privilege | Set `permissions: { contents: write }` at the **job** level for `publish` only — the workflow-level `permissions: { contents: read }` (already present in `ci.yml`) remains the default for every other job |
| Idempotency guard logic has a bug that causes `npm publish`/`gh release create` to run twice with different content on a re-run | Tampering | npm's own registry immutability (cannot overwrite a published version) is the ultimate backstop for the npm side even if the guard has a bug; the `gh release view` guard is the only defense on the Releases side — test the guard's negative case explicitly during phase verification (see Common Pitfalls 3) |

## Sources

### Primary (HIGH confidence)
- Direct tool execution, this session: `npm view @jeremiewerner/motto version` / `npm view @jeremiewerner/motto@99.99.99 version` (exit codes 0/1 confirmed), `gh secret list --repo jeremiewerner/motto` (empty — no secrets configured), `gh api repos/jeremiewerner/motto --jq '.private, .visibility'` (`true`/`private`), `gh workflow list` (one workflow, `CI`, active), `gh run rerun --help`, `gh release create --help`, `gh release view --help`, `node --version`/`npm --version` (24.14.1 / 11.11.0).
- Repo source, read directly this session: `.github/workflows/ci.yml`, `skills/release/SKILL.md`, `scripts/pack-install-e2e.mjs`, `scripts/npm-drift-check.mjs`, `scripts/prepare.mjs`, `package.json`, `motto.yaml`, `.planning/config.json`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`.
- `.planning/phases/20-ci-workflow/20-RESEARCH.md` (same milestone, prior phase — HIGH confidence, primary source for this phase's dependency: the exact shape of `ci.yml`'s existing four jobs, and the explicit "Phase 21 is where `needs: [all]` gating lives" forward note).

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` (v0.0.6 Prove & Publish Addendum — same-milestone research, already grounded in official npm/GitHub docs per its own citations): npm trusted-publishing vs `NPM_TOKEN` sequencing rationale (Q2), `gh release create --generate-notes` recommendation, rejection of `semantic-release`-style tooling.
- `.planning/research/ARCHITECTURE.md` (same-milestone research): full system diagram, the four integration questions (workflow-file structure, pack-E2E location, `--format json` boundary, release-skill/CI handshake), recovery-path ordering, suggested build order. This document independently arrived at the same `needs:`+`if:` publish-job design and the "never re-tag" recovery model verified again in this session.
- `.planning/research/PITFALLS.md` (same-milestone research): OIDC/npm-CLI-version pitfall, tag-push-no-recovery-path pitfall, lifecycle-script double-fire pitfall, `NPM_TOKEN` classic-vs-granular security note — all independently corroborate this phase's design.
- `docs.github.com/en/actions/using-workflows/events-that-trigger-workflows` (WebFetch this session) — confirms branches/tags filter semantics on the `push` event; does not explicitly confirm the two-separate-runs-per-combined-push claim (flagged as Assumption A1).

### Tertiary (LOW confidence)
- None — every claim in this document is either directly verified this session, cited from an already-sourced same-milestone research document, or explicitly flagged in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, every CLI subcommand this phase relies on (`npm view`, `gh release view/create`, `gh run rerun`) was independently exercised live this session, not merely cited from docs
- Architecture: HIGH — the `needs:`/`if:` publish-gate design and the two-runs-per-push structural fact are corroborated across three independent same-milestone research documents (STACK.md, ARCHITECTURE.md, PITFALLS.md) plus this session's own verification
- Pitfalls: HIGH — the most consequential finding (zero `NPM_TOKEN` secret currently configured — a hard blocker for the real publish path) was discovered via live `gh secret list` this session, not assumed

**Research date:** 2026-07-04
**Valid until:** 30 days (GitHub Actions/npm/`gh` CLI behaviors here are stable platform mechanics; re-verify the `NPM_TOKEN` secret's existence and the npm registry's current published version fresh at planning/execution time regardless of this document's age, since both are live, mutable state, not static facts)
