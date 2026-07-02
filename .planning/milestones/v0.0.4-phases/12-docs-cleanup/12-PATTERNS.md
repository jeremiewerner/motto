# Phase 12: Docs & Cleanup - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 3 (1 doc rewrite, 1 test edit, 1 deletion)
**Analogs found:** 3 / 3 (this phase is self-referential — the "analogs" are the other sections/files it must stay truthful to, not a separate template)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `README.md` (rewrite: new "Ship your plugin" section + scaffold section rewrite + CLI surface touch-ups) | config/doc | transform (source-of-truth mirroring) | `src/init.js` (scaffold output ground truth) + `bin/motto.js` GLOBAL_HELP (CLI surface ground truth) + existing README sections (style/voice) | exact (same file, internal consistency) |
| `test/dogfood.test.js` (edit: lint count 3→2, `skillCount` 3→2, remove 2 setup-project assertions) | test | CRUD (assertion count sync) | itself — existing `dogfood.test.js` structure is the pattern to follow for the edit | exact |
| `skills/setup-project/SKILL.md` (delete) | doc/skill | n/a (removal) | n/a — deletion, not creation | n/a |

This phase has no new source code files; it is a documentation rewrite plus a coordinated test-count/deletion commit. "Patterns" here means: which existing artifacts define the *truth* that README.md must mirror, and which existing test lines are the template for the edits in `test/dogfood.test.js`.

## Pattern Assignments

### `README.md` — Scaffold section rewrite (D-05/D-07)

**Source of truth (ground truth, not analog):** `/Users/jeremie/Projects/motto/src/init.js`

The README's scaffold section and motto.yaml example block must match exactly what `scaffoldProject()` writes. Key excerpts to mirror:

**Tree shape written by init** (`src/init.js` lines 130-177, `writeScaffold`):
```
skills/hello-world/SKILL.md
shared/references/.gitkeep
motto.yaml
.gitignore
.claude-plugin/marketplace.json
```

**Scaffolded motto.yaml content** (`src/init.js` lines 140-146):
```js
`name: ${name}\nversion: "0.1.0"\ndescription: ${SCAFFOLD_DESCRIPTION}\nplugins:\n  public: ${name}\n`
```
i.e. rendered as:
```yaml
name: my-project
version: "0.1.0"
description: A skills project scaffolded by motto init.
plugins:
  public: my-project
```
Note: `SCAFFOLD_DESCRIPTION` (line 51) = `'A skills project scaffolded by motto init.'` — README example must use this exact string, not Motto's own project description (D-07 explicitly replaces Motto's own config as the example).

**.gitignore scaffolded content** (`src/init.js` line 152):
```
node_modules/
dist/private/
```

**marketplace.json shape** (`src/init.js` lines 159-176) — bare relative-path `source: './dist/public/'`, `owner: { name: owner }`, no `owner.email`, no `skills`/`strict` keys. README's D-04 one-liner mention should not contradict this shape.

**hello-world starter skill** (`src/init.js` lines 38-47) — README tree diagram should list `skills/hello-world/SKILL.md` as the scaffolded skill, not a generic `my-skill/`.

**Guards to document as one-liners (D-06):**
- Name guard: `NAME_KEBAB` regex imported from `src/schema.js` (same rule lint enforces) — `src/init.js` line 30, 206.
- `--force`: `src/init.js` lines 221-237 — never deletes, only bypasses the non-empty-dir check.

**Existing README motto.yaml field table** (`README.md` lines 68-75) — KEEP as reference per D-05; only the example block above it changes.

---

### `README.md` — Ship your plugin section (new, D-01 through D-04)

**Analog for section style/tone:** existing `## Add the marketplace to Claude Code` and `## Publish to npm` sections (`README.md` lines 141-153, 199-208) — same terse imperative style, code fences for commands, blockquote for prerequisite notes.

**Placement:** new section goes after `## Validate and build` (README.md line 139, after the `motto build` dist/ tree block) and before `## Publish to npm` — per D-01 ("placed after Validate-and-build").

**Pattern to copy — prerequisite blockquote style** (`README.md` line 201):
```markdown
> **Prerequisite:** the `jeremiewerner/motto` repository must be public for the GitHub-form add to resolve.
```
Reuse this blockquote pattern for D-02's placeholder-name explanation, but generalize it: `/plugin marketplace add <owner>/<repo>` with a substitution line — NOT hardcoded to `jeremiewerner/motto` (D-02 restricts the real repo name to Motto's own sections only, lines 188 and 204 in current README).

