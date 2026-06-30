---
phase: 05-dogfood-regression-guard
verified: 2026-06-30T00:00:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
---

# Phase 5: Dogfood Regression Guard Verification Report

**Phase Goal:** A permanent automated test guards the self-hosted tree on every commit, and the NAME_KEBAB sync tech debt is closed.
**Verified:** 2026-06-30
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `test/dogfood.test.js` lints repo root in-place, anchored via `import.meta.url` (not `process.cwd()`), asserting clean lint + skill count 3 | VERIFIED | Line 16: `const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')`. `process.cwd()` appears only in a comment on line 14, never as actual code. Lint block at lines 35-45 asserts `ok:true`, `count === 3`, `errors === []`. |
| 2 | The same test builds an isolated `mkdtemp` copy (never `buildProject(REPO_ROOT)`) and asserts the expected `dist/` artifacts — public + private buckets, bundled shared ref, per-bucket `plugin.json` | VERIFIED | Line 54: `mkdtemp(join(tmpdir(), 'motto-dogfood-'))`. Line 61: `buildProject(tempDir)`. `buildProject(REPO_ROOT)` appears only in a comment (line 56, explicitly flagging it as forbidden). 9 `it` blocks assert specific artifact paths, counts, and plugin.json content. |
| 3 | A self-test asserts `NAME_KEBAB` identical between `src/schema.js` and `src/config.js` via `.source` + `.flags` (not `===` object identity), failing if definitions ever drift | VERIFIED | `src/config.js` line 35: `export const NAME_KEBAB = ...` (export present). `src/schema.js` line 33: `export const NAME_KEBAB = ...`. Test lines 21-30 compare `schemaKebab.source === configKebab.source` and `schemaKebab.flags === configKebab.flags` with strictEqual. DOG-04 test passes green. |
| 4 | `npm test` passes green (65 tests) and the husky pre-commit hook runs `npm test` on every commit | VERIFIED | `npm test` output: `tests 65, pass 65, fail 0`. `.husky/pre-commit` contains `npm test`. |

**Score:** 4/4 truths verified

### Mutation Test Evidence (Guard Is Real, Not Always-Green)

**Mutation (a) — broken skill directory:**
Temporarily renamed `skills/authoring-a-skill` to `skills/authoring-a-skill-BROKEN`.
Result: `node --test test/dogfood.test.js` produced **9 failures** (lint reported `name "authoring-a-skill" must equal its folder name "authoring-a-skill-BROKEN"`; build cascaded with artifact ENOENT errors). Exit code non-zero.
Restoration: `mv skills/authoring-a-skill-BROKEN skills/authoring-a-skill`. Git confirmed clean.

**Mutation (b) — NAME_KEBAB regex divergence:**
Temporarily changed `src/config.js` NAME_KEBAB pattern to prefix with `BROKEN` (regex source diverged from schema.js).
Result: `node --test test/dogfood.test.js` produced **10 failures** (DOG-04 parity test fired first: `NAME_KEBAB .source is identical in schema.js and config.js`; lint/build also failed because the broken regex rejected valid plugin names in motto.yaml).
Restoration: `git checkout -- src/config.js`. Git confirmed clean.

**After all mutations restored:** `npm test` — `tests 65, pass 65, fail 0`, working tree clean.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `test/dogfood.test.js` | Three describe blocks: DOG-04 parity + DOG-03 lint + DOG-03 build | VERIFIED | File exists, 137 lines, all three describe blocks present with 11 `it` assertions total. |
| `src/config.js` | `export` keyword added to `NAME_KEBAB` const | VERIFIED | Line 35: `export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;` — export present, regex unchanged. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/config.js export NAME_KEBAB` | `test/dogfood.test.js import configKebab` | Named ESM import on line 11 | VERIFIED | `import { NAME_KEBAB as configKebab } from '../src/config.js';` — without the export, this would throw SyntaxError at module load. Test passes green, confirming the wiring is live. |
| `REPO_ROOT anchor (import.meta.url)` | `lintProject(REPO_ROOT)` in lint block | `resolve(dirname(fileURLToPath(...)), '..')` on line 16 | VERIFIED | REPO_ROOT resolves to the repo root regardless of invocation directory. Lint test passes and reads the real authored tree. |
| `mkdtemp copy of skills/ + shared/ + motto.yaml` | `buildProject(tempDir)` | `cp` of three inputs into `tempDir` before build call | VERIFIED | Lines 58-61 copy exactly `skills/`, `shared/`, `motto.yaml` — no `dist/` copied. `buildProject(tempDir)` uses the copy exclusively. Repo's `dist/` is never wiped. |

### Data-Flow Trace (Level 4)

Not applicable — `test/dogfood.test.js` is a test file, not a data-rendering component. Both `lintProject` and `buildProject` operate on the real skill tree and temp copy respectively, producing live results (not static data).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green, 65 tests | `npm test` | `tests 65, pass 65, fail 0, duration 125ms` | PASS |
| Broken skill triggers guard failure | `mv skills/authoring-a-skill skills/authoring-a-skill-BROKEN && node --test test/dogfood.test.js` | Exit 1, 9 failures (lint + 8 build) | PASS |
| Diverged NAME_KEBAB triggers DOG-04 failure | Edit config.js regex, run `node --test test/dogfood.test.js` | 10 failures, DOG-04 fires first | PASS |
| Working tree clean after all mutations | `git status` | `nothing to commit, working tree clean` | PASS |

### Probe Execution

No conventional `scripts/*/tests/probe-*.sh` probes declared for this phase. N/A.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DOG-03 | 05-01-PLAN.md | `node:test` dogfood test: lint REPO_ROOT in-place + build `mkdtemp` copy; clean lint + dist/ artifacts; runs every commit via husky | SATISFIED | `test/dogfood.test.js` blocks 2 and 3 implement this exactly. `.husky/pre-commit` runs `npm test` which auto-discovers the test. Mutation test confirms it fails on a broken tree. |
| DOG-04 | 05-01-PLAN.md | Self-test: NAME_KEBAB identical between `schema.js` and `config.js` | SATISFIED | `src/config.js` now exports `NAME_KEBAB`. Test block 1 (DOG-04) asserts `.source` and `.flags` strictEqual. Mutation test confirms it fails on diverged regex. |

Both DOG-03 and DOG-04 are marked `[x]` complete in `REQUIREMENTS.md`.

### Anti-Patterns Found

Scanned `test/dogfood.test.js` and `src/config.js` (the two files modified in this phase).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, `PLACEHOLDER` markers. No hardcoded version strings in the test (`assert.ok(manifest.version)` instead of `strictEqual('0.0.2')`). No empty return stubs. No process.cwd() used as code.

**Package.json dependencies:** Only `yaml: ^2.9.0` as runtime dependency. `husky: ^9.1.7` as devDependency (pre-existing). Zero new dependencies added by this phase.

### Human Verification Required

None. All success criteria are programmatically verifiable and verified.

### Gaps Summary

No gaps. All four ROADMAP success criteria are VERIFIED with direct codebase evidence. The mutation tests confirm the guard is not a tautology — it fails on both a broken skill tree and a diverged NAME_KEBAB regex. The implementation commit `0fd1523` is present in git log.

---

_Verified: 2026-06-30_
_Verifier: Claude (gsd-verifier)_
