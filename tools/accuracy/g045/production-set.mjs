#!/usr/bin/env node
// g045: a harvested set read the production way, for SightX's ten-set data: reader A's door rows
// (the shipped text-layer reader) with each row's text as printed (the table's own x-range on that
// row's line), and readPlan over every page (S1 with the g041 stacked-tag and g044 shared-mark rules).
//   node tools/accuracy/g045/production-set.mjs <pdf dir> <sha16>
// Writes tools/accuracy/g045/<sha16>.production.json, which tools/accuracy/g028/build-sets.mjs uses
// in place of the harvest marks for that set. No network access.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getDocument, Util } from "../../../weyland-subx-worker/src/vendor/pdfjs-text.mjs";
import * as TL from "../../../weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs";
import { openPdf, pageItems } from "../truth/pdf.mjs";
import { readPlan } from "../../../weyland-shared/plan-read.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(HERE, "../../..");
const [dir, sha] = process.argv.slice(2);
const cand = JSON.parse(fs.readFileSync(path.join(repo, "tools/corpus/harvest/sightx_candidates.json"))).candidates.find((c) => c.sha16 === sha);
const bytes = fs.readFileSync(path.join(dir, sha + ".pdf"));
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (cand && sha256 !== cand.sha256) throw new Error("hash mismatch");
const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
const rows = [];
for (const p of cand.door_schedule_page_indexes.map((i) => i + 1)) {
  const tl = await TL.pageTextLines({ Util }, await doc.getPage(p));
  const ds = await TL.readDoorScheduleFromLines(tl.lines, { width: tl.width, height: tl.height }, {});
  for (const t of (ds && ds.tables) || []) {
    const lineOf = (y) => tl.lines.reduce((best, l) => (Math.abs(l.y - y) < Math.abs((best ? best.y : 1e9) - y) ? l : best), null);
    const inTable = (L) => (L ? L.words.filter((w) => w.x1 >= t.x0 - 2 && w.x0 <= t.x1 + 2) : []);
    // The table's extent can reach a legend printed beside it (T2507: FINISH TYPES). Its left edge is
    // where rows show a gap wider than 16 text heights (the table's own columns are at most ~13
    // apart); every row of the table is cut there.
    let legendX = Infinity;
    for (const d of t.doors) {
      const L = lineOf(d.source_y), ws = inTable(L);
      for (let i = 1; i < ws.length; i++) if (ws[i].x0 - ws[i - 1].x1 > 16 * (L.h || 9)) { legendX = Math.min(legendX, ws[i].x0); break; }
    }
    for (const d of t.doors) {
      const words = inTable(lineOf(d.source_y)).filter((w) => w.x0 < legendX - 1);
      rows.push({ mark: d.door_number, page: p, y: Math.round(d.source_y), text: words.map((w) => w.str).join(" "), size: d.size || null, width_inches: d.width_inches ?? null, height_inches: d.height_inches ?? null, location: d.remarks && /Room: (.*)$/.test(d.remarks) ? d.remarks.match(/Room: (.*)$/)[1] : null });
    }
  }
}
const pdf = await openPdf(bytes), pages = [];
for (let p = 1; p <= pdf.numPages; p++) pages.push(await pageItems(pdf, p));
const plan = readPlan(pages, rows.map((r) => ({ mark: r.mark, page: r.page, location: r.location })));
const out = { sha16: sha, sha256, source_url: cand.url, reader: "reader A (schedule-text-layer.mjs) + readPlan (weyland-shared/plan-read.js)", rows, plan };
fs.writeFileSync(path.join(HERE, sha + ".production.json"), JSON.stringify(out) + "\n");
console.log(sha, "rows", rows.length, "tags", plan.tags.length, "not on plan", plan.marks_not_on_plan.length, "shared", JSON.stringify(plan.shared_marks));
