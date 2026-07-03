---
phase: quick-260703-occ
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/schema.js
  - test/schema.test.js
  - .planning/v0.0.5-MILESTONE-AUDIT.md
autonomous: true
requirements: [WR-04]
must_haves:
  truths:
    - "validateSkill never throws when a template registry entry is null, a string, a number, or an array — it accumulates a lint error and returns the errors array."
    - "The existing template cascade errors (non-string tpl, unknown tpl, requires <section>) are unchanged."
    - "doc-sync (DOC-06) stays green — the new maintainer-integrity error is NOT added to skill-schema.md and NOT to the doc-sync staticSegments allowlist."
  artifacts:
    - src/schema.js
    - test/schema.test.js
    - .planning/v0.0.5-MILESTONE-AUDIT.md
  key_links:
    - "The shape guard sits between the unknown-template check (hasOwnProperty TPL, tpl) and the `const { requiredSections, waives } = TPL[tpl]` destructure — it is the last gate before the throwing destructure."
---

<objective>
Close the WR-04 residual (carried since Phase 14, twice deferred, recorded in v0.0.5-MILESTONE-AUDIT.md): the template cascade in `src/schema.js` destructures `TPL[tpl]` without a shape guard. A null or non-object registry entry throws `Cannot read properties of null (reading 'requiredSections')` instead of accumulating a lint error, violating the module's never-throw boundary invariant.

Purpose: The never-throw property is a boundary invariant of `validateSkill` — every reachable input, including maintainer-injected or hand-edited registry shapes, must accumulate an error rather than crash. Phase 18's CR-01 fix guarded the `BASE_SPINE` key shape but not per-template entry shape; this closes the remaining gap.

Output: A shape guard before the `TPL[tpl]` destructure that emits one house-style error for a null/non-object/array entry; adversarial tests proving no-throw across null/string/number/array entries injected via the `templatesRegistry` DI seam; the audit file's WR-04 tech_debt entry marked closed with the fix commit ref.

Scope boundary: This is a maintainer-integrity hardening reachable ONLY via a hand-edit of `src/templates.js` or test-only dependency injection — never via untrusted skill-author input. It is NOT an author-facing behavior change. NO existing error string changes. The new error string is a maintainer-integrity error, NOT an author rule — it stays OUT of `shared/references/skill-schema.md` author-facing error tables and OUT of the doc-sync guarded segments.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Fix site: src/schema.js template cascade (~lines 386-410). The unguarded
# destructure is `const { requiredSections = [], waives = [] } = TPL[tpl];`
# reached only after the hasOwnProperty(TPL, tpl) check passes. Existing house
# style for shape errors: one line, quoted value/typeof, e.g.
# `template must be a string (got ${typeof tpl})`, `unknown template "${tpl}"`.
@src/schema.js

# Existing adversarial never-throw tests to extend. The `validateSkill` DI seam
# is param 3: validateSkill(skill, sharedRefs, templatesRegistry, ...). See the
# CR-01 test at ~line 590 that injects `{ SECTIONS, TEMPLATES, BASE_SPINE }`
# registry shapes and asserts assert.doesNotThrow + error accumulation.
@test/schema.test.js

# WR-04 tech_debt entry to mark closed (frontmatter `tech_debt:` list, and the
# prose summary at ~line 86).
@.planning/v0.0.5-MILESTONE-AUDIT.md

