# Phase 3: motto build - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the **`motto build` command** — the packager that turns a lint-passing source tree into self-contained, distributable Claude Code plugin folders under `dist/`. It is lint-first (reuses Phase 2's `lintProject` as a gate) and copy-only (no content transform). Concerns:

- **Gate** — run the full lint; on any error, write nothing and surface the same diagnostics as `motto lint` (BUILD-01).
- **Pack** — wipe `dist/`, copy each skill verbatim into `dist/<audience>/<name>/`, bundle declared `shared_references` into each skill's `references/`, emit `dist/<audience>/.claude-plugin/plugin.json` per bucket (BUILD-02..06).
- **CLI** — wire the existing `build` subcommand stub in `bin/motto.js` to the real packager; report the output dir; exit 0/1 (CLI-02).

Covers requirements **BUILD-01..06, CLI-02**. This is the final v1 phase — after it, `motto lint` + `motto build` are both real.

**Not in this phase:** any content transform / inlining compiler (rejected — copy-only); `--zip` packaging (v2 CLIX-03); MCP-dependency resolution (`dependencies` stays linted-as-present-only); the distribution layer (installing Motto itself as a plugin). New lint rules are out of scope — build trusts the Phase 2 lint contract.

</domain>

<decisions>
## Implementation Decisions

### Lint-first gate (BUILD-01, CLI-02)
- **D3-01:** `motto build` calls `lintProject(cwd)` first. If `result.ok` is false, print the **identical** diagnostics `motto lint` prints (`✗ <skill>: <message>` lines, config errors first), write **nothing** to `dist/`, and exit `1`. Only on `ok` does packaging begin.
- **D3-02:** The lint gate runs **before** the `dist/` wipe — a failing build must never destroy a previous good `dist/`. Order: lint → (ok?) → wipe → pack → report.

### dist/ wipe (BUILD-02)
- **D3-03:** On a passing build, **`./dist` is wiped whole** (`fs.rm('./dist', {recursive:true, force:true})`) then rebuilt from scratch — both buckets, every run. No incremental/partial writes, no "error if exists". Wipe is scoped to `./dist` under cwd only.

### Verbatim copy & shared-ref bundling (BUILD-02, BUILD-03, BUILD-06)
- **D3-04:** The copy unit is the **whole `skills/<name>/` directory, copied verbatim** into `dist/<audience>/<name>/` (`fs.cp(src, dst, {recursive:true})`) — SKILL.md, any local `references/`, `scripts/`, etc. all carried over.
- **D3-05:** **Symlinks are NOT dereferenced** — copy preserves them as symlinks (BUILD-02). Use `fs.cp` with `dereference:false` (default) / `verbatimSymlinks:true` as appropriate; the planner confirms the exact `fs.cp` option that preserves symlinks on the target Node version. File modes (e.g. executable `scripts/`) are preserved by `fs.cp`.
- **D3-06:** Declared **`shared_references` are bundled** by copying `shared/references/<ref>.md` → `dist/<audience>/<name>/references/<ref>.md` (BUILD-03), making each output skill self-contained.
- **D3-07:** **Collision is a build error.** If a declared `shared_reference` basename collides with a file already present in the skill's local `references/` (same `<ref>.md`), the build **fails with a named error** (`✗ <skill>: shared reference '<ref>' collides with a local references/<ref>.md`) and writes nothing further. Strict — surfaces the ambiguity rather than silently picking a winner.
- **D3-08:** Layout invariant (BUILD-06): skills are **siblings of `.claude-plugin/`**, never nested inside it. Tree per bucket: `dist/<audience>/.claude-plugin/plugin.json` + `dist/<audience>/<skill-name>/...`.

