# Phase 18: Role Section Tag Migration - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the base-spine role declaration from the `**Role:**` bold-line convention to a `<role>…</role>` section tag, consistently across the linter, both live skills (`release`, `build-skill`), the `motto init` hello-world starter, `build-skill`'s generation instructions and quality gate, `shared/references/skill-schema.md` (+ doc-sync test), and README examples. Hard break — no dual-accept window. The role rule becomes registry data (base spine partially data-driven). No other spine or template semantics change.

</domain>

<decisions>
## Implementation Decisions

### Break policy
- **D-01: Hard break** — only `<role>…</role>` satisfies the role check; `**Role:**` no longer passes lint. No dual-accept window, no deprecation tier. Pre-1.0, repo-private, only 2 live skills + init starter to migrate — all migrated in this phase.
- **D-02: Leftover `**Role:**` lines are inert** — they become plain body text; lint reports only the missing/empty `<role>` section. No negative "legacy line detected" check.

### Mechanism placement
- **D-03: Registry-driven base spine** — `role` joins `SECTIONS` in `src/templates.js` with a human description; a new `BASE_SPINE` data export lists spine tag-sections (just `role` today). `src/schema.js` loops `BASE_SPINE`, using the existing `hasClosedSection` scanner and honoring the existing `waivedSections` cascade (template `waives: ["role"]` semantics carry over unchanged). Error strings compose from the `SECTIONS` description.
- **D-04: Title check stays as-is** — it is an H1-line rule, not a section tag; `BASE_SPINE` holds tag-sections only. The hardcoded title check with its `waives("title")` escape is untouched. No generalized rule-engine.

### <role> content rules
- **D-05: Non-empty required** — content between `<role>` and `</role>` must contain non-whitespace. Closes the documented empty-Role gap (skill-schema.md previously noted empty roles pass). Content *quality* remains build-skill's prose gate, not lint's.
- **D-06: Non-empty check is role-only this phase** — do NOT extend emptiness checking to `<process>`/`<success_criteria>`. Implement via a small helper so later generalization is a per-section one-liner (see Deferred).
- **D-07: No position or multiplicity constraints** — `<role>` may appear anywhere in the body; first match wins; duplicates are harmless. Same semantics as template sections / `hasClosedSection` as-built. The "right after H1" placement is a docs/scaffold convention only, never lint-enforced.

### Docs & error strings
- **D-08: Two distinct lint errors** — one for missing `<role>` (composed with the `SECTIONS.role` description, per D-03 shape) and a separate one for an empty `<role>` section. Both strings must land in skill-schema.md's error tables AND `test/doc-sync.test.js` (which currently quotes `body must contain a **Role:** line` — that string is replaced).
- **D-09: No legacy mention in skill-schema.md** — the doc describes the current validator only (Phase 17 D-04 spirit). `**Role:**` simply disappears from the doc; no migration note.

### Claude's Discretion
- Exact wording of the `SECTIONS.role` description and the two error strings (constraints: one-line, quoted-value/hint house style from Phases 14/15; missing-role error composes description per D-03).
- build-skill SKILL.md prose updates: generation instructions emit `<role>` sections; quality gate keeps the "behavioral, not a bare label" content check (lint now covers emptiness). Keep DOC-06 invariants (no duplicated lint strings/regexes).
- README, init starter, and test-fixture migration wording — mechanical swaps to the tag form.
- Whether `frontmatter.js` B8 comments referencing `**Role:**` need touching (the alias-throw regression guard stays regardless — it guards a YAML parsing property, not the spine rule).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Code being changed
- `src/schema.js` — role check at lines ~322-329 (the code being migrated); `hasClosedSection` scanner; `waivedSections` cascade the new BASE_SPINE loop must honor
- `src/templates.js` — `SECTIONS`/`TEMPLATES` registry gaining `role` + new `BASE_SPINE` export
- `src/init.js` — hello-world starter template containing a `**Role:**` line (line ~46)

### Live artifacts to migrate
- `skills/release/SKILL.md` — `**Role:**` line ~14
- `skills/build-skill/SKILL.md` — `**Role:**` line ~16 + generation instructions and quality-gate prose referencing `**Role:**` (lines ~68, ~90)

### Docs & their drift guard
- `shared/references/skill-schema.md` — base-spine section (~lines 98-103, 305) documenting the Role rule + the "empty Role passes" caveat D-05 obsoletes; error tables must carry the two new strings
- `test/doc-sync.test.js` — quotes `'body must contain a **Role:** line'` (line ~38); must be updated to the new strings in the same commit
- `README.md` — spine example and rule description (~lines 108-114)

### Decision provenance
- `.planning/phases/17-docs-audit/17-CONTEXT.md` — D-02 (exact lint strings in doc), D-03 (doc-sync test guards drift), D-04 (no version header) — all constrain how the new strings propagate
- `.planning/phases/14-template-mechanism/14-CONTEXT.md` — section-tag matching semantics (`hasClosedSection`, fence-awareness, open-before-close) the role tag inherits

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hasClosedSection(bodyStr, section)` in `src/schema.js` — fence-aware, open-before-close section matcher built in Phase 14; the role tag check reuses it verbatim. The non-empty check (D-05) is the only new scanning behavior.
- `waivedSections` set — already consulted by the current role check (`waives: ["role"]` mechanism exists, unused); BASE_SPINE loop keeps consulting it.
- `test/doc-sync.test.js` source-text extraction pattern (Phase 17) — the new error strings slot into the existing assertion list.

### Established Patterns
- Error-string house style (Phases 14/15): one line, quoted offending value, inline hint/description. Template errors already compose `SECTIONS` descriptions (`template "x" requires <s>…</s> — {description}`) — the missing-role error follows the same shape.
- Never-throw invariant: any new validator path needs adversarial malformed-input tests (memory: tests-green-but-broken recurred 3 milestones running — code review + adversarial tests mandatory).
- Dogfood: `motto lint` runs against `skills/` in the test suite; migrating the two live skills and the linter must land in the same commit or main goes red.

### Integration Points
- Test fixtures: ~30 inline `**Role:**` fixture bodies across `test/schema.test.js`, `test/lint.test.js`, `test/build.test.js`, `test/frontmatter.test.js` — all must swap to `<role>` bodies (mechanical, but large diff surface).
- `frontmatter.js` B8 regression guard (`**Role:** Guide.` before a `---`) — keep the test as a YAML-property guard; the fixture string itself need not change.
- `motto build` copies SKILL.md verbatim — no build-side changes; dist output follows source migration automatically.

</code_context>

<specifics>
## Specific Ideas

- The BASE_SPINE loop shape sketched during discussion (user-approved preview): `for (const s of BASE_SPINE) { if (!waivedSections.has(s) && !hasClosedSection(bodyStr, s)) err(\`body must contain <${s}>…</${s}> — ${SECTIONS[s]}\`); }` — planner may refine, but registry-consumption shape is the intent.
- `<role>` unlocks multi-line role declarations (the bold-line form was single-line by convention) — scaffold/doc examples may show a multi-line role.

</specifics>

<deferred>
## Deferred Ideas

- **Non-empty content check generalized to all template `requiredSections`** (`<process>`, `<success_criteria>`) — same helper, per-section opt-in; future phase.

</deferred>

---

*Phase: 18-migrate-base-spine-role-to-role-section-tag*
*Context gathered: 2026-07-03*
