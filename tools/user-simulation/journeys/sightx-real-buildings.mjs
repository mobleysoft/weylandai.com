// tools/user-simulation/journeys/sightx-real-buildings.mjs
//
// g028: SightX on the three best real buildings of the harvest (tools/accuracy/g020/REPORT.md);
// g035: all ten harvested sets. Two (the R2502 rebid and T2423) have no floor plan the plan reader
// can select: their doors stand in schedule order on a schematic corridor, no door claims a tag,
// and the journey checks exactly that instead of a plan position.
// For each set, /sightx/?set=<sha16> lays the set's schedule rows out on its own plan sheets
// (tools/accuracy/g028/build-sets.mjs). The journey checks, from the visitor's side:
//   - one card per schedule row: door cards + not-a-door-row cards = the rows in the set's data;
//   - a door is drawn for every door row and for nothing else (the 3D never outruns the data);
//   - the doors tagged on the plan are the doors the data places;
//   - NEXT DOOR walks to a tagged door, its card names the door and quotes its schedule row word
//     for word, and the camera stands within 4 m of the door's plan position;
//   - W walks on from there.
// Usage: node tools/user-simulation/journeys/sightx-real-buildings.mjs   (exit 0 = all passed)
import { Journey, BASE, sleep } from "../lib/journey-kit.mjs";

const SETS = ["7478006f7fd5b43c", "192a16af8f31ae0c", "e3d0cc1bc22fd824", "f97e99f88a931e74", "43a1f0db3f7ff345",
  "3fd2388877347d09", "4af80165bc367de8", "89236ffa156fbaf5", "977cec6301f40433", "2b7024ad75f57ddf"];
const J = new Journey("sightx-real-buildings", "SightX on ten real bid sets");
const FTM = 0.3048;

await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  for (const set of SETS) {
    const page = await J.page(ctx);
    await page.goto(BASE + "/sightx/?set=" + set + "&journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
    // A failed set falls back to the sample sheet, whose "Built N doors" alone would pass.
    const built = await page.waitForFunction(() => { const t = (document.getElementById("sx-status") || {}).textContent || ""; return /Built \d+ doors?/.test(t) && /the schedule rows of /.test(t); }, null, { timeout: 60000 }).then(() => true, () => false);
    J.check(set + ": the set opens and its doors are built", built, await page.textContent("#sx-status").catch(() => ""));
    if (!built) { await page.close(); continue; }
    const api = await J.api(page, "/api/sightx/sets/" + set, set + ": the set's data answers", {
      require: ["model.doors", "model.set.rows", "model.layout"], pick: "model",
      validate(model) {
        const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
        if (!object(model) || !Array.isArray(model.doors)) return "model.doors must be an array";
        if (!model.doors.length) return "model.doors must contain a door to walk to";
        if (!object(model.set) || !Number.isInteger(model.set.rows) || model.set.rows < 0) return "model.set.rows must be a nonnegative integer";
        if (!object(model.layout) || !["plan", "schematic"].includes(model.layout.source)) return "model.layout must name a plan or schematic source";
        if (model.layout.source === "schematic" && (typeof model.set.no_plan_reason !== "string" || !model.set.no_plan_reason.trim())) return "schematic model.set.no_plan_reason must be a nonempty string";
        for (const door of model.doors) {
          if (!object(door)) return "each model.doors entry must be an object";
          if (typeof door.mark !== "string" || !door.mark || !object(door.row) || !Number.isInteger(door.row.page) || door.row.page < 1 || typeof door.row.text !== "string" || !door.row.text) return "each door must name its mark and source row";
          if (!door.plan) continue;
          if (!object(door.plan) || typeof door.plan.sheet !== "string" || !door.plan.sheet || !Number.isFinite(door.plan.x) || !Number.isFinite(door.plan.z)) return "each tagged door must have a sheet and finite plan position";
        }
        return true;
      }
    });
    if (!api) { await page.close(); continue; }
    const counts = await page.evaluate(() => window.__sxCounts || null);
    const doorRows = api.doors.length, rows = api.set.rows, onPlan = api.doors.filter((d) => d.plan).length;
    J.check(set + ": one card per schedule row (door cards + not-a-door-row cards = rows in the data)", !!counts && counts.door_cards + counts.row_cards === rows && counts.door_cards === doorRows, { counts, rows, door_rows: doorRows });
    J.check(set + ": a door is drawn for every door row and nothing else", !!counts && counts.doors_drawn === doorRows, { drawn: counts && counts.doors_drawn, door_rows: doorRows });
    const planned = api.layout.source === "plan";
    J.check(set + (planned ? ": the doors tagged on the plan are the ones the data places" : ": no plan was read, so no door claims a tag"),
      !!counts && counts.doors_on_plan === onPlan && (planned ? onPlan > 0 : onPlan === 0), { on_plan: counts && counts.doors_on_plan, data: onPlan, layout: api.layout.source });
    // Walk with NEXT DOOR to the first tagged door in schedule order (no plan: the first door).
    const target = planned ? api.doors.findIndex((d) => d.plan) : 0;
    if (target < 0) { await page.close(); continue; } // the unchanged on-plan assertion above failed; there is no tagged door to walk to
    for (let k = 0; k <= target; k++) { await page.locator("#next").click(); await sleep(150); }
    await sleep(1800);
    const d = api.doors[target];
    const card = (await page.textContent("#info").catch(() => "")).replace(/\s+/g, " ");
    const rowShown = await page.evaluate(() => { const e = document.querySelector("#info .door-row"); return e ? e.textContent : null; });
    J.check(set + ": the door's card names it and quotes its schedule row (" + d.mark + ", p." + d.row.page + ")",
      card.includes(d.mark) && rowShown === d.row.text && (planned ? card.includes("tag on sheet " + d.plan.sheet) : !card.includes("tag on sheet")),
      { mark: d.mark, row: d.row.text, shown: rowShown, sheet: d.plan ? d.plan.sheet : null });
    const s0 = await page.evaluate(() => window.SightXControls && window.SightXControls.state());
    if (planned) {
      const dist = s0 ? Math.hypot(s0.pos[0] - d.plan.x * FTM, s0.pos[2] - d.plan.z * FTM) : null;
      J.check(set + ": the camera stands at that door on the plan (within 4 m of its tag)", dist != null && dist <= 4, { distance_m: dist && +dist.toFixed(2) });
    } else {
      const hud = await page.textContent("#hud-layout").catch(() => "");
      const notes = await page.textContent("#notes").catch(() => "");
      J.check(set + ": the page says the layout is schematic and why no plan was read", /SCHEMATIC/.test(hud) && notes.includes(api.set.no_plan_reason), { hud, reason: api.set.no_plan_reason });
    }
    await page.locator("#sx-canvas").click({ position: { x: 20, y: 20 } }).catch(() => {});
    await page.keyboard.down("KeyW"); await sleep(900); await page.keyboard.up("KeyW"); await sleep(300);
    const s1 = await page.evaluate(() => window.SightXControls && window.SightXControls.state());
    const moved = s0 && s1 ? Math.hypot(s1.pos[0] - s0.pos[0], s1.pos[2] - s0.pos[2]) : 0;
    J.check(set + ": W walks on from the door", moved >= 0.5, { moved: +moved.toFixed(2) });
    await page.close();
  }
  await ctx.close();
});
