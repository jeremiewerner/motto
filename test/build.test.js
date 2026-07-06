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
    '<role>',
    'You are a helper that does things.',
    '</role>',
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
    '<role>',
    'You are a helper that does things.',
    '</role>',
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
    '<role>',
    'You are a helper that does things.',
    '</role>',
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

// ---------------------------------------------------------------------------
// Task 2: Safe-failure checks — lint gate + pre-pack collision & contradiction
// ---------------------------------------------------------------------------

describe('buildProject — Task 2: safe-failure checks', () => {
  it('returns ok:false with lint errors; dist/ does not exist on lint failure [BUILD-01, D3-01]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      // Missing `name` field → lint fails for this skill
      await mkdir(join(root, 'skills', 'my-skill'), { recursive: true });
      await writeFile(join(root, 'motto.yaml'), makeMottoYaml());
      await writeFile(
        join(root, 'skills', 'my-skill', 'SKILL.md'),
        [
          '---',
          'description: A skill without a name',
          'audience: public',
          '---',
          '# my-skill',
          '',
          '<role>',
          'helper.',
          '</role>',
          '',
        ].join('\n'),
      );

      const result = await buildProject(root);
      assert.strictEqual(result.ok, false);
      assert.ok(result.errors.length > 0, 'errors must be non-empty');

      // dist/ must NOT have been written
      await assert.rejects(() => stat(join(root, 'dist')), { code: 'ENOENT' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('leaves a pre-existing dist/ sentinel intact on lint failure [D3-02]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      // Invalid skill (missing name) so lint fails
      await mkdir(join(root, 'skills', 'bad-skill'), { recursive: true });
      await writeFile(join(root, 'motto.yaml'), makeMottoYaml());
      await writeFile(
        join(root, 'skills', 'bad-skill', 'SKILL.md'),
        [
          '---',
          'description: A skill without a name',
          'audience: public',
          '---',
          '# bad-skill',
          '',
          '<role>',
          'helper.',
          '</role>',
          '',
        ].join('\n'),
      );

      // Place a sentinel file in dist/ (simulates a prior good build)
      await mkdir(join(root, 'dist', 'public'), { recursive: true });
      await writeFile(join(root, 'dist', 'public', 'sentinel.txt'), 'prior-good-build');

      await buildProject(root);

      // Sentinel must survive — lint gate returned before the wipe
      const sentinel = await readFile(join(root, 'dist', 'public', 'sentinel.txt'), 'utf8');
      assert.strictEqual(sentinel, 'prior-good-build');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns ok:false with "collides" error; dist/ sentinel survives [D3-07]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      // Skill declares shared_references: ['guide'] AND has a local references/guide.md
      await mkdir(join(root, 'skills', 'my-skill', 'references'), { recursive: true });
      await mkdir(join(root, 'shared', 'references'), { recursive: true });
      await writeFile(join(root, 'motto.yaml'), makeMottoYaml());
      await writeFile(
        join(root, 'skills', 'my-skill', 'SKILL.md'),
        makeSkillWithRefs('my-skill', ['guide']),
      );
      await writeFile(join(root, 'skills', 'my-skill', 'references', 'guide.md'), 'local guide');
      await writeFile(join(root, 'shared', 'references', 'guide.md'), 'shared guide');

      // Place sentinel in dist/
      await mkdir(join(root, 'dist', 'public'), { recursive: true });
      await writeFile(join(root, 'dist', 'public', 'sentinel.txt'), 'prior-build');

      const result = await buildProject(root);
      assert.strictEqual(result.ok, false);
      assert.ok(
        result.errors.some((e) => e.message.includes('collides')),
        'error must mention "collides"',
      );

      // Sentinel must survive — collision check ran BEFORE the wipe
      const sentinel = await readFile(join(root, 'dist', 'public', 'sentinel.txt'), 'utf8');
      assert.strictEqual(sentinel, 'prior-build');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns ok:false when audience:private but plugins.private unset; sentinel survives [D3-12]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      // Private skill + no plugins.private in motto.yaml
      await mkdir(join(root, 'skills', 'my-priv-skill'), { recursive: true });
      await writeFile(join(root, 'motto.yaml'), makeMottoYaml()); // no privatePlugin
      await writeFile(
        join(root, 'skills', 'my-priv-skill', 'SKILL.md'),
        makePrivateSkillMd('my-priv-skill'),
      );

      // Place sentinel in dist/
      await mkdir(join(root, 'dist', 'public'), { recursive: true });
      await writeFile(join(root, 'dist', 'public', 'sentinel.txt'), 'prior-build');

      const result = await buildProject(root);
      assert.strictEqual(result.ok, false);
      assert.ok(
        result.errors.some((e) => e.message.includes('plugins.private not set')),
        'error must mention "plugins.private not set"',
      );

      // Sentinel must survive — private-contradiction check ran BEFORE the wipe
      const sentinel = await readFile(join(root, 'dist', 'public', 'sentinel.txt'), 'utf8');
      assert.strictEqual(sentinel, 'prior-build');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Task 3: Private bucket routing — audience routing + conditional emission
// ---------------------------------------------------------------------------

describe('buildProject — Task 3: private bucket routing', () => {
  it('routes private skill to dist/private/ and emits separate plugin.json [BUILD-04/05, D3-09/13]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await mkdir(join(root, 'skills', 'pub-skill'), { recursive: true });
      await mkdir(join(root, 'skills', 'priv-skill'), { recursive: true });
      await writeFile(
        join(root, 'motto.yaml'),
        makeMottoYaml({ privatePlugin: 'my-project-private' }),
      );
      await writeFile(join(root, 'skills', 'pub-skill', 'SKILL.md'), makeSkillMd('pub-skill'));
      await writeFile(
        join(root, 'skills', 'priv-skill', 'SKILL.md'),
        makePrivateSkillMd('priv-skill'),
      );

      const result = await buildProject(root);
      assert.strictEqual(result.ok, true);

      // Public bucket
      await stat(join(root, 'dist', 'public', 'pub-skill', 'SKILL.md'));
      const pubManifest = JSON.parse(
        await readFile(join(root, 'dist', 'public', '.claude-plugin', 'plugin.json'), 'utf8'),
      );
      assert.strictEqual(pubManifest.name, 'my-project');
      assert.ok(pubManifest.version, 'public plugin.json must have version');

      // Private bucket
      await stat(join(root, 'dist', 'private', 'priv-skill', 'SKILL.md'));
      const privManifest = JSON.parse(
        await readFile(join(root, 'dist', 'private', '.claude-plugin', 'plugin.json'), 'utf8'),
      );
      assert.strictEqual(privManifest.name, 'my-project-private');
      assert.ok(privManifest.version, 'private plugin.json must have version');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('does not emit dist/private/ when no private skills exist [BUILD-05, D3-10/11]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await scaffoldPublicProject(root);
      await buildProject(root);

      // Public bucket emitted
      await stat(join(root, 'dist', 'public'));

      // Private bucket NOT emitted
      await assert.rejects(() => stat(join(root, 'dist', 'private')), { code: 'ENOENT' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns skillCount=N and bucketCount=M for a 2-bucket build [D3-16]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await mkdir(join(root, 'skills', 'pub-skill'), { recursive: true });
      await mkdir(join(root, 'skills', 'priv-skill'), { recursive: true });
      await writeFile(
        join(root, 'motto.yaml'),
        makeMottoYaml({ privatePlugin: 'my-project-private' }),
      );
      await writeFile(join(root, 'skills', 'pub-skill', 'SKILL.md'), makeSkillMd('pub-skill'));
      await writeFile(
        join(root, 'skills', 'priv-skill', 'SKILL.md'),
        makePrivateSkillMd('priv-skill'),
      );

      const result = await buildProject(root);
      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.skillCount, 2, 'N must equal total skills packed');
      assert.strictEqual(result.bucketCount, 2, 'M must equal number of buckets emitted');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('preserves a relative symlink verbatim in a private-bucket skill [D3-05, audience-agnostic]', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-'));
    try {
      await mkdir(join(root, 'skills', 'priv-skill'), { recursive: true });
      await writeFile(
        join(root, 'motto.yaml'),
        makeMottoYaml({ privatePlugin: 'my-project-private' }),
      );
      await writeFile(
        join(root, 'skills', 'priv-skill', 'SKILL.md'),
        makePrivateSkillMd('priv-skill'),
      );
      await symlink('SKILL.md', join(root, 'skills', 'priv-skill', 'alias.md'));

      const result = await buildProject(root);
      assert.strictEqual(result.ok, true);

      const linkPath = join(root, 'dist', 'private', 'priv-skill', 'alias.md');
      const linkStat = await lstat(linkPath);
      assert.ok(linkStat.isSymbolicLink(), 'alias.md must be a symlink in private bucket');

      const target = await readlink(linkPath);
      assert.strictEqual(target, 'SKILL.md', 'symlink target must be the original relative string');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// mottoVersion skew warnings[] (VER-02, VER-04) — Task 1 wiring
// ---------------------------------------------------------------------------

function makeMottoYamlWithVersion(mottoVersion) {
  return [
    'name: my-project',
    'version: 1.0.0',
    'description: My project description',
    `mottoVersion: "${mottoVersion}"`,
    'plugins:',
    '  public: my-project',
    '',
  ].join('\n');
}

describe('buildProject — warnings[] additive field (VER-02/VER-04 wiring)', () => {
  it('a project with no mottoVersion returns warnings: [] on the success return', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-warn-'));
    try {
      await scaffoldPublicProject(root);
      const result = await buildProject(root);
      assert.strictEqual(result.ok, true, `build failed: ${JSON.stringify(result.errors)}`);
      assert.deepStrictEqual(result.warnings, []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('the lint-fail early return still includes a warnings field', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-warn-'));
    try {
      // Invalid config (missing required fields) forces the lint gate to fail.
      await mkdir(join(root, 'skills', 'my-skill'), { recursive: true });
      await writeFile(join(root, 'motto.yaml'), 'name: my-project\n');
      await writeFile(join(root, 'skills', 'my-skill', 'SKILL.md'), makeSkillMd('my-skill'));
      const result = await buildProject(root);
      assert.strictEqual(result.ok, false);
      assert.ok(Array.isArray(result.warnings), 'warnings must be present even on the lint-fail path');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('a skewed-but-otherwise-valid project builds ok:true with a skew warning; plugin.json version is config.version', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-warn-'));
    try {
      await mkdir(join(root, 'skills', 'my-skill'), { recursive: true });
      await writeFile(join(root, 'motto.yaml'), makeMottoYamlWithVersion('0.0.1'));
      await writeFile(join(root, 'skills', 'my-skill', 'SKILL.md'), makeSkillMd('my-skill'));
      const result = await buildProject(root);
      assert.strictEqual(result.ok, true, `build failed: ${JSON.stringify(result.errors)}`);
      assert.strictEqual(result.warnings.length, 1);
      assert.match(result.warnings[0].message, /check the upgrade ledger/);

      const manifestRaw = await readFile(
        join(root, 'dist', 'public', '.claude-plugin', 'plugin.json'),
        'utf8',
      );
      const manifest = JSON.parse(manifestRaw);
      assert.strictEqual(manifest.version, '1.0.0', 'plugin.json version must equal config.version, never mottoVersion');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Never-rewrite guard (VER-06, D-01/D-06) — mirrors test/lint.test.js
// ---------------------------------------------------------------------------

describe('lint/build never rewrite motto.yaml (VER-06, D-01/D-06)', () => {
  it('buildProject does not modify motto.yaml content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'motto-build-norestamp-'));
    try {
      await scaffoldPublicProject(root);
      const configPath = join(root, 'motto.yaml');
      const before = await readFile(configPath, 'utf8');
      const result = await buildProject(root);
      assert.strictEqual(result.ok, true, `build failed: ${JSON.stringify(result.errors)}`);
      const after = await readFile(configPath, 'utf8');
      assert.strictEqual(after, before, 'buildProject must never modify motto.yaml');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
