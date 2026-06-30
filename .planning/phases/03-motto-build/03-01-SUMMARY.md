---
phase: 03-motto-build
plan: "01"
subsystem: build
status: complete
tags: [build, packaging, dist, plugin-json, audience-routing, symlinks, tdd]
dependency_graph:
  requires: [src/lint.js, src/config.js, src/frontmatter.js, src/schema.js]
  provides: [src/build.js, bin/motto.js(build-branch), dist/]
  affects: [bin/motto.js]
tech_stack:
  added:
    - fs.cp with verbatimSymlinks:true (Node 16.15+) — verbatim directory copy preserving relative symlinks
    - fs.rm {recursive,force} — safe wipe of dist/ (force:true silences ENOENT)
  patterns:
    - Option A data reuse: buildProject re-reads motto.yaml + skill dirs after lint gate (no lint.js refactor)
    - Collect-don't-throw: pre-pack errors accumulated in buildErrors[] before wipe
    - process.exitCode not process.exit(1) — preserves stdout flush on failure
key_files:
  created:
    - src/build.js — buildProject(projectRoot) → {ok, outDir, errors, skillCount, bucketCount}
    - test/build.test.js — 15 tests covering BUILD-01..06 + CLI-02
    - .gitignore — ignores generated dist/ output
  modified:
    - bin/motto.js — build stub replaced with real buildProject call
decisions:
  - "Option A (re-read): build re-reads motto.yaml + skill dirs from disk after lint gate; no refactor of lint.js"
  - "Pre-pack checks (collision D3-07, private-contradiction D3-12) run BEFORE the wipe (D3-02 extended)"
  - "fs.cp verbatimSymlinks:true is MANDATORY — default/dereference:false silently rewrite relative symlinks to absolute paths on macOS Node 24"
  - "bucketsUsed Set controls both routing and plugin.json emission; public always in set (D3-10)"
  - "process.exitCode on failure, never process.exit(1) (mirrors lint branch)"
metrics:
  duration: "5 minutes"
  completed: "2026-06-30"
  tasks_completed: 3
  files_changed: 4
---

# Phase 03 Plan 01: motto build Summary

**One-liner:** `motto build` implemented as lint-gate + verbatim copy pipeline routing skills to `dist/<audience>/` with per-bucket `plugin.json` containing `{name, version, description}`.

## What Was Built

This plan delivers the complete `motto build` command. `buildProject(projectRoot)` is a pure async function that:

1. Calls `lintProject(projectRoot)` as a gate — any lint failure short-circuits with the exact same errors the `motto lint` command would print; `dist/` is untouched.
2. Re-reads `motto.yaml` via `loadConfig` and scans `skills/` to load each skill's frontmatter (audience + shared_references). No refactor of lint.js needed (Option A).
3. Runs ALL pre-pack checks before the wipe:
   - Collision check (D3-07): if a declared `shared_references` entry exists as a local `references/<ref>.md` in the source skill, fails with a named error.
   - Private-contradiction check (D3-12): if any skill has `audience:private` but `plugins.private` is unset in motto.yaml, fails with a named error.
4. Only after ALL checks pass: wipes `dist/` with `fs.rm({recursive,force})`.
5. Packs each skill into `dist/<audience>/<name>/` using `fs.cp({recursive,verbatimSymlinks:true})` — the `verbatimSymlinks:true` flag is mandatory; the default/`dereference:false` silently rewrites relative symlinks to absolute paths on macOS Node 24.
6. Bundles declared `shared_references` into each skill's `references/` after the cp (idempotent `mkdir` guard required since cp won't create a missing `references/` dir).
7. Emits `dist/<audience>/.claude-plugin/plugin.json` for each bucket: `{name: plugins.<audience>, version, description}` — exactly three keys.
8. Returns `{ok, outDir, errors, skillCount, bucketCount}`.

