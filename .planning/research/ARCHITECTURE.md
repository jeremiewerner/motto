# Architecture Research

**Domain:** CI/CD integration for an existing Node CLI (motto) — GitHub Actions, npm publish automation, CLI output-format flags
**Researched:** 2026-07-03
**Confidence:** HIGH (verified against current repo source: `src/lint.js`, `src/build.js`, `bin/motto.js`, `skills/release/SKILL.md`, `package.json`, `test/cli.test.js`; MEDIUM on npm trusted-publishing specifics — recent 2025 GA feature, verified via official docs + changelog)

This is a **subsequent-milestone integration** doc, not a greenfield architecture doc. It answers exactly the four integration questions posed, plus a build order. It does not re-derive the existing lint/build/schema architecture (unchanged this milestone). It supersedes the previous `ARCHITECTURE.md` (v0.0.5 Skill Builder integration research), which is no longer current.

## System Overview

Five new pieces land this milestone. Four are additive; one (release skill) is a rewrite. None of them touch the never-throw validation core (`schema.js`, `lint.js`, `build.js` internals) — they wrap it.

```
┌──────────────────────────────────────────────────────────────────────┐
│ .github/workflows/ci.yml  (ONE workflow, multiple jobs, needs: graph) │
│                                                                        │
│  on: push [main, tags v*], pull_request [main]                        │
│                                                                        │
│  ┌─────────┐   ┌──────────┐   ┌───────────────────┐   ┌───────────┐  │
│  │  test   │   │ dogfood  │   │ pack-install-e2e   │   │ npm-drift │  │
│  │ 20/22/24│   │ lint+bld │   │ npm pack → tmp dir │   │  (warn)   │  │
│  │ matrix  │   │          │   │ → install → lint/  │   │           │  │
│  │         │   │          │   │   build             │   │           │  │
│  └────┬────┘   └────┬─────┘   └─────────┬──────────┘   └───────────┘  │
│       │             │                    │                            │
│       └─────────────┴────────needs───────┘                            │
│                      ▼                                                │
│              ┌───────────────┐                                       │
│              │    publish    │  if: refs/tags/v*                     │
│              │ npm publish   │  needs: [test, dogfood,               │
│              │ + GH Release  │          pack-install-e2e]             │
│              └───────┬───────┘                                       │
└──────────────────────┼────────────────────────────────────────────────┘
                        │ (triggered by)
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ skills/release/SKILL.md  (rewritten — local half only)                │
│                                                                        │
│  Step 1 tests → Step 2 version bump → Step 3 dogfood → Step 4 tag +   │
│  push  ──────────────────────────────────────────────────────────►   │
│  (Steps "npm publish" + D-05 tarball assertion REMOVED — now live     │
│   inside pack-install-e2e + publish jobs in ci.yml)                   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ bin/motto.js  (presentation layer only — unchanged boundary below)    │
│                                                                        │
│  --format json / --quiet   ─┐                                        │
│                              ▼                                        │
│         chooseRenderer(result) → text lines | JSON.stringify(result)  │
│                              │                                        │
│                              ▼  (result already fully structured)     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  src/lint.js lintProject()  →  { ok, errors[], count }         │  │
│  │  src/build.js buildProject() →  { ok, outDir, errors[],        │  │
│  │                                    skillCount, bucketCount }    │  │
│  │  NEVER-THROW CORE — zero changes this milestone                │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New / Modified |
|-----------|-----------------|-----------------|
| `.github/workflows/ci.yml` | Single workflow: test matrix, dogfood, pack-install E2E, npm-drift warning, tag-gated publish + GitHub Release | **New** |
| `test/cli.test.js` pattern (reused, not modified) | Precedent for spawning `bin/motto.js` as a child process against tmp dirs — the pack-install E2E script follows this exact shape | Reused pattern, no change |
| pack-install E2E script | `npm pack` → install tarball into a fresh tmp dir → run `motto init/lint/build` against it → assert tarball contents (absorbs the release skill's Step 4 D-05 assertion) | **New** — location decision below |
| `bin/motto.js` output layer | Adds `--quiet` / `--format json` flags; renders `lintProject()`/`buildProject()` results as text (current) or JSON (new) | **Modified** (presentation only) |
| `src/lint.js`, `src/build.js`, `src/schema.js` | Never-throw validation/build core | **Unchanged** |
| `skills/release/SKILL.md` | Local maintainer checklist | **Rewritten** — Steps 4-5 (tarball verify, publish) removed/replaced with "push tag, CI takes over" + a failure-mode recovery section |
| npm registry | Publish target | External — now reached from CI (`NPM_TOKEN` secret initially; OIDC trusted publishing after the repo goes public, per locked project decision) |
| GitHub Releases API | Changelog surface | External — new consumer, written to by the `publish` job |

## Answering the Four Integration Questions

### 1. Workflow file structure: one `ci.yml` vs separate `release.yml`

**Recommendation: one `.github/workflows/ci.yml` with multiple jobs and a `needs:` graph. Do not create a separate `release.yml`.**

Rationale:
- `needs:` only gates jobs **within the same workflow run**. Cross-workflow gating requires the `workflow_run` trigger, which reacts to a *separate, already-completed* workflow run and has well-documented UX friction (default branch context quirks, artifacts must be re-downloaded across workflows, harder to reason about "did this exact commit's tests pass"). For a single-maintainer project whose explicit constraint is "keep the maintenance surface minimal," `needs:` in one file is strictly simpler and more correct than `workflow_run` across two files.
- A separate `release.yml` would either (a) duplicate the `actions/checkout` + `setup-node` + `npm ci` boilerplate, or (b) re-run tests redundantly on the tag push (tags don't inherit branch-push job results). Both violate the project's "mechanism over features" philosophy.
- Triggers: `on: push: { branches: [main], tags: ['v*'] }` plus `pull_request: { branches: [main] }`. Every push (branch or tag) runs the same `test` → `dogfood` → `pack-install-e2e` gate. The `publish` job alone is scoped with `if: startsWith(github.ref, 'refs/tags/v')`, and `needs: [test, dogfood, pack-install-e2e]` so a tag push that happens to break something still cannot publish.
- `npm-drift` (warn-only) should run on `push` to `main` only (`if: github.ref == 'refs/heads/main'`), not on PRs or tags — it's a standing early-warning check, not a release gate, and should never fail the build (`continue-on-error: true` or a step that prints a warning without a non-zero exit).

### 2. Where the pack-install E2E lives: CI-only script vs committed test file

**Load-bearing finding:** Node's `node --test` runner auto-discovers **every** `.js`/`.cjs`/`.mjs` file inside any directory literally named `test` (or `tests`), regardless of filename — not just files matching `*.test.js`. This project's bare `npm test` script is `node --test` with no path argument, and husky's pre-commit hook runs `npm test` on every commit. That means **anything dropped into `test/` runs on every single commit**, unconditionally.

The pack-install E2E is inherently slow relative to the rest of the suite (`npm pack`, a real `npm install` of the tarball into a fresh tmp dir, then spawning the CLI against it — likely several seconds, network/registry-cache dependent). Two real options:

- **Option A — inside `test/`, accept the cost.** Simple, consistent with the existing `test/cli.test.js` / `test/init-dogfood.test.js` spawnSync-into-tmpdir pattern. Cost: every local commit (via husky) pays the E2E tax, even for unrelated one-line changes.
- **Option B (recommended) — a dedicated script outside `test/`,** e.g. `scripts/pack-install-e2e.mjs`, wired to its own `npm run test:e2e` script, invoked as an explicit CI step (`node scripts/pack-install-e2e.mjs`). `npm test`/husky stays exactly as fast as it is today. There is direct precedent for this shape already in the codebase: the D-05 tarball-leak assertion currently lives as an **inline script embedded in the release skill**, not as a `node --test` file — it was never meant to run on every commit, only at release time. Lifting it into `scripts/pack-install-e2e.mjs` (absorbing the tarball-content assertion as one of its checks) is a natural, low-risk move: same script shape, same never-runs-on-every-commit intent, now triggered by CI instead of a human reading a skill step.

Either way, reuse the `spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: 'utf8', cwd })` pattern already proven in `test/cli.test.js`, and the `mkdtemp(join(tmpdir(), …))` pattern already proven in `test/init-dogfood.test.js` — this is not new machinery, just a new call site.

**Decision to lock in phase planning:** Option B is the research recommendation; if the team prefers Option A's simplicity (one less npm script to remember) that's a legitimate but slower-commit tradeoff — call it out explicitly rather than defaulting silently.

### 3. How `--format json` threads through lint.js's error shape without touching the never-throw core

**Key finding: it doesn't need to touch the core at all — this is a pure presentation-layer change, entirely inside `bin/motto.js`.**

`lintProject()` already returns a fully structured, JSON-serializable shape: `{ ok: boolean, errors: Array<{ skill: string, message: string }>, count: number }`. `buildProject()` returns `{ ok, outDir, errors, skillCount, bucketCount }` — same shape family. Neither function does any text formatting today; `bin/motto.js`'s dispatch blocks are solely what turn `result.errors` into `✗ ${e.skill}: ${e.message}\n` lines (see lines 242-249 and 270-275 of the current `bin/motto.js`).

Adding `--format json` means:
1. Add `format: { type: 'string' }` to the `parseArgs` options in `bin/motto.js` (mirrors how `force`/`help` are already declared). Validate the value is `'text'` or `'json'` (default `'text'`); an invalid value follows the same unknown-flag error shape already established (D-04/D-05 pattern) rather than inventing a new error format.
2. Replace the current inline `for (const e of result.errors) { process.stdout.write(...) }` blocks (there are two — lint's and build's, structurally identical) with a small shared renderer, e.g. `renderResult(result, { format, quiet })`, called from both the `lint` and `build` dispatch branches. `format === 'json'` → `process.stdout.write(JSON.stringify(result) + '\n')`. `format === 'text'` (default) → today's exact lines, byte-for-byte, so the existing `cli.test.js` text-mode assertions keep passing unmodified.
3. `--quiet` is orthogonal: it governs whether the **success** line (`✓ N skills OK`) prints at all — useful for scripts/hooks that only care about exit code + errors. It should not suppress error output in either mode (a silent failure is worse than a silent success). Whether `--quiet` also collapses JSON-mode success output to nothing, or `--format json` implies its own contract independent of `--quiet`, is a genuine open interaction to lock explicitly in phase planning — don't let it fall out as an implementation-detail accident.

Because `errors[].skill` / `errors[].message` become a de facto JSON schema the moment `--format json` ships (CI/scripts will parse these field names), treat them as an external contract from day one — no field renames without a breaking-change note, even though nothing today enforces that externally.

**Net effect on the never-throw core:** zero. `lint.js`, `build.js`, `schema.js` are not touched by this feature. The entire risk surface is `bin/motto.js`, which is already a thin, tested shell (`test/cli.test.js` already spawns it as a real child process, the correct test boundary for argv/exit-code/stdout-routing concerns — the same boundary the new flags live in).

### 4. Release-skill / CI handshake, and failure modes when CI publish fails after the tag exists

**Handshake shape:** the skill's local half ends at `git push --follow-tags` (Step 4 in the rewritten skill — tests → version bump → dogfood → tag + push). It does **not** wait for CI and does **not** know whether publish succeeded. The tag push is the sole handoff signal; CI's `publish` job (`if: startsWith(github.ref, 'refs/tags/v')`) picks it up asynchronously. This is a one-way, fire-and-forget handoff — the skill's "Post-Release Housekeeping" step (updating `PROJECT.md`/`MILESTONES.md`) currently assumes the release is done; after this rewrite it should explicitly tell the maintainer to **check the Actions run** before doing housekeeping, since "tag pushed" no longer means "published."

**Failure mode: CI publish fails after the tag already exists and is pushed.** This is the sharp edge of moving publish out of the local, synchronous flow. Concretely:
- The git tag `vX.Y.Z` and the release commit are already public (or at least pushed to the remote) — that part succeeded.
- `npm publish` inside the `publish` job fails: bad `NPM_TOKEN`/OIDC misconfiguration, registry outage, `prepublishOnly` (`motto build`) failing in the CI environment for an environment-specific reason, or (self-inflicted) the same version already being published (npm rejects re-publishing an existing version — this is actually a *safe*, idempotent failure, not a dangerous one).
- **Do not re-tag.** Deleting and recreating a git tag to "retry" is destructive (rewrites a ref other clones may have already fetched, and is exactly the kind of git operation this environment's own working agreements flag as needing extra caution). The correct recovery paths, in order of preference:
  1. **Re-run the failed job from the GitHub Actions UI.** This re-uses the exact same tag/ref and the exact same `needs:` graph — no new commit, no new tag, safe to retry as many times as needed for transient failures (network, registry hiccup, expired token before rotation).
  2. **Fix root cause, then re-run** (e.g. rotate `NPM_TOKEN`, fix an OIDC trust-relationship misconfiguration) — same re-run mechanism, now expected to succeed.
  3. **Escape hatch — manual local publish from the tagged commit**, only if CI is unrecoverable in a reasonable window: `git checkout vX.Y.Z && npm publish` locally. This is exactly the flow the release skill supported before this milestone, so it's a true fallback, not new machinery — but the rewritten skill should document it explicitly as "emergency only," not as a normal path, otherwise the whole point of moving publish to CI (consistent environment, D-05 assertion enforced, no "works on my machine" tarball leaks) quietly erodes.
- The `npm-drift` warning job (runs on every push to `main`) is the structural backstop for exactly this scenario — it is what would have caught the real-world v0.0.4/v0.0.5 drift (tag pushed, release skill never actually ran, npm stuck at 0.0.3) automatically instead of requiring a manual registry check months later, per the PROJECT.md context.

**What the rewritten skill needs, concretely:** replace old Step 5 ("Publish" — `npm whoami` / `npm publish` / `git push --follow-tags`) with a Step 4 that ends at tag+push, and add a short "Step 5 — Verify CI Published" step: check the Actions run for the pushed tag, confirm the `publish` job succeeded (npm registry shows the new version, GitHub Release exists), and only then proceed to Post-Release Housekeeping. Add a "If CI publish failed" subsection covering the three recovery paths above.

## Recommended Project Structure (additions only)

```
.github/
└── workflows/
    └── ci.yml                    # test matrix + dogfood + pack-install-e2e + npm-drift + publish (tag-gated)
