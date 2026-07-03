---
phase: 15-field-validation-integrity-guards
plan: 01
subsystem: validation
tags: [schema, validator, node-path, node-test, never-throw]

# Dependency graph
requires:
  - phase: 14-template-mechanism
    provides: hasOwnProperty-gated cascade precedent (TEMPLATE block), waivedSections resolution pattern
provides:
  - "isOutputPathLexicallySafe(skillDirAbs, entry) — exported pure lexical path-safety predicate for reuse by Plan 02's lint.js fs layer"
  - "validateSkill extended signature: skillNames (Set), audienceMap (Map) parameters"
  - "outputs: hasOwnProperty-gated lexical validation block (map-type guard, per-entry non-string/unsafe-path cascade)"
  - "dependencies: hasOwnProperty-gated validation block (namespaced plugin:skill format, self-dependency guard, in-tree bare resolution, public->private audience-direction guard)"
  - "allowed-tools: hasOwnProperty-gated Option A format-only validation block (string or array, non-empty)"
affects: [15-02-lint-fs-layer, 16-build-skill, 17-docs-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First-ever node:path import in schema.js (resolve/sep/isAbsolute) — pure string math, purity-safe (no node:fs)"
    - "Cross-layer-shared pure predicate export (isOutputPathLexicallySafe), modeled on the existing NAME_KEBAB export style"
    - "hasOwnProperty-gated optional field cascade extended to 3 new fields (outputs, dependencies, allowed-tools), reusing the TEMPLATE/D-07 precedent"
    - "Self-dependency check ordered strictly before skillNames.has() membership check (Pitfall 2 — dirName is always a trivial member of its own skill set)"

key-files:
  created: []
  modified:
    - src/schema.js
    - test/schema.test.js

key-decisions:
  - "Self-dependency check precedes the skillNames.has(entry) membership check in the dependencies cascade — dirName is always present in skillNames, so a membership-first check would silently misclassify a self-dependency as resolved (RESEARCH.md Pitfall 2)"
  - "outputs lexical safety uses resolve()+sep containment with a trailing separator on BOTH the resolved root and resolved target, guarding against the sibling-directory-prefix false positive"
  - "allowed-tools uses Option A (format-only, no shape regex, no tokenizing) per CONTEXT.md-locked decision — a non-empty string or array of non-empty strings, nothing more"
  - "Updated a pre-existing regression test (B13a) that asserted the now-retired D-14 'dependencies is a passthrough key' behavior — it now asserts the correct VAL-02 not-found error, since the schema.js docblock explicitly states this claim is stale as of this phase"

patterns-established:
  - "Per-entry independent cascade with early continue, applied identically across outputs/dependencies/allowed-tools (D-10 shared_references precedent)"
  - "Type-guard-before-method cascade (typeof/Array.isArray before any string/array method or template-literal interpolation) applied to every new field branch — proven never-throw via throwing-toString/Symbol.toPrimitive adversarial tests for all three fields"

requirements-completed: [VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06]

coverage:
  - id: D1
    description: "outputs: lexical path-safety validation (absolute path / .. traversal rejected before any fs access; safe entries deferred to Plan 02's fs layer)"
    requirement: "VAL-01"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill — outputs (VAL-01, lexical)"
        status: pass
    human_judgment: false
  - id: D2
    description: "dependencies: namespaced plugin:skill format check (NAME_KEBAB both halves) and bare-entry in-tree resolution against skillNames"
    requirement: "VAL-02"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill — dependencies (VAL-02/03/04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "dependencies: public->private audience-direction guard (public skill cannot depend on a private skill; all other directions pass)"
    requirement: "VAL-03"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill — dependencies (VAL-02/03/04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "dependencies: self-dependency rejected with a specific error message, checked before membership resolution"
    requirement: "VAL-04"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill — dependencies (VAL-02/03/04) — self-dependency error test"
        status: pass
    human_judgment: false
  - id: D5
    description: "allowed-tools: Option A format-only validation (non-empty string or array of non-empty strings, incl. Bash(git add *))"
    requirement: "VAL-05"
    verification:
      - kind: unit
        ref: "test/schema.test.js#validateSkill — allowed-tools (VAL-05)"
        status: pass
    human_judgment: false
  - id: D6
    description: "All three new validators never-throw on adversarial malformed input, including throwing-toString/Symbol.toPrimitive objects"
    requirement: "VAL-06"
    verification:
      - kind: unit
        ref: "test/schema.test.js — throwing-toString/Symbol.toPrimitive cases across outputs/dependencies/allowed-tools describe blocks"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-03
status: complete
---

# Phase 15 Plan 01: outputs/dependencies/allowed-tools field validators Summary

**Pure-validator extension of `validateSkill` adding lexical `outputs:` path-safety, `dependencies:` namespaced-format/self-dep/resolution/audience guards, and Option A format-only `allowed-tools` — all hasOwnProperty-gated, all proven never-throw.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-03T06:16:55Z
- **Completed:** 2026-07-03T06:21:42Z
- **Tasks:** 3 completed
- **Files modified:** 2 (`src/schema.js`, `test/schema.test.js`)

## Accomplishments
- Added `src/schema.js`'s first-ever `node:path` import and exported `isOutputPathLexicallySafe(skillDirAbs, entry)`, a pure lexical predicate reused by both `validateSkill` itself and (in Plan 02) the fs-dependent existence/symlink-escape layer in `lint.js`.
- Extended `validateSkill`'s signature with `skillNames` (Set) and `audienceMap` (Map) parameters, and added the `outputs:` lexical validation block (VAL-01), the `dependencies:` guards block (VAL-02/03/04), and the `allowed-tools` Option A format block (VAL-05).
- Wrote 21 new adversarial + happy-path tests across three new `describe` blocks, proving all three field validators never throw on malformed input including throwing-`toString`/`Symbol.toPrimitive` objects (VAL-06), and asserting the specific self-dependency error message per RESEARCH.md Pitfall 2.

## Task Commits

Each task was committed atomically:

1. **Task 1: outputs lexical block + exported predicate + signature/docblock update** - `c047c78` (feat)
2. **Task 2: dependencies guards + allowed-tools format block** - `7c47376` (feat)
3. **Task 3: adversarial + happy-path schema tests for all three fields (VAL-06)** - `f2a16fb` (test)

_Note: Task 3 was annotated `tdd="true"` but implementation already landed in Tasks 1-2 (the plan's own task split, not a literal RED-GREEN-REFACTOR cycle) — the test suite was written and confirmed green against the already-correct implementation in a single commit._

## Files Created/Modified
- `src/schema.js` — first `node:path` import; new exported `isOutputPathLexicallySafe`; extended `validateSkill` signature (`skillNames`, `audienceMap`); three new hasOwnProperty-gated validation blocks (outputs, dependencies, allowed-tools); corrected stale D-14 docblock claim
- `test/schema.test.js` — three new `describe` blocks (outputs, dependencies, allowed-tools) with 21 new tests; updated pre-existing B13a regression test to match the new (correct) dependencies behavior

## Decisions Made
- Self-dependency check ordered strictly BEFORE the `skillNames.has(entry)` membership check in the `dependencies` bare-entry cascade — mandatory per RESEARCH.md Pitfall 2 (a skill is always trivially a member of its own discovered skill set, so membership-first would silently misclassify a self-dependency as resolved).
- `isOutputPathLexicallySafe` appends a trailing `sep` to BOTH the resolved root and resolved target before the containment `startsWith` comparison, guarding against the sibling-directory-prefix false positive (e.g. `build-skill-evil` not wrongly treated as contained within `build-skill`).
- `allowed-tools` locked to Option A (format-only, no shape regex, no tokenizing) per CONTEXT.md — `Bash(git add *)` passes trivially as a single valid permission rule.
- Updated the pre-existing `B13a` test, which asserted the now-retired "dependencies is a passthrough key" (D-14) behavior — Task 1's own docblock edit explicitly states this claim is stale as of this phase, so the test needed to assert the new VAL-02 "not found" error instead of silently ignoring the fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated stale pre-existing regression test B13a to match Task 2's intentional behavior change**
- **Found during:** Task 2 (dependencies guards + allowed-tools format block)
- **Issue:** `test/schema.test.js`'s existing `B13a` test asserted `dependencies: ["some-dep"]` produces zero errors, encoding the now-retired D-14 "passthrough key" behavior that Task 1's own docblock edit explicitly flagged as stale (RESEARCH.md Pitfall 6). Once Task 2 landed the `dependencies:` validation block, this test failed — `"some-dep"` is correctly reported as an unresolved bare dependency against the default empty `skillNames` Set.
- **Fix:** Renamed and rewrote the test to assert the correct VAL-02 "not found" error message instead of the stale zero-errors expectation. No new test coverage gap introduced — the intended new/adversarial dependency-resolution behavior is separately and comprehensively covered by Task 3's new `describe("validateSkill — dependencies (VAL-02/03/04)")` block.
- **Files modified:** `test/schema.test.js`
- **Verification:** `node --test test/schema.test.js` and full `node --test` suite both green (176 tests) after the fix.
- **Committed in:** `7c47376` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — stale test assertion)
**Impact on plan:** Necessary to keep the test suite green between task commits; the plan's own research doc (Pitfall 6) explicitly anticipated this exact staleness. No scope creep — the fix is a same-file test update directly caused by the plan's own intended schema change.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `isOutputPathLexicallySafe` is exported and ready for Plan 02's `lint.js` fs layer (`checkOutputsFs`) to reuse without duplicating the lexical cascade.
- `validateSkill`'s signature now accepts `skillNames`/`audienceMap`; Plan 02 must wire the `loadSkillAudiences` pre-pass and pass both through `processSkill`'s call site.
- No blockers. Full test suite (176 tests) green; dogfood lint/build on `REPO_ROOT` unaffected (Plan 01 changes are additive; live skills declare none of the three new fields yet — Plan 02 adds `allowed-tools` to `skills/release/SKILL.md`).

---
*Phase: 15-field-validation-integrity-guards*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: src/schema.js
- FOUND: test/schema.test.js
- FOUND: .planning/phases/15-field-validation-integrity-guards/15-01-SUMMARY.md
- FOUND commit: c047c78
- FOUND commit: 7c47376
- FOUND commit: f2a16fb
