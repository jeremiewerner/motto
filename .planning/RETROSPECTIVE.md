# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v0.0.4 — Project Bootstrap

**Shipped:** 2026-07-02
**Phases:** 4 | **Plans:** 9 | **Commits:** 75

### What Was Built
- `motto init [name] [--force]` — complete, lint-and-build-clean project scaffold (starter skill, motto.yaml, .gitignore, marketplace.json) via never-throw `src/init.js`, guarded by a permanent init → lint → build dogfood test
- CLI ergonomics: global + per-subcommand `--help`, `lint`/`build [path]` with pre-dispatch directory guard (15 spawn-based CLI tests)
- README rewritten around `motto init` with full ship-your-plugin flow; `setup-project` skill retired atomically (main never red)
- Phase 13 tech-debt closure: all 5 audit-deferred items (DEBT-01..05) resolved

### What Worked
- Gap-closure plans (10-03, 12-03) driven directly by VERIFICATION.md/REVIEW.md findings — verification artifacts fed straight into executable plans
- Atomic delete + dogfood-count sync in one commit (DOC-05) kept main green through a destructive change
- Single-sourcing name validation from `schema.js` (INIT-05) prevented the "init accepts, lint rejects" class of bug by construction
- Tech-debt phase (13) inserted before close instead of carrying debt into MILESTONES.md — milestone closed clean (initial audit status was tech_debt, re-audit passed)
- Verify-before-fix: DEBT-05 closed with zero code change after line-by-line inspection proved the grep count was a comment-text false positive

### What Was Inefficient
- Quick task `260630-vzh-review-fixes` never got a SUMMARY.md — flagged as open artifact at close; work had to be re-verified from git commits
- Plan 11 Task 2's verify script assumed `motto init <path>` scaffolds AT the path; actual semantics (positional = name, scaffolds into cwd) forced a workaround mid-execution
- README accuracy gaps (stale skill count, wrong placeholder, `--force` claim) required a third Phase 12 plan — copy drift wasn't caught at write time

### Patterns Established
- Never-throw contract enforced with adversarial malformed-input regression tests, not just happy-path unit tests (continues v0.0.2 lesson)
- Inline string templates in `src/init.js` rather than a templates directory — keeps dogfood counts and `dist/public/` clean
- Doc-bug vs validation-gap distinction: DEBT-01 fixed as documentation, explicitly NOT as a new RESERVED check (over-strictness would reject spec-conformant names)

### Key Lessons
1. Every completed quick task needs its SUMMARY.md immediately — otherwise milestone close pays a re-verification tax against git history.
2. Verification claims deserve line-by-line confirmation before code changes: two Phase 13 items (DEBT-05, and the checkpoint-gated DEBT-04) closed correctly only because claims were checked against reality first.
3. "Complete" must mean published + tagged: the v0.0.3 Phase 7 retro item (release ran but publish/tag didn't) still needs a root-cause pass next milestone.

### Cost Observations
- Model profile: adaptive
- Timeline: 1 day (2026-07-02, ~8.7h wall clock)
- Notable: 4 phases, 9 plans, 75 commits in a single day — coarse granularity + wave-based plans kept overhead low

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v0.0.1 | 3 | Baseline: pure core → lint → build, TDD with node:test |
| v0.0.2 | 3 | Dogfooding + post-merge `/code-review high` caught what GSD gates missed |
| v0.0.3 | 3 | Distribution; release-flow gap exposed (publish/tag didn't run) |
| v0.0.4 | 4 | Tech-debt phase inserted pre-close; audit re-run to passed |

### Cumulative Quality

| Milestone | Tests | Runtime Deps |
|-----------|-------|--------------|
| v0.0.1 | 53 | 1 (`yaml`) |
| v0.0.2 | 75 | 1 |
| v0.0.3 | 75 | 1 |
| v0.0.4 | 131 | 1 |

### Top Lessons (Verified Across Milestones)

1. Adversarial malformed-input tests are the only real guard for the never-throw invariant — milestone gates under-verify it (v0.0.2 code review, v0.0.4 WR-01 closure).
2. Side-effect claims (publish, tag, summary written) must be verified against git/npm reality, not documentation (v0.0.3 Phase 7, v0.0.4 quick-task artifact).
3. Single-sourcing validation rules prevents divergence classes by construction (NAME_KEBAB: v0.0.2 quick task, v0.0.4 INIT-05).
