# Phase 22: Public Flip & Token Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 22-public-flip-token-hardening
**Areas discussed:** .planning/ visibility, Secrets scan protocol, Stranger verification + public pass, OIDC migration + proof publish

---

## .planning/ visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Public as-is | Keep .planning/ tracked and visible; zero git surgery, tags stay valid | ✓ |
| History rewrite | git filter-repo purge; every SHA changes, tags recreated | |
| Stop tracking forward | Keep history, gitignore going forward | |

**User's choice:** Public as-is (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| PROJECT.md Key Decisions | One row in the existing Key Decisions table | ✓ |
| Dedicated flip record | Single committed doc: scan result + decision + flip timestamp | |
| CONTEXT.md is enough | This discussion file is the record | |

**User's choice:** PROJECT.md Key Decisions (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted sweep | Grep for emails/tokens/URLs + human skim of high-risk files | ✓ |
| gitleaks only | Trust the secrets scan; prose accepted as-is | |
| Full agent audit | Agent reads all 190 tracked .planning/ files | |

**User's choice:** Targeted sweep (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Tree + history grep | Skim current files + one mechanical git log -p PII pass | ✓ |
| Working tree only | Accept whatever prose sits in old commits | |

**User's choice:** Tree + history grep (Recommended)

---

## Secrets scan protocol

| Option | Description | Selected |
|--------|-------------|----------|
| Summary record | Command, version, HEAD SHA, exit code, per-hit triage — never matched values | ✓ |
| Raw report artifact | gitleaks JSON — embeds secret values on any hit | |
| Prose note in SUMMARY | One line in phase SUMMARY.md | |

**User's choice:** Summary record (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Rotate only | Dead value stays in history; no filter-repo | ✓ |
| Rotate + purge | Rewrite history to remove the value | |
| Decide per hit | Triage each hit at flip time | |

**User's choice:** Rotate only (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Triage in record only | No config file unless FP volume demands it | ✓ |
| Commit .gitleaks.toml | Allowlist FPs for reproducible clean rescans | |

**User's choice:** Triage in record only (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Rescan as final pre-flip step | Recorded HEAD SHA = flipped HEAD | ✓ |
| Single scan is fine | Accept small unscanned trailing window | |

**User's choice:** Rescan as final pre-flip step (Recommended)

---

## Stranger verification + public pass

| Option | Description | Selected |
|--------|-------------|----------|
| Manual checklist walkthrough | Logged-out browser + clean shell; results recorded per item | ✓ |
| Scripted + manual hybrid | URL 200-check script + human marketplace leg | |
| Full clean-machine run | Fresh VM, README top-to-bottom | |

**User's choice:** Manual checklist walkthrough (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Badges + accuracy fixes | CI + npm badges; fix walkthrough findings in-phase | ✓ |
| Badges only | Findings become tickets | |
| Fuller public polish | + contributing section / issue templates / topics | |

**User's choice:** Badges + accuracy fixes (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into flip step | main requires PRs + green CI checks, done at flip | ✓ |
| Defer to backlog | Solo maintainer; revisit with second contributor | |
| Minimal protection | Force-push/deletion guard only | |

**User's choice:** Fold into flip step (Recommended) — honors Phase 20 D-03 promise

| Option | Description | Selected |
|--------|-------------|----------|
| Add + install + loads | Skills appear in Claude Code's skill list | ✓ |
| Add + install only | Stop at successful install | |
| Full skill invocation | Also invoke an installed skill live | |

**User's choice:** Add + install + loads (Recommended)

---

## OIDC migration + proof publish

| Option | Description | Selected |
|--------|-------------|----------|
| v0.0.6 ship itself | Milestone release tag is the live proof; zero extra versions | ✓ |
| Pre-release proof tag | v0.0.6-rc.1 through OIDC before ship | |
| 0.0.5 catch-up via OIDC | Tag v0.0.5 now — mislabels v0.0.6-content tree | |

**User's choice:** v0.0.6 ship itself (Recommended) — 0.0.5 catch-up formally abandoned

| Option | Description | Selected |
|--------|-------------|----------|
| After first OIDC publish | Token fallback through ship; then revoke + delete, recorded | ✓ |
| At OIDC config time | Hard cutover, no fallback for ship publish | |

**User's choice:** After first OIDC publish (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — disallow tokens | npm package set to trusted-publisher-only | ✓ |
| GitHub-side only | Revoke + delete secret; npm settings default | |

**User's choice:** Yes — disallow tokens (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Registry check | Provenance badge/attestation on npmjs.com, recorded | ✓ |
| Full audit signatures | npm audit signatures in consumer context | |
| Trust the green job | No post-check | |

**User's choice:** Registry check (Recommended)

---

## Claude's Discretion

- Flip-step sequencing and operator-checkpoint structure (user declined further discussion — planner sequences within locked decisions)
- ci.yml OIDC edit mechanics (id-token permission, NODE_AUTH_TOKEN removal, --provenance placement)
- Walkthrough checklist wording; prose-sweep grep patterns; badge markdown/placement

## Deferred Ideas

- Fuller public polish (contributing section, issue templates, repo topics) — future milestone
- .gitleaks.toml allowlist — only on real FP volume
