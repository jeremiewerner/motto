# Phase 12: Docs & Cleanup - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

README documents the full ship-your-plugin path built around `motto init` (DOC-04) and the scaffold section is rewritten around `motto init` with `skills/setup-project/` deleted in the same commit as the dogfood-test count update so main never goes red (DOC-05). Requirements: DOC-04, DOC-05. `author-skill` and `release` skills stay untouched. No new CLI features, no CONTRIBUTING.md, no CI.

</domain>

<decisions>
## Implementation Decisions

### Ship-your-plugin section (DOC-04)
- **D-01:** New dedicated "Ship your plugin" section (placed after Validate-and-build); the E2E example is updated to end with the ship steps. Not folded into the E2E example alone.
- **D-02:** Repo/owner names are placeholders: `/plugin marketplace add <owner>/<repo>` with one line explaining substitution. `jeremiewerner/motto` appears only in the existing "Install Motto's skills" / marketplace sections (Motto's own plugin).
- **D-03:** Git steps are BRIEF PROSE — "commit `dist/public/` and push your repo public" as a sentence, not exact git commands. Trust the user knows git. (User explicitly chose this over the exact-commands recommendation.)
- **D-04:** marketplace.json gets a one-line mention: `motto init` already created `.claude-plugin/marketplace.json` pointing at `dist/public/` — nothing to configure. No schema walkthrough.

### Scaffold section rewrite (DOC-05)
- **D-05:** Section leads with `motto init my-project`, shows the resulting tree (now including `.claude-plugin/`, `.gitignore`, starter `hello-world` skill), and keeps the motto.yaml field table as reference. Manual "create motto.yaml" instructions are dropped.
- **D-06:** Guards documented as two one-liners: the kebab-case name rule (same rule lint enforces) and `--force` for non-empty directories. No full guard-semantics docs.
- **D-07:** The README's motto.yaml example block shows the SCAFFOLDED output (exactly what `motto init my-project` writes), replacing Motto's own config as the example. Kept truthful by the existing scaffold-dogfood test.
- **D-08:** E2E example step 2 (`/motto:setup-project`) becomes `motto init my-project` — the example is CLI-only until the Claude Code install steps at the end.

### setup-project retirement (DOC-05)
- **D-09:** Two commits: (1) full README rewrite, (2) delete `skills/setup-project/` + dogfood test updates in the same commit — lint count 3→2, `skillCount` 3→2, remove the two setup-project artifact tests (`dist/public/setup-project/SKILL.md exists`, `setup-project has references/skill-schema.md bundled`). Each commit leaves main green; the delete lands only after the docs that replace the skill.
- **D-10:** Explicit salvage-check task before the delete: diff `skills/setup-project/SKILL.md` content against the rewritten README; anything not covered is folded in or consciously dropped. No silent doc loss.
- **D-11:** No user-facing removal note (no README migration line, no release-skill checklist change). The skills table just loses its setup-project row and the install-section comment becomes author-skill only. Changelog concerns belong to the v0.0.4 release step.

### Phase 11 CLI surface in README
- **D-12:** Light touch only: add `[path]` to the `motto lint` / `motto build` command lines where they appear, and mention `motto --help` once in Install-the-CLI. No CLI reference section.
- **D-13:** Install-the-CLI section lists all three commands — init, lint, build — mirroring `--help`'s compact order, so the first screen shows the full loop; the scaffold section carries the detail.

### Claude's Discretion
- Exact section title and prose wording within the agreed shapes.
- Whether the Contents/ToC list is renumbered/retitled to fit the new section (it must at least stay accurate).
- Exact placement of the `--help` mention and `[path]` annotations.
- How the salvage-check is recorded (task note in SUMMARY vs inline plan step) — must exist as an explicit step either way.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — DOC-04/05 definitions; Out of Scope table (no `motto ship`, no interactive init)
- `.planning/ROADMAP.md` — Phase 12 goal + 3 success criteria (SC3 locks delete + dogfood-count update to one commit)

### Files this phase changes
- `README.md` — the primary artifact; current setup-project mentions at: Scaffold section (§Scaffold a project), E2E example step 2, skills table (§Install Motto's skills), install-output comment
- `test/dogfood.test.js` — lint count=3 assertion, `skillCount=3` assertion, two setup-project artifact tests (lines ~97, ~106) — all change in the delete commit
- `skills/setup-project/SKILL.md` — content to salvage-check before deletion (D-10)

### Source of truth for what init actually writes (D-05/D-07 must match reality)
- `src/init.js` — inline templates: scaffolded motto.yaml, .gitignore, marketplace.json, hello-world skill; README tree/example blocks must mirror these exactly
- `.planning/phases/10-project-scaffold-motto-init/10-CONTEXT.md` — Phase 10 decisions (D-02: starter skill minimal, docs live in README — this phase pays that debt)
- `.planning/phases/11-cli-ergonomics-help-path/11-CONTEXT.md` — Phase 11 help/`[path]` shapes the README references (D-12/D-13 mirror the agreed `--help` output)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Scaffold-dogfood test (`test/init-dogfood.test.js`) already guards init → lint → build — D-07's "README example matches scaffold output" leans on it; no new guard mechanism needed.
- `--help` text in bin/motto.js (Phase 11) is the canonical compact command list D-13 mirrors.

### Established Patterns
- Pre-commit hook runs the full suite against the working tree — the delete commit MUST contain both the skill deletion and the dogfood-test edits or the hook rejects it (this enforces SC3 mechanically).
- `grep -rln setup-project` blast radius confirmed: only `test/dogfood.test.js`, `README.md`, `skills/setup-project/SKILL.md`. No cross-refs from author-skill or release skills.

### Integration Points
- `shared/references/skill-schema.md` remains bundled into author-skill after the delete — no shared-reference cleanup needed.
- Repo's own `.gitignore` ignores all of `dist/`; `dist/public/` is rebuilt by `prepublishOnly` — setup-project disappears from the published plugin at the next `npm publish`, no dist cleanup in this phase.

</code_context>

<specifics>
## Specific Ideas

- Ship section skeleton agreed: `motto build` → commit `dist/public/` and push the repo public (prose) → consumer runs `/plugin marketplace add <owner>/<repo>` → `/plugin install <plugin>@<repo-name>` — with the one-line marketplace.json reassurance (D-04).
- Install-the-CLI command list shape (D-13): three one-liners in init/lint/build order, matching `motto --help`.

</specifics>

<deferred>
## Deferred Ideas

- **Full CLI reference section** in README (all flags, exit codes) — considered during D-12, deliberately skipped; candidate for a future docs pass alongside CLIX-01/02.

</deferred>

---

*Phase: 12-Docs & Cleanup*
*Context gathered: 2026-07-02*
