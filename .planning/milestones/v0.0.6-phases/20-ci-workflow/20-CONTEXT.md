# Phase 20: CI Workflow - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Every push and PR is gated by a full CI pipeline (`.github/workflows/ci.yml`): a Node 20/22/24 unit-test matrix, a dogfood job running `motto lint`/`motto build` against Motto's own `skills/` tree, a pack-install E2E job (`scripts/pack-install-e2e.mjs`) proving the shipped tarball works standalone, and a non-blocking npm-drift warning — all proven while the repo is still private. The husky `prepare` script gains a guard so `.git`-less installs no-op. Requirements: CIW-01..05. Zero new deps; the never-throw core is untouched (this phase touches no `src/` code at all).

</domain>

<decisions>
## Implementation Decisions

### Trigger scope & concurrency
- **D-01:** Triggers are `push` to `main` + `pull_request` targeting `main`. Feature-branch pushes without a PR don't run; the PR gate satisfies "every push/PR". No duplicate push+PR runs.
- **D-02:** Concurrency group per ref with `cancel-in-progress: true` — superseded commits cancel their in-flight runs.
- **D-03:** **No path filters.** `.planning/`-only commits run full CI. `paths-ignore` breaks required-status-checks later (skipped run = check never reports, PR stuck) — Phase 22 will add branch protection, so keep the gate unconditional now.
- **D-04:** All four jobs (`test` matrix, `dogfood`, `pack-install-e2e`, `npm-drift`) run **in parallel — no `needs` edges**. Fastest feedback; independent failures surface independently. Phase 21's publish job is where `needs: [all]` gating lives.

### Pack-E2E assertion depth
- **D-05:** `scripts/pack-install-e2e.mjs` asserts **exit codes + parsed JSON**: every step's exit code checked; `lint`/`build` run with `--format json`, stdout parsed, `.ok === true` and expected counts (e.g. `skillCount ≥ 1`) asserted. No file-tree diffing (brittle against init template evolution).
- **D-06:** Tarball consumption is the **real consumer path**: `npm pack` → tmp dir → `npm init -y` → `npm install <tarball>` → run via `npx motto`. Exercises bin linking, `files` allowlist, and dependency resolution exactly as a stranger would.
- **D-07:** `dogfood` and `pack-install-e2e` jobs run on **Node 20 only** — the `engines` floor. The unit matrix already covers 20/22/24; proving the shipped artifact at the minimum supported version is the highest-value single leg.
- **D-08:** The dogfood job **exercises the `--quiet` contract**: `motto lint --quiet` / `motto build --quiet` with assertions that stdout is empty and exit code is 0. Division of labor: dogfood proves `--quiet`, pack-E2E proves `--format json` — both Phase 19 flags get live CI coverage.

### npm-drift warning (CIW-04)
- **D-09:** Warning surfaces as a GitHub Actions **`::warning::` annotation** — yellow banner on the run and PR checks UI, job stays green.
- **D-10:** **Warn-and-pass, never red:** if the check itself fails (registry unreachable, package 404), emit a "drift check inconclusive" `::warning::` and exit 0. A flaky registry must never block a push gate.
- **D-11:** Comparison is **warn on any mismatch** — `dist-tags.latest !== package.json version`. Catches the lag failure mode (v0.0.4/v0.0.5) AND the registry-ahead anomaly, with a single equality check and no semver parsing.
- **D-12:** Registry read via **Node stdlib `fetch`** to `https://registry.npmjs.org/@jeremiewerner%2Fmotto`, reading `dist-tags.latest`. One script guarantees exit 0; no `npm view` subprocess/exit-code juggling in YAML.

### Husky prepare guard (CIW-05)
- **D-13:** Guard is **scoped, not always-succeed**: run husky only when `.git` exists; exit 0 otherwise. A genuinely broken husky install in a dev checkout still fails loudly. `husky || true` explicitly rejected (Pitfall 4).
- **D-14:** Guard lives in a **tiny `scripts/*.mjs` file** (e.g. `scripts/prepare.mjs`): portable to Windows contributors post-public-flip, readable, no JSON escaping. `scripts/` dir exists anyway for the pack-E2E script. Constraint: `scripts/` is NOT in the `files` allowlist — the guard must not break consumer installs where the file is absent (verify `prepare` semantics for tarball consumers during planning).
- **D-15:** Guard proven **implicitly via pack-E2E** — the tmp-dir tarball install is exactly the `.git`-less context; if the guard is wrong, pack-E2E's install step goes red. No dedicated guard test.

