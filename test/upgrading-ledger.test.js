import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchor REPO_ROOT at load time via import.meta.url — NEVER derive it from
// the current working directory (that shifts with invocation directory;
// import.meta.url is stable). Mirrors test/doc-sync.test.js and
// test/dogfood.test.js.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── UPG-01: UPGRADING.md existence + seed-heading backstop ─────────────────
//
// This is a minimal existence + heading guard, not a source-text parity
// check — there is no source-of-truth code file the ledger mirrors, so a
// parity check would just re-encode content with no behavioral assertion.
// It also does not parse git tags or attempt to verify that FUTURE entries
// exist — that judgment is deliberately human/agent-side (D-01), not
// mechanized.

describe('upgrading-ledger backstop', () => {
  it('UPGRADING.md exists and contains both seed entries', async () => {
    const docText = await readFile(join(REPO_ROOT, 'UPGRADING.md'), 'utf8');
    assert.ok(
      docText.includes('## v0.0.5'),
      'missing v0.0.5 <role> migration entry heading',
    );
    assert.ok(
      docText.includes('## v0.0.7'),
      'missing v0.0.7 mottoVersion stamp entry heading',
    );
  });
});
