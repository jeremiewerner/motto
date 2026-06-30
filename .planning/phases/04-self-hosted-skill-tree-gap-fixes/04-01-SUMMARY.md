---
phase: "04"
plan: "01"
subsystem: content/self-hosting
tags: [dogfood, skill-authoring, content, bug-fix]
dependency_graph:
  requires: []
  provides: [motto-skills-plugin, motto-private-plugin, skill-schema-reference]
  affects: [src/frontmatter.js, test/frontmatter.test.js]
tech_stack:
  added: []
  patterns: [shared-references, public-private-buckets]
key_files:
  created:
    - motto.yaml
    - shared/references/skill-schema.md
    - skills/authoring-a-skill/SKILL.md
    - skills/motto-project-setup/SKILL.md
    - skills/motto-release/SKILL.md
  modified:
    - src/frontmatter.js
    - test/frontmatter.test.js
decisions:
  - "Used motto-skills / motto-private as plugin names (not motto / motto-private) to avoid namespace collision"
  - "Fixed parseFrontmatter.js toJS() alias-throw bug in same branch (genuine validator bug, surfaced by real content)"
  - "Task 1 body content kept minimal to avoid triggering the bug before the src/ fix landed"
metrics:
  duration_minutes: 8
  completed: "2026-06-30"
  tasks_completed: 3
  tasks_total: 3
status: complete
checkpoint_approved: true
---

# Phase 04 Plan 01: Self-Hosted Skill Tree Summary

**One-liner:** Motto's own skill tree (3 skills, shared reference, public + private buckets) lint- and build-clean on v0.0.2; surfaced and fixed a `parseFrontmatter.js` `toJS()` alias-throw bug.

## What Was Built

A complete self-hosted Motto skills tree that exercises the full schema surface:

| Artifact | Type | Purpose |
|----------|------|---------|
| `motto.yaml` | Config | Project config: name=motto, version=0.0.2, plugins.public=motto-skills, plugins.private=motto-private |
| `shared/references/skill-schema.md` | Shared reference | Canonical rule source for name/description/audience/body-spine/shared_references/frontmatter-envelope fields; bundled into both public skills at build time |
| `skills/authoring-a-skill/SKILL.md` | Public skill | Teaches how to write a conforming SKILL.md; declares shared_references: [skill-schema] |
| `skills/motto-project-setup/SKILL.md` | Public skill | Teaches directory layout, motto.yaml fields, lint/build commands, dist/ structure; declares shared_references: [skill-schema] |
| `skills/motto-release/SKILL.md` | Private skill | Maintainer release checklist (tests, version bump, dogfood, tag, publish stub, housekeeping); audience: private |

### Build Output Contract (verified)

```
dist/
  public/
    .claude-plugin/plugin.json    ← name: motto-skills, version: 0.0.2
    authoring-a-skill/
      SKILL.md                    ← verbatim copy
      references/skill-schema.md  ← bundled from shared/references/
    motto-project-setup/
      SKILL.md                    ← verbatim copy
      references/skill-schema.md  ← bundled from shared/references/
  private/
    .claude-plugin/plugin.json    ← name: motto-private, version: 0.0.2
    motto-release/
      SKILL.md                    ← verbatim copy
      (no references/ dir)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed parseFrontmatter.js toJS() alias-throw on body content**

- **Found during:** Task 1 (first lint run)
- **Issue:** `parseFrontmatter.js` line 68 called `regionDoc.toJS()` without a try/catch. When the body region between the frontmatter close and the next `---` contains `**Role:**` text, YAML parses the leading `**` as a `*name` alias reference. `toJS()` throws `Unresolved alias (the anchor must be set before the alias): *Role:**` instead of accumulating into `doc.errors`. This caused the per-skill scan backstop (lint.js:163) to catch the exception and report it as `unexpected error: ...` rather than returning a clean result.
- **Fix:** Wrapped `regionDoc.toJS()` in try/catch in `src/frontmatter.js:68-72`. If `toJS()` throws, `regionValue` is set to `null`, which makes `isMapping` false and the stray-delimiter check is skipped gracefully (correct behavior — the region is not a stray frontmatter block).
- **Authoring workaround for Task 1:** Kept `authoring-a-skill/SKILL.md` body minimal (no `---` inside) so lint passed before the fix landed. Task 2 expanded the body with the annotated SKILL.md example (which contains `---` in a fenced code block) after the bug was fixed.
- **Test added:** B8 in `test/frontmatter.test.js` — regression guard asserting that a body with `**Role:**` before a `---` does not throw and returns no stray-delimiter error.
- **Files modified:** `src/frontmatter.js`, `test/frontmatter.test.js`
- **Commit:** `de21a73`

### Not a deviation: test count moved from 53 to 54

The plan said "53 tests green" based on the pre-plan baseline. The fix required adding test B8, bringing the suite to 54. All 54 pass.

## Gap Scan Outcome (04-RESEARCH.md gaps)

| Gap | Outcome |
|-----|---------|
| G1 — description length/XML not enforced | Not surfaced — all descriptions are short and XML-free |
| G5 — stray `---` in body | Partially predicted: research expected the H1 + code-fence approach to be safe, but did not anticipate the `toJS()` throw for `*alias` content. Fixed in src/. |
| G6 — shared ref missing at lint time | Addressed by authoring order (skill-schema.md created before SKILL.md files) |
| G7 — private contradiction | Addressed by authoring order (`plugins.private` in motto.yaml before motto-release/SKILL.md) |
| G8 — no skills found | Addressed by authoring order (shared ref + config created before first lint run) |

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `ed75921` | feat(04-01) | Author Motto skill tree — clean lint on 3 skills |
| `de21a73` | fix(frontmatter) | Catch toJS() throw for YAML alias-like body content (+ test B8) |
| `d29de44` | feat(04-01) | Expand authoring-a-skill to production content |

## Phase Requirements Satisfied

| Req ID | Status | Evidence |
|--------|--------|---------|
| SELF-01 | DONE | `motto.yaml` has name=motto, version="0.0.2", description, plugins.public=motto-skills, plugins.private=motto-private |
| SELF-02 | DONE | `skills/authoring-a-skill/SKILL.md` exists, audience: public, shared_references: [skill-schema] |
| SELF-03 | DONE | `skills/motto-project-setup/SKILL.md` exists, audience: public, shared_references: [skill-schema] |
| SELF-04 | DONE | `skills/motto-release/SKILL.md` exists, audience: private |
| SELF-05 | DONE | `shared/references/skill-schema.md` exists; bundled into both public skills at build time |
| DOG-01 | DONE | `node bin/motto.js lint` exits 0, prints `✓ 3 skills OK` |
| DOG-02 | DONE | `node bin/motto.js build` emits dist/ exactly per Build Output Contract; per-bucket plugin.json carry version 0.0.2 |

## Known Stubs

**motto-release Step 5 (Publish):** Contains a `<!-- TODO: expand when npm packaging is configured -->` comment. This is intentional — npm packaging is not yet decided (see PROJECT.md Out of Scope). The stub is documented in the skill body and will be expanded in a future milestone.

## Task 3: Human Verification — APPROVED

The maintainer reviewed and signed off on the blocking checkpoint:
- `node bin/motto.js lint` → `✓ 3 skills OK` (exit 0)
- `node bin/motto.js build` → correct dist/ tree (both buckets, bundled refs, no references/ in motto-release)
- Both plugin.json correct (names motto-skills / motto-private, version 0.0.2, description)
- 54 tests green
- Content quality confirmed genuine (real Role sentences, accurate schema rules)
- parseFrontmatter `toJS()` alias-throw bug fix accepted

## Self-Check: PASSED

Files created:

- `motto.yaml` — FOUND
- `shared/references/skill-schema.md` — FOUND
- `skills/authoring-a-skill/SKILL.md` — FOUND
- `skills/motto-project-setup/SKILL.md` — FOUND
- `skills/motto-release/SKILL.md` — FOUND

Commits verified:

- `ed75921` — FOUND (feat: author Motto skill tree)
- `de21a73` — FOUND (fix: toJS() alias-throw)
- `d29de44` — FOUND (feat: expand authoring-a-skill)
