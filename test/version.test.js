import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import { getOwnVersion, parseVersion, checkSkew } from "../src/version.js";

// getOwnVersion() -> string|null
// parseVersion(v: unknown) -> {major,minor,patch}|null
// checkSkew(stampedVersion, toolVersion) -> {skill, message}|null
//
// Never-throw boundary (D-01): parseVersion/checkSkew never throw for any
// input shape; getOwnVersion never throws for any read/parse failure.
//
// Version literals: fixture comparisons use fake strings ('1.2.3'/'1.2.4'/
// '1.3.0') per Pitfall 6 — getOwnVersion() is compared against a LIVE read
// of package.json, never a hardcoded literal like '0.0.6'/'0.0.7'.

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_JSON_PATH = join(__dirname, "..", "package.json");

describe("parseVersion", () => {
  it("parses a plain X.Y.Z string", () => {
    assert.deepEqual(parseVersion("1.2.3"), { major: 1, minor: 2, patch: 3 });
  });

  it("parses a v-prefixed string", () => {
    assert.deepEqual(parseVersion("v1.2.3"), { major: 1, minor: 2, patch: 3 });
  });

  it("extracts major/minor/patch independently", () => {
    assert.deepEqual(parseVersion("10.20.30"), {
      major: 10,
      minor: 20,
      patch: 30,
    });
  });

  it("ignores a trailing prerelease suffix (intentional narrowing, Pitfall 5)", () => {
    assert.deepEqual(parseVersion("0.0.7-beta.1"), {
      major: 0,
      minor: 0,
      patch: 7,
    });
  });

  it("tolerates leading/trailing whitespace", () => {
    assert.deepEqual(parseVersion("  1.2.3  "), {
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  const ADVERSARIAL_INPUTS = [
    ["number", 7],
    ["array", [0, 0, 7]],
    ["object", { major: 0, minor: 0, patch: 7 }],
    ["boolean", true],
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["'0.7' (only 2 segments)", "0.7"],
    ["'latest' (garbage string)", "latest"],
  ];

  for (const [label, input] of ADVERSARIAL_INPUTS) {
    it(`returns null (never throws) for ${label}`, () => {
      let result;
      assert.doesNotThrow(() => {
        result = parseVersion(input);
      });
      assert.equal(result, null);
    });
  }

  it("'0.0.7.1' parses via leading match as {0,0,7} — documented non-anchored behavior", () => {
    // VERSION_RE has no trailing $ anchor by design (Pitfall 5) — a 4th
    // segment is ignored, not rejected.
    assert.deepEqual(parseVersion("0.0.7.1"), { major: 0, minor: 0, patch: 7 });
  });
});

describe("checkSkew direction (VER-03)", () => {
  it("equal versions -> null (no warning)", () => {
    assert.equal(checkSkew("1.2.3", "1.2.3"), null);
  });

  it("absent stamped version -> null", () => {
    assert.equal(checkSkew(undefined, "1.2.3"), null);
  });

  it("unparsable stamped version -> null", () => {
    assert.equal(checkSkew("garbage", "1.2.3"), null);
  });

  it("null tool version -> null", () => {
    assert.equal(checkSkew("1.2.3", null), null);
  });

  it("project older than tool -> 'check UPGRADING.md' remedy, names both versions", () => {
    const warning = checkSkew("1.2.3", "1.3.0");
    assert.ok(warning);
    assert.equal(warning.skill, "motto.yaml");
    assert.match(warning.message, /check UPGRADING\.md/);
    assert.match(warning.message, /1\.2\.3/);
    assert.match(warning.message, /1\.3\.0/);
  });

  it("project newer than tool -> 'upgrade motto' remedy, names both versions", () => {
    const warning = checkSkew("1.3.0", "1.2.3");
    assert.ok(warning);
    assert.equal(warning.skill, "motto.yaml");
    assert.match(warning.message, /upgrade motto/);
    assert.match(warning.message, /1\.3\.0/);
    assert.match(warning.message, /1\.2\.3/);
  });

  it("differs only at minor segment -> still direction-aware", () => {
    const warning = checkSkew("1.2.0", "1.3.0");
    assert.match(warning.message, /check UPGRADING\.md/);
  });

  it("differs only at major segment -> still direction-aware", () => {
    const warning = checkSkew("2.0.0", "1.0.0");
    assert.match(warning.message, /upgrade motto/);
  });
});

describe("getOwnVersion (VER-01 foundation)", () => {
  it("returns a truthy string", () => {
    const version = getOwnVersion();
    assert.equal(typeof version, "string");
    assert.ok(version.length > 0);
  });

  it("equals the version read live from package.json (never a hardcoded literal, Pitfall 6)", async () => {
    const pkgText = await readFile(PACKAGE_JSON_PATH, "utf8");
    const pkg = JSON.parse(pkgText);
    assert.equal(getOwnVersion(), pkg.version);
  });

  it("is memoized across calls (same reference behavior — repeated calls return the same value)", () => {
    assert.equal(getOwnVersion(), getOwnVersion());
  });
});
