# Phase 20: CI Workflow - Research

**Researched:** 2026-07-03
**Domain:** GitHub Actions CI for a Node.js CLI tool (matrix testing, dogfooding, npm tarball E2E, registry-drift detection, git-hook lifecycle guards)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Trigger scope & concurrency**
- **D-01:** Triggers are `push` to `main` + `pull_request` targeting `main`. Feature-branch pushes without a PR don't run; the PR gate satisfies "every push/PR". No duplicate push+PR runs.
- **D-02:** Concurrency group per ref with `cancel-in-progress: true` — superseded commits cancel their in-flight runs.
- **D-03:** **No path filters.** `.planning/`-only commits run full CI. `paths-ignore` breaks required-status-checks later (skipped run = check never reports, PR stuck) — Phase 22 will add branch protection, so keep the gate unconditional now.
- **D-04:** All four jobs (`test` matrix, `dogfood`, `pack-install-e2e`, `npm-drift`) run **in parallel — no `needs` edges**. Fastest feedback; independent failures surface independently. Phase 21's publish job is where `needs: [all]` gating lives.

**Pack-E2E assertion depth**
- **D-05:** `scripts/pack-install-e2e.mjs` asserts **exit codes + parsed JSON**: every step's exit code checked; `lint`/`build` run with `--format json`, stdout parsed, `.ok === true` and expected counts (e.g. `skillCount ≥ 1`) asserted. No file-tree diffing (brittle against init template evolution).
- **D-06:** Tarball consumption is the **real consumer path**: `npm pack` → tmp dir → `npm init -y` → `npm install <tarball>` → run via `npx motto`. Exercises bin linking, `files` allowlist, and dependency resolution exactly as a stranger would.
- **D-07:** `dogfood` and `pack-install-e2e` jobs run on **Node 20 only** — the `engines` floor. The unit matrix already covers 20/22/24; proving the shipped artifact at the minimum supported version is the highest-value single leg.
- **D-08:** The dogfood job **exercises the `--quiet` contract**: `motto lint --quiet` / `motto build --quiet` with assertions that stdout is empty and exit code is 0. Division of labor: dogfood proves `--quiet`, pack-E2E proves `--format json` — both Phase 19 flags get live CI coverage.

**npm-drift warning (CIW-04)**
- **D-09:** Warning surfaces as a GitHub Actions **`::warning::` annotation** — yellow banner on the run and PR checks UI, job stays green.
- **D-10:** **Warn-and-pass, never red:** if the check itself fails (registry unreachable, package 404), emit a "drift check inconclusive" `::warning::` and exit 0. A flaky registry must never block a push gate.
- **D-11:** Comparison is **warn on any mismatch** — `dist-tags.latest !== package.json version`. Catches the lag failure mode (v0.0.4/v0.0.5) AND the registry-ahead anomaly, with a single equality check and no semver parsing.
- **D-12:** Registry read via **Node stdlib `fetch`** to `https://registry.npmjs.org/@jeremiewerner%2Fmotto`, reading `dist-tags.latest`. One script guarantees exit 0; no `npm view` subprocess/exit-code juggling in YAML.

**Husky prepare guard (CIW-05)**
- **D-13:** Guard is **scoped, not always-succeed**: run husky only when `.git` exists; exit 0 otherwise. A genuinely broken husky install in a dev checkout still fails loudly. `husky || true` explicitly rejected (Pitfall 4).
- **D-14:** Guard lives in a **tiny `scripts/*.mjs` file** (e.g. `scripts/prepare.mjs`): portable to Windows contributors post-public-flip, readable, no JSON escaping. `scripts/` dir exists anyway for the pack-E2E script. Constraint: `scripts/` is NOT in the `files` allowlist — the guard must not break consumer installs where the file is absent (verify `prepare` semantics for tarball consumers during planning).
- **D-15:** Guard proven **implicitly via pack-E2E** — the tmp-dir tarball install is exactly the `.git`-less context; if the guard is wrong, pack-E2E's install step goes red. No dedicated guard test.
  - **⚠️ See "Verified Correction to D-15" in Common Pitfalls below — this session's empirical testing shows the pack-E2E install step as specified in D-06 does NOT actually invoke `prepare` at all, so D-15's implicit-proof premise does not hold as written. Flagged for the planner to resolve explicitly, not silently inherited.**

### Claude's Discretion

- Exact YAML layout, job names, step names, action version pins (`checkout@v6`, `setup-node@v6` per research stack).
- `pack-install-e2e.mjs` internal structure (tmp-dir management, cleanup, output style).
- Whether the drift check is an inline `node -e`/heredoc step or a small committed script — pick whichever stays readable given D-12's exit-0 guarantee.
- Wording of warning annotations and E2E failure messages.
- Whether `workflow_dispatch` is added as a convenience trigger.

### Deferred Ideas (OUT OF SCOPE)

