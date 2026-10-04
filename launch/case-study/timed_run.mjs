#!/usr/bin/env node
// Timed end-to-end run through the live WeylandAI suite, measured against
// production with an ephemeral (no-account) session. Prints a table of wall-
// clock timings so the number on the site is a measured one.
//
// Usage:
//   node launch/case-study/timed_run.mjs                 # sample package (6 openings)
//   node launch/case-study/timed_run.mjs specs.json      # a real bid: JSON array of
//                                                        # {manufacturer, model} lines
// Output: JSON on stdout + a human table on stderr. Nothing is stored server-side.
import fs from "fs";

const BASE = process.env.WEYLAND_BASE || "https://weylandai.com";
const specsFile = process.argv[2];
const SAMPLE_SPECS = [
  { manufacturer: "LCN", model: "4040XP" },
  { manufacturer: "Von Duprin", model: "99" },
  { manufacturer: "Schlage", model: "L9080" },
  { manufacturer: "Ives", model: "5BB1" },
  { manufacturer: "LCN", model: "1461" },
  { manufacturer: "Hager", model: "BB1279" },
];
const specs = specsFile ? JSON.parse(fs.readFileSync(specsFile, "utf8")) : SAMPLE_SPECS;

const t = () => performance.now();
const steps = [];
async function timed(name, fn) {
  const a = t();
  try { const out = await fn(); steps.push({ step: name, ms: Math.round(t() - a), ok: true }); return out; }
  catch (e) { steps.push({ step: name, ms: Math.round(t() - a), ok: false, error: String(e.message || e) }); throw e; }
}

const run = { base: BASE, startedAt: new Date().toISOString(), specCount: specs.length, source: specsFile ? "real-bid-file" : "sample-package" };
try {
  const token = await timed("ephemeral session", async () => {
    const r = await fetch(BASE + "/api/auth/ephemeral", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const d = await r.json(); if (!r.ok) throw new Error("ephemeral " + r.status + " " + JSON.stringify(d).slice(0, 120));
    return d.token || d.ephemeral_token || d.access_token;
  });
  const auth = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };

  const matches = [];
  for (const s of specs) {
    const m = await timed("cutsheetx match " + s.manufacturer + " " + s.model, async () => {
      const r = await fetch(BASE + "/api/cut-sheets/match", { method: "POST", headers: auth, body: JSON.stringify(s) });
      const d = await r.json(); if (!r.ok) throw new Error("match " + r.status);
      return { matched: !!d.matched, confidence: d.confidence, matchType: d.matchType, product: d.product && (d.product.name || (d.product.manufacturer + " " + d.product.model)), sheets: (d.cutSheets || []).length };
    }).catch(e => ({ matched: false, error: e.message }));
    matches.push(Object.assign({ spec: s }, m));
  }

  const proposal = await timed("propx proposal (json)", async () => {
    const r = await fetch(BASE + "/api/proposals/demo", { method: "POST", headers: auth, body: JSON.stringify({ taxRate: 0.0825, clientName: "Timed run" }) });
    const d = await r.json(); if (!r.ok || !d.success) throw new Error("demo " + r.status);
    return { lineItemCount: d.lineItemCount, grandTotal: d.totals && d.totals.grandTotal };
  });
  const pdf = await timed("propx proposal (real pdf)", async () => {
    const r = await fetch(BASE + "/api/proposals/demo", { method: "POST", headers: auth, body: JSON.stringify({ taxRate: 0.0825, clientName: "Timed run", format: "pdf" }) });
    if (!r.ok) throw new Error("pdf " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    return { bytes: buf.length, isPdf: buf.subarray(0, 5).toString() === "%PDF-" };
  });

  run.matches = matches; run.proposal = proposal; run.pdf = pdf;
} catch (e) {
  run.failed = String(e.message || e);
}
run.steps = steps;
run.totalMs = steps.reduce((a, s) => a + s.ms, 0);
run.matchedCount = (run.matches || []).filter(m => m.matched).length;
run.finishedAt = new Date().toISOString();

console.error("\nstep".padEnd(44) + "ms".padStart(8) + "  ok");
for (const s of steps) console.error(s.step.padEnd(43) + String(s.ms).padStart(8) + "  " + (s.ok ? "yes" : "NO " + (s.error || "")));
console.error("total".padEnd(43) + String(run.totalMs).padStart(8) + "\nmatched " + run.matchedCount + "/" + run.specCount + " spec lines; proposal " + (run.proposal ? "ok" : "failed") + "; pdf " + (run.pdf && run.pdf.isPdf ? run.pdf.bytes + " bytes" : "failed"));
console.log(JSON.stringify(run, null, 2));
