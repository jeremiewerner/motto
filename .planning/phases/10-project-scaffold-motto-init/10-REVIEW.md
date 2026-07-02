---
phase: 10-project-scaffold-motto-init
reviewed: 2026-07-02T06:37:15Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/init.js
  - bin/motto.js
  - test/init.test.js
  - test/init-dogfood.test.js
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-07-02T06:37:15Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the `motto init` scaffolder (`src/init.js`), its CLI wiring (`bin/motto.js`), and both test suites. Security posture is solid: the name is validated against `NAME_KEBAB` (imported from `src/schema.js`, the single source) before any template is built, the name is used only as file content (never a path segment), `execFileSync` is called with a fixed argv (no shell), YAML/JSON content is injection-safe, and `--force` performs zero deletes. Both suites pass (41/41 — noted as context, not as proof of correctness).

The main defect is a contract violation: `scaffoldProject` documents itself as a never-throw orchestrator returning `{ ok, errors }`, but I reproduced two throw paths (ENOTDIR when the target is a file, and fs errors during scaffold writes). Since `bin/motto.js` awaits it with no try/catch, a user running `motto init` in an unwritable directory gets an unhandled-rejection stack trace instead of a `✗` message. Three further warnings cover a falsely-justified `process.exit()` that can truncate piped stderr on macOS/Windows, git stderr leaking through `resolveGitOwnerName`, and a path-traversal guard test that does not actually detect traversal outside the temp dir.

No Critical findings.

## Warnings

### WR-01: `scaffoldProject` throws on fs errors, violating its documented never-throw contract — and `bin/motto.js` has no catch

