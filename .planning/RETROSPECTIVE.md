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

## Milestone: v0.0.5 — Skill Builder

**Shipped:** 2026-07-03
**Phases:** 5 | **Plans:** 11 (+3 quick tasks) | **Commits:** ~120

### What Was Built
- Data-driven `template:` enforcement from pure-data `src/templates.js` (`procedure` ships), fence-aware section matching (`hasClosedSection` char+length tracking)
- `outputs:`/`dependencies:`/`allowed-tools` validated with integrity guards (lexical path-safety + fs symlink-escape, resolution/self-dep/audience-direction, Option A format-only) — all never-throw with adversarial tests
- `skills/build-skill/` — structures any freeform input into a lint-clean conforming skill, self-verifies against the real linter; `author-skill` retired atomically
- `skill-schema.md` rewritten to the live validator + doc-sync test that breaks the suite on drift; README rewritten around build-skill
- Base spine `**Role:**` → registry-driven `<role>…</role>` section tag (hard break, BASE_SPINE data, two distinct errors, non-empty required)

### What Worked
- Post-execution code review as a standing gate: phase 18's review caught CR-01 (never-throw registry-shape crash — the exact tests-green-but-broken class from 3 prior milestones) BEFORE verification; fixed same-session with regression tests
- CONTEXT.md decisions written as `- **D-NN:**` bullets — the mechanical decision-coverage gate parsed 9/9 for the first time (phases 15/16 had could-not-parse overrides)
- Additive-prep + atomic-flip wave split (18-01 unwired helper, 18-02 one-commit hard break) kept main green through a breaking schema change; dogfood + doc-sync tests forced the atomicity by construction
- Quick tasks closed review debt same-day (IN-02 fence-helper extraction, WR-04 shape guard at milestone close) — first milestone shipping with zero open review findings and zero known never-throw gaps
- Doc-sync test extended to read `src/templates.js` (WR-03 fix) — registry descriptions can no longer silently stale the doc

### What Was Inefficient
- WR-04 (TPL entry shape guard) was deferred twice (14 → 15 → audit) before a 24-minute quick task closed it — deferral cost exceeded fix cost
- 18-VERIFICATION.md recorded IN-02 as "deferred debt" minutes before the quick task closed it — verification and remediation raced; audit had to supersede the stale line
- STATE.md velocity table accumulated duplicate phase rows across milestones (cosmetic, still uncleaned)
- MILESTONES.md auto-generated entry truncated two accomplishments at `**Role:**` (asterisk parsing) — needed manual repair

### Patterns Established
- Registry-driven rules: adding a template OR a spine rule is now a data edit (`SECTIONS`/`TEMPLATES`/`BASE_SPINE`) — proven twice in one milestone
- Two distinct error strings per failure mode (missing vs empty) for grep-the-message debugging, each doc-synced
- Maintainer-integrity errors (unreachable by skill authors) stay OUT of author-facing doc error tables and the doc-sync allowlist
- Review remediation before verification, not after ship (phase 17 started it; phase 18 systematized it)

### Key Lessons
1. Never-throw violations keep arriving through NEW code paths (this time: a widened DI parameter shape) — the invariant needs a review-time checklist item on every validator-touching diff, not just tests on existing paths.
2. Twice-deferred one-line debt should be closed at first deferral — WR-04's total process cost (audit entries, re-verification, carry-forward prose) dwarfed the fix.
3. D-NN-format decisions in CONTEXT.md make the coverage gate mechanical — adopt as the standing discuss-phase output format.

### Cost Observations
- Model profile: adaptive (opus planner, sonnet executors/verifier, haiku checker)
- Timeline: 1 day (2026-07-03, ~17h wall clock, 5 phases)
- Notable: phase 18 added post-audit (design-ledger promotion) — roadmap absorbed a 5th phase and a re-audit without friction

---

## Milestone: v0.0.6 — Prove & Publish

**Shipped:** 2026-07-05
**Phases:** 4 | **Plans:** 14 | **Commits:** 109

### What Was Built
- `.github/workflows/ci.yml` — four parallel jobs (Node 20/22/24 matrix, `--quiet` dogfood, pack-install E2E, never-red npm-drift advisory) gating every push/PR
- Tag-triggered publish job: `version_guard` (tag vs package.json, hard-fail before any side effect) → idempotent npm/gh guards → OIDC trusted publishing with `--provenance` → `gh release create --generate-notes`; zero long-lived tokens (NPM_TOKEN minted in 21-03, retired in 22-02)
- `release` skill rewritten — local flow terminates at `git push --follow-tags`; CI-handoff, Verify-CI-Published, never-re-tag recovery runbooks
- Public flip behind explicit gates: two full-history gitleaks scans (405/415 commits, clean), mechanical PII sweep, recorded `.planning/`-public decision, branch protection with 5 required checks
- CLI `--quiet` + `--format text|json` + stdout/stderr split (presentation layer only); build-skill proven live on `skills/changelog`

