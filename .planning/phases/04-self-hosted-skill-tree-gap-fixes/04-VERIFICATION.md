---
phase: 04-self-hosted-skill-tree-gap-fixes
verified: 2026-06-30T00:00:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
---

# Phase 4: Self-Hosted Skill Tree + Gap Fixes Verification Report

**Phase Goal:** Motto's own skills tree exists in the real source layout and passes the shipped lint + build pipeline clean.
**Verified:** 2026-06-30
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All five truths are derived from the five ROADMAP Phase 4 Success Criteria. Each was verified by running the real CLI and inspecting actual files — no SUMMARY.md claims were accepted as evidence.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Root `motto.yaml` declares `name`, `version`, `description`, `plugins.public`, and `plugins.private` | VERIFIED | `cat motto.yaml` — `name: motto`, `version: "0.0.2"`, full description, `plugins.public: motto-skills`, `plugins.private: motto-private` |
| 2 | Three skills exist (`authoring-a-skill` public, `motto-project-setup` public, `motto-release` private) plus `shared/references/skill-schema.md`; no skill `name` field contains `claude` or `anthropic` | VERIFIED | All SKILL.md files read directly; grep of `name:` lines confirms no reserved substrings; skill-schema.md present and starts with H1 (no frontmatter) |
| 3 | `node bin/motto.js lint` exits 0 and prints `✓ 3 skills OK` | VERIFIED | Ran `node bin/motto.js lint; echo "EXIT:$?"` → output: `✓ 3 skills OK`, exit 0 |
| 4 | `node bin/motto.js build` produces `dist/public/` and `dist/private/`, each skill verbatim, skill-schema bundled into each public skill's `references/`, per-bucket `.claude-plugin/plugin.json` with version 0.0.2 | VERIFIED | `find dist -type f` shows exact expected tree; both plugin.json read directly showing `"name": "motto-skills"/"motto-private"`, `"version": "0.0.2"`; `dist/private/motto-release/` contains only SKILL.md (no `references/` dir) |
| 5 | `parseFrontmatter.js` `toJS()` alias-throw bug fixed in `src/frontmatter.js` with regression test; 54 tests green (53 pre-existing + 1 new); zero new dependencies | VERIFIED | `node --test` → `ℹ pass 54`, `ℹ fail 0`; `src/frontmatter.js` lines 68-76 confirm try/catch wrapping toJS(); `test/frontmatter.test.js` line 90 confirms B8 test; `package.json` dependencies: only `yaml: "^2.9.0"` (unchanged) |

**Score:** 5/5 truths verified

