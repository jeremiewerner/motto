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
 * Return shape: { ok: boolean, errors: Array<{ skill: string, message: string }>, count: number }
 *   ok     — true when errors is empty.
 *   errors — aggregated error list; config errors (labelled 'motto.yaml') always
 *            precede skill errors; skill errors are in alphabetical-by-dirName order.
 *   count  — number of skills discovered (0 when none found).
 *
 * Internal helpers (not exported): processConfig, loadSharedRefs,
 * discoverSkillNames, processSkill — per RESEARCH Module Decomposition
 * Recommendation.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

import { parseFrontmatter } from './frontmatter.js';
import { validateSkill } from './schema.js';
import { loadConfig } from './config.js';

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
 * an empty Set (D2-08). Other unexpected I/O errors are rethrown.
 *
 * @param {string} projectRoot
 * @returns {Promise<Set<string>>}
 */
async function loadSharedRefs(projectRoot) {
  const refsDir = join(projectRoot, 'shared', 'references');
  try {
    const entries = await readdir(refsDir, { withFileTypes: true });
    return new Set(
      entries
        .filter((e) => e.isFile() && extname(e.name) === '.md')
        .map((e) => basename(e.name, '.md')),
    );
  } catch (e) {
    if (e.code === 'ENOENT') return new Set(); // D2-08: absence is not an error
    throw e; // unexpected — propagate to the lintProject boundary
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
 * Returns `null`  when skillsDir is missing (ENOENT) — caller maps to "no skills found".
 * Returns `[]`    when skillsDir exists but contains no candidates — same treatment.
 * Rethrows any other I/O error.
 *
 * @param {string} skillsDir - absolute path to the skills/ directory
 * @returns {Promise<string[]|null>}
 */
async function discoverSkillNames(skillsDir) {
  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return null; // caller converts to "no skills found"
    throw e;
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.')) // D2-04
    .sort((a, b) => a.name.localeCompare(b.name)) // D2-03 — MANDATORY (Pitfall 1)
    .map((e) => e.name);
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
 * @param {Array<{skill: string, message: string}>} errors - mutated in place
 */
async function processSkill(skillsDir, dirName, sharedRefs, errors) {
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
    const schemaErrors = validateSkill({ dirName, data, body }, sharedRefs);
    errors.push(...schemaErrors);
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
 *   2. loadSharedRefs — scans shared/references/*.md → Set of basenames
 *   3. discoverSkillNames — reads skills/ directory; null or [] → "no skills found"
 *   4. processSkill (each, in sorted order) — reads + validates each SKILL.md
 *
 * @param {string} projectRoot - absolute path to the project root
 * @returns {Promise<{ ok: boolean, errors: Array<{skill: string, message: string}>, count: number }>}
 */
export async function lintProject(projectRoot) {
  const errors = [];

  // 1. Config errors first so they precede all skill errors (D2-10)
  await processConfig(projectRoot, errors);

  // 2. Shared references set (empty if shared/ missing — D2-08)
  const sharedRefs = await loadSharedRefs(projectRoot);

  // 3. Discover skills — null = ENOENT, [] = empty dir; both map to "no skills found" (D2-13, Pitfall 9)
  const skillsDir = join(projectRoot, 'skills');
  const skillNames = await discoverSkillNames(skillsDir);

  if (skillNames === null || skillNames.length === 0) {
    errors.push({ skill: '(project)', message: 'no skills found' });
    return { ok: false, errors, count: 0 };
  }

  // 4. Process each skill in the sorted (alphabetical) order returned by discoverSkillNames
  for (const dirName of skillNames) {
    await processSkill(skillsDir, dirName, sharedRefs, errors);
  }

  return { ok: errors.length === 0, errors, count: skillNames.length };
}
