# Pitfalls Research

**Domain:** CI-driven npm publishing (tag-triggered), OIDC/trusted publishing, going repo-public, CLI machine-output ergonomics
**Researched:** 2026-07-03
**Confidence:** MEDIUM (npm/GitHub official docs cross-checked with multiple independent community write-ups; two items — partial-publish recovery, retroactive tagging — are LOW, no first-party guidance exists and the recommendation is synthesized from adjacent policy)

This research is scoped to **v0.0.6 "Prove & Publish"**, added onto Motto's *existing* setup: `prepublishOnly` runs `motto build`; `version` lifecycle script edits `motto.yaml`; husky pre-commit hook; `files` allowlist (`bin/`, `src/`, `dist/public/`); `release` skill currently does local `npm publish`; npm registry is stuck at `0.0.3` while git has tags through `v0.0.5`; CLI (`bin/motto.js`) currently writes **both** success and error lines to `stdout` (only parseArgs/unknown-flag/directory-guard errors go to stderr) and always sets `process.exitCode` (never `process.exit()`).

## Critical Pitfalls

### Pitfall 1: Trusted-publishing OIDC config drifts from the actual workflow identity → silent 404/401 on publish

**What goes wrong:**
`npm publish` from the CI job fails with a 404 (npm can't match the OIDC token to a Trusted Publisher rule) or a 401 (enterprise-issuer mismatch), even though everything "looks" configured.

**Why it happens:**
npm's Trusted Publisher record must match the workflow **exactly**: GitHub org/user (case-sensitive), repo, workflow **filename** (not job name), and environment name if one is declared. A renamed workflow file, a workflow split into a reusable/caller pair (npm authorizes the *caller*, not the reusable workflow), a missing `permissions: id-token: write` block, or a leftover `NPM_TOKEN` env var silently falling back to token auth are all invisible until publish runs. Self-hosted runners are not supported at all. Trusted publishing also requires **npm CLI ≥ 11.5.1** — Node 20 and Node 22 LTS do **not** bundle a new-enough npm by default (only Node 24+ ships npm 11.x out of the box), so a matrix job running on Node 20/22 that reaches the publish step will fail even with a perfectly configured Trusted Publisher, because the runner's npm binary is too old.

**How to avoid:**
- Set the publish job's Node version explicitly to the newest LTS in the matrix (or add `npm install -g npm@latest` as the first step of the publish job) — do not assume the CI Node-matrix's lowest version is fine for the publish leg.
- Configure the Trusted Publisher with the workflow **filename** exactly as committed (`.github/workflows/publish.yml`, not a display name), no environment unless one is actually declared in the workflow.
- Add `permissions: { id-token: write, contents: read }` at the job level (not just workflow level) for the publish job specifically.
- Per this milestone's plan, ship with `NPM_TOKEN` as the interim mechanism and sequence OIDC *after* the public flip (already the stated plan) — don't attempt both in the same phase; token auth is simpler to debug first, OIDC can replace it once the token path is proven.

**Warning signs:**
- `npm publish` in CI returns 404/403/401 despite `npm whoami` working locally.
- The publish job's Node version differs from what you tested trusted-publishing setup against locally.

**Phase to address:**
CI workflow phase (publish-on-tag) — verify with a dry-run/canary publish (e.g. a prerelease tag to a scratch scope, or `npm publish --dry-run` in the workflow) before trusting it against the real package on a real tag.

---

### Pitfall 2: Tag pushed, CI publish fails — no built-in recovery path, and re-running is not idempotent

**What goes wrong:**
`git push --follow-tags` succeeds, the workflow triggers on the tag, but the publish step fails (network blip, OIDC misconfig, lint/test flake). The tag now exists and points at unpublished code. Re-running the workflow may re-attempt side effects (e.g. GitHub Release creation) if the workflow isn't structured to be safely re-runnable.

**Why it happens:**
Tag-push triggers are commonly built assuming "tag exists ⇒ publish already happened or is about to," but nothing enforces that invariant. Unlike `npm version` (which is transactional locally — bump, commit, tag, and if the pre-commit hook/tests fail, nothing is created), a CI publish failure leaves git and npm out of sync with no rollback. There is no official npm/GitHub guidance for this exact recovery flow — this is a known-thin area (LOW confidence beyond first principles).

**How to avoid:**
- Make every step in the publish job idempotent and re-runnable: gate `npm publish` with a version-existence check (`npm view <pkg>@<version> version` — if it already resolves, skip publish rather than error) so a workflow re-run after a transient failure doesn't need manual intervention.
- Keep GitHub Release creation and changelog steps separate from (and after) the npm publish step, each independently safe to re-run or skip if already done.
- Never delete/retag `vX.Y.Z` to "retry" — a version number is either published or it isn't; if the tag's content was broken, cut `vX.Y.Z+1` instead. Deleting and re-pushing a tag after a *partial* publish attempt risks the two diverging from what's actually on the registry.
- Document the manual recovery runbook explicitly in the release skill: "if CI publish fails after tag push, do NOT re-tag the same version; fix the workflow/config, then either re-run the existing workflow run (safe if the version-existence guard above is in place) or publish the same tag's commit under the next patch version."

**Warning signs:**
- A `vX.Y.Z` tag exists on GitHub with no matching version on npm (`npm view <pkg> versions`).
- CI workflow run for a tag shows a red X on the publish job.

**Phase to address:**
CI workflow phase — build the version-existence guard into the publish step from day one; document the recovery runbook in the release-skill rewrite phase (local = bump+tag+push only).

---

### Pitfall 3: `npm ci` triggers `prepublishOnly` and other lifecycle scripts in CI — unexpected side effects and untrusted code execution

**What goes wrong:**
`prepublishOnly` does not fire on `npm publish`'s internal dependency resolution, but it (and `prepare`) **does** fire on any `npm ci` / `npm install` — including the CI job's initial dependency-install step, long before the actual publish step runs. In Motto's case, `prepublishOnly` runs `motto build`, which is cheap and idempotent, so this is low-risk here — but it means `motto build` output could already be regenerated multiple times across a matrix (once per Node version) before the publish job even starts, and any *new* lifecycle script added later must be audited for this same double-fire behavior.

**Why it happens:**
Lifecycle scripts are a package-level concept keyed to the *action being performed on the current package* (install vs publish), not to a specific CI step. `npm ci` always runs `prepare` (that's how husky gets (re)installed) and, because `npm ci` internally performs an install of the current package into its own tree, `prepublishOnly`-adjacent hooks can be triggered depending on npm version and command context. Treat all lifecycle scripts as "will run on every `npm ci`/`npm install`," not "only runs when I expect."

**How to avoid:**
- Use `npm ci` (not `npm install`) in every CI job for determinism (respects the lockfile exactly, fails hard on drift) — already implied by the existing `package-lock.json` commit-in-release-commit pattern.
- Audit every lifecycle script (`prepare`, `version`, `prepublishOnly`) for idempotency and side-effect safety under repeated invocation, since CI may run `npm ci` once per matrix leg (3× for Node 20/22/24) plus once more in the publish job.
- Do not add new lifecycle scripts that assume they run exactly once per release; assume N times.

**Warning signs:**
- `motto build`'s `dist/` output changes between matrix legs for reasons unrelated to source changes (should be fully deterministic — flag if not).
- A future lifecycle script writes to a file or makes an external call — that becomes unsafe to run N times.

**Phase to address:**
CI workflow phase — when writing the test-matrix job, note explicitly (in a comment) that `prepublishOnly`/`prepare` fire on every `npm ci`, so the matrix's install step is not "free" of side effects.

---

### Pitfall 4: husky's `prepare` script fails in CI when `devDependencies` are pruned or `.git` is absent

**What goes wrong:**
Any CI step that runs `npm ci` (or `npm install`) triggers `"prepare": "husky"`. If that step ever runs with `--omit=dev` / `NODE_ENV=production` (pruning `devDependencies`, where `husky` lives), the `husky` binary isn't installed and the prepare script fails with `sh: husky: not found`, aborting the entire install step — including in the **pack-install E2E** step this milestone adds (tarball → tmp dir → `init`/`lint`/`build`), where the extracted tarball almost certainly won't have a `.git` directory at all (husky's install step assumes a git repo to attach hooks to).

**Why it happens:**
`prepare` is unconditionally wired into `package.json` for the local dev workflow (git hooks on `git commit`) but ships as a script that npm will try to run in *any* context that does a full install, including CI matrix jobs and — critically for this milestone — the tarball-install E2E test which extracts the published package into a bare temp directory with no `.git` at all.

**How to avoid:**
- Guard the `prepare` script so it no-ops cleanly outside a git repo and/or outside dev installs, e.g. `"prepare": "husky || true"` (or check `process.env.CI`/absence of `.git` and exit 0) — do this **before** adding the pack-install E2E step, since that step will otherwise fail on `npm ci`/`npm install` inside the extracted tarball even though `husky` isn't in the published `files` allowlist and isn't meant to run there at all.
- In the CI test-matrix job, if dependency install ever uses `--omit=dev` for speed, either skip that flag or explicitly guard `prepare`.
- Confirm the guard doesn't silently swallow a *real* husky install failure during normal local `npm install` — scope the guard to CI/no-git conditions specifically, not "always succeed."

**Warning signs:**
- Pack-install E2E step fails immediately on its `npm ci`/`npm install` with `husky: not found` or `.git can't be found`.
- CI test-matrix job fails only in a leg that uses a pruned/production install.

**Phase to address:**
CI workflow phase, specifically before/alongside adding the pack-install E2E job — this is the step most likely to hit it, since it's the first time the published tarball's `npm ci` behavior is exercised outside a git worktree.

---

### Pitfall 5: Going public exposes full git history, not just the current tree — and GitHub's own scanning only starts *after* the flip

**What goes wrong:**
Flipping repo visibility to public instantly exposes every commit, branch, and tag ever pushed — including anything deleted in a later commit but still present in history (old `motto.yaml` drafts, accidentally-committed `.env`, npm tokens pasted into a debugging commit, `.planning/` content if it was ever committed with sensitive notes). GitHub's automatic secret scanning for public repos only activates **after** the repo goes public — it is not a pre-flight gate, so by the time it flags something, the secret has already been publicly visible (and is presumed compromised regardless of subsequent history rewriting, since forks/clones/caches may have already grabbed it).

**Why it happens:**
"Delete the file" is conflated with "remove the secret" — deleting in a later commit does not touch earlier commits. Teams also under-scope their secret scan to the current file tree instead of full history (`git log --all --source -p` / a dedicated history scanner), missing anything that was committed-then-removed.

**How to avoid:**
- Run a local, full-history secrets scan (gitleaks or trufflehog, `--all` / full-history mode, including all tags and branches — not just `HEAD`) **before** flipping visibility, as this milestone's "pre-public gate" already plans.
- Treat any hit as compromised: rotate/revoke first, rewrite history second (`git-filter-repo`, preferred over BFG for control/repeatability) only as cleanup — rewriting history without rotating the actual secret is theater.
- After a `git-filter-repo` pass: `git reflog expire --expire=now --all && git gc --prune=now --aggressive`, then force-push and require every clone/fork to be re-cloned (rewritten history breaks existing clones).
- Explicitly resolve the stated `.planning/` visibility decision (already flagged in PROJECT.md as an open gate) — scan `.planning/` history too, since it may contain draft credentials, internal URLs, or notes never meant to ship publicly, even if the current `.planning/` tree looks clean.
- This is a **one-way door** (already correctly identified in PROJECT.md) — budget time for the scan to actually run and for a human to review flagged hits, not just green-light on "no CI failures."

**Warning signs:**
- `git log --all --oneline -- '*.env' '*.pem' '*token*' '*secret*'` (or equivalent) returns any hits.
- A secrets scanner flags anything with confidence, even in commits that were later "fixed."

**Phase to address:**
Pre-public gate phase — this must complete and be clean *before* the visibility flip, not concurrently with it.

---

### Pitfall 6: npm registry stuck at 0.0.3, git has tags through 0.0.5 — retroactive backfill is not how npm versioning works

**What goes wrong:**
The instinct is to "catch up" the registry by publishing `0.0.4` and `0.0.5` retroactively so registry history mirrors git history 1:1. This adds real risk for no real benefit: npm has no concept of "backfilling" — publishing `0.0.4` today publishes *today's* `dist-tags`/metadata under an old-looking version number, which can confuse consumers who `npm view motto versions` and see `0.0.4` published *after* `0.0.5` would be (if `0.0.5` is skipped straight to). Worse, if a mistake is made publishing an intermediate version, that exact version string can **never be reused** — not even after unpublishing (permanent, registry-wide reservation; the 24-hour rule only governs re-publishing *any* version after a full unpublish, not reuse of the same version number).

**Why it happens:**
The mental model "git tags = source of truth, npm must match" is reasonable for source control but doesn't map onto npm's publish semantics, which are append-only and irreversible per-version. PROJECT.md already states the plan correctly (catch-up publish of 0.0.5 manually via the existing release skill, before CI work lands) — the risk is scope creep into also trying to publish 0.0.4 "for completeness."

**How to avoid:**
- Per the stated plan: publish **only 0.0.5** (the current shipped state) manually via the existing release skill before CI lands. Do not attempt to also publish 0.0.4 retroactively — it shipped nothing users need from the registry specifically, and burns a permanent version slot for zero consumer value.
- Git tags `v0.0.4`/`v0.0.5` already exist and are fine to leave as pure source-control markers; they do not need a 1:1 npm-published counterpart. Document this explicitly (e.g. a one-line note in CHANGELOG or release skill) so a future maintainer doesn't "fix" the gap by trying to publish `0.0.4` after the fact.
- Before the catch-up publish, run `npm view @jeremiewerner/motto versions --json` to confirm current registry state matches the assumed `0.0.3` baseline — don't assume drift, verify it fresh (npm state can change independently of what PROJECT.md last recorded).
- Once CI publish-on-tag lands, the *next* tag after 0.0.5's catch-up publish should be `0.0.6` — establishing "registry version == latest git tag" as the new invariant going forward, enforced by the CI's stated "npm-drift warning."

**Warning signs:**
- Any temptation to script "publish every unpublished tag in sequence."
- `npm view @jeremiewerner/motto versions` showing gaps that don't match `git tag -l` — expected only for 0.0.4 (by design), should not grow further once CI lands.

**Phase to address:**
Pre-CI catch-up publish (explicitly called out in PROJECT.md as happening manually, before this milestone's CI work) — scope it to 0.0.5 only.

---

### Pitfall 7: Adding `--format json` on top of a CLI that already writes errors to stdout breaks machine parsing

**What goes wrong:**
`bin/motto.js` currently writes **both** success (`✓ …`) and validation-error (`✗ <skill>: <message>`) lines to `stdout` for `lint`/`build`/`init` — only parseArgs failures, unknown-flag errors, and the `[path]` directory guard go to `stderr`. If `--format json` is bolted on naively (e.g. `JSON.stringify(result)` written to stdout alongside — or instead of — the existing `✓`/`✗` text), any consumer piping `motto lint --format json | jq` will get either non-JSON text mixed into the stream (if human-readable lines still leak to stdout in some code path) or, if `--quiet` is added independently, inconsistent behavior where the two flags interact unpredictably (e.g. `--quiet --format json` — does quiet suppress the JSON payload too, or only human text?).

**Why it happens:**
The existing convention (stdout for both success and error human text, exit code carries the real signal) works fine for humans in a terminal but conflates "the primary output stream" with "the human/debug stream." Retrofitting `--format json` requires **stdout to become JSON-only** when the flag is set — meaning every current `process.stdout.write('✗ …')` call must be conditionally routed to `stderr` (or suppressed and folded into the JSON payload) under `--format json`, not just have a JSON block appended alongside the old text.

**How to avoid:**
- Adopt the clig.dev convention explicitly for the new flags: `--format json` → stdout carries **only** the JSON payload (one document, or NDJSON if streaming is ever needed), and all human-readable status/progress text moves to stderr (or is suppressed) for that invocation.
- Design `--quiet` and `--format json` as orthogonal: `--quiet` suppresses non-essential *human* stderr chatter, independent of format; `--format json` changes what goes to stdout. `--quiet --format json` together should still emit the JSON payload to stdout (that's the "essential" output) — only progress/informational stderr lines are suppressed.
- Since CI is the first real consumer of these flags (stated in PROJECT.md), design the JSON schema and stream discipline *against the actual CI workflow's consumption pattern* (e.g. does CI need machine-parseable lint errors to annotate a PR, or just an exit code?) rather than speculatively.
- Exit codes stay the single source of pass/fail truth regardless of `--format`/`--quiet` — already correctly established (`process.exitCode`, never `process.exit()`, per the existing Pitfall-7 note in `bin/motto.js`'s own doc comment). Do not let `--format json`'s payload become the thing CI branches on if a plain exit-code check is available; reserve JSON for cases needing structured detail (e.g. which skill failed and why).

**Warning signs:**
- `motto lint --format json` output fails `jq .` because a stray `✓`/`✗` text line is still interleaved on stdout.
- `--quiet` and `--format json` combined produce different exit codes or missing payloads compared to either flag alone.

**Phase to address:**
CLI ergonomics phase (`--quiet`, `--format json` — CLIX-01/02) — this is exactly the phase that must also revisit and correct the current stdout-carries-errors behavior, since the two are coupled; treat "stdout becomes JSON-only under `--format json`" as part of the CLIX-01/02 spec, not a follow-on fix.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Use `NPM_TOKEN` secret for CI publish instead of OIDC trusted publishing | Ships faster; avoids matching npm CLI version/workflow-identity requirements | Long-lived static secret in GitHub Secrets is a standing attack surface; must be rotated manually | Explicitly acceptable per PROJECT.md as the interim before OIDC — but track it as a follow-up, don't let it become permanent |
| Skip the version-existence guard on `npm publish` in CI ("it'll probably just work") | Simpler workflow YAML | A transient failure on a re-run either double-fails confusingly or (worse) the guard's absence means a *second* tag push under the same version is the only "fix" someone reaches for, which doesn't work (npm rejects duplicate versions) — leading to a stuck release | Never — the guard is a few lines (`npm view <pkg>@<version>`) |
| Leave `--format json` and `--quiet` unspecified for interaction (build one, bolt the other on later) | Faster to ship CLIX-01 alone | Retrofitting orthogonality after CI already depends on the first flag's exact behavior risks a breaking change to CI's consumption | Only if both are designed together, even if implemented in sequence |
| Rely solely on GitHub's post-public secret scanning instead of a pre-flight local scan | Zero extra tooling to run | Secrets are exposed publicly before scanning ever runs — remediation is reactive, not preventive | Never for a one-way-door repo flip |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|------------------|--------------------|
| npm Trusted Publishing (OIDC) | Assuming any Node LTS in the CI matrix satisfies the npm CLI ≥ 11.5.1 requirement | Pin/upgrade npm explicitly in the publish job (`npm install -g npm@latest` or run publish on the newest matrix leg only) |
| GitHub Actions tag trigger | Triggering the whole workflow (tests + publish) on `push: tags`, re-running full test suite redundantly and coupling test flakiness to publish risk | Gate publish behind a prior successful test job / `needs:`, and use `if: startsWith(github.ref, 'refs/tags/')` to scope the publish step |
| husky + `npm ci` in CI | Assuming husky's `prepare` script only matters for local dev and won't be invoked by CI/E2E installs | Guard `prepare` to no-op safely when `.git` is absent or `CI`/production env is detected — required before the pack-install E2E step exists |
| `files` allowlist + tarball E2E | Assuming `npm pack`'s file list is sufficient verification without actually extracting and running the tarball in a clean environment | The planned pack-install E2E (tarball → tmp dir → init/lint/build) is correct — pair it with the D-05 tarball-leak assertion already in the release skill so both static (file list) and dynamic (actually runs) checks exist |
| GitHub repo visibility flip | Treating the `.planning/` visibility decision as implicit/default rather than an explicit choice | Make the decision explicit and logged (public vs excluded via `.gitignore`/history-scrub) before the flip, exactly as PROJECT.md already frames it as a gate |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Scanning only the current file tree for secrets before going public | Misses secrets committed-then-deleted in earlier commits, still fully present in history | Full-history scan (`gitleaks detect --source . --log-opts="--all"` or equivalent), across all branches and tags |
| Rewriting history to remove a secret without rotating it | The secret is presumed already compromised the moment it was ever pushed (even if repo was private, any collaborator/CI log/cache may have seen it) | Rotate/revoke the actual credential first; history rewrite is cleanup, not remediation |
| Leaving `NPM_TOKEN` as a classic (non-granular) token with full publish rights on a public-CI workflow | A compromised workflow (malicious PR from a fork, dependency confusion) can publish under the maintainer's full npm identity | Use npm granular access tokens scoped to this one package, publish-only, with an expiry — or move to OIDC once sequenced in |
| Assuming `id-token: write` at the workflow level is sufficient without also scoping `contents: read` explicitly | Overly broad default `permissions:` block gives the OIDC-enabled job more GITHUB_TOKEN scope than it needs | Set minimal `permissions:` explicitly per job, not just enable `id-token: write` |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| `--format json` silently ignored if passed to a subcommand that hasn't been updated (e.g. `motto init --format json`) | CI scripts assuming uniform flag support across all subcommands get inconsistent output shapes | Either support `--format json`/`--quiet` uniformly across `init`/`lint`/`build`, or explicitly error (not silently ignore) on an unsupported flag for a given subcommand — consistent with the existing strict `parseArgs` unknown-flag behavior |
| Exit code differs between "no errors, quiet mode" and "no errors, verbose mode" | Breaks CI scripts that only check exit code but occasionally also grep output | `--quiet` must never change exit-code semantics — only verbosity |
| JSON payload shape changes between `lint` success/failure without a stable schema (e.g. `errors` key present only on failure) | Consumers must special-case rather than always reading the same shape | Always emit the same top-level shape (`{ ok, count, errors: [] }`) whether success or failure, with `errors` simply empty on success |

## "Looks Done But Isn't" Checklist

- [ ] **CI publish-on-tag workflow:** Often missing the version-existence guard — verify `npm view <pkg>@<version>` check exists before `npm publish` runs, and that a re-run of the same workflow run is safe.
- [ ] **Trusted publishing setup:** Often "configured" in npm's UI but never actually exercised — verify with a real (or dry-run) publish from the exact workflow file/job/environment that will run for real, on the Node version the publish job actually uses.
- [ ] **husky guard for CI:** Often only tested against the normal CI test-matrix install, not the tarball/pack-install E2E's install-in-a-`.git`-less-tmp-dir scenario — verify the E2E step specifically.
- [ ] **Pre-public secrets scan:** Often scoped to `HEAD` only — verify full history (all commits, all tags, all branches) was scanned, not just the current tree.
- [ ] **`--format json` output:** Often verified only on the success path — verify the error/failure path also produces valid, schema-stable JSON on stdout with nothing else mixed in.
- [ ] **Catch-up publish scope:** Often creeps into "publish everything we skipped" — verify only 0.0.5 (current shipped state) is published, not a full 0.0.4+0.0.5 backfill.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|-------------------|
| Tag pushed, CI publish failed, version never landed on npm | LOW | Fix the workflow/config issue; re-run the same workflow run (safe if the version-existence guard is in place) — no new tag needed since nothing was ever published under that version |
| Tag pushed, CI publish failed *midway* (partially uploaded / registry shows inconsistent metadata) | MEDIUM | Very rare with npm's atomic publish model, but if suspected: `npm view <pkg>@<version>` to confirm actual registry state; if truly broken, do not attempt to republish the same version (impossible) — cut the next patch version instead |
| Secret found in git history after repo already flipped public | HIGH | Rotate/revoke the credential immediately (treat as compromised regardless of subsequent cleanup); then `git-filter-repo` rewrite + force-push + require all collaborators to re-clone; consider whether to also open a security advisory if the secret had real access |
| Registry version reused by mistake (published then unpublished within 24h, tried to reuse the number) | HIGH (effectively unrecoverable for that version string) | The version number is permanently burned — publish the next version instead; document why the gap exists (e.g. in CHANGELOG) so it doesn't look like an accident later |
| `--quiet --format json` combination shipped with inconsistent behavior, caught post-release by a CI consumer | LOW–MEDIUM | Patch release fixing the interaction; since this is pre-1.0 and CI is the only real consumer stated in PROJECT.md, a same-day patch is low-risk |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| OIDC config/npm-version mismatch (Pitfall 1) | CI workflow phase (publish-on-tag) | Dry-run/canary publish from the exact workflow, job, and Node version that will run for real |
| Tag pushed / publish fails, no recovery path (Pitfall 2) | CI workflow phase (publish-on-tag) | Deliberately fail a publish step in a test branch/tag and confirm the version-existence guard makes a workflow re-run safe |
| `prepublishOnly`/lifecycle scripts firing on every `npm ci` (Pitfall 3) | CI workflow phase (test matrix design) | Confirm `dist/` output is byte-identical across repeated `npm ci` runs on the same commit |
| husky `prepare` failing outside git/dev context (Pitfall 4) | CI workflow phase, before/with pack-install E2E | Pack-install E2E step passes its own `npm ci`/`npm install` inside the `.git`-less tmp dir |
| Public repo exposes full history / secrets (Pitfall 5) | Pre-public gate phase | Full-history secret scan reports zero hits before visibility flip; `.planning/` decision explicitly logged |
| Registry/git version drift, retroactive backfill temptation (Pitfall 6) | Pre-CI catch-up publish (manual, before CI work lands) | `npm view @jeremiewerner/motto versions` shows exactly `0.0.3` then `0.0.5` added (0.0.4 intentionally absent, documented) |
| `--format json`/`--quiet` breaking on mixed stdout content (Pitfall 7) | CLI ergonomics phase (CLIX-01/02) | `motto lint --format json` (success and failure cases) pipes cleanly through `jq .` with zero non-JSON lines on stdout |

## Sources

- [Trusted publishing for npm packages — npm Docs](https://docs.npmjs.com/trusted-publishers/) — official, MEDIUM confidence
- [npm trusted publishing with OIDC is generally available — GitHub Changelog](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) — official, MEDIUM confidence
- [NPM publish using OIDC on github actions — GitHub community discussion #176761](https://github.com/orgs/community/discussions/176761) — community, corroborated across multiple sources, MEDIUM confidence
- [Things you need to do for npm trusted publishing to work — philna.sh](https://philna.sh/blog/2026/01/28/trusted-publishing-npm/) — practitioner write-up, cross-checked against official docs, MEDIUM confidence
- [Scripts — npm Docs](https://docs.npmjs.com/cli/v11/using-npm/scripts/) — official, MEDIUM confidence
- [npm-ci — npm Docs](https://docs.npmjs.com/cli/v11/commands/npm-ci/) — official, MEDIUM confidence
- [Fixing "husky: not found" as a devDependency in the CI — Medium](https://medium.com/@albertodeagostini.dev/fixing-husky-not-found-as-a-devdependency-in-the-ci-ec438cf73aa0) — practitioner, corroborated by typicode/husky issues #1356 and #920, MEDIUM confidence
- [typicode/husky issue #1356 — Cannot run CI compatible install script](https://github.com/typicode/husky/issues/1356) — primary source repo issue, MEDIUM confidence
- [typicode/husky issue #920 — Skip installing hooks on CI](https://github.com/typicode/husky/issues/920) — primary source repo issue, MEDIUM confidence
- [BFG & git-filter-repo: Cleaning Leaked Secrets from Git History](https://www.elegantsoftwaresolutions.com/blog/bfg-git-filter-repo-cleaning-leaked-secrets-from-history) — practitioner, cross-checked, MEDIUM confidence
- [Rewriting a Git repo to remove secrets from the history — Simon Willison's TILs](https://til.simonwillison.net/git/rewrite-repo-remove-secrets) — practitioner, well-known source, MEDIUM confidence
- [Secret scanning — GitHub Docs](https://docs.github.com/code-security/secret-scanning/about-secret-scanning) — official, MEDIUM confidence
- [npm Unpublish Policy — npm Docs](https://docs.npmjs.com/policies/unpublish/) — official, MEDIUM confidence per classification tier
- [npm-version — npm Docs](https://docs.npmjs.com/cli/v11/commands/npm-version/) — official, MEDIUM confidence
- [Command Line Interface Guidelines — clig.dev](https://clig.dev/) — widely-cited community standard, MEDIUM confidence
- [fix: print warnings to stderr — pnpm/pnpm PR #8342](https://github.com/pnpm/pnpm/pull/8342) — real-world precedent of a sibling tool fixing exactly this stdout/stderr conflation, MEDIUM confidence
- No first-party source found for tag-pushed/publish-failed recovery semantics or retroactive-version-backfill guidance — both synthesized from adjacent npm policy (unpublish rules, publish atomicity) and general CI idempotency practice; flagged LOW confidence, treat as reasoned inference rather than documented convention

---
*Pitfalls research for: Motto v0.0.6 "Prove & Publish" (CI + automated npm publish + repo-public gate + CLI output flags)*
*Researched: 2026-07-03*
