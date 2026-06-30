# Motto

## What This Is

Motto is a framework for **authoring, validating, and packaging Claude Code Agent Skills**. You author skills in a structured source tree (`skills/` + `shared/`), Motto enforces a strict schema, and `motto build` packages them into self-contained, distributable plugins named after *your* project. The output is plain, standard Agent Skills — any agent loads them with no knowledge of Motto.

## Core Value

The **strict schema + linter**. Skills that always conform to one rigid-yet-creative structure, validated before they ship. The rigor is the product; the build is plumbing.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] `motto lint` enforces the skill schema: frontmatter fields, kebab `name` = folder, Title + Role spine, `shared_references` resolve
- [ ] `motto build` produces self-contained `dist/` plugins (public + optional private), named per project, with shared refs bundled in
- [ ] `motto.yaml` carries project identity (name/version/description), plugin names, and preferences
- [ ] Single shared scope (`shared/references/`) bundled into each skill at build
- [ ] Universal body spine: `# Title` + `**Role:**`, mandatory, template-waivable
- [ ] Template *mechanism* exists (schema add-ons via `template:`), with zero concrete templates shipped

### Out of Scope

- Concrete templates (procedure/form/reference) — mechanism only in v1; design against the first real skill that needs them
- Tone engine, datasets, forms, output templates, sub-skills — YAGNI until a skill demands them
- MCP-dependency resolution — `dependencies` is linted as present but not resolved at build
- Distribution layer (packaging Motto itself as a plugin, global install / per-project version pinning, the meta-skill content) — separate follow-up; depends on the open install-mechanism decision
- Build-time content transform / inlining compiler — fights the maintainability principle
- `--zip` output for Claude Desktop upload — trivial add, deferred until needed

## Context

- Output is **standard Agent Skills** (`SKILL.md` + frontmatter + `references/`). The tooling is Claude-Code-specific; the output is portable.
- A full design spec and a 6-task TDD implementation plan already exist: `.planning/superpowers/specs/2026-06-29-motto-design.md` and `.planning/superpowers/plans/2026-06-30-motto-core-cli.md`.
- Repo layout for a Motto project: `skills/<name>/` (SKILL.md, references/, scripts/) + `shared/references/` → generated `dist/{public,private}/`.

## Constraints

- **Tech stack**: Node ≥ 20, plain ESM JavaScript, `node --test` (stdlib runner), single runtime dependency `yaml` — keep the maintenance surface minimal.
- **Portability**: built skills must be standard Agent Skills, loadable with no Motto present.
- **Philosophy**: mechanism over features; YAGNI ruthlessly; iterate slowly. Accuracy, portability, extensibility, maintenance are the fundamentals.
- **No content stripping**: `SKILL.md` is copied verbatim to dist (unknown frontmatter keys are harmless).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Output = standard Agent Skills (not a bespoke format/runtime) | Portability is a fundamental | — Pending |
| Build = lint + resolve-deps + copy (no content compiler) | Maintainability; compilers rot | — Pending |
| Distribute via plugin; output named per-project (`/myproject`, not `/motto`) | Motto's brand never reaches consumers | — Pending |
| `audience` binary (`public`\|`private`), private optional | A `both` value would collide across locally-installed plugins | — Pending |
| Spine = Title + Role, mandatory but template-waivable | The rigid-vs-creative dial; escape hatch is explicit | — Pending |
| v1 ships zero concrete templates (mechanism only) | YAGNI — design templates against real skills | — Pending |
| Config in `motto.yaml` | Project-specific, room for future prefs (output language…) | — Pending |
| Install mechanism (global plugin vs repo-local `.motto/`) left open | Decide in the distribution follow-up plan | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-30 after initialization*
