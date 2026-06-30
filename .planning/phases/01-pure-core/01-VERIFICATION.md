---
phase: 01-pure-core
verified: 2026-06-30T00:00:00Z
status: passed
score: 16/16 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
---

# Phase 1: Pure Core Verification Report

**Phase Goal:** The parsing and validation foundation produces correct, deterministic results on all valid and malformed skill inputs.
**Verified:** 2026-06-30
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths sourced from PLAN frontmatter must_haves (three plans). ROADMAP success criteria #1-5 are fully subsumed by the plan-level truths below.

#### Plan 01-01: parseFrontmatter (PARSE-01..04)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A well-formed SKILL.md returns the correct {data, body} split (PARSE-01) | VERIFIED | B1 passes: `data.name === "my-skill"`, `data.audience === "public"`, `body === "# Title\n\nbody\n"`, `errors` deep-equals `[]` |
| 2 | A SKILL.md missing the --- block returns a named missing-frontmatter error in errors[] and never throws (PARSE-01, D-03) | VERIFIED | B2 passes: `errors.length === 1`, message matches `/frontmatter/`, `data` deep-equals `{}`, no throw via `doesNotThrow` |
| 3 | CRLF line endings and a leading UTF-8 BOM parse identically to LF/no-BOM input (PARSE-02, D-05) | VERIFIED | B4 passes: BOM+CRLF variant produces identical `data`, `body`, and empty `errors[]` |
| 4 | A YAML parse error in the frontmatter surfaces as a named error in errors[], never silently dropped (PARSE-03, D-02) | VERIFIED | B5 passes: `errors.length > 0` on unterminated-string input; `doesNotThrow` wrapper passes |
| 5 | A stray inner --- in the frontmatter produces a named delimiter error; a body horizontal-rule --- does not (PARSE-04, D-06) | VERIFIED | B6 passes: errors contains entry matching `/stray/i` and `/frontmatter/i`; B7 passes: `errors` deep-equals `[]` and `body.includes("\n---\n")` |

#### Plan 01-02: validateSkill (LINT-01..05)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | validateSkill returns [] for a fully valid skill | VERIFIED | B1 passes: `errors` deep-equals `[]` for a skill with valid name, description, audience, and body spine |
| 7 | Missing name, description, or audience are reported (LINT-01) | VERIFIED | B2 (missing name), B7 (missing description), B8 (missing/invalid audience) all produce the expected errors |
| 8 | A non-letter-start, non-kebab, or reserved-word (anthropic/claude) name is reported, and name must equal its folder (LINT-02, D-08, D-09) | VERIFIED | B3 (leading digit "0bad"), B4 (underscore "My_Skill"), B5 (reserved "claude-helper"), B6 (name != dirName) all produce exactly one error at the correct cascade step |
| 9 | audience other than exactly public or private is reported (LINT-03, D-11) | VERIFIED | B8 passes: both `audience: "both"` and absent audience produce the identical "audience must be public|private" message |
| 10 | A missing # Title or missing **Role:** body spine is reported, both independently (LINT-04, D-12) | VERIFIED | B9 passes: `errors.length === 2` with both a Title error and a Role error for a body missing both |
| 11 | An unsafe shared_references basename (contains / or .) or an unresolved entry is reported (LINT-05, D-10) | VERIFIED | B10 (unresolved "missing" reported; "voice" not reported); B11 (three unsafe basenames each get an unsafe-basename error; no "not found" messages) |

#### Plan 01-03: loadConfig (CONF-01..03)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 12 | loadConfig returns the parsed config and [] for a valid motto.yaml (CONF-01) | VERIFIED | C1 passes: `config.name === "poems"`, `config.plugins.public === "poems"`, `config.plugins.private === "poems-pro"`, `errors` deep-equals `[]` |
| 13 | Missing name, version, description, or plugins.public are all reported together (CONF-01, D-15) | VERIFIED | C2 passes: input missing version/description/plugins.public produces 3+ errors; all three field names appear in the joined messages |
| 14 | plugins.public and (when present) plugins.private are validated with the letter-start kebab regex (CONF-02, D-16) | VERIFIED | C3 ("Bad_Name"), C4 ("0bad"), C5 ("Bad/Name") each produce a plugin-name error |
| 15 | plugins.private is optional — absent is not an error (CONF-03, D-17) | VERIFIED | C6 passes: `errors` deep-equals `[]` when plugins.private key is absent |
| 16 | A malformed motto.yaml surfaces YAML parse errors in errors[] and never throws (D-18, D-02, D-01) | VERIFIED | C7 passes: `doesNotThrow` wrapper passes; `errors.length >= 1` on `"name: : :\n"` input |

