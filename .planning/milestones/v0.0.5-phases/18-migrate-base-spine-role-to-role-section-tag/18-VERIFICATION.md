---
phase: 18-migrate-base-spine-role-to-role-section-tag
verified: 2026-07-03T15:30:00Z
status: passed
score: 15/15 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 18: Role Section Tag Migration Verification Report

**Phase Goal:** The base-spine role declaration moves from the `**Role:**` bold-line convention to a `<role>…</role>` section tag, consistently across linter, existing skills, init scaffold, build-skill generation, and docs.
**Verified:** 2026-07-03T15:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

**Post-execution context accounted for:** a code-review + remediation cycle ran after plan execution (18-REVIEW.md, status: `remediated`). Fix commits `878d8dc` (CR-01), `3a7065c` (WR-01), `515f676` (WR-02), `0c39187` (WR-03), `2027a15` (IN-01) were read into `src/schema.js`, `shared/references/skill-schema.md`, `test/doc-sync.test.js`, and `README.md` directly and re-verified below against the CURRENT code, not the pre-fix plan text.

## Goal Achievement

### Observable Truths (D-01..D-09 decision contract, cross-referenced against 18-CONTEXT.md)

| # | Truth | Decision | Status | Evidence |
|---|-------|----------|--------|----------|
| 1 | A body with only the legacy `**Role:**` bold line and no `<role>` tag fails lint with the missing-role error | D-01 (hard break), D-02 (leftover line inert) | VERIFIED | Ran `validateSkill` inline on `"# Title\n\n**Role:** You are a helper.\n"` → `body must contain <role>…</role> — Behavioral instruction that tells the agent who it is and how to act.` — exactly one error, no separate "legacy line detected" check. |
| 2 | An empty `<role></role>` section fails lint with a distinct empty-role error, and NOT the missing-role error | D-05 (non-empty), D-08 (two distinct errors) | VERIFIED | Ran on `"# Title\n\n<role>\n</role>\n"` → `<role>…</role> section must not be empty — ...` only; missing-role error absent. |
| 3 | A non-empty `<role>…</role>` section passes lint with no role error | D-05, D-07 | VERIFIED | Ran on `"# Title\n\n<role>\nYou are a helper.\n</role>\n"` → `[]` (zero errors). |
| 4 | Role rule is registry-driven: `src/schema.js` loops `BASE_SPINE` and composes the error from `SECTIONS.role`; Title check stays hardcoded/untouched | D-03, D-04 | VERIFIED | `src/schema.js:428` `for (const s of Array.isArray(SPINE) ? SPINE : BASE_SPINE)`; `src/templates.js:22-28` exports `SECTIONS.role` + `BASE_SPINE = ["role"]`. Title check at `src/schema.js:409-416` untouched, still gated by `waivedSections.has("title")` independently of the spine loop. |
| 5 | No position or multiplicity constraint on `<role>` — it may appear anywhere, first match wins, duplicates harmless | D-07 | VERIFIED | Ran with role tag placed after intro prose, and with duplicated `<role>` blocks — both produced zero role errors. |
| 6 | Both live skills, the `motto init` starter, README, and skill-schema.md use `<role>`; no legacy convention remains except the deliberately-retained frontmatter B8 fixture | D-01, D-09 | VERIFIED | `grep -rn '\*\*Role:' skills/ src/init.js README.md shared/references/skill-schema.md` → empty. `skills/release/SKILL.md:14-16`, `skills/build-skill/SKILL.md:16-18`, `src/init.js:46-48` all contain `<role>...</role>`. Remaining `**Role:**` hits are only in `src/frontmatter.js` comments/`test/frontmatter.test.js` (B8 YAML-alias guard, deliberately unchanged) and one intentional `test/schema.test.js:565` fixture proving the legacy line is inert (truth #1). |
| 7 | Two distinct, registry-composed lint error strings are documented in skill-schema.md and drift-guarded by doc-sync; no legacy/migration mention remains (D-09) | D-08, D-09 | VERIFIED | `shared/references/skill-schema.md` §4 quotes both strings verbatim (`body must contain <role>…</role> — ...` / `<role>…</role> section must not be empty — ...`); the "empty Role passes" caveat is gone; no `**Role:**` mention remains in the doc. `test/doc-sync.test.js` staticSegments includes `body must contain <`, `section must not be empty`, plus (post-WR-03-fix) `templates.js`-sourced segments `Behavioral instruction that tells the agent who it is and how to act.` and `BASE_SPINE = ["role"]`. |
| 8 | `hasNonEmptyClosedSection` and `hasClosedSection` never throw for adversarial/malformed body input (never-throw invariant) | D-05/D-06 (never-throw is a hard project invariant per memory) | VERIFIED | Directly invoked both functions and `validateSkill` with `null, undefined, 123, {}, [], true` bodies — all returned booleans/error arrays, none threw. Also re-verified the CR-01 fix: `validateSkill(skill, new Set(), { SECTIONS: {}, TEMPLATES: {} })` (pre-phase-18 registry shape, no `BASE_SPINE`) no longer throws `TypeError: SPINE is not iterable` — it fails soft to the real spine and still reports the missing-role error. |
| 9 | The full `node --test` suite is green in the current (post-remediation) code state | Cross-cutting atomic-commit requirement | VERIFIED | `node --test` → 211/211 pass, 49 suites, 0 fail. Matches SUMMARY/REVIEW claimed count. `node bin/motto.js lint` → `✓ 2 skills OK` (dogfood clean). |

**Score:** 9/9 decision-contract truths verified (D-01 through D-09 all accounted for; D-06 folds into truth #8's isolation/never-throw evidence).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/templates.js` | `BASE_SPINE = ["role"]`, `SECTIONS.role` description, `TEMPLATES` unchanged, pure data (no imports) | VERIFIED | Confirmed via Read; `grep -c "^import\|require("` = 0. |
| `src/schema.js` | `hasNonEmptyClosedSection` exported; `BASE_SPINE` loop replacing legacy regex; two distinct composed error strings; never-throw guards (typeof, not `\|\|`) | VERIFIED | All present at lines 138-179 (helper) and 418-437 (loop); `typeof body === "string"` guards at lines 77, 139, 369 (post-WR-02 fix — `hasClosedSection` itself now uses the typeof guard too, closing the gap the review flagged). |
| `skills/release/SKILL.md`, `skills/build-skill/SKILL.md` | `<role>` section, same prose | VERIFIED | Both contain `<role>...</role>` wrapping original prose; build-skill's two prose references (gen. instructions, quality gate) name the section tag and keep "behavioral, not a bare label" wording. |
| `src/init.js` | Hello-world starter emits `<role>` | VERIFIED | Lines 44-49. |
| `shared/references/skill-schema.md`, `test/doc-sync.test.js`, `README.md` | Docs + drift guard updated to two new strings; no legacy mention | VERIFIED | Confirmed by grep/read above; doc-sync test passes standalone. |
| `test/schema.test.js`, `test/lint.test.js`, `test/build.test.js`, `test/frontmatter.test.js` | Fixture bodies migrated except the deliberate B8 exception | VERIFIED | `grep -c '<role>'` ≥1 in schema/lint/build test files; only intentional legacy occurrences remain (B8 guard + the D-01/D-02 inert-line regression test). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/schema.js` BASE_SPINE loop | `src/templates.js` BASE_SPINE / SECTIONS.role | import + destructure | WIRED | `import { SECTIONS, TEMPLATES, BASE_SPINE } from "./templates.js"` (line 20); threaded through `templatesRegistry` default + destructure with a fail-soft `Array.isArray` guard (CR-01 fix). |
| `test/doc-sync.test.js` staticSegments | `src/schema.js` error strings + `shared/references/skill-schema.md` | substring assertion | WIRED | doc-sync test passes; now also reads `src/templates.js` (WR-03 fix), closing the previously-flagged silent-drift gap on the interpolated `SECTIONS.role` description and the `BASE_SPINE` registry snippet. |
| `test/dogfood.test.js` (lints skills/) | migrated `skills/release`, `skills/build-skill` | `lintProject(REPO_ROOT)` | WIRED | `lintProject on REPO_ROOT returns ok:true with count=2` passes; `motto bin lint` independently confirms `✓ 2 skills OK`. |
| `test/init-dogfood.test.js` | migrated `src/init.js` starter | `scaffoldProject` + `lintProject` | WIRED | `lintProject returns ok:true with count=1` passes against the freshly scaffolded starter. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green | `node --test` | 211 pass / 0 fail / 49 suites | PASS |
| Dogfood lint clean | `node bin/motto.js lint` | `✓ 2 skills OK` | PASS |
| Legacy-bold-line-only body rejected | inline `validateSkill` call | missing-role error only | PASS |
| Empty `<role></role>` rejected | inline `validateSkill` call | empty-role error only, not missing-role | PASS |
| Non-empty `<role>` accepted | inline `validateSkill` call | zero errors | PASS |
| Never-throw on malformed body (`null/undefined/123/{}/[]/true`) | inline `validateSkill`, `hasClosedSection`, `hasNonEmptyClosedSection` calls | booleans / error arrays returned, no throw | PASS |
| CR-01 regression (pre-18 registry shape) | inline `validateSkill(..., { SECTIONS: {}, TEMPLATES: {} })` | no throw, missing-role error reported | PASS |
| WR-01 regression (same-line trailing content) | inline `validateSkill` on `"<role> You are a helper.\n</role>"` | zero errors (no false empty flag) | PASS |
| D-07 (role anywhere / duplicates harmless) | inline `validateSkill` variants | zero errors both cases | PASS |
| D-04 (Title check independent) | inline `validateSkill` on titleless-but-valid-role body | title-only error | PASS |

### Anti-Patterns Found

None. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any file touched by this phase. The only remaining `**Role:**` occurrences in the tree are the deliberately-retained `src/frontmatter.js` B8 alias-guard fixture and comments, and the intentional `test/schema.test.js` regression test proving the legacy line is now inert — both explicitly scoped exceptions per 18-CONTEXT.md "Claude's Discretion" and confirmed unchanged (`git diff --stat src/frontmatter.js` shows no change per SUMMARY, independently re-confirmed here by content inspection).

### Requirements Coverage

Phase 18 has no REQ-IDs in `.planning/REQUIREMENTS.md` (v0.0.5 was already audited 19/19 before this phase was added post-audit). Per the phase's own requirement contract, D-01..D-09 in `18-CONTEXT.md` serve as the requirements — all nine are covered above (see Observable Truths table) with runtime evidence, not just SUMMARY claims.

### Code Review Remediation Cross-Check

18-REVIEW.md reported 1 critical + 3 warnings + 2 info findings, with a remediation table claiming 5 fixed / 1 deferred. Each fix was independently re-verified against the current code (not the review's own claim):

| Finding | Review claim | Independent re-verification |
|---------|---------------|------------------------------|
| CR-01 (never-throw boundary on pre-18 registry shape) | Fixed via fail-soft destructuring default | Re-ran the exact reproduction (`{ SECTIONS: {}, TEMPLATES: {} }`) — confirmed no throw, spine loop falls back to real `BASE_SPINE`. |
| WR-01 (same-line trailing content false-empty) | Fixed by including open-line remainder in emptiness text | Re-ran `"<role> You are a helper.\n</role>"` — zero errors, matches doc's A2 parity claim. |
| WR-02 (hasClosedSection throws on truthy non-string) | Fixed via typeof guard | Read `src/schema.js:77` — typeof guard present; called `hasClosedSection(123, "role")` directly — returned `false`, no throw. |
| WR-03 (doc-sync blind to templates.js interpolated string) | Fixed by adding templates.js to doc-sync sources | Read `test/doc-sync.test.js:38-90` — `templatesSrc` is read and checked; new segments present. |
| IN-01 (stale README "two-line body spine") | Fixed, reworded | Read `README.md:97` (approx) — now reads "a body spine — an H1 title line plus a non-empty `<role>…</role>` section". |
| IN-02 (duplicated fence-loop) | Deliberately deferred as debt | Confirmed still duplicated (`src/schema.js:76-95` and `139-159`) — acceptable per reviewer's own scoping (structural refactor, not a correctness gap; D-08 exactly-one-error invariant still holds today since both copies are currently identical). Recorded as pre-existing tech debt, not a phase-18 gap. |

No discrepancies found between the review's remediation claims and the current codebase.

### Human Verification Required

None. This phase's goal (linter/schema/docs consistency) is fully machine-verifiable; all truths were confirmed by direct code execution, not visual/UX judgment.

### Gaps Summary

No gaps. All nine locked decisions (D-01..D-09) are implemented, wired, and behaviorally proven against the CURRENT post-remediation code — not merely present in the plan text or claimed by SUMMARY.md. The full test suite (211/211) is green, dogfood lint is clean, and the code-review remediation commits were independently re-verified rather than trusted at face value.

---

_Verified: 2026-07-03T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
