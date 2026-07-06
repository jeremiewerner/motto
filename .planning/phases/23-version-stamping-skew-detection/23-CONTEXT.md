# Phase 23: Version Stamping & Skew Detection - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

`motto init` stamps the running tool's version into scaffolded `motto.yaml` as a `mottoVersion` field (distinct from the project `version` field). `motto lint`/`motto build` compare the stamp to the running tool's version and surface any skew as a direction-aware, never-throw advisory — exit code and `ok` untouched. Pre-stamp projects (Motto's own tree, magma) lint/build clean with no warning and no crash. Malformed stamps produce clean error entries, never a throw. Only `init` writes the stamp — `lint`/`build` never modify `motto.yaml`.

Covers VER-01..VER-06. The upgrade ledger itself is Phase 24; operator debt is Phase 25.

</domain>

<decisions>
## Implementation Decisions

### Locked upstream (REQUIREMENTS.md + ROADMAP.md — not re-litigated)
- **D-01:** Field name is `mottoVersion`, written only by `init` (VER-01, VER-06). Never-auto-restamp is guarded by test.
- **D-02:** Skew is a non-blocking warning — exit code and `ok` stay unchanged (VER-02).
- **D-03:** Skew message names both versions and gives a direction-specific remedy: tool newer than project → "check the upgrade ledger"; project newer than tool → "upgrade motto" (VER-03).
- **D-04:** Missing stamp = "unknown, assume compatible" — no warning, no crash (VER-04).
- **D-05:** Malformed stamp values (number, array, object, boolean, null, empty string, garbage string) produce clean error entries — never throw; adversarial tests mandatory per project never-throw invariant (VER-05).
- **D-06:** Zero new dependencies — hand-rolled ~10-line parse/compare, no `semver` package, no range syntax, no `check-version` subcommand, no hard error on skew (REQUIREMENTS.md Out of Scope table).

### Claude's Discretion
User explicitly declined discussion ("move on") — the following are Claude's to decide during research/planning, with research recommendations as the default:
- **Warning channel & result shape** — research recommends a new `warnings[]` array on lint/build results, rendered by `renderResult` to stderr as `⚠` lines independent of `ok`/`quiet`. Decide `--quiet` and `--format json` interplay; VER-F1 (structured `skew` JSON field) stays deferred.
- **Malformed-stamp severity & location** — VER-05's "clean error entries" wording implies `errors[]` (ok=false); decide whether that's config.js validation alongside other field checks or version.js, and confirm severity intent during planning.
- **Skew rule & message wording** — decide exact comparison semantics (parsed three-segment versions; how loose/prerelease shapes classify as malformed vs skew) and final message text. Wording matters: VER-F1 is deferred until magma validates the plain-text message.
- **Dogfood stamping** — research build-order item 7 (stamp Motto's own `motto.yaml`) vs roadmap success criterion 3 (Motto's own tree as living no-stamp fixture). Resolve during planning; do not break success criterion 3's testability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — VER-01..VER-06 definitions, Out of Scope table (anti-features: auto-restamp, semver dep, range syntax, check-version subcommand, hard error on skew), deferred VER-F1/VER-F2.
- `.planning/ROADMAP.md` §Phase 23 — goal + 5 success criteria (stamp distinct from `version`; direction-aware warning; pre-stamp clean; adversarial malformed-stamp tests; never-rewrite guard).

### Milestone research (completed 2026-07-06, HIGH confidence)
- `.planning/research/SUMMARY.md` — executive synthesis, build order (version.js → config.js → init.js → lint.js → build.js → bin/motto.js), 7 pitfalls.
- `.planning/research/ARCHITECTURE.md` — component boundaries and integration points, verified against v0.0.6 source by line number.
- `.planning/research/PITFALLS.md` — bootstrap/missing-stamp, malformed-stamp type-guarding, wrong-direction remedy, version-literal-in-tests brittleness.
- `.planning/research/STACK.md` — zero-new-deps verdict, `getOwnVersion()` via `fs.readFileSync` + `JSON.parse` of own package.json.
- `.planning/research/FEATURES.md` — prior-art grounding (Rails explicit stamp, Terraform direction-aware messaging).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/config.js` `loadConfig(text)` — pure never-throw validator; `plugins.private` optionality (CONF-03/D-17) is the exact pattern for optional `mottoVersion` parsing.
- `src/lint.js` `processConfig` — motto.yaml read + error labelling (`skill: 'motto.yaml'`) already centralized; skew check slots in after config load.
- `bin/motto.js` `renderResult(result, {format, quiet, successLine})` — shared lint/build rendering helper (Phase 19); the single place to add warnings output.
- `src/init.js` — motto.yaml scaffold template (inline string, ~line 145); stamp injection point.

### Established Patterns
- Never-throw is a boundary property (memory: recurred 5×) — adversarial tests + code review mandatory; type-guard before `.split` (Phase 18 typeof-guard precedent in `validateSkill`/`hasNonEmptyClosedSection`).
- Result shape `{ok, errors}` proven across 4 milestones; extension (warnings) must not disturb exit-code contract.
- TDD with husky pre-commit running suite against disk state; GREEN code in tree before RED/GREEN commits (Phase 19 precedent).
- Tests must not hardcode the current version string — read at test-run time, assert relationships (research Pitfall 6).

### Integration Points
- `src/version.js` (NEW, pure, zero dependents) → consumed by init.js (stamp) and lint.js/build.js (skew check).
- `bin/motto.js` renderResult → warnings rendering for both text and (decision pending) JSON formats.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user deferred all open implementation choices to Claude's discretion, anchored to the milestone research recommendations.

</specifics>

<deferred>
## Deferred Ideas

None new — discussion skipped. Standing deferrals (already in REQUIREMENTS.md/backlog, do not pull in): VER-F1 structured JSON skew field, VER-F2 severity-by-semver-distance, UPG-F1 `motto upgrade` command.

</deferred>

---

*Phase: 23-Version Stamping & Skew Detection*
*Context gathered: 2026-07-06*
