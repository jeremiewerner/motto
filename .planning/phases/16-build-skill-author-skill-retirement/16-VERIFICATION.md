---
phase: 16-build-skill-author-skill-retirement
verified: 2026-07-03T10:43:19Z
status: gaps_found
score: 5/7 must-haves verified
behavior_unverified: 2
overrides_applied: 0
gaps:
  - truth: "GUARD then WRITE — Step 5 validates the proposed name before writing (must_haves.truths #2 / roadmap SC2 BSKL-02 'produces a complete conforming skills/<name>/ ... in one pass')"
    status: failed
    reason: >
      Step 5 guard 1 only checks kebab-case shape ("it must be kebab-case, starting with a
      lowercase letter"). It omits the max-64-character and reserved-substring
      ("anthropic"/"claude") checks that the real linter enforces (src/schema.js NAME_KEBAB
      cascade at src/schema.js:218-229, confirmed live: RESERVED = ["anthropic", "claude"]).
      A plausible input name — anything containing "claude", highly likely given this tool's
      exact domain (Claude Code skill authoring) — passes the guard, gets written to disk in
      Step 5, then fails lint in Step 6 with an error that has no authorized recovery: Step 6
      explicitly says "never edit files outside skills/<name>/" and never authorizes
      renaming/deleting the just-created directory, which is the only real fix since `name`
      must equal the folder name. The agent burns all 3 lint attempts on a guaranteed-unfixable
      error and leaves a broken, un-lintable directory behind on disk. This breaks the phase's
      core promise ("a user hands build-skill ANY input and receives a complete, lint-clean,
      conforming skill") for a realistic input class. Flagged in 16-REVIEW.md as WR-01
      (commit 1c6cd82, 2026-07-03T12:39:39+02:00) and never remediated — no commit touches
      skills/build-skill/SKILL.md after 17035e0 (12:30:12+02:00, before the review landed).
    artifacts:
      - path: "skills/build-skill/SKILL.md"
        issue: "Step 5 guard 1 (line 49) validates only kebab-case+lowercase-start; Step 6 (lines 55-63) authorizes no recovery for a name-only lint failure"
    missing:
      - "Extend Step 5 guard 1 to also reject names >64 chars and names containing the reserved substrings \"anthropic\"/\"claude\", matching the real NAME cascade in src/schema.js"
      - "OR add an explicit authorized recovery clause to Step 6 for a name-cascade lint failure (delete skills/<name>/, return to Step 5 with a corrected name)"
  - truth: "LINT LOOP — run the real linter... iterate at most 3 attempts (must_haves.truths #2 / roadmap SC2 BSKL-03 'iterating until clean')"
    status: partial
    reason: >
      Step 6's fallback-chain wording ("trying each of the following in order until one
      resolves") does not distinguish "command not found/couldn't execute" from "command ran
      and reported real lint errors" — an agent could read a genuine lint failure as
      "unresolved" and fall through to `npx @jeremiewerner/motto lint`, which fetches the
      published registry version (verified stale in 16-RESEARCH.md Pitfall 7: global install
      reports an older CLI surface). This risks a version-skewed false-clean or spurious-error
      verdict instead of trusting the local linter's real output. Flagged in 16-REVIEW.md as
      WR-02, unresolved (same unremediated-since-review gap as above).
    artifacts:
      - path: "skills/build-skill/SKILL.md"
        issue: "Step 6 (lines 55-63) ambiguous execution-failure-vs-lint-failure fallback semantics"
    missing:
      - "Reword Step 6 to fall through only on command-not-found/exec failure — a run that executes and reports lint errors IS the resolved linter"
behavior_unverified_items:
  - truth: "build-skill asks only genuinely-missing gap-fill questions, in one batch, for arbitrary freeform input (BSKL-01)"
    test: "Hand build-skill several freeform inputs (a complete spec, a partial spec missing 2-3 slots, a conversation transcript) and observe whether it asks zero questions for the complete case and exactly one batched message for the partial case"
    expected: "Zero questions when input is complete; one batched message listing only missing slots otherwise; no sequential interview"
    why_human: "Prompt-engineering fidelity — whether the prose reliably produces this exact agent behavior across varied real inputs cannot be proven by static grep/lint checks alone (SUMMARY.md's own D2 rationale concurs: human_judgment: true)"
  - truth: "The content-quality gate (Step 7) reliably catches hollow Role lines / vacuous success criteria / workflow-summary descriptions on live-generated output, not just on build-skill's own file (BSKL-05)"
    test: "Generate a skill from an input that would naturally produce a weak Role line or a vacuous success-criteria list, and confirm Step 7 catches and self-fixes it before Step 8's receipt"
    expected: "Gate flags the weak content, agent self-fixes without asking (unless truly unrecoverable info is missing), re-lints, then reports"
    why_human: "Whether the checklist wording is genuinely objective/checkable in practice (not rubber-stampable) is a prose-quality judgment (SUMMARY.md's own D4 rationale concurs: human_judgment: true)"
---

# Phase 16: build-skill & author-skill Retirement Verification Report

**Phase Goal:** A user hands `build-skill` any input and receives a complete, lint-clean, conforming skill; `author-skill` is retired in the same atomic move.
**Verified:** 2026-07-03T10:43:19Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `skills/build-skill/SKILL.md` exists, declares `template: procedure` + `audience: public` + `shared_references: [skill-schema]`, and lints clean live | ✓ VERIFIED | File present; frontmatter matches exactly; `node bin/motto.js lint` → `✓ 2 skills OK`, exit 0 |
| 2 | build-skill's body instructs ingest→gap-fill→auto-detect→**guard**→write→lint-loop→quality-gate→receipt | ✗ FAILED (partial) | All 8 steps present in prose, BUT the "guard" sub-step is incomplete relative to the real validator and the lint-loop sub-step has ambiguous fallback semantics — see gaps below (16-REVIEW.md WR-01, WR-02, unresolved) |
| 3 | build-skill's body contains NO verbatim lint error-message strings or regexes (DOC-06) | ✓ VERIFIED | `grep -F 'letter-start kebab-case'` → 0 matches; `grep -F 'Common Lint Errors'` → 0 matches; no other lint message strings found in a broader scan |
| 4 | `skills/author-skill/` no longer exists on disk | ✓ VERIFIED | `test -d skills/author-skill` → absent; deleted in commit `b868ea7` |
| 5 | `test/dogfood.test.js` asserts build-skill dist artifacts, skill count stays 2, full suite passes green | ✓ VERIFIED | `grep -c author-skill test/dogfood.test.js` → 0; assertions target `dist/public/build-skill/SKILL.md` and `.../references/skill-schema.md`; `node --test` → 194/194 pass, 0 fail |
| 6 | `node bin/motto.js lint && node bin/motto.js build` both succeed on the post-swap tree | ✓ VERIFIED | Live run: lint → `✓ 2 skills OK` (exit 0); build → `✓ built ... — 2 skills, 2 plugin(s)` (exit 0); `dist/public/build-skill/SKILL.md` and `dist/public/build-skill/references/skill-schema.md` both exist |
| 7 | build-skill asks only gap-filling questions before generating, for arbitrary input (BSKL-01) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Step 1 (ingest-as-data) and Step 3 (one-batch gap-fill) prose present and well-formed; actual agent-behavior fidelity across varied real inputs cannot be proven statically — routed to human verification |

**Score:** 5/7 truths verified (2 present, behavior-unverified; 1 explicitly failed with a documented, unremediated code-review finding)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `skills/build-skill/SKILL.md` | Public `template: procedure` skill, H1 title, behavioral `**Role:**`, matched `<process>`/`<success_criteria>` pairs | ✓ VERIFIED (exists, substantive, wired) | 97 lines, 885-word body (roadmap has no word-count must-have, but nearly 2x the plan's own "~350-450 word" / CONTEXT.md's "<500 words" prompt-engineering target — noted as a quality anti-pattern, not a blocker); frontmatter and body structure all schema-valid; lints clean live |
| `test/dogfood.test.js` | Retargeted dist assertions, count===2 unchanged | ✓ VERIFIED | Two assertions swapped (lines ~92-99); count assertions (2 skills, 2 buckets) numerically unchanged; full suite green |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| dogfood test `count===2` | atomic swap | build-skill added + author-skill deleted net-zero in the SAME commit | ✓ WIRED | `git show --stat b868ea7` shows all three file operations (SKILL.md add, SKILL.md delete, dogfood.test.js edit) in one commit |
| husky pre-commit hook | `node --test` on every commit | commit-time enforcement | ✓ WIRED | Both commits (`b868ea7`, `17035e0`) landed with the suite green (194/194 at time of verification) |
| `template: procedure` frontmatter | mandatory `<process>`/`<success_criteria>` sections | Phase 14 TMPL enforcement | ✓ WIRED | Both tag pairs present and matched; `motto lint` accepts the skill (would fail without them per Phase 14 mechanism) |
| `shared_references: [skill-schema]` | `dist/public/build-skill/references/skill-schema.md` bundling | Phase 12/15 bundling mechanism | ✓ WIRED | File present at that exact path post-build; asserted by dogfood test and confirmed live |
| Step 5 name guard | real linter's NAME cascade (`src/schema.js`) | pre-write validation intended to prevent unfixable post-write lint failures | ✗ NOT_WIRED (partial) | Guard only replicates the kebab-case regex step of the cascade; omits max-64-length and reserved-substring steps that the same file's linter enforces — see gap #1 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BSKL-01 | 16-01-PLAN.md | User can hand build-skill any input; asks gap-filling questions only | ⚠️ NEEDS HUMAN (structurally present) | Step 1/Step 3 prose present and correct in shape; live behavioral fidelity unverified (see behavior_unverified_items) |
| BSKL-02 | 16-01-PLAN.md | Generates a complete conforming `skills/<name>/` in one pass | ✗ BLOCKED (partial) | Fails for a realistic input class due to the Step 5 guard gap (gap #1) — the agent cannot reliably complete the pipeline for names containing "claude"/"anthropic" or >64 chars |
| BSKL-03 | 16-01-PLAN.md | Self-verifies via `motto lint`, iterates until clean | ⚠️ PARTIAL | Lint-loop mechanism (fallback chain, 3-attempt cap, dirName filtering) is present and structurally correct, but ambiguous fallback wording (gap #2) and the unrecoverable name-failure case (gap #1) both undermine "iterates until clean" as a reliable guarantee |
| BSKL-04 | 16-01-PLAN.md | Itself declares `template: procedure`, passes dogfood test | ✓ SATISFIED | Frontmatter confirmed; `node --test` 194/194 pass; `motto lint` reports OK |
| BSKL-05 | 16-01-PLAN.md | Content-quality self-review gate (anti-hollow) | ✓ SATISFIED | Step 7 present with 3 required + 3 structural objective checks, correctly placed after lint-loop/before receipt; code review found no defects in this step besides a minor IN-01 (unscoped "or equivalent" wording for base-schema skills — informational, not blocking) |
| BSKL-06 | 16-01-PLAN.md | `author-skill` retired atomically | ✓ SATISFIED | Single commit `b868ea7`; `skills/author-skill/` absent; dogfood test retargeted; suite green |

No orphaned requirements — all 6 BSKL-01..06 IDs declared in PLAN frontmatter match REQUIREMENTS.md's Phase 16 traceability table exactly.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `skills/build-skill/SKILL.md` | 49 | Incomplete name guard (WR-01, 16-REVIEW.md) | 🛑 Blocker | Realistic input names slip past the pre-write guard and hit an unrecoverable post-write lint failure — breaks the "any input → complete skill" promise |
| `skills/build-skill/SKILL.md` | 55-63 | Ambiguous lint-loop fallback semantics (WR-02, 16-REVIEW.md) | ⚠️ Warning | Risk of version-skewed lint verdict via unintended npx fallback on a real (not absent) lint failure |
| `skills/build-skill/SKILL.md` | 26 | Step 2 misdescribes bundled `skill-schema.md` staleness — no supersede statement for the §6 contradiction (WR-03, 16-REVIEW.md) | ⚠️ Warning | Agent consulting the bundled reference reads an authoritative-sounding but incorrect claim that `template`/`dependencies` are unvalidated |
| `skills/build-skill/SKILL.md` | 71 | `<success_criteria>` "(or equivalent)" undefined for base-schema (non-procedure) generated skills (IN-01, 16-REVIEW.md) | ℹ️ Info | Check 2 of the quality gate is unevaluable for roughly half the skills build-skill can produce |
| `skills/build-skill/SKILL.md` | 79 | Attempt-budget reset after quality-gate loop-back to lint is unspecified (IN-02, 16-REVIEW.md) | ℹ️ Info | Two agents could legitimately report different "attempts used" counts for identical runs |

**Process note:** All five findings above were produced by a formal code review (`16-REVIEW.md`, commit `1c6cd82`, 2026-07-03T12:39:39+02:00, status `issues_found`) that ran *after* both task commits landed. No commit touches `skills/build-skill/SKILL.md` after `17035e0` (12:30:12+02:00) — none of the five findings were remediated before this phase was submitted for verification. The 16-01-SUMMARY.md ("Deviations from Plan: None") predates the review by ~5 minutes and does not reference it.

### Human Verification Required

1. **Live gap-fill fidelity (BSKL-01)**
   **Test:** Hand build-skill a complete freeform spec, a partial spec missing several slots, and a conversation transcript.
   **Expected:** Zero questions for the complete case; exactly one batched message listing only missing slots for the partial case; no sequential interview in either case.
   **Why human:** Agent-behavior fidelity to prose instructions across varied real inputs is not provable by static analysis.

2. **Content-quality gate catches real hollow output (BSKL-05)**
   **Test:** Generate a skill from an input likely to produce a weak Role line or vacuous success criteria; confirm Step 7 catches and self-fixes it.
   **Expected:** Gate flags the weak content and self-fixes without asking, unless information is genuinely missing; re-lints after any edit.
   **Why human:** Whether the checklist is genuinely non-rubber-stampable in practice is a prose-quality judgment (SUMMARY.md itself flags this as `human_judgment: true`).

3. **Confirm the WR-01 fix (once applied) actually closes the unrecoverable-name-failure path**
   **Test:** After the guard/recovery gap is fixed, hand build-skill an input implying a name like `claude-something` or a >64-char name.
   **Expected:** Either the guard now rejects the name pre-write with a clear re-prompt, or Step 6 has an authorized recovery clause that lets the agent correct the name and complete the pipeline — never a stuck agent burning all 3 attempts on an unfixable error.
   **Why human:** This is the direct behavioral confirmation that the fix restores the "any input → complete skill" guarantee; grep can confirm new prose exists but not that an agent actually recovers correctly at runtime.

### Gaps Summary

Both structured gaps trace to the same root cause: **a formal code review (16-REVIEW.md) found 3 warnings + 2 info-level issues in `skills/build-skill/SKILL.md`'s process prose, and none were remediated before the phase was submitted for verification.** The most severe (WR-01) is a genuine blocker: the pre-write name guard in Step 5 checks only kebab-case shape, omitting the max-64-char and reserved-substring ("anthropic"/"claude") checks the real linter enforces. Given this tool's own domain — authoring skills *for Claude Code* — a name containing "claude" is a highly plausible, not contrived, user input. For that input class, the agent writes a directory that can never pass lint as specified, and Step 6 authorizes no recovery (no rename/delete-and-retry clause), so it burns all 3 lint attempts and leaves a broken directory behind. This directly contradicts the phase goal's core promise: "a user hands build-skill ANY input and receives a complete, lint-clean, conforming skill." The secondary gap (WR-02) compounds risk in the same lint-loop mechanism via ambiguous fallback wording. WR-03/IN-01/IN-02 are lower-severity prose-consistency issues from the same unremediated review, listed under Anti-Patterns for visibility but not blocking on their own.

Everything else in the phase is solid: the atomic swap (author-skill retirement + build-skill arrival + dogfood test retarget) landed correctly in one commit, the full suite is green (194/194), `motto lint`/`motto build` both succeed on the post-swap tree, DOC-06 is honored (no lint-string duplication), and the content-quality gate (BSKL-05) is well-formed and correctly placed.

---

_Verified: 2026-07-03T10:43:19Z_
_Verifier: Claude (gsd-verifier)_
