/**
 * Motto lint orchestrator.
 *
 * Exports a single async function `lintProject(projectRoot)` that wires the
 * Phase 1 pure validators (parseFrontmatter, validateSkill, loadConfig) to the
 * filesystem: it discovers skills and shared references on disk, reads each
 * SKILL.md, runs the pure validators, and aggregates all errors across all
 * skills before returning.
 *
 * Per D-01 / D2-06: lintProject NEVER throws at its boundary. Every I/O or
 * parse error is converted to a `{ skill, message }` entry and the scan
 * continues to all remaining skills.
 *
 * Return shape: { ok: boolean, errors: Array<{ skill: string, message: string }>, count: number, warnings: Array<{ skill: string, message: string }> }
 *   ok       — true when errors is empty.
 *   errors   — aggregated error list; config errors (labelled 'motto.yaml') always
 *              precede skill errors; skill errors are in alphabetical-by-dirName order.
 *   count    — number of skills discovered (0 when none found).
 *   warnings — additive, non-blocking advisories (VER-02); currently populated
 *              only by a mottoVersion/tool skew check (VER-03), gated on the
 *              stamp being present AND well-formed so a malformed mottoVersion
 *              (already reported in errors[] by config.js) is never
 *              double-reported here (D-R1). Always present, defaults to [].
 *
 * Internal helpers (not exported): processConfig, loadSharedRefs,
 * discoverSkillNames, loadSkillAudiences, checkOutputsFs, processSkill — per
 * RESEARCH Module Decomposition Recommendation.
 */

import { readFile, readdir, stat, realpath } from 'node:fs/promises';
import { join, basename, extname, resolve, relative, isAbsolute } from 'node:path';

import { parseFrontmatter } from './frontmatter.js';
import { validateSkill, isOutputPathLexicallySafe } from './schema.js';
import { loadConfig } from './config.js';
import { checkSkew, getOwnVersion, parseVersion } from './version.js';

// ---------------------------------------------------------------------------
// processConfig — step 1 of lintProject (D2-09, D2-10)
// ---------------------------------------------------------------------------

/**
 * Read and validate motto.yaml. Any error is pushed to the shared `errors`
 * array under the `'motto.yaml'` label (D2-10). Never throws; always returns.
 *
 * @param {string} projectRoot
 * @param {Array<{skill: string, message: string}>} errors - mutated in place
 */
async function processConfig(projectRoot, errors) {
  const configPath = join(projectRoot, 'motto.yaml');
  let text;
  try {
    text = await readFile(configPath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      errors.push({ skill: 'motto.yaml', message: 'file not found' });
    } else {
      errors.push({ skill: 'motto.yaml', message: `could not read: ${e.message}` });
    }
    return; // config errors collected; skill scan still runs (D2-10)
  }
  const { errors: configErrors } = loadConfig(text);
  for (const e of configErrors) {
    // Lift: loadConfig errors have no skill field (Pitfall 3); add 'motto.yaml' label
    errors.push({ skill: 'motto.yaml', message: e.message });
  }
}

// ---------------------------------------------------------------------------
// loadSharedRefs — step 2 of lintProject (D2-07, D2-08)
// ---------------------------------------------------------------------------

/**
 * Scan shared/references/*.md and return a Set of basenames (without .md).
 * A missing shared/ or shared/references/ directory is NOT an error — returns
 * an empty Set (D2-08). Any OTHER I/O error (e.g. ENOTDR when shared/references
 * is a file — phase-15 review CR-02) is converted to a '(project)'-labelled
 * error entry and an empty Set is returned; NEVER rethrown, upholding the
 * lintProject never-throw boundary (D-01 / D2-06).
 *
 * @param {string} projectRoot
 * @param {Array<{skill: string, message: string}>} errors - mutated in place
 * @returns {Promise<Set<string>>}
 */
