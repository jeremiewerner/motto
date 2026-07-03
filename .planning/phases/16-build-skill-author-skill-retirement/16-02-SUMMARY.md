---
phase: 16-build-skill-author-skill-retirement
plan: 02
subsystem: docs
tags: [skill-authoring, agent-skills, lint, code-review-remediation]

# Dependency graph
requires:
  - phase: 16-build-skill-author-skill-retirement (plan 01)
    provides: skills/build-skill/SKILL.md (the shipped build-skill agent skill, and 16-REVIEW.md/16-VERIFICATION.md documenting its 2 verification gaps + 3 carried review findings)
provides:
  - Step 5 name guard extended to the full NAME cascade (kebab + lowercase-start + <=64 chars + no anthropic/claude substrings)
  - Step 6 authorized name-cascade recovery clause (delete skills/<name>/, return to Step 5 with corrected name)
  - Step 6 fallback semantics reworded so a run that reports lint errors is treated as resolved (no fall-through to stale npx on genuine lint failure)
  - Step 2 supersede statement making build-skill's own field delta authoritative over the bundled skill-schema reference
  - Step 7 check 2 scoped to template: procedure generated skills (removes undefined "(or equivalent)")
  - Step 7 quality-gate loop-back given a fresh 3-attempt budget with at most one rewrite cycle total
