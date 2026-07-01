# Phase 9: Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 9-Documentation
**Areas discussed:** README scope/altitude, Lead audience/order, Quickstart depth, Marketplace-add vs private repo

---

## README scope / altitude

| Option | Description | Selected |
|--------|-------------|----------|
| Full project README | Intro + why + authoring quickstart + all install paths + brief contributing | ✓ |
| Install-reference only | One-paragraph intro + DOC-01/02/03 command blocks, nothing else | |

**User's choice:** Full project README
**Notes:** No README exists; it's the repo's front door and also the npmjs.com package page.

---

## Lead audience / order

| Option | Description | Selected |
|--------|-------------|----------|
| Author-first | Lead with build-skills-with-Motto (npm CLI, lint/build/publish), then marketplace | ✓ |
| Consumer-first | Lead with installing skills via marketplace, then authoring | |

**User's choice:** Author-first
**Notes:** Matches Motto's core value = authoring.

---

## Quickstart depth

| Option | Description | Selected |
|--------|-------------|----------|
| Command blocks + 1 short E2E | Per-path blocks plus one compact scaffold→lint→build→install example | ✓ |
| Terse command blocks only | Copy-paste blocks per path, no walkthrough | |
| Full narrated walkthrough | Step-by-step prose for the whole journey | |

**User's choice:** Command blocks + 1 short E2E

---

## Marketplace-add vs private repo (DOC-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Public form + go public | Document `/plugin marketplace add jeremiewerner/motto`; make the repo public | ✓ |
| Both forms + private caveat | Document public + local-path forms with a "repo currently private" note | |
| Local-path only for now | Document only the local-path add until repo goes public | |

**User's choice:** Public form + go public
**Notes:** Decides T-08-04 — repo will be made public (`gh repo edit --visibility public`) at/near ship so the documented GitHub-form add actually works for external users.

---

## Claude's Discretion

- Exact section headings, ordering inside the authoring quickstart, prose tone.
- Whether the brief contributing/dev content is inline or a stub pointing at a future CONTRIBUTING.md.

## Deferred Ideas

- Full standalone `CONTRIBUTING.md` — future doc, not required by DOC-01/02/03.
- Docs site / extended guides — out of scope; README is the single deliverable.
