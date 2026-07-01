import YAML from "yaml";

/**
 * Safely convert a YAML Document node to a plain JS value without throwing.
 *
 * YAML's doc.toJS() throws a ReferenceError when the document contains an
 * unresolved alias (e.g. `description: *foo` where anchor `foo` is not defined).
 * The parsers in this project must NEVER throw (D-01, REVIEW-02, REVIEW-03);
 * this helper centralises the guard so neither parseFrontmatter nor loadConfig
 * needs its own try/catch.
 *
 * @param {import('yaml').Document} doc
 * @returns {{ value: any, threw: boolean, message: string|null }}
 */
export function safeToJS(doc) {
  try {
    return { value: doc.toJS(), threw: false, message: null };
  } catch (e) {
    return { value: null, threw: true, message: String(e?.message ?? e) };
  }
}

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
  // up to the next bare "---" — has a node shape consistent with a leaked YAML
  // mapping, it is leaked frontmatter split by a stray delimiter, not body.
  //
  // Node-shape detection (REVIEW-05): instead of calling toJS() (which throws on
  // unresolved aliases such as `key: *foo` or `**Role:**` alias nodes — D-01),
  // we inspect the PARSED NODE TREE directly. The region is treated as a leaked
  // mapping iff:
  //   - regionDoc.errors.length === 0  (clean parse — not a syntax error)
  //   - YAML.isMap(regionDoc.contents) (top-level node is a mapping, not a scalar)
  //   - regionDoc.contents.items.length > 0 (at least one key-value pair present)
  //
  // This catches `key: *foo` (alias value — errors.length 0, isMap true) while
  // leaving body text (Scalar) and horizontal rules (Scalar/null) unflagged (B7).
  // The B8 region ("**Role:** Guide.\n\n") resolves to an Alias node with
  // errors.length > 0, so it stays correctly unflagged (B8).
  //
  // Zero unguarded toJS() calls remain in this file; safeToJS() owns the guard
  // for the main block parse (step 5b above).
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
    const isLeakedMapping =
      regionDoc.errors.length === 0 &&
      YAML.isMap(regionDoc.contents) &&
      regionDoc.contents.items.length > 0;
    if (isLeakedMapping) {
      errors.push({
        message:
          "stray '---' delimiter in frontmatter: the block must contain exactly one closing '---'",
      });
    }
  }

  // (5) PARSE THE BLOCK with YAML.parseDocument (NOT YAML.parse — D-02). Map
  // every parse error into the returned errors[] (D-02, PARSE-03). An empty
  // block yields data {} with NO parse error (D-07). toJS() is deferred to (5b).
  const doc = YAML.parseDocument(block);
  for (const e of doc.errors) {
    errors.push({ message: e.message });
  }

  // (5b) RESOLVE to plain JS. safeToJS guards against toJS() throwing on an
  // unresolved alias (e.g. `description: *foo` — D-01, REVIEW-02).
  const { value, threw, message } = safeToJS(doc);
  if (threw) {
    errors.push({ message });
  }
  let data = value;
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    data = {};
  }

  return { data, body, errors };
}
