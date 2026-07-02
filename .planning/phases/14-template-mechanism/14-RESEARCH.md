# Phase 14: Template Mechanism - Research

**Researched:** 2026-07-03
**Domain:** Pure-JS schema validation extension (internal mechanism, zero external dependencies)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary:** `template:` frontmatter field validated by lint, driven entirely by a pure-data registry (`src/templates.js` — `SECTIONS` tag→description map + `TEMPLATES` name→rules map). The `procedure` template ships, requiring `<process>` + `<success_criteria>` body sections. Skills without `template:` behave byte-for-byte as v0.0.4 (TMPL-05 regression guard). Adding a new template = data-only edit. Requirements: TMPL-01..05.

Out of this phase: `outputs:`/`dependencies:`/`allowed-tools` validation (Phase 15), build-skill (Phase 16), doc rewrite (Phase 17).

**Section-tag matching:**
- Matched pair required — both `<process>` and `</process>` must exist; an unclosed section fails. Presence-only; content is free (D-07).
- Line-start anchored — tag must open its own line (`^<process>`); prose mentioning a tag mid-sentence never counts.
- Fenced code blocks only excluded — lines inside ``` fences ignored (roadmap SC3). Inline code spans need no special handling: line-anchoring already excludes them.
- Bare tags only — exact `<process>`, no attributes. Attributed tags (gsd-core style `<step name=...>`) are inner-tag territory, not the required spine.

**Lint error UX:**
- One error per missing section — matches schema.js D-13 independent-check aggregation; each pushes its own `{skill, message}`.
- Error names the template AND includes the SECTIONS registry description — e.g. `template "procedure" requires <process>…</process> section — Numbered steps the agent executes, in order.` Registry doubles as doc source (D-07); author learns the section's meaning from the error itself.
- Unknown template: sorted names inline — e.g. `unknown template "procedur" (available: procedure)`. Names only, alphabetical, one line.

**Malformed `template:` values:**
- Cascade validation (name-cascade precedent in schema.js): non-string → stop; unknown name → stop; else enforce sections. Absent key → skip template checks entirely (this is the TMPL-05 guard: only truly ABSENT key means base schema).
- Array value → plain type error `template must be a string (got object)`. No forward-compat hint (YAGNI; multi-template already traced in evolution ledger).
- Empty/falsy value with key present → error, never silent fallback to base schema. Key written = intent declared; silent skip would mask a typo.
- Never-throw invariant applies: all template validation returns errors[], adversarial malformed-input tests mandatory (standing invariant, see memory of v0.0.2 hardening).

**waives mechanism:**
- Implement the `waives` merge logic now, exercised via a test-fixture template. Rationale: success criterion 5 promises "new template = data-only edit" — that promise breaks if waives-using templates need mechanism code. `procedure` itself waives nothing.

**Init scaffold & dogfood:**
- `motto init` starter skill untouched — it demos the BASE schema; template demo belongs to README/skill-schema.md (Phase 17) and build-skill (Phase 16). No init.js churn this phase.
- Live dogfood in-phase: an existing Motto skill (`release` — procedural, natural fit) adopts `template: procedure` — requires adding `<process>`/`<success_criteria>` to its body. Dogfood test proves enforcement on the live tree, not just fixtures.

### Claude's Discretion
- Exact regex/parse implementation for fence-aware line scanning.
- Where template validation hooks into `validateSkill` vs a sibling validator — planner decides against never-throw + purity constraints (schema.js is a pure object validator; keep it that way).
- Exact wording polish of error strings (decisions above fix structure and content, not final phrasing).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Evolution ledger items — multi-template arrays, action tags, `<role>` migration — already traced in the design spec and REQUIREMENTS.md Future Requirements.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TMPL-01 | Author declares `template: <name>` and lint enforces that template's extra rules | Cascade design in "Architecture Patterns"; error-string formats in "Code Examples" |
| TMPL-02 | Template + section-tag registry is pure data (`src/templates.js`); adding a template requires no mechanism change | `src/templates.js` data shape (verbatim from design spec §1) documented below; validated against existing `src/schema.js` purity constraints |
| TMPL-03 | `procedure` template requires `<process>` + `<success_criteria>` — matching ignores fenced code blocks | `hasClosedSection()` fence-aware algorithm in "Code Examples"; matches existing T-02-01/T-Q-01 no-backtracking regex precedent in schema.js |
| TMPL-04 | Unknown template name yields a lint error listing available templates | Sorted-keys error format matches `RESERVED`/cascade error precedent in schema.js |
| TMPL-05 | Skills without `template:` behave exactly as v0.0.4 (regression-guarded) | `hasOwnProperty` key-presence gate (not truthy-check) documented in "Architecture Patterns"; **critical landmine** in existing `test/schema.test.js` B13 identified in "Common Pitfalls" |
</phase_requirements>

## Summary

Phase 14 is a pure, self-contained extension of an already-mature validator (`src/schema.js`, 178 lines, 131 passing tests). No new runtime dependencies, no new files beyond `src/templates.js`, no CLI or build-pipeline wiring changes — `src/lint.js` and `src/build.js` are unaffected because they already call `validateSkill()` as a black box. The entire phase is: (1) create `src/templates.js` as pure data, (2) extend `src/schema.js`'s `validateSkill()` with a template-field cascade plus a fence-aware section-tag scanner, (3) update the `release` skill to dogfood `template: procedure`, (4) write adversarial tests.

The codebase already established every pattern this phase needs: cascade validation with early-stop (the NAME checks), independent-check aggregation (D-13), default-parameter dependency injection for testability (`sharedRefs = new Set()`), and anchored/non-backtracking regex discipline (explicit `T-02-01`/`T-Q-01` markers throughout `schema.js`). The planner should extend these exact patterns rather than invent new ones — this keeps the "small rigorous spine" philosophy intact.

The single highest-risk finding: `test/schema.test.js` B13 currently asserts `template: "standard"` (an arbitrary non-registered string) produces **zero errors**, because v0.0.4 treats `template` as a passthrough unknown key (D-14). Phase 14 makes `template` a *validated* key — the same input must now produce `unknown template "standard" (available: procedure)`. This existing test **will fail** the moment template validation is added unless the planner explicitly updates/splits it. This is not a new-test-writing task — it's a **modify-existing-test** task that must be sequenced correctly (update B13 in the same commit/task that adds template validation, not after).

**Primary recommendation:** Add `src/templates.js` (pure data, matching the design spec's exact shape) and extend `validateSkill()` in `src/schema.js` with (a) a `hasOwnProperty`-gated template cascade computed *before* the existing Title/Role body-spine checks (so `waives` can conditionally skip them), and (b) an exported `hasClosedSection(body, tagName)` fence-aware helper. Inject `{ SECTIONS, TEMPLATES }` as an optional fourth-style default parameter (mirroring `sharedRefs = new Set()`) so tests can exercise the `waives` merge logic via a fixture template without polluting production `templates.js`.

## Architectural Responsibility Map

Motto is a single-tier Node.js CLI/library (no browser, no server, no database) with a strictly layered internal architecture. Tiers below are Motto's own layers, not web-app tiers.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Template + section-tag data (`SECTIONS`, `TEMPLATES`) | Data Registry (`src/templates.js`, new) | — | Must be pure data (TMPL-02) — no functions, no I/O. Mirrors `RESERVED` array pattern already in `schema.js`. |
| Template cascade validation (name/unknown/sections) | Pure Validator (`src/schema.js`) | Data Registry (imports `templates.js`) | `validateSkill()` already owns all frontmatter-field rules (name, description, audience, shared_references); template is one more field, same file, same never-throw contract. |
| Fence-aware section-tag scanning | Pure Validator (`src/schema.js`, new exported helper) | — | Pure string/regex logic, no filesystem — belongs beside `NAME_KEBAB` as an exported building block, not a new file (YAGNI: it's ~15 lines). |
| Skill discovery + file I/O | Orchestrator (`src/lint.js`) | — | **Unchanged this phase.** `processSkill()` already calls `validateSkill()` as an opaque function; template errors flow through the existing `{skill, message}` pipe with zero wiring changes. |
| Build/package output | Build (`src/build.js`) | — | **Unchanged this phase.** Already lint-gated via `lintProject()`; inherits template enforcement for free. |
| CLI entry | CLI (`bin/motto.js`) | — | **Unchanged this phase.** No new subcommands or flags. |

## Standard Stack

### Core

No new dependencies. This phase extends existing pure-JS modules using only what is already installed.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `yaml` | 2.9.0 (already installed) | Frontmatter parsing | Unchanged — `template` arrives as `data.template` from the existing `parseFrontmatter()` pipeline; no new parsing logic needed. |
| `node:test` | stdlib | Test runner | Same runner as existing 131 tests; new tests append to `test/schema.test.js` and `test/dogfood.test.js`. |

### Supporting

None needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled line-scanning state machine for fence detection (~15 lines) | `markdown-it` / `remark` / `unified` AST parser | Adding a markdown parser dependency for a single boolean fence-toggle check violates the project's explicit "single runtime dependency" constraint (CLAUDE.md) and the "mechanism over features" philosophy. A full CommonMark AST is overkill for "is this line inside a ``` fence". **Do not add a markdown-parsing dependency for this phase.** |
| Regex-based bare-tag matching (`^<process>`) | A tiny hand-rolled XML/SGML tag parser | Overkill — the decisions explicitly scope this to *bare* tags with *no attributes*, at *line start*. A literal-string-anchored regex fully satisfies the spec in one line per tag; a parser adds surface area for zero behavioral gain. |
| Default-parameter dependency injection for the templates registry (`validateSkill(skill, sharedRefs, templatesRegistry = { SECTIONS, TEMPLATES })`) | A global mutable registry / module-level override for tests | Matches the existing `sharedRefs = new Set()` pattern exactly (same file, same author, same convention) and keeps `templates.js` free of test-only fixture pollution — the `waives` test template lives in the test file, not in production data. |

