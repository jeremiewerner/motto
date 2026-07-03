# Motto — Milestones

## v0.0.5 Skill Builder (Shipped: 2026-07-03)

**Shipped:** 2026-07-03 · **Closeout:** override (5/5 phases verified passed, audit tech_debt accepted; 1 acknowledged carry-over artifact — `260630-vzh-review-fixes` missing SUMMARY, work verified complete at v0.0.4 close; see STATE.md Deferred Items)

A user describes a procedure in any form and Motto structures it into a validated, conforming, distributable skill: the `template:` mechanism enforces real rules from pure data, three new frontmatter fields are validated with integrity guards, `build-skill` dogfoods the whole stack, the docs match the live validator with a drift-breaking test, and the base spine migrated from `**Role:**` bold-lines to a registry-driven `<role>` section tag.

**Phases completed:** 5 (14–18) · **Plans:** 11 + 3 quick tasks · **Tasks:** 27 · **Commits:** ~120 · **Tests:** 213 (was 131)

**Key accomplishments:**

- Data-driven `template:` field enforcement in validateSkill() via a pure-data src/templates.js registry and a fence-aware hasClosedSection scanner — 152/152 tests green, up from 140.
- The `release` skill adopts `template: procedure` on Motto's own live tree — `<process>`/`<success_criteria>` sections wrap the existing maintainer checklist, lint stays clean, and a new dogfood assertion proves the tags survive the verbatim build copy unchanged.
- Rewrote `hasClosedSection`'s fence scanner to track opening-fence character+length (not a boolean toggle) and added an open-before-close ordering check, closing the last open verification gap for Phase 14 (Roadmap SC3 / TMPL-03).
- Pure-validator extension of `validateSkill` adding lexical `outputs:` path-safety, `dependencies:` namespaced-format/self-dep/resolution/audience guards, and Option A format-only `allowed-tools` — all hasOwnProperty-gated, all proven never-throw.
- Filesystem-dependent half of Phase 15's field validators landed in `src/lint.js` — `outputs:` existence/symlink-escape containment (via `stat`+`realpath`+`path.relative`) and a `loadSkillAudiences` cross-skill pre-pass feeding bare-dependency resolution and the public→private audience guard — with `skills/release/SKILL.md` gaining a live `allowed-tools` declaration proving the whole pipeline integrated and green.
- Shipped `skills/build-skill/` — a public `template: procedure` Agent Skill that structures any freeform input into a lint-clean, conforming Motto skill and self-verifies against the real linter — retiring `author-skill` in the same atomic commit.
- Extended build-skill's Step 5 name guard to the full NAME cascade (>64 chars, anthropic/claude substrings) and gave Step 6 an authorized name-recovery backstop plus exec-vs-lint fallback semantics, closing both structured verification gaps and all three carried code-review findings (WR-01, WR-02, WR-03, IN-01, IN-02).
- Rewrote `shared/references/skill-schema.md` to match the live v0.0.5 validator (template/outputs/dependencies/allowed-tools, no stale version header), added a `node:test` doc-sync guard that fails the suite on drift, and trimmed build-skill's Step 2 supersede/delta prose to a single sentence now that the bundled reference tells the truth.
- README.md now has zero `author-skill` references — the "Author a skill" section describes build-skill's real ingest → gap-fill → write → lint-loop → quality-gate → receipt flow, and every sample command names build-skill.
- Base spine migrated to a registry-driven `<role>…</role>` section tag (hard break): `BASE_SPINE`/`SECTIONS.role` data drive the check, two distinct lint errors (missing/empty), both live skills + init scaffold + docs + ~30 fixtures moved in one atomic commit.
- Post-verification hardening: code review caught a Critical never-throw registry-shape crash (CR-01) plus 3 warnings — all fixed pre-close; quick tasks extracted the shared fence-tracking helper (IN-02) and closed the twice-deferred WR-04 `TPL[tpl]` shape guard. Zero open review findings, zero known never-throw gaps at ship.

---

A historical record of shipped versions.

## v0.0.4 — Project Bootstrap

**Shipped:** 2026-07-02 · **Closeout:** override (4/4 phases verified, audit passed; 1 acknowledged artifact — see below)

A stranger with only `npm i -g @jeremiewerner/motto` can now scaffold, build, and distribute their own skills project: `motto init` produces a complete, immediately-buildable project; `--help` and `[path]` make the CLI discoverable and relocatable; the README documents the full ship-your-plugin flow; the superseded `setup-project` skill is retired; and all five carried tech-debt items were closed in Phase 13.

**Key accomplishments:**