affects: [17-docs-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prose-only remediation plans: fix a shipped SKILL.md's process text against a documented code-review report, verified by grep-based acceptance criteria plus lint/test rerun — no code changes"

key-files:
  created: []
  modified:
    - skills/build-skill/SKILL.md

key-decisions:
  - "Guard wording added directly to the existing enumerated guard-1 sentence (kebab-case, lowercase-start, at most 64 characters, no anthropic/claude) rather than splitting into separate sub-bullets, preserving the file's existing structure"
  - "Name-cascade recovery clause placed as a new paragraph directly after the existing lint-loop paragraph in Step 6, explicitly framed as the one permitted exception to the 'never edit outside skills/<name>/' rule"
  - "Step 2 delta intro sentence rewritten in place (not appended) to directly replace the understating 'does not yet cover' framing with an explicit supersede clause naming the stale template/dependencies 'not validated' claim"

requirements-completed: [BSKL-02, BSKL-03, BSKL-05]

coverage:
  - id: D1
    description: "Step 5 guard 1 rejects >64-char and anthropic/claude-containing names pre-write, mirroring the full src/schema.js NAME cascade (WR-01 / gap #1)"
    requirement: "BSKL-02"
    verification:
      - kind: other
        ref: "grep -c 'anthropic' skills/build-skill/SKILL.md >= 1; grep -c '64' skills/build-skill/SKILL.md >= 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Step 6 authorizes name-cascade recovery (delete skills/<name>/, return to Step 5) as a backstop when the linter rejects the name itself"
    requirement: "BSKL-03"
    verification:
      - kind: other
        ref: "Read: Step 6 contains 'delete `skills/<name>/`' and 'corrected name' recovery clause"
        status: pass
    human_judgment: true
    rationale: "Behavioral fidelity of the recovery clause (whether an executing agent actually follows it correctly end-to-end) requires a live run, scoped as human-verification in 16-VERIFICATION.md item #3"
  - id: D3
    description: "Step 6 fallback chain falls through only on command-not-found/exec failure, never on a genuine lint failure that reports errors (WR-02 / gap #2)"
    requirement: "BSKL-03"
    verification:
      - kind: other
        ref: "grep -F 'until one resolves' skills/build-skill/SKILL.md returns 0 matches"
        status: pass
    human_judgment: false
  - id: D4
    description: "Step 2 supersede statement makes build-skill's field delta authoritative over the bundled skill-schema reference, explicitly covering the stale template/dependencies 'not validated' claim (WR-03)"
    requirement: "BSKL-02"
    verification:
      - kind: other
        ref: "grep -F 'For the newer fields it does not yet cover, apply this delta yourself:' returns 0 matches; Step 2 prose contains 'supersedes' and 'validated'"
        status: pass
    human_judgment: false
  - id: D5
    description: "Step 7 check 2 scoped to template: procedure generated skills, removing the undefined '(or equivalent)' escape hatch (IN-01)"
    requirement: "BSKL-05"
    verification:
      - kind: other
        ref: "grep -F '(or equivalent)' skills/build-skill/SKILL.md returns 0 matches"
        status: pass
    human_judgment: false
  - id: D6
    description: "Step 7 loop-back specifies a fresh 3-attempt budget and at most one quality-gate rewrite cycle total (IN-02)"
    requirement: "BSKL-05"
    verification:
      - kind: other
        ref: "Read: Step 7 loop-back sentence references 'fresh 3-attempt budget' and 'at most one'"
        status: pass
    human_judgment: false
  - id: D7
    description: "DOC-06 preserved and build-skill still lints clean; full suite green"
    verification:
      - kind: unit
        ref: "node bin/motto.js lint (2 skills OK); node --test (194 pass / 0 fail); grep -F 'letter-start kebab-case' and grep -F 'Common Lint Errors' both 0 matches"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-03
status: complete
---

# Phase 16 Plan 02: Close build-skill's Review Gaps Summary

**Extended build-skill's Step 5 name guard to the full NAME cascade (>64 chars, anthropic/claude substrings) and gave Step 6 an authorized name-recovery backstop plus exec-vs-lint fallback semantics, closing both structured verification gaps and all three carried code-review findings (WR-01, WR-02, WR-03, IN-01, IN-02).**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-03T11:04:00Z (approx.)
- **Completed:** 2026-07-03T11:12:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Step 5 guard 1 now rejects all three NAME-cascade failure classes pre-write (not-kebab, >64 chars, anthropic/claude substrings), matching `src/schema.js`'s validator behaviorally without duplicating its error strings
- Step 6 gained an authorized name-cascade recovery clause — the one permitted whole-directory operation — so a name error that reaches lint is now recoverable instead of an unfixable dead end
- Step 6's lint fallback chain now distinguishes "command not found" from "command ran and reported lint errors," preventing a version-skewed verdict from the stale published npx registry version
- Step 2, Step 7 check 2, and Step 7's loop-back all received the three carried prose-consistency fixes from 16-REVIEW.md (supersede statement, procedure-only scoping, bounded attempt budget)

## Task Commits

Each task was committed atomically:

1. **Task 1: Close the two structured gaps — full NAME-cascade guard + name-recovery clause (WR-01) and exec-vs-lint-failure fallback semantics (WR-02)** - `4cbb97d` (fix)
2. **Task 2: Close the three carried review prose fixes — Step 2 supersede (WR-03), Step 7 check-2 scoping (IN-01), Step 7 attempt-budget (IN-02)** - `a5609aa` (docs)

_No TDD tasks in this plan — pure prose edits to an already-tracked file._

## Files Created/Modified
- `skills/build-skill/SKILL.md` - Step 5 guard 1 extended (kebab + lowercase-start + <=64 chars + no anthropic/claude); Step 6 gained a name-cascade recovery clause and reworded fallback semantics (falls through only on exec failure); Step 2 gained a supersede statement over the bundled skill-schema reference; Step 7 check 2 scoped to `template: procedure`; Step 7 loop-back given a fresh 3-attempt budget with at most one rewrite cycle

## Decisions Made
- Guard wording folded directly into the existing enumerated guard-1 sentence rather than adding new sub-bullets, keeping the numbered-guard structure intact
- Name-recovery clause placed as its own paragraph immediately after the lint-loop paragraph in Step 6, explicitly called out as the sole exception to the "never edit outside skills/<name>/" rule
- Step 2's understating "does not yet cover" framing replaced in place with an explicit supersede clause naming the stale `template`/`dependencies` "not validated" claim, mirroring the existing Step 7 check-3 supersede pattern already present in the file

## Deviations from Plan

None - plan executed exactly as written. Both tasks' acceptance criteria (grep-based structural checks plus `node bin/motto.js lint` / `node --test`) passed on first attempt with no auto-fixes required.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 16's two structured verification gaps (WR-01/gap #1, WR-02/gap #2) and all three carried code-review findings (WR-03, IN-01, IN-02) are closed. Only the human-verification items already scoped in 16-VERIFICATION.md remain (live gap-fill fidelity, quality-gate fidelity, post-fix WR-01 behavioral confirmation via an actual build-skill run) — these require executing build-skill end-to-end with a real `claude-*`-style input, out of scope for this prose-only plan.
- build-skill lints clean (`node bin/motto.js lint` reports `2 skills OK`) and the full suite is green (194 pass / 0 fail) after both commits.
- Phase 16 is otherwise ready to move to verification/completion; Phase 17 (Docs Audit) can proceed to rewrite `shared/references/skill-schema.md` §6's stale template/dependencies claim, which this plan's Step 2 supersede statement neutralizes in the interim without requiring the reference rewrite as a blocker.

---
*Phase: 16-build-skill-author-skill-retirement*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: skills/build-skill/SKILL.md
- FOUND: .planning/phases/16-build-skill-author-skill-retirement/16-02-SUMMARY.md
- FOUND: 4cbb97d (Task 1 commit)
- FOUND: a5609aa (Task 2 commit)
- FOUND: 5c48a3d (Summary commit)
