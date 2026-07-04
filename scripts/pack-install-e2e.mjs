#!/usr/bin/env node
/**
 * Pack-install E2E (CIW-03, D-05/D-06/D-07).
 *
 * Proves the real consumer path: `npm pack` the repo -> install the
 * resulting tarball into a throwaway consumer project (exactly as a
 * stranger installing `@jeremiewerner/motto` from npm would) -> `motto
 * init` a project -> `motto lint --format json` -> `motto build
 * --format json`, asserting exit codes and parsed JSON at every step
 * (D-05). No file-tree diffing (brittle against init template evolution).
 *
 * The CLI is invoked via the installed `node_modules/.bin/motto` path —
 * never bare `npx motto`: in CI (non-TTY) npx assumes `--yes` and
 * auto-installs missing packages from the public registry, and an
 * unrelated `motto` package exists on npmjs.org, so a bin-linking
 * regression would silently execute a stranger's package instead of
 * failing here. Direct bin invocation makes broken linking fail loudly.
 *
 * The pack destination is a tempdir and the consumer project is a separate
 * tempdir — this script never writes into the repo working tree.
 *
 * `run()` prints the failing command line plus raw stdout/stderr before
 * exiting 1 (never a bare exit — Pitfall 3, so a future regression is
 * debuggable from CI logs alone).
 */

import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// D-05 tarball-leak allowlist (PUB-03). Ported from the release skill's
// former Step 4 heredoc — any packed file whose path is not an npm
// auto-included root file or does not start with one of ALLOWED_PREFIXES
// (note the trailing slash: 'bin/' does NOT match 'binary/x' — a
// partial-prefix match is deliberately NOT allowed) is a leak.
const ALLOWED_PREFIXES = ['bin/', 'src/', 'dist/public/'];
// npm's auto-include rule is "package.json plus README/LICENSE/LICENCE/
// CHANGELOG files (any case, optional extension) at the package ROOT" — not
// "any path prefixed by those words". A bare startsWith() here would admit
// leak paths like 'README-secrets/dump.txt' or 'package.json.bak' (WR-04),
// so the match is anchored: the optional extension may not contain '/'.
const AUTO_INCLUDED_RE = /^(README|LICENSE|LICENCE|CHANGELOG)(\.[^/]*)?$/i;

/**
 * Assert every packed file falls inside the npm package boundary (D-05).
 * Throws — never calls process.exit — so main()'s finally-block tmp-dir
 * cleanup still runs on a failure path (matches the run() convention above).
 *
 * @param {{path: string}[]} files - the `files` array from `npm pack --json`
 */
function assertTarballClean(files) {
  const isAutoIncluded = (p) => p === 'package.json' || AUTO_INCLUDED_RE.test(p);
  const isAllowed = (p) =>
    isAutoIncluded(p) || ALLOWED_PREFIXES.some((a) => p.startsWith(a));
  const leaks = files.filter((f) => !isAllowed(f.path));
  if (leaks.length) {
    throw new Error(
      `TARBALL LEAK — ${leaks.length} file(s) outside allowlist:\n` +
        leaks.map((f) => `  ${f.path}`).join('\n'),
    );
  }
}

/**
 * Run a command, echoing the command line + status/signal/spawn-error +
 * raw stdout/stderr and throwing on non-zero status — never a bare exit
 * with no context (Pitfall 3). `r.error`/`r.signal` are load-bearing: on
 * ENOENT (bin not spawnable) or a signal kill, stdout/stderr are null and
 * the root cause lives only in those fields.
 * Throws (rather than calling `process.exit(1)` directly) so the caller's
 * `finally` block still runs tmp-dir cleanup on a failure path.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {import('node:child_process').SpawnSyncOptions} [opts]
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')}\nstatus: ${r.status} signal: ${r.signal}` +
        `${r.error ? `\nspawn error: ${r.error.message}` : ''}` +
        `\nstdout: ${r.stdout}\nstderr: ${r.stderr}`,
    );
  }
  return r;
}

/**
 * Parse a `--format json` stdout payload, throwing with the raw stdout
 * included if it isn't valid JSON — a future `--format json` regression
 * must be debuggable from CI logs alone (Pitfall 3).
 *
 * @param {string} stdout
 * @param {string} label
 * @returns {any}
 */
