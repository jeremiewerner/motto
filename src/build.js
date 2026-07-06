/**
 * Motto build orchestrator.
 *
 * Exports a single async function `buildProject(projectRoot)` that turns a
 * lint-passing source tree into self-contained, distributable Claude Code
 * plugin folders under `dist/`.
 *
 * Load-bearing order (D3-02, extended per RESEARCH):
 *   1. lintProject gate — on failure, return errors without touching dist/
 *   2. Load config + skill data from disk (Option A — re-read, D3-01 reuse)
 *   3. Pre-pack checks — collision (D3-07) + private-contradiction (D3-12)
 *   4. Wipe dist/ — ONLY after ALL checks pass (D3-03)
 *   5. Pack skills — verbatim copy (verbatimSymlinks:true) + shared-ref bundling
 *   6. Emit plugin.json per bucket (D3-13)
 *   7. Return result
 *
 * Return shape:
 *   { ok, outDir, errors, skillCount, bucketCount, warnings }
 *
 * warnings — additive, non-blocking advisories (VER-02); currently populated
 * only by a mottoVersion/tool skew check (VER-03), computed directly from
 * the already lint-validated config at STEP 2 (config.mottoVersion is
 * guaranteed well-formed or absent by the time the lint gate has passed —
 * a malformed value would already have failed lint). Always present on
 * every return path, defaults to [].
 *
 * Exit code: callers set process.exitCode (never process.exit(1)) to avoid
 * truncating buffered stdout (Phase 2 Pitfall 7).
 */

import { readFile, readdir, rm, mkdir, cp, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { lintProject } from './lint.js';
import { loadConfig } from './config.js';
import { parseFrontmatter } from './frontmatter.js';
import { checkSkew, getOwnVersion } from './version.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Discover skill directory names under `skillsDir` (one level deep, sorted).
 * Returns an empty array when skillsDir is missing (ENOENT).
 *
 * @param {string} skillsDir
 * @returns {Promise<string[]>}
 */
async function discoverSkillNames(skillsDir) {
  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => e.name);
}

/**
 * Read the frontmatter fields needed for packaging: audience + shared_references.
 * Lint has already validated this SKILL.md, so we trust the data shape.
 *
 * @param {string} skillsDir
 * @param {string} skillName
 * @returns {Promise<{ audience: string, sharedRefs: string[] }>}
 */
async function loadSkillData(skillsDir, skillName) {
  const text = await readFile(join(skillsDir, skillName, 'SKILL.md'), 'utf8');
  const { data } = parseFrontmatter(text);
  return {
    audience: typeof data.audience === 'string' ? data.audience : 'public',
    sharedRefs: Array.isArray(data.shared_references) ? data.shared_references : [],
  };
}

// ---------------------------------------------------------------------------
// buildProject — main export
// ---------------------------------------------------------------------------

/**
 * Build a Motto project rooted at `projectRoot`.
 *
 * @param {string} projectRoot - absolute path to the project root
 * @returns {Promise<{
 *   ok: boolean,
 *   outDir: string|null,
 *   errors: Array<{skill: string, message: string}>,
 *   skillCount: number,
 *   bucketCount: number,
 *   warnings: Array<{skill: string, message: string}>
 * }>}
 */
