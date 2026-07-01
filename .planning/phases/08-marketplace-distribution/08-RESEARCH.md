# Phase 8: Marketplace Distribution - Research

**Researched:** 2026-07-01
**Domain:** Claude Code plugin marketplace authoring (`marketplace.json`)
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MKT-01 | A user can run `/plugin marketplace add jeremiewerner/motto` and Motto's marketplace resolves from the repo | Confirmed: `owner/repo` GitHub shorthand works. Private repo is OK for the repo owner using existing git credentials. |
| MKT-02 | A user can run `/plugin install motto-skills@motto` and Motto's public skills load in Claude Code | Confirmed: `motto` is the marketplace `name` (not reserved), `motto-skills` is the plugin `name` (matches `dist/public/.claude-plugin/plugin.json`). Skills load as `/motto-skills:author-skill` and `/motto-skills:setup-project`. |
| MKT-03 | `.claude-plugin/marketplace.json` lives in the repo root, uses `source: npm`, and overrides the skills path to `dist/public/` with `strict: false` | Confirmed: all three properties are valid and correctly specified. Exact JSON verified against official docs. |
</phase_requirements>

---

## Summary

Phase 8 creates a single new file: `.claude-plugin/marketplace.json` at the Motto repo root. This file registers the `motto` marketplace and lists the `motto-skills` plugin sourced from the published `@jeremiewerner/motto` npm package with a `skills` path override pointing at `dist/public/`. That is the entire implementation.

The existing distribution research (HIGH confidence) already established that `source: npm` is a real, supported Claude Code marketplace source type. This research session has verified the critical unknown: the exact field name for the skills path override is `"skills"` (string or array), confirmed directly from the official Claude Code plugin marketplace documentation fetched 2026-07-01. The `strict: false` setting is confirmed correct for Motto because the npm package root has no `.claude-plugin/plugin.json` at the top level — it is buried under `dist/public/` and therefore not found by Claude Code's plugin-root plugin.json lookup.

The phase is lower risk than the ROADMAP description implies. There are no new dependencies, no build changes, and no code changes — only a JSON configuration file. The main residual risk is the `strict: false` + nested `plugin.json` interaction, which is resolved by the path analysis below.

**Primary recommendation:** Author `.claude-plugin/marketplace.json` with the exact JSON in the Code Examples section. Run `claude plugin validate .` to confirm schema validity before considering the phase done.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Marketplace catalog authoring | Configuration (static JSON) | — | A `.json` file in the repo root; no runtime code |
| Plugin discovery (by users) | Claude Code runtime | npm registry | Claude Code resolves `source: npm` → downloads from npm registry |
| Skills loading | Claude Code runtime | — | Claude Code scans `dist/public/` for SKILL.md files after plugin install |
| npm package distribution | npm registry | — | Already shipped by Phase 7; Phase 8 only points the catalog at it |

---

## Standard Stack

### Core

No new packages. Phase 8 is configuration-only — one JSON file.

| Component | Notes |
|-----------|-------|
| `.claude-plugin/marketplace.json` | New file; plain JSON, no schema tooling needed |
| `claude plugin validate .` | CLI tool already available (Claude Code CLI); validates marketplace.json schema |

### Installation

Nothing to install. `dist/public/` and the npm package already exist from Phase 7.

---

## Package Legitimacy Audit

No new packages are installed or recommended in this phase. The audit is N/A.

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User machine
   │
   ▼
Claude Code CLI / Desktop Code tab
   │
   │  /plugin marketplace add jeremiewerner/motto
   ▼
GitHub: jeremiewerner/motto (private repo)
   └── .claude-plugin/marketplace.json
          └── plugins[0]: name="motto-skills", source=npm
   │
   │  /plugin install motto-skills@motto
   ▼
npm registry
   └── @jeremiewerner/motto@0.0.3
          └── dist/public/          ← skills path override target
              ├── author-skill/SKILL.md
              └── setup-project/SKILL.md
   │
   ▼
