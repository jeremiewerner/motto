---
phase: quick-260703-nya
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/schema.js
  - .planning/phases/18-migrate-base-spine-role-to-role-section-tag/18-REVIEW.md
autonomous: true
requirements: [IN-02]
must_haves:
  truths:
    - "hasClosedSection and hasNonEmptyClosedSection compute their unfenced-line set from ONE shared code path, so fence semantics cannot diverge (D-08 integrity preserved)."
    - "Both exported functions keep identical signatures and identical observable behavior — the full test suite stays green with zero error-string changes."
    - "Never-throw guarantee (D-01) preserved: the typeof guards stay at the exported boundaries."
  artifacts:
    - "src/schema.js containing a single shared fence-tracking helper consumed by both validators."
    - "18-REVIEW.md remediation table with IN-02 marked fixed and a commit ref."
  key_links:
    - "The shared helper returns the exact same unfenced-line array that both regex-matching tails currently rebuild independently."
---

<objective>
Close code-review finding IN-02 from phase 18: the 17-line fence-tracking loop is copied byte-for-byte into both `hasClosedSection` (src/schema.js:82-98) and `hasNonEmptyClosedSection` (src/schema.js:146-159). Extract it into one shared internal helper both functions consume, so a future fence-semantics fix cannot desynchronize the missing-vs-empty verdicts that the D-08 "exactly one error" invariant depends on.

Purpose: eliminate the divergence risk the reviewer flagged; the duplication was a documented D-06 decision deferred to "when next touching this file" — that time is now.
Output: refactored src/schema.js (single fence loop), updated 18-REVIEW.md remediation table.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@src/schema.js
@.planning/phases/18-migrate-base-spine-role-to-role-section-tag/18-REVIEW.md

Constraints (from ./.claude/CLAUDE.md and the IN-02 finding):
- Node >= 20, plain ESM, no new dependencies, `node:test` only.
- Never-throw invariant (D-01) is a boundary property: the two exported functions keep their `typeof body === "string" ? body : ""` guards. The new helper is internal (not exported) and may assume a string argument because both callers coerce first.
- Pure refactor: no new features, no new checks, no error-string changes (doc-sync must stay unaffected).
- Both exported functions keep identical signatures and identical observable behavior.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract shared collectUnfencedLines helper and rewire both validators</name>
  <files>src/schema.js</files>
  <action>
Add one internal (non-exported) helper `collectUnfencedLines(bodyStr)` that encapsulates the fence-tracking loop currently duplicated in both functions. Place it above `hasClosedSection` with a short JSDoc noting: it assumes a string argument (callers coerce at the exported boundary per D-01), it tracks the currently-open fence's character and length (3+ backticks or 3+ tildes, up to 3 leading spaces — CommonMark fence semantics), a fence opens on any marker line when none is open and closes only on a later marker line with the SAME character and length >= the opener's, and it returns the array of unfenced, non-marker lines. Move the `fenceRe` regex and the loop body into this helper verbatim so behavior is byte-identical.

In `hasClosedSection`: keep the `typeof body === "string" ? body : ""` guard (WR-02 fix — do not weaken it), then replace the inline `lines`/`fenceRe`/`unfencedLines`/`fence` loop with `const unfencedLines = collectUnfencedLines(bodyStr);`. The `text`/`openRe`/`closeRe`/index-ordering tail stays exactly as is.

In `hasNonEmptyClosedSection`: keep the `typeof` guard and the `hasClosedSection` delegation, then replace its own inline fence loop with `const unfencedLines = collectUnfencedLines(bodyStr);`. The `openRe`/`closeRe`/`findIndex`/`openRemainder`/`between`/non-whitespace tail (including the A2 open-remainder folding from WR-01) stays exactly as is.

Update the docblock of `hasNonEmptyClosedSection` where it says "reuses the exact same fence-aware unfenced-line collection strategy as `hasClosedSection` (same fence-tracking loop)" to note that both now share the single `collectUnfencedLines` helper (the divergence risk IN-02 flagged is now structurally impossible). Do NOT change any error string produced by validateSkill.
  </action>
  <verify>
    <automated>node --test test/schema.test.js 2>&1 | grep -E '# (pass|fail)'</automated>
  </verify>
  <done>`collectUnfencedLines` exists once as a non-exported helper; both `hasClosedSection` and `hasNonEmptyClosedSection` call it instead of carrying their own fence loop; only ONE `fenceRe` literal remains in src/schema.js; `node --test` reports the full suite green (211 pass, 0 fail) with no error-string changes.</done>
</task>

<task type="auto">
  <name>Task 2: Mark IN-02 fixed in the phase 18 remediation table</name>
  <files>.planning/phases/18-migrate-base-spine-role-to-role-section-tag/18-REVIEW.md</files>
  <action>
Update the IN-02 row in the Remediation table (currently `| IN-02 | deferred — ... | — |`) to status `fixed` with a short note that a shared `collectUnfencedLines` helper now backs both validators so the D-08 missing/empty verdicts are computed from one unfenced-line set, and fill in the commit ref (use the actual commit SHA created for Task 1). Leave every other row unchanged. Do not touch the findings body sections above the Remediation header.
  </action>
  <verify>
    <automated>grep -E '^\| IN-02 \| fixed' .planning/phases/18-migrate-base-spine-role-to-role-section-tag/18-REVIEW.md</automated>
  </verify>
  <done>The IN-02 row reads `fixed` with a commit ref; all other remediation rows are untouched.</done>
</task>

</tasks>

<verification>
- `node --test` reports 211 tests pass, 0 fail (identical to pre-refactor count).
- `git diff src/schema.js` shows the fence loop consolidated into one helper — no second copy of `fenceRe` or the fence-state loop remains.
- No error-string changed: `node --test test/doc-sync.test.js` stays green (doc-sync unaffected).
- Dogfood sanity: `node bin/motto.js lint` (or the repo's lint entry) still reports skills OK.
</verification>

<success_criteria>
- Exactly one fence-tracking loop in src/schema.js, shared by both exported validators.
- Both exported functions keep identical signatures, never-throw typeof guards, and observable behavior.
- Full suite green; zero error-string / doc-sync changes.
- 18-REVIEW.md IN-02 marked fixed with commit ref.
</success_criteria>

<output>
Create `.planning/quick/260703-nya-close-in-02-extract-shared-fence-trackin/260703-nya-SUMMARY.md` when done.
</output>
