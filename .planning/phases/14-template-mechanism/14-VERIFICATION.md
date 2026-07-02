---
phase: 14-template-mechanism
verified: 2026-07-02T23:17:22Z
status: gaps_found
score: 4/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Section-tag matching ignores tags that appear inside fenced code blocks (no false positives) [Roadmap SC3]"
    status: partial
    reason: >
      hasClosedSection's fence scanner (src/schema.js:63-80) toggles `inFence` on ANY
      line matching 3+ backticks OR 3+ tildes, without tracking which character opened
      the fence or requiring the closing marker to match length/character (contrary to
      real CommonMark fence semantics the function's own doc comment claims to follow).
      Independently reproduced: a body opening a `~~~` fence and then hitting an
      unrelated ``` line (e.g. a second, differently-fenced block later in the same
      skill body) causes the scanner to treat a `<process>`/`</process>` pair that is
      still inside the open `~~~` fence as real, unfenced tags — `hasClosedSection`
      returns `true` for tags a human/CommonMark renderer would see as literal code-block
      text. This is a genuine false positive, which the roadmap SC explicitly disallows.
      A related, independently reproduced defect in the same function (WR-01 from the
      phase code review): no open-before-close ordering check — `</process>\n<process>\n`
      (close tag literally preceding the open tag) returns `true`, contradicting the
      "matched pair" contract implied by the function's name and TMPL-03's intent.
      Neither case is covered by test/schema.test.js's `hasClosedSection` describe block
      (lines 470-520), which only exercises same-character single-fence-type bodies and
      correctly-ordered tags, so both defects shipped undetected by the automated suite.
    artifacts:
      - path: "src/schema.js"
        issue: "hasClosedSection (lines 63-80): fence toggle ignores fence character/length (WR-02); no open<close ordering check (WR-01)."
    missing:
      - "Track the opening fence's character and required minimum length; only toggle inFence closed on a marker line using the same character with length >= the opener's (per code review WR-02 suggested patch)."
      - "Add an explicit ordering check: only report a closed section when the open-tag match index precedes the close-tag match index (per code review WR-01 suggested patch)."
      - "Add regression tests for: (a) a body mixing backtick and tilde fences in the same document, (b) a body where the close tag appears before the open tag."
---

# Phase 14: Template Mechanism Verification Report

**Phase Goal:** Authors can declare `template: <name>` on a skill and `motto lint` enforces that template's extra rules, driven entirely by pure data.
**Verified:** 2026-07-02T23:17:22Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (Roadmap SC) | Status | Evidence |
|---|------|--------|----------|
| 1 | An author adds `template: procedure` and lint fails unless body has `<process>` and `<success_criteria>` | ✓ VERIFIED | `src/schema.js:213-234` cascade; `test/schema.test.js` template-cascade tests all pass (11/11); confirmed live on `skills/release/SKILL.md` (`node bin/motto.js lint` → `✓ 2 skills OK`). Note: correctness of the underlying section scanner has a caveat — see truth #3. |
| 2 | Unknown template name fails lint with an error listing available templates | ✓ VERIFIED | `src/schema.js:220-222`: `unknown template "<tpl>" (available: <sorted keys>)`. Test `B13b` and the dedicated "unknown template" test pass. Independently confirmed via direct `validateSkill` call. |
| 3 | Section-tag matching ignores tags inside fenced code blocks (no false positives) | ✗ FAILED (partial) | Independently reproduced two false-result cases in `hasClosedSection` (`src/schema.js:63-80`): (a) mixed backtick/tilde fence markers cause a still-fenced `<process>`/`</process>` pair to be counted as real (false positive — direct SC3 violation); (b) no open-before-close ordering check lets a reversed `</process>` `<process>` body register as a valid closed pair. Both reproduced with one-line Node scripts against the actual shipped module (not hypothetical). Neither case is covered by the test suite. See Gaps Summary. |
| 4 | A skill with no `template:` field lints byte-for-byte identically to v0.0.4 | ✓ VERIFIED | `hasOwnProperty` presence gate (`src/schema.js:210`) means `waivedSections` stays empty and the template block is a no-op when the key is absent. Two dedicated TMPL-05 regression tests pass (valid-skill → `[]`, invalid-body → same base-spine errors). |
| 5 | Adding a new template requires only editing `src/templates.js` — no linter/mechanism code change | ✓ VERIFIED | `src/templates.js` is pure data (no functions, no imports — confirmed by reading the file). `waives` merge logic is exercised end-to-end via an injected `FIXTURE_TEMPLATES` registry in `test/schema.test.js` through the `templatesRegistry` DI parameter, without touching `src/templates.js` — both waives tests pass. |

**Score:** 4/5 truths verified (1 partial failure — see gap)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/templates.js` | Pure-data `SECTIONS`+`TEMPLATES` exports, no functions/imports | ✓ VERIFIED | Read in full — exactly `SECTIONS` (2 keys) and `TEMPLATES.procedure.requiredSections`, no `import`, no function definitions. |
| `src/schema.js` — `hasClosedSection` | Fence-aware, line-anchored, matched-pair scanner | ⚠️ STUB-LIKE (correctness gap) | Present, exported, wired, and passes all its own unit tests, but has two independently reproduced correctness defects (fence-char/length tracking, tag ordering) not exercised by any test — see gap above. |
| `src/schema.js` — template cascade in `validateSkill` | Non-string → unknown → required-sections branch order; injectable `templatesRegistry` | ✓ VERIFIED | Code at lines 210-234 matches the plan's cascade spec exactly; all cascade + adversarial + TMPL-05 + waives tests pass (153/153 full suite). |
| `skills/release/SKILL.md` | `template: procedure` + `<process>`/`<success_criteria>` sections, live dogfood | ✓ VERIFIED | Read in full — frontmatter has `template: procedure`; body wraps Step 1-6 in `<process>`/`</process>` and adds a net-new `<success_criteria>`/`</success_criteria>` block; H1 title and `**Role:**` line preserved verbatim. `node bin/motto.js lint` → `✓ 2 skills OK`. |
| `test/dogfood.test.js` | New assertion for verbatim tag survival through build | ✓ VERIFIED | Ran `node bin/motto.js build` then `grep`ped `dist/private/release/SKILL.md` — all four tags (`<process>`, `</process>`, `<success_criteria>`, `</success_criteria>`) present verbatim. `node --test test/dogfood.test.js` → 10/10 pass, including the new assertion and the unchanged `lintProject` ok:true/count:2/errors:[] checks. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/templates.js` | `src/schema.js` | `import { SECTIONS, TEMPLATES } from "./templates.js"` | WIRED | Confirmed at `src/schema.js:15`. |
| `hasClosedSection` | template cascade | called per `requiredSections` entry | WIRED | Confirmed at `src/schema.js:227`. |
| `waivedSections` | Title/Role checks | computed before, gates `if (!waivedSections.has(...))` | WIRED, correct order | Cascade (lines 210-234) precedes Title check (240) and Role check (252) — matches Pitfall-2 mitigation. |
| `validateSkill`'s 3rd param | test-only `FIXTURE_TEMPLATES` | DI default `{ SECTIONS, TEMPLATES }` | WIRED | Confirmed via passing waives-fixture tests; production `templates.js` has no fixture data. |
| `release/SKILL.md` `template: procedure` | build copy | verbatim `dist/private/release/SKILL.md` | WIRED | Confirmed via direct build + grep (see artifacts table). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green | `node --test` | 153 pass, 0 fail | ✓ PASS |
| Live lint clean | `node bin/motto.js lint` | `✓ 2 skills OK` | ✓ PASS |
| Live build + tag survival | `node bin/motto.js build` + grep dist | all 4 tags present verbatim | ✓ PASS |
| `hasClosedSection` mixed-fence false positive (independent repro) | Node one-liner, mixed `~~~`/```` ``` ```` body | returned `true` (should be `false`) | ✗ FAIL |
| `hasClosedSection` reversed-tag-order (independent repro) | Node one-liner, `</process>\n<process>\n` | returned `true` (should be `false`) | ✗ FAIL |
| `validateSkill` malformed-registry throws (independent repro of REVIEW WR-03/WR-04) | Node one-liner with metachar section name / null entry / non-iterable `waives` | throws in all 3 cases | ✗ FAIL (see note below) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| TMPL-01 | 14-01, 14-02 | Author declares `template:`, lint enforces extra rules | ✓ SATISFIED | Cascade implemented and dogfooded live. |
| TMPL-02 | 14-01 | Template + section registry is pure data | ✓ SATISFIED | `src/templates.js` verified pure data; waives DI proven. |
| TMPL-03 | 14-01, 14-02 | `procedure` requires `<process>`+`<success_criteria>`; fence matching ignores fenced blocks | ⚠️ PARTIALLY SATISFIED | Core requirement enforced (tests pass); the "ignores fenced blocks" clause has a demonstrated edge-case violation (see truth #3). |
| TMPL-04 | 14-01 | Unknown template name errors, lists available | ✓ SATISFIED | Verified. |
| TMPL-05 | 14-01 | Template-less skills behave exactly as v0.0.4 | ✓ SATISFIED | Regression tests pass. |

No orphaned requirements — REQUIREMENTS.md lists exactly TMPL-01..05 for Phase 14, and both PLAN files' `requirements:` frontmatter jointly cover all five.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any phase-modified file (`src/templates.js`, `src/schema.js`, `skills/release/SKILL.md`, `test/schema.test.js`, `test/dogfood.test.js`).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/schema.js` | 63-80 | `hasClosedSection` doc comment claims "matching CommonMark fence semantics" and a "matched pair" but implementation does neither correctly (fence char/length untracked; no ordering check) | Warning | Undermines the stated rigor of the mechanism on inputs the reviewer and this verification both independently reproduced as author-reachable (not requiring a malformed registry). |
| `src/schema.js` | 224-226 | Template cascade destructures/iterates `TPL[tpl]` without shape guards | Warning (non-blocking) | Throws (`TypeError`) if a maintainer hand-edits `src/templates.js` with a malformed entry (`null` value, non-array `waives`) or a section name containing regex metacharacters. Reachable only via the registry itself (a maintainer edit or the injectable `templatesRegistry` test parameter), never via untrusted skill-author frontmatter/body — `data.template` itself is fully guarded (confirmed: non-string, empty-string, `null`, and throwing-`toString` all error without throwing). Does not affect the phase's authors→lint contract. Recommend fixing before Phase 15 (whose own SC explicitly requires "every new validator is never-throw"), but not a Phase 14 blocker. |

### Human Verification Required

None. All findings above were verified programmatically by direct reproduction against the shipped code (Node one-liners against `src/schema.js`), not inferred from SUMMARY.md or REVIEW.md claims.

### Gaps Summary

The template mechanism's happy-path and its explicitly-tested edge cases (missing sections, unknown template, malformed `data.template`, template-less regression, waives via injected fixture) are all real, wired, and correctly implemented — 153/153 tests pass, and the live dogfood (`skills/release/SKILL.md`) proves the mechanism end-to-end on the real tree. TMPL-01, TMPL-02, TMPL-04, and TMPL-05 are fully satisfied.

TMPL-03's fence-exclusion guarantee, however, has a **reproducible, author-reachable false positive**: `hasClosedSection`'s fence scanner treats any 3+-backtick-or-tilde line as toggling fence state without checking which character opened the fence or requiring matching length. A skill body containing two differently-fenced blocks (one `~~~`, one ` ``` `) can cause tags that are genuinely inside an open code fence to be counted as real, unfenced section markers — exactly the "false positive" the roadmap's SC3 explicitly rules out. A second, related defect (no open-before-close ordering check) means a body with tags in reverse order is also incorrectly accepted as a valid closed pair. Neither defect is covered by the test suite, so they shipped silently. Both were independently reproduced in this verification (not merely carried over from the code review's warnings) with the exact shipped module — this is not a hypothetical.

These are edge cases (they require either multiple differently-fenced blocks or deliberately reversed tags in the same body) and do not affect the single shipped `procedure` template's actual dogfood target (`skills/release/SKILL.md`'s fences are single-character-type and balanced, confirmed). But because SC3 is stated as an unconditional guarantee ("no false positives") and a concrete counter-example exists in author-reachable input (not merely a malformed-registry edge case), this is reported as a gap rather than passed-with-note.

Separately, two throw paths exist on the registry side (malformed `TEMPLATES` entries reachable only by a maintainer hand-editing `src/templates.js`, or by the test-only `templatesRegistry` injection point) — these violate the module's own unconditional "NEVER throws (D-01)" doc header but do not cross the phase's stated authors→lint trust boundary. Recorded as a non-blocking warning/follow-up, consistent with the code review's own severity classification, and explicitly not counted as a phase-goal blocker.

**This looks like a straightforward, well-scoped fix rather than an intentional deviation** — the code review (`14-REVIEW.md`) already supplies working patches for both `hasClosedSection` defects (WR-01, WR-02). If the fix is deferred instead of applied, an override can be recorded:

```yaml
overrides:
  - must_have: "Section-tag matching ignores tags that appear inside fenced code blocks (no false positives)"
    reason: "Mixed-fence-character and reversed-tag-order edge cases are accepted as known, tracked limitations; the single shipped template's actual usage (skills/release/SKILL.md) is unaffected and no test/skill in the repo exercises the failing pattern."
    accepted_by: "{your name}"
    accepted_at: "{current ISO timestamp}"
```

---

_Verified: 2026-07-02T23:17:22Z_
_Verifier: Claude (gsd-verifier)_
