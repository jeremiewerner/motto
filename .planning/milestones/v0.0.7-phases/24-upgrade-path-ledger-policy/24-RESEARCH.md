# Phase 24: Upgrade-Path Ledger & Policy - Research

**Researched:** 2026-07-06
**Domain:** Documentation/process engineering (upgrade ledger authoring, release-process gate design) — no new runtime code beyond an optional test and a skew-message wording tweak
**Confidence:** HIGH

## Summary

This phase is almost entirely docs + process, not code. Two things must exist by the end: (1) a standalone ledger file (`UPGRADING.md`, per Claude's Discretion — see rationale below) containing exactly two entries — the v0.0.5 `<role>` migration and a v0.0.7 `mottoVersion` stamp-adoption entry — written for an end-project owner who just saw the skew warning and needs concrete edit steps; and (2) a blocking gate step inserted into `skills/release/SKILL.md` before the tag/push step that forces a ledger-entry-or-explicit-verdict decision on every release, triggered mechanically by a git diff of schema-bearing files since the last tag.

All the facts needed to write both ledger entries accurately are already sitting in this repo's own git history and PROJECT.md — this is a "cite what already happened" phase, not a "design something new" phase. The v0.0.5 `<role>` break is fully documented in commit `d402e15` (migration diff) and `3a7065c` (a same-day fix). The v0.0.7 stamp format is fully specified in `src/init.js` lines 150-163. `~/Projects/magma` was inspected live during this research: it has `<role>` tags already (past the v0.0.5 break) but **zero** `mottoVersion` key in its `motto.yaml` — a clean, real, unstamped fixture that exactly matches the phase's success-criterion-1 validation target.

**Primary recommendation:** Write `UPGRADING.md` at repo root with two dated, numbered entries (steps + one before/after snippet + `motto lint` verify command each, per D-05), add a new Step between the release skill's existing Step 3 (Dogfood Check) and Step 4 (Push) titled "Ledger Gate" that diffs `src/schema.js src/templates.js src/config.js src/init.js` since the last tag and requires either a new `UPGRADING.md` entry or a recorded "not breaking" verdict before proceeding, and add one Constraints bullet to `.claude/CLAUDE.md` pointing at the standing policy (PROJECT.md already carries the constraint text verbatim at line 142 — reuse it, don't re-derive it).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ledger content (breaking-change entries) | Docs / Repo root | — | Read by humans (end-project owners), not executed by any code path |
| Ledger discoverability at plan time | `.claude/CLAUDE.md` Constraints | `.planning/PROJECT.md` Constraints (already present) | Any agent session reads CLAUDE.md; GSD flows additionally read PROJECT.md |
| Ledger discoverability at ship time | `skills/release/SKILL.md` (procedure) | — | The release skill is the single choke point every version bump passes through (D-01) |
| Gate trigger mechanism | `skills/release/SKILL.md` Step (git diff heuristic) | — | Reuses the changelog skill's git-range pattern (`git describe --tags` → `git log <tag>..HEAD`), applied to a file-diff instead of a log |
| Skew message → ledger pointer | `src/version.js:101` | — | One string edit, gated on whether Claude's Discretion decides to name the file (see Open Questions) |
| Optional backstop test | `test/` (new file, if added) | — | Mirrors Phase 17's doc-sync source-text-extraction shape; purely a freshness/existence guard, not a re-invocation of validateSkill |

## Package Legitimacy Audit

Not applicable. This phase installs no packages — it is a documentation file, a `SKILL.md` process edit, an optional test file, and (possibly) a one-line message-wording change in existing code. No new dependency of any kind is introduced.

## Standard Stack

No new libraries. This phase uses only what's already in the repo:

| Tool | Purpose | Why Standard (for this repo) |
|------|---------|-------------------------------|
| Plain Markdown | Ledger file format | Repo convention — README.md, PROJECT.md, skill-schema.md are all plain Markdown, no doc generator |
| `git describe --tags --abbrev=0` / `git diff <tag>..HEAD -- <paths>` | Gate trigger mechanism | Exact pattern already used by `skills/changelog/SKILL.md` Step 1-2 (`git describe --tags --abbrev=0` → `git log <tag>..HEAD`); this phase applies the same tag-resolution step to a path-scoped diff instead of a full log |
| `node:test` (if a backstop test is added) | Optional ledger-guard test | Matches Phase 17's doc-sync precedent exactly — source-text extraction, no new tooling |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Standalone `UPGRADING.md` at root | `docs/UPGRADING.md` or a `CHANGELOG.md`-style rolling doc | Repo has zero `docs/` dir today (verified: `ls` shows none); creating one for a single file would be doc sprawl the D-04/D-05 "lightweight" decisions explicitly warn against. A root-level file matches where README.md, CHANGELOG-would-live, and PROJECT.md already sit. |
| Root-level `UPGRADING.md` | Folding entries into README.md | README is already the single onboarding doc (287 lines, 20 top-level sections); appending a growing breaking-change ledger to it would bury both concerns. A separate file is more discoverable via a direct skew-message pointer (`see UPGRADING.md`) than a README anchor. |
| Mechanical diff gate (D-02, locked) | A CI check that fails the build on schema-file diffs without a ledger entry | User explicitly locked D-01/D-02 to the release-skill conversational gate, not a CI mechanism — rejected already, not re-litigated here. |

**Installation:** None — no new dependencies.

**Version verification:** N/A — no packages.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────┐
                    │   Contributor plans a change │
                    │   (edits schema.js/templates)│
                    └───────────────┬──────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │ .claude/CLAUDE.md Constraints │  ← plan-time discoverability (D-03)
                    │ .planning/PROJECT.md          │     (any agent session sees this,
                    │ Constraints (already present)│      not just GSD flows)
                    └───────────────┬──────────────┘
                                    │ (informs the change is made)
                                    ▼
                    ┌─────────────────────────────┐
                    │   skills/release/SKILL.md    │
                    │   Step 1: tests               │
                    │   Step 2: version bump         │
                    │   Step 3: dogfood check         │
                    │   ── NEW gate step ──           │──► git diff <last-tag>..HEAD --
                    │   Step 4: push                  │       src/schema.js src/templates.js
                    └───────────────┬──────────────┘       src/config.js src/init.js
                                    │                              │
                       ┌────────────┴────────────┐                │
                       │  diff hit?               │◄───────────────┘
                       └──┬───────────────────┬───┘
                     yes  │                   │ no
                          ▼                   ▼
              ┌───────────────────┐   ┌──────────────────┐
              │ Write UPGRADING.md │   │ proceed to push   │
              │ entry OR record    │   │ (no entry needed) │
              │ "not breaking"     │   └──────────────────┘
              │ verdict in the     │
              │ release convo      │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  git push --follow-tags │
              └───────────┬───────────┘
                          │
                          ▼
              ┌─────────────────────────────┐
              │ Next project's `motto lint`  │
              │ hits skew warning →           │
              │ "check the upgrade ledger"    │
              │ → resolves to UPGRADING.md    │  ← the phase's core deliverable:
              │ → reader follows numbered     │     making this resolve to something real
              │ steps, verifies w/ motto lint │
              └─────────────────────────────┘
```

### Recommended Project Structure

```
/ (repo root)
├── UPGRADING.md          # NEW — the ledger. Root-level, sibling to README.md
├── README.md              # unchanged structurally; optionally gains a one-line pointer
├── src/
│   └── version.js         # possible 1-line message edit (name the ledger file)
├── skills/
│   └── release/
│       └── SKILL.md       # NEW step inserted between Step 3 and Step 4
├── .claude/
│   └── CLAUDE.md          # Constraints section gains the upgrade-path rule (D-03)
└── test/
    └── upgrading-ledger.test.js   # OPTIONAL backstop (planner's call per Discretion item 3)
```

### Pattern 1: Ledger Entry Template (D-05 depth contract)

**What:** Each `UPGRADING.md` entry is keyed by the version where the break landed (D-11) and contains exactly: a one-line "what breaks" statement naming the concrete lint error, numbered steps, one before/after code snippet, and a verify command. No rationale essays, no design-doc cross-references.

**When to use:** Every entry added under this policy, starting with the two seed entries.

**Example (seed entry 1 — v0.0.5 `<role>` migration, content verified against commit `d402e15`):**

```markdown
## v0.0.5 — `**Role:**` bold line → `<role>` section tag

**What breaks:** `motto lint` reports `body must contain <role>...</role>` (or, if a
`<role>` tag exists but is empty, `<role>...</role> section must not be empty`) for
any SKILL.md still using the old `**Role:** ...` bold-line convention. The bold line
is no longer recognized — it becomes inert body text.

