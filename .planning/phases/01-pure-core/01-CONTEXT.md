# Phase 1: Pure Core - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the **pure validation core** — three side-effect-free functions with no filesystem/CLI dependencies:

- `parseFrontmatter(text)` — split a SKILL.md into frontmatter `data` + `body`, normalize input, detect structural malformation.
- `validateSkill(skill, sharedRefs)` — enforce the skill schema (frontmatter fields, name rules, body spine, shared-reference safety).
- `loadConfig` core — validate a parsed `motto.yaml` object (identity fields + plugin-name rules).

Covers requirements **PARSE-01..04, LINT-01..05, CONF-01..03**.

**Not in this phase:** skill discovery / directory scanning, `lint` orchestration, the CLI, and any I/O wiring (Phase 2); build/packaging (Phase 3). `loadConfig`'s file-read is Phase 2 plumbing — Phase 1 owns the validation logic it wraps.

</domain>

<decisions>
## Implementation Decisions

### Error model (the architectural spine)
- **D-01:** The pure core uses a **uniform `errors[]` return, never throws.** `parseFrontmatter` returns `{ data, body, errors[] }`; the config validator returns `{ config, errors[] }`. This matches `validateSkill`'s existing `Array<{skill, message}>` shape — one error model across the whole core, so nothing can crash the linter (satisfies PARSE-03 "never silently skipped or crashed" structurally, not by caller discipline).
- **D-02:** YAML is parsed with **`YAML.parseDocument`** (not `YAML.parse`). Its `doc.errors[]` are mapped into the returned `errors[]`. This is the CLAUDE.md-stated rationale for choosing the `yaml` lib; the superpowers plan's `YAML.parse` (throws) is **rejected**.
- **D-03 (requirement reconciliation — flag for planner):** PARSE-01 and CONF-01 are worded "throws a clear error." Per D-01 this is implemented as **reporting a clear, named error in `errors[]`** — same observable behavior (loud, named, non-silent), different mechanism. **Tests assert on `errors[]` content, not `assert.throws`.** Success criteria #1/#3/#5 are about behavior and remain satisfied.

### Input normalization (PARSE-02)
- **D-04:** Normalization is **folded into `parseFrontmatter`** as its first step (no separate exported function — only one consumer in v1).
- **D-05:** Normalization is **minimal**: strip a single leading UTF-8 BOM, convert `CRLF → LF`. Nothing else (no lone-`\r`, no trailing-whitespace munging — those invent behavior no requirement asks for). The frontmatter regex stays LF-anchored; CRLF/BOM input parses identically to LF/no-BOM.

