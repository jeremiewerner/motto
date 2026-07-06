# Phase 25: v0.0.6 Operator Debt Closure - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 4 (2 likely-new phase artifacts, 1 likely-edited doc, 1 conditional patch-release path)
**Analogs found:** 4 / 4

This is a pure operator-checkpoint phase — no `src/` code changes expected. All patterns
below are planning-artifact / operator-runbook patterns, not code patterns. There is no
controller/service/component classification applicable; "role" here means artifact type.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.planning/phases/25-v0-0-6-operator-debt-closure/25-TOKEN-LOCKDOWN.md` (or similarly named leak-safe record; exact name is Claude's Discretion per CONTEXT.md) | phase-record (evidence artifact) | event-driven (records a one-time operator action) | `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md` | exact |
| `.planning/phases/25-v0-0-6-operator-debt-closure/25-0X-PLAN.md` (checkpoint plan(s) for DEBT-07/08 lock actions) | plan (operator-checkpoint) | event-driven (human-performed dashboard action, agent-verified after) | `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-03-PLAN.md` (Task 2: npm Trusted Publisher checkpoint) | exact |
| `.planning/phases/25-v0-0-6-operator-debt-closure/25-0X-PLAN.md` (stranger re-walk plan for DEBT-06) | plan (operator-checkpoint) | event-driven (human-performed marketplace walkthrough, content-diff verification) | `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-05-PLAN.md` (Task 1: stranger walkthrough checklist) | exact |
| `README.md` (marketplace install section — plugin-cache caveat addition) | config/doc (user-facing doc) | request-response (README is read by a stranger following steps) | `README.md` itself, "Add the marketplace to Claude Code" / "Install Motto's skills" sections (lines 237-265), and the Phase-22 precedent of editing README's "Publish to npm" section (22-05-PLAN.md Task 2) | exact |
| *(conditional)* patch-release commit/tag if DEBT-06 re-walk finds a bad tarball (D-02) | release runbook execution | batch (version bump → tag → CI-triggered publish) | `skills/release/SKILL.md` (Steps 1-9, full release flow) + `skills/release/SKILL.md` Step 10 (Zero-Tokens Follow-Through, lines 157-174) | exact |

## Pattern Assignments

### `25-TOKEN-LOCKDOWN.md` (or equivalent) — leak-safe evidence record (DEBT-07/08)

**Analog:** `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md`

**Structure pattern** (whole file, 136 lines):
- Opening paragraph states what the file is a "committed, leak-safe record" of, and explicitly states what it **never** contains (raw output, secret values):
```markdown
# Phase 22: Secrets Scan & PII Sweep Record

This file is the committed, leak-safe record required by OPEN-01 ... It never contains raw
gitleaks JSON output or any matched secret text — only structured metadata (tool
version, commit SHA, counts, rule IDs, file paths).
```
- Each recorded action gets its own `##` section with a fixed field list: **Command run**, **tool/version**, **identifying context** (HEAD SHA / date), **result** (counts, pass/fail), followed by prose interpretation.
- A disposition/summary table at the end when there are multiple findings needing different treatment (see lines 105-113 — not needed for Phase 25's simpler binary revoke/lock actions, but the pattern of "one row per finding/action with an explicit disposition" transfers directly to recording DEBT-07 (revoke + delete) and DEBT-08 (lock) as two rows: action taken, verification command, result, date).

**Direct transfer to Phase 25:**
```markdown
## DEBT-07 — Token Revocation & Secret Deletion

- **Action:** granular npm access token revoked on npmjs.com (package @jeremiewerner/motto)
- **Command:** `gh secret delete NPM_TOKEN`
- **Verification:** `gh secret list` — confirms `NPM_TOKEN` absent
- **Date:** <date>
- **Result:** [pass/fail]

Never record the token value itself.

## DEBT-08 — Trusted-Publisher-Only Lock

- **Action:** npmjs.com publishing access for @jeremiewerner/motto set to trusted-publisher-only (tokens disallowed)
- **Verification:** `npm view @jeremiewerner/motto --json` — attestation/provenance data present
- **Date:** <date>
- **Result:** [pass/fail]
```

This mirrors the Scan #1/Scan #2 structure exactly (command, version/identity, result, then
prose), and reuses the "never record the value itself" leak-safe discipline verbatim
(22-SECRETS-SCAN.md lines 25, 165 in skills/release/SKILL.md Step 10 item 1).

---

### Checkpoint plan(s) for DEBT-07/08 lock actions (npmjs.com / GitHub settings)

**Analog:** `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-03-PLAN.md` Task 2 (npm Trusted Publisher checkpoint)

**Checkpoint task pattern** (lines 80-106 of 22-03-PLAN.md):
```xml
<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 2: Maintainer configures the npm Trusted Publisher</name>
  <read_first>...</read_first>
  <action>
    Blocking human checkpoint (no automated implementation — npmjs.com's ... config has no
    CLI/API surface): the maintainer goes to npmjs.com -> ... and fills in exactly: ...
  </action>
  <what-built>...</what-built>
  <verify>
    <human-check>npmjs.com's package Settings page ... shows ...</human-check>
  </verify>
  <done>...</done>
  <how-to-verify>
    1. ...
    2. ...
    3. ...
  </how-to-verify>
  <resume-signal>Type "approved" once ..., or describe what went wrong.</resume-signal>
  <acceptance_criteria>
    - Maintainer attests (recorded in the SUMMARY) ...
    - No npm auth token or credential value is recorded anywhere in the plan or SUMMARY.
  </acceptance_criteria>
</task>
```

