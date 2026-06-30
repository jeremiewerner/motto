# Architecture Research

**Domain:** Node.js lint/build CLI — text-file validation and copy-based packaging
**Researched:** 2026-06-30
**Confidence:** HIGH (primary sources: project design spec + implementation plan, both authoritative; validated against established functional-core/imperative-shell pattern)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  CLI Entry (bin/motto.js)                                        │
│  parse argv → call lint/build → print results → exit(0|1)        │
├────────────────────┬────────────────────────────────────────────┤
│  Orchestration     │                                            │
│  lint.js           │  build.js                                  │
│  (discover+schema) │  (lint-guard + config + discover + emit)   │
├───────┬────────────┴──────────┬─────────────────────────────────┤
│  IO Shell                     │  Pure Core                      │
│  ┌────────────┐ ┌──────────┐  │  ┌────────────┐ ┌───────────┐  │
│  │ config.js  │ │discover  │  │  │frontmatter │ │ schema.js │  │
│  │(reads yaml)│ │(reads fs)│  │  │  .js       │ │(validates)│  │
│  └────────────┘ └──────────┘  │  │(parses str)│ │           │  │
│                               │  └────────────┘ └───────────┘  │
└───────────────────────────────┴─────────────────────────────────┘
```

The critical structural rule: **pure-core modules never import `node:fs`**. IO-shell modules accept a `projectDir` path as input and return plain data structures upward. The boundary is deliberate — pure modules are testable with `assert.deepEqual` and zero fixtures; IO modules need temp dirs but no mocks.

### Component Responsibilities

| Module | Layer | Responsibility | Imports | Exports |
|--------|-------|----------------|---------|---------|
| `frontmatter.js` | Pure core | Split `---`-delimited YAML from Markdown body | `yaml` only | `parseFrontmatter(text) → {data, body}` |
| `schema.js` | Pure core | Validate a skill object against Motto's rules | nothing | `validateSkill(skill, sharedRefs?) → errors[]` |
| `config.js` | IO shell | Read and validate `motto.yaml` from disk | `node:fs`, `yaml` | `loadConfig(projectDir) → config` |
| `discover.js` | IO shell | Walk `skills/*/SKILL.md` and `shared/references/` | `node:fs`, `frontmatter.js` | `discoverSkills(projectDir) → {skills, sharedRefs}` |
| `lint.js` | Orchestration | Compose discovery + per-skill validation into one result | `discover.js`, `schema.js` | `lint(projectDir) → {ok, errors, count}` |
| `build.js` | Orchestration + IO | Lint-guard, load config, wipe+write `dist/` | `lint.js`, `discover.js`, `config.js`, `node:fs` | `build(projectDir, outDir?) → {ok, outDir}` or throws |
| `bin/motto.js` | CLI entry | Parse argv, call lint/build, format output, exit | `lint.js`, `build.js` | (executable) |

## Recommended Project Structure

```
motto/
├── bin/
│   └── motto.js          # CLI entry — thin; no business logic
├── src/
│   ├── frontmatter.js    # Pure: parse YAML frontmatter from text
│   ├── schema.js         # Pure: validate skill {data, body} → errors[]
│   ├── config.js         # IO: read motto.yaml → config object
│   ├── discover.js       # IO: walk fs → {skills[], sharedRefs}
│   ├── lint.js           # Orchestrate: discover + validate → {ok, errors, count}
│   └── build.js          # Orchestrate + emit: lint-guard + write dist/
├── test/
│   ├── frontmatter.test.js
│   ├── schema.test.js
│   ├── config.test.js
│   ├── discover.test.js
│   ├── lint.test.js
│   ├── build.test.js
│   └── fixtures/
│       └── sample/       # real-directory fixture for IO tests
│           ├── motto.yaml
│           ├── skills/
│           │   ├── hello/SKILL.md
│           │   └── secret/SKILL.md
│           └── shared/references/voice.md
├── package.json          # type:module, bin:motto, deps:{yaml}
└── motto.yaml            # the repo's own Motto config (dog-fooded)
```

### Structure Rationale

- **`src/` flat, not nested:** Seven files total. No subdirectory complexity justified by size. Alphabetical import paths are easy to read.
- **`bin/` separate from `src/`:** Entry point is not a library module. The shebang and `process.argv` live in one file only; nothing else calls `process.exit`.
- **`test/fixtures/sample/`:** A real on-disk project used by all IO tests. Avoids mocking `node:fs`; exercises the full path from disk read to parsed output. Pure-module tests use no fixtures at all.

## Architectural Patterns

### Pattern 1: Functional Core / Imperative Shell

**What:** Pure functions that operate on plain data live in the core (`frontmatter.js`, `schema.js`). Functions with side effects (filesystem reads/writes) live at the shell (`config.js`, `discover.js`, `build.js`). The shell calls the core; the core never calls the shell.

**When to use:** Any CLI where the core logic is transformations over data (parse, validate, compute). This project is a canonical fit: frontmatter parsing is `string → object`; validation is `object → errors[]`. Both are referentially transparent.

**Trade-offs:** Adds one level of indirection (callers must fetch data and pass it in). Worth it: pure modules are testable with zero I/O setup, the boundary makes the dependency graph explicit, and the shell is trivially thin.

**The boundary in Motto:**
```
// Pure — testable with assert.deepEqual, no fixtures needed
validateSkill({ dirName: 'my-skill', data: {...}, body: '...' }, new Set(['voice']))

// Shell — accepts a path, reads disk, returns plain data
discoverSkills('/path/to/project')
// => { skills: [{dirName, dir, data, body}], sharedRefs: Set }
```

### Pattern 2: Lint-Guard Composition

**What:** `build` reuses `lint` as its first step. On lint failure, `build` throws immediately with the lint result attached (`err.lint = {ok, errors, count}`) and writes nothing to disk. The CLI catches this and prints lint errors the same way `motto lint` would.

**When to use:** Any pipeline where a downstream step must not run on invalid input. Avoids silent production of corrupt output.

**Trade-offs:** `build` calls `discoverSkills` twice (once inside `lint`, once again for skill paths during emission). Acceptable for this problem size; a future optimization would pass the result through. Do not optimize prematurely.

```js
export function build(projectDir, outDir = join(projectDir, 'dist')) {
  const result = lint(projectDir)   // lint = discover + validateSkill
  if (!result.ok) {
    const err = new Error('lint failed; build aborted')
    err.lint = result               // CLI reads err.lint.errors for output
    throw err
  }
  // ... emit phase (config load, wipe outDir, copy skills + refs, write plugin.json)
}
```

### Pattern 3: Error Accumulation over Early Return

**What:** `validateSkill` collects all violations in an `errors[]` array and returns it. `lint` accumulates across all skills. The user sees every problem in one run.

**When to use:** Any validation pass where seeing the first error hides the others. Lint tools universally do this.

**Trade-offs:** Slightly more complex than `throw` on first error, but a linter that stops at the first `missing description` in skill #1 and forces repeated runs is hostile.

```js
// schema.js
const errors = []
const push = (message) => errors.push({ skill: dirName, message })

if (!data.description) push('frontmatter: missing description')
if (!['public', 'private'].includes(data.audience)) push(...)
// ... accumulate all, then:
return errors
```

## Data Flow

### Command: `motto lint`

```
argv → [cmd='lint']
                ↓
         lint(cwd)
           ↓
     discoverSkills(cwd)
       ├── readdirSync('skills/') → dirNames
       ├── readFileSync(SKILL.md) → text
       ├── parseFrontmatter(text) → {data, body}   [pure]
       └── readdirSync('shared/references/') → sharedRefs
           ↓
     {skills: [{dirName, dir, data, body}], sharedRefs: Set<string>}
           ↓
     for each skill:
       validateSkill(skill, sharedRefs) → errors[]   [pure]
           ↓
     {ok: bool, errors: [{skill, message}], count: n}
           ↓
     CLI: if ok → console.log('✓ N skills OK') + exit(0)
          else → console.error per error + exit(1)
```

### Command: `motto build`

```
argv → [cmd='build']
                ↓
         build(cwd)
           ├── lint(cwd) ──────────────────── (full lint flow above)
           │   if !ok → throw err (err.lint = result)
           │                   ↓ (only if lint passes)
           ├── loadConfig(cwd)     → {name, version, plugins:{public, private?}}
           ├── discoverSkills(cwd) → {skills, sharedRefs}  (re-scan for paths)
           ├── rmSync(outDir, {recursive:true, force:true})
           └── for each skill:
               ├── cpSync(skill.dir → dist/<audience>/<dirName>/)
               └── for each shared_reference:
                   copyFileSync(shared/references/<ref>.md
                              → dist/<audience>/<dirName>/references/<ref>.md)
               writeFileSync(dist/<audience>/.claude-plugin/plugin.json)
                 content: {name: config.plugins[audience], version, description}
                           ↓
              {ok: true, outDir: 'dist/'}
                           ↓
     CLI: console.log('✓ built → dist/')
```

### Key Data Shapes

```js
// Skill object — the lingua franca between discover, schema, lint, build
{ dirName: string,    // folder name; schema checks name===dirName
  dir: string,        // absolute path to skills/<dirName>/
  data: object,       // parsed YAML frontmatter {name, description, audience, ...}
  body: string }      // everything after the closing ---

// Lint error — accumulator item
{ skill: string,      // dirName of the offending skill
  message: string }   // human-readable rule violation

// Lint result — lint() return value and err.lint shape
{ ok: boolean, errors: [{skill, message}], count: number }

// Config — loadConfig() return value
{ name: string, version: string, description: string,
  plugins: { public: string, private?: string } }
```

## Dependency Graph (Build Order)

This graph governs task sequencing — each level can be built independently; later levels depend on earlier ones.

```
Level 0 — Pure, no deps (build first; maximally testable)
  frontmatter.js    (depends on: yaml only)
  schema.js         (depends on: nothing)

Level 1 — IO, depend on Level 0 or nothing
  config.js         (depends on: yaml, node:fs — no Level 0 deps)
  discover.js       (depends on: frontmatter.js, node:fs)

Level 2 — First composition
  lint.js           (depends on: discover.js + schema.js)

Level 3 — Full system
  build.js          (depends on: lint.js + discover.js + config.js + node:fs)
  bin/motto.js      (depends on: lint.js + build.js)
```

**Phase mapping implication:** Level 0 + 1 = Phase 1 (pure modules + IO adapters); Level 2 = Phase 2 (first integration); Level 3 = Phase 3 (full CLI). Tests at each level require nothing from the level above, so phases are independently verifiable.

## Anti-Patterns

### Anti-Pattern 1: IO Inside Validators

**What people do:** Call `readFileSync` inside `validateSkill` (e.g., to check if a referenced file exists on disk).

**Why it's wrong:** The validator becomes untestable without real fixtures. It can no longer be called with synthesized in-memory objects. Error cases that are hard to create on disk become hard to test.

**Do this instead:** Resolve shared refs in `discoverSkills` into a `Set<string>`, pass it as a parameter to `validateSkill`. The validator stays pure; the set comes from the IO layer.

### Anti-Pattern 2: Business Logic in the CLI Entry

**What people do:** Put frontmatter parsing, error formatting rules, or path resolution in `bin/motto.js`.

**Why it's wrong:** CLI entry is untestable (it calls `process.exit`). Logic in the CLI can't be unit-tested or reused from a programmatic API.

**Do this instead:** The CLI entry does exactly three things: parse argv, call `lint()` or `build()`, format and print the returned/thrown value. All logic lives in `src/`.

### Anti-Pattern 3: Throwing on First Validation Error

**What people do:** `if (!data.description) throw new Error(...)` inside the validator.

**Why it's wrong:** The user runs `motto lint`, fixes the first error, runs again, sees the next. Repeat five times. The linter is an antagonist.

**Do this instead:** Accumulate all errors in an array and return it. Let the caller decide whether to print and exit (CLI) or inspect (tests).

### Anti-Pattern 4: Stripping Frontmatter at Build

**What people do:** Strip Motto-specific frontmatter keys (`audience`, `shared_references`) from `SKILL.md` before copying to `dist/`.

**Why it's wrong:** Adds a content-transform step that can introduce bugs and fights the verbatim-copy principle. Unknown frontmatter keys are harmless to agents; portability requires no build-time mutation.

**Do this instead:** `cpSync(skill.dir, dest, { recursive: true })` — verbatim copy. No content transform.

### Anti-Pattern 5: Discarding the lint Result in build

**What people do:** Run lint inside build but catch and re-throw without attaching the lint result — the CLI can only print "lint failed" with no details.

**Why it's wrong:** The user loses all diagnostic context. The `motto lint` output and `motto build` failure output should be identical in their error listing.

**Do this instead:** `err.lint = result; throw err` — the lint result rides with the error, and the CLI can print every violation the same way `motto lint` would.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Contract |
|----------|---------------|----------|
| `discover.js` → `frontmatter.js` | Direct ESM import call | `parseFrontmatter(text: string) → {data, body}` — throws on missing `---` block |
| `lint.js` → `discover.js` | Direct ESM import call | `discoverSkills(projectDir) → {skills, sharedRefs}` — returns empty arrays if dirs absent |
| `lint.js` → `schema.js` | Direct ESM import call | `validateSkill(skill, sharedRefs) → errors[]` — never throws; returns `[]` for valid skills |
| `build.js` → `lint.js` | Direct call; throw protocol | `lint(projectDir)` — `build` checks `result.ok`; failure path: `err.lint = result; throw err` |
| `build.js` → `config.js` | Direct ESM import call | `loadConfig(projectDir) → config` — throws listing all missing required fields |
| `bin/motto.js` → `lint.js` / `build.js` | Direct call; exit codes | Return value → exit 0; thrown Error → print `err.message` or `err.lint.errors` → exit 1 |

### External Dependencies

| Dependency | Role | Why this one |
|------------|------|-------------|
| `yaml` (npm) | Parse YAML frontmatter + motto.yaml | Only runtime dep; avoids hand-rolling a YAML parser. `^2.x` is stable, well-maintained, pure JS. |
| `node:fs` (stdlib) | File system IO in shell modules | Built-in; `cpSync` (Node 16.7+), `rmSync` (Node 14.14+), `readdirSync`, `readFileSync` all available in Node ≥20. |
| `node:test` (stdlib) | Test runner | Built-in in Node ≥18, stable in Node ≥20. Zero install cost. Sufficient for this problem size. |
| `node:path`, `node:url` | Path resolution in IO modules | Built-in; `join`, `dirname`, `fileURLToPath` cover all needs. |

## Scaling Considerations

This is a local developer tool. User count is not the scaling dimension. The relevant dimension is **number of skills in a project**.

| Scale | Behavior |
|-------|----------|
| 1–50 skills | Synchronous `readdirSync` + `readFileSync` in a loop is fast enough. No change needed. |
| 50–500 skills | Lint may be perceptibly slow. Add `--parallel` with `Promise.all` over `readFile` calls. Not needed in v1. |
| 500+ skills | Unlikely for the use case (author tooling, not a monorepo build system). If reached, stream results rather than collecting all errors in memory first. |

The only real scaling concern for v1 is the **double discoverSkills call in build** (once inside lint, once for emission paths). For 50 skills this is a millisecond difference; for 500 it matters. Optimization path: pass the lint result's skill list directly to the emit phase. Defer until it is measurably slow.

## Sources

- `.planning/superpowers/specs/2026-06-29-motto-design.md` — authoritative design, approved (HIGH confidence)
- `.planning/superpowers/plans/2026-06-30-motto-core-cli.md` — authoritative implementation plan with interfaces and TDD steps (HIGH confidence)
- Functional Core / Imperative Shell: Gary Bernhardt (2012 "Boundaries" talk); pattern is stable, widely documented in Node CLI literature (MEDIUM confidence)
- Node.js stdlib `node:test` runner: Node.js docs v20+ (MEDIUM confidence)

---
*Architecture research for: Motto — Node.js lint/build CLI for Claude Code Agent Skills*
*Researched: 2026-06-30*
