#!/usr/bin/env node
/**
 * Explicit `.git`-less proof for scripts/prepare.mjs's guard (closes D-15 gap, CIW-05).
 *
 * RESEARCH.md Pitfall 2 (live npm experiment, this milestone) found D-15's
 * original premise false: installing a packed tarball as a nested
 * dependency (the pack-install-e2e flow) never triggers that dependency's
 * own `prepare` script, so it does NOT exercise the guard's `.git`-absent
 * branch at all. The only way to genuinely exercise that branch is to
 * materialize a real `.git`-less copy of THIS repo's committed tree and run
 * `npm ci` there directly (RESEARCH.md Open Question 1).
 *
 * Steps: mkdtemp -> `git archive HEAD` piped in-process into `tar -x` (a
 * .git-less tree, containing the committed scripts/prepare.mjs) -> `npm ci`
 * there -> assert exit 0 (proves the guard no-oped rather than failing) ->
 * rm tmp dir. On any failure, echoes the captured stdout/stderr root cause
 * (never a bare exit) and sets exit code 1.
 */

import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'motto-prepare-guard-check-'));
  try {
    // Materialize the .git-less tree with argv-form spawnSync — no shell
    // string, so the mkdtemp path is never shell-interpolated (a TMPDIR
    // containing spaces or metacharacters is inert), and each pipeline
    // stage's exit status is checked on its own (a `sh` pipeline would
    // report only tar's status, misattributing a git archive failure).
    const archive = spawnSync('git', ['archive', 'HEAD'], {
      maxBuffer: 64 * 1024 * 1024,
    });
    if (archive.status !== 0) {
      console.error(
        `prepare-guard-check FAILED — 'git archive HEAD' exited ${archive.status} (signal: ${archive.signal})` +
          `${archive.error ? ` — spawn error: ${archive.error.message}` : ''}. Root cause:\nstderr: ${archive.stderr}`,
      );
      process.exitCode = 1;
      return;
    }

    const untar = spawnSync('tar', ['-x', '-C', dir], { input: archive.stdout });
    if (untar.status !== 0) {
      console.error(
        `prepare-guard-check FAILED — 'tar -x -C <tmpdir>' exited ${untar.status} (signal: ${untar.signal})` +
          `${untar.error ? ` — spawn error: ${untar.error.message}` : ''}. Root cause:\nstderr: ${untar.stderr}`,
      );
      process.exitCode = 1;
      return;
    }

    const result = spawnSync('npm', ['ci'], { cwd: dir, encoding: 'utf8' });

    if (result.status !== 0) {
      console.error(
        `prepare-guard-check FAILED — npm ci in a .git-less tree exited ${result.status} (signal: ${result.signal})` +
          `${result.error ? ` — spawn error: ${result.error.message}` : ''}. Root cause:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      'prepare-guard-check OK — npm ci succeeded in a .git-less tree (prepare guard no-oped as expected)',
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await main();
