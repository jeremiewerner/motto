import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseFrontmatter } from "../src/frontmatter.js";

// parseFrontmatter(text) -> { data, body, errors: [{ message }] }
// Uniform never-throw errors[] model (D-01, D-03). Tests assert on errors[]
// content, NEVER assert.throws.

describe("parseFrontmatter", () => {
  // B1 (PARSE-01 happy path)
  it("B1: splits a well-formed SKILL.md into data + body with no errors", () => {
    const input = "---\nname: my-skill\naudience: public\n---\n# Title\n\nbody\n";
    const { data, body, errors } = parseFrontmatter(input);
    assert.equal(data.name, "my-skill");
    assert.equal(data.audience, "public");
    assert.equal(body, "# Title\n\nbody\n");
    assert.deepEqual(errors, []);
  });

  // B2 (PARSE-01 missing block, D-03) — named error, never throws
  it("B2: missing frontmatter block returns a named error and does not throw", () => {
    const input = "# no frontmatter here";
    let result;
    assert.doesNotThrow(() => {
      result = parseFrontmatter(input);
    });
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, /frontmatter/);
    assert.deepEqual(result.data, {});
    assert.equal(result.body, input);
  });

  // B3 (D-07 empty block) — data {}, no parse error
  it("B3: empty frontmatter block yields data {} with no errors", () => {
    const input = "---\n---\nbody";
    const { data, body, errors } = parseFrontmatter(input);
    assert.deepEqual(data, {});
    assert.deepEqual(errors, []);
    assert.equal(body, "body");
  });

  // B4 (PARSE-02, D-05) — BOM + CRLF parity with plain LF/no-BOM
  it("B4: leading BOM and CRLF parse identically to LF/no-BOM", () => {
    const plain = "---\nname: my-skill\naudience: public\n---\n# Title\n\nbody\n";
    const weird =
      "﻿---\r\nname: my-skill\r\naudience: public\r\n---\r\n# Title\r\n\r\nbody\r\n";
    const a = parseFrontmatter(plain);
    const b = parseFrontmatter(weird);
    assert.deepEqual(b.data, a.data);
    assert.equal(b.body, a.body);
    assert.deepEqual(a.errors, []);
    assert.deepEqual(b.errors, []);
  });

  // B5 (PARSE-03, D-02) — malformed YAML surfaces in errors[], never throws
  it("B5: malformed YAML in frontmatter surfaces a non-empty errors[] and does not throw", () => {
    const input = '---\nfoo: "unterminated\n---\n# body';
    let result;
    assert.doesNotThrow(() => {
      result = parseFrontmatter(input);
    });
    assert.ok(result.errors.length > 0);
  });

  // B6 (PARSE-04, D-06 stray) — stray inner --- detected
  it("B6: a stray inner --- in the frontmatter is reported", () => {
    const input = "---\nname: x\n---\naudience: public\n---\n# body";
    const { errors } = parseFrontmatter(input);
    assert.ok(errors.length > 0);
    assert.ok(
      errors.some((e) => /stray/i.test(e.message) && /frontmatter/i.test(e.message)),
      `expected a stray-frontmatter-delimiter error, got: ${JSON.stringify(errors)}`,
    );
  });

  // B7 (D-06 regression guard) — body --- horizontal rule is NOT flagged
  it("B7: a --- horizontal rule in the body is not flagged and is retained", () => {
    const input =
      "---\nname: x\naudience: public\n---\n# Title\n\nbody text\n\n---\n\nmore body\n";
    const { errors, body } = parseFrontmatter(input);
    assert.deepEqual(errors, []);
    assert.ok(body.includes("\n---\n"), "body should retain the --- horizontal rule");
  });
});