### Audience routing & bucket emission (BUILD-04, BUILD-05)
- **D3-09:** Each skill routes to `dist/<audience>/<name>/` by its `audience` field (`public`|`private`).
- **D3-10:** **`dist/public/` is always emitted** (`plugins.public` is a required config field; the public bucket and its `plugin.json` are written even if zero skills are public).
- **D3-11:** **`dist/private/` is emitted only when** at least one skill declares `audience: private` AND `plugins.private` is set in `motto.yaml` (BUILD-05).
- **D3-12:** **Contradiction = build error.** A skill with `audience: private` while `plugins.private` is **unset** fails the build (`✗ <skill>: audience private but plugins.private not set in motto.yaml`), exit 1, writes nothing. (This cross-check lives in **build**, not lint — Phase 2's shipped lint is not retrofitted.)

### plugin.json contents (BUILD-04)
- **D3-13:** Each bucket's `.claude-plugin/plugin.json` contains exactly three fields: **`name`**, **`version`**, **`description`**.
  - `name` = the **per-bucket plugin name**: `plugins.public` for the public bucket, `plugins.private` for the private bucket (this is the project-named identity, e.g. `/myproject`, not Motto's brand — PROJECT Key Decision).
  - `version` = `motto.yaml` top-level `version` — **always present** in the emitted JSON (BUILD-04).
  - `description` = `motto.yaml` top-level `description` (same string for both buckets).
- **D3-14:** No passthrough of arbitrary extra keys in v1 — exactly the three fields above. (YAGNI; revisit when a real plugin.json field is needed.)

### CLI surface (CLI-02)
- **D3-15:** Wire the existing `build` branch in `bin/motto.js` (currently the "not yet implemented" stub) to the real packager. `motto build` is **cwd-only** (mirrors `motto lint`, D2-15), uses the same `parseArgs` dispatch already in place, and sets `process.exitCode` (never `process.exit(1)`).
- **D3-16:** On success, print the **output directory** and a one-line summary: e.g. `✓ built dist/ — N skills, M plugin(s)` (M is 1 or 2). On lint failure, print the lint diagnostics (D3-01) and exit 1.

### Claude's Discretion
- **Lint/build data reuse:** `lintProject` currently returns only `{ ok, errors, count }` — it does NOT expose parsed skills/config. The planner chooses: (a) build re-reads `motto.yaml` + skill dirs from disk for packaging (simple, double-parse), or (b) refactor `src/lint.js` to optionally return the parsed skills+config so build reuses them (no double-parse, more coupling). Either is acceptable; prefer the one with the smaller, clearer diff.
- Module decomposition: a new `src/build.js` exporting `buildProject(cwd) → { ok, outDir, errors }` (mirroring the lint-core shape so `bin/motto.js` stays a thin renderer and tests import the function directly with temp-dir fixtures) is strongly preferred, but the exact split is the planner's call.
- Exact wording of build error/success strings, provided they stay greppable and name the offending skill/path.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope (execution authority)
- `.planning/REQUIREMENTS.md` — BUILD-01..06, CLI-02 (Phase 3 scope), plus CONF-01..03 (config fields the packager reads) and LINT-* (the contract build trusts). **Source of truth.**
- `.planning/ROADMAP.md` §"Phase 3: motto build" — goal + the 5 success criteria (verbatim placement, shared-ref bundling, plugin.json with version, conditional private bucket, lint-fail writes-nothing).
- `.planning/PROJECT.md` — Key Decisions (output = standard Agent Skills, verbatim copy / no content stripping; build = lint + copy, no compiler; output named per-project; audience binary, private optional), constraints (Node ≥20, ESM, node:test, single dep `yaml`, no glob).

### Code this phase builds on (reuse, don't re-implement)
- `src/lint.js` — `lintProject(projectRoot) → { ok, errors, count }`; internal helpers `processConfig`, `loadSharedRefs`, `discoverSkillNames`, `processSkill`. Build reuses this as its gate (D3-01) and may extend it to expose parsed data (discretion).
- `src/config.js` — `loadConfig(text) → { config, errors[] }`; the packager reads `config.name`/`version`/`description`/`plugins.{public,private}` from here.
- `src/schema.js` — skill shape + `audience` semantics the packager routes on.
- `bin/motto.js` — the `build` subcommand stub to wire (D3-15); mirror the `lint` branch's exit-code/render pattern.
- `.planning/phases/02-motto-lint/02-CONTEXT.md` — Phase 2 locked decisions (cwd-root, fixed source tree, output format, error model) that Phase 3 inherits.
- `.planning/phases/02-motto-lint/02-RESEARCH.md` — fs/readdir/cp patterns, `process.exitCode`, temp-dir fixture test strategy — directly reusable for build.

### Reference only (NOT authority)
- `docs/superpowers/specs/2026-06-29-motto-design.md` — design brief: source tree → dist layout, audience model, shared-refs. Inspirational where it agrees with REQUIREMENTS.
- `docs/superpowers/plans/2026-06-30-motto-core-cli.md` — prior-art build code; treat as a draft to correct, not copy.

### Library / tooling
- `.claude/CLAUDE.md` — `fs.cp()` (Node ≥16.7) for recursive copy, `fs.rm({recursive,force})` for the wipe, `fs.mkdir({recursive})`; no `glob`, no `mkdirp`/`rimraf`. `.claude-plugin/plugin.json` schema is the Claude Code plugin manifest (name/version/description).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lintProject` (src/lint.js) — the build gate (D3-01). Already does discovery + config + shared-ref resolution; build's packaging walks the same `skills/<name>/` + `shared/references/` tree.
- `loadConfig` (src/config.js) — supplies `name/version/description/plugins.*` for plugin.json (D3-13).
- Phase 2 test pattern — temp-dir fixtures via `fs.mkdtemp(os.tmpdir())`, import the core function directly, assert on the returned structure. Build tests follow the same shape (assert on emitted `dist/` tree + return value), keeping the husky `npm test` suite fast.

### Established Patterns
- **Core-returns-structure, thin CLI:** `lintProject → {ok, errors, count}` rendered by `bin/motto.js`. Build mirrors it: `buildProject(cwd) → {ok, outDir, errors}` (discretion), `bin/motto.js` renders + sets exit code.
- **Never-throw / collect errors:** build surfaces failures (collision D3-07, private-contradiction D3-12) as named errors and exits 1 — consistent with the lint error model.
- **process.exitCode, not process.exit(1)** — preserve stdout flush (Phase 2 RESEARCH pitfall).

### Integration Points
- `bin/motto.js` `build` branch → `buildProject` (new) → reuses `lintProject` + `loadConfig` + `fs.cp`/`fs.rm`.
- Output is `./dist/{public,private}/` — wiped and rewritten each run (D3-03). `.gitignore` for `dist/` is a planner consideration (it's generated output).

</code_context>

<specifics>
## Specific Ideas

- Order is load-bearing: **lint → wipe → pack → report** (D3-02). The wipe must be gated behind a passing lint so a broken build can't nuke a good `dist/`.
- plugin.json `name` is the **per-bucket** plugin name (`plugins.public`/`plugins.private`), NOT the project `name` field — this is how the output is "named per project" without Motto's brand leaking (PROJECT Key Decision).
- Prefer `buildProject(cwd) → { ok, outDir, errors }` so build is unit-testable against a temp dir without spawning the binary.

</specifics>

<deferred>
## Deferred Ideas

- **`--zip` output** (package dist for Claude Desktop / claude.ai upload) — v2 CLIX-03. Out of scope.
- **plugin.json passthrough fields** (author, homepage, etc.) — deferred (D3-14); add when a concrete field is needed.
- **MCP `dependencies` resolution at build** — explicitly out of scope; `dependencies` stays linted-as-present-only.
- **Incremental / cached builds** — rejected in favor of full wipe (D3-03); YAGNI for a build-on-demand tool.
- **Distribution layer** (Motto-as-plugin, global install, version pinning) — separate follow-up, depends on the open install-mechanism decision (PROJECT).

</deferred>

---

*Phase: 3-motto-build*
*Context gathered: 2026-06-30*
