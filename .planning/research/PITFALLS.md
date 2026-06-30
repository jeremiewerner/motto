# Pitfalls Research

**Domain:** Dogfooding a lint/build CLI on its own repo (Motto v0.1.0 Self-Hosting)
**Researched:** 2026-06-30
**Confidence:** HIGH — all pitfalls are grounded in the actual v0.0.1 source code and the specific mechanics of the milestone goal

---

## Critical Pitfalls

### Pitfall 1: "claude" / "anthropic" in Skill `name` — LINT-02 Fires on Your Own Skills

> **THIS IS THE HIGHEST-PRIORITY TRAP FOR THIS MILESTONE. Read before naming any skill.**

**What goes wrong:**
`validateSkill` enforces `RESERVED = ["anthropic", "claude"]` on the `name` field. Any skill whose folder name — which MUST equal its `name` frontmatter value — contains the substring `claude` or `anthropic` fails with LINT-02. Motto's skills document "how to author Claude Code Agent Skills." The most natural naming instinct produces exactly forbidden names.

Forbidden names an author will reach for first:
- `claude-code-guide` — contains `claude`
- `for-claude` — contains `claude`
- `claude-skill-format` — contains `claude`
- `anthropic-conventions` — contains `anthropic`

The check is a substring match, not a word-boundary match. `include-clause` would pass; `claudecode` would fail. The constraint lives in `src/schema.js` line 39 and runs at Step 3 of the name cascade in `validateSkill`.

Critical asymmetry: LINT-02 applies ONLY to the `name` field. The `description` field and the Markdown body can freely mention "Claude", "Claude Code", "Anthropic" — no restriction. A skill describing Claude Code's plugin format can say "Claude Code" a hundred times in its body and pass lint cleanly.

**Why it happens:**
Motto documents a Claude-specific toolchain. Naming skills after the platform being documented is natural. The constraint exists because Claude Code itself enforces it on plugin names loaded into its namespace — Motto propagates the rule to skill names so the rule is consistent throughout. But the author of Motto's OWN skills is the first person to hit this trap.

**How to avoid:**
Use Motto-centric or action-centric names that describe WHAT the skill does, not the platform it targets:

| Natural (forbidden) | Correct alternative |
|---------------------|---------------------|
| `claude-code-skills` | `skill-authoring` |
| `for-claude` | `motto-build` |
| `claude-plugin-format` | `plugin-format` |
| `anthropic-conventions` | `naming-conventions` |
| `claude-skill-linter` | `lint-guide` |

Before creating any skill folder, run this mental check: does the folder name contain the six-letter sequence `c-l-a-u-d-e` or the ten-letter sequence `a-n-t-h-r-o-p-i-c`? If yes, rename before creating.

**Warning signs:**
- LINT-02 error: `name must not contain the reserved substrings "anthropic" or "claude": "<name>"`
- The dogfood lint step fails on your own skills, not on external input
- You rename a folder but forget to update the `name:` frontmatter field (which then fails the name≠folder check instead)

**Phase to address:** Phase 4 — skill tree authoring. Name every skill before writing SKILL.md. Use a naming checklist.

---

### Pitfall 2: Dogfood Build Wipes `./dist/` During `npm test` — Pre-Commit Hook Destroys Manual Build

**What goes wrong:**
`buildProject(repoRoot)` wipes `dist/` at Step 4 (`rm(distDir, { recursive: true, force: true })`) before repacking. When the dogfood test calls `buildProject(REPO_ROOT)`, this wipe happens as part of every `npm test` run, including every pre-commit hook invocation.

Consequences:
1. A developer runs `motto build` manually to produce `./dist/` for local testing. They then stage a source file and commit. The husky pre-commit hook fires `npm test`. The dogfood test calls `buildProject(REPO_ROOT)`, wipes their `./dist/`, rebuilds it. If the build succeeds, `./dist/` is regenerated with the new code — may differ from what they tested. If the build fails (e.g., a skill has a lint error), `./dist/` is wiped and left empty. Either way, the developer did not expect `npm test` to mutate `./dist/`.
2. If the dogfood test asserts something mid-way and throws before the test's `try/finally`, `./dist/` may be left in a partially-written state: wipe has run, some skills are packed, plugin.json may or may not exist.

