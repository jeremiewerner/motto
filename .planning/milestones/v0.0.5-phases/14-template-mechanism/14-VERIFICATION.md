---
phase: 14-template-mechanism
verified: 2026-07-03T02:00:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Section-tag matching ignores tags inside fenced code blocks (no false positives) [Roadmap SC3] — hasClosedSection now tracks the opening fence's character+length (closes only on same-char, length>= marker) and requires the open-tag match index to strictly precede the close-tag match index."
  gaps_remaining: []
  regressions: []
---

# Phase 14: Template Mechanism Verification Report

**Phase Goal:** Authors can declare `template: <name>` on a skill and `motto lint` enforces that template's extra rules, driven entirely by pure data.
**Verified:** 2026-07-03T02:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 14-03)

## Goal Achievement

### Observable Truths

| # | Truth (Roadmap SC) | Status | Evidence |
|---|------|--------|----------|
| 1 | An author adds `template: procedure` and lint fails unless body has `<process>` and `<success_criteria>` | ✓ VERIFIED | `src/schema.js:220-251` cascade; template-cascade describe block passes in full (re-run in this verification: 155/155 overall); confirmed live on `skills/release/SKILL.md` (`node bin/motto.js lint` → `✓ 2 skills OK`). |
| 2 | Unknown template name fails lint with an error listing available templates | ✓ VERIFIED | `src/schema.js:237-239`: `unknown template "<tpl>" (available: <sorted keys>)`. Test "template: 'standard' (unknown) reports one error with sorted available names" passes; error-string construction read directly from source. |
| 3 | Section-tag matching ignores tags inside fenced code blocks (no false positives) | ✓ VERIFIED (gap closed) | Independently re-reproduced both previously-failing cases against the current shipped `src/schema.js` via standalone Node one-liners (not the test suite): (a) mixed backtick/tilde fence body with tags trapped inside a still-open fence → now returns `false` (tested both `` ``` → ~~~ stray → tags → ``` `` and the reverse `~~~ → \`\`\` stray → tags → ~~~` orderings); (b) reversed `</process>` before `<process>` (unfenced) → now returns `false`. Also independently tested a stricter CommonMark case beyond the plan's explicit scope (4-backtick fence closed by only 3 backticks — correctly stays fenced, returns `false`) and two positive controls (valid unfenced pair → `true`; valid pair followed by an unrelated properly-matched real fence → `true`). All 6 independent checks matched expected CommonMark-correct behavior. The project's own regression suite (`test/schema.test.js` lines 522-538, "mixed backtick and tilde fences" and "close tag precedes the open tag" cases) also passes as part of the full 155/155 green run. |
| 4 | A skill with no `template:` field lints byte-for-byte identically to v0.0.4 | ✓ VERIFIED | `hasOwnProperty` presence gate (`src/schema.js:227`) means `waivedSections` stays empty and the template block is a no-op when the key is absent. Two dedicated TMPL-05 regression tests pass (valid-skill → `[]`, invalid-body → same base-spine errors). Unaffected by the gap-closure plan (14-03 touched only `hasClosedSection` internals, not this gate). |
| 5 | Adding a new template requires only editing `src/templates.js` — no linter/mechanism code change | ✓ VERIFIED | `src/templates.js` read in full: exactly `SECTIONS` (2 keys) and `TEMPLATES.procedure.requiredSections`, no `import`, no function definitions. `waives` merge logic exercised end-to-end via an injected `FIXTURE_TEMPLATES` registry in `test/schema.test.js` through the `templatesRegistry` DI parameter, without touching `src/templates.js`. |

