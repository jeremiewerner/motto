---
phase: 07-npm-packaging-release-flow
plan: "01"
subsystem: packaging
tags: [npm, packaging, release, lifecycle-scripts, tarball-verify]
status: complete

dependency_graph:
  requires: []
  provides:
    - npm-publishable package.json (scoped name, files allowlist, publishConfig)
    - MIT LICENSE
    - version lifecycle script (motto.yaml auto-sync via npm_new_version)
    - prepublishOnly build hook
    - release skill with real end-to-end publish flow
  affects:
    - npm publish behaviour
    - release skill workflow

tech_stack:
  added: []
  patterns:
    - npm lifecycle scripts (prepublishOnly, version) for publish-time automation
    - npm pack --dry-run --json piped to Node stdlib leak-check (D-05 scripted assertion)
    - npm_new_version env var for cross-file version sync inside npm version commit

key_files:
  created:
    - LICENSE
  modified:
    - package.json
    - motto.yaml
    - skills/release/SKILL.md

decisions:
  - "D-01: MIT LICENSE created; license field added to package.json"
  - "D-02: Full package.json metadata added (description, author, repository, homepage, keywords)"
  - "D-03: prepublishOnly: node bin/motto.js build added; does NOT fire on npm pack --dry-run"
  - "D-04: version lifecycle script auto-syncs motto.yaml via npm_new_version env var; eliminates dirty-tree gotcha"
  - "D-05: Scripted tarball assertion (npm pack --dry-run --json | Node leak-check) replaces manual eyeball; process.exit(1) on any leak"
  - "SMOKE-TEST: npm_new_version env var confirmed working — npm version 9.9.9 --no-git-tag-version updated both package.json and motto.yaml to 9.9.9; fully reverted"

metrics:
  duration: "~4 minutes"
  completed: "2026-07-01"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 07 Plan 01: npm Packaging & Release Flow Summary

**One-liner:** Scoped npm package `@jeremiewerner/motto` v0.0.3 with `files` allowlist, MIT LICENSE, version lifecycle script that auto-syncs `motto.yaml` via `npm_new_version`, and a real end-to-end release skill replacing the TODO publish stub.

## What Was Built

Made the Motto CLI publishable to npm as the scoped public package `@jeremiewerner/motto` and wired the private `release` skill to drive the real end-to-end publish workflow (version bump with auto-sync → dogfood → D-05 scripted tarball verify → auth check → npm publish → git push --follow-tags).

### Task 1: MIT LICENSE + package.json metadata & packaging config + version drift fix
- **Commit:** 451f92e
- **Files:** `LICENSE`, `package.json`, `motto.yaml`
- Created MIT LICENSE with copyright "Jérémie Werner" (D-01)
- `package.json`: renamed `motto` → `@jeremiewerner/motto`; bumped `0.0.1` → `0.0.3`; added `description`, `author`, `license`, `repository`, `homepage`, `keywords`; added `files: ["bin/", "src/", "dist/public/"]`; added `publishConfig: {access: "public"}` (D-01, D-02, NPM-01..03)
- `motto.yaml`: bumped `0.0.2` → `0.0.3` (drift correction; go-forward sync automated by Task 2 version script)
- No `.npmignore` added (files allowlist overrides gitignore; `.npmignore` would be redundant and dangerous)