- D-05 tarball-leak assertion in pack-E2E — Phase 21 (PUB-03), by design.
- README CI badge — cosmetic; natural fit for Phase 22's public-facing pass.
- OS matrix (Windows/macOS runners) — research-deferred until a real Windows bug appears.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| CIW-01 | Every push/PR runs the full test suite on a Node 20/22/24 matrix via `.github/workflows/ci.yml` | Standard Stack §CI matrix; Code Examples §1 (matrix job) |
| CIW-02 | CI runs dogfood `motto lint` + `motto build` against Motto's own `skills/` tree on a clean checkout | Code Examples §2 (dogfood job, Node 20 only, `--quiet` assertions); current `skills/` tree verified: 3 skills (`build-skill` public, `changelog`/`release` private) → `skillCount=3`, `bucketCount=2` |
| CIW-03 | CI runs a pack-install E2E (`scripts/pack-install-e2e.mjs`): `npm pack` → install tarball in tmp dir → `motto init` → `lint` → `build` — proving what npm actually ships works standalone | Code Examples §3 (pack-install-e2e.mjs skeleton); Common Pitfalls (npm pack --json shape, verified locally) |
| CIW-04 | CI warns (non-blocking) when npm registry latest lags `package.json` version | Code Examples §4 (drift-check script); registry endpoint verified live: `dist-tags.latest = 0.0.3` matches current `package.json` (silent today, by design) |
| CIW-05 | husky `prepare` script is guarded to no-op outside a git checkout (CI tarball installs, `npm ci` in workflows) | Code Examples §5 (`scripts/prepare.mjs`); Common Pitfalls — **verified correction**: the guard is NOT exercised by the D-06 pack-E2E flow as literally specified; planner must decide how to close this gap |

</phase_requirements>

## Summary

Phase 20 adds exactly one new file family to the repo: `.github/workflows/ci.yml` plus two small helper scripts (`scripts/pack-install-e2e.mjs`, `scripts/npm-drift-check.mjs` or equivalent, and `scripts/prepare.mjs`). Nothing under `src/` changes. Every capability is either a GitHub-Actions-native building block (`actions/checkout`, `actions/setup-node`, both pre-installed and requiring no new secrets) or Node.js stdlib (`fetch`, `child_process`, `fs/promises`) — this matches the milestone-wide zero-new-deps verdict already established in `.planning/research/STACK.md` and re-confirmed here.

The four jobs run in parallel with no `needs:` graph (D-04) since Phase 20 has no publish step to gate — that gating machinery is explicitly Phase 21's job. The trickiest design point is **not** the CI YAML itself (that's mechanical, well-documented) but getting the pack-install E2E script's assertion depth right (D-05/D-06) and correctly reasoning about **when the husky `prepare` script actually fires** — this session ran live experiments against real npm processes (not just documentation) and found that npm does **not** invoke a dependency's `prepare` script when it is installed as a regular (tarball or `file:`) dependency of another project — only when `npm ci`/`npm install` runs at that package's own root, or during `npm pack`/`npm publish` of that package. This means the D-06 pack-E2E flow (`npm install <tarball>` into a throwaway consumer project) does **not** exercise the CIW-05 guard the way D-15 assumes. This is flagged prominently below so the planner can decide how to close the gap explicitly rather than have it silently pass as "proven."

**Primary recommendation:** Build `ci.yml` as a single workflow file with four independent jobs (`test` matrix, `dogfood`, `pack-install-e2e`, `npm-drift`), each using `actions/checkout@v6` + `actions/setup-node@v6`, zero new npm dependencies, and explicitly test — rather than assume — where the husky guard's `.git`-less branch is actually exercised.

## Architectural Responsibility Map

This phase's "capabilities" don't map onto a web app's browser/server/API/DB tiers — they map onto CI/CD pipeline stages and packaging boundaries. Adapted tiers for this domain:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Node 20/22/24 unit-test matrix | CI Orchestration (GitHub Actions job) | — | Runs `npm test` (node:test) across matrix legs; pure CI concern, no application code touched |
| Dogfood lint/build | CI Orchestration | CLI Presentation (`bin/motto.js`) | CI job invokes the CLI exactly as a maintainer would locally; the CLI itself is unchanged (Phase 19 boundary) |
| Pack-install E2E | CI Orchestration | npm Package Boundary (`files` allowlist, `bin` linking) | Verifies the *distributed artifact* (tarball), not source — a packaging-boundary concern, only exercisable from CI/a script, never from unit tests importing source directly |
| npm-drift warning | CI Orchestration | External Service (npm registry, read-only) | Read-only `fetch` against a public HTTP API; no auth, no write capability — correctly scoped as an informational annotation, not a gate |
| husky `prepare` guard | Local Dev Tooling / npm Lifecycle Scripts | CI Orchestration (as an install-time consumer) | The guard itself is a `package.json` lifecycle-script concern (runs during `npm ci`/`npm install` at the package root); CI is one of several *contexts* that exercise it, not its owner |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `actions/checkout` | `v6` [CITED: .planning/research/STACK.md, GitHub Actions release notes] | Clone the repo into the runner workspace (creates a real `.git` directory) | Official, first-party GitHub Action; the only supported way to get repo contents onto a runner |
| `actions/setup-node` | `v6` (`v6.4.0`) [CITED: .planning/research/STACK.md] | Install the matrix Node version; built-in `cache: 'npm'` keyed off `package-lock.json` | Official, first-party; native npm caching removes the need for a separate `actions/cache` step |
| Node stdlib `fetch` | Node ≥ 18 (stable, unflagged ≥ 21) [CITED: nodejs.org release notes, via STACK.md] | Read `registry.npmjs.org` for the drift check | No HTTP client dependency needed; project floor is Node 20, where `fetch` works but prints one harmless `ExperimentalWarning` line on first use — cosmetic only, not a functional gap |
| Node stdlib `child_process` (`spawnSync`) | stdlib | Drive `npm pack`, `npm install`, `npx motto` inside `pack-install-e2e.mjs` | Same pattern already proven in `test/cli.test.js`'s `runCli()` helper — no new machinery |
| Node stdlib `fs/promises` (`mkdtemp`, `rm`) | stdlib | Tmp-dir lifecycle for the pack-install E2E | Same pattern already proven in `test/init-dogfood.test.js` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `npm pack --json --pack-destination <dir>` | npm (bundled) | Produce the real tarball + machine-readable manifest (`filename`, `files[]`) in one step | Verified locally this session: output shape is `[{ filename, name, files: [{path, size, mode}, ...] }]` — `filename` for scoped packages is the flattened `jeremiewerner-motto-<version>.tgz` form |
| `npm init -y` | npm (bundled) | Create a throwaway `package.json` in the E2E consumer tmp dir so `npm install <tarball>` has a project to attach to | Standard "simulate a real consumer" pattern (D-06) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node stdlib `fetch` for drift check | `npm view <pkg>@<version>` subprocess | Rejected by D-12 explicitly — subprocess exit-code/stderr juggling is more YAML complexity for the same one HTTP GET; stdlib `fetch` keeps the check a single script with a guaranteed `exit 0` |
| Single `ci.yml` with 4 parallel jobs | Separate workflow files per concern | Rejected — GitHub Actions has no cross-file `needs:`-equivalent without the friction of `workflow_run`; one file matches this phase's "mechanism over features" constraint and Phase 21's future `needs:` graph is simpler to add to jobs already in the same file |
| `scripts/prepare.mjs` `.git`-existence check | `HUSKY=0` env var set in CI | `HUSKY=0` is husky's own documented pattern for **CI-only** skipping, but doesn't cover a non-CI `.git`-less tarball extraction (e.g. a ZIP download) and requires every calling context to remember to set the env var — D-13 wants the guard itself to detect the absence of `.git`, not rely on callers opting in |

