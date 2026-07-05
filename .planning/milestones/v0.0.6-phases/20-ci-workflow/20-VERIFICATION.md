---
phase: 20-ci-workflow
verified: 2026-07-03T22:30:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
---

# Phase 20: CI Workflow Verification Report

**Phase Goal:** Every push and PR is gated by a full CI pipeline (`.github/workflows/ci.yml`) that proves Motto works on a clean checkout and as npm actually ships it — all while the repo is still private, so the gate is trusted before anything is exposed.
**Verified:** 2026-07-03T22:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every push/PR runs the full test suite green across a Node 20/22/24 matrix via `.github/workflows/ci.yml` | ✓ VERIFIED | `.github/workflows/ci.yml` `test` job: `on.push.branches:[main]` + `on.pull_request.branches:[main]`, `strategy.matrix.node-version:[20,22,24]`, `npm ci && npm test`. Live run `28685021049` (event `pull_request`, headSha `0c0dd9e`) confirmed `conclusion: success` via `gh run view`. |
| 2 | CI dogfoods `motto lint` + `motto build` against Motto's own `skills/` tree on a clean checkout | ✓ VERIFIED | `dogfood` job runs `node bin/motto.js lint --quiet` / `build --quiet`, asserts empty stdout via `[ -n "$out" ]` guard. Same live green run covers this job. |
| 3 | A pack-install E2E job (`scripts/pack-install-e2e.mjs`) runs `npm pack` → installs the tarball in a tmp dir → `motto init` → `lint` → `build`, proving the shipped artifact works standalone | ✓ VERIFIED | Script read in full: mkdtemp pack dir, `npm pack --json`, reads `data[0].filename` (not reconstructed), `npm init -y` + `npm install <tarball>` in a separate consumer tmpdir, invokes `node_modules/.bin/motto` directly (not bare `npx`, closing CR-01), asserts `.ok===true`/`.count>=1` for lint and `.ok===true`/`.skillCount>=1` for build, cleans up both tmpdirs in `finally`. Ran it live in this session: `node scripts/pack-install-e2e.mjs` → `pack-install-e2e: OK`, exit 0. |
| 4 | CI surfaces a non-blocking warning when npm registry latest lags `package.json` — silent-drift becomes visible | ✓ VERIFIED | `npm-drift` job runs `node scripts/npm-drift-check.mjs`. Read script: whole async body in try/catch, top-level `.catch`, prints `::warning::` on mismatch/inconclusive, never sets non-zero exit. Ran it live from a directory with no `package.json`: printed `::warning::npm-drift check inconclusive (could not read package.json: ENOENT...)` and exited 0 — never-red proven behaviorally, not just by inspection. |
| 5 | The husky `prepare` script no-ops outside a git checkout (tarball installs, `npm ci` in workflows) without failing CI | ✓ VERIFIED | `scripts/prepare.mjs`: `existsSync('.git')` guard, `process.exit(0)` when absent, `execSync('npx --no husky', ...)` when present (post-WR-02 fix, `--no` prevents registry-fallback masking). `package.json` `prepare` field = `"node scripts/prepare.mjs"` (confirmed via grep). Explicit proof script `scripts/prepare-guard-check.mjs` ran live in this session: materializes a real `.git`-less tree via `git archive HEAD` + `tar -x`, runs `npm ci` there, printed `prepare-guard-check OK — npm ci succeeded in a .git-less tree`, exit 0. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | Single workflow, 4 parallel jobs, least-privilege permissions | ✓ VERIFIED | Jobs `test`, `dogfood`, `pack-install-e2e`, `npm-drift`; no `needs:` edges; `concurrency.group` includes `github.ref` with `cancel-in-progress: true`; top-level `permissions: {contents: read}`; no `pull_request_target`; no `paths`/`paths-ignore`. Structural check script from PLAN's own verify block re-run: `CI-YAML-OK`. |
| `scripts/prepare.mjs` | `.git`-existence guard wrapping `npx husky` | ✓ VERIFIED | Present, substantive, matches acceptance criteria including WR-02 fix (`npx --no husky`). |
| `scripts/prepare-guard-check.mjs` | Explicit `.git`-less proof | ✓ VERIFIED | Present, argv-form `spawnSync` (WR-03 fix — no shell interpolation of tmpdir path), per-stage status/signal/spawn-error diagnostics, `rm(..., {recursive:true,force:true})` in `finally`. Ran live, passes. |
| `scripts/pack-install-e2e.mjs` | Tarball consumer-path E2E | ✓ VERIFIED | Present, substantive, direct bin invocation (CR-01 fix), `data[0].filename` (Pitfall 4 honored), full diagnostic messages (WR-05 fix — status/signal/spawn-error included), tmp dirs cleaned in `finally`. Ran live, passes. |
| `scripts/npm-drift-check.mjs` | Never-red registry drift warning | ✓ VERIFIED | Present, substantive, `package.json` read wrapped in its own try/catch (WR-01 fix closes the pre-`try` uncaught-throw path), top-level `.catch` as final backstop. Ran live from a no-`package.json` cwd, confirmed exit 0 with warning annotation. |
| `package.json` `prepare` field | `node scripts/prepare.mjs` | ✓ VERIFIED | `grep -n '"prepare"' package.json` → `"prepare": "node scripts/prepare.mjs"`. `files` allowlist unchanged (`["bin/", "src/", "dist/public/"]`), `scripts/` deliberately excluded. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `package.json` `prepare` script | `scripts/prepare.mjs` | script invocation | ✓ WIRED | Field value confirmed. |
| `scripts/prepare.mjs` | `existsSync('.git')` branch | guard decision | ✓ WIRED | Confirmed in source; behaviorally proven both branches (real checkout ran husky implicitly via normal `npm ci` in this session's history; `.git`-less branch proven by prepare-guard-check run). |
| `scripts/prepare-guard-check.mjs` | `git archive HEAD` → `npm ci` in `.git`-less tmp tree | subprocess pipeline | ✓ WIRED | Ran live, exit 0. |
| `ci.yml` `pack-install-e2e` job | `node scripts/pack-install-e2e.mjs` then `node scripts/prepare-guard-check.mjs` | two named steps | ✓ WIRED | Both steps present in workflow YAML in that order; both scripts independently run live and pass in this session. |
| `ci.yml` `npm-drift` job | `node scripts/npm-drift-check.mjs` | single step | ✓ WIRED | Confirmed in workflow YAML. |
| `npm pack --json` output | tarball path fed to `npm install` | `data[0].filename`, never reconstructed | ✓ WIRED | Confirmed by direct source read (line 90-91 of pack-install-e2e.mjs) and live run success. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Husky guard no-ops `.git`-less | `node scripts/prepare-guard-check.mjs` | `prepare-guard-check OK — npm ci succeeded in a .git-less tree`, exit 0 | ✓ PASS |
| Pack-install E2E full consumer path | `node scripts/pack-install-e2e.mjs` | `pack-install-e2e: OK`, exit 0 | ✓ PASS |
| npm-drift never-red on missing package.json | `node scripts/npm-drift-check.mjs` (run from cwd without package.json) | `::warning::npm-drift check inconclusive (could not read package.json: ENOENT...)`, exit 0 | ✓ PASS |
| ci.yml structural contract (jobs, matrix, concurrency, permissions) | inline `yaml` parse + assertion script from 20-03-PLAN.md's own verify block | `CI-YAML-OK` | ✓ PASS |
| Live CI run on real GitHub Actions infrastructure | `gh run view 28685021049 --json conclusion,status,headSha,event` | `{"conclusion":"success","event":"pull_request","headSha":"0c0dd9e...","status":"completed"}` | ✓ PASS |
| Full local test suite | `node --test` | `tests 231, pass 231, fail 0` | ✓ PASS |

### Code Review Fix Verification (post-execution 20-REVIEW.md)

| ID | Claimed commit | Verified in source? | Status |
|----|----------------|----------------------|--------|
| CR-01 (critical — npx registry-fallback risk) | e0427d0 | Yes — `pack-install-e2e.mjs` invokes `node_modules/.bin/motto` directly, never bare `npx motto` | ✓ VERIFIED FIXED |
| WR-01 (npm-drift uncaught-throw path) | 38f0d6e | Yes — package.json read wrapped in its own try/catch + top-level `.catch` | ✓ VERIFIED FIXED |
| WR-02 (`npx husky` registry fallback masks broken install) | 237ec28 | Yes — `execSync('npx --no husky', ...)` | ✓ VERIFIED FIXED |
| WR-03 (shell interpolation in `execSync` tar pipeline) | db62f3d | Yes — argv-form `spawnSync('git', ['archive','HEAD'])` piped in-process into `spawnSync('tar', ['-x','-C',dir], {input: archive.stdout})`, no shell string | ✓ VERIFIED FIXED |
| WR-04 (false `prepublishOnly` comment in ci.yml) | 3037a3a | Yes — comment now correctly states `prepublishOnly` runs only on `npm publish` | ✓ VERIFIED FIXED |
| WR-05 (missing spawn error/signal in diagnostics) | d3effc2 | Yes — both `pack-install-e2e.mjs` and `prepare-guard-check.mjs` include `status`/`signal`/`error.message` in failure messages | ✓ VERIFIED FIXED |

All 6 findings (1 critical + 5 warnings) from `20-REVIEW.md` are confirmed genuinely fixed in the current source, not just marked fixed in frontmatter. The 5 info-level findings (IN-01..IN-05: action SHA-pinning, missing timeout-minutes, cancel-in-progress on main, unguarded pack-manifest destructure, sequential-vs-parallel tmp cleanup) remain open — this is consistent with their `info` severity (non-blocking) and REVIEW.md's own disposition; none contradict the phase goal.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CIW-01 | 20-03 | Node 20/22/24 matrix runs full suite on every push/PR | ✓ SATISFIED | `test` job matrix + live green run |
| CIW-02 | 20-03 | CI dogfoods lint/build against Motto's own skills/ | ✓ SATISFIED | `dogfood` job + live green run |
| CIW-03 | 20-02 | Pack-install E2E proves shipped tarball works standalone | ✓ SATISFIED | `pack-install-e2e.mjs` read + run live, `pack-install-e2e` job wired |
| CIW-04 | 20-02 | Non-blocking registry-drift warning | ✓ SATISFIED | `npm-drift-check.mjs` read + run live (never-red proven from a broken cwd), `npm-drift` job wired |
| CIW-05 | 20-01 | husky `prepare` no-ops outside git checkout | ✓ SATISFIED | `prepare.mjs` guard + `prepare-guard-check.mjs` read + run live |

No orphaned requirements — REQUIREMENTS.md maps exactly CIW-01..05 to Phase 20, and all five are claimed (and satisfied) across the three plans.

### Anti-Patterns Found

None. Scanned all 5 phase-modified files (`.github/workflows/ci.yml`, `scripts/prepare.mjs`, `scripts/prepare-guard-check.mjs`, `scripts/pack-install-e2e.mjs`, `scripts/npm-drift-check.mjs`) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub-shaped patterns — zero matches.

### Human Verification Required

None. All 5 truths were verified either by direct source inspection plus a live local run of the exact script, or by an independent `gh run view` query against real GitHub Actions infrastructure (not SUMMARY.md narration). No behavior-dependent truth was left unexercised.

### Gaps Summary

No gaps. All 5 roadmap Success Criteria and all 5 requirement IDs (CIW-01..05) are verified against the actual codebase and live CI evidence, not SUMMARY.md claims. The code review's 1 critical + 5 warning findings were independently re-verified as genuinely fixed in the current source (not merely marked fixed in frontmatter). The 5 info-level findings remain open by design (non-blocking, documented tradeoffs) and do not block phase completion. PR #3 was closed without merge per the milestone's `branching_strategy: milestone` — this is an intentional deferral of the merge event, not a gap in the CI gate itself, which was proven green on that PR's real `pull_request` trigger both pre-fix (run 28684444687) and post-fix (run 28685021049, HEAD 0c0dd9e).

---

_Verified: 2026-07-03T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
