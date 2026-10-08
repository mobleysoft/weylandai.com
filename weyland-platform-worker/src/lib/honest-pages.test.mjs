// node --test weyland-platform-worker/src/lib/honest-pages.test.mjs
// The pages taken over from the monolith (honest-pages.js) say only what the
// code does: no invented pipeline or takeoff numbers, no machine vision, no
// avatars, no catalogue pricing in PropX, no price on a tool nobody can buy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { honestPage, NOT_ON_SALE } from "./honest-pages.js";

const text = async (r) => (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");

test("/whyweyland goes to the homepage, whatever the spelling", () => {
  for (const p of ["/whyweyland", "/whyweyland/", "/WhyWeyland", "/whyweyland.html"]) {
    const r = honestPage(p);
    assert.equal(r.status, 301, p);
    assert.equal(r.headers.get("Location"), "/");
  }
});

test("/investors and /propx carry none of the claims the code contradicts", async () => {
  const bad = [/seven live products/i, /machine[- ]vision/i, /avatars/i, /Claude Code/i, /margin protection/i, /live catalogue pricing/i, /every product below has a working page/i, /zero hallucinations/i];
  for (const p of ["/investors", "/propx"]) {
    const t = await text(honestPage(p));
    for (const re of bad) assert.doesNotMatch(t, re, p + " " + re);
  }
  assert.match(await text(honestPage("/propx")), /You enter the prices/);
});

test("tools that are not sold show no price and no bundle that does not exist", async () => {
  for (const key of Object.keys(NOT_ON_SALE)) {
    const t = await text(honestPage("/" + key + "/"));
    assert.match(t, /Not on sale/);
    assert.doesNotMatch(t, /\$\d|\/mo\b|TakeoffX Pro|HuntX Pro|SightX Pro|SubX Pro|FRED/, key);
  }
});

test("paths this module does not own are left alone", () => {
  for (const p of ["/", "/pricing", "/propx-app", "/subscribe", "/huntx"]) assert.equal(honestPage(p), null, p);
});
