---
phase: 21-publish-automation-release-rewrite
reviewed: 2026-07-04T20:11:04Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - .github/workflows/ci.yml
  - scripts/pack-install-e2e.mjs
  - skills/release/SKILL.md
  - test/ci-workflow.test.js
  - test/pack-install-e2e.test.js
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 21: Code Review Report (re-review after 21-04 gap closure)

**Reviewed:** 2026-07-04T20:11:04Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Re-review of the publish-automation surface after plan 21-04 closed CR-01 with a `version_guard` step. **The CR-01 fix itself is sound**: `version_guard` (publish step index 3) runs unconditionally (no `if:`, no `continue-on-error`), before `npm_guard` (index 4), `npm publish` (5), `gh_guard` (6), and release creation (7); it fails closed (bash `-e` on the `node -p` substitution, explicit `exit 1` on mismatch); `$GITHUB_REF_NAME` is a default env var available in `run` steps; and the comparison `"v$PKG_VERSION" != "$GITHUB_REF_NAME"` is correctly quoted and handles prerelease tags (`v1.0.0-rc.1`). All 6 tests in the two test files pass when run, and I verified the publish-job step ordering programmatically against the parsed YAML rather than trusting the tests.

Adversarial probing found real gaps around the fix, though none rise to Critical: the ordering test pins `version_guard` only relative to `npm_guard`, so the exact phantom-GitHub-Release reordering that motivated CR-01 is still not test-guarded; the release skill's `success_criteria` now contradicts its own Step 7.2 recovery guidance; the emergency escape hatch would republish the wrong version in precisely the mismatch scenario the guard detects; and `assertTarballClean`'s AUTO_INCLUDED prefix matching was empirically proven (by direct invocation) to admit leak paths like `README-secrets/dump.txt` and `package.json.bak`.

## Warnings

### WR-01: Ordering test does not pin version_guard before gh_guard — the phantom-GitHub-Release path is still not test-guarded

**File:** `test/ci-workflow.test.js:25-34`
**Issue:** CR-01's failure mode was "publish nothing to npm while still creating a GitHub Release." The new ordering test asserts only `version_guard < npm_guard`. If a future edit moves `gh_guard` + "Create GitHub Release" (currently publish step indices 6-7) *above* `version_guard` (index 3), all three structural tests still pass while the phantom-release drift path reopens — a GitHub Release gets created for a mismatched tag before the guard fires. Given this project's documented history of tests-green-but-broken CI regressions (5 recurrences), the ordering contract should cover every guard, not just `npm_guard`.
**Fix:** Assert `version_guard` precedes *both* guards:
```js
it('version_guard runs before every guard step', () => {
  const idx = (id) => steps.findIndex((s) => s.id === id);
  const vg = idx('version_guard');
  assert.ok(vg !== -1 && idx('npm_guard') !== -1 && idx('gh_guard') !== -1);
  assert.ok(vg < idx('npm_guard'), 'version_guard must precede npm_guard');
  assert.ok(vg < idx('gh_guard'), 'version_guard must precede gh_guard');
});
```
(`npm publish` and "Create GitHub Release" are safely coupled to their guards via `if: steps.<guard>.outputs.* == 'false'` — an unset output never equals `'false'` — so pinning the two guard steps suffices.)

### WR-02: SKILL.md success_criteria contradicts Step 7.2 — "recovery is always `gh run rerun`"

**File:** `skills/release/SKILL.md:142`
**Issue:** Step 7.2 (line 107) correctly states that a tag/version-mismatch failure is "**not transient and not fixable by `gh run rerun <id> --failed`**" and requires bumping to a new version + new tag. But the success criteria still asserts: "If CI publish fails, recovery is always `gh run rerun <id> --failed` (or … manual `npm publish` …) — never deleting or recreating the git tag." "Always" is now false — 21-04 introduced a failure class with a different recovery path, and this bullet was not updated. A maintainer (or agent) treating success_criteria as the contract would rerun a deterministically-failing guard forever.
**Fix:** Rewrite the bullet: "If CI publish fails, recovery is `gh run rerun <id> --failed` for transient/config failures, or a new version bump + new matching tag for tag/version-mismatch guard failures — never deleting or recreating the git tag."

### WR-03: Emergency escape hatch republishes the wrong version in the exact mismatch scenario the guard detects

**File:** `skills/release/SKILL.md:117-121`
**Issue:** Step 7.5's escape hatch is `git checkout vX.Y.Z && npm publish`. If the CI failure being recovered from is the version-mismatch guard itself (tag `vX.Y.Z` on a commit whose `package.json` says another version), this command publishes `package.json`'s version — not `X.Y.Z` — perpetuating the very npm/git drift the guard exists to prevent, with no local check to catch it. Step 7.2 excludes `gh run rerun` for this case, but the escape hatch carries no such exclusion (and it already bypasses the D-05 tarball assertion by design).
**Fix:** Add to Step 7.5: "Never use this escape hatch after a tag/version-mismatch guard failure — `npm publish` from the tagged commit would publish `package.json`'s (wrong) version. Before running it, verify `node -p "require('./package.json').version"` equals `X.Y.Z`."

### WR-04: assertTarballClean AUTO_INCLUDED prefix match is loose — admits leak paths (empirically verified)

