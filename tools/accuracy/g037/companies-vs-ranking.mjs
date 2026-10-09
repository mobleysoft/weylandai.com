// g037: compares each metro's JSON ranking with its companies CSV, name for name.
// Usage: node tools/accuracy/g037/companies-vs-ranking.mjs <token file>   (the token is never printed)
import { readFileSync } from "node:fs";
const TOKEN = readFileSync(process.argv[2], "utf8").trim();
const src = readFileSync("tools/accuracy/product_audit_data_tools.mjs", "utf8");
const csvRows = eval("(" + src.match(/const csvRows = (\(t\) => \{.*?\n?.*?return out\.filter\(\(r\) => r\.length > 1 \|\| r\[0\]\); \})/)[1] + ")");
const H = { Authorization: "Bearer " + TOKEN };
const get = async (p) => (await fetch("https://weylandai.com" + p, { headers: H })).text();
for (const k of ["chicago", "nyc", "austin", "seattle"]) {
  const d = JSON.parse(await get("/api/marketx/metro/" + k));
  const rows = csvRows(await get("/api/marketx/metro/" + k + "/companies.csv")).slice(1);
  for (const [kind, json] of [["contractor", d.contractors || []], ["owner", d.owners || []]]) {
    const csv = rows.filter((r) => r[0] === kind);
    const i = json.findIndex((x, i) => !csv[i] || csv[i][1] !== x.name);
    console.log(k, kind, "json", json.length, "csv", csv.length, i < 0 ? "match" : "mismatch at " + i + " json " + JSON.stringify(json.slice(i - 1, i + 2).map(x => [x.name, x.value])) + " csv " + JSON.stringify(csv.slice(i - 1, i + 2).map(r => [r[1], r[3]])));
  }
}
