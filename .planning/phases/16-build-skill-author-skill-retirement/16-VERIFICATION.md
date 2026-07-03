---
phase: 16-build-skill-author-skill-retirement
verified: 2026-07-03T12:00:00Z
status: human_needed
score: 6/7 must-haves verified
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "GUARD then WRITE — Step 5 validates the proposed name before writing (was FAILED — guard 1 now rejects >64-char names and names containing \"anthropic\"/\"claude\", plus Step 6 gained an authorized name-cascade recovery clause as backstop)"
    - "LINT LOOP — exec-failure vs lint-failure fallback ambiguity (was PARTIAL — Step 6 now falls through only on command-not-found/exec failure; a run that executes and reports lint errors is explicitly treated as the resolved linter, never falling through to the stale npx registry version)"
  gaps_remaining: []
  regressions: []
behavior_unverified_items:
  - truth: "build-skill asks only genuinely-missing gap-fill questions, in one batch, for arbitrary freeform input (BSKL-01)"
    test: "Hand build-skill several freeform inputs (a complete spec, a partial spec missing 2-3 slots, a conversation transcript) and observe whether it asks zero questions for the complete case and exactly one batched message for the partial case"
    expected: "Zero questions when input is complete; one batched message listing only missing slots otherwise; no sequential interview"
    why_human: "Prompt-engineering fidelity — whether the prose reliably produces this exact agent behavior across varied real inputs cannot be proven by static grep/lint checks alone"
  - truth: "The content-quality gate (Step 7) reliably catches hollow Role lines / vacuous success criteria / workflow-summary descriptions on live-generated output, not just on build-skill's own file (BSKL-05)"
    test: "Generate a skill from an input that would naturally produce a weak Role line or a vacuous success-criteria list, and confirm Step 7 catches and self-fixes it before Step 8's receipt"
    expected: "Gate flags the weak content, agent self-fixes without asking (unless truly unrecoverable info is missing), re-lints, then reports"
    why_human: "Whether the checklist wording is genuinely objective/checkable in practice (not rubber-stampable) is a prose-quality judgment"
human_verification:
  - test: "Live gap-fill fidelity (BSKL-01) — hand build-skill a complete freeform spec, a partial spec missing several slots, and a conversation transcript"
    expected: "Zero questions for the complete case; exactly one batched message listing only missing slots for the partial case; no sequential interview in either case"
    why_human: "Agent-behavior fidelity to prose instructions across varied real inputs is not provable by static analysis"
  - test: "Content-quality gate catches real hollow output (BSKL-05) — generate a skill from an input likely to produce a weak Role line or vacuous success criteria; confirm Step 7 catches and self-fixes it"
    expected: "Gate flags the weak content and self-fixes without asking, unless information is genuinely missing; re-lints after any edit"
    why_human: "Whether the checklist is genuinely non-rubber-stampable in practice is a prose-quality judgment"
  - test: "Confirm the WR-01 recovery clause actually works end-to-end at runtime — hand build-skill an input implying a name like `claude-something-tools` or a >64-char name"
    expected: "The Step 5 guard rejects the name pre-write with a clear re-prompt (the common case now that the guard covers length + reserved substrings); OR, for the narrower residual case where a reserved word is embedded mid-token (e.g. `myclaude-tools`, IN-01 in 16-REVIEW.md), the write proceeds, lint rejects the name, and the agent follows Step 6's new delete-and-recreate recovery clause to correct it and complete the pipeline — never a stuck agent burning all 3 attempts unfixably"
    why_human: "This is the direct behavioral confirmation that the fix restores the \"any input → complete skill\" guarantee at runtime; grep/code-review can confirm the new prose exists and is internally consistent (16-REVIEW.md did this), but not that an executing agent actually follows the recovery path correctly"
---

# Phase 16: build-skill & author-skill Retirement Verification Report

**Phase Goal:** A user hands `build-skill` any input and receives a complete, lint-clean, conforming skill; `author-skill` is retired in the same atomic move.
**Verified:** 2026-07-03T12:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (16-02-PLAN.md, commits `4cbb97d`, `a5609aa`)

## Re-Verification Summary

The prior VERIFICATION.md (2026-07-03T10:43:19Z) found `status: gaps_found`, 5/7 must-haves, with two structured gaps:

- **Gap #1 (WR-01, blocker):** Step 5's name guard checked only kebab-case shape, omitting the max-64-char and reserved-substring ("anthropic"/"claude") checks the real linter (`src/schema.js` NAME cascade) enforces. A realistic input (any name containing "claude", highly plausible for a Claude Code skill-authoring tool) would pass the guard, get written to disk, then fail lint with no authorized recovery — Step 6 explicitly forbade editing/deleting outside `skills/<name>/`.
- **Gap #2 (WR-02, warning):** Step 6's fallback-chain wording didn't distinguish "command not found" from "command ran and reported real lint errors," risking a fall-through to the stale published `npx @jeremiewerner/motto` registry version on a genuine local lint failure.

