---
phase: 12-docs-cleanup
verified: 2026-07-02T00:00:00Z
status: gaps_found
score: 7/7 must-haves verified (presence); 3 accuracy gaps found in phase-introduced content
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "README's Validate-and-build example output is accurate"
    status: failed
    reason: "README.md:129 still shows '✓ 3 skills OK' — the pre-Phase-12 skill count (author-skill, release, setup-project). Plan 02 deleted skills/setup-project/ and synced test/dogfood.test.js's count assertions from 3→2, but never updated this adjacent README example. Actual `motto lint` output today is '✓ 2 skills OK' (verified live). This is a materialized instance of the exact threat Plan 01 registered as T-12-02 ('Documentation drift — scaffold/CLI examples diverge from real init/CLI output') and Plan 02's own salvage-check table claimed this line was 'Covered' without re-checking it post-deletion."
    artifacts:
      - path: "README.md"
        issue: "Line 129: '✓ 3 skills OK' contradicts live `motto lint` output ('✓ 2 skills OK')"
    missing:
      - "Update README.md:129 from '✓ 3 skills OK' to '✓ 2 skills OK'"
  - truth: "README's ship-your-plugin consumer one-liner is functionally correct"
    status: partial
    reason: "Code review WR-02 (confirmed by re-reading src/init.js:159-176): the token after `@` in `/plugin install <plugin>@<repo>` (README.md:164, :226) is the Claude Code marketplace name — the `name` field of .claude-plugin/marketplace.json, which `motto init` sets to the scaffolded PROJECT name, not the GitHub repo name. For a project `my-project` hosted in a differently-named repo, the documented command fails; only Motto's own case (repo `motto`, project `motto`) makes `@repo` and `@marketplace` coincide. This is new content authored by this phase (the '## Ship your plugin' section, D-01/D-02) and directly concerns SC1's 'consumer /plugin marketplace add one-liner' deliverable — the /plugin marketplace add line is correct, but the paired /plugin install line that completes 'the full ship-your-plugin path' is not."
    artifacts:
      - path: "README.md"
        issue: "Lines 164, 226: '/plugin install <plugin>@<repo>' should read '/plugin install <plugin>@<marketplace>' with a prerequisite note explaining <marketplace> is the scaffolded marketplace.json `name` field (== project name), not the repo name"
    missing:
      - "Correct both occurrences of the install one-liner and its prerequisite note per code review WR-02's suggested fix"
  - truth: "README's --force guard description is accurate"
    status: partial
    reason: "Code review WR-04 (confirmed against src/init.js:127-180 writeScaffold, which uses plain writeFile with no existence check): README.md:89 states --force 'never deletes existing files; it only skips the empty-directory check,' implying no data-loss risk. In reality writeScaffold overwrites the five scaffold paths unconditionally when they already exist — a user with an existing motto.yaml who runs `motto init --force` silently loses its content. This line is new content authored by this phase's Plan 01 Task 1 (rewritten Scaffold-a-project section, part of SC2's scope) and materially misrepresents data-loss risk."
    artifacts:
      - path: "README.md"
        issue: "Line 89: --force description omits that the 5 scaffold paths are overwritten if they already exist"
    missing:
      - "Reword per code review WR-04's suggested fix to disclose the overwrite behavior"
deferred:
  - truth: "README's plugins.public reserved-word claim matches actual linter enforcement (WR-01)"
    addressed_in: "Out of Phase 12 scope"
    evidence: "The motto.yaml field table containing this claim pre-dates Phase 12 (Plan 01 Task 1 explicitly instructs 'Keep the existing motto.yaml field table ... as reference' — not rewritten). The underlying code/doc mismatch (src/config.js not enforcing RESERVED for plugins.public) is a pre-existing defect unrelated to the motto-init/setup-project scope of DOC-04/DOC-05."
  - truth: "README's /motto:release slash-command reference is resolvable (WR-03)"
    addressed_in: "Out of Phase 12 scope"
    evidence: "The '## Publish to npm' section containing this claim was not touched by either Phase 12 plan (Plan 01 Task 2 read_first cites it only as a placement anchor for the new Ship section; no edit task targets it). Pre-existing defect from an earlier phase, unrelated to DOC-04/DOC-05."
---

# Phase 12: Docs Cleanup Verification Report

