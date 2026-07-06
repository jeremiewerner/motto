import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { scaffoldProject } from '../src/init.js';

const CLI_PATH = fileURLToPath(new URL('../bin/motto.js', import.meta.url));

/**
 * Malformed SKILL.md (unterminated YAML string) — reused from
 * test/lint.test.js's fixture pattern to force lintProject/buildProject
 * into an `ok:false` result deterministically.
 */
const MALFORMED_SKILL_MD =
  '---\nname: "unterminated string\n---\n# malformed-skill\n\n<role>\nHelper.\n</role>\n';

/**
 * Spawn the CLI as a real child process — this phase's surface (argv
 * branches, exit codes, stdout/stderr routing) is CLI-only and must be
 * exercised through a spawned process, not by importing dispatch logic.
 *
 * @param {string[]} args
 * @param {{cwd?: string}} [opts]
 */
function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd,
  });
}

/**
 * Scaffold a clean project fixture into a fresh tempdir. Throws if scaffold
 * fails (test setup bug, not a case under test).
 *
 * @param {string} prefix - mkdtemp prefix, also doubles as a readable label
 * @param {string} name - project name passed to scaffoldProject
 * @returns {Promise<string>} the tempdir path
 */
async function scaffoldCleanFixture(prefix, name) {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  const result = await scaffoldProject(dir, { name });
  if (!result.ok) {
    throw new Error(`scaffold failed for ${prefix} fixture: ${JSON.stringify(result.errors)}`);
  }
  return dir;
}

/**
 * Scaffold a project fixture, then corrupt its starter skill's SKILL.md so
 * lintProject/buildProject deterministically return `ok:false` with a
 * populated errors array.
 *
 * @param {string} prefix
 * @param {string} name
 * @returns {Promise<string>} the tempdir path
 */
async function scaffoldFailingFixture(prefix, name) {
  const dir = await scaffoldCleanFixture(prefix, name);
  await writeFile(join(dir, 'skills', 'hello-world', 'SKILL.md'), MALFORMED_SKILL_MD);
  return dir;
}

describe('CLI help (CLIX-03, D-01..D-05, D-08, D-09)', () => {
  it('--help: status 0, stdout has usage + all 3 command names, stderr empty', () => {
    const r = runCli(['--help']);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto/);
    assert.match(r.stdout, /\binit\b/);
    assert.match(r.stdout, /\blint\b/);
    assert.match(r.stdout, /\bbuild\b/);
    assert.strictEqual(r.stderr, '');
  });

  it('-h: same global help, status 0, stderr empty', () => {
    const r = runCli(['-h']);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto/);
    assert.match(r.stdout, /\binit\b/);
    assert.match(r.stdout, /\blint\b/);
    assert.match(r.stdout, /\bbuild\b/);
    assert.strictEqual(r.stderr, '');
  });

  it('bare invocation (no args): status 0, stdout has global help (regression vs old stderr-usage-exit-1 — D-03)', () => {
    const r = runCli([]);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto/);
    assert.match(r.stdout, /\binit\b/);
    assert.match(r.stdout, /\blint\b/);
    assert.match(r.stdout, /\bbuild\b/);
  });

  it('lint --help: status 0, stdout has focused usage, command did NOT run (no "skills OK" line)', () => {
    const r = runCli(['lint', '--help']);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto lint/);
    assert.doesNotMatch(r.stdout, /skills OK/);
  });

  it('build --help: status 0, stdout has focused usage, command did NOT run', () => {
    const r = runCli(['build', '--help']);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto build/);
  });

  it('init --help: status 0, stdout has focused usage, command did NOT run', () => {
    const r = runCli(['init', '--help']);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto init/);
  });

  it('--help lint (flag before subcommand): stdout is GLOBAL help, not lint\'s focused block (D-09)', () => {
    const r = runCli(['--help', 'lint']);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto <init\|lint\|build>/);
    assert.match(r.stdout, /\binit\b/);
    assert.match(r.stdout, /\blint\b/);
    assert.match(r.stdout, /\bbuild\b/);
    // Lint's FOCUSED usage line ("usage: motto lint [path]") must be absent —
    // this distinguishes global help from lint's per-subcommand block, which
    // shares the same one-line command description text in the global list.
    assert.doesNotMatch(r.stdout, /usage: motto lint/);
  });

  it('--format text --help lint (string-flag value before --help before subcommand): stdout is GLOBAL help (WR-01 regression)', () => {
    // --format's VALUE ("text") must not be misidentified as the first
    // positional/subcommand token — before this phase's --format, every
    // registered option was boolean, so a plain non-dash argv scan was sound.
    const r = runCli(['--format', 'text', '--help', 'lint']);
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /usage: motto <init\|lint\|build>/);
    assert.doesNotMatch(r.stdout, /usage: motto lint/);
  });
});

