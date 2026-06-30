# Stack Research

**Domain:** Node.js CLI tool — YAML/Markdown linter and plugin packager
**Researched:** 2026-06-30
**Confidence:** MEDIUM (core stack validated against official docs; Claude Code plugin conventions verified against live Anthropic docs)

---

## v0.0.2 Dogfood Addendum

**Verdict: Zero new dependencies. Zero new dev tools. No dist/ handling changes.**

This section answers the three v0.0.2 dogfood questions directly; the base stack below is unchanged from v0.0.1.

### New Dependencies

None. Every capability needed by the dogfood milestone is already present:

| Needed for | How to get it | New dep? |
|------------|---------------|----------|
| Run `lintProject` / `buildProject` on real tree | `import` from `../src/lint.js` and `../src/build.js` | No |
| Resolve repo root inside an ESM test file | `dirname(fileURLToPath(import.meta.url))` + `resolve` | No — `node:url` and `node:path` already used |
| Assert on `dist/` output | `node:fs/promises` (`stat`, `readFile`) | No — already imported in existing tests |
| Clean up `dist/` after dogfood test run | `fs.rm(dir, { recursive: true, force: true })` | No — already used in `build.js` |
| Run dogfood test on every commit | Husky pre-commit already runs `node --test` | No change needed |

**Do not add:** Any test helper library (`tape`, `ava`, `chai`), any fixture library, any snapshot library, any temp-copy utility. The existing `node:test` + `node:assert/strict` pattern is sufficient.

### How the Dogfood Test Should Invoke Build

**Run `buildProject` in-place on the real repo root. Do not copy to a temp dir.**

Rationale:
- The purpose of the dogfood test is to validate the REAL `skills/` tree, not a synthetic copy. Copying defeats the point.
- `buildProject` is already idempotent: it wipes `dist/` and rebuilds from scratch on every invocation. There is no stale-state risk.
- `dist/` is already gitignored — in-place writes leave no tracked-file side effects.
- Copying the full source tree to a temp dir adds ~15 lines of setup and a dependency on `fs.cp` semantics that are already exercised in `build.test.js`. YAGNI.

**Pattern for resolving repo root in an ESM test file:**

```js
// test/dogfood.test.js
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```

`fileURLToPath` and `node:path` are already used in the existing codebase. No new stdlib surface.

**Test structure:**

```js
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintProject } from '../src/lint.js';
import { buildProject } from '../src/build.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('dogfood: Motto lints and builds its own skills tree', () => {
  after(async () => {
    // Wipe dist/ after the dogfood suite so the repo stays clean between test
    // invocations. Not strictly required (dist/ is gitignored), but removes
    // confusion when inspecting the working tree.
    await rm(join(REPO_ROOT, 'dist'), { recursive: true, force: true });
  });

  it('lintProject returns ok:true on the real skills/ tree', async () => {
    const result = await lintProject(REPO_ROOT);
    assert.strictEqual(result.ok, true,
      `lint failed:\n${result.errors.map(e => `  ${e.skill}: ${e.message}`).join('\n')}`);
  });

  it('buildProject returns ok:true and produces dist/', async () => {
    const result = await buildProject(REPO_ROOT);
    assert.strictEqual(result.ok, true,
      `build failed:\n${result.errors.map(e => `  ${e.skill}: ${e.message}`).join('\n')}`);
    const distStat = await stat(join(REPO_ROOT, 'dist'));
    assert.ok(distStat.isDirectory(), 'dist/ must exist after a successful build');
  });
});
```

The `after()` hook is the right cleanup site — it runs once after all tests in the `describe`, regardless of pass/fail. Individual tests should NOT clean up between themselves because `buildProject` needs `lintProject` to have run (via its internal lint gate) and the second test needs the dist/ written by `buildProject`.

### dist/ Handling

**Keep `dist/` gitignored. Never commit it.**

