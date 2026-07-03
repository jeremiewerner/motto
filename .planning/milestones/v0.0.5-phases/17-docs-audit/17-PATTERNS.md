# Phase 17: Docs Audit - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 4 (3 doc edits, 1 new test)
**Analogs found:** 4 / 4 (all self-referential — this is a docs-audit phase, analogs are each file's own current structure)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `shared/references/skill-schema.md` | config/doc (reference) | transform (surgical patch of existing prose) | itself — `shared/references/skill-schema.md` §1–§5/§7 house style | exact (self-analog) |
| `README.md` | doc (narrative) | transform (section rewrite + find/replace) | itself — existing `## Contents`/anchor structure and other sections (`## Ship your plugin`, `## Install Motto's skills`) | exact (self-analog) |
| `skills/build-skill/SKILL.md` | doc (agent instructions) | transform (prose trim, Step 2 only) | itself — Steps 1/3–8 (unedited, establish the surrounding house style) + 16-02 precedent commit | exact (self-analog) |
| `test/doc-sync.test.js` (NEW) | test | transform / static-analysis (read two text files, assert substring containment) | `test/dogfood.test.js` | role-match (same repo-level assertion-test pattern; different subject matter) |

No file in this phase needs an external/different-domain analog — three are surgical edits to their own existing content, and the one new file has a strong direct analog already in `test/`.

## Pattern Assignments

### `shared/references/skill-schema.md` (doc rewrite, transform)

**Analog:** itself (current file, read in full — 164 lines)

**House style to preserve for §1–§5 (unchanged) and to replicate for new §6/§7/§8/§9:**

Section skeleton (repeated per field, e.g. §1 `name`, lines 9–36):
```markdown
## N. `<field>` Field

**Rule:** <one-line plain-English statement of the rule>

<optional YAML/pattern example fenced block>

**Additional constraints:** (optional bullet list)

**<Field> validation cascades — it stops at the first failure:** (optional, only for multi-step cascades)

| Step | Check | Lint error emitted |
|------|-------|--------------------|
| 1 | ... | `<verbatim error string, with placeholders as <typeof>, N, X>` |

Valid examples: ...
Invalid examples: ...

---
```

Non-cascading fields use a flatter form (§3 `audience`, lines 60–75):
```markdown
## 3. `audience` Field

**Rule:** <rule statement>

```yaml
audience: public   # inline comment
```

**Lint error if wrong:** `audience must be public|private`

**Build behavior:**
- <bullet notes>

---
```

**Error-table placeholder convention (must reuse exactly, per Pitfall 1 in RESEARCH.md):**
- Non-interpolated literal strings are quoted whole, e.g. `` `name is required` ``.
- Interpolated values use bracketed shorthand tokens already established in this doc: `<typeof>` for `typeof x`, `N` for a numeric length, `X` for the offending value itself. Example (line 28–31):
```
| 2 | `name` is a truthy non-string (boolean, number, array, object) | `name must be a string (got <typeof>)` |
| 3 | `name` fails the kebab regex | `name must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/): "X"` |
| 4 | `name` exceeds 64 characters | `name must not exceed 64 characters (got N): "X"` |
```

**§6 currently false (to be replaced verbatim), lines 126–136:**
```markdown
## 6. `template` and `dependencies` Fields

These fields are accepted and passed through verbatim. They are NOT validated in Motto v0.0.2.

```yaml
template: some-template
dependencies:
  - another-skill
