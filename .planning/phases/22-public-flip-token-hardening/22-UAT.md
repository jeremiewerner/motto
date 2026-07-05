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

### 2. Post-ship marketplace re-verification (blocked until v0.0.6 OIDC publish)

expected: After the v0.0.6 ship tag's first OIDC-authenticated publish, `/plugin marketplace add jeremiewerner/motto` + `/plugin install motto@motto` installs a plugin whose skill list shows `build-skill` (not the retired author-skill/setup-project). This is Step 9 item 4 in skills/release/SKILL.md.
result: skipped
reason: "Covered by release checklist Step 9 item 4 (skills/release/SKILL.md) — this check can only run after the v0.0.6 OIDC publish, which happens at ship, after phase completion. Pre-publish state verified as expected: marketplace.json sources the plugin from npm (@jeremiewerner/motto), npm latest is 0.0.3 whose tarball ships only author-skill + setup-project; 0.0.4/0.0.5 were never published (the pipeline failure this milestone fixes). User's 'still author skill and no build-skill' observation matches this, not a code issue. Enforced post-publish via the release skill."

## Summary

total: 2
passed: 1
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps
