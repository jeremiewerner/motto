---
phase: 20-ci-workflow
plan: 02
subsystem: infra
tags: [ci, npm, github-actions, node-child_process, fetch]

requires:
  - phase: 20-ci-workflow (plan 01)
    provides: scripts/prepare.mjs husky guard + scripts/prepare-guard-check.mjs (D-13/D-14/D-15 closure)
provides:
  - scripts/pack-install-e2e.mjs — real npm consumer path proof (pack -> tmp install -> init -> lint/build --format json)
  - scripts/npm-drift-check.mjs — never-red npm registry drift warning
affects: [20-ci-workflow (plan 03 — wires both scripts into .github/workflows/ci.yml jobs), 21-publish-automation]

tech-stack:
  added: []
  patterns:
    - "run()/parseJsonOrFail() throw Error instead of process.exit() so a wrapping try/finally still runs tmp-dir cleanup on a failure path"
    - "npm-drift-check.mjs: entire fetch+parse body inside one try/catch, every branch a ::warning:: annotation, no branch sets a non-zero exit code (D-10)"

key-files:
  created:
    - scripts/pack-install-e2e.mjs
    - scripts/npm-drift-check.mjs
  modified: []

key-decisions:
  - "pack-install-e2e.mjs deviates from the plan's literal step 4 ('npx motto init e2e-project in the consumer dir'): motto init scaffolds INTO the current directory (the [name] arg only sets the project name, not a target subdir) — running it directly in consumerDir trips the non-empty-dir guard (consumerDir already holds package.json/package-lock.json/node_modules from npm init -y + npm install). Fixed by mkdir-ing a nested empty e2e-project dir and running `npx motto init` there; npx resolves the binary by walking up to consumerDir's node_modules/.bin, exactly like a real nested consumer project."
  - "run()/parseJsonOrFail() throw instead of calling process.exit(1) directly, so the enclosing try/finally in main() still removes both tmp dirs on a failure path (the RESEARCH.md skeleton's literal process.exit(1)-in-helper shape would skip cleanup on any failure, since process.exit() does not run pending finally blocks)."

requirements-completed: [CIW-03, CIW-04]

coverage:
  - id: D1
    description: "scripts/pack-install-e2e.mjs proves the real npm consumer path end-to-end: npm pack --json -> tmp consumer install -> npx motto init -> lint --format json -> build --format json, asserting exit codes + parsed JSON, exits 0 on success"
    requirement: "CIW-03"
    verification:
      - kind: e2e
        ref: "node scripts/pack-install-e2e.mjs (manual run this session, live network)"
        status: pass
    human_judgment: false
  - id: D2
    description: "scripts/npm-drift-check.mjs always exits 0 and prints a GitHub Actions ::warning:: annotation on version mismatch or inconclusive registry read; silent when package.json matches registry dist-tags.latest"
    requirement: "CIW-04"
    verification:
      - kind: e2e
        ref: "node scripts/npm-drift-check.mjs (manual run this session — 0.0.3 == 0.0.3, silent, exit 0)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-03
status: complete
---

# Phase 20 Plan 02: Pack-Install E2E + npm Drift-Check Scripts Summary

**Two zero-dependency CI helper scripts: `pack-install-e2e.mjs` proves the shipped npm tarball actually works via `npm pack` -> tmp-dir install -> `motto init/lint/build`, and `npm-drift-check.mjs` warns (never fails) on npm registry version lag.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-03T21:22:00Z (approx.)
- **Completed:** 2026-07-03T21:34:15Z
- **Tasks:** 2/2 completed
- **Files modified:** 2 created

## Accomplishments
- `scripts/pack-install-e2e.mjs` exercises the full real-consumer path a stranger installing `@jeremiewerner/motto` from npm would go through — `npm pack --json` at the repo root, tarball filename read from `data[0].filename` (never reconstructed, avoiding the scoped-package flattening pitfall), `npm init -y` + `npm install <tarball>` in a throwaway consumer project, `npx motto init` scaffolding a nested project dir, then `--format json` lint/build with `.ok`/`.count`/`.skillCount` assertions matching the Phase 19 contract exactly.
- `scripts/npm-drift-check.mjs` reads `package.json`'s version, fetches `registry.npmjs.org/@jeremiewerner%2Fmotto`, and prints a `::warning::` GitHub Actions annotation on any mismatch or inconclusive read (404/network failure/missing `dist-tags.latest`) — the entire body is one try/catch and no branch ever sets a non-zero exit code, so the check can never turn CI red.
- Both scripts verified live this session: `pack-install-e2e.mjs` ran the real network path (npm pack, tarball install, init, lint, build) end-to-end successfully; `npm-drift-check.mjs` ran silently and exited 0 (package.json 0.0.3 matches registry latest 0.0.3 today, as predicted by RESEARCH.md).
- Full `npm test` suite (231 tests) still green after both additions — scripts live outside `test/`, so `node --test` discovery is unaffected.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pack-install E2E script (CIW-03, D-05/D-06/D-07)** - `34c8ec2` (feat)
2. **Task 2: npm registry drift check script (CIW-04, D-09..D-12)** - `0958e78` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `scripts/pack-install-e2e.mjs` - real consumer-path E2E: pack -> tmp install -> init -> lint/build `--format json` assertions
- `scripts/npm-drift-check.mjs` - never-red npm registry drift warning via GitHub Actions `::warning::` annotation

## Decisions Made