- `motto init [name] [--force]` scaffolds a complete, lint-and-build-clean skills project (starter skill, motto.yaml, .gitignore, marketplace.json) via never-throw `src/init.js`
- Permanent scaffold-dogfood test: from-nothing init → lint → build passes with zero edits (41 new assertions)
- Global + per-subcommand `--help` and `motto lint/build [path]` targeting with pre-dispatch directory guard (15 spawn-based CLI tests)
- README rewritten around `motto init` with full ship-your-plugin flow; `skills/setup-project/` retired atomically (dogfood count synced, main never red)
- All 5 deferred tech-debt items closed in Phase 13 — reserved-word doc claim corrected, git stderr leakage suppressed, process.exit() item verify-closed
- Never-throw hardening across scaffold paths: WR-01 throw paths closed with adversarial regression tests

- **Phases:** 4 (Project Scaffold · CLI Ergonomics · Docs & Cleanup · Tech-Debt Closure) · **Plans:** 9 · **Tasks:** 19 · **Commits:** 75 · **Tests:** 131
- **Requirements:** 10/10 (INIT-01..06, CLIX-03..04, DOC-04..05) + DEBT-01..05
- **Archives:** [roadmap](milestones/v0.0.4-ROADMAP.md) · [requirements](milestones/v0.0.4-REQUIREMENTS.md) · [audit](milestones/v0.0.4-MILESTONE-AUDIT.md)
- Known verification overrides: 1 (quick task `260630-vzh-review-fixes` missing SUMMARY.md; work verified complete in git — see STATE.md Deferred Items)

## v0.0.3 — Distribution

**Shipped:** 2026-07-01 · **Closeout:** verified (3/3 phases passed; merged to `main` @ `450274c`, tagged `v0.0.3`)

Motto is now installable and distributable: the CLI publishes to npm as `@jeremiewerner/motto`, its public skills ship through a self-hosted Claude Code marketplace (`source: npm` → `dist/public/`), the `release` skill drives the real end-to-end publish flow (pack-verify → publish → `git push --follow-tags` → `motto.yaml` sync), and a first project README documents every install path (npm CLI, marketplace skills, Claude Desktop symlink/zip).

- **Phases:** 3 (npm Packaging & Release · Marketplace Distribution · Documentation) · **Commits:** 33 · **Tests:** 75
- **Requirements:** 13/13 (NPM-01..04, REL-01..03, MKT-01..03, DOC-01..03)
- **Archives:** [roadmap](milestones/v0.0.3-ROADMAP.md) · [requirements](milestones/v0.0.3-REQUIREMENTS.md)

## v0.0.2 — Self-Hosting (Dogfood)

**Shipped:** 2026-07-01 · **Closeout:** verified (3/3 phases passed, audit PASSED, hardened post-review)

Motto now dogfoods itself: a real `skills/` tree (2 public + 1 private) + a shared reference lints clean and builds to standard Agent-Skill plugins, guarded by a permanent `node:test` dogfood test on every commit. The schema-strictness gap was closed (full name/description spec enforcement), skill names standardized, and a `/code-review high` pass fixed 3 never-throw invariant violations the milestone tests missed.

- **Phases:** 3 (Self-Hosted Tree · Dogfood Guard · Schema Strictness) + 2 quick tasks · **Commits:** 43 · **Tests:** 75
- **Stack:** Node ≥20, plain ESM, `node --test`, single dep `yaml`
- **Requirements:** 10/10 shipped + verified (SELF-01..05, DOG-01..04, STRICT-01)
- **PRs:** #1 (milestone) · #2 (post-review hardening)
- **Archives:** [roadmap](milestones/v0.0.2-ROADMAP.md) · [requirements](milestones/v0.0.2-REQUIREMENTS.md) · [audit](v0.0.2-MILESTONE-AUDIT.md) · [integration](v0.0.2-MILESTONE-INTEGRATION.md)
- **Carried debt:** empty `requirements_completed` in Phase-4 summary; npm-publish stub in `release` skill; no CI (husky-only).

## v0.0.1 — Core lint + build CLI

**Shipped:** 2026-06-30 · **Closeout:** verified (3/3 phases passed, audit PASSED)

The initial release: author Agent Skills in a fixed source tree, lint them against a strict schema (`motto lint`), and package lint-passing skills into self-contained standard Agent Skill plugins (`motto build`). Pure never-throw validation core, deterministic discovery, verbatim copy with symlink preservation, conditional public/private buckets, per-bucket `plugin.json`.

- **Phases:** 3 (Pure Core · motto lint · motto build) · **Plans:** 5 · **Commits:** 41 · **LOC:** ~2192 · **Tests:** 53
- **Stack:** Node ≥20, plain ESM, `node --test`, single dep `yaml`
- **Requirements:** 22/22 shipped + verified
- **Archives:** [roadmap](milestones/v0.0.1-ROADMAP.md) · [requirements](milestones/v0.0.1-REQUIREMENTS.md) · [audit](v0.0.1-MILESTONE-AUDIT.md)
- **Carried debt:** NAME_KEBAB sync self-test; empty `requirements_completed` in 2 summaries; doc nits (yaml ISC license, Phase-1 SC#1 wording); not yet dogfooded.
