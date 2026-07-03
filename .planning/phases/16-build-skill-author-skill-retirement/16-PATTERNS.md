# Phase 16: build-skill & author-skill Retirement - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 3 (1 new, 1 deleted, 1 modified)
**Analogs found:** 2 / 2 (deletion has no analog need)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `skills/build-skill/SKILL.md` | Agent Skill (procedure, self-verifying generator) | request-response / feedback-loop (ingest → generate → validate → fix → report) | `skills/release/SKILL.md` (structural/frontmatter shape) + `skills/author-skill/SKILL.md` (schema-knowledge/shared_references precedent) | exact (frontmatter shape) / role-match (content-generation body) |
| `skills/author-skill/SKILL.md` | Agent Skill (reference/teaching) | — DELETED, no analog needed | — | n/a (deletion) |
| `test/dogfood.test.js` | test | batch/fixture (mkdtemp build + in-place lint assertions) | itself — same file, edited in place (lines ~92-99, ~35-45) | exact (self-edit) |

## Pattern Assignments

### `skills/build-skill/SKILL.md` (Agent Skill, template: procedure)

**Analog 1 (frontmatter + `<process>`/`<success_criteria>` shape + honest `allowed-tools`):** `skills/release/SKILL.md`

Full frontmatter pattern to imitate (lines 1-10):
```yaml
---
name: release
description: Maintainer release checklist for Motto — run tests, bump version, dogfood lint and build, verify tarball, and publish. Use this skill when releasing a new Motto version.
audience: private
template: procedure
allowed-tools:
  - "Bash(node *)"
  - "Bash(npm *)"
  - "Bash(git *)"
---
```
`build-skill`'s frontmatter must mirror this exact shape per the locked decision: `name`, `description` (WHEN-only per BSKL-05, NOT the release-style "what + when" — see Shared Patterns below), `audience: public`, `template: procedure`, `shared_references: [skill-schema]`, and — only if genuinely used — `allowed-tools` entries scoped to the real `motto lint` invocation (e.g. `"Bash(motto lint*)"`, `"Bash(npx *)"`). No `outputs:`/`dependencies:`.

**Role line pattern** (line 14):
```markdown
**Role:** You are the Motto release assistant for the maintainer. Guide through each release step in order: tests, version bump, dogfood check, tarball verify, publish, and post-release housekeeping.
```
Behavioral, verb-led, names the concrete steps — this is the bar `build-skill`'s own Role line and its content-quality gate's "non-empty behavioral Role" check must both meet (avoid the anti-pattern `**Role:** Skill builder.`).

**`<process>` numbered-steps pattern** (lines 16-124): a strict linear `## Step N — <name>` sequence, each step stating expected output and a "STOP if..." condition where relevant (see Step 1 "If any test fails, stop", Step 5 "STOP if this errors"). `build-skill`'s own `<process>` should follow this same linear step-numbered shape (ingest → map → gap-fill → write → lint-loop → quality-gate → report) — no flowchart except for the one genuinely non-obvious branch (template auto-detection), per research Anti-Patterns.

**Feedback-loop / self-verification pattern** (Step 3, lines 47-61):
```markdown
Run Motto against its own skill tree:

    node bin/motto.js lint && node bin/motto.js build

Expected:
- `motto lint` → `✓ N skills OK` (open-ended count as skills grow)
- `motto build` → exits 0; `dist/public/` and `dist/private/` are populated

If lint fails, fix the skill content before publishing.
```
`build-skill`'s lint loop (step 6 of its own process) adapts this shape but targets *consumer* projects, so the invocation must be the npx-fallback chain (locked decision), not the maintainer-only `node bin/motto.js lint` form — that maintainer form is only relevant if someone runs `build-skill` inside Motto's own repo (research Pitfall 7).

**Analog 2 (schema-knowledge sourcing + `shared_references` wiring):** `skills/author-skill/SKILL.md`

**Frontmatter shared_references pattern** (lines 1-7):
```yaml
---
name: author-skill
description: Teaches how to write a conforming SKILL.md for the Motto framework. Use this skill when authoring a new Motto skill or investigating a lint error.
audience: public
shared_references:
  - skill-schema
---
```
`build-skill` inherits this `shared_references: [skill-schema]` wiring verbatim (locked decision — "Bundle stale skill-schema.md as-is"). Note: `author-skill`'s description is "what + when" (the softer, stale style) — `build-skill`'s own description must NOT copy this shape; it must be WHEN-only (Pattern 2 in RESEARCH.md, locked BSKL-05 rule). This is the one place where the closest analog's pattern must be deliberately NOT copied — flag this explicitly in the plan.

**What NOT to inherit from author-skill:** its `## Common Lint Errors` table (lines 104-118) duplicates lint error strings/regexes verbatim. This is exactly the DOC-06 debt the retirement kills. `build-skill`'s body must describe *behavior* ("run `motto lint`, read its output, fix what it flags") and must never restate error message text from `src/schema.js`/`src/lint.js` in its own prose.

---

### `test/dogfood.test.js` (test, batch)

**Analog:** itself (edited in place) — no external analog needed; this file already contains every pattern the edit must follow.

**Skill-count assertion to update** (lines 35-45, `dogfood lint (DOG-03)` describe block):
```javascript
it('lintProject on REPO_ROOT returns ok:true with count=2', async () => {
  const result = await lintProject(REPO_ROOT);
  assert.strictEqual(result.ok, true, `lint failed:\n${JSON.stringify(result.errors, null, 2)}`);
  assert.strictEqual(result.count, 2, `expected 2 skills, got ${result.count}`);
  assert.deepStrictEqual(result.errors, []);
});
```
`count: 2` stays 2 (author-skill removed, build-skill added — net zero) — no change needed to this specific assertion's numeric value, but it must still pass against the post-swap tree.

