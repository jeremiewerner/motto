---
phase: 24-upgrade-path-ledger-policy
reviewed: 2026-07-06T11:53:28Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - UPGRADING.md
  - src/version.js
  - test/version.test.js
  - test/lint.test.js
  - test/cli.test.js
  - test/build.test.js
  - test/upgrading-ledger.test.js
  - skills/release/SKILL.md
  - .claude/CLAUDE.md
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
fix_status: all_fixed
fixed_at: 2026-07-06T12:00:12Z
---

# Phase 24: Code Review Report

**Reviewed:** 2026-07-06T11:53:28Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 24 added the UPGRADING.md breaking-change ledger, repointed the `checkSkew()` warning remedy at UPGRADING.md, added a ledger backstop test, inserted a Ledger Gate step into the release skill, and synced an upgrade-path constraint into `.claude/CLAUDE.md`.

Most of the phase holds up under verification:

- **Never-throw invariant intact:** the only change to `src/version.js` is the message string on line 101. No `throw`, no `try/catch`, no I/O was introduced into `parseVersion()`/`checkSkew()`; they remain pure string-in/object-out. `getOwnVersion()` is unchanged.
- **Wording lockstep confirmed:** the new `check UPGRADING.md` wording appears in exactly one source location (`src/version.js:101`) and is pinned consistently by all six test assertions (`test/version.test.js:106,122`, `test/cli.test.js:466,478`, `test/lint.test.js:848,889`, `test/build.test.js:548`). A repo-wide grep finds zero stale `check the upgrade ledger` references outside `.planning/`. Full suite passes: 293/293.
- **Factual claims verified:** `npm view @jeremiewerner/motto versions` returns `['0.0.3', '0.0.6']`, confirming UPGRADING.md's claim that 0.0.4/0.0.5 never shipped. No nonexistent CLI options are referenced (`motto --version` does not appear; `npm ls` / `npm ls -g` are real commands; `motto lint`/`motto build` match `bin/motto.js`'s actual usage surface). The v0.0.5 entry's missing-role / empty-role / inert-bold-line claims match `src/schema.js:443-461` exactly. The v0.0.7 entry's "silently skip when unstamped" claim matches `checkSkew()` returning null for an absent stamp. The example `motto.yaml` shape (`plugins: public:`) matches the real schema.
- **Backstop test sound:** `test/upgrading-ledger.test.js` anchors REPO_ROOT via `import.meta.url` (not cwd), and its deliberately-minimal scope is documented in-file.

However, the phase's headline deliverable — the **blocking** Ledger Gate — is broken by construction: as sequenced in the release skill, its diff command always resolves to an empty range, so the gate can never fire. One stale step-number cross-reference also survived the renumbering.

## Critical Issues

### CR-01: Ledger Gate diff is always empty — the gate can never block

**Status:** fixed (51ddacf) — Ledger Gate reordered to Step 2, before the version bump; diff base is now the previous release tag.
**File:** `skills/release/SKILL.md:64-81` (interacts with `skills/release/SKILL.md:31-48`)
**Issue:** Step 4 (Ledger Gate) instructs:

```
git diff $(git describe --tags --abbrev=0)..HEAD -- src/schema.js src/templates.js src/config.js src/init.js
```

But Step 2 (`npm version X.Y.Z`) has already run by this point, and — as Step 2's own point 4 documents — it "Creates git tag `vX.Y.Z`" on HEAD. When HEAD itself carries the new tag, `git describe --tags --abbrev=0` resolves to that just-created tag, so the command diffs `vX.Y.Z..HEAD` — an empty range, every time, regardless of what changed since the *previous* release. The "blocking" gate is vacuous: it will report a clean diff on every release, including one that guts the schema.

Two secondary inconsistencies follow from the same ordering: (a) `success_criteria` (line 183) claims the gate "blocks tag/push", but by Step 4 the tag already exists — it can at best block push; (b) if the gate *did* fire post-tag, Step 8 point 1 ("Do NOT delete or recreate the git tag") leaves the maintainer with a permanent tag on a release that must not ship as-is.

**Fix:** Run the Ledger Gate **before** the version bump, while `git describe --tags --abbrev=0` still resolves to the previous release tag. Move the gate to Step 2 and shift Version Bump/Dogfood to Steps 3-4 (updating the "do NOT proceed to the Push step" phrasing to "do NOT proceed to the Version Bump step"). Alternatively, keep the position and resolve the previous tag explicitly:

```
git diff $(git describe --tags --abbrev=0 HEAD^)..HEAD -- src/schema.js src/templates.js src/config.js src/init.js
```

