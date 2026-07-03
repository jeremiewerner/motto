# Phase 19: build-skill Live Verification Findings (BSKV-01)

**Run date:** TODO — set to the date of the actual live `/build-skill` invocation
**Staged input used:** see "Staged input used" section below (the exact freeform brief given to `/build-skill`)
**Skill produced:** TODO — `skills/<name>/` path once written (shipped: yes/no — lint status)

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
**Observed:** TODO — fill in after the live run (what `build-skill` actually asked, or confirmation it asked nothing and why)
**Verdict:** TODO — one of: conforms | fixed inline (cite commit/diff) | ticketed (describe/link follow-up)

## Target 2 — BSKL-05 quality gate on real hollow output

**Expected:** Step 7's six checks catch the staged hollow/thin process step (from the under-specified "no new commits" edge case) on the live-generated skill; the self-rewrite loop fires and a fresh 3-attempt lint budget runs if the file was re-edited, per the "at most one quality-gate rewrite cycle total" rule — not a clean pass with nothing to gate.
**Observed:** TODO — fill in after the live run (which check(s) failed, what was rewritten, or confirmation the first draft was already clean and why)
**Verdict:** TODO — one of: conforms | fixed inline | ticketed

## Target 3 — WR-01 name-recovery

**Expected:** the invalid working name ("Claude's Changelog Assistant") is rejected — either at Step 5.1 (pre-write guard, most likely given the literal "claude" substring) or, if it somehow slips through, at Step 6 (lint rejects the name → delete-and-recreate → Step 5 retry with a corrected name).
**Observed:** TODO — fill in after the live run (which path fired, and whether recovery completed cleanly to a valid final name)
**Verdict:** TODO — one of: conforms | fixed inline | ticketed

## Divergences deferred to STATE.md pending todos

TODO — list any divergence too large to fix in-phase (with a matching STATE.md Pending Todos entry), or write "none" once the live run and Task 3 recording are complete.
