# Motto v0.0.5 — Skill Builder — Design

**Date:** 2026-07-02 · **Status:** approved (brainstorm with Jérémie)
**Goal:** user describes a procedure in any form → Motto structures it into a validated, conforming, distributable skill.

## Standing principles (apply to every step)

1. Heavy research for each step.
2. Design for unknown purpose — mechanisms agile enough to fit any skill a user might build.
3. Lightweight — don't overcode, don't over-document; code/md must stay readable.
4. Agentic best practice — SKILL.md today; agents, subagents, external tools (API, MCP) are first-class citizens of the ecosystem Motto serves.
5. Simple to adapt, evolve; creativity free.
6. Rigor lives in a small, easy spine that drives everything.

## Context

- gsd-core (open-gsd/gsd-core, 5.7k★) analyzed 2026-07-02: validates Motto's thesis (they lint their own markdown via ad-hoc tests; needed size-budget ADRs against sprawl). Steal: declarative args, tool declarations, XML section spine, deny-list linting, generate-don't-duplicate. Reject: required-literal-string linting, second metadata syntax, giant files.
- Dormant `template:` mechanism (TMPL-01) gets its first real consumer here — designed against build-skill, not speculatively.
- XML-tag ban applies to `description` frontmatter only; body tags are legal (verbatim copy).

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D-01 | Rigor via `template:` mechanism, not global schema change | Base skills untouched; opt-in rigidity; closes TMPL-01 with real consumer |
| D-02 | Interview lives in an Agent Skill (`build-skill`), CLI stays non-interactive | Upholds v0.0.4 logged decision; agent intelligence needed to parse free-text procedures |
| D-03 | build-skill is a structurer, not an ideator | Users bring superpowers/GSD/etc.; build-skill consumes any input, asks only schema-gap questions |
| D-04 | Named outputs map (`outputs: {name: file}`) | "Same skill, different output parameters"; single-output = one-entry map |
| D-05 | `dependencies:` resolve in-tree; `allowed-tools` format-checked only | Lint what's verifiable; tool existence is runtime-dependent |
| D-06 | Keep field name `allowed-tools` (not `tools`) | Real Agent Skills frontmatter field — runtime honors it; portability is fundamental. `tools:` is the agent-file field, reserved for a future `agent` template |
| D-07 | Section-tag registry as data; unknown tags legal | Rigor on known tags, creativity free elsewhere; registry doubles as doc source |
| D-08 | `{var}` placeholders = documented convention, not linted in v0.0.5 | YAGNI; interpolation engine deferred |

## 1. Template mechanism

`src/templates.js` — pure data, no per-template code:

```js
export const SECTIONS = {
  process: "Numbered steps the agent executes, in order.",
  success_criteria: "Checkable conditions that define done.",
};

export const TEMPLATES = {
  procedure: {
    requiredSections: ["process", "success_criteria"],
    // future keys: requiredFields, waives ("title" | "role")
  },
};
```

- `template: <name>` → validator merges template rules onto base schema. Unknown name → lint error listing available templates.
- No `template:` → today's behavior exactly.
- Spine-waiving (`waives`) is designed-in but unused by `procedure`.
- Extension path: new template = new data entry. Multi-template (`template:` as array) is a foreseen evolution, not built now.

## 2. `procedure` template

- Body must contain `<process>` and `<success_criteria>` XML sections. Presence-checked; content free.
- XML tags over markdown headings: reliably parsed by agents, greppable, never collide with author headings (gsd-core proof at scale).
- Base spine (H1 + `**Role:**`) still applies. Everything else free.

## 3. New validated optional fields (global, any skill, when present)

- **`outputs:`** map name → file, relative to skill dir; must exist; path-safe (no `..`, no leading `/`, no escape). `{var}` placeholders inside = convention only (D-08).
- **`dependencies:`** array. Bare kebab name → must exist in project `skills/` tree. Namespaced (`plugin:skill`) → format check only.
- **`allowed-tools:`** array of non-empty whitespace-free strings (`Bash`, `mcp__x__*`). Format only.
- All never-throw; adversarial malformed-input tests mandatory (standing invariant).

## 4. build-skill Agent Skill

`skills/build-skill/` (public), itself `template: procedure` — dogfoods the milestone; the ultimate test is Motto building its own kind.

Flow: **ingest** any input (freeform text, doc, conversation) → **map** onto schema → **gap-fill questions only** (name, trigger/description, steps, outputs + formats, deps/tools, audience) → **write** `skills/<name>/SKILL.md` + output template files → **`motto lint`** → fix until clean → report.

`author-skill` retired: teaching content already in `skill-schema.md` (bundled as build-skill shared ref). Closes AUTH-SKILL, kills lint-string duplication.

## 5. Docs & dogfood

- `skill-schema.md` remains the single canonical rules doc — updated in place, no new doc files.
- Dogfood test extended: build-skill lints clean under `procedure` template.

## Evolution ledger (traced, NOT in v0.0.5)

- New action tags: `<drill>` (ask user), `<run>` (CLI command), `<mcp>` (MCP query) — registry entries when a real skill needs them.
- Skill-calls-skill with parameters; var placeholders resolved across skill boundaries.
- `{var}` interpolation/validation engine for output templates.
- `template:` as array (multi-template composition).
- `agent` template: generate agent/subagent `.md` files (`tools:` field lives there).
- Migrate base-spine `**Role:**` line → `<role>` registry tag (breaking; needs migration story).
- MCP dependency resolution.
- CLIX-01/02 (`--quiet`, `--format json`), SHIP-01, CI-01 — pre-existing backlog, untouched.

## Non-goals (v0.0.5)

Everything in the evolution ledger, plus: no interpolation runtime, no new CLI subcommands, no content transformation at build (verbatim copy holds).
