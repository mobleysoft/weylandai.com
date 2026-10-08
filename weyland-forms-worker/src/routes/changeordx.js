// weyland-forms-worker/src/routes/changeordx.js
//
// ChangeOrdX (2026-10-08): change orders priced from the contract. The old
// ChangeOrdX printed whatever cost and schedule impact the user typed. Here
// a change order starts from the customer's own PropX proposal (the base
// contract): added or deleted items are priced at that contract's unit
// prices, labor at the rate entered, then overhead, profit, the contract's
// tax rate on materials and bond, and the contract sum is carried forward:
// original sum + approved change orders + this one = new sum (and days).
// Change orders are numbered per contract and kept, so the next one starts
// from the right sum.
//   GET  /api/forms/changeordx/contracts             your PropX proposals with their lines and change orders
//   POST /api/forms/changeordx/preview               {proposalId, items, labor, markup, ...} -> priced (free)
//   POST /api/forms/changeordx/save                  same -> stored as the next number, status "submitted"
//   POST /api/forms/changeordx/:id/status            {status: approved|rejected|submitted}
//   GET  /api/forms/changeordx/:id/pdf               the change order PDF (ChangeOrdX, the suite or the $100 offer)

import { jsonResponse3 } from "../lib/json-response.js";
import { newDoc, title, field, para, table, small, signature, finish } from "../lib/pdf.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(r2(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUSES = new Set(["submitted", "approved", "rejected"]);

let ready = false;
export function resetForTests() { ready = false; }
async function ensureTable(env) {
  if (ready) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS forms_change_orders (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, proposal_id TEXT NOT NULL, number INTEGER NOT NULL,
    title TEXT, reason TEXT, reference TEXT, body_json TEXT NOT NULL, amount REAL NOT NULL, days INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
  ready = true;
}

function contractLines(p) {
  let lines = [];
  try { lines = JSON.parse(p.line_item_snapshot || "[]"); } catch (_) { lines = []; }
  return (Array.isArray(lines) ? lines : []).map((l, i) => ({
    ref: String(i),
    description: [l.door_type || l.description, l.material, l.size, l.fire_rating].filter(Boolean).join(" · ") || "Item",
    unit_price: r2(l.unit_price ?? l.unitPrice),
    quantity: Number(l.quantity) || 0,
  }));
}

/**
 * Price a change order. items: [{action: add|delete, ref?, description?, qty, unit_price?}]
 * (a ref prices the line at the contract's unit price); labor: [{description, hours, rate}];
 * markup: {overhead, profit, bond} as percents.
 */
export function priceChange(contract, body, prior = []) {
  const lines = contractLines(contract);
  const byRef = new Map(lines.map((l) => [l.ref, l]));
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 200).map((it) => {
    const base = it.ref != null && byRef.has(String(it.ref)) ? byRef.get(String(it.ref)) : null;
    const qty = Math.max(0, Number(it.qty) || 0);
    const unit = base ? base.unit_price : r2(it.unit_price);
    const sign = it.action === "delete" ? -1 : 1;
    return { action: sign < 0 ? "delete" : "add", description: String(base ? base.description : (it.description || "Item")).slice(0, 200), qty, unit_price: unit, priced_from: base ? "contract" : "entered", ext: r2(sign * qty * unit) };
  }).filter((x) => x.qty > 0);
  const labor = (Array.isArray(body.labor) ? body.labor : []).slice(0, 50).map((l) => {
    const hours = Math.max(0, Number(l.hours) || 0), rate = Math.max(0, Number(l.rate) || 0);
    return { description: String(l.description || "Labor").slice(0, 200), hours, rate, ext: r2((l.action === "delete" ? -1 : 1) * hours * rate) };
  }).filter((x) => x.hours > 0);
  const pct = (v) => Math.min(100, Math.max(0, Number(v) || 0)) / 100;
  const mk = body.markup || {};
  const materials = r2(items.reduce((s, x) => s + x.ext, 0));
  const laborTotal = r2(labor.reduce((s, x) => s + x.ext, 0));
  const subtotal = r2(materials + laborTotal);
  const overhead = r2(subtotal * pct(mk.overhead));
  const profit = r2((subtotal + overhead) * pct(mk.profit));
  const taxRate = Number(contract.tax_rate) || 0;
  const tax = r2(materials * taxRate);
  const bond = r2((subtotal + overhead + profit + tax) * pct(mk.bond));
  const total = r2(subtotal + overhead + profit + tax + bond);
  const original = r2(contract.grand_total);
  const approvedBefore = r2(prior.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount || 0), 0));
  const daysBefore = prior.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.days || 0), 0);
  const days = Math.round(Number(body.days) || 0);
  return {
    items, labor,
    markup: { overhead: pct(mk.overhead) * 100, profit: pct(mk.profit) * 100, bond: pct(mk.bond) * 100, taxRate },
    totals: { materials, labor: laborTotal, subtotal, overhead, profit, tax, bond, total },
    contract: { original, approvedBefore, before: r2(original + approvedBefore), after: r2(original + approvedBefore + total), daysBefore, days, daysAfter: daysBefore + days },
  };
}