# doc-sync uses a curated `staticSegments` allowlist (code -> doc direction).
# It does NOT enumerate every err() string, so a NEW error string not added to
# the allowlist and not added to skill-schema.md leaves this test green. Do NOT
# add the new string here.
@test/doc-sync.test.js
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Guard TPL[tpl] entry shape before destructure + adversarial never-throw tests</name>
  <files>src/schema.js, test/schema.test.js</files>
  <behavior>
    - Injecting a registry whose TEMPLATES maps a known name to `null` → validateSkill does not throw; returns an errors array containing one invalid-registry-entry error for that template.
    - Same for a template entry that is a string, a number, and an array — no throw, one invalid-entry error each, the "got" descriptor reflects the actual shape (null / string / number / array).
    - A valid object entry (the real TEMPLATES.procedure) still resolves requiredSections/waives and produces the normal requires-<section> errors — behavior unchanged.
    - Existing template cascade errors are untouched: non-string `template` still yields "template must be a string (got …)"; an unknown template name still yields `unknown template "…"`.
  </behavior>
  <action>
    In the template cascade of validateSkill (src/schema.js), insert a shape guard as a new `else if` branch between the unknown-template check (`!Object.prototype.hasOwnProperty.call(TPL, tpl)`) and the `else` block that runs `const { requiredSections = [], waives = [] } = TPL[tpl];`. The guard fires when the entry is not a plain object: treat null, any non-object typeof (string, number, boolean, function), and arrays as invalid. Compute a shape descriptor — "null" for null, "array" for Array.isArray, otherwise `typeof` — and emit exactly one error via the existing `err(...)` helper using the established house style: a single line, the template name quoted, and the shape parenthesized, e.g. `template "<name>" has an invalid registry entry (got <descriptor>)`. Do NOT change the existing non-string-tpl or unknown-template error strings. Keep the guard ordered strictly before the destructure so the throwing `TPL[tpl].requiredSections` read is never reached for a bad entry. This branch is reachable only after hasOwnProperty passes, so the entry key exists but its value may be null/non-object.

    In test/schema.test.js, extend the validateSkill never-throw suite (alongside the existing CR-01 registry-injection test at ~line 590). Add a test that, for each bad entry value in [null, "role", 123, []], builds a registry `{ SECTIONS, TEMPLATES: { <name>: badEntry }, BASE_SPINE }` — import the real SECTIONS/BASE_SPINE via the DI seam or reuse the module's exports through validateSkill's third param — sets the skill's `data.template` to that name, then asserts assert.doesNotThrow, asserts the result is an array, and asserts one error message starts with `template "` and contains `has an invalid registry entry`. Also add one positive-path assertion that a valid object entry still yields the normal requires-<section> error (guard did not swallow the real cascade). Follow the existing test's DI and assertion style; do not introduce new test helpers or dependencies.

    Do NOT add the new error string to shared/references/skill-schema.md and do NOT add it to test/doc-sync.test.js staticSegments — it is a maintainer-integrity error, not an author-facing rule, so doc-sync must remain green untouched.
  </action>
  <verify>
    <automated>node --test test/schema.test.js && node --test test/doc-sync.test.js</automated>
  </verify>
  <done>The shape guard is present before the TPL[tpl] destructure; new adversarial tests pass proving no-throw + error accumulation for null/string/number/array entries and unchanged behavior for valid entries; doc-sync.test.js stays green with no edits.</done>
</task>

<task type="auto">
  <name>Task 2: Mark WR-04 tech_debt entry closed in the milestone audit</name>
  <files>.planning/v0.0.5-MILESTONE-AUDIT.md</files>
  <action>
    Update the WR-04 residual entry so it reflects closure. In the frontmatter `tech_debt:` list, edit the `14-template-mechanism` WR-04 item to state it is CLOSED by quick task 260703-occ: the template cascade now guards TPL[tpl] entry shape before destructuring, emitting `template "<name>" has an invalid registry entry (got …)` for null/non-object/array entries instead of throwing; adversarial DI tests added. Reference the fix commit ref (use the placeholder `<commit>` if the commit does not yet exist at edit time — the executor should substitute the actual short SHA after the fix is committed, or note it will be filled at commit). Also update the prose summary line (~line 86) that currently counts "1 maintainer-only shape-guard gap (WR-04 residual …)" to reflect that WR-04 is now closed, adjusting the count accordingly. Do NOT alter the Phase 16 human-verify or IN-02 items. Preserve YAML validity and existing formatting.
  </action>
  <verify>
    <automated>grep -qi "WR-04" .planning/v0.0.5-MILESTONE-AUDIT.md && grep -ci "closed" .planning/v0.0.5-MILESTONE-AUDIT.md</automated>
  </verify>
  <done>The WR-04 tech_debt entry and the prose summary both note closure with a commit reference; no other audit items changed; file remains valid YAML frontmatter + markdown.</done>
</task>

</tasks>

<verification>
- `npm test` — full suite (211 tests) green, including the new adversarial cases, schema.test.js, doc-sync.test.js, and dogfood.test.js.
- Manual read-back: the shape guard branch sits between the unknown-template check and the destructure; no existing error string was edited.
- `grep -c` confirms the new error string does NOT appear in shared/references/skill-schema.md nor in test/doc-sync.test.js staticSegments.
</verification>

<success_criteria>
- validateSkill never throws for a template registry entry that is null, a string, a number, or an array; it accumulates one house-style invalid-registry-entry error.
- All existing template cascade errors and behaviors are unchanged; the full suite stays green and husky's per-commit `npm test` passes.
- doc-sync stays green with zero edits to skill-schema.md or the doc-sync allowlist.
- The WR-04 tech_debt entry in v0.0.5-MILESTONE-AUDIT.md is marked closed with a commit reference.
</success_criteria>

<output>
Create `.planning/quick/260703-occ-close-wr-04-residual-shape-guard-tpl-ent/260703-occ-SUMMARY.md` when done.
</output>
