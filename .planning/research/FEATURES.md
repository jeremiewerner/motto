# Feature Research

**Domain:** Skill-generator / meta-skill ("a skill that writes skills") + schema fields for declaring skill outputs and inter-skill dependencies
**Researched:** 2026-07-02
**Confidence:** HIGH (primary sources read in full: official spec + two real, widely-used skill-generators + Motto's own prior-art research target)

## Sources studied (full text read, not summarized secondhand)

| Source | What it is | Location |
|---|---|---|
| **Anthropic `skill-creator`** | Anthropic's own official meta-skill, ships in `anthropics/skills` | Local checkout `/Users/jeremie/Projects/ai-workspace/skills/skill-creator/` — canonical: [github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) |
| **`obra/superpowers` `writing-skills`** | Jesse Vincent's TDD-for-skills meta-skill, v6.1.0 | Local plugin cache — canonical: [github.com/obra/superpowers](https://github.com/obra/superpowers) |
| **agentskills.io specification** | The open SKILL.md format spec both of the above (and Motto) target | [agentskills.io/specification](https://agentskills.io/specification) |
| **gsd-core installed skills** (55 real `SKILL.md` files, incl. this researcher's own prompt) | Live corpus of `allowed-tools`, `argument-hint`, `<output>` block usage in production | `/Users/jeremie/.claude/skills/*/SKILL.md`, `/Users/jeremie/.claude/gsd-core/` |
| **Motto design spec** | Locked decisions D-01..D-08 for this milestone | `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` |

**Key cross-check finding (HIGH confidence, verified two independent ways — official spec text + Anthropic's own validator source code):** neither the official agentskills.io spec nor any surveyed real-world skill has an `outputs:` or `dependencies:` frontmatter field. Anthropic's own `scripts/quick_validate.py` in `skill-creator` hard-codes an **allowlist** of frontmatter keys — `{name, description, license, allowed-tools, metadata, compatibility}` — and *rejects* any other key as "unexpected". `template:`, `outputs:`, and `dependencies:` are **Motto-original extensions**, not things being standardized elsewhere. This is a genuine differentiator, not a gap Motto is late to close — but it also means these fields are 100% Motto's own field to design well, with zero prior art to lean on for their exact shape. It also means output produced by `motto build` (which copies `SKILL.md` verbatim) would carry frontmatter keys that Anthropic's own upload-side validator (if ever run against it) would flag — worth a README/docs note, not a blocker (Motto's own no-content-stripping principle already accepts this tradeoff for portability).

## Feature Landscape

### Table Stakes (Users Expect These)

Features a "skill that writes skills" is expected to have, based on both surveyed implementations converging independently on the same shape.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Ingest free-form input first** (existing conversation, pasted doc, or verbal description) before asking anything | Both skill-creator and writing-skills open with "extract what's already known from context first, fill gaps second" — asking a blank-slate interview when the workflow is already in the transcript is the #1 UX complaint pattern this avoids | LOW | Matches D-03 exactly: build-skill is a structurer, input can be "any form" |
| **Gap-filling interview, not blank-slate interview** — only ask what the input didn't already answer | skill-creator's "Capture Intent" step explicitly says extract from conversation history first, "user may need to fill the gaps, and should confirm before proceeding" | LOW–MED | Confirm-don't-reask is the differentiator vs. a generic form |
| **Fixed minimum question set**: name, trigger/when-to-use, output format/shape, edge cases | skill-creator's 4 canonical questions (what should it do / when trigger / what output format / need test cases) map 1:1 onto SKILL.md's required fields (`name`, `description`) + Motto's new fields (`outputs`) | LOW | Directly reusable as build-skill's question checklist |
| **Description quality coaching, not just presence-check** | Both sources spend enormous effort on `description` — it's the *only* thing loaded at all times and the sole trigger mechanism. skill-creator explicitly recommends "pushy" descriptions naming symptoms; writing-skills has a whole "Description = When to Use, NOT What it Does" section with tested before/after pairs | LOW (as a prompt instruction) | `motto lint` already checks length/format; build-skill should *additionally* coach description content quality at write-time, since lint can only check structure, not persuasiveness |
| **Generate a complete, schema-conformant `SKILL.md`, not a stub** | Both produce a full file with frontmatter + body sections in one pass, not scaffolding for the user to fill in later | LOW–MED | Matches D-03's "generate skill" step |
| **Self-verify against the schema before handing back to the user** | skill-creator runs `quick_validate.py`; writing-skills' Iron Law is literally "NO SKILL WITHOUT" verification; Motto's own equivalent is `motto lint` | LOW | Already have the validator — build-skill's job is to call it and iterate, not reinvent it. Cleanest possible reuse of existing Motto infrastructure |
| **Iterate-until-clean loop on the generator's own output** | Same as above — both sources treat "write once, ship" as an anti-pattern; the loop is draft → validate → fix → re-validate | LOW–MED | `motto lint` returns machine-parseable errors already (per PROJECT.md); build-skill parses them and patches |
| **Bundled-resource awareness** (`scripts/`, `references/`, `assets/`) — knows when to split content out vs. keep inline | Both sources have an explicit "Anatomy of a Skill" / "File Organization" section with the same three-bucket split and the same trigger ("heavy reference >300 lines → separate file") | LOW | Motto's shared refs mechanism (`shared/references/`) already exists — build-skill should point at it, not duplicate |
| **Name/folder-match enforcement** | Universal across spec + both tools — `name` frontmatter must equal folder name, kebab-case, no reserved words | Already built | Motto's `motto lint` already enforces this (v0.0.1) — build-skill inherits it for free |

### Differentiators (Competitive Advantage)

Where Motto's build-skill should intentionally diverge from both surveyed tools — these map to the locked design decisions (D-01..D-08) and to what neither Anthropic's nor obra's tool does at all.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Structurer, not ideator (D-03)** | Neither surveyed tool draws this line explicitly — skill-creator actively co-designs "what should the skill do", writing-skills assumes the user already knows and is testing rigor. Motto's differentiator is refusing the ideation role entirely: users bring GSD/superpowers/their own brainstorm, build-skill only maps it onto the schema. This is a scope discipline no competitor enforces, and it's what keeps build-skill "lightweight" per standing principle 3 | LOW (it's a constraint, not a feature to build) | Directly prevents build-skill from growing into a second brainstorming tool — the single most important anti-scope-creep decision in the design doc |
| **`template: procedure` self-application (dogfood)** | Neither tool applies a formal template mechanism to itself this way — skill-creator's own SKILL.md has no template/type system at all. build-skill being `template: procedure` proves the template mechanism on day one against its most complex consumer | MED | Also closes TMPL-01 (deferred since v0.0.1) with a real, load-bearing consumer instead of a speculative one |
| **Named `outputs:` map (D-04)** | Neither tool has a machine-checkable declaration of "this skill produces these files." skill-creator's evals.json/grading.json/benchmark.json family gets close (declares *test* output shapes) but nothing declares the skill's own *production* outputs as validated, existing files. Genuinely novel among surveyed tools | MED | "Same skill, different output parameters" — single-output is a one-entry map, so it doesn't burden simple skills |
| **`dependencies:` resolved in-tree (D-05)** | No surveyed tool validates skill-to-skill dependencies at all — `compatibility:` (the closest official field) is a free-text string about *environment*, not other skills. Bare-kebab-name resolution against the project's `skills/` tree is unique to Motto | MED | Format-only for namespaced (`plugin:skill`) deps is the right scope cut — matches D-05's "lint what's verifiable" |
| **Verbatim, portable output** | skill-creator's output only runs correctly with skill-creator's supporting scripts and workspace conventions present at *authoring* time; a skill it wrote is portable, but skill-creator's own tooling is not something Motto is trying to replicate. Motto's build-skill output must be plain SKILL.md + refs, loadable with zero Motto present, same as every other Motto output | LOW | Consistent with the project's existing Core Value — no new decision needed, just don't regress it |
| **CLI-verifiable self-check, not LLM-graded evals** | skill-creator's self-verify is `quick_validate.py` (deterministic) *plus* an entire optional LLM-judged eval/benchmark harness (grading.json, benchmark.json, blind comparator). Motto's self-verify is `motto lint` only — deterministic, fast, no subagent fan-out required | LOW (already exists) | This is Motto's actual competitive edge: the "strict schema + linter" Core Value gives build-skill a self-verify step competitors have to build ad hoc |

### Anti-Features (Commonly Requested, Often Problematic)

Capabilities present in one or both surveyed tools that Motto should explicitly **not** build into build-skill v0.0.5, with the alternative each maps to.

| Feature | Why Requested | Why Problematic (for Motto specifically) | Alternative |
|---------|---------------|-------------------------------------------|-------------|
| **Eval/benchmark harness** (evals.json, subagent A/B runs, `run_loop.py` description-optimizer, blind comparator, HTML viewer) | skill-creator's entire second half is this — pressure-testing skills quantitatively, comparing with/without-skill runs, optimizing triggering via iterative LLM calls | Violates "lightweight — don't overcode" and "mechanism over features"; requires subagent orchestration, Python scripts, HTML viewers — a whole second product surface Motto doesn't need. `motto lint` is deterministic and instant; an eval harness is stochastic and slow | Ship `motto lint` as the self-verify step (already exists); leave eval/benchmark tooling as an explicit non-goal, same posture as skipping a compiler |
| **RED-GREEN-REFACTOR pressure-scenario testing with subagents** (writing-skills' whole methodology) | Genuinely valuable for *discipline-enforcing* skills (rules agents might rationalize around under pressure) | build-skill generates *structure*, not discipline-rule skills — this methodology answers "does the agent obey this skill under pressure," a different question than "is this skill schema-conformant." Importing it would conflate the two and bloat build-skill's scope | If a user's skill genuinely needs pressure-testing (e.g. an enforcement skill), that's an authoring choice for *them* to make with `writing-skills` itself, not something Motto's structurer re-implements |
| **Interactive description-triggering optimizer loop** (20 eval queries, `claude -p` subprocess loop, held-out test/train split) | Real problem (skill under/over-triggering is common) — skill-creator built a whole optimizer for it | High complexity for a v0.0.5 feature; requires the `claude` CLI, background processes, HTML review UI — none of which fit Motto's "single runtime dep, no build step" constraint | build-skill's gap-fill interview should coach description quality at write-time (per skill-creator's own "pushy description" guidance) rather than optimize it after the fact via a separate loop |
| **`tools:` array replacing/duplicating `allowed-tools`** | Some ecosystems (agent-file formats, `compatibility:` field misuse) blur "tools this skill needs" into a second field name | Confirmed by D-06 and by the real-world corpus: `allowed-tools` is the actual spec field name; a second field name fragments portability | Keep `allowed-tools`, format-check only (D-05/D-06); reserve `tools:` for a future `agent` template (evolution ledger) |
| **`{var}` interpolation engine for `outputs:` placeholders** | Natural next step once you have a named-outputs map — "why not let the path be templated per invocation" | Explicitly out of scope per D-08 — YAGNI until a real skill needs runtime-resolved output paths; no surveyed tool does this either (skill-creator's `files_created` list is post-hoc, not templated) | Document `{var}` as convention-only in v0.0.5; build the interpolation engine only when a real skill demands it |
| **Second metadata/config syntax alongside frontmatter** | gsd-core's own prior sprawl (flagged in the design doc's Context section) shows the temptation — e.g. a separate JSON manifest for outputs/deps instead of extending frontmatter | Already explicitly rejected in the design spec's Context ("Reject: ... second metadata syntax"); a second syntax doubles the surface `motto lint` must parse and doubles what authors must keep in sync | `outputs:`/`dependencies:`/`allowed-tools`/`template:` all live in the one YAML frontmatter block, validated by the one schema cascade |

## Feature Dependencies

```
motto lint (existing, v0.0.1)
    └──required-by──> build-skill's self-verify step (D-03 loop: write → lint → fix → repeat)

template: mechanism (schema add-on, this milestone)
    └──required-by──> procedure template (this milestone)
                           └──required-by──> build-skill's own frontmatter (build-skill is `template: procedure`)

<process> + <success_criteria> section-tag registry (this milestone)
    └──required-by──> procedure template's required-sections check

outputs: field validation (this milestone)
    └──enhances──> build-skill's gap-fill interview (asks "what does this skill produce" once outputs: exists to answer into)

dependencies: field validation (this milestone)
    └──enhances──> build-skill's gap-fill interview (asks "does this skill call other skills" once dependencies: exists to answer into)

shared/references/ (existing, v0.0.1)
    └──enhances──> build-skill's bundled-resource decisions (knows to point at shared refs instead of duplicating content)

author-skill (existing, retiring)
    └──superseded-by──> build-skill + skill-schema.md as bundled shared ref (closes AUTH-SKILL, kills lint-string duplication)
```

### Dependency Notes

- **`motto lint` required by build-skill's self-verify step:** this is the load-bearing reuse in the whole design — build-skill has *zero* new validation logic of its own; it only needs to call the existing linter and parse its (already machine-parseable, per PROJECT.md constraints) errors. If `motto lint`'s error format ever changes, build-skill's fix-loop breaks silently — worth a regression test tying them together.
- **`template:` mechanism required before `procedure` template:** sequencing constraint already reflected in the milestone's feature list ordering (mechanism → concrete template → build-skill built as consumer of both).
- **`outputs:`/`dependencies:` enhance the interview but don't block it:** build-skill can generate a valid skill with an empty `outputs:` map or no `dependencies:` at all (both fields are optional per D-05/D-04) — the interview should ask about them but never force a non-empty answer. This mirrors the official spec's own posture that most optional fields ("most skills do not need `compatibility`") are situational, not mandatory.
- **author-skill retirement depends on skill-schema.md being bundled as a shared ref inside build-skill:** if that bundling slips, retiring author-skill would leave the schema's teaching content nowhere — sequencing risk flagged in the design spec's item 5 (Docs & dogfood).

## MVP Definition

### Launch With (v1 — this milestone, v0.0.5)

- [ ] `template:` mechanism (data-driven, `src/templates.js`) — everything else in this milestone depends on it
- [ ] `procedure` template (`<process>` + `<success_criteria>` required sections)
- [ ] `outputs:` validated field (named map, path-safe, must exist)
- [ ] `dependencies:` validated field (bare-kebab resolves in-tree, namespaced format-only)
- [ ] `allowed-tools` format validation (non-empty, whitespace-free strings)
- [ ] build-skill: ingest-any-input → gap-fill interview (name, trigger/description, steps, outputs+formats, deps/tools, audience) → generate `SKILL.md` → `motto lint` → fix-until-clean loop → report
- [ ] build-skill ships as `template: procedure` (dogfood proof)
- [ ] `author-skill` retired, its teaching content folded into `skill-schema.md` as a build-skill shared ref

### Add After Validation (v1.x)

- [ ] `{var}` interpolation/validation engine for `outputs:` placeholders — once a real skill needs runtime-resolved paths (D-08 evolution item)
- [ ] New action-tag registry entries (`<drill>`, `<run>`, `<mcp>`) — once a real skill needs them (evolution ledger)
- [ ] `template:` as an array (multi-template composition) — once two templates need to compose

### Future Consideration (v2+)

- [ ] `agent` template generating `.md` agent/subagent files (where `tools:` would properly live, distinct from `allowed-tools`)
- [ ] Skill-calls-skill parameter passing across the `dependencies:` graph
- [ ] MCP dependency resolution (currently linted as present, not resolved — explicit v0.0.4 out-of-scope carried forward)
- [ ] Any eval/benchmark harness — only if Motto's own dogfooding surfaces a real triggering-quality problem `motto lint` can't catch (structural correctness ≠ triggering quality, a gap both surveyed tools spend heavy effort on and Motto currently doesn't address at all)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `template:` mechanism | HIGH (unblocks everything else) | MED | P1 |
| `procedure` template | HIGH (first real template consumer) | LOW | P1 |
| `outputs:` field | MED–HIGH (named-output pattern is genuinely novel/useful) | MED | P1 |
| `dependencies:` field | MED (in-tree resolution catches typos/broken refs early) | MED | P1 |
| `allowed-tools` format check | LOW–MED (mostly closes a known gap) | LOW | P1 |
| build-skill ingest+interview+generate+lint loop | HIGH (the actual milestone goal) | MED–HIGH | P1 |
| author-skill retirement | LOW (cleanup) | LOW | P1 |
| `{var}` interpolation engine | LOW today, MED later | HIGH | P3 |
| Eval/benchmark harness | LOW for this milestone's goal | HIGH | P3 (anti-feature for now) |
| `agent` template | MED (real need, not yet arrived) | MED | P3 |

**Priority key:**
- P1: Must have for this milestone (v0.0.5)
- P2: Should have, add when possible
- P3: Nice to have / explicitly deferred per evolution ledger

## Competitor Feature Analysis

"Competitors" here means the surveyed prior-art skill-generators, since Motto's build-skill is not a market product but an internal meta-skill judged against the state of the art in skill-authoring tooling.

| Feature | `anthropics/skills` skill-creator | `obra/superpowers` writing-skills | Motto build-skill (this milestone) |
|---------|-----------------------------------|-------------------------------------|--------------------------------------|
| Interview style | Structured 4-question capture + open interview, "extract from context first" | Assumes user already knows content; focuses on rigor testing, not intent capture | Gap-fill only, per D-03 — narrower scope than either |
| Structural validation | `quick_validate.py`, hard-coded key allowlist, run manually/on-demand | None built-in; relies on manual checklist review | `motto lint` — deterministic, reused, already exists, called automatically in the loop |
| Quality/triggering validation | Full eval harness: subagent runs, grading, benchmarking, description-optimizer loop | Pressure-scenario RED-GREEN-REFACTOR with subagents, rationalization tables | Explicitly none in v0.0.5 (anti-feature) — deferred until dogfooding proves the gap matters |
| Output declaration | None (evals.json declares *test* outputs, not skill outputs) | None | `outputs:` named map — novel |
| Inter-skill dependency declaration | None (`compatibility:` is free-text env description) | Cross-referencing convention only ("REQUIRED SUB-SKILL: use X"), not machine-checked | `dependencies:` resolved in-tree — novel |
| Template/type system for skill shape | None | None (skill "types" — Technique/Pattern/Reference — are a naming taxonomy, not an enforced schema) | `template:` mechanism with data-driven section registry — novel among surveyed tools |
| Portability of generated output | High (plain SKILL.md), but authoring workflow needs skill-creator's own scripts present | High (plain SKILL.md), authoring workflow is pure prompting, no scripts required | High — matches both, and matches Motto's existing Core Value |
| Description-quality guidance | Extensive ("pushy" descriptions, before/after) | Extensive (tested "Use when..." pattern, workflow-summary trap documented) | Should absorb this guidance into the interview prompt (LOW cost, HIGH value — not yet an explicit design item, worth folding in) |

## Sources

- Anthropic `skill-creator` — [github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) (full text + `references/schemas.md` + `scripts/quick_validate.py` read in full from local checkout). Confidence: HIGH — primary source, official Anthropic repo.
- `obra/superpowers` `writing-skills` — [github.com/obra/superpowers](https://github.com/obra/superpowers) (full `SKILL.md` v6.1.0 read from local plugin cache). Confidence: HIGH — primary source, widely-adopted community skill.
- Agent Skills open specification — [agentskills.io/specification](https://agentskills.io/specification) (fetched directly, full frontmatter field table). Confidence: HIGH — the canonical format spec both surveyed tools and Motto target.
- Claude Platform Docs, Agent Skills overview — [platform.claude.com/docs/en/agents-and-tools/agent-skills/overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) and Claude Code Docs `skills` page — confirms `allowed-tools` is still "experimental" and format varies by implementation (array vs. space-separated string observed across sources). Confidence: MEDIUM — official docs but field noted as experimental/evolving.
- gsd-core live skill corpus (55 installed `SKILL.md` files under `/Users/jeremie/.claude/skills/`) — used to confirm real-world `allowed-tools` usage (both YAML-list and space-separated-string forms observed in the same corpus) and `<output>`-block conventions (this researcher's own prompt is an instance). Confidence: HIGH — direct inspection of live, in-use files.
- Motto design spec — `.planning/superpowers/specs/2026-07-02-skill-builder-design.md`. Confidence: HIGH — authoritative for this project, locked decisions D-01..D-08.

---
*Feature research for: skill-generator meta-skill + template/outputs/dependencies schema fields*
*Researched: 2026-07-02*