**Steps:**
1. In every `skills/<name>/SKILL.md`, find the line starting with `**Role:**`.
2. Replace it with a `<role>` ... `</role>` block, moving the same sentence(s) inside.
3. Run `motto lint` and confirm the `<role>` error is gone for that skill.

**Before:**
```markdown
**Role:** You are a guide who walks the author through X step by step.
```

**After:**
```markdown
<role>
You are a guide who walks the author through X step by step.
</role>
```

**Verify:** `motto lint` → no `<role>` errors for the migrated skill(s).
```

**Example (seed entry 2 — v0.0.7 `mottoVersion` stamp adoption, format verified against `src/init.js:158`):**

```markdown
## v0.0.7 — Adopt the `mottoVersion` stamp

**What breaks:** Nothing breaks — this is not a lint error. Projects scaffolded
before v0.0.7 have no `mottoVersion` key in `motto.yaml`, so `motto lint`/`motto build`
silently skip the version-skew check for them (treated as "unknown, assume
compatible"). Adopting the stamp turns the skew check on for your project.

**Steps:**
1. Open your project's `motto.yaml`.
2. Add a `mottoVersion` key set to the version of `motto` you currently have
   installed (check with `motto --version` or `npm ls @jeremiewerner/motto`).
3. Place it near the existing `version` key — they are distinct fields
   (`version` is your project's own version; `mottoVersion` is the tool version
   your project was last verified against).

**Before:**
```yaml
name: magma
version: "0.1.0"
description: A skills project scaffolded by motto init.
plugins:
  public: magma
```

**After:**
```yaml
name: magma
version: "0.1.0"
mottoVersion: "0.0.7"
description: A skills project scaffolded by motto init.
plugins:
  public: magma
```

**Verify:** `motto lint` → no change in errors; a future skew (when you upgrade
motto again without re-stamping) will now surface as a warning instead of silently
passing.
```

### Pattern 2: Release-Skill Gate Step (D-01/D-02)

**What:** A new numbered step inserted into `skills/release/SKILL.md`'s `<process>` between the existing Step 3 (Dogfood Check) and Step 4 (Push), matching the file's existing step-numbering convention (renumber Steps 4-9 to 5-10, or insert as "Step 3.5" — planner's call, but prefer clean renumbering to match the file's existing style, since all 9 steps are already sequentially numbered with no letter-suffixed steps).

**When to use:** Every release, unconditionally — same blocking strength as Step 1's test gate ("do NOT proceed... until").

**Example (mirrors the file's existing imperative, blocking-language style):**

```markdown
## Step N — Ledger Gate

Diff schema-bearing files since the last tag:

\`\`\`
git diff $(git describe --tags --abbrev=0)..HEAD -- src/schema.js src/templates.js src/config.js src/init.js
\`\`\`

If this diff is non-empty, do NOT proceed to Step (push) until either:

1. A new entry for this version has been added to `UPGRADING.md`, or
2. An explicit "not breaking, no entry needed" verdict has been recorded in this
   release conversation (silence is not a verdict — state it out loud).

When in doubt, write the entry (D-09) — entries are cheap; a stranded project
(the v0.0.5 `<role>` break, before this policy existed) is the cautionary tale.
```

### Anti-Patterns to Avoid

- **Design-link matrices or rationale essays in ledger entries:** D-05 explicitly rules this out — steps + before/after + verify command only. A future maintainer padding entries with "why we did this" prose violates the locked depth contract and makes the ledger harder to scan under skew-warning pressure.
- **Auditing every v0.0.5 validation addition for retroactive ledger entries:** D-06 explicitly scopes seed content to exactly two entries. Other v0.0.5 additions (field validators, template mechanism) surface as self-explanatory lint errors — YAGNI applies; do not over-populate the ledger preemptively.
- **A CI-enforced mechanical gate instead of the conversational release-skill gate:** Already rejected by the user (D-01 locked to the release skill, not CI). Don't reintroduce a CI check as a "more robust" alternative — it wasn't asked for and duplicates enforcement surface.
- **Auto-restamping magma's `mottoVersion` via a script instead of documented manual steps:** Success criterion 1 requires "from documented steps alone" — writing a helper script to do it defeats the validation goal, which is proving the *prose* is sufficient. (This is also independently out of scope: `motto upgrade` is deferred as UPG-F1.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting "what changed since last release" | A custom git-log parser or changed-file heuristic engine | The exact `git describe --tags --abbrev=0` → `git diff <tag>..HEAD -- <paths>` two-liner already used by `skills/changelog/SKILL.md` | Proven pattern, zero new code, same maintainer already knows it |
| Version-adoption instructions for magma | A migration script (`motto upgrade`, codemod, etc.) | Plain numbered prose steps in `UPGRADING.md` | UPG-F1 (`motto upgrade` command) is explicitly deferred YAGNI; building it now to "help" magma would pre-empt that decision and defeat success-criterion-1's "steps alone" validation goal |
| Ledger freshness enforcement | A new CI job or pre-commit hook scanning for ledger entries | The release-skill's conversational gate (D-01), optionally backed by a lightweight `node:test` existence/coverage check mirroring Phase 17's doc-sync test | User already chose conversational-gate-as-primary; a CI job duplicates enforcement the user explicitly scoped out |

**Key insight:** Every mechanism this phase needs (git tag/diff pattern, blocking-gate language, doc-sync test shape) already exists somewhere in this repo, executed and proven. This phase's engineering risk is near-zero; its actual risk is getting the *prose* wrong — imprecise or untested ledger steps would fail success-criterion-1 even though every underlying tool call is trivial.

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. No trigger condition (rename, rebrand, string replacement across a tree) applies. Skipping this section per the stated omission rule.

## Common Pitfalls

### Pitfall 1: Writing the v0.0.7 stamp-adoption entry from assumption instead of the live `init.js` format

**What goes wrong:** A ledger entry describing "add a `mottoVersion` line" without checking exact placement/quoting conventions could show a plausible-but-wrong YAML snippet (e.g., unquoted version, wrong key order) that a careful reader would still get right, but which erodes the "steps + before/after alone are sufficient" trust the ledger depends on.

**Why it happens:** The stamp format (`mottoVersion: "X.Y.Z"` as a quoted string, inserted between `version` and `description`) is only defined in one place (`src/init.js:158-161`) and it would be easy to free-hand a slightly different-looking example.

**How to avoid:** This research already extracted the exact scaffold format from `src/init.js:161`: `` `name: ${name}\nversion: "0.1.0"\n${mottoVersionLine}description: ${SCAFFOLD_DESCRIPTION}\n...` `` — the planner/writer should copy this ordering (`name`, `version`, `mottoVersion`, `description`, `plugins`) verbatim into the before/after snippet, not invent a different key order.

**Warning signs:** If the ledger's YAML snippet has `mottoVersion` in a different position than freshly-scaffolded projects show, or omits the quotes around the version string, that's a signal the entry was written from memory rather than checked against `init.js`.

### Pitfall 2: The gate step's file list going stale as the schema surface grows

**What goes wrong:** D-02 hardcodes four files (`src/schema.js`, `src/templates.js`, `src/config.js`, `src/init.js`) as the diff heuristic's trigger set. If a future schema-relevant file is added elsewhere (e.g., a new `src/validators/foo.js`) and never added to this list, the gate silently stops catching real breaking changes in that file — but the human/agent judgment layer (D-02's "mechanical trigger, human/agent verdict" framing) is the actual backstop, not the file list alone.