**Note on test count:** The PLAN must_have stated "53 tests green" based on the pre-plan baseline. The surfaced `toJS()` alias-throw bug required adding test B8, bringing the suite to 54. This is explicitly documented in the PLAN task 2 acceptance criteria ("If and only if a real src/ bug surfaced: it is fixed, all tests green, and the fix+test ship in one commit") and in the SUMMARY under "Not a deviation." The ROADMAP Phase 5 SC4 already uses "54+" as its baseline. The 53 pre-existing tests are still green; the additional test demonstrates the phase goal was exceeded, not undermined.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `motto.yaml` | Project config with all required fields | VERIFIED | `name: motto`, `version: "0.0.2"`, description present, `plugins.public: motto-skills`, `plugins.private: motto-private` |
| `shared/references/skill-schema.md` | Shared reference, no frontmatter, starts with H1 | VERIFIED | Begins with `# Motto Skill Schema Reference`; 158 lines of substantive schema documentation |
| `skills/authoring-a-skill/SKILL.md` | Public skill, `shared_references: [skill-schema]` | VERIFIED | Frontmatter: `name: authoring-a-skill`, `audience: public`, `shared_references: [skill-schema]`; body has H1 + real Role line |
| `skills/motto-project-setup/SKILL.md` | Public skill, `shared_references: [skill-schema]` | VERIFIED | Frontmatter: `name: motto-project-setup`, `audience: public`, `shared_references: [skill-schema]`; body has H1 + real Role line |
| `skills/motto-release/SKILL.md` | Private skill, no `shared_references` | VERIFIED | Frontmatter: `name: motto-release`, `audience: private`, no `shared_references` key; body has H1 + real Role line |
| `src/frontmatter.js` | toJS() alias-throw bug fixed (try/catch) | VERIFIED | Lines 68-76: `try { regionValue = regionDoc.toJS(); } catch (_) { regionValue = null; }` with explanatory comment |
| `test/frontmatter.test.js` | B8 regression test added | VERIFIED | Line 90: `it("B8: body with **Role:** line before a --- does not throw and returns no stray error", ...)` — asserts `doesNotThrow`, `result.errors` is `[]` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `skills/authoring-a-skill/SKILL.md` `shared_references: [skill-schema]` | `shared/references/skill-schema.md` | lint checks at build; file bundled to `dist/public/authoring-a-skill/references/skill-schema.md` | WIRED | `find dist -type f` confirms `dist/public/authoring-a-skill/references/skill-schema.md` exists |
| `skills/motto-project-setup/SKILL.md` `shared_references: [skill-schema]` | `shared/references/skill-schema.md` | bundled to `dist/public/motto-project-setup/references/skill-schema.md` | WIRED | `find dist -type f` confirms `dist/public/motto-project-setup/references/skill-schema.md` exists |
| `skills/motto-release/SKILL.md` `audience: private` | `motto.yaml` `plugins.private: motto-private` | private-contradiction gate in `src/build.js:135`; output to `dist/private/` | WIRED | `dist/private/motto-release/SKILL.md` exists; `dist/private/.claude-plugin/plugin.json` name is `motto-private`; no `dist/public/motto-release/` |
| Folder names | `name` fields in all SKILL.md | `src/schema.js:89` name-equals-folder check (enforced at lint) | WIRED | Lint exits 0, meaning all three folder/name pairs pass the check: `authoring-a-skill`, `motto-project-setup`, `motto-release` |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Lint exits 0, prints `✓ 3 skills OK` | `node bin/motto.js lint; echo "EXIT:$?"` | `✓ 3 skills OK` / `EXIT:0` | PASS |
| Build exits 0, produces 7 dist files | `node bin/motto.js build; find dist -type f \| sort` | exit 0; 7 files listed at expected paths | PASS |
| Public plugin.json has name=motto-skills, version=0.0.2 | `cat dist/public/.claude-plugin/plugin.json` | `{"name":"motto-skills","version":"0.0.2","description":"..."}` | PASS |
| Private plugin.json has name=motto-private, version=0.0.2 | `cat dist/private/.claude-plugin/plugin.json` | `{"name":"motto-private","version":"0.0.2","description":"..."}` | PASS |
| motto-release has no `references/` dir | `ls dist/private/motto-release/` | `SKILL.md` (only) | PASS |
| 54 tests green, 0 failures | `node --test 2>&1 \| tail -10` | `ℹ pass 54`, `ℹ fail 0` | PASS |
| B8 regression test for toJS() fix | `node --test 2>&1 \| grep B8` (verified as part of suite) | B8 included in the 54 passing tests | PASS |
| No reserved substrings in skill `name:` fields | `grep -rh '^name:' skills/*/SKILL.md \| grep -iE 'claude\|anthropic'` | no output (no matches) | PASS |
| Zero new runtime dependencies | `grep -A3 '"dependencies"' package.json` | `"yaml": "^2.9.0"` only (unchanged) | PASS |
| dist/ is gitignored | `git check-ignore -v dist/` | `.gitignore:2:dist/ dist/` — gitignored | PASS |

---

