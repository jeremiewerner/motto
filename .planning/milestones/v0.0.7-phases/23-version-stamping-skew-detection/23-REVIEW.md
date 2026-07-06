---
phase: 23-version-stamping-skew-detection
reviewed: 2026-07-06T06:45:26Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/version.js
  - src/config.js
  - src/init.js
  - src/lint.js
  - src/build.js
  - bin/motto.js
  - test/version.test.js
  - test/config.test.js
  - test/init.test.js
  - test/lint.test.js
  - test/build.test.js
  - test/cli.test.js
  - test/dogfood.test.js
findings:
  critical: 2
  warning: 2
  info: 4
  total: 8
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-07-06T06:45:26Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 23 (version stamping & skew detection) was reviewed across 6 source files and 7 test files. The phase-specific logic itself is solid: `parseVersion`/`checkSkew` are genuinely pure and never throw for any input shape (verified against the adversarial matrix), the malformed-mottoVersion exactly-once invariant holds on every non-race path (config.js reports the error; lint.js gates the skew check on `parseVersion` truthiness using the same predicate, so the two can never disagree), lint/build never write `motto.yaml` (both re-read only; VER-06 guard tests confirm), and the CLI warning rendering never flips exit codes.

However, adversarial probing of the phase's own stated attention area — "any input shape that could make buildProject throw" — found a **reproduced, deterministic never-throw boundary violation in `buildProject`** on a lint-clean tree (CR-01), plus a broader unguarded-I/O span in build's pack phase (CR-02). All 292 tests pass while the CLI crashes with a raw Node stack trace on the CR-01 fixture — the tests-green-but-broken pattern this project has now hit 6 times. Both throw paths predate phase 23's diff, but they sit in a reviewed file, in the exact invariant this phase was told to protect, and CR-01's trigger shape (a stray file named `references`) is the same one-touch user-error class the phase-15 CR-02 fix hardened lint against.

## Critical Issues

### CR-01: buildProject throws (CLI crash, raw stack trace) on a lint-clean tree — collision check rethrows ENOTDIR

**File:** `src/build.js:152` (also reachable shape at `src/build.js:145`)
**Issue:** The D3-07 collision check does `if (e.code !== 'ENOENT') throw e;`. When a skill directory contains a regular **file** named `references` and declares any `shared_references` entry, `stat(join(skillsDir, skill.name, 'references', ref + '.md'))` fails with `ENOTDIR` — which is rethrown out of `buildProject`. This is reachable with **zero races and a fully lint-passing tree**: lint never inspects the type of a skill's local `references` path (it only checks `shared/references/` at the project root), so the lint gate passes and build rejects.

Reproduced during review:

```
lint ok: true []
BUILD THREW: ENOTDIR ENOTDIR: not a directory, stat '.../skills/my-skill/references/guide.md'
```

Through `bin/motto.js` this surfaces as an unhandled rejection: empty stdout, raw `node:internal/fs/promises` stack trace on stderr, no `✗` diagnostic. This is exactly the ENOTDIR one-touch user-error class the phase-15 CR-02 fix hardened `loadSharedRefs`/`discoverSkillNames` in lint.js against — build.js's copies were never hardened. It violates the D-01 never-throw boundary that the phase context explicitly flagged for attention.

