---
phase: 01-pure-core
plan: 01
subsystem: parsing
tags: [yaml, esm, node-test, frontmatter, skill-md]

# Dependency graph
requires: []
provides:
  - "parseFrontmatter(text) -> { data, body, errors[] } — never-throw frontmatter splitter for SKILL.md"
  - "Project scaffold: ESM package.json with yaml@2.9 dependency and node:test harness"
  - "The uniform errors[] error model (D-01) that the whole pure core will share"
affects: [discoverSkills, validateSkill, lint, motto-lint]

# Tech tracking
tech-stack:
  added: ["yaml@2.9.0 (eemeli/yaml, YAML 1.2 parser)"]
  patterns:
    - "Uniform never-throw errors[] return ({ message }) across the pure core"
    - "Normalize-first (BOM strip + CRLF->LF) before any delimiter scan or YAML parse"
    - "YAML.parseDocument (not YAML.parse) with doc.errors[] mapped into errors[]"
    - "Co-located node:test tests asserting on errors[] content, never assert.throws"

key-files:
  created:
    - src/frontmatter.js
    - test/frontmatter.test.js
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "RED+GREEN committed together (one feat commit) because the husky pre-commit hook runs the full node --test suite — a standalone failing RED commit would be rejected. RED was verified locally before implementation, preserving TDD discipline."
  - "Stray-delimiter detection (D-06) implemented structurally: the region between the close and the next bare --- is flagged only if it parses cleanly as a non-empty YAML mapping (leaked frontmatter). A body horizontal rule resolves to a scalar/null and is not flagged."
  - "Husky scaffold (.husky/pre-commit) committed alongside package.json as project tooling."

patterns-established:
  - "Never-throw errors[] model: every failure path returns via errors[], nothing throws (D-01/D-03)"
  - "Normalize-first ordering inside parse functions (D-04/D-05)"
  - "parseDocument + doc.errors[] mapping for all YAML parsing (D-02)"

requirements-completed: [PARSE-01, PARSE-02, PARSE-03, PARSE-04]

coverage:
  - id: D1
    description: "Well-formed SKILL.md splits into correct {data, body} with empty errors[] (happy path)"
    requirement: "PARSE-01"
    verification:
      - kind: unit
        ref: "test/frontmatter.test.js#B1: splits a well-formed SKILL.md into data + body with no errors"
        status: pass
    human_judgment: false
  - id: D2
    description: "Missing frontmatter block returns a named /frontmatter/ error in errors[] and never throws"
    requirement: "PARSE-01"
    verification:
      - kind: unit
        ref: "test/frontmatter.test.js#B2: missing frontmatter block returns a named error and does not throw"
        status: pass
    human_judgment: false
  - id: D3
    description: "Empty frontmatter block yields data {} with no parse error (D-07)"
    requirement: "PARSE-01"
    verification:
      - kind: unit
        ref: "test/frontmatter.test.js#B3: empty frontmatter block yields data {} with no errors"
        status: pass
    human_judgment: false
  - id: D4
    description: "Leading UTF-8 BOM + CRLF parse identically to LF/no-BOM input"
    requirement: "PARSE-02"
    verification:
      - kind: unit
        ref: "test/frontmatter.test.js#B4: leading BOM and CRLF parse identically to LF/no-BOM"
        status: pass
    human_judgment: false
  - id: D5
    description: "Malformed YAML in frontmatter surfaces a non-empty errors[] and never throws"
    requirement: "PARSE-03"
    verification:
      - kind: unit
        ref: "test/frontmatter.test.js#B5: malformed YAML in frontmatter surfaces a non-empty errors[] and does not throw"
        status: pass
    human_judgment: false
  - id: D6
    description: "A stray inner --- in the frontmatter is reported as a named stray-delimiter error"
    requirement: "PARSE-04"
    verification:
      - kind: unit
        ref: "test/frontmatter.test.js#B6: a stray inner --- in the frontmatter is reported"
        status: pass
    human_judgment: false
  - id: D7
    description: "A --- Markdown horizontal rule in the body is NOT flagged and is retained (regression guard)"
    requirement: "PARSE-04"
    verification:
      - kind: unit
        ref: "test/frontmatter.test.js#B7: a --- horizontal rule in the body is not flagged and is retained"
        status: pass
    human_judgment: false
  - id: D8
    description: "Project scaffold: ESM package.json (type:module, engines>=20, yaml dep) with husky preserved; yaml resolves"
    verification:
      - kind: other
        ref: "node -e require('./package.json') assertions + node -e require('yaml')"
        status: pass
    human_judgment: false

# Metrics
duration: ~14min
completed: 2026-06-30
status: complete
---

# Phase 1 Plan 01: Pure Core — parseFrontmatter Summary

**`parseFrontmatter(text)` — a never-throw SKILL.md splitter (BOM/CRLF-normalized, YAML.parseDocument-backed, with structural stray-`---` detection) plus the ESM project scaffold and the single `yaml@2.9` dependency.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-06-30T08:04Z
- **Completed:** 2026-06-30T08:18Z
- **Tasks:** 3 (1 human-verify checkpoint + 2 auto)
- **Files modified:** 5

