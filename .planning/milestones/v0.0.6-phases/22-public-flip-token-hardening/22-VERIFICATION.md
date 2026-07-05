---
phase: 22-public-flip-token-hardening
verified: 2026-07-05T20:00:00Z
status: passed
score: 5/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Confirm the npmjs.com Trusted Publisher record for @jeremiewerner/motto still shows org=jeremiewerner, repo=motto, workflow=ci.yml, no environment, allowed action=npm publish"
    expected: "Record exists exactly as attested in 22-03-SUMMARY.md; this has no CLI/API surface so only a maintainer can re-confirm it in the npmjs.com web UI"
    why_human: "npmjs.com Trusted Publisher configuration is not readable via gh/npm CLI — the agent cannot independently verify this artifact, only the maintainer's prior attestation"

  - test: "After the v0.0.6 ship tag's first OIDC-authenticated publish, re-run the marketplace walkthrough (`/plugin marketplace add jeremiewerner/motto`, `/plugin install motto@motto`) and confirm `build-skill` appears in Claude Code's skill list"
    expected: "build-skill (not the retired author-skill/setup-project) appears in the installed plugin's skill list"
    why_human: "Requires a live Claude Code session and cannot be exercised until the actual OIDC publish updates npm's `latest` tag past 0.0.3 — this is the documented, already-scheduled Step 9 item 4 follow-through, not a new finding"
---

# Phase 22: Public Flip & Token Hardening Verification Report

**Phase Goal:** The repo safely crosses the one-way door to public — verified clean and usable by a logged-out stranger — and the publish pipeline ends with zero long-lived tokens by migrating to OIDC trusted publishing.
**Verified:** 2026-07-05T20:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Full git history passes a `gitleaks git .` scan, result recorded, any hit triaged/rotated before flip (OPEN-01) | ✓ VERIFIED | `.planning/phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md` has both `## Scan #1 — Triage` (405 commits, HEAD `1b1814c`, exit 0, 0 findings) and `## Scan #2 — Final (pre-flip)` (415 commits, HEAD `e85c410`, exit 0, 0 findings). Independently re-ran `gitleaks git . --exit-code 0` against current HEAD (`d7cb85b`, post-review-fix commits): 426 commits scanned, "no leaks found", exit 0 — no regression introduced by the post-SUMMARY review-fix commits. |
| 2 | `.planning/` visibility is an explicit, dated, rationale-backed decision, not a default (OPEN-02) | ✓ VERIFIED | `.planning/PROJECT.md` Key Decisions table, row: "`.planning/` ships public as-is (no history rewrite)" dated 2026-07-05, rationale explicitly names the `jeremie@studiometa.fr` commit-metadata PII finding from the sweep, Outcome "✓ Accepted — Phase 22". |
| 3 | Repo `jeremiewerner/motto` is flipped public, only after a final scan confirmed 0 unresolved findings at that same HEAD (OPEN-03 precondition) | ✓ VERIFIED | `gh repo view jeremiewerner/motto --json visibility` → `{"visibility":"PUBLIC"}` (live-checked). Scan #2's HEAD (`e85c410`) is the commit immediately prior to the scan's own recording commit (`9970842`), with the flip performed at `9970842` and no intervening content-changing commit — matches D-08's intent in substance (documented and reasoned in 22-04-SUMMARY.md). |
| 4 | Publish job authenticates to npm via OIDC (`id-token: write`), not `NPM_TOKEN`/`NODE_AUTH_TOKEN`, and passes `--provenance`; a committed test guards regression (PUB-05) | ✓ VERIFIED | `.github/workflows/ci.yml` publish job: `permissions: { contents: write, id-token: write }`; "npm publish" step runs `npm publish --provenance` with no `env:` block. `test/ci-workflow.test.js`'s `describe('ci.yml publish job OIDC contract (PUB-05)', ...)` has 4 passing cases, including a WR-02 post-review-fix sweep of workflow-level, job-level, and every step's own `env` for `NPM_TOKEN`/`NODE_AUTH_TOKEN` (mutation-provable: injecting the token at `jobs.publish.env` is caught). Full suite: `node --test` → 243/243 pass. Cwd-independence re-verified live: `node --test test/ci-workflow.test.js` run from `/tmp` passes all 7 cases (WR-01 fix confirmed working, not just claimed). |
| 5 | Branch protection on `main` requires the 5 real CI checks, `enforce_admins: false` preserves the direct-push release flow (OPEN-03/D-12) | ✓ VERIFIED | Live-checked: `gh api repos/jeremiewerner/motto/branches/main/protection --jq '{enforce_admins, checks}'` → `{"checks":["test (20)","test (22)","test (24)","dogfood","pack-install-e2e"],"enforce_admins":false}` — exact match to plan's acceptance criteria, `npm-drift` correctly excluded (its `if: github.ref == 'refs/heads/main'` guard would leave it permanently pending on PR runs). |
| 6 | A logged-out stranger can follow README → npm install → marketplace add/install → see the skill in Claude Code's skill list (OPEN-03 full walkthrough) | ⚠️ PARTIAL — see below | README render/link-resolution and `npm i -g` install: PASS (walkthrough items 1–2, 22-05-SUMMARY.md). Marketplace add/install and skill-list appearance: FAIL/BLOCKED (items 3–4) — root cause is npm's `latest` dist-tag for `@jeremiewerner/motto` still resolving to `0.0.3` (independently confirmed live: `npm view @jeremiewerner/motto dist-tags` → `{ latest: '0.0.3' }`), a stale tarball containing the retired `author-skill`/`setup-project` skills instead of `build-skill`. This is explicitly recorded (not silently passed), root-caused, and a re-verification step was wired into `skills/release/SKILL.md` Step 9 item 4 to re-run after the first OIDC-live publish — consistent with the milestone's own D-13 (ship-time-only OIDC proof) decision. Also independently verified npmjs.com's Trusted Publisher record itself cannot be checked by this agent (no CLI/API surface) — resting on the maintainer's 22-03-SUMMARY.md attestation. |

