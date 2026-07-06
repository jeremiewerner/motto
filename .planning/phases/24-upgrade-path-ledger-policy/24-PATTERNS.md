# Phase 24: Upgrade-Path Ledger & Policy - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 5 (1 new content file, 3 process/edit files, 1 optional new test)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `UPGRADING.md` (NEW) | config/doc content | batch (static content, no code flow) | `CHANGELOG.md`-style content produced by `skills/changelog/SKILL.md` Step 6 (no CHANGELOG.md exists yet in-repo; template is the skill's own Keep-a-Changelog convention) | role-match (doc-content generation pattern, not a code file) |
| `skills/release/SKILL.md` (MODIFIED — new gate step) | utility/procedure (skill file, not code) | event-driven (gate triggers off git diff at release time) | itself, Step 1 (Pre-Release Gate: Tests) — same file, same blocking-gate idiom | exact (self-analog: extend existing step style in the same file) |
| `.claude/CLAUDE.md` (MODIFIED — Constraints bullet) | config | transform (static text insertion) | existing `### Constraints` bullet list, same file (lines 11-16) | exact |
| `src/version.js` (MODIFIED — optional message wording) | utility (pure function, no I/O) | transform (string in/out) | itself — `checkSkew()` lines 92-108, existing template-literal message construction | exact (self-analog) |
| `test/upgrading-ledger.test.js` (NEW, optional backstop) | test | batch (static text/source assertion, no fixtures) | `test/doc-sync.test.js` (DOC-06 drift guard) | exact |

## Pattern Assignments

### `UPGRADING.md` (NEW, root-level doc content)

**Analog:** No direct sibling doc exists (no `CHANGELOG.md`/`docs/` dir in repo). Closest process analog is `skills/changelog/SKILL.md`'s own content-generation contract (Step 4-6), which defines the "plain-language, grouped, no rationale essays" content discipline this ledger must also follow, and `README.md`'s plain-Markdown, no-generator convention (repo-wide doc style).

**Content depth contract** (from CONTEXT.md D-05, locked): each entry = one-line "what breaks" statement + numbered steps + one before/after snippet + verify command. No rationale essays, no design-doc links.

**Structural precedent — Keep a Changelog heading style** (`skills/changelog/SKILL.md` lines 42-44):
```markdown
Insert the new entry at the top of the version list under a `## [<proposed-version>] - <date>`
(or `## [Unreleased]`) heading, using Keep a Changelog section headings (Added, Changed, Fixed, etc.)
```
Adapt this heading idiom to `## vX.Y.Z — <short break description>` per entry (D-11: keyed by the version where the break landed), not by date.

**Exact source-of-truth for entry 1 content (v0.0.5 `<role>` migration):** commit `d402e15` (verified in RESEARCH.md) — copy the migration diff's before/after verbatim, do not reconstruct from memory.

**Exact source-of-truth for entry 2 content (v0.0.7 `mottoVersion` stamp):** `src/init.js` lines 150-163 — the scaffold key order is `name`, `version`, `mottoVersion`, `description`, `plugins`. Read this file directly before writing the entry; do not free-hand the YAML key order (Pitfall 1 in RESEARCH.md).

RESEARCH.md's own "Pattern 1: Ledger Entry Template" section (lines 125-201) already contains a fully drafted, ready-to-copy version of both seed entries verified against those exact sources — the planner/writer should treat that block as the primary source text, adjusting only for the final `UPGRADING.md` heading scheme chosen.

---

### `skills/release/SKILL.md` (MODIFIED — insert Ledger Gate step)

**Analog:** Self — Step 1 (Pre-Release Gate: Tests), same file, lines 21-29.

**Blocking-gate language pattern to mirror** (lines 21-29):
```markdown
## Step 1 — Pre-Release Gate: Tests

All tests must pass before tagging.

\`\`\`
node --test
\`\`\`

Expected output: `# pass 75` (or higher) and `# fail 0`. If any test fails, stop. Fix the failure before proceeding.
```
Note the shape: heading → one-line rationale → fenced command → expected-output description → explicit "stop/fix before proceeding" blocking clause. The new Ledger Gate step must follow this exact shape (heading, command, explicit "do NOT proceed... until" blocking clause per D-01).

**Git-diff heuristic pattern to reuse** (from `skills/changelog/SKILL.md` lines 20-26, the closest git-range analog in-repo):
```markdown
## Step 1 — Find the last version tag