~/.claude/plugins/cache/motto/motto-skills/<version>/
   └── Skills loaded as:
       /motto-skills:author-skill
       /motto-skills:setup-project
```

### Recommended Project Structure

```
motto/                              ← npm package root (@jeremiewerner/motto)
├── .claude-plugin/                 ← NEW this phase
│   └── marketplace.json            ← Motto's marketplace catalog (NEW)
├── dist/
│   └── public/                     ← Plugin content (skills path override target)
│       ├── .claude-plugin/
│       │   └── plugin.json         ← name: "motto-skills" (emitted by motto build)
│       ├── author-skill/
│       │   ├── SKILL.md
│       │   └── references/
│       └── setup-project/
│           ├── SKILL.md
│           └── references/
└── ... (bin/, src/, etc.)
```

### Pattern 1: npm Source Plugin Entry with Skills Path Override

The `skills` field (string or array) specifies custom paths to skill directories containing `<name>/SKILL.md`. It adds to the default scan (default is `skills/` under plugin root). If none of the listed paths exist, the default scan runs instead.

```json
// Source: code.claude.com/docs/en/plugin-marketplaces (fetched 2026-07-01) [VERIFIED: code.claude.com]
{
  "name": "motto-skills",
  "source": { "source": "npm", "package": "@jeremiewerner/motto" },
  "description": "Motto skill authoring and packaging tools",
  "skills": "./dist/public/",
  "strict": false
}
```

With `strict: false`, Claude Code does NOT look for `plugin.json` at the plugin root — the marketplace entry is the entire component definition. Skills are discovered by scanning `./dist/public/` for `<name>/SKILL.md` files.

### Pattern 2: Complete marketplace.json for Motto

This is the exact file to author. No deviations. [VERIFIED: code.claude.com]

```json
{
  "name": "motto",
  "owner": { "name": "Jérémie Werner", "email": "jeremiew@pm.me" },
  "plugins": [
    {
      "name": "motto-skills",
      "source": { "source": "npm", "package": "@jeremiewerner/motto" },
      "description": "Motto skill authoring and packaging tools",
      "skills": "./dist/public/",
      "strict": false
    }
  ]
}
```

**Field-by-field justification:**

| Field | Value | Why |
|-------|-------|-----|
| `name` | `"motto"` | Marketplace identifier. Not reserved (verified against reserved-names list). Becomes `@motto` in install commands. |
| `owner.name` | `"Jérémie Werner"` | Required maintainer field. |
| `owner.email` | `"jeremiew@pm.me"` | Optional but useful for contact. |
| `plugins[0].name` | `"motto-skills"` | Plugin identifier. Matches `dist/public/.claude-plugin/plugin.json` `name` field. Users install with `motto-skills@motto`. |
| `plugins[0].source.source` | `"npm"` | Source type for npm registry. |
| `plugins[0].source.package` | `"@jeremiewerner/motto"` | Scoped package name published by Phase 7. |
| `plugins[0].source.version` | (omitted) | Omitting version = always-latest from npm. Add `"version": "0.0.3"` to pin (require manual update on each release). Recommendation: omit for now, add pinning later. |
| `plugins[0].skills` | `"./dist/public/"` | Path override. Claude Code scans this directory for `<name>/SKILL.md` files. Finds `author-skill` and `setup-project`. |
| `plugins[0].strict` | `false` | No `plugin.json` at the npm package root → marketplace entry is the full definition. See critical note below. |

### Critical Note: `strict: false` and the nested `plugin.json`

**The npm package ships `dist/public/.claude-plugin/plugin.json`** (with `name: "motto-skills"`, emitted by `motto build`). This file is at path `<pkg-root>/dist/public/.claude-plugin/plugin.json` when installed.

**Claude Code's `plugin.json` lookup** happens at `<plugin-root>/.claude-plugin/plugin.json` — exactly one level down from the plugin root. For an npm source, the plugin root IS the npm package root. There is NO `.claude-plugin/plugin.json` at the package root top level. The file at `dist/public/.claude-plugin/plugin.json` is 2 levels deep and is NOT found by the plugin-root lookup.

Therefore: `strict: false` does NOT trigger the "conflict" error. The `dist/public/.claude-plugin/plugin.json` is invisible to the plugin-root lookup. The marketplace entry defines everything.

**If the plugin fails to load with a conflict error** (indicating Claude Code is finding the nested plugin.json somehow): fix by either (a) switching to `strict: true` and adding a root-level `.claude-plugin/plugin.json` that delegates via the `skills` field, or (b) removing the `plugin.json` from `motto build`'s public output (build change). This is the fallback path if the primary assumption is wrong.

### Pattern 3: Skills Discovered After Install

After `/plugin install motto-skills@motto`, Claude Code discovers and loads:

```
/motto-skills:author-skill      ← from dist/public/author-skill/SKILL.md
/motto-skills:setup-project     ← from dist/public/setup-project/SKILL.md
```

Skills are namespaced with the plugin name (`motto-skills`), not the marketplace name (`motto`). The `references/` subdirectory in each skill is inside the skill directory and is copied to the plugin cache alongside `SKILL.md` — no path-outside-plugin-directory issues. [VERIFIED: code.claude.com]

### Anti-Patterns to Avoid

- **Adding `source.version` to pin npm version**: adds manual update burden on each release. Omit for now; the npm package version is the source of truth.
- **Using `strict: true` without a root-level `plugin.json`**: the default, but would fail or produce undefined behavior since no plugin.json exists at the npm package root. `strict: false` is required for this layout.
- **Using `"skills": "./dist/public/"` with a string glob** (e.g. `"./dist/public/*/"`): the field expects a directory path, not a glob. Claude Code handles the scan internally.
- **Putting `.claude-plugin/marketplace.json` anywhere other than repo root**: the docs require it at the repository root. `marketplace add jeremiewerner/motto` looks for `.claude-plugin/marketplace.json` at the root of the cloned repo.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Marketplace JSON schema validation | Custom validator | `claude plugin validate .` | Built into the Claude Code CLI; catches schema errors, duplicate names, path traversal |
| Plugin installation logic | Any code | `/plugin install motto-skills@motto` | Claude Code handles npm install, caching, skill loading |

---

## Common Pitfalls

### Pitfall 1: `strict: false` conflict if `plugin.json` found at plugin root

**What goes wrong:** Claude Code finds a `plugin.json` at `<plugin-root>/.claude-plugin/plugin.json` while `strict: false` is set. Plugin fails to load with a conflict error.

**Why it happens:** The `dist/public/.claude-plugin/plugin.json` is NOT at the plugin root — but if the npm package structure ever changes so that `plugin.json` appears at the package root, this breaks.

**How to avoid:** Phase 8 does not change the build output. Current structure is safe. Do not add a root-level `.claude-plugin/` directory or `plugin.json` to the npm package.

**Warning signs:** Plugin install succeeds but `/motto-skills:author-skill` is unavailable; or an explicit conflict error from Claude Code.

### Pitfall 2: Skills not found (wrong `skills` path)

**What goes wrong:** `skills: "./dist/public/"` path doesn't match the actual directory, so Claude Code finds zero skills.

**Why it happens:** `dist/public/` is not populated if `motto build` was never run since clone. The `prepublishOnly` hook runs `motto build` before `npm publish`, so the PUBLISHED npm tarball always has the correct `dist/public/` content. The path in `marketplace.json` is a path within the installed npm package (post-npm-install), not within the git repo.

**How to avoid:** The `files` allowlist in `package.json` includes `dist/public/` and `prepublishOnly` rebuilds it before publish. Nothing to do for Phase 8, but verify with `npm pack --dry-run --json` that `dist/public/author-skill/SKILL.md` and `dist/public/setup-project/SKILL.md` appear in the tarball (this was confirmed in Phase 7 SUMMARY: 13 files, all correct).

**Warning signs:** `/plugin install` succeeds but no `motto-skills:*` slash commands appear.

### Pitfall 3: Private repo blocks external users

**What goes wrong:** External users run `/plugin marketplace add jeremiewerner/motto` and get an authentication error.

**Why it happens:** The `jeremiewerner/motto` GitHub repo is private. The marketplace add command uses git to clone the repo and read `marketplace.json`. External users have no access.

**How to avoid:** Phase 8 only needs to satisfy MKT-01 for the maintainer (Jeremie), who has existing git credentials via `gh auth login`. External users cannot add the marketplace until the repo is made public. This is acceptable for Phase 8.

**Warning signs:** "Repository not found" or "Authentication failed" when running marketplace add.

**Mitigation if external use is required:** Make the GitHub repo public, or distribute the marketplace.json via a public URL. This is out of scope for Phase 8.

### Pitfall 4: Auto-updates fail silently for private repo

**What goes wrong:** Background startup updates of the marketplace fail because there's no `GITHUB_TOKEN` set.

**Why it happens:** Background auto-updates run without interactive credential helpers. Without `GITHUB_TOKEN` or `GH_TOKEN`, the git pull fails.

**How to avoid:** Set `export GITHUB_TOKEN=<token>` in `.zshrc`/`.bashrc` if auto-updates are desired. Manual `/plugin marketplace update` still works with `gh auth` credentials.

**Warning signs:** Marketplace shows stale version of plugins after npm publish + no `/plugin marketplace update` run.

### Pitfall 5: `motto` used as plugin name (not just marketplace name)

**What goes wrong:** Confusing `motto` (the marketplace name) with the plugin name. The install command would be `/plugin install WRONG@motto` not `/plugin install motto@motto`.

**Why it happens:** The plugin name is `motto-skills` (from `dist/public/.claude-plugin/plugin.json` and the `plugins[0].name` field in `marketplace.json`). The marketplace name is `motto`. These are different.

**How to avoid:** Keep `plugins[0].name` as `"motto-skills"` to match the emitted `plugin.json` name. The install command is `/plugin install motto-skills@motto`.

**Warning signs:** "Plugin not found" error after marketplace add.

---

## Code Examples

### Creating `.claude-plugin/marketplace.json`

```json
// .claude-plugin/marketplace.json
// Source: code.claude.com/docs/en/plugin-marketplaces (fetched 2026-07-01) [VERIFIED: code.claude.com]
{
  "name": "motto",
  "owner": { "name": "Jérémie Werner", "email": "jeremiew@pm.me" },
  "plugins": [
    {
      "name": "motto-skills",
      "source": { "source": "npm", "package": "@jeremiewerner/motto" },
      "description": "Motto skill authoring and packaging tools",
      "skills": "./dist/public/",
      "strict": false
    }
  ]
}
```

### Validation (run from repo root)

```bash
# Validate marketplace.json schema — built-in CLI tool [VERIFIED: code.claude.com]
claude plugin validate .
# or inside an interactive Claude Code session:
# /plugin validate .
```

### End-to-end User Flow

```bash
# Step 1: Add the marketplace (once per user; uses git credentials for private repo)
/plugin marketplace add jeremiewerner/motto

