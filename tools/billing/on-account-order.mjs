#!/usr/bin/env node
// tools/billing/on-account-order.mjs - g052: the operator's order for a first submittal on account.
//
//   WEYLAND_OPERATOR_SECRET=<the platform worker's secret> node tools/billing/on-account-order.mjs \
//     --email jmobleyworks+mobleycontracting@gmail.com --name "Mobley Contracting" \
//     --terms-accepted-at 2026-10-09T23:03:00-04:00 [--days 30] [--base https://weylandai.com]
//
// POST /api/billing/on-account (weyland-platform-worker/src/routes/on-account.js): Stripe sends the
// customer a $100 invoice (no card, never charged automatically) and the purchase is held for the
// email; the account takes it on its next sign-in with an emailed code. The secret is read from the
// environment and never printed. Prints the purchase and the invoice (id, number, status, amount, due).
const args = process.argv.slice(2);
const value = (k) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : undefined; };
const secret = process.env.WEYLAND_OPERATOR_SECRET;
if (!secret) { console.error("WEYLAND_OPERATOR_SECRET is not set"); process.exit(2); }
const base = (value("base") || "https://weylandai.com").replace(/\/$/, "");
const body = {
  email: value("email"), customer_name: value("name"), product_id: "weyland-first-submittal",
  terms_accepted_at: value("terms-accepted-at"), ...(value("days") ? { days_until_due: Number(value("days")) } : {})
};
const res = await fetch(base + "/api/billing/on-account", { method: "POST", headers: { "Content-Type": "application/json", "X-WeylandAI-Operator-Secret": secret }, body: JSON.stringify(body) });
const out = await res.json().catch(() => ({}));
// g056: the route answers 404 alike for no route and a wrong secret (and past 10 tries a minute).
if (res.status === 404) out.hint = "404: the route is not deployed, the secret is wrong, or too many tries this minute";
// 502 with detail.recorded: the invoice is recorded but not sent; running this again finishes it.
console.log(JSON.stringify({ status: res.status, ...out }, null, 2));
process.exit(res.status === 201 || res.status === 200 ? 0 : 1);
