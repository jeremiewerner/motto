# Pitfalls Research

**Domain:** Retrofitting a scaffold/`init` command, `--help`, and `[path]` args onto an existing lint/build CLI (Motto v0.0.4 Project Bootstrap)
**Researched:** 2026-07-01
**Confidence:** HIGH (grounded in direct read of `bin/motto.js`, `src/config.js`, `src/schema.js`, `src/lint.js`, `src/build.js`, `test/dogfood.test.js`, `package.json`, `motto.yaml`, `.claude-plugin/marketplace.json`, `.gitignore`); MEDIUM on the external Claude Code marketplace-schema claims (community sources, cross-checked against official docs page).

## Critical Pitfalls

### Pitfall 1: Scaffolded `.gitignore` silently swallows the thing README tells users to commit

**What goes wrong:**
Motto's own `.gitignore` (checked today) contains a blanket `dist/`. The v0.0.4 goal explicitly requires the README to instruct users to **commit `dist/public/`** and push it so the self-hosted marketplace works (`/plugin marketplace add` reads it from the pushed repo). If `motto init` scaffolds a naive `.gitignore` copied from Motto's own (`dist/`), the new project's `dist/public/` is invisible to `git add -A` forever — the user follows the README ship instructions, `git status` shows nothing changed, and the marketplace never actually gets the built skills. This is not a hypothetical: it is a direct contradiction between two things in the same milestone (init's `.gitignore` output vs. README's "ship" instructions).

**Why it happens:**
The obvious move is "copy Motto's own `.gitignore` into the template" — but Motto's own `dist/` is disposable build output for the *tool*, whereas a scaffolded project's `dist/public/` is the *shipped artifact*. Same directory name, different semantics.

**How to avoid:**
Scaffold `.gitignore` with `dist/private/` ignored (never shipped) but `dist/public/` tracked — e.g. `dist/*` + `!dist/public/` negation pattern, or simply ignore only `dist/private/` and `node_modules/`. Write a test that runs `motto init` into a temp dir, runs `motto build`, then greps the generated `.gitignore` to assert `dist/public` is NOT excluded (`git check-ignore` against the actual file is the authoritative check, not string matching).

**Warning signs:**
README says "commit dist/public/" but nobody ever actually ran `git add -A && git status` against a freshly-init'd + built project to confirm the file appears staged.

**Phase to address:**
The `init` scaffold phase — write the `.gitignore` template and README's ship section together, and verify with one integration test that exercises both.

---

### Pitfall 2: Scaffold template files excluded from the published npm package (works in dev, breaks for real users)

**What goes wrong:**
`package.json`'s `files` allowlist is currently `["bin/", "src/", "dist/public/"]`. Whatever new directory holds `init`'s templates (e.g. a `templates/` folder, or per-file `.tpl` assets) is invisible to `npm publish`/`npm pack` unless it's added to `files`. Running `motto init` from the dev checkout works fine (all files present on disk), giving false confidence — but a stranger who does `npm i -g @jeremiewerner/motto` gets a package missing the templates, and `motto init` throws `ENOENT` or silently produces empty/broken output. This is exactly the "no reverse-engineering" goal of the milestone failing for the actual target user.

**Why it happens:**
`files` allowlist bugs are invisible in local development — `node bin/motto.js init` from the repo just reads whatever is on disk, allowlist or not. The gap only surfaces once the package is actually packed/installed from the registry.

**How to avoid:**
Two options, pick one deliberately:
1. Add the templates directory to `files` in `package.json` explicitly.
2. **Preferred**: embed templates as JS string/template-literal constants inside `src/` (already allowlisted) rather than separate template files — eliminates the whole bug class and keeps the "single runtime dependency" minimal-surface philosophy.

Either way, add a test/CI step that runs `npm pack`, extracts the tarball to a temp dir, runs `node <tarball>/bin/motto.js init` from there, and asserts it succeeds — this is the only test that actually proves what a real `npm i -g` user experiences (mirrors the existing `test/dogfood.test.js` mkdtemp pattern, but against the packed tarball instead of the repo tree).

**Warning signs:**
`motto init` is only ever tested by running it from the repo checkout; no test exercises the packed/installed artifact.

**Phase to address:**
The `init` scaffold phase, verified before the milestone ships (this is a shipping-blocker class of bug, same severity as the v0.0.3 npm `files` allowlist work).