**Installation:**
No installation required — this phase adds zero new `package.json` dependencies. `actions/checkout`/`actions/setup-node` are referenced by tag in `ci.yml`, not installed via npm.

**Version verification:** GitHub Actions (`actions/checkout`, `actions/setup-node`) are not npm/PyPI/crates packages, so the Package Legitimacy Gate protocol (which checks registry provenance) does not apply to them. Their current major versions were verified in `.planning/research/STACK.md` this same milestone (WebSearch synthesis, MEDIUM confidence, cross-checked against GitHub's own changelog/issue tracker) — no new verification performed this session; treat as [CITED], not [VERIFIED].

## Package Legitimacy Audit

**Not applicable — this phase adds zero new npm/PyPI/crates packages.** All new capabilities (CI workflow, pack-install-e2e script, drift-check script, prepare guard) are GitHub Actions references (not npm packages) or plain Node.js stdlib. No `npm install` of any new dependency occurs as part of this phase's implementation.

## Architecture Patterns

### System Architecture Diagram

```
                     push to main            pull_request → main
                            │                        │
                            └───────────┬────────────┘
                                         ▼
                    concurrency group: ${{ github.ref }}
                       cancel-in-progress: true (D-02)
                                         │
        ┌────────────────┬──────────────┼───────────────┬─────────────────┐
        ▼                ▼              ▼               ▼                 (no needs: edges — D-04)
  ┌───────────┐   ┌─────────────┐  ┌──────────────────┐ ┌────────────┐
  │   test    │   │   dogfood   │  │ pack-install-e2e │ │ npm-drift  │
  │ matrix:   │   │ Node 20 only│  │  Node 20 only     │ │(any node)  │
  │ 20/22/24  │   │ (D-07)      │  │  (D-07)           │ │            │
  ├───────────┤   ├─────────────┤  ├──────────────────┤ ├────────────┤
  │ checkout  │   │ checkout    │  │ checkout           │ │ checkout   │
  │ setup-node│   │ setup-node  │  │ setup-node         │ │ setup-node │
  │ npm ci    │   │ npm ci      │  │ npm ci             │ │ npm ci     │
  │ npm test  │   │ lint --quiet│  │ npm pack --json    │ │ node       │
  │           │   │ build --quiet│ │  → tmp dir install │ │ scripts/   │
  │           │   │ (D-08:      │  │  → npx motto init  │ │ npm-drift- │
  │           │   │  stdout ==  │  │  → lint --format   │ │ check.mjs  │
  │           │   │  '', exit0) │  │    json (parse .ok)│ │ (fetch     │
  │           │   │             │  │  → build --format  │ │ registry,  │
  │           │   │             │  │    json (parse     │ │ ::warning::│
  │           │   │             │  │    skillCount)      │ │ on mismatch│
  │           │   │             │  │  (D-05, D-06)       │ │ or         │
  │           │   │             │  │                    │ │ inconclusive│
  │           │   │             │  │                    │ │ exit 0     │
  │           │   │             │  │                    │ │ always;    │
  │           │   │             │  │                    │ │ D-09..D-12)│
  └───────────┘   └─────────────┘  └──────────────────┘ └────────────┘
        │                │                  │                  │
        └────────────────┴──────────────────┴──────────────────┘
                                    │
                          all four report independently
                       (green/red per job; no aggregate gate
                        needed until Phase 21's publish job
                        adds `needs: [test, dogfood,
                        pack-install-e2e]`)
```

### Recommended Project Structure

```
.github/
└── workflows/
    └── ci.yml                  # single workflow, 4 parallel jobs (test/dogfood/pack-install-e2e/npm-drift)
scripts/
├── pack-install-e2e.mjs        # NEW — npm pack → tmp install → init/lint/build; CIW-03
├── prepare.mjs                 # NEW — .git-existence guard wrapping `npx husky`; CIW-05
└── npm-drift-check.mjs         # NEW (or inline in ci.yml, per Claude's Discretion) — CIW-04
package.json                    # MODIFIED — "prepare": "node scripts/prepare.mjs"
```

### Pattern 1: Single workflow, parallel jobs, no `needs:` graph this phase

**What:** All four Phase 20 jobs declared as siblings in one `ci.yml`, none depending on another via `needs:`.
**When to use:** When there is no downstream action this phase needs to gate (no publish job exists yet). Phase 21 adds the publish job and its own `needs: [test, dogfood, pack-install-e2e]` — `npm-drift` is deliberately excluded from that future `needs:` list since it's advisory, not a release gate (matches D-09/D-10's "never red").
**Example:**
```yaml
# Source: .planning/research/STACK.md (verified CI recommendation) + D-01..D-04
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

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
      - run: npm test
```