**Score: 16/16 truths verified**

---

### ROADMAP Success Criteria Reconciliation

The ROADMAP.md Phase 1 success criteria contain one stale wording item requiring a doc-fix note:

**SC #1 stale wording:** "a file missing the `---` block **throws** a clear 'missing frontmatter' error" — the LOCKED design decision D-03 (PROJECT.md Key Decisions, plan 01-01-PLAN.md must-have D-03) is NEVER-THROW: `parseFrontmatter` returns a named missing-frontmatter error in `errors[]` and never throws. The implementation follows the locked never-throw contract. `src/frontmatter.js` line 28-30 pushes `{ message: "missing frontmatter: file must begin with a '--- ... ---' block" }` and returns. Test B2 exercises this path and passes. The ROADMAP wording is a doc fix; the behavior is correct.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/frontmatter.js` | Exports `parseFrontmatter(text)` | VERIFIED | 97-line substantive implementation: BOM strip, CRLF normalization, delimiter scan, stray detection, YAML.parseDocument |
| `test/frontmatter.test.js` | B1-B7 test behaviors | VERIFIED | 85 lines; 7 tests all passing; uses `doesNotThrow` not `assert.throws` |
| `src/schema.js` | Exports `validateSkill(skill, sharedRefs?)` and `NAME_KEBAB` | VERIFIED | 144 lines; full cascade + collect-all implementation; `NAME_KEBAB` exported at line 33 |
| `test/schema.test.js` | B1-B13 + NAME_KEBAB export test | VERIFIED | 295 lines; 14 tests all passing |
| `src/config.js` | Exports `loadConfig(text)` | VERIFIED | 117-line substantive implementation: parseDocument, collect-all required fields, optional private, defensive try/catch |
| `test/config.test.js` | C1-C7 test behaviors | VERIFIED | 114 lines; 7 tests all passing |
| `package.json` | `type:module`, `name`, `version`, `engines.node>=20`, `dependencies.yaml`, husky devDep preserved | VERIFIED | All fields present; `"type":"module"`, `"engines":{"node":">=20"}`, `"dependencies":{"yaml":"^2.9.0"}`, `"devDependencies":{"husky":"^9.1.7"}` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `parseFrontmatter` input | normalize step | BOM strip + CRLF replace at lines 19-22, before lines 27+ delimiter scan | VERIFIED | Normalization is the very first operation; no delimiter or YAML logic executes before it |
| Frontmatter block | YAML parse | `YAML.parseDocument(block)` at line 85; `doc.errors[]` mapped at lines 86-88 | VERIFIED | `parseDocument` used in both stray-detection region probe (line 67) and main block parse (line 85); bare `YAML.parse` not present |
| Name validation | Cascade stop | `if (!name) ... else if (!NAME_KEBAB.test) ... else if (RESERVED) ... else if (name !== dirName)` at schema.js lines 76-92 | VERIFIED | Exactly four `if/else if` steps; B2-B6 confirm exactly one error per cascaded case |
| `shared_references` entries | Safe-basename check before membership | `if (entry.includes("/") || entry.includes("."))` at schema.js line 132, before `sharedRefs.has(entry)` at line 137 | VERIFIED | B11 confirms unsafe entries get only unsafe-basename errors and no "not found" messages |
| `src/config.js` NAME_KEBAB | `src/schema.js` NAME_KEBAB | Intentional byte-identical duplicate with cross-reference comment at config.js lines 16-18 | VERIFIED | Both literals are `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`; comment names schema.js as source of truth |
| `loadConfig` YAML parse | `parseDocument` from yaml | `import { parseDocument } from "yaml"` at config.js line 11; called at line 62 | VERIFIED | `doc.errors[]` mapped at lines 71-73; defensive try/catch at lines 61-68 for belt-and-suspenders D-01 |

