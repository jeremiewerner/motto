---
phase: 15-field-validation-integrity-guards
fixed_at: 2026-07-03T00:00:00Z
review_path: .planning/phases/15-field-validation-integrity-guards/15-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-07-03
**Source review:** .planning/phases/15-field-validation-integrity-guards/15-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (fix_scope: critical_warning — IN-01/02/03 excluded)
- Fixed: 5
- Skipped: 0
- Test suite: 185 → 194 tests, all green after every fix (9 regression tests added)

## Fixed Issues

### CR-01: `outputs:` lexical safety evaluated against two different roots — cwd-dependent silent validation bypass

**Files modified:** `src/schema.js`, `src/lint.js`, `test/schema.test.js`, `test/lint.test.js`
**Commit:** 3226d82
**Applied fix:** Made `isOutputPathLexicallySafe` root-independent per the review's suggested shape — signature changed from `(skillDirAbs, entry)` to `(entry)`; the predicate now uses `normalize()` (never `resolve()`), so its verdict cannot depend on `process.cwd()` and both layers agree by construction. Dropped `resolve(dirName)` from `validateSkill` (the validator is pure again) and the root argument from `checkOutputsFs`'s gate (fs checks still use `resolve(skillDirAbs, value)`). The new predicate is deliberately stricter: `..`-re-entry paths like `../my-skill/x` are rejected. Regression tests: direct predicate unit tests (re-entry, interior traversal, cwd-independence), a `validateSkill` re-entry case, and a `lintProject` test reproducing the exact historical bypass shape (`../../<cwdDirName>/my-skill/notes.txt`) asserting exactly one "unsafe" error is emitted (no bypass, no double report).

### CR-02: `lintProject` throws at its boundary on ENOTDIR — never-throw invariant violated, CLI crashes

**Files modified:** `src/lint.js`, `test/lint.test.js`
**Commit:** 1d92fd0
**Applied fix:** Both rethrow paths converted to diagnostics per the review suggestion. `loadSharedRefs(projectRoot, errors)` now pushes `{ skill: '(project)', message: 'could not read shared/references/: …' }` for non-ENOENT failures and returns an empty Set (skill scan still runs). `discoverSkillNames` returns an `{ error }` sentinel for non-ENOENT failures; `lintProject` pushes it as a `(project)` error and returns `{ ok: false, count: 0 }` — distinct from "no skills found". Regression tests: a FILE named `skills` and a FILE named `shared/references` (both one-`touch` ENOTDIR reproductions) assert `lintProject` resolves instead of rejecting, with the correct diagnostics; the second also asserts the valid skill still lints cleanly.

### WR-01: `description` has no type guard — throws for adversarial values, silently accepts non-strings

**Files modified:** `src/schema.js`, `test/schema.test.js`
**Commit:** f9d5f79
**Applied fix:** Added the `typeof !== "string"` branch mirroring the name guard, exactly as suggested: `description must be a string (got array|number|object|…)`, placed before the length and XML-regex checks so a throwing `toString`/`Symbol.toPrimitive` object can never reach `RegExp.prototype.test`'s ToString coercion. Regression tests: throwing-`Symbol.toPrimitive` adversarial case (asserts `doesNotThrow` + 1 error) and `description: 123` / `description: ["a","b"]` cases (previously zero errors).

### WR-02: outputs existence check accepts directories — `stat` without `isFile()`

**Files modified:** `src/lint.js`, `test/lint.test.js`
**Commit:** 80e79c5
**Applied fix:** `checkOutputsFs` now captures the `stat` result and pushes `outputs.${key} "${value}" is not a file` (then `continue`s) when `!stats.isFile()`. Since `stat` follows symlinks, a symlink to a regular file still passes and the symlink-escape check still runs for it. Regression test: a skill declaring `outputs: { self: ".", sub: subdir }` asserts two indexed "is not a file" errors (both previously passed lint with zero errors).

### WR-03: `allowed-tools` empty-entry policy inconsistent — scalar uses `trim()`, array entries do not

**Files modified:** `src/schema.js`, `test/schema.test.js`
**Commit:** bf941cf
**Applied fix:** Array branch now checks `typeof entry !== "string" || entry.trim() === ""`, matching the scalar branch's Empty-field policy, per the review's suggested predicate. Regression test: `allowed-tools: ["   "]` asserts one `allowed-tools[0]` indexed error (previously zero errors).

## Verification

- Each fix verified per-change: file re-read + `node --check` on every modified source file + full `node --test` run.
- Full suite green after every individual fix; final state: 194 tests, 0 failures.
- Project invariants preserved: `src/schema.js` remains pure (no `node:fs`, `node:path` string math only — the CR-01 fix removed its last cwd dependence); `src/lint.js` owns all fs checks and the `lintProject` boundary now genuinely never throws (CR-02 closed the last known rethrow paths); plain ESM, stdlib only, no new dependencies.

---

_Fixed: 2026-07-03_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
