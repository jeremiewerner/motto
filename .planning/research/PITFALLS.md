# Pitfalls Research

**Domain:** CLI linter + static packager for structured Markdown/YAML skill files
**Researched:** 2026-06-30
**Confidence:** MEDIUM (core pitfalls confirmed by multiple real-world issues in analogous tools; some Motto-specific analysis is design-time reasoning)

---

## Critical Pitfalls

### Pitfall 1: CRLF Line Endings Break the Frontmatter Extraction Regex

**What goes wrong:**
The plan's frontmatter regex `/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/` uses literal `\n`. Node.js `readFileSync(file, 'utf8')` preserves `\r` bytes on every platform — it does not normalize line endings. A SKILL.md authored on Windows and committed without `.gitattributes` enforcement will contain `\r\n` throughout. The regex fails to match `---\r\n`, returning `null`, and `parseFrontmatter` throws "missing frontmatter block" for a perfectly valid file.

**Why it happens:**
Developers on macOS/Linux write and test the regex against `\n`-only strings. They assume the OS or Node will normalize. Node does not. The bug only surfaces when a Windows author or a repository with no `eol` config is involved.

**How to avoid:**
Strip carriage returns immediately after reading, before any regex or YAML parsing:
```js
const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
```
Add this normalization at the top of `parseFrontmatter`. Add a dedicated CRLF test case to `test/frontmatter.test.js`.

**Warning signs:**
- `parseFrontmatter` throws on files that display correctly in editors
- Tests pass on macOS CI but fail when a Windows contributor sends a PR
- `git log --show-notes` shows `CRLF` in file attributes

**Phase to address:** Task 1 — frontmatter parser. Add CRLF test case alongside the existing three tests.

---

### Pitfall 2: UTF-8 BOM Breaks the Frontmatter Regex at File Start

**What goes wrong:**
Windows editors (Notepad, some VS Code configurations) save UTF-8 files with a three-byte BOM (`﻿`) prepended. The BOM sits before `---`, so `^---` never matches. `parseFrontmatter` throws "missing frontmatter block." This is confirmed by Codex issue #13918 and similar reports across multiple agent-skill loaders.

**Why it happens:**
BOM is invisible in most editors and in terminal `cat` output. The author sees a correct `---` header but the parser sees `﻿---`.

**How to avoid:**
Strip BOM after reading, before parsing:
```js
const text = readFileSync(file, 'utf8').replace(/^﻿/, '')
```
Combine with the CRLF strip from Pitfall 1 into a single `normalizeText(raw)` helper. Add a BOM test case to `test/frontmatter.test.js`.

**Warning signs:**
- Skill file appears valid in editor, `motto lint` reports "missing frontmatter"
- `hexdump -C skill.md | head -1` shows `ef bb bf` as first three bytes
- Error disappears when the file is re-saved with "UTF-8 without BOM"

**Phase to address:** Task 1 — frontmatter parser. One extra test: `parseFrontmatter('﻿---\nname: x\n---\nbody')` must not throw.

---

### Pitfall 3: `---` Inside a Multiline YAML Value Poisons the Closing-Fence Detection

**What goes wrong:**
The non-greedy regex `\n---\n?` terminates at the FIRST occurrence of `\n---` in the file. If a YAML value (most commonly `description`) contains a literal `---` on its own line — inside a literal block scalar (`|`) or simply as part of a multi-paragraph description — the regex extracts the wrong frontmatter slice and silently produces a nonsensical `data` object with an incorrect `body`.

Example that breaks the plan's regex:
```
---
description: |
  Best practices guide.
  ---
  See references.
name: my-skill
audience: public
---
# My Skill
```
The regex captures `description: |\n  Best practices guide.` as frontmatter and `  See references.\nname: my-skill\n...` as body. No error is thrown; the skill silently fails lint for unrelated reasons.

**Why it happens:**
Frontmatter delimiters and YAML block scalars are context-sensitive; a single regex cannot know when `---` is content vs. delimiter. This is well-documented in the `markdownlint` issue tracker (issue #153).

**How to avoid:**
Option A (simplest): Prohibit `---` in frontmatter values by scanning the extracted YAML string before parsing, and emit a clear lint error if found. Document this in the skill-authoring guide.
Option B: Walk the raw text line-by-line to find the closing `---` only at column 0 with no leading content on that line, ignoring lines that have indentation (block scalar context).
Option C: Require all multiline descriptions to use `>` (folded scalar) which does not produce bare `---` lines.

Recommend Option A for v1: detect it and error loudly rather than silently misparse.

**Warning signs:**
- `description` field contains a pipe (`|`) or a horizontal rule in the content
- Lint reports "missing name" or "audience must be public|private" for a skill whose frontmatter looks correct in the editor
- The parsed `data.name` is `undefined` even though `name:` is present in the file

**Phase to address:** Task 1 — frontmatter parser; or Task 3 — schema validator (add a check that the raw frontmatter string does not contain `\n---` after the first line).

---

### Pitfall 4: Unquoted Colon-Space in Frontmatter Values Silently Invalidates the YAML

**What goes wrong:**
YAML treats `: ` (colon followed by space) as a key-value separator. A description like `use when: the user asks for help` is parsed as `description` mapping to the nested mapping `{ when: 'the user asks for help' }` rather than a string. The `yaml` library may throw `"mapping values are not allowed here"` or silently produce a structured object instead of a string. `validateSkill` then fails with "missing description" — true in a sense, but the error message gives no hint that the YAML itself is malformed.

This is confirmed as a real pattern: `autoresearch` issue #69 shows four SKILL.md files across multiple agent tools failing exactly this way.

**Why it happens:**
Skill descriptions naturally contain colons: "Use when: user asks for X", "NOT for: batch processing", "Iterations: 3". Authors write prose, not YAML-aware prose.

**How to avoid:**
Two defences:

1. In `parseFrontmatter`, wrap `YAML.parse(match[1])` in a try/catch and re-throw with the YAML error message included: `throw new Error('frontmatter YAML parse error: ' + e.message)`. This makes the root cause visible.
2. In the authoring guide and/or `motto lint` output, add a hint: "if description contains `: `, quote the entire value".

Do NOT silently drop the skill. Always surface parse errors as `lint` failures.

**Warning signs:**
- Lint reports "missing description" for a file that visibly has `description:` in it
- The YAML library throws `"unexpected token"` or `"mapping values are not allowed here"` during build
- Description contains `:`  followed by a space anywhere in its text

**Phase to address:** Task 1 — `parseFrontmatter` error handling; Task 3 — clear error messages from `validateSkill`.

---

### Pitfall 5: H1 Title Check Fails on Body Lines with Trailing `\r` (CRLF)

**What goes wrong:**
If Pitfall 1 (CRLF normalization) is addressed in `parseFrontmatter` but the body is passed to `validateSkill` still containing `\r\n`, then `body.split('\n')` produces lines ending in `\r`. The `firstLine` becomes `# My Skill\r`. The regex `/^#\s+\S/.test('# My Skill\r')` still passes (because `\S` matches `M` before `\r`). So H1 detection survives CRLF. However, the ROLE regex `/^\*\*Role:\*\*\s+\S/m` also survives because multiline `^` matches after `\r\n` per ECMAScript spec.

The actual risk: if normalization is done in `parseFrontmatter` (as recommended), the body is already clean. The pitfall arises if normalization is NOT done there, and body validation is added to `schema.js` later by a different contributor who doesn't know about the upstream gap.

**Why it happens:**
The line-ending contract between modules is implicit. `schema.js` assumes clean `\n`-only body but this is not documented or asserted.

**How to avoid:**
Make the contract explicit: document in `src/frontmatter.js` that the returned `body` is always LF-normalized. Add an assertion or comment. This prevents a future contributor from calling `validateSkill` with a raw, un-normalized string.

**Warning signs:**
- H1 check unexpectedly fails only on Windows-authored skill files
- `firstLine` in a debugger shows a trailing `\r` character

**Phase to address:** Task 1 (normalization contract); Task 3 (comment in validateSkill documenting the expected input contract).

---

### Pitfall 6: Regex-Based Title Check Too Loose — Matches `#` in Code Blocks or Comments

**What goes wrong:**
The current plan checks the body's first non-blank line with `/^#\s+\S/`. This is correct for the happy path. However, if the first non-blank line in the body is a code block delimiter (` ```bash` — wait, that doesn't start with `#`) or an HTML comment (`<!-- #tag -->`), the regex won't falsely match. The real risk is the opposite: the check is too strict if a legitimate Title includes Unicode, emoji, or begins with a special char counted as whitespace.

