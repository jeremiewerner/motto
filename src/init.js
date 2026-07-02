/**
 * Motto project scaffolder.
 *
 * Exports a single async function `scaffoldProject(targetDir, { name, force })`
 * that writes a complete, immediately-buildable skills project into `targetDir`:
 * `skills/hello-world/SKILL.md`, `shared/references/.gitkeep`, `motto.yaml`,
 * `.gitignore`, and `.claude-plugin/marketplace.json`.
 *
 * Never-throw orchestrator (house style — mirrors src/build.js):
 *   1. Validate the effective name against NAME_KEBAB (src/schema.js — single
 *      source, D-09/SC4) BEFORE any template string is constructed (Pitfall 1).
 *   2. Unless `force`, guard against a non-empty target dir (D-05 allowlist:
 *      `.git`/`.DS_Store` don't count).
 *   3. Best-effort git-config owner lookup (never throws — Pattern 3).
 *   4. Write the fixed scaffold paths (overwrite-by-default; --force skips
 *      ONLY the empty-dir check — zero delete operations, Pitfall 3).
 *
 * Return shape:
 *   { ok, created, errors, reason?, name?, suggestion?, offending? }
 *
 * Exit code: callers (bin/motto.js) set process.exitCode (never process.exit(1)).
 */

import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';

// src/schema.js is the sole source of NAME_KEBAB (D-09/SC4) — never redefined
// or imported from config.js here.
import { NAME_KEBAB } from './schema.js';

// ---------------------------------------------------------------------------
// Scaffold templates
// ---------------------------------------------------------------------------

// D-01: hello-world starter skill. D-02: body MINIMAL — no Motto docs embedded.
// D-03: audience public. D-04: no shared_references key.
const HELLO_WORLD_SKILL_MD = `---
name: hello-world
description: A minimal example skill scaffolded by motto init — replace this with your own.
audience: public
---

# Hello World

**Role:** You are a minimal example skill. Replace this with your own skill's purpose.
`;

// A2: generic placeholder description, shared verbatim between motto.yaml and
// marketplace.json (Pitfall 2 — single value, never computed twice).
const SCAFFOLD_DESCRIPTION = 'A skills project scaffolded by motto init.';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Entries that never count toward the "directory is non-empty" guard (D-05).
 * @type {Set<string>}
 */
const IGNORABLE_ENTRIES = new Set(['.git', '.DS_Store']);

/**
 * List entries in `targetDir` that are NOT on the ignorable allowlist,
 * sorted for deterministic capped-message output (D-07).
 * Mirrors src/build.js's discoverSkillNames readdir+try/catch-ENOENT shape.
 *
 * @param {string} targetDir
 * @returns {Promise<string[]>}
 */
