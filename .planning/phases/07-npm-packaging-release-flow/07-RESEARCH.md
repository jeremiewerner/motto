# Phase 7: npm Packaging & Release Flow — Research

**Researched:** 2026-07-01
**Domain:** npm packaging, lifecycle scripts, release automation
**Confidence:** HIGH (core mechanics verified by local runs; lifecycle confirmed empirically)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Locked upstream (PROJECT.md / `.planning/research/distribution.md`) — NOT re-decided here:
scoped name `@jeremiewerner/motto`, version `0.0.3`, `publishConfig.access: "public"`,
`files` allowlist = `bin/`, `src/`, `dist/public/`; release flow does real `npm publish` +
`git push --follow-tags` + manual `motto.yaml` bump.

- **D-01:** License is MIT. Add `LICENSE` file at repo root and `"license": "MIT"` in `package.json`.
- **D-02:** Add full `package.json` metadata: `license`, `description`, `repository`, `author`, `homepage`, `keywords`. Reuse existing values.
- **D-03:** Add `"prepublishOnly": "node bin/motto.js build"` to `package.json` scripts so `dist/public/` is always rebuilt before publish. Note: `prepublishOnly` does NOT fire on `npm pack --dry-run`, so the D-05 verify step inspects whatever `motto build` last emitted.
- **D-04:** Use `npm version X.Y.Z` to bump `package.json` and create the git commit + tag in one step, plus a manual `motto.yaml` version edit. Gotcha: `npm version` refuses a dirty working tree by default — sequence the `motto.yaml` edit as an amend after `npm version`, or use `-f`, or stage yaml into the version commit. Spell the exact command order out in the skill.
- **D-05:** The verify step is a scripted assertion: run `npm pack --dry-run --json`, parse the file list, and hard-fail the release if any path outside `bin/`, `src/`, `dist/public/` (plus auto-included `package.json`/`README`/`LICENSE`) appears. Pure shell — no new dependency.

### Claude's Discretion

- Exact `package.json` field ordering, `keywords` list contents, and the precise shell of the D-05 assertion are left to the planner/executor.
- Whether `dist/` stays git-tracked or is `.gitignore`d (as long as the pack-time file list and prepublishOnly hook stay consistent).

### Deferred Ideas (OUT OF SCOPE)

- `.claude-plugin/marketplace.json` + `source: npm` skills override — Phase 8.
- README install docs — Phase 9.
- CI (GitHub Actions) publish automation — deferred.
- `--zip` build feature — dropped for v0.0.3.
- npm 2FA / `.npmrc` publish-auth ergonomics — not raised; standard `npm login` assumed.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NPM-01 | Global install via `npm i -g @jeremiewerner/motto` exposes `motto` command | `bin` field + shebang verified; global install links to `{prefix}/bin` |
| NPM-02 | `package.json` declares scoped name, `publishConfig.access: "public"`, `files` allowlist | D-02 full metadata pattern documented; files mechanics verified |
| NPM-03 | `package.json` version corrected to `0.0.3` (drift from `0.0.1`) | `npm version 0.0.3` command sequence documented |
| NPM-04 | `npm pack --dry-run` tarball contains only allowlisted paths — no leakage | D-05 assertion script pattern with verified `--json` output shape |
| REL-01 | `release` skill runs real publish flow (`npm pack --dry-run` verify → `npm publish`) | Exact lifecycle order documented; assertion script provided |
| REL-02 | `release` skill pushes release tag via `git push --follow-tags` | Confirmed works with npm version's default tag format `vX.Y.Z` |
| REL-03 | `release` skill bumps/notes `motto.yaml` version alongside `package.json` | `version` lifecycle script approach documented — cleanest solution |
</phase_requirements>

---

## Summary

This phase makes Motto publishable to npm as `@jeremiewerner/motto` and replaces the
release skill's TODO stub with a real end-to-end publish flow. The technical surface is
small: five `package.json` field additions, one new `LICENSE` file, and a rewrite of
`skills/release/SKILL.md` Steps 2/4/5.

