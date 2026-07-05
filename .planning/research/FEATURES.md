# Feature Research

**Domain:** CI/CD + release engineering + CLI ergonomics for a small single-maintainer OSS npm CLI (Node ≥20, plain ESM, `node --test`)
**Researched:** 2026-07-03
**Confidence:** MEDIUM (websearch cross-checked against official docs — GitHub Docs, npm Docs, ESLint docs, ShellCheck source — appearing directly in search results; no single-source claims treated as authoritative; some npm-registry facts verified live against this repo)

## Grounding: current CLI shape (read from source, not assumed)

`bin/motto.js` already returns structured result objects from `lintProject`/`buildProject`: `{ ok, count/skillCount, errors: [{ skill, message }] }`. Output today is hand-written `process.stdout.write('✓ ...')` / `✗ ${e.skill}: ${e.message}` lines, `parseArgs({ strict: true })` per-subcommand with only `force`/`help` currently defined. This means `--format json` is a **thin serialization layer over data that already exists** — not a new data model. `--quiet` is a **new output-suppression branch**, not new data.

Confirmed live drift (2026-07-03): `package.json` version = `0.0.3`, `motto.yaml` version = `0.0.3`, latest git tag = `v0.0.5`, npm registry latest = `0.0.3`. Three independent version sources (package.json, motto.yaml, npm registry) already disagree with the git tag — this is not a hypothetical, it's the exact bug CLIX/CI-drift work targets.

## Feature Landscape

### Table Stakes (Users/Maintainer Expect These)

