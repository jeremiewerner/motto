# Phase 23: Version Stamping & Skew Detection - Research

**Researched:** 2026-07-06
**Domain:** Node.js CLI — retrofitting a version stamp + skew-detection advisory onto an already-shipped, dogfooded CLI (Motto)
**Confidence:** HIGH

## Summary

This phase is a small, mechanically well-bounded addition to an already-mature codebase. The milestone-level research (`.planning/research/*.md`) already did the heavy lifting — stack, architecture, pitfalls, and prior-art are all HIGH confidence and require no new investigation. This phase-level research grounds those findings against the *exact* current source (re-verified 2026-07-06, all line numbers current) and resolves the four items CONTEXT.md left to Claude's discretion: warning channel/result shape, malformed-stamp severity/location, exact comparison semantics + message wording, and dogfood-stamping sequencing.

**Primary recommendation:** Add a new pure module `src/version.js` (`getOwnVersion()` + `parseVersion()` + `checkSkew()`), thread a new optional `mottoVersion` passthrough field through `config.js`, stamp it at `init.js` scaffold time, and check it as a `warnings[]`-array addition to `lintProject`/`buildProject` results — rendered by `bin/motto.js`'s `renderResult` as `⚠` lines to stderr, independent of `ok`/`quiet`. Malformed stamps become `errors[]` entries labelled `'motto.yaml'` (config.js's own validation layer), not warnings — this is the one point where this phase's research sharpens milestone research's more provisional framing (see Decision D-R1 below). Zero new dependencies.

**One correction to milestone research:** `package.json`'s `version` field is **still `"0.0.6"`** as of this research date — the v0.0.7 bump has not happened yet (it happens at ship time via the existing `npm version` lifecycle script, which also syncs `motto.yaml`). All code and tests in this phase must read the running tool's version live (via `getOwnVersion()` / `package.json` read) and must never assert a literal `"0.0.6"` or `"0.0.7"` string (Pitfall 6, confirmed still open — the version literal has not yet leaked into any test).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read own tool version | Backend/CLI (pure module) | — | `src/version.js`'s `getOwnVersion()` reads `package.json` via `fs.readFileSync`; no I/O boundary beyond the CLI process itself |
| Parse/validate stamp value shape | Backend/CLI (pure validator) | — | Belongs in `config.js` alongside existing required/optional-field checks (mirrors `plugins.private` D-17 pattern) |
| Compare two versions / compute skew direction | Backend/CLI (pure module) | — | `src/version.js`'s `checkSkew()`; zero fs I/O, testable with plain string fixtures |
| Write the stamp | Backend/CLI (orchestrator) | — | `src/init.js`'s `scaffoldProject`, at scaffold-template-build time only |
| Surface skew as advisory | Backend/CLI (orchestrator + presentation) | — | `src/lint.js`/`src/build.js` populate `warnings[]`; `bin/motto.js`'s `renderResult` prints it |

This is a single-tier CLI tool (no browser/frontend-server split exists in this project) — the map above documents module-internal layering (pure validators vs. fs orchestrators vs. CLI presentation shell) rather than a multi-tier web architecture. This mirrors the codebase's own existing 3-layer discipline (`schema.js`/`config.js` pure → `lint.js`/`build.js` fs orchestrators → `bin/motto.js` CLI shell).

## Package Legitimacy Audit

**Not applicable — zero new packages this phase.** REQUIREMENTS.md's Out of Scope table explicitly excludes the `semver` npm package (D-06 in CONTEXT.md: "Zero new dependencies — hand-rolled ~10-line parse/compare, no `semver` package"). No `npm install` runs in this phase. Verified against `package.json`: current dependency is `yaml@^2.9.0` only (unchanged), plus dev dependency `husky@^9.1.7` (unchanged).

## Standard Stack

### Core

No new runtime dependencies. All capabilities covered by Node stdlib already in use across `src/`:

| Capability | Mechanism | Why Standard (for this codebase) |
|------------|-----------|-----------------------------------|
| Read own `package.json` version | `fs.readFileSync(new URL('../package.json', import.meta.url)) + JSON.parse` | Matches `src/config.js`'s own plain-fs-read style (no indirection layer); zero-warning on all Node ≥20 patch versions (unlike `import ... with { type: 'json' }`, which emits `ExperimentalWarning` on Node 20.0.0–20.18.2 — a real subset of the project's `>=20` engines floor) [CITED: .planning/research/STACK.md v0.0.7 addendum, verified against official Node.js `esm.html` docs history table] |
| Parse `X.Y.Z` version strings | Hand-rolled regex `^v?(\d+)\.(\d+)\.(\d+)` | Motto has shipped only plain 3-segment releases (0.0.1–0.0.6); a `semver` package solves range-satisfaction/prerelease-precedence problems this milestone doesn't have [VERIFIED: npm registry — `npm view semver version` not run since package is explicitly rejected, but current `package.json`'s single dependency `yaml` confirmed via direct file read] |
| Compare two parsed versions | Numeric major/minor/patch tuple comparison, `Array.prototype.sort`-comparator semantics (-1/0/1) | Prior art: npm's own `lockfileVersion` mismatch check is plain integer comparison, not a semver-range check, even inside a tool that depends on `semver` for its actual job [CITED: .planning/research/STACK.md] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs/promises` (`readFile`) | stdlib | Async read of `motto.yaml` in `lint.js`/`build.js` orchestrators | Already in use — no new import pattern needed |
| `node:fs` (`readFileSync`) | stdlib | Sync read of Motto's own `package.json` in the new `src/version.js` | New usage, but same stdlib module family already imported elsewhere in `src/` |
| `node:url` (`fileURLToPath` or `new URL(...)`) | stdlib | Resolve `package.json`'s path relative to `src/version.js`'s own module location | Matches existing ESM path-resolution pattern already used in this codebase's ESM modules |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled regex comparator | `semver` npm package | Solves range/prerelease problems Motto doesn't have; violates the standing single-runtime-dependency (`yaml`) constraint for a ~10-line problem |
| `fs.readFileSync` + `JSON.parse` | `import pkg from '../package.json' with { type: 'json' }` | Not stable/unflagged until Node ≥20.18.3/22.12.0/23.1.0 — Motto's `engines: >=20` floor includes the warning-emitting sub-range (20.0.0–20.18.2); would regress the clean stdout/stderr contract on every invocation for those users |
| `fs.readFileSync` + `JSON.parse` | `process.env.npm_package_version` | Only populated inside an npm-lifecycle-script execution context — absent when the installed `motto` binary or `npx motto` is invoked directly, which is the normal CLI usage this feature must work under |

