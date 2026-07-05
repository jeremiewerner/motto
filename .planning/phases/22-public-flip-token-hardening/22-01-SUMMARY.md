---
phase: 22-public-flip-token-hardening
plan: 01
subsystem: infra
tags: [gitleaks, secrets-scan, pii-sweep, git-history, project-decisions]

requires:
  - phase: 21-publish-automation-release-rewrite
    provides: CI publish job (NPM_TOKEN-based), rewritten release skill (local flow ends at push)
provides:
  - Committed leak-safe gitleaks full-history scan record (Scan #1 — triage lead time)
  - Committed mechanical PII sweep across full history + working tree, with per-finding disposition
  - PROJECT.md Key Decisions row recording the .planning/ public-as-is visibility decision (OPEN-02), informed by the PII sweep's commit-metadata finding
affects: [22-02, 22-03, 22-04, 22-05]

tech-stack:
  added: []
  patterns:
    - "Leak-safe recorded verification (Phase 21 pattern reused): committed markdown record with tool version/HEAD SHA/exit code/counts, never raw JSON or matched secret text"

key-files:
  created:
    - .planning/phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md
  modified:
    - .planning/PROJECT.md

key-decisions:
  - "gitleaks git . full-history scan #1 (of 2, per D-08) recorded clean: 405 commits, HEAD 1b1814c, exit 0, 0 findings"
  - "jeremie@studiometa.fr commit-metadata email flagged as a gitleaks-blind-spot PII finding, accepted (not purged) per D-01/D-06, and cited in the PROJECT.md decision row"
  - ".planning/ visibility decision (public as-is, no history rewrite) now an explicit, dated, rationale-backed PROJECT.md Key Decisions row — OPEN-02 fully closed"

patterns-established:
  - "Leak-safe scan record shape (command/version/SHA/count/exit-code/findings) reusable by plan 22-04's final pre-flip rescan"

requirements-completed: [OPEN-01, OPEN-02]

coverage:
  - id: D1
    description: "Full-history gitleaks scan #1 run and recorded leak-safely (command, version, HEAD SHA, commits scanned, exit code, findings count)"
    requirement: "OPEN-01"
    verification:
      - kind: manual_procedural
        ref: "gitleaks git . --report-format json --report-path <scratch> --exit-code 0 (405 commits scanned, exit 0, 0 findings, verified live this session)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mechanical PII sweep (commit metadata + working-tree grep + diff-content grep) run across full history, every distinct finding dispositioned"
    requirement: "OPEN-02"
    verification:
      - kind: manual_procedural
        ref: "git log --all --format='%ae|%ce' | sort -u; grep -rEn ... .planning/; git log -p --all | grep -Eo ... (all three run live, results recorded in 22-SECRETS-SCAN.md)"
        status: pass
    human_judgment: false
  - id: D3
    description: ".planning/ public-as-is visibility decision recorded as an explicit, dated PROJECT.md Key Decisions row citing the PII sweep finding"
    requirement: "OPEN-02"
    verification:
      - kind: manual_procedural
        ref: "grep -c 'public as-is' .planning/PROJECT.md == 1; row's Rationale column cites jeremie@studiometa.fr finding"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-05
status: complete
---

# Phase 22 Plan 01: Secrets Scan & PII Sweep Summary

**First full-history gitleaks scan (405 commits, clean) plus a mechanical PII sweep that surfaced a gitleaks-blind-spot commit-metadata email, both recorded leak-safely, feeding an explicit PROJECT.md decision row for `.planning/`'s public-as-is visibility.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-05T08:00:31Z
- **Completed:** 2026-07-05T08:03:20Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Ran `gitleaks git .` (v8.30.1) against full history at HEAD `1b1814c` — 405 commits scanned, exit 0, zero findings — recorded leak-safely with no raw JSON or matched-secret text ever staged.
- Ran a three-pass mechanical PII sweep (commit author/committer metadata, working-tree grep, diff-content grep) and dispositioned every distinct address found: `jeremie@studiometa.fr` flagged as a genuine gitleaks-blind-spot finding requiring informed maintainer acceptance; `jeremiew@pm.me` confirmed already-intentional; `noreply@github.com`/`noreply@anthropic.com`/`you@example.com` confirmed non-PII placeholders.
- Added the `.planning/` public-as-is visibility decision as an explicit, dated row in PROJECT.md's Key Decisions table, with rationale citing the PII sweep's commit-metadata finding — closing OPEN-02.

## Task Commits

1. **Task 1: Run the initial full-history gitleaks scan and record it leak-safely** - `7499e29` (docs)
2. **Task 2: Run the mechanical PII sweep across full history and append findings** - `70cbcaf` (docs)
3. **Task 3: Record the `.planning/` visibility decision in PROJECT.md's Key Decisions table** - `8ac99a5` (docs)

**Plan metadata:** (this SUMMARY commit, made separately per execute-plan protocol)

## Files Created/Modified
- `.planning/phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md` - New file: Scan #1 — Triage section (gitleaks result) + PII Sweep section (three-pass mechanical sweep with per-finding disposition table)
- `.planning/PROJECT.md` - New Key Decisions row: `.planning/` ships public as-is, rationale cites the PII sweep's `jeremie@studiometa.fr` finding, outcome "✓ Accepted — Phase 22"

## Decisions Made
- Followed the plan's task split exactly: Task 1 wrote only the Scan #1 section first (so its own commit is scoped to the scan result alone), Task 2 appended the PII Sweep section as a separate commit — matching the plan's atomic-commit intent even though both tasks target the same file.
- `jeremie@studiometa.fr` is presented as an "accept, don't fix" finding per D-01/D-06 (no history rewrite) rather than a remediation item — recorded in both 22-SECRETS-SCAN.md and the PROJECT.md decision row so the maintainer's acceptance is informed, not silent.
- Distinguished genuine PII (`jeremie@studiometa.fr`) from three look-alike but harmless addresses found during the sweep (GitHub/Anthropic placeholder addresses, and an illustrative code-snippet placeholder in STACK.md) — avoided over-flagging noise that would dilute the one finding that actually matters.

## Deviations from Plan

None - plan executed exactly as written. The only refinement was ordering the Write/Edit calls so Task 1's commit contained only the Scan #1 section and Task 2's commit contained only the appended PII Sweep section, consistent with the plan's per-task atomic-commit structure.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- OPEN-01 is triage-complete (first scan clean); the D-08 **final** rescan at the literal pre-flip HEAD is deferred to plan 22-04 as designed — do not treat this plan's scan as sufficient for the actual flip.
- OPEN-02 is fully closed: the `.planning/` visibility decision is now explicit and dated in PROJECT.md, with the PII finding surfaced for informed acceptance.
- `jeremie@studiometa.fr` remains in git history going forward (by design, D-01/D-06) — plan 22-04/22-05 should not attempt to "fix" this; it is an accepted, recorded exposure.
- No blockers for plan 22-02 (OIDC ci.yml diff / npmjs.com Trusted Publisher checkpoint per the phase's sequencing).

---
*Phase: 22-public-flip-token-hardening*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: `.planning/phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md`
- FOUND: `.planning/phases/22-public-flip-token-hardening/22-01-SUMMARY.md`
- FOUND commit: `7499e29`
- FOUND commit: `70cbcaf`
- FOUND commit: `8ac99a5`