Features any small OSS CLI's "we have CI" claim implies. Missing these = the CI is decorative.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Node version test matrix (20/22/24) via `strategy.matrix` | `engines.node: ">=20"` is a promise; matrix is how it's kept honest | LOW | `fail-fast: false` so one version's break doesn't hide others; `actions/setup-node@v4` + `cache: npm` |
| Single lint/dogfood job (not matrixed) | Dogfooding (`motto lint`/`build` on Motto's own `skills/`) is deterministic across Node versions — running it N times wastes CI minutes for zero signal | LOW | Run on one Node version (latest LTS, 22) only |
| `npm ci` (not `npm install`) in every job | Reproducible installs from lockfile; standard CI convention everywhere in the ecosystem | LOW | Requires committing `package-lock.json` if not already tracked — verify |
| Pack-install E2E job (tarball → tmp dir → `init`/`lint`/`build`) | `files` allowlist (`bin/`, `src/`, `dist/public/`) is a real risk surface — a file needed at runtime but excluded from `files` only breaks for *installed* users, never for repo-local `npm test` | MEDIUM | Needs `npm pack`, extract/install into a scratch dir, then exercise the 3 subcommands against a scaffolded project — this is the only job that would have caught the current package.json/motto.yaml drift class of bug if it also asserted version consistency |
| `husky` prepare-script CI compatibility | `"prepare": "husky"` runs on every `npm ci`/`npm install`; fails or is a no-op depending on `.git` presence and CI flags | LOW | `actions/checkout` provides `.git`, so this is usually a non-issue on GitHub-hosted runners — but the pack-install E2E job installs from a *tarball* into a scratch dir with no `.git` and no devDependencies (`husky` isn't in `files`/is a devDep) — verify `prepare` doesn't fire or fails silently there; if it's in `package.json` `scripts.prepare` it fires for **every** `npm install` regardless of `files`, so a tarball-install test could break on this alone unless `--ignore-scripts` or a `NODE_ENV`/`CI` guard is used |
| Tag-triggered publish (not push-to-main-triggered) | Matches this project's existing manual release skill (bump → tag → push); publishing on every merge is wrong for a project with deliberate version bumps | LOW–MEDIUM | Trigger on `push: tags: ['v*']` (git-tag push) — note GitHub's *own* trusted-publishing docs increasingly assume `on: release: types: [published]` (a GitHub Release object), not a bare tag push; these are two different trigger shapes with different OIDC validation behavior — decide explicitly, don't default |
| `--quiet` suppresses non-essential/progress output only; errors always print; exit code unaffected | Universal CLI convention (confirmed across general CLI convention guides and ESLint's own `--quiet`) | LOW | For `lint`: `--quiet` should suppress the "✓ N skills OK" success line but never suppress `✗` error lines; exit code stays whatever it already is — quiet is a display concern, not a severity filter (ESLint's `--quiet` suppressing *warnings* doesn't map cleanly since Motto's lint has no warning/error severity split today — verify before copying that exact semantic) |
| `--format json` emits machine-readable, stable-shaped output on stdout; human text goes away entirely (not mixed) | Precedent: ESLint and ShellCheck never mix formats in one stream — `--format json` replaces the human formatter, doesn't append to it | LOW–MEDIUM | Natural schema: serialize the existing `{ ok, count, errors: [{ skill, message }] }` result object directly — no line/column fields needed unless the underlying `yaml` parser's error objects already carry position info worth surfacing later |

### Differentiators (Competitive/Trust Advantage for a Solo-Maintainer Project)

Features that go beyond "has CI" and build trust that the published package matches the tagged source.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| npm-registry version-drift warning | Catches exactly the class of bug this repo already has live (package.json/motto.yaml/npm registry disagreeing with git tags) *before* it silently persists across 2 more milestones | MEDIUM | Two independent checks worth separating: (1) **pre-publish**: does `package.json` version already exist on the registry? (`npm view <pkg> version`, or the `NPM Published Version Check` GitHub Action pattern) — gates the publish step; (2) **drift audit**: does `motto.yaml` version match `package.json` version match latest git tag? — this is the check that would have caught the *actual* current bug and doesn't exist as an off-the-shelf action; write it as a small script, not a dependency |
| Auto-generated GitHub Release notes (`generate_release_notes: true`) | Near-zero implementation cost, immediate changelog value; GitHub natively groups by merged-PR labels | LOW | `softprops/action-gh-release@v2` with `generate_release_notes: true` is the standard low-effort path; requires PRs (not direct-to-main commits) to have meaningful groupings — if this project merges phase work via direct commits (not PRs), auto-notes degrade to a flat commit-adjacent list — verify actual merge pattern before promising rich categorized notes |
| Secrets-scan gate before repo-public flip | The repo-public flip is explicitly a one-way door (per PROJECT.md); a scan *after* going public is too late — bots scrape new public repos within minutes | MEDIUM | `gitleaks` (fast, regex-based, good default ruleset, runs well as a one-off full-history scan with `fetch-depth: 0`) is the right tool for a **one-time gate**, not `trufflehog` (whose differentiator — live-credential verification — matters more for continuous PR scanning than a single pre-flip audit). If gitleaks finds anything: rotate the secret first, decide history rewrite (`git filter-repo`, not BFG — BFG is unmaintained/Scala/JVM-dependent, `git filter-repo` is the currently-recommended tool) only if something real is found — do not build automatic rewrite tooling speculatively |
| npm provenance attestation | Public, verifiable link from the published tarball back to the exact CI run/commit that built it — real trust signal for a package other agents/projects will `npm install` | LOW (if using `NPM_TOKEN` + `--provenance` flag) / MEDIUM (if migrating to full OIDC trusted publishing) | Provenance and trusted-publishing are **separable**: `npm publish --provenance` with `id-token: write` permission works today even with `NPM_TOKEN`-based auth on a GitHub-hosted runner, before any trusted-publisher config exists. Trusted publishing (no long-lived token at all, npm ≥11.5.1 required) is the stronger long-term posture but PROJECT.md already sequences it *after* the public flip — don't front-load that complexity into this milestone |

### Anti-Features (Commonly Reached For, Wrong Fit Here)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Full `release-please`/`semantic-release` automation | "Automate the whole release, why bump versions by hand" | Adds a dependency + a Conventional-Commits discipline this project doesn't currently follow (commit history reads as GSD phase commits, not `feat:`/`fix:`); contradicts the explicit "local = bump + tag + push only" design already chosen for v0.0.6; a solo maintainer doing ~1 release/week doesn't need release-PR automation overhead | Keep the existing `release` skill as the human-in-the-loop bump step; CI's job is verification + publish, not decision-making |
| OS matrix (macOS + Windows runners) alongside Node-version matrix | "Real CI tests all platforms" | Motto is pure ESM Node with `fs/promises`/`path` — no native deps, no shell-outs beyond `git` in the release skill; doubles/triples CI minutes for a risk surface that's near-zero today (Windows path-separator bugs were already a named pitfall fixed in v0.0.1–v0.0.2, not a live gap) | Single OS (`ubuntu-latest`), Node-version matrix only; revisit if a Windows-specific bug report ever lands |
| ESLint-style rich JSON schema (per-message `ruleId`, `messageId`, `fix` suggestion objects, `endLine`/`endColumn`) | "Match the industry-standard shape so tools like `reviewdog` can consume it directly" | Motto's linter doesn't autofix and doesn't currently track line/column per error (errors are `{skill, message}`, not per-token) — inventing fields that don't correspond to real data produces a schema consumers will trust and then get burned by (always `null`/absent fields) | Serialize the existing `{ ok, count, errors: [{ skill, message }] }` shape as-is; add `line`/`column` later only if/when the underlying `yaml` parser's position data is actually threaded through to error objects |
| `--quiet` suppressing warnings (ESLint semantic) | ESLint precedent is the most familiar `--quiet` behavior to reach for | Motto's `lintProject` result has no warning/error severity split today — copying ESLint's exact semantic requires inventing a severity model that doesn't exist yet, which is a scope-creep feature, not a CLI-flag feature | `--quiet` in Motto means "suppress the success/progress line, not error lines" — a pure verbosity control, decoupled from any future severity system |
| Automatic git-history rewrite (BFG/`git filter-repo`) wired into the pre-public CI gate | "If we're scanning for secrets, auto-clean them too" | History rewrite is destructive, breaks every existing clone/fork/tag reference, and should never run unattended on a `.git` history that also carries this project's entire GSD `.planning/` audit trail | Secrets scan is detect-only in CI; if it finds something, that's a stop-the-line human decision (rotate + manually decide whether/how to rewrite), not an automated remediation step |

## Feature Dependencies

```
[Existing: motto lint/build return structured {ok, errors[]} results]
    └──enables (no new data model needed)──> [--format json]

[Existing: parseArgs strict:true per-subcommand options]
    └──requires extension (add `quiet`, `format` to options objects)──> [--quiet]
    └──requires extension──────────────────────────────────────────────> [--format json]

[CI: Node matrix job] ──independent of──> [CI: single dogfood lint/build job]
[CI: pack-install E2E job] ──requires──> [package.json `files` allowlist already correct]
[CI: pack-install E2E job] ──surfaces risk from──> [husky "prepare" lifecycle script + missing .git in tarball-install scratch dir]

[Publish-on-tag CI workflow] ──requires──> [Release skill rewrite: local bump+tag+push only]
[Publish-on-tag CI workflow] ──requires──> [D-05 tarball assertion moved into CI (pack-install E2E)]
[npm-drift warning] ──requires──> [network reachability to npm registry from CI job]
[npm-drift warning] ──enhances──> [Publish-on-tag CI workflow] (pre-publish existence check avoids a failed `npm publish` on duplicate version)

[Trusted publishing (OIDC)] ──requires──> [Repo-public flip already done] (PROJECT.md sequencing)
[Trusted publishing (OIDC)] ──requires──> [npm ≥ 11.5.1 in the publish job]
[npm --provenance flag] ──requires only──> [id-token: write permission + GitHub-hosted runner] (does NOT require trusted publishing first)

[Repo-public flip] ──requires──> [Secrets scan gate: clean result]
[Repo-public flip] ──requires──> [Explicit .planning/ visibility decision] (independent of secrets scan — a content-inclusion choice, not a leak check)

[GitHub Release notes step] ──requires──> [Publish-on-tag CI workflow already producing a tagged, published artifact to attach notes to]
```

### Dependency Notes

- **`--format json` requires no new data model** because `lintProject`/`buildProject` already return `{ ok, count, errors: [{skill, message}] }`. The work is: (1) add `--format`/`--quiet` to each subcommand's `parseArgs` options object, (2) branch the existing `process.stdout.write` calls on `parsed.values.format === 'json'` to `JSON.stringify(result)` instead of the hand-written lines. This is genuinely low complexity — the risk is scope creep into inventing fields (see Anti-Features).
- **Pack-install E2E surfaces the husky risk** that a matrix/lint job never would, because it's the only job that installs from a *tarball* (not a git checkout with `.git` present) — this is exactly the gap where `"prepare": "husky"` can fail or silently no-op differently than in the repo-checkout CI jobs.
- **npm-drift warning enhances (not blocks) publish-on-tag**: treat it as informational-first (warn, don't fail the workflow) for this milestone, since the existing three-way drift (package.json/motto.yaml/registry) is already live and a hard-fail CI gate landing on top of unresolved drift would immediately red the pipeline. Catch-up publish of 0.0.5 (per PROJECT.md) must happen *before* this gate is made blocking.
- **Trusted publishing requires the public flip first, not the reverse** — OIDC trust configuration on npm's side can technically be set up against a private repo, but PROJECT.md already made the sequencing decision (`NPM_TOKEN` interim → OIDC after public). Provenance (`--provenance` flag) is the one piece of the trust story available immediately, independent of that sequencing.
- **Secrets scan and `.planning/` visibility are two different gates**, not one: secrets scan is "did we leak a credential," `.planning/` visibility is "do we want the audit trail (GSD phase history, decisions, deferred debt) public." Conflating them risks skipping the deliberate content decision because the automated scan came back clean.

## MVP Definition

### Launch With (v0.0.6)

Minimum viable set — matches the milestone's stated target features, scoped to what's needed now.

- [ ] CI: Node 20/22/24 matrix test job (`fail-fast: false`) — validates `engines.node` promise
- [ ] CI: single dogfood lint/build job (latest LTS only) — validates Motto lints/builds its own `skills/` tree
- [ ] CI: pack-install E2E job (tarball → tmp dir → `init`/`lint`/`build`) — validates the `files` allowlist and surfaces the husky-in-tarball risk
- [ ] CI: publish-on-tag workflow (`NPM_TOKEN` interim, per PROJECT.md sequencing) + `--provenance` flag (cheap trust win, no OIDC prerequisite)
- [ ] CI: npm-drift warning (informational, non-blocking given known existing drift) — package.json vs motto.yaml vs latest git tag vs registry
- [ ] Release skill rewrite: local script does bump + tag + push only; publish + D-05 tarball assertion move into CI
- [ ] Pre-public gate: `gitleaks` one-time full-history scan (detect-only, human decides remediation) + explicit `.planning/` visibility decision documented as a real decision, not a default
- [ ] `--quiet` flag on `lint`/`build` (suppress success/progress line only, never error lines, no exit-code change)
- [ ] `--format json` flag on `lint`/`build` (serialize existing result object, no invented fields)
- [ ] GitHub Release notes: `generate_release_notes: true` wired into the publish-on-tag workflow

### Add After Validation (v0.0.6.x / next milestone)

- [ ] Make npm-drift warning blocking (hard-fail CI) — once the current three-way drift is resolved and stays resolved for a release or two
- [ ] Migrate `NPM_TOKEN` → full OIDC trusted publishing — trigger: repo-public flip has landed and npm ≥11.5.1 is confirmed available in the publish job
- [ ] Extend `--format json` beyond `lint`/`build` if `init` gains machine-consumable failure modes worth exposing

### Future Consideration (v2+)

- [ ] OS matrix (macOS/Windows) in CI — defer until an actual platform-specific bug report lands
- [ ] Conventional-Commits-driven changelog automation (`release-please`/`semantic-release`) — defer until commit discipline shifts toward Conventional Commits and/or multiple contributors make the manual bump step real friction
- [ ] Per-message line/column position in `--format json` errors — defer until the `yaml` parser's position data is actually threaded into `lintProject`'s error objects

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Node 20/22/24 CI matrix | HIGH | LOW | P1 |
| Dogfood lint/build CI job | HIGH | LOW | P1 |
| Pack-install E2E job | HIGH | MEDIUM | P1 |
| Publish-on-tag workflow | HIGH | MEDIUM | P1 |
| Release skill rewrite (local = bump/tag/push only) | HIGH | LOW | P1 |
| Pre-public secrets scan + `.planning/` decision | HIGH (one-way door) | MEDIUM | P1 |
| `--quiet` flag | MEDIUM | LOW | P1 |
| `--format json` flag | MEDIUM (HIGH for CI consumers specifically) | LOW–MEDIUM | P1 |
| GitHub Release notes (auto-generate) | MEDIUM | LOW | P1 |
| npm-drift warning (informational) | MEDIUM | MEDIUM | P1 |
| `--provenance` flag on publish | MEDIUM (trust signal) | LOW | P2 |
| OIDC trusted publishing migration | MEDIUM | MEDIUM | P2 (deferred by design) |
| npm-drift warning made blocking | MEDIUM | LOW (once P1 version lands) | P3 |
| OS matrix (macOS/Windows) | LOW | MEDIUM | P3 |
| release-please/semantic-release | LOW (for a solo maintainer) | HIGH | P3 |

**Priority key:**
- P1: In this milestone (v0.0.6)
- P2: Sequenced-next by explicit PROJECT.md decision, not this milestone
- P3: Backlog, revisit only on real friction/bug signal

## Precedent Tool Analysis

Framed as precedent tools rather than competitors — Motto isn't competing with these, but its CLI ergonomics inherit expectations set by them.

| Concern | ESLint | ShellCheck | Motto's Approach |
|---------|--------|------------|-------------------|
| `--format json` top-level shape | Bare array of `{filePath, messages[], errorCount, warningCount}` per file | Object wrapper: `{comments: [{file, line, column, level, code, message, fix}]}` | Neither — serialize Motto's own existing `{ok, count, errors: [{skill, message}]}` result shape verbatim; don't adopt either precedent's field names since Motto's error unit is "skill," not "file+line" |
| `--quiet` semantics | Suppresses warning-severity messages only; errors always shown; exit code driven separately by `--max-warnings` | N/A (no severity-based quiet mode in ShellCheck) | Suppress success/progress output only; no severity model exists in Motto today — don't invent one to match ESLint |
| Publish/release automation | N/A (project-specific) | N/A | GitHub Actions tag-triggered workflow, `NPM_TOKEN` interim → OIDC trusted publishing after public flip (PROJECT.md-sequenced) |
| Release notes | N/A | N/A | `generate_release_notes: true` (GitHub-native), not a hand-maintained CHANGELOG.md — lowest-effort option consistent with "mechanism over features" |

## Sources

- [Building and testing Node.js — GitHub Docs](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs) — Node CI matrix conventions
- [actions/setup-node](https://github.com/actions/setup-node) — matrix + npm caching mechanics
- [GitHub Actions Matrix Builds — BetterLink Blog](https://eastondev.com/blog/en/posts/dev/20260428-github-actions-matrix/) — matrix vs single-job cost/signal tradeoff
- [Trusted publishing for npm packages — npm Docs](https://docs.npmjs.com/trusted-publishers/) — OIDC requirements, npm ≥11.5.1
- [npm trusted publishing with OIDC is generally available — GitHub Changelog](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) — GA status, `id-token: write` requirement
- [Generating provenance statements — npm Docs](https://docs.npmjs.com/generating-provenance-statements/) — `--provenance` flag independent of trusted publishing
- [Things you need to do for npm trusted publishing to work — philna.sh](https://philna.sh/blog/2026/01/28/trusted-publishing-npm/) — tag-push vs GitHub-Release trigger distinction, common misconfigurations
- [NPM Published Version Check — GitHub Marketplace](https://github.com/marketplace/actions/npm-published-version-check) — pre-publish existence-check pattern
- [npm-publish — npm Docs](https://docs.npmjs.com/cli/v11/commands/npm-publish/) — default duplicate-version-publish failure behavior
- [ShellCheck JSON formatter source](https://github.com/koalaman/shellcheck/blob/master/src/ShellCheck/Formatter/JSON.hs) — `comments[]` wrapper schema, `fix` object shape
- [ESLint Formatters Reference](https://eslint.org/docs/latest/use/formatters/) — bare-array JSON shape, `messages[]`/`errorCount`/`warningCount`
- [Implement --quiet to only output errors and not warnings — eslint/eslint#905](https://github.com/eslint/eslint/issues/905) — `--quiet` origin/semantics
- [ESLint Command Line Interface Reference](https://eslint.org/docs/latest/use/command-line-interface) — `--quiet`/`--max-warnings` interaction, exit codes
- [CLI conventions — dmyersturnbull](https://dmyersturnbull.github.io/convention/cli/) — general `--quiet` / stdout-stderr conventions
- [Clean non-interactive stdout — github/copilot-cli#3397](https://github.com/github/copilot-cli/issues/3397) — quiet-mode UI-chrome-to-stderr pattern
- [Automatically generated release notes — GitHub Docs](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) — native PR-grouping behavior
- [softprops/action-gh-release — GitHub Marketplace](https://github.com/marketplace/actions/generate-github-release-notes) — `generate_release_notes: true` usage
- [Automated GitHub Releases with GitHub Actions and Conventional Commits — Kubesimplify](https://blog.kubesimplify.com/automated-github-releases-with-github-actions-and-conventional-commits) — release-please pattern (evaluated and rejected — see Anti-Features)
- [Fixing "husky: not found" as a devDependency in CI — Medium](https://medium.com/@albertodeagostini.dev/fixing-husky-not-found-as-a-devdependency-in-the-ci-ec438cf73aa0) — `prepare` script CI failure modes
- [Skip installing hooks on CI — typicode/husky#920](https://github.com/typicode/husky/issues/920) — CI/NODE_ENV guard pattern
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) and [BFG & git-filter-repo comparison — Elegant Software Solutions](https://www.elegantsoftwaresolutions.com/blog/bfg-git-filter-repo-cleaning-leaked-secrets-from-history) — history-rewrite tool tradeoffs (evaluated, kept out of CI — see Anti-Features)
- [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) — one-time full-history scan pattern (`fetch-depth: 0`)
- Live verification against this repo (2026-07-03): `package.json`/`motto.yaml` both at `0.0.3`, latest git tag `v0.0.5`, `npm view @jeremiewerner/motto version` → `0.0.3` — confirms the three-way drift the npm-drift feature must address

---
*Feature research for: CI/CD + release engineering + CLI ergonomics (Motto v0.0.6 "Prove & Publish")*
*Researched: 2026-07-03*
