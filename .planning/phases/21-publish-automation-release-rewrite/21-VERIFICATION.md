---
phase: 21-publish-automation-release-rewrite
verified: 2026-07-04T20:30:00Z
status: gaps_found
score: 5/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Tagging a release publishes to npm automatically and SAFELY — a tag/package.json version mismatch must not produce a false-positive green CI run plus a GitHub Release without an actual npm publish"
    status: failed
    reason: >
      ci.yml's publish job has no assertion that the pushed git tag (github.ref_name)
      matches package.json's version before either idempotency guard runs. npm_guard
      keys on package.json version; gh_guard and `gh release create` key on the tag
      name — two different identifiers, never cross-checked. Concrete failure path
      (verified by reading .github/workflows/ci.yml:106-134, matches 21-REVIEW.md
      CR-01 exactly): tag v0.0.7 is pushed on a commit whose package.json still says
      0.0.6 (already on the registry). npm_guard sees @jeremiewerner/motto@0.0.6
      already published -> already_published=true -> npm publish silently skipped,
      no error. gh_guard sees no release named v0.0.7 -> gh release create v0.0.7
      --generate-notes succeeds. The job is green. A GitHub Release v0.0.7 now exists
      for a version that was never published to npm. This is precisely the
      "npm stuck at old version while git tags advanced" drift this project has
      already suffered (skills/release/SKILL.md Step 6 cites it explicitly as the
      reason for the Verify-CI-Published step) — the phase goal's own "safely"
      clause is not met for this specific, plausible operator-error path, and the
      new automation would report success while silently reproducing the exact
      drift it was built to close.
    artifacts:
      - path: ".github/workflows/ci.yml"
        issue: "publish job (lines 85-134) has no tag-vs-package.json-version consistency guard step ahead of npm_guard/gh_guard"
    missing:
      - "A hard-fail assertion step before npm_guard runs, comparing $GITHUB_REF_NAME to v$(node -p \"require('./package.json').version\") and exiting non-zero (::error::) on mismatch — exact fix already drafted in 21-REVIEW.md CR-01"
---

# Phase 21: Publish Automation & Release Rewrite Verification Report

**Phase Goal:** Tagging a release publishes Motto to npm automatically and safely, and the local release flow shrinks to bump-tag-push with the publish responsibility (and the D-05 tarball assertion) handed to CI.
**Verified:** 2026-07-04T20:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pushing a `v*` tag triggers a CI publish job gated on all other jobs green, pinned to Node 24, idempotent via `npm view` guard (re-runs safe) | ✓ VERIFIED | `.github/workflows/ci.yml:85-119`; structural verify command printed `ci-structure-ok`; `on.push.tags: ['v*']` present (line 6); `needs: [test, dogfood, pack-install-e2e]` (line 90); `if: startsWith(github.ref, 'refs/tags/v')` (line 91); `node-version: 24` (line 102); `npm_guard` step (lines 106-114) keys on `npm view "@jeremiewerner/motto@$PKG_VERSION"`. Review's "Verified Non-Issues" independently confirmed `npm view pkg@missing-version` exits 1 on npm 11, and `gh run rerun --failed` correctly resumes only incomplete guard steps. |
| 2 | The `release` skill is rewritten: local flow is tests → bump → dogfood sanity → `git push --follow-tags`, documenting CI handoff + never-re-tag recovery runbook | ✓ VERIFIED | `skills/release/SKILL.md` read in full: Step 4 (line 64) is `git push --follow-tags` and is explicitly the "last maintainer-run command in the local flow"; Step 5 "CI Handoff", Step 6 "Verify CI Published", Step 7 "If CI Publish Fails" all present and describe the actual `ci.yml` behavior accurately (npm_guard/gh_guard, `--generate-notes`, `gh run rerun <id> --failed`); Step 7.1 explicitly states "Do NOT delete or recreate the git tag." `whoami` count = 0 (grep confirmed). `node bin/motto.js lint` → `✓ 3 skills OK`. |
| 3 | The D-05 tarball-leak assertion runs from a committed script in the CI `pack-install-e2e` job — no longer an inline release-skill heredoc | ✓ VERIFIED (see WR-04 warning) | `assertTarballClean` defined and exported in `scripts/pack-install-e2e.mjs:48-59`, called at line 124 immediately after the `packedFiles` capture; `pack-install-e2e` CI job (ci.yml:59-71) runs `node scripts/pack-install-e2e.mjs` on every push (not gated to tags); `test/pack-install-e2e.test.js` has a mandatory adversarial (negative) case that throws with `TARBALL LEAK` plus each offending path, and a partial-prefix boundary case (`binary/x` correctly flagged as a leak). Ran `node --test test/pack-install-e2e.test.js` directly: 3/3 pass. SKILL.md no longer contains the old inline heredoc. **Caveat:** see WR-04 in Anti-Patterns — the tarball this assertion validates in CI is the *unbuilt* tarball (no `dist/public/**`), not the one `npm publish`'s `prepublishOnly` actually ships, so real build-time additions to the packed set are not covered by this check today. |
| 4 | Each published version gets a GitHub Release with auto-generated notes (`gh release create --generate-notes`) from the publish job | ✓ VERIFIED | `ci.yml:130-134`: `gh release create "${{ github.ref_name }}" --generate-notes`, gated on `steps.gh_guard.outputs.already_released == 'false'` (independent from the npm guard). |
| 5 | `NPM_TOKEN` GitHub Actions secret exists on the repo, matching `secrets.NPM_TOKEN` in the publish job, unblocking the real publish path | ✓ VERIFIED | `gh api repos/jeremiewerner/motto/actions/secrets` (run directly during this verification) returned `{"total_count":1,"secrets":[{"name":"NPM_TOKEN", ...}]}`. Matches orchestrator-verified fact and 21-03-SUMMARY.md's independently-checked API output. |
| 6 | Tagging a release publishes to npm **automatically and safely** — a tag/package.json version mismatch cannot produce a false green run + phantom GitHub Release | ✗ FAILED | See `gaps` in frontmatter. Confirmed by direct reading of `ci.yml:106-134`: `npm_guard` compares only `package.json` version against the registry; `gh_guard`/`gh release create` compare only the tag name; nothing asserts the two agree. This reproduces 21-REVIEW.md's Critical finding CR-01 verbatim. |

**Score:** 5/6 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | tag-triggered idempotent publish job, npm-drift guard, tag push trigger | ✓ VERIFIED (with gap) | Present, substantive, wired; structural parse assertion (`ci-structure-ok`) passed; missing tag/version consistency check (see gap) |
| `scripts/pack-install-e2e.mjs` | `assertTarballClean` exported, wired, entry-point-guarded | ✓ VERIFIED | Exported at line 188; called at line 124; `import.meta.url`/`process.argv[1]` entry guard at line 179; no bare `process.exit` inside the function (throws only) |
| `test/pack-install-e2e.test.js` | positive + adversarial + partial-prefix test cases | ✓ VERIFIED | 3/3 tests pass when run directly (`node --test test/pack-install-e2e.test.js`) |
| `skills/release/SKILL.md` | rewritten procedure skill, lint-clean | ✓ VERIFIED | `node bin/motto.js lint` → `✓ 3 skills OK`; content matches plan's required sections |
| `NPM_TOKEN` GitHub Actions secret | exists, named exactly `NPM_TOKEN` | ✓ VERIFIED | Confirmed live via `gh api .../actions/secrets` during this verification (total_count 1) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `publish` job | `test`, `dogfood`, `pack-install-e2e` jobs | `needs: [...]` | ✓ WIRED | Exact job keys match (verified via YAML parse) |
| `npm publish` step | `secrets.NPM_TOKEN` | `env.NODE_AUTH_TOKEN` | ✓ WIRED | `ci.yml:118-119`; secret confirmed to exist |
| `pack-install-e2e` script | `assertTarballClean` | direct call on captured `packedFiles` | ✓ WIRED | `scripts/pack-install-e2e.mjs:118-124` |
| `publish` job permissions | workflow default | job-level override | ✓ WIRED | `permissions: { contents: write }` scoped to `publish` only (line 93-94); workflow default stays `contents: read` (line 16) |
| `npm_guard` output ↔ `gh_guard` output | tag/version consistency | *(none)* | ✗ NOT_WIRED | No link exists between the two guards or an upstream tag/version assertion — this is the CR-01 gap |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| PUB-01 | 21-01 | Tag-triggered publish job, gated, Node 24, idempotent guard | ✓ SATISFIED (literal text) | ci.yml structure verified; note: the requirement's literal wording ("idempotent via version-existence guard; re-runs safe") is satisfied — the broader phase-goal "safely" property is not (Truth #6) |
| PUB-02 | 21-02 | Release skill rewritten to bump→tag→push, CI handoff + recovery runbook | ✓ SATISFIED | SKILL.md verified in full |
| PUB-03 | 21-01 | D-05 assertion moved to committed CI script | ✓ SATISFIED | assertTarballClean verified; WR-04 coverage caveat noted, does not block requirement text |
| PUB-04 | 21-01 | GitHub Release with auto-generated notes | ✓ SATISFIED | `--generate-notes` confirmed |

No orphaned requirements — REQUIREMENTS.md maps exactly PUB-01..04 to Phase 21, and all four appear in a plan's `requirements` field ([x] in REQUIREMENTS.md matches).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Tarball-leak assertion (positive + adversarial + boundary) | `node --test test/pack-install-e2e.test.js` | 3/3 pass | ✓ PASS |
| ci.yml structural contract (publish job needs/if/perms/trigger/npm-drift guard) | `node --input-type=module -e (yaml parse)...` | printed `ci-structure-ok` | ✓ PASS |
| release skill lints clean | `node bin/motto.js lint` | `✓ 3 skills OK` | ✓ PASS |
| Full test suite regression | `node --test` | 234 tests, 55 suites, 0 fail | ✓ PASS |
| NPM_TOKEN secret exists | `gh api repos/jeremiewerner/motto/actions/secrets` | `total_count: 1`, name `NPM_TOKEN` | ✓ PASS |
| Live tag-triggered publish path (real `npm publish`/`gh release create` execution) | N/A — no real `v*` tag has been pushed since this automation landed | not exercised | ? SKIP — explicitly deferred to first real release per plan 21-01's own `<verification>` section; cannot be exercised on this branch (branch-push trigger is scoped to `main`) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | 106-134 | No tag↔package.json version consistency assertion before either idempotency guard | 🛑 BLOCKER | See gap — reproduces the project's own documented npm/tag drift failure mode with a green CI badge (CR-01) |
| `.github/workflows/ci.yml` | 123, 132 | `${{ github.ref_name }}` interpolated directly into `run:` shell scripts (should use `$GITHUB_REF_NAME` env var) | ⚠️ WARNING | Script-injection pattern (GitHub's own hardening docs warn against this); exposure limited to actors with tag-push (write) access — not remotely exploitable today, but zero-cost to fix (WR-01) |
| `.github/workflows/ci.yml` | 110 | `npm_guard` hardcodes package name `@jeremiewerner/motto` instead of deriving from `package.json` | ⚠️ WARNING | Guard becomes decorative if the package is ever renamed/rescoped (WR-02) |
| `.github/workflows/ci.yml` | 110, 123 | `npm view`/`gh release view` guards conflate "does not exist" with "check failed" (`2>/dev/null` swallows the real error) | ⚠️ WARNING | A registry/API flake produces a confusing failure instead of a clear diagnosis; safe-loud direction (no wrong publish), but degrades debuggability (WR-03) |
| `scripts/pack-install-e2e.mjs` | 113-124 | `npm pack` runs before any `motto build`, so `assertTarballClean` validates an unbuilt tarball missing `dist/public/**` — not the tarball `npm publish`'s `prepublishOnly` actually ships | ⚠️ WARNING | Today's delta is empty (nothing currently leaks), but future build-side-effects in packed paths would ship unvalidated (WR-04) |
| `skills/release/SKILL.md` | 93-96 | Step 6 registry check reads unpinned `npm view ... version` (relies on eyeball diff vs. pinning the expected version) | ⚠️ WARNING | Soft check — exactly the class of oversight that let historical drift go unnoticed (WR-05) |
| `.github/workflows/ci.yml` | 91 | `publish` job has no `github.repository == 'jeremiewerner/motto'` guard | ℹ️ INFO | Cosmetic red-CI-noise risk on forks only (IN-03) |
| `skills/release/SKILL.md` | 29 | Stale test-count anchor ("`# pass 75`") vs. actual 234 | ℹ️ INFO | Technically true via "(or higher)" but invites doubt (IN-04) |
| `test/pack-install-e2e.test.js` | 21-38 | Negative test set omits `dist/private/` leak class (the most security-relevant one) | ℹ️ INFO | Worth adding per IN-05 |
| `scripts/pack-install-e2e.mjs` | 49-51 | Dead `p === a` branch; case-sensitive AUTO_INCLUDED match | ℹ️ INFO | Cosmetic (IN-01) |
| `scripts/pack-install-e2e.mjs` | 167-172 | Sequential `await rm()` in `finally` can mask the real error on cleanup failure | ℹ️ INFO | Rare (EBUSY-class), not currently triggered (IN-02) |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any phase-modified file (`ci.yml`, `scripts/pack-install-e2e.mjs`, `test/pack-install-e2e.test.js`, `skills/release/SKILL.md`).

### Human Verification Required

None required to resolve the status determination (gaps_found already fires on Truth #6 / CR-01 alone). One item is noted for awareness, not as a blocking checkpoint:

1. **First real tag-triggered publish run**
   - **Test:** After the CR-01 fix lands, push a real `vX.Y.Z` tag and observe the Actions run.
   - **Expected:** Two workflow runs fire (one per updated ref); the tag-scoped run's `publish` job runs `npm publish` successfully and creates a GitHub Release; `npm view @jeremiewerner/motto version` and `gh release view vX.Y.Z` both confirm.
   - **Why human:** External service integration (real npm registry write, real GitHub Release) — cannot be exercised statically or on this branch; the plan itself defers this to ship time.

### Gaps Summary

One blocking gap: the publish job's two idempotency guards (`npm_guard` keyed on `package.json` version, `gh_guard` keyed on the tag name) are never cross-checked against each other. A tag pushed on a commit whose `package.json` version doesn't match the tag (a plausible operator slip — forgetting to bump, or tagging the wrong commit) makes `npm_guard` silently skip the publish (because the *old* version is already on the registry) while `gh_guard` still creates a GitHub Release for the new tag — a green CI run that looks like a successful release but published nothing. This is not a hypothetical: it is the exact "npm stuck at an old version while git tags advanced" drift this project has already lived through once (acknowledged in the rewritten `skills/release/SKILL.md` itself, Step 6), and the phase's own goal statement promises publishing "automatically and **safely**" — this specific failure mode is not safe.

The fix is small and already drafted verbatim in `21-REVIEW.md` (CR-01): add a hard-fail guard step before `npm_guard` that compares `$GITHUB_REF_NAME` to `v$(node -p "require('./package.json').version")` and exits non-zero on mismatch. This does not require replanning the phase — a follow-up plan/patch adding this single step (plus, while touching the same lines, the trivially-bundled WR-01 fix of using `$GITHUB_REF_NAME` instead of `${{ github.ref_name }}` interpolation) should close it.

All four literal requirement IDs (PUB-01, PUB-02, PUB-03, PUB-04) are individually satisfied per their exact REQUIREMENTS.md wording — this gap is a phase-goal-level ("...safely...") finding surfaced per the orchestrator's explicit request to weigh 21-REVIEW.md's CR-01 against the phase must-haves, not a requirement-ID-level failure.

---

_Verified: 2026-07-04T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
