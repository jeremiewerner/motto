# Phase 23: Version Stamping & Skew Detection - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 8 (1 new src, 4 modified src/bin, 3+ test files with new fixtures)
**Analogs found:** 8 / 8 (research already pre-solved architecture; this map grounds it in exact excerpts)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|----------------|
| `src/version.js` (NEW) | utility (pure module + one fs read) | transform (parse/compare) | `src/config.js` (`loadConfig`) | role-match (pure-validator house style) |
| `src/config.js` (MODIFIED) | model/validator | CRUD (field validation) | itself — `plugins.private` optionality block (lines 96-102) | exact (same file, same pattern extended) |
| `src/init.js` (MODIFIED) | service/orchestrator | file-I/O (scaffold write) | itself — `writeScaffold` motto.yaml template (lines 145-151) | exact |
| `src/lint.js` (MODIFIED) | controller/orchestrator | request-response (validate + aggregate) | itself — `processConfig` (lines 43-61) | exact |
| `src/build.js` (MODIFIED) | controller/orchestrator | request-response (validate + aggregate) | itself — STEP 2 config re-read (lines 97-99) + `lint.js` `processConfig` | exact |
| `bin/motto.js` (MODIFIED) | controller/CLI presentation | request-response (render) | itself — `renderResult` (lines 193-206) | exact |
| `test/version.test.js` (NEW) | test | transform (unit) | `test/config.test.js` malformed-field matrix pattern | role-match |
| `test/lint.test.js`, `test/build.test.js`, `test/init.test.js`, `test/cli.test.js` (MODIFIED) | test | integration | existing `mkdtemp` fixture pattern (`test/init.test.js`, `test/dogfood.test.js`) | exact |

## Pattern Assignments

### `src/version.js` (NEW — utility, transform)

**Analog:** `src/config.js` (pure-validator house style: doc-comment convention, never-throw boundary, exported pure functions)

**Doc-comment + never-throw convention** (`src/config.js` lines 1-9):
```javascript
/**
 * Motto project-config validator.
 *
 * Pure validator — no filesystem I/O, never throws (D-01). All validation failures
 * surface through the returned errors[].
 *
 * Exports:
 *   - loadConfig(text: string) -> { config: object, errors: Array<{ message: string }> }
 */
```
Mirror this exactly for `version.js`'s header, substituting `getOwnVersion`/`parseVersion`/`checkSkew` for `loadConfig`, and noting explicitly that `getOwnVersion` is the ONE function in the file that touches fs (a single `readFileSync`), while `parseVersion`/`checkSkew` are pure string-in/object-out.

**Never-throw try/catch shape** (`src/config.js` lines 44-52):
```javascript
let doc;
try {
  doc = parseDocument(text);
} catch (e) {
  // Defensive: parseDocument is specified not to throw, but D-01 requires we
  // never throw regardless of input. Catch and surface any unexpected exception.
  errors.push({ message: String(e.message || e) });
  return { config, errors };
}
```
Apply the same defensive-catch shape to `getOwnVersion()`'s `readFileSync`/`JSON.parse` call — catch-all, collapse to `null`, never rethrow (per RESEARCH Pattern 1's `getOwnVersion` example, which already follows this exact house style).

**Full target implementation is already fully specified in RESEARCH.md Pattern 1** (lines 137-216 of 23-RESEARCH.md) — copy that code verbatim as the starting point; it already matches this codebase's conventions (JSDoc style matching `config.js`, `@returns` typed, inline rationale comments referencing decision IDs like `(VER-04/D-04)`).

---

### `src/config.js` (MODIFIED — model/validator, CRUD)

**Analog:** itself — the existing `plugins.private` optionality block is the EXACT pattern to mirror for `mottoVersion` optionality (both CONTEXT.md D-04 and RESEARCH.md Pattern 2 confirm this).

**Optional-field pattern to copy** (`src/config.js` lines 95-102):
```javascript
// plugins.private is OPTIONAL (CONF-03, D-17). Only validate format when present.
if (plugins.private != null) {
  if (!NAME_KEBAB.test(plugins.private)) {
    errors.push({
      message: `plugins.private "${plugins.private}" must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)`,
    });
  }
}
```

