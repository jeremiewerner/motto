# Phase 19: CLI Ergonomics & Build-Skill Verification - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 3 (1 modified code file, 1 modified test file, 1 new doc artifact)
**Analogs found:** 3 / 3 (all modifications are self-analogous — the file being edited is its own best pattern source; no external analog needed)

This phase has no genuinely new source files — it is a targeted, line-level rewrite of one existing file (`bin/motto.js`), an additive extension of one existing test file (`test/cli.test.js`), and one brand-new documentation artifact (`19-BSKV-FINDINGS.md`) with no in-repo precedent. Because RESEARCH.md already located every exact call site and line range in the real current source, this pattern map cites those same call sites directly rather than searching for a separate analog file — `bin/motto.js`'s own existing branches ARE the pattern for its own new branches (same file, structurally-identical sibling blocks).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bin/motto.js` (modified) | controller / CLI presentation layer | request-response (argv in, stdout/stderr+exitCode out) | itself — existing lint/build/init dispatch blocks (lines 196-284) | exact (self-analog; two structurally identical call sites already exist for lint vs. build) |
| `test/cli.test.js` (modified) | test | request-response (spawn CLI, assert stdout/stderr/exit) | itself — existing `describe('CLI help ...')` blocks (lines 28-180) using `runCli()` helper | exact (self-analog; same spawnSync harness, same assertion style) |
| `.planning/phases/19-cli-ergonomics-build-skill-verification/19-BSKV-FINDINGS.md` (new) | documentation artifact | write-once record (human-authored during checkpoint) | none in repo (confirmed no prior findings-file precedent) — schema fully specified in RESEARCH.md instead | no analog — use RESEARCH.md's prescribed schema verbatim |

## Pattern Assignments

### `bin/motto.js` (controller, request-response) — 4 sub-changes

**Analog:** itself (current file, read in full this session and during RESEARCH.md)

#### 1. New parseArgs options (`--quiet`, `--format`)

**Current extension point** (lines 135-146):
```javascript
function parseCliArgs() {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      options: {
        force: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
```
Pattern: add `quiet: { type: 'boolean' }` and `format: { type: 'string' }` as two more entries in the same `options` object — no new parsing mechanism, `strict: true` already rejects unknown flag *names* for free.

#### 2. Format-value validation (new, mirrors D-04/D-05 unknown-flag shape)

**Analog block to mirror** (lines 153-165, the parseArgs catch):
```javascript
    const match = /(?:Unknown option |unrecognized option )['"]?(-{1,2}[^'"\s]+)/.exec(
      err && err.message,
    );
    if (match) {
      process.stderr.write(`✗ unknown option '${match[1]}'\n`);
    } else {
      process.stderr.write(`✗ ${err && err.message ? err.message : 'invalid arguments'}\n`);
    }
    process.stderr.write(`${USAGE_LINE}\n`);
    process.stderr.write(`${UNKNOWN_HINT}\n`);
    process.exitCode = 1;
    return null;
```
And the unknown-subcommand block at the bottom (lines 278-284) — same three-line stderr shape:
```javascript
  process.stderr.write(`✗ unknown command '${sub}'\n`);
  process.stderr.write(`${USAGE_LINE}\n`);
  process.stderr.write(`${UNKNOWN_HINT}\n`);
  process.exitCode = 1;
```
Pattern for the new `--format` value guard: same three-line stderr shape (`✗ unknown format '<val>'` + `USAGE_LINE` + `UNKNOWN_HINT`), inserted synchronously right after `parseCliArgs()` succeeds and before the `checkTargetDir()` await (Pitfall 3 — validate cheap/local checks before I/O).

#### 3. Lint dispatch — stdout/stderr split + quiet + format (CLIX-01/02/03 core change)

**Current code, exact call site** (lines 241-249):
```javascript
      const result = await lintProject(root);
      if (result.ok) {
        process.stdout.write(`✓ ${result.count} skills OK\n`);
      } else {
        for (const e of result.errors) {
          process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
        }
        process.exitCode = 1; // D2-11; process.exit(1) NOT used (Pitfall 7)
      }
```
New pattern (per RESEARCH.md's `renderResult` recommendation — Claude's Discretion on exact plumbing, but the shape is locked by D-01/D-05/D-06/D-08/D-09):
```javascript
      const result = await lintProject(root);
      if (parsed.values.format === 'json') {
        process.stdout.write(JSON.stringify(result) + '\n'); // D-01, D-02, D-08 — always prints
      } else if (result.ok) {
        if (!parsed.values.quiet) {
          process.stdout.write(`✓ ${result.count} skills OK\n`);
        }
      } else {
        for (const e of result.errors) {
          process.stderr.write(`✗ ${e.skill}: ${e.message}\n`); // moved to stderr — D-05
        }
      }
      if (!result.ok) process.exitCode = 1; // unchanged — never process.exit() (Pitfall 7)
```

