---
phase: 12-docs-cleanup
reviewed: 2026-07-02T10:52:35Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - README.md
  - test/dogfood.test.js
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 12: Code Review Report (re-review after gap closure 12-03)

**Reviewed:** 2026-07-02T10:52:35Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found (all remaining findings are carried-forward pre-existing defects or Info items; no new Warning/Critical issues introduced by the 12-03 fixes)

## Narrative Findings (AI reviewer)

## Summary

Re-review of Phase 12 output after gap-closure plan 12-03 (commits `b078c8f`, `b437c84`, `c7b0b76`, `cf1aebe`). Cross-checked every README claim touched by the fixes against `src/init.js`, `src/config.js`, `src/schema.js`, `src/build.js`, `bin/motto.js`, `package.json`, `.claude-plugin/marketplace.json`, and live CLI/test runs.

**All three applied fixes are verified correct:**

1. **WR-02 fix (install one-liner) — CORRECT.** Both occurrences (README:164, README:226) now read `/plugin install <plugin>@<marketplace>`, and the prerequisite note (README:167) correctly defines `<marketplace>` as the `name` field of the scaffolded `.claude-plugin/marketplace.json`. Verified against `src/init.js:163` (`writeScaffold` sets `marketplace.json` top-level `name` to the validated project name) — the documented example `/plugin install my-project@my-project` is exactly what the scaffold produces.
2. **WR-04 fix (--force disclosure) — CORRECT.** README:89 now discloses that the five scaffold paths are overwritten. The listed paths (`motto.yaml`, `.gitignore`, `skills/hello-world/SKILL.md`, `shared/references/.gitkeep`, `.claude-plugin/marketplace.json`) match `writeScaffold` (src/init.js:127-180) exactly — five `writeFile` targets, no more, no fewer. "It never deletes files" remains accurate (plain `writeFile`, zero delete operations). The framing "under --force" is sound: without `--force` the empty-dir guard (src/init.js:223-237) rejects any directory where a scaffold path could pre-exist (the `.git`/`.DS_Store` allowlist never collides with scaffold paths).
3. **Stale skill-count fix — CORRECT.** README:129 example `✓ 2 skills OK` matches live output: ran `node bin/motto.js lint` at repo root → `✓ 2 skills OK`. `skills/` contains exactly `author-skill` (public) and `release` (private).

**test/dogfood.test.js is clean.** The diff in this range is exactly the count sync (3→2 at lines 35-42 and 80-88) plus removal of the two `setup-project` artifact assertions — consistent with the phase-12 deletion of `skills/setup-project`. All 9 tests pass live (`node --test test/dogfood.test.js` → pass 9, fail 0). Re-verified the adversarial angles: the `before` fail-fast throw still leaves `tempDir` assigned so the guarded `after` cleanup runs; `buildProject` is only ever pointed at the mkdtemp copy (never `REPO_ROOT`, whose `dist/` it would wipe); the NAME_KEBAB reference-identity assertion remains valid (`src/config.js:19` re-exports from `src/schema.js`).

**Other README claims spot-checked and confirmed accurate:** scaffolded `motto.yaml` snippet matches `src/init.js:144` byte-for-byte; scaffolded `.gitignore` ignores only `dist/private/` (src/init.js:152), so "commit `dist/public/`" (README:158) works; `plugins.private` "required when private skills exist" (README:84) is enforced at build time (src/build.js:135-138); the `npm version` claim (README:176) matches `package.json` `scripts.version` (bumps `motto.yaml` + git-adds it; npm handles `package.json` and the tag); `prepublishOnly` rebuilds via `node bin/motto.js build`; the marketplace section (README:240) matches `.claude-plugin/marketplace.json` (npm source, `skills: "./dist/public/"`); `/plugin install motto@motto` (README:247) matches marketplace name `motto` / plugin name `motto`.

Remaining findings below are carried forward from the prior review (77d5a10) or new Info-level observations.

## Warnings

### WR-01 (carried forward, pre-existing): README documents a reserved-word rule for `plugins.public` that the linter does not enforce

