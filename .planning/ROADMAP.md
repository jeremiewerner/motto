# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.4 (2026-07-02)
**Active milestone:** None — run `/gsd-new-milestone`
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

## Phases

<details>
<summary>✅ v0.0.4 Project Bootstrap (Phases 10-13) — SHIPPED 2026-07-02</summary>

- [x] Phase 10: Project Scaffold (`motto init`) (3/3 plans) — completed 2026-07-02
- [x] Phase 11: CLI Ergonomics (--help, [path]) (1/1 plan) — completed 2026-07-02
- [x] Phase 12: Docs & Cleanup (3/3 plans) — completed 2026-07-02
- [x] Phase 13: Tech-Debt Closure (plugins.public reserved-word + init/CLI review items) (2/2 plans) — completed 2026-07-02

Full phase details: [milestones/v0.0.4-ROADMAP.md](milestones/v0.0.4-ROADMAP.md)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 10. Project Scaffold (`motto init`) | v0.0.4 | 3/3 | Complete | 2026-07-02 |
| 11. CLI Ergonomics (--help, [path]) | v0.0.4 | 1/1 | Complete | 2026-07-02 |
| 12. Docs & Cleanup | v0.0.4 | 3/3 | Complete | 2026-07-02 |
| 13. Tech-Debt Closure | v0.0.4 | 2/2 | Complete | 2026-07-02 |

## Backlog

Candidates for a future milestone (detail in `milestones/v0.0.3-REQUIREMENTS.md`, `milestones/v0.0.4-REQUIREMENTS.md` Future Requirements):

- CLI ergonomics: `--quiet` (errors-only for scripts/hooks), `--format json` (machine-readable lint results) — CLIX-01..02.
- `motto ship` command (SHIP-01) — deferred until real friction shows; scope unclear (after init + build, shipping is `git commit && git push`, and `marketplace.json` is already scaffolded by init). Needs clarification before any build.
- Template mechanism validation against a first concrete template (TMPL-01).
- `author-skill` reworked into an interactive skill-maker (purpose, dependencies, draft structure) — AUTH-SKILL.
- CI workflow (GitHub Actions) — remote exists (`jeremiewerner/motto`); husky-only today (CI-01).
- `--zip` build feature — dropped for v0.0.3 (marketplace + `~/.claude/skills/` cover Claude Desktop's Code tab; zip is a documented shell one-liner). Revisit only on real demand.