---

### Pitfall 3: `parseArgs({ options: {}, strict: true })` breaks in non-obvious ways when retrofitting `--help` and per-subcommand positionals

**What goes wrong:**
`bin/motto.js` currently calls `parseArgs` **once**, globally, with `options: {}` and `strict: true` — any flag at all (including `--help`) currently throws and falls into the generic "usage: motto <lint|build>" + exit 1 branch. Two integration bugs are easy to introduce when adding `--help` and `[path]`:
1. **`--help` becomes "just another accepted flag" but dispatch order is wrong.** If `values.help` is only checked in the "no subcommand" branch, then `motto lint --help` (a real usage pattern) still runs `lint` instead of printing help — because the flag now parses successfully (no throw) and falls through to subcommand dispatch. The `--help`/`-h` check must run **before** the `sub === 'lint' | 'build' | 'init'` dispatch, not just as a fallback for "no subcommand given."
2. **Positional index collides across subcommands.** Today `parsed.positionals[0]` is always the subcommand. Adding `[path]` to `lint`/`build` makes `positionals[1]` a path; adding `[name]` to `init` makes `positionals[1]` a project name. Both are "second positional" but mean different things — a shared, generic "`positionals[1]` is *the* second arg" mental model silently mixes up path-vs-name handling if the three subcommand branches aren't each explicit about what they expect there (e.g. `motto init lint` would currently be nonsensical, but once `init` takes a name arg, subtle argv-order mistakes in tests or docs become easy).

Also: `strict: true` with a single flat `options: {}` object means **every** flag must be declared globally, valid for every subcommand — there's no per-subcommand flag scoping. Forgetting to declare `--help` (or any new flag) in `options` means it still throws under `strict: true`, silently reverting to generic "usage" text instead of the new dedicated help path.

**Why it happens:**
`parseArgs`'s `strict: true` mode was originally chosen specifically to make "unknown flag → usage" work for free (see the existing code comment "Pitfall 4, D2-16"). That same mechanism now has to coexist with an *intentionally* recognized `--help` flag, and the "print usage, exit 1" catch-all needs to be split into "print usage, exit 0" (--help) vs. "print usage, exit 1" (actual unknown flag / no subcommand) — easy to conflate.

**How to avoid:**
Declare `--help`/`-h` explicitly in the `options` schema (`{ help: { type: 'boolean', short: 'h' } }`) so it no longer throws. Check `values.help` **immediately after parsing, before any subcommand dispatch** — return usage text + `process.exitCode = 0` and stop. Keep the existing catch block for genuinely unknown flags (still throws under `strict:true`, still exit 1). For positionals, name them explicitly per branch (`const target = sub === 'init' ? positionals[1] /* name */ : positionals[1] /* path */`) with a comment at each site clarifying what index 1 means for that subcommand — don't let "path" and "name" share unexamined code.

**Warning signs:**
`motto lint --help` prints a lint error instead of usage. `motto --help` exits 1 instead of 0. A new flag is added to a subcommand's logic but omitted from the top-level `options` object and starts throwing "usage: ..." instead of working.

**Phase to address:**
The `--help` + `[path]` CLI-ergonomics phase — write both a `--help`-after-subcommand test and a `--help`-exit-0 test explicitly (both are easy to miss with a single "bare `--help` works" test).

---

### Pitfall 4: Three independent, non-identical "is this name valid" checks — `init` risks becoming a fourth

**What goes wrong:**
The codebase today already has **two different strictness levels** for name validation, both built on the same `NAME_KEBAB` regex but diverging beyond it:
- `src/schema.js` `validateSkill()` validates skill `name`: kebab format **+ max 64 chars + no `"anthropic"`/`"claude"` reserved substrings + must equal folder name**.
- `src/config.js` `loadConfig()` validates `plugins.public`/`plugins.private`: kebab format **only** — no length cap, no reserved-substring check.

If `motto init <name>` derives a project name / `plugins.public` value / starter-skill folder name from the CLI arg (or from the target directory's basename when `[name]` is omitted) using yet another ad-hoc slugify, you get a real instance of exactly the failure mode named in the milestone question: **init accepts a name that lint immediately rejects** (e.g. a folder called `claude-experiments` passes `NAME_KEBAB` and today's weaker `config.js` check, producing a `motto.yaml` that lints clean, but if that same string is also used as the starter skill's `name:` frontmatter, `validateSkill`'s reserved-substring check fails it — `motto init && motto lint` fails on the skill Motto itself just generated).