### Requirements Coverage

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| SELF-01 | Root `motto.yaml` with name, version, description, plugins.public, plugins.private | SATISFIED | `motto.yaml` read directly — all fields present |
| SELF-02 | Public skill `authoring-a-skill` with shared_references | SATISFIED | `skills/authoring-a-skill/SKILL.md` confirmed: `audience: public`, `shared_references: [skill-schema]` |
| SELF-03 | Public skill `motto-project-setup` with shared_references | SATISFIED | `skills/motto-project-setup/SKILL.md` confirmed: `audience: public`, `shared_references: [skill-schema]` |
| SELF-04 | Private skill `motto-release` (exercises private bucket) | SATISFIED | `skills/motto-release/SKILL.md` confirmed: `audience: private`; routed to `dist/private/` |
| SELF-05 | Shared reference `skill-schema` declared and bundled at build | SATISFIED | `shared/references/skill-schema.md` exists; bundled to both public skills' `references/` dirs at build |
| DOG-01 | `motto lint` reports clean — exit 0, `✓ N skills OK` | SATISFIED | `node bin/motto.js lint` → `✓ 3 skills OK`, exit 0 |
| DOG-02 | `motto build` emits expected `dist/` — both buckets, verbatim skills, bundled refs, per-bucket plugin.json with version | SATISFIED | `find dist -type f` confirms all 7 expected files; both plugin.json verified |
| DOG-03 | `node:test` dogfood test (lint in-place + build isolated copy) | DEFERRED to Phase 5 | Not in scope for Phase 4 |
| DOG-04 | NAME_KEBAB regex self-test | DEFERRED to Phase 5 | Not in scope for Phase 4 |

---

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | `node:test` dogfood test lints repo root and builds isolated copy (DOG-03) | Phase 5 | Phase 5 SC1: "`test/dogfood.test.js` lints the repo root in-place..."; SC2: "builds an isolated `mkdtemp` copy..." |
| 2 | NAME_KEBAB regex sync self-test (DOG-04) | Phase 5 | Phase 5 SC3: "A self-test asserts the `NAME_KEBAB` regex is identical between `src/schema.js` and `src/config.js`..." |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `skills/motto-release/SKILL.md` | 56 | `<!-- TODO: expand when npm packaging is configured -->` | WARNING | Intentional content stub for the Publish step (Step 5). Explicitly anticipated in PLAN task 2 ("leave publish as a clearly-marked stub since npm packaging is not yet decided"), documented in SUMMARY "Known Stubs", and the ROADMAP backlog explicitly references "A real `npm publish` flow (the `motto-release` skill carries a stub until packaging is decided)". Non-blocking — the stub is in a skill body, not source code, and the surrounding content is genuine. |

No TBD, FIXME, or XXX markers found in any phase-modified files.

---

### Human Verification (from PLAN Task 3 checkpoint)

Task 3 was a `checkpoint:human-verify` blocking gate in the PLAN. The SUMMARY frontmatter records `checkpoint_approved: true` with the following maintainer sign-off items. These are noted here for completeness; the checkpoint was completed before this verification run.

The following items were approved by the maintainer:

1. **Lint output** — `node bin/motto.js lint` → `✓ 3 skills OK` (exit 0). Confirmed by this verifier independently.

2. **dist/ structure** — Build output matches the Build Output Contract. Confirmed by this verifier independently.

3. **plugin.json content** — Both buckets: names `motto-skills` / `motto-private`, version `0.0.2`, description. Confirmed by this verifier independently.

4. **Content quality** — Role lines in all three skills are complete behavioral sentences ("You are a hands-on guide...", "You are a Motto project setup guide...", "You are the Motto release assistant..."). Content is accurate and useful, not placeholder text. Confirmed by this verifier via direct file reads.

5. **54 tests green** — Confirmed by this verifier independently via `node --test`.

---

### Gaps Summary

No gaps. All five ROADMAP success criteria are empirically verified. All seven in-scope requirements (SELF-01 through SELF-05, DOG-01, DOG-02) are satisfied. DOG-03 and DOG-04 are correctly deferred to Phase 5.

The one deviation from the PLAN must_have (54 tests vs 53) is a pre-documented, expected outcome of the in-scope bug fix, not a regression.

---

_Verified: 2026-06-30_
_Verifier: Claude (gsd-verifier)_
