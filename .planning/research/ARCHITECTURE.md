# Architecture Research

**Domain:** Node.js lint/build CLI — self-hosting integration (v0.1.0)
**Researched:** 2026-06-30
**Confidence:** HIGH (all decisions derived by reading the live source tree; no speculation)

---

## Part 1 — v0.0.1 Core Architecture (existing, for context)

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  CLI Entry (bin/motto.js)                                        │
│  parse argv → call lintProject/buildProject → print → exitCode  │
├──────────────────────────┬──────────────────────────────────────┤
│  Orchestration           │                                       │
│  lint.js                 │  build.js                             │
│  (fs → schema core)      │  (lint-guard → fs → emit)            │
├───────┬──────────────────┴────────────┬──────────────────────────┤
│  IO shell (inline in lint.js/build.js)│  Pure Core               │
│  ┌──────────────┐ ┌────────────────┐  │  ┌──────────┐ ┌───────┐ │
│  │processConfig │ │discoverSkill   │  │  │frontmattr│ │schema │ │
│  │(reads yaml)  │ │Names/Skill     │  │  │.js       │ │.js    │ │
│  └──────────────┘ └────────────────┘  │  │(pure str)│ │(pure) │ │
└───────────────────────────────────────┴──────────────────────────┘
```

### Actual module shape (as-built — corrects pre-implementation plan)

| File | Layer | Exported symbol | Signature |
|------|-------|----------------|-----------|
| `src/frontmatter.js` | Pure core | `parseFrontmatter` | `(text) → {data, body, errors[]}` |
| `src/schema.js` | Pure core | `validateSkill` | `({dirName,data,body}, sharedRefs) → errors[]` |
| `src/config.js` | **Pure core** (takes text, not path) | `loadConfig` | `(text) → {config, errors[]}` |
| `src/lint.js` | IO orchestration | `lintProject` | `(projectRoot) → {ok, errors[], count}` |
| `src/build.js` | IO orchestration + emit | `buildProject` | `(projectRoot) → {ok, outDir, errors[], skillCount, bucketCount}` |
| `bin/motto.js` | CLI entry | (executable) | parse argv → call lint/build → exitCode |

`config.js` is pure (accepts a string, not a path). The IO wiring — read `motto.yaml` from disk, pass text to `loadConfig` — lives inside `lint.js` (`processConfig`) and `build.js`. `discover.js` was not created as a separate module; discover logic is inlined as private helpers in `lint.js` and `build.js`.

---

## Part 2 — v0.1.0 Self-Hosting Integration Architecture

### The Integration Question

Motto has no skills of its own. v0.1.0 adds a real `skills/` tree + `motto.yaml` to the repo and wires a dogfood test into `node --test`. The key tension: `buildProject(projectRoot)` **wipes and rewrites `dist/`**. If the dogfood test passes the repo root as `projectRoot`, every `npm test` / pre-commit hook destroys the repo's `dist/`.

### Repo Layout After v0.1.0

```
motto/                              ← repo root (REPO_ROOT)
├── bin/motto.js                    unchanged
├── src/                            unchanged + possible gap-fix edits
│   ├── frontmatter.js
│   ├── schema.js
│   ├── config.js
│   ├── lint.js
│   └── build.js
├── test/
│   ├── build.test.js               unchanged
│   ├── config.test.js              unchanged
│   ├── frontmatter.test.js         unchanged
│   ├── lint.test.js                unchanged
│   ├── schema.test.js              unchanged
│   └── dogfood.test.js             NEW — integration regression guard
├── skills/                         NEW — Motto's own skill source files
│   ├── <public-skill>/
│   │   └── SKILL.md
│   └── <private-skill>/
│       └── SKILL.md
├── shared/                         NEW — shared reference files
│   └── references/
│       └── <ref>.md
├── motto.yaml                      NEW — Motto's own project config
├── dist/                           RUNTIME ARTIFACT — gitignored; never written by tests
├── package.json                    unchanged
├── .gitignore                      unchanged (dist/ already listed)
└── .husky/pre-commit               unchanged (npm test covers dogfood automatically)
```

### Component Responsibilities

| Component | Status | Responsibility | Integration point |
|-----------|--------|----------------|-------------------|
| `motto.yaml` (repo root) | NEW | Project identity: name, version, description, plugins.public, plugins.private | Read by `lintProject(REPO_ROOT)` and `buildProject(tempDir)` |
| `skills/<name>/SKILL.md` | NEW (≥2) | Real Motto skill content — ≥1 public, ≥1 private | Discovered by `lintProject` / `buildProject` |
| `shared/references/<ref>.md` | NEW (≥1) | Shared reference bundled into each skill at build | Bundled by `buildProject` |
| `dist/` (repo root) | EXISTING (gitignored) | Build output — written by `motto build` CLI invocations | NOT written by any test; developers run `motto build` manually |
| `test/dogfood.test.js` | NEW | Integration regression guard: lint passes + build produces expected output | Discovered by `node --test` auto-discovery; calls `lintProject(REPO_ROOT)` and `buildProject(tempDir)` |
| `src/*.js` | POSSIBLY MODIFIED | Schema/lint/build gap fixes surfaced by dogfooding real content | Modified only if gaps are discovered |

---

## Architectural Patterns

### Pattern 1: Split lint and build concerns in the dogfood test

**What:** Lint is read-only. Build is destructive. Treat them separately in the dogfood test.

- **Lint assertion**: call `lintProject(REPO_ROOT)` directly. No mutation, no temp dir needed. This is equivalent to the developer running `motto lint` — a pure read operation over the real tree.
- **Build assertion**: copy `skills/`, `shared/`, `motto.yaml` to a `mkdtemp` temp dir, then call `buildProject(tempDir)`. The wipe runs on `tempDir/dist`, not `REPO_ROOT/dist`.

**Why this split:** `buildProject` calls `rm(distDir, {recursive:true,force:true})` unconditionally (step 4 in build.js). If `projectRoot = REPO_ROOT`, every test run destroys whatever `dist/` the developer last built. This turns the pre-commit hook from a regression guard into an adversary.

**Trade-off:** The build test uses a copy of the source tree, so it's testing the snapshot at test time. This is correct — the test asserts the committed tree builds cleanly, not some in-flight edit.

```js
// test/dogfood.test.js — canonical shape

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { lintProject } from '../src/lint.js';
import { buildProject } from '../src/build.js';

// Two dirname() calls: test/dogfood.test.js → test/ → repo root
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

describe('dogfood: Motto self-validates its own skills tree', () => {
  it('lintProject passes with zero errors on the real skills/ tree', async () => {
    const result = await lintProject(REPO_ROOT);
    assert.strictEqual(result.ok, true, JSON.stringify(result.errors, null, 2));
  });

  it('buildProject produces expected dist/ layout (isolated temp dir)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'motto-dogfood-'));
    try {
      // Copy real source tree to isolated temp dir — build writes tmp/dist, not REPO_ROOT/dist
      await cp(join(REPO_ROOT, 'skills'), join(tmp, 'skills'), { recursive: true });
      await cp(join(REPO_ROOT, 'shared'), join(tmp, 'shared'), { recursive: true });
      await cp(join(REPO_ROOT, 'motto.yaml'), join(tmp, 'motto.yaml'));

      const result = await buildProject(tmp);
      assert.strictEqual(result.ok, true, JSON.stringify(result.errors, null, 2));
      // Assert specific structure: skill counts, bucket counts, plugin names
      // e.g.: assert.strictEqual(result.skillCount, 2);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
```

### Pattern 2: REPO_ROOT via `import.meta.url`

**What:** Compute the absolute repo root from the test file's own URL — not from `process.cwd()`.

```js
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// test/dogfood.test.js → test/ → repo root
```

**Why not `process.cwd()`:** `npm test` happens to run from the package root, so `process.cwd()` works. But `node --test test/dogfood.test.js` run from a different directory breaks silently. `import.meta.url` is always an absolute URL for the file, stable regardless of invocation directory.

### Pattern 3: `node --test` auto-discovery of `dogfood.test.js`

**What:** `node --test` (the `"test"` script in `package.json`) discovers all `*.test.js` files recursively from the package root. Adding `test/dogfood.test.js` is sufficient — no `package.json` change needed.

**Discovery collision check:**
- `skills/` directories contain `SKILL.md`, not `*.test.js` — not discovered
- `shared/references/` contains `.md` files — not discovered
- `dist/` contains `.json` and `.md` files — not discovered (and usually absent during test runs)
- `node_modules/` — excluded by default in Node 20+

No runner config changes required.

---

## Data Flow

### Dogfood Lint Flow (read-only, real tree)

```
test/dogfood.test.js
    │
    └─ lintProject(REPO_ROOT)
           ├─ processConfig(REPO_ROOT)     reads REPO_ROOT/motto.yaml
           ├─ loadSharedRefs(REPO_ROOT)    reads REPO_ROOT/shared/references/*.md → Set
           ├─ discoverSkillNames()         reads REPO_ROOT/skills/ → sorted names[]
           └─ processSkill() × N          reads each REPO_ROOT/skills/<n>/SKILL.md
                                           calls parseFrontmatter → validateSkill
           ↓
    assert result.ok === true
    (no files written anywhere)
```

### Dogfood Build Flow (isolated temp dir)

```
test/dogfood.test.js
    │
    ├─ mkdtemp() → /tmp/motto-dogfood-XXXXX/   (OS temp, not repo)
    ├─ cp(REPO_ROOT/skills  → tmp/skills,  {recursive})
    ├─ cp(REPO_ROOT/shared  → tmp/shared,  {recursive})
    ├─ cp(REPO_ROOT/motto.yaml → tmp/motto.yaml)
    │
    └─ buildProject(tmp)
           ├─ lintProject(tmp)              [gate — reads tmp/]
           ├─ loadConfig(tmp/motto.yaml)
           ├─ discoverSkillNames(tmp/skills)
           ├─ pre-pack checks
           ├─ rm(tmp/dist, recursive)       ← wipes tmp/dist, NOT REPO_ROOT/dist
           ├─ cp(tmp/skills/<n> → tmp/dist/...)
           └─ writeFile(tmp/dist/.../plugin.json)
           ↓
    assert result.ok === true
    ↓
    rm(tmp, recursive)                      ← cleanup
```

---

## Anti-Patterns

### Anti-Pattern 1: Dogfood build test calls `buildProject(REPO_ROOT)`

**What people do:** Pass `REPO_ROOT` to `buildProject` in the dogfood test for simplicity — the real tree is already there.

**Why it's wrong:** `buildProject` runs `rm(join(projectRoot,'dist'), {recursive:true,force:true})` in step 4 before writing. Every `npm test` invocation — including every Husky pre-commit hook — wipes the repo's `dist/`. A developer who runs `motto build` and then `git commit` finds their build gone. If two tests run in the same process and one expects `dist/` to exist, test order becomes load-bearing.

**Do this instead:** Copy `skills/`, `shared/`, `motto.yaml` to `mkdtemp`, call `buildProject(tempDir)`. The lint sub-test can still call `lintProject(REPO_ROOT)` — lint never writes.

### Anti-Pattern 2: Placing `skills/` inside `src/`, `test/`, or a nested subdirectory

**What people do:** Put the real skills tree at `src/skills/` or `example/` to "group it with the code".

**Why it's wrong:** Motto users place `skills/` at repo root. Putting it elsewhere in Motto's own repo means the dogfood doesn't mirror the user experience — the regression guard tests a different layout than what users actually have. Also, `lintProject(process.cwd())` and `lintProject(REPO_ROOT)` diverge from what `motto lint` would do when run from the CLI.

**Do this instead:** `skills/`, `shared/`, `motto.yaml` at repo root — the canonical Motto project layout.

### Anti-Pattern 3: Asserting on `dist/` contents at `REPO_ROOT/dist` in tests

**What people do:** After the build test, read assertions from `join(REPO_ROOT, 'dist', ...)`.

**Why it's wrong:** The isolated build test writes to `tmp/dist`, not `REPO_ROOT/dist`. Reading from `REPO_ROOT/dist` asserts on whatever the last manual `motto build` left behind — a phantom dependency on developer state.

**Do this instead:** All assertions read from `join(tmp, 'dist', ...)`. The temp dir is the single source of truth for the build test.

### Anti-Pattern 4: Using unit-test fixture helpers to author real skill content

**What people do:** Reuse `makeSkillMd(name)` from `build.test.js` to generate `SKILL.md` content for the real `skills/` tree.

**Why it's wrong:** Unit-test helpers produce minimal synthetic content. The real `skills/` tree should contain actual documentation that exercises the schema fully (including `shared_references`, `template:`, body spine, etc.). Using synthetic helpers defeats the dogfood purpose — the whole point is to lint content that a human would author.

**Do this instead:** Hand-author the real `SKILL.md` files. This is the dogfood moment — if authoring is painful, that's signal to fix the schema.

---

## Integration Points — New vs Modified Files

### New Files

| Path | Why new |
|------|---------|
| `motto.yaml` | Motto's own project config — required by `lintProject` / `buildProject` |
| `skills/<public-skill>/SKILL.md` | ≥1 public-audience skill |
| `skills/<private-skill>/SKILL.md` | ≥1 private-audience skill |
| `shared/references/<ref>.md` | ≥1 shared reference (required for full schema surface coverage) |
| `test/dogfood.test.js` | Lint + build integration test; permanent regression guard |

### Possibly Modified Files (gap fixes)

| Path | When modified |
|------|--------------|
| `src/schema.js` | If authoring real content surfaces a validation gap |
| `src/lint.js` | If a lint orchestration edge case appears |
| `src/build.js` | If a build edge case appears (e.g., `shared/` copy behavior) |
| `src/config.js` | If `motto.yaml` config validation is missing a rule |

### Unchanged Files

| Path | Reason |
|------|--------|
| `bin/motto.js` | CLI unchanged |
| `test/*.test.js` (existing 5) | Unit tests use `mkdtemp` fixtures; no conflict with real tree |
| `.gitignore` | `dist/` already listed |
| `package.json` | No new deps; `node --test` auto-discovers `dogfood.test.js` |
| `.husky/pre-commit` | `npm test` already runs everything; dogfood test becomes a free regression guard |

---

## Suggested Build Order

Two sub-phases within Phase 4 (content-first, then wire test).

**Sub-phase 4a — Author real content + fix gaps**

1. Create `motto.yaml` with valid project config (name, version, description, `plugins.public`, `plugins.private`)
2. Author `skills/<public-skill>/SKILL.md` — hand-written real documentation content
3. Author `skills/<private-skill>/SKILL.md`
4. Author `shared/references/<ref>.md` — referenced by at least one skill's `shared_references:`
5. Run `node bin/motto.js lint` from repo root — expect clean; fix any schema/lint gaps in `src/`
6. Run `npm test` — existing 53 unit tests must still pass after any gap fixes
7. Run `node bin/motto.js build` from repo root — inspect `dist/` manually; fix any build gaps

**Sub-phase 4b — Wire dogfood test**

1. Write `test/dogfood.test.js`:
   - Lint assertion: `lintProject(REPO_ROOT)` → `result.ok === true`
   - Build assertion: copy to `mkdtemp`, `buildProject(tmp)` → `result.ok`, `skillCount`, `bucketCount`, specific plugin names from `motto.yaml`
2. Run `npm test` — all tests (53 existing + dogfood) must pass
3. Commit — Husky pre-commit now catches any future skill authoring that breaks lint/build

**Why content-first (not TDD):** The skill names and plugin names in `motto.yaml` must be known before you can write specific assertions in `dogfood.test.js` (e.g., `assert.strictEqual(result.skillCount, 2)`). Authoring content first makes the test assertions concrete rather than provisional.

**Dependency chain within 4a:**
`motto.yaml` (lint needs it) → `skills/` content (lint validates it) → `shared/references/` (lint resolves refs) → gap fixes in `src/` → `npm test` green. Only then write `dogfood.test.js`.

---

## Collision Risk Analysis

| Risk | Assessment | Mitigation |
|------|------------|------------|
| `skills/` naming conflicts with Node.js conventions | None — Node has no special treatment for this dirname | None needed |
| `node --test` discovers files in `skills/` or `dist/` | No — only `*.test.js` / `*.spec.js` are discovered; `.md` and `.json` are ignored | None needed |
| `shared/` conflicts with existing tooling | None | None needed |
| `motto.yaml` at root read by tools other than Motto | Harmless — it's a custom YAML file with no standard meaning | None needed |
| `dist/` mutated by tests | **Real hazard** — addressed by Pattern 1 (temp dir isolation for build tests) | Use `mkdtemp` in dogfood build test |
| Gap fixes in `src/` break existing 53 unit tests | Possible if a fix changes error message text that tests assert on | Run `npm test` after each gap fix before committing |

---

## Sources

- `/Users/jeremie/Projects/motto/src/build.js` — confirms `rm(join(projectRoot,'dist'), ...)` at step 4; confirmed `buildProject(projectRoot)` signature
- `/Users/jeremie/Projects/motto/src/lint.js` — confirms `lintProject(projectRoot)` is read-only (no fs writes)
- `/Users/jeremie/Projects/motto/test/build.test.js` — confirms `mkdtemp` isolation pattern used throughout existing tests
- `/Users/jeremie/Projects/motto/.gitignore` — confirms `dist/` already gitignored
- `/Users/jeremie/Projects/motto/.husky/pre-commit` — confirms `npm test` runs on every commit
- `/Users/jeremie/Projects/motto/package.json` — confirms `"test": "node --test"` (auto-discovery); no existing test glob config
- `/Users/jeremie/Projects/motto/.planning/PROJECT.md` — v0.1.0 goals: ≥1 public + ≥1 private + ≥1 shared ref; Phase numbering continues from 4

---
*Architecture research for: Motto v0.1.0 Self-Hosting Integration*
*Researched: 2026-06-30*
