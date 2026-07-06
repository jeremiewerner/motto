# Phase 24: Upgrade-Path Ledger & Policy - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

A breaking-change ledger exists with per-version upgrade steps, seeded retroactively with the v0.0.5 `<role>` migration and a v0.0.7 entry telling pre-stamp projects how to adopt `mottoVersion` (UPG-01). The standing upgrade-path constraint becomes operational: a documented, blocking process requires every future structure/schema change to add a ledger entry before ship, discoverable both at plan time and at ship time (UPG-02). The Phase 23 skew warning's "check the upgrade ledger" remedy resolves to a real document. Mostly a docs + process phase; code changes limited to (at most) skew-message wording and any test guarding the ledger.

Covers UPG-01..UPG-02. Operator debt (DEBT-06..08) is Phase 25.

</domain>

<decisions>
## Implementation Decisions

### UPG-02 enforcement mechanism
- **D-01:** Primary enforcement = a **blocking gate step in `skills/release/SKILL.md`** before tag push. Same strength as the existing Step 1 test gate: do NOT proceed to tag/push until either a ledger entry for the new version is written or an explicit "not breaking, no entry needed" verdict is recorded in the release conversation.
- **D-02:** Gate logic = **diff heuristic + judgment**: the step diffs schema-bearing files since the last tag (`src/schema.js`, `src/templates.js`, `src/config.js`, `src/init.js`); any hit forces the entry-or-verdict decision. Mechanical trigger, human/agent verdict. (Matches the changelog skill's git-range pattern.)
- **D-03:** Plan-time discoverability = **add the upgrade-path rule to `.claude/CLAUDE.md` Constraints** so any agent session (not just GSD flows) sees it; PROJECT.md Constraints already carries it for GSD planning.

### Seed entries content & audience
- **D-04:** Primary reader = **end-project owners** (someone maintaining a Motto-scaffolded project like magma who just saw the skew warning): concrete edit-your-files steps, no Motto internals.
- **D-05:** Entry depth = **steps + before/after**: what breaks (the lint error you'll see), numbered upgrade steps, one before/after snippet, verify command (`motto lint`). No rationale essays, no design-link matrices (lightweight principle).
- **D-06:** Seed scope = **exactly the two UPG-01 entries** (v0.0.5 `<role>` migration, v0.0.7 stamp adoption). No retro-audit of other v0.0.5 validation additions — those surface as self-explanatory lint errors, YAGNI.
- **D-07:** Live validation = **stamp magma only**, by walking magma through the documented v0.0.7 entry steps (success criterion 1: "from documented steps alone"). **Motto's own tree stays unstamped** — Phase 23 D-R4 keeps it as the living no-stamp fixture and `dogfood.test.js` asserts zero skew warnings on it. Do not break that test.

### Scope of "breaking change"
- **D-08:** Ledger trigger is **behavior-defined**: any change that makes a previously-passing project fail lint/build, OR requires editing project files (`motto.yaml` keys, SKILL.md structure, dist layout consumers depend on). Not file-defined; not "any observable change" (new warnings/wording/flags don't trigger).
- **D-09:** Borderline default = **when in doubt, write the entry** — stated in the gate step itself. Entries are cheap; the v0.0.5 stranding is the cautionary tale.
- **D-10:** Future break style: **hard break + ledger entry is sufficient and the norm pre-1.0**. Dual-accept compatibility windows stay case-by-case (v0.0.5 D-01 precedent: dual-path validator code is permanent cost); policy does not mandate them.
- **D-11:** Entries keyed **by the version where the break landed** (v0.0.5 for `<role>`), with a one-line note that 0.0.4/0.0.5 never hit npm — a project coming from 0.0.3 crosses those entries on its way to 0.0.6+.

### Claude's Discretion
- **Ledger location, file name, and format** — user skipped this area. Standalone root file (e.g. `UPGRADING.md`) vs docs/ vs other; entry template layout; heading scheme. Anchor to lightweight/no-doc-sprawl principles and the D-04/D-05 audience+depth decisions.
- **Whether the skew message names the ledger file** — `src/version.js:101` currently says "check the upgrade ledger" without a location; v0.0.7 is unreleased so wording is still adjustable. Decide during planning whether to point at the concrete file/URL.
- **Whether a mechanical test guards the ledger** (e.g. doc-sync-style existence/coverage check) — user chose the release gate as primary; a minimal backstop test is optional, planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — UPG-01..UPG-02 definitions, Out of Scope table, deferred UPG-F1 (`motto upgrade` command — do not build).
- `.planning/ROADMAP.md` §Phase 24 — goal + 3 success criteria (stamp adoption from steps alone; v0.0.5 `<role>` entry findable; standing process discoverable where a contributor plans a change).

### Phase 23 outputs this phase builds on
- `.planning/phases/23-version-stamping-skew-detection/23-CONTEXT.md` — locked D-01..D-06 (stamp semantics, skew advisory contract) and D-R4 (own tree unstamped).
- `src/version.js` — shipped skew message wording ("check the upgrade ledger for changes since X", line ~101); the remedy this phase must make real.

### Process integration points
- `skills/release/SKILL.md` — Steps 1–9 release procedure; the blocking ledger gate (D-01/D-02) inserts before the tag/push step.
- `.claude/CLAUDE.md` — Constraints section receives the plan-time upgrade-path rule (D-03).
- `.planning/PROJECT.md` §Constraints — standing upgrade-path constraint wording (source of the D-08 behavior-defined trigger).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/release/SKILL.md` — procedural gate pattern (Step 1 blocking test gate) to mirror for the ledger gate; `template: procedure` conformance required (the skill must stay lint-clean).
- `skills/changelog/SKILL.md` — git-range pattern (`git describe --tags` → `git log <tag>..HEAD`) reusable for the diff heuristic.
- `tests` doc-sync precedent (Phase 17) — source-text extraction test guarding `skill-schema.md`; the shape to copy if a ledger backstop test is added.
- `src/version.js:101` — skew message string; single edit point if the message gains a file reference.

### Established Patterns
- Repo has **no CHANGELOG.md, no CONTRIBUTING.md, no docs/ dir** — the ledger is likely the first standalone upgrade doc; README §"Development and contributing" says CONTRIBUTING.md is deferred. Don't create doc sprawl around it.
- Skills are linted dogfood: any edit to `skills/release/SKILL.md` must keep `motto lint` green and dogfood counts intact.
- v0.0.7 is unreleased — shipped-in-tree strings (skew message) are still changeable without a ledger entry of their own.

### Integration Points
- Ledger file (NEW) ← referenced by skew message remedy; ← seeded with 2 entries; ← gate step requires future entries.
- `skills/release/SKILL.md` gate step (NEW) → blocks tag/push pending entry-or-verdict.
- `.claude/CLAUDE.md` Constraints → plan-time rule visibility.
- magma (external repo, `~/Projects/magma` presumed) → live walk of the v0.0.7 stamp-adoption steps (D-07); friction found there feeds back into the entry text.

</code_context>

<specifics>
## Specific Ideas

- Gate verdict language: "not breaking, no entry needed" recorded in the release conversation is the explicit escape hatch — silence is not a verdict.
- The v0.0.7 entry is validated by actually performing it on magma; if the steps don't work from the doc alone, the doc is wrong, not the reader.

</specifics>

<deferred>
## Deferred Ideas

None new — discussion stayed within phase scope. Standing deferrals (do not pull in): UPG-F1 `motto upgrade` command, VER-F1 structured JSON skew field, VER-F2 severity-by-semver-distance.

</deferred>

---

*Phase: 24-Upgrade-Path Ledger & Policy*
*Context gathered: 2026-07-06*
