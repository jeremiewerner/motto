---
phase: 21-publish-automation-release-rewrite
verified: 2026-07-04T21:00:00Z
status: human_needed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "Tagging a release publishes to npm automatically and safely — a tag/package.json version mismatch cannot produce a false green run + phantom GitHub Release (Truth #6 / CR-01)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "First real tag-triggered publish run: after this verification, push a real vX.Y.Z tag (with package.json bumped to match) and observe the tag-scoped Actions run end-to-end."
    expected: "version_guard passes silently (versions match); npm_guard/npm publish/gh_guard/gh release create all run and succeed; npm view @jeremiewerner/motto version and gh release view vX.Y.Z both confirm the new version is live. Separately, at some point verify (in a throwaway branch/fork, or by reasoning from the executed bash logic — already spot-checked in this report) that a deliberately mismatched tag would abort the job at version_guard before npm_guard/gh_guard run."
    why_human: "External service integration (real npm registry write, real GitHub Release creation via a brand-new automated path) has never been exercised for real — no v* tag has been pushed since this automation landed. This is explicitly deferred to ship time by the plan's own <verification> section and cannot be exercised on this branch (tag-push trigger requires a real tag ref). While the guard's bash logic was directly executed and confirmed correct in this verification (see Behavioral Spot-Checks), the live GitHub Actions execution path (needs-gating across sibling jobs, secrets, real registry write) is still unproven in production."
---

# Phase 21: Publish Automation & Release Rewrite Verification Report

**Phase Goal:** Tagging a release publishes Motto to npm automatically and safely, and the local release flow shrinks to bump-tag-push with the publish responsibility (and the D-05 tarball assertion) handed to CI.
**Verified:** 2026-07-04T21:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap-closure plan 21-04 executed (previous run found 1 blocking gap: Truth #6 / CR-01)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pushing a `v*` tag triggers a CI publish job gated on all other jobs green, pinned to Node 24, idempotent via `npm view` guard (re-runs safe) | ✓ VERIFIED (regression) | `.github/workflows/ci.yml:85-140` re-read in full: `on.push.tags: ['v*']` (line 6); `needs: [test, dogfood, pack-install-e2e]` (line 90); `if: startsWith(github.ref, 'refs/tags/v')` (line 91); `node-version: 24` (line 102); `npm_guard` step keys on `npm view "@jeremiewerner/motto@$PKG_VERSION"` (lines 114-122). Unchanged since prior verification. |
| 2 | The `release` skill is rewritten: local flow is tests → bump → dogfood sanity → `git push --follow-tags`, documenting CI handoff + never-re-tag recovery runbook | ✓ VERIFIED (regression, content updated) | `skills/release/SKILL.md` re-read in full: Step 4 (line 69) is `git push --follow-tags`, "last maintainer-run command in the local flow"; Step 5 "CI Handoff" now names the `version_guard` pre-publish assertion; Step 7 "If CI Publish Fails" now has an explicit clause (item 2) that a tag/version-mismatch failure is "not transient and not fixable by `gh run rerun <id> --failed`" with correct recovery guidance. `node bin/motto.js lint` → `✓ 3 skills OK`. **Caveat:** see WR-02/WR-03 in Anti-Patterns — the `success_criteria` block (line 142) still says recovery is "always `gh run rerun`", contradicting the correct Step 7.2 guidance; does not invalidate the truth (the authoritative runbook steps are correct) but is a real doc-accuracy bug worth fixing before/at first real release. |
| 3 | The D-05 tarball-leak assertion runs from a committed script in the CI `pack-install-e2e` job — no longer an inline release-skill heredoc | ✓ VERIFIED (regression) | `assertTarballClean` defined/exported in `scripts/pack-install-e2e.mjs:48-59`, called at line ~124; `pack-install-e2e` CI job (`ci.yml:59-71`) runs `node scripts/pack-install-e2e.mjs` on every push. Ran `node --test test/pack-install-e2e.test.js` directly: 3/3 pass. **Caveat:** see WR-04 in Anti-Patterns — I independently re-read `assertTarballClean`'s `isAllowed` helper and confirmed the fresh code review's finding: `AUTO_INCLUDED.some((a) => p === a || p.startsWith(a))` has no path-boundary check (unlike `ALLOWED_PREFIXES`, which is deliberately trailing-slash-bounded), so a hypothetical packed path like `README-secrets/dump.txt` would pass the allowlist undetected. Not exploitable today (nothing in the current `files` allowlist packs such a path) but the leak-detector has a real hole; does not invalidate this truth (assertion exists, runs, and is wired) but is worth a follow-up fix. |
| 4 | Each published version gets a GitHub Release with auto-generated notes (`gh release create --generate-notes`) from the publish job | ✓ VERIFIED (regression) | `ci.yml:138-142`: `gh release create "${{ github.ref_name }}" --generate-notes`, gated on `steps.gh_guard.outputs.already_released == 'false'`. |
| 5 | `NPM_TOKEN` GitHub Actions secret exists on the repo, matching `secrets.NPM_TOKEN` in the publish job, unblocking the real publish path | ✓ VERIFIED (regression, re-confirmed live) | `gh api repos/jeremiewerner/motto/actions/secrets` (re-run directly during this verification) returned `{"total_count":1,"secrets":[{"name":"NPM_TOKEN",...}]}`. |
| 6 | Tagging a release publishes to npm **automatically and safely** — a tag/package.json version mismatch cannot produce a false green run + phantom GitHub Release (Truth #6 / CR-01) | ✓ VERIFIED (gap closed — behaviorally proven, not just structural) | `version_guard` step now exists in `ci.yml:106-113`, positioned immediately after `npm ci` and immediately before `npm_guard`, with no `if:` or `continue-on-error:` key (confirmed by direct read — the step is unconditional). `test/ci-workflow.test.js` (new, committed) parses the workflow and asserts (a) the step exists, (b) its array index is strictly **less than** `npm_guard`'s index — an ordering assertion via `findIndex`, not a substring grep — and (c) its `run` body contains `GITHUB_REF_NAME`, `package.json`, `::error::`, `exit 1`, and does **not** contain the literal `github.ref_name` (proving it uses the env var, not `${{ }}` interpolation). Ran `node --test test/ci-workflow.test.js` directly: 3/3 pass. **Beyond structural proof**, this is an ordering/hard-fail *invariant* (behavior-dependent per this framework's classification), so I extracted the exact `run:` shell body and executed it directly with three scenarios: (1) matching version/tag → exits 0, no error output; (2) mismatched version/tag (`v9.9.9` vs actual `0.0.3`) → exits 1, prints `::error::tag v9.9.9 does not match package.json version 0.0.3` to stderr; (3) prerelease-style tag (`v0.0.1-rc.1`) → correctly matches, exits 0. All three ran exactly as designed. Since the step carries no `if:`/`continue-on-error:` (confirmed by reading the YAML), GitHub Actions' documented default behavior (non-zero exit aborts the job, skipping subsequent steps) means `npm_guard`, `npm publish`, `gh_guard`, and `Create GitHub Release` cannot run after a `version_guard` failure — closing the exact phantom-release drift path from the prior verification's gap. |

**Score:** 6/6 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | tag-triggered idempotent publish job, npm-drift guard, tag push trigger, tag/version consistency guard | ✓ VERIFIED | Present, substantive, wired; `version_guard` inserted at the correct position (after `npm ci`, before `npm_guard`), unconditional |
| `test/ci-workflow.test.js` | ordering-aware structural test (existence + index ordering + hard-fail-body-shape) | ✓ VERIFIED | New file; 3/3 tests pass when run directly; asserts array-index ordering (not substring grep) |
| `scripts/pack-install-e2e.mjs` | `assertTarballClean` exported, wired, entry-point-guarded | ✓ VERIFIED (with WR-04 caveat) | Exported and called; leak-boundary logic has a real but currently-inert gap (see Anti-Patterns) |
| `test/pack-install-e2e.test.js` | positive + adversarial + partial-prefix test cases | ✓ VERIFIED | 3/3 tests pass when run directly |
| `skills/release/SKILL.md` | rewritten procedure skill, lint-clean, accurate CI-handoff/recovery runbook | ✓ VERIFIED (with WR-02/WR-03 caveat) | `node bin/motto.js lint` → `✓ 3 skills OK`; Steps 5/7 accurate; `success_criteria` block has a stale contradictory bullet (see Anti-Patterns) |
| `NPM_TOKEN` GitHub Actions secret | exists, named exactly `NPM_TOKEN` | ✓ VERIFIED | Re-confirmed live via `gh api .../actions/secrets` during this verification (total_count 1) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `publish` job | `test`, `dogfood`, `pack-install-e2e` jobs | `needs: [...]` | ✓ WIRED | Unchanged from prior verification |
| `npm publish` step | `secrets.NPM_TOKEN` | `env.NODE_AUTH_TOKEN` | ✓ WIRED | Unchanged; secret confirmed live |
| `pack-install-e2e` script | `assertTarballClean` | direct call on captured `packedFiles` | ✓ WIRED | Unchanged |
| `publish` job permissions | workflow default | job-level override | ✓ WIRED | Unchanged (`contents: write` scoped to `publish` only) |
| `version_guard` step | `npm_guard` step | array-index ordering in `jobs.publish.steps`, enforced by `test/ci-workflow.test.js` | ✓ WIRED | Closes the previously-NOT_WIRED cross-check; `version_guard` (index 3) < `npm_guard` (index 4) < `gh_guard` (index 6) — confirmed by direct read of `ci.yml`, so `version_guard` in fact precedes **both** guards today, though the committed test only pins the `npm_guard` relationship (see WR-01 in Anti-Patterns for the residual regression-coverage gap on the `gh_guard` relationship specifically) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| PUB-01 | 21-01, 21-04 | Tag-triggered publish job, gated, Node 24, idempotent guard, tag/version consistency guard | ✓ SATISFIED | `ci.yml` structure verified; the "safely" clause is now behaviorally proven, not just structurally present (Truth #6) |
| PUB-02 | 21-02, 21-04 | Release skill rewritten to bump→tag→push, CI handoff + recovery runbook | ✓ SATISFIED | SKILL.md verified; success_criteria doc bug (WR-02) noted as a follow-up, does not block the requirement's literal text |
| PUB-03 | 21-01 | D-05 assertion moved to committed CI script | ✓ SATISFIED | `assertTarballClean` verified; WR-04 leak-boundary gap noted as a follow-up, does not block the requirement's literal text |
| PUB-04 | 21-01 | GitHub Release with auto-generated notes | ✓ SATISFIED | `--generate-notes` confirmed |

No orphaned requirements — `REQUIREMENTS.md` maps exactly PUB-01..04 to Phase 21 (all `[x]`), and PUB-05 is explicitly mapped to Phase 22 (not orphaned; correctly out of scope here).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `version_guard` bash logic — matching tag/version | Extracted `run:` body executed directly with `GITHUB_REF_NAME=v0.0.3` (actual `package.json` version) | exit 0, no output | ✓ PASS |
| `version_guard` bash logic — mismatched tag/version | Extracted `run:` body executed directly with `GITHUB_REF_NAME=v9.9.9` | exit 1, `::error::tag v9.9.9 does not match package.json version 0.0.3` on stderr | ✓ PASS |
| `version_guard` bash logic — prerelease tag | Extracted `run:` body executed directly with `GITHUB_REF_NAME=v0.0.1-rc.1` matching a simulated `PKG_VERSION=0.0.1-rc.1` | exit 0, no output | ✓ PASS |
| `test/ci-workflow.test.js` (new gap-closure test) | `node --test test/ci-workflow.test.js` | 3/3 pass | ✓ PASS |
| `test/pack-install-e2e.test.js` regression | `node --test test/pack-install-e2e.test.js` | 3/3 pass | ✓ PASS |
| Full test suite regression | `node --test` | 237 tests, 56 suites, 0 fail | ✓ PASS |
| Release skill lints clean | `node bin/motto.js lint` | `✓ 3 skills OK` | ✓ PASS |
| NPM_TOKEN secret exists (live) | `gh api repos/jeremiewerner/motto/actions/secrets` | `total_count: 1`, name `NPM_TOKEN` | ✓ PASS |
| Plan 21-04 commits exist | `git show --stat d3227f1`, `git show --stat 6a39b45` | both commits present with expected file diffs | ✓ PASS |
| Live tag-triggered publish path (real `npm publish`/`gh release create` execution) | N/A — no real `v*` tag pushed since this automation landed | not exercised | ? SKIP — deferred to first real release per plan's own `<verification>` section; cannot be exercised on this branch (tag-push trigger requires a real tag ref) |

### Anti-Patterns Found

Fresh code review (`21-REVIEW.md`, re-review after gap closure): 0 critical / 5 warnings / 5 info. Independently re-read all 5 files reviewed; confirms the review's findings are accurate. None rise to blocker level against this phase's must-haves — all are either (a) regression-coverage gaps for *future* edits, or (b) pre-existing, previously-acknowledged, out-of-scope-for-this-plan items.

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `test/ci-workflow.test.js` | 25-34 | Ordering test pins `version_guard < npm_guard` only, not `version_guard < gh_guard` — today's actual step order already has `version_guard` before both guards, but a future edit reordering `gh_guard` above `version_guard` would still pass all 3 current tests while reopening the phantom-release path | ⚠️ WARNING | Regression-coverage gap, not a current failure (WR-01, confirmed by independent read) |
| `skills/release/SKILL.md` | 142 | `success_criteria` bullet still reads "recovery is always `gh run rerun <id> --failed`", contradicting the correct Step 7.2 guidance added by this plan | ⚠️ WARNING | Doc-accuracy bug; the authoritative process Steps are correct, but this bullet could mislead a reader who consults it directly (WR-02, confirmed by independent read) |
| `skills/release/SKILL.md` | 117-121 | Step 7.5 emergency escape hatch (`git checkout vX.Y.Z && npm publish`) has no guard against being used after a version-mismatch guard failure — it would publish `package.json`'s wrong version | ⚠️ WARNING | Pre-existing risk area, now sharper given the new guard; last-resort path, not the primary flow (WR-03, confirmed by independent read) |
| `scripts/pack-install-e2e.mjs` | 49-51 | `AUTO_INCLUDED` prefix match (`p.startsWith(a)`) has no path-boundary check, unlike the deliberately-bounded `ALLOWED_PREFIXES` — admits leak paths like `README-secrets/dump.txt` | ⚠️ WARNING | Directly re-read and confirmed the logic gap; not exploitable under the current `package.json` `files` allowlist, but the leak detector has a real hole for a future regression (WR-04, pre-existing, out of scope for plan 21-04) |
| `.github/workflows/ci.yml` | 131, 140 | `${{ github.ref_name }}` interpolated directly into `gh_guard`/`Create GitHub Release` `run:` bodies — inconsistent with the env-var convention the new `version_guard` (and its own test) enforces | ⚠️ WARNING | Pre-existing (carried over as WR-01 from the prior review round), out of scope for plan 21-04's single-step addition (WR-05 in this round's numbering) |
| `.github/workflows/ci.yml` | 111 | `::error::` annotation written to stderr (`>&2`) | ℹ️ INFO | Workflow-command rendering guarantee is documented against stdout, not stderr; `exit 1` still hard-fails regardless (IN-01) |
| `scripts/pack-install-e2e.mjs` | 39, 50 | Case-sensitive `README` match; npm auto-includes `readme.md` regardless of case | ℹ️ INFO | Would fail loud (spurious leak), not fail silent, if README were ever renamed lowercase (IN-02) |
| `skills/release/SKILL.md` | 95 | Step 6 checks `latest` dist-tag, not the specific released version | ℹ️ INFO | Misleads only on a back-patch publish scenario (IN-03) |
| `test/ci-workflow.test.js` | 12-14 | Parse/shape assertions run at `describe`-body scope, aborting suite collection with a raw stack trace instead of a named failing test if `ci.yml` is unparseable | ℹ️ INFO | Still red, just less diagnosable (IN-04) |
| `test/ci-workflow.test.js` | 36-49 | No assertion against `version_guard` being neutered via `if:`/`continue-on-error:` | ℹ️ INFO | Two one-line assertions would close it; today's step has neither key (confirmed) (IN-05) |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any phase-modified file (`ci.yml`, `test/ci-workflow.test.js`, `skills/release/SKILL.md`, `scripts/pack-install-e2e.mjs`, `test/pack-install-e2e.test.js`).

### Human Verification Required

1. **First real tag-triggered publish run**
   - **Test:** After this verification, bump `package.json` to a new version, push a real `vX.Y.Z` tag matching it, and observe the tag-scoped Actions run end-to-end.
   - **Expected:** `version_guard` passes silently (versions match), then `npm_guard`/`npm publish`/`gh_guard`/`gh release create` all run and succeed; `npm view @jeremiewerner/motto version` and `gh release view vX.Y.Z` both confirm the new version is live.
   - **Why human:** External service integration (real npm registry write, real GitHub Release creation) via a brand-new automated path that has never executed for real — no `v*` tag has been pushed since this automation landed. Explicitly deferred to ship time by the plan's own `<verification>` section; cannot be exercised on this branch. The guard's bash logic itself has been directly executed and confirmed correct in this report (see Behavioral Spot-Checks) — what remains unproven is the live GitHub Actions orchestration (cross-job `needs` gating, secrets, actual registry/API writes).

### Gaps Summary

No gaps remain. The single blocking gap from the prior verification (Truth #6 / CR-01 — the publish job's two idempotency guards were never cross-checked against the pushed tag, allowing a tag/`package.json`-version mismatch to produce a green run with a phantom GitHub Release and no actual npm publish) is now closed: `version_guard` runs unconditionally, immediately after `npm ci` and before `npm_guard`, hard-failing on mismatch. This was verified structurally (committed ordering-aware test, independently re-run) **and** behaviorally (the extracted bash logic was executed directly with matching, mismatched, and prerelease-tag scenarios, all producing the expected exit codes and error messages).

Status is `human_needed` rather than `passed` for one reason only: the live, real-world tag-triggered publish path (actual `npm publish` + `gh release create` against production npm/GitHub) has never been exercised, by design — it's deferred to the first real release. This is not a code gap; it is the natural "first live run" checkpoint for any new release-automation system, and is explicitly called out as deferred in the plan's own verification section. A fresh code review found 0 critical issues and 5 warnings, all either forward-looking regression-coverage gaps (the ordering test doesn't yet pin `version_guard` before `gh_guard` specifically, though today's step order already satisfies that relationship) or pre-existing/out-of-scope documentation nits (a stale `success_criteria` bullet, an unguarded emergency escape hatch, a loose tarball-leak-detector regex, and lingering `github.ref_name` interpolation in two untouched steps) — none of which demonstrate that today's actual publish automation fails to work safely for the tag/version-mismatch scenario this phase was built to close.

All four literal requirement IDs (PUB-01, PUB-02, PUB-03, PUB-04) are satisfied per their exact `REQUIREMENTS.md` wording, and the phase goal's "safely" clause (previously the sole gap) is now met.

---

_Verified: 2026-07-04T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
