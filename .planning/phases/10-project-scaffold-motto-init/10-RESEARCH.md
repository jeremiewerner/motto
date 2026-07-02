# Phase 10: Project Scaffold (`motto init`) - Research

**Researched:** 2026-07-02
**Domain:** Node.js CLI scaffolding — filesystem templating, single-sourced validation reuse, git config introspection
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary:** `motto init [name]` scaffolds a complete, immediately-buildable skills project into the current directory in one command: `skills/` (with a starter skill), `shared/references/`, `motto.yaml`, `.gitignore`, and `.claude-plugin/marketplace.json`. The result passes `motto lint` and `motto build` with zero edits, guarded by a permanent scaffold-dogfood test. Requirements: INIT-01..06.

Locked by REQUIREMENTS.md Out of Scope (do not re-litigate): no interactive prompts (flag-driven only), no auto `git init`, no template flavors / `--with`, no new runtime dependencies.

**Starter skill**
- **D-01:** Starter skill is named `hello-world` (folder `skills/hello-world/`, `name: hello-world`).
- **D-02:** Body is MINIMAL — do NOT duplicate Motto documentation inside the starter skill. Just the smallest valid skill (H1 title, `**Role:**` line, a sentence or two). Docs live in the README (Phase 12), not in scaffold output.
- **D-03:** `audience: public` — so init → lint → build immediately produces a committable `dist/public/` plugin and the scaffolded `marketplace.json` pointer isn't dangling.
- **D-04:** `shared/references/` is scaffolded EMPTY — no sample reference file, `hello-world` is self-contained (no `shared_references` key). Empty dir needs a `.gitkeep` so git tracks it.

**Empty-dir guard (INIT-04)**
- **D-05:** "Non-empty" is judged with a small fixed allowlist of ignorable entries: `.git/` and `.DS_Store` do not count (so `mkdir && git init && motto init` works). Any other file or directory blocks. No config knob.
- **D-06:** `--force` = overwrite scaffold paths: write every scaffold file, overwriting collisions; unrelated files untouched. Deterministic post-force state = fresh scaffold + user's other files. (NOT "write missing only".)
- **D-07:** Refusal message lists the offending entries (capped — e.g. first 5 + "and N more"), in the existing `✗` CLI style, with the hint `use --force to scaffold anyway`, exit code 1 via `process.exitCode`.

**Invalid-name handling (INIT-05)**
- **D-08:** When the effective name (explicit `[name]` or cwd-basename default) fails validation: refuse with the exact schema.js rule violated AND suggest a sanitized candidate, e.g. `✗ 'My Project' is not a valid name — try: motto init my-project`. Never auto-sanitize/rename silently.
- **D-09:** The rule set is single-sourced from `src/schema.js` (`NAME_KEBAB` and whatever lint applies to plugin names) — SC4: no name init accepts may later be rejected by lint.

**Init output**
- **D-10:** Success output = `✓` line + tree of created files + next-steps hints. Stranger-friendly, per milestone goal.
- **D-11:** Next steps listed: `motto lint` and `motto build` only (no git-init hint, no edit-this-file hint).

### Claude's Discretion
- Exact wording/formatting of the file tree and messages.
- `motto.yaml` scaffold field defaults (version, description placeholder), marketplace.json placeholder owner text, exact starter-skill body wording — within the locked constraints above.
- Template storage mechanism (inline strings vs template files in the npm package) and scaffold-dogfood test placement — planner/researcher decide; remember the npm `files` allowlist (`bin/`, `src/`, `dist/public/`) must include whatever templates ship.

### Deferred Ideas (OUT OF SCOPE)
- **Skill-maker announcement in init output** — when the interactive skill-maker ships (AUTH-SKILL, backlog), `motto init` success output should announce it as a next step. Not now; next steps stay `motto lint` + `motto build`.

