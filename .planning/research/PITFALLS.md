# Pitfalls Research

**Domain:** Adding a template/schema-profile mechanism, `outputs`/`dependencies`/`allowed-tools` validation, and a skill-generating Agent Skill (`build-skill`) to an existing strict linter (Motto v0.0.5, building on v0.0.4)
**Researched:** 2026-07-02
**Confidence:** HIGH (majority of findings verified by direct reading of `src/schema.js`, `src/frontmatter.js`, `src/build.js`, `src/lint.js`, `shared/references/skill-schema.md`, and the v0.0.5 design spec — first-party ground truth; generic software-engineering pitfalls cross-checked against MEDIUM-confidence web sources, cited below)

## Critical Pitfalls

### Pitfall 1: Template mechanism ships with no evolution story — silent breaking changes and misattributed errors

**What goes wrong:**
`TEMPLATES.procedure.requiredSections` (design spec §1) is a plain data object with no version field. The moment a future Motto release adds a third required section to `procedure` (or renames a template), every skill that previously linted clean under `template: procedure` starts failing lint with no changelog signal inside the skill file itself — the frontmatter has no `template-version` or Motto-version pin. Separately, when a template-specific check *does* fail (e.g. missing `<process>`), if the error message is folded into the generic error stream without a clear "this comes from `template: procedure`" prefix, users who don't remember they opted into a template will not connect the dots — especially since base skills (no `template:`) never see this class of error at all.

**Why it happens:**
The NAME field cascade in `schema.js` is the only precedent for "ordered, attributed" error output; the new template checks are a different shape (opt-in, additive, keyed by an external registry) and it's easy to bolt them on as one more independent check without giving them a distinct message prefix or registry-level versioning, because v0.0.5 explicitly deprioritizes an interpolation/versioning engine as YAGNI (D-08 precedent).

**How to avoid:**
- Every template-sourced lint error must state the template name in the message (e.g. `template "procedure" requires a <process> section`), never just `<process> section required` — mirrors the existing pattern where NAME-cascade messages always restate the offending value.
- Unknown `template:` value errors must enumerate available template names (already specified in the design: "Unknown name → lint error listing available templates" — verify this is actually implemented, not just designed).
- Treat any future change to `TEMPLATES.*.requiredSections` as a breaking change requiring a CHANGELOG note; do not silently widen requirements in a patch release.
- Template name lookup should be case-sensitive and exact-match only (consistent with `NAME_KEBAB` being case-strict elsewhere) — do not add fuzzy/case-insensitive matching, it just hides typos.

**Warning signs:**
- A lint error mentioning a required section (`<process>`, `<success_criteria>`) with no mention of which template introduced the rule.
- Adding a new template or new required section to an existing template in the same commit as unrelated schema work (no isolated CHANGELOG entry).

**Phase to address:**
Template mechanism phase (schema.js + templates.js implementation).

---

### Pitfall 2: Section-tag presence check false-positives (and false-negatives) inside fenced code blocks

