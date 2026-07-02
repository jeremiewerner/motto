# Architecture Research — v0.0.5 Skill Builder Integration

**Domain:** Integrating template mechanism + outputs/dependencies/allowed-tools validation + `build-skill` Agent Skill into Motto's existing 1,380-LOC ESM CLI
**Researched:** 2026-07-02
**Confidence:** HIGH (all findings cite actual current source, not speculation)

This is a **subsequent-milestone integration** research doc, not a greenfield domain survey. Every claim below is grounded in the real files: `src/schema.js`, `src/lint.js`, `src/build.js`, `test/dogfood.test.js`, `test/schema.test.js`, and the approved design spec `.planning/superpowers/specs/2026-07-02-skill-builder-design.md`.

## System Overview (current, unchanged by this milestone)

```
bin/motto.js  (CLI dispatch, no business logic)
     │
     ├── init.js ───────────────────────────────────────────── (untouched this milestone)
     │
     ├── lint.js ── lintProject(projectRoot)
     │     │   1. processConfig      → loadConfig (config.js)
     │     │   2. loadSharedRefs     → Set<string> of shared/references/*.md basenames
     │     │   3. discoverSkillNames → sorted skills/ dir listing
     │     │   4. processSkill(×N)   → parseFrontmatter (frontmatter.js)
     │     │                           + validateSkill (schema.js) ← PURE, no I/O
     │     └── aggregates {skill, message} errors, never throws
     │
     └── build.js ── buildProject(projectRoot)
           1. lintProject gate (fail fast, zero writes)
           2. re-read config + skill data from disk
           3. pre-pack checks (D3-07 collision, D3-12 private-contradiction)
           4. wipe dist/
           5. cp() each skill dir verbatim (verbatimSymlinks:true) + bundle shared refs
           6. emit plugin.json per bucket
```

`schema.js` is the one file with a hard, explicitly documented purity contract (`src/schema.js:1-11`): *"Pure object validator — no filesystem, no YAML parsing, no imports beyond this file's own scope."* Every integration decision below is constrained by keeping that sentence true.

## Q1 — Where does `src/templates.js` plug into `validateSkill`?

**Recommendation: extend `validateSkill`'s signature with a new parameter carrying template data, sourced from a new `src/templates.js` module that `schema.js` does NOT import.**

Current signature (`src/schema.js:74`):
```js
export function validateSkill(skill, sharedRefs = new Set())
```
131 tests across `test/schema.test.js` call this with either zero or one extra argument (`validateSkill(skill)` or `validateSkill(skill, new Set([...]))` — confirmed at `test/schema.test.js:23,192,216`, etc.). Any signature change **must** default the new parameter so all ~120 existing call sites keep compiling unchanged.

The design spec (§1) describes `src/templates.js` as pure data — `SECTIONS` (tag → description) and `TEMPLATES` (name → `{ requiredSections, ... }`). The natural instinct is `schema.js` does `import { TEMPLATES } from './templates.js'`, but that **violates the file's own documented invariant** ("no imports beyond this file's own scope") and — more importantly — breaks the existing architectural precedent: `schema.js` never imports sibling `src/*.js` modules; every piece of external context it needs (today: `sharedRefs`) is *injected as a parameter* by the caller (`lint.js`), which owns all I/O and cross-module wiring.

So: mirror the `sharedRefs` pattern exactly.

```js
// src/schema.js
export function validateSkill(skill, sharedRefs = new Set(), templates = {})
```

`lint.js` imports `TEMPLATES` from the new `src/templates.js` and passes it through at the one call site (`src/lint.js:159`):
```js
import { TEMPLATES } from './templates.js';
...
const schemaErrors = validateSkill({ dirName, data, body }, sharedRefs, TEMPLATES);
```

Inside `validateSkill`, template validation is a **new independent check block**, following the existing D-13 aggregation model already used for description/audience/body (`src/schema.js:110-156`):

- `data.template` absent → today's behavior exactly (design: "No `template:` → today's behavior exactly").
- `data.template` present, not a key in the `templates` map → one error listing available templates (never throw on `typeof data.template !== 'string'` — guard exactly like the NAME cascade does at `src/schema.js:87-91`).
- `data.template` present and known → look up `requiredSections` (array of tag names, e.g. `["process", "success_criteria"]`) and, for each, regex-test the body for a matching XML-tag-shaped section (`<process>` opening tag at minimum — presence-checked only, per design §2 "Presence-checked; content free"). Each missing section is its own independent error, not a cascade — consistent with how `shared_references` entries are checked independently today (`src/schema.js:158-175`).