Note: `./dist/` is already in `.gitignore` (confirmed), so git does not see the wipe as a dirty working tree. The concern is practical, not git-cleanliness: repeated wipe-rebuild during test can mask a bug where the build produces wrong output that lint didn't catch, because the test immediately checks the freshly-built dist rather than a separately-built one.

**Why it happens:**
`buildProject` is designed as a production build command. Using it in a test that runs on every commit causes its side-effect (wipe + rebuild) to run on every commit. The `buildProject` API has no `dryRun` option or `outDir` override — it always writes to `<projectRoot>/dist`.

**How to avoid:**
1. Accept the wipe behavior and document it clearly in the dogfood test's header comment: "This test writes and rewrites `./dist/`. This is intentional — it validates the real build output. `./dist/` is gitignored."
2. The test must use `try/finally` to handle assertion failures gracefully — NOT to clean up `./dist/` (leaving the dist present is correct), but to ensure the test itself does not leave the process in a bad state.
3. Do NOT add `outDir` option to `buildProject` to avoid wipe — that adds API surface without a real consumer need. Accept the current behavior.
4. If the developer needs a stable `./dist/` across test runs, they must run `motto build` manually after the test suite completes.

**Warning signs:**
- `./dist/` contents change unexpectedly after `git commit`
- Pre-commit hook takes longer than expected (it's rebuilding the full dist)
- A post-commit `motto build` produces different output than what the test verified (indicating the test ran against stale source state)

**Phase to address:** Phase 4 — dogfood test authoring. Add the wipe-behavior comment. Phase 5 — verify the pre-commit hook timing is acceptable.

---

### Pitfall 3: `process.cwd()` in Dogfood Test — Wrong Root When Run Outside Repo Root

**What goes wrong:**
`node --test` discovers `*.test.js` recursively from wherever it is invoked. When invoked as `npm test` from the repo root, `process.cwd()` = repo root — correct. But if a developer runs `node --test test/dogfood.test.js` from inside `test/`, `process.cwd()` = `<repo>/test/`. The dogfood test then calls `lintProject('/path/to/motto/test/')`, which looks for:
- `test/motto.yaml` — ENOENT → lint error "motto.yaml: file not found"
- `test/skills/` — ENOENT → "no skills found"

The dogfood test fails with config errors, not a meaningful assertion failure. The error message "motto.yaml: file not found" gives no hint that the root path is wrong.

A second form of the same bug: a test helper imported by another test file calls `lintProject(process.cwd())` as a side effect. If test files share a helper that computes root via `process.cwd()`, any test run from a non-root directory causes silent root miscalculation.

**Why it happens:**
`process.cwd()` is a global process property, not a module property. It changes depending on how `node` is invoked. Every other test in the suite uses `mkdtemp` (explicit temp root) — none rely on `process.cwd()`. The dogfood test is the first test that needs to reference the actual repo root.

**How to avoid:**
Compute the repo root from `import.meta.url` inside the dogfood test file:

```js
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..') // test/ → repo root
```

This resolves to the same absolute path regardless of cwd. Verify the computed path with a `stat` check in the test's `before()` hook so a miscalculation fails loudly.

Never pass `process.cwd()` to `lintProject` or `buildProject` in any test. The dogfood test is the only test that references the real source tree — keep that clearly isolated.

**Warning signs:**
- Dogfood test fails with `motto.yaml: file not found` or `no skills found` despite the file existing at the project root
- Test passes on `npm test` but fails on `node --test test/dogfood.test.js`
- Lint output shows zero skills where you expect N skills

**Phase to address:** Phase 4 — dogfood test authoring. Use `import.meta.url`-based root resolution from the first line.

---

### Pitfall 4: `lintProject` Picks Up Fixture `skills/` If One Is Ever Created at Repo Root

**What goes wrong:**
`lintProject(REPO_ROOT)` looks for skills at exactly `<repoRoot>/skills/`. Currently, all test fixtures use `mkdtemp` (temp dirs), so there is no `skills/` directory at the repo root until the dogfood milestone adds one. Once `skills/` is created for self-hosting, it becomes the canonical source. But if a future developer creates `skills/fixtures/` or a top-level `skills/bad-skill/` as a test fixture (instead of using mkdtemp), that directory gets linted as a real skill and may produce unexpected failures.

The symmetrical risk: if a developer checks the behavior of `lintProject` on malformed skills by creating a folder under `skills/` rather than a temp dir, the dogfood test will pick it up and fail.

**Why it happens:**
`discoverSkillNames` uses one-level `readdir` on `<root>/skills/`, filtering for non-hidden directories. Any folder there is treated as a skill. There is no "fixture" or "example" marker in the directory structure.

**How to avoid:**
- ALL test fixtures for lint/build tests must continue using `mkdtemp`. Document this as a firm convention in test file headers: "Never create fixtures under the real `skills/` directory."
- If a real example or template skill must live in the repo for documentation purposes, prefix its folder with `.` (hidden) — `discoverSkillNames` filters out dotfiles.
- The dogfood test's `before()` hook can assert that `skillNames.length` equals the exact expected count, catching accidental fixture pollution immediately.

**Warning signs:**
- Dogfood test reports more skills than expected
- A malformed skill folder appears in lint output that you did not author
- `count` in `lintResult` is higher than the number of skills in `skills/`

**Phase to address:** Phase 4 — add count assertion to dogfood test; add convention note to test files.

---

### Pitfall 5: Body-Spine Requirement Forces Awkward `**Role:**` on Reference-Card Content

**What goes wrong:**
`validateSkill` enforces two independent body checks:
1. First non-blank line must be `# Title` (H1)
2. Body must contain at least one `**Role:**` line

Motto's own skills are likely to be reference material — schema field tables, command references, authoring guides. Pure reference cards do not naturally have a role statement. The requirement forces content that reads awkwardly:

```markdown
# Skill Schema Reference

**Role:** Reference — consult this skill to look up Motto frontmatter field rules.

| Field | Required | Rules |
...
```

The `**Role:**` line is syntactically valid but semantically forced. For agent-instruction skills, the role statement is natural ("You are an expert who..."). For reference cards consumed by an agent as context, the role statement is just metadata.

A related trap: authors trying to "fill in" the role requirement with a single-word line like `**Role:** Reference` — which technically passes the regex `/^\*\*Role:/m` — but produces content that looks like incomplete authoring.

**Why it happens:**
The spine is intentionally mandatory (no template-waiver for v0.1.0). The decision was made in v0.0.1 to enforce the spine universally, with template-waiver deferred. Self-hosting is the first real exercise of this constraint against non-instructional content.

**How to avoid:**
Write natural, honest role lines for reference content:
- `**Role:** Reference — use the table below to look up required frontmatter fields.`
- `**Role:** Command reference — invoke this skill to recall the exact `motto lint` / `motto build` flags.`

Do not fight the spine. A short but honest role line is correct. The real author value: it forces a sentence about HOW the agent should use this skill, which is actually useful even for reference material.

Do NOT add a template-waiver mechanism for v0.1.0. The milestone explicitly defers concrete templates. The self-hosted skills should demonstrate that the spine works for reference content.

**Warning signs:**
- LINT-04 error: `body must contain a **Role:** line`
- Role line is `**Role:**` with nothing after it (fails the schema check? No — `validateSkill` only checks for `^\*\*Role:` prefix, not for content after the colon. But it produces unusable content for the agent.)
- Authors try to hide the Role line at the bottom of a long document to "get it out of the way" — this passes lint but defeats the purpose

**Phase to address:** Phase 4 — write role lines for each skill before writing the body. Accept the awkwardness for reference cards.

---

### Pitfall 6: `motto.yaml` Config Errors Block Skill Lint — Bad Config Silences the Whole Tree

**What goes wrong:**
`lintProject` processes config first (step 1), then skills (step 4). If `motto.yaml` is missing or has a LINT error, config errors are pushed to the errors array but skill scanning still runs (per the `processConfig` implementation at `lint.js:54`). However, if `motto.yaml` is missing, `loadSharedRefs` still runs (returns empty set), and `discoverSkillNames` still runs. The final result is: config error + all skill errors (shared_references unresolvable because the Set is empty).

In the dogfood context, Motto's own `motto.yaml` must be correct for the dogfood test to produce a meaningful clean result. If the `motto.yaml` is authored AFTER the `skills/` tree, the test will run on a partially-configured project and produce a cascade of errors — some real, some artifacts of the empty config.

`buildProject` has a harder constraint: lint must pass entirely (`lintResult.ok`) before any build step runs. A config error blocks build completely.

**Why it happens:**
Config and skill authoring are decoupled but order-dependent at test time. A developer might create skills first and write `motto.yaml` last, assuming they can iterate.

**How to avoid:**
Author `motto.yaml` FIRST before any `skills/` content. The dogfood test's `before()` hook should explicitly verify `lintResult` and assert no config errors separately from skill errors. If config is broken, fail with a clear message: "motto.yaml has errors — fix config before running skill lint."

Structure the dogfood test to check:
1. `lintResult.errors.filter(e => e.skill === 'motto.yaml')` is empty (config clean)
2. `lintResult.ok` is true (full tree clean)
3. `buildProject` returns `ok: true`

**Warning signs:**
- Dogfood test fails with `motto.yaml: missing plugins.public` or similar
- `lintResult.count` is 0 even though `skills/` has folders
- Build returns `ok: false` with a `motto.yaml` error, not a skill error

**Phase to address:** Phase 4 — author `motto.yaml` first; dogfood test assertions are layered (config first, then skills).

---

### Pitfall 7: `buildProject` Calls `lintProject` Internally — Double Lint in Dogfood Test

**What goes wrong:**
`buildProject` calls `lintProject` at step 1 as a gate. A dogfood test that calls BOTH `lintProject(REPO_ROOT)` and `buildProject(REPO_ROOT)` runs lint twice: once explicitly, once inside build. This is harmless in terms of correctness (both see the same source tree) but creates two failure surfaces with different error shapes.

When lint fails:
- Explicit `lintProject` call returns `{ ok: false, errors: [...] }`
- `buildProject` also returns `{ ok: false, errors: [...] }` (same errors)

The test must assert on both if called, or choose one. Calling both in sequence to "verify lint is clean, then verify build succeeds" is valid but means lint I/O runs twice on the real tree.

If the dogfood test only calls `buildProject`, it gets lint results embedded in the build result but doesn't get the lint `count` (number of skills found), which is useful for the "expected N skills" assertion.

**Why it happens:**
`buildProject`'s internal `lintProject` call is the lint gate, not the lint report surface. The architecture correctly makes lint a precondition of build, but test code treating them as a pipeline must account for the double invocation.

**How to avoid:**
Structure the dogfood test to call `lintProject` first for its count/error assertions, then call `buildProject` separately and assert on dist structure. Do not try to short-circuit by checking `buildResult.errors` to infer lint status — `buildResult.errors` on a lint failure returns lint errors, but on a build failure (post-lint) returns build-specific errors. Keep the two assertions separate.

Alternatively: call only `buildProject` and infer lint cleanliness from `buildResult.ok`. Simpler test, but loses `skillCount` assertion.

**Warning signs:**
- Disk I/O on the skills tree happens twice per dogfood test run
- A lint error appears in BOTH `lintResult.errors` and `buildResult.errors` (this is correct behavior, not a bug — but can look like a duplicate)
- Test assertion on `buildResult.errors` misses a lint error because the error object shape is `{ skill: '...', message: '...' }` in both, and the test only checked message content

**Phase to address:** Phase 4 — dogfood test design. Decide upfront: call lint + build separately (rich assertions) or build only (simpler, fewer assertions).

---

### Pitfall 8: `NAME_KEBAB` Duplication — Config and Schema Can Silently Diverge

**What goes wrong:**
`NAME_KEBAB` is defined in `src/schema.js` (exported) and manually duplicated in `src/config.js` (private copy). The v0.0.1 tech debt list identifies this explicitly. A future edit to one file that doesn't update the other creates a divergence where:
- A skill name passes `validateSkill` but fails `loadConfig` (or vice versa for plugin names)
- Plugin names in `motto.yaml` are accepted/rejected differently from skill names

The dogfood test does NOT surface this gap because it runs lint on a validly-authored tree — if both regexes happen to agree on all test inputs, the divergence is invisible.

**Why it happens:**
`src/config.js` intentionally avoids importing from `src/schema.js` to keep the validator pure (no cross-module dependency). The `// Intentional duplicate... Source of truth: src/schema.js export NAME_KEBAB.` comment is the only protection. Future contributors may not see the comment or may update one file without searching for duplicates.

**How to avoid:**
Add an equality self-test in the test suite:

```js
import { NAME_KEBAB } from '../src/schema.js'
// config.js's private regex, extracted via a test-only export or literal comparison:
const CONFIG_KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
assert.strictEqual(NAME_KEBAB.source, CONFIG_KEBAB.source, 'NAME_KEBAB must be identical in schema.js and config.js')
```

This is the "equality self-test" referenced in the v0.0.1 tech debt log. Alternatively, export `NAME_KEBAB` from `schema.js` and import it in `config.js` — this removes the duplication entirely. The pure-validator argument is weaker than the sync guarantee. Dogfood milestone is the right time to close this gap.

**Warning signs:**
- A plugin name passes config validation but fails a skill name check (or vice versa) for a name that should behave identically under both
- No lint error at add-regex-change time because no test compares the two regexes
- The divergence only surfaces when a user's project uses a name that falls in the gap (e.g., the regex in config.js accidentally allows double-dash while schema.js doesn't)

