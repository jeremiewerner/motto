# Phase 15: Field Validation & Integrity Guards - Research

**Researched:** 2026-07-03
**Domain:** Node.js stdlib validation logic (schema.js pure validator + lint.js fs orchestrator) — no new runtime dependencies
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**allowed-tools accepted shapes (resolves STACK.md Q2 roadmap flag)**
- Option A locked — each entry must be a non-empty string; NO shape regex. `Bash(git add *)` passes trivially because a YAML list item is one permission rule by construction. Malformed = wrong container type, non-string entry, empty string.
- Container: string OR array both valid — matches every documented spec form (agentskills.io space-separated string; code.claude.com space/comma-separated string or YAML list). Portability fundamental: a valid Agent Skill must pass lint. String form checked non-empty only (no tokenizing — format-only stance); array form checked per-entry.

**outputs: existence & path-safety**
- Literal existence check, no `{var}` special case — path must exist as written; a `{var}` in a path value fails the existence check naturally (zero extra code). `{var}` placeholders live inside file CONTENT (D-08 convention), never in path values. build-skill (Phase 16) authors accordingly.
- Purity split — lexical guards (non-string value, `..` traversal, absolute path) stay in pure `src/schema.js`; fs-dependent checks (file existence, symlink-realpath containment) live at the `src/lint.js` orchestration layer (sharedRefs-loading precedent). Both layers never-throw.
- Per-entry cascade (shared_references D-10 precedent): non-string → stop; unsafe path (traversal/absolute) → stop, skip fs checks; else missing-file; else symlink-escape. One error per entry; entries independent of each other.

**dependencies guards & error UX**
- Namespaced format: exactly one colon, NAME_KEBAB on both halves — reuse the exported `NAME_KEBAB` regex (D-16). `Foo:bar`, `a::b`, `:x` all fail with quoted-value errors.
- Self-dependency only (VAL-04 as written) — transitive cycle detection (A→B→A) deferred; YAGNI until something consumes the dep graph.
- Audience guard: ONLY public→private fails (private-name leak in dist). private→private, private→public, public→public all pass. Namespaced entries exempt — external, audience unknowable, format-only per D-05.
- Unresolved bare dep error lists available skills inline — e.g. `dependency "relase" not found (available: author-skill, release)`. Sorted names, one line. Phase 14 unknown-template precedent.

**Empty-field policy**
- Empty containers are valid no-ops — `outputs: {}`, `dependencies: []`, `allowed-tools: []` pass (an empty list/map is a coherent "zero deps/outputs" statement, like `shared_references: []` today). Wrong TYPE still errors. Empty string `""` for allowed-tools errors (non-empty rule above). Phase 14's present-but-falsy-errors rule stays specific to `template:` (broken pointer to one thing ≠ coherent empty set).

**Init scaffold & dogfood**
- `motto init` starter skill untouched (standing cross-phase check, same call as Phase 14) — all three fields optional; base-schema demo stays minimal. Docs land in Phase 17, example usage via build-skill in Phase 16.
- Live dogfood: `release` skill gains `allowed-tools` — it runs real git/npm commands, honest use. Proves live-tree enforcement like Phase 14's `template: procedure`. `outputs:`/`dependencies:` are fixtures-only this phase (no honest live consumer yet).

### Claude's Discretion
- Exact error-string wording (structure fixed above: one line, quoted offending value + hint).
- Exact realpath/containment implementation for the symlink-escape check.
- How cross-skill context (skill-name→audience map for dependency guards) is threaded into validation — planner decides against never-throw + schema.js purity constraints.
- Whether string-form vs array-form allowed-tools shares one code path.

### Deferred Ideas (OUT OF SCOPE)
- Transitive dependency-cycle detection (A→B→A) — revisit when something actually consumes the dependency graph.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VAL-01 | `outputs:` named map validated — each file exists inside the skill dir, path-safe (no traversal, no absolute, no symlink escape) | See "outputs: path-safety + existence" pattern below (schema.js lexical predicate + lint.js fs-layer, reusing the shared_references purity split). Symlink-escape pattern verified via web research (`fs.realpath` + `path.relative` containment). |
| VAL-02 | `dependencies:` bare kebab entries resolve to existing skills in the tree; namespaced (`plugin:skill`) entries format-checked only | See "dependencies: resolution + namespaced format" pattern below. Namespaced regex reuses `NAME_KEBAB`; bare resolution reuses the sharedRefs-Set-membership shape, fed from a new `discoverSkillNames` pass already available in `lintProject`. |
| VAL-03 | Public skill cannot depend on a private skill (audience-direction guard) | See "Cross-Skill Context: audience map" architecture pattern below — a new pre-pass in `lint.js` builds `Map<dirName, audience>` by re-reading every SKILL.md's frontmatter (precedented by `buildProject`'s own "Option A — re-read" pattern in `src/build.js`), threaded into `validateSkill` as a fourth parameter. |
| VAL-04 | Self-dependency rejected | Same loop as VAL-02 — `entry === dirName` check MUST run before the "not found" membership check (dirName is always present in the discovered skill-name Set, so checking membership first would silently misclassify self-deps as resolved). |
| VAL-05 | `allowed-tools` format-checked accepting real spec forms incl. parenthesized patterns like `Bash(git add *)` | Option A locked in CONTEXT.md (resolves STACK.md Q2). See "allowed-tools: format-only" pattern below — string OR array container, non-empty check only, no shape regex. |
| VAL-06 | All new validators never-throw, with adversarial malformed-input tests | See "Never-Throw Guarantee" pattern below — type-guard-before-method cascade (NAME/TEMPLATE precedent), applied to all three new fields; async fs-layer checks in `lint.js` wrap per-entry in try/catch mirroring `processSkill`'s existing backstop. |

</phase_requirements>

## Summary

This phase adds three independent, optional-field validators to an already-established pure-validator/fs-orchestrator split (`src/schema.js` / `src/lint.js`). No new dependencies are needed — every check is `node:path` string math, `Array.isArray`/`typeof` guards, and (for `outputs:` existence/symlink checks) `node:fs/promises` `stat`/`realpath`, all of which are either already imported elsewhere in this codebase or are long-stable stdlib with no Node-version floor concern at `>=20`.

