# Architecture Research: Version Awareness (v0.0.7)

**Domain:** Integrating version stamping + skew detection into Motto's existing CLI (plain ESM, never-throw pipelines)
**Researched:** 2026-07-06
**Confidence:** HIGH (grounded entirely in the actual v0.0.6 source — `bin/motto.js`, `src/config.js`, `src/init.js`, `src/lint.js`, `src/build.js`, `package.json`, `motto.yaml`)

This is a **subsequent-milestone integration** doc, not a greenfield architecture doc. It answers exactly the integration questions posed (where comparison lives, how skew flows through the result shape, where the tool reads its own version, what `init.js` needs, new vs modified components, build order). It supersedes the previous `ARCHITECTURE.md` (v0.0.6 CI/publish integration research), which is no longer current.

## Critical Finding First: `version` Is Already Taken

`motto.yaml`'s existing `version` field (`src/config.js:73-75`, `motto.yaml:2`) is the **user's project version** (e.g. `"0.1.0"`), consumed by `build.js:199` to stamp `plugin.json`'s `version` key. It has nothing to do with which Motto tool built the project.

The new "which Motto version scaffolded/built this" stamp **must be a new, differently-named field** — e.g. `mottoVersion` (camelCase, matches the `plugins.public`/`plugins.private` JS-side naming already in `config.js`). Never reuse or overload `version`. Colliding these two would silently corrupt `plugin.json` version stamping in `build.js:199` and break the CONF-01 required-field contract in `config.js`. This is the single highest-risk pitfall for this milestone and must be locked as a naming decision before any code is written.

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│ bin/motto.js  (CLI shell — parseArgs, dispatch, renderResult)         │
│                                                                        │
│  motto init  ──► src/init.js:scaffoldProject()                       │
│  motto lint  ──► src/lint.js:lintProject()   ──► renderResult()      │
│  motto build ──► src/build.js:buildProject() ──► renderResult()      │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │  NEW: src/version.js
                              │  - reads OWN tool version (package.json)
                              │  - pure comparison of two version strings
                              │  - shapes a skew warning descriptor
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ src/config.js  loadConfig(text)                                      │
│   — reads NEW `mottoVersion` field (optional; absence ≠ error,        │
│     mirrors the plugins.private pattern D-17)                        │
│                                                                        │
│ src/init.js  scaffoldProject()                                       │
│   — writes NEW `mottoVersion: "<tool's own version>"` line into       │
│     the motto.yaml template string                                   │
│                                                                        │
│ src/lint.js  lintProject()  /  src/build.js  buildProject()          │
│   — after config loads, call src/version.js's comparator             │
│   — skew is a WARNING (never-throw, never blocks lint/build)          │
│   — pushed into a NEW result.warnings[] array                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|-----------------|------------------|
| `src/version.js` | Pure functions: read tool's own version, compare two version strings, build a skew warning object. No fs I/O beyond one `readFile` of the tool's own `package.json`. Never throws. | **NEW** |
| `src/config.js` | Parse `mottoVersion` from `motto.yaml` as an optional field (no new required-field error). | **MODIFIED** (small, additive) |
| `src/init.js` | Inject the running tool's version into the scaffolded `motto.yaml` template as `mottoVersion:`. | **MODIFIED** (template string edit) |
| `src/lint.js` | Call the skew comparator once, after `processConfig`; push a warning (not an error) into a new `warnings[]` array on the result. | **MODIFIED** |
| `src/build.js` | Same skew check — build already re-reads config (`loadConfig` at `build.js:99`) after the lint gate; surface the same warning in its own result shape. | **MODIFIED** |
| `bin/motto.js` | `renderResult` must render `warnings[]` in both `text` and `json` modes without breaking the existing `{ok, errors}` JSON contract consumers may already parse. | **MODIFIED** (additive field, backward-compatible) |
| `package.json` | Already the source of truth for the tool's own version (`"version": "0.0.6"`). No change needed — just becomes a new *read* target. | **UNCHANGED** (read-only new consumer) |

## Where Version Comparison Lives: `src/version.js` (new, standalone module)

**Decision: a dedicated `src/version.js`, not inline in `config.js`, `lint.js`, or `build.js`.**

Rationale, grounded in the existing codebase's own conventions:

1. **Precedent for pure, single-purpose modules.** `src/schema.js` (validator, zero fs), `src/config.js` (validator, zero fs), `src/frontmatter.js` (parser) are all pure. `src/lint.js`/`src/build.js` are the fs-dependent orchestrators that *wire* pure modules together. Version comparison is a pure function of two strings (tool version, stamped project version) — it belongs in the pure-module tier, not baked into an orchestrator.

2. **Two distinct concerns must not be conflated in one file:**
   - **Reading the tool's own version** — this is the one part of the module that touches the filesystem/module graph (needs `package.json`, see next section). It is Motto-tool-identity, orthogonal to any project.
   - **Comparing two version strings and shaping a warning** — pure, testable with zero I/O, trivially unit-testable via `node --test` the same way `schema.test.js`/`config.test.js` already work.

   Splitting these into two exports of the same file (`getOwnVersion()` / `compareVersions(toolVersion, projectVersion)`) keeps the fs-touching surface to one function, matching the existing house style where pure logic and I/O are separated even within a single file (see `src/config.js`'s own doc comment: "This function performs NO filesystem I/O").

3. **Reused by multiple call sites** (`lint.js`, `build.js`, and potentially a future `--version` CLI flag) — a shared module avoids duplicating the comparison logic the way `NAME_KEBAB` is already shared from `schema.js` into `config.js` (`config.js:15`) rather than redefined.

4. **Not `config.js`:** `config.js`'s `loadConfig` is a pure YAML-text validator with a locked contract (`{ config, errors }`) proven across 4 milestones. Adding skew-detection there would require passing in the tool's own version as a new parameter, muddying its single responsibility (validate motto.yaml's shape) with a second one (compare against runtime state). Keep `config.js` parsing the new `mottoVersion` field as *data* only — comparison is a separate concern layered on top by the orchestrators.

5. **Not inline in `lint.js`/`build.js`:** both already have enough responsibility (lint = discovery + validation + fs checks across N skills; build = lint-gate + pack + plugin.json emit). Bolting version-string comparison logic directly into either would duplicate it in the other. A shared `src/version.js` is called identically from both, mirroring how both already independently call `loadConfig`.

## Where the Tool Reads Its Own Version

**Decision: read `package.json`'s `version` field via a relative path from `src/version.js`, resolved with `fileURLToPath(import.meta.url)` — the same ESM pattern the stack doc already prescribes (`path.dirname(fileURLToPath(import.meta.url))`), not `process.env.npm_package_version`.**

Two candidate mechanisms exist; only one is safe for this codebase:

| Mechanism | Works when installed via npm (global/local)? | Works when run via `node bin/motto.js` in dev? | Works when run via `npx`? | Verdict |
|---|---|---|---|---|
| `process.env.npm_package_version` | **No** — only set inside npm-lifecycle-script execution context (`npm run <script>`), NOT when the installed `motto` binary is invoked directly as a CLI by an end user | N/A (same issue) | **No** | Reject — confirmed absent from every existing `process.env` read in this codebase (grep found zero uses); this codebase deliberately avoids it |
| Read `package.json` next to `bin/motto.js` / `src/` via `readFile` + `JSON.parse`, resolved relative to the module's own file path | **Yes** — `package.json` ships in every npm install (it's the manifest itself; `package.json`'s own `files` allowlist doesn't even need to list it — npm always includes the manifest) | **Yes** | **Yes** — npx extracts the full package including `package.json` | **Use this** |

Implementation detail: from `src/version.js`, `package.json` is one directory up (`../package.json`), the same relative depth `src/config.js` uses to import `./schema.js`. Resolve it with:
```js
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getOwnVersion() {
  try {
    const text = await readFile(join(__dirname, '..', 'package.json'), 'utf8');
    return JSON.parse(text).version ?? null;
  } catch {
    return null; // never-throw — skew check becomes a silent no-op, not a crash
  }
}
```
This mirrors the existing never-throw pattern used everywhere else (`config.js`'s `safeToJS`, `init.js`'s `resolveGitOwnerName` "Pattern 3" — best-effort, collapse all failures to a safe fallback, never throw). `getOwnVersion()` returning `null` must be a valid, handled case: the skew comparator treats "can't determine own version" as "skip the check," not as an error.

**Testability:** because `getOwnVersion()` is `async` and isolated in its own file, tests can either (a) let it read the real `package.json` (simplest — it always exists in the repo under test) or (b) test the comparison logic (`compareVersions`) in complete isolation as a pure sync function taking two version strings directly, with zero fs mocking needed. (b) is the more valuable and larger test surface and should be the primary unit-test target, matching how `schema.test.js`/`config.test.js` test pure functions today.

## Data Flow Through the Existing `{errors, warnings}` Shape

### The result shape must grow, not change

Current results:
- `lintProject()` returns `{ ok, errors, count }` (`lint.js:356`)
- `buildProject()` returns `{ ok, outDir, errors, skillCount, bucketCount }` (`build.js:207-213`)

Both already have `--format json` consumers (`bin/motto.js:194-195`) that serialize the result object **verbatim** — any new field is automatically included in JSON output with zero renderResult changes required for the JSON path itself. This is the load-bearing reason skew must be a **new additive field**, not a repurposing of `errors`:

- **`errors` semantics are locked**: `errors.length > 0` implies `ok: false` and `process.exitCode = 1` (`renderResult`, `bin/motto.js:205`). A version skew is explicitly **not** a failure (never-throw directive in the milestone brief: "explicit, actionable, never-throw message"). Pushing skew into `errors` would flip `ok` to `false` and break exit-code 0 for every skewed-but-otherwise-valid project — unacceptable regression.
- **Add `warnings: Array<{skill: string, message: string}>`** to both `lintProject`/`buildProject` results, defaulting to `[]` when no skew (and for every other current warning-free path — today there are zero warnings anywhere in the codebase, so this is a wholly new concept). Reuse the exact `{skill, message}` shape already used for `errors` (`skill: 'motto.yaml'` label, mirroring how config errors are already labelled at `lint.js:59`) — zero new shape to learn, and existing error-rendering code (`renderResult`'s `for (const e of result.errors)` loop) can be trivially mirrored for warnings without inventing new conventions.

### Text-mode rendering (`bin/motto.js:193-206`)

`renderResult` currently only prints `✗ <skill>: <message>` lines for `errors`, and only when `!result.ok`. Warnings must print **regardless of `ok`** — a version skew coexists with a clean lint pass. Required addition to `renderResult`:

```js
function renderResult(result, { format, quiet, successLine }) {
  if (format === 'json') {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    if (result.ok) {
      if (!quiet) process.stdout.write(`${successLine}\n`);
    } else {
      for (const e of result.errors) {
        process.stderr.write(`✗ ${e.skill}: ${e.message}\n`);
      }
    }
    // NEW: warnings print in text mode independent of ok/quiet — skew is
    // informational, not a success/failure signal, so it should not be
    // silenced by --quiet (which only suppresses the SUCCESS line, D-06).
    for (const w of result.warnings ?? []) {
      process.stderr.write(`⚠ ${w.skill}: ${w.message}\n`);
    }
  }
  if (!result.ok) process.exitCode = 1;
}
```

Design decisions this forces (flag to roadmapper/planner for explicit sign-off, not silently assumed here):
- **Stream:** stderr (like errors) or stdout? Recommend **stderr** — consistent with the existing convention that anything not the bare success line goes to stderr (D-05/D-07 in the current doc comments), and keeps stdout `--quiet`-clean for scripting/grep use cases.
- **Interaction with `--quiet`:** recommend warnings are **not** suppressed by `--quiet` (quiet only suppresses the success *line*, per the current doc comment at `bin/motto.js:29-30` — "suppresses the ✓ … success/progress line"). A silent skew is the exact failure mode this milestone exists to prevent.
- **JSON mode:** no special-casing needed at all — `JSON.stringify(result)` already includes `warnings` for free the moment the orchestrators populate it. This is the strongest architectural argument for making `warnings[]` a new top-level result field rather than a side-channel.

### CLI contract compatibility

- Existing JSON consumers (scripts parsing `{ok, errors, count}`) see a **new key added**, which is backward-compatible for any reasonable consumer (ignoring unknown keys). No existing key changes shape or meaning.
- Existing text-mode consumers see a **new possible line** (`⚠ …`) that did not print before. This is technically a behavior change but an additive, opt-in-relevant one (only fires when skew is detected) — acceptable per the "no breaking hard-break without upgrade path" standing constraint added this milestone, since it's new information surfacing, not a removed/renamed contract.
- `count`/`skillCount`/`bucketCount`/`outDir` are untouched.

## What `init.js` Needs

Two concrete, additive changes to `src/init.js`:

1. **Template string edit** — the inline `motto.yaml` template at `init.js:147-150`:
   ```js
   await writeFile(
     join(targetDir, 'motto.yaml'),
     `name: ${name}\nversion: "0.1.0"\ndescription: ${SCAFFOLD_DESCRIPTION}\nplugins:\n  public: ${name}\n`,
   );
   ```
   needs a new `mottoVersion: "<tool version>"` line inserted. Given the naming collision risk flagged above, and that this template already interpolates `name` bare (Pitfall 2 in the existing doc comments — "name and plugins.public derive from the SAME validated `name` value"), the new field must be visually and semantically distinct from `version: "0.1.0"` in the emitted YAML — e.g.:
   ```yaml
   name: my-project
   version: "0.1.0"
   mottoVersion: "0.0.7"
   description: ...
   plugins:
     public: my-project
   ```

2. **Version injection at scaffold time** — `scaffoldProject()` needs the tool's own version available *before* it builds the template string, so it must `import` (or call) `getOwnVersion()` from the new `src/version.js`, exactly like it already imports `NAME_KEBAB` from `src/schema.js` (`init.js:30`). Because `getOwnVersion()` is `async`, this is a natural fit inside the existing `async function scaffoldProject(...)` — no new async boundary needed. If `getOwnVersion()` returns `null` (package.json unreadable — extremely unlikely but must be handled per never-throw), the scaffold should still proceed: omit `mottoVersion` from the written file rather than writing a sentinel — recommend **omitting the line entirely** to keep the same "absence is not an error" pattern config.js already uses for `plugins.private` (D-17). This also means `config.js`'s new `mottoVersion` parsing must treat absence as valid (a pre-v0.0.7-scaffolded project has no such field at all and must not fail lint because of it — this is exactly the upgrade-path constraint the milestone locks in PROJECT.md: "every structure/schema change... ships with a documented upgrade path").

No change needed to `writeScaffold`'s external contract shape — its internal options object (`{name, owner}` → `{name, owner, mottoVersion}`) is a private helper, non-breaking since it's not exported.

## New vs Modified Components — Summary Table

| File | New / Modified | Change |
|---|---|---|
| `src/version.js` | **NEW** | `getOwnVersion()` (reads own `package.json`, never-throw, returns `string\|null`); `compareVersions(toolVersion, projectVersion)` or `checkSkew(toolVersion, projectVersion)` (pure, sync, returns `null` when equal/no-project-version, else a `{skill, message}`-shaped warning descriptor) |
| `src/config.js` | **MODIFIED** (small) | Parse optional `mottoVersion` field from YAML into `config.mottoVersion`; absence is NOT an error (mirrors `plugins.private`, D-17 pattern) |
| `src/init.js` | **MODIFIED** | Import `getOwnVersion` from `src/version.js`; call it in `scaffoldProject` before building the template string; add `mottoVersion: "<value>"` line to the `motto.yaml` template (omit line if `getOwnVersion()` returns `null`) |
| `src/lint.js` | **MODIFIED** | After `processConfig` succeeds (config has no fatal errors), call the skew comparator with `config.mottoVersion` vs `getOwnVersion()`; push result (if non-null) into a new `warnings[]` array; `lintProject` return shape gains `warnings` |
| `src/build.js` | **MODIFIED** | Same skew check, reusing the config already re-read at `build.js:99`; `buildProject` return shape gains `warnings`. Skew must NOT block the build (never-throw, informational only) — the pre-pack error checks (`buildErrors`) stay error-only; skew is orthogonal |
| `bin/motto.js` | **MODIFIED** | `renderResult` prints `warnings[]` as `⚠ <skill>: <message>` lines to stderr, independent of `ok`/`quiet`; JSON mode needs zero code change (verbatim serialization already includes new fields) |
| `package.json` | **UNCHANGED** | Already the read target; no write/schema change |
| `motto.yaml` (this repo's own, dogfooded) | **MODIFIED** (data, not code) | Must gain its own `mottoVersion: "0.0.7"` line once this milestone ships, so Motto's own dogfood project reflects the new field — likely a phase-close housekeeping step, not a code change |

## Suggested Build Order

Dependency-ordered, each step buildable/testable independently before the next depends on it:

1. **`src/version.js` first, standalone, fully unit-tested.** Zero dependents yet — pure module, easiest to get right in isolation (`getOwnVersion()` reading the real `package.json` at test time; `compareVersions`/`checkSkew` tested with hand-crafted string pairs, zero fs mocking needed for the comparison half). This gives every downstream step a stable, tested dependency to import.

2. **`src/config.js` — add optional `mottoVersion` parsing.** Small, additive, testable in isolation the same way `plugins.private`'s optionality is already tested (`config.test.js`). No dependency on `version.js` yet — `config.js` just needs to expose the raw string field; the *comparison* happens one layer up in lint/build, not inside `loadConfig` itself (keeps `loadConfig`'s pure-validator contract unchanged in shape, only adds a passthrough field).

3. **`src/init.js` — wire `getOwnVersion()` into the scaffold template.** Depends on step 1 (`version.js`) existing. Testable against `init.test.js`'s existing scaffold-content assertions — add an assertion that the written `motto.yaml` contains a `mottoVersion:` line matching the running tool's `package.json` version.

4. **`src/lint.js` — wire the skew check + `warnings[]` into `lintProject`.** Depends on steps 1 and 2 (needs `config.mottoVersion` parsed, and `version.js`'s comparator). This is the first orchestrator-level change and the first place `warnings[]` appears in a real result shape — get this right before duplicating the pattern into `build.js`.

5. **`src/build.js` — same skew check + `warnings[]` into `buildProject`.** Depends on step 4's pattern being proven (literally reuse the same call shape); build already re-reads config after its lint gate, so this is a near-mechanical repeat of step 4's wiring, not new design.

6. **`bin/motto.js` — `renderResult` warnings rendering.** Depends on steps 4 and 5 existing (needs real `warnings[]`-bearing results to render). Last, because it's the presentation layer and easiest to get wrong if the underlying data shape isn't finalized yet — matches this codebase's own layering discipline (pure validators → fs orchestrators → CLI shell, in that dependency order, as seen in the existing module docstrings).

7. **Housekeeping: stamp this repo's own `motto.yaml` with `mottoVersion`.** Do this last, at/near milestone close (mirrors how `package.json`'s `version` field itself is bumped via the existing `npm version`-triggered `motto.yaml`-sync script, `package.json:34`) — otherwise Motto's own dogfood lint would start emitting a skew warning against itself mid-milestone, which is confusing noise while steps 1-6 are still in flight.

**Not in this build order (explicitly deferred per the milestone brief):** the upgrade *command* itself. This build order only produces detection (stamping + skew warning), not remediation tooling — consistent with "YAGNI until the first real schema break demands it."

## Anti-Patterns to Avoid

### Anti-Pattern 1: Comparing versions as plain strings with `!==`

**What people do:** `if (config.mottoVersion !== ownVersion) warn(...)`.
**Why it's wrong:** treats `"0.0.7"` vs `"0.0.7-rc.1"` or absent/malformed strings inconsistently; gives no signal about *direction* (project older vs project newer than tool) or *severity* (patch bump vs major bump), which the milestone brief calls for ("explicit, actionable" message).
**Instead:** parse both as `major.minor.patch`-shaped tuples (a tiny hand-rolled split is enough — Motto has zero other deps beyond `yaml`, adding a `semver` package for a 3-field integer compare would violate the project's own "single runtime dependency" constraint). Message should say *which side is ahead* (e.g. "project was scaffolded with motto 0.0.5; you are running 0.0.7 — see upgrade docs") not just "mismatch."

### Anti-Pattern 2: Making skew a hard lint error

**What people do:** instinctively push skew into the same `errors[]` array since it's "wrong."
**Why it's wrong:** directly contradicts the milestone's explicit "never-throw" directive and would break exit-code-0 for every existing project the moment its own tool gets upgraded — a self-inflicted regression on the exact npm-publish cadence this project just spent v0.0.6 automating.
**Instead:** always a `warnings[]` entry; `ok`/exit code stay governed by `errors[]` alone.

### Anti-Pattern 3: Reusing the `version` field name for the tool-stamp

**What people do:** naming fatigue — "just add motto version next to version."
**Why it's wrong:** `version` is already semantically the *project's* version and flows directly into `plugin.json`'s `version` key at `build.js:199`. Overloading it would either silently corrupt that or require a breaking migration of the existing field's meaning across all installed projects (magma included) — precisely the kind of hard break the milestone's standing constraint exists to prevent.
**Instead:** a distinctly named field (`mottoVersion` recommended, camelCase to match the `plugins.public`/`plugins.private` JS-side field access conventions already in `config.js`).

## Integration Points (file:line references)

| Integration point | Location | Nature |
|---|---|---|
| `motto.yaml`'s `version` field already means project version | `src/config.js:73-75`, `motto.yaml:2` | Naming collision risk — must NOT be reused |
| `plugin.json` version stamp consumes `config.version` | `src/build.js:199` | Confirms `version` is load-bearing elsewhere; do not touch |
| `plugins.private` optional-field pattern (absence ≠ error) | `src/config.js:96-102` | Template for how `mottoVersion` absence must be handled |
| `NAME_KEBAB` shared from `schema.js`, re-exported by `config.js` | `src/config.js:13-19` | Template for how `version.js` should be imported into `config.js`/`init.js`/`lint.js`/`build.js` (single source, no redefinition) |
| Inline `motto.yaml` scaffold template | `src/init.js:147-150` | Needs the new `mottoVersion:` line |
| `resolveGitOwnerName` best-effort never-throw pattern | `src/init.js:94-104` | Template for `getOwnVersion()`'s never-throw fallback shape |
| `processConfig` — config errors labelled `'motto.yaml'`, run first (D2-10) | `src/lint.js:43-61` | Skew check should run immediately after this, still labelled `'motto.yaml'` |
| `lintProject` return shape | `src/lint.js:320-357` (`{ok, errors, count}`) | Gains `warnings: []` |
| `buildProject`'s config re-read after lint gate | `src/build.js:89-99` | Second, independent site needing the same skew check |
| `buildProject` return shape | `src/build.js:207-213` (`{ok, outDir, errors, skillCount, bucketCount}`) | Gains `warnings: []` |
| `renderResult` — errors-only rendering today | `bin/motto.js:193-206` | Needs a warnings-rendering loop, independent of `ok`/`quiet` |
| No existing `process.env.npm_package_version` usage anywhere | grep-verified across `bin/`, `src/`, `scripts/` | Confirms this mechanism must not be introduced; use `package.json` read instead |
| `package.json`'s own `version` field | `package.json:3` | The tool's own version, read target for `getOwnVersion()` |

## Sources

- `/Users/jeremie/Projects/motto/.planning/PROJECT.md` — milestone goal, target features, standing upgrade-path constraint (verified 2026-07-06; HIGH confidence, primary source)
- `/Users/jeremie/Projects/motto/bin/motto.js` — CLI dispatch, `renderResult`, JSON/text contract (lines 193-206, 254-397; verified 2026-07-06; HIGH)
- `/Users/jeremie/Projects/motto/src/config.js` — `loadConfig`, required/optional field pattern (`plugins.private` D-17, lines 96-102; verified 2026-07-06; HIGH)
- `/Users/jeremie/Projects/motto/src/init.js` — `scaffoldProject`, inline `motto.yaml` template (lines 147-150; verified 2026-07-06; HIGH)
- `/Users/jeremie/Projects/motto/src/lint.js` — `lintProject`, `processConfig`, result shape (lines 320-357; verified 2026-07-06; HIGH)
- `/Users/jeremie/Projects/motto/src/build.js` — `buildProject`, config re-read, result shape (lines 89-214; verified 2026-07-06; HIGH)
- `/Users/jeremie/Projects/motto/package.json` — tool's own version field, no existing `process.env.npm_package_version` usage anywhere in the codebase (grep-verified; HIGH)
- `/Users/jeremie/Projects/motto/motto.yaml` — confirms `version` field already means project version, not tool version (verified 2026-07-06; HIGH)

---
*Architecture research for: Motto v0.0.7 Version Awareness milestone*
*Researched: 2026-07-06*