`.gitignore` already contains `dist/`. This is correct and requires no change:
- `dist/` is a build artifact regenerated deterministically from `skills/` + `motto.yaml`
- Committing it creates noise in diffs and creates a second source of truth for content that is already in `skills/`
- The dogfood test verifies structure at test time; permanent artifact tracking is not needed
- Downstream users of Motto's plugin will run `motto build` themselves; they do not need a pre-built artifact in the repo

### What NOT to Add for the Dogfood

| Temptation | Why to Reject |
|------------|---------------|
| Copy tree to `os.tmpdir()` before testing | Defeats the dogfood premise; adds complexity; no benefit given `buildProject`'s idempotency |
| Snapshot `dist/` layout to a fixture file | Over-engineering; the live `stat` + `readFile` assertions in the test are the ground truth |
| A `motto.yaml` `test` command or watch mode | Out of scope; `node --test --watch` works if desired but is not a dependency |
| `sinon` / `testdouble` for mocking | Not needed; the dogfood test is an integration test, not a unit test |
| A separate test script in `package.json` | `npm test` (`node --test`) auto-discovers `test/dogfood.test.js` — no script change needed |
| Committing `dist/` to verify output | The test asserts on it at runtime; static fixtures would drift |

### Required Authoring for the Dogfood to Pass

`lintProject` returns `ok: false` with "no skills found" when `skills/` is missing or empty. The dogfood test will fail until at least one valid SKILL.md exists. Required before the dogfood test can pass:

1. `motto.yaml` at repo root with `name`, `version`, `description`, `plugins.public`
2. At least one `skills/<name>/SKILL.md` with valid `name`, `description`, `audience` frontmatter and `# Title` + `**Role:**` spine
3. At least one shared reference in `shared/references/*.md` if any skill declares `shared_references`

These are content authoring tasks, not stack changes. No new tooling needed.

---

## Verdict on Chosen Stack

The project's chosen stack (Node ≥ 20, plain ESM, `node --test`, single dep `yaml`) is correct and defensible. No changes recommended for v0.0.2. Three gaps discovered in v0.0.1 research are documented below.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | ≥ 20 LTS | Runtime | First LTS with stable `node:test`, stable `parseArgs`, native ESM `.js` without loader flags. Node 22 is current LTS (April 2025) — `"engines": { "node": ">=20" }` covers both. |
| ESM (`"type":"module"`) | — | Module format | Zero transpilation, native `import/export`, direct execution via `node`. No build step. |
| `yaml` | 2.9.0 | YAML 1.2 parsing | Only runtime dep needed. YAML 1.2 core schema by default (no `yes`/`no` boolean surprises). `parseDocument()` accumulates errors in `doc.errors[]` without throwing — ideal for a linter that must report all errors, not just the first. |
| `node:test` | stdlib (Node ≥ 20) | Test runner | Stable since Node 20. `describe`/`it`/`mock`/`beforeEach` all present. ESM-native. `node --test` auto-discovers `*.test.js`. No install. |
| `node:util` `parseArgs` | stdlib (Node ≥ 20) | CLI arg parsing | Stable since Node 20 (was experimental in 18.3). Replaces `commander` for two-subcommand CLIs. Returns `{ values, positionals }`. Zero dependencies. |

### Supporting Stdlib (no install needed)

