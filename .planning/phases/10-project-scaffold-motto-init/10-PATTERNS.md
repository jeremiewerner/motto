# Phase 10: Project Scaffold (`motto init`) - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 5 (2 new, 1 modified, 2 new tests)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/init.js` | service/orchestrator | file-I/O | `src/build.js` | exact (same never-throw orchestrator shape, same fs/promises style) |
| `bin/motto.js` (modified) | CLI entry/controller | request-response (argv → stdout/exit) | `bin/motto.js` itself (extend existing `lint`/`build` branches) | exact |
| `test/init.test.js` | test | CRUD/unit | `test/dogfood.test.js` (unit-style sections) + `test/config.test.js` pattern for pure-function assertions | role-match |
| `test/init-dogfood.test.js` | test | event-driven (temp-dir lifecycle: before/after) | `test/dogfood.test.js` (mkdtemp/cp/before/after pattern) | exact |
| Scaffold templates (SKILL.md, motto.yaml, .gitignore, marketplace.json — inline strings in `src/init.js`) | config/template | file-I/O (string emission) | `skills/release/SKILL.md` (SKILL.md shape), `motto.yaml` (repo root), `.gitignore` (repo root), `.claude-plugin/marketplace.json` (repo root, contrast case) | exact (content shape) / contrast (marketplace source field must differ) |

## Pattern Assignments

### `src/init.js` (service/orchestrator, file-I/O)

**Analog:** `src/build.js` (whole-file pattern: lint-gate → checks → mkdir/writeFile → return shape) and `src/config.js` / `src/schema.js` (validation reuse)

