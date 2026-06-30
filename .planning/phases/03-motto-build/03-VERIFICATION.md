---
phase: 03-motto-build
verified: 2026-06-30T12:00:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
---

# Phase 03: motto build — Verification Report

**Phase Goal:** Developers can run `motto build` to produce self-contained, distributable Claude Code plugin folders ready for installation.
**Verified:** 2026-06-30
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `motto build` on a lint-passing public project exits 0, prints `✓ built <outDir> — N skills, M plugin(s)`, and places each skill verbatim at `dist/public/<name>/SKILL.md` — skills are siblings of `.claude-plugin/`, never nested inside it | ✓ VERIFIED | Empirical: exit 0, stdout matches pattern, SKILL.md byte-identical, `stat(dist/public/my-skill)` and `stat(dist/public/.claude-plugin)` both succeed, `stat(dist/public/.claude-plugin/my-skill)` → ENOENT. Tests SC1.1–SC1.7 all PASS. |
| 2 | A relative symlink inside a skill survives in dist/ as the SAME relative symlink — not dereferenced, not rewritten to an absolute path (`verbatimSymlinks:true`) | ✓ VERIFIED | Empirical: `lstat(dist/public/my-skill/alias.md).isSymbolicLink() === true` and `readlink(...) === 'SKILL.md'` (not an absolute path). Tests SYM.1–SYM.4 all PASS. Also confirmed in private bucket (Task 3 test). `fs.cp` with `verbatimSymlinks:true` is the wired implementation at `src/build.js:164–167`. |
| 3 | Each declared `shared_reference` is copied to `dist/<audience>/<name>/references/<ref>.md`, making each output skill folder self-contained | ✓ VERIFIED | Empirical: `guide.md` copied byte-identically to `dist/public/my-skill/references/guide.md`. Tests SC2.1–SC2.3 all PASS. `mkdir({recursive:true})` guard ensures `references/` exists even when skill has none locally (src/build.js:172–174). |
| 4 | Each emitted bucket has `dist/<audience>/.claude-plugin/plugin.json` containing exactly `{name, version, description}`; name is the per-bucket plugin name; version is always present | ✓ VERIFIED | Empirical: `Object.keys(manifest) === ["name","version","description"]` (exactly 3 keys, exact order). `manifest.name === 'my-project'` (from `plugins.public`), `manifest.version === '2.3.4'` (from `motto.yaml` `version`), `manifest.description` matches. Private bucket test also confirms `manifest.name === 'my-project-private'`. Tests SC3.1–SC3.7 all PASS. |
| 5 | The private bucket is emitted ONLY when ≥1 skill declares `audience:private` AND `plugins.private` is set; otherwise only `dist/public/` is written | ✓ VERIFIED | Empirical (4A): zero private skills → `stat(dist/private)` → ENOENT, `dist/public/` present. Empirical (4B): one public + one private skill with `plugins.private` set → both buckets present with correct per-bucket `plugin.json` names. Tests SC4A.1–SC4B.4 all PASS. |
| 6 | On a lint-failing project, `motto build` exits 1, prints identical lint diagnostics, and writes NOTHING to `dist/` — a prior good `dist/` survives untouched | ✓ VERIFIED | Empirical: exit 1, stdout contains `✗ bad-skill:` diagnostic, pre-existing `dist/public/sentinel.txt` with content `'prior-good-build'` unchanged after failed build. Tests SC5.1–SC5.4 all PASS. Wiring: lint gate returns before wipe at `src/build.js:93–95`. |
| 7 | A `shared_reference` colliding with a local `references/<ref>.md` is a build error (exit 1, nothing written); an `audience:private` skill while `plugins.private` is unset is a build error (exit 1, nothing written) | ✓ VERIFIED | Empirical (collision): exit 1, stdout contains `'collides'`, sentinel survives (COL.1–COL.3 PASS). Empirical (private-contradiction): exit 1, stdout contains `'plugins.private not set'`, sentinel survives (PRI.1–PRI.3 PASS). Both run pre-wipe (D3-02 order confirmed by sentinel survival). |