**Phase to address:** Phase 4 — add the NAME_KEBAB equality self-test to the existing `config.test.js` or `schema.test.js`. This is a one-assertion fix.

---

### Pitfall 9: Private Skill Without `plugins.private` — Build Fails After Lint Passes

**What goes wrong:**
A private skill (audience: private) passes `lintProject` cleanly because the private-contradiction check runs only in `buildProject` (step 3, D3-12), not in `validateSkill`. Lint is schema validation; build is packaging validation. The sequence:
1. Lint passes: `ok: true`
2. Build fails: `"audience private but plugins.private not set in motto.yaml"`

For a developer iterating on the skills tree, this is surprising: lint said clean, but build rejected it. The error message correctly identifies the fix, but the developer expected a clean build after a clean lint.

In the dogfood context, if Motto authors ≥1 private skill but forgets to add `plugins.private` to `motto.yaml`, the dogfood test's `lintProject` assertion passes and the `buildProject` assertion fails. The test needs separate assertions for each stage to make this failure obvious.

**Why it happens:**
The lint/build separation is intentional: lint validates each skill independently; build validates the whole project as a packaging unit. Cross-skill and cross-config constraints that only matter at packaging time belong in build. The private-contradiction is a packaging constraint, not a schema constraint.

**How to avoid:**
Author `motto.yaml` with BOTH `plugins.public` and `plugins.private` set BEFORE adding any private skill, even if `plugins.private` is not yet used. The cost: build always emits a `dist/private/` placeholder — no, wait, build only emits `dist/private/` when `bucketsUsed.has('private')`, which only happens when at least one private skill exists. So having `plugins.private` set with zero private skills is harmless.

