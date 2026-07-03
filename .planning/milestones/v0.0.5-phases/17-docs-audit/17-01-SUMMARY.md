---
phase: 17-docs-audit
plan: 01
subsystem: docs
tags: [markdown, node-test, schema-reference, drift-guard]

# Dependency graph
requires:
  - phase: 14-template-mechanism
    provides: template cascade validation live in src/schema.js
  - phase: 15-field-validation-integrity-guards
    provides: outputs/dependencies/allowed-tools validation in src/schema.js and src/lint.js
  - phase: 16-build-skill-author-skill-retirement
    provides: build-skill SKILL.md with the interim Step 2 supersede/delta prose
provides:
  - Current shared/references/skill-schema.md (no version header, real template/outputs/dependencies/allowed-tools sections)
  - test/doc-sync.test.js — a node:test guard that fails the suite if a live error string diverges from the doc
  - Trimmed build-skill Step 2 (single reference-pointing sentence, no delta/supersede)
affects: [17-02-docs-audit (README rewrite), any future phase touching src/schema.js or src/lint.js error strings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Doc-sync guard: curated static error-message segments, checked code -> doc only (never doc -> code), self-check + containment assert per segment"

key-files:
  created:
    - test/doc-sync.test.js
  modified:
    - shared/references/skill-schema.md
    - skills/build-skill/SKILL.md

key-decisions:
  - "Header D-04: skill-schema.md carries a source citation, not a version number — the doc-sync test is the freshness guarantee going forward"
  - "D-01 surgical patch: kept existing §1/§3/§5 skeleton verbatim; only §2/§4/§6 patched and §7-§9 added net-new; renumbered old §7 to §10"
  - "Doc-sync test uses Option 1 (source-text extraction) per RESEARCH.md recommendation — no fixture wiring, no re-invocation of validateSkill, matches project's minimalism"

patterns-established:
  - "Direction of assertion in drift guards: derive expected strings from the CODE, assert containment IN the doc — never the reverse (Pitfall 3)"

requirements-completed: [DOC-06]

coverage:
  - id: D1
    description: "shared/references/skill-schema.md rewritten current: no version number in header, §2 description drift fixed (missing non-string error + array special-case), §4 cross-references template waives, §6 rewritten to document the real template cascade (replacing the false 'NOT validated' claim), new §7 outputs (two-layer), §8 dependencies (three ordering rules), §9 allowed-tools, §10 renumbered Frontmatter Envelope"
    requirement: "DOC-06"
    verification:
      - kind: unit
        ref: "test/doc-sync.test.js#doc-sync (DOC-06)"
        status: pass
      - kind: other
        ref: "grep -c 'v0.0.2' shared/references/skill-schema.md -> 0; grep -q 'NOT validated in Motto' -> absent"
        status: pass
    human_judgment: false
  - id: D2
    description: "test/doc-sync.test.js added: curated static error-message segments derived from src/schema.js and src/lint.js source text, asserted present in both the live source (self-check) and skill-schema.md (doc containment). Manually verified the guard fails when a quoted string is removed from the doc."
    requirement: "DOC-06"
    verification:
      - kind: unit
        ref: "node --test test/doc-sync.test.js"
        status: pass
      - kind: other
        ref: "grep -c 'process.cwd' test/doc-sync.test.js -> 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "build-skill Step 2 trimmed to a single reference-pointing sentence — no supersede clause, no 4-bullet field delta — now that skill-schema.md is current and bundled verbatim"
    requirement: "DOC-06"
    verification:
      - kind: other
        ref: "grep -c 'letter-start kebab-case' skills/build-skill/SKILL.md -> 0; grep -c 'Common Lint Errors' -> 0; node bin/motto.js lint -> clean; node --test -> 195/195 pass"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-03
status: complete
---

# Phase 17 Plan 1: Docs Audit — skill-schema.md Rewrite + Doc-Sync Guard Summary

**Rewrote `shared/references/skill-schema.md` to match the live v0.0.5 validator (template/outputs/dependencies/allowed-tools, no stale version header), added a `node:test` doc-sync guard that fails the suite on drift, and trimmed build-skill's Step 2 supersede/delta prose to a single sentence now that the bundled reference tells the truth.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-03T12:34:53Z (approx, per plan-phase context read)
- **Completed:** 2026-07-03T13:00:20Z
- **Tasks:** 3 completed
- **Files modified:** 3 (1 new, 2 edited)

## Accomplishments
- `shared/references/skill-schema.md` no longer makes the actively false claim that `template`/`dependencies` are "NOT validated" — §6 now documents the real cascade (unknown-template error, per-section `<tag>...</tag>` requirement, `hasClosedSection`'s fence/line-anchoring semantics), and new §7/§8/§9 document `outputs` (split into schema.js lexical + lint.js filesystem layers), `dependencies` (three load-bearing ordering rules), and `allowed-tools` (Option A format-only).
- `test/doc-sync.test.js` mechanizes the freshness guarantee the stale header used to fake manually: 29 curated static error-message segments are asserted present in both live `src/schema.js`/`src/lint.js` source text (self-check) and the doc (containment), direction strictly code → doc.
- `skills/build-skill/SKILL.md` Step 2 dropped its Phase-16 stopgap delta and supersede clause — it now points to the bundled reference with zero local field re-description, closing the last remaining doc-sync risk in that file.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite skill-schema.md current** - `de154c2` (docs)
2. **Task 2: Add test/doc-sync.test.js** - `1f919dd` (test)
3. **Task 3: Trim build-skill Step 2** - `4e54352` (docs)

_No TDD RED/GREEN split was applicable here — Task 1 and Task 2 were marked `tdd="true"` in the plan but are doc/test-authoring tasks with no separate red-then-green cycle (there is no pre-existing passing implementation to make a test fail against); each was verified directly against its stated acceptance criteria before commit._

## Files Created/Modified
- `shared/references/skill-schema.md` - Header D-04 fix (no version number); §2 drift fix (missing non-string error + array-special-case note); §4 template-waives cross-reference; §6 rewritten to the real `template` cascade; new §7 `outputs` (two-layer), §8 `dependencies` (three ordering rules + wording-asymmetry note), §9 `allowed-tools`; old §7 Frontmatter Envelope renumbered to §10.
- `test/doc-sync.test.js` - New `node:test` file; one `describe('doc-sync (DOC-06)')` block; 29 curated static segments; two asserts per segment (source self-check + doc containment); `REPO_ROOT` anchored via `import.meta.url`, never a working-directory-derived path.
- `skills/build-skill/SKILL.md` - Step 2 body replaced with a single sentence pointing to the bundled `skill-schema` reference; no delta, no supersede clause.

## Decisions Made
- Followed the plan's locked §1-§10 renumbering scheme exactly (D-01): §1 name, §2 description, §3 audience, §4 body spine, §5 shared_references, §6 template, §7 outputs, §8 dependencies, §9 allowed-tools, §10 frontmatter envelope.
- Chose Option 1 (source-text extraction) for the doc-sync test per RESEARCH.md's default recommendation — no fixture wiring, no `validateSkill()` re-invocation, matches the project's stated "small `node:test`" scope.
- Reworded two in-file comments in `test/doc-sync.test.js` from "process.cwd()" to "the current working directory" so the file satisfies the plan's own acceptance criterion (`grep -c 'process.cwd' test/doc-sync.test.js` → 0) while still documenting the anti-pattern being avoided — a self-referential edge case not called out explicitly in the plan but required by its own grep check.

## Deviations from Plan

None — plan executed exactly as written, aside from the minor comment-wording adjustment noted above (not a behavior change, just avoiding a literal substring match against the file's own explanatory comment).

## Issues Encountered

None. All three tasks' automated verification blocks passed on the first attempt after implementation; the manual drift-guard spot-check (removing "audience-direction guard" from the doc, confirming test failure, then restoring the doc) was performed as instructed by Task 2's acceptance criteria and confirmed working before the doc was restored and committed clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `shared/references/skill-schema.md` is current and bundled verbatim by `motto build` — plan 17-02 (README rewrite, DOC-07) can proceed independently; it touches a disjoint file set.
- Full suite green (195/195), `motto lint` clean, both DOC-06 grep invariants (`letter-start kebab-case`, `Common Lint Errors` → 0) still hold in `skills/build-skill/SKILL.md`.
- The doc-sync test now rides the existing husky pre-commit gate — any future change to `src/schema.js`/`src/lint.js` error strings that isn't mirrored in `skill-schema.md` will break `node --test` at commit time.

---
*Phase: 17-docs-audit*
*Completed: 2026-07-03*

## Self-Check: PASSED

All created/modified files confirmed present on disk (shared/references/skill-schema.md, test/doc-sync.test.js, skills/build-skill/SKILL.md); all three task commits (de154c2, 1f919dd, 4e54352) confirmed present in `git log`.
