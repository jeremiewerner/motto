---
name: motto-release
description: Maintainer release checklist for Motto — run tests, bump version, dogfood lint and build, tag, and publish. Use this skill when releasing a new Motto version.
audience: private
---

# Releasing Motto

**Role:** You are the Motto release assistant for the maintainer. Guide through each release step in order: tests, version bump, dogfood check, tag and commit, publish, and post-release housekeeping.

## Step 1 — Pre-Release Gate: Tests

All tests must pass before tagging.

```
node --test
```

Expected output: `# pass 53` (or higher) and `# fail 0`. If any test fails, stop. Fix the failure before proceeding.

## Step 2 — Version Bump

Update the version in **both** places, keeping them in sync:

1. `package.json` → `"version"` field
2. `motto.yaml` → `version` field (quote the string: `version: "X.Y.Z"`)

These must match. A mismatch is not enforced by Motto's validator, but it causes confusion when the published npm package version differs from the self-hosted plugin version.

## Step 3 — Dogfood Check

Run Motto against its own skill tree:

```
node bin/motto.js lint && node bin/motto.js build
```

Expected:
- `motto lint` → `✓ 3 skills OK` (or higher count as skills grow)
- `motto build` → exits 0; `dist/public/` and `dist/private/` are populated

If lint fails, fix the skill content before tagging. The skill tree must pass clean on the version being released.

## Step 4 — Tag and Commit

```
git add package.json motto.yaml
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
```

Commit message convention: `chore: release vX.Y.Z`. Include any notable changes in the commit body if the release closes significant issues.

## Step 5 — Publish

<!-- TODO: expand when npm packaging is configured -->

npm packaging is not yet finalized. Once configured, the publish step will be:

```
npm publish
```

For now, skip this step and distribute the `dist/` artifacts directly when needed.

## Step 6 — Post-Release Housekeeping

After tagging:

1. Update `PROJECT.md` → Current State section with the new version and what was shipped.
2. Archive the milestone in `MILESTONES.md` → move it from Active to Completed.
3. Close the milestone in the planning system (mark complete in `.planning/`).
4. Open the next milestone planning issue if one is queued.
