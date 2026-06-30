import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp, mkdir, rm, writeFile, readFile,
  lstat, readlink, stat, symlink, chmod,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildProject } from '../src/build.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSkillMd(name) {
  return [
    '---',
    `name: ${name}`,
    `description: A skill named ${name} — use when you need ${name}`,
    'audience: public',
    '---',
    `# ${name}`,
    '',
    '**Role:** You are a helper that does things.',
    '',
    'Do things.',
    '',
  ].join('\n');
}

function makePrivateSkillMd(name) {
  return [
    '---',
    `name: ${name}`,
    `description: A skill named ${name} — use when you need ${name}`,
    'audience: private',
    '---',
    `# ${name}`,
    '',
    '**Role:** You are a helper that does things.',
    '',
    'Do things.',
    '',
  ].join('\n');
}

function makeSkillWithRefs(name, refs) {
  return [
    '---',
    `name: ${name}`,
    `description: A skill named ${name} — use when you need ${name}`,
    'audience: public',
    'shared_references:',
    ...refs.map((r) => `  - ${r}`),
    '---',
    `# ${name}`,
    '',
    '**Role:** You are a helper that does things.',
    '',
    'Do things.',
    '',
  ].join('\n');
}

function makeMottoYaml({ privatePlugin } = {}) {
  const lines = [
    'name: my-project',
    'version: 1.0.0',
    'description: My project description',
    'plugins:',
    '  public: my-project',
  ];
  if (privatePlugin) {
    lines.push(`  private: ${privatePlugin}`);
  }
  return lines.join('\n') + '\n';
}

/** Scaffold a minimal valid public project with one skill. */
async function scaffoldPublicProject(root) {
  await mkdir(join(root, 'skills', 'my-skill'), { recursive: true });
  await writeFile(join(root, 'motto.yaml'), makeMottoYaml());
  await writeFile(join(root, 'skills', 'my-skill', 'SKILL.md'), makeSkillMd('my-skill'));
}

// ---------------------------------------------------------------------------
// Task 1: Happy-path public build
// ---------------------------------------------------------------------------

describe('buildProject — Task 1: happy-path public build', () => {
  it('copies SKILL.md verbatim to dist/public/<name>/SKILL.md [BUILD-02/06, D3-04]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      const content = makeSkillMd('my-skill');
      await mkdir(join(root, 'skills', 'my-skill'), { recursive: true });
      await writeFile(join(root, 'motto.yaml'), makeMottoYaml());
      await writeFile(join(root, 'skills', 'my-skill', 'SKILL.md'), content);

      const result = await buildProject(root);
      assert.strictEqual(result.ok, true);
      assert.deepStrictEqual(result.errors, []);

      const distContent = await readFile(
        join(root, 'dist', 'public', 'my-skill', 'SKILL.md'),
        'utf8',
      );
      assert.strictEqual(distContent, content, 'SKILL.md content must be byte-identical');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('skill dir is a sibling of .claude-plugin/, not nested inside it [BUILD-06, D3-08]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await scaffoldPublicProject(root);
      await buildProject(root);

      const pluginStat = await stat(join(root, 'dist', 'public', '.claude-plugin'));
      assert.ok(pluginStat.isDirectory(), '.claude-plugin/ must be a directory');

      const skillStat = await stat(join(root, 'dist', 'public', 'my-skill'));
      assert.ok(skillStat.isDirectory(), 'my-skill/ must exist as sibling of .claude-plugin/');

      // skill dir must NOT be nested inside .claude-plugin/
      await assert.rejects(
        () => stat(join(root, 'dist', 'public', '.claude-plugin', 'my-skill')),
        { code: 'ENOENT' },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves a relative symlink verbatim in dist/ [BUILD-02, D3-05]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await scaffoldPublicProject(root);
      await symlink('SKILL.md', join(root, 'skills', 'my-skill', 'alias.md'));

      const result = await buildProject(root);
      assert.strictEqual(result.ok, true);

      const linkPath = join(root, 'dist', 'public', 'my-skill', 'alias.md');
      const linkStat = await lstat(linkPath);
      assert.ok(linkStat.isSymbolicLink(), 'alias.md must be a symlink');

      const target = await readlink(linkPath);
      assert.strictEqual(target, 'SKILL.md', 'symlink target must be the original relative string');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves executable bit on skill files in dist/ [D3-05]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await scaffoldPublicProject(root);
      await mkdir(join(root, 'skills', 'my-skill', 'scripts'), { recursive: true });
      await writeFile(join(root, 'skills', 'my-skill', 'scripts', 'run.sh'), '#!/bin/sh\necho hello\n');
      await chmod(join(root, 'skills', 'my-skill', 'scripts', 'run.sh'), 0o755);

      const result = await buildProject(root);
      assert.strictEqual(result.ok, true);

      const s = await stat(join(root, 'dist', 'public', 'my-skill', 'scripts', 'run.sh'));
      // eslint-disable-next-line no-bitwise
      assert.ok(s.mode & 0o111, 'executable bit must be preserved on run.sh');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('bundles a declared shared_reference into dist/<audience>/<name>/references/ [BUILD-03, D3-06]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await mkdir(join(root, 'skills', 'my-skill'), { recursive: true });
      await mkdir(join(root, 'shared', 'references'), { recursive: true });
      await writeFile(join(root, 'motto.yaml'), makeMottoYaml());
      await writeFile(
        join(root, 'skills', 'my-skill', 'SKILL.md'),
        makeSkillWithRefs('my-skill', ['guide']),
      );
      const guideContent = '# Guide\n\nSome guidance.\n';
      await writeFile(join(root, 'shared', 'references', 'guide.md'), guideContent);

      const result = await buildProject(root);
      assert.strictEqual(result.ok, true);

      const distGuide = await readFile(
        join(root, 'dist', 'public', 'my-skill', 'references', 'guide.md'),
        'utf8',
      );
      assert.strictEqual(distGuide, guideContent, 'shared reference must be bundled verbatim');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('emits plugin.json with exactly {name, version, description} [BUILD-04, D3-13/14]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await scaffoldPublicProject(root);
      await buildProject(root);

      const raw = await readFile(
        join(root, 'dist', 'public', '.claude-plugin', 'plugin.json'),
        'utf8',
      );
      const manifest = JSON.parse(raw);
      assert.deepStrictEqual(
        Object.keys(manifest),
        ['name', 'version', 'description'],
        'plugin.json must have exactly three keys in order: name, version, description',
      );
      assert.strictEqual(manifest.name, 'my-project');
      assert.strictEqual(manifest.version, '1.0.0');
      assert.strictEqual(manifest.description, 'My project description');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns { ok:true, outDir:<abs dist path>, errors:[] } [BUILD-02]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await scaffoldPublicProject(root);

      const result = await buildProject(root);
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.outDir, join(root, 'dist'));
      assert.deepStrictEqual(result.errors, []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
