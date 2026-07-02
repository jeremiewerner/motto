# Motto

## What This Is

Motto is a framework for **authoring, validating, and packaging Claude Code Agent Skills**. You author skills in a structured source tree (`skills/` + `shared/`), Motto enforces a strict schema, and `motto build` packages them into self-contained, distributable plugins named after *your* project. The output is plain, standard Agent Skills — any agent loads them with no knowledge of Motto.

## Core Value

The **strict schema + linter**. Skills that always conform to one rigid-yet-creative structure, validated before they ship. The rigor is the product; the build is plumbing.

## Current State

**Shipped: v0.0.4 (2026-07-02)** — Project bootstrap complete. A stranger with only `npm i -g @jeremiewerner/motto` can scaffold, build, and distribute their own skills project: `motto init [name] [--force]` scaffolds a complete, lint-and-build-clean project (starter skill, `motto.yaml`, `.gitignore`, `marketplace.json`) via never-throw `src/init.js`, guarded by a permanent init → lint → build dogfood test; `motto --help` (global + per-subcommand) and `lint`/`build [path]` make the CLI discoverable and relocatable; the README documents the full ship-your-plugin flow; the superseded `setup-project` skill is retired; and all 5 carried tech-debt items closed in Phase 13. 10/10 requirements, 131 tests, 1,380 LOC, single dep `yaml`. See `milestones/v0.0.4-ROADMAP.md`.

**Prior:** v0.0.3 (2026-07-01) — installable + distributable: npm `@jeremiewerner/motto`, self-hosted marketplace, real `release` publish flow (13 reqs). · v0.0.2 (2026-07-01) — Motto self-hosts: own `skills/` tree + dogfood guard + spec-complete `validateSkill` (10 reqs). · v0.0.1 (2026-06-30) — core `motto lint` + `motto build` CLI (22 reqs). Archives in `milestones/`.

**Hardening note:** post-v0.0.2 `/code-review high` caught 3 D-01 never-throw violations the milestone tests missed; fixed + guarded. v0.0.4 continued the pattern: never-throw contract now enforced with adversarial malformed-input regression tests across scaffold paths (WR-01 closure, Phase 10-03).

## Current Milestone: v0.0.5 Skill Builder

**Goal:** A user describes a procedure in any form and Motto structures it into a validated, conforming, distributable skill.

**Target features:**
- Template mechanism live: `template:` field validated, data-driven template + section-tag registry, `procedure` template ships (closes TMPL-01)
- `procedure` template requires `<process>` + `<success_criteria>` body sections; unknown tags stay legal
- New validated optional fields (global, when present): `outputs:` named map → path-safe existing files, `dependencies:` resolve in project tree, `allowed-tools` format check
- `build-skill` Agent Skill — structurer, not ideator: ingest any input → gap-fill questions → generate skill → self-verify with `motto lint`; itself `template: procedure` (dogfood)
- `author-skill` retired (closes AUTH-SKILL, removes lint-string duplication)

**Design spec:** `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` (decisions D-01..D-08, evolution ledger, standing principles).

**Standing principles (every step):** heavy research; design for unknown purpose; lightweight (readable code/md, no doc sprawl); agentic best practice (skills + agents + subagents + API/MCP are first-class); simple to adapt, creativity free; rigor in a small easy spine.

<details>
<summary>Shipped: v0.0.4 — Project Bootstrap (2026-07-02)</summary>

**Goal:** A stranger with only `npm i -g @jeremiewerner/motto` can scaffold, build, and distribute their own skills project — no Claude Code skills required, no reverse-engineering. ✅ Shipped — see `milestones/v0.0.4-ROADMAP.md`.

**Delivered:** `motto init [name]` (scaffold + starter skill + marketplace.json + .gitignore, `--force` guard, name validation single-sourced from `schema.js`); `setup-project` skill deleted; README ship-your-plugin flow; `--help` global/per-subcommand; `[path]` arg for lint/build; Phase 13 tech-debt closure (DEBT-01..05).

**Explicitly not built:** `motto ship` command — after init + build, shipping is two git commands; marketplace.json is already scaffolded by init. Backlog until real friction shows.

</details>

<details>
<summary>Shipped: v0.0.3 — Distribution (2026-07-01)</summary>

**Goal:** Make Motto installable (npm) and its skills distributable (self-hosted Claude Code marketplace), wire the `release` skill's publish stub, and document Claude Desktop usage. Resolves the long-open install-mechanism decision. ✅ Shipped — see `milestones/v0.0.3-ROADMAP.md`.

**Locked decisions (research-backed — see `.planning/research/distribution.md`):**
- **CLI distribution:** publish to npm as **`@jeremiewerner/motto`** (scoped/public; `motto` unscoped is taken). `bin` invokes as `motto`. `publishConfig.access: public` (scoped defaults private); `files` allowlist = `bin/`, `src/`, `dist/public/`. Fix `package.json` version drift (currently `0.0.1`, shipped is v0.0.2).
- **Skills → users:** self-hosted marketplace via `.claude-plugin/marketplace.json` **inside the repo** (no separate repo), `source: npm` type, skills path override to `dist/public/` with `strict: false`. One `npm publish` ships CLI + bundled skills plugin.
- **Claude Desktop:** covered for free — the Desktop **Code tab IS Claude Code**, loads marketplaces + `~/.claude/skills/` identically. No build feature needed; document a symlink one-liner (`ln -s dist/public/<skill> ~/.claude/skills/`) + a web-upload zip one-liner (`cd dist/public && zip -r <skill>.zip <skill>/`) for the Chat/web edge case.
- **Release skill fixes:** add `git push --follow-tags` (tag currently created locally, never pushed), replace the npm-publish TODO stub with the real flow, note the manual `motto.yaml` version bump.
- **Install-mechanism open decision → RESOLVED:** npm (CLI) + self-hosted marketplace (skills). No `.zip` build feature.

