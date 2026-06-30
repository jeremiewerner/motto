# Motto — Milestones

A historical record of shipped versions.

## v0.0.1 — Core lint + build CLI

**Shipped:** 2026-06-30 · **Closeout:** verified (3/3 phases passed, audit PASSED)

The initial release: author Agent Skills in a fixed source tree, lint them against a strict schema (`motto lint`), and package lint-passing skills into self-contained standard Agent Skill plugins (`motto build`). Pure never-throw validation core, deterministic discovery, verbatim copy with symlink preservation, conditional public/private buckets, per-bucket `plugin.json`.

- **Phases:** 3 (Pure Core · motto lint · motto build) · **Plans:** 5 · **Commits:** 41 · **LOC:** ~2192 · **Tests:** 53
- **Stack:** Node ≥20, plain ESM, `node --test`, single dep `yaml`
- **Requirements:** 22/22 shipped + verified
- **Archives:** [roadmap](milestones/v0.0.1-ROADMAP.md) · [requirements](milestones/v0.0.1-REQUIREMENTS.md) · [audit](v0.0.1-MILESTONE-AUDIT.md)
- **Carried debt:** NAME_KEBAB sync self-test; empty `requirements_completed` in 2 summaries; doc nits (yaml ISC license, Phase-1 SC#1 wording); not yet dogfooded.
