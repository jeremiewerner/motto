<!-- GSD:project-start source:PROJECT.md -->

## Project

**Motto**

Motto is a framework for **authoring, validating, and packaging Claude Code Agent Skills**. You author skills in a structured source tree (`skills/` + `shared/`), Motto enforces a strict schema, and `motto build` packages them into self-contained, distributable plugins named after *your* project. The output is plain, standard Agent Skills — any agent loads them with no knowledge of Motto.

**Core Value:** The **strict schema + linter**. Skills that always conform to one rigid-yet-creative structure, validated before they ship. The rigor is the product; the build is plumbing.

### Constraints

- **Tech stack**: Node ≥ 20, plain ESM JavaScript, `node --test` (stdlib runner), single runtime dependency `yaml` — keep the maintenance surface minimal.
- **Portability**: built skills must be standard Agent Skills, loadable with no Motto present.
- **Philosophy**: mechanism over features; YAGNI ruthlessly; iterate slowly. Accuracy, portability, extensibility, maintenance are the fundamentals.
- **No content stripping**: `SKILL.md` is copied verbatim to dist (unknown frontmatter keys are harmless).
- **Upgrade path (standing, since v0.0.7)**: every change to project structure or an existing feature ships with a way for existing Motto projects to upgrade (documented steps at minimum); breaking changes need an `UPGRADING.md` entry — see the release skill's Ledger Gate. Hard breaks without a path — like v0.0.5's `<role>` migration — are no longer acceptable now that real consumer projects (magma) exist.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Verdict on Chosen Stack

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

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `node --test` | Run tests | `node --test` discovers all `*.test.js` recursively from cwd; `--test-reporter=spec` for readable output |
| `node --test --experimental-test-coverage` | Coverage | Built-in; available in Node 20+; marks `--experimental` but reliable enough for CI |
| `claude plugin validate` | Validate output | Run against `dist/` to verify plugin structure before shipping; built into Claude Code CLI |

## Installation

# One runtime dependency

# No dev dependencies needed

## Claude Code Plugin Output Format (verified against official docs)

### Plugin directory layout

### `plugin.json` manifest schema

### SKILL.md frontmatter — exact specification

| Field | Rules |
|-------|-------|
| `name` | Max 64 chars. Pattern: `[a-z][a-z0-9-]*` (lowercase letters, numbers, hyphens only). No XML tags. Cannot contain reserved words `"anthropic"` or `"claude"` as substrings. Must match parent folder name. |
| `description` | Non-empty. Max 1024 chars. No XML tags. Should state both what the skill does and when Claude should trigger it. |

## YAML Frontmatter Extraction Pattern

## CLI Entry Point Pattern

#!/usr/bin/env node

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

## Gap Analysis

## Version Compatibility

| Package | Node.js | Notes |
|---------|---------|-------|
| `yaml@2.9.0` | ≥ 14.6 | Works fine on Node 20, 22, 24 |
| `node:test` | ≥ 20.0 (stable) | Available in 18 but marked experimental; use ≥ 20 |
| `node:util parseArgs` | ≥ 20.0 (stable) | Available in 18.3 but experimental; use ≥ 20 |
| `fs.readdir({recursive:true})` | ≥ 18.17 | Required for recursive directory scan without `glob` |
| `fs.cp()` | ≥ 16.7 | Available and stable in Node 20 |

## Sources

- `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview` — SKILL.md frontmatter spec (required fields, name/description constraints, folder layout). Verified 2026-06-30. Confidence: MEDIUM (official Anthropic docs).
- `code.claude.com/docs/en/plugins-reference` — plugin.json manifest complete schema, plugin directory layout, version management behavior. Verified 2026-06-30. Confidence: MEDIUM (official Claude Code docs).
- `eemeli.org/yaml/` — yaml v2 API: parse, parseDocument, error handling, schema options. Verified 2026-06-30. Confidence: MEDIUM.
- `registry.npmjs.org/yaml/latest` — confirmed yaml@2.9.0 as current latest. Verified 2026-06-30. Confidence: HIGH.
- `nodejs.org/api/util.html#utilparseargsconfig` — parseArgs stable since Node v20.0.0, full option schema. Verified 2026-06-30. Confidence: HIGH (official Node.js docs).
- `nodejs.org/learn/test-runner/using-test-runner` — node:test stable in Node 20, ESM support, describe/it/mock/coverage. Confidence: HIGH (official Node.js docs).

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
