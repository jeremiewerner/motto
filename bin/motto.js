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
 * CLI ergonomics (Phase 19, CLIX-01/02/03): lint/build accept `--quiet` and
 * `--format text|json`.
 *   --quiet: suppresses the "✓ …" success/progress line — silent stdout +
 *     exit 0 signals success (grep/make convention, D-06). Errors still
 *     print (to stderr). Orthogonal to --format (D-08).
 *   --format json: prints the verbatim core result object as one compact
 *     JSON line on stdout (D-01/D-02) — always prints, even under --quiet
 *     (D-08); no duplicate human "✗" echo on stderr for failures (D-09).
 *   --format text: explicit-default alias, identical to omitting the flag
 *     (D-11). Any other value is a D-05-shaped unknown-format error to
 *     stderr, exit 1, command not run (D-10).
 *   Pre-dispatch failures (e.g. a bad [path]) stay plain text on stderr
 *     with empty stdout, never a synthesized JSON error shape (D-04).
 *   `--quiet`/`--format` are lint/build-only; init rejects them as unknown
 *     options in the D-05 shape (D-03, D-11).
 *   ALL "✗" error lines (lint, build, init) write to stderr, never stdout
 *     (D-05, D-07) — CLIX-03.
 *
 * Exit codes: always set via process.exitCode — never process.exit(), which
 * can truncate buffered output on platforms where pipe writes are async
 * (e.g. Windows) — Pitfall 7. The parseArgs catch reports the error and
 * returns null; dispatch is skipped entirely when parsing failed, so the
 * process drains its streams and exits naturally with exitCode 1.
 */

import { parseArgs } from 'node:util';
import { stat } from 'node:fs/promises';
import { lintProject } from '../src/lint.js';

// ---------------------------------------------------------------------------
// Help text constants (D-01, D-02) — single-sourced usage-line (D-05 note)
// ---------------------------------------------------------------------------

const USAGE_LINE = 'usage: motto <init|lint|build>';
const UNKNOWN_HINT = "(run 'motto --help' for details)";

// --format accepted values (CLIX-02, D-11) — 'text' is the explicit-default alias.
const VALID_FORMATS = new Set(['text', 'json']);

// String-valued options whose VALUE must be skipped when scanning raw argv
// for the first positional (D-09 help routing, WR-01) — currently only
// --format takes a value; every other registered option is boolean.
const STRING_OPTS = new Set(['--format']);

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
  -h, --help          show help
  --quiet             suppress the success line; silent stdout on success
  --format text|json  output format (default: text)
`;

const BUILD_HELP = `usage: motto build [path] [options]

package skills into dist/ plugins
(defaults to current directory)

options:
  -h, --help          show help
  --quiet             suppress the success line; silent stdout on success
  --format text|json  output format (default: text)
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
// --format value guard (D-10) — CLIX-02, lint/build only
// ---------------------------------------------------------------------------

/**
 * Validate an explicit `--format` value BEFORE any I/O (Pitfall 3 — cheap
 * local check first). Undefined (flag omitted) is always valid — text mode
 * is the default. Writes the D-05-shaped unknown-format error to stderr and
 * sets exitCode 1 on an unsupported value.
 *
 * @param {string|undefined} formatValue - parsed.values.format
 * @returns {boolean} true when the value is usable (undefined or a member of VALID_FORMATS)
 */
