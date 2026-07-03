---
phase: 17-docs-audit
reviewed: 2026-07-03T13:15:10Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - shared/references/skill-schema.md
  - test/doc-sync.test.js
  - skills/build-skill/SKILL.md
  - README.md
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-07-03T13:15:10Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the four phase-17 docs-audit artifacts against ground truth (`src/schema.js`, `src/lint.js`, `src/templates.js`, `src/frontmatter.js`, `src/config.js`, `src/init.js`, `src/build.js`, `bin/motto.js`), with adversarial focus on factual accuracy of `skill-schema.md` (§6–§9 especially) and false-green risk in `test/doc-sync.test.js`. Every documented error string, cascade order, and layer attribution was cross-checked against source; three claims were additionally probed by executing `validateSkill` directly.

The doc is largely accurate — all 20+ transcribed error strings match source verbatim, the name/template cascade orders are correct, the dependencies ordering rules (self-dep before not-found, namespaced exemption, one-direction audience guard) match `src/schema.js` exactly, and the two-layer outputs split is attributed correctly. However, three factual misstatements survive in the doc (two in §6, one in §5), all confirmed empirically against the live validator. The drift-guard test is structurally sound (source→doc direction, `import.meta.url` anchoring, non-vacuous, no swallowed assertions, passes today, stdlib-only) but leaves seven documented error strings unguarded — including the entire §10 frontmatter envelope, whose source file the test never reads. `build-skill/SKILL.md` lints clean as `template: procedure` (verified via `motto lint` — `✓ 2 skills OK`) with no dangling Step-2 references and no verbatim lint strings, but its Step 5 name guard misstates the reserved-name rule as a "word" check. The README has no author-skill remnants, all 11 Contents anchors resolve, commands were verified against the repo, and the build-skill flow description matches the skill — but the end-to-end example makes one false claim about `dist/private/`.

## Warnings

### WR-01: skill-schema.md §6 misattributes the `template: null` error to the unknown-template step

**File:** `shared/references/skill-schema.md:138-140`
**Issue:** The §6 prose claims: "An explicitly-present but falsy value (`template: ""`, `template: null`) is NOT silently skipped: it is treated as an unknown template name and errors." For `template: ""` this is correct, but for `template: null` it is false — `typeof null === "object"`, so step 1 of the cascade fires first. Verified empirically: `validateSkill` with `template: null` emits `template must be a string (got object)`, not `unknown template "" (available: procedure)`. The prose contradicts the doc's own cascade table two paragraphs below (step 1: "value is not a string"; step 2's parenthetical correctly scopes the empty-string case only). An author debugging `template: null` (a bare `template:` key in YAML parses to null) will be told to expect the wrong error message by the canonical reference.
**Fix:** Split the falsy cases by which cascade step catches them:
```markdown
An explicitly-present but falsy value is NOT silently skipped: `template: ""` is
treated as an unknown template name (step 2), while `template: null` (e.g. a bare
`template:` key) is a non-string and errors at step 1 (`template must be a string
(got object)`).
```

### WR-02: skill-schema.md §6 falsely claims the close tag rejects trailing text

**File:** `shared/references/skill-schema.md:176`
**Issue:** The `hasClosedSection` semantics bullet states: "There is no end-of-line anchor on the open tag — `<process> some trailing text` still counts as opening the section; only the close tag is required to have nothing else of interest after it at line start." The second half is false. In `src/schema.js:96-97` both regexes are symmetric — `openRe = /^<tag>/m` and `closeRe = /^<\/tag>/m` — neither has an end-of-line anchor. Verified empirically: a body containing `</process> trailing text` passes `template: procedure` validation with zero errors. The doc asserts a stricter rule than the validator enforces, so an author whose close tag accidentally carries trailing text would expect a lint failure that never comes — and the doc claims to be "the canonical rule source."
**Fix:** Correct the bullet to describe the symmetric behavior:
```markdown
- There is no end-of-line anchor on EITHER tag — `<process> notes` counts as
  opening the section and `</process> notes` counts as closing it. Only the
  line-start anchor is enforced on both.
```

