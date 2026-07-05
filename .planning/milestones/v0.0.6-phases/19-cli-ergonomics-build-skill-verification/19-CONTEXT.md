# Phase 19: CLI Ergonomics & Build-Skill Verification - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Motto's CLI gains machine-readable, pipe-safe output that later CI phases can assert against — `--quiet`, `--format json`, and a clean stderr/stdout split — implemented entirely in the presentation layer (`bin/motto.js`); the never-throw core (`src/schema.js`, `src/lint.js`, `src/build.js`) is untouched. Separately, `build-skill` is proven end-to-end on one real skill, closing the v0.0.5 human-verify debt (BSKL-01 gap-fill, BSKL-05 quality gate, WR-01 name-recovery). Requirements: CLIX-01, CLIX-02, CLIX-03, BSKV-01.

</domain>

<decisions>
## Implementation Decisions

### JSON document shape (CLIX-02)
- **D-01:** `--format json` serializes the **verbatim result object** the core already returns — `JSON.stringify` of `{ok, count}` (lint success), `{ok, outDir, skillCount, bucketCount}` (build success), `{ok, errors}` (failure). No envelope, no added keys, zero mapping code. CI asserts on `.ok`/`.errors` directly.
- **D-02:** Output is **compact single-line JSON + trailing newline** (no pretty-print).
- **D-03:** `--format json` is **lint/build only**. `motto init --format json` is an unknown-option error (flag not registered for init). YAGNI — no machine consumer of init exists.
- **D-04:** Pre-dispatch failures (bad `[path]` guard, e.g. `motto lint ./nope --format json`) stay **plain text on stderr, empty stdout, exit 1**. The JSON contract is: *if a result exists, stdout carries exactly one JSON document*. No synthesized JSON error shape for failures the core never produced.

### stderr/stdout split (CLIX-03)
- **D-05:** All `✗` error lines move to **stderr** in every mode — human and json alike. Only results stay on stdout. Breaking change for stdout-pipers accepted (pre-1.0).
- **D-06:** The success line (`✓ N skills OK` / `✓ built dist …`) is **progress, not a result**: `--quiet` suppresses it entirely — silent stdout + exit 0 is the success signal (grep/make convention). Without `--quiet` it prints to stdout as today.
- **D-07:** **init follows the same split** — its `✗` failure lines move to stderr too (mechanical change; init results/scaffold tree stay on stdout). One stream contract across all three commands.

### Flag interactions (CLIX-01/02)
- **D-08:** `--quiet` and `--format json` are **orthogonal**; combining them is legal. `--format json` owns stdout (the JSON doc is the result and always prints); `--quiet` silences human progress, of which json mode has none. No special-case code, never suppress the JSON doc (preserves "exactly one JSON document").
- **D-09:** In json mode with failures, errors live **only in the JSON doc on stdout** — no duplicate human `✗` echo to stderr. One source of truth (ESLint/ShellCheck precedent).
- **D-10:** Unsupported `--format` value (e.g. `--format yaml`) errors in the **existing D-05 unknown-flag shape**: `✗ unknown format 'yaml'` + usage line + hint → stderr, exit 1, command not run. `parseArgs` takes `--format` as `type: 'string'`; value validated at dispatch.
- **D-11:** Accepted values: `--format json | text` — `text` is the explicit-default alias so CI can be explicit. Both `--quiet` and `--format` are **lint/build-only**; init rejects them as unknown options.

