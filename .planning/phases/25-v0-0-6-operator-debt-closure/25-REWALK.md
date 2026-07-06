# Phase 25: Stranger Re-Walk — DEBT-06 Evidence Record

This file is the committed record required by DEBT-06 (public marketplace install path
proven for a stranger against npm `latest` = 0.0.6, with `build-skill` visible and the
retired `author-skill`/`setup-project` absent, verified by diffing actual installed
plugin content against source — not by trusting `/plugin` cache status). It contains no
credential values, only structured metadata (command run, result, date), mirroring the
leak-safe record shape of `25-TOKEN-LOCKDOWN.md`.

## Precondition — npm `latest` = 0.0.6 (agent-verified)

- **Command run:** `npm view @jeremiewerner/motto version`
- **Result:** `0.0.6`; dist-tags `{ latest: '0.0.6' }`.
- **Date:** 2026-07-06 (recorded during the first session of this plan, prior to the
  checkpoint).

## Checklist Result — Maintainer Attestation

The remaining checklist items require a genuinely stranger-like environment (a
logged-out browser session and a clean shell) that cannot be simulated by the agent.
The maintainer walked the checklist and approved the checkpoint using the offered pass
form: "approved — build-skill installs and installed content matches source" is recorded
here as the maintainer's attestation, per the same attestation style used in
`25-TOKEN-LOCKDOWN.md` for DEBT-07/DEBT-08 (no raw command output was pasted back by the
maintainer; this is a maintainer attestation, not agent-observed output).

**1. Clean Claude Code session — marketplace add + install:**

- **Action:** `/plugin marketplace add jeremiewerner/motto` followed by
  `/plugin install motto@motto`, run in a clean Claude Code session.
- **Result:** Both commands succeeded.
- **Attestation:** Maintainer-confirmed, 2026-07-06.

**2. Skill list — build-skill present, retired skills absent:**

- **Result:** `build-skill` appears in Claude Code's skill list. The retired
  `author-skill` and `setup-project` do not appear. No skill invocation was performed
  (distribution-path check only, per D-05) — this is presence/absence in the skill list,
  not a behavioral test.
- **Attestation:** Maintainer-confirmed, 2026-07-06.

**3. Content diff — installed plugin directory vs. source-built-from-tag:**

- **Method (per plan):** locate the installed plugin directory in Claude Code's plugin
  cache; rebuild `dist/public/` from the released `v0.0.6` tag
  (`git checkout v0.0.6 && node bin/motto.js build`); `diff -r` the installed plugin's
  skill content against that freshly rebuilt `dist/public/`.
- **Result:** Match — no differences reported between the installed plugin content and
  `dist/public/` rebuilt from the `v0.0.6` tag.
- **Attestation:** Maintainer-confirmed, 2026-07-06. Cache status alone was explicitly
  NOT used as proof of this pass — the pass condition is the content diff match recorded
  above, per DEBT-06's wording and this plan's acceptance criteria.

## Outcome

- **No defect found.** All checklist items passed on the first walkthrough.
- **No patch release was required** — the D-02 contingency (cutting a patch release for
  a defective published 0.0.6 tarball) did not trigger.
- **No `NPM_TOKEN` was re-minted or referenced** anywhere in this record or during this
  walkthrough, consistent with D-04.

## DEBT-06 Status

**Closed.** The public marketplace install path is proven for a stranger against npm
`latest` = 0.0.6: `build-skill` is visible, the retired `author-skill`/`setup-project`
are absent, and the installed content matches source-built-from-the-released-tag by
explicit content diff (not cache-status trust). The README's plugin-cache caveat (Task 1
of this plan) is now live documentation for any stranger who hits a stale cache in the
future.
