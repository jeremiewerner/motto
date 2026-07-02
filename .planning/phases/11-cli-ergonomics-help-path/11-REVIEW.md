---
phase: 11-cli-ergonomics-help-path
reviewed: 2026-07-02T08:47:18Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - bin/motto.js
  - test/cli.test.js
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-07-02T08:47:18Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the phase-11 CLI ergonomics work: the new `-h`/`--help` help system, unknown-command/unknown-flag error shapes, and `[path]` wiring with the pre-dispatch directory guard in `bin/motto.js`, plus the spawn-based test suite in `test/cli.test.js`. Cross-referenced the CLI's assumptions against the return shapes of `scaffoldProject`, `lintProject`, and `buildProject` — all result-shape contracts (`ok`, `count`, `errors[].skill/.message`, `outDir`, `skillCount`, `bucketCount`, `reason`, `suggestion`, `offending`) line up correctly, and the never-throw invariant is respected on all dispatch paths.

No critical issues found. Four warnings are confirmed defects in error reporting and help-text accuracy — two were reproduced empirically:

- `motto lint --force=true` prints `✗ unknown option 'unknown'` (reproduced) — a known flag misused produces a nonsense message.
- `motto init foo` scaffolds into the **current directory** (reproduced — no `./foo` is created), while the new `INIT_HELP` text implies `[name]` selects a target directory.

The remaining findings degrade diagnostics or test rigor but do not produce incorrect exit codes or data loss.

## Warnings

### WR-01: `checkTargetDir` reports every stat failure as "directory not found"

**File:** `bin/motto.js:100-107`
**Issue:** The bare `catch` collapses all `stat()` rejections into `✗ directory not found: <path>`. For `EACCES` (permission denied), `ELOOP` (symlink cycle), or `ENAMETOOLONG`, the directory may well exist — the message is factually wrong and sends the user debugging the wrong problem. Only `ENOENT`/`ENOTDIR` mean "not found".
**Fix:**
```js
} catch (err) {
  const msg =
    err?.code === 'ENOENT' || err?.code === 'ENOTDIR'
      ? `✗ directory not found: ${targetPath}\n`
      : `✗ cannot access ${targetPath}: ${err.message}\n`;
  process.stderr.write(msg);
  process.exitCode = 1;
  return false;
}
```

### WR-02: parseArgs catch mislabels non-unknown-option errors as `unknown option 'unknown'`

**File:** `bin/motto.js:131-143`
**Issue:** The regex only matches `Unknown option …` messages. `parseArgs` with `strict:true` also throws `ERR_PARSE_ARGS_INVALID_OPTION_VALUE` for a boolean flag given a value — e.g. `motto lint --force=true` throws `Option '--force' does not take an argument`. The regex misses, `flag` falls back to `'unknown'`, and the CLI prints the reproduced output `✗ unknown option 'unknown'`. This is wrong twice: `--force` is a *known* option, and `'unknown'` is not a flag name. Exit code (1) is still correct.
**Fix:** Fall back to the original error message instead of the literal `'unknown'`:
```js
const match = /(?:Unknown option |unrecognized option )['"]?(-{1,2}[^'"\s]+)/.exec(
  err && err.message,
);
if (match) {
  process.stderr.write(`✗ unknown option '${match[1]}'\n`);
} else {
  process.stderr.write(`✗ ${err && err.message ? err.message : 'invalid arguments'}\n`);
}
```

### WR-03: `INIT_HELP` misdescribes `[name]` semantics — implies it selects a target directory

**File:** `bin/motto.js:55-63` (behavior at `bin/motto.js:174-178`)
**Issue:** The new help text reads `motto init [name]` … "(defaults to the current directory when [name] is omitted)". Combined with the convention set by `npm init` / `cargo new`, this tells users `motto init foo` creates `./foo`. Actual behavior (verified empirically): the CLI always calls `scaffoldProject(process.cwd(), { name })` — `[name]` only sets the project name in templates; files are **always** scaffolded into the current directory, and no `./foo` is created. A user running `motto init foo` inside a non-empty directory gets a confusing "directory is not empty" error for a directory they never asked to scaffold into.
**Fix:** Reword the help to match the implemented (INIT-01) semantics:
```
scaffold a new skills project in the current directory
([name] sets the project name; defaults to the directory's name)
```
Apply the same clarification to the `init [name]` line in `GLOBAL_HELP` if space allows. (Alternatively, if directory-creating semantics are actually desired, that is a behavior change belonging to a future phase — the help must not promise it today.)

