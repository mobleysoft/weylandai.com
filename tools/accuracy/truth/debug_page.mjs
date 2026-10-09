#!/usr/bin/env node
// Debug one page through both readers: node tools/accuracy/truth/debug_page.mjs <file.pdf> <page> [door|hw]
import { readFileSync } from "node:fs";
import { openPdf, pageItems, pageRules } from "./pdf.mjs";
import { readDoorsB, readHardwareB, ruleTables } from "./reader_b.mjs";
import { readA } from "./reader_a.mjs";

const [file, p, kind = "door"] = process.argv.slice(2);
const pdf = await openPdf(readFileSync(file));
const items = await pageItems(pdf, +p);
let t = Date.now();
const rules = await pageRules(pdf, +p);
console.log("rules", rules.h.length, "h", rules.v.length, "v", Date.now() - t, "ms; tables", ruleTables(rules).map((T) => [T.x0, T.y0, T.x1, T.y1].map(Math.round).join(",")).join(" | "));
if (kind === "door") {
  const b = readDoorsB(items.items, rules, items);
  console.log("B tables", JSON.stringify(b.tables));
  for (const d of b.doors.slice(0, 80)) console.log("B", JSON.stringify(d));
  const a = await readA(pdf, +p, "door_schedule");
  for (const d of (a.doors || []).slice(0, 80)) console.log("A", JSON.stringify(d));
} else {
  const b = readHardwareB(items.items, rules, items);
  console.log("B fences", b.fences);
  for (const g of b.groups) { console.log("B", g.set, "|", g.name, "| doors", g.doors.join(",")); for (const i of g.items) console.log("   ", JSON.stringify(i)); }
  const a = await readA(pdf, +p, "hardware_schedule");
  for (const g of a.groups || []) { console.log("A", g.set, "|", g.name, "| doors", g.doors.join(",")); for (const i of g.items) console.log("   ", JSON.stringify(i)); }
}