async function loadContract(env, userId, proposalId) {
  const p = await env.DB.prepare("SELECT id, quote_number, client_name, project_address, grand_total, tax_rate, line_item_snapshot, created_at FROM proposals WHERE id = ? AND user_id = ?").bind(proposalId, userId).first();
  if (!p) return null;
  await ensureTable(env);
  const prior = (await env.DB.prepare("SELECT id, number, title, amount, days, status, created_at FROM forms_change_orders WHERE proposal_id = ? AND user_id = ? ORDER BY number").bind(proposalId, userId).all()).results || [];
  return { p, prior };
}

export async function changeOrderPdf(row, contract, priced, company) {
  const w = await newDoc({ title: `Change Order ${row.number}`, footer: `Change Order ${row.number} · Quote ${contract.quote_number || ""} · WeylandAI ChangeOrdX` });
  title(w, `CHANGE ORDER No. ${row.number}`, { size: 17 });
  small(w, `Status: ${row.status.toUpperCase()} · ${new Date(row.created_at).toISOString().slice(0, 10)}`, { center: true });
  w.y -= 10;
  for (const [l, v] of [["Project:", contract.project_address], ["To:", contract.client_name], ["From:", company], ["Base contract:", `Quote ${contract.quote_number || ""} dated ${String(contract.created_at || "").slice(0, 10)}`], ["Title:", row.title], ["Reference:", row.reference]]) field(w, l, v || "");
  if (row.reason) { para(w, "Description of change:", { font: w.fonts.serifBold, size: 11, gapAfter: 2 }); para(w, row.reason, { size: 11 }); }
  if (priced.items.length) table(w, [{ head: "", width: 0.08 }, { head: "ITEM", width: 0.46 }, { head: "QTY", width: 0.1, align: "right" }, { head: "UNIT", width: 0.16, align: "right" }, { head: "AMOUNT", width: 0.2, align: "right" }],
    priced.items.map((x) => [x.action === "delete" ? "DEL" : "ADD", x.description + (x.priced_from === "contract" ? " (contract unit price)" : ""), String(x.qty), money(x.unit_price), money(x.ext)]), { size: 9 });
  if (priced.labor.length) table(w, [{ head: "LABOR", width: 0.54 }, { head: "HOURS", width: 0.1, align: "right" }, { head: "RATE", width: 0.16, align: "right" }, { head: "AMOUNT", width: 0.2, align: "right" }],
    priced.labor.map((x) => [x.description, String(x.hours), money(x.rate), money(x.ext)]), { size: 9 });
  const t = priced.totals, m = priced.markup;
  table(w, [{ head: "PRICING", width: 0.7 }, { head: "", width: 0.3, align: "right" }], [
    ["Materials", money(t.materials)], ["Labor", money(t.labor)], ["Subtotal", money(t.subtotal)],
    [`Overhead (${m.overhead}%)`, money(t.overhead)], [`Profit (${m.profit}%)`, money(t.profit)],
    [`Sales tax on materials (${r2(m.taxRate * 100)}%, from the contract)`, money(t.tax)], [`Bond (${m.bond}%)`, money(t.bond)],
    ["THIS CHANGE ORDER", money(t.total)],
  ], { size: 10 });
  const c = priced.contract;
  table(w, [{ head: "CONTRACT SUM", width: 0.7 }, { head: "", width: 0.3, align: "right" }], [
    ["Original contract sum", money(c.original)], ["Net change by previously approved change orders", money(c.approvedBefore)],
    ["Contract sum prior to this change order", money(c.before)], ["This change order", money(t.total)], ["New contract sum including this change order", money(c.after)],
    ["Contract time changed by previously approved change orders (days)", String(c.daysBefore)], ["Contract time change by this change order (days)", String(c.days)],
  ], { size: 10 });
  signature(w, [{ label: "Submitted by:", caption: `(${company || "Subcontractor"}, signature, date)` }, { label: "Accepted by:", caption: "(Contractor, signature, date)" }]);
  return finish(w);
}

