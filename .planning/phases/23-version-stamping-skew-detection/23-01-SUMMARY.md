---
phase: 23-version-stamping-skew-detection
plan: 01
subsystem: version-awareness
tags: [version, skew-detection, pure-module, foundation]
dependency_graph:
  requires: []
  provides:
    - "src/version.js: getOwnVersion(), parseVersion(), checkSkew()"
  affects:
    - "23-02 (config.js mottoVersion field — consumes parseVersion)"
    - "23-03 (init.js stamping — consumes getOwnVersion)"
    - "23-04 (lint.js/build.js skew warnings — consumes checkSkew + getOwnVersion)"
tech_stack:
  added: []
  patterns:
    - "Pure module split: one fs-touching function (getOwnVersion, memoized) vs. pure string-in/object-out functions (parseVersion, checkSkew) — mirrors src/config.js's doc-comment + never-throw house style"
    - "Hand-rolled non-anchored regex parser (^v?(\\d+)\\.(\\d+)\\.(\\d+), no trailing $) — intentional narrowing, not full semver precedence"
    - "Direction-aware skew descriptor {skill, message} — same shape as config.js's errors[] entries"
key_files:
  created:
    - src/version.js
    - test/version.test.js
  modified: []
decisions:
  - "Followed 23-RESEARCH.md Pattern 1 implementation verbatim as the starting point (getOwnVersion/parseVersion/checkSkew), including exact D-R3 message wording"
  - "VERSION_RE deliberately not end-anchored — trailing prerelease/build suffixes ignored by design, with an inline code comment documenting the simplification for future maintainers (Pitfall 5)"
  - "getOwnVersion() memoized via module-level cached variable, resolves package.json via import.meta.url + readFileSync — not process.env.npm_package_version, not import assertions (both rejected per RESEARCH Alternatives)"
  - "Test literals never hardcode Motto's real running version (currently 0.0.6) — getOwnVersion() assertions read package.json live at test time; comparator fixtures use fake strings (1.2.3/1.2.4/1.3.0) per Pitfall 6"
metrics:
  duration: "~15min"
  completed: 2026-07-06
status: complete
---

# Phase 23 Plan 01: Version Pure Foundation Module Summary

Created `src/version.js` — a never-throw pure module providing `getOwnVersion()`, `parseVersion()`, and `checkSkew()` — the sole dependency every later plan in this phase (config.js field validation, init.js stamping, lint.js/build.js skew warnings) will consume.

## What Was Built

**`src/version.js`** exports three functions:

- `getOwnVersion()` — reads Motto's own `package.json` version via a single memoized `readFileSync` (resolved through `new URL('../package.json', import.meta.url)`), returns the version string or `null` on any read/parse failure. Never throws.
- `parseVersion(v)` — parses a version-like value into `{major, minor, patch}` using a hand-rolled, non-end-anchored regex (`/^v?(\d+)\.(\d+)\.(\d+)/`). Returns `null` for any non-string or non-matching input (number, array, object, boolean, null, undefined, empty string, malformed string). Never throws — guards `typeof v !== 'string'` before any string method call.
- `checkSkew(stampedVersion, toolVersion)` — parses both inputs and returns `null` when either fails to parse or they're equal; otherwise returns a direction-aware `{skill: 'motto.yaml', message}` descriptor. Tool-newer-than-project message references "check the upgrade ledger"; project-newer-than-tool message says "upgrade motto." Both messages name both version strings explicitly.

A module-internal `compareParsed(a, b)` helper (not exported) does the numeric major/minor/patch tuple comparison.

**`test/version.test.js`** — 26 tests across three `describe` blocks:
- `parseVersion`: happy-path parsing (plain, `v`-prefixed, independent segment extraction, suffix-ignoring, whitespace-tolerant) plus a 9-shape adversarial matrix (number, array, object, boolean, null, undefined, empty string, 2-segment string, garbage string) — every adversarial case wrapped in `assert.doesNotThrow`.
- `checkSkew direction (VER-03)`: equal/absent/unparsable/null-tool all assert `null`; both skew directions asserted with message-content checks (both version strings + the correct remedy phrase present in each); additional coverage for minor-only and major-only differences.
- `getOwnVersion`: asserts a truthy string, asserts equality against a **live** read of `package.json` (never a hardcoded version literal), and asserts memoization (repeated calls return the same value).

## Verification

- `node --test test/version.test.js` — 26/26 passing.
- Full suite (`npm test`, husky pre-commit on each commit) — 269/269 passing (243 pre-existing + 26 new).
- Inline smoke check from the plan's Task 1 verify block — exit 0.
- `grep -nE '"0\.0\.[0-9]"' test/version.test.js` — zero hits (no hardcoded version literals in assertions).
- Source contains the exact regex `/^v?(\d+)\.(\d+)\.(\d+)/` with no trailing `$` anchor, plus an inline comment documenting the intentional narrowing.

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed the RESEARCH.md Pattern 1 implementation and PATTERNS.md conventions verbatim; no auto-fixes, no architectural questions, no auth gates.

## Known Stubs

None.

## Threat Flags

None — this plan's threat model items (T-23-01, T-23-02, T-23-03) are fully addressed by the implementation itself: `typeof v !== 'string'` guards in `parseVersion` before any string method (T-23-01, verified by the 9-shape adversarial test matrix, all `assert.doesNotThrow`); try/catch collapsing any `getOwnVersion()` read/parse failure to `null` (T-23-02); no dynamic use of the raw version string beyond comparison/display, documented inline (T-23-03). No new network endpoints, auth paths, or schema changes at trust boundaries were introduced — this is a pure, in-process module with a single read of the tool's own `package.json`.

## Self-Check: PASSED

- FOUND: src/version.js
- FOUND: test/version.test.js
- FOUND: commit 8750ef6 (feat: create src/version.js)
- FOUND: commit ce04032 (test: exhaustive unit tests)
