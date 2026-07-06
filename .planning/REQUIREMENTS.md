# Requirements: Motto — Milestone v0.0.7 Version Awareness

**Defined:** 2026-07-06
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Milestone trigger:** magma — the first real end-user project scaffolded with `motto init` — exists; v0.0.5's `<role>` hard break would have stranded it with zero guidance.

## v0.0.7 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Version Awareness (VER)

- [ ] **VER-01**: `motto init` stamps the running motto version into scaffolded `motto.yaml` (`mottoVersion` field — distinct from the existing project `version` field, which flows into `plugin.json`)
- [ ] **VER-02**: `motto lint`/`motto build` compare the project's stamped version to the running tool's version and report skew as a non-blocking warning (exit code and `ok` untouched)
- [ ] **VER-03**: The skew message is direction-aware — names both versions and gives a direction-specific remedy (tool newer than project → "check the upgrade ledger"; project newer than tool → "upgrade motto")
- [ ] **VER-04**: A project with no stamp (pre-v0.0.7: magma, Motto's own tree) is treated as "unknown, assume compatible" — no warning, no crash
- [ ] **VER-05**: Malformed stamp values (number, array, object, boolean, null, empty string, garbage string) produce clean error entries — never throw (adversarial tests mandatory per project never-throw invariant)
- [ ] **VER-06**: Only `init` writes the stamp — `lint`/`build` never modify `motto.yaml` (never-auto-restamp, guarded by test)

### Upgrade-Path Policy (UPG)

- [ ] **UPG-01**: A breaking-change ledger exists with per-version upgrade steps, seeded retroactively with the v0.0.5 `<role>` migration and a v0.0.7 entry telling existing projects how to adopt the stamp
- [ ] **UPG-02**: The standing upgrade-path constraint is operational — a documented process requires every future structure/schema change to add a ledger entry before ship

### Debt Closure (DEBT — continues from v0.0.4's DEBT-05)

- [ ] **DEBT-06**: Marketplace stranger re-walk passes against npm `latest` = 0.0.6 (`/plugin marketplace add jeremiewerner/motto` → install → build-skill visible); Claude Code plugin-cache caveat documented
- [ ] **DEBT-07**: npm granular token revoked on npmjs.com + `gh secret delete NPM_TOKEN` (release Step 9 follow-through)
- [ ] **DEBT-08**: npm publishing locked to trusted-publisher-only on npmjs.com

## Future Requirements

Deferred to a later milestone. Tracked but not in the current roadmap.

### Version Awareness (deferred until magma validates the prose message)

- **VER-F1**: `--format json` gains a structured skew field (`{skew: {projectVersion, toolVersion, direction}}`)
- **VER-F2**: Severity keyed to semver distance / documented breaking boundary (patch/minor quiet, breaking loud) — needs a second real break to calibrate

### Upgrade Mechanism

- **UPG-F1**: `motto upgrade` command that walks a project across schema breaks — deferred (YAGNI) until the first real post-stamp schema break demands it; detection (this milestone) is its prerequisite signal

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-update the stamp silently (build/lint restamp) | Anti-feature — destroys the "verified against" signal the stamp exists to carry; contradicts all credible prior art (Rails, Terraform) |
| Semver range/constraint syntax in `motto.yaml` | One first-party CLI, one stamp, one comparison; a range parser adds complexity + would pull a dep |
| `motto check-version` subcommand | Skew must be caught for free in commands users already run (lint/build); a fourth verb adds a habit nobody will form |
| `semver` npm package | ~10-line regex + integer comparison covers the need; single-dep (`yaml`) constraint stands |
| Hard error on any skew | Motto lints markdown, not infrastructure state; crying wolf on patch bumps trains users to ignore the warning (npm lockfileVersion fatigue) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VER-01 | — | Pending |
| VER-02 | — | Pending |
| VER-03 | — | Pending |
| VER-04 | — | Pending |
| VER-05 | — | Pending |
| VER-06 | — | Pending |
| UPG-01 | — | Pending |
| UPG-02 | — | Pending |
| DEBT-06 | — | Pending |
| DEBT-07 | — | Pending |
| DEBT-08 | — | Pending |

**Coverage:**
- v0.0.7 requirements: 11 total
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 11 ⚠️ (expected — roadmap not yet created)

---
*Requirements defined: 2026-07-06*
*Last updated: 2026-07-06 after initial definition*
