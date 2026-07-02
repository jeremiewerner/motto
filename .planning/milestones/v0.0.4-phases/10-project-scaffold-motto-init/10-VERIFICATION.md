---
phase: 10-project-scaffold-motto-init
verified: 2026-07-02T07:15:00Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  gaps_closed:
    - "scaffoldProject never throws — the module's own documented contract ('Never-throw orchestrator', src/init.js header + JSDoc) holds for ALL failure modes, and bin/motto.js never crashes with a raw stack trace on an init failure"
  gaps_remaining: []
  regressions: []
deferred: []
---

# Phase 10: Project Scaffold (`motto init`) Verification Report

**Phase Goal:** A stranger with only `npm i -g @jeremiewerner/motto` can run one command and get a complete skills project that lints and builds with zero edits.
**Verified:** 2026-07-02T07:15:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 10-03, commits 28383d2 / 5eddd10)

## Goal Achievement

### Observable Truths

Same 9 distinct truths as the prior verification (ROADMAP.md Success Criteria (5) merged with PLAN frontmatter must_haves (8), deduplicated). Truth #7, the single gap from the prior pass, is re-verified below with the gap-closure evidence; truths #1-6, #8-9 are regression-checked against the current codebase.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `motto init [name]` in an empty dir produces `skills/hello-world/`, `shared/references/`, `motto.yaml`, `.gitignore`, `.claude-plugin/marketplace.json`, `[name]` filling motto.yaml fields, defaulting to cwd basename (SC1/INIT-01) | ✓ VERIFIED | Re-ran `motto init hello-proj` in a fresh mkdtemp dir: all 5 paths written, exit 0, checkmark tree + next-steps printed. `motto.yaml`: `name: hello-proj`, `plugins.public: hello-proj`. No regression. |
| 2 | Scaffolded starter skill passes `motto lint` and `motto build` with zero edits, guarded by a permanent init→lint→build dogfood test on every commit (SC2/INIT-02) | ✓ VERIFIED | Re-ran `motto init hello-proj && motto lint && motto build` end-to-end: `✓ 1 skills OK`, `✓ built ... — 1 skills, 1 plugin(s)`. `test/init-dogfood.test.js` unchanged and still part of the passing suite. `node --test`: 118/118 pass. |
| 3 | `motto init` in a non-empty dir refuses and reports why; `--force` overrides (SC3/INIT-04) | ✓ VERIFIED | Regression: 2 unrelated files present → `✗ directory is not empty (a.txt, b.txt)` / `use --force to scaffold anyway`, exit 1. Code path (STEP 2 non-force branch) unmodified except for the new try/catch around the same call — behavior for the non-throwing case is unchanged. |
| 4 | Invalid project name rejected using the exact rule `motto lint` enforces (single source: schema.js) — no name init accepts is later rejected by lint (SC4/INIT-05) | ✓ VERIFIED | Regression: `motto init 'Bad Name'` → `✗ name must be letter-start kebab-case (...): "Bad Name"` / `try: motto init bad-name`, exit 1. STEP 1 (name validation) untouched by the gap-closure plan. |
| 5 | Scaffolded `.gitignore` ignores `dist/private/` but keeps `dist/public/` tracked; `marketplace.json` plugin name matches `motto.yaml` by construction, relative source at `dist/public/`, owner from git config with placeholder fallback (SC5/INIT-03/INIT-06) | ✓ VERIFIED | Regression: fresh scaffold's `.gitignore` = `node_modules/\ndist/private/\n`; `marketplace.json` `name`/`plugins[0].name` both `hello-proj`, `source: './dist/public/'`, `owner.name` populated from git config. writeScaffold's content-writing logic is byte-identical to before (only the *call site* around `writeScaffold` gained a try/catch, not its body). |
| 6 | `motto init --force` overwrites only the fixed scaffold paths and never deletes unrelated files (10-01 must_have) | ✓ VERIFIED | `grep -c "rm(\|rmdir("  src/init.js` returns 0. No delete operations added by the gap-closure diff (confirmed via `git show 5eddd10` — pure try/catch wrapping, no new fs calls). |
| 7 | `scaffoldProject` is a never-throw orchestrator — all failure modes return `{ ok: false, errors }`, never throw (src/init.js's own documented contract, referenced by bin/motto.js's lack of a try/catch around the call) | ✓ VERIFIED (gap closed) | Reproduced both previously-failing scenarios directly against the fixed code: (a) `scaffoldProject(fileAsTarget, {name:'hello-proj'})` now resolves `{"ok":false,"errors":[{"skill":"(init)","message":"cannot read target directory: ENOTDIR: ..."}]}` — no throw. (b) End-to-end CLI run (`motto init hello-proj --force` in a dir where `skills` is pre-occupied by a file) prints `✗ (init): scaffold write failed: ENOTDIR: ... mkdir '.../skills/hello-world'` to stdout and exits 1 — no raw Node stack trace, no unhandled-rejection. Confirmed via direct code read (src/init.js lines 221-237, 242-254): STEP 2 and STEP 4 both wrapped in try/catch, mapping to `{ ok:false, errors:[{skill:'(init)', message}] }`. Two new adversarial regression tests (`test/init.test.js` lines 223-268) lock this: both pass in the full suite run. |
| 8 | The unit suite proves the empty-dir guard (allowlist + cap), invalid-name rejection + suggestion, `--force` overwrite-only-scaffold-paths, and adversarial-name rejection (10-02 must_have) | ✓ VERIFIED | `test/init.test.js` (now 33 assertions across 10 describe blocks, +2 from gap closure) covers all listed cases plus the two new never-throw regressions; part of the passing 118/118 suite. |
| 9 | The dogfood test asserts every scaffold artifact exists (including `shared/references/.gitkeep`) and the scaffolded `.gitignore` keeps `dist/public/` trackable while ignoring `dist/private/` (10-02 must_have) | ✓ VERIFIED | `test/init-dogfood.test.js` unmodified by the gap-closure plan; explicit `stat` on `shared/references/.gitkeep` and `.gitignore` content assertion confirmed present; still passing. |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/init.js` | `scaffoldProject(targetDir, {name, force})` never-throw orchestrator + 4 internal helpers | ✓ VERIFIED | Exists, substantive, wired (imported by `bin/motto.js` and both test files). Never-throw contract now empirically holds for all 5 return paths (invalid-name, not-empty, STEP2 fs-error, STEP4 fs-error, happy path) — confirmed by direct read and reproduction. |
| `bin/motto.js` | `init` dispatch branch, `--force` flag, updated usage strings | ✓ VERIFIED | Unchanged by gap-closure plan (confirmed via `git show --stat` on commits 28383d2/5eddd10 — only `src/init.js` and `test/init.test.js` touched). Generic `else` branch (lines 78-83) correctly renders the new `{skill:'(init)', message}` shape as `✗ (init): <message>` + `process.exitCode = 1`, confirmed by live CLI run. |
| `test/init.test.js` | Unit/integration coverage of guards, validation, `--force`, content shape, never-throw contract | ✓ VERIFIED | 33 assertions across 10 describe blocks (2 new: "scaffoldProject never-throws when target is a file (WR-01, ENOTDIR)" and "scaffoldProject never-throws when a scaffold write fails (WR-01, STEP 4)"); both new tests convert any throw into an explicit `assert.fail` message rather than a silent bubble. Part of the passing 118-test suite. |
| `test/init-dogfood.test.js` | Permanent init→lint→build guard | ✓ VERIFIED | Unmodified, still passing. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/init.js` STEP 2 | try/catch → `{ ok:false, errors }` | `listNonIgnorableEntries(targetDir)` call wrapped, catches non-ENOENT errors (e.g. ENOTDIR) | ✓ WIRED | Confirmed by direct read (lines 223-233): catch block returns `{ ok:false, errors:[{skill:'(init)', message:'cannot read target directory: ...'}] }`. |
| `src/init.js` STEP 4 | try/catch → `{ ok:false, errors }` | `writeScaffold(...)` call wrapped | ✓ WIRED | Confirmed by direct read (lines 242-254): catch block returns `{ ok:false, errors:[{skill:'(init)', message:'scaffold write failed: ...'}] }`; success path unchanged (`{ ok:true, created, errors:[] }`). |
| `bin/motto.js` generic else branch | renders `{skill, message}` errors | lines 78-83, no CLI change required | ✓ WIRED | Confirmed via live CLI run: `✗ (init): scaffold write failed: ...` printed to stdout, `process.exitCode = 1` (not `process.exit()`), no stack trace. |
| `src/init.js` | `src/schema.js` | `import { NAME_KEBAB } from './schema.js'` | ✓ WIRED | Unchanged, regression-confirmed. |
| `test/init.test.js` new describe blocks | `src/init.js scaffoldProject` | direct import, both never-throw tests | ✓ WIRED | Confirmed by direct read; both tests pass in the suite. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Never-throw contract (target is a file) — programmatic | `scaffoldProject(fileAsTarget, {name:'hello-proj'})` | Resolved `{"ok":false,"errors":[{"skill":"(init)","message":"cannot read target directory: ENOTDIR..."}]}` | ✓ PASS (was ✗ FAIL) |
| Never-throw contract surfaced through CLI (write-blocked scaffold path) | `motto init hello-proj --force` in a dir with a pre-existing file named `skills` | `✗ (init): scaffold write failed: ENOTDIR: ... mkdir '.../skills/hello-world'`, exit 1, no stack trace | ✓ PASS (was ✗ FAIL) |
| Golden path regression | `motto init hello-proj && motto lint && motto build` | `✓ 1 skills OK`, `✓ built ... — 1 skills, 1 plugin(s)` | ✓ PASS |
| Non-empty guard regression | `motto init hello-proj` with 2 unrelated files present | `✗ directory is not empty (a.txt, b.txt)` / `use --force to scaffold anyway`, exit 1 | ✓ PASS |
| Invalid name regression | `motto init 'Bad Name'` | Rule message + `try: motto init bad-name`, exit 1 | ✓ PASS |
| Scaffolded `.gitignore`/`marketplace.json` content regression | Fresh `motto init hello-proj` | `.gitignore` = `node_modules/\ndist/private/\n`; `marketplace.json` name/plugins[0].name/source/owner all correct | ✓ PASS |
| Full test suite | `node --test` | `tests 118, pass 118, fail 0` | ✓ PASS |
| `git diff --name-only` scope for gap-closure commits | `git show --stat 28383d2 5eddd10` | Only `test/init.test.js` and `src/init.js` changed; `bin/motto.js` untouched | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| INIT-01 | 10-01, 10-03 | `motto init [name]` scaffolds into cwd, `[name]` fills fields / defaults to cwd basename; never-throw contract | ✓ SATISFIED | Truth #1, #7 |
| INIT-02 | 10-02 | Scaffolded starter skill passes lint/build with zero edits, permanent dogfood test | ✓ SATISFIED | Truth #2, #9 |
| INIT-03 | 10-01 | marketplace.json relative source at `dist/public/`, owner from git config w/ placeholder fallback, name consistent with motto.yaml | ✓ SATISFIED | Truth #5 |
| INIT-04 | 10-01, 10-02, 10-03 | Non-empty guard refuses; `--force` overrides; never-throw contract for the STEP 4 write-failure path | ✓ SATISFIED | Truth #3, #6, #7, #8 |
| INIT-05 | 10-01, 10-02 | Name validated with the same rule lint enforces (schema.js single source) | ✓ SATISFIED | Truth #4, #8 |
| INIT-06 | 10-01 | `.gitignore` ignores `dist/private/`, keeps `dist/public/` tracked | ✓ SATISFIED | Truth #5 |

