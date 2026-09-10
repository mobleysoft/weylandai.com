import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCutSheetIntelligenceRoutes } from "./cut-sheet-intelligence.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ queueStats = [], discoveryStats = [], aging = [], domainCount = { total: 0, verified: 0 }, approvalRate = { approved: 0, rejected: 0, total: 0 }, allDomains = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async run() { return { success: true }; },
        }),
        async all() {
          if (sql.includes("FROM cut_sheet_discovery_queue")) return { results: queueStats };
          if (sql.includes("FROM cut_sheet_discoveries") && sql.includes("age_bucket")) return { results: aging };
          if (sql.includes("FROM cut_sheet_discoveries")) return { results: discoveryStats };
          if (sql.includes("FROM manufacturer_domains md")) return { results: allDomains };
          return { results: [] };
        },
        async first() {
          if (sql.includes("FROM manufacturer_domains")) return domainCount;
          if (sql.includes("reviewed_at")) return approvalRate;
          return null;
        },
      };
    },
  };
}

const getDiscoveryConfigOk = async () => ({ pending_review_expiry_days: "30" });
const getManufacturerDomainsOk = async () => [{ id: "d1", domain: "schlage.com" }];

function setup({ authenticate = authOk, db, getDiscoveryConfig = getDiscoveryConfigOk, getManufacturerDomains = getManufacturerDomainsOk } = {}) {
  const router = new NativeRouter();
  registerCutSheetIntelligenceRoutes(router, { authenticate, getDiscoveryConfig, getManufacturerDomains });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/cut-sheets/intelligence/metrics: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/intelligence/metrics"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/cut-sheets/intelligence/metrics: real happy path assembles metrics from multiple queries", async () => {
  const db = makeFakeDb({
    queueStats: [{ status: "pending", count: 3 }],
    discoveryStats: [{ status: "approved", count: 2 }],
    domainCount: { total: 10, verified: 7 },
    approvalRate: { approved: 8, rejected: 2, total: 10 },
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/intelligence/metrics"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.metrics.queue.pending, 3);
  assert.equal(body.metrics.domains.total, 10);
  assert.equal(body.metrics.approvalRate.rate, "80.0%");
});

test("GET /api/cut-sheets/intelligence/config: real happy path delegates to injected getDiscoveryConfig", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/intelligence/config"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.config.pending_review_expiry_days, "30");
});

test("PUT /api/cut-sheets/intelligence/config/:key: real happy path writes via local updateDiscoveryConfig", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/intelligence/config/pending_review_expiry_days", {
    method: "PUT",
    body: JSON.stringify({ value: "45" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.key, "pending_review_expiry_days");
  assert.equal(body.value, "45");
});

test("GET /api/cut-sheets/domains: real happy path with manufacturer filter delegates to injected getManufacturerDomains", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/domains?manufacturer=Schlage"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.domains.length, 1);
  assert.equal(body.domains[0].domain, "schlage.com");
});

test("GET /api/cut-sheets/domains: real happy path without filter lists all domains from D1", async () => {
  const db = makeFakeDb({ allDomains: [{ id: "d1" }, { id: "d2" }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/domains"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.domains.length, 2);
});

test("POST /api/cut-sheets/domains: real happy path adds an unverified domain via local addManufacturerDomain", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/domains", {
    method: "POST",
    body: JSON.stringify({ manufacturerId: "m1", domain: "Schlage.com" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.domain.verified, false);
  // Real behavior: the write lowercases the domain, but the returned object
  // spreads the original (unlowercased) domainData - not fixed here.
  assert.equal(body.domain.domain, "Schlage.com");
});

test("POST /api/cut-sheets/domains/:domainId/verify: real happy path via local verifyManufacturerDomain", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/domains/d1/verify", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.domainId, "d1");
});
