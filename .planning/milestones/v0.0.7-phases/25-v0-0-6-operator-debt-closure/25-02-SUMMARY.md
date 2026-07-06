---
phase: 25-v0-0-6-operator-debt-closure
plan: 02
subsystem: infra
tags: [npm, claude-code-plugin, marketplace, distribution, readme]

# Dependency graph
requires:
  - phase: 25-01
    provides: Trusted-publisher-only publishing lock, so any patch release this plan might have triggered would publish through the locked config
  - phase: 22-public-flip-token-hardening
    provides: The stranger-walkthrough checklist shape this plan extends with a content-diff step
provides:
  - README.md plugin-cache caveat documenting Claude Code's local plugin cache and how to force a refresh
  - Leak-safe, committed stranger re-walk record (25-REWALK.md) closing DEBT-06 via content diff, not cache-status trust
affects: [future release/SKILL.md Step 10 executions, any future marketplace-distribution debt]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/25-v0-0-6-operator-debt-closure/25-REWALK.md
  modified:
    - README.md

key-decisions:
  - "Task 2's checklist items (marketplace add/install, skill-list check, content diff) all require a genuinely stranger-like environment (logged-out browser, clean shell) that cannot be simulated by the agent — recorded as maintainer attestation, mirroring 25-TOKEN-LOCKDOWN.md's attestation style, not agent-observed output"
  - "Cache status alone was explicitly not accepted as proof — the pass condition is the content diff of the installed plugin directory against dist/public rebuilt from the released v0.0.6 tag"

patterns-established:
  - "Leak-safe evidence record shape (opening scope statement + per-item command/result/attestation/date) reused a third time (after 22-SECRETS-SCAN.md and 25-TOKEN-LOCKDOWN.md) for a distribution-path debt closure record"

requirements-completed: [DEBT-06]

coverage:
  - id: D1
    description: "README's marketplace install section documents the Claude Code plugin-cache caveat with the literal string 'plugin cache', grep-verifiable, with no unrelated README changes"
    requirement: "DEBT-06"
    verification:
      - kind: other
        ref: "grep -c 'plugin cache' README.md (returns 1); git diff README.md scoped to the blockquote addition only"
        status: pass
    human_judgment: false
  - id: D2
    description: "Stranger install path (npm latest=0.0.6, /plugin marketplace add + install, build-skill visible, retired skills absent) verified, with the pass proven by content diff of installed plugin directory against dist/public rebuilt from the v0.0.6 tag rather than cache-status trust"
    requirement: "DEBT-06"
    verification:
      - kind: manual_procedural
        ref: "Maintainer attestation: 'approved — build-skill installs and installed content matches source' (2026-07-06), recorded in 25-REWALK.md"
        status: pass
    human_judgment: true
    rationale: "The checklist requires a logged-out browser session and a clean shell to be genuinely stranger-like; Claude Code's plugin cache location and installed-plugin content are not agent-inspectable from this session. Only the maintainer can perform and observe the marketplace add/install, the skill-list check, and the content diff."
  - id: D3
    description: "No defect found in the published 0.0.6 tarball; D-02 patch-release contingency did not trigger; no NPM_TOKEN was re-minted"
    verification:
      - kind: other
        ref: "25-REWALK.md Outcome section — 'No defect found', 'No patch release was required', 'No NPM_TOKEN was re-minted'"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-06
status: complete
---

# Phase 25 Plan 02: Marketplace Stranger Re-Walk Summary

**Closed DEBT-06 — README now documents the Claude Code plugin-cache caveat, and a maintainer-attested stranger re-walk confirms build-skill installs from npm latest=0.0.6 with content matching source-built-from-tag, not just cache status.**

## Performance

- **Duration:** 9 min (across two sessions, spanning a blocking human checkpoint)
- **Started:** 2026-07-06
- **Completed:** 2026-07-06
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Added a `> **Note:**` blockquote to README's "Add the marketplace to Claude Code" section documenting that Claude Code caches installed plugin content locally, so a stale-looking install can be refreshed by re-running `/plugin marketplace add jeremiewerner/motto` (or reinstalling)
- Confirmed npm `latest` for `@jeremiewerner/motto` = `0.0.6` (agent-verified precondition, recorded before the checkpoint)
- Maintainer walked the full stranger checklist in a clean Claude Code session: marketplace add + install succeeded, `build-skill` appeared in the skill list with `author-skill`/`setup-project` absent, and a content diff of the installed plugin directory against `dist/public/` rebuilt from the `v0.0.6` tag showed a match
- Recorded the full result in `25-REWALK.md`, explicitly noting that cache status alone was not accepted as proof — the content diff match is the pass condition per DEBT-06's wording
- No defect found; the D-02 patch-release contingency did not fire; no `NPM_TOKEN` was re-minted

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the plugin-cache caveat to the README marketplace install section** - `1e457e3` (docs)
2. **Task 2: Stranger re-walk with installed-content diff against source** - `1c04f3c` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `README.md` - Added a plugin-cache caveat blockquote to the marketplace install section (sibling to the existing prerequisite callout)
- `.planning/phases/25-v0-0-6-operator-debt-closure/25-REWALK.md` - Leak-safe evidence record for DEBT-06: agent-verified npm latest precondition, maintainer-attested checklist result (marketplace add/install, skill-list check, content diff), and outcome (no defect, no patch release, no token re-mint)

## Decisions Made
- Task 2's checkpoint resolution recorded as maintainer attestation (the offered pass form "approved — build-skill installs and installed content matches source"), not as agent-observed command output, since the checklist requires a genuinely stranger-like environment the agent cannot simulate — mirrors the attestation style already established in `25-TOKEN-LOCKDOWN.md`
- Cache status was explicitly excluded as proof; the record states the content diff match is the actual pass condition, per the plan's acceptance criteria and DEBT-06's wording

## Deviations from Plan

None - plan executed exactly as written. The blocking human checkpoint (Task 2) was resolved by the maintainer's "approved" response confirming all three checklist items passed; the resuming agent wrote `25-REWALK.md` recording the attestation exactly as the plan's read_first/action guidance specified.

## Issues Encountered
None.

## User Setup Required
None - the stranger walkthrough itself was the checkpoint and is now complete, per maintainer attestation.

## Next Phase Readiness
- DEBT-06 is closed: the public marketplace install path is proven for a stranger, with the plugin-cache caveat now documented for future strangers who hit a stale cache
- All three v0.0.6 Step 9/10 operator debts (DEBT-06, DEBT-07, DEBT-08) are now closed across Phase 25's two plans
- No blockers for subsequent phases or milestone completion

---
*Phase: 25-v0-0-6-operator-debt-closure*
*Completed: 2026-07-06*
