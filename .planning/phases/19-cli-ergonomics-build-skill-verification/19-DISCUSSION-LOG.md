# Phase 19: CLI Ergonomics & Build-Skill Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 19-CLI Ergonomics & Build-Skill Verification
**Areas discussed:** JSON document shape, stderr/stdout split, Flag interactions, BSKV-01 protocol

---

## JSON document shape

| Option | Description | Selected |
|--------|-------------|----------|
| Verbatim result | JSON.stringify the exact object lint/build already return; zero mapping code, zero drift | ✓ |
| Normalized envelope | Stable {command, ok, errors, …} wrapper — uniform but invents a new shape | |
| Verbatim + command key | Verbatim result plus a 'command' discriminator | |

| Option | Description | Selected |
|--------|-------------|----------|
| Compact + newline | Single line, trailing \n — standard machine output | ✓ |
| Pretty (2-space indent) | Human-friendlier, noisier in CI logs | |

| Option | Description | Selected |
|--------|-------------|----------|
| lint/build only | init --format json → unknown-option error; no machine consumer exists (YAGNI) | ✓ |
| All three commands | Uniform surface, more code for a nonexistent consumer | |
| init accepted-but-ignored | Silent flag-swallowing hides typos | |

| Option | Description | Selected |
|--------|-------------|----------|
| stderr text, empty stdout | Guard failures stay plain stderr text; JSON contract = "if a result exists, stdout is exactly one JSON doc" | ✓ |
| Synthesize JSON error doc | stdout always has a doc, but invents an error shape the core never produced | |

**User's choice:** Verbatim result, compact+newline, lint/build only, guard failures stay stderr-text.

---

## stderr/stdout split

| Option | Description | Selected |
|--------|-------------|----------|
| Errors → stderr everywhere | All '✗' lines to stderr in every mode; classic Unix contract; breaking change accepted pre-1.0 | ✓ |
| Errors → stderr only in json mode | Two inconsistent contracts; CLIX-03 says fixed, not worked around | |

| Option | Description | Selected |
|--------|-------------|----------|
| Success line is progress | --quiet silences it; exit 0 is the success signal (grep/make convention) | ✓ |
| Success line is result | Survives --quiet — but then --quiet is a no-op, failing CLIX-01 intent | |

| Option | Description | Selected |
|--------|-------------|----------|
| init follows same split | One stream contract for init/lint/build; mechanical 3-line change | ✓ |
| init untouched | Scope discipline, but leaves a documented inconsistency | |

**User's choice:** All '✗' → stderr everywhere (init included); success line killed by --quiet.
**Notes:** Fourth question skipped — usage/unknown-command errors already on stderr; --quiet never suppressing errors is locked by CLIX-01 itself.

---

## Flag interactions

| Option | Description | Selected |
|--------|-------------|----------|
| Orthogonal | json owns stdout (doc always prints); --quiet silences human progress only; no special-case code | ✓ |
| quiet wins | Suppresses JSON success doc — breaks "exactly one JSON document" | |
| Reject combination | Arbitrary rule, more code | |

| Option | Description | Selected |
|--------|-------------|----------|
| JSON only, no echo | Errors live in the JSON doc; stderr silent; ESLint/ShellCheck precedent | ✓ |
| Echo '✗' to stderr too | Readable in terminals but duplicates output, second code path | |

| Option | Description | Selected |
|--------|-------------|----------|
| Error, mirror D-05 shape | '✗ unknown format' + usage + hint → stderr, exit 1, command not run | ✓ |
| Fallback to human format | Silent misbehavior; CI gets text instead of a clear message | |

| Option | Description | Selected |
|--------|-------------|----------|
| json + text; both lint/build-only | 'text' = explicit default alias; --quiet and --format rejected on init | ✓ |
| json only; both lint/build-only | Less surface, loses explicit default | |
| json + text; --quiet also on init | Adds init behavior nobody asked for | |

**User's choice:** Orthogonal flags, JSON-only failure output, D-05-shaped format error, values json|text, lint/build-only scoping.

---

## BSKV-01 protocol

| Option | Description | Selected |
|--------|-------------|----------|
| Real Motto skill, kept | Authored from operator freeform input for Motto's own skills/ tree; ships if it lints; highest-fidelity dogfood | ✓ |
| Disposable sandbox skill | Zero repo impact, weaker "real skill" claim | |
| You decide at execution | Planner picks the topic when the phase runs | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stage all three targets | Freeform input deliberately forces BSKL-01 gaps, one hollow section (BSKL-05), invalid working name (WR-01) | ✓ |
| One natural run, note misses | Risks closing BSKV-01 with the same debt open | |
| Natural run + targeted re-runs | Cleaner separation, more sessions | |

| Option | Description | Selected |
|--------|-------------|----------|
| Phase FINDINGS.md | 19-BSKV-FINDINGS.md: per-target expected-vs-observed + divergence verdicts; auditable by verify-phase | ✓ |
| STATE.md todos only | Loses the "findings recorded" evidence BSKV-01 requires | |
| Inline in SUMMARY.md | Buried among execution notes | |

| Option | Description | Selected |
|--------|-------------|----------|
| In-phase checkpoint task | Executor pauses; operator invokes /build-skill live; real run inside phase execution | ✓ |
| Separate manual session | Risks phase completing on promised, unrun verification | |

**User's choice:** Real kept skill, all three targets staged, phase FINDINGS.md, in-phase checkpoint.

---

## Claude's Discretion

- Flag plumbing placement inside bin/motto.js
- Test structure for new CLI behaviors
- Exact wording of the unknown-format error (D-05 shape required)
- Candidate BSKV-01 skill topics, proposed at execution checkpoint

## Deferred Ideas

- `--format json` line/column positions from yaml errors (already in REQUIREMENTS Future, v2+)
- init `--quiet`/`--format` support — revisit only when a machine consumer of init appears