scripts/
└── pack-install-e2e.mjs          # NEW — npm pack → tmp install → init/lint/build; absorbs D-05 tarball assertion
                                   # (recommended: outside test/, its own `npm run test:e2e` script)
bin/motto.js                      # MODIFIED — adds --format/--quiet parsing + shared result renderer
skills/release/SKILL.md           # REWRITTEN — Steps 1-4 (test/version/dogfood/tag+push) stay local;
                                   # old Steps 4-5 (tarball verify, publish) replaced by "CI takes over" +
                                   # Step 5 "Verify CI Published" + failure-mode recovery subsection
package.json                      # MODIFIED — new `test:e2e` script; publish-related scripts unchanged
                                   # (prepublishOnly still runs `motto build`, now exercised inside CI's
                                   #  publish job instead of a maintainer's local npm publish)
```

### Structure Rationale

- `scripts/` is new — this project currently has no non-`bin/`/`src/` executable code. A single-purpose CI script here, not under `test/`, keeps `npm test` fast (see Q2 above) and is the natural home for future CI-only tooling without growing `test/`'s auto-discovery surface.
- `.github/workflows/` is standard GitHub Actions location; one file only, per Q1.
- No changes anywhere under `src/` — this is the architectural headline of the whole milestone: CI, publish automation, and CLI ergonomics are all additive/wrapping, not core-invasive.

## Architectural Patterns

### Pattern 1: Presentation-layer format switch over an already-structured core result

**What:** When a pure/never-throw core function already returns a structured result object (`{ ok, errors[], ... }`), a new output format is implemented entirely at the CLI boundary by adding a renderer branch — never by changing the core's return shape or adding formatting concerns to it.
**When to use:** Any time a "machine-readable output" feature is requested for a tool whose core already separates data from presentation (this project has done so since Phase 1 — `lintProject`/`buildProject` were designed error-object-first specifically so the CLI could format them, not the reverse).
**Trade-offs:** None significant here — this is the reason the never-throw core was designed to return structured errors instead of throwing/printing directly. The only discipline required is treating the emitted JSON field names as a stable external contract once shipped.

```js
// bin/motto.js — illustrative shape, not final code
function renderResult(result, { format, quiet }) {
  if (format === 'json') {
    process.stdout.write(JSON.stringify(result) + '\n');
    return;
  }
  if (result.ok) {
    if (!quiet) process.stdout.write(`✓ ${result.count ?? result.skillCount} ...\n`);
    return;
  }
  for (const e of result.errors) process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
}
```

### Pattern 2: Single-workflow job graph with `needs:` as the release gate

**What:** All CI concerns (test matrix, dogfood, E2E, drift warning, publish) live as jobs in one workflow file; `needs:` expresses "publish only if these jobs on this exact commit/ref succeeded," and `if:` expresses "this job only runs for this trigger type" (tag vs branch push).
**When to use:** Any project where release/publish must be strictly gated on the same commit's CI results, and where the project explicitly values a minimal-surface-area CI setup (one file to read, one trigger model to reason about).
**Trade-offs:** A single large workflow file is less "separable" than multiple files if the project later wants very different permission scopes per job (e.g. `id-token: write` should be scoped to the `publish` job only, not the whole workflow — GitHub Actions supports job-level `permissions:` overrides, so this is achievable within one file, not a reason to split).

### Pattern 3: Fire-and-forget tag handoff with an idempotent, re-runnable receiver

**What:** The producer (release skill) does one irreversible-feeling thing (push a tag) and stops; the consumer (CI `publish` job) is designed to be safely re-run against the same ref without side effects from a partial prior run (npm publish is itself idempotent-safe — re-publishing an already-published version fails loudly rather than corrupting state).
**When to use:** Whenever a human-triggered step hands off to an asynchronous automated step and the human has no synchronous confirmation of success. The design obligation this creates is: **never make the recovery path require destroying/recreating the trigger** (the tag). Recovery = re-run or fall back to manual, never re-tag.

## Data Flow

### Release Flow (tag push → publish)

```
maintainer runs release skill (local)
    ↓ Step 1-3: tests, version bump, dogfood (unchanged)
    ↓ Step 4: git push --follow-tags  ← HANDOFF POINT (fire-and-forget)
