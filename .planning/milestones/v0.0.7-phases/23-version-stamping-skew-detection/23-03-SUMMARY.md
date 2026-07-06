---
phase: 23-version-stamping-skew-detection
plan: 03
subsystem: init
tags: [version-stamping, scaffold, VER-01]
dependency-graph:
  requires: [src/version.js (getOwnVersion, from 23-01)]
  provides: [scaffolded motto.yaml carries mottoVersion (tool version, distinct from project version)]
  affects: [src/init.js, test/init.test.js]
tech-stack:
  added: []
  patterns:
    - "Conditional line construction (mottoVersionLine = typeof toolVersion === 'string' ? ... : '') mirrors config.js's absence-is-valid contract — never write mottoVersion: null"
    - "Tests derive expected version live via getOwnVersion(), never a hardcoded literal (grep-verified)"
key-files:
  created: []
  modified:
    - src/init.js
    - test/init.test.js
decisions:
  - "mottoVersion line placed immediately after the project version line but rendered as a fully distinct key/value, never merged with or derived from version"
  - "Null-fallback omits the mottoVersion line entirely rather than writing an empty/null value — matches config.js's optional-field contract from 23-02"
  - "This repo's own root motto.yaml deliberately left unstamped (D-R4) — only NEW scaffolds via scaffoldProject() get the mottoVersion line"
metrics:
  duration: 10min
  completed: 2026-07-06
status: complete
---

# Phase 23 Plan 03: Init Scaffold Version Stamping Summary

Stamped the running tool's live version into newly-scaffolded `motto.yaml` files via a new `mottoVersion` field, kept fully distinct from the existing project `version` field, with null-safe omission and zero impact on this repo's own root `motto.yaml` (VER-01, D-R4).

## What Was Built

**Task 1 — `src/init.js`:** Added `import { getOwnVersion } from './version.js';` alongside the existing `NAME_KEBAB` import from `schema.js`. In `writeScaffold`, computed `toolVersion = getOwnVersion()` once and built a conditional `mottoVersionLine` — a `mottoVersion: "<value>"` line when `toolVersion` is a string, or an empty string when `getOwnVersion()` returns `null`. The line is interpolated into the existing motto.yaml template string, adjacent to but visually and semantically distinct from the `version: "0.1.0"` project-version line. No new try/catch needed — `getOwnVersion()` already never throws.

**Task 2 — `test/init.test.js`:** Added `import { getOwnVersion } from '../src/version.js';` and a new test in the existing "scaffoldProject content shape" describe block. The test scaffolds into a mkdtemp dir (reusing the existing fixture), reads `motto.yaml`, and asserts:
- `mottoVersion: "<live tool version>"` is present, where the expected value comes from calling `getOwnVersion()` inside the test itself (never a hardcoded literal like `"0.0.6"`).
- The project `version: "0.1.0"` line is still present and unchanged.
- The two lines are at distinct string offsets (never conflated into one key).

## Verification

- `node --test test/init.test.js`: 34/34 passing (33 pre-existing + 1 new).
- Inline scaffold smoke check from the plan (`scaffoldProject` into a mkdtemp dir, assert `mottoVersion` + live version both present): exits 0.
- `grep -nE '"0\.0\.[0-9]"' test/init.test.js`: no matches — no hardcoded Motto-version literal introduced.
- `grep -c mottoVersion motto.yaml` (this repo's own root file): `0` — confirmed unstamped, satisfying D-R4.
- Full pre-commit test suite (husky hook) ran clean on both commits.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — this plan closes T-23-06 (tool/project version conflation) and T-23-07 (null → invalid YAML) exactly as scoped in the plan's own threat register; no new surface introduced.

## Self-Check: PASSED

- `src/init.js` modified: FOUND (getOwnVersion import + mottoVersionLine logic present).
- `test/init.test.js` modified: FOUND (new mottoVersion assertion test present, 34 tests passing).
- Commit `ff73ea0` (feat): FOUND in `git log --oneline`.
- Commit `9b6ab3f` (test): FOUND in `git log --oneline`.
- `motto.yaml` (own repo root): confirmed 0 `mottoVersion` occurrences.
