---
phase: "05-dogfood-regression-guard"
plan: "01"
subsystem: "test"
status: complete
tags:
  - dogfood
  - regression-guard
  - testing
  - NAME_KEBAB
dependency_graph:
  requires:
    - "04-01 (authored skill tree: authoring-a-skill, motto-project-setup, motto-release)"
  provides:
    - "DOG-03: permanent dogfood test guarding lint + build on every commit"
    - "DOG-04: NAME_KEBAB parity assertion (schema.js vs config.js)"
  affects:
    - "src/config.js (export added)"
    - "test/dogfood.test.js (new file)"
tech_stack:
  added: []
  patterns:
    - "node:test describe-level before()/after() for shared mkdtemp setup"
    - "REPO_ROOT anchor via import.meta.url (never process.cwd())"
    - "buildProject(tempDir) isolation (never buildProject(REPO_ROOT))"
    - "RegExp parity via .source + .flags (not === object identity)"
key_files:
  created:
    - "test/dogfood.test.js"
  modified:
    - "src/config.js (export added to NAME_KEBAB const, line 35)"
decisions:
  - "Export NAME_KEBAB from src/config.js (Option A over B: direct import is cleaner than text-parsing the source file)"
  - "All three describe blocks in one file (dogfood.test.js) — shared thematic purpose"
  - "DOG-04 first in file (synchronous, no I/O); lint second (read-only); build third (most I/O)"
  - "assert.ok(manifest.version) not strictEqual('0.0.2') — survives version bumps"
  - "assert.strictEqual(result.count, 3) + specific skill path assertions — guards both count AND names"
metrics:
  duration: "89s"
  completed_date: "2026-06-30"
  tasks_completed: 2
  files_changed: 2
  tests_before: 54
  tests_after: 65
  new_tests: 11
---

# Phase 05 Plan 01: Dogfood Regression Guard Summary

**One-liner:** Permanent dogfood test guarding Motto's own lint+build pipeline via `lintProject(REPO_ROOT)` in-place and `buildProject(mkdtemp copy)`, with DOG-04 NAME_KEBAB parity self-test comparing `.source`+`.flags` across schema.js and config.js.

## What Was Built

### src/config.js — Export NAME_KEBAB (DOG-04)

Added `export` keyword to `const NAME_KEBAB` at line 35, making the previously module-private constant a named export. No behavioral change to `loadConfig`; the regex literal and surrounding JSDoc are byte-for-byte unchanged. This one-character addition enables the DOG-04 parity test to directly import and compare the two regex definitions.

### test/dogfood.test.js — Three describe blocks

**Block 1: NAME_KEBAB parity (DOG-04)**
Synchronous test. Imports `NAME_KEBAB as schemaKebab` from `src/schema.js` and `NAME_KEBAB as configKebab` from `src/config.js`. Asserts `.source` and `.flags` are strictEqual — not the RegExp objects (identity comparison always fails for two different RegExp literals). This test fails the commit if either definition drifts.

**Block 2: dogfood lint (DOG-03)**
Single async `it`. Calls `lintProject(REPO_ROOT)` where `REPO_ROOT` is anchored via `resolve(dirname(fileURLToPath(import.meta.url)), '..')` — never `process.cwd()`. Asserts `ok === true`, `count === 3`, and `errors` deepStrictEquals `[]`. Read-only; no setup/teardown needed. The `count === 3` assertion deliberately fails if a skill is added, removed, or a stray fixture lands in `skills/`.

**Block 3: dogfood build (DOG-03)**
Uses describe-level `before()`/`after()` (mirrors `test/lint.test.js` pattern). In `before()`: `mkdtemp` with prefix `motto-dogfood-`, then `cp` (recursive) `skills/`, `shared/`, and `motto.yaml` from REPO_ROOT into the temp dir. Calls `buildProject(tempDir)` — NEVER `buildProject(REPO_ROOT)` (which would wipe the repo's own `dist/`). In `after()`: guarded `rm(tempDir, { recursive: true, force: true })` runs even on test failure.

Nine `it` blocks assert:
- `ok:true`, `skillCount:3`, `bucketCount:2`, `errors:[]`
- `stat()` presence: `dist/public/authoring-a-skill/SKILL.md`, `dist/public/motto-project-setup/SKILL.md`, bundled `references/skill-schema.md` in each public skill
- `dist/private/motto-release/SKILL.md` present; `dist/private/motto-release/references/` absent (ENOENT via `assert.rejects`)
- `public/.claude-plugin/plugin.json`: `name === 'motto-skills'`, `assert.ok(version)`, `assert.ok(description)`
- `private/.claude-plugin/plugin.json`: `name === 'motto-private'`, `assert.ok(version)`

## Test Results

| Metric | Value |
|--------|-------|
| Tests before | 54 |
| Tests after | 65 |
| New tests | 11 (1 DOG-04 + 1 lint + 9 build) |
| fail | 0 |
| Pre-commit hook | Passes (husky runs `npm test`; dogfood test auto-discovered) |

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 0fd1523 | feat(05-01): add dogfood regression guard and export NAME_KEBAB from config.js | src/config.js, test/dogfood.test.js |

## Deviations from Plan

None — plan executed exactly as written. Both tasks were committed together in a single atomic commit (as specified: "Commit the export + test together; full `npm test` must be green"). The test was GREEN on first write as expected (current tree already passes all guards).

## Threat Mitigation Verification

| Threat | Mitigation Status |
|--------|------------------|
| T-05-01: buildProject dist/ wipe | MITIGATED — `buildProject(tempDir)` only; `REPO_ROOT` used read-only for lint |
| T-05-02: temp-dir leak on failure | MITIGATED — `after()` with `if (tempDir)` guard runs regardless of test outcome |
| T-05-03: NAME_KEBAB drift | MITIGATED — DOG-04 asserts `.source` + `.flags` strictEqual on every commit |
| T-05-04: wrong skill silently substituted | MITIGATED — specific `stat()` paths assert authoring-a-skill, motto-project-setup, motto-release by name |

## Known Stubs

None. All assertions are wired to real data from the live skill tree.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `/Users/jeremie/Projects/motto/src/config.js` FOUND (export added)
- `/Users/jeremie/Projects/motto/test/dogfood.test.js` FOUND (created)
- Commit 0fd1523 FOUND (`git log --oneline -1`)
- `node --test` exits 0; tests 65, fail 0