**What goes wrong:**
The `procedure` template's presence check for `<process>` / `<success_criteria>` is almost certainly implemented as a body-wide regex/substring test (mirroring the existing `/^\*\*Role:/m.test(bodyStr)` pattern). Motto's own documentation habitually shows *example* SKILL.md bodies inside fenced code blocks (see `skill-schema.md` §7, and any future `build-skill` docs teaching the `<process>`/`<success_criteria>` tags by example). A naive regex scan does not distinguish "real" tags from tags quoted inside a ```` ``` ```` fence used purely for illustration:
- **False positive (lint passes when it shouldn't):** a `procedure`-template skill whose body only *documents* `<process>` inside a fenced example (never has a real top-level section) is reported as valid — a semantically hollow skill ships clean.
- **False negative (lint fails when it shouldn't):** a skill with a legitimate `<process>` section elsewhere in the body could be miscounted if the tag-matching logic tries to track open/close pairs and a fenced example throws off the count (e.g. an odd number of open/close tags across real + example content).

**Why it happens:**
This is the *exact same bug class* the frontmatter stray-delimiter detector already had to solve for `---` (see `frontmatter.js` steps 4 and `skill-schema.md` §7: *"Wrapping example SKILL.md blocks in fenced code blocks avoids this edge case"*) — but that fix was scoped narrowly to the `---` delimiter, not to arbitrary XML-ish tags in the body. Anyone implementing section-tag detection without re-reading that precedent will reintroduce the identical mistake in a new location.

**How to avoid:**
- Before running any tag-presence regex over `body`, strip fenced code regions first (both ```` ``` ```` and `~~~` fences, respecting an unterminated fence by treating "rest of file" as code — same conservative posture as the existing delimiter scanner).
- Build this as one shared, unit-tested helper (`stripFencedCode(body)` or similar) rather than inlining ad-hoc regex per template — future templates (`<drill>`, `<run>`, `<mcp>` per the evolution ledger) will need the same primitive.
- Add adversarial fixtures explicitly mirroring the ones that caught the stray-delimiter bug: a `procedure` skill whose *only* `<process>` tag is inside a fenced example (must fail lint), and a skill with a real section *plus* a fenced example of the same tag (must still pass, counting only the real one).
- Keep the tag-matching regex anchored/non-backtracking, per the codebase's existing ReDoS discipline (T-02-01 in `schema.js`) — this is new user-controlled input surface (arbitrary Markdown body).

**Warning signs:**
- Any `<tag>` detection implemented as `body.includes('<process>')` or a single unscoped regex with no code-fence awareness.
- Test fixtures for the new template that never include a fenced-code example of the tag being tested.

**Phase to address:**
`procedure` template implementation phase (the phase that adds `<process>`/`<success_criteria>` presence checking) — must land in the same phase/PR as the checks themselves, not as a follow-up hardening pass, since Motto's own `shared/references/skill-schema.md` and `build-skill`'s teaching content will contain exactly this trigger pattern from day one.

---

### Pitfall 3: `dependencies:` resolution allows a public skill to depend on a private one (audience-direction leak)

**What goes wrong:**
D-05 scopes dependency validation to "bare kebab name → must exist in project `skills/` tree." A bare existence check (`skillNames.has(depName)`) says nothing about the *audience* of the dependency relative to the dependent. A `public` skill can legally list a `private` skill in `dependencies:` and pass lint, because the private skill genuinely exists in `skills/`. At build time (`build.js`) skills are packed per-bucket with no dependency-content copying (unlike `shared_references`, nothing about `dependencies:` gets bundled) — so the leak is not a file-copy leak, it is a **frontmatter disclosure + broken-reference leak**: the public plugin ships to every consumer with a `dependencies:` entry naming a skill (and, by name, revealing its existence/purpose) that will never be present in their installation, because private-bucket skills are never distributed to end users at all (per `PROJECT.md`: "audience binary... A `both` value would collide across locally-installed plugins"). Any runtime or tooling that tries to resolve that dependency for a public consumer fails silently or confusingly.

**Why it happens:**
The design spec's D-05 decision text focuses entirely on *existence* ("lint what's verifiable") and never mentions audience direction — it is a genuine gap in the design, not an oversight caught during spec review. The natural implementation path (reuse the flat `Set<string>` of skill names already computed for other purposes) has no audience information attached unless someone deliberately widens the data structure.

**How to avoid:**
- Mirror the exact pattern already used for the private-contradiction check in `build.js` (D3-12: `audience === 'private' && !config.plugins?.private`) — add a **direction rule** at lint time: `public` skills may only declare bare-name dependencies on other `public` skills; `private` skills may depend on either `public` or `private` skills.
- This requires the dependency resolver to load each candidate skill's own `audience` field (not just its name) — i.e. reuse the same `{name, audience}` shape `build.js`'s `discoverSkillNames` + `loadSkillData` already produce, rather than a bare name Set.
- Emit a specific, actionable error: `dependency "X" is audience:private but this skill ("Y") is audience:public — public skills cannot depend on private skills`.
- Add this as an explicit adversarial test case (public → private dependency) alongside the self-reference and missing-dependency cases (Pitfall 4).

**Warning signs:**
- Dependency resolution implemented against a plain array/Set of skill names (no audience attached).
- No test fixture pairing a `public` dependent with a `private` dependency.

