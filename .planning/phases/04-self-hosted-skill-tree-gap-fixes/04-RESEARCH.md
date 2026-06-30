# Phase 4: Self-Hosted Skill Tree + Gap Fixes — Research

**Researched:** 2026-06-30
**Domain:** Motto self-authoring — content blocks, validator constraints, and pre-emptive gap discovery
**Confidence:** HIGH (all findings derived from live src/ code; line numbers cited)

---

## Purpose

This research builds on the settled milestone research (SUMMARY.md / FEATURES.md / PITFALLS.md).
It does NOT repeat what is already documented there. It supplies:

1. **Exact content blocks** the planner can hand directly to implementers: `motto.yaml`, each
   SKILL.md frontmatter, body spine examples, and the `skill-schema.md` content outline.
2. **Pre-emptive gap scan**: validator behaviors not exercised by v0.0.1 synthetic tests,
   predicted by reading `src/` code, classified as content-authoring issues or src/ fixes.
3. **Authoring order** required to avoid cascade lint failures.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SELF-01 | Root `motto.yaml` with `name`, `version`, `description`, `plugins.public`, `plugins.private` | Exact YAML block in §Exact Content Blocks; field rules traced to `src/config.js` |
| SELF-02 | Public skill `authoring-a-skill` — teaches schema, spine, shared refs | Exact frontmatter + body spine in §Exact Content Blocks |
| SELF-03 | Public skill `motto-project-setup` — teaches project wiring | Exact frontmatter + body spine in §Exact Content Blocks |
| SELF-04 | Private skill `motto-release` — maintainer checklist, exercises private bucket | Exact frontmatter + body spine in §Exact Content Blocks |
| SELF-05 | Shared reference `skill-schema` declared + bundled into each public skill | Content outline in §skill-schema.md; bundling path traced to `src/build.js:170-183` |
| DOG-01 | `motto lint` on real tree exits 0, `✓ 3 skills OK` | Authoring Order + Gap Scan tell planner which order to create files |
| DOG-02 | `motto build` emits `dist/public/` and `dist/private/` with correct artifacts | Build output layout documented in §Build Output Contract |
</phase_requirements>

---

## Exact Content Blocks

### `motto.yaml` (SELF-01)

Constraints from `src/config.js`:
- `name`, `version`, `description`: truthy-only check (`!config.X`); no format validation — lines 81–89. [VERIFIED: src/config.js:81-89]
- `plugins.public`: required; must satisfy `NAME_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` — lines 98–104. [VERIFIED: src/config.js:98-104]
- `plugins.private`: optional; same format check only when present — lines 106–113. [VERIFIED: src/config.js:106-113]
- **CRITICAL**: There is NO `RESERVED` check on plugin names in `config.js`. The substring ban on `anthropic`/`claude` applies only to skill `name` fields in `src/schema.js:84`. Plugin names `motto-skills` and `motto-private` pass all checks. [VERIFIED: src/config.js (no RESERVED check); src/schema.js:39,84]

```yaml
name: motto
version: "0.0.2"
description: Motto is a framework for authoring, validating, and packaging Claude Code Agent Skills into self-contained, distributable plugins.
plugins:
  public: motto-skills
  private: motto-private
```

Notes:
- `version` is quoted to guarantee a YAML string regardless of YAML parser schema behavior. Unquoted `0.0.2` is also safe (two dots, not a float under YAML 1.2 core schema), but quoting removes ambiguity.
- `plugins.public: motto-skills` — passes `NAME_KEBAB`: `motto` + `-skills` → valid. [VERIFIED: src/config.js:100]
- `plugins.private: motto-private` — passes `NAME_KEBAB`. [VERIFIED: src/config.js:107-110]
- `config.description` feeds directly into both plugin.json files at build time (src/build.js:198). Keep it a single clear sentence.

---

### `skills/authoring-a-skill/SKILL.md` — frontmatter (SELF-02)

Validation walkthrough against `src/schema.js`:

| Check | Rule (src location) | Value | Result |
|-------|---------------------|-------|--------|
| name present | `!name` → error (schema.js:76) | `authoring-a-skill` | PASS |
| name kebab | `NAME_KEBAB.test(name)` (schema.js:79) | `a` + `uthoring` + `-a` + `-skill` → `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` | PASS |
| name reserved | `RESERVED.some(r => name.includes(r))` (schema.js:84) | no `claude`, no `anthropic` | PASS |
| name = folder | `name !== dirName` (schema.js:89) | folder must be `authoring-a-skill` | PASS |
| description | `!data.description` (schema.js:95) | non-empty string | PASS |
| audience | must equal `public` or `private` (schema.js:101) | `public` | PASS |
| shared_references[0] safe basename | `entry.includes("/") \|\| entry.includes(".")` (schema.js:133) | `skill-schema` has neither | PASS |
| shared_references[0] exists | `!sharedRefs.has(entry)` (schema.js:137) | requires `shared/references/skill-schema.md` to exist | PASS if created first |

```markdown
---
name: authoring-a-skill
description: Teaches how to write a conforming SKILL.md for the Motto framework. Use this skill when authoring a new Motto skill or investigating a lint error.
audience: public
shared_references:
  - skill-schema
---
```

**Body spine (must satisfy two independent checks in schema.js:109-120):**

```markdown
# Authoring a Motto Skill

**Role:** You are a hands-on guide for writing Motto SKILL.md files. Walk the author through each required frontmatter field, the body spine contract, and shared references step by step.
```

- First non-blank line: `# Authoring a Motto Skill` → `/^# \S/.test(line)` → `# ` + `A` → PASS [schema.js:112]
- Role line: `**Role:** You are...` → `/^\*\*Role:/m.test(bodyStr)` → PASS [schema.js:120]

**Proposed body sections:**
1. What a Motto skill is (one sentence)
2. Required frontmatter — for each field: rule, example, lint error emitted on violation
   - `name`: `NAME_KEBAB` regex, must equal folder, no `anthropic`/`claude`
   - `description`: non-empty; state what + when
   - `audience`: exactly `public` or `private`
3. The body spine — why H1 + Role are mandatory; what Role should say
4. Optional frontmatter — `shared_references`, `template`, `dependencies`
5. `shared_references` usage — bare basenames (no `.md`), how build bundles them
6. Annotated minimal SKILL.md example (use a fenced code block — see §Body Authoring Constraints)
7. Common lint error messages (exact text from src/schema.js)

---

### `skills/motto-project-setup/SKILL.md` — frontmatter (SELF-03)

Validation walkthrough:

| Check | Value | Result |
|-------|-------|--------|
| name | `motto-project-setup` → `motto` + `-project` + `-setup` → valid kebab | PASS |
| reserved | no `claude`, no `anthropic` | PASS |
| folder | must be named `motto-project-setup` | PASS |
| description | non-empty | PASS |
| audience | `public` | PASS |
| shared_references[0] | `skill-schema` → safe basename, file must exist | PASS if created first |

```markdown
---
name: motto-project-setup
description: Walks through initializing a Motto project — directory layout, motto.yaml configuration, and running lint and build. Use this skill when starting a new Motto project.
audience: public
shared_references:
  - skill-schema
---
```

**Body spine:**

```markdown
# Setting Up a Motto Project

**Role:** You are a Motto project setup guide. Walk the author through the source directory layout, every motto.yaml field, the lint and build commands, and what the dist/ output contains.
```

**Proposed body sections:**
1. Directory layout — annotated tree (`skills/`, `shared/references/`, `motto.yaml`, `dist/`)
2. `motto.yaml` fields — for each: what it is, the constraint, an example value
3. Running `motto lint` — what clean output looks like, what an error looks like
4. Running `motto build` — what `dist/` contains; per-bucket `plugin.json` location and fields
5. Installing the built plugin in Claude Code — point at `dist/public/` or `dist/private/`

---

### `skills/motto-release/SKILL.md` — frontmatter (SELF-04)

```markdown
---
name: motto-release
description: Maintainer release checklist for Motto — run tests, bump version, dogfood lint and build, tag, and publish. Use this skill when releasing a new Motto version.
audience: private
---
```

Validation:
- `motto-release` → `motto` + `-release` → valid kebab; no reserved substrings; PASS
- No `shared_references` key → `Array.isArray(undefined)` = false → refs array is empty → zero shared-ref checks run [schema.js:130]
- `audience: private` → matches `'private'` → PASS [schema.js:101]

**Body spine:**

```markdown
# Releasing Motto

**Role:** You are the Motto release assistant for the maintainer. Guide through each release step in order: tests, version bump, dogfood check, tag and commit, publish, and post-release housekeeping.
```

