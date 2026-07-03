#!/usr/bin/env node
/**
 * npm `prepare` lifecycle guard (CIW-05, D-13/D-14).
 *
 * `prepare` runs on every `npm install`/`npm ci` — including inside a
 * `.git`-less tree (tarball extraction, `npm ci` against an archived
 * checkout, a nested dependency's own install). Husky's own bin assumes a
 * git repo exists and fails loudly outside one, which would break those
 * installs. This guard no-ops when `.git` is absent and only shells out to
 * `npx husky` in a real checkout, so a genuinely broken husky install there
 * still fails loudly (no `husky || true` always-succeed masking, D-13).
 *
 * Standalone lifecycle script invoked directly by npm, not through
 * bin/motto.js's CLI dispatcher — process.exit(0) here is intentional and
 * correct; it is NOT the same context as bin/motto.js's process.exitCode-only
 * convention (which exists to avoid truncating buffered CLI output).
 */

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!existsSync('.git')) {
  process.exit(0); // not a git checkout — no-op (tarball install, git-less npm ci, nested dependency)
}

execSync('npx husky', { stdio: 'inherit' }); // real checkout — let a genuine failure surface loudly
