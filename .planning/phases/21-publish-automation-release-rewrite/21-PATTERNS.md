# Phase 21: Publish Automation & Release Rewrite - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 3 (all modified, no new files)
**Analogs found:** 3 / 3 (all self-referential — each file's own existing structure/sibling jobs are the analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `.github/workflows/ci.yml` (add `publish` job + `tags: ['v*']` trigger + `npm-drift` guard) | CI orchestration / config | event-driven (push-triggered, external write) | Existing `npm-drift`/`pack-install-e2e` jobs in the same file | exact (same file, sibling job pattern) |
| `scripts/pack-install-e2e.mjs` (add `assertTarballClean(packedFiles)` call, D-05) | utility / CI script | batch (spawn subprocess, assert, throw-on-fail) | The file's own `run()`/`parseJsonOrFail()` helpers + `scripts/npm-drift-check.mjs` sibling style | exact (extend existing file in place) |
| `skills/release/SKILL.md` (rewrite Steps 4-6) | config / documentation (procedure skill) | request-response (human-run checklist) | `skills/changelog/SKILL.md` (procedure template, git-only `allowed-tools`, numbered `<process>` steps) | role-match (same `template: procedure` schema, same frontmatter shape) |

## Pattern Assignments

### `.github/workflows/ci.yml` (CI orchestration, event-driven)

**Analog:** the file itself — `npm-drift` job (lines 60-66) and `pack-install-e2e` job (lines 46-59)

**Trigger block pattern** (lines 3-7, current):
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```
Add `tags: ['v*']` under `push:` alongside `branches: [main]` (per RESEARCH.md Pattern 1/2 — this produces two separate workflow runs per `git push --follow-tags`, one per updated ref).

**Existing job shape to copy checkout/setup-node conventions from** (lines 60-66, `npm-drift` — closest analog for a lean, single-purpose job):
```yaml
  npm-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 20
      - run: node scripts/npm-drift-check.mjs
```
For the new `publish` job: same `actions/checkout@v6` + `actions/setup-node@v6` shape, but `node-version: 24` (PUB-01 explicit pin — do NOT copy the `20` used by every other job) plus `registry-url: 'https://registry.npmjs.org'` and `cache: 'npm'`.

**Guard-and-skip pattern to add to `npm-drift`** (mirrors nothing existing — new `if:` line):
```yaml
  npm-drift:
    if: github.ref == 'refs/heads/main'   # NEW — skip on tag-triggered runs and PRs
    runs-on: ubuntu-latest
    ...
```

**Job-level `permissions:` override pattern** — no existing analog in this file (workflow-level `permissions: { contents: read }` at lines 13-14 is the only permissions block today). New `publish` job needs its own job-level override:
```yaml
  publish:
    needs: [test, dogfood, pack-install-e2e]
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    permissions:
      contents: write        # scoped to this job only — workflow default stays contents: read
```

**Full new job — from RESEARCH.md Code Examples / Pattern 1 (authoritative, already adapted to this repo's real job names):**
```yaml
  publish:
    needs: [test, dogfood, pack-install-e2e]     # NOT npm-drift — advisory, never gates
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'
      - run: npm ci
      - name: Guard — skip npm publish if version already exists
        id: npm_guard
        run: |
          PKG_VERSION=$(node -p "require('./package.json').version")
          if npm view "@jeremiewerner/motto@$PKG_VERSION" version >/dev/null 2>&1; then
            echo "already_published=true" >> "$GITHUB_OUTPUT"
          else
            echo "already_published=false" >> "$GITHUB_OUTPUT"
          fi
      - name: npm publish
        if: steps.npm_guard.outputs.already_published == 'false'
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - name: Guard — skip GitHub Release if it already exists
        id: gh_guard
        run: |
          if gh release view "${{ github.ref_name }}" >/dev/null 2>&1; then
            echo "already_released=true" >> "$GITHUB_OUTPUT"
          else
            echo "already_released=false" >> "$GITHUB_OUTPUT"
          fi
        env:
          GH_TOKEN: ${{ github.token }}
      - name: Create GitHub Release
        if: steps.gh_guard.outputs.already_released == 'false'
        run: gh release create "${{ github.ref_name }}" --generate-notes
        env:
          GH_TOKEN: ${{ github.token }}
```

**Error handling pattern:** No try/catch equivalent in YAML — the codebase convention (seen in `dogfood` job, lines 39-45) is inline shell assertion with explicit `exit 1` and a diagnostic message to stderr before failing. The two independent `if:`-gated guard steps serve this role for `publish` — do not collapse them into one shared flag (RESEARCH.md Pitfall 3 / Anti-Patterns).

---

### `scripts/pack-install-e2e.mjs` (utility, batch/subprocess assertion)

**Analog:** the file's own `run()` helper (lines 33-46) and `parseJsonOrFail()` (lines 67-73); reserved insertion point already exists.

**Imports pattern** (lines 27-30, unchanged — no new imports needed):
```javascript
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
```

**Error handling pattern to match** (lines 40-45 `run()` — throw with full context, never a bare exit):
```javascript
if (r.status !== 0) {
  throw new Error(
    `${cmd} ${args.join(' ')}\nstatus: ${r.status} signal: ${r.signal}` +
      `${r.error ? `\nspawn error: ${r.error.message}` : ''}` +
      `\nstdout: ${r.stdout}\nstderr: ${r.stderr}`,
  );
}
```
The new `assertTarballClean()` function must follow the same convention: throw a descriptive `Error` (not `process.exit`), so the `finally` block (tmp-dir cleanup, line ~139) still runs.

**Reserved insertion slot** (lines 90, 124-136 — exact call site, already earmarked by a Phase 20 comment):
```javascript
const [{ filename, files: packedFiles }] = packManifest;   // line 90 — already captured
...
// (6) motto build --format json — assert .ok === true, .skillCount >= 1.
// Kept as a variable (packedFiles / packManifest) so Phase 21's D-05
// tarball-leak assertion (PUB-03) can slot in as one more step cleanly —
// NOT added here by design (deferred).
const buildResult = run(mottoBin, ['build', '--format', 'json'], { cwd: projectDir });
...
void packedFiles; // reserved for Phase 21's PUB-03 tarball-leak assertion — not used yet.
```
Replace the `void packedFiles;` line with the actual assertion call. Recommended function shape (RESEARCH.md Code Examples §D-05 — ports the exact allowlist from the current `skills/release/SKILL.md` Step 4 heredoc verbatim):
```javascript
const ALLOWED_PREFIXES = ['bin/', 'src/', 'dist/public/'];
const AUTO_INCLUDED = ['package.json', 'README', 'LICENSE', 'CHANGELOG'];

function assertTarballClean(files) {
  const isAllowed = (p) =>
    AUTO_INCLUDED.some((a) => p === a || p.startsWith(a)) ||
    ALLOWED_PREFIXES.some((a) => p.startsWith(a));
  const leaks = files.filter((f) => !isAllowed(f.path));
  if (leaks.length) {
    throw new Error(
      `TARBALL LEAK — ${leaks.length} file(s) outside allowlist:\n` +
        leaks.map((f) => `  ${f.path}`).join('\n'),
    );
  }
}
```
Call `assertTarballClean(packedFiles);` — placement choice (immediately after line 90 capture vs. right before the removed `void packedFiles;` line at 136) is Claude's discretion at plan time; RESEARCH.md recommends "fail fast, before spending time on the rest of the E2E flow" (i.e., right after line 90/91, before the `npm init`/`npm install` consumer steps).

**Testing pattern:** No dedicated unit test file exists for `pack-install-e2e.mjs` itself — it IS the E2E/CI-level test, invoked directly in `ci.yml`'s `pack-install-e2e` job (line 55: `run: node scripts/pack-install-e2e.mjs`). No new test file is implied by this change.

---

### `skills/release/SKILL.md` (config/documentation, request-response procedure)

**Analog:** `skills/changelog/SKILL.md` (closest sibling — same `template: procedure`, same narrow git-scoped `allowed-tools`, same `<role>`/`<process>`/`<success_criteria>` skeleton)

**Frontmatter pattern** (changelog, lines 1-9):
```yaml
---
name: changelog
description: Use when preparing a version bump or release, or whenever commits have landed since the last version tag that are not yet reflected in CHANGELOG.md.
audience: private
template: procedure
allowed-tools:
  - "Bash(git tag*)"
  - "Bash(git describe*)"
  - "Bash(git log*)"
---
```
Current `release/SKILL.md` frontmatter (to be edited, not replaced — keep `name`/`audience`/`template`, update `description` to reflect the CI-handoff flow, and extend `allowed-tools`):
```yaml
name: release
description: Maintainer release checklist for Motto — run tests, bump version, dogfood lint and build, verify tarball, and publish. Use this skill when releasing a new Motto version.
audience: private
template: procedure
allowed-tools:
  - "Bash(node *)"
  - "Bash(npm *)"
  - "Bash(git *)"
```
Per RESEARCH.md Open Question 2, add `"Bash(gh *)"` to `allowed-tools` so the new "Verify CI Published" / "If CI Publish Fails" steps are actually runnable (`gh run view`, `gh run rerun --failed`, `gh release view`), not just prose. Update `description` to drop "publish" from the maintainer's own responsibility (e.g. "...bump version, dogfood lint and build, and hand off to CI for publish. Use this skill when releasing a new Motto version.").

**Structural pattern to keep** (`<role>`/`<process>`/`<success_criteria>` skeleton — both files share this exact shape):
```
<role>
...one-paragraph framing...
</role>

<process>
## Step 1 — ...
...
</process>

<success_criteria>
- bullet list
</success_criteria>
```

**Steps to keep unchanged (local, pre-CI-handoff):** Step 1 (Pre-Release Gate: Tests) and Step 2 (Version Bump) are untouched — same `node --test`, same `npm version X.Y.Z -m "chore: release v%s"` flow, same husky-hook note.

**Steps to remove entirely:** current Step 4 (Tarball Verify — the inline heredoc, now superseded by the CI-side `assertTarballClean` in `pack-install-e2e.mjs`) and current Step 5 (Publish — `npm whoami` / `npm publish`).

**Step to keep with meaning-narrowed scope:** current Step 3 (Dogfood Check: `node bin/motto.js lint && node bin/motto.js build`) stays as a local pre-push sanity check — the maintainer still runs it before pushing, even though CI's `dogfood` job re-runs the equivalent check.

**Terminal local step, replacing old Steps 4-5** (per RESEARCH.md Architecture Patterns §1 diagram, "HANDOFF POINT"):
```
git push --follow-tags
```
This is now the last maintainer-run command — no `npm publish`, no `npm whoami`.

**New sections to add** (RESEARCH.md Pattern 3 — verbatim runbook content, adapt to skill prose style):
```
## Step N — CI Handoff

`git push --follow-tags` triggers a separate, tag-scoped GitHub Actions workflow run
(ref = refs/tags/vX.Y.Z) that re-runs the full test/dogfood/pack-install-e2e suite
against the exact tagged commit, then — if all three pass — runs the `publish` job:
npm publish (guarded by a `npm view` existence check) followed by
`gh release create --generate-notes` (guarded by `gh release view`). This is
asynchronous — nothing here confirms success synchronously.

## Step N+1 — Verify CI Published

1. Check the Actions run for the pushed tag is green:
   gh run list --workflow=CI --branch=vX.Y.Z --limit=1
2. Confirm the version is live on the registry:
   npm view @jeremiewerner/motto version
3. Confirm the GitHub Release exists:
   gh release view vX.Y.Z
Only proceed to Post-Release Housekeeping once all three confirm.

## Step N+2 — If CI Publish Fails

1. Do NOT delete or recreate the git tag — tags are permanent handoff markers.
2. Diagnose: gh run view <run-id> --log-failed
3. If fixable/transient: gh run rerun <run-id> --failed
   (resumes only the failed job; the two independent guard steps make this
   safe even if npm publish already succeeded before a later step failed)
4. Escape hatch (emergency only — bypasses the CI-enforced D-05 tarball check):
   git checkout vX.Y.Z && npm publish
```

**Final Post-Release Housekeeping step:** keep existing Step 6 content unchanged (update `PROJECT.md`, archive milestone in `MILESTONES.md`, close in `.planning/`), just renumber to follow the new Verify/Recovery steps.

## Shared Patterns

### Never-bare-exit / throw-with-context (applies to `pack-install-e2e.mjs` change)
**Source:** `scripts/pack-install-e2e.mjs` lines 40-45 (`run()`), reinforced by the file's own top-of-file comment: "never a bare exit — Pitfall 3, so a future regression is debuggable from CI logs alone."
**Apply to:** the new `assertTarballClean()` function — throw `Error` with the full list of leaked paths, never `process.exit()` directly.

### Least-privilege job-level `permissions:` (applies to `ci.yml` `publish` job)
**Source:** `.github/workflows/ci.yml` lines 13-14 (workflow-level `permissions: { contents: read }`, currently the only permissions declaration in the file).
**Apply to:** new `publish` job only — override with `permissions: { contents: write }` at the job level, leaving every other job (test/dogfood/pack-install-e2e/npm-drift) on the workflow-level `contents: read` default.

### Independent idempotency guards, never a shared flag (applies to `ci.yml` `publish` job)
**Source:** RESEARCH.md Pattern 1 / Alternatives Considered — no existing codebase precedent (this is the milestone's first credentialed external-write job), but the project's existing style of small, single-purpose, `id`-tagged steps (seen in `dogfood`'s "lint --quiet" / "build --quiet" named steps, ci.yml lines 34-45) is the closest structural analog for two-step, two-guard sequencing.
**Apply to:** the two write operations (`npm publish`, `gh release create`) in the `publish` job — two separate `id`-tagged guard steps (`npm_guard`, `gh_guard`), two separate `if:` conditions on the write steps.

### Procedure-skill frontmatter/skeleton (applies to `skills/release/SKILL.md`)
**Source:** `skills/changelog/SKILL.md` lines 1-16 (frontmatter + `<role>` opening).
**Apply to:** the rewritten `release/SKILL.md` — same `template: procedure`, same `<role>`/`<process>`/`<success_criteria>` XML-tag skeleton, same numbered `## Step N — Title` heading convention inside `<process>`.

## No Analog Found

None — all three files are modifications of existing, already-analyzed files. No wholly new files are introduced by this phase (confirmed by RESEARCH.md's Recommended Project Structure: all three entries are marked MODIFIED / REWRITTEN, none NEW).

## Metadata

**Analog search scope:** `.github/workflows/ci.yml` (full file, 66 lines), `scripts/pack-install-e2e.mjs` (full file via two non-overlapping reads, ~140 lines), `skills/release/SKILL.md` (full file), `skills/changelog/SKILL.md` (partial — frontmatter + first steps, sufficient for skeleton comparison), `skills/build-skill/` (listed, not read — changelog was the closer procedure-template match).
**Files scanned:** 5
**Pattern extraction date:** 2026-07-04
</content>
</invoke>
