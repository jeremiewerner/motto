# Phase 13: Address tech debt: plugins.public reserved-word enforcement + init/CLI review items - Research

**Researched:** 2026-07-02
**Domain:** Internal tech-debt remediation — validation logic (src/config.js, src/schema.js), scaffolder (src/init.js), CLI (bin/motto.js), tests, and README accuracy. No new external dependencies, no new user-facing features.
**Confidence:** HIGH — every item below is either read directly from this repo's source/tests, confirmed by running the test suite, or verified against freshly-fetched official Claude Code docs (not training-data recall).

## Summary

This phase has no REQUIREMENTS.md entries yet (all TBD) and no CONTEXT.md. Its scope is a fixed, enumerable list of tech-debt items carried out of the v0.0.4 milestone audit (`.planning/v0.0.4-MILESTONE-AUDIT.md`) plus two open findings from `10-REVIEW.md` that were never closed. There are **5 candidate items total**, but direct code inspection shows **one of the five is already resolved** (a side effect of Phase 11's own review-fix cycle) and **the headline item — "plugins.public reserved-word enforcement" — is not a code bug at all**: it's a false claim in README.md. Official Claude Code docs, fetched fresh in this research session, confirm `plugin.json`'s `name` field has no "anthropic"/"claude" substring restriction — only the SKILL.md frontmatter `name` field does. Adding a `RESERVED` check to `src/config.js`/`src/init.js` for `plugins.public`/`plugins.private` would be **unwarranted over-strictness**, not a fix. This overturns the framing in `12-REVIEW.md` and the milestone audit, both of which speculated the code change (not the doc) was "the original intent."

**Primary recommendation:** Treat this phase as four small, independent, low-risk tasks: (1) correct README.md's false reserved-word claim for `plugins.public`/`plugins.private` (and the stale intent-comment in `src/schema.js`), (2) fix the `execFileSync` stdio leak in `resolveGitOwnerName`, (3) strengthen the `'../evil'` path-traversal regression test to check the parent directory, and (4) fix or reframe the README's `/motto:release` reference, which is provably wrong regardless of installation state — `release` is an `audience: private` skill that builds into the `motto-private` plugin bucket, so the correct invocation (if it resolves at all for the maintainer) is `/motto-private:release`, not `/motto:release`. A fifth candidate item (process.exit() in the parseArgs catch block) requires no work — verify and close it.

## Architectural Responsibility Map

Motto is a single-process Node CLI, not a multi-tier app. "Tiers" here map to source modules with clear ownership boundaries:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Name format rules (kebab-case, reserved substrings, length) | `src/schema.js` (single source: `NAME_KEBAB`, `RESERVED`) | `src/config.js` (re-exports `NAME_KEBAB` only) | D-16: schema.js is the sole source of truth; config.js explicitly re-exports rather than redefining. |
| Project-config parsing/validation (`motto.yaml`) | `src/config.js` (`loadConfig`) | `src/schema.js` (regex import) | config.js owns `plugins.public`/`plugins.private` format checks; does not import `RESERVED`. |
| Project scaffolding (`motto init`) | `src/init.js` (`scaffoldProject`) | `src/schema.js` (name validation reuse) | init writes the effective name into `motto.yaml`'s `name`+`plugins.public`; must not accept what lint would later reject (INIT-05 spirit). |
| CLI dispatch, exit codes, help text | `bin/motto.js` | — | Thin shell; never calls `process.exit()` (Pitfall 7, already enforced repo-wide as of Phase 11's WR-04 fix). |
| User-facing accuracy of naming rules | `README.md` | `src/schema.js` comments | Both must match the *actual* enforced rule (or actual Claude Code requirement) — currently one line in each is stale/wrong. |
| Regression coverage of the scaffolder's never-throw / path-safety contract | `test/init.test.js` | `src/init.js` | Test intent ("no writes may escape the target dir") is currently under-asserted (see Pitfall 3). |

## Standard Stack

No new dependencies. This phase touches only existing internal modules.

| Existing dependency | Version (verified) | Relevance to this phase |
|---|---|---|
| `yaml` | 2.9.0 (confirmed via `npm view yaml version`) — only runtime dep, unchanged | `loadConfig` parses `motto.yaml`; no change needed to touch `plugins.public`/`plugins.private` validation logic (plain JS `if`/`else`). |
| `node:test` | stdlib, Node ≥20 (repo runs Node v24.14.1 locally) | All fixes are testable with the existing `node --test` harness; no new test tooling required. |
| `node:child_process` (`execFileSync`) | stdlib | Used by `resolveGitOwnerName` (src/init.js:92-99) — the fix is passing a `stdio` option, not a new dependency. |

**Installation:** none — no `npm install` step in this phase.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new external packages. No `npm view`/`pip index`/`cargo search` verification is required beyond confirming `yaml@2.9.0` is still current (done above, matches the already-pinned version — no drift).

## Architecture Patterns

### Recommended Project Structure

No new files/directories. All fixes land in existing files:

```
src/
├── schema.js     # RESERVED const (skill names only) + comment accuracy fix
├── config.js     # unchanged (no RESERVED check added — see Pitfall 1)
└── init.js       # resolveGitOwnerName stdio fix
test/
└── init.test.js  # '../evil' parent-directory assertion strengthened
README.md         # plugins.public reserved-word row corrected; /motto:release reference corrected
```

### Pattern 1: Single-source name-rule reuse (existing, D-16) — do NOT extend it to plugins.public

**What:** `src/schema.js` exports `NAME_KEBAB` as the sole regex source; `src/config.js` re-exports it (never redefines) so `plugins.public`/`plugins.private` and skill `name` always agree on *kebab-case format*.
**When to use:** Any time two modules need the identical format rule.
**Why this phase must NOT extend the pattern to `RESERVED`:** `RESERVED = ["anthropic", "claude"]` (src/schema.js:39) is scoped by the *official* SKILL.md spec to the skill `name` frontmatter field only — [CITED: platform.claude.com/docs/en/agents-and-tools/agent-skills/overview, per prior verified research in `.planning/research/STACK.md:360`]. Official `plugin.json` docs, freshly re-verified this session, place **no such restriction on `plugin.json`'s `name` field** — only "kebab-case, no spaces" [CITED: code.claude.com/docs/en/plugins-reference, fetched 2026-07-02: `"name" | string | Unique identifier (kebab-case, no spaces)..."`]. Reusing `RESERVED` for `plugins.public` would therefore reject valid, spec-conformant plugin names for no real Claude Code requirement — a YAGNI violation and a genuine footgun (imagine a legitimate project named `claude-notes-sync` that Motto would now refuse to scaffold/lint, even though Claude Code itself has no objection).

```js
// src/schema.js — CORRECT current scoping, keep as-is:
const RESERVED = ["anthropic", "claude"]; // applies to SKILL name only (D-09)
// ... only referenced inside validateSkill()'s NAME cascade — never import
// this into config.js or init.js.
```

### Pattern 2: Doc claims must cite the rule's actual scope, not a generalization of it

**What:** README.md:83's field table row for `plugins.public` says "must not contain `anthropic` or `claude`" — a copy-paste generalization from the SKILL.md `name` rule that was never true for `plugins.public`.
**Fix shape:**
```diff
- | `plugins.public` | Yes | Letter-start kebab-case; must not contain `anthropic` or `claude` |
+ | `plugins.public` | Yes | Letter-start kebab-case (Claude Code's `plugin.json` name rule — no reserved-word restriction) |
```
Also correct `src/schema.js:36`'s comment, which currently reads "Reserved substrings that must not appear in skill or plugin names" — drop "or plugin" since that was never implemented and, per verified docs, should not be.

### Anti-Patterns to Avoid

- **Adding a `RESERVED` check to `config.js`/`init.js` "to be safe":** Contradicts CLAUDE.md's own philosophy ("mechanism over features; YAGNI ruthlessly") and is unsupported by the official spec verified this session. If a future phase discovers Claude Code *does* reject reserved substrings in plugin names (e.g., via `claude plugin validate`'s undocumented behavior), that would be new information requiring its own research pass — not something to bolt on speculatively now.
- **Fixing README.md:173 (`/motto:release`) by just leaving it as documentation-only prose without checking the actual invocation namespace:** the bug is concrete and checkable (see Pitfall 4), not merely "unverified."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Reserved-substring check for a name | A new `RESERVED`-style array/check in config.js | Nothing — this phase's finding is that no such check should exist for `plugins.public`/`plugins.private` | See Pattern 1/Pitfall 1 above; the correct action is a doc fix, not new validation code. |
| Suppressing child-process stderr | A custom stream-buffering wrapper around `execFileSync` | The built-in `stdio` option (`{ stdio: ['ignore', 'pipe', 'ignore'] }`) | Node's `child_process` API already supports exactly this; no wrapper needed. |

**Key insight:** every item in this phase is a *removal or a one-line stdlib option*, not new logic. The "don't hand-roll" risk here is the inverse of usual: don't hand-roll a validation rule that doesn't need to exist.

## Common Pitfalls

### Pitfall 1: Assuming "the strict linter is the product's core value" implies more strictness is always the fix

**What goes wrong:** The milestone audit calls WR-01 "the highest-priority debt item" and frames it purely as a validation *hole*. A planner reading only the audit (not the underlying spec) could reasonably conclude the fix is "add the missing check" — the opposite of correct.
**Why it happens:** `src/schema.js:36`'s own comment ("must not appear in skill or plugin names") lends false credibility to the "code was wrong" theory; `12-REVIEW.md` explicitly floated it as the likely original intent.
**How to avoid:** Verify against the authoritative spec before writing the fix. This research already did that (see Sources) — the plan should cite `code.claude.com/docs/en/plugins-reference`'s `name` field row directly rather than re-deriving from the stale comment.
**Warning signs:** Any task description that says "enforce RESERVED for plugins.public" without a doc citation is working from the unverified assumption.

### Pitfall 2: `execFileSync` without `stdio` silently leaks child stderr (src/init.js:92-99)

**What goes wrong:** `resolveGitOwnerName()` calls `execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' })`. Node's default `stdio` for `execFileSync` inherits the child's stderr to the parent's stderr. A corrupt `~/.gitconfig` produces `fatal: bad config line ...` printed to the user's terminal interleaved with `motto init`'s own output, even though the function's contract (Pattern 3 in the codebase's own doc comments) is "never throws, always falls back silently."
**Why it happens:** `execFileSync`'s default `stdio` value is `'pipe'` for stdout but stderr defaults to inherit unless explicitly redirected — easy to miss since the happy path (git present, config set) never exercises it.
**How to avoid:**
```js
// src/init.js:94 — current:
const name = execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim();
// fixed:
const name = execFileSync('git', ['config', 'user.name'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
}).trim();
```
**Warning signs:** Any `execFileSync`/`execSync` call in a "never-throw, silent-fallback" helper that doesn't pass `stdio` explicitly.

### Pitfall 3: A "path traversal is blocked" test that only checks the traversal target, not the escape

**What goes wrong:** `test/init.test.js:107-140`'s adversarial-names suite asserts `'../evil'` (and similar) produce `ok:false` and that `readdir(tempDir)` is empty. It does **not** check whether files were written *outside* `tempDir`. If a future regression reintroduces the raw name as a path segment (e.g. `join(targetDir, name)` somewhere), files would land at `tmpdir()/evil` — one level above `tempDir` — and this test would still pass, because it only ever looks inside `tempDir`.
**Why it happens:** The test predates the specific failure mode it's meant to catch; "writes nothing" was implemented as "the target dir I'm watching is empty," not "no writes escaped anywhere I'm not watching."
**How to avoid:** Nest the target one level below a scratch dir and assert the scratch dir's contents:
```js
scratchDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
tempDir = join(scratchDir, 'target');
await mkdir(tempDir);
result = await scaffoldProject(tempDir, { name });
// ...
const parentEntries = await readdir(scratchDir);
assert.deepStrictEqual(parentEntries, ['target'], 'no writes may escape the target dir');
```
This exact pattern already exists elsewhere in the same file (the default-name suite, `test/init.test.js` lines 48-80) — reuse it rather than inventing a new shape.
**Warning signs:** Any "escape"/"traversal" test whose only assertion inspects the intended-safe directory, never the directory one level up.

### Pitfall 4: README.md:173's `/motto:release` reference is provably wrong, not merely "unresolvable"

**What goes wrong:** The milestone audit lists this as "resolvability unverified" (implying it might just need someone to try installing and see). Direct inspection shows it is **actually incorrect regardless of installation**: `skills/release/SKILL.md` has `audience: private` (confirmed by reading the file), so `motto build` routes it into `dist/private/` under the plugin name `motto-private` (confirmed: `motto.yaml`'s `plugins.private: motto-private`, and `dist/private/plugin.json`'s `"name": "motto-private"`). Claude Code's skill invocation namespace is `<plugin-name>:<skill-name>` — so even if the maintainer has the private plugin loaded, the correct slash command is `/motto-private:release`, not `/motto:release`. The public plugin is named `motto`, and `release` was never in it.
**Why it happens:** Likely copy-paste from the adjacent, *correct* `/motto:author-skill` reference two sections earlier (`author-skill` is `audience: public`, correctly namespaced under `motto`).
**How to avoid:** Either (a) correct the command to `/motto-private:release` if the maintainer workflow genuinely relies on having the private plugin loaded locally (verify how — this repo has no `.claude/skills/` symlink and no local marketplace entry for `motto-private` in `.claude-plugin/marketplace.json`, which lists only the public `motto` plugin), or (b) drop the slash-command claim entirely and just reference the skill by file path (`skills/release/SKILL.md`) since it's a maintainer-only artifact never distributed to end users. Recommend (b) unless the maintainer confirms a working local-load mechanism exists — GSD's `checkpoint:human-verify` is appropriate here since this is a workflow-dependent fact about the maintainer's own machine, not something verifiable from the repo alone.
**Warning signs:** Any `/plugin-name:skill-name` reference in docs — verify the skill's `audience` field and the resulting bucket/plugin name before trusting the namespace prefix.

### Pitfall 5: Re-litigating an already-fixed finding

**What goes wrong:** The v0.0.4 milestone audit lists "WR-02(review): process.exit() in parseArgs catch block (bin/motto.js:45) — pre-existing pattern" under Phase 10's tech debt. This describes `bin/motto.js`'s state *as reviewed during Phase 10*, before Phase 11 rewrote the entire help/dispatch system. Phase 11's own review (`11-REVIEW.md` WR-04) independently found and fixed the same class of issue in the *new* code (commit `d35aba7`, `fix(11): WR-04 drop forced process.exit in parseArgs catch to avoid stderr truncation`). Current `bin/motto.js` has **zero** `process.exit(` call sites (confirmed via `grep -n "process.exit(" bin/motto.js` — no matches; every exit path uses `process.exitCode`).
**Why it happens:** Audit rollups aggregate findings by phase-of-origin, not current-state; a later phase's unrelated rewrite can silently obsolete an earlier phase's open item.
**How to avoid:** Grep the current file for the literal pattern before writing a fix task. This item needs **zero code change** — only a verification step and a note closing it in the tracking doc.
**Warning signs:** Any tech-debt item citing a line number from a review that predates a later phase touching the same file wholesale.

## Code Examples

### Fix 1 — README.md field table row (plugins.public/private)

```diff
 | Field | Required | Rule |
 |-------|----------|------|
 | `name` | Yes | Truthy string; project identifier |
 | `version` | Yes | Truthy string; recommend quoting to preserve as YAML string |
 | `description` | Yes | Truthy string; feeds into each built `plugin.json` |
-| `plugins.public` | Yes | Letter-start kebab-case; must not contain `anthropic` or `claude` |
-| `plugins.private` | When private skills exist | Same kebab-case rule |
+| `plugins.public` | Yes | Letter-start kebab-case (Claude Code plugin `name` requirement — no reserved-word restriction, unlike skill `name`) |
+| `plugins.private` | When private skills exist | Same kebab-case rule |
```
Source for the parenthetical: `code.claude.com/docs/en/plugins-reference`, `plugin.json` manifest table, `name` field row — fetched 2026-07-02.

### Fix 2 — src/schema.js comment accuracy

```diff
 /**
- * Reserved substrings that must not appear in skill or plugin names (LINT-02, D-09).
+ * Reserved substrings that must not appear in SKILL.md `name` frontmatter
+ * (LINT-02, D-09). Scope is skill names only — Claude Code's plugin.json
+ * `name` field has no reserved-word restriction (verified against
+ * code.claude.com/docs/en/plugins-reference, 2026-07-02); do not reuse
+ * RESERVED for plugins.public/plugins.private.
  * @type {string[]}
  */
 const RESERVED = ["anthropic", "claude"];
```

### Fix 3 — src/init.js execFileSync stdio

```diff
 function resolveGitOwnerName() {
   try {
-    const name = execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim();
+    const name = execFileSync('git', ['config', 'user.name'], {
+      encoding: 'utf8',
+      stdio: ['ignore', 'pipe', 'ignore'],
+    }).trim();
     return name || 'Your Name';
   } catch {
     return 'Your Name';
   }
 }
```

### Fix 4 — test/init.test.js parent-directory assertion (mirrors the existing pattern at lines 48-80)

```js
// Source: existing pattern already used in this same file's default-name suite
describe(`name "${name}"`, () => {
  let scratchDir;
  let tempDir;
  let result;

  before(async () => {
    scratchDir = await mkdtemp(join(tmpdir(), 'motto-init-test-'));
    tempDir = join(scratchDir, 'target');
    await mkdir(tempDir);
    result = await scaffoldProject(tempDir, { name });
  });

  after(async () => {
    if (scratchDir) await rm(scratchDir, { recursive: true, force: true });
  });

  it('returns ok:false, reason:invalid-name', () => {
    assert.strictEqual(result.ok, false, `expected rejection for adversarial name "${name}"`);
    assert.strictEqual(result.reason, 'invalid-name');
  });

  it('writes nothing anywhere — parent scratch dir contains only the empty target', async () => {
    const parentEntries = await readdir(scratchDir);
    assert.deepStrictEqual(parentEntries, ['target'], 'no writes may escape the target dir');
    const entries = await readdir(tempDir);
    assert.deepStrictEqual(entries, [], `expected no writes for adversarial name "${name}"`);
  });
});
```

## State of the Art

| Old Approach (as documented/assumed in this repo) | Verified Current Spec | When Changed | Impact |
|---|---|---|---|
| README.md + `src/schema.js` comment: reserved-word rule applies to "skill or plugin names" | `code.claude.com/docs/en/plugins-reference` (fetched 2026-07-02): `plugin.json`'s `name` field is "kebab-case, no spaces" only — no reserved-word restriction | Not a version change — this was likely never accurate; not a regression, a pre-existing doc/comment inaccuracy | The fix is a documentation correction, not new validation code (see Pitfall 1) |
| Marketplace "reserved names" list (`claude-code-marketplace`, `anthropic-marketplace`, etc., from `.planning/research/distribution.md`) | Confirmed scoped to the **top-level marketplace `name`** field only (`code.claude.com/docs/en/plugin-marketplaces`, "Reserved names" note), not to individual `plugins[]` entry names | Re-confirmed 2026-07-02, no change from prior research | Irrelevant to `plugins.public`/`plugins.private` in `motto.yaml` — those map to plugin *entries*/plugin.json `name`, not the marketplace `name` |

**Deprecated/outdated:** None — no library/tool version drift in this phase; only a doc-accuracy correction.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The maintainer's local Claude Code setup has no working mechanism today that would make `/motto-private:release` (or any private-plugin slash command) resolve — inferred from the absence of a `.claude/skills/` symlink and the absence of a `motto-private` entry in this repo's `.claude-plugin/marketplace.json` | Pitfall 4 | If the maintainer does have a local install path (e.g., a plugin marketplace added outside the repo, or `~/.claude/skills/` symlinked elsewhere on their machine), the recommended "drop the slash command" fix would be unnecessarily conservative — a `checkpoint:human-verify` task is the correct hedge, not a unilateral doc rewrite |

**If this table is empty:** N/A — see A1 above; everything else in this research is either read directly from source/tests in this repository or fetched fresh from official docs this session (HIGH confidence throughout, no other `[ASSUMED]`-tagged claims).

## Open Questions (RESOLVED)

1. **Should Phase 13 also sweep the lower-priority INFO-level findings from `10-REVIEW.md` (IN-01..IN-06) and `11-REVIEW.md` (IN-01..IN-05) that were explicitly marked out-of-scope for their originating phases (`fix_scope: critical_warning`)?**
   - **RESOLVED:** Scope stays at the 5 audit-tracked items; the INFO backlog is NOT swept in Phase 13 (plans 13-01/13-02 cover only DEBT-01..DEBT-05). The 11 INFO items remain deferred per the recommendation below.
   - What we know: None of these 11 info-level items appear in the milestone audit's `tech_debt` list — the audit only rolled up WARNING-severity items. They range from cosmetic (`localeCompare` locale-dependence, an unused `withFileTypes: true`) to genuinely useful UX gaps (extra positionals silently ignored, `--force` accepted-and-ignored by `lint`/`build`).
   - What's unclear: Whether "init/CLI review items" in the phase name is meant to mean "the tracked tech-debt list" (narrow — 5 items) or "everything flagged during init/CLI code review" (broad — 5 + 11 = 16 items).
   - Recommendation: Scope Phase 13 to the 5 audit-tracked items (this research's primary focus) unless the user explicitly wants the INFO backlog swept too — the INFO items are individually cheap but numerous, and several (e.g. IN-03 in 11-REVIEW: extra positionals) are closer to product-behavior decisions than pure "review items," so bundling them without a decision point would silently expand phase scope. If the user does want them included, this research's inventory above (both REVIEW.md files, quoted in full) is sufficient — no further research pass is needed to plan them.

2. **Does the correct fix for README.md:173 depend on a fact only the maintainer knows (see A1)?**
   - **RESOLVED:** Plan 13-02 gates the fix with a `checkpoint:human-verify` task that asks the maintainer to try `/motto-private:release` in their own session; the checkpoint result selects the branch (private-namespace vs. file-path reference) before Task 1 edits README.md. The maintainer-dependent fact is resolved at execution time by the checkpoint, not guessed now.
   - What we know: The invocation namespace math (`audience: private` → `motto-private` plugin → `/motto-private:release`) is fully verifiable from the repo and is not in question.
   - What's unclear (until the checkpoint runs): Whether the maintainer actually has a working local-load path for the private plugin today (making "fix the command to `/motto-private:release`" correct) or not (making "drop the slash-command claim" correct).
   - Recommendation: Plan a `checkpoint:human-verify` task asking the maintainer to try the corrected command in their own session before committing to either fix. **(Implemented in plan 13-02.)**

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `git` CLI | `resolveGitOwnerName` (src/init.js) — the function under test/fix in this phase | ✓ | present on dev machine (used by the repo's own git history) | Already has a fallback (`'Your Name'`) — this phase only changes *how* the child process's stderr is handled, not whether git is required |
| Node.js ≥ 20 | Test runner, all fixes | ✓ | v24.14.1 (exceeds `engines.node: >=20`) | — |
| `yaml@2.9.0` | `loadConfig` (unchanged by this phase) | ✓ | 2.9.0, matches `package.json` pin | — |

No missing dependencies; no blockers.

## Security Domain

`security_enforcement: true` in `.planning/config.json` (ASVS level 1, block on `high`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface — local CLI tool |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No multi-user access boundaries |
| V5 Input Validation | Yes | Name-format validation (`NAME_KEBAB`, scoped `RESERVED`) — this phase's core subject matter. The finding is that the *current* scoping (RESERVED = skill names only) is already correct per the authoritative spec; no new validation gap to close. |
| V6 Cryptography | No | Not touched |
| V7 Error Handling / Information Leakage (ASVS 4.0 V7 / ASVS 5.0 V16) | Yes | `resolveGitOwnerName`'s stderr passthrough (Pitfall 2) is a minor information-leakage issue — a corrupt `~/.gitconfig`'s raw git error text reaches the user's terminal outside the tool's own error-reporting format. Standard control: explicit `stdio` redirection on child processes whose failure is meant to be silent/fallback-handled. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command injection via `execFileSync` | Tampering | Already mitigated — `execFileSync('git', ['config', 'user.name'], ...)` uses a fixed argv array with no shell interpolation (`execFileSync`, not `exec`/`execSync` with a string). No change needed; this phase only adds `stdio` scoping, does not touch the injection-safety property. |
| Path traversal via user-controlled name flowing into a filesystem path | Tampering / Information Disclosure | Already mitigated in `src/init.js` — the validated `name` is used only as file *content* (YAML/JSON values), never as a path segment (confirmed by reading `writeScaffold`: `join(targetDir, 'skills', 'hello-world', ...)` uses the fixed literal `'hello-world'`, not `name`). This phase's Pitfall 3 fix is about **test rigor** (proving the invariant holds under regression), not fixing a live vulnerability — none exists today. |
| Over-broad input rejection (false-positive DoS on legitimate names) | — (not classic STRIDE, but a real availability/usability harm) | This phase's central finding: do not add the `RESERVED` check to `plugins.public` — see Pattern 1/Pitfall 1. Over-validation is itself a defect class worth naming here since the temptation this phase is to "add more strictness." |

## Sources

### Primary (HIGH confidence)
- Direct repository inspection: `src/schema.js`, `src/config.js`, `src/init.js`, `bin/motto.js`, `test/init.test.js`, `test/config.test.js`, `test/schema.test.js`, `README.md`, `motto.yaml`, `.claude-plugin/marketplace.json`, `dist/public/plugin.json`, `dist/private/plugin.json`, `skills/release/SKILL.md`, `.planning/v0.0.4-MILESTONE-AUDIT.md`, `.planning/phases/10-project-scaffold-motto-init/10-REVIEW.md`, `.planning/phases/11-cli-ergonomics-help-path/11-REVIEW.md`, `.planning/phases/11-cli-ergonomics-help-path/11-REVIEW-FIX.md`, `.planning/phases/12-docs-cleanup/12-REVIEW.md`. Verified 2026-07-02.
- `git log --oneline -- bin/motto.js` and `git log -p` — confirmed commit `d35aba7` ("fix(11): WR-04 drop forced process.exit in parseArgs catch") already resolves the Phase-10-tracked `process.exit()` item. Verified 2026-07-02.
- `code.claude.com/docs/en/plugins-reference` — fetched live via WebFetch, 2026-07-02. `plugin.json` manifest `name` field: "Unique identifier (kebab-case, no spaces)" — no reserved-word restriction documented.
- `code.claude.com/docs/en/plugin-marketplaces` — fetched live via WebFetch, 2026-07-02. "Reserved names" note confirmed scoped to the top-level marketplace `name` field, not individual plugin entries.
- `npm view yaml version` — confirmed `2.9.0`, matches `package.json`'s pinned dependency (no drift).
- `node --test` full suite run — 131/131 passing on current `main` state before this phase begins.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md:360` (this repo's own prior research, confidence MEDIUM per its own metadata) — SKILL.md `name` frontmatter reserved-word rule, sourced from `platform.claude.com/docs/en/agents-and-tools/agent-skills/overview`. Not re-fetched this session (no reason to doubt it; it is *not* the disputed claim — the disputed claim is about `plugin.json`, which *was* freshly re-verified).

### Tertiary (LOW confidence)
- None used as load-bearing for any recommendation in this document.

## Metadata

**Confidence breakdown:**
- Tech-debt inventory (which items are open vs. already resolved): HIGH — cross-checked milestone audit against current source via grep/git log, not just the audit doc's claims.
- plugins.public reserved-word finding (doc-fix, not code-fix): HIGH — freshly fetched official docs, direct quote captured.
- README `/motto:release` namespace bug: HIGH (the namespace math) / MEDIUM (whether any local-load path exists for the maintainer — see Assumptions Log A1).
- execFileSync stdio fix and path-traversal test fix: HIGH — both are mechanical, low-risk, already fully specified in `10-REVIEW.md` with exact line numbers, independently re-confirmed against current source in this session.

**Research date:** 2026-07-02
**Valid until:** Effectively indefinite for the code-fix items (stdlib behavior doesn't drift). The doc-accuracy finding should be treated as valid until Claude Code's plugin.json spec changes — recommend re-verifying if this phase is executed more than ~30 days after this research date, since plugin manifest schema is an actively evolving area of Claude Code's docs (multiple `min-version` annotations observed during the fetch, e.g. `displayName` requiring v2.1.143+, `defaultEnabled` requiring v2.1.154+).
