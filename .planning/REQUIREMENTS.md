# Motto — Requirements (Milestone v0.0.5 Skill Builder)

**Defined:** 2026-07-03 · **Design spec:** `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` · **Research:** `.planning/research/SUMMARY.md`

## v0.0.5 Requirements

### Template Mechanism (TMPL)

- [x] **TMPL-01**: Author can declare `template: <name>` and lint enforces that template's extra rules (closes deferred TMPL-01)
- [x] **TMPL-02**: Template + section-tag registry is pure data (`src/templates.js`); adding a template requires no mechanism change
- [x] **TMPL-03**: `procedure` template requires `<process>` + `<success_criteria>` body sections — matching ignores fenced code blocks
- [x] **TMPL-04**: Unknown template name yields a lint error listing available templates
- [x] **TMPL-05**: Skills without `template:` behave exactly as v0.0.4 (regression-guarded)

### Field Validation (VAL)

- [x] **VAL-01**: `outputs:` named map validated — each file exists inside the skill dir, path-safe (no traversal, no absolute, no symlink escape)
- [x] **VAL-02**: `dependencies:` bare kebab entries resolve to existing skills in the tree; namespaced (`plugin:skill`) entries format-checked only
- [x] **VAL-03**: Public skill cannot depend on a private skill (audience-direction guard — no private-name leak in dist)
- [x] **VAL-04**: Self-dependency rejected
- [x] **VAL-05**: `allowed-tools` format-checked accepting real spec forms incl. parenthesized patterns like `Bash(git add *)` (Option A/B from STACK.md decided at phase discuss)
- [x] **VAL-06**: All new validators never-throw, with adversarial malformed-input tests

### build-skill (BSKL)

- [x] **BSKL-01**: User can hand build-skill any input (freeform text, doc, conversation); it asks gap-filling questions only
- [x] **BSKL-02**: build-skill generates a complete conforming `skills/<name>/` (SKILL.md + output template files) in one pass
- [x] **BSKL-03**: build-skill self-verifies via `motto lint` and iterates until clean
- [x] **BSKL-04**: build-skill itself declares `template: procedure` and passes the dogfood test (live E2E proof of the whole milestone)
- [x] **BSKL-05**: build-skill instructions include a content-quality self-review gate (anti-hollow: no empty Role, no vacuous criteria; description states WHEN to trigger, not what the skill does)
- [x] **BSKL-06**: `author-skill` retired atomically with build-skill's arrival (dogfood count synced, main never red)

### Docs (DOC)

- [x] **DOC-06**: `skill-schema.md` rewritten current (version header, template/outputs/dependencies/allowed-tools sections); build-skill prose contains no duplicated lint strings/regexes
- [x] **DOC-07**: README updated — author-skill references removed, build-skill flow documented

## Phase-Research Notes

- **Init scaffold impact:** each phase's research must check whether `motto init`'s generated project structure needs updating (starter skill with `template:`? example outputs file? marketplace/docs strings). No speculative requirement — decide per phase against real need.
- `allowed-tools` format decision (STACK.md Q2 Option A vs B) — resolve at Phase 15 discuss/plan.

## Future Requirements (deferred — evolution ledger in design spec)

- Action section tags: `<drill>` (ask user), `<run>` (CLI), `<mcp>` (MCP query) — registry entries when a real skill needs them
- Skill-calls-skill with parameters; cross-skill var placeholders
- `{var}` interpolation/validation engine for output templates
- `template:` as array (multi-template composition)
- `agent` template — generate agent/subagent `.md` files (`tools:` field lives there)
- Migrate base-spine `**Role:**` line → `<role>` registry tag (breaking; needs migration story)
- CLIX-01/02 (`--quiet`, `--format json`), SHIP-01 (`motto ship`), CI-01 (GitHub Actions) — pre-existing backlog

## Out of Scope

- Eval/benchmark harness for generated skills — violates lightweight principle; manual dogfood review instead
- Description-triggering optimizer loops — coach at write-time (BSKL-05) instead
- MCP dependency resolution — `dependencies:` remains lint-only
- Content transformation at build — verbatim copy holds
- Minimum-content-length heuristics in linter — YAGNI; hollow-skill defense lives in BSKL-05

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMPL-01 | Phase 14 | Complete |
| TMPL-02 | Phase 14 | Complete |
| TMPL-03 | Phase 14 | Complete |
| TMPL-04 | Phase 14 | Complete |
| TMPL-05 | Phase 14 | Complete |
| VAL-01 | Phase 15 | Complete |
| VAL-02 | Phase 15 | Complete |
| VAL-03 | Phase 15 | Complete |
| VAL-04 | Phase 15 | Complete |
| VAL-05 | Phase 15 | Complete |
| VAL-06 | Phase 15 | Complete |
| BSKL-01 | Phase 16 | Complete |
| BSKL-02 | Phase 16 | Complete |
| BSKL-03 | Phase 16 | Complete |
| BSKL-04 | Phase 16 | Complete |
| BSKL-05 | Phase 16 | Complete |
| BSKL-06 | Phase 16 | Complete |
| DOC-06 | Phase 17 | Complete |
| DOC-07 | Phase 17 | Complete |

**Coverage:** 19/19 v1 requirements mapped · no orphans · no duplicates
