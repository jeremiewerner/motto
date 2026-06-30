---
name: author-skill
description: Teaches how to write a conforming SKILL.md for the Motto framework. Use this skill when authoring a new Motto skill or investigating a lint error.
audience: public
shared_references:
  - skill-schema
---

# Authoring a Motto Skill

**Role:** You are a hands-on guide for writing Motto SKILL.md files. Walk the author through each required frontmatter field, the body spine contract, and shared references step by step, citing the exact lint error messages they will see if something is wrong.

A Motto skill is a `SKILL.md` file that Motto validates and packages into a Claude Code Agent Skill plugin. You write the source; Motto handles distribution.

## Required Frontmatter Fields

Every SKILL.md must open with a frontmatter block — a `---`-delimited YAML section — containing three required fields.

### `name`

The skill's identifier. Must be a **letter-start kebab-case** string matching `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` and must equal the skill's folder name exactly. See the bundled `skill-schema` reference for the full regex, reserved-word list, and all four lint error messages in the name validation cascade.

```yaml
name: my-skill
```

### `description`

A short, non-empty string stating what the skill does and when an agent should trigger it. Keep it under 1024 characters and avoid XML-like tags (`<`, `>`).

```yaml
description: Explains how to configure my-skill. Use this skill when setting up a new my-skill configuration.
```

**Lint error if missing:** `description is required`

### `audience`

Must be exactly `public` or `private`.

- `public` — skill is shipped in the public plugin bucket (`dist/public/`)
- `private` — skill is shipped in the private plugin bucket (`dist/private/`) only

```yaml
audience: public
```

**Lint error if wrong:** `audience must be public|private`

## The Body Spine

After the closing `---` delimiter, the skill body must satisfy two independent checks. If both fail, both errors are reported in a single lint run.

**H1 title:** The first non-blank line must be an H1 heading — `# Title` with at least one non-space character after `# `.

**Role line:** The body must contain at least one line beginning with `**Role:`. Write a complete, behavioral sentence — "You are a..." — not just a label. An empty `**Role:**` passes the validator but produces unusable agent instruction content.

```markdown
# My Skill Title

**Role:** You are a guide who walks the author through every step of X.
```

## Optional Frontmatter

### `shared_references`

A YAML array of bare basenames — no `.md` extension, no path separators. Each entry must correspond to an existing `shared/references/<entry>.md` file.

```yaml
shared_references:
  - skill-schema
  - another-reference
```

`motto build` copies each referenced file into the skill's `references/` directory in the output, making the skill self-contained when distributed. If a skill already has a local `references/<entry>.md`, build will report a collision and stop.

**Lint error if file is missing:** `shared_references entry "X" not found in shared/references/`

### `template` and `dependencies`

Accepted and passed through verbatim; not validated in v0.0.2.

## Annotated Minimal Example

The following is a minimal, correct SKILL.md showing every required field and the mandatory body spine:

```yaml
---
name: my-skill
description: Shows how to configure my-skill. Use this skill when setting up my-skill for the first time.
audience: public
---

# My Skill

**Role:** You are a guide who walks the author through configuring my-skill step by step.

Main body content goes here.
```

The folder containing this file must be named `my-skill` to match the `name` field.

## Common Lint Errors

| Error message | Cause | Fix |
|---------------|-------|-----|
| `name is required` | `name` field is missing | Add `name: your-skill-name` |
| `name must be letter-start kebab-case (...)` | Uppercase, underscores, leading digit, or double hyphen | Use lowercase letters, hyphens only, starting with a letter |
| `name must not contain the reserved substrings "anthropic" or "claude": "X"` | Skill name contains a reserved substring | Rename the skill folder and `name` field |
| `name "X" must equal its folder name "Y"` | `name` field does not match the folder name | Rename the folder or fix the `name` field |
| `description is required` | `description` field is missing or empty | Add a non-empty `description` |
| `audience must be public\|private` | `audience` is missing or has an unexpected value | Set `audience: public` or `audience: private` |
| `body must begin with an H1 title line (# Title) as its first non-blank line` | Body does not start with `# Title` | Make the first non-blank line after `---` an H1 |
| `body must contain a **Role:** line` | No line starting with `**Role:` in the body | Add `**Role:** You are...` to the body |
| `shared_references entry "X" is an unsafe basename (must not contain "/" or ".")` | Entry contains a path separator or extension | Use a bare basename like `skill-schema`, not `./skill-schema.md` |
| `shared_references entry "X" not found in shared/references/` | Declared shared ref file does not exist | Create `shared/references/X.md` or fix the basename |
