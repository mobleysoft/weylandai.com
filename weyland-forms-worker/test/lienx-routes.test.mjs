import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { NativeRouter } from "../src/lib/router.js";
import { registerLienxRoutes, filledWaiver } from "../src/routes/lienx.js";

const VALUES = { company: "Precision Auto Doors LLC", customer: "Austin Bridge & Road", owner: "Berryessa USD", amount: "48,250", project: "Majestic Way ES", jobDescription: "1855 Lucretia Ave, San Jose", checkMaker: "Austin Bridge & Road", payee: "Precision Auto Doors LLC", throughDate: "September 30, 2026", date: "October 8, 2026" };

function db(paid) {
  return { prepare(sql) { const st = { bind() { return st; },
    async first() { return sql.includes("FROM users") ? { subscription_tier: paid ? "subconp" : "free", subscription_status: paid ? "active" : "trialing", trial_ends_at: null } : null; },
    async all() { return { results: [] }; } }; return st; } };
}
function setup(user, paid) {
  const r = new NativeRouter();
  registerLienxRoutes(r, { authenticate: async () => (user ? { user } : { error: new Response("{}", { status: 401 }) }) });
  return (path, body) => r.handle(new Request("https://weylandai.com" + path, body ? { method: "POST", body: JSON.stringify(body) } : {}), { DB: db(paid) }, {});
}

test("an Arizona conditional progress waiver fills the statute's blanks", () => {
  const w = filledWaiver("AZ", "conditional_progress", VALUES);
  assert.equal(w.statutory, true);
  const body = w.blocks.find((b) => b.t === "para").text;
  assert.match(body, /^On receipt by the undersigned of a check from Austin Bridge & Road in the sum of \$48,250\.00 payable to Precision Auto Doors LLC and when the check/);
  assert.match(body, /on the job of Berryessa USD located at 1855 Lucretia Ave, San Jose to the following extent/);
  assert.match(body, /through September 30, 2026 only/);
});

test("Florida's DATED line takes the day and the year apart", () => {
  const w = filledWaiver("FL", "conditional_final", VALUES);
  assert.ok(w.blocks.some((b) => b.text === "DATED on October 8, 2026."));
});

test("routes: preview is free; California is refused; the PDF needs an account and payment", async () => {
  const guest = setup(null, false);
  const p = await (await guest("/api/forms/lienx/preview", { state: "NV", kind: "unconditional_final", values: VALUES })).json();
  assert.equal(p.waiver.cite, "Nev. Rev. Stat. § 108.2457(5)");
  assert.equal((await guest("/api/forms/lienx/preview", { state: "CA", kind: "conditional_progress", values: VALUES })).status, 422);
  assert.equal((await guest("/api/forms/lienx/pdf", { state: "AZ", values: VALUES })).status, 401);
  assert.equal((await setup({ ephemeral: true }, false)("/api/forms/lienx/pdf", { state: "AZ", values: VALUES })).status, 401);
  assert.equal((await setup({ userId: "u1" }, false)("/api/forms/lienx/pdf", { state: "AZ", values: VALUES })).status, 402);
  const res = await setup({ userId: "u1" }, true)("/api/forms/lienx/pdf", { state: "AZ", kind: "unconditional_final", values: VALUES });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
  const doc = await PDFDocument.load(await res.arrayBuffer());
  assert.ok(doc.getPageCount() >= 1);
  const states = await (await guest("/api/forms/lienx/states")).json();
  assert.deepEqual(states.statutory.map((s) => s.code), ["AZ", "NV", "FL"]);
});
