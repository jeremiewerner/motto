---
phase: 10-project-scaffold-motto-init
reviewed: 2026-07-02T07:03:54Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/init.js
  - bin/motto.js
  - test/init.test.js
  - test/init-dogfood.test.js
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 10: Code Review Report (re-review after gap-closure plan 10-03)

**Reviewed:** 2026-07-02T07:03:54Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Re-review of the `motto init` scaffolder after fix commits `28383d2` (adversarial never-throw regression tests) and `5eddd10` (never-throw contract restoration).

**WR-01 from the prior review is genuinely RESOLVED.** Verified both by reading the code and empirically:
- STEP 2 (`src/init.js:223-237`) now wraps `listNonIgnorableEntries` in try/catch and maps failures to `{ ok:false, errors:[{skill:'(init)', message:'cannot read target directory: ...'}] }`.
- STEP 4 (`src/init.js:243-254`) now wraps `writeScaffold` and maps failures to `{ ok:false, errors:[{skill:'(init)', message:'scaffold write failed: ...'}] }`.
- Empirical reproduction of all three failure paths (targetDir-is-a-file, write-blocking file with `force:true`, and targetDir-is-a-file with `force:true` — the last skips STEP 2 entirely and is correctly caught by STEP 4) resolves to `ok:false` without throwing.
- Regression tests exist at `test/init.test.js:223-243` (STEP 2 ENOTDIR) and `test/init.test.js:245-268` (STEP 4 blocked write, deterministic across platforms/uids). The `bin/motto.js` generic `else` branch (lines 78-83) prints these reason-less failures correctly. All 43 tests pass.

**No new defects were introduced by the fix commits.** The STEP 2 catch correctly preserves the ENOENT-means-empty semantics inside `listNonIgnorableEntries` (a non-existent target dir still scaffolds successfully via recursive `mkdir`), and the error objects match the documented return shape consumed by the CLI.

Security posture remains solid: name validated against `NAME_KEBAB` (single source, `src/schema.js`) before any template construction, name used only as file content (never a path segment), `execFileSync` with fixed argv (no shell), YAML/JSON content injection-safe (validated name + constant description with no YAML-significant characters), `--force` performs zero deletes.

Three prior warnings remain unresolved and are carried forward with fresh line numbers (WR-02, WR-03, WR-04), as are five info items (IN-01..IN-05). One new info item (IN-06) covers a UX gap in the STEP 4 error path introduced with the fix. One factual correction to the prior report: WR-02's stream-truncation risk applies to **Windows pipes only** (POSIX pipe writes to `process.stderr` are synchronous per Node docs); the finding stands because the code comment claims universal safety and the fix is trivial.

## Resolved Since Prior Review

### WR-01: `scaffoldProject` never-throw contract — RESOLVED

Fixed by `5eddd10` (code) + `28383d2` (tests). Verified empirically on three failure paths; see Summary. No residual throw path found: STEP 1 is pure regex/string work on already-stringified input, STEP 3 (`resolveGitOwnerName`) has its own catch-all, STEPs 2 and 4 are now guarded at the orchestrator boundary.

## Warnings

### WR-02: `process.exit()` after stderr write can truncate the usage message on Windows pipes — the "safe" comment overclaims

**File:** `bin/motto.js:41-46` (header claim at lines 18-21)
**Issue:** The parseArgs catch block writes usage to `process.stderr` then calls `process.exit()`, commented "safe: all output written before this call". Per Node's `process.stdout`/`process.stderr` documentation, pipe/socket writes are synchronous on POSIX but **asynchronous on Windows**, and `process.exit()` does not wait for pending stream flushes. So `motto --bad-flag 2>&1 | findstr usage` on Windows can lose the usage line. The file's own header rule ("always set via process.exitCode, never process.exit") exists precisely to avoid this class of bug; the one exception is justified by a claim that is false on one supported platform. (Correction from prior review: macOS/Linux POSIX pipes are synchronous — the risk is Windows-only.)
**Fix:** Eliminate the early exit — fall through to the existing usage-printing `else`:
```js
} catch {
  parsed = { positionals: [], values: {} }; // no subcommand → final else prints usage, exitCode 1
}
```
This removes the only `process.exit()` call and keeps a single usage path.

### WR-03: `resolveGitOwnerName` leaks git's stderr into `motto init` output

**File:** `src/init.js:92-99` (call at line 94)
**Issue:** `execFileSync` without a `stdio` option passes the child's stderr through to the parent's stderr by default (documented Node behavior for `execSync`/`execFileSync`). Pattern 3's intent is that "git missing, unset, or any other failure all collapse to the same placeholder" silently — but with, e.g., a corrupt `~/.gitconfig`, the user sees git's raw `fatal: bad config line ...` interleaved with scaffold output before the `'Your Name'` fallback kicks in. The failure is swallowed; its noise is not. Unchanged since the prior review.
**Fix:**
```js
const name = execFileSync('git', ['config', 'user.name'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).trim();
```

