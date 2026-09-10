import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerUploadRoutes } from "./upload.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeUploads({ createMultipartUpload, resumeMultipartUpload, get } = {}) {
  return {
    createMultipartUpload: createMultipartUpload || (async (key) => ({ uploadId: "up1", key })),
    resumeMultipartUpload: resumeMultipartUpload || (() => ({
      uploadPart: async (partNumber) => ({ partNumber, etag: "etag1" }),
      complete: async () => {},
    })),
    get: get || (async () => null),
  };
}

function makeFakeCache() {
  return { async put() {} };
}

function setup({
  authenticate = authOk,
  uploads,
  cache,
  detectFileType = () => ({ type: "pdf", mimeType: "application/pdf" }),
  extractPdfBookmarks2 = async () => ({ numPages: 3, bookmarks: null }),
  detectSchedulePages = () => null,
  createExtractionSession = async () => "sess1",
  logTelemetryEvent = async () => {},
} = {}) {
  const router = new NativeRouter();
  registerUploadRoutes(router, { authenticate, detectFileType, extractPdfBookmarks2, detectSchedulePages, createExtractionSession, logTelemetryEvent });
  return { router, env: { UPLOADS: uploads || makeFakeUploads(), CACHE: cache || makeFakeCache() } };
}

test("POST /api/upload/init: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/upload/init", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/upload/init: 400 when filename missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/upload/init", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/upload/init: 400 for invalid document_type", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/upload/init", { method: "POST", body: JSON.stringify({ filename: "a.pdf", documentType: "bogus" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/upload/init: real happy path creates a multipart upload", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/upload/init", { method: "POST", body: JSON.stringify({ filename: "a.pdf", fileSize: 1000 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.uploadId, "up1");
  assert.ok(body.r2Key.includes("u1"));
});

test("PUT /api/upload/part: 400 when required headers missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/upload/part", { method: "PUT" }), env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/upload/part: real happy path uploads a part", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/upload/part", {
    method: "PUT",
    headers: { "X-Upload-Id": "up1", "X-R2-Key": "k1", "X-Part-Number": "1" },
    body: new Uint8Array([1, 2, 3]),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.partNumber, 1);
  assert.equal(body.etag, "etag1");
});

test("POST /api/upload/complete: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/upload/complete", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/upload/complete: 400 when r2Key missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/upload/complete", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/upload/complete: 404 when file not found in R2", async () => {
  const { router, env } = setup({ uploads: makeFakeUploads({ get: async () => null }) });
  const req = new Request("https://example.com/api/upload/complete", { method: "POST", body: JSON.stringify({ r2Key: "k1" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/upload/complete: 400 for an unrecognized file type", async () => {
  const uploads = makeFakeUploads({ get: async () => ({ async arrayBuffer() { return new ArrayBuffer(4); } }) });
  const { router, env } = setup({ uploads, detectFileType: () => ({ type: "unknown" }) });
  const req = new Request("https://example.com/api/upload/complete", { method: "POST", body: JSON.stringify({ r2Key: "k1" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/upload/complete: real happy path creates a session for a PDF", async () => {
  const uploads = makeFakeUploads({ get: async () => ({ async arrayBuffer() { return new ArrayBuffer(4); } }) });
  const { router, env } = setup({ uploads });
  const req = new Request("https://example.com/api/upload/complete", { method: "POST", body: JSON.stringify({ r2Key: "k1", filename: "a.pdf", projectName: "Proj" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.sessionId, "sess1");
  assert.equal(body.totalPages, 3);
  assert.equal(body.sourceType, "pdf");
});

test("POST /api/upload/complete: real happy path finalizes a multipart upload first when uploadId+parts are given", async () => {
  let completedWith = null;
  const uploads = makeFakeUploads({
    resumeMultipartUpload: () => ({ complete: async (parts) => { completedWith = parts; } }),
    get: async () => ({ async arrayBuffer() { return new ArrayBuffer(4); } }),
  });
  const { router, env } = setup({ uploads });
  const req = new Request("https://example.com/api/upload/complete", {
    method: "POST",
    body: JSON.stringify({ r2Key: "k1", uploadId: "up1", parts: [{ partNumber: 1, etag: "e1" }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  assert.deepEqual(completedWith, [{ partNumber: 1, etag: "e1" }]);
});

test("POST /api/upload/complete: real happy path creates a session for an image", async () => {
  const uploads = makeFakeUploads({ get: async () => ({ async arrayBuffer() { return new ArrayBuffer(4); } }) });
  const { router, env } = setup({ uploads, detectFileType: () => ({ type: "image", mimeType: "image/png" }) });
  const req = new Request("https://example.com/api/upload/complete", { method: "POST", body: JSON.stringify({ r2Key: "k1", filename: "a.png" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.sourceType, "image");
  assert.equal(body.totalPages, 1);
});

test("POST /api/upload/complete: real bug fix regression - falls back to countPdfPagesRaw's real raw page count when bookmark page count is 1 or fewer", async () => {
  const rawPdfBytes = new TextEncoder().encode("%PDF-1.4\n/Type /Page\n/Type /Page\n/Type /Page\n");
  const uploads = makeFakeUploads({ get: async () => ({ async arrayBuffer() { return rawPdfBytes.buffer; } }) });
  const { router, env } = setup({ uploads, extractPdfBookmarks2: async () => ({ numPages: 1, bookmarks: null }) });
  const req = new Request("https://example.com/api/upload/complete", { method: "POST", body: JSON.stringify({ r2Key: "k1", filename: "a.pdf" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.totalPages, 3);
});
