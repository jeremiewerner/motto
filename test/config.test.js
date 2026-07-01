import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../src/config.js";

// loadConfig(text: string) -> { config: object, errors: Array<{ message: string }> }
// - Never throws (D-01).
// - YAML is parsed with parseDocument; doc.errors[] are mapped into errors[] (D-02, D-18).
// - Required fields: name, version, description, plugins.public — ALL missing ones
//   reported together, not short-circuited (CONF-01, D-15).
// - plugins.public and plugins.private (when present) validated against the
//   letter-start kebab regex (CONF-02, D-16).
// - plugins.private is optional — absent is NOT an error (CONF-03, D-17).

const VALID_TEXT =
  "name: poems\nversion: 0.1.0\ndescription: my poems\nplugins:\n  public: poems\n  private: poems-pro\n";

describe("loadConfig", () => {
  // C1: happy path — valid config returns parsed config and []
  it("C1: valid config text returns parsed config and empty errors", () => {
    const { config, errors } = loadConfig(VALID_TEXT);
    assert.equal(config.name, "poems");
    assert.equal(config.plugins.public, "poems");
    assert.equal(config.plugins.private, "poems-pro");
    assert.deepEqual(errors, []);
  });

  // C2: missing required fields — all collected together (CONF-01, D-15)
  // Input has name but is missing version, description, and plugins.public.
  it("C2: missing version, description, plugins.public all reported together (D-15)", () => {
    const { errors } = loadConfig("name: poems\n");
    assert.ok(
      errors.length >= 3,
      `expected at least 3 errors, got: ${JSON.stringify(errors)}`
    );
    const msgs = errors.map((e) => e.message).join(" ");
    assert.ok(/version/i.test(msgs), `expected version error in: ${msgs}`);
    assert.ok(/description/i.test(msgs), `expected description error in: ${msgs}`);
    assert.ok(
      /plugins\.public|plugins public/i.test(msgs),
      `expected plugins.public error in: ${msgs}`
    );
    // Must NOT throw
  });

  // C3: plugins.public non-kebab "Bad_Name" — reports plugin-name error (D-16)
  it("C3: plugins.public 'Bad_Name' (non-kebab) reports a plugin-name error (D-16)", () => {
    const text =
      "name: poems\nversion: 0.1.0\ndescription: my poems\nplugins:\n  public: Bad_Name\n";
    const { errors } = loadConfig(text);
    assert.ok(
      errors.length >= 1,
      `expected 1+ error, got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /Bad_Name|plugin|kebab|letter/i.test(e.message)),
      `expected plugin-name error for 'Bad_Name', got: ${JSON.stringify(errors)}`
    );
  });

  // C4: plugins.public leading digit "0bad" — letter-start rule (D-08/D-16)
  it("C4: plugins.public '0bad' (leading digit) reports a plugin-name error (D-08/D-16)", () => {
    const text =
      "name: poems\nversion: 0.1.0\ndescription: my poems\nplugins:\n  public: 0bad\n";
    const { errors } = loadConfig(text);
    assert.ok(
      errors.length >= 1,
      `expected 1+ error, got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /0bad|plugin|kebab|letter/i.test(e.message)),
      `expected plugin-name error for '0bad', got: ${JSON.stringify(errors)}`
    );
  });

  // C5: plugins.private present and invalid "Bad/Name" — reports plugin-name error (D-16)
  it("C5: plugins.private 'Bad/Name' (invalid) reports a plugin-name error (D-16)", () => {
    const text =
      "name: poems\nversion: 0.1.0\ndescription: my poems\nplugins:\n  public: poems\n  private: Bad/Name\n";
    const { errors } = loadConfig(text);
    assert.ok(
      errors.length >= 1,
      `expected 1+ error, got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /Bad\/Name|plugin|kebab|letter/i.test(e.message)),
      `expected plugin-name error for 'Bad/Name', got: ${JSON.stringify(errors)}`
    );
  });

  // C6: plugins.private ABSENT — no error (CONF-03, D-17)
  it("C6: absent plugins.private reports no error (CONF-03, D-17)", () => {
    const text =
      "name: poems\nversion: 0.1.0\ndescription: my poems\nplugins:\n  public: poems\n";
    const { errors } = loadConfig(text);
    assert.deepEqual(
      errors,
      [],
      `expected no errors when plugins.private is absent, got: ${JSON.stringify(errors)}`
    );
  });

  // C8: loadConfig must not throw on an unresolved YAML alias (D-01 regression)
  it("C8: loadConfig does not throw on an unresolved YAML alias (D-01)", () => {
    const aliasText =
      "name: *foo\nversion: 0.1.0\ndescription: d\nplugins:\n  public: poems\n";
    let result;
    assert.doesNotThrow(() => {
      result = loadConfig(aliasText);
    }, "must not throw for unresolved alias");
    assert.ok(result.errors.length > 0, "must return at least one error");
  });

  // C7: malformed YAML — surfaces in errors[], NEVER throws (D-18, D-01)
  it("C7: malformed YAML text surfaces in errors[] and never throws (D-18, D-01)", () => {
    let result;
    assert.doesNotThrow(() => {
      result = loadConfig("name: : :\n");
    }, "loadConfig must never throw on malformed YAML (D-01)");
    assert.ok(
      result.errors.length >= 1,
      `expected at least 1 error from malformed YAML, got: ${JSON.stringify(result.errors)}`
    );
  });
});
