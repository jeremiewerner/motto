# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.6 (2026-07-05)
**Active milestone:** v0.0.7 Version Awareness (Phases 23-25)
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
- [x] **v0.0.5** — Skill Builder (Phases 14-18) — SHIPPED 2026-07-03 → [archive](milestones/v0.0.5-ROADMAP.md)
  - Data-driven `template:` enforcement, validated `outputs:`/`dependencies:`/`allowed-tools` with integrity guards, `build-skill` Agent Skill (author-skill retired), docs current with doc-sync drift guard, base spine migrated to registry-driven `<role>` section tag. 19 requirements + 9-decision Phase 18 contract, 213 tests.
- [x] **v0.0.6** — Prove & Publish (Phases 19-22) — SHIPPED 2026-07-05 → [archive](milestones/v0.0.6-ROADMAP.md)
  - CI gates every push (Node 20/22/24 matrix + dogfood + pack-install E2E), tags publish themselves to npm via OIDC trusted publishing with zero long-lived tokens, the repo crossed the one-way door to public (gitleaks-clean, branch-protected), and build-skill proven on a real skill. Live-proven by v0.0.6's own tag-triggered publish. 17 requirements, 243 tests. Zero new deps.
- [ ] **v0.0.7** — Version Awareness (Phases 23-25) — IN PROGRESS
  - A Motto project knows which Motto version scaffolded it (`mottoVersion` stamped at `init`); `lint`/`build` detect version skew and report it as a direction-aware, never-throw advisory; a breaking-change upgrade ledger + standing policy make future schema breaks non-stranding; v0.0.6 operator debt closed (marketplace re-walk, npm token revoke, trusted-publisher lock). 11 requirements. Zero new deps.

## Phases

<details>
<summary>✅ v0.0.5 Skill Builder (Phases 14-18) — SHIPPED 2026-07-03</summary>

- [x] Phase 14: Template Mechanism (3/3 plans) — completed 2026-07-02
- [x] Phase 15: Field Validation & Integrity Guards (2/2 plans) — completed 2026-07-03
- [x] Phase 16: build-skill & author-skill Retirement (2/2 plans) — completed 2026-07-03
- [x] Phase 17: Docs Audit (2/2 plans) — completed 2026-07-03
- [x] Phase 18: Role Section Tag Migration (2/2 plans) — completed 2026-07-03

Full phase details: [milestones/v0.0.5-ROADMAP.md](milestones/v0.0.5-ROADMAP.md)

</details>

<details>
<summary>✅ v0.0.6 Prove & Publish (Phases 19-22) — SHIPPED 2026-07-05</summary>

- [x] Phase 19: CLI Ergonomics & Build-Skill Verification (2/2 plans) — completed 2026-07-03
- [x] Phase 20: CI Workflow (3/3 plans) — completed 2026-07-03
- [x] Phase 21: Publish Automation & Release Rewrite (4/4 plans) — completed 2026-07-04, live publish proven 2026-07-05
- [x] Phase 22: Public Flip & Token Hardening (5/5 plans) — completed 2026-07-05

Full phase details: [milestones/v0.0.6-ROADMAP.md](milestones/v0.0.6-ROADMAP.md)

</details>

### v0.0.7 Version Awareness (Phases 23-25)

- [x] **Phase 23: Version Stamping & Skew Detection** - `motto init` stamps the tool version; `lint`/`build` detect and report skew as a never-throw advisory (completed 2026-07-06)
- [ ] **Phase 24: Upgrade-Path Ledger & Policy** - a breaking-change ledger with per-version upgrade steps, plus the standing process that keeps it current
- [ ] **Phase 25: v0.0.6 Operator Debt Closure** - marketplace stranger re-walk, npm token revoke, trusted-publisher lock

## Phase Details

### Phase 23: Version Stamping & Skew Detection