## Accomplishments
- `parseFrontmatter` exported from `src/frontmatter.js`: normalizes input first (strip leading BOM, CRLF→LF), splits frontmatter `data` from Markdown `body` on the first bare `---`, and reports every structural malformation through a uniform `errors[]` of `{ message }` — it never throws (PARSE-01..04, D-01/D-03).
- YAML is parsed with `YAML.parseDocument` and `doc.errors[]` are mapped into the returned `errors[]` (PARSE-03, D-02); an empty block yields `data: {}` with no error (D-07).
- Structural stray-`---` detection (PARSE-04, D-06): leaked frontmatter (a mapping between the close and a further `---`) is flagged; a body horizontal-rule `---` is preserved and not flagged.
- Project scaffold established: `package.json` amended to ESM (`type:module`, `engines.node>=20`, `name`, `version`) with `yaml@^2.9.0` added; pre-existing husky devDependency and `prepare`/`test` scripts preserved.
- 7 behavior tests (B1–B7) in `test/frontmatter.test.js`, all passing under `node --test`.

## Task Commits

1. **Task 1: Verify `yaml` legitimacy (blocking-human checkpoint)** — no commit; cleared via human sign-off relayed by the coordinator AND independent grounds: the project's own `CLAUDE.md` documents `yaml@2.9.0` as registry-verified (HIGH confidence), and the installed package was technically verified as genuine `eemeli/yaml@2.9.0` (author Eemeli Aro, repo github:eemeli/yaml).
2. **Task 2: Amend package.json and install `yaml`** — `65dd01c` (chore)
3. **Task 3: Implement parseFrontmatter (TDD, B1–B7)** — `da4c756` (feat; RED verified locally then RED+GREEN committed together — see Decisions)

**Plan metadata:** committed separately with this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates.

_Note: the husky pre-commit hook runs the full `node --test` suite, so a standalone failing RED commit is impossible without `--no-verify` (prohibited this run); RED was verified locally before GREEN._

## Files Created/Modified
- `src/frontmatter.js` — `parseFrontmatter(text)`: normalize → delimiter scan → stray detection → `YAML.parseDocument`, returning `{ data, body, errors }`.
- `test/frontmatter.test.js` — `node:test` + `node:assert/strict` covering B1–B7; asserts on `errors[]` content (never `assert.throws`).
- `package.json` — added `name`, `version`, `type:module`, `engines.node>=20`, `dependencies.yaml@^2.9.0`; husky devDep and scripts preserved.
- `package-lock.json` — locked `yaml@2.9.0`.
- `.husky/pre-commit` — tracked the existing husky scaffold (runs `npm test`).

## Decisions Made
- **RED+GREEN in one commit.** The husky pre-commit hook runs `npm test` (full suite); a standalone failing RED commit would be rejected and `--no-verify` was prohibited. RED was verified locally (module-not-found failure observed) before implementing, then test + implementation were committed together as one `feat`.
- **Structural stray detection via mapping probe.** Neither non-greedy (first `---`, leaks body) nor greedy (last `---`, swallows body rules) close is correct per D-06. Implemented: after the first close, the region up to the next bare `---` is parsed; it is flagged as a stray only if it resolves cleanly to a non-empty YAML mapping. Empirically distinguishes B6 (`audience: public` → mapping → stray) from B7 (`# Title`/prose → scalar → not flagged). Heuristic limitation noted below.
- **Husky scaffold committed with package.json** as project tooling (the orchestrator confirmed these were untracked scaffold from discuss-phase).

## Deviations from Plan

None — plan executed exactly as written. (Rules 1–3 not triggered; no architectural changes needed.)

## Known Stubs

None. `parseFrontmatter` is fully wired and tested; no placeholder data paths.

## Issues Encountered
- **TDD RED commit vs. pre-commit hook conflict** — resolved by verifying RED locally and committing RED+GREEN together (see Decisions). No `--no-verify` used.

## Threat Flags

None beyond the plan's existing `<threat_model>`. The single supply-chain surface (`yaml` install, T-01-SC) was gated by the Task 1 blocking-human checkpoint and the installed package was verified as genuine `eemeli/yaml@2.9.0`. `YAML.parseDocument` runs with the library's default `maxAliasCount` (T-01-02, accept); no custom tags/anchors enabled.

## Known Limitations (for future phases)
- Stray detection treats body content that is a single bare `key: value` line sitting alone between two `---` delimiters as leaked frontmatter (it parses as a mapping). This is genuinely ambiguous input; none of B1–B7 exercise it, and it is acceptable for v1 (YAGNI). If a real skill body hits this, revisit in the lint phase.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `parseFrontmatter` signature is stable for Phase 2: `discoverSkills` will call it per file and feed `validateSkill`; `lint` can concatenate parse + schema + config `errors[]` with no try/catch wrappers (the reason D-01 chose the uniform model).
- ESM + `node:test` + `yaml` toolchain is in place for the remaining pure-core functions (`validateSkill`, `loadConfig`).

## Self-Check: PASSED

All claimed files exist (`src/frontmatter.js`, `test/frontmatter.test.js`, `package.json`, `package-lock.json`, `.husky/pre-commit`, this SUMMARY) and both task commits (`65dd01c`, `da4c756`) are present in the git history.

---
*Phase: 01-pure-core*
*Completed: 2026-06-30*
