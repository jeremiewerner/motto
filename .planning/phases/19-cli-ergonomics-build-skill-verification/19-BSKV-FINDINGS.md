# Phase 19: build-skill Live Verification Findings (BSKV-01)

**Run date:** 2026-07-03
**Staged input used:** see "Staged input used" section below (the exact freeform brief given to `/build-skill`)
**Skill produced:** `skills/changelog/SKILL.md` — name `changelog`, audience `private`, `template: procedure`, `allowed-tools` Bash(git tag*)/Bash(git describe*)/Bash(git log*). Lints clean via `node bin/motto.js lint` (3 skills OK). Shipped: yes.

## Candidate skill topics (operator picks one at the checkpoint)

These are real gaps in Motto's own `skills/` tree today (only `build-skill` and `release` exist) — not disposable sandbox topics, per D-12.

1. **`changelog` (leading candidate — brief drafted below).** Motto has no `CHANGELOG.md` yet, even though `release`'s Step 4 tarball-verify allowlist already names `CHANGELOG` as an auto-included npm file (`skills/release/SKILL.md` line 77) — the file is expected but never created. A skill that drafts a `CHANGELOG.md` entry from `git log` since the last version tag, grouped Keep-a-Changelog style, feeding into `release`'s Step 2 version-bump flow, closes a real gap ahead of Phase 22's public flip (external npm/GitHub readers will want one).
2. **`skill-audit`.** A maintainer skill that periodically re-checks the whole `skills/` tree for quality drift `motto lint` doesn't catch mechanically — stale `shared_references`, `description` length creeping toward the limit, leftover placeholder text — complementing `build-skill`'s Step 7 gate (which only self-checks the skill it just wrote) with a retroactive, tree-wide pass.
3. **`contributor-onboarding`.** Ahead of Phase 22's one-way public flip, a skill that drafts/maintains a `CONTRIBUTING.md` and elaborates the README's "Development and contributing" section for external contributors — currently thin, and genuinely needed once the repo is no longer private-only.

## Staged input used

The following is the single, honest freeform brief given to `/build-skill` for the leading candidate (`changelog`). It naturally embeds all three observation targets in one continuous paragraph, per D-13 — not three artificial mini-tests:

> I want a maintainer skill I can invoke to keep a CHANGELOG.md up to date for Motto. Right now there's no changelog file in the repo at all, and the release skill already checks for one in the tarball allowlist so it'd be good to actually have one. The skill should look at commits since the last version tag, summarize what changed in plain language grouped by type (features, fixes, docs, etc.), and write or append an entry at the top of CHANGELOG.md under the new version heading, following Keep a Changelog style headings. It should fit into the existing release flow — probably run as part of the version bump step, drafting the entry so the maintainer can review and edit before committing. Also handle the edge case of no new commits since the last tag somehow. I've been calling it "Claude's Changelog Assistant" in my notes so far but that's just a working title — pick something better if it doesn't fit the naming rules.

**How the three targets are embedded (brief-prep notes for the operator):**

- **Target 1 (BSKL-01 gap-fill):** the brief never states `audience` (public vs. private — `release` is `private`, this skill plausibly is too, but the input doesn't say so), nor the exact trigger mechanism (standalone `/changelog` invocation vs. only fired from inside `release`'s Step 2). Per Step 3 of `skills/build-skill/SKILL.md`, these are schema slots genuinely missing from the input and should surface as (part of) one batched gap-fill message. If `build-skill` infers them confidently instead of asking, record that as the Observed outcome for Target 1 rather than forcing a question — Step 3 explicitly permits zero questions if it judges the input complete.
- **Target 2 (BSKL-05 quality gate):** the sentence "Also handle the edge case of no new commits since the last tag somehow" is deliberately under-specified — it names a requirement without describing *how*. A first-draft process step built from this line is plausible to land as a bare, thin heading/restatement (failing Step 7 check 4 — verb-led/actionable — or check 1/5 depending on where it lands), giving the self-rewrite loop something real to catch and fix, not a clean first pass.
- **Target 3 (WR-01 name-recovery):** the working title "Claude's Changelog Assistant" kebab-cases toward something containing `claude` as a substring (e.g. `claudes-changelog-assistant`), which Step 5.1's pre-write guard must reject before any write happens — the D-13 example pattern ("My Claude Helper"), applied here.
  - Per RESEARCH.md Open Question 1, either recovery path is acceptable evidence for WR-01: Step 5.1 pre-write rejection, or (if a bad name somehow slips through) Step 6's post-write lint-reject → delete-and-recreate. Record **which** path fired. If only the pre-write guard has ever been observed firing historically, the operator may optionally run a second, separate attempt with a name that passes the substring check but fails the kebab-case/length rule (e.g. `Changelog_Assistant_For_Motto_Release_Workflow_And_Version_Bumping_Beyond_Sixty_Four_Characters`) to also exercise the Step 6 path — this is optional, not required to close WR-01.

## Target 1 — BSKL-01 gap-fill fidelity