---

### Regex Byte-Identity Verification (D-16)

The two NAME_KEBAB regex literals are byte-identical:

- `src/schema.js` line 33: `export const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;`
- `src/config.js` line 35: `const NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;`

Cross-reference comment at `src/config.js` lines 16-18 names `src/schema.js` as the source of truth. The two regexes cannot silently drift as long as both files are read side-by-side.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite (28 tests, all behaviors) | `npm test` | 28 pass, 0 fail, 0 skip | PASS |
| yaml package resolves at correct version | `node --input-type=module -e "import {readFileSync} from 'fs'; ..."` | `version: 2.9.0 license: ISC` | PASS |
| parseDocument used in frontmatter.js | `grep -c "parseDocument" src/frontmatter.js` | 3 occurrences | PASS |
| parseDocument used in config.js | `grep -c "parseDocument" src/config.js` | 4 occurrences | PASS |

**yaml license note:** `CLAUDE.md` describes the yaml license as MIT; the installed `yaml@2.9.0` reports ISC. This is a harmless documentation inaccuracy — ISC is a permissive license functionally equivalent to MIT for this use. No action required.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PARSE-01 | 01-01-PLAN | parseFrontmatter splits {data, body}; missing block named error | SATISFIED | Truths 1+2; B1+B2 pass |
| PARSE-02 | 01-01-PLAN | CRLF/BOM normalization before parse | SATISFIED | Truth 3; B4 pass |
| PARSE-03 | 01-01-PLAN | YAML parse errors surface in errors[] | SATISFIED | Truth 4; B5 pass |
| PARSE-04 | 01-01-PLAN | Stray --- detected; body --- not flagged | SATISFIED | Truth 5; B6+B7 pass |
| LINT-01 | 01-02-PLAN | name, description, audience required | SATISFIED | Truth 7; B2+B7+B8 pass |
| LINT-02 | 01-02-PLAN | Letter-start kebab name = folder; no reserved substrings | SATISFIED | Truth 8; B3-B6 pass; NAME_KEBAB exported |
| LINT-03 | 01-02-PLAN | audience exactly public or private | SATISFIED | Truth 9; B8 pass |
| LINT-04 | 01-02-PLAN | # Title + **Role:** body spine, both independent | SATISFIED | Truth 10; B9 pass |
| LINT-05 | 01-02-PLAN | shared_references safe basename + resolve | SATISFIED | Truth 11; B10+B11 pass |
| CONF-01 | 01-03-PLAN | name/version/description/plugins.public required, collected | SATISFIED | Truths 12+13; C1+C2 pass |
| CONF-02 | 01-03-PLAN | plugin names letter-start kebab | SATISFIED | Truth 14; C3+C4+C5 pass |
| CONF-03 | 01-03-PLAN | plugins.private optional | SATISFIED | Truth 15; C6 pass |

All 12 Phase 1 requirements satisfied. LINT-06, LINT-07 are Phase 2 requirements (not claimed); BUILD-01..06, CLI-01..02 are Phase 2/3 requirements (not claimed). No orphaned requirements.

---

### Anti-Patterns Found

No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) detected in any of the three source files. No stub return patterns (`return null`, `return {}`, `return []`, `=> {}`) present. All three source files contain substantive, fully-implemented logic.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

---

### Human Verification Required

None. All phase behaviors are verifiable by unit tests. No UI, visual output, real-time behavior, or external service integration is involved. The test suite provides complete coverage of every observable behavior defined in the must-haves.

---

### Gaps Summary

No gaps. All 16 truths verified, all 12 requirements satisfied, all artifacts substantive and wired, all key links confirmed, test suite passes 28/28.

---

_Verified: 2026-06-30_
_Verifier: Claude (gsd-verifier)_
