# Distribution Research: Motto v0.0.3

**Researched:** 2026-06-30
**Scope:** npm publish, Claude Code plugin marketplace, zip output, release skill gap analysis

---

## 1. Claude Code Plugin Marketplace

**Confidence: HIGH** — fetched directly from code.claude.com/docs/en/plugin-marketplaces and code.claude.com/docs/en/plugins-reference (official Anthropic docs, 2026-06-30).

### What a marketplace is

A marketplace is a git repository (GitHub, GitLab, or any git host) that contains a single file at `.claude-plugin/marketplace.json`. That file lists plugins and where to fetch them. Users add the marketplace once; then they can install any listed plugin by name.

### `marketplace.json` — complete schema

**Location:** `.claude-plugin/marketplace.json` in the marketplace repo root.

**Minimal working example:**
```json
{
  "name": "motto",
  "owner": { "name": "Jeremie Werner", "email": "jeremiew@pm.me" },
  "plugins": [
    {
      "name": "motto-skills",
      "source": { "source": "npm", "package": "@jeremiewerner/motto" },
      "description": "Motto skill authoring and packaging tools"
    }
  ]
}
```

**Top-level required fields:**

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| `name` | string | kebab-case, no spaces | Public-facing. Used as `@<name>` in install command. One marketplace per name per user (adding same name replaces old). |
| `owner` | object | — | `{ "name": "..." }` required; `"email"` optional |
| `plugins` | array | — | At least one entry |

**Top-level optional fields:**

| Field | Notes |
|-------|-------|
| `$schema` | `"https://json.schemastore.org/claude-code-marketplace.json"` — editor autocomplete only, ignored at runtime |
| `description` | Brief human description |
| `version` | Manifest version string |
| `metadata.pluginRoot` | Base dir prepended to relative plugin source paths (e.g. `"./plugins"` lets you write `"source": "formatter"`) |
| `allowCrossMarketplaceDependenciesOn` | Allowlist for cross-marketplace plugin deps |
| `renames` | Map old name → new name or null; requires Claude Code v2.1.193+ |

**Reserved names** (cannot be used by third parties): `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `claude-plugins-community`, `claude-community`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `anthropic-agent-skills`, `knowledge-work-plugins`, `life-sciences`, `claude-for-legal`, `claude-for-financial-services`, `financial-services-plugins`. Names impersonating official marketplaces (e.g. `official-claude-plugins`) are also blocked.

**"motto" is not reserved — safe to use.**

### Plugin entries in `plugins` array

**Required per entry:**

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Plugin identifier (kebab-case). Used as `<name>@<marketplace>` in install command. |
| `source` | string or object | Where to fetch the plugin. See source types below. |

**Optional per entry** (any field from `plugin.json` schema is valid here too):

`description`, `version`, `author`, `displayName`, `homepage`, `repository`, `license`, `keywords`, `category`, `tags`, `strict`, `relevance` (v2.1.152+), `defaultEnabled` (v2.1.154+)

The marketplace entry's `version` is used if `plugin.json` has no `version`. If both exist, `plugin.json` wins.

### Plugin source types

```json
// Relative path (same repo as marketplace)
"source": "./plugins/my-plugin"

// GitHub repo
"source": { "source": "github", "repo": "owner/repo", "ref": "v1.0.0", "sha": "<40-char>" }

// Git URL (GitLab, Bitbucket, etc.)
"source": { "source": "url", "url": "https://gitlab.com/org/plugin.git", "ref": "main" }

// Subdirectory inside a git repo (sparse clone)
"source": { "source": "git-subdir", "url": "https://github.com/org/mono.git", "path": "tools/plugin" }

// npm package  ← KEY FOR MOTTO
"source": { "source": "npm", "package": "@jeremiewerner/motto", "version": "0.0.3" }
```

**The npm source type is the right strategy for Motto.** When the marketplace entry uses `"source": "npm"`, Claude Code runs `npm install @jeremiewerner/motto` and treats the installed package directory as the plugin root. This means:
- One `npm publish` deploys both the CLI and the plugin.
- `dist/public/` must be included in the published npm package (add it to `files`).
- The marketplace.json can pin to a version or leave `version` unset for always-latest.

### How a user installs Motto's skills

```
# Add the marketplace (done once)
/plugin marketplace add jeremiewerner/motto

