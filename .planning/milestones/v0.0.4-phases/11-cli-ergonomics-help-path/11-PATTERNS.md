# Phase 11: CLI Ergonomics (--help, [path]) - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 2 (1 modified, 1 new test file)
**Analogs found:** 2 / 2 (self-referential — the modified file is its own closest analog; no other CLI file exists in the codebase)

## Context

This is a single-file-CLI codebase: `bin/motto.js` is the entire CLI surface (79 lines pre-phase, parseArgs + dispatch + inline output). There is no `src/help.js`, no router/controller layer, and no other CLI entrypoint to draw analogs from. The "closest analog" for every change in this phase is `bin/motto.js` itself — the phase extends its own established conventions rather than importing a pattern from elsewhere. `src/lint.js` and `src/build.js` are wiring-only touch points (already accept `projectRoot`, no changes needed to their internals).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `bin/motto.js` (modified) | CLI entrypoint / controller | request-response (argv in, stdout/stderr + exit code out) | `bin/motto.js` (itself, pre-phase version) | exact (self) |
| `test/cli.test.js` (new, likely) | test | request-response (spawn/assert stdout+exitCode) | `test/init-dogfood.test.js` (spawns CLI-adjacent flows against temp dirs) | role-match |

No new `src/` module is required per CONTEXT.md discretion notes (help strings may live inline in `bin/motto.js` or optionally `src/help.js` — planner's call; no existing precedent for the latter so default to inline constants unless file grows unwieldy).

## Pattern Assignments

### `bin/motto.js` (CLI entrypoint, modified in place)

**Analog:** itself — extend existing structure, don't replace it.

**1. Header comment convention** (lines 1-22): Update the doc comment to describe the new help/exit-code/path behaviors. Keep the same style: a short prose block citing decision IDs (`D2-11`, `D-01` etc.) next to each behavior, and the exit-code/never-`process.exit(1)` rule spelled out explicitly. This phase's D-01 through D-09 IDs should be woven into this same comment block.

**2. parseArgs options block — add `help`** (lines 33-40):
```javascript
parsed = parseArgs({
  args: process.argv.slice(2),
  options: {
    force: { type: 'boolean' },
  },
  allowPositionals: true,
  strict: true,
});
```
Add `help: { type: 'boolean', short: 'h' }` to `options`. This is the exact mechanism CONTEXT.md's "Reusable Assets" section calls out — no new pattern needed, just one more key in the existing object literal.

**3. Strict-mode catch block — unknown flag handling** (lines 41-46):
```javascript
} catch {
  // Unknown flag (strict:true) — print usage and exit (Pitfall 4, D2-16)
  process.stderr.write('usage: motto <init|lint|build>\n');
  process.exitCode = 1;
  process.exit(); // exits with exitCode 1; safe: all output written before this call
}
```
This is the exact shape D-05 asks to mirror: name the offending flag (parseArgs doesn't give you the flag name in strict mode's thrown error directly — inspect `err.message` or reparse leniently to extract it), same stderr + `usage:` line + exit(no-arg) pattern. D-04's `(run 'motto --help' for details)` hint should be appended here too, since D-05 says "mirrors D-04's shape."

**4. Dispatch if/else chain — subcommand branches** (lines 54-114): Each branch (`init`, `lint`, `build`, else) follows the same shape: destructure/import, call the `src/` function with `process.cwd()`, branch on `result.ok`, write `✓`/`✗` lines. For this phase:
- `lint` branch (lines 84-94) and `build` branch (lines 95-109) each need `positionals[1] ?? process.cwd()` swapped in for the current hardcoded `process.cwd()` call — this is the CLIX-04 `[path]` wiring. Path stays as-typed for `result.outDir`/output construction (D-07) — do NOT resolve to absolute before interpolating into `✓ built …` messages.
- The trailing `else` branch (lines 110-114, today's "unknown subcommand or no subcommand") must SPLIT into two cases per D-03/D-04: no subcommand (`sub === undefined`) → full compact help to STDOUT exit 0; unknown subcommand (`sub` truthy but unmatched) → `✗ unknown command '<sub>'` + usage + hint, STDERR, exit 1. This is the biggest structural change — the current single `else` becomes two distinct branches.
- Each of `init`/`lint`/`build` branches needs a per-subcommand `--help` early-return check before doing any work (D-02, D-09) — check `parsed.values.help` AND that `--help`/`-h` appeared after the subcommand token in raw `process.argv` (D-09 requires inspecting `process.argv` order directly, since parseArgs flattens position).

**5. Output style — `✓`/`✗` conventions** (throughout, e.g. lines 61, 67, 75, 88, 91, 101-103, 106): New `✗ directory not found: <path>` (D-06) and `✗ unknown command '<foo>'` (D-04) messages must match the exact existing style: `✗ <subject>: <message>` with no trailing punctuation beyond the message itself, one line per error, written via `process.stdout.write`/`process.stderr.write` (never `console.log`, which the file avoids entirely).

**6. Exit-code convention** (lines 18-21, and every `process.exitCode = N` site): New help-output paths use `process.exitCode = 0` (or leave unset, since 0 is default) — critically, help-to-stdout is the ONE case in this phase that changes from the old "no subcommand → stderr usage, exit 1" (D-03 explicitly flips this). All other new error paths (`directory not found`, `unknown command`, unknown flag) follow the existing `process.exitCode = 1` + no `process.exit(1)` rule; the only permitted `process.exit()` (no-arg) call remains the one already in the parseArgs catch block — do not add new no-arg exits elsewhere, per the existing comment's framing this as "the one exception."

---

### `test/cli.test.js` (new)

**Analog:** `test/init-dogfood.test.js` — closest existing test for CLI-adjacent behavior spawning against temp directories.

Read this file's setup pattern (temp dir creation via `node:fs/promises` + `node:os.tmpdir()`, and assertions on returned result shape) and adapt it to spawn `bin/motto.js` as a child process (needed here since this phase tests actual stdout/stderr/exit-code behavior, not just calling exported functions directly like `init.test.js`/`lint.test.js`/`build.test.js` do). Use `node:child_process` `execFile` or `spawnSync` against `bin/motto.js` since the never-throw invariant doesn't cover the CLI's own argv-parsing branches (this phase's whole surface is CLI-only, not `src/`-importable).

**Coverage checklist implied by CONTEXT.md "Integration Points":**
- `motto --help` / `motto -h` → stdout, exit 0, contains all 3 command names
- `motto lint --help` → stdout, exit 0, does NOT execute lint (assert no side effects / doesn't read a motto.yaml)
- `motto --help lint` (D-09: flag before subcommand) → global help, not lint's focused help
- `motto lint /tmp/some-temp-dir` → operates on that dir, not cwd
- `motto lint /nonexistent/path` → `✗ directory not found: /nonexistent/path`, exit 1
- `motto foo` (unknown command) → `✗ unknown command 'foo'` + usage + hint, stderr, exit 1
- `motto --bogus-flag` (unknown flag) → mirrors unknown-command shape, stderr, exit 1
- bare `motto` → full compact help, stdout, exit 0 (regression check against D-03's old behavior)

## Shared Patterns

### Exit-code discipline
**Source:** `bin/motto.js` lines 18-21 (doc comment) + every `process.exitCode =` assignment in the file
**Apply to:** All new/modified branches in this phase
```javascript
// Exit codes: always set via process.exitCode (never process.exit(1)) to
// avoid truncating buffered stdout (Pitfall 7). The only exception is
// process.exit() (no arg) in the parseArgs catch block, which is safe because
// we have already written all output to stderr before calling it.
```

### stdout/stderr split + `✓`/`✗` message shape
**Source:** `bin/motto.js` lines 60-113 (all branches)
**Apply to:** All new help/error output added in this phase
- Success and lint/build error listings → stdout (existing convention, even for errors — see lines 88-93/104-108 which write `✗` lines to STDOUT, not stderr)
- Usage-only errors (bad flag, unknown subcommand) → stderr (lines 43, 112) — this convention holds for D-04/D-05's new unknown-command/unknown-flag messages
- NEW in this phase: help output (flag-triggered or bare-invocation) → STDOUT regardless of trigger, per D-03/CLIX-03 — this is a deliberate divergence from the "usage/errors go to stderr" rule that must be called out explicitly in the phase's plan, since it inverts today's bare-invocation behavior

### `projectRoot` parameterization (no change needed, just wiring)
**Source:** `src/lint.js` line 183 `export async function lintProject(projectRoot)`, `src/build.js` line 89 `export async function buildProject(projectRoot)`
**Apply to:** `lint`/`build` dispatch branches in `bin/motto.js`
Both functions already accept an arbitrary root; CLIX-04 is pure CLI wiring — resolve `parsed.positionals[1] ?? process.cwd()` and pass it through unchanged. No `src/` edits required for `[path]` support itself (only the pre-dispatch `✗ directory not found` existence check in D-06 is new CLI-side logic).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Global help text constant | data/config (string) | n/a | No existing help/usage-text constant beyond the single-line `'usage: motto <init|lint|build>'` string reused at lines 43/112 — this phase is the first to need multi-line structured help text. Use CONTEXT.md's D-01/D-02 verbatim shapes as the literal spec instead of a codebase analog. |
| `src/help.js` (if planner chooses to extract) | utility | transform | No precedent for splitting `bin/motto.js` logic into a `src/` helper module; CONTEXT.md leaves this to planner discretion. Default to inline unless the help-text logic (D-09's argv-order check especially) gets unwieldy inside `bin/motto.js`. |

## Metadata

**Analog search scope:** `bin/`, `src/`, `test/` (entire repo excluding `node_modules`)
**Files scanned:** 8 source files (`bin/motto.js`, `src/*.js` x6), 8 test files
**Pattern extraction date:** 2026-07-02
</content>
