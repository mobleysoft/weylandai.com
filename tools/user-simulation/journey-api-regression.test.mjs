// Runs the actual SightX journey and Journey.run with fixture browser I/O only.
// No browser, network request, account or test-data deletion may be launched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import { SETS as publishedModels } from "../../weyland-sightx-worker/src/data/sets/index.js";

const priorPlaywright = process.env.PLAYWRIGHT_CORE;
process.env.PLAYWRIGHT_CORE = "data:text/javascript," + encodeURIComponent('export const chromium={launch(){throw new Error("fixture browser launch forbidden")}}');
const { Journey, BASE } = await import("./lib/journey-kit.mjs");
if (priorPlaywright === undefined) delete process.env.PLAYWRIGHT_CORE;
else process.env.PLAYWRIGHT_CORE = priorPlaywright;
const source = (await readFile(new URL("./journeys/sightx-real-buildings.mjs", import.meta.url), "utf8")).replace(/^import .*;\n/m, "");
const reportsDir = new URL("./reports/", import.meta.url);
const setIds = Object.keys(publishedModels);
const firstSet = setIds[0];
const model = { doors: [{ mark: "101", row: { page: 1, text: "101 HM 3070" }, plan: { sheet: "A1", x: 5, z: 9 } }], set: { rows: 1 }, layout: { source: "plan" } };
const schematic = { ...model, doors: [{ mark: "101", row: model.doors[0].row }], set: { rows: 1, no_plan_reason: "fixture plan reader found no floor plan" }, layout: { source: "schematic" } };
const answer = (data, status = 200, contentType = "application/json") => ({ status, contentType, text: typeof data === "string" ? data : JSON.stringify(data) });
const good = answer({ success: true, model });

async function runFixture(firstAnswer, { models = null } = {}) {
  const j = new Journey("g036-fixture-" + randomUUID(), "local API regression fixture");
  const counts = { pages: 0, pagesClosed: 0, contextClosed: 0, browserClosed: 0, cleanupCalled: 0 };
  const originalExit = process.exit, originalLog = console.log;
  let exitCode = null, receipt = null;
  j.launch = async () => { j.browser = { close: async () => { counts.browserClosed++; } }; };
  j.context = async () => ({ close: async () => { counts.contextClosed++; } });
  const realCleanup = j.cleanup.bind(j);
  j.cleanup = async () => { counts.cleanupCalled++; await realCleanup(); };
  const realReport = j.writeReport.bind(j);
  j.writeReport = async () => { receipt = await realReport(); };
  j.page = async () => {
    const index = counts.pages++;
    const a = models ? answer({ success: true, model: models[setIds[index]] }) : index === 0 ? firstAnswer : good;
    const m = models ? models[setIds[index]] : model;
    const planned = m.layout.source === "plan";
    const selected = planned ? m.doors.find((door) => door.plan) : m.doors[0];
    let stateRead = 0;
    const browser = vm.createContext({
      Response,
      fetch: async () => {
        if (a.fetchError) throw new TypeError("fixture fetch failed");
        return new Response(a.text, { status: a.status, headers: { "content-type": a.contentType } });
      },
      document: {
        getElementById: () => ({ textContent: "Built " + m.doors.length + " doors from the schedule rows of fixture" }),
        querySelector: () => selected ? { textContent: selected.row.text } : null
      },
      window: {
        __sxCounts: { door_cards: m.doors.length, row_cards: m.set.rows - m.doors.length, doors_drawn: m.doors.length, doors_on_plan: m.doors.filter((d) => d.plan).length },
        SightXControls: { state: () => ({ pos: selected && selected.plan ? [selected.plan.x * 0.3048 + stateRead++ % 2, 0, selected.plan.z * 0.3048] : [stateRead++ % 2, 0, 0] }) }
      }
    });
    const page = {
      goto: async () => {},
      evaluate: async (callback, arg) => { browser.__arg = arg; return await vm.runInContext("(" + callback.toString() + ")(__arg)", browser); },
      waitForFunction: async (callback, arg) => { if (!await page.evaluate(callback, arg)) throw new Error("fixture status did not build"); },
      textContent: async (selector) => {
        if (selector === "#sx-status") return browser.document.getElementById().textContent;
        if (selector === "#hud-layout") return planned ? "PLAN" : "SCHEMATIC";
        if (selector === "#notes") return m.set.no_plan_reason || "";
        return selected ? selected.mark + (selected.plan ? " tag on sheet " + selected.plan.sheet : "") : "";
      },
      close: async () => { counts.pagesClosed++; },
      locator: () => ({ click: async () => {} }),
      keyboard: { down: async () => {}, up: async () => {} }
    };
    return page;
  };
  try {
    process.exit = (code) => { exitCode = code; };
    console.log = () => {};
    const runtime = vm.createContext({ BASE, sleep: async () => {}, Journey: class { constructor() { return j; } } });
    await vm.runInContext("(async()=>{" + source + "})()", runtime, { filename: "tools/user-simulation/journeys/sightx-real-buildings.mjs" });
    const files = (await readdir(reportsDir)).filter((file) => file.startsWith("journey-" + j.id + "-"));
    assert.equal(files.length, 2, "timestamp and latest receipts both written");
    const saved = JSON.parse(await readFile(new URL("journey-" + j.id + "-latest.json", reportsDir), "utf8"));
    assert.deepEqual(saved, receipt);
    assert.deepEqual(saved.cleanup, { nothing: true });
    assert.equal(saved.side_effects, "no AuthFor identity created");
    assert.equal(setIds.length, 10, "fixture covers the current ten published sets");
    assert.deepEqual(counts, { pages: 10, pagesClosed: 10, contextClosed: 1, browserClosed: 1, cleanupCalled: 1 });
    assert.equal(saved.checks.some((c) => c.name === "journey ran to completion"), false, "the actual journey does not crash");
    return { exitCode, receipt: saved };
  } finally {
    process.exit = originalExit;
    console.log = originalLog;
    for (const file of (await readdir(reportsDir)).filter((file) => file.startsWith("journey-" + j.id + "-"))) await unlink(new URL(file, reportsDir));
  }
}