```
```
This entire block is the target of the D-01/D-02 rewrite — replace with the real template cascade (RESEARCH.md's Validator Ground Truth Catalog §6), and split `dependencies` out into its own new §8 rather than co-locating it here, since `outputs`/`allowed-tools` need their own sections too (per D-01 the renumbering is §1 name, §2 description, §3 audience, §4 body spine, §5 shared_references, §6 template, §7 outputs, §8 dependencies, §9 allowed-tools, §10 frontmatter envelope — was §7).

**Header to replace (D-04), lines 1–5:**
```markdown
# Motto Skill Schema Reference

This file is the canonical rule source for the Motto skill schema (v0.0.2).
It is bundled verbatim by `motto build` into each public skill's `references/` directory.
All claims are derived from `src/schema.js`, `src/config.js`, `src/frontmatter.js`, and `src/lint.js`.
```
Keep sentence 2 and 3 verbatim (still true — bundling + source-of-truth citation); only remove `(v0.0.2)` from sentence 1, per D-04's "source citation, not version number" instruction.

**§2 drift fix target (add missing non-string error), lines 53–56 — insert a new bullet into the existing `**Lint errors:**` list:**
```markdown
**Lint errors:**
- `description is required`
- `description must not exceed 1024 characters (got N)`
- `description must not contain XML tags (e.g. <example>)`
```
New line to add (per RESEARCH.md drift finding #1): `` `description must be a string (got <typeof>)` `` — with a note that Array values render as the literal word `"array"`, not `typeof`.

**§4 cross-reference addition (waivability note), lines 78–99** — append one sentence near Check 1/Check 2 noting that Title/Role checks are individually skippable if the resolved template's `waives` set includes `"title"`/`"role"` (currently inert — no shipped template uses it), with a forward-pointer to the new §6.

**§7 (old) Frontmatter Envelope, lines 138–164 — CURRENT, renumber to §10 only, no content change.**

---

### `README.md` (section rewrite + 8-site replace, transform)

**Analog:** itself (existing anchors + surrounding sections)

**Contents/anchor pattern to preserve (lines 11–24):**
```markdown
## Contents

1. [Install the CLI](#install-the-cli)
2. [Scaffold a project](#scaffold-a-project)
3. [Author a skill](#author-a-skill)
...
```
Per D-06/D-07 and Anchor Stability analysis: keep the `## Author a skill` heading text (line ~93) unchanged so `#author-a-skill` anchor stays valid — rewrite only the body beneath it.

**Section-body house style to match (model: line ~93 area and the "End-to-end example" numbered-step blocks around lines 195–230):** short prose paragraph, then fenced shell/slash-command blocks, e.g.:
```markdown
## Author a skill

Use the `/motto:author-skill` skill in Claude Code for a step-by-step guide to writing a conforming `SKILL.md`.
```
Replace this paragraph (and the frontmatter-spine example immediately below it) with build-skill's real flow per D-06: "hand it ANY input ... gap-fills missing slots in one batch ... writes ... lints until clean ... quality gate ... compact receipt", slash command `/motto:build-skill`.

**8 literal-replacement sites (mechanical `author-skill` → `build-skill`, `/motto:author-skill` → `/motto:build-skill`), each in its existing fenced-block/table-row form:**
- dist tree diagram (~line 143): `    author-skill/` → `    build-skill/`
- End-to-end example Step 3 (~line 203): `/motto:author-skill` → `/motto:build-skill`
- Skills table row (~line 254):
```markdown
| Skill | Slash command | What it does |
|-------|--------------|-------------|
| `author-skill` | `/motto:author-skill` | Step-by-step guide for writing a conforming `SKILL.md` |
```
becomes a `build-skill` row with a trigger-style description (matching D-06's flow, not a summary).
- Symlink one-liner (~line 267): `` ln -s "$(pwd)/dist/public/author-skill" ~/.claude/skills/author-skill ``
- Prose sentence after it (~line 270): `` The absolute source path (`$(pwd)/dist/public/author-skill`) ... ``
- Zip one-liner (~line 275): `` cd dist/public && zip -r author-skill.zip author-skill/ ``
- Trailing substitution note (~line 278): `` Substitute `author-skill` with any other skill name ... ``

All 8 sites confirmed live in the current file (verified via Bash grep of the sed excerpt above matching RESEARCH.md's line numbers exactly).

---

### `skills/build-skill/SKILL.md` (Step 2 prose trim, transform)

**Analog:** itself — Steps 1, 3–8 (unedited; establish the imperative, numbered, agent-instruction voice) plus the 16-02 precedent (surgical build-skill prose edits, re-lint required).

**Current Step 2 to replace, lines 24–31:**
```markdown
## Step 2 — Map onto the schema

Consult the bundled `skill-schema` reference for the base frontmatter and body rules (`name`, `description`, `audience`, the Title + Role spine, `shared_references`). For the newer fields, apply this delta yourself — it supersedes the bundled reference wherever they disagree, including its claim that `template` and `dependencies` are "not validated" (they are, as of the current linter):
- `template: procedure` — for step-like/procedural input; adds mandatory `<process>` and `<success_criteria>` body sections.
- `outputs` — a name-to-existing-file map; declare an entry only for a file you are actually writing alongside `SKILL.md`.
- `dependencies` — bare skill names or `plugin:skill` references the skill genuinely relies on.
- `allowed-tools` — an honest array of the Bash invocation patterns the skill genuinely runs.
```

**Target form per D-05** (no delta, no supersede clause):
```markdown
## Step 2 — Map onto the schema

Consult the bundled `skill-schema` reference for the full frontmatter and body rules (`name`, `description`, `audience`, the Title + Role spine, `template`, `outputs`, `dependencies`, `allowed-tools`, `shared_references`).
```

**Post-edit invariants to re-check (grep, matching 16-02 precedent's acceptance-criteria style):**
```bash
grep -c "letter-start kebab-case" skills/build-skill/SKILL.md   # must stay 0
grep -c "Common Lint Errors" skills/build-skill/SKILL.md         # must stay 0
```
Both already return 0 today; Step 5 (lines 46–51, out of phase boundary) independently restates the NAME cascade prose but does not contain the exact grepped substring — do not touch Step 5.

**Full test suite + re-lint required after this edit** (16-02 precedent — build-skill prose edits are cheap/safe but must be verified, not assumed).

---

### `test/doc-sync.test.js` (NEW, test / static-analysis)

**Analog:** `test/dogfood.test.js` (full file, 165 lines, read above)

**Imports pattern to copy** (lines 1–6):
```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
```
(dogfood.test.js also imports `before`/`after`/`mkdtemp`/`cp`/`stat`/`tmpdir` — the doc-sync test needs none of that machinery; no tempdir, no build, just static reads of real repo files.)

**REPO_ROOT anchoring pattern — copy verbatim** (lines 13–16):
```javascript
// Anchor REPO_ROOT at load time via import.meta.url — NEVER use process.cwd()
// (process.cwd() shifts with invocation directory; import.meta.url is stable).
// test/dogfood.test.js lives one level inside the repo root, so '..' resolves correctly.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```
`test/doc-sync.test.js` lives in the same `test/` directory, so the identical `'..'` resolution applies unchanged.

**describe/it shape to follow** (lines 23–31, 34–45 — small, focused describe blocks with one clear assertion message each):
```javascript
describe('NAME_KEBAB parity (DOG-04)', () => {
  it('NAME_KEBAB from schema.js and config.js are the same RegExp instance (REVIEW-11)', () => {
    assert.strictEqual(
      schemaKebab,
      configKebab,
      'NAME_KEBAB must be the same RegExp instance: config.js must re-export from schema.js',
    );
  });
});
```
Same shape for doc-sync: one `describe('doc-sync (DOC-06/DOC-07)', ...)` block, with one `it` per field/section (or one `it` per static-segment array with a single loop and per-item assertion messages — either shape matches the existing house style of clear per-assertion failure messages carrying the diagnostic payload).

**"Real repo files, not fixtures" pattern** (line 36: `await lintProject(REPO_ROOT)`) — the doc-sync test reads `src/schema.js`, `src/lint.js`, and `shared/references/skill-schema.md` directly via `readFile(join(REPO_ROOT, ...), 'utf8')`, exactly as dogfood reads real dist/ output rather than constructing fixtures.

**Assertion-message style to copy** (lines 37–44, 80–89) — every `assert` call carries a human-readable failure message as the last argument that embeds the actual diagnostic (e.g. `` `lint failed:\n${JSON.stringify(result.errors, null, 2)}` ``). For doc-sync: `` assert.ok(docText.includes(segment), `skill-schema.md missing expected string: "${segment}"`) ``.

**Direction-of-assertion warning (critical, from RESEARCH.md Pitfall 3 — not present in dogfood.test.js but must be respected):** derive the expected string SET from `src/schema.js`/`src/lint.js` source text (or live `validateSkill()` invocation) FIRST, then assert containment IN `shared/references/skill-schema.md` — never the reverse (iterating the doc's own tables and checking against the code would invert the source-of-truth direction and mask a doc going stale).

**Illustrative shape from RESEARCH.md (Option 1, source-text extraction — recommended, sized to match this phase's "small node:test" framing):**
```javascript
import { readFileSync } from 'node:fs';

const schemaSrc = readFileSync(new URL('../../src/schema.js', import.meta.url), 'utf8');

const staticSegments = [
  'name is required',
  'must be letter-start kebab-case',
  // ... one entry per documented error family (see RESEARCH.md's full list)
];
```
Prefer `readFile` (async, matches dogfood.test.js's async style) over `readFileSync` for consistency with the rest of `test/`, unless the planner decides a top-level-await-free sync form is simpler for this one file.

## Shared Patterns

### REPO_ROOT anchoring (applies to: `test/doc-sync.test.js`)
**Source:** `test/dogfood.test.js` lines 13–16 (`resolve(dirname(fileURLToPath(import.meta.url)), '..')`)
**Apply to:** the new test file — never use `process.cwd()` for locating repo files; this is an explicit, commented convention already established and must not be reinvented or deviated from.

### Assertion-message-carries-diagnostic (applies to: `test/doc-sync.test.js`)
**Source:** `test/dogfood.test.js` lines 37–44, 66–71, 80–89
**Apply to:** every new assertion — pass a template-string message with the actual failing value/diagnostic embedded, not a bare boolean check.

### Doc house style: rule statement + example + error table (applies to: `shared/references/skill-schema.md` new §6/§7/§8/§9)
**Source:** `shared/references/skill-schema.md` §1 (lines 9–36) and §3 (lines 60–75)
**Apply to:** all four new/rewritten sections — reuse the exact heading level (`## N. \`field\` Field`), the `**Rule:**` lead sentence, a fenced YAML example, and a two-column or three-column error table with the established placeholder tokens (`<typeof>`, `N`, `X`).

### Anchor-preserving section-body-only edits (applies to: `README.md`)
**Source:** `README.md` `## Contents` (lines 11–24) cross-referenced against heading text at line ~93
**Apply to:** the "Author a skill" rewrite — GitHub auto-generates anchors from heading text; changing heading text breaks the Contents link. Edit only the section body, never the heading, unless the Contents list is updated in the same diff.

## No Analog Found

None. All four files in this phase either edit their own existing content in place or have a direct, strong analog already in the repo (`test/dogfood.test.js` for the one new test file).

## Metadata

**Analog search scope:** `shared/references/skill-schema.md`, `README.md`, `skills/build-skill/SKILL.md`, `test/dogfood.test.js` (all read in full); line ranges of `README.md` spot-checked via `sed` against RESEARCH.md's cited line numbers (confirmed matching, zero drift since discussion/research).
**Files scanned:** 4 read in full + 1 grep-confirmed excerpt (README.md sections)
**Pattern extraction date:** 2026-07-03
</content>
