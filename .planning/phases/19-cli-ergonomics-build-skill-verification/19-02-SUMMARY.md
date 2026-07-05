---
phase: 19-cli-ergonomics-build-skill-verification
plan: 02
subsystem: skills
tags: [build-skill, dogfood, verification, bskv, changelog]
requires:
  - phase 16 (build-skill authored)
  - phase 18 (role section tag migration — the schema the stale global lacked)
provides:
  - 19-BSKV-FINDINGS.md (BSKV-01 live-run evidence, all three targets verdict-ed)
  - skills/changelog/ (real skill authored live through /build-skill, lints clean)
  - build-skill Step 6 stale-linter guard (repo-local bin/motto.js preferred; staleness fall-through note)
affects:
  - phase 22 public flip (CHANGELOG.md skill closes the release-allowlist gap ahead of public readers)
tech-stack:
  added: []
  patterns:
    - "In-repo dogfood lint chain: repo-local node bin/motto.js is ground truth when the checkout IS Motto"
key-files:
  created:
    - skills/changelog/SKILL.md
  modified:
    - skills/build-skill/SKILL.md
    - test/dogfood.test.js
    - .planning/phases/19-cli-ergonomics-build-skill-verification/19-BSKV-FINDINGS.md
decisions:
  - "BSKV-01 closed by a real operator-run /build-skill session (D-15), not a documented claim — all three targets observed live and verdict-ed conforms"
  - "WR-01 evidence is the Step 5.1 pre-write path only; Step 6 delete-and-recreate was not exercised (no bad name reached disk) — acceptable per RESEARCH Open Question 1"
  - "build-skill Step 6 prefers repo-local node bin/motto.js lint when the checkout IS the Motto source repo, and treats outdated-schema lint errors as a stale-binary signal to fall through (Divergence 1 fix)"
  - "changelog skill ships as audience: private (maintainer-facing, feeds release's version-bump flow)"
metrics:
  duration: ~45min (excluding operator live-run checkpoint)
  completed: 2026-07-03
status: complete
---

# Phase 19 Plan 02: build-skill Live Verification (BSKV-01) Summary

One real skill (`changelog`, private, template: procedure) authored live end-to-end through /build-skill from a staged freeform brief, with gap-fill (BSKL-01), quality gate (BSKL-05), and name-recovery (WR-01) all observed conforming; two divergences found and fixed inline.

## What Happened

- **Task 1** (commit 95b9823, prior session): scaffolded `19-BSKV-FINDINGS.md` per the D-14 schema with the staged freeform brief embedding all three targets (missing `audience`/trigger slots, an under-specified "no new commits" edge case, and the invalid working title "Claude's Changelog Assistant") plus 3 candidate topics.
- **Task 2** (checkpoint:human-verify, blocking): the operator invoked `/build-skill` live with the staged brief and picked the `changelog` topic. All three targets observed as they happened; produced skill lints clean via `node bin/motto.js lint` (3 skills OK).
- **Task 3**: findings recorded, divergences fixed inline, skill shipped.

## Verification Results (per 19-BSKV-FINDINGS.md)

| Target | Behavior | Observed | Verdict |
|--------|----------|----------|---------|
| 1 — BSKL-01 | Gap-fill fidelity | Exactly one batched message covering the 3 genuinely-missing slots (audience → private; trigger → standalone; name → `changelog`); no confirmation round on inferable values; template auto-detected | conforms |
| 2 — BSKL-05 | Quality gate | Hollow first-draft Step 3 (restated requirement) caught by check 4 (verb-led/actionable); self-rewrite from held context; re-lint clean; exactly 1 rewrite cycle | conforms |
| 3 — WR-01 | Name recovery | Step 5.1 pre-write guard rejected `claudes-changelog-assistant` ("claude" substring) BEFORE any write; re-prompt merged into the single gap-fill batch; Step 6 path not exercised (acceptable per RESEARCH OQ1) | conforms |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] build-skill Step 6 stale-linter fallback trap**
- **Found during:** Task 2 (live run), Step 6 lint loop
- **Issue:** The fallback chain resolved to a stale global `motto` on PATH (pre-v0.0.5 mise install) reporting outdated `**Role:** line` errors for all 3 skills; Step 6's "do not fall through" rule locked onto the stale output and would have driven a wrong fix. Repo-local `bin/motto.js` (ground truth) was not in the chain at all.
- **Fix:** Step 6 now prefers `node bin/motto.js lint` first when the checkout IS the Motto source repo; added a staleness sanity note (outdated-schema errors → stale-binary signal → fall through, don't "fix" the file); `allowed-tools` gained `Bash(node bin/motto.js lint*)`.
- **Files modified:** skills/build-skill/SKILL.md
- **Commit:** a7a106a

**2. [Rule 3 - Blocking] Dogfood test skill-count expectations**
- **Found during:** Task 3, pre-commit (husky runs the full suite against disk state)
- **Issue:** `test/dogfood.test.js` hardcoded `count=2`/`skillCount=2`; with `skills/changelog` added the suite failed 228/230.
- **Fix:** Updated both assertions and titles to 3 (`bucketCount` stays 2 — changelog is `private`, an existing bucket); committed in the SAME commit as the skill so the pre-commit suite stays green.
- **Files modified:** test/dogfood.test.js
- **Commit:** 012077f

## Divergences Deferred to STATE.md

None — both divergences were fixed inline.

## Known Stubs

None — `skills/changelog/SKILL.md` contains no placeholder text, hardcoded empty values, or unwired steps.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary surface. T-19-04 (injection guard) and T-19-05 (repudiation/documented-not-run) mitigations were observed live: the brief was treated as data, and BSKV-01 is backed by an on-disk findings file with non-placeholder Observed lines.

## Self-Check: PASSED

- FOUND: skills/changelog/SKILL.md
- FOUND: .planning/phases/19-cli-ergonomics-build-skill-verification/19-BSKV-FINDINGS.md (5 `Verdict:` lines, 0 TODOs)
- FOUND: commit 95b9823 (Task 1 scaffold)
- FOUND: commit 012077f (changelog skill + dogfood test fix, suite 230/230)
- FOUND: commit a7a106a (build-skill Step 6 fix + completed findings)
- Lint: `node bin/motto.js lint` → ✓ 3 skills OK
