---
status: testing
phase: 22-public-flip-token-hardening
source: [22-VERIFICATION.md]
started: 2026-07-05T20:05:00Z
updated: 2026-07-05T20:05:00Z
---

## Current Test

number: 1
name: Confirm npmjs.com Trusted Publisher record for @jeremiewerner/motto
expected: |
  Record exists exactly as attested in 22-03-SUMMARY.md: org=jeremiewerner,
  repo=motto, workflow=ci.yml, no environment, allowed action=npm publish.
  No CLI/API surface — only the maintainer can re-confirm in the npmjs.com web UI.
awaiting: user response

## Tests

### 1. Confirm the npmjs.com Trusted Publisher record

expected: Record for @jeremiewerner/motto shows org=jeremiewerner, repo=motto, workflow=ci.yml, no environment, allowed action=npm publish (as attested in 22-03-SUMMARY.md)
result: [pending]

### 2. Post-ship marketplace re-verification (blocked until v0.0.6 OIDC publish)

expected: After the v0.0.6 ship tag's first OIDC-authenticated publish, `/plugin marketplace add jeremiewerner/motto` + `/plugin install motto@motto` installs a plugin whose skill list shows `build-skill` (not the retired author-skill/setup-project). This is Step 9 item 4 in skills/release/SKILL.md.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 1

## Gaps
