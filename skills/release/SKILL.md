---
name: release
description: Maintainer release checklist for Motto — run tests, bump version, dogfood lint and build, and hand off to CI for publish. Use this skill when releasing a new Motto version.
audience: private
template: procedure
allowed-tools:
  - "Bash(node *)"
  - "Bash(npm *)"
  - "Bash(git *)"
  - "Bash(gh *)"
---

# Releasing Motto

<role>
You are the Motto release assistant for the maintainer. Guide through each locally-run release step in order: tests, version bump, dogfood sanity check, then hand off to CI with `git push --follow-tags`. After the push, guide verifying that CI actually published the release, and — if it didn't — walk the never-re-tag recovery runbook.
</role>

<process>

## Step 1 — Pre-Release Gate: Tests

All tests must pass before tagging.

```
node --test
```

Expected output: `# pass 75` (or higher) and `# fail 0`. If any test fails, stop. Fix the failure before proceeding.

## Step 2 — Version Bump

Starting from a **clean working tree** (no uncommitted changes — `git status` must be empty):

```
npm version X.Y.Z -m "chore: release v%s"
```

Replace `X.Y.Z` with the new version (e.g. `0.0.4`). This single command:

1. Bumps `package.json` to `X.Y.Z`.
2. Runs the `version` lifecycle script — auto-updates `motto.yaml` to `X.Y.Z` and stages it.
3. Creates a single git commit containing `package.json`, `motto.yaml`, and `package-lock.json`.
4. Creates git tag `vX.Y.Z`.

The husky pre-commit hook re-runs all tests during this commit — if they fail the commit is aborted. To skip hooks only when tests were just confirmed in Step 1: add `--no-commit-hooks` (escape hatch; use sparingly).

**Note on v0.0.3:** The very first release using this script is v0.0.4 onward. v0.0.3's version was drift-corrected manually in Phase 7 (committed 451f92e) and first published to npm on 2026-07-01; its `v0.0.3` git tag was created retroactively at that first publish, not by this script. From v0.0.4 on, `npm version` creates the tag as part of the flow.

## Step 3 — Dogfood Check (local pre-push sanity check)

Run Motto against its own skill tree, as a local sanity check before handing off to CI:

```
node bin/motto.js lint && node bin/motto.js build
```

Expected:
- `motto lint` → `✓ N skills OK` (open-ended count as skills grow)
- `motto build` → exits 0; `dist/public/` and `dist/private/` are populated

If lint fails, fix the skill content before pushing. The skill tree must pass clean on the version being released. CI's `dogfood` job re-runs the equivalent check against the tagged commit — this local run is a fast fail-early check, not the sole gate.

## Step 4 — Push (hand off to CI)

Push the release commit and tag together:

```
git push --follow-tags
```

This is the **last maintainer-run command in the local flow** — no local registry publish, and no local registry-auth check. `git push --follow-tags` pushes both the release commit and the `vX.Y.Z` tag to `github:jeremiewerner/motto` in one command; everything from here is CI's responsibility.

## Step 5 — CI Handoff

`git push --follow-tags` updates two refs (`refs/heads/main` and `refs/tags/vX.Y.Z`) in one push, which triggers **two separate GitHub Actions workflow runs**. The tag-scoped run (`ref = refs/tags/vX.Y.Z`) re-runs the full `test` / `dogfood` / `pack-install-e2e` suite against the exact tagged commit — including the D-05 tarball-leak assertion (`assertTarballClean`, now enforced inside `pack-install-e2e` on every push, not just at release time). Before either idempotency guard runs, the `publish` job first asserts the pushed tag `vX.Y.Z` matches `package.json`'s version and hard-fails (with a `::error::` annotation) if they disagree — so a tag pushed on an un-bumped or wrong-version commit fails fast instead of publishing nothing to npm while still creating a GitHub Release. If, and only if, that guard and all three of those jobs pass within that same tag-triggered run, the `publish` job runs:

1. `npm publish` (guarded by a `npm view <pkg>@<version>` existence check — skipped if that version is already on the registry).
2. `gh release create --generate-notes` (guarded independently by a `gh release view <tag>` existence check — skipped if the release already exists).

These two guards are fully independent — a partial failure (e.g. npm publish succeeds but the GitHub Release step fails) never causes a re-run to skip the step that didn't complete.

**This is asynchronous.** Nothing local confirms success synchronously — do not treat the push itself as "released." Proceed to Step 6 before any housekeeping.

## Step 6 — Verify CI Published

Before doing anything else, confirm all three of the following:

1. The Actions run for the pushed tag is green:
   ```
   gh run list --workflow=CI --branch=vX.Y.Z --limit=1
   ```
2. The version is live on the registry:
   ```
   npm view @jeremiewerner/motto version
   ```
3. The GitHub Release exists:
   ```
   gh release view vX.Y.Z
   ```

Only proceed to Step 8 (Post-Release Housekeeping) once all three confirm. Do not assume "tag pushed" means "published" — this project has previously drifted (npm stuck at an old version while git tags advanced) precisely because that assumption went unchecked.

## Step 7 — If CI Publish Fails

