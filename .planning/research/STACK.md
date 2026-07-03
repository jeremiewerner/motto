# Stack Research

**Domain:** Node.js CLI tool — YAML/Markdown linter and plugin packager
**Researched:** 2026-06-30 (base) · 2026-07-01 (v0.0.4 addendum) · 2026-07-02 (v0.0.5 addendum) · 2026-07-03 (v0.0.6 addendum)
**Confidence:** HIGH (v0.0.6, v0.0.5, and v0.0.4 additions verified directly against official npm/GitHub/Node.js docs, the open agentskills.io spec, and the existing codebase; base stack MEDIUM per original research)

---

## v0.0.6 Prove & Publish Addendum

**Verdict: Zero new runtime deps. Zero new npm dev deps. Every new capability (CI matrix, publish-on-tag, secrets scan, npm-drift warning, `--quiet`/`--format json`, release notes) is either a GitHub-Actions-native building block (`actions/checkout`, `actions/setup-node`, `gh` CLI — all pre-installed on GitHub-hosted runners) or Node stdlib (`fetch`, `JSON.stringify`, the existing `lintProject`/`buildProject` `{ok, errors}` return shape). The one new tool this milestone needs — `gitleaks` for git-history secret scanning — is a standalone Go binary, not an npm package, so it does not touch `package.json` at all.**

This section answers the four stack questions for the v0.0.6 milestone: GitHub Actions CI with a Node matrix; npm publish-on-tag (trusted publishing/OIDC vs `NPM_TOKEN`); one-shot git-history secrets scanning before the repo goes public; and machine-readable CLI output (`--quiet`, `--format json`). The base, v0.0.4, and v0.0.5 stack below is unchanged.

### Q1 — CI workflow: `actions/checkout@v6` + `actions/setup-node@v6`, Node 20/22/24 matrix

**Verdict: Two official GitHub Actions, both current-major, cover checkout + Node install + npm caching. No third-party CI action needed.**

| Action | Current major | Notes |
|--------|---------------|-------|
| `actions/checkout` | `v6` | GitHub is forcing JS-based Actions onto the Node 24 runtime by default from **June 2, 2026** and fully dropping the Node 20 Actions-runtime from **September 2026** — `checkout@v6` is the version built against that runtime. This is about the runtime the *action itself* executes on, unrelated to which Node versions your own test matrix targets. |
| `actions/setup-node` | `v6` (latest `v6.4.0`, April 2026) | Installs the matrix Node version and supports built-in `cache: 'npm'` (keyed off `package-lock.json`) — no separate `actions/cache` step needed. |

