---
phase: quick-260630-vzh-review-fixes
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/schema.js
  - src/frontmatter.js
  - src/config.js
  - test/schema.test.js
  - test/frontmatter.test.js
  - test/config.test.js
  - test/dogfood.test.js
  - shared/references/skill-schema.md
autonomous: true
requirements:
  - REVIEW-01   # schema.js never-throw on non-string name
  - REVIEW-02   # frontmatter.js never-throw on frontmatter-block alias (safe-toJS)
  - REVIEW-03   # config.js never-throw on alias (shared safe-toJS)
  - REVIEW-04   # schema.js XML-tag false positive
  - REVIEW-05   # frontmatter.js over-broad stray catch
  - REVIEW-06   # schema.test.js vacuous B18
  - REVIEW-07   # never-throw regression tests
  - REVIEW-08   # skill-schema.md stale max-64 claim
  - REVIEW-09   # skill-schema.md cascade-order table
  - REVIEW-10   # skill-schema.md description lint errors
  - REVIEW-11   # config.js NAME_KEBAB single source + DOG-04 parity

must_haves:
  truths:
    - "validateSkill never throws for a non-string name (true / false / 123 / [] / {}) — it returns errors[]"
    - "parseFrontmatter never throws on an unresolved YAML alias in the frontmatter block — it returns errors[]"
    - "loadConfig never throws on an unresolved YAML alias — it returns errors[]"
    - "A leaked second frontmatter mapping whose value is an alias is still reported as a stray-delimiter error"
    - "The description XML check flags real tags (<example>, </p>) but not comparison/math text (a<b and b>c)"
    - "B18 fails if the max-64 cascade step is regressed to an independent if (cascade-stop is genuinely proven)"
    - "node --test is green with a test count strictly greater than 71"
    - "node bin/motto.js lint exits 0 and reports 3 skills OK"
  artifacts:
    - src/schema.js
    - src/frontmatter.js
    - src/config.js
    - test/schema.test.js
    - test/frontmatter.test.js
    - test/config.test.js
    - test/dogfood.test.js
    - shared/references/skill-schema.md
  key_links:
    - "safeToJS is defined and exported by src/frontmatter.js and imported by src/config.js (one helper, no new dependency)"
    - "NAME_KEBAB is imported by src/config.js from src/schema.js (single source of truth; DOG-04 guards identity)"
---

<objective>
Post-merge hardening of v0.0.2 on the fix branch `gsd/v0.0.2-review-fixes`. Close all 10 findings from
the high-effort code review of the v0.0.2 merge (tracked here as REVIEW-01 .. REVIEW-11) without changing
CLI or build behavior beyond the fixes.

The non-negotiable invariant: validators and parsers NEVER throw — every failure surfaces through the
returned errors[] (CLAUDE.md D-01). Three findings break it; the rest tighten an over-loose XML matcher,
an over-broad catch, a vacuous test, missing regression coverage, a stale bundled reference doc, and a
duplicated regex literal.

Purpose: restore the never-throw guarantee, eliminate the XML/stray false positives, and make the bundled
skill-schema.md reference tell the truth about the validator.
Output: 3 hardened src/ files, 4 updated/extended test files, 1 corrected reference doc.

Scope is strictly src/ + test/ + shared/references/skill-schema.md. No new dependencies. Do NOT switch
branches — work on the current branch.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.claude/CLAUDE.md

# Source under repair
@src/schema.js
@src/frontmatter.js
@src/config.js

# Tests to fix / extend
@test/schema.test.js
@test/frontmatter.test.js
@test/config.test.js
@test/dogfood.test.js

