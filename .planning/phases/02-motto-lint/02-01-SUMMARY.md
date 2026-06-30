---
phase: 02-motto-lint
plan: 01
subsystem: lint-cli
status: complete
tags: [lint, cli, orchestration, node-test, tdd]
dependency_graph:
  requires:
    - 01-01-SUMMARY.md  # parseFrontmatter API
    - 01-02-SUMMARY.md  # validateSkill + NAME_KEBAB
    - 01-03-SUMMARY.md  # loadConfig API
  provides:
    - lintProject(projectRoot) exported from src/lint.js
    - motto CLI binary at bin/motto.js
  affects:
    - package.json (bin field added)
tech_stack:
  added:
    - bin/motto.js (node:util parseArgs, top-level await ESM)
  patterns:
    - per-file error-isolated async scan with shared error accumulator
    - error-shape normalization (lift parseFrontmatter/loadConfig errors to add skill field)
    - process.exitCode (never process.exit(1)) to avoid stdout truncation
key_files:
  created:
    - src/lint.js
    - bin/motto.js
    - test/lint.test.js
  modified:
    - package.json
decisions:
  - lintProject returns { ok, errors, count } — count surfaces skill count for CLI ✓ line
  - test+impl committed together (single commit) due to husky pre-commit constraint
  - processSkill uses return (not continue) since it is a helper function, not an inline loop
metrics:
  duration: 3min
  completed: 2026-06-30
  tasks_completed: 3
  files_created: 3
  files_modified: 1
---

# Phase 02 Plan 01: motto lint + CLI binary Summary

**One-liner:** Filesystem orchestrator (lintProject) + thin CLI shell (bin/motto.js) wiring Phase 1 pure validators into a runnable `motto lint` command.

## What Was Built

### src/lint.js — lint orchestrator

Exports `async function lintProject(projectRoot) → { ok, errors, count }`.

Internal helpers (not exported):
- `processConfig` — reads `motto.yaml` via `loadConfig`; errors labelled `'motto.yaml'` (D2-09/10)
- `loadSharedRefs` — scans `shared/references/*.md`; ENOENT → empty Set (D2-07/08)
- `discoverSkillNames` — `readdir` + filter non-hidden dirs + `localeCompare` sort (D2-03/04)
- `processSkill` — per-skill read + `parseFrontmatter` + `validateSkill`; D2-06 backstop catch

Error aggregation order (locked by D2-10):
1. Config errors first under `skill:'motto.yaml'`
2. Skill errors in alphabetical-by-dirName order

Zero-skills handling (D2-13): `null` from ENOENT and `[]` from empty dir both map to a single `"no skills found"` error; early return with `ok:false`.

Error-shape normalization (RESEARCH Pattern 5):
- `parseFrontmatter` errors: `{ message }` → lifted to `{ skill: dirName, message }` (Pitfall 2)
- `loadConfig` errors: `{ message }` → lifted to `{ skill: 'motto.yaml', message }` (Pitfall 3)
- `validateSkill` errors: already `{ skill, message }` — pushed directly

The `count` field equals the number of discovered skills (0 when no skills found), used by bin/motto.js for the `✓ N skills OK` line.

### bin/motto.js — CLI shell

Thin entry point: `#!/usr/bin/env node`, executable bit set, `package.json` bin field wired.

- `parseArgs({ allowPositionals: true, strict: true })` in try/catch (Pitfall 4: strict throws on `--help`)
- Subcommand dispatch:
  - `lint` → `lintProject(process.cwd())` → format result → `process.exitCode` (not `process.exit(1)`, Pitfall 7)
  - `build` → "not yet implemented" stub (Phase 3)
  - anything else (or no subcommand) → usage line to stderr, exit 1 (D2-16)
- `process.exit()` (no arg) only in the parseArgs catch after writing stderr output — safe

### test/lint.test.js — behavior suite

10 `node:test` cases across 8 `describe` blocks. All import `lintProject` directly — no binary spawning (keeps husky suite fast).

| # | Behavior | Decision |
|---|----------|----------|
| 1 | Happy path: ok:true, errors:[] | D2-11 |
| 2 | Error collection across all skills | LINT-06, D2-06 |
| 3 | Alphabetical ordering (zeta created before alpha) | LINT-07, D2-03 |
| 4 | Per-file isolation: malformed YAML + valid skill | LINT-07, D2-06 |
| 5 | Missing SKILL.md attributed to dir name | D2-05 |
| 6 | Config errors precede skill errors in result.errors | D2-09, D2-10 |
| 7A | No skills found: skills/ absent | D2-13 |
| 7B | No skills found: skills/ empty dir | D2-13 |
| 8A | Shared ref resolved (shared/references/my-ref.md exists) | D2-07 |
| 8B | Shared ref unresolved (shared/ absent → empty Set) | D2-08 |

## Commits

| Hash | Content |
|------|---------|
| `0e26576` | Tasks 1+2: test/lint.test.js + src/lint.js (RED observed locally then GREEN) |
| `d602e5f` | Task 3: bin/motto.js + package.json bin field |

## Deviations from Plan

### Husky Constraint: Tasks 1+2 Committed Together

**Found during:** Task 1 (as anticipated by the plan's `<critical_commit_constraint>`)

**Issue:** The plan calls for Task 1 (RED test) and Task 2 (GREEN implementation) as separate commits. The husky pre-commit hook runs `npm test` (full `node --test` suite). A standalone failing test commit is blocked.

**Fix:** RED state was verified locally first (`ERR_MODULE_NOT_FOUND` for `src/lint.js` confirmed tests exercise real behavior). Once GREEN (38/38 passing), Tasks 1+2 were committed together in one commit (`0e26576`).

**Impact:** Two commits instead of three; plan intent (TDD evidence) is preserved via documentation. Exactly as Phase 1 plan 01-01 handled the same constraint.

## Stub Scan

No stubs. All code paths are implemented and verified:
- `lintProject` wires real validators (no mock returns)
- `bin/motto.js` dispatches to real `lintProject` (no hardcoded output)
- The only stub is `build` subcommand → "not yet implemented", which is intentional (Phase 3 scope, documented in plan)

## Threat Surface Scan

No new threat surface beyond what the plan's threat register already covers:
- T-02-01 (path construction with `join(projectRoot, ...)`) — mitigated: `dirName` from `readdir`, never user-supplied
- T-02-02 (shared_references resolution) — mitigated: Phase 1 `validateSkill` safe-basename check intact
- T-02-SC (no new npm installs) — confirmed: zero new dependencies

## Self-Check: PASSED

Files exist:
- `src/lint.js` found
- `bin/motto.js` found
- `test/lint.test.js` found
- `package.json` bin field present

Commits exist:
- `0e26576` found in git log
- `d602e5f` found in git log

Full suite: 38/38 tests pass (`node --test`)
