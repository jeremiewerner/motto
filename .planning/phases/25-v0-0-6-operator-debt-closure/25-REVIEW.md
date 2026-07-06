---
phase: 25-v0-0-6-operator-debt-closure
reviewed: 2026-07-06T18:12:26Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - README.md
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-07-06T18:12:26Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Scope is the single source-file change of Phase 25: the plugin-cache caveat blockquote added to README.md's "Add the marketplace to Claude Code" section (commit `1e457e3`, README.md:241). The review checked (a) factual accuracy of the caveat against the repo's actual marketplace configuration and against Claude Code's own plugin CLI surface, (b) consistency with the surrounding install instructions, and (c) markdown integrity.

What holds up:

- **"Re-pull the current published tarball" is consistent with the marketplace source.** `.claude-plugin/marketplace.json` declares `"source": { "source": "npm", "package": "@jeremiewerner/motto" }`, so framing staleness in terms of the published npm tarball is accurate for this marketplace.
- **Markdown and structure are clean.** The new blockquote is a proper sibling to the existing `> **Prerequisite:**` callout (blank line between them; renders as two separate blockquotes). No TOC entries, anchors, or links were affected; the grep-verifiable literal `plugin cache` is present as the plan required. The edit is strictly scoped to the two added lines — no unrelated prose was touched.
- **Caveat framing is accurate.** Claude Code does cache installed plugin content locally, and an installed plugin genuinely can lag the latest published npm version — the first sentence of the note is correct.

What does not hold up: the caveat's **primary remediation instruction** — re-running `/plugin marketplace add` — very likely does not do what the note claims, and Claude Code's dedicated refresh command is not mentioned at all. Details below.

## Warnings

### WR-01: Primary refresh instruction points at the wrong command; the dedicated `/plugin update` command is omitted

**File:** `README.md:241`
**Issue:** The caveat instructs: *"re-run `/plugin marketplace add jeremiewerner/motto` (or reinstall the plugin) to force Claude Code to re-pull the current published tarball."* Three problems with the primary instruction:

1. **Marketplace add operates on the marketplace manifest, not on installed plugin content.** Claude Code's CLI has a dedicated command for exactly this situation — `claude plugin update <plugin>`: *"Update a plugin to the latest version (restart required to apply)"* — plus `claude plugin marketplace update [name]` for refreshing marketplace metadata. The `marketplace add` help makes no claim of refreshing anything; adding a marketplace registers its manifest and does not re-pull already-installed plugin tarballs.
2. **For this specific marketplace, re-adding cannot even signal that a refresh is needed.** The plugin entry in `.claude-plugin/marketplace.json` is an unpinned npm source (`"package": "@jeremiewerner/motto"`, no version field). The manifest is byte-identical before and after an npm release, so re-fetching the marketplace carries zero information about a new tarball. The exact scenario the caveat targets — "not reflecting the latest published npm version" — is the scenario where marketplace re-add is a no-op.
3. **The "force ... to re-pull the current published tarball" mechanism claim attaches to the marketplace-add instruction**, which is the part least likely to trigger a tarball pull. Only the parenthetical fallback ("or reinstall the plugin") reliably does what the sentence claims.

A stranger with a stale plugin who follows the primary instruction will most likely see no change and conclude the docs are wrong — which is the exact failure DEBT-06's caveat exists to prevent. The working fallback in the parenthetical is what keeps this at Warning rather than Critical.

**Fix:** Lead with the plugin-level update, keep reinstall as the fallback, drop the marketplace-add instruction (or demote it to the marketplace-metadata case). Also carry over the "restart required" nuance from the CLI's own help text:

```markdown
> **Note:** Claude Code caches installed plugin content locally, so an already-installed plugin can appear stale — not reflecting the latest published npm version — until the plugin cache is refreshed. If a skill you expect to see is missing or outdated, run `/plugin update motto@motto` (or uninstall and reinstall the plugin) to re-pull the current published tarball, then restart Claude Code to apply it.
```

## Info

### IN-01: The refresh instruction was never exercised by the phase's own verification

**File:** `README.md:241` (evidence: `.planning/phases/25-v0-0-6-operator-debt-closure/25-REWALK.md`)
**Issue:** The stranger re-walk that closed DEBT-06 was performed in a **clean** Claude Code session (fresh `marketplace add` + `install`, per 25-REWALK.md items 1–3). No stale-cache scenario was reproduced, so the caveat's refresh guidance — the one behavioral claim the added text makes — was never observed working. The plan's automated check only verified the literal string `plugin cache` exists in README.md, which validates presence, not correctness. This is the recurring tests-green-but-broken shape: the grep gate passes while the substantive claim is unverified.
**Fix:** When the WR-01 rewording lands, validate it once against reality: with 0.0.6 installed, publish/observe the next release, confirm the plugin shows stale content, run the documented command(s), and confirm the skill content refreshes. Record the observation (a one-line addendum to 25-REWALK.md or the next phase's UAT is sufficient).

---

_Reviewed: 2026-07-06T18:12:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