The phase's one genuinely new architectural problem — not present in any prior Motto validator — is **VAL-03's cross-skill audience-direction guard**. Every existing validator (`shared_references`, `template`) only needs information about the ONE skill it is validating, or a single flat Set built from a directory scan (`shared/references/*.md`). VAL-02/VAL-03 need to know about *every other skill's* `name` and `audience`, which live inside each skill's own frontmatter — information `lintProject` does not currently gather before calling `processSkill` per-skill. The codebase already has a precedent for solving this shape of problem: `src/build.js`'s docblock explicitly labels its own "re-read skill data from disk after the lint gate" approach as "Option A — re-read, D3-01 reuse" rather than trying to thread lint-time-parsed data through to build time. The same "cheap re-read, don't restructure the existing per-skill loop" instinct is the recommended solution here: add one new pre-pass in `lintProject` that does a lightweight read+parse of every skill's frontmatter (name + audience only, tolerant of read/parse failure) to build a `Map<dirName, audience>` and reuse the already-discovered `skillNames` array as a `Set<string>`, then pass both into `validateSkill` as new parameters — exactly mirroring how `sharedRefs: Set<string>` is already passed in today (D-10 precedent).

The second notable architecture nuance is that `outputs:`'s fs-dependent checks (existence, symlink-escape) cannot live inside `validateSkill` (which is a synchronous, pure function per its own docblock contract — "no filesystem, no YAML parsing"), but ALSO cannot naively duplicate the lexical safety logic in `lint.js` without violating DRY. The resolution, precedented by nothing in this codebase yet but directly implied by the CONTEXT.md purity split, is to export the lexical-safety predicate itself as a pure, reusable function from `schema.js` (analogous to how `NAME_KEBAB` and `hasClosedSection` are already exported for cross-file reuse) so both `validateSkill` (to emit lexical errors) and the new `lint.js` fs-layer helper (to gate which entries are even eligible for an fs check) call the identical logic exactly once.

**Primary recommendation:** Add three independent field-check blocks to `validateSkill` in `src/schema.js` (outputs lexical safety, dependencies namespaced-format + self-dep + bare-resolution + audience-guard, allowed-tools format), each guarded by `hasOwnProperty` on `data` (matching the TEMPLATE/D-07 precedent) so an explicitly-present-but-wrong-shaped value always errors while an absent key is silently skipped. Feed `validateSkill` two new optional parameters — `skillNames: Set<string>` and `audienceMap: Map<string,string>` — sourced from a new pre-pass in `lintProject` (`src/lint.js`) that runs before the existing per-skill loop. Add a new async `checkOutputsFs` helper in `lint.js`, called from `processSkill` immediately after `validateSkill` returns, that reuses an exported pure predicate from `schema.js` to decide which `outputs:` entries are eligible for `stat`/`realpath` checks.

## Architectural Responsibility Map

> This project is a Node.js CLI tool, not a multi-tier web app — the generic Browser/API/DB tier table does not apply. Mapped instead to Motto's own established tiers: **Pure Validator** (`src/schema.js` — no fs/YAML imports, synchronous, never throws), **I/O Orchestrator** (`src/lint.js` — fs discovery + async per-skill processing), **Data Registry** (`src/templates.js` — plain data, no functions), **CLI** (`bin/motto.js` — argv parsing, exit codes).

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `outputs:` lexical safety (non-string / traversal / absolute) | Pure Validator (`schema.js`) | — | String/path math only, no fs access needed — mirrors the existing `shared_references` unsafe-basename check (D-10) |
| `outputs:` file existence + symlink-escape containment | I/O Orchestrator (`lint.js`) | Pure Validator (predicate reused, not fs itself) | Requires `fs.stat`/`fs.realpath`; `schema.js`'s own docblock forbids filesystem access — must stay in the async orchestration layer |
| `dependencies:` namespaced (`plugin:skill`) format check | Pure Validator (`schema.js`) | — | Regex-only (reuses exported `NAME_KEBAB`), no resolution needed — explicitly format-only per D-05 |
| `dependencies:` bare-kebab in-tree resolution | Pure Validator (`schema.js`), fed a precomputed `Set<string>` | I/O Orchestrator (`lint.js`) discovers the Set via the existing `discoverSkillNames` call | Same shape as the `shared_references` Set-membership check (D-10) — resolution logic itself needs no fs access once the Set exists |
| `dependencies:` audience-direction guard (public→private) | Pure Validator (`schema.js`), fed a precomputed `Map<string,string>` | I/O Orchestrator (`lint.js`) builds the Map via a new pre-pass reading every skill's frontmatter | Cross-skill audience data lives inside each skill's own frontmatter on disk — must be resolved via fs before the pure per-skill check can consult it |
| `dependencies:` self-dependency guard | Pure Validator (`schema.js`) | — | `dirName` comparison against each entry, purely in-memory, no fs |
| `allowed-tools:` format check (string OR array, non-empty entries) | Pure Validator (`schema.js`) | — | Shape/type check only, no fs, no tokenizing (Option A, format-only per D-05) |
| Never-throw guarantee across all new checks | Cross-cutting (Pure Validator + I/O Orchestrator) | CLI (`bin/motto.js`) exit-code boundary | D-01 invariant enforced at every layer; the async fs-layer checks additionally need their own try/catch backstop, mirroring `processSkill`'s existing per-skill catch-all |

## Project Constraints (from CLAUDE.md)

