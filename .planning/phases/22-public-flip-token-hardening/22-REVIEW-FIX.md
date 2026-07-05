---
phase: 22-public-flip-token-hardening
fixed_at: 2026-07-05T17:40:22Z
review_path: .planning/phases/22-public-flip-token-hardening/22-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 22: Code Review Fix Report

**Fixed at:** 2026-07-05T17:40:22Z
**Source review:** .planning/phases/22-public-flip-token-hardening/22-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (fix_scope: critical_warning — 4 Warnings; 4 Info findings out of scope)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: ci-workflow.test.js resolves the workflow path from cwd, violating the repo's documented test convention

**Files modified:** `test/ci-workflow.test.js`
**Commit:** a91a399
**Applied fix:** Anchored `REPO_ROOT` via `import.meta.url` (with the same "NEVER derive from cwd" convention comment carried by `test/doc-sync.test.js` and `test/dogfood.test.js`) and resolved a shared `CI_YML` constant; both `readFileSync` call sites now use it. Verified the exact failure mode from the review is gone: `node --test <file>` invoked from `/private/tmp` now passes all 7 tests (previously ENOENT at module load).

### WR-02: Zero-token guard only checks the `npm publish` step's own env — job-level and workflow-level env are unguarded regression vectors

**Files modified:** `test/ci-workflow.test.js`
**Commit:** dbdb05e
**Applied fix:** Replaced the step-scoped env test with a sweep over every env scope that flows into the publish job: workflow-level `env`, `jobs.publish.env`, and every publish step's own `env` (labeled per scope for actionable failure messages). Also updated the describe-block comment that previously framed step-scoping as precision. Mutation-checked: injecting `NODE_AUTH_TOKEN` at `jobs.publish.env` is caught by the new guard.

### WR-03: Stale comment in ci.yml describes the OIDC migration as still pending

**Files modified:** `.github/workflows/ci.yml`
**Commit:** e8ec10e
**Applied fix:** Rewrote the `node-version: 24` comment to describe the present state: Node 24 ships npm >=11.5.1, the floor for OIDC trusted publishing (PUB-05), which authenticates the `npm publish --provenance` step — no token anywhere in the workflow. Note: the comment mentions the token names as prose, which is safe — the WR-02 guard inspects parsed env objects, and YAML comments are stripped by the parser.

### WR-04: Release skill recovery step still instructs "rotate `NPM_TOKEN`" — impossible and misleading after its own Step 9

**Files modified:** `skills/release/SKILL.md`
**Commit:** d549f17
**Applied fix:** Replaced the "rotate `NPM_TOKEN`, fix a permissions typo" parenthetical in Step 7 point 4 with OIDC-era recovery examples (fix the Trusted Publisher configuration on npmjs.com, fix a workflow permissions typo such as a missing `id-token: write`) plus an explicit "never mint a new `NPM_TOKEN`; publishing is trusted-publisher-only per Step 9" warning. `node bin/motto.js lint --quiet` passes (empty output, exit 0).

## Verification

- Full test suite (`npm test`): 243/243 pass after each fix and at final state.
- `node bin/motto.js lint --quiet`: exit 0, empty output.
- cwd-independence: `node --test test/ci-workflow.test.js` from `/private/tmp` passes (WR-01 proof).
- Mutation check: job-level token reintroduction is caught by the extended guard (WR-02 proof).

---

_Fixed: 2026-07-05T17:40:22Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