More dangerous: the `ROLE` check `/^\*\*Role:\*\*\s+\S/m` would false-positive match a line inside a fenced code block that happens to contain `**Role:**`. A skill could pass lint with the Role line buried in a code example, not in the actual prose.

**Why it happens:**
Regex-based Markdown structure checks have no concept of parsing context. The regex doesn't know whether it's inside a code block, a blockquote, or prose.

**How to avoid:**
For v1 with simple skill files this is acceptable. Document the known limitation. If a future skill type needs nested code examples, consider stripping fenced code blocks from the body before running structural checks — but do not add this complexity until a real skill triggers the false positive.

Do not make the regex stricter (requiring `## ` or specific casing) as that would create false negatives for legitimate titles.

**Warning signs:**
- A skill passes lint but has no prose Role statement — the `**Role:**` is inside a `\`\`\`` block
- This is unlikely in real skills but is a known regex limitation

**Phase to address:** Task 3 — schema validator. Add a comment noting the code-block limitation; not a bug for v1 scope.

---

### Pitfall 7: `plugin.json` `name` Field — Claude Code Requires Letter Start, Motto Accepts Digit Start

**What goes wrong:**
Motto's kebab-case regex is `/^[a-z0-9]+(-[a-z0-9]+)*$/`, which accepts names starting with a digit (e.g., `2fa-skills`). Claude Code's plugin name regex is `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`, which requires a lowercase letter as the first character. Motto will accept `plugins.public: 2fa` in `motto.yaml`, build a `plugin.json` with `"name": "2fa"`, and the plugin will fail to load in Claude Code.

**Why it happens:**
The two validators are defined independently; Claude Code's exact validation rule wasn't checked against Motto's regex during design.

**How to avoid:**
Use the stricter regex for `plugins.public` and `plugins.private` validation in `loadConfig`:
```js
const PLUGIN_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
```
This is also the correct regex for skill `name` validation (skill names follow the same convention).

Note: it's fine to use the current plan's regex for skill `name` if you want to allow numeric-start skills, since skill names are not the plugin namespace — but align them to avoid confusion.

**Warning signs:**
- Plugin builds successfully with `motto build` but fails to appear in Claude Code's plugin list
- `motto lint` passes for a skill named `2fa-login`
- No error at build time; error only surfaces at install time

**Phase to address:** Task 2 (config loader) — validate `plugins.public` and `plugins.private` with the stricter regex. Document in `motto.yaml` comments.

---

### Pitfall 8: `plugin.json` Component Placement — Skills at Plugin Root, Not Inside `.claude-plugin/`

**What goes wrong:**
Motto emits `dist/public/.claude-plugin/plugin.json` and `dist/public/<skill-name>/SKILL.md`. This structure is correct: the `.claude-plugin/` folder holds only the manifest, while skills sit as sibling directories at the plugin root. The pitfall is a future contributor "cleaning up" the dist structure by moving skills inside `.claude-plugin/` to co-locate them with the manifest. Claude Code will then load the plugin (finds `plugin.json`) but no skills will be discovered because it does not look inside `.claude-plugin/` for SKILL.md files.

This is confirmed by the official plugin reference: "a common mistake lives: the plugin loads, but nothing works, because the components are nested inside `.claude-plugin/`."

**Why it happens:**
The directory structure is non-obvious. The manifest is in `.claude-plugin/` but content is NOT. New contributors assume co-location.

**How to avoid:**
Add a `README` or comment in the generated `dist/public/` directory explaining the structure. In Task 6 build tests, assert that `SKILL.md` is at `dist/public/<name>/SKILL.md` (not inside `.claude-plugin/`). This test acts as a regression guard.

**Warning signs:**
- Plugin appears in Claude Code's installed plugins list but `/pluginname:*` skills are not available
- No error from Claude Code — skills are simply absent

**Phase to address:** Task 6 — build. The current plan's structure is correct; the guard is a test assertion and documentation note.

---

### Pitfall 9: Symlinks in Skill Source Tree Copy Sensitive Content Into `dist/`

