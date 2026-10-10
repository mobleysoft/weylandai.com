#!/usr/bin/env node
// g049: reader A's door rows and every field, page by page, on the g042 spot-check sets (eye counts from
// tools/accuracy/g042/spot-checks.md) and the ten SightX sets.
//   node tools/accuracy/g048/rows.mjs <dir with <sha16>.pdf> <out.json>
import fs from "node:fs";
import { openPdf } from "../truth/pdf.mjs";
import { readA } from "../truth/reader_a.mjs";
const [dir, out] = process.argv.slice(2);
// [sha16, pages, eye count per page (null: not eye-counted)]
const SETS = [
  ["3506f831094dd516", [12], [16]], ["194733de48af8797", [45], [16]], ["eefa018e007e581f", [59], [84]],
  ["7239a04e6cc8b502", [63], [75]], ["21d60f1b54e0e3df", [78, 88], [19, 0]], ["e3d0cc1bc22fd824", [18], [22]],
  ["89236ffa156fbaf5", [42, 43], [16, 13]], ["44111d93bd635936", [17], [44]], ["7478006f7fd5b43c", [28, 32, 45, 46], [2, 1, 131, 77]],
  ["18b27b8baa47f0e1", [18, 53], [18, 18]], ["f97e99f88a931e74", [28, 32, 44, 45], [null, null, null, null]],
  ["192a16af8f31ae0c", [10], [49]], ["43a1f0db3f7ff345", [14], [null]], ["3fd2388877347d09", [13], [9]],
  ["4af80165bc367de8", [7], [4]], ["977cec6301f40433", [10], [3]], ["2b7024ad75f57ddf", [16], [null]],
];
const res = [];
for (const [sha, pages, eye] of SETS) {
  const pdf = await openPdf(fs.readFileSync(dir + "/" + sha + ".pdf"));
  for (const [k, p] of pages.entries()) {
    const a = await readA(pdf, p, "door_schedule");
    const marks = (a.doors || []).map((d) => d.mark), doors = (a.doors || []).map(({ y, ...d }) => d);
    res.push({ sha16: sha, page: p, eye: eye[k], rows: marks.length, marks, doors });
    console.log(sha, "p." + p, "eye", eye[k] ?? "-", "A", marks.length);
  }
  if (pdf.destroy) await pdf.destroy();
}
fs.writeFileSync(out, JSON.stringify({ generated_at: new Date().toISOString(), results: res }, null, 1) + "\n");
