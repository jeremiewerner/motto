---
phase: 22-public-flip-token-hardening
reviewed: 2026-07-05T17:34:08Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - .github/workflows/ci.yml
  - README.md
  - skills/release/SKILL.md
  - test/ci-workflow.test.js
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-07-05T17:34:08Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the OIDC trusted-publishing migration (ci.yml publish job), its structural test guard (test/ci-workflow.test.js), the rewritten README publish flow, and the release skill's new Step 9 runbook. The core migration is correct: `id-token: write` is job-scoped, `--provenance` is on the publish command, no token env remains anywhere in the workflow (verified by grep across `.github/`, `skills/`, `scripts/`, `test/`), the guard ordering matches the CR-01 contract, and the skill's marketplace claims (`"source": "npm"`, skills from `dist/public/`) match `.claude-plugin/marketplace.json` exactly.

No Critical issues. Four Warnings: (1) the new test file violates the repo's own explicitly documented "never resolve from cwd" test convention and demonstrably crashes with ENOENT when run from any directory other than repo root — the exact failure class memorialized after the Phase 15 cwd-resolve bypass; (2) the zero-token structural guard only inspects the `npm publish` step's own `env`, leaving job-level and workflow-level `env` as unguarded regression vectors — the most common place a token would be reintroduced; (3) a now-false comment in ci.yml still describes the OIDC migration as a future event; (4) the release skill's failure-recovery step still instructs "rotate `NPM_TOKEN`", which becomes impossible and misleading once its own Step 9 revokes the token and locks the package to trusted-publisher-only.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: ci-workflow.test.js resolves the workflow path from cwd, violating the repo's documented test convention

**File:** `test/ci-workflow.test.js:12` (and `:84`)
**Issue:** `parse(readFileSync('.github/workflows/ci.yml', 'utf8'))` resolves relative to `process.cwd()`. Every other path-dependent test in this repo anchors on `import.meta.url` and carries an explicit comment forbidding cwd derivation (`test/doc-sync.test.js:7-11`: "Anchor REPO_ROOT at load time via import.meta.url — NEVER derive it from [process.cwd()]"; same in `test/dogfood.test.js:13-16`). This is not theoretical — verified: running `node --test /Users/jeremie/Projects/motto/test/ci-workflow.test.js` from `/tmp` crashes at module load with `ENOENT: open '.github/workflows/ci.yml'`, taking both describe blocks down before any `it` registers. Any IDE test runner or single-file invocation from outside repo root hits this. The project's history (Ph15 cwd-resolve bypass) is precisely why the other test files carry the warning comment this file ignores.
**Fix:**
```js
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CI_YML = resolve(REPO_ROOT, '.github/workflows/ci.yml');
// then in both describes:
const workflow = parse(readFileSync(CI_YML, 'utf8'));
```

#### WR-02: Zero-token guard only checks the `npm publish` step's own env — job-level and workflow-level env are unguarded regression vectors

**File:** `test/ci-workflow.test.js:110-118`
**Issue:** The PUB-05 contract test asserts `npmPublishStep.env` contains no `NPM_TOKEN`/`NODE_AUTH_TOKEN`. But the most common way a token gets (re)wired into a publish job is `env:` at the job level (`jobs.publish.env`) or workflow level (top-level `env:`) — either of which flows into the `npm publish` step's environment and re-establishes token auth while this test stays green. A token added to any *other* step of the publish job (e.g. the `setup-node` step or an added `.npmrc`-writing step) also passes. The comment at lines 82-83 frames step-scoping as precision, but as written the guard misses the highest-probability regression paths for the exact contract it exists to protect.
**Fix:**
```js
it('no step, job-level, or workflow-level env in publish reintroduces a token', () => {
  const scopes = [
    workflow?.env,
    workflow?.jobs?.publish?.env,
    ...steps.map((s) => s.env),
  ];
  for (const env of scopes) {
    assert.doesNotMatch(
      JSON.stringify(env ?? {}),
      /NPM_TOKEN|NODE_AUTH_TOKEN/,
      'publish job must not reference NPM_TOKEN/NODE_AUTH_TOKEN in any env scope',
    );
  }
});
```

#### WR-03: Stale comment in ci.yml describes the OIDC migration as still pending