**What goes wrong:**
`cpSync(skill.dir, dest, { recursive: true })` with the default `verbatimSymlinks: false` follows symlinks. If a skill's `references/` directory contains a symlink to a file outside the project (intentional or from a compromised dependency), the symlink target's content is written into `dist/`. For a local tool operating on trusted input this is low severity, but it creates surprising behavior: the dist artifact contains content not visible in the source tree.

Separately, `cpSync` with `verbatimSymlinks: false` resolves relative symlinks into absolute paths at the source location. If the built artifact is later archived and extracted on another machine, the absolute symlink points to a path on the build machine that does not exist on the target machine — breaking the dist.

**Why it happens:**
`cpSync` defaults are designed for local copy, not for producing distributable artifacts. The distinction between "follow to embed content" vs "preserve as pointer" is not obvious.

**How to avoid:**
Use `{ verbatimSymlinks: true }` to preserve symlinks as-is. Document that symlinks to files outside the project are the author's responsibility. For a public distribution use case, add a lint check that no `shared/references/*.md` or `skills/*/references/*.md` entries are symlinks pointing outside the project root.

**Warning signs:**
- `dist/` contains a file that is not in `skills/` or `shared/` source trees
- A symlink in `references/` resolves to an absolute path outside the project
- CI diff of dist shows unexpected files

**Phase to address:** Task 6 — build. Add `verbatimSymlinks: true` to the `cpSync` call. Add a note in comments.

---

### Pitfall 10: `readdirSync` Order Is Non-Deterministic Across Platforms

**What goes wrong:**
`readdirSync(skillsDir)` returns directory entries in filesystem order, which differs by OS. On macOS (HFS+/APFS) the order is creation-time order. On Linux (ext4) it is hash-table order. On Windows it is not sorted. This means lint error output order varies across developers' machines and CI environments, making error lists non-reproducible.

For Motto v1 the functional impact is zero (each skill is validated independently). The experience impact: two developers running `motto lint` on the same project get errors in different order, complicating comparisons and diffing CI logs.

**Why it happens:**
`readdirSync` does not guarantee order; the Node.js docs do not specify sorting behavior.

**How to avoid:**
Sort the discovered skills by `dirName` immediately after scanning:
```js
skills.sort((a, b) => a.dirName.localeCompare(b.dirName))
```
Add this one line to `discoverSkills` in `src/discover.js`. The lint output becomes deterministic.

**Warning signs:**
- Lint error order differs between local run and CI
- Two developers report different error line ordering for the same project

