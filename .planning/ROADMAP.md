# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.1 (2026-06-30)
**Active milestone:** v0.0.2 — Self-Hosting (Dogfood)
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Granularity:** Coarse

## Milestones

- [x] **v0.0.1** — Core lint + build CLI (Phases 1-3) — SHIPPED 2026-06-30 → [archive](milestones/v0.0.1-ROADMAP.md)
  - Pure validation core (`parseFrontmatter`, `validateSkill`, `loadConfig`); `motto lint`; `motto build` (self-contained plugin output). 22 requirements, 53 tests.
- [ ] **v0.0.2** — Self-Hosting / Dogfood (Phases 4-5) — IN PROGRESS
  - Motto authors and validates its own `skills/` tree, proving the shipped lint→build pipeline on real input with a permanent regression guard.

## Active Milestone: v0.0.2 — Self-Hosting (Dogfood)

Prove the v0.0.1 `motto lint` + `motto build` pipeline by having Motto author and validate its *own* skills tree (full schema surface: public + private buckets + a shared reference), fix any gaps real content surfaces, and wire a permanent dogfood regression guard into the test suite. Zero new dependencies.

### Phases

- [x] **Phase 4: Self-Hosted Skill Tree + Gap Fixes** - Author Motto's own skills tree, lint and build it clean, fix any surfaced schema/build gaps (completed 2026-06-30)
- [x] **Phase 5: Dogfood Regression Guard** - Wire a permanent dogfood test (lint in-place + build a temp copy) and close the NAME_KEBAB sync tech debt (completed 2026-06-30)

### Phase Details

#### Phase 4: Self-Hosted Skill Tree + Gap Fixes

**Goal**: Motto's own skills tree exists in the real source layout and passes the shipped lint + build pipeline clean.
**Mode**: mvp
**Depends on**: Phase 3 (v0.0.1 `motto lint` + `motto build` pipeline)
**Requirements**: SELF-01, SELF-02, SELF-03, SELF-04, SELF-05, DOG-01, DOG-02
**Success Criteria** (what must be TRUE):

  1. A root `motto.yaml` declares Motto's `name`, `version`, `description`, `plugins.public`, and `plugins.private`.
  2. Three skills exist in `skills/` — two public (`authoring-a-skill`, `motto-project-setup`) and one private (`motto-release`) — plus a shared reference `skill-schema` under `shared/references/`; no skill `name` contains the substring `claude` or `anthropic`.
  3. Running `motto lint` at the repo root exits 0 and prints `✓ N skills OK` with no errors.
  4. Running `motto build` produces `dist/public/` and `dist/private/`, each skill copied verbatim, the declared shared ref bundled into each skill's `references/`, and a per-bucket `.claude-plugin/plugin.json` carrying `version`.
  5. Any schema or build gap surfaced by the real content is fixed in `src/`, with the existing 53 tests still green and zero new dependencies added.

**Plans**: 1/1 plans complete

- [x] 04-01-PLAN.md — Author Motto's own skills tree (motto.yaml + shared ref + 3 skills), lint clean, build dist/, 53 tests green

#### Phase 5: Dogfood Regression Guard

**Goal**: A permanent automated test guards the self-hosted tree on every commit, and the NAME_KEBAB sync tech debt is closed.
**Mode**: mvp
**Depends on**: Phase 4
**Requirements**: DOG-03, DOG-04
**Success Criteria** (what must be TRUE):

  1. `test/dogfood.test.js` lints the repo root in-place (read-only, anchored via `import.meta.url` — not `process.cwd()`) and asserts clean lint with the expected skill count.
  2. The same test builds an isolated `mkdtemp` copy of `skills/` + `shared/` + `motto.yaml` (never the repo's own `dist/`) and asserts the expected `dist/` artifacts — public + private buckets, bundled shared ref, per-bucket `plugin.json`.
  3. A self-test asserts the `NAME_KEBAB` regex is identical between `src/schema.js` and `src/config.js`, failing if the two definitions ever drift.
  4. `npm test` passes green (54+ tests) and the husky pre-commit hook runs the dogfood test on every commit.

**Plans**: 1/1 plans complete

- [x] 05-01-PLAN.md — Wire test/dogfood.test.js (in-place lint + mkdtemp build guard) and export NAME_KEBAB to close DOG-04 drift debt

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 4. Self-Hosted Skill Tree + Gap Fixes | 1/1 | Complete   | 2026-06-30 |
| 5. Dogfood Regression Guard | 1/1 | Complete   | 2026-06-30 |

## Backlog

Carried from v0.0.1 (see `milestones/v0.0.1-REQUIREMENTS.md` for detail):

- CLI ergonomics: `--quiet`, `--format json`, `--zip` (CLIX-01..03)
- Template mechanism validation against a first concrete template (TMPL-01)
- Optional `[path]` arg for `lint`/`build` (currently cwd-only)
- Distribution layer (Motto-as-plugin, global install, version pinning) — depends on the open install-mechanism decision
- A real `npm publish` flow (the `motto-release` skill carries a stub until packaging is decided)
- Tech debt: populate `requirements_completed` in 2 v0.0.1 summaries; doc nits (yaml ISC license, Phase-1 SC#1 "throws" wording)
- Schema strictness gap: `validateSkill` does not enforce `description` max-1024 chars / no-XML-tags (CLAUDE.md spec says it should) — `src/schema.js`. Surfaced + deferred during v0.0.2 Phase 4 research; non-blocking (author clean short descriptions).

### Phase 6: Address tech debt: schema strictness + summary frontmatter

**Goal:** Make `validateSkill` fully conformant with the CLAUDE.md SKILL.md-frontmatter spec by enforcing `description` max-1024 chars, `description` no-XML-tags, and `name` max-64 chars (schema strictness only — summary-frontmatter + doc-nit buckets dropped as obsolete per D-01).
**Requirements**: Internal tech-debt closure (no formal requirement ID)
**Depends on:** Phase 5
**Plans:** 1/1 plans complete

Plans:

- [x] 06-01-PLAN.md — Add three strictness checks (name max-64, description max-1024, description no-XML) to validateSkill + tests B14–B19
