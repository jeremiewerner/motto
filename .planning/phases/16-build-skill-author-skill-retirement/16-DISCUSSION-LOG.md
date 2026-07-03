# Phase 16: build-skill & author-skill Retirement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 16-build-skill & author-skill Retirement
**Areas discussed:** Interview flow, Lint loop mechanics, Quality gate (BSKL-05), Schema source & retirement

---

## Interview flow

| Option | Description | Selected |
|--------|-------------|----------|
| Silent gap-fill | Ask ONLY for missing slots; complete input → zero questions | ✓ |
| Confirm inferred values | One summary of inferred name/description/audience before generating | |
| Confirm risky slots only | Silent on content, always confirm name + audience | |

**User's choice:** Silent gap-fill (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| One batch | Single message listing all missing slots at once | ✓ |
| One-by-one | Sequential questions, each answer informing next | |
| Batch + follow-up | One batch plus a single follow-up round for new gaps | |

**User's choice:** One batch (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Auto when procedural | build-skill detects step-like input → template: procedure; descriptive → base | ✓ |
| Always procedure | Every generated skill gets template: procedure | |
| Ask the user | Template choice becomes a gap-fill question | |

**User's choice:** Auto when procedural (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Only when implied | Raise outputs/deps/allowed-tools only when input implies them | ✓ |
| Always offer once | Gap-fill batch always includes one optional-fields line | |
| Never ask | Only emit fields when input states them outright | |

**User's choice:** Only when implied (recommended)

---

## Lint loop mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| npx fallback chain | Local bin/PATH first, npx @jeremiewerner/motto lint fallback | ✓ |
| Bare `motto lint` | Assume motto on PATH | |
| npx always | Always npx — deterministic but slower, version skew risk | |

**User's choice:** npx fallback chain (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Filter to new skill | Iterate only on generated skill's errors; report pre-existing once | ✓ |
| Require clean tree | Refuse success until whole project lints clean | |
| Offer to fix others | Fix new skill, then ask about pre-existing errors | |

**User's choice:** Filter to new skill (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| 3 attempts then report | Bounded loop; still dirty → show errors + attempts, hand to user | ✓ |
| No explicit cap | Trust 'iterate until clean' | |
| 1 retry only | Generate → lint → one fix pass → report | |

**User's choice:** 3 attempts then report (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Detect + point to init | Missing project markers → stop, direct to motto init | ✓ |
| Offer to run init | Detect, offer to scaffold right there | |
| Generate anyway, skip lint | Write wherever cwd is; warn lint skipped | |

**User's choice:** Detect + point to init (recommended)

---

## Quality gate (BSKL-05)

| Option | Description | Selected |
|--------|-------------|----------|
| After lint-clean | generate → lint clean → gate → fix → re-lint if edits → report | ✓ |
| Before first lint | Gate on the draft, before lint cycles | |
| Woven into generation | No separate gate step | |

**User's choice:** After lint-clean (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| 3 required + few structural | Add verb-led-steps, no-placeholder, description-limit checks | ✓ |
| Exactly the 3 named | Only what BSKL-05 states | |
| Broader rubric | Subjective quality dimensions | |

**User's choice:** 3 required + few structural (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Self-fix, ask if stuck | Rewrite failing part itself; ask only when info is missing | ✓ |
| Always ask user | Report each gate failure and ask | |
| Fix silently, no cap | Iterate until pass, never surface | |

**User's choice:** Self-fix, ask if stuck (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Compact receipt | Files written, lint attempts, gate checks, one next-step line | ✓ |
| Full skill dump | Print entire generated SKILL.md | |
| Minimal one-liner | 'Created skills/<name>/ — lint clean.' | |

**User's choice:** Compact receipt (recommended)

---

## Schema source & retirement

| Option | Description | Selected |
|--------|-------------|----------|
| Bundle stale + note | Bundle skill-schema.md as-is; delta knowledge in build-skill instructions; Phase 17 closes gap | ✓ |
| Minimal patch now | Stub sections for 4 new fields in Phase 16 | |
| Pull rewrite into 16 | Full skill-schema.md rewrite here (DOC-06's scope) | |

**User's choice:** Bundle stale + note (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Delete outright | No migration; skill-schema.md canonical; error table = lint-string debt | ✓ |
| Migrate error table | Move common-lint-errors table into skill-schema.md first | |
| Archive to .planning | Copy SKILL.md into .planning/archive before delete | |

**User's choice:** Delete outright (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| One commit swap | Add build-skill + delete author-skill + dogfood test update in one commit | ✓ |
| Add then remove | Two commits, both green, count 2→3→2 | |
| Planner decides | Lock only the invariant | |

**User's choice:** One commit swap (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Only honest fields | shared_references [skill-schema]; allowed-tools only if genuinely true | ✓ |
| Exercise all fields | Declare all Phase 15 fields to live-prove validators | |
| Bare minimum | Required fields + template: procedure only, no shared ref | |

**User's choice:** Only honest fields (recommended)

---

## Claude's Discretion

- Exact prompt-engineering of build-skill's body (researcher gathers skill-creator/writing-skills specifics per roadmap flag)
- Project-marker detection for "inside a Motto project"
- Exact structural-check wording in the quality gate
- Whether build-skill's `allowed-tools` is honest enough to include
- `<process>` step granularity for build-skill's own body

## Deferred Ideas

None — discussion stayed within phase scope.
