---
phase: 14-template-mechanism
plan: 01
subsystem: validation
tags: [schema-validator, template-registry, regex, node-test]

# Dependency graph
requires:
  - phase: 10-13 (v0.0.4)
    provides: src/schema.js validateSkill() with NAME/DESCRIPTION/AUDIENCE/BODY-SPINE/SHARED_REFERENCES checks; D-14 template passthrough
provides:
  - "src/templates.js pure-data SECTIONS + TEMPLATES registry (TMPL-02)"
  - "hasClosedSection(body, tagName) exported fence-aware section-tag scanner (TMPL-03)"
  - "validateSkill() template cascade enforcing template: procedure (TMPL-01/04/05)"
  - "waives mechanism proven end-to-end via an injected test-fixture template"
affects: [14-02-dogfood, 15-field-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-data schema-profile registry (src/templates.js) mirroring the RESERVED module-level-export style — adding a template is a data-only edit"
    - "Fence-aware, line-anchored, two-phase body scanner (strip fenced lines, then anchored regex test) to avoid hot-loop regex pitfalls"
    - "Injectable third validateSkill() parameter (templatesRegistry) for test-only fixture injection, mirroring the existing sharedRefs DI precedent"

key-files:
  created:
    - src/templates.js
  modified:
    - src/schema.js
    - test/schema.test.js

key-decisions:
  - "template cascade runs and resolves waivedSections BEFORE the Title/Role body-spine checks so a template's waives can gate them (Pitfall 2 avoided)"
  - "hasOwnProperty (not truthy) gates template-key presence — template: \"\" or template: null now error instead of silently passing (D-07 intent-declared)"
  - "waives fixture (FIXTURE_TEMPLATES) kept local to test/schema.test.js, never added to src/templates.js, per TMPL-02 purity"
  - "RED/GREEN split per the tdd=true task type could not be committed as two separate commits — this repo's husky pre-commit hook runs the full node --test suite and blocks any failing commit, and --no-verify is prohibited; test+implementation were verified RED locally then committed together as GREEN (documented in both feat commit messages)"

patterns-established:
  - "Schema-profile registries live in src/templates.js as pure data; validateSkill consumes them via an injectable default param"

requirements-completed: [TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05]

coverage:
  - id: D1
    description: "src/templates.js exports SECTIONS + TEMPLATES as pure data (no functions, no imports) with the procedure template's requiredSections"
    requirement: "TMPL-02"
    verification:
      - kind: unit
        ref: "inline import assertion (Task 1 verify command) — exercised manually, passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "hasClosedSection(body, tagName) correctly matches a closed, line-anchored section pair and excludes fenced (backtick/tilde) occurrences"
    requirement: "TMPL-03"
    verification:
      - kind: unit
        ref: "test/schema.test.js#hasClosedSection (9 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "template: procedure enforces <process> and <success_criteria>; unknown template names error listing sorted available templates; malformed template values (non-string, empty, null, throwing object) error without throwing"
    requirement: "TMPL-01, TMPL-04"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill — template cascade (11 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A skill with no template key returns byte-for-byte identical errors to v0.0.4 (regression guard)"
    requirement: "TMPL-05"
    verification:
      - kind: unit
        ref: "test/schema.test.js#TMPL-05 regression tests (2 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "waives merge logic proven via an injected test-fixture template — adding a template stays a data-only edit"
    verification:
      - kind: unit
        ref: "test/schema.test.js#waives fixture tests (2 tests)"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-07-03
status: complete
---

# Phase 14 Plan 01: Template Mechanism Summary

**Data-driven `template:` field enforcement in validateSkill() via a pure-data src/templates.js registry and a fence-aware hasClosedSection scanner — 152/152 tests green, up from 140.**

## Performance

- **Duration:** ~24 min (037f514 plan-creation baseline to final task commit)
- **Started:** 2026-07-03T00:55Z (approx, first read of plan)
- **Completed:** 2026-07-03T01:00:22+02:00
- **Tasks:** 3/3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `src/templates.js` created as a pure-data registry: `SECTIONS` (tag → description) and `TEMPLATES` (name → rules), exactly matching the design-spec §1 shape, with the `procedure` template's `requiredSections: ["process", "success_criteria"]`.
- `hasClosedSection(body, tagName)` added to `src/schema.js`: a two-phase, fence-aware, line-anchored scanner that strips backtick/tilde-fenced lines before testing for a matched `^<tag>`/`^</tag>` pair — never throws on empty/undefined input.
- `validateSkill()` extended with a template cascade: non-string → error and stop; unknown template name → error listing sorted available names and stop; else check each `requiredSections` entry, quoting the `SECTIONS` description in the error. `waivedSections` resolves before the Title/Role body-spine checks so a template's `waives` list can suppress them.
- B13 (the old "template and dependencies are both ignored" test, now factually wrong) split into `B13a` (dependencies alone still causes no errors) and `B13b` (unknown template now errors).
- Adversarial coverage added for every malformed `template` shape from the plan's behavior list: number, array, object, empty string, `null`, and an object with a throwing `toString`/`Symbol.toPrimitive` — all confirmed to error without throwing.
- TMPL-05 regression tests confirm a template-less skill (valid and invalid-body cases) returns identical errors to v0.0.4.
- `waives` mechanism proven via a test-local `FIXTURE_TEMPLATES` fixture (`no-role-needed` waiving `"role"`) — never added to production `src/templates.js`.

## Task Commits

Each task was committed:

1. **Task 1: Create src/templates.js pure-data registry (TMPL-02)** — staged, verified via inline import assertion, then folded into the Task 2 commit below (staging carry-over — see Deviations).
2. **Task 2: Add exported fence-aware hasClosedSection scanner (TMPL-03)** — `4b023eb` (feat) — includes `src/templates.js` (Task 1) due to prior `git add` staging.
3. **Task 3: Add template cascade to validateSkill + split B13 + adversarial/waives tests (TMPL-01/04/05)** — `3eb9c9d` (feat)

**Plan metadata:** pending final commit (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md).

_Note: TDD tasks (2 and 3) were verified RED locally (import/syntax failure before implementation existed) but could not be persisted as standalone failing commits — see Deviations._

## Files Created/Modified
- `src/templates.js` - Pure-data `SECTIONS`/`TEMPLATES` registry; the sole edit point for adding future templates (TMPL-02).
- `src/schema.js` - Adds exported `hasClosedSection`, imports the templates registry, extends `validateSkill()` with an injectable third `templatesRegistry` param and the template cascade; gates the Title/Role checks on `waivedSections`.
- `test/schema.test.js` - Adds `hasClosedSection` unit tests, splits B13 into B13a/B13b, adds the template-cascade describe block (missing-section, valid-procedure, unknown-template, 3 adversarial-type tests covering 5 malformed shapes, TMPL-05 regression ×2, waives-fixture ×2).

## Decisions Made
- Template cascade placed as its own independent block (not nested in NAME), consistent with D-13's cascade-vs-independent model, and positioned before the Title/Role checks per Pitfall 2 in RESEARCH.md.
- `hasOwnProperty.call(data, "template")` used as the presence gate instead of a truthy check, so `template: ""` and `template: null` both error rather than silently falling through to the old D-14 passthrough behavior.
- `FIXTURE_TEMPLATES` kept local to the test file per the plan's explicit instruction — production `src/templates.js` stays free of test-only data.

## Deviations from Plan

### Auto-fixed / Process Adjustments

**1. [Process] TDD RED commit not separately persisted (Tasks 2 and 3, both `tdd="true"`)**
- **Found during:** Task 2 (hasClosedSection scanner)
- **Issue:** The plan's TDD execution flow calls for a standalone failing RED commit before the GREEN implementation commit. This repo's `.husky/pre-commit` hook runs `npm test` (the full `node --test` suite) on every commit, and the harness prohibits `--no-verify`. A test file importing a not-yet-exported symbol fails the full suite, so the hook blocks any attempt to commit a genuinely-red state.
- **Fix:** Verified RED locally (outside of git) by reverting the implementation diff, confirming the test run failed with the expected "does not provide an export named ..." error, then restoring the implementation and running the full suite green before committing test + implementation together in a single commit. Documented explicitly in both `feat(14-01):` commit messages. This matches the repo's actual convention — `git log --grep="^test("` shows no prior standalone-failing-state commits in this project's history.
- **Files modified:** `src/schema.js`, `test/schema.test.js` (both tasks)
- **Verification:** Full suite green after each task (`node --test` → 140 then 152 passing)
- **Committed in:** `4b023eb` (Task 2), `3eb9c9d` (Task 3)

**2. [Process] Task 1 (templates.js) folded into the Task 2 commit**
- **Found during:** Task 2 commit
- **Issue:** `src/templates.js` was `git add`ed after Task 1's verification but not committed before Task 2's implementation began; the subsequent `git add src/schema.js test/schema.test.js && git commit` for Task 2 picked up the already-staged `src/templates.js` as well, since `git add` does not unstage prior additions.
- **Fix:** No functional impact — `src/templates.js` is correct, pure data, and independently verified (Task 1's automated check passed before this happened). Documented here rather than rewriting git history (per the "always create NEW commits" rule).
- **Files modified:** none (informational only)
- **Committed in:** `4b023eb`

---

**Total deviations:** 2 (both process/commit-granularity, not functional). No scope creep, no correctness or security impact.

## Issues Encountered
None beyond the commit-granularity items documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `src/templates.js` and the `validateSkill()` cascade are ready for 14-02 (dogfood: adding `template: procedure` to `skills/release/SKILL.md` and wrapping its body in `<process>`/`<success_criteria>`).
- Phase 15 (Field Validation & Integrity Guards) can layer `outputs:`/`dependencies:`/`allowed-tools` validation onto the same independent-checks model without touching the template cascade.
- No blockers.

---
*Phase: 14-template-mechanism*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/templates.js
- FOUND: .planning/phases/14-template-mechanism/14-01-SUMMARY.md
- FOUND: commit 4b023eb (Task 2)
- FOUND: commit 3eb9c9d (Task 3)
- FOUND: `export function hasClosedSection` in src/schema.js
- `node --test` (full suite): 152 pass, 0 fail
