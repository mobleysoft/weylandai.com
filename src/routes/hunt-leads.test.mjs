import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHuntLeadsRoutes, scoreOpportunity } from "./hunt-leads.js";

test("scoreOpportunity(): no criteria set (all defaults) qualifies everything at score 3", () => {
  const r = scoreOpportunity({ title: "Anything", location: "Anywhere" }, { min_value: 0, keywords: "", locations: "" });
  assert.equal(r.score, 3);
  assert.equal(r.qualified, true);
});

test("scoreOpportunity(): below min_value loses a point and can fall under the qualify threshold", () => {
  const criteria = { min_value: 100000, keywords: "", locations: "" };
  const r = scoreOpportunity({ estimated_value: 5000, title: "x", location: "y" }, criteria);
  assert.equal(r.score, 2); // keyword+location still pass (both unset), value fails
  assert.equal(r.qualified, true); // 2 still meets the >=2 threshold
});

test("scoreOpportunity(): failing all three real criteria is unqualified", () => {
  const criteria = { min_value: 999999, keywords: "steel", locations: "texas" };
  const r = scoreOpportunity({ estimated_value: 100, title: "wood frame", location: "ohio" }, criteria);
  assert.equal(r.score, 0);
  assert.equal(r.qualified, false);
});

function makeFakeDb({ criteria = null, opportunities = [] } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        sql, binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM lead_criteria")) return criteria;
          if (sql.includes("FROM lead_reports")) return { r2_key: "lead-reports/u1/r1.pdf" };
          return null;
        },
        async all() {
          if (sql.includes("FROM opportunities")) return { results: opportunities };
          return { results: [] };
        },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
  };
}

const authOk = async () => ({ user: { userId: "u1", tenantId: "t1" } });
const prodOk = async () => null;

function setup({ db, renderHtmlToPdf, storeDocumentPdf } = {}) {
  const router = new NativeRouter();
  registerHuntLeadsRoutes(router, {
    authenticate: authOk,
    requireProductAccess: prodOk,
    renderHtmlToPdf: renderHtmlToPdf || (async () => new Uint8Array([1, 2, 3])),
    storeDocumentPdf: storeDocumentPdf || (async () => {}),
    makeDocumentDownloadRoute: () => async () => new Response("pdf-bytes"),
  });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST /api/leads/criteria: real upsert (insert when none exists)", async () => {
  const db = makeFakeDb({ criteria: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/leads/criteria", { method: "POST", body: JSON.stringify({ minValue: 50000, keywords: "steel", locations: "TX" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT INTO lead_criteria")));
});

test("GET /api/leads/criteria: returns real defaults when none saved", async () => {
  const { router, env } = setup({ db: makeFakeDb({ criteria: null }) });
  const res = await router.handle(new Request("https://example.com/api/leads/criteria"), env, {});
  const body = await res.json();
  assert.deepEqual(body.criteria, { min_value: 0, keywords: "", locations: "" });
});

test("POST /api/leads/qualify: real end-to-end scoring against a real opportunity list, writes a real report row", async () => {
  const db = makeFakeDb({
    criteria: { min_value: 0, keywords: "", locations: "" },
    opportunities: [
      { id: "o1", title: "Steel plant", location: "TX", estimated_value: 500000 },
      { id: "o2", title: "Wood shed", location: "OH", estimated_value: 100 },
    ],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/leads/qualify", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.totalScanned, 2);
  assert.equal(body.qualifiedCount, 2); // both pass with no criteria set
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT INTO lead_reports")));
});

test("GET /api/leads/reports/:id/download delegates to the injected makeDocumentDownloadRoute factory", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/leads/reports/abc/download"), env, {});
  assert.equal(await res.text(), "pdf-bytes");
});
