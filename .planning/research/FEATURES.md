# Feature Research

**Domain:** Meta-skills — Motto authoring its own skill tree (v0.0.2 dogfood)
**Researched:** 2026-06-30
**Confidence:** HIGH (primary source: the shipped v0.0.1 source code, schema rules, and design spec; no external research needed — the schema is definitional)

---

## Context: What This Research Covers

This milestone is not about CLI features. It is about **what skill content** Motto should author about itself. The question is: given that Motto's purpose is to validate and build Agent Skill plugins, what skills should appear in Motto's own `skills/` tree, and what should each one say?

The constraint is ≥1 public skill, ≥1 private skill, ≥1 shared_reference. The goal is to exercise the full schema surface (both audience values, shared refs bundled into dist) while producing skills that are **genuinely useful** to a real reader — not dogfood filler.

Two reader types exist:

- **Plugin consumer (public):** Someone who installs the built Motto plugin and wants to author skills using Motto. They need to know the schema and how to set up a project.
- **Maintainer (private):** Jeremie, releasing new versions of Motto. Needs a process checklist that is too sensitive or too specific to ship publicly.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Skills the public plugin consumer cannot do without. Missing these = the plugin is useless to anyone who installs it.

| Skill / Content | Why Expected | Complexity | Notes |
|-----------------|--------------|------------|-------|
| **How to write a SKILL.md** (`authoring-a-skill`) | A consumer who installs the plugin's first question is "how do I write a skill?" Without this, they must read the source code. | LOW | Covers all required frontmatter fields, name rules, body spine, shared_references syntax. The schema is already locked; the content is factual. |
| **Schema field rules in a referenceable document** (`skill-schema` shared ref) | Multiple skills need to cite the same rule set. Duplicating it in every skill body would create drift when rules change. | LOW | One `.md` file in `shared/references/`. Covers the exact regex, reserved words, audience values, body spine contract, and error messages the linter emits. Bundled verbatim by `motto build` into each skill's `references/`. |
| **How to set up a Motto project** (`motto-project-setup`) | A second distinct reader moment: someone knows what a skill is but needs to know how to wire up the directory layout, motto.yaml, and the CLI. | LOW | Covers `skills/<name>/`, `shared/references/`, `motto.yaml` fields, `motto lint`, `motto build`, and what `dist/` contains. Also references `skill-schema` for the name/version format rules. |

### Differentiators (Competitive Advantage)

Skills that go beyond satisfying the dogfood constraint and show that Motto produces genuinely useful documentation.

| Skill / Content | Value Proposition | Complexity | Notes |
|-----------------|-------------------|------------|-------|
| **Maintainer release checklist** (`motto-release`, private) | Private skills are a first-class Motto feature. Shipping a real private skill — not a toy — proves the private bucket works and demonstrates the feature to anyone reading the source. A release checklist is operationally real: it prevents mistakes. | LOW-MEDIUM | Covers: run `node --test`, version bump in package.json, dogfood `motto lint && motto build`, tag commit, npm publish (stub until packaging exists). The npm publish step is partially TBD; stub it as a placeholder with a `<!-- TODO: expand when npm packaging is configured -->` comment. |
| **Annotated example in `authoring-a-skill`** | Most meta-documentation tells; showing a complete, annotated SKILL.md example teaches instantly. Inline examples make the content genuinely useful vs. a prose restatement of the README. | LOW | Embed one minimal but correct example SKILL.md inline in the body, showing every required field populated with realistic values. |

### Anti-Features (Commonly Requested, Often Problematic)

Skill ideas that seem obvious but should not be written yet.