All 6 phase requirement IDs (INIT-01 through INIT-06) declared across PLAN frontmatter (10-01, 10-02, 10-03) are accounted for and cross-referenced against REQUIREMENTS.md, which lists all six as `[x]` complete with Phase 10 traceability. No orphaned requirements found. 10-03's frontmatter declares `requirements: [INIT-01, INIT-04]`, both already covered by 10-01/10-02 and now additionally strengthened by the never-throw fix — no new requirement IDs introduced, no scope reduction.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/init.js` | 92-99 (`resolveGitOwnerName`) | `execFileSync` called without `stdio` option — child stderr passes through to parent stderr | ⚠️ Warning | Pre-existing (REVIEW.md WR-03), unresolved, not blocking the phase goal, out of scope for the gap-closure plan (which was WR-01 only) |
| `test/init.test.js` | pre-existing | The `'../evil'` adversarial-name case only inspects `readdir(tempDir)`, not the parent directory | ℹ️ Info | Pre-existing (REVIEW.md WR-04), unresolved, low materiality, out of scope for this gap-closure plan |
| `bin/motto.js` | 45 | `process.exit()` in the parseArgs catch block | ℹ️ Info | Pre-existing pattern from before Phase 10 (REVIEW.md WR-02), out of scope |

No `TBD`/`FIXME`/`XXX` debt markers found in `src/init.js`, `test/init.test.js`, or `bin/motto.js` (`grep -inE "TBD|FIXME|XXX"` returns no matches). The two new try/catch blocks in `src/init.js` are fully implemented (no stub/placeholder patterns) — each maps directly to a returned `{ ok:false, errors }` value consumed by both the test suite and the live CLI.

