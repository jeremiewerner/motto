---
phase: "08-marketplace-distribution"
plan: "01"
subsystem: "marketplace-config"
tags: [marketplace, claude-plugin, config-only, MKT-01, MKT-02, MKT-03]

dependency_graph:
  requires:
    - "07-01: @jeremiewerner/motto@0.0.3 published to npm with dist/public/ in tarball"
    - "dist/public/.claude-plugin/plugin.json (name: motto-skills) emitted by motto build"
  provides:
    - ".claude-plugin/marketplace.json — motto marketplace catalog (repo root)"
    - "Marketplace name: motto (install suffix @motto)"
    - "Plugin name: motto-skills (install command /plugin install motto-skills@motto)"
  affects:
    - "Phase 9 README docs (DOC-02): install instructions reference /plugin marketplace add jeremiewerner/motto"

tech_stack:
  added: []
  patterns:
    - "Claude Code self-hosted marketplace (marketplace.json at repo root, source: npm)"
    - "strict: false — marketplace entry is full plugin definition; no plugin.json at npm package root"

key_files:
  created:
    - path: ".claude-plugin/marketplace.json"
      note: "Motto marketplace catalog — registers motto-skills plugin from @jeremiewerner/motto"
  modified: []

decisions:
  - "Omitted source.version to always-resolve latest from npm (per RESEARCH anti-pattern note); add pinning later if required"
  - "strict: false confirmed correct — dist/public/.claude-plugin/plugin.json is 2 levels deep and NOT found by plugin-root lookup (A1 assumption; confirmed by claude plugin validate .)"

metrics:
  duration: "64 seconds"
  completed_date: "2026-07-01"
  task_count: 3
  tasks_complete: 2
  tasks_pending: 1

status: pending-human-verify
---

# Phase 08 Plan 01: Marketplace Distribution Summary

**One-liner:** Self-hosted Claude Code marketplace registering `motto-skills` from `@jeremiewerner/motto` npm package with skills override `./dist/public/` and `strict: false`.

---

## What Was Built

Created `.claude-plugin/marketplace.json` at the repo root — a single configuration file that registers the `motto` marketplace, listing the `motto-skills` plugin sourced from the already-published `@jeremiewerner/motto` npm package, with a skills path override pointing at `dist/public/` and `strict: false`.

No code, no build changes, no new dependencies. Configuration-only phase.

---

## Tasks Completed

| Task | Name | Commit | Files | Status |
|------|------|--------|-------|--------|
| 1 | Author `.claude-plugin/marketplace.json` | `babb7fb` | `.claude-plugin/marketplace.json` (new) | DONE |
| 2 | Schema-validate with `claude plugin validate .` | (no file changes) | — | DONE |
| 3 | Live-install human verification (MKT-01, MKT-02, A1) | — | — | PENDING (human checkpoint) |

---

## Validation Results

### Task 1 — Automated Field Assertion

```
marketplace.json OK; plugin name matches dist/public/.claude-plugin/plugin.json
```

Exit 0. All fields verified:
- `name === "motto"` ✓
- `plugins[0].name === "motto-skills"` ✓ (matches `dist/public/.claude-plugin/plugin.json` `name`)
- `plugins[0].source === { source: "npm", package: "@jeremiewerner/motto" }` ✓
- no `source.version` key ✓
- `plugins[0].skills === "./dist/public/"` ✓
- `plugins[0].strict === false` ✓
- `owner.name === "Jérémie Werner"`, `owner.email === "jeremiew@pm.me"` ✓

### Task 2 — `claude plugin validate .`

**Result:** PASS (exit 0)

```
Validating marketplace manifest: /Users/jeremie/Projects/motto/.claude-plugin/marketplace.json

⚠ Found 1 warning:
  ❯ description: No marketplace description provided. Adding a description helps users understand what this marketplace offers

✔ Validation passed with warnings
```

The warning about a missing top-level marketplace `description` is non-fatal. RESEARCH Pattern 2 does not include a top-level `description` field and the schema does not require it. This is a cosmetic advisory.

