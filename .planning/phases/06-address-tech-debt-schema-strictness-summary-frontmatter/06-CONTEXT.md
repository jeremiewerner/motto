# Phase 6: Address tech debt: schema strictness + summary frontmatter - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the **schema-strictness gap** in `src/schema.js`: `validateSkill` currently
checks only that `description` is present, but the CLAUDE.md skill-frontmatter spec
also requires length and no-XML-tag limits that are not enforced.

This phase makes `validateSkill` fully conformant with the CLAUDE.md spec for the
`name` and `description` frontmatter fields. Pure-function validator work — no CLI,
build, or dependency changes. Existing never-throw `errors[]` model (D-13) preserved.

**Scope narrowed during discussion:** The roadmap backlog originally bundled three
tech-debt buckets under this phase. Codebase inspection showed two are obsolete:
- *Summary frontmatter* (`requirements_completed` in `02-01`/`03-01` summaries):
  the v0.0.1 phase directories (1-3) were archived/deleted; the target SUMMARY files
  no longer exist. Moot.
- *Doc nits* (yaml MIT→ISC, ROADMAP SC#1 "throws"): current CLAUDE.md has no MIT
  license claim (already clean); the "throws" wording survives only in the
  **archived** `v0.0.1-ROADMAP.md` point-in-time record. Moot.

Only schema strictness is live and actionable. **This phase is schema strictness only.**

</domain>

<decisions>
## Implementation Decisions

### Scope
- **D-01:** Phase 6 = schema strictness **only**. The summary-frontmatter and
  doc-nit buckets are dropped as obsolete (target files deleted or archived). No
  edits to archived v0.0.1 docs.
- **D-02:** Backlog cleanup of the two obsolete lines was NOT selected — leave the
  ROADMAP backlog as-is. (User chose "Schema strictness only".)

### Strictness checks to add to `validateSkill`
- **D-03:** Full CLAUDE.md spec conformance for `name` + `description`. Add three
  new checks:
  - `description` max **1024** chars
  - `description` no XML tags
  - `name` max **64** chars
- **D-04:** `name` no-XML-tags needs no new check — the existing `NAME_KEBAB` regex
  (`/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`) already forbids `<` and `>`.

### No-XML-tags detection rule
- **D-05:** Flag a tag-like pattern `/<[^>]+>/` (any `<...>` pair) in `description`.
  Mirrors Anthropic's skill-validator intent. A description literally using
  `<placeholder>` syntax will trip it — acceptable; the spec says no XML tags.

### Claude's Discretion
- Exact error-message wording for the three new checks (match the existing
  specific/actionable style, e.g. include the offending field + limit).
- Cascade vs independent placement: `description` length/XML checks should run only
  when `description` is present (can't measure a missing value) and are otherwise
  independent (D-13 model). `name` max-64 placement within the name cascade (after
  kebab passes, to avoid double-erroring a non-kebab name) is the planner's call.
- Whether max-1024/max-64 use `>` or `>=` boundary — pick the spec-literal reading
  (length **must not exceed** the max, i.e. length > limit is the error).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema spec (the contract being enforced)
- `.claude/CLAUDE.md` § "SKILL.md frontmatter — exact specification" — the
  authoritative `name` (max 64, no XML tags) and `description` (non-empty, max 1024,
  no XML tags) rules this phase enforces.

### Code under change
- `src/schema.js` — `validateSkill` + `NAME_KEBAB`; the only file this phase edits.
  D-13 error-aggregation model (name cascade; other checks independent) documented
  inline.
- `test/` — existing 53-test suite (`node --test`); new checks need new cases.

### Background (why two buckets are moot)
- `.planning/v0.0.1-MILESTONE-AUDIT.md` — records the summary-frontmatter +
  doc-nit tech debt; confirms requirements were satisfied via VERIFICATION, not the
  SUMMARY frontmatter field.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `validateSkill` already has the `err(message)` helper and the independent-check
  pattern for `description` (presence), `audience`, body spine, and
  `shared_references`. New `description` checks slot directly beside the existing
  presence check.
- `NAME_KEBAB` exported regex already constrains `name` charset (no XML possible).

### Established Patterns
- Never-throw, return `errors[]` (D-01). New checks push to `errors`, never throw.
- D-13: name checks CASCADE (stop at first failure); all other field checks are
  INDEPENDENT and accumulate.
- Error messages are specific and quote the offending value.

### Integration Points
- Pure function; no callers change. `lint.js` consumes `errors[]` unchanged.
- Dogfood test (`test/dogfood.test.js`) lints the real tree — confirm Motto's own
  skill descriptions stay under 1024 chars / XML-free so the new checks don't
  regress the self-host (they should; descriptions are short prose).

</code_context>

<specifics>
## Specific Ideas

- The three new checks mirror the CLAUDE.md table verbatim: name "Max 64 chars …
  No XML tags"; description "Non-empty. Max 1024 chars. No XML tags."

</specifics>

<deferred>
## Deferred Ideas

- ROADMAP backlog still lists the obsolete summary-frontmatter + doc-nit tech-debt
  lines. Left in place per D-02; a future bookkeeping pass could prune them.

</deferred>

---

*Phase: 06-address-tech-debt-schema-strictness-summary-frontmatter*
*Context gathered: 2026-06-30*