Set `plugins.private` early; remove it only if you never author private skills.

**Warning signs:**
- `lintResult.ok === true` but `buildResult.ok === false`
- `buildResult.errors[0].message` includes `"plugins.private not set"`
- The failing skill has `audience: private` in its frontmatter

**Phase to address:** Phase 4 — author `motto.yaml` with `plugins.private` set if the milestone requires a private skill. The milestone spec says "≥1 private" — so `plugins.private` is required.

---

### Pitfall 10: `description` Mentions "Claude" — Authors Assume LINT-02 Bans It

**What goes wrong:**
Not a code bug, but a common misreading of LINT-02. Authors who read "name must not contain the reserved substrings 'anthropic' or 'claude'" assume the same restriction applies to `description` and the body. It does not. The `RESERVED` check at `schema.js:84` runs ONLY on `data.name`. No check is performed on `data.description` or `body`.

Motto's own skill descriptions and bodies will naturally and correctly mention "Claude Code", "Anthropic", "Claude Code Agent Skills" throughout. Authors may self-censor their descriptions unnecessarily, producing weaker descriptions.

**Why it happens:**
The error message for LINT-02 says "name must not contain..." — the word "name" specifies the field. But authors skimming the rule assume it's a global content filter, not a field-specific name constraint.

**How to avoid:**
Write descriptions and body content freely. The restriction is ONLY on the `name` field (= folder name). Confirm by checking `src/schema.js:84`: the `RESERVED` check runs on `name` only, inside the NAME cascade block. The description check at line 95 only verifies non-empty.

