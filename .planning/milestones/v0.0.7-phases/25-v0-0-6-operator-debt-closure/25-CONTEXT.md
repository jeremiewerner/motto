# Phase 25: v0.0.6 Operator Debt Closure - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

The v0.0.6 ship's three deferred operator loose ends are closed and verified against reality: the marketplace install path works for a stranger against npm `latest` = 0.0.6 with `build-skill` visible, verified by diffing actual installed plugin content against source (not trusting cache status) and with the Claude Code plugin-cache caveat documented (DEBT-06); the granular npm token is revoked on npmjs.com and `NPM_TOKEN` deleted from GitHub secrets, confirmed absent (DEBT-07); npm publishing for `@jeremiewerner/motto` is locked to trusted-publisher-only on npmjs.com (DEBT-08).

Pure operator checkpoint — no `src/` code changes expected. Most actions happen on npmjs.com / GitHub settings / a Claude Code session and are recorded, not coded. `skills/release/SKILL.md` Step 10 already prescribes the DEBT-07/08 procedure verbatim; this phase executes it and records the evidence.

</domain>

<decisions>
## Implementation Decisions

### Failure handling (discussed this session)
- **D-01:** Re-walk failure (build-skill missing, install path broken) → **diagnose + fix in-phase**. The phase goal is "closed and verified against reality"; a broken install path means the debt is NOT closed. The phase stays open until the re-walk passes. No routing to a separate gap phase.
- **D-02:** If the defect lives in the published 0.0.6 tarball itself → **cut a patch release in-phase** via the release skill (bump → tag → CI OIDC publish). DEBT-06 only closes when a stranger install against npm `latest` shows build-skill; a wrong tarball has no other real fix. The patch publish doubles as live proof of the trusted-publisher lock.
- **D-03:** Sequencing = **lock first, re-walk after**: DEBT-07 (revoke + secret delete) and DEBT-08 (trusted-publisher-only lock) execute immediately — Step 10 has been overdue since the 2026-07-05 OIDC publish. The re-walk runs after. If a patch release is then needed, it publishes through the locked config, proving it works.
- **D-04:** If the lock breaks publishing (patch release fails in CI on npm auth) → **fix the Trusted Publisher config on npmjs.com and re-run the failed job; NEVER re-mint a token**. Matches release skill Step 8 item 4. Zero-tokens is structural — worst case is a delayed publish, never a credential regression.

### Carried forward from Phase 22 (locked, do not re-litigate)
- **D-05 (was 22/D-10):** Marketplace leg depth = add + install + skills visible in Claude Code's skill list. No skill invocation — skill behavior is already verified; this proves the distribution path only. Phase 25 adds the content-diff requirement on top (DEBT-06 wording: diff installed plugin content against source, don't trust cache status).
- **D-06 (was 22/D-15):** Token revocation = revoke granular token on npmjs.com AND `gh secret delete NPM_TOKEN`, both recorded — never record the token value itself.
- **D-07 (was 22/D-16):** npm-side enforcement = package publishing access set to trusted-publisher-only (tokens disallowed) so zero-tokens is structurally enforced.
- **D-08 (was 22/D-05 precedent):** Recording style = leak-safe committed record: exact commands, results, dates — never secret values.

### Claude's Discretion
- **Stranger re-walk protocol** — how literal "stranger" is (fresh Claude Code profile vs cache-cleared session) and what exactly gets diffed (installed plugin dir vs `dist/public` rebuilt from the v0.0.6 tag vs npm tarball contents). Anchor to DEBT-06's wording: diff actual installed content against source; do not trust cache status.
- **Cache caveat home** — where the Claude Code plugin-cache caveat is documented (README install section vs phase artifact vs elsewhere). Weigh discoverability for end users against doc sprawl; README's marketplace install section is the natural candidate since that's where a stranger hits the cache behavior.
- **Evidence & recording detail** — exact artifact shape proving DEBT-07/08 (phase-dir record file à la 22-SECRETS-SCAN.md, PROJECT.md row, or both) and which verification commands count (`gh secret list`, `npm view @jeremiewerner/motto --json` attestations/access checks).
- **Operator-checkpoint structure** — how plans split between agent-verifiable steps and human checkpoint steps (Phase 21-03 / Phase 22 operator-checkpoint pattern).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — DEBT-06..08 exact wording (lines 27-29); traceability table maps all three to Phase 25.
- `.planning/ROADMAP.md` §Phase 25 — goal + 3 success criteria (stranger re-walk with content diff + cache caveat; token revoked + secret confirmed absent; trusted-publisher-only lock).

### The prescribed procedure this phase executes
- `skills/release/SKILL.md` Step 10 ("Zero-Tokens Follow-Through") — the exact DEBT-07/08 runbook: revoke token, `gh secret delete`, npm-side trusted-publisher-only lock, provenance verification via `npm view --json`. Run-once step, triggered by the 2026-07-05 v0.0.6 OIDC publish.
- `skills/release/SKILL.md` Step 8 item 4 — never-re-mint-token recovery stance (D-04's source).

### Phase 22 outputs this phase builds on
- `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-CONTEXT.md` — D-10/D-15/D-16/D-17 (walkthrough depth, token death, npm-side lock, provenance-via-registry) — the locked decisions Phase 25 executes.
- `.planning/milestones/v0.0.6-phases/22-public-flip-token-hardening/22-UAT.md` — "Deferred to release checklist" section: why the re-walk was deferred (npm latest was 0.0.3 pre-ship; maintainer observed author-skill-only install, expected at the time) — the baseline the re-walk must now beat.

### Install-path source of truth
- `.claude-plugin/marketplace.json` — plugin sources from npm `@jeremiewerner/motto`, skills at `./dist/public/`; the config the stranger path exercises.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `skills/release/SKILL.md` Step 10 — verbatim runbook for DEBT-07/08; the phase records its execution rather than re-designing it.
- Phase 22 operator-checkpoint pattern (22-03/22-04 plans) — human-action checkpoints with recorded results; reuse for npmjs.com/GitHub settings actions agents cannot perform.
- `22-SECRETS-SCAN.md` — leak-safe record shape (command, version, result, never values) to copy for the token-revocation/lock record.
- CI pack-E2E job — already proves tarball → init → lint → build every push; the re-walk only covers what CI can't (live marketplace add/install in a real Claude Code session).

### Established Patterns
- Never-re-tag, never-re-mint-token runbook discipline (release skill Steps 8/10).
- Operator actions recorded as committed phase artifacts, leak-safe.
- v0.0.6 published 2026-07-05 via tag-triggered OIDC with provenance — the trusted-publisher config already works; DEBT-08 locks it as the only path.

### Integration Points
- npmjs.com package settings (`@jeremiewerner/motto`) — token revoke + publishing-access lock (operator).
- GitHub repo secrets — `NPM_TOKEN` deletion, verified via `gh secret list` (agent-verifiable).
- Claude Code plugin system — `/plugin marketplace add jeremiewerner/motto` → install → skill list; plugin cache dir is where the content diff happens.
- If patch release needed: standard release skill flow (bump → tag → CI publish) exercising the locked trusted-publisher path.

</code_context>

<specifics>
## Specific Ideas

- The patch-release contingency (D-02) is also a feature: it live-tests DEBT-08's lock under real conditions. If it happens, record it as the lock's proof.
- Phase 22 UAT already predicted exactly what the pre-ship install showed (author-skill only, npm at 0.0.3) — the re-walk's pass condition is the inverse: build-skill present, retired skills absent.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 25-v0.0.6 Operator Debt Closure*
*Context gathered: 2026-07-06*
