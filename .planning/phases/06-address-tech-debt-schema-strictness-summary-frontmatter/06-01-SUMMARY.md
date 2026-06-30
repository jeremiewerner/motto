---
phase: 06-address-tech-debt-schema-strictness-summary-frontmatter
plan: "01"
subsystem: schema
tags: [schema, validation, strictness, tech-debt]
dependency_graph:
  requires: []
  provides: [name-max-64, description-max-1024, description-no-xml]
  affects: [src/schema.js, test/schema.test.js]
tech_stack:
  added: []
  patterns: [errors-array, cascade-stop, independent-checks, never-throw]
key_files:
  created: []
  modified:
    - src/schema.js
    - test/schema.test.js
decisions:
  - "name max-64 placed as third else-if in the cascade (after kebab, before reserved) per D-13 cascade-stop invariant"
  - "description length and XML checks placed inside an else branch of the presence guard to enforce never-throw (D-01)"
  - "boundary comparisons use > (not >=) so length == limit is valid, per D-03 spec-literal reading"
  - "XML regex is /<[^>]+>/ exactly as locked in D-05; false-positive on 'a < b > c' is accepted"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-30"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
status: complete
---

# Phase 06 Plan 01: Schema Strictness — validateSkill Max-Length and No-XML Checks Summary

Three new validation checks were added to `validateSkill` in `src/schema.js`, making the linter fully conformant with the CLAUDE.md SKILL.md-frontmatter spec for `name` and `description`. Six corresponding test cases (B14-B19) were added to `test/schema.test.js`. Full test suite: 71 tests, 0 failures.

## One-Liner

Schema linter extended with name max-64 cascade check and description max-1024 + no-XML independent checks, all guarded by the existing never-throw (D-01) errors-array model.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add three strictness checks to validateSkill | 360ace4 | src/schema.js |
| 2 | Add test cases B14-B19 | cf78081 | test/schema.test.js |

## What Was Built

### Task 1: src/schema.js

Three new conditional checks added to `validateSkill`:

1. **name max-64** — new `else if (name.length > 64)` slotted as the third step in the name cascade, after the kebab check and before the reserved-word check. Produces: `name must not exceed 64 characters (got N): "name"`. Cascade stops here on failure, preventing double-erroring with reserved/folder checks.

2. **description max-1024** — `if (data.description.length > 1024)` inside the else branch of the existing presence guard. Produces: `description must not exceed 1024 characters (got N)`.

3. **description no-XML** — `if (/<[^>]+>/.test(data.description))` inside the same else branch, independent of the length check. Produces: `description must not contain XML tags (e.g. <example>)`.

The D-13 JSDoc and cascade step-numbering comments were updated from 4 steps to 5 steps to reflect the new max-64 position.

### Task 2: test/schema.test.js

Six new `it()` cases inside the existing `describe("validateSkill")` block:

| Case | Input | Assert |
|------|-------|--------|
| B14 | description == 1024 chars | `errors === []` (boundary valid) |
| B15 | description == 1025 chars | 1 error, message contains "1024" |
| B16 | description with `<example>` | 1 error, message matches `/xml\|tag/i` |
| B17 | name == 64 chars (valid kebab) | `errors === []` (boundary valid) |
| B18 | name == 65 chars (valid kebab) | 1 error referencing "64"; no reserved or folder error (cascade-stop proof) |
| B19 | description 1025 chars + `<x>` tag | 2 errors (length + XML, independence proof) |

B17/B18 use `"a".repeat(64/65)` (valid letter-start kebab, no reserved substrings, dirName matches name). B19 uses `"<x>" + "y".repeat(1022)` (1025 chars total).

## Test Results

```
node --test test/schema.test.js  →  20 tests, 0 failures (was 14)
node --test (full suite)         →  71 tests, 0 failures (was 65)
```

Dogfood test confirmed safe: real Motto skill descriptions (146/166/158 chars, no XML) and names (17/19/13 chars) are well under both limits.

## Deviations from Plan

None — plan executed exactly as written. Step comments in the cascade were renumbered (3→5 for reserved, 4→5 for folder) as a natural consequence of inserting step 3 (max-64); this is a documentation-only change consistent with "Make NO other changes" in spirit.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. The XML regex `/<[^>]+>/` has no catastrophic backtracking (T-06-01 confirmed: single character class, no nested quantifiers).

## Self-Check: PASSED

- [x] `src/schema.js` exists and contains the three new checks
- [x] `test/schema.test.js` exists and contains B14-B19
- [x] Commit 360ace4 exists (Task 1)
- [x] Commit cf78081 exists (Task 2)
- [x] Full suite: 71/71 pass, 0 failures