**Why it happens:**
There is no single canonical "validate a Motto project/plugin/skill name" function — `NAME_KEBAB` is shared (good, and dogfood-tested for reference identity, see `test/dogfood.test.js` DOG-04), but the *surrounding* checks (length, reserved words) are not. Adding a third call site (`init`) that has to independently decide "which set of rules applies to a name I'm about to write into 3 different files" is where drift creeps in.

**How to avoid:**
Before writing `init`, decide explicitly: does the *project name* need skill-grade validation (length + reserved words) because it's reused verbatim as the starter skill's `name:`? If yes, reuse `validateSkill`-equivalent checks (or extract a shared `validateName(name, { maxLen, checkReserved })` helper used by both `schema.js` and `config.js`) rather than writing new regex/logic in `init`. At minimum, `init` must call **the same `NAME_KEBAB`** import (not a copy), and should apply the *stricter* of the two existing rule sets, since the derived name flows into the skill's `name:` field. Add an integration test — mirroring `test/dogfood.test.js`'s existing DOG-04 reference-identity check — that runs `motto init <name>` for a handful of edge-case names (leading digit, uppercase, contains "claude", 65+ chars, double-hyphen) and asserts `init` **rejects** exactly the same names `validateSkill`/`loadConfig` would reject, with no name accepted by `init` that lint would later flag.

**Warning signs:**
`init`'s name handling doesn't import `NAME_KEBAB` from `schema.js`; a name accepted by `init` produces a project where `motto lint` immediately fails on the very first run.

**Phase to address:**
The `init` scaffold phase — this is core to "the starter skill lints+builds pass immediately" (an explicit v0.0.4 target feature), so it should be a named acceptance check for that phase, not an afterthought.

---

### Pitfall 5: Starter-skill template silently drifts from the schema it's supposed to satisfy

**What goes wrong:**
The starter skill's `SKILL.md` (frontmatter + body) will be static template content (a string or file) written once during this milestone. `src/schema.js` is the living source of truth for what's valid (spine requirement, `audience` enum, `shared_references` basename rule, name rules). Any future schema change — even a small one, like the recent D-08 letter-start-kebab fix or the XML-tag-in-description check — has **zero mechanical connection** to the template. Nothing breaks at merge time if a schema tightening makes the shipped template invalid; it just silently starts failing for every new user who runs `motto init` after that point, with no CI signal, because the only thing exercising the schema today is Motto's own hand-maintained `skills/` tree (`test/dogfood.test.js` DOG-03), not the init-generated template.

**Why it happens:**
Two independent artifacts (schema logic in `src/schema.js`, template content wherever it lives) evolve on separate clocks, and only one of them (`skills/` in the repo) has a regression test.

**How to avoid:**
Add an `init`-equivalent of the existing dogfood test: scaffold via `motto init` into a `mkdtemp` dir (same pattern already used in `test/dogfood.test.js`), then run `lintProject()` and `buildProject()` against that output and assert `ok: true` — this becomes a permanent regression gate, so any future schema tightening that breaks the template fails CI immediately instead of failing silently for real users. This is a near-zero-cost addition given the pattern already exists in the codebase.

**Warning signs:**
The starter skill template was validated once, manually, during development, but no automated test re-runs `motto lint`/`motto build` against fresh `init` output on every CI run.

**Phase to address:**
The `init` scaffold phase, as a mandatory acceptance test (not "nice to have") — this is what "lint+build pass immediately" in the milestone's target features actually requires as ongoing proof, not a one-time check.

---

### Pitfall 6: `marketplace.json` scaffold — three-way name consistency, and relative `source` paths only resolve when the marketplace is *git*-added

**What goes wrong:**
Two distinct integration bugs bundle under "generated marketplace.json drifts from spec":

