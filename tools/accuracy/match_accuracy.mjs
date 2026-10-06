// Accuracy harness for the schedule paste flow (POST /api/cut-sheets/match-batch).
//
// Ground truth: real products sampled from D1 (sample_products_raw.json, pulled with
// wrangler d1 execute). Each product is written the ways an estimator actually types a
// schedule line (canonical, model only, lower case, comma separated, finish suffix, quantity
// prefix). Negative lines that are not products must come back unmatched. Everything goes
// through the live API with an ephemeral trial token, exactly like the homepage.
//
// Usage: node tools/accuracy/match_accuracy.mjs [--base https://weylandai.com] [--limit 320]
// Writes report_<date>.json and report_<date>.md next to this file.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const BASE = args.base || "https://weylandai.com";
const LIMIT = Number(args.limit || 320);
const CAP = 60;

const raw = JSON.parse(readFileSync(join(here, "sample_products_raw.json"), "utf8"));
const products = (Array.isArray(raw) ? raw[0].results : raw.results).slice(0, LIMIT);

const VARIANTS = {
  canonical: (p) => `${p.manufacturer} ${p.base_model}`,
  model_only: (p) => p.base_model,
  lower_case: (p) => `${p.manufacturer} ${p.base_model}`.toLowerCase(),
  comma_separated: (p) => `${p.manufacturer}, ${p.base_model}`,
  finish_suffix: (p) => `${p.manufacturer} ${p.base_model} 626`,
  quantity_prefix: (p) => `2 ea ${p.manufacturer} ${p.base_model}`,
  tab_separated: (p) => `${p.manufacturer}\t${p.base_model}\tper schedule`,
};
const NEGATIVES = [
  "Door 101A HM 3070 LH",
  "See specification section 08 71 00",
  "Hinges per hardware schedule",
  "Frame: welded, 16 ga, primed",
  "Set 03 - Office doors",
  "Closer by others",
  "Kick plate 10 x 34 US32D",
  "Threshold at exterior doors",
  "NOTE: verify hand in field",
  "Qty Description Finish Mfr",
];

async function token() {
  const r = await fetch(`${BASE}/api/auth/ephemeral`, { method: "POST" });
  if (!r.ok) throw new Error("ephemeral auth failed " + r.status);
  return (await r.json()).token;
}