# Step 2: Install the skills plugin (downloads from public npm)
/plugin install motto-skills@motto

# Step 3: Use the skills
/motto-skills:author-skill
/motto-skills:setup-project
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `source: github` pointing at repo dist/ | `source: npm` pointing at published package | One publish ships both CLI and plugin; no separate release step for marketplace |
| Separate marketplace repo | marketplace.json inside the plugin repo itself | No extra repo to maintain |
| Manual skills directory at `~/.claude/skills/` | Marketplace + `/plugin install` | Standard distribution flow; works for all Claude Code users, not just the maintainer |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dist/public/.claude-plugin/plugin.json` (at 2-levels deep) is NOT discovered by Claude Code's plugin-root `plugin.json` lookup, so it does not conflict with `strict: false` | Critical Note in Architecture Patterns | Plugin fails to load; fix: switch to `strict: true` + add root-level plugin.json, or remove nested plugin.json from build output |

**All other claims are verified or cited from official Claude Code documentation fetched 2026-07-01.**

---

## Open Questions

1. **Does `strict: false` conflict with the nested `plugin.json` at `dist/public/.claude-plugin/plugin.json`?**
   - What we know: Claude Code looks for `plugin.json` at `<plugin-root>/.claude-plugin/plugin.json`. For npm source, plugin root = npm package root. The nested file is at `dist/public/.claude-plugin/plugin.json`, not at root.
   - What's unclear: Whether Claude Code does a recursive scan or an explicit path lookup for plugin.json.
   - Recommendation: Use `strict: false` as specified. If install succeeds but skills don't load, check for conflict error. Fallback plan is documented in Pitfall 1.

2. **When should the repo be made public?**
   - What we know: Phase 8 success criteria only require Jeremie to be able to run the commands (repo owner with credentials).
   - What's unclear: Whether making the repo public is in scope for this milestone.
   - Recommendation: Out of scope for Phase 8. External users can install `motto-skills` via `/plugin install` once they have the marketplace URL — but getting the marketplace URL requires the repo to be public. This is a Phase 9/documentation concern.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Claude Code CLI (`claude plugin validate`) | MKT-03 validation | Check at execution | — | Skip validation CLI step; use JSON linter manually |
| npm registry (public) | MKT-02 plugin install via `source: npm` | ✓ (public registry) | — | — |
| GitHub access to `jeremiewerner/motto` | MKT-01 marketplace add | ✓ for owner (gh auth) | — | — |

**Missing dependencies with no fallback:** None (marketplace.json authoring requires only a text editor).

**Note on validation:** `claude plugin validate .` requires the Claude Code CLI to be installed. Run from the repo root (the directory containing `.claude-plugin/`). This validates the marketplace.json schema, duplicate names, and source path integrity.

---

## Security Domain

`security_enforcement: true` in config. Phase 8 is configuration-only with no code execution.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | No | marketplace.json is static config authored by maintainer, not user input |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Marketplace name squatting / impersonation | Spoofing | `motto` is not a reserved name; not impersonating official Anthropic marketplaces. Verified against reserved-names list. |
| Plugin source points to wrong npm package | Tampering | Package `@jeremiewerner/motto` is scoped (namespace-protected). No typosquatting risk for the maintainer authoring their own marketplace.json. |

---

## Sources

### Primary (HIGH confidence)
- [Create and distribute a plugin marketplace — Claude Code Docs](https://code.claude.com/docs/en/plugin-marketplaces) — full schema verified 2026-07-01. Covers: marketplace.json schema, plugin entries, all source types including npm, skills field, strict mode, private repos, validation.
- `.planning/research/distribution.md` — prior research session 2026-06-30, HIGH confidence, from same official docs. Confirms `source: npm`, reserved names list, plugin.json relationship. **This research builds on it and adds the exact `skills` field name and strict mode behavior.**

### Secondary (MEDIUM confidence)
- `dist/public/.claude-plugin/plugin.json` — inspected 2026-07-01; confirms `name: "motto-skills"` matches the marketplace plugin entry name.
- `package.json` + Phase 7 SUMMARY — confirms `files: ["bin/", "src/", "dist/public/"]`, published package name `@jeremiewerner/motto`, tarball structure verified clean.

---

## Metadata

**Confidence breakdown:**
- marketplace.json exact schema: HIGH — fetched directly from official docs 2026-07-01
- `strict: false` behavior and `skills` field name: HIGH — directly from official docs table
- Private repo auth: HIGH — directly from official docs
- `dist/public/.claude-plugin/plugin.json` no-conflict claim: MEDIUM — logical deduction from plugin-root lookup path, confirmed ASSUMED (A1)

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (stable official spec; changes if Claude Code plugin system updates)