**Fix:** Convert the rethrow into a collected error entry (collect-don't-throw, same pattern the surrounding code already uses):
```js
      } catch (e) {
        if (e.code !== 'ENOENT') {
          buildErrors.push({
            skill: skill.name,
            message: `could not check references/${ref}.md for collision: ${e.message}`,
          });
        }
        // ENOENT = no collision — continue
      }
```
Add a regression test mirroring the phase-15 lint fixtures: skill with a regular file named `references` + a declared shared ref → `buildProject` resolves `ok:false` with a diagnostic, never rejects.

### CR-02: buildProject has no never-throw boundary for its pack phase — fs failures after the dist/ wipe crash the CLI and leave a partial dist/

**File:** `src/build.js:56, 73, 114, 131, 182-235`
**Issue:** Every I/O operation in STEP 2 through STEP 6 is unwrapped:
- `discoverSkillNames` rethrows non-ENOENT readdir errors (line 56 — build.js's copy, unlike lint.js's hardened version which returns an `{error}` sentinel);
- `loadSkillData`'s `readFile` (line 73) and the STEP 2 `readFile` of motto.yaml (line 114) can reject;
- STEP 4-6's `rm`/`cp`/`mkdir`/`writeFile` (lines 182-235) reject on `EACCES`/`EPERM`/`EROFS` (read-only checkout, root-owned `dist/`) or `ENOSPC` (disk full mid-copy).

Any of these rejects out of `buildProject`, and `bin/motto.js:403` awaits it with no catch — unhandled rejection, raw stack trace, exit via crash rather than `process.exitCode`. Worst case: `rm(distDir)` succeeds, then a `cp` fails mid-pack (ENOSPC, permission on one file) — the previous good `dist/` is **already destroyed** and a partial, silently-inconsistent `dist/` is left behind with no `{skill, message}` diagnostic. That combines a boundary-contract violation with a data-loss-shaped outcome the D3-02/D3-03 ordering was specifically designed to prevent.

**Fix:** Wrap STEPS 2-6 in a backstop try/catch that returns the contract shape (mirroring lint.js's D2-06 backstop), and align build's `discoverSkillNames` with lint.js's sentinel version:
```js
  try {
    // STEPS 2..6 as today
  } catch (e) {
    return {
      ok: false,
      outDir: null,
      errors: [{ skill: '(project)', message: `build failed: ${e.message}` }],
      skillCount: 0,
      bucketCount: 0,
      warnings,
    };
  }
```
Add adversarial tests (e.g., chmod-based or file-blocking fixtures like init.test.js's WR-01 suite) asserting `buildProject` resolves, never rejects.

## Warnings

### WR-01: init stamps an unvalidated own-version — a garbage/empty package.json version scaffolds a project that fails its own lint

**File:** `src/init.js:157-158`
**Issue:** The stamp gate is `typeof toolVersion === 'string'`, but `getOwnVersion()` returns `pkg.version` for **any** string, including `""` or `"not-a-version"`. If Motto's own package.json version is empty/garbage (dev checkout, botched release edit), init writes `mottoVersion: ""` — which `loadConfig` then rejects (`mottoVersion must be a version string…`), so a freshly scaffolded project immediately fails `motto lint`. The whole point of the null-collapse contract in `getOwnVersion` is graceful degradation ("omit the line entirely"), but the gate checks the wrong predicate. Secondarily, the value is interpolated into a double-quoted YAML scalar without escaping — a `"` in the version string would corrupt the generated motto.yaml.

**Fix:** Gate on the same predicate config.js will later enforce — single source of truth:
```js
const toolVersion = getOwnVersion();
const mottoVersionLine = parseVersion(toolVersion) ? `mottoVersion: "${toolVersion}"\n` : '';
```
(`parseVersion` is already exported from `./version.js` and returns null for `""`, non-strings, and garbage; it also can't be truthy for a string that breaks the quoted-scalar form in practice, and it guarantees the stamp init writes always passes the lint that will read it.)

### WR-02: Unanchored VERSION_RE at the validation site accepts arbitrary trailing content as a "valid" mottoVersion and echoes it verbatim to the terminal

**File:** `src/version.js:45` (validation call site `src/config.js:135`; echo sites `src/version.js:101,106` → `bin/motto.js:225`)
**Issue:** `VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)/` is deliberately not end-anchored to tolerate prerelease suffixes (documented, Pitfall 5). But because `loadConfig` uses the same predicate for **validation**, the intentional narrowing over-delivers: `mottoVersion: "1.2.3 completely bogus trailing text"` and `mottoVersion: "1.2.3[31m…"` are accepted as valid config with zero errors, and `checkSkew` interpolates the **raw** string — trailing garbage, ANSI escape sequences and all — into the ⚠ warning written to the user's terminal. The V5 note in the file says "the raw string is never used beyond comparison/display," but unvalidated display of a value the linter just certified as clean is precisely the gap: unlike skill-file content echoed in error messages, this string carries the linter's stamp of validity.

**Fix:** Keep `parseVersion` permissive for skew comparison, but tighten the validation-site check in config.js to require the remainder be empty or a legitimate suffix:
```js
const VERSION_STAMP_RE = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]*)?$/;
// config.js: } else if (!VERSION_STAMP_RE.test(config.mottoVersion.trim())) { …error… }
```
Alternatively (smaller change), have `checkSkew` render the parsed `major.minor.patch` instead of the raw string. Either closes the echo path; the first also stops certifying junk stamps as valid.

## Info

### IN-01: getOwnVersion memoization test is vacuous — it cannot fail

**File:** `test/version.test.js:144-146`
**Issue:** `assert.equal(getOwnVersion(), getOwnVersion())` passes whether or not memoization exists (two fresh reads of the same package.json produce equal strings). The test asserts nothing about the `cached` path; deleting the memoization would not fail it.
**Fix:** Either drop the test or make it meaningful, e.g. spawn-free approach: temporarily monkey-patching is not possible with `readFileSync` imported directly, so the honest options are deleting the misleading test name or asserting via a documented note that memoization is unobservable from outside. Prefer renaming to "repeated calls return equal values" to stop overclaiming.

### IN-02: lint.js re-reads and re-parses motto.yaml, opening a small TOCTOU window against the exactly-once invariant

**File:** `src/lint.js:343-349`
**Issue:** The skew check re-reads motto.yaml after `processConfig` already read and parsed it. If the file changes between the two reads (editor save mid-lint), the skew check evaluates a different config than the one that was validated — in the pathological interleaving (first read malformed → error; second read well-formed → skew warning) the malformed-once guarantee is technically expressed against two different file states. The re-read is an explicitly sanctioned pattern (Option A, mirrors build.js) and the race is contrived, so this is informational — but widening `processConfig` to return `{config}` would delete both the duplicate I/O and the window.
**Fix:** Have `processConfig` return the parsed `config` (it already holds it) and drop the second `readFile`/`loadConfig`.

### IN-03: dogfood test comment contradicts its own assertion (count:2 vs count=3)

**File:** `test/dogfood.test.js:126-128` (vs assertion at line 42)
**Issue:** The TMPL-01/03 comment says "ok:true/count:2/errors:[] already proves the real tree" while the DOG-03 assertion above requires `result.count === 3`. Stale doc drift from when the repo had 2 skills.
**Fix:** Update the comment to `count:3` or drop the number from the comment entirely so it can't drift again.

### IN-04: config.js required-field checks use falsy tests — present-but-falsy values are misreported as "missing"

**File:** `src/config.js:86-94`
**Issue:** `if (!config.name)` etc. means `name: 0`, `version: 0`, or `description: false` in motto.yaml report "missing name/version/description" although the key is present (wrong-type would be the accurate diagnosis). Validation still correctly fails, so this is message precision only. Pre-existing (not phase 23); noted because the new `mottoVersion` block directly above it demonstrates the correct pattern (`!== undefined` + type check + `describeType`).
**Fix:** Mirror the mottoVersion block's shape for the three required fields when this file is next touched.

---

_Reviewed: 2026-07-06T06:45:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
