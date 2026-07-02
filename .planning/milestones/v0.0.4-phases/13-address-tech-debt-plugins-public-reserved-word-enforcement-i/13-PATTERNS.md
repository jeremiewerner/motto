# Phase 13: Address tech debt: plugins.public reserved-word enforcement + init/CLI review items - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 4 (all pre-existing, no new files created)
**Analogs found:** 4 / 4 (all in-file precedent — no cross-file analog needed; every fix mirrors an existing pattern in the same file it modifies)

## Summary

This phase is atypical for pattern mapping: RESEARCH.md's Code Examples section (Fixes 1-4) already specifies exact diffs. There are **no new files** and **no cross-cutting new pattern** to establish — each fix either corrects prose to match already-correct code, adds a stdlib option to an existing call, or extends an existing test pattern already present three lines away. The "analog" for each fix is the sibling code already in the same file. A fifth candidate item (process.exit in bin/motto.js) requires zero changes — confirmed via grep, no `process.exit(` call sites exist in `bin/motto.js` (all four exit paths already use `process.exitCode`, lines 248 and 274 explicitly comment "never process.exit(1)").

## File Classification

| Modified File | Role | Data Flow | Change Type | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `README.md` | config (docs) | — (prose only) | Correct 2 stale claims | Same file's own correct rows/sections | exact (in-file) |
| `src/schema.js` | utility (validator/constant) | — (comment only) | Correct stale JSDoc comment | Same file's own doc-comment style (lines 13-32) | exact (in-file) |
| `src/init.js` | utility (scaffolder helper) | file-I/O / child-process | Add `stdio` option to `execFileSync` | Same function's own try/catch shape; other `stdio`-aware calls in codebase (none found — first instance) | role-match (stdlib option, no cross-file analog needed) |
| `test/init.test.js` | test | file-I/O (fs assertions) | Strengthen assertion to check parent dir | `describe('scaffoldProject default name (INIT-01)', ...)` block, same file, lines 48-80 | exact (in-file) |
| `bin/motto.js` | route/CLI dispatch | request-response | **No change** — verify only | N/A (already fixed, Phase 11 WR-04) | n/a — closed |

## Pattern Assignments

### `README.md` (docs, prose-only)

**Fix A — `plugins.public`/`plugins.private` field table row, lines 83-84**

Current (incorrect — copy-paste generalization from SKILL.md `name` rule):
```markdown
| `plugins.public` | Yes | Letter-start kebab-case; must not contain `anthropic` or `claude` |
| `plugins.private` | When private skills exist | Same kebab-case rule |
```

Target (per RESEARCH.md Fix 1, cites `code.claude.com/docs/en/plugins-reference` plugin.json `name` field — kebab-case only, no reserved-word restriction):
```markdown
| `plugins.public` | Yes | Letter-start kebab-case (Claude Code plugin `name` requirement — no reserved-word restriction, unlike skill `name`) |
| `plugins.private` | When private skills exist | Same kebab-case rule |
```

**Pattern to follow:** Match the existing table's column style exactly — other rows in this same table (`name`, `version`, `description`, lines 80-82) use terse "Rule" column prose ending without a period. Keep the parenthetical citation short; do not add a footnote/source link inline (this repo's README has no citation-link convention elsewhere).

**Fix B — `/motto:release` reference, line 173**

Current:
```markdown
The `release` skill (`/motto:release`) carries the full maintainer checklist. The short version:
```

Per RESEARCH.md Pitfall 4, the verified-correct namespace (if a working local-load path exists) is `/motto-private:release` — `release` has `audience: private` in `skills/release/SKILL.md`, builds into the `motto-private` plugin bucket per `motto.yaml`'s `plugins.private: motto-private`. RESEARCH.md recommends option (b): drop the slash-command claim and reference by file path instead, UNLESS a `checkpoint:human-verify` confirms the maintainer has a working local-load mechanism (see Assumptions Log A1 in RESEARCH.md — no `.claude/skills/` symlink, no `motto-private` entry in `.claude-plugin/marketplace.json` found in this repo).

