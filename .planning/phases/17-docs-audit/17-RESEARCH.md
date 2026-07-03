# Phase 17: Docs Audit - Research

**Researched:** 2026-07-03
**Domain:** Internal documentation accuracy audit (no new libraries, no mechanism changes) — verifying two canonical docs (`shared/references/skill-schema.md`, `README.md`) against the live validator source (`src/schema.js`, `src/templates.js`, `src/lint.js`), plus one small `node:test` doc-sync guard.
**Confidence:** HIGH — every claim below is either read directly from the live source files in this repo or from the test suite that already exercises them (194/194 passing at research time). No external library research was needed; this phase has no new dependencies and no unknowns outside this repo's own source tree.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**skill-schema.md rewrite (DOC-07)**
- **D-01: Surgical patch, not restructure** — keep the existing 7-section structure (§1–§5 and §7 verified current at discussion time). Replace §6's false "template/dependencies are NOT validated" claim with the real template cascade rules; add new sections for `outputs` and `allowed-tools`; update the header. Smallest reviewable diff.
- **D-02: Keep exact lint error strings** — the doc's role is canonical rule source ("all claims derived from src/schema.js"); exact error tables enable grep-the-message debugging. DOC-06 protects build-skill's prose, not this reference — this is the ONE doc whose job is to quote the linter.
- **D-03: Doc-sync test guards drift** — add a small `node:test` asserting the error strings quoted in `skill-schema.md` match `src/schema.js` (and lint.js-layer messages where quoted), so drift breaks the suite at commit time via the existing husky gate. No new dependencies. This mechanizes the sync-risk that killed author-skill.

**Version header policy**
- **D-04: No version number in the header** — replace "v0.0.2" with a source citation: derived from `src/schema.js`, verified against the linter in this repo. The doc-sync test is the freshness guarantee; a version number is itself a manual-sync surface (the stale v0.0.2 header proved it). Do not pin to package.json or milestone.

**build-skill Step 2 cleanup**
- **D-05: Remove both the supersede statement and the field delta** from `skills/build-skill/SKILL.md` Step 2 — it becomes "read the bundled skill-schema reference" with no delta and no supersede clause. Single source of truth once the reference is current. Re-lint + full suite green required after the edit (16-02 precedent: build-skill prose edits are cheap and safe). DOC-06 grep checks (`letter-start kebab-case`, `Common Lint Errors` → 0 matches) must still hold.

**README build-skill flow (DOC-06 SC3)**
- **D-06: Rewrite "Author a skill" around build-skill's real flow** — hand it ANY input (spec, notes, transcript) → gap-fills missing slots in one batch → writes → lints until clean → quality gate → compact receipt. A mechanical name swap would describe author-skill's old interview behavior under a new name. All 8 author-skill reference sites go (lines ~95, 143, 203, 254, 267, 270, 275, 278 at discussion time).
- **D-07: `build-skill` is the sample skill name** in the install/symlink/zip examples and the skills table — it actually exists in `dist/public/` after `motto build`, so every example command stays copy-paste runnable against this repo. The skills table row for author-skill becomes a build-skill row.

### Claude's Discretion
- Exact prose wording of the new schema-doc sections (structure fixed above: rule statement, YAML example, error table — matching §1–§5 house style).
- Doc-sync test implementation shape (which side is source of truth for the assertion, how strings are extracted) — planner decides; constraint is only "drift breaks the suite, no new deps".
- Exact README section ordering/length for the rewritten flow; keep the existing Contents/anchors structure working.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-06 | `skill-schema.md` rewritten current (version header, template/outputs/dependencies/allowed-tools sections); build-skill prose contains no duplicated lint strings/regexes | Full validator catalog below (§ Validator Ground Truth Catalog) gives every field's exact cascade + verbatim error strings + owning layer, ready to transcribe into the new §6/§8/§9 sections. build-skill Step 2 audit (§ build-skill Step 2 Cleanup Detail) pinpoints exactly what D-05 must delete and what DOC-06's grep invariants require. |
| DOC-07 | README updated — author-skill references removed, build-skill flow documented | § README Audit — Author-Skill Reference Sites gives all 8 sites with current line numbers, exact current text, and what each becomes. § Anchor Stability confirms the Contents/anchor structure survives the rewrite. |
</phase_requirements>

## Summary

This phase touches exactly three files with code/doc content (`shared/references/skill-schema.md`, `README.md`, `skills/build-skill/SKILL.md`) plus one new test file — no changes to `src/schema.js`, `src/templates.js`, or `src/lint.js` themselves. The validator source is stable and fully read for this research: `src/schema.js` (460 lines), `src/templates.js` (29 lines), `src/lint.js` (357 lines), `src/frontmatter.js` (135 lines). All 194 existing tests pass, confirming the cascade behavior documented below is what's actually live in the repo today (2026-07-03).

Two concrete drift findings against the *existing* skill-schema.md (beyond the already-known §6 falsehood):
1. **§2 `description` is missing the non-string-value error** (`description must be a string (got <typeof>)`) — present in `src/schema.js` (line 244-246) but absent from the doc's §2 lint-error list.
2. **§4 Body Spine doesn't mention template `waives`** — the Title/Role checks are now conditionally skippable when a template's `waives` array includes `"title"`/`"role"`. §4 is not literally wrong (the checks it documents are unchanged), but a rewritten §6 that introduces `template:` must cross-reference this waiving behavior so a reader of §4 alone isn't misled into thinking it's unconditional.

Everything else in §1, §3, §5, §7 is verified byte-accurate against the live source — no other drift found.

**Primary recommendation:** Treat `src/schema.js` + `src/lint.js` as the sole source of truth; transcribe the Validator Ground Truth Catalog below directly into skill-schema.md's rewritten §2 (fix), new §6 (template — replacing the false claim), new §7 (outputs), new §8 (dependencies), new §9 (allowed-tools), renumbering the current §7 (Frontmatter Envelope) to §10. For the doc-sync test, prefer deriving expected strings from the SOURCE FILES (not from re-invoking `validateSkill`) as the default recommendation for this project's YAGNI-sized "small `node:test`" ask — see § Doc-Sync Test Design for the full tradeoff analysis and a lower-effort alternative.

## Architectural Responsibility Map