**Score:** 5/5 truths verified (0 partial, 0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/templates.js` | Pure-data `SECTIONS`+`TEMPLATES` exports, no functions/imports | ✓ VERIFIED | Read in full — confirmed pure data, no imports, no functions. |
| `src/schema.js` — `hasClosedSection` | Fence-aware (character+length tracked), line-anchored, ordered matched-pair scanner | ✓ VERIFIED | Rewritten (commit `0f9b4bd`) to a nullable `{ ch, len }` fence descriptor (closes only on same-char, length ≥ opener) and an ordered `exec`-index comparison (open index < close index). Read in full at `src/schema.js:68-97`; matches the plan's WR-01/WR-02 fix spec exactly. Independently re-verified via standalone repro script (see truth #3), not just by trusting the test suite. |
| `src/schema.js` — template cascade in `validateSkill` | Non-string → unknown → required-sections branch order; injectable `templatesRegistry` | ✓ VERIFIED | Code at lines 220-251 matches the plan's cascade spec; all cascade + adversarial + TMPL-05 + waives tests pass (155/155 full suite, re-run independently in this verification). |
| `skills/release/SKILL.md` | `template: procedure` + `<process>`/`<success_criteria>` sections, live dogfood | ✓ VERIFIED | `template: procedure` in frontmatter; body wraps steps in `<process>`/`</process>` and adds `<success_criteria>`/`</success_criteria>`. `node bin/motto.js lint` → `✓ 2 skills OK` (re-run in this verification). |
| `test/schema.test.js` | Two new regression cases for mixed-fence and reversed-order defects | ✓ VERIFIED | Lines 522-538: "mixed backtick and tilde fences" and "close tag precedes the open tag" cases present, both pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/templates.js` | `src/schema.js` | `import { SECTIONS, TEMPLATES } from "./templates.js"` | WIRED | Confirmed at `src/schema.js:15`. |
| `hasClosedSection` | template cascade | called per `requiredSections` entry | WIRED | Confirmed at `src/schema.js:244`. |
| `waivedSections` | Title/Role checks | computed before, gates `if (!waivedSections.has(...))` | WIRED, correct order | Cascade (lines 220-251) precedes Title check (257) and Role check (269). |
| `validateSkill`'s 3rd param | test-only `FIXTURE_TEMPLATES` | DI default `{ SECTIONS, TEMPLATES }` | WIRED | Confirmed via passing waives-fixture tests. |
| `release/SKILL.md` `template: procedure` | build copy | verbatim `dist/private/release/SKILL.md` | WIRED | Re-confirmed via direct build + grep in this verification — all 4 tags present verbatim in dist output. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green (single run, re-executed independently) | `node --test` | 155 pass, 0 fail | ✓ PASS |
| Live lint clean | `node bin/motto.js lint` | `✓ 2 skills OK` | ✓ PASS |
| Live build + tag survival | `node bin/motto.js build` + grep dist | all 4 tags present verbatim | ✓ PASS |
| `hasClosedSection` mixed-fence (backtick-opens/tilde-stray/backtick-closes) — independent repro | Node one-liner | returns `false` (correct) | ✓ PASS |
| `hasClosedSection` mixed-fence (tilde-opens/backtick-stray/tilde-closes) — independent repro | Node one-liner | returns `false` (correct) | ✓ PASS |
| `hasClosedSection` reversed-tag-order — independent repro | Node one-liner (`</process>` before `<process>`) | returns `false` (correct) | ✓ PASS |
| `hasClosedSection` valid unfenced pair — positive control | Node one-liner | returns `true` (correct) | ✓ PASS |
| `hasClosedSection` valid pair + unrelated real fence after — positive control | Node one-liner | returns `true` (correct) | ✓ PASS |
| `hasClosedSection` 4-backtick fence closed by only 3 backticks (stricter CommonMark check, beyond plan scope) — independent repro | Node one-liner | returns `false` (stays fenced, correct) | ✓ PASS |
| Commits `a665f17` (test) and `0f9b4bd` (fix) exist in history | `git cat-file -e` + `git show --stat` | both found, correct file scope (test-only vs. schema.js-only) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| TMPL-01 | 14-01, 14-02 | Author declares `template:`, lint enforces extra rules | ✓ SATISFIED | Cascade implemented and dogfooded live. |
| TMPL-02 | 14-01 | Template + section registry is pure data | ✓ SATISFIED | `src/templates.js` verified pure data; waives DI proven. |
| TMPL-03 | 14-01, 14-02, 14-03 | `procedure` requires `<process>`+`<success_criteria>`; fence matching ignores fenced blocks | ✓ SATISFIED | Core requirement enforced; the "ignores fenced blocks" clause gap (mixed-fence + ordering false positives) is now closed and independently re-verified in this pass. |
| TMPL-04 | 14-01 | Unknown template name errors, lists available | ✓ SATISFIED | Verified. |
| TMPL-05 | 14-01, 14-03 (unaffected) | Template-less skills behave exactly as v0.0.4 | ✓ SATISFIED | Regression tests pass; gap-closure plan did not touch this gate. |

No orphaned requirements — REQUIREMENTS.md lists exactly TMPL-01..05 for Phase 14, and all three PLAN files' `requirements:` frontmatter jointly cover all five (14-01: all five; 14-02: TMPL-01, TMPL-03; 14-03: TMPL-03).

### Anti-Patterns Found

None. Re-scanned all phase-modified files (`src/templates.js`, `src/schema.js`, `skills/release/SKILL.md`, `test/schema.test.js`, `test/dogfood.test.js`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers — zero matches.

The one previously-flagged warning (`src/schema.js` template cascade throwing on malformed registry shapes, WR-03/WR-04) remains present and is explicitly out of scope for Phase 14 — see Deferred Items below. It was not touched by plan 14-03 and does not affect the phase's authors→lint contract (only reachable via a maintainer hand-edit of `src/templates.js` or the test-only `templatesRegistry` injection point, never via untrusted skill-author input).

### Deferred Items

Items not yet met but explicitly addressed in a later phase.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Registry-shape throw paths on malformed `TEMPLATES` entries (WR-03: unescaped `tagName` interpolation; WR-04: no shape guards on `TPL[tpl]`) | Phase 15 | `14-03-SUMMARY.md`: "Deferred WR-03 ... and WR-04 ... to Phase 15 per the plan's explicit scope boundary"; Phase 15 (field-validation-integrity-guards) success criteria explicitly cover "every new validator is never-throw." Not a Phase 14 blocker — unreachable via untrusted skill-author input, only via a maintainer hand-edited registry or the test-only DI parameter. |

### Human Verification Required

None. All findings verified programmatically by direct, independent reproduction against the shipped code (Node one-liners run fresh in this verification pass against the current `src/schema.js`, plus a full `node --test` re-run), not inferred from SUMMARY.md, REVIEW.md, or the prior VERIFICATION.md's claims.

### Gaps Summary

No gaps remain. The prior verification (2026-07-02, gaps_found, 4/5) found exactly one failing truth — Roadmap SC3 / TMPL-03's "no false positives" guarantee — caused by two defects in `hasClosedSection`: (1) the fence-state toggle ignored which character opened the fence and its length (WR-02), letting a stray mismatched-marker line inside an open fence be mistaken for a boundary; (2) no ordering check between the open- and close-tag matches (WR-01), letting a reversed `</process>` ... `<process>` body register as a valid closed pair.

Gap-closure plan 14-03 rewrote `hasClosedSection` (commit `0f9b4bd`, preceded by RED regression tests in `a665f17`) to track a nullable `{ ch, len }` fence descriptor — closing a fence only on a same-character marker line of length ≥ the opener's — and to require the open-tag match's index to strictly precede the close-tag match's index.

This re-verification independently reproduced both previously-failing cases from scratch against the current shipped module (not by re-running the project's own tests) and confirmed both now return the CommonMark-correct `false`. It also tested two additional adversarial variants beyond the plan's explicit scope (reversed fence-character-pairing direction, and a stricter CommonMark fence-length rule) — all passed — plus two positive controls to confirm valid pairs still return `true`. The full `node --test` suite was re-run independently and passed at 155/155, and TMPL-05's byte-for-byte v0.0.4 regression guarantee was re-confirmed unaffected (the fix touched only `hasClosedSection` internals, not the `hasOwnProperty` presence gate or any other cascade branch). Live `lint`/`build` on the real `skills/release/SKILL.md` dogfood target were also re-run directly and pass.

All 5 roadmap success criteria / TMPL-01..05 requirements are now fully satisfied. The registry-shape throw paths (WR-03/WR-04) remain correctly out of scope per the prior verification's classification and this phase's PLAN — deferred to Phase 15, not a blocker.

---

_Verified: 2026-07-03T02:00:00Z_
_Verifier: Claude (gsd-verifier)_
