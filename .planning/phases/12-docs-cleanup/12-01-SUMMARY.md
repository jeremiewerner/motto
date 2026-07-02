---
phase: 12-docs-cleanup
plan: 01
subsystem: docs
tags: [readme, cli-docs, motto-init, marketplace]

# Dependency graph
requires:
  - phase: 10-project-scaffold-motto-init
    provides: "motto init CLI + scaffoldProject() templates (src/init.js) that this plan documents verbatim"
  - phase: 11-cli-ergonomics-help-path
    provides: "motto --help / [path] CLI surface (bin/motto.js GLOBAL_HELP/LINT_HELP/BUILD_HELP) that this plan mirrors"
provides:
  - "README.md scaffold section rewritten around `motto init` (no manual motto.yaml prose)"
  - "New README '## Ship your plugin' section documenting the commit/push/marketplace-add/install flow"
  - "Zero setup-project references in README.md (clears the way for Plan 02's skill deletion)"
affects: [12-02 (skills/setup-project deletion — depends on this commit landing first per ROADMAP SC3)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Doc-as-mirror: README scaffold/motto.yaml examples copied verbatim from src/init.js template strings, not hand-written approximations"

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "E2E example's final ship-flow steps use generic <owner>/<repo>/<plugin> placeholders (not jeremiewerner/motto) since that stretch of the walkthrough demonstrates shipping the reader's OWN scaffolded project, not installing Motto's own marketplace — jeremiewerner/motto stays confined to the pre-existing 'Add the marketplace' / 'Install Motto's skills' sections per D-02"
  - "E2E install-output comment reads generically ('your project's skills ... are now available') rather than naming /motto:author-skill, since the placeholder-based ending has no basis for hardcoding a Motto-specific skill name — the underlying goal (zero setup-project mentions, D-11) is satisfied either way"

patterns-established:
  - "Ship-flow git steps documented as prose, not fenced git commands (D-03) — deliberate departure from the exact-command convention used in the rest of README, to avoid over-prescribing repo/branch conventions"

requirements-completed: [DOC-04, DOC-05]

coverage:
  - id: D1
    description: "README scaffold section leads with `motto init my-project`, shows the real scaffolded tree (hello-world, .gitignore, .claude-plugin/marketplace.json), and shows the scaffolded motto.yaml verbatim instead of manual create-motto.yaml prose"
    requirement: "DOC-05"
    verification:
      - kind: other
        ref: "grep -q 'motto init my-project' README.md && grep -q 'hello-world' README.md && grep -q 'A skills project scaffolded by motto init' README.md && grep -q 'name: my-project' README.md && grep -q '.claude-plugin' README.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "New '## Ship your plugin' section documents build → commit dist/public/ + push public (prose) → consumer /plugin marketplace add <owner>/<repo> → /plugin install, with a marketplace.json reassurance line"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "grep -q '^## Ship your plugin' README.md && grep -q '<owner>/<repo>' README.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "Zero setup-project references remain anywhere in README.md"
    requirement: "DOC-05"
    verification:
      - kind: other
        ref: "! grep -q 'setup-project' README.md"
        status: pass
    human_judgment: false
  - id: D4
    description: "Install-the-CLI lists init/lint/build in order and mentions motto --help; [path] annotates lint/build usages"
    verification:
      - kind: other
        ref: "grep -q 'motto --help' README.md && test $(grep -c '\\[path\\]' README.md) -ge 2"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-02
status: complete
---

# Phase 12 Plan 01: README Ship-Your-Plugin + Scaffold Rewrite Summary

**Rewrote README.md's scaffold section around `motto init` (verbatim src/init.js output) and added a new "Ship your plugin" section documenting build → commit/push → marketplace-add → install, retiring every `setup-project` reference.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-02T10:13:18Z
- **Tasks:** 2
- **Files modified:** 1 (README.md)

## Accomplishments
- `## Install the CLI` now lists `init`/`lint [path]`/`build [path]` in order and mentions `motto --help`
- `## Scaffold a project` leads with `motto init my-project`, shows the real scaffolded tree (`skills/hello-world/`, `.gitignore`, `.claude-plugin/marketplace.json`), and shows the scaffolded `motto.yaml` verbatim (`SCAFFOLD_DESCRIPTION` string) instead of hand-written manual instructions
- New `## Ship your plugin` section (placed between Validate-and-build and Publish-to-npm) documents the full distribution flow with `<owner>/<repo>` placeholders, prose git steps, and a marketplace.json reassurance line
- `## End-to-end example` step 2 now uses `motto init my-project` (CLI) instead of the deleted `/motto:setup-project` slash command, and the example ends with the ship flow instead of installing Motto's own marketplace
- `setup-project` row removed from `## Install Motto's skills` table; Contents/ToC updated with the new section and renumbered

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite Install-the-CLI + Scaffold sections around motto init, add [path]/--help touch-ups** - `cf1aebe` (docs)
2. **Task 2: Add Ship your plugin section, update E2E example, remove setup-project from README, fix ToC** - `c7b0b76` (docs)

## Files Created/Modified
- `README.md` - Install-the-CLI/Scaffold rewrite, new Ship-your-plugin section, E2E example update, skills table row removal, ToC update

## Decisions Made
- E2E example's ship-flow ending uses generic `<owner>/<repo>`/`<plugin>` placeholders rather than Motto's own `jeremiewerner/motto` — that stretch of the walkthrough demonstrates shipping the reader's own scaffolded project (D-02 confines the real repo name to the pre-existing "Add the marketplace"/"Install Motto's skills" sections)
- The E2E install-output comment was written generically ("your project's skills ... are now available") instead of naming `/motto:author-skill`, since the placeholder-based ending has no basis for a Motto-specific skill reference — the enforced goal (zero `setup-project` mentions, D-11) holds either way and was verified by `! grep -q 'setup-project' README.md`

## Deviations from Plan

None - plan executed as written. One planner-text ambiguity was resolved via judgment call (see Decisions Made above: the "final install-output comment" instruction assumed a Motto-specific ending that D-08's placeholder-flow requirement superseded); this is a wording resolution, not a scope or correctness deviation, and all automated acceptance criteria from the plan pass.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 can now proceed to delete `skills/setup-project/` and update `test/dogfood.test.js` counts — README.md carries zero references to the skill being removed, satisfying ROADMAP SC3's "README that replaces setup-project must land before the skill is deleted" ordering constraint.
- Full test suite (133/133) still passes after both commits (docs-only change; no source files touched).

---
*Phase: 12-docs-cleanup*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: README.md
- FOUND: .planning/phases/12-docs-cleanup/12-01-SUMMARY.md
- FOUND: cf1aebe (Task 1 commit)
- FOUND: c7b0b76 (Task 2 commit)
