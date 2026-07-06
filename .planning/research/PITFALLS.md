# Pitfalls Research

**Domain:** Retrofitting version stamping + skew detection onto an already-shipped CLI (Motto) with real, already-scaffolded consumer projects (Motto's own repo, and "magma") that predate the stamp
**Researched:** 2026-07-06
**Confidence:** MEDIUM overall — the never-throw/malformed-input and bootstrap-compatibility patterns are well-established software engineering practice (schema-versioning literature, semver.org spec, Terraform's own constraint-checking design) cross-checked across multiple independent sources (MEDIUM); the Claude Code marketplace-cache findings are HIGH-relevance because they are confirmed, numbered, currently-open upstream GitHub issues against `anthropics/claude-code` itself (MEDIUM-verified, cross-checked across 7 independent issue reports); single-source web summaries not otherwise corroborated are flagged LOW inline.

This research is scoped to **v0.0.7 "Version Awareness"**: adding a `motto.yaml` version stamp (written at `init`) and skew detection (compared at `lint`/`build`) into a codebase where **zero existing consumer projects have this field** — including Motto's own dogfooded `skills/` tree and the real external project **magma** (`motto init magma`, scaffolded before this milestone existed). The critical constraint is Motto's own **never-throw invariant**, already violated 5 times historically (v0.0.2, Phase 10 fs-errors, Phase 15 cwd-resolve bypass, Phase 18 widened-param shape, Phase 20 never-red CI substitution) — every one of those escapes was a "tests were green but the boundary was still broken" failure, which is exactly the failure shape version-stamp parsing invites if adversarial cases aren't enumerated up front.

## Critical Pitfalls

### Pitfall 1: The bootstrap problem — treating "no stamp" as an error instead of the expected state of every pre-existing project

**What goes wrong:**
The very first real-world input to the new skew-detection code is a project **without** `motto.yaml` version field at all — both magma and Motto's own repo predate this feature. If the lint/build code path treats a missing stamp as a validation failure (throws, exits non-zero, or produces a scary error), every existing consumer project breaks the moment they run their next `lint`/`build` with the upgraded CLI — before they've done anything wrong.

**Why it happens:**
Version-awareness features are almost always designed and tested against the "happy path" of a freshly-stamped project, because that's the only state the *developer* has ever seen while building the feature. The retrofit angle — "this field has existed for zero seconds in every project that currently exists" — is easy to forget precisely because it's not a new-project concern, it's a whole-installed-base concern. The standard fix pattern across schema-versioning systems (config files, database migrations, Cosmos DB documents) is: **absence of a version field means "the oldest version," not "invalid."** Treating the pre-versioning state as a first-class, valid, silently-migratable case is the load-bearing decision here. [confidence: LOW — general schema-versioning pattern, not Motto-specific, synthesized from a single web source]

**How to avoid:**
- Missing `version:` key in `motto.yaml` is **not an error condition** in lint/build's core validation — it's a distinct, named state (e.g. `unstamped`) that produces an **informational** message ("this project predates version stamping; run `motto init --stamp` — or whatever the chosen backfill mechanism is — to add one") rather than a lint failure.
- Never gate `lint`/`build` exit code on presence of the stamp. Skew detection should degrade to "no comparison possible" when there's nothing to compare against, not "comparison failed."
- Test the exact two real-world fixtures this milestone names: a `motto.yaml` with no `version` key at all (Motto's own tree pre-migration), and a freshly-scaffolded-pre-v0.0.7 shape (magma). Both must lint/build clean with only an advisory note, zero exit-code change, zero thrown errors.

**Warning signs:**
- Any code path that does `if (!motto.version) throw` or `if (!motto.version) return { valid: false }` inside the core validator.
- A test suite where every skew-detection fixture already has a `version:` field — meaning the unstamped case was never actually exercised.

**Phase to address:**
The stamping/skew-detection implementation phase itself — this must be the *first* adversarial test written (before the happy-path "versions match" test), because it defines the shape of every other check.

---

### Pitfall 2: Malformed stamp values crash the never-throw boundary

**What goes wrong:**
`version:` in `motto.yaml` is user/hand-edited YAML. Real malformed inputs that will eventually occur: `version: 7` (bare number, YAML parses as a number not a string), `version: [0, 0, 7]` (array), `version: {major: 0, minor: 0, patch: 7}` (object), `version: ""` (empty string), `version: "not-a-version"` (garbage string), `version: true`, `version: null`. If the skew-detection code assumes `motto.yaml.version` is always a parseable semver string and calls `.split('.')` or a semver comparator directly on it, a non-string shape throws a `TypeError` inside `motto lint`, taking down the whole CLI run — a direct, concrete repeat of the project's 5 historical never-throw violations, all of which were exactly this shape: an assumption about input shape that held in every test fixture but not in the wild.

**Why it happens:**
YAML's type coercion means `version: 0.0.7` and `version: "0.0.7"` parse identically as strings (fine), but `version: 7` parses as a number, and `version: 0.7` parses as a float, silently dropping information (`0.7` vs `0.0.7` vs `0.70` are all different semver strings but overlapping YAML number literals). This is a much easier trap to fall into than a "someone typed garbage" error, because well-intentioned users writing YAML by hand can produce a type-wrong-but-visually-fine file without realizing it.

**How to avoid:**
- The stamp reader must **type-check before parsing**: reject (as a lint error entry, never a throw) anything that isn't `typeof === 'string'` at the YAML-parse boundary, with a message that names the actual received type/value (`"motto.yaml version must be a string like \"0.0.7\", got number (7)"`).
- Semver-string validation must be a **pure boolean-returning function** (regex match against `^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$` is sufficient — the project needs comparison, not full semver-lib parsing, given the zero-dependency philosophy), never a function that throws on non-matching input.
- Enumerate and test every case above as a named adversarial test: non-string types (number, array, object, boolean, null), empty string, and syntactically-invalid-but-string values (`"v0.0.7"` with a leading v, `"0.0"` missing patch, `"latest"`, `"0.0.7.1"` four segments). Every one must produce a clean error/advisory entry, not a crash — this is the literal never-throw invariant the project already tracks in memory as a recurring risk.

**Warning signs:**
- Any direct string method call (`.split`, `.match`, `.localeCompare`) on `motto.yaml.version` without a preceding `typeof` guard.
- A comparison function whose only tests use valid semver strings on both sides.

**Phase to address:**
Same phase as Pitfall 1 — malformed-stamp handling and missing-stamp handling are two branches of the same "untrusted input" boundary and should be designed and reviewed together, then explicitly covered by `/gsd-code-review high` per this project's established post-milestone hardening pattern (caught real never-throw violations in v0.0.2, v0.0.4, and structurally in v0.0.5 Phase 18).

---

### Pitfall 3: Skew message tells the user to move in the wrong direction

**What goes wrong:**
Version skew is inherently bidirectional — a project's stamped version can be *behind* the installed tool (the common case: tool was upgraded, project wasn't rebuilt) or *ahead* of it (a less common but real case: a project was stamped by a newer Motto than what's currently installed, e.g. a teammate on a newer global install, or a rolled-back local install). A skew message that always says "your project is out of date, re-run `motto init`/upgrade" regardless of which direction the mismatch actually goes will, in the ahead-case, send the user toward the *wrong* remedy — reinitializing or "upgrading" a project that's actually fine, while the real fix is upgrading their *local tool*.

**Why it happens:**
It's tempting to write one generic skew string ("version mismatch detected") and reuse it for both directions because the detection logic (`stamped !== installed`) is symmetric even though the remedy is not. Terraform's `required_version` constraint checking is the closest prior art here: its error explicitly states whether the local binary is "too new" or "too old" for the constraint and points the fix at whichever side is actually wrong (upgrade the Terraform CLI vs. relax the config's constraint) — never a single undirected "mismatch" string. [confidence: MEDIUM — corroborated by both HashiCorp's own docs and independent community write-ups on constraint-error UX]

**How to avoid:**
- Skew detection must compute and branch on **direction**, not just inequality: `stampedVersion < installedVersion` (project is behind — normal case, likely wants a rebuild/re-stamp path once that command exists) vs. `stampedVersion > installedVersion` (tool is behind — the fix is `npm install -g @jeremiewerner/motto@latest` or equivalent, not touching the project at all).
- Each direction gets its own message string naming the concrete remedy for *that* direction. Never emit one shared "version mismatch" string for both.
- Given this milestone deliberately defers the upgrade *command* (YAGNI until a real schema break demands it), the behind-case message should say what's true today — "project was scaffolded/built with an older Motto (X); no action required unless you hit an incompatibility" — not imply a migration command that doesn't exist yet.

**Warning signs:**
- A single template string interpolated with both versions but no conditional on which one is larger.
- Tests that only cover one direction of skew (almost always "tool is newer" since that's what a developer sees constantly during their own development) and never the "tool got downgraded / project stamped by a newer version" direction.

**Phase to address:**
The skew-detection phase — write the direction-aware message and its two adversarial tests (project-behind, project-ahead) as part of the initial implementation, not as a follow-up polish pass.

---

### Pitfall 4: Stamp drift — no defined update trigger means the stamp silently goes stale immediately

**What goes wrong:**
If `motto.yaml`'s version is written **only** at `init` and never touched again, it starts drifting the moment the user upgrades their global Motto install and runs `lint`/`build` again — the stamp will forever say the `init`-time version even after years of using a newer tool, making skew detection permanently "on" for every long-lived project and training users to ignore the warning (alert fatigue), which defeats the entire feature.

**Why it happens:**
"Stamp at init" is the obvious, minimal-surface-area implementation (matches this project's YAGNI philosophy and the fact that the upgrade command itself is explicitly deferred), but it leaves an open question the milestone doesn't yet answer: does `build` (or `lint`, or neither) ever *rewrite* the stamp to the currently-installed version once skew is detected and presumably tolerated? Without an explicit answer, the default behavior (never rewritten) is a decision made by omission, not by design — and "silently stale forever" is a materially different, worse UX than "intentionally version-locked."

**How to avoid:**
- Make the update-trigger decision **explicit and documented** in this milestone, even if the answer is "never, by design, until the upgrade command exists" — write it down as a Key Decision in PROJECT.md, not left implicit.
- If the decision is "stamp never auto-updates," the skew message (Pitfall 3) must reflect that permanence — i.e. don't word it as if the drift is temporary/accidental when it's actually the intended standing state.
- Consider whether `build` (which already touches the project tree and is run far more often than `init`) is a more natural rewrite point than `init`-only — but only if the project explicitly wants "skew is always transient," which contradicts the deferred-upgrade-command stance from PROJECT.md ("the upgrade command is deliberately deferred until the first real schema break demands it"). Given that stance, "never auto-rewrites" is the more consistent design — surface skew as a persistent, informational fact of life, not a bug to auto-heal away.

**Warning signs:**
- No test exists for "run build twice with two different installed-tool versions" to observe whether the stamp changes between runs.
- The skew message's wording implies an action loop that doesn't actually exist yet (e.g. "will be updated automatically" when nothing updates it).

**Phase to address:**
The stamping-mechanism phase — this is a design decision to lock (and record in Key Decisions), not just an implementation detail; it directly determines what the skew message in Pitfall 3 is allowed to promise.

---

### Pitfall 5: Semver comparison edge cases when deliberately avoiding a semver library

**What goes wrong:**
Motto's zero-dependency-beyond-`yaml` philosophy means comparison logic will likely be hand-rolled (split-on-dot, compare numerically) rather than pulling in the `semver` package. Hand-rolled comparison breaks on: prerelease/build-metadata suffixes (`0.0.7-beta.1` vs `0.0.7`ordering per spec is *lower*, not higher, than the plain release — a naive string or even naive numeric-tuple compare gets this backwards or ignores the suffix entirely, and Motto's own version history already includes non-monotonic-looking jumps like 0.3 → 0.6 that a naive parser must not choke on), the 0.x "anything can change" convention that has no formal comparison implication but is easy to accidentally encode as special-case logic that doesn't generalize once the project crosses 1.0, and simple segment-count mismatches (`"0.7"` vs `"0.0.7"` — two segments vs three).

**Why it happens:**
A minimal string-split-and-compare implementation looks correct against every version string the developer tests it with during development (which will always be well-formed three-segment releases, because that's all Motto has shipped so far), so the gap between "works for every version Motto has actually published" and "works for every string that can end up in a hand-edited YAML file" is invisible until a prerelease tag or malformed segment count shows up in the wild.

**How to avoid:**
- Scope the comparison function narrowly: Motto's own published versions are, and are likely to remain, plain `major.minor.patch` (no prereleases in the tag history to date per PROJECT.md). Write the comparator to handle exactly that shape correctly and **explicitly reject** (as a clean advisory, not attempt-and-guess) anything with a prerelease/build-metadata suffix or a non-3-segment count, rather than silently mis-comparing it. Narrow-and-correct beats broad-and-wrong for a zero-dependency implementation.
- If prerelease comparison is ever needed later (e.g. Motto ships a `0.0.8-rc.1`), that is the trigger to pull in `semver` as a second dependency — don't hand-roll prerelease ordering rules (numeric-vs-alphanumeric identifier precedence per semver.org) speculatively now.
- Test explicitly: equal versions, simple greater/less across major/minor/patch, and the "reject cleanly" path for prerelease-suffixed and wrong-segment-count strings — not just the numeric-comparison happy path.

**Warning signs:**
- A comparator that does `a.localeCompare(b)` or naive string comparison instead of per-segment numeric comparison (`"0.10.0" < "0.9.0"` as strings, which is wrong numerically).
- No test using a version string with a `-` or `+` suffix.

**Phase to address:**
The comparison-logic implementation phase — pair with Pitfall 2's malformed-input tests since both live in the same "parse and compare an untrusted string" function.

---

### Pitfall 6: Tests that assert the literal current version string break on every release

**What goes wrong:**
The most tempting way to test "the stamp matches the installed tool version" is `assert.strictEqual(stampedVersion, '0.0.7')` — a literal. Every single future release (0.0.8, 0.1.0, 1.0.0…) then requires manually updating this test, and if it's missed, either the test suite fails for a reason unrelated to the change being shipped (noise, erodes trust in red CI) or — worse — someone "fixes" the failure by just updating the literal without checking whether the underlying behavior is actually still correct, defeating the test's purpose entirely.

**Why it happens:**
Asserting against a literal is the fastest thing to write and passes immediately, and the coupling to "current version" is invisible until the next release happens — by which point the test was written and merged long ago by someone who's moved on to other work. This is a direct instance of the general brittle-test anti-pattern (hardcoding a value that's expected to change, rather than asserting the *relationship* the code is actually supposed to guarantee). [confidence: LOW — general testing-practice source, not version-specific, single web source]

**How to avoid:**
- Tests must read the actual installed/package version at test-run time (e.g. from `package.json` via the same code path the CLI itself uses to know its own version) and assert **relationships**: "stamped version after `init` equals whatever `package.json`'s version currently is," "skew is reported when stamped ≠ installed, using two arbitrarily-chosen-but-different fixture strings," "no skew reported when they're equal" — never a hardcoded literal like `'0.0.7'` baked into the assertion.
- For fixture-based comparator tests (Pitfall 5), use clearly-fake version strings (`'1.2.3'` vs `'1.2.4'`) rather than Motto's real current version, so the tests are permanently decoupled from Motto's actual release number.

**Warning signs:**
- `grep` the test suite for the literal current version string (`0.0.7`) — any hit inside an assertion (not a comment/fixture-setup for an unrelated purpose) is the smell.
- A test file that needed a diff in the same commit as a routine version bump with no other behavior change.

**Phase to address:**
The stamping/skew implementation phase, at test-writing time — this is a code-review checklist item (`/gsd-code-review`) as much as an implementation concern; flag literal-version greps as part of that phase's review pass given the project's existing pattern of catching invariant violations via review rather than initial test-writing alone.

---

### Pitfall 7: Claude Code marketplace/plugin update caching hides the very skew this feature is meant to detect

**What goes wrong:**
Motto self-hosts a Claude Code marketplace (`.claude-plugin/marketplace.json` inside the repo, per v0.0.3's distribution decision) to distribute its own skills (`release`, `build-skill`, `changelog`) as a plugin. Multiple **currently open, confirmed** upstream Claude Code issues describe the plugin-marketplace update path serving stale cached plugin files even after the marketplace source has genuinely been updated, with `claude plugin update` reporting "already at latest version" when it is not. If Motto's own consumer-facing skill distribution silently hands out a stale plugin, that's a *second*, invisible version-skew problem sitting one layer above the one this milestone is building detection for (project-vs-tool skew) — and no amount of `motto.yaml` stamping fixes a Claude Code-side caching bug.

**Why it happens:**
This is a bug in the consuming platform (Claude Code), not in Motto — but it's directly relevant to this milestone because "consumer plugin update loop verification (Claude Code marketplace)" is explicitly named in scope. The caching problem is specific to **directory/path-source marketplaces** (which is exactly Motto's self-hosted, in-repo `marketplace.json` setup) — the cached copy at `~/.claude/plugins/marketplaces/<name>/.claude-plugin/marketplace.json` is not reliably re-copied from the source path on update. [confidence: MEDIUM — 7 independent, currently-open GitHub issues against `anthropics/claude-code`: #72616, #61954, #16866, #69020, #17361, #37670, #13799]

**How to avoid:**
- Do not assume "I pushed a new version to the repo, therefore anyone who runs `claude plugin update` gets it" — verify by actually exercising the update loop end-to-end (uninstall/reinstall or explicit cache-clear as needed) rather than trusting the reported "already at latest" status, per the project's own standing memory note ("verify side-effect claims — check git/npm reality before trusting 'complete'").
- Document the known workaround (uninstall + reinstall the plugin, or manually clear `~/.claude/plugins/marketplaces/<name>/`) in whatever consumer-facing verification step this milestone produces, since there is currently no first-party fix — this is an upstream platform bug, not something Motto's own code can patch around.
- Treat this as a **verification gotcha**, not a code-change target: the fix belongs to Anthropic; Motto's responsibility is knowing the loop is unreliable and testing accordingly rather than assuming a green "already at latest" means the marketplace re-walk actually validated the current version.

**Warning signs:**
- A "marketplace re-walk" verification step that only checks `claude plugin update` output text rather than diffing actual installed plugin file contents/version against the source.
- Assuming the existing marketplace re-walk debt item (already tracked in PROJECT.md backlog from v0.0.6) is purely about npm `latest` staleness and not also about this independent caching layer.

**Phase to address:**
Whichever phase in this milestone covers "consumer plugin update loop verification (Claude Code marketplace)" per PROJECT.md's stated v0.0.7 scope — this is explicitly a verification/testing concern, not an implementation one, so it belongs in a UAT/verify pass rather than the core stamping code.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Stamp written only at `init`, never rewritten by `build`/`lint` | Minimal surface area, matches YAGNI-deferred-upgrade-command stance | Skew becomes the permanent, expected state for any long-lived project the moment the tool is upgraded once — must be paired with wording that treats this as normal, not a bug | Acceptable now, as an explicit, documented decision (see Pitfall 4) — not acceptable if left implicit |
| Hand-rolled 3-segment semver comparator, no prerelease support | Zero new dependency, matches existing single-dep (`yaml`) philosophy | Breaks (or must cleanly refuse) the moment Motto or a consumer project ever uses a prerelease/build-metadata tag | Acceptable indefinitely for Motto's own versions as long as Motto never ships a prerelease tag; revisit (pull in `semver`) the moment that changes |
| Skew detection is advisory-only (no exit-code change) | Never breaks existing CI/scripts that already call `motto lint`/`build` | Users can ignore skew warnings indefinitely with no forcing function | Acceptable and arguably correct — an upgrade *command* doesn't exist yet (deferred), so failing the exit code with no remedy path would be worse UX than an advisory |
| No backfill command for existing unstamped projects (magma, Motto's own tree) this milestone | Keeps scope to detection only, matches deferred-upgrade-command YAGNI stance | Every currently-scaffolded project stays permanently "unstamped" unless a human manually edits `motto.yaml`, or a future milestone adds a backfill path | Acceptable only if the "unstamped" state (Pitfall 1) is a fully clean, non-error, permanently-supported state — never acceptable if unstamped is treated as merely "temporarily tolerated" |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `motto.yaml` hand-editing by users | Assuming users only ever produce well-formed `version: "x.y.z"` strings | Type-check (`typeof === 'string'`) before any parsing; treat every other YAML-representable shape (number, array, object, boolean, null, empty string) as a clean, named, never-thrown validation entry (Pitfall 2) |
| Claude Code plugin marketplace (self-hosted, directory-source) | Trusting `claude plugin update`'s "already at latest" as ground truth when verifying the consumer update loop | Cross-check actual installed plugin file/version against the marketplace source directly; known upstream caching bugs mean the reported status can be wrong (Pitfall 7) |
| Existing consumer projects with no version awareness at all (magma, Motto's own pre-migration tree) | Treating "missing stamp" as a validation error because every test fixture used during development already had one | Explicitly write the zero-stamp fixture as the *first* test, before any happy-path skew test (Pitfall 1) |

## Performance Traps

Not applicable at this scale — version-stamp read/compare is a single small string operation per `lint`/`build` invocation; no performance concern at any realistic project size for this milestone.

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Interpolating the raw `version:` string value directly into a shell command or dynamic `require`/`import` path (e.g. for a future per-version behavior branch) | Path/command injection if a malicious or corrupted `motto.yaml` is ever processed (e.g. a shared/cloned project) | Validate against the strict semver regex (Pitfall 5) *before* any use beyond string comparison/display; never treat the stamp value as trusted enough for dynamic code paths |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generic "version mismatch" message with no direction | User "fixes" the wrong side (re-inits a fine project, or ignores a genuinely outdated tool) | Direction-aware messaging naming the concrete remedy per side (Pitfall 3) |
| Treating "no stamp" as scary/red output | Every existing project (magma, Motto's own tree) sees new alarming output the moment they upgrade, for doing nothing wrong | Informational, calm, single-line advisory; zero exit-code impact (Pitfall 1) |
| Skew warning that implies an auto-fix or command that doesn't exist yet | User tries to run an upgrade command that isn't shipped this milestone, hits a wall | Word the message to match what's actually true today — detection only, no remedy command yet (Pitfall 4) |

## "Looks Done But Isn't" Checklist

- [ ] **Missing-stamp handling:** Often only tested with a `version:` field already present in every fixture — verify at least one lint/build test uses a `motto.yaml` with the key entirely absent, and it passes clean with an advisory only.
- [ ] **Malformed-stamp handling:** Often only tested with valid-but-different semver strings — verify explicit adversarial tests exist for non-string YAML shapes (number, array, object, boolean, null) and malformed strings (empty, `"latest"`, missing segments, `v`-prefixed).
- [ ] **Skew direction:** Often only tested in the "tool is newer" direction (the only one the developer naturally encounters) — verify a test exists for the reverse (stamped version newer than installed tool).
- [ ] **Version literal leakage into tests:** Often the fastest test to write asserts the exact current version string — verify no test asserts a hardcoded literal that must change on every release; `grep` the suite for the current version number outside of intentionally-fake fixture data.
- [ ] **Marketplace update verification:** Often "verified" by reading `claude plugin update`'s stdout message alone — verify by actually diffing installed plugin content/version against source, given confirmed upstream caching bugs.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Missing-stamp treated as an error, shipped, breaks magma/existing projects | LOW | Patch release: change the missing-stamp branch to advisory-only; no data migration needed since nothing was corrupted, only over-strict validation |
| Malformed-stamp value crashes `lint`/`build` (never-throw violation shipped) | LOW–MEDIUM | Patch release with the type-guard added, plus retroactively add the missed adversarial test per this project's established post-incident pattern (as done for the 5 prior never-throw escapes) |
| Skew message ships with wrong-direction wording | LOW | Patch the message string and its test; no data/state to migrate, purely a copy fix |
| Stamp-update-trigger decision never made explicit, ships as "silently never updates" | LOW | Document the (already-true) behavior explicitly in PROJECT.md Key Decisions retroactively; no code change required if the behavior itself is acceptable, only the missing documentation |
| Claude Code marketplace cache serves stale plugin during the consumer verification walk | LOW (workaround exists) | Uninstall + reinstall the plugin, or manually clear `~/.claude/plugins/marketplaces/<name>/`, then re-verify; track as a known external platform limitation, not a Motto bug to fix |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Bootstrap problem (missing stamp treated as error) | Stamping/skew-detection implementation phase | Test suite includes a zero-version-key `motto.yaml` fixture; lint/build exit code and output reviewed to confirm advisory-only, never a failure |
| 2. Malformed stamp values crash never-throw boundary | Same phase as #1 (shared boundary code) | Adversarial test matrix: number, array, object, boolean, null, empty string, malformed-string version values — all must produce clean error entries, zero thrown exceptions; gated by `/gsd-code-review high` per project's established hardening pattern |
| 3. Skew message wrong-direction remedy | Skew-detection phase | Two explicit direction tests (project-behind, project-ahead) each asserting the message names the correct-for-that-direction remedy |
| 4. Stamp drift / no update trigger | Stamping-mechanism design decision, same phase as #1 | Decision recorded in PROJECT.md Key Decisions; message wording (from #3) reviewed for consistency with the chosen (likely "never auto-updates") behavior |
| 5. Semver comparison edge cases without a lib | Comparison-logic implementation, paired with #2 | Tests for equal/greater/less across all three segments, plus explicit-reject tests for prerelease-suffixed and wrong-segment-count strings |
| 6. Version-literal-in-tests brittleness | Test-writing time within the implementation phase | Code-review pass (`/gsd-code-review`) greps the new test files for the literal current version string outside of clearly-fake fixture data |
| 7. Claude Code marketplace cache hides skew | Consumer plugin update loop verification step (explicitly in v0.0.7 scope per PROJECT.md) | Verification diffs actual installed plugin version/content against marketplace source directly, not just `claude plugin update`'s reported status; known-issue workaround documented |

## Sources

- [semver.org — Semantic Versioning 2.0.0](https://semver.org/) — prerelease ordering rules, 0.y.z "anything may change" clause. Confidence: MEDIUM (primary spec).
- [npm semver package / npm docs semver reference](https://docs.npmjs.com/cli/v6/using-npm/semver/) — prerelease range-matching surprises (a prerelease only satisfies ranges sharing its [major,minor,patch] tuple with a prerelease comparator). Confidence: LOW (single web synthesis, not independently cross-checked for this specific claim).
- [HashiCorp Terraform — Version Constraints (Configuration Language)](https://developer.hashicorp.com/terraform/language/expressions/version-constraints) and [Manage Terraform versions tutorial](https://developer.hashicorp.com/terraform/tutorials/configuration-language/versions) — direction-aware "too new/too old" constraint error design; pessimistic-constraint (`~>`) best practice. Confidence: MEDIUM (official HashiCorp docs, corroborated by independent community write-ups on constraint-error UX confusion, e.g. hashicorp/terraform issues #26631, #21424).
- [anthropics/claude-code GitHub issues #72616, #61954, #16866, #69020, #17361, #37670, #13799](https://github.com/anthropics/claude-code/issues/72616) — confirmed, currently-open, independently-filed reports of stale marketplace/plugin cache surviving `claude plugin update`, specific to directory/path-source marketplaces (Motto's own distribution shape). Confidence: MEDIUM (7 independent first-party-repo issue reports, cross-checked against each other; no first-party fix confirmed yet, so treat as an ongoing platform limitation rather than a resolved-with-version-X fact).
- General schema/config-versioning practice (missing-version-field-means-oldest-version pattern; incremental v1→v2→v3 migration functions) — synthesized from general software-engineering literature on config schema versioning. Confidence: LOW (single web synthesis, not Motto- or Claude-Code-specific, not independently cross-checked).
- General brittle-test anti-pattern (hardcoded dynamic-value assertions) — synthesized from general testing-practice sources. Confidence: LOW (single web synthesis; the version-specific application is this document's own inference, not sourced directly).
- `.planning/PROJECT.md` (this repo) — v0.0.7 scope, standing upgrade-path constraint, prior never-throw violation history (v0.0.2, Phase 10, 15, 18, 20), v0.0.3 self-hosted marketplace decision. Confidence: HIGH (first-party project record).
- User memory note "Motto never-throw invariant" — 5 historical tests-green-but-broken escapes, adversarial-tests-mandatory standing rule. Confidence: HIGH (first-party project record).

---
*Pitfalls research for: version stamping + skew detection retrofit onto a shipped CLI with existing unstamped consumer projects*
*Researched: 2026-07-06*