# Bundled reference doc to correct
@shared/references/skill-schema.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Never-throw hardening — name-type guard + shared safe-toJS helper (REVIEW-01, REVIEW-02, REVIEW-03)</name>
  <files>src/schema.js, src/frontmatter.js, src/config.js</files>
  <behavior>
    - validateSkill({ data: { name: true }, ... }) returns an array and does not throw; the single name error is the non-string-name error.
    - Same for name 123, [], and {} (all truthy non-strings) — non-string-name error, no throw.
    - name false / 0 / "" still produce "name is required" (unchanged), no throw.
    - parseFrontmatter("---\ndescription: *foo\n---\n# body") returns { data, body, errors } with errors.length > 0 and does not throw; data is {}.
    - loadConfig("name: *foo\nversion: 0.1.0\ndescription: d\nplugins:\n  public: poems\n") returns { config, errors } with errors.length > 0 and does not throw.
    - All 71 pre-existing tests stay green.
  </behavior>
  <action>
    (a) src/schema.js name cascade (the `const name = data.name` block, currently ~75-95). Insert a string-type
    guard as the SECOND cascade step, BEFORE the `NAME_KEBAB.test(name)` call, so no `.test`/`.includes`/`.length`
    is ever reached with a non-string. Keep `if (!name) err("name is required")` as step 1 (this already covers
    false, 0, "", null, undefined). Add `else if (typeof name !== "string")` as step 2 that pushes one clean error
    such as `name must be a string (got <typeof>)` and stops the cascade. The existing kebab / max-64 / reserved /
    folder branches shift down one step but remain `else if` (cascade preserved). Rationale: `name: true` parses to a
    YAML boolean; `NAME_KEBAB.test(true)` coerces to "true" and passes, then `name.includes(...)` throws because
    booleans have no `.includes`. Per CLAUDE.md D-01 the validator must never throw.

    (b) src/frontmatter.js — introduce ONE shared, exported helper `safeToJS(doc)` at module scope. It tries
    `doc.toJS()` and returns `{ value, threw: false, message: null }`; on any caught exception it returns
    `{ value: null, threw: true, message: String(e?.message || e) }`. It NEVER throws. Use it at the MAIN block
    toJS site (currently ~98, `let data = doc.toJS()`): destructure `{ value, threw, message }`; if `threw`, push
    `{ message }` into errors[]; then set `data = value` and coerce to `{}` when value is null / non-object / array
    (preserve the existing D-07 empty-block-yields-{} behavior). This closes the unresolved-alias throw for a
    frontmatter block like `description: *foo` (which parses with doc.errors.length === 0, then toJS throws).
    Do NOT touch the stray-detection toJS at ~73 in this task — that site is converted to node-shape detection in
    Task 2, which removes its toJS call entirely.

    (c) src/config.js — `import { safeToJS } from "./frontmatter.js";` and replace the unguarded `doc.toJS()`
    (currently ~76) with it. On `threw`, push `{ message }` into errors[]; set `config = value` when value is a
    non-null object, else `{}`. Reuse the exported helper rather than re-implementing — one helper, no new
    dependency (CLAUDE.md D-01). Note: config.js already wraps `parseDocument` in a try/catch; only the toJS call
    is unguarded, and that is the one this fixes.
  </action>
  <verify>
    <automated>node --test test/schema.test.js test/frontmatter.test.js test/config.test.js</automated>
  </verify>
  <done>validateSkill returns errors[] without throwing for name true/false/123/[]/{}; parseFrontmatter with a frontmatter-block alias and loadConfig with an alias both return errors[] without throwing; safeToJS is exported from src/frontmatter.js and imported by src/config.js; all pre-existing tests pass.</done>
</task>

<task type="auto">
  <name>Task 2: Tighten matchers — XML-tag regex + node-shape stray detection (REVIEW-04, REVIEW-05)</name>
  <files>src/schema.js, src/frontmatter.js</files>
  <action>
    (a) src/schema.js description XML check (currently ~109). Replace the over-loose pattern `/<[^>]+>/` with
    `/<\/?[a-zA-Z][a-zA-Z0-9-]*\s*\/?>/`. This matches real tag-shapes only: optional `/`, a letter-led tag name,
    optional trailing whitespace and optional self-close `/`, then `>`. Verified behavior — comparison/math prose
    such as `a<b and b>c` and `x < y > z` is NOT flagged; real tags `<example>`, `<placeholder>`, `</p>`, `<br/>`
    ARE flagged. The two adjacent quantifiers (`[a-zA-Z0-9-]*` and `\s*`) range over disjoint character classes, so
    there is no catastrophic backtracking (ReDoS-safe). Update the D-05 comment above the check so it describes the
    new tag-shape pattern and its rationale (no longer "any `<...>` span"). Do NOT place the literal `<example>` from
    the error message into any negative-grep context — it stays only inside the existing user-facing error string.

    (b) src/frontmatter.js stray detection (currently ~65-88). Remove the over-broad `try { regionValue =
    regionDoc.toJS() } catch (_) { regionValue = null }` block entirely. Decide leaked-mapping-ness from the parsed
    NODE SHAPE instead of from toJS: treat the region as a leaked frontmatter mapping iff
    `regionDoc.errors.length === 0 && YAML.isMap(regionDoc.contents) && regionDoc.contents.items.length > 0`
    (YAML.isMap is available on the default `YAML` import already in scope). This achieves two things at once:
    it removes the unguarded toJS (leaving zero unguarded toJS calls anywhere — the main block is guarded by
    safeToJS from Task 1), AND it fixes the silent-skip bug — a leaked mapping whose value is an unresolved alias
    (e.g. `key: *foo`, which has errors.length 0 and isMap contents but throws on toJS) is now correctly flagged,
    because node-shape detection never calls toJS and so never swallows the alias throw. Body text and horizontal
    rules resolve to Scalar contents (not isMap) and stay unflagged; the B8 region (`**Role:**` line) resolves to
    Alias contents with errors.length 1 and stays unflagged. Update the surrounding comment to describe node-shape
    detection rather than the toJS/catch approach.
  </action>
  <verify>
    <automated>node --test test/schema.test.js test/frontmatter.test.js</automated>
  </verify>
  <done>Description text `a<b and b>c` is not flagged while `<example>`/`</p>` are; a leaked second mapping containing an alias value is reported as a stray-delimiter error; no unguarded toJS remains in src/frontmatter.js; B6/B7/B8/B16/B19 stay green.</done>
