---
phase: 13-address-tech-debt-plugins-public-reserved-word-enforcement-i
verified: 2026-07-02T00:00:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 13: Address tech debt (plugins.public reserved-word enforcement + init/CLI review items) Verification Report

**Phase Goal:** Close the 5 tech-debt items tracked by the v0.0.4 milestone audit (DEBT-01..DEBT-05): plugins.public reserved-word documentation correction, git stderr suppression in resolveGitOwnerName, adversarial path-escape test hardening, /motto:release README reference fix, and process.exit() verify-close.
**Verified:** 2026-07-02
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | README's `motto.yaml` field table states plugins.public/private as kebab-case only, no reserved-word restriction (DEBT-01) | ✓ VERIFIED | `README.md:83` reads `Letter-start kebab-case (Claude Code plugin \`name\` requirement — no reserved-word restriction, unlike skill \`name\`)`; `grep -c 'no reserved-word restriction' README.md` = 1 |
| 2 | `src/schema.js` RESERVED JSDoc scopes the reserved-word rule to SKILL.md `name` frontmatter only, forbids reuse for plugins.public/private (DEBT-01) | ✓ VERIFIED | `src/schema.js:36-43` JSDoc reads "Scope: SKILL.md `name` ONLY... Do NOT reuse RESERVED for plugins.public/plugins.private validation in src/config.js or src/init.js." Citation `code.claude.com/docs/en/plugins-reference` present. `RESERVED` constant value (`["anthropic", "claude"]`) byte-identical, unused elsewhere. |
| 3 | A corrupt `~/.gitconfig` no longer leaks raw git stderr to the terminal during `motto init` (DEBT-02) | ✓ VERIFIED | `src/init.js:94-97` — `execFileSync('git', ..., { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] })`. Behavioral spot-check (isolated `HOME`/`GIT_CONFIG_GLOBAL` pointing at a malformed gitconfig) confirmed git fails as expected and `error.stderr` is `null` — nothing is printed to the terminal; the enclosing `try/catch` still returns `'Your Name'` on any failure (never-throw contract intact). |
| 4 | The adversarial-name test fails if a scaffold write ever escapes the target directory into the parent scratch dir (DEBT-03) | ✓ VERIFIED | `test/init.test.js:107-154` — `scaffoldProject adversarial names` block now nests `tempDir = join(scratchDir, 'target')` under an `mkdtemp`-created `scratchDir`; for every adversarial name (including `../evil`) the `writes nothing` test asserts `readdir(scratchDir)` deep-equals `['target']` in addition to `readdir(tempDir)` deep-equals `[]`. A future path-escape write outside `target` would now fail. |
| 5 | No RESERVED-style check is added to plugins.public/plugins.private validation — `src/config.js` unchanged (DEBT-01) | ✓ VERIFIED | `grep -n RESERVED src/config.js` returns no matches. `git show --stat` for the phase's 4 commits (3ce5e91, ce508f0, 1fd74a1, dd8acbc) lists only README.md, src/schema.js, src/init.js, test/init.test.js — `src/config.js` never touched. |
| 6 | `bin/motto.js` has zero `process.exit()` call sites (already resolved Phase 11 commit d35aba7) (DEBT-05) | ✓ VERIFIED | `grep -n 'process\.exit(' bin/motto.js` returns 4 matches, all on comment lines (26, 130, 248, 274) documenting the "never process.exit()" convention — no executable call site. Every actual exit path uses `process.exitCode` (confirmed at lines 248, 274 and others). `git log --oneline \| grep d35aba7` confirms the cited fix commit exists in history. |
| 7 | README no longer claims `/motto:release` resolves under the public motto plugin (DEBT-04) | ✓ VERIFIED | `grep -c '/motto:release' README.md` = 0. `README.md:173` now reads "The release skill at `skills/release/SKILL.md` carries the full maintainer checklist." |
| 8 | The release-skill reference reflects its actual audience:private / motto-private bucket, verified against the maintainer's real Claude Code setup (DEBT-04) | ✓ VERIFIED | Checkpoint resolution recorded in 13-02-SUMMARY.md: maintainer reported `/motto-private:release` "does not resolve" in their live session; per this human decision, plan 13-02 took the file-path branch (`skills/release/SKILL.md`) rather than the private-namespace slash-command branch. This checkpoint outcome is the approved branch per this verification's task context. `skills/release/SKILL.md` confirmed `audience: private` in the repo. |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `README.md` | Corrected plugins.public/private field-table rows + release-skill reference | ✓ VERIFIED | Line 83 corrected (DEBT-01); line 173 corrected (DEBT-04); both changes present and substantive |
| `src/schema.js` | Corrected RESERVED JSDoc scope | ✓ VERIFIED | Multi-line JSDoc at lines 35-46, matches NAME_KEBAB JSDoc style, cites source, constant value unchanged |
| `src/init.js` | `execFileSync` in `resolveGitOwnerName` with stdio stderr suppression | ✓ VERIFIED | Lines 92-102, `stdio: ['ignore', 'pipe', 'ignore']` present; try/catch and fallback unchanged |
| `test/init.test.js` | Adversarial-names block asserting the parent scratch dir, not just the target dir | ✓ VERIFIED | Lines 107-154; `scratchDir`/`tempDir` nesting mirrors default-name suite; both parent and target assertions present for all 4 adversarial names |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `resolveGitOwnerName`'s stdio option | never-throw/silent-fallback contract | silent stderr handling | ✓ WIRED | `stdio: ['ignore','pipe','ignore']` combined with unchanged `try{...}catch{return 'Your Name'}` — spot-checked with an isolated malformed gitconfig; stderr not surfaced, fallback still returned |
| Adversarial test | parent scratch dir contents | `readdir(scratchDir)` assertion | ✓ WIRED | Each per-name `it('writes nothing...')` inspects both `scratchDir` and `tempDir`; `../evil` case included in the 4-name array, unchanged |
| Checkpoint result ("does not resolve") | README.md line 173 wording | file-path branch selection | ✓ WIRED | 13-02-SUMMARY.md documents the checkpoint result and shows the corresponding file-path text was applied; verified present in current README.md |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DEBT-02: corrupt gitconfig stderr suppressed | `execFileSync('git', ['config','user.name'], { stdio:['ignore','pipe','ignore'], env: isolated malformed GIT_CONFIG_GLOBAL })` run in scratch dir | git call throws (bad config), `error.stderr === null` — nothing printed to terminal | ✓ PASS |
| DEBT-05: no executable `process.exit(` in bin/motto.js | `grep -n 'process\.exit(' bin/motto.js` | 4 matches, all on comment lines (26, 130, 248, 274) | ✓ PASS |
| DEBT-01: no RESERVED reuse in src/config.js | `grep -n RESERVED src/config.js` | no matches | ✓ PASS |
| DEBT-04: no dangling `/motto:release` reference | `grep -c '/motto:release' README.md` | 0 | ✓ PASS |
| Full suite regression | `node --test` | 131 pass, 0 fail | ✓ PASS |
| Lint clean (no schema behavior change) | `node bin/motto.js lint` | `✓ 2 skills OK`, exit 0 | ✓ PASS |

