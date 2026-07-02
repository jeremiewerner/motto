# Phase 10: Project Scaffold (`motto init`) - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

`motto init [name]` scaffolds a complete, immediately-buildable skills project into the current directory in one command: `skills/` (with a starter skill), `shared/references/`, `motto.yaml`, `.gitignore`, and `.claude-plugin/marketplace.json`. The result passes `motto lint` and `motto build` with zero edits, guarded by a permanent scaffold-dogfood test. Requirements: INIT-01..06.

Locked by REQUIREMENTS.md Out of Scope (do not re-litigate): no interactive prompts (flag-driven only), no auto `git init`, no template flavors / `--with`, no new runtime dependencies.

</domain>

<decisions>
## Implementation Decisions

### Starter skill
- **D-01:** Starter skill is named `hello-world` (folder `skills/hello-world/`, `name: hello-world`).
- **D-02:** Body is MINIMAL — do NOT duplicate Motto documentation inside the starter skill. Just the smallest valid skill (H1 title, `**Role:**` line, a sentence or two). Docs live in the README (Phase 12), not in scaffold output. (User's explicit instruction: "don't double the documentation.")
- **D-03:** `audience: public` — so init → lint → build immediately produces a committable `dist/public/` plugin and the scaffolded `marketplace.json` pointer isn't dangling.
- **D-04:** `shared/references/` is scaffolded EMPTY — no sample reference file, `hello-world` is self-contained (no `shared_references` key). Empty dir needs a `.gitkeep` so git tracks it.

### Empty-dir guard (INIT-04)
- **D-05:** "Non-empty" is judged with a small fixed allowlist of ignorable entries: `.git/` and `.DS_Store` do not count (so `mkdir && git init && motto init` works). Any other file or directory blocks. No config knob.
- **D-06:** `--force` = overwrite scaffold paths: write every scaffold file, overwriting collisions; unrelated files untouched. Deterministic post-force state = fresh scaffold + user's other files. (NOT "write missing only".)
- **D-07:** Refusal message lists the offending entries (capped — e.g. first 5 + "and N more"), in the existing `✗` CLI style, with the hint `use --force to scaffold anyway`, exit code 1 via `process.exitCode`.

### Invalid-name handling (INIT-05)
- **D-08:** When the effective name (explicit `[name]` or cwd-basename default) fails validation: refuse with the exact schema.js rule violated AND suggest a sanitized candidate, e.g. `✗ 'My Project' is not a valid name — try: motto init my-project`. Never auto-sanitize/rename silently.
- **D-09:** The rule set is single-sourced from `src/schema.js` (`NAME_KEBAB` and whatever lint applies to plugin names) — SC4: no name init accepts may later be rejected by lint.

### Init output
- **D-10:** Success output = `✓` line + tree of created files + next-steps hints. Stranger-friendly, per milestone goal.
- **D-11:** Next steps listed: `motto lint` and `motto build` only (no git-init hint, no edit-this-file hint).

### Claude's Discretion
- Exact wording/formatting of the file tree and messages.
- `motto.yaml` scaffold field defaults (version, description placeholder), marketplace.json placeholder owner text, exact starter-skill body wording — within the locked constraints above.
- Template storage mechanism (inline strings vs template files in the npm package) and scaffold-dogfood test placement — planner/researcher decide; remember the npm `files` allowlist (`bin/`, `src/`, `dist/public/`) must include whatever templates ship.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — INIT-01..06 definitions + Out of Scope table (no prompts, no git init, no flavors)
- `.planning/ROADMAP.md` — Phase 10 goal + 5 success criteria (the authoritative acceptance list)

### Single-source validation rules
- `src/schema.js` — `NAME_KEBAB` regex + reserved substrings ("anthropic", "claude"); THE name rule init must reuse (SC4/INIT-05)
- `src/config.js` — `loadConfig` / motto.yaml shape the scaffolded config must satisfy; re-exports `NAME_KEBAB`

### Patterns to match
- `bin/motto.js` — CLI dispatch pattern (parseArgs strict, `process.exitCode` never `process.exit(1)`, `✓`/`✗` output style)
- `.claude-plugin/marketplace.json` — existing manifest shape; NOTE scaffold variant uses relative `dist/public/` source + git-config owner, NOT the npm source this repo uses
- `test/dogfood.test.js` — existing dogfood-guard pattern the scaffold-dogfood test should mirror
- `skills/release/SKILL.md` — canonical example of a valid SKILL.md (frontmatter + H1 + `**Role:**`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NAME_KEBAB` (src/schema.js, re-exported by src/config.js) — direct reuse for init name validation; no new regex.
- `lintProject` / `buildProject` — the scaffold-dogfood test can call these (or shell out to the CLI) on a freshly-scaffolded temp dir.
- `parseArgs` setup in bin/motto.js — extend `options: {}` with `force: { type: 'boolean' }` for the init branch.

### Established Patterns
- Never-throw invariant (D-01 lineage): validators return `errors[]`; init's guard/validation should surface errors the same way, and adversarial/malformed-input tests are expected (memory: prior review found holes here).
- Exit codes via `process.exitCode`, never `process.exit(1)` (stdout-flush pitfall) — init must follow.
- `✓ …` success / `✗ <subject>: <message>` error output shape.
- Node stdlib only: `fs/promises` (`mkdir`, `writeFile`, `readdir`), no new deps.

### Integration Points
- New `init` branch in bin/motto.js subcommand dispatch (usage string currently `motto <lint|build>` — becomes `<init|lint|build>`; full `--help` is Phase 11, don't build it here).
- New `src/init.js` module alongside lint.js/build.js.
- New `test/init.test.js` + permanent scaffold-dogfood test (init → lint → build in temp dir) alongside `test/dogfood.test.js`.
- Contrast trap: the Motto repo's own `.gitignore` ignores all of `dist/`; the SCAFFOLDED `.gitignore` must ignore only `dist/private/` and keep `dist/public/` tracked (INIT-06).

</code_context>

<specifics>
## Specific Ideas

- Invalid-name error should read like: `✗ 'My Project' is not a valid name — try: motto init my-project` (rule + actionable suggestion).
- Refusal example shape: list first few offending entries, then `use --force to scaffold anyway`.

</specifics>

<deferred>
## Deferred Ideas

- **Skill-maker announcement in init output** — when the interactive skill-maker ships (AUTH-SKILL, backlog), `motto init` success output should announce it as a next step. Not now; next steps stay `motto lint` + `motto build`.

</deferred>

---

*Phase: 10-Project Scaffold (`motto init`)*
*Context gathered: 2026-07-02*