| Anti-Skill | Why Appealing | Why Problematic | What to Do Instead |
|------------|---------------|-----------------|-------------------|
| **`skill-schema-reference`** as a standalone skill | Reference content seems like an obvious skill. | A pure reference document with no behavioral Role is content that belongs in a shared_reference file, not a skill body. A skill must tell an agent *what to do*, not just *what things are*. A reference-only skill body would lack any actionable stance. | Put the schema reference in `shared/references/skill-schema.md` and cite it from skills that need it. |
| **`troubleshooting-motto`** skill | Troubleshooting skills are useful in mature tools. | Motto has zero known in-the-field failure patterns. Writing a troubleshooting skill now would be speculative content. YAGNI. | Write it when real failure patterns accumulate from actual usage. |
| **`motto-overview`** skill | An overview skill for any tool seems table stakes. | The `description` field in each skill's frontmatter already provides the trigger-and-purpose summary. A skill body that just re-explains what Motto is at high level has no behavioral role — an agent triggered by "what is Motto?" doesn't need a 500-word overview skill. | Let the `description` field carry the what-is-Motto signal. |
| **`distributing-a-motto-plugin`** skill | Publishing and distributing built plugins is the logical next step. | Motto's distribution mechanism (`global install vs. repo-local .motto/`) is explicitly deferred and undecided (PROJECT.md Out of Scope). Writing a distribution skill now would document a process that doesn't yet exist and might need to be rewritten. | Write this when the distribution follow-up milestone ships. |

---

## Proposed Skill Set (Concrete)

### Skill 1: `authoring-a-skill`

| Field | Value |
|-------|-------|
| `name` | `authoring-a-skill` |
| `audience` | `public` |
| `shared_references` | `['skill-schema']` |
| **Reader** | Someone who wants to write a new skill using Motto and doesn't know the schema |
| **Trigger moment** | "How do I write a Motto skill?" / "What does a SKILL.md need?" |
| **Complexity** | LOW — the schema is locked; content is factual |

**Body spine:**

```
# Authoring a Motto Skill

**Role:** You are a hands-on guide for writing conforming Motto skills...
```

**Body sections:**

