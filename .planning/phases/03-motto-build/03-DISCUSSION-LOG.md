# Phase 3: motto build - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 3-motto-build
**Areas discussed:** Copy mechanics, Private-bucket edge, plugin.json shape, Wipe & reporting

---

## Copy mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Whole dir verbatim; collision = error | fs.cp skills/<name>/ recursive, symlinks preserved; shared refs overlay references/; shared/local basename collision → build error | ✓ |
| Whole dir; shared overwrites local | Same copy, shared ref silently overwrites same-named local file | |
| SKILL.md + declared refs only | Emit only SKILL.md + bundled shared refs (drops local references/scripts) | |

**User's choice:** Whole dir verbatim; collision = build error → D3-04, D3-05, D3-06, D3-07.

---

## Private-bucket edge

| Option | Description | Selected |
|--------|-------------|----------|
| Build error; public always emits | audience:private + plugins.private unset → build error, exit 1, write nothing; dist/public/ always emitted; private only when both conditions met | ✓ |
| Skip private skills silently | Omit private skills when plugins.private unset; emit only public | |
| Add the cross-check to lint | Make it a lint error (retrofit shipped Phase 2 lint) | |

**User's choice:** Build error; public always emits → D3-10, D3-11, D3-12.

---

## plugin.json shape

| Option | Description | Selected |
|--------|-------------|----------|
| name=plugins.<audience>, version+desc from motto.yaml | public→plugins.public, private→plugins.private; version+description from top-level; exactly 3 fields | ✓ |
| name = project name for both buckets | Both use motto.yaml top-level name | |
| 3 fields + passthrough extras | name/version/description + any other plugin keys | |

**User's choice:** name=plugins.<audience>, version+desc from motto.yaml, 3 fields only → D3-13, D3-14.

---

## Wipe & reporting

| Option | Description | Selected |
|--------|-------------|----------|
| Wipe whole ./dist; report dir + counts | rm -rf ./dist on passing build, then fresh write; success prints dir + N skills/M plugins; abort before any write on lint fail | ✓ |
| Wipe only buckets being written | Remove just public/ (+private/), leave rest of dist/ | |
| Error if dist/ exists | Refuse to overwrite; require manual clean | |

**User's choice:** Wipe whole ./dist; report dir + counts → D3-02, D3-03, D3-16.

## Claude's Discretion

- Lint/build data reuse: build re-reads from disk vs refactor lintProject to expose parsed skills/config.
- Module decomposition: prefer new src/build.js exporting buildProject(cwd) → {ok, outDir, errors}.
- Exact fs.cp symlink-preservation option for the target Node version; exact build error/success wording.

## Deferred Ideas

- `--zip` output (v2 CLIX-03).
- plugin.json passthrough fields.
- MCP dependencies resolution at build.
- Incremental/cached builds (rejected — full wipe).
- Distribution layer (Motto-as-plugin, global install).
