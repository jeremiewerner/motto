---
phase: 14-template-mechanism
reviewed: 2026-07-02T23:12:26Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - skills/release/SKILL.md
  - src/schema.js
  - src/templates.js
  - test/dogfood.test.js
  - test/schema.test.js
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-07-02T23:12:26Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the phase-14 template mechanism: the pure-data registry (`src/templates.js`), the fence-aware `hasClosedSection` scanner and template cascade in `src/schema.js`, the live adoption in `skills/release/SKILL.md`, and the test additions. Every suspected defect below was **reproduced empirically** (Node one-liners against the actual modules), not inferred from reading. Full suite passes (153/153), the TMPL-05 regression contract (no `template:` key → v0.0.4-identical behavior) holds, the `hasOwnProperty` guard correctly rejects prototype-chain template names (`__proto__`, `constructor`), and the release SKILL.md's fences are balanced with all four section tags unfenced.

However, the new scanner has two correctness gaps (no open/close ordering, naive fence toggling that does not match the CommonMark semantics its comment claims), and the template cascade has **three demonstrated throw paths** through the registry surface — a direct violation of the project's standing never-throw invariant (D-01) on the exact API (`templatesRegistry` injection / data-only `templates.js` edits) that `templates.js` advertises as safe to modify. A pre-existing but in-scope hole also lets non-string `description` values lint clean.

No security vulnerabilities: `tagName` is never sourced from author-controlled `data.template` (verified), no injection path from skill content into `new RegExp` exists today.

## Warnings

### WR-01: `hasClosedSection` returns true when the close tag precedes the open tag — no pair exists

**File:** `src/schema.js:77-79`
**Issue:** The function tests presence of `^<tag>` and `^</tag>` independently and never checks ordering. A body of `</process>\n<process>\n` returns `true` (reproduced), so `template: procedure` lints clean on a body with no actual closed section. The JSDoc and TMPL-03 both promise a "matched … pair"; this is a false pass in the mechanism whose rigor is the product.
**Fix:**
```js
const openMatch = openRe.exec(text);
const closeMatch = closeRe.exec(text);
return !!openMatch && !!closeMatch && openMatch.index < closeMatch.index;
```

### WR-02: Fence scanner toggles on any 3+ backtick/tilde line — does not track fence character or length, contradicting its "CommonMark fence semantics" claim

**File:** `src/schema.js:66-73`
**Issue:** `inFence` flips on *every* line matching `/^ {0,3}(`{3,}|~{3,})/`, regardless of which character opened the fence. In CommonMark, a `~~~` line inside a ```` ``` ```` fence is literal content, and a closing fence must use the same character with at least the opening's length. Reproduced: a body where `<process>…</process>` sits inside a backtick fence after a stray `~~~` content line returns `true` — the fenced tags are counted as real, satisfying the template check falsely. The converse (real tags after such a block being miscounted as fenced → spurious lint error) also follows. The comment at line 45-47 overstates conformance.
**Fix:** Track the opening fence's character and length; only close on a line with the same character, `>=` length, and toggle only then:
```js
let fence = null; // { ch, len } | null
const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
if (m) {
  const ch = m[1][0], len = m[1].length;
  if (!fence) { fence = { ch, len }; continue; }
  if (ch === fence.ch && len >= fence.len) { fence = null; continue; }
  // otherwise: content line inside the fence — fall through to the inFence skip
}
```

### WR-03: Unescaped `tagName` interpolated into `new RegExp` — registry section names with regex metacharacters make `validateSkill` throw (D-01 violation)

**File:** `src/schema.js:77-78` (reached via `validateSkill` at `src/schema.js:227`)
**Issue:** Reproduced: an injected registry with `requiredSections: ["a(b"]` throws `SyntaxError: Invalid regular expression: /^<a(b>/m: Unterminated group` straight out of `validateSkill`. The JSDoc (lines 54-57) argues safety because `tagName` comes from the "trusted internal registry" — but (a) `templatesRegistry` is an injectable public parameter of `validateSkill`, and (b) `templates.js` explicitly advertises "Adding a template is a data-only edit to this file; no linter code change is required," making a metacharacter section name a plausible maintainer edit. A section name containing `.` would not throw but would silently change match semantics. This violates the standing validators-never-throw invariant on an input surface the design invites people to modify.
**Fix:** Escape before interpolation in `hasClosedSection`:
```js
const safe = String(tagName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const openRe = new RegExp(`^<${safe}>`, "m");
const closeRe = new RegExp(`^</${safe}>`, "m");
```

### WR-04: Template cascade destructures/iterates registry entries without shape guards — malformed entries throw TypeError (D-01 violation)

