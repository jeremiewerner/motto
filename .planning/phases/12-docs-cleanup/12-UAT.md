---
status: complete
phase: 12-docs-cleanup
source: [12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md]
started: 2026-07-02T11:10:00Z
updated: 2026-07-02T11:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. README scaffold section leads with `motto init my-project`, real tree, verbatim motto.yaml
expected: README scaffold section leads with `motto init my-project`, shows the real scaffolded tree and scaffolded motto.yaml verbatim
result: pass
source: automated
coverage_id: 12-01/D1

### 2. Ship-your-plugin section documents build → commit dist/public/ → push → consumer commands
expected: New '## Ship your plugin' section documents the full flow including /plugin marketplace add + /plugin install
result: pass
source: automated
coverage_id: 12-01/D2

### 3. Zero setup-project references remain in README
expected: grep for setup-project in README.md returns nothing
result: pass
source: automated
coverage_id: 12-01/D3

### 4. Install-the-CLI lists init/lint/build in order, mentions motto --help, [path] annotations
expected: CLI section order and annotations match bin/motto.js help strings
result: pass
source: automated
coverage_id: 12-01/D4

### 5. Salvage-check: all 6 setup-project SKILL.md sections have recorded dispositions
expected: Disposition table in 12-02-SUMMARY.md maps every section to a README home or conscious drop
result: pass
source: automated
coverage_id: 12-02/D1

### 6. skills/setup-project/ deleted
expected: Directory gone; skills/ contains only author-skill and release
result: pass
source: automated
coverage_id: 12-02/D2

### 7. dogfood test asserts count=2/skillCount=2, setup-project it-blocks removed
expected: test/dogfood.test.js synced to post-deletion counts
result: pass
source: automated
coverage_id: 12-02/D3

### 8. Deletion + test sync atomic; main never red
expected: One commit (b437c84) contains both changes; node --test green before and after
result: pass
source: automated
coverage_id: 12-02/D4

### 9. Validate-and-build example shows current skill count (2)
expected: README.md:129 reads `✓ 2 skills OK`, matching live `motto lint`
result: pass
source: automated
coverage_id: 12-03/D1

### 10. Install one-liner uses `@<marketplace>` placeholder (both occurrences) with prerequisite note
expected: README.md:164 and :226 corrected; note explains marketplace = marketplace.json name field
result: pass
source: automated
coverage_id: 12-03/D2

### 11. `--force` description discloses overwrite of the 5 scaffold paths
expected: README.md:89 reworded per WR-04
result: pass
source: automated
coverage_id: 12-03/D3

### 12. Confirm auto-covered deliverables (stranger walkthrough optional)
expected: User confirms the automated coverage summary; optional manual spot-check via scratch `motto init` walkthrough
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
