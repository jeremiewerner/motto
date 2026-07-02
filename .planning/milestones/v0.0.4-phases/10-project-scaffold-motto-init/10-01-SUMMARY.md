---
phase: 10-project-scaffold-motto-init
plan: 01
subsystem: cli
tags: [scaffolding, cli, filesystem, node-stdlib]

# Dependency graph
requires:
  - phase: 09-documentation
    provides: shipped v0.0.3 (npm + self-hosted marketplace distribution) — the marketplace.json shape and NAME_KEBAB single-source discipline this plan reuses
provides:
  - "src/init.js — scaffoldProject(targetDir, {name, force}) never-throw orchestrator"
  - "bin/motto.js init subcommand wired with --force flag"
  - "motto init [name] [--force] scaffolds skills/hello-world/, shared/references/.gitkeep, motto.yaml, .gitignore, .claude-plugin/marketplace.json"
affects: [10-02-scaffold-dogfood-test, 11-cli-ergonomics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Never-throw orchestrator returning { ok, created, errors, reason? } — mirrors src/build.js"
    - "Single-sourced NAME_KEBAB validation (import from schema.js only, never redefine)"
    - "execFileSync array-args form for git config lookup (no shell spawned)"
    - "Validate-then-guard-then-write ordering — name validated before any template interpolation"

key-files:
  created:
    - src/init.js
  modified:
    - bin/motto.js

key-decisions:
  - "Templates stored as inline strings inside src/init.js (not skills/ or src/templates/) — avoids polluting Motto's own dogfood skill count and dist/public/"
  - "marketplace.json uses bare relative-path source string ('./dist/public/'), not this repo's own npm-source object form"
  - ".gitignore ignores only node_modules/ and dist/private/ — dist/public/ stays trackable for consumers"
  - "--force skips only the empty-dir check; zero delete operations anywhere in init.js"

patterns-established:
  - "scaffoldProject never-throw orchestrator convention for future src/*.js modules"
  - "IGNORABLE_ENTRIES allowlist (.git, .DS_Store) for empty-dir guards"

requirements-completed: [INIT-01, INIT-03, INIT-04, INIT-05, INIT-06]

coverage:
  - id: D1
    description: "motto init [name] scaffolds skills/hello-world/SKILL.md, shared/references/.gitkeep, motto.yaml, .gitignore, .claude-plugin/marketplace.json into an empty (or .git/.DS_Store-only) dir, then prints a checkmark tree + next-steps"
    requirement: "INIT-01"
    verification:
      - kind: unit
        ref: "Task 1 verify smoke script (node -e ... scaffoldProject happy path + invalid-name path) — smoke ok"
        status: pass
      - kind: integration
        ref: "Task 2 verify CLI script (node bin/motto.js init hello-proj in empty tmp dir) — cli-ok"
        status: pass
    human_judgment: false
  - id: D2
    description: "motto init in a non-empty directory refuses, lists offending entries capped at 5 + 'and N more', prints 'use --force to scaffold anyway', exit code 1"
    requirement: "INIT-04"
    verification:
      - kind: unit
        ref: "manual adversarial script — not-empty guard returns offending:['existing.txt']"
        status: pass
      - kind: integration
        ref: "Task 2 verify CLI script — second `motto init hello-proj` in now-non-empty dir exits 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "Invalid effective name is rejected with the schema.js rule violated plus a sanitized 'try: motto init <suggestion>' hint; nothing is written"
    requirement: "INIT-05"
    verification:
      - kind: unit
        ref: "Task 1 verify smoke script — name 'My Project' returns reason:'invalid-name', suggestion:'my-project'"
        status: pass
      - kind: integration
        ref: "Task 2 verify CLI script — `motto init 'Bad Name'` prints 'try: motto init bad-name'"
        status: pass
    human_judgment: false
  - id: D4
    description: "motto init --force overwrites only the fixed scaffold paths and never deletes unrelated files"
    requirement: "INIT-04"
    verification:
      - kind: unit
        ref: "manual force-overwrite script — keep-me.txt survives scaffoldProject(dir, {force:true})"
        status: pass
      - kind: integration
        ref: "manual CLI force test — keep.txt survives `motto init hello-proj --force`"
        status: pass
    human_judgment: false
  - id: D5
    description: "Scaffolded motto.yaml name/plugins.public and marketplace.json name/plugins[0].name all equal the same validated effective name; marketplace.json source is bare './dist/public/' with no owner.email; .gitignore keeps dist/public/ trackable"
    requirement: "INIT-03, INIT-06"
    verification:
      - kind: unit
        ref: "manual content-shape script — mkt.plugins[0].source === './dist/public/', owner.email absent, .gitignore contains dist/private/ and no bare dist/ line"
        status: pass
    human_judgment: false
  - id: D6
    description: "motto init demo-project && motto lint && motto build all exit 0 (manual spot-check; permanent dogfood guard is plan 10-02)"
    verification:
      - kind: manual_procedural
        ref: "manual shell chain in a scratch temp dir — init/lint/build all printed success and exit 0"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-02
status: complete
---

# Phase 10 Plan 01: Project Scaffold `motto init` Core Summary

**`motto init [name] [--force]` scaffolds a complete, lint-and-build-clean skills project (starter skill, shared refs dir, motto.yaml, .gitignore, marketplace.json) via a new never-throw `src/init.js` orchestrator wired into `bin/motto.js`.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-02T05:53:00Z (approx — no explicit clock start captured before file reads)
- **Completed:** 2026-07-02T06:01:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `src/init.js` exports `scaffoldProject(targetDir, { name, force })`: validates the effective name against `NAME_KEBAB` (imported from `src/schema.js`, single source) BEFORE building any template; guards non-empty target dirs with a `.git`/`.DS_Store` allowlist unless `--force`; resolves a best-effort git-config owner name; writes all 5 scaffold paths and returns `{ ok, created, errors, reason? }` without ever throwing.
- `bin/motto.js` gained an `init` dispatch branch (lazy `import('../src/init.js')`, mirroring the `build` branch's lazy-import style), a `--force` boolean flag on the existing shared `parseArgs` options object, and both usage-string literals updated from `<lint|build>` to `<init|lint|build>`.
- Scaffolded content: `skills/hello-world/SKILL.md` (audience: public, minimal H1 + `**Role:**` body, no `shared_references` key), `shared/references/.gitkeep`, `motto.yaml` (name/plugins.public from the same validated value), `.gitignore` (ignores only `node_modules/` and `dist/private/`, keeping `dist/public/` trackable), `.claude-plugin/marketplace.json` (bare relative `./dist/public/` source string, no `owner.email`).
- Manual end-to-end spot-check confirmed `motto init demo-project && motto lint && motto build` all exit 0 in a fresh temp directory.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/init.js — scaffoldProject orchestrator, guards, and inline templates** - `fa2ef3b` (feat)
2. **Task 2: Wire the `init` subcommand into bin/motto.js** - `93acc12` (feat)

**Plan metadata:** (this commit, following SUMMARY.md write)

## Files Created/Modified
- `src/init.js` - `scaffoldProject` never-throw orchestrator; internal helpers `listNonIgnorableEntries`, `resolveGitOwnerName`, `suggestKebabName`, `writeScaffold`; `IGNORABLE_ENTRIES` constant; inline scaffold templates for SKILL.md, motto.yaml, .gitignore, marketplace.json
- `bin/motto.js` - new `init` dispatch branch (before `lint`), `force: { type: 'boolean' }` parseArgs option, both usage-string literals updated to `<init|lint|build>`

## Decisions Made
- Templates stored as inline strings in `src/init.js` rather than a `src/templates/` directory or files under `skills/` — avoids accidentally adding a 4th skill to Motto's own dogfood count and `dist/public/` (per RESEARCH anti-pattern warning), and keeps the npm `files` allowlist unchanged (`src/` already ships).
- `.gitignore`/marketplace.json content deliberately DIFFERS from this repo's own root `.gitignore`/`marketplace.json` (contrast case, per PATTERNS.md): scaffolded `.gitignore` keeps `dist/public/` trackable; scaffolded `marketplace.json` uses the bare relative-path `source` string form instead of this repo's npm-source object form.
- Owner placeholder text is `'Your Name'` (RESEARCH A1 — Claude's Discretion, any clear placeholder satisfies intent).
- `motto.yaml` scaffold defaults: `version: "0.1.0"`, generic one-line description shared verbatim with marketplace.json's plugin description (single `SCAFFOLD_DESCRIPTION` constant, avoiding Pitfall 2's double-computation risk).

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<action>`, `<behavior>`, `<verify>`, and `<acceptance_criteria>` blocks were implemented and verified as specified; no Rule 1-4 auto-fixes were needed.

## TDD Gate Compliance

Task 1 carries `tdd="true"` in the plan frontmatter, but the plan's own design defers all persistent test-file creation (`test/init.test.js`, `test/init-dogfood.test.js`) to plan 10-02 ("Comprehensive init tests land in plan 10-02" — plan `<verification>` section) and scopes Task 1's `<files>` to `src/init.js` only. Task 1's verification mechanism is an inline `node -e` smoke script embedded in the plan's `<verify>` block, not a committed `node --test` file, so there is no separate `test(...)` RED commit possible within this task's file scope. RED/GREEN was still exercised procedurally: the smoke and behavior-check scripts were run and confirmed passing only after `src/init.js` existed (they would fail against a missing module), then a single `feat(10-01)` commit landed the implementation. Formal RED/GREEN/REFACTOR test-file gate commits are deferred to plan 10-02 by explicit plan design, not an execution gap.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `src/init.js` and the `init` CLI branch are in place and manually verified (smoke script, adversarial-input checks, force-overwrite checks, and a full `init && lint && build` spot-check all passed).
- Plan 10-02 can now add `test/init.test.js` (unit coverage) and the permanent `test/init-dogfood.test.js` scaffold-dogfood guard (INIT-02) against this implementation without further src/init.js changes expected.
- No blockers.

---
*Phase: 10-project-scaffold-motto-init*
*Completed: 2026-07-02*

## Self-Check: PASSED

All claimed files exist (src/init.js, bin/motto.js, SUMMARY.md) and both task commit hashes (fa2ef3b, 93acc12) are present in git log.