**Out of scope this milestone:** `--zip` build feature (marketplace covers Desktop; zip is a documented shell one-liner for the web-upload edge case only), CLI ergonomics (`--quiet`, `--format json`), optional `[path]` arg, template mechanism validation (TMPL-01), CI — carry forward.

</details>

## Requirements

### Validated

- [x] `motto lint` enforces the skill schema: frontmatter fields, kebab `name` = folder, Title + Role spine, `shared_references` resolve — v0.0.1–v0.0.2 (verified, dogfooded)
- [x] `motto build` produces self-contained `dist/` plugins (public + optional private), named per project, with shared refs bundled in — v0.0.1–v0.0.2 (verified, dogfooded)
- [x] `motto.yaml` carries project identity (name/version/description), plugin names, and preferences — v0.0.1
- [x] Single shared scope (`shared/references/`) bundled into each skill at build — v0.0.1
- [x] Universal body spine: `# Title` + `**Role:**`, mandatory, template-waivable — v0.0.1–v0.0.2
- [x] Motto installable (npm) + skills distributable (self-hosted marketplace) — v0.0.3
- [x] `motto init [name]` scaffolds a complete, buildable skills project (structure + motto.yaml + marketplace.json + starter skill + .gitignore) — Validated in Phase 10 (v0.0.4)
- [x] `--help`/`-h` (global, per-subcommand, bare `motto`) prints usage to stdout, exit 0 — Validated in Phase 11 (v0.0.4)
- [x] `lint`/`build` accept optional `[path]` arg (default cwd), with directory-existence guard — Validated in Phase 11 (v0.0.4)
- [x] README documents the full ship-your-plugin path — v0.0.4 (DOC-04, accuracy gaps closed in Plan 12-03)
- [x] `setup-project` skill removed (superseded by init + README) — v0.0.4 (DOC-05, atomic delete + dogfood count sync)

### Active

- [ ] Template *mechanism* exists (schema add-ons via `template:`), with zero concrete templates shipped — mechanism shipped v0.0.1; concrete-template validation deferred (TMPL-01)

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
- Codebase state after v0.0.4: 1,380 LOC plain ESM JS (`bin/` + `src/`), 131 tests (`node --test`), single dep `yaml`, husky pre-commit full-suite hook, no CI.
- Known debt: no CI (CI-01), `author-skill` instructional skill under review (challenge before rework), repo still private.

## Constraints

- **Tech stack**: Node ≥ 20, plain ESM JavaScript, `node --test` (stdlib runner), single runtime dependency `yaml` — keep the maintenance surface minimal.
- **Portability**: built skills must be standard Agent Skills, loadable with no Motto present.
- **Philosophy**: mechanism over features; YAGNI ruthlessly; iterate slowly. Accuracy, portability, extensibility, maintenance are the fundamentals.
- **No content stripping**: `SKILL.md` is copied verbatim to dist (unknown frontmatter keys are harmless).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Output = standard Agent Skills (not a bespoke format/runtime) | Portability is a fundamental | ✓ Good — dogfooded v0.0.2, marketplace-installed v0.0.3, scaffolded v0.0.4 |
| Build = lint + resolve-deps + copy (no content compiler) | Maintainability; compilers rot | ✓ Good — verbatim copy held through 4 milestones |
| Distribute via plugin; output named per-project (`/myproject`, not `/motto`) | Motto's brand never reaches consumers | ✓ Good — init scaffolds marketplace.json named per project |
| `audience` binary (`public`\|`private`), private optional | A `both` value would collide across locally-installed plugins | ✓ Good — v0.0.2 |
| Spine = Title + Role, mandatory but template-waivable | The rigid-vs-creative dial; escape hatch is explicit | ✓ Good — held through dogfood + scaffold |
| v1 ships zero concrete templates (mechanism only) | YAGNI — design templates against real skills | — Pending (TMPL-01 still deferred) |
| Config in `motto.yaml` | Project-specific, room for future prefs (output language…) | ✓ Good |
| Install mechanism (global plugin vs repo-local `.motto/`) left open | Decide in the distribution follow-up plan | ✅ v0.0.3 — npm (CLI) + self-hosted marketplace (skills) |
| No `--zip` build feature; document shell one-liner instead | Desktop Code tab is Claude Code → marketplace covers it; zip is web-upload-only edge case; keeps zero-dep + no Node zip code | ✅ v0.0.3 (research-backed) |
| Init templates as inline strings in `src/init.js` (not `skills/` or `src/templates/`) | Avoids polluting Motto's own dogfood skill count and `dist/public/` | ✅ v0.0.4 |
| `motto init` is flag-driven only — no interactive prompts | Would add a dep, break scriptable/agent use, duplicate lint's validation | ✅ v0.0.4 (research-backed anti-feature) |
| No RESERVED-word check on `plugins.public/private` names (doc fix only, DEBT-01) | Over-strictness would reject spec-conformant names like `claude-notes-sync` | ✅ v0.0.4 |
| No `motto ship` command | After init + build, shipping is two git commands; marketplace.json already scaffolded | ✅ v0.0.4 (backlog SHIP-01 until real friction) |

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
*Last updated: 2026-07-02 — v0.0.5 Skill Builder milestone started*
