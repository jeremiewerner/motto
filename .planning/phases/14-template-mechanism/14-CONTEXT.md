# Phase 14: Template Mechanism - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

`template:` frontmatter field validated by lint, driven entirely by a pure-data registry (`src/templates.js` — `SECTIONS` tag→description map + `TEMPLATES` name→rules map). The `procedure` template ships, requiring `<process>` + `<success_criteria>` body sections. Skills without `template:` behave byte-for-byte as v0.0.4 (TMPL-05 regression guard). Adding a new template = data-only edit. Requirements: TMPL-01..05.

Out of this phase: `outputs:`/`dependencies:`/`allowed-tools` validation (Phase 15), build-skill (Phase 16), doc rewrite (Phase 17).

</domain>

<decisions>
## Implementation Decisions

### Section-tag matching
- **Matched pair required** — both `<process>` and `</process>` must exist; an unclosed section fails. Presence-only; content is free (D-07).
- **Line-start anchored** — tag must open its own line (`^<process>`); prose mentioning a tag mid-sentence never counts.
- **Fenced code blocks only excluded** — lines inside ``` fences ignored (roadmap SC3). Inline code spans need no special handling: line-anchoring already excludes them.
- **Bare tags only** — exact `<process>`, no attributes. Attributed tags (gsd-core style `<step name=...>`) are inner-tag territory, not the required spine.

### Lint error UX
- **One error per missing section** — matches schema.js D-13 independent-check aggregation; each pushes its own `{skill, message}`.
- **Error names the template AND includes the SECTIONS registry description** — e.g. `template "procedure" requires <process>…</process> section — Numbered steps the agent executes, in order.` Registry doubles as doc source (D-07); author learns the section's meaning from the error itself.
- **Unknown template: sorted names inline** — e.g. `unknown template "procedur" (available: procedure)`. Names only, alphabetical, one line.

### Malformed `template:` values
- **Cascade validation** (name-cascade precedent in schema.js): non-string → stop; unknown name → stop; else enforce sections. Absent key → skip template checks entirely (this is the TMPL-05 guard: only truly ABSENT key means base schema).
- **Array value** → plain type error `template must be a string (got object)`. No forward-compat hint (YAGNI; multi-template already traced in evolution ledger).
- **Empty/falsy value with key present** → error, never silent fallback to base schema. Key written = intent declared; silent skip would mask a typo.
- Never-throw invariant applies: all template validation returns errors[], adversarial malformed-input tests mandatory (standing invariant, see memory of v0.0.2 hardening).

### waives mechanism
- **Implement the `waives` merge logic now**, exercised via a test-fixture template. Rationale: success criterion 5 promises "new template = data-only edit" — that promise breaks if waives-using templates need mechanism code. `procedure` itself waives nothing.

### Init scaffold & dogfood
- **`motto init` starter skill untouched** — it demos the BASE schema; template demo belongs to README/skill-schema.md (Phase 17) and build-skill (Phase 16). No init.js churn this phase.
- **Live dogfood in-phase: an existing Motto skill (`release` — procedural, natural fit) adopts `template: procedure`** — requires adding `<process>`/`<success_criteria>` to its body. Dogfood test proves enforcement on the live tree, not just fixtures.

### Claude's Discretion
- Exact regex/parse implementation for fence-aware line scanning.
- Where template validation hooks into `validateSkill` vs a sibling validator — planner decides against never-throw + purity constraints (schema.js is a pure object validator; keep it that way).
- Exact wording polish of error strings (decisions above fix structure and content, not final phrasing).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design authority
- `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` — v0.0.5 design spec: D-01..D-08 decisions, `src/templates.js` data shape (§1), `procedure` template rules (§2), evolution ledger. Inspirational brief; GSD .planning artifacts are execution authority.

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — TMPL-01..05 definitions + phase-research note on init-scaffold impact (resolved: untouched).
- `.planning/ROADMAP.md` §Phase 14 — success criteria 1–5.

### Code to extend
- `src/schema.js` — pure validator, D-13 cascade/independent error model, NAME_KEBAB precedent for cascade structure. Never throws (D-01).
- `src/lint.js` — orchestrator wiring; `processSkill` is where template enforcement surfaces.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schema.js` `validateSkill` — the merge point for template rules; its `err()` helper + `{skill, message}` shape carry over.
- D-13 cascade pattern (name checks) — direct precedent for the template-field cascade.
- Dogfood test (init → lint → build) — extend to cover live `template: procedure` on the `release` skill.

### Established Patterns
- Never-throw invariant (D-01) across all validators; adversarial malformed-input tests are a standing requirement (3 violations slipped past gates in v0.0.2 — regression-guarded since).
- Pure data / pure functions: schema.js has no filesystem or YAML imports — `templates.js` must be equally pure (data only, no per-template code).
- Error style: quoted offending value + hint, one line.

### Integration Points
- `src/templates.js` (new) imported by the validator layer.
- `skills/release/SKILL.md` gains `template: procedure` + `<process>`/`<success_criteria>` body sections.
- Test suite: `node --test`, 131 existing tests; TMPL-05 needs a byte-identical regression proof for template-less skills.

</code_context>

<specifics>
## Specific Ideas

- Error example agreed in discussion: `template "procedure" requires <process>…</process> section — Numbered steps the agent executes, in order.`
- Unknown-template example: `unknown template "procedur" (available: procedure)`.
- gsd-core (5.7k★) analyzed as prior art: XML section spine at scale validates the tag approach.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Evolution ledger items — multi-template arrays, action tags, `<role>` migration — already traced in the design spec and REQUIREMENTS.md Future Requirements.)

</deferred>

---

*Phase: 14-Template Mechanism*
*Context gathered: 2026-07-03*
