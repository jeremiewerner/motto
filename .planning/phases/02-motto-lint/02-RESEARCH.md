# Phase 02: motto-lint — Research

**Researched:** 2026-06-30
**Domain:** Node.js CLI plumbing — filesystem I/O, process lifecycle, test fixtures
**Confidence:** HIGH (all patterns verified against Node 24 runtime in this session)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D2-01: cwd as project root; no walk-up.
- D2-02: skill = immediate subdir of `./skills/`; skill name = directory basename.
- D2-03: sorted by directory name before reading/reporting.
- D2-04: ignore dotfiles/dot-dirs and plain files inside `skills/`.
- D2-05: missing `SKILL.md` is a hard error; no warning channel.
- D2-06: per-file I/O errors caught and converted to that skill's error entry; scan continues.
- D2-07: `sharedRefs` built by scanning `./shared/references/*.md` basenames.
- D2-08: missing `shared/` or `shared/references/` → empty Set (not an error).
- D2-09: `./motto.yaml` read and validated; missing or invalid is an error.
- D2-10: config errors reported first under label `motto.yaml: <message>`; scan still runs.
- D2-11: clean → `✓ N skills OK` exit 0; errors → `✗ <skill>: <message>` lines exit 1.
- D2-12: within one skill, error order follows `validateSkill` emission order (no re-sort).
- D2-13: zero skills found is an error (`✗ no skills found`), exit 1.
- D2-14: `bin/motto.js` with `"bin": { "motto": "./bin/motto.js" }`, shebang, executable bit.
- D2-15: v1 is cwd-only; no optional path argument.
- D2-16: unknown subcommand / bad usage → short usage line, non-zero exit.

### Claude's Discretion
- Module decomposition: one `src/lint.js` or split. Strongly prefer pure lint core returning `{ ok, errors[] }` so `bin/motto.js` only formats + sets exit code.
- Exact wording of `no skills found`, `missing SKILL.md`, and usage strings.
- Whether discovery and shared-ref scanning are separate functions inside `src/lint.js` or split files.

### Deferred Ideas (OUT OF SCOPE)
- Optional `[path]` argument to `motto lint`.
- `--quiet` / `--format json` flags (CLIX-01/02).
- Warning channel (non-failing notices).
- Top-level `shared/ not found` diagnostic.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LINT-06 | All errors across all skills collected and reported as `skill: message`; exits 0 (clean) or 1 (errors) | Uniform `{skill,message}` shape; process.exitCode pattern verified |
| LINT-07 | Skill discovery is deterministic (sorted by name) and per-file error-isolated | readdir + withFileTypes + explicit .sort(); try/catch per skill verified |
| CLI-01 | `motto lint` validates current project, prints per-error output with correct exit code | parseArgs positional dispatch + bin wiring pattern verified |
</phase_requirements>

---

## Summary

Phase 2 wraps three already-correct pure functions (`parseFrontmatter`, `validateSkill`, `loadConfig`) with filesystem plumbing and a CLI entry point. The research is focused entirely on the plumbing layer: correct `node:util parseArgs` wiring for a two-subcommand CLI, correct `readdir` + `withFileTypes` for the shallow directory scan, correct error-shape normalization across the three Phase 1 APIs, and a test strategy that keeps the husky pre-commit suite fast.

All patterns were verified against Node 24.14.1 (current on this machine, satisfies `>=20`). No new dependencies are needed — everything is stdlib plus the already-present `yaml` package.

**Primary recommendation:** Keep `src/lint.js` as a single pure orchestration module exporting `lintProject(root)` returning `{ ok, errors }`. `bin/motto.js` is a five-line thin CLI shell. All behavior tests run against `lintProject` directly — no child-process spawning needed.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CLI arg parsing + subcommand dispatch | `bin/motto.js` | — | Entry point only; no business logic |
| Config file read + wiring to `loadConfig` | `src/lint.js` | — | I/O belongs in the orchestrator, not the pure validator |
| Skills discovery + sharedRefs scan | `src/lint.js` | — | Filesystem concern; keeps validators pure |
| Error aggregation + sorting | `src/lint.js` | — | Orchestrator collects; validators emit |
| Output formatting + exit code | `bin/motto.js` | — | CLI concern; keeps lint core testable without stdout |
| Schema validation | `src/schema.js` (Phase 1) | — | No changes needed |
| Frontmatter parsing | `src/frontmatter.js` (Phase 1) | — | No changes needed |
| Config validation | `src/config.js` (Phase 1) | — | No changes needed |

