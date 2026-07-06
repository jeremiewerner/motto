/**
 * Motto's own version + skew-detection utilities.
 *
 * getOwnVersion() is the ONE function in this file that touches the
 * filesystem (a single readFileSync of Motto's own package.json). It never
 * throws — any read/parse failure collapses to null (D-01 house style).
 *
 * parseVersion() and checkSkew() are pure string-in/object-out functions:
 * no filesystem I/O, never throw for any input shape.
 *
 * Exports:
 *   - getOwnVersion() -> string|null
 *   - parseVersion(v: unknown) -> {major:number, minor:number, patch:number}|null
 *   - checkSkew(stampedVersion, toolVersion) -> {skill:string, message:string}|null
 */

import { readFileSync } from "node:fs";

let cached;

/**
 * Read Motto's own package.json version. Never throws: any read/parse
 * failure yields null; callers treat null as "skew check unavailable."
 * Memoized across calls — the tool's own version cannot change mid-process.
 * @returns {string|null}
 */
export function getOwnVersion() {
  if (cached !== undefined) return cached;
  try {
    const url = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(url, "utf8"));
    cached = typeof pkg.version === "string" ? pkg.version : null;
  } catch {
    cached = null;
  }
  return cached;
}

// Deliberately NOT end-anchored: trailing prerelease/build suffixes (e.g.
// "0.0.7-beta.1") are ignored by design, not parsed per full semver
// precedence. This is an intentional narrowing (Pitfall 5) — Motto has
// never shipped a prerelease/build-metadata tag; a future maintainer should
// not assume full semver-precedence support exists here (V5 input-validation
// note: the raw string is never used beyond comparison/display).
const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)/;

/**
 * Parse a version-like value into numeric parts. Never throws. Returns
 * null for anything that isn't a string matching a leading X.Y.Z shape —
 * including non-string types, which happens whenever motto.yaml predates
 * stamping or was hand-edited into garbage.
 * @param {unknown} v
 * @returns {{major:number, minor:number, patch:number}|null}
 */
export function parseVersion(v) {
  if (typeof v !== "string") return null;
  const m = VERSION_RE.exec(v.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Compare two parsed versions. -1 = a<b, 0 = a==b, 1 = a>b.
 * Module-internal — not exported.
 * @param {{major:number,minor:number,patch:number}} a
 * @param {{major:number,minor:number,patch:number}} b
 * @returns {-1|0|1}
 */
function compareParsed(a, b) {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/**
 * Compute a skew warning between a project's stamped mottoVersion and the
 * running tool's own version. Returns null when there's nothing to warn
 * about: no stamp, unparsable stamp (already reported elsewhere as an
 * error — see config.js), can't determine own version, or versions equal.
 *
 * Message wording is a working draft (D-R3) — VER-F1 defers final wording
 * validation to magma's real-world skew case; no structured JSON skew
 * fields are added here (VER-F1 deferred).
 *
 * @param {string|undefined} stampedVersion - config.mottoVersion (already
 *   confirmed to be a valid parseable string by the caller, or legitimately
 *   absent — see D-R1)
 * @param {string|null} toolVersion - getOwnVersion()'s result
 * @returns {{skill: string, message: string}|null}
 */
export function checkSkew(stampedVersion, toolVersion) {
  const stamped = parseVersion(stampedVersion);
  const tool = parseVersion(toolVersion);
  if (!stamped || !tool) return null; // nothing to compare — never an error here
  const cmp = compareParsed(stamped, tool);
  if (cmp === 0) return null;
  if (cmp < 0) {
    return {
      skill: "motto.yaml",
      message: `project was scaffolded with motto ${stampedVersion}; you are running ${toolVersion} — check UPGRADING.md for changes since ${stampedVersion}`,
    };
  }
  return {
    skill: "motto.yaml",
    message: `project was scaffolded with motto ${stampedVersion}, newer than your running ${toolVersion} — upgrade motto`,
  };
}
