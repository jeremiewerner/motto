import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  validateSkill,
  NAME_KEBAB,
  hasClosedSection,
  hasNonEmptyClosedSection,
  isOutputPathLexicallySafe,
} from "../src/schema.js";

// validateSkill(skill, sharedRefs?) -> Array<{ skill: string, message: string }>
// - Never throws (D-01).
// - Name checks CASCADE (D-13): missing -> non-kebab -> reserved-word -> !=folder.
//   The chain stops at the first name failure; downstream name checks are skipped.
// - All other checks (description, audience, body Title, body Role, each
//   shared_references entry) are INDEPENDENT and collected together (D-13).

const VALID_BODY = "# My Skill\n\n<role>\nYou are a helper.\n</role>\n\nDo things.\n";

describe("validateSkill", () => {
  // B1: happy path — valid skill returns []
  it("B1: valid skill returns empty errors array", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", description: "use when X", audience: "public" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.deepEqual(errors, []);
  });

  // B2: missing name — cascade stops; no further name errors (D-13)
  it("B2: missing name reports missing-name error and stops the name cascade (D-13)", () => {
    const skill = {
      dirName: "my-skill",
      data: { description: "use when X", audience: "public" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.equal(errors[0].skill, "my-skill");
    assert.ok(
      /name/i.test(errors[0].message),
      `expected name error, got: "${errors[0].message}"`
    );
    // Cascade stopped — no non-kebab, reserved-word, or folder errors
    assert.ok(!errors.some((e) => /kebab|letter/i.test(e.message)), "no kebab error");
    assert.ok(!errors.some((e) => /reserved/i.test(e.message)), "no reserved error");
    assert.ok(!errors.some((e) => /folder|equal/i.test(e.message)), "no folder error");
  });

  // B3: leading-digit name (D-08 regression guard) — cascade stops at non-kebab
  it("B3: leading-digit name '0bad' reports non-kebab error; no downstream name errors", () => {
    const skill = {
      dirName: "0bad",
      data: { name: "0bad", description: "use when X", audience: "public" },
      body: "# Title\n\n<role>\nhelper.\n</role>\n",
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /kebab|letter/i.test(errors[0].message),
      `expected non-kebab error, got: "${errors[0].message}"`
    );
    assert.ok(!errors.some((e) => /reserved/i.test(e.message)), "no reserved error");
    assert.ok(!errors.some((e) => /folder|equal/i.test(e.message)), "no folder error");
  });

  // B4: underscore name — cascade stops at non-kebab
  it("B4: underscore name 'My_Skill' reports non-kebab error", () => {
    const skill = {
      dirName: "My_Skill",
      data: { name: "My_Skill", description: "use when X", audience: "public" },
      body: "# Title\n\n<role>\nhelper.\n</role>\n",
    };
    const errors = validateSkill(skill);
    assert.ok(errors.length >= 1, "should report at least 1 error");
    assert.ok(
      errors.some((e) => /kebab|letter/i.test(e.message)),
      `expected non-kebab error in: ${JSON.stringify(errors)}`
    );
  });

  // B5: reserved-word name — cascade stops at reserved-word; no folder error (D-09)
  it("B5: reserved-word name 'claude-helper' reports reserved-word error; no folder error", () => {
    const skill = {
      dirName: "claude-helper",
      data: { name: "claude-helper", description: "use when X", audience: "public" },
      body: "# Title\n\n<role>\nhelper.\n</role>\n",
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /reserved|anthropic|claude/i.test(errors[0].message),
      `expected reserved-word error, got: "${errors[0].message}"`
    );
    assert.ok(!errors.some((e) => /folder|equal/i.test(e.message)), "no folder error");
  });

  // B6: name != folder — cascade stops at folder-mismatch check
  it("B6: name 'other' with dirName 'my-skill' reports name-not-equal-folder error", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "other", description: "use when X", audience: "public" },
      body: "# Title\n\n<role>\nhelper.\n</role>\n",
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.equal(errors[0].skill, "my-skill");
    assert.ok(
      /folder|equal|match/i.test(errors[0].message),
      `expected folder-mismatch error, got: "${errors[0].message}"`
    );
  });

  // B7: missing description (independent)
  it("B7: missing description reports missing-description error", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", audience: "public" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.equal(errors[0].skill, "my-skill");
    assert.ok(
      /description/i.test(errors[0].message),
      `expected description error, got: "${errors[0].message}"`
    );
  });

  // B8: audience — invalid and absent both produce the SAME message (D-11)
  it("B8: audience 'both' and absent audience produce the same public|private error (D-11)", () => {
    const base = { name: "my-skill", description: "use when X" };
    const errsBoth = validateSkill({
      dirName: "my-skill",
      data: { ...base, audience: "both" },
      body: VALID_BODY,
    });
    const errsAbsent = validateSkill({
      dirName: "my-skill",
      data: { ...base },
      body: VALID_BODY,
    });

    const audienceMsg = (errors) =>
      errors.find((e) => /public.*private|private.*public/i.test(e.message))?.message;

    const msgBoth = audienceMsg(errsBoth);
    const msgAbsent = audienceMsg(errsAbsent);
    assert.ok(
      msgBoth,
      `expected audience error for "both", got: ${JSON.stringify(errsBoth)}`
    );
    assert.ok(
      msgAbsent,
      `expected audience error when absent, got: ${JSON.stringify(errsAbsent)}`
    );
    assert.equal(msgBoth, msgAbsent, "same message for invalid and absent audience (D-11)");
  });

  // B9: body missing H1 title AND Role — both reported INDEPENDENTLY (D-12)
  it("B9: body without H1 title or Role line reports both errors independently (D-12)", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", description: "use when X", audience: "public" },
      body: "no title\nno role\n",
    };
    const errors = validateSkill(skill);
    assert.equal(
      errors.length,
      2,
      `expected exactly 2 errors (Title + Role), got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /title|H1/i.test(e.message)),
      `expected Title error in: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /role/i.test(e.message)),
      `expected Role error in: ${JSON.stringify(errors)}`
    );
  });

  // B10: resolved shared_references not reported; unresolved entry is reported
  it("B10: resolved shared_references entry is not reported; unresolved is", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        shared_references: ["voice", "missing"],
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill, new Set(["voice"]));
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      errors[0].message.includes("missing"),
      `expected "missing" in error, got: "${errors[0].message}"`
    );
    assert.ok(
      !errors[0].message.toLowerCase().includes("voice"),
      "voice should not appear in the error"
    );
  });

  // B11: unsafe basenames — safe-basename check precedes membership check (D-10)
  it("B11: unsafe shared_references basenames get unsafe errors; no 'not found' for them (D-10)", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        shared_references: ["../secret", "a.md", "ok/x"],
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill, new Set());
    assert.equal(
      errors.length,
      3,
      `expected 3 unsafe-basename errors, got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.every((e) => /unsafe|basename/i.test(e.message)),
      `all errors should indicate unsafe basename, got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      !errors.some((e) => /not found|unresolved/i.test(e.message)),
      "should not report 'not found' for unsafe entries"
    );
  });

  // B12: aggregation — multiple independent checks all reported together (D-13)
  it("B12: audience 'both' + missing description + body missing Role all reported together (D-13)", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", audience: "both" },
      body: "# My Title\n\nno role here.\n",
    };
    const errors = validateSkill(skill);
    assert.ok(
      errors.length >= 3,
      `expected at least 3 errors, got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /public.*private|private.*public/i.test(e.message)),
      `audience error missing from: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /description/i.test(e.message)),
      `description error missing from: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /role/i.test(e.message)),
      `role error missing from: ${JSON.stringify(errors)}`
    );
  });

  // B13a (superseded, Phase 15 VAL-02..04): `dependencies` is no longer a
  // passthrough key (D-14 retired — see schema.js docblock, Pitfall 6).
  // A bare entry not present in the (default empty) skillNames Set now
  // reports a "not found" error instead of being silently ignored.
  it("B13a: dependencies bare entry not resolvable against the (default empty) skillNames now errors (VAL-02, supersedes D-14)", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        dependencies: ["some-dep"],
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /dependency "some-dep" not found/.test(errors[0].message),
      `expected not-found error, got: "${errors[0].message}"`
    );
  });

  // B13b: unknown template value now errors (TMPL-04) — template is no
  // longer a passthrough key as of TMPL-01.
  it("B13b: unknown template value now errors (TMPL-04)", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        template: "standard",
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.ok(
      errors.some((e) => /unknown template "standard"/.test(e.message)),
      `expected unknown-template error, got: ${JSON.stringify(errors)}`
    );
  });

  // B14: description exactly 1024 chars — boundary value is valid (D-03)
  it("B14: description exactly 1024 characters is valid (boundary — D-03)", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", description: "x".repeat(1024), audience: "public" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.deepEqual(errors, []);
  });

  // B15: description 1025 chars — one over the limit reports a length error (D-03)
  it("B15: description 1025 characters reports a length error referencing 1024 (D-03)", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", description: "x".repeat(1025), audience: "public" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /1024/i.test(errors[0].message),
      `expected message to reference the 1024 limit, got: "${errors[0].message}"`
    );
  });

  // B16: description containing <example> tag — reports an XML-tags error (D-05)
  it("B16: description containing <example> reports an XML-tags error (D-05)", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "Use this skill to format <example> output",
        audience: "public",
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /xml|tag/i.test(errors[0].message),
      `expected XML-tags error, got: "${errors[0].message}"`
    );
  });

  // Phase-15 review WR-01: description gets the same non-string guard as
  // every other field — a truthy non-string must error (never silently pass)
  // and an adversarial toString/Symbol.toPrimitive object must never throw.
  it("WR-01: non-string truthy description (number / array) reports a 'must be a string' error", () => {
    for (const [bad, label] of [
      [123, "number"],
      [["a", "b"], "array"],
    ]) {
      const skill = {
        dirName: "my-skill",
        data: { name: "my-skill", description: bad, audience: "public" },
        body: VALID_BODY,
      };
      const errors = validateSkill(skill);
      assert.equal(
        errors.length,
        1,
        `expected 1 error for description: ${JSON.stringify(bad)}, got: ${JSON.stringify(errors)}`
      );
      assert.ok(
        new RegExp(`description must be a string \\(got ${label}\\)`).test(errors[0].message),
        `expected 'must be a string (got ${label})' error, got: "${errors[0].message}"`
      );
    }
  });

  it("WR-01: description with a throwing toString/Symbol.toPrimitive never throws; reports a 'must be a string' error", () => {
    const throwingValue = {
      toString() {
        throw new Error("boom");
      },
      [Symbol.toPrimitive]() {
        throw new Error("boom");
      },
    };
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", description: throwingValue, audience: "public" },
      body: VALID_BODY,
    };
    assert.doesNotThrow(() => validateSkill(skill));
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /description must be a string \(got object\)/.test(errors[0].message),
      `expected 'must be a string (got object)' error, got: "${errors[0].message}"`
    );
  });

  // B17: name exactly 64 chars, valid kebab — boundary value is valid (D-03)
  it("B17: name exactly 64 characters is valid (boundary — D-03)", () => {
    const name64 = "a".repeat(64);
    const skill = {
      dirName: name64,
      data: { name: name64, description: "use when X", audience: "public" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.deepEqual(errors, []);
  });

  // B18: cascade-stop proof for max-64 (REVIEW-06).
  //
  // The name "claude-" + "a"×58 is 65 chars, valid kebab, contains the reserved
  // substring "claude", and is given dirName "different-folder". If the max-64
  // check is a cascading else-if (correct), EXACTLY one error fires. If the
  // max-64 check is ever regressed to an independent `if`, the reserved and
  // folder checks also fire, producing 3 errors — this test catches that regression.
  it("B18: name 65-char with reserved+folder triggers — cascade stops at max-64 (REVIEW-06, D-03, D-13)", () => {
    const name65 = "claude-" + "a".repeat(58); // length 65; contains 'claude'; valid kebab
    const skill = {
      dirName: "different-folder", // would trigger folder-mismatch if cascade broke
      data: { name: name65, description: "use when X", audience: "public" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(
      errors.length,
      1,
      `cascade-stop proof: expected exactly 1 error (max-64), got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      /64/i.test(errors[0].message),
      `expected max-length error referencing 64, got: "${errors[0].message}"`
    );
    // Cascade stopped — reserved-word and folder checks must not have fired
    assert.ok(
      !errors.some((e) => /reserved/i.test(e.message)),
      "cascade must stop: no reserved-word error expected"
    );
    assert.ok(
      !errors.some((e) => /folder|equal/i.test(e.message)),
      "cascade must stop: no folder-mismatch error expected"
    );
  });

  // B19: description over-length AND contains XML — both errors reported independently (D-13)
  it("B19: description over-length AND containing XML tags reports 2 errors independently (D-13)", () => {
    // 1025 chars total, starts with <x> — trips both the length check and the XML check
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "<x>" + "y".repeat(1022),
        audience: "public",
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(
      errors.length,
      2,
      `expected exactly 2 description errors (length + XML), got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /1024/i.test(e.message)),
      `expected length error among: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => /xml|tag/i.test(e.message)),
      `expected XML-tags error among: ${JSON.stringify(errors)}`
    );
  });

  // B20: validateSkill must not throw for any non-string name (D-01 regression, REVIEW-01)
  //
  // Truthy non-strings (true, 123, [], {}): must return errors[] with a "name must be
  // a string" error and NOT throw. This guards the RESERVED.includes() call which
  // throws for booleans (name.includes is not a function).
  //
  // Falsy non-strings (false, 0, ""): covered by step 1 ("name is required").
  it("B20: validateSkill does not throw for truthy non-string names; returns non-string-name error (D-01, REVIEW-01)", () => {
    const base = { description: "use when X", audience: "public" };
    for (const name of [true, 123, [], {}]) {
      const skill = { dirName: "d", data: { ...base, name }, body: VALID_BODY };
      assert.doesNotThrow(
        () => validateSkill(skill),
        `must not throw for name: ${JSON.stringify(name)}`
      );
      const result = validateSkill(skill);
      assert.ok(Array.isArray(result), `result must be an array for name ${JSON.stringify(name)}`);
      assert.ok(
        result.length > 0,
        `must return at least one error for name ${JSON.stringify(name)}`
      );
      assert.ok(
        result.some((e) => /string/i.test(e.message)),
        `error must mention "string" for name ${JSON.stringify(name)}: ${JSON.stringify(result)}`
      );
    }
    // false falls into step 1 (falsy → "name is required"), not the type guard
    const falseResult = validateSkill({ dirName: "d", data: { ...base, name: false }, body: VALID_BODY });
    assert.ok(
      falseResult.some((e) => /required/i.test(e.message)),
      `name: false must produce "name is required", got: ${JSON.stringify(falseResult)}`
    );
  });

  // NAME_KEBAB export — letter-start kebab regex (D-08, D-16)
  it("NAME_KEBAB is exported and is the letter-start kebab regex (D-08, D-16)", () => {
    assert.ok(NAME_KEBAB instanceof RegExp, "NAME_KEBAB should be a RegExp");
    // Valid cases
    assert.ok(NAME_KEBAB.test("my-skill"), "'my-skill' is valid");
    assert.ok(NAME_KEBAB.test("abc"), "'abc' is valid");
    assert.ok(NAME_KEBAB.test("a1"), "'a1' is valid");
    assert.ok(NAME_KEBAB.test("abc-def-123"), "'abc-def-123' is valid");
    // Invalid: leading digit (D-08 regression guard)
    assert.ok(!NAME_KEBAB.test("0bad"), "'0bad' is invalid (leading digit)");
    assert.ok(!NAME_KEBAB.test("1abc"), "'1abc' is invalid (leading digit)");
    // Invalid: uppercase or underscore
    assert.ok(!NAME_KEBAB.test("My_Skill"), "'My_Skill' is invalid");
    assert.ok(!NAME_KEBAB.test("MySkill"), "'MySkill' is invalid");
    // Invalid: structural issues
    assert.ok(!NAME_KEBAB.test("my--skill"), "'my--skill' is invalid (double dash)");
    assert.ok(!NAME_KEBAB.test("-bad"), "'-bad' is invalid (leading dash)");
    assert.ok(!NAME_KEBAB.test("bad-"), "'bad-' is invalid (trailing dash)");
    assert.ok(!NAME_KEBAB.test(""), "empty string is invalid");
  });
});

