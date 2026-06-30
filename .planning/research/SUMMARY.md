# Project Research Summary

**Project:** Motto
**Domain:** Node.js CLI linter + static packager for Claude Code Agent Skills
**Researched:** 2026-06-30
**Confidence:** MEDIUM-HIGH

## Executive Summary

Motto is a small, well-specified internal tool — a lint-then-build CLI that validates structured SKILL.md files against a strict schema and packages them into standard Claude Code Agent Skills distributions. A complete design spec and 6-task TDD implementation plan already exist in the repo (`.planning/superpowers/specs/2026-06-29-motto-design.md`, `.planning/superpowers/plans/2026-06-30-motto-core-cli.md`). Research confirms the chosen stack (Node ≥ 20, plain ESM, `yaml` npm package, `node:test`, zero other dependencies) is correct and requires no changes. The architecture should follow the Functional Core / Imperative Shell pattern: pure modules (`frontmatter.js`, `schema.js`) own all transformation logic; IO-shell modules (`config.js`, `discover.js`) own filesystem access; orchestration modules (`lint.js`, `build.js`) compose them.

The primary risks are not architectural — they are text-processing edge cases consistently under-specified in linter implementations that have caused real production failures in analogous tools. Four are critical and must be addressed in Task 1: CRLF line endings, UTF-8 BOM, `---` inside multiline YAML block scalars, and YAML parse errors that must surface as lint failures (never silent skill drops). Two further constraints flow from the Claude Code plugin spec: plugin/skill names must match `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` (letter start, not digit start), and `shared_references` entries must be validated as safe basenames (no `/` or `.`) to prevent path-traversal. `plugin.json` must always emit `version`; omitting it causes Claude Code to fall back to a git SHA of the dist directory, which breaks packaged distributions.

The scope is deliberately minimal and not reducible for v1. All features in the existing plan are table stakes. Research adds pitfall-prevention success criteria to specific tasks, not new work items.

## Key Findings

### Recommended Stack

The project's chosen stack is validated and correct. No changes recommended.

**Core technologies:**
- **Node.js ≥ 20**: First LTS with stable `node:test`, stable `parseArgs`, native ESM
- **`yaml` v2.9.0**: Only runtime dependency; YAML 1.2 core schema (no `yes`/`no` boolean surprises); `parseDocument()` accumulates errors in `doc.errors[]` — ideal for a collect-all-errors linter
- **`node:test` (stdlib)**: Zero-config test runner for ESM; `describe`/`it`/`mock`/`beforeEach` all present
- **`node:util parseArgs`**: Replaces `commander` for a two-subcommand CLI
- **`node:fs/promises` + `node:path`**: Cover all file I/O without `glob`, `mkdirp`, or `rimraf`

**Avoid:** `js-yaml` (YAML 1.1 schema), `gray-matter` (wraps js-yaml), `commander`/`yargs`, `zod`/`ajv`, `glob`/`fast-glob`, `chalk`, TypeScript, Jest/Vitest.

### Expected Features

**Must have (v1 — all already scoped):**
- Exit codes 0 / 1 / 2; collect-all-errors before reporting; error messages name skill + field
- Frontmatter validation: `name`, `description`, `audience`, `shared_references`; `name` = kebab = folder; `audience` binary
- Body spine: `# Title` + `**Role:**` mandatory; `shared_references` file-existence resolution at lint time
- Lint-first build (throws immediately on failure, writes nothing); wipe dist before emit
- Verbatim skill copy; shared refs bundled into each skill's `references/` in dist
- `plugin.json` from `motto.yaml` fields; per-project plugin naming

**Defer to v1.x:** `--quiet`, `--format json`, template validation (wait for first concrete template), `--zip`

**Never:** `--fix`, watch mode, per-directory config, multiple config formats, STDIN, content transform

### Architecture Approach

6 modules in 3 dependency levels. Pure modules never import `node:fs`. The CLI entry does exactly: parse argv → call lint/build → format output → exit.

**Major components:**
1. `frontmatter.js` (Pure) — parse + normalize CRLF/BOM; surface YAML parse errors
2. `schema.js` (Pure) — validate `{dirName, data, body}` → `errors[]`; never throw
3. `config.js` (IO) — read and validate `motto.yaml`; strict plugin name regex; require `version`
4. `discover.js` (IO) — walk skills tree; sort by `dirName`; per-file try/catch
5. `lint.js` (Orchestration) — compose discovery + per-skill validation
6. `build.js` (Orchestration + IO) — lint-guard, wipe dist, copy with `verbatimSymlinks:true`, write `plugin.json`

### Critical Pitfalls