function checkFormatValue(formatValue) {
  if (formatValue !== undefined && !VALID_FORMATS.has(formatValue)) {
    process.stderr.write(`✗ unknown format '${formatValue}'\n`);
    process.stderr.write(`${USAGE_LINE}\n`);
    process.stderr.write(`${UNKNOWN_HINT}\n`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Result rendering — shared by lint/build dispatch (CLIX-01/02/03)
// ---------------------------------------------------------------------------

/**
 * Render a lintProject/buildProject result object per the D-01..D-09
 * contract. Never mutates `result` — `format: 'json'` serializes it
 * verbatim (D-01, D-02) and always prints, even under `quiet` (D-08).
 * Text mode: success prints `successLine` unless `quiet`; failure prints
 * each error as a "✗ …" line to stderr (D-05) — never duplicated when in
 * json mode (D-09). exitCode is set to 1 whenever `!result.ok`, in every
 * mode; process.exit() is never called (Pitfall 7).
 *
 * @param {{ok: boolean, errors: Array<{skill:string, message:string}>}} result
 * @param {{format?: string, quiet?: boolean, successLine: string}} opts
 */
function renderResult(result, { format, quiet, successLine }) {
  if (format === 'json') {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else if (result.ok) {
    if (!quiet) {
      process.stdout.write(`${successLine}\n`);
    }
  } else {
    for (const e of result.errors) {
      process.stderr.write(`✗ ${e.skill}: ${e.message}\n`);
    }
  }
  if (!result.ok) process.exitCode = 1; // D2-11; process.exit() NOT used (Pitfall 7)
}

// ---------------------------------------------------------------------------
// Parse argv — strict:true throws on any unknown flag (e.g. --bogus)
// ---------------------------------------------------------------------------

/**
 * Parse argv, reporting any parseArgs error in D-04's shape (offending flag
 * or parseArgs' own message + usage line + hint) to stderr. Returns null on
 * failure — the caller skips dispatch, so no process.exit() is ever needed
 * and stderr flushes naturally on every platform (Pitfall 7).
 *
 * @returns {ReturnType<typeof parseArgs>|null}
 */
function parseCliArgs() {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      options: {
        force: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        quiet: { type: 'boolean' },
        format: { type: 'string' },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    // Unknown flag (strict:true) — name the offending flag, mirror D-04's
    // shape (usage line + hint), stderr, exit code 1 (Pitfall 4, D2-16, D-05).
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
    return null;
  }
}

const parsed = parseCliArgs();
const sub = parsed === null ? null : parsed.positionals[0];

// ---------------------------------------------------------------------------
// Help routing (D-09) — raw argv order decides global vs per-subcommand help
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2);
// Skip string-option values (e.g. `--format text`'s `text`) so they are never
// misidentified as the first positional/subcommand token (WR-01) — before
// this phase's --format, every registered option was boolean, so a plain
// non-dash scan was sound.
let firstPositionalIndex = -1;
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (STRING_OPTS.has(a)) {
    i++; // skip the option's value too
    continue;
  }
  if (a.startsWith('--') && a.includes('=')) continue; // --format=json form
  if (!a.startsWith('-')) {
    firstPositionalIndex = i;
    break;
  }
}
const firstHelpIndex = rawArgs.findIndex((a) => a === '-h' || a === '--help');
const helpBeforeSubcommand =
  firstHelpIndex !== -1 && (firstPositionalIndex === -1 || firstHelpIndex < firstPositionalIndex);

// ---------------------------------------------------------------------------
// Subcommand dispatch
// ---------------------------------------------------------------------------

if (parsed === null) {
  // Parse failed — error already written to stderr and exitCode already 1
  // inside parseCliArgs(); skip dispatch and let the process exit naturally.
} else if (sub === undefined) {
  // Bare `motto` (D-03) or `motto --help`/`-h` with no subcommand (D-01) —
  // both print the same global compact help to stdout, exit 0.
  process.stdout.write(GLOBAL_HELP);
} else if (parsed.values.help && helpBeforeSubcommand) {
  // `motto --help lint` (D-09) — help flag BEFORE the subcommand token still
  // yields GLOBAL help, not lint's focused help.
  process.stdout.write(GLOBAL_HELP);
} else if (sub === 'init') {
  if (parsed.values.format !== undefined || parsed.values.quiet) {
    // init does not accept --format/--quiet (D-03, D-11) — these flags are
    // only meaningful for lint/build. parseArgs registers them globally
    // (strict:true only rejects unknown flag NAMES), so init scopes them
    // out itself, mirroring the D-05 unknown-option shape.
    const badFlag = parsed.values.format !== undefined ? '--format' : '--quiet';
    process.stderr.write(`✗ unknown option '${badFlag}'\n`);
    process.stderr.write(`${USAGE_LINE}\n`);
    process.stderr.write(`${UNKNOWN_HINT}\n`);
    process.exitCode = 1;
  } else if (parsed.values.help) {
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
      // ✗ lines move to stderr (D-07) — CLIX-03
      process.stderr.write(`✗ ${result.errors[0].message}\n`);
      process.stderr.write(`  try: motto init ${result.suggestion}\n`);
      process.exitCode = 1;
    } else if (result.reason === 'not-empty') {
      const CAP = 5;
      const shown = result.offending.slice(0, CAP);
      const rest = result.offending.length - shown.length;
      const list = shown.join(', ') + (rest > 0 ? `, and ${rest} more` : '');
      process.stderr.write(`✗ directory is not empty (${list})\n`);
      process.stderr.write('  use --force to scaffold anyway\n');
      process.exitCode = 1;
    } else {
      for (const e of result.errors) {
        process.stderr.write(`✗ ${e.skill}: ${e.message}\n`);
      }
      process.exitCode = 1;
    }
  }
} else if (sub === 'lint') {
  if (parsed.values.help) {
    // `motto lint --help` (D-02, D-09) — focused help, lint not invoked.
    process.stdout.write(LINT_HELP);
  } else if (!checkFormatValue(parsed.values.format)) {
    // Unsupported --format value (D-10) — error already written to stderr;
    // validated before checkTargetDir's I/O (Pitfall 3).
  } else {
    // [path] wiring (CLIX-04): explicit path given → guard it first (D-06);
    // omitted → default to cwd, no guard.
    const targetPath = parsed.positionals[1];
    const root = targetPath ?? process.cwd();
    if (targetPath === undefined || (await checkTargetDir(targetPath))) {
      const result = await lintProject(root);
      renderResult(result, {
        format: parsed.values.format,
        quiet: parsed.values.quiet,
        successLine: `✓ ${result.count} skills OK`,
      });
    }
  }
} else if (sub === 'build') {
  if (parsed.values.help) {
    // `motto build --help` (D-02, D-09) — focused help, build not invoked.
    process.stdout.write(BUILD_HELP);
  } else if (!checkFormatValue(parsed.values.format)) {
    // Unsupported --format value (D-10) — error already written to stderr;
    // validated before checkTargetDir's I/O (Pitfall 3).
  } else {
    // [path] wiring (CLIX-04): explicit path given → guard it first (D-06);
    // omitted → default to cwd, no guard.
    const targetPath = parsed.positionals[1];
    const root = targetPath ?? process.cwd();
    if (targetPath === undefined || (await checkTargetDir(targetPath))) {
      const { buildProject } = await import('../src/build.js');
      const result = await buildProject(root);
      // D3-16: success line carries outDir (D-07: as-typed root, never
      // absolutized here); renderResult handles format/quiet/error routing.
      renderResult(result, {
        format: parsed.values.format,
        quiet: parsed.values.quiet,
        successLine: `✓ built ${result.outDir} — ${result.skillCount} skills, ${result.bucketCount} plugin(s)`,
      });
    }
  }
} else {
  // Unknown subcommand (D-04)
  process.stderr.write(`✗ unknown command '${sub}'\n`);
  process.stderr.write(`${USAGE_LINE}\n`);
  process.stderr.write(`${UNKNOWN_HINT}\n`);
  process.exitCode = 1;
}
