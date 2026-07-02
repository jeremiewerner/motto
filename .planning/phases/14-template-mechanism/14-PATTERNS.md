# Phase 14: Template Mechanism - Pattern Map

**Mapped:** 2026-07-03
**Files analyzed:** 5 (1 new, 4 modified)
**Analogs found:** 5 / 5 (all in-repo — the analog for each new/modified file is another part of the same small codebase; RESEARCH.md's Code Examples section already contains verified, phase-specific snippets, quoted below and cross-referenced to their structural precedent)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/templates.js` (new) | config / data-registry | CRUD (static lookup table) | `src/schema.js` `RESERVED` array (module-level pure-data export) | role-match |
| `src/schema.js` (extended: template cascade + `hasClosedSection`) | service / pure-validator | transform (input → errors[]) | `src/schema.js` NAME cascade (same file, same function, D-13 precedent) | exact |
| `src/lint.js` | orchestrator | request-response (in-process call) | unchanged — `processSkill()` calling `validateSkill()` | exact (no-op reference) |
| `skills/release/SKILL.md` | content/fixture (dogfood skill body) | file-I/O (static markdown, read by lint) | `skills/release/SKILL.md` itself, edited in place | exact |
| `test/schema.test.js` (extended + B13 modified) | test | request-response (unit assertions) | `test/schema.test.js` existing `it()` blocks (B-series, e.g. B13) | exact |
| `test/dogfood.test.js` (extended, verify only) | test | file-I/O (build output verification) | `test/dogfood.test.js` existing assertions (lines 35-44, 103-111) | exact |

## Pattern Assignments

### `src/templates.js` (new — config/data-registry, CRUD lookup)

**Analog:** `src/schema.js` `RESERVED` constant (module-level pure array/object export, no functions, no I/O) — see `src/schema.js:47`.

**Exact required shape** (verbatim from design spec, quoted in RESEARCH.md "Code Examples"):
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

**Purity constraint:** no functions, no filesystem/YAML imports — mirrors `src/schema.js`'s header comment ("Pure object validator — no filesystem, no YAML parsing"). TMPL-02 requires this file stay pure data so "adding a template = data-only edit."

---

### `src/schema.js` (extended — template cascade + `hasClosedSection` helper)

**Analog:** the file's own existing NAME cascade (lines 81-108) and BODY SPINE independent checks (lines 139-156).

**Imports pattern** (add to top of file, after the existing header comment, before `NAME_KEBAB`):
```javascript
import { SECTIONS, TEMPLATES } from "./templates.js";
```

**Cascade pattern to copy** (structural precedent: NAME cascade lines 84-108 — stop-at-first-failure with `err()` per branch). Concrete new code (from RESEARCH.md "Code Examples", verified against decisions):
```javascript
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
```

**Placement (critical — Pitfall 2):** this block must run and resolve `waivedSections` BEFORE the existing Title check (line 146) and Role check (line 154), so `waivedSections.has("title")` / `waivedSections.has("role")` can gate them:
```javascript
// Title check: skip if waivedSections.has("title")
if (!waivedSections.has("title")) {
  const firstNonBlankLine = bodyLines.find((l) => l.trim() !== "");
  if (!firstNonBlankLine || !/^# \S/.test(firstNonBlankLine)) {
    err("body must begin with an H1 title line (# Title) as its first non-blank line");
  }
}
// Role check: skip if waivedSections.has("role")
if (!waivedSections.has("role")) {
  if (!/^\*\*Role:/m.test(bodyStr)) {
    err("body must contain a **Role:** line");
  }
}
```

**New exported helper `hasClosedSection`** — analog: `NAME_KEBAB` export style (module-level exported regex/pure-function building block, `src/schema.js:33`). Anchored/non-backtracking regex discipline matches `T-02-01`/`T-Q-01` markers already in this file (Title check line 146, description XML check line 128):
```javascript
export function hasClosedSection(body, tagName) {
  const bodyStr = body || "";
  const lines = bodyStr.split("\n");
  const fenceRe = /^ {0,3}(`{3,}|~{3,})/;
  const unfencedLines = [];
  let inFence = false;
  for (const line of lines) {
    if (fenceRe.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) unfencedLines.push(line);
  }
  const text = unfencedLines.join("\n");
  const openRe = new RegExp(`^<${tagName}>`, "m");
  const closeRe = new RegExp(`^</${tagName}>`, "m");
  return openRe.test(text) && closeRe.test(text);
}
```
Security note: `tagName` is always internally sourced from `TEMPLATES[tpl].requiredSections` (trusted registry), never from raw `data.template` — safe to interpolate into `RegExp` (T-Q-01 precedent, confirmed in RESEARCH.md Security Domain section).

**Dependency-injection pattern for testability** (analog: existing `sharedRefs = new Set()` default parameter, `src/schema.js:74`):
```javascript
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
This lets tests exercise the `waives` merge logic via a test-only fixture template without polluting `src/templates.js` (Anti-Pattern in RESEARCH.md: "Mutating `src/templates.js` to add a test-only waiving template").

