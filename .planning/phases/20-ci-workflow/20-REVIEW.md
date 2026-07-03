---
phase: 20-ci-workflow
reviewed: 2026-07-03T21:46:41Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - .github/workflows/ci.yml
  - package.json
  - scripts/npm-drift-check.mjs
  - scripts/pack-install-e2e.mjs
  - scripts/prepare-guard-check.mjs
  - scripts/prepare.mjs
findings:
  critical: 1
  warning: 5
  info: 5
  total: 11
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-07-03T21:46:41Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the Phase 20 CI deliverables: the GitHub Actions workflow (4 jobs), the pack-install E2E script, the npm registry drift check, the husky `prepare` guard, and the `.git`-less proof script. Trigger security is sound (`pull_request`, not `pull_request_target`; `permissions: contents: read`; no untrusted input interpolated into workflow YAML). Tmp-dir cleanup runs in `finally` blocks on both scripts, and `run()` throws rather than exiting so cleanup survives failure paths.

However, the review found one critical defect and several warnings. The critical issue: both E2E scripts and `prepare.mjs` rely on bare `npx <name>`, and npm's documented behavior in CI is to assume `--yes` and auto-install missing packages from the public registry. An unrelated `motto` package (v1.0.2) exists on npmjs.org — verified during this review — so the exact regression the E2E exists to catch (broken bin linking) would cause CI to silently download and execute a stranger's package instead of failing on the system under test. The never-red guarantee of `npm-drift-check.mjs` also has an uncovered throw path that contradicts its own "structurally incapable of exiting non-zero" comment, and the workflow comment about `npm ci` firing `prepublishOnly` is factually wrong per npm's own documentation.

## Critical Issues

### CR-01: `npx motto` falls back to installing the unrelated public `motto` package in CI, masking bin-linking regressions and executing untrusted code

**File:** `scripts/pack-install-e2e.mjs:97` (also `:102`, `:114`)
**Issue:** The E2E's core purpose is to prove the real consumer path — bin linking via the `files` allowlist and tarball install. But `run('npx', ['motto', ...])` relies on npm resolving `motto` from `consumerDir/node_modules`. Per npm's documentation for `npm exec`/`npx`: *"If any requested packages are not present in the local project dependencies, then a prompt is printed... When standard input is not a TTY or a CI environment is detected, `--yes` is assumed"* — i.e., in GitHub Actions, npx auto-installs from the public registry without prompting. An unrelated package named `motto` (v1.0.2, "Show your motto in an amazing way!") exists on npmjs.org (verified against `registry.npmjs.org/motto` during this review). Consequences if bin linking ever breaks (missing `bin` entry, `files` allowlist regression, install failure):
1. CI downloads and executes a third-party, attacker-updatable package inside the runner instead of failing on the missing bin — a supply-chain execution path.
2. The failure mode becomes a confusing error from the wrong package (or, worst case, a false green), masking the exact regression this E2E was built to detect.

The fragility is compounded by the resolution comment at line 92-94: npx "walks up from cwd" to find the local project — if a future `motto init` template ever adds a `package.json` to `projectDir`, npx would treat `projectDir` as the project root (no `motto` dependency there) and flip to registry fallback even with healthy bin linking.
**Fix:**
```js
// Pin execution to the locally installed bin — never the registry.
// Option A: forbid npx auto-install
run('npx', ['--no', 'motto', 'init'], { cwd: projectDir });
// Option B (stronger): invoke the linked bin path directly
const mottoBin = join(consumerDir, 'node_modules', '.bin', 'motto');
run(mottoBin, ['init'], { cwd: projectDir });
```
Apply the same change to the `lint` (line 102) and `build` (line 114) invocations.

## Warnings

### WR-01: npm-drift-check's never-red guarantee has an uncovered throw path; the "structurally incapable of exiting non-zero" comment is false

