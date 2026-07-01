---
phase: 07-npm-packaging-release-flow
verified: 2026-07-01T00:00:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 07: npm Packaging & Release Flow — Verification Report

**Phase Goal:** Motto is publishable to npm as a scoped public package (@jeremiewerner/motto), and the `release` skill drives the real end-to-end publish workflow (verify -> publish -> push tag) instead of a TODO stub.
**Verified:** 2026-07-01T00:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | package.json declares name @jeremiewerner/motto, version 0.0.3, publishConfig.access public, and files allowlist [bin/, src/, dist/public/] | VERIFIED | package.json lines 2, 3, 17, 18 confirm all four fields exactly |
| 2  | npm pack --dry-run --json emits only allowlisted paths plus auto-included package.json/LICENSE — no skills/, test/, or .planning/ leakage | VERIFIED | Live dry-run: 13 files — bin/, src/, dist/public/, LICENSE, package.json only |
| 3  | A LICENSE file (MIT) exists at repo root and package.json license is MIT | VERIFIED | LICENSE contains "MIT License" and "Copyright (c) 2026 Jérémie Werner"; package.json line 7 "license": "MIT" |
| 4  | package.json has a prepublishOnly script (node bin/motto.js build) and a version lifecycle script that syncs motto.yaml via npm_new_version and stages it | VERIFIED | package.json scripts: prepublishOnly = "node bin/motto.js build"; version script reads motto.yaml, substitutes npm_new_version, writes back, then git add motto.yaml |
| 5  | skills/release/SKILL.md Step 5 runs the real flow (npm whoami check -> npm publish -> git push --follow-tags) with no unfinished-packaging placeholder | VERIFIED | Step 5 in SKILL.md: npm whoami, npm publish, git push --follow-tags all present; grep confirms "not yet finalized" absent |
| 6  | skills/release/SKILL.md Step 4 is the D-05 scripted tarball assertion that hard-fails on any out-of-allowlist path | VERIFIED | Step 4 contains npm pack --dry-run --json 2>/dev/null piped to Node leak-check; dist/public/ in allowed list; process.exit(1) on leak |
| 7  | skills/release/SKILL.md Step 1 test-pass expectation is current (75 or higher), not the stale 53 | VERIFIED | Step 1 reads "# pass 75 (or higher)"; "53" does not appear anywhere in the file |

**Score:** 7/7 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | scoped name, version 0.0.3, publishConfig, files allowlist, lifecycle scripts | VERIFIED | All fields present and correct |
| `LICENSE` | MIT license, copyright Jérémie Werner 2026 | VERIFIED | File exists at repo root with correct content |
| `motto.yaml` | version: "0.0.3" | VERIFIED | Line 2 of motto.yaml confirms |
| `skills/release/SKILL.md` | Real end-to-end publish flow, no TODO stub, pass 75 | VERIFIED | All required markers present; no stubs |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| package.json files allowlist | npm tarball composition | files field controls what ships | WIRED | npm pack dry-run confirms 13 files, all within allowlist |
| version lifecycle script | motto.yaml auto-sync | npm_new_version env var + git add | WIRED | Script text confirms substitution and staging; SUMMARY records smoke-test proof |
| prepublishOnly | dist/public/ freshness | node bin/motto.js build | WIRED | package.json scripts.prepublishOnly confirmed; bin/motto.js is present in tarball |
| release skill Step 3 dogfood | Step 4 pack-verify ordering | SKILL.md explicit note | WIRED | Step 3 note: "This step must run before Step 4. prepublishOnly does NOT fire on npm pack --dry-run" |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces configuration and documentation artifacts, not components that render dynamic data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Tarball contains only allowlisted files | npm pack --dry-run --json 2>/dev/null | 13 files: bin/, src/, dist/public/, LICENSE, package.json — zero leakage | PASS |
| Release skill lints clean (dogfood) | node bin/motto.js lint | "3 skills OK", exit 0 | PASS |
| Full test suite passes at 75 | node --test | pass 75, fail 0 | PASS |

### Probe Execution

No probes declared in PLAN.md. Not a migration or tooling phase. Step 7c skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| NPM-01 | 07-01-PLAN.md | Global install exposes `motto` command | SATISFIED | bin.motto = ./bin/motto.js retained; bin/ in files allowlist; bin/motto.js ships in tarball |
| NPM-02 | 07-01-PLAN.md | Scoped name, publishConfig.access public, files allowlist | SATISFIED | package.json name/@jeremiewerner/motto, publishConfig.access public, files ["bin/","src/","dist/public/"] all confirmed |
| NPM-03 | 07-01-PLAN.md | Version corrected to 0.0.3 | SATISFIED | package.json version 0.0.3; motto.yaml version "0.0.3" |
| NPM-04 | 07-01-PLAN.md | No skills/test/.planning leakage in tarball | SATISFIED | Live npm pack dry-run: 13 files, zero paths outside allowlist; D-05 assertion in SKILL.md Step 4 automates this check |
| REL-01 | 07-01-PLAN.md | Real publish flow in release skill (not TODO stub) | SATISFIED | SKILL.md Step 5: npm whoami + npm publish + git push --follow-tags; no placeholder text |
| REL-02 | 07-01-PLAN.md | git push --follow-tags in release skill | SATISFIED | "git push --follow-tags" present in SKILL.md Step 5 |
| REL-03 | 07-01-PLAN.md | motto.yaml bumped alongside package.json in version commit | SATISFIED | version lifecycle script reads npm_new_version, writes motto.yaml, git add motto.yaml — both files land in the same npm version commit |

All 7 requirements from PLAN frontmatter are assigned to Phase 7 in REQUIREMENTS.md and confirmed satisfied.

No orphaned Phase 7 requirements were found — REQUIREMENTS.md traceability table maps exactly NPM-01..04 and REL-01..03 to Phase 7, all marked Complete.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

No TBD, FIXME, or XXX markers found in any phase-modified file. No stub patterns, placeholder text, or empty return values detected.

### Human Verification Required

None. All truths are verifiable through static analysis and the npm pack dry-run. No runtime behavior, visual appearance, external service integration, or state-transition invariants are involved.

### Gaps Summary

No gaps. All 7 must-have truths are verified at all three levels (exists, substantive, wired). The live npm pack dry-run confirms tarball hygiene. Tests pass at the declared count. No debt markers remain.

---

_Verified: 2026-07-01T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