async function listNonIgnorableEntries(targetDir) {
  let entries;
  try {
    entries = await readdir(targetDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return []; // target dir doesn't exist yet — treat as empty
    throw e;
  }
  return entries
    .map((e) => e.name)
    .filter((name) => !IGNORABLE_ENTRIES.has(name))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Best-effort `git config user.name` lookup for marketplace.json's owner
 * field (INIT-03). Never throws: git missing, unset, or any other failure
 * all collapse to the same placeholder (Pattern 3).
 *
 * @returns {string}
 */
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

/**
 * Sanitize an invalid raw name into a NAME_KEBAB-valid suggestion for the
 * D-08 "try: motto init <suggestion>" hint. Never returns an empty string.
 *
 * @param {string} raw
 * @returns {string}
 */
function suggestKebabName(raw) {
  let s = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // collapse any run of non-alnum into one hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
  s = s.replace(/^[^a-z]+/, ''); // strip any leading non-letter (NAME_KEBAB requires letter-start)
  return s || 'my-project';
}

/**
 * Write the fixed set of scaffold files/dirs into `targetDir`. Overwrites
 * by default (this IS the --force overwrite behavior — D-06; no delete
 * needed). The validated `name` is used only as file CONTENT, never as a
 * path segment.
 *
 * @param {string} targetDir
 * @param {{ name: string, owner: string }} opts
 * @returns {Promise<string[]>} relative paths written, in write order
 */
async function writeScaffold(targetDir, { name, owner }) {
  const created = [];

  // skills/hello-world/SKILL.md
  await mkdir(join(targetDir, 'skills', 'hello-world'), { recursive: true });
  await writeFile(join(targetDir, 'skills', 'hello-world', 'SKILL.md'), HELLO_WORLD_SKILL_MD);
  created.push('skills/hello-world/SKILL.md');

  // shared/references/.gitkeep (D-04: empty dir needs a tracked file — Pitfall 5)
  await mkdir(join(targetDir, 'shared', 'references'), { recursive: true });
  await writeFile(join(targetDir, 'shared', 'references', '.gitkeep'), '');
  created.push('shared/references/.gitkeep');

  // motto.yaml — name and plugins.public derive from the SAME validated
  // `name` value (Pitfall 2). plugins.private intentionally omitted.
  await writeFile(
    join(targetDir, 'motto.yaml'),
    `name: ${name}\nversion: "0.1.0"\ndescription: ${SCAFFOLD_DESCRIPTION}\nplugins:\n  public: ${name}\n`,
  );
  created.push('motto.yaml');

  // .gitignore — INIT-06: ignore dist/private/ only; dist/public/ stays
  // trackable so the marketplace.json relative pointer resolves for
  // consumers. Deliberately NOT a copy of this repo's own .gitignore
  // (which ignores all of dist/ and carries GSD-specific entries).
  await writeFile(join(targetDir, '.gitignore'), 'node_modules/\ndist/private/\n');
  created.push('.gitignore');

  // .claude-plugin/marketplace.json — bare relative-path source string
  // (Pattern 4), NOT this repo's own npm-source object form. No
  // owner.email, no skills/strict keys.
  await mkdir(join(targetDir, '.claude-plugin'), { recursive: true });
  await writeFile(
    join(targetDir, '.claude-plugin', 'marketplace.json'),
    JSON.stringify(
      {
        name,
        owner: { name: owner },
        plugins: [
          {
            name,
            source: './dist/public/',
            description: SCAFFOLD_DESCRIPTION,
          },
        ],
      },
      null,
      2,
    ) + '\n',
  );
  created.push('.claude-plugin/marketplace.json');

  return created;
}

// ---------------------------------------------------------------------------
// scaffoldProject — main export
// ---------------------------------------------------------------------------

/**
 * Scaffold a new Motto skills project into `targetDir`.
 *
 * @param {string} targetDir - absolute path to the target project directory
 * @param {{ name?: string, force?: boolean }} [opts]
 * @returns {Promise<{
 *   ok: boolean,
 *   created?: string[],
 *   errors: Array<{skill: string, message: string}>,
 *   reason?: 'invalid-name'|'not-empty',
 *   name?: string,
 *   suggestion?: string,
 *   offending?: string[]
 * }>}
 */
export async function scaffoldProject(targetDir, { name, force = false } = {}) {
  // ── STEP 1: Resolve + validate the effective name BEFORE any template is
  // built (Pitfall 1). INIT-01: explicit [name] or cwd basename default.
  const effectiveName = name ?? basename(targetDir);

  if (!NAME_KEBAB.test(effectiveName)) {
    return {
      ok: false,
      reason: 'invalid-name',
      name: effectiveName,
      suggestion: suggestKebabName(effectiveName),
      errors: [
        {
          skill: '(init)',
          message: `name must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/): "${effectiveName}"`,
        },
      ],
    };
  }

  // ── STEP 2: Non-empty-dir guard (D-05) — skipped entirely when force:true.
  // --force NEVER deletes; it only bypasses this check (D-06, Pitfall 3).
  if (!force) {
    let offending;
    try {
      offending = await listNonIgnorableEntries(targetDir);
    } catch (e) {
      // e.g. ENOTDIR when targetDir is actually a file (WR-01) — never throw.
      return {
        ok: false,
        errors: [{ skill: '(init)', message: `cannot read target directory: ${e.message}` }],
      };
    }
    if (offending.length > 0) {
      return { ok: false, reason: 'not-empty', offending, errors: [] };
    }
  }

  // ── STEP 3: Best-effort owner lookup (INIT-03) — never throws.
  const owner = resolveGitOwnerName();

  // ── STEP 4: Write the scaffold and return.
  try {
    const created = await writeScaffold(targetDir, { name: effectiveName, owner });
    return { ok: true, created, errors: [] };
  } catch (e) {
    // e.g. ENOTDIR when a scaffold path segment is blocked by a file (WR-01)
    // — never throw. writeScaffold may have partially written before this
    // point; no rollback is performed (T-10-03, YAGNI, zero delete ops).
    return {
      ok: false,
      errors: [{ skill: '(init)', message: `scaffold write failed: ${e.message}` }],
    };
  }
}