### Malformed-frontmatter detection (PARSE-04)
- **D-06:** Detect a stray inner `---` **structurally**: a valid file has exactly two bare `---` delimiter lines (opening at line 0 after normalize, one closing). A further bare `---` line before the real body — or `YAML.parseAllDocuments` on the block yielding `>1` document — produces a named error `stray --- in frontmatter` for that skill. (Non-greedy "close at first `---`" alone would silently leak content into the body; greedy "close at last `---`" would swallow a body `---` rule. Both rejected.)
- **D-07:** An **empty frontmatter block** (`---\n---\n`) yields `data: {}` with **no parse error** — `validateSkill` then reports the missing required fields. (Matches the superpowers plan's empty-block behavior.)

### Schema rule exactness (LINT) — these override the superpowers plan where it diverges
- **D-08:** `name` regex is **letter-start kebab**: `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` (LINT-02). The plan's `/^[a-z0-9]+(-[a-z0-9]+)*$/` allows a leading digit — **bug, fixed here.**
- **D-09:** Reserved-substring check: `name` must contain neither `anthropic` nor `claude` (LINT-02).
- **D-10:** `shared_references` entries must be **safe basenames** — reject any entry containing `/` or `.` with a distinct error, *before* the resolve/membership check (LINT-05). The plan only checks set-membership — gap, closed here.
- **D-11:** `audience` must be exactly `public` | `private`; missing and invalid both report `audience must be public|private` (LINT-03).
- **D-12:** Body spine: first non-blank line is an `# ` H1 (Title) **and** body contains a `**Role:**` line; both checked **independently** so both can be reported together (LINT-04).
- **D-13:** **Error aggregation:** name-field checks **cascade** (missing → non-kebab → reserved-word → ≠folder, one at a time — downstream name checks are meaningless once an earlier fails). All *other* fields (description, audience, body Title, body Role, each shared_reference) are collected **independently** and reported together.
- **D-14:** `template` and `dependencies` frontmatter keys are **accepted but not validated** in v1 (templates deferred; deps linted-as-present-only is a later phase). Unknown frontmatter keys are harmless.

### Config rule exactness (CONF)
- **D-15:** Config validator collects **all** missing required fields together: `name`, `version`, `description`, `plugins.public` (CONF-01).
- **D-16:** `plugins.public` and `plugins.private` (when present) are validated with the **same** letter-start kebab regex as skill names (CONF-02). The plan never validates plugin names — gap, closed here.
- **D-17:** `plugins.private` is optional (CONF-03).
- **D-18:** A malformed `motto.yaml` (YAML parse error) surfaces via the same `errors[]` model (D-01/D-02), consistent with skill parsing.

### Claude's Discretion
- Exact error-message wording (beyond the named anchors above) is left to implementation, provided each message names the skill and the failing rule clearly enough to be machine-greppable (`skill: message`).
- Internal helper decomposition within each function.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope (execution authority)
- `.planning/REQUIREMENTS.md` — PARSE-01..04, LINT-01..05, CONF-01..03 with exact regexes and rules. **The source of truth.**
- `.planning/ROADMAP.md` §"Phase 1: Pure Core" — phase goal + the 5 success criteria.
- `.planning/PROJECT.md` — constraints (Node ≥20, ESM, `node --test`, single dep `yaml`), philosophy (YAGNI, mechanism over features), Key Decisions table.

### Design & prior-art plan (reference only — NOT authority)
- `.planning/superpowers/specs/2026-06-29-motto-design.md` — approved design: 3-layer skill schema, body spine rationale, audience binary, shared-refs model. Inspirational brief.
- `.planning/superpowers/plans/2026-06-30-motto-core-cli.md` — 6-task TDD plan with concrete code. **Useful starting code, but it diverges from REQUIREMENTS in ≥6 places (see D-02, D-08, D-10, D-16, plus missing PARSE-02 normalization and PARSE-04 detection). Where it conflicts with REQUIREMENTS.md or the decisions above, REQUIREMENTS/CONTEXT win.** Treat its code as a draft to correct, not copy verbatim.

### Library
- CLAUDE.md (project instructions) §yaml — `parseDocument()` accumulates errors in `doc.errors[]` without throwing; this is why D-01/D-02 chose it over `YAML.parse`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None — greenfield.** No `src/`, `bin/`, `package.json`, or prior CONTEXT.md exist. Phase 1 creates `package.json` + the first `src/*.js` files.

### Established Patterns
- The superpowers plan's file decomposition (`src/frontmatter.js`, `src/schema.js`, `src/config.js`, one responsibility per file, co-located `test/*.test.js`) is a reasonable target structure — adopt the layout, correct the logic per the decisions above.

### Integration Points
- Function signatures must stay stable for Phase 2: `discoverSkills` will call `parseFrontmatter` and feed `validateSkill`; `lint` will aggregate `errors[]`. The uniform `errors[]` model (D-01) is chosen specifically so Phase 2 can concatenate parse + schema + config errors without try/catch wrappers.

</code_context>

<specifics>
## Specific Ideas

- The whole phase is essentially "implement the superpowers TDD plan's Tasks 1–3, but fix the requirement divergences." The divergences are enumerated as D-02/D-08/D-10/D-16 plus the two outright gaps (PARSE-02 normalization, PARSE-04 stray-`---`). A planner who treats the plan as authority will reproduce the bugs — the decisions above exist to prevent that.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Templates, MCP-dependency resolution, build/packaging, CLI, and discovery are already scoped to later phases or Out of Scope per REQUIREMENTS.md; no new capabilities were raised.)

</deferred>

---

*Phase: 1-Pure Core*
*Context gathered: 2026-06-30*