describe('CLI unknown command / unknown flag (D-04, D-05)', () => {
  it("foo (unknown command): status 1, stderr has unknown command 'foo' + usage line + hint", () => {
    const r = runCli(['foo']);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /unknown command 'foo'/);
    assert.match(r.stderr, /usage: motto <init\|lint\|build>/);
    assert.match(r.stderr, /run 'motto --help' for details/);
  });

  it('--bogus (unknown flag): status 1, stderr names the offending flag + usage line + hint', () => {
    const r = runCli(['--bogus']);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /--bogus/);
    assert.match(r.stderr, /usage: motto <init\|lint\|build>/);
    assert.match(r.stderr, /run 'motto --help' for details/);
  });
});

describe('CLI [path] targeting (CLIX-04, D-06, D-07)', () => {
  let tempDir;
  let projectName;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'motto-cli-test-'));
    projectName = 'sample-proj';
    const result = await scaffoldProject(join(tempDir, projectName), { name: projectName });
    if (!result.ok) {
      throw new Error(`scaffold failed for cli.test.js fixture: ${JSON.stringify(result.errors)}`);
    }
  });

  after(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it('lint <tempdir>: status 0, stdout has "skills OK" — targets the given path, not cwd', () => {
    // cwd is set to tmpdir() itself (a directory with no motto.yaml) to prove
    // the CLI reads the explicit [path] argument, not process.cwd().
    const r = runCli(['lint', join(tempDir, projectName)], { cwd: tmpdir() });
    assert.strictEqual(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.match(r.stdout, /skills OK/);
  });

  it('build <relative-path>: status 0, printed outDir is the as-typed relative path, not absolutized (D-07)', () => {
    const relOutDirPrefix = join(basename(projectName), 'dist');
    const r = runCli(['build', projectName], { cwd: tempDir });
    assert.strictEqual(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.match(r.stdout, /✓ built/);
    assert.ok(
      r.stdout.includes(relOutDirPrefix),
      `expected stdout to contain as-typed path "${relOutDirPrefix}", got:\n${r.stdout}`,
    );
    // Not absolutized: the printed line must not contain the tempDir's absolute prefix.
    assert.ok(
      !r.stdout.includes(tempDir),
      `expected stdout to NOT contain the absolute tempDir prefix, got:\n${r.stdout}`,
    );
  });

  it('lint (no path): still operates on cwd (unchanged default)', () => {
    const r = runCli(['lint'], { cwd: join(tempDir, projectName) });
    assert.strictEqual(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.match(r.stdout, /skills OK/);
  });

  it('lint /nonexistent/<unique>: status 1, stderr has "directory not found: <path>"', () => {
    const badPath = join(tempDir, 'does-not-exist-xyz');
    const r = runCli(['lint', badPath]);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /directory not found: /);
    assert.ok(r.stderr.includes(badPath), `expected stderr to include "${badPath}", got:\n${r.stderr}`);
  });

  it('build /nonexistent/<unique>: status 1, stderr has "directory not found: <path>"', () => {
    const badPath = join(tempDir, 'also-does-not-exist-xyz');
    const r = runCli(['build', badPath]);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /directory not found: /);
    assert.ok(r.stderr.includes(badPath), `expected stderr to include "${badPath}", got:\n${r.stderr}`);
  });

  it('lint <file-path>: status 1, stderr rejects a file (not a directory) in the same ✗ style', () => {
    // motto.yaml is a file within the scaffolded project — a valid stat target
    // that is not a directory.
    const filePath = join(tempDir, projectName, 'motto.yaml');
    const r = runCli(['lint', filePath]);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /✗ not a directory: /);
  });
});

describe('--quiet (CLIX-01)', () => {
  let cleanDir;
  let failDir;

  before(async () => {
    cleanDir = await scaffoldCleanFixture('motto-cli-quiet-clean-', 'quiet-clean-proj');
    failDir = await scaffoldFailingFixture('motto-cli-quiet-fail-', 'quiet-fail-proj');
  });

  after(async () => {
    if (cleanDir) await rm(cleanDir, { recursive: true, force: true });
    if (failDir) await rm(failDir, { recursive: true, force: true });
  });

  it('lint --quiet on a clean fixture: stdout is empty, exit 0', () => {
    const r = runCli(['lint', '--quiet'], { cwd: cleanDir });
    assert.strictEqual(r.stdout, '', `stderr: ${r.stderr}`);
    assert.strictEqual(r.status, 0);
  });

  it('build --quiet on a clean fixture: stdout is empty, exit 0', () => {
    const r = runCli(['build', '--quiet'], { cwd: cleanDir });
    assert.strictEqual(r.stdout, '', `stderr: ${r.stderr}`);
    assert.strictEqual(r.status, 0);
  });

  it('lint --quiet on a failing fixture: stderr still has ✗ lines, exit 1 (errors still print — Pitfall 2 guard)', () => {
    const r = runCli(['lint', '--quiet'], { cwd: failDir });
    assert.match(r.stderr, /✗/);
    assert.strictEqual(r.status, 1);
  });
});