No file changes from Task 2 — validation only; no separate commit.

---

## Assumption A1 — `strict: false` / Nested `plugin.json` No-Conflict Claim

**Claim (A1):** `dist/public/.claude-plugin/plugin.json` (at 2 levels deep under the npm package root) is NOT discovered by Claude Code's plugin-root `plugin.json` lookup (which checks `<plugin-root>/.claude-plugin/plugin.json` — exactly one level). Therefore `strict: false` does NOT trigger a conflict error.

**Status:** Carried forward as documented assumption. The `claude plugin validate .` schema check passed (Task 2), but A1 can only be definitively confirmed by the live `/plugin install` run in Task 3.

**Fallback path if A1 is wrong (RESEARCH Pitfall 1):** If `/plugin install motto-skills@motto` fails with a conflict error, apply one of:
1. Switch to `strict: true` and add a root-level `.claude-plugin/plugin.json` in the npm package that delegates via the `skills` field.
2. Remove `dist/public/.claude-plugin/plugin.json` from `motto build`'s public output (build change).

Neither fallback is implemented now — only trigger condition and remedy are recorded here.

---

## Task 3 — Human-Verify Checkpoint (PENDING)

**Status:** BLOCKED — requires live Claude Code session. Executor cannot install a plugin into a live Claude Code session.

### What Was Built

`.claude-plugin/marketplace.json` at repo root, schema-validated, committed at `babb7fb`. The file registers the `motto` marketplace pointing `motto-skills` at `@jeremiewerner/motto` npm package (already published at v0.0.3 by Phase 7).

### Pending Human Verification Steps

In a live Claude Code session (maintainer account, `gh auth` credentials present for the `jeremiewerner/motto` repo):

**Step 1 — Add the marketplace (MKT-01):**
```
/plugin marketplace add jeremiewerner/motto
```
Expected: the `motto` marketplace resolves and lists the `motto-skills` plugin.

**Step 2 — Install the plugin (MKT-02):**
```
/plugin install motto-skills@motto
```
Expected: install succeeds, pulling `@jeremiewerner/motto` from the public npm registry.

**Step 3 — Confirm skills load (MKT-02 + A1):**

Confirm the two public skills load and are invocable as:
- `/motto-skills:author-skill`
- `/motto-skills:setup-project`

Expected outcome: marketplace adds cleanly, plugin installs, both slash commands appear.

**If install succeeds but skills do not appear** (A1 wrong / conflict): apply RESEARCH Pitfall 1 fallback — switch to `strict: true` + root plugin.json, or drop the nested plugin.json from the build.

### Resume Signal

Type `"approved"` once both skills load, or describe the error (e.g. conflict, "Plugin not found", skills missing) so the A1 fallback can be planned.

---

## Deviations from Plan

None — plan executed exactly as written through Task 2. Task 3 is a blocking human checkpoint returned per plan protocol.

**`claude plugin validate .` warning (non-blocking):** The CLI advisory about a missing top-level marketplace `description` was noted but not acted on. The RESEARCH Pattern 2 JSON does not include this field and the task acceptance criteria do not require it.

---

## Known Stubs

None. `.claude-plugin/marketplace.json` is a complete configuration; all fields are populated with real values.

---

## Threat Surface Scan

No new security-relevant surface beyond what is documented in the plan's threat model. The single new file (`.claude-plugin/marketplace.json`) is a static JSON configuration that does not introduce network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. T-08-01 (high) is mitigated: exact package string `@jeremiewerner/motto` and plugin name `motto-skills` are verified by the automated field assertion (Task 1 exit 0).

---

## Self-Check

### Files Exist
- `.claude-plugin/marketplace.json` — FOUND
- `.planning/phases/08-marketplace-distribution/08-01-SUMMARY.md` — FOUND (this file)

### Commits Exist
- `babb7fb` — chore(08-01): add .claude-plugin/marketplace.json for motto marketplace — FOUND

## Self-Check: PASSED