Gap-closure plan 16-02 (commits `4cbb97d`, `a5609aa`) edited `skills/build-skill/SKILL.md` to close both, plus three carried code-review anti-patterns (WR-03, IN-01, IN-02) from the same unremediated review. This re-verification checked the closures directly against the live file and the real linter cascade in `src/schema.js` — not against the review's or SUMMARY's claims.

**Verdict: both structured gaps are genuinely closed.** No regressions found. Two items remain legitimately human (carried forward unchanged, both were already scoped as human-only in the prior report), plus one item confirming the fix's live behavior at runtime.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `skills/build-skill/SKILL.md` exists, declares `template: procedure` + `audience: public` + `shared_references: [skill-schema]`, and lints clean live | ✓ VERIFIED | File present at lines 1-12; frontmatter matches exactly; live run `node bin/motto.js lint` → `✓ 2 skills OK`, exit 0 |
| 2 | build-skill's body instructs ingest→gap-fill→auto-detect→**guard**→write→lint-loop→quality-gate→receipt, with the guard and lint-loop actually mirroring the real validator/linter | ✓ VERIFIED (was FAILED — now closed) | Step 5 guard 1 (line 49) now reads "it must be kebab-case, starting with a lowercase letter, at most 64 characters long, and must not contain the word 'anthropic' or the word 'claude'" — the length and reserved-substring checks are present, matching `src/schema.js`'s NAME cascade (`name.length > 64`, `RESERVED.some(r => name.includes(r))`, `RESERVED = ["anthropic","claude"]`, confirmed live in `src/schema.js`). Step 6 (lines 63-65) adds an explicit delete-and-recreate recovery clause for a name-cascade lint failure, framed as "the one permitted whole-directory operation, an explicit exception to the 'never edit files outside `skills/<name>/`' rule." Step 6's fallback wording (line 57) now reads "falling through only when the command itself cannot be found or executed — a run that executes and reports lint errors IS the resolved linter; use its output and do not fall through" — `grep -F 'until one resolves'` returns 0 matches |
| 3 | build-skill's body contains NO verbatim lint error-message strings or regexes (DOC-06) | ✓ VERIFIED | `grep -F 'letter-start kebab-case'` → 0; `grep -F 'Common Lint Errors'` → 0; broader scan of schema.js error strings (`reserved substrings`, `must not exceed 64 characters`, `must equal its folder name`, the canonical regex) also 0 matches |
| 4 | `skills/author-skill/` no longer exists on disk | ✓ VERIFIED | `test -d skills/author-skill` → absent |
| 5 | `test/dogfood.test.js` asserts build-skill dist artifacts, skill count stays 2, full suite passes green | ✓ VERIFIED | Assertions target `dist/public/build-skill/SKILL.md` and `.../references/skill-schema.md`; live `node --test` → 194/194 pass, 0 fail |
| 6 | `node bin/motto.js lint && node bin/motto.js build` both succeed on the post-swap tree | ✓ VERIFIED | Live run: lint → `✓ 2 skills OK` (exit 0); build → `✓ built ... — 2 skills, 2 plugin(s)` (exit 0) |
| 7 | build-skill asks only gap-filling questions before generating, for arbitrary input (BSKL-01) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Step 1 (ingest-as-data) and Step 3 (one-batch gap-fill) prose present and well-formed, unchanged from prior verification; actual agent-behavior fidelity across varied real inputs cannot be proven statically — routed to human verification |

