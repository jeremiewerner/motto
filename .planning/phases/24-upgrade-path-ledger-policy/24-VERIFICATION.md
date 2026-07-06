---
phase: 24-upgrade-path-ledger-policy
verified: 2026-07-06T12:30:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 24: Upgrade-Path Ledger & Policy Verification Report

**Phase Goal:** Every existing Motto project has documented steps to cross any breaking change, and a standing process guarantees future structure/schema changes ship with an upgrade entry — the skew warning's "check the upgrade ledger" remedy resolves to something real.
**Verified:** 2026-07-06T12:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A reader following the ledger can adopt the `mottoVersion` stamp in a pre-v0.0.7 project (magma) from documented steps alone. | ✓ VERIFIED | `~/Projects/magma/motto.yaml` read live: contains `mottoVersion: "0.0.6"` placed exactly where and how `UPGRADING.md`'s v0.0.7 before/after snippet shows (adjacent to `version`, quoted string). Confirmed this is a *post-correction* result — the walkthrough (Task 3 checkpoint) found the original Step 2 commands broken (`motto --version` does not exist; `npm ls @jeremiewerner/motto` returns empty for the common global-install case) and this repo's `UPGRADING.md` was corrected in commit `698d1e6` to `npm ls -g @jeremiewerner/motto`. The live file reflects the corrected text, not the original defect. |
| 2 | A reader can find the v0.0.5 `<role>` migration in the ledger with the steps needed to cross it. | ✓ VERIFIED | `UPGRADING.md:49-75` contains `## v0.0.5 — \`**Role:**\` bold line → \`<role>\` section tag` with a what-breaks line naming the exact lint error, 3 numbered steps, one before/after snippet, and a `motto lint` verify line — matches D-05 depth contract exactly. |
| 3 | The standing upgrade-path constraint is operational — documented process requires every future structure/schema change to add a ledger entry before ship, discoverable where a contributor plans a change. | ✓ VERIFIED | Two-part chain confirmed live: (a) `.claude/CLAUDE.md` Constraints (inside the GSD-managed block) carries an "Upgrade path" bullet naming `UPGRADING.md` and the release skill's Ledger Gate — byte-identical to `.planning/PROJECT.md` §Constraints (IN-01 fix confirmed, no drift risk on regeneration). (b) `skills/release/SKILL.md` Step 2 "Ledger Gate" is a blocking step, positioned **before** Step 3 (Version Bump) — confirmed by re-running the gate's exact diff command against the live repo (`git diff v0.0.6..HEAD -- src/schema.js src/templates.js src/config.js src/init.js src/build.js src/frontmatter.js` → 186 lines, non-empty), proving the gate genuinely fires and is not vacuous (CR-01 fix verified functionally, not just textually). |
| 4 | Skew warning's remedy names UPGRADING.md by filename. | ✓ VERIFIED | `src/version.js:101` message template contains `check UPGRADING.md for changes since ${stampedVersion}`. Zero occurrences of the old generic phrase `check the upgrade ledger` anywhere in `src/`, `test/`, `skills/`, `UPGRADING.md`, or `.claude/CLAUDE.md`. |
| 5 | node --test stays green; skew-message assertions match new wording (all consumers, not just version.test.js). | ✓ VERIFIED | Full suite: `293 pass / 0 fail`. `test/version.test.js:102,122`, `test/lint.test.js:839,848,889`, `test/cli.test.js:466,478`, `test/build.test.js:548` all assert `/check UPGRADING\.md/` — 8 assertion sites across 4 files, all passing. |
| 6 | Backstop test guards ledger existence + both seed headings. | ✓ VERIFIED | `test/upgrading-ledger.test.js` reads `UPGRADING.md` via `REPO_ROOT` anchored on `import.meta.url` (not cwd), asserts `## v0.0.5` and `## v0.0.7` both present, with descriptive failure messages. Included in the 293-test green suite. |
| 7 | Motto's own tree stays unstamped; dogfood zero-skew assertion stays green. | ✓ VERIFIED | Live `motto.yaml` at repo root has no `mottoVersion` key. `test/dogfood.test.js` passes (10/10) and its live-tree skew assertion (`expected no skew warning on Motto's own unstamped tree`) holds. |
| 8 | Release skill stays lint-clean; dogfood counts intact. | ✓ VERIFIED | `node bin/motto.js lint` → `✓ 3 skills OK`. `node --test test/dogfood.test.js` → `10 pass, 0 fail`. |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `UPGRADING.md` | Two seed entries (v0.0.5, v0.0.7), D-05 depth contract | ✓ VERIFIED | Exists at repo root (not docs/). Both headings present, each with what-breaks/steps/before-after/verify. Intro correctly scoped after IN-02 fix ("crosses the v0.0.5 entry on its way to 0.0.6, and the v0.0.7 entry when it moves to 0.0.7+"). |
| `test/upgrading-ledger.test.js` | Existence + heading backstop | ✓ VERIFIED | Present, passes, REPO_ROOT anchored correctly. |
| `src/version.js` checkSkew() message | Names UPGRADING.md, never-throw preserved | ✓ VERIFIED | Wording-only change on line 101; no try/catch/throw/I/O added; `parseVersion`/`checkSkew` remain pure. |
| `skills/release/SKILL.md` (Ledger Gate) | Blocking step, diffs since last tag, entry-or-verdict | ✓ VERIFIED | Step 2, positioned before Version Bump (Step 3) — confirmed functionally non-vacuous against live tags. File list includes `src/build.js`/`src/frontmatter.js` (WR-02 fix present). All step cross-references consistent 1-10 (WR-01 fix present — "Step 9 (Post-Release Housekeeping)" correct at line 121). |
| `.claude/CLAUDE.md` (Constraints bullet) | Upgrade-path rule, synced from PROJECT.md | ✓ VERIFIED | Present inside GSD-managed block, byte-identical wording to PROJECT.md line 142 (IN-01 fix confirmed — no drift risk on block regeneration). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/version.js` checkSkew() message | `UPGRADING.md` | filename string | ✓ WIRED | Message contains literal `UPGRADING.md`; file exists at the path a reader would resolve (repo root). |
| `test/version.test.js` + 3 downstream consumers | new wording | regex assertions | ✓ WIRED | 8 assertion sites across 4 files all match the new phrase; zero stale-phrase matches anywhere. |
| `skills/release/SKILL.md` Ledger Gate | `UPGRADING.md` | git diff + entry-or-verdict | ✓ WIRED | Gate step references the file by name, positioned to produce a real (non-empty) diff against the previous tag — verified by live execution of the exact documented command. |
| `.claude/CLAUDE.md` Constraints | release skill's Ledger Gate | cross-reference in bullet text | ✓ WIRED | Bullet explicitly says "see the release skill's Ledger Gate." |
| `~/Projects/magma/motto.yaml` mottoVersion stamp | v0.0.7 UPGRADING.md entry | live human walkthrough | ✓ WIRED | Stamp present in magma exactly matching the (corrected) documented steps; friction from the walkthrough was fed back as a real doc fix (commit 698d1e6), not silently patched around. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Ledger Gate diff is non-vacuous against the real previous tag | `git diff v0.0.6..HEAD -- src/schema.js src/templates.js src/config.js src/init.js src/build.js src/frontmatter.js` | 186 lines of diff (non-empty) | ✓ PASS |
| Full test suite green | `node --test` | 293 pass, 0 fail | ✓ PASS |
| Dogfood lint/build clean | `node bin/motto.js lint` | `✓ 3 skills OK` | ✓ PASS |
| Dogfood test suite | `node --test test/dogfood.test.js` | 10 pass, 0 fail | ✓ PASS |
| No stale "check the upgrade ledger" phrase anywhere | `grep -rn "check the upgrade ledger" src/ test/ skills/ UPGRADING.md .claude/CLAUDE.md` | zero matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| UPG-01 | 24-01-PLAN.md | Breaking-change ledger exists, seeded with v0.0.5 + v0.0.7 entries | ✓ SATISFIED | `UPGRADING.md` present with both entries conforming to D-05; backstop test passes; skew message resolves to it. |
| UPG-02 | 24-02-PLAN.md | Standing upgrade-path process operational | ✓ SATISFIED | Ledger Gate is a genuinely-blocking release step (CR-01 fix verified functionally); CLAUDE.md Constraints surfaces the rule at plan time (IN-01 fix verified byte-identical to PROJECT.md); magma live-validated. |