### What Worked
- Live-proof-at-close: the milestone close itself exercised the deliverable — bumping to 0.0.6 and pushing the tag was exactly Phase 21's deferred UAT scenario, so shipping and verifying were one motion (verified closeout, no override)
- Structural tests on ci.yml (ordering-aware `findIndex` assertions, OIDC 4-case contract) — workflow regressions break the suite locally, not in a failed publish
- Executing the guard's literal bash body with match/mismatch/prerelease scenarios during verification — behavioral proof without needing a throwaway tag
- One-way-door discipline: rescan at the literal pre-flip HEAD, decisions recorded before the flip, standing review caught the never-red CI script + npx substitution issues pre-verification

### What Was Inefficient
- The `260630-vzh-review-fixes` SUMMARY.md gap (v0.0.4-era) surfaced at a THIRD milestone close — commit e81641c claimed "PLAN + SUMMARY" but staged only PLAN.md; retro-written at this close. Artifact claims in commit messages need the same reality-check as side-effect claims.
- Auto-extracted MILESTONES.md accomplishments pulled a review-finding line ("[Rule 1 - Bug] …") as a one-liner — summary-extract grabbed the wrong field from 19-02's SUMMARY; needed manual curation (repeat of v0.0.5's asterisk truncation)
- npm versions 0.0.4/0.0.5 never shipped (release skill never ran in two milestones) — the 0.0.3→0.0.6 jump is harmless but the two-milestone silent drift is exactly what the new npm-drift CI job now makes visible

### Patterns Established
- Ship-then-close: when a milestone's deliverable IS the release pipeline, the close sequence (bump → merge → tag → watch) doubles as the final UAT — deferred "first live run" checks resolve at close, not after
- Guards ordered hard-fail-first: version_guard before any idempotency guard or side effect; proven by ordering-aware tests, not step order convention
- Token lifecycle inside one milestone: mint the narrow interim credential only when needed, migrate to OIDC, retire it before ship

### Key Lessons
1. Deferred-to-ship verification items should be wired INTO the close workflow, not parked as pending UAT — this close only caught them because the artifact audit blocked on them.
2. Commit messages claiming artifacts ("PLAN + SUMMARY") can lie by omission; the audit's per-directory SUMMARY check is the real guard, and it took three closes to fire because earlier closes acknowledged instead of fixing.
3. A guard proven by executing its extracted bash body ≠ proven in the live runner — both were needed: spot-checks caught the logic, the real v0.0.6 run proved the wiring (needs-gating, OIDC exchange, registry write).

### Cost Observations
- Model profile: adaptive
- Timeline: 2 days (2026-07-03 → 2026-07-05, 4 phases + live release at close)
- Notable: 3 maintainer checkpoints (npm token, trusted-publisher config, repo flip) — first milestone where human-in-the-loop steps were plan-level tasks

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v0.0.1 | 3 | Baseline: pure core → lint → build, TDD with node:test |
| v0.0.2 | 3 | Dogfooding + post-merge `/code-review high` caught what GSD gates missed |
| v0.0.3 | 3 | Distribution; release-flow gap exposed (publish/tag didn't run) |
| v0.0.4 | 4 | Tech-debt phase inserted pre-close; audit re-run to passed |
| v0.0.5 | 5 | Review-before-verify systematized; quick tasks close debt same-day; D-NN decision format makes coverage gate mechanical |
| v0.0.6 | 4 | Ship-then-close: milestone close doubles as the pipeline's live UAT; artifact audit blocks close until deferred items resolve or get fixed |

### Cumulative Quality

| Milestone | Tests | Runtime Deps |
|-----------|-------|--------------|
| v0.0.1 | 53 | 1 (`yaml`) |
| v0.0.2 | 75 | 1 |
| v0.0.3 | 75 | 1 |
| v0.0.4 | 131 | 1 |
| v0.0.5 | 213 | 1 |
| v0.0.6 | 243 | 1 |

### Top Lessons (Verified Across Milestones)

1. Adversarial malformed-input tests are the only real guard for the never-throw invariant — milestone gates under-verify it (v0.0.2 code review, v0.0.4 WR-01 closure, v0.0.5 CR-01: violations arrive through NEW code paths, so every validator-touching diff needs a review-time check).
2. Side-effect claims (publish, tag, summary written) must be verified against git/npm reality, not documentation (v0.0.3 Phase 7, v0.0.4 quick-task artifact).
3. Single-sourcing validation rules prevents divergence classes by construction (NAME_KEBAB: v0.0.2 quick task, v0.0.4 INIT-05).