**File:** `README.md:83`
**Status:** NOT FIXED — ruled out-of-scope by the phase verifier as a pre-existing defect (the claim predates phase 12; the underlying gap is in `src/config.js`, not the docs edit). Carried forward so it is not lost.
**Issue:** The field table states `plugins.public` "must not contain `anthropic` or `claude`". Re-verified against current code: `src/config.js:87-102` validates plugin names against `NAME_KEBAB` only; the `RESERVED = ["anthropic", "claude"]` check (`src/schema.js:39,92`) applies exclusively to skill names inside `validateSkill`. Likewise `motto init` (src/init.js:206) validates the project name against `NAME_KEBAB` only, so `motto init claude-tools` succeeds and lint/build accept the resulting `plugins.public: claude-tools` — producing a plugin Claude Code's own naming rules reject.
**Fix:** Either correct the README row (reserved rule applies to skill `name` only) or apply the `RESERVED` substring check to `plugins.public`/`plugins.private` in `src/config.js` and to the effective name in `src/init.js` in a follow-up plan. The `src/schema.js:36` comment ("must not appear in skill or plugin names") suggests the code change was the original intent.

### WR-03 (carried forward, pre-existing): `/motto:release` slash command does not exist — `release` is a private skill in the `motto-private` plugin

**File:** `README.md:173` (also referenced at `README.md:182`)
**Status:** NOT FIXED — ruled out-of-scope by the phase verifier as a pre-existing defect. Carried forward.
**Issue:** "The `release` skill (`/motto:release`) carries the full maintainer checklist." Re-verified: `skills/release/SKILL.md` declares `audience: private`, routing it to `dist/private/` under plugin `motto-private` (motto.yaml `plugins.private`; asserted by test/dogfood.test.js:135). The marketplace distributes only `dist/public/`, so no install path yields `/motto:release`; if the private plugin were loaded locally the command would be `/motto-private:release`.
**Fix:** Reference the skill by its real access path, e.g. "The `release` skill (`skills/release/SKILL.md`, private — `/motto-private:release` when the private plugin is loaded locally) carries the full maintainer checklist."

## Info

### IN-01 (carried forward): Build-output example blends the `my-project` tutorial with Motto's own tree plus a fictional skill

**File:** `README.md:139-152`
**Issue:** Unchanged from the prior review: the reader scaffolds `my-project` with `hello-world`, but the `motto build` output example shows `author-skill` + `references/skill-schema.md` (Motto's real skill), `plugin.json` `"name": "motto"`, and a nonexistent `secret-skill`. Note the 12-03 skill-count fix made the section internally consistent (the `✓ 2 skills OK` example at line 129 matches the two skills shown in this tree), but the tree still matches neither the tutorial project nor Motto's actual repo.
**Fix:** Show the tutorial's actual output (`dist/public/hello-world/SKILL.md`, `"name": "my-project"`, no `dist/private/`), or label the tree "Motto's own build output, for illustration."

### IN-02 (carried forward): End-to-end step 3 wraps a Claude Code slash command in a `sh` code fence and assumes an uninstalled plugin

**File:** `README.md:201-204`
**Issue:** Unchanged from the prior review: step 3 uses a ```sh fence for `/motto:author-skill` (not a shell command — pasting it into a terminal fails), while steps 7-8 correctly use plain fences. At step 3 the reader has only installed the npm CLI; `/motto:author-skill` requires Motto's marketplace + plugin install, introduced only in later sections.
**Fix:** Change the fence to plain (matching steps 7-8) and add "requires Motto's skills installed — see [Install Motto's skills](#install-mottos-skills)."

### IN-03 (new): `<plugin>` is defined via `motto.yaml` `plugins.public`, but install resolution actually keys on the marketplace.json plugin entry name

**File:** `README.md:167`
**Issue:** The (otherwise correct) new prerequisite note says to substitute `<plugin>` with "the `plugins.public` name from your `motto.yaml`". What `/plugin install` actually resolves is the plugin entry `name` inside `.claude-plugin/marketplace.json`, which `motto init` sets equal to the project name (src/init.js:167) — identical to `plugins.public` in the scaffold default, so the instruction works as written. But `motto build` never regenerates `marketplace.json`: a user who later edits `plugins.public` in `motto.yaml` (renaming their plugin) gets a `plugin.json` in `dist/public/` whose name no longer matches the marketplace entry, and the documented substitution silently points at the wrong token. Low impact (scaffold defaults are in sync; the drift scenario requires a manual rename), which is why this is Info rather than Warning.
**Fix:** Tighten the note: "`<plugin>` is the plugin `name` in your `.claude-plugin/marketplace.json` — `motto init` sets it equal to `plugins.public`, so keep the two in sync if you rename your plugin."

---

_Reviewed: 2026-07-02T10:52:35Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
