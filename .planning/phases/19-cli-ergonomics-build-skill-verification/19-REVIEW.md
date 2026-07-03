---
phase: 19-cli-ergonomics-build-skill-verification
reviewed: 2026-07-03T20:28:48Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - bin/motto.js
  - skills/build-skill/SKILL.md
  - skills/changelog/SKILL.md
  - test/cli.test.js
  - test/dogfood.test.js
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-07-03T20:28:48Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the Phase 19 CLI ergonomics surface (`--quiet`, `--format text|json`, stdout/stderr split in `bin/motto.js` + `test/cli.test.js`), the new `skills/changelog/SKILL.md`, the `skills/build-skill/SKILL.md` Step 6 stale-guard fix, and the dogfood count bump. All 230 tests pass. Core invariants hold: `src/` is untouched this phase, the never-throw boundary is preserved at the CLI shell (`parseCliArgs` catch, non-throwing `checkTargetDir`, no `process.exit()`), error `✗` lines route to stderr, and JSON mode serializes the core result verbatim without a duplicate stderr echo.

One confirmed behavioral regression was found and reproduced: the D-09 help-routing heuristic breaks when the new string-valued `--format` flag appears before the subcommand — Phase 19 introduced the first string-valued option, invalidating an assumption the pre-existing raw-argv scan relied on. Additionally, the changelog skill's procedure has a hole (no step determines the version it must write), and two `init`-rejection tests spawn a destructive command with the developer's real repo root as cwd.

## Warnings

### WR-01: D-09 help routing broken by `--format`'s value — `--help` before the subcommand yields focused help instead of global help

**File:** `bin/motto.js:257-261`
**Issue:** The `helpBeforeSubcommand` heuristic scans raw argv for the first token not starting with `-`:

```js
const firstPositionalIndex = rawArgs.findIndex((a) => !a.startsWith('-'));
```

Phase 19 added the first string-valued option (`--format <value>`), and its value is misidentified as the first positional. Reproduced:

```
$ motto --format text --help lint     # --help is BEFORE the subcommand token
usage: motto lint [path] [options]    # ← focused LINT help; D-09 requires GLOBAL help
```

`rawArgs = ['--format','text','--help','lint']` → `firstPositionalIndex = 1` (`text`, actually a flag value), `firstHelpIndex = 2`, so `helpBeforeSubcommand` is false and dispatch falls into the `sub === 'lint'` help branch. This contradicts the contract documented in this same file's header (lines 19–20: "`--help` BEFORE the subcommand always yields global help") and D-09. Before this phase all options were boolean, so the scan was sound; `--format` silently invalidated it.
**Fix:** Skip string-option values when locating the first positional, e.g.:

```js
const STRING_OPTS = new Set(['--format']);
let firstPositionalIndex = -1;
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (STRING_OPTS.has(a)) { i++; continue; }         // skip flag + its value
  if (a.startsWith('--') && a.includes('=')) continue; // --format=json form
  if (!a.startsWith('-')) { firstPositionalIndex = i; break; }
}
```

Add a regression test: `runCli(['--format', 'text', '--help', 'lint'])` must print global help (`usage: motto <init|lint|build>`), not `usage: motto lint`.

### WR-02: changelog skill writes `## [<new-version>]` but no step determines the new version

**File:** `skills/changelog/SKILL.md:38`
**Issue:** Step 5 instructs the agent to insert the entry under `## [<new-version>] - <date>`, but no step in the procedure derives, infers, or asks for the version number. Steps 1–4 cover tag discovery, commit collection, early exit, and grouping; the version the heading requires appears from nowhere. The executing agent must invent one (or stall), and an invented version in CHANGELOG.md is exactly the kind of side-effect-claim drift this project has been burned by before.
**Fix:** Add an explicit step between Steps 4 and 5: propose the next version by semver inference from the grouped commit types (any `feat` → minor, only `fix`/`docs`/`chore` → patch, breaking marker → major), state the proposal in the draft, and flag it for maintainer confirmation in the Step 6 handback. Alternatively, write the heading as `## [Unreleased]` and let the release flow assign the version.

### WR-03: `init` rejection tests spawn a destructive command with the real repo root as cwd

**File:** `test/cli.test.js:403-413`
**Issue:** The two D-03/D-11 rejection tests call `runCli(['init', '--format', 'json'])` and `runCli(['init', '--quiet'])` with no `cwd` option, so the child process inherits the test runner's cwd — the developer's actual repo checkout. These tests exist precisely to verify the rejection branch in `bin/motto.js`; if that branch regresses (the scenario under test), the child executes `motto init` against the real working tree, and the only thing preventing file writes is `scaffoldProject`'s not-empty guard in `src/init.js` — a second, unrelated layer. Every other `init` test in this file (`lines 374-401`) correctly runs inside a `mkdtemp` fixture.
**Fix:** Pass a fresh tempdir cwd, matching the file's own pattern:

```js
const dir = await mkdtemp(join(tmpdir(), 'motto-cli-init-reject-'));
try {
  const r = runCli(['init', '--format', 'json'], { cwd: dir });
  ...
} finally {
  await rm(dir, { recursive: true, force: true });
}
```

## Info

### IN-01: Stale comment claims `count:2` next to an assertion requiring `count=3`

**File:** `test/dogfood.test.js:117-121`
**Issue:** The TMPL-01/03 comment block reads "the `lintProject(REPO_ROOT)` assertion above — ok:true/count:2/errors:[] already proves the real tree", but the referenced assertion (line 42) was bumped to `result.count === 3` this phase. The comment now misdescribes the invariant it cites.
**Fix:** Update the comment to `count:3`, or drop the hardcoded count from the prose so it can't drift again.

### IN-02: New `changelog` skill has no dist artifact assertion in the dogfood build suite

**File:** `test/dogfood.test.js:92-113`
**Issue:** `build-skill` (public) and `release` (private) each get per-artifact `stat` assertions on their built `SKILL.md`; the new `changelog` skill added this phase is covered only indirectly by `skillCount === 3`. A build defect that miscounts or misplaces the private bucket copy for `changelog` specifically would not be pinpointed.
**Fix:** Add `it('dist/private/changelog/SKILL.md exists', () => stat(join(tempDir, 'dist', 'private', 'changelog', 'SKILL.md')))`.

### IN-03: changelog Step 4 group names contradict Step 5's Keep a Changelog headings

**File:** `skills/changelog/SKILL.md:34-38`
**Issue:** Step 4 groups commits into "Documentation" and "Changed or Internal" — neither "Documentation" nor "Internal" is a Keep a Changelog heading — while Step 5 mandates "Keep a Changelog section headings (Added, Changed, Fixed, etc.)" for those same groups. The executing agent gets two conflicting instructions about the heading set.
**Fix:** Map to canonical headings in Step 4 itself: `docs → Changed` (or fold under Changed with a docs bullet), `refactor/chore/test → Changed`, reserving Added/Fixed/Deprecated/Removed/Security per spec.

### IN-04: changelog Step 1 fallback command is only partially covered by `allowed-tools` and answers a different question

**File:** `skills/changelog/SKILL.md:6-9, 22`
**Issue:** (a) The fallback `git tag --sort=-v:refname | head -1` pipes into `head`, which no `allowed-tools` entry covers (`Bash(git tag*)` matches the first segment only under Claude Code's pipe-aware permission matching) — the run will stall on a permission prompt. (b) The two commands are not interchangeable: `git describe --tags --abbrev=0` returns the nearest tag reachable from HEAD, while the sort picks the highest version tag repo-wide, which may not be an ancestor of HEAD (e.g. a hotfix tag on another branch), producing a wrong commit range in Step 2.
**Fix:** Use `git tag --merged HEAD --sort=-v:refname` and take the first line without a pipe (the agent can read the first line of output directly), or add the pipe's segments to `allowed-tools`.

### IN-05: build-skill Step 6 stale-guard nominally applies to the repo-local linter, where falling through moves to staler binaries

**File:** `skills/build-skill/SKILL.md:63`
**Issue:** The stale-guard paragraph ("fall through to the next candidate in the chain") is unconditional across all four candidates. If the resolved linter is position 1 (`node bin/motto.js` — the checkout itself, which cannot be stale relative to itself), falling through goes to `node_modules`/global/npx, all *more* likely to diverge from the checkout, inverting the guard's intent. There is also no instruction for the terminal case where the last candidate (`npx`) also trips the heuristic.
**Fix:** Scope the guard: "This stale-signal fall-through applies only when the resolved linter is NOT the repo-local `bin/motto.js`; the repo-local linter is authoritative for its own checkout. If the final candidate also looks stale, stop and report the discrepancy instead of editing the file."

### IN-06: Invalid `--format` value is silently ignored when no subcommand is given

**File:** `bin/motto.js:270-273`
**Issue:** `motto --format yaml` (no subcommand) prints global help and exits 0 — the invalid value is never validated because the `sub === undefined` branch runs first. The same value after a subcommand exits 1 with `✗ unknown format 'yaml'` (D-10). Minor contract inconsistency; harmless in practice since no command runs.
**Fix:** Acceptable as-is (help-precedence convention); optionally note in the header comment that pre-subcommand flag values are unvalidated when help is shown.

---

_Reviewed: 2026-07-03T20:28:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