### Requirements Coverage

REQUIREMENTS.md has no pre-existing DEBT-01..05 entries — these are phase-local tracking IDs assigned during planning (per ROADMAP.md phase 13 requirements line and the phase task instructions), not milestone REQUIREMENTS.md entries. No traceability gap to report; all five DEBT-IDs are accounted for directly against the PLAN frontmatter `requirements` fields and this verification's truths table above.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DEBT-01 | 13-01-PLAN.md | Reserved-word doc correction (README + schema.js), no validation code added | ✓ SATISFIED | Truths 1, 2, 5 |
| DEBT-02 | 13-01-PLAN.md | git stderr suppression in resolveGitOwnerName | ✓ SATISFIED | Truth 3 |
| DEBT-03 | 13-01-PLAN.md | Adversarial path-escape test hardening | ✓ SATISFIED | Truth 4 |
| DEBT-04 | 13-02-PLAN.md | `/motto:release` README reference fix | ✓ SATISFIED | Truths 7, 8 |
| DEBT-05 | 13-01-PLAN.md | process.exit() verify-close (no code change) | ✓ SATISFIED | Truth 6 |

No orphaned requirements found.

### Anti-Patterns Found

None. Scanned all 4 modified files (`README.md`, `src/schema.js`, `src/init.js`, `test/init.test.js`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers — zero matches. No empty implementations, no hardcoded-empty stub patterns introduced.

### Human Verification Required

None. The one item requiring human input (DEBT-04's checkpoint: whether `/motto-private:release` resolves in the maintainer's live session) was already resolved during execution — the maintainer reported "does not resolve," and this verification's checkpoint context confirms that outcome as the approved branch. README.md's current wording matches that resolution.

### Gaps Summary

No gaps. All 5 DEBT items are closed with codebase evidence (not just SUMMARY claims): two documentation corrections verified byte-for-byte against the target files, one runtime stderr-suppression fix behaviorally spot-checked against an isolated malformed git config, one regression test verified to actually assert the parent directory (not just re-reading the SUMMARY's description of it), one already-resolved item independently re-confirmed via grep against the current file rather than trusting the Phase 11 commit reference alone. Full test suite (131/131) and lint both pass clean. The one deliberate scope boundary (no RESERVED check added to `src/config.js`) was independently confirmed absent.

---

*Verified: 2026-07-02*
*Verifier: Claude (gsd-verifier)*