async function matchLines(tok, lines) {
  const r = await fetch(`${BASE}/api/cut-sheets/match-batch`, {
    method: "POST",
    headers: { "Authorization": "Bearer " + tok, "Content-Type": "application/json" },
    body: JSON.stringify({ text: lines.join("\n") }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("match-batch " + r.status + " " + JSON.stringify(data).slice(0, 200));
  return data.results || [];
}

function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

const cases = [];
for (const p of products) for (const [variant, fn] of Object.entries(VARIANTS)) cases.push({ variant, line: fn(p), expect: p });
for (const line of NEGATIVES) cases.push({ variant: "negative", line, expect: null });

const tok = await token();
const t0 = Date.now();
const results = [];
for (let i = 0; i < cases.length; i += CAP) {
  const chunk = cases.slice(i, i + CAP);
  let out;
  try { out = await matchLines(tok, chunk.map((c) => c.line)); }
  catch (e) { console.error("chunk failed:", e.message); out = []; }
  // The parser may drop lines it reads as headers; align by raw text.
  const byRaw = new Map(out.map((r) => [r.raw, r]));
  for (const c of chunk) {
    const r = byRaw.get(c.line) || byRaw.get(c.line.trim()) || null;
    results.push({ ...c, result: r });
  }
  process.stdout.write(`\r${Math.min(i + CAP, cases.length)}/${cases.length}`);
}
process.stdout.write("\n");

function grade(c) {
  const r = c.result;
  if (c.expect === null) return !r || !r.matched ? "true_negative" : "false_positive";
  if (!r) return "dropped_by_parser";
  if (!r.matched) return "miss";
  if (r.product && r.product.id === c.expect.id) return "correct";
  if (r.product && norm(r.product.model) === norm(c.expect.base_model)) return "same_model_other_id";
  return "wrong_product";
}

const byVariant = {};
for (const c of results) {
  const g = grade(c);
  c.grade = g;
  byVariant[c.variant] = byVariant[c.variant] || {};
  byVariant[c.variant][g] = (byVariant[c.variant][g] || 0) + 1;
}
const ms = Date.now() - t0;
const total = results.filter((c) => c.expect).length;
const correct = results.filter((c) => c.grade === "correct" || c.grade === "same_model_other_id").length;
const matchedAny = results.filter((c) => c.expect && c.result && c.result.matched).length;
const wrong = results.filter((c) => c.grade === "wrong_product").length;
const fp = results.filter((c) => c.grade === "false_positive").length;
const summary = {
  base: BASE, date: new Date().toISOString(), products: products.length, lines: cases.length, ms,
  recall: +(correct / total).toFixed(4),
  precision: matchedAny ? +(1 - wrong / matchedAny).toFixed(4) : null,
  false_positive_rate: +(fp / NEGATIVES.length).toFixed(4),
  byVariant,
};
const worst = results.filter((c) => c.grade === "wrong_product" || c.grade === "miss" || c.grade === "dropped_by_parser" || c.grade === "false_positive").slice(0, 60)
  .map((c) => ({ variant: c.variant, line: c.line, grade: c.grade, expected: c.expect ? c.expect.display_name : null, got: c.result && c.result.product ? c.result.product.name : null, manufacturer_parsed: c.result ? c.result.manufacturer : null, model_parsed: c.result ? c.result.model : null }));

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
writeFileSync(join(here, `report_${stamp}.json`), JSON.stringify({ summary, worst, results }, null, 1));
const md = [
  `# Paste-flow match accuracy, ${stamp}`,
  ``,
  `Live API ${BASE}, ${products.length} real products x ${Object.keys(VARIANTS).length} spellings + ${NEGATIVES.length} negatives = ${cases.length} lines, ${ms} ms.`,
  ``,
  `| metric | value |`, `|---|---|`,
  `| recall (right product, any spelling) | ${(summary.recall * 100).toFixed(1)}% |`,
  `| precision (of matched lines, right product) | ${summary.precision == null ? "n/a" : (summary.precision * 100).toFixed(1) + "%"} |`,
  `| false positives on non-product lines | ${fp}/${NEGATIVES.length} |`,
  ``,
  `| spelling | correct | same model, other id | wrong product | miss | dropped |`, `|---|---|---|---|---|---|`,
  ...Object.entries(byVariant).filter(([v]) => v !== "negative").map(([v, g]) => `| ${v} | ${g.correct || 0} | ${g.same_model_other_id || 0} | ${g.wrong_product || 0} | ${g.miss || 0} | ${g.dropped_by_parser || 0} |`),
  ``,
  `## Worst lines (first ${worst.length})`, ``,
  `| spelling | line | grade | expected | got | parsed mfr / model |`, `|---|---|---|---|---|---|`,
  ...worst.map((w) => `| ${w.variant} | ${w.line.replace(/\|/g, "/").replace(/\t/g, " TAB ")} | ${w.grade} | ${w.expected || ""} | ${w.got || ""} | ${w.manufacturer_parsed || ""} / ${w.model_parsed || ""} |`),
  ``,
].join("\n");
writeFileSync(join(here, `report_${stamp}.md`), md);
console.log(JSON.stringify(summary, null, 1));
console.log("worst (first 12):");
for (const w of worst.slice(0, 12)) console.log(` ${w.grade.padEnd(20)} ${w.variant.padEnd(16)} ${w.line.slice(0, 48).padEnd(50)} expected=${(w.expected || "").slice(0, 30)} got=${(w.got || "").slice(0, 30)}`);
