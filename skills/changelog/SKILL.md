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

# Drafting a CHANGELOG.md Entry from Commits

<role>
You draft a Keep a Changelog-style entry for the next version by reading the commits since the last version tag, summarizing them in plain language grouped by change type, and placing the entry at the top of CHANGELOG.md for the maintainer to review and edit before committing.
</role>

<process>

## Step 1 — Find the last version tag

Resolve the most recent version tag with `git describe --tags --abbrev=0` (fall back to `git tag --sort=-v:refname | head -1`). If the repository has no version tags at all, treat the full history as the commit range and note that in the draft entry.

## Step 2 — Collect commits since that tag

Run `git log <last-tag>..HEAD --oneline` to list every commit since the tag.

## Step 3 — Stop early when there is nothing to draft

If Step 2 returns zero commits, report "no changes since <last-tag>" to the maintainer and stop without creating or modifying CHANGELOG.md — an empty version entry must never be written.

## Step 4 — Group and summarize

Group the commits by change type using their conventional-commit prefixes (feat → Added, fix → Fixed, docs → Documentation, refactor/chore/test → Changed or Internal as fits). Rewrite each group as plain-language bullet points describing what changed for a user of the project — not restated commit subjects.

## Step 5 — Write the entry into CHANGELOG.md

Create CHANGELOG.md if it does not exist (with the standard Keep a Changelog header). Insert the new entry at the top of the version list under a `## [<new-version>] - <date>` heading, using Keep a Changelog section headings (Added, Changed, Fixed, etc.) for the groups from Step 4.

## Step 6 — Hand back for review

Present the drafted entry to the maintainer for review and editing before anything is committed. Do not commit CHANGELOG.md yourself — the maintainer folds it into the version-bump commit of the release flow.

</process>

<success_criteria>

- CHANGELOG.md exists and its top version entry covers every commit since the last version tag, grouped under Keep a Changelog headings.
- Bullets read as plain-language descriptions of changes, not copied commit subjects.
- The entry was handed back for maintainer review, not committed by the skill.

</success_criteria>