async function loadSharedRefs(projectRoot, errors) {
  const refsDir = join(projectRoot, 'shared', 'references');
  try {
    const entries = await readdir(refsDir, { withFileTypes: true });
    return new Set(
      entries
        .filter((e) => e.isFile() && extname(e.name) === '.md')
        .map((e) => basename(e.name, '.md')),
    );
  } catch (e) {
    if (e.code !== 'ENOENT') {
      // ENOENT is fine (D2-08: absence is not an error); anything else —
      // ENOTDIR, EACCES, … — must surface as a diagnostic, not a rejection.
      errors.push({
        skill: '(project)',
        message: `could not read shared/references/: ${e.message}`,
      });
    }
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// discoverSkillNames — step 3 of lintProject (D2-02, D2-03, D2-04)
// ---------------------------------------------------------------------------

/**
 * Discover candidate skill directories under `skillsDir` (one level deep).
 *
 * Filters: non-hidden directories only (D2-04).
 * Sort: localeCompare for deterministic alphabetical order (D2-03, Pitfall 1).
 *
 * Returns `null`          when skillsDir is missing (ENOENT) — caller maps to "no skills found".
 * Returns `[]`            when skillsDir exists but contains no candidates — same treatment.
 * Returns `{ error: msg }` for any OTHER I/O error (e.g. ENOTDIR when `skills`
 * is a file — phase-15 review CR-02) — caller pushes it as a '(project)'-
 * labelled error entry. NEVER throws, upholding the lintProject never-throw
 * boundary (D-01 / D2-06).
 *
 * @param {string} skillsDir - absolute path to the skills/ directory
 * @returns {Promise<string[]|null|{error: string}>}
 */
async function discoverSkillNames(skillsDir) {
  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return null; // caller converts to "no skills found"
    return { error: `could not read skills/: ${e.message}` }; // caller pushes '(project)' entry
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.')) // D2-04
    .sort((a, b) => a.name.localeCompare(b.name)) // D2-03 — MANDATORY (Pitfall 1)
    .map((e) => e.name);
}

// ---------------------------------------------------------------------------
// loadSkillAudiences — cross-skill pre-pass (VAL-02/VAL-03 context)
// ---------------------------------------------------------------------------

/**
 * Re-read every discovered skill's SKILL.md frontmatter to build a
 * `Map<dirName, audience>` for the `dependencies:` bare-resolution (VAL-02)
 * and audience-direction guard (VAL-03) in `validateSkill`.
 *
 * Modeled on `loadSharedRefs`'s tolerant-of-absence shape (D2-08), but MUST
 * swallow ALL per-file read/parse failures silently — never pushes to any
 * errors array. A skill absent from the map simply means the audience guard
 * does not fire for it; that skill's own `processSkill` pass independently
 * reports its real error (Pitfall 3 — no double-reporting).
 *
 * @param {string} skillsDir - absolute path to the skills/ directory
 * @param {string[]} skillNames - discovered skill dirNames
 * @returns {Promise<Map<string,string>>}
 */
async function loadSkillAudiences(skillsDir, skillNames) {
  const audienceMap = new Map();
  for (const dirName of skillNames) {
    try {
      const text = await readFile(join(skillsDir, dirName, 'SKILL.md'), 'utf8');
      const { data } = parseFrontmatter(text); // never throws (D-01)
      const audience = data && typeof data.audience === 'string' ? data.audience : undefined;
      if (audience) audienceMap.set(dirName, audience);
      // No entry when unreadable/missing/invalid — the audience-direction
      // guard simply does not fire for that dependency target.
    } catch {
      // Unreadable file — skip silently, never throw (D-01); processSkill
      // will report the read error when it processes this skill directly.
    }
  }
  return audienceMap;
}

// ---------------------------------------------------------------------------
// checkOutputsFs — fs-dependent half of VAL-01 (existence + symlink-escape)
// ---------------------------------------------------------------------------

/**
 * Check the fs-dependent half of `outputs:` validation: file existence
 * (the target must exist AND be a regular file — phase-15 review WR-02) and
 * symlink-escape containment. Reuses `isOutputPathLexicallySafe` (exported
 * from `./schema.js`) to gate which entries are even eligible for an fs
 * check — lexically-unsafe entries were already reported by `validateSkill`
 * and must not be double-reported here (Pitfall 3).
 *
 * Never throws: `data.outputs` shape errors were already reported by
 * `validateSkill`, so a non-object/null/array value is a silent no-op here.
 * Per-entry stat/realpath failures are converted to error entries, not
 * exceptions.
 *
 * @param {string} skillsDir - absolute path to the skills/ directory
 * @param {string} dirName - the skill's source folder name
 * @param {object} data - parsed YAML frontmatter object
 * @param {Array<{skill: string, message: string}>} errors - mutated in place
 */
async function checkOutputsFs(skillsDir, dirName, data, errors) {
  const outputs = data && typeof data === 'object' ? data.outputs : undefined;
  if (outputs === null || typeof outputs !== 'object' || Array.isArray(outputs)) {
    return; // schema.js already reported the shape error — no duplicate
  }
  const skillDirAbs = resolve(skillsDir, dirName);
  for (const [key, value] of Object.entries(outputs)) {
    // Root-independent predicate (CR-01): same verdict here as in
    // validateSkill by construction, so "already reported" is guaranteed.
    if (!isOutputPathLexicallySafe(value)) continue; // schema.js already reported it
    const targetAbs = resolve(skillDirAbs, value);
    let stats;
    try {
      stats = await stat(targetAbs);
    } catch {
      errors.push({ skill: dirName, message: `outputs.${key} file "${value}" does not exist` });
      continue;
    }
    if (!stats.isFile()) {
      // Phase-15 review WR-02: `outputs:` entries must name FILES. stat()
      // follows symlinks, so a symlink to a regular file still passes here
      // (and the symlink-escape check below still runs for it); directories
      // — including "." (the skill directory itself) — are spec violations.
      errors.push({ skill: dirName, message: `outputs.${key} "${value}" is not a file` });
      continue;
    }
    // Symlink-escape check: resolve REAL filesystem paths, re-verify
    // containment via path.relative (Assumption A1 — confirmed empirically
    // by the adversarial symlink fixture in test/lint.test.js).
    try {
      const [realRoot, realTarget] = await Promise.all([
        realpath(skillDirAbs),
        realpath(targetAbs),
      ]);
      const rel = relative(realRoot, realTarget);
      const contained = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
      if (!contained) {
        errors.push({
          skill: dirName,
          message: `outputs.${key} file "${value}" escapes the skill directory via symlink`,
        });
      }
    } catch (e) {
      errors.push({
        skill: dirName,
        message: `outputs.${key} file "${value}" could not be resolved: ${e.message}`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// processSkill — step 4 helper (D2-05, D2-06)
// ---------------------------------------------------------------------------

/**
 * Read and validate a single skill directory. Errors are pushed to the shared
 * `errors` array. Any unexpected exception is caught and converted to an error
 * entry so the scan ALWAYS continues (D2-06 backstop).
 *
 * @param {string} skillsDir
 * @param {string} dirName
 * @param {Set<string>} sharedRefs
 * @param {Set<string>} skillNames - all discovered skill dirNames (VAL-02 resolution)
 * @param {Map<string,string>} audienceMap - dirName -> audience (VAL-03 guard)
 * @param {Array<{skill: string, message: string}>} errors - mutated in place
 */
async function processSkill(skillsDir, dirName, sharedRefs, skillNames, audienceMap, errors) {
  try {
    const skillPath = join(skillsDir, dirName, 'SKILL.md');
    let text;
    try {
      text = await readFile(skillPath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') {
        // D2-05: missing SKILL.md is a hard error; report it and move on
        errors.push({ skill: dirName, message: 'missing SKILL.md' });
      } else {
        errors.push({ skill: dirName, message: `could not read SKILL.md: ${e.message}` });
      }
      return; // return from helper == continue in the outer loop (Pitfall 5)
    }

    // Parse frontmatter — never throws (D-01)
    const { data, body, errors: parseErrors } = parseFrontmatter(text);
    // Lift parseFrontmatter errors: no skill field in returned errors (Pitfall 2)
    for (const e of parseErrors) {
      errors.push({ skill: dirName, message: e.message });
    }

    // Schema validation — already returns { skill, message } shaped (already normalized)
    const schemaErrors = validateSkill(
      { dirName, data, body },
      sharedRefs,
      undefined,
      skillNames,
      audienceMap,
    );
    errors.push(...schemaErrors);

    // fs-dependent half of outputs: validation (VAL-01) — existence + symlink-escape
    await checkOutputsFs(skillsDir, dirName, data, errors);
  } catch (e) {
    // Backstop: any unexpected failure during per-skill I/O or validation (D2-06)
    errors.push({ skill: dirName, message: `unexpected error: ${e.message}` });
  }
}

// ---------------------------------------------------------------------------
// lintProject — main export
// ---------------------------------------------------------------------------

/**
 * Lint a Motto project rooted at `projectRoot`.
 *
 * Execution order (locked per D2-10 — config errors MUST precede skill errors):
 *   1. processConfig  — reads motto.yaml; errors labelled 'motto.yaml'
 *      (immediately followed by a re-read + skew check — VER-02/VER-03 — gated
 *      on a well-formed mottoVersion stamp so a malformed value is never
 *      double-reported as a warning; see D-R1)
 *   2. loadSharedRefs — scans shared/references/*.md → Set of basenames
 *   3. discoverSkillNames — reads skills/ directory; null or [] → "no skills found"
 *   4. loadSkillAudiences — cross-skill pre-pass building Map<dirName, audience>
 *   5. processSkill (each, in sorted order) — reads + validates each SKILL.md,
 *      then runs the fs-dependent outputs: existence/symlink-escape check
 *
 * @param {string} projectRoot - absolute path to the project root
 * @returns {Promise<{ ok: boolean, errors: Array<{skill: string, message: string}>, count: number, warnings: Array<{skill: string, message: string}> }>}
 */
export async function lintProject(projectRoot) {
  const errors = [];
  const warnings = [];

  // 1. Config errors first so they precede all skill errors (D2-10)
  await processConfig(projectRoot, errors);

  // Skew check (VER-02/VER-03) — re-read motto.yaml to obtain the parsed
  // config object (Option A — re-read, mirrors src/build.js:98-99). This is
  // the codebase's sanctioned reuse pattern rather than widening
  // processConfig's return shape (which returns nothing and destructures
  // only `{ errors: configErrors }`). Never throws: any read/parse failure
  // collapses to a null config, and a null config is simply "no skew check" —
  // processConfig already reported the underlying error above.
  let config = null;
  try {
    const configText = await readFile(join(projectRoot, 'motto.yaml'), 'utf8');
    ({ config } = loadConfig(configText));
  } catch {
    config = null;
  }
  // GATING (Issue 1, D-R1): only compute skew when the stamp is present AND
  // well-formed (parseVersion truthy). A malformed mottoVersion is already
  // reported as an errors[] entry by config.js above — parseVersion returns
  // null for it, so this guard guarantees it is NEVER also reported here as
  // a skew warning (no double-report).
  if (config && parseVersion(config.mottoVersion)) {
    const skewWarning = checkSkew(config.mottoVersion, getOwnVersion());
    if (skewWarning) warnings.push(skewWarning);
  }

  // 2. Shared references set (empty if shared/ missing — D2-08; non-ENOENT
  //    read failures become '(project)' error entries — CR-02, never thrown)
  const sharedRefs = await loadSharedRefs(projectRoot, errors);

  // 3. Discover skills — null = ENOENT, [] = empty dir; both map to "no skills found" (D2-13, Pitfall 9).
  //    An { error } sentinel means skills/ exists but could not be read (e.g.
  //    it is a file — ENOTDIR): report it and stop, never reject (CR-02).
  const skillsDir = join(projectRoot, 'skills');
  const discovered = await discoverSkillNames(skillsDir);

  if (discovered !== null && !Array.isArray(discovered)) {
    errors.push({ skill: '(project)', message: discovered.error });
    return { ok: false, errors, count: 0, warnings };
  }
  const skillNames = discovered;

  if (skillNames === null || skillNames.length === 0) {
    errors.push({ skill: '(project)', message: 'no skills found' });
    return { ok: false, errors, count: 0, warnings };
  }

  // 4. Cross-skill context for VAL-02/VAL-03 — read-only pre-pass, never throws
  const skillNameSet = new Set(skillNames);
  const audienceMap = await loadSkillAudiences(skillsDir, skillNames);

  // 5. Process each skill in the sorted (alphabetical) order returned by discoverSkillNames
  for (const dirName of skillNames) {
    await processSkill(skillsDir, dirName, sharedRefs, skillNameSet, audienceMap, errors);
  }

  return { ok: errors.length === 0, errors, count: skillNames.length, warnings };
}
