# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.4 (2026-07-02)
**Active milestone:** v0.0.5 Skill Builder (Phases 14-17)
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Granularity:** Coarse

## Milestones

- [x] **v0.0.1** — Core lint + build CLI (Phases 1-3) — SHIPPED 2026-06-30 → [archive](milestones/v0.0.1-ROADMAP.md)
  - Pure validation core (`parseFrontmatter`, `validateSkill`, `loadConfig`); `motto lint`; `motto build`. 22 requirements, 53 tests.
- [x] **v0.0.2** — Self-Hosting / Dogfood (Phases 4-6) — SHIPPED 2026-07-01 → [archive](milestones/v0.0.2-ROADMAP.md)
  - Motto authors + validates its own `skills/` tree, permanent dogfood guard, full name/description strictness. 10 requirements, 75 tests. Hardened post-review (3 never-throw fixes).
- [x] **v0.0.3** — Distribution (Phases 7-9) — SHIPPED 2026-07-01 → [archive](milestones/v0.0.3-ROADMAP.md)
  - Published `@jeremiewerner/motto` to npm, self-hosted Claude Code marketplace, wired the `release` skill's real publish flow, and a full-install-path README. 13 requirements, 75 tests.
- [x] **v0.0.4** — Project Bootstrap (Phases 10-13) — SHIPPED 2026-07-02 → [archive](milestones/v0.0.4-ROADMAP.md)
  - `motto init` scaffolds a complete, immediately-buildable skills project; `--help` + `[path]` CLI ergonomics; README ship-your-plugin flow; `setup-project` retired; 5 tech-debt items closed. 10 requirements, 131 tests.
- [ ] **v0.0.5** — Skill Builder (Phases 14-17) — IN PROGRESS
  - Template mechanism live (`template:` enforced, data-driven), new validated optional fields (`outputs:`/`dependencies:`/`allowed-tools`) with integrity guards, a `build-skill` Agent Skill that structures any input into a conforming skill, `author-skill` retired, and `skill-schema.md` brought current. 19 requirements.

## Phases

<details>
<summary>✅ v0.0.4 Project Bootstrap (Phases 10-13) — SHIPPED 2026-07-02</summary>

- [x] Phase 10: Project Scaffold (`motto init`) (3/3 plans) — completed 2026-07-02
- [x] Phase 11: CLI Ergonomics (--help, [path]) (1/1 plan) — completed 2026-07-02
- [x] Phase 12: Docs & Cleanup (3/3 plans) — completed 2026-07-02
- [x] Phase 13: Tech-Debt Closure (plugins.public reserved-word + init/CLI review items) (2/2 plans) — completed 2026-07-02

Full phase details: [milestones/v0.0.4-ROADMAP.md](milestones/v0.0.4-ROADMAP.md)

</details>

### 🚧 v0.0.5 Skill Builder (In Progress)

**Milestone Goal:** A user describes a procedure in any form and Motto structures it into a validated, conforming, distributable skill. Delivered by making the `template:` mechanism enforce real rules, adding validated optional fields with integrity guards, and shipping a `build-skill` Agent Skill that dogfoods the whole stack.

**Execution order** (research-locked — see `research/SUMMARY.md` "Implications for Roadmap"): template mechanism → field validators + integrity guards → build-skill + author-skill retirement → docs audit. `skill-schema.md` rewrite is scheduled LAST, after all schema-touching phases land.

- [ ] **Phase 14: Template Mechanism** - Data-driven `template:` field that lint enforces (`procedure` ships)
- [ ] **Phase 15: Field Validation & Integrity Guards** - Validate `outputs:`/`dependencies:`/`allowed-tools` with audience-direction, self-reference, and path-safety guards
- [ ] **Phase 16: build-skill & author-skill Retirement** - `build-skill` Agent Skill structures any input into a conforming skill; `author-skill` retired atomically
- [ ] **Phase 17: Docs Audit** - Rewrite `skill-schema.md` current and update README for build-skill

## Phase Details

### Phase 14: Template Mechanism

**Goal**: Authors can declare `template: <name>` on a skill and `motto lint` enforces that template's extra rules, driven entirely by pure data.
**Depends on**: Nothing (first phase of milestone; builds on shipped v0.0.4 core)
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05
**Success Criteria** (what must be TRUE):

  1. An author adds `template: procedure` to a skill and `motto lint` fails unless the body contains both `<process>` and `<success_criteria>` sections.
  2. A skill declaring an unknown template name fails lint with an error that lists the available templates.
  3. Section-tag matching ignores tags that appear inside fenced code blocks (no false positives).
  4. A skill with no `template:` field lints byte-for-byte identically to v0.0.4 (regression-guarded).
  5. Adding a new template requires only editing the `src/templates.js` data map — no linter/mechanism code change.

**Plans**: 2 plans
**Wave 1**

- [ ] 14-01-PLAN.md — Data-driven template mechanism: `src/templates.js` registry + `validateSkill` cascade + fence-aware `hasClosedSection` scanner + full test guard (TMPL-01..05)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 14-02-PLAN.md — Live dogfood: `release` skill adopts `template: procedure`; dogfood test proves enforcement + verbatim tag survival (TMPL-01, TMPL-03)