Resolve the most recent version tag with `git describe --tags --abbrev=0` (fall back to
`git tag --sort=-v:refname | head -1`). If the repository has no version tags at all,
treat the full history as the commit range and note that in the draft entry.

## Step 2 — Collect commits since that tag

Run `git log <last-tag>..HEAD --oneline` to list every commit since the tag.
```
Adapt the tag-resolution one-liner, then substitute `git diff <tag>..HEAD -- <paths>` for `git log <tag>..HEAD --oneline` (RESEARCH.md Pattern 2 already drafts this adapted step verbatim — copy it, inserting after Step 3 Dogfood Check, renumbering Steps 4-9 to 5-10 per RESEARCH.md's stated preference).

**Success-criteria list pattern to extend** (lines 159-171): each bullet in `<success_criteria>` is one locked guarantee about the process; add one new bullet describing the ledger gate's guarantee (mirrors existing bullet style, e.g. "The tests pass..." / "package.json, motto.yaml... bumped...").

---

### `.claude/CLAUDE.md` (MODIFIED — Constraints bullet)

**Analog:** Self — existing Constraints list, same file, lines 11-16 (note: this file is machine-managed by GSD, sourced from `PROJECT.md` via the `<!-- GSD:project-start source:PROJECT.md -->` marker — see Shared Patterns below for the correct edit point).

**Existing bullet style to mirror** (lines 13-16):
```markdown
- **Tech stack**: Node ≥ 20, plain ESM JavaScript, `node --test` (stdlib runner), single runtime dependency `yaml` — keep the maintenance surface minimal.
- **Portability**: built skills must be standard Agent Skills, loadable with no Motto present.
- **Philosophy**: mechanism over features; YAGNI ruthlessly; iterate slowly. Accuracy, portability, extensibility, maintenance are the fundamentals.
- **No content stripping**: `SKILL.md` is copied verbatim to dist (unknown frontmatter keys are harmless).
```
New bullet should follow the `- **Label**: sentence.` shape, e.g. `- **Upgrade path**: any structure/schema change that breaks a previously-passing project needs an UPGRADING.md entry — see the release skill's Ledger Gate.`

---

### `src/version.js` (MODIFIED — optional skew-message wording, Open Question 1)

**Analog:** Self — `checkSkew()`, lines 92-108 (pure function, template-literal message construction, no I/O, never-throw invariant).

**Exact current message to edit** (lines 98-103):
```javascript
if (cmp < 0) {
  return {
    skill: "motto.yaml",
    message: `project was scaffolded with motto ${stampedVersion}; you are running ${toolVersion} — check the upgrade ledger for changes since ${stampedVersion}`,
  };
}
```
RESEARCH.md's Open Question 1 recommends changing `"check the upgrade ledger"` → `"check UPGRADING.md"`. If implemented, this is a one-line string edit inside the same template literal — no structural change to the function, preserving the never-throw/pure-function contract (module doc comment lines 1-15 states this invariant explicitly; do not add try/catch or I/O to this function).

**Test assertion that must be updated in lockstep** (`test/version.test.js` lines 102-127, verified via grep):
```javascript
it("project older than tool -> 'check the upgrade ledger' remedy, names both versions", () => {
  ...
  assert.match(warning.message, /check the upgrade ledger/);
  ...
});
```
If the wording changes, this regex (and its twin at line 122) must change too — both currently match the literal substring `check the upgrade ledger`. Grep `test/version.test.js` for all four occurrences before editing (lines 106, 122 confirmed; verify no others).

---

### `test/upgrading-ledger.test.js` (NEW, OPTIONAL backstop test)

**Analog:** `test/doc-sync.test.js` (DOC-06 drift guard) — full file read, 105 lines, exact structural template to copy.