**Pattern to follow:** Check how `author-skill` (the correctly-namespaced sibling reference, `audience: public`) is written elsewhere in README.md and mirror its prose style if keeping a slash-command form; otherwise reference `skills/release/SKILL.md` by path, consistent with how this doc already references file paths elsewhere (e.g., `.claude-plugin/marketplace.json` in the same paragraph block at line 167).

---

### `src/schema.js` (utility, comment-only)

**Analog:** the file's own JSDoc conventions immediately above (lines 13-32), which use a `@type` tag and multi-line explanatory comment blocks with parenthetical decision-ID citations (e.g., `(D-08 fix ...)`, `(D-16)`).

**Current comment** (lines 35-38):
```javascript
/**
 * Reserved substrings that must not appear in skill or plugin names (LINT-02, D-09).
 * @type {string[]}
 */
const RESERVED = ["anthropic", "claude"];
```

**Target** (per RESEARCH.md Fix 2 — matches this file's existing multi-line-explanation + citation style used for `NAME_KEBAB` just above):
```javascript
/**
 * Reserved substrings that must not appear in SKILL.md `name` frontmatter
 * (LINT-02, D-09). Scope is skill names only — Claude Code's plugin.json
 * `name` field has no reserved-word restriction (verified against
 * code.claude.com/docs/en/plugins-reference, 2026-07-02); do not reuse
 * RESERVED for plugins.public/plugins.private.
 * @type {string[]}
 */
const RESERVED = ["anthropic", "claude"];
```

**Do not** import `RESERVED` into `src/config.js` or `src/init.js` — this is the explicit anti-pattern the phase must avoid (RESEARCH.md Pattern 1 / Anti-Patterns section).

---

### `src/init.js` (utility, file-I/O + child-process)

**Analog:** the function's own existing try/catch shape (lines 92-99) — the fix only adds an object property to an already-present options argument; no new control flow.

**Current** (lines 92-99):
```javascript
function resolveGitOwnerName() {
  try {
    const name = execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim();
    return name || 'Your Name';
  } catch {
    return 'Your Name';
  }
}
```

**Target** (per RESEARCH.md Fix 3 / Pitfall 2):
```javascript
function resolveGitOwnerName() {
  try {
    const name = execFileSync('git', ['config', 'user.name'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return name || 'Your Name';
  } catch {
    return 'Your Name';
  }
}
```

**Error handling pattern (unchanged, keep as-is):** the enclosing `try { ... } catch { return 'Your Name'; }` never-throw contract is already correct — this fix only prevents stderr leakage on the happy-and-error paths, it does not change the catch behavior.

---

### `test/init.test.js` (test, file-I/O assertions)

**Analog:** `describe('scaffoldProject default name (INIT-01)', ...)` block, same file, lines 48-80 — this is the exact `scratchDir`/`tempDir` nesting pattern RESEARCH.md's Fix 4 says to reuse rather than inventing a new shape.

**Imports already present** (lines 1-7, no changes needed — `mkdtemp`, `rm`, `readdir`, `mkdir`, `join`, `tmpdir` are all already imported):
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, writeFile, readdir, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
```

**Current adversarial-names block** (lines 107-139) nests `tempDir` directly under `tmpdir()` and only asserts `readdir(tempDir)` is empty — it never checks one level up:
```javascript
describe('scaffoldProject adversarial names (Pitfall 1 / T-10-01)', () => {
  const adversarialNames = ['evil:name', 'evil"name', '../evil', '0leading-digit'];

  for (const name of adversarialNames) {
    describe(`name "${name}"`, () => {
      let tempDir;
      let result;

      before(async () => {
        tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
        result = await scaffoldProject(tempDir, { name });
      });

      after(async () => {
        if (tempDir) await rm(tempDir, { recursive: true, force: true });
      });

      it('returns ok:false, reason:invalid-name', () => {
        assert.strictEqual(result.ok, false, `expected rejection for adversarial name "${name}"`);
        assert.strictEqual(result.reason, 'invalid-name');
      });

      it('writes nothing — target dir remains empty', async () => {
        const entries = await readdir(tempDir);
        assert.deepStrictEqual(entries, [], `expected no writes for adversarial name "${name}"`);
      });
    });
  }
});
```

**Target — restructure to nest `tempDir` under a `scratchDir`, mirroring the default-name suite's setup exactly** (per RESEARCH.md Fix 4, which is a direct copy of the existing default-name `before`/`after` pattern):
```javascript
// Existing analog to copy: default-name suite, lines 54-66 of this same file
before(async () => {
  scratchDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
  tempDir = join(scratchDir, 'target');
  await mkdir(tempDir);
  result = await scaffoldProject(tempDir, { name });
});

after(async () => {
  if (scratchDir) await rm(scratchDir, { recursive: true, force: true });
});

it('writes nothing anywhere — parent scratch dir contains only the empty target', async () => {
  const parentEntries = await readdir(scratchDir);
  assert.deepStrictEqual(parentEntries, ['target'], 'no writes may escape the target dir');
  const entries = await readdir(tempDir);
  assert.deepStrictEqual(entries, [], `expected no writes for adversarial name "${name}"`);
});
```

**Note:** the default-name suite's `before`/`after` (lines 54-66) is the literal source for `scratchDir`/`tempDir='target'`-under-scratch nesting — copy its shape verbatim, only substituting the adversarial `name` loop variable and merging the two `it` blocks' assertions into one as shown above (or keep them separate; RESEARCH.md's example merges them, either is acceptable since both `it`s share the same `before`).

---

### `bin/motto.js` — no change, verification only

**Confirmed via grep:** zero `process.exit(` call sites in current `bin/motto.js`. Existing pattern at lines 248 and 274 already documents the correct convention:
```javascript
process.exitCode = 1; // D2-11; process.exit(1) NOT used (Pitfall 7)
```
and
```javascript
process.exitCode = 1; // never process.exit(1) — preserves stdout flush (Pitfall 7)
```
This item (RESEARCH.md Pitfall 5 / candidate item 5) requires **no code change** — only closing the tracking-doc entry as already-resolved (fixed in Phase 11, commit `d35aba7`).

## Shared Patterns

### Never-throw / silent-fallback contract
**Source:** `src/init.js` house-style comment (top of file, lines 1-22) and `resolveGitOwnerName`'s existing `try { ... } catch { return 'Your Name'; }` shape (lines 92-99).
**Apply to:** The `stdio` fix must preserve this contract exactly — do not add new throw paths, do not change what the `catch` block returns.

### `process.exitCode` over `process.exit()`
**Source:** `bin/motto.js` lines 248, 274 (existing, already-correct convention — Pitfall 7 in this codebase's own vocabulary).
**Apply to:** No new code in this phase touches CLI dispatch, but any future exit-path code in `bin/motto.js` must follow this existing convention.

### Doc-comment citation style
**Source:** `src/schema.js` lines 13-32 (NAME_KEBAB's own JSDoc — multi-line prose + parenthetical decision-ID citations like `(D-08 fix ...)`, `(D-16)`, `(T-02-01)`).
**Apply to:** The `RESERVED` comment fix should match this citation-style precedent (decision IDs in parens) plus add the doc-source citation per RESEARCH.md's convention (`verified against code.claude.com/docs/en/plugins-reference, 2026-07-02`).

### Scratch-dir/target-dir nesting for path-escape tests
**Source:** `test/init.test.js` lines 48-80 (`scaffoldProject default name (INIT-01)` describe block).
**Apply to:** The adversarial-names describe block (lines 107-139) — this is the exact pattern to copy per RESEARCH.md Fix 4 and Pitfall 3.

## No Analog Found

None. Every file in this phase's scope is a mechanical edit to an existing file, and every fix has an in-file precedent to mirror (see Pattern Assignments above). No new files, no new modules, no cross-file pattern search was needed.

## Metadata

**Analog search scope:** `README.md`, `src/schema.js`, `src/init.js`, `test/init.test.js`, `bin/motto.js` (all read directly; no Glob/Grep search for external analogs was needed since RESEARCH.md's Code Examples section already specifies exact diffs and every fix's precedent lives in the same file).
**Files scanned:** 5 (4 modified + 1 verify-only)
**Pattern extraction date:** 2026-07-02
</content>
