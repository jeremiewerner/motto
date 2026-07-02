#!/usr/bin/env node
/**
 * motto CLI entry point — thin shell.
 *
 * Parses the subcommand with node:util parseArgs (allowPositionals, strict:true
 * so unknown flags throw and are caught to print usage). Dispatches to the
 * init/lint/build orchestrators.
 *
 * Output format (D2-11, D-10/D-11):
 *   Clean:  "✓ N skills OK" to stdout, exit 0.
 *   Errors: "✗ <skill>: <message>" per error to stdout, exit 1.
 *   Init success: "✓" line + created-file tree + `motto lint`/`motto build`
 *     next steps, exit 0.
 *   Init failure: capped offending-list / invalid-name+suggestion message in
 *     the same "✗" style, exit 1.
 *   Help (D-01/D-02/D-03/D-08/D-09): `-h`/`--help` (or bare `motto` — D-03)
 *     prints usage text to STDOUT, exit 0. Global help lists all commands;
 *     `motto <cmd> --help` prints that command's focused help and does NOT
 *     run the command. Flag position matters (D-09): `--help` BEFORE the
 *     subcommand always yields global help, even as `motto --help lint`.
 *   Unknown command (D-04): "✗ unknown command '<name>'" + usage line +
 *     "(run 'motto --help' for details)" to stderr, exit 1.
 *   Unknown flag (D-05): mirrors D-04 — names the offending flag, same
 *     usage line + hint, stderr, exit 1.
 *
 * Exit codes: always set via process.exitCode (never process.exit(1)) to
 * avoid truncating buffered stdout (Pitfall 7). The only exception is
 * process.exit() (no arg) in the parseArgs catch block, which is safe because
 * we have already written all output to stderr before calling it.
 */

import { parseArgs } from 'node:util';
import { stat } from 'node:fs/promises';
import { lintProject } from '../src/lint.js';

// ---------------------------------------------------------------------------
// Help text constants (D-01, D-02) — single-sourced usage-line (D-05 note)
// ---------------------------------------------------------------------------

const USAGE_LINE = 'usage: motto <init|lint|build>';
const UNKNOWN_HINT = "(run 'motto --help' for details)";

const GLOBAL_HELP = `${USAGE_LINE} [options]

commands:
  init [name]    scaffold a skills project in the current directory
  lint [path]    validate skills against the schema
  build [path]   package skills into dist/ plugins

options:
  -h, --help     show help
  --force        (init) overwrite scaffold files
`;

const INIT_HELP = `usage: motto init [name] [options]

scaffold a new skills project in the current directory
([name] sets the project name; defaults to the directory's name)

options:
  -h, --help    show help
  --force       overwrite scaffold files in a non-empty directory
`;

const LINT_HELP = `usage: motto lint [path] [options]

validate skills against the schema
(defaults to current directory)

options:
  -h, --help    show help
`;

const BUILD_HELP = `usage: motto build [path] [options]

package skills into dist/ plugins
(defaults to current directory)

options:
  -h, --help    show help
`;

// ---------------------------------------------------------------------------
// Pre-dispatch [path] directory guard (D-06) — CLIX-04
// ---------------------------------------------------------------------------

/**
 * Validate an explicit [path] argument before dispatching to lintProject /
 * buildProject. Only called when the user typed a path (positionals[1] is
 * defined) — omitted [path] skips this guard entirely and defaults to cwd.
 *
 * Never throws (uses a non-throwing stat); writes a single "✗ …" line to
 * stderr and returns false on any rejection (D-06, D-07 — path stays
 * as-typed, no absolute resolution).
 *
 * @param {string} targetPath - the as-typed path argument
 * @returns {Promise<boolean>} true when targetPath is a usable directory
 */
async function checkTargetDir(targetPath) {
  let stats;
  try {
    stats = await stat(targetPath);
  } catch (err) {
    // Only ENOENT/ENOTDIR mean "not found" — EACCES/ELOOP/ENAMETOOLONG etc.
    // may hit a directory that exists, so report the real failure instead.
    const msg =
      err?.code === 'ENOENT' || err?.code === 'ENOTDIR'
        ? `✗ directory not found: ${targetPath}\n`
        : `✗ cannot access ${targetPath}: ${err.message}\n`;
    process.stderr.write(msg);
    process.exitCode = 1;
    return false;
  }
  if (!stats.isDirectory()) {
    process.stderr.write(`✗ not a directory: ${targetPath}\n`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Parse argv — strict:true throws on any unknown flag (e.g. --bogus)
// ---------------------------------------------------------------------------

let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    options: {
      force: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
    strict: true,
  });
} catch (err) {
  // Unknown flag (strict:true) — name the offending flag, mirror D-04's
  // shape (usage line + hint), stderr, exit (Pitfall 4, D2-16, D-05).
  // parseArgs also throws non-"Unknown option" errors (e.g. a boolean flag
  // given a value: `--force=true` → "Option '--force' does not take an
  // argument") — surface parseArgs' own message for those instead of a
  // misleading literal.
  const match = /(?:Unknown option |unrecognized option )['"]?(-{1,2}[^'"\s]+)/.exec(
    err && err.message,
  );
  if (match) {
    process.stderr.write(`✗ unknown option '${match[1]}'\n`);
  } else {
    process.stderr.write(`✗ ${err && err.message ? err.message : 'invalid arguments'}\n`);
  }
  process.stderr.write(`${USAGE_LINE}\n`);
  process.stderr.write(`${UNKNOWN_HINT}\n`);
  process.exitCode = 1;
  process.exit(); // exits with exitCode 1; safe: all output written before this call
}

const sub = parsed.positionals[0];

// ---------------------------------------------------------------------------
// Help routing (D-09) — raw argv order decides global vs per-subcommand help
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2);
const firstPositionalIndex = rawArgs.findIndex((a) => !a.startsWith('-'));
const firstHelpIndex = rawArgs.findIndex((a) => a === '-h' || a === '--help');
const helpBeforeSubcommand =
  firstHelpIndex !== -1 && (firstPositionalIndex === -1 || firstHelpIndex < firstPositionalIndex);

