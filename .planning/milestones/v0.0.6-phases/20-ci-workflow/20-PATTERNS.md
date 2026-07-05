# Phase 20: CI Workflow - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 4 (1 workflow YAML + 3 Node scripts; `package.json` modification is covered under Shared Patterns)
**Analogs found:** 0 exact / 4 total — this phase introduces file *types* (`.github/workflows/*.yml`, `scripts/*.mjs`) that do not yet exist anywhere in the repo. No `.github/` directory, no `scripts/` directory. Closest analogs are same-role Node scripts in `test/` (spawn-child-process + mkdtemp-tmpdir patterns) and the CLI's own exit-code/never-throw conventions in `bin/motto.js`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|----------------|
| `.github/workflows/ci.yml` | config | event-driven (push/PR trigger) | *(none in repo — first CI config)* | no-analog |
| `scripts/pack-install-e2e.mjs` | utility (E2E test script) | batch (spawn subprocess chain, assert exit codes/JSON) | `test/init-dogfood.test.js` (tmpdir lifecycle) + `test/cli.test.js` (`runCli`/`spawnSync` pattern) | role-match (test-script pattern reused outside `test/`) |
| `scripts/prepare.mjs` | utility (lifecycle guard) | request-response (sync check → conditional exec) | *(none — first lifecycle-script guard)*; `bin/motto.js`'s exit-code discipline is the nearest convention match | partial-match (convention only) |
| `scripts/npm-drift-check.mjs` (or inline YAML step, per Claude's Discretion) | utility (read-only external check) | request-response (fetch → compare → warn) | *(none — first external-fetch script)*; `bin/motto.js`'s never-throw/always-exit-0-on-handled-branches convention is the nearest match | partial-match (convention only) |
| `package.json` (`"prepare"` script field) | config | — | itself (existing `"prepare": "husky"` line) | exact (modification, not new file) |

## Pattern Assignments

### `.github/workflows/ci.yml` (config, event-driven)

**Analog:** None in this repo. Use the verified skeleton from RESEARCH.md's "Code Examples" section directly — it is already tailored to this repo's exact commands (`npm ci`, `npm test`, `node bin/motto.js lint/build --quiet`). Treat RESEARCH.md `Pattern 1`/`Pattern 2`/`Pattern 3` code blocks as the canonical source, not a hypothetical example.

**Trigger + concurrency block** (RESEARCH.md lines 186-197, verified against D-01/D-02):
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Test matrix job** (RESEARCH.md lines 198-212):
```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [20, 22, 24]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

**Dogfood job, pinned Node 20, `--quiet` assertions** (RESEARCH.md lines 220-236, D-07/D-08):
```yaml
dogfood:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with: { node-version: 20, cache: 'npm' }
    - run: npm ci
    - name: lint --quiet (D-08 — stdout empty, exit 0)
      run: |
        out=$(node bin/motto.js lint --quiet)
        if [ -n "$out" ]; then echo "expected empty stdout, got: $out" >&2; exit 1; fi
    - name: build --quiet (D-08 — stdout empty, exit 0)
      run: |
        out=$(node bin/motto.js build --quiet)
        if [ -n "$out" ]; then echo "expected empty stdout, got: $out" >&2; exit 1; fi
```

**pack-install-e2e / npm-drift jobs**: no pre-baked YAML skeleton exists in RESEARCH.md beyond the diagram — construct as siblings (no `needs:`), Node 20 only for `pack-install-e2e` (D-07), any Node for `npm-drift`, each invoking the corresponding `scripts/*.mjs` file via `run: node scripts/<file>.mjs`.

**Least-privilege permissions** (per RESEARCH.md Security Domain, V14 Configuration — add even though not strictly required this phase):
```yaml
permissions:
  contents: read
```

---

### `scripts/pack-install-e2e.mjs` (utility, batch/subprocess-chain)

**Analog 1 — subprocess spawn + failure surfacing:** `/Users/jeremie/Projects/motto/test/cli.test.js` lines 24-33 (`runCli` helper)
```javascript
function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd,
  });
}
```
Reuse the same `spawnSync(..., { encoding: 'utf8' })` shape; RESEARCH.md's skeleton (`Code Examples` section) already generalizes this into a `run(cmd, args, opts)` helper that exits 1 with `stdout`/`stderr` echoed on failure — copy that helper verbatim, it is the direct evolution of `runCli`.

**Analog 2 — tmpdir lifecycle + throw-on-setup-failure:** `/Users/jeremie/Projects/motto/test/init-dogfood.test.js` lines 1-30
```javascript
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
...
tempDir = await mkdtemp(join(tmpdir(), 'motto-init-dogfood-'));
...
after(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});
```
Copy the `mkdtemp(join(tmpdir(), '<prefix>-'))` + guarded `rm(..., { recursive: true, force: true })` cleanup pattern for both the pack-dir and consumer-dir tempdirs in the E2E script (RESEARCH.md's skeleton already does this — treat it as the reference implementation, not merely illustrative).

**Analog 3 — descriptive failure messages with raw stdout/stderr included** (per Pitfall 3 in RESEARCH.md): `test/cli.test.js`'s convention of embedding `` `stderr: ${r.stderr}\nstdout: ${r.stdout}` `` in assertion failures, and `test/init-dogfood.test.js`'s
```javascript
throw new Error(
  `init dogfood scaffold failed — lint/build assertions skipped. Root cause:\n${JSON.stringify(scaffoldResult.errors, null, 2)}`,
);
```
Apply the same "include root-cause payload in the failure message" discipline in `pack-install-e2e.mjs`'s JSON-assertion failure branches — never a bare `process.exit(1)` without context.

**JSON-result shape to assert against** — `bin/motto.js` produces `{ ok, count }` for lint and `{ ok, outDir, skillCount, bucketCount }` for build under `--format json` (per 19-CONTEXT.md, consumed contract). Assert `.ok === true` and the relevant count field, exactly as `test/init-dogfood.test.js` lines ~65-77 already assert on the in-process result objects:
```javascript
assert.strictEqual(lintResult.ok, true, ...);
assert.strictEqual(lintResult.count, 1, ...);
assert.strictEqual(buildResult.skillCount, 1);
assert.strictEqual(buildResult.bucketCount, 1);
```
The E2E script performs the equivalent check on `JSON.parse(stdout)` instead of an in-process object.

---

### `scripts/prepare.mjs` (utility, lifecycle guard)

**Analog:** None — first lifecycle-script guard in this repo. Nearest convention: `bin/motto.js`'s exit-code discipline (`/Users/jeremie/Projects/motto/bin/motto.js` lines 44-48):
```
* Exit codes: always set via process.exitCode — never process.exit(), which
...
* process drains its streams and exits naturally with exitCode 1.
```
**Caveat:** `scripts/prepare.mjs` is a standalone lifecycle script invoked directly by npm (not through the CLI dispatcher), so it legitimately uses `process.exit(0)` for its early no-op branch (RESEARCH.md's own skeleton does this) — the `process.exitCode`-only convention is specific to `bin/motto.js`'s CLI dispatch loop, not a repo-wide rule for every script. Note this distinction explicitly in the plan so it isn't miscopied as a blanket "never `process.exit()`" rule.

**Verified skeleton** (RESEARCH.md "Code Examples", D-13/D-14):
```javascript
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!existsSync('.git')) {
  process.exit(0); // not a git checkout — no-op
}

execSync('npx husky', { stdio: 'inherit' }); // real checkout — let a genuine failure surface loudly
```

**package.json change:**
```json
"prepare": "node scripts/prepare.mjs"
```
(current: `"prepare": "husky"` at `/Users/jeremie/Projects/motto/package.json` line ~19)

---

### `scripts/npm-drift-check.mjs` (utility, read-only external check)

**Analog:** None — first `fetch`-based script in the repo. Nearest convention: `bin/motto.js`'s never-throw-to-caller boundary discipline (same file/skill referenced in `motto-never-throw-invariant` memory) — every branch must resolve to a handled outcome, never an uncaught rejection.

**Verified skeleton** (RESEARCH.md "Pattern 3" / "Code Examples", D-09..D-12):
```javascript
import { readFileSync } from 'node:fs';

async function main() {
  const { version: localVersion } = JSON.parse(readFileSync('package.json', 'utf8'));
  try {
    const res = await fetch('https://registry.npmjs.org/@jeremiewerner%2Fmotto');
    if (!res.ok) {
      console.log(`::warning::npm-drift check inconclusive (registry returned ${res.status})`);
      return;
    }
    const data = await res.json();
    const latest = data['dist-tags']?.latest;
    if (!latest) {
      console.log('::warning::npm-drift check inconclusive (no dist-tags.latest in response)');
      return;
    }
    if (latest !== localVersion) {
      console.log(
        `::warning::npm registry latest (${latest}) does not match package.json (${localVersion})`,
      );
    }
  } catch (err) {
    console.log(`::warning::npm-drift check inconclusive (${err.message})`);
  }
}

await main();
// No explicit process.exitCode set anywhere above — script always exits 0 (D-10).
```
Entire body wrapped in one try/catch — no partial coverage (per Anti-Pattern warning in RESEARCH.md: "an unhandled promise rejection from `fetch()` outside a try/catch would fail the job").

---

## Shared Patterns

### Subprocess spawning
**Source:** `test/cli.test.js` lines 24-33 (`runCli`)
**Apply to:** `scripts/pack-install-e2e.mjs` — same `spawnSync(cmd, args, { encoding: 'utf8', cwd })` shape, generalized into a reusable `run()` helper (see RESEARCH.md skeleton).

### Tmpdir lifecycle (setup/teardown)
**Source:** `test/init-dogfood.test.js` lines 1, 22-24, 47-49 (`mkdtemp`/`rm` with `{ recursive: true, force: true }`, guarded cleanup)
**Apply to:** `scripts/pack-install-e2e.mjs` — two tempdirs needed (pack destination + consumer project), both following this exact lifecycle shape.

### Never-throw / always-resolve boundary
**Source:** memory `motto-never-throw-invariant` + `bin/motto.js`'s exit-code discipline (lines 44-48, 205)
**Apply to:** `scripts/npm-drift-check.mjs` most critically (D-10 requires guaranteed exit 0 on every branch — network failure, 404, missing field) and `scripts/prepare.mjs` (guard branch must not throw on missing `.git`).

### Descriptive failure messages (root cause included, not bare exit codes)
**Source:** `test/cli.test.js`'s `` `stderr: ${r.stderr}\nstdout: ${r.stdout}` `` convention; `test/init-dogfood.test.js`'s `` `...Root cause:\n${JSON.stringify(errors, null, 2)}` `` convention
**Apply to:** `scripts/pack-install-e2e.mjs`'s every assertion failure branch (exit-code checks and JSON-shape checks alike) — per RESEARCH.md Pitfall 3, this keeps a future `--format json` regression debuggable from CI logs alone.

### JSON contract consumed from `bin/motto.js` (Phase 19)
**Source:** `bin/motto.js` `renderResult()` — lint: `{ ok, count }`; build: `{ ok, outDir, skillCount, bucketCount }` (documented in `19-CONTEXT.md` D-01/D-02/D-05/D-09, and mirrored in `test/init-dogfood.test.js`'s in-process assertions on the same field names)
**Apply to:** `scripts/pack-install-e2e.mjs`'s `--format json` parsing steps — field names must match exactly (`count` not `skillCount` for lint; `skillCount`/`bucketCount` for build).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/workflows/ci.yml` | config | event-driven | First CI workflow in this repo — no `.github/` directory exists at all. Use RESEARCH.md's verified YAML skeletons directly (already tailored to this repo's own commands, not generic boilerplate). |
| `scripts/prepare.mjs` | utility | request-response | First lifecycle-script guard; no `scripts/` directory exists yet. Use RESEARCH.md's verified skeleton (empirically tested this session against real npm behavior) rather than a generic husky guard example. |
| `scripts/npm-drift-check.mjs` | utility | request-response | First stdlib-`fetch`-based script; no external-HTTP-call precedent anywhere in `src/`, `bin/`, or `test/`. Use RESEARCH.md's verified skeleton. |

## Metadata

**Analog search scope:** repo root, `test/`, `bin/`, `src/`, `.husky/`, `package.json` (no `.github/` or `scripts/` directories exist prior to this phase)
**Files scanned:** `package.json`, `.husky/pre-commit`, `test/cli.test.js`, `test/init-dogfood.test.js`, `test/dogfood.test.js`, `bin/motto.js`
**Pattern extraction date:** 2026-07-03
