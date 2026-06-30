---
phase: 02-motto-lint
verified: 2026-06-30T00:00:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
---

# Phase 2: motto lint Verification Report

**Phase Goal:** Developers can run `motto lint` against a project and get a complete, deterministic error report or a clean exit.
**Verified:** 2026-06-30
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Running `motto lint` on an all-valid project prints `✓ N skills OK` and exits 0 (LINT-06, CLI-01, D2-11) | VERIFIED | Empirical: 1-skill fixture printed `✓ 1 skills OK` exit 0; 2-skill fixture printed `✓ 2 skills OK` exit 0. Unit tests: `lintProject — happy path` passes. |
| 2 | Running `motto lint` on a project with errors prints one `✗ <skill>: <message>` per error and exits 1, collecting errors across ALL skills before reporting (LINT-06, D2-06, D2-11) | VERIFIED | Empirical: 2-skill error fixture printed `✗ skill-one: missing SKILL.md` and `✗ skill-two: missing SKILL.md`, exit 1. Unit test: `lintProject — error collection across all skills` passes. |
| 3 | Skills are discovered and reported in alphabetical order regardless of filesystem readdir order (LINT-07, D2-03) | VERIFIED | Empirical: `zeta-skill` created before `alpha-skill` on disk; output showed `alpha-skill` first. Unit test: `lintProject — alphabetical skill ordering` passes. Code: `localeCompare` sort in `discoverSkillNames`. |
| 4 | A single malformed-YAML skill is reported as an error while every other skill continues to lint normally (LINT-07, D2-06) | VERIFIED | Empirical: `bad-skill` (unterminated YAML string) produced 4 errors; `good-skill` produced zero errors; lintProject returned normally (no throw). Unit test: `lintProject — per-file error isolation` passes. |
| 5 | A missing or invalid `motto.yaml` is reported first under the `motto.yaml:` label and does NOT abort the skill scan (D2-09, D2-10) | VERIFIED | Empirical: config missing `version` produced `✗ motto.yaml: missing version` before `✗ some-skill: missing SKILL.md`. Unit test: `lintProject — config errors precede skill errors` passes. Code: `processConfig` runs first in `lintProject`, errors tagged `skill:'motto.yaml'`. |
| 6 | A project with zero candidate skills is an error (`✗ no skills found`), exit 1 (D2-13) | VERIFIED | Empirical: no `skills/` dir produced `✗ (project): no skills found`, exit 1. Unit tests: `lintProject — zero skills (A)` and `(B)` both pass. |
| 7 | The `motto` binary is invocable via the `package.json` bin field, has a node shebang, and the executable bit set (CLI-01, D2-14) | VERIFIED | `test -x bin/motto.js` → EXECUTABLE=yes. `head -1` → `#!/usr/bin/env node`. `package.json` has `"bin": { "motto": "./bin/motto.js" }`. All empirical tests invoked `node bin/motto.js lint` successfully. |

