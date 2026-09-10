import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCutSheetLocalRoutes } from "./cut-sheet-local.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const prodOk = async () => null;

const fakeIndex = {
  version: "0.0.1",
  files: [
    { filename: "a.pdf", manufacturer: "schlage", parent_company: "allegion" },
    { filename: "b.pdf", manufacturer: "schlage", parent_company: "allegion" },
    { filename: "c.pdf", manufacturer: "lcn", parent_company: "allegion" },
  ],
};

function setup({ authenticate = authOk, requireProductAccess = prodOk, searchLocalCatalogue } = {}) {
  const router = new NativeRouter();
  registerCutSheetLocalRoutes(router, {
    authenticate,
    requireProductAccess,
    searchLocalCatalogue: searchLocalCatalogue || (async () => null),
    LOCAL_CATALOGUE_INDEX: fakeIndex,
  });
  return { router, env: {} };
}

test("GET /api/cut-sheets/local-search: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/local-search?manufacturer=Schlage"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/cut-sheets/local-search: missing manufacturer is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/local-search"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/cut-sheets/local-search: found:false when injected searchLocalCatalogue returns nothing", async () => {
  const { router, env } = setup({ searchLocalCatalogue: async () => null });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/local-search?manufacturer=NotReal"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.found, false);
});

test("GET /api/cut-sheets/local-search: real happy path returns a found match from injected searchLocalCatalogue", async () => {
  const { router, env } = setup({ searchLocalCatalogue: async () => ({ filename: "a.pdf" }) });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/local-search?manufacturer=Schlage"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.found, true);
  assert.equal(body.filename, "a.pdf");
});

test("GET /api/cut-sheets/local-index: real happy path summarizes the injected LOCAL_CATALOGUE_INDEX", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/local-index"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.version, "0.0.1");
  assert.equal(body.totalFiles, 3);
  assert.deepEqual(body.manufacturers.sort(), ["lcn", "schlage"]);
  assert.equal(body.manufacturerCounts.schlage, 2);
  assert.equal(body.manufacturerCounts.lcn, 1);
});
