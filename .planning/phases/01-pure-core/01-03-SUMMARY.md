---
phase: 01-pure-core
plan: 03
subsystem: validation
tags: [node-test, esm, config, yaml, loadConfig, kebab-regex, parseDocument]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Project scaffold (ESM, yaml, husky), uniform errors[] model (D-01)"
  - phase: 01-02
    provides: "NAME_KEBAB /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/ — canonical kebab regex (D-08, D-16)"
provides:
  - "loadConfig(text: string) -> { config: object, errors: Array<{ message: string }> } — pure never-throw config validator (CONF-01..03)"
affects: [lint-orchestration, build-cli, phase-2-io-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Collect-all pattern (D-15): all missing required fields pushed without short-circuit so they surface together"
    - "Optional-field validation pattern (D-17): plugins.private validated only when present; absence is not an error"
    - "parseDocument errors[] mapping (D-02, D-18): doc.errors[] mapped to returned errors[] so malformed YAML surfaces cleanly"
    - "Intentional duplicate regex (D-16): NAME_KEBAB duplicated in config.js with cross-reference comment to schema.js; two literals must stay identical"

key-files:
  created:
    - src/config.js
    - test/config.test.js
  modified: []

key-decisions:
  - "TDD RED+GREEN committed together: husky pre-commit runs full node --test suite; standalone failing RED would be rejected; RED failure (ERR_MODULE_NOT_FOUND) verified locally first"
  - "D-16 intentional duplicate: NAME_KEBAB defined as a local const in src/config.js with a cross-reference comment to src/schema.js — not imported, to keep config.js independent of the schema module; the two regex literals must stay identical"
  - "D-15 collect-all: name, version, description, and plugins.public missing-field checks all use independent if-statements to collect every missing field; no short-circuit"
  - "D-17 optional private: plugins.private only validated when plugins.private != null; absence pushes no error"
  - "D-02/D-18 parseDocument: YAML parsed with parseDocument (not parse); doc.errors[] entries mapped into returned errors[] so malformed input surfaces without throwing"
  - "D-01 no-throw: entire function wrapped in try/catch around parseDocument; defensive catch pushes an error and returns early without re-throwing"

patterns-established:
  - "Never-throw config pattern: parseDocument in try/catch, doc.errors[] mapped, validation errors collected independently, return { config, errors } always"
  - "Intentional regex duplicate pattern: duplicate a shared regex constant locally with a cross-reference comment rather than coupling module imports when independence is required"

requirements-completed: [CONF-01, CONF-02, CONF-03]

coverage:
  - id: D1
    description: "loadConfig returns parsed config (name, version, plugins.*) and empty errors[] for a valid motto.yaml (CONF-01)"
    requirement: "CONF-01"
    verification:
      - kind: unit
        ref: "test/config.test.js#C1: valid config text returns parsed config and empty errors"
        status: pass
    human_judgment: false
  - id: D2
    description: "Missing version, description, and plugins.public are all reported together without short-circuit (CONF-01, D-15)"
    requirement: "CONF-01"
    verification:
      - kind: unit
        ref: "test/config.test.js#C2: missing version, description, plugins.public all reported together (D-15)"
        status: pass
    human_judgment: false
  - id: D3
    description: "plugins.public non-kebab name 'Bad_Name' reports a plugin-name error (CONF-02, D-16)"
    requirement: "CONF-02"
    verification:
      - kind: unit
        ref: "test/config.test.js#C3: plugins.public 'Bad_Name' (non-kebab) reports a plugin-name error (D-16)"
        status: pass
    human_judgment: false
  - id: D4
    description: "plugins.public leading-digit name '0bad' reports a plugin-name error (letter-start rule, CONF-02, D-08/D-16)"
    requirement: "CONF-02"
    verification:
      - kind: unit
        ref: "test/config.test.js#C4: plugins.public '0bad' (leading digit) reports a plugin-name error (D-08/D-16)"
        status: pass
    human_judgment: false
  - id: D5
    description: "plugins.private present and invalid 'Bad/Name' reports a plugin-name error (CONF-02, D-16)"
    requirement: "CONF-02"
    verification:
      - kind: unit
        ref: "test/config.test.js#C5: plugins.private 'Bad/Name' (invalid) reports a plugin-name error (D-16)"
        status: pass
    human_judgment: false
  - id: D6
    description: "plugins.private absent reports no error (CONF-03, D-17)"
    requirement: "CONF-03"
    verification:
      - kind: unit
        ref: "test/config.test.js#C6: absent plugins.private reports no error (CONF-03, D-17)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Malformed YAML text ('name: : :') surfaces in errors[] and loadConfig never throws (D-18, D-01)"
    requirement: "CONF-01"
    verification:
      - kind: unit
        ref: "test/config.test.js#C7: malformed YAML text surfaces in errors[] and never throws (D-18, D-01)"
        status: pass
    human_judgment: false

# Metrics
duration: ~5min
completed: 2026-06-30
status: complete
---

# Phase 1 Plan 03: Pure Core — loadConfig Summary

**`loadConfig` — a pure never-throw config validator: parses raw `motto.yaml` text with `parseDocument`, collects all missing required fields together (name/version/description/plugins.public), validates plugin names against the letter-start kebab regex, accepts absent `plugins.private` without error, and maps YAML parse errors into errors[], covering CONF-01..03.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-30T08:42:57Z
- **Completed:** 2026-06-30T08:47:00Z
- **Tasks:** 1 (TDD auto task)
- **Files modified:** 2

## Accomplishments

- `loadConfig(text)` exported from `src/config.js`: a pure string-in/object-out validator (no filesystem I/O, never throws — D-01) that returns `{ config: object, errors: Array<{ message }> }`.
- All four required-field checks (`name`, `version`, `description`, `plugins.public`) use independent `if`-statements — no short-circuit — so every missing field is reported in a single pass (CONF-01, D-15).
- `plugins.public` and `plugins.private` (when present) validated against `NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` — same letter-start kebab regex as `src/schema.js`, duplicated intentionally with a cross-reference comment (CONF-02, D-16).
- `plugins.private` absence is never an error; validation only runs when the field is present (CONF-03, D-17).
- YAML parsed with `parseDocument` (not `parse`) — `doc.errors[]` entries mapped into the returned `errors[]` so malformed input never throws and always surfaces (D-02, D-18). Defensive `try/catch` around `parseDocument` as belt-and-suspenders for D-01.
- 7 behavior tests (C1–C7) in `test/config.test.js`; all 28 tests across all three suites pass under `node --test`.

## Task Commits

1. **Task 1: Implement loadConfig core validator (CONF-01..03) [TDD — C1..C7]** — `b791987` (feat; RED verified locally via ERR_MODULE_NOT_FOUND, then RED+GREEN committed together — same constraint as 01-01 and 01-02)

**Plan metadata:** committed separately with this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates.

_Note: the husky pre-commit hook runs the full `node --test` suite, so a standalone failing RED commit is impossible without `--no-verify` (prohibited); RED was verified locally first._

## Files Created/Modified

- `src/config.js` — `loadConfig(text)` pure config validator. Imports `parseDocument` from `yaml`. Local `NAME_KEBAB` constant with cross-reference comment to `src/schema.js` (D-16). Never throws; no filesystem I/O.
- `test/config.test.js` — 7 node:test behaviors (C1–C7) asserting on errors[] content. Tests use raw string literals, no filesystem, no tmpdir.

## Decisions Made

- **RED+GREEN in one commit.** Identical constraint to plans 01-01 and 01-02: husky pre-commit runs `npm test`; a standalone RED commit would be rejected; `--no-verify` is prohibited. RED failure (ERR_MODULE_NOT_FOUND) observed locally before implementing.
- **D-16 intentional regex duplicate.** `NAME_KEBAB` is defined as a module-level `const` in `src/config.js` — not imported from `src/schema.js` — to keep `config.js` independent of the schema module. The `<action>` section of the plan explicitly calls for "duplicate intentionally." A cross-reference comment anchors both copies together so they cannot silently drift.
- **D-15 no-short-circuit.** Four separate `if (!config.X)` checks (not `else if`) so all missing required fields are collected in one call. Same collect-all pattern as `validateSkill`'s independent checks.
- **D-17 null-guard for optional.** `if (plugins.private != null)` rather than `if (plugins.private)` so an explicit `private: ""` (empty string) would still trigger the format check, while a fully absent key does not.
- **D-02/D-18 parseDocument.** `import { parseDocument } from "yaml"` — never `YAML.parse`, which throws on malformed input and violates D-01.

## Deviations from Plan

None — plan executed exactly as written. (Rules 1–3 not triggered; no architectural changes needed.)

## Known Stubs

None. `loadConfig` is fully implemented and tested; no placeholder paths. The file-read wiring (Phase 2) is a distinct concern deliberately excluded from this plan.

## Issues Encountered

- **TDD RED commit vs. pre-commit hook** — resolved identically to 01-01 and 01-02: RED verified locally, RED+GREEN committed together. No `--no-verify` used.

## Threat Flags

None beyond the plan's existing `<threat_model>`. T-03-01 (ReDoS): `NAME_KEBAB` is anchored and unambiguous — same analysis as T-02-01 in plan 01-02. T-03-02 (billion-laughs): yaml's default `maxAliasCount: 100` accepted; no custom tags enabled.

## Known Limitations

None introduced by this plan. Phase 2 will wire the file read; `loadConfig` is stable for that.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `loadConfig` signature is stable for Phase 2: the lint orchestrator will read `motto.yaml` from disk and pass its text to `loadConfig`; errors[] are concatenated with skill errors using the same uniform model (D-01).
- All 28 tests across `loadConfig` + `parseFrontmatter` + `validateSkill` suites are green.
- Phase 1 pure-core is fully complete: PARSE-01..04, LINT-01..05, CONF-01..03 all covered.

## Self-Check: PASSED

- `src/config.js` exists and exports `loadConfig`.
- `test/config.test.js` exists with 7 behavior tests (C1–C7).
- Commit `b791987` is present in git history.
- `node --test` passes 28/28 (7 new + 21 existing).

---
*Phase: 01-pure-core*
*Completed: 2026-06-30*