### WR-04: `process.exit()` can truncate stderr on Windows pipes; safety comment is overstated

**File:** `bin/motto.js:142` (comment at `bin/motto.js:26-29`)
**Issue:** The comment claims the `process.exit()` call is "safe: all output written before this call". That holds only where stderr writes are synchronous (POSIX files/TTYs/pipes). On Windows, writes to *pipes* are asynchronous — exactly the configuration used by `spawnSync` in the test suite — so `process.exit()` may terminate before the three `stderr.write` calls flush, truncating the error output. The rest of the file carefully avoids `process.exit(1)` for this exact reason (Pitfall 7); this path undermines that invariant on one platform.
**Fix:** Restructure so no forced exit is needed — wrap parse+dispatch in a function and return early:
```js
function parseCliArgs() {
  try {
    return parseArgs({ /* ... */ });
  } catch (err) {
    /* write the three stderr lines */
    process.exitCode = 1;
    return null;
  }
}
const parsed = parseCliArgs();
if (parsed !== null) {
  // ... existing dispatch, inside an async main() or guarded block
}
```

## Info

### IN-01: Extra positional arguments are silently ignored

**File:** `bin/motto.js:176,211,232`
**Issue:** `motto lint path1 path2`, `motto build a b`, and `motto init name extra` all silently drop everything past `positionals[1]`. A typo like `motto lint skills shared` lints only `skills` while appearing to succeed on the whole invocation.
**Fix:** After extracting `targetPath`/`name`, reject `parsed.positionals.length > 2` with the D-04-style `✗ unexpected argument '<token>'` + usage + hint shape, exit 1.

### IN-02: `--force` is accepted (and silently ignored) by `lint` and `build`

**File:** `bin/motto.js:122-130`
**Issue:** A single global `parseArgs` options table means `motto build --force` parses cleanly even though `GLOBAL_HELP` documents `--force` as `(init)` only. Users get no signal that the flag did nothing.
**Fix:** After dispatch resolution, warn or error when `parsed.values.force` is set and `sub !== 'init'` (reusing the D-05 error shape), or move to per-subcommand `parseArgs` invocations.

### IN-03: Raw-argv help scan diverges from parseArgs positional semantics around `--`

**File:** `bin/motto.js:151-155`
**Issue:** `firstPositionalIndex` treats any `-`-prefixed token as a non-positional, but `parseArgs` treats tokens after `--` (and a lone `-`) as positionals. Degenerate inputs like `motto - --help` are therefore classified as "help before subcommand" and print global help with exit 0 instead of reaching the unknown-command branch for `-`. Harmless in practice, but the two parsing views can disagree.
**Fix:** Use `parseArgs({ ..., tokens: true })` and derive both "first positional index" and "first help index" from the returned token list instead of re-scanning raw argv.

### IN-04: `build --help` / `init --help` tests claim "command did NOT run" without asserting it

**File:** `test/cli.test.js:65-75`
**Issue:** The lint help test asserts `doesNotMatch(/skills OK/)`, but the build and init variants assert only the usage line despite their titles claiming the command did not run. They pass today only because an accidental execution in the repo cwd would exit 1; that protection is incidental.
**Fix:** Add `assert.doesNotMatch(r.stdout, /✓ built/)` to the build test and `assert.doesNotMatch(r.stdout, /scaffolded project/)` to the init test.

### IN-05: `basename(projectName)` is a no-op

**File:** `test/cli.test.js:135`
**Issue:** `projectName` is the bare string `'sample-proj'`; `basename()` returns it unchanged. The call implies path stripping that never happens and adds a needless import usage.
**Fix:** `const relOutDirPrefix = join(projectName, 'dist');`

---

_Reviewed: 2026-07-02T08:47:18Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