**Error-message style to copy** (analog: existing `err()` one-liners throughout the file, e.g. line 95 `name must be letter-start kebab-case...`): quoted offending value + hint, one line, no multi-line messages.

---

### `src/lint.js` — UNCHANGED

**Analog:** itself. `processSkill()` (lines 135-165) already calls `validateSkill({ dirName, data, body }, sharedRefs)` as an opaque function (line 159) inside a try/catch backstop (D2-06, lines 161-164). New template errors flow through the existing `{skill, message}` shape with zero wiring changes — confirmed no edits needed here.

---

### `skills/release/SKILL.md` (dogfood edit — content/fixture)

**Analog:** the file itself, current structure (read in full above): H1 title (`# Releasing Motto`, line 7), `**Role:**` line (line 9), then `## Step 1` … `## Step 6` prose sections (numbered, imperative, no existing `<process>`/`<success_criteria>` tags).

**Required edit:**
1. Add `template: procedure` to frontmatter (after `audience: private`, line 4).
2. Wrap the step-by-step body in `<process>` / `</process>` (bare, line-anchored, matching `^<process>` / `^</process>`) — natural wrap point is around the existing `## Step 1` through `## Step 6` sections.
3. Add a `<success_criteria>` / `</success_criteria>` section — no existing content maps to this; must be authored net-new (e.g., a checklist near the end, before or after Step 6).
4. Preserve exactly: the H1 title line, the `**Role:**` line, and all existing frontmatter keys (`name`, `description`, `audience`) — Pitfall 4 warns a dropped/misplaced key here cascades into `test/dogfood.test.js` failures (lines 35-44 assert `count: 2` and `errors: []`; lines 103-111 assert `release` has no `references/` dir — do not introduce a `shared_references` key).

**Verification requirement:** run full `node --test` after this edit, not just new template tests (Pitfall 4 — existing 131-test suite is the regression guard for this exact risk).

---

### `test/schema.test.js` (extended + B13 must be MODIFIED, not just appended to)

**Analog:** existing `it()` block style throughout the file — plain `node:test` `describe`/`it` + `node:assert`, e.g. B13 itself (lines 258-273) and the neighboring B14 boundary test (line 276+).

**Critical required change — B13 landmine (RESEARCH.md Pitfall 1):** current B13 (lines 259-273) asserts `template: "standard"` produces zero errors. This assertion becomes objectively wrong the moment template validation ships. Split into two tests:
```javascript
// (a) dependencies alone still causes no errors (D-14 still applies to that field)
it("B13a: dependencies key in data causes no errors (D-14)", () => {
  const skill = {
    dirName: "my-skill",
    data: { name: "my-skill", description: "use when X", audience: "public", dependencies: ["some-dep"] },
    body: VALID_BODY,
  };
  assert.deepEqual(validateSkill(skill), []);
});

// (b) unknown template value now correctly errors (TMPL-04 regression-proof)
it("B13b: unknown template value now errors (TMPL-04)", () => {
  const skill = {
    dirName: "my-skill",
    data: { name: "my-skill", description: "use when X", audience: "public", template: "standard" },
    body: VALID_BODY,
  };
  const errors = validateSkill(skill);
  assert.ok(errors.some((e) => /unknown template "standard"/.test(e.message)));
});
```

