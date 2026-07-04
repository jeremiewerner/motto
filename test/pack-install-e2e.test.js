import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertTarballClean } from '../scripts/pack-install-e2e.mjs';

// D-05 tarball-leak assertion (PUB-03). The negative case is mandatory — a
// positive-only test cannot distinguish the real assertion from a no-op.
describe('assertTarballClean (D-05, PUB-03)', () => {
  it('does not throw for a clean file set (allowlisted prefixes + auto-included files)', () => {
    const files = [
      { path: 'bin/motto.js' },
      { path: 'src/schema.js' },
      { path: 'dist/public/skills/x/SKILL.md' },
      { path: 'package.json' },
      { path: 'README.md' },
      { path: 'LICENSE' },
    ];
    assert.doesNotThrow(() => assertTarballClean(files));
  });

  it('throws TARBALL LEAK with the offending path when a leaking file is present', () => {
    const files = [
      { path: 'bin/motto.js' },
      { path: 'skills/release/SKILL.md' },
      { path: 'test/foo.test.js' },
      { path: '.planning/STATE.md' },
    ];
    assert.throws(
      () => assertTarballClean(files),
      (err) => {
        assert.match(err.message, /TARBALL LEAK/);
        assert.match(err.message, /skills\/release\/SKILL\.md/);
        assert.match(err.message, /test\/foo\.test\.js/);
        assert.match(err.message, /\.planning\/STATE\.md/);
        return true;
      },
    );
  });

  it('treats a partial-prefix match as a leak (bin/ boundary is trailing-slash exact, not substring)', () => {
    const files = [{ path: 'binary/x' }];
    assert.throws(() => assertTarballClean(files), /TARBALL LEAK/);
  });
});