**Score:** 7/7 truths verified (0 present, behavior-unverified)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lint.js` | Exports `async lintProject(projectRoot) → { ok, errors, count }` | VERIFIED | File exists, 207 lines, substantive implementation of 4 internal helpers + exported `lintProject`. Returns `{ ok, errors, count }` (count added as intentional deviation — surfaces skill count for CLI; documented in SUMMARY). |
| `bin/motto.js` | Executable CLI shell, shebang, parseArgs dispatch | VERIFIED | File exists, 67 lines, shebang on line 1, executable bit set, `parseArgs` dispatch to `lint`/`build`/default. Imports `lintProject` from `../src/lint.js`. |
| `test/lint.test.js` | Behavior suite, temp-dir fixtures, 8+ scenarios | VERIFIED | File exists, 360 lines, 10 `it()` cases across 8 `describe` blocks covering all 8 plan scenarios. All 10 pass in `node --test`. |
| `package.json` bin field | `"bin": { "motto": "./bin/motto.js" }` | VERIFIED | Present. `scripts` and `devDependencies` (husky) unchanged. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/motto.js` | `src/lint.js` | `import { lintProject } from '../src/lint.js'` | WIRED | Line 21 of bin/motto.js; `lintProject(process.cwd())` called in lint dispatch. |
| `src/lint.js` | `src/frontmatter.js` | `import { parseFrontmatter } from './frontmatter.js'` | WIRED | Line 28; used in `processSkill` to parse SKILL.md text. |
| `src/lint.js` | `src/schema.js` | `import { validateSkill } from './schema.js'` | WIRED | Line 29; called as `validateSkill({ dirName, data, body }, sharedRefs)` — exact param shape confirmed against schema.js JSDoc. |
| `src/lint.js` | `src/config.js` | `import { loadConfig } from './config.js'` | WIRED | Line 30; called in `processConfig` with file text. |
| `sharedRefs Set` | `validateSkill` | `loadSharedRefs` → `discoverSkillNames` → `processSkill` | WIRED | `loadSharedRefs` scans `shared/references/*.md` → `Set<string>` of basenames → passed into `validateSkill` as second arg. |
| `parseFrontmatter errors` | `{ skill, message }` | lift in `processSkill` | WIRED | `for (const e of parseErrors) errors.push({ skill: dirName, message: e.message })` — adds `skill` field absent from raw parseFrontmatter output. |
| `loadConfig errors` | `{ skill:'motto.yaml', message }` | lift in `processConfig` | WIRED | `errors.push({ skill: 'motto.yaml', message: e.message })` — adds `skill` field absent from raw loadConfig output. |
| `package.json bin` | `bin/motto.js` | `"bin": { "motto": "./bin/motto.js" }` | WIRED | Confirmed in package.json. |

### Data-Flow Trace (Level 4)

Not applicable — `src/lint.js` is an orchestrator function (not a UI component rendering dynamic data), and `bin/motto.js` is a thin CLI shell. Data flows from filesystem → lintProject → stdout; verified empirically end-to-end.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SC1: Happy path exits 0, prints `✓ 1 skills OK` | `node bin/motto.js lint` in 1-valid-skill fixture | `✓ 1 skills OK`, exit 0 | PASS |
| SC1 (2 skills): correct count | `node bin/motto.js lint` in 2-valid-skill fixture | `✓ 2 skills OK`, exit 0 | PASS |
| SC2: Error collection, exits 1 | `node bin/motto.js lint` in 2-missing-SKILL.md fixture | `✗ skill-one: missing SKILL.md` + `✗ skill-two: missing SKILL.md`, exit 1 | PASS |
| SC3: Alphabetical order | `node bin/motto.js lint` with zeta-skill created before alpha-skill | `✗ alpha-skill` precedes `✗ zeta-skill` | PASS |
| SC4: Malformed-YAML isolation | `node bin/motto.js lint` with bad-skill + good-skill | bad-skill errors present; good-skill produces no output; exits 1 | PASS |
| D2-10: Config errors first | `node bin/motto.js lint` with missing-version config + bad skill | `✗ motto.yaml: missing version` before `✗ some-skill: missing SKILL.md` | PASS |
| D2-13: Zero skills → error | `node bin/motto.js lint` with no skills/ dir | `✗ (project): no skills found`, exit 1 | PASS |
| D2-07/08: Missing shared/ → empty Set | `node bin/motto.js lint` with shared_references declared, shared/ absent | `✗ my-skill: shared_references entry "my-ref" not found…`, no top-level shared/ error | PASS |
| D2-16: Bad usage | `node bin/motto.js` (no sub), `bogus`, `--help` | `usage: motto <lint|build>` to stderr, exit 1 | PASS |
| Full test suite | `node --test` | 38/38 pass, 0 fail | PASS |

### Probe Execution

