---
phase: 16-build-skill-author-skill-retirement
plan: 01
subsystem: agent-skills
tags: [motto, agent-skill, prompt-engineering, skill-schema, dogfood]

# Dependency graph
requires:
  - phase: 14-template-mechanism
    provides: "template: procedure cascade (<process>/<success_criteria> section enforcement)"
  - phase: 15-field-validation-integrity-guards
    provides: "outputs/dependencies/allowed-tools validated fields"
provides:
  - "skills/build-skill/SKILL.md — public template:procedure Agent Skill that structures freeform input into a conforming Motto skill and self-verifies via the real linter"
  - "author-skill retired atomically (skills/author-skill/ deleted, dogfood count stays 2)"
  - "anti-hollow content-quality self-review gate encoded in build-skill's own process"
affects: [17-docs-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agent Skill as self-verifying generator: write -> real-CLI-lint-loop (<=3 attempts, filtered to dirName) -> objective self-review gate -> compact receipt"
    - "DOC-06 invariant: skill prose describes linter behavior, never restates lint error strings/regexes"

key-files:
  created: [skills/build-skill/SKILL.md]
  modified: [test/dogfood.test.js]

key-decisions:
  - "build-skill's own description is WHEN-only (deliberately diverges from release/author-skill's what+when shape), per the locked BSKL-05 rule"
  - "Skill-name collision on write: refuse and stop rather than silently overwrite (research Open Question resolved to the safer default)"
  - "allowed-tools declared as three honest Bash entries scoped to the lint invocation only (local-bin, PATH, npx fallback chain) — no Write/Read grants since the field is pre-approval-only"
  - "skill-schema.md bundled as-is (stale re: template/outputs/dependencies/allowed-tools) — build-skill's own prose carries the delta as behavioral guidance, never duplicated lint strings"

patterns-established:
  - "Content-quality gate as fixed objective checklist (3 required + 3 structural), never a scored rubric — placed after lint-clean, before the receipt"

requirements-completed: [BSKL-01, BSKL-02, BSKL-03, BSKL-04, BSKL-05, BSKL-06]

coverage:
  - id: D1
    description: "skills/build-skill/SKILL.md exists, lints clean live, and is a public template:procedure skill with shared_references: [skill-schema]"
    requirement: "BSKL-04"
    verification:
      - kind: unit
        ref: "test/dogfood.test.js#dogfood lint (DOG-03) > lintProject on REPO_ROOT returns ok:true with count=2"
        status: pass
      - kind: other
        ref: "node bin/motto.js lint -> '2 skills OK'"
        status: pass
    human_judgment: false
  - id: D2
    description: "build-skill's body encodes the full locked pipeline: untrusted-input ingest, silent one-batch gap-fill, auto template detection, guarded write (name/project/collision), filtered <=3-attempt lint loop, no DOC-06 duplication"
    requirement: "BSKL-01, BSKL-02, BSKL-03, BSKL-06"
    verification:
      - kind: other
        ref: "grep -F 'letter-start kebab-case' skills/build-skill/SKILL.md (0 matches) && grep -F 'Common Lint Errors' skills/build-skill/SKILL.md (0 matches)"
        status: pass
    human_judgment: true
    rationale: "Prompt-engineering quality (whether the prose reliably produces the intended agent behavior) is not fully provable by grep/lint alone — a human should skim the process steps for fidelity to the locked pipeline."
  - id: D3
    description: "author-skill retired atomically: skills/author-skill/ deleted, test/dogfood.test.js retargeted to build-skill, all three file operations landed in one commit, main green throughout"
    requirement: "BSKL-06"
    verification:
      - kind: unit
        ref: "test/dogfood.test.js#dogfood build (DOG-03) > dist/public/build-skill/SKILL.md exists"
        status: pass
      - kind: unit
        ref: "test/dogfood.test.js#dogfood build (DOG-03) > build-skill has references/skill-schema.md bundled"
        status: pass
      - kind: other
        ref: "git show --stat b868ea7 (skills/build-skill/SKILL.md added, skills/author-skill/SKILL.md deleted, test/dogfood.test.js modified, single commit)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Content-quality anti-hollow gate (3 required + 3 structural objective checks) inserted after the lint loop, before the receipt; self-fix-else-ask failure behavior"
    requirement: "BSKL-05"
    verification:
      - kind: other
        ref: "node bin/motto.js lint -> '2 skills OK' after gate insertion"
        status: pass
      - kind: unit
        ref: "node --test (194/194 pass after gate insertion, commit 17035e0)"
        status: pass
    human_judgment: true
    rationale: "Whether the checklist wording is genuinely objective/checkable (not rubber-stampable) is a prose-quality judgment best confirmed by a human skim, though it satisfies every automated criterion (lint-clean, no verbatim lint-string duplication, suite green)."

# Metrics
duration: 6min
completed: 2026-07-03
status: complete
---

# Phase 16 Plan 01: build-skill & author-skill Retirement Summary

**Shipped `skills/build-skill/` — a public `template: procedure` Agent Skill that structures any freeform input into a lint-clean, conforming Motto skill and self-verifies against the real linter — retiring `author-skill` in the same atomic commit.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-03T12:26:00Z (approx, following plan-creation commit)
- **Completed:** 2026-07-03T12:30:12Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 1 deleted, 1 edited)

