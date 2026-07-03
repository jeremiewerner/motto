---
phase: 15-field-validation-integrity-guards
plan: 02
subsystem: validation
tags: [lint, fs, symlink, node-fs-promises, node-path, node-test]

# Dependency graph
requires:
  - phase: 15-field-validation-integrity-guards (plan 01)
    provides: "isOutputPathLexicallySafe(skillDirAbs, entry) pure predicate; validateSkill extended signature (skillNames Set, audienceMap Map); outputs/dependencies/allowed-tools lexical+format validation blocks"
provides:
  - "loadSkillAudiences(skillsDir, skillNames) — I/O pre-pass building Map<dirName, audience>, tolerant of per-file failure, never pushes to errors"
  - "checkOutputsFs(skillsDir, dirName, data, errors) — fs-dependent outputs: existence + symlink-escape containment check, reusing isOutputPathLexicallySafe as the fs-eligibility gate"
  - "processSkill/lintProject wiring: skillNameSet + audienceMap threaded through every validateSkill call; checkOutputsFs called after validateSkill inside the same D2-06 backstop"
  - "skills/release/SKILL.md declares allowed-tools (live dogfood proof of VAL-05)"
affects: [16-build-skill, 17-docs-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First-ever realpath()/relative() symlink-escape containment idiom in this codebase (checkOutputsFs) — stat existence check first, then realpath both root and target, then path.relative containment"
    - "Cross-skill pre-pass (loadSkillAudiences) modeled on loadSharedRefs's tolerant-of-absence shape, but stricter: swallows ALL per-file failures (not just ENOENT) to avoid double-reporting a skill's own parse error"
    - "fs-layer helper called from inside processSkill's existing outer try, sharing the same D2-06 unexpected-error backstop rather than adding a second try/catch layer"

key-files:
  created: []
  modified:
    - src/lint.js
    - test/lint.test.js
    - skills/release/SKILL.md

key-decisions:
  - "checkOutputsFs is called from inside processSkill's existing outer try (not wrapped in a second backstop) — its own per-entry try/catch blocks (stat, realpath+relative) already convert every failure mode to an error entry, so the outer D2-06 catch is redundant-but-safe defense in depth, matching the plan's stated preference for per-entry granularity"
  - "loadSkillAudiences pre-pass runs unconditionally for every discovered skill before the per-skill loop, even though only dependency-declaring skills consume the resulting audienceMap — re-reading small SKILL.md files a second time is the established build.js 'Option A — re-read' precedent, not a novel cost"
  - "allowed-tools on skills/release/SKILL.md authored as a 3-entry YAML array (Bash(node *), Bash(npm *), Bash(git *)) rather than a single space-separated string — exercises the array per-entry validator path live while genuinely covering every command family the procedure body invokes (node --test, npm version/publish/whoami/pack, git status/push)"

patterns-established:
  - "Symlink-escape containment: stat() for existence FIRST, then realpath() both the skill dir and the resolved target, then path.relative() containment (rel === '' or !starts-with('..') and !isAbsolute) — empirically confirmed via an adversarial symlink fixture in test/lint.test.js rather than trusted on research alone (RESEARCH Assumption A1)"

requirements-completed: [VAL-01, VAL-02, VAL-03, VAL-05, VAL-06]

coverage:
  - id: D1
    description: "outputs: file-existence check — a missing file inside the skill dir fails lint with a 'does not exist' error"
    requirement: "VAL-01"
    verification:
      - kind: unit
        ref: "test/lint.test.js#lintProject — outputs fs-layer (VAL-01) — (B) an outputs entry naming a missing file reports a \"does not exist\" error"
        status: pass
    human_judgment: false
  - id: D2
    description: "outputs: symlink-escape containment — a file inside the skill dir that is itself a symlink pointing outside it fails lint, empirically confirming RESEARCH Assumption A1"
    requirement: "VAL-01"
    verification:
      - kind: unit
        ref: "test/lint.test.js#lintProject — outputs fs-layer (VAL-01) — (C) a symlink escaping the skill dir reports an \"escapes the skill directory via symlink\" error"
        status: pass
    human_judgment: false
  - id: D3
    description: "dependencies: bare-kebab in-tree resolution operates over the full discovered skill set during lintProject (found + not-found cases)"
    requirement: "VAL-02"
    verification:
      - kind: unit
        ref: "test/lint.test.js#lintProject — dependencies cross-skill resolution (VAL-02)"
        status: pass
    human_judgment: false
  - id: D4
    description: "dependencies: public->private audience-direction guard fires during lintProject; private->public and public->public both pass"
    requirement: "VAL-03"
    verification:
      - kind: unit
        ref: "test/lint.test.js#lintProject — dependencies audience-direction guard (VAL-03)"
        status: pass
    human_judgment: false
  - id: D5
    description: "skills/release/SKILL.md declares allowed-tools and the live dogfood (lintProject(REPO_ROOT).ok === true, count === 2) stays green"
    requirement: "VAL-05"
    verification:
      - kind: unit
        ref: "test/dogfood.test.js#dogfood lint (DOG-03) — lintProject on REPO_ROOT returns ok:true with count=2"
        status: pass
    human_judgment: false
  - id: D6
    description: "loadSkillAudiences and checkOutputsFs are never-throw; an unreadable/malformed skill in the audience pre-pass is swallowed silently with no double-reporting of its own parse error"
    requirement: "VAL-06"
    verification:
      - kind: unit
        ref: "test/lint.test.js#lintProject — no double-reporting from loadSkillAudiences pre-pass (Pitfall 3)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-03
status: complete
---

# Phase 15 Plan 02: outputs fs-layer, cross-skill dependency resolution, release dogfood Summary

**Filesystem-dependent half of Phase 15's field validators landed in `src/lint.js` — `outputs:` existence/symlink-escape containment (via `stat`+`realpath`+`path.relative`) and a `loadSkillAudiences` cross-skill pre-pass feeding bare-dependency resolution and the public→private audience guard — with `skills/release/SKILL.md` gaining a live `allowed-tools` declaration proving the whole pipeline integrated and green.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-03T06:26:06Z
- **Completed:** 2026-07-03T06:30:00Z
- **Tasks:** 3 completed
- **Files modified:** 3 (`src/lint.js`, `test/lint.test.js`, `skills/release/SKILL.md`)

## Accomplishments
- Added `loadSkillAudiences(skillsDir, skillNames)` — a tolerant-of-failure pre-pass building `Map<dirName, audience>` by re-reading every discovered skill's frontmatter, swallowing ALL per-file read/parse failures silently to avoid double-reporting a skill's own error.
- Added `checkOutputsFs(skillsDir, dirName, data, errors)` — the fs-dependent half of VAL-01: reuses the exported `isOutputPathLexicallySafe` predicate to gate which `outputs:` entries are even eligible for an fs check, then `stat()`s for existence and `realpath()`+`path.relative()`s for symlink-escape containment.
- Wired `skillNameSet` (Set) and `audienceMap` (Map) through `processSkill`'s `validateSkill` call and through `lintProject`'s per-skill loop, so bare-kebab `dependencies:` resolution (VAL-02) and the audience-direction guard (VAL-03) operate over the full discovered skill tree, not an empty default.
- Added 9 new integration tests to `test/lint.test.js` covering outputs existence, outputs symlink-escape (empirically confirming RESEARCH's MEDIUM-confidence Assumption A1), cross-skill dependency resolution (found + not-found), the audience-direction guard (fail + both pass directions), and a malformed-SKILL.md fixture proving no double-reporting from the audience pre-pass.
- Landed the live dogfood: `skills/release/SKILL.md` now declares `allowed-tools` as a 3-entry array covering `Bash(node *)`, `Bash(npm *)`, `Bash(git *)` — the real command families the release procedure invokes — while `test/dogfood.test.js`'s `lintProject(REPO_ROOT).ok === true`/`count === 2` assertion stays green.

## Task Commits

Each task was committed atomically:

1. **Task 1: loadSkillAudiences pre-pass + checkOutputsFs async helper** - `5e6ac61` (feat)
2. **Task 2: wire cross-skill context + checkOutputsFs through processSkill/lintProject** - `3cfc93c` (feat)
3. **Task 3: fs-layer tests + release allowed-tools dogfood** - `c75285f` (test)

## Files Created/Modified
- `src/lint.js` — new `loadSkillAudiences` pre-pass and `checkOutputsFs` async helper; `processSkill` signature extended with `skillNames`/`audienceMap` parameters and a post-`validateSkill` `checkOutputsFs` call inside the existing outer try; `lintProject` builds `skillNameSet`/`audienceMap` after `discoverSkillNames` and before the per-skill loop; file-level and `processSkill` JSDoc updated to name the new helpers
- `test/lint.test.js` — new `makeSkillWithExtra` fixture helper; 4 new `describe` blocks (outputs fs-layer, dependencies cross-skill resolution, dependencies audience-direction guard, no-double-reporting) totaling 9 new tests
- `skills/release/SKILL.md` — added `allowed-tools: [Bash(node *), Bash(npm *), Bash(git *)]` to the frontmatter, no other keys or body content touched

## Decisions Made
- `checkOutputsFs` is called from inside `processSkill`'s existing outer `try` rather than given its own dedicated try/catch wrapper — its internal per-entry try/catch blocks (one around `stat`, one around the `realpath`+`relative` pair) already convert every realistic failure mode into a pushed error entry, so the outer D2-06 backstop is defense-in-depth, not the primary mechanism. This matches the plan's stated preference for per-entry granularity over a coarser catch-all.
- The audience pre-pass (`loadSkillAudiences`) runs unconditionally for every discovered skill, not just those that declare `dependencies:` — re-reading small SKILL.md files a second time is the codebase's established `build.js` "Option A — re-read" precedent (RESEARCH.md Pattern 5), not a novel workaround, and keeping the pre-pass unconditional avoids a two-pass dependency-detection scan that would add its own complexity for no measurable benefit at this project's scale.
- `release`'s `allowed-tools` value was authored as a 3-entry array (`Bash(node *)`, `Bash(npm *)`, `Bash(git *)`) rather than a single space-separated string, deliberately exercising the array per-entry validator branch (not just the string branch, already covered by unit tests in Plan 01) in the one live, non-fixture consumer of this field.

## Deviations from Plan

None — plan executed exactly as written. All three tasks' acceptance criteria were met without needing any Rule 1-4 auto-fixes or architectural detours.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 15 (Field Validation & Integrity Guards) is now fully complete: all 6 requirements (VAL-01..06) shipped across Plan 01 (pure lexical/format validators in `schema.js`) and Plan 02 (fs-dependent existence/symlink-escape checks + cross-skill context wiring in `lint.js`), plus the live `release` dogfood.
- `outputs:`/`dependencies:` remain fixtures-only in the live tree this phase (per CONTEXT.md's "Init scaffold & dogfood" decision) — Phase 16's `build-skill` is expected to be their first honest live consumer when it authors skills with real declared outputs and in-tree dependencies.
- Full test suite (185 tests) and dogfood (`ok:true`, `count:2`) green after every task commit; husky pre-commit hook confirms parity on each commit.
- No blockers for Phase 16 (build-skill & author-skill Retirement).

---
*Phase: 15-field-validation-integrity-guards*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/lint.js
- FOUND: test/lint.test.js
- FOUND: skills/release/SKILL.md
- FOUND: .planning/phases/15-field-validation-integrity-guards/15-02-SUMMARY.md
- FOUND commit: 5e6ac61
- FOUND commit: 3cfc93c
- FOUND commit: c75285f
