---
name: release
description: Maintainer release checklist for Motto — run tests, bump version, dogfood lint and build, verify tarball, and publish. Use this skill when releasing a new Motto version.
audience: private
---

# Releasing Motto

**Role:** You are the Motto release assistant for the maintainer. Guide through each release step in order: tests, version bump, dogfood check, tarball verify, publish, and post-release housekeeping.

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

**Note on v0.0.3:** The very first release using this script is v0.0.4 onward. v0.0.3 was drift-corrected manually in Phase 7 and is already committed and tagged separately.

## Step 3 — Dogfood Check

Run Motto against its own skill tree:

```
node bin/motto.js lint && node bin/motto.js build
```

Expected:
- `motto lint` → `✓ N skills OK` (open-ended count as skills grow)
- `motto build` → exits 0; `dist/public/` and `dist/private/` are populated

If lint fails, fix the skill content before publishing. The skill tree must pass clean on the version being released.

**This step must run before Step 4.** `prepublishOnly` does NOT fire on `npm pack --dry-run`, so the tarball-verify in Step 4 inspects whatever `motto build` last emitted.

## Step 4 — Tarball Verify

Run the D-05 scripted assertion to confirm no skills, tests, or planning files leak into the published tarball. Hard-fails on any path outside the declared allowlist.

```bash
npm pack --dry-run --json 2>/dev/null | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const data = JSON.parse(Buffer.concat(chunks));
  const files = data[0].files;                     // [{path, size, mode}]
  const allowed = ['bin/', 'src/', 'dist/public/'];
  const autoIncluded = ['package.json', 'README', 'LICENSE', 'CHANGELOG'];
  const isAllowed = p =>
    autoIncluded.some(a => p === a || p.startsWith(a)) ||
    allowed.some(a => p.startsWith(a));
  const leaks = files.filter(f => !isAllowed(f.path));
  if (leaks.length) {
    process.stderr.write('TARBALL LEAK — aborting release:\n');
    leaks.forEach(f => process.stderr.write('  ' + f.path + '\n'));
    process.exit(1);
  }
  process.stdout.write('Tarball clean: ' + files.length + ' files, all in allowlist\n');
});
"
```

Expected output: `Tarball clean: N files, all in allowlist`. If any path outside `bin/`, `src/`, `dist/public/` (plus auto-included `package.json`, `README`, `LICENSE`) appears — **STOP**. The `2>/dev/null` redirect is mandatory: it routes husky's `prepare` output away from the JSON pipe.

This makes NPM-04 (no `skills/`/`test/`/`.planning/` leakage) a machine-checked hard-fail, not a human eyeball.

## Step 5 — Publish

First verify registry auth:

```
npm whoami
```

**STOP if this errors or shows the wrong account.** Run `npm login` and confirm you are publishing as the intended account before proceeding.

Then publish and push the tag:

```
npm publish
git push --follow-tags
```

`npm publish` fires `prepublishOnly` (rebuilds `dist/public/` from the current `skills/` tree) then uploads the tarball to registry.npmjs.org.

`git push --follow-tags` pushes both the release commit and the `vX.Y.Z` tag to `github:jeremiewerner/motto` in one command.

## Step 6 — Post-Release Housekeeping

After tagging:

1. Update `PROJECT.md` → Current State section with the new version and what was shipped.
2. Archive the milestone in `MILESTONES.md` → move it from Active to Completed.
3. Close the milestone in the planning system (mark complete in `.planning/`).
4. Open the next milestone planning issue if one is queued.