**Proposed body sections:**
1. Pre-release gate — `node --test` must pass; all 54+ tests green
2. Version bump — update `version` in `package.json`; update `version` in `motto.yaml` to match
3. Dogfood check — run `motto lint && motto build` on the repo; lint must exit 0
4. Tag and commit — `git tag vX.Y.Z`; commit message convention
5. Publish — `npm publish` (stub: include `<!-- TODO: expand when npm packaging is configured -->`)
6. Post-release — update `PROJECT.md` Current State; archive milestone in MILESTONES.md

Why no `shared_references`: The release process references no schema content from public skills. A shared reference would be padding.

---

### `shared/references/skill-schema.md` — content outline (SELF-05)

This file has NO frontmatter (it is a plain `.md` reference, not a SKILL.md). It is the canonical rule source for both public skills to cite. Derive every claim from the src/ line numbers below.

**Sections to include:**

**1. `name` field**
- Pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` — letter-start kebab, lowercase only [src/schema.js:33]
- Must equal the skill's folder name exactly [src/schema.js:89]
- Max 64 chars (Claude Code platform limit — per CLAUDE.md spec; not enforced by Motto validator v0.0.2) [ASSUMED per spec; src/schema.js:79 does not check length]
- Forbidden substrings: `anthropic`, `claude` (substring match, not word-boundary) [src/schema.js:39,84]
- Error messages emitted for each violation (exact text from src/schema.js:80-91)
- Name cascade: validation stops at first failure — missing → not kebab → reserved → ≠ folder [src/schema.js:73-92]

**2. `description` field**
- Must be present and non-empty [src/schema.js:95]
- Should state what the skill does AND when Claude should trigger it (authoring guidance)
- Max 1024 chars, no XML tags (`<`, `>`) — per CLAUDE.md spec; NOT enforced by Motto validator v0.0.2 [src/schema.js:95-97 checks only truthiness — see Gap Scan §G1]

**3. `audience` field**
- Must be exactly `public` or `private` — any other value (including missing) produces an error [src/schema.js:101-102]

**4. Body spine — two independent checks**
- First non-blank line must match `^# \S` (H1 with content) [src/schema.js:112]
- Body must contain at least one line starting with `**Role:` (multiline `^\*\*Role:/m`) [src/schema.js:120]
- Both checks run independently — both errors are reported even if both fail [src/schema.js:105-121]
- Role line content after `:` is not validated; an empty `**Role:**` passes the regex but produces unusable content

**5. `shared_references` field**
- Optional; when present, must be a YAML array of strings [src/schema.js:130]
- Each entry: bare basename — must NOT contain `/` or `.` [src/schema.js:133]
- Each entry must correspond to an existing `shared/references/<entry>.md` file [src/schema.js:137; src/lint.js:75-88]
- Per-entry checks are independent: all invalid entries reported in one lint run [src/schema.js:131]

**6. `template` and `dependencies` fields**
- Accepted and passed through; not validated in v0.0.2 [src/schema.js:63 comment on D-14]

**7. Frontmatter envelope**
- File must begin with a bare `---` line [src/frontmatter.js:27]
- A matching closing `---` is required [src/frontmatter.js:36-47]
- YAML between the delimiters is parsed with `yaml` v2 (YAML 1.2 core schema) — no `yes`/`no` boolean surprises [src/frontmatter.js:85]
- Stray `---` inside the body: flagged only if the content between it and the preceding body boundary parses as a clean, non-empty YAML mapping [src/frontmatter.js:59-79 — see Gap Scan §G5]

---

## Build Output Contract (DOG-02)

What `motto build` produces from the Motto skill tree. Derived from `src/build.js`.

```
dist/
  public/
    .claude-plugin/
      plugin.json      ← { "name": "motto-skills", "version": "0.0.2", "description": "..." }
    authoring-a-skill/
      SKILL.md         ← verbatim copy
      references/
        skill-schema.md ← copied from shared/references/skill-schema.md
    motto-project-setup/
      SKILL.md         ← verbatim copy
      references/
        skill-schema.md ← copied from shared/references/skill-schema.md
  private/
    .claude-plugin/
      plugin.json      ← { "name": "motto-private", "version": "0.0.2", "description": "..." }
    motto-release/
      SKILL.md         ← verbatim copy
      (no references/ dir — no shared_references declared)
```

Sources:
- Public bucket always in `bucketsUsed` [build.js:155]
- Private bucket added when private skill found [build.js:183]
- plugin.json fields: `name` from `config.plugins[audience]`, `version` + `description` from config [build.js:197-200]
- `references/` created with `mkdir(recursive:true)` then shared ref copied in [build.js:171-179]
- `motto-release` has no shared_references → no `references/` dir created → correct [build.js:170]