This is the exact shape Phase 25's DEBT-07/08 checkpoint plan(s) should copy: revoke-token
and lock-to-trusted-publisher-only are both dashboard-only actions with no CLI surface for
the *configuration* step (though `gh secret delete` and `npm view --json` ARE scriptable —
those verification/deletion steps should be `type="auto"` tasks per the Task-1/Task-2 split
in 22-03-PLAN.md, where Task 1 was `type="auto"` for the scriptable branch-protection change
and Task 2 was the checkpoint for the non-scriptable npmjs.com UI action). Split Phase 25's
DEBT-07/08 plan the same way:
- `type="auto"` task: `gh secret delete NPM_TOKEN` + `gh secret list` verification (scriptable).
- `type="checkpoint:human-verify"` task: npmjs.com token revocation UI action + trusted-publisher-only lock UI action (no CLI/API surface, per `skills/release/SKILL.md` Step 10 items 1-2).

**Never-re-mint-token acceptance criteria pattern** — copy the explicit negative assertion:
```
No npm auth token or credential value is recorded anywhere in the plan or SUMMARY.
```
applies verbatim to Phase 25's plan/SUMMARY for DEBT-07.

---

### Stranger re-walk plan for DEBT-06 (marketplace install + content diff)

**Analog:** `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-05-PLAN.md` Task 1 (stranger walkthrough checklist)

**Checklist-as-checkpoint pattern** (lines 52-77):
```xml
<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 1: Stranger walkthrough checklist</name>
  <action>
    Blocking human checkpoint (requires a genuinely logged-out browser session and a clean
    shell — cannot be simulated in this environment): the maintainer walks the following
    checklist ..., recording pass/fail per item: (1) ...; (2) run `npm i -g @jeremiewerner/motto`
    ...; (3) ... `/plugin marketplace add jeremiewerner/motto` then `/plugin install
    motto@motto`; (4) confirm the installed skill (`build-skill`) appears in Claude Code's
    skill list. This is a distribution-path check only — do not invoke the skill's behavior.
  </action>
  ...
  <resume-signal>Type "approved — all 4 items pass" or list which item(s) failed ...</resume-signal>
</task>
```

**Phase 25 delta to add on top of this analog** (per CONTEXT.md D-05/DEBT-06 wording — content
diff, not just presence check): extend item (4) into an explicit diff step — after confirming
`build-skill` appears (and retired `author-skill`/`setup-project` do NOT appear, per
`skills/release/SKILL.md` Step 10 item 4's phrasing), diff the actual installed plugin
directory content against `dist/public/` rebuilt from the current git tag, rather than
trusting `/plugin` cache-status output. This is the CONTEXT.md "Claude's Discretion" item
("what exactly gets diffed") — the analog's checklist shape transfers; the diff step is new
content this phase adds, anchored to `skills/release/SKILL.md` Step 10 item 4:

```
Re-verify the public marketplace path ... From a logged-out browser and clean shell,
re-run the Phase 22 Plan 05 stranger-walkthrough marketplace steps ... and confirm
`build-skill` (not the retired `author-skill`/`setup-project`) appears in Claude Code's
skill list. Record pass/fail.
```

**`<how-to-verify>` numbered-steps pattern** (lines 69-71, and 22-04-PLAN.md lines 89-93) —
copy this shape for the diff step:
```xml
<how-to-verify>
  1. <setup step>
  2. <action step>
  3. <verification/diff step>
</how-to-verify>
```

---

### `README.md` — plugin-cache caveat addition (marketplace install section)

**Analog:** `README.md` itself, sections "Add the marketplace to Claude Code" (lines 237-245)
and "Install Motto's skills" (lines 249-260); precedent for editing this same file's install
docs is `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-05-PLAN.md`
Task 2 (README accuracy pass on the "Publish to npm" section).

**Existing structure to extend** (README.md lines 237-260):
```markdown
## Add the marketplace to Claude Code

> **Prerequisite:** the `jeremiewerner/motto` repository must be public for the GitHub-form add to resolve.

\`\`\`
/plugin marketplace add jeremiewerner/motto
\`\`\`

This registers Motto's self-hosted marketplace in Claude Code. The marketplace entry points to `@jeremiewerner/motto` on npm and exposes the public skills from `dist/public/`.

---

## Install Motto's skills

\`\`\`
/plugin install motto@motto
\`\`\`

This installs Motto's public skills into Claude Code, making the following slash commands available:

| Skill | Slash command | What it does |
|-------|--------------|-------------|
| `build-skill` | `/motto:build-skill` | ... |
```

**Pattern to copy for the cache caveat:** use the same `> **Prerequisite:** ...` blockquote
callout convention already used immediately above the marketplace-add command (line 239) to
add a `> **Note:** ...` (or similarly-flagged) callout about Claude Code's plugin cache —
i.e., that a stale local cache can make an already-installed plugin appear not to reflect
the latest published version, and how to force a refresh/reinstall. Place it either directly
under "Add the marketplace to Claude Code" (where the prerequisite callout already lives) or
under "Install Motto's skills" (where the skill-list table is) — CONTEXT.md leaves the exact
placement to Claude's Discretion, but flags the marketplace install section as "the natural
candidate since that's where a stranger hits the cache behavior."

**Task shape for the edit** — follow 22-05-PLAN.md Task 2's bounded-edit discipline (lines
79-104): a `type="auto"` task with a `grep`-based `<automated>` verify check confirming the
new caveat text is present, scoped strictly to the cache-caveat addition — no unrelated
README rewrite (same "no rewrite, bounded by findings" discipline as D-11 in Phase 22).

