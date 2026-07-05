---
status: partial
phase: 22-public-flip-token-hardening
source: [22-VERIFICATION.md]
started: 2026-07-05T20:05:00Z
updated: 2026-07-05T20:45:00Z
---

## Current Test

[testing paused — 1 item outstanding: test 2 blocked until v0.0.6 OIDC publish]

## Tests

### 1. Confirm the npmjs.com Trusted Publisher record

expected: Record for @jeremiewerner/motto shows org=jeremiewerner, repo=motto, workflow=ci.yml, no environment, allowed action=npm publish (as attested in 22-03-SUMMARY.md)
result: pass

### 2. Post-ship marketplace re-verification (blocked until v0.0.6 OIDC publish)

expected: After the v0.0.6 ship tag's first OIDC-authenticated publish, `/plugin marketplace add jeremiewerner/motto` + `/plugin install motto@motto` installs a plugin whose skill list shows `build-skill` (not the retired author-skill/setup-project). This is Step 9 item 4 in skills/release/SKILL.md.
result: blocked
blocked_by: release-build
reason: "User ran the marketplace install now and reported: 'still author skill and no build-skill'. Verified expected pre-publish state, not a code issue: marketplace.json sources the plugin from npm (@jeremiewerner/motto), npm latest is 0.0.3 whose tarball ships only author-skill + setup-project (confirmed via dist.tarball listing). v0.0.6 OIDC publish has not happened (no v0.0.6 tag; 0.0.4/0.0.5 were never published — the publish-pipeline failure this milestone fixes). Re-run this test after the v0.0.6 ship publishes to npm."

## Summary

total: 2
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps
