# Phase 6: Schema Strictness — Research

**Researched:** 2026-06-30
**Domain:** Pure-function schema validation (src/schema.js)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phase 6 = schema strictness **only**. The summary-frontmatter and doc-nit
  buckets are dropped as obsolete (target files deleted or archived). No edits to
  archived v0.0.1 docs.
- **D-02:** Backlog cleanup of the two obsolete lines was NOT selected — leave the
  ROADMAP backlog as-is.
- **D-03:** Full CLAUDE.md spec conformance for `name` + `description`. Add three new checks:
  - `description` max **1024** chars
  - `description` no XML tags
  - `name` max **64** chars
- **D-04:** `name` no-XML-tags needs no new check — the existing `NAME_KEBAB` regex
  already forbids `<` and `>`.
- **D-05:** XML tag pattern: `/<[^>]+>/` (any `<...>` pair). A description literally
  using `<placeholder>` syntax will trip it — acceptable per spec.

### Claude's Discretion

- Exact error-message wording for the three new checks.
- Cascade vs independent placement details (description length/XML run only when
  description is present; name max-64 placement within the name cascade after kebab
  passes is the planner's call).
- Whether max-1024/max-64 use `>` or `>=` boundary — pick the spec-literal reading.

### Deferred Ideas (OUT OF SCOPE)

- ROADMAP backlog still lists obsolete summary-frontmatter + doc-nit tech-debt lines.
  Left in place per D-02; a future bookkeeping pass could prune them.
</user_constraints>

---

## Summary

Phase 6 adds exactly three new validation checks to `validateSkill` in `src/schema.js`:
`description` max-1024 chars, `description` no-XML-tags, and `name` max-64 chars. The file
is a pure function (no I/O, no imports) so the change is self-contained. The D-13
cascade/independent model is already established and the new checks slot naturally into
the existing structure without redesign.

Every factual claim below is drawn directly from reading the source files in this session.
No external research is needed or warranted for this phase. [ASSUMED] is used for the one
interpretive choice (regex edge-case analysis) that cannot be confirmed by reading a spec file.

**Primary recommendation:** Add the three checks in a single `src/schema.js` edit; add
corresponding test cases B14–B17 (or higher) to `test/schema.test.js`. No other files change.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema validation | `src/schema.js` (pure function) | — | Isolated from I/O; `validateSkill` is the sole locus of field-level checks |
| Lint orchestration | `src/lint.js` | — | Calls `validateSkill`; consumes `errors[]` unchanged; zero edits this phase |
| Test coverage | `test/schema.test.js` | `test/dogfood.test.js` | Unit tests for new checks; dogfood test confirms real tree stays clean |

## Standard Stack

No package changes. The project constraint is zero runtime dependency changes. [VERIFIED: CLAUDE.md]

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | ≥ 20 | Runtime; `node:test` stdlib runner used for all tests |
| `yaml` | 2.9.0 | Already installed; not touched by this phase |
| `node:test` | stdlib | `node --test` is the test runner; test file is `test/schema.test.js` |

**Installation:** No install step. This phase edits existing files only.

## Package Legitimacy Audit

Not applicable — this phase installs no external packages. [VERIFIED: CLAUDE.md constraint]

## Architecture Patterns

### `validateSkill` — existing D-13 model (read from `src/schema.js`)

The function has two structural zones: [VERIFIED: src/schema.js]

```
validateSkill(skill, sharedRefs) {
  errors = []
  err = (msg) => errors.push({ skill: dirName, message: msg })

  // CASCADE (stops at first failure):
  if (!name)            → err("name is required")
  else if (!kebab)      → err("name must be letter-start kebab-case...")
  else if (reserved)    → err("name must not contain the reserved substrings...")
  else if (name!=dir)   → err(`name "${name}" must equal its folder name "${dirName}"`)

  // INDEPENDENT (all run regardless of each other):
  if (!description)     → err("description is required")
  if (bad audience)     → err("audience must be public|private")
  if (no H1)            → err("body must begin with an H1 title line...")
  if (no Role)          → err("body must contain a **Role:** line")
  for each shared_ref:
    if (unsafe)         → err("...unsafe basename...")
    else if (!found)    → err("...not found in shared/references/...")

  return errors
}
```

### Placement of the three new checks

**`name` max-64 — within the cascade, after kebab passes:**

The cascade uses chained `else if` blocks. Max-64 is a format/size constraint on the
`name` value, logically following "is it well-formed?" (kebab) but before "is it semantically
reserved?" or "does it match the folder?". Adding max-64 as a new else-if between the
existing kebab step and the reserved-word step is the clean insertion point. [VERIFIED: src/schema.js — cascade structure]

Proposed cascade after change:
```
if (!name)              → err("name is required")
else if (!kebab)        → err("name must be letter-start kebab-case...")
else if (name.length > 64) → err("name must not exceed 64 characters (got N)")   // NEW
else if (reserved)      → err("name must not contain reserved substrings...")
else if (name !== dir)  → err(`name "${name}" must equal its folder name "${dirName}"`)
```

**`description` length and XML — within an `else` branch of the existing presence check:**

The current check is `if (!data.description) { err("description is required"); }`.
Adding an `else` branch is the correct guard: length and XML checks are only meaningful
when the description is present and non-empty. Both run independently inside the else
(neither short-circuits the other). [VERIFIED: src/schema.js — description section]

Proposed description section after change:
```javascript
if (!data.description) {
  err("description is required");
} else {
  if (data.description.length > 1024) {
    err(`description exceeds maximum length of 1024 characters (${data.description.length})`);
  }
  if (/<[^>]+>/.test(data.description)) {
    err('description must not contain XML tags (e.g. <example>)');
  }
}
```

### `>` vs `>=` boundary

The spec says "Max 64 chars" and "Max 1024 chars" — meaning length must not EXCEED the
limit. A description of exactly 1024 characters is valid; 1025 is not. Therefore:
- `length > 64` triggers the name error (length === 64 is valid)
- `length > 1024` triggers the description error (length === 1024 is valid)

The `>=` form (`length >= 65`) is arithmetically equivalent but less directly readable
against "must not exceed max". Use `> limit`. [ASSUMED — spec is plain English "Max N chars"]

### XML regex `/<[^>]+>/` — behavior and edge cases

The locked decision D-05 specifies this exact regex. Research confirms its behavior: [VERIFIED: src/schema.js — existing regex precedents at lines 112, 120]

| Input | Matches? | Notes |
|-------|----------|-------|
| `"use <placeholder> syntax"` | yes | Intended trigger |
| `"A <br/> tag"` | yes | Self-closing matches; `/` is not `>` |
| `"if a < b then"` | no | No `>` following; `[^>]+>` requires closing `>` |
| `"if a < b > c"` | yes | `< b >` matches — b is not `>` |
| `"plain prose description"` | no | Safe |
| `"use <> tags"` | no | `[^>]+` requires ≥1 char between `<` and `>` |
| Multiline description | matches across lines | `[^>]` includes `\n`; `<foo\nbar>` matches |

The multiline case is theoretical — skill descriptions are expected to be single-line
prose. The "if a < b > c" false-positive is a known edge case per D-05 ("acceptable;
the spec says no XML tags"). [ASSUMED — edge case analysis; D-05 documents acceptance]

### Anti-Patterns to Avoid

- **Checking `name.length > 64` before the kebab check:** Would produce a max-length
  error AND a kebab error for a name like `"ABCDEFG..." (65 uppercase)`. The cascade
  stops at first failure; max-64 must come after the kebab guard.
- **Running description length/XML checks when description is falsy:** `(null).length`
  throws. Guard both new checks inside the `else` branch of the existing presence check.
- **Using `>=` instead of `>`:** `name.length >= 65` is correct but `name.length > 64`
  is the idiomatic form that reads directly against "must not exceed 64."

## Don't Hand-Roll

This phase has no complex subsystems to avoid. All three checks are 1–2 lines each using
JS builtins (`String.length`, `RegExp.test`). No library needed.

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Length check | Complex iteration | `str.length > limit` |
| XML detection | Custom parser | `/<[^>]+>/` as locked in D-05 |

## Runtime State Inventory

Not applicable. This is a pure-function code change with no stored data, live service
config, OS-registered state, secrets, or build artifacts affected.

## Common Pitfalls

### Pitfall 1: Cascade order — max-64 must follow kebab check

**What goes wrong:** Placing `name.length > 64` before the kebab check causes a valid
63-char kebab name to never reach the reserved-word check AND causes a 65-char
non-kebab name to generate two errors instead of one.
**Why it happens:** Misreading the cascade as independent checks.
**How to avoid:** Insert max-64 as the third `else if` — after kebab, before reserved.
**Warning signs:** Test B5 (`claude-helper`) would report both a length error AND a
reserved-word error if placement is wrong.

### Pitfall 2: Description checks run on falsy description

**What goes wrong:** `data.description.length` throws TypeError if description is
`undefined`, `null`, or `""`.
**Why it happens:** Adding checks alongside the existing `if (!data.description)` rather
than inside its `else` branch.
**How to avoid:** The else branch of the existing presence check is the natural guard.
The B7 test (missing description) would now pass because the presence check fires first.

### Pitfall 3: Off-by-one on boundary value

**What goes wrong:** `length >= 1024` rejects a 1024-character description that the
spec permits.
**How to avoid:** Use `> 1024` and `> 64`. Add an explicit boundary test case (exactly
at limit, exactly one over limit) to the test suite.

### Pitfall 4: B1 happy-path test starts failing

**What goes wrong:** The B1 happy-path test uses `description: "use when X"` (10 chars,
no XML tags) — it passes both new checks. However, if the new checks are accidentally
placed OUTSIDE the `else` branch (i.e., always running), a falsy description would
attempt `undefined.length` and throw, breaking B1 and B7.
**How to avoid:** Keep both new checks strictly inside the `else` block.

### Pitfall 5: Dogfood regression

**What goes wrong:** Adding the new checks could cause `dogfood.test.js` to fail if
any real skill has a long or XML-laden description.
**Confirmed safe:** All three Motto skill descriptions measured at 146, 166, and 158
chars (all well under 1024) and contain no XML tag patterns. All three skill names are
17, 19, and 13 chars (all well under 64). [VERIFIED: skills/*/SKILL.md — measured via node]

## Code Examples

### Existing cascade structure (context for insertion point)
```javascript
// Source: src/schema.js lines 73-92
const name = data.name;
if (!name) {
  err("name is required");
} else if (!NAME_KEBAB.test(name)) {
  err(
    `name must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/): "${name}"`
  );
} else if (RESERVED.some((r) => name.includes(r))) {
  err(
    `name must not contain the reserved substrings "anthropic" or "claude": "${name}"`
  );
} else if (name !== dirName) {
  err(`name "${name}" must equal its folder name "${dirName}"`);
}
```

Max-64 slots in as the new third `else if`, between the kebab check and the reserved
check.

### Existing description section (context for description additions)
```javascript
// Source: src/schema.js lines 94-97
if (!data.description) {
  err("description is required");
}
```

The two new description checks slot into a new `else` branch on this block.

### Existing error-message style (for wording consistency)
```javascript
// Short and imperative, no trailing period:
"name is required"
"description is required"
`name must be letter-start kebab-case (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/): "${name}"`
`name "${name}" must equal its folder name "${dirName}"`
"audience must be public|private"
```

New messages should follow this pattern — state the constraint, include the offending
value or actual length when useful.

### Existing test structure (for new case numbering)
```javascript
// Source: test/schema.test.js — B1 through B13 + NAME_KEBAB test
// 14 tests in schema.test.js; 65 total suite-wide (node --test from repo root)
// New cases: B14, B15, B16, B17 (minimum — one per new check + boundary/independence tests)
```

## Test Case Map

New test cases required in `test/schema.test.js`:

| ID | Behavior | What to assert |
|----|----------|----------------|
| B14 | `description` exactly 1024 chars → valid | `errors === []` |
| B15 | `description` 1025 chars → reports length error | 1 error, message includes "1024" |
| B16 | `description` with `<example>` → reports XML error | 1 error, message references XML tags |
| B17 | `name` exactly 64 chars (valid kebab) → valid | `errors === []` |
| B18 | `name` 65 chars (valid kebab pattern) → reports max-length error, cascade stops | 1 error from length check; no reserved/folder errors |
| B19 | `description` over-length AND contains XML → both reported independently | 2 description errors |

B18 is the cascade-stop guard — confirms max-64 halts the cascade (no reserved-word or
folder error). This is the structural correctness proof for the placement decision.

B19 confirms the two description checks are independent within the else branch (both
run even if one fires).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (stdlib, Node ≥ 20) |
| Config file | none — zero-config |
| Quick run command | `node --test test/schema.test.js` |
| Full suite command | `node --test` (from repo root, auto-discovers all `*.test.js`) |

### Phase Requirements → Test Map

This phase has no formal requirement IDs assigned (internal tech debt). The behavioral
requirements map as:

| Behavior | Test Type | Automated Command |
|----------|-----------|-------------------|
| `description` ≤ 1024 chars enforced | unit | `node --test test/schema.test.js` |
| `description` no XML tags enforced | unit | `node --test test/schema.test.js` |
| `name` ≤ 64 chars enforced | unit | `node --test test/schema.test.js` |
| Real Motto skills pass new checks | regression | `node --test test/dogfood.test.js` |

### Sampling Rate

- Per-task commit: `node --test test/schema.test.js`
- Phase gate: `node --test` (full 65+ test suite, zero failures)

### Wave 0 Gaps

None — the test file (`test/schema.test.js`) exists and is healthy. New cases B14–B19
are additions, not infrastructure.

## Security Domain

Not applicable. This phase validates string lengths and a simple regex on developer-authored
YAML frontmatter fields. There is no user input boundary, no network I/O, and no persistent
state. The existing `T-02-01` (catastrophic backtracking) and `T-02-02` (path traversal)
controls in `src/schema.js` are not touched.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `>` vs `>=` boundary — "Max N chars" means `length > N` is the error (so N is valid) | Architecture Patterns | Off-by-one: a 64-char name or 1024-char description would be incorrectly rejected |
| A2 | XML regex false-positive for `"a < b > c"` is acceptable per D-05 | Architecture Patterns | Low risk — the spec explicitly accepts this tradeoff (D-05) |
| A3 | Multiline descriptions with `<foo\nbar>` would match `/<[^>]+>/` | Architecture Patterns | Theoretical edge case; real descriptions are single-line prose |

## Open Questions

None. The scope is fully locked by CONTEXT.md decisions and the codebase is fully read.
All three checks, their placement, and their boundary conditions are determinable from
the existing code and spec.

## Environment Availability

Not applicable — this phase makes no use of external tools, services, or CLIs beyond
`node --test` which is already confirmed working (65 tests pass).

## Sources

### Primary (HIGH confidence)
- `src/schema.js` — read in full; cascade structure, existing checks, NAME_KEBAB, `err()` helper all verified directly [VERIFIED: src/schema.js]
- `test/schema.test.js` — read in full; test ID numbering (B1–B13), conventions, import structure verified [VERIFIED: test/schema.test.js]
- `test/dogfood.test.js` — read in full; confirms count=3, skill names, in-place lint vs isolated build pattern [VERIFIED: test/dogfood.test.js]
- `skills/*/SKILL.md` frontmatter — measured description lengths (146, 166, 158 chars) and name lengths (17, 19, 13 chars) via `node -e` [VERIFIED: measured 2026-06-30]
- `.planning/phases/06-.../06-CONTEXT.md` — locked decisions D-01 through D-05 and discretion areas [VERIFIED: 06-CONTEXT.md]
- `.claude/CLAUDE.md` — SKILL.md frontmatter spec table (name max 64, description max 1024, no XML tags) [VERIFIED: CLAUDE.md]

### Tertiary (LOW confidence)
- A1–A3 in Assumptions Log — interpretive claims about spec boundary reading and regex behavior

## Metadata

**Confidence breakdown:**
- Existing code structure: HIGH — read directly from src/schema.js
- Insertion placement: HIGH — cascade structure is explicit in the source
- Dogfood safety: HIGH — measured from actual SKILL.md files
- Boundary (`>` vs `>=`): ASSUMED — plain-English spec reading
- XML regex edge cases: ASSUMED — standard JS regex behavior analysis

**Research date:** 2026-06-30
**Valid until:** No expiry — internal codebase research; valid until the code changes
