---
phase: 25-v0-0-6-operator-debt-closure
reviewed: 2026-07-06T19:08:45Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - README.md
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 25: Code Review Report (Re-review after gap closure)

**Reviewed:** 2026-07-06T19:08:45Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Re-review of the phase's only source-file change: the plugin-cache caveat blockquote in README.md's "Add the marketplace to Claude Code" section (README.md:241). The prior 25-REVIEW.md flagged the caveat's primary refresh instruction (WR-01) and its lack of real-world validation (IN-01); plan 25-03 addressed both (commits `43fb37a` and `76c3df6`). This review verified the reworded text against the actual git diff (`601ddbd^..HEAD` touches only the two-line blockquote in README.md), against Claude Code's own CLI help output, and against the repo's `.claude-plugin/marketplace.json`.

The reword holds up:

- **Correct command is present and primary.** The caveat now leads with `claude plugin update motto@motto`. `claude plugin update --help` confirms this is the dedicated command: *"Update a plugin to the latest version (restart required to apply)"*. The `motto@motto` argument matches the manifest — plugin `name: "motto"` in marketplace `name: "motto"` — and matches the install command (`/plugin install motto@motto`) used elsewhere in the README.
- **Marketplace-add is no longer framed as a refresh mechanism.** The `/plugin marketplace add` re-run instruction (prior WR-01 point 1–3) is gone from the caveat entirely; `/plugin marketplace add jeremiewerner/motto` remains only in its correct role as the first-time registration step below the blockquote.
- **Reinstall fallback retained.** "(or uninstall and reinstall the plugin)" survives as the parenthetical fallback, exactly as the prior fix suggested.
- **Restart nuance present.** "then restart Claude Code to apply it" carries over the "restart required to apply" caveat from the CLI's own help text — this was explicitly requested in the prior WR-01 fix and was missing before.
- **Mechanism claim now attaches to the right command.** "to re-pull the current published tarball" now describes `plugin update`/reinstall, which genuinely pulls the npm tarball (`"source": "npm", "package": "@jeremiewerner/motto"`), not the marketplace manifest.

One deviation from the prior suggested fix: the reword uses the terminal form `claude plugin update motto@motto` rather than the suggested slash form `/plugin update motto@motto`. This is defensible — the terminal form is the one documented by `claude plugin --help` and the one the maintainer actually validated — but it introduces a small surface-mixing ambiguity, recorded as IN-01 below. Note also that `claude plugin update --help` documents its argument as bare `<plugin>` without mentioning the `plugin@marketplace` suffix; the exact `motto@motto` form was nonetheless exercised successfully in the stale-cache validation, so this is not flagged as a finding.

## Disposition of Prior Findings

### Prior WR-01 — Primary refresh instruction pointed at the wrong command: **RESOLVED**

Verified in the text at README.md:241 (commit `43fb37a`): the caveat leads with `claude plugin update motto@motto`; the misleading `/plugin marketplace add` re-run instruction is removed; the reinstall fallback is retained; the restart-required nuance is added. All four elements of the prior fix are present.

### Prior IN-01 — Refresh guidance never exercised against a real stale cache: **RESOLVED**

Verified via commit `76c3df6`: 25-REWALK.md gained an append-only "Stale-Cache Validation" section recording a maintainer-run reproduction — an installed `motto@motto` plugin genuinely lagging npm `latest` (0.0.6), `claude plugin update motto@motto` + restart, content confirmed refreshed, fallback not needed. This is a maintainer attestation rather than agent-observed output, but the record says so explicitly, consistent with the attestation style used elsewhere in the phase. The caveat's substantive behavioral claim is now verified, not just grep-present.

## Info

### IN-01: Caveat switches to terminal CLI syntax in a section otherwise driven by slash commands, without signaling the context switch

**File:** `README.md:241`
**Issue:** Every runnable command in the "Add the marketplace to Claude Code" / "Install Motto's skills" sections is a Claude Code in-session slash command (`/plugin marketplace add ...`, `/plugin install motto@motto`), while the caveat's remedy `claude plugin update motto@motto` is a terminal command. The prose says only "run `claude plugin update motto@motto`" — a reader working inside a Claude Code session (where the surrounding commands are typed) gets no cue that this one belongs in their shell instead. The `claude` binary prefix mitigates this, and the command itself is correct and validated, so this is informational only.
**Fix:** Add a two-word locator, e.g. "…missing or outdated, run `claude plugin update motto@motto` from your terminal (or uninstall and reinstall the plugin)…".

---

_Reviewed: 2026-07-06T19:08:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
