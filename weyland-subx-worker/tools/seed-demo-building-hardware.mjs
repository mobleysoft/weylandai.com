#!/usr/bin/env node
// weyland-subx-worker/tools/seed-demo-building-hardware.mjs
//
// Gives the demo seed session ("The WeylandAI Building", cc961a0b...) the
// hardware sets and parts its own sheet prints (src/lib/demo-building.js:
// DEMO_SHEET, sheetHardwareSets). Run once; running it again replaces its own
// rows (ids demoseed-...), nothing else.
//
//   node tools/seed-demo-building-hardware.mjs --check-pdf <sheet.pdf>   compare DEMO_SHEET with the PDF's text layer (pdftotext -layout)
//   node tools/seed-demo-building-hardware.mjs --sql <out.sql>           write the statements
//   node tools/seed-demo-building-hardware.mjs --apply                   write them to production D1 (weyland_db) and read the counts back
//
// The seed's PDF is R2 subx-uploads/hardware-sessions/89d2c5d5ee43edf126af96a1c2135cab/bee5bc31-7d84-4e2b-8f9f-7fcd4453e1df
// (npx wrangler r2 object get <bucket/key> --remote --file sheet.pdf).
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_SHEET, seedHardwareStatements, sheetHardwareSets, SEED_SESSION_ID } from "../src/lib/demo-building.js";

const WORKER_DIR = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

function literal(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function inline(st) {
  let i = 0;
  return st.sql.replace(/\?/g, () => literal(st.args[i++])) + ";";
}
// Wrangler authenticates from the inherited environment; the legacy CF_API_KEY variable is dropped
// so it cannot override the account credentials wrangler is configured with.
function childEnvironment() { const e = Object.assign({}, process.env); delete e.CF_API_KEY; return e; }
function d1Json(sql) {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "weyland_db", "--remote", "--json", "--command", sql], { cwd: WORKER_DIR, env: childEnvironment(), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(out);
}

if (args.includes("--check-pdf")) {
  const pdf = opt("--check-pdf");
  const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const cells = lines.map((l) => l.split(/\s{2,}/));
  const problems = [];
  if (!lines.includes(DEMO_SHEET.title)) problems.push("title not found: " + DEMO_SHEET.title);
  if (!lines.includes(DEMO_SHEET.subtitle)) problems.push("subtitle not found: " + DEMO_SHEET.subtitle);
  if (!cells.some((c) => c.join("|") === DEMO_SHEET.columns.join("|"))) problems.push("header row not found");
  for (const row of DEMO_SHEET.rows) if (!cells.some((c) => c.join("|") === row.join("|"))) problems.push("row not found as printed: " + row.join(" | "));
  const printedRows = cells.filter((c) => /^D-\d/.test(c[0] || "")).length;
  if (printedRows !== DEMO_SHEET.rows.length) problems.push("the PDF prints " + printedRows + " door rows, DEMO_SHEET has " + DEMO_SHEET.rows.length);
  console.log(problems.length ? "MISMATCH\n- " + problems.join("\n- ") : "DEMO_SHEET matches the PDF's text layer: title, header, " + DEMO_SHEET.rows.length + " rows");
  if (problems.length) process.exit(1);
}

const statements = seedHardwareStatements();
const sql = statements.map(inline).join("\n") + "\n";
if (opt("--sql")) { writeFileSync(opt("--sql"), sql); console.log("wrote " + statements.length + " statements to " + opt("--sql")); }

if (args.includes("--apply")) {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "demoseed-")), "seed.sql");
  writeFileSync(file, sql);
  execFileSync("npx", ["wrangler", "d1", "execute", "weyland_db", "--remote", "--yes", "--file", file], { cwd: WORKER_DIR, env: childEnvironment(), stdio: "inherit" });
  const [r] = d1Json("SELECT h.set_number, h.set_name, h.door_count, COUNT(c.id) AS parts FROM hardware_sets h LEFT JOIN hardware_components c ON c.set_id = h.id WHERE h.session_id = '" + SEED_SESSION_ID + "' GROUP BY h.id ORDER BY h.set_number;");
  const got = r.results || [];
  const want = sheetHardwareSets();
  for (const g of got) console.log(g.set_number.padEnd(6), String(g.door_count).padStart(2), "doors", String(g.parts).padStart(2), "parts ", g.set_name);
  const ok = got.length === want.length && want.every((w) => got.some((g) => g.set_number === w.set_number && g.parts === w.components.length && g.door_count === w.doors.length));
  console.log(ok ? "seed session now holds " + got.length + " sets / " + got.reduce((n, g) => n + g.parts, 0) + " parts, as the sheet prints" : "READ-BACK DIFFERS from the sheet");
  if (!ok) process.exit(1);
}
