# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.5 (2026-07-03)
**Active milestone:** v0.0.6 Prove & Publish (Phases 19-22)
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
- [ ] **v0.0.6** — Prove & Publish (Phases 19-22) — IN PROGRESS
  - CI gates every push, tags publish themselves to npm, the repo crosses the one-way door to public, and build-skill is proven on a real skill. Zero new deps. 17 requirements.

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

### 🚧 v0.0.6 Prove & Publish (In Progress)

**Milestone Goal:** Motto's ship path becomes automated and trustworthy — CI gates every push, tags publish themselves to npm, the repo goes public, and build-skill is proven on a real skill. Zero new runtime dependencies; the never-throw validation core stays untouched (all work is additive wrapping).

**Pre-milestone operator action (not a phase):** catch-up publish of `0.0.5` to npm via the existing `release` skill — npm is stuck at 0.0.3 (v0.0.4/v0.0.5 never shipped). This happens manually before Phase 21's CI publish job lands.

- [x] **Phase 19: CLI Ergonomics & Build-Skill Verification** - Machine-readable, pipe-safe CLI output that CI can assert against, plus one real skill proven through build-skill (completed 2026-07-03)
- [ ] **Phase 20: CI Workflow** - Every push/PR gated by a Node 20/22/24 matrix, dogfood, and pack-install E2E — proven while the repo is still private
- [ ] **Phase 21: Publish Automation & Release Rewrite** - Tags publish themselves to npm idempotently; local release flow shrinks to bump-tag-push
- [ ] **Phase 22: Public Flip & Token Hardening** - The repo crosses the one-way door to public, verified clean and stranger-usable, ending with zero long-lived publish tokens

## Phase Details

### Phase 19: CLI Ergonomics & Build-Skill Verification

**Goal**: Motto's CLI emits machine-readable, pipe-safe output that later CI jobs can assert against, and `build-skill` is proven end-to-end on a real skill — closing the v0.0.5 human-verify debt. Both are independent, low-risk, do-early work; the never-throw core is untouched (presentation layer only).
**Depends on**: Nothing (first phase of milestone; builds on shipped v0.0.5)
**Requirements**: CLIX-01, CLIX-02, CLIX-03, BSKV-01
**Success Criteria** (what must be TRUE):

  1. Running `motto lint`/`motto build` with `--quiet` suppresses success/progress output while errors still print, and exit codes are unchanged.
  2. Running `motto lint`/`motto build` with `--format json` emits exactly one JSON document serializing the existing `{ok, errors}` shape on stdout — and nothing else on stdout.
  3. Diagnostics and errors write to stderr while results write to stdout, so `--format json` output is pipe-safe (Pitfall 7 fixed).
  4. One real skill is authored end-to-end through `build-skill` from freeform input — gap-fill fidelity (BSKL-01), quality gate on hollow output (BSKL-05), and runtime name-recovery (WR-01) are observed; findings recorded and divergences fixed or ticketed.

**Plans**: 2/2 plans complete

- [x] 19-01-PLAN.md — CLI ergonomics: `--quiet` + `--format text|json` + stdout/stderr split in bin/motto.js (CLIX-01/02/03)
- [x] 19-02-PLAN.md — build-skill live verification on one real skill; 19-BSKV-FINDINGS.md (BSKV-01)

### Phase 20: CI Workflow

**Goal**: Every push and PR is gated by a full CI pipeline (`.github/workflows/ci.yml`) that proves Motto works on a clean checkout and as npm actually ships it — all while the repo is still private, so the gate is trusted before anything is exposed.
**Depends on**: Phase 19 (pack-install E2E assertions consume `--quiet`/`--format json`)
**Requirements**: CIW-01, CIW-02, CIW-03, CIW-04, CIW-05
**Success Criteria** (what must be TRUE):

  1. Every push/PR runs the full test suite green across a Node 20/22/24 matrix via `.github/workflows/ci.yml`.
  2. CI dogfoods `motto lint` + `motto build` against Motto's own `skills/` tree on a clean checkout.
  3. A pack-install E2E job (`scripts/pack-install-e2e.mjs`) runs `npm pack` → installs the tarball in a tmp dir → `motto init` → `lint` → `build`, proving the shipped artifact works standalone.
  4. CI surfaces a non-blocking warning when the npm registry's latest version lags `package.json` — the v0.0.4/v0.0.5 silent-drift failure mode becomes visible.
  5. The husky `prepare` script no-ops outside a git checkout (tarball installs, `npm ci`) without failing CI.