**marketplace.json one-liner (D-04)** — do not add a schema walkthrough table like the current `## Install Motto's skills` section; a single sentence referencing `.claude-plugin/marketplace.json` (already covered structurally in the `src/init.js` marketplace.json excerpt above) is sufficient.

**Git steps as brief prose (D-03)** — no code fence with literal `git commit`/`git push` commands; write as a sentence, contrasting with the exact-command style used elsewhere in README (e.g. `## Publish to npm` block, lines 145-150, which DOES use exact commands — this section deliberately breaks that convention per D-03).

**E2E example update (D-08)** — `README.md` lines 156-195, `## End-to-end example`. Step 2 changes from:
```
# 2 — Scaffold a new project (Claude Code slash command)
/motto:setup-project
```
to:
```
# 3 — Scaffold a new project (CLI)
motto init my-project
```
(numbering shifts since step 1 is `npm i -g`). The example must end with the new ship steps (D-01: "E2E example is updated to end with the ship steps"), meaning steps 6-7 (marketplace add / install, lines 186-195) get folded into or followed by the new Ship section's flow, replacing the current terminal steps with `motto build` → commit/push prose → `/plugin marketplace add <owner>/<repo>` → `/plugin install <plugin>@<repo-name>`.

---

### `README.md` — Phase 11 CLI surface touch-ups (D-12/D-13)

**Source of truth:** `bin/motto.js` GLOBAL_HELP constant (lines 44-54):
```
usage: motto <init|lint|build> [options]

commands:
  init [name]    scaffold a skills project in the current directory
  lint [path]    validate skills against the schema
  build [path]   package skills into dist/ plugins

options:
  -h, --help     show help
  --force        (init) overwrite scaffold files
```

