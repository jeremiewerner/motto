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
 * Steps: mkdtemp -> `git archive HEAD | tar -x` into it (a .git-less tree,
 * containing the committed scripts/prepare.mjs) -> `npm ci` there -> assert
 * exit 0 (proves the guard no-oped rather than failing) -> rm tmp dir. On
 * any failure, echoes the captured stdout/stderr root cause (never a bare
 * exit) and sets exit code 1.
 */

import { spawnSync, execSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'motto-prepare-guard-check-'));
  try {
    try {
      execSync(`git archive HEAD | tar -x -C ${dir}`, { stdio: 'inherit' });
    } catch (err) {
      console.error(
        `prepare-guard-check FAILED — could not materialize a .git-less tree via 'git archive HEAD | tar -x'. Root cause: ${err.message}`,
      );
      process.exitCode = 1;
      return;
    }

    const result = spawnSync('npm', ['ci'], { cwd: dir, encoding: 'utf8' });

    if (result.status !== 0) {
      console.error(
        `prepare-guard-check FAILED — npm ci in a .git-less tree exited ${result.status}. Root cause:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
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