### Human Verification Required

None. All truths verified programmatically via direct code read, live CLI reproduction, and the passing test suite.

### Gaps Summary

The single Phase 10 gap identified in the prior verification (Truth #7: `scaffoldProject`'s documented never-throw contract was violated for two fs-error paths — a file-as-target ENOTDIR and an unguarded write in `writeScaffold`) has been closed by gap-closure plan 10-03 (commits `28383d2` test, `5eddd10` fix).

Verification was not limited to trusting 10-03-SUMMARY.md's claims: both previously-throwing scenarios were re-reproduced directly against the current codebase in this session — (a) calling `scaffoldProject` programmatically against a file-as-target resolved a clean `{ ok:false, errors }` object instead of throwing `ENOTDIR`, and (b) running the actual `bin/motto.js` CLI end-to-end against a write-blocked target (`--force` with a pre-existing file occupying the `skills` path) printed the documented `✗ (init): scaffold write failed: ...` message and set `process.exitCode = 1`, with no raw Node stack trace. `bin/motto.js` was confirmed unmodified by the gap-closure diff, consistent with the plan's design (the fix lives entirely in `src/init.js`'s error-shape mapping, reusing the existing generic-error rendering path).

All 8 previously-passing truths were regression-checked (not merely assumed passing) against the current codebase: golden-path init→lint→build, non-empty guard, invalid-name rejection, `--force` overwrite-only behavior, and `.gitignore`/`marketplace.json` content correctness all reproduce identically to the prior verification run. The full test suite is green at 118/118 (116 prior + 2 new adversarial never-throw regression tests). No regressions introduced by the gap-closure plan.

Phase 10 goal — "A stranger with only `npm i -g @jeremiewerner/motto` can run one command and get a complete skills project that lints and builds with zero edits" — is fully achieved, including graceful (non-crashing) handling of the two edge-case failure modes discovered during code review. All 6 requirement IDs (INIT-01 through INIT-06) are satisfied.

---

_Verified: 2026-07-02T07:15:00Z_
_Verifier: Claude (gsd-verifier)_