**Score:** 6/7 truths verified (1 present, behavior-unverified — up from 5/7 in the prior report: 1 failed and 1 partial truth are now both VERIFIED)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `skills/build-skill/SKILL.md` | Public `template: procedure` skill, H1 title, behavioral `**Role:**`, matched `<process>`/`<success_criteria>` pairs, full NAME-cascade guard, recovery-capable lint loop | ✓ VERIFIED (exists, substantive, wired) | 100 lines; frontmatter and body structure all schema-valid; lints clean live; guard/recovery/fallback edits present exactly as gap-closure plan specified |
| `test/dogfood.test.js` | Retargeted dist assertions, count===2 unchanged | ✓ VERIFIED | Unchanged from prior verification — no regression |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Step 5 name guard | real linter's NAME cascade (`src/schema.js`) | pre-write validation intended to prevent unfixable post-write lint failures | ✓ WIRED (was NOT_WIRED/partial) | Guard now covers kebab-case, lowercase-start, ≤64 chars, and "anthropic"/"claude" — the checks that gate the realistic pre-write failure class. (One residual precision gap remains — see Anti-Patterns IN-01 — but Step 6's new recovery clause bounds it, so it no longer breaks the pipeline) |
| Step 6 lint-loop fallback | exec-failure vs lint-failure distinction | prevents version-skewed verdict from stale published npx registry version | ✓ WIRED | `grep -F 'until one resolves'` → 0 matches; new wording is unambiguous and matches the gap-closure plan's required phrasing |
| Step 6 name-cascade recovery | Step 5 (return-with-corrected-name) | backstop for any residual guard gap or non-guard-covered name rejection | ✓ WIRED | Explicit "delete `skills/<name>/` and return to Step 5 with a corrected name" clause present at lines 63-65, scoped as the sole exception to the never-edit-outside rule |
| dogfood test `count===2` | atomic swap | build-skill added + author-skill deleted net-zero in the SAME commit | ✓ WIRED (unchanged) | Re-verified live — no regression |
| `template: procedure` frontmatter | mandatory `<process>`/`<success_criteria>` sections | Phase 14 TMPL enforcement | ✓ WIRED (unchanged) | Both tag pairs present and matched |
| `shared_references: [skill-schema]` | `dist/public/build-skill/references/skill-schema.md` bundling | Phase 12/15 bundling mechanism | ✓ WIRED (unchanged) | File present post-build |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BSKL-01 | 16-01-PLAN.md | User can hand build-skill any input; asks gap-filling questions only | ⚠️ NEEDS HUMAN (structurally present, unchanged) | Step 1/Step 3 prose present and correct in shape; live behavioral fidelity unverified |
| BSKL-02 | 16-01/16-02-PLAN.md | Generates a complete conforming `skills/<name>/` in one pass | ✓ SATISFIED (was BLOCKED — now closed) | Step 5 guard now covers the realistic name-cascade class; Step 6 recovery clause is the backstop for the narrow residual gap (IN-01) |
| BSKL-03 | 16-01/16-02-PLAN.md | Self-verifies via `motto lint`, iterates until clean | ✓ SATISFIED (was PARTIAL — now closed) | Lint-loop fallback semantics unambiguous; name-cascade recovery makes "iterates until clean" a reliable guarantee, including for the recovery path itself |
| BSKL-04 | 16-01-PLAN.md | Itself declares `template: procedure`, passes dogfood test | ✓ SATISFIED (unchanged) | Frontmatter confirmed; `node --test` 194/194 pass |
| BSKL-05 | 16-01/16-02-PLAN.md | Content-quality self-review gate (anti-hollow) | ✓ SATISFIED (structural; live fidelity remains human) | Step 7 present with 3 required + 3 structural checks; IN-01 (base-schema scoping) and IN-02 (attempt-budget) prose fixes both verified in file; residual "no terminal instruction after exhausted rewrite budget" is INFO-level per 16-REVIEW.md, inferable from Step 8, not blocking |
| BSKL-06 | 16-01-PLAN.md | `author-skill` retired atomically | ✓ SATISFIED (unchanged) | Single commit `b868ea7`; `skills/author-skill/` absent |

No orphaned requirements — all 6 BSKL-01..06 IDs declared in PLAN frontmatter (16-01 declares all 6; 16-02 declares the subset it remediates: BSKL-02, BSKL-03, BSKL-05) match REQUIREMENTS.md's Phase 16 traceability table exactly (all marked `[x]` Complete).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `skills/build-skill/SKILL.md` | 49 | IN-01 (residual, per 16-REVIEW.md): guard says "the word 'anthropic'/'claude'" where the real validator is substring-based (`name.includes(r)`) — a name like `myclaude-tools` (reserved word embedded mid-token, not hyphen-delimited) could pass a literal-minded reading of the guard | ℹ️ Info (downgraded from Warning by 16-REVIEW.md because Step 6's new recovery clause bounds the failure to a wasted write/lint/delete cycle, not a dead end) | Independently re-confirmed: `src/schema.js:226` is `RESERVED.some(r => name.includes(r))`, substring not word-boundary. Not a blocker because the pipeline still terminates in a complete, lint-clean skill via the Step 6 recovery path — routed to human verification item #3 to confirm this recovery actually fires correctly at runtime |
| `skills/build-skill/SKILL.md` | 81 | IN-02 (residual, per 16-REVIEW.md): no explicit terminal instruction if a quality-gate check still fails after the one permitted rewrite cycle — behavior is inferable from Step 8's receipt language but not explicitly instructed | ℹ️ Info | Low risk; Step 8 already reports "which quality-gate checks passed," implying failures are reported rather than looped on, but an over-eager agent could misread the gap |