1. **Do NOT delete or recreate the git tag.** Tags are permanent handoff markers — deleting and re-pushing one rewrites a ref other clones may have already fetched and destroys the audit trail.
2. **If the failure is the tag/version-mismatch guard** (the pushed tag does not match `package.json`'s version), it is **not transient and not fixable by `gh run rerun <id> --failed`** — the same ref will fail identically every time. The correct recovery is to publish a corrected version: bump `package.json` to the intended version and cut a new, matching tag on a new commit. Never delete or re-push the existing mismatched tag.
3. Diagnose other failures:
   ```
   gh run view <run-id> --log-failed
   ```
4. If the failure is transient (network, registry hiccup) or a fixable config issue (rotate `NPM_TOKEN`, fix a permissions typo), fix the root cause if needed, then re-run only the failed job(s):
   ```
   gh run rerun <run-id> --failed
   ```
   This resumes at the failed job on the same ref — no new commit, no new tag. Both guard steps (`npm view` / `gh release view`) make this safe even if `npm publish` already succeeded before a later step failed — only the step(s) that didn't complete will actually run.
5. **Emergency escape hatch only** (CI unrecoverable in a reasonable window):
   ```
   git checkout vX.Y.Z && npm publish
   ```
   This is a last resort, not a normal path — it bypasses the CI-enforced D-05 tarball-leak assertion. Document that it was used and why.

   **Never use this escape hatch after a tag/version-mismatch guard failure** — `npm publish` publishes whatever version `package.json` declares, so from a mismatched tagged commit it would publish the wrong version, perpetuating the exact npm/git drift the guard exists to prevent. Before running it, verify the checked-out commit's version matches the tag:
   ```
   node -p "require('./package.json').version"
   ```
   Proceed only if the output equals `X.Y.Z`. If it doesn't, use the point-2 recovery instead (bump to a new version + new matching tag).

## Step 8 — Post-Release Housekeeping

After Step 6 confirms the release is live:

1. Update `PROJECT.md` → Current State section with the new version and what was shipped.
2. Archive the milestone in `MILESTONES.md` → move it from Active to Completed.
3. Close the milestone in the planning system (mark complete in `.planning/`).
4. Open the next milestone planning issue if one is queued.

## Step 9 — Zero-Tokens Follow-Through (first OIDC-live release only)

Run this step **once** — the first time a tag-triggered publish succeeds via OIDC trusted publishing (i.e. the first release cut after the publish job stopped using `NPM_TOKEN`/`NODE_AUTH_TOKEN`). Every subsequent release skips this step entirely; it is not part of the normal per-release flow.

1. **Revoke the token and delete the secret.** On npmjs.com, revoke the granular access token that was used as the `NPM_TOKEN` fallback. Then delete the GitHub Actions repository secret that stored it:
   ```
   gh secret delete <name>
   ```
   `<name>` is whichever secret name Phase 21's checkpoint created. Record that both actions were taken (token revoked + secret deleted) — never record the token value itself.
2. **Lock npm publishing to trusted-publisher-only.** On npmjs.com, set `@jeremiewerner/motto`'s publishing access so that tokens are disallowed and only the configured Trusted Publisher can publish. This makes zero-tokens a structural guarantee, not just an incidental current state.
3. **Verify provenance via the registry.** Check the npmjs.com package page for a provenance attestation badge, or run:
   ```
   npm view @jeremiewerner/motto --json
   ```
   and look for attestation data. Record what was observed (do not just assume `--provenance` worked because `npm publish` exited 0).
4. **Re-verify the public marketplace path.** The marketplace plugin sources skills from whatever npm currently publishes as `latest` (`.claude-plugin/marketplace.json` → `"source": "npm"`), so an install run before this first OIDC publish would have installed a stale tarball. From a logged-out browser and clean shell, re-run the Phase 22 Plan 05 stranger-walkthrough marketplace steps: `/plugin marketplace add jeremiewerner/motto` then `/plugin install motto@motto`, and confirm `build-skill` (not the retired `author-skill`/`setup-project`) appears in Claude Code's skill list. Record pass/fail.

**Troubleshooting:** if the OIDC publish 404s or 401s despite a correctly-configured Trusted Publisher, check `package.json`'s `repository` field. It currently uses the `github:jeremiewerner/motto` shorthand form — try expanding it to `git+https://github.com/jeremiewerner/motto.git` as a first troubleshooting step.

</process>

<success_criteria>

- All tests pass (`node --test` reports zero failures) before the version bump.
- `package.json`, `motto.yaml`, and `package-lock.json` are bumped to the same version and committed in a single release commit with a `vX.Y.Z` tag.
- `motto lint` and `motto build` both succeed locally against the release version with no errors, as a pre-push sanity check.
- The local flow ends at `git push --follow-tags` — no local `npm publish`, no local registry-auth check.
- CI performs the publish: the tag-triggered Actions run passes `test`/`dogfood`/`pack-install-e2e` (including the D-05 tarball-leak assertion), then the `publish` job runs `npm publish` and `gh release create --generate-notes`, each independently guarded against re-running on an already-published version/release.
- The maintainer verifies the Actions run is green, the registry has the new version (`npm view`), and the GitHub Release exists (`gh release view`) before doing any Post-Release Housekeeping.
- If CI publish fails, recovery is `gh run rerun <id> --failed` for transient/config failures (or, as an emergency-only escape hatch, a manual `npm publish` from the tagged commit), or a new version bump + new matching tag for tag/version-mismatch guard failures — never deleting or recreating the git tag.
- `PROJECT.md` and `MILESTONES.md` are updated to reflect the new shipped state.
- The zero-tokens follow-through (Step 9: token revocation, npm-side trusted-publisher-only lockdown, provenance verification) runs once — the first OIDC-live release only — never as a per-release step.

</success_criteria>