**Installation:** None — no `npm install` required this phase.

**Version verification:** N/A — no new packages recommended.

## Package Legitimacy Audit

**Not applicable.** This phase introduces zero external packages (no `npm install` of any kind). All work is additive pure-JS within the existing `src/` tree, using only the `yaml` dependency and Node stdlib already present in `package.json`. The Package Legitimacy Gate is skipped per its own trigger condition ("whenever this phase installs external packages").

**Packages removed due to [SLOP] verdict:** none (N/A — no packages evaluated)
**Packages flagged as suspicious [SUS]:** none (N/A)

## Architecture Patterns

### System Architecture Diagram

```
SKILL.md (raw text, on disk)
       │
       ▼
parseFrontmatter()  [src/frontmatter.js — UNCHANGED]
       │  { data, body, errors }
       ▼
validateSkill({ dirName, data, body }, sharedRefs, templatesRegistry)   [src/schema.js — EXTENDED]
       │
       ├─▶ NAME cascade (unchanged)
       ├─▶ DESCRIPTION checks (unchanged)
       ├─▶ AUDIENCE check (unchanged)
       │
       ├─▶ TEMPLATE cascade (NEW — TMPL-01/02/04/05)
       │      │
       │      ├─ hasOwnProperty(data, "template") === false
       │      │       └─▶ waivedSections = ∅  (skip entirely — TMPL-05 guard)
       │      ├─ typeof data.template !== "string"
       │      │       └─▶ err("template must be a string (got X)")  [STOP — no further template checks]
       │      ├─ TEMPLATES[data.template] undefined (incl. "" empty string)
       │      │       └─▶ err(`unknown template "X" (available: sorted-names)`)  [STOP]
       │      └─ known template found
       │              ├─▶ waivedSections = new Set(template.waives ?? [])
       │              └─▶ for each requiredSection not present (fence-aware scan)
       │                      └─▶ err(`template "X" requires <sec>…</sec> section — <SECTIONS[sec]>`)
       │
       ├─▶ BODY SPINE — Title check   (skip if waivedSections.has("title"))
       ├─▶ BODY SPINE — Role check    (skip if waivedSections.has("role"))
       │      ▲ NOTE: template cascade MUST run and resolve waivedSections
       │        BEFORE these two checks — reorder relative to current file.
       │
       └─▶ SHARED_REFERENCES checks (unchanged)
                │
                ▼
        errors[]  (aggregated, returned to src/lint.js — UNCHANGED)
```

