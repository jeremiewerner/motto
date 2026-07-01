# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.2 (2026-07-01)
**Active milestone:** none — run `/gsd-new-milestone` to start the next
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Granularity:** Coarse

## Milestones

- [x] **v0.0.1** — Core lint + build CLI (Phases 1-3) — SHIPPED 2026-06-30 → [archive](milestones/v0.0.1-ROADMAP.md)
  - Pure validation core (`parseFrontmatter`, `validateSkill`, `loadConfig`); `motto lint`; `motto build`. 22 requirements, 53 tests.
- [x] **v0.0.2** — Self-Hosting / Dogfood (Phases 4-6) — SHIPPED 2026-07-01 → [archive](milestones/v0.0.2-ROADMAP.md)
  - Motto authors + validates its own `skills/` tree, permanent dogfood guard, full name/description strictness. 10 requirements, 75 tests. Hardened post-review (3 never-throw fixes).

## Backlog

Candidates for the next milestone (detail in `milestones/v0.0.2-REQUIREMENTS.md`):

- Distribution layer: Motto-as-plugin, global install, version pinning — depends on the open install-mechanism decision.
- A real `npm publish` flow (the `release` skill carries a stub until packaging is decided).
- CLI ergonomics: `--quiet`, `--format json`, `--zip` (CLIX-01..03).
- Optional `[path]` arg for `lint`/`build` (currently cwd-only).
- Template mechanism validation against a first concrete template (TMPL-01).
- CI workflow (GitHub Actions) — remote now exists (`jeremiewerner/motto`); husky-only this milestone.
