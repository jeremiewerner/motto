---
phase: 15-field-validation-integrity-guards
reviewed: 2026-07-03T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - skills/release/SKILL.md
  - src/lint.js
  - src/schema.js
  - test/lint.test.js
  - test/schema.test.js
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-07-03
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 15 added validation for three optional frontmatter fields (`outputs:`, `dependencies:`, `allowed-tools`) plus fs-layer integrity guards (existence, symlink-escape containment). The invariants the phase context called out were checked directly:

- **Self-dependency before membership** — correct (`src/schema.js:399-407`; the self-dep check runs first and `continue`s before `skillNames.has()`).
- **Audience guard only public→private** — correct (`src/schema.js:409`; the three passing directions are covered by tests).
- **Symlink containment (`realpath` + `path.relative`)** — the fs-layer check itself is sound (both sides realpathed, `relative()` avoids prefix collision, broken symlinks caught by `stat` first). However, its **lexical gate is broken** (CR-01) and it accepts directories as "files" (WR-02).
- **Never-throw** — two holes found: `lintProject` rejects on ENOTDIR (CR-02), and `validateSkill` throws for an adversarial `description` value (WR-01).

All findings marked "confirmed empirically" were reproduced with a live script against the current code — they are not theoretical. Note that all 185 tests pass while CR-01, CR-02, and WR-01 exist: the suite does not cover these paths.

## Critical Issues

### CR-01: `outputs:` lexical safety is evaluated against two DIFFERENT roots — cwd-dependent silent validation bypass

**File:** `src/schema.js:351` and `src/lint.js:184-186`
**Issue:** The two layers apply the shared predicate `isOutputPathLexicallySafe` to **different base directories**:

- `src/schema.js:351` — `const skillDirAbs = resolve(dirName);` → resolves `dirName` against **`process.cwd()`** (a directory that in general does not exist and is not the skill's directory).
- `src/lint.js:184` — `const skillDirAbs = resolve(skillsDir, dirName);` → the **real** skill directory.

`checkOutputsFs` (`src/lint.js:186`) skips any entry the predicate rejects, on the assumption "schema.js already reported it" (Pitfall 3). That assumption is false whenever the two roots disagree — which happens for `..`-re-entry paths, because lexical containment of a relative path IS root-dependent.

**Confirmed empirically:** with cwd = project root (the normal `motto lint` invocation) and a skill declaring:

```yaml
outputs:
  doc: "../../<projectDirName>/my-skill/notes.txt"
```

- schema layer: contained under `cwd/my-skill` → **safe, no error emitted**
- lint layer: NOT contained under `<root>/skills/my-skill` → **skipped as "already reported"**
- Result: `lintProject` returned `ok: true` with **zero errors** for an entry that on disk points *outside the skill directory* and *does not exist*. Both the containment guard and the existence check are silently bypassed.

The reverse direction also occurs: an entry like `../../skills/my-skill/x` is safe under the real root but unsafe under the cwd root → schema emits an "unsafe" error **and** lint proceeds with the fs check, producing contradictory double reports.

Additional consequence: `validateSkill`'s result now depends on `process.cwd()` — the "pure lexical validator" is environment-dependent.

**Fix:** Make the predicate root-independent so both layers agree by construction, and remove the cwd dependence from `validateSkill`:

```js
// src/schema.js
import { normalize, sep, isAbsolute } from "node:path";

export function isOutputPathLexicallySafe(entry) {
  if (typeof entry !== "string" || entry === "") return false;
  if (isAbsolute(entry)) return false;
  const norm = normalize(entry);
  return norm !== ".." && !norm.startsWith(".." + sep);
}
```

This is slightly stricter (rejects `../my-skill/x` self-re-entry — arguably correct anyway), deterministic, and needs no root argument. Update the call in `validateSkill` (drop `resolve(dirName)`) and in `checkOutputsFs` (drop the root argument; keep `resolve(skillDirAbs, value)` only for the actual fs checks). Add a regression test that runs `lintProject` against a `..`-re-entry entry and asserts an error is emitted.

### CR-02: `lintProject` throws at its boundary on ENOTDIR — documented never-throw invariant violated, CLI crashes

**File:** `src/lint.js:87` (`loadSharedRefs`), `src/lint.js:113` (`discoverSkillNames`), `src/lint.js:301,305` (uncaught call sites)
**Issue:** The module docblock (`src/lint.js:10-12`) states: "lintProject NEVER throws at its boundary. Every I/O or parse error is converted to a `{ skill, message }` entry." But both helpers **rethrow** any non-ENOENT error, and `lintProject` calls them with no catch.

**Confirmed empirically:**
- A **file** named `skills` at the project root → `readdir` fails ENOTDIR → `lintProject` **rejects** (`ENOTDIR: not a directory, scandir .../skills`).
- A **file** named `shared/references` → same rejection.

Both are one-`touch` user errors. `bin/motto.js:231-251` awaits `lintProject` with no try/catch, so the CLI dies with an unhandled-rejection stack trace instead of a `✗` diagnostic. (This code predates phase 15, but the invariant is this project's documented core guarantee, the phase explicitly touched this file, and prior never-throw holes here were only ever caught by adversarial review.)

**Fix:** Convert non-ENOENT failures to error entries instead of rethrowing:

```js
// discoverSkillNames — return an error sentinel instead of throwing
} catch (e) {
  if (e.code === 'ENOENT') return null;
  return { error: `could not read skills/: ${e.message}` }; // caller pushes { skill: '(project)', ... }
}

// loadSharedRefs
} catch (e) {
  if (e.code !== 'ENOENT') {
    errors.push({ skill: '(project)', message: `could not read shared/references/: ${e.message}` });
  }
  return new Set();
}
```

(Or wrap the two call sites in `lintProject` with try/catch pushing a `(project)`-labelled error.) Add ENOTDIR fixtures to `test/lint.test.js` asserting `lintProject` returns instead of rejecting.

## Warnings

### WR-01: `description` has no type guard — `validateSkill` throws for adversarial values and silently accepts non-strings

**File:** `src/schema.js:231-251`
**Issue:** Every other field (`name`, `template`, `outputs` values, `dependencies` entries) got a `typeof` guard specifically to uphold D-01 against throwing `toString`/`Symbol.toPrimitive` objects (T-14-03 precedent, and the phase-15 test comment claims "Every field gets at least one throwing-toString ... adversarial case"). `description` has neither the guard nor the test. Confirmed empirically:

- `description: <object with throwing Symbol.toPrimitive>` → `validateSkill` **throws** `"boom"` at the regex `.test()` call (`src/schema.js:248`), because `RegExp.prototype.test` coerces via `ToString`. (Unreachable via the YAML pipeline — `parseFrontmatter` only yields plain values — but `validateSkill` is an exported validator with a documented NEVER-throws contract.)
- `description: 123` and `description: [a, b]` (both trivially expressible in YAML frontmatter) → **zero errors**. A number or array description passes lint even though the spec requires a non-empty string ≤1024 chars.

**Fix:** Mirror the name guard:

```js
if (!data.description) {
  err("description is required");
} else if (typeof data.description !== "string") {
  err(`description must be a string (got ${Array.isArray(data.description) ? "array" : typeof data.description})`);
} else {
  // existing length + XML checks
}
```

Add the throwing-toString adversarial test and a `description: 123` YAML-shaped test.

### WR-02: outputs existence check accepts directories — `stat` without `isFile()`

**File:** `src/lint.js:188-193`
**Issue:** `checkOutputsFs` uses `await stat(targetAbs)` purely for existence. `stat` succeeds on directories, so an `outputs:` entry naming a directory — including `doc: "."` (the skill directory itself) — passes lint with zero errors. Confirmed empirically: `outputs: { doc: "." }` → `ok: true`. The error message and schema docs consistently say "file" (`outputs.${key} file "..." does not exist`; "map of name -> file"), so a directory is a spec violation that the guard silently admits.

**Fix:**

```js
let stats;
try {
  stats = await stat(targetAbs);
} catch { /* existing "does not exist" push */ }
if (stats && !stats.isFile()) {
  errors.push({ skill: dirName, message: `outputs.${key} "${value}" is not a file` });
  continue;
}
```

### WR-03: `allowed-tools` empty-entry policy is inconsistent — scalar uses `trim()`, array entries do not

**File:** `src/schema.js:426` vs `src/schema.js:432`
**Issue:** A scalar `allowed-tools: "   "` errors (the string branch checks `val.trim() === ""`), but an array entry `allowed-tools: ["   "]` passes (the array branch checks `entry === ""` without trimming). Confirmed empirically: `["   "]` → zero errors. A whitespace-only permission rule is meaningless in both shapes; the declared "Empty-field policy" is applied to one shape only.

**Fix:** Use the same predicate in both branches:

```js
if (typeof entry !== "string" || entry.trim() === "") {
  err(`allowed-tools[${i}] must be a non-empty string (got ${typeof entry})`);
}
```

## Info

### IN-01: All `stat` failures in `checkOutputsFs` are reported as "does not exist"

**File:** `src/lint.js:189-192`
**Issue:** The bare `catch` around `stat` maps every failure — EACCES, ELOOP (symlink cycle), ENAMETOOLONG — to `does not exist`, which is misleading for a permission error or a self-referencing symlink loop. (Contrast with `bin/motto.js:104-111`, which distinguishes ENOENT/ENOTDIR from other codes.)
**Fix:** `catch (e)` and report `e.code === 'ENOENT' ? 'does not exist' : \`could not be checked: ${e.message}\``.

### IN-02: `hasClosedSection` accepts an info-string line as a CLOSING fence, diverging from CommonMark

**File:** `src/schema.js:85`
**Issue:** While a backtick fence is open, a line like ` ```js ` (same char, length ≥ opener) is treated as closing the fence. CommonMark forbids info strings on closing fences, so real renderers keep the fence open — meaning subsequent genuinely-fenced `<process>`/`</process>` tags can be counted as unfenced, letting a template-section check pass when the section only exists inside a code block (a lint false-negative). Edge case; the phase-14 review IDs in the comments (WR-01/WR-02) did not cover it.
**Fix:** When a fence is open, only treat a marker line as closing if nothing but whitespace follows the marker: extend the regex handling with a rest-of-line check (`/^ {0,3}(`{3,}|~{3,})\s*$/` for close candidates).

### IN-03: release SKILL.md prose drifts from its own verify script

**File:** `skills/release/SKILL.md:90` (vs `:75`)
**Issue:** The script's `autoIncluded` allowlist contains `CHANGELOG`, but the prose summary ("plus auto-included `package.json`, `README`, `LICENSE`") omits it. Also, the `startsWith` matching means any path beginning `README`/`LICENSE`/`CHANGELOG` (e.g. `README-internal.md`) is allowlisted — acceptable for npm's auto-include semantics but worth knowing.
**Fix:** Add `CHANGELOG` to the prose list at line 90.

---

_Reviewed: 2026-07-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
