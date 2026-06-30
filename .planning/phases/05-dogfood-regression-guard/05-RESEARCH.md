# Phase 5: Dogfood Regression Guard — Research

**Researched:** 2026-06-30
**Domain:** node:test dogfood test + NAME_KEBAB parity self-test
**Confidence:** HIGH (all findings derived from live src/ and test/ code; line numbers cited)

---

## Purpose

This research builds directly on the settled findings in SUMMARY.md and 04-RESEARCH.md. It does NOT restate what is already documented there (lint in-place, mkdtemp copy rationale, REPO_ROOT anchor, zero new deps). It supplies the implementation-ready specifics the planner needs to write tasks:

1. **Exact test skeleton** for `test/dogfood.test.js` — imports, structure, assertions.
2. **DOG-04 resolution** — the concrete approach for asserting NAME_KEBAB parity, including the required src/ change, with a definitive recommendation.
3. **Where DOG-04 lives** — which file, which describe block.
4. **Brittleness checklist** — what would make assertions flaky or falsely-green.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOG-03 | `node:test` dogfood test: lint REPO_ROOT in-place + build mkdtemp copy; assert clean lint + expected dist/ artifacts; runs on every commit | §Dogfood Test Skeleton — exact structure, imports, assertions |
| DOG-04 | Self-test asserts NAME_KEBAB is identical between src/schema.js and src/config.js | §DOG-04 Strategy — definitive resolution; requires one-line src/config.js change |
</phase_requirements>

---

## DOG-04 Strategy — Definitive Resolution

### Current state (confirmed by reading src/config.js)

`src/schema.js:33`:
```js
export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```
Exported. [VERIFIED: src/schema.js:33]

`src/config.js:35`:
```js
const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```
**NOT exported.** Module-private. The comment at config.js:16-17 explicitly labels this "Intentional duplicate of NAME_KEBAB exported from src/schema.js (D-08, D-16)" and calls schema.js the source of truth. [VERIFIED: src/config.js:35]

### Options

**Option A — Export from config.js (RECOMMENDED)**

Change `src/config.js:35` from:
```js
const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```
to:
```js
export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```

Then in the test, directly compare the two imports:
```js
import { NAME_KEBAB as schemaKebab } from '../src/schema.js';
import { NAME_KEBAB as configKebab } from '../src/config.js';

it('NAME_KEBAB .source is identical in schema.js and config.js (DOG-04)', () => {
  assert.strictEqual(
    schemaKebab.source,
    configKebab.source,
    'NAME_KEBAB source must match: schema.js is the source of truth',
  );
  assert.strictEqual(
    schemaKebab.flags,
    configKebab.flags,
    'NAME_KEBAB flags must match between schema.js and config.js',
  );
});
```

Why `.source` and `.flags` separately: RegExp equality in JS compares by identity (`===`), not by pattern. `assert.strictEqual(schemaKebab, configKebab)` would always fail even for identical patterns. Comparing `.source` (the pattern string) and `.flags` (the modifier string) covers the full regex identity. Both are currently empty-string flags (no `g`, `m`, `i`, etc.).

The `export` keyword change is one character added to one line. It does not change the validation behavior of `loadConfig`. The existing config tests do not import `NAME_KEBAB` directly (they test `loadConfig` behavior), so they are unaffected.

**Option B — Read source as text (NOT recommended)**

Read `src/config.js` as a string and extract the regex literal with a regex. This is fragile — it depends on exact source formatting and is confusing for readers. Discard.

### Recommendation

**Use Option A.** Add `export` to `src/config.js:35`. This is a one-character change that makes the intent ("these must stay identical") machine-verifiable. The comment at config.js:16 already says the two must match; the export makes that claim testable.

### Where DOG-04 lives

`test/dogfood.test.js` — as the first `describe` block in the file, before the I/O-heavy lint and build tests. Rationale: DOG-04 is a meta-consistency assertion about the project itself (two source files staying in sync), not a behavioral unit test of either module. It belongs with the other self-consistency tests in the dogfood file, not in schema.test.js or config.test.js where it would be out of context.

---

## Dogfood Test Skeleton

