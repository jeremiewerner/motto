# Phase 2: motto lint - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 2-motto-lint
**Areas discussed:** Discovery & roots, Partial skill dirs, CLI entry & args, Output composition, Shared refs, Error ordering

---

## Discovery & roots

| Option | Description | Selected |
|--------|-------------|----------|
| cwd, skills/*/ one level | Project root = cwd; each immediate subdir of ./skills/ is a skill; motto.yaml + shared/ from cwd; no walk-up, no recursion | ✓ |
| Walk-up to find motto.yaml | Search ancestors for motto.yaml as root | |
| Recursive skill search | Find every SKILL.md anywhere under cwd | |

**User's choice:** cwd, skills/*/ one level deep → D2-01, D2-02, D2-04.

---

## Partial skill dirs

| Option | Description | Selected |
|--------|-------------|----------|
| Hard error | `<dir>: missing SKILL.md` → exit 1; dotfiles/plain files ignored | ✓ |
| Silent ignore | Only dirs with SKILL.md count; others skipped silently | |
| Warning, exit 0 | Note but don't fail (adds a warning channel) | |

**User's choice:** Hard error → D2-05. No warning channel introduced.

---

## CLI entry & args

| Option | Description | Selected |
|--------|-------------|----------|
| cwd-only + bin | package.json bin {motto: ./bin/motto.js} + shebang; lint always cwd; parseArgs | ✓ |
| Optional path arg | `motto lint [path]` defaulting to cwd | |

**User's choice:** cwd-only + bin → D2-14, D2-15. Path arg deferred.

---

## Output composition

| Option | Description | Selected |
|--------|-------------|----------|
| Config first, 0 skills = error | motto.yaml errors first under `motto.yaml:`, then skills alpha; 0 skills → ✗ no skills found, exit 1 | ✓ |
| Config inline alphabetically | 'motto.yaml' sorted as just another name; 0 skills → ✓ 0 skills OK exit 0 | |
| Config errors abort early | Invalid motto.yaml → report only that, skip skill scan | |

**User's choice:** Config first, 0 skills = error → D2-10, D2-13. Config does NOT abort the run (D2-09 collect-everything preserved).

---

## Shared refs

| Option | Description | Selected |
|--------|-------------|----------|
| Scan shared/references/*.md | Discover basenames → Set → validateSkill; missing shared/ → empty set, not an error | ✓ |
| Missing shared/ is its own error | Same scan + top-level `shared/references/: not found` even with no references | |

**User's choice:** Scan shared/references/*.md → D2-07, D2-08.

---

## Error ordering (within a skill)

| Option | Description | Selected |
|--------|-------------|----------|
| validateSkill emission order | Keep the core's deterministic order (name cascade → fields → shared_references) | ✓ |
| Alphabetical by message | Sort each skill's messages alphabetically | |

**User's choice:** validateSkill emission order → D2-12.

## Claude's Discretion

- Module decomposition (one `src/lint.js` vs split discover/lint).
- Exact wording of `no skills found` / `missing SKILL.md` / usage strings.
- Lint-core return shape (`{ ok, errors[] }` strongly preferred for testability).

## Deferred Ideas

- Optional `[path]` argument to `motto lint` (v1 cwd-only).
- `--quiet` / `--format json` (already v2: CLIX-01/02).
- Warning channel (deliberately not introduced).
- Top-level `shared/ not found` diagnostic (rejected in favor of empty set).
