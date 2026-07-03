---
phase: 16-build-skill-author-skill-retirement
reviewed: 2026-07-03T11:17:14Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - skills/build-skill/SKILL.md
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 16: Code Review Report (re-review after 16-02 gap closure)

**Reviewed:** 2026-07-03T11:17:14Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Re-reviewed `skills/build-skill/SKILL.md` after gap-closure plan 16-02 (commits `4cbb97d`, `a5609aa`) remediated the five findings from the prior review at this path. Every prior finding was verified against the current file text AND against the ground truth it referenced (`src/schema.js` validation cascade, `motto.yaml` as project-root marker, the bundled `shared/references/skill-schema.md`). The file lints clean via the repo's own linter (`✓ 2 skills OK`).

**Prior-finding resolution (all five verified resolved):**

| Prior | Claimed fix | Verified in current file |
|-------|-------------|--------------------------|
| WR-01 | Extend name guard + add lint-name recovery path | RESOLVED. Line 49 now includes the 64-char limit and reserved words; line 65 adds the delete-and-recreate recovery clause with explicit scoping ("the one permitted whole-directory operation"). One residual imprecision remains — see IN-01 below. |
| WR-02 | Separate "binary not found" from "lint reported errors" | RESOLVED. Line 57: "falling through only when the command itself cannot be found or executed — a run that executes and reports lint errors IS the resolved linter; use its output and do not fall through to the next one." Unambiguous; the `npx` version-skew hazard is closed. |
| WR-03 | Supersede statement covering skill-schema.md §6 | RESOLVED. Line 26 now states the delta "supersedes the bundled reference wherever they disagree, including its claim that `template` and `dependencies` are 'not validated' (they are, as of the current linter)." Verified factually accurate: `src/schema.js` validates both (`template` cascade ~line 159/277; `dependencies` per-entry cascade ~line 384). |
| IN-01 | Scope check 2 to `template: procedure` | RESOLVED. Line 73: "When the skill declares `template: procedure`, `<success_criteria>` holds checkable conditions, not restated step or heading titles." The undefined "(or equivalent)" is gone; the check is now evaluable for base-schema skills (vacuously passes). |
| IN-02 | Specify attempt budget after Step 7 → Step 6 loop-back | RESOLVED. Line 81: "using a fresh 3-attempt budget, with at most one quality-gate rewrite cycle total." Both the reset semantics and the total bound are stated. |

**Fresh-prose verification (checked, not assumed):**

- DOC-06 honored: exact-string grep for `letter-start kebab-case`, the canonical regex `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, `reserved substrings`, `must not exceed 64 characters`, `must equal its folder name`, `unsafe basename`, `name is required`, and `name must be a string` against the file returns zero matches. All name-rule prose is behavioral paraphrase.
- Guard 2's project marker is correct: `motto.yaml` is the real root config (`src/build.js:98`, `src/config.js`, created by `src/init.js:146`).
- `allowed-tools` remains honest: the three declared `Bash(... lint*)` patterns exactly cover the three Step 6 invocations, in the same order.
- No new step-to-step contradictions introduced by the 16-02 edits: the Step 6 recovery clause explicitly re-affirms the never-edit-outside rule ("which otherwise still holds"); `<success_criteria>` "Nothing outside `skills/<name>/` was modified" stays consistent with it (the permitted delete operates ON `skills/<name>/`, not outside it); Step 5 guard 3's refuse-if-exists does not conflict with the recovery path (the directory is deleted before returning to Step 5).
- The Step 6 → Step 5 name-recovery loop is bounded in practice: with guard 1 now covering pattern, length, and reserved words, the only linter name rejection reachable past the guard is the word/substring gap documented in IN-01, and `name ≠ folder` is unreachable (the agent derives the folder from the name).

Two residual Info-level items remain, both instruction-precision gaps with recoverable failure modes. No blockers, no warnings.

## Narrative Findings (AI reviewer)

### Info

#### IN-01: Guard 1 says "word" where the validator checks substring — a class of names still slips past the pre-write guard

**File:** `skills/build-skill/SKILL.md:49`
**Severity:** INFO (WARNING-class gap downgraded because the Step 6 recovery path now bounds it)
**Issue:** Guard 1 reads "must not contain the word 'anthropic' or the word 'claude'". The real validator is substring-based: `RESERVED.some((r) => name.includes(r))` (`src/schema.js:226`). A name like `myclaude-tools` or `anthropical-helper` contains no hyphen-delimited *word* "claude"/"anthropic", so a literal-minded agent passes guard 1, writes `skills/myclaude-tools/`, and only then gets the name rejected by lint — triggering the Step 6 delete-and-recreate recovery, which the guard's own rationale ("the name becomes a filesystem path segment") was written to make unnecessary. The prior review's WR-01 fix suggestion itself used the imprecise "words" phrasing; the implementation faithfully reproduced the imprecision. Because the line-65 recovery clause now handles this deterministically, the failure is a wasted write/lint/delete cycle, not a dead end — hence Info, not Warning.
**Fix:** One word change, still a paraphrase (no DOC-06 risk):

```markdown
... and must not contain "anthropic" or "claude" anywhere in the name,
even inside a longer word.
```

#### IN-02: Step 7 has no terminal instruction when a quality-gate check still fails after the one permitted rewrite cycle

**File:** `skills/build-skill/SKILL.md:81` (interacts with line 85)
**Severity:** INFO
**Issue:** The 16-02 fix correctly bounds the loop ("at most one quality-gate rewrite cycle total") but does not say what to do when the budget is exhausted and a check still fails. Step 6 sets the precedent with an explicit terminal ("stop and hand back the remaining errors plus what you tried"); Step 7 lacks the equivalent. The behavior is *inferable* — Step 8's receipt reports "which quality-gate checks passed", implying the agent proceeds to Step 8 and reports the failure — but it is inferred, not instructed. An over-eager agent could read the missing terminal as license to ask the user for another rewrite round, or stall.
**Fix:** One clause at the end of line 81, mirroring Step 6's pattern:

```markdown
If a check still fails after that one rewrite cycle, stop rewriting and
report the failing check in the Step 8 receipt.
```

---

_Reviewed: 2026-07-03T11:17:14Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
