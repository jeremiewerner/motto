import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, writeFile, readdir, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scaffoldProject } from '../src/init.js';

// scaffoldProject(targetDir, { name, force }) -> {
//   ok, created, errors, reason?, name?, suggestion?, offending?
// }
// Never throws (D-01 house style). All writes are confined to mkdtemp-created
// scratch dirs, never the repo root (test harness → filesystem trust boundary).

const SCAFFOLD_PATHS = [
  ['skills', 'hello-world', 'SKILL.md'],
  ['shared', 'references', '.gitkeep'],
  ['motto.yaml'],
  ['.gitignore'],
  ['.claude-plugin', 'marketplace.json'],
];

describe('scaffoldProject happy path', () => {
  let tempDir;
  let result;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    result = await scaffoldProject(tempDir, { name: 'hello-proj' });
  });

  after(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('returns ok:true', () => {
    assert.strictEqual(result.ok, true, `scaffold failed:\n${JSON.stringify(result.errors, null, 2)}`);
  });

  for (const segments of SCAFFOLD_PATHS) {
    it(`writes ${segments.join('/')}`, async () => {
      await stat(join(tempDir, ...segments));
      // stat throws ENOENT if missing; test fails with a clear error code
    });
  }
});

describe('scaffoldProject default name (INIT-01)', () => {
  let scratchDir;
  let tempDir;
  let result;
  const basenameName = 'sample-project';

  before(async () => {
    // mkdtemp's random suffix can include uppercase characters (NAME_KEBAB-
    // invalid), so nest a deterministic, guaranteed-valid kebab basename
    // inside the scratch dir rather than relying on mkdtemp's own basename.
    scratchDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    tempDir = join(scratchDir, basenameName);
    await mkdir(tempDir);
    result = await scaffoldProject(tempDir, {});
  });

  after(async () => {
    if (scratchDir) await rm(scratchDir, { recursive: true, force: true });
  });

  it('returns ok:true using the cwd basename as the effective name', () => {
    assert.strictEqual(result.ok, true, `scaffold failed:\n${JSON.stringify(result.errors, null, 2)}`);
  });

  it('motto.yaml name/plugins.public equal the temp dir basename', async () => {
    const text = await readFile(join(tempDir, 'motto.yaml'), 'utf8');
    assert.ok(text.includes(`name: ${basenameName}`), `expected motto.yaml name: ${basenameName}, got:\n${text}`);
    assert.ok(
      text.includes(`public: ${basenameName}`),
      `expected motto.yaml plugins.public: ${basenameName}, got:\n${text}`,
    );
  });
});

describe('scaffoldProject invalid name (INIT-05, D-08)', () => {
  let tempDir;
  let result;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    result = await scaffoldProject(tempDir, { name: 'My Project' });
  });

  after(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('returns ok:false, reason:invalid-name, suggestion:my-project', () => {
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.reason, 'invalid-name');
    assert.strictEqual(result.suggestion, 'my-project');
  });

  it('writes nothing — target dir remains empty', async () => {
    const entries = await readdir(tempDir);
    assert.deepStrictEqual(entries, []);
  });
});

describe('scaffoldProject adversarial names (Pitfall 1 / T-10-01)', () => {
  const adversarialNames = [
    'evil:name',
    'evil"name',
    '../evil',
    '0leading-digit',
  ];

  for (const name of adversarialNames) {
    describe(`name "${name}"`, () => {
      let tempDir;
      let result;

      before(async () => {
        tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
        result = await scaffoldProject(tempDir, { name });
      });

      after(async () => {
        if (tempDir) await rm(tempDir, { recursive: true, force: true });
      });

      it('returns ok:false, reason:invalid-name', () => {
        assert.strictEqual(result.ok, false, `expected rejection for adversarial name "${name}"`);
        assert.strictEqual(result.reason, 'invalid-name');
      });

      it('writes nothing — target dir remains empty', async () => {
        const entries = await readdir(tempDir);
        assert.deepStrictEqual(entries, [], `expected no writes for adversarial name "${name}"`);
      });
    });
  }
});