### Phase 15: Field Validation & Integrity Guards

**Goal**: The three new optional frontmatter fields (`outputs:`, `dependencies:`, `allowed-tools`) are validated with integrity guards, and every new validator is never-throw.
**Depends on**: Phase 14
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06
**Success Criteria** (what must be TRUE):

  1. `motto lint` rejects an `outputs:` entry whose file is missing, uses path traversal, is absolute, or escapes the skill dir via symlink.
  2. A bare-kebab `dependencies:` entry that names no existing skill fails lint; a namespaced `plugin:skill` entry is format-checked only.
  3. A public skill that depends on a private skill fails lint (audience-direction guard), and a skill that lists itself as a dependency fails (self-dependency guard).
  4. `allowed-tools` entries in real spec forms — including parenthesized patterns like `Bash(git add *)` — pass, while malformed forms fail.
  5. Every new validator returns accumulated errors without throwing, proven by adversarial malformed-input tests.

**Plans**: TBD
**Research flag**: `allowed-tools` format decision (STACK.md Q2 — Option A drop-whitespace-constraint vs Option B accept-parenthesized-pattern) must be resolved at phase discuss/plan.

### Phase 16: build-skill & author-skill Retirement

**Goal**: A user hands `build-skill` any input and receives a complete, lint-clean, conforming skill; `author-skill` is retired in the same atomic move.
**Depends on**: Phase 14, Phase 15
**Requirements**: BSKL-01, BSKL-02, BSKL-03, BSKL-04, BSKL-05, BSKL-06
**Success Criteria** (what must be TRUE):

  1. A user gives `build-skill` freeform input (text, doc, or conversation) and it asks only gap-filling questions before generating anything.
  2. `build-skill` produces a complete conforming `skills/<name>/` (SKILL.md + any output-template files) and self-verifies with `motto lint`, iterating until clean.
  3. `build-skill` itself declares `template: procedure` and passes the dogfood test (live E2E proof of the milestone).
  4. `build-skill`'s instructions enforce a content-quality self-review gate — no empty Role, no vacuous criteria, and the description states WHEN to trigger, not what the skill does.
  5. `author-skill` is removed atomically with `build-skill`'s arrival — dogfood skill count synced, main never red.

**Plans**: TBD
**Research flag**: build-skill prompt-engineering specifics (inherit from skill-creator / writing-skills — token-budget <500 words, flowcharts only for non-obvious decisions, no narrative one-off stories) to be gathered during phase planning.

### Phase 17: Docs Audit

**Goal**: `skill-schema.md` is rewritten to the current schema and the README reflects `build-skill` with no lingering `author-skill` references.
**Depends on**: Phase 14, Phase 15, Phase 16 (scheduled last so it documents the settled schema)
**Requirements**: DOC-06, DOC-07
**Success Criteria** (what must be TRUE):

  1. `skill-schema.md` carries a current version header and documents the `template`, `outputs`, `dependencies`, and `allowed-tools` fields.
  2. `build-skill`'s prose contains no duplicated lint strings or regexes — the schema is referenced (bundled shared ref), not inlined.
  3. The README removes all `author-skill` references and documents the `build-skill` flow.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 14 → 15 → 16 → 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 10. Project Scaffold (`motto init`) | v0.0.4 | 3/3 | Complete | 2026-07-02 |
| 11. CLI Ergonomics (--help, [path]) | v0.0.4 | 1/1 | Complete | 2026-07-02 |
| 12. Docs & Cleanup | v0.0.4 | 3/3 | Complete | 2026-07-02 |
| 13. Tech-Debt Closure | v0.0.4 | 2/2 | Complete | 2026-07-02 |
| 14. Template Mechanism | v0.0.5 | 0/2 | Not started | - |
| 15. Field Validation & Integrity Guards | v0.0.5 | 0/TBD | Not started | - |
| 16. build-skill & author-skill Retirement | v0.0.5 | 0/TBD | Not started | - |
| 17. Docs Audit | v0.0.5 | 0/TBD | Not started | - |

## Backlog

Candidates for a future milestone (detail in `REQUIREMENTS.md` Future Requirements + `milestones/v0.0.4-REQUIREMENTS.md`):

- CLI ergonomics: `--quiet` (errors-only for scripts/hooks), `--format json` (machine-readable lint results) — CLIX-01..02.
- `motto ship` command (SHIP-01) — deferred until real friction shows; after init + build, shipping is `git commit && git push`, and `marketplace.json` is already scaffolded by init.
- CI workflow (GitHub Actions) — remote exists (`jeremiewerner/motto`); husky-only today (CI-01).
- `--zip` build feature — dropped for v0.0.3 (marketplace + `~/.claude/skills/` cover Claude Desktop's Code tab). Revisit only on real demand.
- Deferred design-ledger items: action section tags (`<drill>`/`<run>`/`<mcp>`), skill-calls-skill with params, `{var}` interpolation engine, `template:` as array (multi-template), `agent` template, base-spine `**Role:**` → `<role>` registry migration.