- **Tech stack lock:** Node ≥ 20, plain ESM JavaScript, `node --test` (stdlib runner), single runtime dependency `yaml`. This phase MUST introduce zero new dependencies — confirmed feasible; see Standard Stack below.
- **No content stripping:** `SKILL.md` is copied verbatim to `dist/` — the new validators must not mutate or normalize `outputs:`/`dependencies:`/`allowed-tools` values; they only report pass/fail.
- **Portability:** built skills must remain standard Agent Skills, loadable with no Motto present — confirms Option A's "format-only, no tokenizing" stance on `allowed-tools` is correct: Motto must not reject any shape that a real Claude Code client actually accepts.
- **Philosophy:** mechanism over features; YAGNI ruthlessly — confirms deferring transitive dependency-cycle detection (per CONTEXT.md) and NOT hand-rolling a `Bash(...)` grammar parser for `allowed-tools`.
- **Manual validation over `zod`/`ajv`:** explicitly listed as "What NOT to Use" in CLAUDE.md's own Technology Stack section — the hand-written predicate style already used throughout `schema.js` is the mandated pattern, not a schema-validator framework.

## Standard Stack

### Core

No new runtime dependencies. This phase extends existing pure-JS validator code with additional `node:path`/`node:fs/promises` stdlib calls.

| Module/API | Already imported in this codebase? | New usage this phase |
|------------|-------------------------------------|----------------------|
| `node:path` `resolve`, `sep`, `isAbsolute` | `resolve`/`join` used in `build.js`/`init.js`/`lint.js`; `isAbsolute` is a **new import**, not currently used anywhere in `src/` | `schema.js` gains its **first-ever import** (of `node:path` — pure, no I/O, does not violate the "no fs" purity contract) for the `outputs:` lexical-safety predicate |
| `node:path` `relative` | Not currently imported anywhere in `src/` | **New import** in `lint.js`, used for the symlink-escape realpath containment check (`path.relative(realRoot, realTarget)`) |
| `node:fs/promises` `stat` | Already imported in `build.js` (not in `lint.js`) | **New import** in `lint.js` for `outputs:` file-existence check |
| `node:fs/promises` `realpath` | Not currently imported anywhere in `src/` | **New import** in `lint.js` for the `outputs:` symlink-escape check — first use of `realpath` in this codebase |

**Installation:** none — zero new packages.

**Version verification:** N/A — no new package.json dependencies this phase. All APIs used (`path.resolve`, `path.sep`, `path.isAbsolute`, `path.relative`, `fs.promises.stat`, `fs.promises.realpath`) are long-stable Node.js stdlib (pre-v10), well below this project's `>=20` engine floor — `[VERIFIED: codebase — grep of src/*.js imports, cross-checked against Node.js stable-API status]`.

### Supporting

None beyond the above.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written `isOutputPathLexicallySafe` predicate (resolve+sep containment) | `path-is-inside` / `is-path-inside` (npm) | Both packages are themselves ~10-line wrappers around the exact pattern already documented in `STACK.md` Q4; adding a dependency for four lines of stdlib contradicts the project's zero-dep constraint — `[CITED: .planning/research/STACK.md §Q4]` |
| `fs.realpath()` + `path.relative()` containment for symlink-escape | Reject any entry whose resolved path is under any symlinked directory (blanket ban) | Over-broad — would reject legitimate skill trees that happen to be checked out via a symlinked path (common with npm workspaces / monorepo tooling); the realpath+relative containment check is the standard, precise defense — `[CITED: web research, cross-checked openreplay.com + nodejsdesignpatterns.com, MEDIUM confidence]` |
| Hand-written string/array shape checks for `allowed-tools`/`dependencies`/`outputs` | `zod` / `ajv` | Explicitly rejected in both `STACK.md` and `CLAUDE.md`'s own "What NOT to Use" table — 2-5 fields with specific, hand-authored error messages beat a generic schema-validator's output for this scope — `[CITED: CLAUDE.md Technology Stack §What NOT to Use]` |

## Package Legitimacy Audit

**N/A — this phase installs zero external packages.** All work is additive stdlib usage inside existing `src/schema.js` and `src/lint.js` modules. No `npm install` step, no registry lookups, no legitimacy-gate run required.

## Architecture Patterns

### System Architecture Diagram

```
                 motto lint (bin/motto.js)
                          │
                          ▼
                 lintProject(projectRoot)          [src/lint.js — I/O Orchestrator]
                          │
        ┌─────────────────┼──────────────────────────────────────┐
        │                 │                                      │
        ▼                 ▼                                      ▼
  processConfig()   loadSharedRefs()                    discoverSkillNames()
  (motto.yaml)       → Set<basename>                      → string[] (sorted dirNames)
                                                                    │
                                          ┌─────────────────────────┘
                                          ▼
                          NEW: loadSkillAudiences(skillsDir, skillNames)
                          — pre-pass re-read of every SKILL.md's frontmatter
                          — tolerant of per-file read/parse failure (never throws)
                          → Map<dirName, audience>   +   skillNames as Set<string>
                                          │
                                          ▼
                    for each dirName in skillNames:  processSkill(...)
                                          │
                    ┌─────────────────────┴─────────────────────────┐
                    ▼                                                ▼
        parseFrontmatter(text)  →  { data, body }         (async, after validateSkill)
                    │                                                │
                    ▼                                                ▼
     validateSkill(skill, sharedRefs,           NEW: checkOutputsFs(skillsDir, dirName,
       templatesRegistry, skillNames,                data, errors)
       audienceMap)                              — reuses schema.js's exported lexical
     [src/schema.js — Pure Validator]              predicate to decide which outputs:
       │                                           entries are fs-eligible
       ├─ NAME / DESCRIPTION / AUDIENCE / TEMPLATE  — stat() → existence error
       │  (existing, unchanged)                     — realpath() × 2 + path.relative()
       ├─ outputs: lexical safety (NEW)                → symlink-escape error
       ├─ dependencies: namespaced format,                        │
       │  self-dep, bare resolution,                              ▼
       │  audience-direction guard (NEW)          errors.push(...) — same
       └─ allowed-tools: format check (NEW)         { skill, message } shape
                    │                                                │
                    └───────────────────┬───────────────────────────┘
                                          ▼
                        aggregated errors[] returned to bin/motto.js
                                          │
                                          ▼
                          exit code 0 (ok) / 1 (errors present)
```

### Recommended Project Structure

No new files. All changes land in existing modules:

```
src/
├── schema.js        # + outputs lexical predicate (exported) + 3 new field-check blocks in validateSkill
├── lint.js           # + loadSkillAudiences() pre-pass, + checkOutputsFs() async helper, processSkill wiring
├── templates.js       # unchanged
└── build.js            # unchanged — outputs/dependencies/allowed-tools do not affect packaging (per phase scope)

skills/
└── release/SKILL.md   # + allowed-tools field (live dogfood target, per CONTEXT.md)

test/
├── schema.test.js     # + adversarial + happy-path cases for all 3 new fields (never-throw proofs, VAL-06)
└── lint.test.js        # + fs-layer fixtures: outputs existence/symlink-escape, dependencies cross-skill resolution + audience guard
```

### Pattern 1: hasOwnProperty-gated optional field (D-07 precedent, reused)

**What:** An optional frontmatter field is checked for `hasOwnProperty`, not truthiness — an explicitly-present-but-falsy/wrong-shaped value always errors; an absent key is silently skipped.
**When to use:** All three new fields (`outputs`, `dependencies`, `allowed-tools`) — matches the Empty-field policy in CONTEXT.md ("wrong TYPE still errors" even though empty *correctly-shaped* containers are valid no-ops).
**Example:**
```js
// Source: src/schema.js TEMPLATE cascade (existing precedent, lines 227-251), extended to new fields
const hasOutputsKey = Object.prototype.hasOwnProperty.call(data, "outputs");
if (hasOutputsKey) {
  const outputs = data.outputs;
  if (outputs === null || typeof outputs !== "object" || Array.isArray(outputs)) {
    err(`outputs must be a map of name -> file (got ${Array.isArray(outputs) ? "array" : typeof outputs})`);
  } else {
    // empty {} is a valid no-op — the for-loop below simply does nothing
    for (const [key, value] of Object.entries(outputs)) {
      // per-entry cascade — see Pattern 2
    }
  }
}
```

### Pattern 2: outputs: — lexical predicate exported for cross-layer reuse

**What:** A pure, exported `isOutputPathLexicallySafe(skillDirAbs, entry)` predicate used by BOTH `validateSkill` (to emit the lexical error) and `lint.js`'s new fs-layer helper (to decide whether an entry is even eligible for an fs check) — avoids duplicating the cascade logic in two files.
**When to use:** Any per-entry check split across the pure/fs boundary (the `outputs:` existence+symlink check is the first case of this shape in the codebase).
**Example:**
```js
// src/schema.js — NEW exported pure predicate, no fs, no YAML (purity-safe: node:path only)
import { resolve, sep, isAbsolute } from "node:path";

export function isOutputPathLexicallySafe(skillDirAbs, entry) {
  if (typeof entry !== "string" || entry === "") return false;
  if (isAbsolute(entry)) return false;
  const root = resolve(skillDirAbs) + sep;
  const target = resolve(skillDirAbs, entry);
  return (target + sep).startsWith(root);
  // Source: .planning/research/STACK.md §Q4 — verified resolve+sep containment
  // pattern; the trailing `sep` on both sides is the documented fix for the
  // sibling-directory-prefix false positive (e.g. "build-skill" vs
  // "build-skill-evil").
}
```
```js
// src/schema.js — validateSkill, per-entry cascade (D-10 shape, extended)
for (const [key, value] of Object.entries(outputs)) {
  if (typeof value !== "string" || value === "") {
    err(`outputs.${key} must be a non-empty string path (got ${typeof value})`);
    continue; // cascade: stop, no further checks on this entry
  }
  if (!isOutputPathLexicallySafe(skillDirAbs, value)) {
    err(`outputs.${key} path "${value}" is unsafe (must not be absolute or contain ".." traversal)`);
    continue; // cascade: stop, skip fs checks (existence/symlink deferred to lint.js anyway)
  }
  // lexically safe — existence/symlink-escape checked in lint.js's checkOutputsFs
}
```
```js
// src/lint.js — NEW async fs-layer helper, called from processSkill after validateSkill()
import { stat, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { isOutputPathLexicallySafe } from './schema.js';

async function checkOutputsFs(skillsDir, dirName, data, errors) {
  const outputs = data && typeof data === 'object' ? data.outputs : undefined;
  if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) return; // schema.js already reported shape error
  const skillDirAbs = resolve(skillsDir, dirName);
  for (const [key, value] of Object.entries(outputs)) {
    if (!isOutputPathLexicallySafe(skillDirAbs, value)) continue; // schema.js already reported it — no duplicate error
    const targetAbs = resolve(skillDirAbs, value);
    try {
      await stat(targetAbs);
    } catch {
      errors.push({ skill: dirName, message: `outputs.${key} file "${value}" does not exist` });
      continue;
    }
    // Symlink-escape check: resolve REAL filesystem paths, re-verify containment.
    // Source: web research (openreplay.com, nodejsdesignpatterns.com) — resolve()
    // alone does not follow symlinks; fs.realpath() does. path.relative() is the
    // standard containment idiom: a relative result starting with ".." or itself
    // absolute means the real target escaped skillDirAbs.
    try {
      const [realRoot, realTarget] = await Promise.all([realpath(skillDirAbs), realpath(targetAbs)]);
      const rel = relative(realRoot, realTarget);
      const contained = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
      if (!contained) {
        errors.push({ skill: dirName, message: `outputs.${key} file "${value}" escapes the skill directory via symlink` });
      }
    } catch (e) {
      errors.push({ skill: dirName, message: `outputs.${key} file "${value}" could not be resolved: ${e.message}` });
    }
  }
}
```

### Pattern 3: dependencies: — namespaced format, self-dep, bare resolution, audience guard

