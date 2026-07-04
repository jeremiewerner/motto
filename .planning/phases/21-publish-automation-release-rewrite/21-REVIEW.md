---
phase: 21-publish-automation-release-rewrite
reviewed: 2026-07-04T19:22:48Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - .github/workflows/ci.yml
  - scripts/pack-install-e2e.mjs
  - skills/release/SKILL.md
  - test/pack-install-e2e.test.js
findings:
  critical: 1
  warning: 5
  info: 5
  total: 11
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-07-04T19:22:48Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Reviewed the tag-triggered publish job in `ci.yml`, the D-05 tarball-leak assertion moved into `scripts/pack-install-e2e.mjs`, its unit test, and the rewritten release skill. Verified behavioral claims empirically rather than trusting comments: npm 11 (`npm view pkg@missing-version`) exits 1 so the npm_guard's happy path is sound; `dist/` is gitignored; the test suite is 234 passing; `package.json` name/`files`/`publishConfig` match the workflow's assumptions; `motto lint` passes on the rewritten SKILL.md.

The overall design is careful (guards are independent, token is step-scoped, `needs:` correctly resolves within the tag run, `set -e` semantics in the dogfood job actually go red). Three structural gaps survive it: (1) **no tag-name-vs-package.json-version assertion** — the exact tag/version-mismatch path this project's standing concerns call out produces a green run that publishes nothing yet creates a GitHub Release; (2) `${{ github.ref_name }}` is interpolated directly into two `run:` scripts (GHA script-injection pattern); (3) the tarball that D-05 validates is **not** the tarball `npm publish` ships, because `prepublishOnly` (build) runs only at publish while `npm pack` in the E2E runs without a build (`dist/` absent in a fresh checkout).

## Critical Issues

### CR-01: Publish job has no tag ↔ package.json version consistency check — mismatched tag yields a green run that publishes nothing but still creates a GitHub Release

**File:** `.github/workflows/ci.yml:106-134`
**Issue:** The two idempotency guards are keyed on *different* identifiers: `npm_guard` keys on `package.json` version, `gh_guard` and `gh release create` key on the tag name (`github.ref_name`). Nothing asserts they agree. Concrete failure path: tag `v0.0.7` is pushed on a commit whose `package.json` still says `0.0.6` (already on the registry). Then:

1. `npm_guard`: `npm view @jeremiewerner/motto@0.0.6` succeeds → `already_published=true` → `npm publish` **silently skipped** (no error, no annotation).
2. `gh_guard`: release `v0.0.7` doesn't exist → `gh release create v0.0.7 --generate-notes` **succeeds**.
3. Job is green. A GitHub Release `v0.0.7` now exists for a version that was never published to npm — precisely the "npm stuck at old version while git tags advanced" drift this project has already suffered (SKILL.md Step 6 cites it), now reproducible with a green CI badge on top.

The converse (tag `v0.0.7`, package.json `0.0.7`, but tag placed on the wrong commit) is also unguarded: the wrong content publishes under the right version. This is the standing "tag/version mismatch" + "idempotency guard that doesn't actually guard" concern from the project memory, unmitigated.

**Fix:** Add a hard assertion before either guard runs:

```yaml
      - name: Guard — tag must match package.json version
        run: |
          PKG_VERSION=$(node -p "require('./package.json').version")
          if [ "v$PKG_VERSION" != "$GITHUB_REF_NAME" ]; then
            echo "::error::tag $GITHUB_REF_NAME does not match package.json version $PKG_VERSION" >&2
            exit 1
          fi
```

(`GITHUB_REF_NAME` is a default env var — no expression interpolation needed; see WR-01.)

## Warnings

### WR-01: `${{ github.ref_name }}` interpolated directly into `run:` shell — script injection pattern

**File:** `.github/workflows/ci.yml:123, 132`
**Issue:** Both `gh_guard` and the `gh release create` step splice `${{ github.ref_name }}` into the script body before the shell parses it. Git refnames forbid spaces but *permit* `$`, `(`, `)`, `;`, `{`, `}` — a tag named `v1;$(id)` is valid and, inside the double quotes at line 123, `$(id)` **executes** as command substitution in a step holding a `contents: write` `GH_TOKEN`. Exposure is limited to actors who can push `v*` tags (write access), so this is not remotely exploitable today, but it is the exact pattern GitHub's security-hardening docs tell you never to use, and the marginal cost of doing it right is zero. Note `NPM_TOKEN` is *not* reachable from these steps (correctly scoped to the publish step only) — that scoping is what keeps this a Warning rather than Critical.
**Fix:** Reference the runner-provided env var instead of expression interpolation — data stays data:

```yaml
        run: |
          if gh release view "$GITHUB_REF_NAME" >/dev/null 2>&1; then
          ...
        run: gh release create "$GITHUB_REF_NAME" --generate-notes
```

### WR-02: npm_guard hardcodes the package name instead of deriving it from package.json

**File:** `.github/workflows/ci.yml:110`
**Issue:** The guard reads the *version* from `package.json` but hardcodes the *name* `@jeremiewerner/motto`. If the package is ever renamed/re-scoped, the guard queries the wrong package: `npm view <old-name>@<version>` behavior then decides whether to publish `<new-name>` — the guard checks a different registry entry than the one being published. Same class as the memory's "npx substitution / wrong package name" drift. `npm publish` itself would still refuse a true duplicate, but the guard becomes decorative.
**Fix:**

```bash
PKG_NAME=$(node -p "require('./package.json').name")
PKG_VERSION=$(node -p "require('./package.json').version")
if npm view "$PKG_NAME@$PKG_VERSION" version >/dev/null 2>&1; then
```

(The same hardcoding exists in SKILL.md Step 6 — acceptable there as human-facing prose, but the machine guard should be self-consistent.)

### WR-03: npm_guard and gh_guard conflate "does not exist" with "check failed", and `2>/dev/null` swallows the diagnosis

**File:** `.github/workflows/ci.yml:110, 123`
**Issue:** Any non-zero exit from `npm view` — E404 (intended), but equally a registry outage, DNS failure, or E403 — produces `already_published=false` and a publish attempt. The failure direction is safe-loud (the registry rejects duplicate versions with EPUBLISHCONFLICT/E403), so no wrong publish can occur, but the guard's entire purpose — making `gh run rerun --failed` idempotently green — degrades to a red job on a registry flake, and because stderr is piped to `/dev/null` the log shows a confusing `npm publish` failure instead of the real cause. This contradicts the repo's own Pitfall-3 convention (failures must be debuggable from CI logs alone), which `pack-install-e2e.mjs` follows scrupulously two jobs earlier. Same conflation in `gh_guard` (network failure → attempts `gh release create` → "release already exists" error). 
**Fix:** Capture output and branch on E404 explicitly:

```bash
set +e
OUT=$(npm view "$PKG_NAME@$PKG_VERSION" version 2>&1); RC=$?
set -e
if [ $RC -eq 0 ]; then
  echo "already_published=true" >> "$GITHUB_OUTPUT"
elif echo "$OUT" | grep -q 'E404'; then
  echo "already_published=false" >> "$GITHUB_OUTPUT"
else
  echo "npm view failed for a reason other than E404:" >&2; echo "$OUT" >&2; exit 1
fi
```

### WR-04: The tarball D-05 validates is not the tarball `npm publish` ships

**File:** `scripts/pack-install-e2e.mjs:113-124`, `.github/workflows/ci.yml:115-117`
**Issue:** `dist/` is gitignored, and `npm pack` runs only `prepack`/`prepare` (here: the prepare guard) — **not** `prepublishOnly`. So in the CI checkout, `assertTarballClean` runs against a tarball with *no* `dist/public/` content, and the E2E "real consumer path" installs a package missing files real consumers receive. `npm publish` in the publish job, by contrast, fires `prepublishOnly` (`node bin/motto.js build`) and ships a tarball containing freshly built `dist/public/**` — an artifact `assertTarballClean` never sees. Today the delta is confined to the allowlisted `dist/public/` prefix, so nothing currently leaks; but any future build-step side effect that lands inside a packed path (or a root-level file npm auto-includes) ships unvalidated, and the SKILL.md claim that the tag run enforces "the D-05 tarball-leak assertion" (line 76, 139) is true only of the *unbuilt* tarball. This is the tests-green-but-broken shape the project has hit five times.
**Fix:** Run the build before packing in the E2E so the validated artifact matches the published one:

```js
// before step (2) in main():
run('node', ['bin/motto.js', 'build'], { cwd: repoRoot });
```