No 🛑 Blocker or ⚠️ Warning anti-patterns remain. Both prior blocker/warning-level findings (WR-01, WR-02) are resolved; both residual items are INFO-level per the fresh code review (16-REVIEW.md, commit `7e8343e`, 0 critical / 0 warning / 2 info) and independently re-confirmed against `src/schema.js` in this re-verification.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite passes green | `node --test 2>&1 \| tail -15` | 194 pass / 0 fail / 0 cancelled | ✓ PASS |
| Linter reports clean on live tree | `node bin/motto.js lint` | `✓ 2 skills OK`, exit 0 | ✓ PASS |
| Build succeeds on post-swap tree | `node bin/motto.js build` | `✓ built ... — 2 skills, 2 plugin(s)`, exit 0 | ✓ PASS |
| No verbatim lint strings / stale gap phrasing remain | `grep -F` for 5 target strings (`letter-start kebab-case`, `Common Lint Errors`, `until one resolves`, `(or equivalent)`, the old Step 2 "apply this delta yourself" sentence) | All 5 return 0 matches | ✓ PASS |
| Both gap-closure commits exist and touch the expected file | `git show --stat 4cbb97d`, `git show --stat a5609aa` | Both commits present, both modify `skills/build-skill/SKILL.md` | ✓ PASS |

### Human Verification Required

1. **Live gap-fill fidelity (BSKL-01)** — carried forward unchanged from the prior report.
   **Test:** Hand build-skill a complete freeform spec, a partial spec missing several slots, and a conversation transcript.
   **Expected:** Zero questions for the complete case; exactly one batched message listing only missing slots for the partial case; no sequential interview in either case.
   **Why human:** Agent-behavior fidelity to prose instructions across varied real inputs is not provable by static analysis.

2. **Content-quality gate catches real hollow output (BSKL-05)** — carried forward unchanged from the prior report.
   **Test:** Generate a skill from an input likely to produce a weak Role line or vacuous success criteria; confirm Step 7 catches and self-fixes it.
   **Expected:** Gate flags the weak content and self-fixes without asking, unless information is genuinely missing; re-lints after any edit.
   **Why human:** Whether the checklist is genuinely non-rubber-stampable in practice is a prose-quality judgment.

3. **Confirm the WR-01 recovery clause works end-to-end at runtime** — replaces the prior report's "confirm the fix once applied" (the fix is now applied; this item confirms its runtime behavior).
   **Test:** Hand build-skill an input implying a name like `claude-something-tools` (caught pre-write by the now-fixed guard) or a name like `myclaude-tools` (the narrower IN-01 residual case that could still slip past the guard's literal wording).
   **Expected:** The common case is now rejected pre-write with a clear re-prompt. For the residual case, the write proceeds, lint rejects the name, and the agent follows Step 6's delete-and-recreate clause to correct it and complete the pipeline — never a stuck agent burning all 3 attempts unfixably.
   **Why human:** This is the direct behavioral confirmation that the fix restores the "any input → complete skill" guarantee at runtime; static analysis (this verification and 16-REVIEW.md) can confirm the new prose exists and is internally consistent, but not that an executing agent actually follows the recovery path correctly under load.

### Gaps Summary

No structured gaps remain. Both prior gaps are closed and independently re-confirmed against the live file and the real `src/schema.js` validator (not just against 16-REVIEW.md's or the SUMMARY's claims):

- **WR-01 (blocker) → closed.** Step 5 guard 1 now enumerates all three name-cascade rejection conditions (kebab/lowercase-start, ≤64 chars, no "anthropic"/"claude"), and Step 6 gained an authorized delete-and-recreate recovery clause as a backstop. The "any input → complete, lint-clean skill" promise now holds for the realistic `claude-*`/`anthropic-*`/>64-char input class, and even for the narrower residual case (IN-01) the pipeline terminates successfully via recovery rather than dead-ending.
- **WR-02 (warning) → closed.** Step 6's fallback chain now falls through only on command-not-found/exec failure; a run that executes and reports lint errors is explicitly treated as the resolved linter, eliminating the version-skewed-verdict risk from the stale published npx registry version.
- **WR-03, IN-01, IN-02 (carried anti-patterns) → WR-03 fully closed (Step 2 now supersedes the stale bundled reference); IN-01/IN-02 reduced to INFO-level residuals per the fresh code review, independently re-confirmed here, neither blocking the phase goal.**

Status is `human_needed`, not `passed`, because two previously-scoped human-verification items (BSKL-01 gap-fill fidelity, BSKL-05 quality-gate fidelity) remain legitimately unverifiable by static analysis — they were never claimed as resolved by this gap-closure plan — plus one item confirming the WR-01 fix's recovery path actually fires correctly at runtime. All three are appropriately routed to human/live verification rather than faked as passed.

---

_Verified: 2026-07-03T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
