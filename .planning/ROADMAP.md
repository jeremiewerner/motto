# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.1 (2026-06-30)
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Granularity:** Coarse

## Milestones

- [x] **v0.0.1** — Core lint + build CLI (Phases 1-3) — SHIPPED 2026-06-30 → [archive](milestones/v0.0.1-ROADMAP.md)
  - Pure validation core (`parseFrontmatter`, `validateSkill`, `loadConfig`); `motto lint`; `motto build` (self-contained plugin output). 22 requirements, 53 tests.

## Active Milestone

_None — run `/gsd-new-milestone` to start the next one._

## Backlog

Carried from v0.0.1 (see `milestones/v0.0.1-REQUIREMENTS.md` for detail):
- Dogfood: Motto authors its own `skills/` tree (tool not yet run on a real project)
- CLI ergonomics: `--quiet`, `--format json`, `--zip` (CLIX-01..03)
- Template mechanism validation against a first concrete template (TMPL-01)
- Optional `[path]` arg for `lint`/`build` (currently cwd-only)
- Distribution layer (Motto-as-plugin, global install, version pinning)
- Tech debt: `NAME_KEBAB` sync self-test; populate `requirements_completed` in summaries; doc nits (yaml ISC license, Phase-1 SC#1 "throws" wording)