1. **Three-way name consistency.** A working marketplace.json requires the *same* plugin name to appear, character-for-character, in (a) `motto.yaml`'s `plugins.public`, (b) `marketplace.json`'s `plugins[].name`, and (c) the built `dist/public/.claude-plugin/plugin.json`'s `name` (emitted by `buildProject()` from `config.plugins.public` — see `src/build.js` step 6). If `init` hardcodes a literal string in the marketplace.json template instead of interpolating the same value it just wrote into `motto.yaml`, the three drift apart the moment a user picks a project name other than the template's default, and `/plugin marketplace add` either fails to resolve the plugin or resolves the wrong one.
2. **Relative `source` paths in marketplace.json only resolve when the marketplace itself is added via git** (GitHub/GitLab/git URL) — confirmed against Claude Code's plugin-marketplace docs. If distributed via a direct URL or a local absolute path instead, relative `source` paths silently fail to resolve. Since the v0.0.4 README explicitly documents a git-based ship flow ("commit `dist/public/`, push public, `/plugin marketplace add` one-liner"), the relative-source scaffold is *correct for that documented flow* — but this is exactly the kind of assumption that breaks if a user (or a future README revision) ever suggests adding the marketplace by absolute path or raw file URL instead. Document the constraint explicitly next to the generated file, not just implicitly in the README prose.