#### 4. Build dispatch — structurally identical to lint (lines 262-275)

**Current code:**
```javascript
      const result = await buildProject(root);
      if (result.ok) {
        process.stdout.write(
          `✓ built ${result.outDir} — ${result.skillCount} skills, ${result.bucketCount} plugin(s)\n`,
        );
      } else {
        for (const e of result.errors) {
          process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
        }
        process.exitCode = 1; // never process.exit(1) — preserves stdout flush (Pitfall 7)
      }
```
Same transformation as lint (item 3) — swap the success-line text only, everything else (json branch, quiet guard, stderr move) is identical. This structural duplication is exactly why RESEARCH.md recommends factoring both into one shared `renderResult(result, { format, quiet, successLine })` helper — Claude's Discretion on whether to extract it or keep the two blocks parallel-but-separate.

#### 5. Init's `✗` lines — mechanical stderr move only, no format/quiet (D-07)

**Current code, three call sites** (lines 212-227):
```javascript
    } else if (result.reason === 'invalid-name') {
      process.stdout.write(`✗ ${result.errors[0].message}\n`);
      process.stdout.write(`  try: motto init ${result.suggestion}\n`);
      process.exitCode = 1;
    } else if (result.reason === 'not-empty') {
      const CAP = 5;
      const shown = result.offending.slice(0, CAP);
      const rest = result.offending.length - shown.length;
      const list = shown.join(', ') + (rest > 0 ? `, and ${rest} more` : '');
      process.stdout.write(`✗ directory is not empty (${list})\n`);
      process.stdout.write('  use --force to scaffold anyway\n');
      process.exitCode = 1;
    } else {
      for (const e of result.errors) {
        process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
      }
      process.exitCode = 1;
    }
```
Pattern: change every `process.stdout.write` in this block whose string starts with `✗` (or is the immediately-following continuation line, e.g. `try:`/`use --force`) to `process.stderr.write`. The `✓ scaffolded project:` success block (lines 206-211) and the `parseArgs`/help routing for init stay untouched — init does NOT get `--format`/`--quiet` (D-03/D-11), so no `parsed.values.format`/`quiet` reads belong in this branch at all.

---

### `test/cli.test.js` (test, request-response)

**Analog:** itself — existing `describe`/`it` blocks and the `runCli()` helper (lines 1-40+, full file already follows this shape throughout)

**Reusable harness** (lines 21-26, copy verbatim, no changes needed):
```javascript
function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd,
  });
}
```

**Test pattern to replicate** (structure demonstrated at lines 28-40, one `describe` block per concern, one `it` per case):
```javascript
describe('CLI help (CLIX-03, D-01..D-05, D-08, D-09)', () => {
  it('--help: status 0, stdout has usage + all 3 command names, stderr empty', () => {
    const r = runCli(['--help']);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto/);
    assert.strictEqual(r.stderr, '');
  });
```
New `describe` blocks to add, following this exact shape:
- `describe('--quiet (CLIX-01)')` — success+quiet → `assert.strictEqual(r.stdout, '')`, `assert.strictEqual(r.status, 0)`; failure+quiet → stderr still has `✗ …` lines, exit 1 (Pitfall 2 regression guard).
- `describe('--format json (CLIX-02)')` — success → `JSON.parse(r.stdout)` matches `{ok:true, count}` shape; failure → `JSON.parse(r.stdout).ok === false` and `.errors` populated; assert stdout is exactly one line (`r.stdout.trim().split('\n').length === 1`).
- `describe('--format <bad value> (D-10)')` — mirrors the existing unknown-flag test shape (search `UNKNOWN_HINT`/`USAGE_LINE` assertions already used elsewhere in the file for the D-04/D-05 pattern) — `✗ unknown format '<val>'` on stderr, exit 1, empty stdout.
- `describe('stdout/stderr split (CLIX-03)')` — on a failing lint/build target (reuse whatever fixture-project pattern the file already uses — check `mkdtemp`/`scaffoldProject` usage at lines 4-9), assert zero `✗` characters ever appear in `r.stdout` and only in `r.stderr`.
- `describe('init stderr split (D-07)')` — reuse an existing init-failure fixture case if one exists in the file already; otherwise same shape, asserting `✗` moved to stderr while the scaffold tree / `✓` success stays on stdout.