**File:** `scripts/npm-drift-check.mjs:22` (also `:48-50`)
**Issue:** The stated invariant (D-10) is that this script can never fail CI red. But line 22 — `JSON.parse(readFileSync('package.json', 'utf8'))` — sits *before* the `try` block that begins at line 24, and the top-level `await main()` at line 48 has no catch. If `package.json` is unreadable, malformed (bad merge), or absent (script run from a cwd other than repo root — the path is relative), `main()` rejects, the top-level await propagates, and Node exits non-zero → the drift job goes red. The closing comment ("the script is structurally incapable of exiting non-zero") and the header comment ("The entire network+parse body is wrapped in one try/catch") are both contradicted by this path: no branch *sets* a non-zero code, but an uncaught throw *exits* with one.
**Fix:**
```js
async function main() {
  let localVersion;
  try {
    ({ version: localVersion } = JSON.parse(readFileSync('package.json', 'utf8')));
  } catch (err) {
    console.log(`::warning::npm-drift check inconclusive (could not read package.json: ${err.message})`);
    return;
  }
  // ... existing try/catch for network+parse ...
}

await main().catch((err) => {
  console.log(`::warning::npm-drift check inconclusive (${err.message})`);
});
```
The final `.catch` makes the guarantee actually structural instead of aspirational.

### WR-02: `prepare.mjs` uses bare `npx husky`, which auto-installs husky from the registry in CI and masks the broken-install failure D-13 claims to surface

**File:** `scripts/prepare.mjs:26`
**Issue:** The header comment states the design intent: *"a genuinely broken husky install there still fails loudly (no `husky || true` always-succeed masking, D-13)."* But `npx husky` defeats that intent through a different door: if husky is missing from `node_modules` (broken/partial install, `npm ci --omit=dev` in a git checkout), npx in a CI/non-TTY environment assumes `--yes` and silently fetches the latest `husky` from the public registry, then succeeds. The broken install is masked — the exact failure mode D-13 was written to prevent — and the fetched version is unpinned (ignores the `^9.1.7` devDependency). Same npx-fallback class as CR-01, lower blast radius (the package name `husky` at least resolves to the intended project).
**Fix:**
```js
execSync('npx --no husky', { stdio: 'inherit' }); // fail loudly if husky is not actually installed
```

### WR-03: Shell interpolation of tmp-dir path in `execSync` — unquoted `${dir}` breaks on spaces and is injectable via TMPDIR

**File:** `scripts/prepare-guard-check.mjs:29`
**Issue:** `execSync(\`git archive HEAD | tar -x -C ${dir}\`)` interpolates the mkdtemp path into a shell string with no quoting. `dir` derives from `os.tmpdir()`, i.e. the `TMPDIR` environment variable: a path containing spaces (common on macOS self-hosted runners or local dev runs) splits the `-C` argument, and shell metacharacters in `TMPDIR` would be executed (environment-mediated command injection — low likelihood in hosted CI, but this is exactly the shell-injection shape the phase flagged for attention). Additionally, the pipeline runs under `/bin/sh` (dash on ubuntu) with no `pipefail`, so the pipeline's exit status is `tar`'s alone; a `git archive` failure that still produces partial output is only detected indirectly and misattributed.
**Fix:** Avoid the shell string entirely:
```js
const archive = spawnSync('git', ['archive', 'HEAD'], { maxBuffer: 64 * 1024 * 1024 });
if (archive.status !== 0) { /* fail with archive.stderr */ }
const untar = spawnSync('tar', ['-x', '-C', dir], { input: archive.stdout });
if (untar.status !== 0) { /* fail with untar.stderr */ }
```
(Or at minimum quote: `\`git archive HEAD | tar -x -C "${dir}"\`` — but the argv form removes both the quoting and the pipefail problem.)

### WR-04: ci.yml comment falsely claims `npm ci` fires `prepublishOnly` — npm docs say it runs ONLY on `npm publish`

**File:** `.github/workflows/ci.yml:29-33`
**Issue:** The comment states: *"npm ci fires both the `prepare` guard ... and `prepublishOnly` (node bin/motto.js build) on every leg of this matrix."* This is factually wrong. Per npm's lifecycle documentation (verified against `npm help scripts`): `prepublishOnly` *"Runs BEFORE the package is prepared and packed, ONLY on npm publish."* `npm ci` runs `preinstall`/`install`/`postinstall`/`prepare` — never `prepublishOnly`. The comment exists specifically to guide future maintainers on lifecycle idempotency (Pitfall 1); it creates the false belief that `node bin/motto.js build` is exercised on every matrix leg (it is not — only the `dogfood` job and the E2E's internal `npm pack` exercise the build), so a future `prepublishOnly` regression that only manifests at publish time would be wrongly assumed to be covered by the test matrix.
**Fix:** Correct the comment:
```yaml
# npm ci fires the `prepare` guard (scripts/prepare.mjs — no-ops on .git-less
# installs but runs here since checkout gives us a real .git) on every leg of
# this matrix. NOTE: `prepublishOnly` (node bin/motto.js build) does NOT run
# on npm ci — it runs only on `npm publish`; the build is exercised by the
# dogfood job and by `npm pack` inside pack-install-e2e instead.
```

