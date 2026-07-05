---
phase: 21-publish-automation-release-rewrite
plan: 01
subsystem: infra
tags: [github-actions, ci, npm-publish, gh-release, tarball-boundary]

# Dependency graph
requires:
  - phase: 20-ci-workflow
    provides: ".github/workflows/ci.yml with test/dogfood/pack-install-e2e/npm-drift jobs; scripts/pack-install-e2e.mjs with the packedFiles capture and reserved D-05 insertion slot"
provides:
  - "Tag-triggered (`v*`) publish job in ci.yml, gated on test/dogfood/pack-install-e2e all green within the same workflow run"
  - "Two independent idempotency guards (npm_guard/gh_guard) for npm publish and gh release create --generate-notes"
  - "D-05 tarball-leak assertion (assertTarballClean) enforced on every push via pack-install-e2e, not just at release time"
affects: [21-02, 21-03, 22-public-flip-token-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module entry-point guard (import.meta.url vs pathToFileURL(process.argv[1]).href, with argv[1] undefined-guard) to make a CI script both directly-runnable and unit-testable"
    - "Two independent id-tagged guard steps + $GITHUB_OUTPUT flags for two unrelated external writes in one job, never a shared flag"
    - "Job-level permissions override (contents: write) scoped to a single job, workflow default stays contents: read"

key-files:
  created:
    - test/pack-install-e2e.test.js
  modified:
    - scripts/pack-install-e2e.mjs
    - .github/workflows/ci.yml

key-decisions:
  - "assertTarballClean call placed immediately after packedFiles capture (fail fast, before the slower install/init/lint/build steps)"
  - "publish job pinned to node-version: 24 (not the 20 used by every other job) ahead of the PUB-05 OIDC migration"
  - "npm-drift gated to github.ref == 'refs/heads/main' — advisory main-branch backstop only, does not gate publish"

patterns-established:
  - "CI scripts export their assertion functions and guard top-level execution behind an entry-point check so node --test can exercise them directly"

requirements-completed: [PUB-01, PUB-03, PUB-04]

coverage:
  - id: D1
    description: "assertTarballClean(files) throws TARBALL LEAK for any packed file outside the bin/ src/ dist/public/ + auto-included allowlist, wired into pack-install-e2e.mjs on every push"
    requirement: "PUB-03"
    verification:
      - kind: unit
        ref: "test/pack-install-e2e.test.js#assertTarballClean (D-05, PUB-03)"
        status: pass
      - kind: e2e
        ref: "node scripts/pack-install-e2e.mjs (real repo tarball, prints pack-install-e2e: OK)"
        status: pass
    human_judgment: false
  - id: D2
    description: "ci.yml gains a tag-triggered (v*) publish job, gated on needs: [test, dogfood, pack-install-e2e] + if: startsWith(github.ref, 'refs/tags/v'), Node 24 pinned, job-level permissions.contents: write"
    requirement: "PUB-01"
    verification:
      - kind: unit
        ref: "node --input-type=module -e (yaml parse) structural assertion — prints ci-structure-ok"
        status: pass
    human_judgment: true
    rationale: "The publish job's real tag-triggered execution path (npm publish succeeding, gh release create succeeding) cannot be exercised until the NPM_TOKEN secret exists (created in plan 21-03) and a real v* tag is pushed — structural/static verification is complete, but live end-to-end behavior is deferred to first real release per the plan's own <verification> section."
  - id: D3
    description: "npm publish (guarded by npm_guard) and gh release create --generate-notes (guarded by gh_guard) are two independently idempotent steps, never a shared flag"
    requirement: "PUB-01"
    verification:
      - kind: unit
        ref: "grep counts for npm_guard/gh_guard/already_published/already_released (each >=1, two distinct outputs) — see task 2 acceptance criteria"
        status: pass
    human_judgment: false
  - id: D4
    description: "GitHub Release gets auto-generated notes via gh release create --generate-notes (PUB-04)"
    requirement: "PUB-04"
    verification:
      - kind: unit
        ref: "grep -c -- '--generate-notes' .github/workflows/ci.yml >= 1"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-04
status: complete
---

# Phase 21 Plan 01: Publish Job + Tarball-Leak Assertion Summary

**Tag-triggered CI publish job (Node 24, two independent npm/gh idempotency guards) plus a committed, unit-tested D-05 tarball-boundary assertion wired into pack-install-e2e on every push**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-04T18:02:27Z
- **Completed:** 2026-07-04T18:08:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- `assertTarballClean(files)` enforces the D-05 tarball-boundary allowlist (`bin/`, `src/`, `dist/public/` + npm's auto-included files), throwing `TARBALL LEAK` with every offending path — never a bare `process.exit`, so `main()`'s tmp-dir cleanup still runs
- The assertion runs on every push (inside the existing `pack-install-e2e` CI job), not just at release time — closing the gap the release skill's inline heredoc previously left uncovered between releases
- `scripts/pack-install-e2e.mjs` gained an entry-point guard so it remains directly runnable (`node scripts/pack-install-e2e.mjs`) while also being safely importable by a unit test (`assertTarballClean` exported, `main()` does not fire on import)
- `.github/workflows/ci.yml` gained a `publish` job: tag-triggered (`push: tags: ['v*']`), gated on `needs: [test, dogfood, pack-install-e2e]` succeeding within the same workflow run, pinned to Node 24, with job-scoped `permissions: contents: write` (workflow default stays `contents: read`)
- Two fully independent idempotency guards — `npm_guard` (via `npm view`) and `gh_guard` (via `gh release view`) — gate `npm publish` and `gh release create --generate-notes` separately, so a partial-failure re-run can never strand an uncreated GitHub Release
- `npm-drift` job gained `if: github.ref == 'refs/heads/main'` so it skips on tag-triggered and PR runs (it remains a main-branch advisory backstop only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire the D-05 tarball-leak assertion into pack-install-e2e.mjs with an adversarial test (PUB-03)** - `c30b613` (feat)
2. **Task 2: Add the tag-triggered idempotent publish job + npm-drift guard to ci.yml (PUB-01, PUB-04)** - `af3d205` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `scripts/pack-install-e2e.mjs` - Added `assertTarballClean`/`ALLOWED_PREFIXES`/`AUTO_INCLUDED`, wired the call right after the `packedFiles` capture, added the module entry-point guard, exported `assertTarballClean`
- `test/pack-install-e2e.test.js` - New: positive clean-set case, adversarial leak case (asserts `TARBALL LEAK` + each offending path), and a dedicated partial-prefix-boundary case (`binary/x` must be treated as a leak, not a `bin/` match)
- `.github/workflows/ci.yml` - `on.push` gains `tags: ['v*']`; `npm-drift` gains its `if:` guard; new `publish` job appended with Node 24 pin, two independent guard steps, `npm publish`, and `gh release create --generate-notes`

## Decisions Made
- `assertTarballClean` call placed immediately after the `packedFiles` capture (fail fast, before the slower `npm init`/`npm install`/`motto init`/`lint`/`build` steps) rather than at the previously reserved `void packedFiles;` slot further down — both were acceptable per the plan; the earlier position saves CI time on a real leak.
- Kept the two idempotency guards fully independent (separate `id`-tagged steps, separate `$GITHUB_OUTPUT` flags, separate `if:` gates on the two write steps) per RESEARCH.md's explicit warning against a shared "already done" flag.
- `publish` job pinned to `node-version: 24` (diverging intentionally from every other job's `20`) with an inline comment explaining the npm ≥11.5.1 floor and the upcoming PUB-05 OIDC migration rationale.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Entry-point guard crashed on `process.argv[1]` being undefined under dynamic `import()`**
- **Found during:** Task 1, running the plan's own acceptance-criteria verification command (`node -e "import('./scripts/pack-install-e2e.mjs')..."`)
- **Issue:** The initial guard `import.meta.url === pathToFileURL(process.argv[1]).href` threw `ERR_INVALID_ARG_TYPE` because `process.argv[1]` is `undefined` when the module is loaded via `node -e "import(...)"` (no script path is at that argv slot).
- **Fix:** Short-circuited the guard with `process.argv[1] && ...` so an undefined `argv[1]` is treated as "not the entry point" (main does not run) instead of throwing.
- **Files modified:** `scripts/pack-install-e2e.mjs`
- **Verification:** Re-ran the exact acceptance command — prints `import-no-main-run-ok` and does not run `main()`; `node scripts/pack-install-e2e.mjs` (direct invocation) still runs and prints `pack-install-e2e: OK`.
- **Committed in:** `c30b613` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correctness fix for the exact acceptance criterion the plan specified; no scope creep.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
**External service requires manual configuration.** Per the plan's `user_setup` frontmatter: the `publish` job's `npm publish` step authenticates via `secrets.NPM_TOKEN`, which does not yet exist on the repo (`gh secret list` is empty, verified in RESEARCH.md). The workflow logic is fully built and statically verified in this plan (`ci-structure-ok` check, all grep-based acceptance criteria), but the real tag-triggered publish path cannot succeed until the secret exists. Creating it (`npmjs.com` → Access Tokens → Granular, package-scoped, publish-only → `gh secret set NPM_TOKEN`) is scheduled for plan 21-03.

## Next Phase Readiness
- The publish job's structure, gating, Node pin, and both idempotency guards are complete and statically verified — ready for plan 21-02 (release skill rewrite) to reference the CI handoff this job now provides.
- Live, tag-triggered end-to-end verification (two workflow runs from one `git push --follow-tags`, `publish` job actually running `npm publish`/`gh release create`) is explicitly deferred to first real release per the plan's `<verification>` section — this requires the `NPM_TOKEN` secret (plan 21-03) and cannot be exercised on this branch today.
- No blockers for 21-02.

---
*Phase: 21-publish-automation-release-rewrite*
*Completed: 2026-07-04*

## Self-Check: PASSED
