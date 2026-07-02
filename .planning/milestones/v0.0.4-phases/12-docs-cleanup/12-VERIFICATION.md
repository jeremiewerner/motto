---
phase: 12-docs-cleanup
verified: 2026-07-02T00:00:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: "7/7 (presence); 3 accuracy gaps in phase-introduced content"
  gaps_closed:
    - "README's Validate-and-build example output is accurate (stale '✓ 3 skills OK' → '✓ 2 skills OK', README.md:129)"
    - "README's ship-your-plugin consumer install one-liner is functionally correct ('@<repo>' → '@<marketplace>' on both occurrences, README.md:164/226, plus WR-02 prerequisite-note explanation added at line 167)"
    - "README's --force guard description is accurate (now discloses the 5 scaffold paths are overwritten if they already exist, README.md:89)"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "README's plugins.public reserved-word claim matches actual linter enforcement (WR-01)"
    addressed_in: "Out of Phase 12 scope"
    evidence: "motto.yaml field table (README.md:83) pre-dates Phase 12 and was explicitly left untouched by Plan 03's out-of-scope guard; the underlying code/doc mismatch (src/config.js not enforcing RESERVED for plugins.public) is a pre-existing defect unrelated to DOC-04/DOC-05."
  - truth: "README's /motto:release slash-command reference is resolvable (WR-03)"
    addressed_in: "Out of Phase 12 scope"
    evidence: "README.md:173 '## Publish to npm' section was not touched by any of the three Phase 12 plans; pre-existing defect from an earlier phase, unrelated to DOC-04/DOC-05."
---

# Phase 12: Docs Cleanup Verification Report