**Critical variant — use `!== undefined`, NOT `!= null`:** Pitfall 1 (RESEARCH.md) explicitly warns that a falsy-check (`!config.mottoVersion`) or even `!= null` would incorrectly conflate "field absent" with "field is empty string" — and empty string IS a malformed value requiring its own distinct error (VER-05), not the "absent" no-op path. `plugins.private`'s existing `!= null` guard is CORRECT for its own semantics (empty string isn't tested there) but must NOT be copied literally for `mottoVersion` — use the exact gate from RESEARCH.md Pattern 2:
```javascript
if (config.mottoVersion !== undefined) {
  if (typeof config.mottoVersion !== 'string' || config.mottoVersion.trim() === '') {
    errors.push({
      message: `mottoVersion must be a version string like "0.0.7", got ${describeType(config.mottoVersion)}`,
    });
  } else if (!parseVersion(config.mottoVersion)) {
    errors.push({
      message: `mottoVersion "${config.mottoVersion}" is not a recognizable version string`,
    });
  }
}
```
Requires a new import: `import { parseVersion } from './version.js';` — mirrors the existing `import { NAME_KEBAB } from './schema.js';` single-source-of-truth import edge (`config.js` line 15).

**Error-push shape convention** (no `skill` field at this layer — lifted later by `lint.js`):
```javascript
errors.push({ message: "missing name" });
```
`config.js`'s errors are always `{ message }` only; `lint.js`'s `processConfig` is what adds the `skill: 'motto.yaml'` label (see below). Do not add a `skill` field inside `config.js`.

---

### `src/init.js` (MODIFIED — service/orchestrator, file-I/O)

**Analog:** itself — `writeScaffold`'s inline motto.yaml template string.

**Template to extend** (`src/init.js` lines 145-151):
```javascript
// motto.yaml — name and plugins.public derive from the SAME validated
// `name` value (Pitfall 2). plugins.private intentionally omitted.
await writeFile(
  join(targetDir, 'motto.yaml'),
  `name: ${name}\nversion: "0.1.0"\ndescription: ${SCAFFOLD_DESCRIPTION}\nplugins:\n  public: ${name}\n`,
);
created.push('motto.yaml');
```
Add a `mottoVersion: "<getOwnVersion()>"` line. Import `getOwnVersion` from `./version.js` at the top, alongside the existing `import { NAME_KEBAB } from './schema.js';` (line 30) — same single-source-of-truth import convention. Per RESEARCH.md's architecture diagram: if `getOwnVersion()` returns `null` (defensive fallback), OMIT the `mottoVersion:` line entirely rather than writing `mottoVersion: null` or an empty string — never-throw fallback, matches the "absence is valid" contract in `config.js`.

**Note (D-R4 / dogfood sequencing):** Do NOT touch this repository's own root `motto.yaml` as part of implementing `init.js` — only NEW scaffolds get stamped. This repo's own tree stays unstamped through Phase 23 per RESEARCH.md's explicit recommendation.

---

### `src/lint.js` (MODIFIED — controller/orchestrator, request-response)

**Analog:** itself — `processConfig` (lines 43-61) is the exact insertion point; `lintProject`'s final return (line 356) is where the new `warnings` field is added.