**Why it happens:** A hardcoded path list is a snapshot of "where schema logic lives today"; it doesn't grow automatically as the codebase does.

**How to avoid:** Document the file list's rationale inline in the release skill step itself (as this research's Pattern 2 example does) so a future maintainer editing the release skill for an unrelated reason notices the comment and updates the list when adding new schema-adjacent files. Do not attempt to make the list dynamically derived (e.g., via `git ls-files src/`) — that would over-trigger on every commit including test/doc-only ones, defeating the heuristic's purpose.

**Warning signs:** A future breaking change lands in a new file not in the list, ships without a ledger entry, and a project is stranded again — the exact failure mode this phase exists to prevent, recurring through a blind spot in the trigger set rather than a process failure.

### Pitfall 3: Conflating "ledger exists" with "gate is operational" for success-criterion-3

**What goes wrong:** Writing `UPGRADING.md` with two good entries satisfies UPG-01 but does nothing for UPG-02/success-criterion-3 ("a documented process requires every future structure/schema change to add a ledger entry before ship, discoverable where a contributor plans a change"). These are two separate, independently-testable deliverables — a plan that only touches `UPGRADING.md` leaves UPG-02 unaddressed.

**Why it happens:** Both requirements sound like "one ledger effort," but D-01 through D-03 are about *process* (release-skill gate + CLAUDE.md discoverability), a structurally different kind of change (editing a procedural skill file + a constraints doc) from writing ledger content.