The research focused on five command-level details the planner needs to write correct
tasks: (1) `npm pack --dry-run --json` output shape for the D-05 assertion, (2) which
lifecycle scripts fire on each npm command (especially the `--dry-run` / `prepublishOnly`
distinction), (3) the exact `npm version` dirty-tree gotcha and the cleanest workaround,
(4) how the `files` allowlist interacts with the `.gitignore`d `dist/` directory, and
(5) global install bin resolution.

All five were verified empirically against npm@11.11.0 / Node@24.14.1 (the project's
installed versions) plus cross-checked against official npm documentation.

**Primary recommendation:** Use a `version` lifecycle script in `package.json` to
auto-sync `motto.yaml` during `npm version`, eliminating the dirty-tree gotcha entirely.
This is the cleanest of the three D-04 workarounds and the one the planner should
implement.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| npm tarball composition | npm CLI | package.json `files` field | npm owns packing; `files` is the declarative control knob |
| dist/public freshness | `prepublishOnly` lifecycle | release skill Step 3 | Double-safety: hook auto-rebuilds; skill Step 3 also runs build |
| Version commit + tag | `npm version` command | `version` lifecycle script | npm version is the atomic operation; `version` script extends it |
| Tarball leak detection | D-05 Node inline script | `npm pack --dry-run --json` | Shell inline script parses JSON; no new dep needed |
| Global bin resolution | npm global install | `bin` field + shebang | npm creates symlink; shebang routes to Node |
| `motto.yaml` sync | `version` lifecycle script | — | Fires inside `npm version` commit; both files in same commit |

---

## Standard Stack

### No New Packages

This phase installs zero new runtime or dev dependencies. All required capabilities
are in the existing stack or npm's own CLI.

| Capability | Tool | Source |
|------------|------|--------|
| YAML version bump | Node.js inline `-e` script | stdlib |
| JSON parsing (D-05) | Node.js inline `-e` script | stdlib |
| Tarball composition | npm pack / npm publish | npm CLI (already present) |
| Version bump + tag | npm version | npm CLI (already present) |

**Installation:** None required.

---

## Package Legitimacy Audit

No new packages are installed in this phase. The only runtime dependency (`yaml@^2.9.0`)
and dev dependency (`husky@^9.1.7`) are unchanged from prior phases.

---

## Architecture Patterns

### System Architecture Diagram

```
Developer machine (clean working tree)
         |
         v
  npm version 0.0.3 -m "chore: release v%s"
         |
         |-- version script fires:
         |     node -e "sync motto.yaml" && git add motto.yaml
         |
         |-- npm version creates commit:
         |     package.json + motto.yaml + package-lock.json
         |
         |-- npm version creates tag: v0.0.3
         |
         v
  node bin/motto.js lint && node bin/motto.js build
  (dogfood check — ensures dist/public/ is current)
         |
         v
  npm pack --dry-run --json 2>/dev/null
         |
         |-- prepare (husky) fires → goes to stderr (ignored)
         |-- prepublishOnly does NOT fire
         |-- JSON file list on stdout
         |
         |-- node -e "parse JSON, assert no leaks" → pass or hard-fail
         |
         v
  npm publish
         |
         |-- prepublishOnly fires: node bin/motto.js build
         |-- prepare (husky) fires: harmless
         |-- tarball created from files allowlist
         |     (files overrides .gitignore → dist/public/ included)
         |-- tarball uploaded to registry.npmjs.org
         |
         v
  git push --follow-tags
```

### Recommended Project Structure (additions only)

```
motto/
├── LICENSE                 ← NEW: MIT license (D-01)
├── package.json            ← EDITED: name, version, files, publishConfig,
│                               license, description, repository, author,
│                               homepage, keywords, prepublishOnly, version script
└── skills/
    └── release/
        └── SKILL.md        ← EDITED: Steps 1/2/4/5 rewritten
```

