# Requirements: Motto — v0.0.4 Project Bootstrap

**Defined:** 2026-07-02
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.
**Milestone goal:** A stranger with only `npm i -g @jeremiewerner/motto` can scaffold, build, and distribute their own skills project — no Claude Code skills required, no reverse-engineering.

## v0.0.4 Requirements

Each maps to roadmap phases. REQ-IDs continue from v0.0.3 (NPM/REL/MKT/DOC used; CLIX-01/02 reserved in backlog for `--quiet`/`--format json`).

### Scaffold (INIT)

- [ ] **INIT-01**: User can run `motto init [name]` to scaffold a complete project into the current directory — `skills/`, `shared/references/`, `motto.yaml`, `.gitignore` (`[name]` fills `motto.yaml` fields; defaults to cwd basename)
- [ ] **INIT-02**: Scaffolded starter skill passes `motto lint` and `motto build` with zero edits, guarded by a permanent scaffold-dogfood test (init → lint → build)
- [ ] **INIT-03**: init writes `.claude-plugin/marketplace.json` — relative source pointing at `dist/public/`, owner from git config (placeholder fallback when unset), plugin name consistent with `motto.yaml` by construction
- [ ] **INIT-04**: init refuses to scaffold over an existing project (non-empty target guard); `--force` overrides
- [ ] **INIT-05**: init validates the project name with the same rules lint enforces (single source: `schema.js` — no "init accepts, lint rejects")
- [ ] **INIT-06**: Scaffolded `.gitignore` ignores `dist/private/` but NOT `dist/public/` (ship flow requires committing `dist/public/`)

### CLI Ergonomics (CLIX)

- [ ] **CLIX-03**: User can run `motto --help` / `-h` (globally and per subcommand) and get usage text on stdout, exit 0
- [ ] **CLIX-04**: User can run `motto lint [path]` / `motto build [path]` against another directory; defaults to cwd

### Docs & Cleanup (DOC)

- [ ] **DOC-04**: README documents the full ship-your-plugin flow — commit `dist/public/`, push repo public, consumer `/plugin marketplace add` one-liner
- [ ] **DOC-05**: README scaffold section rewritten around `motto init`; `skills/setup-project/` deleted in the same commit as the dogfood-test count update (main never red)

## Future Requirements

Deferred. Tracked but not in current roadmap.

### CLI Ergonomics

- **CLIX-01**: `--quiet` — errors-only output for scripts/hooks
- **CLIX-02**: `--format json` — machine-readable lint results

### Distribution

- **SHIP-01**: `motto ship` command — deferred until real friction shows; scope unclear (after init + build, shipping is two git commands). Needs clarification before any build.

### Authoring

- **TMPL-01**: Template mechanism validated against a first concrete template
- **AUTH-SKILL**: `author-skill` reworked into an interactive skill-maker (purpose, dependencies, draft structure)

### Infra

- **CI-01**: GitHub Actions workflow (husky-only today)

## Out of Scope

| Feature | Reason |
|---------|--------|
| `motto ship` command | After init + build, shipping = `git commit && git push`; marketplace.json already scaffolded by init. Backlog until real friction (SHIP-01). |
| Interactive prompts in `motto init` | Would add a dependency, break scriptable/agent use, duplicate validation lint owns. Flag-driven only (research-backed anti-feature). |
| Template flavors / `--with` scaffolds | YAGNI — one starter skill is the example; design flavors against real demand. |
| Auto `git init` in scaffold | User's repo choice; scaffold stays filesystem-only. |
| Making repo public | Sole user today; revisit when a second user exists. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INIT-01 | Phase 10 | Pending |
| INIT-02 | Phase 10 | Pending |
| INIT-03 | Phase 10 | Pending |
| INIT-04 | Phase 10 | Pending |
| INIT-05 | Phase 10 | Pending |
| INIT-06 | Phase 10 | Pending |
| CLIX-03 | Phase 11 | Pending |
| CLIX-04 | Phase 11 | Pending |
| DOC-04 | Phase 12 | Pending |
| DOC-05 | Phase 12 | Pending |

**Coverage:**
- v0.0.4 requirements: 10 total
- Mapped to phases: 10 ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-02*
*Last updated: 2026-07-02 after roadmap creation (Phases 10-12 mapped)*