---

## Standard Stack

All stdlib — no new installs.

### Core
| Module | Purpose | Pattern |
|--------|---------|---------|
| `node:util` `parseArgs` | CLI arg parsing | `parseArgs({ args: process.argv.slice(2), options: {}, allowPositionals: true, strict: true })` |
| `node:fs/promises` `readdir` | Skills discovery + shared refs scan | `readdir(dir, { withFileTypes: true })` |
| `node:fs/promises` `readFile` | Read SKILL.md, motto.yaml | `readFile(path, 'utf8')` inside try/catch |
| `node:fs/promises` `mkdtemp` | Test fixtures | `mkdtemp(join(tmpdir(), 'motto-test-'))` |
| `node:os` `tmpdir` | Base for test temp dirs | `tmpdir()` |
| `node:path` | Path construction | `join`, `basename`, `extname` |

**No new runtime dependencies.** `yaml` is already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── frontmatter.js   # Phase 1 — unchanged
├── schema.js        # Phase 1 — unchanged
├── config.js        # Phase 1 — unchanged
└── lint.js          # Phase 2 — new: lintProject(root) orchestrator
bin/
└── motto.js         # Phase 2 — new: CLI entry point (thin shell)
test/
├── frontmatter.test.js  # Phase 1 — unchanged
├── schema.test.js       # Phase 1 — unchanged
├── config.test.js       # Phase 1 — unchanged
└── lint.test.js         # Phase 2 — new
```

### Pattern 1: parseArgs for Two-Subcommand Dispatch

**What:** Use `allowPositionals: true, strict: true`. Subcommand is `positionals[0]`. Wrap in try/catch because `strict: true` throws on any unknown `--flag` (including `--help`).

**Verified behavior:**
- `['lint']` → `positionals: ['lint']` — dispatch to lint
- `['build']` → `positionals: ['build']` — dispatch to build (Phase 3)
- `[]` → `positionals: []` — no subcommand → print usage, exit nonzero
- `['unknown']` → `positionals: ['unknown']` — unknown subcommand → print usage, exit nonzero
- `['--help']` → **throws** `Unknown option '--help'` — caught, print usage, exit nonzero

```js
// Source: verified against Node 24.14.1, node:util docs
import { parseArgs } from 'node:util';

let parsed;
try {
  parsed = parseArgs({ args: process.argv.slice(2), options: {}, allowPositionals: true, strict: true });
} catch {
  process.stderr.write('usage: motto <lint|build>\n');
  process.exitCode = 1;
  process.exit();
}

const sub = parsed.positionals[0];
if (sub === 'lint') {
  // dispatch
} else if (sub === 'build') {
  // Phase 3
} else {
  process.stderr.write('usage: motto <lint|build>\n');
  process.exitCode = 1;
}
```

**Pitfall:** Do not add `options: { help: { type: 'boolean', short: 'h' } }` unless you implement help text — otherwise the flag silently eats `--help` without showing anything.

### Pattern 2: Skills Discovery — readdir with withFileTypes

**What:** `readdir(dir, { withFileTypes: true })` returns `Dirent[]`. Filter non-hidden directories, then sort explicitly.

**Verified:** Filesystem order is non-deterministic (varies by OS/FS). The `.sort()` call is **mandatory** for LINT-07.

```js
// Source: verified against Node 24.14.1
import { readdir } from 'node:fs/promises';

