#!/usr/bin/env node
// g041: S1 placement with reader A's production rows, before and after the stacked-tag rule.
//
//   node tools/accuracy/g041/measure.mjs <dir holding harvest/<sha16>.pdf files as <sha16>.pdf>
//
// For T2507 (192a16af8f31ae0c), R2502 (7478006f7fd5b43c) and T2504 (e3d0cc1bc22fd824): reader A
// reads the door schedule pages (as tools/accuracy/g020/plan-report.mjs does), then readPlan places
// the rows. "exact" counts tags matched as printed; "stacked" counts tags the g041 rule matched
// (number with a letter stacked on it). Bar: T2507 46 of 46 placed; R2502 and T2504 unchanged
// exact counts and no stacked tag that the schedule's own exact tags already cover. Writes
// tools/accuracy/g041/measure.json and prints one line per set. No network access.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { openPdf, pageItems } from "../truth/pdf.mjs";
import { readA } from "../truth/reader_a.mjs";
import { readPlan } from "../../../weyland-shared/plan-read.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(HERE, "../../..");
const dir = process.argv[2];
if (!dir) throw new Error("Usage: node tools/accuracy/g041/measure.mjs <pdf dir>");
const SETS = ["192a16af8f31ae0c", "7478006f7fd5b43c", "e3d0cc1bc22fd824"];
const cands = JSON.parse(fs.readFileSync(path.join(repo, "tools/corpus/harvest/sightx_candidates.json"))).candidates;
const doorPage = (t) => /\bDOOR\b/i.test(t) && /\bSCHEDULE\b/i.test(t) && /\b(HARDWARE|HDWR?|HW|H\/W|HDW\.?\s*SET|SET|GROUP)\b/i.test(t) && /\b(MARK|TAG|NO\.?|NUMBER|#)\b/i.test(t);
const out = [];
for (const sha of SETS) {
  const c = cands.find((x) => x.sha16 === sha);
  const bytes = fs.readFileSync(path.join(dir, sha + ".pdf"));
  if (c && createHash("sha256").update(bytes).digest("hex") !== c.sha256) throw new Error("hash mismatch " + sha);
  const pdf = await openPdf(bytes), pages = [], doors = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pageItems(pdf, p); pages.push(page);
    if (page.items.length >= 15 && doorPage(page.items.map((i) => i.str).join("\n"))) {
      const a = await readA(pdf, p, "door_schedule");
      doors.push(...(a.doors || []).map((d) => ({ page: p, ...d })));
    }
  }
  const r = readPlan(pages, doors);
  const stacked = r.tags.filter((g) => g.matched_by);
  const row = { sha16: sha, rows: doors.length, placed: r.tags.length, exact: r.tags.length - stacked.length, stacked: stacked.length,
    not_on_plan: r.marks_not_on_plan.map((m) => m.mark), plan_sheets: r.plan_sheets.map((s) => s.sheet + " p." + s.page),
    stacked_tags: stacked.map((g) => ({ mark: g.mark, sheet: g.sheet, x: g.x, y: g.y, by: g.matched_by, room: g.room || null })) };
  out.push(row);
  console.log(sha, JSON.stringify({ rows: row.rows, placed: row.placed, exact: row.exact, stacked: row.stacked, not_on_plan: row.not_on_plan.length }));
  if (pdf.destroy) await pdf.destroy();
}
fs.writeFileSync(path.join(HERE, "measure.json"), JSON.stringify({ generated_at: new Date().toISOString(), results: out }, null, 1) + "\n");