---

### *(Conditional)* Patch-release execution, if DEBT-06 re-walk finds a bad tarball (D-02)

**Analog:** `skills/release/SKILL.md` full Steps 1-9 (standard release flow) + Step 10
(Zero-Tokens Follow-Through, lines 157-174) — this phase does not re-design the release
flow, it executes it verbatim if triggered.

**Recovery/never-re-mint discipline to carry into Phase 25's plan** (`skills/release/SKILL.md`
line 131, Step 8 item 4 — this is D-04's direct source):
```
4. If the failure is transient (network, registry hiccup) or a fixable config issue (fix
   the Trusted Publisher configuration on npmjs.com, fix a workflow permissions typo such
   as a missing `id-token: write` — never mint a new `NPM_TOKEN`; publishing is
   trusted-publisher-only per Step 10), fix the root cause if needed, then re-run only the
   failed job(s):
   \`\`\`
   gh run rerun <run-id> --failed
   \`\`\`
```

**Step 10 provenance-verification pattern to reuse for the patch-release-as-lock-proof
framing** (lines 167-171):
```
3. Verify provenance via the registry. Check the npmjs.com package page for a provenance
   attestation badge, or run:
   npm view @jeremiewerner/motto --json
   and look for attestation data. Record what was observed (do not just assume
   `--provenance` worked because `npm publish` exited 0).
```
If Phase 25 needs a patch release, record its CI run + `npm view --json` output the same way,
framed as "live proof of the trusted-publisher lock" per CONTEXT.md's D-02.

## Shared Patterns

### Leak-safe recording discipline
**Source:** `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-SECRETS-SCAN.md` (lines 1-6, 21-23, 129-131) and `skills/release/SKILL.md` Step 10 item 1 (line 165)
**Apply to:** every artifact this phase writes (evidence record, plan SUMMARYs) — command run, tool/version, identifying context, result count; **never** the secret/token value itself.

### Operator-checkpoint task shape (`type="checkpoint:human-verify" gate="blocking-human"`)
**Source:** `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-03-PLAN.md` (Task 2, lines 80-106) and `22-05-PLAN.md` (Task 1, lines 52-77) and `22-04-PLAN.md` (Task 2, lines 73-99)
**Apply to:** all DEBT-07/08 dashboard actions and the DEBT-06 stranger re-walk — every such task needs `<action>`, `<what-built>`, `<verify><human-check>`, `<how-to-verify>` numbered steps, `<resume-signal>` with an explicit approve/describe-failure phrasing, and `<acceptance_criteria>` including a negative assertion against recording secret values where relevant.

### Auto/checkpoint task split within one plan
**Source:** `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-03-PLAN.md` (Task 1 `type="auto"` for scriptable `gh api` branch protection vs Task 2 `type="checkpoint:human-verify"` for the non-scriptable npmjs.com UI action)
**Apply to:** Phase 25's DEBT-07/08 plan — split `gh secret delete` / `gh secret list` (scriptable, `type="auto"`) from the npmjs.com token-revoke and trusted-publisher-only lock UI actions (`type="checkpoint:human-verify"`).

### Never-re-mint-token / never-purge-history standing invariant
**Source:** `skills/release/SKILL.md` Step 8 item 4 (line 131); `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-CONTEXT.md` D-01/D-06 (no history rewrite, mirrored in 22-SECRETS-SCAN.md lines 105-113)
**Apply to:** D-04's "fix the Trusted Publisher config, re-run the job, never re-mint" contingency — copy the exact phrasing style into whatever plan handles the CI-auth-failure branch.

## No Analog Found

None. All four Phase-25 artifact types have a strong, directly-reusable Phase 22 or
release-skill analog — this phase is explicitly a re-execution of already-established
patterns, not new pattern territory.

## Metadata

**Analog search scope:** `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/`, `skills/release/SKILL.md`, `README.md`
**Files scanned:** 22-SECRETS-SCAN.md, 22-03-PLAN.md, 22-04-PLAN.md, 22-05-PLAN.md, skills/release/SKILL.md (Steps 8-10 + success criteria), README.md (install/marketplace sections)
**Pattern extraction date:** 2026-07-06