- **Deviation from the plan's literal Task 1 step 4** (Rule 1 — bug fix, discovered at verification time): the plan's action text says "npx motto init e2e-project in the consumer dir," but `motto init [name]`'s actual CLI contract (confirmed in `bin/motto.js`'s help text and `src/init.js`) scaffolds INTO the current working directory — `[name]` only sets the project name inside `motto.yaml`/`marketplace.json`, it does not create a subdirectory. Running `npx motto init e2e-project` with `cwd: consumerDir` therefore attempted to scaffold directly into `consumerDir`, which already contains `package.json`/`package-lock.json`/`node_modules` from the preceding `npm init -y` + `npm install <tarball>` steps — none of which are on `src/init.js`'s ignorable-entries allowlist (`.git`, `.DS_Store` only) — tripping the non-empty-directory guard and failing with `✗ directory is not empty`. **Fix:** `mkdir` a nested, genuinely-empty `e2e-project` directory inside `consumerDir`, then run `npx motto init` (no name arg — defaults to the dir's own basename, `e2e-project`) with `cwd` set to that nested dir. `npx` resolves the `motto` binary by walking up the directory tree to `consumerDir`'s `node_modules/.bin`, exactly matching how a real nested consumer project would resolve it. Verified live: the full pipeline (pack -> install -> init -> lint --format json -> build --format json) now runs end-to-end and exits 0.
- **Cleanup-on-failure fix** (Rule 1 — bug fix): the RESEARCH.md/PATTERNS.md reference skeleton's `run()` helper calls `process.exit(1)` directly on a failing step. Since `process.exit()` terminates the process immediately without running pending `finally` blocks, a literal copy of that helper would leak both tmp directories (`packDir`, `consumerDir`) on any failure path, contradicting the plan's own acceptance criterion ("Both tmp dirs are removed with `rm(..., { recursive: true, force: true })`"). Fixed by having `run()`/`parseJsonOrFail()` `throw new Error(...)` instead, with a single top-level `try { await main() } catch` around the whole script and the tmp-dir removal living in `main()`'s `finally` block — so cleanup runs on every path, success or failure, and the failure message (command + raw stdout/stderr, or JSON-parse context) is still surfaced exactly as the plan requires (Pitfall 3).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `motto init e2e-project` misused as a "create subdirectory" invocation**
- **Found during:** Task 1 (Pack-install E2E script), first live run of `node scripts/pack-install-e2e.mjs`
- **Issue:** The plan's action text specified `npx motto init e2e-project` run with `cwd` set to the consumer dir itself, expecting it to create an `e2e-project` subdirectory. `motto init [name]` actually scaffolds into the current directory using `[name]` only as the project-name value — it never creates a subdirectory. Since the consumer dir already contained `package.json`/`package-lock.json`/`node_modules` (none on the ignorable-entries allowlist), the non-empty-dir guard rejected the scaffold.
- **Fix:** `mkdir(join(consumerDir, 'e2e-project'), { recursive: true })`, then run `npx motto init` (no name arg) with `cwd` set to that new, empty nested directory.
- **Files modified:** `scripts/pack-install-e2e.mjs`
- **Verification:** `node scripts/pack-install-e2e.mjs` now runs the full live pipeline (npm pack, tarball install, init, lint --format json, build --format json) and prints `pack-install-e2e: OK`, exit 0.
- **Committed in:** `34c8ec2` (part of Task 1 commit)

**2. [Rule 1 - Bug] `process.exit(1)` inside a helper would skip tmp-dir cleanup on failure**
- **Found during:** Task 1, code review against the plan's own acceptance criterion ("Both tmp dirs are removed") before running the script
- **Issue:** The RESEARCH.md/PATTERNS.md reference `run()` skeleton calls `process.exit(1)` directly on a non-zero spawn status. `process.exit()` terminates the process without unwinding to any enclosing `finally`, so a literal copy would leave both tempdirs on disk after any failed step — contradicting the plan's stated guarantee.
- **Fix:** `run()`/`parseJsonOrFail()` throw `Error` objects (still carrying the command line + raw stdout/stderr, or the JSON-parse context) instead of exiting directly; `main()`'s tmp-dir removal lives in a `finally` block, and a single top-level `try/catch` around `await main()` prints the error and sets `process.exitCode = 1`.
- **Files modified:** `scripts/pack-install-e2e.mjs`
- **Verification:** Code inspection — every throw site is reachable only from inside `main()`'s `try`, and `finally` unconditionally runs both `rm()` calls regardless of which branch threw.
- **Committed in:** `34c8ec2` (part of Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bug fixes discovered during implementation/verification of Task 1)
**Impact on plan:** Both fixes were necessary for the script to actually work and to honor the plan's own acceptance criteria; no scope creep, no architectural change. Task 2 (npm-drift-check.mjs) required no deviations — implemented exactly per the RESEARCH.md skeleton.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. Both scripts are plain Node stdlib with zero new dependencies; `pack-install-e2e.mjs` requires outbound network access (for `npm pack`'s registry metadata checks and `npm install`), which is available in both local dev and GitHub-hosted runners.

## Next Phase Readiness

Both scripts are committed, verified working live (not just unit-tested), and ready for Plan 03 to wire into `.github/workflows/ci.yml`'s `pack-install-e2e` and `npm-drift` jobs per the RESEARCH.md architecture (Node 20 only for `pack-install-e2e`, per D-07; any Node version for `npm-drift`). No blockers. Phase 21's D-05 tarball-leak assertion (PUB-03) can slot into `pack-install-e2e.mjs` cleanly — the pack manifest's `files` array is already captured in a variable (`packedFiles`) but deliberately unused this phase.

---
*Phase: 20-ci-workflow*
*Completed: 2026-07-03*
