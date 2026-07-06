# Motto

## What This Is

Motto is a framework for **authoring, validating, and packaging Claude Code Agent Skills**. You author skills in a structured source tree (`skills/` + `shared/`), Motto enforces a strict schema, and `motto build` packages them into self-contained, distributable plugins named after *your* project. The output is plain, standard Agent Skills — any agent loads them with no knowledge of Motto.

## Core Value

The **strict schema + linter**. Skills that always conform to one rigid-yet-creative structure, validated before they ship. The rigor is the product; the build is plumbing.

## Current State

**Shipped: v0.0.6 (2026-07-05)** — Prove & Publish complete. Motto's ship path is automated and trustworthy: `.github/workflows/ci.yml` gates every push/PR (Node 20/22/24 matrix, `--quiet` dogfood, pack-install E2E, never-red npm-drift advisory); pushing a `v*` tag publishes to npm and creates a GitHub Release with zero long-lived tokens (`version_guard` tag/version cross-check → idempotent npm/gh guards → OIDC trusted publishing with `--provenance`); the repo is **public** (two clean full-history gitleaks scans, PII sweep, branch protection with 5 required checks); CLI gained `--quiet`/`--format json` with a stdout/stderr split; build-skill proven live on `skills/changelog`. Proven end-to-end at close: v0.0.6 itself shipped purely by tag push (npm `latest` = 0.0.6, GitHub Release live). 17/17 requirements, 243 tests, ~2,450 LOC (src+bin+scripts), single dep `yaml`. See `milestones/v0.0.6-ROADMAP.md`.

**Prior v0.0.5 (2026-07-03)** — Skill Builder complete. A user describes a procedure in any form and Motto structures it into a validated, conforming, distributable skill: the `template:` mechanism enforces real rules from the pure-data `src/templates.js` registry (`procedure` ships, fence-aware section matching); `outputs:`/`dependencies:`/`allowed-tools` are validated with integrity guards (path-safety + symlink-escape, resolution + self-dep + audience-direction, format-only), all never-throw; the `build-skill` Agent Skill ingests any input, gap-fills, generates, and self-verifies against the real linter (`author-skill` retired); `skill-schema.md` matches the live validator with a doc-sync test that breaks the suite on drift; and the base spine migrated from `**Role:**` bold-lines to a registry-driven `<role>…</role>` section tag (hard break, two distinct lint errors). 19/19 requirements + Phase 18's 9-decision contract, 213 tests, 1,964 LOC, single dep `yaml`. See `milestones/v0.0.5-ROADMAP.md`.

**Earlier:** v0.0.4 (2026-07-02) — project bootstrap: `motto init`, `--help`/`[path]` ergonomics, README ship flow, setup-project retired (10 reqs, 131 tests). · v0.0.3 (2026-07-01) — installable + distributable: npm `@jeremiewerner/motto`, self-hosted marketplace, real `release` publish flow (13 reqs). · v0.0.2 (2026-07-01) — Motto self-hosts: own `skills/` tree + dogfood guard + spec-complete `validateSkill` (10 reqs). · v0.0.1 (2026-06-30) — core `motto lint` + `motto build` CLI (22 reqs). Archives in `milestones/`.

**Hardening note:** post-v0.0.2 `/code-review high` caught 3 D-01 never-throw violations the milestone tests missed; fixed + guarded. v0.0.4 continued the pattern (adversarial scaffold-path tests). v0.0.5 made it structural: phase 18's review caught a Critical never-throw registry-shape crash (CR-01) *before* verification instead of after ship, and the twice-deferred WR-04 shape guard was closed at milestone close — zero known never-throw gaps at ship for the first time.

## Current Milestone: v0.0.7 Version Awareness

**Goal:** A Motto project knows which Motto version it was scaffolded/built with, version skew is detected and reported — the foundation every future upgrade path stands on — and the v0.0.6 operator loose ends are closed.

**Progress:** Phase 23 complete (2026-07-06) — Version Stamping & Skew Detection: `motto init` stamps `mottoVersion`, lint/build emit a direction-aware non-blocking skew advisory via additive `warnings[]`, malformed stamps are single clean errors (adversarial matrix), pre-stamp trees stay silent, never-rewrite guarded by byte-identity test. VER-01…VER-06 verified 11/11, 292 tests. Code review flagged 2 pre-existing `buildProject` throw paths (CR-01/CR-02, from phase 03-01) for follow-up.

**Target features:**
- `motto.yaml` records the motto version (stamped at `init`)
- `lint`/`build` detect version skew (project vs tool) with an explicit, actionable, never-throw message
- Standing constraint locked: every structure/schema change from now on ships with a documented upgrade path
- v0.0.6 debt closed: marketplace stranger re-walk (npm `latest` = 0.0.6), npm token revoke + trusted-publisher lock (release Step 9)

**Context:** Triggered by **magma** — the first real end-user project scaffolded with `motto init magma`. Magma stays a separate project; friction found there becomes Motto requirements. The upgrade *command* is deliberately deferred (YAGNI) until the first real schema break demands it — version awareness is the detection layer that makes that future command possible.

**Standing principles (every step):** heavy research; design for unknown purpose; lightweight (readable code/md, no doc sprawl); agentic best practice (skills + agents + subagents + API/MCP are first-class); simple to adapt, creativity free; rigor in a small easy spine.

<details>
<summary>Shipped: v0.0.6 — Prove & Publish (2026-07-05)</summary>