**Score:** 7/7 truths verified (0 behavior-unverified)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/build.js` | Exports `buildProject(projectRoot) → { ok, outDir, errors, skillCount, bucketCount }` | ✓ VERIFIED | 215-line substantive implementation. Exports `buildProject`. Full load-bearing order implemented: lint gate → load config+skills → pre-pack checks → wipe → pack → plugin.json → return. |
| `test/build.test.js` | `node:test` temp-dir fixtures covering BUILD-01..06 + CLI-02 | ✓ VERIFIED | 484-line file, 15 tests in 3 `describe` blocks matching Tasks 1/2/3. All 15 pass. Requirement tags present in test names. |
| `bin/motto.js` build branch | Build stub replaced with real `buildProject` call, mirrors lint branch | ✓ VERIFIED | Lines 59–73: dynamic import of `buildProject`, calls `buildProject(process.cwd())`, prints `✓ built ${outDir} — ${skillCount} skills, ${bucketCount} plugin(s)` on success, renders `✗ <skill>: <message>` per error on failure, sets `process.exitCode = 1` (never `process.exit(1)`). |
| `.gitignore` | Ignores generated `dist/` | ✓ VERIFIED | File exists at project root. Contains `dist/` on its own line. `node_modules/` also present. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/motto.js` build branch | `buildProject(process.cwd())` | dynamic `import('../src/build.js')`, line 61 | ✓ WIRED | Mirrors lint branch exactly. `cwd`-only (no `--path` flag). |
| `buildProject` | `lintProject(projectRoot)` gate | `import { lintProject } from './lint.js'` line 27; called at line 92; `!result.ok` returns early at line 93 | ✓ WIRED | Errors passed through verbatim (`result.errors`) before any `dist/` mutation. Sentinel-survival test confirms no wipe on failure. |
| `buildProject` | `loadConfig` (plugin names/version/description) | `import { loadConfig } from './config.js'` line 28; called at line 99 | ✓ WIRED | `config.plugins.public`, `config.plugins.private`, `config.version`, `config.description` all flow to `plugin.json` emission (Step 6). |
| `buildProject` | `parseFrontmatter` (audience + shared_references per skill) | `import { parseFrontmatter } from './frontmatter.js'` line 29; called in `loadSkillData` at line 66 | ✓ WIRED | Returns `audience` and `sharedRefs` for each skill, used for routing and bundling. |
| `fs.cp` | verbatim symlink preservation | `cp(src, dst, { recursive: true, verbatimSymlinks: true })` at lines 164–167 | ✓ WIRED | `verbatimSymlinks: true` is the critical flag. Empirically verified: relative symlink `alias.md -> SKILL.md` arrives as the same relative symlink in `dist/`, not an absolute path. |
| Load-bearing order | Wipe runs after ALL pre-pack checks | Pre-pack errors at lines 114–146 → `if (buildErrors.length > 0) return` at line 144 → wipe at line 150 | ✓ WIRED | Collision and private-contradiction checks both precede `rm(distDir, ...)`. Sentinel-survival assertions confirm no wipe on pre-pack error. |

---

### Data-Flow Trace (Level 4)

`buildProject` is a packager (not a rendering component) — it reads from disk and writes to disk. Data flows are traced inline:

| Source | Variable | Consumer | Produces Real Data | Status |
|--------|----------|----------|--------------------|--------|
| `motto.yaml` via `readFile` + `loadConfig` | `config.version`, `config.description`, `config.plugins.*` | `plugin.json` emission (Step 6) | Yes — reads real file, parses YAML | ✓ FLOWING |
| `skills/<name>/SKILL.md` via `readFile` + `parseFrontmatter` | `skill.audience`, `skill.sharedRefs` | routing + bundling | Yes — reads real source file | ✓ FLOWING |
| `fs.cp(skills/<name>, dist/<audience>/<name>, {verbatimSymlinks:true})` | verbatim skill tree | `dist/` output | Yes — real OS copy, no transform | ✓ FLOWING |
| `shared/references/<ref>.md` via `fs.cp` | shared ref file | `dist/<audience>/<name>/references/<ref>.md` | Yes — real file copy | ✓ FLOWING |

---

### Behavioral Spot-Checks

Empirical fixture invocations using `node bin/motto.js build` (real subprocess) and `buildProject` (direct import). All run against isolated `mkdtemp` fixtures; no server, no mutation, all cleaned up.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SC1: lint-passing build, exit 0, verbatim layout | `node bin/motto.js build` in fixture | exit 0; stdout `✓ built … — 1 skills, 1 plugin(s)` | PASS |
| SC2: shared_reference bundled | `buildProject(root)` with `guide` declared | `dist/public/my-skill/references/guide.md` byte-identical to source | PASS |
| SC3: plugin.json exact shape | `JSON.parse(plugin.json)` | Keys `["name","version","description"]`, values match `motto.yaml` | PASS |
| SC4A: no private skills → no dist/private/ | `buildProject(root)` public-only | `stat(dist/private)` → ENOENT | PASS |
| SC4B: private skill + plugins.private → dist/private/ | `buildProject(root)` mixed | `stat(dist/private/priv-skill/SKILL.md)` succeeds | PASS |
| SC5: lint-fail → exit 1, sentinel survives | `node bin/motto.js build` in invalid fixture | exit 1; `✗ bad-skill:` in stdout; sentinel.txt unchanged | PASS |
| CRITICAL: relative symlink preserved verbatim | `lstat` + `readlink(dist/.../alias.md)` | `isSymbolicLink()=true`, `readlink='SKILL.md'` (not absolute) | PASS |
| Collision → exit 1, sentinel survives | `buildProject` with collision fixture | exit 1; 'collides' in stdout; sentinel.txt unchanged | PASS |
| Private-contradiction → exit 1, sentinel survives | `buildProject` with contradiction fixture | exit 1; 'plugins.private not set' in stdout; sentinel.txt unchanged | PASS |