**File:** `scripts/pack-install-e2e.mjs:49-51`
**Issue:** `AUTO_INCLUDED.some((a) => p === a || p.startsWith(a))` uses raw `startsWith` with no boundary, unlike ALLOWED_PREFIXES whose trailing-slash boundary is deliberately enforced and unit-tested. I invoked the exported function directly — all four of these pass the allowlist without throwing:
- `README-secrets/dump.txt`
- `CHANGELOG.d/notes.env`
- `package.json.bak`
- `LICENSE-x/key.pem`

npm's auto-include rule is "README/LICENSE/CHANGELOG files (with optional extension) at package root," not "any path prefixed by those words." Today `package.json`'s `files` allowlist (`bin/`, `src/`, `dist/public/`) makes these paths unlikely to be packed — but this function is the D-05 leak *detector*, whose whole job is catching a future `files`/npm-behavior regression, and it has a hole exactly where the guard matters. The existing tests only cover the ALLOWED_PREFIXES boundary (`binary/x`), never the AUTO_INCLUDED one.
**Fix:** Bound the auto-included match to root-level files with an optional extension:
```js
const isAutoIncluded = (p) =>
  p === 'package.json' ||
  /^(README|LICENSE|LICENCE|CHANGELOG)(\.[^/]*)?$/i.test(p);
```
and add a negative test (`README-secrets/dump.txt` must throw TARBALL LEAK) to `test/pack-install-e2e.test.js`.

### WR-05: `${{ github.ref_name }}` interpolated into run scripts — injection surface, inconsistent with the convention the test itself enforces

**File:** `.github/workflows/ci.yml:131,140`
**Issue:** `gh_guard` and "Create GitHub Release" interpolate `${{ github.ref_name }}` directly into shell scripts. GitHub's security-hardening guidance flags ref names in `run:` interpolation as a script-injection vector (a tag named `v1";curl …` is a valid git ref). The new structural test explicitly requires that `version_guard` use `$GITHUB_REF_NAME` "not `${{ github.ref_name }}` interpolation" — yet two steps in the same job still interpolate. Currently mitigated: any tag reaching these steps has passed `version_guard`, so it equals `v<semver>` (semver's charset contains no shell metacharacters), and only maintainers can push tags. But that mitigation depends on the ordering contract that WR-01 shows is only partially test-enforced.
**Fix:** Use the env var in both steps, matching version_guard's convention:
```yaml
run: |
  if gh release view "$GITHUB_REF_NAME" >/dev/null 2>&1; then
...
run: gh release create "$GITHUB_REF_NAME" --generate-notes
```

## Info

### IN-01: version_guard's `::error::` annotation is written to stderr

**File:** `.github/workflows/ci.yml:111`
**Issue:** `echo "::error::…" >&2` sends the workflow command to stderr. Workflow-command processing is documented against step *output*; stderr scanning is not a documented guarantee, so the annotation may not render depending on runner behavior. Correctness is unaffected — `exit 1` hard-fails the step either way — but the annotation is the step's UX and the structural test asserts its presence, not its delivery.
**Fix:** Drop `>&2` — the line is a workflow command, not a diagnostic.

### IN-02: assertTarballClean is case-sensitive for auto-included files — false positive on lowercase `readme.md`

**File:** `scripts/pack-install-e2e.mjs:39,50`
**Issue:** npm auto-includes `readme.md` regardless of case; the allowlist matches only uppercase `README`. If the repo's README were ever renamed lowercase, the E2E would fail loudly with a spurious TARBALL LEAK. Fail-loud, not fail-silent, so Info only.
**Fix:** Case-insensitive match (covered by the WR-04 regex's `i` flag).

### IN-03: Step 6 registry check verifies the `latest` dist-tag, not the released version

**File:** `skills/release/SKILL.md:95`
**Issue:** `npm view @jeremiewerner/motto version` prints the `latest` dist-tag. It equals `X.Y.Z` for a normal forward release, but would mislead for any back-patch publish, and doesn't literally verify "the version is live."
**Fix:** `npm view @jeremiewerner/motto@X.Y.Z version` — exits non-zero (npm ≥ 8.13) when the version is absent.

### IN-04: Assertions at describe-body scope abort suite collection instead of reporting as a named test

**File:** `test/ci-workflow.test.js:12-14`
**Issue:** `parse(readFileSync(...))` and `assert.ok(Array.isArray(steps))` run in the `describe` callback. If ci.yml is missing/unparseable or `jobs.publish.steps` is absent, the suite errors during collection with a raw stack trace rather than a named failing `it`. Still red, just less diagnosable.
**Fix:** Wrap the load/shape check in a first `it('ci.yml parses and jobs.publish.steps is an array', ...)`, or lazy-load via a helper called from each `it`.

### IN-05: Structural test does not guard version_guard against `if:` / `continue-on-error:` neutering

**File:** `test/ci-workflow.test.js:36-49`
**Issue:** Adding `continue-on-error: true` or a skipping `if:` to `version_guard` would silently disarm the CR-01 fix while all current structural assertions stay green — the exact tests-green-but-broken failure shape this project has hit five times. Two one-line assertions close it.
**Fix:**
```js
assert.equal(versionGuard.if, undefined, 'version_guard must be unconditional');
assert.notEqual(versionGuard['continue-on-error'], true, 'version_guard must not be continue-on-error');
```

---

_Reviewed: 2026-07-04T20:11:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
