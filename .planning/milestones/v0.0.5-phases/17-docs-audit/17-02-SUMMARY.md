---
phase: 17-docs-audit
plan: 02
subsystem: docs
tags: [readme, build-skill, author-skill-retirement, markdown]

# Dependency graph
requires:
  - phase: 16-build-skill-author-skill-retirement
    provides: build-skill (atomic swap replacing author-skill) and the retired author-skill deletion
provides:
  - README.md with zero author-skill references
  - "Author a skill" section body rewritten to describe build-skill's real ingest→gap-fill→write→lint-loop→quality-gate→receipt flow
  - All sample install/symlink/zip/table commands renamed to build-skill (copy-paste runnable against this repo's own `motto build` output)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "README section rewrite keeps heading text + Contents anchor identical while replacing only the body prose, to avoid breaking in-doc links"

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "D-06: 'Author a skill' section body rewritten around build-skill's real flow (one-batch gap-fill, auto-detect template, guarded write, 3-attempt lint loop, content-quality gate, compact receipt) rather than a mechanical name swap, since author-skill's old step-by-step interview narrative would misdescribe build-skill's actual behavior."
  - "D-07: build-skill chosen as the sample skill name in all install/symlink/zip examples because it is the one that actually exists in dist/public/ after this repo's own `motto build` — keeps every documented command copy-paste runnable."
  - "'## Author a skill' heading text and the #author-a-skill Contents anchor were deliberately left unchanged (not renamed to 'Build a skill') to avoid breaking the existing anchor link."

patterns-established: []

requirements-completed: [DOC-07]

coverage:
  - id: D1
    description: "README 'Author a skill' section body, End-to-end Step 3, and skills table row all describe/name build-skill instead of author-skill; #author-a-skill anchor preserved"
    requirement: "DOC-07"
    verification:
      - kind: other
        ref: "grep -q '## Author a skill' README.md && grep -q '(#author-a-skill)' README.md && grep -q '/motto:build-skill' README.md && grep -q '| \`build-skill\` | \`/motto:build-skill\`' README.md && ! grep -q '/motto:author-skill' README.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "All remaining mechanical author-skill sample-name sites (dist tree diagram, symlink one-liner + prose, zip one-liner, trailing substitution note) swapped to build-skill; grep -c author-skill README.md returns 0"
    requirement: "DOC-07"
    verification:
      - kind: other
        ref: "grep -c author-skill README.md (returns 0) && grep -q 'dist/public/build-skill' README.md && grep -q 'zip -r build-skill.zip build-skill/' README.md && grep -q '(#author-a-skill)' README.md"
        status: pass
      - kind: unit
        ref: "node --test (full suite, includes doc-sync DOC-06 test) — 195/195 pass"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-03
status: complete
---

# Phase 17 Plan 02: README author-skill → build-skill Docs Audit Summary

**README.md now has zero `author-skill` references — the "Author a skill" section describes build-skill's real ingest → gap-fill → write → lint-loop → quality-gate → receipt flow, and every sample command names build-skill.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-03T13:04:15Z (approx, per STATE.md session)
- **Completed:** 2026-07-03
- **Tasks:** 2
- **Files modified:** 1 (README.md)

## Accomplishments
- Rewrote the "Author a skill" section body, End-to-end Step 3 slash command, and skills-table row to name and describe `build-skill` instead of the retired `author-skill`, while preserving the `## Author a skill` heading text and `#author-a-skill` Contents anchor verbatim.
- Swapped the five remaining mechanical `author-skill` sample-name sites (dist tree diagram, symlink one-liner, symlink prose, zip one-liner, trailing substitution note) to `build-skill`.
- Confirmed `grep -c author-skill README.md` returns 0 — no lingering reference anywhere in the README (DOC-07 satisfied).

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite the "Author a skill" section body + End-to-end Step 3 + skills-table row around build-skill's real flow (D-06)** - `656c141` (docs)
2. **Task 2: Mechanical author-skill → build-skill sample-name swaps (dist tree, symlink, zip, prose) (D-07)** - `ac11eb9` (docs)

_No TDD tasks in this plan (documentation-only edits, no test changes)._

## Files Created/Modified
- `README.md` - "Author a skill" section body rewritten around build-skill's flow; End-to-end Step 3 slash command, skills table row, dist tree diagram, symlink one-liner + prose, zip one-liner, and trailing substitution note all updated from `author-skill` to `build-skill`.

## Decisions Made
- Kept the `## Author a skill` heading text and `#author-a-skill` Contents anchor unchanged (not renamed to "Build a skill") per RESEARCH.md Anchor Stability guidance — only the section body prose was rewritten.
- Left the sibling `secret-skill/` private-bucket placeholder in the dist tree diagram untouched — it's a generic illustrative name, not an author-skill reference, and was explicitly out of scope.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' automated verify commands passed on first attempt; full test suite (195/195, including the DOC-06 doc-sync test) remained green after both commits.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 17 (docs-audit) is now fully complete: Plan 01 (skill-schema.md rewrite + doc-sync test) and Plan 02 (README author-skill → build-skill) both done.
- `grep -c author-skill` returns 0 across the entire tracked source tree (verified in this plan for README.md; Plan 01's SUMMARY covers skill-schema.md and the doc-sync test).
- No blockers for milestone v0.0.5 completion review.

---
*Phase: 17-docs-audit*
*Completed: 2026-07-03*

## Self-Check: PASSED
