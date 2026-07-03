# Phase 15: Field Validation & Integrity Guards - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Three new OPTIONAL frontmatter fields validated by `motto lint` with integrity guards: `outputs:` (named map name→file, files exist inside skill dir, path-safe — no traversal, no absolute, no symlink escape), `dependencies:` (bare-kebab entries resolve in-tree; namespaced `plugin:skill` format-checked only; audience-direction + self-dependency guards), `allowed-tools` (format-checked only — tool existence is runtime-dependent). Every new validator never-throws with adversarial malformed-input tests. Requirements: VAL-01..06.

Out of this phase: build-skill (Phase 16), skill-schema.md/README docs (Phase 17), transitive dependency-cycle detection (deferred), any `motto build` behavior change for these fields.

</domain>

<decisions>
## Implementation Decisions

### allowed-tools accepted shapes (resolves STACK.md Q2 roadmap flag)
- **Option A locked** — each entry must be a non-empty string; NO shape regex. `Bash(git add *)` passes trivially because a YAML list item is one permission rule by construction. Malformed = wrong container type, non-string entry, empty string.
- **Container: string OR array both valid** — matches every documented spec form (agentskills.io space-separated string; code.claude.com space/comma-separated string or YAML list). Portability fundamental: a valid Agent Skill must pass lint. String form checked non-empty only (no tokenizing — format-only stance); array form checked per-entry.

### outputs: existence & path-safety
- **Literal existence check, no `{var}` special case** — path must exist as written; a `{var}` in a path value fails the existence check naturally (zero extra code). `{var}` placeholders live inside file CONTENT (D-08 convention), never in path values. build-skill (Phase 16) authors accordingly.
- **Purity split** — lexical guards (non-string value, `..` traversal, absolute path) stay in pure `src/schema.js`; fs-dependent checks (file existence, symlink-realpath containment) live at the `src/lint.js` orchestration layer (sharedRefs-loading precedent). Both layers never-throw.
- **Per-entry cascade** (shared_references D-10 precedent): non-string → stop; unsafe path (traversal/absolute) → stop, skip fs checks; else missing-file; else symlink-escape. One error per entry; entries independent of each other.

### dependencies guards & error UX
- **Namespaced format: exactly one colon, NAME_KEBAB on both halves** — reuse the exported `NAME_KEBAB` regex (D-16). `Foo:bar`, `a::b`, `:x` all fail with quoted-value errors.
- **Self-dependency only (VAL-04 as written)** — transitive cycle detection (A→B→A) deferred; YAGNI until something consumes the dep graph.
- **Audience guard: ONLY public→private fails** (private-name leak in dist). private→private, private→public, public→public all pass. Namespaced entries exempt — external, audience unknowable, format-only per D-05.
- **Unresolved bare dep error lists available skills inline** — e.g. `dependency "relase" not found (available: author-skill, release)`. Sorted names, one line. Phase 14 unknown-template precedent.

### Empty-field policy
- **Empty containers are valid no-ops** — `outputs: {}`, `dependencies: []`, `allowed-tools: []` pass (an empty list/map is a coherent "zero deps/outputs" statement, like `shared_references: []` today). Wrong TYPE still errors. Empty string `""` for allowed-tools errors (non-empty rule above). Phase 14's present-but-falsy-errors rule stays specific to `template:` (broken pointer to one thing ≠ coherent empty set).

### Init scaffold & dogfood
- **`motto init` starter skill untouched** (standing cross-phase check, same call as Phase 14) — all three fields optional; base-schema demo stays minimal. Docs land in Phase 17, example usage via build-skill in Phase 16.
- **Live dogfood: `release` skill gains `allowed-tools`** — it runs real git/npm commands, honest use. Proves live-tree enforcement like Phase 14's `template: procedure`. `outputs:`/`dependencies:` are fixtures-only this phase (no honest live consumer yet).

### Claude's Discretion
- Exact error-string wording (structure fixed above: one line, quoted offending value + hint).
- Exact realpath/containment implementation for the symlink-escape check.
- How cross-skill context (skill-name→audience map for dependency guards) is threaded into validation — planner decides against never-throw + schema.js purity constraints.
- Whether string-form vs array-form allowed-tools shares one code path.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design authority
- `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` — v0.0.5 design spec: D-04 (named outputs map), D-05 (deps in-tree / allowed-tools format-only), D-06 (field name `allowed-tools`), D-08 (`{var}` convention-only), §validation rules. Inspirational brief; GSD .planning artifacts are execution authority.
- `.planning/research/STACK.md` §Q2 — allowed-tools spec verification (agentskills.io + code.claude.com forms, Option A/B analysis; Option A chosen) and §Q3 — outputs/dependencies confirmed Motto-original, non-colliding.

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — VAL-01..06 definitions.
- `.planning/ROADMAP.md` §Phase 15 — success criteria 1–5 + research flag (resolved: Option A).

### Code to extend
- `src/schema.js` — pure validator; NAME_KEBAB export (reuse for namespaced deps), D-13 cascade/independent model, shared_references D-10 per-entry cascade precedent, TEMPLATE cascade precedent. Never throws (D-01).
- `src/lint.js` — orchestrator; `loadSharedRefs`/`processSkill` pattern is the precedent for fs-dependent checks and cross-skill context threading.
- `skills/release/SKILL.md` — dogfood target: gains `allowed-tools`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NAME_KEBAB` (exported from `src/schema.js`) — namespaced-dependency halves check.
- shared_references validation loop (`src/schema.js`) — direct template for per-entry cascade on outputs/dependencies/allowed-tools arrays.
- `loadSharedRefs` + `processSkill` in `src/lint.js` — pattern for gathering cross-skill context (all skill names + audiences) before per-skill validation, and for fs-dependent checks outside pure schema.js.
- Dogfood test (init → lint → build) — extend for `release` + `allowed-tools` and for fixture skills exercising the new fields.

### Established Patterns
- Never-throw invariant (D-01) — all validators return errors[]; adversarial malformed-input tests mandatory (VAL-06; standing since v0.0.2 hardening).
- Type-guard-before-method cascade (NAME + TEMPLATE precedents) — guard `typeof` before any string/array method to keep never-throw.
- Error style: one line, quoted offending value + hint; independent checks accumulate, per-entry cascades stop at first failure.
- schema.js purity: no fs/YAML imports — fs-dependent path checks must NOT land there.

### Integration Points
- `validateSkill` in `src/schema.js` gains three independent field checks (lexical layers).
- `src/lint.js` gains fs-layer checks (outputs existence/symlink) + cross-skill dependency resolution (needs full skill set with audiences — currently processSkill validates one skill at a time; discovery order in `lintProject` provides the hook).
- Test suite: `node --test`, 131+ existing tests; regression guard that skills WITHOUT the new fields lint identically.

</code_context>

<specifics>
## Specific Ideas

- Dep-not-found error shape agreed: `dependency "relase" not found (available: author-skill, release)`.
- allowed-tools acceptance examples from research: `Bash(git add *)`, `mcp__github__*`, bare `Read` — all pass under Option A.
- `release` skill is the recurring dogfood vehicle (Phase 14: template; Phase 15: allowed-tools).

</specifics>

<deferred>
## Deferred Ideas

- Transitive dependency-cycle detection (A→B→A) — revisit when something actually consumes the dependency graph.

</deferred>

---

*Phase: 15-Field Validation & Integrity Guards*
*Context gathered: 2026-07-03*