**How to avoid:** Plan tasks should explicitly split into (a) ledger content authoring [UPG-01] and (b) process/gate wiring across `skills/release/SKILL.md` + `.claude/CLAUDE.md` [UPG-02], each independently verifiable against its own success criterion.

**Warning signs:** A plan review that can point to `UPGRADING.md`'s two entries but cannot point to a specific diff in `skills/release/SKILL.md` or `.claude/CLAUDE.md` has not covered UPG-02.

### Pitfall 4: Breaking `dogfood.test.js`'s zero-skew-warning assertion on Motto's own tree while validating magma

**What goes wrong:** D-07 requires magma to actually get stamped (validating the ledger's steps), but Motto's **own** `motto.yaml` must stay unstamped (Phase 23 D-R4) — `test/dogfood.test.js` (lines 44-53, verified in this research) asserts `lintProject(REPO_ROOT)` produces zero warnings specifically because the repo's own tree carries no `mottoVersion` stamp yet. Any task that touches this repo's own `motto.yaml` (e.g., a well-meaning "let's dogfood the stamp too" impulse) would flip that test red.

**Why it happens:** The two "unstamped project" fixtures — Motto's own repo and magma — look similar but have opposite fates in this phase: one must remain untouched as a living fixture, the other must be actively stamped as a validation exercise.

**How to avoid:** Never edit this repo's own `motto.yaml` as part of this phase. The stamp-adoption walkthrough happens entirely inside `~/Projects/magma` (external to this repo, not tracked by this repo's git or tests).

**Warning signs:** A `git diff` on this phase's commits that touches `motto.yaml` at the repo root is an immediate red flag — that file must not appear in this phase's changeset.

## Code Examples

### Ledger gate git-diff invocation (verified working pattern, mirrors changelog skill)

```bash
# Source: skills/changelog/SKILL.md Step 1-2 pattern, adapted to a path-scoped diff
git describe --tags --abbrev=0
# → vX.Y.Z (the last release tag)

git diff $(git describe --tags --abbrev=0)..HEAD -- src/schema.js src/templates.js src/config.js src/init.js
# → non-empty output = gate triggers; empty output = no entry needed
```

### Existing skew message this phase makes real (src/version.js:99-103, verified)

```javascript
// Source: src/version.js (already shipped in Phase 23, quoted verbatim)
return {
  skill: "motto.yaml",
  message: `project was scaffolded with motto ${stampedVersion}; you are running ${toolVersion} — check the upgrade ledger for changes since ${stampedVersion}`,
};
```

### magma's actual pre-stamp motto.yaml (live-inspected, 2026-07-06)

```yaml
# Source: ~/Projects/magma/motto.yaml, read directly during this research
name: magma
version: "0.1.0"
description: A skills project scaffolded by motto init.
plugins:
  public: magma
```

