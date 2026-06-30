# Requirements: Motto

**Defined:** 2026-06-30
**Core Value:** A strict schema + linter that guarantees authored skills conform before they ship, then packages them into self-contained standard Agent Skill plugins.

## v1 Requirements

Requirements for the initial release (the core `lint` + `build` CLI). Each maps to roadmap phases.

### Parsing (PARSE)

- [ ] **PARSE-01**: `parseFrontmatter` extracts YAML `data` + Markdown `body` from a `SKILL.md`, and throws a clear error when the `--- ... ---` block is missing
- [ ] **PARSE-02**: Input is normalized (CRLF→LF, UTF-8 BOM stripped) before any regex or YAML parse, so Windows/BOM-authored files parse correctly
- [ ] **PARSE-03**: YAML parse errors surface as lint errors (a malformed skill is reported, never silently dropped)
- [ ] **PARSE-04**: A stray `---` inside the frontmatter YAML is detected and reported, not silently misparsed

### Linting / Schema (LINT)

- [ ] **LINT-01**: Required frontmatter fields validated — `name`, `description`, `audience`
- [ ] **LINT-02**: `name` is letter-start kebab-case (`/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`), equals its folder name, and contains neither "anthropic" nor "claude"
- [ ] **LINT-03**: `audience` is exactly `public` or `private`
- [ ] **LINT-04**: Body spine enforced — first non-blank line is an `# ` H1 (Title) and the body contains a `**Role:**` line
- [ ] **LINT-05**: Each `shared_references` entry is a safe basename (no `/` or `.`) and resolves to `shared/references/<name>.md`
- [ ] **LINT-06**: All errors across all skills are collected and reported as `skill: message`; `motto lint` exits 0 (clean) or 1 (errors)
- [ ] **LINT-07**: Skill discovery is deterministic (sorted by name) and per-file error-isolated (one bad skill doesn't abort the scan)

### Config (CONF)

- [ ] **CONF-01**: `motto.yaml` is loaded and validated; `name`, `version`, `description`, `plugins.public` are required (missing fields reported together)
- [ ] **CONF-02**: `plugins.public` (and `plugins.private` when present) match the letter-start plugin-name regex
- [ ] **CONF-03**: `plugins.private` is optional

### Build / Packaging (BUILD)

- [ ] **BUILD-01**: `motto build` runs lint first; on failure it writes nothing and surfaces the same lint diagnostics
- [ ] **BUILD-02**: `dist/` is wiped, then each skill is copied verbatim into `dist/<audience>/<name>/` (symlinks not dereferenced)
- [ ] **BUILD-03**: Declared `shared_references` are bundled into each skill's `references/` in dist (self-contained output)
- [ ] **BUILD-04**: Each bucket gets `.claude-plugin/plugin.json` from `motto.yaml`, always including `version`
- [ ] **BUILD-05**: The private bucket/plugin is emitted only when private skills exist and `plugins.private` is set
- [ ] **BUILD-06**: Skills are siblings of `.claude-plugin/` in dist (never nested inside it)

### CLI (CLI)

- [ ] **CLI-01**: `motto lint` validates the current project and prints per-error output with the correct exit code
- [ ] **CLI-02**: `motto build` builds the current project, reports the output dir, and reuses lint diagnostics on failure

## v2 Requirements

Acknowledged but deferred — not in the current roadmap.

### CLI Ergonomics

- **CLIX-01**: `--quiet` flag (suppress success output for CI)
- **CLIX-02**: `--format json` (machine-readable lint output)
- **CLIX-03**: `--zip` (package dist plugin for Claude Desktop / claude.ai upload)

### Templates

- **TMPL-01**: Validate `template:` against concrete template definitions (designed against the first real skill that needs one)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| `--fix` auto-repair | Can't meaningfully auto-generate a Role/structure; risks corrupting intent |
| Watch mode | YAGNI for a build-on-demand tool |
| Per-directory config overrides | Would undermine single-schema enforcement |
| Content transform / inlining compiler | Fights the maintainability principle; bundling is copy-only |
| MCP-dependency resolution | `dependencies` is declared/linted but not resolved in v1 |
| Distribution layer (Motto-as-plugin, global install, version pinning, meta-skill content) | Separate follow-up; depends on the open install-mechanism decision |
| Bespoke skill format / custom runtime | Output must stay portable standard Agent Skills |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARSE-01 | Phase 1 | Pending |
| PARSE-02 | Phase 1 | Pending |
| PARSE-03 | Phase 1 | Pending |
| PARSE-04 | Phase 1 | Pending |
| LINT-01 | Phase 1 | Pending |
| LINT-02 | Phase 1 | Pending |
| LINT-03 | Phase 1 | Pending |
| LINT-04 | Phase 1 | Pending |
| LINT-05 | Phase 1 | Pending |
| LINT-06 | Phase 2 | Pending |
| LINT-07 | Phase 2 | Pending |
| CONF-01 | Phase 1 | Pending |
| CONF-02 | Phase 1 | Pending |
| CONF-03 | Phase 1 | Pending |
| BUILD-01 | Phase 3 | Pending |
| BUILD-02 | Phase 3 | Pending |
| BUILD-03 | Phase 3 | Pending |
| BUILD-04 | Phase 3 | Pending |
| BUILD-05 | Phase 3 | Pending |
| BUILD-06 | Phase 3 | Pending |
| CLI-01 | Phase 2 | Pending |
| CLI-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-30*
*Last updated: 2026-06-30 after roadmap creation*
