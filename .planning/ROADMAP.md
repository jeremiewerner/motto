# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.3 (2026-07-01)
**Active milestone:** v0.0.4 — Project Bootstrap (Phases 10-12)
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Granularity:** Coarse

## Milestones

- [x] **v0.0.1** — Core lint + build CLI (Phases 1-3) — SHIPPED 2026-06-30 → [archive](milestones/v0.0.1-ROADMAP.md)
  - Pure validation core (`parseFrontmatter`, `validateSkill`, `loadConfig`); `motto lint`; `motto build`. 22 requirements, 53 tests.
- [x] **v0.0.2** — Self-Hosting / Dogfood (Phases 4-6) — SHIPPED 2026-07-01 → [archive](milestones/v0.0.2-ROADMAP.md)
  - Motto authors + validates its own `skills/` tree, permanent dogfood guard, full name/description strictness. 10 requirements, 75 tests. Hardened post-review (3 never-throw fixes).
- [x] **v0.0.3** — Distribution (Phases 7-9) — SHIPPED 2026-07-01 → [archive](milestones/v0.0.3-ROADMAP.md)
  - Published `@jeremiewerner/motto` to npm, self-hosted Claude Code marketplace, wired the `release` skill's real publish flow, and a full-install-path README. 13 requirements, 75 tests.
- [ ] **v0.0.4** — Project Bootstrap (Phases 10-12) — IN PROGRESS
  - `motto init` scaffolds a complete, immediately-buildable skills project; `--help` + `[path]` CLI ergonomics; README ship-your-plugin flow; `setup-project` retired. 10 requirements.

## Phases

- [x] **Phase 10: Project Scaffold (`motto init`)** - Scaffold a complete, immediately-buildable skills project in one command (completed 2026-07-02)
- [x] **Phase 11: CLI Ergonomics (--help, [path])** - Usage text on demand and lint/build against any directory (completed 2026-07-02)
- [ ] **Phase 12: Docs & Cleanup** - Document the ship-your-plugin path and retire the superseded `setup-project` skill

## Phase Details

### Phase 10: Project Scaffold (`motto init`)

**Goal**: A stranger with only `npm i -g @jeremiewerner/motto` can run one command and get a complete skills project that lints and builds with zero edits.
**Depends on**: Nothing (extends the shipped v0.0.3 lint/build CLI)
**Requirements**: INIT-01, INIT-02, INIT-03, INIT-04, INIT-05, INIT-06
**Success Criteria** (what must be TRUE):

  1. Running `motto init [name]` in an empty directory produces `skills/` (with a starter example skill), `shared/references/`, `motto.yaml`, `.gitignore`, and `.claude-plugin/marketplace.json` — with `[name]` filling `motto.yaml` fields and defaulting to the cwd basename
  2. The scaffolded starter skill passes `motto lint` and `motto build` with zero edits, guarded by a permanent scaffold-dogfood test that runs init → lint → build on every commit
  3. `motto init` refuses to scaffold into a non-empty directory and reports why; `--force` overrides the guard
  4. An invalid project name is rejected by `motto init` using the exact rule `motto lint` enforces (single source: `schema.js`) — no name that init accepts is later rejected by lint
  5. The scaffolded `.gitignore` ignores `dist/private/` while keeping `dist/public/` tracked, and the `marketplace.json` plugin name matches `motto.yaml` by construction (relative source pointing at `dist/public/`, owner from git config with a placeholder fallback)

**Plans**: 3/3 plans complete
**Wave 1**

- [x] 10-01-PLAN.md — src/init.js scaffoldProject (guards, name validation, inline templates) + bin/motto.js init subcommand

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-02-PLAN.md — test/init.test.js unit coverage + test/init-dogfood.test.js permanent init→lint→build guard

**Gap closure** *(from 10-VERIFICATION.md — Truth #7 / REVIEW.md WR-01)*

- [x] 10-03-PLAN.md — restore scaffoldProject never-throw contract (try/catch STEP 2 + STEP 4) + adversarial regression tests

**UI hint**: no

### Phase 11: CLI Ergonomics (--help, [path])

**Goal**: Users can discover Motto's usage without reading source and can lint or build a project that isn't the current directory.
**Depends on**: Nothing (independent of scaffold; sequenced after Phase 10)
**Requirements**: CLIX-03, CLIX-04
**Success Criteria** (what must be TRUE):

  1. `motto --help` and `motto -h` print usage text to stdout and exit 0
  2. `motto <subcommand> --help` (e.g. `motto lint --help`) prints that subcommand's usage instead of running the subcommand
  3. `motto lint [path]` and `motto build [path]` operate on the given directory, defaulting to the current working directory when the path is omitted

**Plans**: 1/1 plans complete

**Wave 1**

- [x] 11-01-PLAN.md — bin/motto.js --help/-h + per-subcommand help + [path] wiring + directory guard (CLIX-03/04); new test/cli.test.js spawn-based coverage

**UI hint**: no

### Phase 12: Docs & Cleanup

**Goal**: The README documents the full ship-your-plugin path built around `motto init`, and the now-superseded `setup-project` instructional skill is removed without ever leaving main red.
**Depends on**: Phase 10 (README describes `motto init` output; the ship flow relies on the scaffolded `marketplace.json`)
**Requirements**: DOC-04, DOC-05
**Success Criteria** (what must be TRUE):

  1. The README documents the end-to-end ship-your-plugin flow: commit `dist/public/`, push the repo public, and the consumer's `/plugin marketplace add` one-liner
  2. The README scaffold section is rewritten around `motto init` (no manual tree instructions)
  3. `skills/setup-project/` is deleted in the same commit that updates the dogfood-test count, so `main` never goes red

**Plans**: TBD
**UI hint**: no

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Project Scaffold (`motto init`) | 3/3 | Complete    | 2026-07-02 |
| 11. CLI Ergonomics (--help, [path]) | 1/1 | Complete    | 2026-07-02 |
| 12. Docs & Cleanup | 0/? | Not started | - |

## Backlog

Candidates for a future milestone (detail in `milestones/v0.0.3-REQUIREMENTS.md` and `REQUIREMENTS.md` Future Requirements):

- CLI ergonomics: `--quiet` (errors-only for scripts/hooks), `--format json` (machine-readable lint results) — CLIX-01..02.
- `motto ship` command (SHIP-01) — deferred until real friction shows; scope unclear (after init + build, shipping is `git commit && git push`, and `marketplace.json` is already scaffolded by init). Needs clarification before any build.
- Template mechanism validation against a first concrete template (TMPL-01).
- `author-skill` reworked into an interactive skill-maker (purpose, dependencies, draft structure) — AUTH-SKILL.
- CI workflow (GitHub Actions) — remote exists (`jeremiewerner/motto`); husky-only today (CI-01).
- `--zip` build feature — dropped for v0.0.3 (marketplace + `~/.claude/skills/` cover Claude Desktop's Code tab; zip is a documented shell one-liner). Revisit only on real demand.
