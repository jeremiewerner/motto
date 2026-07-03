---
phase: 15-field-validation-integrity-guards
verified: 2026-07-03T00:00:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 15: Field Validation & Integrity Guards Verification Report

**Phase Goal:** The three new optional frontmatter fields (`outputs:`, `dependencies:`, `allowed-tools`) are validated with integrity guards, and every new validator is never-throw.
**Verified:** 2026-07-03
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All 5 ROADMAP success criteria were verified with **live behavioral probes** run directly against `src/schema.js` and `src/lint.js` in this session — not by trusting SUMMARY.md or REVIEW-FIX.md claims. Throwaway fixture trees were built under the scratchpad and run through the real `lintProject()`.

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `motto lint` rejects an `outputs:` entry whose file is missing, uses path traversal, is absolute, or escapes the skill dir via symlink | ✓ VERIFIED | Live probe: missing file → `outputs.<key> file "<value>" does not exist`; `../escape` → `isOutputPathLexicallySafe` returns `false` (rejected pre-fs); absolute path → rejected; symlink pointing outside skill dir → `outputs.leak file "leak.txt" escapes the skill directory via symlink` (fixture created with a real `symlink()`, ran through `lintProject`) |
| 2 | A bare-kebab `dependencies:` entry naming no existing skill fails lint; a namespaced `plugin:skill` entry is format-checked only | ✓ VERIFIED | Live probe: `not-a-real-skill` → `dependency "not-a-real-skill" not found (available: priv-skill, pub-skill, self-skill)`; `src/schema.js:400-410` shows namespaced entries `continue` after the `NAME_KEBAB` format check, before resolution/audience code — confirmed by reading and by `test/schema.test.js:968+` block |
| 3 | A public skill depending on a private skill fails lint (audience-direction guard); a skill listing itself as a dependency fails (self-dependency guard) | ✓ VERIFIED | Live probe (3-skill fixture): `pub-skill` depending on `priv-skill` → `dependencies entry "priv-skill" is private but this skill is public (audience-direction guard)`; `self-skill` depending on itself → `dependencies entry "self-skill" is a self-dependency` |
| 4 | `allowed-tools` entries in real spec forms — including `Bash(git add *)` — pass; malformed forms fail | ✓ VERIFIED | `src/schema.js:436-457` (Option A, no shape regex); `test/schema.test.js:1126+` exercises `Bash(git add *)`, `mcp__github__*`, bare `Read`, empty string, non-string/non-array; live dogfood `skills/release/SKILL.md` declares `allowed-tools: [Bash(node *), Bash(npm *), Bash(git *)]` and `node --test test/dogfood.test.js` passes |
| 5 | Every new validator returns accumulated errors without throwing, proven by adversarial malformed-input tests | ✓ VERIFIED | Live probe: `description` with a throwing `Symbol.toPrimitive`/`toString` object does **not** throw (returns `description must be a string (got object)`) — confirms the WR-01 fix is live, not just claimed; full suite `node --test` → 194/194 pass, 0 fail; adversarial throwing-toString tests exist for outputs/dependencies/allowed-tools/description |

