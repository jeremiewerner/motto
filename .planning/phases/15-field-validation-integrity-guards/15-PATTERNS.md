# Phase 15: Field Validation & Integrity Guards - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 3 (2 modified existing modules + 1 dogfood fixture; no new files this phase)
**Analogs found:** 3 / 3 (all in-repo, same-file precedents — no external analog search needed)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `src/schema.js` (`validateSkill` — 3 new field-check blocks + 1 new exported predicate) | pure validator (utility) | transform (data → errors[]) | itself — `TEMPLATE` cascade (lines 220-251) and `shared_references` loop (lines 275-292) | exact (same file, same function, established cascade idiom) |
| `src/lint.js` (`processSkill` gains `checkOutputsFs` call; `lintProject` gains `loadSkillAudiences` pre-pass) | I/O orchestrator (service) | file-I/O + CRUD-style aggregation | itself — `loadSharedRefs` (lines 75-88) and `processSkill` (lines 135-165) | exact (same file, same layer, established fs-with-tolerant-failure idiom) |
| `skills/release/SKILL.md` (dogfood: gains `allowed-tools`) | config/fixture | request-response (consumed by `lintProject`) | itself — existing frontmatter block (lines 1-6) | exact (literal edit target) |

No files in this phase are net-new; every change extends an existing module using a pattern already present in that same module. This is itself the dominant convention in this codebase (see Phase 14's `hasClosedSection`/TEMPLATE precedent, referenced throughout RESEARCH.md).

## Pattern Assignments

### `src/schema.js` — `validateSkill` gains 3 field blocks + 1 exported predicate

**Analog:** the file's own `TEMPLATE` cascade (hasOwnProperty-gated optional field) and `shared_references` loop (per-entry independent cascade).

**Imports pattern** (current, lines 1-16 — schema.js has NEVER imported anything beyond `./templates.js`; this phase adds its first `node:path` import):
```javascript
// src/schema.js line 15 (current)
import { SECTIONS, TEMPLATES } from "./templates.js";

// NEW this phase — first-ever import of node:path in schema.js.
// Still purity-safe: node:path is pure string math, no fs, no I/O.
import { resolve, sep, isAbsolute } from "node:path";
```
Docblock at line 128 currently reads:
```
 * `dependencies` (and any other unknown frontmatter key) is accepted without
 * error (D-14). `template` is no longer a passthrough key as of TMPL-01 — see
 * the TEMPLATE cascade below.
```
This MUST be updated in the same task that adds the `dependencies:` block — `dependencies` is no longer a passthrough key once VAL-02/03/04 land (Pitfall 6 in RESEARCH.md).

**hasOwnProperty-gated optional field pattern** (analog: TEMPLATE cascade, `src/schema.js` lines 227-239):
```javascript
const hasTemplateKey = Object.prototype.hasOwnProperty.call(data, "template");
let waivedSections = new Set();

if (hasTemplateKey) {
  const tpl = data.template;
  if (typeof tpl !== "string") {
    // Guard BEFORE any string-only method / coercion — mirrors the NAME
    // non-string guard above. Short-circuits a throwing toString/
    // Symbol.toPrimitive before it is ever invoked (D-01, T-14-03).
    err(`template must be a string (got ${typeof tpl})`);
  } else if (!Object.prototype.hasOwnProperty.call(TPL, tpl)) {
    const available = Object.keys(TPL).sort().join(", ");
    err(`unknown template "${tpl}" (available: ${available})`);
```
Apply this exact `hasOwnProperty`-then-`typeof`-guard-then-cascade shape to `outputs`, `dependencies`, and `allowed-tools` (each independently gated — CONTEXT.md's Empty-field policy requires wrong-type-still-errors even for the new optional fields).

**Per-entry independent-cascade pattern** (analog: `shared_references` loop, `src/schema.js` lines 275-292):
```javascript
const refs = Array.isArray(data.shared_references) ? data.shared_references : [];
for (const entry of refs) {
  if (typeof entry === "string" && (entry.includes("/") || entry.includes("."))) {
    err(
      `shared_references entry "${entry}" is an unsafe basename (must not contain "/" or ".")`
    );
  } else if (!sharedRefs.has(entry)) {
    err(`shared_references entry "${entry}" not found in shared/references/`);
  }
}
```
This is the direct template for the `outputs:` per-entry cascade (non-string → stop; unsafe path → stop, skip fs; else defer to lint.js) and the `dependencies:` per-entry cascade (namespaced-format-only vs. bare-kebab self-dep/resolution/audience-guard chain, per RESEARCH.md Pattern 3).

**Type-guard-before-method cascade** (analog: NAME cascade, `src/schema.js` lines 165-169):
```javascript
} else if (typeof name !== "string") {
  // Step 2: non-string truthy name (e.g. YAML boolean true, number 123, array, object).
  // Must guard BEFORE NAME_KEBAB.test() and RESERVED.includes() — both coerce and
  // may throw (`.includes` is not defined on booleans). D-01: never throw. (REVIEW-01)
  err(`name must be a string (got ${typeof name})`);
} else if (!NAME_KEBAB.test(name)) {
```
Reuse for every new field's non-string/wrong-shape branch (never call `.includes`/`.split`/`Object.entries` etc. before a `typeof`/`Array.isArray` guard has passed).

**New exported predicate** (no direct analog exists yet — first cross-layer-shared pure predicate in this codebase; modeled on `NAME_KEBAB`'s export style at line 37):
```javascript
export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```
```javascript
// NEW — same export style, used by both validateSkill (schema.js) and
// checkOutputsFs (lint.js). Pure node:path only — no fs.
export function isOutputPathLexicallySafe(skillDirAbs, entry) {
  if (typeof entry !== "string" || entry === "") return false;
  if (isAbsolute(entry)) return false;
  const root = resolve(skillDirAbs) + sep;
  const target = resolve(skillDirAbs, entry);
  return (target + sep).startsWith(root);
}
```

**Namespaced-format reuse of NAME_KEBAB** (analog: `NAME_KEBAB` itself, exported line 37, consumed at line 170):
```javascript
} else if (!NAME_KEBAB.test(name)) {
```
For `dependencies:` namespaced (`plugin:skill`) entries, split on `:` and apply `NAME_KEBAB.test()` to both halves — same regex, same test-call style, no new regex authored.

---

### `src/lint.js` — new `loadSkillAudiences` pre-pass + `checkOutputsFs` async helper + `processSkill`/`lintProject` wiring

**Analog:** `loadSharedRefs` (lines 75-88) for the "scan-and-tolerate-absence" pre-pass shape; `processSkill` (lines 135-165) for the "async fs-layer, tolerant of per-entry failure, pushes to shared `errors` array" shape.

**Imports pattern** (current, lines 25-30):
```javascript
import { readFile, readdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

import { parseFrontmatter } from './frontmatter.js';
import { validateSkill } from './schema.js';
import { loadConfig } from './config.js';
```
New imports needed this phase:
```javascript
import { readFile, readdir, stat, realpath } from 'node:fs/promises'; // + stat, realpath
import { join, basename, extname, resolve, relative, isAbsolute } from 'node:path'; // + resolve, relative, isAbsolute
import { validateSkill, isOutputPathLexicallySafe } from './schema.js'; // + isOutputPathLexicallySafe
```

**Tolerant-of-absence pre-pass pattern** (analog: `loadSharedRefs`, lines 75-88):
```javascript
async function loadSharedRefs(projectRoot) {
  const refsDir = join(projectRoot, 'shared', 'references');
  try {
    const entries = await readdir(refsDir, { withFileTypes: true });
    return new Set(
      entries
        .filter((e) => e.isFile() && extname(e.name) === '.md')
        .map((e) => basename(e.name, '.md')),
    );
  } catch (e) {
    if (e.code === 'ENOENT') return new Set(); // D2-08: absence is not an error
    throw e; // unexpected — propagate to the lintProject boundary
  }
}
```
Direct template for `loadSkillAudiences` — same "swallow ENOENT/parse-failure per-entry, never throw, return a plain data structure" shape, EXCEPT `loadSkillAudiences` must swallow ALL per-file failures silently (not just ENOENT) because that skill's own `processSkill` pass independently reports the real error (Pitfall 3 — no double-reporting).

**processSkill's try/catch backstop + return-to-continue idiom** (analog, lines 135-165):
```javascript
async function processSkill(skillsDir, dirName, sharedRefs, errors) {
  try {
    const skillPath = join(skillsDir, dirName, 'SKILL.md');
    let text;
    try {
      text = await readFile(skillPath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        errors.push({ skill: dirName, message: 'missing SKILL.md' });
      } else {
        errors.push({ skill: dirName, message: `could not read SKILL.md: ${e.message}` });
      }
      return; // return from helper == continue in the outer loop (Pitfall 5)
    }
    const { data, body, errors: parseErrors } = parseFrontmatter(text);
    for (const e of parseErrors) {
      errors.push({ skill: dirName, message: e.message });
    }
    const schemaErrors = validateSkill({ dirName, data, body }, sharedRefs);
    errors.push(...schemaErrors);
  } catch (e) {
    // Backstop: any unexpected failure during per-skill I/O or validation (D2-06)
    errors.push({ skill: dirName, message: `unexpected error: ${e.message}` });
  }
}
```
`checkOutputsFs` must follow the same shape: called from inside `processSkill`'s existing outer `try`, so its own `stat`/`realpath` failures are caught by the SAME backstop rather than needing a second try/catch wrapper (simplest correct option — though a per-entry inner try/catch, as RESEARCH.md's Pattern 2 example shows, is also acceptable and gives per-entry error granularity instead of an "unexpected error" catch-all).

**Wiring into lintProject** (analog, lines 183-207 — insertion points):
```javascript
export async function lintProject(projectRoot) {
  const errors = [];
  await processConfig(projectRoot, errors);
  const sharedRefs = await loadSharedRefs(projectRoot);
  const skillsDir = join(projectRoot, 'skills');
  const skillNames = await discoverSkillNames(skillsDir);

  if (skillNames === null || skillNames.length === 0) {
    errors.push({ skill: '(project)', message: 'no skills found' });
    return { ok: false, errors, count: 0 };
  }

  for (const dirName of skillNames) {
    await processSkill(skillsDir, dirName, sharedRefs, errors);
  }

  return { ok: errors.length === 0, errors, count: skillNames.length };
}
```
NEW pre-pass slots in AFTER `discoverSkillNames` resolves (need `skillNames` first) and BEFORE the `processSkill` loop starts (both `skillNames` and `audienceMap` must be ready before any per-skill `validateSkill` call needs them):
```javascript
const skillNameSet = new Set(skillNames);
const audienceMap = await loadSkillAudiences(skillsDir, skillNames);
for (const dirName of skillNames) {
  await processSkill(skillsDir, dirName, sharedRefs, skillNameSet, audienceMap, errors);
}
```

---

### `skills/release/SKILL.md` — dogfood: gains `allowed-tools`

**Analog:** the file's own current frontmatter block (lines 1-6):
```yaml
---
name: release
description: Maintainer release checklist for Motto — run tests, bump version, dogfood lint and build, verify tarball, and publish. Use this skill when releasing a new Motto version.
audience: private
template: procedure
---
```
Add `allowed-tools` reflecting the real commands the procedure body invokes (`node --test`, `npm version`, `git status`, `npm publish`, etc. — verified by reading the full procedure body before finalizing the value). Per CONTEXT.md this is the ONLY live (non-fixture) consumer of the three new fields this phase; `outputs:`/`dependencies:` are exercised only via test fixtures under `test/`.

---

## Shared Patterns

### Never-throw / type-guard-before-method (D-01)
**Source:** `src/schema.js` NAME cascade, lines 165-169; TEMPLATE cascade, lines 232-236.
**Apply to:** every new field-check branch in `validateSkill` (outputs, dependencies, allowed-tools) — always `typeof`/`Array.isArray` guard BEFORE any string/array method call or template-literal interpolation of the raw value (guards against throwing `toString`/`Symbol.toPrimitive`, per Pitfall 7 / T-14-03 precedent in `test/schema.test.js`).

### hasOwnProperty-gated optional field (D-07)
**Source:** `src/schema.js` lines 227 (`hasTemplateKey`).
**Apply to:** `outputs`, `dependencies`, `allowed-tools` — each independently gated by `Object.prototype.hasOwnProperty.call(data, "<field>")`, not truthiness, so an absent key is silently skipped but an explicitly-present wrong-shaped value (including empty string for allowed-tools) always errors.

### Per-entry independent cascade with early `continue` (D-10)
**Source:** `src/schema.js` lines 275-292 (`shared_references`).
**Apply to:** all three new fields' per-entry loops — one error per malformed entry, entries independent of each other, cascade stops at first failure WITHIN an entry (non-string → stop; unsafe/unresolvable → stop) but does not stop the loop itself.

### Tolerant fs pre-pass, absence/failure is not itself an error (D2-08)
**Source:** `src/lint.js` lines 75-88 (`loadSharedRefs`).
**Apply to:** `loadSkillAudiences` — missing/malformed SKILL.md during the pre-pass is swallowed silently (not pushed to `errors`); that skill's own `processSkill` pass reports its own error independently (avoids double-reporting, Pitfall 3).

### Error message shape: one line, quoted offending value + hint
**Source:** `src/schema.js` lines 172-174 (NAME), 238 (unknown template), 286-290 (shared_references).
**Apply to:** all new error messages across `outputs`, `dependencies`, `allowed-tools` — e.g. `dependency "relase" not found (available: author-skill, release)` mirrors the exact `unknown template "${tpl}" (available: ${available})` shape already in the codebase.

## No Analog Found

None. Every file/change in this phase is an extension of an existing module using a pattern already present in that same module — no net-new files, no external cross-project analog search was needed.

## Metadata

**Analog search scope:** `src/schema.js`, `src/lint.js`, `src/build.js`, `skills/release/SKILL.md` (all read directly; line numbers verified against current repo state, 2026-07-03).
**Files scanned:** 4 (3 pattern sources + 1 dogfood edit target).
**Pattern extraction date:** 2026-07-03
</content>
</invoke>