**Imports pattern** (`src/build.js` lines 24-29):
```javascript
import { readFile, readdir, rm, mkdir, cp, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { lintProject } from './lint.js';
import { loadConfig } from './config.js';
import { parseFrontmatter } from './frontmatter.js';
```
For `init.js`, mirror this shape but import `mkdir`, `writeFile`, `readdir` from `node:fs/promises`, `basename`/`join` from `node:path`, `execFileSync` from `node:child_process`, and `NAME_KEBAB` from `./schema.js` (NOT from `config.js` — schema.js is canonical source per D-09; config.js's re-export exists only for the DOG-04 parity test).

**Never-throw orchestrator + structured return pattern** (`src/build.js` lines 89-95, 143-146, 206-213):
```javascript
export async function buildProject(projectRoot) {
  const lintResult = await lintProject(projectRoot);
  if (!lintResult.ok) {
    return { ok: false, outDir: null, errors: lintResult.errors, skillCount: 0, bucketCount: 0 };
  }
  // ... checks BEFORE any destructive/write operation ...
  if (buildErrors.length > 0) {
    return { ok: false, outDir: null, errors: buildErrors, skillCount: 0, bucketCount: 0 };
  }
  // ... writes ...
  return { ok: true, outDir: distDir, errors: [], skillCount: skills.length, bucketCount: bucketsUsed.size };
}
```
`scaffoldProject(targetDir, { name, force })` should follow the identical shape: validate name → guard (unless force) → write → return `{ ok, created, errors, reason? }`. All guard/validation failures return structured objects; never throw at the function boundary (established house style, confirmed across `lintProject`/`buildProject`/`loadConfig`/`validateSkill`).

**Discovery/filter helper pattern** (`src/build.js` lines 42-54, `discoverSkillNames`):
```javascript
async function discoverSkillNames(skillsDir) {
  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => e.name);
}
```
Reuse this exact `readdir` + try/catch-ENOENT + filter/sort shape for the empty-dir guard's `listNonIgnorableEntries(targetDir)` (filter predicate becomes the `.git`/`.DS_Store` allowlist per D-05, not the directory/dot-file filter shown above).

**Name-validation reuse** (`src/schema.js` line 33, `src/config.js` lines 87-93):
```javascript
export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```
```javascript
// src/config.js — the established re-export/reuse pattern for NAME_KEBAB
} else if (!NAME_KEBAB.test(plugins.public)) {
  errors.push({ message: `plugins.public "${plugins.public}" must be letter-start kebab-case (...)` });
}
```
`init.js` must `import { NAME_KEBAB } from './schema.js'` and test the effective name against this SAME object — never redefine.

**JSON emission pattern** (`src/build.js` lines 196-203, for `marketplace.json`):
```javascript
await writeFile(
  join(pluginDir, 'plugin.json'),
  JSON.stringify(
    { name: pluginName, version: config.version, description: config.description },
    null,
    2,
  ) + '\n',
);
```
Use `JSON.stringify(obj, null, 2) + '\n'` for the scaffolded `marketplace.json` — identical formatting convention (2-space indent, trailing newline).

**Error handling pattern:** No try/catch around user logic beyond ENOENT-tolerant reads (see discovery helper above). All "failure" is expressed as return-value branching, not exceptions — consistent with `loadConfig`'s and `validateSkill`'s never-throw contract (`src/schema.js` lines 1-11, `src/config.js` lines 1-9).

---

### `bin/motto.js` (CLI entry/controller, request-response) — MODIFY

**Analog:** itself — extend the existing dispatch pattern.

**Current dispatch shape to mirror** (`bin/motto.js` lines 42-78):
```javascript
if (sub === 'lint') {
  const result = await lintProject(process.cwd());
  if (result.ok) {
    process.stdout.write(`✓ ${result.count} skills OK\n`);
  } else {
    for (const e of result.errors) {
      process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
    }
    process.exitCode = 1; // D2-11; process.exit(1) NOT used (Pitfall 7)
  }
} else if (sub === 'build') {
  const { buildProject } = await import('../src/build.js');
  const result = await buildProject(process.cwd());
  if (result.ok) {
    process.stdout.write(`✓ built ${result.outDir} — ${result.skillCount} skills, ${result.bucketCount} plugin(s)\n`);
  } else {
    for (const e of result.errors) {
      process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
    }
    process.exitCode = 1;
  }
} else {
  process.stderr.write('usage: motto <lint|build>\n');
  process.exitCode = 1;
}
```
Add an `init` branch BEFORE `lint` (or wherever fits the sub-dispatch chain) following this exact `if/else if` shape: lazy `import('../src/init.js')` (matches the `build` branch's lazy-import style), call `scaffoldProject(process.cwd(), { name, force })`, then branch on `result.ok` printing `✓`/`✗` lines in the same style. Both usage-string literals (line 37 in the `parseArgs` catch, line 76 in the final `else`) must be updated from `'usage: motto <lint|build>\n'` to `'usage: motto <init|lint|build>\n'` (per RESEARCH Open Question 1 recommendation — update both).

**Flag extension pattern** (`bin/motto.js` lines 29-34):
```javascript
parsed = parseArgs({
  args: process.argv.slice(2),
  options: {},
  allowPositionals: true,
  strict: true,
});
```
Add `force: { type: 'boolean' }` to the shared `options: {}` object — same `parseArgs` call, not a second one. The `[name]` positional is read via `parsed.positionals[1]` (mirroring how `sub = parsed.positionals[0]` is already read).

**Exit-code discipline:** `process.exitCode = 1` only, never `process.exit(1)` (the one exception, `process.exit()` with no arg in the parseArgs catch block, is pre-existing and must not be copied into the new init branch — init errors should behave like the `lint`/`build` branches, setting `process.exitCode` and falling through).

---

### `test/init-dogfood.test.js` (test, event-driven temp-dir lifecycle)

**Analog:** `test/dogfood.test.js` (whole file — mkdtemp/before/after/cp pattern)

**Temp-dir lifecycle pattern** (`test/dogfood.test.js` lines 48-77):
```javascript
describe('dogfood build (DOG-03)', () => {
  let tempDir;
  let buildResult;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-dogfood-'));
    // ... copy only the inputs the function under test reads ...
    buildResult = await buildProject(tempDir);
    if (!buildResult.ok) {
      throw new Error(`dogfood build failed — dist/ assertions skipped. Root cause:\n${JSON.stringify(buildResult.errors, null, 2)}`);
    }
  });

  after(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('buildProject returns ok:true with skillCount=3 and bucketCount=2', () => { /* ... */ });
  it('dist/public/author-skill/SKILL.md exists', async () => {
    await stat(join(tempDir, 'dist', 'public', 'author-skill', 'SKILL.md'));
  });
});
```
`test/init-dogfood.test.js` should follow this EXACT shape: `mkdtemp(join(tmpdir(), 'motto-init-dogfood-'))` in `before()`, call `scaffoldProject(tempDir, {})`, then chain `lintProject(tempDir)` and `buildProject(tempDir)` inside the same `before()` (fail-fast via `throw new Error(...)` on any non-ok result, matching the existing "collapse cascade into one legible hook failure" comment convention), `rm(tempDir, {recursive:true, force:true})` in `after()`. Per-artifact `it()` blocks use `stat()` assertions exactly like lines 92-121, including the explicit `.gitkeep` existence check (RESEARCH Open Question 2 recommends this).

**REPO_ROOT anchoring pattern** (`test/dogfood.test.js` lines 13-16) — not directly needed by init-dogfood (which uses only `tmpdir()`, no repo-root copy), but note for consistency if the test needs to reference repo paths:
```javascript
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```

**Import style** (`test/dogfood.test.js` lines 1-11):
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, cp, readFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
```

---

### `test/init.test.js` (test, unit/CRUD)

**Analog:** `test/dogfood.test.js`'s NAME_KEBAB-parity `describe` block (pure-assertion style, lines 23-31) and `src/config.js`-style validators tested via direct function calls (inferred from `loadConfig` signature — no direct `test/config.test.js` content was needed since the pattern is self-evident from `config.js`'s pure function shape).

**Pure-function unit-test pattern**:
```javascript
describe('NAME_KEBAB parity (DOG-04)', () => {
  it('NAME_KEBAB from schema.js and config.js are the same RegExp instance (REVIEW-11)', () => {
    assert.strictEqual(schemaKebab, configKebab, 'NAME_KEBAB must be the same RegExp instance...');
  });
});
```
`test/init.test.js` should test `scaffoldProject` directly against `mkdtemp`-created temp dirs (not the repo root) for: invalid-name rejection + suggestion, non-empty-dir refusal + offending-list cap, `--force` overwrite-only-scaffold-paths behavior, adversarial name inputs (colons/quotes — Pitfall 1), and `.gitignore`/`marketplace.json` content shape. Use `assert.strictEqual`/`assert.deepStrictEqual`/`assert.rejects` (`node:assert/strict`) matching the dogfood test's assertion style.

---

## Scaffold Template Content Patterns (inline strings inside `src/init.js`)

### SKILL.md template
**Analog:** `skills/release/SKILL.md` (lines 1-9 for the frontmatter + spine shape; do NOT copy body content — D-02 requires minimal body)
```markdown
---
name: release
description: Maintainer release checklist for Motto — ...
audience: private
---

# Releasing Motto

**Role:** You are the Motto release assistant for the maintainer. ...
```
Required spine per `validateSkill` (`src/schema.js` lines 135-148): frontmatter `name`/`description`/`audience: public|private`; body's first non-blank line must match `/^# \S/`; body must contain a line matching `/^\*\*Role:/m`. The `hello-world` scaffold template must satisfy exactly this spine with `audience: public` (D-03) and NO `shared_references` key (D-04).

### motto.yaml template
**Analog:** `/Users/jeremie/Projects/motto/motto.yaml` (repo root, current file)
```yaml
name: motto
version: "0.0.3"
description: Motto is a framework for authoring, validating, and packaging Claude Code Agent Skills into self-contained, distributable plugins.
plugins:
  public: motto
  private: motto-private
```
Scaffold variant: `name: <effectiveName>`, `version: "0.1.0"` (RESEARCH A2), a generic placeholder `description:`, and `plugins:\n  public: <effectiveName>` ONLY — no `plugins.private` (scaffold ships one starter skill, `audience: public`; `loadConfig` treats `plugins.private` absence as non-error per CONF-03/D-17, confirmed at `src/config.js` lines 95-102).

### .gitignore template — CONTRAST CASE
**Analog:** `/Users/jeremie/Projects/motto/.gitignore` (repo root) — but the scaffold variant must DIFFER, not copy verbatim.
```
node_modules/
dist/

# GSD scheduler lock (runtime, not source)
.claude/scheduled_tasks.lock

# GSD research tool cache (regenerated, not source)
.planning/research/.cache/
```
This repo's own `.gitignore` ignores ALL of `dist/` (line 2) because Motto's own `dist/public/` is rebuilt via `prepublishOnly` and shipped through npm packaging, not git. Per INIT-06/D-anything, the SCAFFOLDED `.gitignore` must ignore only `node_modules/` and `dist/private/`, explicitly KEEPING `dist/public/` trackable (a scaffolded user project commits its built public plugin so the `marketplace.json` relative-path pointer resolves for consumers cloning the repo). Do not copy this repo's GSD-specific ignore lines (`.claude/scheduled_tasks.lock`, `.planning/research/.cache/`) — those are Motto-repo-specific, not scaffold-relevant.

### marketplace.json template — CONTRAST CASE
**Analog:** `/Users/jeremie/Projects/motto/.claude-plugin/marketplace.json` (repo root) — source field must DIFFER.
```json
{
  "name": "motto",
  "owner": { "name": "Jérémie Werner", "email": "jeremiew@pm.me" },
  "plugins": [
    {
      "name": "motto",
      "source": { "source": "npm", "package": "@jeremiewerner/motto" },
      "description": "Motto skill authoring and packaging tools",
      "skills": "./dist/public/",
      "strict": false
    }
  ]
}
```
This repo's own manifest uses the `{source:"npm", package:...}` object form because Motto itself is npm-published, with a `skills` override pointing at the locally built plugin dir. The scaffolded variant (per RESEARCH Pattern 4, verified against official docs) must use the BARE RELATIVE-PATH STRING form instead:
```json
{
  "name": "<effectiveName>",
  "owner": { "name": "<git-config-owner-or-'Your Name'>" },
  "plugins": [
    {
      "name": "<effectiveName>",
      "source": "./dist/public/",
      "description": "<motto.yaml description>"
    }
  ]
}
```
No `skills` or `strict` keys (those are specific to this repo's npm-source override), no `owner.email` (omit entirely per RESEARCH — a placeholder email is worse than an absent field). Emit via `JSON.stringify(obj, null, 2) + '\n'` (see build.js JSON emission pattern above).

---

## Shared Patterns

### Never-throw / structured-return convention
**Source:** `src/schema.js` (module docstring, lines 1-11), `src/config.js` (lines 1-9), `src/build.js` (module docstring, lines 1-22)
**Apply to:** `src/init.js` in its entirety — `scaffoldProject` and every internal helper it calls (`listNonIgnorableEntries`, `resolveGitOwnerName`, `suggestKebabName`) must never throw at their own boundary; I/O errors are caught and converted, or (for genuinely unexpected errors, e.g. non-ENOENT readdir failures) re-thrown only past the point where the orchestrator can still recover gracefully (matches `discoverSkillNames`'s `if (e.code !== 'ENOENT') throw e;` pattern in `src/build.js` line 47-48).

### `✓`/`✗` CLI output style + exit-code discipline
**Source:** `bin/motto.js` lines 48-78
**Apply to:** the new `init` branch in `bin/motto.js`.
```javascript
if (result.ok) {
  process.stdout.write(`✓ ${...}\n`);
} else {
  process.stdout.write(`✗ ${...}\n`); // or per-line for multiple errors
  process.exitCode = 1; // never process.exit(1)
}
```

### NAME_KEBAB single-source reuse
**Source:** `src/schema.js` line 33 (definition), `src/config.js` lines 15-19 (re-export pattern), `test/dogfood.test.js` lines 18-31 (parity-test pattern that PROVES the single-source discipline)
**Apply to:** `src/init.js` name validation AND, if `test/init.test.js` wants an analogous parity assertion, import `NAME_KEBAB` directly from `src/schema.js` (not a re-implementation).

### JSON/config emission via `JSON.stringify(obj, null, 2) + '\n'`
**Source:** `src/build.js` lines 196-203 (plugin.json emission)
**Apply to:** the scaffolded `marketplace.json` write in `src/init.js`.

### readdir + try/catch-ENOENT + filter/sort helper shape
**Source:** `src/build.js` lines 42-54 (`discoverSkillNames`)
**Apply to:** `src/init.js`'s `listNonIgnorableEntries(targetDir)` (empty-dir guard, D-05 allowlist).

## No Analog Found

None — every file/behavior this phase requires has a close first-party analog already in the repository (per RESEARCH: no new runtime dependency, no new architectural pattern). The two "contrast case" templates (`.gitignore`, `marketplace.json`) have a same-named analog in the repo but the scaffold variant must deliberately DIFFER in content — flagged explicitly above so the planner does not copy them verbatim.

## Metadata

**Analog search scope:** `bin/motto.js`, `src/schema.js`, `src/config.js`, `src/build.js`, `src/lint.js`, `test/dogfood.test.js`, `skills/release/SKILL.md`, repo-root `motto.yaml`, `.gitignore`, `.claude-plugin/marketplace.json`
**Files scanned:** 10 (all read in full; all ≤ 300 lines, single-pass reads, no re-reads)
**Pattern extraction date:** 2026-07-02
