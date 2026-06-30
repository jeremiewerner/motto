import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateSkill, NAME_KEBAB } from "../src/schema.js";

// validateSkill(skill, sharedRefs?) -> Array<{ skill: string, message: string }>
// - Never throws (D-01).
// - Name checks CASCADE (D-13): missing -> non-kebab -> reserved-word -> !=folder.
//   The chain stops at the first name failure; downstream name checks are skipped.
// - All other checks (description, audience, body Title, body Role, each
//   shared_references entry) are INDEPENDENT and collected together (D-13).

const VALID_BODY = "# My Skill\n\n**Role:** You are a helper.\n\nDo things.\n";

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
      body: "# Title\n\n**Role:** helper.\n",
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
      body: "# Title\n\n**Role:** helper.\n",
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
      body: "# Title\n\n**Role:** helper.\n",
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
      body: "# Title\n\n**Role:** helper.\n",
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

  // B13: template and dependencies keys are IGNORED (D-14)
  it("B13: template and dependencies keys in data cause no errors (D-14)", () => {
    const skill = {
      dirName: "my-skill",
      data: {
        name: "my-skill",
        description: "use when X",
        audience: "public",
        template: "standard",
        dependencies: ["some-dep"],
      },
      body: VALID_BODY,
    };
    const errors = validateSkill(skill);
    assert.deepEqual(errors, []);
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