---

## Pre-emptive Gap Scan

By reading `src/{schema,config,lint,build,frontmatter}.js`, the following behaviors were NOT exercised by v0.0.1 synthetic tests and may surface unexpected results in Phase 4.

| # | Gap | Trigger Condition | Expected per Spec | Likely Actual (v0.0.1 code) | Type | Action |
|---|-----|------------------|-------------------|-----------------------------|----|--------|
| G1 | `description` max-length and XML-tag constraints not enforced | Authoring a description > 1024 chars or containing `<tag>` | Lint fails: length/XML error | Lint PASSES — `src/schema.js:95` only checks `!data.description`; no length or tag check | src/ fix candidate | Descriptions in our content are short and XML-free, so NOT surfaced by Phase 4. Log as backlog improvement. |
| G2 | `plugins.public`/`plugins.private` have no `RESERVED` substring check | A plugin name containing `claude` or `anthropic` | Lint fails per spec | `src/config.js` has no `RESERVED` check — only `NAME_KEBAB` format. `loadConfig` would accept `motto-claude`. | src/ gap | NOT surfaced — our plugin names are `motto-skills` and `motto-private`. Informational. |
| G3 | `buildProject` always emits `dist/public/.claude-plugin/plugin.json` even with zero public skills | A project with ONLY private skills | Debatable — a public plugin with no skills is confusing | `build.js:155`: `bucketsUsed = new Set(['public'])` → public plugin.json always written | src/ gap (behavior) | NOT triggered — we have 2 public skills. Informational; note for Phase 5 dogfood assertions: both buckets are always present in output. |
| G4 | `motto.yaml` `name` has no format validation | A name like `Motto` (uppercase) or `my project` (space) | Lint fails: format error | `config.js:81` only checks `!config.name` — any truthy string passes | src/ gap | NOT surfaced — we use `motto` (valid form). Use a well-formed lowercase identifier. |
| G5 | Stray-`---` check fires if body contains `---` preceded by pure YAML key-value text | Body section of a SKILL.md starts with bare `key: value` pairs then hits a `---` | Lint fails: stray delimiter | `frontmatter.js:59-79` checks the region from body-start to first body `---`; fires only if that region has ZERO YAML parse errors AND is a non-empty mapping | content-authoring | Mitigated automatically: body spine requires `# Title` as first non-blank line. H1 breaks YAML mapping detection (YAML sees a comment). BUT see Body Authoring Constraint §BA1 for example blocks. |
| G6 | Shared reference missing at lint time silences itself differently from a bad name | Running lint before `shared/references/skill-schema.md` is created | Error: `shared_references entry "skill-schema" not found in shared/references/` | Lint reports error correctly per `schema.js:139` | content-authoring (order) | Addressed by Authoring Order: create `skill-schema.md` BEFORE any SKILL.md that references it. |
| G7 | Private skill passes lint but fails build if `plugins.private` missing from `motto.yaml` | Authoring `motto-release` before setting `plugins.private` in `motto.yaml` | Build fails: `audience private but plugins.private not set` | `build.js:135` catches this at Step 3 after lint passes | content-authoring (order) | Addressed by Authoring Order: set `plugins.private` in `motto.yaml` BEFORE creating any private skill. |
| G8 | `lintProject` returns `ok: false` if `skills/` directory is absent or empty | Running `motto lint` before any skill directory exists | Error: `no skills found` | `lint.js:196-200` returns `ok: false, count: 0` — no partial-success | content-authoring (order) | Addressed by Authoring Order: do not run lint until at least one SKILL.md exists. |
| G9 | `buildProject` Step 2 re-discovers skills independently of lint — includes any directory created between lint and build | A stray test fixture folder in `skills/` between lint and build runs | Both lint and build see the same set | This is a PHASE 5 dogfood test concern (Pitfall 4 in PITFALLS.md). For Phase 4 manual runs, not an issue. | content-authoring | Enforce: `skills/` must contain ONLY the 3 authored skill directories. No fixture pollution. |

**Highest-priority items for the planner:**
- G1: note that description is not length/XML validated → write short, clean descriptions (satisfied by proposed blocks above)
- G5: use fenced code blocks for any SKILL.md example in body (see BA1 below)
- G6, G7, G8: these determine the mandatory authoring order (next section)

---

## Body Authoring Constraints

