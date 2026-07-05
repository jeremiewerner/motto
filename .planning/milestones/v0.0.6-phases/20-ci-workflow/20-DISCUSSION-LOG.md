# Phase 20: CI Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 20-CI Workflow
**Areas discussed:** Trigger scope & concurrency, Pack-E2E assertion depth, npm-drift warning shape, Husky prepare guard

---

## Trigger scope & concurrency

| Option | Description | Selected |
|--------|-------------|----------|
| Push main + all PRs | Standard gate: push to main, pull_request to main; no duplicate runs | ✓ |
| Push all branches + PRs | Literal "every push"; duplicate runs on PR branches | |
| Push all branches, no PR trigger | No duplicates but fork PRs ungated post-public | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, cancel superseded | concurrency group per ref, cancel-in-progress: true | ✓ |
| No, run all | Full run history per commit | |

| Option | Description | Selected |
|--------|-------------|----------|
| No filter, run everything | paths-ignore breaks required checks later; suite fast | ✓ |
| paths-ignore .planning/ + docs | Saves minutes, branch-protection footgun | |

| Option | Description | Selected |
|--------|-------------|----------|
| All parallel | 4 independent jobs, no needs; publish gating is Phase 21's job | ✓ |
| E2E jobs need test matrix | Saves minutes on broken pushes, slower feedback | |

**User's choice:** All recommended options.
**Notes:** None.

---

## Pack-E2E assertion depth

| Option | Description | Selected |
|--------|-------------|----------|
| Exit codes + JSON .ok | Parse --format json stdout, assert .ok + counts | ✓ |
| Exit codes only | Cheapest, skips Phase 19 JSON contract | |
| Full tree assertions | Strongest but brittle against init template changes | |

| Option | Description | Selected |
|--------|-------------|----------|
| npm init -y + npm install tarball | Real consumer path, npx motto | ✓ |
| npm install -g tarball | Matches README but pollutes global prefix | |
| Run from extracted tarball | Misses bin-linking + dependency resolution | |

| Option | Description | Selected |
|--------|-------------|----------|
| Node 20 — engines floor | Proves minimum supported version standalone | ✓ |
| Node 24 — newest LTS | Matches Phase 21 publish env | |
| Full matrix on E2E too | 3× minutes for stdlib-only CLI | |

| Option | Description | Selected |
|--------|-------------|----------|
| Exercise --quiet contract | Dogfood asserts empty stdout + exit 0 | ✓ |
| Plain run, exit codes | Simplest; --quiet gets no CI-level proof | |

**User's choice:** All recommended options.
**Notes:** Division of labor — dogfood proves `--quiet`, pack-E2E proves `--format json`.

---

## npm-drift warning shape

| Option | Description | Selected |
|--------|-------------|----------|
| ::warning:: annotation | Yellow banner on run + PR checks, job green | ✓ |
| Job summary markdown | Prettier but only visible on summary page | |
| Both annotation + summary | More script | |

| Option | Description | Selected |
|--------|-------------|----------|
| Warn-and-pass, never red | Check failures emit "inconclusive" warning, exit 0 | ✓ |
| Fail on check errors | Registry outage would block unrelated merges | |

| Option | Description | Selected |
|--------|-------------|----------|
| Warn on any mismatch | registry latest ≠ package.json; no semver parsing | ✓ |
| Warn only when registry lags | Needs semver compare; registry-ahead silent | |

| Option | Description | Selected |
|--------|-------------|----------|
| stdlib fetch registry JSON | One script, easy timeout, guaranteed exit 0 | ✓ |
| npm view in shell step | Exit-code juggling in YAML | |

**User's choice:** All recommended options.
**Notes:** None.

---

## Husky prepare guard

| Option | Description | Selected |
|--------|-------------|----------|
| Scoped: skip if no .git | Run husky only when .git exists; real failures loud | ✓ |
| husky \|\| true | Always green, swallows broken installs (Pitfall 4 warns) | |
| Drop husky entirely | CI becomes the only gate | |

| Option | Description | Selected |
|--------|-------------|----------|
| Tiny scripts/*.mjs file | Portable (Windows), readable, no JSON quoting | ✓ |
| Shell one-liner in package.json | POSIX-only | |
| node -e inline | Unreadable escaped JSON | |

| Option | Description | Selected |
|--------|-------------|----------|
| Implicit via pack-E2E | Tmp-dir tarball install is the .git-less context | ✓ |
| Dedicated guard test | Extra step for a case pack-E2E already hits | |

**User's choice:** All recommended options.
**Notes:** `scripts/` not in files allowlist — guard must not break consumer installs where the file is absent.

## Claude's Discretion

- YAML layout, job/step names, action version pins
- pack-install-e2e.mjs internal structure (tmp management, cleanup, output)
- Drift check as inline step vs small committed script
- Annotation/failure-message wording
- Optional workflow_dispatch trigger

## Deferred Ideas

- D-05 tarball-leak assertion in pack-E2E → Phase 21 (PUB-03)
- README CI badge → Phase 22 public-facing pass
- OS matrix (Windows/macOS) → deferred until real Windows bug
