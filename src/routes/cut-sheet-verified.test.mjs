import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCutSheetVerifiedRoutes } from "./cut-sheet-verified.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const prodOk = async () => null;
const prodFail = async () => new Response("no access", { status: 402 });

function makeFakeDb({ documents = [] } = {}) {
  return {
    prepare() {
      return { bind: () => ({ async all() { return { results: documents }; } }) };
    },
  };
}

function setup({ authenticate = authOk, requireProductAccess = prodOk, db } = {}) {
  const router = new NativeRouter();
  registerCutSheetVerifiedRoutes(router, { authenticate, requireProductAccess });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/cut-sheets/verified: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/verified"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/cut-sheets/verified: product access failure short-circuits", async () => {
  const { router, env } = setup({ requireProductAccess: prodFail });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/verified"), env, {});
  assert.equal(res.status, 402);
});

test("GET /api/cut-sheets/verified: real happy path returns verified cut-sheet documents", async () => {
  const db = makeFakeDb({ documents: [{ id: "d1", document_type: "cut_sheet" }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/verified?manufacturer=Schlage"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.documents.length, 1);
});