**Installation:** none — zero new packages.

**Version verification:** `package.json` read directly confirms current version `"0.0.6"` and dependency `yaml@^2.9.0` (only runtime dep). No package installs required or recommended for this phase.

## Architecture Patterns

### System Architecture Diagram

```
motto init [name]
    │
    ▼
scaffoldProject(targetDir, {name, force})   [src/init.js]
    │  calls getOwnVersion() from src/version.js (NEW)
    │  before building the motto.yaml template string
    ▼
writeScaffold()                              — writes motto.yaml with
                                                mottoVersion: "<tool's own version>"
                                                (omitted entirely if getOwnVersion()
                                                 returns null — never-throw fallback)

motto lint [path]  /  motto build [path]
    │
    ▼
lintProject(projectRoot)  /  buildProject(projectRoot)
    │
    ▼
processConfig() → readFile('motto.yaml') → loadConfig(text)  [src/config.js]
    │  loadConfig parses config.mottoVersion as an OPTIONAL passthrough field
    │  (absence is NOT an error — mirrors plugins.private/D-17)
    │  MALFORMED mottoVersion (non-string, empty, garbage) → pushed to
    │  errors[] (labelled 'motto.yaml'), same aggregation point as
    │  missing name/version/description — NOT a warning (see D-R1 below)
    ▼
checkSkew(config.mottoVersion, getOwnVersion())   [src/version.js, NEW]
    │  called ONLY when config.mottoVersion parsed cleanly as a valid
    │  version string (no error already reported for it)
    │  returns null (no skew / no stamp / can't determine own version)
    │  or a {skill: 'motto.yaml', message} warning descriptor
    ▼
result.warnings[] populated (NEW array on lintProject/buildProject
    return shape — additive, does not affect result.ok or exit code)
    ▼
bin/motto.js renderResult()
    │  text mode: prints "⚠ <skill>: <message>" to stderr,
    │             independent of ok/quiet (skew is informational,
    │             not a success/failure signal)
    │  json mode: warnings[] is already included — JSON.stringify(result)
    │             serializes the whole object verbatim, zero code change
```

### Recommended Project Structure

```
src/
├── version.js       # NEW — getOwnVersion(), parseVersion(), checkSkew() — pure + one fs read
├── config.js        # MODIFIED — parse optional config.mottoVersion; malformed → errors[]
├── init.js          # MODIFIED — import getOwnVersion; add mottoVersion: line to template
├── lint.js           # MODIFIED — call checkSkew after processConfig; push to warnings[]
├── build.js          # MODIFIED — same skew check, reusing config re-read at STEP 2
bin/
└── motto.js          # MODIFIED — renderResult prints warnings[] as "⚠ ..." to stderr
test/
├── version.test.js   # NEW — pure unit tests for parseVersion/checkSkew (no fs mocking needed
│                     #        for the comparison half; getOwnVersion() reads real package.json)
├── config.test.js    # MODIFIED — add mottoVersion optionality + malformed-shape cases
├── init.test.js      # MODIFIED — assert motto.yaml contains mottoVersion: matching live pkg version
├── lint.test.js       # MODIFIED — warnings[] presence/absence fixtures (missing stamp, skewed, malformed)
├── build.test.js      # MODIFIED — same skew fixtures mirrored for buildProject
├── cli.test.js        # MODIFIED — spawned-CLI assertion that "⚠" lines print to stderr, ok unaffected
└── dogfood.test.js    # MODIFIED (maybe) — see Dogfood Stamping Decision below
```

### Pattern 1: Pure module split — I/O touch vs. pure comparison

**What:** `src/version.js` exports two categories of function: one function that touches the filesystem (`getOwnVersion()`, reads `package.json`) and one/two pure functions that operate only on strings (`parseVersion(v)`, `checkSkew(stamped, tool)`).
**When to use:** Any time a new capability needs both "read some runtime fact" and "make a decision from two strings" — keep them as separate exports of the same file so the decision logic is trivially unit-testable with zero fs mocking.
**Example:**
```js
// src/version.js — mirrors src/config.js's own doc-comment convention
// ("This function performs NO filesystem I/O")
import { readFileSync } from 'node:fs';

let cached;

/**
 * Read Motto's own package.json version. Never throws: any read/parse
 * failure yields null; callers treat null as "skew check unavailable."
 * @returns {string|null}
 */
export function getOwnVersion() {
  if (cached !== undefined) return cached;
  try {
    const url = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(url, 'utf8'));
    cached = typeof pkg.version === 'string' ? pkg.version : null;
  } catch {
    cached = null;
  }
  return cached;
}

const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)/;

/**
 * Parse a version-like value into numeric parts. Never throws. Returns
 * null for anything that isn't a string matching a leading X.Y.Z shape —
 * including non-string types, which happens whenever motto.yaml predates
 * stamping or was hand-edited into garbage.
 * @param {unknown} v
 * @returns {{major:number, minor:number, patch:number}|null}
 */
export function parseVersion(v) {
  if (typeof v !== 'string') return null;
  const m = VERSION_RE.exec(v.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Compare two parsed versions. -1 = a<b, 0 = a==b, 1 = a>b.
 */
function compareParsed(a, b) {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * Compute a skew warning between a project's stamped mottoVersion and the
 * running tool's own version. Returns null when there's nothing to warn
 * about: no stamp, unparsable stamp (already reported elsewhere as an
 * error — see config.js), can't determine own version, or versions equal.
 *
 * @param {string|undefined} stampedVersion - config.mottoVersion (already
 *   confirmed to be a valid parseable string by the caller — see D-R1)
 * @param {string|null} toolVersion - getOwnVersion()'s result
 * @returns {{skill: string, message: string}|null}
 */
export function checkSkew(stampedVersion, toolVersion) {
  const stamped = parseVersion(stampedVersion);
  const tool = parseVersion(toolVersion);
  if (!stamped || !tool) return null; // nothing to compare — never an error here
  const cmp = compareParsed(stamped, tool);
  if (cmp === 0) return null;
  if (cmp < 0) {
    return {
      skill: 'motto.yaml',
      message: `project was scaffolded with motto ${stampedVersion}; you are running ${toolVersion} — check the upgrade ledger for changes since ${stampedVersion}`,
    };
  }
  return {
    skill: 'motto.yaml',
    message: `project was scaffolded with motto ${stampedVersion}, newer than your running ${toolVersion} — upgrade motto`,
  };
}
```