**Recommended matrix job** (mirrors the milestone's stated Node 20/22/24 matrix):

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    strategy:
      matrix:
        node-version: [20, 22, 24]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test                              # node --test
      - run: node bin/motto.js lint                # dogfood
      - run: node bin/motto.js build                # dogfood

  pack-install:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with: { node-version: 24, cache: 'npm' }
      - run: npm ci
      - run: npm pack --pack-destination /tmp
      - run: |
          mkdir /tmp/e2e && cd /tmp/e2e
          npm init -y
          npm install /tmp/jeremiewerner-motto-*.tgz
          npx motto init test-project
          cd test-project && npx motto lint && npx motto build
```

**Flag for the roadmap — Node 20 is already EOL.** Node.js 20 reached end-of-life on **April 30, 2026** (three years after its initial release, per Node's even-release LTS cadence). `package.json` still declares `"engines": {"node": ">=20"}` and the milestone explicitly specifies a 20/22/24 matrix — this is a defensible floor for a library whose consumers may lag behind, but it means the matrix is deliberately testing an unsupported runtime with no further security patches. Recommend keeping the matrix as specified (existing installs on Node 20 are real) but treat "bump `engines` floor to `>=22`" as a follow-up decision to make explicitly, not silently — not a blocker for this milestone.

**`pack-install` E2E needs no new tooling.** `npm pack` (writes a real `.tgz` using the same `files` allowlist and `prepublishOnly` hook as a real publish) → `npm install <tarball>` in a scratch directory → run the installed `motto` binary via `npx`. This is the same tarball-integrity idea already encoded in the `release` skill's Step 4 script (D-05 tarball assertion) — CI's job is the *install-and-run* half; the *content-allowlist* half should move into CI too (see Q2).

### Q2 — Publish-on-tag: trusted publishing (OIDC) requirements verified — sequencing after the public flip is correct but for a narrower reason than "it doesn't work on private repos"

**Verdict: npm trusted publishing itself works on private repos. The reason to sequence it after the public flip is `--provenance`, not OIDC eligibility — worth knowing precisely, because it changes what "interim" actually means.**

Verified directly against npm's own docs (`docs.npmjs.com/trusted-publishers/`):

| Fact | Detail | Confidence |
|------|--------|------------|
| Minimum npm CLI | **npm ≥ 11.5.1** and Node ≥ 22.14.0 for the *publishing* step. | HIGH (official npm docs) |
| Works on private repos? | **Yes.** "Trusted publishing works with both public and private repositories." | HIGH (official npm docs) |
| Provenance on private repos? | **No.** "Provenance generation is not supported for private repositories, even when publishing public packages" — because provenance is signed by Sigstore's *public-good* instance and logged to the public Rekor transparency log; a private-Sigstore alternative exists only for GitHub Enterprise Cloud customers. | HIGH (official npm docs + Sigstore blog, cross-checked) |
| Automatic provenance | When trusted publishing is used from a **public** GitHub Actions/GitLab CI repo, npm auto-generates and publishes provenance — no `--provenance` flag needed. CircleCI trusted publishing does not auto-generate provenance. | HIGH (official npm docs) |
| Required workflow permissions | `permissions: { id-token: write, contents: read }` at the job (or workflow) level. If the publish step lives in a called (`workflow_call`) sub-workflow, both parent and child need `id-token: write`. | HIGH (official npm docs) |
| `repository.url` match | npm compares the trusted-publisher config against the package's `repository.url` in `package.json`; current value is the shorthand `"repository": "github:jeremiewerner/motto"` — verify this resolves/matches during setup (npm's own examples show the expanded `git+https://github.com/...` form; shorthand is npm-normalized but worth a dry-run check before relying on it). | MEDIUM (inferred from setup examples; not independently confirmed against the shorthand form specifically) |
| Policy change | Trusted-publisher configs created **before May 20, 2026** default to "npm publish only" with no behavior change; configs created **after** that date must explicitly select which actions (publish, access changes, etc.) the trusted publisher is allowed to perform. Since Motto hasn't configured trusted publishing yet, this milestone's setup falls under the post-May-20 explicit-selection flow. | MEDIUM (WebSearch synthesis of npm changelog/blog coverage — recommend confirming the exact selection UI at setup time) |

**What this means concretely for sequencing:** the milestone's plan ("trusted publishing sequenced after the public flip; `NPM_TOKEN` is the interim") is the right call, but the *reason* is that Motto wants provenance (a real supply-chain-security win worth having, and free once public) — not because OIDC itself is blocked on a private repo. If CI needs to publish before the public flip lands, trusted publishing would technically work today on the private repo, just without provenance attestation. Recommend keeping the milestone's stated sequencing (simpler mental model: one publish mechanism, not two), and treating this nuance as a documentation note in the release skill rather than a reason to change the plan.

**`NPM_TOKEN` interim — verified pattern, one recommendation:** use a **granular access token scoped to `@jeremiewerner/motto` with publish permission only** (not a classic/legacy token with account-wide scope), stored as a GitHub Actions repository secret (`NPM_TOKEN`), consumed via `NODE_AUTH_TOKEN`:

```yaml
- uses: actions/setup-node@v6
  with:
    node-version: 24
    registry-url: 'https://registry.npmjs.org'
- run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Trusted publishing (post-public-flip) target shape:**

```yaml
permissions:
  id-token: write     # OIDC token for npm
  contents: write      # gh release create needs this too
jobs:
  publish:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24               # ships npm 11.x; satisfies the ≥11.5.1 floor without an extra step
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: node bin/motto.js lint && node bin/motto.js build
      - run: npm publish                 # no --provenance flag needed; OIDC handles auth AND provenance
```

**npm-version floor for the publish job matters — pin it, don't inherit the matrix.** Node 24 currently bundles npm 11.x (satisfying the ≥11.5.1 floor); Node 20/22 patch releases may still ship an older npm 10.x that is *below* the trusted-publishing floor. Since the publish job is a single job (not a matrix leg), run it once on Node 24 specifically — do not reuse a Node 20 matrix leg for the publish step. If pinning to an older Node is ever required for another reason, add an explicit `npm install -g npm@latest` step first and verify with `npm --version` in CI logs.

### Q3 — Git-history secrets scan: `gitleaks`, one-shot local run, no CI job required this milestone

**Verdict: `gitleaks` (Go binary, MIT license) is the right tool for this specific job — a fast, zero-network, regex-based one-shot scan of full git history before flipping a repo public. `trufflehog`'s differentiator (live-credential verification against provider APIs) is unneeded for a pre-flip gate and adds both a network dependency and scan time this one-shot check doesn't need.**

| Tool | Approach | Fit for "one-shot local scan before going public" |
|------|----------|------------------------------------------------------|
| **`gitleaks`** (recommended) | Regex/entropy pattern matching against every commit, every branch — no network calls, no API verification. 150+ built-in rules (AWS keys, GitHub tokens, private keys, connection strings, etc). Sub-second on typical repo sizes. | Best fit — exactly the shape of check needed: "did a secret shape ever appear in this history," answered locally and instantly. |
| `trufflehog` | Same detection plus live verification (calls out to AWS/GitHub/etc APIs to confirm a found credential is still active) and scans beyond git (S3, Docker images, Slack). 800+ detectors. | Overkill and slower for a single pre-flip gate; its verification step is valuable for a *scheduled* recurring scan, not a one-shot check run once before a repo visibility change. |

**Not a new project dependency.** `gitleaks` is a standalone Go binary — it never touches `package.json`, `node_modules`, or the npm dependency tree. Install for the one-shot local run via Homebrew (macOS, matches this dev environment) or Docker (no local install at all):

```bash
# Homebrew (macOS)
brew install gitleaks
gitleaks git . -v                 # scans full git history of the current repo, all branches

# OR, zero local install:
docker run --rm -v "$(pwd):/repo" ghcr.io/gitleaks/gitleaks:latest git /repo -v
```

`gitleaks git .` walks every commit on every branch and reports the commit SHA, file path, line number, and a redacted preview for each match — exactly what's needed to triage before the public flip: if it reports zero findings, the history is clear to go public; if it reports findings, they need remediation (rotate the credential, then either accept the historical exposure or rewrite history) *before* flipping visibility, since a public flip makes the entire commit history — not just the current tree — visible immediately and irreversibly to anyone.

**This is a one-shot pre-flip gate, not a new CI job, per the milestone's scope.** A recurring `gitleaks-action` (official GitHub Action, SARIF output, blocks PRs) is a reasonable post-public hardening step but is out of scope for this milestone — flag it as backlog, not build it now.

### Q4 — `--quiet` / `--format json`: CLI output conventions, grounded in the existing `{ok, errors}` return shape

**Verdict: No new dependency — `motto`'s `lintProject`/`buildProject` already return a structured `{ ok, errors: [...] }` object; `--format json` is `JSON.stringify` of that object to stdout, and `--quiet` suppresses the human-readable success/progress lines, not error output.**

Cross-checked against the dominant convention in the Node CLI-linter ecosystem (ESLint's `--format`/`-f` flag family, ESLint's `--quiet`) and general CLI design guidance (structured data to stdout, diagnostics to stderr; help/success info to stdout, errors to stderr):

| Convention | What it means for Motto | Precedent |
|------------|--------------------------|-----------|
| `--format json` emits **one JSON object**, not NDJSON or an array-of-files | Matches the existing `lintProject`/`buildProject` return shape (`{ok: boolean, errors: [{skill, message}, ...]}`) — no new data model to design, just serialize what already exists | ESLint's `json` formatter emits one JSON array of per-file result objects; Jest's `--json` emits one JSON object — single-payload-to-stdout is the norm for tools with a bounded, non-streaming result set (Motto lints a small, known skill tree, not an unbounded stream) |
| `--format json` output goes to **stdout only**; nothing else touches stdout in that mode | CI must be able to pipe `motto lint --format json` straight into `jq`/a parser without pre-filtering banner text | "Separate data from diagnostics" — structured data to stdout, progress/diagnostic text to stderr, is the cross-tool convention agentic/CI consumers rely on |
| `--quiet` suppresses **success/progress noise**, not errors | ESLint's own `--quiet` semantic is "only report errors, suppress warnings" — Motto's analog: suppress the `✓ N skills OK` / progress-per-skill lines on success, but always print (and always exit non-zero on) failures | ESLint CLI reference |
| Exit codes stay the CI-facing contract, unaffected by `--quiet`/`--format` | `0` = ok, `1` = lint/build errors — CI should be able to gate on exit code alone even without parsing output, with `--format json` as the *drill-down* mechanism, not the sole signal | Standard Unix convention; already how `motto lint`/`build` behave today via `process.exit(1)` |

**Implementation shape (no new deps, extends existing return-value plumbing):**

```js
// bin/motto.js — after lintProject()/buildProject() resolves
if (parsed.values.format === 'json') {
  process.stdout.write(JSON.stringify(result) + '\n');
} else if (!parsed.values.quiet || !result.ok) {
  printHuman(result);   // existing human-readable printer, gated by --quiet on success only
}
process.exitCode = result.ok ? 0 : 1;
```

`parseArgs` needs two new declared boolean/string options (`quiet: {type:'boolean'}`, `format: {type:'string'}`) — same pattern already used for `help`/`version` in the v0.0.4 addendum; `strict:true` requires them declared, not a new parsing approach.

### npm-drift warning — `fetch` (stdlib, Node ≥ 18, unflagged-stable ≥ 21) against `registry.npmjs.org`

**Verdict: No new dependency.** The milestone's context notes npm is stuck at 0.0.3 while `package.json`/`motto.yaml` have moved past it — a CI (or pre-publish) check that catches this class of drift automatically is a global `fetch()` call against the public registry, comparing the published `dist-tags.latest` to the local `package.json` version:

```js
const res = await fetch('https://registry.npmjs.org/@jeremiewerner/motto');
const { 'dist-tags': { latest } } = await res.json();
if (latest !== localVersion && !isNewerThan(localVersion, latest)) {
  process.stderr.write(`WARNING: npm registry (${latest}) is ahead of or diverged from local (${localVersion})\n`);
}
```

**One caveat, not a blocker:** global `fetch` has been available since Node 18 but only lost its `ExperimentalWarning` in Node 21 — on the Node 20 matrix leg specifically, this check will print a harmless stderr experimental-warning line the first time `fetch` is invoked. Since Node 20 is already EOL (see Q1) and this is a *warning* check (not a hard gate), this is cosmetic, not a functional issue; do not add a `--experimental-fetch`-suppression workaround for it.

### GitHub Release notes step — `gh release create --generate-notes`, not a third-party Action

**Verdict: Use the GitHub CLI (`gh`), pre-installed on every GitHub-hosted runner — not `softprops/action-gh-release` or any other third-party release Action. Zero added Action-supply-chain surface, and `--generate-notes` already does what this milestone needs (auto-generated release notes from merged PRs since the last tag).**

```yaml
- run: gh release create ${{ github.ref_name }} --generate-notes
  env:
    GH_TOKEN: ${{ github.token }}     # GITHUB_TOKEN is sufficient; no extra secret needed
```

`softprops/action-gh-release` is a fine choice when you need asset-upload globbing or cross-repo release automation at scale — Motto needs neither (npm's tarball is the only artifact, and it's already going to the npm registry, not a GitHub Release asset). `gh` being preinstalled means one less pinned third-party Action version to track for drift/supply-chain review, consistent with the "actions-native where possible" constraint.

### Why NOT `semantic-release` (or similar release-automation frameworks)

**Verdict: Explicitly rejected — Motto's release flow is a deliberate two-phase split (local bump+tag+push, CI publish+notes) that `semantic-release`'s all-in-one model works against, not with.**

| Reason | Detail |
|--------|--------|
| Commit-message convention lock-in | `semantic-release` requires Conventional Commits (or a configured equivalent) to compute the next version automatically. Motto's `release` skill already has an explicit, human-decided `npm version X.Y.Z` step (Step 2) — the maintainer chooses the version, not a commit-parser heuristic. Adopting `semantic-release` would mean either retrofitting commit-message discipline across the whole history or fighting the tool's assumptions. |
| Wrong ownership split | The milestone's design is explicit: **local = bump + tag + push only; CI = publish + notes.** `semantic-release` is built around the opposite model — it does the version bump, changelog, tag, *and* publish, all inside CI, triggered by every push to the release branch. That collapses the two-phase split this milestone is deliberately introducing. |
| New dependency, new config surface, for a solved problem | `semantic-release` plus its plugin ecosystem (`@semantic-release/npm`, `@semantic-release/github`, `@semantic-release/changelog`, etc.) is 6+ new npm packages for what `npm version` (already wired to `motto.yaml` sync via the existing `version` lifecycle script) + `gh release create --generate-notes` (zero deps, preinstalled) already cover. |
| `motto.yaml` version sync already solved differently | The existing `version` lifecycle script (`package.json` `scripts.version`) keeps `motto.yaml` in sync with `package.json` on every `npm version` bump — a bespoke, working mechanism `semantic-release`'s plugin model has no native hook for without a custom plugin. |

**What NOT to add:** `semantic-release`, `standard-version`, `release-please` (Google's alternative, same "infer version from commits" model), `changesets` (closer fit for monorepos with independently-versioned packages — Motto is a single package). All solve "infer the next version and changelog from commit history," a problem this milestone's design explicitly sidesteps by keeping the human-decided `npm version` step.

### New Capabilities → Tool Mapping (v0.0.6)

| Needed for | How to get it | New dep? |
|------------|----------------|----------|
| CI checkout | `actions/checkout@v6` | No — GitHub Action, not an npm dep |
| CI Node install + npm cache | `actions/setup-node@v6` with `cache: 'npm'` | No — GitHub Action |
| Node 20/22/24 matrix | `strategy.matrix.node-version` in the workflow YAML | No |
| Dogfood lint/build in CI | `node bin/motto.js lint && node bin/motto.js build` — already exists | No |
| Pack-install E2E | `npm pack` + `npm install <tarball>` + `npx motto ...` in a scratch dir | No — stdlib npm commands |
| Publish-on-tag (interim) | `NODE_AUTH_TOKEN` env + granular `NPM_TOKEN` secret + `npm publish` | No |
| Publish-on-tag (post-public-flip) | npm trusted publishing (OIDC): `permissions.id-token: write` + `registry-url` in `setup-node` + `npm publish` | No |
| npm-version drift warning | Global `fetch()` (stdlib, Node ≥ 18) against `registry.npmjs.org/@jeremiewerner/motto` | No |
| Git-history secrets scan (one-shot, pre-public-flip) | `gitleaks git .` — standalone Go binary via Homebrew or Docker | No (not an npm dep at all) |
| `--quiet` / `--format json` CLI flags | Two new `parseArgs` option declarations + `JSON.stringify(result)` on the existing `{ok, errors}` shape | No |
| GitHub Release notes | `gh release create --generate-notes` (`gh` CLI, preinstalled on GitHub-hosted runners) | No |

**Do not add:** `semantic-release`/`standard-version`/`release-please`/`changesets` (see rejection table above), `softprops/action-gh-release` or any third-party release Action (`gh` CLI covers it, zero added Action-supply-chain surface), `trufflehog` (verification/breadth aimed at a different job than a one-shot pre-flip gate — revisit only if a recurring/continuous secrets-scanning job is added later), any HTTP client library for the npm-drift check (`node-fetch`, `axios`, `got` — all superseded by stdlib `fetch`), any JSON-output formatting library (`json-stringify-pretty-compact`, `ndjson`) — `JSON.stringify` on the existing plain-object return shape is sufficient.

### Alternatives Considered (v0.0.6-specific)

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `gitleaks` for one-shot pre-flip scan | `trufflehog` | Live-credential-verification and multi-source scanning (S3, Docker, Slack) solve a different, broader problem than "did a secret shape ever appear in this repo's git history" — slower, adds network calls, better suited to a recurring scheduled job than a one-shot gate. |
| `gh release create --generate-notes` | `softprops/action-gh-release` | `gh` is preinstalled on GitHub-hosted runners (zero pinned third-party Action to track); Motto has no asset-upload-globbing need `action-gh-release` specializes in — its extra surface (file globs, draft/prerelease flags, cross-repo targeting) is unused complexity here. |
| npm trusted publishing (OIDC), sequenced after public flip | `NPM_TOKEN` permanently (skip trusted publishing) | Trusted publishing removes a long-lived credential from GitHub secrets entirely (short-lived, workflow-scoped tokens instead) and unlocks automatic provenance attestation once public — a real security upgrade worth the one-time OIDC setup, not just interim scaffolding. |
| Single JSON object to stdout for `--format json` | NDJSON (one JSON object per skill/error, streamed) | Motto lints a small, bounded, in-memory-resident skill tree per invocation — there's no streaming/backpressure need NDJSON solves, and it would require a second serialization path alongside the existing single-shot `{ok, errors}` return value. |
| Node 24 pinned for the publish job (not matrix-inherited) | Reuse whichever Node the workflow happens to be on | The trusted-publishing/OIDC npm-CLI floor (≥11.5.1) is not guaranteed on Node 20/22 patch releases' bundled npm; a single explicitly-pinned Node 24 publish job avoids a flaky "works on this runner, not that one" failure mode. |

### What NOT to Use (v0.0.6-specific)

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `semantic-release` / `standard-version` / `release-please` / `changesets` | All infer version + changelog from commit-message conventions; Motto's release flow keeps the version decision human (`npm version X.Y.Z`) and deliberately splits local-bump from CI-publish — these tools collapse that split back into one CI-driven step | Existing `npm version` (already synced to `motto.yaml` via the `version` lifecycle script) + `gh release create --generate-notes` |
| `softprops/action-gh-release` (or any third-party release Action) | Unused feature surface (asset globbing, cross-repo targeting) for a single-artifact (npm tarball) release; one more pinned Action version to track | `gh release create --generate-notes` — preinstalled, zero added Action |
| `trufflehog` for the pre-public-flip gate | Live-verification + multi-source scanning is aimed at continuous/scheduled scanning, not a one-shot local check before a visibility flip | `gitleaks git .` |
| `node-fetch` / `axios` / `got` for the npm-drift registry check | All superseded by Node's stable global `fetch` (Node ≥ 21 unflagged, usable-with-warning on Node ≥ 18) | Global `fetch()` |
| A permanent, unscoped/classic `NPM_TOKEN` | Classic tokens carry account-wide publish rights; a leak has blast radius beyond this one package | A granular access token scoped to `@jeremiewerner/motto` publish-only, as the interim before trusted publishing |
| Reusing a Node 20/22 matrix leg for the publish job | Bundled npm on non-24 Node releases may sit below the ≥11.5.1 trusted-publishing floor | Pin the publish job to Node 24 explicitly |

### Version Compatibility (v0.0.6 additions)

| Tool/API | Requirement | Notes |
|----------|-------------|-------|
| `actions/checkout` | `@v6` | Built for the GitHub Actions Node 24 runner (forced default from June 2, 2026; Node 20 Actions-runtime removed September 2026) — this is the Action's own execution runtime, independent of your test matrix. |
| `actions/setup-node` | `@v6` (`v6.4.0`, April 2026) | Native `cache: 'npm'` support; supports `node-version` matrix values 20/22/24. |
| npm trusted publishing | npm CLI ≥ 11.5.1, Node ≥ 22.14.0 for the publish step | Node 24 bundles npm 11.x by default, satisfying the floor; do not assume Node 20/22 patch releases do. |
| `gh` CLI | Preinstalled on all GitHub-hosted runners | No version pin needed; `--generate-notes` has been GA for multiple `gh` major versions. |
| `gitleaks` | Any current release (Go binary, independently versioned from npm/Node) | Not part of the Node/npm dependency tree at all. |
| Global `fetch()` | Node ≥ 18 (experimental, prints `ExperimentalWarning`), Node ≥ 21 (stable, silent) | Project floor is Node ≥ 20 — the npm-drift check will emit a harmless warning line on the Node 20 matrix leg only. |

### Sources (v0.0.6 addendum)

- `docs.npmjs.com/trusted-publishers/` — npm CLI ≥11.5.1 / Node ≥22.14.0 floor; works on both public and private repos; provenance NOT supported on private repos even for public packages; required `id-token: write`/`contents: read` permissions; `workflow_call` nested-permission requirement; `repository.url` matching. Verified 2026-07-03 (WebFetch, official npm docs). Confidence: HIGH.
- `blog.sigstore.dev` (npm provenance GA post) + cross-checked community write-ups — confirms provenance is signed against Sigstore's public-good instance and logged to the public Rekor transparency log, explaining why private repos can't generate it (private-Sigstore alternative is GitHub Enterprise Cloud-only). Verified 2026-07-03 (WebSearch synthesis, multiple independent sources agree). Confidence: MEDIUM (community/blog sources corroborating the official npm docs' bare statement).
- `github.com/actions/checkout` (releases + issue #2322) — confirms `v6` current major, rationale tied to the Actions Node-24-runtime migration timeline (forced default June 2, 2026; Node 20 runtime removed September 2026). Verified 2026-07-03 (WebSearch synthesis of official repo release notes/issues). Confidence: MEDIUM (not fetched directly from a single canonical page, but consistent across GitHub's own changelog and the project's own issue tracker).
- `github.com/actions/setup-node` (releases) — confirms `v6.4.0` (April 2026) as latest, native `cache: 'npm'` support. Verified 2026-07-03 (WebSearch synthesis). Confidence: MEDIUM.
- Node.js EOL schedule (`endoflife.date/nodejs`, `nodejs.org/en/about/eol`, cross-checked) — confirms Node 20 reached end-of-life April 30, 2026; Node 22 Maintenance LTS; Node 24 Active LTS through April 2028. Verified 2026-07-03 (WebSearch synthesis, multiple independent EOL-tracking sources agree). Confidence: MEDIUM-HIGH (consistent across independent sources, but not fetched from the single canonical `nodejs.org/en/about/previous-releases` page directly).
- Node.js bundled-npm-version research (`github.com/nodejs/node` issue #58423, npm registry version history) — confirms Node 24 ships npm 11.x; npm itself is at 11.18.0 as of late June 2026 (well past the 11.5.1 trusted-publishing floor), while earlier Node 20/22 patch releases shipped npm 10.x. Verified 2026-07-03 (WebSearch synthesis). Confidence: MEDIUM (directionally confirmed across multiple sources; exact npm version per specific Node 20.x/22.x patch release not independently pinned).
- `gitleaks/gitleaks` (GitHub repo) + multiple 2026 secret-scanner comparison write-ups (appsecsanta.com, rafter.so, jit.io) — confirms `gitleaks git .` full-history scan usage, installation via Homebrew/Docker, regex/entropy-only detection with no network calls; `trufflehog`'s live-verification differentiator and broader-than-git scanning scope. Verified 2026-07-03 (WebSearch synthesis, cross-checked across multiple independent comparison sources). Confidence: MEDIUM.
- `eslint.org/docs/latest/use/command-line-interface` and `eslint.org/docs/latest/use/formatters/` — confirms `--format`/`-f` flag convention, `json` formatter semantics, `--quiet` suppresses warnings (not errors) as the precedent semantic. Verified 2026-07-03 (WebSearch synthesis of official ESLint docs). Confidence: MEDIUM-HIGH.
- Node.js global `fetch` stabilization history (`nodejs.org` v21 release notes, cross-checked) — confirms `fetch` available unflagged-but-experimental since Node 18, stable (no warning) since Node 21. Verified 2026-07-03 (WebSearch synthesis). Confidence: MEDIUM-HIGH.
- `cli.github.com/manual/gh_release_create` and GitHub's own "Using GitHub CLI in workflows" docs — confirms `gh` is preinstalled on GitHub-hosted runners, `--generate-notes` flag, `GH_TOKEN`/`GITHUB_TOKEN` sufficiency (no extra PAT needed for same-repo release creation). Verified 2026-07-03 (WebSearch synthesis). Confidence: MEDIUM.
- Direct codebase inspection — `package.json`, `skills/release/SKILL.md`, `.planning/PROJECT.md` — confirms current `npm version` lifecycle script (`motto.yaml` sync), existing `release` skill's manual 6-step flow (tests → version bump → dogfood → tarball verify → publish → housekeeping) as the baseline this milestone splits between local and CI, and the absence of any existing `.github/workflows/`. Verified 2026-07-03. Confidence: HIGH (primary source).

---

## v0.0.5 Skill Builder Addendum

**Verdict: Zero new dependencies. Every new capability (template mechanism, `<process>`/`<success_criteria>` section presence checks, `outputs:`/`dependencies:`/`allowed-tools` validation, `build-skill` Agent Skill) is stdlib + plain data + the existing `validateSkill`/`lintProject` split. This section answers the four stack questions for the v0.0.5 milestone; the base and v0.0.4 stack below are unchanged.**

### Q1 — XML-section presence checks: regex, not a parser

**Verdict: No new dependency. A markdown/XML parser is unwarranted — verified.**

The `procedure` template only needs to answer a boolean question per required section: "does the body contain `<process>` and `<success_criteria>`?" The design spec is explicit that this is **presence-checked, content free** — nothing is extracted, nothing is validated as well-formed XML, no attributes, no nesting rules. That is exactly the shape of check `src/schema.js` already performs for the body spine today:

```js
// Existing precedent — src/schema.js, Role-line check:
if (!/^\*\*Role:/m.test(bodyStr)) {
  err("body must contain a **Role:** line");
}
```

The same anchored-regex, linear-time, never-throw style extends directly to section tags, driven by the `SECTIONS`/`TEMPLATES` data registry (D-07) rather than hardcoded per-tag checks:

```js
// src/schema.js — new template-section check, same style as the Role check above
for (const section of template.requiredSections) {
  const openTag = `<${section}>`;
  const closeTag = `</${section}>`;
  if (!bodyStr.includes(openTag) || !bodyStr.includes(closeTag)) {
    err(`body must contain a <${section}> section (required by template: ${data.template})`);
  }
}
```

`String.prototype.includes()` is sufficient (no regex needed at all for a fixed literal substring); a regex only becomes useful if case-insensitivity or whitespace-tolerant matching is wanted later. Constructing `` `<${section}>` `` dynamically is safe here because `section` always comes from the trusted, Motto-authored `SECTIONS` registry (`src/templates.js`), never from the skill body or user input — there is no injection surface, unlike building a regex from untrusted text.

**Why not a parser (verified, not assumed):**

| Candidate | Why rejected |
|-----------|--------------|
| Markdown parser (`remark`/`unified`, `marked`, `markdown-it`) | `<process>`/`<success_criteria>` are not Markdown syntax — they are raw inline HTML/XML-like tags embedded in a Markdown body. A Markdown parser would hand these back as opaque "html" nodes, requiring the same string/regex check afterward. Adds a dependency to do the same work with an extra step. |
| XML parser (`fast-xml-parser`, `sax`, `xmldom`) | The body is not well-formed XML (it's Markdown with a few bare tags scattered in it) — an XML parser would either reject it or need a lenient/HTML mode, and the design explicitly does not need to parse *content*, only detect *presence* of two literal substrings. |
| HTML parser (`htmlparser2`, `cheerio`) | Same objection — full DOM/SAX parsing to answer a yes/no substring-presence question is solving a harder problem than the one that exists. |

Precedent: gsd-core (cited in the design spec as prior art for the XML section spine) achieves the same presence-checking at scale with plain text matching, not a parser dependency — validating that this is standard practice at this problem size, not a shortcut unique to Motto.

**One design nuance worth flagging for planning:** presence-only checking (open tag exists AND close tag exists, anywhere in the body, in any order) will not catch a section opened but never closed, or a close tag pasted before its open tag. If stricter ordering matters later, `bodyStr.indexOf(openTag) < bodyStr.indexOf(closeTag)` is one extra stdlib comparison — still zero dependencies, still no parser.

### Q2 — `allowed-tools`: verified spec, format, and a real-world validation risk

**Verdict: Field name and general shape confirmed against both the open Agent Skills spec and Claude Code's own docs. One important gap found: the design's "whitespace-free string" constraint (D-05) will reject real, valid Claude Code `allowed-tools` entries that use parenthesized permission-rule syntax.**

**Confirmed facts (HIGH confidence, official sources):**

1. **Field name is `allowed-tools`** (kebab-case), matching D-06's decision to keep the real Agent Skills frontmatter field name (not `tools`, which is the *subagent* field — see below). Confirmed identically in both:
   - `agentskills.io/specification` (the open, cross-vendor Agent Skills standard) — `allowed-tools`, "space-separated string of tools that are pre-approved to run. (Experimental)."
   - `code.claude.com/docs/en/skills` (Claude Code's own frontmatter reference table) — `allowed-tools`, "Tools Claude can use without asking permission when this skill is active. Accepts a space- or comma-separated string, or a YAML list."

2. **Format is more permissive in Claude Code than in the open spec.** The open spec only documents a single space-separated string. Claude Code's implementation accepts **three** shapes for the same field: a space-separated string, a comma-separated string, or a native YAML list. All three are valid input a real skill author might write.

3. **Real-world entries are NOT always bare tool names — they can contain internal spaces.** Both sources show the parenthesized Claude Code permission-rule syntax as normal, expected usage:
   ```yaml
   allowed-tools: Bash(git:*) Bash(jq:*) Read                    # agentskills.io example
   allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *)   # code.claude.com example
   allowed-tools: Bash(gh *)                                      # code.claude.com example
   ```
   Each `Bash(...)` entry has an internal space between the command and its glob pattern (`git add *`, not `git-add*`). These are legitimate, working Claude Code tool-permission rules, not malformed input.

4. **Wildcard semantics are MCP-tool-specific, not part of `allowed-tools` syntax itself.** Verified from `code.claude.com/docs/en/sub-agents` (documented for the sibling `tools`/`disallowedTools` fields, and the same tool-name wildcard grammar applies wherever Claude Code matches tool names): `mcp__<server>` or `mcp__<server>__*` grants/removes every tool from one named MCP server; `mcp__*` (in a denylist) removes every MCP tool from every server. This is a Claude-Code-wide tool-name convention, not a format Motto needs to special-case beyond "don't reject strings containing `*` or `__`".

5. **Subagent `tools:`/`disallowedTools:` is a distinct, sibling field — confirms D-06.** Subagent Markdown frontmatter uses `tools` (camelCase pairing `disallowedTools`), consistently shown as a comma-separated string (`tools: Read, Grep, Glob, Bash`), and lives in `.claude/agents/*.md`, not `SKILL.md`. This is exactly the field D-06 reserves for the not-yet-built `agent` template — confirmed correct to defer, confirmed correct to not reuse the name `tools` for skills today.

**Gap to flag for the `outputs`/`dependencies`/`allowed-tools` implementation task:** D-05 currently specifies `allowed-tools` as "array of non-empty whitespace-free strings." Taken literally, `Bash(git add *)` — a real, documented, working example straight from Claude Code's own docs — would fail a whitespace-free check. Two ways to reconcile this, for whoever plans the implementation:
- **Option A (recommended):** validate array-of-strings shape and non-emptiness only; drop the whitespace-free constraint. Each YAML list item is already a discrete token by construction (YAML doesn't require whitespace-splitting once it's a list), so there's no ambiguity to guard against — a list item is one tool-permission-rule, spaces and all.
- **Option B:** keep whitespace-free but scope it to bare tool names only (`Bash`, `Read`, `mcp__github__*`) and explicitly accept the `Name(...)` parenthesized form as a second allowed shape (`/^[A-Za-z_][\w-]*(\([^)]*\))?$/`-style check) — closer to "format-checked" in spirit but more code for marginal benefit given D-05 already says lint what's verifiable, not what's semantically correct.

Either way, format-only validation (per D-05: "tool existence is runtime-dependent") remains correct — Motto cannot know whether `Bash(git commit *)` or `mcp__github__create_issue` refers to a real, installed tool; it can only check the frontmatter is shaped like a real Claude Code `allowed-tools` value.

### Q3 — `outputs:`/`dependencies:`: confirmed as Motto-original fields, no existing spec to align with

**Verdict: Neither `outputs:` nor `dependencies:` exists anywhere in the Agent Skills ecosystem's own vocabulary. D-04/D-05 are safe, non-colliding extensions — verified by checking every documented frontmatter field across both the open standard and Claude Code's superset.**

Full accounting of every documented SKILL.md frontmatter field, cross-checked against two independent sources:

| Field | agentskills.io (open spec) | code.claude.com (Claude Code superset) |
|-------|:---:|:---:|
| `name` | Yes (required) | Yes |
| `description` | Yes (required) | Yes (recommended) |
| `license` | Yes | — |
| `compatibility` | Yes | — |
| `metadata` (arbitrary string→string map) | Yes | — |
| `allowed-tools` | Yes (experimental) | Yes |
| `disallowed-tools` | — | Yes |
| `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell` | — | Yes (Claude Code-specific extensions) |

**No `outputs`, no `dependencies`, no `requires`, no `produces` field exists in either source.** The closest thing in the open spec is `metadata` — a free-form string-to-string map explicitly reserved for "additional properties not defined by the Agent Skills spec" — which is a namespace for *arbitrary* client extensions, not a structured outputs/dependencies mechanism; using it for Motto's typed `outputs:`/`dependencies:` would just be moving the same two fields one level deeper for no benefit, and would break the direct top-level ergonomics already designed (D-04/D-05).

This confirms the project's own constraint holds: "unknown frontmatter keys are harmless" (no content stripping) plus the base spec's own stance that unrecognized keys are ignored, not rejected, by every conformant client. `outputs:` and `dependencies:` are free to invent because nothing in the ecosystem claims that vocabulary. No alignment work needed — D-04/D-05 stand as designed.

**One adjacent spec worth knowing exists but is NOT applicable:** the Model Context Protocol (MCP) — a completely different protocol, for a completely different object (a *tool call*, not a *skill file*) — defines `inputSchema`/`outputSchema` on tool definitions using full JSON Schema 2020-12. This is not a frontmatter field and has no naming or structural relationship to a `SKILL.md`'s `outputs:` map; do not reach for JSON Schema here — D-05's "path-safety + existence" check is a completely different, much simpler validation problem (a filename, not a data shape).

### Q4 — Path-safety for `outputs:` file checks: stdlib `node:path`, verified pattern

**Verdict: No new dependency. `path.resolve()` + a `path.sep`-aware containment check is the industry-standard, zero-dependency defense — confirmed against multiple independent Node.js security write-ups, consistent with OWASP guidance for path-traversal prevention.**

**Confirmed, do NOT rely on `path.normalize()` or `path.join()` alone for safety** — both are string-cleanup utilities, not security boundaries. `path.join('/skills/foo', '../../etc/passwd')` normalizes the `..` segments but still produces a path outside the intended root; it does not throw or refuse. Rejecting strings containing literal `..` is also fragile on its own (masks the real check needed).

**The verified pattern — resolve, then verify containment:**

```js
import { resolve, sep } from 'node:path';

/**
 * Never throws. Returns true only if `entry` resolves to a path inside
 * `skillDir` (no `..` escape, no absolute-path override).
 */