**Phase Goal:** The README documents the full ship-your-plugin path built around `motto init`, and the now-superseded `setup-project` instructional skill is removed without ever leaving main red.
**Verified:** 2026-07-02
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (SC1/D-01,D-02) README documents ship-your-plugin flow: motto build → commit dist/public/ → push public (prose) → consumer `/plugin marketplace add <owner>/<repo>` → `/plugin install` | ⚠️ PRESENT, ACCURACY DEFECT | Section exists at README.md:156-167; `/plugin marketplace add` line is correct, but `/plugin install <plugin>@<repo>` (line 164, also 226) uses the wrong placeholder — confirmed against src/init.js:159-176 (marketplace.json `name` field = project name, not repo name). See gap #2. |
| 2 | (SC2/D-05,D-06,D-07) README scaffold section rewritten around `motto init`, no manual tree instructions | ⚠️ PRESENT, ACCURACY DEFECT | README.md:45-90 leads with `motto init my-project`, shows the real scaffolded tree and verbatim motto.yaml (`grep -q 'motto init my-project'`, `grep -q 'A skills project scaffolded by motto init'`, `grep -q 'name: my-project'` all pass). No manual "create motto.yaml" prose remains. But the `--force` guard description (line 89) misrepresents overwrite risk — confirmed against src/init.js writeScaffold (plain `writeFile`, no existence check). See gap #3. |
| 3 | (SC3/D-09) `skills/setup-project/` deleted in same commit as dogfood-test count update; main never red | ✓ VERIFIED | `test ! -d skills/setup-project` succeeds. `git show --stat b437c84` shows both `skills/setup-project/SKILL.md` (deleted, 133 lines removed) and `test/dogfood.test.js` (16 changed lines) in ONE commit. `node --test` → 131/131 pass. `node bin/motto.js lint` → `✓ 2 skills OK`. |
| 4 | (P1-3) motto.yaml example shows scaffolded output verbatim, not Motto's own config | ✓ VERIFIED | README.md:70-76 shows `name: my-project`, `version: "0.1.0"`, `description: A skills project scaffolded by motto init.`, `plugins: public: my-project` — matches src/init.js:142-145 exactly, distinct from Motto's own motto.yaml (`name: motto`, `version: "0.0.3"`). |
| 5 | (P1-4) Install-the-CLI lists init/lint/build in order, mentions `motto --help` | ✓ VERIFIED | README.md:35-41 lists `motto init`, `motto lint [path]`, `motto build [path]` in that order; line 41 mentions `motto --help`. `[path]` appears ≥2 times (grep -c confirms). |
| 6 | (P1-5) No `setup-project` reference remains anywhere in README | ✓ VERIFIED | `grep -n "setup-project" README.md` returns no matches (live check). |
| 7 | (P2-1/D-10) Every section of setup-project SKILL.md mapped to a README home or recorded conscious drop | ✓ VERIFIED | 12-02-SUMMARY.md contains an explicit 6-row disposition table (Directory Layout, motto.yaml Fields, Running Lint, Running Build, What dist/ Contains, Installing-the-Built-Plugin), each mapped to a README section or the new Ship-your-plugin section. No unrecorded drops. |

