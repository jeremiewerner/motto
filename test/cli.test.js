import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { scaffoldProject } from '../src/init.js';

const CLI_PATH = fileURLToPath(new URL('../bin/motto.js', import.meta.url));

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