### BA1: Embedding SKILL.md examples in the `authoring-a-skill` body

The `authoring-a-skill` body includes an annotated example SKILL.md. That example contains frontmatter with `---` delimiters. If those `---` lines appear as raw Markdown (not inside a code fence), `parseFrontmatter` will scan the body for the first `---` it finds and check if the preceding region looks like a YAML mapping.

**Why it is safe in practice:** The body spine requires `# Title` as the first non-blank line. YAML 1.2 treats `# Title` as a comment, making the region not a pure mapping. However, the safest authoring practice is to always wrap example SKILL.md content in a fenced code block:

```
 ```yaml
 ---
 name: my-skill
 description: ...
 ---
 ```
```

Inside a fenced code block, the `---` lines are still raw lines in the SKILL.md body (code fences are a Markdown concept, not parsed by `parseFrontmatter`). However, the stray check looks at the region from `body-start` to the first `---` found. With a code fence, there is content before the `---` (the fence opening line), making the region a Markdown scalar, not a mapping.

**Rule:** All SKILL.md example blocks in body content must be wrapped in fenced code blocks. This is both safe for the linter and correct Markdown rendering.

### BA2: `**Role:**` line must not be the ONLY content after the H1

The Role regex `/^\*\*Role:/m` matches any line starting with `**Role:` — including `**Role:**` with nothing after it. This passes the validator but produces unusable agent instruction content. Write Role lines as complete sentences:

Good: `**Role:** You are a hands-on guide for writing Motto skills.`
Passes but unusable: `**Role:**`

The planner does not need a validation step for this — it is a content quality constraint.

---

## Authoring Order

The order matters because lint validates cross-file references and the `skills/` directory must be non-empty for lint to proceed.

```
1. Create shared/references/skill-schema.md         ← enables shared_references validation
2. Create motto.yaml (with plugins.private set)     ← prevents config cascade errors + enables private build
3. Create skills/authoring-a-skill/SKILL.md         ← first public skill
4. Create skills/motto-project-setup/SKILL.md       ← second public skill
5. Create skills/motto-release/SKILL.md             ← private skill
6. Run: motto lint                                  ← must exit 0, print "✓ 3 skills OK"
7. Run: motto build                                 ← must produce dist/ as shown in Build Output Contract
8. If any src/ gap is surfaced: fix src/, re-run npm test (53 tests), confirm still green
9. Verify: npm test passes (no regressions)
```

**Why `motto.yaml` before any SKILL.md:**
- Config is validated first in `lintProject` (lint.js:187)
- A missing or invalid `motto.yaml` still allows skill scanning to run (processConfig continues after errors), but produces cascading errors because `loadSharedRefs` returns an empty set when config is broken — no, actually `loadSharedRefs` reads `shared/references/`, not `motto.yaml`. So config errors don't cascade into shared-ref resolution. The real risk is: `plugins.private` missing when `motto-release` is present causes build to fail after lint passes (Gap G7).

**Why shared reference before SKILL.md files:**
- `validateSkill` checks `sharedRefs.has('skill-schema')` (schema.js:137). The `sharedRefs` Set is populated by `loadSharedRefs` which reads `shared/references/*.md`. If `skill-schema.md` doesn't exist when lint runs, both public skills fail LINT-05.

---

## NAME_KEBAB Self-Test (DOG-04 — Phase 5 prep)

The tech debt identified in PITFALLS.md Pitfall 8: `NAME_KEBAB` is duplicated between `src/schema.js` (exported, line 33) and `src/config.js` (private, line 35). The test assertion for DOG-04 (Phase 5) can be written as:

```js
import { NAME_KEBAB } from '../src/schema.js';
const EXPECTED = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
assert.strictEqual(
  NAME_KEBAB.source,
  EXPECTED.source,
  'NAME_KEBAB in schema.js must match the duplicate in config.js'
);
```

Because `config.js` does not export its `NAME_KEBAB`, the test compares against the known literal from `config.js:35`. If they ever diverge, the test fails. This is a one-assertion fix placed in the existing `test/schema.test.js` or `test/config.test.js`. DOG-04 is Phase 5 scope but noting it here because Phase 4 is the point at which the tech debt's impact becomes observable.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` (treat as enabled).

### Existing Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (stdlib, Node ≥ 20) |
| Discovery | `node --test` from repo root, auto-discovers `test/*.test.js` |
| Quick run | `node --test` |
| Full suite | `node --test` |
| Current count | 53 tests |

