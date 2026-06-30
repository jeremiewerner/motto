import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, cp, readFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { lintProject } from '../src/lint.js';
import { buildProject } from '../src/build.js';
import { NAME_KEBAB as schemaKebab } from '../src/schema.js';
import { NAME_KEBAB as configKebab } from '../src/config.js'; // requires export (DOG-04 change)

// Anchor REPO_ROOT at load time via import.meta.url — NEVER use process.cwd()
// (process.cwd() shifts with invocation directory; import.meta.url is stable).
// test/dogfood.test.js lives one level inside the repo root, so '..' resolves correctly.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── DOG-04: NAME_KEBAB parity ─────────────────────────────────────────────────
describe('NAME_KEBAB parity (DOG-04)', () => {
  it('NAME_KEBAB .source is identical in schema.js and config.js', () => {
    assert.strictEqual(
      schemaKebab.source,
      configKebab.source,
      'NAME_KEBAB source must match: schema.js is the source of truth',
    );
    assert.strictEqual(
      schemaKebab.flags,
      configKebab.flags,
      'NAME_KEBAB flags must match between schema.js and config.js',
    );
  });
});

// ── DOG-03: Lint the real repo root in-place (read-only) ─────────────────────
describe('dogfood lint (DOG-03)', () => {
  it('lintProject on REPO_ROOT returns ok:true with count=3', async () => {
    const result = await lintProject(REPO_ROOT);
    assert.strictEqual(
      result.ok,
      true,
      `lint failed:\n${JSON.stringify(result.errors, null, 2)}`,
    );
    assert.strictEqual(result.count, 3, `expected 3 skills, got ${result.count}`);
    assert.deepStrictEqual(result.errors, []);
  });
});

// ── DOG-03: Build against an isolated mkdtemp copy ───────────────────────────
describe('dogfood build (DOG-03)', () => {
  let tempDir;
  let buildResult;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-dogfood-'));
    // Copy only the three inputs buildProject reads. NEVER copy dist/:
    // buildProject wipes projectRoot/dist — calling buildProject(REPO_ROOT) would
    // destroy the repo's own dist/. We always build against the tempDir copy.
    await cp(join(REPO_ROOT, 'skills'), join(tempDir, 'skills'), { recursive: true });
    await cp(join(REPO_ROOT, 'shared'), join(tempDir, 'shared'), { recursive: true });
    await cp(join(REPO_ROOT, 'motto.yaml'), join(tempDir, 'motto.yaml'));
    buildResult = await buildProject(tempDir);
    // Fail fast with the root cause. buildProject is lint-gated: if lint rejects
    // the tree it writes no dist/, and every artifact assertion below would then
    // fail with a cryptic ENOENT. Throwing here collapses that cascade into one
    // legible hook failure carrying the actual lint/build diagnostics. The
    // per-artifact `it`s still pinpoint problems when the build SUCCEEDS but
    // emits the wrong output — the case worth isolating.
    if (!buildResult.ok) {
      throw new Error(
        `dogfood build failed — dist/ assertions skipped. Root cause:\n${JSON.stringify(buildResult.errors, null, 2)}`,
      );
    }
  });

  after(async () => {
    // Guard with `if (tempDir)` so cleanup runs even when before() throws before assignment.
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  // ── Return shape ─────────────────────────────────────────────────────────────
  it('buildProject returns ok:true with skillCount=3 and bucketCount=2', () => {
    assert.strictEqual(
      buildResult.ok,
      true,
      `build failed:\n${JSON.stringify(buildResult.errors, null, 2)}`,
    );
    assert.strictEqual(buildResult.skillCount, 3);
    assert.strictEqual(buildResult.bucketCount, 2); // public + private
    assert.deepStrictEqual(buildResult.errors, []);
  });

  // ── Public bucket skill files ─────────────────────────────────────────────────
  it('dist/public/authoring-a-skill/SKILL.md exists', async () => {
    await stat(join(tempDir, 'dist', 'public', 'authoring-a-skill', 'SKILL.md'));
    // stat throws ENOENT if missing; test fails with a clear error code
  });

  it('dist/public/motto-project-setup/SKILL.md exists', async () => {
    await stat(join(tempDir, 'dist', 'public', 'motto-project-setup', 'SKILL.md'));
  });

  // ── Shared reference bundling ─────────────────────────────────────────────────
  it('authoring-a-skill has references/skill-schema.md bundled', async () => {
    await stat(join(tempDir, 'dist', 'public', 'authoring-a-skill', 'references', 'skill-schema.md'));
  });

  it('motto-project-setup has references/skill-schema.md bundled', async () => {
    await stat(join(tempDir, 'dist', 'public', 'motto-project-setup', 'references', 'skill-schema.md'));
  });

  // ── Private bucket ────────────────────────────────────────────────────────────
  it('dist/private/motto-release/SKILL.md exists', async () => {
    await stat(join(tempDir, 'dist', 'private', 'motto-release', 'SKILL.md'));
  });

  it('motto-release has no references/ directory (no shared_references declared)', async () => {
    await assert.rejects(
      () => stat(join(tempDir, 'dist', 'private', 'motto-release', 'references')),
      { code: 'ENOENT' },
      'motto-release must not have references/ — it declares no shared_references',
    );
  });

  // ── plugin.json contents ──────────────────────────────────────────────────────
  it('public plugin.json has name=motto-skills, version present, description present', async () => {
    const raw = await readFile(
      join(tempDir, 'dist', 'public', '.claude-plugin', 'plugin.json'),
      'utf8',
    );
    const manifest = JSON.parse(raw);
    assert.strictEqual(manifest.name, 'motto-skills');
    assert.ok(manifest.version, 'version must be present in public plugin.json');
    assert.ok(manifest.description, 'description must be present in public plugin.json');
    // version intentionally checked via assert.ok, not strictEqual('0.0.2'),
    // so the assertion survives a version bump without editing this test.
  });

  it('private plugin.json has name=motto-private, version present', async () => {
    const raw = await readFile(
      join(tempDir, 'dist', 'private', '.claude-plugin', 'plugin.json'),
      'utf8',
    );
    const manifest = JSON.parse(raw);
    assert.strictEqual(manifest.name, 'motto-private');
    assert.ok(manifest.version, 'version must be present in private plugin.json');
  });
});
