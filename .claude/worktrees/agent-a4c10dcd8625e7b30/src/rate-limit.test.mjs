// Real, runnable verification for src/rate-limit.js - run with:
//   node --test src/rate-limit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "./rate-limit.js";

// Minimal in-memory stand-in for the real `env.CACHE` KV namespace binding
// (Workers KV's get/put contract: get(key, "json") returns the parsed
// value or null; put(key, string, {expirationTtl}) stores it).
function makeFakeCache(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key, type) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return type === "json" ? JSON.parse(raw) : raw;
    },
    async put(key, value) {
      store.set(key, value);
    },
    _store: store,
  };
}

test("first request for a user/operation: not limited, full remaining minus one", async () => {
  const env = { CACHE: makeFakeCache() };
  const result = await checkRateLimit("user_1", "enrichment", env, { requests: 10, windowSeconds: 60 });
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 9);
});

test("requests under the limit decrement remaining each time", async () => {
  const env = { CACHE: makeFakeCache() };
  const limits = { requests: 3, windowSeconds: 60 };
  const r1 = await checkRateLimit("user_2", "enrichment", env, limits);
  const r2 = await checkRateLimit("user_2", "enrichment", env, limits);
  assert.equal(r1.remaining, 2);
  assert.equal(r2.remaining, 1);
  assert.equal(r2.limited, false);
});

test("exceeding the limit returns limited:true with retryAfter and remaining:0", async () => {
  const env = { CACHE: makeFakeCache() };
  const limits = { requests: 2, windowSeconds: 60 };
  await checkRateLimit("user_3", "enrichment", env, limits);
  await checkRateLimit("user_3", "enrichment", env, limits);
  const blocked = await checkRateLimit("user_3", "enrichment", env, limits);
  assert.equal(blocked.limited, true);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfter > 0);
});

test("different operations for the same user are tracked independently", async () => {
  const env = { CACHE: makeFakeCache() };
  const limits = { requests: 1, windowSeconds: 60 };
  const a = await checkRateLimit("user_4", "enrichment", env, limits);
  const b = await checkRateLimit("user_4", "other-op", env, limits);
  assert.equal(a.limited, false);
  assert.equal(b.limited, false);
});

test("different users for the same operation are tracked independently", async () => {
  const env = { CACHE: makeFakeCache() };
  const limits = { requests: 1, windowSeconds: 60 };
  const a = await checkRateLimit("user_5", "enrichment", env, limits);
  const b = await checkRateLimit("user_6", "enrichment", env, limits);
  assert.equal(a.limited, false);
  assert.equal(b.limited, false);
});

test("window reset: an expired window allows requests again, starting a fresh count", async () => {
  const env = { CACHE: makeFakeCache() };
  const key = "ratelimit:enrichment:user_7";
  // Seed a window that already expired (resetAt in the past) at the limit.
  env.CACHE._store.set(key, JSON.stringify({ count: 5, resetAt: Date.now() - 1000 }));
  const result = await checkRateLimit("user_7", "enrichment", env, { requests: 5, windowSeconds: 60 });
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 4);
});

test("CACHE.get throwing fails open (not limited) rather than blocking real users", async () => {
  const env = {
    CACHE: {
      async get() { throw new Error("KV unavailable"); },
      async put() {},
    },
  };
  const result = await checkRateLimit("user_8", "enrichment", env, { requests: 10, windowSeconds: 60 });
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 10);
});

test("default limits (10 requests / 60s window) apply when none are passed", async () => {
  const env = { CACHE: makeFakeCache() };
  const result = await checkRateLimit("user_9", "enrichment", env);
  assert.equal(result.limited, false);
  assert.equal(result.remaining, 9);
});
