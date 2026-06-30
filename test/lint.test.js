import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { lintProject } from '../src/lint.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Generate a valid SKILL.md whose name frontmatter matches the directory name.
 * All required fields are present and the body has an H1 title and Role line.
 * @param {string} name - skill directory name (must be letter-start kebab-case)
 * @returns {string}
 */
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

/**
 * Generate a valid SKILL.md that declares shared_references entries.
 * @param {string} name - skill directory name
 * @param {string[]} refs - shared reference basenames (without .md)
 * @returns {string}
 */
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

/** Minimal valid motto.yaml content satisfying all required CONF fields. */
const VALID_CONFIG = [
  'name: my-project',
  'version: 1.0.0',
  'description: My skills collection',
  'plugins:',
  '  public: my-plugin',
  '',
].join('\n');

// ---------------------------------------------------------------------------
// 1. Happy path (D2-11, LINT-06)
// ---------------------------------------------------------------------------

describe('lintProject — happy path', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await mkdir(join(root, 'skills', 'my-skill'), { recursive: true });
    await writeFile(join(root, 'skills', 'my-skill', 'SKILL.md'), makeSkillMd('my-skill'));
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns ok:true and empty errors for a project with one valid skill and valid config', async () => {
    const result = await lintProject(root);
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.errors, []);
  });
});

// ---------------------------------------------------------------------------
// 2. Error collection across all skills (LINT-06, D2-06)
// ---------------------------------------------------------------------------

describe('lintProject — error collection across all skills', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    // Two skills, each missing SKILL.md — both must produce errors
    await mkdir(join(root, 'skills', 'skill-one'), { recursive: true });
    await mkdir(join(root, 'skills', 'skill-two'), { recursive: true });
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('collects errors from all skills without stopping at the first bad skill', async () => {
    const result = await lintProject(root);
    assert.strictEqual(result.ok, false);
    const skillsWithErrors = result.errors.map((e) => e.skill);
    assert.ok(skillsWithErrors.includes('skill-one'), 'skill-one must be in errors');
    assert.ok(skillsWithErrors.includes('skill-two'), 'skill-two must be in errors');
  });
});

// ---------------------------------------------------------------------------
// 3. Alphabetical determinism (LINT-07, D2-03)
// ---------------------------------------------------------------------------

describe('lintProject — alphabetical skill ordering', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    // Create in reverse alphabetical filesystem order to verify the sort
    await mkdir(join(root, 'skills', 'zeta-skill'), { recursive: true });
    await mkdir(join(root, 'skills', 'alpha-skill'), { recursive: true });
    // Both dirs have no SKILL.md so both produce errors
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reports skill errors in alphabetical order regardless of creation order', async () => {
    const result = await lintProject(root);
    assert.strictEqual(result.ok, false);
    const alphaIdx = result.errors.findIndex((e) => e.skill === 'alpha-skill');
    const zetaIdx = result.errors.findIndex((e) => e.skill === 'zeta-skill');
    assert.ok(alphaIdx !== -1, 'alpha-skill must appear in errors');
    assert.ok(zetaIdx !== -1, 'zeta-skill must appear in errors');
    assert.ok(
      alphaIdx < zetaIdx,
      `alpha-skill (idx ${alphaIdx}) must precede zeta-skill (idx ${zetaIdx})`,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Per-file error isolation (LINT-07, D2-06)
// ---------------------------------------------------------------------------

describe('lintProject — per-file error isolation', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    // bad-skill: YAML frontmatter with an unterminated string literal
    await mkdir(join(root, 'skills', 'bad-skill'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'bad-skill', 'SKILL.md'),
      '---\nname: "unterminated string\n---\n# bad-skill\n\n**Role:** Helper.\n',
    );
    // good-skill: fully valid SKILL.md
    await mkdir(join(root, 'skills', 'good-skill'), { recursive: true });
    await writeFile(join(root, 'skills', 'good-skill', 'SKILL.md'), makeSkillMd('good-skill'));
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reports bad-skill errors and lints good-skill normally — lintProject never throws', async () => {
    const result = await lintProject(root);
    // lintProject must return normally, not throw
    assert.ok(typeof result === 'object', 'lintProject must return an object');
    // bad-skill produces at least one error
    const badErrors = result.errors.filter((e) => e.skill === 'bad-skill');
    assert.ok(badErrors.length > 0, 'bad-skill must contribute at least one error');
    // good-skill contributes zero errors
    const goodErrors = result.errors.filter((e) => e.skill === 'good-skill');
    assert.strictEqual(goodErrors.length, 0, 'good-skill must contribute no errors');
  });
});

// ---------------------------------------------------------------------------
// 5. Missing SKILL.md (D2-05)
// ---------------------------------------------------------------------------

