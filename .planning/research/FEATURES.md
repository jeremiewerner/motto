# Feature Research

**Domain:** CLI linter + static build tool for Claude Code Agent Skills authoring
**Researched:** 2026-06-30
**Confidence:** MEDIUM (primary sources: official Claude Code docs via webfetch; markdownlint, ESLint, esbuild docs via websearch; cross-checked against in-repo design spec)

---

## Context: What This Research Covers

Motto v1 ships exactly two commands: `motto lint` and `motto build`. This research answers what features a CLI of this type **must** have (table stakes), what would distinguish Motto from authoring skills by hand (differentiators), and what commonly-requested features to deliberately exclude (anti-features).

Comparators studied:
- **markdownlint-cli / markdownlint-cli2** — markdown linter with rules, exit codes, config, fix mode
- **remark-lint** — unified ecosystem linter with ~70 plugins, frontmatter validation support
- **ESLint** — the canonical JS linter CLI; defines the genre's table stakes
- **esbuild / Rollup** — CLI build tools; define build-step table stakes
- **ajv-cli** — schema validator CLI; shows how validation CLIs handle error output and exit codes
- **Claude Code Agent Skills** — the actual target format (official docs, code.claude.com)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are non-negotiable for a CLI linter/build tool. Missing any of these = the tool is broken for CI or painful in daily authoring.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Exit code 0 on success, 1 on lint errors | Every CI system reads exit codes; without this the tool cannot be used in pipelines | LOW | markdownlint: 0/1/2/3/4; ESLint: 0/1/2. Motto needs 0/1/2 minimum (success / lint-errors / tool-failure). Already in plan. |
| Collect-all-errors before reporting | Authors need to see every problem at once, not fix one and re-run to discover the next | LOW | All comparators do this. Single-error-stop makes a linter frustrating. Already in plan. |
| Error messages name the skill and field | `my-skill: frontmatter: missing description` is actionable; `error: invalid` is not | LOW | ESLint: `file:line: rule: message`. Motto format: `skill: layer: message`. Already in plan. |
| Non-zero exit from `build` when lint fails | Build must refuse to emit partial/invalid plugins | LOW | esbuild/Rollup abort on errors; `motto build` already runs lint-first and throws. In plan. |
| Wipe output dir before building | Stale artifacts in `dist/` from a previous build cause confusion and shipping mistakes | LOW | All build tools do this (`rmSync` before emit). In plan. |
| Deterministic output | Same source tree = same `dist/` every time. Non-determinism breaks reproducibility | LOW | Requires stable directory traversal order (Node's `readdirSync` is filesystem-ordered; document this). |
| Human-readable success message | `✓ 2 skills OK` confirms the tool ran and found nothing wrong | LOW | markdownlint-cli2 prints a summary. Without a success message authors wonder if lint ran at all. In plan. |
| Works with zero configuration beyond `motto.yaml` | Schema is baked in; no `.mottorc`, no `eslintrc`, no per-rule config | LOW | ajv-cli and markdownlint both support external rule config but don't require it. Motto's constraint is the product; no external rule config needed. |
| `plugin.json` written from `motto.yaml` fields | Plugin consumers need a manifest; Claude Code reads `.claude-plugin/plugin.json` for name/version/description | LOW | Claude Code plugin spec requires this file. In plan. |
| Skills copied verbatim to dist | No content transform; the tool must not corrupt content it doesn't understand | LOW | esbuild's `--bundle` transforms; Motto deliberately does NOT. Unknown frontmatter keys pass through harmlessly (per spec). In plan. |
| Shared references bundled into each skill | Skills must be self-contained in dist so they work without the Motto source tree present | MEDIUM | Unique to this domain; analogous to esbuild bundling imports. Each declared `shared_references` item copied to `skill/references/` in dist. In plan. |
| Frontmatter parsed and validated | YAML syntax errors and missing required fields must be caught before build | LOW | Core of every schema validator CLI. In plan (Task 1+3). |
| `name` = folder name enforced | Claude Code derives command name from folder, not frontmatter `name`. Mismatch = wrong command or unreachable skill | LOW | Specific to Agent Skills format; caught by linter. In plan. |
| `audience: public|private` enforced | Binary; a `both` value would collision-break locally-installed plugins | LOW | Domain-specific constraint. In plan. |

### Differentiators (Competitive Advantage)

Features that set Motto apart from authoring skills by hand or using a generic markdown linter. These should align with the project's core value: "the strict schema + linter."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Body spine enforcement (`# Title` + `**Role:**`) | Enforces a consistent creative structure across all skills; no comparator tool checks skill-level LLM prompt architecture | LOW | Unique to Motto. remark-lint can check headings but not this domain-specific pattern. The "rigid vs creative dial" is Motto's identity. |
| Per-project plugin naming (not Motto-branded output) | Consumers install `/yourproject:skill`, never `/motto:skill`. Motto is invisible at runtime | LOW | Unusual. Most frameworks stamp their brand on output. `motto.yaml` `plugins.public/private` drives this. |
| `shared_references` lint-time resolution | Catches a broken reference before it becomes a missing file in dist | LOW | ajv-cli validates schema correctness; Motto also validates file-level existence of declared shared refs. |
| Private/public segregation + conditional private dist | Single source tree produces separate installable distributions; private skills never leak into public plugin | MEDIUM | No direct comparator. The `audience` frontmatter + build routing achieves this with no extra author effort. |
| Template mechanism (schema add-on) | Future-facing extensibility: templates layer extra required sections without forking the linter | MEDIUM | v1 ships zero templates; mechanism exists. remark-lint achieves this via plugin composition, but Motto's mechanism is schema-declarative, not code-compositional. |
| `name` = kebab-case enforcement | kebab-case is the Claude Code convention for skill command names; linter catches drift early | LOW | No other tool enforces this convention; it's a domain rule. |
| Lint-first build with shared core | Lint and build cannot diverge; impossible to build skills that fail lint | LOW | Some CI setups run lint and build as separate jobs; Motto makes them structurally identical. |

### Anti-Features (Commonly Requested, Often Problematic)

Features to explicitly exclude from v1. Each has a principled reason.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| `--fix` / auto-correct | markdownlint and ESLint have it; seems convenient | Motto enforces creative constraints (Title, Role) that cannot be meaningfully auto-generated. Auto-fixing `**Role:**` would insert a placeholder, not a real stance. Fixing frontmatter `audience` would guess wrong. | Authors fix these themselves; error messages are specific enough to be fast. |
| Watch mode (`--watch`) | esbuild and Rollup have it; live-recompile on save | YAGNI until skill sets are large enough that re-running `motto lint` is painful. Node.js fs.watch is unreliable across platforms. | Authors run `motto lint` on demand or via pre-commit hook. |
| Multiple config file formats | markdownlint supports 6 formats (JSON, JSONC, YAML, TOML, JS, INI) | Config sprawl. The schema is Motto's product; it is not configurable per project. `motto.yaml` is the sole config. | One format, one location, zero hunting. |
| Per-directory config overrides | markdownlint-cli2's killer feature: nested config files | Skills are authored in a flat `skills/` tree; per-skill config overrides would fragment schema enforcement and make lint results non-deterministic | Single schema for all skills. Templates provide structured variation. |
| Machine-readable output (JSON, JUnit, SARIF) | ajv-cli `--errors` flag; markdownlint-cli2 formatter packages | Over-engineering for v1 tooling. Zero consumers of Motto's output are machines in v1. | Human-readable stderr is sufficient. Add JSON format when first CI integration demands it. |
| `motto new` scaffolding | ESLint `--init`; many CLI tools scaffold new entries | YAGNI. Design templates against real skills; a scaffold built before the first template would scaffold the wrong thing. | Authors copy an existing skill dir. |
| STDIN linting | markdownlint `--stdin` for pipeline use | Motto lints a project tree, not individual files piped in. STDIN mode would require inventing a file-less name for error messages. | Run `motto lint` in the project root. |
| Content transform / inlining | Build-time variable substitution, frontmatter stripping, shared content inlining | "Compilers rot" (PROJECT.md). Content transforms make `dist/` diverge from source, making debugging hard. Unknown frontmatter keys are harmless; stripping them breaks portability. | Verbatim copy. Authors manage their own content. |
| MCP dependency resolution | `dependencies` frontmatter field exists; resolving it at build-time seems useful | Requires network access, version pinning, lockfiles — a whole dependency manager. Out of scope. | Linter validates that `dependencies` is present when declared; resolution is the plugin installer's job. |
| `--zip` output for Claude Desktop upload | Claude Desktop accepts zipped plugin directories | Trivial to add later; not needed until the first author needs desktop upload. | `zip -r dist/public.zip dist/public/` works today. |
| Quiet / verbose / debug flags | Standard in ESLint (`--quiet`), markdownlint | Surface area. `motto lint` already has minimal output: success = one line, errors = one line per error. `--quiet` for zero-output success mode is the one plausible exception (deferred). | stdout/stderr separation already provides CI-friendly output. |
| `motto build --dry-run` | Common in build tools | Lint already IS a dry run for the build. `motto lint` is the dry-run command. | Run `motto lint` instead. |
| Parallel skill processing | Worker threads for large skill sets | YAGNI. Sync FS is fast enough for any realistic skill count (<100). Worker threads add complexity for no current gain. | Sequential is correct and fast enough. |

---

## Feature Dependencies

```
parseFrontmatter (YAML parse + fence extraction)
    └──required by──> discoverSkills (reads each SKILL.md)
                           └──required by──> validateSkill (needs data + body + dirName)
                           │                     └──required by──> lint (aggregates errors)
                           │                                           └──required by──> build (lint-first)
                           └──required by──> build (copies skill dir to dist)

loadConfig (reads motto.yaml)
    └──required by──> build (plugin names + version)

discoverSkills.sharedRefs (Set of shared/references/* basenames)
    └──required by──> validateSkill (shared_references resolution check)
    └──required by──> build (knows which .md files to copy into skill/references/)
```

### Dependency Notes

- **`validateSkill` requires `dirName`:** The `name`-equals-folder check needs the actual directory name, which only `discoverSkills` knows. Cannot validate a skill in isolation without its filesystem context.
- **`shared_references` validation requires the refs Set:** The linter must know what shared refs exist before it can flag a missing one. Discovery and validation are coupled.
- **`build` requires clean `lint`:** `build` throws (and writes nothing) if lint returns errors. This is a hard coupling, not a soft warning.
- **`motto.yaml` is required by `build` but not `lint`:** `lint` validates skills against the schema, independent of project identity. `build` needs `motto.yaml` to name the plugins and write `plugin.json`. An author can run `motto lint` before creating `motto.yaml`.

### Conflict Notes

- **`--fix` conflicts with body-spine enforcement:** Auto-fixing the required `# Title` or `**Role:**` line would produce a syntactically valid but semantically empty skill. The feature is excluded because fixing content the tool doesn't understand violates the verbatim-copy principle.
- **Per-directory config conflicts with single-schema enforcement:** The core value is "skills always conform to one rigid structure." Per-directory overrides would undermine this.

---

## MVP Definition

### Launch With (v1) — Already Scoped

Everything in the v1 plan is already the minimum. The scope is not reducible further.

- [ ] `motto lint` — frontmatter validation (name/description/audience + kebab + folder match), body spine (H1 + Role), shared_references resolution, exit 0/1/2, collect-all-errors, human-readable output
- [ ] `motto build` — lint-first, wipe dist, copy skills verbatim, bundle shared refs into each skill's `references/`, write `plugin.json` per audience bucket, conditional private dist
- [ ] `motto.yaml` config — `name`, `version`, `description`, `plugins.public` required; `plugins.private` optional
- [ ] Exit codes: 0 success, 1 lint/build errors, non-zero on tool failure

### Add After Validation (v1.x)

Add these only when a real use case demands them.

- [ ] `--quiet` flag — suppress success output for CI pipelines that only read exit codes. Trigger: first author who wants silent CI.
- [ ] JSON error output (`--format json`) — machine-readable errors for editor integration. Trigger: first editor plugin or CI tool that needs to parse errors.
- [ ] Template validation — when the first concrete template exists, add the schema-add-on validation layer. Mechanism is already present in v1.
- [ ] `--zip` output — single flag, trivial implementation. Trigger: first author who needs Claude Desktop upload.

### Future Consideration (v2+)

- [ ] Watch mode — trigger: skill set large enough that manual re-run is painful.
- [ ] Framework-shipped shared library (second shared scope) — trigger: Motto ships references worth sharing.
- [ ] `motto new` scaffold — trigger: first concrete template; scaffold and template design together.
- [ ] MCP dependency resolution — trigger: first skill whose `dependencies` actually need resolving at build time.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Exit codes 0/1/2 | HIGH | LOW | P1 |
| Collect-all-errors before reporting | HIGH | LOW | P1 |
| Error messages name skill + field | HIGH | LOW | P1 |
| Frontmatter required-field validation | HIGH | LOW | P1 |
| `name` = folder enforcement | HIGH | LOW | P1 |
| `audience` binary enforcement | HIGH | LOW | P1 |
| Body spine (Title + Role) enforcement | HIGH | LOW | P1 |
| `shared_references` resolution at lint | HIGH | LOW | P1 |
| Lint-first build (refuse on failure) | HIGH | LOW | P1 |
| Wipe dist before emit | HIGH | LOW | P1 |
| Verbatim skill copy to dist | HIGH | LOW | P1 |
| Shared refs bundled into dist skill | HIGH | MEDIUM | P1 |
| `plugin.json` written from motto.yaml | HIGH | LOW | P1 |
| Per-project plugin naming (no Motto brand) | HIGH | LOW | P1 |
| Body spine enforcement (differentiator) | HIGH | LOW | P1 |
| `--quiet` flag | LOW | LOW | P2 |
| JSON error output | MEDIUM | LOW | P2 |
| Template validation | HIGH | MEDIUM | P2 (after first template) |
| Watch mode | MEDIUM | MEDIUM | P3 |
| `--zip` output | LOW | LOW | P2 (trivial, defer) |
| `--fix` auto-correct | LOW | HIGH | never (anti-feature) |
| Multiple config file formats | LOW | MEDIUM | never (anti-feature) |
| Content transform / inlining | LOW | HIGH | never (anti-feature) |

---

## Competitor Feature Analysis

| Feature | markdownlint-cli | ESLint | ajv-cli | Motto v1 |
|---------|-----------------|--------|---------|----------|
| Exit codes | 0/1/2/3/4 | 0/1/2 | 0/1 | 0/1/2 |
| Collect-all-errors | Yes | Yes | Yes | Yes |
| Error message format | file:rule | file:line:rule:message | path + JSON path | skill:layer:message |
| Auto-fix mode | Yes (--fix) | Yes (--fix) | No (--changes) | No (anti-feature) |
| Watch mode | No | No | No | No (deferred) |
| Config file format | 6 formats | js/json/yaml | CLI flags | motto.yaml only |
| Per-directory config | Yes (cli2) | No | No | No (anti-feature) |
| Machine-readable output | JSON/JUnit/SARIF | built-in formatters | --errors flag | Deferred (P2) |
| Custom rules/plugins | Yes | Yes | Via JSON Schema | No (schema is baked in) |
| Glob patterns | Yes | Yes | Yes | Implicit (skills/ tree) |
| STDIN support | Yes | Yes | Yes | No (anti-feature) |
| Build/emit step | No | No | No | Yes (core feature) |
| Content bundling | No | No | No | Yes (shared_references) |
| Manifest generation | No | No | No | Yes (plugin.json) |
| Audience-based output routing | No | No | No | Yes (public/private) |
| Domain schema (LLM prompts) | No | No | No | Yes (Title + Role) |

---

## Sources

- [Claude Code — Extend Claude with skills](https://code.claude.com/docs/en/skills) — official skills/plugin format, frontmatter reference, plugin.json spec
- [markdownlint-cli GitHub](https://github.com/igorshubovych/markdownlint-cli) — exit codes, flags, config formats, ignore patterns, fix mode
- [markdownlint-cli2 GitHub](https://github.com/DavidAnson/markdownlint-cli2) — per-directory config, output formatters, SARIF/JSON
- [ESLint CLI reference](https://eslint.org/docs/latest/use/command-line-interface) — exit codes, --fix, --format, --ignore-pattern
- [esbuild API](https://esbuild.github.io/api/) — entry points, outdir, bundle, watch mode
- [ajv-cli GitHub](https://github.com/ajv-validator/ajv-cli) — exit codes, --errors format, YAML validation
- In-repo: `.planning/superpowers/specs/2026-06-29-motto-design.md` — full design spec
- In-repo: `.planning/superpowers/plans/2026-06-30-motto-core-cli.md` — TDD implementation plan
- In-repo: `.planning/PROJECT.md` — scope, constraints, out-of-scope decisions

---

*Feature research for: Motto v1 (lint + build CLI for Claude Code Agent Skills)*
*Researched: 2026-06-30*