A reader can trace the primary use case end to end: a `template: procedure` skill missing `<success_criteria>` enters at the top, flows through the cascade, resolves `procedure` as known, finds `success_criteria` absent via the fence-aware scan, and exits with exactly one new error appended to the existing errors array — nothing else in the pipe changes shape.

### Recommended Project Structure

```
src/
├── templates.js     # NEW — pure data: SECTIONS (tag→description), TEMPLATES (name→rules)
├── schema.js         # EXTENDED — template cascade + hasClosedSection() helper, both exported
├── lint.js           # UNCHANGED — already calls validateSkill() as a black box
└── build.js          # UNCHANGED — already lint-gated via lintProject()
skills/
└── release/
    └── SKILL.md       # EDITED — adds `template: procedure` + <process>/<success_criteria> sections
test/
├── schema.test.js     # EXTENDED (+ B13 MUST be updated, not just appended-to)
└── dogfood.test.js    # EXTENDED — asserts release's live template enforcement still lints clean
```

### Pattern 1: Cascade-then-independent validation (extend, don't replace)

**What:** `validateSkill()` already mixes two error-aggregation strategies: the NAME field cascades (stop at first failure), while DESCRIPTION/AUDIENCE/BODY/SHARED_REFERENCES run independently (all checked, all errors collected — D-13). The `template` field is itself a **cascade** (per CONTEXT.md decisions: non-string → stop; unknown name → stop; else enforce sections), but it sits *alongside* the independent checks, not nested inside the NAME cascade.

**When to use:** Any time a single field has an internal ordering where downstream checks are meaningless once an upstream one fails (e.g., checking `requiredSections` on an unknown template name would be nonsensical) — but the field's checks, once resolved, should not gate unrelated fields' checks.

