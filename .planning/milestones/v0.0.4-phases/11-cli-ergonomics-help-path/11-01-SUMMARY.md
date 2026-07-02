---
phase: 11-cli-ergonomics-help-path
plan: 01
subsystem: cli
tags: [parseArgs, node-util, node-test, spawnSync]

requires:
  - phase: 10-project-scaffold-motto-init
    provides: scaffoldProject(targetDir, {name, force}) — reused directly by test/cli.test.js to build [path] fixtures
provides:
  - "motto --help / -h and bare motto print global compact help to stdout, exit 0"
  - "motto <cmd> --help prints that subcommand's focused help to stdout, exit 0, without running the command"
  - "motto --help lint (flag before subcommand) resolves to global help, not lint's focused block"
  - "motto lint [path] / motto build [path] target an explicit directory, defaulting to cwd"
  - "Pre-dispatch directory guard rejects nonexistent/non-directory paths with a named ✗ message before any orchestrator call"
  - "Unknown command and unknown flag surface named, hinted errors on stderr, exit 1"
  - "test/cli.test.js — permanent spawn-based CLI coverage"
affects: [cli-ergonomics, future --version/--quiet/--format work]

tech-stack:
  added: []
  patterns:
    - "Raw process.argv order inspection (not parseArgs output) to resolve flag-before-vs-after-subcommand ambiguity, since parseArgs flattens position"
    - "Single-sourced usage-line + hint constants (USAGE_LINE, UNKNOWN_HINT) referenced from both the unknown-flag catch and the unknown-command branch"
    - "Shared non-throwing checkTargetDir() guard reused by both lint and build dispatch branches"
    - "CLI-only behavior (argv branches, exit codes, stream routing) tested via spawnSync child-process invocation, not by importing dispatch logic"

key-files:
  created:
    - test/cli.test.js
  modified:
    - bin/motto.js

key-decisions:
  - "Help-to-stdout dispatch uses an if/else-if chain (not early process.exit()) so no new no-arg process.exit() calls were introduced beyond the pre-existing parseArgs catch-block exit"
  - "sub === undefined branch alone satisfies both D-01 (bare --help/-h with no subcommand) and D-03 (bare motto with no flags) since both render identical global help to stdout, exit 0"
  - "Task 2's plan-authored <verify> shell snippet assumed `motto init <path>` scaffolds AT that path; current init CLI wiring only ever scaffolds into cwd (positional is the `name` field, not a target dir) — out of scope for CLIX-04, which covers lint/build only. Verified the underlying behavior with an equivalent mkdir+cd sequence and the exact scaffoldProject(targetDir, {name}) API instead of the literal script."

patterns-established:
  - "Focused per-subcommand help blocks (INIT_HELP/LINT_HELP/BUILD_HELP) live as sibling template-literal constants next to GLOBAL_HELP in bin/motto.js — no src/help.js module needed at this file size"

requirements-completed: [CLIX-03, CLIX-04]

coverage:
  - id: D1
    description: "motto --help / -h / bare motto print global compact help to stdout, exit 0 (D-01, D-03)"
    requirement: "CLIX-03"
    verification:
      - kind: integration
        ref: "test/cli.test.js#--help: status 0, stdout has usage + all 3 command names, stderr empty"
        status: pass
      - kind: integration
        ref: "test/cli.test.js#-h: same global help, status 0, stderr empty"
        status: pass
      - kind: integration
        ref: "test/cli.test.js#bare invocation (no args): status 0, stdout has global help"
        status: pass
    human_judgment: false
  - id: D2
    description: "motto <cmd> --help prints focused help, exit 0, and does not run the subcommand (D-02)"
    requirement: "CLIX-03"
    verification:
      - kind: integration
        ref: "test/cli.test.js#lint --help: status 0, stdout has focused usage, command did NOT run"
        status: pass
      - kind: integration
        ref: "test/cli.test.js#build --help: status 0, stdout has focused usage, command did NOT run"
        status: pass
      - kind: integration
        ref: "test/cli.test.js#init --help: status 0, stdout has focused usage, command did NOT run"
        status: pass
    human_judgment: false
  - id: D3
    description: "motto --help lint (flag before subcommand) resolves to global help, not lint's focused block (D-09)"
    requirement: "CLIX-03"
    verification:
      - kind: integration
        ref: "test/cli.test.js#--help lint (flag before subcommand): stdout is GLOBAL help, not lint's focused block"
        status: pass
    human_judgment: false
  - id: D4
    description: "motto lint [path] / motto build [path] operate on the given directory and default to cwd (CLIX-04)"
    requirement: "CLIX-04"
    verification:
      - kind: integration
        ref: "test/cli.test.js#lint <tempdir>: status 0, stdout has 'skills OK' — targets the given path, not cwd"
        status: pass
      - kind: integration
        ref: "test/cli.test.js#lint (no path): still operates on cwd (unchanged default)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Paths render as-typed in build output — no absolute-path resolution (D-07)"
    requirement: "CLIX-04"
    verification:
      - kind: integration
        ref: "test/cli.test.js#build <relative-path>: status 0, printed outDir is the as-typed relative path, not absolutized"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nonexistent/non-directory [path] rejected via a pre-dispatch ✗ guard, exit 1, before the orchestrator runs (D-06)"
    requirement: "CLIX-04"
    verification:
      - kind: integration
        ref: "test/cli.test.js#lint /nonexistent/<unique>: status 1, stderr has 'directory not found: <path>'"
        status: pass
      - kind: integration
        ref: "test/cli.test.js#build /nonexistent/<unique>: status 1, stderr has 'directory not found: <path>'"
        status: pass
      - kind: integration
        ref: "test/cli.test.js#lint <file-path>: status 1, stderr rejects a file (not a directory)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Unknown subcommand and unknown flag each name the offending token, print usage + hint to stderr, exit 1 (D-04, D-05)"
    verification:
      - kind: integration
        ref: "test/cli.test.js#foo (unknown command): status 1, stderr has unknown command 'foo' + usage line + hint"
        status: pass
      - kind: integration
        ref: "test/cli.test.js#--bogus (unknown flag): status 1, stderr names the offending flag + usage line + hint"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-02