### Imports and REPO_ROOT

```js
// test/dogfood.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, cp, readFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { lintProject } from '../src/lint.js';
import { buildProject } from '../src/build.js';
import { NAME_KEBAB as schemaKebab } from '../src/schema.js';
import { NAME_KEBAB as configKebab } from '../src/config.js'; // requires export (DOG-04 change)

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// test/dogfood.test.js lives one level inside repo root, so '..' resolves correctly.
// NEVER use process.cwd() — it shifts with the working directory at invocation.
```

`fileURLToPath` + `dirname` + `resolve('..')` is the same anchor pattern used in
`bin/motto.js` (if present) and recommended in SUMMARY.md. [VERIFIED: node:url stdlib; SUMMARY.md §Architecture]

### DOG-04 describe block

```js
// ── DOG-04: NAME_KEBAB parity ─────────────────────────────────────────────────
describe('NAME_KEBAB parity (DOG-04)', () => {
  it('NAME_KEBAB .source is identical in schema.js and config.js', () => {
    assert.strictEqual(
      schemaKebab.source,
      configKebab.source,
      'NAME_KEBAB source must match: schema.js is the source of truth',
    );
    assert.strictEqual(
      schemaKebab.flags,
      configKebab.flags,
      'NAME_KEBAB flags must match between schema.js and config.js',
    );
  });
});
```

This test is synchronous (no async). Both imports resolve at module load time. No filesystem I/O. Fast and deterministic.

### DOG-03 lint describe block

```js
// ── DOG-03: Lint the real repo root in-place (read-only) ─────────────────────
describe('dogfood lint (DOG-03)', () => {
  it('lintProject on REPO_ROOT returns ok:true with count=3', async () => {
    const result = await lintProject(REPO_ROOT);
    assert.strictEqual(
      result.ok,
      true,
      `lint failed:\n${JSON.stringify(result.errors, null, 2)}`,
    );
    assert.strictEqual(result.count, 3, `expected 3 skills, got ${result.count}`);
    assert.deepStrictEqual(result.errors, []);
  });
});
```

`lintProject` returns `{ ok, errors, count }` [VERIFIED: src/lint.js:183-207]. `count` equals `skillNames.length` — the number of discovered skill directories. [VERIFIED: src/lint.js:206] No filesystem mutation occurs (lint is read-only). No setup/teardown needed.

Why `assert.deepStrictEqual(result.errors, [])` in addition to `result.ok`: belt-and-suspenders. `ok` is derived from `errors.length === 0` [VERIFIED: src/lint.js:206], so both assertions check the same invariant from different angles. If `ok` is wrong by a bug, the second assertion catches it with the actual error list in the message.

### DOG-03 build describe block

The build test uses `before()`/`after()` at the describe level (same pattern as `test/lint.test.js:76-85`). The build runs once; multiple `it()` blocks assert different properties of the same output. This is more efficient than a per-test mkdtemp (build is the expensive step).

