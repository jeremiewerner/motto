---
phase: 10-project-scaffold-motto-init
verified: 2026-07-02T06:41:19Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "scaffoldProject never throws — the module's own documented contract ('Never-throw orchestrator', src/init.js header + JSDoc) holds for ALL failure modes, and bin/motto.js never crashes with a raw stack trace on an init failure"
    status: failed
    reason: "Reproduced two throw paths in scaffoldProject that violate its documented never-throw contract, and confirmed bin/motto.js has no try/catch around `await scaffoldProject(...)` so both surface to the end user as an unhandled-rejection stack trace instead of the documented '✗' message. This is REVIEW.md WR-01, confirmed still present (no fix commit after ce02257)."
    artifacts:
      - path: "src/init.js"
        issue: "listNonIgnorableEntries (line 71-83) rethrows any readdir error that isn't ENOENT (e.g. ENOTDIR when targetDir is a file); writeScaffold (line 127-180) has no try/catch around mkdir/writeFile, so a permission-denied or disk-full target throws mid-write, potentially leaving a partially-written scaffold with no error report of which files landed"
      - path: "bin/motto.js"
        issue: "line 55-59: `await scaffoldProject(...)` has no try/catch, so any throw from src/init.js propagates as an unhandled promise rejection and crashes the process with a raw Node stack trace instead of `process.exitCode = 1` + a '✗' message"
    missing:
      - "Wrap STEP 2 (listNonIgnorableEntries call) and STEP 4 (writeScaffold call) in scaffoldProject in try/catch, mapping fs errors to { ok: false, errors: [...] } per REVIEW.md WR-01's suggested fix"
      - "A regression test asserting scaffoldProject(targetDir-that-is-a-file, {...}) returns { ok: false } without throwing"
deferred: []
---

# Phase 10: Project Scaffold (`motto init`) Verification Report