This confirms: no `mottoVersion` key present, `<role>` migration already done (magma's `skills/hello-world/SKILL.md` uses `<role>` tags, not the legacy `**Role:**` bold line) — so magma is the perfect single-entry validation target for success-criterion-1 (only the v0.0.7 entry applies to it).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| No upgrade documentation of any kind exists in this repo | `UPGRADING.md` with a standing, gated, per-release update policy | This phase (Phase 24, targeting v0.0.7) | The v0.0.5 `<role>` hard break stranded any hypothetical pre-v0.0.5 project with zero guidance; this policy retroactively documents that break and prevents recurrence |
| Breaking changes ship with no forcing function to document them | Release skill's Step 3.5/4 gate blocks tag/push pending a ledger entry or explicit non-breaking verdict | This phase | Closes the exact gap that caused the v0.0.5 stranding — a mechanical trigger now exists at the one choke point every release passes through |

**Deprecated/outdated:**
- The old `**Role:** ...` bold-line SKILL.md convention: fully replaced by `<role>...</role>` as of v0.0.5 (Phase 18, commit `d402e15`). This phase documents that break for external consumers; it does not reopen or re-litigate the migration itself.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `~/Projects/magma` is the correct, only pre-v0.0.7 external project intended for the D-07 live validation walk (no other consumer project exists to check) | Code Context / D-07 validation | Low — CONTEXT.md D-07 names magma explicitly; this research independently confirmed the path resolves and the tree matches the expected pre-stamp state, so this is CITED against the live filesystem, not merely assumed |
| A2 | Renumbering `skills/release/SKILL.md`'s existing Steps 4-9 to 5-10 (clean insertion) is preferable to an inserted "Step 3.5" | Architecture Patterns / Pattern 2 | Low — cosmetic only; either numbering scheme satisfies D-01's blocking requirement. Flagged as planner's discretion, not a locked decision. |

**Note on confidence:** Every substantive factual claim in this document (v0.0.5 break diff, magma's actual file contents, the skew message's exact wording, the init.js stamp format, the changelog skill's git pattern) was verified directly against this repository's git history or live filesystem state during this research session — none rely on training-data assumptions about Motto specifically. The two entries above are the only items with any residual uncertainty, and both are low-risk, discretion-scoped items already acknowledged as such in 24-CONTEXT.md.

## Open Questions

1. **Should the skew message in `src/version.js:101` be edited to name `UPGRADING.md` explicitly?**
   - What we know: CONTEXT.md flags this as Claude's Discretion — v0.0.7 is unreleased, so the string is still freely editable without needing its own ledger entry. Current wording: "check the upgrade ledger for changes since {version}" (no file name/path).
   - What's unclear: Whether naming the file (`check UPGRADING.md for changes since...`) vs. keeping it generic is better for a project that's cloned/forked and might rename the ledger file locally, though this is a thin edge case (nothing in this repo suggests project-level ledger customization is expected).
   - Recommendation: Name the file. "Check the upgrade ledger" with no pointer is friction for a first-time reader who doesn't know the file exists yet; a concrete filename directly resolves the discoverability gap this phase exists to close. Suggested wording: `` check UPGRADING.md for changes since ${stampedVersion} ``. This is a one-line edit to an existing test-covered function (`checkSkew` in `src/version.js`) — the planner should locate and update its corresponding assertion in whichever test file pins the exact message string.

2. **Should a mechanical backstop test guard the ledger (existence/coverage check)?**
   - What we know: CONTEXT.md explicitly marks this optional ("planner's call"), with the release gate as primary enforcement. Phase 17's doc-sync test is the cited shape to copy if added — source-text extraction, no fixture wiring.
   - What's unclear: Whether a test asserting `UPGRADING.md` exists and contains at least the two seed entries adds meaningful value given the release-skill gate is conversational (not machine-checkable) and would need per-version content, which a generic existence test can't validate anyway.
   - Recommendation: Add a minimal existence + seed-content test (e.g., asserts `UPGRADING.md` exists and contains `## v0.0.5` and `## v0.0.7` headings) as a cheap regression guard against accidental deletion/corruption — but do not attempt to make it verify *future* entries exist, since that would require parsing git tags inside a test, which is exactly the conversational judgment call D-01 deliberately kept human/agent-side rather than mechanized.

## Environment Availability

Skipped — this phase has no external tool/service dependencies beyond `git` (already required by every phase in this repo) and Node's stdlib test runner (already in use).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (stdlib), invoked via `node --test` |
| Config file | none — zero-config, per repo convention |
| Quick run command | `node --test test/upgrading-ledger.test.js` (if the optional backstop test is added) |
| Full suite command | `node --test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UPG-01 | `UPGRADING.md` exists with v0.0.5 and v0.0.7 entries | unit (optional backstop) | `node --test test/upgrading-ledger.test.js` | ❌ Wave 0 (create if planner chooses to add the backstop) |
| UPG-01 | Success criterion 1 (magma stamp-adoption from docs alone) | manual-only | Manually walk `~/Projects/magma` through the v0.0.7 entry steps, confirm `motto lint` behavior before/after | N/A — human-in-the-loop verification, not automatable (the point is proving prose sufficiency, not scripting around it) |
| UPG-01 | Success criterion 2 (v0.0.5 entry findable + accurate) | manual-only | Read `UPGRADING.md`, cross-check steps against commit `d402e15`'s actual diff | N/A — a diff-matching test would just re-encode the same content, no behavioral assertion to make |
| UPG-02 | Release skill has a blocking ledger-gate step | unit (optional) | A `skills/release/SKILL.md` content test asserting the gate step's key phrases exist (mirrors any existing skill-content assertions in the suite) | ❌ Wave 0, optional — check whether `skill-schema.md`/dogfood tests already assert on release/SKILL.md step count; if so, extend that test rather than creating a new one |
| UPG-02 | `.claude/CLAUDE.md` Constraints carries the upgrade-path rule | manual-only | Read the file, confirm the bullet is present | N/A — trivial content presence, not worth a dedicated automated test |

### Sampling Rate
- **Per task commit:** `node --test` (full suite is already fast enough per this repo's own release skill Step 1 — no quick-subset command exists in the codebase; do not invent one for this phase alone)
- **Per wave merge:** `node --test`
- **Phase gate:** Full suite green before `/gsd-verify-work`; PLUS the manual magma walkthrough (D-07) as a human-in-the-loop gate that no automated command can substitute for

### Wave 0 Gaps
- [ ] `UPGRADING.md` itself — does not exist yet, is the phase's primary deliverable, not a test gap
- [ ] `test/upgrading-ledger.test.js` — optional; only needed if the planner opts into the backstop test from Open Question 2
- Framework install: none needed — `node:test` already in use repo-wide

*(No gaps beyond the above — this repo's existing test infrastructure and conventions fully cover what this phase needs.)*

## Security Domain

Not applicable in the ASVS sense — this phase produces documentation and a process-gate edit to an existing procedural skill file. No authentication, session management, access control, input validation of untrusted data, or cryptography surface is touched. The one code-adjacent change under consideration (the `src/version.js` message string edit, Open Question 1) is a display-string change with no security-relevant input handling — `checkSkew`'s existing never-throw/adversarial-test coverage (VER-05, already shipped in Phase 23) is unaffected by adding a filename to the output string.

## Sources

### Primary (HIGH confidence — verified directly against this repo's own state during this session)
- `d402e15` (git commit, this repo) — the actual v0.0.5 `<role>` migration diff, including the exact README before/after snippet reused verbatim in this research's Pattern 1 example.
- `3a7065c` (git commit, this repo) — same-day WR-01 fix to the role emptiness check, confirming the migration's edge-case handling.
- `src/version.js` (read live, this repo) — exact skew message wording (`checkSkew` function, lines 92-108).
- `src/init.js` (read live, this repo) — exact `mottoVersion` stamp scaffold format (lines 150-163).
- `src/config.js` (read live, this repo) — `mottoVersion` validation contract (optional field, absence-is-valid).
- `skills/release/SKILL.md` (read live, this repo) — existing 9-step procedure, gate-language conventions, and the Step-1-strength blocking pattern this phase's new gate must match.
- `skills/changelog/SKILL.md` (read live, this repo) — the git-tag/git-log pattern reused for the gate's diff heuristic.
- `test/dogfood.test.js` (read live, this repo) — confirms the zero-skew-warning assertion on `REPO_ROOT` that this phase's tasks must not break (Pitfall 4).
- `~/Projects/magma/motto.yaml` and `~/Projects/magma/skills/hello-world/SKILL.md` (read live, external directory) — confirms magma's real current state: no `mottoVersion` stamp, already-migrated `<role>` tag.
- `.planning/PROJECT.md` (read live, this repo) — the standing upgrade-path constraint's exact locked wording (line 142) and the `<role>` hard-break decision row (Key Decisions table).
- `.planning/REQUIREMENTS.md` and `.planning/phases/24-upgrade-path-ledger-policy/24-CONTEXT.md` — UPG-01/UPG-02 definitions and all locked D-01..D-11 decisions.

### Secondary (MEDIUM confidence)
- None used — no external web sources were needed; this phase's entire factual basis lives inside the project's own repo and git history.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new tooling, everything reused from proven in-repo patterns.
- Architecture: HIGH — the gate mechanism and ledger format are fully specified by locked CONTEXT.md decisions; no open design space beyond the two Discretion items.
- Pitfalls: HIGH — all four pitfalls derived from direct inspection of live repo/external state (dogfood test assertions, magma's actual files), not speculation.

**Research date:** 2026-07-06
**Valid until:** Until v0.0.7 ships (this research is tied to the exact current unreleased state of `src/version.js`/`src/init.js`; once v0.0.7 is tagged, re-verify the "unreleased, still editable" premise in Open Question 1 no longer holds for wording changes).