**Waives-fixture test pattern** (analog: dependency-injection pattern above; keep fixture OUT of `src/templates.js`):
```javascript
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
  assert.deepEqual(validateSkill(skill, new Set(), FIXTURE_TEMPLATES), []);
});
```

**Adversarial tests required (never-throw invariant, D-01, standing memory directive):** non-string `template` (number/array/object), empty-string `template`, `template: null`, object with throwing `toString`/`Symbol.toPrimitive` (to prove the `typeof tpl !== "string"` guard short-circuits before coercion — RESEARCH.md Security Domain).

---

### `test/dogfood.test.js` (extended — verify-only, no structural change to existing assertions)

**Analog:** existing assertions at lines 35-44 (`lintProject` returns `ok:true, count:2, errors:[]`) and lines 103-111 (`release` has no `references/` dir).

**New assertion to add:** after the `release` SKILL.md edit, add a targeted assertion that `template: procedure` enforcement is live on the real tree, e.g. confirm lint still passes clean post-edit (extends the existing `count: 2` / `errors: []` assertion — do not weaken it) and/or a direct read-and-check that `dist/private/release/SKILL.md` retains the `<process>`/`<success_criteria>` tags verbatim (content is copied through unchanged per project's "no content stripping" constraint).

## Shared Patterns

### Never-throw invariant (D-01)
**Source:** `src/schema.js` header comment (lines 1-11) + guard ordering throughout (e.g. line 87-91: `typeof name !== "string"` check placed BEFORE any string-only method call).
**Apply to:** All new template-validation code in `src/schema.js`. The `typeof tpl !== "string"` check must precede any `.includes`/regex/coercion call on `tpl`. Adversarial tests are mandatory, not optional (project memory: "3 violations slipped past gates in v0.0.2").

### Cascade vs. independent error aggregation (D-13)
**Source:** `src/schema.js` lines 52-61 (doc comment) and lines 81-176 (implementation: NAME cascades, DESCRIPTION/AUDIENCE/BODY/SHARED_REFERENCES run independently).
**Apply to:** The template field is its own internal cascade (non-string → stop; unknown name → stop; else check sections) but sits ALONGSIDE the other independent checks — do not nest it inside the NAME cascade or make it gate DESCRIPTION/AUDIENCE checks.

### Error message style
**Source:** every `err()` call in `src/schema.js` (e.g. line 95, line 107, line 129, line 136, line 148, line 155, line 169, line 173).
**Apply to:** New template errors — one line, quotes the offending value, states the fix/expectation. Match exact agreed wording from CONTEXT.md: `template "procedure" requires <process>…</process> section — Numbered steps the agent executes, in order.` and `unknown template "procedur" (available: procedure)`.

### Default-parameter dependency injection for testability
**Source:** `src/schema.js:74` — `validateSkill(skill, sharedRefs = new Set())`.
**Apply to:** Extend to a second injectable parameter (`templatesRegistry`) rather than a global override or test-only mutation of `src/templates.js`.

### `{skill, message}` error shape — zero wiring changes downstream
**Source:** `src/lint.js` `processSkill()` line 159-160.
**Apply to:** Confirms `src/lint.js` and `src/build.js` need NO changes this phase — template errors are already the same shape and flow through the existing aggregation/try-catch backstop.

## No Analog Found

None. All files in scope have a direct, verified in-repo or spec-verbatim analog (this is a small, mature, self-similar codebase — the phase is an additive extension of existing patterns, not new architecture).

## Metadata

**Analog search scope:** `src/` (schema.js, lint.js, templates.js-target), `skills/release/`, `test/` (schema.test.js, dogfood.test.js), `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` (design-spec verbatim data shape).
**Files scanned:** `src/schema.js` (full, 178 lines), `src/lint.js` (full, 207 lines), `skills/release/SKILL.md` (full, 116 lines), `test/schema.test.js` (B13 region + surrounding context), `test/dogfood.test.js` (grep for `release`/`count` assertions), plus RESEARCH.md and CONTEXT.md (already contain verified, phase-authored code examples — treated as primary analog source since this phase adds genuinely new mechanism with no prior direct analog beyond schema.js's own cascade style).
**Pattern extraction date:** 2026-07-03