**Plans**: TBD

### Phase 21: Publish Automation & Release Rewrite

**Goal**: Tagging a release publishes Motto to npm automatically and safely, and the local release flow shrinks to bump-tag-push with the publish responsibility (and the D-05 tarball assertion) handed to CI.
**Depends on**: Phase 20 (publish job is gated on all CI jobs green)
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04
**Success Criteria** (what must be TRUE):

  1. Pushing a `v*` tag triggers a CI publish job gated on all other jobs green, pinned to Node 24, idempotent via a `npm view` version-existence guard (re-runs are safe).
  2. The `release` skill is rewritten so the local flow is tests → bump → tag → `git push --follow-tags` only, documenting the CI handoff and a publish-failure recovery runbook (re-run the job; never re-tag).
  3. The D-05 tarball-leak assertion runs from a committed script in the CI pack-E2E job — no longer an inline release-skill heredoc.
  4. Each published version gets a GitHub Release with auto-generated notes (`gh release create --generate-notes`) from the publish job.

**Plans**: TBD

### Phase 22: Public Flip & Token Hardening

**Goal**: The repo safely crosses the one-way door to public — verified clean and usable by a logged-out stranger — and the publish pipeline ends with zero long-lived tokens by migrating to OIDC trusted publishing.
**Depends on**: Phase 21 (OIDC migration replaces the token used by the publish job; flip must follow a trusted publish path)
**Requirements**: OPEN-01, OPEN-02, OPEN-03, PUB-05
**Success Criteria** (what must be TRUE):

  1. Full git history passes a `gitleaks git .` secrets scan with the result recorded; any hit is triaged and rotated before the flip.
  2. `.planning/` visibility is an explicitly recorded decision (public as-is, or excluded via history rewrite) — not a default.
  3. The repo `jeremiewerner/motto` flips public and a logged-out stranger can follow the README, npm links, and marketplace install path successfully.
  4. After the flip, CI publish migrates from `NPM_TOKEN` to npm trusted publishing (OIDC) with `--provenance`, leaving zero long-lived publish tokens.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 19 → 20 → 21 → 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Template Mechanism | v0.0.5 | 3/3 | Complete | 2026-07-02 |
| 15. Field Validation & Integrity Guards | v0.0.5 | 2/2 | Complete | 2026-07-03 |
| 16. build-skill & author-skill Retirement | v0.0.5 | 2/2 | Complete | 2026-07-03 |
| 17. Docs Audit | v0.0.5 | 2/2 | Complete | 2026-07-03 |
| 18. Role Section Tag Migration | v0.0.5 | 2/2 | Complete | 2026-07-03 |
| 19. CLI Ergonomics & Build-Skill Verification | v0.0.6 | 2/2 | Complete   | 2026-07-03 |
| 20. CI Workflow | v0.0.6 | 0/TBD | Not started | - |
| 21. Publish Automation & Release Rewrite | v0.0.6 | 0/TBD | Not started | - |
| 22. Public Flip & Token Hardening | v0.0.6 | 0/TBD | Not started | - |

## Backlog

Candidates for a future milestone (detail in `.planning/REQUIREMENTS.md` Future Requirements + archived milestone requirements):

- `motto ship` command (SHIP-01) — deferred until real friction shows; after init + build, shipping is `git commit && git push`, and `marketplace.json` is already scaffolded by init.
- OS matrix (Windows/macOS CI legs) — defer until a real Windows bug report.
- Node 20 EOL decision (bump `engines` to ≥22?) — explicit decision next milestone; matrix still tests 20 for lagging installs.
- `--format json` line/column positions from yaml parser errors — v2+ consideration.
- `--zip` build feature — dropped for v0.0.3 (marketplace + `~/.claude/skills/` cover Claude Desktop's Code tab). Revisit only on real demand.
- Deferred design-ledger items: action section tags (`<drill>`/`<run>`/`<mcp>`), skill-calls-skill with params, `{var}` interpolation engine, `template:` as array (multi-template), `agent` template — design each against the first real skill that needs it.