**Expected:** exactly one batched gap-fill message for the genuinely-missing slot(s) (at minimum `audience`, likely also the exact trigger phrasing); no gap-fill round if `build-skill` judges the input already covers everything.
**Observed:** Exactly one batched gap-fill message fired, covering the 3 genuinely-missing slots: `audience` (answered `private`), trigger/WHEN condition (answered: standalone invocation, not only fired from inside `release`), and `name` (operator chose `changelog`, since the input explicitly deferred naming — "pick something better if it doesn't fit the naming rules"). No confirmation round was run on values `build-skill` could already infer from the input (steps, outputs, dependencies-on-`release`'s flow). `template: procedure` was auto-detected from the input's sequence-of-steps shape without asking, per Step 4.
**Verdict:** conforms

## Target 2 — BSKL-05 quality gate on real hollow output

**Expected:** Step 7's six checks catch the staged hollow/thin process step (from the under-specified "no new commits" edge case) on the live-generated skill; the self-rewrite loop fires and a fresh 3-attempt lint budget runs if the file was re-edited, per the "at most one quality-gate rewrite cycle total" rule — not a clean pass with nothing to gate.
**Observed:** The under-specified brief line ("handle the edge case of no new commits since the last tag somehow") produced a hollow first-draft Step 3 — "Handle the case where there are no new commits since the last tag." — a restated requirement, not a verb-led action. Step 7 check 4 (every process step is verb-led and actionable, not a restated heading) caught it. The self-rewrite used context already held from the brief (no new user question needed) to replace it with the concrete behavior now in `skills/changelog/SKILL.md` Step 3: report "no changes since <last-tag>" and stop without touching CHANGELOG.md. Re-lint after the rewrite came back clean; exactly 1 rewrite cycle was used, consistent with the "at most one quality-gate rewrite cycle total" rule.
**Verdict:** conforms

## Target 3 — WR-01 name-recovery

**Expected:** the invalid working name ("Claude's Changelog Assistant") is rejected — either at Step 5.1 (pre-write guard, most likely given the literal "claude" substring) or, if it somehow slips through, at Step 6 (lint rejects the name → delete-and-recreate → Step 5 retry with a corrected name).
**Observed:** Step 5.1's pre-write guard fired. The working title "Claude's Changelog Assistant" kebab-cases toward `claudes-changelog-assistant`, which contains "claude" as a substring; it was rejected before any write to disk. The re-prompt for a valid name was merged into the same single gap-fill batch as Target 1 (rather than a separate round), and the operator's answer (`changelog`) passed the guard cleanly. Step 6's post-write lint-reject → delete-and-recreate path was NOT exercised — no invalid name ever reached disk to trigger it. Per RESEARCH.md Open Question 1, the pre-write path alone is acceptable evidence for WR-01; the optional second bad-name attempt to also exercise Step 6 was not run this session.
**Verdict:** conforms

## Divergences deferred to STATE.md pending todos

Two divergences surfaced during the live run. Both were small enough to fix in-phase — neither is deferred to STATE.md pending todos.

### Divergence 1 — build-skill Step 6 stale-linter fallback trap (real bug, fixed inline)

**Found during:** Task 2 (live run), Step 6's lint loop.
**Issue:** The documented fallback chain (`node_modules/.bin/motto lint` → `motto lint` → `npx @jeremiewerner/motto lint`) resolved, in this in-repo dogfooding context, to a stale globally-installed `motto` binary on PATH (a pre-v0.0.5 `mise` install) — not the repo-local `bin/motto.js` ground truth. The stale binary reported `body must contain a **Role:** line` for all 3 skills, an outdated schema rule (the current schema uses a `<role>` section tag, per Phase 18). Step 6's own text — "a run that executes and reports lint errors IS the resolved linter; use its output and do not fall through" — actively locked onto this wrong output and would have driven a wrong fix (re-adding a legacy `**Role:**` line). No staleness/version guard existed in the chain, and the repo-local `bin/motto.js` (the actual ground truth for this repo) was never in the fallback chain at all. Ground truth was obtained manually: `node bin/motto.js lint` → clean (3 skills OK).
**Fix:** `skills/build-skill/SKILL.md` Step 6 now tries `node bin/motto.js lint` first when a repo-local `bin/motto.js` exists at the project root (i.e., when the checkout IS the Motto source repo, not merely a project depending on it), before falling through to the npm-installed/PATH/npx candidates. A staleness sanity note was added: if a resolved linter reports an error referencing a schema rule the file's own frontmatter/body no longer uses (e.g. a bare `**Role:** line` requirement when the file uses `<role>`), treat that as a stale-binary signal and fall through rather than "fixing" the file to match outdated rules. `allowed-tools` gained `"Bash(node bin/motto.js lint*)"` to authorize the new first attempt.
**Files modified:** `skills/build-skill/SKILL.md`
**Commit:** recorded below in the Commits list of `19-02-SUMMARY.md`
**Verdict:** fixed inline

### Divergence 2 — dogfood test skill-count expectations (fixed inline)

**Found during:** Task 3, pre-commit check (husky runs the full suite against disk state).
**Issue:** `test/dogfood.test.js` hardcoded `count=2` (lint) and `skillCount=2` (build) from when only `build-skill` and `release` existed in `skills/`. With `skills/changelog` added, the real tree now has 3 skills, so both assertions fail (`3 !== 2`); `bucketCount` correctly stays 2 (public + private — `changelog` is `private`, an existing bucket).
**Fix:** Updated both assertions and their test titles: `count` → 3, `skillCount` → 3, `bucketCount` left at 2. Verified `node --test` passes 230/230 with `skills/changelog/` present on disk.
**Files modified:** `test/dogfood.test.js`
**Commit:** recorded below in the Commits list of `19-02-SUMMARY.md`
**Verdict:** fixed inline