describe('lintProject — missing SKILL.md', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    // Candidate skill dir exists but has no SKILL.md file
    await mkdir(join(root, 'skills', 'empty-skill'), { recursive: true });
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reports an error attributed to the dir name mentioning SKILL.md', async () => {
    const result = await lintProject(root);
    assert.strictEqual(result.ok, false);
    const entry = result.errors.find((e) => e.skill === 'empty-skill');
    assert.ok(entry, 'error must be attributed to empty-skill');
    assert.ok(
      /SKILL\.md/i.test(entry.message),
      `error message must mention SKILL.md, got: "${entry.message}"`,
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Config errors reported before skill errors (D2-09, D2-10)
// ---------------------------------------------------------------------------

describe('lintProject — config errors precede skill errors', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    // Config missing required version field — produces a config error
    await writeFile(
      join(root, 'motto.yaml'),
      'name: my-project\ndescription: My project\nplugins:\n  public: my-plugin\n',
    );
    // A skill with an error (no SKILL.md)
    await mkdir(join(root, 'skills', 'some-skill'), { recursive: true });
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('places motto.yaml-labelled errors before skill errors in result.errors', async () => {
    const result = await lintProject(root);
    assert.strictEqual(result.ok, false);
    const configEntry = result.errors.find((e) => e.skill === 'motto.yaml');
    assert.ok(configEntry, 'must have at least one motto.yaml-labelled error');
    const configIdx = result.errors.indexOf(configEntry);
    const firstSkillIdx = result.errors.findIndex((e) => e.skill !== 'motto.yaml');
    // Either no skill errors (unlikely given our setup) or config comes first
    assert.ok(
      firstSkillIdx === -1 || configIdx < firstSkillIdx,
      `config error at idx ${configIdx} must precede first skill error at idx ${firstSkillIdx}`,
    );
  });
});

// ---------------------------------------------------------------------------
// 7. No skills found (D2-13)
// ---------------------------------------------------------------------------

describe('lintProject — zero skills', () => {
  let rootMissing;
  let rootEmpty;

  before(async () => {
    // Case A: skills/ directory entirely absent
    rootMissing = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await writeFile(join(rootMissing, 'motto.yaml'), VALID_CONFIG);

    // Case B: skills/ dir exists but contains no candidate subdirectories
    rootEmpty = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await mkdir(join(rootEmpty, 'skills'), { recursive: true });
    await writeFile(join(rootEmpty, 'motto.yaml'), VALID_CONFIG);
  });

  after(async () => {
    await rm(rootMissing, { recursive: true, force: true });
    await rm(rootEmpty, { recursive: true, force: true });
  });

  it('(A) reports "no skills found" when skills/ directory is absent', async () => {
    const result = await lintProject(rootMissing);
    assert.strictEqual(result.ok, false);
    assert.ok(
      result.errors.some((e) => /no skills found/i.test(e.message)),
      `expected "no skills found" error, got: ${JSON.stringify(result.errors)}`,
    );
  });

  it('(B) reports "no skills found" when skills/ exists but is empty', async () => {
    const result = await lintProject(rootEmpty);
    assert.strictEqual(result.ok, false);
    assert.ok(
      result.errors.some((e) => /no skills found/i.test(e.message)),
      `expected "no skills found" error, got: ${JSON.stringify(result.errors)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Shared references resolution (D2-07, D2-08)
// ---------------------------------------------------------------------------

describe('lintProject — shared references resolution', () => {
  let rootResolved;
  let rootUnresolved;

  before(async () => {
    // Case A: shared/references/my-ref.md exists — skill resolves clean
    rootResolved = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await mkdir(join(rootResolved, 'skills', 'my-skill'), { recursive: true });
    await mkdir(join(rootResolved, 'shared', 'references'), { recursive: true });
    await writeFile(join(rootResolved, 'shared', 'references', 'my-ref.md'), '# My Ref\n');
    await writeFile(
      join(rootResolved, 'skills', 'my-skill', 'SKILL.md'),
      makeSkillWithRefs('my-skill', ['my-ref']),
    );
    await writeFile(join(rootResolved, 'motto.yaml'), VALID_CONFIG);

    // Case B: shared/ dir absent — empty Set fallback → unresolved error
    rootUnresolved = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await mkdir(join(rootUnresolved, 'skills', 'my-skill'), { recursive: true });
    await writeFile(
      join(rootUnresolved, 'skills', 'my-skill', 'SKILL.md'),
      makeSkillWithRefs('my-skill', ['my-ref']),
    );
    await writeFile(join(rootUnresolved, 'motto.yaml'), VALID_CONFIG);
  });

  after(async () => {
    await rm(rootResolved, { recursive: true, force: true });
    await rm(rootUnresolved, { recursive: true, force: true });
  });

  it('(A) resolves shared_references cleanly when shared/references/<name>.md exists', async () => {
    const result = await lintProject(rootResolved);
    assert.strictEqual(
      result.ok,
      true,
      `expected ok:true, got errors: ${JSON.stringify(result.errors)}`,
    );
    assert.deepStrictEqual(result.errors, []);
  });

  it('(B) reports an unresolved error when shared/ is absent (empty-Set fallback, D2-08)', async () => {
    const result = await lintProject(rootUnresolved);
    assert.strictEqual(result.ok, false);
    const unresolved = result.errors.find(
      (e) => e.skill === 'my-skill' && /my-ref/i.test(e.message),
    );
    assert.ok(
      unresolved,
      `expected unresolved shared_references error, got: ${JSON.stringify(result.errors)}`,
    );
  });
});
