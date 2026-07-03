import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, symlink } from 'node:fs/promises';
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

/**
 * Generate a valid SKILL.md with a given audience and arbitrary extra
 * frontmatter lines injected after the mandatory fields — used for
 * outputs:/dependencies: fs-layer fixtures.
 * @param {string} name - skill directory name
 * @param {string} audience - "public" | "private"
 * @param {string[]} extraLines - raw YAML lines appended to the frontmatter
 * @returns {string}
 */
function makeSkillWithExtra(name, audience, extraLines = []) {
  return [
    '---',
    `name: ${name}`,
    `description: A skill named ${name} — use when you need ${name}`,
    `audience: ${audience}`,
    ...extraLines,
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

// ---------------------------------------------------------------------------
// 9. outputs: fs-layer — existence + symlink-escape (VAL-01)
// ---------------------------------------------------------------------------

describe('lintProject — outputs fs-layer (VAL-01)', () => {
  let root;
  let symlinkSkipped = false;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);

    // Case A: outputs entry pointing at a file that EXISTS inside the skill dir
    await mkdir(join(root, 'skills', 'output-ok'), { recursive: true });
    await writeFile(join(root, 'skills', 'output-ok', 'notes.txt'), 'hello\n');
    await writeFile(
      join(root, 'skills', 'output-ok', 'SKILL.md'),
      makeSkillWithExtra('output-ok', 'public', ['outputs:', '  doc: notes.txt']),
    );

    // Case B: outputs entry naming a MISSING file
    await mkdir(join(root, 'skills', 'output-missing'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'output-missing', 'SKILL.md'),
      makeSkillWithExtra('output-missing', 'public', ['outputs:', '  doc: missing.txt']),
    );

    // Case C: outputs entry naming a file that is a symlink escaping the skill dir
    await mkdir(join(root, 'skills', 'output-symlink-escape'), { recursive: true });
    await mkdir(join(root, 'outside'), { recursive: true });
    await writeFile(join(root, 'outside', 'secret.txt'), 'outside content\n');
    try {
      await symlink(
        join(root, 'outside', 'secret.txt'),
        join(root, 'skills', 'output-symlink-escape', 'escape.txt'),
      );
    } catch {
      symlinkSkipped = true; // sandbox filesystem may not permit symlink creation
    }
    await writeFile(
      join(root, 'skills', 'output-symlink-escape', 'SKILL.md'),
      makeSkillWithExtra('output-symlink-escape', 'public', ['outputs:', '  doc: escape.txt']),
    );
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('(A) an outputs entry pointing at an existing file inside the skill dir reports no outputs error', async () => {
    const result = await lintProject(root);
    const entryErrors = result.errors.filter((e) => e.skill === 'output-ok');
    assert.deepStrictEqual(entryErrors, []);
  });

  it('(B) an outputs entry naming a missing file reports a "does not exist" error', async () => {
    const result = await lintProject(root);
    const entry = result.errors.find(
      (e) => e.skill === 'output-missing' && /does not exist/i.test(e.message),
    );
    assert.ok(entry, `expected a "does not exist" error, got: ${JSON.stringify(result.errors)}`);
  });

  it('(C) a symlink escaping the skill dir reports an "escapes the skill directory via symlink" error (RESEARCH Assumption A1)', async (t) => {
    if (symlinkSkipped) {
      t.skip('symlink creation not permitted in this sandbox filesystem');
      return;
    }
    const result = await lintProject(root);
    const entry = result.errors.find(
      (e) =>
        e.skill === 'output-symlink-escape' &&
        /escapes the skill directory via symlink/i.test(e.message),
    );
    assert.ok(entry, `expected a symlink-escape error, got: ${JSON.stringify(result.errors)}`);
  });
});

// ---------------------------------------------------------------------------
// 10. dependencies: cross-skill resolution (VAL-02)
// ---------------------------------------------------------------------------

describe('lintProject — dependencies cross-skill resolution (VAL-02)', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);

    await mkdir(join(root, 'skills', 'dep-target'), { recursive: true });
    await writeFile(join(root, 'skills', 'dep-target', 'SKILL.md'), makeSkillMd('dep-target'));

    await mkdir(join(root, 'skills', 'dep-source'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'dep-source', 'SKILL.md'),
      makeSkillWithExtra('dep-source', 'public', [
        'dependencies:',
        '  - dep-target',
        '  - nonexistent-skill',
      ]),
    );
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('a bare dependency entry naming an existing skill resolves clean (no error for it)', async () => {
    const result = await lintProject(root);
    const resolvedErr = result.errors.find(
      (e) => e.skill === 'dep-source' && /"dep-target"/.test(e.message),
    );
    assert.strictEqual(
      resolvedErr,
      undefined,
      `dep-target should resolve clean, got: ${JSON.stringify(result.errors)}`,
    );
  });

  it('a bare dependency entry naming a nonexistent skill reports "not found (available: ...)"', async () => {
    const result = await lintProject(root);
    const entry = result.errors.find(
      (e) => e.skill === 'dep-source' && /nonexistent-skill.*not found/i.test(e.message),
    );
    assert.ok(entry, `expected a not-found error, got: ${JSON.stringify(result.errors)}`);
  });
});