Motto has no browser/frontend tiers — this is a CLI + docs + test project. The tiers relevant to this phase:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Rule enforcement (validation logic) | `src/schema.js` (pure validator) | `src/lint.js` (fs-dependent half) | schema.js owns all lexical/shape rules; lint.js owns only existence/symlink-escape checks that require disk access. Neither is touched this phase. |
| Rule *documentation* (human-readable mirror) | `shared/references/skill-schema.md` | — | This phase's primary deliverable — must mirror the above without re-implementing it. |
| Drift prevention | `test/*.test.js` (node:test) | husky pre-commit hook | New doc-sync test lives here; husky already runs `npm test` (→ `node --test`) on every commit — no new CI wiring needed. |
| Project onboarding narrative | `README.md` | — | Second doc deliverable — human-facing flow narrative, not a rule mirror (must NOT duplicate lint strings per DOC-06). |
| Agent behavioral instructions | `skills/build-skill/SKILL.md` | `shared/references/skill-schema.md` (bundled ref) | build-skill's prose currently carries a stopgap "delta" over the stale bundled reference (Phase 16 decision); D-05 removes that delta now that the reference itself is current. |

**Sanity check for the planner:** No task in this phase should touch `src/schema.js`, `src/templates.js`, or `src/lint.js`. If a plan task proposes editing those files, it is out of phase boundary — Phase 14/15 already delivered and locked that mechanism; Phase 17 is docs-only plus one test file.

## Standard Stack

### Core
No new libraries. This phase uses only what's already installed:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | stdlib (Node ≥20; repo runs v24.14.1) | Doc-sync test runner | Already the project's only test runner (`node --test`); zero-config, zero-dependency, matches `test/dogfood.test.js`'s existing house style exactly. |
| `node:fs/promises` (or `node:fs` sync) | stdlib | Read `src/schema.js`, `src/lint.js`, `shared/references/skill-schema.md` as raw text for the doc-sync assertion | Already used throughout `src/lint.js` and the test suite. No new import surface. |
| `node:assert/strict` | stdlib | Assertions in the new test | Same pattern as every existing test file. |

