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
 *   Usage:  "usage: motto <init|lint|build>" to stderr, exit 1.
 *
 * Exit codes: always set via process.exitCode (never process.exit(1)) to
 * avoid truncating buffered stdout (Pitfall 7). The only exception is
 * process.exit() (no arg) in the parseArgs catch block, which is safe because
 * we have already written all output to stderr before calling it.
 */

import { parseArgs } from 'node:util';
import { lintProject } from '../src/lint.js';

// ---------------------------------------------------------------------------
// Parse argv — strict:true throws on any unknown flag (e.g. --help)
// ---------------------------------------------------------------------------

let parsed;
try {
  parsed = parseArgs({
    args: process.argv.slice(2),
    options: {
      force: { type: 'boolean' },
    },
    allowPositionals: true,
    strict: true,
  });
} catch {
  // Unknown flag (strict:true) — print usage and exit (Pitfall 4, D2-16)
  process.stderr.write('usage: motto <init|lint|build>\n');
  process.exitCode = 1;
  process.exit(); // exits with exitCode 1; safe: all output written before this call
}

const sub = parsed.positionals[0];

// ---------------------------------------------------------------------------
// Subcommand dispatch
// ---------------------------------------------------------------------------

if (sub === 'init') {
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
} else if (sub === 'lint') {
  // cwd-only, v1 (D2-15)
  const result = await lintProject(process.cwd());
  if (result.ok) {
    process.stdout.write(`✓ ${result.count} skills OK\n`);
  } else {
    for (const e of result.errors) {
      process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
    }
    process.exitCode = 1; // D2-11; process.exit(1) NOT used (Pitfall 7)
  }
} else if (sub === 'build') {
  // cwd-only, mirrors lint branch (D3-15)
  const { buildProject } = await import('../src/build.js');
  const result = await buildProject(process.cwd());
  if (result.ok) {
    // D3-16: output dir + one-line summary
    process.stdout.write(
      `✓ built ${result.outDir} — ${result.skillCount} skills, ${result.bucketCount} plugin(s)\n`,
    );
  } else {
    for (const e of result.errors) {
      process.stdout.write(`✗ ${e.skill}: ${e.message}\n`);
    }
    process.exitCode = 1; // never process.exit(1) — preserves stdout flush (Pitfall 7)
  }
} else {
  // Unknown subcommand or no subcommand at all (D2-16)
  process.stderr.write('usage: motto <init|lint|build>\n');
  process.exitCode = 1;
}
