# Phase 7: npm Packaging & Release Flow - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the Motto CLI publishable to npm as the scoped public package
`@jeremiewerner/motto`, and wire the private `release` skill to drive the real
end-to-end publish workflow (verify → publish → push tag) instead of its
current TODO stub.

**In scope:** `package.json` packaging config, a LICENSE file, the
`release` skill's publish/tag/bump steps.
**Out of scope (other phases):** marketplace `marketplace.json` (Phase 8),
README/install docs (Phase 9). The `--zip` feature is dropped (PROJECT.md).

</domain>

<decisions>
## Implementation Decisions

Locked upstream (PROJECT.md / `.planning/research/distribution.md`) — NOT
re-decided here, carried as constraints: scoped name `@jeremiewerner/motto`,
version `0.0.3`, `publishConfig.access: "public"`, `files` allowlist =
`bin/`, `src/`, `dist/public/`; release flow does real `npm publish` +
`git push --follow-tags` + manual `motto.yaml` bump.

### Package metadata & license
- **D-01:** License is **MIT**. Add a `LICENSE` file at repo root and
  `"license": "MIT"` in `package.json`. (The git repo is private, but the
  published tarball — `bin/`/`src/`/`dist/public/` — is public, so a license
  is warranted.)
- **D-02:** Add **full** `package.json` metadata: `license`, `description`,
  `repository`, `author`, `homepage`, `keywords`. Reuse existing values —
  `description` from `motto.yaml`/PROJECT.md, `repository` →
  `github:jeremiewerner/motto` (private repo; URL 404s for non-collaborators,
  which is fine), `author` = Jérémie Werner. Goal: clean npm page + no publish
  warnings.

### dist/public freshness
- **D-03:** Add `"prepublishOnly": "node bin/motto.js build"` to
  `package.json` scripts so `dist/public/` is always rebuilt from the current
  `skills/` tree before publish — a safety net independent of the release
  skill. **Note:** `prepublishOnly` does NOT fire on `npm pack --dry-run`, so
  the tarball-verify step (D-05) inspects whatever `motto build` last emitted;
  the release skill's existing Step 3 dogfood build runs before pack, so
  ordering holds. Planner to confirm `dist/` git-tracking vs ignore doesn't
  break the pack-time file list.

### Release skill — version bump
- **D-04:** Use **`npm version X.Y.Z`** to bump `package.json` and create the
  git commit + tag in one step, plus a **manual `motto.yaml` version edit**
  (Motto does not enforce package.json↔motto.yaml sync). Then
  `git push --follow-tags` (REL-02). **Gotcha for planner:** `npm version`
  refuses a dirty working tree by default — sequence the `motto.yaml` edit as
  an amend after `npm version`, or use `-f`, or stage yaml into the version
  commit. Spell the exact command order out in the skill.

### Release skill — tarball verify
- **D-05:** The verify step is a **scripted assertion**, not a human eyeball:
  run `npm pack --dry-run --json`, parse the file list, and hard-fail the
  release if any path outside `bin/`, `src/`, `dist/public/` (plus
  auto-included `package.json`/`README`/`LICENSE`) appears. Makes NPM-04
  (no `skills/`/`test/`/`.planning/` leakage) machine-checked. Pure shell —
  no new dependency (honors the single-dep `yaml` constraint).

### Claude's Discretion
- Exact `package.json` field ordering, `keywords` list contents, and the
  precise shell of the D-05 assertion are left to the planner/executor.
- Whether `dist/` stays git-tracked or is `.gitignore`d (as long as the
  pack-time file list and prepublishOnly hook stay consistent).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone decisions & requirements
- `.planning/PROJECT.md` — Current Milestone v0.0.3 "Locked decisions" +
  Key Decisions table (scoped name, `files` allowlist, publish flow, `--zip`
  dropped).
- `.planning/REQUIREMENTS.md` — NPM-01..04, REL-01..03 (this phase's
  requirements + acceptance detail).
- `.planning/ROADMAP.md` §"Phase 7" — goal + 4 success criteria.

### Distribution research (the source of the locked decisions)
- `.planning/research/distribution.md` — npm publish config, `files`
  allowlist rationale, release-skill gap analysis, marketplace schema (§1 is
  Phase 8, but the npm-publish sections are directly relevant here).

### Files this phase edits/creates
- `package.json` — current version drift (`0.0.1`); no `license`/metadata yet.
- `motto.yaml` — currently `version: "0.0.2"`; manual bump target (D-04).
- `skills/release/SKILL.md` — Step 5 publish is a TODO stub; Step 1 test gate
  still says `# pass 53` (now 75 — fix while wiring the real flow).
- `LICENSE` — does not exist yet (D-01 creates it).
- No `README` exists yet — Phase 9 creates it; `files` auto-includes it once present.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/motto.js` — CLI entry (`motto lint` / `motto build`); reused verbatim
  by the `prepublishOnly` hook (D-03) and the release skill's dogfood step.
- `skills/release/SKILL.md` — existing 6-step checklist; Steps 2/4/5 get
  filled in (D-04, D-05, real publish) rather than rewritten.

### Established Patterns
- Single runtime dep (`yaml`); zero-dep shell for tooling — D-05 assertion and
  all release steps must stay pure shell / Node stdlib, no new dep.
- `dist/{public,private}/` already produced by `motto build`; `files` ships
  only `dist/public/` (private skills never published).

### Integration Points
- `package.json` `bin` → `motto` command (global install, NPM-01).
- `prepublishOnly` (npm lifecycle) → `motto build` → `dist/public/`.
- release skill → `npm version` / `npm pack --dry-run` / `npm publish` /
  `git push --follow-tags`.

</code_context>

<specifics>
## Specific Ideas

- npm page quality matters (D-02 full metadata) — the package is the public
  face even though the repo is private.
- NPM-04 is treated as a machine-checked invariant, not a manual checklist
  item (D-05).

</specifics>

<deferred>
## Deferred Ideas

- `.claude-plugin/marketplace.json` + `source: npm` skills override — **Phase 8**.
- README install docs (npm CLI, marketplace, Claude Desktop symlink/zip
  one-liners) — **Phase 9**.
- CI (GitHub Actions) publish automation — deferred (husky-only today;
  backlog).
- `--zip` build feature — dropped for v0.0.3 (documented shell one-liner).
- npm 2FA / `.npmrc` publish-auth ergonomics — not raised; standard `npm login`
  assumed. Note if it surfaces during REL-01 planning.

None of the above expand this phase's scope.

</deferred>

---

*Phase: 7-npm-packaging-release-flow*
*Context gathered: 2026-07-01*
