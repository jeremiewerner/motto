# Architecture Research — v0.0.4 Project Bootstrap (`motto init`)

**Domain:** Internal integration design (not external ecosystem research) — how `motto init`, `--help`, and `[path]` fit into Motto's existing pure-core/thin-I/O-shell architecture.
**Researched:** 2026-07-01
**Confidence:** HIGH — derived directly from reading `bin/motto.js`, `src/lint.js`, `src/build.js`, `src/schema.js`, `src/config.js`, `src/frontmatter.js`, `test/dogfood.test.js`, `test/build.test.js`, `package.json`, `.claude-plugin/marketplace.json`, `motto.yaml`, `skills/setup-project/SKILL.md`. No external sources needed — the question is "how does this fit the codebase we already have," not "what does the ecosystem do."

## Existing Architecture (baseline)

Motto already follows one consistent shape across `lint` and `build`, and v0.0.4 should extend it rather than invent a new one.

```
┌──────────────────────────────────────────────────────────────────┐
│ bin/motto.js  (thin I/O shell — argv, exit codes, stdout/stderr)  │
│   parseArgs({ strict:true, allowPositionals:true })                │
│   dispatch on positionals[0]: lint | build | (init, --help — NEW) │
└───────────────┬─────────────────────────────┬─────────────────────┘
                │                             │
                ▼                             ▼
   ┌─────────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────┐
   │ src/lint.js              │   │ src/build.js             │   │ src/init.js  (NEW)     │
   │ lintProject(projectRoot) │   │ buildProject(projectRoot)│   │ initProject(root,name) │
   │ — I/O shell, NEVER throws│   │ — I/O shell, gates on    │   │ — I/O shell, NEVER     │
   │   collect-errors pattern │   │   lintProject, collect-  │   │   throws, collect-     │
   │                          │   │   errors-before-mutate   │   │   errors-before-write  │
   └────────────┬──────────────┘   └────────────┬──────────────┘   └────────────┬──────────┘
                │ imports                       │ imports                       │ imports
                ▼                                ▼                                ▼
   ┌──────────────────────────────────────────────────────────────────────────────────┐
   │ Pure core — no I/O, NEVER throws (D-01), unit-tested directly                     │
   │  src/frontmatter.js  parseFrontmatter(text), safeToJS(doc)                         │
   │  src/schema.js       validateSkill(skill, sharedRefs), NAME_KEBAB (single source)  │
   │  src/config.js       loadConfig(text)  — re-exports NAME_KEBAB from schema.js      │
   │  src/templates.js    starterSkillTemplate(), motoYamlTemplate(name), … (NEW)       │
   └──────────────────────────────────────────────────────────────────────────────────┘
```

**Established conventions v0.0.4 must not break:**
- **Pure core / thin I/O shell split.** `frontmatter.js` / `schema.js` / `config.js` take strings/objects, return `{ data|config, errors[] }`, never touch disk, never throw. `lint.js` / `build.js` are the only modules that call `fs/promises`. This split is *why* those three modules are trivially unit-testable and why `lint.js`/`build.js` are tested via `mkdtemp` fixtures instead.
- **Never-throw invariant (D-01).** Every public entry point returns `{ ok, errors[], ... }`. Errors are collected, not thrown, and the caller decides `process.exitCode` (never `process.exit(1)` after buffered writes — Pitfall 7).
- **Check-before-mutate ordering.** `build.js` runs ALL pre-pack checks (collision D3-07, private-contradiction D3-12) and returns early on any failure *before* wiping `dist/`. Nothing destructive happens until every check has passed.
- **Single source of truth for shared constants.** `NAME_KEBAB` lives in `schema.js` only; `config.js` re-exports it (proven by reference-identity in `dogfood.test.js`) rather than holding its own copy.
- **`projectRoot` as a plain absolute-path parameter.** `lintProject(projectRoot)` and `buildProject(projectRoot)` already take the root as an argument — `bin/motto.js` is the only place that currently hardcodes `process.cwd()`. This was foreseen: v0.0.3's PROJECT.md explicitly carries forward "optional `[path]` arg" as deferred scope, and the signatures were already designed decoupled from cwd to make that trivial.