**Imports pattern** (lines 1-11):
```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchor REPO_ROOT at load time via import.meta.url — NEVER derive it from
// the current working directory (that shifts with invocation directory;
// import.meta.url is stable).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```
Copy this verbatim — it is the repo-wide convention for anchoring paths in tests (also used identically in `test/dogfood.test.js` lines 13-16).

**Core assertion pattern** (lines 76-104, adapted): doc-sync.test.js curates a list of literal substrings and asserts each is both live source text (in schema.js et al.) AND quoted in the doc. For the ledger backstop, RESEARCH.md's Open Question 2 recommends a lighter existence+heading check rather than full source-text parity (there is no "source of truth" code file the ledger mirrors — it's freehand doc content). Adapt only the `describe`/`it` shape and the `assert.ok(docText.includes(...))` idiom:
```javascript
describe('upgrading-ledger backstop', () => {
  it('UPGRADING.md exists and contains both seed entries', async () => {
    const docText = await readFile(join(REPO_ROOT, 'UPGRADING.md'), 'utf8');
    assert.ok(docText.includes('## v0.0.5'), 'missing v0.0.5 <role> migration entry heading');
    assert.ok(docText.includes('## v0.0.7'), 'missing v0.0.7 mottoVersion stamp entry heading');
  });
});
```
Do not attempt to mirror doc-sync's code→doc source-text parity check (Pitfall in RESEARCH.md's Open Question 2: there's no code file to diff against — this would just re-encode content, no behavioral assertion).

---

## Shared Patterns

### Blocking-gate language (release-skill idiom)
**Source:** `skills/release/SKILL.md` Step 1 (lines 21-29) and Step 2's clean-tree gate (lines 31-33)
**Apply to:** The new Ledger Gate step
```markdown
If any test fails, stop. Fix the failure before proceeding.
```
Same imperative "stop / do NOT proceed until X" register must be used for the ledger gate, per D-01's explicit "same strength as Step 1" requirement.

### Never-throw / pure-function invariant (src/*.js house style)
**Source:** `src/version.js` module doc comment, lines 1-15
**Apply to:** Any edit inside `checkSkew()` or `parseVersion()` — never introduce a throw path; this is a project-wide standing invariant flagged in user memory ("Motto never-throw invariant") as a 5x-recurring regression risk. Any wording change must stay inside the existing template-literal return shape.

### Test path-anchoring convention
**Source:** `test/dogfood.test.js` lines 13-16 and `test/doc-sync.test.js` lines 7-11 (identical in both)
**Apply to:** `test/upgrading-ledger.test.js` if created — always anchor `REPO_ROOT` via `import.meta.url`, never `process.cwd()`.

### CLAUDE.md is machine-managed — edit PROJECT.md, not CLAUDE.md directly
**Source:** `.claude/CLAUDE.md` lines 1-18, `<!-- GSD:project-start source:PROJECT.md -->` / `<!-- GSD:project-end -->` markers
**Apply to:** The D-03 Constraints bullet task. The Constraints section in `.claude/CLAUDE.md` (lines 11-16) is synced from `.planning/PROJECT.md`'s own Constraints section (per the HTML comment marker `source:PROJECT.md`) — **the correct edit point is `.planning/PROJECT.md` §Constraints, not `.claude/CLAUDE.md` directly**, since a direct edit would be overwritten on the next GSD sync. Verify this sync mechanism (check for a `doc-sync`/`generate-claude-md` script) before deciding the edit point; if PROJECT.md already carries this constraint verbatim (RESEARCH.md line 13 claims PROJECT.md line 142 already has it), the CLAUDE.md side may already be in sync or may need a one-time manual sync run.

## No Analog Found

None — all 5 files/edits have a strong same-file or same-directory analog. This phase's low code-surface (docs + one procedural skill file + no new runtime code) means every pattern is either self-referential (extend the same file's existing idiom) or directly copsoftieable from `test/doc-sync.test.js`.

## Metadata

**Analog search scope:** `skills/release/SKILL.md`, `skills/changelog/SKILL.md`, `src/version.js`, `test/version.test.js`, `test/doc-sync.test.js`, `test/dogfood.test.js`, `.claude/CLAUDE.md`
**Files scanned:** 7
**Pattern extraction date:** 2026-07-06