| Module | Purpose | Notes |
|--------|---------|-------|
| `node:fs/promises` | Async file I/O | `readFile`, `readdir`, `mkdir`, `cp`, `rm` — covers all build and lint I/O |
| `node:path` | Path manipulation | `join`, `resolve`, `relative`, `basename`, `extname` |
| `node:process` | Exit codes, argv | `process.exit(1)` on lint failure; `process.argv` fed to `parseArgs` |
| `node:assert` | Assertions in tests | `assert.strictEqual`, `assert.deepStrictEqual`, `assert.throws` — enough for all unit assertions |
| `node:url` | `fileURLToPath` | Needed for `__dirname` equivalent in ESM: `path.dirname(fileURLToPath(import.meta.url))` |
| `node:os` | `tmpdir()` | Used in unit tests for `mkdtemp`-based temp fixture directories |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `node --test` | Run tests | `node --test` discovers all `*.test.js` recursively from cwd; `--test-reporter=spec` for readable output |
| `node --test --experimental-test-coverage` | Coverage | Built-in; available in Node 20+; marks `--experimental` but reliable enough for CI |
| `claude plugin validate` | Validate output | Run against `dist/` to verify plugin structure before shipping; built into Claude Code CLI |
| `husky` | Pre-commit hook | Runs `npm test` (= `node --test`) before every commit; catches dogfood regressions automatically |

---

## Installation

```bash
# One runtime dependency
npm install yaml

# One dev dependency (pre-commit hook runner)
npm install -D husky

# No other dependencies needed
```

---

## Claude Code Plugin Output Format (verified against official docs)

This is the spec Motto's `build` command must produce. Verified from `code.claude.com/docs/en/plugins-reference` (2026-06-30).

### Plugin directory layout

```
dist/<plugin-name>/                  ← plugin root
├── .claude-plugin/
│   └── plugin.json                  ← manifest (only 'name' required)
└── skills/
    └── <skill-name>/
        ├── SKILL.md                 ← verbatim copy from source
        └── references/              ← resolved shared refs (bundled here)
            └── *.md
```

**Critical rule:** All components (`skills/`, `commands/`, `agents/`) must be at the plugin root, NOT inside `.claude-plugin/`. Only `plugin.json` belongs in `.claude-plugin/`.

**Single-skill shortcut (v2.1.142+):** A `SKILL.md` at the plugin root with no `skills/` dir is auto-discovered as a single-skill plugin. Not recommended for Motto's multi-skill output.

### `plugin.json` manifest schema

```json
{
  "name": "project-name",
  "version": "1.0.0",
  "description": "...",
  "author": { "name": "...", "email": "..." },
  "license": "MIT",
  "keywords": ["..."]
}
```

**Required fields:** `name` only (kebab-case, unique identifier).
**Recommended fields:** `version` (semver; if omitted Claude Code uses git SHA as version — wrong behavior for packaged dist), `description`, `author`, `license`.
**Unknown fields:** Claude Code ignores them (but `claude plugin validate --strict` warns).

**Gap 1 — `motto.yaml` must generate `plugin.json` version correctly:** If `version` is omitted from `plugin.json`, Claude Code falls back to git SHA of the install directory — which is the dist directory, likely not a git repo. Always emit `version` from `motto.yaml`'s project version field.

### SKILL.md frontmatter — exact specification

Verified from `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview` (2026-06-30).

**Required frontmatter fields:**

| Field | Rules |
|-------|-------|
| `name` | Max 64 chars. Pattern: `[a-z][a-z0-9-]*` (lowercase letters, numbers, hyphens only). No XML tags. Cannot contain reserved words `"anthropic"` or `"claude"` as substrings. Must match parent folder name. |
| `description` | Non-empty. Max 1024 chars. No XML tags. Should state both what the skill does and when Claude should trigger it. |

**Optional frontmatter fields:**
All other fields are optional and harmless — Claude Code ignores unknown frontmatter keys. Motto's linter should validate only `name` and `description`, and copy SKILL.md verbatim to dist (which is the correct stated approach).

**Gap 2 — `shared_references` is a Motto-specific field, not a Claude Code field.** It is linted by Motto but ignored by Claude Code at runtime. That is correct and intentional.

---

## YAML Frontmatter Extraction Pattern

`gray-matter` is NOT needed. Ten lines of stdlib + `yaml` does the job:

```js
import { parseDocument } from 'yaml';

function parseFrontmatter(source) {
  // Handles both LF and CRLF
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: source, errors: [] };
  const doc = parseDocument(match[1]);
  return {
    frontmatter: doc.toJS(),
    body: match[2],
    errors: doc.errors,   // YAMLParseError[]
    warnings: doc.warnings,
  };
}
```

`parseDocument()` never throws; it accumulates errors in `doc.errors[]`. Each error has `.message`, `.pos`, `.linePos`. This is exactly what a linter needs — collect all errors before reporting.

---

## CLI Entry Point Pattern

```json
// package.json
{
  "type": "module",
  "bin": { "motto": "./bin/motto.js" },
  "engines": { "node": ">=20" }
}
```

```js
// bin/motto.js
#!/usr/bin/env node
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help:    { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
});

const [subcommand] = positionals;
// dispatch to lint() or build()
```

`parseArgs` limitation: no built-in sub-command routing or help text generation. Write both manually — it is ~20 lines for two subcommands. Do not reach for `commander` to avoid this.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `yaml` v2.9 | `js-yaml` v4 | `js-yaml` defaults to YAML 1.1 schema (treats `yes`/`no`/`on`/`off` as booleans — wrong for skill files). `yaml` defaults to YAML 1.2 core schema. `yaml` has superior error objects with position info. `js-yaml` weekly downloads are higher but the library is less actively maintained. |
| `yaml` v2.9 | `gray-matter` | `gray-matter` wraps `js-yaml` (YAML 1.1 issues apply) and adds a dependency. The frontmatter extraction is 10 lines of regex + `yaml.parseDocument()`. Zero reason to add `gray-matter` when you already have `yaml`. |
| `node:test` | Vitest / Jest / Mocha | All require installation, configuration, and (for Vitest/Jest) understand ESM only with additional config. `node:test` is zero-config for a pure-ESM project. The API surface (`describe`/`it`/`mock`) is sufficient for unit-testing a file I/O + schema validation CLI. |
| `node:util parseArgs` | `commander` | `commander` is 50 kB and designed for complex CLI trees. Motto has two subcommands (`lint`, `build`) and a handful of flags. `parseArgs` handles this without a dependency. The only real loss is auto-generated help text — write it as a constant string. |
| `node:fs/promises` | `glob` / `fast-glob` | Motto's directory structure is shallow and well-defined (`skills/<name>/`, `shared/references/`). A `readdir` + filter loop is 5 lines. `glob` adds a dependency for zero benefit on a known-shape tree. |
| Plain JS (ESM) | TypeScript | TypeScript requires a build step, contradicting the project's "no build step" constraint. For a ~500-line CLI, JSDoc types on exported functions are sufficient for IDE support. |
| Manual validation | `zod` / `ajv` | A YAML schema validator with custom error messages for two required fields is 20 lines. `zod`/`ajv` add a dependency and return generic error messages that would need custom formatting anyway. |
| In-place dogfood test | Copy tree to `tmpdir` | Copying adds complexity, adds nothing (buildProject is already idempotent), and defeats the dogfood premise. Run against the real tree. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `chalk` / `kleur` / `picocolors` | Terminal color adds a dependency for cosmetic output. Lint errors must be machine-parseable anyway; color is a nice-to-have. | Plain string formatting; add color only if a user requests it post-MVP |
| `js-yaml` | YAML 1.1 schema by default — treats `yes`/`no`/`on`/`off`/`true`/`false` inconsistently; no position-aware error objects | `yaml` v2 |
| `gray-matter` | Wraps `js-yaml` (inheriting its schema issues); adds a dep for 10 lines of work; last major release 2019 | Inline frontmatter extraction with `yaml` |
| `commander` / `yargs` | Heavyweight for two subcommands | `node:util parseArgs` |
| `zod` / `ajv` / `joi` | Schema validation frameworks; add dependency + generic error messages that still need custom formatting | Manual validation functions with specific, actionable error messages |
| TypeScript | Requires `tsc` build step; contradicts no-build-step constraint | Plain ESM JavaScript with JSDoc |
| `jest` / `vitest` | Require install + ESM config; not needed when `node:test` is stable and sufficient | `node:test` + `node:assert` |
| `glob` / `fast-glob` | Overkill for a fixed-shape source tree | `node:fs/promises readdir` with `recursive: true` option (Node 18.17+) |
| `mkdirp` / `rimraf` | Both superseded by Node stdlib | `fs.mkdir(path, {recursive:true})` and `fs.rm(path, {recursive:true,force:true})` |
| Snapshot libraries | Over-engineering; live assertions on the real dist/ are the ground truth | `node:assert/strict` + `fs.stat` / `fs.readFile` |

