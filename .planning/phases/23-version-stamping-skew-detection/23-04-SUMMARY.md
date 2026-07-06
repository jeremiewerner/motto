---
phase: 23-version-stamping-skew-detection
plan: 04
subsystem: cli
tags: [lint, build, cli, skew-detection, version-stamping]

# Dependency graph
requires:
  - phase: 23-version-stamping-skew-detection (plan 01)
    provides: src/version.js (getOwnVersion, parseVersion, checkSkew — never-throw)
  - phase: 23-version-stamping-skew-detection (plan 02)
    provides: config.js optional mottoVersion validation (malformed → errors[] entry)
provides:
  - lintProject/buildProject additive warnings[] field on every return path
  - direction-aware mottoVersion skew advisory wired end-to-end (lint/build/CLI)
  - renderResult ⚠ stderr rendering, independent of ok/quiet, absent from json mode
  - integration proof: skew both directions, no-stamp silence, malformed-stamp
    no-double-report, never-rewrite guard, plugin.json regression, non-blocking
    exit-code proof via spawned CLI
affects: [24-upgrade-path-ledger-and-policy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Option A — re-read config inline in lintProject (mirrors src/build.js:98-99) rather than widening processConfig's return shape"
    - "Skew gated on parseVersion(config?.mottoVersion) truthy so a malformed stamp (already an errors[] entry) is never double-reported as a warning"
    - "warnings[] rendered to stderr as ⚠ lines, unconditional relative to ok/quiet branching, absent in --format json (JSON already serializes warnings verbatim)"

key-files:
  created: []
  modified:
    - src/lint.js
    - src/build.js
    - bin/motto.js
    - test/lint.test.js
    - test/build.test.js
    - test/cli.test.js
    - test/dogfood.test.js

key-decisions:
  - "lintProject re-reads motto.yaml inline (Option A) rather than widening processConfig's return shape, per the plan's committed approach mirroring build.js:98-99"
  - "Skew check gated on parseVersion(config.mottoVersion) truthy — malformed stamps never double-reported as both an error and a warning"
  - "buildProject computes its own skew warning independently at STEP 2 from the already-lint-validated config, not derived from lintResult's internals"
  - "renderResult's ⚠ loop runs in text mode only, unconditional relative to ok/quiet, never duplicated in --format json"
  - "Never-rewrite (VER-06) proven with byte-identical motto.yaml assertions for both lintProject and buildProject"
  - "This repo's own motto.yaml stays unstamped (D-R4) — dogfood.test.js extended to assert zero skew warnings on the live REPO_ROOT tree"

patterns-established:
  - "Additive result fields (warnings[]) default to [] on every return path, including early-return branches, so consumers never see undefined"

requirements-completed: [VER-02, VER-04, VER-06]

coverage:
  - id: D1
    description: "lintProject/buildProject return additive warnings[] populated by checkSkew(config.mottoVersion, getOwnVersion()), gated on a well-formed stamp so malformed values are never double-reported"
    requirement: "VER-02"
    verification:
      - kind: unit
        ref: "test/lint.test.js#lintProject — warnings[] additive field (VER-02/VER-04 wiring)"
        status: pass
      - kind: unit
        ref: "test/build.test.js#buildProject — warnings[] additive field (VER-02/VER-04 wiring)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No-stamp projects (including this repo's own tree) stay silent and crash-free"
    requirement: "VER-04"
    verification:
      - kind: unit
        ref: "test/lint.test.js#lintProject — dedicated no-stamp fixture (VER-04, D-R4)"
        status: pass
      - kind: integration
        ref: "test/dogfood.test.js#dogfood lint (DOG-03) — lintProject on REPO_ROOT returns ok:true with count=3"
        status: pass
    human_judgment: false
  - id: D3
    description: "lint/build never rewrite motto.yaml — byte-identical before/after both operations"
    requirement: "VER-06"
    verification:
      - kind: unit
        ref: "test/lint.test.js#lint/build never rewrite motto.yaml (VER-06, D-01/D-06) — lintProject does not modify motto.yaml content"
        status: pass
      - kind: unit
        ref: "test/build.test.js#lint/build never rewrite motto.yaml (VER-06, D-01/D-06) — buildProject does not modify motto.yaml content"
        status: pass
    human_judgment: false
  - id: D4
    description: "renderResult prints ⚠ warning lines to stderr independent of ok/quiet; exit code unaffected by a skew warning (non-blocking, VER-02)"
    requirement: "VER-02"
    verification:
      - kind: unit
        ref: "test/cli.test.js#CLI skew warning is non-blocking (VER-02) — lint/build on a skewed-but-valid project: exit code 0, ⚠ line on stderr"
        status: pass
    human_judgment: false

# Metrics
duration: 13min
completed: 2026-07-06
status: complete
---

# Phase 23 Plan 4: Skew Advisory End-to-End Wiring Summary

**Direction-aware mottoVersion/tool skew advisory wired through lintProject/buildProject/CLI as a non-blocking, additive `warnings[]` array — never flips `ok`/exit code, never double-reports a malformed stamp, never rewrites motto.yaml**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-06T06:24:10Z
- **Completed:** 2026-07-06T06:37:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- `lintProject` re-reads `motto.yaml` inline (Option A precedent from `build.js:98-99`) to compute a skew warning via `checkSkew(config.mottoVersion, getOwnVersion())`, gated on `parseVersion(config.mottoVersion)` being truthy so a malformed stamp is reported exactly once (as an error, never also as a warning)
- `buildProject` computes the same skew warning independently at STEP 2 from its already lint-validated config; `plugin.json`'s `version` key stays sourced from `config.version`, never `mottoVersion`
- `bin/motto.js`'s `renderResult` prints `⚠ <skill>: <message>` lines to stderr, unconditional relative to `ok`/`--quiet`, absent from `--format json` (which already serializes `warnings` verbatim)
- Integration fixtures prove all four success criteria: skew both directions, no-stamp silence (dedicated temp-dir fixture + live REPO_ROOT dogfood proof), malformed-stamp no-double-report, never-rewrite (byte-identical motto.yaml), and non-blocking exit code via a real spawned CLI process

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire checkSkew into lintProject and buildProject warnings[]** - `e9d9765` (feat, includes accompanying test additions — husky pre-commit staged both together)
2. **Task 2: Render warnings[] as ⚠ stderr lines in renderResult** - `709699b` (feat)
3. **Task 3: Integration + never-rewrite + no-stamp fixtures** - `a0682e2` (test)

**Plan metadata:** (this commit) `docs: complete plan`

## Files Created/Modified
- `src/lint.js` - `lintProject` re-reads config inline, computes gated skew warning, adds `warnings[]` to every return path
- `src/build.js` - `buildProject` computes skew warning at STEP 2, adds `warnings[]` to lint-fail/pre-pack-fail/success return paths
- `bin/motto.js` - `renderResult` renders `⚠` warning lines to stderr in text mode, independent of `ok`/`quiet`
- `test/lint.test.js` - warnings[] wiring tests, no-stamp dedicated fixture, never-rewrite guard
- `test/build.test.js` - warnings[] wiring tests, plugin.json regression, never-rewrite guard
- `test/cli.test.js` - spawned-CLI non-blocking skew proof (exit 0 + ⚠ on stderr)
- `test/dogfood.test.js` - extended live `lintProject(REPO_ROOT)` assertion to require zero skew warnings

## Decisions Made
- Followed the plan's committed "re-read" approach verbatim rather than widening `processConfig`'s return shape
- `checkSkew` gating implemented exactly as specified: `parseVersion(config?.mottoVersion)` truthy is the single guard preventing double-report
- Test commit for Task 1 landed combined with the feat commit (husky's pre-commit hook staged both test and src changes together on the first successful commit attempt, after an initial commit attempt correctly failed while GREEN code was not yet present — matching the phase's established RED/GREEN sequencing precedent where GREEN code is in the working tree before either commit succeeds)

## Deviations from Plan

None — plan executed exactly as written, including the explicit committed approach for Task 1's gating and re-read strategy.

## Issues Encountered

None. All acceptance criteria and verification commands passed on the first implementation attempt for each task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 23 (Version Stamping & Skew Detection, VER-01..06) is now fully implemented across all 4 plans: pure foundation (01), config validation (02), init scaffold stamping (03), and this end-to-end wiring plan (04)
- Full suite (`npm test`) green: 292 tests passing, 0 failing
- This repo's own `motto.yaml` remains deliberately unstamped (D-R4) — ready for Phase 24 (Upgrade-Path Ledger & Policy) to build the "upgrade ledger" artifact the skew message references, and for a milestone-close decision on whether/when to stamp this repo's own tree

---
*Phase: 23-version-stamping-skew-detection*
*Completed: 2026-07-06*