### WR-03: skill-schema.md §5 states an array-shape requirement the validator does not enforce

**File:** `shared/references/skill-schema.md:114`
**Issue:** §5 says: "Optional. When present, must be a YAML array of strings." The validator enforces no such thing. `src/schema.js:337` gates with `Array.isArray(data.shared_references) ? ... : []` — a non-array value (scalar string, map, number) is silently coerced to an empty list and produces zero lint errors. Verified empirically: `shared_references: skill-schema` (scalar) passes `validateSkill` clean. Worse, `src/build.js:69` (`loadSkillData`) applies the same gate, so the reference is silently NOT bundled into dist — the skill ships green-lint but broken, which is exactly this project's recurring "tests-green-but-broken" failure mode (see never-throw invariant memory). The authoritative doc telling authors the shape "must" hold implies a wrong shape errors; it doesn't. Additionally, a non-string entry inside a valid array (e.g. `- 123`) falls through to the "not found" message with a coerced rendering (`shared_references entry "123" not found in shared/references/`) — the doc doesn't mention this either.
**Fix:** Document the actual behavior in §5 (and consider a follow-up validator fix — out of this review's file scope — adding a shape error mirroring `dependencies must be an array`):
```markdown
**Rule:** Optional. Only a YAML array is inspected — a non-array value (scalar,
map) is currently IGNORED silently: no lint error is emitted and no reference is
bundled at build time. Always write it as an array. Non-string entries fall
through to the "not found" error.
```

### WR-04: doc-sync.test.js leaves seven documented error strings with no drift guard

**File:** `test/doc-sync.test.js:25-55`
**Issue:** The curated `staticSegments` list covers §1 steps 1–5, §2, §3, and all of §6–§9, but omits every error string from three whole doc areas that quote source verbatim:
- §1 step 6: `must equal its folder name` (`src/schema.js:233`)
- §4 both body-spine errors: `body must begin with an H1 title line` and `body must contain a **Role:** line` (`src/schema.js:317,327`)
- §5 both shared_references errors: `is an unsafe basename (must not contain` and `not found in shared/references/` (`src/schema.js:342,346`)
- §10 all three frontmatter-envelope errors (`missing frontmatter:`, `unterminated frontmatter:`, `stray '---' delimiter`) — the test never reads `src/frontmatter.js` at all, so §10 has zero drift protection by construction.

If any of these messages is reworded in source, the corresponding doc rows go stale with the suite green — a false-green on the exact property this test exists to guard (DOC-06).
**Fix:** Add the missing segments and read `src/frontmatter.js` alongside the other two sources:
```javascript
const frontmatterSrc = await readFile(join(REPO_ROOT, 'src', 'frontmatter.js'), 'utf8');
// add to staticSegments:
'must equal its folder name',
'body must begin with an H1 title line',
'body must contain a **Role:** line',
'is an unsafe basename (must not contain',
'not found in shared/references/',
"missing frontmatter: file must begin with a '--- ... ---' block",
"unterminated frontmatter: no closing '---' delimiter found",
"stray '---' delimiter in frontmatter",
// and widen the self-check: schemaSrc.includes(seg) || lintSrc.includes(seg) || frontmatterSrc.includes(seg)
```

### WR-05: build-skill Step 5 misstates the reserved-name rule as a "word" check

**File:** `skills/build-skill/SKILL.md:45`
**Issue:** Step 5's name guard says the name "must not contain the word 'anthropic' or the word 'claude'". The validator (`src/schema.js:226`, `RESERVED.some((r) => name.includes(r))`) is a substring match, and the bundled reference this same skill tells the agent to consult in Step 2 says so explicitly (§1: "substring match, not word boundary"). An agent applying the "word" reading would pre-approve a name like `myclaudehelper` (no standalone word `claude`), write the directory, then hit the lint rejection in Step 6 and burn the delete-and-recreate cycle that Step 5's guard exists to prevent. The skill's own guard contradicts the reference it bundles.
**Fix:** Align the wording with the actual rule:
```markdown
1. Validate the proposed `name`: it must be kebab-case, starting with a lowercase
   letter, at most 64 characters long, and must not contain "anthropic" or
   "claude" anywhere as a substring (not just as a standalone word).
```

### WR-06: README end-to-end example claims `dist/private/` is populated when it never is

**File:** `README.md:214`
**Issue:** Step 5 of the end-to-end example (`motto build` on the freshly scaffolded `my-project`) is annotated `# → dist/public/ and dist/private/ are populated`. This is false for the flow being demonstrated: `motto init` scaffolds a single public skill (`hello-world`, `audience: public` — `src/init.js:38-47`) and deliberately omits `plugins.private` from `motto.yaml` (`src/init.js:144`). `src/build.js:154-183` only adds the `private` bucket when a skill declares `audience: private`, so the example build produces `dist/public/` only. A reader following the example verbatim will look for a `dist/private/` directory that does not exist and conclude the build misbehaved.
**Fix:**
```sh
# 5 — Build the plugin
motto build
# → dist/public/ is populated (dist/private/ appears only once you add audience: private skills)
```

## Info

### IN-01: doc-sync source self-check can be satisfied by comments; some segments are weakly discriminating

**File:** `test/doc-sync.test.js:69-72`
**Issue:** The "stale curated segment" self-check uses whole-file `includes()` over `schemaSrc`/`lintSrc`, which cannot distinguish a live error-message template literal from the same text surviving in a JSDoc comment — if a message is reworded but an old comment still quotes it, the self-check passes falsely. Separately, segments like `does not exist` and `requires <` are generic enough to match unrelated doc prose after a table reword, weakening the doc-containment half for those rows.
**Fix:** Lengthen the weakest segments to include their distinctive prefix (e.g. `file "` + `" does not exist` split into `outputs.` + `does not exist` is already partially covered; prefer `' file "'`-anchored variants), and accept the comment-match risk as documented residual, or extract error strings into a single constants module both source and test import.

### IN-02: README says `prepublishOnly` "rebuilds dist/public/" — it rebuilds all of dist/

**File:** `README.md:178`
**Issue:** `package.json`'s `prepublishOnly` runs `node bin/motto.js build`, which wipes and rebuilds the entire `dist/` tree (`src/build.js:150`), including `dist/private/` for this repo's private `release` skill — not just `dist/public/`.
**Fix:** Change the annotation to `# fires prepublishOnly (wipes and rebuilds dist/) then uploads`.

### IN-03: README motto.yaml table overstates config enforcement as "Truthy string"

**File:** `README.md:78-84`
**Issue:** The table states `name`/`version`/`description` rules as "Truthy string", but `src/config.js:70-78` checks truthiness only — `version: 1.0` (a YAML number) passes lint and would be embedded into each `plugin.json` as a number. The "recommend quoting" hedge partially covers this, but the "Rule" column implies a type check that does not exist.
**Fix:** State the rule as "Truthy (string recommended — quote `version` to avoid YAML number coercion)".

### IN-04: dist/ copies are stale relative to the phase-17 rewrites

**File:** `dist/public/build-skill/references/skill-schema.md`, `dist/public/build-skill/SKILL.md`
**Issue:** Both dist copies differ from their rewritten sources (verified via `diff`). Benign for shipping — this repo git-ignores `dist/` (verified via `git check-ignore`) and `prepublishOnly` regenerates it at publish time — but anyone dogfooding locally via the README's symlink/zip one-liners (`README.md:267,275`) will get the pre-phase-17 doc, including the errors fixed by this phase.
**Fix:** Run `node bin/motto.js build` after the phase lands (no source change needed).

---

_Reviewed: 2026-07-03T13:15:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
