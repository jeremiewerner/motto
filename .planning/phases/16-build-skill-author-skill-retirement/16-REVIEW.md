---
phase: 16-build-skill-author-skill-retirement
reviewed: 2026-07-03T10:38:30Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - skills/build-skill/SKILL.md
  - test/dogfood.test.js
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-07-03T10:38:30Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the Phase 16 deliverables: `skills/build-skill/SKILL.md` (new agent skill, `template: procedure`) and `test/dogfood.test.js` (retargeted from author-skill to build-skill). Verified against `src/schema.js` validation rules, the bundled `shared/references/skill-schema.md`, `skills/release/SKILL.md` (private-bucket counterpart), phase artifacts (16-01-PLAN.md, 16-RESEARCH.md, 16-CONTEXT.md), and a live run of the full suite (194 pass / 0 fail).

**What checks out (verified, not assumed):**

- Frontmatter is fully valid against `src/schema.js`: kebab name matches folder, no reserved substrings, description is a 117-char WHEN-only trigger clause (BSKL-05) with no XML-tag shapes, `audience: public`, `template: procedure` with both `<process>`/`<success_criteria>` pairs line-anchored outside fences, `shared_references: [skill-schema]` resolves to an existing safe basename, `allowed-tools` is an array of non-empty strings.
- DOC-06 honored: `grep -F 'letter-start kebab-case'` and `grep -F 'Common Lint Errors'` both return zero matches; the name-rule prose is a behavioral paraphrase, not a lint-string copy.
- `allowed-tools` is honest: the three declared `Bash(... lint*)` patterns exactly cover the three Step 6 invocations. The "pre-approval-only, not a restriction" semantics concern (Write/Read not listed) is resolved by a dated official-doc quote in 16-RESEARCH.md (code.claude.com/docs/en/skills, verified 2026-07-03) — not re-flagged here.
- Prompt-injection guidance present and well-placed: Step 1 explicitly quarantines freeform input as data, including command-shaped text.
- `test/dogfood.test.js`: no stale `author-skill` references anywhere in `test/` or `skills/`; count assertions (2 skills, 2 buckets) match the real tree (`build-skill` public + `release` private); the `dist/public/build-skill/` and bundled `references/skill-schema.md` assertions match build-skill's actual frontmatter; the TMPL-01/03 verbatim-tag assertions match `release/SKILL.md`'s actual tag placement; `after()` cleanup is guarded for a throwing `before()`; all imports are used; `REPO_ROOT` is `import.meta.url`-anchored (no cwd dependence, per the Phase 15 lesson).

The three warnings below are all internal-consistency defects in `build-skill/SKILL.md`'s process prose — reachable failure paths for the agent executing the skill, not schema violations. No blocker-level defects found.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: Step 5 name guard is incomplete vs the real validator, and the resulting failure has no authorized recovery path

**File:** `skills/build-skill/SKILL.md:49`
**Issue:** Guard 1 validates only "kebab-case, starting with a lowercase letter" before the name becomes a directory. The real validator (`src/schema.js` NAME cascade) additionally rejects names over 64 characters and names containing the reserved substrings `anthropic`/`claude`. A name like `claude-pr-helper` passes guard 1, `skills/claude-pr-helper/` gets created in Step 5, and lint then fails in Step 6 with a name error whose only fix is renaming the directory (name must equal folder name). But Step 6 explicitly instructs "never edit files outside `skills/<name>/`" and nowhere authorizes deleting or renaming the just-created directory — so the agent is boxed into an unfixable lint error and burns all 3 attempts. The guard's own rationale ("the name becomes a filesystem path segment") shows it was meant to catch name errors *pre-write*; two reachable name-error classes slip past it.
**Fix:** Extend guard 1 behaviorally (no lint-string duplication needed):
```markdown
1. Validate the proposed `name`: it must be kebab-case, starting with a
   lowercase letter, at most 64 characters, and must not contain the words
   "anthropic" or "claude". On failure, stop and re-prompt for a valid name...
```
Alternatively (or additionally), give Step 6 an explicit recovery clause: "If lint rejects the `name` itself, delete `skills/<name>/`, return to Step 5 with a corrected name — this is the one permitted operation on the directory as a whole."