**Goal:** Motto's ship path becomes automated and trustworthy — CI gates every push, tags publish themselves to npm, repo goes public, and build-skill is proven on a real skill. ✅ Shipped — see `milestones/v0.0.6-ROADMAP.md`.

**Delivered:** `.github/workflows/ci.yml` (4 parallel jobs: Node 20/22/24 matrix, dogfood, pack-install E2E, npm-drift advisory) + tag-triggered publish job (`version_guard` → idempotent npm/gh guards → OIDC `--provenance` publish → GitHub Release); `release` skill local flow shrunk to bump+tag+push; repo flipped public behind two clean gitleaks scans + PII sweep + branch protection; CLI `--quiet`/`--format json` + stdout/stderr split; build-skill proven on `skills/changelog`; zero long-lived publish tokens.

**Proven live at close:** v0.0.6 published to npm + GitHub Release purely by tag push (Actions run 28751135062), closing Phase 21's deferred first-real-publish check and unblocking the 22-05 marketplace re-walk.

</details>

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
- [x] CLI `--quiet` + `--format text|json` with stdout/stderr split, presentation-layer only — v0.0.6 (CLIX-01..03)
- [x] build-skill proven end-to-end on a real skill (`skills/changelog`) — v0.0.6 (BSKV-01, closes v0.0.5 human-verify debt)
- [x] CI gates every push/PR: Node 20/22/24 matrix, dogfood, pack-install E2E, npm-drift advisory, git-less prepare guard — v0.0.6 (CIW-01..05)
- [x] Tag push publishes to npm idempotently + creates a GitHub Release; local release flow = bump+tag+push; D-05 tarball assertion in CI — v0.0.6 (PUB-01..04, live-proven by the v0.0.6 release itself)
- [x] Repo public behind explicit gates: clean full-history gitleaks scans, recorded `.planning/` visibility decision, stranger-usable README/npm path, OIDC trusted publishing with zero long-lived tokens — v0.0.6 (OPEN-01..03, PUB-05)

### Active

v0.0.7 requirements being defined — see `.planning/REQUIREMENTS.md` once written.

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
- Codebase state at v0.0.6 ship: plain ESM JS (`bin/` + `src/` + `scripts/`, ~2,450 LOC), 243-test `node --test` suite, single dep `yaml`, husky pre-commit full-suite hook, CI live (`.github/workflows/ci.yml`: Node 20/22/24 matrix + dogfood + pack-install E2E + OIDC publish-on-tag + npm-drift advisory). Repo **public** (flipped 2026-07-05 after two clean gitleaks scans). npm `latest` = 0.0.6 (published via tag-push automation 2026-07-05). Three live skills (`release`, `build-skill`, `changelog`), doc-sync test pins `skill-schema.md` to the validator source.
- Known debt: marketplace/skill-list stranger walkthrough still unverified against a current npm `latest` (was blocked on 0.0.3 staleness, unblocked at v0.0.6 ship — re-walk queued in ROADMAP Backlog); 1 info-level build-skill prose gap (see `milestones/v0.0.5-MILESTONE-AUDIT.md` tech_debt); versions 0.0.4/0.0.5 intentionally never published to npm (0.0.3 → 0.0.6 jump).

## Constraints

- **Tech stack**: Node ≥ 20, plain ESM JavaScript, `node --test` (stdlib runner), single runtime dependency `yaml` — keep the maintenance surface minimal.
- **Portability**: built skills must be standard Agent Skills, loadable with no Motto present.
- **Philosophy**: mechanism over features; YAGNI ruthlessly; iterate slowly. Accuracy, portability, extensibility, maintenance are the fundamentals.
- **No content stripping**: `SKILL.md` is copied verbatim to dist (unknown frontmatter keys are harmless).
- **Upgrade path (standing, since v0.0.7)**: every change to project structure or an existing feature ships with a way for existing Motto projects to upgrade (documented steps at minimum); breaking changes need an `UPGRADING.md` entry — see the release skill's Ledger Gate. Hard breaks without a path — like v0.0.5's `<role>` migration — are no longer acceptable now that real consumer projects (magma) exist.

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
| Publish auth = OIDC trusted publishing, zero stored tokens | Short-lived workflow-scoped OIDC token replaces the standing `NPM_TOKEN` credential; exact org/repo/workflow match on npmjs.com; residual secret revoked at ship (release Step 9) | ✓ Phase 22 — token-free publish path live in ci.yml, structural test guards it |
| `version_guard` cross-checks tag vs package.json before any publish side effect | A mismatched tag must abort before npm/gh guards — closes the phantom-green-release drift path (Phase 21 CR-01) | ✓ v0.0.6 — proven live: guard passed silently on the real v0.0.6 publish; abort path proven by executed bash spot-checks |
| `.planning/` ships public as-is (no history rewrite) | 2026-07-05: Tags stay valid, history stays honest, the planning record is a feature for a dev-tooling repo (D-01). Accepted with informed knowledge of the PII sweep's commit-metadata-email finding — `jeremie@studiometa.fr` is the git-config author/committer email on the large majority of commits and is invisible to gitleaks (which scans diff content, not commit headers); D-06 already forbids purging it via history rewrite, so this exposure is knowingly accepted, not a silent default (see `.planning/phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md` PII Sweep section) | ✓ Accepted — Phase 22 |

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
*Last updated: 2026-07-06 — phase 23 (Version Stamping & Skew Detection) complete*