**Warning signs:**
- A developer asks "can I mention Claude Code in the description?" — they've misread LINT-02
- Skills descriptions are vague ("A skill for agent use") when they could be precise ("Author Claude Code Agent Skills using Motto's schema")
- No warning sign from the linter — this is a human misreading, not a code issue

**Phase to address:** Phase 4 — note in the skill authoring process that descriptions and bodies are unrestricted. Document in `motto.yaml` comments or a README.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Calling `process.cwd()` in dogfood test | Quick to write | Breaks when run from non-root dir; fragile for CI | Never — use `import.meta.url` root resolution |
| Not asserting `skillCount` in dogfood test | Fewer assertions | A fixture folder accidentally in `skills/` goes undetected | Never — assert the exact expected count |
| Skipping `NAME_KEBAB` equality self-test | Less test code | Schema and config regexes diverge silently over time | Never — this is a one-assertion fix with high value |
| Setting `plugins.private` only when needed | "Minimal config" feeling | First private skill addition causes build failure if config is forgotten | Acceptable if milestone has zero private skills; set it early otherwise |
| Dogfood test cleans up `./dist/` in `finally` | No build artifacts post-test | Defeats the purpose; `./dist/` should persist to show the real build worked | Never clean up `./dist/` in dogfood test |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Skill naming for Claude Code docs | Naming skills `claude-*` or `for-claude` | Use Motto-centric names: `skill-authoring`, `plugin-format`, `lint-guide` |
| Husky pre-commit + dogfood build | Expecting `./dist/` to be stable across commits | `./dist/` is gitignored and rebuilt on every `npm test`; treat it as ephemeral |
| Dogfood root path | Using `process.cwd()` to locate the project root | Use `resolve(dirname(fileURLToPath(import.meta.url)), '..')` from inside `test/` |
| Lint vs build failure modes | Assuming lint-pass means build-pass | Private skills with no `plugins.private` pass lint but fail build; assert both stages |
| Self-referential test | Calling `buildProject` then immediately asserting on dist | `buildProject` internally calls `lintProject`; lint runs twice; design assertions accordingly |

