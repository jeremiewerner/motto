---
phase: 24-upgrade-path-ledger-policy
plan: 02
subsystem: docs
tags: [release-process, upgrade-path, ledger, claude-md, checkpoint]

# Dependency graph
requires:
  - phase: 24-01
    provides: UPGRADING.md ledger file with v0.0.5 and v0.0.7 seed entries
provides:
  - Blocking Ledger Gate step in skills/release/SKILL.md (Step 4, between Dogfood Check and Push)
  - Upgrade-path constraint synced into .claude/CLAUDE.md's GSD-managed Constraints block
  - Live-validated v0.0.7 UPGRADING.md entry (magma walkthrough) with a corrected version-discovery command
affects: [release, changelog, future-schema-change-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Ledger Gate: blocking release-skill step gated on a path-scoped git diff since last tag + explicit entry-or-verdict escape hatch"]

key-files:
  created: []
  modified:
    - skills/release/SKILL.md
    - .claude/CLAUDE.md
    - UPGRADING.md

key-decisions:
  - "Ledger Gate inserted as clean Step 4 (Steps 4-9 renumbered 5-10), mirroring Step 1's blocking idiom exactly (D-01)"
  - "File-list rationale documented inline as a mechanical trigger; human/agent verdict is the real backstop (D-02)"
  - "CLAUDE.md Constraints sync is a one-time catch-up of a stale GSD-managed derived copy, not a new authoring decision; PROJECT.md line 142 stays the source of truth and is untouched (D-03)"
  - "Checkpoint verdict: approved with friction — magma stamp adoption succeeded from UPGRADING.md prose alone, but Step 2's version-discovery commands were both broken for the target audience and required a Plan 01 correction rather than a silent workaround"
  - "Corrected UPGRADING.md v0.0.7 Step 2: removed 'motto --version' (does not exist in any motto version — bin/motto.js only accepts init|lint|build) and replaced with 'npm ls -g @jeremiewerner/motto' as the primary command (global install is the common case), keeping 'npm ls @jeremiewerner/motto' as the local-install fallback"

patterns-established:
  - "Ledger Gate pattern: path-scoped git diff since last tag as the mechanical trigger, human/agent spoken verdict as the actual backstop -- reusable for any future forcing-function step"

requirements-completed: [UPG-02]

coverage:
  - id: D1
    description: "Blocking Ledger Gate step inserted into skills/release/SKILL.md between Dogfood Check and Push, with clean renumbering and lint-clean output"
    requirement: "UPG-02"
    verification:
      - kind: unit
        ref: "node --test test/dogfood.test.js (skill counts intact)"
        status: pass
      - kind: other
        ref: "node bin/motto.js lint (release skill tree OK)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Upgrade-path constraint synced into .claude/CLAUDE.md's GSD-managed Constraints block, pointing at UPGRADING.md and the Ledger Gate"
    requirement: "UPG-02"
    verification:
      - kind: other
        ref: "grep -qi 'upgrade path' .claude/CLAUDE.md && grep -q 'UPGRADING.md' .claude/CLAUDE.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "magma stamped with mottoVersion from UPGRADING.md's v0.0.7 entry alone (live human walkthrough); friction (broken version-discovery commands) fed back as a corrected Step 2, not silently patched around"
    requirement: "UPG-02"
    verification: []
    human_judgment: true
    rationale: "Live cross-repo validation against an external project (~/Projects/magma) performed by a human reader following only the documented prose -- inherently a manual judgment call, not something a unit test can assert."

# Metrics
duration: 25min
completed: 2026-07-06
status: complete
---

# Phase 24 Plan 02: Upgrade-Path Ledger Policy Enforcement Summary

**Blocking Ledger Gate added to the release skill, upgrade-path rule synced into CLAUDE.md, and the v0.0.7 ledger entry corrected after a live magma walkthrough exposed two broken version-discovery commands.**

## Performance

- **Duration:** ~25 min (across two agent sessions, spanning the Task 3 checkpoint)
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 3 (skills/release/SKILL.md, .claude/CLAUDE.md, UPGRADING.md)

## Accomplishments
- Inserted a blocking "Ledger Gate" step (Step 4) into `skills/release/SKILL.md`, mirroring Step 1's blocking idiom: a fenced `git diff` over the four schema-bearing files since the last tag, with an explicit "do NOT proceed until a UPGRADING.md entry exists OR a spoken 'not breaking' verdict is recorded" escape hatch. Steps 4-9 cleanly renumbered to 5-10 with all internal cross-references updated.
- Synced the upgrade-path constraint into `.claude/CLAUDE.md`'s GSD-managed Constraints block (a one-time catch-up from its already-correct PROJECT.md source), so any agent session planning a structure/schema change sees the rule at plan time, not just at release time.
- Live-validated the v0.0.7 UPGRADING.md entry by walking `~/Projects/magma` through its documented steps alone (human checkpoint). Stamp adoption succeeded — `motto.yaml` now carries `mottoVersion: "0.0.6"` in the documented position, `motto lint` in magma reports clean, and this repo's own `motto.yaml` and dogfood test remained untouched.
- Corrected the friction surfaced by the walkthrough: Step 2's version-discovery guidance named two commands that both fail for the target audience (`motto --version` doesn't exist in any motto version; `npm ls @jeremiewerner/motto` returns empty for the common global-install case). Replaced with the command that actually worked live (`npm ls -g @jeremiewerner/motto`), keeping the local-install form as an explicit fallback.