## Accomplishments
- `skills/build-skill/SKILL.md` authored: ingests freeform input as untrusted data, gap-fills only genuinely-missing schema slots in one batch, auto-detects `template: procedure` vs base schema, guards (name/project-marker/collision) before writing, runs a real `motto lint` fallback-chain loop capped at 3 attempts and filtered to the new skill's `dirName`, then reports a compact receipt.
- `author-skill` retired outright — `skills/author-skill/` deleted, no migration copy; git history preserves it.
- `test/dogfood.test.js` retargeted: the two public-bucket dist assertions now check `build-skill` instead of `author-skill`; skill count stays 2 (net-zero swap).
- Anti-hollow content-quality self-review gate added to `build-skill`'s own process: 3 required checks (behavioral Role, non-vacuous success criteria, WHEN-only description) + 3 structural checks (verb-led steps, no leftover placeholder text scoped to prose, description length), self-fix-else-ask failure behavior, re-lints after any self-fix edit.
- Zero lint-string/regex duplication (DOC-06 invariant honored from day one) — verified live via `grep -F 'letter-start kebab-case'` and `grep -F 'Common Lint Errors'` returning no matches.

## Task Commits

Each task was committed atomically:

1. **Task 1: Atomic swap — author core build-skill/SKILL.md, delete author-skill, retarget dogfood test** - `b868ea7` (feat)
2. **Task 2: Author the content-quality self-review gate into build-skill/SKILL.md** - `17035e0` (feat)

_Both commits passed the husky pre-commit hook (`node --test`, 194/194 green)._

## Files Created/Modified
- `skills/build-skill/SKILL.md` - New public `template: procedure` skill; the phase's core deliverable
- `skills/author-skill/SKILL.md` - Deleted (directory removed outright)
- `test/dogfood.test.js` - Two dist assertions retargeted from `author-skill` to `build-skill` (lines ~92-99)

## Decisions Made
- Description written WHEN-only ("Use when authoring a new Motto skill from freeform input..."), deliberately diverging from `release`'s and `author-skill`'s "what + when" shape, per the locked BSKL-05 rule (empirically-tested `writing-skills` finding cited in RESEARCH.md).
- Skill-name collision on write resolved to refuse-and-stop (safer default, consistent with zero-silent-data-loss spirit) — this was flagged as an open research question and resolved during authoring.
- `allowed-tools` declared as three honest, narrowly-scoped Bash entries (`node_modules/.bin/motto lint*`, `motto lint*`, `npx @jeremiewerner/motto lint*`) matching the genuinely-run lint-loop fallback chain — no `outputs:`/`dependencies:` added (no contrived fields, per Phase 14/15 honest-dogfood precedent).
- `shared/references/skill-schema.md` bundled as-is (stale re: `template`/`outputs`/`dependencies`/`allowed-tools`); build-skill's own Step 2 prose supplies the delta as behavioral guidance rather than duplicating lint strings — deliberate, documented tradeoff deferred to Phase 17 (DOC-06/07).

## Deviations from Plan

None - plan executed exactly as written. Both tasks landed as specified: Task 1's atomic three-file-operation commit and Task 2's quality-gate insertion, both green on the husky pre-commit `node --test` run.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `skills/build-skill/SKILL.md` is live, lint-clean, and dogfooded (194/194 tests pass, `motto lint`/`motto build` both succeed on the post-swap tree).
- `author-skill` is fully retired; no dangling references remain in `test/dogfood.test.js` (`grep -rc author-skill` returns 0).
- Phase 17 (Docs Audit) can now proceed to rewrite `shared/references/skill-schema.md` for the newer fields and clean up any remaining README `author-skill` mentions (DOC-06/DOC-07) — this phase deliberately left the stale bundled reference and README cleanup out of scope, as planned.
- No blockers.

---
*Phase: 16-build-skill-author-skill-retirement*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: skills/build-skill/SKILL.md
- FOUND: skills/author-skill deleted
- FOUND: commit b868ea7
- FOUND: commit 17035e0
