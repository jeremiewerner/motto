# Phase 25: v0.0.6 Operator Debt Closure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 25-v0-0-6-operator-debt-closure
**Areas discussed:** Failure handling

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Stranger re-walk protocol | How literal is 'stranger'? What exactly gets diffed? | |
| Cache caveat home | Where the plugin-cache caveat gets documented | |
| Evidence & recording | What proves DEBT-07/08 to a future reader | |
| Failure handling | Fix in-phase vs record as gap — phase scope boundary | ✓ |

---

## Failure handling

### Q1: Re-walk finds build-skill missing / install path broken

| Option | Description | Selected |
|--------|-------------|----------|
| Diagnose + fix in-phase | Phase goal is "closed and verified against reality"; fix likely small; phase stays open until re-walk passes | ✓ |
| Record gap, route to --gaps | Strictly operator-actions phase; cleaner scope, slower closure | |
| Depends on fix size | Config fix in-phase; packaging code routes to --gaps | |

### Q2: Fix requires a new npm publish (defect in 0.0.6 tarball)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, patch release | Cut patch via release skill; only real fix; live-tests trusted-publisher lock | ✓ |
| No, defer to v0.0.7 ship | v0.0.7 milestone ship becomes fix vehicle; debt stays open longer | |

### Q3: Sequencing DEBT-07/08 vs DEBT-06

| Option | Description | Selected |
|--------|-------------|----------|
| Lock first, re-walk after | Step 10 overdue since 2026-07-05; patch release (if needed) proves the lock live | ✓ |
| Re-walk first, lock after | Token as emergency fallback until re-walk passes; fallback theoretical | |
| You decide | Planner sequences | |

### Q4: Trusted-publisher lock breaks publishing

| Option | Description | Selected |
|--------|-------------|----------|
| Fix config, never re-mint token | Matches release skill Step 8 item 4; zero-tokens structural; worst case delayed publish | ✓ |
| Allow temporary token re-mint | Pragmatic but contradicts DEBT-08 guarantee and Step 8 prohibition | |

**User's choice:** All four recommended options accepted.
**Notes:** User ended discussion after one area; remaining three areas assigned to Claude's discretion.

---

## Claude's Discretion

- Stranger re-walk protocol (literalness of "stranger", diff target)
- Cache caveat documentation home
- Evidence & recording detail (artifact shape, verification commands)
- Operator-checkpoint plan structure

## Deferred Ideas

None — discussion stayed within phase scope.
