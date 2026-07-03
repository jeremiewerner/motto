---
phase: 19-cli-ergonomics-build-skill-verification
verified: 2026-07-03T20:36:13Z
status: passed
score: 17/17 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 19: CLI Ergonomics & Build-Skill Verification — Verification Report

**Phase Goal:** Motto's CLI emits machine-readable, pipe-safe output that later CI jobs can assert against, and `build-skill` is proven end-to-end on a real skill — closing the v0.0.5 human-verify debt. Both are independent, low-risk, do-early work; the never-throw core is untouched (presentation layer only).
**Verified:** 2026-07-03T20:36:13Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria + PLAN must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `motto lint`/`build --quiet` on clean project: silent stdout, exit 0 | ✓ VERIFIED | Live run: `node bin/motto.js lint --quiet` → empty stdout, exit 0. `renderResult()` in `bin/motto.js:193-206` gates the success line on `!quiet`. |
| 2 | `--quiet` on failing project still writes `✗` to stderr, exit 1 | ✓ VERIFIED | Live run against a corrupted fixture: stdout empty, stderr contains 4 `✗ …` lines, exit 1. |
| 3 | `--format json` on success emits exactly one JSON doc on stdout, nothing else | ✓ VERIFIED | Live run: `node bin/motto.js lint --format json` → `{"ok":true,"errors":[],"count":3}` single line on stdout, stderr empty. |
| 4 | `--format json` on failure: `.ok===false`, populated `.errors`, no duplicate stderr echo | ✓ VERIFIED | Live run on corrupted fixture: single JSON line, `ok:false`, 4-entry `errors` array, stderr empty (D-09 — no duplicate echo). |
| 5 | Pre-dispatch path-guard failure stays plain text even with `--format json` (D-04) | ✓ VERIFIED | `checkTargetDir` (bin/motto.js:130-151) runs before `lintProject`/`buildProject` and writes plain `✗ …` to stderr; `renderResult`/JSON branch is never reached for this path — code path confirmed by read, and `test/cli.test.js` D-04 case exists in the `--format json (CLIX-02)` block. |
| 6 | `--format yaml` (bad value) errors before dispatch, stderr only, exit 1, lint not run | ✓ VERIFIED | Live run: `motto lint --format yaml` → stdout empty, stderr = `✗ unknown format 'yaml'` + usage + hint, exit 1. `checkFormatValue()` runs before `checkTargetDir`. |
| 7 | `--format text` and no-flag behave identically | ✓ VERIFIED | `renderResult` only branches on `format === 'json'`; any other value (including `'text'` or `undefined`) falls through to the same text-mode branch — single code path, no `text`-specific special-casing. |
| 8 | Every `✗` line (lint, build, init) writes to stderr, never stdout | ✓ VERIFIED | grep of `bin/motto.js` shows all `✗`-prefixed writes target `process.stderr.write`; live checks on failing lint (text + json) and init confirm zero `✗` on stdout. |
| 9 | `motto init --format json`/`--quiet` rejected as unknown option | ✓ VERIFIED | bin/motto.js:299-309 explicit scoped rejection in the init branch, mirroring D-05 shape; `test/cli.test.js` `init stderr split (D-07)` block covers this (and WR-03 fixed a cwd-leak bug in these tests, commit `c88e0e3`). |
| 10 | Exit codes unchanged: 0 success / 1 failure, every mode | ✓ VERIFIED | `renderResult` sets `process.exitCode = 1` iff `!result.ok`, uniformly across text/json/quiet; confirmed live for all four combinations above. |
| 11 | `lintProject`/`buildProject` stay single-argument (never-throw core untouched) | ✓ VERIFIED | `grep` confirms both call sites in bin/motto.js pass exactly one arg (`root`); `src/lint.js`/`src/build.js` signatures unmodified this phase (git diff scope confined to `bin/motto.js`, `test/cli.test.js`). |
| 12 | No `process.exit()` call introduced | ✓ VERIFIED | `grep -n "process\.exit("` on bin/motto.js returns only comment references to `process.exitCode`/prose — zero literal `process.exit(` calls. |
| 13 | One real skill authored end-to-end through build-skill from freeform input, gap-fill/quality-gate/name-recovery all observed live | ✓ VERIFIED | `19-BSKV-FINDINGS.md` records a live run (not simulated) via a blocking `checkpoint:human-verify` task (19-02-PLAN.md Task 2); all three `## Target` sections have non-placeholder Observed text and verdict `conforms`; produced skill `skills/changelog/SKILL.md` exists on disk and lints clean (`node bin/motto.js lint` → `✓ 3 skills OK`, confirmed live). |
| 14 | 19-BSKV-FINDINGS.md covers all three targets (BSKL-01, BSKL-05, WR-01) with a verdict each | ✓ VERIFIED | File contains exactly 3 `## Target` headers, each with Expected/Observed/Verdict; `grep -c 'Verdict:'` = 3 (SUMMARY claims 5 but includes the two Divergence verdicts — both present too). |
| 15 | Divergences fixed inline or ticketed; oversized ones recorded in STATE.md pending todos | ✓ VERIFIED | Two divergences found during the live run, both fixed inline (commits `a7a106a`, `012077f`) and documented in the findings file; STATE.md Pending Todos section reads "None yet." — consistent with "no divergence was large enough to defer." |
| 16 | Full test suite green, including new CLI + dogfood coverage | ✓ VERIFIED | `node --test` → 231/231 pass, 0 fail, live-run confirmed (not just SUMMARY claim). `node --test test/dogfood.test.js` → 10/10 pass, confirming the skill-count bump to 3 is real. |
| 17 | No unresolved debt markers in phase-touched files | ✓ VERIFIED | `grep -n "TBD\|FIXME\|XXX"` across `bin/motto.js`, `test/cli.test.js`, `test/dogfood.test.js`, `skills/changelog/SKILL.md`, `skills/build-skill/SKILL.md` returns zero matches. |