### Pattern 1: `npm version` with `version` lifecycle script (D-04 clean solution)

**What:** Use the `version` npm lifecycle hook to auto-update `motto.yaml` inside the
same commit that `npm version` creates for `package.json`. The `version` script runs
AFTER the package.json bump but BEFORE the git commit, so files staged here land in
the version commit.

**When to use:** Every release. Eliminates the dirty-tree gotcha entirely.

```javascript
// In package.json scripts:
"version": "node -e \"const fs=require('fs'); let c=fs.readFileSync('motto.yaml','utf8'); c=c.replace(/^version: .+$/m,'version: \\\"'+process.env.npm_new_version+'\\\"'); fs.writeFileSync('motto.yaml',c);\" && git add motto.yaml"
```

Then the release version bump becomes a single command from a clean tree:

```bash
npm version 0.0.3 -m "chore: release v%s"
# Result: package.json bumped, motto.yaml synced, both committed,
#         tag v0.0.3 created, husky pre-commit (tests) runs
```

**Notes:**
- `npm_new_version` is the environment variable npm sets for the `version` script
- `process.env.npm_new_version` contains the new version string (e.g., `"0.0.3"`)
- The commit includes `package.json`, `motto.yaml`, and `package-lock.json`
- Default tag name: `v{version}` (e.g., `v0.0.3`) — no override needed
- The husky pre-commit hook runs `npm test` during this commit — intentional (tests gate the tag)
- To skip husky: add `--no-commit-hooks` flag (only if tests already ran in Step 1)

### Pattern 2: D-05 tarball assertion script

**What:** Parse `npm pack --dry-run --json` and hard-fail if any file path falls outside
the declared allowlist. Pure Node stdin pipe — no new dependency.

**When to use:** Step 4 of the release skill, after dogfood build, before `npm publish`.

```bash
# Source: local run + npm/npm commit 116e9d8 [VERIFIED: local npm@11.11.0]
npm pack --dry-run --json 2>/dev/null | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const data = JSON.parse(Buffer.concat(chunks));
  const files = data[0].files;                     // [{path, size, mode}]
  const allowed = ['bin/', 'src/', 'dist/public/'];
  const autoIncluded = ['package.json', 'README', 'LICENSE', 'CHANGELOG'];
  const isAllowed = p =>
    autoIncluded.some(a => p === a || p.startsWith(a)) ||
    allowed.some(a => p.startsWith(a));
  const leaks = files.filter(f => !isAllowed(f.path));
  if (leaks.length) {
    process.stderr.write('TARBALL LEAK — aborting release:\n');
    leaks.forEach(f => process.stderr.write('  ' + f.path + '\n'));
    process.exit(1);
  }
  process.stdout.write('Tarball clean: ' + files.length + ' files, all in allowlist\n');
});
"
```

**Important:** `npm pack --dry-run --json` stdout is clean JSON (verified: `2>/dev/null`
routes all lifecycle/notice output to stderr). The assertion reads from stdin.

### Pattern 3: Complete `package.json` target state

```json
{
  "name": "@jeremiewerner/motto",
  "version": "0.0.3",
  "type": "module",
  "description": "Framework for authoring, validating, and packaging Claude Code Agent Skills",
  "author": "Jérémie Werner",
  "license": "MIT",
  "repository": "github:jeremiewerner/motto",
  "homepage": "https://github.com/jeremiewerner/motto",
  "keywords": ["claude", "agent-skills", "claude-code", "cli"],
  "engines": { "node": ">=20" },
  "bin": { "motto": "./bin/motto.js" },
  "files": ["bin/", "src/", "dist/public/"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "prepare": "husky",
    "test": "node --test",
    "prepublishOnly": "node bin/motto.js build",
    "version": "node -e \"const fs=require('fs'); let c=fs.readFileSync('motto.yaml','utf8'); c=c.replace(/^version: .+$/m,'version: \\\"'+process.env.npm_new_version+'\\\"'); fs.writeFileSync('motto.yaml',c);\" && git add motto.yaml"
  },
  "dependencies": { "yaml": "^2.9.0" },
  "devDependencies": { "husky": "^9.1.7" }
}
```