**Phase Goal:** The README documents the full ship-your-plugin path built around `motto init`, and the now-superseded `setup-project` instructional skill is removed without ever leaving main red.
**Verified:** 2026-07-02
**Status:** passed
**Re-verification:** Yes — after gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (SC1/D-01,D-02) README documents ship-your-plugin flow: motto build → commit dist/public/ → push public (prose) → consumer `/plugin marketplace add <owner>/<repo>` → `/plugin install <plugin>@<marketplace>` | ✓ VERIFIED | Section at README.md:156-171. Live grep: `/plugin marketplace add <owner>/<repo>` (line 163/221 unchanged, correct) and `/plugin install <plugin>@<marketplace>` now appears at BOTH line 164 and 226 (`grep -c '@<marketplace>' README.md` = 2; `grep -q '@<repo>'` finds nothing). Prerequisite blockquote at line 167 now explains `<marketplace>` is the scaffolded `marketplace.json`'s top-level `name` field — confirmed against src/init.js:159-176, where `name` (top-level) and `plugins[0].name` both derive from the same validated project `name` passed to `motto init`. Gap #2 closed. |
| 2 | (SC2/D-05,D-06,D-07) README scaffold section rewritten around `motto init`, no manual tree instructions, guards accurately described | ✓ VERIFIED | README.md:45-90 leads with `motto init my-project`, shows the real scaffolded tree and verbatim motto.yaml. `--force` bullet (line 89) now reads "...the five scaffold paths (...) are **overwritten** if they already exist" — matches src/init.js:127-180 `writeScaffold`, which uses plain `writeFile` with no existence check (confirmed by direct source read). Gap #3 closed. |
| 3 | (SC3/D-09) `skills/setup-project/` deleted in same commit as dogfood-test count update; main never red | ✓ VERIFIED | `ls skills/` → only `author-skill`, `release`. `git show --stat b437c84` shows both the SKILL.md deletion and test/dogfood.test.js edit in one commit (unchanged from prior verification — not touched by gap closure). |
| 4 | README's Validate-and-build clean-lint example matches live `motto lint` output | ✓ VERIFIED | README.md:129 now reads `✓ 2 skills OK`. Live run: `node bin/motto.js lint` → `✓ 2 skills OK` (exact match). `grep -q '3 skills OK' README.md` finds nothing. Gap #1 closed. |
| 5 | (P1-3) motto.yaml example shows scaffolded output verbatim, not Motto's own config | ✓ VERIFIED | README.md:70-76 unchanged from prior verification — `name: my-project`, `version: "0.1.0"`, matches src/init.js exactly. |
| 6 | (P1-4/P1-5) Install-the-CLI order + `motto --help`; zero setup-project references anywhere | ✓ VERIFIED | `grep -rn "setup-project" README.md test/dogfood.test.js` → no matches (exit 1). |
| 7 | (P2-1/D-10) Every section of setup-project SKILL.md mapped to a README home or recorded conscious drop | ✓ VERIFIED | Unchanged from prior verification (12-02-SUMMARY.md's 6-row disposition table); not in scope of the gap-closure plan. |
| 8 | Deferred lines (WR-01 line 83, WR-03 line 173) remain byte-for-byte untouched, as the prior verification ruled them out of Phase 12 scope | ✓ VERIFIED | Live read of README.md:80-85 confirms the `plugins.public` row unchanged; `grep -n "motto:release" README.md` still resolves at line 173. Plan 03's own regression guards (`grep -q 'must not contain .anthropic. or .claude.'` and `grep -q '/motto:release'`) both pass. |

**Score:** 8/8 truths verified (7 core must-haves + 1 regression-guard truth added for this re-verification). All 3 previously-flagged accuracy gaps are closed with live command evidence, not SUMMARY claims.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `README.md` | 3 line-level corrections (129; 164/167/226; 89), no other lines touched | ✓ VERIFIED | `git show --stat b078c8f` → `README.md | 10 +++++-----` (5 insertions, 5 deletions — matches the plan's "three edits" scope, since edit B touches 3 lines: 164, 167, 226). Diff confirmed no collateral reflow. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| README `✓ 2 skills OK` example | live `node bin/motto.js lint` output | Literal string match | ✓ WIRED | Both produce `✓ 2 skills OK` exactly. |
| README `@<marketplace>` install placeholder | `src/init.js:159-176` marketplace.json top-level `name` field | Explanatory prerequisite note | ✓ WIRED | Source confirms `name` (top-level, used for `/plugin install <plugin>@<name>`) equals the project name — matches the note's claim. |
| README `--force` bullet | `src/init.js` `writeScaffold` (plain `writeFile`, no existence check) | Overwrite-behavior disclosure | ✓ WIRED | Source confirms unconditional overwrite of all 5 scaffold paths; README now discloses this accurately. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Dogfood lint reports current skill count, matching README example | `node bin/motto.js lint` | `✓ 2 skills OK` | ✓ PASS |
| Full test suite green after gap-closure commit | `node --test` | `131/131 pass, 0 fail` | ✓ PASS |
| No setup-project references remain | `grep -rn setup-project README.md test/dogfood.test.js` | no matches | ✓ PASS |
| No debt markers introduced | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER" README.md` | no matches | ✓ PASS |
| Gap-closure commit exists and is scoped to README.md only | `git show --stat b078c8f` | `README.md \| 10 +++++-----` (1 file changed) | ✓ PASS |
| Deferred WR-01/WR-03 lines untouched | `grep -q 'must not contain .anthropic. or .claude.' README.md && grep -q '/motto:release' README.md` | both found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DOC-04 | 12-01, 12-03 | README documents the full ship-your-plugin flow, including a working install one-liner | ✓ SATISFIED | Ship section exists (README.md:156-171); marketplace-add line correct; install line now uses the correct `@<marketplace>` placeholder on both occurrences with an accurate explanatory note. |
| DOC-05 | 12-01, 12-02, 12-03 | README scaffold rewritten around `motto init` with accurate guard descriptions; `setup-project` deleted in the same commit as the dogfood-test count update | ✓ SATISFIED | Scaffold section rewritten (README.md:45-90); `--force` description now accurate; deletion + test sync confirmed atomic (`b437c84`, unchanged from prior verification); clean-lint example now matches live output. |

REQUIREMENTS.md maps DOC-04 and DOC-05 to Phase 12 with status "Complete" — both IDs are declared in Plan 01/02/03 frontmatter and accounted for. No orphaned requirements found.

### Anti-Patterns Found

None in phase-modified files. `grep -nE "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER" README.md` returns no matches. The three previously-flagged accuracy defects (stale skill count, wrong install placeholder, misleading `--force` claim) are all resolved with live-verified evidence.

### Human Verification Required

None — all findings above are evidence-based (live command output, source-code cross-reference, git history).

### Gaps Summary

All three gaps from the prior verification (12-VERIFICATION.md, status: gaps_found) are closed by Plan 03 (commits `b078c8f`, `95fea50`):

1. **Gap #1 (stale skill count)** — README.md:129 now reads `✓ 2 skills OK`, verified against live `node bin/motto.js lint` output.
2. **Gap #2 (wrong install placeholder, WR-02)** — README.md:164 and :226 now both read `/plugin install <plugin>@<marketplace>`, with the prerequisite note at line 167 correctly explaining that `<marketplace>` is `marketplace.json`'s `name` field (== project name), confirmed against `src/init.js:159-176`.
3. **Gap #3 (misleading `--force` claim, WR-04)** — README.md:89 now discloses that the five scaffold paths are overwritten if they already exist, confirmed against `src/init.js` `writeScaffold`'s unconditional `writeFile` calls.

No regressions introduced: full `node --test` suite remains 131/131 green, no debt markers, the two deferred out-of-scope lines (WR-01 line 83, WR-03 line 173) remain byte-for-byte unchanged as required by the plan's regression guards. The two previously-deferred items (WR-01, WR-03) remain correctly out of Phase 12 scope — they are pre-existing defects unrelated to `motto init`/`setup-project` and are not part of DOC-04/DOC-05.

The phase goal is achieved: the README documents an accurate, working ship-your-plugin path built around `motto init`, and `skills/setup-project/` was removed without ever leaving main red.

---

_Verified: 2026-07-02_
_Verifier: Claude (gsd-verifier)_