1. What a skill is (one sentence: a SKILL.md that Motto validates and packages into a Claude Code Agent Skill plugin)
2. **Required frontmatter fields** — for each: what it is, the rule, example value, what lint says if wrong:
   - `name`: letter-start kebab (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`), must equal the folder name, no `anthropic`/`claude` substrings, max 64 chars
   - `description`: non-empty, max 1024 chars, no XML tags, state both what the skill does and when to trigger it
   - `audience`: exactly `public` or `private`
3. **The body spine** — why it is mandatory, what `# Title` signals, what `**Role:**` is for, the trap of a blank Role
4. **Optional frontmatter fields** — `shared_references` (array of basenames, not filenames), `template` (accepted, not yet validated), `dependencies` (accepted, not resolved)
5. **`shared_references` usage** — how to declare, what basenames to use, how `motto build` bundles them
6. **Annotated minimal example** — a full, correct SKILL.md with inline comments explaining each line
7. **Common lint errors** — the exact messages Motto emits and what each means:
   - `name must be letter-start kebab-case`
   - `name "X" must equal its folder name "Y"`
   - `body must begin with an H1 title line`
   - `body must contain a **Role:** line`
   - `shared_references entry "X" not found in shared/references/`

**Why `skill-schema` shared ref is justified here:** The body references the exact regex pattern and reserved-word list. Rather than hard-coding these in two skills (and risking drift), the shared ref is the single source of truth. The skill body cites it by name.

---

### Skill 2: `motto-project-setup`

| Field | Value |
|-------|-------|
| `name` | `motto-project-setup` |
| `audience` | `public` |
| `shared_references` | `['skill-schema']` |
| **Reader** | Someone who knows what a skill is but needs to initialize and wire up a Motto project |
| **Trigger moment** | "How do I set up a new Motto project?" / "What goes in motto.yaml?" |
| **Complexity** | LOW |

**Body spine:**

```
# Setting Up a Motto Project

**Role:** You are a setup guide for the Motto CLI, walking through project initialization...
```

**Body sections:**

1. **Directory layout** — annotated tree:
   ```
   my-project/
     skills/
       my-skill/
         SKILL.md
         references/     (optional — local skill-specific refs)
     shared/
       references/       (shared refs bundled into every skill that declares them)
     motto.yaml
     dist/               (generated — never edit)
   ```
2. **`motto.yaml` fields** — for each: what it is, the rule, example:
   - `name`: the project name (kebab)
   - `version`: semver string (e.g. `"0.1.0"`)
   - `description`: short project description
   - `plugins.public`: kebab name for the public plugin (e.g. `"my-project"`)
   - `plugins.private`: optional; only required when private-audience skills exist
3. **Running lint** — `motto lint`, what clean output looks like, what an error looks like
4. **Running build** — `motto build`, what `dist/` contains:
   - `dist/public/<plugin-name>/.claude-plugin/plugin.json`
   - `dist/public/<skill-name>/SKILL.md` (verbatim)
   - `dist/private/` (present only when private skills exist)
5. **Installing the built plugin in Claude Code** — how to point Claude Code at `dist/public/` or `dist/private/`

**Why `skill-schema` shared ref is justified here:** The `motto.yaml` `name`/`plugins.public`/`plugins.private` fields use the same kebab regex as skill names. Rather than restate the regex, the setup skill cites the shared ref.

---

### Skill 3: `motto-release`

| Field | Value |
|-------|-------|
| `name` | `motto-release` |
| `audience` | `private` |
| `shared_references` | none |
| **Reader** | The Motto maintainer (Jeremie) running a release |
| **Trigger moment** | "How do I release a new version of Motto?" |
| **Complexity** | LOW-MEDIUM (npm publish step is a stub) |

**Body spine:**

```
# Releasing Motto

**Role:** You are the Motto release process assistant for the maintainer only...
```

**Body sections:**

1. **Pre-release gate** — `node --test` must pass; all tests green; no `--experimental` failures
2. **Version bump** — update `version` in `package.json`; keep `motto.yaml` `version` in sync if Motto uses one
3. **Dogfood check** — run `motto lint && motto build` on Motto's own `skills/` tree; if lint fails, fix skills before tagging
4. **Tag and commit** — commit message convention, git tag `vX.Y.Z`, note any open issues that are deferred
5. **Publish** — `npm publish` (stub: `<!-- TODO: expand when npm packaging is configured -->`)
6. **Post-release** — update `PROJECT.md` Current State section; archive milestone in `MILESTONES.md`; close the milestone in the planning system

**Why no shared_reference:** The release process is maintainer-internal and references no schema content that is shared with public skills. It stands alone.

**Why private:** Release steps include publish credentials, internal tooling assumptions, and process decisions that are not relevant to public consumers. It should not appear in the public plugin.

---

### Shared Reference: `skill-schema`

| Field | Value |
|-------|-------|
| **File** | `shared/references/skill-schema.md` |
| **Consumers** | `authoring-a-skill`, `motto-project-setup` |
| **Complexity** | LOW |

**Content sections:**

1. **`name` field** — regex: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (letter-start kebab-case); must equal the folder name; max 64 chars; reserved substrings: `anthropic`, `claude`; the exact error message the linter emits for each violation
2. **`description` field** — max 1024 chars; must not contain XML tags (`<`, `>`); must state both what the skill does and when Claude should trigger it
3. **`audience` field** — must be exactly `public` or `private`; nothing else is valid
4. **`shared_references` field** — array of strings; each entry must be a safe basename (no `.` or `/`); the file must exist at `shared/references/<entry>.md`; the linter reports the entry if the file is missing
5. **`template` and `dependencies` fields** — accepted and passed through; not validated in v0.0.2
6. **Body spine** — first non-blank line must match `^# \S`; body must contain at least one line starting with `**Role:`; both checks are independent (both errors reported even if both fail)
7. **Frontmatter envelope** — must open with a bare `---` on the first line; must have a matching closing `---`; YAML 1.2 core schema (no `yes`/`no` boolean surprises); stray `---` inside the frontmatter block is detected and reported

---

## Feature Dependencies

```
skill-schema (shared/references/skill-schema.md)
    └──bundled-into──> authoring-a-skill (when built by motto build)
    └──bundled-into──> motto-project-setup (when built by motto build)

authoring-a-skill ──exercises──> public bucket in dist/
motto-project-setup ──exercises──> public bucket in dist/
motto-release ──exercises──> private bucket in dist/

public bucket exists ──requires──> plugins.public in motto.yaml
private bucket exists ──requires──> plugins.private in motto.yaml AND ≥1 private skill
```

### Dependency Notes

- **Both public skills share `skill-schema`:** This is the point of `shared_references` — the reference is bundled into each skill's `references/` at build time, making each dist skill self-contained.
- **`motto-release` requires no shared ref:** It references no schema content. Adding `skill-schema` to it would be padding.
- **`motto.yaml` must declare `plugins.private`:** Without it, `motto build` rejects the private skill (`audience private but plugins.private not set in motto.yaml`). Writing `motto-release` exercises this validation path.

---

## MVP Definition

### Launch With (v0.0.2)

Minimum skill set to satisfy the dogfood goal and exercise the full schema surface.

- [ ] `authoring-a-skill` (public) — teaches the schema; exercises `shared_references` in frontmatter
- [ ] `motto-project-setup` (public) — teaches project wiring; second consumer of `skill-schema`
- [ ] `motto-release` (private) — real maintainer use; exercises private bucket
- [ ] `skill-schema` (shared reference) — shared content; exercises the bundling mechanic

### Add After Validation (v1.x)

Add when real usage patterns surface:

- [ ] `troubleshooting-motto` (public) — once real failure patterns accumulate
- [ ] `distributing-a-motto-plugin` (public) — once the distribution mechanism is decided

### Future Consideration (v2+)

- [ ] `motto-overview` (public) — only if agent-invoked overviews prove useful in practice
- [ ] Template-specific authoring guides — once concrete templates are designed

---

## Feature Prioritization Matrix

| Skill / Content | User Value | Implementation Cost | Priority |
|-----------------|------------|---------------------|----------|
| `authoring-a-skill` | HIGH — first question every new user has | LOW — schema is locked; content is factual | P1 |
| `skill-schema` shared ref | HIGH — reused by two skills; single source of truth | LOW — mechanical transcription of the schema | P1 |
| `motto-project-setup` | HIGH — needed for anyone starting a project | LOW | P1 |
| `motto-release` | HIGH (for maintainer) | LOW-MEDIUM (npm stub) | P1 |
| `troubleshooting-motto` | MEDIUM | MEDIUM (requires real failure patterns) | P3 (defer) |
| `distributing-a-motto-plugin` | HIGH | MEDIUM (requires distribution design) | P2 (after distribution milestone) |

---

## Name Validity Checklist

All names must satisfy `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` and must not contain `anthropic` or `claude`:

| Name | Valid? | Notes |
|------|--------|-------|
| `authoring-a-skill` | Yes | Starts with letter, all lowercase, hyphens between groups |
| `motto-project-setup` | Yes | All lowercase, valid kebab |
| `motto-release` | Yes | Two groups separated by one hyphen |
| `skill-schema` (shared ref basename) | Yes | Valid kebab; also used as file basename in `shared/references/` |

---

## What Self-Documenting Meta Skills Should Read Like

A skill that documents its own tool is useful when it:

1. **Addresses a specific reader moment** — not "here is everything about X" but "here is what you need to do X right now." `authoring-a-skill` is for the moment of writing; `motto-project-setup` is for the moment of initializing.
2. **Has a real Role** — the `**Role:**` line must commit to a behavioral stance. "You are a documentation page" is not a role. "You are a hands-on guide who walks the author through every required field" is a role.
3. **Shows, not just tells** — annotated examples beat prose restatements of the schema. An author reading a meta-skill is already reading a tool's documentation; they came to get unblocked, not to read theory.
4. **Is honest about scope** — a setup skill does not explain advanced usage. A release checklist does not explain the schema. The body spine is mandatory precisely because it forces the author to commit to one role and one scope.
5. **Avoids circular explanation** — a skill about Motto should not spend paragraphs explaining what a Claude Code Agent Skill is. The reader installed the plugin; they know what skills are. Start at the Motto-specific details.

---

## Sources

- `/Users/jeremie/Projects/motto/src/schema.js` — canonical validation rules for all frontmatter fields and body spine
- `/Users/jeremie/Projects/motto/src/frontmatter.js` — exact stray-delimiter and YAML parse behavior; error messages
- `/Users/jeremie/Projects/motto/src/config.js` — motto.yaml required fields and plugin name rules
- `/Users/jeremie/Projects/motto/src/build.js` — private bucket precondition, shared ref bundling, collision detection
- `/Users/jeremie/Projects/motto/.planning/PROJECT.md` — milestone scope, out-of-scope decisions
- `/Users/jeremie/Projects/motto/.planning/milestones/v0.0.1-REQUIREMENTS.md` — full requirement set; all 22 shipped
- `/Users/jeremie/Projects/motto/.claude/CLAUDE.md` — frontmatter spec table, name/description constraints

---

*Feature research for: Motto v0.0.2 self-hosting — what skills to author*
*Researched: 2026-06-30*