### Pattern 4: Complete release skill flow (new Steps 2/4/5)

```markdown
## Step 1 — Pre-Release Gate: Tests

  node --test

Expected: `# pass 75` (or higher) and `# fail 0`.

## Step 2 — Version Bump

Starting from a clean working tree (no uncommitted changes):

  npm version 0.0.3 -m "chore: release v%s"

This command: bumps package.json to 0.0.3, runs the `version` lifecycle script
(auto-updates motto.yaml and stages it), creates a single commit with both files,
and creates git tag v0.0.3. The husky pre-commit hook re-runs tests during this
commit — if they fail, the commit is aborted.

## Step 3 — Dogfood Check

  node bin/motto.js lint && node bin/motto.js build

Expected: lint → `✓ N skills OK`; build exits 0 with dist/public/ populated.

## Step 4 — Tarball Verify

  npm pack --dry-run --json 2>/dev/null | node -e "[D-05 assertion — see RESEARCH.md]"

Expected: "Tarball clean: N files, all in allowlist". If any path outside
bin/, src/, dist/public/ (plus package.json/README/LICENSE) appears — STOP.

## Step 5 — Publish

  npm publish
  git push --follow-tags

`npm publish` runs prepublishOnly (rebuilds dist/public/) then uploads the tarball.
`git push --follow-tags` pushes both the release commit and tag v0.0.3 in one command.
```

### Anti-Patterns to Avoid

- **Editing motto.yaml before `npm version` (without version script):** `npm version` checks for a clean working tree before running. Staged or unstaged changes cause it to abort. The `version` lifecycle script is the fix — it runs inside the npm version flow.
- **Using `npm version --no-git-tag-version` as the solve for dirty tree:** The flag disables both the commit AND the tag, leaving you to manage git manually. Use the `version` script approach instead.
- **Running D-05 assertion without the `2>/dev/null` redirect:** The `prepare` script (husky) fires during `npm pack --dry-run` and outputs to stderr. Without the redirect, the JSON parser sees mixed output. `2>/dev/null` strips all lifecycle/notice noise.
- **Hardcoding test count in Step 1:** The release skill currently says `# pass 53` (stale — now 75). Use `# pass N or higher` to avoid re-staling on every test addition.
- **Adding an `.npmignore`:** With a `files` field, `.npmignore` at the root is redundant and confusing. `.npmignore` in subdirectories would override `files` for that subtree (dangerous). Don't add one.
- **Expecting `dist/public/` to be excluded because it's gitignored:** The `files` field overrides `.gitignore`. `dist/public/` in `files` IS included regardless of `.gitignore`. This is the intended behavior — `dist/` gitignored prevents it from being committed to the repo, but publishing from the built artifact is intentional.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Version bump across multiple files | Custom sync script | `version` lifecycle script + `npm_new_version` env var | npm provides the hook; it fires at the right moment in the commit sequence |
| Tarball file list | Custom walker | `npm pack --dry-run --json` | npm's own pack logic handles all edge cases (files field, gitignore, auto-includes) |
| Git tag creation | Manual `git tag` | `npm version` default behavior | Atomic: version bump + commit + tag in one command; handles package-lock.json too |
| Access control for scoped package | `--access public` flag at publish time | `publishConfig.access: "public"` in package.json | Declarative, never forgotten across publish invocations |

**Key insight:** npm's lifecycle hooks (`prepublishOnly`, `version`) exist precisely to
solve multi-file coordination problems. Using them means the tooling enforces invariants
automatically rather than relying on the human remembering step order.

---

## Common Pitfalls

### Pitfall 1: `npm version` dirty-tree refusal

**What goes wrong:** Developer edits `motto.yaml` (or any other file) before running
`npm version`, which refuses because the working tree is not clean.

