# Phase 12: Docs & Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 12-Docs & Cleanup
**Areas discussed:** Ship-flow section shape, Scaffold rewrite depth, setup-project fallout, Phase 11 CLI in README

---

## Ship-flow section shape

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated section | 'Ship your plugin' section after Validate-and-build; E2E example updated to end with it | ✓ |
| Rework E2E example only | Fold ship steps into existing E2E example, no new section | |
| Both merged into one walkthrough | Collapse E2E + ship into a single walkthrough replacing both | |

**User's choice:** New dedicated section (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholders | `/plugin marketplace add <owner>/<repo>` + substitution line; jeremiewerner/motto stays in Install-Motto's-skills only | ✓ |
| Worked fake example | Concrete fake identity (jane/my-skills) throughout | |
| Both | Placeholder command + concrete example line below | |

**User's choice:** Placeholders (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Exact commands | git add/commit/push + make-repo-public mechanics | |
| Brief prose | "Commit dist/public/ and push your repo public" — one sentence | ✓ |
| Commands, git-fluent | git commands but skip repo-creation mechanics | |

**User's choice:** Brief prose — diverged from the exact-commands recommendation; trusts the reader knows git.

| Option | Description | Selected |
|--------|-------------|----------|
| One-line mention | "init already created marketplace.json pointing at dist/public/ — nothing to configure" | ✓ |
| Silent | Steps only, marketplace.json never named | |
| Short subsection | Show scaffolded file shape + fields that matter | |

**User's choice:** One-line mention (recommended)

---

## Scaffold rewrite depth

| Option | Description | Selected |
|--------|-------------|----------|
| init + tree + field table | Lead with `motto init my-project`, show resulting tree, keep motto.yaml field table; drop manual instructions | ✓ |
| init + tree only | Command + tree; field table dies | |
| init only | Command + lint/build pointer only | |

**User's choice:** init + tree + field table (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Name rule + --force one-liner | One line each on kebab-case rule and --force | ✓ |
| Full guard docs | Name rule + refusal behavior + --force semantics | |
| None | CLI errors are self-explanatory | |

**User's choice:** Name rule + --force one-liner (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Scaffolded output | Show exactly what init writes; kept truthful by scaffold-dogfood test | ✓ |
| Keep Motto's own | Motto's real config as example | |
| Generic annotated example | Hand-written commented example | |

**User's choice:** Scaffolded output (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| motto init my-project | Pure shell step; E2E CLI-only until Claude Code install steps | ✓ |
| Drop the E2E example | New sections make it redundant | |
| Keep example, two variants | Shell + skill paths side by side | |

**User's choice:** motto init my-project (recommended)

---

## setup-project fallout

| Option | Description | Selected |
|--------|-------------|----------|
| Two commits | README rewrite first; delete + dogfood updates second; each green | ✓ |
| One atomic commit | README + delete + tests together | |
| Three commits | Ship section / scaffold rewrite / delete+tests | |

**User's choice:** Two commits (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, explicit check | Planner task: diff SKILL.md content against rewritten README before delete | ✓ |
| No, straight delete | Trust the rewrite supersedes it | |

**User's choice:** Yes, explicit salvage-check (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| No note | Table row disappears; changelog is a release-step concern | ✓ |
| README migration line | "setup-project retired in v0.0.4 — use motto init" | |
| Release-skill checklist item | Reminder to mention removals in release notes | |

**User's choice:** No note (recommended)

---

## Phase 11 CLI in README

| Option | Description | Selected |
|--------|-------------|----------|
| Light touch | [path] on lint/build command lines + one --help mention; no new section | ✓ |
| Full CLI reference section | All subcommands, flags, exit codes | |
| Skip entirely | --help is self-documenting | |

**User's choice:** Light touch (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| All three commands | Install section lists init/lint/build in --help order | ✓ |
| Keep lint/build only | init appears first in scaffold section | |

**User's choice:** All three commands (recommended)

---

## Claude's Discretion

- Exact section titles and prose wording within agreed shapes
- Contents/ToC renumbering (must stay accurate)
- Placement of --help mention and [path] annotations
- How the salvage-check step is recorded (must exist as explicit step)

## Deferred Ideas

- Full CLI reference section in README — future docs pass alongside CLIX-01/02