// ---------------------------------------------------------------------------
// 11. dependencies: audience-direction guard (VAL-03)
// ---------------------------------------------------------------------------

describe('lintProject — dependencies audience-direction guard (VAL-03)', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);

    await mkdir(join(root, 'skills', 'private-target'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'private-target', 'SKILL.md'),
      makeSkillWithExtra('private-target', 'private'),
    );

    await mkdir(join(root, 'skills', 'public-target'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'public-target', 'SKILL.md'),
      makeSkillWithExtra('public-target', 'public'),
    );

    // public -> private: MUST fail (the guarded direction)
    await mkdir(join(root, 'skills', 'public-source'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'public-source', 'SKILL.md'),
      makeSkillWithExtra('public-source', 'public', ['dependencies:', '  - private-target']),
    );

    // private -> public: MUST pass
    await mkdir(join(root, 'skills', 'private-source'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'private-source', 'SKILL.md'),
      makeSkillWithExtra('private-source', 'private', ['dependencies:', '  - public-target']),
    );

    // public -> public: MUST pass
    await mkdir(join(root, 'skills', 'public-source-two'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'public-source-two', 'SKILL.md'),
      makeSkillWithExtra('public-source-two', 'public', ['dependencies:', '  - public-target']),
    );
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('a public skill depending on a private skill reports the audience-direction error', async () => {
    const result = await lintProject(root);
    const entry = result.errors.find(
      (e) => e.skill === 'public-source' && /audience-direction guard/i.test(e.message),
    );
    assert.ok(entry, `expected audience-direction error, got: ${JSON.stringify(result.errors)}`);
  });

  it('private->public and public->public both pass with zero dependency errors', async () => {
    const result = await lintProject(root);
    const privateSourceErrors = result.errors.filter((e) => e.skill === 'private-source');
    const publicSourceTwoErrors = result.errors.filter((e) => e.skill === 'public-source-two');
    assert.deepStrictEqual(privateSourceErrors, []);
    assert.deepStrictEqual(publicSourceTwoErrors, []);
  });
});

// ---------------------------------------------------------------------------
// 12. No double-reporting from the loadSkillAudiences pre-pass (Pitfall 3)
// ---------------------------------------------------------------------------

describe('lintProject — no double-reporting from loadSkillAudiences pre-pass (Pitfall 3)', () => {
  let root;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'motto-lint-'));
    await writeFile(join(root, 'motto.yaml'), VALID_CONFIG);

    // Malformed SKILL.md — broken YAML frontmatter (unterminated string)
    await mkdir(join(root, 'skills', 'malformed-skill'), { recursive: true });
    await writeFile(
      join(root, 'skills', 'malformed-skill', 'SKILL.md'),
      '---\nname: "unterminated string\n---\n# malformed-skill\n\n**Role:** Helper.\n',
    );

    // Valid skill that depends on nothing
    await mkdir(join(root, 'skills', 'clean-skill'), { recursive: true });
    await writeFile(join(root, 'skills', 'clean-skill', 'SKILL.md'), makeSkillMd('clean-skill'));
  });

  after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("the malformed skill's YAML parse error appears exactly once (loadSkillAudiences must not double-report)", async () => {
    const result = await lintProject(root);
    const parseErrors = result.errors.filter(
      (e) => e.skill === 'malformed-skill' && /missing closing/i.test(e.message),
    );
    assert.strictEqual(
      parseErrors.length,
      1,
      `expected exactly 1 parse error, got ${parseErrors.length}: ${JSON.stringify(parseErrors)}`,
    );
  });

  it('the clean skill contributes zero errors', async () => {
    const result = await lintProject(root);
    const cleanErrors = result.errors.filter((e) => e.skill === 'clean-skill');
    assert.deepStrictEqual(cleanErrors, []);
  });
});