(`motto build` into the repo's gitignored `dist/` is the one acceptable write to the working tree; alternatively, add a `npm publish --dry-run --json` + `assertTarballClean` step inside the publish job itself.)

### WR-05: SKILL.md Step 6 registry check reads the `latest` dist-tag and relies on eyeball comparison

**File:** `skills/release/SKILL.md:93-96`
**Issue:** `npm view @jeremiewerner/motto version` prints whatever `latest` points at and always exits 0. Verifying "the version is live" requires the maintainer to mentally diff the output against the release version — exactly the kind of soft check that let the historical npm-vs-tag drift go unnoticed (acknowledged three lines later at line 102). In the CR-01 scenario, this check prints the *old* version and nothing forces the mismatch to register.
**Fix:** Pin the version so absence is a non-zero exit, not a subtle wrong number:

```
npm view @jeremiewerner/motto@X.Y.Z version
```

## Info

### IN-01: Dead equality branch and loose prefix semantics in AUTO_INCLUDED matching

**File:** `scripts/pack-install-e2e.mjs:49-51`
**Issue:** In `AUTO_INCLUDED.some((a) => p === a || p.startsWith(a))`, the `p === a` branch is dead — `startsWith` already covers equality. Also note the prefix match is intentionally loose (`README` matches `README.md`, matching npm's own `README*` auto-include) but case-sensitive, so a lowercase `readme.md` (which npm auto-includes case-insensitively) would false-positive as a leak. Fail-loud direction; fine to leave, worth a comment.
**Fix:** Drop the redundant `p === a`; optionally compare case-insensitively for the AUTO_INCLUDED set.

### IN-02: Sequential `await rm()` in `finally` — first failure skips second cleanup and masks the original error

**File:** `scripts/pack-install-e2e.mjs:167-172`
**Issue:** If `rm(packDir)` rejects (rare on Linux, but e.g. EBUSY), `rm(consumerDir)` never runs *and* the cleanup rejection replaces the propagating E2E error — the CI log would then show the cleanup failure instead of the real one, contradicting the script's own Pitfall-3 discipline.
**Fix:** `await Promise.allSettled([rm(packDir, …), rm(consumerDir, …)]);`

### IN-03: Publish job runs (and fails red) on forks

**File:** `.github/workflows/ci.yml:91`
**Issue:** A fork pushing a `v*` tag triggers the publish job; `secrets.NPM_TOKEN` is empty there, so `npm publish` fails ENEEDAUTH — red CI noise in forks, cosmetic only.
**Fix:** `if: startsWith(github.ref, 'refs/tags/v') && github.repository == 'jeremiewerner/motto'`

### IN-04: Stale test-count anchor in Step 1

**File:** `skills/release/SKILL.md:29`
**Issue:** "Expected output: `# pass 75` (or higher)" — the suite currently reports `# pass 234`. Technically true via "(or higher)", but a freshly rewritten skill anchored to a 3×-stale number invites doubt about the rest of the doc, and this project has a doc-sync freshness guard tradition (Ph17/18).
**Fix:** Update to `# pass 234` or drop the number: "and `# fail 0`".

### IN-05: Negative test omits the most security-relevant leak class: `dist/private/`

**File:** `test/pack-install-e2e.test.js:21-38`
**Issue:** The allowlist deliberately admits `dist/public/` but not `dist/private/` (private skills must never ship). The negative test covers `skills/`, `test/`, and `.planning/` leaks but not a `dist/private/...` path — the one whose `dist/` prefix could plausibly be widened to `dist/` by a careless future edit without any test going red.
**Fix:** Add `{ path: 'dist/private/skills/x/SKILL.md' }` to the leaking file set and assert it appears in the error message.

---

## Verified Non-Issues (checked, found sound)

- `npm view pkg@missing-version` exits 1 on npm 11 (probed live) — npm_guard's true/false branches are correct on the pinned Node 24 toolchain.
- `on.push` with both `branches` and `tags` filters: tag pushes trigger the workflow and run `test`/`dogfood`/`pack-install-e2e`, so `needs:` resolves within the tag run as PUB-01 intends.
- `gh run rerun --failed` reruns the whole publish job from step 1; both guards then correctly skip only completed halves — SKILL.md Step 5/7's independence claim holds.
- Dogfood job's `out=$(node …)` under GHA's default `bash -e`: a failed command substitution in a plain assignment *does* fail the step — not a never-red script.
- `NODE_AUTH_TOKEN` is scoped to the single `npm publish` step; setup-node exports a placeholder token so `npm ci`/`npm view` don't hit "Failed to replace env in config". No token appears in logs.
- `run()` in pack-install-e2e throws on `status !== 0`, which includes `status: null` (ENOENT spawn error / signal kill) — the bin-linking regression path fails loudly as documented.
- Entry-point guard (`import.meta.url === pathToFileURL(process.argv[1]).href`) correctly prevents the test import from triggering the real E2E; uses `process.exitCode = 1`, never a bare `process.exit`.
- `package.json` `files` (`bin/`, `src/`, `dist/public/`) matches `ALLOWED_PREFIXES` exactly; `publishConfig.access: public` is present so scoped publish needs no flag.

---

_Reviewed: 2026-07-04T19:22:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
