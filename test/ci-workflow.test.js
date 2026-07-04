import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parse } from 'yaml';

// Ordering-aware structural regression guard for CR-01 / Truth #6: the publish
// job's tag-vs-package.json-version consistency guard must exist AND run
// strictly before npm_guard. A substring grep cannot catch a reordering that
// re-opens the phantom-release drift path — only an index comparison can.
describe('ci.yml publish job structural contract (CR-01 / Truth #6)', () => {
  const workflow = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const steps = workflow?.jobs?.publish?.steps;
  assert.ok(Array.isArray(steps), 'jobs.publish.steps must exist and be an array');

  it('version_guard step exists in the publish job', () => {
    const versionGuardIndex = steps.findIndex((s) => s.id === 'version_guard');
    assert.notEqual(
      versionGuardIndex,
      -1,
      'expected a step with id "version_guard" in jobs.publish.steps',
    );
  });

  it('version_guard runs before npm_guard (ordering)', () => {
    const versionGuardIndex = steps.findIndex((s) => s.id === 'version_guard');
    const npmGuardIndex = steps.findIndex((s) => s.id === 'npm_guard');
    assert.notEqual(versionGuardIndex, -1, 'version_guard step not found');
    assert.notEqual(npmGuardIndex, -1, 'npm_guard step not found');
    assert.ok(
      versionGuardIndex < npmGuardIndex,
      `version_guard (index ${versionGuardIndex}) must run before npm_guard (index ${npmGuardIndex})`,
    );
  });

  it('version_guard hard-fails on mismatch (exit 1 + ::error::) comparing the tag to package.json version', () => {
    const versionGuard = steps.find((s) => s.id === 'version_guard');
    assert.ok(versionGuard, 'version_guard step not found');
    const run = versionGuard.run ?? '';
    assert.match(run, /GITHUB_REF_NAME/, 'must reference $GITHUB_REF_NAME');
    assert.match(run, /package\.json/, "must read version via require('./package.json').version");
    assert.match(run, /::error::/, 'must emit a ::error:: annotation on mismatch');
    assert.match(run, /exit 1/, 'must exit non-zero on mismatch');
    assert.doesNotMatch(
      run,
      /github\.ref_name/,
      'must use the $GITHUB_REF_NAME env var, not ${{ github.ref_name }} interpolation',
    );
  });
});