status: complete
---

# Phase 11 Plan 01: CLI Ergonomics (--help, [path]) Summary

**Added a compact global/per-subcommand `--help` system and `[path]` targeting with a pre-dispatch directory guard to `bin/motto.js`, closing CLIX-03 and CLIX-04 with 15 new spawn-based CLI tests.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-02T08:40:10Z (approx, per session state)
- **Completed:** 2026-07-02T10:39:59+02:00
- **Tasks:** 3 completed
- **Files modified:** 2 (`bin/motto.js` modified, `test/cli.test.js` created)

## Accomplishments

- `motto --help` / `-h` / bare `motto` all print a compact global help block to stdout and exit 0 — inverting the prior stderr-usage/exit-1 behavior for the bare-invocation case (D-03).
- `motto <cmd> --help` (init/lint/build) prints a focused, command-specific help block to stdout, exits 0, and does not invoke the underlying orchestrator.
- Flag-position rule implemented via raw `process.argv` inspection (parseArgs flattens position): `motto --help lint` still resolves to the GLOBAL help, not lint's focused block (D-09).
- `motto lint [path]` and `motto build [path]` now target an explicit directory (`positionals[1] ?? process.cwd()`), with a shared, non-throwing pre-dispatch guard (`checkTargetDir`) that rejects nonexistent paths (`✗ directory not found: <path>`) and non-directory paths (`✗ not a directory: <path>`) before any orchestrator call.
- Paths stay as-typed in output — `buildProject`'s `outDir` derives from the as-typed root, never absolutized (D-07).
- Unknown subcommand and unknown flag both surface named, hinted `✗ …` errors on stderr with exit 1, sharing a single-sourced usage-line constant (was duplicated in two places pre-phase).
- `test/cli.test.js` — 15 new tests, all spawning `bin/motto.js` as a real child process via `spawnSync`, covering every behavior above plus regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add --help/-h help system and split bare/unknown-subcommand handling** - `ee78a37` (feat)
2. **Task 2: Wire [path] into lint/build and add the pre-dispatch directory guard** - `3a8264d` (feat)
3. **Task 3: Add test/cli.test.js — spawn-based coverage** - `c57abf7` (test)

**Plan metadata:** (this commit)

_Note: Tasks were marked `tdd="true"` in the plan, but neither Task 1 nor Task 2 modifies a test file (test/cli.test.js is created in Task 3). RED/GREEN verification for Tasks 1-2 was performed via the plan's bash `<verify>` assertions run against the CLI directly (confirmed failing pre-implementation, passing post-implementation) rather than a separate committable test-file RED commit — there was no test artifact to commit ahead of the implementation._

## Files Created/Modified

- `bin/motto.js` — added `help:{type:'boolean',short:'h'}` to parseArgs options; added `GLOBAL_HELP`/`INIT_HELP`/`LINT_HELP`/`BUILD_HELP` constants; single-sourced `USAGE_LINE`/`UNKNOWN_HINT`; restructured the dispatch if/else chain to route help before each subcommand branch and split bare-vs-unknown-subcommand handling; added `checkTargetDir()` pre-dispatch guard; wired `positionals[1] ?? process.cwd()` into lint/build.
- `test/cli.test.js` — new file, 15 tests across 3 describe blocks (help, unknown-command/flag, [path] targeting), all via `spawnSync`.

