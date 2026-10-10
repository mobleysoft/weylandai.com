import test from "node:test";
import assert from "node:assert/strict";
import { auditHeldCitations, variantPasses } from "./coverage.mjs";

const held = { catalog: "99-EO-F", mfr: "VON", held: true };
const section = { type: "cut_sheet", manufacturer: "Von Duprin", model: "99-EO-F", page: 17, pages: 1 };

test("an exact maker, model, and embedded page proves a held-item citation", () => {
  assert.deepEqual(auditHeldCitations([held], [section]), { heldTotal: 1, citedCount: 1, missing: [] });
});

test("aggregate packet totals do not prove an item citation", () => {
  assert.equal(auditHeldCitations([held], []).citedCount, 0);
  assert.equal(auditHeldCitations([{ ...held, catalog: "" }], [section]).citedCount, 0);
});

test("a wrong manufacturer does not prove an item citation", () => {
  assert.equal(auditHeldCitations([held], [{ ...section, manufacturer: "Schlage" }]).citedCount, 0);
});

test("a different model does not prove an item citation", () => {
  assert.equal(auditHeldCitations([held], [{ ...section, model: "99-EO" }]).citedCount, 0);
});

test("a cut-sheet section without a valid embedded page does not prove a citation", () => {
  assert.equal(auditHeldCitations([held], [{ ...section, page: null }]).citedCount, 0);
  assert.equal(auditHeldCitations([held], [{ ...section, type: "cut_sheet_misses" }]).citedCount, 0);
});

test("not-held and by-others lines are outside the held-item citation count", () => {
  const items = [held, { catalog: "90S", mfr: "GLY", held: false }, { catalog: "BY DIVISION 28", mfr: "B/O", held: false }];
  assert.equal(auditHeldCitations(items, [section]).heldTotal, 1);
});

test("the grade gate requires all checks, no errors, and successful cleanup", () => {
  const passing = { checks: [{ pass: true }, { pass: true }], errors: [], cleanup: "deleted" };
  assert.equal(variantPasses(passing), true);
  assert.equal(variantPasses({ ...passing, checks: [{ pass: false }] }), false);
  assert.equal(variantPasses({ ...passing, errors: ["upload failed"] }), false);
  assert.equal(variantPasses({ ...passing, cleanup: "HTTP 500" }), false);
  assert.equal(variantPasses({ ...passing, checks: [] }), false);
});
