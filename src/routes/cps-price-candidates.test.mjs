import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsPriceCandidatesRoutes } from "./cps-price-candidates.js";

const authOk = async () => ({ user: { userId: "u1", email: "u1@weylandai.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeCandidateRow(overrides = {}) {
  return {
    id: "cpc-1",
    catalogue_id: null,
    source_url: "https://example.com/schlage.pdf",
    source_pdf_hash: "abc123",
    temp_r2_key: "temp/cut-sheets/abc123.pdf",
    page_number: 2,
    manufacturer: "schlage",
    trade: "doors",
    full_model_number: "L9050 06L",
    finish_code: "626",
    finish_description: "Satin Chrome",
    list_price: 412.0,
    unit_price: null,
    price_uom: "EA",
    extraction_confidence: 0.9,
    verified_in_source_text: 1,
    affirmed: 0,
    rejected: 0,
    promoted_at: null,
    ...overrides,
  };
}

function makeFakeDb({ candidates = [], manufacturer = { id: "mfr-schlage" } } = {}) {
  const runs = [];
  const store = new Map(candidates.map((c) => [c.id, { ...c }]));
  return {
    runs,
    store,
    prepare(sql) {
      let binds = [];
      const stmt = {
        bind(...args) { binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM catalogue_price_candidates WHERE id")) {
            return store.get(binds[0]) || null;
          }
          if (sql.includes("FROM products WHERE id")) return null; // always auto-create in this fixture
          if (sql.includes("FROM manufacturers")) return manufacturer;
          if (sql.includes("FROM product_variants")) return null; // always insert, never update
          return null;
        },
        async all() {
          if (sql.includes("SELECT * FROM catalogue_price_candidates")) {
            let rows = Array.from(store.values());
            if (sql.includes("affirmed = 1 AND rejected = 0 AND promoted_at IS NULL")) {
              rows = rows.filter((r) => r.affirmed === 1 && r.rejected === 0 && !r.promoted_at);
            }
            if (sql.includes("id IN (")) {
              const idSet = new Set(binds);
              rows = rows.filter((r) => idSet.has(r.id));
            } else if (sql.includes("catalogue_id = ?") && !sql.includes("affirmed")) {
              rows = rows.filter((r) => r.catalogue_id === binds[binds.length - 1]);
            } else if (sql.includes("WHERE 1=1")) {
              // the real listing route's filter order: manufacturer, affirmed, rejected
              let bindIdx = 0;
              if (sql.includes("manufacturer LIKE")) {
                const needle = binds[bindIdx++].replace(/%/g, "");
                rows = rows.filter((r) => (r.manufacturer || "").includes(needle));
              }
              if (sql.includes("AND affirmed = ?")) {
                const val = binds[bindIdx++];
                rows = rows.filter((r) => r.affirmed === val);
              }
              if (sql.includes("AND rejected = ?")) {
                const val = binds[bindIdx++];
                rows = rows.filter((r) => r.rejected === val);
              }
            }
            return { results: rows };
          }
          return { results: [] };
        },
        async run() {
          runs.push({ sql, binds });
          if (sql.includes("UPDATE catalogue_price_candidates") && sql.includes("SET full_model_number")) {
            const row = store.get(binds[binds.length - 1]);
            if (row) {
              Object.assign(row, {
                full_model_number: binds[0], finish_code: binds[1], finish_description: binds[2],
                list_price: binds[3], unit_price: binds[4], price_uom: binds[5],
                affirmed: binds[6], affirmed_by: binds[7], affirmed_at: binds[8],
              });
            }
          }
          if (sql.includes("SET rejected = 1")) {
            const row = store.get(binds[1]);
            if (row) { row.rejected = 1; row.rejected_reason = binds[0]; }
          }
          if (sql.includes("SET catalogue_id = ?, promoted_at")) {
            const row = store.get(binds[1]);
            if (row) { row.catalogue_id = binds[0]; row.promoted_at = "now"; }
          }
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

function setup({ db } = {}) {
  const router = new NativeRouter();
  registerCpsPriceCandidatesRoutes(router, { authenticate: authOk });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/cps/price-candidates: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerCpsPriceCandidatesRoutes(router, { authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/price-candidates"), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET /api/cps/price-candidates: real listing, filterable by affirmed", async () => {
  const db = makeFakeDb({ candidates: [makeCandidateRow({ id: "cpc-1", affirmed: 0 }), makeCandidateRow({ id: "cpc-2", affirmed: 1 })] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/price-candidates?affirmed=1"), env, {});
  const body = await res.json();
  assert.equal(body.candidates.length, 1);
  assert.equal(body.candidates[0].id, "cpc-2");
});

test("PATCH /api/cps/price-candidates/:id/affirm: real affirm stamps affirmed_by/affirmed_at and writes an audit row", async () => {
  const db = makeFakeDb({ candidates: [makeCandidateRow()] });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/price-candidates/cpc-1/affirm", {
    method: "PATCH",
    body: JSON.stringify({ affirmed: true }),
  });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(db.store.get("cpc-1").affirmed, 1);
  assert.equal(db.store.get("cpc-1").affirmed_by, "u1");
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT INTO affirm_audit_log")));
});

test("PATCH /api/cps/price-candidates/:id/affirm: a human correction (edits) is applied before affirming, matching the door-schedule affirm pattern", async () => {
  const db = makeFakeDb({ candidates: [makeCandidateRow({ list_price: 4.12 })] }); // simulate a decimal OCR misread
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/price-candidates/cpc-1/affirm", {
    method: "PATCH",
    body: JSON.stringify({ affirmed: true, edits: { list_price: 412.0 } }),
  });
  await router.handle(req, env, {});
  assert.equal(db.store.get("cpc-1").list_price, 412.0);
});

test("PATCH /api/cps/price-candidates/:id/affirm: unknown id is a real 404, not a silent no-op", async () => {
  const { router, env } = setup({ db: makeFakeDb({ candidates: [] }) });
  const req = new Request("https://example.com/api/cps/price-candidates/nope/affirm", { method: "PATCH", body: JSON.stringify({ affirmed: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/cps/price-candidates/reject: bulk reject with a reason, kept not deleted", async () => {
  const db = makeFakeDb({ candidates: [makeCandidateRow({ id: "cpc-1" }), makeCandidateRow({ id: "cpc-2" })] });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/price-candidates/reject", {
    method: "POST",
    body: JSON.stringify({ ids: ["cpc-1", "cpc-2"], reason: "OCR garbage" }),
  });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.rejected, 2);
  assert.equal(db.store.get("cpc-1").rejected, 1);
  assert.equal(db.store.get("cpc-1").rejected_reason, "OCR garbage");
});

test("POST /api/cps/price-candidates/promote: real happy path - only affirmed+unrejected+unpromoted rows promote, creates a real catalogues citation row", async () => {
  const db = makeFakeDb({
    candidates: [
      makeCandidateRow({ id: "cpc-1", affirmed: 1 }),
      makeCandidateRow({ id: "cpc-2", affirmed: 0 }), // not affirmed - must not promote
      makeCandidateRow({ id: "cpc-3", affirmed: 1, rejected: 1 }), // rejected - must not promote
    ],
  });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/price-candidates/promote", {
    method: "POST",
    body: JSON.stringify({ ids: ["cpc-1", "cpc-2", "cpc-3"] }),
  });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.promoted, 1, "only cpc-1 qualifies");
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT INTO catalogues")), "a real citation row must be created for a new source");
  const catalogueInsert = db.runs.find((r) => r.sql.includes("INSERT INTO catalogues"));
  assert.equal(catalogueInsert.binds[catalogueInsert.binds.length - 1], "https://example.com/schlage.pdf", "the real source_url must be persisted");
});

test("POST /api/cps/price-candidates/promote: requires ids or catalogue_id, not an unscoped promote-everything", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/price-candidates/promote", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/price-candidates/promote: no matching rows returns a real zero-promoted result, not an error", async () => {
  const { router, env } = setup({ db: makeFakeDb({ candidates: [] }) });
  const req = new Request("https://example.com/api/cps/price-candidates/promote", { method: "POST", body: JSON.stringify({ ids: ["nope"] }) });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.promoted, 0);
});