describe('scaffoldProject non-empty guard + allowlist (INIT-04, D-05)', () => {
  it('refuses a dir containing an unrelated file, offending contains it', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    try {
      await writeFile(join(tempDir, 'foo.txt'), 'unrelated');
      // Explicit valid name — mkdtemp's random basename can itself be
      // NAME_KEBAB-invalid (e.g. uppercase chars), which would surface as
      // reason:'invalid-name' before the empty-dir guard even runs.
      const result = await scaffoldProject(tempDir, { name: 'hello-proj' });
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'not-empty');
      assert.ok(result.offending.includes('foo.txt'), `expected offending to include foo.txt, got: ${JSON.stringify(result.offending)}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('allows a dir containing only .git and .DS_Store (allowlist)', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    try {
      await mkdir(join(tempDir, '.git'));
      await writeFile(join(tempDir, '.DS_Store'), '');
      const result = await scaffoldProject(tempDir, { name: 'hello-proj' });
      assert.strictEqual(result.ok, true, `scaffold failed:\n${JSON.stringify(result.errors, null, 2)}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('scaffoldProject offending-list cap (D-07)', () => {
  it('offending is deterministically sorted with all 7 unrelated entries', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    try {
      const unrelated = ['zeta.txt', 'alpha.txt', 'gamma.txt', 'delta.txt', 'epsilon.txt', 'beta.txt', 'eta.txt'];
      for (const name of unrelated) {
        await writeFile(join(tempDir, name), '');
      }
      // Explicit valid name — same rationale as the guard test above.
      const result = await scaffoldProject(tempDir, { name: 'hello-proj' });
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.reason, 'not-empty');
      assert.strictEqual(result.offending.length, 7, `expected 7 offending entries, got: ${JSON.stringify(result.offending)}`);
      const sorted = [...result.offending].sort((a, b) => a.localeCompare(b));
      assert.deepStrictEqual(result.offending, sorted, 'offending list must be deterministically sorted');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('scaffoldProject --force overwrite-only (INIT-04, D-06)', () => {
  let tempDir;
  let result;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    await writeFile(join(tempDir, 'keep.txt'), 'do not delete me');
    result = await scaffoldProject(tempDir, { name: 'hello-proj', force: true });
  });

  after(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('returns ok:true', () => {
    assert.strictEqual(result.ok, true, `scaffold failed:\n${JSON.stringify(result.errors, null, 2)}`);
  });

  for (const segments of SCAFFOLD_PATHS) {
    it(`writes ${segments.join('/')}`, async () => {
      await stat(join(tempDir, ...segments));
    });
  }

  it('keep.txt still exists (force overwrites scaffold paths only, deletes nothing)', async () => {
    const text = await readFile(join(tempDir, 'keep.txt'), 'utf8');
    assert.strictEqual(text, 'do not delete me');
  });
});

describe('scaffoldProject content shape', () => {
  let tempDir;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    const result = await scaffoldProject(tempDir, { name: 'hello-proj' });
    if (!result.ok) {
      throw new Error(`scaffold failed — content assertions skipped:\n${JSON.stringify(result.errors, null, 2)}`);
    }
  });

  after(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('.gitignore contains dist/private/ and no standalone dist/ line (INIT-06)', async () => {
    const text = await readFile(join(tempDir, '.gitignore'), 'utf8');
    assert.ok(text.includes('dist/private/'), `expected .gitignore to contain dist/private/, got:\n${text}`);
    const hasStandaloneDist = text
      .split('\n')
      .some((line) => line.trim() === 'dist/');
    assert.strictEqual(hasStandaloneDist, false, `expected no standalone dist/ line, got:\n${text}`);
  });

  it('marketplace.json plugins[0].source is ./dist/public/, name matches, no owner.email (INIT-03)', async () => {
    const raw = await readFile(join(tempDir, '.claude-plugin', 'marketplace.json'), 'utf8');
    const manifest = JSON.parse(raw);
    assert.strictEqual(manifest.plugins[0].source, './dist/public/');
    assert.strictEqual(manifest.name, 'hello-proj');
    assert.strictEqual(manifest.plugins[0].name, 'hello-proj');
    assert.strictEqual(manifest.owner?.email, undefined, 'expected no owner.email key');
  });

  it('motto.yaml has no plugins.private line', async () => {
    const text = await readFile(join(tempDir, 'motto.yaml'), 'utf8');
    assert.ok(!/^\s*private:/m.test(text), `expected no plugins.private line, got:\n${text}`);
  });
});
