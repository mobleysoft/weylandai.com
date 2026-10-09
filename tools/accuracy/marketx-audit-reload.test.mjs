import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Exercise the real audit with a source that reloads between its JSON and CSV requests.
const source = readFileSync(new URL("./product_audit_data_tools.mjs", import.meta.url), "utf8");
const start = source.indexOf("async function marketx() {");
const body = source.slice(start, source.indexOf("\n// ---------------------------------------------------------------- jobs (PropX proposals)", start));
async function audit(reloads) {
  const version = Object.fromEntries(["chicago", "nyc", "la", "austin", "sf", "seattle"].map(k => [k, 1]));
  let measurements = 0;
  const context = vm.createContext({
    todayUtc: "2026-10-09", Date, Number, String, Object, Math,
    near: (a, b, tolerance) => Math.abs(a - b) <= tolerance,
    sortedDesc: values => values.every((v, i) => i === 0 || values[i - 1] >= v),
    csvRows: text => text.split("\n").map(line => line.split(",")),
    money: v => "$" + v,
    checker: () => { const checks = []; return { checks, check(name, ok, detail) { checks.push({ name, ok: !!ok, detail }); return !!ok; } }; },
    api: async path => {
      if (path.endsWith("/metros")) return { ok: true, status: 200, data: { metros: Object.entries(version).map(([metro, n]) => ({ metro, projects: n, value: n * 100, latest: "2026-10-09" })) } };
      const k = path.split("/")[4], n = version[k];
      if (path.endsWith("/projects.csv")) return { status: 200, text: "id,value\n" + Array.from({ length: n }, (_, i) => `${i},100`).join("\n") };
      if (path.endsWith("/companies.csv")) {
        if (k === "chicago" && measurements <= reloads) version[k]++;
        return { status: 200, text: "kind,name,projects,value\ncontractor,ACME,1,100" };
      }
      if (k === "chicago") measurements++;
      return { ok: true, status: 200, data: {
        paid: true, totals: { projects: n, value: n * 100, priorValue: 100, valueChange: 0 }, since: "2026-01-01",
        monthly: [...Array(12)].flatMap((_, i) => [{ month: `2026-${String(i + 1).padStart(2, "0")}` }, { month: `2025-${String(i + 1).padStart(2, "0")}` }]),
        byUse: [{ value: n * 100 }], largest: [], newest: [], contractors: [{ name: "ACME", value: 100 }], owners: [], bids: { open: 0, doors: 0 },
      } };
    },
  });
  vm.runInContext(body + "\nglobalThis.runAudit = marketx", context);
  return context.runAudit();
}

test("a stable source passes without remeasurement", async () => {
  const r = await audit(0), chicago = r.numbers.metros[0];
  assert.equal(chicago.ok, true);
  assert.equal(chicago.measurements, 1);
  assert.equal(chicago.stable_measurement, true);
});
test("a mid-measurement reload is remeasured against a fresh metros list", async () => {
  const r = await audit(1), chicago = r.numbers.metros[0];
  assert.equal(chicago.ok, true);
  assert.equal(chicago.measurements, 2);
  assert.equal(chicago.projects, 2);
  assert.equal(chicago.data_changed_during_run.length, 1);
});
test("a source changing on every attempt fails after exactly three measurements", async () => {
  const r = await audit(Infinity), chicago = r.numbers.metros[0];
  assert.equal(chicago.ok, false);
  assert.equal(chicago.stable_measurement, false);
  assert.equal(chicago.measurements, 3);
  assert.equal(chicago.data_changed_during_run.length, 3);
  assert.match(r.checks.find(c => c.name.startsWith("Chicago:")).detail, /measured 3 times/);
});
