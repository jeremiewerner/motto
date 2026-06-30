# Phase 03: motto-build — Research

**Researched:** 2026-06-30
**Domain:** Node.js file I/O — fs.cp symlinks, fs.rm, plugin manifest, dist/ tree construction
**Confidence:** HIGH (all critical patterns verified against Node 24.14.1 in this session)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Lint-first gate (BUILD-01, CLI-02)**
- D3-01: `motto build` calls `lintProject(cwd)` first. If `result.ok` is false, print identical diagnostics to `motto lint`, write nothing to `dist/`, exit 1.
- D3-02: lint gate runs BEFORE the `dist/` wipe — failing build must never destroy a previous good `dist/`. Order: lint → (ok?) → wipe → pack → report.

**dist/ wipe (BUILD-02)**
- D3-03: On passing build, `./dist` is wiped whole (`fs.rm('./dist', {recursive:true, force:true})`) then rebuilt from scratch. No incremental writes, no "error if exists".

**Verbatim copy & shared-ref bundling (BUILD-02, BUILD-03, BUILD-06)**
- D3-04: Copy unit is the whole `skills/<name>/` directory verbatim into `dist/<audience>/<name>/` via `fs.cp(src, dst, {recursive:true})`.
- D3-05: Symlinks NOT dereferenced — preserved as symlinks. Use `dereference:false` / `verbatimSymlinks:true` as appropriate; **planner confirms the exact option** (research answers this — see `## fs.cp Symlink Behavior`).
- D3-06: Declared `shared_references` bundled by copying `shared/references/<ref>.md` → `dist/<audience>/<name>/references/<ref>.md`.
- D3-07: Collision is a build error. If a declared `shared_reference` basename collides with a local `references/<ref>.md`, fail with named error, write nothing further.
- D3-08: Layout invariant: skills are SIBLINGS of `.claude-plugin/`, never nested inside it.

**Audience routing & bucket emission (BUILD-04, BUILD-05)**
- D3-09: Each skill routes to `dist/<audience>/<name>/` by its `audience` field.
- D3-10: `dist/public/` always emitted (plugins.public is required).
- D3-11: `dist/private/` emitted only when at least one skill is `audience: private` AND `plugins.private` is set.
- D3-12: Contradiction = build error: private skill with `plugins.private` unset → error, exit 1, write nothing.

**plugin.json contents (BUILD-04)**
- D3-13: Each bucket's `.claude-plugin/plugin.json` contains exactly: `name` (plugins.public or plugins.private), `version` (from motto.yaml), `description` (from motto.yaml).
- D3-14: No passthrough of arbitrary extra keys in v1.

**CLI surface (CLI-02)**
- D3-15: Wire `build` branch in `bin/motto.js`. cwd-only, same parseArgs dispatch, `process.exitCode` (never `process.exit(1)`).
- D3-16: On success: output dir + one-line summary (`✓ built dist/ — N skills, M plugin(s)`). On failure: lint diagnostics.

### Claude's Discretion
- Lint/build data reuse: build re-reads motto.yaml + skill dirs after lintProject gate (option a) vs refactor src/lint.js to return parsed data (option b). Research recommends one (see `## Lint/Build Data Reuse Recommendation`).
- Module decomposition: `src/build.js` exporting `buildProject(cwd) → { ok, outDir, errors }` strongly preferred.
- Exact wording of build error/success strings.