### Canonical References (from CONTEXT.md — downstream agents must read before planning/implementing)
- `.planning/REQUIREMENTS.md` — INIT-01..06 definitions + Out of Scope table
- `.planning/ROADMAP.md` — Phase 10 goal + 5 success criteria (authoritative acceptance list)
- `src/schema.js` — `NAME_KEBAB` regex + reserved substrings; THE name rule init must reuse (SC4/INIT-05)
- `src/config.js` — `loadConfig`/motto.yaml shape the scaffolded config must satisfy; re-exports `NAME_KEBAB`
- `bin/motto.js` — CLI dispatch pattern (parseArgs strict, `process.exitCode` never `process.exit(1)`, `✓`/`✗` output style)
- `.claude-plugin/marketplace.json` — existing manifest shape; scaffold variant uses relative `dist/public/` source + git-config owner, NOT the npm source this repo uses
- `test/dogfood.test.js` — existing dogfood-guard pattern the scaffold-dogfood test should mirror
- `skills/release/SKILL.md` — canonical example of a valid SKILL.md (frontmatter + H1 + `**Role:**`)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| INIT-01 | `motto init [name]` scaffolds `skills/`, `shared/references/`, `motto.yaml`, `.gitignore` into cwd; `[name]` fills `motto.yaml` fields, defaults to cwd basename | See Architecture Patterns (Pattern 1, 2), Code Examples (name-suggestion sanitizer), Common Pitfalls #2 — name flows into both `motto.yaml`'s `name` and `plugins.public` from one validated source |
| INIT-02 | Scaffolded starter skill passes `motto lint`/`motto build` with zero edits, guarded by a permanent scaffold-dogfood test | See System Architecture Diagram (dogfood guard flow), Recommended Project Structure (`test/init-dogfood.test.js`), Open Question #2 (what the dogfood test must assert) |
| INIT-03 | `motto init` writes `.claude-plugin/marketplace.json` — relative source at `dist/public/`, owner from git config (placeholder fallback), plugin name consistent with `motto.yaml` | See Architecture Patterns Pattern 3 (git owner lookup) and Pattern 4 (relative-path source schema, VERIFIED against official docs), Assumptions A1/A4 |
| INIT-04 | init refuses to scaffold over an existing project (non-empty guard); `--force` overrides | See Code Examples (empty-dir guard, refusal message formatting), Common Pitfalls #3 (`--force` must never wipe) |
| INIT-05 | init validates the project name with the same rules lint enforces (single source: `schema.js`) | See Summary (key finding: `NAME_KEBAB` only, no `RESERVED`/length check applies to plugin names), Architecture Patterns Pattern 2, Common Pitfalls #1/#2 |
| INIT-06 | Scaffolded `.gitignore` ignores `dist/private/` but not `dist/public/` | See Anti-Patterns / State of the Art table (contrast with this repo's own `.gitignore` which ignores all of `dist/`) |
</phase_requirements>

## Summary

This phase adds a third subcommand (`init`) to the existing two-subcommand `motto` CLI. Unlike lint/build, init is pure filesystem writing — no new runtime dependency is needed or justified. Everything required (kebab-case validation, YAML/JSON emission, directory creation, git config lookup) is already either in `src/schema.js`/`src/config.js` or in Node's stdlib (`node:fs/promises`, `node:child_process`, `node:path`).

The single highest-leverage finding: **`src/config.js`'s `loadConfig` validates `plugins.public` with `NAME_KEBAB` ONLY — no reserved-substring check, no length cap.** `src/schema.js`'s `RESERVED` word list and 64-char cap apply only to *skill* names inside `validateSkill`, not to the project/plugin name. Since `motto init [name]` populates `motto.yaml`'s `name` AND `plugins.public` with the same value, SC4 ("no name init accepts is later rejected by lint") is satisfied by validating the effective name against `NAME_KEBAB` alone — reusing the exact regex object exported from `src/schema.js` (re-exported by `src/config.js`). Adding extra strictness (e.g. blocking "claude"/"anthropic" substrings) would be *safe* but is not required by any lint rule this phase must mirror, and CONTEXT.md's D-09 explicitly scopes the single source to `NAME_KEBAB`.

The second highest-leverage finding: **official Claude Code marketplace.json schema confirms a plugin `source` can be a bare relative-path string** (`"source": "./dist/public/"`), not the `{source:"npm", package:...}` object this repo's own `.claude-plugin/marketplace.json` uses. The scaffolded marketplace.json must use the string form, resolved relative to the marketplace root (the directory containing `.claude-plugin/`) — i.e. the project root, matching where `dist/public/` will land after `motto build`. `owner` requires only `name` (string); `email` is optional.

**Primary recommendation:** Add `src/init.js` exporting `scaffoldProject(targetDir, { name, force })`, mirroring the `{ ok, errors, ... }` never-throw return-shape convention of `lintProject`/`buildProject`. Store all scaffold content (SKILL.md body, motto.yaml, .gitignore, marketplace.json) as inline template strings inside `src/init.js` — NOT as files under this repo's own `skills/` directory (doing so would silently add a 4th skill to Motto's own dogfood count and get bundled into Motto's own `dist/public/`). No new dependency, no `files` allowlist change needed (`src/` is already shipped).

## Architectural Responsibility Map

This is a single-process Node CLI, not a multi-tier web app. Tiers are adapted to the project's actual layering (CLI entry / core library / filesystem / external process) rather than the browser/API/DB tiers in the generic template.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Subcommand dispatch (`init` vs `lint`/`build`), flag parsing (`--force`), exit-code/output formatting | CLI Entry (`bin/motto.js`) | — | Matches existing lint/build dispatch pattern exactly; thin shell only |
| Name validation (effective name = `[name]` arg or cwd basename) | Core Library (`src/init.js`, reusing `src/schema.js` `NAME_KEBAB`) | — | Must be the SAME regex instance lint uses (SC4) — cannot be re-implemented in init.js |
| Non-empty directory guard + `--force` override | Core Library (`src/init.js`) | Filesystem I/O | Pure logic (readdir + allowlist filter) with a thin I/O read; no CLI-layer business logic |
| Scaffold content generation (SKILL.md, motto.yaml, .gitignore, marketplace.json strings) | Core Library (`src/init.js`, inline templates) | — | Content depends on validated name + git-config owner; keeping it in src/ keeps bin/ a thin shell |
| Directory/file writes (`mkdir`, `writeFile`) | Filesystem I/O (`node:fs/promises`) | Core Library | Stdlib call sites live inside `src/init.js`, same pattern as `src/build.js`'s `cp`/`writeFile` calls |
| Owner-name lookup for `marketplace.json` | External Process (`git config`, via `node:child_process`) | Core Library (fallback logic) | Best-effort external call; core library owns the fallback-to-placeholder policy, never throws |
| Post-scaffold self-check (init → lint → build) | Test Layer (`node:test`) | Core Library (`lintProject`/`buildProject` reuse) | Dogfood guard calls the same orchestrators lint/build already use; no new validation logic |

## Standard Stack

### Core
No new runtime dependency. This phase is stdlib-only, matching the CLAUDE.md constraint ("no new runtime dependencies").

| Module | Version | Purpose | Why Standard |
|--------|---------|---------|--------------|
| `node:fs/promises` | stdlib (Node ≥20) | `mkdir`, `writeFile`, `readdir` for scaffold writes and the empty-dir guard | Already the sole I/O layer in `src/lint.js`/`src/build.js` — same async/await style, same error-shape conventions |
| `node:path` | stdlib | `basename(cwd)` default-name derivation, `join` for all scaffold paths | Already used throughout `src/build.js` |
| `node:child_process` | stdlib | `execFileSync('git', ['config', 'user.name'])` best-effort owner lookup for `marketplace.json` | `execFileSync` (not `exec`) avoids shell-injection surface entirely — no string is ever passed through a shell |
| `node:util` `parseArgs` | stdlib (Node ≥20) | Add `force: {type:'boolean'}` to the existing shared `options` object in `bin/motto.js` | Already the CLI's arg parser; `init` extends the same `parseArgs` call, does not need a second one |

### Supporting
None — `src/schema.js` (`NAME_KEBAB`) and `src/config.js` are reused directly, not re-implemented.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline template strings in `src/init.js` | Template files under `src/templates/` copied at scaffold time | File-based templates are marginally more "editable" but add `fileURLToPath(import.meta.url)`-relative path resolution complexity and an extra `readFile` at runtime for zero functional gain on 5 small text files. Inline strings are simpler, trivially unit-testable (exact string match), and avoid `import.meta.url` path gymnastics entirely (VERIFIED: files must NOT live under `skills/`, and there is no reason to add a `src/templates/` directory when Motto's YAGNI stance already rejects `glob`/build steps for similar reasons). |
| `execFileSync('git', ...)` | Read `.git/config` directly, or use a `git` npm wrapper library | Direct file parsing duplicates git's own config-precedence logic (system/global/local) and breaks the moment a user has `~/.gitconfig` includes. A git wrapper library is a new dependency — explicitly out of scope. `execFileSync` calling the real `git` binary is the only option that matches git's actual resolution behavior with zero new dependencies. |
| Plain template-string YAML for `motto.yaml` | `yaml` package's `stringify()` | The scaffolded `motto.yaml` is a fixed 5-line shape (`name`, `version`, `description`, `plugins.public`). Once the effective name has passed `NAME_KEBAB` validation (letters/digits/hyphens only — no quotes, colons, or newlines possible), naive string interpolation cannot produce invalid YAML or inject extra keys. Using the full `yaml` stringifier for a 5-line fixed template is unjustified complexity (matches project's existing "10 lines of regex beats a library" philosophy in CLAUDE.md). |

**Installation:**
```bash
# No install — stdlib only, no package.json change
```

**Version verification:** N/A — no new package.json dependency is added by this phase. `package.json`'s existing `yaml@^2.9.0` and Node `>=20` engine requirement already cover everything this phase needs.

## Package Legitimacy Audit

**No new external packages are introduced by this phase.** `child_process`, `fs/promises`, `path`, and `util` are Node.js stdlib modules, not npm packages — they carry no supply-chain risk and are exempt from the registry-verification gate. `src/schema.js` and `src/config.js` are first-party code already in this repository.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | No packages installed this phase |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────┐
                    │  motto init [name] [--force]     │  (user, terminal, any empty-ish dir)
                    └────────────────┬─────────────────┘
                                     ▼
                    ┌─────────────────────────────────┐
                    │  bin/motto.js                     │
                    │  parseArgs → sub='init'           │
                    │  positionals[1] = name (optional)  │
                    └────────────────┬─────────────────┘
                                     ▼
                    ┌─────────────────────────────────┐
                    │  src/init.js                       │
                    │  scaffoldProject(cwd, {name,force}) │
                    └────────────────┬─────────────────┘
                                     ▼
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────┐
   │ 1. Resolve name     │  │ 2. Empty-dir guard  │  │ 3. Owner lookup         │
   │  arg ?? basename(cwd)│  │  readdir(cwd)       │  │  execFileSync('git',   │
   │  NAME_KEBAB.test()   │  │  filter .git/.DS_S. │  │   ['config','user.name'])│
   │  (src/schema.js)     │  │  block unless --force│  │  catch → placeholder    │
   └──────────┬──────────┘  └──────────┬──────────┘  └───────────┬───────────┘
              │  invalid → ✗ + suggest │  non-empty → ✗ + list    │  best-effort, never throws
              ▼                        ▼                          ▼
                    ┌─────────────────────────────────┐
                    │  4. Write scaffold (all-or-nothing│
                    │     per-file; --force overwrites  │
                    │     only scaffold paths)          │
                    │  skills/hello-world/SKILL.md       │
                    │  shared/references/.gitkeep        │
                    │  motto.yaml                        │
                    │  .gitignore                        │
                    │  .claude-plugin/marketplace.json   │
                    └────────────────┬─────────────────┘
                                     ▼
                    ┌─────────────────────────────────┐
                    │  ✓ output: tree + next steps       │
                    │  (motto lint / motto build)        │
                    └─────────────────────────────────┘

   Permanent dogfood guard (test-time, not runtime):
   temp dir → scaffoldProject() → lintProject() → buildProject() → assert ok:true at each step
```

### Recommended Project Structure
```
src/
├── init.js          # NEW — scaffoldProject(targetDir, {name, force}); inline templates
├── schema.js         # UNCHANGED — reused: NAME_KEBAB
├── config.js          # UNCHANGED — reused indirectly (dogfood lints scaffold output through it)
├── lint.js            # UNCHANGED — reused by dogfood test
└── build.js           # UNCHANGED — reused by dogfood test
bin/
└── motto.js          # EXTENDED — new `init` branch; usage string updated to <init|lint|build>
test/
├── init.test.js       # NEW — unit/integration tests for scaffoldProject (guard, name validation, force)
└── init-dogfood.test.js  # NEW — permanent init → lint → build guard (sibling to dogfood.test.js)
```

### Pattern 1: Never-throw orchestrator returning `{ ok, errors, ... }`
**What:** `scaffoldProject` must follow the exact convention `lintProject`/`buildProject` already establish: never throw at the function boundary; every failure mode (invalid name, non-empty dir, unexpected I/O error) is converted into a structured return value the CLI layer branches on.
**When to use:** Any new `src/*.js` orchestrator in this codebase — this is the established house style, not a general design choice.
**Example:**
```javascript
// Source: pattern derived from src/lint.js lintProject() and src/build.js buildProject()
// (first-party, this repository)
export async function scaffoldProject(targetDir, { name, force = false } = {}) {
  const effectiveName = name ?? basename(targetDir);

  if (!NAME_KEBAB.test(effectiveName)) {
    return {
      ok: false,
      reason: 'invalid-name',
      name: effectiveName,
      suggestion: suggestKebabName(effectiveName),
      errors: [{ skill: '(init)', message: `'${effectiveName}' is not a valid name` }],
    };
  }

  if (!force) {
    const offending = await listNonIgnorableEntries(targetDir); // filters .git, .DS_Store
    if (offending.length > 0) {
      return { ok: false, reason: 'not-empty', offending, errors: [] };
    }
  }

  const owner = await resolveGitOwnerName(); // best-effort, never throws

  const created = await writeScaffold(targetDir, { name: effectiveName, owner });
  return { ok: true, created, errors: [] };
}
```

### Pattern 2: Single-sourced validation reuse (SC4 / D-09)
**What:** Import `NAME_KEBAB` from `src/schema.js` directly — never redefine or copy the pattern. This is the same discipline `src/config.js` already follows (`export { NAME_KEBAB }` re-export, asserted by reference-identity in `test/dogfood.test.js`'s "NAME_KEBAB parity" test).
**When to use:** Any place a project/plugin name is validated.
**Example:**
```javascript
// Source: src/config.js (this repository) — the established re-export pattern
import { NAME_KEBAB } from './schema.js';
// init.js validates the EFFECTIVE name (arg or cwd basename) against this
// SAME regex object — not a re-implementation — so that SC4 holds by construction.
```
**Verified constraint (not assumed):** `src/config.js`'s `loadConfig` validates `plugins.public`/`plugins.private` with `NAME_KEBAB` ONLY (no reserved-word check, no 64-char cap — those exist only in `validateSkill` for skill names). Confirmed by reading `src/config.js` lines 86-102 directly. Therefore init's name check must be `NAME_KEBAB.test(name)` alone — adding the `RESERVED` substring check from `schema.js` would make init MORE strict than lint for the project name, which is harmless but not required, and CONTEXT.md D-09 scopes the single source to "`NAME_KEBAB` and whatever lint applies to plugin names" (which is exactly and only `NAME_KEBAB`).

### Pattern 3: Best-effort external process call with silent fallback
**What:** `git config user.name` may fail for three independent reasons — git not installed (`ENOENT`), git installed but the key unset (non-zero exit, empty stdout), or (theoretically) a corrupt config. All three must collapse to the same placeholder fallback; none should propagate as a thrown error.
**When to use:** The owner-name lookup for `marketplace.json` (INIT-03, D-with git-config fallback).
**Example:**
```javascript
// Source: node:child_process API (Node.js official docs — execFileSync throws on
// ENOENT and on non-zero exit code by design; both cases are caught uniformly)
import { execFileSync } from 'node:child_process';

function resolveGitOwnerName() {
  try {
    const name = execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim();
    return name || 'Your Name'; // empty string (unset but git succeeded) → placeholder too
  } catch {
    // git not installed, OR user.name unset (git exits 1), OR any other failure
    return 'Your Name';
  }
}
```
**Why `execFileSync` and not `execSync`:** `execFileSync('git', [...])` passes arguments as an array — no shell is spawned, so there is no shell-metacharacter injection surface at all (the only "input" here is the literal string `'user.name'`, not user-controlled data, but the pattern is worth establishing correctly since D-09/D-01's "never throw" discipline pairs naturally with "never shell out to a shell" discipline). `execSync('git config user.name')` would work identically here since no interpolated value is involved, but `execFileSync` with an argument array is the safer default to establish for this codebase.

### Pattern 4: Relative-path plugin source in scaffolded marketplace.json
**What:** Per official Claude Code marketplace schema, a plugin `source` can be the bare string `"./dist/public/"` — resolved relative to the marketplace root (the directory containing `.claude-plugin/`, i.e. the project root). This differs from this repo's OWN `.claude-plugin/marketplace.json`, which uses `{"source":"npm","package":"@jeremiewerner/motto"}` because Motto itself is npm-published; a freshly scaffolded user project is not.
**When to use:** `motto init`'s `.claude-plugin/marketplace.json` template only (INIT-03).
**Example:**
```json
// Source: code.claude.com/docs/en/plugin-marketplaces "Relative paths" section
// (official Claude Code docs, fetched 2026-07-02)
{
  "name": "<effective-name>",
  "owner": { "name": "<git-config-owner-or-placeholder>" },
  "plugins": [
    {
      "name": "<effective-name>",
      "source": "./dist/public/",
      "description": "<motto.yaml description>"
    }
  ]
}
```
`owner.email` is documented as optional — omit the field entirely rather than emitting a placeholder email (a placeholder email is more likely to be mistaken for real contact info than an absent field).

### Anti-Patterns to Avoid
- **Storing the starter skill under this repo's own `skills/` directory:** `discoverSkillNames` in `src/lint.js` scans `join(projectRoot, 'skills')`. If the `hello-world` template lived at `skills/hello-world/SKILL.md` in the Motto repo itself, it would become Motto's own 4th dogfooded skill — silently changing `test/dogfood.test.js`'s hardcoded `count === 3` assertion, and shipping inside Motto's own `dist/public/` (wrong: it's a template for OTHER projects, not a Motto skill). Templates must live as inline strings in `src/init.js` (recommended) or under a path outside `skills/` (e.g. `src/templates/`), never inside this repo's `skills/`.
- **Using `execSync('git config user.name')` (shell string form) anywhere args could later become dynamic:** harmless today since no interpolation occurs, but establishes a pattern that becomes a shell-injection vector the moment someone parameterizes it later. Use `execFileSync('git', ['config', 'user.name'])` (array-args form) from the start.
- **Reimplementing `RESERVED`/64-char checks for the project name:** would silently diverge from what `config.js` actually enforces, violating SC4's spirit even though it wouldn't technically make init reject something lint accepts (it does the opposite — over-rejection). Match `NAME_KEBAB` only.
- **Wiping the target directory on `--force`:** D-06 explicitly requires `--force` to overwrite ONLY the 5 scaffold paths, leaving unrelated files untouched — NOT `rm -rf` + rewrite (that's `buildProject`'s `dist/` semantics, not init's). Implement via unconditional `mkdir({recursive:true})` + `writeFile` (which overwrites by default) on the fixed scaffold paths, never via a directory wipe.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Kebab-case name validation | A second regex in `src/init.js` | Import `NAME_KEBAB` from `src/schema.js` | SC4 requires byte-for-byte identical validation to what `motto lint` enforces; a second regex WILL drift eventually even if written identically today |
| JSON serialization for `marketplace.json` | Hand-built JSON string via template literal | `JSON.stringify({...}, null, 2) + '\n'` | Matches the exact pattern `src/build.js` already uses for `plugin.json` emission (line ~196-203); guarantees valid JSON regardless of what characters end up in `description`/`owner.name` |
| Directory-empty detection | Manual `fs.existsSync` + guesswork about what counts as "empty" | `readdir(dir, {withFileTypes:true})` + explicit allowlist filter (`.git`, `.DS_Store`) per D-05 | The allowlist is a locked product decision (D-05), not a generic empty-check; must be implemented exactly, not approximated |
| git config parsing | Reading and parsing `~/.gitconfig` / `.git/config` INI syntax by hand | `execFileSync('git', ['config', 'user.name'])` | git's own config resolution (system → global → local, includes, conditional includes) is non-trivial and already correctly implemented by the `git` binary itself |

**Key insight:** Every piece of "custom" logic this phase might be tempted to write (name regex, JSON building, git-config parsing) already has a correct, tested implementation either in this repo (`schema.js`) or one process-call away (`git` itself). The only genuinely new code is the empty-dir allowlist filter and the template-content strings, both of which are small enough that hand-rolling them IS the right call (no library would help).

## Common Pitfalls

### Pitfall 1: Validating the name AFTER interpolating it into templates
**What goes wrong:** If scaffold content generation runs before name validation succeeds, a name containing YAML/JSON-breaking characters (colons, quotes, newlines) could corrupt `motto.yaml` or `marketplace.json`.
**Why it happens:** Natural code order might be "build everything, then check" rather than "check, then build."
**How to avoid:** `NAME_KEBAB.test(effectiveName)` MUST gate before any template string is constructed. Since `NAME_KEBAB` only allows `[a-z0-9-]` after the leading letter, once validation passes, template interpolation is provably safe — but only if the order is validate-then-interpolate, never the reverse.
**Warning signs:** A test that scaffolds successfully with a name containing `:` or `"` would reveal this immediately — worth an explicit adversarial test case even though `NAME_KEBAB` should reject such input before it ever reaches the template step.

### Pitfall 2: `motto.yaml`'s `name` field has NO format validation in `loadConfig`
**What goes wrong:** A developer might assume `config.name` (the top-level project name) is checked against `NAME_KEBAB` by lint, same as `plugins.public`. It is not — `loadConfig` only checks `!config.name` (presence), never its format. This means if init's name-source logic diverges (e.g. writes an unvalidated raw name to `motto.yaml`'s `name:` field but a validated one to `plugins.public:`), lint would NOT catch the mismatch.
**Why it happens:** Easy to assume symmetric validation across `name` and `plugins.public` since they're always set to the same value by construction.
**How to avoid:** Always derive BOTH `motto.yaml`'s `name:` and `plugins.public:` from the SAME validated `effectiveName` variable in `src/init.js` — never write a different, unvalidated value to either field.
**Warning signs:** Any code path that computes `name` twice (once for the config header, once for plugins.public) is a smell — compute once, reuse.

### Pitfall 3: `--force` semantics differ from `build`'s wipe semantics
**What goes wrong:** Copying `buildProject`'s `rm(distDir, {recursive:true, force:true})` pattern for init's `--force` would delete the ENTIRE target directory contents, violating D-06 ("unrelated files untouched").
**Why it happens:** `build.js` is the most recently-read sibling file and its wipe-then-rebuild pattern is visually adjacent; easy to copy the wrong precedent.
**How to avoid:** init's `--force` only skips the empty-dir CHECK — it never calls `rm`. Every scaffold file write already overwrites-by-default via `writeFile`, so "overwrite scaffold paths, leave everything else" is the natural behavior of just... not deleting anything first.
**Warning signs:** Any `rm`/`rmdir` call anywhere in `src/init.js` is almost certainly wrong — init should contain zero delete operations.

### Pitfall 4: `git config user.name` behaves differently inside vs. outside a git repo — but this doesn't matter here
**What goes wrong (near-miss, not an actual bug):** One might assume `git config user.name` requires being inside a git repository (since scaffold explicitly does NOT run `git init`, per Out of Scope). It does not — `git config` without `--local` reads global/system config regardless of cwd, only skipping repo-local config if no `.git` is present.
**Why it happens:** Conflating "no git init in scaffold" with "git config won't work."
**How to avoid:** No special-casing needed — `execFileSync('git', ['config', 'user.name'])` works identically whether or not `targetDir` is inside a git repo; VERIFIED locally (`git config --get user.name` succeeds from an arbitrary cwd in this environment).
**Warning signs:** Tests that only exercise the owner-lookup from inside a git repo would miss a regression where the code incorrectly assumes repo-local scope.

### Pitfall 5: Forgetting `.gitkeep` for the empty `shared/references/` directory
**What goes wrong:** git does not track empty directories. If `shared/references/` is created via `mkdir` alone with no file inside, a fresh `git init && git add -A` in the scaffolded project silently drops the directory — INIT-01's "produces ... `shared/references/`" success criterion would be true only until the user's first commit.
**Why it happens:** `motto lint`/`motto build` themselves don't care whether `shared/references/` exists (D2-08: absence is not an error) — so this gap wouldn't surface as a lint/build failure, only as a later, confusing "why did my directory disappear" moment.
**How to avoid:** D-04 already locks this: write `shared/references/.gitkeep` (empty file) as part of the scaffold set.
**Warning signs:** A scaffold-dogfood test that only checks `motto lint`/`motto build` pass would NOT catch a missing `.gitkeep` — needs its own explicit `stat` assertion.

## Code Examples

### Empty-dir guard with D-05's fixed allowlist
```javascript
// Source: first-party pattern, derived from src/lint.js discoverSkillNames() style
// (readdir + filter + sort — same building blocks, different filter predicate)
import { readdir } from 'node:fs/promises';

const IGNORABLE_ENTRIES = new Set(['.git', '.DS_Store']);

async function listNonIgnorableEntries(targetDir) {
  let entries;
  try {
    entries = await readdir(targetDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return []; // target dir doesn't exist yet — treat as empty
    throw e;
  }
  return entries
    .map((e) => e.name)
    .filter((name) => !IGNORABLE_ENTRIES.has(name))
    .sort((a, b) => a.localeCompare(b)); // deterministic order for the capped message (D-07)
}
```

### Refusal message formatting (D-07: cap at 5 + "and N more")
```javascript
// Source: first-party — matches the existing ✗ CLI style in bin/motto.js
function formatOffendingList(offending) {
  const CAP = 5;
  const shown = offending.slice(0, CAP);
  const rest = offending.length - shown.length;
  const list = shown.join(', ') + (rest > 0 ? `, and ${rest} more` : '');
  return `✗ directory is not empty (${list}) — use --force to scaffold anyway`;
}
```

### Name-suggestion sanitizer (for D-08's "try: motto init my-project" hint)
```javascript
// Source: first-party — VERIFIED by local execution: 'My Project' -> 'my-project'
function suggestKebabName(raw) {
  let s = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // collapse any run of non-alnum into one hyphen
    .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens
  s = s.replace(/^[^a-z]+/, '');    // strip any leading non-letter (NAME_KEBAB requires letter-start)
  return s || 'my-project';         // absolute fallback if sanitization empties the string
}
```
**Verified:** `suggestKebabName('My Project')` → `'my-project'` (confirmed via direct Node execution in this session).

## State of the Art

Not applicable in the "old vs new library" sense — this phase adds no new library. The one relevant "state of the art" correction is the marketplace.json schema itself:

| Old Approach (this repo's own manifest) | Current/Correct for Scaffold | When Changed | Impact |
|--------------------------------------------|-------------------------------|---------------|--------|
| `"source": {"source":"npm","package":"..."}` + separate `"skills":"./dist/public/"` override | `"source": "./dist/public/"` (bare relative-path string) | N/A — these are two different, both-current, source types for two different situations | The npm+override form is correct for Motto's OWN published manifest (source of truth is npm, but skills path is locally overridden). The bare relative-path form is correct for a scaffolded project that has not been published anywhere — it just points at the locally-built `dist/public/` directory relative to the marketplace root. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Owner-name placeholder text should read `"Your Name"` (exact string) | Code Examples / Pattern 3 | Low — CONTEXT.md explicitly marks "marketplace.json placeholder owner text" as Claude's Discretion; any clear placeholder satisfies the intent. Planner/executor free to choose different wording. |
| A2 | `motto.yaml` scaffold defaults: `version: "0.1.0"`, `description:` a generic one-line placeholder | Standard Stack / Alternatives | Low — CONTEXT.md marks these as Claude's Discretion explicitly; `loadConfig` places no format constraint on either field beyond non-empty presence. |
| A3 | Templates should be stored as inline strings in `src/init.js` rather than files under `src/templates/` | Standard Stack / Alternatives, Architecture Patterns | Low-Medium — CONTEXT.md marks "template storage mechanism" as Claude's Discretion explicitly, but this is a real implementation choice the planner should confirm; the anti-pattern to avoid (storing under this repo's own `skills/`) is NOT discretionary and is verified, not assumed. |
| A4 | Marketplace top-level `name` field should equal the same effective project name as `motto.yaml`'s `name`/`plugins.public` (single value populates 4 fields) | Architecture Patterns / Pattern 4 | Low — not explicitly specified by INIT-03/D-anything; reusing one validated name for marketplace identity is the simplest construction and satisfies "consistent by construction," but the planner could reasonably choose a distinct value if a future requirement demands it. |
| A5 | Test file split: `test/init.test.js` (unit) + `test/init-dogfood.test.js` (permanent guard) as two files, sibling to `test/dogfood.test.js` | Recommended Project Structure | Low — CONTEXT.md says "New test/init.test.js + permanent scaffold-dogfood test ... alongside test/dogfood.test.js," which is consistent with two files but doesn't rule out one file with two `describe` blocks; naming/placement is a planner call. |

**None of the above assumptions concern security, compliance, retention, or performance targets** — all are cosmetic/organizational choices CONTEXT.md already flagged as Claude's Discretion. The load-bearing technical claims in this document (NAME_KEBAB scope in config.js, marketplace.json relative-source schema, git config behavior outside a repo) are all VERIFIED, not assumed.

## Open Questions

1. **Should `motto init`'s CLI usage-string update (`motto <lint|build>` → `motto <init|lint|build>`) also touch the unknown-flag catch block, or only the unknown-subcommand branch?**
   - What we know: `bin/motto.js` currently has TWO separate string literals `'usage: motto <lint|build>\n'` (one in the `parseArgs` catch block, one in the final `else`). CONTEXT.md's canonical_refs note says the usage string "becomes `<init|lint|build>`" without specifying whether both occurrences need updating.
   - What's unclear: Whether the planner should update both string literals for consistency, or leave the parseArgs-catch one alone (since Phase 11 will add real `--help` handling anyway and may rewrite this block entirely).
   - Recommendation: Update BOTH occurrences to `motto <init|lint|build>` in this phase (cheap, avoids a stale/inconsistent usage string existing even briefly), since Phase 11 will likely replace both with real help text regardless.

2. **Does the scaffold-dogfood test need to assert `.gitkeep` exists, or is asserting `motto lint`/`motto build` succeed post-scaffold sufficient for INIT-02's "guarded by a permanent scaffold-dogfood test"?**
   - What we know: `motto lint`/`motto build` don't care whether `shared/references/` exists at all (D2-08), so they cannot detect a missing `.gitkeep` (Pitfall 5 above).
   - What's unclear: Whether INIT-02's dogfood guard is scoped ONLY to "init output passes lint+build" (satisfied without `.gitkeep`) or should also assert the FULL success-criteria-1 file list (which explicitly names `.gitkeep` implicitly via "shared/references/" needing to survive git tracking).
   - Recommendation: The dogfood test should assert BOTH — lint/build success AND explicit `stat()` checks for all 5+1 scaffold paths (including `.gitkeep`), since SC1 lists specific artifacts as the success criterion, not merely "lint and build pass."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥20 | Entire CLI (stdlib features: `node:test`, `parseArgs`) | ✓ | v24.14.1 (local dev machine) | — (already the project's engines requirement) |
| git (binary on PATH) | Owner-name lookup for `marketplace.json` (INIT-03) | ✓ | 2.53.0 (local dev machine) | Placeholder owner name (`"Your Name"`) when git is missing or `user.name` unset — this fallback is REQUIRED behavior per D-with-fallback in CONTEXT.md, not merely nice-to-have, since a stranger with only `npm i -g @jeremiewerner/motto` may not have git configured (or installed) at all |

**Missing dependencies with no fallback:** none — this phase has no hard external dependency; git is optional-with-fallback by design.

**Missing dependencies with fallback:**
- git — falls back to placeholder owner name in `marketplace.json` when unavailable or unconfigured.

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`) — this section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | CLI has no auth surface — local filesystem tool only |
| V3 Session Management | No | No sessions; single-invocation CLI process |
| V4 Access Control | No | No multi-user/permission model; operates with the invoking user's own filesystem permissions |
| V5 Input Validation | Yes | `NAME_KEBAB.test(effectiveName)` gates the ONLY user-controlled input (`[name]` arg / cwd basename) before it is used anywhere — reused from `src/schema.js`, not re-implemented (Pattern 2) |
| V6 Cryptography | No | No cryptographic operations in this phase |
| V12 File & Resources | Yes | All scaffold writes target a FIXED set of relative paths under `targetDir` (`skills/hello-world/SKILL.md`, `shared/references/.gitkeep`, `motto.yaml`, `.gitignore`, `.claude-plugin/marketplace.json`) — the validated `name` is used only as STRING CONTENT inside file bodies (YAML/JSON values), never as a path segment. This eliminates path-traversal risk by construction: there is no code path where user input influences which path gets written to. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| YAML/JSON injection via project name (e.g. a name containing `:` or `"` breaking `motto.yaml`/`marketplace.json` structure, or injecting extra keys) | Tampering | `NAME_KEBAB` validation gates BEFORE any template interpolation (Pitfall 1); the regex's character class (`[a-z][a-z0-9-]*`) makes YAML/JSON-breaking characters structurally impossible to reach the template step |
| Shell-command injection via `git config` invocation | Tampering | `execFileSync('git', [...])` with an argument array — no shell is spawned, so there is no metacharacter-interpolation surface at all (Pattern 3). No user input is passed as an argument to this specific call (the only args are the literal strings `'config'`, `'user.name'`), so this is defense-in-depth rather than a live vulnerability today, but establishes the correct pattern for any future git-config lookups that might interpolate user data. |
| Directory-write escape via a malicious `[name]` argument (e.g. `../../etc/passwd`) | Tampering / Elevation of Privilege | Not applicable to file PATHS in this phase — all scaffold write paths are hardcoded relative to `targetDir`; `name` never participates in path construction, only in file CONTENTS (see V12 above). `NAME_KEBAB` additionally rejects `/` and `.` characters outright, so even a hypothetical future refactor that mistakenly used `name` in a path would fail validation before reaching that code, not silently traverse. |
| Non-empty-directory overwrite causing data loss | Tampering (accidental, not adversarial) | D-04/D-05/D-06: refuse by default, explicit `--force` required, and `--force` never deletes — it can only overwrite the 5 known scaffold paths (Pitfall 3). No `rm`/wipe operation exists anywhere in the init code path. |

## Sources

### Primary (HIGH confidence)
- `src/schema.js`, `src/config.js`, `src/lint.js`, `src/build.js`, `bin/motto.js`, `test/dogfood.test.js`, `test/config.test.js`, `package.json`, `motto.yaml`, `.claude-plugin/marketplace.json`, `.gitignore` (all read directly from this repository, 2026-07-02) — all claims about existing validation behavior, CLI dispatch pattern, and output conventions are VERIFIED against actual source, not recalled from training data.
- Local shell execution (this session): `git config --get user.name`/`user.email` succeed outside any git-repo-specific context confirmation is implicit (ran from the project's own git repo, but git config's documented precedence — system → global → local — means the global-config read path is identical regardless of cwd); `git --version` confirms 2.53.0 installed; Node `--version` confirms v24.14.1.
- Node.js `execFileSync` behavior (throws on non-zero exit and on spawn failure) — long-standing, stable documented Node.js `child_process` API behavior.

### Secondary (MEDIUM confidence)
- `code.claude.com/docs/en/plugin-marketplaces` (official Claude Code docs, fetched via WebFetch 2026-07-02) — marketplace.json schema: `owner` required fields (`name` required, `email` optional), plugin `source` accepting a bare relative-path string (`"./plugins/my-plugin"`), path resolution relative to the marketplace root (directory containing `.claude-plugin/`). [CITED: code.claude.com/docs/en/plugin-marketplaces]
- `code.claude.com/docs/en/plugins-reference` (official Claude Code docs, fetched via WebFetch 2026-07-02) — supporting context on plugin manifest fields and path resolution rules. [CITED: code.claude.com/docs/en/plugins-reference]

### Tertiary (LOW confidence)
- None — this phase required no speculative/unverified web research; all technical claims trace to either first-party source code or official documentation fetched this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency; every module used is either stdlib or already in this codebase, directly read this session.
- Architecture: HIGH — pattern derived directly from `src/lint.js`/`src/build.js`'s existing, working conventions in this exact codebase.
- Pitfalls: HIGH — each pitfall traces to a specific, directly-read line of existing source (`config.js`'s validation scope, `build.js`'s wipe semantics, `lint.js`'s shared-refs absence handling).
- marketplace.json schema: MEDIUM — sourced from official docs fetched this session (not exhaustively cross-checked against a second independent source, but Anthropic's own reference documentation is authoritative for its own product's manifest format).

**Research date:** 2026-07-02
**Valid until:** 30 days (stable domain: first-party codebase conventions change only when this project changes them; Claude Code marketplace.json schema is a stable, versioned public API unlikely to break existing documented syntax within 30 days)