### Task 2: lifecycle scripts — prepublishOnly + version (motto.yaml auto-sync)
- **Commit:** d55ab48
- **Files:** `package.json`
- Added `prepublishOnly: "node bin/motto.js build"` — rebuilds `dist/public/` before every `npm publish`, independent of the release skill (D-03)
- Added `version` lifecycle script — reads `motto.yaml`, replaces the `version:` line using `process.env.npm_new_version`, writes it back, then `git add motto.yaml`. Fires after the package.json bump but before the git commit, landing both files in the same version commit (D-04, REL-03)
- **Smoke test confirmed:** `npm version 9.9.9 --no-git-tag-version --no-commit-hooks` updated both `package.json` and `motto.yaml` to `9.9.9`, proving `npm_new_version` is the correct env var name (closes RESEARCH Open Question #1). Fully reverted afterward — no stray tag, no stray commit.

### Task 3: Wire release skill real publish flow
- **Commit:** bca5ed3
- **Files:** `skills/release/SKILL.md`
- Step 1: stale `# pass 53` expectation corrected to `# pass 75` (or higher) (open-ended lower bound)
- Step 2: replaced manual two-file edit with `npm version X.Y.Z -m "chore: release v%s"`; documents version script auto-sync, husky pre-commit gate, and `--no-commit-hooks` as documented escape hatch; notes v0.0.4 is the first release using this script
- Step 3: kept dogfood build; added explicit note that step must precede Step 4 (prepublishOnly does NOT fire on dry-run)
- Step 4: replaced manual `git tag` with D-05 scripted tarball assertion (`npm pack --dry-run --json 2>/dev/null` piped to Node stdlib leak-check, `process.exit(1)` on any leak outside `bin/`/`src/`/`dist/public/`) — NPM-04 is now machine-checked, not human-eyeballed
- Step 5: removed TODO stub; added `npm whoami` auth gate (STOP if wrong account), then `npm publish` (fires prepublishOnly), then `git push --follow-tags` (REL-01, REL-02)

## Verification Results

All phase-level checks passed:

1. package.json field assertion: name=`@jeremiewerner/motto`, version=`0.0.3`, license=`MIT`, publishConfig.access=`public`, files=`["bin/","src/","dist/public/"]`, all metadata present — PASS
2. `test -f LICENSE && grep -qi 'MIT License' LICENSE` — PASS
3. `grep -q 'version: "0.0.3"' motto.yaml` — PASS
4. scripts assertion (prepublishOnly + version with npm_new_version + git add motto.yaml) — PASS
5. `npm pack --dry-run --json` tarball: 13 files, all in allowlist (`bin/`, `src/`, `dist/public/`, plus auto-included `LICENSE`, `package.json`); no `skills/`, `test/`, `.planning/` leakage — PASS
6. `node bin/motto.js lint` exits 0 — PASS (`✓ 3 skills OK`)
7. Release skill content greps: `npm version`, `git push --follow-tags`, `npm whoami`, `npm pack --dry-run`, `dist/public/`, `process.exit(1)`, `pass 75`, no `not yet finalized` — all PASS
8. `node --test`: `# pass 75`, `# fail 0` — PASS

## Deviations from Plan

None — plan executed exactly as written. The smoke test (Task 2) confirmed the `npm_new_version` env var assumption (RESEARCH A1) before any release relies on it.

## Requirements Satisfied

| Requirement | Description | How Satisfied |
|-------------|-------------|---------------|
| NPM-01 | Global install exposes `motto` command | `bin.motto` retained; `bin/` in `files` allowlist |
| NPM-02 | Scoped name, publishConfig.access public, files allowlist | All three present in package.json |
| NPM-03 | Version corrected to 0.0.3 | package.json and motto.yaml both at 0.0.3 |
| NPM-04 | No skills/test/.planning leakage in tarball | D-05 scripted assertion in Step 4; live npm pack verified clean |
| REL-01 | Real publish flow in release skill | Step 5: npm whoami + npm publish + git push --follow-tags |
| REL-02 | git push --follow-tags | Step 5: documented |
| REL-03 | motto.yaml bumped alongside package.json | version lifecycle script; both files in same version commit |

## Known Stubs

None.

## Threat Flags

None. No new network endpoints, auth paths, or file access patterns introduced. T-07-01 (tarball leakage) mitigated by D-05 assertion now in Step 4. T-07-02 (registry auth) mitigated by npm whoami gate in Step 5.

## Self-Check: PASSED
