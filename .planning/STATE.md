---
gsd_state_version: 1.0
milestone: v0.0.6
milestone_name: Prove & Publish
current_phase: 21
current_phase_name: Publish Automation & Release Rewrite
status: executing
stopped_at: Completed 20-02-PLAN.md
last_updated: "2026-07-04T17:40:10.899Z"
last_activity: 2026-07-03
last_activity_desc: Phase 20 complete, transitioned to Phase 21
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-02 after v0.0.4)

**Core value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Current focus:** Phase 20 — ci-workflow

## Current Position

Phase: 21 — Publish Automation & Release Rewrite
Plan: Not started
Status: Ready to execute
Last activity: 2026-07-03 — Phase 20 complete, transitioned to Phase 21

**Milestone shape (v0.0.6, coarse):**

- Phase 19: CLI Ergonomics & Build-Skill Verification (CLIX-01..03, BSKV-01)
- Phase 20: CI Workflow (CIW-01..05)
- Phase 21: Publish Automation & Release Rewrite (PUB-01..04)
- Phase 22: Public Flip & Token Hardening (OPEN-01..03, PUB-05)

Ordering (research-locked): CLI flags first (pack-E2E consumes them) → CI proven while private → publish job + release rewrite → pre-public gate + flip → OIDC last. BSKV-01 folded into Phase 19 (independent, do-early). Manual 0.0.5 catch-up publish is a pre-milestone operator action, not a phase.

## Performance Metrics

**Velocity:**

- Total plans completed: 16
- Average duration: -
- Total execution time: 0 hours