```js
// ── DOG-03: Build against an isolated mkdtemp copy ───────────────────────────
describe('dogfood build (DOG-03)', () => {
  let tempDir;
  let buildResult;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-dogfood-'));
    // Copy only the three inputs buildProject reads. NEVER copy dist/:
    // buildProject wipes projectRoot/dist — copying dist/ would be irrelevant
    // and copying it then running buildProject(REPO_ROOT) would wipe the real dist/.
    await cp(join(REPO_ROOT, 'skills'), join(tempDir, 'skills'), { recursive: true });
    await cp(join(REPO_ROOT, 'shared'), join(tempDir, 'shared'), { recursive: true });
    await cp(join(REPO_ROOT, 'motto.yaml'), join(tempDir, 'motto.yaml'));
    buildResult = await buildProject(tempDir);
  });

  after(async () => {
    // rm tempDir regardless of test outcome — node:test runs after() even on failure.
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  // ── Return shape ─────────────────────────────────────────────────────────────
  it('buildProject returns ok:true with skillCount=3 and bucketCount=2', () => {
    assert.strictEqual(
      buildResult.ok,
      true,
      `build failed:\n${JSON.stringify(buildResult.errors, null, 2)}`,
    );
    assert.strictEqual(buildResult.skillCount, 3);
    assert.strictEqual(buildResult.bucketCount, 2); // public + private
    assert.deepStrictEqual(buildResult.errors, []);
  });

  // ── Public bucket skill files ─────────────────────────────────────────────────
  it('dist/public/authoring-a-skill/SKILL.md exists', async () => {
    await stat(join(tempDir, 'dist', 'public', 'authoring-a-skill', 'SKILL.md'));
    // stat throws ENOENT if missing; test fails with a clear error code
  });

  it('dist/public/motto-project-setup/SKILL.md exists', async () => {
    await stat(join(tempDir, 'dist', 'public', 'motto-project-setup', 'SKILL.md'));
  });

  // ── Shared reference bundling ─────────────────────────────────────────────────
  it('authoring-a-skill has references/skill-schema.md bundled', async () => {
    await stat(join(tempDir, 'dist', 'public', 'authoring-a-skill', 'references', 'skill-schema.md'));
  });

  it('motto-project-setup has references/skill-schema.md bundled', async () => {
    await stat(join(tempDir, 'dist', 'public', 'motto-project-setup', 'references', 'skill-schema.md'));
  });

  // ── Private bucket ────────────────────────────────────────────────────────────
  it('dist/private/motto-release/SKILL.md exists', async () => {
    await stat(join(tempDir, 'dist', 'private', 'motto-release', 'SKILL.md'));
  });

  it('motto-release has no references/ directory (no shared_references declared)', async () => {
    await assert.rejects(
      () => stat(join(tempDir, 'dist', 'private', 'motto-release', 'references')),
      { code: 'ENOENT' },
      'motto-release must not have references/ — it declares no shared_references',
    );
  });

  // ── plugin.json contents ──────────────────────────────────────────────────────
  it('public plugin.json has name=motto-skills, version present, description present', async () => {
    const raw = await readFile(
      join(tempDir, 'dist', 'public', '.claude-plugin', 'plugin.json'),
      'utf8',
    );
    const manifest = JSON.parse(raw);
    assert.strictEqual(manifest.name, 'motto-skills');
    assert.ok(manifest.version, 'version must be present in public plugin.json');
    assert.ok(manifest.description, 'description must be present in public plugin.json');
    // version intentionally checked via assert.ok, not strictEqual('0.0.2'),
    // so the assertion survives a version bump without editing this test.
  });

  it('private plugin.json has name=motto-private, version present', async () => {
    const raw = await readFile(
      join(tempDir, 'dist', 'private', '.claude-plugin', 'plugin.json'),
      'utf8',
    );
    const manifest = JSON.parse(raw);
    assert.strictEqual(manifest.name, 'motto-private');
    assert.ok(manifest.version, 'version must be present in private plugin.json');
  });
});
```

`buildProject` returns `{ ok, outDir, errors, skillCount, bucketCount }` [VERIFIED: src/build.js:207-213]. `outDir` equals `join(projectRoot, 'dist')` [VERIFIED: src/build.js:149,208]. The wipe happens at build.js:150 — `rm(distDir, { recursive: true, force: true })` — only on the temp copy, never on REPO_ROOT.

### cp recursion and verbatimSymlinks

`cp(src, dst, { recursive: true })` — no `verbatimSymlinks` needed for the SOURCE COPY step. The real `skills/` + `shared/` tree contains only regular files (no symlinks exist in the Phase 4 authored content). If a future skill adds a symlink, the copy step would dereference it, producing a regular file in tempDir. This is acceptable for the dogfood test (the test validates BUILD output, not source structure). [ASSUMED — no symlinks confirmed by Phase 4 content authoring; no findSymlink check run]

`buildProject` internally uses `verbatimSymlinks: true` when copying from tempDir to tempDir/dist/ [VERIFIED: src/build.js:164-167]. This is a build.js concern, not a concern for the dogfood test's own cp call.

---

## Assertions: Robust vs Brittle

### Use (robust)

