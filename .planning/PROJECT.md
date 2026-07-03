# Motto

## What This Is

Motto is a framework for **authoring, validating, and packaging Claude Code Agent Skills**. You author skills in a structured source tree (`skills/` + `shared/`), Motto enforces a strict schema, and `motto build` packages them into self-contained, distributable plugins named after *your* project. The output is plain, standard Agent Skills — any agent loads them with no knowledge of Motto.

## Core Value

The **strict schema + linter**. Skills that always conform to one rigid-yet-creative structure, validated before they ship. The rigor is the product; the build is plumbing.

## Current State

**Shipped: v0.0.5 (2026-07-03)** — Skill Builder complete. A user describes a procedure in any form and Motto structures it into a validated, conforming, distributable skill: the `template:` mechanism enforces real rules from the pure-data `src/templates.js` registry (`procedure` ships, fence-aware section matching); `outputs:`/`dependencies:`/`allowed-tools` are validated with integrity guards (path-safety + symlink-escape, resolution + self-dep + audience-direction, format-only), all never-throw; the `build-skill` Agent Skill ingests any input, gap-fills, generates, and self-verifies against the real linter (`author-skill` retired); `skill-schema.md` matches the live validator with a doc-sync test that breaks the suite on drift; and the base spine migrated from `**Role:**` bold-lines to a registry-driven `<role>…</role>` section tag (hard break, two distinct lint errors). 19/19 requirements + Phase 18's 9-decision contract, 213 tests, 1,964 LOC, single dep `yaml`. See `milestones/v0.0.5-ROADMAP.md`.

**Prior:** v0.0.4 (2026-07-02) — project bootstrap: `motto init`, `--help`/`[path]` ergonomics, README ship flow, setup-project retired (10 reqs, 131 tests). · v0.0.3 (2026-07-01) — installable + distributable: npm `@jeremiewerner/motto`, self-hosted marketplace, real `release` publish flow (13 reqs). · v0.0.2 (2026-07-01) — Motto self-hosts: own `skills/` tree + dogfood guard + spec-complete `validateSkill` (10 reqs). · v0.0.1 (2026-06-30) — core `motto lint` + `motto build` CLI (22 reqs). Archives in `milestones/`.

**Hardening note:** post-v0.0.2 `/code-review high` caught 3 D-01 never-throw violations the milestone tests missed; fixed + guarded. v0.0.4 continued the pattern (adversarial scaffold-path tests). v0.0.5 made it structural: phase 18's review caught a Critical never-throw registry-shape crash (CR-01) *before* verification instead of after ship, and the twice-deferred WR-04 shape guard was closed at milestone close — zero known never-throw gaps at ship for the first time.

## Current Milestone: v0.0.6 Prove & Publish

**Goal:** Motto's ship path becomes automated and trustworthy — CI gates every push, tags publish themselves to npm, repo goes public, and build-skill is proven on a real skill.