**Phase to address:**
Validated optional fields phase (`outputs`/`dependencies`/`allowed-tools`) — flag explicitly in that phase's plan/spec, since it is not covered by the current design decisions and needs its own line item.

---

### Pitfall 4: Self-referencing dependency passes a naive existence check

**What goes wrong:**
A skill listing its own name in `dependencies:` (`skills/foo/SKILL.md` with `dependencies: [foo]`) is nonsensical but will pass a check shaped like "does this name exist in `skills/`?" — because the skill trivially exists (it's itself). This is the smallest possible instance of the broader cycle-detection problem (A→B→A), and easy to omit because v0.0.5 deliberately scopes dependency validation to flat existence, not graph traversal — so nobody is thinking about cycles at all, and the self-reference case slips through as "just another name that resolves."

**Why it happens:**
Flat existence checks are set-membership tests; they have no notion of "the caller." Guarding against self-reference requires threading the current skill's own name into the per-entry check — an extra parameter that's easy to forget to plumb through, unlike the shared_references check (which never needs to know "whose" reference list it's validating, because collision with self isn't meaningful there).

**How to avoid:**
- Add an explicit `depName === dirName` guard before the existence check, with a distinct error message (`dependency "X" cannot depend on itself`) — don't let it fall through to a generic "not found" or (worse) silently pass.
- True multi-hop cycles (A→B→A) are out of scope for a flat existence check by design (D-05) — do not attempt full graph cycle detection in v0.0.5 (YAGNI, matches "MCP-dependency resolution" being explicitly deferred), but log this as a known limitation in `skill-schema.md` §6 rather than leaving it unstated, so `build-skill`'s self-verify loop doesn't get stuck trying to "fix" something lint will never flag.

**Warning signs:**
- Dependency test fixtures that cover "missing dependency" and "valid dependency" but never "self dependency."

**Phase to address:**
Validated optional fields phase (same phase as Pitfall 3 — both are dependency-resolution edge cases and should be planned together).

---

### Pitfall 5: `outputs:` path-safety check is a different shape than the existing `shared_references` check — copy-pasting the wrong pattern breaks either safety or usability

**What goes wrong:**
The existing, working path-safety precedent in the codebase (`shared_references`, `schema.js` D-10) is "reject any entry containing `/` or `.`" — i.e. bare basenames only, no subdirectories. `outputs:` (D-04) explicitly needs to support paths like `templates/output.md` (nested), so the shared_references pattern *cannot* be reused as-is: applying it verbatim would reject every legitimate nested output path. Conversely, if an implementer relaxes the check to "allow `/`" without adding real traversal protection, `outputs: { report: "../../etc/passwd" }` or an absolute path (`/etc/passwd`) becomes a plausible-looking, unguarded entry. A third, quieter failure mode: the check calls `stat()` (follows symlinks) rather than `lstat()`, so an output entry that is secretly a symlink pointing outside the skill directory (e.g. to a file on the author's machine, or elsewhere in the repo) is reported as "exists" at lint time; `motto build`'s `cp(..., { verbatimSymlinks: true })` then copies that symlink reference (not its target) verbatim into `dist/`, shipping a foreign or dangling symlink to every consumer — this is not hypothetical, `build.js`'s own comments already document hitting a real symlink-rewriting bug on macOS during shared-reference copying ("Default and dereference:false silently rewrite relative symlinks to absolute paths pointing into the source tree on macOS (Node 24 verified)").

**Why it happens:**
`outputs:` is the first Motto field that both (a) needs subdirectory support and (b) points at *arbitrary existing files* rather than a fixed, pre-scanned directory listing (unlike `shared_references`, which is checked against a `Set` built once via `readdir`). That combination is genuinely new territory in this codebase — there's no existing helper to reuse safely, only one that looks superficially similar but solves a narrower problem.

**How to avoid:**
- Resolve every `outputs:` value with `path.resolve(skillDir, value)` and reject unless the resolved path starts with `skillDir + path.sep` (the standard `startsWith(base + sep)` guard — the `+ sep` matters, without it `skills/foo` and `skills/foo-evil` both pass a naive prefix check).
- Reject any entry containing a literal `..` path segment or a leading `/` *before* resolution as a fast, readable first-pass rejection (defense in depth, not a substitute for the resolve+prefix check).
- Explicitly reject backslashes (`\`) in `outputs:` values with a clear error ("use forward slashes") rather than letting them silently fail as a not-found file on POSIX hosts — Node's `path` module is platform-aware, so the same skill tree linted on Windows vs macOS/Linux CI can behave differently if backslashes are allowed through un-rejected.
- Use `lstat()` (or `realpath()` compared against the resolved skill-dir boundary) rather than `stat()`, so a symlink escaping the skill directory is caught at lint time, not silently shipped at build time.
- Be aware macOS/Windows default filesystems are case-insensitive-but-preserving while Linux (typical CI/consumer) is case-sensitive: an `outputs:` value differing only in case from the real filename (`Output.md` vs `output.md`) will lint clean on a contributor's Mac and fail — or silently reference the wrong file — elsewhere. Compare the declared value against the *actual* directory-entry casing (via `readdir`), not just `stat()` success/failure, to catch this at lint time regardless of host OS.

**Warning signs:**
- `outputs:` validation implemented as a one-line adaptation of the `shared_references` `.includes('/')` check.
- No test fixture using `..`, an absolute path, a symlink, or mixed-case filenames.
- Path checks using `stat()` without ever calling `lstat()` or `realpath()`.

**Phase to address:**
Validated optional fields phase (`outputs`/`dependencies`/`allowed-tools`).

---

### Pitfall 6: `build-skill` generates lint-clean but semantically hollow skills (Goodhart's Law on the linter)

**What goes wrong:**
`motto lint` validates *structure*, not *content quality* — this is already an acknowledged, documented gap: `skill-schema.md` itself states "The Role line content after `:` is not validated... An empty `**Role:**` passes the regex but produces unusable agent instruction content." `build-skill`'s design (D-03, spec §4) is a "structurer" that self-verifies with `motto lint` in a loop ("write → `motto lint` → fix until clean"). An LLM optimizing purely to satisfy that loop's exit condition will, under time/token pressure, converge on the *minimum viable structure* that passes — `**Role:** Helps with tasks.`, a `<process>` section containing "1. Do the thing.", a `<success_criteria>` section containing "- It works." All of this is lint-clean and useless. Because build-skill is itself `template: procedure` (dogfooding), the same failure mode threatens Motto's own shipped `build-skill` skill.

**Why it happens:**
Lint-clean is a necessary but not sufficient proxy for "good skill" — classic Goodhart's Law (a measure that becomes a target stops being a good measure). This risk did not really exist before v0.0.5 because only humans wrote Role lines and section content; `build-skill` is the first *autonomous* writer with an explicit incentive (loop termination) to satisfy the metric as cheaply as possible.

**How to avoid:**
- `build-skill`'s own instructions must include content-quality gates that are independent of `motto lint` — e.g. an explicit self-review checklist ("would a stranger with zero context know exactly what to do from this Role line and these steps, with no follow-up questions?") applied *before* declaring the lint-clean result as done.
- D-03's "gap-fill questions only" scope should be read as including *substance* gaps, not just *schema-presence* gaps — if the user's free-text input doesn't actually specify concrete steps or success conditions, build-skill should ask for them rather than inventing filler content that merely satisfies the tag-presence check.
- Add this as an explicit non-goal boundary in build-skill's own SKILL.md: "passing `motto lint` is necessary, not sufficient" — stated in the skill's own body, so it survives independent of any one implementer's memory of this pitfall.
- Consider (future work, not necessarily v0.0.5) a minimum-content heuristic in the linter itself (e.g. minimum non-whitespace length per required section) — explicitly weigh this against YAGNI/mechanism-over-features; do not build it reflexively, but do record the tradeoff.

**Warning signs:**
- build-skill's self-verify loop has no failure/retry cap and no distinct "structurally valid but suspiciously short" signal.
- Generated skills whose Role line or required-section content is under ~10 words.

**Phase to address:**
`build-skill` Agent Skill phase.

---

### Pitfall 7: `build-skill`'s own prose reintroduces lint-string duplication (the exact bug this milestone closes)

**What goes wrong:**
`author-skill` is being retired specifically because it duplicated schema rules as prose, which drifted from `schema.js` over time (PROJECT.md: "closes AUTH-SKILL, kills lint-string duplication"). `build-skill` necessarily needs to *teach itself* (as an LLM) the schema rules well enough to generate conforming skills and self-correct — the design spec's stated fix is to have `build-skill` pull `skill-schema.md` in via `shared_references` (single source), not restate the rules. The pitfall is implementation drift during the actual coding: it is very easy, when writing build-skill's SKILL.md body (the `<process>` steps an LLM will follow), to casually restate a concrete rule inline for flow/readability ("remember, `name` must be ≤64 characters and kebab-case...") instead of pointing at the bundled reference — reintroducing exactly the duplication this milestone is designed to eliminate, just in a new file.

**Why it happens:**
Prose that references an external doc ("see skill-schema.md") reads as less immediately actionable than prose that states the rule inline, so there's a natural authoring pull toward inlining — especially for an LLM-facing instructional skill where the author wants to minimize the chance the agent "forgets" to consult the reference.

**How to avoid:**
- Treat any concrete field name + concrete constraint (character limits, regex shapes, specific error strings) appearing in `build-skill`'s own SKILL.md body as a duplication smell during review — it should either not exist (defer to the bundled `skill-schema.md` reference) or exist only as a *pointer* ("see `references/skill-schema.md` for exact constraints").
- Verify at review time that `build-skill/SKILL.md` actually declares `shared_references: [skill-schema]` and that its process steps explicitly instruct the agent to consult that reference rather than rely on trained knowledge of the rules (trained knowledge is exactly what goes stale).
- Add a lightweight repo-level check (grep for suspicious literal numbers like `64` or regex fragments in `skills/build-skill/SKILL.md`) as a cheap regression guard, or at minimum a code-review checklist item — not necessarily automated in v0.0.5 (YAGNI), but at least documented as a review step.

**Warning signs:**
- `build-skill/SKILL.md` body contains a number, regex, or exact error-message string that also appears in `schema.js`.
- `build-skill/SKILL.md` does not declare `shared_references: [skill-schema]`.

**Phase to address:**
`build-skill` Agent Skill phase; verify at the doc/dogfood phase too (Pitfall 8) since both touch `skill-schema.md`'s role as sole source of truth.

---

### Pitfall 8: `skill-schema.md` doc drift is already present and will compound with every new field this milestone adds

**What goes wrong:**
`shared/references/skill-schema.md` currently states, in its header, "This file is the canonical rule source for the Motto skill schema (**v0.0.2**)" — already three versions stale (current is v0.0.4, shipping v0.0.5). Worse, §6 of that same doc explicitly says: *"`template` and `dependencies` fields... are accepted and passed through verbatim. They are NOT validated in Motto v0.0.2."* This sentence becomes actively false the moment TMPL-01/D-05 ship — and unlike ordinary project docs, this file is **bundled verbatim into every public skill's `dist/.../references/skill-schema.md` by `motto build`** (per its own §5 description of the collision/bundling mechanism), meaning the stale, incorrect doc is mechanically shipped to real end users of any skill that references it — including `build-skill` itself, and including any user-authored skill that opts in. This is strictly worse than typical doc drift because Motto's own build pipeline is the distribution mechanism for the staleness.

**Why it happens:**
`skill-schema.md` is updated by hand, in a separate step from the code changes that make its claims true or false, and nothing currently enforces synchronization (no version-string check, no doc-drift test). Multi-phase work compounds this: if the template-mechanism phase updates §1-5 but not the header version or §6 (which is exactly about template/dependencies), and a later phase adds `outputs`/`allowed-tools` sections that don't exist in the doc at all yet, the doc can end up "half updated and now internally inconsistent" rather than simply stale.

**How to avoid:**
- Treat "update `skill-schema.md`" as a *closing checklist item for the whole v0.0.5 milestone*, not a task inside any single phase — schedule an explicit end-of-milestone doc-audit step (after template mechanism, validated fields, and build-skill all land) that re-reads the doc top-to-bottom against the final `schema.js`/`frontmatter.js`/`build.js` and fixes the version header + every section, including net-new sections for `outputs`, `allowed-tools`, and the now-validated `dependencies`/`template` behavior (§6 needs a near-total rewrite, not a patch).
- Because `build-skill` will bundle this exact doc as its own teaching reference (Pitfall 7), a stale doc doesn't just mislead human authors — it actively miscalibrates the LLM structuring skills, which is a functional bug, not just a documentation quality issue.
- Consider a cheap regression guard: a test asserting the version string embedded in `skill-schema.md`'s header matches `motto.yaml`'s own version (or at minimum, is not left over from two milestones ago) — low effort, catches the exact class of drift already observed.

**Warning signs:**
- Any PR that changes `schema.js` validation behavior without a corresponding diff to `skill-schema.md`.
- The header version string not matching the current `motto.yaml` version at milestone close.

**Phase to address:**
Docs & dogfood phase (end of milestone, per design spec §5) — but the *audit* must happen last, after every other phase's schema changes have landed, not as one of the early phases.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Flat existence-only `dependencies:` resolution (no cycle graph, no audience direction by default) | Ships fast, matches D-05's explicit "lint what's verifiable" scope | Self-reference and public→private leaks slip through unless *explicitly* added (Pitfalls 3, 4) — not automatically covered by "existence check" | Acceptable only if self-reference + audience-direction guards are added as their own explicit checks in the same phase — never acceptable to ship existence-only with zero direction/self-ref guard |
| Reusing `shared_references`' basename-only path check for `outputs:` | Fast to write, proven pattern | Either breaks legitimate nested output paths or (if naively relaxed) reopens traversal — the two fields have genuinely different shapes | Never — `outputs:` needs its own resolve+prefix-check implementation (Pitfall 5) |
| `motto lint` as the sole quality gate inside `build-skill`'s self-verify loop | Simple, reuses existing tooling, zero new dependencies | Converges on structurally-valid-but-hollow skills (Pitfall 6) | Acceptable as the *pass/fail gate*, never as the *only* quality signal — pair with a content-substance self-review step in the skill's own instructions |
| Deferring `skill-schema.md` updates until "later" during multi-phase work | Keeps each phase's diff small and focused | Doc drifts further with each phase; already 3 versions stale before this milestone started (Pitfall 8) | Acceptable per-phase only if a dedicated end-of-milestone audit phase is scheduled up front — never acceptable as an open-ended "someday" |

## Integration Gotchas

Motto has no external services in this milestone; the closest analog is the in-tree filesystem acting as a dependency registry.

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| In-tree `skills/` directory as dependency registry | Resolving `dependencies:` once at lint time and assuming the same tree state holds at build time (TOCTOU) — a skill could be added/removed/renamed between `motto lint` and `motto build` runs, or between the two internal scans `build.js` already performs (lint's own scan, then build's re-read — see `build.js`'s own "Option A — re-read" comment) | Accept that both `lint` and `build` legitimately re-scan the tree independently (existing pattern, not a new risk) — but ensure dependency resolution errors surface at *both* points consistently, not only at lint time, since `build.js` already re-reads skill data independently of the lint pass |
| `shared_references` bundling vs `dependencies:` (looks similar, behaves differently) | Assuming `dependencies:` will be bundled into `dist/` the same way `shared_references` files are — it explicitly is not (D-05: existence-checked only, no MCP/content resolution) | Document clearly (in `skill-schema.md`, per Pitfall 8) that `dependencies:` is a *declared relationship*, not a *bundling instruction* — a dependency's content is never copied across audience buckets |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Non-anchored / backtracking-prone regex for fenced-code stripping or tag matching on `body` | Lint hangs or times out on a pathological (or maliciously crafted) SKILL.md body | Follow the codebase's existing discipline (T-02-01 in `schema.js`): anchored, linear-time regexes only; test against long repeated-character adversarial inputs | Only matters at large body sizes or adversarial input — low priority for a small-team project, but the codebase already treats this as a standing invariant, so new regexes must match that bar |
| Re-`readdir`-ing `skills/` per dependency entry instead of once per lint/build run | Negligible at current scale (small skill trees) | Build the `{name, audience}` map once per `lintProject`/`buildProject` call (mirrors existing `discoverSkillNames` pattern) and reuse it across all dependency checks | Would only matter at hundreds of skills — not a near-term concern, note only to avoid an obviously wrong per-entry-readdir implementation |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `outputs:` path validation via `stat()` instead of `lstat()`/`realpath()` | A symlink inside `outputs:` pointing outside the skill directory lints clean, then gets shipped verbatim into `dist/` by `cp(..., verbatimSymlinks:true)` — foreign or dangling symlinks in distributed public skills | Use `lstat()` or resolve-and-compare-prefix (`path.resolve` + `startsWith(base + sep)`) at lint time; never trust `stat()`'s follow-symlink success alone |
| `dependencies:` audience-direction unchecked | Public skill's shipped frontmatter names a private skill — information disclosure about internal/private tooling to every public-plugin consumer, plus a broken reference | Enforce public→public-only dependency direction (Pitfall 3), mirroring the existing `build.js` D3-12 private-contradiction pattern |
| Backslash / absolute-path / `..`-segment values in `outputs:` accepted without rejection | Path traversal outside the skill directory (classic directory-traversal CVE pattern applied to a new user-controlled field) | Resolve + prefix-check (see Pitfall 5); reject `..` segments and absolute paths as a fast first-pass rejection in addition to the resolve check |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Template-sourced lint errors with no "via `template: X`" framing | User can't tell why a skill without any obvious change suddenly needs `<process>`/`<success_criteria>` sections | Always name the template in the error message (Pitfall 1) |
| `build-skill`'s self-verify loop with no iteration cap | Agent could loop indefinitely trying to satisfy `motto lint` on a case it structurally cannot fix, burning tokens with no user-visible progress | Cap retries, report the specific unresolved lint error(s) to the user rather than looping silently |
| Case-insensitive-filesystem-only failures for `outputs:` | Skill lints clean on the author's Mac/Windows machine, fails on Linux CI or a consumer's Linux machine — "works on my machine" for a *linter*, which is supposed to prevent exactly this class of surprise | Validate declared `outputs:` casing against actual `readdir` entry casing, not just `stat()` success (Pitfall 5) |

## "Looks Done But Isn't" Checklist

- [ ] **Template mechanism:** Often missing a test where `template:` value is misspelled/wrong-case — verify the error message lists valid template names, not just "unknown template."
- [ ] **`<process>`/`<success_criteria>` presence check:** Often missing a fenced-code adversarial fixture — verify a skill with the tag *only* inside a ```` ``` ```` example fails lint, and a skill with a real section *and* a fenced example still passes.
- [ ] **`dependencies:` validation:** Often missing self-reference and audience-direction (public→private) test cases — verify both produce distinct, actionable errors, not a generic pass or a generic "not found."
- [ ] **`outputs:` validation:** Often missing traversal (`..`), symlink, and case-mismatch fixtures — verify all three are rejected with clear messages, not silently passed or silently mis-resolved.
- [ ] **`build-skill` self-verify:** Often missing a hollow-content check — verify a generated skill with filler Role/section text (e.g. "Works.") is flagged by build-skill's own review step even though it would pass `motto lint`.
- [ ] **`skill-schema.md`:** Often missing the version-header bump and the net-new `outputs`/`allowed-tools` sections — verify the doc's header version and every section match the shipped `schema.js` behavior, not just the sections touched by the most recent phase.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Fenced-code false positive already shipped (a hollow skill passed lint) | LOW | Add the missing adversarial test, fix the tag-detection helper to strip fenced code, re-lint the whole project to find any other skills that slipped through the same gap |
| Public→private dependency leak already shipped in a dist bundle | MEDIUM | Add the audience-direction check, re-run `motto lint` project-wide to surface every existing violation, fix each skill's `dependencies:` list, re-build and re-publish; audit whether the private skill's *name* being previously visible in a shipped public bundle constitutes a disclosure that needs separate handling (e.g. renaming the private skill) |
| `skill-schema.md` already shipped stale in multiple prior `dist/` bundles | LOW | Doc-only fix; no data migration needed — update the doc, rebuild, republish; note in CHANGELOG that prior versions bundled stale schema docs |
| `build-skill` has already generated several hollow skills before the content-quality gate was added | LOW–MEDIUM | Re-run each previously-generated skill through the updated build-skill review step (or manually), since the underlying issue is a missing check, not corrupted data |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| 1. Template evolution/attribution traps | Template mechanism phase | Error messages name the template; unknown-template error lists available templates; test covers a misspelled/wrong-case template value |
| 2. Fenced-code false positives in section-tag checks | `procedure` template phase | Adversarial fixture: tag inside fenced example only → fails; real section + fenced example → passes |
| 3. Public→private dependency leak | Validated optional fields phase | Test: public skill depending on private skill → lint error naming both skills and the audience rule |
| 4. Self-referencing dependency | Validated optional fields phase | Test: skill listing itself in `dependencies:` → distinct, non-generic error |
| 5. `outputs:` path-safety (traversal/symlink/case/Windows) | Validated optional fields phase | Tests: `..` segment, absolute path, symlink escaping skill dir, mixed-case filename, backslash — all rejected with distinct messages |
| 6. LLM-generated hollow skills passing lint | `build-skill` phase | build-skill's own instructions include a non-lint content-quality self-review step, documented in its SKILL.md body |
| 7. Lint-string duplication reintroduced in build-skill's prose | `build-skill` phase | Review checklist: no concrete schema constraint (numbers, regexes, error strings) inlined in `build-skill/SKILL.md`; `shared_references: [skill-schema]` present and referenced in its process steps |
| 8. `skill-schema.md` doc drift | Docs & dogfood phase (scheduled LAST, after all schema-touching phases) | Header version matches current `motto.yaml` version; every new field (`outputs`, `allowed-tools`, validated `dependencies`/`template`) has a corresponding, accurate section |

## Sources

- `src/schema.js`, `src/frontmatter.js`, `src/build.js`, `src/lint.js` (Motto repo, read 2026-07-02) — first-party, HIGH confidence. Source of the NAME cascade pattern, the existing stray-`---`-delimiter fenced-code precedent, the `shared_references` basename-only path check, the `verbatimSymlinks:true` macOS symlink-rewriting comment, and the D3-12 private-contradiction check pattern reused here for the dependency-direction recommendation.
- `shared/references/skill-schema.md` (read 2026-07-02) — first-party, HIGH confidence. Source of the confirmed v0.0.2 header staleness and the explicit "Role line content is not validated" gap.
- `.planning/PROJECT.md`, `.planning/superpowers/specs/2026-07-02-skill-builder-design.md` — first-party, HIGH confidence. Source of D-01..D-08, the evolution ledger, and the `author-skill`/lint-string-duplication precedent.
- [Node.js Path Traversal: Prevention & Security Guide](https://nodejsdesignpatterns.com/blog/nodejs-path-traversal-security/) — MEDIUM confidence. `path.resolve` + `startsWith(base + path.sep)` pattern, and the `path.sep`-omission prefix-attack subtlety (`/uploads` vs `/uploads-evil`) cited in Pitfall 5.
- [Node.js Path Traversal Guide: Examples and Prevention (StackHawk)](https://www.stackhawk.com/blog/node-js-path-traversal-guide-examples-and-prevention/) — MEDIUM confidence. Corroborates `realpath()`/symlink-following guidance cited in Pitfall 5.
- [Cycle Detection in Graphs: The Course Schedule Problem](https://medium.com/@shrutitech98/cycle-detection-in-graphs-the-course-schedule-problem-f6bf06dad799) and related topological-sort sources — MEDIUM confidence. General confirmation that cycle detection is a distinct problem from existence checking, and that cyclic graphs silently break naive ordering — informs the "flat existence check ≠ cycle safety" framing in Pitfall 4 (full multi-hop cycle detection is explicitly out of scope for v0.0.5 per D-05, but self-reference is the trivial one-hop case that a flat check still misses).

---
*Pitfalls research for: Motto v0.0.5 Skill Builder — template mechanism, `outputs`/`dependencies`/`allowed-tools` validation, `build-skill` Agent Skill*
*Researched: 2026-07-02*
