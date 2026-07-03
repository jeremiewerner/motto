# Motto Skill Schema Reference

This file is the canonical rule source for the Motto skill schema.
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
- `description must be a string (got <typeof>)`
- `description must not exceed 1024 characters (got N)`
- `description must not contain XML tags (e.g. <example>)`

Array values are the one special case in this message: an Array `description` renders as the
literal word `"array"` rather than `typeof` (which would otherwise print `"object"`). Every
other non-string type (`number`, `boolean`, a non-array `object`) renders via plain `typeof`.

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

Both checks are individually skippable when the resolved `template` (see §6) declares a
`waives` set containing `"title"` and/or `"role"` respectively — the template cascade resolves
this before either check above runs. No shipped template uses `waives` today, so both checks
are unconditional in practice.

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

## 6. `template` Field

**Rule:** Optional. Absent `template` key skips all template checks entirely — no template means no
additional body-section requirements. An explicitly-present but falsy value (`template: ""`,
`template: null`) is NOT silently skipped: it is treated as an unknown template name and errors.

```yaml
template: procedure
```

**Template validation cascades — it stops at the first failure, except step 3 which checks every required section independently:**

| Step | Check | Lint error emitted |
|------|-------|--------------------|
| 1 | `template` key present, value is not a string | `template must be a string (got <typeof>)` |
| 2 | value is a string but not a key in the template registry (includes `""` — empty string is "unknown", never silently skipped) | `unknown template "X" (available: procedure)` |
| 3 (per missing required section) | template is known, but the body lacks a matched `<section>...</section>` pair | `template "X" requires <section>…</section> section — <description>` |

**Current registry** (`src/templates.js` — pure data; adding a template is a data-only edit, no linter code change needed):

```javascript
export const SECTIONS = {
  process: "Numbered steps the agent executes, in order.",
  success_criteria: "Checkable conditions that define done.",
};

export const TEMPLATES = {
  procedure: {
    requiredSections: ["process", "success_criteria"],
  },
};
```

Today the registry ships exactly one template, `procedure`, requiring `<process>` and
`<success_criteria>` sections — so `unknown template "X" (available: procedure)` is the only
possible "available" list.

**`hasClosedSection` semantics** (how a required section is detected as present):
- Section tags must be line-start anchored: `^<process>` / `^</process>` (multiline regex) — a tag mentioned mid-sentence never counts.
- Fenced code blocks are excluded from scanning entirely — both fence detection and any tag-like text inside an open fence are ignored. Fence detection matches CommonMark-style fences: 3+ backticks or 3+ tildes, up to 3 leading spaces; a fence only closes on a later line with the same character and length greater than or equal to the opener's.
- There is no end-of-line anchor on the open tag — `<process> some trailing text` still counts as opening the section; only the close tag is required to have nothing else of interest after it at line start.
- A section is "closed" only if both an open and a matching close tag exist, in that order (open index before close index) — not merely both present anywhere in the body.
- Bare tags only — no attributes (`<process foo="bar">` does not count).

---

## 7. `outputs` Field

**Rule:** Optional. Absent key skips validation entirely. An empty map `{}` is a valid no-op — a coherent "no outputs" declaration.

```yaml
outputs:
  report-template: templates/report.md
```

Validation is split across two layers — this distinction matters because the two layers run
at different times: Layer 1 always runs inside `validateSkill()`, while Layer 2 runs only
during `motto lint`/`lintProject` (which has filesystem access), never inside a bare
`validateSkill()` call.

**Layer 1 — `src/schema.js` (lexical, pure, no filesystem access):**