describe('--format json (CLIX-02)', () => {
  let cleanDir;
  let failDir;

  before(async () => {
    cleanDir = await scaffoldCleanFixture('motto-cli-json-clean-', 'json-clean-proj');
    failDir = await scaffoldFailingFixture('motto-cli-json-fail-', 'json-fail-proj');
  });

  after(async () => {
    if (cleanDir) await rm(cleanDir, { recursive: true, force: true });
    if (failDir) await rm(failDir, { recursive: true, force: true });
  });

  it('lint --format json on a clean fixture: single-line JSON {ok:true, count:<number>} on stdout, stderr empty', () => {
    const r = runCli(['lint', '--format', 'json'], { cwd: cleanDir });
    assert.strictEqual(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.strictEqual(r.stdout.trim().split('\n').length, 1);
    const parsed = JSON.parse(r.stdout);
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(typeof parsed.count, 'number');
    assert.strictEqual(r.stderr, '');
  });

  it('build --format json on a clean fixture: single-line JSON {ok:true, outDir, skillCount, bucketCount}', () => {
    const r = runCli(['build', '--format', 'json'], { cwd: cleanDir });
    assert.strictEqual(r.status, 0, `stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    assert.strictEqual(r.stdout.trim().split('\n').length, 1);
    const parsed = JSON.parse(r.stdout);
    assert.strictEqual(parsed.ok, true);
    assert.ok(parsed.outDir);
    assert.strictEqual(typeof parsed.skillCount, 'number');
    assert.strictEqual(typeof parsed.bucketCount, 'number');
  });

  it('lint --format json on a failing fixture: {ok:false, errors:[...]} on stdout, no duplicate ✗ echo on stderr (D-09)', () => {
    const r = runCli(['lint', '--format', 'json'], { cwd: failDir });
    assert.strictEqual(r.status, 1);
    const parsed = JSON.parse(r.stdout);
    assert.strictEqual(parsed.ok, false);
    assert.ok(Array.isArray(parsed.errors) && parsed.errors.length > 0);
    assert.doesNotMatch(r.stderr, /✗/);
  });

  it('lint <bad-path> --format json (pre-dispatch path-guard failure): empty stdout, plain-text ✗ on stderr, exit 1, no JSON document (D-04)', () => {
    const badPath = join(cleanDir, 'does-not-exist-xyz');
    const r = runCli(['lint', badPath, '--format', 'json']);
    assert.strictEqual(r.status, 1);
    assert.strictEqual(r.stdout, '');
    assert.match(r.stderr, /✗/);
  });

  it('lint --format json --quiet on a failing fixture: JSON doc still prints — quiet never suppresses it (D-08)', () => {
    const r = runCli(['lint', '--format', 'json', '--quiet'], { cwd: failDir });
    assert.strictEqual(r.status, 1);
    const parsed = JSON.parse(r.stdout);
    assert.strictEqual(parsed.ok, false);
  });
});

describe("--format <bad value> (D-10)", () => {
  it("lint --format yaml: unknown format error + usage line on stderr, empty stdout, exit 1, lint does not run", () => {
    const r = runCli(['lint', '--format', 'yaml']);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /unknown format 'yaml'/);
    assert.match(r.stderr, /usage: motto <init\|lint\|build>/);
    assert.strictEqual(r.stdout, '');
  });

  it("build --format yaml: same unknown-format shape as lint", () => {
    const r = runCli(['build', '--format', 'yaml']);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /unknown format 'yaml'/);
    assert.strictEqual(r.stdout, '');
  });

  it('lint --format text equals lint (no flag) — text is the explicit-default alias (D-11)', async () => {
    let dir;
    try {
      dir = await scaffoldCleanFixture('motto-cli-textalias-', 'text-alias-proj');
      const withFlag = runCli(['lint', '--format', 'text'], { cwd: dir });
      const withoutFlag = runCli(['lint'], { cwd: dir });
      assert.strictEqual(withFlag.status, 0, `stderr: ${withFlag.stderr}`);
      assert.strictEqual(withoutFlag.status, 0, `stderr: ${withoutFlag.stderr}`);
      assert.match(withFlag.stdout, /skills OK/);
      assert.strictEqual(withFlag.stdout, withoutFlag.stdout);
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('stdout/stderr split (CLIX-03)', () => {
  let failDir;

  before(async () => {
    failDir = await scaffoldFailingFixture('motto-cli-split-', 'split-proj');
  });

  after(async () => {
    if (failDir) await rm(failDir, { recursive: true, force: true });
  });

  it('lint on a failing fixture: stdout has no ✗ character; ✗ lines appear only in stderr', () => {
    const r = runCli(['lint'], { cwd: failDir });
    assert.strictEqual(r.status, 1);
    assert.ok(!r.stdout.includes('✗'), `expected stdout to have no ✗, got:\n${r.stdout}`);
    assert.match(r.stderr, /✗/);
  });

  it('build on a failing fixture: stdout has no ✗ character; ✗ lines appear only in stderr', () => {
    const r = runCli(['build'], { cwd: failDir });
    assert.strictEqual(r.status, 1);
    assert.ok(!r.stdout.includes('✗'), `expected stdout to have no ✗, got:\n${r.stdout}`);
    assert.match(r.stderr, /✗/);
  });
});

describe('init stderr split (D-07)', () => {
  it('init on a not-empty directory: ✗ line is on stderr, none on stdout', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'motto-cli-init-notempty-'));
    try {
      await writeFile(join(dir, 'existing-file.txt'), 'hi\n');
      // Explicit valid name (D-05 name-validation runs before the
      // not-empty check) — the mkdtemp basename itself may contain
      // uppercase/random chars that fail NAME_KEBAB independently of the
      // not-empty guard under test here.
      const r = runCli(['init', 'notempty-proj'], { cwd: dir });
      assert.strictEqual(r.status, 1);
      assert.match(r.stderr, /✗ directory is not empty/);
      assert.ok(!r.stdout.includes('✗'), `expected stdout to have no ✗, got:\n${r.stdout}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('init on a clean directory: ✓ scaffolded project tree stays on stdout', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'motto-cli-init-clean-'));
    try {
      const r = runCli(['init', 'clean-init-proj'], { cwd: dir });
      assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
      assert.match(r.stdout, /✓ scaffolded project:/);
      assert.ok(!r.stdout.includes('✗'), `expected stdout to have no ✗, got:\n${r.stdout}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('init --format json: rejected as unknown option (D-03, D-11)', async () => {
    // Runs in a fresh tempdir (not the repo root, WR-03) — this test exists
    // specifically to verify the rejection branch; if that branch regresses,
    // the child process would otherwise execute `motto init` against the
    // developer's real working tree.
    const dir = await mkdtemp(join(tmpdir(), 'motto-cli-init-reject-'));
    try {
      const r = runCli(['init', '--format', 'json'], { cwd: dir });
      assert.strictEqual(r.status, 1);
      assert.match(r.stderr, /unknown option/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('init --quiet: rejected as unknown option (D-03, D-11)', async () => {
    // Runs in a fresh tempdir (not the repo root, WR-03) — see rationale
    // above for the --format json test.
    const dir = await mkdtemp(join(tmpdir(), 'motto-cli-init-reject-'));
    try {
      const r = runCli(['init', '--quiet'], { cwd: dir });
      assert.strictEqual(r.status, 1);
      assert.match(r.stderr, /unknown option/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Skew warning is non-blocking (VER-02) — spawned-CLI proof
// ---------------------------------------------------------------------------

/**
 * Hand-edit a scaffolded fixture's motto.yaml mottoVersion line to a fake
 * value guaranteed older than any real Motto release — never asserts
 * against the live literal (Pitfall 6).
 * @param {string} dir - fixture directory (already scaffolded)
 */
async function makeSkewedOlderFixture(dir) {
  const configPath = join(dir, 'motto.yaml');
  const before = await readFile(configPath, 'utf8');
  const after = before.replace(/^mottoVersion:.*$/m, 'mottoVersion: "0.0.1"');
  await writeFile(configPath, after);
}

describe('CLI skew warning is non-blocking (VER-02)', () => {
  it('lint on a skewed-but-valid project: exit code 0, ⚠ line on stderr', async () => {
    const dir = await scaffoldCleanFixture('motto-cli-skew-lint-', 'skew-lint-proj');
    try {
      await makeSkewedOlderFixture(dir);
      const r = runCli(['lint'], { cwd: dir });
      assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
      assert.match(r.stderr, /⚠.*check the upgrade ledger/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('build on a skewed-but-valid project: exit code 0, ⚠ line on stderr', async () => {
    const dir = await scaffoldCleanFixture('motto-cli-skew-build-', 'skew-build-proj');
    try {
      await makeSkewedOlderFixture(dir);
      const r = runCli(['build'], { cwd: dir });
      assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
      assert.match(r.stderr, /⚠.*check the upgrade ledger/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