This keeps `validateSkill` pure (no fs, no imports, still never-throw) while giving it the template registry as data, exactly like `sharedRefs` is data. `SECTIONS` (the description registry) is not needed at validation time — it's documentation/authoring-time metadata (the design notes it "doubles as doc source") — so it doesn't need to flow into `validateSkill` at all; only `TEMPLATES` does.

**Do not** create a second, separate "template validator" function/module called independently by `lint.js` and concatenated with `validateSkill`'s errors. That would fork the error-aggregation model (two arrays merged instead of one), duplicate the `{skill, message}` shaping logic, and create two places that both need the skill's `dirName`/`body`. A single `validateSkill` call with one more injected-data parameter is the smaller, more consistent change and matches D-13's stated aggregation philosophy ("all errors are collected together").

## Q2 — Outputs/dependencies validation needs filesystem context. Extend the `sharedRefs` pattern or new mechanism?

**Recommendation: extend the same pattern, but split by whether the check is a cheap precomputed Set (pure) or requires per-skill I/O (impure, stays in `lint.js`).**

Today, `lintProject` computes exactly one cross-cutting Set via I/O (`loadSharedRefs`, `src/lint.js:75-88`, called once at step 2, `src/lint.js:190`) and threads it through `processSkill` → `validateSkill` as a plain `Set<string>` for pure membership testing. This is the established, working pattern to copy.

The three new fields split cleanly into two buckets:

**Bucket A — pure membership test against an already-known Set (dependencies, allowed-tools):**
- `dependencies:` bare kebab names must exist in the project's `skills/` tree. `lintProject` already computes `skillNames` via `discoverSkillNames` (`src/lint.js:194`) *before* the per-skill loop — turning that array into a `Set<string>` costs zero extra I/O (it's already been read off disk). Pass it into `processSkill`/`validateSkill` exactly like `sharedRefs`: `validateSkill({ dirName, data, body }, sharedRefs, templates, allSkillNames)`.
  - Namespaced deps (`plugin:skill`) are format-checked only (design D-05) — no Set lookup needed, purely a string-shape regex, fully inside `validateSkill` already.
- `allowed-tools:` is a pure format check (non-empty, whitespace-free strings) — needs **no filesystem context at all**, it's entirely self-contained inside `validateSkill`, same tier as the existing `NAME_KEBAB`/description regex checks.

**Bucket B — requires per-skill file existence (outputs):**
- `outputs:` values are file paths "relative to skill dir; must exist" (design §3). This is fundamentally different from `sharedRefs`/`allSkillNames`: it is not one Set shared across all skills, it is a *per-skill* existence check requiring a `stat()` (or scoped `readdir`) call against that specific skill's own directory on disk — I/O that only `lint.js` (which already does all the project's file I/O) is allowed to perform.
- Split the check itself into two halves, consistent with how `shared_references` already separates "unsafe basename" (pure, `src/schema.js:166-169`) from "not found in the set" (Set lookup, `src/schema.js:171-173`):
  - **Path-safety** (no `..`, no leading `/`, no escape) — pure, stays fully inside `validateSkill`, no I/O needed, same shape as the existing safe-basename check for `shared_references`.
  - **Existence** — `lint.js`'s `processSkill` (`src/lint.js:135-165`), which already does inline I/O-error-pushing for the "missing SKILL.md" case (`src/lint.js:142-148`), does one `stat()` per declared `outputs` entry *before or after* calling `validateSkill`, and pushes `{skill: dirName, message: "outputs entry '<name>' file '<path>' not found"}` directly to the shared `errors` array on failure — the exact same pattern already used for the missing-SKILL.md check, not routed through `validateSkill` at all.

**Signature note:** rather than growing `validateSkill(skill, sharedRefs, templates, allSkillNames, ...)` into an unbounded positional-parameter list as more context Sets get added over time, bundle the non-`sharedRefs` context into one options object from the start:
```js
validateSkill(skill, sharedRefs = new Set(), context = {})
// context: { templates: {}, allSkillNames: new Set() }
```
This is a one-time signature decision (Q1 and Q2 land in the *same* PR/phase for exactly this reason — see build order below) that avoids a second signature churn later when the evolution-ledger items (multi-template arrays, new action tags) need their own data. `sharedRefs` stays a positional parameter, unchanged, to avoid touching ~120 existing test call sites that pass it positionally today.

## Q3 — Does `build.js` need ANY change?

**Finding: no, `build.js` requires zero code changes for outputs/dependencies/allowed-tools, and this should be treated as a load-bearing architectural fact, not an assumption.**

