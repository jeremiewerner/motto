# Motto

## What This Is

Motto is a framework for **authoring, validating, and packaging Claude Code Agent Skills**. You author skills in a structured source tree (`skills/` + `shared/`), Motto enforces a strict schema, and `motto build` packages them into self-contained, distributable plugins named after *your* project. The output is plain, standard Agent Skills — any agent loads them with no knowledge of Motto.

## Core Value

The **strict schema + linter**. Skills that always conform to one rigid-yet-creative structure, validated before they ship. The rigor is the product; the build is plumbing.

## Current State

**Shipped: v0.0.2 (2026-07-01)** — Motto self-hosts. A real `skills/` tree (2 public: `author-skill`, `setup-project`; 1 private: `release`) + shared ref `skill-schema` lints clean and builds to standard Agent-Skill plugins, guarded by a permanent `node:test` dogfood test on every commit (husky). `validateSkill` is now spec-complete (name ≤64, description ≤1024, no-XML). 10/10 requirements, 75 tests, single dep `yaml`. Repo now has a remote (`jeremiewerner/motto`, private). See `milestones/v0.0.2-ROADMAP.md`.

**Prior:** v0.0.1 (2026-06-30) — core `motto lint` + `motto build` CLI (22 reqs, 53 tests). See `milestones/v0.0.1-ROADMAP.md`.

**Hardening note:** post-merge `/code-review high` caught 3 D-01 never-throw violations the milestone tests missed (boolean name, unresolved YAML aliases in frontmatter/config); fixed + guarded. The never-throw invariant needs adversarial malformed-input tests — the GSD gates alone under-verified it.

## Current Milestone: v0.0.3 — Distribution

**Goal:** Make Motto installable (npm) and its skills distributable (self-hosted Claude Code marketplace), wire the `release` skill's publish stub, and document Claude Desktop usage. Resolves the long-open install-mechanism decision.

**Locked decisions (research-backed — see `.planning/research/distribution.md`):**
- **CLI distribution:** publish to npm as **`@jeremiewerner/motto`** (scoped/public; `motto` unscoped is taken). `bin` invokes as `motto`. `publishConfig.access: public` (scoped defaults private); `files` allowlist = `bin/`, `src/`, `dist/public/`. Fix `package.json` version drift (currently `0.0.1`, shipped is v0.0.2).
- **Skills → users:** self-hosted marketplace via `.claude-plugin/marketplace.json` **inside the repo** (no separate repo), `source: npm` type, skills path override to `dist/public/` with `strict: false`. One `npm publish` ships CLI + bundled skills plugin.
- **Claude Desktop:** covered for free — the Desktop **Code tab IS Claude Code**, loads marketplaces + `~/.claude/skills/` identically. No build feature needed; document a symlink one-liner (`ln -s dist/public/<skill> ~/.claude/skills/`) + a web-upload zip one-liner (`cd dist/public && zip -r <skill>.zip <skill>/`) for the Chat/web edge case.
- **Release skill fixes:** add `git push --follow-tags` (tag currently created locally, never pushed), replace the npm-publish TODO stub with the real flow, note the manual `motto.yaml` version bump.
- **Install-mechanism open decision → RESOLVED:** npm (CLI) + self-hosted marketplace (skills). No `.zip` build feature.

**Out of scope this milestone:** `--zip` build feature (marketplace covers Desktop; zip is a documented shell one-liner for the web-upload edge case only), CLI ergonomics (`--quiet`, `--format json`), optional `[path]` arg, template mechanism validation (TMPL-01), CI — carry forward.

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
- `--zip` build feature — dropped: Claude Desktop's Code tab is Claude Code (marketplace/`~/.claude/skills/` covers it); zip only matters for the Chat/web upload UI, handled by a documented shell one-liner. No Node zip code, no new dep.

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
| Install mechanism (global plugin vs repo-local `.motto/`) left open | Decide in the distribution follow-up plan | ✅ v0.0.3 — npm (CLI) + self-hosted marketplace (skills) |
| No `--zip` build feature; document shell one-liner instead | Desktop Code tab is Claude Code → marketplace covers it; zip is web-upload-only edge case; keeps zero-dep + no Node zip code | ✅ v0.0.3 (research-backed) |

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
*Last updated: 2026-07-01 — v0.0.3 (Distribution) milestone opened*