**Score:** 6/6 must-haves verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/schema.js` — `isOutputPathLexicallySafe(entry)` | Exported pure predicate | ✓ VERIFIED | Exported (line 130), pure `node:path` only (no `node:fs`/`node:fs/promises` imports — confirmed by reading the full import block), root-independent per CR-01 fix (signature changed from `(skillDirAbs, entry)` to `(entry)`) |
| `src/schema.js` — `validateSkill(skill, sharedRefs?, templatesRegistry?, skillNames?, audienceMap?)` | Extended signature | ✓ VERIFIED | Line 193-199: `skillNames = new Set()`, `audienceMap = new Map()` present with correct defaults |
| `src/lint.js` — `loadSkillAudiences(skillsDir, skillNames)` | Cross-skill audience pre-pass, never pushes to errors | ✓ VERIFIED | Lines 154-170; empty `catch {}` block, no `errors.push` anywhere in the function |
| `src/lint.js` — `checkOutputsFs(skillsDir, dirName, data, errors)` | fs-dependent existence + symlink-escape check | ✓ VERIFIED | Lines 194-243; reuses `isOutputPathLexicallySafe` as fs-eligibility gate (line 203); `stat`+`isFile()` (WR-02 fix, line 212); `realpath`+`relative` symlink containment (lines 223-235) |
| `skills/release/SKILL.md` | Declares `allowed-tools`, dogfood stays green | ✓ VERIFIED | Frontmatter contains `allowed-tools: [Bash(node *), Bash(npm *), Bash(git *)]`; `test/dogfood.test.js` passes as part of the 194-test green suite |
| `test/schema.test.js` / `test/lint.test.js` | Adversarial + happy-path coverage | ✓ VERIFIED | 3 new `describe` blocks in schema.test.js (outputs/dependencies/allowed-tools), 8 new describe blocks in lint.test.js (fs-layer, cwd-independence, cross-skill resolution, audience guard, no-double-report, never-throw-on-ENOTDIR) |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/schema.js` outputs block | `isOutputPathLexicallySafe` | direct call, line 371 | ✓ WIRED | Confirmed by reading and live probe |
| `src/lint.js` `checkOutputsFs` | `isOutputPathLexicallySafe` (imported from `./schema.js`) | line 203 | ✓ WIRED | Both layers now use the SAME root-independent predicate (CR-01 fix removed the two-different-roots bug) |
| `dependencies` self-dep check | `skillNames.has(entry)` membership check | ordering in `src/schema.js:413-420` | ✓ WIRED | Self-dep check (`entry === dirName`) textually precedes and `continue`s before the membership check, exactly as the must_have requires (Pitfall 2) |
| `lintProject` | `loadSkillAudiences` + `processSkill` | lines 348-354 | ✓ WIRED | `skillNameSet`/`audienceMap` built once, then threaded into every `processSkill` call, which threads them into `validateSkill` |
| `processSkill` | `checkOutputsFs` | line 295, inside the outer `try` | ✓ WIRED | Called immediately after `validateSkill`, sharing the D2-06 backstop |

### Behavioral Spot-Checks (live probes, this session)

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| `outputs:` `..`-escape rejected (lexical) | `isOutputPathLexicallySafe('../escape')` | `false` | ✓ PASS |
| `outputs:` interior traversal `a/../../x` rejected | `isOutputPathLexicallySafe('a/../../x')` | `false` | ✓ PASS |
| `outputs:` absolute path rejected | `isOutputPathLexicallySafe('/abs/path')` | `false` | ✓ PASS |
| `outputs:` symlink escaping skill dir | fixture with real `symlink()` + `lintProject` | `"escapes the skill directory via symlink"` error | ✓ PASS |
| `outputs:` directory named as output (WR-02) | fixture `outputs: {self: ".", sub: "subdir"}` | 2× `"is not a file"` errors | ✓ PASS |
| `dependencies:` self-dependency | fixture skill depending on itself | `"is a self-dependency"` error | ✓ PASS |
| `dependencies:` public→private audience guard | 3-skill fixture | `"is private but this skill is public (audience-direction guard)"` | ✓ PASS |
| `dependencies:` unresolved bare entry | fixture | `"not found (available: priv-skill, pub-skill, self-skill)"` | ✓ PASS |
| `description` throwing-toString never throws (WR-01) | `validateSkill` with `Symbol.toPrimitive`-throwing description | no throw; returns type error | ✓ PASS |
| `lintProject` never rejects on ENOTDIR (CR-02) | file named `skills` at project root | resolves with `{ok:false, count:0}` diagnostic, no promise rejection | ✓ PASS |
| Full suite | `node --test` | 194 tests, 0 fail | ✓ PASS |

### Code Review Fix Verification (adversarial — not trusted from REVIEW-FIX.md)

The phase's post-execution code review found 2 Critical + 3 Warning issues. All 5 fixes were independently re-derived and confirmed live in this session (not merely read as claimed in 15-REVIEW-FIX.md):

| ID | Issue | Fix commit | Verified live? |
| --- | --- | --- | --- |
| CR-01 | `outputs:` lexical check used two different roots (cwd vs real skill dir) — silent validation bypass | `3226d82` | ✓ Confirmed: predicate is now single-argument and root-independent (`isOutputPathLexicallySafe.length === 1`); `..`-re-entry rejected regardless of cwd |
| CR-02 | `lintProject` rethrew on ENOTDIR, crashing the CLI | `1d92fd0` | ✓ Confirmed: file named `skills` at project root → `lintProject` resolves (does not reject) with a `(project)`-labelled diagnostic |
| WR-01 | `description` had no type guard — threw on throwing-toString, silently accepted numbers/arrays | `f9d5f79` | ✓ Confirmed: throwing-toString description → no throw, `description must be a string (got object)`; `description: 123` → same error |
| WR-02 | `outputs:` existence check accepted directories (`stat` without `isFile()`) | `80e79c5` | ✓ Confirmed: `outputs: {self: ".", sub: "subdir"}` → 2 `"is not a file"` errors |
| WR-03 | `allowed-tools` empty-entry policy inconsistent (scalar trimmed, array entries did not) | `bf941cf` | ✓ Confirmed via test read (`WR-03` test at `test/schema.test.js:1194`) and code read (`entry.trim() === ""` at line 449) |