GitHub receives tag push
    ↓ triggers .github/workflows/ci.yml
    ↓ jobs: test (matrix) ∥ dogfood ∥ pack-install-e2e   (all run, all must pass)
    ↓ needs: [test, dogfood, pack-install-e2e]  AND  if: refs/tags/v*
    ↓ publish job: prepublishOnly (motto build) → npm publish → create GitHub Release
    ↓ (on failure: job fails visibly in Actions UI; tag/commit remain valid;
    ↓  recovery = re-run job, never re-tag — see Q4)
maintainer checks Actions run (NEW Step 5) → confirms npm + GH Release → Post-Release Housekeeping
```

### CLI Output Flow (existing, extended)

```
motto lint/build [--format text|json] [--quiet]
    ↓
lintProject()/buildProject()  →  { ok, errors[], count/skillCount, ... }   ← UNCHANGED, never-throw
    ↓
bin/motto.js renderResult()  →  text lines (default, byte-identical to today)
                              →  JSON.stringify(result)  (new)
```

## Suggested Build Order

Ordered by real dependency, not by requirement-ID order. Items on the same numbered step have no dependency on each other and can be built in either order or in parallel.

1. **CLI ergonomics — `--quiet` / `--format json` (CLIX-01/02).** Zero dependency on anything else this milestone. Build first: it's self-contained, low-risk (presentation-layer only, per Q3), and the pack-install E2E script (step 3) benefits from a machine-parseable output to assert against instead of fragile text matching — so it should exist before the E2E script is written, not after.
2. **Build-skill human-verify (BSKL-01, BSKL-05, WR-01)** — fully independent of the CI/publish/CLI work; can run in parallel with step 1, anytime, by anyone. No ordering constraint with the rest of this list.
3. **CI workflow: `test` + `dogfood` + `pack-install-e2e` + `npm-drift` jobs (no `publish` job wired live yet, or wired but never yet exercised by a real tag).** Depends on step 1 for the E2E script's output assertions. This can and should be built and iterated on while the repo is still **private** — GitHub Actions works fully on private repos (metered minutes, not a blocker for a solo project), so there's no reason to wait for the public flip to validate CI. Prove the whole non-publish gate is green on real pushes before touching the release skill.
4. **Release skill rewrite (local = bump+tag+push only) + `publish` job wired live, tested against a real tag.** Must come **after** step 3, not before — removing local `npm publish` capability before the CI publish path is proven working would create a real gap where no path can ship a release. Recommend proving the `publish` job once (e.g. via the deferred catch-up publish of v0.0.5, or a controlled test) before deleting the skill's old Step 5 language. This step also adds the GitHub Release notes ("Changelog surface") — it's part of the same handshake, not a separate later phase.
5. **Pre-public gate (git-history secrets scan + explicit `.planning/` visibility decision) → flip repo to public.** Independent of steps 1-2, but should sequence **after** step 3 (CI hardened privately first, so the repo's first public CI runs are already clean — a broken CI badge on a freshly-public repo is a bad look and avoidable) and can run before or after step 4 (publish-handshake correctness doesn't depend on repo visibility, only on the `NPM_TOKEN`/OIDC secret being configured). Recommend after step 4 for simplicity: fewer moving pieces changing state at once.
6. **Trusted publishing (OIDC) migration**, replacing the interim `NPM_TOKEN` secret. Explicitly sequenced after the public flip per the already-locked project decision (PROJECT.md "Key context"). Not required for this milestone's `publish` job to function — `NPM_TOKEN` is a legitimate interim credential — but the `publish` job should be written so swapping the auth mechanism later (`id-token: write` permission, `registry-url` config, drop `NODE_AUTH_TOKEN`) is a small, isolated diff, not a rewrite. This can land as a fast-follow after step 5 rather than blocking milestone completion.

**Do not build in this order:** publish job before the CI test/dogfood/E2E gate exists (nothing to gate on); release-skill rewrite before the publish job is proven (creates a ship-capability gap); repo-public flip before the secrets scan (irreversible one-way door, per PROJECT.md's own framing).

## Anti-Patterns

### Anti-Pattern 1: Separate `release.yml` triggered by tag push, independent of the main CI workflow

**What people do:** Create a second workflow file specifically for "the release," reasoning that publish logic is conceptually separate from "regular CI."
**Why it's wrong:** Tags don't inherit the branch-push workflow's job results. A separate file either re-runs the full test matrix redundantly on every tag (wasted minutes, and now two sources of truth for "did tests pass") or — worse — skips re-running and trusts that "the branch CI must have passed at some point," which is exactly the drift risk (a tag can be pushed against a commit whose CI never ran or ran against different code, e.g. after a rebase). One workflow with `needs:` ties publish to the actual green state of the actual tagged ref.
**Instead:** Single `ci.yml`, `publish` job gated with `needs:` + `if: startsWith(github.ref, 'refs/tags/v')` — see Q1.

### Anti-Pattern 2: Re-tagging to retry a failed publish

**What people do:** When `npm publish` fails in CI after a tag is already pushed, delete the tag locally and remotely, fix the issue, and push a new tag of the same name to "try again."
**Why it's wrong:** Tag deletion/recreation rewrites a ref other clones/CI runs may have already observed; it's a destructive git operation and obscures the audit trail (two different commits briefly wore the same version tag).
**Instead:** Re-run the existing failed Actions job (same ref, same tag, no git mutation) or, as a documented emergency-only fallback, publish manually from the already-tagged commit. See Q4.

### Anti-Pattern 3: Threading `--format`/`--quiet` state into `lintProject`/`buildProject`

**What people do:** Pass a `format` or `quiet` option down into the core orchestrator so it can "print less" or "return differently shaped data" for JSON mode.
**Why it's wrong:** It reintroduces a presentation concern into functions whose entire design value (and this project's `D-01` never-throw discipline) rests on returning one stable, structured shape regardless of caller. It would also mean two code paths through the never-throw core to re-verify instead of one, undermining the "zero known never-throw gaps" state the project just reached at v0.0.5.
**Instead:** Core stays untouched; `bin/motto.js` renders the one returned shape two ways. See Q3 / Pattern 1.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| npm registry (`registry.npmjs.org`) | `npm publish` from the CI `publish` job, authenticated via `NPM_TOKEN` secret initially, OIDC trusted publishing after the public flip (`id-token: write` permission, no long-lived token) | Trusted publishing does not support self-hosted runners (n/a here — `ubuntu-latest`); requires the publish job to have `id-token: write` scoped at job level, not workflow level, to avoid over-granting |
| GitHub Actions | Hosted runner matrix (Node 20/22/24), `needs:`-graphed jobs, `if:`-gated tag trigger | Works fully on private repos today — no need to wait for the public flip to build/validate CI |
| GitHub Releases API | `publish` job creates a Release with notes, likely via `gh release create` or an actions/`create-release`-style step | New consumer this milestone — "Changelog surface" requirement |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `bin/motto.js` ↔ `src/lint.js`/`src/build.js` | Direct function call, structured return object | Unchanged boundary — `--format`/`--quiet` live entirely on the `bin/motto.js` side, per Q3 |
| release skill (local) ↔ `ci.yml` (remote) | Git tag push (async, fire-and-forget) | The only handshake mechanism; no synchronous confirmation — see Q4 and Pattern 3 |
| `ci.yml` jobs ↔ each other | `needs:` (hard dependency, blocks on success) + `if:` (trigger-type gating) | All within one workflow file — see Q1 |
| pack-install E2E script ↔ `bin/motto.js` | Spawns the CLI as a real child process against an installed tarball in a tmp dir | Same `spawnSync` pattern already proven in `test/cli.test.js`; new call site, not new machinery |

## Sources

- Repo source (read directly, HIGH confidence): `src/lint.js`, `src/build.js`, `bin/motto.js`, `skills/release/SKILL.md`, `package.json`, `test/cli.test.js`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`
- [Node.js Test Runner docs (v26)](https://nodejs.org/api/test.html) — confirms `node --test` auto-discovers any file inside a directory named `test`/`tests`, not just `*.test.js`-suffixed files. Verified 2026-07-03. Confidence: HIGH (official Node.js docs, cross-confirmed by community guides).
- [npm Docs — Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/) — OIDC setup, `id-token: write` requirement, no self-hosted-runner support. Verified 2026-07-03. Confidence: MEDIUM (official docs, but the feature is recent — GA'd mid-2025 per GitHub changelog below).
- [GitHub Changelog — npm trusted publishing with OIDC is generally available (2025-07-31)](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) — confirms GA status and workflow permission requirements. Confidence: MEDIUM.
- [GitHub community discussion #176761 — NPM publish using OIDC on GitHub Actions](https://github.com/orgs/community/discussions/176761) — practical workflow YAML shape (tag trigger, `id-token: write`, `registry-url`). Confidence: LOW-MEDIUM (community discussion, not official, but consistent with official docs above).
- General `needs:`/`if:` job-gating and `workflow_run` cross-workflow-trigger tradeoffs — standard, stable GitHub Actions behavior; not independently re-verified this session (pre-existing HIGH-confidence platform knowledge, consistent with official GitHub Actions documentation structure).

---
*Architecture research for: motto v0.0.6 "Prove & Publish" — CI/publish/CLI-format integration*
*Researched: 2026-07-03*