### Pattern 2: Dogfood job pinned to a single Node version, not the full matrix

**What:** `dogfood` and `pack-install-e2e` (D-07) run once, on Node 20 (the `engines` floor), instead of duplicating across all three matrix legs.
**When to use:** When a job's purpose is "prove the artifact works at the *minimum* supported version," not "prove correctness across versions" (that's the `test` matrix's job). Running dogfood/E2E three times (once per matrix leg) would be redundant CI minutes for the same assertion.
**Example:**
```yaml
# Source: D-07, D-08 — dogfood job pinned to Node 20, exercises --quiet
dogfood:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with: { node-version: 20, cache: 'npm' }
    - run: npm ci
    - name: lint --quiet (D-08 — stdout empty, exit 0)
      run: |
        out=$(node bin/motto.js lint --quiet)
        if [ -n "$out" ]; then echo "expected empty stdout, got: $out" >&2; exit 1; fi
    - name: build --quiet (D-08 — stdout empty, exit 0)
      run: |
        out=$(node bin/motto.js build --quiet)
        if [ -n "$out" ]; then echo "expected empty stdout, got: $out" >&2; exit 1; fi
```

### Pattern 3: Never-red advisory check (`::warning::` + guaranteed `exit 0`)

**What:** The npm-drift check is structured so *nothing* inside it can turn the job red — every branch (success, mismatch, network failure, 404) ends in `process.exitCode = 0` (or simply never sets a non-zero exit code), with the *content* of the message (not the exit code) carrying the signal via a GitHub Actions workflow command.
**When to use:** Any check whose entire value is visibility, not enforcement (D-09/D-10). The `::warning::` command must be the **only** mechanism carrying "something's off" — never let a `try`/`catch` gap accidentally let an unhandled rejection or thrown error propagate a non-zero exit.
**Example:**
```js
// Source: D-09..D-12 — scripts/npm-drift-check.mjs (illustrative shape)
import { readFileSync } from 'node:fs';

async function main() {
  const { version: localVersion } = JSON.parse(readFileSync('package.json', 'utf8'));
  try {
    const res = await fetch('https://registry.npmjs.org/@jeremiewerner%2Fmotto');
    if (!res.ok) {
      console.log(`::warning::npm-drift check inconclusive (registry returned ${res.status})`);
      return;
    }
    const data = await res.json();
    const latest = data['dist-tags']?.latest;
    if (!latest) {
      console.log('::warning::npm-drift check inconclusive (no dist-tags.latest in response)');
      return;
    }
    if (latest !== localVersion) {
      console.log(
        `::warning::npm registry latest (${latest}) does not match package.json (${localVersion})`,
      );
    }
  } catch (err) {
    console.log(`::warning::npm-drift check inconclusive (${err.message})`);
  }
}

await main();
// No explicit process.exitCode set anywhere above — script always exits 0 (D-10).
```

### Anti-Patterns to Avoid