---

## "Looks Done But Isn't" Checklist

- [ ] **Skill names audit:** every skill in `skills/` has a `name` that passes `!name.includes('claude') && !name.includes('anthropic')` — checked before folder creation
- [ ] **Dogfood root path:** test uses `resolve(dirname(fileURLToPath(import.meta.url)), '..')`, NOT `process.cwd()`
- [ ] **Skill count assertion:** dogfood test asserts `lintResult.count === N` where N is the exact expected skill count
- [ ] **Config clean before skill clean:** dogfood test asserts zero `motto.yaml` errors before asserting `lintResult.ok`
- [ ] **`plugins.private` in `motto.yaml`:** set if any private skill exists; verified before build test runs
- [ ] **`./dist/` gitignored:** `dist/` is in `.gitignore` (currently confirmed present) — if removed, every `npm test` makes the working tree dirty
- [ ] **NAME_KEBAB equality self-test:** a test asserts `schema.NAME_KEBAB.source === config's_regex.source`
- [ ] **Role lines present:** every skill has a `**Role:**` line that is meaningful, not just the bare colon
- [ ] **No fixture folders in `skills/`:** all lint/build fixture usage uses `mkdtemp`; `skills/` is real skills only

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| "claude"/"anthropic" in skill name | Phase 4 (skill tree authoring) | `motto lint` passes on all skills; zero LINT-02 errors |
| dist/ wipe during npm test destroys manual build | Phase 4 (dogfood test authoring) | Test header comment documents behavior; `./dist/` confirmed in `.gitignore` |
| `process.cwd()` wrong root | Phase 4 (dogfood test authoring) | Test uses `import.meta.url` path; `node --test test/dogfood.test.js` from `test/` dir passes |
| Fixture skills in `skills/` tree | Phase 4 (dogfood test authoring) | `skillCount` assertion catches extra folders; convention documented |
| Body-spine forces awkward Role line | Phase 4 (skill tree authoring) | All skills have non-empty, meaningful `**Role:**` lines; lint passes |
| Config errors cascade through lint | Phase 4 (authoring order) | `motto.yaml` authored first; dogfood test asserts config-clean before skill-clean |
| Double lint (lintProject + buildProject) | Phase 4 (dogfood test design) | Test explicitly calls lint + build separately with distinct assertion blocks |
| NAME_KEBAB duplication divergence | Phase 4 (regression guard) | Equality self-test added to existing test suite |
| Private skill without plugins.private | Phase 4 (motto.yaml authoring) | `motto.yaml` has `plugins.private` set before any private skill is authored |
| LINT-02 misread as global content ban | Phase 4 (authoring) | Descriptions mention Claude Code freely; no self-censoring |