export function registerChangeOrdxRoutes(router, { authenticate }) {
  async function who(request, env) {
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to price change orders against your PropX contracts." }, 401) };
    return { userId: String(user.userId) };
  }

  router.get("/api/forms/changeordx/contracts", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    await ensureTable(env);
    const ps = (await env.DB.prepare("SELECT id, quote_number, client_name, project_address, grand_total, tax_rate, line_item_snapshot, created_at FROM proposals WHERE user_id = ? ORDER BY created_at DESC LIMIT 30").bind(a.userId).all()).results || [];
    const out = [];
    for (const p of ps) {
      const cos = (await env.DB.prepare("SELECT id, number, title, amount, days, status, created_at FROM forms_change_orders WHERE proposal_id = ? AND user_id = ? ORDER BY number").bind(p.id, a.userId).all()).results || [];
      out.push({ id: p.id, quote_number: p.quote_number, client_name: p.client_name, project_address: p.project_address, grand_total: p.grand_total, tax_rate: p.tax_rate, created_at: p.created_at, lines: contractLines(p), change_orders: cos });
    }
    return jsonResponse3({ success: true, contracts: out });
  });

  router.post("/api/forms/changeordx/preview", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const body = await request.json().catch(() => ({}));
    const c = await loadContract(env, a.userId, String(body.proposalId || ""));
    if (!c) return jsonResponse3({ success: false, message: "Choose one of your PropX proposals as the base contract." }, 404);
    return jsonResponse3({ success: true, number: (c.prior.at(-1)?.number || 0) + 1, priced: priceChange(c.p, body, c.prior) });
  });

  router.post("/api/forms/changeordx/save", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const body = await request.json().catch(() => ({}));
    const c = await loadContract(env, a.userId, String(body.proposalId || ""));
    if (!c) return jsonResponse3({ success: false, message: "Choose one of your PropX proposals as the base contract." }, 404);
    const priced = priceChange(c.p, body, c.prior);
    if (!priced.items.length && !priced.labor.length) return jsonResponse3({ success: false, message: "Add at least one item or labor line." }, 400);
    const now = new Date().toISOString();
    const row = { id: crypto.randomUUID(), number: (c.prior.at(-1)?.number || 0) + 1, title: String(body.title || "").slice(0, 160), reason: String(body.reason || "").slice(0, 3000), reference: String(body.reference || "").slice(0, 160) };
    const stored = { items: body.items || [], labor: body.labor || [], markup: body.markup || {}, days: body.days || 0, company: String(body.company || "").slice(0, 160) };
    await env.DB.prepare("INSERT INTO forms_change_orders (id, user_id, proposal_id, number, title, reason, reference, body_json, amount, days, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)")
      .bind(row.id, a.userId, c.p.id, row.number, row.title, row.reason, row.reference, JSON.stringify(stored), priced.totals.total, priced.contract.days, now, now).run();
    return jsonResponse3({ success: true, changeOrder: { ...row, amount: priced.totals.total, days: priced.contract.days, status: "submitted" }, pdfUrl: `/api/forms/changeordx/${row.id}/pdf` });
  });

  router.post("/api/forms/changeordx/:id/status", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    await ensureTable(env);
    const body = await request.json().catch(() => ({}));
    if (!STATUSES.has(body.status)) return jsonResponse3({ success: false, message: "status is submitted, approved or rejected" }, 400);
    const id = request.params?.id;
    await env.DB.prepare("UPDATE forms_change_orders SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind(body.status, new Date().toISOString(), id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.get("/api/forms/changeordx/:id/pdf", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    await ensureTable(env);
    const row = await env.DB.prepare("SELECT * FROM forms_change_orders WHERE id = ? AND user_id = ?").bind(request.params?.id, a.userId).first();
    if (!row) return jsonResponse3({ success: false, message: "Change order not found." }, 404);
    if (!(await outputAccess(env, a.userId, "changeordx")).paid) return jsonResponse3(paymentRequired("The change order PDF"), 402);
    const c = await loadContract(env, a.userId, row.proposal_id);
    if (!c) return jsonResponse3({ success: false, message: "Its base contract is gone." }, 404);
    const stored = JSON.parse(row.body_json || "{}");
    const prior = c.prior.filter((x) => x.number < row.number);
    const priced = priceChange(c.p, stored, prior);
    const bytes = await changeOrderPdf(row, c.p, priced, stored.company);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="ChangeOrder-${row.number}.pdf"`, "Cache-Control": "no-store" } });
  });
}