#### WR-02: Step 6 fallback chain — "until one resolves" does not distinguish "binary not found" from "lint reported errors"

**File:** `skills/build-skill/SKILL.md:57-63`
**Issue:** A linter's *expected* outcome on a dirty skill is a nonzero exit with findings — which is a successful invocation, not a failed one. "Trying each of the following in order until one resolves" gives the agent no basis to stop the fallback cascade when `node_modules/.bin/motto lint` runs fine but exits nonzero with errors. An agent that treats the nonzero exit as "did not resolve" falls through to `npx @jeremiewerner/motto lint`, which fetches the *published registry version* of Motto — a potentially older schema than the local one — producing a version-skewed lint verdict (spurious errors, or worse, a false clean on fields the local linter validates). This is exactly the tests-green-but-broken class the project's never-throw history warns about, transplanted into prompt logic.
**Fix:** Reword to separate execution failure from lint failure:
```markdown
Run the real linter. Try each of the following in order, falling through
only when the command itself cannot be found or executed — a run that
executes and reports lint errors IS the resolved linter; use its output
and do not fall through:
```

#### WR-03: Step 2 misdescribes the bundled reference's staleness — skill-schema.md §6 affirmatively contradicts the delta, and no supersede statement covers it

**File:** `skills/build-skill/SKILL.md:26` (interacts with `shared/references/skill-schema.md:126-134`)
**Issue:** Step 2 frames `template`/`outputs`/`dependencies`/`allowed-tools` as "the newer fields it does not yet cover." That is factually wrong about the bundled reference: skill-schema.md §6 *does* cover `template` and `dependencies`, and states "These fields are accepted and passed through verbatim. They are NOT validated in Motto v0.0.2" — false since Phases 14/15. An agent consulting the bundled ref (as Step 2 instructs) reads an authoritative-sounding claim that `template: procedure` carries no section requirements, directly contradicting Step 2's delta. The skill already knows how to handle exactly this situation — Step 7 check 3 explicitly supersedes the ref's softer description guidance ("Apply this rule even though the bundled skill-schema reference still teaches...") — but no equivalent supersede sentence protects the far more consequential §6 conflict. The ref rewrite is correctly deferred to Phase 17; the missing supersede sentence in *this phase's shipped prose* is not deferred work.
**Fix:** In Step 2, replace "For the newer fields it does not yet cover, apply this delta yourself:" with wording that mirrors the Step 7 pattern:
```markdown
For the newer fields, apply this delta yourself — it supersedes the bundled
reference wherever they disagree, including its claim that `template` and
`dependencies` are "not validated" (they are, as of the current linter):
```

### Info

#### IN-01: Step 7 check 2 — "(or equivalent)" is undefined for base-schema skills

**File:** `skills/build-skill/SKILL.md:71`
**Issue:** Check 2 audits "`<success_criteria>` (or equivalent)". For a base-schema skill (Step 4 "no" branch) there is no required `<success_criteria>` section and the skill never defines what counts as "equivalent" — the check is unevaluable for roughly half the skills build-skill produces.
**Fix:** Scope it: "2. When the skill declares `template: procedure`, `<success_criteria>` holds checkable conditions, not restated step or heading titles." (or define the equivalent explicitly).

#### IN-02: Attempt budget after the Step 7 → Step 6 loop-back is unspecified

**File:** `skills/build-skill/SKILL.md:79` (interacts with line 63)
**Issue:** Step 7 says "re-run Step 6's lint loop" after a quality-gate edit, but never states whether the 3-attempt budget resets or continues. Combined with Step 8's receipt reporting "attempts used", two agents can legitimately report different numbers for identical runs, and a pathological edit/lint ping-pong has no total bound.
**Fix:** One clause suffices, e.g. "re-run Step 6's lint loop (a fresh 3-attempt budget; at most one quality-gate rewrite cycle total)."

---

_Reviewed: 2026-07-03T10:38:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