---

## Gap Analysis

**Gap 1 — `version` in `plugin.json` is required for correct behavior.** Motto must emit `version` from the project's `motto.yaml`. If omitted, Claude Code version-tracks plugins by git SHA of the install location — which breaks for packaged distributions. Lint rule: `motto.yaml` must have a `version` field; `build` must propagate it to `plugin.json`.

**Gap 2 — `name` validation has a reserved-word rule.** SKILL.md `name` cannot contain `"anthropic"` or `"claude"` as substrings (case-sensitive per docs). Motto's linter must check this. It is not obvious from the field description alone.

**Gap 3 — `audience` field (`public`|`private`) is a Motto-specific concept, not a Claude Code field.** The output plugin directory name (your project name) is what separates public from private plugins — they are two separately-packaged plugin directories in `dist/`. Claude Code itself has no concept of audience; both are standard plugins. Motto's `build` command routes skills into `dist/public/<name>/` vs `dist/private/<name>/` based on the `audience` frontmatter key. Lint rule: `audience` must be `"public"` or `"private"` (no `"both"`).

---

## Version Compatibility

| Package | Node.js | Notes |
|---------|---------|-------|
| `yaml@2.9.0` | ≥ 14.6 | Works fine on Node 20, 22, 24 |
| `node:test` | ≥ 20.0 (stable) | Available in 18 but marked experimental; use ≥ 20 |
| `node:util parseArgs` | ≥ 20.0 (stable) | Available in 18.3 but experimental; use ≥ 20 |
| `fs.readdir({recursive:true})` | ≥ 18.17 | Required for recursive directory scan without `glob` |
| `fs.cp()` | ≥ 16.7 | Available and stable in Node 20 |

---

## Sources

- `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview` — SKILL.md frontmatter spec (required fields, name/description constraints, folder layout). Verified 2026-06-30. Confidence: MEDIUM (official Anthropic docs).
- `code.claude.com/docs/en/plugins-reference` — plugin.json manifest complete schema, plugin directory layout, version management behavior. Verified 2026-06-30. Confidence: MEDIUM (official Claude Code docs).
- `eemeli.org/yaml/` — yaml v2 API: parse, parseDocument, error handling, schema options. Verified 2026-06-30. Confidence: MEDIUM.
- `registry.npmjs.org/yaml/latest` — confirmed yaml@2.9.0 as current latest. Verified 2026-06-30. Confidence: HIGH.
- `nodejs.org/api/util.html#utilparseargsconfig` — parseArgs stable since Node v20.0.0, full option schema. Verified 2026-06-30. Confidence: HIGH (official Node.js docs).
- `nodejs.org/learn/test-runner/using-test-runner` — node:test stable in Node 20, ESM support, describe/it/mock/coverage. Confidence: HIGH (official Node.js docs).
- Direct codebase inspection — `src/build.js`, `src/lint.js`, `test/build.test.js`, `package.json`, `.gitignore`. Verified 2026-06-30. Confidence: HIGH.

---

*Stack research for: Motto CLI (Node ESM, YAML linter, Claude Code plugin packager)*
*Researched: 2026-06-30 (v0.0.2 dogfood addendum)*
