---
status: testing
phase: 24-upgrade-path-ledger-policy
source: 24-01-SUMMARY.md, 24-02-SUMMARY.md
started: 2026-07-06T12:30:00Z
updated: 2026-07-06T12:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: v0.0.5 <role> migration entry is accurate and followable
expected: |
  Open UPGRADING.md at repo root. The v0.0.5 entry (<role> migration) is findable, states what breaks, gives numbered migration steps with one before/after snippet and a verify command. The steps accurately reflect the historical migration (commit d402e15) — a reader hit by the break could follow them successfully.
awaiting: user response

## Tests

### 1. v0.0.5 <role> migration entry is accurate and followable
expected: Open UPGRADING.md at repo root. The v0.0.5 entry (<role> migration) is findable, states what breaks, gives numbered migration steps with one before/after snippet and a verify command. The steps accurately reflect the historical migration (commit d402e15) — a reader hit by the break could follow them successfully.
result: [pending]
coverage_id: 24-01/D3

### 2. magma stamped from v0.0.7 entry prose alone (live walkthrough)
expected: The live magma walkthrough completed — ~/Projects/magma's motto.yaml carries mottoVersion in the documented position and motto lint reports clean there. The friction found (broken version-discovery commands) was fed back into UPGRADING.md's Step 2 (now npm ls -g @jeremiewerner/motto primary, local npm ls fallback), not silently patched around.
result: [pending]
coverage_id: 24-02/D3

### 3. UPGRADING.md exists with both seed entries (D-05 depth contract)
expected: UPGRADING.md exists at repo root with v0.0.5 and v0.0.7 seed entries, each conforming to the D-05 depth contract
result: pass
source: automated
coverage_id: 24-01/D1

### 4. checkSkew() remedy names UPGRADING.md; four test files in lockstep
expected: checkSkew() older-than-tool remedy names UPGRADING.md by filename; version.test.js, lint.test.js, cli.test.js, build.test.js all updated in lockstep
result: pass
source: automated
coverage_id: 24-01/D2

### 5. Blocking Ledger Gate step in release skill
expected: Blocking Ledger Gate step inserted into skills/release/SKILL.md between Dogfood Check and Push, with clean renumbering and lint-clean output
result: pass
source: automated
coverage_id: 24-02/D1

### 6. Upgrade-path constraint synced into .claude/CLAUDE.md
expected: Upgrade-path constraint synced into .claude/CLAUDE.md's GSD-managed Constraints block, pointing at UPGRADING.md and the Ledger Gate
result: pass
source: automated
coverage_id: 24-02/D2

## Summary

total: 6
passed: 4
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

[none yet]