No probe scripts declared or conventional in this phase — probes are a migration/tooling pattern not applicable here.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| LINT-06 | 02-01-PLAN.md | All errors across all skills collected and reported as `skill: message`; exits 0 (clean) or 1 (errors) | SATISFIED | Error collection across both skills confirmed empirically and via unit tests. Exit codes confirmed. |
| LINT-07 | 02-01-PLAN.md | Skill discovery is deterministic (sorted by name) and per-file error-isolated | SATISFIED | Alphabetical ordering and per-file isolation confirmed empirically and via unit tests. |
| CLI-01 | 02-01-PLAN.md | `motto lint` validates the current project and prints per-error output with the correct exit code | SATISFIED | Binary invocable, cwd-based lint, correct output format and exit codes all confirmed empirically. |

No orphaned requirements for Phase 2 found in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bin/motto.js` | 60–61 | `// Reserved for Phase 3 … not yet implemented` / stderr message | INFO | Intentional Phase 3 stub. References specific follow-up work (Phase 3, BUILD-01..06, CLI-02). Not a BLOCKER. |

No TBD, FIXME, or XXX markers found in any phase-modified file.

### CONTEXT Decision Verification

| Decision | Claim | Code Evidence | Empirical | Status |
|----------|-------|---------------|-----------|--------|
| D2-10: config errors first | `motto.yaml:` errors precede skill errors | `processConfig` step 1 in `lintProject`; errors labelled `skill:'motto.yaml'` | `✗ motto.yaml: missing version` appeared before `✗ some-skill: missing SKILL.md` | VERIFIED |
| D2-13: zero skills → error | Null/empty skills → `"no skills found"`, exit 1 | `discoverSkillNames` returns null (ENOENT) or [] (empty); both branch to single "no skills found" push + early return | `✗ (project): no skills found`, exit 1 | VERIFIED |
| D2-05: missing SKILL.md → hard error | Missing SKILL.md attributed to dirName, greppable on "SKILL.md" | `processSkill` ENOENT → `errors.push({ skill: dirName, message: 'missing SKILL.md' })` | Multiple tests confirmed attribution | VERIFIED |
| D2-07/08: missing shared/ → empty Set | ENOENT on `shared/references/` yields `new Set()`, not an error | `loadSharedRefs` catches ENOENT → `return new Set()` | No top-level shared/ error; only downstream unresolved ref error | VERIFIED |
| process.exitCode (not process.exit) | Failure paths use `process.exitCode = 1` | `bin/motto.js` lines 39 (safe `process.exit()` after writeStderr in parseArgs catch), 57, 62, 66 all use `process.exitCode` | All empirical error paths exited 1 with full output buffered | VERIFIED |
| Error-shape normalization | `parseFrontmatter`/`loadConfig` errors lifted to `{ skill, message }` | `processConfig`: `errors.push({ skill: 'motto.yaml', message: e.message })`; `processSkill`: `errors.push({ skill: dirName, message: e.message })` | malformed-YAML output showed `✗ bad-skill: Missing closing "quote…` | VERIFIED |

### Human Verification Required

None. All behaviors were verifiable programmatically via unit tests and empirical CLI invocations.

---

## Summary

Phase 2 goal is achieved. All 7 plan must-have truths are independently verified, all 4 ROADMAP success criteria hold against real CLI behavior, all 3 requirements (LINT-06, LINT-07, CLI-01) are satisfied, all locked CONTEXT decisions (D2-05, D2-07, D2-08, D2-09, D2-10, D2-13, D2-14, D2-15, D2-16) are honored in code and confirmed empirically.

The full `node --test` suite passes 38/38 tests with no failures. The `motto lint` binary is a genuine working implementation — not a stub — covering happy path, error collection, alphabetical ordering, per-file isolation, config-first reporting, zero-skills detection, and shared-references resolution.

One intentional deviation from the PLAN artifact spec: `lintProject` returns `{ ok, errors, count }` rather than the specified `{ ok, errors }`. The `count` field is a purely additive extension (used by bin/motto.js for the `✓ N skills OK` line) and is explicitly documented in the SUMMARY. It does not affect correctness.

The `build` subcommand stub (`"not yet implemented (Phase 3)"`) is deliberate, scoped, and referenced — not an unresolved debt marker.

---

_Verified: 2026-06-30T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