**What:** A single per-entry loop handling all four dependency guards, with namespaced entries short-circuiting out of resolution/audience checks (exempt per CONTEXT.md).
**When to use:** VAL-02, VAL-03, VAL-04.
**Example:**
```js
// src/schema.js — validateSkill, requires new parameters skillNames (Set) and audienceMap (Map)
const hasDepsKey = Object.prototype.hasOwnProperty.call(data, "dependencies");
if (hasDepsKey) {
  const deps = data.dependencies;
  if (!Array.isArray(deps)) {
    err(`dependencies must be an array (got ${typeof deps})`);
  } else {
    for (const entry of deps) {
      if (typeof entry !== "string" || entry === "") {
        err(`dependencies entry must be a non-empty string (got ${typeof entry})`);
        continue;
      }
      if (entry.includes(":")) {
        // Namespaced (plugin:skill) — format-checked only, exempt from resolution + audience guard (D-05)
        const parts = entry.split(":");
        if (parts.length !== 2 || !NAME_KEBAB.test(parts[0]) || !NAME_KEBAB.test(parts[1])) {
          err(`dependencies entry "${entry}" is not valid "plugin:skill" format`);
        }
        continue;
      }
      // Bare kebab entry — self-dependency check MUST precede membership check
      // (dirName is always present in skillNames, so checking "not found" first
      // would silently misclassify a self-dependency as resolved — VAL-04 precedes VAL-02).
      if (entry === dirName) {
        err(`dependencies entry "${entry}" is a self-dependency`);
        continue;
      }
      if (!skillNames.has(entry)) {
        const available = [...skillNames].sort().join(", ");
        err(`dependency "${entry}" not found (available: ${available})`);
        continue;
      }
      // Resolved — audience-direction guard: ONLY public→private fails (D-05, VAL-03)
      if (data.audience === "public" && audienceMap.get(entry) === "private") {
        err(`dependencies entry "${entry}" is private but this skill is public (audience-direction guard)`);
      }
    }
  }
}
```

### Pattern 4: allowed-tools: — format-only, string OR array container

**What:** Option A (locked) — non-empty string or array of non-empty strings, no shape regex, no tokenizing.
**When to use:** VAL-05.
**Example:**
```js
// src/schema.js — validateSkill
const hasAllowedToolsKey = Object.prototype.hasOwnProperty.call(data, "allowed-tools");
if (hasAllowedToolsKey) {
  const val = data["allowed-tools"];
  if (typeof val === "string") {
    if (val.trim() === "") {
      err(`allowed-tools must be a non-empty string or array (got an empty string)`);
    }
    // non-empty string passes trivially — Bash(git add *) is one valid rule (Option A)
  } else if (Array.isArray(val)) {
    val.forEach((entry, i) => {
      if (typeof entry !== "string" || entry === "") {
        err(`allowed-tools[${i}] must be a non-empty string (got ${typeof entry})`);
      }
    });
    // empty array [] passes — coherent "zero tools" declaration (Empty-field policy)
  } else {
    err(`allowed-tools must be a string or array (got ${typeof val})`);
  }
}
```

### Pattern 5: Cross-Skill Context — audience map pre-pass (the phase's one new orchestration shape)

**What:** A new pre-pass in `lintProject` that re-reads every skill's frontmatter (name + audience only) BEFORE the existing per-skill loop, to build the `Map<dirName, audience>` and reuse the discovered `skillNames` list as a `Set`. Tolerant of per-file failure — an unreadable/malformed SKILL.md is simply absent from the map (its OWN validation errors are still reported independently by `processSkill`'s normal pass).
**When to use:** VAL-02 (bare resolution) and VAL-03 (audience-direction guard) — the only checks in this phase needing information about skills OTHER than the one currently being validated.
**Precedent:** `src/build.js`'s docblock explicitly frames its own "read config + skill data from disk" step as "Option A — re-read, D3-01 reuse" rather than threading data through from `lintProject`. Re-reading small SKILL.md files a second time is an established, accepted cost in this codebase — NOT a novel workaround.
**Example:**
```js
// src/lint.js — NEW pre-pass helper, called once in lintProject before the processSkill loop
async function loadSkillAudiences(skillsDir, skillNames) {
  const audienceMap = new Map();
  for (const dirName of skillNames) {
    try {
      const text = await readFile(join(skillsDir, dirName, 'SKILL.md'), 'utf8');
      const { data } = parseFrontmatter(text); // never throws (D-01)
      const audience = data && typeof data.audience === 'string' ? data.audience : undefined;
      if (audience) audienceMap.set(dirName, audience);
      // No entry when unreadable/missing/invalid — the audience-direction guard
      // simply does not fire for that dependency target; processSkill's own pass
      // over that skill independently reports its audience error.
    } catch {
      // unreadable file — skip silently, never throw (D-01); processSkill will
      // report the read error when it processes this skill directly.
    }
  }
  return audienceMap;
}
```
```js
// src/lint.js — lintProject, wiring (after discoverSkillNames, before the processSkill loop)
const skillNameSet = new Set(skillNames);
const audienceMap = await loadSkillAudiences(skillsDir, skillNames);
for (const dirName of skillNames) {
  await processSkill(skillsDir, dirName, sharedRefs, skillNameSet, audienceMap, errors);
}
```
```js
// src/lint.js — processSkill, updated call site
const schemaErrors = validateSkill({ dirName, data, body }, sharedRefs, undefined, skillNameSet, audienceMap);
errors.push(...schemaErrors);
await checkOutputsFs(skillsDir, dirName, data, errors); // NEW — async fs-layer check
```

### Anti-Patterns to Avoid