**Why it happens:** `npm version` runs `git status --porcelain` and aborts on any
output (staged or unstaged tracked changes).

**How to avoid:** Use the `version` lifecycle script (Pattern 1 above). The script runs
INSIDE the `npm version` flow, after the package.json bump, and can stage additional
files. Start `npm version` from a clean tree; the script handles `motto.yaml`.

**Warning signs:** `npm version` exits with "Git working directory not clean."

---

### Pitfall 2: `prepare` fires during `npm pack --dry-run`

**What goes wrong:** The D-05 assertion script encounters mixed output on stdout when
`prepare` sends its output there.

**Why it happens:** `prepare` (husky) fires during `npm pack --dry-run` (CONFIRMED by
local run). Its output goes to stderr, not stdout. Without `2>/dev/null`, the terminal
shows both but the pipe only gets JSON — HOWEVER, if another `prepare` script were
added that writes to stdout, the JSON pipe would break.

**How to avoid:** Always redirect stderr: `npm pack --dry-run --json 2>/dev/null`.
The JSON is guaranteed to be the only stdout content.

**Warning signs:** `JSON.parse` error in the assertion script; mixed text before `[`.

---

### Pitfall 3: `dist/public/` missing from tarball

**What goes wrong:** `npm publish` (or `npm pack`) runs, but `dist/public/` is empty
or absent because `motto build` wasn't run.

**Why it happens:** `dist/` is gitignored, so `dist/public/` is not checked into git.
On a fresh clone or after `git clean -fd`, `dist/public/` does not exist. The
`prepublishOnly` script auto-runs `motto build` — but only during `npm publish`, not
during `npm pack --dry-run` (the verify step).

**How to avoid:** The release skill Step 3 (dogfood check) runs `node bin/motto.js build`
before Step 4 (dry-run verify). This sequencing ensures `dist/public/` is populated
before the assertion runs. Do not swap Steps 3 and 4.

**Warning signs:** D-05 assertion reports 0 files in `dist/public/`; `entryCount` in
the dry-run JSON is unexpectedly low.

---

### Pitfall 4: npm warn `gitignore-fallback` persists after adding `files`

**What goes wrong:** `npm warn gitignore-fallback No .npmignore file found, using .gitignore`
appears even after adding `files` field.

**Why it happens:** This is a false alarm — it goes away once `files` is set correctly.
The current project triggers it because `package.json` has no `files` field, so npm
falls back to `.gitignore`. Once `files` is added, npm uses it exclusively at the root.

**How to avoid:** Add the `files` field. Do NOT add `.npmignore` — it's redundant
and its subdirectory-override behavior can accidentally exclude files from `files`.

---

### Pitfall 5: Stale test count in release skill Step 1

**What goes wrong:** Release skill says `Expected: # pass 53` but tests now pass 75.
Maintainer sees mismatch and wastes time debugging.

**Why it happens:** Step 1 was written when there were 53 tests. Tests grow; the
hardcoded count wasn't updated.

**How to avoid:** Change the expectation to `# pass N (or higher) and # fail 0`
(open-ended lower bound). Verify the actual count at research time: currently **75**.

---

### Pitfall 6: `npm version` commit message mismatch with project convention

**What goes wrong:** Default npm version commit message is just `"0.0.3"` (no prefix).
Project convention (from current Step 4) is `"chore: release vX.Y.Z"`.

**Why it happens:** npm version's default `-m` value is the version number only.

**How to avoid:** Always pass `-m "chore: release v%s"` where `%s` is replaced with
the new version. Example: `npm version 0.0.3 -m "chore: release v%s"`.

---

## Code Examples

### Verified: npm pack --dry-run --json output shape

