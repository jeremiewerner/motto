# Motto

**Framework for authoring, validating, and packaging Claude Code Agent Skills**

Motto is a framework for authoring, validating, and packaging [Claude Code Agent Skills](https://code.claude.com/docs/en/plugins-reference). You write skills as structured `SKILL.md` files in a source tree, Motto's strict linter enforces a schema before anything ships, and `motto build` packages them into a self-contained, distributable plugin. The built output is plain, standard Agent Skills — any agent loads them with no knowledge of Motto.

The core value is the **strict schema + linter**: skills either conform or they don't, and you know before they ship.

---

## Contents

1. [Install the CLI](#install-the-cli)
2. [Scaffold a project](#scaffold-a-project)
3. [Author a skill](#author-a-skill)
4. [Validate and build](#validate-and-build)
5. [Publish to npm](#publish-to-npm)
6. [End-to-end example](#end-to-end-example)
7. [Add the marketplace to Claude Code](#add-the-marketplace-to-claude-code)
8. [Install Motto's skills](#install-mottos-skills)
9. [Claude Desktop usage](#claude-desktop-usage)
10. [Development and contributing](#development-and-contributing)

---

## Install the CLI

```sh
npm i -g @jeremiewerner/motto
```

Once installed, the CLI is available as `motto`:

```sh
motto lint   # validate all skills and the project config
motto build  # lint, then wipe and rebuild dist/
```

---

## Scaffold a project

Use the `/motto:setup-project` skill in Claude Code for a guided walkthrough of the directory layout, `motto.yaml` fields, and first build. The standard source tree looks like this:

```
my-project/
  skills/
    my-skill/
      SKILL.md          ← one skill per folder
      references/       ← optional skill-local references
  shared/
    references/         ← shared references bundled into multiple skills at build time
  motto.yaml            ← project configuration
  dist/                 ← generated output; never edit manually
```

Create `motto.yaml` at the project root:

```yaml
name: motto
version: "0.0.3"
description: Motto is a framework for authoring, validating, and packaging Claude Code Agent Skills into self-contained, distributable plugins.
plugins:
  public: motto
  private: motto-private  # only needed when private-audience skills exist
```

| Field | Required | Rule |
|-------|----------|------|
| `name` | Yes | Truthy string; project identifier |
| `version` | Yes | Truthy string; recommend quoting to preserve as YAML string |
| `description` | Yes | Truthy string; feeds into each built `plugin.json` |
| `plugins.public` | Yes | Letter-start kebab-case; must not contain `anthropic` or `claude` |
| `plugins.private` | When private skills exist | Same kebab-case rule |

---

## Author a skill

Use the `/motto:author-skill` skill in Claude Code for a step-by-step guide to writing a conforming `SKILL.md`.

Every `SKILL.md` requires three frontmatter fields and a two-line body spine:

```markdown
---
name: my-skill          # letter-start kebab-case; must match the folder name
description: What this skill does and when an agent should trigger it.
audience: public        # public → dist/public/; private → dist/private/
---

# My Skill

**Role:** You are a guide who walks the author through X step by step.
```

- `name` — letter-start kebab-case; must equal the folder name exactly.
- `description` — non-empty, under 1024 characters, no XML tags; tells the agent what to do and when.
- `audience` — `public` or `private`; routes the skill to the correct plugin bucket.
- Body spine: first non-blank line is an H1 title; body contains at least one `**Role:**` line.

Run `motto lint` at any time to see all errors in one pass.

---

## Validate and build

```sh
motto lint
```

Reports every schema violation across all skills and the project config in a single run. Clean output:

```
✓ 3 skills OK
```

```sh
motto build
```

Runs `motto lint` first. If lint fails, nothing is written to `dist/`. On success, `dist/` is wiped and rebuilt:

```
dist/
  public/
    .claude-plugin/
      plugin.json       ← { "name": "motto", "version": "...", "description": "..." }
    author-skill/
      SKILL.md
      references/
        skill-schema.md
  private/
    .claude-plugin/
      plugin.json
    secret-skill/
      SKILL.md
```

---

## Publish to npm

The `release` skill (`/motto:release`) carries the full maintainer checklist. The short version:

```sh
npm version X.Y.Z -m "chore: release v%s"   # bumps package.json + motto.yaml, creates tag
node bin/motto.js lint && node bin/motto.js build   # dogfood check
npm publish          # fires prepublishOnly (rebuilds dist/public/) then uploads
git push --follow-tags
```

> **Note:** `npm version` creates the git tag automatically from v0.0.4 onward. See the `release` skill for the full tarball-verify step and post-release housekeeping.

---

## End-to-end example

A complete flow from scaffold to install, showing shell commands and Claude Code slash commands side by side:

```sh
# 1 — Install the CLI
npm i -g @jeremiewerner/motto
```

```
# 2 — Scaffold a new project (Claude Code slash command)
/motto:setup-project
```

```sh
# 3 — Author your first skill (Claude Code slash command)
/motto:author-skill
```

```sh
# 4 — Validate all skills
motto lint
```

```sh
# 5 — Build the plugin
motto build
# → dist/public/ and dist/private/ are populated
```

```
# 6 — Add Motto's marketplace to Claude Code (Claude Code slash command)
/plugin marketplace add jeremiewerner/motto
```

```
# 7 — Install Motto's public skills into Claude Code (Claude Code slash command)
/plugin install motto@motto
# → /motto:author-skill and /motto:setup-project are now available
```

---

## Add the marketplace to Claude Code

> **Prerequisite:** the `jeremiewerner/motto` repository must be public for the GitHub-form add to resolve.

```
/plugin marketplace add jeremiewerner/motto
```

This registers Motto's self-hosted marketplace in Claude Code. The marketplace entry points to `@jeremiewerner/motto` on npm and exposes the public skills from `dist/public/`.

---

## Install Motto's skills

```
/plugin install motto@motto
```

This installs Motto's public skills into Claude Code, making the following slash commands available:

| Skill | Slash command | What it does |
|-------|--------------|-------------|
| `author-skill` | `/motto:author-skill` | Step-by-step guide for writing a conforming `SKILL.md` |
| `setup-project` | `/motto:setup-project` | Guided directory layout, `motto.yaml` walkthrough, and first build |

---

## Claude Desktop usage

**Claude Desktop's Code tab is Claude Code** — the marketplace path above (`/plugin install motto@motto`) already covers it.

The symlink and zip one-liners below are for **Claude Desktop Chat** and other tools that accept a skill folder or a zip upload.

**Symlink a built skill into the personal skills directory:**

```sh
ln -s "$(pwd)/dist/public/author-skill" ~/.claude/skills/author-skill
```

The absolute source path (`$(pwd)/dist/public/author-skill`) is required so the symlink resolves correctly from `~/.claude/skills/`.

**Package a built skill as a zip for web upload:**

```sh
cd dist/public && zip -r author-skill.zip author-skill/
```

Both commands operate on the built output under `dist/public/` (produced by `motto build`). Substitute `author-skill` with any other skill name from `dist/public/` as needed.

---

## Development and contributing

Node >= 20 is required.

```sh
npm install          # install the single runtime dependency (yaml)
node --test          # run the full test suite
node bin/motto.js lint   # dogfood lint against the source skill tree
node bin/motto.js build  # dogfood build
```

A full `CONTRIBUTING.md` (PR process, branching, CI) is planned for a future release. For now: run `node --test` and `motto lint` before submitting changes.

---

MIT License © Jérémie Werner