**File:** `src/init.js:71-83`, `src/init.js:127-180`, `bin/motto.js:54-59`
**Issue:** The module header (lines 9, 14) and JSDoc promise a "Never-throw orchestrator" with return shape `{ ok, created, errors, reason?, ... }`. Verified empirically:
- `scaffoldProject('/path/to/a-file', { name: 'hello-proj' })` → throws `ENOTDIR` from `readdir` in `listNonIgnorableEntries` (line 77 rethrows anything that isn't `ENOENT`).
- `scaffoldProject(unwritableDir, { name: 'hello-proj', force: true })` → throws from `mkdir`/`writeFile` in `writeScaffold` (no try/catch anywhere in STEP 4).

Because `bin/motto.js:56` does `await scaffoldProject(...)` with no surrounding try/catch, any such error surfaces to the end user as a raw unhandled-rejection stack trace (e.g. `motto init` in a read-only directory — a realistic scenario), instead of the documented `✗` line. This also breaks the project's recorded never-throw invariant (validators/orchestrators return `errors[]`, never throw), the exact class of hole previously missed by earlier gates. Note `writeScaffold` failures are worse than the guard failure: they can leave a *partially written* scaffold behind with no report of which files were created before the crash.
**Fix:** Catch fs errors at the orchestrator boundary and map them into the return shape:
```js
// STEP 2
let offending;
try {
  offending = await listNonIgnorableEntries(targetDir);
} catch (e) {
  return { ok: false, errors: [{ skill: '(init)', message: `cannot read target directory: ${e.message}` }] };
}
// STEP 4
try {
  const created = await writeScaffold(targetDir, { name: effectiveName, owner });
  return { ok: true, created, errors: [] };
} catch (e) {
  return { ok: false, errors: [{ skill: '(init)', message: `scaffold write failed: ${e.message}` }] };
}
```
The existing generic `else` branch in `bin/motto.js:78-83` already prints such reason-less failures correctly, so no CLI change is needed. Add a malformed-target test (target-is-a-file) asserting `ok:false` without throw.

### WR-02: `process.exit()` after stderr write can truncate the usage message on macOS/Windows pipes — the "safe" comment is false

**File:** `bin/motto.js:43-46` (and header claim at lines 19-21)
**Issue:** The parseArgs catch block writes usage to `process.stderr` then calls `process.exit()`, with the comment "safe: all output written before this call". Per Node's own documentation, `process.stderr` writes are asynchronous when connected to a pipe on macOS and Windows (synchronous only on Linux pipes, POSIX TTYs, and files). `process.exit()` does not wait for pending stream flushes, so `motto --bad-flag 2>&1 | cat` on macOS can exit with the usage line partially or wholly lost. The file's own header rule ("always set via process.exitCode, never process.exit") exists precisely to avoid this; the justification for the one exception is factually wrong.
**Fix:** Eliminate the early exit instead of justifying it — fall through to the existing usage-printing `else`:
```js
} catch {
  parsed = { positionals: [], values: {} }; // no subcommand → final else prints usage, exitCode 1
}
```
This removes the only `process.exit()` call and keeps a single usage path.

### WR-03: `resolveGitOwnerName` leaks git's stderr into `motto init` output

**File:** `src/init.js:92-99`
**Issue:** `execFileSync` without a `stdio` option pipes the child's stderr through to the parent's stderr by default. Pattern 3's intent is that "git missing, unset, or any other failure all collapse to the same placeholder" silently — but with, e.g., a corrupt `~/.gitconfig`, the user sees git's raw `fatal: bad config line ...` interleaved with the scaffold output before the `'Your Name'` fallback kicks in. The failure is swallowed; its noise is not.
**Fix:**
```js
const name = execFileSync('git', ['config', 'user.name'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).trim();
```

### WR-04: Path-traversal guard test cannot detect traversal — it only inspects the target dir

**File:** `test/init.test.js:107-140` (specifically the `'../evil'` case, assertion at 134-137)
**Issue:** The adversarial-names suite (T-10-01) exists to prove names like `'../evil'` cause zero writes. Its "writes nothing" assertion reads `readdir(tempDir)` only. If a regression reintroduced the name as a path segment (e.g. `join(targetDir, name)`), the files would land at `tmpdir()/evil` — *outside* `tempDir` — and this assertion would still pass, silently missing the exact escape the test is named for. The guard is weaker than its stated purpose.
**Fix:** Nest the target one level down and assert the parent stays clean, e.g.:
```js
scratchDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
tempDir = join(scratchDir, 'target');
await mkdir(tempDir);
result = await scaffoldProject(tempDir, { name });
// ...
const parentEntries = await readdir(scratchDir);
assert.deepStrictEqual(parentEntries, ['target'], 'no writes may escape the target dir');
```

## Info

### IN-01: `withFileTypes: true` requested but never used

**File:** `src/init.js:74`
**Issue:** `listNonIgnorableEntries` requests dirent objects but immediately maps to `.name` only.
**Fix:** Drop the option: `entries = await readdir(targetDir);` (then remove the `.map`).

### IN-02: NAME_KEBAB regex source duplicated as a hardcoded string in the error message

**File:** `src/init.js:215`
**Issue:** The message embeds the literal text `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`. If `NAME_KEBAB` in `src/schema.js` ever changes, this message silently drifts from the single source (D-09/SC4). Same pattern exists in `schema.js`/`config.js`, but new code needn't repeat it.
**Fix:** Interpolate the imported regex: `` `name must be letter-start kebab-case (${NAME_KEBAB}): "${effectiveName}"` ``.

### IN-03: Extra positionals and misplaced `--force` are silently ignored

**File:** `bin/motto.js:33-40`, `bin/motto.js:57`
**Issue:** `motto init foo bar` silently drops `bar`; `motto lint --force` / `motto build --force` accept and ignore the flag (options are parsed globally, not per subcommand). A user typo (`motto init my proj`) scaffolds under an unintended name with no warning.
**Fix:** After dispatch selection, reject `parsed.positionals.length > 2` (init) / `> 1` (lint/build) and `--force` outside init with the usage message.

### IN-04: `--force` test never verifies overwrite of an existing scaffold file

**File:** `test/init.test.js:193-221`
**Issue:** The force suite asserts scaffold paths exist and `keep.txt` survives, but never pre-seeds a stale `motto.yaml` (or `SKILL.md`) and asserts its content was replaced. "Overwrite-by-default" (D-06) is therefore untested — a regression to skip-if-exists would pass this suite.
**Fix:** In `before()`, write `motto.yaml` with junk content first; add an `it` asserting the post-scaffold content matches the template.

### IN-05: `localeCompare` sort is locale-dependent, weakening the "deterministic" claim

**File:** `src/init.js:82` (and mirrored comparator in `test/init.test.js:185`)
**Issue:** `localeCompare()` without arguments uses the runtime's current locale/ICU data, so offending-list ordering can differ across machines for case/accent-differing names. The D-07 test can't catch it because it sorts with the same comparator.
**Fix:** Pin the comparison: `sort((a, b) => a.localeCompare(b, 'en'))` or plain `sort()` (code-unit order) for true cross-environment determinism.

---

_Reviewed: 2026-07-02T06:37:15Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