## Decisions Made

- Help routing folded into the existing if/else-if dispatch chain (rather than early `process.exit()` calls) specifically to honor the plan's "no new no-arg `process.exit()` calls" constraint — confirmed via `grep -n "process.exit("` that only the pre-existing parseArgs catch-block call remains.
- `sub === undefined` is treated as a single branch covering both D-01 (`motto --help`/`-h` with no subcommand) and D-03 (bare `motto`, no flags at all) since both render identical output.
- Per-subcommand `--help` checks are placed as the first branch inside each of `init`/`lint`/`build`, guarded also by the `helpBeforeSubcommand` global-help branch that runs first in the chain — this correctly handles all four orderings (`--help`, `--help <cmd>`, `<cmd> --help`, bare).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Own test assertion incorrectly matched global help's per-command description line**
- **Found during:** Task 3
- **Issue:** The `--help lint` (flag-before-subcommand) test initially asserted `doesNotMatch(/validate skills against the schema/)` against global-help stdout, but that exact phrase is legitimately present in `GLOBAL_HELP`'s one-line description for the `lint` command, causing a false-positive test failure.
- **Fix:** Changed the assertion to check for the absence of lint's FOCUSED usage line (`usage: motto lint`) instead, which correctly and uniquely distinguishes the two help blocks.
- **Files modified:** `test/cli.test.js`
- **Verification:** `node --test test/cli.test.js` — all 15 tests pass.
- **Committed in:** `c57abf7` (part of Task 3 commit; caught and fixed before commit)

**2. [Documentation correction] Task 2's literal `<verify>` shell snippet assumed `motto init <path>` scaffolds a project AT that path**
- **Found during:** Task 2 verification
- **Issue:** The plan's automated verify block ran `node bin/motto.js init "$d/sample-proj"` (from repo-root cwd, no `cd`) expecting a project to appear at `$d/sample-proj`. Current `init` CLI wiring (`scaffoldProject(process.cwd(), {name: positionals[1], ...})`, unchanged by this phase — CLIX-04 covers lint/build only) always scaffolds into `process.cwd()`; the positional argument is the `name` field (validated by `NAME_KEBAB`, which rejects slashes), not a target directory. Running the literal script would have attempted to scaffold into the repo's own root with an invalid name — it failed safely (invalid-name, zero writes) rather than corrupting the repo, but did not actually exercise the [path] happy path as intended.
- **Fix:** No product-code change (nothing was actually broken — init's existing single-cwd-target contract is correct and untouched by this phase). Verified the equivalent behavior using `mkdir -p "$d/sample-proj" && (cd "$d/sample-proj" && node bin/motto.js init)` for manual smoke-testing, and used `scaffoldProject(targetDir, {name})` directly (imported from `src/init.js`, per the plan's own `read_first` note for Task 3) inside `test/cli.test.js`'s `before()` hook to build the permanent fixture — this is both correct and matches the Task 3 read_first's explicit guidance.
- **Files modified:** none (verification-only; the permanent test in `test/cli.test.js` uses the correct API)
- **Verification:** `node --test test/cli.test.js` passes; manual mkdir+cd smoke test confirmed lint/build [path] targeting works against a real scaffolded project.
- **Committed in:** n/a (no code change required)

---

**Total deviations:** 2 (1 test-authoring self-correction before commit, 1 documentation-only note — no product code was incorrect)
**Impact on plan:** No scope creep. Both CLIX-03 and CLIX-04 behaviors implemented exactly per the D-01 through D-09 decision shapes in 11-CONTEXT.md.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CLIX-03 and CLIX-04 are both closed; `motto --help`, `-h`, bare `motto`, `motto <cmd> --help`, and `motto lint|build [path]` are all discoverable and functional without reading source.
- This was the only plan in Phase 11 (single-plan phase). Phase 12 (Docs & Cleanup — DOC-04/05) is next per the v0.0.4 roadmap; README documentation can now truthfully describe `--help` and `[path]` usage.
- No blockers.

---
*Phase: 11-cli-ergonomics-help-path*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: bin/motto.js
- FOUND: test/cli.test.js
- FOUND: .planning/phases/11-cli-ergonomics-help-path/11-01-SUMMARY.md
- FOUND: ee78a37 (Task 1 commit)
- FOUND: 3a8264d (Task 2 commit)
- FOUND: c57abf7 (Task 3 commit)
- FOUND: 9516931 (SUMMARY commit)