---

## Sources

- Motto `src/schema.js` — `RESERVED = ["anthropic", "claude"]` at line 39; name cascade at lines 76–92; description check at line 95 (field-specific, not global). Verified 2026-06-30.
- Motto `src/lint.js` — `processConfig` continues after config errors (line 54); `lintProject` execution order (lines 186–206). Verified 2026-06-30.
- Motto `src/build.js` — wipe at Step 4 (`rm(distDir, ...)` at line 150); lint gate at Step 1 (line 92); private-contradiction check at lines 134–141. Verified 2026-06-30.
- Motto `src/config.js` — intentional `NAME_KEBAB` duplicate at line 35; cross-reference comment. Verified 2026-06-30.
- Motto `.gitignore` — `dist/` is on line 2. Verified 2026-06-30.
- Motto `.husky/pre-commit` — `npm test` (single line). Verified 2026-06-30.
- Motto `package.json` — `"test": "node --test"` (discovers all `*.test.js` recursively). Verified 2026-06-30.
- Motto `.planning/milestones/v0.0.1-ROADMAP.md` — tech debt section: NAME_KEBAB duplication identified as manual sync point. Verified 2026-06-30.
- Motto `.planning/PROJECT.md` — v0.1.0 milestone goal: ≥1 public skill, ≥1 private skill, ≥1 shared_reference; dogfood test wired into node:test. Verified 2026-06-30.

---
*Pitfalls research for: Motto v0.1.0 Self-Hosting (Dogfood)*
*Researched: 2026-06-30*
