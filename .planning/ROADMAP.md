# Motto Roadmap

**Project:** Motto
**Version:** 1.0.0
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Granularity:** Coarse
**Total v1 Requirements:** 22

## Phases

- [x] **Phase 1: Pure Core** - Build the parsing, schema validation, and config loading foundation (no I/O dependencies) (completed 2026-06-30)
- [ ] **Phase 2: motto lint** - Compose discovery and validation into a working `motto lint` command
- [ ] **Phase 3: motto build** - Add build orchestration to produce self-contained plugin distributions via `motto build`

## Phase Details

### Phase 1: Pure Core

**Goal**: The parsing and validation foundation produces correct, deterministic results on all valid and malformed skill inputs.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PARSE-01, PARSE-02, PARSE-03, PARSE-04, LINT-01, LINT-02, LINT-03, LINT-04, LINT-05, CONF-01, CONF-02, CONF-03
**Success Criteria** (what must be TRUE):

  1. A well-formed SKILL.md returns the correct `{data, body}` split; a file missing the `---` block throws a clear "missing frontmatter" error
  2. A SKILL.md with CRLF line endings or a UTF-8 BOM parses identically to the same content written with LF and no BOM
  3. A YAML parse error in a skill's frontmatter surfaces as a named lint error — the skill is reported, never silently skipped or crashed
  4. A stray `---` embedded inside a frontmatter YAML block produces a clear lint error naming the affected skill
  5. `validateSkill` returns errors for any of: missing required fields; non-letter-start, non-kebab, or reserved-word (`anthropic`/`claude`) name; invalid audience value; missing `# Title` or `**Role:**` body spine; unresolved `shared_references` entry; and `loadConfig` rejects a `motto.yaml` missing `name`, `version`, `description`, or `plugins.public`, or using a non-letter-start plugin name

**Plans**: 3/3 plans complete

- [x] 01-01-PLAN.md — Scaffold (package.json + yaml) and parseFrontmatter (PARSE-01..04)
- [x] 01-02-PLAN.md — validateSkill skill-schema validator (LINT-01..05)
- [x] 01-03-PLAN.md — loadConfig core config validator (CONF-01..03)

### Phase 2: motto lint

**Goal**: Developers can run `motto lint` against a project and get a complete, deterministic error report or a clean exit.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: LINT-06, LINT-07, CLI-01
**Success Criteria** (what must be TRUE):

  1. `motto lint` exits 0 and prints `✓ N skills OK` when all skills in the project are valid
  2. `motto lint` exits 1 and prints one `✗ <skill>: <message>` line per error, collecting errors across all skills before reporting (does not stop at the first bad skill)
  3. Skills are always discovered and reported in alphabetical order regardless of filesystem ordering
  4. A single SKILL.md with malformed YAML frontmatter is reported as an error while all other skills continue to be linted normally

**Plans**: 1 plan

- [ ] 02-01-PLAN.md — lintProject orchestrator + motto CLI binary (LINT-06, LINT-07, CLI-01)

### Phase 3: motto build

**Goal**: Developers can run `motto build` to produce self-contained, distributable Claude Code plugin folders ready for installation.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, CLI-02
**Success Criteria** (what must be TRUE):

  1. `motto build` on a lint-passing project exits 0, reports the output directory, and places each skill verbatim at `dist/<audience>/<skill-name>/SKILL.md` (skills are siblings of `.claude-plugin/`, never nested inside it)
  2. Each declared `shared_references` entry is copied into `dist/<audience>/<skill-name>/references/<ref>.md`, making every skill's output folder self-contained
  3. Each audience bucket contains `dist/<audience>/.claude-plugin/plugin.json` with `name`, `version`, and `description` from `motto.yaml`; `version` is always present in the emitted JSON
  4. The private bucket is emitted only when at least one skill declares `audience: private` and `plugins.private` is set in `motto.yaml`; otherwise only `dist/public/` is written
  5. `motto build` on a lint-failing project exits 1, reports the same lint diagnostics as `motto lint`, and writes nothing to `dist/`

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pure Core | 3/3 | Complete   | 2026-06-30 |
| 2. motto lint | 0/? | Not started | - |
| 3. motto build | 0/? | Not started | - |
