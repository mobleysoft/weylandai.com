import { test } from "node:test";
import assert from "node:assert/strict";
import { detectAndPersistRegionConflicts } from "./region-conflicts.js";

function makeFakeDb(candidates) {
  const batched = [];
  return {
    batched,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return { sql, binds: stmt.binds }; },
      };
      return stmt;
    },
    async batch(stmts) { batched.push(...stmts); return stmts.map(() => ({ success: true })); },
  };
}

function withResults(db, results) {
  const origPrepare = db.prepare.bind(db);
  db.prepare = (sql) => {
    if (sql.includes("SELECT id, page_number")) {
      return { bind: () => ({ all: async () => ({ results }) }) };
    }
    return origPrepare(sql);
  };
  return db;
}

test("no candidates: real no-op, zero conflicts, no D1 batch write", async () => {
  const db = withResults(makeFakeDb(), []);
  const result = await detectAndPersistRegionConflicts("s1", { DB: db });
  assert.equal(result.total, 0);
  assert.equal(result.conflict_count, 0);
  assert.equal(db.batched.length, 0);
});

test("two overlapping regions of different types on the same page: real conflict detection", async () => {
  const box = (x) => JSON.stringify({ x_percent: x, y_percent: 0, width_percent: 30, height_percent: 30 });
  const candidates = [
    { id: "c1", page_number: 1, schedule_type: "door", bounding_box_percent: box(10), status: "pending", created_at: "2026-01-01" },
    { id: "c2", page_number: 1, schedule_type: "frame", bounding_box_percent: box(15), status: "pending", created_at: "2026-01-02" },
  ];
  const db = withResults(makeFakeDb(), candidates);
  const result = await detectAndPersistRegionConflicts("s1", { DB: db });
  assert.equal(result.conflict_count, 2);
  assert.equal(result.conflicts.length, 2);
  assert.ok(result.conflicts[0].reason.includes("Overlapping regions"));
  assert.equal(db.batched.length, 2);
});

test("two near-duplicate same-type regions: real supersede-the-older logic (a real D1 status='rejected' write)", async () => {
  const box = (x) => JSON.stringify({ x_percent: x, y_percent: 0, width_percent: 30, height_percent: 30 });
  const candidates = [
    { id: "older", page_number: 1, schedule_type: "door", bounding_box_percent: box(10), status: "pending", created_at: "2026-01-01" },
    { id: "newer", page_number: 1, schedule_type: "door", bounding_box_percent: box(10.5), status: "pending", created_at: "2026-01-02" },
  ];
  const db = withResults(makeFakeDb(), candidates);
  const result = await detectAndPersistRegionConflicts("s1", { DB: db });
  assert.equal(result.superseded_count, 1);
  const rejectStmt = db.batched.find((s) => s.sql.includes("status = 'rejected'"));
  assert.ok(rejectStmt, "expected a real rejected-status write for the older duplicate");
  assert.equal(rejectStmt.binds[1], "older");
});

test("candidate with a dangling cross-reference to a deleted candidate is flagged", async () => {
  const candidates = [
    { id: "c1", page_number: 1, schedule_type: "door", bounding_box: null, cross_ref: JSON.stringify(["missing-id"]), status: "pending", created_at: "2026-01-01" },
  ];
  const db = withResults(makeFakeDb(), candidates);
  const result = await detectAndPersistRegionConflicts("s1", { DB: db });
  assert.equal(result.conflict_count, 1);
  assert.ok(result.conflicts[0].reason.includes("missing/removed region"));
});