# Install the skills plugin
/plugin install motto-skills@motto

# Invoke a skill
/motto-skills:author-skill
```

Or via slash command in Claude Code:
```
/plugin marketplace add jeremiewerner/motto
/plugin install motto-skills@motto
```

### Where to host the marketplace.json

The `marketplace.json` can live in the **same `jeremiewerner/motto` GitHub repo** — that is, Motto's own repo hosts its own marketplace. The `.claude-plugin/marketplace.json` file goes at the repo root. Users add it with `/plugin marketplace add jeremiewerner/motto`. No separate "marketplace repo" is needed.

### How `plugin.json` relates to marketplace entries

The `dist/public/.claude-plugin/plugin.json` is the plugin manifest — it defines the plugin's identity and component layout. The `marketplace.json` is the catalog entry pointing to that plugin. Fields in `marketplace.json` plugin entries can override or supplement `plugin.json` values. If the plugin is sourced via npm, Claude Code installs the npm package and reads `plugin.json` from the package's directory (so the plugin must include `dist/public/.claude-plugin/plugin.json` in the published npm tarball, or restructure so the plugin root is the package root).

**Structural question this creates:** The npm package has the plugin at `dist/public/`. When Claude Code uses `source: npm`, it installs the package and looks for `SKILL.md` or `skills/` or `.claude-plugin/plugin.json` in the package root. If skills are at `dist/public/skills/`, the marketplace entry must include `"skills": "./dist/public/"` to point there. Alternatively, restructure so the built public plugin is at the npm package root (or in a known subpath). This is a design decision for the build phase, flagged below.

**Decision needed:** Whether the npm package root doubles as the plugin root (requiring `plugin.json` and skills at root) or whether the marketplace entry uses path overrides (`"skills": "./dist/public/"`, etc.). The cleanest option is to include a `plugin.json` at the npm package root that points to `dist/public/` component paths. See PITFALLS below.

### Anthropic's own marketplace (confirmed pattern)

The official Anthropic marketplace lives at `https://github.com/anthropics/claude-code/.claude-plugin/marketplace.json` — a file inside the main claude-code repo. All 13 official plugins use relative path sources (`"./plugins/<name>"`). This confirms the pattern: marketplace catalog and plugins in the same repo is valid.

---

## 2. npm Publish for a Scoped Public ESM CLI

**Confidence: HIGH** — from docs.npmjs.com and npm CLI docs (official npm documentation, 2026-06-30).

### Required `package.json` changes from current state

Current `package.json` has `"name": "motto"` (unscoped). For v0.0.3 distribution:

```json
{
  "name": "@jeremiewerner/motto",
  "version": "0.0.3",
  "type": "module",
  "description": "Framework for authoring, validating, and packaging Claude Code Agent Skills",
  "bin": {
    "motto": "./bin/motto.js"
  },
  "files": [
    "bin/",
    "src/",
    "dist/public/"
  ],
  "engines": {
    "node": ">=20"
  },
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "yaml": "^2.9.0"
  },
  "devDependencies": {
    "husky": "^9.1.7"
  }
}
```

**Field-by-field rationale:**

| Field | Value | Why |
|-------|-------|-----|
| `name` | `"@jeremiewerner/motto"` | Scoped to your npm username. Requires `publishConfig.access: "public"` because scoped packages default to private. |
| `publishConfig.access` | `"public"` | Without this, `npm publish` of a scoped package fails or publishes private (paid plan required). Can also pass `--access public` at publish time, but `publishConfig` is less error-prone. |
| `bin` | `{ "motto": "./bin/motto.js" }` | Maps the `motto` command to the entry point. The shebang `#!/usr/bin/env node` must be on line 1 of `bin/motto.js`. |
| `type` | `"module"` | Already present. Ensures all `.js` files are treated as ESM. |
| `files` | `["bin/", "src/", "dist/public/"]` | Allowlist. Without this, `node_modules/`, `test/`, `.planning/`, `.husky/`, `.claude/`, etc. would all be published. `package.json`, `README.md`, and `LICENSE` are always included automatically regardless. |
| `exports` | (omit or add if needed) | For a CLI-only package with no importable library surface, `exports` is optional. Omit it unless downstream code needs to `import from '@jeremiewerner/motto'`. |

