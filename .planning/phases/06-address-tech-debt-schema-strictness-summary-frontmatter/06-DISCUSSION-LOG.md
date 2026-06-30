# Phase 6: Address tech debt: schema strictness + summary frontmatter - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 06-address-tech-debt-schema-strictness-summary-frontmatter
**Areas discussed:** Scope, Strictness checks, No-XML detection rule

---

## Scope (given 2 of 3 tech-debt buckets obsolete)

Codebase finding surfaced first: summary-frontmatter target files (`02-01`/`03-01`
SUMMARY) are deleted (phases 1-3 archived); doc nits are moot (CLAUDE.md already
MIT-free; "throws" wording only in archived v0.0.1-ROADMAP.md).

| Option | Description | Selected |
|--------|-------------|----------|
| Schema strictness only | Narrow to the one live item in src/schema.js; drop moot buckets | ✓ |
| Strictness + backlog cleanup | Also prune obsolete tech-debt lines from ROADMAP backlog | |
| Strictness + touch archived docs | Also rewrite "throws" in archived v0.0.1-ROADMAP.md | |

**User's choice:** Schema strictness only
**Notes:** Obsolete buckets dropped; archived/historical docs left untouched.

---

## Strictness checks

| Option | Description | Selected |
|--------|-------------|----------|
| Full spec conformance | description max-1024 + no-XML, AND name max-64 | ✓ |
| Description only (backlog literal) | description max-1024 + no-XML only | |

**User's choice:** Full spec conformance
**Notes:** name no-XML already enforced by NAME_KEBAB regex; only name max-64 is new.

---

## No-XML-tags detection rule

| Option | Description | Selected |
|--------|-------------|----------|
| Match a tag-like pattern | Flag /<[^>]+>/ — any <...> pair | ✓ |
| Flag any angle bracket | Reject any bare < or > | |

**User's choice:** Match a tag-like pattern
**Notes:** Mirrors Anthropic validator intent; literal <placeholder> in a description
will (acceptably) trip it.

---

## Claude's Discretion

- Error-message wording for the three new checks (match existing specific style).
- Cascade vs independent placement of the new checks within the D-13 model.
- `>` vs `>=` boundary (use spec-literal: error when length exceeds the max).

## Deferred Ideas

- Pruning the obsolete summary-frontmatter + doc-nit lines from the ROADMAP backlog
  (left in place per scope decision; future bookkeeping pass).
