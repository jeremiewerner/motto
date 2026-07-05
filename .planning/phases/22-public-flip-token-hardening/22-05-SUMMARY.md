---
phase: 22-public-flip-token-hardening
plan: 05
subsystem: docs
tags: [readme, badges, release-flow, marketplace, npm, oidc]

# Dependency graph
requires:
  - phase: 22-public-flip-token-hardening
    provides: "Plan 22-04 flipped jeremiewerner/motto from private to public, making the stranger-facing distribution path reachable"
provides:
  - "A recorded logged-out-stranger walkthrough result (README/npm/marketplace/skill-list path)"
  - "An accurate README.md publish-flow section (tests -> npm version -> git push --follow-tags -> CI OIDC publish), replacing the stale local npm publish flow"
  - "CI and npm version badges on README.md"
  - "A marketplace re-verify item added to skills/release/SKILL.md Step 9 (first-OIDC-publish-only follow-through)"
affects: [release, ci-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: ["README publish-flow docs must track skills/release/SKILL.md as the single source of truth for the current release process, not be independently maintained"]

key-files:
  created: []
  modified:
    - README.md
    - skills/release/SKILL.md

key-decisions:
  - "Walkthrough items 3-4 (marketplace add/install, skill-list appearance) recorded as BLOCKED-pending-first-OIDC-publish, not silently marked passed — root cause is npm `latest` for @jeremiewerner/motto still resolving to 0.0.3 (v0.0.4/0.0.5 were never published), not a README or marketplace-config defect"
  - "No additional README inaccuracy fix was needed beyond the planned badges + publish-flow rewrite — items 1-2 (README rendering, npm CLI install) passed with zero findings"
  - "Added a one-line marketplace re-verify item to skills/release/SKILL.md Step 9 (zero-tokens follow-through, first-OIDC-release-only) so items 3-4 get re-checked automatically as part of the v0.0.6 ship checklist, rather than relying on someone remembering"

requirements-completed: [OPEN-03]

coverage:
  - id: D1
    description: "Logged-out-stranger walkthrough checklist executed and recorded: README renders + links resolve (PASS), npm i -g install + motto --help (PASS), marketplace add + plugin install (BLOCKED - stale npm latest), build-skill in skill list (BLOCKED - same cause)"
    requirement: "OPEN-03"
    verification:
      - kind: manual_procedural
        ref: "Maintainer walkthrough from a logged-out browser + clean shell, per Task 1 checkpoint; results reported directly in the checkpoint resume signal"
        status: pass
    human_judgment: true
    rationale: "Distribution-path verification (browser session, clean shell, live Claude Code /plugin commands) cannot be automated or simulated in this environment; the maintainer performed the walkthrough directly."
  - id: D2
    description: "README.md carries CI + npm badges and an accurate Publish to npm section (tests -> npm version -> git push --follow-tags -> CI OIDC publish), stale local npm publish line removed"
    requirement: "OPEN-03"
    verification:
      - kind: other
        ref: "grep -c 'actions/workflows/ci.yml/badge.svg' README.md"
        status: pass
      - kind: other
        ref: "grep -c 'img.shields.io/npm/v/@jeremiewerner/motto' README.md"
        status: pass
      - kind: other
        ref: "grep -c 'fires prepublishOnly' README.md (expect 0)"
        status: pass
      - kind: unit
        ref: "node --test (full suite, 243/243 pass, unaffected by doc-only change)"
        status: pass
    human_judgment: false
---

# Phase 22 Plan 05: Stranger Walkthrough + README Accuracy Summary

**Logged-out-stranger distribution path walked and recorded (README/npm install PASS; marketplace/skill-list BLOCKED on stale npm `latest`); README's publish-flow section rewritten to match the actual tests->version-bump->push->CI-OIDC-publish flow, with CI/npm badges added.**

## Performance

- **Duration:** checkpoint-spanning (Task 1 was a blocking human-verify checkpoint requiring a genuinely logged-out browser session and clean shell)
- **Tasks:** 2 (1 checkpoint, 1 auto)
- **Files modified:** 2

## Accomplishments

- Recorded the full 4-item logged-out-stranger walkthrough checklist (README render/links, `npm i -g` install, marketplace add+install, skill-list appearance) with an explicit pass/fail/blocked verdict per item, plus root-cause diagnosis for the blocked items.
- Rewrote README.md's "Publish to npm" section to describe the real current flow (`node --test` -> `npm version X.Y.Z` -> local dogfood lint/build -> `git push --follow-tags` -> CI publishes via OIDC), removing the stale local `npm publish # fires prepublishOnly` step that predated Phase 21's release rewrite.
- Added a GitHub Actions CI badge and an npm version badge directly under README's H1 title.
- Added a marketplace re-verify item to `skills/release/SKILL.md` Step 9 (zero-tokens follow-through) so the blocked walkthrough items get re-checked automatically immediately after the first OIDC-live publish, without relying on memory.

## Task Commits

1. **Task 1: Stranger walkthrough checklist** — checkpoint only, no code changes; results recorded below and folded into Task 2.
2. **Task 2: README accuracy pass — badges + publish-flow fix + walkthrough findings** — `f2bb3ec` (docs)

**Plan metadata:** (this commit)

## Walkthrough Checklist Results (Task 1)

Performed by the maintainer from a logged-out browser and a clean shell/terminal, per the checkpoint's `<action>` steps.

| # | Item | Result |
|---|------|--------|
| 1 | `https://github.com/jeremiewerner/motto` renders logged out, all links resolve | **PASS** |
| 2 | `npm i -g @jeremiewerner/motto` in a clean shell, `motto --help` runs | **PASS** |
| 3 | `/plugin marketplace add jeremiewerner/motto` + `/plugin install motto@motto` | **FAIL** — installed plugin exposes only the retired `author-skill` and `setup-project`, not `build-skill` |
| 4 | `build-skill` appears in Claude Code's skill list | **FAIL** — same cause as item 3 |

**Root cause (diagnosed and verified):** npm's `latest` tag for `@jeremiewerner/motto` is still `0.0.3`. The marketplace plugin sources skills from the npm tarball (`.claude-plugin/marketplace.json` → `"source": "npm"`, `"skills": "./dist/public/"`), and the 0.0.3 tarball contains `dist/public/author-skill/` and `dist/public/setup-project/` — both retired in v0.0.5. v0.0.4 and v0.0.5 were never published to npm; the automated tag-push -> CI OIDC publish flow this v0.0.6 milestone builds is precisely what will close this gap. Items 3-4 cannot pass in the current npm state.

**Maintainer decision:** Defer items 3-4 to ship. Items 1-2 are recorded as PASS; items 3-4 are recorded as **BLOCKED-pending-first-OIDC-publish** (v0.0.6 ship tag), not silently marked passed. This aligns with the milestone's D-13 (ship-time-only OIDC proof). A re-verify step for the marketplace path was added to `skills/release/SKILL.md` Step 9 so it runs automatically as part of the first OIDC-live release's zero-tokens follow-through (see Deviations below).

## Files Created/Modified

- `README.md` — added CI + npm badges under the H1 title; rewrote the "Publish to npm" section body (heading/TOC anchor unchanged) to match the actual current flow; removed the stale local `npm publish` line.
- `skills/release/SKILL.md` — added item 4 to Step 9's zero-tokens follow-through: re-verify the marketplace add/install/skill-list path after the first OIDC publish, since the marketplace sources from whatever npm currently publishes as `latest`.

## Decisions Made

- Walkthrough items 3-4 are recorded as BLOCKED-pending-first-OIDC-publish rather than fixed now or silently passed — the defect is in npm's published `latest` version, not in README content or marketplace configuration, and cannot be resolved without an actual publish.
- No README content beyond the planned badges + publish-flow section needed correction — items 1-2 passed with zero reported inaccuracies, so the plan's D-11 scope boundary (badges + accuracy fixes bounded by findings, no unrelated rewrite) is satisfied exactly as planned.
- Added a one-line re-verify item to `skills/release/SKILL.md` Step 9 (rather than creating a new standalone checklist or modifying the plan's declared `files_modified`) because Step 9 already exists as the designated "runs once, first-OIDC-release-only" follow-through location — the natural home for a check that only makes sense the first time OIDC publish goes live.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added marketplace re-verify item to skills/release/SKILL.md Step 9**
- **Found during:** Task 2, incorporating the checkpoint resolution's explicit guidance
- **Issue:** The plan's `files_modified` declared only `README.md`. Without a follow-up check wired into the release process, the walkthrough's blocked items 3-4 could easily go unverified after the first OIDC publish ships — the exact "claimed done but not actually checked" failure mode this milestone is designed to avoid.
- **Fix:** Added a 4th item to Step 9 (zero-tokens follow-through, first-OIDC-release-only) instructing the maintainer to re-run the marketplace add/install steps and confirm `build-skill` appears in the skill list, immediately after the first OIDC-live publish.
- **Files modified:** `skills/release/SKILL.md`
- **Verification:** `motto lint` passes (`✓ 3 skills OK`); full test suite passes (243/243, including the `release` skill's dogfood/doc-sync tests).
- **Committed in:** `f2bb3ec` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** The release-skill addition is outside the plan's literal `files_modified` scope but was explicitly directed by the checkpoint resolution (which reasoned it was reasonably covered by Task 2's acceptance criteria) and closes a real gap — without it, the two blocked walkthrough items had no mechanism to ever get re-checked. No unrelated rewrite or scope creep beyond this one addition.

## Issues Encountered

None beyond the walkthrough's diagnosed npm-drift blocker, which is a pre-existing publish-automation gap (the very thing this v0.0.6 milestone builds), not a defect introduced by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- OPEN-03 is now substantively addressed: the stranger-facing README/npm-install path is proven live and accurate; the marketplace/skill-list path is proven blocked with a diagnosed, milestone-scoped root cause (not an unknown).
- The v0.0.6 milestone's remaining work (first tag-push -> CI OIDC publish) is what will unblock walkthrough items 3-4. `skills/release/SKILL.md` Step 9 now carries the re-verify instruction so that check isn't forgotten at ship time.
- No blockers for closing Phase 22 or proceeding to the milestone's ship step.

---
*Phase: 22-public-flip-token-hardening*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: README.md
- FOUND: skills/release/SKILL.md
- FOUND: .planning/phases/22-public-flip-token-hardening/22-05-SUMMARY.md
- FOUND commit: f2bb3ec
- FOUND commit: ddc338f