### BSKV-01 verification protocol
- **D-12:** The live proof authors a **real skill Motto's own `skills/` tree genuinely wants**, from the operator's freeform input; it ships if it passes lint. Topic chosen at execution time. Highest-fidelity dogfood — not a disposable sandbox skill.
- **D-13:** All three observation targets are **staged deliberately** in the freeform input: leave gaps (BSKL-01 gap-fill), include one thin/hollow section prompt (BSKL-05 quality gate), give an invalid working name like "My Claude Helper" (WR-01 name-recovery). Opportunistic runs can silently miss paths and leave the debt open.
- **D-14:** Findings recorded in **`19-BSKV-FINDINGS.md` in the phase dir**: per-target expected-vs-observed, divergence verdict (fixed inline / ticketed / conforms). Divergences too large to fix in-phase go to STATE.md pending todos. Verify-phase checks the file exists and covers all three targets.
- **D-15:** The run executes as an **in-phase human-in-the-loop checkpoint task**: the plan pauses at a checkpoint, the operator invokes `/build-skill` live with the staged input, findings are written as observed. The run happens inside phase execution — never documented-as-done without a real run (memory: gsd-verify-side-effect-claims).

### Claude's Discretion
- Exact flag plumbing inside `bin/motto.js` (where the format/quiet branches sit relative to existing help/path-guard routing).
- Test structure for the new CLI behaviors (existing `node --test` conventions).
- Wording of the `✗ unknown format` message, provided it mirrors the D-05 shape.
- Candidate topics for the BSKV-01 skill, proposed at execution checkpoint for operator pick.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone research (v0.0.6)
- `.planning/research/SUMMARY.md` — zero-new-deps verdict, phase ordering rationale, Pitfall 7 (stdout/stderr) callout
- `.planning/research/ARCHITECTURE.md` — `--format json` threading through the presentation layer; never-throw core boundary
- `.planning/research/PITFALLS.md` — Pitfall 7 (`--format json` mixed with human text breaks parsing) prevention detail

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — CLIX-01/02/03 + BSKV-01 exact wording; Out of Scope list (no severity model, no new deps)
- `.planning/ROADMAP.md` — Phase 19 goal + success criteria; Phase 20 dependency (pack-E2E consumes these flags)

### build-skill (BSKV-01 targets)
- `skills/build-skill/SKILL.md` — the skill under verification; BSKL-01/BSKL-05/WR-01 behaviors defined here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/motto.js` — sole presentation layer; all changes land here. Already has: `parseCliArgs()` with `strict: true` unknown-flag handling in D-05 shape, `checkTargetDir()` path guard writing to stderr, per-subcommand help routing.
- `USAGE_LINE`/`UNKNOWN_HINT`/per-command HELP constants — help text must gain `--quiet`/`--format` entries for lint/build.

### Established Patterns
- **Exit codes via `process.exitCode`, never `process.exit()`** — preserves stream flush on async-pipe platforms (Pitfall 7 half of the fix already in place).
- **Errors currently write to stdout** in lint/build/init dispatch (`process.stdout.write('✗ …')`) — this is the exact conflation CLIX-03 removes.
- **Never-throw boundary:** core returns `{ok, …}` result objects; the CLI only formats them. All Phase 19 CLI work is formatting.
- Unknown command/flag errors already go to stderr — the new unknown-format error joins that convention.

### Integration Points
- Phase 20's pack-install E2E and dogfood CI jobs will assert against `--quiet` (silent stdout + exit 0) and `--format json` (parse stdout, check `.ok`) — these decisions are consumed contracts, not internal details.
- `test/` — existing 213 tests include CLI-level tests; new flag behaviors need coverage there (stdout/stderr capture assertions).

</code_context>

<specifics>
## Specific Ideas

- `--quiet` success = **silence + exit 0**, deliberately following the grep/make Unix convention.
- JSON mode follows the **ESLint/ShellCheck precedent**: machine doc on stdout, no duplicated human rendering.
- BSKV-01 staged input should read as one honest freeform brief that *happens* to contain gaps, one hollow section, and a bad working name — not three artificial mini-tests.

</specifics>

<deferred>
## Deferred Ideas

- `--format json` line/column positions from yaml parser errors — already in REQUIREMENTS.md Future (v2+).
- init `--quiet`/`--format` support — rejected for now (D-03/D-11); revisit only when a machine consumer of init appears.

</deferred>

---

*Phase: 19-CLI Ergonomics & Build-Skill Verification*
*Context gathered: 2026-07-03*
