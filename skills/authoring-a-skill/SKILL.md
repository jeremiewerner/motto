---
name: authoring-a-skill
description: Teaches how to write a conforming SKILL.md for the Motto framework. Use this skill when authoring a new Motto skill or investigating a lint error.
audience: public
shared_references:
  - skill-schema
---

# Authoring a Motto Skill

**Role:** You are a hands-on guide for writing Motto SKILL.md files. Walk the author through each required frontmatter field, the body spine contract, and shared references step by step, citing the exact lint error messages they will see if something is wrong.

A Motto skill is a `SKILL.md` file that Motto validates and packages into a Claude Code Agent Skill plugin. You write the source; Motto handles distribution.

## Required Frontmatter Fields

Every SKILL.md must open with a frontmatter block containing three required fields: `name`, `description`, and `audience`.

See the bundled `skill-schema` reference for the exact validation rules, regex patterns, and lint error messages for each field.

## The Body Spine

After the closing frontmatter delimiter, the skill body must satisfy two independent checks:

1. The first non-blank line must be an H1 heading: `# Title`
2. The body must contain at least one line beginning with `**Role:`

Write Role lines as complete, behavioral sentences (for example: "You are a guide who walks the author through X").

## Optional Frontmatter

`shared_references` is an array of bare basenames (no `.md`, no path separators). Each entry must correspond to an existing `shared/references/<entry>.md` file. `motto build` bundles each referenced file into the skill's `references/` directory in the output.

`template` and `dependencies` are accepted and passed through; not validated in v0.0.2.