**File:** `src/schema.js:224-226`
**Issue:** Two more reproduced throw paths through the same registry surface as WR-03:
- `TEMPLATES: { t: null }` → `TypeError: Cannot read properties of null (reading 'requiredSections')` at the destructure on line 224.
- `TEMPLATES: { t: { requiredSections: [], waives: 5 } }` → `TypeError: number 5 is not iterable` at `new Set(waives)` on line 225.
A non-array `requiredSections` (e.g. a number) would likewise throw in the `for…of`. The cascade guards `data.template` exhaustively (non-string, unknown, throwing `toString`) but trusts the registry side completely, even though it is injectable and data-editable.
**Fix:** Normalize defensively before use:
```js
const entry = TPL[tpl];
const requiredSections = Array.isArray(entry?.requiredSections) ? entry.requiredSections : [];
const waives = Array.isArray(entry?.waives) ? entry.waives : [];
waivedSections = new Set(waives);
```

### WR-05: Non-string truthy `description` values validate clean

**File:** `src/schema.js:172-192`
**Issue:** Reproduced: `description: 42`, `true`, `["a"]`, and `{a: 1}` all return `[]` (fully valid). The truthiness gate passes, `.length` is `undefined` on numbers/booleans (so the 1024 check silently skips), and the XML regex test coerces harmlessly. `name` (line 148) and `template` (line 215) both received explicit non-string type guards; `description` — a Claude Code spec field that must be a non-empty string ≤1024 chars — has none, so a skill with a YAML list or map description lints clean and ships a spec-violating plugin. (Pre-existing, but squarely inside the reviewed file and inconsistent with the guards added this phase.)
**Fix:** Mirror the name guard:
```js
if (!data.description) {
  err("description is required");
} else if (typeof data.description !== "string") {
  err(`description must be a string (got ${typeof data.description})`);
} else {
  // existing length + XML checks
}
```

## Info

### IN-01: `templates.js` doc drift — `waives` described as "future/unused" but it is implemented; `requiredFields` is silently ignored

**File:** `src/templates.js:15-16,27`
**Issue:** The header and the `procedure` comment call `requiredFields` and `waives` "future keys." `waives` is live: `src/schema.js:224-225` consumes it and tests exercise it. `requiredFields` genuinely has no consumer — a registry author declaring it would get zero enforcement with no warning. Waive values are also unvalidated (`waives: ["Title"]` silently no-ops; only `"title"`/`"role"` do anything).
**Fix:** Update the comments to state `waives` is implemented (waivable values: `"title"`, `"role"`) and `requiredFields` is reserved/unimplemented.

### IN-02: Stale step numbering in NAME cascade comments

**File:** `src/schema.js:154,159,162,167`
**Issue:** Two branches are both labeled "Step 3" (kebab and max-64), so the reserved-word and folder checks are mislabeled "Step 4"/"Step 5" (they are steps 5 and 6 of the cascade).
**Fix:** Renumber the comments.

### IN-03: Non-string `shared_references` entries produce a misleading "not found" error

**File:** `src/schema.js:264-275`
**Issue:** An entry like `123` or `null` skips the string-only safe-basename check and falls into `sharedRefs.has(entry)`, yielding `shared_references entry "123" not found in shared/references/` — the real problem (wrong type) is never stated. No throw, but the diagnostic misdirects the author.
**Fix:** Add an explicit `typeof entry !== "string"` branch reporting a type error before the membership check.

### IN-04: Release skill prose omits CHANGELOG from the tarball allowlist recap

**File:** `skills/release/SKILL.md:86` (script at line 71)
**Issue:** The Step 4 script auto-includes `CHANGELOG`, but the explanatory sentence lists only "`package.json`, `README`, `LICENSE`" — a maintainer eyeballing output against the prose would flag a CHANGELOG file as a leak.
**Fix:** Add `CHANGELOG` to the prose list.

### IN-05: Template-requires message degrades ungracefully when `SECTIONS` lacks the entry

**File:** `src/schema.js:229`
**Issue:** `${SEC[section] ?? ""}` leaves a dangling `— ` suffix when a required section has no `SECTIONS` description, and the lookup is an unguarded inherited-property access (e.g. `SEC["constructor"]` would interpolate a function's source into the error message).
**Fix:** `const desc = Object.prototype.hasOwnProperty.call(SEC, section) ? SEC[section] : null;` then append `— ${desc}` only when `desc` is a string.

### IN-06: `validateSkill` throws on `data: null`/`undefined` despite an unconditional "NEVER throws" header

**File:** `src/schema.js:6,144`
**Issue:** `data.name` on line 144 throws if `data` is nullish. In practice `parseFrontmatter` normalizes `data` to `{}` (frontmatter.js:129-131) and `processSkill` has a backstop catch, so the lint path is safe — but the module header claims "NEVER throws (D-01)" without qualifying the input contract, and `validateSkill` is a public export callable directly.
**Fix:** Either open with `const data = skill?.data ?? {};` (one line, closes the hole) or qualify the JSDoc contract to state `data` must be a plain object.

---

_Reviewed: 2026-07-02T23:12:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
