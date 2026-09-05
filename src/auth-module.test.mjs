// Real, runnable verification for src/auth-module.js - run with:
//   node --test src/auth-module.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateJWT,
  verifyJWT,
  hashPassword,
  authenticateRequest,
  generateSignedResourceUrl,
  verifySignedResourceUrl,
  createHmacSignature,
  base64UrlEncode,
  base64UrlDecode,
} from "./auth-module.js";

const SECRET = "test-secret-do-not-use-in-prod";

test("JWT round-trip: generate then verify returns the original payload fields", async () => {
  const token = await generateJWT({ sub: "user_123", role: "admin" }, SECRET);
  const payload = await verifyJWT(token, SECRET);
  assert.equal(payload.sub, "user_123");
  assert.equal(payload.role, "admin");
  assert.ok(payload.iat);
  assert.ok(payload.exp);
  assert.ok(payload.jti);
});

test("JWT verify: rejects a tampered signature", async () => {
  const token = await generateJWT({ sub: "user_123" }, SECRET);
  const parts = token.split(".");
  const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -2)}xx`;
  await assert.rejects(() => verifyJWT(tampered, SECRET), /Invalid token signature/);
});

test("JWT verify: rejects a token signed with a different secret", async () => {
  const token = await generateJWT({ sub: "user_123" }, SECRET);
  await assert.rejects(() => verifyJWT(token, "wrong-secret"), /Invalid token signature/);
});

test("JWT verify: rejects an expired token", async () => {
  const token = await generateJWT({ sub: "user_123" }, SECRET, -1000);
  await assert.rejects(() => verifyJWT(token, SECRET), /Token expired/);
});

test("JWT verify: rejects malformed input", async () => {
  await assert.rejects(() => verifyJWT("not-a-jwt", SECRET), /Malformed JWT token/);
  await assert.rejects(() => verifyJWT("", SECRET), /Invalid token format/);
  await assert.rejects(() => verifyJWT(null, SECRET), /Invalid token format/);
});

test("hashPassword: deterministic for the same input", async () => {
  const a = await hashPassword("correct horse battery staple");
  const b = await hashPassword("correct horse battery staple");
  assert.equal(a, b);
});

test("hashPassword: different inputs produce different hashes", async () => {
  const a = await hashPassword("password-one");
  const b = await hashPassword("password-two");
  assert.notEqual(a, b);
});

test("authenticateRequest: valid Bearer token resolves to the payload", async () => {
  const token = await generateJWT({ sub: "user_456" }, SECRET);
  const request = new Request("https://weylandai.com/api/whoami", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await authenticateRequest(request, SECRET);
  assert.equal(payload.sub, "user_456");
});

test("authenticateRequest: missing Authorization header rejects", async () => {
  const request = new Request("https://weylandai.com/api/whoami");
  await assert.rejects(() => authenticateRequest(request, SECRET), /Missing Authorization header/);
});

test("authenticateRequest: non-Bearer scheme rejects", async () => {
  const request = new Request("https://weylandai.com/api/whoami", {
    headers: { Authorization: "Basic dXNlcjpwYXNz" },
  });
  await assert.rejects(() => authenticateRequest(request, SECRET), /Invalid Authorization header format/);
});

test("signed resource URL round-trip: valid within the expiry window", async () => {
  const signed = await generateSignedResourceUrl("/files/report.pdf", SECRET, 15);
  const result = await verifySignedResourceUrl(new URL(`https://weylandai.com${signed}`), SECRET);
  assert.equal(result.valid, true);
  assert.equal(result.expired, false);
});

test("signed resource URL: rejects a tampered signature", async () => {
  const signed = await generateSignedResourceUrl("/files/report.pdf", SECRET, 15);
  const tampered = signed.replace(/sig=[^&]+/, "sig=deadbeef");
  const result = await verifySignedResourceUrl(new URL(`https://weylandai.com${tampered}`), SECRET);
  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid signature");
});

test("signed resource URL: rejects an already-expired URL", async () => {
  const signed = await generateSignedResourceUrl("/files/report.pdf", SECRET, -1);
  const result = await verifySignedResourceUrl(new URL(`https://weylandai.com${signed}`), SECRET);
  assert.equal(result.valid, false);
  assert.equal(result.expired, true);
});

test("signed resource URL: missing expires/sig params fails cleanly", async () => {
  const result = await verifySignedResourceUrl(new URL("https://weylandai.com/files/report.pdf"), SECRET);
  assert.equal(result.valid, false);
  assert.equal(result.error, "Missing expires or sig parameter");
});

test("createHmacSignature: deterministic and secret-sensitive", async () => {
  const a = await createHmacSignature("payload", SECRET);
  const b = await createHmacSignature("payload", SECRET);
  const c = await createHmacSignature("payload", "different-secret");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("base64Url encode/decode round-trip, including unicode", () => {
  const original = "hello world / + = 日本語";
  const encoded = base64UrlEncode(original);
  assert.ok(!encoded.includes("+") && !encoded.includes("/") && !encoded.includes("="));
  assert.equal(base64UrlDecode(encoded), original);
});