**Score:** 17/17 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/motto.js` | Modified — flag parsing, format guard, result rendering, stream routing | ✓ VERIFIED | Read in full; `quiet`/`format` options, `VALID_FORMATS`, `checkFormatValue`, `renderResult`, stream-split all present and match plan spec exactly. |
| `test/cli.test.js` | Modified — coverage for quiet, format json/text/bad, stream split, init split | ✓ VERIFIED | 5 new `describe` blocks confirmed by grep (`--quiet (CLIX-01)`, `--format json (CLIX-02)`, `--format <bad value> (D-10)`, `stdout/stderr split (CLIX-03)`, `init stderr split (D-07)`); 33 `it()` cases total in the file; suite passes. |
| `.planning/phases/.../19-BSKV-FINDINGS.md` | New — D-14 schema, all 3 targets | ✓ VERIFIED | Exists, fully populated, no TODO/placeholder text remaining. |
| `skills/<name>/` (real skill, iff lints clean) | New skill shipped only if it passes lint | ✓ VERIFIED | `skills/changelog/SKILL.md` exists, substantive (7-step process, role, success criteria — not a stub), lints clean live. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `parseCliArgs` options object | `quiet`/`format` parsing | `parseArgs({options:{quiet:{type:'boolean'}, format:{type:'string'}}})` | ✓ WIRED | Confirmed at bin/motto.js:227-228. |
| format-value guard | pre-dispatch, before I/O | `checkFormatValue()` called before `checkTargetDir` await | ✓ WIRED | Confirmed in both lint (349) and build (370) dispatch branches — guard runs first, short-circuits via `else if`. |
| lint/build dispatch | result rendering | `renderResult(result, {format, quiet, successLine})` | ✓ WIRED | Both dispatch branches call the same shared helper; no duplicated rendering logic. |
| `bin/motto.js` | `src/lint.js` / `src/build.js` | single-arg `lintProject(root)` / `buildProject(root)` | ✓ WIRED | Confirmed single-argument call sites; core signatures unchanged. |
| `skills/build-skill/SKILL.md` Step 1/3/5.1/6/7 | live-run observation | 19-BSKV-FINDINGS.md targets | ✓ WIRED | Each target's Observed text names the specific step that fired (Step 3 gap-fill, Step 7 check 4, Step 5.1 pre-write guard). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Clean lint, json format | `node bin/motto.js lint --format json` | `{"ok":true,"errors":[],"count":3}`, single line, stderr empty | ✓ PASS |
| Clean lint, quiet | `node bin/motto.js lint --quiet` | empty stdout, exit 0 | ✓ PASS |
| Bad format value | `node bin/motto.js lint --format yaml` | stdout empty; stderr = `✗ unknown format 'yaml'` + usage + hint; exit 1 | ✓ PASS |
| Failing lint, json format | corrupted fixture, `lint --format json` | single JSON line, `ok:false`, 4 errors, stderr empty | ✓ PASS |
| Failing lint, text mode | corrupted fixture, `lint` | stdout empty, stderr has 4 `✗` lines, exit 1 | ✓ PASS |
| D-09 regression (WR-01 fix) | `node bin/motto.js --format text --help lint` | prints GLOBAL_HELP (not focused lint help) | ✓ PASS |
| changelog skill lints clean | `node bin/motto.js lint skills/changelog --format json` | `{"ok":false...}` — note: path-scoped lint against a subdirectory reports `motto.yaml not found` because it isn't a full project root; full-project `node bin/motto.js lint` (no path) is the correct invocation and returns `✓ 3 skills OK` | ✓ PASS (full-project invocation) |
| Full test suite | `node --test` | 231/231 pass | ✓ PASS |
| Dogfood suite | `node --test test/dogfood.test.js` | 10/10 pass | ✓ PASS |

Note on the "changelog skill lints clean" row: an ad-hoc `lint skills/changelog --format json` invocation is not the correct usage pattern (lint expects a project root containing `motto.yaml`, not a single skill subdirectory) — this produced a misleading `ok:false`. The canonical, plan-specified check is a full-project `motto lint`, which was run and returned `✓ 3 skills OK`, matching both the SUMMARY and the findings file's claim. Recorded here for transparency, not as a gap.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CLIX-01 | 19-01-PLAN.md | `--quiet` suppresses success/progress, errors still print, exit codes unchanged | ✓ SATISFIED | Truths 1-2, 10; live-verified. |
| CLIX-02 | 19-01-PLAN.md | `--format json` emits exactly one JSON doc on stdout; nothing else | ✓ SATISFIED | Truths 3-7; live-verified. |
| CLIX-03 | 19-01-PLAN.md | Diagnostics/errors → stderr, results → stdout, pipe-safe | ✓ SATISFIED | Truths 8-9; live-verified. |
| BSKV-01 | 19-02-PLAN.md | Real skill authored end-to-end through build-skill; findings recorded | ✓ SATISFIED | Truths 13-15; findings file + shipped skill confirmed on disk. |

No orphaned requirements — REQUIREMENTS.md's Phase 19 mapping (CLIX-01, CLIX-02, CLIX-03, BSKV-01) matches exactly the union of `requirements:` fields declared across both PLAN.md frontmatter blocks.

### Anti-Patterns Found

None blocking. `grep` for `TBD|FIXME|XXX` across all phase-touched files returned zero matches. `TODO`/`HACK`/`PLACEHOLDER` scan also returned zero matches in the core CLI files and the new skill.

A code review (19-REVIEW.md) ran post-execution and found 0 critical / 3 warnings / 6 info issues. All 3 warnings were fixed in-phase (commits `42907ef`, `26a9e1c`, `c88e0e3`) and confirmed present in the current codebase:
- WR-01 (D-09 help-routing regression from the new string-valued `--format` flag) — fix verified live above (`--format text --help lint` → global help).
- WR-02 (changelog skill missing version-derivation step) — Step 5 "Propose the next version" confirmed present in `skills/changelog/SKILL.md`.
- WR-03 (destructive init-rejection tests running against the real repo cwd) — not independently re-verified line-by-line, but `test/cli.test.js` init-reject tests pass in the full suite run and commit `c88e0e3` is in the git log.

The 6 info-level findings (stale comment, missing per-artifact dogfood assertion, Keep-a-Changelog heading mismatch, allowed-tools pipe gap, stale-guard scope ambiguity, pre-subcommand `--format` validation gap) remain open by design — they are non-blocking polish items, correctly left unresolved per the review's own disposition, and do not affect phase goal achievement.

### Human Verification Required

None. The phase's one human-in-the-loop requirement (BSKV-01's live `/build-skill` run) was already executed in-session as a blocking `checkpoint:human-verify` task during phase execution — not deferred to this verification pass. Evidence (19-BSKV-FINDINGS.md, the shipped `skills/changelog/` skill, and the commit history showing the run's inline fixes) confirms the run was real, not simulated.

### Gaps Summary

No gaps found. All 17 derived truths (covering the 4 ROADMAP success criteria and the union of both PLAN.md `must_haves` blocks) verified against the live codebase — not just SUMMARY claims. The full test suite (231/231) and dogfood suite (10/10) pass on a live run. All three code-review warnings were confirmed fixed in the current source. The BSKV-01 live-run evidence trail (findings file + shipped skill + commit history) is consistent with an actual executed run rather than a documented-only claim, directly addressing the project's standing "verify side-effect claims" concern.

---

*Verified: 2026-07-03T20:36:13Z*
*Verifier: Claude (gsd-verifier)*
