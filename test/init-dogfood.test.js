import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scaffoldProject } from '../src/init.js';
import { lintProject } from '../src/lint.js';
import { buildProject } from '../src/build.js';

// ── INIT-02 permanent guard ──────────────────────────────────────────────────
// This test proves the scaffolded starter skill passes `motto lint` and
// `motto build` with ZERO edits, from nothing but scaffoldProject itself.
// Unlike test/dogfood.test.js (which copies THIS repo's own skills/shared/
// motto.yaml into a tempDir), this test copies nothing — the whole point is
// that scaffoldProject alone must produce a buildable project.
describe('init dogfood (INIT-02)', () => {
  let tempDir;
  let scaffoldResult;
  let lintResult;
  let buildResult;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-init-dogfood-'));

    scaffoldResult = await scaffoldProject(tempDir, { name: 'sample-project' });
    if (!scaffoldResult.ok) {
      throw new Error(
        `init dogfood scaffold failed — lint/build assertions skipped. Root cause:\n${JSON.stringify(scaffoldResult.errors, null, 2)}`,
      );
    }

    lintResult = await lintProject(tempDir);
    if (!lintResult.ok) {
      throw new Error(
        `init dogfood lint failed — build assertions skipped. Root cause:\n${JSON.stringify(lintResult.errors, null, 2)}`,
      );
    }

    buildResult = await buildProject(tempDir);
    if (!buildResult.ok) {
      throw new Error(
        `init dogfood build failed — dist/ assertions skipped. Root cause:\n${JSON.stringify(buildResult.errors, null, 2)}`,
      );
    }
  });

  after(async () => {
    // Guard with `if (tempDir)` so cleanup runs even when before() throws before assignment.
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  // ── Return shapes ────────────────────────────────────────────────────────
  it('scaffoldProject returns ok:true', () => {
    assert.strictEqual(scaffoldResult.ok, true);
  });

  it('lintProject returns ok:true with count=1 (one starter skill)', () => {
    assert.strictEqual(
      lintResult.ok,
      true,
      `lint failed:\n${JSON.stringify(lintResult.errors, null, 2)}`,
    );
    assert.strictEqual(lintResult.count, 1, `expected 1 skill, got ${lintResult.count}`);
    assert.deepStrictEqual(lintResult.errors, []);
  });

  it('buildProject returns ok:true with skillCount=1 and bucketCount=1 (public only)', () => {
    assert.strictEqual(
      buildResult.ok,
      true,
      `build failed:\n${JSON.stringify(buildResult.errors, null, 2)}`,
    );
    assert.strictEqual(buildResult.skillCount, 1);
    assert.strictEqual(buildResult.bucketCount, 1); // public only — scaffold has no private skills
    assert.deepStrictEqual(buildResult.errors, []);
  });

  // ── Source scaffold artifacts ────────────────────────────────────────────
  it('skills/hello-world/SKILL.md exists', async () => {
    await stat(join(tempDir, 'skills', 'hello-world', 'SKILL.md'));
  });

  it('shared/references/.gitkeep exists (explicit — lint/build ignore it)', async () => {
    // An explicit stat is required here: lintProject/buildProject never read
    // .gitkeep, so lint/build passing does NOT prove this file exists
    // (RESEARCH Open Question 2 / Pitfall 5).
    await stat(join(tempDir, 'shared', 'references', '.gitkeep'));
  });

  it('motto.yaml exists', async () => {
    await stat(join(tempDir, 'motto.yaml'));
  });

  it('.gitignore exists', async () => {
    await stat(join(tempDir, '.gitignore'));
  });

  it('.claude-plugin/marketplace.json exists', async () => {
    await stat(join(tempDir, '.claude-plugin', 'marketplace.json'));
  });

  // ── Built output ──────────────────────────────────────────────────────────
  it('dist/public/hello-world/SKILL.md exists (build produced the plugin with zero edits)', async () => {
    await stat(join(tempDir, 'dist', 'public', 'hello-world', 'SKILL.md'));
  });

  // ── Ship-flow contract ────────────────────────────────────────────────────
  it('.gitignore contains dist/private/ and no standalone dist/ line (INIT-06)', async () => {
    const text = await readFile(join(tempDir, '.gitignore'), 'utf8');
    assert.ok(text.includes('dist/private/'), `expected .gitignore to contain dist/private/, got:\n${text}`);
    const hasStandaloneDist = text.split('\n').some((line) => line.trim() === 'dist/');
    assert.strictEqual(hasStandaloneDist, false, `expected no standalone dist/ line, got:\n${text}`);
  });
});