## New vs Modified Components

| Component | New / Modified | Responsibility |
|---|---|---|
| `src/init.js` | **NEW** | I/O-shell orchestrator, `initProject(targetPath, name)`. Mirrors `lint.js`/`build.js` shape: never throws, collects errors, checks-before-write. |
| `src/templates.js` | **NEW** | Pure module. Exports pure string-generator functions (no I/O): `motoYamlTemplate(name)`, `marketplaceJsonTemplate(name)`, `gitignoreTemplate()`, `starterSkillTemplate()`. Unit-testable in isolation exactly like `schema.js`/`config.js`. |
| `test/init.test.js` | **NEW** | Two layers: (1) pure unit tests feeding `templates.js` output straight through `parseFrontmatter`/`validateSkill`/`loadConfig`; (2) `mkdtemp`-based integration test calling `initProject` → `lintProject` → `buildProject` (the "scaffold-dogfood" round trip). |
| `bin/motto.js` | **MODIFIED** | Add `init` subcommand dispatch; add `--help`/`-h` to the `parseArgs` options schema + a global help branch; resolve an optional `[path]` positional for `lint`/`build` via `node:path resolve()`. |
| `skills/setup-project/` | **DELETED** | Folded into `motto init` + README. Deleting this changes Motto's own skill count from 3 → 2. |
| `test/dogfood.test.js` | **MODIFIED** | Hardcoded assertions (`count === 3`, `skillCount === 3`) must drop to 2, and the `dist/public/setup-project/SKILL.md` existence check must be removed. **Must land in the same commit as the `skills/setup-project/` deletion** — a split would leave `main` red. |
| `README.md` | **MODIFIED** | New "ship your plugin" section (init → build → commit `dist/public/` → `/plugin marketplace add` one-liner). Pure docs, no code dependency — can be written independently of the other work. |
| `package.json` | **NOT MODIFIED** | `files` allowlist (`bin/`, `src/`, `dist/public/`) already covers `src/init.js` and `src/templates.js`. No change needed for packaging. |

## `src/init.js` — Orchestrator Design

`initProject` is the third I/O-shell orchestrator, but its risk profile differs from `lint`/`build`: it *writes into a target that may not yet be a Motto project*, so its main job is refusing to clobber, not validating an existing tree.

```js
export async function initProject(targetPath, name) {
  const errors = [];

  // 1. Validate the incoming name FIRST — reuse NAME_KEBAB from schema.js,
  //    the same single-source-of-truth pattern config.js already uses (D-16).
  //    Reject rather than silently slugify (matches "manual validation, specific
  //    actionable errors" philosophy already used in schema.js/config.js).
  if (!NAME_KEBAB.test(name)) {
    errors.push({ skill: '(init)', message: `name must be letter-start kebab-case: "${name}"` });
    return { ok: false, errors, dir: null };
  }

  // 2. Pre-flight collision checks — collect ALL, write NOTHING yet
  //    (mirrors build.js: checks before ANY mutation).
  //    - motto.yaml already exists?
  //    - skills/ already exists and is non-empty?
  //    ... push to errors[], do not throw, do not partially write.

  if (errors.length > 0) return { ok: false, errors, dir: null };

  // 3. Only after all checks pass: mkdir + writeFile everything, using the
  //    PURE generator functions from src/templates.js.

  return { ok: true, errors: [], dir: targetPath };
}
```