const badAnswers = [
  ["doors object", answer({ model: { ...model, doors: {} } }), /model\.doors must be an array/],
  ["empty doors", answer({ model: { ...model, doors: [] } }), /contain a door/],
  ["null door entry", answer({ model: { ...model, doors: [null] } }), /each model\.doors entry/],
  ["string row count", answer({ model: { ...model, set: { rows: "1" } } }), /model\.set\.rows/],
  ["invalid layout", answer({ model: { ...model, layout: [] } }), /model\.layout/],
  ["unknown layout source", answer({ model: { ...model, layout: { source: "unknown" } } }), /plan or schematic source/],
  ["missing schematic reason", answer({ model: { ...schematic, set: { rows: 1 } } }), /no_plan_reason/],
  ["nonstring schematic reason", answer({ model: { ...schematic, set: { rows: 1, no_plan_reason: {} } } }), /no_plan_reason/],
  ["empty schematic reason", answer({ model: { ...schematic, set: { rows: 1, no_plan_reason: "   " } } }), /no_plan_reason/],
  ["missing schematic source row", answer({ model: { ...schematic, doors: [{ mark: "101" }] } }), /source row/],
  ["missing tagged source row", answer({ model: { ...model, doors: [{ ...model.doors[0], row: null }] } }), /source row/],
  ["invalid tagged plan position", answer({ model: { ...model, doors: [{ ...model.doors[0], plan: { sheet: "A1", x: "5", z: 9 } }] } }), /finite plan position/],
  ["explicit failure", answer({ success: false, model }), /API reported failure/],
  ["explicit error", answer({ error: "fixture API failed", model }), /API reported failure/],
  ["HTTP error", answer("gone", 503, "text/plain"), /HTTP 503/],
  ["malformed JSON", answer("{broken"), /not JSON/],
  ["HTML response", answer("<html>gone</html>", 200, "text/html"), /an HTML page/],
  ["missing model", answer({ success: true }), /lacks model\.doors/],
  ["missing doors", answer({ model: { set: { rows: 1 }, layout: {} } }), /lacks model\.doors/],
  ["fetch failure", { fetchError: true }, /request failed: fixture fetch failed/]
];
for (const [name, a, problem] of badAnswers) {
  test("actual journey rejects " + name + ", then continues and cleans up", async () => {
    const { exitCode, receipt } = await runFixture(a);
    assert.equal(exitCode, 1);
    const apiChecks = receipt.checks.filter((c) => c.name.endsWith(": the set's data answers"));
    assert.equal(apiChecks.length, 10);
    assert.equal(apiChecks[0].name, firstSet + ": the set's data answers");
    assert.equal(apiChecks[0].ok, false);
    assert.match(apiChecks[0].detail, problem);
    assert.equal(apiChecks.slice(1).every((check) => check.ok), true, "all nine remaining sets answer successfully");
    assert.equal(receipt.failed, 1);
  });
}

test("actual journey passes all ten actually published model structures, including two schematic sets", async () => {
  const { exitCode, receipt } = await runFixture(null, { models: publishedModels });
  assert.equal(exitCode, 0);
  assert.equal(receipt.passed, 80);
  assert.equal(receipt.failed, 0);
});

test("no tagged door still fails the original on-plan assertion without crashing", async () => {
  const { exitCode, receipt } = await runFixture(answer({ model: { ...model, doors: [{ mark: "101", row: model.doors[0].row }] } }));
  assert.equal(exitCode, 1);
  const failed = receipt.checks.filter((c) => !c.ok);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].name, firstSet + ": the doors tagged on the plan are the ones the data places");
});
