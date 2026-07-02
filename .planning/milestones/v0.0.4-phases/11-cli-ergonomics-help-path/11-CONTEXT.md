# Phase 11: CLI Ergonomics (--help, [path]) - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

`motto --help` / `-h` (globally and per subcommand) prints usage text to stdout, exit 0; `motto lint [path]` and `motto build [path]` operate on the given directory, defaulting to cwd. Requirements: CLIX-03, CLIX-04. No `--quiet`, no `--format json` (CLIX-01/02 backlog), no `--version` (not in requirements), no `motto help` subcommand.

</domain>

<decisions>
## Implementation Decisions

### Help text depth
- **D-01:** Global help is COMPACT (~10 lines): usage line + one line per subcommand + flags list. Help text as a constant string (stack decision: parseArgs, no commander). Agreed shape:
  ```
  usage: motto <command> [options]

  commands:
    init [name]    scaffold a new skills project
    lint [path]    validate skills against the schema
    build [path]   package skills into dist/ plugins

  options:
    -h, --help     show help
    --force        (init) overwrite scaffold files
  ```
- **D-02:** Per-subcommand help (`motto lint --help`) is a FOCUSED block: usage line + short description + only that command's flags/args. Not the global text. Agreed shape:
  ```
  usage: motto lint [path] [options]

  validate skills against the schema
  (defaults to current directory)

  options:
    -h, --help    show help
  ```

### Bare invocation & unknown input
- **D-03:** Bare `motto` (no subcommand) prints the full compact help to STDOUT, exit 0 — changed from today's usage-to-stderr exit 1.
- **D-04:** Unknown subcommand: `✗ unknown command 'foo'` + usage line + `(run 'motto --help' for details)` to STDERR, exit 1.
- **D-05:** Unknown flag (strict parseArgs catch) mirrors D-04's shape: name the offending flag, same hint, stderr, exit 1.

### [path] handling (CLIX-04)
- **D-06:** Nonexistent path gets a dedicated pre-dispatch check: `✗ directory not found: <path as typed>`, exit 1. Do NOT pass through and let lintProject blame a missing motto.yaml.
- **D-07:** Paths in output stay relative/as-typed: `motto build ../proj` → `✓ built ../proj/dist — 4 skills, 1 plugin(s)`. No absolute-path resolution in user-facing output.

### Help trigger surface
- **D-08:** Triggers are flags only: `-h` and `--help`. No `motto help` subcommand alias (YAGNI).
- **D-09:** Flag position matters: `--help` BEFORE any subcommand (`motto --help lint`) → global help. Subcommand help only via `motto <cmd> --help`.

### Claude's Discretion
- Where help strings live (constants in `bin/motto.js` vs a `src/help.js` module).
- Exact wording of descriptions within the agreed shapes above.
- Path-is-a-file case and trailing-slash normalization — same `✗` style as D-06.
- Whether `init` also gets a per-subcommand help block (it should, for consistency — D-02 pattern).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — CLIX-03/04 definitions; CLIX-01/02 explicitly deferred (backlog)
- `.planning/ROADMAP.md` — Phase 11 goal + 3 success criteria (authoritative acceptance list)

### Code to modify / patterns to match
- `bin/motto.js` — the file this phase changes: parseArgs strict setup, dispatch, `process.exitCode` convention, `✓`/`✗` style, current stderr-usage behavior being replaced
- `src/lint.js` — `lintProject(projectRoot)` already accepts a root param (wiring only)
- `src/build.js` — `buildProject(projectRoot)` already accepts a root param (wiring only)
- `.planning/phases/10-project-scaffold-motto-init/10-CONTEXT.md` — prior CLI conventions (D-07/D-10/D-11 lineage: exitCode, output style)

No external specs beyond these — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lintProject(projectRoot)` / `buildProject(projectRoot)` — already parameterized on root; `[path]` is pure CLI wiring: resolve `positionals[1]` (default `process.cwd()`), pass through.
- Existing parseArgs block in `bin/motto.js` — add `help: { type: 'boolean', short: 'h' }` to `options`.

### Established Patterns
- Exit codes via `process.exitCode`, never `process.exit(1)` (stdout-flush pitfall). The one `process.exit()` (no-arg) in the parseArgs catch is the established exception.
- `✓ …` success / `✗ <subject>: <message>` error shape.
- Errors/usage to stderr, results to stdout. NEW: help requested via flag or bare `motto` goes to STDOUT exit 0 (CLIX-03).
- Never-throw invariant applies to `src/` modules; CLI-level guard (D-06 dir check) surfaces errors as messages, never stack traces. Adversarial tests expected (memory: prior review found never-throw holes).

### Integration Points
- `bin/motto.js` only — no new `src/` module strictly required (help strings may live in `src/help.js` at planner's discretion; must be inside npm `files` allowlist `bin/`, `src/` if so — `src/` already included).
- **Implementation subtlety (D-09):** parseArgs output is identical for `motto --help lint` and `motto lint --help` (same positionals + values). Enforcing the position rule requires checking raw `process.argv` order (is `-h`/`--help` before `positionals[0]`?).
- Tests: extend `test/cli.test.js`-style coverage (or wherever CLI behavior is tested) — help on stdout exit 0, per-subcommand help doesn't run the command, `[path]` against a temp dir, `directory not found`, unknown command/flag shapes.
- Usage string constant `motto <init|lint|build>` appears in two places today (parseArgs catch + unknown-subcommand branch) — both change; single-source them.

</code_context>

<specifics>
## Specific Ideas

- Unknown-command shape agreed verbatim:
  ```
  ✗ unknown command 'foo'
  usage: motto <init|lint|build>
  (run 'motto --help' for details)
  ```
- Bad-path shape agreed verbatim: `✗ directory not found: ./nope`
- Build-elsewhere output: `✓ built ../proj/dist — 4 skills, 1 plugin(s)` (path as typed).

</specifics>

<deferred>
## Deferred Ideas

- **`--version` flag** — not in CLIX-03/04; would be new capability. Natural candidate for a future CLI-ergonomics pass (alongside CLIX-01 `--quiet`, CLIX-02 `--format json`).

</deferred>

---

*Phase: 11-CLI Ergonomics (--help, [path])*
*Context gathered: 2026-07-02*
