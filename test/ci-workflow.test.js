import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

// Anchor REPO_ROOT at load time via import.meta.url — NEVER derive it from
// the current working directory (that shifts with invocation directory;
// import.meta.url is stable). test/ci-workflow.test.js lives one level inside
// the repo root, so '..' resolves correctly.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CI_YML = resolve(REPO_ROOT, '.github/workflows/ci.yml');

// Ordering-aware structural regression guard for CR-01 / Truth #6: the publish
// job's tag-vs-package.json-version consistency guard must exist AND run
// strictly before npm_guard. A substring grep cannot catch a reordering that
// re-opens the phantom-release drift path — only an index comparison can.
describe('ci.yml publish job structural contract (CR-01 / Truth #6)', () => {
  const workflow = parse(readFileSync(CI_YML, 'utf8'));
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

  it('version_guard runs before every guard and side-effect step (ordering)', () => {
    // CR-01's failure mode was "publish nothing to npm while still creating a
    // GitHub Release" — so version_guard must precede BOTH guards, not just
    // npm_guard. The `npm publish` / "Create GitHub Release" steps are also
    // pinned directly: they are coupled to their guards via
    // `if: steps.<guard>.outputs.* == 'false'` (an unset output never equals
    // 'false'), but pinning them here costs nothing and guards against a
    // future decoupling edit.
    const idxById = (id) => steps.findIndex((s) => s.id === id);
    const idxByName = (name) => steps.findIndex((s) => s.name === name);
    const versionGuardIndex = idxById('version_guard');
    const npmGuardIndex = idxById('npm_guard');
    const ghGuardIndex = idxById('gh_guard');
    const npmPublishIndex = idxByName('npm publish');
    const releaseCreateIndex = idxByName('Create GitHub Release');
    assert.notEqual(versionGuardIndex, -1, 'version_guard step not found');
    assert.notEqual(npmGuardIndex, -1, 'npm_guard step not found');
    assert.notEqual(ghGuardIndex, -1, 'gh_guard step not found');
    assert.notEqual(npmPublishIndex, -1, 'npm publish step not found');
    assert.notEqual(releaseCreateIndex, -1, 'Create GitHub Release step not found');
    assert.ok(
      versionGuardIndex < npmGuardIndex,
      `version_guard (index ${versionGuardIndex}) must run before npm_guard (index ${npmGuardIndex})`,
    );
    assert.ok(
      versionGuardIndex < ghGuardIndex,
      `version_guard (index ${versionGuardIndex}) must run before gh_guard (index ${ghGuardIndex})`,
    );
    assert.ok(
      versionGuardIndex < npmPublishIndex,
      `version_guard (index ${versionGuardIndex}) must run before npm publish (index ${npmPublishIndex})`,
    );
    assert.ok(
      versionGuardIndex < releaseCreateIndex,
      `version_guard (index ${versionGuardIndex}) must run before Create GitHub Release (index ${releaseCreateIndex})`,
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

// Structural regression guard for PUB-05: the publish job must authenticate to
// npm via OIDC trusted publishing, not a stored NPM_TOKEN/NODE_AUTH_TOKEN
// secret. The zero-token check sweeps every env scope that flows into the
// publish job (workflow-level, job-level, and each step's own env) — the
// realistic regression vectors — while staying a parsed-structure contract
// check, not a brittle whole-file text grep.
describe('ci.yml publish job OIDC contract (PUB-05)', () => {
  const workflow = parse(readFileSync(CI_YML, 'utf8'));
  const steps = workflow?.jobs?.publish?.steps;
  assert.ok(Array.isArray(steps), 'jobs.publish.steps must exist and be an array');
  const npmPublishStep = steps.find((s) => s.name === 'npm publish');

  it("jobs.publish.permissions['id-token'] equals 'write'", () => {
    assert.equal(
      workflow?.jobs?.publish?.permissions?.['id-token'],
      'write',
      "expected jobs.publish.permissions['id-token'] === 'write'",
    );
  });

  it("jobs.publish.permissions.contents still equals 'write' (regression guard)", () => {
    assert.equal(
      workflow?.jobs?.publish?.permissions?.contents,
      'write',
      'expected jobs.publish.permissions.contents === \'write\' to remain unchanged',
    );
  });

  it("the 'npm publish' step's run field matches /--provenance/", () => {
    assert.ok(npmPublishStep, 'npm publish step not found');
    assert.match(npmPublishStep.run ?? '', /--provenance/, 'expected --provenance flag on npm publish');
  });

  it('no step, job-level, or workflow-level env reintroduces NPM_TOKEN/NODE_AUTH_TOKEN', () => {
    // The highest-probability regression paths are `env:` at the job level
    // (jobs.publish.env) or workflow level (top-level env:) — both flow into
    // every step's environment — or a token wired into a sibling step (e.g.
    // setup-node or an added .npmrc-writing step). Sweep every env scope that
    // can reach the publish job, not just the publish step's own env.
    const scopes = [
      ['workflow-level env', workflow?.env],
      ['jobs.publish env', workflow?.jobs?.publish?.env],
      ...steps.map((s, i) => [
        `publish step ${i} (${s.name ?? s.id ?? s.uses ?? 'unnamed'}) env`,
        s.env,
      ]),
    ];
    for (const [label, env] of scopes) {
      assert.doesNotMatch(
        JSON.stringify(env ?? {}),
        /NPM_TOKEN|NODE_AUTH_TOKEN/,
        `${label} must not reference NPM_TOKEN/NODE_AUTH_TOKEN`,
      );
    }
  });
});