**Progress:** Phase 20 complete (2026-07-03) — CI gate live: `.github/workflows/ci.yml` with 4 parallel jobs (Node 20/22/24 test matrix, dogfood lint/build, pack-install E2E, npm-drift advisory; CIW-01..05), proven by two real green `pull_request` runs (PR #3, opened/closed unmerged). Research falsified locked D-15 (`npm install <tarball>` never fires a nested dep's `prepare`) — closed with an explicit `git archive`-based `.git`-less `npm ci` proof (`scripts/prepare-guard-check.mjs`). Post-execution review caught 1 Critical (bare `npx motto` in CI = registry-substitution hazard; pinned to `node_modules/.bin/motto`) + 5 warnings incl. a never-red violation in `npm-drift-check.mjs` — all 6 fixed, post-fix CI run green. 231 tests. Prior: Phase 19 (pipe-safe CLI `--quiet`/`--format json`; build-skill proven live on `skills/changelog`). Next: Phase 21 publish-automation & release rewrite.

**Target features:**
- CI workflow: Node 20/22/24 test matrix + dogfood lint/build + pack-install E2E (tarball → tmp dir → init/lint/build) + publish-on-tag + npm-drift warning
- Release skill rewrite: local = bump + tag + push only; publish + D-05 tarball assertion move to CI
- Pre-public gate: git-history secrets scan + explicit `.planning/` visibility decision → repo flips public
- Build-skill human-verify via authoring one real skill (BSKL-01, BSKL-05, WR-01 — closes v0.0.5 tech debt)
- CLI ergonomics: `--quiet`, `--format json` (CLIX-01..02 — CI is first real consumer)
- Changelog surface: release flow gains GitHub Release notes step

**Key context:** npm stuck at 0.0.3 — v0.0.4/v0.0.5 were never published (release skill never ran; drift confirmed against registry 2026-07-03). Catch-up publish of 0.0.5 happens manually via the existing `release` skill before this milestone's CI work lands. Trusted publishing (OIDC) is sequenced after the public flip; `NPM_TOKEN` secret is the interim if CI publishes earlier. Repo public is a one-way door — secrets scan and `.planning/` decision are explicit gates, not assumptions. Remaining backlog (not this milestone): `motto ship`, design-ledger items (action section tags, skill-calls-skill, `{var}` interpolation, multi-template, `agent` template).

**Standing principles (every step):** heavy research; design for unknown purpose; lightweight (readable code/md, no doc sprawl); agentic best practice (skills + agents + subagents + API/MCP are first-class); simple to adapt, creativity free; rigor in a small easy spine.

<details>
<summary>Shipped: v0.0.5 — Skill Builder (2026-07-03)</summary>

**Goal:** A user describes a procedure in any form and Motto structures it into a validated, conforming, distributable skill. ✅ Shipped — see `milestones/v0.0.5-ROADMAP.md`.

**Delivered:** data-driven `template:` enforcement (`procedure` ships, fence-aware matching); `outputs:`/`dependencies:`/`allowed-tools` validated with integrity guards, never-throw; `build-skill` Agent Skill (ingest → gap-fill → generate → lint-loop → quality gate), `author-skill` retired atomically; `skill-schema.md` current + doc-sync drift test; base spine `**Role:**` → registry-driven `<role>` tag (hard break, BASE_SPINE data, two lint errors).

**Design spec:** `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` (decisions D-01..D-08, evolution ledger).

**Deferred out:** build-skill live-behavior human-verify items (3) — tracked in ROADMAP Backlog.

</details>

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
- [x] `outputs:`/`dependencies:`/`allowed-tools` frontmatter fields validated with integrity guards (path-safety + symlink-escape, dependency resolution + self-dep + audience-direction, format-only allowed-tools), all never-throw — Validated in Phase 15 (v0.0.5, VAL-01..06; post-review hardening: 2 critical + 3 warning fixes with regression tests)

- [x] Template mechanism live: `template:` field enforced from the pure-data registry; `procedure` template requires `<process>` + `<success_criteria>` — Validated in Phase 14 (v0.0.5, TMPL-01..05; closes the long-deferred TMPL-01)
- [x] `build-skill` structures any freeform input into a lint-clean conforming skill, self-verifying against the real linter; `author-skill` retired atomically — Validated in Phase 16 (v0.0.5, BSKL-01..06; live-behavior fidelity pending human-verify)
- [x] `skill-schema.md` matches the live validator, guarded by a doc-sync test that breaks the suite on drift; README documents the build-skill flow — Validated in Phase 17 (v0.0.5, DOC-06..07)
- [x] Base spine = `# Title` + non-empty `<role>…</role>` section tag, registry-driven (BASE_SPINE), template-waivable — Validated in Phase 18 (v0.0.5, hard break from `**Role:**`)

### Active

(v0.0.6 — defined in `.planning/REQUIREMENTS.md`; validated entries move here at phase transitions.)

### Out of Scope

- Additional concrete templates beyond `procedure` (form/reference/agent) — design each against the first real skill that needs it
- Tone engine, datasets, forms, output templates, sub-skills — YAGNI until a skill demands them
- MCP-dependency resolution — `dependencies` is linted as present but not resolved at build
- Distribution layer (packaging Motto itself as a plugin, global install / per-project version pinning, the meta-skill content) — separate follow-up; depends on the open install-mechanism decision
- Build-time content transform / inlining compiler — fights the maintainability principle
- `--zip` build feature — dropped: Claude Desktop's Code tab is Claude Code (marketplace/`~/.claude/skills/` covers it); zip only matters for the Chat/web upload UI, handled by a documented shell one-liner. No Node zip code, no new dep.

## Context

- Output is **standard Agent Skills** (`SKILL.md` + frontmatter + `references/`). The tooling is Claude-Code-specific; the output is portable.
- A full design spec and a 6-task TDD implementation plan already exist: `.planning/superpowers/specs/2026-06-29-motto-design.md` and `.planning/superpowers/plans/2026-06-30-motto-core-cli.md`.
- Repo layout for a Motto project: `skills/<name>/` (SKILL.md, references/, scripts/) + `shared/references/` → generated `dist/{public,private}/`.
- Codebase state after v0.0.5: 1,964 LOC plain ESM JS (`bin/` + `src/`), 213 tests (`node --test`), single dep `yaml`, husky pre-commit full-suite hook, no CI. Two live skills (`release`, `build-skill`), doc-sync test pins `skill-schema.md` to the validator source.
- Known debt: no CI (CI-01), repo still private, 3 build-skill live-behavior human-verify items + 1 info-level prose gap (see `milestones/v0.0.5-MILESTONE-AUDIT.md` tech_debt).

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
| Spine = Title + Role, mandatory but template-waivable | The rigid-vs-creative dial; escape hatch is explicit | ✓ Good — held through dogfood + scaffold; v0.0.5 migrated Role to a `<role>` section tag, registry-driven (BASE_SPINE) |
| v1 ships zero concrete templates (mechanism only) | YAGNI — design templates against real skills | ✅ v0.0.5 — `procedure` designed against the real `release` skill; registry stayed pure data (TMPL-01 closed) |
| Template + section registry is pure data (`src/templates.js`) | Adding a template/spine rule = data edit, no linter change | ✅ v0.0.5 — proven twice: `procedure` (14) and `role` spine (18) |
| `allowed-tools` format-only validation (Option A — no shape regex) | Real spec forms like `Bash(git add *)` must pass; tokenizing invites false rejects | ✅ v0.0.5 |
| build-skill description is WHEN-only; quality gate is prose, not linter | Trigger-matching beats capability lists; hollow-content defense at write-time, lint stays structural | ✅ v0.0.5 (BSKL-05) |
| Doc freshness = doc-sync test, not version headers | The stale v0.0.2 header proved manual sync fails; drift now breaks the suite | ✅ v0.0.5 (Phase 17 D-03/D-04) |
| `<role>` hard break, no dual-accept window | Pre-1.0, repo-private, 2 live skills; dual-path validator code is permanent cost | ✅ v0.0.5 (Phase 18 D-01) |
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
*Last updated: 2026-07-03 — Phase 20 complete (CI workflow live, gate proven green pre-public)*
