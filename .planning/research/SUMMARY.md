# Project Research Summary

**Project:** Motto (v0.0.6 "Prove & Publish")
**Domain:** Node.js CLI tool — GitHub Actions CI/CD, npm publishing automation, CLI output formatting
**Researched:** 2026-07-03
**Confidence:** HIGH

## Executive Summary

Motto v0.0.6 hardens CI/CD (GitHub Actions matrix testing, tag-triggered npm publish), adds machine-readable CLI output (`--quiet`, `--format json`), and gates the repo's one-way public flip with a full-history secrets scan. **Stack research verdict: zero new npm dependencies.** All capabilities come from GitHub-hosted runner native actions, Node stdlib (`fetch`, `parseArgs`, `JSON.stringify`), or standalone tools (`gitleaks`). Architectural headline: the never-throw validation core (`src/schema.js`, `src/lint.js`, `src/build.js`) is **completely untouched** — everything is additive wrapping. Primary risk: moving publish out of local, synchronous release skill into asynchronous CI creates a recovery-path gap (mitigated by idempotent re-run design). Secondary risks cluster around lifecycle script side effects in CI, OIDC config mismatches, and stdout/stderr violations when adding `--format json` to a CLI that currently writes errors to stdout.

## Key Findings

**Recommended Stack:** Zero new deps. GitHub Actions (`checkout@v6`, `setup-node@v6` with native npm caching), Node stdlib (`fetch` for drift checks, `parseArgs` for flags, `JSON.stringify` for JSON output), npm's built-in `publish`/`pack`/`ci` commands, `gitleaks` (standalone Go binary for secrets scan), `gh` CLI (preinstalled on runners for Release notes).

**Expected Features:** Must have: Node 20/22/24 matrix, dogfood lint/build, pack-install E2E, tag-triggered publish (NPM_TOKEN interim), `--quiet` and `--format json` CLI flags, pre-public secrets scan, `.planning/` visibility decision, auto-generated GitHub Release notes. Should have: npm-drift warning, `--provenance` flag. Defer: OIDC migration (sequenced after public flip per PROJECT.md), OS matrix (defer until real Windows bug), semantic-release-style automation.

**Architecture Approach:** Single `.github/workflows/ci.yml` (no separate `release.yml`) with jobs: `test` (matrix), `dogfood`, `pack-install-e2e`, `npm-drift` (all must pass), then `publish` (tag-gated, needs all others). Presentation-layer flag handling in `bin/motto.js` only — never-throw core untouched. Fire-and-forget tag handoff from release skill to CI; recovery via workflow re-run (safe with version-existence guard) or manual fallback. Pack-install E2E in `scripts/pack-install-e2e.mjs` (outside `test/` to keep local tests fast).

**Critical Pitfalls:** (1) OIDC config drifts → 404/401 on publish (mitigate: Node 24 explicit for publish job, dry-run validation). (2) Tag pushed, CI publish fails → recovery path breaks (mitigate: version-existence guard, re-runnable workflow). (3) `prepublishOnly` fires on every `npm ci` → unintended side effects (mitigate: audit scripts for idempotency). (4) husky `prepare` fails in `.git`-less tarball contexts (mitigate: guard to no-op in CI). (5) Public flip exposes full history (mitigate: full-history `gitleaks` scan pre-flip). (6) Retroactive version backfill temptation (mitigate: publish only v0.0.5 catch-up, no 0.0.4 backfill). (7) `--format json` mixed with human text breaks parsing (mitigate: stdout JSON-only when flag set, human text to stderr).

## Implications for Roadmap

**Phase 1: CLI Ergonomics** (`--quiet`/`--format json`) — Foundational; enables assertions in later phases. Presentation-only (safe boundary). Must fix Pitfall 7 (stdout/stderr) this phase.

**Phase 2: CI Workflow** (matrix, dogfood, E2E, drift) — Depends on Phase 1. Proves non-publish gate works privately. Tests husky guard in E2E (Pitfall 4).

**Phase 3: Build-Skill Human-Verify** — Parallel to Phases 1-2. Independent; v0.0.5 residual work.

**Phase 4: CI Publish Job & Release Skill Rewrite** — After Phase 2. Combines: publish job live (Node 24 explicit, version-existence guard, NPM_TOKEN interim) + skill rewritten (bump+tag+push local, CI takes handoff, Step 5 verification + recovery runbook). Recommend dry-run before committing.

**Phase 5: Pre-Public Gate** (secrets scan + `.planning/` decision) — After Phase 4. One-way door; must be clean before visibility flip. Full-history scan required.

**Phase 6: OIDC Migration** — After public flip (PROJECT.md-sequenced). Optional fast-follow. Not a blocker for v0.0.6.

**Ordering rationale:** CLI flags enable assertions → CI gate proven → publish job trusted → public flip gated → OIDC hardens → OIDC migration optional next. No reversals; dependencies satisfied.

**Research flags:** Phase 2 (E2E assertions — standard patterns, low risk). Phase 4 (dry-run validation — MEDIUM risk, recommend deference before real tag). Phase 5 (secrets triage if hits found — sensitive, one-way, explicit callout). Phases 1, 3, 6 follow standard patterns (no research phase needed).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Official npm/GitHub/Node.js docs; zero new deps verified |
| **Features** | HIGH | Precedent tools cross-checked; MVP aligned with research |
| **Architecture** | HIGH | Repo source verified; boundary safety confirmed |
| **Pitfalls** | MEDIUM-HIGH | Official docs for most; Pitfall 6 synthesized (sound inference) |

**Overall: HIGH** — Strategic knowledge complete. Planning-phase detail gaps (dry-runs, exact assertions) are expected execution items, not missing research.

## Sources

- `.planning/research/STACK.md` — GitHub Actions versions, npm trusted-publishing requirements (docs.npmjs.com), gitleaks vs trufflehog comparison, CLI output conventions
- `.planning/research/FEATURES.md` — CI gate patterns, ESLint/ShellCheck `--format json` precedent, release-notes generation, live-verified version drift
- `.planning/research/ARCHITECTURE.md` — single-workflow structure, pack-E2E placement, `--format json` threading, release/CI handshake failure modes
- `.planning/research/PITFALLS.md` — 7 critical pitfalls with prevention strategies and phase mapping
