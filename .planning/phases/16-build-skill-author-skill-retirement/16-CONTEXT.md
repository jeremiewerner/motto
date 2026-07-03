# Phase 16: build-skill & author-skill Retirement - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A new `skills/build-skill/` Agent Skill (public, itself `template: procedure`) that structures ANY input — freeform text, doc, conversation — into a complete, lint-clean, conforming `skills/<name>/` (SKILL.md + any output-template files). It asks gap-filling questions only, self-verifies via `motto lint`, iterates until clean, and enforces a content-quality self-review gate. `author-skill` is retired atomically in the same move (dogfood skill count synced, main never red). Requirements: BSKL-01..06.

Out of this phase: `skill-schema.md` rewrite and README author-skill cleanup (Phase 17, DOC-06/07), any linter/CLI code change (Phases 14–15 delivered the mechanism; this phase is a pure skill-authoring + retirement phase — the only code touched is `test/dogfood.test.js`).

</domain>

<decisions>
## Implementation Decisions

### Interview flow (BSKL-01)
- **Silent gap-fill** — build-skill asks ONLY for genuinely missing schema slots. Input that covers everything → zero questions, straight to generation. No confirmation round on inferred values (purest reading of D-03 structurer-not-ideator).
- **One batch** — when several slots are missing, a single message lists them all; user answers in one reply. No sequential interview.
- **Auto template detection** — build-skill decides `template: procedure` vs base schema itself: step-like/procedural input → `template: procedure` + `<process>`/`<success_criteria>`; purely descriptive/reference input → base schema. Never asks the user about templates.
- **Optional fields only when implied** — `outputs:`/`dependencies:`/`allowed-tools` raised only when input implies them (mentions producing files → ask outputs/formats; mentions other skills/tools → ask deps/tools). Otherwise omitted silently — absence is valid.

### Lint self-verification loop (BSKL-03)
- **npx fallback chain** — try local bin (`node_modules/.bin/motto` / `motto` on PATH) first, fall back to `npx @jeremiewerner/motto lint`. Works in any consumer project regardless of install style.
- **Filter errors to the new skill** — run full-project lint but iterate only on errors mentioning the generated skill. Pre-existing errors elsewhere reported to the user once, never fixed — build-skill never touches other skills.
- **3-attempt cap** — fix and re-lint up to 3 times; still dirty → stop, show remaining errors + what was tried, hand control to user.
- **Outside a Motto project: detect + point to init** — check project markers first; missing → stop and direct user to `motto init` (or cd to the project). No generation without a lintable home.

### Content-quality gate (BSKL-05)
- **Placement: after lint-clean** — generate → lint until clean → quality gate → fix → re-lint if edits were made → report. Mechanical validity first, then substance; the gate reviews the real final artifact.
- **Checklist: 3 required + few structural** — required: non-empty behavioral Role, non-vacuous success criteria, description states WHEN to trigger (not what the skill does). Plus 2-3 cheap objective checks: steps verb-led/actionable (not restated headings), no placeholder text left (TODO/lorem/unfilled `{var}`-style stubs), description within limits. All checks objective — no subjective rubric (a vague rubric invites rubber-stamping).
- **Failure behavior: self-fix, ask if stuck** — build-skill rewrites the failing part itself (it holds the input context); asks the user only when the fix needs information it doesn't have (e.g. real trigger conditions can't be inferred).
- **Final report: compact receipt** — files written, lint status (attempts used), gate checks passed, one next-step line (`motto build` / try the skill). No full SKILL.md dump.

