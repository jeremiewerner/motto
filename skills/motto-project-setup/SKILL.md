---
name: motto-project-setup
description: Walks through initializing a Motto project — directory layout, motto.yaml configuration, and running lint and build. Use this skill when starting a new Motto project.
audience: public
shared_references:
  - skill-schema
---

# Setting Up a Motto Project

**Role:** You are a Motto project setup guide. Walk the author through the source directory layout, every motto.yaml field, the lint and build commands, and what the dist/ output contains.

## Directory Layout

A Motto project uses a fixed directory structure:

```
my-project/
  skills/
    my-skill/
      SKILL.md              ← one skill per folder
      references/           ← optional local references (skill-specific)
    another-skill/
      SKILL.md
  shared/
    references/             ← shared references bundled into multiple skills at build time
      skill-schema.md
  motto.yaml                ← project configuration
  dist/                     ← generated output; never edit manually
```

Rules:
- Each skill lives in its own folder under `skills/`. The folder name must match the `name` field in the skill's `SKILL.md`.
- `shared/references/` holds Markdown reference files that can be declared by multiple skills and bundled by `motto build`.
- `dist/` is created (and wiped) by `motto build`. Do not commit it.

## `motto.yaml` Fields

The root `motto.yaml` configures the project and both plugin buckets.

```yaml
name: my-project
version: "0.1.0"
description: A short description of what this project's skills do.
plugins:
  public: my-project-skills
  private: my-project-private   # only required when private-audience skills exist
```

| Field | Required | Rule | Example |
|-------|----------|------|---------|
| `name` | Yes | Truthy string; used as project identifier | `motto` |
| `version` | Yes | Truthy string; recommend semver; quote it to ensure a YAML string | `"0.1.0"` |
| `description` | Yes | Truthy string; feeds into each built plugin.json | `"A framework for..."` |
| `plugins.public` | Yes | Letter-start kebab-case (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`); cannot contain `anthropic` or `claude` | `my-project-skills` |
| `plugins.private` | Only when private skills exist | Same kebab-case rule as `plugins.public` | `my-project-private` |

See the `skill-schema` reference for the full kebab regex and name constraint rules.

## Running Lint

```
node bin/motto.js lint
```

or, once installed globally:

```
motto lint
```

**Clean output:**

```
✓ 3 skills OK
```

**Error output (example):**

```
✗ my-skill: name must be letter-start kebab-case ...
✗ my-skill: body must contain a **Role:** line
✗ (project): missing plugins.public

3 errors
```

Lint validates the config (`motto.yaml`), loads shared references, then validates every skill in `skills/`. All errors from all skills are reported in a single run.

## Running Build

```
node bin/motto.js build
```

or:

```
motto build
```

Build runs lint first. If lint fails, no files are written to `dist/`. On success, `dist/` is wiped and rebuilt.

### What `dist/` Contains

```
dist/
  public/
    .claude-plugin/
      plugin.json           ← { "name": "my-project-skills", "version": "...", "description": "..." }
    my-skill/
      SKILL.md              ← verbatim copy from skills/my-skill/SKILL.md
      references/
        skill-schema.md     ← copied from shared/references/ (if declared)
  private/
    .claude-plugin/
      plugin.json           ← { "name": "my-project-private", "version": "...", "description": "..." }
    secret-skill/
      SKILL.md
```

- `plugin.json` is generated from `motto.yaml` fields (`name`, `version`, `description`).
- Shared references declared in a skill's `shared_references` field are bundled into that skill's `references/` directory.
- Private skills appear only in `dist/private/`. The public plugin never contains private skill content.

## Installing the Built Plugin in Claude Code

After building, point Claude Code at the output directory for the bucket you want to install:

- **Public plugin:** install from `dist/public/`
- **Private plugin:** install from `dist/private/`

Use the `claude plugin add` command (or the Claude Code UI) with the path to the bucket directory. Each bucket contains a valid `.claude-plugin/plugin.json` manifest.