**Public-bucket dist assertions to swap** (lines 91-100 — these are the ones the CONTEXT.md and RESEARCH.md explicitly flag "lines ~92-99"):
```javascript
// ── Public bucket skill files ─────────────────────────────────────────────────
it('dist/public/author-skill/SKILL.md exists', async () => {
  await stat(join(tempDir, 'dist', 'public', 'author-skill', 'SKILL.md'));
  // stat throws ENOENT if missing; test fails with a clear error code
});

// ── Shared reference bundling ─────────────────────────────────────────────────
it('author-skill has references/skill-schema.md bundled', async () => {
  await stat(join(tempDir, 'dist', 'public', 'author-skill', 'references', 'skill-schema.md'));
});
```
Both `it()` blocks must swap `author-skill` → `build-skill` (test name string, `join(...)` path segment, and title text) in the same commit that deletes `skills/author-skill/`. This is the exact pattern to copy for the two replacement assertions — same `stat()`-throws-ENOENT-on-missing idiom, same directory-join shape.

**`buildResult.skillCount`/`bucketCount` assertion** (lines 80-89) — unaffected numerically (`skillCount: 2`, `bucketCount: 2` — public+private), but depends on the swap landing atomically or this assertion (and the lint count=2 assertion above) will fail if either `skills/author-skill/` deletion or `skills/build-skill/` addition happens without the other in the same commit.

**Private-bucket assertions** (lines 102-113, `release`-scoped) — untouched, no analog work needed; included here only to confirm they are NOT part of this phase's edit scope (release skill is unrelated to the swap).

---

## Shared Patterns

### Description = WHEN-only (content-quality gate, BSKL-05)
**Source:** RESEARCH.md Pattern 2 (external, empirically tested — superpowers `writing-skills`), locked in `16-CONTEXT.md`
**Apply to:** `build-skill/SKILL.md`'s own `description:` field, AND the content-quality gate's check #3 that `build-skill` runs against every skill it generates.
```yaml
# BAD (what author-skill/release both do — "what + when"):
description: Maintainer release checklist for Motto — run tests, bump version, dogfood lint and build, verify tarball, and publish. Use this skill when releasing a new Motto version.

# GOOD (WHEN-only — the rule build-skill must apply to itself, deliberately diverging from the release/author-skill precedent):
description: Use when authoring a new Motto skill from freeform input, a doc, or a conversation transcript.
```
Do not copy `release`'s or `author-skill`'s description shape verbatim — both predate the BSKL-05 locked rule.

### `template: procedure` body-tag mechanics (TMPL-01/03)
**Source:** `skills/release/SKILL.md` lines 16, 124, 126, 135 (`<process>`/`</process>`, `<success_criteria>`/`</success_criteria>` — line-anchored, bare tags, matched pairs)
**Apply to:** `skills/build-skill/SKILL.md` — must open its `<process>` tag on its own line immediately before the numbered steps, close it, then open `<success_criteria>` with checkable bullet conditions (not restated step titles — this is also what `build-skill`'s own quality gate must self-check against, per Anti-Pattern in RESEARCH.md).

### `shared_references` wiring
**Source:** `skills/author-skill/SKILL.md` lines 5-6
**Apply to:** `skills/build-skill/SKILL.md` frontmatter — `shared_references: [skill-schema]`, inherited verbatim per locked decision (bundle stale doc as-is, no edit this phase).

### Real lint-error shape to parse in the self-verification loop
**Source:** `src/lint.js` lines 14, 41, 76, 192, 259, 318 (JSDoc + `errors.push({ skill, message })` call sites)
```javascript
// Return shape: { ok: boolean, errors: Array<{ skill: string, message: string }>, count: number }
// errors[].skill === the skill's dirName (folder name) — filter on this to scope fixes to the new skill only.
```
**Apply to:** `build-skill`'s lint-loop step description — must instruct filtering `errors` to `error.skill === <new skill's dirName>` before self-fixing (Pitfall 3), and must never restate the message strings themselves (DOC-06).

### dogfood test edit idiom (`stat()`-throws pattern)
**Source:** `test/dogfood.test.js` lines 91-100 (existing author-skill assertions, to be renamed)
```javascript
it('dist/public/<skill>/SKILL.md exists', async () => {
  await stat(join(tempDir, 'dist', 'public', '<skill>', 'SKILL.md'));
});
it('<skill> has references/skill-schema.md bundled', async () => {
  await stat(join(tempDir, 'dist', 'public', '<skill>', 'references', 'skill-schema.md'));
});
```
**Apply to:** the two swapped assertions — substitute `<skill>` = `build-skill`, keep the same `stat()`-throws-ENOENT-on-missing idiom and directory-join shape used throughout the rest of the file.

## No Analog Found

None. Every file in scope has either a direct structural analog (`release/SKILL.md`, `author-skill/SKILL.md`) or is a self-edit of an existing, fully-read file (`test/dogfood.test.js`). `skills/author-skill/` itself requires no analog — it is a deletion, git history is the record (per locked decision).

## Metadata

**Analog search scope:** `skills/` (all existing SKILL.md files: `release`, `author-skill`), `test/dogfood.test.js`, `src/lint.js` (error-shape verification only, no code changed there)
**Files scanned:** `skills/release/SKILL.md`, `skills/author-skill/SKILL.md`, `test/dogfood.test.js`, `src/lint.js` (grep only)
**Pattern extraction date:** 2026-07-03
</content>
</invoke>
