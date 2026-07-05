---
phase: 21-publish-automation-release-rewrite
fixed_at: 2026-07-04T21:05:00Z
review_path: .planning/phases/21-publish-automation-release-rewrite/21-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 21: Code Review Fix Report

**Fixed at:** 2026-07-04T21:05:00Z
**Source review:** .planning/phases/21-publish-automation-release-rewrite/21-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (0 Critical, 5 Warning; fix_scope=critical_warning)
- Fixed: 5
- Skipped: 0

Post-fix verification: full suite `npm test` — 239 pass / 0 fail; `node bin/motto.js lint` — 3 skills OK. All fixes were applied in an isolated worktree and fast-forwarded onto `gsd/v0.0.6-prove-publish`.

## Fixed Issues

### WR-01: Ordering test does not pin version_guard before gh_guard

**Files modified:** `test/ci-workflow.test.js`
**Commit:** 0ba68c2
**Applied fix:** Replaced the `version_guard runs before npm_guard` test with `version_guard runs before every guard and side-effect step` — asserts `version_guard` precedes `npm_guard`, `gh_guard`, the `npm publish` step, and the `Create GitHub Release` step (looked up by step name), closing the phantom-GitHub-Release reordering path that motivated CR-01. Went beyond the review's minimal suggestion by also pinning the two side-effect steps directly, per fix guidance.

### WR-02: SKILL.md success_criteria contradicts Step 7.2

**Files modified:** `skills/release/SKILL.md`
**Commit:** 3b7aeaa
**Applied fix:** Rewrote the stale "recovery is always `gh run rerun`" success-criteria bullet (line 142) to distinguish transient/config failures (rerun or emergency manual publish) from tag/version-mismatch guard failures (new version bump + new matching tag), keeping the never-delete-the-tag invariant.

### WR-03: Emergency escape hatch republishes the wrong version in the mismatch scenario

**Files modified:** `skills/release/SKILL.md`
**Commit:** c7e0bb2
**Applied fix:** Added an explicit exclusion to Step 7.5: never use the `git checkout vX.Y.Z && npm publish` escape hatch after a tag/version-mismatch guard failure, plus a mandatory local pre-check (`node -p "require('./package.json').version"` must equal `X.Y.Z`) with fallback to the Step 7.2 bump-and-retag recovery.

### WR-04: assertTarballClean AUTO_INCLUDED prefix match is loose

**Files modified:** `scripts/pack-install-e2e.mjs`, `test/pack-install-e2e.test.js`
**Commit:** 220610b
**Applied fix:** Replaced the raw `startsWith` AUTO_INCLUDED array with an anchored, case-insensitive regex `/^(README|LICENSE|LICENCE|CHANGELOG)(\.[^/]*)?$/i` plus exact `package.json` match — bounding auto-included matching to root-level files with an optional non-slash extension. Added a negative test proving all four review-cited leak paths (`README-secrets/dump.txt`, `CHANGELOG.d/notes.env`, `package.json.bak`, `LICENSE-x/key.pem`) now throw TARBALL LEAK, and a positive test for legit variants (`readme.md`, `README.txt`, `LICENCE`, `license.md`, `ChangeLog.md`). The `i` flag also resolves IN-02 (lowercase `readme.md` false positive) as a side effect.

### WR-05: `${{ github.ref_name }}` interpolated into run scripts

**Files modified:** `.github/workflows/ci.yml`
**Commit:** 49c0af1
**Applied fix:** Replaced `${{ github.ref_name }}` interpolation with `"$GITHUB_REF_NAME"` env-var usage in both the `gh_guard` step (line 131) and the `Create GitHub Release` step (line 140), matching the convention `version_guard` already uses and that the structural test enforces for it. Verified programmatically that no `github.ref_name` interpolation remains in any publish-job step and the YAML still parses.

## Skipped Issues

None.

---

_Fixed: 2026-07-04T21:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
