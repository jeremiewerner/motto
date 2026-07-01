# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.3 (2026-07-01)
**Active milestone:** none — start next with `/gsd-new-milestone`
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Granularity:** Coarse

## Milestones

- [x] **v0.0.1** — Core lint + build CLI (Phases 1-3) — SHIPPED 2026-06-30 → [archive](milestones/v0.0.1-ROADMAP.md)
  - Pure validation core (`parseFrontmatter`, `validateSkill`, `loadConfig`); `motto lint`; `motto build`. 22 requirements, 53 tests.
- [x] **v0.0.2** — Self-Hosting / Dogfood (Phases 4-6) — SHIPPED 2026-07-01 → [archive](milestones/v0.0.2-ROADMAP.md)
  - Motto authors + validates its own `skills/` tree, permanent dogfood guard, full name/description strictness. 10 requirements, 75 tests. Hardened post-review (3 never-throw fixes).
- [x] **v0.0.3** — Distribution (Phases 7-9) — SHIPPED 2026-07-01 → [archive](milestones/v0.0.3-ROADMAP.md)
  - Published `@jeremiewerner/motto` to npm, self-hosted Claude Code marketplace, wired the `release` skill's real publish flow, and a full-install-path README. 13 requirements, 75 tests.

## Backlog

Candidates for a future milestone (detail in `milestones/v0.0.3-REQUIREMENTS.md`):

- CLI ergonomics: `--quiet`, `--format json` (CLIX-01..02).
- Optional `[path]` arg for `lint`/`build` (currently cwd-only).
- Template mechanism validation against a first concrete template (TMPL-01).
- CI workflow (GitHub Actions) — remote exists (`jeremiewerner/motto`); husky-only today.
- `/gsd-cleanup` the archived v0.0.2 phase dirs (`04/05/06`) still under `.planning/phases/`.
- Revisit `setup-project` + `author-skill` instructional skills (docs-as-skills — keep vs fold into README).
- `--zip` build feature — dropped for v0.0.3 (marketplace + `~/.claude/skills/` cover Claude Desktop's Code tab; zip is a documented shell one-liner). Revisit only on real demand.
