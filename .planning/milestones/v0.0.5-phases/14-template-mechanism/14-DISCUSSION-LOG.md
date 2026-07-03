# Phase 14: Template Mechanism - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 14-Template Mechanism
**Areas discussed:** Tag-match strictness, Lint error UX, Malformed template: values, waives + init scaffold

---

## Tag-match strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Matched pair | Both `<process>` and `</process>` must exist; catches unclosed sections | ✓ |
| Opening tag only | Just `<process>` anywhere; simplest, but unclosed tags ship broken structure | |
| Line-start anchored | Tag must open its own line (`^<process>`); gsd-core convention | ✓ |
| Anywhere in line | More forgiving, more false positives | |
| Fenced blocks only | Line-anchoring already covers inline spans; meets roadmap SC3 exactly | ✓ |
| Fenced + inline spans | Strip both; more parsing code for a mostly-covered case | |
| Bare tags only | Exact `<process>`, no attributes; rigid spine, greppable | ✓ |
| Attributes allowed | `<process…>`; forgiving, weaker uniformity | |

**User's choice:** All four recommended options (matched pair, line-anchored, fenced-only, bare tags).
**Notes:** None.

---

## Lint error UX

| Option | Description | Selected |
|--------|-------------|----------|
| One error per section | Matches D-13 independent-check aggregation | ✓ |
| One combined error | Terser, breaks one-check-one-error pattern | |
| Include registry description | SECTIONS doubles as doc source; error teaches the section | ✓ |
| Tag name only | Terser; author consults skill-schema.md | |
| Sorted names inline | `unknown template "procedur" (available: procedure)` | ✓ |
| Names + descriptions | Multi-line, needs description field on TEMPLATES | |
| Name the template | `template "procedure" requires <process>…</process> section — …` | ✓ |
| Omit template name | Shorter; rule source implicit | |

**User's choice:** All four recommended options.
**Notes:** None.

---

## Malformed template: values

| Option | Description | Selected |
|--------|-------------|----------|
| Cascade | non-string → unknown → sections; absent key skips (TMPL-05) | ✓ |
| Independent | Can't check sections for unresolved template — doesn't fit | |
| Plain type error | `template must be a string (got object)`; no future hint (YAGNI) | ✓ |
| Hint at future | Promises a feature that may never ship | |
| Error on empty/falsy | Key present = intent declared; silent skip masks typos | ✓ |
| Treat as absent | Forgiving but masks mistakes | |

**User's choice:** All three recommended options.
**Notes:** Area closed after 3 questions — YAML boolean/case-sensitivity gotchas fall out of the cascade's type/unknown checks.

---

## waives + init scaffold

| Option | Description | Selected |
|--------|-------------|----------|
| Implement waives now | Keeps "new template = data-only edit" promise; fixture-tested | ✓ |
| Document-only | Purer YAGNI, but promise holds only for non-waiving templates | |
| Init untouched | Starter skill demos base schema; template demo in Phases 16/17 | ✓ |
| Init adopts template | Showcase mechanism; costs init.js + dogfood churn now | |
| Adopt on existing skill | `release` gains `template: procedure`; live dogfood proof in-phase | ✓ |
| Fixtures only | First live consumer waits for build-skill (Phase 16) | |

**User's choice:** Implement waives, init untouched, `release` adopts `template: procedure`.
**Notes:** None.

## Claude's Discretion

- Exact regex/parse implementation for fence-aware line scanning.
- Whether template validation lives inside `validateSkill` or a sibling pure validator.
- Final wording polish of error strings (structure/content fixed by decisions).

## Deferred Ideas

None — discussion stayed within phase scope.