| Check | Lint error emitted |
|-------|--------------------|
| `outputs` present but not a map (`null`, non-object, or array) | `outputs must be a map of name -> file (got <typeof>)` (Array values render as the literal word `"array"`, matching the `description` field's special case in §2) |
| per-entry: value is not a non-empty string | `outputs.<key> must be a non-empty string path (got <typeof>)` |
| per-entry: value is not lexically path-safe (absolute, or normalizes to `..` or a path starting with a `..` segment) | `outputs.<key> path "X" is unsafe (must not be absolute or contain ".." traversal)` |

The lexical-safety check (`isOutputPathLexicallySafe`) is root-independent by construction — it
never calls `resolve()` and takes no base-directory argument, so its verdict cannot depend on
`process.cwd()`. `normalize()` also collapses interior traversal, so a path like `a/../../x`
(which normalizes to `../x`) is caught even though it doesn't literally start with `..` in its
original written form.

**Layer 2 — `src/lint.js`'s `checkOutputsFs` (filesystem-dependent, runs only inside `motto lint`/`lintProject`, never a bare `validateSkill()`):**

| Check | Lint error emitted |
|-------|--------------------|
| target does not exist | `outputs.<key> file "X" does not exist` |
| target exists but is not a regular file (e.g. a directory) | `outputs.<key> "X" is not a file` |
| target's real path escapes the skill directory via symlink | `outputs.<key> file "X" escapes the skill directory via symlink` |
| the target's real path could not be resolved (e.g. race condition, permission error) | `outputs.<key> file "X" could not be resolved: <message>` |

**`{var}` note:** the existence check is literal — there is no `{var}` special-casing anywhere
in this cascade. A path value containing `{var}` fails the existence check naturally, because no
file literally named that way exists. `{var}`-style placeholders are an authoring convention that
belongs inside a declared output file's own CONTENT, never inside the `outputs:` path string itself.

---

## 8. `dependencies` Field

**Rule:** Optional. Absent key skips validation entirely. An empty array `[]` is a valid no-op.

```yaml
dependencies:
  - another-skill
  - some-plugin:their-skill
```

**Per-entry validation cascade (each entry is checked independently):**

| Check | Lint error emitted |
|-------|--------------------|
| `dependencies` present but not an array | `dependencies must be an array (got <typeof>)` |
| per-entry: not a non-empty string | `dependencies entry must be a non-empty string (got <typeof>)` |
| namespaced entry (contains `:`) is malformed — not exactly two colon-separated parts, or either half fails the `name` kebab-case regex | `dependencies entry "X" is not valid "plugin:skill" format` |
| bare entry equals this skill's own folder name (self-dependency) | `dependencies entry "X" is a self-dependency` |
| bare entry is not found among the project's discovered skill names | `dependency "X" not found (available: ...)` |
| bare entry resolves to a skill, this skill's `audience` is `public`, and the target's `audience` is `private` | `dependencies entry "X" is private but this skill is public (audience-direction guard)` |

**Three ordering rules that must hold exactly:**
1. The self-dependency check runs BEFORE the not-found membership check. A skill's own folder name is always technically a member of the project's skill-name set, so checking membership first would silently misclassify a self-dependency as "resolved" and the self-dependency error would never fire.
2. Namespaced (`plugin:skill`) entries are format-checked ONLY — they are exempt from the self-dependency check, the not-found check, and the audience-direction guard. The target lives outside this project's tree, so its audience is unknowable from here.
3. The audience-direction guard fails in exactly one direction: `public` depending on `private` is the only failing combination. `private→private`, `private→public`, and `public→public` all pass silently.

Note the deliberate wording asymmetry between two of these messages, preserved verbatim from the
source: the self-dependency error reads `"dependencies entry ... is a self-dependency"` (plural
field name, includes the word "entry"), while the not-found error reads `` dependency "X" not
found `` (singular, no "entry" word). This is real, intentional source behavior — not a typo.

---

## 9. `allowed-tools` Field

**Rule:** Optional. Absent key skips validation entirely. Accepts BOTH a string and an array. An
empty array `[]` passes (a coherent "zero tools" declaration); an empty or whitespace-only string
errors.

```yaml
allowed-tools:
  - "Bash(git add *)"
  - "Bash(npm install)"
```

This field is format-only (no shape regex, no tokenizing, no parenthesized-pattern parsing) — a
value like `"Bash(git add *)"` passes trivially as one non-empty permission rule. The linter never
inspects or validates the internal shape of a tool-permission rule.

**Lint errors:**
- `allowed-tools must be a non-empty string or array (got an empty string)`
- `allowed-tools[<i>] must be a non-empty string (got <typeof>)`
- `allowed-tools must be a string or array (got <typeof>)`

---

## 10. Frontmatter Envelope

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
