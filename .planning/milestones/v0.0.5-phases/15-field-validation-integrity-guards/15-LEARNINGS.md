---
phase: 15
phase_name: "Field Validation & Integrity Guards"
project: "Motto"
generated: "2026-07-03"
counts:
  decisions: 6
  lessons: 5
  patterns: 5
  surprises: 3
missing_artifacts:
  - "15-UAT.md"
---

# Phase 15 Learnings: Field Validation & Integrity Guards

## Decisions

### Self-dependency check ordered before membership resolution
In the `dependencies:` bare-entry cascade, the self-dependency check (`entry === dirName`) runs strictly BEFORE the `skillNames.has(entry)` membership check.

**Rationale:** A skill is always trivially a member of its own discovered skill-name set, so a membership-first ordering would silently misclassify a self-dependency as resolved (RESEARCH.md Pitfall 2). Verified as wired in the final code (schema.js self-dep check textually precedes and `continue`s before membership).
**Source:** 15-01-SUMMARY.md, 15-VERIFICATION.md

### Purity split with a cross-layer shared predicate
Lexical guards (non-string, `..` traversal, absolute path) live in pure `src/schema.js`; fs-dependent checks (existence, symlink-realpath containment) live in `src/lint.js`. One exported predicate (`isOutputPathLexicallySafe`) is the single gate both layers call.

**Rationale:** Preserves the schema.js purity contract (no `node:fs`, sync only) while preventing duplicated cascade logic that could drift between layers. After the CR-01 fix the predicate is root-independent, so the layers agree by construction rather than by convention.
**Source:** 15-CONTEXT.md, 15-01-SUMMARY.md, 15-REVIEW-FIX.md

### allowed-tools locked to Option A: format-only, no shape regex
Each entry must be a non-empty string (string or array container both valid); no tokenizing, no pattern validation. `Bash(git add *)` passes trivially because a YAML list item is one permission rule by construction.

**Rationale:** Matches every documented spec form (space-separated string, comma-separated string, YAML list); portability fundamental — a valid Agent Skill must pass lint. Resolved the roadmap's STACK.md Q2 research flag at discuss-phase.
**Source:** 15-CONTEXT.md, 15-01-SUMMARY.md

### Audience pre-pass runs unconditionally and swallows all per-file failures
`loadSkillAudiences` re-reads every discovered skill's frontmatter before the per-skill loop (not only dependency-declaring skills) and swallows ALL read/parse failures silently — never pushes to errors.

**Rationale:** Re-reading small SKILL.md files follows the established `build.js` "Option A — re-read" precedent; conditional two-pass detection adds complexity for no benefit at this scale. Swallowing all failures (not just ENOENT) prevents double-reporting a skill's own parse error, which the per-skill loop already reports (RESEARCH.md Pitfall 3).
**Source:** 15-02-SUMMARY.md

### CR-01 fix: predicate made root-independent via normalize(), deliberately stricter
The fix changed `isOutputPathLexicallySafe(skillDirAbs, entry)` to `(entry)` using `normalize()` and never `resolve()`, so the verdict cannot depend on `process.cwd()`. `..`-re-entry paths like `../my-skill/x` (which re-enter the skill dir) are now rejected too.

**Rationale:** The two-roots bug (schema resolving from cwd, lint from the real skill dir) was structural — aligning the roots by construction beats aligning them by call-site discipline. Strictness on re-entry paths is acceptable: no legitimate output path needs to leave and re-enter the skill dir.
**Source:** 15-REVIEW-FIX.md

### Live dogfood authored to exercise the less-covered code path
`skills/release/SKILL.md`'s `allowed-tools` was written as a 3-entry YAML array (`Bash(node *)`, `Bash(npm *)`, `Bash(git *)`) rather than a single space-separated string.

**Rationale:** The array per-entry validator branch gets live, non-fixture coverage (the string branch was already unit-covered), while genuinely naming every command family the release procedure invokes.
**Source:** 15-02-SUMMARY.md

---

## Lessons

### A fully green test suite proved nothing about the guards' soundness
All 185 tests passed while two empirically reproducible criticals existed: a crafted `../../<cwdDirName>/...` outputs path escaped the skill dir AND skipped the existence check (lint returned `ok: true`), and a file named `skills` at the project root crashed the CLI through `lintProject`.

**Context:** The post-execution code review reproduced both against the live code before writing them up. This repeats the v0.0.2 history where `/code-review high` caught never-throw holes the milestone tests missed — the review-then-fix loop is a load-bearing quality gate for this project, not a formality.
**Source:** 15-REVIEW.md, 15-REVIEW-FIX.md

### `resolve()` on a relative path smuggles cwd into "pure" code
The original predicate called `resolve(dirName)` inside schema.js, silently anchoring the containment root to `process.cwd()` while the lint layer anchored to the real skill dir. Two layers, same predicate name, different verdicts.

**Context:** Unit tests run from the project root, where the two roots coincide — the bug was invisible to the suite by construction. Purity means no hidden global state, and `process.cwd()` is global state; `normalize()`-based string math is the cwd-free alternative.
**Source:** 15-REVIEW.md (CR-01), 15-REVIEW-FIX.md

### Never-throw must be verified at the boundary, not per-validator
The phase's new validators were individually never-throw, yet `lintProject` still rejected: pre-existing helpers (`loadSharedRefs`, `discoverSkillNames`) rethrew non-ENOENT fs errors with no upstream catch.