**Example (illustrative — matches existing `err()` helper contract):**
```javascript
// Source: pattern extension of src/schema.js NAME cascade (lines 81-108)
const hasTemplateKey = Object.prototype.hasOwnProperty.call(data, "template");
let waivedSections = new Set();

if (hasTemplateKey) {
  const tpl = data.template;
  if (typeof tpl !== "string") {
    err(`template must be a string (got ${typeof tpl})`);
  } else if (!Object.prototype.hasOwnProperty.call(TEMPLATES, tpl)) {
    const available = Object.keys(TEMPLATES).sort().join(", ");
    err(`unknown template "${tpl}" (available: ${available})`);
  } else {
    const { requiredSections = [], waives = [] } = TEMPLATES[tpl];
    waivedSections = new Set(waives);
    for (const section of requiredSections) {
      if (!hasClosedSection(bodyStr, section)) {
        err(
          `template "${tpl}" requires <${section}>…</${section}> section — ${SECTIONS[section] ?? ""}`
        );
      }
    }
  }
}
```

### Pattern 2: Fence-aware, line-anchored, bare-tag section scanner

**What:** A pure function that answers "does this body contain a matched `<tag>`/`</tag>` pair, each anchored to its own line, outside any ``` fenced code block?"

**When to use:** Any `requiredSections` check for any template (not just `procedure` — this is the generic engine `TMPL-02` requires so future templates need zero mechanism change).

**Example:**
```javascript
// Source: original implementation for this phase — no external reference;
// mirrors the anchored/non-backtracking regex discipline already used for
// the Title check (^# \S) and Role check (^\*\*Role:) in src/schema.js.
export function hasClosedSection(body, tagName) {
  const bodyStr = body || "";
  const lines = bodyStr.split("\n");
  const fenceRe = /^ {0,3}(`{3,}|~{3,})/; // CommonMark-style fence open/close marker
  const unfencedLines = [];
  let inFence = false;
  for (const line of lines) {
    if (fenceRe.test(line)) {
      inFence = !inFence;
      continue; // the fence marker line itself is never a tag line
    }
    if (!inFence) unfencedLines.push(line);
  }
  const text = unfencedLines.join("\n");
  // tagName is ALWAYS sourced from the trusted internal SECTIONS/TEMPLATES
  // registry (src/templates.js), never from raw skill frontmatter — safe to
  // interpolate into a RegExp without injection risk (T-Q-01 precedent).
  const openRe = new RegExp(`^<${tagName}>`, "m");
  const closeRe = new RegExp(`^</${tagName}>`, "m");
  return openRe.test(text) && closeRe.test(text);
}
```

**Why exported:** Mirrors the `NAME_KEBAB` export precedent — a pure regex/string helper that's independently unit-testable (fence edge cases, unclosed tags, etc.) without needing a full `validateSkill()` fixture for every case.

### Pattern 3: Registry injection for waives testing (test-fixture template)

**What:** `TEMPLATES`/`SECTIONS` are imported from `src/templates.js` by default, but `validateSkill()` accepts them as an optional injected parameter so tests can exercise the generic `waives` merge logic without adding a fake template to production data.

**When to use:** Exactly the `waives` mechanism this phase must implement-but-not-use (CONTEXT.md: "`procedure` itself waives nothing" but "waives merge logic" must exist and be tested).

**Example:**
```javascript
// Source: extends existing `sharedRefs = new Set()` default-parameter pattern
// (src/schema.js line 74) to a second injectable dependency.
import { SECTIONS, TEMPLATES } from "./templates.js";