**Install-the-CLI section** (`README.md` lines 26-37) currently only shows `motto lint` / `motto build` without `init` or `--help`. Per D-13, rewrite the fenced command block to list all three commands in init/lint/build order (mirroring `--help`'s compact order), e.g.:
```sh
motto init   # scaffold a skills project in the current directory
motto lint   # validate all skills and the project config
motto build  # lint, then wipe and rebuild dist/
```
and add one mention of `motto --help` (D-12) — place inline as a sentence after the code block, not as a new subsection.

**`[path]` annotations (D-12):** anywhere `motto lint` / `motto build` appear as bare commands in prose or code fences (README.md lines 35-36, 108, 118, 177, 182, and the dogfood section lines 256-258 which use `node bin/motto.js lint`/`build` — those are internal dev commands, [path] annotation optional there per Claude's Discretion), append `[path]` to match `LINT_HELP`/`BUILD_HELP` usage lines (`bin/motto.js` lines 66, 75): `usage: motto lint [path] [options]` / `usage: motto build [path] [options]`.

---

### `README.md` — Install Motto's skills table (D-11 — setup-project row removal)

**Current table** (`README.md` lines 219-223):
```markdown
| Skill | Slash command | What it does |
|-------|--------------|-------------|
| `author-skill` | `/motto:author-skill` | Step-by-step guide for writing a conforming `SKILL.md` |
| `setup-project` | `/motto:setup-project` | Guided directory layout, `motto.yaml` walkthrough, and first build |
```
Drop the `setup-project` row entirely. No migration note (D-11 — "no README migration line").

**Claude Desktop usage section** (`README.md` line 194, "install-output comment" referenced in CONTEXT.md line 55) — the E2E example's final install step comment (`# → /motto:author-skill and /motto:setup-project are now available`) must drop `setup-project`, becoming author-skill only (D-11).

---

### `README.md` — Salvage-check against `skills/setup-project/SKILL.md` (D-10)

**Content to diff before delete** — `/Users/jeremie/Projects/motto/skills/setup-project/SKILL.md` (133 lines). Sections to explicitly check are folded into the rewritten README or consciously dropped:

| SKILL.md section | Fold into README section, or drop |
|---|---|
| Directory Layout (lines 13-30) | Scaffold section — but tree must be updated to init's ACTUAL scaffold output (hello-world, not generic my-skill/another-skill) |
| motto.yaml Fields table (lines 37-58) | Already covered by README's existing field table (lines 68-75) — keep, no duplication needed |
| Running Lint (lines 60-88) | Already covered by README `## Validate and build` (lines 105-116) — no action |
| Running Build (lines 90-102) | Already covered by README `## Validate and build` (lines 117-137) — no action |
| What dist/ Contains (lines 104-124) | Already covered by README (lines 123-137) — no action |
| Installing the Built Plugin in Claude Code (lines 126-133) | Partially covered by new Ship section (D-01) — verify `claude plugin add` mention isn't lost; new Ship section uses `/plugin marketplace add` + `/plugin install` flow instead, which supersedes this |

Record this salvage-check as an explicit step per D-10 (Claude's Discretion on exact recording mechanism — task note in SUMMARY vs inline plan step).

---

### `test/dogfood.test.js` — count sync edit (paired with delete commit, D-09)

**File:** `/Users/jeremie/Projects/motto/test/dogfood.test.js`

**Analog:** the file's own existing structure — this is a same-file edit, not a cross-file pattern copy.

**Edit 1 — lint count assertion** (line 42):
```js
assert.strictEqual(result.count, 3, `expected 3 skills, got ${result.count}`);
```
→ change `3` to `2` (both the expected value and the message).

**Edit 2 — skillCount assertion** (line 86):
```js
assert.strictEqual(buildResult.skillCount, 3);
```
→ change to `2`.

**Edit 3 — remove setup-project artifact test** (lines 97-99):
```js
it('dist/public/setup-project/SKILL.md exists', async () => {
  await stat(join(tempDir, 'dist', 'public', 'setup-project', 'SKILL.md'));
});
```
→ delete this whole `it` block.

**Edit 4 — remove setup-project shared-reference bundling test** (lines 106-108):
```js
it('setup-project has references/skill-schema.md bundled', async () => {
  await stat(join(tempDir, 'dist', 'public', 'setup-project', 'references', 'skill-schema.md'));
});
```
→ delete this whole `it` block.

**Untouched by this phase:** `bucketCount` assertion (line 87, stays `2` — public+private, unrelated to skill count), `author-skill`/`release` assertions (lines 92-95, 101-121), plugin.json assertions (lines 123-145) — none reference setup-project.

**Commit sequencing constraint (D-09/SC3):** these test edits land in the SAME commit as `git rm -r skills/setup-project/`. Pre-commit hook runs the full suite against the working tree (CONTEXT.md "Established Patterns" line 74) — if the test edits and the deletion are split across commits, the hook rejects the intermediate state. This is a hard ordering constraint, not a style preference.

---

## Shared Patterns

### Never-throw / house style (background, not directly touched but informs prose accuracy)
**Source:** `src/init.js` header comment (lines 9-13) — "Never-throw orchestrator (house style — mirrors src/build.js)". Not modified in this phase, but the README's technical descriptions of `motto init` behavior (guards, errors) must stay consistent with this documented behavior — no README claim of `init` throwing/crashing on bad input.

### Documentation truthfulness enforced by test
**Source:** `test/init-dogfood.test.js` (referenced in CONTEXT.md "Reusable Assets" — not read in full this pass since it requires no edits) — already guards init → lint → build end-to-end. D-07's claim that the README motto.yaml example matches real scaffold output leans on this existing test; no new test needed for that guarantee.

### CLI help text as canonical CLI surface reference
**Source:** `bin/motto.js` lines 44-82 (GLOBAL_HELP, INIT_HELP, LINT_HELP, BUILD_HELP constants)
**Apply to:** Install-the-CLI section, Scaffold section's guard mentions, and any `[path]` annotations throughout README — README prose must not drift from these exact usage strings.

## No Analog Found

None — this phase modifies existing files only (README.md, test/dogfood.test.js) plus one deletion (skills/setup-project/SKILL.md). No new source files are created, so there is no "closest analog in a different file" search needed; the ground-truth sources (`src/init.js`, `bin/motto.js`) serve that role instead.

## Metadata

**Analog search scope:** README.md, test/dogfood.test.js, src/init.js, bin/motto.js, skills/setup-project/SKILL.md — all read in full (all ≤ 284 lines, single-pass reads).
**Files scanned:** 5
**Pattern extraction date:** 2026-07-02