```json
// Source: local run, npm@11.11.0, Node@24.14.1 [VERIFIED: local run]
// Output is an array; index 0 is the tarball descriptor:
[
  {
    "id": "motto@0.0.1",
    "name": "motto",
    "version": "0.0.1",
    "size": 121059,
    "unpackedSize": 401026,
    "shasum": "...",
    "integrity": "sha512-...",
    "filename": "motto-0.0.1.tgz",
    "files": [
      { "path": "bin/motto.js", "size": 2048, "mode": 420 },
      { "path": "src/build.js",  "size": 4096, "mode": 420 }
    ],
    "entryCount": 7,
    "bundled": []
  }
]
```

Key: `path` values are relative with no `"package/"` prefix. `stdout` is clean JSON
when `2>/dev/null` is applied.

---

### Verified: lifecycle execution during npm pack --dry-run

```bash
# Source: local run on this project [VERIFIED: local run]
$ npm pack --dry-run

> motto@0.0.1 prepare       ← prepare fires (goes to stderr)
> husky

npm warn gitignore-fallback ...
npm notice 📦  motto@0.0.1
...
```

`prepublishOnly` did NOT appear. `prepare` DID appear. This is the documented behavior:
`prepublishOnly` is exclusive to `npm publish`.

---

### Verified: files field overrides gitignore

```bash
# .gitignore contains: dist/
# package.json files: ["bin/", "src/", "dist/public/"]
# Result: dist/public/ IS included in tarball despite gitignore
# Source: docs.npmjs.com/files/package.json#files [CITED: docs.npmjs.com]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `git add package.json motto.yaml && git commit` | `npm version` + `version` lifecycle script | npm 5+ | Atomic version + commit + tag; reduces human error |
| `.npmignore` to exclude files | `files` allowlist in `package.json` | npm 2+ | `files` is additive (allowlist); `.npmignore` is subtractive (blocklist); allowlist is safer |
| `--access public` flag at publish time | `publishConfig.access: "public"` in package.json | npm 3+ | Declarative; never forgotten |

**Deprecated/outdated:**
- **`.npmignore` at root with `files` field**: redundant and dangerous (subdirectory `.npmignore` overrides `files`). Use `files` only.
- **`prepare` for build steps**: `prepare` fires on `npm install` in a checkout AND on `npm pack`. Use `prepublishOnly` for publish-only build steps.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npm_new_version` env var is available in the `version` lifecycle script | Code Examples, Pattern 1 | `version` script would inject `undefined` into motto.yaml; `npm version` docs confirm it but not verified by local run | [ASSUMED from npm docs] |
| A2 | `-m "chore: release v%s"` produces commit message `"chore: release v0.0.3"` | Pattern 4 | Commit message convention mismatch; low impact | [ASSUMED from npm docs] |

All other findings were verified by local runs on npm@11.11.0 or by official npm docs.

---

## Open Questions

1. **`npm_new_version` in `version` script — should we verify before shipping?**
   - What we know: npm docs say lifecycle scripts receive `npm_old_version` and `npm_new_version`; this is the standard mechanism for custom version scripts
   - What's unclear: whether the env var name is exactly `npm_new_version` or `npm_package_version` or another form
   - Recommendation: Planner should add a smoke-test note: run `npm version 0.0.3-test --no-git-tag-version` on a scratch branch and verify motto.yaml is updated before landing. Or include `echo "version will be: $npm_new_version"` in the script during initial testing.

2. **Husky pre-commit during `npm version` — is this desired?**
   - What we know: `npm version` creates a git commit → husky pre-commit fires → `npm test` runs (75 tests, ~0.2s)
   - What's unclear: whether the maintainer wants tests to re-run at tag time (already ran in Step 1)
   - Recommendation: Keep it. Double-gating is a virtue. Add `--no-commit-hooks` to the version command as a comment-only escape hatch in the skill.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | All npm scripts, D-05 inline script | ✓ | v24.14.1 | — |
| npm | `npm version`, `npm pack`, `npm publish` | ✓ | 11.11.0 | — |
| git | `npm version` commit/tag, `git push --follow-tags` | ✓ | (present, used by husky) | — |
| npm registry auth | `npm publish` | ✗ (not verified) | — | `npm login` before publishing |

