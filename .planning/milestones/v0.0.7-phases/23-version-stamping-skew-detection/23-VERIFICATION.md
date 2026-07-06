---
phase: 23-version-stamping-skew-detection
verified: 2026-07-06T00:00:00Z
status: passed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 23: Version Stamping & Skew Detection Verification Report

**Phase Goal:** A Motto project records which Motto version scaffolded it, and `lint`/`build` surface any skew between that stamp and the running tool as an explicit, direction-aware, never-throw advisory — pre-stamp projects stay clean.
**Verified:** 2026-07-06
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `motto init` writes a `motto.yaml` with `mottoVersion` = running tool version, distinct from project `version` | ✓ VERIFIED | Live scaffold in mkdtemp: `mottoVersion: "0.0.6"` alongside `version: "0.1.0"` — two distinct keys. `getOwnVersion()` returned `"0.0.6"` matching the stamp. |
| 2 | lint/build on skewed project (tool newer) prints warning naming both versions + "check the upgrade ledger", ok/exit unchanged | ✓ VERIFIED | `lint`/`build` on a fixture stamped `0.0.1` (older than running `0.0.6`) → stderr: `⚠ motto.yaml: project was scaffolded with motto 0.0.1; you are running 0.0.6 — check the upgrade ledger for changes since 0.0.1`; exit code 0; `ok:true`. |
| 3 | lint/build on skewed project (project newer) prints warning naming both versions + "upgrade motto", ok/exit unchanged | ✓ VERIFIED | Fixture stamped `99.0.0` → stderr: `⚠ motto.yaml: project was scaffolded with motto 99.0.0, newer than your running 0.0.6 — upgrade motto`; exit code 0; JSON mode (`--format json`) serializes `warnings[]` verbatim, `ok:true`. |
| 4 | lint/build on no-stamp project (this repo's own tree) → no skew warning, no crash | ✓ VERIFIED | `grep -c mottoVersion motto.yaml` = 0 in this repo. `node bin/motto.js lint .` → `✓ 3 skills OK`, no `⚠` line, exit 0; `--format json` → `"warnings":[]`. `test/dogfood.test.js` asserts `(result.warnings ?? []).length === 0` on live `lintProject(REPO_ROOT)`. |
| 5 | Malformed stamp (number, array, object, boolean, null, empty string, garbage) → clean error entry, never throw | ✓ VERIFIED | Direct `loadConfig()` probe across all 7 shapes: each produced exactly one `errors[]` entry matching `/mottoVersion/i`, zero throws. Integration probe via CLI on a `mottoVersion: 7` fixture: `ok:false`, exactly one error, `warnings:[]` (no double-report), exit 1. `test/version.test.js` wraps every adversarial `parseVersion` input in `assert.doesNotThrow` (9-shape matrix); `test/config.test.js` wraps the 7-shape matrix the same way. |
| 6 | lint/build never rewrite motto.yaml — byte-identical before/after; only init writes the stamp | ✓ VERIFIED | Live shasum probe: identical hash for a scaffolded `motto.yaml` before lint, after lint, and after build. `test/lint.test.js` and `test/build.test.js` each contain a dedicated `describe('lint/build never rewrite motto.yaml (VER-06, D-01/D-06)')` block asserting `assert.strictEqual(after, before)` — non-vacuous (reads actual file bytes via real fs I/O). |
| 7 | Skew message direction-aware, naming both versions (VER-03) | ✓ VERIFIED | Both message templates in `src/version.js:checkSkew` interpolate both `stampedVersion` and `toolVersion`; confirmed live above in truths 2/3. `test/version.test.js` asserts both directions with message-content regex + substring checks for both version strings. |
| 8 | Warnings render to stderr independent of `ok`/`--quiet`, absent from `--format json` output duplication | ✓ VERIFIED | `bin/motto.js:renderResult` — `⚠` loop runs unconditionally relative to the `ok`/`quiet` if/else, text-mode only; confirmed live: JSON output above included `warnings` inline via `JSON.stringify`, no separate `⚠` lines duplicated. `test/cli.test.js` spawned-process assertions confirm exit code 0 + `⚠` on stderr for a skewed-but-valid project. |
| 9 | parseVersion/checkSkew hand-rolled, no semver package added (D-06) | ✓ VERIFIED | `package.json` dependencies unchanged (`yaml` only). `src/version.js` implements a ~10-line regex parser + tuple comparator, no new imports beyond `node:fs`. |
| 10 | Requirements VER-01..VER-06 fully covered across the 4 plans, no orphans | ✓ VERIFIED | `grep requirements:` across all 4 PLAN.md files yields VER-01, VER-02, VER-03, VER-04, VER-05, VER-06 — all 6 IDs present exactly once. REQUIREMENTS.md marks all 6 `[x]` Complete, mapped to Phase 23. |
| 11 | Full test suite green, no regressions | ✓ VERIFIED | `npm test` → 292/292 passing, 0 failing, 67 suites. |

**Score:** 11/11 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/version.js` | getOwnVersion, parseVersion, checkSkew — pure, never-throw | ✓ VERIFIED | All three exports present with correct signatures; memoized getOwnVersion; non-end-anchored regex with documented rationale. |
| `src/config.js` | Optional `mottoVersion` validation, never-throw | ✓ VERIFIED | `!== undefined` presence gate (not falsy), `describeType()` helper, 7-shape adversarial coverage confirmed live. |
| `src/init.js` | Stamps `mottoVersion` into new scaffolds, null-safe omission, own tree untouched | ✓ VERIFIED | Live scaffold confirms stamp; `grep -c mottoVersion motto.yaml` (own repo) = 0. |
| `src/lint.js` | `warnings[]` on every return path, gated skew check | ✓ VERIFIED | Re-read pattern (Option A) confirmed at lines 343-358; gate `parseVersion(config?.mottoVersion)` present literally. |
| `src/build.js` | `warnings[]` on every return path, independent skew computation | ✓ VERIFIED | STEP 2 skew computation at lines 122-124; `warnings` present on lint-fail (line 109), pre-pack-fail (line 176), and success (line 245) returns. |
| `bin/motto.js` | renderResult prints ⚠ stderr lines, exitCode unaffected | ✓ VERIFIED | Confirmed live via CLI probes; exitCode logic (`if (!result.ok) process.exitCode = 1`) unchanged. |
| `test/version.test.js`, `test/config.test.js`, `test/init.test.js`, `test/lint.test.js`, `test/build.test.js`, `test/cli.test.js`, `test/dogfood.test.js` | Adversarial + integration coverage | ✓ VERIFIED | All test files contain the claimed describe blocks; spot-checked bodies are non-vacuous (real fs reads, real shasums via strictEqual on file content, real CLI spawns). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/config.js` | `src/version.js` | `import { parseVersion }` | ✓ WIRED | Import present; used inside the mottoVersion validation block. |
| `src/init.js` | `src/version.js` | `import { getOwnVersion }` | ✓ WIRED | Import present; `toolVersion = getOwnVersion()` drives conditional stamp line. |
| `src/lint.js` | `src/version.js` | `import { checkSkew, getOwnVersion, parseVersion }` | ✓ WIRED | All three imported and used; gated skew computation confirmed live. |
| `src/build.js` | `src/version.js` | `import { checkSkew, getOwnVersion }` | ✓ WIRED | Imported and used at STEP 2, independent of lint.js internals as specified. |
| `bin/motto.js` | `lintProject`/`buildProject` results | `result.warnings` rendering | ✓ WIRED | ⚠ loop reads `result.warnings ?? []`, confirmed via live CLI text and JSON output. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Fresh scaffold stamps mottoVersion = live tool version | Inline scaffold + read motto.yaml | `mottoVersion: "0.0.6"` present, matches `getOwnVersion()` | ✓ PASS |
| Skewed project (tool newer), lint | `motto lint <dir>` on 0.0.1-stamped fixture | `⚠ ... check the upgrade ledger ...`, exit 0 | ✓ PASS |
| Skewed project (project newer), lint + json | `motto lint <dir> --format json` on 99.0.0-stamped fixture | `warnings` array present, `⚠ ... upgrade motto ...` in text mode, exit 0 | ✓ PASS |
| Own repo tree lints clean, no skew | `motto lint .` | `✓ 3 skills OK`, no ⚠ line, `warnings:[]` in JSON | ✓ PASS |
| Malformed stamp (7 shapes) at config layer | `loadConfig()` direct probe | 7/7 shapes flagged, 0 throws | ✓ PASS |
| Malformed stamp integration (no double-report) | `motto lint <dir> --format json` on `mottoVersion: 7` fixture | Exactly 1 error, `warnings:[]`, exit 1 | ✓ PASS |
| Never-rewrite | shasum before/after lint/build | Byte-identical (3/3 matching hashes) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| VER-01 | 23-03 | init stamps running tool version, distinct from project version | ✓ SATISFIED | Live scaffold probe + `test/init.test.js` non-hardcoded assertion. |
| VER-02 | 23-04 | lint/build report skew as non-blocking warning | ✓ SATISFIED | Live CLI probes (both directions), exit code unaffected; `test/cli.test.js` spawned-process proof. |
| VER-03 | 23-01 | Direction-aware message naming both versions | ✓ SATISFIED | `checkSkew` message templates confirmed live in both directions. |
| VER-04 | 23-04 | No-stamp project treated as unknown/compatible, no warning, no crash | ✓ SATISFIED | Own-repo-tree probe + dedicated no-stamp fixture test + dogfood assertion. |
| VER-05 | 23-02 | Malformed stamp → clean error, never throw | ✓ SATISFIED | 7-shape adversarial probe at config layer, zero throws; unit + integration tests. |
| VER-06 | 23-04 | Only init writes the stamp; lint/build never rewrite | ✓ SATISFIED | Byte-identical shasum probe; dedicated never-rewrite tests in lint.test.js/build.test.js. |

No orphaned requirements — all 6 VER-* IDs declared in plan frontmatter match REQUIREMENTS.md exactly, and REQUIREMENTS.md's own Phase 23 mapping (lines 62-67) lists all 6 as Complete.

### Anti-Patterns Found

No debt markers (`TBD`/`FIXME`/`XXX`), no unresolved `TODO`/`HACK`/`PLACEHOLDER` comments in any of the 6 phase-modified source files (`src/version.js`, `src/config.js`, `src/init.js`, `src/lint.js`, `src/build.js`, `bin/motto.js`).

The phase's own code review (`23-REVIEW.md`, standing artifact) surfaced 2 Critical findings (CR-01, CR-02) in `src/build.js`. Both were traced via `git diff` against the phase's actual commits (`e9d9765`) and confirmed **pre-existing** — introduced in an earlier phase (`03-01`, commit `e017442`/`49fbe7f`), not touched by phase 23's diff, and structurally independent of the skew-detection feature (they live in the collision-check and pack-phase I/O spans, not the `checkSkew`/`warnings[]` wiring). Live probes above confirm a skewed-but-valid project builds successfully with no crash — the skew feature itself does not trigger CR-01/CR-02.

| File | Line | Pattern | Severity | Impact on THIS phase's goal |
|------|------|---------|----------|------------------------------|
| `src/build.js` | 152 | Pre-existing rethrow (`ENOTDIR` on collision check) — CR-01 | Warning (pre-existing, out of phase 23 scope) | None — unrelated code path, not exercised by version-stamping/skew feature |
| `src/build.js` | 56, 73, 114, 131, 182-235 | Pre-existing unwrapped I/O in pack phase — CR-02 | Warning (pre-existing, out of phase 23 scope) | None — same reasoning |
| `src/init.js` | 157-158 | WR-01: stamp gate uses `typeof === 'string'` instead of `parseVersion()` truthy — a garbage/empty own-version would still be stamped | Warning (latent, not reachable with today's well-formed `package.json.version`) | None currently — Motto's real version (`0.0.6`) is well-formed; this is a defensive-depth gap for a future release-process error, not a phase-23 goal failure |
| `src/version.js` / `src/config.js` | 45 / 135 | WR-02: unanchored `VERSION_RE` accepts trailing garbage as a "valid" mottoVersion, echoed verbatim to terminal | Warning (cosmetic/display-hygiene, does not affect skew detection correctness) | None — does not block any of the 5 success criteria |

These 4 items (2 pre-existing Critical, 2 phase-local Warning) are legitimate follow-up candidates but do not gate this phase's stated goal: version stamping, skew detection, and never-throw/never-rewrite behavior are all demonstrably working end-to-end.

### Human Verification Required

None. All must-haves were verifiable via direct code execution (live CLI invocations, direct module probes, and test-suite execution) rather than requiring visual/subjective judgment.

### Gaps Summary

No gaps against the phase's stated goal or success criteria. All 5 success criteria supplied in the verification brief were independently reproduced against the live codebase (not just trusted from SUMMARY.md or test-suite claims):

1. `motto init` stamps distinct `mottoVersion`/`version` — confirmed live.
2. Direction-aware skew warnings, both directions, non-blocking — confirmed live via CLI (text + JSON modes).
3. No-stamp project (this repo's own tree) stays clean — confirmed live (`grep -c mottoVersion motto.yaml` = 0, lint output clean).
4. Malformed stamp adversarial matrix — confirmed live at both the `loadConfig` unit layer (7/7 shapes) and the CLI integration layer (no double-report, exit 1, exactly one error).
5. Never-rewrite — confirmed via live byte-for-byte shasum comparison across lint and build.

Two pre-existing Critical findings in `buildProject` (CR-01, CR-02) were investigated and confirmed to predate phase 23's diff and to be structurally unrelated to the skew-detection/version-stamping feature — they do not block this phase's goal but are worth a follow-up plan given the project's "tests-green-but-broken" recurrence history.

---

_Verified: 2026-07-06_
_Verifier: Claude (gsd-verifier)_
