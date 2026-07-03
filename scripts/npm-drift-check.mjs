#!/usr/bin/env node
/**
 * npm registry drift check (CIW-04, D-09..D-12).
 *
 * Reads the local `package.json` version and compares it against the npm
 * registry's `dist-tags.latest` for `@jeremiewerner/motto`. On any mismatch
 * (D-11 — strict inequality, no semver parsing) it prints a GitHub Actions
 * `::warning::` annotation (D-09 — the only signal carrier; the job itself
 * always stays green).
 *
 * D-10: warn-and-pass, never red. Every fallible step — reading
 * package.json, the registry fetch, and JSON parsing — is inside a
 * try/catch (Anti-Pattern: an unhandled rejection or throw outside a
 * try/catch would fail the job), and the top-level `main()` call carries a
 * final `.catch` so even an internal bug prints an "inconclusive"
 * `::warning::` instead of exiting non-zero. No branch anywhere sets a
 * non-zero exit code and there is no retry/backoff logic (Don't-Hand-Roll:
 * failure is just another inconclusive branch).
 */

import { readFileSync } from 'node:fs';

async function main() {
  let localVersion;
  try {
    ({ version: localVersion } = JSON.parse(readFileSync('package.json', 'utf8')));
  } catch (err) {
    console.log(`::warning::npm-drift check inconclusive (could not read package.json: ${err.message})`);
    return;
  }

  try {
    const res = await fetch('https://registry.npmjs.org/@jeremiewerner%2Fmotto');
    if (!res.ok) {
      console.log(`::warning::npm-drift check inconclusive (registry returned ${res.status})`);
      return;
    }

    const data = await res.json();
    const latest = data['dist-tags']?.latest;
    if (!latest) {
      console.log('::warning::npm-drift check inconclusive (no dist-tags.latest in response)');
      return;
    }

    if (latest !== localVersion) {
      console.log(
        `::warning::npm registry latest (${latest}) does not match package.json (${localVersion})`,
      );
    }
  } catch (err) {
    console.log(`::warning::npm-drift check inconclusive (${err.message})`);
  }
}

await main().catch((err) => {
  console.log(`::warning::npm-drift check inconclusive (${err.message})`);
});
// No branch above sets process.exitCode or calls process.exit(), and the
// final .catch swallows any unexpected throw — the script is structurally
// incapable of exiting non-zero (D-10).