export async function buildProject(projectRoot) {
  // ── STEP 1: Lint gate (D3-01, D3-02) ──────────────────────────────────────
  // The gate runs BEFORE any mutation. A failing lint means zero writes to dist/.
  const lintResult = await lintProject(projectRoot);
  if (!lintResult.ok) {
    return {
      ok: false,
      outDir: null,
      errors: lintResult.errors,
      skillCount: 0,
      bucketCount: 0,
      warnings: lintResult.warnings ?? [],
    };
  }

  // ── STEP 2: Load config + skill data (Option A — re-read, RESEARCH §Reuse) ─
  const configText = await readFile(join(projectRoot, 'motto.yaml'), 'utf8');
  const { config } = loadConfig(configText); // lint passed → config is valid

  // Skew check (VER-02/VER-03) — computed directly here, NOT re-derived from
  // lintResult's internals, to avoid coupling to lint.js's internal naming.
  // config.mottoVersion is guaranteed well-formed-or-absent by the lint gate
  // above (a malformed value would already have failed lint — D-R1), so no
  // extra parseVersion gate is needed here; checkSkew itself null-guards.
  const warnings = [];
  const skewWarning = checkSkew(config.mottoVersion, getOwnVersion());
  if (skewWarning) warnings.push(skewWarning);

  const skillsDir = join(projectRoot, 'skills');
  const skillNames = await discoverSkillNames(skillsDir);

  const skills = [];
  for (const name of skillNames) {
    const skillData = await loadSkillData(skillsDir, name);
    skills.push({ name, ...skillData });
  }

  // ── STEP 3: Pre-pack checks (D3-07, D3-12) — run BEFORE the wipe ──────────
  // Task 2 adds collision and private-contradiction checks here.
  // The buildErrors array is checked after all skills are scanned so that
  // ALL errors are reported in a single pass (collect-don't-throw pattern).
  const buildErrors = [];

  // D3-07: Collision check — declared shared_ref vs local skill references/<ref>.md
  for (const skill of skills) {
    for (const ref of skill.sharedRefs) {
      try {
        await stat(join(skillsDir, skill.name, 'references', ref + '.md'));
        // If stat succeeds, the file exists in the SOURCE tree → collision
        buildErrors.push({
          skill: skill.name,
          message: `shared reference '${ref}' collides with a local references/${ref}.md`,
        });
      } catch (e) {
        if (e.code !== 'ENOENT') throw e; // unexpected I/O error — propagate
        // ENOENT = no collision — continue
      }
    }
  }

  // D3-12: Private-contradiction check
  for (const skill of skills) {
    if (skill.audience === 'private' && !config.plugins?.private) {
      buildErrors.push({
        skill: skill.name,
        message: 'audience private but plugins.private not set in motto.yaml',
      });
    }
  }

  // Return early on any pre-pack errors — BEFORE the wipe (D3-02 extended)
  if (buildErrors.length > 0) {
    return {
      ok: false,
      outDir: null,
      errors: buildErrors,
      skillCount: 0,
      bucketCount: 0,
      warnings,
    };
  }

  // ── STEP 4: Wipe dist/ (D3-03) — only after ALL checks pass ──────────────
  const distDir = join(projectRoot, 'dist');
  await rm(distDir, { recursive: true, force: true }); // force:true silences ENOENT

  // ── STEP 5: Pack each skill, routed by audience (D3-09) ─────────────────
  // public is always in bucketsUsed (D3-10); private is added when a skill
  // declares audience:private (and plugins.private is guaranteed set by Step 3).
  const bucketsUsed = new Set(['public']);

  for (const skill of skills) {
    const audience = skill.audience; // 'public' | 'private' (validated by lint)
    const dstSkillDir = join(distDir, audience, skill.name);

    // Verbatim copy — verbatimSymlinks:true is MANDATORY (RESEARCH CRITICAL).
    // Default and dereference:false silently rewrite relative symlinks to
    // absolute paths pointing into the source tree on macOS (Node 24 verified).
    await cp(join(skillsDir, skill.name), dstSkillDir, {
      recursive: true,
      verbatimSymlinks: true,
    });

    // Bundle declared shared_references (D3-06)
    if (skill.sharedRefs.length > 0) {
      const outRefsDir = join(dstSkillDir, 'references');
      // Idempotent guard: creates references/ even if the skill had no local
      // references/ dir — cp would not have created it (RESEARCH Pitfall 3)
      await mkdir(outRefsDir, { recursive: true });
      for (const ref of skill.sharedRefs) {
        await cp(
          join(projectRoot, 'shared', 'references', ref + '.md'),
          join(outRefsDir, ref + '.md'),
        );
      }
    }

    if (audience === 'private') bucketsUsed.add('private');
  }

  // ── STEP 6: Emit plugin.json for each bucket used (D3-13) ────────────────
  // public bucket: always emitted (D3-10); private bucket: emitted only when
  // bucketsUsed has 'private' (D3-11 — the D3-12 check above ensures this only
  // happens when plugins.private is set, so plugins.private is always present here).
  const plugins = config.plugins ?? {};

  for (const audience of bucketsUsed) {
    const pluginName = audience === 'public' ? plugins.public : plugins.private;
    const pluginDir = join(distDir, audience, '.claude-plugin');
    await mkdir(pluginDir, { recursive: true });
    await writeFile(
      join(pluginDir, 'plugin.json'),
      JSON.stringify(
        { name: pluginName, version: config.version, description: config.description },
        null,
        2,
      ) + '\n',
    );
  }

  // ── STEP 7: Return result ─────────────────────────────────────────────────
  return {
    ok: true,
    outDir: distDir,
    errors: [],
    skillCount: skills.length,
    bucketCount: bucketsUsed.size,
    warnings,
  };
}