// ---------------------------------------------------------------------------
// Subcommand dispatch
// ---------------------------------------------------------------------------

if (sub === undefined) {
  // Bare `motto` (D-03) or `motto --help`/`-h` with no subcommand (D-01) —
  // both print the same global compact help to stdout, exit 0.
  process.stdout.write(GLOBAL_HELP);
} else if (parsed.values.help && helpBeforeSubcommand) {
  // `motto --help lint` (D-09) — help flag BEFORE the subcommand token still
  // yields GLOBAL help, not lint's focused help.
  process.stdout.write(GLOBAL_HELP);
} else if (sub === 'init') {
  if (parsed.values.help) {
    // `motto init --help` (D-02, D-09) — focused help, init not invoked.
    process.stdout.write(INIT_HELP);
  } else {
    const { scaffoldProject } = await import('../src/init.js');
    const result = await scaffoldProject(process.cwd(), {
      name: parsed.positionals[1],
      force: parsed.values.force,
    });
    if (result.ok) {
      process.stdout.write('✓ scaffolded project:\n');
      for (const file of result.created) {
        process.stdout.write(`  ${file}\n`);
      }
      process.stdout.write('\nnext steps:\n  motto lint\n  motto build\n');
    } else if (result.reason === 'invalid-name') {
      process.stdout.write(`✗ ${result.errors[0].message}\n`);
      process.stdout.write(`  try: motto init ${result.suggestion}\n`);
      process.exitCode = 1;
    } else if (result.reason === 'not-empty') {
      const CAP = 5;
      const shown = result.offending.slice(0, CAP);
      const rest = result.offending.length - shown.length;
      const list = shown.join(', ') + (rest > 0 ? `, and ${rest} more` : '');
      process.stdout.write(`✗ directory is not empty (${list})\n`);
      process.stdout.write('  use --force to scaffold anyway\n');
      process.exitCode = 1;
    } else {
      for (const e of result.errors) {
        process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
      }
      process.exitCode = 1;
    }
  }
} else if (sub === 'lint') {
  if (parsed.values.help) {
    // `motto lint --help` (D-02, D-09) — focused help, lint not invoked.
    process.stdout.write(LINT_HELP);
  } else {
    // [path] wiring (CLIX-04): explicit path given → guard it first (D-06);
    // omitted → default to cwd, no guard.
    const targetPath = parsed.positionals[1];
    const root = targetPath ?? process.cwd();
    if (targetPath === undefined || (await checkTargetDir(targetPath))) {
      const result = await lintProject(root);
      if (result.ok) {
        process.stdout.write(`✓ ${result.count} skills OK\n`);
      } else {
        for (const e of result.errors) {
          process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
        }
        process.exitCode = 1; // D2-11; process.exit(1) NOT used (Pitfall 7)
      }
    }
  }
} else if (sub === 'build') {
  if (parsed.values.help) {
    // `motto build --help` (D-02, D-09) — focused help, build not invoked.
    process.stdout.write(BUILD_HELP);
  } else {
    // [path] wiring (CLIX-04): explicit path given → guard it first (D-06);
    // omitted → default to cwd, no guard.
    const targetPath = parsed.positionals[1];
    const root = targetPath ?? process.cwd();
    if (targetPath === undefined || (await checkTargetDir(targetPath))) {
      const { buildProject } = await import('../src/build.js');
      const result = await buildProject(root);
      if (result.ok) {
        // D3-16: output dir + one-line summary (D-07: outDir derived from
        // the as-typed root, never absolutized here)
        process.stdout.write(
          `✓ built ${result.outDir} — ${result.skillCount} skills, ${result.bucketCount} plugin(s)\n`,
        );
      } else {
        for (const e of result.errors) {
          process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
        }
        process.exitCode = 1; // never process.exit(1) — preserves stdout flush (Pitfall 7)
      }
    }
  }
} else {
  // Unknown subcommand (D-04)
  process.stderr.write(`✗ unknown command '${sub}'\n`);
  process.stderr.write(`${USAGE_LINE}\n`);
  process.stderr.write(`${UNKNOWN_HINT}\n`);
  process.exitCode = 1;
}
