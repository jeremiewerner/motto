# Research Summary: Motto v0.1.0 Self-Hosting (Dogfood)

**Project:** Motto CLI — Node.js skill authoring & plugin packaging framework
**Milestone:** v0.1.0 — Self-hosting dogfood milestone
**Domain:** Meta-tooling — framework validating itself on its own project
**Researched:** 2026-06-30
**Confidence:** HIGH (all findings grounded in shipped v0.0.1 code + explicit milestone spec)

---

## Executive Summary

Motto v0.1.0 is a self-hosting milestone: the CLI authors and packages real skills about itself (how to author a skill, how to set up a Motto project, and a private maintainer release checklist), bundling them with a shared schema reference. This exercises the full feature surface — public + private skill buckets, shared references, build packaging — and wires a permanent regression guard (dogfood test) into the pre-commit hook.

The technical approach is proven and low-risk: **zero new dependencies**. The existing `lintProject` and `buildProject` need only be called from a test file. The core risk is **not** technical scope but **naming discipline**: Motto's skills document Claude Code, yet any skill `name` containing the substring "claude" or "anthropic" fails the reserved-word check. Use Motto-centric names (`authoring-a-skill`, `motto-project-setup`), not platform-centric ones.

One architectural decision: `buildProject` destructively wipes `<projectRoot>/dist/` before packing. Lint the real tree in-place (read-only, safe); build against a `mkdtemp` copy so the repo's `dist/` is never wiped on every `npm test`.

---

## Key Findings

### Recommended Stack — No changes

v0.0.1 stack (Node ≥20, ESM, `node:test`, single dep `yaml`) is correct for this milestone. **No new dependencies.** All dogfood tooling is stdlib: `node:fs/promises`, `node:path`, `node:url` (`fileURLToPath` for `REPO_ROOT`), `node:os` (`tmpdir`), `node:assert/strict`, `node:test` (auto-discovers `*.test.js`).

### Expected Features — 3 skills + 1 shared reference (all LOW complexity)

**Table stakes:**
1. **`authoring-a-skill` (public)** — teaches the schema step-by-step with an annotated example; references `skill-schema`.
2. **`motto-project-setup` (public)** — project initialization: directory layout, `motto.yaml` fields, dist output; references `skill-schema`.
3. **`motto-release` (private)** — maintainer release checklist (tests, version bump, dogfood lint/build, tag, npm publish stub); exercises the private bucket.
4. **`skill-schema` (shared reference)** — single source of truth for field rules; bundled into each skill's `references/`.

**Anti-features (deferred):** pure schema-reference-as-skill, `troubleshooting-motto`, `distributing-a-motto-plugin` (distribution undecided), `motto-overview`.

### Architecture — real tree at repo root, split dogfood test

```
skills/authoring-a-skill/SKILL.md
skills/motto-project-setup/SKILL.md
skills/motto-release/SKILL.md
shared/references/skill-schema.md
motto.yaml
test/dogfood.test.js   (NEW)
dist/                  (gitignored)
```

- **Lint** the real tree in-place: `lintProject(REPO_ROOT)` — read-only, safe.
- **Build** against an isolated copy: copy `skills/` + `shared/` + `motto.yaml` to `mkdtemp(tmpdir())`, then `buildProject(tempDir)` — keeps the destructive `rm(dist)` off the repo root.
- Compute `REPO_ROOT` via `resolve(dirname(fileURLToPath(import.meta.url)), '..')`, NOT `process.cwd()`.
- `node --test` auto-discovers the test; `dist/` already gitignored; husky `npm test` makes it a free regression guard. No config/hook/.gitignore changes.

### Critical Pitfalls

1. **(HIGHEST) Reserved-substring ban on `name` only.** `validateSkill` rejects any `name` containing `claude`/`anthropic`. Applies to `name` ONLY — description and body may say "Claude Code" freely. Name skills after what Motto does (`authoring-a-skill`), check substrings before creating folders.
2. **Dogfood build wipes `./dist/` every `npm test`** if run on REPO_ROOT — use the mkdtemp copy for the build test.
3. **`process.cwd()` is the wrong anchor** — use `import.meta.url` resolution.
4. Fixture skills counted as real → assert exact `count` against the temp copy.
5. Body-spine forces a `**Role:**` line on reference-flavored skills → write honest role lines, accept it.
6. `motto.yaml` config errors cascade → author config FIRST.
7. `buildProject` re-lints internally → double-lint is correct; design assertions accordingly.
8. `NAME_KEBAB` duplicated (schema.js vs config.js) → add an equality self-test this milestone.
9. Private skill without `plugins.private` → set `plugins.private` in `motto.yaml` early.
10. LINT-02 is not a global content ban → only `name` is restricted.

---

## Implications for Roadmap

**Phase 4 — content-first, then test wiring** (the roadmapper may split into 4a/4b or keep as one phase with ordered tasks):

**4a — Author content + fix gaps:**
1. Create `motto.yaml` (name, version, description, plugins.public, plugins.private).
2. Author 3 SKILL.md files (public, public, private) — check names for `claude`/`anthropic` first.
3. Author `shared/references/skill-schema.md`.
4. Run `motto lint` → expect clean; fix any surfaced schema gaps in `src/`.
5. Run `npm test` → 53 existing tests still green.
6. Run `motto build` manually → inspect `dist/`; fix any build gaps.
7. Add `NAME_KEBAB` equality self-test.

**4b — Wire dogfood test:**
1. `test/dogfood.test.js`: lint `REPO_ROOT` (read-only) + build a mkdtemp copy; assert clean lint, expected skill/bucket counts, `dist/` artifacts present (incl. bundled shared ref + per-bucket plugin.json).
2. `npm test` green (54+).
3. Commit — husky now guards forever.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new deps; all stdlib or existing `yaml` |
| Features | HIGH | 3 skills + 1 shared ref, concrete, low complexity |
| Architecture | HIGH | Patterns from existing v0.0.1 tests |
| Pitfalls | HIGH | All grounded in actual v0.0.1 code |

**Overall: HIGH.** Only unknown: whether real authoring surfaces additional schema gaps — gap discovery is the point of Phase 4a.

---

## Gaps to Address

1. **npm publish mechanism** — `motto-release` includes a TODO publish step; acceptable for a dogfood milestone, expand during a packaging follow-up.
2. **Distribution mechanism** — how end-users install from `dist/` is deferred (PROJECT.md Out of Scope).
3. **Real-world schema edge cases** — first exercise against non-synthetic content; design Phase 4a iteratively.

---

## Sources

### Primary (HIGH)
- `src/` (all modules) — RESERVED check, build wipe, config validation, frontmatter/schema. Verified 2026-06-30.
- `test/` (all modules) — mkdtemp + fs-assertion patterns. Verified 2026-06-30.
- `.planning/PROJECT.md` — v0.1.0 scope, out-of-scope. Verified 2026-06-30.
- Official Node.js docs (util.parseArgs, test runner, url.fileURLToPath). Verified 2026-06-30.
- Official Claude Code docs (agent-skills overview, plugins-reference). Verified 2026-06-30.

### Secondary (MEDIUM)
- `yaml` v2.9 docs (error accumulation, YAML 1.2). Verified 2026-06-30.
- `.planning/milestones/v0.0.1-REQUIREMENTS.md` — locked schema. Verified 2026-06-30.

---

*Research synthesis completed 2026-06-30. Ready for roadmap creation.*
