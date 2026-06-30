# Phase 1: Pure Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 1-Pure Core
**Areas discussed:** Parser error model, Normalization (CRLF/BOM), Malformed detection, Schema/config rule exactness

> Framing finding presented before discussion: the superpowers TDD plan
> (`.planning/superpowers/plans/2026-06-30-motto-core-cli.md`) diverges from
> `.planning/REQUIREMENTS.md` in ≥6 concrete places (PARSE-02 normalization missing,
> PARSE-03 uses throwing `YAML.parse`, PARSE-04 stray-`---` unhandled, LINT-02 regex
> allows leading digit, LINT-05 basename safety missing, CONF-02 plugin-name regex
> missing). The four areas map to these forks.

---

## Parser error model

| Option | Description | Selected |
|--------|-------------|----------|
| Uniform errors[], never throw | parseFrontmatter→{data,body,errors[]}, loadConfig→{config,errors[]}, via YAML.parseDocument. One error model across the core; matches validateSkill; PARSE-03/04 fall out naturally. | ✓ |
| Throw structural, capture YAML | Throw on missing/stray `---`, parseDocument for YAML errors. Two mechanisms. | |
| Keep plan's throw model | YAML.parse throws on any problem; pushes error-handling to every caller. | |

**User's choice:** Uniform errors[], never throw.
**Notes:** Recorded a reconciliation flag — PARSE-01/CONF-01 are worded "throws a clear error"; this choice reinterprets that as "reports a clear named error" (same behavior, tests assert on errors[] not assert.throws). User did not object.

---

## Normalization (CRLF/BOM)

| Option | Description | Selected |
|--------|-------------|----------|
| Fold in, minimal | Strip leading BOM + CRLF→LF as first lines of parseFrontmatter; regex stays LF-anchored. | ✓ |
| Separate normalize() export | Standalone testable function, but only one consumer in v1. | |
| Fold in, broad | Also lone-\r, trailing whitespace, ensure trailing newline. Invents behavior. | |

**User's choice:** Fold in, minimal.
**Notes:** —

---

## Malformed detection

| Option | Description | Selected |
|--------|-------------|----------|
| Count delimiter lines | Exactly two bare `---` lines expected; extra line or parseAllDocuments>1 → "stray --- in frontmatter". Uses YAML doc-separator semantics. | ✓ |
| parseAllDocuments only | Whole post-opening text to parseAllDocuments; blurs frontmatter/body boundary, body `---` rule false-positives. | |
| Greedy to last --- | Match to last `---`; swallows body `---` rules. Rejected. | |

**User's choice:** Count delimiter lines.
**Notes:** Empty block `---\n---\n` locked as `data:{}` with no parse error (validateSkill reports missing fields). User offered the chance to object; did not.

---

## Schema/config rule exactness

| Option | Description | Selected |
|--------|-------------|----------|
| Name errors: cascade | One name error at a time (missing→non-kebab→reserved→≠folder); other fields collected independently. Matches plan's else-if and is correct. | ✓ |
| Name errors: independent | Report all failing name checks together; redundant when name empty/malformed. | |
| Plugin regex: reuse skill-name regex | plugins.* validated with same letter-start kebab regex. | ✓ |
| Plugin regex: looser | Allow uppercase / scoped names; no requirement asks for it. Rejected. | |

**User's choice:** Cascade name errors; reuse skill-name regex for plugin names.
**Notes:** Locked to requirements without a vote (dictated by LINT-02/05, CONF-02): letter-start kebab `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` (fixes plan's digit-allowing regex); reserved-substring check (anthropic/claude); shared_references basename safety (reject `/`·`.`); template/dependencies accepted but unvalidated.

## Claude's Discretion

- Exact error-message wording beyond the named anchors (must name skill + failing rule, greppable `skill: message`).
- Internal helper decomposition within each function.

## Deferred Ideas

None — discussion stayed within phase scope.
