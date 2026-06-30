---
phase: quick-260630-uxc-standardize-skill-names
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - skills/authoring-a-skill/SKILL.md
  - skills/motto-project-setup/SKILL.md
  - skills/motto-release/SKILL.md
  - test/dogfood.test.js
autonomous: true
requirements: [UXC-STANDARDIZE-NAMES]

must_haves:
  truths:
    - "node bin/motto.js lint exits 0 and prints ✓ 3 skills OK (name == folder holds for all three)"
    - "node --test full suite green — 71 tests including the dogfood test"
  artifacts:
    - skills/author-skill/SKILL.md
    - skills/setup-project/SKILL.md
    - skills/release/SKILL.md
  key_links:
    - "Each SKILL.md frontmatter name: equals its new folder basename (schema invariant)"
    - "dogfood.test.js dist-path string literals match the renamed build output buckets"
---

<objective>
Standardize Motto's three skill names to verb-first, no "motto-" prefix. Rename each skill folder AND its frontmatter `name:` field together (the schema requires name == folder), then update the dogfood test's hardcoded dist-path references to the new names.

Purpose: Consistent, verb-first skill naming. The schema invariant (frontmatter `name:` MUST equal folder name) means folder and field must move together or lint breaks.
Output: Three renamed skill directories with matching `name:` fields, and an updated dogfood test that asserts against the new dist paths.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md

@skills/authoring-a-skill/SKILL.md
@skills/motto-project-setup/SKILL.md
@skills/motto-release/SKILL.md
@test/dogfood.test.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rename three skill folders and matching name: fields</name>
  <files>skills/author-skill/SKILL.md, skills/setup-project/SKILL.md, skills/release/SKILL.md</files>
  <action>
Rename each skill directory with `git mv` (preserves history), then edit only the frontmatter `name:` field in each SKILL.md to match the new folder. Do all three:

1. `git mv skills/authoring-a-skill skills/author-skill` — then in skills/author-skill/SKILL.md change the frontmatter line `name: authoring-a-skill` to `name: author-skill`.
2. `git mv skills/motto-project-setup skills/setup-project` — then in skills/setup-project/SKILL.md change `name: motto-project-setup` to `name: setup-project`.
3. `git mv skills/motto-release skills/release` — then in skills/release/SKILL.md change `name: motto-release` to `name: release`.

Skill BODIES stay UNCHANGED: leave titles ("# Authoring a Motto Skill", "# Setting Up a Motto Project", "# Releasing Motto"), descriptions, and Role lines exactly as they are. Only the folder name and the single `name:` frontmatter line change for each skill.

DO NOT touch motto.yaml (its plugins.public/plugins.private are output bucket names, not a skill list), .planning/ROADMAP.md (point-in-time history), or dist/ (regenerated build output).
  </action>
  <verify>
    <automated>node bin/motto.js lint</automated>
  </verify>
  <done>node bin/motto.js lint exits 0 and prints "✓ 3 skills OK". The three new folders skills/author-skill/, skills/setup-project/, skills/release/ each contain a SKILL.md whose `name:` field equals the folder basename. Old folder names no longer exist under skills/.</done>
</task>

<task type="auto">
  <name>Task 2: Update dogfood test dist-path references to new names</name>
  <files>test/dogfood.test.js</files>
  <action>
Replace every old skill name in the hardcoded dist-path string literals and `it(...)` descriptions with its new name, preserving bucket placement:

- `authoring-a-skill` → `author-skill` (under dist/public/) — the SKILL.md-exists assertion and the references/skill-schema.md bundling assertion.
- `motto-project-setup` → `setup-project` (under dist/public/) — the SKILL.md-exists assertion and the references/skill-schema.md bundling assertion.
- `motto-release` → `release` (under dist/private/) — the SKILL.md-exists assertion and the assertion that it has NO references/ directory (it declares no shared_references).

Update both the path arguments to join(...) AND the human-readable `it('...')` description strings so they name the new skills. Do not change bucket placement (author-skill and setup-project stay in public; release stays in private), the skillCount=3 / bucketCount=2 assertions, or any plugin.json assertions.
  </action>
  <verify>
    <automated>node --test</automated>
  </verify>
  <done>node --test runs the full suite green — 71 tests pass, including the dogfood build test. No remaining references to authoring-a-skill, motto-project-setup, or motto-release in test/dogfood.test.js (verify with `grep -nE 'authoring-a-skill|motto-project-setup|motto-release' test/dogfood.test.js` returning nothing).</done>
</task>

</tasks>

<verification>
- `node bin/motto.js lint` exits 0 and prints `✓ 3 skills OK`.
- `node --test` full suite green — 71 tests, dogfood test included.
- `grep -rE 'authoring-a-skill|motto-project-setup|motto-release' skills/ test/dogfood.test.js` returns no matches (old names fully retired in these paths; bodies/titles legitimately keep their unchanged prose).
</verification>

<success_criteria>
Three skills renamed (folder + `name:` field) to author-skill, setup-project, release with bodies unchanged; dogfood test updated to new dist paths; lint prints `✓ 3 skills OK`; full test suite green.
</success_criteria>

<output>
Create `.planning/quick/260630-uxc-standardize-skill-names/SUMMARY.md` when done.
</output>