**Config-error-lifting pattern to mirror for calling checkSkew** (`src/lint.js` lines 43-61):
```javascript
async function processConfig(projectRoot, errors) {
  const configPath = join(projectRoot, 'motto.yaml');
  let text;
  try {
    text = await readFile(configPath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      errors.push({ skill: 'motto.yaml', message: 'file not found' });
    } else {
      errors.push({ skill: 'motto.yaml', message: `could not read: ${e.message}` });
    }
    return; // config errors collected; skill scan still runs (D2-10)
  }
  const { errors: configErrors } = loadConfig(text);
  for (const e of configErrors) {
    // Lift: loadConfig errors have no skill field (Pitfall 3); add 'motto.yaml' label
    errors.push({ skill: 'motto.yaml', message: e.message });
  }
}
```
`processConfig` needs to also return (or the caller needs access to) the parsed `config` object so `checkSkew(config.mottoVersion, getOwnVersion())` can be called afterward — currently `processConfig` only mutates `errors` and returns nothing. Either widen its return to `{ config }` or restructure the caller to re-run `loadConfig` inline (mirrors `build.js`'s existing "Option A — re-read" convention at STEP 2, lines 97-99, which the codebase already accepts as its RESEARCH-blessed reuse pattern rather than threading config through more parameters).

**Gate skew check on "no config error already reported for mottoVersion"** (per RESEARCH.md Anti-Patterns + D-R1) — do not call `checkSkew` if `config.mottoVersion` was already pushed to `errors[]` as malformed; `parseVersion` returning `null` for a malformed value naturally suppresses double-reporting, but be defensive per the Anti-Patterns note.

**Return-shape extension point** (`src/lint.js` line 356):
```javascript
return { ok: errors.length === 0, errors, count: skillNames.length };
```
becomes:
```javascript
return { ok: errors.length === 0, errors, warnings, count: skillNames.length };
```
`ok` computation is UNCHANGED — `warnings` is purely additive (VER-02 contract).

---

### `src/build.js` (MODIFIED — controller/orchestrator, request-response)

**Analog:** `src/lint.js`'s `processConfig` (same skew check, reusing the STEP 2 config re-read already present in `build.js`).

**Existing re-read point to hook into** (`src/build.js` lines 89-99):
```javascript
export async function buildProject(projectRoot) {
  // ── STEP 1: Lint gate (D3-01, D3-02) ──────────────────────────────────────
  // The gate runs BEFORE any mutation. A failing lint means zero writes to dist/.
  const lintResult = await lintProject(projectRoot);
  if (!lintResult.ok) {
    return { ok: false, outDir: null, errors: lintResult.errors, skillCount: 0, bucketCount: 0 };
  }

  // ── STEP 2: Load config + skill data (Option A — re-read, RESEARCH §Reuse) ─
  const configText = await readFile(join(projectRoot, 'motto.yaml'), 'utf8');
  const { config } = loadConfig(configText); // lint passed → config is valid
```
Since `lintProject` already computed `warnings` (including any skew warning) internally, the simplest reuse is: `buildProject` can call `checkSkew(config.mottoVersion, getOwnVersion())` directly at STEP 2 (config is already guaranteed valid at this point because the lint gate passed) rather than re-deriving it from `lintResult.warnings` — avoids coupling `buildProject`'s warning shape to `lintProject`'s internal variable naming. Add `warnings` to the final return object (`src/build.js` line ~207-213), same additive contract as `lint.js`.

**Never-throw regression guard reminder:** `plugin.json`'s `version` key (`src/build.js` line 199, `{ name: pluginName, version: config.version, description: config.description }`) MUST NOT be touched — `mottoVersion` never flows into `plugin.json`. This is an explicit regression the RESEARCH.md Runtime State Inventory calls out; add/keep a test asserting this.

---

### `bin/motto.js` (MODIFIED — controller/CLI presentation, request-response)

**Analog:** itself — `renderResult` (lines 193-206) is the single, exact insertion point.

**Current implementation to extend**:
```javascript
function renderResult(result, { format, quiet, successLine }) {
  if (format === 'json') {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else if (result.ok) {
    if (!quiet) {
      process.stdout.write(`${successLine}\n`);
    }
  } else {
    for (const e of result.errors) {
      process.stderr.write(`✗ ${e.skill}: ${e.message}\n`);
    }
  }
  if (!result.ok) process.exitCode = 1; // D2-11; process.exit() NOT used (Pitfall 7)
}
```
`format === 'json'` branch needs ZERO changes — `JSON.stringify(result)` already serializes `warnings` verbatim once `lintProject`/`buildProject` populate it (D-R2). For the text-mode branches, add warnings rendering INDEPENDENT of the `result.ok`/`quiet` branching structure — i.e., print `⚠` lines regardless of whether the `ok`/error branch fires, and regardless of `quiet` (quiet only suppresses the success line per the existing doc comment at lines 185-188). Concretely, insert a `warnings` loop that runs unconditionally before/after the existing if/else, mirroring the `✗ ${e.skill}: ${e.message}` error-line format but with `⚠` and to the same stderr stream:
```javascript
for (const w of result.warnings ?? []) {
  process.stderr.write(`⚠ ${w.skill}: ${w.message}\n`);
}
```
Keep `if (!result.ok) process.exitCode = 1;` completely unchanged — warnings must never affect exit code (VER-02).

---

## Shared Patterns

### Never-throw boundary (applies to ALL new/modified files)
**Source:** `src/config.js` lines 44-52 (defensive catch around `parseDocument`), `src/init.js` lines 94-104 (`resolveGitOwnerName`'s catch-all → placeholder fallback)
**Apply to:** `version.js`'s `getOwnVersion()` (catch-all → `null`), `config.js`'s new `mottoVersion` validation block (`typeof` guard before any `.trim()`/`.split()`), `lint.js`/`build.js`'s skew-check call sites (never call `checkSkew` with unguarded raw types)
```javascript
// src/init.js — the codebase's established "collapse everything to a safe
// default, never propagate" convention (Pattern 3 per its own doc comment)
function resolveGitOwnerName() {
  try {
    const name = execFileSync('git', ['config', 'user.name'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return name || 'Your Name';
  } catch {
    return 'Your Name';
  }
}
```

### Error/warning entry shape — `{ skill, message }` at orchestrator layer, `{ message }` at pure-validator layer
**Source:** `src/config.js` (bare `{ message }`) vs. `src/lint.js` `processConfig`'s lifting loop (adds `skill: 'motto.yaml'`)
**Apply to:** `config.js`'s new `mottoVersion` errors stay `{ message }`-only; `lint.js`/`build.js` lift them the same way existing config errors are lifted — no new shape invented.

### Additive result-shape extension without disturbing `ok`
**Source:** `src/lint.js` line 356 (`return { ok: errors.length === 0, errors, count: skillNames.length };`), `src/build.js` lines 207-213
**Apply to:** Both orchestrators gain `warnings: []` as a strictly additive field; `ok`'s computation (`errors.length === 0`) is never touched by warnings logic.

### `mkdtemp` fixture pattern for new integration tests
**Source:** `test/init.test.js` / `test/dogfood.test.js` (existing convention, confirmed in RESEARCH.md Sources)
**Apply to:** `test/lint.test.js`/`test/build.test.js` new missing-stamp / malformed-stamp / skew-direction / never-rewrite fixtures; `test/version.test.js`'s pure unit tests do NOT need `mkdtemp` (no fs mocking required for `parseVersion`/`checkSkew`, only `getOwnVersion()` reads the real `package.json`).
```javascript
const tempDir = await mkdtemp(join(tmpdir(), 'motto-lint-nostamp-'));
try {
  await scaffoldProject(tempDir, { name: 'no-stamp-proj' });
  // ... assertions
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
```

### Never hardcode version literals in tests
**Source:** `test/dogfood.test.js:151-152` (`assert.ok(manifest.version)`, not `assert.strictEqual(..., '0.0.2')`)
**Apply to:** `test/version.test.js`, `test/init.test.js` additions — read the live version via `getOwnVersion()` or a direct `package.json` read; use clearly-fake fixture strings (`'1.2.3'`/`'1.2.4'`) for comparator unit tests needing two distinct versions, never Motto's real current version string.

## No Analog Found

None — every file in this phase's scope has a strong, exact analog because the phase is additive work inside an already-mature, 5-milestone-old codebase with consistent conventions across every layer it touches (pure validator, fs orchestrator, CLI presentation, mkdtemp test fixture).

## Metadata

**Analog search scope:** `src/`, `bin/`, `test/` (entire repo — small codebase, exhaustive read of the 5 directly-affected source files plus targeted greps of `bin/motto.js` and `src/build.js`)
**Files scanned:** `src/config.js` (full), `src/init.js` (full), `src/lint.js` (full), `src/build.js` (targeted: lines 60-210), `bin/motto.js` (targeted: lines 160-230)
**Pattern extraction date:** 2026-07-06