| Assertion | Why robust |
|-----------|-----------|
| `assert.ok(manifest.version)` | Passes on any non-empty version string; survives version bumps |
| `await stat(path)` — throws if missing | Clean ENOENT failure; single-purpose |
| `assert.strictEqual(result.count, 3)` | Spec-required count; fails deliberately when skills are added/removed |
| `assert.strictEqual(result.skillCount, 3)` | Same |
| `assert.strictEqual(manifest.name, 'motto-skills')` | Plugin name is part of the config spec; stable |
| `assert.deepStrictEqual(result.errors, [])` | Catches non-empty error arrays even when ok is somehow true |
| `schemaKebab.source` vs `configKebab.source` | String comparison of regex pattern — immune to object identity |

### Avoid (brittle)

| Pattern | Problem | Alternative |
|---------|---------|-------------|
| `assert.strictEqual(manifest.version, '0.0.2')` | Breaks on every version bump | `assert.ok(manifest.version)` |
| `assert.deepStrictEqual(Object.keys(manifest), ['name', 'version', 'description'])` | Tests JSON key order (implementation detail); see build.test.js:212 for the existing pattern — acceptable in build tests, not dogfood | Assert individual keys only |
| `assert.strictEqual(distContent, srcContent)` full-file equality | Would fail if build ever normalizes line endings or adds a newline | Not needed; `stat()` is sufficient to confirm copy happened |
| Asserting only `result.count` and `result.bucketCount`, not specific skill names | A wrong skill name would pass | Assert specific paths: `dist/public/authoring-a-skill/SKILL.md` |
| `assert.strictEqual(schemaKebab, configKebab)` | RegExp identity comparison always fails (two different objects) | `.source` + `.flags` |

---

## Structural Decisions

### One test file: `test/dogfood.test.js`

All three groups (DOG-04 parity, DOG-03 lint, DOG-03 build) live in one file. Rationale: they share the thematic purpose of "testing the project against itself". Three separate describe blocks provide isolation without file fragmentation.

`node --test` auto-discovers all `test/*.test.js` [VERIFIED: Node.js test runner docs; CLAUDE.md §Technology Stack]. No configuration change needed to include the new file.

### Husky pre-commit hook

The requirement says "husky pre-commit hook runs the dogfood test on every commit". The existing hook already runs `npm test` (per SUMMARY.md §Architecture). Adding `test/dogfood.test.js` is automatically included since `node --test` discovers it. No hook change needed unless husky currently does NOT run `npm test`. Confirm by reading `.husky/pre-commit` before wiring a new hook.

### Test count

The existing suite has 53 tests [VERIFIED: ROADMAP.md §Phase 4]. Adding this file contributes:
- 1 test in DOG-04 describe
- 1 lint test
- 8 build tests

Total new tests: 10. Post-phase count: 63+ (exact count depends on whether any other tests were added in Phase 4 gap-fix work).

---

## Brittleness Checklist

