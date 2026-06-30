import YAML from "yaml";

/**
 * Split a SKILL.md into frontmatter `data` + Markdown `body`, normalizing the
 * input first, and report every structural malformation through a uniform
 * `errors[]` array. NEVER throws (D-01, D-03): every failure path returns via
 * `errors[]`.
 *
 * @param {string} text - raw SKILL.md contents
 * @returns {{ data: object, body: string, errors: Array<{ message: string }> }}
 */
export function parseFrontmatter(text) {
  const errors = [];

  // (1) NORMALIZE FIRST (D-04, D-05): strip a single leading UTF-8 BOM, then
  // CRLF -> LF. Nothing else — no lone-CR handling, no trailing-whitespace
  // munging. All downstream delimiter logic stays LF-anchored.
  let normalized = text;
  if (normalized.charCodeAt(0) === 0xfeff) {
    normalized = normalized.slice(1);
  }
  normalized = normalized.replace(/\r\n/g, "\n");

  const lines = normalized.split("\n");

  // (2) OPENING DELIMITER: normalized text must begin with a bare "---" line.
  if (lines[0] !== "---") {
    errors.push({
      message: "missing frontmatter: file must begin with a '--- ... ---' block",
    });
    return { data: {}, body: normalized, errors };
  }

  // (3) CLOSING DELIMITER: the first subsequent bare "---" line is the close.
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) {
    errors.push({
      message: "unterminated frontmatter: no closing '---' delimiter found",
    });
    return { data: {}, body: normalized, errors };
  }

  const block = lines.slice(1, close).join("\n");
  const body = lines.slice(close + 1).join("\n");

  // (4) STRAY DETECTION (PARSE-04, D-06): a valid file has exactly one opening
  // and one closing bare "---". If the region immediately following the close —
  // up to the next bare "---" — parses cleanly as a YAML mapping, it is leaked
  // frontmatter split by a stray delimiter, not body. A "---" that introduces
  // ordinary Markdown body (a horizontal rule) resolves to a scalar/null, not a
  // mapping, and is therefore NOT flagged (B7).
  let nextDelim = -1;
  for (let i = close + 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      nextDelim = i;
      break;
    }
  }
  if (nextDelim !== -1) {
    const region = lines.slice(close + 1, nextDelim).join("\n");
    const regionDoc = YAML.parseDocument(region);
    // toJS() can throw for unresolved YAML aliases (e.g. "**Role:**" in body text
    // is parsed as a `*name` alias node). Treat any toJS() exception as a
    // non-mapping result so the stray-delimiter check is skipped gracefully (D-01).
    let regionValue;
    try {
      regionValue = regionDoc.toJS();
    } catch (_) {
      regionValue = null;
    }
    const isMapping =
      regionValue !== null &&
      typeof regionValue === "object" &&
      !Array.isArray(regionValue) &&
      Object.keys(regionValue).length > 0;
    if (regionDoc.errors.length === 0 && isMapping) {
      errors.push({
        message:
          "stray '---' delimiter in frontmatter: the block must contain exactly one closing '---'",
      });
    }
  }

  // (5) PARSE THE BLOCK with YAML.parseDocument (NOT YAML.parse — D-02). Map
  // every parse error into the returned errors[] (D-02, PARSE-03). An empty
  // block yields data {} with NO parse error (D-07).
  const doc = YAML.parseDocument(block);
  for (const e of doc.errors) {
    errors.push({ message: e.message });
  }

  let data = doc.toJS();
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    data = {};
  }

  return { data, body, errors };
}