### Pattern 2: Optional passthrough field in `config.js` (mirrors `plugins.private`)

**What:** `mottoVersion` is parsed from YAML into `config.mottoVersion` with zero required-field enforcement — absence is valid, matching the exact `plugins.private` optionality pattern (D-17) already proven across 4 milestones.
**When to use:** Any new `motto.yaml` field whose absence must remain non-fatal for pre-existing projects.
**Example:**
```js
// src/config.js — inside loadConfig, alongside the existing required-field block
// mottoVersion is OPTIONAL (VER-04/D-04) — its ABSENCE is never an error,
// mirroring plugins.private (CONF-03, D-17). Presence is validated for
// SHAPE only (must be a string) — malformed values are a clean error entry,
// never a throw (VER-05).
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
Note: this requires `config.js` to import `parseVersion` from the new `src/version.js` — a new import edge, analogous to how `config.js` already imports `NAME_KEBAB` from `schema.js` (single-source-of-truth pattern, `config.js:15`).

### Pattern 3: Additive `warnings[]` array on existing result shapes

**What:** `lintProject`/`buildProject` gain a new `warnings: Array<{skill, message}>` field alongside the existing `errors[]`, defaulting to `[]`. `result.ok` continues to be governed by `errors.length === 0` alone.
**When to use:** Any advisory-only finding that must never affect exit code — this is the mechanism VER-02 requires ("exit code and `ok` untouched").
**Example:**
```js
// src/lint.js — after processConfig(), before shared-refs scan
const warnings = [];
if (configErrorsAreEmpty(errors)) {  // only check skew if mottoVersion itself parsed cleanly
  const skew = checkSkew(config.mottoVersion, getOwnVersion());
  if (skew) warnings.push(skew);
}
// ...
return { ok: errors.length === 0, errors, warnings, count: skillNames.length };
```

### Anti-Patterns to Avoid

- **Comparing versions as plain strings with `!==`:** gives no signal about direction or severity, and mishandles absent/malformed values inconsistently. Always parse to `{major,minor,patch}` tuples first.
- **Making skew a hard lint error:** directly contradicts VER-02's "never-throw... exit code and `ok` stay unchanged." Skew belongs in `warnings[]`, never `errors[]`.
- **Reusing the `version` field name for the tool-stamp:** `version` already means the *project's* version and flows into `plugin.json`'s `version` key (`build.js:199`). The new field must be distinctly named (`mottoVersion`, camelCase, matching `plugins.public`/`plugins.private` JS-side naming conventions already in `config.js`).
- **Treating a missing stamp as an error:** every pre-v0.0.7 project (Motto's own tree pre-stamping, magma) has no `mottoVersion` field at all. This must be the "unknown, assume compatible" case (VER-04) — zero warning, zero error, zero crash.
- **Checking skew before confirming the stamp parsed as a valid version:** if `config.mottoVersion` is malformed (a number, an object, `null`, empty string, garbage string), that is reported once as an `errors[]` entry by `config.js`'s own validation (D-R1). `checkSkew` must not ALSO try to interpret it and potentially emit a second, confusing warning — `parseVersion` returning `null` for the malformed value naturally suppresses this (see Pattern 1's `if (!stamped || !tool) return null`), but the calling code in `lint.js`/`build.js` should gate the skew check on "no error already reported for mottoVersion" to avoid any risk of double-reporting the same malformed value as both an error and a (nonsensical) warning.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Semver range/prerelease comparison | A general-purpose semver library from scratch | The narrow 3-segment regex comparator above (already provided; no library needed) | Motto has never shipped a prerelease/build-metadata tag; scope narrowly and reject (return `null`, not attempt-and-guess) anything with a `-`/`+` suffix or non-3-segment count |
| JSON schema validation for `mottoVersion` | `zod`/`ajv`/`joi` | Hand-written `typeof === 'string'` + regex check, same house style as every other `config.js` field | Already the established project convention (see `.claude/CLAUDE.md` "What NOT to Use" table); a 1-field optional-string validator needs no schema framework |
| Own-version detection at runtime | `process.env.npm_package_version` or a network registry check | `fs.readFileSync` of the tool's own `package.json`, resolved via `import.meta.url` | `npm_package_version` is only set inside npm lifecycle scripts, not for direct/npx CLI invocation; a network check is explicitly out of scope (this is local stamp-vs-running-tool comparison only, not "is there a newer release on npm") |

**Key insight:** this phase's entire surface area is ~50-80 lines of new/modified code across 5 files. The temptation to over-engineer (a `check-version` subcommand, severity tiers, JSON schema field) is explicitly foreclosed by REQUIREMENTS.md's Out of Scope table — resist it.

## Runtime State Inventory

> This phase is a schema *addition* (new optional field), not a rename/refactor/migration of existing string state — the Runtime State Inventory trigger (rename/rebrand/refactor/string-replacement/migration) does not apply. Included here anyway per the "state explicitly" requirement, scoped to the question that DOES apply: what pre-existing state will this new field's presence-check interact with?

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Motto's own `motto.yaml` (this repo) has no `mottoVersion` field yet. Magma (external consumer project, referenced in CONTEXT.md/PITFALLS.md) also has no `mottoVersion` field — not directly inspectable from this repo, but confirmed by the milestone brief as a real pre-v0.0.7 project. | Code edit only (config.js optionality) — no data migration performed this phase; the "unstamped" state is permanently supported, not backfilled. Dogfood-stamping this repo's own `motto.yaml` is a separate, explicit decision (see below), not required for VER-01..06 correctness. |
| Live service config | None — this phase touches only `motto.yaml` (a git-tracked file) and `package.json` (already git-tracked, unchanged). No external service holds `mottoVersion` state. | None |
| OS-registered state | None — no OS-level task/service registration references version stamps. | None |
| Secrets/env vars | None — no secret or env var references `mottoVersion` or the tool version by name. | None |
| Build artifacts | None new — `dist/public/.claude-plugin/plugin.json` and `dist/private/.claude-plugin/plugin.json` continue to source their `version` key from `config.version` (`build.js:199`), NOT from the new `mottoVersion` field. Verified: `mottoVersion` must never flow into `plugin.json`'s `version` key — that would silently conflate "which Motto version scaffolded this" with "this plugin's own release version," corrupting the existing CONF-01 contract. | None — confirm via test that `plugin.json`'s `version` key is unaffected by the new field (regression guard). |

## Common Pitfalls

(Full detail in `.planning/research/PITFALLS.md`, milestone-level, HIGH relevance to this phase. Summarized + phase-specific sharpening below.)

### Pitfall 1: The bootstrap problem — missing stamp treated as an error

**What goes wrong:** Every existing project (Motto's own tree until this phase, magma) has zero `mottoVersion` field. If any code path treats absence as invalid, every existing consumer breaks the moment they upgrade.
**Why it happens:** Development naturally tests the happy path (freshly-stamped project) first; the "this field has existed for zero seconds in the entire installed base" angle is easy to omit.
**How to avoid:** `config.js`'s check must be `if (config.mottoVersion !== undefined) { ... }` — absence skips the block entirely, never enters an error branch. Write the missing-stamp fixture test FIRST, before any happy-path skew test.
**Warning signs:** Any `if (!config.mottoVersion) errors.push(...)` (falsy-check, not `undefined`-check) would incorrectly treat absence the same as an explicit empty string — but empty string IS a real malformed-value case (VER-05) that must produce a different error than "field absent." Use `!== undefined` for the presence gate, then a separate check for empty-string/wrong-type within the presence branch.

### Pitfall 2: Malformed stamp values crash the never-throw boundary

**What goes wrong:** `mottoVersion: 7` parses as a YAML number; `mottoVersion: [0,0,7]` as an array; `mottoVersion:` (bare) as `null`. Any code that assumes `.split`/`.trim`/`.match` works on the raw value without a `typeof` guard throws a `TypeError`.
**Why it happens:** Well-formed test fixtures written during development never exercise the "hand-edited garbage" cases a real user's YAML can produce.
**How to avoid:** Both `config.js`'s validation AND `version.js`'s `parseVersion()` independently type-guard (`typeof v !== 'string'` returns early/reports an error). Enumerate the exact adversarial matrix named in VER-05 and the roadmap success criterion 4: number, array, object, boolean, null, empty string, garbage string (e.g. `"latest"`, `"v"`, `"0.0"`, `"0.0.7.1"`). All seven-plus shapes must produce a clean `errors[]` entry, never a throw.
**Warning signs:** Any `.split('.')` or regex `.exec()` call on `config.mottoVersion` without a preceding `typeof === 'string'` check.

### Pitfall 3: Skew message tells the user to move in the wrong direction

**What goes wrong:** A single generic "version mismatch" string sends the user toward the wrong remedy in the "project newer than tool" case (rare, but real — a teammate on a newer install, or a downgraded local tool).
**Why it happens:** The detection is symmetric (`stamped !== tool`); the remedy is not.
**How to avoid:** `checkSkew()` MUST branch on `compareParsed()`'s sign and emit a distinct message per direction (see Pattern 1's implementation — already direction-aware). Write two adversarial tests: project-behind (common) and project-ahead (rare but real), per roadmap success criterion 2.
**Warning signs:** A single template string interpolated with both versions but no conditional on which is larger; a test suite that only covers the "tool is newer" direction.

### Pitfall 4: Stamp drift — no update trigger means the stamp is intentionally permanent

**What goes wrong:** Nothing rewrites `mottoVersion` after `init`. This is correct per CONTEXT.md D-01/D-06 ("Only `init` writes the stamp... never-auto-restamp is guarded by test"), but the decision must be explicit, not left implicit — otherwise the skew message could accidentally imply auto-healing that doesn't exist.
**How to avoid:** VER-06 requires a dedicated test proving `lint`/`build` never write to `motto.yaml` (e.g. capture file mtime/hash before and after running `lintProject`/`buildProject`, assert unchanged). Message wording (Pattern 1) already avoids implying an auto-fix — it names concrete manual remedies ("check the upgrade ledger", "upgrade motto"), consistent with the permanent-stamp design.

### Pitfall 5: Semver comparison edge cases without a library

**What goes wrong:** A naive numeric-tuple parser can mishandle prerelease suffixes (`0.0.7-beta.1` should sort as LOWER than `0.0.7` per semver, not higher or ignored) or segment-count mismatches (`"0.7"` vs `"0.0.7"`).
**How to avoid:** Scope narrowly — `parseVersion()` should explicitly tolerate a leading `v` and IGNORE (not attempt to parse) anything after the 3rd numeric segment via the regex's non-anchored end (`^v?(\d+)\.(\d+)\.(\d+)` with no `$`), which means `"0.0.7-beta.1"` parses as `{0,0,7}` — a deliberate simplification, not full semver precedence. This is an acceptable narrowing for this milestone (Motto has never shipped a prerelease tag) but should be a one-line code comment noting the simplification, so a future maintainer doesn't assume full semver-precedence support exists.
**Test coverage needed:** equal versions, greater/less across each of major/minor/patch independently, a `v`-prefixed string, and the reject-cleanly path for non-3-segment strings (`"0.7"`, `"0.0.7.1"`) and pure garbage (`"latest"`).

### Pitfall 6: Version-literal-in-tests brittleness

**What goes wrong:** The fastest test to write is `assert.strictEqual(stampedVersion, '0.0.7')` — breaks on every future release.
**Confirmed status this phase:** `package.json`'s version is currently `"0.0.6"` (not yet bumped to `0.0.7` — that happens at ship time). Any test literal written against `"0.0.7"` today would be WRONG even before the first release, since the running tool during phase development is still `0.0.6`.
**How to avoid:** All new tests (`version.test.js`, `init.test.js` additions, `lint.test.js`/`build.test.js` skew fixtures) must read the live version via `getOwnVersion()` (or a direct `readFile`/`JSON.parse` of `package.json`, same as `dogfood.test.js`'s existing pattern of never hardcoding `plugin.json`'s version — see `dogfood.test.js:151-152`, `assert.ok(manifest.version)` not `assert.strictEqual(..., '0.0.2')`). For comparator unit tests needing two *different* fixture versions, use clearly-fake strings (`'1.2.3'` vs `'1.2.4'`), never Motto's real current version.
**Verification:** `grep -rn '"0\.0\.[0-9]"' test/version.test.js test/init.test.js` (once written) should return zero hits inside assertions.

### Pitfall 7: Claude Code marketplace cache (verification concern, not code)

Not applicable to this phase's implementation — this is a Phase 25 (operator debt) verification concern per the milestone research. No action needed in Phase 23's code or tests.

## Decisions Resolved (CONTEXT.md "Claude's Discretion" items)

CONTEXT.md explicitly deferred four decisions to research/planning. This research resolves them as follows, each tagged D-R (research-resolved), to be locked by the planner:

### D-R1: Malformed-stamp severity & location — `errors[]` in `config.js`, not a warning

**Resolved:** Malformed `mottoVersion` values (VER-05's matrix: number, array, object, boolean, null, empty string, garbage string) are validated inside `loadConfig()` (`config.js`), alongside the existing required-field checks, and pushed to `errors[]` — the same array as `missing name`/`missing version`/`missing description`. This makes `ok:false` for a motto.yaml with a genuinely malformed stamp.

**Rationale:**
1. VER-05's own wording is "clean error entries" (not "warning entries") — the roadmap's success criterion 4 says "produces a clean error entry rather than a throw," directly naming `errors[]`'s vocabulary, distinct from success criterion 2's "prints a warning" for skew itself.
2. `config.js` is already the single place that validates `motto.yaml`'s field shapes (required-field checks, `plugins.public`/`plugins.private` kebab-case format checks) — a malformed `mottoVersion` is a shape violation of the same kind, not a runtime-comparison finding.
3. This keeps `checkSkew()` (in `version.js`) simple and pure: it is only ever called with a stamp value that has ALREADY been confirmed to parse as a valid version string (or is legitimately absent). `checkSkew` never needs to distinguish "malformed" from "absent" — both collapse to `parseVersion` returning `null`, and the caller in `lint.js`/`build.js` should skip calling `checkSkew` at all when `config.mottoVersion` is present but already reported as a `config.js` error (to avoid the double-report risk noted in the Anti-Patterns section).
4. Contrast with skew itself: skew is a comparison between two VALID versions where NEITHER is wrong — it's inherently advisory (VER-02: "non-blocking... exit code and ok untouched"). A malformed value, by contrast, is a genuine data-shape problem the same as a missing `plugins.public` — `ok:false` is the correct, consistent signal.

**One nuance for the planner:** this means a project with a malformed `mottoVersion` will fail lint with `ok:false` — a stricter outcome than "absent stamp" (which is `ok:true`, no warning). This is intentional and matches the "absence is fine, garbage is not" asymmetry already established for other optional fields in this codebase's convention (e.g. `plugins.private` absent is fine, but `plugins.private: "Bad/Name"` present-and-invalid IS an error — `config.test.js` C5).

### D-R2: Warning channel & result shape — new `warnings[]` array, additive to existing shape

**Resolved:** `lintProject`/`buildProject` gain a new `warnings: Array<{skill, message}>` field, defaulting to `[]`. `renderResult` (bin/motto.js) prints warnings as `⚠ <skill>: <message>` to **stderr**, **independent of `--quiet`** (quiet only suppresses the success line per the existing doc comment, `bin/motto.js:29-30`) and **independent of `ok`** (a skew warning can coexist with a clean, `ok:true` lint pass). `--format json` requires zero code change — `JSON.stringify(result)` already includes `warnings` verbatim the moment the orchestrators populate it.

**Rationale:** This is the architecture already locked by milestone research (`.planning/research/ARCHITECTURE.md` "Data Flow Through the Existing `{errors, warnings}` Shape" section) and independently corroborated by feature research's prior-art table (every credible tool studied treats skew as advisory-only, not blocking). VER-F1 (structured `{skew: {...}}` JSON field) stays deferred per CONTEXT.md — the plain `{skill, message}` shape (matching `errors[]`'s existing shape) is sufficient and requires zero new conventions.

### D-R3: Skew rule & message wording — direction-aware, three-segment comparison, exact wording above

**Resolved:** Use the exact `parseVersion`/`checkSkew` implementation in Pattern 1 above. Message wording:
- Tool newer than project (`stamped < tool`): `"project was scaffolded with motto {stamped}; you are running {tool} — check the upgrade ledger for changes since {stamped}"`
- Project newer than tool (`stamped > tool`): `"project was scaffolded with motto {stamped}, newer than your running {tool} — upgrade motto"`

**Rationale:** Both messages (a) name both versions explicitly (roadmap success criterion 2's "names both versions"), (b) give a direction-specific, concrete remedy matching CONTEXT.md's locked D-03 exactly ("tool newer → check the upgrade ledger"; "project newer → upgrade motto"), (c) avoid implying an auto-fix mechanism that doesn't exist (Pitfall 4). The planner/discuss-phase should treat this exact wording as a DRAFT, not final-locked — VER-F1 is explicitly deferred "until magma validates the plain-text message" (CONTEXT.md), meaning the wording may be refined post-ship without a schema change, since it's plain prose, not a structured field.

**Reference to Phase 24:** the phrase "the upgrade ledger" in the message presumes Phase 24 (Upgrade-Path Ledger & Policy) produces a discoverable, named artifact. This phase's message text can reference it generically ("check the upgrade ledger") without a hard-coded path/filename, since Phase 24 is sequenced after Phase 23 in the roadmap and the exact ledger location is Phase 24's decision, not Phase 23's.

### D-R4: Dogfood stamping — sequence LAST, do not break success criterion 3

**Resolved:** Stamping this repo's own `motto.yaml` with a real `mottoVersion` value is a **separate, explicit, deliberately-last step** — NOT part of the core VER-01..06 implementation, and should NOT happen until after all adversarial/missing-stamp tests are green and reviewed. Concretely:

1. **Do not add `mottoVersion` to this repo's own `motto.yaml` while implementing/testing this phase.** Roadmap success criterion 3 requires "Running `motto lint`/`motto build` on a project with no stamp (Motto's own tree, magma) completes with no skew warning and no crash" — this repo's OWN tree is the literal, explicit test fixture for the "no stamp" case named in the roadmap text itself. `dogfood.test.js`'s existing `lintProject(REPO_ROOT)` assertion (currently `ok:true, count:3, errors:[]`) is the live proof; adding `warnings: []` to that assertion (once the field exists) keeps this proof intact only if the repo's own `motto.yaml` stays unstamped throughout phase development.
2. **Whether to ever stamp this repo's own tree is a decision for milestone-close, not this phase.** The milestone-level research (`ARCHITECTURE.md` "Suggested Build Order," step 7) recommends doing this "at/near milestone close" specifically so Motto's own dogfood lint doesn't start emitting a skew warning against itself mid-milestone (confusing noise while steps 1-6 are still in flight). This phase (23) should conclude with the tree still unstamped; Phase 24 or a milestone-close housekeeping step is the natural place to revisit, if desired at all.
3. **If the planner chooses to stamp this repo's own tree within Phase 23** (e.g. as a final task, after all other tests are green), it must NOT be done until a NEW, deliberately-updated `dogfood.test.js` assertion exists that expects a `mottoVersion` field present, `warnings: []` (since a freshly-stamped project stamped with the CURRENT running version has zero skew by definition), and the "no stamp" fixture requirement from success criterion 3 is satisfied by a DEDICATED temp-dir fixture instead (not by relying on `REPO_ROOT` itself being unstamped). This is the safer, more conservative reading and this research recommends it: **keep `REPO_ROOT`/this repo's own tree unstamped through Phase 23**, and use a separate `mkdtemp`-created fixture (mirroring `dogfood.test.js`'s own build-fixture pattern, `dogfood.test.js:52-58`) for the "no stamp" test case, so this repo's own tree is free to be stamped later without needing to re-litigate this test.

## Code Examples

### Missing-stamp fixture test (write this FIRST, before any happy-path skew test)

```js
// test/lint.test.js — new describe block, following existing fixture conventions
// (mirrors test/init.test.js's mkdtemp pattern already used throughout this suite)
describe('lintProject mottoVersion — missing stamp (VER-04, Pitfall 1)', () => {
  it('a motto.yaml with no mottoVersion field lints clean, no warning, no crash', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'motto-lint-nostamp-'));
    try {
      // Scaffold via the real scaffoldProject, then strip the mottoVersion
      // line (if init already writes one) to simulate a genuinely
      // pre-v0.0.7 project — OR scaffold with a hand-written motto.yaml
      // that omits the field entirely, matching magma's real shape.
      await scaffoldProject(tempDir, { name: 'no-stamp-proj' });
      // ... assert result.warnings is [] or undefined-safe, result.ok is true
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
```

### Adversarial malformed-stamp matrix (VER-05, roadmap success criterion 4)

```js
// test/config.test.js — new describe block
const MALFORMED_MOTTO_VERSIONS = [
  ['number', 7],
  ['array', [0, 0, 7]],
  ['object', { major: 0, minor: 0, patch: 7 }],
  ['boolean', true],
  ['null', null],
  ['empty string', ''],
  ['garbage string', 'not-a-version'],
];

describe('loadConfig mottoVersion malformed values (VER-05)', () => {
  for (const [label, yamlLiteral] of MALFORMED_MOTTO_VERSIONS) {
    it(`${label} produces a clean error entry, never throws`, () => {
      const yamlValue = typeof yamlLiteral === 'string' ? `"${yamlLiteral}"` : JSON.stringify(yamlLiteral);
      const text = `name: poems\nversion: 0.1.0\ndescription: d\nmottoVersion: ${yamlValue}\nplugins:\n  public: poems\n`;
      let result;
      assert.doesNotThrow(() => { result = loadConfig(text); });
      assert.ok(result.errors.some((e) => /mottoVersion/i.test(e.message)));
    });
  }
});
```

### Direction-aware skew test pair (Pitfall 3, roadmap success criterion 2)

```js
// test/version.test.js — pure unit tests, fake fixture versions (Pitfall 6)
describe('checkSkew direction (VER-03)', () => {
  it('project older than tool → "check the upgrade ledger" remedy', () => {
    const warning = checkSkew('1.2.3', '1.3.0');
    assert.match(warning.message, /check the upgrade ledger/);
    assert.match(warning.message, /1\.2\.3/);
    assert.match(warning.message, /1\.3\.0/);
  });

  it('project newer than tool → "upgrade motto" remedy', () => {
    const warning = checkSkew('1.3.0', '1.2.3');
    assert.match(warning.message, /upgrade motto/);
    assert.match(warning.message, /1\.3\.0/);
    assert.match(warning.message, /1\.2\.3/);
  });

  it('equal versions → no warning', () => {
    assert.strictEqual(checkSkew('1.2.3', '1.2.3'), null);
  });
});
```

### Never-rewrite guard (VER-06, roadmap success criterion 5)

```js
// test/lint.test.js or a dedicated never-restamp.test.js
describe('lint/build never rewrite motto.yaml (VER-06, D-01/D-06)', () => {
  it('lintProject does not modify motto.yaml content', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'motto-norestamp-'));
    try {
      await scaffoldProject(tempDir, { name: 'norestamp-proj' });
      const before = await readFile(join(tempDir, 'motto.yaml'), 'utf8');
      await lintProject(tempDir);
      const after = await readFile(join(tempDir, 'motto.yaml'), 'utf8');
      assert.strictEqual(after, before, 'lintProject must never modify motto.yaml');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
  // mirror for buildProject
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| No version awareness at all — `motto.yaml` has `name`/`version`/`description`/`plugins` only | `motto.yaml` gains `mottoVersion`, a distinct field from the existing project `version` | This phase (v0.0.7, Phase 23) | Every project scaffolded from here forward carries a verifiable "built with" signal; pre-existing projects remain valid (no forced migration) |
| `lintProject`/`buildProject` return `{ok, errors, count}` / `{ok, errors, outDir, skillCount, bucketCount}` | Both gain a new, additive `warnings: []` field | This phase | Backward-compatible for any existing JSON consumer (new key, old keys unchanged) |

**Deprecated/outdated:** nothing in this phase deprecates existing behavior — this is a pure addition.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact message wording ("check the upgrade ledger for changes since...", "upgrade motto") is a reasonable draft, not final-locked copy | D-R3 | Low — VER-F1 explicitly defers exact wording validation to magma's real-world skew case; wording can be revised in a follow-up without a schema change since it's plain text, not a structured field |
| A2 | Malformed `mottoVersion` should be an `errors[]` entry (config.js layer), not a `warnings[]` entry | D-R1 | Medium — if the planner/user actually wants malformed stamps to be advisory-only (not fail `ok`), this changes the implementation location and severity; flagged explicitly for discuss-phase/planner sign-off since CONTEXT.md left this open |
| A3 | This repo's own `motto.yaml` should remain unstamped through the end of Phase 23, with dogfood-stamping deferred to Phase 24/milestone-close | D-R4 | Low — reversible; if the planner instead wants to stamp NOW, the only requirement is adding a dedicated temp-dir "no stamp" fixture so success criterion 3 stays provably tested independent of this repo's own tree state |
| A4 | `parseVersion`'s regex is intentionally NOT full-semver-precedence-aware (ignores prerelease/build suffixes rather than correctly ordering them lower) | Pattern 1, Pitfall 5 | Low — Motto has never shipped a prerelease tag; if it ever does, this is the documented trigger to reconsider (not necessarily to add the `semver` package, but at minimum to re-verify the simplification is still safe) |

**All four assumptions are LOW-MEDIUM risk and none block planning** — they are implementation-detail decisions within the space CONTEXT.md explicitly delegated to Claude's discretion, not compliance/security/retention-policy questions requiring mandatory user re-confirmation. A2 (malformed-stamp severity) is the one worth a one-line explicit callout to the user/planner given it changes exit-code behavior for a specific input class.

## Open Questions

1. **Should `checkOutputsFs`-style symlink/path-safety scrutiny apply to `mottoVersion`?**
   - What we know: `mottoVersion` is a plain string field, never used as a filesystem path or shell argument anywhere in the proposed design.
   - What's unclear: nothing, really — this is a non-issue, but PITFALLS.md's "Security Mistakes" table flags exactly this class of risk ("interpolating the raw version string into a shell command or dynamic import path") as a future-proofing note, not a present concern.
   - Recommendation: no action needed now. Note for any FUTURE feature that might dynamically branch code paths by version (none exists or is planned) — validate against the strict regex first, never treat the raw string as trusted for anything beyond string comparison/display. Already satisfied by the current design (comparison + display only).

2. **Exact test-file organization: new `test/version.test.js` vs. folding into `test/config.test.js`?**
   - What we know: the codebase's existing convention is one test file per `src/` module (`schema.test.js`, `config.test.js`, `frontmatter.test.js`, `build.test.js`, `init.test.js`).
   - What's unclear: nothing structurally — a new `src/version.js` module should get its own `test/version.test.js`, following the established 1:1 convention.
   - Recommendation: create `test/version.test.js` for `parseVersion`/`checkSkew`/`getOwnVersion` pure-unit tests; add skew-integration fixtures (missing/malformed/skewed-in-both-directions) to `test/lint.test.js` and `test/build.test.js` respectively, mirroring how those files already integration-test `config.js`'s validation via `processConfig`.

## Environment Availability

Skipped — this phase has no external dependencies beyond Node stdlib already verified present (Node ≥20, confirmed via `package.json` engines field and the existing, currently-passing CI matrix). No new tools, services, or runtimes are introduced.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (stdlib), stable since Node 20 |
| Config file | none — `node --test` auto-discovers `test/*.test.js` |
| Quick run command | `node --test test/version.test.js` (new file, once created) |
| Full suite command | `npm test` (runs `node --test`, discovers all `test/*.test.js`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VER-01 | `motto init` stamps `mottoVersion` matching the running tool's live version | unit + integration | `node --test test/init.test.js` | ✅ file exists, ❌ new assertions needed |
| VER-02 | Skew is a non-blocking warning; `ok`/exit code unaffected | integration | `node --test test/lint.test.js test/build.test.js` | ✅ files exist, ❌ new fixtures needed |
| VER-03 | Direction-aware message names both versions + correct remedy | unit | `node --test test/version.test.js` | ❌ new file (Wave 0) |
| VER-04 | Missing stamp → no warning, no crash (magma/Motto's-own-tree analog) | integration | `node --test test/lint.test.js test/build.test.js` | ✅ files exist, ❌ new fixtures needed |
| VER-05 | Malformed stamp (7 adversarial shapes) → clean error, never throw | unit (adversarial) | `node --test test/config.test.js` | ✅ file exists, ❌ new matrix needed |
| VER-06 | `lint`/`build` never rewrite `motto.yaml` | integration (regression guard) | `node --test test/lint.test.js test/build.test.js` | ✅ files exist, ❌ new assertion needed |

### Sampling Rate

- **Per task commit:** `node --test test/<changed-file>.test.js` (targeted, fast)
- **Per wave merge:** `npm test` (full suite — husky's pre-commit hook already runs this against disk state on every commit, per established project convention)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus a manual `grep` sweep for hardcoded version literals per Pitfall 6

### Wave 0 Gaps

- [ ] `test/version.test.js` — new file, covers VER-03 (direction-aware messages) and the pure `parseVersion`/`checkSkew` unit surface underlying VER-05
- [ ] No shared fixture/conftest-equivalent needed — `node:test`'s `describe`/`it`/`before`/`after` pattern is already used consistently across the suite with per-file `mkdtemp` setup, no shared fixture file exists or is needed
- [ ] Framework install: none — `node:test` is stdlib, already in use

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — CLI tool, no auth surface |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | **yes** | Hand-written type/shape checks in `config.js` (`typeof === 'string'`, regex match) — the `mottoVersion` field is untrusted input (hand-edited YAML) and must be validated before any use beyond string comparison/display, per the existing house style (never a schema-validation library, per project convention) |
| V6 Cryptography | no | N/A — no crypto surface in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed/adversarial YAML input causing a crash (TypeError on non-string `.split`/`.match`) | Denial of Service (of the CLI process itself) | Type-guard before any string method call; the never-throw invariant (already a standing project-level control, tracked in project memory as recurring risk — 5 prior escapes) is the mitigation. This phase's adversarial test matrix (VER-05) is the verification. |
| Version string used in a future dynamic `require`/`import` or shell interpolation (not present in this phase's design, but named in PITFALLS.md as a forward-looking risk) | Tampering / Injection | Validate against the strict version regex before ANY use beyond string comparison/display; never treat the raw stamp value as trusted enough for dynamic code paths. Not currently applicable — no such usage exists in this phase's design — but worth a one-line code comment near `checkSkew`/`parseVersion` noting the constraint for future maintainers. |

## Sources

### Primary (HIGH confidence)
- `/Users/jeremie/Projects/motto/src/config.js` — `loadConfig`, required/optional field pattern (`plugins.private`, lines 96-102), directly re-read 2026-07-06
- `/Users/jeremie/Projects/motto/src/init.js` — `scaffoldProject`, inline `motto.yaml` template (lines 145-150), directly re-read 2026-07-06
- `/Users/jeremie/Projects/motto/src/lint.js` — `lintProject`, `processConfig`, result shape (lines 320-357), directly re-read 2026-07-06
- `/Users/jeremie/Projects/motto/src/build.js` — `buildProject`, config re-read (lines 89-99), result shape (lines 207-213), `plugin.json` version stamping (line 199), directly re-read 2026-07-06
- `/Users/jeremie/Projects/motto/bin/motto.js` — `renderResult` (lines 193-206), CLI dispatch, directly re-read 2026-07-06
- `/Users/jeremie/Projects/motto/package.json` — confirmed current version `"0.0.6"` (not yet `0.0.7`), single runtime dependency `yaml@^2.9.0`, directly re-read 2026-07-06
- `/Users/jeremie/Projects/motto/motto.yaml` — confirmed no `mottoVersion` field exists yet in this repo's own tree, directly re-read 2026-07-06
- `/Users/jeremie/Projects/motto/test/config.test.js`, `test/init.test.js`, `test/dogfood.test.js`, `test/cli.test.js` — existing test conventions (mkdtemp fixtures, never-hardcode-version pattern already proven at `dogfood.test.js:151-152`), directly re-read 2026-07-06
- `.planning/phases/23-version-stamping-skew-detection/23-CONTEXT.md` — locked decisions D-01..D-06, discretion items, canonical refs
- `.planning/REQUIREMENTS.md` — VER-01..06 definitions, Out of Scope table
- `.planning/ROADMAP.md` §Phase 23 — goal + 5 success criteria

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `STACK.md`, `FEATURES.md` — milestone-level research completed 2026-07-06, HIGH confidence per those documents' own self-assessment; cross-checked against direct source re-reads in this phase-level research (all line-number references and architectural claims confirmed still accurate)
- Prior-art tools (Rails, Terraform, npm lockfileVersion) — carried over from milestone `FEATURES.md`, not independently re-verified this session (no new web research needed; milestone research is sufficiently current at 6 days old and the domain is stable)

### Tertiary (LOW confidence)
- None new this session — all claims trace to either direct source reads (HIGH) or the already-tiered milestone research (HIGH/MEDIUM per that research's own confidence assessment)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, every mechanism verified against live source re-read this session
- Architecture: HIGH — every integration point re-confirmed against current file/line numbers (all matched milestone research's earlier line numbers exactly, confirming no drift since 2026-07-06 milestone research)
- Pitfalls: HIGH — inherited from milestone research (originally MEDIUM there due to some general-pattern sourcing) and sharpened here with phase-specific test examples and the D-R1..D-R4 discretion resolutions

**Research date:** 2026-07-06
**Valid until:** 30 days (stable domain, no external API dependencies, no fast-moving ecosystem surface) — but re-verify `package.json`'s live version and this repo's own `motto.yaml` stamp-status immediately before implementation, since both are mutable project state, not fixed facts