Reasoning, cited against the actual code:

1. **Outputs files are already covered by verbatim copy.** Step 5 of `buildProject` (`src/build.js:157-167`) does `cp(skillsDir/<name>, dstSkillDir, { recursive: true, verbatimSymlinks: true })` — the *entire* skill source directory, unconditionally. Since design §3 defines `outputs:` paths as "relative to skill dir" and lint has already gated on their existence (`buildProject`'s Step 1 lint gate, `src/build.js:92-95`, runs *before* any dist/ write), any file an `outputs:` entry points at is, by construction, already inside the tree that gets copied. No new `cp()` call, no new loop.

2. **`loadSkillData` (`src/build.js:56-71`) does not need to read `outputs` or `dependencies` at all.** It currently extracts only `audience` and `sharedRefs` — the two fields `buildProject` actually needs to *route* the copy (which bucket) and *supplement* it (bundle shared refs). `outputs`/`dependencies`/`allowed-tools` are pass-through frontmatter that verbatim-copies with the rest of `SKILL.md` — `build.js` never needs to parse or act on them.

3. **`dependencies:` explicitly does not trigger any build-time bundling.** PROJECT.md's Out-of-Scope list is explicit: *"MCP-dependency resolution — `dependencies` is linted as present but not resolved at build."* Design D-05 confirms: *"`dependencies:` resolve in-tree"* is a **lint**-time statement (does the named sibling skill exist?), not a build-time one. Each dependent skill continues to be built/packaged independently; `build.js` does not need to co-locate or bundle a skill with its declared dependencies.

4. **Collision edge case — already covered by the existing D3-07 guard, but worth an explicit regression test.** The existing collision check (`src/build.js:116-131`) detects when a declared `shared_reference` name collides with a same-named file already present in the skill's own source `references/` directory. Because that check operates on *file paths in the source tree*, not on *how the file got there*, it transitively already catches the case where an `outputs:` entry happens to declare a file at `references/<ref>.md` that matches a `shared_references` name — the shared-ref bundling step (`src/build.js:169-181`) writing over an output file. **Recommendation for the roadmap:** add one dogfood/build test asserting this specific interaction (an `outputs:` path colliding with a `shared_references` basename) rather than assuming it — the current test suite has no fixture that exercises `outputs:` yet, so the transitive coverage claim above is a code-reading inference, not yet a verified regression guard.

**Net effect:** this is a genuine scope-reduction finding for the roadmap — one of the milestone's four mechanisms (build packaging) needs *zero* implementation work, only one new test case. Phases can be planned without a "wire outputs into build.js" task.

## Q4 — `build-skill` is a markdown skill in `skills/`. Impact on dogfood tests and dist.

**Finding: `build-skill` replaces `author-skill` 1:1 in the skills tree (skill count stays 2), but every hardcoded `author-skill` path assertion in `test/dogfood.test.js` must be renamed, and this dogfood test becomes the mechanism's own end-to-end regression guard.**

Current dogfood surface (`test/dogfood.test.js`):
- `lintProject(REPO_ROOT)` asserts `result.count === 2` (line 42) — today's 2 skills are `author-skill` (public) + `release` (private). Design retires `author-skill` and adds `build-skill` (public) — count stays **2**, so the count assertion itself is untouched, but the *skill names* backing it change.
- Hardcoded path assertions that must be renamed `author-skill` → `build-skill`:
  - `'dist/public/author-skill/SKILL.md exists'` (line 92-93)
  - `'author-skill has references/skill-schema.md bundled'` (line 98-100) — this one is not a cosmetic rename only: design §4 states `build-skill` bundles `skill-schema.md` as its own shared reference (*"teaching content already in `skill-schema.md` (bundled as build-skill shared ref)"*), so this assertion's *meaning* carries forward unchanged, only the skill name changes.
  - `release` assertions (lines 103-137) are untouched — `release` is not part of this milestone.
- `test/schema.test.js` and other unit tests do not reference `author-skill` by name (confirmed via repo-wide grep) — only `dogfood.test.js` has hardcoded skill-name path strings; the blast radius is contained to one file at the test layer.

**New coverage this dogfood test should gain (not just renames):**
- `build-skill` is declared `template: procedure` (design §4) — its `SKILL.md` body must carry `<process>` and `<success_criteria>` sections. Once template validation ships (Q1), `lintProject(REPO_ROOT)` passing becomes the **live, continuously-verified proof that the template mechanism works against a real skill** — design explicitly frames this as the point ("closes TMPL-01 with real consumer... the ultimate test is Motto building its own kind," design §4, line 73). No new test code is strictly required for this — the existing `lintProject(REPO_ROOT)` assertion (line 36-44) already exercises it — but it's worth calling out as a design property, not an accident: if `build-skill`'s SKILL.md ever drifts out of template compliance, the dogfood suite fails immediately.
- If `build-skill` also declares `outputs:`, `dependencies:`, or `allowed-tools:` in its own frontmatter (plausible, since it self-verifies via `motto lint` per the design's flow description), the dogfood suite dogfoods those new validators too, for free, via the same mechanism.

**Wider blast radius outside `dogfood.test.js` (found via repo-wide grep, flagged for roadmap scoping, not architecture per se):** `README.md` has 6+ prose/example references to `author-skill` (skill table, slash-command examples, tree diagrams, zip one-liner example) that will go stale once the skill is retired. This is a docs-consistency task, not a code-architecture integration point, but should be sequenced into the same phase that retires `author-skill` so the repo doesn't carry a stale README between commits.

**Sequencing implication:** because the milestone requirement text pairs the two ("`build-skill` Agent Skill... `author-skill` retired... closes AUTH-SKILL" — PROJECT.md lines 27-28), and because `dogfood.test.js`'s `count === 2` assertion would go transiently to 3 (or the suite would otherwise be red) if the add and the retire land in separate commits without care, the safest integration is one atomic change: add `skills/build-skill/`, delete `skills/author-skill/`, update `dogfood.test.js` assertions and README references, all in the same commit — mirroring exactly how the prior `setup-project` retirement was executed in v0.0.4 (`.planning/milestones/v0.0.4-phases/12-docs-cleanup/12-02-PLAN.md`: *"Stage both the deletion and the test edits together, then create a single commit"*). That is an established, already-proven pattern in this repo for skill retirement — reuse it verbatim.

## Q5 — Suggested build order across phases

Four mechanisms, three of which touch `validateSkill`'s signature and one of which (build.js) needs nothing. Sequencing is driven by two constraints: (a) `validateSkill`'s signature should change **once**, not three times, to avoid rewriting ~120 existing test call sites repeatedly; (b) `build-skill` is explicitly the design's *proof* that the mechanism works, so it must land **after** the mechanism exists, not alongside it.

**Phase 1 — Template mechanism (TMPL-01 core).**
`src/templates.js` (SECTIONS + TEMPLATES data, per design §1) + the `validateSkill` signature change (Q1) landing together with the outputs/dependencies/allowed-tools signature needs (Q2) in **one** combined `context` parameter (see Q2's signature note) — even though outputs/deps/tools validation logic itself can be a separate task, decide and land the *final* signature shape here so it only changes once. `lint.js` wiring: import `TEMPLATES`, pass through `processSkill`. Pure unit tests in `schema.test.js` (no fixtures needed yet — no real skill uses `template:` until Phase 3). Adversarial malformed-input tests mandatory here (standing never-throw invariant: unknown `template` value types, non-array `requiredSections`, etc.).

**Phase 2 — New validated optional fields (outputs/dependencies/allowed-tools).**
Layered onto the signature locked in Phase 1. Bucket A (dependencies, allowed-tools) is pure `validateSkill` logic + `lintProject` computing `allSkillNames` from the already-discovered `skillNames` array (zero new I/O). Bucket B (outputs existence) is `lint.js`'s `processSkill` doing the `stat()` calls, mirroring the existing missing-SKILL.md pattern. Can run in parallel with Phase 1 in principle (different check logic) but should merge into the same signature-landing commit/phase to satisfy constraint (a) above — recommend treating Phase 1+2 as one phase with two plan-tasks rather than two sequential phases, unless team capacity favors splitting.

**Phase 3 — `build-skill` Agent Skill + `author-skill` retirement (dogfood proof).**
Depends on Phase 1+2 being fully shipped and tested — this is the "real consumer" the design insists template validation be designed against (D-01), and it's also the acceptance test for outputs/dependencies/allowed-tools if `build-skill` itself declares any. Single atomic commit per the established retirement pattern (Q4): add `skills/build-skill/SKILL.md` (`template: procedure`, shared ref `skill-schema.md`), delete `skills/author-skill/`, update `test/dogfood.test.js` path assertions + add template-mechanism regression coverage, update `README.md` references. `skill-schema.md` updated in place (design §5) to document the three new fields + template mechanism as the single canonical rules doc.

**Phase 4 (optional, can fold into Phase 3) — build.js verification test only.**
Per Q3, no `build.js` code changes are needed, but add the one missing regression test: an `outputs:` path colliding with a `shared_references` basename, confirming the existing D3-07 collision guard (`src/build.js:116-131`) fires transitively for the new field. This is cheap enough to fold into Phase 3's test-writing work rather than standing alone.

**Explicitly not a phase-ordering concern:** `build.js` itself. Because Q3 establishes it needs no code changes, it should not appear as a roadmap phase/task at all beyond the one test case above — including it as a separate phase would overstate the milestone's actual surface area.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Importing `templates.js` into `schema.js`
**What people might do:** `import { TEMPLATES } from './templates.js'` directly inside `schema.js` since it's "just data."
**Why it's wrong:** Breaks `schema.js`'s explicit, documented contract ("no imports beyond this file's own scope," `src/schema.js:4`) and breaks the established architecture where all cross-module wiring lives in `lint.js`, not `schema.js`. It also makes `schema.js` untestable in isolation from `templates.js`'s existence — every existing `schema.test.js` call site constructs its own fixtures inline with zero imports beyond `schema.js` and `node:assert`.
**Instead:** Inject as a parameter, exactly like `sharedRefs` today.

### Anti-Pattern 2: Doing `stat()` calls inside `validateSkill` for `outputs:` existence
**What people might do:** Since `outputs:` needs filesystem existence checks, reach for `fs.stat` inside `schema.js` directly — it's convenient, the path is right there.
**Why it's wrong:** Violates "no filesystem" (`src/schema.js:4`) and the never-throw invariant becomes much harder to guarantee once real I/O (which can fail in more ways than pure logic) enters a function 131 tests assume is synchronous and side-effect-free. It would also make `validateSkill` async, breaking every existing synchronous call site in `schema.test.js`.
**Instead:** `lint.js`'s `processSkill` (already async, already does I/O, already has the missing-SKILL.md precedent at `src/lint.js:142-148`) performs the stat and pushes the error directly.

### Anti-Pattern 3: Splitting author-skill retirement and build-skill addition across two commits
**What people might do:** Land `build-skill` first (skill count transiently 3), then retire `author-skill` in a follow-up commit (back to 2), treating them as independently reviewable changes.
**Why it's wrong:** `dogfood.test.js`'s hardcoded count/path assertions (`result.count === 2`, `skillCount === 2`) would be red on `main` between the two commits, and this repo has already hit this exact failure mode once — the v0.0.2 milestone integration doc (`.planning/v0.0.2-MILESTONE-INTEGRATION.md:36`) records a near-miss where a skill rename happened after the dogfood test was written with hardcoded `stat()` paths.
**Instead:** One atomic commit, matching the proven `setup-project` retirement pattern from v0.0.4 Phase 12.

## Sources

- `src/schema.js` (read in full, 178 lines) — `validateSkill` signature, purity contract, D-13 error-aggregation model.
- `src/lint.js` (read in full, 207 lines) — `lintProject` orchestration, `processConfig`/`loadSharedRefs`/`discoverSkillNames`/`processSkill` decomposition, the `sharedRefs`-as-parameter pattern.
- `src/build.js` (read in full, 214 lines) — `buildProject` steps, verbatim `cp()`, D3-07 collision check, D3-12 private-contradiction check.
- `test/dogfood.test.js` (read in full, 138 lines) — current `author-skill`/`release` assertions, count/skillCount/bucketCount invariants.
- `test/schema.test.js` (grepped for all `validateSkill(...)` call sites) — confirms ~120 call sites use zero or one extra argument, constraining any signature change to default new parameters.
- `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` — approved design spec, decisions D-01 through D-08, evolution ledger.
- `.planning/PROJECT.md` — v0.0.5 milestone scope, requirements, Out-of-Scope list (MCP-dependency resolution not build-resolved).
- `.planning/milestones/v0.0.4-phases/12-docs-cleanup/12-02-PLAN.md` — the proven atomic-retirement pattern for a `skills/` entry (`setup-project`), reused as precedent for `author-skill` retirement.
- `.planning/v0.0.2-MILESTONE-INTEGRATION.md:36` — recorded near-miss of a skill rename landing after `dogfood.test.js` was written with hardcoded paths, motivating the atomic-commit recommendation.
- Repo-wide `grep -rn "author-skill"` across `.js`/`.json`/`.md` — established the full blast radius (test file + README + skill dir), confirming no other `src/*.js` or unit test files reference it by name.

---
*Architecture research for: Motto v0.0.5 Skill Builder milestone — integration of template mechanism, outputs/dependencies/allowed-tools validation, and build-skill Agent Skill into existing codebase*
*Researched: 2026-07-02*