### Deferred Ideas (OUT OF SCOPE)
- `--zip` output (v2 CLIX-03)
- plugin.json passthrough fields
- MCP `dependencies` resolution at build
- Incremental/cached builds
- Distribution layer
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUILD-01 | `motto build` runs lint first; on failure writes nothing and surfaces same lint diagnostics | lintProject gate pattern; process.exitCode; D3-02 order enforced |
| BUILD-02 | `dist/` wiped, each skill copied verbatim into `dist/<audience>/<name>/` (symlinks not dereferenced) | fs.rm force semantics verified; fs.cp `verbatimSymlinks:true` confirmed as correct option |
| BUILD-03 | Declared `shared_references` bundled into each skill's `references/` in dist | stat-based collision check + single-file fs.cp pattern verified |
| BUILD-04 | Each bucket gets `.claude-plugin/plugin.json` from motto.yaml, always including `version` | manifest schema from CLAUDE.md; JSON.stringify(obj, null, 2) + '\n' pattern verified |
| BUILD-05 | Private bucket/plugin emitted only when private skills exist and `plugins.private` set | conditional bucket logic; D3-11/D3-12 |
| BUILD-06 | Skills are siblings of `.claude-plugin/` in dist, never nested inside it | layout pattern verified |
| CLI-02 | `motto build` builds project, reports output dir, reuses lint diagnostics on failure | bin/motto.js build branch wiring; process.exitCode pattern |
</phase_requirements>

---

## Summary

Phase 3 is a copy-and-assemble pipeline. All the hard logic (YAML parsing, schema validation, config validation) was shipped in Phases 1–2. Phase 3 adds one orchestrator (`src/build.js`), one critical fs operation (`fs.cp` with the right symlink option), and a thin JSON emitter for `plugin.json`.

The most important finding is a **macOS/Darwin-specific `fs.cp` gotcha** (see below): the default `dereference:false` behavior on macOS Node 24 converts relative symlink targets to absolute paths pointing into the source tree. Only `verbatimSymlinks:true` preserves relative symlinks correctly. This was verified empirically in this session.

The second finding is the recommendation on lint/build data reuse: Option A (build re-reads from disk) is recommended over Option B (refactoring src/lint.js) because it keeps the Phase 2 tested module untouched and `buildProject` self-contained.

**Primary recommendation:** `src/build.js` exports `buildProject(cwd) → { ok, outDir, errors }`. The function calls `lintProject` as its gate, then re-reads `motto.yaml` via `loadConfig` for plugin names/version, re-scans `skills/` for packaging. Use `fs.cp(src, dst, { recursive: true, verbatimSymlinks: true })` for all directory copies.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lint gate (validation) | `src/lint.js` (Phase 2, unchanged) | — | Reuse as-is; build is a consumer, not a reimplementation |
| Config data for packaging | `src/build.js` (re-reads via loadConfig) | `src/config.js` (pure validator) | Config read is I/O; belongs in the orchestrator |
| Skill discovery + audience routing | `src/build.js` | — | Filesystem concern; orchestrator-level |
| Collision detection | `src/build.js` | — | Cross-references skill data with local refs; needs both |
| dist/ wipe + directory creation | `src/build.js` | — | Filesystem mutation; orchestrator owns it |
| Verbatim copy + shared-ref bundling | `src/build.js` | — | Copy logic; one concern per helper function |
| plugin.json emission | `src/build.js` | — | JSON write; trivial, inline in bucket emitter |
| CLI wiring + output formatting | `bin/motto.js` | — | Thin renderer; mirrors lint branch |
| Schema validation / frontmatter | `src/schema.js`, `src/frontmatter.js` (Phase 1) | — | Unchanged; called only by lintProject |

---

## fs.cp Symlink Behavior (CRITICAL — D3-05)

### Empirically Verified on Node 24.14.1 / macOS Darwin

**The default `dereference:false` behavior is wrong for this use case on macOS.** Here is what each option does:

| Option | Symlink type | Link in dst | Target in dst |
|--------|-------------|-------------|---------------|
| `{ recursive: true }` (default) | relative `real.txt` | symlink ✓ | `/absolute/path/to/src/real.txt` ✗ |
| `{ recursive: true, dereference: false }` | relative `real.txt` | symlink ✓ | `/absolute/path/to/src/real.txt` ✗ |
| `{ recursive: true, dereference: true }` | relative `real.txt` | regular file ✗ | (no link) ✗ |
| `{ recursive: true, verbatimSymlinks: true }` | relative `real.txt` | symlink ✓ | `real.txt` (relative) ✓ |

**The correct option is `verbatimSymlinks: true`.** Without it, relative symlinks are silently rewritten to absolute paths pointing into the source tree — the copy is "a symlink" but it breaks when `dist/` is moved or distributed.

**File modes are preserved regardless of symlink option.** A file with `chmod 755` in the source arrives with `0o755` in the destination. [VERIFIED: node -e runtime test, Node 24.14.1]

**Version availability:** `verbatimSymlinks` was added in Node 16.15.0 / 17.6.0. Project requires Node ≥ 20 — always available. [CITED: nodejs.org/api/fs.html#fspromisescpsrc-dest-options]

### Correct Pattern for Directory Copy (D3-04, D3-05)

```js
// Source: verified against Node 24.14.1 — preserves relative symlinks verbatim + file modes
import { cp } from 'node:fs/promises';

await cp(srcSkillDir, dstSkillDir, { recursive: true, verbatimSymlinks: true });
```

### Single-File Copy (for shared references — D3-06)

```js
// Single-file cp needs no options — no recursive, no symlink handling
await cp(
  join(sharedRefsDir, refName + '.md'),
  join(dstSkillDir, 'references', refName + '.md')
);
```

### What `verbatimSymlinks` Does NOT Handle

If a skill contains an **absolute symlink** (e.g., `ln -s /etc/hostname link`), `verbatimSymlinks: true` copies it as-is — an absolute symlink in the output pointing to `/etc/hostname`. This is correct behavior for a verbatim copy tool. Lint does not validate symlink content; build should not either. [ASSUMED: no symlink safety validation requirement stated in REQUIREMENTS.md]

---

## fs.rm Wipe Semantics (D3-03)

### Empirically Verified on Node 24.14.1

```js
// force:true suppresses ENOENT when dist/ doesn't exist — safe to call unconditionally
await fs.rm(join(cwd, 'dist'), { recursive: true, force: true });
```

| Scenario | Behavior |
|----------|----------|
| `dist/` does not exist | No throw (force:true handles ENOENT) |
| `dist/` is a normal directory | Deleted recursively |
| `dist/` is a symlink to another dir | **Only the symlink is removed; target directory survives** — no escape |

[VERIFIED: node -e runtime test, Node 24.14.1]

---

## plugin.json Manifest Schema (D3-13, BUILD-04)

### Location and Structure

From CLAUDE.md "Plugin directory layout" (authoritative for this project):

```
dist/
└── public/
    ├── .claude-plugin/
    │   └── plugin.json    ← manifest
    └── <skill-name>/
        └── SKILL.md
```

The directory is literally `.claude-plugin/` (dot-prefixed). The file is `plugin.json`. Skills are **siblings** of `.claude-plugin/`, not nested inside it (BUILD-06, D3-08). [CITED: .claude/CLAUDE.md "Plugin directory layout"]

### Minimal Valid Manifest (D3-14)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My skills collection"
}
```

Exactly three fields for v1. `name` is the per-bucket plugin name from `plugins.public` or `plugins.private` (letter-start kebab, already validated by lint). `version` and `description` come from the top-level `motto.yaml` fields. [CITED: .claude/CLAUDE.md "plugin.json manifest schema"]

### Write Pattern

```js
// JSON.stringify with 2-space indent + trailing newline — standard convention
const manifest = { name, version, description };
await writeFile(
  join(bucketDir, '.claude-plugin', 'plugin.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);
```

[VERIFIED: JSON.stringify(obj, null, 2) + '\n' produces correct output, Node 24.14.1]

---

## mkdir + Write Ordering

`fs.mkdir(path, { recursive: true })` is **idempotent** — calling it on an existing directory does not throw. [VERIFIED: Node 24.14.1]

**Required directory structure per bucket:**

```js
// Create bucket dirs — can be done in parallel
await Promise.all([
  mkdir(join(distDir, audience, '.claude-plugin'), { recursive: true }),
  // skill dirs created per-skill during copy
]);

// Create skill dir before cp (cp needs the parent to exist)
await mkdir(join(distDir, audience, skillName), { recursive: true });
await cp(srcSkillDir, join(distDir, audience, skillName), { recursive: true, verbatimSymlinks: true });

// After cp, ensure references/ exists before bundling shared refs
await mkdir(join(distDir, audience, skillName, 'references'), { recursive: true });
// (idempotent — if skill already had references/, no error)
```

**Order for `references/`:** Always call `mkdir({recursive:true})` on the output `references/` dir AFTER the `cp`, before writing any shared ref files. The `cp` of the skill dir may or may not have created `references/` — the `mkdir` is a safe idempotent guard.

---

## Collision Detection Pattern (D3-07)

```js
// Source: verified pattern — stat-based existence check
import { stat } from 'node:fs/promises';

async function detectCollision(skillDir, refName) {
  try {
    await stat(join(skillDir, 'references', refName + '.md'));
    return true; // file exists — collision
  } catch (e) {
    if (e.code === 'ENOENT') return false; // no collision
    throw e; // unexpected I/O error
  }
}
```

Run this check BEFORE the `dist/` wipe (so errors are reported without mutating disk). [VERIFIED: Node 24.14.1]

Wait — D3-02 requires lint gate BEFORE wipe. Collision is a build-time check. The order must be:

```
1. lintProject(cwd)             → bail if not ok (D3-01, D3-02)
2. loadConfig + discoverSkills  → gather data for packaging
3. Collision + private checks   → bail if any build errors (D3-07, D3-12)
4. fs.rm dist/                  → wipe ONLY after all checks pass (D3-02 extended)
5. Pack all skills               → cp + bundle
6. Write plugin.json per bucket
7. Report success
```

Step 3 extends D3-02's spirit: write nothing (including the wipe) until ALL pre-pack checks pass.

---

## Lint/Build Data Reuse Recommendation

(Claude's Discretion — this is a recommendation, not a locked decision.)

**Recommendation: Option A — build re-reads motto.yaml and skills/ from disk.**

### Comparison

| Criterion | Option A (re-read) | Option B (refactor lint.js) |
|-----------|-------------------|-----------------------------|
| Changes to Phase 2 code | Zero | src/lint.js signature change + new return fields |
| Regression risk | None | Small but real — husky suite must stay green |
| Double-parse cost | ~1ms for typical project | Zero |
| buildProject self-containment | Full | Partial (depends on lint internal data shape) |
| Diff size | Smaller (new file only) | Larger (two files touched) |

### Why Option A Wins

1. **Phase 2 `src/lint.js` is tested and shipped.** Touching it to add `skills` and `config` to the return shape risks subtle breakage in existing tests (return shape checks, serialization).
2. **The double-parse cost is negligible.** `motto build` is a build-on-demand tool, not a watch loop. Two `readFile` + `parseDocument` calls on a small YAML file add < 1ms.
3. **`buildProject` stays self-contained.** Tests for build import only `buildProject` — no lint internals leak through.
4. **YAGNI.** The coupling of lint+build data is an optimization with no measurable benefit at project scale.

### Implementation Pattern

```js
// src/build.js — Option A: re-read after lint gate
import { lintProject } from './lint.js';
import { loadConfig } from './config.js';
import { readFile } from 'node:fs/promises';

export async function buildProject(projectRoot) {
  const errors = [];

  // Step 1: Lint gate (D3-01)
  const lintResult = await lintProject(projectRoot);
  if (!lintResult.ok) {
    return { ok: false, outDir: null, errors: lintResult.errors };
  }

  // Step 2: Load config for packaging data (re-read — Option A)
  const configText = await readFile(join(projectRoot, 'motto.yaml'), 'utf8');
  const { config } = loadConfig(configText); // lint passed → config is valid

  // Step 3: Discover skills (re-read)
  const skillNames = await discoverSkillNames(join(projectRoot, 'skills'));
  // ... load skill data (frontmatter for audience + shared_references)

  // Step 4: Pre-pack checks (collision + private contradiction)
  // ...

  // Step 5: Wipe (D3-03) — only after all checks pass
  await rm(join(projectRoot, 'dist'), { recursive: true, force: true });

  // Step 6: Pack + emit plugin.json
  // ...

  const outDir = join(projectRoot, 'dist');
  return { ok: errors.length === 0, outDir, errors };
}
```

---

## Module Decomposition: src/build.js

```
src/
├── frontmatter.js   # Phase 1 — unchanged
├── schema.js        # Phase 1 — unchanged
├── config.js        # Phase 1 — unchanged
├── lint.js          # Phase 2 — unchanged (used as gate)
└── build.js         # Phase 3 — new
bin/
└── motto.js         # Phase 3 — wire build branch (was stub)
test/
├── frontmatter.test.js  # Phase 1 — unchanged
├── schema.test.js       # Phase 1 — unchanged
├── config.test.js       # Phase 1 — unchanged
├── lint.test.js         # Phase 2 — unchanged
└── build.test.js        # Phase 3 — new
```

### buildProject Signature (matches lint-core shape for bin/motto.js parity)

```js
// src/build.js
export async function buildProject(projectRoot) {
  // Returns: { ok: boolean, outDir: string|null, errors: Array<{skill, message}> }
}
// Internal helpers (not exported):
async function loadSkillData(skillsDir, skillName)  // reads SKILL.md → { audience, shared_references }
async function packSkill(...)                         // cp + collision check + shared ref bundling
async function emitBucket(...)                        // mkdir .claude-plugin + writeFile plugin.json
```

### bin/motto.js Build Branch (mirror of lint branch)

```js
} else if (sub === 'build') {
  const { buildProject } = await import('../src/build.js');
  const result = await buildProject(process.cwd());
  if (result.ok) {
    // D3-16: output dir + summary
    process.stdout.write(`✓ built ${result.outDir} — ...\n`);
  } else {
    for (const e of result.errors) {
      process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
    }
    process.exitCode = 1;
  }
}
```

---

## Test Strategy (node:test + temp-dir fixtures)

### Core Pattern (reuses Phase 2 approach exactly)

```js
// test/build.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, lstat, readFile, readlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildProject } from '../src/build.js';

// scaffold helper — reusable across describe blocks
async function scaffoldProject(root, { skills = [], hasPrivate = false, badConfig = false } = {}) {
  // write motto.yaml, skills/<name>/SKILL.md, shared/references/ as needed
}
```

### Critical Test Assertions

**"Writes nothing on lint failure" (BUILD-01, D3-01):**
```js
it('writes nothing to dist/ when lint fails', async () => {
  // scaffold project with invalid SKILL.md (e.g. missing name)
  const result = await buildProject(root);
  assert.strictEqual(result.ok, false);
  // dist/ must not exist
  await assert.rejects(
    () => stat(join(root, 'dist')),
    { code: 'ENOENT' }
  );
});
```

**"Symlink preserved" (BUILD-02, D3-05):**
```js
it('preserves relative symlinks verbatim in dist/', async () => {
  // scaffold skill with relative symlink: ln -s SKILL.md alias.md
  await symlink('SKILL.md', join(skillDir, 'alias.md'));
  const result = await buildProject(root);
  assert.strictEqual(result.ok, true);
  
  const linkStat = await lstat(join(root, 'dist', 'public', 'my-skill', 'alias.md'));
  assert.ok(linkStat.isSymbolicLink(), 'alias.md must be a symlink');
  
  const target = await readlink(join(root, 'dist', 'public', 'my-skill', 'alias.md'));
  assert.strictEqual(target, 'SKILL.md', 'symlink target must be relative verbatim');
});
```

**"Collision error" (D3-07):**
```js
it('errors when shared_reference collides with local references/ file', async () => {
  // skill declares shared_references: ['guide']
  // skill also has local references/guide.md
  const result = await buildProject(root);
  assert.strictEqual(result.ok, false);
  assert.ok(result.errors.some(e => e.message.includes("collides")));
  // dist/ must not exist (or at least be empty/absent)
});
```

**"Private contradiction" (D3-12):**
```js
it('errors when private skill exists but plugins.private not set', async () => {
  // skill with audience: private; motto.yaml has no plugins.private
  const result = await buildProject(root);
  assert.strictEqual(result.ok, false);
  assert.ok(result.errors.some(e => e.message.includes('plugins.private not set')));
});
```

**"Executable bit preserved" (D3-05):**
```js
it('preserves executable bit on files in dist/', async () => {
  await writeFile(join(skillDir, 'scripts', 'run.sh'), '#!/bin/sh');
  await chmod(join(skillDir, 'scripts', 'run.sh'), 0o755);
  const result = await buildProject(root);
  const s = await stat(join(root, 'dist', 'public', 'my-skill', 'scripts', 'run.sh'));
  assert.ok(s.mode & 0o111, 'executable bit must be preserved');
});
```

### Test Discovery

`node --test` auto-discovers `*.test.js`. Build tests follow the same before/after pattern as lint tests. Import `buildProject` directly — no child-process spawning needed, keeps the husky pre-commit suite fast.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive directory copy | Custom tree walker | `fs.cp({ recursive: true, verbatimSymlinks: true })` | Handles file modes, symlinks, nested dirs in one call |
| Wipe dist/ | Custom recursive delete | `fs.rm({ recursive: true, force: true })` | Handles missing dir (force:true), no cross-platform issues |
| Ensure directory exists | `try mkdir / catch EEXIST` | `fs.mkdir({ recursive: true })` | Idempotent; creates all parent segments |
| JSON manifest formatting | Custom serializer | `JSON.stringify(obj, null, 2) + '\n'` | 2-space indent + trailing newline is the standard convention |
| Path traversal guard on shared refs | Custom sanitizer | Already done by lint (safe-basename check, LINT-05) — build trusts lint contract | Build receives only validated ref names from lint-passing frontmatter |

---

## Common Pitfalls

### Pitfall 1: fs.cp default behavior converts relative symlinks to absolute on macOS

**What goes wrong:** `fs.cp(src, dst, { recursive: true })` (default, or `dereference: false`) silently rewrites relative symlink targets to absolute paths pointing into the source tree. The symlink in `dist/` is technically preserved as a symlink, but it points to `/absolute/path/to/skills/...` — it breaks when `dist/` is moved or distributed.

**How to avoid:** Always pass `verbatimSymlinks: true`. The relative target string is copied verbatim.

**Warning sign:** Test passes on a machine where `dist/` and `skills/` share the same parent (symlink still resolves), but fails when `dist/` is installed elsewhere.

**Verified empirically:** [VERIFIED: node -e runtime test, Node 24.14.1 macOS Darwin 25.5.0]

### Pitfall 2: Wipe before pre-pack checks destroys a good dist/

**What goes wrong:** Wiping `dist/` immediately after the lint gate (before collision/private-contradiction checks) means a build that fails on a D3-07 collision or D3-12 private contradiction destroys the previous good `dist/`.

**How to avoid:** Enforce strict order: lint → load data → all pre-pack checks (collision, private) → wipe → pack. D3-02 says "wipe only on passing build" — the spirit extends to ALL pre-pack errors, not just lint.

### Pitfall 3: mkdir before cp not needed — but mkdir after cp IS needed for shared refs

**What goes wrong:** `fs.cp(src, dst, { recursive: true })` creates the `dst` directory and all contents. No pre-mkdir needed for the skill dir. BUT: if a skill has no local `references/` dir, `cp` does not create one. Then `cp(sharedRef, join(dst, 'references', 'ref.md'))` fails with ENOENT (parent doesn't exist).

**How to avoid:** After copying the skill dir, always call `mkdir(join(dstSkillDir, 'references'), { recursive: true })` before copying any shared refs. The `{recursive:true}` makes it idempotent when `references/` already exists.

**Verified empirically:** [VERIFIED: Node 24.14.1]

### Pitfall 4: Collision check must run on the SOURCE skill dir, not the dest

**What goes wrong:** Checking for collision in `dist/<audience>/<name>/references/` after copy is too late — the wipe has already run by then.

**How to avoid:** Check `join(projectRoot, 'skills', skillName, 'references', refName + '.md')` in the source tree, before any mutations to `dist/`.

### Pitfall 5: lstat not stat for symlink assertions in tests

**What goes wrong:** `fs.stat()` follows symlinks and returns the target's stats. `stat(symlink).isSymbolicLink()` always returns false.

**How to avoid:** Use `fs.lstat()` to check whether a path IS a symlink. Use `fs.stat()` to check properties of what the symlink POINTS TO (e.g., executable bit on target file).

### Pitfall 6: process.exitCode vs process.exit(1) (reuse from Phase 2)

**What goes wrong:** `process.exit(1)` terminates before stdout is flushed. Build output may be silently dropped.

**How to avoid:** `process.exitCode = 1` — sets the code for natural exit. Identical to the lint branch.

---

## Code Examples

### Full fs.cp Call for Skill Dir Copy

```js
// Source: empirically verified, Node 24.14.1
import { cp } from 'node:fs/promises';

// verbatimSymlinks:true is REQUIRED to preserve relative symlink targets
await cp(
  join(projectRoot, 'skills', skillName),
  join(projectRoot, 'dist', audience, skillName),
  { recursive: true, verbatimSymlinks: true }
);
```

### Shared Ref Bundling (after cp)

```js
// Source: verified pattern — Node 24.14.1
import { cp, mkdir } from 'node:fs/promises';

const outRefsDir = join(projectRoot, 'dist', audience, skillName, 'references');
// Idempotent — creates refs/ even if skill had none locally
await mkdir(outRefsDir, { recursive: true });
// Single-file copy — no options needed
await cp(
  join(projectRoot, 'shared', 'references', refName + '.md'),
  join(outRefsDir, refName + '.md')
);
```

### plugin.json Emission

```js
// Source: CLAUDE.md plugin.json schema + verified JSON formatting
import { mkdir, writeFile } from 'node:fs/promises';

const pluginDir = join(distDir, audience, '.claude-plugin');
await mkdir(pluginDir, { recursive: true });

const manifest = {
  name: config.plugins[audience],   // e.g. plugins.public or plugins.private
  version: config.version,
  description: config.description,
};
await writeFile(
  join(pluginDir, 'plugin.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);
```

### dist/ Wipe (D3-03)

```js
// Source: verified — force:true silences ENOENT when dist/ absent
import { rm } from 'node:fs/promises';

await rm(join(projectRoot, 'dist'), { recursive: true, force: true });
```

### loadSkillData Helper

```js
// Read only the frontmatter fields needed by build — audience + shared_references
import { readFile } from 'node:fs/promises';
import { parseFrontmatter } from './frontmatter.js';

async function loadSkillData(skillsDir, skillName) {
  const text = await readFile(join(skillsDir, skillName, 'SKILL.md'), 'utf8');
  const { data } = parseFrontmatter(text);
  return {
    audience: data.audience,                              // 'public' | 'private'
    sharedRefs: Array.isArray(data.shared_references)    // already validated by lint
      ? data.shared_references
      : [],
  };
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (stdlib, Node 20+) |
| Config file | none — auto-discovery |
| Quick run command | `node --test test/build.test.js` |
| Full suite command | `node --test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUILD-01 | Lint failure → write nothing, exit 1 | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| BUILD-02 | Verbatim copy; relative symlinks preserved | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| BUILD-02 | Executable bit preserved | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| BUILD-03 | Shared ref bundled into skill's references/ | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| BUILD-03 | Collision error (D3-07) | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| BUILD-04 | plugin.json has name/version/description | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| BUILD-05 | Private bucket emitted only when conditions met | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| BUILD-05 | Private contradiction error (D3-12) | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| BUILD-06 | Skills are siblings of .claude-plugin/ | unit | `node --test test/build.test.js` | ❌ Wave 0 |
| CLI-02 | build branch wired; reports output dir; exit 0/1 | unit | `node --test test/build.test.js` | ❌ Wave 0 |

### Sampling Rate
- Per task commit: `node --test test/build.test.js`
- Per wave merge: `node --test`
- Phase gate: `node --test` full green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/build.test.js` — covers all BUILD-01..06 and CLI-02 behavior

---

## Security Domain

Build performs local filesystem reads from `skills/` + `shared/references/` and writes only to `dist/` — all paths under `projectRoot`. No user-controlled path segments escape the project root:

- Skill names come from `readdir` output (OS-controlled directory entries)
- Shared ref names are validated as safe basenames by lint (LINT-05: no `/` or `.`) before build reads them
- The `dist/` wipe targets `join(projectRoot, 'dist')` exactly — empirically verified to not follow symlinks to external trees

**ASVS V5 (Input Validation):** The only external input is the subcommand string `'build'` — used only for dispatch, not in any path construction. Shared ref names flow through LINT-05 safe-basename validation before reaching build's file I/O. No additional validation needed at the build layer.

No network access. No secret handling. No new security controls required.

---

## Package Legitimacy Audit

No new packages are introduced in this phase. All dependencies are Node.js stdlib + `yaml` (already installed in Phase 1).

| Package | Status |
|---------|--------|
| `yaml` ^2.9.0 | Already installed; Phase 1 approved |
| `node:fs/promises` | stdlib |
| `node:path` | stdlib |
| `node:os` | stdlib (tests only) |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 20 | Everything | ✓ | v24.14.1 | — |
| `fs.cp` (Node ≥ 16.7) | Skill copy | ✓ | stable | — |
| `fs.cp verbatimSymlinks` (Node ≥ 16.15) | Symlink preservation | ✓ | stable | — |
| `fs.rm { recursive, force }` (Node ≥ 16.7) | dist/ wipe | ✓ | stable | — |
| `fs.mkdir { recursive }` | Directory creation | ✓ | stable since Node 10 | — |

No missing dependencies.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Absolute symlinks in a skill dir are acceptable verbatim copy output (no lint rule against them) | fs.cp section | Low — REQUIREMENTS.md has no symlink safety lint requirement; if needed it's a new lint rule, out of scope for build |
| A2 | `verbatimSymlinks:true` behavior on Linux/CI is identical to macOS (relative targets preserved) | fs.cp section | Low — `verbatimSymlinks` is a cross-platform flag designed for this purpose; macOS-specific issue is the ABSENCE of this flag |

**All other claims were verified against Node 24.14.1 or confirmed by reading source files.**

---

## Open Questions

None. All HOW questions were resolved by direct runtime verification or source reading.

---

## Sources

### Primary (HIGH confidence — verified by running code)
- Node 24.14.1 runtime (`node --input-type=module` and `node -e`) — fs.cp symlink behavior (default vs dereference:false vs verbatimSymlinks:true), fs.rm force semantics, mkdir idempotency, lstat vs stat for symlink detection, JSON.stringify formatting. [VERIFIED: this session]
- `src/lint.js`, `src/config.js`, `src/schema.js`, `bin/motto.js` — exact signatures, return shapes, patterns reused in Phase 3. [VERIFIED: source code]
- `.claude/CLAUDE.md` — plugin.json manifest schema, fs.cp/fs.rm stdlib guidance. [CITED: project instructions]

### Secondary (MEDIUM confidence — official docs cited)
- `nodejs.org/api/fs.html#fspromisescpsrc-dest-options` — verbatimSymlinks added Node 16.15.0/17.6.0; dereference default false. [CITED]
- `nodejs.org/api/fs.html#fspromisesrmpathpath-options` — force:true semantics. [CITED]

---

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable stdlib; only invalidated by Node.js breaking changes)