## Task Commits

Each task was committed atomically:

1. **Task 1: Insert the blocking Ledger Gate step into skills/release/SKILL.md** - `58d3f05` (feat)
2. **Task 2: Sync the upgrade-path rule into .claude/CLAUDE.md's managed Constraints block** - `3466529` (docs)
3. **Task 3: Live-validate the v0.0.7 ledger entry by stamping magma from the docs alone** - checkpoint (human-verify, no repo commit; external magma repo stamped out-of-band)
4. **Checkpoint correction: fix UPGRADING.md v0.0.7 Step 2 version-discovery commands** - `698d1e6` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `skills/release/SKILL.md` - New Step 4 "Ledger Gate" (blocking, mirrors Step 1's idiom); Steps 4-9 renumbered 5-10; new success-criteria bullet
- `.claude/CLAUDE.md` - New upgrade-path bullet in the GSD-managed Constraints block, inside the `<!-- GSD:project-start -->` / `<!-- GSD:project-end -->` markers
- `UPGRADING.md` - v0.0.7 entry Step 2 corrected: removed nonexistent `motto --version`, replaced with `npm ls -g @jeremiewerner/motto` (primary) / `npm ls @jeremiewerner/motto` (local fallback)

## Decisions Made
- Ledger Gate mirrors Step 1's blocking strength exactly (heading → rationale → fenced command → explicit "do NOT proceed until" clause) per D-01.
- The four-file diff list (`src/schema.js src/templates.js src/config.js src/init.js`) is documented as a mechanical trigger with an inline staleness-risk note; the human/agent spoken verdict is the real backstop, not the list (D-02).
- CLAUDE.md's edit is explicitly framed as a one-time sync of a stale GSD-managed derived block, not a fresh decision — PROJECT.md line 142 remains the untouched source of truth (D-03).
- **Checkpoint verdict: approved with friction.** The live walkthrough by an independent reader confirmed the stamp-adoption steps work end-to-end (placement snippet, distinct-fields note, Verify line all accurate), but flagged that Step 2's two version-discovery commands were both broken for a pre-v0.0.7 user: `motto --version` is not a real CLI option in any released or unreleased motto version, and `npm ls @jeremiewerner/motto` returns empty for the common case of a globally-installed CLI. Per the checkpoint's explicit instruction ("that friction is a defect in UPGRADING.md's v0.0.7 entry and must be fed back as a Plan 01 correction, not silently patched over"), the entry itself was corrected rather than worked around.

## Deviations from Plan

### Auto-fixed Issues

**1. [Checkpoint-mandated correction] Fixed broken version-discovery commands in UPGRADING.md's v0.0.7 entry**
- **Found during:** Task 3 checkpoint (live magma walkthrough, performed by an independent reader)
- **Issue:** Step 2 instructed readers to check their installed motto version via `motto --version` (a nonexistent CLI option — `bin/motto.js` only accepts `init|lint|build`) or `npm ls @jeremiewerner/motto` (returns empty output for the common case of a global install, since `npm ls` without `-g` only inspects local `node_modules`)
- **Fix:** Removed `motto --version` entirely; replaced the guidance with `npm ls -g @jeremiewerner/motto` (verified live to return `@jeremiewerner/motto@0.0.6`) as the primary command, with `npm ls @jeremiewerner/motto` retained as the local-install fallback
- **Files modified:** UPGRADING.md
- **Verification:** `grep -rn "motto --version" test/ src/ UPGRADING.md` returns no matches; `node --test` reports 293 pass / 0 fail; `node bin/motto.js lint` reports `✓ 3 skills OK`
- **Committed in:** `698d1e6`

---

**Total deviations:** 1 (checkpoint-mandated ledger correction, not a Rule 1-4 auto-fix — explicitly required by the checkpoint's resolution instructions)
**Impact on plan:** The correction closes the exact gap the checkpoint exists to catch: proving the ledger's prose actually works for the target audience, not just that the mechanism exists. No scope creep — only Step 2's two command references changed; placement snippet, distinct-fields note, and Verify line were left untouched (confirmed accurate by the walkthrough).

## Issues Encountered
None beyond the checkpoint-surfaced friction documented above, which was the intended purpose of Task 3.

## User Setup Required
None - no external service configuration required. (The magma stamp was applied directly by the human verifier as part of the checkpoint walkthrough, external to this repo's changeset.)

## Next Phase Readiness
- Phase 24 (upgrade-path-ledger-policy) is now fully complete: Plan 01 built the ledger artifact, Plan 02 made it operational (ship-time gate + plan-time discoverability) and live-validated the seed entry.
- UPG-01 and UPG-02 both closed.
- No blockers for subsequent phases. The Ledger Gate and CLAUDE.md sync are self-contained process changes; future phases that touch `src/schema.js`, `src/templates.js`, `src/config.js`, or `src/init.js` will be prompted by the gate at release time.

---
*Phase: 24-upgrade-path-ledger-policy*
*Completed: 2026-07-06*