**Phase to address:** Task 4 — skill discovery. One line fix, one test assertion on discovered order.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| YAML parse errors re-thrown without original error message | Simpler code in parseFrontmatter | Users see "missing frontmatter block" when the real issue is a colon in description; debugging is hard | Never — always chain the original error message |
| No BOM/CRLF normalization at read time | Slightly simpler parseFrontmatter | Mysterious failures for Windows authors; complaints with no reproduction path | Never in v1 — cost of fixing is two lines |
| Regex for frontmatter without CRLF handling | Works on author's Mac | Silent breakage for CRLF files | Never |
| Validating `plugins.public` kebab-case only loosely | Less code in config.js | Plugin loads in Motto but fails silently in Claude Code due to name format | Never — use the stricter regex from day one |
| Skipping sort in `discoverSkills` | No extra code | Non-deterministic lint output order across platforms | Acceptable until it causes a reported annoyance |
| Not checking for `---` inside multiline YAML values | Simpler parser | Silent wrong-parse produces confusing lint errors from wrong data | Acceptable in v1 if multiline descriptions are discouraged; document clearly |
| Building template validation before a concrete template exists | Feels thorough | Dead code, wrong abstractions, wasted effort when the first real template contradicts assumptions | Never — YAGNI; wait for the concrete skill |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code plugin loading | Placing skill SKILL.md files inside `.claude-plugin/` alongside `plugin.json` | Skills must be at plugin root as sibling directories to `.claude-plugin/`, not inside it |
| Claude Code plugin loading | Omitting `name` from `plugin.json` (thinking version/description are required) | Only `name` is required; all other fields are optional |
| Claude Code plugin caching | Updating skill content without bumping `version` in `motto.yaml` | Always bump `version` on any distributed update; cached plugins only refresh on version change |
| Claude Code plugin loading | Using `plugins.public: my plugin` (space) or `plugins.public: My_Plugin` (underscore/caps) in motto.yaml | Plugin name must match `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` — kebab-case, letter start |
| `yaml` npm library | Not catching YAML parse errors from `YAML.parse()` | Wrap in try/catch; re-throw with both the field context and the original YAML error message |
| Node.js `fs.cpSync` | Using default options when copying skill source trees for distribution | Add `{ verbatimSymlinks: true }` to preserve symlinks rather than resolving to absolute paths |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading all SKILL.md files synchronously in `discoverSkills` | Slow `motto lint` on large skill trees | Acceptable for v1; parallelize with `Promise.all` + `readFile` only if a project exceeds ~50 skills | At ~50+ skill files on spinning disk; not relevant for typical Motto projects |
| Re-discovering skills in both `lint()` and `build()` (two separate calls to `discoverSkills`) | Double disk read on `motto build` | The current plan calls `lint(projectDir)` then `discoverSkills(projectDir)` in `build()` — two full scans. Cache the result of `lint` to include the discovered skills so `build` reuses them | Not a real problem at v1 scale; note it for future optimization |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Following symlinks in `cpSync` without verification | Symlink in skill tree copies content outside project into dist artifact | Use `verbatimSymlinks: true`; add lint warning if references contain absolute symlinks |
| No validation that `shared_references` entries contain only safe basenames | A `shared_references` entry like `../../../etc/passwd` would cause the build to attempt copying `/etc/passwd` into dist | Validate that each entry in `shared_references` matches `/^[a-z0-9][a-z0-9-]*$/` (no path separators, no dots) in `validateSkill` |
| Writing `dist/` without confirming `outDir` is inside the project | If `outDir` is passed as an absolute path pointing outside project root, `rmSync(outDir, recursive)` destroys an arbitrary directory | In the CLI, default `outDir` to `process.cwd() + '/dist'`; in the API, document that callers are responsible |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent skill drop when YAML parse fails | Author runs `motto lint`, sees "0 skills OK" instead of an error — doesn't know why their skill disappeared | `discoverSkills` must catch per-file parse errors and return them as lint errors, never silently skip a file |
| "missing frontmatter block" error for a BOM or CRLF file | Author has valid frontmatter but gets a confusing error; debugging requires hex editor | Normalize BOM/CRLF at read time; if normalization is not done, at least detect and say "file may have CRLF or BOM" |
| Lint passes, build produces dist, but plugin doesn't load in Claude Code | Author thinks Motto succeeded; silent Claude Code failure | Cannot fully prevent (Claude Code error reporting is outside Motto's control), but document common post-build check: `cat dist/public/.claude-plugin/plugin.json` to verify name format |
| `motto lint` prints errors in non-deterministic order | CI log comparison fails; two developers report different error lists | Sort skills by name before validation; ensures reproducible output |

---

## "Looks Done But Isn't" Checklist

