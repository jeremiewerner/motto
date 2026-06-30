# Phase 2: motto lint - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers a working **`motto lint` command** — the I/O and orchestration layer that wraps the Phase 1 pure core (`parseFrontmatter`, `validateSkill`, `loadConfig`) into a runnable CLI. Three concerns:

- **Discovery** — find skills and shared references on disk, deterministically.
- **Orchestration** — read each `SKILL.md` + `motto.yaml`, run the pure validators, aggregate all errors across all skills (per-file error-isolated).
- **CLI** — a `motto` binary with a `lint` subcommand that validates the current project and exits 0 (clean) / 1 (errors) with the locked output format.

Covers requirements **LINT-06, LINT-07, CLI-01**.

**Not in this phase:** `motto build` / packaging and the `dist/` writer (Phase 3, BUILD-01..06, CLI-02); any content transform; the v2 ergonomics flags (`--quiet`, `--format json`, `--zip`). The pure validation logic itself is done (Phase 1) — Phase 2 only adds the filesystem plumbing and the command surface around it.

</domain>

<decisions>
## Implementation Decisions

### Discovery & project root (LINT-07)
- **D2-01:** `motto lint` operates on the **current working directory** as the project root. No walk-up, no recursive `SKILL.md` search. The fixed source-tree contract from PROJECT.md is the law: `./skills/`, `./shared/`, `./motto.yaml` are all resolved relative to cwd.
- **D2-02:** A **skill = an immediate subdirectory of `./skills/`** (one level deep). For each such dir, the skill's file is `skills/<name>/SKILL.md` and the skill's expected `name` is the directory basename `<name>` (this is what `validateSkill`'s name-equals-folder check compares against — D-08/LINT-02).
- **D2-03:** Discovery is **sorted by skill (directory) name** before reading/reporting, so output order is deterministic regardless of filesystem `readdir` order (LINT-07, success criterion #3).
- **D2-04:** Inside `./skills/`, **dotfiles/dot-dirs (`.foo`) and plain files are ignored** — only non-hidden directories are candidate skills.

### Partial / malformed skill dirs (LINT-07 isolation)
- **D2-05:** A candidate skill directory **with no `SKILL.md` is a hard error** (`<dir>: missing SKILL.md`), contributing to exit 1. A half-built skill must never pass silently — strict schema is the product. There is **no warning channel**; lint output is errors-only plus the success line.
- **D2-06:** Per-file error isolation: a thrown/unexpected failure while reading or parsing one skill (e.g., unreadable file, malformed YAML) is **caught and converted into that skill's error entry** — the scan continues to all other skills (success criterion #4). The pure core is already never-throw (D-01); this catch is the backstop for I/O-level surprises.

### Shared references resolution (LINT-05 wiring)
- **D2-07:** Lint builds the `sharedRefs` set by **scanning `./shared/references/*.md`** and collecting their basenames (without extension). That Set is passed to `validateSkill(skill, sharedRefs)` so LINT-05 resolves each declared `shared_references` entry against real files on disk.
- **D2-08:** A **missing `shared/` or `shared/references/` directory is NOT itself an error** — it yields an **empty set**. Consequence: any skill that declares a `shared_references` entry then gets an "unresolved" error from `validateSkill`; a project that references nothing stays clean. (No top-level `shared/ not found` diagnostic.)

### Config (motto.yaml) in lint — wiring loadConfig to the filesystem
- **D2-09:** `motto lint` **reads and validates `./motto.yaml`** via the Phase 1 `loadConfig` core (this is the "file-read plumbing" Phase 1 deferred to Phase 2). A **missing or invalid `motto.yaml` is reported as an error**, not skipped.
- **D2-10:** Config errors are reported **first**, under the label **`motto.yaml: <message>`**, before the alphabetical skill errors. Config validation does **not** abort the run — skill scanning still happens and all errors are collected together (preserves LINT-06 "collect everything").

### Output & exit (LINT-06, CLI-01)
- **D2-11:** Locked output format (from ROADMAP success criteria — not re-litigated):
  - Clean: print `✓ N skills OK` and exit `0`.
  - Errors: print one `✗ <skill>: <message>` line per error, then exit `1`.
- **D2-12:** Within a single skill, multiple error lines appear in **`validateSkill` emission order** (name cascade → independent fields → shared_references). No re-sorting — the core's order is already deterministic and logically grouped.
- **D2-13:** **Zero skills found** (no `./skills/` dir, or it contains no candidate skill directories) is an **error**: `✗ no skills found` (or equivalent), exit `1`. A project with no skills is misconfigured, not vacuously clean.

### CLI surface (CLI-01)
- **D2-14:** Ship a **`motto` binary**: `package.json` `"bin": { "motto": "./bin/motto.js" }`, with a `#!/usr/bin/env node` shebang and the executable bit set. `bin/motto.js` is thin — parse the subcommand with `node:util parseArgs`, dispatch to the lint implementation, set `process.exitCode`.
- **D2-15:** `motto lint` is **cwd-only for v1** — no optional path argument. Matches CLI-01 "validates the current project." (An optional `[path]` arg is noted as a deferred ergonomic, see Deferred.)
- **D2-16:** Unknown subcommand / bad usage prints a short usage line and exits non-zero. (`build` subcommand is registered in Phase 3.)

### Claude's Discretion
- Module decomposition: whether discovery, shared-ref scanning, and orchestration live in one `src/lint.js` or split (e.g., `src/discover.js` + `src/lint.js`) is the planner's/executor's call, provided each piece stays pure-ish and testable without a real CLI invocation.
- Exact wording of the `no skills found`, `missing SKILL.md`, and usage strings, provided they stay greppable and name the offending path.
- Whether the lint core returns a structured result (`{ ok, errors[] }`) that `bin/motto.js` renders, vs. printing directly — strongly prefer the former (testable without spawning a process), but the shape is the planner's to fix.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope (execution authority)
- `.planning/REQUIREMENTS.md` — LINT-06, LINT-07, CLI-01 (Phase 2 scope); also LINT-01..05, CONF-01..03 for the validator contracts being wired. **The source of truth.**
- `.planning/ROADMAP.md` §"Phase 2: motto lint" — phase goal + the 4 success criteria (output format, exit codes, alphabetical ordering, per-file isolation).
- `.planning/PROJECT.md` — constraints (Node ≥20, ESM, `node --test`, single dep `yaml`), fixed source-tree layout (`skills/<name>/`, `shared/references/`, `dist/{public,private}/`), philosophy (YAGNI, mechanism over features).

### Phase 1 core being wired (the API this phase consumes)
- `.planning/phases/01-pure-core/01-CONTEXT.md` — D-01 (uniform never-throw `errors[]` model), D-08 (name-equals-folder, kebab regex), D-10 (shared_references safe-basename + resolve), D-13 (error aggregation order). The output of these functions is what Phase 2 orchestrates.
- `src/frontmatter.js` — `parseFrontmatter(text) → { data, body, errors[] }`.
- `src/schema.js` — `validateSkill(skill, sharedRefs) → errors[]`; exports `NAME_KEBAB`. `skill` is `{ name (folder), data, body }`-shaped; confirm exact param shape from the source before planning.
- `src/config.js` — `loadConfig(text) → { config, errors[] }`. Phase 2 supplies the file text.
- `.planning/phases/01-pure-core/01-*-SUMMARY.md` — what each function actually implemented.

### Reference only (NOT authority)
- `.planning/superpowers/specs/2026-06-29-motto-design.md` — design brief: source-tree shape, lint-first philosophy. Inspirational, not binding where it diverges from REQUIREMENTS.
- `.planning/superpowers/plans/2026-06-30-motto-core-cli.md` — 6-task TDD plan with prior-art CLI code; treat as a draft to correct (it diverged from REQUIREMENTS in ≥6 places per Phase 1 D-notes), not copy verbatim.

### Library / tooling
- `.claude/CLAUDE.md` §"CLI Entry Point Pattern" + §parseArgs — `node:util parseArgs` for the two-subcommand CLI (no `commander`); `fs.readdir({recursive:false})` for the shallow `skills/` scan (no `glob`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/frontmatter.js`, `src/schema.js`, `src/config.js` — the complete pure validation core. Phase 2 calls these; it does not re-implement any validation logic.
- `NAME_KEBAB` regex exported from `src/schema.js` — already the single source of truth for kebab names (config duplicates it with a cross-ref comment, D-16). No new regex needed in Phase 2.
- Husky `pre-commit` runs `npm test` (full `node --test` suite) — Phase 2 tests run on every commit; keep them fast and file-I/O light (use temp dirs / fixtures).

### Established Patterns
- **Never-throw `errors[]` model (D-01):** Phase 2's orchestrator follows the same shape — it collects `errors[]` from each validator rather than try/catch around pure calls. The only `try/catch` is the I/O backstop (D2-06).
- **Pure-first, thin shell:** Phase 1 kept logic in pure, parameterized functions. Phase 2 continues this — the lint core should be testable by passing in paths/fixtures, with `bin/motto.js` a thin renderer (D2-CLI discretion note).
- Tests are behavior tests in `test/*.test.js` using `node:test` + `node:assert`.

### Integration Points
- `bin/motto.js` (new) → lint core (new, e.g. `src/lint.js`) → Phase 1 validators.
- `package.json` gains a `"bin"` field; the existing `scripts.test` and husky setup stay untouched.

</code_context>

<specifics>
## Specific Ideas

- Lint should `scan shared/references/*.md` → basename Set → feed `validateSkill` (D2-07). This is the concrete mechanism by which LINT-05 ("resolves to `shared/references/<name>.md`") becomes real against the filesystem.
- Prefer a lint core that returns `{ ok: boolean, errors: Array<{ skill, message }> }` so tests assert on the structure and `bin/motto.js` owns only formatting + exit code.

</specifics>

<deferred>
## Deferred Ideas

- **Optional `[path]` argument** to `motto lint` (lint a subdir / run from elsewhere) — deferred; v1 is cwd-only (D2-15). Revisit if CI ergonomics demand it.
- **`--quiet` / `--format json`** lint flags — already v2 (REQUIREMENTS CLIX-01/02). Out of scope here.
- **Warning channel** (non-failing notices) — deliberately not introduced (D2-05); revisit only if a real "valid-but-suspect" case appears.
- **Top-level `shared/ not found` diagnostic** — considered and rejected (D2-08); absence yields an empty set instead.

</deferred>

---

*Phase: 2-motto-lint*
*Context gathered: 2026-06-30*