function parseJsonOrFail(stdout, label) {
  try {
    return JSON.parse(stdout);
  } catch (err) {
    throw new Error(`could not parse ${label} JSON output (${err.message})\nstdout: ${stdout}`);
  }
}

async function main() {
  const repoRoot = process.cwd();
  const packDir = await mkdtemp(join(tmpdir(), 'motto-pack-'));
  const consumerDir = await mkdtemp(join(tmpdir(), 'motto-e2e-'));

  try {
    // (2) npm pack --json at the repo root -> tarball path read from
    // data[0].filename (never reconstructed from name+version — scoped
    // packages flatten `@scope/name` to `scope-name-<version>.tgz`, Pitfall 4).
    const packResult = run(
      'npm',
      ['pack', '--json', '--pack-destination', packDir],
      { cwd: repoRoot },
    );
    const packManifest = parseJsonOrFail(packResult.stdout, 'npm pack --json');
    const [{ filename, files: packedFiles }] = packManifest;
    const tarballPath = join(packDir, filename);

    // Fail fast (D-05, PUB-03) — before spending time on the rest of the E2E
    // flow (npm install/init/lint/build), assert the tarball itself is clean.
    assertTarballClean(packedFiles);

    // (3) Real consumer path: npm init -y + npm install <tarball> in a
    // separate throwaway project — exercises bin linking, the `files`
    // allowlist, and dependency resolution exactly as a stranger would.
    run('npm', ['init', '-y'], { cwd: consumerDir });
    run('npm', ['install', tarballPath], { cwd: consumerDir });

    // (4) `motto init [name]` scaffolds INTO the current directory (it is
    // not a "create subdirectory" command — [name] only sets the project
    // name inside motto.yaml/marketplace.json). consumerDir itself already
    // has package.json/package-lock.json/node_modules from step (3), which
    // would trip the non-empty-dir guard, so the scaffold target is a
    // nested, genuinely-empty project dir. The CLI is the bin path npm
    // linked into consumerDir's node_modules/.bin during step (3) — if the
    // `bin` entry or `files` allowlist ever regresses, this spawn fails
    // loudly (ENOENT) instead of npx falling back to the registry.
    const mottoBin = join(consumerDir, 'node_modules', '.bin', 'motto');
    const projectDir = join(consumerDir, 'e2e-project');
    await mkdir(projectDir, { recursive: true });
    run(mottoBin, ['init'], { cwd: projectDir });

    // (5) motto lint --format json — assert .ok === true, .count >= 1.
    // Field names match the Phase 19 contract exactly (lint uses `count`,
    // not `skillCount`).
    const lintResult = run(mottoBin, ['lint', '--format', 'json'], { cwd: projectDir });
    const lintJson = parseJsonOrFail(lintResult.stdout, 'lint');
    if (lintJson.ok !== true || !(lintJson.count >= 1)) {
      throw new Error(
        `lint JSON assertion failed (.ok===true, .count>=1) — got: ${lintResult.stdout}`,
      );
    }

    // (6) motto build --format json — assert .ok === true, .skillCount >= 1.
    const buildResult = run(mottoBin, ['build', '--format', 'json'], { cwd: projectDir });
    const buildJson = parseJsonOrFail(buildResult.stdout, 'build');
    if (buildJson.ok !== true || !(buildJson.skillCount >= 1)) {
      throw new Error(
        `build JSON assertion failed (.ok===true, .skillCount>=1) — got: ${buildResult.stdout}`,
      );
    }

    console.log('pack-install-e2e: OK');
  } finally {
    // (8) tmp dirs removed with { recursive: true, force: true } regardless
    // of outcome — the repo working tree is never touched.
    await rm(packDir, { recursive: true, force: true });
    await rm(consumerDir, { recursive: true, force: true });
  }
}

// Only run main() when this module is the entry point (`node
// scripts/pack-install-e2e.mjs`) — importing the module (e.g. from a unit
// test exercising assertTarballClean, or via dynamic `import()` where
// process.argv[1] is undefined) must NOT trigger the real E2E run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (err) {
    console.error(`pack-install-e2e FAILED: ${err.message}`);
    process.exitCode = 1;
  }
}

export { assertTarballClean };