- [ ] **CRLF support:** `parseFrontmatter` normalizes `\r\n` to `\n` — verify with a test file saved with CRLF endings
- [ ] **BOM support:** `parseFrontmatter` strips `﻿` — verify with a test that prepends the BOM character
- [ ] **YAML error surfacing:** `parseFrontmatter` catch block re-throws with the original YAML error message, not just "missing frontmatter block"
- [ ] **Colon-in-description test:** a skill with `description: Use when: something` causes a clear lint error, not a "missing description" non-sequitur
- [ ] **Silent skill drop prevention:** `discoverSkills` never silently skips a malformed `SKILL.md` — it always produces a lint error entry
- [ ] **Plugin name strictness:** `loadConfig` validates `plugins.public` against `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`, not just non-empty
- [ ] **Shared reference name safety:** `shared_references` entries are validated to contain no path separators or dots
- [ ] **Dist structure is correct:** `SKILL.md` files are at `dist/public/<name>/SKILL.md`, NOT at `dist/public/.claude-plugin/<name>/SKILL.md`
- [ ] **Sort order:** `discoverSkills` returns skills sorted by `dirName` — lint output is deterministic across macOS/Linux/Windows

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CRLF regex failure deployed | LOW | Add `.replace(/\r\n/g, '\n')` to `normalizeText` in `frontmatter.js`; add test; release patch version |
| BOM regex failure deployed | LOW | Add `.replace(/^﻿/, '')` to `normalizeText`; release patch version |
| Silent skill drop due to YAML error | MEDIUM | Wrap `parseFrontmatter` call in `discoverSkills` in try/catch; push lint error into results instead of silently continuing |
| Plugin name fails Claude Code validation | LOW | User updates `motto.yaml` `plugins.public` to valid kebab-case with letter start; rebuild |
| Symlink copies unexpected content into dist | MEDIUM | Add `verbatimSymlinks: true` to `cpSync`; clean and rebuild dist; audit what was distributed |
| Template mechanism built prematurely (over-engineering) | HIGH | Delete half-implemented template code; the schema for the first real template will differ from the guess; rewrite from scratch once you have a concrete example |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CRLF breaking frontmatter regex | Task 1 (frontmatter parser) | Test: `parseFrontmatter('---\r\nname: x\r\n---\r\nbody')` returns `{ data: {name:'x'}, body:'body' }` |
| BOM breaking frontmatter regex | Task 1 (frontmatter parser) | Test: `parseFrontmatter('﻿---\nname: x\n---\nbody')` does not throw |
| `---` in multiline YAML value | Task 1 (frontmatter parser) or Task 3 (validator) | Test: skill with `description: |\n  text\n  ---\n  more` produces clear error, not wrong-parse |
| Unquoted colon-space in description | Task 1 (parseFrontmatter catch) + Task 3 (error message) | Test: YAML parse error is surfaced in lint output with original message |
| Silent skill drop on YAML error | Task 4 (discover) | Test: malformed `SKILL.md` appears as lint error, not as missing-skill silently |
| H1/Role body check with CRLF body | Task 1 (normalization contract) + Task 3 (comment) | Normalization done in parseFrontmatter; schema.js comment documents assumption |
| Role check false positive inside code block | Task 3 (schema validator) | Document limitation in comment; add test for code-block edge case as known acceptable false-positive |
| Plugin name letter-start requirement | Task 2 (config loader) | Test: `plugins.public: 2fa` in motto.yaml causes `loadConfig` to throw |
| Shared reference name path traversal | Task 3 (schema validator) | Test: `shared_references: ['../etc/passwd']` produces lint error "invalid reference name" |
| Skills inside `.claude-plugin/` directory | Task 6 (build) | Test: assert `dist/public/hello/SKILL.md` exists, `dist/public/.claude-plugin/hello/SKILL.md` does not |
| Symlinks in source tree | Task 6 (build) | Add `verbatimSymlinks: true` to `cpSync` call; document in code comment |
| `readdirSync` non-deterministic order | Task 4 (discover) | Test: discovered skills are sorted alphabetically by `dirName` |
| Over-engineering templates | Deferred by design | No template validation code in v1; `template` field accepted but ignored |

---

## Sources

- Codex issue #13918: UTF-8 BOM in SKILL.md causes "missing YAML frontmatter delimited by ---" — https://github.com/openai/codex/issues/13918
- Claude Code issue #17154: Frontmatter Parsing Error with valid YAML — https://github.com/anthropics/claude-code/issues/17154
- OpenClaw issue #22134: YAML parse errors silently drop skills with no user feedback — https://github.com/openclaw/openclaw/issues/22134
- autoresearch issue #69: Invalid YAML frontmatter — unquoted colon in description field — https://github.com/uditgoenka/autoresearch/issues/69
- eemeli/yaml issue #595: Single `\r` not treated as line break (closed not-planned) — https://github.com/eemeli/yaml/issues/595
- markdownlint issue #153: YAML Front Matter Regex Not Handling Mixed Fencing — https://github.com/DavidAnson/markdownlint/issues/153
- Node.js GitHub issue #3232: `fs.readdir` order is platform-dependent — https://github.com/nodejs/node/issues/3232
- Node.js docs `fs.cpSync` — `verbatimSymlinks` option — https://nodejs.org/api/fs.html
- Claude Code official plugins reference — https://github.com/anthropics/claude-plugins-official/blob/main/plugins/plugin-dev/skills/plugin-structure/references/manifest-reference.md
- Ansible docs: YAML colon-in-value syntax error — https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html

---
*Pitfalls research for: Motto — CLI linter + static packager for Claude Code Agent Skills*
*Researched: 2026-06-30*