- **Embedding `fs.stat`/`fs.realpath` calls inside `validateSkill`:** Breaks the documented "pure — no filesystem" contract in `schema.js`'s own file docblock and its synchronous, fully-mockable unit-test story. `validateSkill` must remain synchronous; all `outputs:` fs checks belong in `lint.js`.
- **Re-implementing the lexical safety check separately in `lint.js`:** Creates two divergent copies of the same cascade logic (a classic drift bug — one gets updated, the other doesn't). Export one pure predicate from `schema.js`, call it from both layers.
- **Checking `skillNames.has(entry)` before checking `entry === dirName`:** Silently breaks VAL-04 — every skill is trivially a member of its own discovered `skillNames` Set, so a self-dependency would incorrectly resolve as "found" instead of erroring.
- **Applying the audience-direction guard to namespaced (`plugin:skill`) entries:** Explicitly out of scope per D-05/CONTEXT.md — namespaced entries are external, their audience is unknowable to this project, and they must remain format-only.
- **Treating an unreadable skill during the `loadSkillAudiences` pre-pass as a lint failure:** It is NOT — that skill's own `processSkill` pass independently reports the read/parse error. The pre-pass must swallow failures silently (never throw, never push an error itself) to avoid double-reporting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path traversal / absolute-path rejection | A custom string-scanning "reject if contains `..`" check in isolation | `path.resolve()` + `path.sep`-aware `startsWith` containment (already documented in `STACK.md` §Q4, now extended with the symlink layer) | Reject-on-substring alone misses absolute-path overrides and the sibling-directory-prefix false positive; `resolve`+containment subsumes both correctly — `[CITED: .planning/research/STACK.md §Q4]` |
| Symlink escape detection | Blanket-reject any path passing through a symlinked directory | `fs.realpath()` resolve + `path.relative()` containment check, applied only after the lexical check and existence check pass | Blanket rejection breaks legitimate symlinked checkouts (npm workspaces, monorepo tooling); realpath+relative is the precise, standard defense — `[CITED: web research, cross-checked, MEDIUM confidence]` |
| `allowed-tools` permission-rule grammar (`Bash(cmd *)` internals) | A parser validating the parenthesized pattern syntax itself | Nothing — explicitly out of scope per D-05 ("format-checked only... tool existence is runtime-dependent") | Motto cannot know whether a given `Bash(...)` pattern or `mcp__x__y` name refers to a real, installed tool; validating only the container shape is the locked Option A stance |
| Namespaced dependency format check | A generic URI/package-spec parser | A single anchored regex reusing the already-exported `NAME_KEBAB` per half | 2-field format (`plugin:skill`), no ambiguity — a hand-written regex is simpler and more precise than a general-purpose parser |

**Key insight:** Every "don't hand-roll" item in this phase is really "don't build MORE than the locked, format-only scope calls for" — the risk in this phase is not missing a library, it's over-engineering validation depth (parsing `Bash(...)` internals, general path-traversal libraries, transitive dependency graphs) beyond what VAL-01..06 actually require.

## Common Pitfalls

### Pitfall 1: `schema.js` purity — importing `node:fs` instead of only `node:path`
**What goes wrong:** A contributor adds `import { existsSync } from 'node:fs'` to `schema.js` to "quickly" check `outputs:` existence inline, silently converting `validateSkill` from sync-pure to something that does disk I/O mid-validation.
**Why it happens:** The existence check feels like it belongs next to the lexical check for the same field.
**How to avoid:** `schema.js`'s docblock explicitly states "no filesystem" as an invariant. `node:path` (pure, string-only) is fine to import there for the first time this phase; `node:fs`/`node:fs/promises` must never appear in `schema.js`'s import list.
**Warning signs:** Any `await` appearing inside `validateSkill`; any `import` from `node:fs*` in `schema.js`.

### Pitfall 2: Self-dependency check ordered after membership resolution
**What goes wrong:** `release` declaring `dependencies: [release]` gets NO error, because `skillNames.has('release')` is trivially true (a skill is always present in the tree it belongs to) — the loop reports it as "resolved" and even runs the audience guard against itself.
**Why it happens:** The natural reading order of VAL-02 before VAL-04 in the requirements list tempts writing "resolve, then separately check self-dep" instead of ordering the cascade correctly.
**How to avoid:** `entry === dirName` MUST be the first bare-kebab check, before the `skillNames.has(entry)` membership check — see Pattern 3 above.
**Warning signs:** A test asserting `dependencies: [dirName]` errors passes only because the audience guard happens to also fire (masking the missing dedicated self-dep error) — check the SPECIFIC error message, not just error presence.

### Pitfall 3: Double-reporting from the `loadSkillAudiences` pre-pass
**What goes wrong:** A skill with a genuinely malformed SKILL.md (e.g. broken YAML) gets its parse error reported TWICE — once from the new pre-pass, once from `processSkill`'s normal pass.
**Why it happens:** Copy-pasting `processSkill`'s error-pushing pattern into the pre-pass without noticing the pre-pass has a different job (silently gather what it can, not report).
**How to avoid:** `loadSkillAudiences` must NEVER push to the shared `errors` array — it only builds the Map, swallowing failures with an empty catch (see Pattern 5).
**Warning signs:** Test fixture with intentionally broken frontmatter shows 2 identical-looking errors instead of 1.

### Pitfall 4: `outputs` container-type confusion — `typeof null === 'object'` and arrays are objects too
**What goes wrong:** `outputs: null` or `outputs: [1,2,3]` passes the naive `typeof outputs === 'object'` check and crashes (or silently no-ops) on `Object.entries()`.
**Why it happens:** `typeof null` famously returns `'object'` in JavaScript; `Array.isArray()` must be checked separately since arrays are also `typeof 'object'`.
**How to avoid:** Guard explicitly: `outputs === null || typeof outputs !== 'object' || Array.isArray(outputs)` all route to the "must be a map" error — mirrors the existing `TEMPLATE` non-string guard style (D-13 cascade precedent).
**Warning signs:** Adversarial test with `outputs: null` or `outputs: [1,2,3]` throws instead of returning a clean error array (VAL-06 violation).

### Pitfall 5: Dogfood regression — `release` skill's new `allowed-tools` value must actually be valid under the implemented rule
**What goes wrong:** `test/dogfood.test.js` asserts `lintProject(REPO_ROOT).ok === true` with a hardcoded skill `count`. Adding `allowed-tools` to `skills/release/SKILL.md` with a value that doesn't pass the newly-implemented validator breaks the dogfood test AND the pre-commit hook (husky runs `node --test` on every commit).
**Why it happens:** The dogfood skill is edited in the same phase as the validator that checks it — a mismatch between "what the validator accepts" and "what was authored" is easy to introduce mid-implementation.
**How to avoid:** Run `node --test` locally after both the validator change AND the `release/SKILL.md` edit land, before considering any task complete. Author `allowed-tools` on `release` using real, spec-documented values (e.g. `Bash(git *) Bash(npm *)` as a string, or an equivalent YAML list) — genuinely representative of the commands `release`'s procedure actually invokes.
**Warning signs:** `node --test` fails on `test/dogfood.test.js`'s `lintProject on REPO_ROOT returns ok:true` assertion after editing `release/SKILL.md`.

### Pitfall 6: Stale docblock claim — "`dependencies` ... is accepted without error (D-14)"
**What goes wrong:** `src/schema.js`'s own docblock (line ~128) currently states: *"`dependencies` (and any other unknown frontmatter key) is accepted without error (D-14)."* This becomes FALSE the moment VAL-02..04 land — `dependencies` is no longer a passthrough key.
**Why it happens:** Easy to miss updating a docblock comment when the code below it changes meaning.
**How to avoid:** Update this docblock line as part of the same task that adds the `dependencies:` validation block — remove `dependencies` from the "accepted without error" claim (it now only applies to genuinely unknown keys).
**Warning signs:** Code review or a later reader trusts the stale docblock and assumes `dependencies:` is still unchecked.

### Pitfall 7: Adversarial malformed-input tests must include throwing-`toString`/`Symbol.toPrimitive` objects (VAL-06, T-14-03 precedent)
**What goes wrong:** A naive "never-throw" test suite only covers wrong-primitive-type cases (numbers, booleans, null) and misses objects that throw when coerced to a string inside an error-message template literal.
**Why it happens:** Easy to forget that `` `${weirdValue}` `` inside an `err(...)` call can itself throw if `weirdValue` has a malicious `toString`/`Symbol.toPrimitive`.
**How to avoid:** Reuse the exact adversarial fixture pattern already proven in `test/schema.test.js`'s TEMPLATE cascade tests ("template: object with a throwing toString/Symbol.toPrimitive never throws" — T-14-03) for all three new fields: `outputs`, `dependencies`, `allowed-tools` entries.
**Warning signs:** A malformed-input test suite that never constructs an object with a throwing `toString`.

## Code Examples

Verified patterns already established in this codebase (extend, don't invent):

### Per-entry independent-cascade pattern (D-10, direct precedent)
```js
// Source: src/schema.js lines 275-292 (existing shared_references check) — this
// exact shape (per-entry: unsafe-check first and `continue`, else membership
// check) is the template for outputs/dependencies per-entry cascades.
const refs = Array.isArray(data.shared_references) ? data.shared_references : [];
for (const entry of refs) {
  if (typeof entry === "string" && (entry.includes("/") || entry.includes("."))) {
    err(`shared_references entry "${entry}" is an unsafe basename (must not contain "/" or ".")`);
  } else if (!sharedRefs.has(entry)) {
    err(`shared_references entry "${entry}" not found in shared/references/`);
  }
}
```

### Type-guard-before-method cascade (D-01, direct precedent)
```js
// Source: src/schema.js lines 165-169 (existing NAME cascade) — guard typeof
// BEFORE calling any string/array method; this is the never-throw pattern to
// replicate for every new field's non-string/wrong-shape branch.
} else if (typeof name !== "string") {
  err(`name must be a string (got ${typeof name})`);
} else if (!NAME_KEBAB.test(name)) {
  ...
```

### fs existence check idiom (already used for shared_references collision detection)
```js
// Source: .planning/research/STACK.md §Q4, citing src/build.js's existing
// stat()+try/catch idiom used for shared_references↔references/*.md — the
// same shape applies to outputs: existence checking.
try {
  await stat(join(skillsDir, skill.name, 'references', ref + '.md'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e; // unexpected error — propagate
  // ENOENT → not found, report and continue
}
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `fs.realpath()` + `path.relative()` containment is the correct, standard idiom for symlink-escape detection (not just `path.resolve()`+`startsWith`) | Pattern 2 (outputs), Don't Hand-Roll | If wrong, a symlink pointing outside the skill dir could pass lint undetected — a real security gap in VAL-01's "no symlink escape" requirement. Confidence is MEDIUM (cross-checked community sources, consistent with STACK.md's own confidence rating for the adjacent lexical-check pattern), not HIGH — the planner/implementer should write an adversarial symlink-escape fixture test to confirm behavior empirically rather than trusting the pattern alone. |
| A2 | Re-reading every SKILL.md a second time in a `loadSkillAudiences` pre-pass (rather than restructuring `lintProject`'s existing single-pass loop) is the right architectural choice | Pattern 5 (Cross-Skill Context) | If the planner instead threads parsed data through a bigger refactor, this assumption doesn't block anything (Claude's Discretion explicitly reserves this decision) — but if a future phase needs MORE cross-skill context, doing N one-off re-read pre-passes could become wasteful; a single unified "parse all skills once, reuse everywhere" pass might be worth revisiting at that point (not this phase — YAGNI). |
| A3 | The audience-direction guard should key off `data.audience` of the CURRENT skill vs. `audienceMap.get(entry)` of the dependency target, using exact string equality against `'public'`/`'private'` | Pattern 3 (dependencies) | If a dependency target's audience is missing from the map (unreadable/malformed SKILL.md), `audienceMap.get(entry)` returns `undefined`, which correctly does NOT equal `'private'` — the guard silently doesn't fire for that case, which is the intended fail-open-on-unrelated-error behavior (see Pitfall 3), not a gap in THIS guard. |

**If this table is empty:** N/A — see entries above; all three are LOW-to-MEDIUM risk implementation-detail assumptions, not requirement-level ambiguities (CONTEXT.md already locked the requirement-level decisions).

## Open Questions

1. **Should `outputs:`/`dependencies:`/`allowed-tools` field-check blocks be gated by `hasOwnProperty` (matching TEMPLATE/D-07) or by truthiness (matching the simpler `shared_references`/`Array.isArray(...) ? ... : []` pattern)?**
   - What we know: CONTEXT.md's Empty-field policy says "wrong TYPE still errors" even for empty containers — this implies `hasOwnProperty` gating (so `outputs: null` or `dependencies: "bad"` reliably error) rather than defaulting to an empty container silently on any falsy value.
   - What's unclear: `shared_references` today uses `Array.isArray(data.shared_references) ? data.shared_references : []` — which means `shared_references: "bad"` (a non-array truthy value) is CURRENTLY silently treated as `[]` with no error. This is inconsistent with the new fields' stricter "wrong type errors" requirement, but changing `shared_references`'s existing behavior is explicitly out of this phase's scope (only the three new fields are in scope).
   - Recommendation: use `hasOwnProperty` gating (Pattern 1) for all three NEW fields as written above; do NOT touch `shared_references`'s existing lenient behavior — this satisfies CONTEXT.md's Empty-field policy for the fields it explicitly governs, without an unrequested behavior change to existing code.

2. **Exact wording for the `outputs:` "must be a map" error message when `outputs` is present but is e.g. a string or number.**
   - What we know: CONTEXT.md leaves "exact error-string wording" to Claude's Discretion, fixing only the structure (one line, quoted offending value + hint).
   - What's unclear: no specific wording is locked.
   - Recommendation: planner/implementer picks final wording; the examples in this document (`outputs must be a map of name -> file (got ${typeof outputs})`) are illustrative, not mandatory text.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Hand-written type/shape guards (this phase's entire scope) — no schema-validator framework, per project convention |
| V12 File and Resources | yes | Path-traversal + symlink-escape containment for `outputs:` (VAL-01) — `path.resolve()`+`sep`-aware containment (lexical) plus `fs.realpath()`+`path.relative()` containment (post-symlink-resolution) |
| V4 Access Control | yes (adjacent) | The audience-direction guard (VAL-03) is a build-time access-control check preventing a private skill's name/existence from leaking into the public dist bucket via a public skill's `dependencies:` declaration — not a runtime authZ boundary, but the same "don't leak private-scoped identifiers into a public artifact" principle |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `outputs:` entry containing `../../etc/passwd`-style segments | Tampering / Information Disclosure | Lexical `path.resolve()`+`sep`-containment check in `schema.js`, applied BEFORE any fs access — an unsafe entry never reaches `stat`/`realpath` at all (Pattern 2 cascade: "stop, skip fs checks") |
| Symlink escape — a file WITHIN the skill dir that is itself a symlink pointing outside it | Tampering / Information Disclosure | `fs.realpath()` resolution + `path.relative()` re-containment check AFTER the lexical check and existence check both pass (Pattern 2) — this is the specific gap the lexical-only check (already implemented for `shared_references` in a prior phase) does NOT cover, which is why VAL-01 explicitly calls it out as a new requirement beyond the existing D-10 precedent |
| Private-skill-name leak into a public plugin's `dependencies:` metadata | Information Disclosure | Audience-direction guard (VAL-03) — a public skill declaring a dependency on a private skill fails lint before it can ever reach `motto build`'s packaging step |
| TOCTOU (time-of-check-to-time-of-use) between `stat`/`realpath` and an eventual `motto build` read | Tampering (low severity, accepted risk) | Not mitigated by this phase — `motto lint` is a static-analysis/pre-flight tool, not a runtime security boundary; a TOCTOU race would require an attacker with local filesystem write access during the lint→build window, which is already outside this project's threat model (single-maintainer/local CLI tool, no server-side execution) |

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/schema.js`, `src/lint.js`, `src/build.js`, `src/templates.js`, `test/schema.test.js`, `test/lint.test.js`, `test/dogfood.test.js`, `skills/release/SKILL.md`, `.planning/config.json`, `package.json` — all import lists, existing cascade patterns, purity contracts, and test fixture idioms confirmed by direct reading, 2026-07-03.
- `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` — D-04, D-05, D-06, D-08 field definitions, confirmed by direct reading.
- `.planning/phases/15-field-validation-integrity-guards/15-CONTEXT.md` — all locked decisions, verbatim.
- `.planning/REQUIREMENTS.md` — VAL-01..06 definitions, verbatim.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` §Q1-Q4, v0.0.5 addendum — `allowed-tools` spec verification (agentskills.io + code.claude.com, HIGH confidence per that document's own sourcing), path-safety `resolve`+`sep` containment pattern (MEDIUM confidence per that document's own rating — community security write-ups, not a single official Node.js doc page).
- Web research (this session) — Node.js `fs.realpath()` + `path.relative()` symlink-escape containment pattern, cross-checked across `blog.openreplay.com/prevent-path-traversal-nodejs/` and `nodejsdesignpatterns.com/blog/nodejs-path-traversal-security/`, consistent with OWASP path-traversal guidance. `[CITED: web, MEDIUM confidence — verified via classify-confidence seam with --verified flag reflecting multi-source cross-check]`.

### Tertiary (LOW confidence)
- None — no unverified single-source claims remain in this document; all `[ASSUMED]`-tier claims are logged in the Assumptions Log above with explicit risk framing rather than presented as fact.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, every API already stable stdlib, cross-checked against actual `src/*.js` imports in this session.
- Architecture: HIGH — the pure-validator/fs-orchestrator split is direct precedent (`shared_references`, D-10); the one genuinely novel piece (cross-skill audience map) is grounded in an explicit existing precedent (`build.js`'s "Option A — re-read" docblock language).
- Pitfalls: HIGH — all 7 pitfalls are either direct extensions of documented precedents already tested in `test/schema.test.js` (T-14-03, D-13) or concrete artifacts found by direct codebase inspection (the stale D-14 docblock, the dogfood live-tree dependency).
- Security (symlink-escape pattern specifically): MEDIUM — cross-checked community sources, not a single official Node.js security doc page; flagged in Assumptions Log (A1) with a recommendation to verify via adversarial test.

**Research date:** 2026-07-03
**Valid until:** 30 days (stable Node.js stdlib domain; no fast-moving external dependency risk since zero new packages are introduced)