1. **CRLF breaks frontmatter regex** — `normalizeText` must strip `\r\n` → `\n` before any regex or YAML parse. Test with CRLF fixture. (Task 1)
2. **UTF-8 BOM breaks frontmatter regex** — combine BOM strip (`\xEF\xBB\xBF`) into `normalizeText`. (Task 1)
3. **`---` inside multiline YAML block scalar poisons closing-fence detection** — detect `\n---` in the extracted YAML string and emit a clear lint error rather than silently misparsing. (Task 1 or 3)
4. **YAML parse errors must surface as lint errors, never silent skill drops** — `discoverSkills` per-file try/catch; `parseFrontmatter` re-throws with original `e.message`. (Tasks 1 + 4)
5. **Plugin/skill name must start with a letter** — Claude Code requires `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`; use this in both `loadConfig` and `schema.js`. (Tasks 2 + 3)
6. **`shared_references` entries must be safe basenames** — validate against `/^[a-z0-9][a-z0-9-]*$/` (no `/`, no `.`). (Task 3)
7. **`plugin.json` must always emit `version`** — require `version` in `motto.yaml`; always propagate to `plugin.json`. (Tasks 2 + 6)
8. **`sort()` in `discoverSkills`** — `skills.sort((a, b) => a.dirName.localeCompare(b.dirName))` for deterministic output. (Task 4)
9. **`cpSync` with `verbatimSymlinks: true`** — prevents symlinks from copying outside-project content into dist. (Task 6)
10. **`name` must not contain `"anthropic"` or `"claude"`** — Claude Code rejects these substrings in skill names. (Task 3)

## Implications for Roadmap

The existing 6-task TDD plan is the correct structure. Research adds success criteria to tasks, not new tasks.

### Phase 1: Pure Core (Tasks 1–3)
**Rationale:** No I/O dependencies; maximally testable; everything else depends on them.
**Delivers:** `frontmatter.js`, `schema.js`, `config.js`
**Research additions:** normalizeText (CRLF + BOM), `---`-in-block-scalar detection, letter-start name regex, `shared_references` basename safety regex, `name` cannot contain `"anthropic"`/`"claude"`, `version` required in `motto.yaml`

### Phase 2: IO Shell (Task 4)
**Rationale:** Depends on `frontmatter.js`; produces data structures for orchestration.
**Delivers:** `discover.js`
**Research additions:** Per-file try/catch (no silent drops), `sort()` for deterministic output

### Phase 3: Orchestration + CLI (Tasks 5–6)
**Rationale:** Composes all lower levels; completes the system.
**Delivers:** `lint.js`, `build.js`, `bin/motto.js`
**Research additions:** `cpSync({ verbatimSymlinks: true })`, `plugin.json` always includes `version`, build test asserts correct dist structure (SKILL.md at `dist/public/<name>/SKILL.md`, not inside `.claude-plugin/`), `err.lint = result; throw err` for full error propagation

### Research Flags

**All phases: standard patterns — no research-phase runs needed.** The design spec and implementation plan are authoritative. No ambiguity requires deeper research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Node.js docs + npm registry confirmed |
| Features | HIGH | Design spec + implementation plan are complete and authoritative |
| Architecture | HIGH | Derived directly from existing TDD plan; well-documented pattern |
| Pitfalls | MEDIUM | CRLF/BOM/YAML edge cases confirmed by real GitHub issues; Claude Code name regex confirmed from official docs |

**Overall confidence:** HIGH

### Gaps to Address

- **`---` in multiline YAML**: Recommend Option A (detect + error loudly). Exact error message and test fixture to be settled in Task 1. A prose-only constraint ("do not use `|` block scalars in frontmatter") may be simpler than runtime detection.
- **Claude Code plugin name regex**: Confirmed from official docs but documented in prose, not a formal spec. If Claude Code updates validation, `loadConfig` needs to match.
- **Audience-based dist routing**: Directory layout defined in design spec but not tested against a live Claude Code install. Run `claude plugin validate` against `dist/` output as a post-build check.

## Sources

### Primary (HIGH confidence)
- `.planning/superpowers/specs/2026-06-29-motto-design.md` — authoritative design spec
- `.planning/superpowers/plans/2026-06-30-motto-core-cli.md` — authoritative TDD implementation plan
- `nodejs.org/api/` — `parseArgs`, `node:test`, `fs.cpSync`, `fs.readdir` docs
- `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview` — SKILL.md frontmatter spec
- `code.claude.com/docs/en/plugins-reference` — `plugin.json` schema, plugin directory layout, version behavior
- `eemeli.org/yaml/` + `registry.npmjs.org/yaml/latest` — yaml@2.9.0 API and version confirmed

### Secondary (MEDIUM confidence)
- Codex issue #13918 — UTF-8 BOM causes "missing YAML frontmatter" in skill loaders
- autoresearch issue #69 — unquoted colon-space in YAML description field
- markdownlint issue #153 — `---` in frontmatter regex fencing
- Node.js issue #3232 — `fs.readdir` order is platform-dependent
- OpenClaw issue #22134 — silent skill drop on YAML parse error

---
*Research completed: 2026-06-30*
*Ready for roadmap: yes*