**38/38 spot-checks passed.**

---

### Probe Execution

No probes declared in PLAN or SUMMARY. Phase is a packager/CLI — behavioral spot-checks above serve as the functional probes.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUILD-01 | 03-01-PLAN.md | `motto build` runs lint first; on failure writes nothing and surfaces same lint diagnostics | ✓ SATISFIED | SC5 empirical test, Task 2 test suite (4 tests), lint gate in `src/build.js:92–95` |
| BUILD-02 | 03-01-PLAN.md | `dist/` wiped, each skill copied verbatim into `dist/<audience>/<name>/` (symlinks not dereferenced) | ✓ SATISFIED | SC1 + SYM empirical tests; `fs.cp({verbatimSymlinks:true})` at line 164; Task 1 test suite (7 tests) |
| BUILD-03 | 03-01-PLAN.md | Declared `shared_references` bundled into each skill's `references/` in dist | ✓ SATISFIED | SC2 empirical test; `mkdir(outRefsDir)` + `cp(shared/references/<ref>.md, ...)` at lines 171–180; Task 1 test |
| BUILD-04 | 03-01-PLAN.md | Each bucket gets `.claude-plugin/plugin.json` from `motto.yaml`, always including `version` | ✓ SATISFIED | SC3 empirical test; `writeFile(plugin.json, JSON.stringify({name, version, description}))` at lines 198–203; Task 1 + Task 3 tests |
| BUILD-05 | 03-01-PLAN.md | Private bucket/plugin emitted only when private skills exist and `plugins.private` is set | ✓ SATISFIED | SC4 empirical tests (4A and 4B); `if (audience === 'private') bucketsUsed.add('private')` at line 183; D3-11 guard via D3-12 pre-check; Task 3 tests |
| BUILD-06 | 03-01-PLAN.md | Skills are siblings of `.claude-plugin/` in dist (never nested inside it) | ✓ SATISFIED | SC1.7 empirical test; layout: `dist/<audience>/<name>/` alongside `dist/<audience>/.claude-plugin/`; Task 1 sibling test |
| CLI-02 | 03-01-PLAN.md | `motto build` builds the current project, reports the output dir, reuses lint diagnostics on failure | ✓ SATISFIED | `bin/motto.js` lines 59–73; empirical: exit 0 + `✓ built …` on success; exit 1 + `✗ <skill>:` on failure |

All 7 requirement IDs from the PLAN frontmatter are satisfied.

---

### Anti-Patterns Found

Scanned `src/build.js`, `bin/motto.js`, `test/build.test.js`, `.gitignore`.

| File | Pattern Checked | Finding |
|------|----------------|---------|
| `src/build.js` | TBD/FIXME/XXX markers | None |
| `src/build.js` | Placeholder/stub returns (`return null`, `return {}`, etc.) | None — all returns are substantive |
| `src/build.js` | Hardcoded empty data passed to renders | None — all I/O reads real files |
| `bin/motto.js` | "not yet implemented" stub in build branch | Replaced — real `buildProject` call at line 61 |
| `test/build.test.js` | Skipped or TODO tests | None — 15 tests, all exercised |
| `.gitignore` | Missing `dist/` entry | `dist/` present |

No anti-patterns found. No debt markers.

---

### Human Verification Required

None. All success criteria were verified empirically via real subprocess invocations and direct `buildProject` calls against isolated temp-dir fixtures. No visual UI, no external services, no real-time behavior involved.

---

## Summary

Phase 3 goal is **fully achieved**. `motto build` is a complete, production-quality implementation that:

- Uses `lintProject` as a hard gate before any `dist/` mutation
- Runs all pre-pack checks (collision D3-07, private-contradiction D3-12) before the wipe
- Copies each skill verbatim using `fs.cp({recursive:true, verbatimSymlinks:true})` — the critical flag that preserves relative symlinks without rewriting to absolute paths (empirically confirmed)
- Bundles declared `shared_references` into each skill's `references/` directory
- Emits per-bucket `plugin.json` with exactly `{name, version, description}` (three keys)
- Routes skills to `dist/public/` or `dist/private/` by audience; emits private bucket only when warranted
- Reports correct `✓ built <outDir> — N skills, M plugin(s)` summary on success

All 5 ROADMAP success criteria verified empirically. All 7 requirement IDs satisfied. Full 53-test suite green (15 new build tests + 38 existing Phase 1/2 tests). Zero regressions.

---

_Verified: 2026-06-30T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