### CONTEXT.md Locked Decisions Cross-Check (manual — STATE.md gate override)

STATE.md records the decision-coverage gate could not mechanically parse 15-CONTEXT.md's category-bullet decisions and was overridden. Each locked decision was manually cross-checked against the shipped code in this session:

| Decision | Honored? | Evidence |
| --- | --- | --- |
| allowed-tools Option A (no shape regex, string-or-array container) | ✓ | `src/schema.js:436-457` — no regex, string/array only |
| outputs literal existence, no `{var}` special-case | ✓ | No `{`/`}` special-casing anywhere in `checkOutputsFs` or the lexical block |
| Purity split (lexical in schema.js, fs in lint.js) | ✓ | `schema.js` imports only `node:path`; `lint.js` owns `stat`/`realpath` |
| Per-entry independent cascade | ✓ | Confirmed for outputs/dependencies/allowed-tools loops |
| Namespaced format: exactly one colon, NAME_KEBAB both halves | ✓ | `src/schema.js:400-410` |
| Self-dependency only (no transitive cycle detection) | ✓ | No graph-traversal code found; only `entry === dirName` check |
| Audience guard ONLY public→private fails | ✓ | `src/schema.js:423` gated on both conditions; other 3 directions live-probed to pass |
| Unresolved bare dep error lists available skills inline, sorted | ✓ | Live probe confirmed sorted comma-joined list |
| Empty-field policy (`{}`/`[]`/`[]` are valid no-ops) | ✓ | `test/schema.test.js` — zero-error assertions for all three empty forms |
| `motto init` scaffold untouched | ✓ | `grep` for the three field names in `src/init.js` returns nothing |
| `release` skill gains `allowed-tools` (live dogfood) | ✓ | `skills/release/SKILL.md` frontmatter confirmed |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| VAL-01 | 15-01, 15-02 | `outputs:` map validated (exists, path-safe, no symlink escape) | ✓ SATISFIED | Lexical block (schema.js) + fs block (lint.js), both live-probed |
| VAL-02 | 15-01, 15-02 | Bare-kebab dependencies resolve in-tree; namespaced format-checked only | ✓ SATISFIED | Live-probed |
| VAL-03 | 15-01, 15-02 | Audience-direction guard (public cannot depend on private) | ✓ SATISFIED | Live-probed |
| VAL-04 | 15-01 | Self-dependency rejected | ✓ SATISFIED | Live-probed |
| VAL-05 | 15-01, 15-02 | `allowed-tools` Option A format check | ✓ SATISFIED | Live-probed + dogfood |
| VAL-06 | 15-01, 15-02 | All new validators never-throw, adversarial tests | ✓ SATISFIED | Live-probed (throwing-toString description, ENOTDIR) + 194/194 suite green |

No orphaned requirements — REQUIREMENTS.md's Phase 15 row (VAL-01..06) exactly matches the union of both plans' `requirements:` frontmatter.

### Anti-Patterns Found

None. `grep` for `TBD|FIXME|XXX`, `TODO|HACK|PLACEHOLDER`, and placeholder-style phrasing across `src/schema.js`, `src/lint.js`, `test/schema.test.js`, `test/lint.test.js`, and `skills/release/SKILL.md` returned zero matches.

### Human Verification Required

None. All 5 success criteria and all 5 code-review fixes were confirmed with live, reproducible probes against the actual running code in this session (fixture trees + real `lintProject()`/`validateSkill()` calls), not by trusting SUMMARY.md/REVIEW-FIX.md narrative.

### Gaps Summary

No gaps. The phase goal — three new optional frontmatter fields validated with integrity guards, every new validator never-throw — is achieved and independently re-confirmed against the codebase, including the post-review hardening (CR-01/CR-02/WR-01/WR-02/WR-03) that closed real bugs (a cwd-dependent validation bypass and a CLI-crashing rethrow) found after the initial plan execution.

---

_Verified: 2026-07-03_
_Verifier: Claude (gsd-verifier)_
