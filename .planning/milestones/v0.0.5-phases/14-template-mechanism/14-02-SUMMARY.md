---
phase: 14-template-mechanism
plan: 02
subsystem: dogfood
tags: [template-mechanism, dogfood, release-skill, node-test]

# Dependency graph
requires:
  - phase: 14-01
    provides: "src/templates.js pure-data registry, hasClosedSection scanner, validateSkill() template cascade enforcing template: procedure"
provides:
  - "skills/release/SKILL.md carrying template: procedure with live <process>/<success_criteria> sections (TMPL-01 end-to-end proof)"
  - "dogfood assertion proving verbatim tag survival through the build copy (TMPL-03)"
affects: [15-field-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live dogfood proof pattern: exercise a new schema mechanism on Motto's own shipping skill tree, not just unit fixtures — extends the existing DOG-03 lintProject(REPO_ROOT)/buildProject(tempDir) harness with a targeted content assertion"

key-files:
  created: []
  modified:
    - skills/release/SKILL.md
    - test/dogfood.test.js

key-decisions:
  - "release (a procedural maintainer checklist) is the dogfood target for template: procedure — locked in 14-CONTEXT.md as a natural-fit skill, not chosen ad hoc during execution"
  - "success_criteria content authored net-new (no existing release content mapped to it) rather than repurposing an existing section, per the plan's explicit instruction"
  - "New dogfood assertion added to the existing 'dogfood build' describe block rather than a new describe block, keeping the tempDir build harness and before/after lifecycle untouched"

requirements-completed: [TMPL-01, TMPL-03]

coverage:
  - id: D1
    description: "skills/release/SKILL.md frontmatter carries template: procedure alongside unchanged name/description/audience keys, no shared_references key introduced"
    requirement: "TMPL-01"
    verification:
      - kind: unit
        ref: "test/dogfood.test.js#dogfood lint (DOG-03) — lintProject(REPO_ROOT) ok:true/count:2/errors:[]"
        status: pass
    human_judgment: false
  - id: D2
    description: "release body wraps Step 1-6 in line-anchored <process>/</process> and adds a net-new <success_criteria>/</success_criteria> checklist, with H1 title and Role line preserved verbatim"
    requirement: "TMPL-01"
    verification:
      - kind: unit
        ref: "node bin/motto.js lint (manual verify command) — reported '✓ 2 skills OK'"
        status: pass
    human_judgment: false
  - id: D3
    description: "The built dist/private/release/SKILL.md retains all four template tags verbatim after Motto's build copy (no content stripping)"
    requirement: "TMPL-03"
    verification:
      - kind: unit
        ref: "test/dogfood.test.js#dogfood build (DOG-03) — 'dist/private/release/SKILL.md retains <process>/<success_criteria> tags verbatim (TMPL-01/03)'"
        status: pass
    human_judgment: false
  - id: D4
    description: "No regression to the existing dogfood count:2/errors:[] assertions or the full 131+ test suite"
    verification:
      - kind: unit
        ref: "node --test (full suite) — 153/153 pass, 0 fail (up from 152 after 14-01)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-03
status: complete
---

# Phase 14 Plan 02: Template Mechanism Dogfood Summary

**The `release` skill adopts `template: procedure` on Motto's own live tree — `<process>`/`<success_criteria>` sections wrap the existing maintainer checklist, lint stays clean, and a new dogfood assertion proves the tags survive the verbatim build copy unchanged.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-03
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- `skills/release/SKILL.md` frontmatter gained `template: procedure` (placed after `audience: private`), with `name`, `description`, and `audience` preserved unchanged and no `shared_references` key introduced.
- The existing `## Step 1` – `## Step 6` maintainer checklist is now wrapped in a line-anchored `<process>` / `</process>` pair.
- A net-new `<success_criteria>` / `</success_criteria>` checklist was authored (tests pass, version/tarball/publish/tag/doc conditions) — no existing content was repurposed for it.
- The H1 `# Releasing Motto` title and the `**Role:**` line are preserved verbatim, avoiding the Pitfall 4 cascade into unrelated dogfood failures.
- `test/dogfood.test.js` gained one new `it(...)` inside the existing "dogfood build" describe block, reading the built `dist/private/release/SKILL.md` from the `tempDir` build output and asserting all four tags (`<process>`, `</process>`, `<success_criteria>`, `</success_criteria>`) are present via line-anchored regexes — proving the tags survive Motto's verbatim build copy.
- The existing `lintProject(REPO_ROOT)` assertions (`ok:true`, `count: 2`, `errors: []`) were left completely unchanged and continue to pass, now implicitly covering `release`'s live `template: procedure` cascade.
- Full suite went from 152 (end of 14-01) to 153 passing tests, 0 failures.

## Task Commits

Each task was committed individually:

1. **Task 1: Adopt template: procedure on the live release skill** — `6b8fcf9` (feat) — `skills/release/SKILL.md`. Verified via `node bin/motto.js lint` (`✓ 2 skills OK`) and full `node --test` (152/152 green, pre-14-02-test-addition baseline).
2. **Task 2: Assert live template enforcement + verbatim tag survival in dogfood test** — `8f965eb` (test) — `test/dogfood.test.js`. Verified via `node --test test/dogfood.test.js` (10/10 green) and full `node --test` (153/153 green).

## Files Created/Modified

- `skills/release/SKILL.md` — Adds `template: procedure` frontmatter key; wraps Step 1–6 in `<process>`/`</process>`; adds a net-new `<success_criteria>`/`</success_criteria>` checklist; H1 title, Role line, and existing frontmatter keys preserved verbatim.
- `test/dogfood.test.js` — Adds one `it(...)` in the "dogfood build (DOG-03)" describe block asserting the built `dist/private/release/SKILL.md` retains all four template tags verbatim; existing assertions (including `lintProject` ok:true/count:2/errors:[] and the no-`references/`-dir check) unchanged.

## Decisions Made

- `release` (a procedural maintainer checklist) is the locked dogfood target for `template: procedure`, per `14-CONTEXT.md` — a natural structural fit (numbered steps + clear done-conditions), not an ad hoc choice.
- `<success_criteria>` content is authored net-new rather than mapped from existing prose, since no existing release-skill section already expressed "done conditions" as a checklist.
- The new dogfood assertion was added inside the existing "dogfood build" describe block (reusing the `tempDir` build harness and `before`/`after` lifecycle already in place) rather than introducing a new describe block or restructuring the harness.

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their `<action>` and `<acceptance_criteria>` blocks without requiring bug fixes, missing-functionality additions, or architectural changes.

## Issues Encountered

None. `node bin/motto.js lint` and `node --test` were both clean on the first attempt after each task's edit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The template mechanism (`src/templates.js` + `validateSkill()` cascade from 14-01) is now proven end-to-end on Motto's own live tree, not just unit fixtures — this is the last plan in Phase 14 (wave 2 of 2, `depends_on: ["14-01"]`).
- Phase 15 (Field Validation & Integrity Guards — `outputs:`/`dependencies:`/`allowed-tools` validation) can proceed on a codebase where the template cascade and its dogfood proof are both settled and unregressed.
- No blockers.

---
*Phase: 14-template-mechanism*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: skills/release/SKILL.md (template: procedure, <process>/<success_criteria> present)
- FOUND: test/dogfood.test.js (new verbatim-tag-survival assertion)
- FOUND: commit 6b8fcf9 (Task 1)
- FOUND: commit 8f965eb (Task 2)
- `node --test` (full suite): 153 pass, 0 fail