**What `files` automatically includes (always, regardless of allowlist):**
- `package.json`
- `README*` (any case/extension)
- `LICENSE*`
- `CHANGELOG*`

**What gets excluded if `files` is set:**
- `test/`, `.planning/`, `.husky/`, `.claude/`, `node_modules/`, `.git/`, `motto.yaml`, `.gitignore`, `.npmignore`

**Husky + `prepare` script:** The current `"prepare": "husky"` in `package.json` does NOT run for consumers installing the package as a dependency — it only runs during `npm install` in the package's own repo checkout (and before `npm publish`). Safe to leave as-is.

### Publish commands

```bash
# Verify what will be published (dry run — no actual upload)
npm pack --dry-run

# Or full dry run
npm publish --dry-run

# Actual publish (publishConfig.access:public handles the --access flag)
npm publish

# First publish (if publishConfig is not set, or to be explicit)
npm publish --access public
```

### Scoped package behavior

- First publish of a scoped package **defaults to private** if `publishConfig.access` is absent and `--access public` is not passed.
- On subsequent publishes, the access level is sticky — once public, stays public.
- The `publishConfig.access: "public"` in `package.json` is the safest approach: it's declarative and never forgotten.

### Version / tag hygiene

```bash
# Standard release
npm version patch    # bumps 0.0.2 → 0.0.3, creates git tag
git push --follow-tags
npm publish

# Pre-release (dist-tag: beta)
npm version prerelease --preid=beta   # → 0.0.3-beta.0
npm publish --tag beta
```

The `npm version` command updates `package.json` version AND creates a git tag. The release skill currently does this manually (update both `package.json` and `motto.yaml`). The `npm version` command only touches `package.json` — `motto.yaml` still needs a manual bump.

### No new dependencies introduced

`npm publish` itself adds zero runtime dependencies. The `publishConfig` field is a `package.json` convention, not a package.

---

## 3. Zip Output for Claude Desktop / Claude.ai Web Skill Upload

**Confidence: MEDIUM** — from official Anthropic support docs (support.claude.com) cross-checked with community posts. Claude Desktop zip upload is distinct from Claude Code plugin system.

### What Claude Desktop / Claude.ai web expects

**Important distinction:** The `--zip` feature is for the **Claude.ai web app and Claude Desktop** skill upload UI, not for Claude Code's plugin/marketplace system. These are two different distribution channels:

| Channel | How it works |
|---------|-------------|
| Claude Code plugins (marketplace) | `/plugin marketplace add` + `/plugin install` — no zip, installed via git/npm |
| Claude.ai web / Claude Desktop | Upload a `.zip` via Customize > Skills UI |

**Expected zip structure for Claude.ai/Claude Desktop upload:**

The zip must contain a **top-level folder** named after the skill. `SKILL.md` is inside that folder, not at the zip root.

```
author-skill.zip
└── author-skill/
    ├── SKILL.md          ← required
    └── references/
        └── skill-schema.md  ← optional supporting files
```

Critical: if `SKILL.md` sits at the zip root (not inside a folder), the upload succeeds but the skill silently fails to activate. The folder name should match the `name` field in SKILL.md frontmatter.

**Error messages seen in the wild:**
- "ZIP file exceeds size limits"
- "Skill folder name doesn't match the skill name"
- "Missing required skill.md file" (means SKILL.md was at zip root or missing)

### What Motto would zip

Motto builds `dist/public/` with skills under subdirectories (`author-skill/`, `setup-project/`). For Claude.ai/Desktop upload, each skill becomes its own zip:

```
dist/public/author-skill/ → author-skill.zip (contains author-skill/SKILL.md)
dist/public/setup-project/ → setup-project.zip (contains setup-project/SKILL.md)
```

The entire `dist/public/` could also be offered as a single zip for the Claude Code `@skills-dir` use case, where users drop it into `~/.claude/skills/`.

### The dependency tension: Node.js has no stdlib zip

**This is the key engineering decision for the `--zip` flag.**

Node.js `node:zlib` provides the deflate algorithm but not the ZIP container format. Confirmed by GitHub issue nodejs/node#45434 (opened November 2022, still open/undecided as of 2026). There is no native `zip()` in Node.js stdlib.

**Options, evaluated against Motto's zero-extra-dep philosophy:**

| Option | Dep added | Portability | Complexity | Verdict |
|--------|-----------|------------|------------|---------|
| Shell out to `zip` command | None | macOS/Linux only, fails on Windows | Low | Reject if Windows matters |
| Shell out to `zip` with Windows fallback via PowerShell `Compress-Archive` | None | Cross-platform but fragile | High | Avoid |
| `fflate` npm package | +1 dep | Full (pure JS, ESM-native) | Low | Accept |
| Write ZIP from scratch with `node:zlib` | None | Full | Very high (ZIP format has real edge cases) | Avoid |
| Skip in-process zip; output a shell snippet or instruction | None | N/A | None | Valid fallback |

**`fflate` profile:**
- 33KB full build, 12.5KB gzipped
- ~51M weekly downloads (mid-2025)
- Pure JavaScript, no native bindings
- Explicitly supports ESM: `import { zip } from 'fflate'`
- Supports ZIP creation with deflate compression
- Well-maintained (101arrowz/fflate on GitHub)
- No transitive dependencies

**Recommendation:** Accept `fflate` as a second runtime dependency, and be explicit about this in `motto.yaml`/docs. The strict "single dep" rule was a starting constraint, not a permanent ceiling. If `--zip` is a shipping feature, `fflate` is the right tool. Alternatively, scope `--zip` as a `zip`-shell-out with a clear "requires `zip` in PATH" error message and document that it's Unix-only — this delays the dependency decision to a later milestone.

**Decision needed by roadmap:** Commit to one approach before implementing `--zip`. Both are valid for v0.0.3; the shell-out approach is simpler and avoids touching the dep count, but makes Windows a second-class citizen. The `fflate` approach is the correct long-term answer.

---

## 4. `motto-release` Skill Gap Analysis

Current state of `skills/release/SKILL.md` Step 5 (Publish):
```
<!-- TODO: expand when npm packaging is configured -->
npm packaging is not yet finalized. Once configured, the publish step will be:
npm publish
For now, skip this step and distribute the `dist/` artifacts directly when needed.
```

**What the real Step 5 must become:**

```markdown
## Step 5 — Publish

Prerequisite: `package.json` must have `"name": "@jeremiewerner/motto"` and
`"publishConfig": { "access": "public" }`.

```bash
# Verify tarball contents before publishing
npm pack --dry-run

# Publish to npm registry
npm publish
```

This publishes the CLI (`@jeremiewerner/motto`) and the bundled plugin (`dist/public/`)
in a single step. After publish, update `marketplace.json` if the plugin entry pins
a specific `version` field.
```

**After npm publish, two more steps are needed that the current skill doesn't mention:**

1. **Update `marketplace.json` version pin** — if `.claude-plugin/marketplace.json` pins `"version": "0.0.3"` in the plugin entry, bump it to the new version. If left unset, users always get latest-published (simpler, less control).

2. **Push the git tag** — current Step 4 creates the tag locally (`git tag vX.Y.Z`) but doesn't push it. Add `git push origin vX.Y.Z` or `git push --follow-tags`.

**Full wired Step 5 for the roadmap to implement:**
```bash
# Dry run first
npm pack --dry-run

# Publish (access is set in publishConfig, no flag needed)
npm publish

# Push tag (missing from current Step 4)
git push --follow-tags

# If marketplace pins a version, update .claude-plugin/marketplace.json now
# and push that commit
```

