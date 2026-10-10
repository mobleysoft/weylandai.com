#!/usr/bin/env node
// g044: every tag readPlan places on the three sets, the reader at origin/main against this
// branch's, with reader A's rows (as tools/accuracy/g041/measure.mjs reads them).
//   git show origin/main:weyland-shared/plan-read.js > tools/accuracy/g044-old-plan-read.tmp.js
//   node tools/accuracy/g044/compare.mjs <dir with the three PDFs>
// Writes tools/accuracy/g044/compare.json: tags only in one version, tags that moved, and the
// shared-mark report. No network access.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openPdf, pageItems } from "../truth/pdf.mjs";
import { readA } from "../truth/reader_a.mjs";
import { readPlan } from "../../../weyland-shared/plan-read.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { readPlan: readPlanOld } = await import(pathToFileURL(path.join(HERE, "../g044-old-plan-read.tmp.js")).href);
const dir = process.argv[2];
const SETS = ["192a16af8f31ae0c", "7478006f7fd5b43c", "e3d0cc1bc22fd824"];
const doorPage = (t) => /\bDOOR\b/i.test(t) && /\bSCHEDULE\b/i.test(t) && /\b(HARDWARE|HDWR?|HW|H\/W|HDW\.?\s*SET|SET|GROUP)\b/i.test(t) && /\b(MARK|TAG|NO\.?|NUMBER|#)\b/i.test(t);
const key = (g) => g.mark + "@" + g.sheet + ":" + g.x + "," + g.y;
const out = [];
for (const sha of SETS) {
  const pdf = await openPdf(fs.readFileSync(path.join(dir, sha + ".pdf"))), pages = [], doors = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pageItems(pdf, p); pages.push(page);
    if (page.items.length >= 15 && doorPage(page.items.map((i) => i.str).join("\n"))) {
      const a = await readA(pdf, p, "door_schedule");
      doors.push(...(a.doors || []).map((d) => ({ page: p, ...d })));
    }
  }
  const before = readPlanOld(pages, doors.map((d) => ({ ...d }))), after = readPlan(pages, doors.map((d) => ({ ...d })));
  const B = new Map(before.tags.map((g) => [key(g), g])), A = new Map(after.tags.map((g) => [key(g), g]));
  const onlyBefore = [...B.keys()].filter((k) => !A.has(k)), onlyAfter = [...A.keys()].filter((k) => !B.has(k));
  const row = { sha16: sha, rows: doors.length, tags_before: before.tags.length, tags_after: after.tags.length,
    not_on_plan_before: before.marks_not_on_plan.map((m) => m.mark), not_on_plan_after: after.marks_not_on_plan.map((m) => m.mark),
    only_before: onlyBefore, only_after: onlyAfter, shared_marks: after.shared_marks,
    shared_tags: after.tags.filter((g) => g.shared_mark).map((g) => ({ mark: g.mark, sheet: g.sheet, x: g.x, y: g.y, room: g.room || null, note: g.note, by: g.matched_by || "exact" })),
    shared_rows: doors.filter((d) => after.tags.some((g) => g.shared_mark && g.mark === d.mark)).map((d) => ({ mark: d.mark, page: d.page, width: d.width || d.width_inches || null, height: d.height || d.height_inches || null })) };
  out.push(row);
  console.log(sha, JSON.stringify({ rows: row.rows, tags: [row.tags_before, row.tags_after], only_before: onlyBefore.length, only_after: onlyAfter, shared: after.shared_marks }));
  if (pdf.destroy) await pdf.destroy();
}
fs.writeFileSync(path.join(HERE, "compare.json"), JSON.stringify({ generated_at: new Date().toISOString(), results: out }, null, 1) + "\n");
