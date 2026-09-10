// Real, runnable verification for src/lib/access-request.js - run with:
//   node --test src/lib/access-request.test.mjs
//
// The pure half of the request-access queue: input validation against the
// closed TRADES vocabulary (the same set migrations/20260909_access_requests.sql
// enforces with a CHECK constraint, on purpose - a new bucket is a change in
// BOTH places), free-text cleaning, and the per-isolate sliding-window rate
// limiter that backstops the public form.

import { test } from "node:test";
import assert from "node:assert/strict";
import { TRADES, ACCESS_REQUEST_LIMITS, validateAccessRequest, makeRateLimiter } from "./access-request.js";

test("TRADES is the closed vocabulary the migration's CHECK constraint enforces", () => {
  assert.deepEqual(TRADES, ["doors_glazing", "plumbing", "hvac", "electrical", "other"]);
});

test("a well-formed request validates and normalizes the email to lower case", () => {
  const r = validateAccessRequest({ email: "  Ron@Example.COM ", name: "Ron", company: "Argo", role: "Owner", trade: "doors_glazing", message: "hello" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, {});
  assert.equal(r.value.email, "ron@example.com");
  assert.equal(r.value.trade, "doors_glazing");
  assert.equal(r.value.trade_other, null);
  assert.equal(r.value.name, "Ron");
});

test("a non-object body is rejected with a body error", () => {
  const r = validateAccessRequest("nope");
  assert.equal(r.ok, false);
  assert.equal(r.errors.body, "JSON object required");
});

test("missing or malformed email is a field error", () => {
  for (const email of [undefined, "", "not-an-email", "a b@c.com", "x@y"]) {
    const r = validateAccessRequest({ email, trade: "plumbing" });
    assert.equal(r.ok, false, `email ${JSON.stringify(email)} should fail`);
    assert.equal(r.errors.email, "A valid email address is required");
  }
});

test("trade outside the closed vocabulary is a field error naming the allowed set", () => {
  const r = validateAccessRequest({ email: "a@b.co", trade: "roofing" });
  assert.equal(r.ok, false);
  assert.equal(r.errors.trade, `trade must be one of: ${TRADES.join(", ")}`);
});

test("trade 'other' requires trade_other; any other trade nulls it", () => {
  const missing = validateAccessRequest({ email: "a@b.co", trade: "other" });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.trade_other, "Tell us your trade when choosing 'other'");

  const given = validateAccessRequest({ email: "a@b.co", trade: "other", trade_other: "Glazing subs" });
  assert.equal(given.ok, true);
  assert.equal(given.value.trade_other, "Glazing subs");

  const ignored = validateAccessRequest({ email: "a@b.co", trade: "hvac", trade_other: "should be dropped" });
  assert.equal(ignored.ok, true);
  assert.equal(ignored.value.trade_other, null);
});

test("free text is cleaned: control chars and angle brackets stripped, whitespace collapsed, empty becomes null", () => {
  const r = validateAccessRequest({ email: "a@b.co", trade: "hvac", name: "  <b>Ron</b>  Helms  ", company: "   ", message: "line1\n\n  line2" });
  assert.equal(r.ok, true);
  assert.equal(r.value.name, "bRon/b Helms");
  assert.equal(r.value.company, null);
  assert.equal(r.value.message, "line1 line2");
});

test("free text over its limit is a field error citing the limit, not silently truncated", () => {
  const r = validateAccessRequest({ email: "a@b.co", trade: "hvac", name: "x".repeat(ACCESS_REQUEST_LIMITS.name + 1) });
  assert.equal(r.ok, false);
  assert.equal(r.errors.name, `name is limited to ${ACCESS_REQUEST_LIMITS.name} characters`);
});

test("rate limiter allows `limit` hits per key per window, then refuses until the window slides", () => {
  let now = 1_000_000;
  const allow = makeRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });
  assert.equal(allow("k"), true);
  assert.equal(allow("k"), true);
  assert.equal(allow("k"), true);
  assert.equal(allow("k"), false, "4th hit inside the window is refused");
  assert.equal(allow("other"), true, "keys are independent");
  now += 60_001;
  assert.equal(allow("k"), true, "window slid: allowed again");
});