function isPathSafe(skillDir, entry) {
  if (typeof entry !== 'string' || entry === '') return false;
  const resolvedRoot = resolve(skillDir) + sep;
  const resolvedTarget = resolve(skillDir, entry);
  return (resolvedTarget + sep).startsWith(resolvedRoot) || resolvedTarget === resolve(skillDir);
}
```

Why `+ sep` on the containment check specifically (not just `startsWith(resolvedRoot)`): without the trailing separator, a sibling directory that happens to share a prefix — e.g. root `/project/skills/build-skill` and target `/project/skills/build-skill-evil/secret.md` — would incorrectly pass. Appending `path.sep` to both sides before the `startsWith` check is the documented fix for that specific false-positive class. This is pure `node:path` — `resolve` and `sep` are both long-stable stdlib, no version floor concern at Node ≥ 20.

**Alignment with the existing codebase's I/O-vs-pure-validation split (important for planning, not just stack choice):** `src/schema.js`'s `validateSkill` is documented as "pure — no filesystem" and today receives its one existence-checkable field (`shared_references`) as a pre-resolved `Set<string>` built by `lintProject` in `src/lint.js` (via `loadSharedRefs`, a `readdir` call). `outputs:` needs the same shape of split, not a filesystem call embedded in `validateSkill` itself:
- **Path-safety check** (`isPathSafe` above) is pure string/path math — belongs in `src/schema.js`, alongside the existing shared_references safe-basename check (D-10), same never-throw style.
- **Existence check** requires `fs.stat`/`fs.access` — belongs in the orchestrator (`src/lint.js`), which already does exactly this for the `shared_references`↔`references/*.md` collision check in `src/build.js` (`await stat(join(skillsDir, skill.name, 'references', ref + '.md'))`, wrapped in try/catch, `ENOENT` → not-found, anything else rethrown). `dependencies:`'s in-tree resolution (bare kebab name → must exist in `skills/` tree) is the same shape of check again, one level up (against the already-discovered `skillNames` list from `discoverSkillNames`, not a fresh `readdir`).

No new stdlib surface beyond what `src/build.js` already imports (`stat`, `join`) plus `resolve`/`sep` from `node:path`, both of which are also already-imported-elsewhere primitives in this codebase's family of modules.

### New Capabilities → Stdlib Mapping (v0.0.5)

| Needed for | How to get it | New dep? |
|------------|----------------|----------|
| `template:` mechanism data (`SECTIONS`, `TEMPLATES` registries) | Plain exported object literals in a new `src/templates.js` | No |
| `<process>`/`<success_criteria>` presence checks | `String.prototype.includes()` on the body string, driven by `template.requiredSections` | No |
| `allowed-tools` format check | `Array.isArray` + per-item `typeof === 'string'` + non-empty check (see Q2 gap above for exact predicate) | No |
| `outputs:` path-safety check | `node:path` `resolve`/`sep` containment check (see Q4) | No |
| `outputs:` file-existence check | `node:fs/promises` `stat` in the `lintProject` orchestrator, same try/catch idiom already used for `shared_references` | No |
| `dependencies:` in-tree resolution | Membership check against the already-discovered skill-name list (`discoverSkillNames` result), reused not re-fetched | No |
| `dependencies:` namespaced (`plugin:skill`) format check | A single anchored regex (`/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/`-shape, reusing `NAME_KEBAB` per half) — format only, no resolution | No |
| `build-skill` Agent Skill itself | Plain `SKILL.md` + `references/skill-schema.md`, authored content — no runtime code | No |

**Do not add:** any XML/HTML/Markdown parsing library (`fast-xml-parser`, `htmlparser2`, `remark`), any JSON-Schema validation library (`ajv`, `zod` — already rejected in the base stack for the same reason: hand-written checks with specific messages beat generic validator output for a two-to-five-field schema), any path-safety helper package (`path-is-inside`, `is-path-inside`, `sanitize-filename`) — all are a few lines of `node:path` this project already imports elsewhere.

### Alternatives Considered (v0.0.5-specific)

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `String.prototype.includes()` / anchored regex for section presence | `remark`/`unified` Markdown AST parser | Tags are raw inline HTML in Markdown, not Markdown syntax; content between tags is explicitly unparsed by design; a parser answers a harder question than the one being asked. |
| `String.prototype.includes()` / anchored regex for section presence | XML parser (`fast-xml-parser`, `sax`) | Body is not well-formed XML; only presence, not structure, needs checking. |
| Array-of-strings + non-empty check for `allowed-tools` | Full permission-rule grammar parser (`Bash(cmd *)` syntax validation) | Out of scope per D-05 ("format-checked only... tool existence is runtime-dependent"); Motto doesn't need to validate that the parenthesized pattern is itself well-formed, only that the field is shaped like a tools list. |
| `node:path` `resolve`+`sep` containment check for `outputs:` | `path-is-inside` / `is-path-inside` (npm) | Both packages are themselves ~10-line wrappers around the exact `resolve`+`startsWith` pattern documented above; adding a dependency to avoid four lines of stdlib contradicts the zero-dep constraint for zero functional gain. |
| `node:path` `resolve`+`sep` containment check for `outputs:` | Reject-on-`..`-substring only | Fragile in isolation (doesn't catch absolute-path overrides like a leading `/`, doesn't catch the sibling-directory-prefix false-negative) — the resolve+containment check subsumes it correctly. |
| Existence check split (pure `validateSkill` + I/O orchestrator) | Filesystem calls inside `validateSkill` | Breaks the documented "pure, no filesystem" contract of `src/schema.js` (see file docblock) and its synchronous, fully-mockable unit-test story — the same reason `shared_references` was already split this way. |

### What NOT to Use (v0.0.5-specific)

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `fast-xml-parser` / `xmldom` / `sax` | Body is Markdown with bare tags, not well-formed XML; only presence-checking two literal substrings is needed | `bodyStr.includes('<process>')` style checks, per `template.requiredSections` |
| `remark` / `unified` / `markdown-it` | Overkill for boolean tag-presence detection; would hand back the tags as opaque raw-HTML nodes requiring the same string check anyway | Plain string/regex, same style as the existing Role-line check |
| `path-is-inside` / `is-path-inside` | Both are thin wrappers around `path.resolve` + `startsWith` — a dependency for four lines of stdlib | `node:path` `resolve`/`sep` containment check |
| `sanitize-filename` | Solves a different problem (stripping illegal chars for filesystem writes); `outputs:` entries are checked for *escape*, not sanitized/rewritten | Same `resolve`+containment check |
| `ajv` / `zod` for `outputs`/`dependencies`/`allowed-tools` shape checks | Same rationale as the base stack's rejection of schema-validator frameworks — 2-5 fields, specific error messages, no dependency payoff | Hand-written predicate functions, same style as existing `validateSkill` checks |
| Literal `allowed-tools` "whitespace-free" enforcement without exception | Rejects real, documented Claude Code syntax (`Bash(git add *)`) — see Q2 gap | Validate array-of-non-empty-strings shape; drop or scope the whitespace constraint (Q2, Option A/B) |

### Version Compatibility (v0.0.5 additions)

| API | Node.js | Notes |
|-----|---------|-------|
| `node:path` `resolve()`, `sep` | Long-stable (pre-v10) | No floor concern at Node ≥ 20; both already indirectly available via existing `path` imports in `src/build.js`/`src/lint.js`. |
| `String.prototype.includes()` | ES2015+ | No Node floor concern whatsoever. |
| `Array.isArray()` | ES5+ | No Node floor concern whatsoever. |

### Sources (v0.0.5 addendum)

- `agentskills.io/specification` — the open, cross-vendor Agent Skills format spec: complete frontmatter field table (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`), confirms `allowed-tools` is a space-separated string and experimental, confirms no `outputs`/`dependencies` field exists in the base standard. Verified 2026-07-02 (WebFetch, official open-standard docs endorsed by Anthropic, Claude Code, and 40+ other agent products per the site's client showcase). Confidence: HIGH.
- `code.claude.com/docs/en/skills` — Claude Code's own SKILL.md frontmatter reference table (complete: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`); confirms `allowed-tools` accepts space-separated, comma-separated, or YAML-list forms; confirms real-world parenthesized syntax (`Bash(git add *)`, `Bash(gh *)`) as documented examples. Verified 2026-07-02 (WebFetch, official Claude Code docs). Confidence: HIGH.
- `code.claude.com/docs/en/sub-agents` — subagent Markdown frontmatter spec: confirms `tools`/`disallowedTools` (not `allowed-tools`) as the distinct subagent field, comma-separated-string examples, and the `mcp__<server>`/`mcp__<server>__*`/`mcp__*` wildcard grammar for MCP tool-name matching. Verified 2026-07-02 (WebFetch, official Claude Code docs). Confidence: HIGH.
- `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview` — re-verified for v0.0.5: required-field spec (`name`, `description`) unchanged since v0.0.1 research; this page does not document `allowed-tools` at all (only the Claude-Code-specific `code.claude.com/docs/en/skills` page does) — confirms `allowed-tools` is a Claude-Code-surface feature layered on top of the base Anthropic API skill spec, not a universal Claude-platform field. Verified 2026-07-02 (WebFetch). Confidence: HIGH.
- Path-traversal prevention pattern (`path.resolve()` + `path.sep`-aware `startsWith` containment check; why `path.normalize()`/`path.join()` alone are insufficient; the specific sibling-directory-prefix false-positive that motivates appending `path.sep`) — cross-checked across independent Node.js security write-ups (openreplay.com, nodejsdesignpatterns.com, stackhawk.com, nodejs-security.com). Verified 2026-07-02 (WebSearch synthesis across multiple independent sources, consistent with OWASP path-traversal guidance). Confidence: MEDIUM (community security write-ups, not a single official Node.js doc page — but the underlying `node:path` API behavior itself, `resolve`/`sep`, is HIGH confidence per Node.js's own stable API docs).
- Model Context Protocol `inputSchema`/`outputSchema` — `modelcontextprotocol.io/specification` — confirmed this is a tool-call schema mechanism (JSON Schema 2020-12) on a completely different object (MCP tool definitions) with no structural or naming relationship to SKILL.md's `outputs:`/`dependencies:` fields; included only to rule out a false-alignment temptation. Verified 2026-07-02 (WebSearch synthesis). Confidence: MEDIUM.
- Direct codebase inspection — `src/schema.js`, `src/lint.js`, `src/build.js`, `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` — confirms existing regex/string-check style (Role-line check), the pure-validator/I/O-orchestrator split already established for `shared_references`, and the existing `stat`/`join` import patterns to extend rather than duplicate. Verified 2026-07-02. Confidence: HIGH (primary source).

---

## v0.0.4 Project Bootstrap Addendum

**Verdict: Zero new dependencies. `motto init`, `--help`, and `[path]` are built entirely on stdlib already in use elsewhere in this codebase.**

This section answers the stack questions for the v0.0.4 milestone: `motto init [name]` scaffolding, `--help`, and the optional `[path]` arg for `lint`/`build`. The base stack (below) is unchanged.

### New Capabilities → Stdlib Mapping

| Needed for | How to get it | New dep? |
|------------|----------------|----------|
| Create scaffold directory tree (`skills/example/`, `shared/references/`) | `fs.mkdir(path, { recursive: true })` | No — already imported in `src/build.js` |
| Write generated file bodies (`motto.yaml`, `marketplace.json`, `SKILL.md`, `.gitignore`) | `fs.writeFile` | No — already imported in `src/build.js` |
| Guard against overwriting a non-empty target directory | `fs.stat` + `fs.readdir`, catch `ENOENT` | No — same idiom already used in `build.js`/`lint.js` |
| Add `init` subcommand, `--help`/`-h`, `[path]` to `bin/motto.js` | `node:util parseArgs` with an explicit `help` option definition | No — `parseArgs` already drives `bin/motto.js`; `[path]` needs zero config change since `allowPositionals: true` is already set |
| Read `git config user.name` / `user.email` for the marketplace `owner` field | `child_process.execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' })` | No — `node:child_process` is stdlib |
| Sanitize a derived project/plugin name into kebab-case | Reuse `NAME_KEBAB` exported from `src/schema.js` | No — already exists, do not duplicate |

**Do not add:** `commander`/`yargs` (help text + subcommands), `inquirer`/`prompts` (interactive wizard), `degit`/`giget` (remote template fetch), `simple-git`/`execa` (git wrapper), any templating engine (`ejs`/`handlebars`/`mustache`). All are solvable with 1–5 lines of stdlib and would violate the project's single-dependency (`yaml`) constraint for no functional gain at this scope.

### `--help` Integration with Existing `strict:true` parseArgs

`bin/motto.js` currently declares `options: {}` with `strict: true, allowPositionals: true`. Under `strict: true`, an *undeclared* `--help` flag throws (caught today, printing generic usage). To make `--help` a first-class, exit-0 flag rather than an error path, declare it as a real option:

```js
const parsed = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
  strict: true,
});

if (parsed.values.help) {
  process.stdout.write(USAGE_TEXT);
  process.exitCode = 0;
  process.exit();
}
```

This is additive — the existing `try/catch` around `parseArgs` (for genuinely unknown flags) is untouched; only recognized flags are declared. `strict: true` still throws for anything *not* declared (e.g. `--bogus`), preserving current behavior.

### `[path]` Positional — Zero parseArgs Config Change

`allowPositionals: true` is already set, so `parsed.positionals[1]` (after the subcommand at `[0]`) is free today — no `options` change needed. The work is entirely in the dispatch body: swap the hardcoded `process.cwd()` calls in the `lint`/`build` branches for a resolved path:

```js
const targetDir = parsed.positionals[1]
  ? resolve(process.cwd(), parsed.positionals[1])
  : process.cwd();
```

`lintProject(targetDir)` / `buildProject(targetDir)` already accept a directory argument (they're called with `process.cwd()` today) — no signature change to `src/lint.js` or `src/build.js` is needed. A missing/invalid `[path]` should be left to surface as a normal lint/build error (e.g. "no skills found"), the same way a missing `motto.yaml` is handled today — no separate up-front existence check needed in `bin/motto.js`.

### Reading Git Config Without a Dependency

```js
import { execFileSync } from 'node:child_process';

function readGitConfig(key) {
  try {
    return execFileSync('git', ['config', key], { encoding: 'utf8' }).trim();
  } catch {
    return ''; // git not installed, or key unset — never throw, fall back
  }
}

const owner = {
  name: readGitConfig('user.name') || 'Your Name',
  email: readGitConfig('user.email') || 'you@example.com',
};
```

**Why `execFileSync`, not `execSync`:** `execFileSync` runs the named executable directly as a new process — it does **not** spawn a shell by default, so there is no shell-injection surface even though the arguments here are hardcoded. `execSync` always spawns `/bin/sh -c "<command>"`, which is the wrong default to normalize in this codebase. Verified against official Node.js docs (`nodejs.org/api/child_process.html`).

**Error handling is a plain try/catch, not a D-01 never-throw validator concern.** `readGitConfig` covers two real-world cases — `git` not installed (`err.code === 'ENOENT'`) and `git` installed but `user.name`/`user.email` unset (non-zero exit, empty stdout) — by falling back to a placeholder the user is expected to hand-edit. This is best-effort scaffold enrichment, not schema validation; it doesn't need to join the aggregated-`errors[]` pattern used by `loadConfig`/`validateSkill`.

### Scaffold File Generation — Plain Template Literals, Not a Templating Engine

The scaffold is ~5 small, fixed-shape files (`motto.yaml`, `.claude-plugin/marketplace.json`, one starter `skills/example/SKILL.md`, `shared/references/` placeholder or none, `.gitignore`), each needing 2–3 interpolated values (project name, owner name/email, plugin name). Plain template-literal string constants in `src/init.js` cover this with zero new surface:

```js
function mottoYaml({ name, description, pluginName }) {
  return `name: ${name}\nversion: "0.1.0"\ndescription: ${description}\nplugins:\n  public: ${pluginName}\n`;
}
```

This mirrors how `src/build.js` already generates `plugin.json` content in-process (JSON.stringify of a plain object) — `init` is structurally the same category of "generate known-shape file content," just for YAML/Markdown instead of JSON. A templating engine (`ejs`, `handlebars`) would be a dependency for string concatenation the language already does natively, and directly contradicts "mechanism over features, YAGNI ruthlessly."

**Generated `motto.yaml` must pass the existing validator, not a new one.** `src/config.js`'s `loadConfig` already validates `name`, `version`, `description`, and `plugins.public`/`plugins.private` against `NAME_KEBAB` (from `src/schema.js`). Derive the scaffolded plugin name through `NAME_KEBAB`-compatible sanitization (lowercase, strip invalid chars, collapse to kebab-case) so a freshly-scaffolded project lints clean immediately — this is also the acceptance bar the milestone specifies ("starter example skill lint+build pass immediately").

### Testing Pattern

Follow the existing `node --test` + `fs/promises` + `os.tmpdir()`/`fs.mkdtemp` pattern already used for build/lint unit tests (see base stack below): scaffold into a temp directory, then assert the generated tree exists and that `lintProject`/`buildProject` run clean against it — this is the strongest possible test for "the starter skill lints and builds immediately," since it exercises `init`'s own output through the real validators rather than asserting file contents in isolation.

### Alternatives Considered (v0.0.4-specific)

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `fs.mkdir`/`fs.writeFile`/`fs.cp` for scaffolding | `degit` / `giget` / `tiged` (remote template fetch) | Motto's starter skill content is fully known at authoring time and ships inside the package itself (already in `package.json` `files`). Nothing to fetch remotely — a network-fetching scaffolder is pure overhead. |
| `parseArgs` with a declared `help` option | `commander` / `yargs` (auto `--help` generation, subcommand trees) | At 3 subcommands (`lint`, `build`, `init`) plus one flag, a hand-written `USAGE_TEXT` constant plus `parseArgs`'s native option declarations covers it with zero dependencies — same reasoning the base stack already used to reject `commander`. |
| `execFileSync('git', [...])` | `simple-git` / `nodegit` / `execa` | A single synchronous read of two config values doesn't warrant a git wrapper library; `execFileSync` with an argv array is a 3-line, injection-safe read. |
| Plain template-literal file bodies | `templates/*.ejs`/`.hbs` + rendering dependency | ~5 static files with 2–3 interpolated values each — a templating engine is a dependency for string concatenation the language already does. |
| Non-interactive `[name]` positional (default: cwd basename) | `inquirer`/`prompts` interactive wizard | Not requested by the milestone; `motto init [name]` with a sane default is sufficient. Adding a prompt library for a feature not asked for is scope creep. |

### What NOT to Use (v0.0.4-specific)

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `child_process.exec` / `execSync` for git config reads | Both spawn a shell (`/bin/sh -c`) by default — normalizes an unsafe pattern even though today's args are hardcoded literals | `execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' })` |
| `commander` / `yargs` / `cac` / `sade` | Solves what `parseArgs` already does (declared `help` option + `strict:true`); a new dependency + transitive deps for auto-help text this project doesn't need | `node:util parseArgs` with an explicit `help: { type: 'boolean', short: 'h' }` option and a hand-written usage string |
| `inquirer` / `prompts` / `enquirer` | No interactive-wizard requirement in scope; adds a dependency for a feature not requested | `[name]` positional with a cwd-basename default |
| `degit` / `giget` / `tiged` | Starter skill content is local and known at build time, nothing to fetch remotely | Inline string templates in `src/init.js` |
| `fs.existsSync` mixed into an otherwise `fs/promises`-only module | Style inconsistency — every other `src/*.js` file (`build.js`, `lint.js`, `config.js`) is 100% async `fs/promises` | `await stat(path)` in try/catch, checking `err.code === 'ENOENT'` |
| A second kebab-case regex/validator specific to `init` | `NAME_KEBAB` already exists in `src/schema.js` and is the sole source of truth (per REVIEW-11/D-16 in `src/config.js`) | Import and reuse `NAME_KEBAB` from `src/schema.js` |

### Version Compatibility (v0.0.4 additions)

| API | Node.js | Notes |
|-----|---------|-------|
| `util.parseArgs` `help`/short-flag option declarations | ≥ 20.0.0 (stable) | Same floor as rest of project; no `engines` bump needed. Declaring `help` in `options` is required for `strict:true` to accept `--help`/`-h` without throwing (additive to the existing `options: {}`). |
| `child_process.execFileSync` (`encoding` option) | Long-stable (pre-v10); no floor concern at Node ≥ 20 | Default `encoding` is `'buffer'` — must pass `{ encoding: 'utf8' }` to get a string. Does not spawn a shell by default (unlike `execSync`), so argv-array calls are injection-safe. |
| `fs.mkdir({ recursive: true })` | ≥ 10.12 (stable) | No floor concern; already used in `src/build.js`. |

### Sources (v0.0.4 addendum)

- `nodejs.org/api/util.html#utilparseargsconfig` — confirms `parseArgs` stable since v20.0.0; `strict` default `true` throws on unknown args; `allowPositionals` defaults `false` under strict mode (must stay explicit, matching current `bin/motto.js`); option-declaration syntax for `help`/short flags. Verified 2026-07-01 (WebFetch, official Node.js docs). Confidence: HIGH.
- `nodejs.org/api/child_process.html#child_processexecfilesyncfile-args-options` — confirms `execFileSync` does not spawn a shell by default (argv-array calls are injection-safe, unlike `execSync`), `encoding` option controls string vs Buffer return, error shapes for spawn failure (`err.code`) vs non-zero exit (`err.stdout`/`err.stderr`). Verified 2026-07-01 (WebFetch, official Node.js docs). Confidence: HIGH.
- Direct codebase inspection — `bin/motto.js`, `src/build.js`, `src/config.js`, `src/schema.js`, `.claude-plugin/marketplace.json`, `motto.yaml`, `package.json` — confirms current `parseArgs` config, `fs/promises` call patterns, and existing `NAME_KEBAB`/`loadConfig` validators to reuse rather than duplicate. Verified 2026-07-01. Confidence: HIGH (primary source).
- Node.js release schedule (web search synthesis, endoflife.date / nodejs.org release WG) — Node 24 is Active LTS through April 2028, Node 22 Maintenance LTS through April 2027; confirms `"engines": { "node": ">=20" }` remains a safe, current floor with no need to raise it for this milestone. Verified 2026-07-01. Confidence: LOW (not fetched directly from nodejs.org — treat as directional context only; the `>=20` floor decision doesn't hinge on this claim).

---

## v0.0.2 Dogfood Addendum

**Verdict: Zero new dependencies. Zero new dev tools. No dist/ handling changes.**

This section answers the three v0.0.2 dogfood questions directly; the base stack below is unchanged from v0.0.1.

### New Dependencies

None. Every capability needed by the dogfood milestone is already present:

| Needed for | How to get it | New dep? |
|------------|---------------|----------|
| Run `lintProject` / `buildProject` on real tree | `import` from `../src/lint.js` and `../src/build.js` | No |
| Resolve repo root inside an ESM test file | `dirname(fileURLToPath(import.meta.url))` + `resolve` | No — `node:url` and `node:path` already used |
| Assert on `dist/` output | `node:fs/promises` (`stat`, `readFile`) | No — already imported in existing tests |
| Clean up `dist/` after dogfood test run | `fs.rm(dir, { recursive: true, force: true })` | No — already used in `build.js` |
| Run dogfood test on every commit | Husky pre-commit already runs `node --test` | No change needed |

**Do not add:** Any test helper library (`tape`, `ava`, `chai`), any fixture library, any snapshot library, any temp-copy utility. The existing `node:test` + `node:assert/strict` pattern is sufficient.

### How the Dogfood Test Should Invoke Build

**Run `buildProject` in-place on the real repo root. Do not copy to a temp dir.**

Rationale:
- The purpose of the dogfood test is to validate the REAL `skills/` tree, not a synthetic copy. Copying defeats the point.
- `buildProject` is already idempotent: it wipes `dist/` and rebuilds from scratch on every invocation. There is no stale-state risk.
- `dist/` is already gitignored — in-place writes leave no tracked-file side effects.
- Copying the full source tree to a temp dir adds ~15 lines of setup and a dependency on `fs.cp` semantics that are already exercised in `build.test.js`. YAGNI.

**Pattern for resolving repo root in an ESM test file:**

```js
// test/dogfood.test.js
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```

`fileURLToPath` and `node:path` are already used in the existing codebase. No new stdlib surface.

**Test structure:**

```js
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintProject } from '../src/lint.js';
import { buildProject } from '../src/build.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('dogfood: Motto lints and builds its own skills tree', () => {
  after(async () => {
    // Wipe dist/ after the dogfood suite so the repo stays clean between test
    // invocations. Not strictly required (dist/ is gitignored), but removes
    // confusion when inspecting the working tree.
    await rm(join(REPO_ROOT, 'dist'), { recursive: true, force: true });
  });

  it('lintProject returns ok:true on the real skills/ tree', async () => {
    const result = await lintProject(REPO_ROOT);
    assert.strictEqual(result.ok, true,
      `lint failed:\n${result.errors.map(e => `  ${e.skill}: ${e.message}`).join('\n')}`);
  });

  it('buildProject returns ok:true and produces dist/', async () => {
    const result = await buildProject(REPO_ROOT);
    assert.strictEqual(result.ok, true,
      `build failed:\n${result.errors.map(e => `  ${e.skill}: ${e.message}`).join('\n')}`);
    const distStat = await stat(join(REPO_ROOT, 'dist'));
    assert.ok(distStat.isDirectory(), 'dist/ must exist after a successful build');
  });
});
```

The `after()` hook is the right cleanup site — it runs once after all tests in the `describe`, regardless of pass/fail. Individual tests should NOT clean up between themselves because `buildProject` needs `lintProject` to have run (via its internal lint gate) and the second test needs the dist/ written by `buildProject`.

### dist/ Handling

**Keep `dist/` gitignored. Never commit it.**

`.gitignore` already contains `dist/`. This is correct and requires no change:
- `dist/` is a build artifact regenerated deterministically from `skills/` + `motto.yaml`
- Committing it creates noise in diffs and creates a second source of truth for content that is already in `skills/`
- The dogfood test verifies structure at test time; permanent artifact tracking is not needed
- Downstream users of Motto's plugin will run `motto build` themselves; they do not need a pre-built artifact in the repo

### What NOT to Add for the Dogfood

| Temptation | Why to Reject |
|------------|---------------|
| Copy tree to `os.tmpdir()` before testing | Defeats the dogfood premise; adds complexity; no benefit given `buildProject`'s idempotency |
| Snapshot `dist/` layout to a fixture file | Over-engineering; the live `stat` + `readFile` assertions in the test are the ground truth |
| A `motto.yaml` `test` command or watch mode | Out of scope; `node --test --watch` works if desired but is not a dependency |
| `sinon` / `testdouble` for mocking | Not needed; the dogfood test is an integration test, not a unit test |
| A separate test script in `package.json` | `npm test` (`node --test`) auto-discovers `test/dogfood.test.js` — no script change needed |
| Committing `dist/` to verify output | The test asserts on it at runtime; static fixtures would drift |

### Required Authoring for the Dogfood to Pass

`lintProject` returns `ok: false` with "no skills found" when `skills/` is missing or empty. The dogfood test will fail until at least one valid SKILL.md exists. Required before the dogfood test can pass:

1. `motto.yaml` at repo root with `name`, `version`, `description`, `plugins.public`
2. At least one `skills/<name>/SKILL.md` with valid `name`, `description`, `audience` frontmatter and `# Title` + `**Role:**` spine
3. At least one shared reference in `shared/references/*.md` if any skill declares `shared_references`

These are content authoring tasks, not stack changes. No new tooling needed.

---

## Verdict on Chosen Stack

The project's chosen stack (Node ≥ 20, plain ESM, `node --test`, single dep `yaml`) is correct and defensible. No changes recommended for v0.0.2, v0.0.4, v0.0.5, or v0.0.6. Three gaps discovered in v0.0.1 research are documented below, plus one implementation-risk gap discovered in v0.0.5 research (see Q2 above: `allowed-tools` whitespace-free constraint vs. real-world parenthesized syntax), plus one flag discovered in v0.0.6 research (Node 20 is now EOL — the milestone's own matrix already covers this deliberately; see the v0.0.6 addendum's Q1 note).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | ≥ 20 LTS | Runtime | First LTS with stable `node:test`, stable `parseArgs`, native ESM `.js` without loader flags. Node 24 is current Active LTS (through April 2028), Node 22 Maintenance LTS (through April 2027). Node 20 itself reached end-of-life April 30, 2026 (v0.0.6 finding) — `"engines": { "node": ">=20" }` remains the documented floor for now but is a candidate for an explicit follow-up bump decision. |
| ESM (`"type":"module"`) | — | Module format | Zero transpilation, native `import/export`, direct execution via `node`. No build step. |
| `yaml` | 2.9.0 | YAML 1.2 parsing | Only runtime dep needed. YAML 1.2 core schema by default (no `yes`/`no` boolean surprises). `parseDocument()` accumulates errors in `doc.errors[]` without throwing — ideal for a linter that must report all errors, not just the first. |
| `node:test` | stdlib (Node ≥ 20) | Test runner | Stable since Node 20. `describe`/`it`/`mock`/`beforeEach` all present. ESM-native. `node --test` auto-discovers `*.test.js`. No install. |
| `node:util` `parseArgs` | stdlib (Node ≥ 20) | CLI arg parsing | Stable since Node 20 (was experimental in 18.3). Replaces `commander` for a handful of subcommands. Returns `{ values, positionals }`. Zero dependencies. |

### Supporting Stdlib (no install needed)

| Module | Purpose | Notes |
|--------|---------|-------|
| `node:fs/promises` | Async file I/O | `readFile`, `readdir`, `mkdir`, `cp`, `rm`, `writeFile`, `stat` — covers all lint, build, init, and (new in v0.0.5) `outputs:`/`dependencies:` existence-check I/O |
| `node:path` | Path manipulation | `join`, `resolve`, `relative`, `basename`, `extname`, and (new in v0.0.5) `sep` for path-safety containment checks |
| `node:process` | Exit codes, argv | `process.exit(1)` on lint failure; `process.argv` fed to `parseArgs`; (new in v0.0.6) `process.exitCode` set alongside `--quiet`/`--format json` output |
| `node:assert` | Assertions in tests | `assert.strictEqual`, `assert.deepStrictEqual`, `assert.throws` — enough for all unit assertions |
| `node:url` | `fileURLToPath` | Needed for `__dirname` equivalent in ESM: `path.dirname(fileURLToPath(import.meta.url))` |
| `node:os` | `tmpdir()` | Used in unit tests for `mkdtemp`-based temp fixture directories |
| `node:child_process` | `execFileSync` | v0.0.4 — reads `git config user.name`/`user.email` for `motto init`'s marketplace `owner` field, without spawning a shell |
| `fetch` (global) | HTTP requests | v0.0.6 — npm registry `dist-tags.latest` lookup for the npm-version-drift warning; stable (no warning) on Node ≥ 21, usable-with-`ExperimentalWarning` on Node 18–20 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `node --test` | Run tests | `node --test` discovers all `*.test.js` recursively from cwd; `--test-reporter=spec` for readable output |
| `node --test --experimental-test-coverage` | Coverage | Built-in; available in Node 20+; marks `--experimental` but reliable enough for CI |
| `claude plugin validate` | Validate output | Run against `dist/` to verify plugin structure before shipping; built into Claude Code CLI |
| `husky` | Pre-commit hook | Runs `npm test` (= `node --test`) before every commit; catches dogfood regressions automatically |
| `actions/checkout@v6` | CI checkout | v0.0.6 — GitHub Action, not an npm dependency |
| `actions/setup-node@v6` | CI Node install + npm cache | v0.0.6 — GitHub Action, `cache: 'npm'` built in |
| `gitleaks` | One-shot git-history secrets scan | v0.0.6 — standalone Go binary (Homebrew/Docker), run once before the repo-public flip; not part of the npm dependency tree |
| `gh` CLI | GitHub Release creation | v0.0.6 — preinstalled on GitHub-hosted runners; `gh release create --generate-notes` |

---

## Installation

```bash
# One runtime dependency
npm install yaml

# One dev dependency (pre-commit hook runner)
npm install -D husky

# No other npm dependencies needed — v0.0.4's init/--help/[path], v0.0.5's
# template mechanism / outputs / dependencies / allowed-tools additions, and
# v0.0.6's CI/publish/secrets-scan/CLI-flags additions are all built on Node
# stdlib (fs/promises, node:path, util.parseArgs, child_process, global fetch),
# plain data modules, and GitHub-Actions-native tooling (actions/checkout,
# actions/setup-node, the preinstalled gh CLI). gitleaks (v0.0.6) is a
# standalone Go binary installed via Homebrew/Docker for a one-shot local
# scan — it never touches package.json.
```

---

## Claude Code Plugin Output Format (verified against official docs)

This is the spec Motto's `build` command must produce. Verified from `code.claude.com/docs/en/plugins-reference` (2026-06-30).

### Plugin directory layout

```
dist/<plugin-name>/                  ← plugin root
├── .claude-plugin/
│   └── plugin.json                  ← manifest (only 'name' required)
└── skills/
    └── <skill-name>/
        ├── SKILL.md                 ← verbatim copy from source
        └── references/              ← resolved shared refs (bundled here)
            └── *.md
```

**Critical rule:** All components (`skills/`, `commands/`, `agents/`) must be at the plugin root, NOT inside `.claude-plugin/`. Only `plugin.json` belongs in `.claude-plugin/`.

**Single-skill shortcut (v2.1.142+):** A `SKILL.md` at the plugin root with no `skills/` dir is auto-discovered as a single-skill plugin. Not recommended for Motto's multi-skill output.

### `plugin.json` manifest schema

```json
{
  "name": "project-name",
  "version": "1.0.0",
  "description": "...",
  "author": { "name": "...", "email": "..." },
  "license": "MIT",
  "keywords": ["..."]
}
```

**Required fields:** `name` only (kebab-case, unique identifier).
**Recommended fields:** `version` (semver; if omitted Claude Code uses git SHA as version — wrong behavior for packaged dist), `description`, `author`, `license`.
**Unknown fields:** Claude Code ignores them (but `claude plugin validate --strict` warns).

**Gap 1 — `motto.yaml` must generate `plugin.json` version correctly:** If `version` is omitted from `plugin.json`, Claude Code falls back to git SHA of the install directory — which is the dist directory, likely not a git repo. Always emit `version` from `motto.yaml`'s project version field.

### SKILL.md frontmatter — exact specification

Verified from `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview` (2026-06-30, re-verified 2026-07-02) and cross-checked against the open standard at `agentskills.io/specification` (2026-07-02) and Claude Code's extended field table at `code.claude.com/docs/en/skills` (2026-07-02).

**Required frontmatter fields:**

| Field | Rules |
|-------|-------|
| `name` | Max 64 chars. Pattern: `[a-z][a-z0-9-]*` (lowercase letters, numbers, hyphens only). No XML tags. Cannot contain reserved words `"anthropic"` or `"claude"` as substrings. Must match parent folder name. |
| `description` | Non-empty. Max 1024 chars. No XML tags. Should state both what the skill does and when Claude should trigger it. |

**Optional frontmatter fields (full accounting as of v0.0.5 research):**

`license`, `compatibility`, `metadata` (open standard, `agentskills.io`); `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell` (Claude Code superset, `code.claude.com/docs/en/skills`). Motto's linter validates only `name`, `description` (base spec) plus, as of v0.0.5, format-checks on `template`, `outputs`, `dependencies`, `allowed-tools` (Motto-specific rigor layer) — every other unknown key is copied verbatim and ignored by Claude Code at runtime, per the "no content stripping" project constraint.

**Gap 2 — `shared_references` is a Motto-specific field, not a Claude Code field.** It is linted by Motto but ignored by Claude Code at runtime. That is correct and intentional. The same is true, by design, of v0.0.5's `outputs`/`dependencies`/`template` — none of these exist in the Agent Skills ecosystem's own vocabulary (confirmed by the v0.0.5 addendum's Q3 cross-check above); they are pure Motto rigor-layer additions, harmless to any other client per the ecosystem-wide "unknown frontmatter keys are ignored" convention.

---

## YAML Frontmatter Extraction Pattern

`gray-matter` is NOT needed. Ten lines of stdlib + `yaml` does the job:

```js
import { parseDocument } from 'yaml';

function parseFrontmatter(source) {
  // Handles both LF and CRLF
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: source, errors: [] };
  const doc = parseDocument(match[1]);
  return {
    frontmatter: doc.toJS(),
    body: match[2],
    errors: doc.errors,   // YAMLParseError[]
    warnings: doc.warnings,
  };
}
```

`parseDocument()` never throws; it accumulates errors in `doc.errors[]`. Each error has `.message`, `.pos`, `.linePos`. This is exactly what a linter needs — collect all errors before reporting.

---

## CLI Entry Point Pattern

```json
// package.json
{
  "type": "module",
  "bin": { "motto": "./bin/motto.js" },
  "engines": { "node": ">=20" }
}
```

```js
// bin/motto.js
#!/usr/bin/env node
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help:    { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
});

const [subcommand] = positionals;
// dispatch to lint() or build() or init()
```

`parseArgs` limitation: no built-in sub-command routing or help text generation. Write both manually — it is ~20–30 lines for three subcommands. Do not reach for `commander` to avoid this (see v0.0.4 addendum above for the concrete `--help` integration pattern with the existing `strict:true` config).

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `yaml` v2.9 | `js-yaml` v4 | `js-yaml` defaults to YAML 1.1 schema (treats `yes`/`no`/`on`/`off` as booleans — wrong for skill files). `yaml` defaults to YAML 1.2 core schema. `yaml` has superior error objects with position info. `js-yaml` weekly downloads are higher but the library is less actively maintained. |
| `yaml` v2.9 | `gray-matter` | `gray-matter` wraps `js-yaml` (YAML 1.1 issues apply) and adds a dependency. The frontmatter extraction is 10 lines of regex + `yaml.parseDocument()`. Zero reason to add `gray-matter` when you already have `yaml`. |
| `node:test` | Vitest / Jest / Mocha | All require installation, configuration, and (for Vitest/Jest) understand ESM only with additional config. `node:test` is zero-config for a pure-ESM project. The API surface (`describe`/`it`/`mock`) is sufficient for unit-testing a file I/O + schema validation CLI. |
| `node:util parseArgs` | `commander` | `commander` is 50 kB and designed for complex CLI trees. Motto has a handful of subcommands (`lint`, `build`, `init`) and a handful of flags. `parseArgs` handles this without a dependency. The only real loss is auto-generated help text — write it as a constant string. |
| `node:fs/promises` | `glob` / `fast-glob` | Motto's directory structure is shallow and well-defined (`skills/<name>/`, `shared/references/`). A `readdir` + filter loop is 5 lines. `glob` adds a dependency for zero benefit on a known-shape tree. |
| Plain JS (ESM) | TypeScript | TypeScript requires a build step, contradicting the project's "no build step" constraint. For a ~500-line CLI, JSDoc types on exported functions are sufficient for IDE support. |
| Manual validation | `zod` / `ajv` | A YAML schema validator with custom error messages for two required fields (now a handful more, v0.0.5) is well under 100 lines total. `zod`/`ajv` add a dependency and return generic error messages that would need custom formatting anyway. |
| In-place dogfood test | Copy tree to `tmpdir` | Copying adds complexity, adds nothing (buildProject is already idempotent), and defeats the dogfood premise. Run against the real tree. |
| `node:child_process execFileSync` (v0.0.4) | `simple-git` / `execa` | A single synchronous read of two git config values doesn't warrant a git wrapper library. |
| `node:path` `resolve`+`sep` containment check (v0.0.5) | `path-is-inside` / `is-path-inside` | Both are thin wrappers around the same 4-line stdlib pattern; a dependency for four lines contradicts the zero-dep constraint. |
| Plain string/regex tag-presence check (v0.0.5) | Markdown/XML/HTML parser | Only boolean presence of two literal substrings needs checking; content between tags is explicitly unparsed by design. |
| GitHub-Actions-native CI (`actions/checkout`, `actions/setup-node`, `gh` CLI) (v0.0.6) | Third-party release/publish Actions (`semantic-release`, `softprops/action-gh-release`) | Motto's release flow keeps the version decision human and the artifact set minimal (one npm tarball); native building blocks cover it with zero added Action-supply-chain surface. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `chalk` / `kleur` / `picocolors` | Terminal color adds a dependency for cosmetic output. Lint errors must be machine-parseable anyway; color is a nice-to-have. | Plain string formatting; add color only if a user requests it post-MVP |
| `js-yaml` | YAML 1.1 schema by default — treats `yes`/`no`/`on`/`off`/`true`/`false` inconsistently; no position-aware error objects | `yaml` v2 |
| `gray-matter` | Wraps `js-yaml` (inheriting its schema issues); adds a dep for 10 lines of work; last major release 2019 | Inline frontmatter extraction with `yaml` |
| `commander` / `yargs` | Heavyweight for a handful of subcommands | `node:util parseArgs` |
| `zod` / `ajv` / `joi` | Schema validation frameworks; add dependency + generic error messages that still need custom formatting | Manual validation functions with specific, actionable error messages |
| TypeScript | Requires `tsc` build step; contradicts no-build-step constraint | Plain ESM JavaScript with JSDoc |
| `jest` / `vitest` | Require install + ESM config; not needed when `node:test` is stable and sufficient | `node:test` + `node:assert` |
| `glob` / `fast-glob` | Overkill for a fixed-shape source tree | `node:fs/promises readdir` with `recursive: true` option (Node 18.17+) |
| `mkdirp` / `rimraf` | Both superseded by Node stdlib | `fs.mkdir(path, {recursive:true})` and `fs.rm(path, {recursive:true,force:true})` |
| Snapshot libraries | Over-engineering; live assertions on the real dist/ are the ground truth | `node:assert/strict` + `fs.stat` / `fs.readFile` |
| `child_process.exec` / `execSync` (v0.0.4) | Both spawn a shell by default — shell-injection surface, even for hardcoded args | `child_process.execFileSync(file, args, opts)` — argv array, no shell |
| `inquirer` / `prompts` / `enquirer` (v0.0.4) | No interactive-wizard requirement in scope | `[name]` positional with a cwd-basename default |
| `degit` / `giget` / `tiged` (v0.0.4) | Starter skill content is local and known at build time — nothing to fetch remotely | Inline string templates in `src/init.js` |
| `fast-xml-parser` / `htmlparser2` / `remark` (v0.0.5) | Overkill for boolean tag-presence detection; content between tags is explicitly unparsed | `String.prototype.includes()` per `template.requiredSections` |
| `path-is-inside` / `sanitize-filename` (v0.0.5) | Both are thin wrappers around `node:path` primitives already imported elsewhere in this codebase | `resolve()`/`sep` containment check |
| `semantic-release` / `standard-version` / `release-please` / `changesets` (v0.0.6) | Infer version from commit-message conventions; collapses Motto's deliberate local-bump/CI-publish split back into one CI-driven step | `npm version` (human-decided, already synced to `motto.yaml`) + `gh release create --generate-notes` |
| `softprops/action-gh-release` (v0.0.6) | Unused feature surface for a single-artifact (npm tarball) release; one more pinned third-party Action to track | `gh release create --generate-notes` — preinstalled, zero added Action |
| `trufflehog` for the pre-public-flip gate (v0.0.6) | Live-verification/multi-source scanning aimed at continuous scanning, not a one-shot local check | `gitleaks git .` |
| `node-fetch` / `axios` / `got` (v0.0.6) | Superseded by Node's stable global `fetch` | Global `fetch()` |

---

## Gap Analysis

**Gap 1 — `version` in `plugin.json` is required for correct behavior.** Motto must emit `version` from the project's `motto.yaml`. If omitted, Claude Code version-tracks plugins by git SHA of the install location — which breaks for packaged distributions. Lint rule: `motto.yaml` must have a `version` field; `build` must propagate it to `plugin.json`.

**Gap 2 — `name` validation has a reserved-word rule.** SKILL.md `name` cannot contain `"anthropic"` or `"claude"` as substrings (case-sensitive per docs). Motto's linter must check this. It is not obvious from the field description alone.

**Gap 3 — `audience` field (`public`|`private`) is a Motto-specific concept, not a Claude Code field.** The output plugin directory name (your project name) is what separates public from private plugins — they are two separately-packaged plugin directories in `dist/`. Claude Code itself has no concept of audience; both are standard plugins. Motto's `build` command routes skills into `dist/public/<name>/` vs `dist/private/<name>/` based on the `audience` frontmatter key. Lint rule: `audience` must be `"public"` or `"private"` (no `"both"`).

**Gap 4 (v0.0.5) — `allowed-tools` "whitespace-free string" (D-05) conflicts with real, documented Claude Code syntax.** Parenthesized permission-rule entries like `Bash(git add *)` are normal, working `allowed-tools` values shown in Claude Code's own docs, and they contain internal spaces. A strict per-item whitespace-free check would reject valid input. See the v0.0.5 addendum's Q2 section above for the two reconciliation options (recommended: validate array-of-non-empty-strings shape only, drop the whitespace-free constraint).

**Gap 5 (v0.0.6) — Node 20 is already end-of-life (April 30, 2026), yet is both the project's `engines` floor and an explicit CI matrix leg.** Not a bug to fix within this milestone (the milestone's matrix is deliberate — real installs may still be on Node 20), but worth an explicit, separate decision later: either keep testing an EOL runtime because real users are on it, or bump the floor to `>=22`. Do not let this decision default silently.

**Gap 6 (v0.0.6) — npm trusted publishing works on private repos; only provenance requires public.** The milestone's sequencing (OIDC after the public flip, `NPM_TOKEN` as interim) is still the right call, but for the provenance benefit, not because OIDC itself is blocked pre-flip — worth stating explicitly in the release skill so a future reader doesn't assume trusted publishing is technically impossible on a private repo.

---

## Version Compatibility

| Package | Node.js | Notes |
|---------|---------|-------|
| `yaml@2.9.0` | ≥ 14.6 | Works fine on Node 20, 22, 24 |
| `node:test` | ≥ 20.0 (stable) | Available in 18 but marked experimental; use ≥ 20 |
| `node:util parseArgs` | ≥ 20.0 (stable) | Available in 18.3 but experimental; use ≥ 20 |
| `fs.readdir({recursive:true})` | ≥ 18.17 | Required for recursive directory scan without `glob` |
| `fs.cp()` | ≥ 16.7 | Available and stable in Node 20 |
| `child_process.execFileSync` (`encoding` option) | Long-stable (pre-v10) | No floor concern at Node ≥ 20; does not spawn a shell by default (v0.0.4) |
| `path.resolve()`, `path.sep` | Long-stable (pre-v10) | No floor concern at Node ≥ 20 (v0.0.5) |
| Global `fetch()` | ≥ 18 (experimental warning), ≥ 21 (stable, silent) | v0.0.6 — npm-drift check; harmless warning on the Node 20 matrix leg only |
| npm trusted publishing (OIDC) | npm CLI ≥ 11.5.1, Node ≥ 22.14.0 for the publish step | v0.0.6 — pin the publish job to Node 24, do not inherit the test matrix |

---

## Sources

- `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview` — SKILL.md frontmatter spec (required fields, name/description constraints, folder layout). Verified 2026-06-30, re-verified 2026-07-02. Confidence: HIGH (official Anthropic docs).
- `code.claude.com/docs/en/plugins-reference` — plugin.json manifest complete schema, plugin directory layout, version management behavior. Verified 2026-06-30. Confidence: MEDIUM (official Claude Code docs).
- `code.claude.com/docs/en/skills` — full SKILL.md frontmatter reference table including `allowed-tools`/`disallowed-tools` exact formats and real-world examples. Verified 2026-07-02. Confidence: HIGH (official Claude Code docs).
- `code.claude.com/docs/en/sub-agents` — subagent `tools`/`disallowedTools` field spec and MCP wildcard grammar. Verified 2026-07-02. Confidence: HIGH (official Claude Code docs).
- `agentskills.io/specification` — the open, cross-vendor Agent Skills format standard; complete frontmatter field table cross-checked against Claude Code's superset. Verified 2026-07-02. Confidence: HIGH (open-standard docs, endorsed/adopted by Anthropic and 40+ other agent products).
- `eemeli.org/yaml/` — yaml v2 API: parse, parseDocument, error handling, schema options. Verified 2026-06-30. Confidence: MEDIUM.
- `registry.npmjs.org/yaml/latest` — confirmed yaml@2.9.0 as current latest. Verified 2026-06-30. Confidence: HIGH.
- `nodejs.org/api/util.html#utilparseargsconfig` — parseArgs stable since Node v20.0.0, full option schema. Verified 2026-06-30 (re-verified 2026-07-01 for v0.0.4). Confidence: HIGH (official Node.js docs).
- `nodejs.org/learn/test-runner/using-test-runner` — node:test stable in Node 20, ESM support, describe/it/mock/coverage. Confidence: HIGH (official Node.js docs).
- `nodejs.org/api/child_process.html#child_processexecfilesyncfile-args-options` — execFileSync does not spawn a shell by default, encoding option, error shapes. Verified 2026-07-01. Confidence: HIGH (official Node.js docs).
- Node.js path-traversal prevention pattern (`resolve()`+`sep` containment check) — cross-checked across multiple independent Node.js security write-ups. Verified 2026-07-02 (WebSearch synthesis). Confidence: MEDIUM (community write-ups; underlying `node:path` API itself is HIGH confidence, official stdlib docs).
- Model Context Protocol `inputSchema`/`outputSchema` — `modelcontextprotocol.io/specification` — confirmed as a different protocol/object with no relationship to SKILL.md `outputs:`/`dependencies:`. Verified 2026-07-02 (WebSearch synthesis). Confidence: MEDIUM.
- `docs.npmjs.com/trusted-publishers/` — npm trusted publishing (OIDC) requirements, provenance constraints, permissions. Verified 2026-07-03 (WebFetch, official npm docs). Confidence: HIGH. See v0.0.6 addendum for full detail.
- `gitleaks/gitleaks` (GitHub) + 2026 secret-scanner comparison sources — one-shot git-history scan usage and rationale vs `trufflehog`. Verified 2026-07-03 (WebSearch synthesis). Confidence: MEDIUM. See v0.0.6 addendum.
- Node.js EOL schedule (`endoflife.date/nodejs`, cross-checked) — Node 20 EOL April 30, 2026. Verified 2026-07-03 (WebSearch synthesis). Confidence: MEDIUM-HIGH. See v0.0.6 addendum.
- Direct codebase inspection — `bin/motto.js`, `src/build.js`, `src/lint.js`, `src/config.js`, `src/schema.js`, `test/build.test.js`, `package.json`, `.gitignore`, `motto.yaml`, `.claude-plugin/marketplace.json`, `skills/release/SKILL.md`, `.planning/superpowers/specs/2026-07-02-skill-builder-design.md`, `.planning/PROJECT.md`. Verified 2026-06-30 (re-verified 2026-07-01, 2026-07-02, 2026-07-03). Confidence: HIGH.

---

*Stack research for: Motto CLI (Node ESM, YAML linter, Claude Code plugin packager) — base + v0.0.2 dogfood addendum + v0.0.4 project bootstrap addendum + v0.0.5 skill builder addendum + v0.0.6 Prove & Publish addendum*
*Researched: 2026-06-30 (base) · 2026-07-01 (v0.0.4 addendum) · 2026-07-02 (v0.0.5 addendum) · 2026-07-03 (v0.0.6 addendum)*
