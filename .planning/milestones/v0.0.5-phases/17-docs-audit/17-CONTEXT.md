# Phase 17: Docs Audit - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Bring the two canonical docs in line with the settled v0.0.5 schema: rewrite `shared/references/skill-schema.md` to the current validator (fix the false §6 "not validated" claim; document `template`, `outputs`, `dependencies`, `allowed-tools`), and update `README.md` so no `author-skill` reference remains and the `build-skill` flow is documented. Includes removing the now-obsolete supersede/delta prose from `skills/build-skill/SKILL.md` Step 2 (its whole reason to exist was the reference being stale). No new mechanisms, no new validators — one small doc-sync test is the only code.

</domain>

<decisions>
## Implementation Decisions

### skill-schema.md rewrite (DOC-07)
- **D-01: Surgical patch, not restructure** — keep the existing 7-section structure (§1–§5 and §7 verified current at discussion time). Replace §6's false "template/dependencies are NOT validated" claim with the real template cascade rules; add new sections for `outputs` and `allowed-tools`; update the header. Smallest reviewable diff.
- **D-02: Keep exact lint error strings** — the doc's role is canonical rule source ("all claims derived from src/schema.js"); exact error tables enable grep-the-message debugging. DOC-06 protects build-skill's prose, not this reference — this is the ONE doc whose job is to quote the linter.
- **D-03: Doc-sync test guards drift** — add a small `node:test` asserting the error strings quoted in `skill-schema.md` match `src/schema.js` (and lint.js-layer messages where quoted), so drift breaks the suite at commit time via the existing husky gate. No new dependencies. This mechanizes the sync-risk that killed author-skill.

### Version header policy
- **D-04: No version number in the header** — replace "v0.0.2" with a source citation: derived from `src/schema.js`, verified against the linter in this repo. The doc-sync test is the freshness guarantee; a version number is itself a manual-sync surface (the stale v0.0.2 header proved it). Do not pin to package.json or milestone.

### build-skill Step 2 cleanup
- **D-05: Remove both the supersede statement and the field delta** from `skills/build-skill/SKILL.md` Step 2 — it becomes "read the bundled skill-schema reference" with no delta and no supersede clause. Single source of truth once the reference is current. Re-lint + full suite green required after the edit (16-02 precedent: build-skill prose edits are cheap and safe). DOC-06 grep checks (`letter-start kebab-case`, `Common Lint Errors` → 0 matches) must still hold.

### README build-skill flow (DOC-06 SC3)
- **D-06: Rewrite "Author a skill" around build-skill's real flow** — hand it ANY input (spec, notes, transcript) → gap-fills missing slots in one batch → writes → lints until clean → quality gate → compact receipt. A mechanical name swap would describe author-skill's old interview behavior under a new name. All 8 author-skill reference sites go (lines ~95, 143, 203, 254, 267, 270, 275, 278 at discussion time).
- **D-07: `build-skill` is the sample skill name** in the install/symlink/zip examples and the skills table — it actually exists in `dist/public/` after `motto build`, so every example command stays copy-paste runnable against this repo. The skills table row for author-skill becomes a build-skill row.

### Claude's Discretion
- Exact prose wording of the new schema-doc sections (structure fixed above: rule statement, YAML example, error table — matching §1–§5 house style).
- Doc-sync test implementation shape (which side is source of truth for the assertion, how strings are extracted) — planner decides; constraint is only "drift breaks the suite, no new deps".
- Exact README section ordering/length for the rewritten flow; keep the existing Contents/anchors structure working.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The two docs being audited
- `shared/references/skill-schema.md` — the file being rewritten; §1–§5/§7 current, §6 false, `outputs`/`allowed-tools` missing, header stale
- `README.md` — 8 author-skill reference sites to replace; "Author a skill" section to rewrite around build-skill

### Ground truth the docs must match
- `src/schema.js` — the validator every documented rule derives from (NAME cascade at ~218-229, RESERVED at ~149, template cascade, outputs lexical guards, dependencies/allowed-tools rules)
- `src/templates.js` — SECTIONS/TEMPLATES registry (`procedure` template, section descriptions used in error strings)
- `src/lint.js` — fs-layer checks quoted by the doc where applicable (outputs existence/symlink-escape, dependencies resolution, shared_references)
- `skills/build-skill/SKILL.md` — Step 2 supersede/delta to remove (D-05); DOC-06 grep invariants to preserve

### Decision provenance
- `.planning/phases/15-field-validation-integrity-guards/15-CONTEXT.md` — locked field-validation semantics the new doc sections must describe (allowed-tools shapes, outputs cascade, dependencies guards, empty-field policy)
- `.planning/phases/14-template-mechanism/14-CONTEXT.md` — template cascade + section-tag matching semantics for the rewritten §6
- `.planning/phases/16-build-skill-author-skill-retirement/16-CONTEXT.md` — DOC-06 constraint and build-skill design the README flow description must match

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/dogfood.test.js` — house style for repo-level assertion tests; the doc-sync test follows the same pattern (node:test, no deps, runs in husky pre-commit).
- `src/schema.js` exports `NAME_KEBAB` and builds error strings inline — the doc-sync test can import from it directly (ESM).

### Established Patterns
- Phase 14/15 error-string conventions: one line, quoted offending value, inline hint/available-list — new doc sections should quote these verbatim.
- DOC-06 grep enforcement precedent (16-02 acceptance criteria) — same grep-style acceptance criteria work for "no author-skill references remain" (`grep -c author-skill README.md` → 0).

### Integration Points
- `motto build` bundles `shared/references/skill-schema.md` verbatim into `dist/public/build-skill/references/` — rewriting the source file automatically fixes the shipped copy on next build; dogfood test already asserts the bundled file exists.
- husky pre-commit runs `node --test` — the doc-sync test gates every future commit, including release bumps.

</code_context>

<specifics>
## Specific Ideas

- The stale "v0.0.2" header is itself the motivating example for D-04 — the rewritten header should make staleness structurally impossible rather than promising manual updates.
- README examples must stay copy-paste runnable against this repo (the reason D-07 picked build-skill over hello-world).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-docs-audit*
*Context gathered: 2026-07-03*
