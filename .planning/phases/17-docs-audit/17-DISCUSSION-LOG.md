# Phase 17: Docs Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 17-docs-audit
**Areas discussed:** Schema doc rewrite depth, Version header policy, build-skill Step 2 delta fate, README build-skill flow

---

## Schema doc rewrite depth

| Option | Description | Selected |
|--------|-------------|----------|
| Surgical patch | Keep the existing 7-section structure; fix §6, add outputs/allowed-tools sections, update header | ✓ |
| Full restructure | Reorganize the whole doc, rewrite every section against src/schema.js from scratch | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep exact strings | Exact error tables — the doc's role is canonical rule source; grep-the-message debugging | ✓ |
| Behavioral descriptions only | No verbatim strings; kills sync risk but readers can't grep error messages | |
| Hybrid | Exact strings for stable cascades, behavioral for newer fields | |

| Option | Description | Selected |
|--------|-------------|----------|
| Doc-sync test | node:test asserting quoted strings match src/schema.js; drift breaks the suite at commit | ✓ |
| No test, review-time only | Rely on habit + review — this failure mode already happened once | |

**User's choice:** Surgical patch + keep exact strings + doc-sync test
**Notes:** §1–§5/§7 verified current at discussion time; §6 is the only false section. DOC-06 protects build-skill's prose, not this reference.

---

## Version header policy

| Option | Description | Selected |
|--------|-------------|----------|
| No version, cite source | "Derived from src/schema.js"; doc-sync test is the freshness guarantee | ✓ |
| Package version | Pin to package.json — accurate at ship time, manual bump every release | |
| Package version + release checklist | Pin + extend doc-sync test to assert header matches package.json | |

**User's choice:** No version, cite source
**Notes:** The stale v0.0.2 header (package at 0.0.3, milestone v0.0.5) is itself the motivating instance of version-pin drift.

---

## build-skill Step 2 delta fate

| Option | Description | Selected |
|--------|-------------|----------|
| Remove both | Step 2 becomes "read the bundled reference"; no delta, no supersede clause | ✓ |
| Keep thin supersede guard | One generic "trust the linter" sentence as permanent belt-and-braces | |
| Leave untouched | Out of scope — but ships prose describing a staleness that no longer exists | |

**User's choice:** Remove both
**Notes:** Re-lint + suite green required after the edit; DOC-06 grep invariants must still hold.

---

## README build-skill flow

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite around build-skill | Document the real flow: any input → gap-fill → lint loop → quality gate → receipt | ✓ |
| Mechanical swap | Replace 8 references, keep prose — but prose describes the old interview behavior | |

| Option | Description | Selected |
|--------|-------------|----------|
| build-skill | Real public skill in dist/public/ — examples stay copy-paste runnable against this repo | ✓ |
| hello-world | Matches a new user's project but doesn't exist in Motto's own dist/ | |
| Both | build-skill for install-Motto's-skills, hello-world for ship-your-plugin | |

**User's choice:** Rewrite around build-skill + build-skill as sample name
**Notes:** 8 author-skill reference sites at lines ~95, 143, 203, 254, 267, 270, 275, 278.

## Claude's Discretion

- Exact prose wording of new schema-doc sections (rule statement + YAML example + error table, matching §1–§5 house style)
- Doc-sync test implementation shape (assertion direction, string extraction)
- README section ordering/length for the rewritten flow

## Deferred Ideas

None — discussion stayed within phase scope.
