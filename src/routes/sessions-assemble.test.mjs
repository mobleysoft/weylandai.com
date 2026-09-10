import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsAssembleRoutes } from "./sessions-assemble.js";

const authOk = async () => ({ user: { userId: "u1", tenantId: null } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ session = null, vendorProfile = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("FROM vendor_profile")) return vendorProfile;
            if (sql.includes("FROM hardware_extraction_sessions")) return session;
            return null;
          },
        }),
      };
    },
  };
}

function setup({
  authenticate = authOk,
  db,
  uploads,
  persistSessionMatches = async () => {},
  assembleSubmittalPackage = async () => ({ success: true, r2Key: "k1", totalPages: 3, sections: [], errors: [] }),
  getAssemblyStatus = async () => ({ status: "complete" }),
} = {}) {
  const router = new NativeRouter();
  registerSessionsAssembleRoutes(router, {
    authenticate,
    persistSessionMatches,
    assembleSubmittalPackage,
    getAssemblyStatus,
    PDFDocument: {},
    StandardFonts: {},
    rgb: () => {},
  });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || { async get() { return null; } } } };
}

test("POST /api/sessions/:sessionId/assemble: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/assemble", { method: "POST" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/sessions/:sessionId/assemble: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/assemble", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST /api/sessions/:sessionId/assemble: 403 when not owned", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "other" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/assemble", { method: "POST" }), env, {});
  assert.equal(res.status, 403);
});

test("POST /api/sessions/:sessionId/assemble: real happy path assembles and returns a download url", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", project_name: "Proj" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/assemble", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.pdfUrl, "/api/sessions/s1/submittal/download");
  assert.equal(body.totalPages, 3);
});

test("POST /api/sessions/:sessionId/assemble: real happy path reports failure from assembleSubmittalPackage", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db, assembleSubmittalPackage: async () => ({ success: false, errors: ["bad"] }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/assemble", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 500);
});

test("GET /api/sessions/:sessionId/assemble/status: 403 when not owned", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "other" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/assemble/status"), env, {});
  assert.equal(res.status, 403);
});

test("GET /api/sessions/:sessionId/assemble/status: real happy path delegates to injected getAssemblyStatus", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/assemble/status"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "complete");
});

test("GET /api/sessions/:sessionId/submittal/download: 404 when submittal not yet assembled", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/submittal/download"), env, {});
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.ok(body.assembleUrl);
});

test("GET /api/sessions/:sessionId/submittal/download: real happy path streams the PDF", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "u1", project_name: "Proj" } });
  const uploads = { async get() { return { async arrayBuffer() { return new ArrayBuffer(6); } }; } };
  const { router, env } = setup({ db, uploads });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/submittal/download"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
});
