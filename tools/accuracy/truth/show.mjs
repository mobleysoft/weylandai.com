#!/usr/bin/env node
// Print one truth record in short: node tools/accuracy/truth/show.mjs <sha16 | path to record> [--all]
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const arg = process.argv[2];
const f = existsSync(arg) ? arg : join(resolve(here, "../../corpus/harvest/truth"), arg + ".json");
const r = JSON.parse(readFileSync(f, "utf8"));
const all = process.argv.includes("--all");
console.log(r.sha16, r.file, "|", r.family, "| tier", r.tier, "| class", r.triage_class, "(" + r.triage_from + ")");
console.log("pages", JSON.stringify(r.pages), "| text", JSON.stringify(r.text_layer));
console.log("readers", JSON.stringify(r.readers));
console.log("agreement", r.agreement_rate, r.rows_agreed + "/" + r.rows_total, "| doors", JSON.stringify(r.agreement && r.agreement.doors && { ...r.agreement.doors }), "| items", JSON.stringify(r.agreement && r.agreement.items), "| sets", JSON.stringify(r.agreement && r.agreement.sets));
for (const [k, o] of Object.entries(r.oracles || {})) console.log("oracle", k, o.applicable ? o.pass + "/" + o.total + (o.examples.length ? " e.g. " + o.examples.slice(0, all ? 12 : 3).join(" || ") : "") : "n/a: " + o.reason);
for (const c of r.calibration || []) {
  const s = (x) => "rows " + x.rows_found + "/" + x.expected_rows + ", fully right " + x.rows_fully_right + ", fields " + x.fields_right + "/" + x.fields_total;
  console.log("calibration", c.expected, "| A:", s(c.reader_a), "| B:", s(c.reader_b), "| agreed:", s(c.agreed));
  if (all) for (const k of ["reader_a", "reader_b", "agreed"]) for (const w of c[k].wrong.slice(0, 10)) console.log("   ", k, JSON.stringify(w));
}
console.log("disagreements", r.disagreement_count);
for (const d of r.disagreements.slice(0, all ? 40 : 10)) console.log("  ", JSON.stringify(d));
if (r.reader_notes) console.log("notes", r.reader_notes.join(" | "));
