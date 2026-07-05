---
phase: 21-publish-automation-release-rewrite
plan: 02
subsystem: infra
tags: [skill, docs, release, ci-handoff, gh-cli]

# Dependency graph
requires:
  - phase: 21-publish-automation-release-rewrite
    provides: "Plan 21-01's tag-triggered CI publish job (ci.yml) and the CI-owned D-05 tarball-leak assertion (assertTarballClean in pack-install-e2e.mjs) that this skill now delegates to and documents accurately"
provides:
  - "Rewritten skills/release/SKILL.md whose local flow ends at `git push --follow-tags` (no local npm publish, no local npm whoami)"
  - "CI Handoff / Verify CI Published / If CI Publish Fails sections closing the tag-pushed-assumed-published drift gap"
  - "allowed-tools extended with Bash(gh *) so the verify/recovery gh commands are actually runnable by an agent running this skill"
affects: [21-03, 22-public-flip-token-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Never-re-tag recovery runbook: publish-failure recovery binds exclusively to `gh run rerun <id> --failed`, with a documented emergency-only escape hatch that explicitly discloses what it bypasses"

key-files:
  created: []
  modified:
    - skills/release/SKILL.md

key-decisions:
  - "Removed all textual mentions of the word 'whoami', not just the npm whoami command block, so the acceptance criterion (grep -c whoami == 0) holds even in prose referencing what was removed"
  - "Kept 'npm publish' and 'npm pack' terms in the skill (describing CI's behavior and the emergency escape hatch) — only the maintainer's own local publish step and registry-auth check were removed, per plan Note"
  - "Step numbering fully renumbered 1-8 (Tests, Version Bump, Dogfood Check, Push, CI Handoff, Verify CI Published, If CI Publish Fails, Post-Release Housekeeping) rather than reusing old Step 4/5 numbers for new content"

requirements-completed: [PUB-02]

coverage:
  - id: D1
    description: "release skill rewritten: local flow is tests -> bump -> dogfood sanity -> git push --follow-tags (no local publish, no local whoami)"
    requirement: "PUB-02"
    verification:
      - kind: unit
        ref: "grep -c whoami skills/release/SKILL.md == 0; grep -c 'git push --follow-tags' skills/release/SKILL.md >= 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "CI Handoff, Verify CI Published, and If CI Publish Fails sections added, each referencing real ci.yml behavior (npm_guard/gh_guard, node 24 pin, gh release create --generate-notes) and gh run rerun --failed as the only recovery path"
    requirement: "PUB-02"
    verification:
      - kind: unit
        ref: "grep -c 'CI Handoff' / 'Verify CI Published' / 'If CI Publish Fails' / 'gh run rerun' skills/release/SKILL.md each >= 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "skills/release/SKILL.md remains a lint-clean template: procedure skill after the rewrite"
    requirement: "PUB-02"
    verification:
      - kind: unit
        ref: "node bin/motto.js lint -> '✓ 3 skills OK'"
        status: pass
    human_judgment: false

duration: 1min
completed: 2026-07-04
status: complete
---

# Phase 21 Plan 02: Release Skill CI-Handoff Rewrite Summary

**skills/release/SKILL.md rewritten so the maintainer's local flow terminates at `git push --follow-tags`, with local npm publish/whoami removed and new CI Handoff / Verify CI Published / If CI Publish Fails sections closing the tag-pushed-assumed-published drift gap**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-07-04T18:09:31Z
- **Completed:** 2026-07-04T18:10:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `skills/release/SKILL.md`'s local flow now ends at Step 4 (`git push --follow-tags`) — the old Step 4 inline D-05 tarball-verify heredoc and old Step 5's `npm whoami`/`npm publish` are both gone
- Step 3 (Dogfood Check) reframed as a local pre-push sanity check, explicitly noting CI's `dogfood` job re-runs the equivalent against the tagged commit
- New Step 5 — CI Handoff: documents the two-workflow-run structural fact (one per updated ref from a single `git push --follow-tags`), the tag-triggered run's re-validation of test/dogfood/pack-install-e2e (including the now CI-owned D-05 `assertTarballClean` assertion), and the two independently-guarded publish writes (`npm publish` via `npm_guard`, `gh release create --generate-notes` via `gh_guard`)
- New Step 6 — Verify CI Published: three concrete close-the-loop checks (`gh run list --workflow=CI --branch=vX.Y.Z --limit=1`, `npm view @jeremiewerner/motto version`, `gh release view vX.Y.Z`) that must all confirm before any housekeeping — directly targets the project's real prior drift (npm stuck at 0.0.3 while tags advanced)
- New Step 7 — If CI Publish Fails: never-delete-or-recreate-the-tag runbook, diagnosing via `gh run view <run-id> --log-failed`, recovering via `gh run rerun <run-id> --failed`, with an explicitly-labeled emergency-only escape hatch (`git checkout vX.Y.Z && npm publish`) that discloses it bypasses the CI D-05 check
- `allowed-tools` extended with `"Bash(gh *)"` so the new verify/recovery `gh` commands are actually runnable, not just prose
- Old Step 6 (Post-Release Housekeeping) preserved verbatim, renumbered to Step 8

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite skills/release/SKILL.md for the CI-handoff release flow (PUB-02)** - `606e8a9` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `skills/release/SKILL.md` - Frontmatter description/allowed-tools updated; `<role>` reworded; Steps 1-2 kept verbatim; Step 3 narrowed to a local sanity-check framing; old Steps 4-5 (tarball heredoc, publish/whoami) removed; new Step 4 (Push) is the terminal local command; new Steps 5-7 (CI Handoff, Verify CI Published, If CI Publish Fails) added; Post-Release Housekeeping renumbered to Step 8; `<success_criteria>` rewritten to match the new local/CI split

## Decisions Made
- Removed every textual occurrence of "whoami" (not just the command block) so the acceptance criterion (`grep -c whoami == 0`) holds cleanly, rephrasing the two prose mentions as "registry-auth check" instead
- `npm publish` and `npm pack` strings deliberately retained where they describe CI's actual behavior or the documented emergency escape hatch — only the maintainer's own local publish step and registry-auth check were removed, per the plan's explicit note
- Full step renumbering (1-8) rather than reusing old step numbers, since the new CI-handoff/verify/recovery content sits between the old "publish" step and the old "housekeeping" step

## Deviations from Plan

None beyond the self-caught fix below, which was part of normal verification-before-commit — not a post-commit deviation.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Acceptance criterion `grep -c whoami == 0` initially failed on first draft**
- **Found during:** Task 1, running the plan's own acceptance-criteria verification commands before committing
- **Issue:** The rewritten Step 4 and `<success_criteria>` prose referenced "no local `npm whoami`" to explain what was removed, which itself left two `whoami` substring matches, failing the plan's explicit `grep -c "whoami" skills/release/SKILL.md` returns 0 acceptance criterion
- **Fix:** Rephrased both mentions to say "registry-auth check" instead of naming the removed command
- **Files modified:** `skills/release/SKILL.md`
- **Verification:** Re-ran `grep -c "whoami" skills/release/SKILL.md` -> `0`; all other acceptance-criteria greps (Bash(gh *), git push --follow-tags, CI Handoff, Verify CI Published, If CI Publish Fails, gh run rerun) re-confirmed; `node bin/motto.js lint` -> `✓ 3 skills OK`; `npm test` -> 234/234 pass
- **Committed in:** `606e8a9` (part of Task 1 commit — fixed before commit, not a follow-up)

---

**Total deviations:** 1 auto-fixed (1 bug, caught pre-commit during the task's own verification step)
**Impact on plan:** No scope creep — the fix only reworded prose to satisfy the plan's own stated acceptance criterion.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required by this plan. (The `NPM_TOKEN` secret gap from plan 21-01 remains open and is scheduled for plan 21-03, not this plan.)

## Next Phase Readiness
- `skills/release/SKILL.md` is lint-clean, dogfood-tested (`npm test` 234/234, skill count unchanged at 3), and accurately describes the real `ci.yml` publish job built in plan 21-01
- The skill is now ready to be the actual maintainer-run checklist for the first real CI-published release, once plan 21-03 creates the `NPM_TOKEN` secret
- No blockers for 21-03

---
*Phase: 21-publish-automation-release-rewrite*
*Completed: 2026-07-04*

## Self-Check: PASSED