- **Adding `needs:` between the four Phase 20 jobs "to be safe":** Contradicts D-04 explicitly. There is nothing to gate yet — that's Phase 21's concern. Adding `needs:` now just slows feedback for no benefit.
- **Using `paths-ignore`/`paths` filters to skip CI on docs-only commits:** Explicitly rejected by D-03 — breaks required-status-checks (a skipped run never reports a check result, so a required check stays pending forever, not "passed").
- **Letting the drift check's own error handling leak a non-zero exit:** e.g. an unhandled promise rejection from `fetch()` outside a try/catch would fail the job — violates D-10's "warn-and-pass, never red" guarantee. Wrap the entire check body, not just the `fetch()` call.
- **Assuming `--omit=dev`/pruned installs anywhere in this workflow:** None of the four jobs need a production-only install (`npm ci` with dev deps intact is correct everywhere here) — introducing `--omit=dev` would break the `test`/`dogfood` matrix legs (husky is a devDependency, and pruning it would make the *root* `prepare` script fail even with the guard in place, since the guard's job is to detect `.git` absence, not devDependency absence).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Node version installation + npm caching in CI | A custom `nvm install`/manual cache-key script | `actions/setup-node@v6` with `cache: 'npm'` | First-party action already solves version pinning + `package-lock.json`-keyed caching correctly; a hand-rolled cache key is a common source of stale-cache bugs |
| Cancelling superseded workflow runs | A custom "check if newer commit exists, self-cancel" step | `concurrency: { group, cancel-in-progress: true }` | Native GitHub Actions feature (D-02) — zero code, exactly the semantics needed |
| Parsing `npm pack`'s file manifest | Regex over `npm pack`'s human-readable text output | `npm pack --json` (verified locally: clean array-of-objects shape with `filename`/`files[]`) | The JSON flag exists precisely so scripts don't have to parse tarball-listing text |
| HTTP GET + JSON parse for the registry drift check | A hand-rolled HTTP client or a hand-rolled retry/backoff wrapper | Node stdlib `fetch` + a single try/catch (per D-10, failures are just another "inconclusive" branch, not a reason to retry) | No retry logic is needed since the check's own failure mode is designed to be silent (D-10) — retries would only delay an already-non-blocking check |

**Key insight:** Every mechanism this phase needs already exists as either a first-party GitHub Action or a one-line stdlib call. The actual engineering risk in this phase is not "which library to use" (there is none) but "which of the four jobs' assumptions are actually true when tested empirically" — see the husky-guard correction below, discovered only by running real `npm` commands rather than trusting documentation/training-data alone.

## Common Pitfalls

### Pitfall 1: `npm ci`/`prepublishOnly` firing on every matrix leg (carried from PITFALLS.md Pitfall 3)
**What goes wrong:** `prepublishOnly` (`node bin/motto.js build`) fires on every `npm ci` at the repo root, not just at actual publish time — so the `test` matrix's `npm ci` step regenerates `dist/` three times (once per Node version), and `dogfood`/`pack-install-e2e` each add one more.
**Why it happens:** `prepublishOnly` is a package-level lifecycle hook tied to any local install action on the package itself, not scoped to "only fires during `npm publish`."
**How to avoid:** This is a no-op risk today since `motto build` is fully deterministic and idempotent (verified by the existing dogfood test suite) — just leave an explicit YAML comment noting the double-fire so a future maintainer adding a non-idempotent lifecycle script knows to check this.
**Warning signs:** `dist/` output differing between matrix legs for reasons unrelated to source changes.

### Pitfall 2: [VERIFIED — correction to D-15] The pack-install-e2e flow as specified does NOT exercise the husky `prepare` guard
**What goes wrong:** D-15 assumes "the tmp-dir tarball install is exactly the `.git`-less context; if the guard is wrong, pack-E2E's install step goes red." This session ran real `npm pack` / `npm install <tarball>` / `npm install file:../pkg` commands against a throwaway fixture package with a `"prepare"` script that prints to stderr, to directly test this claim.
**What was actually observed (this session, live npm 11.11.0):**
- `npm pack` (run inside the package's own directory) **does** trigger `prepare` (matches documented `prepack`→`prepare` behavior) — but that step runs at the CI/dev checkout root, where `.git` **is** present (via `actions/checkout` or a real local clone), so the guard's `.git`-absent branch is never reached here either.
- `npm install <path-to-tarball.tgz>` **as a dependency** of a separate throwaway consumer project (exactly D-06's flow) does **NOT** trigger the tarball's own `prepare` script at all — verified with `--loglevel verbose`, zero mention of `prepare` in the installed dependency's lifecycle.
- The same negative result holds for a `file:../pkg` dependency reference — also does not trigger the dependency's `prepare`.
- npm's documented behavior (`docs.npmjs.com/cli/v11/using-npm/scripts/`) matches this: `prepare` runs "before the package is packed, before it is published, on local `npm install` without arguments, and when installing git dependencies" — nested tarball/file dependency installs are not one of the listed cases.
**Why it happens:** D-15 conflates "installing the published tarball" (what actually happens to a real npm consumer) with "the package's own root receiving an `npm ci`/`npm install`" (the only context where `prepare` fires). These are different operations; the E2E's `npm install <tarball>` is the former, not the latter.
**How to avoid:** Flag this explicitly for the planner rather than let it silently ship as "proven." Two honest options:
  1. **Add an explicit guard test**, independent of pack-install-e2e: copy the repo (excluding `.git`, e.g. via `rsync --exclude=.git` or `git archive | tar -x` into a tmp dir) and run `npm ci` there, asserting exit 0 despite the missing `.git` — this is the only way to genuinely exercise the D-13 guard's no-op branch.
  2. **Accept D-15 is unverifiable as originally scoped** and document the guard as "verified by code review + the D-13 scoped-condition test, not by CI" — i.e., downgrade the confidence claim rather than assert false CI coverage.
  Either is legitimate; silently keeping D-15's language unchanged (claiming implicit proof that doesn't exist) is not.
**Warning signs:** If a future change subtly breaks `scripts/prepare.mjs`'s `.git`-detection logic, `pack-install-e2e`'s CI job will **not** turn red as a result (per this finding) — the bug would only surface when someone actually tries a `.git`-less checkout of the *source repo* (e.g., a fresh contributor downloading a ZIP of the repo, not the npm package).

### Pitfall 3: `--format json` mixed with human text (carried from Phase 19, now a consumed contract)
**What goes wrong:** If a future change to `bin/motto.js` reintroduces any `process.stdout.write` of human text under `--format json`, CI's `JSON.parse(stdout)` calls in both `dogfood` (no — dogfood uses `--quiet`, not `--format json`) and `pack-install-e2e` (yes — D-05/D-06 parse JSON) would throw.
**Why it happens:** This was already fixed in Phase 19 (D-01/D-02/D-05/D-09 of `19-CONTEXT.md`) — Phase 20 is a **consumer** of that contract, not a place it can regress silently, since `renderResult()` in `bin/motto.js` is the single source of truth and Phase 20 adds no new CLI code.
**How to avoid:** `pack-install-e2e.mjs`'s JSON-parsing steps should include the raw stdout in their failure message (as `test/cli.test.js` already does: `` `stderr: ${r.stderr}\nstdout: ${r.stdout}` ``) so a future regression fails loudly with the actual malformed output visible in CI logs, not just a generic `JSON.parse` syntax error.
**Warning signs:** `JSON.parse` throwing `Unexpected token` in the E2E job — check for a stray `console.log`/`process.stdout.write` sneaking human text onto stdout in json mode.

### Pitfall 4: `npm pack --json`'s scoped-package filename mangling
**What goes wrong:** `npm pack --json` for `@jeremiewerner/motto` produces `filename: "jeremiewerner-motto-0.0.3.tgz"` (verified locally) — the `@` and `/` are stripped/flattened, not URL-encoded or literally reproduced. A script that naively constructs the expected filename as `` `${name}-${version}.tgz` `` (using the raw `@scope/name` string) will build the wrong path and fail to find the tarball.
**Why it happens:** npm's own scoped-package tarball-naming convention replaces `@`/`/ ` with nothing/`-` respectively; this is undocumented in the `--json` output schema itself, only observable by running it.
**How to avoid:** Always read `filename` directly from the `npm pack --json` output array (`data[0].filename`) rather than reconstructing it from `package.json`'s `name`/`version` fields.
**Warning signs:** `ENOENT` on a tarball path the script assembled itself instead of reading from `npm pack`'s own JSON.

### Pitfall 5: Concurrency group scoped without `${{ github.ref }}`
**What goes wrong:** If the `concurrency.group` key is set to a constant (e.g. just `ci`) instead of including `${{ github.ref }}`, unrelated branches/PRs cancel each other's in-flight runs — a push to a feature-branch PR could cancel `main`'s own CI run.
**Why it happens:** Copy-pasted concurrency examples sometimes omit the ref for simplicity in single-branch demo repos.
**How to avoid:** Always include `${{ github.ref }}` (or `github.head_ref` for PRs specifically) in the group key, per D-02's intent ("per ref").
**Warning signs:** A `main` push's CI run unexpectedly shows "cancelled" with no corresponding new `main` commit.

## Code Examples

Verified patterns (this session's live testing + official docs):

### Registry drift-check endpoint (verified live, 2026-07-03)
```bash
# Source: verified via direct curl this session — confirms URL-encoding and response shape
curl -s "https://registry.npmjs.org/@jeremiewerner%2Fmotto" | node -e "
let d=''; process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  const j = JSON.parse(d);
  console.log(j.name, j['dist-tags']);
  // → '@jeremiewerner/motto' { latest: '0.0.3' }
});
"
```
Current state (verified): `dist-tags.latest = 0.0.3`, matching `package.json`'s current `0.0.3` — the drift check will report **no warning** today, exactly as `20-CONTEXT.md`'s code_context section already predicted ("silent until the pre-milestone 0.0.5 catch-up publish").

### `npm pack --json` output shape (verified locally, npm 11.11.0)
```json
[
  {
    "filename": "jeremiewerner-motto-0.0.3.tgz",
    "name": "@jeremiewerner/motto",
    "files": [
      { "path": "LICENSE", "size": 1073, "mode": 420 },
      { "path": "bin/motto.js", "size": 16786, "mode": 493 }
    ]
  }
]
```

### `pack-install-e2e.mjs` skeleton (D-05/D-06)
```js
// Source: pattern derived from test/cli.test.js's runCli() + test/init-dogfood.test.js's
// mkdtemp lifecycle — both already proven in this codebase; this is a new call site, not
// new machinery. Illustrative shape, not final code.
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    console.error(`FAIL: ${cmd} ${args.join(' ')}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
    process.exit(1);
  }
  return r;
}

const packDir = await mkdtemp(join(tmpdir(), 'motto-pack-'));
const packResult = run('npm', ['pack', '--json', '--pack-destination', packDir]);
const [{ filename }] = JSON.parse(packResult.stdout);
const tarballPath = join(packDir, filename);

const consumerDir = await mkdtemp(join(tmpdir(), 'motto-e2e-'));
run('npm', ['init', '-y'], { cwd: consumerDir });
run('npm', ['install', tarballPath], { cwd: consumerDir });

run('npx', ['motto', 'init', 'e2e-project'], { cwd: consumerDir });
const projectDir = join(consumerDir, 'e2e-project');

const lintResult = run('npx', ['motto', 'lint', '--format', 'json'], { cwd: projectDir });
const lintJson = JSON.parse(lintResult.stdout);
if (lintJson.ok !== true || lintJson.count < 1) {
  console.error(`FAIL: lint JSON assertion — ${lintResult.stdout}`);
  process.exit(1);
}

const buildResult = run('npx', ['motto', 'build', '--format', 'json'], { cwd: projectDir });
const buildJson = JSON.parse(buildResult.stdout);
if (buildJson.ok !== true || buildJson.skillCount < 1) {
  console.error(`FAIL: build JSON assertion — ${buildResult.stdout}`);
  process.exit(1);
}

await rm(packDir, { recursive: true, force: true });
await rm(consumerDir, { recursive: true, force: true });
console.log('pack-install-e2e: OK');
```

### `scripts/prepare.mjs` guard (D-13/D-14)
```js
// Source: D-13 (scoped, not always-succeed) — pattern generalized from husky's own
// documented .husky/install.mjs example (typicode.github.io/husky/how-to.html), adapted
// to check .git presence directly (per D-13) rather than NODE_ENV/CI env vars, since a
// .git-less-ZIP-download scenario may not set CI=true.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!existsSync('.git')) {
  process.exit(0); // not a git checkout (tarball install, npm ci in a git-less context) — no-op
}