### Supporting
None — no YAML parsing, no markdown parsing needed for the doc-sync test (plain string/regex operations on two files' raw text are sufficient, matching the project's "manual validation over frameworks" philosophy per CLAUDE.md's Alternatives Considered table).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain string/regex extraction for doc-sync assertion | A markdown AST parser (e.g. `remark`) to locate error-table cells precisely | Adds a dependency for a one-off text-matching need; violates CLAUDE.md's "single runtime dependency" constraint. Rejected. |
| Reading `src/schema.js` as raw text | `import` schema.js and reflect on `validateSkill.toString()` | Functionally near-identical (both end up regex-scanning source text as a string) — `readFile` is simpler and doesn't risk Node stripping comments/whitespace during `Function.prototype.toString()` reconstruction. Prefer `readFile`. |

**Installation:** None required — no new packages.

**Version verification:** N/A — no packages added this phase. Confirmed via `npm ls yaml` that the sole existing runtime dependency is unchanged: `yaml@2.9.0` (matches CLAUDE.md's documented stack).

## Package Legitimacy Audit

**Not applicable this phase.** No new packages are installed by any task in Phase 17 — this is a documentation-and-test-only phase using exclusively Node stdlib (`node:test`, `node:fs`, `node:assert`) already present in every other test file in the repo.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### Doc-Rewrite Data Flow

```
src/templates.js (SECTIONS/TEMPLATES registry — pure data)
        │
        ▼
src/schema.js (validateSkill — pure cascade logic, emits error strings)
        │
        ├──────────────────────────────┐
        ▼                              ▼
src/lint.js (checkOutputsFs —    shared/references/skill-schema.md
  fs-dependent existence/          (human-readable mirror of the
  symlink-escape checks,            above — THIS PHASE rewrites
  emits its own error strings)      this to match reality)
        │                              │
        │                              ▼
        │                    test/doc-sync.test.js (NEW —
        │                      reads schema.js/lint.js source
        │                      text + skill-schema.md text,
        │                      asserts static string segments
        │                      appear in the doc)
        │                              │
        └──────────────┬───────────────┘
                        ▼
           husky pre-commit → `npm test` → `node --test`
           (existing gate; doc-sync test rides it for free)


skills/build-skill/SKILL.md Step 2
        │  (currently carries a "supersede" delta over the
        │   stale bundled reference — Phase 16 stopgap)
        ▼
   D-05: delete the delta once skill-schema.md (above) is current
        │
        ▼
   shared_references: [skill-schema]  ← build-skill still bundles
        the SAME file it now trusts without a delta clause


README.md "Author a skill" section (8 author-skill sites)
        │
        ▼
   D-06/D-07 rewrite around build-skill's real flow;
   build-skill is the sample name in every runnable example
   (it actually exists in dist/public/ after `motto build`)
```

### Recommended Project Structure (unchanged — no new directories)
```
shared/references/
└── skill-schema.md      # rewritten this phase (§1-§10 after renumbering)
README.md                # rewritten this phase (§3 "Author a skill" + 7 other sites)
skills/build-skill/
└── SKILL.md              # Step 2 simplified this phase (D-05)
test/
└── doc-sync.test.js      # NEW this phase — the only new file
```

### Pattern: Doc-sync test house style (from `test/dogfood.test.js`)
**What:** The existing `test/dogfood.test.js` establishes the repo's pattern for "assert the real tree matches an invariant": anchor `REPO_ROOT` via `import.meta.url` (never `process.cwd()`), read real files from the repo (not fixtures), assert against them with plain `node:assert/strict`.
**When to use:** Directly reusable for the new doc-sync test — same anchoring pattern, same "read real repo files" approach, same `describe`/`it` shape.
**Example:**
```javascript
// Source: test/dogfood.test.js (this repo, lines 1-17)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```

### Anti-Patterns to Avoid
- **Re-implementing validation logic inside the doc-sync test:** the test must only read/compare text — never re-derive a NEW copy of the cascade rules to check against (that would itself become a second, divergeable source of truth, the exact anti-pattern D-03 is designed to kill).
- **Full-string equality assertions against dynamically interpolated messages:** many error strings contain `${typeof x}`, `${N}`, `${quoted value}` — a test asserting exact string equality against one hard-coded rendered example is brittle for the WRONG reason (fixture-value churn, not drift). Match on the STATIC (non-interpolated) segments only.

## Validator Ground Truth Catalog

This is the exhaustive, source-verified catalog the rewritten `skill-schema.md` must document. Every message below is copied **verbatim** from the live source (with `${...}` left as literal placeholders exactly as they appear in the template literal, matching the existing doc's own placeholder-token style, e.g. `"X"`, `N`, `<typeof>`). Confidence for every entry: **[VERIFIED: src/schema.js and src/lint.js, read directly, 2026-07-03; cross-checked against 194 passing tests in test/schema.test.js and test/lint.test.js]**.

### `name` field (§1 — CURRENT, no drift found)
Cascade stops at first failure. Layer: `src/schema.js` only.

| Step | Check | Verbatim error message | Layer |
|------|-------|------------------------|-------|
| 1 | missing/falsy | `name is required` | schema.js:212 |
| 2 | non-string truthy | `` name must be a string (got ${typeof name}) `` | schema.js:217 |
| 3 | fails `NAME_KEBAB` | `` name must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/): "${name}" `` | schema.js:220-222 |
| 4 | > 64 chars | `` name must not exceed 64 characters (got ${name.length}): "${name}" `` | schema.js:225 |
| 5 | contains `anthropic`/`claude` substring | `` name must not contain the reserved substrings "anthropic" or "claude": "${name}" `` | schema.js:228-230 |
| 6 | ≠ folder name | `` name "${name}" must equal its folder name "${dirName}" `` | schema.js:233 |

Doc's §1 table already matches this exactly — **no change needed**, confirmed no drift.

### `description` field (§2 — ONE DRIFT FOUND: missing non-string error)
All checks independent except the two length/XML checks which are gated behind the type-guard. Layer: `src/schema.js` only.

| Check | Verbatim error message | Layer | In current doc? |
|-------|------------------------|-------|------------------|
| missing/falsy | `description is required` | schema.js:238 | Yes |
| **non-string truthy value** | `` description must be a string (got ${Array.isArray(data.description) ? "array" : typeof data.description}) `` | schema.js:244-246 | **NO — MISSING, must add** |
| > 1024 chars | `` description must not exceed 1024 characters (got ${data.description.length}) `` | schema.js:252-254 | Yes |
| contains XML-tag shape (regex `/<\/?[a-zA-Z][a-zA-Z0-9-]*\s*\/?>/`) | `description must not contain XML tags (e.g. <example>)` | schema.js:263 | Yes |

**Drift detail:** the "must be a string" check has a special case — Arrays render as the literal word `"array"`, everything else (`number`, `boolean`, `object` for non-array objects) renders via `typeof`. This differs subtly from the NAME field's non-string message (which has no array special-case, since `typeof []` is just `"object"` there too — NAME never special-cases array). Document this array-special-case explicitly; it's easy to transcribe wrong.

### `audience` field (§3 — CURRENT, no drift found)
Single combined check (missing AND invalid both produce the same message). Layer: `src/schema.js` only.

| Check | Verbatim error message | Layer |
|-------|------------------------|-------|
| not exactly `"public"` or `"private"` (covers missing too) | `audience must be public|private` | schema.js:270 |

Doc's §3 matches exactly — no change needed.

### Body Spine — Title + Role (§4 — CURRENT but needs a cross-reference note)
Two independent checks. **NEW as of Phase 14:** both are individually skippable when the resolved template's `waives` set contains `"title"` / `"role"` respectively — this gating happens BEFORE these checks run (schema.js:283-329, comment: "Must run and resolve `waivedSections`... BEFORE the Title/Role checks below so waives can gate them"). Layer: `src/schema.js` only.

| Check | Verbatim error message | Waivable by template? | Layer |
|-------|------------------------|------------------------|-------|
| first non-blank line ≠ `/^# \S/` | `body must begin with an H1 title line (# Title) as its first non-blank line` | Yes — waived if `waivedSections.has("title")` | schema.js:317 |
| no line matches `/^\*\*Role:/m` | `body must contain a **Role:** line` | Yes — waived if `waivedSections.has("role")` | schema.js:327 |

**No template ships `waives: ["title"]` or `["role"]` today** — the shipped `procedure` template in `src/templates.js` waives nothing (comment on line 27: `// future keys: requiredFields, waives ("title" | "role")`). The mechanism exists (exercised only via an injected test fixture in `test/schema.test.js`, never live), but no shipped template uses it yet. **Recommendation:** add one sentence to §4 noting this waivability exists and is controlled by the (currently-inert) `waives` key in the future §6 rewrite, so a reader doesn't need to reverse-engineer the interaction from two different doc sections.

### `shared_references` field (§5 — CURRENT, no drift found)
Layer: `src/schema.js` (validation) + `src/lint.js`/`build.js` (bundling behavior, not lint-time validated further).

| Check | Verbatim error message | Layer |
|-------|------------------------|-------|
| entry contains `/` or `.` | `` shared_references entry "${entry}" is an unsafe basename (must not contain "/" or ".") `` | schema.js:342 |
| safe basename not found in the `Set` of available basenames | `` shared_references entry "${entry}" not found in shared/references/ `` | schema.js:346 |

Doc's §5 matches exactly — no change needed.

### `template` field (NEW §6 content — replaces the false "NOT validated" claim entirely)
Own internal cascade: non-string → stop; unknown name → stop; else check each `requiredSections` entry (independent — all run, all report). Gate: `Object.prototype.hasOwnProperty.call(data, "template")` — **truly absent key skips ALL template checks** (TMPL-05 regression guard: identical behavior to pre-template-mechanism code). An explicitly-present-but-falsy value (`template: ""`, `template: null`) is NOT silently skipped — it errors. Layer: `src/schema.js` only (uses `hasClosedSection` helper, also in schema.js).

| Step | Check | Verbatim error message | Layer |
|------|-------|------------------------|-------|
| 1 | key present, `typeof tpl !== "string"` | `` template must be a string (got ${typeof tpl}) `` | schema.js:292 |
| 2 | key present, string, not a key in `TEMPLATES` registry (includes `""` — empty string is "unknown", never silently skipped) | `` unknown template "${tpl}" (available: ${available}) `` where `available` = `Object.keys(TPL).sort().join(", ")` | schema.js:295 |
| 3 (per missing required section) | template known, body lacks a matched `<section>...</section>` pair per `hasClosedSection()` | `` template "${tpl}" requires <${section}>…</${section}> section — ${SEC[section] ?? ""} `` | schema.js:302-304 |

**Current registry (`src/templates.js`, pure data, no code needed to add a template):**
```javascript
export const SECTIONS = {
  process: "Numbered steps the agent executes, in order.",
  success_criteria: "Checkable conditions that define done.",
};

export const TEMPLATES = {
  procedure: {
    requiredSections: ["process", "success_criteria"],
    // future keys: requiredFields, waives ("title" | "role") — mechanism exists,
    // no shipped template uses `waives` yet.
  },
};
```
So today: `unknown template "X" (available: procedure)` is the only possible "available" list (one entry).

**`hasClosedSection(body, tagName)` semantics (must document — this is genuinely non-obvious):**
- Section tags must be **line-start anchored**: `^<process>` / `^</process>` (multiline regex) — a tag mentioned mid-sentence never counts.
- **Fenced code blocks are excluded from scanning entirely** — both the fence-detection itself and any tag-like text inside an open fence are ignored. Fence detection matches CommonMark-style fences: 3+ backticks or 3+ tildes, up to 3 leading spaces; a fence only closes on a later line with the SAME character and length ≥ the opener's.
- **No end-of-line anchor on the OPEN tag** — `<process> some trailing text` still counts as opening the section (only the close tag doc anchors strictly at line start with nothing else required after it).
- A section is "closed" only if BOTH an open and a matching close tag exist, in that ORDER (open index < close index) — not merely both present anywhere.
- Bare tags only — no attributes (`<process foo="bar">` does not count).

### `outputs` field (NEW §7 — split across two layers, must document both)
Gate: `Object.prototype.hasOwnProperty.call(data, "outputs")`. Empty map `{}` is a valid no-op (zero errors) — a coherent "no outputs" declaration.

**Layer 1 — schema.js (lexical, pure, no fs access):**

| Check | Verbatim error message | Layer |
|-------|------------------------|-------|
| `outputs` present but `null`/non-object/array | `` outputs must be a map of name -> file (got ${Array.isArray(outputs) ? "array" : typeof outputs}) `` | schema.js:363 |
| per-entry: value not a non-empty string | `` outputs.${key} must be a non-empty string path (got ${typeof value}) `` | schema.js:368 |
| per-entry: value fails `isOutputPathLexicallySafe()` (absolute path, or normalizes to `..` / starts with `..` + separator) | `` outputs.${key} path "${value}" is unsafe (must not be absolute or contain ".." traversal) `` | schema.js:373 |

`isOutputPathLexicallySafe(entry)` is **root-independent by construction** — it never calls `resolve()` and takes no base-directory argument, so its verdict cannot vary with `process.cwd()` (fixed a real bug in an earlier two-argument shape — see schema.js:113-125 comment). `normalize()` also collapses interior traversal, so `"a/../../x"` → `"../x"` is caught even though it doesn't literally start with `..` in its original form.

**Layer 2 — lint.js `checkOutputsFs` (fs-dependent, only runs for entries schema.js already deemed lexically safe — never double-reports):**

| Check | Verbatim error message | Layer |
|-------|------------------------|-------|
| `stat()` throws (file doesn't exist) | `` outputs.${key} file "${value}" does not exist `` | lint.js:209 |
| target exists but `!stats.isFile()` (a directory, including `"."` itself) | `` outputs.${key} "${value}" is not a file `` | lint.js:217 |
| symlink escape: `realpath()` of target, relative to `realpath()` of skill dir, escapes containment | `` outputs.${key} file "${value}" escapes the skill directory via symlink `` | lint.js:232-233 |
| `realpath()` itself throws (e.g. race/permission) | `` outputs.${key} file "${value}" could not be resolved: ${e.message} `` | lint.js:238 |

**`{var}` convention note (must carry into the doc, per 15-CONTEXT D-decision):** the existence check is **literal** — no `{var}` special-casing. A path VALUE containing `{var}` fails the existence check naturally because no such literal file exists. `{var}`-style placeholders are an authoring convention that belongs inside a declared output file's own CONTENT, never inside the `outputs:` path string itself.

### `dependencies` field (NEW §8 — per-entry independent cascade, ordering matters)
Gate: `Object.prototype.hasOwnProperty.call(data, "dependencies")`. Empty array `[]` is a valid no-op.

| Check | Verbatim error message | Layer |
|-------|------------------------|-------|
| `dependencies` present but not an array | `` dependencies must be an array (got ${typeof deps}) `` | schema.js:393 |
| per-entry: not a non-empty string | `` dependencies entry must be a non-empty string (got ${typeof entry}) `` | schema.js:397 |
| namespaced entry (`entry.includes(":")`) malformed — not exactly 2 colon-separated parts, or either half fails `NAME_KEBAB` | `` dependencies entry "${entry}" is not valid "plugin:skill" format `` | schema.js:408 |
| bare entry === `dirName` (self-dependency) | `` dependencies entry "${entry}" is a self-dependency `` | schema.js:414 |
| bare entry not in `skillNames` set | `` dependency "${entry}" not found (available: ${available}) `` where `available` = sorted, comma-joined skill names | schema.js:419 |
| bare entry resolved, but `data.audience === "public"` AND target's audience is `"private"` | `` dependencies entry "${entry}" is private but this skill is public (audience-direction guard) `` | schema.js:425 |

**Ordering rules that MUST be documented exactly (both are load-bearing, verified by dedicated regression tests):**
1. **Self-dependency check runs BEFORE the "not found" membership check.** `dirName` is always technically a member of `skillNames`, so checking membership first would silently misclassify a self-dependency as "resolved" — the self-dependency error would never fire (schema.js comment: "Pitfall 2").
2. **Namespaced (`plugin:skill`) entries are format-checked ONLY** — completely exempt from the self-dependency check, the not-found check, and the audience-direction guard. Rationale (from 15-CONTEXT.md): the target is external; its audience is unknowable from this project's tree.
3. **Audience guard fires in exactly one direction:** `public → private` is the only failing combination. `private→private`, `private→public`, `public→public` all pass silently.

**Note the message-wording asymmetry** (verified, must transcribe exactly, not "fix" it): the self-dependency error says `"dependencies entry ... is a self-dependency"` (plural field name + "entry"), while the not-found error says `` dependency "${entry}" not found `` (singular, no "entry" word). This is real source behavior, not a typo to silently correct in the doc.

### `allowed-tools` field (NEW §9 — Option A locked: format-only, no shape regex)
Gate: `Object.prototype.hasOwnProperty.call(data, "allowed-tools")`. Accepts BOTH a string and an array — matches every documented Agent Skills spec form (agentskills.io space-separated string; code.claude.com space/comma-separated string OR YAML list). Empty array `[]` passes (a coherent "zero tools" declaration); empty/whitespace-only string errors.

| Check | Verbatim error message | Layer |
|-------|------------------------|-------|
| string form, `val.trim() === ""` | `allowed-tools must be a non-empty string or array (got an empty string)` | schema.js:440 |
| string form, non-empty | *(passes — no shape regex; `"Bash(git add *)"` is one valid permission rule by construction)* | — |
| array form, per-entry: not a string OR `.trim() === ""` | `` allowed-tools[${i}] must be a non-empty string (got ${typeof entry}) `` | schema.js:450 |
| neither string nor array | `` allowed-tools must be a string or array (got ${typeof val}) `` | schema.js:455 |

**No tokenizing, no parenthesized-pattern regex** — this is the explicit "Option A" outcome from Phase 15's discussion (STACK.md Q2). A value like `"Bash(git add *)"` is accepted trivially because the string/array-entry is non-empty; the linter never parses or validates the internal shape of a tool-permission rule.

### Frontmatter Envelope (§7 current → renumbered §10, CURRENT, no drift found)
Layer: `src/frontmatter.js`, NOT `src/schema.js` (schema.js only ever sees already-parsed `{ dirName, data, body }` — the envelope checks below happen first, upstream).

| Check | Verbatim error message | Layer |
|-------|------------------------|-------|
| normalized text's first line ≠ `"---"` | `missing frontmatter: file must begin with a '--- ... ---' block` | frontmatter.js:49 |
| no subsequent bare `"---"` line found | `unterminated frontmatter: no closing '---' delimiter found` | frontmatter.js:64 |
| a stray `---` after the close, whose intervening region parses as a clean non-empty YAML mapping | `stray '---' delimiter in frontmatter: the block must contain exactly one closing '---'` | frontmatter.js:108-109 |

Doc's §7/§10 matches exactly — no change needed. **One documentation gap worth noting (optional, not required by any locked decision):** the doc's error list implies these three are the ONLY frontmatter-stage errors. In reality, arbitrary YAML syntax errors from the `yaml` v2 parser (`doc.errors[]`, pushed verbatim with no Motto-specific prefix) and unresolved-alias errors (`description: *foo`, caught by `safeToJS()`) also surface as lint errors at this stage, with parser-native messages rather than Motto-authored ones. This is a minor completeness gap, not a correctness drift — flagging for the planner's discretion on whether a one-line caveat is worth adding.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deriving "what error strings does the linter emit" | A fresh manual re-read/re-summary of schema.js each time this doc needs updating | The Validator Ground Truth Catalog above, kept current by the new doc-sync test (D-03) | This is exactly the sync-risk that killed author-skill (per project memory) — mechanize it once, don't re-derive by hand every phase. |
| Doc-sync assertion logic | A markdown-aware parser or a second copy of the cascade rules re-implemented inside the test | Plain string containment checks (`doc.includes(staticSegment)`) against text extracted from the REAL source files | Re-implementing cascade logic in the test creates a second point of drift — the exact anti-pattern being fixed. |

**Key insight:** In a docs-audit phase, the temptation is to "eyeball-verify" the doc against a mental model of the code. Every claim above was instead read from the literal source file at a specific line number — that discipline is the actual deliverable, not just the resulting prose.

## Common Pitfalls

### Pitfall 1: Documenting the message TEMPLATE vs. a rendered EXAMPLE
**What goes wrong:** Several messages interpolate values (`${typeof x}`, `${name.length}`, `${entry}`). A rewrite might accidentally hard-code one rendered example (e.g. `"got 70"`) as if it were the literal error text, making the doc technically "verified" against one fixture but wrong as a general rule statement.
**Why it happens:** The existing doc already handles this correctly by using placeholder tokens (`N`, `X`, `<typeof>`) inside the quoted string — that convention must be preserved for the four new sections too.
**How to avoid:** Follow the exact placeholder-token style already used in §1-§5 (literal `${...}` left as a bracketed variable name, or the existing doc's `N`/`X` shorthand — planner's discretion on which, but stay consistent across all ten sections).
**Warning signs:** A new error-table row that looks suspiciously like one specific test fixture's output rather than a general pattern.

### Pitfall 2: Losing the "which layer" distinction
**What goes wrong:** `outputs` validation errors come from TWO different files (`schema.js` for shape/lexical, `lint.js` for existence/symlink). If the doc collapses these into one undifferentiated table, a future contributor debugging "why didn't my outputs error show up in a schema.js unit test" will be confused — the fs-dependent half only runs inside `lintProject()`, never inside a bare `validateSkill()` call.
**Why it happens:** The current doc's §1-§5/§7 don't need this distinction (everything in those sections lives in schema.js or frontmatter.js alone) — outputs is the first field to genuinely split across layers.
**How to avoid:** Keep the "Layer" column from the catalog above in the shipped doc, or at minimum a clear prose note per error group.
**Warning signs:** A reader asking "does `motto lint` or `validateSkill()` alone catch this?" and the doc not answering.

### Pitfall 3: The doc-sync test asserting the wrong DIRECTION
**What goes wrong:** A test that reads skill-schema.md, extracts strings from it, and checks whether schema.js's source text "contains something similar" inverts the source-of-truth relationship — the doc is downstream of the code, not vice versa. Such a test would still pass if the CODE changed a message and the doc silently kept the OLD one, as long as the old string happens to still appear somewhere unrelated in the source file (a real risk with short generic substrings).
**Why it happens:** It's tempting to iterate over the doc's error tables (a nice, already-structured list) and treat schema.js as the thing being checked.
**How to avoid:** Always derive the expected string SET from the code (schema.js/lint.js source text or live `validateSkill()` output) first, then assert each expected item's static segment is a substring of the doc's raw text — never the reverse.
**Warning signs:** The test's primary loop iterates over parsed doc content rather than parsed/derived code content.

## Code Examples

### Extracting static string segments from a template literal in source text (Doc-Sync Test — Option 1 shape)
```javascript
// Illustrative sketch — NOT copy-paste production code, planner/implementer
// should adapt to the project's actual test conventions.
import { readFileSync } from 'node:fs';

const schemaSrc = readFileSync(new URL('../../src/schema.js', import.meta.url), 'utf8');

// A hand-maintained list of STATIC segments known to appear in schema.js's
// template literals, one per documented error family. Each segment is a
// substring that must survive verbatim in BOTH schema.js's source text and
// skill-schema.md's prose. Kept intentionally short-but-unique to avoid
// false-negative brittleness on reformatting (e.g. added backtick escapes).
const staticSegments = [
  'name is required',
  'must be letter-start kebab-case',
  'must not exceed 64 characters',
  'reserved substrings "anthropic" or "claude"',
  'description must not exceed 1024 characters',
  'description must not contain XML tags',
  'audience must be public|private',
  'unknown template',
  'requires <', // matches `requires <${section}>…</${section}> section`
  'outputs must be a map of name -> file',
  'is unsafe (must not be absolute or contain "..".traversal)'.replace('.', ''),
  'dependencies must be an array',
  'is a self-dependency',
  'not found (available:',
  'audience-direction guard',
  'allowed-tools must be a non-empty string or array',
];
```

### Live-invocation alternative (Doc-Sync Test — Option 2 shape)
```javascript
// Illustrative sketch. Reuses validateSkill directly — no source-text scraping.
import { validateSkill } from '../../src/schema.js';

const [{ message }] = validateSkill({
  dirName: 'x',
  data: { description: 'd', audience: 'public' }, // name omitted -> triggers "name is required"
  body: '# X\n\n**Role:** y',
});
// message === 'name is required' — a fully rendered, non-interpolated string
// for THIS specific error (no placeholder needed since nothing is interpolated
// into "name is required"). For interpolated messages, craft the fixture so
// the interpolated value is itself a known literal (e.g. a 65-character name)
// and assert the doc contains the STATIC prefix/suffix around that known value.
```

## State of the Art

| Old Approach (skill-schema.md as of this research) | Current Approach (what the rewrite must state) | When Changed | Impact |
|--------------|------------------|--------------|--------|
| §6: "`template` and `dependencies` fields ... NOT validated in Motto v0.0.2" | `template` fully validated (TMPL-01/02/04/05, Phase 14); `dependencies` fully validated (VAL-02/03/04, Phase 15) | Phase 14 (2026-07-03, this milestone) and Phase 15 (same day) | This is the core falsehood DOC-06/DOC-07 exist to fix — the doc is currently actively wrong, not just incomplete. |
| No mention of `outputs` or `allowed-tools` at all | Both fully validated (VAL-01, VAL-05, Phase 15) | Phase 15 | Two entirely new sections needed (§7, §9 in the renumbered scheme). |
| Header: "v0.0.2" | No version number (D-04) — source-citation header instead | This phase (D-04) | Removes a manual-sync surface; the doc-sync test becomes the actual freshness guarantee going forward. |
| README "Author a skill" section describes `/motto:author-skill`'s interview-style flow | Describes build-skill's one-batch-gap-fill → write → lint-loop → quality-gate → receipt flow | Phase 16 (build-skill shipped, author-skill retired) | 8 reference sites across README need rewriting/renaming, not just search-replace (author-skill's flow was genuinely different — a mechanical rename would misdescribe build-skill's actual behavior). |

**Deprecated/outdated:**
- `author-skill` (the skill itself): fully retired in Phase 16 — deleted from `skills/`, replaced by `build-skill`. No trace remains in `test/dogfood.test.js` (already asserts `build-skill`, count=2). Only `README.md`'s prose still references it.

## README Audit — Author-Skill Reference Sites

All 8 sites confirmed present at these exact line numbers as of 2026-07-03 (matches CONTEXT.md's discussion-time line numbers exactly — no drift since discussion):

| Line | Current text | What it becomes (per D-06/D-07) |
|------|---------------|-----------------------------------|
| 95 | `Use the /motto:author-skill skill in Claude Code for a step-by-step guide to writing a conforming SKILL.md.` | Rewrite the whole "Author a skill" section (§ below `## Author a skill`, anchor `#author-a-skill`) around build-skill's real flow: hand it ANY input → gap-fills missing slots in one batched message → writes the files → runs the real `motto lint` in a loop (up to 3 attempts) → self-reviews against the content-quality gate → emits a compact receipt. Slash command becomes `/motto:build-skill`. |
| 143 | `    author-skill/` (inside the `dist/` tree diagram showing `motto build` output) | `    build-skill/` — matches the real `dist/public/build-skill/` produced by this repo's own `motto build` (confirmed via `test/dogfood.test.js`: asserts `dist/public/build-skill/SKILL.md` and `dist/public/build-skill/references/skill-schema.md` both exist). |
| 203 | `/motto:author-skill` (Step 3 of the "End-to-end example" walkthrough) | `/motto:build-skill` |
| 254 | `` | `author-skill` | `/motto:author-skill` | Step-by-step guide for writing a conforming `SKILL.md` | `` (skills table row) | `` | `build-skill` | `/motto:build-skill` | <description matching build-skill's real trigger: "authoring a new Motto skill from freeform input"> | `` |
| 267 | `ln -s "$(pwd)/dist/public/author-skill" ~/.claude/skills/author-skill` | `ln -s "$(pwd)/dist/public/build-skill" ~/.claude/skills/build-skill` — copy-paste runnable against THIS repo post-`motto build` (D-07 rationale). |
| 270 | `The absolute source path (`$(pwd)/dist/public/author-skill`) is required so the symlink resolves correctly from `~/.claude/skills/`.` | Same sentence, `author-skill` → `build-skill`. |
| 275 | `cd dist/public && zip -r author-skill.zip author-skill/` | `cd dist/public && zip -r build-skill.zip build-skill/` |
| 278 | `Both commands operate on the built output under `dist/public/` (produced by `motto build`). Substitute `author-skill` with any other skill name from `dist/public/` as needed.` | Same sentence, `author-skill` → `build-skill`. |

**Verified via repo-wide grep (excluding `.planning/`, `dist/`, `node_modules/`):** these 8 README.md lines are the ONLY remaining `author-skill` references anywhere in tracked source — `motto.yaml`, `package.json`, `skills/`, `src/`, `test/` are all already clean (confirmed by Phase 16's atomic swap and `test/dogfood.test.js` already asserting `build-skill`, count=2).

### Anchor Stability
The `## Contents` list (README.md lines 11-24) links `3. [Author a skill](#author-a-skill)`. GitHub/markdown auto-generates anchors from heading text lowercased with spaces→hyphens — **if the `## Author a skill` heading text itself is changed** (e.g. to `## Build a skill`), the anchor changes too and the Contents link breaks. **Recommendation: keep the heading text `## Author a skill` unchanged** (it's a generic verb describing the user's goal, not tied to the skill's name) and rewrite only the section BODY around build-skill's flow — this keeps `#author-a-skill` a stable anchor with zero Contents-list edits needed, satisfying "keep the existing Contents/anchors structure working" (Claude's Discretion note in CONTEXT.md).

## build-skill Step 2 Cleanup Detail

Current `skills/build-skill/SKILL.md` Step 2 (lines 24-31) reads:

> Consult the bundled `skill-schema` reference for the base frontmatter and body rules (`name`, `description`, `audience`, the Title + Role spine, `shared_references`). For the newer fields, apply this delta yourself — **it supersedes the bundled reference wherever they disagree, including its claim that `template` and `dependencies` are "not validated" (they are, as of the current linter)**: [4 bullet points re-describing template/outputs/dependencies/allowed-tools]

Per D-05, this becomes: "Consult the bundled `skill-schema` reference for the full frontmatter and body rules (`name`, `description`, `audience`, the Title + Role spine, `template`, `outputs`, `dependencies`, `allowed-tools`, `shared_references`)." — **no delta, no supersede clause, no re-description of fields** (once §7-§9 exist in skill-schema.md and it's bundled current, there is nothing left for Step 2 to independently repeat).

**DOC-06 grep invariants that must still pass after this edit** (per CONTEXT.md D-05 and the design-spec's DOC-06 constraint against duplicated lint strings/regexes in build-skill's OWN prose):
```bash
grep -c "letter-start kebab-case" skills/build-skill/SKILL.md   # must be 0
grep -c "Common Lint Errors" skills/build-skill/SKILL.md         # must be 0
```
Confirmed both currently return 0 against the live file (verified 2026-07-03) — the Step 2 edit must not reintroduce either pattern. Step 5 of build-skill/SKILL.md (lines 46-51) DOES restate the NAME cascade rules inline ("kebab-case, starting with a lowercase letter, at most 64 characters long, and must not contain the word 'anthropic' or the word 'claude'") as a pre-write guard the agent runs itself — this is a DIFFERENT, pre-existing, and out-of-scope prose block (it's a live behavioral check the agent performs, not a reference to "the linter says X"); the phrase `"letter-start kebab-case"` (the exact substring the grep checks) does not appear there today, so the grep invariant already holds independent of this phase's edits. Do not touch Step 5 — it is out of this phase's boundary.

## Doc-Sync Test Design

D-03 locks the requirement ("drift breaks the suite, no new deps") but leaves the implementation shape to the planner. Two concrete shapes, with an explicit recommendation:

### Option 1 — Source-text extraction (lower effort, matches project's "small `node:test`" framing)
Read `src/schema.js` and `src/lint.js` as raw text (`readFileSync`, no `import` of the modules needed for this half). Maintain a short, hand-curated array of STATIC string segments known to appear verbatim in both files (the "Verbatim error message" column values from the catalog above, with the `${...}` interpolations replaced by nothing — i.e., just the literal text around them, kept short enough to be robust to minor rewording but specific enough to be unique). For each segment, assert:
1. `schemaSrc.includes(segment) || lintSrc.includes(segment)` — proves the segment is still real, live source text (catches the case where schema.js changes and someone forgets to update the curated list itself — a self-check).
2. `docText.includes(segment)` — proves the doc still quotes it.

**Tradeoffs:**
- ✅ Lowest implementation effort — no fixture wiring, no need to invoke `validateSkill()` at all.
- ✅ Matches D-03's literal wording ("match src/schema.js") and this project's stated minimalism philosophy (CLAUDE.md: "mechanism over features; YAGNI ruthlessly").
- ❌ Brittle to REFORMATTING that doesn't change behavior: if a message moves from a single-line template literal to a multi-line one, or gets extracted into a shared helper function, the curated static-segment list still matches (segments are just substrings) UNLESS the actual wording changes — so this brittleness concern is smaller than it first appears, AS LONG AS segments are chosen to be pure literal text, never spanning a `${...}` boundary.
- ❌ Doesn't prove the message is actually REACHABLE/correct logically — only that the string exists somewhere in the file. A dead/unreachable code path with a stale string would still "pass".

### Option 2 — Live invocation (more behaviorally robust, higher setup cost)
Import `validateSkill` (and, for the fs-layer messages, call `lintProject` against a small temp fixture directory) directly, craft minimal fixture skills that trigger each specific error path (following the exact pattern already established in `test/schema.test.js` and `test/lint.test.js` — these fixtures already exist as test cases and could be reused/mirrored), capture the REAL rendered `message` string, then strip the known-interpolated substring (since the fixture controls it) to isolate the static remainder, and assert the doc contains that static remainder.

**Tradeoffs:**
- ✅ Most robust against drift: proves the doc matches ACTUAL runtime behavior, not just source text shape. Survives arbitrary internal refactors (helper extraction, string-concatenation instead of template literals, logic reordering) as long as the observable message is unchanged.
- ✅ Directly reuses existing, already-battle-tested fixture patterns from `test/schema.test.js`/`test/lint.test.js` — low risk of getting the fixture wrong.
- ❌ More code: roughly one fixture per distinct error message (~25 across all fields) if done exhaustively — though the planner could scope this down to just the fields THIS phase newly documents (template/outputs/dependencies/allowed-tools, ~15 messages) and leave §1-§5/§7's already-stable messages to Option 1 or skip them (lower marginal drift risk since those fields haven't changed in 3 phases).
- ❌ Slightly higher review surface for a "smallest reviewable diff" phase (D-01's stated preference).

### Recommendation
**Direction of assertion (not optional, applies to either option):** always derive the expected-string SET from the CODE (source text or live invocation) and assert containment IN the doc — never the reverse (see Pitfall 3 above for why the reverse direction is a false-confidence trap).

**Shape recommendation:** Option 1 (source-text extraction) as the default, sized to match this phase's stated "small `node:test`" scope and this project's YAGNI philosophy — it directly satisfies D-03's literal requirement with the least new code. If the planner wants stronger drift protection specifically for the FOUR NEW fields this phase introduces (the highest-churn, most recently-changed validation logic), Option 2 scoped to just `template`/`outputs`/`dependencies`/`allowed-tools` messages is a reasonable upgrade — but full exhaustive Option 2 coverage of all ten sections is likely over-scoped for this phase's "one small test" framing.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended doc-sync test shape (Option 1 vs Option 2) is a genuine open design choice, not something CONTEXT.md already decided | Doc-Sync Test Design | Low — CONTEXT.md explicitly delegates this to "Claude's Discretion... planner decides"; both options satisfy the locked constraint ("drift breaks the suite, no new deps"). |
| A2 | Keeping the `## Author a skill` heading text unchanged (only rewriting the body) is an acceptable way to satisfy "keep anchors working" | Anchor Stability | Low-Medium — if the planner/user actually wants the heading itself renamed (e.g. to `## Build a skill`), the Contents link at line 15 would need a matching edit too; flagged explicitly so this is a conscious choice, not an oversight. |

**All catalog claims (Validator Ground Truth Catalog) are [VERIFIED] against live source read directly in this session — not assumed.** The only [ASSUMED]-tier judgment call in this research is the doc-sync test SHAPE recommendation above, which is explicitly marked as discretionary in CONTEXT.md itself.

## Open Questions

1. **Exact renumbering scheme for skill-schema.md's sections**
   - What we know: D-01 locks "keep the existing 7-section structure" for §1-§5/§7, and mandates new content for `outputs`/`allowed-tools` plus the §6 rewrite. That's 5 existing + 1 rewritten + 2 new = 8 distinct rule-sections, plus the unchanged §7 Frontmatter Envelope which logically belongs LAST (it's about the file envelope, not a frontmatter field).
   - What's unclear: whether to renumber Frontmatter Envelope from §7 to §10 (as this research assumes, to keep field-rule sections contiguous: §1 name, §2 description, §3 audience, §4 body spine, §5 shared_references, §6 template, §7 outputs, §8 dependencies, §9 allowed-tools, §10 frontmatter envelope) or to keep it as some other number, or to interleave differently.
   - Recommendation: the §1-§10 contiguous renumbering above reads naturally and requires renumbering only ONE existing section header (§7→§10) plus updating any cross-references to "§7" if the doc contains any (none found in the read version). Low-risk, mechanical — safe for the planner to lock without further research.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Running `node --test` for the new doc-sync test | ✓ | v24.14.1 (repo requires `>=20`, package.json `engines.node: >=20`) | — |
| `yaml` (npm) | Unrelated to this phase's changes but confirms the existing stack is intact | ✓ | 2.9.0 (matches CLAUDE.md's documented version) | — |
| husky pre-commit hook | Gating the new test on every commit (D-03's "breaks the suite at commit time" requirement) | ✓ | `.husky/pre-commit` runs `npm test` → `node --test` (confirmed by reading the hook file) | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — this phase needs nothing beyond what's already installed and working (194/194 tests passing at research time).

## Validation Architecture

Skipped — `.planning/config.json` sets `workflow.nyquist_validation: false` explicitly.

## Security Domain

`security_enforcement: true` (ASVS level 1, block on "high") per `.planning/config.json`, so this section is included per protocol — but this phase introduces **no new attack surface**: it edits two Markdown documentation files and one skill-instruction Markdown file, plus adds one `node:test` file that only reads local repo text files for string-containment assertions (no user input, no network I/O, no new parsing of untrusted data, no new file-write paths).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface touched. |
| V3 Session Management | No | N/A. |
| V4 Access Control | No | N/A. |
| V5 Input Validation | No (this phase doesn't add new input-parsing code — it documents existing validators, unchanged) | Existing `src/schema.js`/`src/frontmatter.js` never-throw guards already cover this; out of scope this phase. |
| V6 Cryptography | No | N/A. |

### Known Threat Patterns for this stack
None applicable to a docs+test-only phase. The one code-adjacent risk worth naming for completeness: the doc-sync test reads `src/schema.js`/`src/lint.js` source text via `readFileSync` on a path anchored with `import.meta.url` (never `process.cwd()`, per the existing `test/dogfood.test.js` convention) — this avoids the exact cwd-dependent path-resolution bug class that has bitten this project before (Phase 15 CR-01, `isOutputPathLexicallySafe`'s root-independence fix). No new mitigation needed beyond following that established convention.

## Sources

### Primary (HIGH confidence — direct source read, this session, 2026-07-03)
- `src/schema.js` (460 lines, full read) — every validation cascade and verbatim error string in the catalog above.
- `src/templates.js` (29 lines, full read) — SECTIONS/TEMPLATES registry, current `procedure` template definition.
- `src/lint.js` (357 lines, full read) — fs-dependent `checkOutputsFs` error strings, layer ownership, orchestration order.
- `src/frontmatter.js` (135 lines, full read) — Frontmatter Envelope error strings (§7→§10).
- `shared/references/skill-schema.md` (163 lines, full read) — the doc being audited/rewritten; cross-checked line-by-line against the above.
- `README.md` (297 lines, full read) — all 8 author-skill reference sites confirmed at exact line numbers.
- `skills/build-skill/SKILL.md` (99 lines, full read) — Step 2 supersede/delta text confirmed for D-05 removal.
- `test/schema.test.js`, `test/lint.test.js`, `test/dogfood.test.js` — grepped/read to confirm error-message assertion style (substring/regex, not full-string equality) and to confirm the current test suite already exercises every catalog entry above.
- `npm test` run in-repo (2026-07-03): 194/194 tests passing, 0 failures — confirms the catalog reflects genuinely live behavior, not stale reading.
- `.planning/phases/14-template-mechanism/14-CONTEXT.md`, `.planning/phases/15-field-validation-integrity-guards/15-CONTEXT.md`, `.planning/phases/16-build-skill-author-skill-retirement/16-CONTEXT.md` — decision provenance for template/outputs/dependencies/allowed-tools semantics and the DOC-06 constraint's origin.
- `.planning/config.json` — confirmed `nyquist_validation: false`, `security_enforcement: true`.

### Secondary (MEDIUM confidence)
None used — no external documentation lookups were necessary for this phase (100% internal source verification, zero new libraries).

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new stack; confirmed existing `yaml@2.9.0` and Node v24.14.1 in place, matching CLAUDE.md.
- Architecture/Validator Catalog: HIGH — every error string and cascade rule read directly from source with line numbers, cross-checked against 194 passing tests.
- README audit: HIGH — every reference site grep-confirmed at exact current line numbers, matching CONTEXT.md's discussion-time numbers exactly (zero drift since discussion).
- Doc-sync test design: MEDIUM — this is a design recommendation among genuinely open options (explicitly marked Claude's Discretion in CONTEXT.md), not a single verified fact.

**Research date:** 2026-07-03
**Valid until:** Effectively until `src/schema.js`/`src/templates.js`/`src/lint.js` next change (this is a point-in-time snapshot of validator behavior for a docs phase — no natural expiry window like an external library would have; re-verify against source if any of those three files change before this phase executes).