describe("validateSkill — role spine (D-01, D-02, D-05, D-08)", () => {
  const baseData = { name: "my-skill", description: "use when X", audience: "public" };

  it("a body with an empty <role></role> section reports the distinct empty-role error and NOT the missing-role error (D-08)", () => {
    const skill = {
      dirName: "my-skill",
      data: baseData,
      body: "# My Skill\n\n<role>\n</role>\n",
    };
    const errors = validateSkill(skill);
    assert.ok(
      errors.some((e) => e.message.includes("section must not be empty")),
      `expected empty-role error, got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      !errors.some((e) => e.message.startsWith("body must contain <")),
      `missing-role error must NOT also fire (D-08), got: ${JSON.stringify(errors)}`
    );
  });

  it("a one-line role with same-line trailing content reports NO false empty-section error (A2, review WR-01)", () => {
    const skill = {
      dirName: "my-skill",
      data: baseData,
      body: "# My Skill\n\n<role> You are a helper.\n</role>\n",
    };
    assert.deepEqual(validateSkill(skill), []);
  });

  it("a body carrying only the legacy **Role:** bold-line convention (no <role> tag) reports the missing-role error — the legacy line is inert (D-01/D-02 hard break)", () => {
    const skill = {
      dirName: "my-skill",
      data: baseData,
      body: "# My Skill\n\n**Role:** You are a helper.\n",
    };
    const errors = validateSkill(skill);
    assert.ok(
      errors.some((e) => e.message.startsWith("body must contain <")),
      `expected missing-role error, got: ${JSON.stringify(errors)}`
    );
  });

  it("validateSkill never throws for a null/non-string body and still reports the missing-role error (D-01 never-throw)", () => {
    for (const bad of [null, undefined, 123, {}, []]) {
      const skill = { dirName: "my-skill", data: baseData, body: bad };
      assert.doesNotThrow(
        () => validateSkill(skill),
        `must not throw for body: ${JSON.stringify(bad)}`
      );
      const errors = validateSkill(skill);
      assert.ok(Array.isArray(errors), `result must be an array for body ${JSON.stringify(bad)}`);
      assert.ok(
        errors.some((e) => e.message.startsWith("body must contain <")),
        `expected missing-role error for body ${JSON.stringify(bad)}, got: ${JSON.stringify(errors)}`
      );
    }
  });

  // Review CR-01 (never-throw D-01): the pre-phase-18 documented registry
  // shape { SECTIONS, TEMPLATES } (no BASE_SPINE key) is a public injection
  // seam — it must degrade to the real spine, never crash the spine loop.
  it("validateSkill never throws for a pre-18 registry shape without BASE_SPINE and still reports the missing-role error (D-01, review CR-01)", () => {
    const skill = {
      dirName: "my-skill",
      data: baseData,
      body: "# My Skill\n\nNo role section here.\n",
    };
    const oldShapeRegistry = { SECTIONS: {}, TEMPLATES: {} };
    assert.doesNotThrow(() => validateSkill(skill, new Set(), oldShapeRegistry));
    const errors = validateSkill(skill, new Set(), oldShapeRegistry);
    assert.ok(
      errors.some((e) => e.message.startsWith("body must contain <role>")),
      `expected missing-role error via the default spine, got: ${JSON.stringify(errors)}`
    );
    // Belt-and-braces: a present-but-non-array BASE_SPINE also falls back
    // to the real spine instead of throwing.
    const nonArraySpine = { SECTIONS: {}, TEMPLATES: {}, BASE_SPINE: "role" };
    assert.doesNotThrow(() => validateSkill(skill, new Set(), nonArraySpine));
    assert.ok(
      validateSkill(skill, new Set(), nonArraySpine).some((e) =>
        e.message.startsWith("body must contain <role>")
      ),
      "non-array BASE_SPINE must fall back to the real spine"
    );
  });
});

describe("hasClosedSection", () => {
  // Line-anchored open + close tags, each on their own line -> true
  it("returns true for a matched, line-anchored <process>...</process> pair", () => {
    assert.equal(hasClosedSection("# t\n<process>\nx\n</process>\n", "process"), true);
  });

  // Unclosed tag -> false (matched pair required, D-07)
  it("returns false when the open tag has no matching close tag", () => {
    assert.equal(hasClosedSection("# t\n<process>\nx\n", "process"), false);
  });

  // Both tags fenced -> excluded (TMPL-03 / roadmap SC3)
  it("returns false when both tags appear only inside a fenced code block", () => {
    const body = "# t\n```\n<process>\nx\n</process>\n```\n";
    assert.equal(hasClosedSection(body, "process"), false);
  });

  // One tag fenced, the other real and unfenced -> both must be present outside fences
  it("returns false when the open tag is fenced but the close tag is unfenced", () => {
    const body = "# t\n```\n<process>\n```\nx\n</process>\n";
    assert.equal(hasClosedSection(body, "process"), false);
  });

  it("returns false when the close tag is fenced but the open tag is unfenced", () => {
    const body = "# t\n<process>\nx\n```\n</process>\n```\n";
    assert.equal(hasClosedSection(body, "process"), false);
  });

  // Mid-sentence mention is not a line-start open tag
  it("does not treat a mid-sentence tag mention as an open tag", () => {
    const body = "# t\nthe <process> tag is described here\n</process>\n";
    assert.equal(hasClosedSection(body, "process"), false);
  });

  // Tilde fences toggle fence state identically to backtick fences
  it("treats ~~~ tilde fences the same as backtick fences", () => {
    const body = "# t\n~~~\n<process>\nx\n</process>\n~~~\n";
    assert.equal(hasClosedSection(body, "process"), false);
  });

  // Trailing same-line content after the open tag still counts (Assumption A2)
  it("still counts an open tag with trailing same-line content", () => {
    const body = "# t\n<process> notes\nx\n</process>\n";
    assert.equal(hasClosedSection(body, "process"), true);
  });

  // Empty/undefined body -> false, never throws (D-01)
  it("returns false without throwing for an undefined or empty body", () => {
    assert.doesNotThrow(() => hasClosedSection(undefined, "process"));
    assert.equal(hasClosedSection(undefined, "process"), false);
    assert.equal(hasClosedSection("", "process"), false);
  });

  // Mixed backtick and tilde fences: a stray ~~~ content line inside an open
  // backtick fence must not be mistaken for a fence boundary of its own —
  // the tags stay excluded until a matching backtick fence actually closes
  // it (WR-02)
  it("returns false for tags inside a backtick fence containing an unrelated tilde marker line (mixed backtick and tilde fences)", () => {
    const body = "# t\n```\n~~~\n<process>\nx\n</process>\n```\n";
    assert.equal(hasClosedSection(body, "process"), false);
  });

  // Reversed tag order: close tag appears before the open tag -> not a
  // matched pair, even though both are present and unfenced (WR-01)
  it("returns false when the close tag precedes the open tag", () => {
    const body = "# t\n</process>\nx\n<process>\n";
    assert.equal(hasClosedSection(body, "process"), false);
  });
});

describe("hasNonEmptyClosedSection", () => {
  // Matched, closed, non-whitespace content between the tags -> true
  it("returns true for a matched, closed <role>...</role> pair with non-empty content", () => {
    const body = "# t\n<role>\nYou are a helper.\n</role>\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), true);
  });

  // Closed but whitespace-only content -> false (D-05)
  it("returns false when the section is closed but the enclosed content is whitespace-only", () => {
    const body = "# t\n<role>\n   \n\t\n</role>\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), false);
  });

  // Closed but empty (no lines at all between tags) -> false
  it("returns false when the section is closed with nothing between the tags", () => {
    const body = "# t\n<role>\n</role>\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), false);
  });

  // Only content between the tags is inside a fenced code block -> excluded,
  // consistent with hasClosedSection's fence-aware scan
  it("returns false when the only content between the tags is inside a fenced code block", () => {
    const body = "# t\n<role>\n```\nnot real content\n```\n</role>\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), false);
  });

  // Unclosed section -> false (delegates to hasClosedSection first)
  it("returns false when the section is not closed at all", () => {
    const body = "# t\n<role>\nYou are a helper.\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), false);
  });

  // Missing section entirely -> false
  it("returns false when the section is entirely missing", () => {
    const body = "# t\nJust some prose.\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), false);
  });

  // Same-line trailing content after the open tag counts as content —
  // Assumption A2 parity with hasClosedSection (review WR-01): content that
  // counts for presence must count for emptiness too.
  it("returns true when the only content is same-line trailing text after the open tag (A2, review WR-01)", () => {
    const body = "# T\n<role> You are a helper.\n</role>\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), true);
  });

  // Whitespace-only trailing text on the open line is still empty (D-05)
  it("returns false when the open tag's trailing text is whitespace-only and nothing sits between the tags", () => {
    const body = "# T\n<role>   \n</role>\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), false);
  });

  // Trailing text after the CLOSE tag is outside the section — it must not
  // rescue an otherwise-empty section.
  it("returns false when the only trailing text follows the close tag", () => {
    const body = "# T\n<role>\n</role> not section content\n";
    assert.equal(hasNonEmptyClosedSection(body, "role"), false);
  });

  // Never-throw boundary: malformed/adversarial body inputs must return a
  // boolean, never throw (D-01 never-throw invariant)
  it("returns a boolean and never throws for adversarial malformed body input", () => {
    const adversarialBodies = [null, undefined, 123, {}, []];
    for (const body of adversarialBodies) {
      assert.doesNotThrow(() => hasNonEmptyClosedSection(body, "role"));
      assert.equal(typeof hasNonEmptyClosedSection(body, "role"), "boolean");
      assert.equal(hasNonEmptyClosedSection(body, "role"), false);
    }
  });
});

describe("validateSkill — template cascade (TMPL-01, TMPL-04, TMPL-05)", () => {
  const PROCEDURE_BODY_MISSING_SUCCESS =
    "# My Skill\n\n<role>\nhelper.\n</role>\n\n<process>\ndo it\n</process>\n";
  const PROCEDURE_BODY_VALID =
    "# My Skill\n\n<role>\nhelper.\n</role>\n\n<process>\ndo it\n</process>\n\n<success_criteria>\ndone\n</success_criteria>\n";

  // template: procedure missing <success_criteria> -> one named error quoting SECTIONS description
  it("template: procedure missing <success_criteria> reports one named error with the SECTIONS description (D-07)", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        template: "procedure",
      },
      body: PROCEDURE_BODY_MISSING_SUCCESS,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      errors[0].message.includes('template "procedure" requires'),
      `expected template-requires message, got: "${errors[0].message}"`
    );
    assert.ok(
      errors[0].message.includes("Checkable conditions that define done."),
      `expected SECTIONS description quoted, got: "${errors[0].message}"`
    );
  });

  // template: procedure with both required sections + valid base spine -> zero errors
  it("template: procedure with both required sections and a valid spine returns zero errors", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        template: "procedure",
      },
      body: PROCEDURE_BODY_VALID,
    };
    assert.deepEqual(validateSkill(skill), []);
  });

  // unknown template -> one error, sorted names, cascade stops (no section errors)
  it('template: "standard" (unknown) reports one error with sorted available names, no section errors (TMPL-04)', () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        template: "standard",
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /unknown template "standard" \(available: procedure\)/.test(errors[0].message),
      `expected unknown-template message, got: "${errors[0].message}"`
    );
  });

  // non-string template values -> error, cascade stops
  it("template: number/array/object reports a 'must be a string' error and stops the cascade", () => {
    for (const [tpl, typeLabel] of [
      [123, "number"],
      [["procedure"], "object"],
      [{ x: 1 }, "object"],
    ]) {
      const skill = {
        dirName: "my-skill",
        data: {
          name: "my-skill",
          description: "use when X",
          audience: "public",
          template: tpl,
        },
        body: VALID_BODY,
      };
      const errors = validateSkill(skill);
      assert.equal(
        errors.length,
        1,
        `expected 1 error for template ${JSON.stringify(tpl)}, got: ${JSON.stringify(errors)}`
      );
      assert.ok(
        errors[0].message.includes(`template must be a string (got ${typeLabel})`),
        `expected string-type error for ${typeLabel}, got: "${errors[0].message}"`
      );
    }
  });

  // empty-string template -> treated as unknown, never silently skipped (D-07)
  it('template: "" (empty string, key present) is treated as unknown, never silently skipped (D-07)', () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        template: "",
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /unknown template ""/.test(errors[0].message),
      `expected unknown-template error for empty string, got: "${errors[0].message}"`
    );
  });

  // template: null (YAML null, key present) -> non-string branch, never throws (D-01)
  it("template: null (key present) reports the non-string error and never throws (D-01)", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        template: null,
      },
      body: VALID_BODY,
    };
    assert.doesNotThrow(() => validateSkill(skill));
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      errors[0].message.includes("template must be a string (got object)"),
      `expected non-string error, got: "${errors[0].message}"`
    );
  });

  // throwing toString/Symbol.toPrimitive -> typeof guard short-circuits before coercion
  it("template: object with a throwing toString/Symbol.toPrimitive never throws; returns an error (T-14-03)", () => {
    const throwingTpl = {
      toString() {
        throw new Error("boom");
      },
      [Symbol.toPrimitive]() {
        throw new Error("boom");
      },
    };
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        template: throwingTpl,
      },
      body: VALID_BODY,
    };
    assert.doesNotThrow(() => validateSkill(skill));
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      errors[0].message.includes("template must be a string (got object)"),
      `expected non-string error, got: "${errors[0].message}"`
    );
  });

  // TMPL-05 regression: no template key -> identical errors to v0.0.4
  it("TMPL-05 regression: a skill with no template key returns the same errors as v0.0.4 (valid skill -> [])", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", description: "use when X", audience: "public" },
      body: VALID_BODY,
    };
    assert.deepEqual(validateSkill(skill), []);
  });

  it("TMPL-05 regression: a skill with no template key and an invalid body returns the same base-spine errors as v0.0.4", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", description: "use when X", audience: "public" },
      body: "no title\nno role\n",
    };
    const errors = validateSkill(skill);
    assert.equal(
      errors.length,
      2,
      `expected exactly 2 errors (Title + Role), got: ${JSON.stringify(errors)}`
    );
    assert.ok(errors.some((e) => /title|H1/i.test(e.message)));
    assert.ok(errors.some((e) => /role/i.test(e.message)));
  });

  // waives via injected fixture: fixture template waiving "role" suppresses the Role error;
  // the real registry's "procedure" template waives nothing.
  const FIXTURE_TEMPLATES = {
    SECTIONS: { process: "steps" },
    TEMPLATES: {
      "no-role-needed": { requiredSections: ["process"], waives: ["role"] },
    },
    BASE_SPINE: ["role"],
  };

  it("waives: a fixture template waiving 'role' suppresses the Role error for a role-less body", () => {
    const skill = {
      dirName: "x",
      data: { name: "x", description: "d", audience: "public", template: "no-role-needed" },
      body: "# Title\n\n<process>\ndo it\n</process>\n",
    };
    assert.deepEqual(validateSkill(skill, new Set(), FIXTURE_TEMPLATES), []);
  });

  it("waives: procedure (real registry) waives nothing — a role-less body still errors", () => {
    const skill = {
      dirName: "my-skill",
      data: { name: "my-skill", description: "use when X", audience: "public", template: "procedure" },
      body: "# My Skill\n\n<process>\ndo it\n</process>\n\n<success_criteria>\ndone\n</success_criteria>\n",
    };
    const errors = validateSkill(skill);
    assert.ok(
      errors.some((e) => /role/i.test(e.message)),
      `expected Role error since procedure does not waive it, got: ${JSON.stringify(errors)}`
    );
  });
});

// ── Phase 15: outputs / dependencies / allowed-tools (VAL-01..06) ──────────
// Adversarial + happy-path coverage for the three new optional frontmatter
// fields. Every field gets at least one throwing-toString/Symbol.toPrimitive
// adversarial case (T-14-03 precedent, VAL-06).

describe("validateSkill — outputs (VAL-01, lexical)", () => {
  const baseData = { name: "my-skill", description: "use when X", audience: "public" };

  it("outputs: {} is a valid no-op — zero errors", () => {
    const skill = { dirName: "my-skill", data: { ...baseData, outputs: {} }, body: VALID_BODY };
    assert.deepEqual(validateSkill(skill), []);
  });

  it("outputs: null / string / array all report one 'must be a map' error and never throw", () => {
    for (const bad of [null, "x", [1, 2, 3]]) {
      const skill = {
        dirName: "my-skill",
        data: { ...baseData, outputs: bad },
        body: VALID_BODY,
      };
      assert.doesNotThrow(
        () => validateSkill(skill),
        `must not throw for outputs: ${JSON.stringify(bad)}`
      );
      const errors = validateSkill(skill);
      assert.equal(
        errors.length,
        1,
        `expected 1 error for outputs: ${JSON.stringify(bad)}, got: ${JSON.stringify(errors)}`
      );
      assert.ok(
        /must be a map/.test(errors[0].message),
        `expected 'must be a map' error, got: "${errors[0].message}"`
      );
    }
  });

  it("an entry with an absolute path value reports an 'unsafe' error", () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, outputs: { doc: "/etc/passwd" } },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /unsafe/.test(errors[0].message),
      `expected unsafe error, got: "${errors[0].message}"`
    );
  });

  it("an entry with a '../escape' traversal value reports an 'unsafe' error", () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, outputs: { doc: "../escape/secret.md" } },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /unsafe/.test(errors[0].message),
      `expected unsafe error, got: "${errors[0].message}"`
    );
  });

  it("an entry with a non-string/empty value reports a 'must be a non-empty string path' error", () => {
    for (const bad of [123, "", null, {}]) {
      const skill = {
        dirName: "my-skill",
        data: { ...baseData, outputs: { doc: bad } },
        body: VALID_BODY,
      };
      const errors = validateSkill(skill);
      assert.equal(
        errors.length,
        1,
        `expected 1 error for outputs.doc: ${JSON.stringify(bad)}, got: ${JSON.stringify(errors)}`
      );
      assert.ok(
        /must be a non-empty string path/.test(errors[0].message),
        `expected non-empty-string-path error, got: "${errors[0].message}"`
      );
    }
  });

  it("an entry value with a throwing toString/Symbol.toPrimitive never throws; returns an error", () => {
    const throwingValue = {
      toString() {
        throw new Error("boom");
      },
      [Symbol.toPrimitive]() {
        throw new Error("boom");
      },
    };
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, outputs: { doc: throwingValue } },
      body: VALID_BODY,
    };
    assert.doesNotThrow(() => validateSkill(skill));
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /must be a non-empty string path/.test(errors[0].message),
      `expected non-empty-string-path error, got: "${errors[0].message}"`
    );
  });

  // Phase-15 review CR-01 regression: the predicate is root-independent —
  // it takes no base-directory argument, so its verdict cannot depend on
  // process.cwd(). A `..`-re-entry path that would lexically land back inside
  // a directory of the same name MUST still be rejected.
  it("CR-01: '..'-re-entry paths are rejected regardless of cwd (root-independent predicate)", () => {
    // These used to flip verdict depending on which root they were resolved
    // against — now they are always unsafe.
    assert.equal(isOutputPathLexicallySafe("../my-skill/notes.txt"), false);
    assert.equal(isOutputPathLexicallySafe("../../motto/my-skill/notes.txt"), false);
    assert.equal(isOutputPathLexicallySafe(".."), false);
    assert.equal(isOutputPathLexicallySafe("a/../../x"), false); // interior traversal collapses to ../x
    // Plain relative paths (including ./-prefixed and interior-normalizing) stay safe.
    assert.equal(isOutputPathLexicallySafe("notes.txt"), true);
    assert.equal(isOutputPathLexicallySafe("./sub/notes.txt"), true);
    assert.equal(isOutputPathLexicallySafe("sub/../notes.txt"), true); // normalizes to notes.txt
    // Guards unchanged: non-string / empty / absolute are unsafe.
    assert.equal(isOutputPathLexicallySafe(""), false);
    assert.equal(isOutputPathLexicallySafe(42), false);
    assert.equal(isOutputPathLexicallySafe("/etc/passwd"), false);
  });

  it("CR-01: validateSkill reports '..'-re-entry outputs as unsafe (was a cwd-dependent bypass)", () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, outputs: { doc: "../my-skill/notes.txt" } },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /unsafe/.test(errors[0].message),
      `expected unsafe error, got: "${errors[0].message}"`
    );
  });
});

describe("validateSkill — dependencies (VAL-02/03/04)", () => {
  const baseData = { name: "my-skill", description: "use when X", audience: "public" };

  it("dependencies: [] is a valid no-op — zero errors", () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, dependencies: [] },
      body: VALID_BODY,
    };
    assert.deepEqual(validateSkill(skill), []);
  });

  it('dependencies: "nope" (non-array) reports a \'must be an array\' error', () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, dependencies: "nope" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /must be an array/.test(errors[0].message),
      `expected array-type error, got: "${errors[0].message}"`
    );
  });

  it("a bare entry equal to dirName reports the SPECIFIC self-dependency error (Pitfall 2)", () => {
    const skillNames = new Set(["my-skill", "other-skill"]);
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, dependencies: ["my-skill"] },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill, new Set(), undefined, skillNames, new Map());
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /is a self-dependency/.test(errors[0].message) &&
        errors[0].message.includes('"my-skill"'),
      `expected specific self-dependency error, got: "${errors[0].message}"`
    );
  });

  it("a bare entry not present in skillNames reports 'not found (available: ...)' with sorted names", () => {
    const skillNames = new Set(["zeta-skill", "alpha-skill"]);
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, dependencies: ["ghost-skill"] },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill, new Set(), undefined, skillNames, new Map());
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      errors[0].message.includes(
        'dependency "ghost-skill" not found (available: alpha-skill, zeta-skill)'
      ),
      `expected sorted not-found error, got: "${errors[0].message}"`
    );
  });

  it("a bare entry present in skillNames — public skill depending on a private target reports the audience-direction error", () => {
    const skillNames = new Set(["my-skill", "private-dep"]);
    const audienceMap = new Map([["private-dep", "private"]]);
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, audience: "public", dependencies: ["private-dep"] },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill, new Set(), undefined, skillNames, audienceMap);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /audience-direction guard/.test(errors[0].message),
      `expected audience-direction error, got: "${errors[0].message}"`
    );
  });

  it("private->private, private->public, public->public all pass with zero dependency errors", () => {
    const skillNames = new Set(["my-skill", "dep-a"]);
    const cases = [
      { audience: "private", depAudience: "private" },
      { audience: "private", depAudience: "public" },
      { audience: "public", depAudience: "public" },
    ];
    for (const { audience, depAudience } of cases) {
      const audienceMap = new Map([["dep-a", depAudience]]);
      const skill = {
        dirName: "my-skill",
        data: { ...baseData, audience, dependencies: ["dep-a"] },
        body: VALID_BODY,
      };
      const errors = validateSkill(skill, new Set(), undefined, skillNames, audienceMap);
      assert.deepEqual(
        errors,
        [],
        `expected zero errors for ${audience} -> ${depAudience}, got: ${JSON.stringify(errors)}`
      );
    }
  });

  it("namespaced 'good-plugin:good-skill' passes; malformed namespaced forms fail format check; namespaced entries are exempt from resolution/audience guard", () => {
    // Deliberately empty/irrelevant — proves namespaced entries never consult
    // skillNames/audienceMap (they would fail resolution/audience checks if
    // they were consulted).
    const skillNames = new Set(["my-skill"]);
    const audienceMap = new Map();

    const goodSkill = {
      dirName: "my-skill",
      data: { ...baseData, dependencies: ["good-plugin:good-skill"] },
      body: VALID_BODY,
    };
    assert.deepEqual(
      validateSkill(goodSkill, new Set(), undefined, skillNames, audienceMap),
      []
    );

    for (const bad of ["Foo:bar", "a::b", ":x", "x:"]) {
      const skill = {
        dirName: "my-skill",
        data: { ...baseData, dependencies: [bad] },
        body: VALID_BODY,
      };
      const errors = validateSkill(skill, new Set(), undefined, skillNames, audienceMap);
      assert.equal(
        errors.length,
        1,
        `expected 1 error for "${bad}", got: ${JSON.stringify(errors)}`
      );
      assert.ok(
        /not valid "plugin:skill" format/.test(errors[0].message),
        `expected format error for "${bad}", got: "${errors[0].message}"`
      );
    }
  });

  it("an entry that is a throwing-toString object never throws; returns an error", () => {
    const throwingEntry = {
      toString() {
        throw new Error("boom");
      },
      [Symbol.toPrimitive]() {
        throw new Error("boom");
      },
    };
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, dependencies: [throwingEntry] },
      body: VALID_BODY,
    };
    assert.doesNotThrow(() => validateSkill(skill));
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /must be a non-empty string/.test(errors[0].message),
      `expected non-empty-string error, got: "${errors[0].message}"`
    );
  });
});

describe("validateSkill — allowed-tools (VAL-05)", () => {
  const baseData = { name: "my-skill", description: "use when X", audience: "public" };

  it("a non-empty string, including a parenthesized rule like Bash(git add *), passes with zero errors", () => {
    for (const val of ["Read", "Bash(git add *)"]) {
      const skill = {
        dirName: "my-skill",
        data: { ...baseData, "allowed-tools": val },
        body: VALID_BODY,
      };
      assert.deepEqual(validateSkill(skill), [], `expected zero errors for "${val}"`);
    }
  });

  it("an empty string reports an error", () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, "allowed-tools": "" },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      /allowed-tools/.test(errors[0].message) && /empty/.test(errors[0].message),
      `expected empty-string error, got: "${errors[0].message}"`
    );
  });

  it("[] (empty array) passes with zero errors", () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, "allowed-tools": [] },
      body: VALID_BODY,
    };
    assert.deepEqual(validateSkill(skill), []);
  });

  it('["Read", "Bash(git add *)", "mcp__github__*"] passes with zero errors', () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, "allowed-tools": ["Read", "Bash(git add *)", "mcp__github__*"] },
      body: VALID_BODY,
    };
    assert.deepEqual(validateSkill(skill), []);
  });

  it("an array with a non-string/empty entry reports an indexed error", () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, "allowed-tools": ["Read", "", 5] },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 2, `expected 2 errors, got: ${JSON.stringify(errors)}`);
    assert.ok(
      errors.some((e) => e.message.includes("allowed-tools[1]")),
      `expected an indexed error for index 1, got: ${JSON.stringify(errors)}`
    );
    assert.ok(
      errors.some((e) => e.message.includes("allowed-tools[2]")),
      `expected an indexed error for index 2, got: ${JSON.stringify(errors)}`
    );
  });

  // Phase-15 review WR-03: the Empty-field policy must apply identically to
  // both shapes — a whitespace-only SCALAR already errored, but a
  // whitespace-only ARRAY ENTRY passed because the array branch checked
  // `entry === ""` without trim().
  it('WR-03: a whitespace-only array entry ["   "] reports an indexed error (same trim() policy as the scalar branch)', () => {
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, "allowed-tools": ["   "] },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      errors[0].message.includes("allowed-tools[0]"),
      `expected an indexed error for index 0, got: "${errors[0].message}"`
    );
  });

  it("a non-string/non-array value (number, object, null) reports a 'must be a string or array' error and never throws", () => {
    for (const bad of [5, {}, null]) {
      const skill = {
        dirName: "my-skill",
        data: { ...baseData, "allowed-tools": bad },
        body: VALID_BODY,
      };
      assert.doesNotThrow(
        () => validateSkill(skill),
        `must not throw for allowed-tools: ${JSON.stringify(bad)}`
      );
      const errors = validateSkill(skill);
      assert.equal(
        errors.length,
        1,
        `expected 1 error for allowed-tools: ${JSON.stringify(bad)}, got: ${JSON.stringify(errors)}`
      );
      assert.ok(
        /must be a string or array/.test(errors[0].message),
        `expected string-or-array error, got: "${errors[0].message}"`
      );
    }
  });

  it("an array entry with a throwing toString/Symbol.toPrimitive never throws; returns an indexed error", () => {
    const throwingEntry = {
      toString() {
        throw new Error("boom");
      },
      [Symbol.toPrimitive]() {
        throw new Error("boom");
      },
    };
    const skill = {
      dirName: "my-skill",
      data: { ...baseData, "allowed-tools": [throwingEntry] },
      body: VALID_BODY,
    };
    assert.doesNotThrow(() => validateSkill(skill));
    const errors = validateSkill(skill);
    assert.equal(errors.length, 1, `expected 1 error, got: ${JSON.stringify(errors)}`);
    assert.ok(
      errors[0].message.includes("allowed-tools[0]"),
      `expected indexed error, got: "${errors[0].message}"`
    );
  });
});
