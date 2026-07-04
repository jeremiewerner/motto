# Requirements — Milestone v0.0.6 "Prove & Publish"

**Defined:** 2026-07-03 · **Research:** `.planning/research/SUMMARY.md` (confidence HIGH, zero new deps)

Maintainer-facing milestone: no end-user feature work. "User" below = maintainer (or CI acting for them) unless stated.

## v0.0.6 Requirements

### CLI Ergonomics (CLIX)

- [x] **CLIX-01**: Maintainer can run `motto lint`/`motto build` with `--quiet` — success/progress output suppressed, errors still print, exit codes unchanged
- [x] **CLIX-02**: Maintainer can run `motto lint`/`motto build` with `--format json` — stdout carries exactly one JSON document serializing the existing `{ok, errors}` result shape; nothing else on stdout
- [x] **CLIX-03**: Diagnostics and errors write to stderr, results to stdout — the current stdout conflation in `bin/motto.js` is fixed so JSON output is pipe-safe (presentation layer only; never-throw core untouched)

### CI Workflow (CIW)

- [x] **CIW-01**: Every push/PR runs the full test suite on a Node 20/22/24 matrix via `.github/workflows/ci.yml`
- [x] **CIW-02**: CI runs dogfood `motto lint` + `motto build` against Motto's own `skills/` tree on a clean checkout
- [x] **CIW-03**: CI runs a pack-install E2E (`scripts/pack-install-e2e.mjs`): `npm pack` → install tarball in tmp dir → `motto init` → `lint` → `build` — proving what npm actually ships works standalone
- [x] **CIW-04**: CI warns (non-blocking) when npm registry latest lags `package.json` version — the v0.0.4/v0.0.5 silent-drift failure mode becomes visible
- [x] **CIW-05**: husky `prepare` script is guarded to no-op outside a git checkout (CI tarball installs, `npm ci` in workflows)

### Publish Automation (PUB)

- [x] **PUB-01**: Pushing a `v*` tag triggers a CI publish job — gated on all other jobs green, pinned to Node 24 (npm ≥11.5.1), idempotent via version-existence guard (`npm view` before publish; re-runs safe)
- [ ] **PUB-02**: `release` skill rewritten — local flow is tests → bump → tag → `git push --follow-tags` only; publish step removed from laptop; skill documents the CI handoff and the publish-failure recovery runbook (re-run job; never re-tag)
- [x] **PUB-03**: D-05 tarball leak assertion moves from the release skill's inline heredoc to a committed script run by the CI pack-E2E job
- [x] **PUB-04**: Each published version gets a GitHub Release with auto-generated notes (`gh release create --generate-notes` from the publish job)
- [ ] **PUB-05**: After the repo is public, CI publish migrates from `NPM_TOKEN` to npm trusted publishing (OIDC) with `--provenance` — milestone ends with zero long-lived publish tokens

### Public Flip (OPEN)

- [ ] **OPEN-01**: Full git history passes a secrets scan (`gitleaks git .`) — any hit is triaged and rotated before the flip; scan result recorded
- [ ] **OPEN-02**: `.planning/` visibility is an explicit recorded decision (public as-is, or excluded via history rewrite) — not a default
- [ ] **OPEN-03**: Repo `jeremiewerner/motto` flips public — README, npm links, and marketplace install path verified working for a logged-out stranger

### Build-Skill Verification (BSKV)

- [x] **BSKV-01**: One real skill is authored end-to-end through `build-skill` from freeform input — closing the v0.0.5 human-verify debt: live gap-fill fidelity (BSKL-01), quality gate on real hollow output (BSKL-05), name-recovery path at runtime (WR-01); findings recorded, divergences fixed or ticketed

## Future Requirements (deferred)

- `motto ship` command (SHIP-01) — still no real friction shown
- OS matrix (Windows/macOS CI legs) — defer until a real Windows bug report
- Node 20 EOL decision (bump `engines` to ≥22?) — explicit decision next milestone; matrix still tests 20 for lagging installs
- `--format json` line/column positions from yaml parser errors — v2+ consideration
- Design-ledger items: action section tags (`<drill>`/`<run>`/`<mcp>`), skill-calls-skill with params, `{var}` interpolation, `template:` array (multi-template), `agent` template — design each against the first real skill that needs it

## Out of Scope

- **semantic-release / release-please / changesets** — would collapse the deliberate local-bump/CI-publish split and impose commit conventions; release skill + tag trigger is the whole mechanism
- **Third-party release-notes actions** (`softprops/action-gh-release` etc.) — `gh` CLI preinstalled on runners; zero added supply-chain surface
- **v0.0.4 npm backfill** — published versions are permanently non-reusable; catch-up publishes 0.0.5 only (manual, via existing release skill, before PUB-01 lands)
- **Continuous secrets scanning in CI** (trufflehog live verification) — one-shot pre-flip gate is the need; GitHub secret scanning activates automatically post-flip
- **Severity model for lint (warnings vs errors)** — ESLint-style `--quiet` semantics would require inventing one; Motto lint is binary pass/fail
- **New runtime deps** — everything ships from stdlib + actions-native tooling (constraint held)

## Traceability

Every v0.0.6 requirement maps to exactly one phase. 17/17 mapped.

| REQ-ID | Phase |
|--------|-------|
| CLIX-01 | Phase 19 |
| CLIX-02 | Phase 19 |
| CLIX-03 | Phase 19 |
| BSKV-01 | Phase 19 |
| CIW-01 | Phase 20 |
| CIW-02 | Phase 20 |
| CIW-03 | Phase 20 |
| CIW-04 | Phase 20 |
| CIW-05 | Phase 20 |
| PUB-01 | Phase 21 |
| PUB-02 | Phase 21 |
| PUB-03 | Phase 21 |
| PUB-04 | Phase 21 |
| OPEN-01 | Phase 22 |
| OPEN-02 | Phase 22 |
| OPEN-03 | Phase 22 |
| PUB-05 | Phase 22 |