Key decisions:
- **Return shape mirrors `lintProject`/`buildProject`**: `{ ok, errors[], ... }`, never throws at the boundary, `bin/motto.js` decides `process.exitCode`.
- **Refuse, don't overwrite.** An existing `motto.yaml` or non-empty `skills/` is a hard error, not a merge/overwrite. This is the `init`-specific analogue of build's collision checks — same "collect all problems, mutate nothing until clean" discipline.
- **`initProject` does NOT call `lintProject` on itself at runtime.** Running a full lint pass after every `motto init` would be redundant work and — if a schema regression ever slipped through — would surface as a *confusing failure inside init* rather than a clear test failure. Self-verification belongs in the test suite (see Scaffold-Dogfood below), not in the production code path.

## `src/templates.js` — Where Scaffold Content Lives

**Decision: inline pure JS template functions, not template files under `src/templates/`.**

| Option | Verdict |
|---|---|
| Inline pure functions (`starterSkillTemplate()` etc., string arrays joined by `\n`) | **Chosen.** No new I/O, no path-resolution surface, matches existing test-fixture idiom (`test/build.test.js`'s `makeSkillMd(name)` already builds SKILL.md content exactly this way — array of lines, `.join('\n')`). Unit-testable with zero filesystem. |
| Static `.md`/`.json` files under `src/templates/`, read via `fileURLToPath(import.meta.url)`-relative paths | Rejected for v0.0.4. Requires resolving paths relative to the *installed npm package location* (not cwd) — correct but adds a whole failure mode (wrong relative depth, `files` allowlist must include the new subfolder, symlink/verbatim copy concerns echo `build.js`'s `verbatimSymlinks` pitfall). For ~4 short files this is solving a problem Motto doesn't have yet. Revisit only if/when TMPL-01 (concrete templates) ships and the content volume actually justifies a file-based system. |

`src/templates.js` stays a **pure module** — same category as `frontmatter.js`/`schema.js`/`config.js`: no `fs`, no `path` I/O, string in (where relevant) → string out, never throws (trivially true since there's no I/O to fail). `src/init.js` is the only consumer, and is the only place `fs/promises` gets called for these strings.

Two of the four templates need the user-supplied name; two don't:

| Template | Needs `name`? | Notes |
|---|---|---|
| `motoYamlTemplate(name)` | Yes | `name:` and `plugins.public: <name>` |
| `marketplaceJsonTemplate(name)` | Yes | `.claude-plugin/marketplace.json`, mirrors Motto's own (`source: npm` pattern is Motto-specific — a fresh project's marketplace should point at a relative/local source, not npm, since the user hasn't published yet. Confirm this shape against `PROJECT.md`'s "relative source → `dist/public/`" note before implementing.) |
| `gitignoreTemplate()` | No | Static: `node_modules/`, `dist/` |
| `starterSkillTemplate()` | No — **fixed, name-independent** | See below. |

**The starter skill's own name is deliberately decoupled from the project name.** `motto init my-cool-project` should not need to slugify `my-cool-project` into a *skill* name — that invites exactly the kind of double-validation bug this milestone should avoid. Instead, the starter skill folder is always a fixed, hand-verified-conformant literal (e.g. `skills/example/`), independent of what the user names their project. Only `motto.yaml`'s `name`/`plugins.public` fields carry the user's name, and those are validated against `NAME_KEBAB` up front in `initProject` (see above) — reusing the same regex `schema.js` already exports, making `init.js` the third consumer of that single source of truth (after `schema.js` itself and `config.js`'s re-export).

## `[path]` Arg — Threading Through Existing Signatures

`lintProject(projectRoot)` and `buildProject(projectRoot)` **already take an absolute root path as their only argument** — no signature change needed in either file. This is purely a `bin/motto.js` concern:

```js
const targetPath = parsed.positionals[1]
  ? resolve(process.cwd(), parsed.positionals[1])
  : process.cwd();

const result = await lintProject(targetPath); // was: lintProject(process.cwd())
```

`resolve()` (not `join()`) handles both relative (`motto lint ./sub`) and already-absolute (`motto lint /tmp/proj`) inputs correctly, and matches the "absolute path to project root" contract already documented in both orchestrators' JSDoc.

**`init` is NOT the same arg.** `motto init [name]` takes a *name*, not a *path* — it always scaffolds into `process.cwd()`. Mixing the two semantics (`[path]` for lint/build vs `[name]` for init) is intentional and matches the requirement text (`motto init [name]` vs `lint`/`build`'s `[path]`), but it's a point worth flagging explicitly in planning: a first-time reader could reasonably expect `motto init` to behave like `npm init <dir>` (create-and-cd-into a new directory). **Recommendation for scope: `motto init [name]` writes into the current directory; `[name]` only populates `motto.yaml`/`marketplace.json` fields (defaulting to `basename(process.cwd())` when omitted).** Directory-creation semantics (`motto init foo` → `mkdir foo && cd foo`) are a plausible future nice-to-have but add scope (must then also decide what happens if `foo/` exists, nested cwd resolution, etc.) — defer unless the roadmapper/PM wants to lock it in now.

## `--help` Coexisting With `strict:true`

Current `bin/motto.js` passes `options: {}` to `parseArgs({ strict: true, allowPositionals: true })`. With an empty options schema, **any** flag — including `--help` — is "unknown" and throws, landing in the generic `catch` that prints the terse one-liner usage and exits 1. That's the wrong behavior for `--help` (needs exit 0 + real usage text) but the *right* behavior to preserve for genuinely unknown flags.

**Fix: declare `--help` as a known option, don't touch `strict:true`.**

```js
parsed = parseArgs({
  args: process.argv.slice(2),
  options: { help: { type: 'boolean', short: 'h' } }, // NEW
  allowPositionals: true,
  strict: true, // unchanged — still rejects truly unknown flags
});

if (parsed.values.help) {
  process.stdout.write(USAGE_TEXT);
  process.exit(0); // safe: nothing async has happened yet, nothing buffered to lose (same precedent as the existing catch-block process.exit())
}
```

This is the entire fix — `strict:true` only rejects flags *absent from the schema*; adding `help` to the schema makes it a recognized, typed flag, so strict-mode rejection and `--help` support are not in tension. Check `parsed.values.help` **before** the `sub === 'lint' | 'build' | 'init'` dispatch chain so `motto --help`, `motto lint --help`, and `motto init --help` all short-circuit to the same usage text + exit 0, regardless of what subcommand (if any) was also present — standard CLI convention (help always wins).

`USAGE_TEXT` is a plain string constant in `bin/motto.js` (mirrors the existing `'usage: motto <lint|build>\n'`, just expanded to document `lint [path]`, `build [path]`, `init [name]`, `--help`). No new module needed — this is CLI-shell-only content, matching the "commander is heavyweight for two subcommands, write help as a constant string" decision already recorded in STACK.md.

## Scaffold-Dogfood: Keeping the Starter Skill Conformant as `schema.js` Evolves

This is the sharpest integration risk in this milestone. `schema.js`'s rules have already changed three times across v0.0.1–v0.0.3 (letter-start kebab fix D-08, reserved-substring check D-09, XML-tag description check D-05, max-length checks D-03). None of those changes are visible to a template that lives outside Motto's own `skills/` tree — and the starter skill emitted by `motto init` is exactly that: content Motto ships but never lints against itself, unless a test forces it to.

**Answer: yes, dogfood-test the scaffold output — as a dedicated regression test, not a runtime check.**

Two layers, both in `test/init.test.js`:

1. **Fast, pure unit check** (no filesystem): call `templates.starterSkillTemplate()` directly, feed its output straight through `parseFrontmatter()` then `validateSkill()` (both pure, already imported this way in `test/schema.test.js`/`test/frontmatter.test.js`), assert `errors.length === 0`. Catches most schema-shape regressions in milliseconds, same style as existing unit tests.
2. **Slow, full round-trip check** (mirrors `test/dogfood.test.js`'s existing "dogfood build (DOG-03)" block, just pointed at `initProject`'s output instead of the repo's own `skills/`):
   ```js
   tempDir = await mkdtemp(...);
   const initResult = await initProject(tempDir, 'demo-project');
   assert.strictEqual(initResult.ok, true, ...);

   const lintResult = await lintProject(tempDir);
   assert.strictEqual(lintResult.ok, true, `scaffold failed lint:\n${JSON.stringify(lintResult.errors)}`);

   const buildResult = await buildProject(tempDir);
   assert.strictEqual(buildResult.ok, true, ...);
   ```

This makes the starter skill a continuously-verified artifact using the exact machinery already built for Motto's own dogfooding — no new validation logic, just a new fixture target. Any future `schema.js` change that breaks the template fails this test immediately, the same safety net `dogfood.test.js` already provides for `skills/author-skill` and `skills/release`.

**Sequencing implication:** `src/templates.js` (and therefore `starterSkillTemplate()`) has a hard dependency on `schema.js`'s *current* rules being stable at the moment it's authored — the template's frontmatter (`name`, `description`, `audience: public`) and body (`# Title` then a `**Role:**` line) must satisfy every current `validateSkill` check by construction. Since `schema.js` is not changing in this milestone, this is a one-time authoring constraint, not an ongoing coupling risk — but the two-layer test above is what prevents it from becoming one later.

## Data Flow: `motto init [name]`

```
motto init my-project
        │
        ▼
bin/motto.js: parseArgs → sub='init', positionals[1]='my-project'
        │
        ▼
name = positionals[1] ?? basename(process.cwd())
        │
        ▼
initProject(process.cwd(), name)
        │
        ├─ 1. NAME_KEBAB.test(name) → error+return if invalid (schema.js import)
        │
        ├─ 2. pre-flight collision checks (motto.yaml exists? skills/ non-empty?)
        │       → collect ALL, return early if any — nothing written yet
        │
        └─ 3. write (only after checks pass):
                motto.yaml                       ← templates.motoYamlTemplate(name)
                .claude-plugin/marketplace.json  ← templates.marketplaceJsonTemplate(name)
                .gitignore                       ← templates.gitignoreTemplate()
                skills/example/SKILL.md          ← templates.starterSkillTemplate()
                shared/references/               ← mkdir (empty; ready for future refs)
        │
        ▼
bin/motto.js: print success + next-step hint ("run `motto lint`" / "`motto build`")
```

## Suggested Build Order (for the roadmapper)

Ordered by hard dependency, not by requirement priority:

1. **`src/templates.js` (pure functions) + unit tests.** No dependency on `init.js` or filesystem. Proves schema-conformance of the starter skill content early and cheaply by piping template output through the already-existing pure validators (`parseFrontmatter`, `validateSkill`, `loadConfig`). This is the highest-risk piece (schema drift) — do it first and lock it down with tests before building anything on top of it.
2. **`src/init.js` (I/O shell) + integration tests.** Depends on (1) for content and on `schema.js`'s `NAME_KEBAB` for name validation. Uses the same `mkdtemp` fixture pattern already established in `test/build.test.js`/`test/dogfood.test.js`.
3. **Scaffold-dogfood round trip.** Depends on (2) plus the already-existing `lintProject`/`buildProject`. This is the regression guard described above — write it right after `init.js` works, not as an afterthought.
4. **`bin/motto.js` wiring**: `init` subcommand dispatch, `[path]` positional resolution for `lint`/`build`, `--help`/`-h` support. Depends on (2) existing; otherwise independent of (1)/(3). The `[path]` and `--help` changes have no dependency on `init.js` at all and could technically ship first/in parallel if useful for sequencing flexibility.
5. **Delete `skills/setup-project/` + update `test/dogfood.test.js` counts.** Must depend on (4) being functional enough that README/users have a replacement path (`motto init`) before the instructional skill disappears. **The deletion and the `count: 3→2` test-assertion fix must land together** — never split across commits/phases, or `main` goes red between them.
6. **README "ship your plugin" section.** Pure docs. No code dependency — can be written in parallel with any of 1–5, but should be finished after (4)/(5) so the documented commands and skill count are accurate.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running `lintProject` inside `initProject` at runtime
**What people do:** "Just call lint after scaffolding to be safe."
**Why it's wrong:** Turns a should-never-fail code path into one with a new failure mode, and hides a template bug behind a confusing user-facing lint error from `motto init` itself instead of a clean test failure at development time.
**Instead:** Verify the template's conformance in tests (scaffold-dogfood, above), keep `initProject` itself simple and trustworthy by construction.

### Anti-Pattern 2: Slugifying the project name into the starter skill's folder/name
**What people do:** Reuse the user's `[name]` argument for both `motto.yaml`'s project name and the starter skill's `name:`/folder, running it through some slugify step.
**Why it's wrong:** Doubles the surface that must satisfy `NAME_KEBAB` + reserved-word + max-length checks, and couples two independent concerns (project identity vs. one example skill's identity) for no benefit.
**Instead:** Fixed, hand-verified starter skill name (e.g. `example`), decoupled from the user-supplied project name.

### Anti-Pattern 3: Splitting the `setup-project` deletion from the `dogfood.test.js` count fix
**What people do:** Delete the skill in one phase/commit, "fix tests later."
**Why it's wrong:** `test/dogfood.test.js` hardcodes `count === 3` / `skillCount === 3` and a `dist/public/setup-project/SKILL.md` existence check — any gap between the two leaves `main` red.
**Instead:** One phase/commit does both.

## Integration Points

### Internal boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `bin/motto.js` ↔ `src/init.js` | Direct async function call, `initProject(targetPath, name)` → `{ ok, errors[], dir }` | Same contract shape as `lintProject`/`buildProject`; `bin/motto.js` sets `process.exitCode`, never `process.exit(1)` post-write. |
| `src/init.js` ↔ `src/templates.js` | Direct pure function calls, string in/out | `templates.js` never touches `fs`; `init.js` is the sole `fs/promises` caller for this content. |
| `src/init.js` ↔ `src/schema.js` | Imports `NAME_KEBAB` | Third consumer of the single-source regex (after `schema.js` itself and `config.js`'s re-export) — keep it an import, never a re-implementation. |
| `test/init.test.js` ↔ `src/lint.js` / `src/build.js` | Full round trip via `mkdtemp` fixtures | The scaffold-dogfood safety net; no production code depends on this, only tests. |
| `bin/motto.js` ↔ `parseArgs` (`node:util`) | `options: { help: { type: 'boolean', short: 'h' } }`, `strict: true` unchanged | Declaring `help` removes it from "unknown flag" territory without weakening strict-mode rejection of anything else. |

## Sources

- Direct codebase reads (2026-07-01): `bin/motto.js`, `src/lint.js`, `src/build.js`, `src/schema.js`, `src/config.js`, `src/frontmatter.js`, `test/dogfood.test.js`, `test/build.test.js`, `package.json`, `.claude-plugin/marketplace.json`, `motto.yaml`, `skills/setup-project/SKILL.md`. Confidence HIGH — first-party, current-state ground truth, not inferred from docs.
- `.planning/PROJECT.md` — v0.0.4 milestone scope, requirements, explicitly-deferred `[path]` arg carried forward from v0.0.3.
- `.planning/research/STACK.md` (prior milestone) — `parseArgs`/`commander` decision, `fileURLToPath` "__dirname equivalent" note (informs the inline-vs-file-template tradeoff above).

---
*Architecture research for: motto init scaffold command (v0.0.4 Project Bootstrap)*
*Researched: 2026-07-01*
