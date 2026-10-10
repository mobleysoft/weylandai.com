#!/usr/bin/env node
// g046: reader A's door rows on each of the ten harvested sets (tools/accuracy/g020), on the candidate
// schedule pages of tools/corpus/harvest/sightx_candidates.json.
//   node tools/accuracy/g046/rows.mjs <dir with <sha16>.pdf> [out.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openPdf } from "../truth/pdf.mjs";
import { readA } from "../truth/reader_a.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(HERE, "../../..");
const [dir, outFile] = process.argv.slice(2);
const SETS = ["7478006f7fd5b43c", "f97e99f88a931e74", "192a16af8f31ae0c", "43a1f0db3f7ff345", "e3d0cc1bc22fd824", "3fd2388877347d09", "4af80165bc367de8", "89236ffa156fbaf5", "977cec6301f40433", "2b7024ad75f57ddf"];
const cands = JSON.parse(fs.readFileSync(path.join(repo, "tools/corpus/harvest/sightx_candidates.json"))).candidates;
const out = [];
for (const sha of SETS) {
  const file = path.join(dir, sha + ".pdf");
  if (!fs.existsSync(file)) { out.push({ sha16: sha, skipped: "no pdf" }); continue; }
  const c = cands.find((x) => x.sha16 === sha);
  const pdf = await openPdf(fs.readFileSync(file));
  const pages = c.door_schedule_page_indexes.map((i) => i + 1), per = [];
  for (const p of pages) { const a = await readA(pdf, p, "door_schedule"); per.push({ page: p, rows: (a.doors || []).length, marks: (a.doors || []).map((d) => d.mark), sized: (a.doors || []).filter((d) => d.width_inches && d.height_inches).length }); }
  out.push({ sha16: sha, rows: per.reduce((n, x) => n + x.rows, 0), sized: per.reduce((n, x) => n + x.sized, 0), pages: per });
  console.log(sha, per.map((x) => "p." + x.page + " " + x.rows + " (" + x.sized + " sized)").join(", "));
  if (pdf.destroy) await pdf.destroy();
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ generated_at: new Date().toISOString(), results: out }, null, 1) + "\n");
