---
status: complete
phase: 22-public-flip-token-hardening
source: [22-VERIFICATION.md]
started: 2026-07-05T20:05:00Z
updated: 2026-07-05T20:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Confirm the npmjs.com Trusted Publisher record

expected: Record for @jeremiewerner/motto shows org=jeremiewerner, repo=motto, workflow=ci.yml, no environment, allowed action=npm publish (as attested in 22-03-SUMMARY.md)
result: pass

## Deferred to release checklist (not a UAT test — cannot run pre-ship)

**Post-ship marketplace re-verification.** After the v0.0.6 ship tag's first OIDC-authenticated publish, `/plugin marketplace add jeremiewerner/motto` + `/plugin install motto@motto` must install a plugin whose skill list shows `build-skill` (not the retired author-skill/setup-project). Enforced as Step 9 item 4 in skills/release/SKILL.md — it can only run after the ship that follows phase completion, so keeping it here as a test would deadlock phase advancement.

Pre-publish state was verified during this session as expected, not a code issue: marketplace.json sources the plugin from npm (@jeremiewerner/motto); npm latest is 0.0.3 whose tarball ships only author-skill + setup-project; 0.0.4/0.0.5 were never published (the pipeline failure this milestone fixes). The maintainer ran the marketplace install pre-publish and observed "still author skill and no build-skill", which matches this exactly.

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