### WR-05: `spawnSync` failure diagnostics omit `error`/`signal` — an ENOENT or signal kill prints "stdout: null stderr: null", defeating the stated debuggability bar

**File:** `scripts/pack-install-e2e.mjs:36-44` (also `scripts/prepare-guard-check.mjs:38-45`)
**Issue:** Both scripts correctly treat `status: null` as failure (`r.status !== 0` catches spawn failure and signal termination — good). But the diagnostic message only includes `stdout`/`stderr`, which are `null` in the ENOENT case and empty/truncated in the signal case. The actual root cause lives in `r.error` (spawn failure, e.g. `npm` not on PATH) and `r.signal` (OOM-killer SIGKILL, timeout SIGTERM). Both files explicitly claim failures must be "debuggable from CI logs alone" (Pitfall 3); `npm pack --json\nstdout: null\nstderr: null` is not.
**Fix:** In `run()`:
```js
if (r.status !== 0) {
  throw new Error(
    `${cmd} ${args.join(' ')}\nstatus: ${r.status} signal: ${r.signal}` +
    `${r.error ? `\nspawn error: ${r.error.message}` : ''}` +
    `\nstdout: ${r.stdout}\nstderr: ${r.stderr}`,
  );
}
```
Mirror the same fields in prepare-guard-check's failure message (line 41-43).

## Info

### IN-01: Actions pinned to major tags, not commit SHAs

**File:** `.github/workflows/ci.yml:24-25` (and all other `uses:` lines)
**Issue:** `actions/checkout@v6` / `actions/setup-node@v6` are mutable tags; a compromised tag would execute in your CI. Blast radius is well-contained here (`permissions: contents: read`, no secrets in the workflow), so this is informational.
**Fix:** Pin to full commit SHAs with a tag comment, e.g. `uses: actions/checkout@<sha> # v6`, and let Dependabot bump them.

### IN-02: No `timeout-minutes` on any job; drift-check fetch has no explicit timeout

**File:** `.github/workflows/ci.yml:17-77` (and `scripts/npm-drift-check.mjs:25`)
**Issue:** A hung `npm ci` or registry stall runs until the 360-minute default job timeout. The drift check's `fetch` relies on undici's default header timeout (~5 min) before its catch fires.
**Fix:** Add `timeout-minutes: 10` (or similar) per job; optionally `fetch(url, { signal: AbortSignal.timeout(10_000) })` in the drift check (still lands in the existing catch → warning, never red).

### IN-03: `cancel-in-progress: true` also cancels in-flight runs on pushes to main

**File:** `.github/workflows/ci.yml:10-12`
**Issue:** Two quick pushes to `main` cancel the first run, leaving that commit permanently without a CI verdict — awkward for bisecting or release auditing. Standard pattern is to cancel only PR runs.
**Fix:** `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`

### IN-04: Unguarded destructure of pack manifest loses stdout context on unexpected shape

**File:** `scripts/pack-install-e2e.mjs:78`
**Issue:** `const [{ filename }] = packManifest` on an empty/odd-shaped (but valid-JSON) manifest throws `Cannot destructure property 'filename' of 'undefined'` — caught and exit-1'd, but without the raw stdout that every other failure path includes (Pitfall 3 consistency).
**Fix:** `if (!Array.isArray(packManifest) || !packManifest[0]?.filename) throw new Error(\`unexpected npm pack --json shape\nstdout: ${packResult.stdout}\`);`

### IN-05: Sequential `await rm` in `finally` — a rejection from the first skips the second cleanup

**File:** `scripts/pack-install-e2e.mjs:128-129`
**Issue:** `force: true` suppresses ENOENT but not e.g. EBUSY/EACCES; if `rm(packDir)` rejects, `rm(consumerDir)` never runs and the rejection replaces the original error from `main()`.
**Fix:** `await Promise.allSettled([rm(packDir, {...}), rm(consumerDir, {...})]);`

---

_Reviewed: 2026-07-03T21:46:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