</task>

<task type="auto">
  <name>Task 3: Test fixes — rebuild vacuous B18 + add never-throw regressions (REVIEW-06, REVIEW-07)</name>
  <files>test/schema.test.js, test/frontmatter.test.js, test/config.test.js</files>
  <action>
    (a) Rebuild B18 in test/schema.test.js (currently ~333). The old case (name = "a"×65 with matching dirName) has
    no reserved substring and matches its folder, so the asserted-absent reserved/folder errors could never fire —
    vacuous. Replace it with a name that WOULD trip BOTH the reserved-substring step AND the folder-mismatch step if
    the cascade did not stop at max-64: use name = `"claude-" + "a".repeat(58)` (length 65, valid kebab, contains the
    reserved substring "claude") with `dirName: "different-folder"`. Assert exactly ONE error, and that its message
    references the 64 limit; assert NO reserved-word error and NO folder-mismatch error are present. This test FAILS
    if the max-64 check is regressed from `else if` to an independent `if` (then reserved + folder errors would also
    fire and the count would exceed 1) — that is the cascade-stop proof. Leave B17 (64-char valid boundary) intact.

    (b) Add a never-throw regression test to test/schema.test.js: validateSkill with a non-string name. Iterate over
    `true`, `123`, `[]`, `{}` (all truthy non-strings): for each, wrap the call in `assert.doesNotThrow`, assert the
    result is an array, and assert it contains a name error (the non-string-name message). Add `false` as a separate
    assertion expecting the "name is required" message. Follow the existing B-NN style and VALID_BODY constant.

    (c) Add a never-throw regression test to test/frontmatter.test.js: parseFrontmatter with an unresolved alias in
    the FRONTMATTER block — input `"---\ndescription: *foo\n---\n# body"`. Wrap in `assert.doesNotThrow`, assert
    `errors.length > 0`, and assert `data` is `{}`. Add a second test that a leaked second mapping containing an
    alias value — input `"---\nname: x\n---\nleaked: *foo\n---\n# body"` — is reported as a stray-delimiter error
    (errors include a message matching /stray/i), guarding the Task 2 node-shape fix. Match the existing B-NN style.

    (d) Add a never-throw regression test to test/config.test.js: loadConfig with an unresolved alias — input
    `"name: *foo\nversion: 0.1.0\ndescription: d\nplugins:\n  public: poems\n"`. Wrap in `assert.doesNotThrow` and
    assert `errors.length > 0`. Match the existing C-NN style and VALID_TEXT convention.
  </action>
  <verify>
    <automated>node --test</automated>
  </verify>
  <done>node --test is green with a total test count strictly greater than 71; B18 reports exactly one (max-64) error and would fail if the cascade step became an independent if; the three new never-throw regression groups pass.</done>
</task>

