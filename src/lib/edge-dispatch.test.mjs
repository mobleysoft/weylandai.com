import { test } from "node:test";
import assert from "node:assert/strict";
import { D1KVShim, MIME_MAP, serveR2, checkSession } from "./edge-dispatch.js";

function makeFakeD1({ compatRows = {}, runCalls = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes(`FROM kv_compat`)) {
              const key = `${args[0]}::${args[1]}`;
              return compatRows[key] || null;
            }
            return null;
          },
          async all() {
            if (sql.includes(`FROM kv_compat`)) {
              const ns = args[0];
              const prefix = args[1].replace(/%$/, "");
              const rows = Object.entries(compatRows)
                .filter(([k]) => k.startsWith(`${ns}::${prefix}`))
                .map(([k, v]) => ({ key: k.split("::")[1], ...v }));
              return { results: rows };
            }
            return { results: [] };
          },
          async run() { runCalls.push({ sql, args }); return {}; },
        }),
      };
    },
  };
}

test("D1KVShim.get: falls through to the generic kv_compat table when unmapped", async () => {
  const db = makeFakeD1({ compatRows: { "ns1::key1": { value: "hello" } } });
  const shim = new D1KVShim(db, "ns1", { logConversions: false });
  const result = await shim.get("key1");
  assert.equal(result, "hello");
});

test("D1KVShim.get: returns null for a missing key", async () => {
  const db = makeFakeD1();
  const shim = new D1KVShim(db, "ns1", { logConversions: false });
  const result = await shim.get("missing");
  assert.equal(result, null);
});

test("D1KVShim.get: json type coerces the stored string", async () => {
  const db = makeFakeD1({ compatRows: { "ns1::obj": { value: '{"a":1}' } } });
  const shim = new D1KVShim(db, "ns1", { logConversions: false });
  const result = await shim.get("obj", "json");
  assert.deepEqual(result, { a: 1 });
});

test("D1KVShim.get: a real mapping intercepts before falling through to kv_compat", async () => {
  const db = makeFakeD1();
  const mapping = {
    pattern: "session:",
    getSQL: "SELECT data as value FROM sessions WHERE id = ?",
    toKV: (row) => row.data,
  };
  db.prepare = (sql) => ({
    bind: (...args) => ({
      async first() {
        if (sql.includes("FROM sessions")) return { data: "mapped-value" };
        return null;
      },
      async all() { return { results: [] }; },
      async run() { return {}; },
    }),
  });
  const shim = new D1KVShim(db, "ns1", { mappings: [mapping], logConversions: false });
  const result = await shim.get("session:abc");
  assert.equal(result, "mapped-value");
});

test("D1KVShim.put: real INSERT OR REPLACE into kv_compat when unmapped", async () => {
  const runCalls = [];
  const db = makeFakeD1({ runCalls });
  const shim = new D1KVShim(db, "ns1", { logConversions: false });
  await shim.put("key1", { a: 1 });
  const putCall = runCalls.find((c) => c.sql.includes("INSERT OR REPLACE INTO kv_compat"));
  assert.ok(putCall, "expected a real INSERT OR REPLACE INTO kv_compat call");
  assert.equal(putCall.args[2], JSON.stringify({ a: 1 }));
});

test("D1KVShim.delete: real DELETE from kv_compat when unmapped", async () => {
  const runCalls = [];
  const db = makeFakeD1({ runCalls });
  const shim = new D1KVShim(db, "ns1", { logConversions: false });
  await shim.delete("key1");
  assert.ok(runCalls.some((c) => c.sql.includes("DELETE FROM kv_compat")));
});

test("D1KVShim.list: returns real keys from kv_compat filtered by prefix", async () => {
  const db = makeFakeD1({
    compatRows: {
      "ns1::user:1": { metadata: null, expiration: null },
      "ns1::user:2": { metadata: null, expiration: null },
      "ns1::other:1": { metadata: null, expiration: null },
    },
  });
  const shim = new D1KVShim(db, "ns1", { logConversions: false });
  const result = await shim.list({ prefix: "user:" });
  assert.equal(result.keys.length, 2);
  assert.ok(result.keys.every((k) => k.name.startsWith("user:")));
});

test("MIME_MAP: real content types for common extensions", () => {
  assert.equal(MIME_MAP[".html"], "text/html;charset=utf-8");
  assert.equal(MIME_MAP[".js"], "application/javascript;charset=utf-8");
  assert.equal(MIME_MAP[".json"], "application/json");
  assert.equal(MIME_MAP[".pdf"], "application/pdf");
});

function makeFakeAssets(objects = {}) {
  return {
    async get(key) {
      return objects[key] || null;
    },
  };
}

test("serveR2: root path serves index.html", async () => {
  const env = { ASSETS: makeFakeAssets({ "index.html": { body: "home", httpEtag: "e1" } }) };
  const res = await serveR2(env, "/");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "text/html;charset=utf-8");
  assert.equal(res.headers.get("ETag"), "e1");
});

test("serveR2: html responses get no-store cache headers", async () => {
  const env = { ASSETS: makeFakeAssets({ "about.html": { body: "about" } }) };
  const res = await serveR2(env, "/about.html");
  assert.equal(res.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate, max-age=0");
});

test("serveR2: non-html responses get a long-lived cache header", async () => {
  const env = { ASSETS: makeFakeAssets({ "logo.png": { body: "binary" } }) };
  const res = await serveR2(env, "/logo.png");
  assert.equal(res.headers.get("Content-Type"), "image/png");
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=86400, must-revalidate");
});

test("serveR2: directory path with trailing slash tries dir/index.html", async () => {
  const env = { ASSETS: makeFakeAssets({ "pricing/index.html": { body: "pricing" } }) };
  const res = await serveR2(env, "/pricing/");
  assert.equal(res.status, 200);
});

test("serveR2: extensionless path without trailing slash also tries path/index.html", async () => {
  const env = { ASSETS: makeFakeAssets({ "careers/index.html": { body: "careers" } }) };
  const res = await serveR2(env, "/careers");
  assert.equal(res.status, 200);
});

test("serveR2: returns null when nothing in ASSETS matches", async () => {
  const env = { ASSETS: makeFakeAssets({}) };
  const res = await serveR2(env, "/nonexistent");
  assert.equal(res, null);
});

test("checkSession: false when no cookie present", async () => {
  const req = new Request("https://example.com/");
  const result = await checkSession({}, req);
  assert.equal(result, false);
});

test("checkSession: real true when a non-expired session row exists", async () => {
  const req = new Request("https://example.com/", { headers: { Cookie: "weyland_session=abc123" } });
  const env = { DB: { prepare: () => ({ bind: () => ({ async first() { return { id: "abc123" }; } }) }) } };
  const result = await checkSession(env, req);
  assert.equal(result, true);
});

test("checkSession: false when the session row doesn't exist (expired or invalid)", async () => {
  const req = new Request("https://example.com/", { headers: { Cookie: "weyland_session=expired1" } });
  const env = { DB: { prepare: () => ({ bind: () => ({ async first() { return null; } }) }) } };
  const result = await checkSession(env, req);
  assert.equal(result, false);
});

test("checkSession: false when the DB query throws", async () => {
  const req = new Request("https://example.com/", { headers: { Cookie: "weyland_session=x" } });
  const env = { DB: { prepare: () => { throw new Error("db down"); } } };
  const result = await checkSession(env, req);
  assert.equal(result, false);
});