---

### `.planning/phases/19-cli-ergonomics-build-skill-verification/19-BSKV-FINDINGS.md` (documentation artifact)

**No analog** — first file of its kind in this repo (confirmed by search; RESEARCH.md independently confirms "No existing findings-file precedent exists in this repo").

**Use RESEARCH.md's prescribed schema verbatim** (from RESEARCH.md lines 239-263):
```markdown
# Phase 19: build-skill Live Verification Findings (BSKV-01)

**Run date:** <date>
**Staged input used:** <brief pasted or summarized; link to the actual freeform text given to /build-skill>
**Skill produced:** skills/<name>/ (shipped: yes/no — lint status)

## Target 1 — BSKL-01 gap-fill fidelity
**Expected:** exactly one batched gap-fill message for the genuinely-missing slot(s); no gap-fill round if input already covered everything.
**Observed:** <what actually happened>
**Verdict:** conforms | fixed inline (commit/diff) | ticketed (link/description)

## Target 2 — BSKL-05 quality gate on real hollow output
**Expected:** Step 7's six checks catch the staged hollow section; self-rewrite fires; re-lint runs on a fresh 3-attempt budget per the "at most one quality-gate rewrite cycle total" rule.
**Observed:** <what actually happened>
**Verdict:** conforms | fixed inline | ticketed

## Target 3 — WR-01 name-recovery
**Expected:** invalid working name is rejected — either at Step 5.1 (pre-write guard) or, if it slips through, at Step 6 (lint rejects the name → delete-and-recreate → Step 5 retry with a corrected name).
**Observed:** <which path fired, and whether recovery completed cleanly>
**Verdict:** conforms | fixed inline | ticketed

## Divergences deferred to STATE.md pending todos
<list, or "none">
```
Written by the human operator during the D-15 `checkpoint:human-verify` task — not code-generated. Plan's checkpoint task must reference this exact schema so the file structure is not improvised at execution time.

## Shared Patterns

### Never-throw core boundary (do not touch)
**Source:** `src/lint.js` (`lintProject`), `src/build.js` (`buildProject`)
**Apply to:** All `bin/motto.js` changes
Both functions already return fully-structured result objects (`{ok, errors[], count}` / `{ok, outDir, errors[], skillCount, bucketCount}`) and take a single `projectRoot` string argument — no options object. This phase must NOT add a second parameter to either function (Anti-Pattern flagged in both RESEARCH.md and milestone ARCHITECTURE.md). All format/quiet logic stays entirely inside `bin/motto.js`.

### Exit code discipline
**Source:** `bin/motto.js` (existing, every dispatch branch)
**Apply to:** All modified branches
`process.exitCode = 1`, never `process.exit()` — already the convention throughout the file (see inline comments at lines 26-30, 248, 274). Preserve this exactly in every new/modified branch — do not introduce a `process.exit()` call anywhere.

### stderr error-line shape (`✗ <context>: <message>`)
**Source:** `bin/motto.js` lines 153-165, 225-227, 245-247, 271-273, 280-284
**Apply to:** lint, build, init `✗` lines (all migrating to stderr this phase) and the new `--format` value-guard error
All error lines share one shape: `✗ ` prefix, optional `<context>: ` (skill name or nothing), message, trailing `\n`. The new unknown-format error must reuse this shape plus the existing `USAGE_LINE`/`UNKNOWN_HINT` two-line follow-up (D-10) — do not invent a new error format.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.planning/phases/19-cli-ergonomics-build-skill-verification/19-BSKV-FINDINGS.md` | documentation artifact | write-once record | First findings-file in repo history; RESEARCH.md's prescribed schema (reproduced above) is the pattern source instead of a codebase analog |

## Metadata

**Analog search scope:** `bin/motto.js` (full file, self-analog), `test/cli.test.js` (full file, self-analog), `src/lint.js`/`src/build.js` (read for return-shape confirmation only, not modified), repo-wide search for prior findings/`*-FINDINGS.md` files (none found)
**Files scanned:** 4 source files + repo-wide glob for findings-file precedent
**Pattern extraction date:** 2026-07-03
