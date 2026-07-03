# Phase 18: Role Section Tag Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 18-migrate-base-spine-role-to-role-section-tag
**Areas discussed:** Break policy, Mechanism placement, <role> content rules, Docs & error strings

---

## Break policy

| Option | Description | Selected |
|--------|-------------|----------|
| Hard break | Only `<role>…</role>` passes; `**Role:**` fails with the standard missing-role error. No dual-path validator code, no deprecation ledger. Pre-1.0, repo-private, 2 live skills + init starter. | ✓ |
| Dual-accept, silent | Both forms pass this milestone; removal deferred. Two spellings stay alive in docs and build-skill guidance. | |
| Dual-accept + hint | Both pass, `**Role:**` emits a nudge — lint has no warning tier, would need new severity concept. | |

**User's choice:** Hard break (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Just not sufficient | `**Role:**` becomes inert body text; lint only reports missing `<role>`. Zero extra validator surface. | ✓ |
| Actively reject | Presence of a legacy `**Role:**` line is its own lint error. Better migration UX but permanent negative check for a convention nobody external uses. | |

**User's choice:** Just not sufficient (recommended)

---

## Mechanism placement

| Option | Description | Selected |
|--------|-------------|----------|
| Registry-driven spine | `role` joins SECTIONS in src/templates.js; new BASE_SPINE data list; schema.js consumes registry via existing hasClosedSection; error string composes SECTIONS description. | ✓ |
| Minimal hardcoded swap | Keep check at schema.js:322, swap regex for hasClosedSection call. Smallest diff but spine stays code. | |

**User's choice:** Registry-driven spine (recommended), approved the BASE_SPINE loop preview sketch.

| Option | Description | Selected |
|--------|-------------|----------|
| Title stays as-is | Title is an H1-line rule, not a section tag; BASE_SPINE holds tag-sections only. No forced abstraction. | ✓ |
| Fold title into registry | Generalize BASE_SPINE entries with a check type — rule-engine shape for exactly 2 rules. | |

**User's choice:** Title stays as-is (recommended)

---

## <role> content rules

| Option | Description | Selected |
|--------|-------------|----------|
| Require non-empty | Content between tags must be non-whitespace; closes the documented empty-Role gap. Quality stays prose-side. | ✓ |
| Structure only | Matched open+close tags suffice, consistent with template sections. | |

**User's choice:** Require non-empty (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Role-only | Phase scope is the role migration; generalization to process/success_criteria deferred; implement via small helper. | ✓ |
| All required sections | Close the emptiness gap everywhere in one move — widens the phase, touches template semantics. | |

**User's choice:** Role-only (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| None | `<role>` anywhere in body, first match wins, duplicates harmless — hasClosedSection semantics as-built. Placement is docs convention. | ✓ |
| Must follow H1 | Position-aware scanning, a rule template sections don't have. | |

**User's choice:** None (recommended)

---

## Docs & error strings

| Option | Description | Selected |
|--------|-------------|----------|
| Two distinct errors | Missing vs empty each get their own string; grep-the-message debugging; both land in skill-schema.md tables + doc-sync test. | ✓ |
| One combined error | Single "non-empty <role>" string — fewer strings to sync but misleading for empty-tag case. | |

**User's choice:** Two distinct errors (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| No legacy mention | Doc describes current validator only (Phase 17 D-04 spirit); hard break + private repo. | ✓ |
| Brief migration note | One-line "formerly **Role:**" note — manual-sync prose the doc-sync test can't guard. | |

**User's choice:** No legacy mention (recommended)

---

## Claude's Discretion

- Exact wording of SECTIONS.role description and the two error strings (house style: one line, quoted value, inline hint).
- build-skill SKILL.md prose updates (generation emits `<role>`; quality gate keeps behavioral-content check; DOC-06 invariants preserved).
- README, init starter, test-fixture migration wording.
- Whether frontmatter.js B8 comments need touching (regression guard stays).

## Deferred Ideas

- Non-empty content check generalized to all template requiredSections (`<process>`, `<success_criteria>`) — future phase.
