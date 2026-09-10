import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsAutoGenerateRoutes } from "./sessions-auto-generate.js";

const authOk = async () => ({ user: { userId: "u1", tenantId: null } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ tenant = null, vendor = null, project = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("FROM tenants")) return tenant;
            if (sql.includes("FROM vendor_profile")) return vendor;
            if (sql.includes("FROM projects")) return project;
            return null;
          },
          async run() { return { success: true }; },
        }),
      };
    },
  };
}

function makeFakeUploads() {
  return { async put() {} };
}

let idCounter = 0;
const generateId3Ok = (prefix) => `${prefix}_test_${idCounter++}`;
const extractPdfBookmarks2Ok = async () => ({ numPages: 1, bookmarks: null });
const extractSinglePageOk = async () => ({ hardware_groups: [] });

function setup({
  authenticate = authOk,
  db,
  uploads,
  generateId3 = generateId3Ok,
  extractPdfBookmarks2 = extractPdfBookmarks2Ok,
  extractSinglePage = extractSinglePageOk,
} = {}) {
  const router = new NativeRouter();
  registerSessionsAutoGenerateRoutes(router, { authenticate, generateId3, extractPdfBookmarks2, extractSinglePage });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || makeFakeUploads() } };
}

function pdfFormRequest({ withFile = true, fileType = "application/pdf" } = {}) {
  const fd = new FormData();
  if (withFile) {
    fd.set("file", new Blob([new Uint8Array([1, 2, 3])], { type: fileType }), "test.pdf");
  }
  fd.set("projectName", "Test Project");
  return new Request("https://example.com/api/sessions/auto-generate", { method: "POST", body: fd });
}

test("POST /api/sessions/auto-generate: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(pdfFormRequest(), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/sessions/auto-generate: 400 when no file uploaded", async () => {
  const { router, env } = setup();
  const res = await router.handle(pdfFormRequest({ withFile: false }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/sessions/auto-generate: 400 when file isn't a PDF", async () => {
  const { router, env } = setup();
  const res = await router.handle(pdfFormRequest({ fileType: "image/png" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/sessions/auto-generate: real happy path stores the PDF, extracts pages, and returns a submittal package", async () => {
  const { router, env } = setup({
    extractPdfBookmarks2: async () => ({ numPages: 2, bookmarks: null }),
    extractSinglePage: async () => ({
      hardware_groups: [{ components: [{ manufacturer: "SCHLAGE" }] }],
    }),
  });
  const res = await router.handle(pdfFormRequest(), env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.projectName, "Test Project");
  assert.equal(body.summary.totalPages, 2);
  assert.equal(body.summary.totalHardwareGroups, 2);
  assert.equal(body.cutSheets.length, 1);
  assert.equal(body.cutSheets[0].manufacturer, "SCHLAGE");
});

test("POST /api/sessions/auto-generate: a failing page extraction is captured per-page, not fatal", async () => {
  const { router, env } = setup({
    extractSinglePage: async () => { throw new Error("vision api down"); },
  });
  const res = await router.handle(pdfFormRequest(), env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.summary.totalHardwareGroups, 0);
  assert.equal(body.hardwareSchedule[0].error, "vision api down");
});

test("POST /api/sessions/auto-generate: a thrown error before extraction returns a real 500", async () => {
  const { router, env } = setup({ db: { prepare() { throw new Error("db unavailable"); } } });
  const res = await router.handle(pdfFormRequest(), env, {});
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error, "Failed to auto-generate submittal");
});