### Phase 4 Validation Map

| Req ID | Behavior | Test Type | Command | Notes |
|--------|----------|-----------|---------|-------|
| SELF-01 | `motto.yaml` passes `loadConfig` | manual | `motto lint` exits 0 | Config validated as part of lint |
| SELF-02 | `authoring-a-skill` passes `validateSkill` | manual | `motto lint` exits 0 | Included in `✓ 3 skills OK` |
| SELF-03 | `motto-project-setup` passes `validateSkill` | manual | `motto lint` exits 0 | Same |
| SELF-04 | `motto-release` passes `validateSkill` | manual | `motto lint` exits 0 | Private skill in clean lint |
| SELF-05 | `skill-schema` bundled into each public skill's `references/` | manual | inspect `dist/` after `motto build` | Verify `dist/public/authoring-a-skill/references/skill-schema.md` exists |
| DOG-01 | lint exits 0, count = 3 | manual | `motto lint` | Phase 5 converts this to automated dogfood test |
| DOG-02 | build emits expected dist/ | manual | `motto build` + `ls dist/` | Phase 5 converts this to automated dogfood assertions |

**No new test files in Phase 4.** The automated dogfood test (`test/dogfood.test.js`) is Phase 5 scope (DOG-03). Phase 4 validates manually via CLI and verifies the 53 existing tests remain green.

### Wave 0 Gaps for Phase 4

None — no test infrastructure changes needed. Phase 4 creates only content files and optionally patches `src/` if a gap surfaces.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `motto.yaml` config | Project config (file) | `src/config.js` validates | Authoring task; validator already exists |
| Skill frontmatter + body | Content (files) | `src/schema.js` validates | Authoring task; validator already exists |
| Shared reference file | Content (file) | `src/lint.js:loadSharedRefs` discovers | Authoring task; discovery already exists |
| Lint pass (DOG-01) | `src/lint.js` | `bin/motto.js` CLI | No code changes expected unless gap found |
| Build pass (DOG-02) | `src/build.js` | `bin/motto.js` CLI | No code changes expected unless gap found |
| src/ gap fixes | `src/schema.js` or `src/config.js` | Existing test suite verifies | Only if real content surfaces a validation gap |

---

## Open Questions

1. **Should description length/XML validation be added in Phase 4 (src/ fix) or deferred?**
   - What we know: schema.js:95 only checks truthiness; CLAUDE.md spec says max 1024 + no XML tags.
   - What's unclear: is this a v0.0.2 requirement or backlog?
   - Recommendation: defer unless the planner decides to close the spec gap. Our authored descriptions satisfy the spec even without code enforcement. Fixing in Phase 4 is low risk (add 2 checks to validateSkill), but requires new tests (+2 tests minimum).

2. **`plugins.public` name: `motto-skills` vs `motto`?**
   - `motto` is simpler but risks namespace collision if Claude Code already knows a plugin named `motto`.
   - `motto-skills` is unambiguous.
   - Recommendation: use `motto-skills` unless the user has a preference.

---

## Sources

All claims verified against live source code at `/Users/jeremie/Projects/motto/src/`. No external research required for this phase — the validator spec is the code.

| File | Key Facts Verified | Lines |
|------|--------------------|-------|
| `src/schema.js` | `NAME_KEBAB` export; `RESERVED`; name cascade; description truthy-only; audience; H1 regex; Role regex; shared_refs safe-basename + membership | 33, 39, 76–92, 95, 101, 112, 120, 130–140 |
| `src/config.js` | Truthy checks on name/version/description; `plugins.public` required + kebab format; `plugins.private` optional + format-only; NO `RESERVED` check | 81–89, 98–113 |
| `src/frontmatter.js` | Opening `---` required; closing `---` required; stray detection fires only on clean YAML mapping | 27, 36–47, 59–79 |
| `src/lint.js` | `loadSharedRefs` returns empty Set when dir missing (not an error); `discoverSkillNames` returns null on ENOENT; `count = skillNames.length`; "no skills found" when count = 0; alphabetical sort | 85, 107–119, 196–206 |
| `src/build.js` | `bucketsUsed` always starts with `'public'`; collision check fires if local `references/<ref>.md` exists; private-contradiction at Step 3; plugin.json fields from config | 117–130, 133–141, 155, 183, 197–200 |

**Confidence:** HIGH — all rules traced to concrete src/ line numbers. No external dependencies researched (zero new deps per milestone spec).