### Claude's Discretion
- Exact YAML layout, job names, step names, action version pins (`checkout@v6`, `setup-node@v6` per research stack).
- `pack-install-e2e.mjs` internal structure (tmp-dir management, cleanup, output style).
- Whether the drift check is an inline `node -e`/heredoc step or a small committed script — pick whichever stays readable given D-12's exit-0 guarantee.
- Wording of warning annotations and E2E failure messages.
- Whether `workflow_dispatch` is added as a convenience trigger.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone research (v0.0.6)
- `.planning/research/SUMMARY.md` — zero-new-deps stack verdict, single-workflow architecture (4 jobs), phase ordering
- `.planning/research/ARCHITECTURE.md` — ci.yml job structure, pack-E2E placement outside `test/`, release/CI handshake
- `.planning/research/PITFALLS.md` — Pitfall 3 (`npm ci` fires lifecycle scripts every leg), Pitfall 4 (husky prepare in `.git`-less contexts), Pitfall 7 (stdout/stderr, already fixed in Phase 19)

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — CIW-01..05 exact wording
- `.planning/ROADMAP.md` — Phase 20 goal + success criteria; Phase 21 dependency (publish job gates on these jobs)

### Consumed contracts (Phase 19)
- `.planning/phases/19-cli-ergonomics-build-skill-verification/19-CONTEXT.md` — D-01..D-11: `--quiet` = silent stdout + exit 0; `--format json` = exactly one compact JSON doc on stdout (`{ok, count}` lint / `{ok, outDir, skillCount, bucketCount}` build); errors on stderr. CI assertions MUST match these shapes exactly.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/motto.js` — CLI entry with `--quiet`/`--format json` already shipped (Phase 19); CI jobs invoke it via `node bin/motto.js …` (dogfood) and `npx motto …` (E2E).
- `.husky/pre-commit` — runs `npm test`; stays as-is, only `prepare` wiring changes.
- `package.json` — `"prepare": "husky"` is the CIW-05 target; `files: ["bin/","src/","dist/public/"]` allowlist means `scripts/` never ships; `prepublishOnly` runs `motto build` (fires on `npm ci` per leg — idempotent, note in workflow comment per Pitfall 3).

### Established Patterns
- Zero runtime deps beyond `yaml`; zero new devDeps for this phase — E2E and drift scripts are plain Node stdlib (`node:child_process`, `node:fs`, `fetch`).
- `node --test` auto-discovers `test/*.test.js`; pack-E2E script deliberately lives in `scripts/` so local `npm test` stays fast.
- Exit codes via `process.exitCode` (never `process.exit()`).

### Integration Points
- Phase 21 publish job will be appended to this same `ci.yml` with `needs:` on all four Phase 20 jobs — name jobs with that in mind.
- Phase 21 (PUB-03) moves the D-05 tarball-leak assertion into the pack-E2E script — structure the script so an extra assertion slots in cleanly.
- package.json is at `0.0.3` (= registry): drift warning stays silent until the pre-milestone 0.0.5 catch-up publish or next bump — expected, not a bug.

</code_context>

<specifics>
## Specific Ideas

- Division of labor between jobs is intentional: dogfood proves `--quiet` (silence + exit 0), pack-E2E proves `--format json` (parse + `.ok`) — Phase 19's two flags each get one live CI consumer.
- Drift check would have made the v0.0.4/v0.0.5 silent-drift a yellow banner on every push — that's the bar: visible without being blocking.

</specifics>

<deferred>
## Deferred Ideas

- D-05 tarball-leak assertion in pack-E2E — Phase 21 (PUB-03), by design.
- README CI badge — cosmetic; natural fit for Phase 22's public-facing pass.
- OS matrix (Windows/macOS runners) — research-deferred until a real Windows bug appears.

</deferred>

---

*Phase: 20-CI Workflow*
*Context gathered: 2026-07-03*