execSync('npx husky', { stdio: 'inherit' }); // real checkout — let a genuine failure surface loudly
```
`package.json`: `"prepare": "node scripts/prepare.mjs"`. Note `scripts/` is **not** in the `files` allowlist (`["bin/", "src/", "dist/public/"]`) — this is safe precisely *because* `prepare` never fires for a package installed as a dependency (see Pitfall 2's verified finding), so the absence of `scripts/prepare.mjs` in a consumer's `node_modules/@jeremiewerner/motto/` never matters at runtime.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| No CI at all (husky pre-commit hook only) | Full GitHub Actions gate on every push/PR (`.github/workflows/ci.yml`) | This phase (v0.0.6) | Local-only enforcement (`git commit` on the author's machine) becomes a repo-level, unbypassable-by-default gate (once Phase 22 adds branch protection) |
| Manual "did I remember to publish?" checks | Automated npm-drift `::warning::` annotation on every push to `main` | This phase | The exact v0.0.4/v0.0.5 silent-drift failure mode becomes a visible yellow banner instead of a months-later manual discovery |
| Tarball integrity checked only at release time (skills/release/SKILL.md Step 4, human-run) | Tarball integrity + actual runnable-ness checked on every push via `pack-install-e2e` | This phase | Catches `files`-allowlist regressions immediately, not just at the moment of a real release |

**Deprecated/outdated:**
- The `skills/release/SKILL.md` Step 4 tarball-verify script (D-05 tarball-leak assertion) stays in place for now — Phase 21 (PUB-03) is where it formally migrates into the CI pack-E2E script per the milestone's locked ordering. Do not migrate it in this phase (out of scope, per `<deferred>`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `actions/checkout@v6` / `actions/setup-node@v6` are the current recommended major versions | Standard Stack | Low — these are [CITED] from same-milestone research (STACK.md), not independently re-verified this session; if a newer major exists by execution time, the plan should re-check before pinning |
| A2 | GitHub-hosted `ubuntu-latest` runners have `git`, `npm`, `node` (pre-`setup-node` override) available by default | Environment Availability | Low — this is standard, well-documented GitHub Actions runner behavior, not independently re-verified this session |

**All other claims in this research were either verified via direct tool execution this session (npm pack/install experiments, live registry curl) or cited from the project's own same-day research documents (STACK.md/ARCHITECTURE.md/PITFALLS.md), which are themselves grounded in official npm/GitHub docs per their own source citations.**

## Open Questions

1. **How should the planner resolve the D-15 gap (husky guard not actually exercised by pack-install-e2e)?**
   - What we know: The guard's `.git`-absent branch is real code that needs correctness, but D-06's specified E2E flow (verified this session) never reaches it.
   - What's unclear: Whether the phase should add a small dedicated test for this (a few extra lines, low cost) or explicitly document the gap and accept code-review-only confidence for CIW-05.
   - Recommendation: Add a minimal explicit check — e.g., a step in `pack-install-e2e.mjs` or a tiny separate script that copies the repo tree (excluding `.git`) into a tmp dir via `git archive HEAD | tar -x -C <tmpdir>` and runs `npm ci` there, asserting exit 0. `git archive` is stdlib-adjacent (a `git` subcommand, already a required CI tool) and produces exactly the `.git`-less tree shape the guard needs to handle. This closes the loop cheaply without inventing new test infrastructure.

2. **Does `npm ci` at the CI `test`/`dogfood` job roots ever actually reach the guard's `.git`-absent branch?**
   - What we know: `actions/checkout@v6` always produces a real `.git` directory in the runner workspace — verified as standard, well-documented behavior (not independently re-tested this session, but consistent with universal GitHub Actions usage).
   - What's unclear: Nothing at the CI level — this confirms the *only* place the guard's no-op branch matters in this milestone's own workflow is (a) the recommended `git archive`-based test above, if added, or (b) a hypothetical future Docker build that COPies source without `.git` (out of scope this phase).
   - Recommendation: No action needed for the CI jobs themselves; this is context for Open Question 1, not a separate risk.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `git` (on GitHub-hosted runner) | `actions/checkout`, `git archive` guard test (if added) | ✓ (standard runner image) | — | — |
| `node`/`npm` (pre-`setup-node`, then overridden) | All four jobs | ✓ (standard runner image, then replaced by `setup-node` matrix version) | — | — |
| `npx` | pack-install-e2e (`npx motto ...`) | ✓ (bundled with npm ≥ 5.2) | — | — |
| Local dev machine — `node`/`npm` (for authoring/testing this phase's scripts before pushing) | Local iteration | ✓ | node v24.14.1, npm 11.11.0 (verified this session) | — |
| Public internet access from GitHub-hosted runners to `registry.npmjs.org` | `npm-drift` job | ✓ (standard outbound access on `ubuntu-latest`) | — | D-10's own inconclusive-warning branch is the built-in fallback if this is ever unavailable |

**Missing dependencies with no fallback:** None identified.

**Missing dependencies with fallback:** None beyond the npm-drift check's own designed-in fallback (D-10).

## Security Domain

`security_enforcement` is enabled (`security_asvs_level: 1` per `.planning/config.json`). This phase has no application-level authentication/authorization/input-validation surface — it is pure CI/CD pipeline configuration with no new runtime code path reachable by an end user. The relevant ASVS categories are therefore mostly N/A; the real risk surface here is **CI/CD supply-chain configuration**, which ASVS v5's "V14 Configuration" family addresses in spirit even though the categories below are the closest existing labels.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | No auth surface added this phase (no `NPM_TOKEN`/OIDC — that's Phase 21) |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A — GitHub's own repo permissions gate who can push/open PRs |
| V5 Input Validation | Partial | `bin/motto.js`'s existing `--format`/`--quiet` validation (Phase 19) is what CI *consumes*, not what this phase adds; no new user-facing input parsing is introduced |
| V6 Cryptography | No | No secrets/tokens are introduced this phase (npm-drift check is an unauthenticated read; publish tokens are Phase 21) |
| V14 Configuration (CI/CD-adjacent) | Yes | Pin third-party Actions by tag (`@v6`), not `@main`/`@latest`; scope workflow `permissions:` to least-privilege even though this phase needs no elevated permissions (default `GITHUB_TOKEN` read-only is sufficient — no `contents: write`/`id-token: write` needed until Phase 21) |

### Known Threat Patterns for GitHub Actions CI (no publish job yet)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Malicious PR from a fork runs arbitrary code in a workflow with write-level `GITHUB_TOKEN`/secrets access | Elevation of Privilege | `pull_request` (not `pull_request_target`) is the correct trigger for this phase's jobs — `pull_request` runs with a read-only, fork-scoped token and no repo secrets by default. D-01 already specifies `pull_request` (not `_target`), which is the safe choice; do not switch triggers without re-evaluating this. |
| Unpinned/floating Action tags (`@main`, `@v6` without a lockfile-equivalent) get silently updated to a compromised release | Tampering | This phase pins `actions/checkout@v6`/`actions/setup-node@v6` by major-version tag (standard practice, matches the milestone's existing research); SHA-pinning is a stricter alternative some security-hardened orgs use but is explicitly not required at this project's current risk tolerance (single-maintainer, "mechanism over features") — note as a documented tradeoff, not a gap to fix silently |
| Workflow `permissions:` left at the (historically write-all) default | Elevation of Privilege | None of this phase's four jobs need anything beyond the default read-only `GITHUB_TOKEN` (no `contents: write`, no `id-token: write` — those arrive with Phase 21's publish job); an explicit top-level `permissions: { contents: read }` block is good practice to add now, even though nothing in this phase strictly requires it, since it establishes the least-privilege baseline before Phase 21 adds a job that genuinely needs more |
| A compromised/typo'd third-party Action in the supply chain | Tampering | This phase introduces zero third-party (non-`actions/*`) Actions — only `actions/checkout` and `actions/setup-node`, both first-party GitHub Actions. No new supply-chain surface from this phase specifically. |

## Sources

### Primary (HIGH confidence)
- Direct tool execution, this session: `npm pack`, `npm install <tarball>`, `npm install file:../pkg`, `npm pack --json --dry-run`, live `curl` against `registry.npmjs.org/@jeremiewerner%2Fmotto` — all outputs quoted verbatim above. This is the strongest evidence in this document and directly overturns an assumption baked into `20-CONTEXT.md` D-15.
- Repo source, read directly: `bin/motto.js`, `package.json`, `test/cli.test.js`, `test/init-dogfood.test.js`, `skills/release/SKILL.md`, `.planning/config.json`, `skills/*/SKILL.md` (audience fields) — HIGH confidence, primary source.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` (same-milestone, same-day research, already grounded in official npm/GitHub docs per their own source lists) — cited throughout for action versions, OIDC/publish sequencing context (Phase 21, not this phase), and the pitfalls this phase's design already accounts for.
- `typicode.github.io/husky/how-to.html` (WebFetch this session) — confirms husky's own documented `HUSKY=0`/`.husky/install.mjs` guard patterns; this phase's `scripts/prepare.mjs` generalizes the same idea to a `.git`-existence check per D-13's stricter requirement.
- `docs.npmjs.com/cli/v11/using-npm/scripts/` (referenced via WebSearch synthesis this session, corroborated by direct experimentation) — confirms `prepare`'s documented trigger conditions (local install w/o args, git dependencies, pack/publish) do not include "installed as a tarball/file dependency of another project," matching this session's empirical test.

### Tertiary (LOW confidence)
- None — every claim in this document is either directly verified this session or cited from an already-sourced project research document.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps, all mechanisms either first-party GitHub Actions or Node stdlib, cross-checked against same-milestone research
- Architecture: HIGH — single-workflow/parallel-jobs pattern is well-established GitHub Actions practice, consistent with the project's own prior research
- Pitfalls: HIGH — the most important pitfall (husky guard's actual exercise point) was verified via live experimentation this session, not assumed from documentation

**Research date:** 2026-07-03
**Valid until:** 30 days (GitHub Actions action-version pins and npm lifecycle-script semantics are stable; re-verify action major versions if planning is deferred past ~30 days)
