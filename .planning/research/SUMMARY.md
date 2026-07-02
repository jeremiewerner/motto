# Project Research Summary

**Project:** Motto v0.0.5 Skill Builder
**Domain:** CLI tool for authoring, validating, and packaging Agent Skills
**Researched:** 2026-07-02
**Confidence:** HIGH

## Executive Summary

Motto v0.0.5 adds three interrelated capabilities: a template mechanism (data-driven schema profiles), three new optional frontmatter fields (`outputs:`, `dependencies:`, `allowed-tools`), and a `build-skill` Agent Skill that generates conforming skills from free-form input. **Zero new runtime dependencies required** — everything builds from stdlib + plain data. Key risks are semantic (hollow skills via Goodhart's Law, doc drift, audience-direction leaks in dependencies) rather than technical. Research across Anthropic's `skill-creator` and `obra/superpowers` `writing-skills` confirms this feature set is table stakes for skill-generators; Motto's differentiator is the strict-schema-plus-linter discipline ensuring portability without external tooling.

Recommended approach: four-phase execution — (1) template mechanism + context injection, (2) field validators with integrity guards (audience direction, self-reference detection, path-safety), (3) `build-skill` with content-quality self-review beyond lint, (4) docs audit of `skill-schema.md` (currently 3 versions stale). Two highest-urgency pitfalls — fenced-code false-positives and audience-direction leaks — have working precedents in the codebase to adapt.

## Key Findings

### Recommended Stack

Zero new dependencies. v0.0.5 stack unchanged: Node ≥20, ESM, `yaml` 2.9.0, `node:test`, `node:util parseArgs`, stdlib `fs/promises` and `path`. Template mechanism, field validators, and build-skill all built from existing primitives.

**Core technologies:**
- Node.js ≥20 LTS — runtime
- ESM + `yaml` 2.9.0 — YAML 1.2 parsing with error accumulation
- `node:test` + `node:assert` — testing (stable since Node 20)
- `node:util parseArgs` — CLI arg parsing (stable since Node 20)
- `node:fs/promises` + `node:path` — I/O and path utilities, extended with `lstat()` and `path.sep`-aware containment checks

**Critical gap (verified against official Claude Code docs):** Design's `allowed-tools` whitespace-free constraint will reject real syntax like `Bash(git add *)`. STACK.md recommends Option A (drop constraint for YAML-list form) or Option B (accept parenthesized pattern). Must be decided pre-implementation.

### Expected Features

Survey of skill-creator and writing-skills converges on:

**Must have:**
- Ingest free-form input first (conversation, doc, verbal) before asking
- Gap-filling interview only, not blank-slate
- Fixed question set (name, trigger, output format, edge cases)
- Generate complete, schema-conformant SKILL.md in one pass
- Self-verify via `motto lint` with iterate-until-clean loop
- Portable output (plain SKILL.md + refs, zero Motto runtime needed)

**Should have (differentiators):**
- `template: procedure` self-application (dogfood proof)
- `outputs:` named map for skill-produced files (novel — no prior art in ecosystem)
- `dependencies:` in-tree resolution with audience-direction checks (novel)
- Structurer, not ideator — maps input to schema only

**Explicitly NOT building:**
- Eval/benchmark harness — violates "lightweight, mechanism over features"
- RED-GREEN-REFACTOR testing — different problem scope
- Description-triggering optimizer — should coach at write-time instead (writing-skills survey: description must state WHEN to use, not what the skill does — tested finding)
- `{var}` interpolation for outputs — YAGNI
- Second metadata syntax — all fields in single frontmatter block

### Architecture Approach

**Key finding: no `build.js` code changes needed.** Existing verbatim `cp()` already covers outputs files; lint gates before writes. One optional regression test only (outputs-collision edge case).

**Pattern to extend:** `shared_references` validation splits into pure checks (validateSkill) + I/O checks (lint.js). Same pattern for outputs/dependencies:
- **Bucket A (pure):** dependencies bare-kebab and allowed-tools format checks live in validateSkill
- **Bucket B (I/O):** outputs file existence checked in lint.js processSkill

**Single atomic signature change:** `validateSkill(skill, sharedRefs = new Set(), context = {})` where context carries `{ templates: {}, allSkillNames: new Set() }`.

**Dogfood proof:** `build-skill` is `template: procedure`, so dogfood test verifies template mechanism works. Retirement of author-skill is atomic with build-skill addition (one commit per v0.0.4 setup-project pattern).

### Critical Pitfalls

1. **Template evolution with no version story** — Errors must name template; unknown values list options. Treat requiredSections changes as breaking.
2. **Fenced-code false-positives** — Tags inside ``` fences shouldn't count. Precedent: stray-`---` detector in frontmatter.js. Strip fenced regions before tag-matching; add adversarial fixtures.
3. **Public→private dependency leak** — Public skill names private dependency in frontmatter; shipped to consumers as broken reference. Add audience-direction rule: public→public-only dependencies.
4. **Self-referencing dependency** — Skill listing itself passes existence check. Add explicit `depName === dirName` guard.
5. **`outputs:` path-safety different from `shared_references`** — Needs nested paths; use `path.resolve()` + `startsWith(base + path.sep)`, reject `..`/absolute, use `lstat()` for symlinks, compare casing against readdir.
6. **Hollow skills passing lint (Goodhart's Law)** — LLM converges on minimum-viable filler. Need content-quality self-review gate in build-skill's own instructions beyond structural validity.
7. **Lint-string duplication reintroduced** — build-skill bundles skill-schema.md as shared ref to avoid duplication. Review: no concrete numbers/regexes inlined in prose.
8. **skill-schema.md already 3 versions stale** — Header says v0.0.2, shipped verbatim in dist/. Schedule end-of-milestone audit after all phases land.

## Implications for Roadmap

### Phase 1: Template Mechanism
Unblocks all others. Delivers: `src/templates.js` + context injection in validateSkill + wiring in lintProject. Avoids Pitfall 1 (attribution/versioning).

### Phase 2: Validated Optional Fields + Integrity Guards
Completes schema foundation. Delivers: outputs/dependencies/allowed-tools validation + audience-direction check + self-reference guard + path-safety. Avoids Pitfalls 3, 4, 5. Decision needed: allowed-tools whitespace constraint (recommend Option A).

### Phase 3: build-skill + author-skill Retirement
Proves mechanism works on real consumer. Delivers: build-skill Agent Skill (template: procedure), skill-schema.md bundled as shared ref, atomic retirement of author-skill. Avoids Pitfalls 6 (hollow content), 7 (duplication). Must follow Phase 1+2.

### Phase 4: Docs Audit
skill-schema.md needs full rewrite (version bump, new sections for outputs/allowed-tools/dependencies/template). Schedule last, after all phases land. Avoids Pitfall 8.

**Phase ordering:** Mechanism → Validators → build-skill dogfood → Docs audit. No build.js phase needed.

### Research Flags

**Needs research:**
- Phase 2: `allowed-tools` whitespace decision (STACK.md Q2, Option A recommended)
- Phase 3: build-skill prompt engineering specifics (inherit from skill-creator/writing-skills; token-budget discipline <500 words, flowcharts only for non-obvious decisions, no narrative one-off stories — writing-skills survey)

**Standard patterns:**
- Phase 1: Pattern established by shared_references precedent
- Phase 4: Content audit only

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Node.js docs, official Anthropic/Claude Code docs, codebase patterns verified |
| Features | HIGH | Real-world tools surveyed (skill-creator, writing-skills) in full source code |
| Architecture | HIGH | Every claim cited against actual src/ code; patterns are proven precedents |
| Pitfalls | HIGH | Majority grounded in codebase; Pitfall 8 is observed fact (header *is* stale today) |

**Overall: HIGH** — well-researched follow-on milestone grounded in code, official specs, real-world prior art.

### Gaps to Address

1. `allowed-tools` whitespace decision — two documented options; must choose before Phase 2
2. build-skill prompt engineering — inherit from skill-creator precedent during Phase 3 planning
3. LLM quality validation — manual dogfood pass (user generates skills, human reviews) is standard practice

## Sources

**Primary (HIGH confidence):**
- Motto codebase: `src/schema.js`, `src/lint.js`, `src/build.js`, `src/frontmatter.js` (read in full, 2026-07-02)
- Design spec: `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` (read in full, D-01..D-08)
- Official Node.js docs: nodejs.org (2026-07-01/07-02)

**Primary tools (HIGH confidence, full source read):**
- Anthropic `skill-creator` (github.com/anthropics/skills)
- `obra/superpowers` `writing-skills` v6.1.0
- Agent Skills spec (agentskills.io/specification, 2026-07-02)
- Claude Code docs (code.claude.com/docs/en/skills, 2026-07-02)

---

*Research completed: 2026-07-02*
*Ready for roadmap: yes*
