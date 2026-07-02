---
phase: 12-docs-cleanup
reviewed: 2026-07-02T10:24:06Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - README.md
  - test/dogfood.test.js
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-07-02T10:24:06Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the Phase 12 README rewrite and the synced dogfood test against the actual implementation (`src/init.js`, `src/config.js`, `src/schema.js`, `src/build.js`, `bin/motto.js`, `package.json`, `motto.yaml`, `.claude-plugin/marketplace.json`, and the live `skills/` tree).

**test/dogfood.test.js is clean.** The synced expectations match reality: `skills/` contains exactly 2 skills (`author-skill` public, `release` private), so `count=2`, `skillCount=2`, `bucketCount=2` are correct; `author-skill` declares `shared_references: [skill-schema]` and `shared/references/skill-schema.md` exists; the private plugin name `motto-private` matches `motto.yaml`; `NAME_KEBAB` is genuinely re-exported from `config.js` (line 19), so the identity assertion is valid; the `before`/`after` hooks are correctly guarded against partial setup.

**README.md contains four accuracy defects** where documented behavior diverges from what the CLI actually does or what will actually work for a reader following the instructions. Most of the scaffold documentation is accurate — the scaffolded `motto.yaml` snippet, the file tree, the `.gitignore` behavior enabling "commit dist/public/", the `npm version` script claim (verified against `package.json` `scripts.version`), and the `prepublishOnly` claim all check out.

## Warnings

### WR-01: README documents a reserved-word rule for `plugins.public` that the linter does not enforce

**File:** `README.md:83`
**Issue:** The field table states `plugins.public` "must not contain `anthropic` or `claude`". This is not true of the implementation: `src/config.js` validates plugin names against `NAME_KEBAB` only (lines 87-102) — the `RESERVED = ["anthropic", "claude"]` check in `src/schema.js:39` is applied exclusively to *skill* names inside `validateName`, never to `plugins.public`/`plugins.private`. Likewise `motto init` (src/init.js:206) validates the project name against `NAME_KEBAB` only, so `motto init claude-tools` succeeds and scaffolds `plugins.public: claude-tools`, which `motto lint` and `motto build` then accept — producing a plugin that Claude Code's own naming rules reject. A user reading this table believes the linter protects them; it does not.
**Fix:** Either (a) correct the README row to say the reserved-word rule applies to skill `name` fields only and is *recommended* for plugin names, or (b) file the real fix: apply the `RESERVED` substring check to `plugins.public`/`plugins.private` in `src/config.js` and to the effective name in `src/init.js` (the schema.js comment at line 36 — "must not appear in skill or plugin names" — suggests this was the original intent). If (b) is chosen, the README is correct as written but the code change belongs in a follow-up plan.

### WR-02: `/plugin install <plugin>@<repo>` — the suffix is the marketplace name, not the GitHub repo

**File:** `README.md:164` (also `README.md:226`)
**Issue:** The "Ship your plugin" section (and end-to-end step 8) instructs consumers to run `/plugin install <plugin>@<repo>`, with the prerequisite note defining `<repo>` as the GitHub repository. In Claude Code, the token after `@` is the **marketplace name** — the `name` field of `.claude-plugin/marketplace.json` — which `motto init` sets to the *project name* (src/init.js:163, `name` key), not the repo name. For a project named `my-project` hosted in repo `owner/skills-repo`, the documented command `/plugin install my-project@skills-repo` fails; the working command is `/plugin install my-project@my-project`. The instruction only works by coincidence when the repo happens to share the project's name (as with `motto@motto`).
**Fix:** Change both occurrences to `/plugin install <plugin>@<marketplace>` and update the prerequisite note: "`<marketplace>` is the `name` field from your scaffolded `.claude-plugin/marketplace.json` — `motto init` sets it to your project name, so for a project named `my-project` the command is `/plugin install my-project@my-project`."

### WR-03: `/motto:release` slash command does not exist — `release` is a private skill in the `motto-private` plugin

**File:** `README.md:173`
**Issue:** The "Publish to npm" section says "The `release` skill (`/motto:release`) carries the full maintainer checklist." `skills/release/SKILL.md` declares `audience: private`, so the build routes it to `dist/private/` under plugin name `motto-private` (verified in `motto.yaml` `plugins.private` and asserted by the dogfood test itself at test/dogfood.test.js:135). The marketplace only distributes `dist/public/` (marketplace.json `skills: "./dist/public/"`), so no installation path produces a `/motto:release` command: if the private plugin were loaded at all, the command would be `/motto-private:release`. A maintainer following this doc runs a command that doesn't resolve.
**Fix:** Reference the skill by its real access path, e.g.: "The `release` skill (`skills/release/SKILL.md`, private — available as `/motto-private:release` when the private plugin is loaded locally) carries the full maintainer checklist."

### WR-04: `--force` description conceals that scaffold writes overwrite existing files

**File:** `README.md:89`
**Issue:** The README states: "`--force`: lets `motto init` write into a non-empty directory. It never deletes existing files; it only skips the empty-directory check." The second sentence is misleading about data loss: `writeScaffold` (src/init.js:127-180) uses plain `writeFile`, which **overwrites** any existing `motto.yaml`, `.gitignore`, `skills/hello-world/SKILL.md`, `shared/references/.gitkeep`, and `.claude-plugin/marketplace.json`. A user with an existing `motto.yaml` who runs `motto init --force` loses its content. The CLI's own help text is honest about this ("overwrite scaffold files in a non-empty directory", bin/motto.js:63); the README's "only skips the check" framing is not.
**Fix:** Reword: "`--force` lets `motto init` write into a non-empty directory. It never deletes files, but the five scaffold paths (`motto.yaml`, `.gitignore`, `skills/hello-world/SKILL.md`, `shared/references/.gitkeep`, `.claude-plugin/marketplace.json`) are **overwritten** if they already exist."

## Info

### IN-01: Build-output example silently switches from the `my-project` tutorial to Motto's own tree plus a fictional skill

**File:** `README.md:139-152`
**Issue:** The reader has been building `my-project` (scaffolded with `hello-world`) since the "Scaffold a project" section, but the `motto build` output example shows `author-skill` with `references/skill-schema.md` (Motto's real public skill), `plugin.json` with `"name": "motto"`, and a private skill `secret-skill` that exists nowhere. Three different projects are blended in one tree; a tutorial-follower's actual output (`hello-world`, `"name": "my-project"`, no `private/` bucket) matches none of it.
**Fix:** Show the output the tutorial actually produces (`dist/public/hello-world/SKILL.md`, `"name": "my-project"`, no `dist/private/` since the scaffold declares no private skills), or explicitly label the tree as "Motto's own build output, for illustration."

### IN-02: End-to-end step 3 wraps a Claude Code slash command in a `sh` code fence and assumes an uninstalled plugin

**File:** `README.md:201-204`
**Issue:** Step 3 (` ```sh ` fence) contains `/motto:author-skill`, which is not a shell command — pasting it into a terminal fails. Steps 7-8 correctly use plain fences for slash commands. Additionally, at step 3 the reader has only installed the npm CLI (step 1); `/motto:author-skill` requires `/plugin marketplace add jeremiewerner/motto` + `/plugin install motto@motto`, which the README only introduces in later sections — the example's own steps 7-8 add the reader's *own* marketplace, not Motto's.
**Fix:** Change the fence from `sh` to plain (matching steps 7-8) and add a pointer: "requires Motto's skills installed — see [Install Motto's skills](#install-mottos-skills)."

---

_Reviewed: 2026-07-02T10:24:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