**Missing dependencies with no fallback:**
- **npm registry auth:** `npm publish` requires the developer to be logged in via `npm login`. The release skill should remind the maintainer to verify `npm whoami` before running Step 5.

**Missing dependencies with fallback:**
- None.

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`.

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — (no runtime auth; npm auth is pre-publish credential, out of scope) |
| V3 Session Management | No | — |
| V4 Access Control | Partial | `publishConfig.access: "public"` prevents accidental private publish |
| V5 Input Validation | No | No user input in packaging scripts |
| V6 Cryptography | No | npm handles package integrity (sha512 in pack output); no hand-rolled crypto |

### Known Threat Patterns for npm publishing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Skills/source leakage into tarball | Information Disclosure | `files` allowlist (NPM-04) + D-05 machine-checked assertion |
| Typosquatting on package name | Spoofing | Scoped name `@jeremiewerner/motto` is namespace-protected; unscoped `motto` is irrelevant |
| Dependency confusion | Spoofing | Only one dep (`yaml`); well-established package; `publishConfig.access: "public"` prevents confusion |
| Publishing to wrong registry | Tampering | No `.npmrc` registry override in project; defaults to registry.npmjs.org |
| Pre-commit hook bypass during npm version | Elevation of privilege | Default: hooks run; `--no-commit-hooks` only as documented escape hatch |

**No new attack surface introduced:** This phase adds no new runtime code paths, no new
packages, and no network-accessible endpoints. The security concerns are entirely around
publish-time supply-chain hygiene, which D-05 addresses mechanically.

---

## Sources

### Primary (HIGH confidence — verified by local run)

- **Local npm@11.11.0 run** — `npm pack --dry-run --json` output shape; lifecycle scripts; `prepare` firing; gitignore override behavior. [VERIFIED: local run, 2026-07-01]

### Secondary (MEDIUM confidence — official docs)

- **[npm pack — npm Docs](https://docs.npmjs.com/cli/v10/commands/npm-pack)** — `--dry-run`, `--json` flags. [CITED: docs.npmjs.com]
- **[npm scripts — npm Docs](https://docs.npmjs.com/cli/v11/using-npm/scripts)** — lifecycle execution order for publish/pack. [CITED: docs.npmjs.com]
- **[npm version — npm Docs](https://docs.npmjs.com/cli/v11/commands/npm-version)** — dirty-tree check, `version` script, `--no-git-tag-version`, `-m` flag. [CITED: docs.npmjs.com]
- **[package.json #files — npm Docs](https://docs.npmjs.com/files/package.json#files)** — files field overrides gitignore; auto-included files; `.npmignore` interaction. [CITED: docs.npmjs.com]
- **[npm install #global — npm Docs](https://docs.npmjs.com/cli/v10/commands/npm-install#global)** — global bin linking to `{prefix}/bin`. [CITED: docs.npmjs.com]
- **[npm/npm commit 116e9d8](https://github.com/npm/npm/commit/116e9d8271d04536522a7f02de1dde6f91ca5e6e)** — `--dry-run --json` output shape fields (`id`, `name`, `version`, `files`, `bundled`, etc.). [CITED: github.com/npm/npm]

### Tertiary (LOW confidence — web search only)

- WebSearch results on npm version dirty-tree + staged changes behavior, `--no-git-tag-version` bugs in npm v7+. [ASSUMED where not cross-checked]

---

## Metadata

**Confidence breakdown:**
- npm pack --dry-run --json shape: HIGH — verified by local run on npm@11.11.0
- Lifecycle hook order: HIGH — verified by local run + npm docs
- files/gitignore interaction: HIGH — local run + npm docs
- npm version behavior: MEDIUM — npm docs + web search (local run intentionally skipped to avoid modifying project)
- Global install bin: MEDIUM — npm docs (standard, well-known behavior)

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (npm lifecycle/pack behavior is stable; check again before major npm version upgrade)
