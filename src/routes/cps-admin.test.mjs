import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsAdminRoutes } from "./cps-admin.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ pages = [], remaining = 0, stats = null, ftsRows = { fts_rows: 0 }, ftsThrows = false, samples = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("as remaining")) return { remaining };
            if (sql.includes("total_pages")) return stats;
            return null;
          },
          async all() {
            if (sql.includes("WHERE search_text IS NULL")) return { results: pages };
            if (sql.includes("WHERE text_content LIKE")) return { results: samples };
            return { results: [] };
          },
          async run() {
            return { success: true };
          },
        }),
        async first() {
          if (sql.includes("FROM catalogue_trigram_fts")) {
            if (ftsThrows) throw new Error("no such table");
            return ftsRows;
          }
          if (sql.includes("as remaining")) return { remaining };
          if (sql.includes("total_pages")) return stats;
          return null;
        },
        async all() {
          if (sql.includes("WHERE text_content LIKE")) return { results: samples };
          return { results: [] };
        },
      };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerCpsAdminRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST /api/cps/admin/normalize-search-text: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/admin/normalize-search-text", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/cps/admin/normalize-search-text: real happy path reports all-normalized when nothing pending", async () => {
  const { router, env } = setup({ db: makeFakeDb({ pages: [] }) });
  const req = new Request("https://example.com/api/cps/admin/normalize-search-text", { method: "POST", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.updated, 0);
  assert.equal(body.total, 0);
});

test("POST /api/cps/admin/normalize-search-text: real happy path normalizes pages and returns samples", async () => {
  const pages = [{ catalogue_id: "c1", page_num: 1, text_content: "L/LV1234 door" }];
  const { router, env } = setup({ db: makeFakeDb({ pages, remaining: 5 }) });
  const req = new Request("https://example.com/api/cps/admin/normalize-search-text", { method: "POST", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.updated, 1);
  assert.equal(body.total, 1);
  assert.equal(body.remaining, 5);
  assert.equal(body.samples.length, 1);
});

test("POST /api/cps/admin/normalize-search-text: dry_run does not update, updated stays 0", async () => {
  const pages = [{ catalogue_id: "c1", page_num: 1, text_content: "L/LV1234 door" }];
  const { router, env } = setup({ db: makeFakeDb({ pages }) });
  const req = new Request("https://example.com/api/cps/admin/normalize-search-text", { method: "POST", body: JSON.stringify({ dry_run: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.updated, 0);
  assert.equal(body.total, 1);
  assert.equal(body.message, "Dry run complete (no changes made)");
});

test("GET /api/cps/admin/normalization-status: real happy path returns in_progress with completion_pct", async () => {
  const db = makeFakeDb({ stats: { total_pages: 10, normalized_pages: 4, pending_pages: 6 } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/admin/normalization-status"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "in_progress");
  assert.equal(body.completion_pct, 40);
});

test("GET /api/cps/admin/normalization-status: status is complete when pending_pages is 0", async () => {
  const db = makeFakeDb({ stats: { total_pages: 10, normalized_pages: 10, pending_pages: 0 } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/admin/normalization-status"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "complete");
});

test("GET /api/cps/admin/normalization-status: gracefully handles a missing trigram FTS table", async () => {
  const db = makeFakeDb({ stats: { total_pages: 1, normalized_pages: 1, pending_pages: 0 }, ftsThrows: true });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/admin/normalization-status"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.fts_rows, 0);
});
