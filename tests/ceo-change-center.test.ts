import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChangeCenterPlan,
  inferChangeCenterRisk,
} from "../lib/ceo/change-center";

test("infers critical risk for schema and auth changes", () => {
  assert.equal(
    inferChangeCenterRisk("Update Supabase schema and login permissions"),
    "critical",
  );
});

test("builds a structured plan from a request", () => {
  const plan = buildChangeCenterPlan("Add a new system change page and review flow");

  assert.equal(plan.riskLevel, "low");
  assert.ok(plan.title.length > 0);
  assert.ok(plan.summary.length > 0);
  assert.ok(plan.steps.length >= 4);
  assert.ok(plan.assumptions.length >= 3);
});