### WR-04: Path-traversal guard test cannot detect traversal — it only inspects the target dir

**File:** `test/init.test.js:107-140` (specifically the `'../evil'` case; "writes nothing" assertion at lines 134-138)
**Issue:** The adversarial-names suite (T-10-01) exists to prove names like `'../evil'` cause zero writes. Its "writes nothing" assertion reads `readdir(tempDir)` only. If a regression reintroduced the name as a path segment (e.g. `join(targetDir, name)`), files would land at `tmpdir()/evil` — *outside* `tempDir` — and this assertion would still pass, silently missing the exact escape the test is named for. Unchanged since the prior review (the 10-03 fix commits addressed WR-01 only).
**Fix:** Nest the target one level down and assert the parent stays clean:
```js
scratchDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
tempDir = join(scratchDir, 'target');
await mkdir(tempDir);
result = await scaffoldProject(tempDir, { name });
// ...
const parentEntries = await readdir(scratchDir);
assert.deepStrictEqual(parentEntries, ['target'], 'no writes may escape the target dir');
```
(The default-name suite at lines 48-80 already demonstrates this exact scratchDir/nested-target pattern.)

## Info

### IN-01: `withFileTypes: true` requested but never used

**File:** `src/init.js:74` (map to `.name` at line 80)
**Issue:** `listNonIgnorableEntries` requests dirent objects but immediately maps to `.name` only.
**Fix:** Drop the option: `entries = await readdir(targetDir);` (then remove the `.map`).

### IN-02: NAME_KEBAB regex source duplicated as a hardcoded string in the error message

**File:** `src/init.js:215`
**Issue:** The message embeds the literal text `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`. If `NAME_KEBAB` in `src/schema.js` ever changes, this message silently drifts from the single source (D-09/SC4).
**Fix:** Interpolate the imported regex: `` `name must be letter-start kebab-case (${NAME_KEBAB}): "${effectiveName}"` ``.

### IN-03: Extra positionals and misplaced `--force` are silently ignored

**File:** `bin/motto.js:33-40`, `bin/motto.js:57`
**Issue:** `motto init foo bar` silently drops `bar`; `motto lint --force` / `motto build --force` accept and ignore the flag (options are parsed globally, not per subcommand). A user typo (`motto init my proj`) scaffolds under an unintended name (`my`) with no warning.
**Fix:** After dispatch selection, reject `parsed.positionals.length > 2` (init) / `> 1` (lint/build) and `--force` outside init with the usage message.

### IN-04: `--force` test never verifies overwrite of an existing scaffold file

**File:** `test/init.test.js:193-221`
**Issue:** The force suite asserts scaffold paths exist and `keep.txt` survives, but never pre-seeds a stale `motto.yaml` (or `SKILL.md`) and asserts its content was replaced. "Overwrite-by-default" (D-06) is therefore untested — a regression to skip-if-exists would pass this suite.
**Fix:** In `before()`, write `motto.yaml` with junk content first; add an `it` asserting the post-scaffold content matches the template.

### IN-05: `localeCompare` sort is locale-dependent, weakening the "deterministic" claim

**File:** `src/init.js:82` (mirrored comparator in `test/init.test.js:185`)
**Issue:** `localeCompare()` without arguments uses the runtime's current locale/ICU data, so offending-list ordering can differ across machines for case/accent-differing names. The D-07 test can't catch it because it sorts with the same comparator.
**Fix:** Pin the comparison: `sort((a, b) => a.localeCompare(b, 'en'))` or plain `sort()` (code-unit order) for true cross-environment determinism.

### IN-06: STEP 4 failure loses the list of partially written files (new — introduced with the WR-01 fix)

**File:** `src/init.js:243-254` (and `writeScaffold`'s local `created` array at lines 127-180)
**Issue:** When `writeScaffold` throws mid-way, the `created` array accumulated before the failure is local to the function and lost — the STEP 4 catch returns only `scaffold write failed: <message>`. The comment correctly documents that no rollback is performed (T-10-03, YAGNI), but the user is not told that a partial scaffold may now exist in their directory (e.g. `skills/hello-world/SKILL.md` written before `motto.yaml` failed), which matters because a subsequent plain `motto init` retry will then hit the not-empty guard with no explanation of where those files came from.
**Fix:** Append a hint to the error message: `` `scaffold write failed: ${e.message} (some scaffold files may have been partially written; re-run with --force after fixing the cause)` `` — or have `writeScaffold` accept a shared `created` array so the catch can report exactly which files were written.

---

_Reviewed: 2026-07-02T07:03:54Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