**File:** `.github/workflows/ci.yml:100-103`
**Issue:** The `node-version: 24` comment reads "satisfying the trusted-publishing floor **ahead of the PUB-05 OIDC migration**, so that **later swap** is a same-Node diff." That migration landed in this very phase, in this very file (lines 95, 126). A future maintainer reading this comment would conclude OIDC is not yet live and the publish path still uses a token — the opposite of the file's actual state and of the zero-token contract the sibling test enforces. In a repo that treats workflow comments as load-bearing documentation (see lines 30-37, 85-89), a comment asserting a false migration state is a maintenance hazard, not cosmetics.
**Fix:** Rewrite to describe the present:
```yaml
# Pinned to 24 (not the 20 used by every other job): ships npm >=11.5.1,
# the floor for OIDC trusted publishing (PUB-05), which authenticates the
# `npm publish --provenance` step below — no NPM_TOKEN/NODE_AUTH_TOKEN.
```

#### WR-04: Release skill recovery step still instructs "rotate `NPM_TOKEN`" — impossible and misleading after its own Step 9

**File:** `skills/release/SKILL.md:112`
**Issue:** Step 7 point 4 lists "rotate `NPM_TOKEN`" as the canonical example of a fixable config failure. Phase 22 removed `NPM_TOKEN` from the publish path entirely, and the skill's own Step 9 instructs revoking the token, deleting the secret, and locking npm to trusted-publisher-only. After Step 9 runs once, "rotate `NPM_TOKEN`" is not just stale — it points the maintainer (or the agent executing this procedure skill) at a recovery action that cannot work and whose attempted execution (minting a new token, re-adding the secret) would actively violate the zero-tokens structural guarantee Step 9.2 establishes. A runbook's failure-mode section is read under pressure; it must not name a dead mechanism as the example fix.
**Fix:** Replace the parenthetical with OIDC-era examples: `(fix the Trusted Publisher configuration on npmjs.com, fix a workflow permissions typo such as a missing id-token: write)`.

### Info

#### IN-01: npm_guard conflates registry/network failure with "version not published"

**File:** `.github/workflows/ci.yml:119`
**Issue:** `npm view "@jeremiewerner/motto@$PKG_VERSION" version >/dev/null 2>&1` exits non-zero for E404 (intended) but also for transient network/registry failures, which sets `already_published=false` and proceeds to `npm publish`. Fail-loud downstream (the registry rejects duplicate versions), so this cannot cause silent double-publish — but a transient `npm view` failure on an already-published re-run turns a clean skip into a red job.
**Fix:** Distinguish E404 from other failures, e.g. capture stderr and grep for `E404`; treat any other non-zero exit as a hard failure of the guard step itself.

#### IN-02: Workflow file parsed twice at module scope; suite-level asserts outside `it`

**File:** `test/ci-workflow.test.js:12-14, 84-86`
**Issue:** Both describe blocks independently `readFileSync` + `parse` the same file, and both run `assert.ok(Array.isArray(steps), ...)` in the describe body — a failure there aborts suite collection with a raw throw rather than a named test failure.
**Fix:** Hoist one shared `const workflow = parse(readFileSync(CI_YML, 'utf8'))` (combined with the WR-01 fix) and move the `steps` shape assertion into a first `it('jobs.publish.steps is an array', ...)`.

#### IN-03: Step 9.1 `gh secret delete <name>` leaves the secret name unresolved

**File:** `skills/release/SKILL.md:142-146`
**Issue:** The runbook defers the secret name to "whichever secret name Phase 21's checkpoint created" — a `.planning/` archaeology task at execution time, with mis-deletion risk if guessed. The name is discoverable mechanically.
**Fix:** Add `gh secret list` as the first sub-step to identify the exact secret name before deleting.

#### IN-04: `::error::` annotation emitted on stderr

**File:** `.github/workflows/ci.yml:112`
**Issue:** The version_guard writes its `::error::` workflow command with `>&2`. GitHub's documented workflow-command examples emit on stdout; the redirect buys nothing here and risks the annotation not rendering on runner versions that only scan stdout. The `exit 1` carries the actual failure either way, so impact is limited to losing the annotation.
**Fix:** Drop `>&2` from the `echo "::error::..."` line.

---

_Reviewed: 2026-07-05T17:34:08Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