- [ ] **Version hardcoding**: Do NOT assert `manifest.version === '0.0.2'`. Use `assert.ok(manifest.version)`. On next version bump, the test stays green.
- [ ] **Skill count as only guard**: `result.count === 3` is necessary but not sufficient. Also assert that the specific skill directory paths exist in dist/. A misconfigured skill could be replaced by a different-named one while count stays at 3.
- [ ] **process.cwd() as REPO_ROOT**: Never use it. `resolve(dirname(fileURLToPath(import.meta.url)), '..')` is the correct anchor.
- [ ] **Building against REPO_ROOT**: `buildProject(REPO_ROOT)` would wipe the repo's own `dist/`. Always call `buildProject(tempDir)` where `tempDir` is a mkdtemp copy.
- [ ] **Leaving tempDir on failure**: node:test runs `after()` even when tests fail. The `if (tempDir)` guard handles the edge case where `before()` throws before assigning `tempDir`.
- [ ] **Fixture pollution in skills/**: `skills/` must contain exactly the 3 authored directories. If a stray test fixture were placed in `skills/`, it would be copied into tempDir and processed by buildProject, changing `skillCount`. Guard: the lint assertion `result.count === 3` would catch this.
- [ ] **DOG-04 import before export change**: If `src/config.js:35` does not have `export`, the import of `configKebab` fails with a SyntaxError at module load — ALL tests in the file fail, not just DOG-04. The export change to config.js MUST land in the same task (or a prior task) as the test file.
- [ ] **RegExp flags**: Current NAME_KEBAB in both files has no flags (empty string). The `.flags` assertion guards against someone adding a flag to one but not the other.

---

## Required src/ Change

**File:** `src/config.js`  
**Line:** 35  
**Change:** Add `export` keyword to the `const NAME_KEBAB` declaration.

Before:
```js
const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```

After:
```js
export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
```

This is the only src/ change required by Phase 5. It has no behavioral effect on `loadConfig` (the const is used identically inside the function). It does not break any existing config tests. [VERIFIED: src/config.js — no existing import of NAME_KEBAB from config.js anywhere in test/]

Verify no existing tests import from config.js in a way that would be disturbed:
```bash
grep -r 'from.*config' test/
```
Expected: only `lintProject`/`buildProject` call chains reach `loadConfig` indirectly; no direct NAME_KEBAB import from config.js exists in any current test file. [ASSUMED — grep not run; confirm before writing the task]

---

## Environment Availability

Step 2.6: SKIPPED — Phase 5 is code-only (test file + one-line src change). No external tools, services, or runtimes beyond Node ≥20 (already confirmed on this machine).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (stdlib, Node ≥ 20) |
| Discovery | `node --test` from repo root, auto-discovers `test/*.test.js` |
| Quick run | `node --test` |
| Full suite | `node --test` |
| Config file | None — zero-config |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| DOG-03 | lint REPO_ROOT returns ok:true, count=3 | unit (I/O) | `node --test test/dogfood.test.js` | In-place read, no mutation |
| DOG-03 | buildProject(tempDir) returns ok:true, skillCount=3, bucketCount=2 | unit (I/O) | same | tempDir created in before() |
| DOG-03 | dist/ artifacts: SKILL.md + bundled refs + plugin.json per bucket | unit (I/O) | same | 7 stat assertions |
| DOG-04 | NAME_KEBAB .source + .flags identical across schema.js and config.js | unit (pure) | same | Requires export change to config.js:35 |

### Wave 0 Gaps

- [ ] `test/dogfood.test.js` — does not exist yet; must be created
- [ ] `src/config.js:35` — `export` keyword missing; must be added before test file imports work

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| REPO_ROOT anchor | test file (import.meta.url) | — | Path resolved at test load time; immutable |
| Lint assertion (read-only) | test/dogfood.test.js | src/lint.js | lintProject is already the correct API |
| Build isolation (mkdtemp copy) | test/dogfood.test.js | node:os tmpdir | tempDir scoped to describe block via before/after |
| NAME_KEBAB export | src/config.js | — | One-character addition to make the const importable |
| NAME_KEBAB comparison | test/dogfood.test.js | src/schema.js, src/config.js | Import both, compare .source and .flags |

---

## Sources

All claims verified against live source code. No external research required.

| File | Key facts verified | Lines |
|------|--------------------|-------|
| `src/schema.js` | `NAME_KEBAB` exported via `export const` | 33 |
| `src/config.js` | `NAME_KEBAB` is a private `const`, NOT exported; comment labels it an intentional duplicate | 16-17, 35 |
| `src/lint.js` | `lintProject` return shape: `{ ok, errors, count }` where count = skillNames.length | 183, 206-207 |
| `src/build.js` | `buildProject` return shape: `{ ok, outDir, errors, skillCount, bucketCount }`; dist wipe at step 4 | 89-94, 149-150, 207-213 |
| `src/build.js` | `cp` uses `verbatimSymlinks: true` for skill copy step | 164-167 |
| `test/lint.test.js` | `before()`/`after()` describe-level pattern; shared `root` variable | 1, 76-85 |
| `test/build.test.js` | `mkdtemp` + try/finally per-test pattern; `stat()` for presence assertions; `readFile`+`JSON.parse` for plugin.json | 92-110, 119-123, 200-222 |

**Confidence:** HIGH — all implementation decisions trace to concrete line numbers in live code.