No orphaned requirements — REQUIREMENTS.md maps exactly UPG-01 and UPG-02 to Phase 24, both claimed by the two plans, both satisfied.

### Anti-Patterns Found

None. Grep for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` across all phase-modified files (`UPGRADING.md`, `skills/release/SKILL.md`, `src/version.js`, `test/upgrading-ledger.test.js`) returned zero matches.

### Code Review Follow-Up (24-REVIEW.md)

The phase's own code review found 5 issues (1 critical, 2 warning, 2 info), all marked `fix_status: all_fixed`. Verified independently against the live codebase rather than trusting the marker:

| ID | Claim | Independent Verification |
|----|-------|---------------------------|
| CR-01 (critical) | Ledger Gate reordered before version bump (commit 51ddacf) | ✓ Confirmed: Step 2 (Ledger Gate) precedes Step 3 (Version Bump) in the live `skills/release/SKILL.md`. Functionally tested by running the documented diff command against the actual repo tags — produces a real 186-line diff, not an empty range. |
| WR-01 | Stale "Step 8" reference fixed to "Step 9" | ✓ Confirmed: line 121 reads "Only proceed to Step 9 (Post-Release Housekeeping)" — correct for the current numbering. |
| WR-02 | `src/build.js`/`src/frontmatter.js` added to gate pathspec | ✓ Confirmed: both files present in the live diff command (line 36) and in the success_criteria wording (line 183). |
| IN-01 | CLAUDE.md/PROJECT.md constraint bullets synced | ✓ Confirmed: both files' bullets are byte-identical. |
| IN-02 | Intro precision fix ("0.0.6" vs "0.0.6+") | ✓ Confirmed: live `UPGRADING.md` intro reads "crosses the v0.0.5 entry on its way to 0.0.6, and the v0.0.7 entry when it moves to 0.0.7+." |

All 5 review findings verified fixed in the live codebase, not just claimed in frontmatter.

### Human Verification Required

None. All must-haves resolved to VERIFIED against live codebase evidence, including functional (not just textual) confirmation of the Ledger Gate's non-vacuous behavior and the magma live-walkthrough artifact.

### Gaps Summary

No gaps. Both roadmap success criteria plans (24-01, 24-02) delivered their claimed artifacts, all wiring holds, and the phase's own code review findings were independently re-verified against the live files rather than trusted from the REVIEW.md frontmatter alone — all 5 fixes confirmed present and functioning, most notably the critical Ledger Gate reordering, which was verified not just by reading the text but by executing the documented diff command against the repo's actual tag history and confirming it produces a genuine non-empty range.

---

_Verified: 2026-07-06T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
