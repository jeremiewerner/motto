# Motto — Design (v1)

**Date:** 2026-06-29
**Status:** Approved design, pre-implementation
**Scope:** First iteration. Mechanism over features. Iterate slowly.

## Purpose

Motto is a framework for **authoring, validating, and packaging Claude Code Agent Skills**. You author skills in a structured source tree; Motto enforces a strict schema and builds them into self-contained, distributable plugins.

Motto is the *authoring layer*. Its output is **plain, standard Agent Skills** — any agent loads them with no knowledge of Motto.

## Principles

- **Accuracy, portability, extensibility, maintenance** are the fundamentals. No rush to add code.
- **Rigid enough to give structure, flexible enough to allow creativity.**
- **YAGNI.** Ship the mechanism; add concrete features only against a real skill that needs them.
- **Output stays portable** even though the tooling is Claude-Code-specific.

## Architecture

### Distribution

Motto ships as a **Claude Code plugin**, installed **per-project** (each project pins its Motto version — "iterate slowly" needs version isolation). Updated via the plugin manager (one command); never hand-edited. Its CLI (`lint`, `build`) rides inside the plugin.

Motto's own skills (the meta-skill that teaches the agent the framework) ship inside the package and auto-load — they appear under `/motto:*`, **author-only**, and never reach the shipped product.

### Repo layout (a Motto project = your repo)

```
your-repo/
├── skills/             # your authored skills (hand-edited source)
│   └── <skill-name>/
│       ├── SKILL.md
│       ├── references/  # skill-local refs (standard Agent Skill convention)
│       └── scripts/     # skill-local executables (only if the skill needs)
├── shared/             # project-scope shared references, bundled at build
└── dist/               # GENERATED — do not hand-edit
    ├── public/         # → plugin "<project>"          (publish this)
    └── private/        # → plugin "<project>-private"  (local only)
```

Motto itself is **not** in the repo — it's an installed dependency.

### Output

`motto build` emits `dist/` as **self-contained Claude Code plugins named after your project**:

- `dist/public/` → plugin `<project>` → consumers install it, see `/<project>:*`. Motto's name appears nowhere.
- `dist/private/` → plugin `<project>-private` → local only, never published.

A skill's declared shared references are **resolved and copied into its dist folder** so each published skill stands alone in any repo, with or without Motto. Duplication lives only in the generated `dist/` artifact; source stays single-copy (DRY). (Exception for large shared datasets is a future optimization, not v1.)

Project **identity** (`name`, `version`, `description`) for the generated `plugin.json` is read from the repo's `package.json` if present, else a minimal `motto.yaml`. Defined later by the project author.

## Skill schema

Output is a standard Agent Skill (`SKILL.md` + frontmatter + `references/`). Motto layers strict rules in three layers.

### Layer 1 — Frontmatter (enforced hard)

```yaml
name:               # required, kebab-case, must match folder name
description:        # required, the trigger ("use when…")
audience:           # required, public | private
template:           # optional, defaults to base
dependencies:       # optional, MCP tools / other skills the skill needs
shared_references:  # optional, shared refs to resolve + bundle at build
```

`audience` is binary. `public` = published *and* available to you locally; `private` = yours only. (`both` was rejected: redundant, and would collide across the two locally-installed plugins.)

Unknown frontmatter keys are harmless (agents ignore them), so Motto's extras ride along in the published skill with no stripping.

### Layer 2 — Body spine (the rigid-vs-creative dial)

Every skill must contain a minimal universal spine:

- `# Title`
- **Role** — a one-line stance ("you are acting as…").

Both **mandatory**, but **waivable only by an explicit template** (so a future `reference` template can drop Role deliberately — never by an author forgetting). Prose between the required beats is free.

`description` is *not* echoed in the body — the frontmatter is the single source of the trigger.

### Layer 3 — Templates (mechanism only in v1)

A template is a **schema add-on**: it layers extra required sections/fields onto base, lives in the framework's `schema/templates/<name>.yaml`, and a skill opts in via `template: <name>`. A template may also waive base rules (the Role escape hatch). The linter validates a skill against `base + chosen template`.

**v1 ships zero concrete templates** — only the mechanism. The first template is designed against the first real skill that base cannot express. Candidate archetypes (procedure, form, reference) are deferred.

## Shared references

**One scope in v1: the project's `shared/`.** Skills declare `shared_references:` and the build resolves + copies those files into each skill's dist folder. A framework-shipped shared library (a second scope) is deferred until Motto has refs worth shipping; with one scope there is nothing to shadow.

## Tools (v1 surface)

- **`motto lint`** — the core value. Validates every skill against the schema: frontmatter present + typed, `name` matches folder, Title + Role spine present, `template` (if set) exists, `shared_references` resolve. Fails loud. Fast, no output — run while authoring.
- **`motto build`** — runs lint first (refuses to build on failure), then resolves deps + copies → `dist/public` & `dist/private` as the two plugins, writing each `plugin.json` from project identity.

`build` = `lint` + emit; they share one core.

## Deliberately deferred (add on real need)

Concrete templates · tone/verbosity engine · datasets to feed skills · forms (YAML/MD question series) · output templates · sub-skills (`shared/skills/`) · framework-shipped shared library · MCP-dependency resolution · build-time content transform/inlining · `motto new` scaffold · `motto update` (the plugin manager already does this) · strip-on-build of internal frontmatter keys · large-dataset shared optimization.

Each is a known upgrade path, not an omission. The mechanism supports them; none is built until a concrete skill demands it.

## Open items

- Project identity values (`name`/`version`/`description`) — filled in by author later.
- First concrete template — designed against the first real skill.
```