#!/usr/bin/env node
/**
 * motto CLI entry point — thin shell.
 *
 * Parses the subcommand with node:util parseArgs (allowPositionals, strict:true
 * so unknown flags throw and are caught to print usage). Dispatches to the lint
 * orchestrator or reserves the build slot for Phase 3.
 *
 * Output format (D2-11):
 *   Clean:  "✓ N skills OK" to stdout, exit 0.
 *   Errors: "✗ <skill>: <message>" per error to stdout, exit 1.
 *   Usage:  "usage: motto <lint|build>" to stderr, exit 1.
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
    options: {},
    allowPositionals: true,
    strict: true,
  });
} catch {
  // Unknown flag (strict:true) — print usage and exit (Pitfall 4, D2-16)
  process.stderr.write('usage: motto <lint|build>\n');
  process.exitCode = 1;
  process.exit(); // exits with exitCode 1; safe: all output written before this call
}

const sub = parsed.positionals[0];

// ---------------------------------------------------------------------------
// Subcommand dispatch
// ---------------------------------------------------------------------------

if (sub === 'lint') {
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
  // Reserved for Phase 3 (BUILD-01..06, CLI-02) — not yet implemented
  process.stderr.write('motto build: not yet implemented (Phase 3)\n');
  process.exitCode = 1;
} else {
  // Unknown subcommand or no subcommand at all (D2-16)
  process.stderr.write('usage: motto <lint|build>\n');
  process.exitCode = 1;
}
