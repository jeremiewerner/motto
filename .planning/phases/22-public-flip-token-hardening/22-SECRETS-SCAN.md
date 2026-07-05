# Phase 22: Secrets Scan & PII Sweep Record

This file is the committed, leak-safe record required by OPEN-01 (full-history secrets
scan) and OPEN-02 (`.planning/` visibility decision support). It never contains raw
gitleaks JSON output or any matched secret text — only structured metadata (tool
version, commit SHA, counts, rule IDs, file paths).

## Scan #1 — Triage

This is the **first** of two scans (D-08): it runs early in the phase to give the
maintainer triage lead time on any finding. The **final** gate scan runs in plan 22-04,
at the literal pre-flip HEAD, and is the one that must be clean for the flip to proceed.

- **Command:** `gitleaks git . --report-format json --report-path <scratch-tmp-path> --exit-code 0`
- **gitleaks version:** 8.30.1
- **HEAD SHA scanned:** `1b1814c66fa001733b4ff8a3c7b7eb4edfe651aa`
- **Commits scanned:** 405
- **Exit code:** 0
- **Findings count:** 0

No findings. The raw JSON report (`[]`) was written to the session scratch directory
(never under the repo tree), inspected, and deleted immediately after confirming an
empty findings array — no report file was ever staged or committed.

## PII Sweep

Beyond gitleaks (which scans diff *content*, not commit *metadata* — see Pitfall 2 in
22-RESEARCH.md), a mechanical PII sweep was run across the full history and working
tree per D-03/D-04. Three passes, run from the repo root:

### Pass 1 — commit author/committer metadata

Command: `git log --all --format='%ae|%ce' | sort -u`

Distinct pairs returned:

```
jeremie@studiometa.fr|jeremie@studiometa.fr
jeremie@studiometa.fr|noreply@github.com
```

Distinct addresses: `jeremie@studiometa.fr`, `noreply@github.com`.

**`jeremie@studiometa.fr` — explicit finding requiring maintainer acceptance, not a fix.**
This is the git-config author/committer email used for the large majority of commits
across the repo's history. It is **invisible to gitleaks** (Task 1's scan), because
gitleaks walks diff content, not commit headers — a full-history "clean" gitleaks result
does not mean this address is absent from the public history. It is **distinct** from
`jeremiew@pm.me`, the address already deliberately public in
`.claude-plugin/marketplace.json`'s `owner.email` field. D-01/D-06 already reject a
history rewrite to remove or scrub it (no filter-repo purge, no surgery), so the only
real disposition is **informed maintainer acceptance**: this address will become
publicly attributed to nearly every commit once the repo flips. This finding feeds
directly into the PROJECT.md Key Decisions row (Task 3), so the acceptance is recorded,
not silently absorbed.

`noreply@github.com` requires no disposition — it is GitHub's own placeholder address
for commits made through GitHub's web UI/API by an account with email privacy enabled;
it identifies no individual and carries no PII.

### Pass 2 — working-tree grep (`.planning/`, email patterns)

Command: `grep -rEn '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' .planning/ --include='*.md'`

Distinct addresses found in the current working tree of `.planning/`:

- `jeremiew@pm.me` — found in `.claude-plugin/marketplace.json`'s already-intentional
  `owner.email` field (referenced from `.planning/phases/22-public-flip-token-hardening/22-01-PLAN.md`)
  and in this phase's own PLAN/RESEARCH prose discussing this sweep. Already
  intentionally public; no disposition needed.
- `jeremie@studiometa.fr` — appears only inside this phase's own PLAN.md/RESEARCH.md
  prose (documenting this exact finding, e.g. Pitfall 2), not as a fresh independent
  occurrence elsewhere in `.planning/`. Same disposition as Pass 1: informed maintainer
  acceptance, no fix, no purge.
- `you@example.com` — found in `.planning/research/STACK.md` as a **placeholder default
  value** in an illustrative code snippet (`readGitConfig('user.email') || 'you@example.com'`),
  not a real address belonging to anyone. No disposition needed.

No other email or internal-URL-looking pattern was found in `.planning/`'s working tree.

### Pass 3 — diff-content history grep

Command: `git log -p --all | grep -Eo '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' | sort -u`

This pass catches emails that only ever appeared inside diff content (file additions/
changes), as opposed to commit headers (Pass 1) or the current working tree (Pass 2).

Distinct results:

- `jeremie@studiometa.fr` — same disposition as Pass 1/2 (informed maintainer
  acceptance).
- `jeremiew@pm.me` — same disposition as Pass 2 (already intentionally public).
- `noreply@github.com` — same disposition as Pass 1 (GitHub placeholder, no PII).
- `noreply@anthropic.com` — Anthropic's own placeholder address used in
  `Co-Authored-By: Claude <noreply@anthropic.com>` commit trailers from AI-assisted
  commits; identifies no individual, same disposition class as `noreply@github.com`. No
  action needed.
- `-@motto.yaml`, `+@package.json` — grep artifacts from unified-diff hunk lines (e.g.
  `--- a/motto.yaml`), not email addresses; the pattern's `[A-Za-z0-9._%+-]+@` matched a
  path fragment, not PII. No disposition needed.

No new distinct personal address was found in diff content beyond what Passes 1 and 2
already identified.

### Disposition summary

| Address | Source pass(es) | Already public? | Disposition |
|---|---|---|---|
| `jeremiew@pm.me` | 2, 3 | Yes — `.claude-plugin/marketplace.json` `owner.email` | No action; already an intentional public identity |
| `noreply@github.com` | 1, 3 | N/A (GitHub placeholder, no PII) | No action; identifies no individual |
| `noreply@anthropic.com` | 3 | N/A (Anthropic placeholder, no PII) | No action; identifies no individual |
| `you@example.com` | 2 | N/A (placeholder in an illustrative code snippet) | No action; not a real address |
| `jeremie@studiometa.fr` | 1, 2, 3 | No | **Accept as-is** (D-01/D-06 forbid history rewrite); surfaced to the maintainer in PROJECT.md's Key Decisions row (Task 3) for informed, recorded acceptance |

## Scan #2 — Final (pre-flip)

This is the **second and final** of the two scans required by D-08. It runs as the
literal last pre-flip step — no content-changing commit lands between this scan and
the visibility flip in this plan's Task 2. The HEAD SHA recorded below is the exact
HEAD SHA that Task 2 flips to public.

- **Command:** `gitleaks git . --report-format json --report-path <scratch-tmp-path> --exit-code 0`
- **gitleaks version:** 8.30.1
- **HEAD SHA scanned:** `e85c410a6e239bcc2582232bd776d363994735d8`
- **Commits scanned:** 415
- **Exit code:** 0
- **Findings count:** 0

No findings. The raw JSON report (`[]`) was written to the session scratch directory
(never under the repo tree), inspected, and deleted immediately after confirming an
empty findings array — no report file was ever staged or committed.

This HEAD SHA (`e85c410a6e239bcc2582232bd776d363994735d8`) is the one Task 2 flips to
public. No further content-changing commit will be made between this scan and the
flip.
