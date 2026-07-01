# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.2 (2026-07-01)
**Active milestone:** v0.0.3 — Distribution (Phases 7-9)
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Granularity:** Coarse

## Milestones

- [x] **v0.0.1** — Core lint + build CLI (Phases 1-3) — SHIPPED 2026-06-30 → [archive](milestones/v0.0.1-ROADMAP.md)
  - Pure validation core (`parseFrontmatter`, `validateSkill`, `loadConfig`); `motto lint`; `motto build`. 22 requirements, 53 tests.
- [x] **v0.0.2** — Self-Hosting / Dogfood (Phases 4-6) — SHIPPED 2026-07-01 → [archive](milestones/v0.0.2-ROADMAP.md)
  - Motto authors + validates its own `skills/` tree, permanent dogfood guard, full name/description strictness. 10 requirements, 75 tests. Hardened post-review (3 never-throw fixes).
- [ ] **v0.0.3** — Distribution (Phases 7-9) — ACTIVE
  - Publish the CLI to npm (`@jeremiewerner/motto`), distribute skills via a self-hosted Claude Code marketplace, wire the `release` skill's real publish flow, and document Claude Desktop usage. 13 requirements.

## Phases

_Active milestone: v0.0.3 — Distribution_

- [x] **Phase 7: npm Packaging & Release Flow** - Make the CLI publishable to npm as a scoped public package and wire the `release` skill's real publish flow (completed 2026-07-01)
- [x] **Phase 8: Marketplace Distribution** - Distribute Motto's public skills through a self-hosted Claude Code marketplace in the repo (completed 2026-07-01)
- [ ] **Phase 9: Documentation** - Document every install path (npm CLI, marketplace skills, Claude Desktop) in the README

## Phase Details

### Phase 7: npm Packaging & Release Flow

**Goal**: Motto is publishable to npm as a scoped public package, and the `release` skill drives the real end-to-end publish workflow instead of a TODO stub.
**Depends on**: Nothing (first phase of this milestone; builds on shipped v0.0.2)
**Requirements**: NPM-01, NPM-02, NPM-03, NPM-04, REL-01, REL-02, REL-03
**Success Criteria** (what must be TRUE):

  1. `package.json` declares the scoped name `@jeremiewerner/motto`, version `0.0.3` (drift from `0.0.1` corrected), `publishConfig.access: "public"`, and a `files` allowlist of `bin/`, `src/`, `dist/public/`.
  2. `npm pack --dry-run` produces a tarball containing only the allowlisted paths (plus auto-included `package.json`/`README`/`LICENSE`) — no `skills/`, `test/`, or `.planning/` leakage.
  3. Installing the package globally (`npm i -g @jeremiewerner/motto`) exposes a working `motto` command that runs `lint`/`build` from any directory.
  4. The `release` skill's publish step runs the real flow — `npm pack --dry-run` verify → `npm publish` — with no TODO stub, pushes the release tag via `git push --follow-tags`, and bumps/notes the manual `motto.yaml` version alongside `package.json`.

**Plans**: 1/1 plans complete

- [x] 07-01-PLAN.md — MIT LICENSE + package.json packaging config (scoped name, files allowlist, publishConfig, lifecycle scripts) + wire release skill real publish flow

### Phase 8: Marketplace Distribution

**Goal**: Motto's public skills are installable in Claude Code through a self-hosted marketplace that lives in the repo and resolves the plugin from the published npm package.
**Depends on**: Phase 7 (the marketplace's `source: npm` entry resolves to the published `@jeremiewerner/motto` package)
**Requirements**: MKT-01, MKT-02, MKT-03
**Success Criteria** (what must be TRUE):

  1. `.claude-plugin/marketplace.json` exists at the repo root with `source: npm` pointing at `@jeremiewerner/motto`, a skills path override to `dist/public/`, and `strict: false`.
  2. A user can run `/plugin marketplace add jeremiewerner/motto` and Motto's marketplace resolves from the repo. ⚠️ SHIP-GATED: verified via local-path add (`/plugin marketplace add <repo-path>`); the GitHub form needs `.claude-plugin/marketplace.json` on the repo default branch (merge `gsd/v0.0.3-milestone` → main) and the repo public (T-08-04, Phase 9).
  3. A user can run `/plugin install motto@motto` and Motto's public skills (`author-skill`, `setup-project`) load in Claude Code. ✅ VERIFIED LIVE 2026-07-01 (A1 confirmed, no strict:false conflict).

**Plans**: 1/1 plans complete

- [x] 08-01-PLAN.md — Author `.claude-plugin/marketplace.json` (marketplace `motto`, plugin `motto`, `source: npm` → `@jeremiewerner/motto`, skills override `dist/public/`, `strict: false`); validate with `claude plugin validate .`; live-install human checkpoint (MKT-01, MKT-02, MKT-03)

### Phase 9: Documentation

**Goal**: The README documents every supported install path so a new user can install the CLI, install the skills, and use the built skills in Claude Desktop without guesswork.
**Depends on**: Phase 7, Phase 8 (documents the npm and marketplace mechanisms those phases deliver)
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):

  1. README documents installing the CLI from npm (`npm i -g @jeremiewerner/motto`).
  2. README documents adding the marketplace and installing Motto's skills into Claude Code (`/plugin marketplace add …` + `/plugin install motto@motto`).
  3. README documents Claude Desktop usage — the `~/.claude/skills/` symlink one-liner (`ln -s dist/public/<skill> ~/.claude/skills/<skill>`) and the web-upload zip one-liner (`cd dist/public && zip -r <skill>.zip <skill>/`).

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. npm Packaging & Release Flow | 1/1 | Complete    | 2026-07-01 |
| 8. Marketplace Distribution | 1/1 | Complete   | 2026-07-01 |
| 9. Documentation | 0/? | Not started | - |

## Backlog

Candidates for a future milestone (detail in `milestones/v0.0.2-REQUIREMENTS.md` and v0.0.3 Future Requirements):

- CLI ergonomics: `--quiet`, `--format json` (CLIX-01..02).
- Optional `[path]` arg for `lint`/`build` (currently cwd-only).
- Template mechanism validation against a first concrete template (TMPL-01).
- CI workflow (GitHub Actions) — remote exists (`jeremiewerner/motto`); husky-only today.
- `--zip` build feature — dropped for v0.0.3 (marketplace + `~/.claude/skills/` cover Claude Desktop's Code tab; zip is a documented shell one-liner for the web-upload edge case). Revisit only on real demand.
