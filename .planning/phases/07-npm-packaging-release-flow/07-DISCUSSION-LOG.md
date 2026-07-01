# Phase 7: npm Packaging & Release Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 7-npm-packaging-release-flow
**Areas discussed:** Package metadata + LICENSE, dist/public freshness, Version-bump mechanics, Tarball verify rigor

---

## Package metadata + LICENSE — License

| Option | Description | Selected |
|--------|-------------|----------|
| MIT | Permissive standard for OSS tooling; LICENSE file + `"license": "MIT"` | ✓ |
| Apache-2.0 | Permissive + patent grant; heavier LICENSE | |
| Keep it closed | `"license": "UNLICENSED"`, no LICENSE file | |

**User's choice:** MIT
**Notes:** Repo is private but the published tarball is public, so a license is warranted.

## Package metadata + LICENSE — Metadata scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full | license, description, repository, author, homepage, keywords | ✓ |
| Minimal | just license + description | |

**User's choice:** Full
**Notes:** description/author reuse motto.yaml + PROJECT.md; repository → private `jeremiewerner/motto`.

---

## dist/public freshness

| Option | Description | Selected |
|--------|-------------|----------|
| prepublishOnly hook | `"prepublishOnly": "node bin/motto.js build"` | ✓ |
| prepack hook | build on prepack (also fires for `npm pack`) | |
| Rely on committed dist/ | no hook; trust release skill Step 3 | |

**User's choice:** prepublishOnly hook
**Notes:** Safety net independent of the release skill. Doesn't fire on `npm pack --dry-run` — verify step inspects last `motto build` output; release Step 3 builds first, so ordering holds.

---

## Version-bump mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| npm version + manual yaml | `npm version` bumps package.json + tags; manual motto.yaml edit | ✓ |
| Manual both files | hand-edit both files, explicit commit + tag | |

**User's choice:** npm version + manual yaml
**Notes:** `npm version` refuses a dirty tree by default — planner must spell out motto.yaml sequencing (amend / `-f` / stage into version commit).

---

## Tarball verify rigor

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted assertion | parse `npm pack --dry-run --json`, hard-fail on non-allowlisted paths | ✓ |
| Human eyeball | print file list, maintainer confirms | |

**User's choice:** Scripted assertion
**Notes:** Makes NPM-04 machine-checked. Pure shell — no new dep.

---

## Claude's Discretion

- package.json field ordering, `keywords` contents, exact D-05 assertion shell.
- Whether `dist/` stays git-tracked or is `.gitignore`d (must stay consistent with prepublishOnly + pack file list).

## Deferred Ideas

- marketplace.json / `source: npm` override — Phase 8.
- README install docs — Phase 9.
- CI publish automation — backlog.
- `--zip` feature — dropped (v0.0.3).
- npm 2FA / `.npmrc` publish-auth — not raised; standard `npm login` assumed.
