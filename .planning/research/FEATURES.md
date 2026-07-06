# Feature Research

**Domain:** Version stamping + version-skew detection for a scaffolding/lint/build CLI (Motto v0.0.7 "Version Awareness")
**Researched:** 2026-07-06
**Confidence:** MEDIUM (cross-checked pattern across 8+ independent tools; individual tool details are web-search-sourced, not primary-doc-verified — treat specific error-message wording as illustrative, not exact quotes)

## Grounding: current CLI shape (read from source, not assumed)

`src/lint.js` and `src/build.js` already return `{ ok: boolean, errors: Array<{ skill: string, message: string }>, count: number }` (lint) and the equivalent shape for build (`errors`, `outDir`, `skillCount`, `bucketCount`). There is **no `warnings` array today** — everything that surfaces is either a hard error or nothing. `motto.yaml`'s current scaffolded template (`src/init.js` line ~149) is:

```yaml
name: <name>
version: "0.1.0"
description: <description>
plugins:
  public: <name>
```

There is no field recording which Motto version scaffolded the project — this milestone adds the first one. `--format json`/`--quiet` (shipped v0.0.6) already give Motto a structured-output surface a skew field can extend without inventing a new output mode.

## Prior Art Table

| Tool | What's stamped | Where | Stamped at | Re-stamped on...? | Skew direction enforced | Warn vs error | Message style |
|------|----------------|-------|------------|-------------------|------------------------|---------------|----------------|
| **Rails** | Framework-defaults version (`X.Y`) | `config.load_defaults X.Y` in `config/application.rb`; Rails version also dumped into `schema.rb` | App generation (`rails new`) | **Never automatically.** Only a human, after manually testing each new default via a generated `new_framework_defaults_X_Y.rb` scratch file, bumps the call by hand. | Project-older-than-installed-gem is the only direction that matters (gem is always ≥ app's stamped defaults) | Neither — it's a *silent behavior change* if you don't run `app:update`; Rails instead makes the migration path a first-class generated file, not a runtime warning | The generated file lists every changed default as a commented-out line with inline doc links — maximally actionable, zero ambiguity |
| **Terraform** | Exact CLI version constraint | `required_version` in a `terraform {}` block | Authored by hand (rarely auto-written) | Never auto-changed | **Both directions** — CLI too old *or* too new both fail if outside the range | **Hard error**, blocks all operations (plan/apply/state) | `Error: Unsupported Terraform Core version` + file/line + the exact constraint string + the actual running version |
| **Cargo (Rust)** | Minimum supported Rust version | `rust-version` in `Cargo.toml` | Manually authored | Never auto-bumped; drifts silently as transitive deps raise the real floor — a known, named problem; `cargo-msrv` is a separate opt-in tool to detect drift | Project-requires-newer-than-installed only | **Hard error** at dependency resolution (`cargo` refuses to resolve the graph) | Resolver error naming the dependency that raised the floor — sometimes confusing because it surfaces as a resolution failure, not a clear "your Rust is too old" message |
| **ESLint** | Config schema/format version | Implicit in which config file exists (`.eslintrc.*` vs `eslint.config.js`) | N/A — inferred from file presence | N/A | Old-format-under-new-tool | **Long deprecation window, then hard break at a major version** (v9 warns/shims, v10 removes support entirely) | Migration guide + automated CLI migrator tool, not a runtime message |
| **Volta** | Exact tool versions (node/npm/pnpm) | `"volta": {...}` key in `package.json`, separate from `engines` | `volta pin` (explicit user command) | Re-pinned only by explicit `volta pin` | Any mismatch between `engines` and `volta`, or between pinned and active | **Warning only** (`WARN Unsupported engine...`), does not block | Wanted vs current shown side by side |
| **npm lockfileVersion** | Lockfile schema version (integer) | `lockfileVersion` field in `package-lock.json` | Every `npm install` | **Silently auto-upgraded** by newer npm on next install | Tool-older-than-lockfile only matters (newer npm reading older lockfile just upgrades it) | **Warning** when tool is older than lockfile; **silent auto-upgrade** when tool is newer | Plain "created with an old version of npm" warning |
| **Angular CLI** | Framework version implicit in installed packages; `angular.json` has no explicit stamped version field | Migration schematics keyed by `--from`/`--to` version flags on `ng update` | N/A (inferred from installed package.json versions) | Migrations run explicitly via `ng update`, never automatically | Both directions can break: stale detection of "current" version is a **recurring bug source** — the tool assuming the wrong current version is a top complaint | Command aborts / skips migrations silently when version-detection is wrong (an anti-pattern, not a design goal) | Weakest of the prior art — cited GitHub issues show this is a pain point, not a solved problem |
| **Yeoman** | Optional generator version | `.yo-rc.json`, namespaced per generator | Scaffold time, only if the generator author opts in | Never — no core mechanism at all | None enforced by core Yeoman | N/A — not a framework feature, a community convention | N/A |
| **cookiecutter** | Nothing, by default | N/A | N/A | N/A | None | None | Explicitly named as a gap: users have open feature requests (`#1921`, `#1135`) asking for exactly this capability — evidence that its absence is felt as a real deficiency |

**Reading across the table:** the tools with the *best* reputations here (Rails, Terraform) both (a) stamp explicitly and legibly, (b) never silently re-stamp, and (c) treat the human as the one who decides when the project has "caught up." The tools with a bad reputation here (Angular CLI, cookiecutter) either have no explicit stamp at all or get the "what version are we actually on" detection wrong. This directly validates Motto's plan: explicit `motto.yaml` stamp + never-auto-restamp + explicit message.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist once a tool claims "version awareness." Missing these = the feature feels half-built or actively misleading.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stamp the tool version at scaffold time (`motto init`) | Universal pattern (Rails, Volta, Yeoman-when-used, Terraform-adjacent). Without it there's no signal to detect skew at all — this is the precondition for everything else in this milestone. | LOW | Add a `motto:` key (or similar, e.g. `scaffolded_with:`) to `motto.yaml` alongside existing `name`/`version`/`description`. One-line change to the `src/init.js` template string. |
| Detect skew and print an explicit message during `lint`/`build` | Terraform and Rails both treat this as core, not optional. A stranger (magma) hitting a hard break with zero warning (v0.0.5's `<role>` migration) is exactly the failure this milestone exists to prevent. | LOW–MEDIUM | Read stamped version from `motto.yaml`, compare via semver-order to the running package's own version (already available from `package.json` at runtime). No new dependency — major/minor/patch comparison is simple integer parsing; a real `semver` package is unnecessary for this scope and would violate the project's single-dependency (`yaml`) constraint. |
| Message names both versions and gives a next step | Every credible prior-art tool (Terraform's error, Rails' generated file, Volta's WARN) shows *wanted vs actual* side by side. A message that says only "version mismatch" without both numbers is useless — Angular CLI's vague failures are the cautionary example in this research. | LOW | Message template: `Project scaffolded with motto vX.Y.Z; running motto vA.B.C. <specific guidance>`. Fits directly into the existing `{ ok, errors: [{skill, message}] }` result shape — a skew finding is just another entry (or a new `warnings` array — see open question below). |
| Missing/absent stamp is handled gracefully, not a crash | Every real Motto project shipped before v0.0.7 (v0.0.1–v0.0.6 era, including magma if scaffolded pre-upgrade) has no stamp field at all. A stranger's project must not explode on this — consistent with Motto's own repeatedly-hardened never-throw invariant. | LOW | Treat missing field as "unknown, assume compatible" — skip the skew check silently rather than erroring on absence, matching how other optional `motto.yaml` fields are already handled in `config.js`. |

### Differentiators (Competitive Advantage)

Features that set this apart from the sloppier prior art (Angular CLI, cookiecutter) without over-building.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Distinguish skew **direction** in the message (project newer than tool vs tool newer than project) | Most prior art (Volta, npm) treats skew as one bucket. Terraform is the only prior-art tool studied that explicitly handles both directions symmetrically — worth emulating. "Tool newer than project" (project hasn't been touched since an upgrade) is the common, higher-risk case — most likely to hit a real structural break like the `<role>` migration. "Project newer than tool" (stale global install, or downgraded local dep) is a different problem with different advice. | LOW–MEDIUM | Direction changes the actionable advice: tool-newer-than-project → "check CHANGELOG for structural changes between vX and vY"; project-newer-than-tool → "upgrade motto itself." |
| Severity keyed to **semver distance / documented breaking boundary**, not just "any mismatch" | Patch/minor skew is almost always harmless — most Motto version bumps to date (v0.0.1→v0.0.6) were not structural breaks. Warning loudly on every patch bump would train users to ignore the message (the npm lockfileVersion "just a warning, ignore it" fatigue is the cautionary tale). Reserve strong language for skew spanning a *documented* breaking change. | MEDIUM | Requires a short, hand-maintained ledger of which versions introduced breaking structural changes (starting with v0.0.5's `<role>` migration, documented retroactively). This ledger **is** the "standing upgrade-path policy" PROJECT.md already commits to for this milestone — same artifact, not two separate ones. |
| `--format json` skew field for CI/agentic consumers | Motto already ships `--format json` (v0.0.6, CLIX-01..03). Surfacing skew as a structured field (e.g. `{ skew: { projectVersion, toolVersion, direction, severity } }`) lets scripts/agents act on it programmatically instead of parsing prose. | LOW | Extends the existing JSON output shape — no new output mode, just a new optional field, populated only when a stamp exists and differs. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem helpful but would undermine the point of version awareness, contradict prior art, or violate Motto's own constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| **Auto-update the stamp silently** (e.g. `motto build` rewrites `motto.yaml`'s stamped version to match the running tool on every run) | Feels convenient — "just keep it in sync automatically" | Contradicts every credible prior-art tool studied. Rails explicitly refuses to auto-bump `load_defaults` — the stamp exists to represent "what the project has been *verified* to work with," not "what tool happens to be installed right now." Auto-updating destroys that signal and silently erases evidence that an upgrade step was skipped — exactly the failure mode this milestone exists to make visible, and exactly what the user's own framing named as "surprising." | Stamp is written once at `init`. Only a future, explicit `upgrade` command (deliberately deferred this milestone) should ever change it, and only after any required structural changes have actually been applied. |
| **Build the `upgrade` command this milestone** | Feels like the "complete" feature — detect *and* fix in one milestone | Explicitly out of scope per PROJECT.md ("upgrade COMMAND is deliberately deferred (YAGNI) — only detection/awareness this milestone"). Designing a migration mechanism (Angular-CLI-style schematics) before there's a second real breaking change to validate it against repeats the exact premature-generality trap Motto's stated philosophy (mechanism over features, YAGNI ruthlessly) exists to avoid — and echoes how `template:` was correctly deferred until designed against the real `release` skill in v0.0.5. | Ship detection + an actionable message only. Design the upgrade mechanism against the *next* real structural break, the same way prior features were designed against concrete cases. |
| **Blocking hard error on any skew, including patch/minor** | Mirrors Terraform's hard-block model, feels "safe" | Terraform's users provision infrastructure — a wrong version can corrupt state; the stakes justify a hard stop. Motto lints/builds skill files; most historical bumps involved no structural break at all. Hard-erroring on every skew would cry wolf constantly and train users to route around or ignore the check (the same fatigue npm lockfileVersion warnings already show in the wild). | Warn by default; reserve stop-and-look language for skew spanning a documented breaking-change boundary (see severity differentiator above). |
| **Full semver range/constraint syntax in `motto.yaml`** (Terraform-style `required_version = ">= X, < Y"`) | Looks more "correct" / expressive than a single stamped value | Motto isn't a library with many external consumers pinning ranges against many providers — it's a single first-party CLI a project was scaffolded by once. There is exactly one "current installed tool version" to compare against at any time. A range parser adds real semver-range-parsing complexity and a new dependency, contradicting the project's explicit single-dependency (`yaml`) / minimal-maintenance-surface constraint. | Store one exact version string; compare via simple parsed-integer major/minor/patch ordering, no new dependency required. |
| **Version check as its own subcommand** (`motto check-version`) | Seems modular, "does one thing" | Adds a fourth top-level verb to a CLI that has deliberately stayed minimal (`init`, `lint`, `build`, plus `--help`). Users would have to remember to run it separately — defeating the point, since skew should be caught for free during commands they already run routinely. | Fold the check into the start of `lint` and `build` (both already read `motto.yaml`) — zero new commands, zero new user habit required. |

## Feature Dependencies

```
[Stamp motto version at init]
    └──requires──> [motto.yaml schema gains a version-of-motto field]
                       (config.js/schema.js must tolerate its presence AND its absence)

[Skew detection in lint/build]
    └──requires──> [Stamp motto version at init]
                       (nothing to compare without a stamp — this is a strict prerequisite,
                        not a parallel track)
    └──requires──> [Running tool's own version accessible at runtime]
                       (read from package.json — already trivial in Node, no new work)

[Skew-severity table / breaking-change ledger]
    └──requires──> [Standing upgrade-path policy]      (PROJECT.md constraint, already decided)
    └──enhances──> [Skew detection in lint/build]       (turns "any difference" into
                        "meaningfully actionable difference")

[--format json skew field]
    └──requires──> [Skew detection in lint/build]
    └──enhances──> [Existing --format json output]      (v0.0.6, CLIX-01..03)

[Auto-update stamp silently] ──conflicts──> [Skew detection in lint/build]
    (anti-feature: if the stamp is silently rewritten, there is nothing left to detect —
     the two are mutually exclusive by design, not sequential)

[Upgrade command] ──deferred, not built this milestone──> [Skew detection in lint/build]
    (skew detection is the prerequisite signal a future upgrade command would consume;
     building the command first would be backwards)
```

### Dependency Notes

- **Skew detection strictly requires the stamp to exist first.** Motto has zero pre-existing projects with a version stamp today — the *first* real skew check any project will ever run is "no stamp found." This must ship in the same phase as (or immediately after) the stamping feature, not as an independent parallel track.
- **Auto-update conflicts with detection by design, not by oversight.** These are not sequential features to build one after the other — naming the conflict explicitly in the roadmap prevents someone from "helpfully" adding auto-restamp as a later follow-on that quietly defeats the entire point of this milestone.
- **The severity table *is* the upgrade-path policy, not a separate artifact.** PROJECT.md already names "standing constraint: every structure/schema change ships with a documented upgrade path" as a target for this milestone. The ledger of which versions broke structure is the same data the severity-aware message needs to consult. Building them as two separate files would duplicate data and risk drift between them.
- **Upgrade command depends on detection, never the reverse** — PROJECT.md is explicit about this sequencing ("version awareness is the detection layer that makes that future command possible"). Scope creep pulling the command into this milestone should be resisted.

## MVP Definition

### Launch With (v0.0.7)

- [ ] `motto init` stamps the running motto version into `motto.yaml` — the precondition for all detection
- [ ] `motto lint`/`motto build` read the stamp, compare to the running tool's own version, and emit an explicit, actionable, never-throw message on any detected skew (both directions handled, at minimum via plain major/minor/patch comparison)
- [ ] Message names both versions and gives at least a generic next step (e.g. "see CHANGELOG for changes between vX and vY")
- [ ] Missing stamp (pre-v0.0.7 projects, including magma if scaffolded earlier) is handled as "unknown" — no crash, no false-positive warning
- [ ] A written, versioned ledger of breaking structural changes (starting with the v0.0.5 `<role>` migration, documented retroactively) that both the severity logic and the "standing upgrade-path policy" reference

### Add After Validation (v0.0.7.x / next milestone)

- [ ] `--format json` structured skew field, once plain-text message wording is validated against a real skew case (magma running an older/newer motto against its scaffolded version)
- [ ] Severity distinction (patch/minor = quiet or no warning; major or documented-breaking-boundary = louder message), once there's a second real breaking change to calibrate against

### Future Consideration (v2+ / not this milestone)

- [ ] An actual `upgrade` command walking a project through structural changes — deferred explicitly per PROJECT.md until the next real schema break demands it
- [ ] Any semver-range constraint syntax in `motto.yaml` — no present use case; a single exact-version stamp is sufficient

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Stamp version at init | HIGH | LOW | P1 |
| Skew detection + message in lint/build | HIGH | LOW–MEDIUM | P1 |
| Graceful handling of missing stamp | HIGH (prevents regressions on existing projects) | LOW | P1 |
| Breaking-change ledger / upgrade-path policy doc | HIGH (this *is* the standing constraint PROJECT.md names) | LOW–MEDIUM | P1 |
| Skew direction distinguished in message | MEDIUM | LOW | P2 |
| Severity keyed to semver distance / breaking-boundary | MEDIUM | MEDIUM | P2 |
| `--format json` skew field | LOW–MEDIUM (mainly for CI/agentic consumers) | LOW | P2 |
| Upgrade command | Deferred — not evaluated this milestone | — | P3 (explicitly out of scope) |

**Priority key:**
- P1: Must have for v0.0.7 launch
- P2: Should have, add once P1 is validated against a real skew (magma)
- P3: Nice to have, explicitly deferred by PROJECT.md

## Competitor Feature Analysis

| Feature | Rails (best-in-class) | Angular CLI (cautionary) | Motto's Approach |
|---------|------------------------|---------------------------|-------------------|
| Explicit stamp of scaffolding-time version | Yes (`load_defaults X.Y`) | No — inferred from installed packages, a recurring bug source | Yes — `motto.yaml` field, single source of truth |
| Auto re-stamp | Never (human-gated) | N/A | Never (anti-feature, explicitly rejected) |
| Message actionability | Very high — generates a file listing every changed default | Low — version-detection failures surface as confusing migration skips | High — names both versions + next step; severity-aware follow-up planned |
| Hard error vs warning | Neither (behavior-change-if-ignored, not a runtime check) | N/A (detection bugs, not a deliberate warn/error design) | Warn by default; reserve stronger language for documented breaking boundaries |

## Sources

- `oneuptime.com/blog/post/2026-02-23-how-to-fix-terraform-version-constraint-errors` — Terraform version constraint error format and enforcement behavior. Confidence: MEDIUM (secondary blog, cross-checked against HashiCorp support article in the same result set).
- `developer.hashicorp.com/terraform/language/expressions/version-constraints` — Terraform `required_version` official semantics. Confidence: MEDIUM (official docs, summarized via search snippet, not directly fetched).
- `rust-lang.github.io/rfcs/2495-min-rust-version.html`, `doc.rust-lang.org/cargo/reference/rust-version.html` — Cargo `rust-version`/MSRV official semantics. Confidence: MEDIUM.
- `github.com/rust-lang/cargo/issues/16549` — `rust-version` field is "misleading," known silent-drift problem. Confidence: MEDIUM (maintainer-acknowledged issue).
- `angular.dev/cli/update`, `github.com/angular/angular-cli/issues/32517`, `#25925` — `ng update` behavior and version-detection bugs. Confidence: MEDIUM (official docs + multiple corroborating GitHub issues).
- `eslint.org/docs/latest/use/migrate-to-9.0.0`, `migrate-to-10.0.0`, migration guide — ESLint flat-config deprecation timeline. Confidence: MEDIUM (official docs).
- `github.com/volta-cli/volta` issues (`#742`, `#1774`, `#1033`, `#986`), `docs.volta.sh/reference/pin` — Volta engines/pin behavior and warning format. Confidence: MEDIUM (project issue tracker + official reference doc).
- `yeoman.io/authoring/storage.html`, `npmjs.com/package/update-yeoman-generator` — `.yo-rc.json` version-stamping convention (community pattern, not core Yeoman). Confidence: MEDIUM.
- `guides.rubyonrails.org/configuring.html`, `guides.rubyonrails.org/upgrading_ruby_on_rails.html`, `fastruby.io` (2 articles), `dev.to/michymono77` — Rails `config.load_defaults` and `schema.rb` version-stamping/upgrade-guide mechanics. Confidence: MEDIUM (official guides + specialized Rails-upgrade consultancy blog, cross-corroborated).
- `bobbyhadz.com/blog/npm-warn-old-lockfile...`, `docs.npmjs.com/cli/v11/configuring-npm/package-lock-json`, `github.com/npm/cli/issues/4596` — npm `lockfileVersion` warning and silent-upgrade behavior. Confidence: MEDIUM (official docs + corroborating issue).
- `github.com/cookiecutter/cookiecutter/issues/1921`, `#1135`, `pypi.org/project/cookiecutter-project-upgrader` — cookiecutter's *lack* of built-in version tracking, used as negative-example prior art. Confidence: MEDIUM.
- Motto codebase (`src/lint.js`, `src/build.js`, `src/init.js`) — directly read to confirm existing `{ ok, errors: [{skill, message}], count }` result shape and current `motto.yaml` template has no motto-version field yet. Confidence: HIGH (primary source, own codebase).

---
*Feature research for: Motto v0.0.7 Version Awareness*
*Researched: 2026-07-06*
