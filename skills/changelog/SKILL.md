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

## Step 5 — Propose the next version

Infer the next version by semver from the commit types grouped in Step 4: any `feat` commit → bump minor; only `fix`/`docs`/`chore`/`refactor`/`test` commits → bump patch; a breaking-change marker (`!` after the type/scope, or a `BREAKING CHANGE:` footer) → bump major. State the proposed version in the draft entry's heading. This is a proposal, not a commit — it is flagged for maintainer confirmation in Step 7's handback.

Alternatively, if the inference is ambiguous or the maintainer prefers to assign the version at release time, write the heading as `## [Unreleased]` instead and let the release flow assign the version later.

## Step 6 — Write the entry into CHANGELOG.md

Create CHANGELOG.md if it does not exist (with the standard Keep a Changelog header). Insert the new entry at the top of the version list under a `## [<proposed-version>] - <date>` (or `## [Unreleased]`) heading, using Keep a Changelog section headings (Added, Changed, Fixed, etc.) for the groups from Step 4.

## Step 7 — Hand back for review

Present the drafted entry to the maintainer for review and editing before anything is committed, explicitly calling out the proposed version from Step 5 as needing confirmation. Do not commit CHANGELOG.md yourself — the maintainer folds it into the version-bump commit of the release flow.

</process>

<success_criteria>

- CHANGELOG.md exists and its top version entry covers every commit since the last version tag, grouped under Keep a Changelog headings.
- Bullets read as plain-language descriptions of changes, not copied commit subjects.
- The proposed version was inferred by semver from the grouped commit types (or left as `[Unreleased]`) and flagged for maintainer confirmation.
- The entry was handed back for maintainer review, not committed by the skill.

</success_criteria>
