---
gsd_state_version: 1.0
milestone: v0.0.4
milestone_name: Project Bootstrap
current_phase: 13
status: verifying
stopped_at: Completed 13-01-PLAN.md
last_updated: "2026-07-02T13:51:51.367Z"
last_activity: 2026-07-02
last_activity_desc: Phase 13 complete
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 100
current_phase_name: "Address tech debt: plugins.public reserved-word enforcement + init/CLI review items"
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-01)

**Core value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Current focus:** Phase 13 — Address tech debt: plugins.public reserved-word enforcement + init/CLI review items

## Current Position

Phase: 13
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-07-02 — Phase 13 complete

## Performance Metrics

**Velocity:**

- Total plans completed: 12
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 7. npm Packaging & Release Flow | 0 | - | - |
| 8. Marketplace Distribution | 0 | - | - |
| 9. Documentation | 0 | - | - |
| 07 | 1 | - | - |
| 09 | 1 | - | - |
| 08 | 1 | - | - |
| 10 | 3 | - | - |
| 11 | 1 | - | - |
| 12 | 3 | - | - |
| 13 | 2 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 07 P01 | 253 | 3 tasks | 4 files |
| Phase 08 P01 | 64s | 3 tasks | 1 files |
| Phase 09 P01 | 8 | 2 tasks | 1 files |
| Phase 10 P01 | 8min | 2 tasks | 2 files |
| Phase 10 P02 | 6min | 2 tasks | 2 files |
| Phase 10 P03 | 1min 20s | 2 tasks | 2 files |
| Phase 11 P01 | 6min | 3 tasks tasks | 2 files files |
| Phase 12 P01 | 12min | 2 tasks | 1 files |
| Phase 12 P02 | 5min | 2 tasks | 1 files |
| Phase 12 P03 | 5min | 1 tasks | 1 files |
| Phase 13 P01 | 2min | 4 tasks | 4 files |
| Phase 13 P02 | 5min | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v0.0.3]: D-05 — npm pack --dry-run --json scripted assertion machine-checks NPM-04; process.exit(1) on any leak outside bin/src/dist/public/

- [v0.0.3]: D-04 — version lifecycle script auto-syncs motto.yaml via npm_new_version (smoke-test confirmed for npm@11.11.0)

- [v0.0.3]: D-01 — MIT LICENSE created; tarball is public so license is warranted

- [v0.0.3]: Install mechanism RESOLVED — npm (CLI) + self-hosted marketplace (skills). No `.zip` build feature.
- [v0.0.3]: CLI publishes as scoped public `@jeremiewerner/motto` (`motto` unscoped is taken); `bin` invokes as `motto`; `publishConfig.access: public`; `files` allowlist = `bin/`, `src/`, `dist/public/`.
- [v0.0.3]: One `npm publish` ships both the CLI and the bundled `dist/public/` skills plugin; marketplace `source: npm` points at the published package with a `dist/public/` skills override and `strict: false`.
- [v0.0.3]: `.claude-plugin/marketplace.json` lives inside the repo root (no separate marketplace repo).
- [v0.0.3]: Claude Desktop's Code tab IS Claude Code → marketplace/`~/.claude/skills/` cover it; symlink + zip are documented shell one-liners, not features (`--zip` dropped, YAGNI).
- [v0.0.3]: `release` skill fixes — real `npm publish` flow, `git push --follow-tags`, manual `motto.yaml` bump.
- [v0.0.2]: Output = standard Agent Skills (verbatim SKILL.md copy, no content stripping)
- [v0.0.2]: `audience` binary (public|private); private plugin emitted only when private skills exist and `plugins.private` is set
- [Phase ?]: Templates stored as inline strings in src/init.js (not skills/ or src/templates/) — avoids Motto's own dogfood skill count and dist/public/
- [Phase ?]: Scaffolded .gitignore/marketplace.json deliberately differ from this repo's own root files — dist/public/ stays trackable; marketplace.json uses bare relative-path source
- [Phase 10]: mkdtemp random basename is not guaranteed NAME_KEBAB-valid (can include uppercase); tests needing a deterministic effective name nest a fixed kebab subdirectory or pass an explicit name
- [Phase 10]: Pre-commit hook runs full suite against working tree (not staged files) — TDD RED commits are impossible in this repo; fix applied to disk before the RED test commit lands so both task commits see a green working tree while git diffs still separate test-add from fix
- [Phase 11]: Help routing folded into the existing dispatch if/else chain (no early process.exit()) so no new no-arg process.exit() calls were introduced beyond the pre-existing parseArgs catch block — Plan explicitly forbade new no-arg process.exit() calls
- [Phase 11]: sub === undefined single branch covers both D-01 (bare --help/-h) and D-03 (bare motto, no flags) since both render identical global help to stdout exit 0 — Simplifies dispatch chain, avoids duplicated help-printing branches
- [Phase 11]: Task 2 plan verify script assumed motto init <path> scaffolds AT that path; current init CLI wiring only scaffolds into cwd (positional is the name field, out of CLIX-04 scope). Verified equivalent behavior via mkdir+cd and scaffoldProject(targetDir, name) API directly instead — init target-dir semantics unchanged this phase; CLIX-04 covers lint/build [path] only
- [Phase ?]: E2E ship-flow ending uses generic <owner>/<repo>/<plugin> placeholders rather than jeremiewerner/motto (D-02 confines the real repo name to the pre-existing Add-the-marketplace/Install-Mottos-skills sections)
- [Phase ?]: Task 1 salvage-check found README.md (Plan 01) already covers all 6 setup-project SKILL.md sections — no README edit needed in Plan 02
- [Phase ?]: skills/setup-project/ deleted and test/dogfood.test.js count sync landed in single atomic commit b437c84 (SC3/D-09) after amending an initial split-staging mistake
- [Phase ?]: Used code review WR-02/WR-04 exact replacement text verbatim for README install-placeholder and --force overwrite disclosure; left WR-01/WR-03 untouched (deferred, out of Phase 12 scope)
- [Phase 13-01]: DEBT-01 fix stayed doc/comment-only — no RESERVED check added to src/config.js or src/init.js for plugins.public/plugins.private — 13-RESEARCH.md Pitfall 1: over-strictness would reject spec-conformant plugin names like claude-notes-sync
- [Phase 13-01]: DEBT-05 verified already-resolved (Phase 11 commit d35aba7) with no code change — plan's literal grep count of 4 is a false positive from comment-text matches, confirmed via line-by-line inspection — bin/motto.js has zero process.exit() call sites in executable code; all 4 grep matches are inside comments documenting the never-process.exit() convention
- [Phase ?]: [Phase 13-02]: Checkpoint result - /motto-private:release does not resolve in the maintainer's live Claude Code session (no .claude/skills/ symlink, no motto-private marketplace entry); README.md line 173 now references skills/release/SKILL.md by file path instead of a slash command

