---
phase: 11-cli-ergonomics-help-path
verified: 2026-07-02T00:00:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 11: CLI Ergonomics (--help, [path]) Verification Report

**Phase Goal:** Users can discover Motto's usage without reading source and can lint or build a project that isn't the current directory.
**Verified:** 2026-07-02
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `motto --help` and `motto -h` print usage to stdout and exit 0 (D-01, CLIX-03) | ✓ VERIFIED | Ran `node bin/motto.js --help` and `-h` directly: both print `usage: motto <init\|lint\|build> [options]` block with commands/options to stdout, exit 0. `test/cli.test.js` asserts `status===0`, stdout content, `stderr===''`. |
| 2 | Bare `motto` (no subcommand) prints the full compact help to stdout and exits 0 (D-03) | ✓ VERIFIED | Ran `node bin/motto.js` with no args: identical global help printed to stdout, exit 0 (previously stderr/exit 1 pre-phase, per doc-comment and SUMMARY). Test `bare invocation` passes. |
| 3 | `motto <cmd> --help` prints that subcommand's focused help to stdout, exits 0, does NOT run the subcommand (D-02, D-09) | ✓ VERIFIED | Ran `node bin/motto.js lint --help`: prints `usage: motto lint [path] [options]` focused block, exit 0, no `skills OK` line (command not invoked). Same pattern verified in code for `build`/`init` branches (lines 169-172, 204-207, 225-228 of bin/motto.js) and exercised by 3 passing tests. |
| 4 | `motto --help lint` (help flag before subcommand) prints GLOBAL help, not lint's focused help (D-09) | ✓ VERIFIED | Ran `node bin/motto.js --help lint`: output is the GLOBAL help block (all 3 command names, no `usage: motto lint` focused line). Implemented via raw `process.argv` order inspection (`firstHelpIndex < firstPositionalIndex`, lines 151-155). Test asserts absence of lint's focused usage line. |
| 5 | `motto lint [path]` and `motto build [path]` operate on the given directory; omitting `[path]` defaults to cwd (CLIX-04) | ✓ VERIFIED | Manual run: scaffolded a project into a temp dir, then `node bin/motto.js lint <tempdir>` → `✓ 1 skills OK`; `node bin/motto.js build <tempdir>` → `✓ built <tempdir>/dist — 1 skills, 1 plugin(s)`. Code wires `positionals[1] ?? process.cwd()` (lines 211-212, 232-233). Tests prove targeting a different dir than cwd (spawned with `cwd: tmpdir()` while path points elsewhere) and that omitted path still uses cwd. |
| 6 | `motto lint/build` against a nonexistent path prints `✗ directory not found: <path as typed>` and exits 1 (D-06) | ✓ VERIFIED | Manual run: `node bin/motto.js lint /nonexistent/xyz-verify` → stderr `✗ directory not found: /nonexistent/xyz-verify`, exit 1; same for `build`. `checkTargetDir()` (lines 99-114) uses non-throwing `stat`, guard runs pre-dispatch only when path is explicit. Also covers non-directory (file) path with `✗ not a directory: <path>`, exit 1 — tested against `motto.yaml`. |
| 7 | Unknown subcommand and unknown flag each name the offending token, print usage line + hint to stderr, exit 1 (D-04, D-05) | ✓ VERIFIED | Manual run: `motto foo` → `✗ unknown command 'foo'` + usage line + `(run 'motto --help' for details)` on stderr, exit 1. `motto --bogus` → `✗ unknown option '--bogus'` + same usage/hint, exit 1. Both confirmed via direct execution and passing tests. |
| 8 | Paths appear as-typed in build output (no absolute-path resolution) (D-07) | ✓ VERIFIED | Test `build <relative-path>` spawns with `cwd: tempDir` and a relative path arg; asserts stdout contains the as-typed relative path and does NOT contain the tempDir's absolute prefix. Passing. Code confirms `outDir` is derived from the as-typed `root`, never resolved to absolute (lines 232-241). |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/motto.js` | help system + `[path]` wiring + directory guard | ✓ VERIFIED | 258 lines; `help:{type:'boolean',short:'h'}` in parseArgs options (line 126); `GLOBAL_HELP`/`INIT_HELP`/`LINT_HELP`/`BUILD_HELP` constants; single-sourced `USAGE_LINE`/`UNKNOWN_HINT`; `checkTargetDir()` guard; dispatch chain wired end-to-end and exercised at runtime. |
| `test/cli.test.js` | spawn-based CLI behavior tests | ✓ VERIFIED | 180 lines, 15 tests across 3 `describe` blocks, all using `spawnSync` against the real `bin/motto.js` child process (not importing dispatch logic). `node --test test/cli.test.js` → 15/15 pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| parseArgs options | `help: { type: 'boolean', short: 'h' }` | D-01 | ✓ WIRED | Line 126, confirmed present and functional (`-h`/`--help` both parse and route to help output). |
| Raw `process.argv` order check | global vs. per-subcommand help routing | D-09 | ✓ WIRED | Lines 151-155 (`firstPositionalIndex`, `firstHelpIndex`, `helpBeforeSubcommand`), consumed at line 165. Verified with `--help lint` producing global help. |
| `positionals[1] ?? process.cwd()` | `lintProject`/`buildProject` root param | CLIX-04 | ✓ WIRED | Lines 211-212 (lint), 232-233 (build); confirmed operating on a non-cwd temp directory. |
| Pre-dispatch directory guard | `lintProject`/`buildProject` call | D-06 | ✓ WIRED | `checkTargetDir()` called and gated via `targetPath === undefined \|\| (await checkTargetDir(targetPath))` (lines 213, 234) — guard runs before dispatch only when an explicit path is given; nonexistent path never reaches `lintProject`. |
| Single-sourced usage-line constant | parseArgs catch + unknown-subcommand branch | — | ✓ WIRED | `grep -c "usage: motto <init\|lint\|build>" bin/motto.js` → 1 (single literal definition); `USAGE_LINE` referenced at both stderr sites (lines 139, 254). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Global help to stdout, exit 0 | `node bin/motto.js --help` | Full help block, exit 0 | ✓ PASS |
| `-h` alias, exit 0 | `node bin/motto.js -h` | Same help, exit 0 | ✓ PASS |
| Bare invocation, exit 0 (D-03 inversion) | `node bin/motto.js` | Global help, exit 0 | ✓ PASS |
| Focused subcommand help, no execution | `node bin/motto.js lint --help` | Lint's focused usage, exit 0 | ✓ PASS |
| Flag-before-subcommand → global help | `node bin/motto.js --help lint` | Global help block | ✓ PASS |
| Unknown subcommand error shape | `node bin/motto.js foo` | `✗ unknown command 'foo'` + usage + hint, exit 1 | ✓ PASS |
| Unknown flag error shape | `node bin/motto.js --bogus` | `✗ unknown option '--bogus'` + usage + hint, exit 1 | ✓ PASS |
| Nonexistent path guard (lint) | `node bin/motto.js lint /nonexistent/xyz-verify` | `✗ directory not found: ...`, exit 1 | ✓ PASS |
| Nonexistent path guard (build) | `node bin/motto.js build /nonexistent/xyz-verify` | `✗ directory not found: ...`, exit 1 | ✓ PASS |
| `[path]` targets a real, non-cwd directory | scaffold to tempdir, then `lint <tempdir>` / `build <tempdir>` | `✓ 1 skills OK`; `✓ built <tempdir>/dist — 1 skills, 1 plugin(s)` | ✓ PASS |
| Full test suite (single run) | `node --test` | 133 tests, 133 pass, 0 fail | ✓ PASS |
| Phase-specific suite (single run) | `node --test test/cli.test.js` | 15 tests, 15 pass, 0 fail | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CLIX-03 | 11-01-PLAN.md | User can run `motto --help` / `-h` (globally and per subcommand) and get usage text on stdout, exit 0 | ✓ SATISFIED | Truths 1, 3, 4 above; direct CLI runs + tests. |
| CLIX-04 | 11-01-PLAN.md | User can run `motto lint [path]` / `motto build [path]` against another directory; defaults to cwd | ✓ SATISFIED | Truths 5, 6, 8 above; direct CLI runs + tests. |

No orphaned requirements: REQUIREMENTS.md maps only CLIX-03 and CLIX-04 to Phase 11, both declared in 11-01-PLAN.md frontmatter and both satisfied. DOC-04/DOC-05 are correctly scoped to Phase 12 (not this phase).

### Anti-Patterns Found

None. `grep -n -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` against `bin/motto.js` and `test/cli.test.js` returned no matches. No empty-implementation patterns (`return null`, `=> {}`) found in the new/modified help or guard logic — all branches produce real output tied to a real dispatch decision.

### Human Verification Required

None. This phase's entire observable surface (help text, exit codes, stream routing, path targeting, error shapes) is deterministic CLI I/O, fully exercised by direct execution and by `test/cli.test.js`'s spawn-based suite. No visual, real-time, or external-service behavior is in scope.

### Gaps Summary

No gaps. All 8 must-have truths from the PLAN frontmatter verified against actual CLI behavior (not just SUMMARY claims) via direct `node bin/motto.js` invocations and via the full `node --test` suite (133/133 passing, including the new 15-test `test/cli.test.js`). One documented deviation in the SUMMARY (Task 2's plan-authored verify snippet assumed `motto init <path>` scaffolds AT that path, but `init`'s positional is the `name` field, not a target dir) was confirmed accurate during this verification — it is out of scope for CLIX-04 (lint/build only) and does not affect the phase goal; lint/build `[path]` targeting was independently confirmed working against a real non-cwd directory.

---

_Verified: 2026-07-02_
_Verifier: Claude (gsd-verifier)_