---

## 5. Putting It Together: Recommended Repo Layout for v0.0.3

```
motto/                              ← npm package root (@jeremiewerner/motto)
├── .claude-plugin/
│   └── marketplace.json            ← Motto's marketplace catalog (NEW)
├── bin/
│   └── motto.js                    ← CLI entry point (published)
├── src/
│   └── *.js                        ← Library modules (published)
├── dist/
│   ├── public/                     ← Published plugin (published via `files`)
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── author-skill/
│   │   │   └── SKILL.md
│   │   └── setup-project/
│   │       └── SKILL.md
│   └── private/                    ← Not published (omit from `files`)
│       └── release/
│           └── SKILL.md
├── skills/                         ← Source skills (not published)
├── test/                           ← Tests (not published)
├── package.json                    ← name: @jeremiewerner/motto, files: [bin/, src/, dist/public/]
└── motto.yaml
```

**Open question:** When Claude Code uses `source: { "source": "npm", "package": "@jeremiewerner/motto" }`, it installs the npm package and treats the package root as the plugin root. But `plugin.json` is at `dist/public/.claude-plugin/plugin.json`, not at the package root. The marketplace entry will need component path overrides:
```json
{
  "name": "motto-skills",
  "source": { "source": "npm", "package": "@jeremiewerner/motto" },
  "skills": "./dist/public/",
  "strict": false
}
```
Or: add a `plugin.json` at the npm package root that delegates to `dist/public/` paths. Either works; the marketplace entry approach is simpler and avoids touching the built artifact.

---

## Confidence Summary

