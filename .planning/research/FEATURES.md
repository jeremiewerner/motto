# Feature Research

**Domain:** CLI scaffold/init command for a skills-authoring build tool (`motto init`)
**Researched:** 2026-07-01
**Confidence:** MEDIUM (ecosystem conventions cross-checked across 5+ tools; marketplace.json schema verified against official Claude Code docs + motto's own working example)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or unsafe to run twice.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Non-destructive by default on an existing/non-empty directory | Every scaffold tool researched (`cargo init`, `poetry new`, `create-vite`, `claude plugin init`) refuses to silently overwrite. Users run scaffolds inside repos they already care about. | LOW | Simplest safe rule: if target dir exists and is non-empty, abort with a clear error listing what already exists. No need for interactive overwrite/ignore/merge menu (that's `create-vite`-level complexity, YAGNI for a single-audience CLI) — see Anti-Features. |
| `--force` / explicit override flag | `claude plugin init` (the closest official precedent, same ecosystem) ships `-f, --force` to overwrite an existing `.claude-plugin/`. `create-vite` ships `--overwrite`. Users need an escape hatch for re-running after a mistake, without a second interactive tool. | LOW | One boolean flag. Non-interactive (matches Motto's existing zero-prompt `lint`/`build` UX — no Inquirer dependency to add). |
| Name argument with validation, defaulting to current directory name | `cargo new <name>` requires a name; `cargo init` (no name arg) defaults to the directory name; `claude plugin init <name>` requires a name and rejects spaces/path separators. Motto already validates skill `name` as kebab-case in `motto lint` — same rule should apply to the project/plugin name written into `motto.yaml` and `marketplace.json`. | LOW | `motto init [name]` — optional positional arg (per PROJECT.md), default to `path.basename(cwd)`; validate against the same kebab pattern (`[a-z][a-z0-9-]*`) already enforced for skill names, reject early with an actionable message (not a stack trace). |
| Scaffolds a complete, immediately-buildable project | Every scaffold tool's core promise is "run one command, get a working thing," not "run one command, get a half-finished stub you must hand-edit before anything works." | MEDIUM | This is Motto's stated MVP bar: `motto init` output must pass `motto lint` and `motto build` with zero edits (PROJECT.md: "starter example skill (lint+build pass immediately)"). This is the single hardest-to-get-wrong requirement — the starter skill is generated content that must satisfy the strict schema Motto itself enforces. |
| Clear, itemized completion output | `cargo new`/`cargo init` print what was created; `claude plugin init` reports the scaffolded path and next steps. Silent success (exit 0, no output) reads as broken in a CLI tool whose entire value prop is transparency/rigor. | LOW | List files created (motto.yaml, .claude-plugin/marketplace.json, skills/<starter>/, shared/references/, .gitignore) + a one-line "next steps" hint (e.g. `motto lint`, `motto build`). Keep it plain-text, matching the project's existing "no chalk/colors" constraint. |
| `--help` with real usage text, exit 0 | Table stakes for any CLI; explicitly in scope this milestone (PROJECT.md Active requirements). Every tool researched (npm, cargo, poetry, vite, claude) supports `--help`. | LOW | Constant string per the STACK.md decision (no `commander`/`yargs`); must cover `init`, `lint [path]`, `build [path]`, `--help` itself. |
| `[path]` positional arg for `lint`/`build`, default cwd | Matches every researched tool's pattern of "operate on cwd unless told otherwise" (`cargo init [path]`, `poetry` commands accept `--directory`). Already an explicit Active requirement. | LOW | Small, orthogonal to `init` — just resolve `path.resolve(pathArg ?? process.cwd())` before existing lint/build logic. |
| `.gitignore` scaffolded with `dist/` (or the split public/private convention) excluded appropriately | Standard for any tool that generates build output into the repo. Motto's own repo does this (private dist must never leak; public dist gets committed per README "ship your plugin" flow). | LOW | Must match the emerging convention (PROJECT.md: commit `dist/public/`, not `dist/private/`) — so `.gitignore` should ignore `dist/private/` but *not* `dist/public/`, since public dist is the thing marketplace.json's relative-path source points at and must be committed to be installable. Getting this backwards silently breaks the whole distribution story. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required for MVP, but align with Motto's core value (strict schema + linter).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Starter skill that demonstrates the schema, not just a stub | Most scaffold tools (`npm init -y`, `cargo new`) emit minimal boilerplate. A starter skill that showcases the Title+Role spine, a `references/` file, and passes lint is itself documentation — "show, don't tell" for the strict schema that is Motto's whole differentiator. | MEDIUM | Directly serves Core Value from PROJECT.md. Low marginal cost since the schema/spine already exists; the work is authoring one good example, not new mechanism. |
| `motto.yaml` pre-filled with sane project defaults (name, version `0.0.1`, description prompt-free) derived from `[name]` arg / directory / `package.json` if present | `claude plugin init` derives author identity from `git config user.name`/`user.email` — same low-friction pattern: derive what's derivable, ask for nothing. | LOW–MEDIUM | Optional enrichment: if a `package.json` exists in the target dir, pre-fill `description` from it. Not required for MVP; nice zero-question polish. |
| `marketplace.json` scaffolded with the *relative-path* (git-hosted) source variant, correctly wired to `dist/public/` | This is the actual hard, easy-to-get-wrong part (see verified schema below) — most competing scaffold tools don't have an equivalent "cross-file consistency" concern. Getting the `source`/`skills`/`strict` triangle right by construction (not by user trial-and-error) is a genuine differentiator vs. hand-authoring it, which is exactly the friction v0.0.3 exposed. | MEDIUM | See verified schema below. This is the one place `motto init` output needs to be *correct*, not just present — a malformed marketplace.json fails silently/late (at `/plugin marketplace add` time), far from when it was generated. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems, given Motto's YAGNI/mechanism-over-features philosophy and single-maintainer/CLI-scriptable audience.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Interactive prompts (Inquirer-style wizard: "what's your skill name? what's your description?...") | `create-vite`, `npm init` (via `create-*` packages) do this; feels "friendly." | Adds a dependency (contradicts STACK.md's explicit `commander`/interactive-prompt avoidance and single-runtime-dep philosophy), breaks non-interactive/CI/agent use (an AI agent running `motto init` in a script cannot answer a TTY prompt), and duplicates validation logic that `motto lint` already owns. | Flags + positional arg + validated defaults, non-interactive always (matches `claude plugin init`'s flag-only design and Motto's existing `lint`/`build` UX). |
| Overwrite/merge/ignore three-way prompt menu (`create-vite`'s full UX) | Feels thorough; handles every edge case of a messy target dir. | Massive complexity for a tool whose target user already knows what an empty repo looks like; YAGNI per project philosophy ("mechanism over features," "iterate slowly"). | Binary rule: non-empty dir + no `--force` → abort with error. `--force` → proceed (documented as "will overwrite/add files"). |
| `motto init` auto-running `git init` / auto-committing | `cargo new` defaults to `git init` when not already in a VCS. | Motto's target user is *already* in a repo most of the time (adding skills to an existing project) per this milestone's framing ("adding to existing app"); auto-`git init` assumes a workflow that may not hold, and silently touching VCS state from a scaffold tool is a support-burden magnet. | Do nothing with git. If the dir isn't a repo, that's the user's call — document it in README, don't automate it. |
| A `motto ship` command bundled into this milestone | Natural "why not automate the last mile too" urge once `init` exists. | Explicitly already rejected in PROJECT.md ("Explicitly not building... backlog until real friction shows"). Re-litigating this in `init`'s design would scope-creep past the locked decision. | Two documented git commands in the README's "ship your plugin" section (already the plan). |
| Multiple starter skill "flavors" / templates at init time (`--template procedure`, `--template form`) | Feels like it rounds out the offering, mirrors `create-vite --template react-ts`. | Concrete templates are explicitly Out of Scope for v1 (PROJECT.md: "Concrete templates... mechanism only in v1; design against the first real skill that needs them"). One starter skill is sufficient to prove lint+build pass; multiple flavors is unvalidated speculative scope. | Ship exactly one starter skill. Template *mechanism* (schema add-ons) already exists separately and is untouched by `init`. |

## Feature Dependencies

```
motto init [name]
    ├──requires──> existing kebab-case name validation (already built, in motto lint)
    ├──requires──> existing motto.yaml schema/shape (already built)
    ├──requires──> existing skill schema (Title+Role spine, frontmatter rules) — to author a starter skill that passes lint
    └──produces──> a tree that must immediately satisfy:
                       ├──requires──> `motto lint` (existing, unmodified)
                       └──requires──> `motto build` (existing, unmodified) ──produces──> dist/public/
                                                                                   └── marketplace.json's relative-path source depends on this exact output shape

[path] arg for lint/build ──independent-of──> motto init (small, orthogonal; can ship separately)

--help ──independent-of──> motto init (small, orthogonal)

setup-project skill removal ──conflicts-with──> keeping motto init incomplete
    (removing the instructional skill before init covers its content leaves a documentation gap)
```

### Dependency Notes

- **`motto init` requires the existing lint/build pipeline to stay unmodified and correct:** the starter skill it generates is only proof of value if `motto lint && motto build` pass on it with zero edits. This makes `init`'s starter-skill content a *de facto* regression test for the schema — if a future schema change breaks the starter skill, that's a signal the schema changed in a way real users would hit too.
- **`marketplace.json` scaffolding requires the exact `dist/public/` shape `motto build` produces** (skill folders directly at the plugin root, no nested `skills/` wrapper — confirmed by inspecting this repo's own `dist/public/`). The scaffolded `marketplace.json`'s `source`/`skills` fields must be written to match that shape by construction, not left for the user to debug against Claude Code's install-time errors.
- **Removing `setup-project` conflicts with an incomplete `init`:** PROJECT.md pairs these as one requirement ("Delete `setup-project` instructional skill — folded into `motto init` + README"). Sequence matters: don't delete the old instructional path until `init` + README cover everything it used to explain.
- **`--help` and `[path]` arg are independent** of `init` and of each other — no ordering constraint, can be parallelized or sequenced arbitrarily within the phase.

## MVP Definition

### Launch With (v1 — this milestone)

Minimum viable product — matches PROJECT.md's Active requirements exactly.

- [ ] `motto init [name]` — non-interactive, flag-driven, produces a complete tree (`motto.yaml`, `.claude-plugin/marketplace.json`, `skills/<starter>/`, `shared/references/`, `.gitignore`) that passes `motto lint` and `motto build` with zero edits — essential: this *is* the milestone's stated success bar ("no reverse-engineering")
- [ ] Non-empty-target-directory guard + `--force` override — essential: every researched precedent treats silent overwrite as a bug-class, not a feature
- [ ] Correct `marketplace.json` relative-path source (verified schema below) — essential: a malformed one fails late and confusingly at `/plugin marketplace add` time, defeating the "no reverse-engineering" goal
- [ ] `--help` with real usage text, exit 0 — essential, explicit requirement
- [ ] `[path]` optional arg for `lint`/`build`, default cwd — essential, explicit requirement
- [ ] README "ship your plugin" section — essential, explicit requirement, closes the loop from `init` to a working install
- [ ] `setup-project` skill removed — essential, explicit requirement, avoids two conflicting sources of truth

### Add After Validation (v1.x)

Features to add once core is working and real friction appears.

- [ ] Pre-fill `motto.yaml` description from an existing `package.json` if present — trigger: someone runs `motto init` inside a repo that already has project metadata and finds re-typing it annoying
- [ ] `motto ship` convenience command — trigger: real friction with the two-git-command flow, per PROJECT.md's own deferral note

### Future Consideration (v2+)

Features to defer until product-market fit / real multi-user demand is established.

- [ ] Concrete starter templates (`--template procedure`/`form`/`reference`) — defer until a real skill author hits the wall the mechanism was designed for (TMPL-01, already deferred in PROJECT.md)
- [ ] Interactive prompt mode as an opt-in (`motto init --interactive`) — defer until non-interactive-only proves insufficient for a real onboarding user; adds a dependency Motto has so far avoided

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `motto init` core scaffold (motto.yaml + tree + starter skill) | HIGH | MEDIUM | P1 |
| Correct `marketplace.json` relative-path scaffold | HIGH | LOW–MEDIUM (once schema is known — see below) | P1 |
| Non-empty-dir guard + `--force` | HIGH | LOW | P1 |
| `.gitignore` with correct public/private dist split | MEDIUM | LOW | P1 |
| `--help` | MEDIUM | LOW | P1 |
| `[path]` arg for lint/build | MEDIUM | LOW | P1 |
| README ship-your-plugin section | HIGH | LOW (docs only) | P1 |
| `setup-project` removal | LOW (cleanup) | LOW | P1 |
| `package.json`-derived defaults | LOW | LOW | P2 |
| `motto ship` command | MEDIUM | UNKNOWN (design undecided) | P3 |
| Concrete templates | MEDIUM | HIGH | P3 |
| Interactive mode | LOW | MEDIUM (new dep) | P3 |

**Priority key:**
- P1: Must have for launch (this milestone)
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Verified: marketplace.json Relative-Path Schema (git-repo-hosted, non-npm)

Cross-checked against `code.claude.com/docs/en/plugin-marketplaces` (official docs, fetched 2026-07-01) and this repo's own working `.claude-plugin/marketplace.json` (npm-source variant, currently shipping).

**Required fields per plugin entry:** `name` (string, kebab-case, public-facing), `source` (string|object).

**Relative-path source** (the correct variant for `motto init`'s scaffold — git-repo-hosted, not npm):
- Type: plain **string**, must start with `"./"` — e.g. `"./dist/public"`.
- Resolved **relative to the marketplace root** (the directory containing `.claude-plugin/`), *not* relative to the `.claude-plugin/` directory itself. Do not use `../` — paths outside the marketplace root are disallowed.
- No sub-fields (unlike `github`/`url`/`git-subdir`/`npm`, which are objects with `repo`/`url`/`ref`/`sha`/etc).

**`skills` field** (optional, string|array): custom skill-directory paths, added on top of the default `<source>/skills/` scan. Paths are relative to the resolved plugin directory (i.e., relative to wherever `source` points), not to the marketplace root. Since Motto's `motto build` output places skill folders **directly** at the plugin root (`dist/public/<skill-name>/`, confirmed by inspecting this repo's own `dist/public/`) rather than under a nested `dist/public/skills/`, a scaffold that sets `"source": "./dist/public"` needs an explicit `skills` override pointing at the plugin root itself (the same pattern this repo's own npm-source entry already uses: `"source": {"source":"npm","package":"@jeremiewerner/motto"}` + `"skills": "./dist/public/"` — i.e., "skills" points at wherever the actual skill folders live, since they're not under a `skills/` subfolder). **This exact mechanic (does `skills: "./"` vs. omitting `skills` correctly make Claude Code scan `dist/public`'s immediate children as skills when `source` already equals `./dist/public`?) is not 100% pinned down by the docs prose alone and should be smoke-tested against a real `/plugin marketplace add ./` + `/plugin install` during phase implementation** — flagged as a phase-specific research/verification item, not blocking this research pass.

**`strict` field** (optional, boolean, default `true`): controls whether `plugin.json` is authoritative for component definitions. `true` (default) = `plugin.json` is authoritative, marketplace entry supplements it. `false` = marketplace entry is the *entire* definition; if `plugin.json` also declares components, that's a load-time conflict. Motto's own shipping example already uses `strict: false` with a hand-authored `plugin.json` that has no component fields (just `name`/`version`/`description`) — so `false` is safe there. **For `motto init`'s scaffold, default to `strict: false` to match the established working pattern**, since the generated `plugin.json` (from `motto build`) similarly carries only identity metadata, not component declarations.

**Minimal correct scaffold shape:**

```json
{
  "name": "<project-name>",
  "owner": { "name": "<from git config user.name>", "email": "<from git config user.email>" },
  "plugins": [
    {
      "name": "<project-name>",
      "source": "./dist/public",
      "description": "<from motto.yaml description>",
      "skills": "./",
      "strict": false
    }
  ]
}
```

This differs from motto's own current marketplace.json (which uses the `npm`-source object variant, appropriate only *after* the project is npm-published) — new projects scaffolded by `motto init` should default to the git-hosted relative-path variant, since a brand-new project has no npm package yet. This matches PROJECT.md's explicit framing: "`.claude-plugin/marketplace.json` (relative source → `dist/public/`)".

## Collision / Edge-Case Behaviors (cross-ecosystem survey)

| Scenario | npm init/create | cargo init/new | poetry new/init | create-vite | claude plugin init (same ecosystem) | Recommendation for `motto init` |
|----------|------------------|-----------------|------------------|-------------|--------------------------------------|-----------------------------------|
| Target dir doesn't exist | `create-*` package creates it | `cargo new` creates it | creates it | creates it | creates `~/.claude/skills/<name>/` | Create it (`fs.mkdir(recursive:true)`) |
| Target dir exists, empty | Proceeds | Proceeds (`cargo init` requires this to be the "current dir" case) | Proceeds | Proceeds | Proceeds | Proceeds |
| Target dir exists, non-empty, no manifest conflict | Left to `create-*` package (varies) | `cargo new` errors if dir already exists at all | Historically buggy; PEP-508-name errors surface early | Interactive prompt: overwrite/cancel/ignore | Errors, requires `-f/--force` | Abort with a clear listing of what already exists; require `--force` |
| Target dir has a **conflicting** manifest (`Cargo.toml`, `pyproject.toml`, `.claude-plugin/`) already | N/A (no single manifest file) | Hard error, no overwrite path shown | Hard error (can even break unrelated commands in that dir) | N/A (files, not a single manifest) | Hard error unless `-f/--force` | Hard error unless `--force`; name the exact conflicting file (`motto.yaml` and/or `.claude-plugin/marketplace.json`) in the message |
| Non-interactive / scripted use | `-y`/`--yes` | N/A (already non-interactive) | N/A (`init` is more interactive by default) | `--no-interactive` flag | Always non-interactive (flags only) | **Always non-interactive** — no prompt library, matches Motto's existing `lint`/`build` UX and this project's stdlib-only constraint |
| Name validation | npm package-name rules (via `create-*`) | crate-name rules; `--name` overrides dir-derived default | PEP 508 rules | package-name rules | "cannot contain spaces or path separators" | Reuse Motto's existing kebab-case skill-name validator (`[a-z][a-z0-9-]*`) for the project name too — one validation rule across the whole tool, not two |
| Author/owner identity defaults | N/A | N/A | interactive prompt | N/A | `git config user.name` / `user.email` | Derive `marketplace.json`'s `owner.name`/`owner.email` from `git config user.name`/`user.email` when available, matching the same-ecosystem precedent; leave blank (not a fake placeholder) if git config is unset |
| Idempotency (re-running the same command) | `-y` reruns produce same result if nothing changed | Errors on second run (manifest exists) | Errors on second run | Prompts again (or `--overwrite` reruns) | Errors on second run unless `-f` | Errors on second run unless `--force` — matches the majority/safe pattern; re-running `motto init` on an already-scaffolded project should never be a silent no-op *or* a silent overwrite |

## Sources

- `docs.npmjs.com/cli/v11/commands/npm-init/` — npm init/create semantics, `-y` flag. Confidence: MEDIUM (official npm docs, cross-checked via web search).
- `doc.rust-lang.org/cargo/commands/cargo-init.html`, `doc.rust-lang.org/cargo/commands/cargo-new.html` — collision errors, `--name`, `--vcs` defaults. Confidence: MEDIUM (official Rust docs).
- `python-poetry.org/docs/basic-usage/`, related GitHub issues (python-poetry/poetry #3073, #8412) — PEP 508 name validation, existing-manifest error behavior. Confidence: MEDIUM.
- `github.com/vitejs/vite` discussions/issues + `vite.dev/guide/` — `create-vite` overwrite prompt, `--overwrite`, `--no-interactive` flags. Confidence: MEDIUM.
- `code.claude.com/docs/en/plugins-reference` — `claude plugin init` CLI spec (`-f/--force`, `--with`, git-config-derived author defaults), same-ecosystem precedent for scaffold UX. Fetched 2026-07-01. Confidence: MEDIUM (official Claude Code docs).
- `code.claude.com/docs/en/plugin-marketplaces` — complete `marketplace.json` schema: required/optional plugin-entry fields, all four `source` variants (relative-path/github/url/git-subdir/npm), `skills` override semantics, `strict` mode semantics and default. Fetched 2026-07-01, exact JSON examples grepped directly from raw fetched markdown (not model-paraphrased). Confidence: MEDIUM (official Claude Code docs).
- `/Users/jeremie/Projects/motto/.claude-plugin/marketplace.json` and `/Users/jeremie/Projects/motto/dist/public/` (this repo, inspected directly) — ground-truth working example of the npm-source variant + confirmation that `motto build` places skill folders directly at the plugin root (no nested `skills/` wrapper). Confidence: HIGH (first-party, directly inspected).
- `/Users/jeremie/Projects/motto/.planning/PROJECT.md` — milestone scope, explicit Active requirements, locked decisions from v0.0.3. Confidence: HIGH (first-party project source of truth).

---
*Feature research for: motto init scaffold command (v0.0.4 Project Bootstrap)*
*Researched: 2026-07-01*
