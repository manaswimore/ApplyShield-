const { test } = require("node:test");
const assert = require("node:assert/strict");
const { analyze } = require("../shared/scoring");

test("detects upfront fee and guaranteed selection", () => {
  const result = analyze("Pay ₹999 as registration fee. Guaranteed selection.");
  assert.ok(result.findings.some(f => f.ruleId === "UPFRONT_PAYMENT"));
  assert.ok(result.findings.some(f => f.ruleId === "GUARANTEED_SELECTION"));
  assert.ok(result.riskScore > 0);
});

test("does not invent a warning for neutral text", () => {
  const result = analyze("The role includes frontend development, mentorship, and a technical interview.");
  assert.equal(result.findings.length, 0);
  assert.equal(result.riskLevel, "LOW");
});