import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchor REPO_ROOT at load time via import.meta.url — NEVER derive it from
// the current working directory (that shifts with invocation directory;
// import.meta.url is stable). test/doc-sync.test.js lives one level inside
// the repo root, so '..' resolves correctly.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── DOC-06: skill-schema.md drift guard ──────────────────────────────────────
//
// Direction is code -> doc ONLY (Pitfall 3, 17-RESEARCH.md): the expected set
// of static error-message segments is derived from src/schema.js,
// src/lint.js, and src/frontmatter.js's own source text, then asserted as a
// substring of shared/references/skill-schema.md. Never the reverse —
// iterating the doc's own tables and checking them against the code would
// invert the source-of-truth relationship and mask a doc going stale.
//
// Each segment is a pure-literal substring chosen to NOT span a `${...}`
// interpolation boundary, so it survives verbatim in both the source template
// literal and the doc's transcribed error table.
const staticSegments = [
  'name is required',
  'name must be a string (got ',
  'name must be letter-start kebab-case',
  'name must not exceed 64 characters',
  'must not contain the reserved substrings "anthropic" or "claude"',
  'must equal its folder name',
  'description is required',
  'description must be a string (got ',
  'description must not exceed 1024 characters',
  'description must not contain XML tags (e.g. <example>)',
  'audience must be public|private',
  'body must begin with an H1 title line (# Title) as its first non-blank line',
  'body must contain a **Role:** line',
  'is an unsafe basename (must not contain "/" or ".")',
  'not found in shared/references/',
  'template must be a string (got ',
  'unknown template "',
  'requires <',
  'outputs must be a map of name -> file',
  'must be a non-empty string path (got ',
  'is unsafe (must not be absolute or contain',
  'does not exist',
  'is not a file',
  'escapes the skill directory via symlink',
  'could not be resolved: ',
  'dependencies must be an array',
  'dependencies entry must be a non-empty string',
  'is not valid "plugin:skill" format',
  'is a self-dependency',
  'not found (available: ',
  'is private but this skill is public (audience-direction guard)',
  'allowed-tools must be a non-empty string or array',
  'allowed-tools[',
  'allowed-tools must be a string or array (got ',
  // §10 frontmatter envelope — sourced from src/frontmatter.js (fully static
  // messages, no interpolation).
  "missing frontmatter: file must begin with a '--- ... ---' block",
  "unterminated frontmatter: no closing '---' delimiter found",
  "stray '---' delimiter in frontmatter: the block must contain exactly one closing '---'",
];

describe('doc-sync (DOC-06)', () => {
  it('every curated static segment is live source text AND is quoted in skill-schema.md', async () => {
    const [schemaSrc, lintSrc, frontmatterSrc, docText] = await Promise.all([
      readFile(join(REPO_ROOT, 'src', 'schema.js'), 'utf8'),
      readFile(join(REPO_ROOT, 'src', 'lint.js'), 'utf8'),
      readFile(join(REPO_ROOT, 'src', 'frontmatter.js'), 'utf8'),
      readFile(join(REPO_ROOT, 'shared', 'references', 'skill-schema.md'), 'utf8'),
    ]);

    for (const seg of staticSegments) {
      // Self-check: the curated segment must still be real, live source text —
      // catches the case where schema.js/lint.js/frontmatter.js changed and
      // the curated list here was never updated to match.
      assert.ok(
        schemaSrc.includes(seg) || lintSrc.includes(seg) || frontmatterSrc.includes(seg),
        `stale curated segment (not in schema.js/lint.js/frontmatter.js source): "${seg}"`,
      );
      // Doc containment: the doc must still quote this exact static segment —
      // catches the case where the doc drifted from the live validator.
      assert.ok(
        docText.includes(seg),
        `skill-schema.md missing expected error string: "${seg}"`,
      );
    }
  });
});
