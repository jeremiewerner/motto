# Phase 15: Field Validation & Integrity Guards - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 15-Field Validation & Integrity Guards
**Areas discussed:** allowed-tools accepted shapes, outputs: existence & path-safety, dependencies guards & error UX, empty-field policy & init scaffold

---

## allowed-tools accepted shapes

| Option | Description | Selected |
|--------|-------------|----------|
| Option A — non-empty string only | Research recommendation; YAML list item = one permission rule by construction; least code, zero false rejections | ✓ |
| Option B — bare-or-parenthesized regex | Catches malformed entries; risk of false-rejecting future valid spec forms | |

**User's choice:** Option A (resolves the ROADMAP.md research flag / STACK.md Q2)

| Option | Description | Selected |
|--------|-------------|----------|
| String or array both valid | Matches every documented spec form (agentskills.io string; code.claude.com string or list) | ✓ |
| Array only | Design D-05 literal; conflicts with portability fundamental | |
| Array only + conversion hint | Opinionated linter stance | |

**User's choice:** String or array both valid
**Notes:** String form checked non-empty only (no tokenizing). Per-entry error granularity + exact wording left to Claude (shared_references precedent).

---

## outputs: existence & path-safety

| Option | Description | Selected |
|--------|-------------|----------|
| No special case — literal existence check | `{var}` in filenames fails existence check naturally; {var} lives in file content | ✓ |
| Skip existence check when path contains {var} | Silently unverified entries — hole in VAL-01 | |
| Explicitly reject {var} in path values | Clearer error, extra rule to maintain | |

**User's choice:** Literal existence check

| Option | Description | Selected |
|--------|-------------|----------|
| Split: lexical pure, fs at lint layer | Lexical guards in schema.js; existence + symlink-realpath in lint.js | ✓ |
| All outputs checks at lint layer | One place, loses schema.js unit-test cheapness | |
| You decide | | |

**User's choice:** Purity split

| Option | Description | Selected |
|--------|-------------|----------|
| Cascade per entry | D-10 precedent: non-string → unsafe → missing → symlink-escape; one error per entry | ✓ |
| Report all failures per entry | Noise once path flagged unsafe | |

**User's choice:** Cascade per entry

---

## dependencies guards & error UX

| Option | Description | Selected |
|--------|-------------|----------|
| NAME_KEBAB both halves, one colon | Reuse exported regex (D-16); real check, zero new patterns | ✓ |
| Colon present = accept | Loosest; junk passes | |
| You decide | | |

**User's choice:** NAME_KEBAB both halves, exactly one colon

| Option | Description | Selected |
|--------|-------------|----------|
| Self-only, defer cycles | VAL-04 as written; cycle detection YAGNI until dep graph has a consumer | ✓ |
| Full cycle detection now | Speculative machinery | |

**User's choice:** Self-only; transitive cycles deferred

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — exactly that rule | Only public→private fails; namespaced exempt | ✓ |
| Stricter variant | | |

**User's choice:** Confirmed minimal audience-direction rule

| Option | Description | Selected |
|--------|-------------|----------|
| List available skills inline | Phase 14 unknown-template precedent; sorted, one line | ✓ |
| No list — quoted value + hint only | Scales to big trees | |
| You decide | | |

**User's choice:** List available skills inline

---

## Empty-field policy & init scaffold

| Option | Description | Selected |
|--------|-------------|----------|
| Empty containers valid no-op | Empty list/map = coherent "zero" statement; wrong TYPE still errors | ✓ |
| Mirror template — any empty value errors | Uniform doctrine, forces key deletion | |
| Empty errors for null/"" only, containers OK | Middle ground | |

**User's choice:** Empty containers valid no-op (template's present-falsy rule stays template-specific)

| Option | Description | Selected |
|--------|-------------|----------|
| Untouched again | Base-schema demo stays minimal; docs Phase 17, examples via build-skill Phase 16 | ✓ |
| Add example fields to starter skill | init.js churn + complexity | |

**User's choice:** Init scaffold untouched (standing cross-phase check resolved)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — release gains allowed-tools | Honest use (real git/npm commands); live-tree enforcement proof | ✓ |
| Fixtures only this phase | | |
| You decide | | |

**User's choice:** `release` dogfoods `allowed-tools`; outputs/dependencies fixtures-only

---

## Claude's Discretion

- Exact error-string wording (structure fixed: one line, quoted value + hint)
- realpath/containment implementation for symlink-escape check
- How cross-skill context (name→audience map) threads into validation
- Whether string-form vs array-form allowed-tools shares one code path

## Deferred Ideas

- Transitive dependency-cycle detection (A→B→A) — until something consumes the dep graph
