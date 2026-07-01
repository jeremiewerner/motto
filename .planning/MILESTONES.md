# Motto — Milestones

A historical record of shipped versions.

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