### Pending Todos

None yet.

### Blockers/Concerns

- Carried debt from v0.0.2: npm-publish stub in `release` skill (closed by REL-01 this milestone); no CI (husky-only, deferred).
- **SHIP-GATED (Phase 8 SC2):** GitHub-form `/plugin marketplace add jeremiewerner/motto` fails until `.claude-plugin/marketplace.json` lands on the repo default branch (merge `gsd/v0.0.3-milestone` → main) AND the repo is public (T-08-04, Phase 9). Local-path add is verified; manifest is correct. Deployment step, not a defect.
- **Phase 7 retro needed:** Phase 7 was marked "complete" but `@jeremiewerner/motto` was NOT actually on npm (404) until the maintainer manually ran `npm publish` on 2026-07-01, and `v0.0.3` was never git-tagged (only v0.0.1/v0.0.2 existed). The `release` flow's publish+tag steps did not execute during Phase 7. FIXED (partial): `v0.0.3` annotated tag now created locally at `1cf4ea8` (push deferred to ship). Still: retro why the release script never ran, so "complete" == "published+tagged" next milestone.
- **Naming note:** public plugin renamed `motto-skills` → `motto` (namespace `/motto:*`) mid-Phase-8; motto.yaml `plugins.private` is still `motto-private` (asymmetric, acceptable — private bucket only emits when private skills exist).

### Roadmap Evolution

- v0.0.3 roadmap created: Phase 7 (npm Packaging & Release Flow), Phase 8 (Marketplace Distribution), Phase 9 (Documentation). Numbering continues from v0.0.2 (ended at Phase 6).
- v0.0.4 roadmap created: Phase 10 (Project Scaffold `motto init` — INIT-01..06), Phase 11 (CLI Ergonomics `--help`/`[path]` — CLIX-03..04), Phase 12 (Docs & Cleanup — DOC-04..05). Numbering continues from v0.0.3 (ended at Phase 9). Coarse granularity: research's template/orchestrator risk split folded into Phase 10's plans rather than separate roadmap phases so each phase owns user-observable requirements. 10/10 requirements mapped.
- Phase 13 added: Address tech debt: plugins.public reserved-word enforcement + init/CLI review items

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Build feature | `--zip` output | Dropped (documented one-liner instead) | v0.0.3 |
| CLI | `--quiet`, `--format json`, `[path]` arg | Deferred | v0.0.3 |
| CI | GitHub Actions workflow | Deferred | v0.0.3 |
| Templates | TMPL-01 concrete-template validation | Deferred | v0.0.3 |

## Quick Tasks Completed

| Date | Task ID | Description | Commits |
|------|---------|-------------|---------|
| 2026-06-30 | 260630-uxc-standardize-skill-names | Renamed skills to verb-first names (author-skill, setup-project, release); updated dogfood test | fc1f553, 3d7972d |
| 2026-06-30 | 260630-vzh-review-fixes | Closed REVIEW-01..11: never-throw hardening (safeToJS + name-type guard), XML regex tightened, node-shape stray detection, B18 cascade-stop proof, NAME_KEBAB single-sourced from schema.js, skill-schema.md corrected (75 tests pass, lint clean) | 7e740c8, 3fa2c6f, 1b3f4a2, ddcc45d |

## Session Continuity

Last session: 2026-07-02T13:42:53.279Z
Stopped at: Completed 13-01-PLAN.md
Resume file: 
None