**By Phase (v0.0.5):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 14. Template Mechanism | 0 | - | - |
| 15. Field Validation & Integrity Guards | 0 | - | - |
| 16. build-skill & author-skill Retirement | 0 | - | - |
| 17. Docs Audit | 0 | - | - |
| 14 | 3 | - | - |
| 15 | 2 | - | - |
| 16 | 2 | - | - |
| 17 | 2 | - | - |
| 18 | 2 | - | - |
| 19 | 2 | - | - |
| 20 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 14 P01 | 24min | 3 tasks | 3 files |
| Phase 14 P02 | 12min | 2 tasks | 2 files |
| Phase 14 P03 | 9min | 2 tasks | 2 files |
| Phase 15 P01 | 5min | 3 tasks | 2 files |
| Phase 15 P02 | 4min | 3 tasks | 3 files |
| Phase 16 P01 | 6min | 2 tasks | 3 files |
| Phase 16 P02 | 8min | 2 tasks | 1 files |
| Phase 17 P01 | 25min | 3 tasks | 3 files |
| Phase 17 P02 | 6min | 2 tasks | 1 files |
| Phase 18 P01 | 7min | 2 tasks | 3 files |
| Phase 18 P02 | 20min | 3 tasks | 10 files |
| Phase 19 P01 | 30min | 2 tasks | 2 files |
| Phase 19 P02 | 45min | 3 tasks | 4 files |
| Phase 20 P01 | 4min | 2 tasks | 3 files |
| Phase 20 P02 | 12min | 2 tasks | 2 files |
| Phase 20-ci-workflow P03 | 5min | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v0.0.5 design spec]: D-01..D-08 govern the template mechanism, field validators, and build-skill (see `.planning/superpowers/specs/2026-07-02-skill-builder-design.md`).
- [v0.0.4]: Templates stored as inline strings in `src/init.js` — the v0.0.5 template *mechanism* (`src/templates.js`) is a distinct, data-driven schema-profile registry, not the init scaffold strings.
- [v0.0.2]: Output = standard Agent Skills (verbatim SKILL.md copy, no content stripping); `audience` binary (public|private).
- [Phase 14]: Template cascade resolves waivedSections before Title/Role checks so a template's waives can gate them (TMPL-01/04/05)
- [Phase 14]: template-key presence gated with hasOwnProperty (not truthy) so template: "" or null errors instead of silently passing (D-07)
- [Phase 14]: release (procedural maintainer checklist) is the locked dogfood target for template: procedure (14-CONTEXT.md)
- [Phase 14]: success_criteria content authored net-new in release/SKILL.md; no existing content repurposed
- [Phase 14]: hasClosedSection tracks opening fence character+length (not boolean toggle) and requires open-before-close match ordering (WR-01/WR-02 closure, Phase 14 gap closure)
- [Phase 15]: Self-dependency check ordered strictly before skillNames.has() membership check in dependencies cascade (Pitfall 2)
- [Phase 15]: allowed-tools locked to Option A: format-only, non-empty string or array, no shape regex, no tokenizing
- [Phase 15]: checkOutputsFs called from inside processSkill's existing outer try (not a second backstop) — its own per-entry try/catch already converts every failure to an error entry
- [Phase 15]: loadSkillAudiences pre-pass runs unconditionally for every discovered skill (build.js 'Option A — re-read' precedent), not gated on which skills declare dependencies
- [Phase 15]: release's allowed-tools authored as a 3-entry array (Bash(node *), Bash(npm *), Bash(git *)) to exercise the array per-entry validator path live, not just the string form
- [Phase 16]: build-skill description is WHEN-only, deliberately diverging from release/author-skill's what+when shape (locked BSKL-05 rule)
- [Phase 16]: Skill-name collision on write: build-skill refuses and stops rather than silently overwriting an existing skills/<name>/
- [Phase 16]: build-skill's allowed-tools declares only the honest lint-invocation fallback chain (local-bin, PATH, npx) — no contrived outputs/dependencies fields
- [Phase 16]: skill-schema.md bundled as-is (stale re: template/outputs/dependencies/allowed-tools); build-skill's own prose carries the delta as behavioral guidance, never duplicated lint strings
- [Phase 16]: Step 5 name guard mirrors full src/schema.js NAME cascade (kebab + lowercase-start + <=64 chars + no anthropic/claude); Step 6 authorizes delete-and-recover as the sole exception to the never-edit-outside-skills/<name>/ rule; Step 6 fallback falls through only on exec failure, never on a genuine lint failure
- [Phase 17]: Header D-04: skill-schema.md carries a source citation, not a version number — the doc-sync test is the freshness guarantee going forward
- [Phase 17]: D-01 surgical patch: kept existing skill-schema.md §1/§3/§5 skeleton verbatim; only §2/§4/§6 patched and §7-§9 added net-new; renumbered old §7 to §10
- [Phase 17]: Doc-sync test uses Option 1 (source-text extraction) per RESEARCH.md recommendation — no fixture wiring, no re-invocation of validateSkill
- [Phase 17]: D-06/D-07: README author-skill references replaced with build-skill (section body rewritten around real flow; 5 mechanical sample-name sites swapped); grep -c author-skill README.md returns 0
- [Phase 18]: hasNonEmptyClosedSection coerces body via typeof check before delegating to hasClosedSection (which only guards falsy values via body||'', letting truthy non-strings like 123/{}/[] throw); fixed only in the new caller
- [Phase 18]: role added to SECTIONS but not to TEMPLATES.procedure.requiredSections -- role is base-spine data (BASE_SPINE), not a per-template requirement (D-03)
- [Phase 18]: hasNonEmptyClosedSection exported but unwired into validateSkill in Plan 18-01 -- legacy Role check stays live; wiring happens atomically in Plan 18-02
- [Phase 18]: legacy **Role:** bold-line regex fully removed from src/schema.js (D-01 hard break) -- a leftover legacy line is now inert body text, producing the missing-role error, not a separate legacy-line-detected check (D-02)
- [Phase 18]: validateSkill's top-level bodyStr coercion changed from body||'' to a typeof guard -- pre-existing latent never-throw gap (truthy non-string body like 123/{}/[] would throw on .split()), newly exercised by the plan-mandated adversarial test; same fix shape as Plan 18-01's hasNonEmptyClosedSection
- [Phase quick-260703-occ]: Template cascade guards TPL[tpl] entry shape (null/string/number/array) before destructure, emitting a maintainer-integrity error (WR-04 closed, commits 9e36477/2f3e601)
- [Phase 19]: [Phase 19-01] init rejects --format/--quiet as unknown options via a post-parse scoped check in the init branch (parseArgs options are global, not per-subcommand)
- [Phase 19]: [Phase 19-01] renderResult(result, {format, quiet, successLine}) extracted as a shared lint/build result-rendering helper (structurally identical branches per RESEARCH.md)
- [Phase 19]: [Phase 19-01] TDD RED/GREEN commits sequenced with GREEN code already in the working tree before either commit, since husky's pre-commit hook runs the full suite against disk state (not git index) and --no-verify is prohibited
- [Phase 19-02]: BSKV-01 closed by a real operator-run /build-skill session; all three targets (BSKL-01, BSKL-05, WR-01) verdict-ed conforms; WR-01 via the Step 5.1 pre-write path (Step 6 not exercised, acceptable per RESEARCH OQ1)
- [Phase 19-02]: build-skill Step 6 prefers repo-local node bin/motto.js lint when the checkout IS the Motto source repo; outdated-schema lint errors are a stale-binary signal to fall through, not real errors
- [Phase 19-02]: changelog skill ships as audience: private; dogfood tests updated count/skillCount 2->3 in the same commit as the skill (husky pre-commit runs suite against disk state)
- [Phase 20-01]: scripts/ deliberately excluded from package.json files allowlist -- prepare never fires for a nested-dependency install (verified live npm experiment, RESEARCH.md Pitfall 2)
- [Phase 20-01]: D-15's implicit-proof premise (pack-install-e2e exercises the prepare guard) is false as written -- closed with dedicated scripts/prepare-guard-check.mjs (git archive HEAD | tar -x into a .git-less tmpdir, then npm ci, assert exit 0)
- [Phase 20-02]: motto init [name] scaffolds into cwd, not a subdirectory -- pack-install-e2e.mjs mkdirs a nested empty e2e-project dir before invoking it, since consumerDir already has package.json/node_modules from the npm install step
- [Phase 20-02]: pack-install-e2e.mjs's run()/parseJsonOrFail() throw Error instead of calling process.exit(1) directly, so main()'s finally block still removes both tmp dirs on a failure path
- [Phase 20-03]: workflow_dispatch requires the workflow file on the default branch first -- used a PR-against-main (not merged) to trigger a live pull_request-event CI run instead
- [Phase 20-03]: CI PR opened solely to prove the gate live is closed without merging -- milestone branch merges to main at milestone completion via the standard ship flow

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 15 gate override (plan-phase 13a):** decision-coverage gate returned `could-not-parse` (15-CONTEXT.md decisions use bold-category bullets, not `- **D-NN:**` form; zero uncovered). Operator chose "Proceed anyway" after plan-checker Dimension 7 verified all context decisions honored in plans. Verify-phase should re-check decision compliance manually, not via the mechanical gate.
- **Phase 16 gate override (plan-phase 13a):** decision-coverage gate returned `could-not-parse` (16-CONTEXT.md decisions use category bullets, not `- **D-NN:**` form; zero uncovered). Operator chose "Proceed anyway" after planner and plan-checker both verified all locked decisions honored in the plan. Verify-phase should re-check decision compliance manually, not via the mechanical gate.
- **Cross-phase (per-phase check):** each phase must decide whether `motto init`'s scaffold needs updating (starter skill `template:`? example outputs file? marketplace/doc strings) — no speculative requirement; decide against real need.
- Carried from prior milestones: no CI (husky-only, CI-01, deferred); repo still private.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260703-nya | Close IN-02: extract shared fence-tracking helper in src/schema.js | 2026-07-03 | fdede19 | [260703-nya-close-in-02-extract-shared-fence-trackin](./quick/260703-nya-close-in-02-extract-shared-fence-trackin/) |
| 260703-occ | Close WR-04: guard TPL[tpl] entry shape before destructure in src/schema.js | 2026-07-03 | 9e36477, 2f3e601 | [260703-occ-close-wr-04-residual-shape-guard-tpl-ent](./quick/260703-occ-close-wr-04-residual-shape-guard-tpl-ent/) |

### Roadmap Evolution

- v0.0.5 roadmap created: Phase 14 (Template Mechanism — TMPL-01..05), Phase 15 (Field Validation & Integrity Guards — VAL-01..06), Phase 16 (build-skill & author-skill Retirement — BSKL-01..06), Phase 17 (Docs Audit — DOC-06..07). Numbering continues from v0.0.4 (ended at Phase 13). Coarse granularity → 4 phases, matching research's locked ordering (mechanism → validators → build-skill dogfood → docs-last). 19/19 requirements mapped, no orphans.
- Phase 18 added: Migrate base-spine **Role:** to <role> section tag

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| quick_task | 260630-vzh-review-fixes | missing SUMMARY.md (work verified complete: commits 7e740c8, 3fa2c6f, 1b3f4a2, ddcc45d; acknowledged at v0.0.4 close 2026-07-02) | v0.0.4 |
| Build feature | `--zip` output | Dropped (documented one-liner instead) | v0.0.3 |
| CLI | `--quiet`, `--format json` | Deferred | v0.0.3 |
| CI | GitHub Actions workflow | Deferred | v0.0.3 |

## Session Continuity

Last session: 2026-07-03T21:40:27.525Z
Stopped at: Completed 20-02-PLAN.md
Resume file: None

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
