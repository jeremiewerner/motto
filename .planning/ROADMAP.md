# Motto Roadmap

**Project:** Motto
**Latest shipped:** v0.0.6 (2026-07-05)
**Active milestone:** None — run `/gsd-new-milestone` to start the next cycle
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

## Backlog

Candidates for a future milestone (detail in archived milestone requirements):

- `motto ship` command (SHIP-01) — deferred until real friction shows; after init + build, shipping is `git commit && git push`, and `marketplace.json` is already scaffolded by init.
- OS matrix (Windows/macOS CI legs) — defer until a real Windows bug report.
- Node 20 EOL decision (bump `engines` to ≥22?) — explicit decision next milestone; matrix still tests 20 for lagging installs.
- `--format json` line/column positions from yaml parser errors — v2+ consideration.
- `--zip` build feature — dropped for v0.0.3 (marketplace + `~/.claude/skills/` cover Claude Desktop's Code tab). Revisit only on real demand.
- Deferred design-ledger items: action section tags (`<drill>`/`<run>`/`<mcp>`), skill-calls-skill with params, `{var}` interpolation engine, `template:` as array (multi-template), `agent` template — design each against the first real skill that needs it.
- Marketplace/skill-list re-check (from 22-05 stranger walkthrough): was BLOCKED on stale npm `latest` = 0.0.3; unblocked by the v0.0.6 publish — re-walk the marketplace install path to confirm.
