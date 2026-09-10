import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBinding } from "./route-table.js";

test("resolveBinding(): a real document-generators path resolves to DOCUMENT_GENERATORS", () => {
  assert.equal(resolveBinding("/api/proposals/generate"), "DOCUMENT_GENERATORS");
  assert.equal(resolveBinding("/api/lien-waivers/abc123/download"), "DOCUMENT_GENERATORS");
});

test("resolveBinding(): a route no module owns yet falls back to null (ORIGIN)", () => {
  assert.equal(resolveBinding("/api/access/requests"), null);
  assert.equal(resolveBinding("/"), null);
});

test("resolveBinding(): prefix matching doesn't false-positive on a similar-looking unrelated path", () => {
  assert.equal(resolveBinding("/api/proposals-list"), null);
});