(`HEAD^` is safe here because Step 2 creates exactly one release commit.) Reordering is the cleaner fix — it also restores the `success_criteria` claim that the gate blocks the *tag*, not just the push.

## Warnings

### WR-01: Stale step reference — "Step 8 (Post-Release Housekeeping)" now points at the failure runbook

**Status:** fixed (51ddacf) — reference corrected to Step 9; full step-number sweep done as part of the CR-01 reorder.
**File:** `skills/release/SKILL.md:121`
**Issue:** Step 7 ends with "Only proceed to Step 8 (Post-Release Housekeeping) once all three confirm." After the Ledger Gate insertion renumbered Steps 4-9 to 5-10, Post-Release Housekeeping is **Step 9**; Step 8 is now "If CI Publish Fails". Every other cross-reference was updated in lockstep (lines 102, 131, 150, 159, 189) — this one was missed. An agent executing the skill literally is told to proceed to the failure-recovery runbook after a successful release; the parenthetical contradicts the number, and conflicting instructions in a procedure skill are exactly what the renumbering was supposed to prevent.
**Fix:** Change line 121 to: `Only proceed to Step 9 (Post-Release Housekeeping) once all three confirm.`

### WR-02: Ledger Gate file list omits `src/build.js` — dist-layout breaks (explicitly in the gate's scope) never trigger the diff

**Status:** fixed (fe0628b) — `src/build.js` and `src/frontmatter.js` added to the pathspec, snapshot-list rationale, and success_criteria.
**File:** `skills/release/SKILL.md:69-72,79`
**Issue:** The gate's scope statement (line 79) includes "dist layout consumers depend on" as a breaking-change category, and "a change that makes a previously-passing project fail lint/build." But the diff pathspec covers only `src/schema.js src/templates.js src/config.js src/init.js`. Dist layout is produced by `src/build.js`, and lint-relevant frontmatter extraction lives in `src/frontmatter.js` — neither is in the list, so a breaking change in either produces an empty gate diff and never prompts the ledger verdict. The doc defends the list against *future* drift ("a future maintainer adding a new schema-adjacent file should add it"), but this is a day-one gap: files already in scope per the gate's own definition are missing from the mechanical trigger. The human-verdict backstop mitigates, but the mechanical check is the reason the gate exists.
**Fix:** Extend the pathspec to cover the files that define the in-scope behaviors:

```
git diff $(git describe --tags --abbrev=0)..HEAD -- src/schema.js src/templates.js src/config.js src/init.js src/build.js src/frontmatter.js
```

and update the snapshot-list sentence on line 72 and `success_criteria` line 183 to match.

## Info

### IN-01: CLAUDE.md constraint bullet drifts from its PROJECT.md source — regeneration would lose the Ledger Gate pointer

**Status:** fixed (dbc6dfd) — PROJECT.md source updated to canonical wording (with Ledger Gate pointer); CLAUDE.md managed-block bullet now byte-identical.
**File:** `.claude/CLAUDE.md:17` (vs `.planning/PROJECT.md:142`)
**Issue:** The bullet sits inside the GSD-managed block (before `<!-- GSD:project-end -->`), but its wording differs from the PROJECT.md constraint it mirrors: CLAUDE.md says "any change ... breaking changes need an `UPGRADING.md` entry — see the release skill's Ledger Gate"; PROJECT.md says "every change ... Hard breaks without a path — like v0.0.5's `<role>` migration — are no longer acceptable now that real consumer projects (magma) exist." If GSD regenerates the managed block from PROJECT.md, the UPGRADING.md/Ledger Gate pointer silently disappears.
**Fix:** Align the two — add the "breaking changes need an `UPGRADING.md` entry — see the release skill's Ledger Gate" clause to PROJECT.md's constraint bullet so a block regeneration is lossless.

### IN-02: "crosses both entries below on its way to 0.0.6+" is imprecise

**Status:** fixed (7741cb0) — intro now says the v0.0.5 entry applies on the way to 0.0.6 and the v0.0.7 entry when moving to 0.0.7+.
**File:** `UPGRADING.md:5-7`
**Issue:** A project upgrading from 0.0.3 to exactly 0.0.6 crosses only the v0.0.5 entry; the v0.0.7 `mottoVersion` entry applies from 0.0.7 onward. "Both entries ... on its way to 0.0.6+" overstates it for the 0.0.6 target. Low stakes since the v0.0.7 entry is explicitly opt-in ("Nothing breaks"), but the intro is the ledger's navigation aid and should be exact.
**Fix:** Reword to e.g. "…so a project coming from 0.0.3 crosses the v0.0.5 entry on its way to 0.0.6, and the v0.0.7 entry when it moves to 0.0.7+."

---

_Reviewed: 2026-07-06T11:53:28Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
