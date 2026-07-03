---
phase: 20-ci-workflow
plan: 01
subsystem: infra
tags: [npm-lifecycle, husky, prepare-script, ci-prep, git-archive]

# Dependency graph
requires:
  - phase: 19-cli-ergonomics-buildskill-verification
    provides: "--quiet/--format json CLI contract that later plans in this phase (pack-install-e2e) will consume"
provides:
  - "scripts/prepare.mjs — .git-existence guard so the husky prepare lifecycle script no-ops outside a real git checkout"
  - "scripts/prepare-guard-check.mjs — explicit, committed proof that the guard's .git-less no-op branch actually runs"
  - "package.json prepare field repointed from husky to node scripts/prepare.mjs"
affects: [20-02, 20-03, ci-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Standalone lifecycle scripts (invoked directly by npm, not through bin/motto.js's CLI dispatcher) may legitimately use process.exit(0) for an early no-op branch — this is distinct from bin/motto.js's process.exitCode-only convention"
    - "git archive HEAD | tar -x into a mkdtemp'd dir materializes a genuine .git-less copy of the committed tree for proving git-presence-conditional behavior"

key-files:
  created:
    - scripts/prepare.mjs
    - scripts/prepare-guard-check.mjs
  modified:
    - package.json

key-decisions:
  - "husky || true was explicitly rejected (D-13) — a broken husky install in a real checkout must still fail loudly, only the .git-absent branch no-ops"
  - "scripts/ deliberately stays out of package.json's files allowlist — safe because prepare never fires for a package installed as a nested dependency (verified live npm experiment, RESEARCH.md Pitfall 2), so scripts/prepare.mjs's absence in a consumer's node_modules never matters"
  - "D-15's implicit-proof premise (pack-install-e2e exercises the guard) is false as originally written — closed with an explicit scripts/prepare-guard-check.mjs using git archive HEAD | tar -x into a tmp dir, not a claim riding on a different script"

patterns-established:
  - "Lifecycle-guard scripts: existsSync('.git') check as the sole no-op condition, execSync(..., {stdio:'inherit'}) for the real-checkout path so genuine failures surface loudly"

requirements-completed: [CIW-05]

coverage:
  - id: D1
    description: "scripts/prepare.mjs no-ops (exit 0) in a .git-less context and still runs husky in a real checkout"
    requirement: "CIW-05"
    verification:
      - kind: unit
        ref: "node scripts/prepare.mjs (manual verification command, run in this repo with .git present)"
        status: pass
      - kind: integration
        ref: "node scripts/prepare-guard-check.mjs (git archive HEAD | tar -x into a .git-less tmpdir, then npm ci there, asserts exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "package.json prepare field points at the new guard script, files allowlist unchanged"
    requirement: "CIW-05"
    verification:
      - kind: unit
        ref: "grep -c '\"prepare\": \"node scripts/prepare.mjs\"' package.json (returns 1)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-03
status: complete
---

# Phase 20 Plan 01: Husky Prepare Guard + D-15 Gap Closure Summary

**Husky's `prepare` lifecycle script now no-ops in any `.git`-less context (tarball extraction, `npm ci` in a git-less tree) via `scripts/prepare.mjs`'s `existsSync('.git')` guard, proven by a dedicated `git archive`-based proof script rather than the previously-false D-15 implicit-proof claim.**

## Performance

- **Duration:** ~4 min (task execution only; excludes context-load/read time)
- **Started:** 2026-07-03T23:27:00+02:00
- **Completed:** 2026-07-03T23:28:41+02:00
- **Tasks:** 2/2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `scripts/prepare.mjs` created: no-ops with exit 0 when `.git` is absent; runs `npx husky` with inherited stdio (loud failure) when `.git` is present. No `husky || true` always-succeed masking (D-13 honored).
- `package.json`'s `prepare` field repointed from `"husky"` to `"node scripts/prepare.mjs"`. `files` allowlist (`["bin/", "src/", "dist/public/"]`) left unchanged by design — safe because `prepare` never fires for a nested-dependency install (verified this session's research).
- `scripts/prepare-guard-check.mjs` created: closes the flagged D-15 gap by materializing a genuine `.git`-less copy of the committed tree (`git archive HEAD | tar -x` into a `mkdtemp` dir) and running `npm ci` there, asserting exit 0 — the only way to actually exercise the guard's no-op branch, since D-06's pack-install-e2e flow does not (RESEARCH.md Pitfall 2, verified via live npm experiments this milestone).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add scoped husky prepare guard (CIW-05, D-13/D-14)** - `af77103` (feat)
2. **Task 2: Explicit .git-less guard proof (closes D-15 gap, CIW-05)** - `bd399af` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `scripts/prepare.mjs` - `.git`-existence guard wrapping `npx husky`; standalone lifecycle script, no-ops outside a real git checkout
- `scripts/prepare-guard-check.mjs` - explicit `.git`-less proof: `git archive HEAD` → tmp dir → `npm ci` → assert exit 0 → cleanup
- `package.json` - `prepare` field: `husky` → `node scripts/prepare.mjs`

## Decisions Made

- No `husky || true`: the guard only no-ops on `.git` absence; a genuinely broken husky install in a real checkout still fails loudly (D-13).
- `scripts/` intentionally excluded from `package.json`'s `files` allowlist — confirmed safe because `prepare` never fires for a package installed as a nested/tarball dependency (live npm verification in RESEARCH.md Pitfall 2), so its absence from a consumer's `node_modules` tree is inconsequential.
- D-15's original "implicit proof via pack-install-e2e" claim is false as written (verified this session) — replaced with an honest, dedicated proof script (`scripts/prepare-guard-check.mjs`) rather than silently keeping the false claim or downgrading to code-review-only confidence.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` specs; the RESEARCH.md-verified skeletons for `scripts/prepare.mjs` were used near-verbatim, and `scripts/prepare-guard-check.mjs` was implemented per the plan's detailed action description (mkdtemp → git archive/tar → npm ci → assert exit 0 → cleanup → descriptive failure messages on any branch).

## Issues Encountered

None. `node scripts/prepare-guard-check.mjs` required network access for `npm ci` (installing `yaml` + `husky` from the committed lockfile into the tmp dir) — this was available in the execution environment and completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CIW-05 is genuinely closed: the husky prepare guard is scoped correctly and its `.git`-less branch is proven, not assumed.
- `scripts/prepare-guard-check.mjs` is available as a building block for Plan 20-03's CI workflow wiring (can be invoked as a CI step, e.g. in a `pack-install-e2e` or dedicated job) — not wired into `.github/workflows/ci.yml` yet, since that is out of scope for this plan (Plan 20-03 owns the workflow file per the phase's `<artifacts_this_phase_produces>` inventory).
- No blockers for Plans 20-02/20-03.

---
*Phase: 20-ci-workflow*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: scripts/prepare.mjs
- FOUND: scripts/prepare-guard-check.mjs
- FOUND: af77103 (Task 1 commit)
- FOUND: bd399af (Task 2 commit)