| Topic | Confidence | Source |
|-------|-----------|--------|
| Marketplace `marketplace.json` schema | HIGH | Official Claude Code docs (code.claude.com), cross-checked with Anthropic's own repo |
| Plugin `plugin.json` schema | HIGH | Official Claude Code docs (code.claude.com/docs/en/plugins-reference) |
| npm source type for plugins | HIGH | Official Claude Code docs (code.claude.com/docs/en/plugin-marketplaces#plugin-sources) |
| npm publish, scoped packages, `publishConfig` | HIGH | Official npm docs (docs.npmjs.com) |
| `files` allowlist behavior | HIGH | Official npm docs + npm/cli wiki |
| Zip structure for Claude.ai/Desktop upload | MEDIUM | Anthropic support docs + community cross-check (structure confirmed by error message analysis) |
| No Node.js stdlib zip | HIGH | nodejs/node#45434 (official issue, confirmed open) |
| `fflate` as zip solution | HIGH | npm registry + GitHub (51M weekly downloads, ESM-native) |

---

## Decisions Needed Before Implementation

1. **npm source path for plugin:** Does the marketplace entry use `"skills": "./dist/public/"` path override, or does `motto build` also emit a `plugin.json` at the npm package root? (Recommend: marketplace entry path override — zero build changes.)

2. **`--zip` dependency strategy:** Accept `fflate` as second runtime dep, OR shell-out to `zip` (Unix-only), OR skip in-process zip entirely and document manual command. (Recommend: shell-out with a clear error if `zip` not in PATH, defer `fflate` to if Windows matters.)

3. **Marketplace version pinning strategy:** Pin `"version"` in marketplace.json entries (more control, manual update on each release) OR omit version (always latest, simpler). (Recommend: omit version for now; add pinning in a later milestone when stability warrants it.)

---

## Sources

- [Create and distribute a plugin marketplace — Claude Code Docs](https://code.claude.com/docs/en/plugin-marketplaces) — fetched 2026-06-30
- [Plugins reference — Claude Code Docs](https://code.claude.com/docs/en/plugins-reference) — fetched 2026-06-30
- [Anthropic official marketplace.json](https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json) — fetched 2026-06-30
- [Creating and publishing scoped public packages — npm Docs](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) — fetched 2026-06-30
- [npm-publish CLI reference — npm Docs](https://docs.npmjs.com/cli/v11/commands/npm-publish/) — fetched 2026-06-30
- [Use skills in Claude — Anthropic Help Center](https://support.claude.com/en/articles/12512180-use-skills-in-claude) — fetched 2026-06-30
- [Native zip support issue — nodejs/node#45434](https://github.com/nodejs/node/issues/45434) — fetched 2026-06-30
- [fflate — npm](https://www.npmjs.com/package/fflate) — fetched 2026-06-30

---

## Claude Desktop distribution (challenge)

**Researched:** 2026-07-01
**Purpose:** Adversarially re-check the prior MEDIUM-confidence claim (Section 3) that Motto should emit a ZIP for "Claude.ai web / Claude Desktop skill upload." Goal: build zip ONLY if it is genuinely the right/necessary mechanism; otherwise recommend the simplest alternative and skip it.

### TL;DR verdict

**Do NOT build a zip feature in v0.0.3. NO.** The prior recommendation conflated two distinct channels and overstated the need. "Claude Desktop" is not one skill-loading surface — it is three tabs (Chat, Cowork, Code), and the one that matters for a developer distributing Motto skills, the **Code tab, IS Claude Code** — it reads the exact same plugins/marketplaces and `~/.claude/skills/` directories as the CLI, with **zero zip involved**. ZIP is required only for the consumer Chat/Cowork/web "Customize > Skills" upload UI — a manual, paid-plan-gated, code-execution-gated channel that is not Motto's primary audience and that a user can satisfy in one `zip -r` command when they actually need it. Building an in-process zipper (fflate dep or `zip` shell-out) to serve that niche is premature — classic YAGNI violation.

### 1. Does Claude Desktop consume Agent Skills, and how? — Confidence: HIGH

Yes, but via **two separate mechanisms** in the same app. The Claude Desktop app (macOS/Windows/Linux) has three tabs: **Chat**, **Cowork**, and **Code**.

| Surface | Mechanism | Zip? | Gating |
|---------|-----------|------|--------|
| **Code tab** (= Claude Code embedded) | Plugins/marketplaces + `~/.claude/skills/` + project `.claude/skills/` — identical to the CLI | **No** | None beyond a Claude Code plan |
| **Chat / Cowork tabs** + claude.ai web | Upload a `.zip` via **Customize > Skills** UI ("+" → "+ Create skill") | **Yes (only path)** | Code execution enabled; Pro/Max/Team/Enterprise |

The Code tab explicitly supports installing plugins from configured marketplaces (including the official Anthropic marketplace) without the terminal, and loading custom/personal/project/plugin skills — "those plugins are available in desktop sessions the same way they are in the CLI." (source: code.claude.com/docs/en/desktop, sections "Use skills" and "Install plugins"). So option (a) marketplace AND (d) shared config with Claude Code are both true for the Code tab. Option (b) zip upload is true only for Chat/Cowork/web.

### 2. Is a ZIP actually required for any path? — Confidence: HIGH

**Only for the Chat/Cowork/web "Customize > Skills" upload — and there it is the sole path.** For Claude Code (CLI or Desktop Code tab), zip is dead weight: skills load from plain directories, and marketplaces/npm handle remote distribution. There is no filesystem "skills folder" upload for Chat/Cowork — you must upload a `.zip`.

When zip IS used, the prior research's structure claim is **CONFIRMED correct**: the zip must contain a **top-level folder named after the skill**, with `SKILL.md` inside it — NOT `SKILL.md` at the zip root.

```
my-skill.zip
└── my-skill/
    ├── SKILL.md
    └── resources/...   (optional supporting files)
```

Docs render the filename lowercase (`skill.md`) but the Agent Skills standard and Motto's output use `SKILL.md`; matching is case-insensitive in practice. Folder name should match the skill `name`. Files at zip root = rejected/non-functional. "ZIP file exceeds size limits" is a documented failure (no numeric limit published). (source: support.claude.com/en/articles/12512198-how-to-create-custom-skills)

### 3. Single easiest way for a same-machine Motto user — Confidence: HIGH

The user already has `dist/public/<skill>/SKILL.md` directories from `motto build`. Ranked by fewest steps + zero new deps:

1. **Symlink each built skill into `~/.claude/skills/` (BEST, zero deps).** Claude Code personal skills live at `~/.claude/skills/<name>/SKILL.md` and **symlinks are explicitly supported** — "A `<skill-name>` entry can be a symlink to a directory elsewhere on disk. Claude Code follows the symlink and reads `SKILL.md` from the target." Live change detection means edits to the built skill appear in-session without restart. One command: `ln -s "$PWD/dist/public/author-skill" ~/.claude/skills/author-skill`. Works for the CLI and the Desktop Code tab. (source: code.claude.com/docs/en/skills, "Where skills live")
2. **Copy instead of symlink** — `cp -R dist/public/<skill> ~/.claude/skills/` — same result, no live sync. Trivial.
3. **Marketplace/npm plugin** (Section 1) — best for *distributing to others*, slight overkill for the author's own machine but already planned and zero extra build work for Desktop.
4. **Zip + Customize > Skills upload** — only if the user specifically wants the skill in the **Chat/Cowork** tabs or claude.ai web. Manual UI, paid plan, code execution required.

For the developer audience Motto targets, option 1 or 2 is the answer, and neither needs a Motto feature — it is one shell line Motto can print in `motto build` output or document in the release skill.

### 4. IF zip were warranted: cheapest implementation — Confidence: HIGH

Not warranted now, but for the record, aligned with YAGNI:
- **Don't add fflate.** A second runtime dependency to serve a manual, niche UI channel violates the single-dep philosophy for near-zero benefit.
- **Don't hand-roll a ZIP writer** with `node:zlib` — real edge cases, high maintenance.
- **If ever needed, shell out to `zip`** (`zip -r <skill>.zip <skill>/` run inside `dist/public/`), zero deps, with a clear "requires `zip` in PATH" error. Windows lacks `zip` but has `Compress-Archive` (PowerShell) — cross-platform handling is fragile, which is itself an argument for punting.
- **Cheapest of all: document the one-liner.** Tell the user exactly what to run; Motto builds correct folder structure already, so the zip is trivial for them.

### 5. Bottom line — Confidence: HIGH

**Motto v0.0.3 should NOT ship a zip feature.** The primary Claude Desktop skill path for developers (the Code tab) is Claude Code and is already covered by the marketplace/npm plugin work plus the built `dist/public/` directories — no zip, no new code. For the author's own machine, a symlink or copy into `~/.claude/skills/` is one shell line and needs no Motto feature. ZIP is required only for the consumer Chat/Cowork/web upload UI, which is a manual, paid- and code-execution-gated channel outside Motto's core audience; if a user wants that, the correct-structured folder Motto already produces zips with a single `zip -r` command. Recommended action instead of building `--zip`: (a) drop `--zip` from the roadmap, (b) have `motto build` (or the release skill / README) print the two copy-paste snippets — the symlink-into-`~/.claude/skills/` command and, for the web upload edge case, the `cd dist/public && zip -r <skill>.zip <skill>/` command. Revisit only if real user demand for one-command web-upload packaging materializes.

### Sources (challenge section)

- [Desktop application — Claude Code Docs](https://code.claude.com/docs/en/desktop) — fetched 2026-07-01 (three tabs; Code tab = Claude Code; "Use skills" and "Install plugins" sections; plugins/marketplaces work same as CLI)
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills) — fetched 2026-07-01 (personal `~/.claude/skills/<name>/SKILL.md`, project `.claude/skills/`, symlink support, live change detection)
- [How to create custom skills — Claude Help Center](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills) — fetched 2026-07-01 (ZIP = folder-named-after-skill with SKILL.md inside; root files fail)
- [Use skills in Claude — Claude Help Center](https://support.claude.com/en/articles/12512180-use-skills-in-claude) — fetched 2026-07-01 (Customize > Skills upload; code execution required; Pro/Max/Team/Enterprise; org-wide provisioning)