**Goal**: A Motto project records which Motto version scaffolded it, and `lint`/`build` surface any skew between that stamp and the running tool as an explicit, direction-aware, never-throw advisory — pre-stamp projects stay clean.
**Depends on**: Nothing (first phase of the milestone; builds on shipped v0.0.6 CLI)
**Requirements**: VER-01, VER-02, VER-03, VER-04, VER-05, VER-06
**Success Criteria** (what must be TRUE):

  1. Running `motto init <name>` produces a `motto.yaml` containing a `mottoVersion` field set to the running tool's version, distinct from the project `version` field.
  2. Running `motto lint` or `motto build` on a project whose stamp differs from the tool prints a warning that names both versions and gives a direction-specific remedy (tool newer → check the upgrade ledger; project newer → upgrade motto), while exit code and `ok` stay unchanged.
  3. Running `motto lint`/`motto build` on a project with no stamp (Motto's own tree, magma) completes with no skew warning and no crash.
  4. Feeding a malformed stamp (number, array, object, boolean, null, empty string, garbage string) produces a clean error entry rather than a throw, proven by adversarial tests.
  5. Running `motto lint`/`motto build` never rewrites `motto.yaml` — only `motto init` writes the stamp, guarded by a test.

**Plans**: 4/4 plans complete
**Wave 1**

- [x] 23-01-PLAN.md — src/version.js pure module: getOwnVersion, parseVersion, direction-aware checkSkew (VER-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 23-02-PLAN.md — config.js optional mottoVersion validation + adversarial malformed matrix → errors[] (VER-05, D-R1)
- [x] 23-03-PLAN.md — init.js stamps mottoVersion into new scaffolds at live tool version (VER-01)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 23-04-PLAN.md — lint/build warnings[] + renderResult ⚠ stderr + no-stamp/never-rewrite/non-blocking tests (VER-02, VER-04, VER-06)

### Phase 24: Upgrade-Path Ledger & Policy

**Goal**: Every existing Motto project has documented steps to cross any breaking change, and a standing process guarantees future structure/schema changes ship with an upgrade entry — the skew warning's "check the upgrade ledger" remedy resolves to something real.
**Depends on**: Phase 23 (the skew message references the ledger; ledger content is validated against the real v0.0.5 break and the v0.0.7 stamp adoption)
**Requirements**: UPG-01, UPG-02
**Success Criteria** (what must be TRUE):

  1. A reader following the ledger can adopt the `mottoVersion` stamp in a pre-v0.0.7 project (magma, Motto's own tree) from documented steps alone.
  2. A reader can find the v0.0.5 `<role>` migration in the ledger with the steps an existing project needed to cross it.
  3. The standing upgrade-path constraint is operational — a documented process requires every future structure/schema change to add a ledger entry before ship, discoverable where a contributor plans a change.

**Plans**: TBD

### Phase 25: v0.0.6 Operator Debt Closure

**Goal**: The v0.0.6 ship's deferred operator loose ends are closed and verified against reality — the marketplace install path works for a stranger against the current npm `latest`, and the publish credential surface is reduced to trusted-publisher-only.
**Depends on**: Nothing code-wise (independent operator checkpoint; can run in parallel with 23/24, sequenced last for milestone-close cleanliness)
**Requirements**: DEBT-06, DEBT-07, DEBT-08
**Success Criteria** (what must be TRUE):

  1. A stranger following `/plugin marketplace add jeremiewerner/motto` → install can see and load `build-skill` from the plugin, verified by diffing actual installed plugin content against source (not trusting cache status), with the Claude Code plugin-cache caveat documented.
  2. The granular npm token is revoked on npmjs.com and `NPM_TOKEN` is deleted from the repo's GitHub secrets, confirmed absent.
  3. npm publishing for `@jeremiewerner/motto` is locked to trusted-publisher-only on npmjs.com, so a stolen token alone can no longer publish.

**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Template Mechanism | v0.0.5 | 3/3 | Complete | 2026-07-02 |
| 15. Field Validation & Integrity Guards | v0.0.5 | 2/2 | Complete | 2026-07-03 |
| 16. build-skill & author-skill Retirement | v0.0.5 | 2/2 | Complete | 2026-07-03 |
| 17. Docs Audit | v0.0.5 | 2/2 | Complete | 2026-07-03 |
| 18. Role Section Tag Migration | v0.0.5 | 2/2 | Complete | 2026-07-03 |
| 19. CLI Ergonomics & Build-Skill Verification | v0.0.6 | 2/2 | Complete | 2026-07-03 |
| 20. CI Workflow | v0.0.6 | 3/3 | Complete | 2026-07-03 |
| 21. Publish Automation & Release Rewrite | v0.0.6 | 4/4 | Complete | 2026-07-04 |
| 22. Public Flip & Token Hardening | v0.0.6 | 5/5 | Complete | 2026-07-05 |
| 23. Version Stamping & Skew Detection | v0.0.7 | 4/4 | Complete   | 2026-07-06 |
| 24. Upgrade-Path Ledger & Policy | v0.0.7 | 0/? | Not started | - |
| 25. v0.0.6 Operator Debt Closure | v0.0.7 | 0/? | Not started | - |

## Backlog

Candidates for a future milestone (detail in archived milestone requirements):

- `motto ship` command (SHIP-01) — deferred until real friction shows; after init + build, shipping is `git commit && git push`, and `marketplace.json` is already scaffolded by init.
- OS matrix (Windows/macOS CI legs) — defer until a real Windows bug report.
- Node 20 EOL decision (bump `engines` to ≥22?) — explicit decision next milestone; matrix still tests 20 for lagging installs.
- `--format json` line/column positions from yaml parser errors — v2+ consideration.
- `--format json` structured skew field (`{skew: {projectVersion, toolVersion, direction}}`) — VER-F1, deferred until magma validates the plain-text message wording.
- Severity keyed to semver distance / documented breaking boundary (patch/minor quiet, breaking loud) — VER-F2, needs a second real break to calibrate.
- `motto upgrade` command that walks a project across schema breaks — UPG-F1, deferred (YAGNI) until the first real post-stamp schema break demands it; v0.0.7's detection layer is its prerequisite.
- `--zip` build feature — dropped for v0.0.3 (marketplace + `~/.claude/skills/` cover Claude Desktop's Code tab). Revisit only on real demand.
- Deferred design-ledger items: action section tags (`<drill>`/`<run>`/`<mcp>`), skill-calls-skill with params, `{var}` interpolation engine, `template:` as array (multi-template), `agent` template — design each against the first real skill that needs it.