### Schema knowledge source & author-skill retirement (BSKL-06)
- **Bundle stale skill-schema.md as-is** — build-skill declares `shared_references: [skill-schema]` (inherits author-skill's bundling role). The doc is stale (v0.0.2 — no template/outputs/dependencies/allowed-tools sections) until Phase 17; build-skill's own instructions carry the delta knowledge for the new fields as behavioral guidance (NOT duplicated lint strings/regexes — DOC-06 constraint honored from day one). No skill-schema.md edit in this phase.
- **author-skill deleted outright** — no content migration, no archive copy. skill-schema.md is already the canonical rules source; author-skill's lint-error table duplicated lint strings (the exact debt this retirement kills, per design spec). Git history preserves it.
- **One-commit atomic swap** — a single commit adds `skills/build-skill/`, deletes `skills/author-skill/`, and updates `test/dogfood.test.js` (skill count stays 2; author-skill dist assertions swap to build-skill). Every commit green by construction.
- **build-skill frontmatter: honest fields only** — `name`, `description`, `audience: public`, `template: procedure`, `shared_references: [skill-schema]`. Phase 15 fields only if genuinely true: `allowed-tools` may qualify (build-skill really runs `motto lint` via Bash) — planner decides against honest use; NO contrived `outputs:`/`dependencies:` entries just to exercise validators (Phase 14/15 honest-dogfood precedent).

### Claude's Discretion
- Exact prompt-engineering of build-skill's SKILL.md body (token budget <500 words, flowcharts only for non-obvious decisions, no narrative one-off stories — researcher gathers specifics from skill-creator/writing-skills per roadmap research flag).
- Exact project-marker detection for "inside a Motto project" (skills/ dir, motto.config, package.json dep — researcher/planner pick).
- Exact structural-check wording in the quality gate checklist (structure fixed above: objective, checkable, bounded).
- Whether build-skill's `allowed-tools` declaration is honest enough to include (see honest-fields decision).
- Exact `<process>` step granularity for build-skill's own procedure body.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design authority
- `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` — v0.0.5 design spec: D-02 (interview in Agent Skill), D-03 (structurer not ideator), D-08 (`{var}` convention-only), §4 build-skill flow (ingest → map → gap-fill → write → lint → fix → report), author-skill retirement rationale. Inspirational brief; GSD .planning artifacts are execution authority.

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — BSKL-01..06 definitions + Out of Scope (no eval harness, no description-optimizer loops, hollow-skill defense lives in BSKL-05).
- `.planning/ROADMAP.md` §Phase 16 — success criteria 1–5 + research flag (build-skill prompt engineering: inherit from skill-creator / writing-skills — token budget <500 words, flowcharts only for non-obvious decisions, no narrative stories).

### Prior phase decisions build-skill authors against
- `.planning/phases/15-field-validation-integrity-guards/15-CONTEXT.md` — outputs literal-existence (`{var}` in file CONTENT only, never path values), dependencies guards, allowed-tools Option A.
- `.planning/phases/14-template-mechanism/14-CONTEXT.md` — `template: procedure` section rules (line-anchored bare tags, matched pairs, fence exclusion).

### Artifacts touched or retired
- `skills/author-skill/SKILL.md` — the skill being deleted (frontmatter shape + shared_references precedent to inherit).
- `shared/references/skill-schema.md` — bundled shared ref for build-skill (stale until Phase 17 — bundle as-is, delta lives in build-skill instructions).
- `test/dogfood.test.js` — count=2 assertion + author-skill dist assertions (lines ~92-99) that must swap to build-skill in the atomic commit.
- `skills/release/SKILL.md` — the live `template: procedure` + `allowed-tools` exemplar to imitate for build-skill's own frontmatter/body.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/release/SKILL.md` — working example of `template: procedure` (`<process>`/`<success_criteria>`) and honest `allowed-tools` array; direct template for build-skill's own file.
- `skills/author-skill/SKILL.md` frontmatter — `shared_references: [skill-schema]` wiring build-skill inherits.
- Dogfood test suite (`test/dogfood.test.js`) — lints repo root (count=2), asserts dist output per skill; the retirement's only code touchpoint.

### Established Patterns
- Honest dogfood only (Phases 14/15) — live skills declare fields they genuinely use; fixtures exercise the rest.
- No lint-string duplication in skill prose (design spec + DOC-06) — schema referenced via bundled shared ref, behavioral guidance only.
- Verbatim SKILL.md copy at build — body XML tags legal; XML-tag ban applies to `description` frontmatter only.

### Integration Points
- `skills/build-skill/` — new directory; picked up automatically by lint/build discovery (no code registration).
- `test/dogfood.test.js` — count stays 2; author-skill assertions become build-skill assertions (SKILL.md exists in dist/public, references/skill-schema.md bundled).
- README author-skill references (lines ~95, 143, 203, 254, 267-278) — intentionally left for Phase 17 (DOC-07); not this phase's scope.

</code_context>

<specifics>
## Specific Ideas

- build-skill flow locked end-to-end: ingest → map onto schema → one batched gap-fill round (only missing slots) → write `skills/<name>/` → lint loop (≤3 attempts, errors filtered to new skill) → quality gate (self-fix) → compact receipt.
- Gap-fill slot list from design spec §4: name, trigger/description, steps, outputs + formats, deps/tools, audience — each asked ONLY if missing/implied.
- The staleness window (skill-schema.md missing new-field docs until Phase 17) is accepted deliberately — noted so verify-phase doesn't flag it as a gap.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Evolution-ledger items — action tags, `agent` template, `{var}` engine — already traced in design spec and REQUIREMENTS.md Future Requirements.)

</deferred>

---

*Phase: 16-build-skill & author-skill Retirement*
*Context gathered: 2026-07-03*
