# Motto — v0.0.3 Requirements (Distribution)

**Milestone goal:** Make Motto installable (npm) and its skills distributable (self-hosted Claude Code marketplace), wire the `release` skill's publish flow, and document Claude Desktop usage.

**Research:** `.planning/research/distribution.md`

## v0.0.3 Requirements

### npm publish (NPM)

- [x] **NPM-01**: A user can install the CLI with `npm i -g @jeremiewerner/motto` and invoke it as `motto`
- [x] **NPM-02**: `package.json` declares the scoped name, `publishConfig.access: "public"`, and a `files` allowlist restricting the tarball to `bin/`, `src/`, `dist/public/` (README/LICENSE auto-included)
- [x] **NPM-03**: `package.json` version matches the shipped release (drift from `0.0.1` corrected; bumped to `0.0.3`)
- [x] **NPM-04**: `npm pack --dry-run` produces a tarball containing only allowlisted paths — no `skills/`, `test/`, or `.planning/` leakage

### Marketplace (MKT)

- [x] **MKT-01**: A user can run `/plugin marketplace add jeremiewerner/motto` and Motto's marketplace resolves from the repo
- [x] **MKT-02**: A user can run `/plugin install motto@motto` and Motto's public skills load in Claude Code
- [x] **MKT-03**: `.claude-plugin/marketplace.json` lives in the repo root, uses `source: npm`, and overrides the skills path to `dist/public/` with `strict: false`

### Release skill (REL)

- [x] **REL-01**: The `release` skill runs the real publish flow (`npm pack --dry-run` verify → `npm publish`) instead of the current TODO stub
- [x] **REL-02**: The `release` skill pushes the release tag to the remote via `git push --follow-tags`
- [x] **REL-03**: The `release` skill bumps/notes the manual `motto.yaml` version alongside `package.json`

### Documentation (DOC)

- [x] **DOC-01**: README documents installing the CLI from npm
- [x] **DOC-02**: README documents adding the marketplace and installing Motto's skills into Claude Code
- [x] **DOC-03**: README documents Claude Desktop usage — symlink built skills into `~/.claude/skills/` (`ln -s dist/public/<skill> ~/.claude/skills/<skill>`) and the web-upload zip one-liner (`cd dist/public && zip -r <skill>.zip <skill>/`)

## Future Requirements (deferred)

- CLI ergonomics: `--quiet`, `--format json` (CLIX-01..02)
- Optional `[path]` arg for `lint`/`build` (currently cwd-only)
- CI workflow (GitHub Actions) — husky-only today; remote now exists
- Template mechanism validation against a first concrete template (TMPL-01)

## Out of Scope

- **`--zip` build feature** — Claude Desktop's Code tab is Claude Code (marketplace + `~/.claude/skills/` cover it); zip only matters for the Chat/web upload UI, handled by the DOC-03 shell one-liner. Building it would add Node zip code (no stdlib support) or a new dep for an edge case. Revisit only on real demand.
- CLI ergonomics beyond this milestone, `[path]` arg, TMPL-01, CI — see Future.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NPM-01 | Phase 7 | Complete |
| NPM-02 | Phase 7 | Complete |
| NPM-03 | Phase 7 | Complete |
| NPM-04 | Phase 7 | Complete |
| REL-01 | Phase 7 | Complete |
| REL-02 | Phase 7 | Complete |
| REL-03 | Phase 7 | Complete |
| MKT-01 | Phase 8 | Complete |
| MKT-02 | Phase 8 | Complete |
| MKT-03 | Phase 8 | Complete |
| DOC-01 | Phase 9 | Complete |
| DOC-02 | Phase 9 | Complete |
| DOC-03 | Phase 9 | Complete |
