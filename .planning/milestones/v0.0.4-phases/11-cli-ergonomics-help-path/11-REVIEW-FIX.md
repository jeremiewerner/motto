---
phase: 11-cli-ergonomics-help-path
fixed_at: 2026-07-02T09:20:00Z
review_path: .planning/phases/11-cli-ergonomics-help-path/11-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-07-02T09:20:00Z
**Source review:** .planning/phases/11-cli-ergonomics-help-path/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (fix_scope: critical_warning — 0 critical, 4 warnings; 5 info findings out of scope)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: `checkTargetDir` reports every stat failure as "directory not found"

**Files modified:** `bin/motto.js`
**Commit:** c72b0d4
**Applied fix:** The bare `catch` in `checkTargetDir` now inspects `err.code`: only `ENOENT`/`ENOTDIR` produce `✗ directory not found: <path>`; all other rejections (EACCES, ELOOP, ENAMETOOLONG, …) produce `✗ cannot access <path>: <err.message>`. Exit code remains 1 on all failure paths.

### WR-02: parseArgs catch mislabels non-unknown-option errors as `unknown option 'unknown'`

**Files modified:** `bin/motto.js`
**Commit:** 3d85580
**Applied fix:** When the `Unknown option` regex does not match, the catch now falls back to parseArgs' own error message instead of the literal `'unknown'`. Verified empirically: `motto lint --force=true` now prints `✗ Option '--force' does not take an argument` (was `✗ unknown option 'unknown'`); `motto --bogus` still prints `✗ unknown option '--bogus'`. Exit code 1 on both.

### WR-03: `INIT_HELP` misdescribes `[name]` semantics — implies it selects a target directory

**Files modified:** `bin/motto.js`
**Commit:** e9fc70d
**Applied fix:** Reworded `INIT_HELP` to "scaffold a new skills project in the current directory / ([name] sets the project name; defaults to the directory's name)". Also clarified the `init [name]` line in `GLOBAL_HELP` to "scaffold a skills project in the current directory". Wording verified against `src/init.js` (`effectiveName = name ?? basename(targetDir)`, always scaffolds into the passed cwd — INIT-01 semantics).

### WR-04: `process.exit()` can truncate stderr on Windows pipes; safety comment is overstated

**Files modified:** `bin/motto.js`
**Commit:** d35aba7
**Applied fix:** Wrapped the parse in a `parseCliArgs()` function that reports the error and returns `null` instead of calling `process.exit()`; the dispatch chain now starts with a `parsed === null` guard that skips dispatch entirely on parse failure. Updated the file-header comment to reflect that `process.exitCode` is now used exclusively (no forced-exit exception remains). Verified: zero `process.exit(` call sites remain in `bin/motto.js`; `--bogus` and `--force=true` paths still emit all three stderr lines and exit 1.

## Skipped Issues

None — all in-scope findings were fixed. Info findings IN-01 through IN-05 were out of scope (`fix_scope: critical_warning`).

## Verification

- `node -c bin/motto.js` after every edit: pass.
- Full suite `node --test` before every commit: 133 tests, 0 failures (pre-commit hook also ran the suite on each commit).
- WR-02 and WR-03 behaviors reproduced and re-verified empirically via direct CLI invocation.

---

_Fixed: 2026-07-02T09:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
