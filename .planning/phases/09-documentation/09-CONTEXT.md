# Phase 9: Documentation - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the project `README.md` (none exists yet) at the repo root — Motto's front-door doc. It states what Motto is and documents every way to install/use it: the npm CLI (DOC-01), the self-hosted marketplace + skill install (DOC-02), and Claude Desktop usage via the `~/.claude/skills/` symlink and web-upload zip one-liners (DOC-03).

Scope is README content only. No new code, no build changes. Requirements DOC-01/02/03 fix WHAT must be documented; this phase decides HOW to write it.
</domain>

<decisions>
## Implementation Decisions

### README scope / altitude
- **D-01:** Full project README, not install-reference-only. Sections: what-is-Motto intro (+ why), a short authoring quickstart, all three install paths, and a brief contributing/dev section. It is the repo's landing page and none exists yet.

### Lead audience / ordering
- **D-02:** Author-first ordering. Lead with "build skills with Motto" (npm CLI → scaffold → lint → build → publish), then distribution (marketplace), then consumption (install skills), then Claude Desktop. Rationale: Motto's core value is authoring, so the reader who installs the CLI is the primary audience; the consumer flow follows.

### Quickstart depth
- **D-03:** Per-path copy-paste command blocks PLUS one compact end-to-end example (scaffold a skill → `motto lint` → `motto build` → install). Reference + one short walkthrough — not a fully narrated journey, not terse-blocks-only.

### Marketplace-add instructions & repo visibility (DOC-02)
- **D-04:** Document the public GitHub form `/plugin marketplace add jeremiewerner/motto` as the PRIMARY add path. This requires the repo to be public.
- **D-05:** **Make the `jeremiewerner/motto` repo public** — decided. Closes deferred item T-08-04. Action: `gh repo edit jeremiewerner/motto --visibility public` (run at/near ship, before external users follow DOC-02). Until then, the GitHub-form add only works for the maintainer; the manifest itself is already verified via the local-path add.

### Identifier correctness (MUST — post-rename)
- **D-06:** Every command in the README uses the CURRENT identifiers. The public plugin was renamed `motto-skills` → `motto` mid-milestone. Use verbatim:
  - CLI: `npm i -g @jeremiewerner/motto` → `motto lint`, `motto build`
  - Marketplace: `/plugin marketplace add jeremiewerner/motto` → `/plugin install motto@motto`
  - Skills: `/motto:author-skill`, `/motto:setup-project`
  - NEVER `motto-skills` (stale). The ROADMAP Phase 9 success criteria still say `motto-skills@motto` — that is stale; the planner/executor must write `motto@motto`.

### Claude's Discretion
- Exact section headings, ordering within the authoring quickstart, and prose tone are the writer's call.
- Whether the brief "contributing/dev" content lives inline in README or is a stub pointing at a future CONTRIBUTING.md (a full CONTRIBUTING.md is deferred — see Deferred).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §Documentation (DOC) — DOC-01/02/03, the exact one-liners for Claude Desktop (symlink + zip), and the `--zip` out-of-scope rationale.
- `.planning/ROADMAP.md` §"Phase 9: Documentation" — the 3 success criteria (note: their `motto-skills@motto` string is stale → write `motto@motto`).

### Source-of-truth for install identifiers
- `.claude-plugin/marketplace.json` — marketplace name `motto`, plugin `motto`, `source: npm` → `@jeremiewerner/motto`.
- `package.json` — scoped name, `bin.motto`, `files` allowlist, description ("Framework for authoring, validating, and packaging Claude Code Agent Skills"), keywords, homepage.
- `motto.yaml` — project config example for the README (name/version/description/plugins.public=motto).

### Authoring / publish narrative (reuse, don't reinvent)
- `skills/setup-project/SKILL.md` — directory layout + motto.yaml walkthrough; the README quickstart should align with it and can point users to `/motto:setup-project`.
- `skills/author-skill/SKILL.md` — how to write a conforming SKILL.md; README authoring section should align.
- `skills/release/SKILL.md` — the real publish flow (`npm version` → dogfood → tarball verify → `npm publish`); README publish step should match, incl. the v0.0.4-onward note.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json` description + keywords → README title/tagline/intro seed.
- The three shipped skills (`setup-project`, `author-skill`, `release`) already narrate the author→lint→build→publish journey — README references them rather than duplicating.
- Identifier set is fixed and verified live (Phase 8) — copy verbatim, no guessing.

### Established Patterns
- Fixed source tree: `skills/<name>/SKILL.md`, `shared/references/`, `motto.yaml`, `dist/` (generated). The quickstart mirrors this layout.
- Two plugin buckets: public (`motto`) and private (`motto-private`); README documents the public path (private is an authoring detail).

### Integration Points
- README is new at repo root; `files` allowlist auto-includes README in the npm tarball, so it also becomes the npmjs.com package page — write it to read well there too.

</code_context>

<specifics>
## Specific Ideas

- DOC-03 one-liners must use a concrete example skill name (e.g. `author-skill`) and note the Claude Desktop nuance: the Code tab IS Claude Code (covered by the marketplace); the symlink/zip serve the Chat/web-upload path.
- Symlink one-liner should use an absolute source so it resolves from `~/.claude/skills/`: `ln -s "$(pwd)/dist/public/author-skill" ~/.claude/skills/author-skill`. Zip: `cd dist/public && zip -r author-skill.zip author-skill/`.

</specifics>

<deferred>
## Deferred Ideas

- **Full `CONTRIBUTING.md`** — README carries only a brief dev section this phase. A standalone CONTRIBUTING (PR process, test/lint gates, husky) is a future doc, not required by DOC-01/02/03.
- **Docs site / extended guides** — README is the single deliverable; no docs site.

*Repo-public (D-05) is a decided ACTION, not deferred — execute at ship.*

</deferred>

---

*Phase: 9-Documentation*
*Context gathered: 2026-07-01*