async function discoverSkills(skillsDir) {
  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return null; // caller converts to "no skills found" error
    throw e; // unexpected — let the outer catch handle it
  }
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => e.name);
}
```

`null` return signals "skills/ dir missing" which the caller maps to D2-13's "no skills found" error. An empty array `[]` means the dir exists but has no candidate skills — also "no skills found".

### Pattern 3: Shared References Scan

**What:** `readdir(refsDir, { withFileTypes: true })` → filter `.isFile() && extname === '.md'` → collect `basename(name, '.md')` into a `Set`. ENOENT → empty Set (D2-08).

```js
// Source: verified against Node 24.14.1
import { readdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

async function loadSharedRefs(projectRoot) {
  const refsDir = join(projectRoot, 'shared', 'references');
  try {
    const entries = await readdir(refsDir, { withFileTypes: true });
    return new Set(
      entries
        .filter(e => e.isFile() && extname(e.name) === '.md')
        .map(e => basename(e.name, '.md'))
    );
  } catch (e) {
    if (e.code === 'ENOENT') return new Set(); // D2-08: not an error
    throw e;
  }
}
```

### Pattern 4: Per-File Error-Isolated Skill Processing (D2-06)

**What:** For each skill directory (in sorted order), attempt to read `SKILL.md` and run validators. Wrap per-skill I/O in try/catch; convert any thrown error into a `{ skill: dirName, message }` entry. Never abort the loop.

```js
// Source: verified design pattern, D2-06
for (const dirName of sortedSkillNames) {
  try {
    const skillPath = join(skillsDir, dirName, 'SKILL.md');
    let text;
    try {
      text = await readFile(skillPath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        errors.push({ skill: dirName, message: 'missing SKILL.md' }); // D2-05
      } else {
        errors.push({ skill: dirName, message: `could not read SKILL.md: ${e.message}` });
      }
      continue; // next skill
    }
    const { data, body, errors: parseErrors } = parseFrontmatter(text);
    for (const e of parseErrors) {
      errors.push({ skill: dirName, message: e.message }); // lift: add skill field
    }
    const schemaErrors = validateSkill({ dirName, data, body }, sharedRefs);
    errors.push(...schemaErrors); // already { skill, message } shaped
  } catch (e) {
    // backstop for any unexpected failure (D2-06)
    errors.push({ skill: dirName, message: `unexpected error: ${e.message}` });
  }
}
```

### Pattern 5: Error Shape Normalization

**Critical:** The three Phase 1 functions return errors with different shapes. Phase 2 must normalize to a uniform `{ skill: string, message: string }` before aggregating.

| Source | Returns | Phase 2 lift |
|--------|---------|--------------|
| `parseFrontmatter(text)` | `{ errors: [{message}] }` | `errors.push({ skill: dirName, message: e.message })` |
| `validateSkill(skill, refs)` | `[{skill, message}]` | `errors.push(...schemaErrors)` — already normalized |
| `loadConfig(text)` | `{ errors: [{message}] }` | `errors.push({ skill: 'motto.yaml', message: e.message })` |

**The `'motto.yaml'` label is how config errors appear in the output** (`✗ motto.yaml: missing version`). This is a deliberate naming choice (D2-10) — config errors slot into the same `{ skill, message }` format.

### Pattern 6: Config Read + Wiring (D2-09)

```js
// Source: D2-09/D2-10, verified with loadConfig API from src/config.js
import { readFile } from 'node:fs/promises';
import { loadConfig } from './config.js';

async function processConfig(projectRoot, errors) {
  const configPath = join(projectRoot, 'motto.yaml');
  let text;
  try {
    text = await readFile(configPath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      errors.push({ skill: 'motto.yaml', message: 'file not found' });
    } else {
      errors.push({ skill: 'motto.yaml', message: `could not read: ${e.message}` });
    }
    return; // config errors collected; skill scan still runs
  }
  const { errors: configErrors } = loadConfig(text);
  for (const e of configErrors) {
    errors.push({ skill: 'motto.yaml', message: e.message });
  }
}
```

### Pattern 7: lint core return shape

```js
// src/lint.js — full signature
export async function lintProject(projectRoot) {
  const errors = []; // Array<{ skill: string, message: string }>
  // 1. Config (errors go first per D2-10)
  // 2. sharedRefs scan
  // 3. Skills discovery → sorted names
  // 4. Per-skill loop
  return { ok: errors.length === 0, errors };
}
```

`bin/motto.js` calls `lintProject(process.cwd())` and owns all stdout/stderr and exit code.

### Pattern 8: Exit Code — process.exitCode vs process.exit()

**Use `process.exitCode = 1` (not `process.exit(1)`)** for the lint failure path in `bin/motto.js`. `process.exit()` terminates synchronously, before any pending I/O flushes. `process.exitCode` sets the code for natural exit at end of event loop.

```js
// Verified: setting exitCode does NOT terminate; process continues normally
const { ok, errors } = await lintProject(process.cwd());
if (ok) {
  console.log(`✓ ${skillCount} skills OK`);
} else {
  for (const e of errors) process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
  process.exitCode = 1;
}
```

### Pattern 9: bin/motto.js — shebang + executable bit

```js
#!/usr/bin/env node
// bin/motto.js — thin CLI shell
import { parseArgs } from 'node:util';
import { lintProject } from '../src/lint.js';

// ... parseArgs dispatch ...
// ... call lintProject(process.cwd()) ...
// ... set process.exitCode ...
```

The `package.json` `bin` field:
```json
{
  "bin": { "motto": "./bin/motto.js" }
}
```

After `npm link` or `npm install -g`, `motto` resolves to this file. The file **must** be executable (`chmod +x bin/motto.js`) for direct invocation without `node` prefix. `npm link` sets the executable bit on the symlink automatically, but the source file must have it set too.

**Current state:** `package.json` has no `bin` field (verified). Adding it and creating `bin/motto.js` are both required.

### Pattern 10: Test Strategy — node:test with temp-dir fixtures

**Verified:** `before()/after()` hooks with `mkdtemp`/`rm` work correctly with `node:test` async.

```js
// test/lint.test.js — established pattern
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { lintProject } from '../src/lint.js';

describe('lintProject — happy path', () => {
  let root;
  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-test-'));
    // scaffold a valid project
    await mkdir(join(root, 'skills', 'my-skill'), { recursive: true });
    await writeFile(join(root, 'skills', 'my-skill', 'SKILL.md'), VALID_SKILL_MD);
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);
  });
  after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  it('returns ok:true and empty errors', async () => {
    const result = await lintProject(root);
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.errors, []);
  });
});
```

**Do not spawn `motto` binary in tests.** Import `lintProject` directly. The husky pre-commit runs `npm test` which runs `node --test` — all tests in `test/*.test.js` are discovered automatically.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| YAML parsing | Custom frontmatter parser | `yaml` (already installed) + `parseFrontmatter` from Phase 1 |
| Recursive dir scanning | Custom tree walker | `readdir({recursive: true})` — but Phase 2 only needs ONE level deep; `readdir` non-recursive + filter is correct |
| Glob patterns for `*.md` | Custom glob | `readdir` + `.filter(e => extname(e.name) === '.md')` |
| Alphabetic sort | Custom comparator | `.sort((a, b) => a.name.localeCompare(b.name))` — use `localeCompare`, not `< >` operators (handles edge case locales correctly) |
| Temp dir cleanup | Recursive rm | `fs.rm(dir, { recursive: true, force: true })` — stdlib since Node 16.7 |
| CLI arg parsing | String splitting, manual argv loop | `node:util parseArgs` |

---

## Common Pitfalls

### Pitfall 1: readdir returns non-deterministic order — MUST sort explicitly

**What goes wrong:** On macOS HFS+/APFS, `readdir` returns entries in insertion order (appears stable locally). On Linux ext4 with many files, order is hash-based (looks random). Tests pass locally, CI fails on alphabetical order assertion.

**How to avoid:** Always call `.sort((a, b) => a.name.localeCompare(b.name))` after filtering. No exception.

**Warning sign:** Tests that assert `errors[0].skill === 'alpha-skill'` pass locally but flake on CI.

### Pitfall 2: parseFrontmatter errors lack a `skill` field — must lift before pushing

**What goes wrong:** `parseFrontmatter` returns `{ errors: [{ message: '...' }] }` — no `skill` field. Spreading these directly into the aggregated errors array produces `{ message: '...' }` entries with no skill attribution. The output renders as `✗ undefined: message`.

**How to avoid:** Always lift: `for (const e of parseErrors) errors.push({ skill: dirName, message: e.message });`

**Confirmed by reading `src/frontmatter.js`:** `errors.push({ message: "..." })` — no skill field anywhere.

### Pitfall 3: loadConfig errors lack a `skill` field — lift with `'motto.yaml'` label

**What goes wrong:** Same shape issue as Pitfall 2. `loadConfig` returns `{ errors: [{ message: '...' }] }`. D2-10 specifies the label `motto.yaml` in output. Lifting without the label produces unlabelled errors.

**How to avoid:** `for (const e of configErrors) errors.push({ skill: 'motto.yaml', message: e.message });`

**Confirmed by reading `src/config.js`:** `errors.push({ message: ... })` — no skill field.

### Pitfall 4: strict: true in parseArgs throws on any unknown flag — must wrap

**What goes wrong:** `motto --help` throws with message "Unknown option '--help'" instead of showing usage. The uncaught error prints a stack trace, not a usage line.

**How to avoid:** Wrap the `parseArgs` call in try/catch. The catch block prints the usage string and sets exit code.

**Verified:** `parseArgs({args:['--help'], options:{}, allowPositionals:true, strict:true})` throws.

### Pitfall 5: Missing SKILL.md must use `continue` not `return`

**What goes wrong:** `return` in the per-skill loop exits `lintProject`, not just the current iteration. Using `return` early-exits the entire scan when the first missing SKILL.md is encountered, violating LINT-07's per-file isolation.

**How to avoid:** After pushing the missing-SKILL.md error, use `continue` to advance to the next skill.

### Pitfall 6: chmod +x missing on bin/motto.js

**What goes wrong:** `npm link` creates a symlink to `bin/motto.js`. If the file lacks the executable bit, running `motto lint` returns `Permission denied` or is silently skipped depending on shell. The shebang line has no effect without executable permission.

**How to avoid:** `chmod +x bin/motto.js` as part of creating the file, or add it as a `postinstall` / `prepare` script. Conventionally, the file is committed with the bit set (`git update-index --chmod=+x bin/motto.js`).

### Pitfall 7: process.exit(1) truncates stdout

**What goes wrong:** `process.exit(1)` terminates the process immediately, before Node flushes buffered stdout. The last error line may be silently dropped.

**How to avoid:** `process.exitCode = 1` — sets the exit code for natural exit without forcing immediate termination.

### Pitfall 8: `readdir` without `withFileTypes` requires extra `stat` calls

**What goes wrong:** `readdir(dir)` without `{ withFileTypes: true }` returns bare string names. To filter directories vs. files you need `stat()` per entry — N extra async calls. With `withFileTypes: true` you get `Dirent.isDirectory()` for free with a single syscall.

**How to avoid:** Always use `{ withFileTypes: true }` when filtering by entry type.

### Pitfall 9: Zero-skills edge cases — two distinct causes

**What goes wrong:** "No skills found" can mean two different things: (A) `skills/` directory does not exist (ENOENT from `readdir`), or (B) `skills/` exists but contains no non-hidden directories. Both must produce the same "no skills found" error and exit 1 per D2-13. Treating them differently adds unnecessary complexity.

**How to avoid:** In `discoverSkills`, return `null` for ENOENT and `[]` for empty-after-filter. Caller checks `names === null || names.length === 0` → same error.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (stdlib, Node 20+) |
| Config file | none — auto-discovery |
| Quick run command | `node --test test/lint.test.js` |
| Full suite command | `node --test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LINT-06 | All errors collected across all skills | unit | `node --test test/lint.test.js` | ❌ Wave 0 |
| LINT-06 | Exit 0 on clean project | unit | `node --test test/lint.test.js` | ❌ Wave 0 |
| LINT-06 | Exit 1 on any error | unit | `node --test test/lint.test.js` | ❌ Wave 0 |
| LINT-07 | Skills reported alphabetically | unit | `node --test test/lint.test.js` | ❌ Wave 0 |
| LINT-07 | Per-file isolation: bad skill does not abort scan | unit | `node --test test/lint.test.js` | ❌ Wave 0 |
| CLI-01 | `motto lint` produces correct output | integration (spawn) | manual or `node --test test/lint.integration.test.js` | ❌ optional |

**Note on CLI-01 integration testing:** The integration test (spawning the binary) can be omitted in favour of testing `lintProject` directly + testing `bin/motto.js` dispatch via import. Spawning the binary is fragile in CI until `npm link` is set up. Recommend unit tests cover all behavior; add integration smoke test as an optional bonus.

### Sampling Rate
- Per task commit: `node --test test/lint.test.js`
- Per wave merge: `node --test`
- Phase gate: `node --test` full green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/lint.test.js` — covers all LINT-06, LINT-07 behavior (primary test file for this phase)

---

## Security Domain

This phase performs local filesystem reads from paths under `process.cwd()`. All paths are constructed with `join(projectRoot, 'skills', dirName, 'SKILL.md')` — no user-controlled path segments that could escape the project root. The `dirName` comes from `readdir` output (OS-controlled), not from any user-supplied string.

**ASVS V5 (Input Validation):** Not applicable — no external input beyond the CLI subcommand name (a string switch, not used in any path construction).

No network access. No secret handling. No security controls required for this phase.

---

## Code Examples

### Minimal valid SKILL.md for test fixtures
```
---
name: my-skill
description: use when you need X
audience: public
---
# My Skill

**Role:** You are a helper that does X.

Do things.
```

### Minimal valid motto.yaml for test fixtures
```yaml
name: my-project
version: 1.0.0
description: My skills collection
plugins:
  public: my-plugin
```

### lintProject return shape
```js
// Clean project:
{ ok: true,  errors: [] }

// Errors:
{ ok: false, errors: [
  { skill: 'motto.yaml',  message: 'missing version' },       // config errors first
  { skill: 'alpha-skill', message: 'name is required' },      // then alphabetical
  { skill: 'alpha-skill', message: 'description is required' },
  { skill: 'beta-skill',  message: 'missing SKILL.md' },
]}
```

### validateSkill call signature (from src/schema.js — confirmed)
```js
validateSkill({ dirName, data, body }, sharedRefs)
// Returns: Array<{ skill: string, message: string }>
// skill === dirName in all returned errors
```

### parseFrontmatter call signature (from src/frontmatter.js — confirmed)
```js
parseFrontmatter(text)
// Returns: { data: object, body: string, errors: Array<{ message: string }> }
// Note: NO skill field in errors — must lift when aggregating
```

### loadConfig call signature (from src/config.js — confirmed)
```js
loadConfig(text)  // text = raw file content string
// Returns: { config: object, errors: Array<{ message: string }> }
// Note: NO skill field in errors — must lift with skill: 'motto.yaml'
```

---

## Module Decomposition Recommendation

(Claude's Discretion — this is a recommendation for the planner, not a locked decision.)

**Recommended: single `src/lint.js` with two exported helpers and one main export.**

```js
// src/lint.js
export async function lintProject(projectRoot) { ... }  // main entry
// Internal (not exported):
async function processConfig(root, errors) { ... }
async function loadSharedRefs(root) { ... }
async function discoverSkillNames(skillsDir) { ... }    // returns null | string[]
async function processSkill(skillsDir, dirName, sharedRefs, errors) { ... }
```

Rationale: discovery and shared-ref scanning are 8-12 lines each; splitting into separate files would produce files smaller than their import boilerplate. Phase 3 (`lintProject` will be called by `buildProject`) benefits from one import, not three.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 20 | Everything | ✓ | v24.14.1 | — |
| `node:util parseArgs` | CLI dispatch | ✓ | stable Node 20+ | — |
| `node:fs/promises readdir withFileTypes` | Discovery | ✓ | Node 10.10+ | — |
| `yaml` npm package | Phase 1 (already used) | ✓ | ^2.9.0 | — |
| husky | Pre-commit test gate | ✓ | ^9.1.7 | — |

No missing dependencies.

---

## Package Legitimacy Audit

No new packages are introduced in this phase. All dependencies are Node.js stdlib + `yaml` (already installed in Phase 1).

| Package | Status |
|---------|--------|
| `yaml` ^2.9.0 | Already installed; Phase 1 approved |
| All other modules | `node:*` stdlib — no registry needed |

---

## Open Questions

None. All HOW questions were resolved by direct runtime verification.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `git update-index --chmod=+x` is the correct way to commit executable bit for bin/motto.js | Pattern 9 | Low — this is standard practice; worst case is npm link works but the bit isn't in git |

**All other claims verified against Node 24.14.1 runtime or confirmed by reading Phase 1 source files.**

---

## Sources

### PRIMARY (HIGH confidence — verified by running code)
- Node 24.14.1 runtime (`node -e "..."`) — parseArgs behavior, readdir withFileTypes, ENOENT codes, process.exitCode, mkdtemp/rm, node:test before/after hooks. All patterns verified in this session.
- `src/frontmatter.js`, `src/schema.js`, `src/config.js` — exact function signatures and return shapes read directly. [VERIFIED: source code]

### SECONDARY (MEDIUM confidence — official docs cited)
- `nodejs.org/api/util.html#utilparseargsconfig` — parseArgs spec [CITED]
- `nodejs.org/api/fs.html#fsreaddirsyncpath-options` — readdir withFileTypes spec [CITED]

### TERTIARY (LOW confidence — not needed, no assumptions taken)
- None.

---

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable stdlib; only invalidated by Node.js breaking changes)
