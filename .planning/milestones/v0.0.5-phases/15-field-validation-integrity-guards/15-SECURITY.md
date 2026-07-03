---
phase: 15
slug: field-validation-integrity-guards
status: secured
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-03
---

# Phase 15 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| SKILL.md frontmatter → validator | Author-controlled `outputs:`/`dependencies:`/`allowed-tools` values are untrusted input crossing into `validateSkill` | Untrusted YAML scalar/map/array values |
| `outputs:` path → filesystem | An author-declared output path is resolved and stat'd; a symlink inside the skill dir can point outside it | Untrusted relative paths, symlink targets |
| dependencies declaration → dist packaging | A public skill's `dependencies:` list can name a private skill, leaking a private-scoped identifier toward the public `dist/` bucket | Private skill names |
| other skills' SKILL.md → audience pre-pass | `loadSkillAudiences` re-reads every skill's frontmatter (untrusted, possibly malformed) to build the audience map | Untrusted frontmatter |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-15-01 | Tampering / Information Disclosure | `outputs:` path values (lexical gate, both layers) | high | mitigate | Root-independent `isOutputPathLexicallySafe(entry)` (`normalize()`-based, no cwd dependence — post-CR-01 fix) rejects absolute/`..`-traversal/re-entry paths before any fs access; exported from `src/schema.js:130`, called at `src/schema.js:371` and reused as the fs-eligibility gate in `src/lint.js` (`import` at line 29). Regression tests pin the historical `../../<cwdDir>/...` bypass shape. | closed |
| T-15-02 | Tampering / Information Disclosure | `checkOutputsFs` symlink resolution | high | mitigate | `stat` (existence) → `isFile()` (WR-02 fix) → `realpath` both skill dir and target (`src/lint.js:225-226`) → `path.relative` containment (`:228`); proven by adversarial real-`symlink()` fixture in `test/lint.test.js`; verifier reproduced live. | closed |
| T-15-03 | Information Disclosure | `dependencies:` audience-direction | high | mitigate | Public→private guard at `src/schema.js:422-425` fails lint before `motto build` can leak a private name into public dist; only public→private fails, verified live with a 3-skill fixture (VERIFICATION.md). | closed |
| T-15-04 | Denial of Service | all new validators + `lintProject` boundary | medium | mitigate | Type-guard-before-method cascades never-throw (22 adversarial throwing-`toString`/`Symbol.toPrimitive` assertions in `test/schema.test.js`); post-CR-02 fix extends the guarantee to the `lintProject` boundary itself — non-ENOENT fs errors (ENOTDIR) become `(project)` diagnostics, pinned by one-`touch` regression fixtures in `test/lint.test.js`. 194/194 tests green. | closed |
| T-15-05 | Tampering (TOCTOU) | lint→build window on `outputs:` files | low | accept | `motto lint` is a static pre-flight tool, not a runtime boundary; a stat/realpath→build race needs local write access during the window — outside this single-maintainer local-CLI threat model (RESEARCH Security Domain). | closed |
| T-15-SC | Tampering | npm/pip/cargo installs | n/a | accept | Zero package installs this phase — `package.json` dependencies unchanged (`yaml` only), confirmed by git diff across all phase commits. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-15-01 | T-15-05 | TOCTOU race between lint and build requires local write access in the window; Motto is a single-maintainer local CLI, not a runtime security boundary. Documented at plan time (15-02-PLAN.md threat model). | plan-time disposition (15-02-PLAN.md), operator-approved plans | 2026-07-03 |
| AR-15-02 | T-15-SC | No supply-chain surface introduced: zero new packages this phase (RESEARCH.md Package Legitimacy Audit: N/A). | plan-time disposition (both PLAN.md threat models) | 2026-07-03 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-03 | 6 | 6 | 0 | gsd secure-phase (L1 short-circuit: plan-time register, mitigations grep-verified + verifier live probes) |

**Audit note:** the plan-time T-15-01 mitigation shape (`resolve()`+`sep` containment) was found bypassable post-execution by code review (CR-01: cwd-dependent root — crafted `../../<cwdDir>/...` path escaped containment AND skipped the existence check). The shipped mitigation is the corrected root-independent `normalize()`-based predicate (commit `3226d82`), and the review also hardened the never-throw boundary beyond the planned scope (CR-02, commit `1d92fd0`). Both fixes carry regression tests; the verifier re-probed them live (15-VERIFICATION.md). Register status above reflects the post-fix implementation.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
