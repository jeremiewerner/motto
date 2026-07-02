# Phase 11: CLI Ergonomics (--help, [path]) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 11-CLI Ergonomics (--help, [path])
**Areas discussed:** Help text depth, Bare `motto` behavior, [path] error handling, Help trigger surface

---

## Help text depth

| Option | Description | Selected |
|--------|-------------|----------|
| Compact | Usage line + one line per subcommand + flags (~10 lines), constant string | ✓ |
| Rich | Adds examples section + docs link (~25 lines) | |
| Minimal | Synopsis + flag list only | |

**User's choice:** Compact (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Focused block | Per-subcommand help = usage + short description + that command's flags only | ✓ |
| Same as global | All --help paths print the one global text | |

**User's choice:** Focused block (recommended)
**Notes:** Agreed shapes captured verbatim in CONTEXT.md D-01/D-02.

---

## Bare `motto` behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Full help, exit 0 | Bare `motto` prints compact help to stdout, exit 0 | ✓ |
| Keep as error | Usage to stderr, exit 1 (today's behavior) | |
| Help text, exit 1 | Full help to stderr with exit 1 | |

**User's choice:** Full help, exit 0 (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Error + hint | `✗ unknown command 'foo'` + usage + `(run 'motto --help' for details)`, stderr, exit 1 | ✓ |
| Keep bare usage | Just the usage line, no offender named | |
| Full help, exit 1 | Dump entire help on unknown command | |

**User's choice:** Error + hint (recommended)
**Notes:** Unknown flags mirror the same shape (D-05).

---

## [path] error handling

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated check | Pre-dispatch dir-exists check: `✗ directory not found: ./nope` | ✓ |
| Let lint report it | Pass through; lintProject blames missing motto.yaml | |

**User's choice:** Dedicated check (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| As typed + relative | `✓ built ../proj/dist — …` (path as user typed) | ✓ |
| Absolute paths | Resolve and print full absolute path | |

**User's choice:** As typed + relative (recommended)

---

## Help trigger surface

| Option | Description | Selected |
|--------|-------------|----------|
| Flags only | `-h`/`--help` only; no `motto help` subcommand (YAGNI) | ✓ |
| Also `motto help` | git/npm-style help subcommand alias | |

**User's choice:** Flags only (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Global help | `motto --help lint` → global help; subcommand help only via `motto lint --help` | ✓ |
| Context-aware | Any --help anywhere scans positionals for a known subcommand | |
| You decide | Claude picks during planning | |

**User's choice:** Global help (recommended)
**Notes:** Implementation subtlety flagged: parseArgs output identical for both orderings — needs raw argv order check.

## Claude's Discretion

- Help string location (constants in bin/motto.js vs src/help.js)
- Exact description wording within agreed shapes
- Path-is-a-file / trailing-slash normalization (same ✗ style)
- `init` per-subcommand help block (should follow D-02 pattern)

## Deferred Ideas

- `--version` flag — not in CLIX-03/04; future CLI-ergonomics pass alongside CLIX-01/02