`bin/motto.js` build branch: replaced the "not yet implemented" stub with a real call. On success, prints `✓ built <outDir> — N skills, M plugin(s)`. On failure, renders `✗ <skill>: <message>` per error, sets `process.exitCode = 1`.

`.gitignore` created to exclude the generated `dist/` directory.

## Acceptance Criteria Coverage

| SC | Description | Status |
|----|-------------|--------|
| SC1 | lint-passing project → exit 0, each skill verbatim at `dist/<audience>/<name>/SKILL.md`, siblings of `.claude-plugin/` | PASS |
| SC2 | each `shared_references` entry copied into `dist/<audience>/<name>/references/<ref>.md` | PASS |
| SC3 | each bucket has `.claude-plugin/plugin.json` with `name`, `version`, `description`; `version` always present | PASS |
| SC4 | private bucket emitted only when ≥1 `audience:private` skill AND `plugins.private` set; else only `dist/public/` | PASS |
| SC5 | lint-failing project → exit 1, same lint diagnostics, writes nothing to `dist/` | PASS |

## TDD Cycle Notes (RED→GREEN per task)

All 3 tasks followed RED→GREEN cycles:

**Task 1 (happy-path):**
- RED: `ERR_MODULE_NOT_FOUND` — `src/build.js` didn't exist. All 7 tests failed.
- GREEN: After implementing `src/build.js` with lint gate, verbatim cp, shared-ref bundling, and public plugin.json. 7/7 pass.
- Committed: `e017442`

**Task 2 (safe-failure checks):**
- The collision check (D3-07) and private-contradiction check (D3-12) were included in Task 1's implementation as part of the same pre-wipe section (D3-02 load-bearing order). Task 2's 4 tests were therefore GREEN immediately when written.
- No second RED phase needed — Task 1 already implemented the correct behavior. This is documented here as a deviation (early implementation, not a regression).
- Committed: `a12c296` (tests only, implementation was in e017442)

**Task 3 (private bucket routing):**
- RED: Task 1 hardcoded `dist/public/` for all skills and `bucketCount: 1`. Three routing tests failed (ENOENT on `dist/private/`, bucketCount assertion 1 !== 2).
- GREEN: After generalizing to `bucketsUsed` Set + per-audience routing + loop over bucketsUsed for plugin.json emission. 4/4 Task 3 tests pass.
- Committed: `49fbe7f`

## Deviations from Plan

### Auto-implemented deviation

**[Rule 2 - Missing Critical Functionality] Pre-pack checks implemented in Task 1 instead of Task 2**

- **Found during:** Task 1 implementation
- **Issue:** The collision check (D3-07) and private-contradiction check (D3-12) are logically part of the same pre-wipe section as the lint gate. Deferring them to Task 2 would require a second pass over the code with no architectural benefit.
- **Fix:** Implemented D3-07 and D3-12 checks in Task 1's `src/build.js` alongside the lint gate (Step 3 in load-bearing order). The Task 2 implementation step became a tests-only commit.
- **Impact:** Task 2's 4 tests were GREEN when written (no artificial RED phase). Task 1's commit included all pre-pack checks. No regressions.
- **Files modified:** `src/build.js`

## Known Stubs

None. All data flows from real sources (readFile, readdir, parseFrontmatter, loadConfig). No placeholder values.

## Threat Flags

No new threat surface beyond the plan's STRIDE threat register (T-03-01..T-03-SC). The implementation is read-only from `skills/` + `shared/references/` and write-only to `dist/` — all paths under `projectRoot`. Skill names come from OS `readdir` output. Ref names are validated by the lint gate before reaching build's I/O.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `src/build.js` | FOUND |
| `test/build.test.js` | FOUND |
| `bin/motto.js` | FOUND |
| `.gitignore` | FOUND |
| commit `e017442` (Task 1) | FOUND |
| commit `a12c296` (Task 2) | FOUND |
| commit `49fbe7f` (Task 3) | FOUND |
| Full `node --test` suite | 53/53 PASS |