**Score:** 7/7 truths present and structurally verified; 2 of the 7 (truths #1 and #2) carry confirmed accuracy defects in content newly authored by this phase, plus one additional live-verified regression (gap #1, stale skill count) not previously flagged.

### Deferred Items

Pre-existing accuracy issues outside Phase 12's scope (README sections not touched by either plan).

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | `plugins.public` reserved-word claim (WR-01) not enforced by linter | Out of Phase 12 scope | motto.yaml field table pre-dates Phase 12; Plan 01 explicitly kept it "as reference," did not rewrite it |
| 2 | `/motto:release` slash command reference unresolvable (WR-03) | Out of Phase 12 scope | `## Publish to npm` section not edited by either Phase 12 plan; used only as a placement anchor |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `README.md` | Rewritten scaffold section, new Ship-your-plugin section, CLI touch-ups, zero setup-project refs | ✓ VERIFIED (with accuracy defects, see gaps) | All structural greps pass; content exists and is wired to real CLI behavior for the most part |
| `test/dogfood.test.js` | count=2, skillCount=2, no setup-project it-blocks | ✓ VERIFIED | Lines 35-86 confirm count/skillCount assertions = 2; `grep -n setup-project test/dogfood.test.js` returns nothing |
| `skills/setup-project/` (deletion) | Directory removed | ✓ VERIFIED | `ls skills/` shows only `author-skill`, `release` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| README scaffold + motto.yaml example | `src/init.js` inline templates | Verbatim mirror | ✓ WIRED | `HELLO_WORLD_SKILL_MD`, `SCAFFOLD_DESCRIPTION`, `writeScaffold` template strings all match README verbatim (name, version, description, tree) |
| README CLI command list + `[path]` annotations | `bin/motto.js` GLOBAL_HELP/LINT_HELP/BUILD_HELP | Usage-string mirror | ✓ WIRED | `motto init`, `motto lint [path]`, `motto build [path]` order matches; `motto --help` documented |
| README ship-flow install one-liner | Claude Code `/plugin install` semantics | Consumer command | ✗ PARTIAL | `@<repo>` placeholder is the wrong token — should be `@<marketplace>` (marketplace.json `name` field, i.e. project name). See gap #2. |
| Delete commit ↔ dogfood-test count sync | `test/dogfood.test.js` | Atomic commit | ✓ WIRED | `git show --stat b437c84` confirms both changes in one commit; full suite green |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Dogfood lint reports current skill count | `node bin/motto.js lint` | `✓ 2 skills OK` | ✓ PASS (but contradicts README.md:129's stale `✓ 3 skills OK` example — gap #1) |
| Full test suite green after deletion commit | `node --test` | `131/131 pass, 0 fail` | ✓ PASS |
| Deletion + test-sync atomicity | `git show --stat b437c84` | 2 files in 1 commit (`skills/setup-project/SKILL.md` deleted, `test/dogfood.test.js` modified) | ✓ PASS |
| No setup-project references remain | `grep -n setup-project README.md test/dogfood.test.js` | no matches | ✓ PASS |
| No debt markers introduced | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER" README.md test/dogfood.test.js` | no matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DOC-04 | 12-01 | README documents the full ship-your-plugin flow | ✓ SATISFIED (with accuracy caveat) | Ship section exists (README.md:156-167); commit/push/marketplace-add prose present; install one-liner has a confirmed placeholder defect (gap #2) that a "stranger" user (the milestone's target persona) would hit in the common case where repo name ≠ project name |
| DOC-05 | 12-01, 12-02 | README scaffold rewritten around `motto init`; `setup-project` deleted in the same commit as the dogfood-test count update | ✓ SATISFIED (with accuracy caveat) | Scaffold section rewritten (README.md:45-90); deletion + test sync confirmed atomic (`b437c84`); `--force` description has a confirmed accuracy defect (gap #3) |

REQUIREMENTS.md maps DOC-04 and DOC-05 to Phase 12 with status "Complete" — both IDs are declared in Plan 01/02 frontmatter and accounted for. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| README.md | 129 | Stale factual claim (`✓ 3 skills OK`) contradicting live tool output | 🛑 Blocker-adjacent (documentation-drift regression, T-12-02 materialized) | Reader running `motto lint` on the tutorial project sees `2 skills OK`, contradicting the documented example — undermines trust in the "Validate and build" walkthrough this phase's own threat model flagged as a risk |
| README.md | 164, 226 | Functionally incorrect consumer command (`@<repo>` should be `@<marketplace>`) | ⚠️ Warning | Code-review-confirmed (WR-02); breaks the documented ship-flow's install step for any project whose repo name differs from its project name — the common case for the milestone's "stranger" persona |
| README.md | 89 | Misleading `--force` data-loss description | ⚠️ Warning | Code-review-confirmed (WR-04); could cause silent data loss for a user trusting the README's "never deletes" framing |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in phase-modified files.

### Human Verification Required

None — all findings above are evidence-based (live command output, source-code cross-reference, git history), not matters of taste or runtime/visual behavior.

### Gaps Summary

The **structural** phase goal is achieved: `skills/setup-project/` is gone, its deletion is atomic with the dogfood-test count sync (git-verified), main never went red (full suite green, both before and after re-run), and the README's Ship-your-plugin and motto-init-based scaffold sections exist with all literal must-have greps passing.

However, three accuracy defects survive in the delivered content, two of them in text newly authored by this very phase:

1. **README.md:129** still reads `✓ 3 skills OK` — the pre-deletion count. This is a live, unambiguous documentation-drift regression: `motto lint` today reports `✓ 2 skills OK`. Plan 02's own salvage-check table claimed "Running Lint... covered... clean-output example" without re-verifying that example against the post-deletion skill count.
2. **README.md:164, 226** (`/plugin install <plugin>@<repo>`) uses the wrong placeholder for the token after `@` — it should be `@<marketplace>` (the scaffolded `marketplace.json` `name` field), not the GitHub repo name. This is new content from this phase's Ship-your-plugin section and directly affects the consumer-facing "full ship-your-plugin path" the phase goal names explicitly.
3. **README.md:89** (`--force` description) understates the overwrite/data-loss risk of the flag — also new content from this phase's rewritten Scaffold section.

None of these are `gaps_found`-triggering STUB/MISSING/NOT_WIRED artifact failures — the sections all exist, are substantive, and are wired to real CLI behavior in the majority case. But per goal-backward adversarial verification, "documents the full ship-your-plugin path" implies the documented path *works*, and two of the three defects are in content this phase itself wrote. Recommend a short follow-up plan (or a `/gsd-quick` fix) to correct these three lines before considering DOC-04/DOC-05 fully closed — the fixes are copy-only, no source changes, and the code review already supplies exact replacement text for gaps #2 and #3.

---

_Verified: 2026-07-02_
_Verifier: Claude (gsd-verifier)_
