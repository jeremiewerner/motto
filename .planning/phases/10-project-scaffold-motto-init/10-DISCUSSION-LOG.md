# Phase 10: Project Scaffold (`motto init`) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 10-Project Scaffold (`motto init`)
**Areas discussed:** Starter skill content, Empty-dir guard semantics, Invalid-name handling, Init output & next steps

---

## Starter skill content

| Option | Description | Selected |
|--------|-------------|----------|
| Teach-the-schema | Body doubles as documentation; user learns schema by reading the file | |
| Minimal placeholder | Bare-minimum valid skill; fastest to delete-and-replace | ✓ (via free text) |
| You decide | Claude picks during planning | |

**User's choice:** Free text — "don't double the documentation, motto init, init. that's it :)"
**Notes:** Explicit no-doc-duplication instruction; docs live in README (Phase 12).

| Option | Description | Selected |
|--------|-------------|----------|
| my-skill | Signals "rename me" | |
| example | Reads as permanent example | |
| hello-world | Classic first-project convention | ✓ |

**User's choice:** hello-world

| Option | Description | Selected |
|--------|-------------|----------|
| Empty dir | shared/references/ empty (+.gitkeep); hello-world self-contained | ✓ |
| Sample reference | Tiny example.md wired via shared_references | |

**User's choice:** Empty dir (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| public | Builds into dist/public/; init→lint→build yields committable plugin | ✓ |
| private | Builds to gitignored dist/private/ | |

**User's choice:** public (recommended option)

---

## Empty-dir guard semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Allowlist ignores | .git/, .DS_Store don't count; any real file blocks | ✓ |
| Strictly empty | Any entry blocks, including .git/ | |
| Block on collisions only | Only refuse if scaffold-target paths exist | |

**User's choice:** Allowlist ignores (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite scaffold paths | Write all scaffold files, overwrite collisions, leave rest untouched | ✓ |
| Write missing only | Fill gaps, never overwrite | |

**User's choice:** Overwrite scaffold paths (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| List offending entries | ✗ message naming entries (capped) + --force hint | ✓ |
| Generic one-liner | "directory not empty — use --force" | |

**User's choice:** List offending entries (recommended option)

---

## Invalid-name handling

| Option | Description | Selected |
|--------|-------------|----------|
| Error + suggest fix | Show exact schema.js rule + sanitized candidate suggestion | ✓ |
| Auto-sanitize | Silently lowercase/hyphenate and proceed | |
| Plain error | Rule violation only, no suggestion | |

**User's choice:** Error + suggest fix (recommended option)
**Notes:** Same treatment for explicit invalid `[name]`; rule set locked to schema.js by SC4 (not discussed further).

---

## Init output & next steps

| Option | Description | Selected |
|--------|-------------|----------|
| File tree + next steps | ✓ line, created-files tree, next-step hints | ✓ |
| One-liner only | Terse summary, user runs ls | |
| One-liner + next steps | Summary + hints, no tree | |

**User's choice:** File tree + next steps (recommended option)

| Option | Description | Selected |
|--------|-------------|----------|
| motto lint | Verify scaffold immediately | ✓ |
| motto build | Complete scaffold→plugin loop | ✓ |
| git init + commit hint | Printed ship-flow hint | |
| Edit hello-world hint | Points at authoring work | |

**User's choice:** motto lint + motto build, plus free text: "Later, when the skill builder will be developed, should be announced here"
**Notes:** Skill-maker announcement recorded as deferred idea (AUTH-SKILL backlog).

---

## Claude's Discretion

- Exact wording/formatting of file tree and messages
- motto.yaml scaffold field defaults, marketplace.json placeholder owner text, starter-skill body wording
- Template storage mechanism (inline strings vs template files) and scaffold-dogfood test placement — planner/researcher

## Deferred Ideas

- Announce the interactive skill-maker (AUTH-SKILL) in `motto init` success output once it ships