**Phase Goal:** A stranger with only `npm i -g @jeremiewerner/motto` can run one command and get a complete skills project that lints and builds with zero edits.
**Verified:** 2026-07-02T06:41:19Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Sourced from ROADMAP.md Success Criteria (5) merged with PLAN frontmatter must_haves (8, deduplicated against roadmap wording) — 9 total distinct truths.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `motto init [name]` in an empty dir produces `skills/hello-world/`, `shared/references/`, `motto.yaml`, `.gitignore`, `.claude-plugin/marketplace.json`, `[name]` filling motto.yaml fields, defaulting to cwd basename (SC1/INIT-01) | ✓ VERIFIED | Ran `motto init hello-proj` in a fresh mkdtemp dir: all 5 paths written, exit 0, checkmark tree + `motto lint`/`motto build` next-steps printed verbatim. `motto.yaml` content: `name: hello-proj`, `plugins.public: hello-proj`. |
| 2 | Scaffolded starter skill passes `motto lint` and `motto build` with zero edits, guarded by a permanent init→lint→build dogfood test on every commit (SC2/INIT-02) | ✓ VERIFIED | Ran `motto init hello-proj && motto lint && motto build` in a fresh temp dir — all exit 0, `✓ 1 skills OK`, `✓ built ... — 1 skills, 1 plugin(s)`, `dist/public/hello-world/SKILL.md` produced. `test/init-dogfood.test.js` exists, chains `scaffoldProject`→`lintProject`→`buildProject` fail-fast in `before()`, asserts return shapes + all 5 source artifacts (including explicit `.gitkeep` stat) + built output + `.gitignore` ship-flow contract. `node --test` run: 116/116 pass. |
| 3 | `motto init` in a non-empty dir refuses and reports why; `--force` overrides (SC3/INIT-04) | ✓ VERIFIED | Ran with 7 unrelated files present: `✗ directory is not empty (a.txt, b.txt, c.txt, d.txt, e.txt, and 2 more)` / `use --force to scaffold anyway`, exit 1 (cap-at-5 confirmed). With `--force` and a pre-existing `keep.txt`: exit 0, scaffold written, `keep.txt` survives unmodified. Additionally verified `--force` genuinely overwrites (not skip-if-exists): pre-seeded stale `motto.yaml` content was replaced by the template after `--force` (this exact case is IN-04 in REVIEW.md — untested by the suite, but I confirmed the runtime behavior directly). |
| 4 | Invalid project name rejected using the exact rule `motto lint` enforces (single source: schema.js) — no name init accepts is later rejected by lint (SC4/INIT-05) | ✓ VERIFIED | `src/init.js` imports `NAME_KEBAB` from `./schema.js` only (`grep` confirms 1 import, no redefinition). Ran `motto init 'Bad Name'`: `✗ name must be letter-start kebab-case (...): "Bad Name"` / `try: motto init bad-name`, exit 1, nothing written. `test/init.test.js` covers 4 adversarial names (colon, quote, `../`, leading-digit) all rejected pre-write. |
| 5 | Scaffolded `.gitignore` ignores `dist/private/` but keeps `dist/public/` tracked; `marketplace.json` plugin name matches `motto.yaml` by construction, relative source at `dist/public/`, owner from git config with placeholder fallback (SC5/INIT-03/INIT-06) | ✓ VERIFIED | `.gitignore` body: `node_modules/\ndist/private/\n` — no standalone `dist/` line. `marketplace.json`: `name`/`plugins[0].name` both equal `motto.yaml`'s `name`/`plugins.public` (same `effectiveName` variable, single interpolation site) — `plugins[0].source === './dist/public/'`, no `owner.email` key, `owner.name` populated from `git config user.name` in this environment. `resolveGitOwnerName` wrapped in try/catch with `'Your Name'` fallback confirmed by code read. |
| 6 | `motto init --force` overwrites only the fixed scaffold paths and never deletes unrelated files (10-01 must_have) | ✓ VERIFIED | Same as #3 evidence — `keep.txt` and pre-existing dirs survive; `grep -c "rm(\|rmdir("  src/init.js` returns 0 (zero delete operations in the module). |
| 7 | `scaffoldProject` is a never-throw orchestrator — all failure modes return `{ ok: false, errors }`, never throw (src/init.js's own documented contract, referenced by bin/motto.js's lack of a try/catch around the call) | ✗ FAILED | Reproduced directly: `scaffoldProject(fileAsTarget, {name:'hello-proj'})` throws `ENOTDIR` (readdir rethrow in `listNonIgnorableEntries`); `scaffoldProject(unwritableDir, {name:'hello-proj', force:true})` throws `EACCES` (unguarded `mkdir`/`writeFile` in `writeScaffold`). Ran the actual CLI (`motto init hello-proj` in a chmod 500 dir) — process crashes with a raw Node stack trace (`Error: EACCES ... at writeScaffold ... at scaffoldProject ... at bin/motto.js:56`) instead of the documented `✗` line + `process.exitCode = 1`. This is REVIEW.md WR-01, confirmed unresolved (no commit after the review's `ce02257`). |
| 8 | The unit suite proves the empty-dir guard (allowlist + cap), invalid-name rejection + suggestion, `--force` overwrite-only-scaffold-paths, and adversarial-name rejection (10-02 must_have) | ✓ VERIFIED | `test/init.test.js` (31 assertions, 8 describe blocks) covers all listed cases; `node --test test/init.test.js` passes as part of the full 116/116 suite run. |
| 9 | The dogfood test asserts every scaffold artifact exists (including `shared/references/.gitkeep`) and the scaffolded `.gitignore` keeps `dist/public/` trackable while ignoring `dist/private/` (10-02 must_have) | ✓ VERIFIED | `test/init-dogfood.test.js` explicit `stat` on `shared/references/.gitkeep` (with an inline comment explaining lint/build alone wouldn't catch its absence) plus explicit `.gitignore` content assertion. Confirmed by direct file read. |

**Score:** 8/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/init.js` | `scaffoldProject(targetDir, {name, force})` never-throw orchestrator + 4 internal helpers | ⚠️ PARTIAL | Exists, substantive, wired (imported by `bin/motto.js` and both test files). Never-throw contract itself is violated for 2 of its own failure modes (see Truth #7). |
| `bin/motto.js` | `init` dispatch branch, `--force` flag, updated usage strings | ✓ VERIFIED | Branch present, dispatches correctly on `ok`/`invalid-name`/`not-empty`/generic failure; both usage-string literals read `<init|lint|build>` (`grep -c` = 2 for updated form, 0 for stale form). Does not guard against the throw path noted in Truth #7. |
| `test/init.test.js` | Unit/integration coverage of guards, validation, `--force`, content shape | ✓ VERIFIED | 31 assertions across 8 describe blocks; imports `scaffoldProject` from `../src/init.js`; part of the passing 116-test suite. |
| `test/init-dogfood.test.js` | Permanent init→lint→build guard | ✓ VERIFIED | `before()` chains `scaffoldProject`→`lintProject`→`buildProject` fail-fast; 10 `it()` blocks; part of the passing 116-test suite. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/init.js` | `src/schema.js` | `import { NAME_KEBAB } from './schema.js'` | ✓ WIRED | Confirmed by direct read (line 30) and `grep -c "from './schema.js'"` = 1. No redefinition of the regex elsewhere in the file. |
| `bin/motto.js` | `src/init.js` | `await import('../src/init.js')` in the `init` branch, mirroring the `build` branch's lazy-import style | ✓ WIRED | Confirmed by direct read (line 55) — behaves identically to the sibling `build` branch's lazy import. |
| `test/init-dogfood.test.js` | `src/init.js`, `src/lint.js`, `src/build.js` | direct imports, chained in a single `before()` | ✓ WIRED | Confirmed by direct read of the full test file; fail-fast cascade present as specified. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Happy path scaffold | `motto init hello-proj` in empty temp dir | 5 files written, checkmark tree + next-steps printed, exit 0 | ✓ PASS |
| Scaffold lints & builds with zero edits | `motto init hello-proj && motto lint && motto build` | `✓ 1 skills OK`, `✓ built ... — 1 skills, 1 plugin(s)`, `dist/public/hello-world/SKILL.md` produced | ✓ PASS |
| Non-empty guard + cap | `motto init hello-proj` with 7 unrelated files present | Capped list of 5 + "and 2 more", `use --force` hint, exit 1 | ✓ PASS |
| Invalid name rejection | `motto init 'Bad Name'` | Rule message + `try: motto init bad-name`, exit 1, nothing written | ✓ PASS |
| `--force` overwrite-only | `--force` with pre-existing `keep.txt` and stale `motto.yaml` | Scaffold written, `keep.txt` survives, stale `motto.yaml` content replaced | ✓ PASS |
| Never-throw contract (target is a file) | `scaffoldProject(fileAsTarget, {name:'hello-proj'})` | Threw `ENOTDIR`, did not return `{ok:false}` | ✗ FAIL |
| Never-throw contract (unwritable dir, force) | `scaffoldProject(unwritableDir, {name, force:true})` | Threw `EACCES`, did not return `{ok:false}` | ✗ FAIL |
| CLI crash surface for the above | `motto init hello-proj` in a chmod 500 dir | Raw Node stack trace to stderr, no `✗` message (exit code happens to be 1 via Node's own unhandled-rejection default, but not via `process.exitCode`) | ✗ FAIL |
| Full test suite | `node --test` | `tests 116, pass 116, fail 0` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INIT-01 | 10-01 | `motto init [name]` scaffolds into cwd, `[name]` fills fields / defaults to cwd basename | ✓ SATISFIED | Truth #1 |
| INIT-02 | 10-02 | Scaffolded starter skill passes lint/build with zero edits, permanent dogfood test | ✓ SATISFIED | Truth #2, #9 |
| INIT-03 | 10-01 | marketplace.json relative source at `dist/public/`, owner from git config w/ placeholder fallback, name consistent with motto.yaml | ✓ SATISFIED | Truth #5 |
| INIT-04 | 10-01, 10-02 | Non-empty guard refuses; `--force` overrides | ✓ SATISFIED | Truth #3, #6, #8 |
| INIT-05 | 10-01, 10-02 | Name validated with the same rule lint enforces (schema.js single source) | ✓ SATISFIED | Truth #4, #8 |
| INIT-06 | 10-01 | `.gitignore` ignores `dist/private/`, keeps `dist/public/` tracked | ✓ SATISFIED | Truth #5 |

All 6 phase requirement IDs (INIT-01 through INIT-06) declared in PLAN frontmatter are accounted for and cross-referenced against REQUIREMENTS.md — no orphaned requirements found for Phase 10.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/init.js` | 71-83 | `listNonIgnorableEntries` rethrows non-ENOENT readdir errors, escaping the documented never-throw contract | 🛑 Blocker (for Truth #7) | Causes an unhandled-rejection crash instead of a graceful CLI error when the target path is not a directory |
| `src/init.js` | 127-180 (`writeScaffold`) | No try/catch around `mkdir`/`writeFile` calls | 🛑 Blocker (for Truth #7) | Unwritable/full-disk target crashes mid-write with no report of which files were already created (partial-scaffold-with-no-error risk) |
| `bin/motto.js` | 55-59 | `await scaffoldProject(...)` has no try/catch | 🛑 Blocker (for Truth #7) | The two throw paths above propagate straight to an unhandled-rejection stack trace shown to the end user |
| `src/init.js` | 92-99 (`resolveGitOwnerName`) | `execFileSync` called without `stdio` option — child stderr passes through to parent stderr | ⚠️ Warning | A corrupt `~/.gitconfig` leaks git's raw `fatal: ...` line into `motto init` output before the silent placeholder fallback applies (REVIEW.md WR-03, unresolved, not blocking the phase goal) |
| `test/init.test.js` | 107-140 | The `'../evil'` adversarial-name case only inspects `readdir(tempDir)`, not the parent directory — cannot detect a regression that reintroduces the name as a path segment outside the target dir | ℹ️ Info | Test-coverage gap only; the production code was independently confirmed NOT to use `name` as a path segment anywhere (all `join()` calls use fixed literals) — REVIEW.md WR-04, unresolved, low materiality |
| `test/init.test.js` | 193-221 | `--force` suite never pre-seeds a stale scaffold file to prove overwrite (vs. skip-if-exists) | ℹ️ Info | Test-coverage gap only; runtime behavior independently verified correct in this session (stale `motto.yaml` content was replaced) — REVIEW.md IN-04 |
| `bin/motto.js` | 45 | `process.exit()` in the parseArgs catch block, with a comment claiming this is always safe | ℹ️ Info | Pre-existing pattern from before Phase 10 (confirmed via `git log -p`), not introduced by this phase — REVIEW.md WR-02, out of scope for this verification but noted for awareness |

No `TBD`/`FIXME`/`XXX` debt markers found in any Phase 10 file (`grep -inE "TBD|FIXME|XXX"` on `src/init.js`, `bin/motto.js`, `test/init.test.js`, `test/init-dogfood.test.js` returns no matches other than legitimate uses of the word "placeholder" in comments describing the owner-name fallback design).

### Human Verification Required

None. The one substantive gap (Truth #7 / WR-01) is a reproduced, deterministic code defect — not a judgment call requiring human observation.

### Gaps Summary

Phase 10 achieves its primary, stated goal for the golden path: a stranger running `motto init [name]` in a normal (writable, valid-path) environment gets a complete, buildable, lintable skills project with zero edits — verified directly by running the actual CLI end-to-end, not just by trusting SUMMARY.md. All 5 ROADMAP.md success criteria and all 8 PLAN-frontmatter must_haves for the golden/guard paths (empty-dir scaffold, non-empty refusal, invalid-name rejection, `--force` overwrite-only, name-consistency across motto.yaml/marketplace.json, and the permanent lint/build dogfood guard) are independently verified against the running code, not merely the test suite's self-report.

The one gap is `src/init.js`'s own documented "never-throw orchestrator" contract, which is violated in two concrete, reproduced scenarios: a target path that is a file (ENOTDIR) and an unwritable target directory (EACCES) — the latter a realistic scenario (permission-denied directories exist in the wild) that the phase's own code review (`10-REVIEW.md`, WR-01) already found and proposed a fix for, but which was never committed (no commit after the review landed at `ce02257`). Because `bin/motto.js` awaits `scaffoldProject` with no try/catch, this is not merely an internal contract violation — it surfaces to a real end user as a raw Node stack trace instead of the CLI's documented `✗ <message>` + `process.exitCode = 1` failure mode. This directly contradicts both the module's own design intent and the project's broader never-throw invariant for validators/orchestrators (previously flagged as a recurring failure class in this project). A minimal fix (wrapping the two identified call sites in try/catch, per the review's own suggested patch) plus one regression test (`scaffoldProject` against a file-as-target dir) would close this gap.

---

_Verified: 2026-07-02T06:41:19Z_
_Verifier: Claude (gsd-verifier)_