<task type="auto">
  <name>Task 4: Doc refresh + NAME_KEBAB single source (REVIEW-08, REVIEW-09, REVIEW-10, REVIEW-11)</name>
  <files>shared/references/skill-schema.md, src/config.js, test/dogfood.test.js</files>
  <action>
    (a) shared/references/skill-schema.md ~20: the bullet says max-64 is "not enforced by Motto validator v0.0.2".
    That is false — it IS enforced (Phase 6, the max-64 cascade step). Replace the parenthetical so it states the
    validator enforces the 64-character maximum as a cascade step.

    (b) skill-schema.md cascade table ~25-30: fix it to the real five-step order — (1) `name` is missing/empty/
    non-string → `name is required` (note non-string names are rejected here too), (2) fails the kebab regex, (3)
    exceeds 64 characters → `name must not exceed 64 characters (got N): "X"`, (4) contains a reserved substring,
    (5) does not match the folder. Insert the missing max-64 row in the correct position (between non-kebab and
    reserved-substring) so the table matches src/schema.js exactly.

    (c) skill-schema.md description section ~47-50: remove the "not enforced by Motto validator v0.0.2" claim on the
    max-1024 bullet (it IS enforced), and list the two description lint errors beside the existing
    `description is required`: `description must not exceed 1024 characters (got N)` and the XML-tags error
    `description must not contain XML tags (e.g. <example>)`. Keep the file's "all claims are derived from
    src/schema.js" promise true — every listed message must match the current src/schema.js strings.

    (d) src/config.js ~13-35: delete the duplicated `export const NAME_KEBAB = /.../;` literal and its now-redundant
    "intentional duplicate" comment block. Replace with `import { NAME_KEBAB } from "./schema.js";` near the top, and
    re-export it (`export { NAME_KEBAB };`) so config.js's public surface — relied on by the dogfood DOG-04 import —
    is preserved. schema.js has no imports, so there is no circular dependency. Leave a one-line comment noting
    src/schema.js is the sole source of NAME_KEBAB.

    (e) test/dogfood.test.js DOG-04 (~18-32): with config.js now re-exporting schema.js's regex, the two imports are
    the SAME RegExp instance, so the existing `.source` / `.flags` equality is trivially true. Update DOG-04 to
    meaningfully guard a single source: assert `schemaKebab === configKebab` (reference identity), proving config.js
    re-exports schema.js's regex rather than holding a separate copy. Update the comment to explain the identity
    assertion. Keep the import lines (both already import NAME_KEBAB from their modules).
  </action>
  <verify>
    <automated>node --test test/dogfood.test.js test/config.test.js test/schema.test.js</automated>
  </verify>
  <done>skill-schema.md matches src/schema.js (max-64 enforced, five-step cascade table, both description lint errors listed); src/config.js imports and re-exports NAME_KEBAB from src/schema.js with no circular import; DOG-04 asserts RegExp identity; dogfood build/bundle existence assertions stay green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SKILL.md / motto.yaml content → parser+validator | Untrusted authored YAML/Markdown crosses into parseFrontmatter, validateSkill, and loadConfig |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-Q-01 | Denial of Service | src/schema.js description XML check | medium | mitigate | Replace `/<[^>]+>/` with `/<\/?[a-zA-Z][a-zA-Z0-9-]*\s*\/?>/`; adjacent quantifiers over disjoint classes — no catastrophic backtracking (Task 2a) |
| T-Q-02 | Denial of Service | validators/parsers throwing on hostile input | high | mitigate | Restore never-throw: non-string-name guard (Task 1a), shared safe-toJS at main-block + config toJS (Task 1b/1c), node-shape stray detection with no toJS (Task 2b) |
| T-Q-03 | Tampering | shared_references path traversal | low | accept | Already mitigated in v0.0.2 (safe-basename check precedes membership); out of scope for this fix batch, no regression introduced |
| T-Q-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package installs in this plan — src/test/doc edits only, zero new dependencies |
</threat_model>

<verification>
- `node --test` is green; total test count is strictly greater than 71 (new guard tests added in Task 3).
- `node bin/motto.js lint` exits 0 and prints `✓ 3 skills OK`.
- Targeted never-throw: validateSkill `name: true`, parseFrontmatter frontmatter-block alias, and loadConfig alias all return errors[] without throwing.
- B18 reports exactly one (max-64) error and would fail if max-64 became an independent `if`.
- Dogfood lint+build assertions and DOG-04 identity assertion are green after the skill-schema.md and config.js edits.
</verification>

<success_criteria>
All 10 review findings (REVIEW-01 .. REVIEW-11) closed: the never-throw invariant holds across schema/frontmatter/config; the XML and stray matchers reject false positives while catching real tags and leaked mappings; B18 proves cascade-stop; new regression tests cover the three never-throw holes; skill-schema.md tells the truth about the validator; NAME_KEBAB has a single source. Suite green with count > 71, lint clean.
</success_criteria>

<output>
Create `.planning/quick/260630-vzh-review-fixes/SUMMARY.md` when done.
</output>
