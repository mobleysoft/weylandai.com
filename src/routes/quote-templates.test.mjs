import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerQuoteTemplatesRoutes } from "./quote-templates.js";

const authOk = async () => ({ user: { userId: "u1", tenantId: "t1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ templates = {}, deletedR2Keys = [] } = {}) {
  const runs = [];
  const uploads = { deleted: [], async delete(key) { uploads.deleted.push(key); } };
  return {
    runs,
    uploads,
    prepare(sql) {
      const stmt = {
        sql, binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("SELECT * FROM quote_templates") || sql.includes("SELECT id FROM quote_templates") || sql.includes("SELECT source_pdf_r2_key")) {
            const id = stmt.binds[0];
            return templates[id] || null;
          }
          return null;
        },
        async all() {
          return { results: Object.values(templates) };
        },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true, changes: 1 }; },
      };
      return stmt;
    },
  };
}

function setup({ db } = {}) {
  const router = new NativeRouter();
  registerQuoteTemplatesRoutes(router, { authenticate: authOk });
  const realDb = db || makeFakeDb();
  return { router, env: { DB: realDb, UPLOADS: realDb.uploads } };
}

test("GET /api/quote-templates: auth failure short-circuits before touching the database", async () => {
  const router = new NativeRouter();
  registerQuoteTemplatesRoutes(router, { authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/quote-templates"), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET /api/quote-templates: real list ordered by is_default/created_at", async () => {
  const db = makeFakeDb({ templates: { t1: { id: "t1", template_name: "Default", is_default: 1 } } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/quote-templates"), env, {});
  const body = await res.json();
  assert.equal(body.templates.length, 1);
  assert.equal(body.templates[0].id, "t1");
});

test("GET /api/quote-templates/:id: 404 when not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ templates: {} }) });
  const res = await router.handle(new Request("https://example.com/api/quote-templates/nope"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/quote-templates/:id: real happy path parses layout_dna JSON", async () => {
  const db = makeFakeDb({ templates: { t1: { id: "t1", layout_dna: JSON.stringify({ font: "serif" }) } } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/quote-templates/t1"), env, {});
  const body = await res.json();
  assert.deepEqual(body.layout_dna, { font: "serif" });
});

test("PUT /api/quote-templates/:id: no fields to update is a real 400", async () => {
  const db = makeFakeDb({ templates: { t1: { id: "t1" } } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/quote-templates/t1", { method: "PUT", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/quote-templates/:id: real update writes template_name and layout_dna", async () => {
  const db = makeFakeDb({ templates: { t1: { id: "t1" } } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/quote-templates/t1", { method: "PUT", body: JSON.stringify({ template_name: "New Name", layout_dna: { a: 1 } }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const update = db.runs.find((r) => r.sql.includes("UPDATE quote_templates SET"));
  assert.ok(update.sql.includes("template_name = ?"));
  assert.ok(update.sql.includes("layout_dna = ?"));
});

test("PUT /api/quote-templates/:id/affirm: 404 when update matches zero rows", async () => {
  const db = makeFakeDb();
  db.prepare = (sql) => ({
    bind(...args) { this.binds = args; return this; },
    async run() { return { changes: 0 }; },
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/quote-templates/t1/affirm", { method: "PUT" }), env, {});
  assert.equal(res.status, 404);
});

test("DELETE /api/quote-templates/:id: real happy path also deletes the R2 source PDF when present", async () => {
  const db = makeFakeDb({ templates: { t1: { id: "t1", source_pdf_r2_key: "uploads/t1.pdf" } } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/quote-templates/t1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 200);
  assert.ok(db.runs.some((r) => r.sql.includes("DELETE FROM quote_templates")));
  assert.deepEqual(env.UPLOADS.deleted, ["uploads/t1.pdf"]);
});

test("POST /api/quote-templates/:id/set-default: real two-step unset-then-set", async () => {
  const db = makeFakeDb({ templates: { t1: { id: "t1" } } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/quote-templates/t1/set-default", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  assert.ok(db.runs.some((r) => r.sql.includes("SET is_default = 0")));
  assert.ok(db.runs.some((r) => r.sql.includes("SET is_default = 1")));
});
