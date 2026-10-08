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

test("routes: preview is free; every statutory state fills; the PDF needs an account and payment", async () => {
  const guest = setup(null, false);
  const p = await (await guest("/api/forms/lienx/preview", { state: "NV", kind: "unconditional_final", values: VALUES })).json();
  assert.equal(p.waiver.cite, "Nev. Rev. Stat. § 108.2457(5)");
  const ga = await (await guest("/api/forms/lienx/preview", { state: "GA", kind: "conditional_progress", values: { ...VALUES, date: "October 8, 2026", county: "Fulton", city: "Atlanta" } })).json();
  assert.ok(ga.waiver.blocks.some((b) => b.text === "GIVEN UNDER HAND AND SEAL THIS 8th DAY OF October, 2026."));
  assert.ok(ga.waiver.blocks.some((b) => /CITY OF Atlanta, COUNTY OF Fulton/.test(b.text || "")));
  assert.equal(ga.waiver.minFont, 12);
  const ca = await (await guest("/api/forms/lienx/preview", { state: "CA", kind: "unconditional_final", values: { ...VALUES, disputedAmount: "1200" } })).json();
  assert.equal(ca.waiver.blocks[1].t, "notice");
  assert.ok(ca.waiver.blocks.some((b) => b.label === "Disputed claims for extras in the amount of:" && b.value === "$1,200.00"));
  const mi = await (await guest("/api/forms/lienx/preview", { state: "MI", kind: "unconditional_progress", values: { ...VALUES, coversAll: "does not" } })).json();
  assert.ok(mi.waiver.blocks.some((b) => /\[ \] does \[X\] does not cover/.test(b.text || "")));
  assert.equal((await guest("/api/forms/lienx/pdf", { state: "AZ", values: VALUES })).status, 401);
  assert.equal((await setup({ ephemeral: true }, false)("/api/forms/lienx/pdf", { state: "AZ", values: VALUES })).status, 401);
  assert.equal((await setup({ userId: "u1" }, false)("/api/forms/lienx/pdf", { state: "AZ", values: VALUES })).status, 402);
  const res = await setup({ userId: "u1" }, true)("/api/forms/lienx/pdf", { state: "AZ", kind: "unconditional_final", values: VALUES });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
  const doc = await PDFDocument.load(await res.arrayBuffer());
  assert.ok(doc.getPageCount() >= 1);
  const states = await (await guest("/api/forms/lienx/states")).json();
  assert.deepEqual(states.statutory.map((s) => s.code), ["AZ", "NV", "FL", "TX", "MI", "WY", "CA", "UT", "GA", "MS"]);
});

test("Mississippi's notice stays on the face of the form: one page even with long entries", async () => {
  const { filledWaiver, waiverPdf } = await import("../src/routes/lienx.js");
  for (const kind of ["conditional_progress", "unconditional_final"]) {
    const long = { ...VALUES, propertyDescription: "Lot 14, Block C, Riverside Commons Subdivision, as recorded in Plat Book 112, Page 45, Hinds County, together with all improvements thereon, 2200 Riverside Drive, Jackson, MS 39202".repeat(2), jobDescription: "hollow metal doors and frames, wood doors, finish hardware, access control rough-in", project: "Riverside Commons Phase II", county: "Hinds", city: "Jackson", signer: "Pat Lee" };
    const doc = await PDFDocument.load(await waiverPdf(filledWaiver("MS", kind, long)));
    assert.equal(doc.getPageCount(), 1, kind);
  }
});