**Context:** The invariant is a property of the exported boundary (`lintProject`, consumed by the CLI with no catch), so adversarial tests must attack the boundary with hostile filesystems (ENOTDIR via a file named `skills`), not just hostile frontmatter values.
**Source:** 15-REVIEW.md (CR-02), 15-REVIEW-FIX.md

### Retiring documented behavior breaks the test that encoded it — plan for it
Landing the `dependencies:` validator broke pre-existing test B13a, which asserted the retired D-14 "dependencies is a passthrough key" behavior with a zero-errors expectation.

**Context:** RESEARCH.md Pitfall 6 anticipated this exact staleness (the schema.js docblock claim was flagged as going stale). The executor auto-fixed it under Rule 1 by rewriting the assertion to the new VAL-02 error. When a phase intentionally retires documented behavior, list the tests encoding the old behavior in the plan.
**Source:** 15-01-SUMMARY.md (Deviations)

### Mechanical coverage gates fail closed on format drift
The plan-phase decision-coverage gate returned `could-not-parse` because 15-CONTEXT.md's decisions use bold-category bullets, not the `- **D-NN:**` form the parser expects — zero decisions extracted, none actually uncovered.

**Context:** Resolved by operator override plus two manual checks (plan-checker Dimension 7 at planning; verifier cross-check at verification). Either author CONTEXT.md decisions in D-NN form, or expect the gate to need a manual fallback path.
**Source:** .planning/STATE.md (Blockers/Concerns), 15-VERIFICATION.md

---

## Patterns

### Symlink-escape containment idiom
`stat()` for existence first (broken links fail here), then `isFile()` guard, then `realpath()` BOTH the skill root and the resolved target, then `path.relative()` containment (`rel === ''` or not starting `..` and not absolute). Lexical `resolve()`+`sep` checks alone do not follow symlinks.

**When to use:** Any path-integrity check where user-controlled paths could be symlinks. Confirm empirically with a real `symlink()` fixture — this codebase's first use was research-flagged MEDIUM confidence and validated by an adversarial test rather than trusted.
**Source:** 15-02-SUMMARY.md, 15-RESEARCH.md (Assumption A1)

### Type-guard-before-method cascade with throwing-toPrimitive adversarial tests
Every field branch checks `typeof`/`Array.isArray` before calling any string/array method or interpolating into a template literal. Each validator gets an adversarial test feeding an object whose `toString`/`Symbol.toPrimitive` throws.

**When to use:** Every new frontmatter field validator — this is the project's proven never-throw enforcement mechanism. The `description` field predating this pattern was exactly the one found throwable (WR-01).
**Source:** 15-01-SUMMARY.md, 15-REVIEW-FIX.md

### Cross-layer shared pure predicate export
When a pure layer and an fs layer must agree on a gate (lexical safety gating fs eligibility), export one predicate from the pure module and import it in the fs module — and make the predicate free of ambient state so the layers cannot diverge.

**When to use:** Any validation split across a pure/sync layer and an I/O layer where "layer A skips what layer B rejected" assumptions exist. A silent disagreement here is a silent bypass (CR-01's failure mode).
**Source:** 15-01-SUMMARY.md, 15-REVIEW-FIX.md

### Tolerant pre-pass that never reports
A cross-entity context loader (`loadSkillAudiences`) that swallows every per-file failure and returns partial data, on the grounds that the per-entity loop reports each entity's own errors exactly once.

**When to use:** Building cross-entity lookup context (name→attribute maps) inside a linter where each entity is separately validated — prevents double-reporting while keeping the pre-pass never-throw.
**Source:** 15-02-SUMMARY.md

### Review → fix → independently re-verify, with a regression test per finding
Each review finding got an atomic fix commit plus regression tests pinning the exact reproduction shape (e.g. the historical `../../<cwdDirName>/...` bypass, the one-`touch` ENOTDIR crash). The verifier then re-probed each fix live rather than trusting the fix report.

**When to use:** Every phase touching validation/integrity code. 185 → 194 tests: the 9 added tests are the durable output of the review loop — the holes stay closed.
**Source:** 15-REVIEW-FIX.md, 15-VERIFICATION.md

---

## Surprises

### Both layers passed their own tests while disagreeing on the containment root
Schema and lint each looked correct in isolation; the cwd-dependent bypass only manifested when the two layers' "safe" verdicts diverged — and the test environment (cwd = project root) was precisely the configuration where they coincide.

**Impact:** 2 critical findings post-execution; fixed same-session. Reinforces that integration-shaped adversarial probes (crafted hostile inputs through the real `lintProject` from varied cwd) catch what layer-local unit tests structurally cannot.
**Source:** 15-REVIEW.md

### One `touch` crashes the CLI
A file (not directory) named `skills` or `shared/references` at the project root produced an unhandled ENOTDIR rejection through `lintProject` — a one-command reproduction of a never-throw violation in code that predated the phase.

**Impact:** The phase's "every NEW validator is never-throw" framing was too narrow; the fix hardened the pre-existing helpers too, and the boundary (not the validators) is now the tested invariant.
**Source:** 15-REVIEW.md (CR-02), 15-REVIEW-FIX.md

### Implementation was minutes; assurance was the real work
Plan 01 executed in 5 minutes and Plan 02 in 4, both zero-blocker; the review→fix→re-verify loop dominated the phase's wall clock and produced its most valuable artifacts (2 critical fixes, 9 regression tests).

**Impact:** For a mature small codebase with strong patterns (PATTERNS.md gave 3/3 same-file analogs), the cost center is verification depth, not code production — budget phases accordingly.
**Source:** 15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-REVIEW-FIX.md
