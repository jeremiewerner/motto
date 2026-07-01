# Research Summary: Motto v0.0.4 "Project Bootstrap"

**Project:** Motto CLI Tool
**Domain:** Node.js scaffold/init command + CLI ergonomics (--help, [path] args)
**Researched:** 2026-07-01
**Confidence:** HIGH (verified against Node.js stdlib docs, official Claude Code docs, direct codebase inspection)

---

## Executive Summary

Motto v0.0.4 adds three capabilities to the existing lint/build CLI: (1) a `motto init [name]` scaffold command that generates a complete, immediately-lintable project tree, (2) `--help` flag support, and (3) optional `[path]` positional arguments for `lint` and `build` to operate on directories other than cwd. The research confirms this can be built entirely with Node.js stdlib — **zero new dependencies** — extending Motto's existing pure-core/thin-I/O-shell architecture.

The critical success factor is the starter skill scaffolded by `motto init` — it must pass `motto lint` and `motto build` on the first run with zero user edits. This makes the starter skill template a high-risk artifact: any drift from the current schema causes every new project to fail lint immediately. The research identifies six critical pitfalls centered on this risk (schema drift, name validation inconsistency, .gitignore contradiction, marketplace.json three-way naming), all preventable with deliberate design choices and automated testing.

**Recommended approach:** Build in three phases ordered by risk: (1) templates + pure-function tests to verify schema conformance early, (2) init orchestrator + scaffolding tests + integration round-trip, (3) CLI wiring + documentation. Use inline template strings (not separate files) to avoid npm allowlist bugs. Reuse the existing `NAME_KEBAB` regex for all name validation. Deploy a permanent "scaffold-dogfood" regression test to prevent schema drift. Sequence `setup-project` skill deletion and test-count updates as a single commit to avoid leaving main red.

---

## Key Findings

### Recommended Stack

**Zero new runtime dependencies. All capabilities use Node.js stdlib already in use elsewhere.**

The v0.0.4 additions (init, --help, [path]) are entirely solvable with APIs stable since Node 20. See STACK.md for detailed analysis. Core technologies remain unchanged from v0.0.1–v0.0.3:

- **Node.js ≥ 20 LTS** — stable `node:test`, `parseArgs`, native ESM `.js` without transpilation
- **ESM (`"type": "module"`)** — zero build step, direct execution
- **`yaml` 2.9.0** — YAML 1.2 core schema, error collection without throwing
- **`node:test`** — stdlib runner, ESM-native, zero config
- **`node:util parseArgs`** — stable subcommand + flag parsing, strict-mode, zero dependencies

### Expected Features

See FEATURES.md for comprehensive research. Verified via 5+ scaffold-tool precedents + official Claude Code docs.

**Table stakes:**
- `motto init [name]` — non-empty-dir guard, --force override
- Non-interactive, flag-driven scaffold
- Complete, immediately-buildable tree (motto.yaml, marketplace.json, skills/example/, .gitignore)
- Starter skill passes `motto lint` and `motto build` with zero edits
- `--help` with real usage text, exit 0
- `[path]` optional for `lint` and `build`, default cwd
- README "ship your plugin" section

**Differentiators:**
- Starter skill demonstrates schema (Title+Role spine, references/ layout) — documentation by example
- Pre-filled `motto.yaml` defaults (name from arg/cwd basename, version 0.0.1, owner from git config)
- Correct `marketplace.json` with relative-path source (`./dist/public/`), not npm
- Three-way name consistency enforced by construction

**Defer to v2+:** Interactive prompts, template flavors, `motto ship` command, auto-git-init.

### Architecture Approach

See ARCHITECTURE.md for detailed design. Extends existing patterns without new paradigms.

**Major components:**
1. **`src/templates.js` (NEW, pure)** — Functions generating YAML, JSON, Markdown strings; unit-testable, zero I/O
2. **`src/init.js` (NEW, I/O shell)** — Matches lint.js/build.js shape: `initProject(targetPath, name)` → `{ok, errors[], dir}`, never throws
3. **Scaffold-dogfood test** — Permanent regression check: init → lint → build round trip

**Starter skill strategy:** Fixed literal name (e.g. `skills/example/`) decoupled from user's project name, avoiding double-validation bugs.

### Critical Pitfalls

See PITFALLS.md for complete analysis. Top six ranked by impact:

1. **`.gitignore` contradicts README** — Blanket `dist/` rule hides `dist/public/` that users must commit. Solution: `dist/*` + `!dist/public/` negation pattern, tested via `git check-ignore`.

2. **Templates excluded from npm package** — If templates live in separate folder, `package.json` `files` allowlist doesn't include them. Works locally, breaks for `npm i -g` users. Solution: Embed as JS strings in `src/init.js` (preferred), or add folder to `files` + test via `npm pack`.

3. **parseArgs strict-mode + --help retrofit** — `--help` check must run BEFORE subcommand dispatch, or `motto lint --help` runs lint instead of printing help. Declare `--help` in options schema, check immediately after parseArgs.

4. **Divergent name validation** — `validateSkill` has length + reserved-word checks; `loadConfig` has only length cap. Init must reuse skill-grade validation to avoid "init accepts what lint rejects" failure mode. Test: edge-case names must be accepted/rejected identically by init and lint.

5. **Starter skill drifts from schema** — No automated test re-runs `motto lint` on fresh init output. Schema changes silently break the template for new users. Solution: Mandatory scaffold-dogfood test (init → lint → build → assert ok:true).

6. **marketplace.json three-way name drift** — Plugin name must match across motto.yaml, marketplace.json, and built plugin.json. Also: relative `source` paths only resolve when marketplace is git-added. Solution: Interpolate name as single variable, use relative source, document git-add requirement.