**Score:** 5/6 truths fully verified; 1 truth (#6) partially verified with a properly-recorded, diagnosed, milestone-scoped deferral plus one unverifiable-by-agent attestation.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md` | Scan #1 + PII Sweep + Scan #2 sections, leak-safe | ✓ VERIFIED | All three sections present; no raw JSON, no matched-secret text; `git status --porcelain` shows no untracked `.json` in the phase dir |
| `.planning/PROJECT.md` Key Decisions row | `.planning/` public-as-is decision | ✓ VERIFIED | Exactly one new row, cites PII finding |
| `.github/workflows/ci.yml` (publish job) | OIDC auth, `--provenance`, no token env | ✓ VERIFIED | Confirmed by direct read + passing structural test |
| `test/ci-workflow.test.js` (OIDC describe block) | 4 cases guarding the OIDC contract | ✓ VERIFIED | 4/4 cases pass; post-review-fix env-scope sweep confirmed via direct read |
| `skills/release/SKILL.md` (Step 9) | Documents token revocation, npm lockdown, provenance verification | ✓ VERIFIED | Step 9 present with all three D-15/D-16/D-17 items plus a 4th (marketplace re-verify) added during plan 22-05; `node bin/motto.js lint --quiet` exits 0 |
| GitHub branch protection on `main` | 5 required checks, `enforce_admins: false` | ✓ VERIFIED | Live `gh api` check matches exactly |
| npmjs.com Trusted Publisher record | org/repo/workflow/no-env match | ? UNCERTAIN (agent cannot check) | No CLI/API surface; resting on maintainer attestation (22-03-SUMMARY.md) |
| `jeremiewerner/motto` repo visibility | PUBLIC | ✓ VERIFIED | Live `gh repo view` check |
| `README.md` (badges + publish-flow section) | CI/npm badges, accurate flow, no stale line | ✓ VERIFIED | Badges present in first 5 lines; "Publish to npm" section matches actual tests→version→push→CI-OIDC flow; `grep -c 'fires prepublishOnly'` → 0 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `jobs.publish.permissions` | `id-token: write` AND `contents: write` | both present together | ✓ WIRED | Confirmed in ci.yml and guarded by test case 2 (regression guard) |
| "npm publish" step `run` | `--provenance` flag | string match | ✓ WIRED | Confirmed + test-guarded |
| "npm publish" step `env` / job `env` / workflow `env` | no `NPM_TOKEN`/`NODE_AUTH_TOKEN` reference | env-scope sweep | ✓ WIRED | Post-review-fix (WR-02) sweeps all 3 scopes; mutation-proof documented in 22-REVIEW-FIX.md and independently re-run here |
| README "Publish to npm" section | `skills/release/SKILL.md` actual flow | prose cross-reference | ✓ WIRED | Both describe identical tests → `npm version` → dogfood → `git push --follow-tags` → CI-OIDC-publish sequence |
| PROJECT.md decision row | PII sweep finding | citation | ✓ WIRED | Row explicitly names `jeremie@studiometa.fr` and references the SECRETS-SCAN.md section |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green | `node --test` | 243/243 pass, 0 fail | ✓ PASS |
| OIDC contract test in isolation | `node --test test/ci-workflow.test.js` | 7/7 pass | ✓ PASS |
| Cwd-independence fix (WR-01) actually works | `(cd /tmp && node --test <abs-path>/test/ci-workflow.test.js)` | 7/7 pass (previously ENOENT per REVIEW.md) | ✓ PASS |
| Skill lint clean after doc edits | `node bin/motto.js lint --quiet` | exit 0, empty stdout | ✓ PASS |
| Independent gitleaks re-run at current HEAD (post-review-fix) | `gitleaks git . --exit-code 0` | 426 commits, "no leaks found", exit 0 | ✓ PASS |
| Repo visibility | `gh repo view jeremiewerner/motto --json visibility` | `PUBLIC` | ✓ PASS |
| Branch protection live state | `gh api .../branches/main/protection` | matches exact expected checks + enforce_admins false | ✓ PASS |
| npm `latest` dist-tag (walkthrough root-cause check) | `npm view @jeremiewerner/motto dist-tags` | `{ latest: '0.0.3' }` | ✓ PASS (confirms the documented blocker is real, not overstated) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| OPEN-01 | 22-01, 22-04 | Full-history secrets scan, recorded, triaged | ✓ SATISFIED | Scan #1 + Scan #2, both clean, independently reconfirmed at current HEAD |
| OPEN-02 | 22-01 | `.planning/` visibility explicit decision | ✓ SATISFIED | PROJECT.md Key Decisions row |
| OPEN-03 | 22-03, 22-04, 22-05 | Repo public, stranger walkthrough (README/npm/marketplace) verified | ⚠️ PARTIALLY SATISFIED | Flip done, branch protection done, README/npm-install path verified working; marketplace/skill-list sub-path explicitly blocked pending first OIDC publish (documented, root-caused, follow-up wired into Step 9) |
| PUB-05 | 22-02, 22-03 | CI publish via OIDC, `--provenance`, zero long-lived tokens (code path) | ✓ SATISFIED | Static OIDC config verified + test-guarded; live OIDC exchange itself is explicitly deferred to the v0.0.6 ship tag by design (D-13), not claimed as verified by this phase |

No orphaned requirements: REQUIREMENTS.md maps exactly OPEN-01, OPEN-02, OPEN-03, PUB-05 to Phase 22, and all four appear in the merged PLAN frontmatter `requirements:` fields across 22-01 through 22-05.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any file this phase modified (`.github/workflows/ci.yml`, `test/ci-workflow.test.js`, `skills/release/SKILL.md`, `README.md`, `.planning/PROJECT.md`, `22-SECRETS-SCAN.md`) | — | None | The one TODO-referencing string found (`.planning/PROJECT.md:70`) is historical v0.0.3 milestone-archive prose, not phase-22-modified content |

Code review (22-REVIEW.md) found 4 Warnings, all fixed and independently re-verified in this pass (WR-01 cwd fix confirmed working live; WR-02 env-sweep confirmed via direct read + passing test; WR-03 stale comment confirmed rewritten; WR-04 stale "rotate NPM_TOKEN" guidance confirmed replaced). 4 Info-level findings were correctly left out of scope per the review-fix's documented `fix_scope: critical_warning` policy.

### Human Verification Required

### 1. npmjs.com Trusted Publisher record re-confirmation

**Test:** Open npmjs.com → package `@jeremiewerner/motto` → Settings → Trusted Publisher.
**Expected:** A GitHub Actions publisher record for org `jeremiewerner`, repo `motto`, workflow `ci.yml`, no environment, allowed action `npm publish`.
**Why human:** This configuration has no CLI/API surface reachable by `gh`/`npm` — the agent cannot independently confirm it exists or matches. The only evidence available is the maintainer's attestation recorded in `22-03-SUMMARY.md`, which this verifier accepts at face value per the plan's own design (Task 2's `acceptance_criteria` explicitly scoped verification to maintainer attestation, never a credential-bearing check).

### 2. Post-ship marketplace re-verification

**Test:** After the v0.0.6 ship tag's first OIDC-authenticated `npm publish` succeeds, run `/plugin marketplace add jeremiewerner/motto` then `/plugin install motto@motto` from a logged-out session, and check the installed skill list.
**Expected:** `build-skill` appears in the skill list (not the retired `author-skill`/`setup-project`).
**Why human:** Requires a live publish event that has not yet happened (npm `latest` is still `0.0.3`, independently confirmed) and a live Claude Code session — cannot be exercised or simulated now. This is not a new finding; it is the already-documented Step 9 item 4 follow-through the phase itself wired in.

### Gaps Summary

No blocking gaps. One roadmap-level truth (Success Criterion #3's marketplace/skill-list sub-clause) is not yet fully true in the live system, because npm's `latest` dist-tag has not been bumped past `0.0.3` — an event this phase deliberately does not trigger (per D-13, the live OIDC publish proof is reserved for the v0.0.6 ship tag, which is a milestone-level action outside any phase's scope, not a defect in Phase 22's own deliverables). This was independently confirmed to be accurately diagnosed (npm `dist-tags` really is stuck at `0.0.3`) and properly recorded: the walkthrough table in `22-05-SUMMARY.md` marks items 3–4 FAIL/BLOCKED rather than silently passing them, and a concrete re-verification step (Step 9 item 4 in `skills/release/SKILL.md`) was added specifically to close this loop the moment the ship tag lands. The remaining human-verification items above are the standard sign-off points this properly-recorded deferral requires — not evidence of an unaddressed defect.

All other must-haves (both roadmap Success Criteria and PLAN-frontmatter must_haves across all 5 plans) are independently confirmed present, substantive, and wired — including live re-verification of gitleaks cleanliness, branch protection, repo visibility, and the full test suite — beyond what any SUMMARY.md claimed.

---

_Verified: 2026-07-05T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