export function validateSkill(
  skill,
  sharedRefs = new Set(),
  templatesRegistry = { SECTIONS, TEMPLATES }
) {
  const { SECTIONS: SEC, TEMPLATES: TPL } = templatesRegistry;
  // ...cascade uses TPL/SEC instead of the module-level imports directly
}
```
```javascript
// test/schema.test.js — waives fixture, NOT added to src/templates.js
const FIXTURE_TEMPLATES = {
  SECTIONS: { process: "steps" },
  TEMPLATES: {
    "no-role-needed": { requiredSections: ["process"], waives: ["role"] },
  },
};
it("waives: template waiving 'role' allows a body with no **Role:** line", () => {
  const skill = {
    dirName: "x",
    data: { name: "x", description: "d", audience: "public", template: "no-role-needed" },
    body: "# Title\n\n<process>\ndo it\n</process>\n",
  };
  const errors = validateSkill(skill, new Set(), FIXTURE_TEMPLATES);
  assert.deepEqual(errors, []); // no Role-line error despite its absence
});
```

### Anti-Patterns to Avoid

- **Truthy-check instead of `hasOwnProperty` for template-key presence:** `if (data.template)` would treat `template: ""` or `template: false` (a malformed-but-present key) identically to an absent key — silently skipping validation. CONTEXT.md explicitly forbids this ("Empty/falsy value with key present → error, never silent fallback"). Use `Object.prototype.hasOwnProperty.call(data, "template")`.
- **Running Title/Role checks before resolving `waivedSections`:** the current file order (body spine checks before any template-adjacent logic) must change — template resolution has to happen first so `waives` can gate the spine checks. Skipping this reordering makes the `waives` mechanism dead code that can never actually waive anything in the real validator path (only in direct unit tests of a hypothetical waiving codepath).
- **Adding a markdown/AST parser dependency:** violates the project's explicit "single runtime dependency" and "mechanism over features" constraints (see CLAUDE.md). The fence-detection need is one boolean toggle per line — a full parser is disproportionate.
- **Mutating `src/templates.js` to add a test-only waiving template:** pollutes the pure-data doc-source file (`SECTIONS`/`TEMPLATES` doubles as the schema documentation per D-07) with a fixture that isn't a real, shippable template. Inject fixtures via the test file instead (Pattern 3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fenced-code-block detection | A CommonMark-compliant nested-fence-type-aware parser (handling ` ``` ` vs `~~~`, differing fence lengths, indented fences beyond 3 spaces, etc.) | The simple toggle-per-marker-line state machine in Pattern 2 | The spec only requires "ignore tags inside fenced blocks" (roadmap SC3) — not full CommonMark fidelity. A toggle that flips on any 3+ backtick/tilde run at line start (≤3 leading spaces) covers every realistic case a skill author would write. Perfect CommonMark fence-type matching (rejecting a `~~~` close for a ` ``` ` open) is unneeded complexity for this domain. |
| Bare-tag matching | A generic XML/SGML parser or `htmlparser2`-style tokenizer | Literal-string-anchored regex per tag name (`^<tagname>`, `^</tagname>`) | The decisions scope this to *exact bare tags, no attributes, line-anchored* — a full tag parser would need to additionally reject attributed variants, which is more code than the regex it would replace. |
| Template-field validation ordering | A generic rule-engine / schema-composition library (e.g., merging JSON Schemas) | Inline cascade logic co-located in `validateSkill()`, matching the existing NAME-cascade style | The project has exactly one template today and one waives-consumer test fixture; a rule-engine is speculative generality the project's own philosophy explicitly rejects ("mechanism over features... YAGNI ruthlessly"). |

**Key insight:** Every "don't hand-roll" instinct here inverts the usual advice — the standard library-avoidance recommendation (don't hand-roll password hashing, date parsing, etc.) doesn't apply because this domain (bare-tag presence-only scanning over a known, small, trusted registry) is genuinely simpler than any general-purpose library that solves it, and the project's own constraints (zero added dependencies) make hand-rolling the *correct* choice, not a shortcut.

## Common Pitfalls

### Pitfall 1: B13 in `test/schema.test.js` will start failing the moment template validation ships

**What goes wrong:** `test/schema.test.js` line 258-273 (`B13: template and dependencies keys in data cause no errors (D-14)`) currently sets `data.template = "standard"` and asserts `errors` is `[]`. Once `TEMPLATES` only contains `procedure`, this exact input must now produce `unknown template "standard" (available: procedure)` — a new, correct, required error under TMPL-04. The existing assertion becomes objectively wrong the instant the feature ships.

**Why it happens:** D-14 (v0.0.4) declared `template`/`dependencies` both unvalidated passthrough keys. Phase 14 promotes `template` out of that bucket; `dependencies` stays in it (Phase 15 territory). The test conflated both fields in one assertion, so splitting them is required, not optional.

**How to avoid:** Treat updating/splitting B13 as an explicit task in the plan — not an incidental side effect discovered during test-run debugging. Split into two tests: (a) `dependencies: [...]` alone still causes no errors (D-14 still applies to that field), and (b) an unknown `template` value now correctly errors (TMPL-04 regression-proof, replaces the old zero-error assertion).

**Warning signs:** `node --test` reporting a *new* failure in `schema.test.js` for a test that wasn't touched by the current task — that's this landmine, not a bug in the new code.

### Pitfall 2: Ordering the template cascade after the body-spine checks silently breaks `waives`

**What goes wrong:** If the Title/Role independent checks (current lines 143-156) run before the template cascade resolves `waivedSections`, a template that waives `"role"` can never actually suppress the Role-line error — the check already ran and already pushed its error by the time `waivedSections` exists.

**Why it happens:** The current file has the body-spine checks positioned before any template-aware logic would naturally be added (a naive additive patch would append the template cascade at the end, near shared_references).

**How to avoid:** Compute the template cascade (and thus `waivedSections`) *before* the Title/Role checks in the function body, even though the errors it produces are pushed independently and interleave in the final array in whatever order matches the file's new structure. Order of the returned `errors[]` array itself is not contractually meaningful elsewhere (lint.js aggregates and sorts by dirName, not by within-skill error order) — confirm this against `test/lint.test.js` before assuming, but no existing test currently asserts error *order* within a single skill's error set.

### Pitfall 3: Regex-per-call construction inside a hot loop

**What goes wrong:** `hasClosedSection()` builds two `new RegExp(...)` objects per call. If called once per `requiredSection` per skill during a large lint run, this is fine (small N — one skill's requiredSections list has ≤ a handful of entries) but if refactored later into a per-line loop it could become O(lines × sections) `RegExp` construction, which is wasteful (not a correctness bug, a performance smell).

**Why it happens:** Natural first-draft structure joins unfenced lines back into a string once, then does one regex test per section — this is fine. The pitfall only manifests if a future refactor moves regex construction inside the per-line fence-scanning loop instead of after it.

**How to avoid:** Keep the two-phase structure exactly as shown in Pattern 2: (1) single pass to build the unfenced text, (2) one regex pair per required section tested against that text. Do not interleave.

**Warning signs:** N/A for this phase's scale (a handful of skills, a handful of sections) — flagged for completeness per the codebase's own performance-conscious precedent (T-02-01 backtracking comments throughout `schema.js`), not because it is currently measurable.

### Pitfall 4: `release` skill body edit accidentally breaking existing dogfood assertions

**What goes wrong:** `test/dogfood.test.js` asserts `lintProject(REPO_ROOT)` returns `ok: true` with `count: 2` and `errors: []` (line 35-44), and `buildProject` produces specific files including `dist/private/release/SKILL.md` and confirms `release` has **no** `references/` directory. Adding `template: procedure` plus `<process>`/`<success_criteria>` tags to `release/SKILL.md` must preserve every existing base-spine element (H1 title, `**Role:**` line) and must not accidentally introduce a `shared_references` key or otherwise change unrelated frontmatter.

**Why it happens:** Editing a live, tested skill file for dogfood purposes is inherently higher-risk than adding new test fixtures — a single misplaced YAML key or dropped blank line can cascade into 3-4 unrelated existing test failures (`dogfood.test.js`, `lint.test.js` if it references `release` count elsewhere).

**How to avoid:** After editing `skills/release/SKILL.md`, run `node --test` in full (not just the new template tests) before considering the task done — the existing 131 tests are the regression suite for exactly this risk.

**Warning signs:** Any dogfood test failure mentioning `release` after an unrelated-seeming template edit.

## Code Examples

### Full template-cascade snippet (verified pattern extension of the existing file)

```javascript
// Source: original implementation for this phase (Pattern 1 + Pattern 2 combined),
// extending src/schema.js's existing cascade/independent-check model (D-13).
import { SECTIONS, TEMPLATES } from "./templates.js";

// ── TEMPLATE (TMPL-01, TMPL-02, TMPL-04, TMPL-05) ─────────────────────────
// hasOwnProperty, NOT a truthy check — an explicitly-present falsy value
// (empty string, null-from-YAML, etc.) must error, never silently skip.
const hasTemplateKey = Object.prototype.hasOwnProperty.call(data, "template");
let waivedSections = new Set();

if (hasTemplateKey) {
  const tpl = data.template;
  if (typeof tpl !== "string") {
    err(`template must be a string (got ${typeof tpl})`);
  } else if (!Object.prototype.hasOwnProperty.call(TEMPLATES, tpl)) {
    const available = Object.keys(TEMPLATES).sort().join(", ");
    err(`unknown template "${tpl}" (available: ${available})`);
  } else {
    const { requiredSections = [], waives = [] } = TEMPLATES[tpl];
    waivedSections = new Set(waives);
    for (const section of requiredSections) {
      if (!hasClosedSection(bodyStr, section)) {
        err(
          `template "${tpl}" requires <${section}>…</${section}> section — ${SECTIONS[section] ?? ""}`
        );
      }
    }
  }
}
// waivedSections must be computed above THIS point, before the Title/Role checks below.
```

### `src/templates.js` (verbatim from the design spec — TMPL-02)

```javascript
// Source: .planning/superpowers/specs/2026-07-02-skill-builder-design.md §1
export const SECTIONS = {
  process: "Numbered steps the agent executes, in order.",
  success_criteria: "Checkable conditions that define done.",
};

export const TEMPLATES = {
  procedure: {
    requiredSections: ["process", "success_criteria"],
    // future keys: requiredFields, waives ("title" | "role")
  },
};
```

## State of the Art

Not applicable — this phase has no external ecosystem to track (no framework versions, no library upgrades). The "state of the art" is internal: v0.0.4's `template` field was an inert passthrough key (D-14); v0.0.5 Phase 14 activates it as the project's first data-driven, extensible validation profile mechanism.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `template:` accepted and ignored (D-14, v0.0.4) | `template:` validated against `src/templates.js` registry; unknown/malformed values error | Phase 14 (this phase) | Any skill currently using an arbitrary `template:` string (none exist in-tree today except the `B13` test fixture) will start failing lint unless the value matches a real registry key. |

**Deprecated/outdated:**
- The `author-skill/SKILL.md` doc line "Accepted and passed through verbatim; not validated in v0.0.2" (line 80) becomes inaccurate for `template` (though still accurate for `dependencies` until Phase 15). This is **explicitly out of scope** for Phase 14 per the phase boundary ("doc rewrite (Phase 17)") — do not fix it this phase; `author-skill` itself is retired in Phase 16 anyway.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fence detection should use a simple "any line matching `^ {0,3}(\`{3,}\|~{3,})` toggles fence state" heuristic, without matching fence character type (backtick vs tilde) or length between open/close | Architecture Patterns — Pattern 2 | Low — CONTEXT.md left "exact regex/parse implementation for fence-aware line scanning" as Claude's discretion; a mismatched-fence-type edge case (opening ` ``` `, closing `~~~`) is vanishingly unlikely in authored skill bodies and does not affect any stated success criterion. If wrong, worst case is one skill author's unusual mixed-fence-markdown produces a false negative/positive on section detection — recoverable by tightening the regex in a follow-up. |
| A2 | Whether a bare tag with trailing same-line content (e.g. `<process> extra text`) should count as a valid tag-open, versus requiring the tag to be alone on its line | Architecture Patterns — Pattern 2 (regex `^<${tagName}>` matches with or without trailing content since it's not end-anchored) | Medium — CONTEXT.md says "Bare tags only — exact `<process>`, no attributes" but doesn't explicitly address trailing prose on the same line. The recommended regex (`^<${tagName}>` without a `$` or `\s*$` anchor) permissively matches both `<process>` alone and `<process> notes` on the same line. If the planner/discuss-phase intends stricter whole-line-only matching, add `(?:\s*)$` to the regex. **Recommend confirming this at plan time** since it changes one line of regex and has a directly testable behavior difference. |
| A3 | Order of `errors[]` within a single skill's returned array is not contractually significant elsewhere in the codebase (only the grouping/labelling by `dirName` and the config-before-skills ordering are enforced) | Common Pitfalls — Pitfall 2 | Low — verified by reading `test/lint.test.js` and `test/schema.test.js` test structure (assertions check `errors.length`, message content via regex, and `skill` field — never array position within a single skill's error set). If wrong, reordering the template cascade before body-spine checks could theoretically break a brittle order-dependent assertion; grep for `errors[0]` vs `errors[1]` index-based assertions before finalizing the reorder. |

## Open Questions

1. **Should `hasClosedSection` require the tag to be the *entire* line, or merely to *start* the line?**
   - What we know: CONTEXT.md specifies "line-start anchored" (`^<process>`) and "bare tags only... no attributes."
   - What's unclear: Whether `<process>` followed by trailing same-line text should count as a valid open tag, or whether the tag must occupy the whole line.
   - Recommendation: Default to "starts the line" (permissive, matches the literal `^<process>` anchor given in decisions) unless the plan-review or discuss step surfaces a stricter interpretation. This is Assumption A2 above — cheap to flip either way at plan time, costly to discover as a test failure post-implementation.

2. **Does the `waives` value list use section-registry-style names ("title", "role") that are NOT the same namespace as `SECTIONS` keys (which are body-tag names like "process")?**
   - What we know: The design spec comment says `waives ("title" | "role")` — these are the two base-spine checks, not `SECTIONS` entries.
   - What's unclear: Whether `waives` should be validated against a fixed enum (`["title", "role"]`) or accepted as free-form strings (unknown values silently no-op, since no check currently keys off them).
   - Recommendation: Since `procedure` waives nothing and the only consumer this phase is a test fixture, treat `waives` values as an unchecked internal implementation detail for now (no validation of the `waives` array's contents) — over-engineering a waives-value validator for a mechanism with zero real consumers would violate YAGNI. Revisit if/when a real template needs to waive something.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified) — this phase is pure in-repo JavaScript with zero new tools, services, or runtimes. All required tooling (Node ≥20, `node --test`) is already verified present via the existing 131-test suite running successfully in this environment.

## Security Domain

Required per `security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Motto is a local CLI/library with no authentication surface. |
| V3 Session Management | No | No sessions exist in this tool. |
| V4 Access Control | No | No multi-user access-control model; operates on the local filesystem under the invoking user's own permissions. |
| V5 Input Validation | Yes | The entire phase IS input validation — frontmatter `template:` field and body text are untrusted-ish input (authored by any contributor to the skill tree) validated via anchored, non-backtracking regexes and an explicit allow-list registry (`TEMPLATES`), never a deny-list. Never-throw invariant (D-01) ensures malformed input always surfaces as a reported error, never a crash. |
| V6 Cryptography | No | No cryptographic operations in this phase. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Regular Expression Denial of Service (ReDoS) via crafted section-tag or fence regex | Denial of Service | All regexes in this phase are anchored (`^`), use fixed-length alternation (`{3,}` on a single non-nested character class), and interpolate only **trusted, internal** strings (tag names sourced exclusively from `src/templates.js`'s own `SECTIONS`/`TEMPLATES` keys — never from raw skill-authored YAML values) into `new RegExp(...)`. This matches the existing `T-02-01`/`T-Q-01` no-catastrophic-backtracking precedent already documented in `src/schema.js`. A future template/section name should continue to be validated as a simple identifier (letters/underscores) if ever sourced from less-trusted input. |
| Regex/string injection via `template:` value flowing into dynamically-constructed patterns | Tampering | `data.template` (the untrusted, author-controlled string) is used **only** as an object-key lookup (`TEMPLATES[tpl]`, `Object.prototype.hasOwnProperty.call(TEMPLATES, tpl)`) — never interpolated into a `RegExp` or `eval`-like construct. Only the internally-controlled `requiredSections` array entries (sourced from the matched `TEMPLATES[tpl]` object, not from `data`) are interpolated into regexes. This separation must be preserved: never build a regex from `data.template` itself. |
| Uncaught exception crashing the lint run on malformed frontmatter (e.g., `template` as a Proxy, getter that throws, or other exotic object) | Denial of Service | Standing never-throw invariant (D-01) — `processSkill()` in `src/lint.js` already wraps all per-skill validation in a try/catch backstop (line 161-164) that converts any unexpected exception into an `{skill, message}` error and continues the scan. New template-validation code inherits this backstop automatically since it runs inside `validateSkill()`, called from within that try block. Adversarial tests (a spec-mandated standing requirement) should still cover a `template` value that is an object with a throwing `toString`/`valueOf`/`Symbol.toPrimitive`, to prove the `typeof tpl !== "string"` guard short-circuits before any string coercion is attempted. |

## Sources

### Primary (HIGH confidence)
- `/Users/jeremie/Projects/motto/src/schema.js` — read directly; existing cascade/independent-check patterns, `NAME_KEBAB` export precedent, never-throw guard style (T-02-01, T-Q-01, REVIEW-01/04/05/06 markers).
- `/Users/jeremie/Projects/motto/src/lint.js` — read directly; confirms `validateSkill()` is called as an opaque function, zero wiring changes needed.
- `/Users/jeremie/Projects/motto/src/frontmatter.js` — read directly; confirms `data.template` arrives as whatever `YAML.parseDocument().toJS()` resolves it to (string, null, array, object, etc.) — never pre-filtered.
- `/Users/jeremie/Projects/motto/skills/release/SKILL.md` — read directly; current body structure (Steps 1-6) that must gain `<process>`/`<success_criteria>` wrapping.
- `/Users/jeremie/Projects/motto/test/schema.test.js`, `test/dogfood.test.js` — read directly; identified the B13 landmine (Pitfall 1) and the exact dogfood assertions (Pitfall 4) that constrain the `release` skill edit.
- `/Users/jeremie/Projects/motto/.planning/superpowers/specs/2026-07-02-skill-builder-design.md` — read directly; verbatim `src/templates.js` data shape (§1), `procedure` template rules (§2), D-01..D-08 decision rationale.
- `/Users/jeremie/Projects/motto/.planning/phases/14-template-mechanism/14-CONTEXT.md` — read directly; all locked decisions copied verbatim above.
- `/Users/jeremie/Projects/motto/package.json` — read directly; confirms zero new dependencies needed/available (`yaml@2.9.0` only runtime dep).
- `/Users/jeremie/Projects/motto/.planning/config.json` — read directly; `nyquist_validation: false`, `security_enforcement: true`, `security_asvs_level: 1`.

### Secondary (MEDIUM confidence)
None — no external web sources were needed; this phase is entirely internal-codebase-grounded and required no ecosystem research (no new libraries, no framework version questions).

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, fully verified against existing `package.json` and CLAUDE.md constraints.
- Architecture: HIGH — directly extends read, verified, working code (`src/schema.js`) using its own established patterns.
- Pitfalls: HIGH — Pitfall 1 (B13 regression) and Pitfall 4 (dogfood coupling) were found by directly reading and running the existing test suite, not inferred.

**Research date:** 2026-07-03
**Valid until:** Stable — no external dependency drift risk. Re-verify only if `src/schema.js` or `test/schema.test.js` change materially before this phase is planned/executed.