---

## Implications for Roadmap

**Suggested three-phase structure, ordered by risk and dependency:**

### Phase 1: Template Functions + Verification

**Rationale:** Starter skill is highest-risk artifact — validate it early, before orchestration.

**Delivers:**
- `src/templates.js` with pure functions
- `test/init.test.js` unit tests: feed template output through existing validators, assert no errors
- Confidence in starter skill conformance

**Avoids pitfalls:** 5 (schema drift), 4 (name validation)

**Research needed:** None. Pure functions, existing validators, no external dependencies.

### Phase 2: Init Orchestrator + Scaffolding Tests

**Rationale:** Once templates proven conformant, build orchestrator. Test full init flow, guardrails, marketplace consistency.

**Delivers:**
- `src/init.js` (I/O shell, matches lint.js/build.js)
- Non-empty-dir collision guard + `--force` override
- Name validation (reuse NAME_KEBAB, apply skill-grade rules)
- Integration tests: scaffold-dogfood round trip (init → lint → build)
- Verification: marketplace.json three-way name consistency
- Verification: `.gitignore` pattern (dist/private/ ignored, dist/public/ NOT ignored)

**Avoids pitfalls:** 1 (.gitignore), 4 (name validation), 6 (marketplace consistency)

**Research needed:** None. Patterns proven in lint.js/build.js, marketplace schema verified.

### Phase 3: CLI Wiring + Documentation

**Rationale:** Once init works standalone, integrate into CLI. Delete old instructional skill. Document ship flow.

**Delivers:**
- `bin/motto.js` mods: init dispatch, `--help`/`-h` option declaration + early check, `[path]` positional resolution
- `test/dogfood.test.js` updates: count assertions 3→2, remove setup-project checks
- Delete `skills/setup-project/` (same commit as test count fix)
- README "ship your plugin" section
- Optional: `npm pack` integration test

**Avoids pitfalls:** 2 (npm files allowlist), 3 (parseArgs/--help)

**Research needed:** None. bin/motto.js patterns established, --help integration verified.

**Critical:** setup-project deletion and test-count fix MUST land together — no gap or main goes red.

### Phase Ordering Rationale

1. Templates first: Highest-risk, slowest feedback. Validate in isolation.
2. Orchestrator second: Depends on templates; mirrors existing patterns, low-risk.
3. CLI wiring last: Depends on init; orthogonal changes grouped for efficiency.
4. Docs: Can parallelize but finalize after CLI for accuracy.

### Research Flags

**No additional research needed for any phase.** All required knowledge exists in:
- Node.js v20+ stdlib docs (verified for parseArgs, execFileSync, fs/promises)
- Direct codebase inspection (patterns proven in lint/build)
- Official Claude Code docs (marketplace.json schema verified)

**Optional low-priority smoke test (can defer if shipping urgent):**
- Exact `marketplace.json` `skills` override semantics with relative-path source — manual `/plugin marketplace add ./` test to confirm skills discovery works as expected.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Verified against Node.js v20+ stdlib docs. Direct codebase inspection. Zero new dependencies; all APIs stable since Node 20 LTS. |
| **Features** | HIGH | Table-stakes researched via 5+ ecosystem precedents (cargo, poetry, npm, vite, claude). Differentiators verified against working repo example. Official Claude Code docs consulted. |
| **Architecture** | HIGH | Direct codebase inspection confirms patterns already established and proven. No new architectural concepts, extends existing pure-core/I/O-shell split. |
| **Pitfalls** | HIGH | All six pitfalls derived from direct code inspection with concrete failure modes and recovery strategies. Each paired with specific test to catch it. |

**Overall confidence: HIGH**

The milestone is well-scoped, dependencies satisfied by stdlib, architecture extends proven patterns. Primary execution risk is implementation detail (marketplace.json field interpolation, test count updates), not research uncertainty.

### Gaps to Address

**Gap 1: npm package distribution**
- If templates deferred to separate files, add `npm pack` test as gating criterion. Recommended: inline JS strings per STACK.md.

**Gap 2: marketplace.json `skills` override semantics**
- Low priority. Manually test during Phase 2: `motto init → motto build → /plugin marketplace add ./dist/public/` to confirm skills discovery. If behavior differs from expectation, document exact field configuration.

**Gap 3: git config fallback**
- During Phase 2, handle both error cases (git not found, config empty). Fall back to placeholder string with visible TODO comment in generated marketplace.json.

---

## Sources

### Primary (HIGH confidence)

- **Node.js Documentation** — nodejs.org/api/ (util parseArgs, child_process execFileSync, test runner). Verified 2026-07-01. All v20+ APIs stable.
- **Direct Codebase Inspection** — bin/motto.js, src/lint.js, src/build.js, src/schema.js, src/config.js, test/dogfood.test.js, package.json, motto.yaml, .claude-plugin/marketplace.json. Read 2026-07-01. First-party ground truth.
- **Official Claude Code Documentation** — code.claude.com/docs/en/plugins-reference, code.claude.com/docs/en/plugin-marketplaces. Fetched 2026-07-01. MEDIUM confidence (official but external; verify at implementation).
- **`.planning/PROJECT.md`** — v0.0.4 milestone scope, Active requirements, locked decisions. First-party source of truth.

### Secondary (MEDIUM confidence)

- **Ecosystem Tool Research** — npm init, cargo init/new, poetry init/new, create-vite, claude plugin init. Researched via official docs + examples. Cross-checked across 5+ tools.

---

*Research completed: 2026-07-01*
*Ready for roadmap: yes*
*Ready for phase planning: yes*
