---
phase: 13-address-tech-debt-plugins-public-reserved-word-enforcement-i
reviewed: 2026-07-02T13:48:21Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - README.md
  - src/schema.js
  - src/init.js
  - test/init.test.js
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-07-02T13:48:21Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the four files changed across phase 13's tech-debt commits (DEBT-01..DEBT-04: 3ce5e91, ce508f0, 1fd74a1, dd8acbc) plus whole-file regression scan. The phase changes themselves are correct — every claim was verified against code or empirically, not taken on faith:

- **README.md (DEBT-01, DEBT-04):** The corrected `plugins.public` table row ("no reserved-word restriction, unlike skill `name`") matches reality — `src/config.js` validates plugin names against `NAME_KEBAB` only and never touches `RESERVED`. The `skills/release/SKILL.md` file-path reference resolves; the skill's frontmatter is `audience: private`, so it is excluded from the public plugin and dropping the `/motto:release` slash-command reference is the correct fix, not just a cosmetic one. Adjacent claims re-checked: the five scaffold paths listed at line 89 match `writeScaffold` exactly; the `npm version` claim at line 176 matches package.json's `version` script (bumps motto.yaml + `git add`); the npm-source marketplace claim at line 240 matches the repo's own `.claude-plugin/marketplace.json`.
- **src/schema.js (DEBT-01):** Doc-only change. The new RESERVED scope comment ("SKILL.md `name` ONLY... Do NOT reuse for plugins") is accurate — grep confirms no RESERVED usage in `src/config.js`, `src/build.js`, or `src/init.js`. Runtime behavior unchanged.
- **src/init.js (DEBT-02):** The `stdio: ['ignore', 'pipe', 'ignore']` addition was verified empirically: stdout is still captured and returned as a utf8 string (`'pipe'` at index 1), git failure (non-zero exit) still throws into the existing `catch` — the never-throw/`'Your Name'` silent-fallback contract holds — and stderr leakage is zero bytes. stdin `'ignore'` also prevents git from ever blocking on input. No command-injection surface (`execFileSync` with array args, no shell).
- **test/init.test.js (DEBT-03):** The strengthened adversarial suite is sound. `tempDir` is nested as `scratchDir/target`, and the assertion checks both `readdir(scratchDir) === ['target']` (catches a `../evil` escape landing at `scratchDir/evil`) and `readdir(tempDir) === []`. All 33 tests pass under `node --test`.

Two findings surfaced from the whole-file regression scan, neither introduced by this phase.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Non-string `description` silently passes validation in validateSkill

**File:** `src/schema.js:111-131`
**Issue:** Pre-existing gap (not introduced by this phase, but in a reviewed file). The `name` cascade has an explicit non-string guard (line 87, REVIEW-01), but `description` does not. A YAML frontmatter of `description: true` or `description: 123` parses to a truthy non-string, so:
- `data.description.length > 1024` evaluates `undefined > 1024` → `false` (silently passes)
- the XML-tag regex `.test()` coerces the value to `"true"`/`"123"` (silently passes)

The skill lints clean despite violating the spec ("description: non-empty **string**, max 1024 chars"). The never-throw invariant (D-01) holds — nothing crashes — but validation is silently incomplete, and a boolean/number would flow verbatim into the built plugin's metadata. Asymmetric with the name field's treatment of the identical failure mode.
**Fix:**
```js
if (!data.description) {
  err("description is required");
} else if (typeof data.description !== "string") {
  err(`description must be a string (got ${typeof data.description})`);
} else {
  if (data.description.length > 1024) { /* ... unchanged ... */ }
  if (/<\/?[a-zA-Z][a-zA-Z0-9-]*\s*\/?>/.test(data.description)) { /* ... unchanged ... */ }
}
```
Add adversarial tests mirroring the name suite: `description: true`, `description: 123`, `description: [a, b]`.

## Info

### IN-01: Duplicate "Step 3" labels in the name-cascade comments

**File:** `src/schema.js:92-99`
**Issue:** The inline cascade comments label both the kebab-case check (line 93) and the max-64 check (line 98) as "Step 3", so the reserved-word check (line 101) is labeled "Step 4" and the folder-match check (line 106) "Step 5" — off by one against the six-stage cascade documented in the function's doc block (line 53: missing → non-string → non-kebab → max-64 → reserved-word → ≠folder). This phase edited this file specifically for comment accuracy (DEBT-01), so the drift is worth closing in the same sweep.
**Fix:** Renumber the max-64 comment to "Step 4", reserved-word to "Step 5", folder-match to "Step 6".

---

_Reviewed: 2026-07-02T13:48:21Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
