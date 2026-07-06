# Project Research Summary

**Project:** Motto v0.0.7 "Version Awareness"
**Domain:** Node.js CLI tool — YAML/Markdown linter and plugin packager with version stamping & skew detection
**Researched:** 2026-07-06
**Confidence:** HIGH (grounded entirely in actual v0.0.6 source, confirmed prior-art patterns, standing project constraints)

## Executive Summary

Motto v0.0.7 retrofits explicit version stamping and skew detection onto an already-shipped CLI that powers real consumer projects (Motto's own skills tree, and the external "magma" project) that have no version field yet. The architecture is clean: add a `mottoVersion` field (written at `motto init`, never auto-rewritten) to `motto.yaml`, read the tool's own version from `package.json` at runtime, compare them silently during `lint`/`build` with never-throw semantics, and surface skew as an informational warning. The single highest risk is the bootstrap problem — treating a missing stamp as an error instead of accepting it as the expected state of every pre-v0.0.7 project — which must be prevented by explicit test fixtures and /gsd-code-review before shipping.

The recommended approach mirrors the best prior art studied (Rails' explicit `config.load_defaults`, Terraform's direction-aware constraint checking) and avoids anti-patterns that break Angular CLI and cookiecutter (silent version-detection failures, no explicit stamp). Stack is zero new runtime dependencies — the comparison is hand-rolled regex + integer math, respecting Motto's standing single-dependency (`yaml`) constraint. No build-order surprises: pure modules (`version.js`) build first, then config parsing, then orchestrators (lint/build), then CLI presentation last. The upgrade *command* itself is explicitly deferred as YAGNI; this milestone is detection only.

**Key risks and mitigation:**
1. **Bootstrap/missing-stamp crash:** Treat absent `mottoVersion` as valid/informational, never an error. Test with unfilled `motto.yaml` first, before happy-path tests. (Pitfall 1)
2. **Malformed stamp parsing:** Type-guard all input (`typeof === 'string'` before `.split`), test adversarial YAML shapes (numbers, arrays, objects, null). (Pitfall 2)
3. **Wrong-direction remediation:** Message must branch on `stamped < tool` vs `stamped > tool` and name the concrete fix for each. (Pitfall 3)
4. **Silent stamp drift:** Make the "never auto-updates" decision explicit in PROJECT.md, not implicit. (Pitfall 4)
5. **Claude Code marketplace cache:** Verification step must diff actual plugin content against source, not trust `claude plugin update`'s cached status. (Pitfall 7)

---

## Key Findings

### Recommended Stack

**Verdict:** Zero new runtime dependencies. `mottoVersion` stamping and skew detection is fully covered by:
- `fs.readFileSync` + `JSON.parse` (reading Motto's own `package.json` at runtime — stable on all Node ≥20)
- Hand-rolled ~10-line major/minor/patch regex comparator (no `semver` package; Motto has never shipped prerelease tags, and the zero-dependency constraint is explicit)
- Existing `{ok, errors, warnings}` result-shape pipeline already proven across 4 prior milestones

**Core technologies (unchanged from v0.0.6):**
- Node ≥20 LTS (v22 current LTS as of April 2025; `"engines": {"node": ">=20"}` covers both)
- `yaml` 2.9.0 (YAML 1.2 core schema, no `yes`/`no` boolean surprises; only runtime dependency)
- `node:test` (stdlib, stable since Node 20; no install)
- ESM (`"type":"module"` in package.json; native `import/export`, zero transpilation)

**New capability mapping (v0.0.7 specific):**
- Stamp read: `fs.readFileSync(new URL(...), 'utf8') + JSON.parse` via `src/version.js`
- Comparison: hand-rolled `parseVersion()` + `compareVersions()` functions (~20 lines total)
- Message routing: branches on direction (`stamped < tool` vs `stamped > tool`)
- Upgrade-path ledger: plain markdown in `PROJECT.md` documenting breaking changes (v0.0.5's `<role>` migration is the first entry retroactively)

### Expected Features

**Must have (table stakes) — P1 for v0.0.7:**
- Stamp the tool version at scaffold time (`motto init`) — the precondition for all skew detection
- Detect skew and print explicit, actionable message during `lint`/`build` (both directions handled)
- Message names both versions and gives next step
- Missing/absent stamp handled gracefully, never a crash (pre-v0.0.7 projects must lint/build clean with advisory only)
- Breaking-change ledger documented

**Should have (competitive advantage) — P2 after validation:**
- Distinguish skew direction in message (tool-newer-than-project vs. project-newer-than-tool, each with its own remedy)
- Severity keyed to documented breaking boundaries, not every mismatch
- `--format json` structured skew field (extends v0.0.6's JSON output)

### Architecture Approach

Integration into existing v0.0.6 CLI. New `src/version.js` module holds pure comparison logic; `config.js` adds optional `mottoVersion` field parsing (mirrors `plugins.private` optionality); `init.js` stamps the field at scaffold time; `lint.js`/`build.js` check for skew after config load and push to a new `warnings[]` array on results (separate from `errors[]` to preserve exit-code-0 for skewed-but-otherwise-valid projects); `bin/motto.js`'s `renderResult` prints warnings to stderr as `⚠ <skill>: <message>` lines, independent of `ok`/`quiet` flags.

**Major components:**
1. **`src/version.js` (NEW)** — pure module: `getOwnVersion()` reads `package.json`; `parseVersion(v)` extracts major/minor/patch; `checkSkew()` returns warning or null
2. **`src/config.js` (MODIFIED)** — parse optional `mottoVersion` field from `motto.yaml` into `config.mottoVersion`; absence is NOT an error
3. **`src/init.js` (MODIFIED)** — wire `getOwnVersion()` into scaffold template, inject `mottoVersion: "<value>"` line
4. **`src/lint.js` + `src/build.js` (MODIFIED)** — after config load, call skew comparator, push result to `warnings[]` array
5. **`bin/motto.js` (MODIFIED)** — `renderResult` prints `warnings[]` to stderr, independent of `ok`/`quiet`

### Critical Pitfalls

1. **Bootstrap problem (missing stamp = error)** — Every pre-v0.0.7 project lacks the field. Treating absence as failure breaks immediately. Test missing-stamp fixture first, before happy-path.

2. **Malformed stamp crashes never-throw** — YAML parses `version: 7` as number. Type-guard first (`typeof === 'string'`), validate semver shape, test adversarial cases (non-string types, empty string, malformed strings).

3. **Skew message wrong-direction remedy** — Project stamped newer than tool needs a tool upgrade, not reinitialization. Compute direction and emit separate messages.

4. **Stamp drift — implicit decision** — Make the "never auto-updates" decision explicit in PROJECT.md, not left implicit.

5. **Semver edge cases** — Scope narrowly to three-segment releases Motto actually ships; reject prerelease suffixes cleanly rather than attempt-and-guess.

6. **Version-literal-in-tests brittleness** — Tests asserting `'0.0.7'` break every release. Read actual version at test-run time; assert relationships, not values.

7. **Claude Code marketplace cache** — Seven open GitHub issues report stale cache surviving updates. Verification must diff actual plugin content against source.

---

## Implications for Roadmap

Suggested phase structure: **single-phase delivery** (tight coupling of stamping + detection + message).

### Phase 1: Version Stamping & Skew Detection Core

**Rationale:** Stamping and detection are strictly sequential (no skew detection without a stamp). Pure module is foundation — build first, fully tested in isolation. All components are small, focused, testable.

**Delivers:**
- `motto init` stamps running tool's version into `motto.yaml`
- `motto lint`/`motto build` detect skew and emit direction-aware, never-throw advisory messages
- All pre-v0.0.7 projects lint/build clean with no exit-code change
- Comprehensive test coverage: adversarial tests for missing stamps, malformed values, both directions

**Build order within phase:**
1. `src/version.js` first (standalone, zero dependents)
2. `src/config.js` optionality
3. `src/init.js` stamping
4. `src/lint.js` skew wiring
5. `src/build.js` skew wiring
6. `bin/motto.js` warnings rendering
7. Housekeeping: stamp Motto's own `motto.yaml`

### Research Flags

**Phases needing deeper research:**
- None — version stamping is well-researched, grounded entirely in actual source and proven prior-art. No API research, no unknowns.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (entire):** Stack proven (zero new deps, hand-rolled semver is documented pattern); architecture integrates cleanly (config optionality mirrors `plugins.private`, result extends `{ok, errors}`). Skip research-phase; move directly to /gsd-plan-phase.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | **HIGH** | Zero new runtime dependencies. Every mechanism verified against v0.0.6 source and official Node.js docs. No version-gating surprises. |
| **Features** | **HIGH** | Prior-art of 8+ tools cross-checked; Motto's constraints locked. No feature-scope ambiguity. |
| **Architecture** | **HIGH** | Grounded entirely in actual v0.0.6 source code — every integration point verified by line-number reference. Component boundaries clear. |
| **Pitfalls** | **MEDIUM** | Bootstrap/malformed-input patterns are established practice; Claude Code marketplace findings are HIGH-confidence (7 open GitHub issues, confirmed). Recovery strategies inferred from project's 5 historical never-throw violations. |

**Overall confidence:** **HIGH**

The research is comprehensive and grounded. Ready to move to roadmap/planning.

### Gaps to Address

No critical gaps. Post-validation decisions (deferred to v0.0.7.x or next phase):

- **Severity-aware messaging:** Ledger of "documented breaking changes" will grow. Severity branch designed but held for validation against magma's real skew after Phase 1 ships.
- **Exact `--format json` skew field shape:** Structure will follow from validated plain-text message wording.
- **Backfill command:** No mechanism to retroactively add stamps this milestone — deferred as YAGNI. The "unstamped" state must be permanently-supported, non-error.

---

## Sources

### Primary (HIGH confidence)
- `/Users/jeremie/Projects/motto/bin/motto.js` — CLI dispatch, renderResult, JSON/text contract (verified 2026-07-06)
- `/Users/jeremie/Projects/motto/src/config.js` — config loading, optional field pattern, version field usage (verified 2026-07-06)
- `/Users/jeremie/Projects/motto/src/init.js` — scaffold template, mottoVersion injection point (verified 2026-07-06)
- `/Users/jeremie/Projects/motto/src/lint.js`, `src/build.js` — orchestrator patterns, result shapes (verified 2026-07-06)
- `/Users/jeremie/Projects/motto/.planning/PROJECT.md` — v0.0.7 scope, standing upgrade-path constraint (verified 2026-07-06)
- Official Node.js docs — stdlib stability, version compatibility (verified 2026-07-06)

### Secondary (MEDIUM confidence)
- Prior-art tools (Rails, Terraform, Cargo, ESLint, Volta, npm, Angular, Yeoman, cookiecutter) — from official docs + community write-ups, cross-checked across multiple sources (synthesized 2026-07-06)
- `anthropics/claude-code` GitHub issues (#72616, #61954, #16866, #69020, #17361, #37670, #13799) — confirmed stale marketplace cache behavior (verified 2026-07-06, 7 reports)

### Tertiary (LOW confidence)
- General schema-versioning practice — inferred from software-engineering literature (synthesized 2026-07-06)
- General brittle-test anti-pattern — from testing-practice sources (synthesized 2026-07-06)

---

*Research completed: 2026-07-06*
*Ready for requirements/roadmap: yes*