**Why it happens:**
`marketplace.json`'s shape isn't enforced by any Motto-owned validator (unlike `motto.yaml`/`SKILL.md`, which go through `loadConfig`/`validateSkill`) — it's Claude Code's spec, external to this codebase, and Motto currently just hand-copies a working example (see the repo's own `.claude-plugin/marketplace.json`, which uses `source: npm` — a **different** source type than what `init` needs to scaffold for a not-yet-published project, i.e. a relative/local source, not npm). Copying Motto's own file as the template starting point would generate a broken scaffold (points at an npm package the user hasn't published).

**How to avoid:**
Template the plugin name as a single interpolated variable driven from the same value written to `motto.yaml`, never a second literal. Use `source: "./dist/public/"` (or equivalent local/relative source shape, not `npm`) since a freshly-init'd project has no npm package yet. Add a short inline comment in the generated `marketplace.json` (or the README ship section) noting the relative-source-requires-git-add constraint, so it's not a silent trap. If feasible, verify the generated `marketplace.json` against `claude plugin validate` (already used per the project's Development Tools) as part of the init acceptance test — mirrors the "verify build output" pattern used elsewhere.

**Warning signs:**
Marketplace.json template built by copy-pasting Motto's own (npm-sourced) file instead of designing for the not-yet-published case; plugin name appears as a literal string in more than one generated file.

**Phase to address:**
The `init` scaffold phase — verify end-to-end: `motto init` → `motto build` → generated `plugin.json` name matches generated `marketplace.json` plugin name matches `motto.yaml` `plugins.public`, as one assertion chain in a single test.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Hardcode `"usage: motto <lint\|build>"` string at 2-3 call sites instead of one constant | Fast to ship | Adding `init` requires updating every site; miss one and `--help` output disagrees with the actual "unknown flag" error text | Never — extract one `USAGE` constant now, before adding the third subcommand |
| No overwrite guard on `motto init` (v1: always writes, never checks for existing files) | Simplest possible implementation | A user re-running `init`, or running it in a dir with an existing `motto.yaml`/`skills/`, silently clobbers work with no backup | Acceptable only if `init` refuses to run (hard error, not silent overwrite) when `motto.yaml` already exists in the target dir — the "always overwrite" version is never acceptable |
| Derive `owner` fields in `marketplace.json` from `git config user.name`/`user.email` with no fallback | Zero prompts, fully automated | Empty global git config (fresh machine, CI, Docker) produces an `owner: {"name": "", "email": ""}` that looks scaffolded-but-broken | Acceptable only paired with a placeholder + inline TODO comment when git config values are empty, so the gap is visible instead of silent |
| Store templates as literal strings inline in `src/init.js` rather than separate template files | Sidesteps the npm `files` allowlist bug (Pitfall 2) entirely | Harder to visually diff/edit template content vs. a real `.md`/`.yaml` file | Acceptable and arguably *preferred* for this project's minimal-dependency philosophy — the "cost" is developer ergonomics only, not correctness |

## Integration Gotchas

Common mistakes when connecting to (or generating files for) external tooling.

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Claude Code marketplace (`marketplace.json`) | Using `source: npm` (copied from Motto's own file) for a scaffold whose package hasn't been published yet | Scaffold a relative/local `source` (e.g. `./dist/public/`) pointing at the not-yet-published project's own build output |
| Claude Code marketplace, relative `source` | Assuming relative paths resolve regardless of how the marketplace is added | Relative `source` paths only resolve when the marketplace is added via git (GitHub/GitLab/git URL) — document this next to the ship instructions |
| `git config` (owner autofill) | Shelling out to `git config user.name`/`user.email` with no empty-value handling | Check for empty string, not just command success; fall back to a placeholder + visible TODO rather than an empty JSON string |
| npm `files` allowlist | Adding new scaffold-template assets without updating `files` in `package.json` | Either add the new path to `files` explicitly, or (preferred) keep template content inside already-allowlisted `src/` as JS constants |
| `claude plugin validate` (existing dev tool per stack doc) | Never running it against `init`-generated output, only against Motto's own hand-built `dist/` | Add it as a step in the init acceptance test/CI, exactly like it's already used for verifying Motto's own build output |

## Performance Traps

Not a meaningful category for this project at its actual scale (a local CLI scaffolding a handful of files into a project directory — no network calls in the hot path, no user-facing latency budget). The one item worth naming:

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Synchronous/blocking `git config` subprocess call to autofill `owner` fields | `motto init` hangs if git prompts for anything (rare, but possible with unusual git credential helpers configured) | Use a short explicit timeout around the `git config` read, and always have a non-git fallback path | Only on unusual local git configurations — low priority, but cheap to guard |

## Security Mistakes

Domain-specific concerns for a local scaffolding CLI (not web security — there's no server here).

| Mistake | Risk | Prevention |
|---------|------|------------|
| `motto init <name>` uses `<name>` directly in `mkdir`/`join()` without rejecting path separators | A name like `../../elsewhere` writes outside the intended target directory | Reject any `name` containing `/`, `\`, or `..` before it reaches any filesystem call — same "unsafe basename" principle `schema.js` already applies to `shared_references` entries (reuse that pattern/check, don't reinvent it) |
| Starter skill's generated `shared_references` entries bypass the existing basename guard | Template accidentally emits a path-shaped reference (e.g. `../shared/x`) that the real linter would reject | Generate the starter skill's frontmatter through the same code path/constants used elsewhere (or literally lint it as part of the init test, see Pitfall 5) rather than hand-typed YAML that might not match what `validateSkill` expects |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|--------------|-------------------|
| `motto --help` exits 1 (today's actual behavior, since `--help` currently isn't a declared flag) | Scripts/CI that check exit code after `--help` (a very common pattern) treat it as failure | Explicitly test and assert `--help` exits 0, at both `motto --help` and `motto <subcommand> --help` |
| Usage text lists only `<lint|build>` after `init` ships | User has no idea `init` exists from `--help` output alone | Update usage text and this must be caught by a test asserting the string, not eyeballed |
| Silent overwrite on re-running `init` in a populated directory | User loses uncommitted scaffold customizations with no warning | Hard-refuse (non-zero exit, clear message) when `motto.yaml` already exists in the target; don't silently proceed |
| `[path]` arg silently resolves relative to an unexpected base (e.g. arg is relative to cwd but user assumed relative to a project root elsewhere) | Confusing "no skills found" errors when running from an unrelated directory | Print the *resolved absolute path* being linted/built as part of the output/error message, not just the raw arg the user typed |

## "Looks Done But Isn't" Checklist

- [ ] **`motto init` works:** Often only tested from the dev checkout — verify it also works from a `npm pack` tarball installed in a clean temp dir (proves the `files` allowlist is correct, Pitfall 2).
- [ ] **`--help` works:** Often only tested as bare `motto --help` — verify `motto lint --help`, `motto build --help`, `motto init --help` all short-circuit to help + exit 0 too, not just the no-args case (Pitfall 3).
- [ ] **Starter skill "lints and builds immediately":** Often verified once by hand during development — verify there's an automated test that re-runs `motto init` + `motto lint` + `motto build` on every CI run, so future schema changes can't silently break it (Pitfall 5).
- [ ] **`marketplace.json` scaffold "looks right":** Often verified by eyeballing the JSON shape — verify plugin name matches `motto.yaml`'s `plugins.public` and the built `plugin.json`'s name via an actual assertion, and ideally run `claude plugin validate` against it (Pitfall 6).
- [ ] **`.gitignore` scaffold "looks standard":** Often copied from Motto's own `.gitignore` — verify `dist/public/` specifically survives `git add -A` after a build, not just that the file exists (Pitfall 1).
- [ ] **`[path]` arg "works":** Often tested only with a bare relative path from the right cwd — verify it also works with an absolute path, a path with a trailing slash, and when invoked from a *different* cwd than the target.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|-------------------|
| `.gitignore` swallows `dist/public/` (Pitfall 1) | LOW | `git add -f dist/public/` once discovered, fix the `.gitignore` pattern, re-commit; no data loss since the build output is regenerable |
| Templates missing from published npm package (Pitfall 2) | MEDIUM | Publish a patch version with the `files` fix; existing installs need to re-`npm i` — real user friction until discovered and patched |
| Init overwrote an existing `motto.yaml`/`skills/` tree (Technical Debt row 2) | HIGH if uncommitted, LOW if the target dir was already a git repo (`git checkout`/`git stash` recovers it) | Recommend users always run `motto init` inside an already-`git init`'d (or otherwise backed-up) directory until an overwrite guard ships |
| Name accepted by `init` but rejected by `lint` (Pitfall 4) | LOW | User reruns with a different name; the real cost is reputational (first-run experience is broken) — prioritize prevention over recovery here |
| Marketplace name drift across 3 files (Pitfall 6) | LOW | Manually re-sync the three name occurrences; trivial once identified, but likely to go unnoticed for a while since nothing errors loudly |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls. (Phase numbers are illustrative — assign real numbers during roadmap creation; groupings reflect the milestone's stated target features.)

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|-----------------|
| `.gitignore` vs. "commit dist/public" contradiction (1) | `init` scaffold phase | Test: init → build → `git add -A` → assert `dist/public/**` is staged |
| Templates excluded from npm package (2) | `init` scaffold phase | Test: `npm pack` → extract → run `init` from tarball → assert success |
| `parseArgs` strict-mode + `--help`/positional retrofit (3) | `--help` + `[path]` CLI phase | Tests: `motto <sub> --help` exits 0 for every subcommand; unknown flag still exits 1 |
| Divergent name validation, init vs. lint (4) | `init` scaffold phase | Test: parametrized edge-case names — init's acceptance must equal lint's acceptance |
| Starter skill drifts from schema (5) | `init` scaffold phase | Permanent CI test: init → lint → build, asserted `ok:true`, same pattern as existing `test/dogfood.test.js` |
| `marketplace.json` name drift / wrong source type (6) | `init` scaffold phase | Test: assert plugin name identical across `motto.yaml`, `marketplace.json`, built `plugin.json`; confirm `source` is relative/local, not `npm` |
| Silent overwrite on re-run (Technical Debt row 2) | `init` scaffold phase | Test: run `init` twice in the same dir, assert second run refuses with non-zero exit and a clear message |
| `[path]` resolution edge cases (UX table) | `--help` + `[path]` CLI phase | Tests: absolute path, trailing slash, invocation from a different cwd, all produce the same result as a plain relative-cwd run |

## Sources

- Direct codebase inspection: `bin/motto.js`, `src/config.js`, `src/schema.js`, `src/lint.js`, `src/build.js`, `test/dogfood.test.js`, `package.json`, `motto.yaml`, `.claude-plugin/marketplace.json`, `.gitignore` (all read 2026-07-01). Confidence: HIGH — these are the actual load-bearing files this milestone modifies.
- `.planning/PROJECT.md` — v0.0.4 milestone goal, target features, explicit "not building `motto ship`" scope note. Confidence: HIGH.
- [Create and distribute a plugin marketplace — Claude Code Docs](https://code.claude.com/docs/en/plugin-marketplaces) — relative-`source`-requires-git-add-method constraint, `metadata.pluginRoot`, source type shapes. Confidence: MEDIUM (official docs page, cross-checked via web search summary rather than a full fetch; verify exact JSON shape again at implementation time since marketplace schema is external to this codebase and can evolve).
- [claude-code-json-schema (unofficial JSON Schema definitions)](https://github.com/hesreallyhim/claude-code-json-schema) — corroborates marketplace/plugin.json schema shape exists as a distinct, versioned external spec Motto must track, not something Motto controls. Confidence: LOW-MEDIUM (community-maintained, unofficial).

---
*Pitfalls research for: Motto v0.0.4 Project Bootstrap (`motto init`, `--help`, `[path]`)*
*Researched: 2026-07-01*
