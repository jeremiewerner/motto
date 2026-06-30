# Motto Skill Schema Reference

This file is the canonical rule source for the Motto skill schema (v0.0.2).
It is bundled verbatim by `motto build` into each public skill's `references/` directory.
All claims are derived from `src/schema.js`, `src/config.js`, `src/frontmatter.js`, and `src/lint.js`.

---

## 1. `name` Field

**Rule:** A skill's `name` must be a letter-start kebab-case identifier.

Pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`
- Starts with exactly one lowercase letter (not a digit, not a hyphen)
- Followed by zero or more lowercase letters or digits
- Then zero or more groups of (one hyphen + one or more lowercase letters/digits)

**Additional constraints:**
- Must equal the skill's folder name exactly. If the folder is `my-skill`, the `name` field must be `my-skill`.
- Max 64 characters (Claude Code platform limit; enforced by the Motto validator as a cascade step).
- Must not contain the substrings `anthropic` or `claude` (substring match, not word boundary).

**Name validation cascades — it stops at the first failure:**

| Step | Check | Lint error emitted |
|------|-------|--------------------|
| 1 | `name` is missing, empty, or falsy (also covers non-string falsy values) | `name is required` |
| 2 | `name` is a truthy non-string (boolean, number, array, object) | `name must be a string (got <typeof>)` |
| 3 | `name` fails the kebab regex | `name must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/): "X"` |
| 4 | `name` exceeds 64 characters | `name must not exceed 64 characters (got N): "X"` |
| 5 | `name` contains a reserved substring | `name must not contain the reserved substrings "anthropic" or "claude": "X"` |
| 6 | `name` does not match the folder | `name "X" must equal its folder name "Y"` |

Valid examples: `my-skill`, `abc`, `a1`, `abc-def-123`
Invalid examples: `0bad` (leading digit), `My_Skill` (uppercase/underscore), `my--skill` (double dash), `-bad` (leading dash)

---

## 2. `description` Field

**Rule:** Must be present and non-empty.

```
description: A concise description of what this skill does and when to use it.
```

**Authoring guidance:**
- State both what the skill does AND when an agent should trigger it.
- Max 1024 characters (enforced by the Motto validator).
- Must not contain XML-tag shapes (e.g. `<example>`, `</p>`, `<br/>`). Plain comparison/math
  text such as `a<b` is not flagged; only strings matching the tag-shape regex are rejected.

**Lint errors:**
- `description is required`
- `description must not exceed 1024 characters (got N)`
- `description must not contain XML tags (e.g. <example>)`

---

## 3. `audience` Field

**Rule:** Must be exactly the string `public` or `private`. Any other value (including missing) is an error.

```yaml
audience: public   # shipped in dist/public/ bucket
audience: private  # shipped in dist/private/ bucket only
```

**Lint error if wrong:** `audience must be public|private`

**Build behavior:**
- `public` skills are copied to `dist/public/<skill-name>/`
- `private` skills are copied to `dist/private/<skill-name>/`
- `plugins.private` must be set in `motto.yaml` before any private skill can be built

---

## 4. Body Spine — Two Independent Checks

The skill body (the Markdown after the closing `---` delimiter) must satisfy two checks. Both run independently — both errors are reported even if both fail at once.

**Check 1 — H1 title:** The first non-blank line of the body must match `^# \S` (an H1 heading with at least one non-space character after `# `).

```markdown
# My Skill Title
```

**Lint error if missing:** `body must begin with an H1 title line (# Title) as its first non-blank line`

**Check 2 — Role line:** The body must contain at least one line that starts with `**Role:` (multiline match).

```markdown
**Role:** You are a hands-on guide who walks the author through...
```

The Role line content after `:` is not validated. An empty `**Role:**` passes the regex but produces unusable agent instruction content. Write Role lines as complete, behavioral sentences.

**Lint error if missing:** `body must contain a **Role:** line`

---

## 5. `shared_references` Field

**Rule:** Optional. When present, must be a YAML array of strings. Each entry must be a safe basename.

```yaml
shared_references:
  - skill-schema
  - another-reference
```

**Per-entry rules:**
- Must NOT contain `/` or `.` — bare basenames only, no path separators or extensions
- Must correspond to an existing `shared/references/<entry>.md` file

**Per-entry lint errors:**
- `shared_references entry "X" is an unsafe basename (must not contain "/" or ".")`
- `shared_references entry "X" not found in shared/references/`

**Build behavior:** `motto build` copies `shared/references/<entry>.md` into each skill's `dist/<audience>/<skill-name>/references/` directory, making the skill self-contained.

**Collision guard:** If a skill already has a local `references/<entry>.md`, build will report a collision and stop.

---

## 6. `template` and `dependencies` Fields

These fields are accepted and passed through verbatim. They are NOT validated in Motto v0.0.2.

```yaml
template: some-template
dependencies:
  - another-skill
```

---

## 7. Frontmatter Envelope

Every SKILL.md must open with a bare `---` on line 1 and close with a matching bare `---`.

```
---
name: my-skill
description: What this skill does and when to use it.
audience: public
---

# My Skill Title

**Role:** You are...
```

**Rules:**
- The opening `---` must be the very first line (no blank lines, no BOM — BOM is stripped automatically).
- A matching closing `---` is required.
- YAML between the delimiters is parsed with the `yaml` v2 library (YAML 1.2 core schema) — `yes`/`no`/`on`/`off` are NOT treated as booleans.
- A stray `---` inside the body is flagged only if the content between it and the body start parses as a clean, non-empty YAML mapping. Wrapping example SKILL.md blocks in fenced code blocks avoids this edge case.

**Lint errors:**
- `missing frontmatter: file must begin with a '--- ... ---' block`
- `unterminated frontmatter: no closing '---' delimiter found`
- `stray '---' delimiter in frontmatter: the block must contain exactly one closing '---'`
