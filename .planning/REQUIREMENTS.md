# Requirements: Motto — v0.0.2 Self-Hosting (Dogfood)

**Defined:** 2026-06-30
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.

This milestone proves the shipped v0.0.1 `motto lint` + `motto build` pipeline by having Motto author and validate its *own* skills tree, with a permanent regression guard. Full schema surface exercised (public + private buckets + a shared reference). Gap-fixes surfaced by real content are in scope.

## v0.0.2 Requirements

### Self-Hosted Skill Tree (SELF)

- [ ] **SELF-01**: A root `motto.yaml` declares Motto's project identity — `name`, `version`, `description`, `plugins.public`, and `plugins.private` (private set because a private skill exists)
- [ ] **SELF-02**: A **public** skill `authoring-a-skill` documents how to write a conforming SKILL.md (frontmatter fields, kebab name = folder, Title + Role spine, shared_references)
- [ ] **SELF-03**: A **public** skill `motto-project-setup` documents initializing a Motto project (source-tree layout, `motto.yaml` fields, `lint`/`build`, dist output)
- [ ] **SELF-04**: A **private** skill `motto-release` provides the maintainer release checklist (exercises the private bucket end to end)
- [ ] **SELF-05**: A shared reference `skill-schema` is declared via `shared_references` by the skills and bundled into each skill's `references/<...>.md` on build

### Dogfood + Regression Guard (DOG)

- [ ] **DOG-01**: `motto lint` reports Motto's own skills tree clean — exit 0, `✓ N skills OK`
- [ ] **DOG-02**: `motto build` emits the expected `dist/` from the real tree — `dist/public/` and `dist/private/` buckets, each skill verbatim, declared shared refs bundled, per-bucket `.claude-plugin/plugin.json` with `version`
- [ ] **DOG-03**: A `node:test` dogfood test runs lint in-place on the repo root (read-only) and build against an isolated `mkdtemp` copy, asserting clean lint + the expected `dist/` artifacts — running on every commit via the husky pre-commit hook
- [ ] **DOG-04**: A self-test enforces that the `NAME_KEBAB` regex is identical between `src/schema.js` and `src/config.js` (closes the v0.0.1 manual-sync tech debt)

## Future Requirements (deferred)

- Optional `[path]` argument for `motto lint`/`motto build` (currently cwd-only)
- CLI ergonomics: `--quiet`, `--format json`, `--zip` (CLIX-01..03)
- Template mechanism validation against a first concrete template (TMPL-01)
- Distribution layer (Motto-as-plugin, global install, version pinning) — depends on the open install-mechanism decision
- A real `npm publish` flow (the `motto-release` skill carries a stub until packaging is decided)

## Out of Scope

| Feature | Reason |
|---------|--------|
| New runtime dependencies | Dogfood needs none — stdlib + existing `yaml` only |
| CLI / build behavior changes | This milestone consumes the v0.0.1 pipeline as-is (except gap-fixes it surfaces) |
| CI workflow (GitHub Actions) | No git remote configured yet; husky pre-commit is the guard for now |
| Content transform / inlining at build | Still copy-only — unchanged from v0.0.1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SELF-01 | TBD | Pending |
| SELF-02 | TBD | Pending |
| SELF-03 | TBD | Pending |
| SELF-04 | TBD | Pending |
| SELF-05 | TBD | Pending |
| DOG-01 | TBD | Pending |
| DOG-02 | TBD | Pending |
| DOG-03 | TBD | Pending |
| DOG-04 | TBD | Pending |

**Coverage:**
- v0.0.2 requirements: 9 total
- Mapped to phases: filled by roadmap
- Unmapped: TBD

---
*Requirements defined: 2026-06-30 for milestone v0.0.2.*
