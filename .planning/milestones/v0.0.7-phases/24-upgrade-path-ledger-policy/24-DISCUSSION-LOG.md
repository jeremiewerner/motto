# Phase 24: Upgrade-Path Ledger & Policy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 24-Upgrade-Path Ledger & Policy
**Areas discussed:** UPG-02 enforcement mechanism, Seed entries content & audience, Scope of "breaking change"

---

## UPG-02 enforcement mechanism

### Q1 — Primary mechanism making "ledger entry before ship" operational

| Option | Description | Selected |
|--------|-------------|----------|
| Release-skill gate | New step in skills/release/SKILL.md before tag push; zero new code; matches changelog skill's git-diff pattern | ✓ |
| Mechanical test | Doc-sync-style test tying version to ledger entry; hard to detect "breaking" mechanically | |
| Prose policy only | Rule in CONTRIBUTING/CLAUDE.md; manual-sync prose already proven to fail | |
| Gate + test combo | Gate as process + minimal mechanical backstop | |

**User's choice:** Release-skill gate (recommended option)

### Q2 — Plan-time discoverability location

| Option | Description | Selected |
|--------|-------------|----------|
| CLAUDE.md constraint | Rule in .claude/CLAUDE.md Constraints; visible to any agent session; PROJECT.md already covers GSD | ✓ |
| Ledger file self-documents | Policy paragraph atop the ledger file | |
| Both CLAUDE.md + ledger header | Duplicated coverage | |
| README dev section | User-facing README; external contributors hypothetical today | |

**User's choice:** CLAUDE.md constraint (recommended option)

### Q3 — Gate logic

| Option | Description | Selected |
|--------|-------------|----------|
| Diff heuristic + judgment | Diff schema-bearing files (src/schema.js, src/templates.js, src/config.js, src/init.js) since last tag; hit → entry or explicit "not breaking" verdict | ✓ |
| Pure judgment checklist | Mandatory question, no file heuristic | |
| Every release gets an entry | Never misses but pollutes the ledger | |

**User's choice:** Diff heuristic + judgment (recommended option)

### Q4 — Gate strength

| Option | Description | Selected |
|--------|-------------|----------|
| Blocking step | Do not tag/push until entry written or verdict recorded; same strength as Step 1 test gate | ✓ |
| Advisory reminder | Soft gate — how stale-doc failures happened before | |
| Blocking + verdict logged in ledger | Also logs "not breaking" verdicts in the ledger file | |

**User's choice:** Blocking step (recommended option)

---

## Seed entries content & audience

### Q1 — Primary reader

| Option | Description | Selected |
|--------|-------------|----------|
| End-project owners | Maintainer of a Motto-scaffolded project (magma) who saw the skew warning; edit-your-files steps | ✓ |
| Contributors + owners dual | Two sections per entry; doc sprawl risk | |
| Agents first | Mechanically executable entries (exact search/replace, verify commands) | |

**User's choice:** End-project owners (recommended option)

### Q2 — Stamp real trees to validate the v0.0.7 entry?

| Option | Description | Selected |
|--------|-------------|----------|
| Stamp magma only | Live validation of documented steps; Motto tree stays D-R4 no-stamp fixture | ✓ |
| Stamp both magma + Motto | Breaks D-R4 fixture and dogfood test | |
| Stamp neither, steps only | Desk-checked only; weakest vs criterion 1 | |

**User's choice:** Stamp magma only (recommended option)

### Q3 — Entry depth

| Option | Description | Selected |
|--------|-------------|----------|
| Steps + before/after | Lint error seen, numbered steps, one before/after snippet, verify command | ✓ |
| Minimal steps only | No snippets; risky for the <role> migration | |
| Full narrative | Rationale + design links + version matrix; doc sprawl | |

**User's choice:** Steps + before/after (recommended option)

### Q4 — Seed scope

| Option | Description | Selected |
|--------|-------------|----------|
| Two entries only | Exactly UPG-01: <role> migration + stamp adoption; new-validation rejections are self-explanatory lint errors | ✓ |
| Audit history, seed all breaks | Archaeology for no reader | |
| Two + one v0.0.5 validation note | Middle ground | |

**User's choice:** Two entries only (recommended option)

---

## Scope of "breaking change"

### Q1 — Ledger-entry trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Anything breaking a project | Previously-passing project fails lint/build OR must edit project files; behavior-defined | ✓ |
| Lint-schema breaks only | Misses motto.yaml renames / dist layout changes | |
| Any observable change | Ledger noise | |

**User's choice:** Anything breaking a project (recommended option)

### Q2 — Borderline cases

| Option | Description | Selected |
|--------|-------------|----------|
| When in doubt, write entry | Default tips toward writing; stated in the gate step | ✓ |
| Maintainer judgment, no default | Re-litigates every time | |
| Litmus test in policy | "Would a pre-change scaffold pass unchanged?" | |

**User's choice:** When in doubt, write entry (recommended option)

### Q3 — Future break style

| Option | Description | Selected |
|--------|-------------|----------|
| Hard break + entry OK | Minimum and norm pre-1.0; windows case-by-case (v0.0.5 D-01 precedent) | ✓ |
| Prefer windows, entry fallback | Standing validator complexity | |
| Decide per severity | More machinery than 2 consumers justify | |

**User's choice:** Hard break + entry OK (recommended option)

### Q4 — Version keys given 0.0.3→0.0.6 npm jump

| Option | Description | Selected |
|--------|-------------|----------|
| By break version + note | Keyed by version where break landed; one-line never-published note | ✓ |
| By published-version jumps | Rewrites history; breaks down with regular publishing | |
| Planner decides | Fold into ledger-shape discretion | |

**User's choice:** By break version + note (recommended option)

---

## Claude's Discretion

- Ledger location, file name, and format (user skipped the "Ledger location & shape" area)
- Whether the skew message (`src/version.js:101`) names the concrete ledger file — v0.0.7 unreleased, wording adjustable
- Whether a minimal mechanical backstop test guards the ledger (gate is primary)

## Deferred Ideas

None — discussion stayed within phase scope. Standing deferrals untouched: UPG-F1 `motto upgrade`, VER-F1, VER-F2.
