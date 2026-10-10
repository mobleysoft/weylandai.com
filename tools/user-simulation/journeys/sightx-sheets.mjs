// tools/user-simulation/journeys/sightx-sheets.mjs
//
// g068: SightX's sheet view over the g066 placement records (tools/corpus/harvest/placement/<sha16>.json,
// served by /api/sightx/sheets/<sha16>). For T2507, R2502 and T2421, /sightx/?set=<sha16> must open on
// the set's plan sheets, and the journey checks from the visitor's side:
//   - the HUD shows placed-of-total, the record's numbers ("49 OF 49 PLACED");
//   - one sheet button per sheet in the record; each sheet's image loads and has every tag the record
//     places on that page, drawn at the record's PDF-point coordinates, nothing more; all sheets
//     together draw marks_placed tags;
//   - a real click on a tag ring opens that door's card: its mark, its room and its schedule page;
//   - a table row opens the same card and brings its sheet up;
//   - marks the record could not place are listed as NOT PLACED, one row each;
//   - 2D only: the HUD says PLAN SHEETS, and a 3D CORRIDOR button appears only for a set that has a
//     3D model (/api/sightx/sets/<sha16> answers);
//   - one shell: the same document throughout, never leaving the site.
// A phone context taps a T2507 tag with a touch tap.
// Usage: node tools/user-simulation/journeys/sightx-sheets.mjs   (exit 0 = all passed)
import { Journey, BASE, sleep, setMark, placeState } from "../lib/journey-kit.mjs";

const SETS = { "192a16af8f31ae0c": "131B", "7478006f7fd5b43c": "101A", "15b85ca679307cc1": null };
const J = new Journey("sightx-sheets", "SightX plan sheets with placed door tags");

const state = (page) => page.evaluate(() => (window.SightXSheets ? window.SightXSheets.state() : null));
const waitImage = (page, sheet) => page.waitForFunction((s) => { const x = window.SightXSheets && window.SightXSheets.state(); return !!x && x.sheet === s && x.image_loaded; }, sheet, { timeout: 30000 }).then(() => true, () => false);
const card = async (page) => (await page.textContent("#info").catch(() => "")).replace(/\s+/g, " ");
// The tag ring's centre on screen, once the page has stopped scrolling (a row click scrolls the viewer into view).
async function ringCentre(page, ti) {
  let last = null;
  for (let n = 0; n < 20; n++) {
    const b = await page.locator('#sheet-svg g.tag[data-t="' + ti + '"] .ring').boundingBox();
    if (b && last && Math.abs(b.x - last.x) < 0.5 && Math.abs(b.y - last.y) < 0.5) return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    last = b; await sleep(150);
  }
  return last && { x: last.x + last.width / 2, y: last.y + last.height / 2 };
}
const drawnOn = (page) => page.evaluate(() => [...document.querySelectorAll("#sheet-svg g.tag")].map((g) => { const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute("transform")); return { mark: g.dataset.mark, i: +g.dataset.t, x: +m[1], y: +m[2] }; }));

async function openSet(ctx, set) {
  const page = await J.page(ctx);
  await page.goto(BASE + "/sightx/?set=" + set + "&journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
  const mark = await setMark(page);
  const opened = await page.waitForFunction(() => { const x = window.SightXSheets && window.SightXSheets.state(); return !!x && x.image_loaded; }, null, { timeout: 60000 }).then(() => true, () => false);
  return { page, mark, opened };
}

await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  for (const [set, pickMark] of Object.entries(SETS)) {
    const { page, mark, opened } = await openSet(ctx, set);
    J.check(set + ": the set opens on its plan sheets and the first sheet's image loads", opened, await page.textContent("#sx-status").catch(() => ""));
    if (!opened) { await page.close(); continue; }
    const rec = await J.api(page, "/api/sightx/sheets/" + set, set + ": the placement record answers", {
      require: ["sheets", "tags", "summary.marks_placed", "summary.marks_total"],
      validate(d) {
        if (!Array.isArray(d.sheets) || !d.sheets.length) return "sheets must be a nonempty array";
        if (!Array.isArray(d.tags) || d.tags.length !== d.summary.marks_placed) return "tags must hold marks_placed entries";
        for (const t of d.tags) if (typeof t.mark !== "string" || !Number.isFinite(t.x) || !Number.isFinite(t.y) || !d.sheets.some((s) => s.page === t.page)) return "each tag needs a mark, finite x/y and a listed sheet";
        return true;
      },
    });
    if (!rec) { await page.close(); continue; }
    const s = rec.summary;
    const hud = await page.textContent("#hud-count").catch(() => "");
    J.check(set + ": the HUD shows placed-of-total (" + s.marks_placed + " OF " + s.marks_total + " PLACED)", hud.trim() === s.marks_placed + " OF " + s.marks_total + " PLACED", { hud });
    const buttons = await page.evaluate(() => [...document.querySelectorAll("#sheet-bar .btn[data-k]")].map((b) => b.textContent));
    J.check(set + ": one sheet button per plan sheet in the record", JSON.stringify(buttons.map((b) => b.split(" · ")[0])) === JSON.stringify(rec.sheets.map((x) => x.sheet)), { buttons });
    let total = 0;
    for (let k = 0; k < rec.sheets.length; k++) {
      const sh = rec.sheets[k];
      await page.locator('#sheet-bar .btn[data-k="' + k + '"]').click();
      const loaded = await waitImage(page, sh.sheet);
      const drawn = await drawnOn(page);
      const want = rec.tags.map((t, i) => ({ ...t, i })).filter((t) => t.page === sh.page);
      const exact = drawn.length === want.length && want.every((t) => drawn.some((g) => g.i === t.i && g.mark === t.mark && Math.abs(g.x - t.x) < 0.01 && Math.abs(g.y - t.y) < 0.01));
      total += drawn.length;
      J.check(set + ": " + sh.sheet + " (p." + sh.page + ") loads and draws its " + want.length + " placed tags at the record's coordinates", loaded && exact, { loaded, drawn: drawn.length, record: want.length });
    }
    J.check(set + ": all sheets together draw the " + s.marks_placed + " placed tags", total === s.marks_placed, { total, placed: s.marks_placed });
    // Click-through: a real click on a tag ring (zoomed to it first by its table row so neighbours don't cover it).
    const ti = pickMark ? rec.tags.findIndex((t) => t.mark === pickMark) : 0;
    const t = rec.tags[ti];
    await page.locator('#rows tr.tagrow[data-t="' + ti + '"] td:nth-child(2)').click();
    await sleep(400);
    const viaRow = await card(page);
    const st1 = await state(page);
    J.check(set + ": the table row " + t.mark + " opens its card and brings up " + t.sheet, viaRow.includes(t.mark) && st1 && st1.sheet === t.sheet && st1.selected === t.mark, { sheet: st1 && st1.sheet, selected: st1 && st1.selected });
    await page.locator("#sheet-fit").click();
    await page.locator("#sheet-in").click(); await page.locator("#sheet-in").click(); await sleep(200);
    await page.locator('#rows tr.tagrow[data-t="' + ti + '"] td:nth-child(2)').click(); await sleep(300);
    await page.evaluate(() => { document.getElementById("info").innerHTML = ""; });
    const at = await ringCentre(page, ti);
    await page.mouse.click(at.x, at.y);
    await sleep(300);
    const c = await card(page);
    const row0 = (t.schedule_rows || [])[0];
    J.check(set + ": clicking tag " + t.mark + " on " + t.sheet + " opens its door card (room " + (t.room_name || "-") + ", schedule p." + (row0 ? row0.page : "-") + ")",
      c.startsWith(t.mark) && (!t.room_name || c.includes(t.room_name)) && c.includes("tag on " + t.sheet + " p." + t.page) && (!row0 || c.includes("schedule p." + row0.page)), { card: c.slice(0, 300) });
    const un = await page.evaluate(() => [...document.querySelectorAll("#rows tr.unplaced")].map((tr) => tr.textContent.replace(/\s+/g, " ").trim()));
    J.check(set + ": the " + s.unplaced.length + " marks the record could not place are listed NOT PLACED", un.length === s.unplaced.length && s.unplaced.every((u) => un.some((x) => x.startsWith(u.mark) && x.includes("NOT PLACED"))), { listed: un });
    const layout = await page.textContent("#hud-layout").catch(() => "");
    const has3d = await page.evaluate(async (p) => (await fetch(p)).ok, "/api/sightx/sets/" + set);
    const btn3d = await page.locator("#sheet-3d").count();
    J.check(set + ": 2D sheet truth: HUD says PLAN SHEETS; a 3D CORRIDOR button only where a 3D model exists (" + has3d + ")", /^PLAN SHEETS /.test(layout) && (btn3d === 1) === has3d, { layout, has3d, btn3d });
    const place = await placeState(page, mark);
    J.check(set + ": one shell: the same document throughout, on the site", place.sameDocument && place.onSite, place);
    await page.close();
  }
  await ctx.close();

  const phone = await J.context("phone");
  const { page, opened } = await openSet(phone, "192a16af8f31ae0c");
  if (opened) {
    const rec = JSON.parse(await page.evaluate(async () => (await fetch("/api/sightx/sheets/192a16af8f31ae0c")).text()));
    const ti = rec.tags.findIndex((t) => t.mark === "131B");
    await page.locator('#rows tr.tagrow[data-t="' + ti + '"] td:nth-child(2)').tap(); await sleep(300);
    await page.evaluate(() => { document.getElementById("info").innerHTML = ""; });
    const at = await ringCentre(page, ti);
    await page.touchscreen.tap(at.x, at.y); await sleep(300);
    const c = await card(page);
    J.check("phone: tapping tag 131B on T2507 A-100 opens its card (131 EXCERCISE ROOM)", c.startsWith("131B") && c.includes("EXCERCISE ROOM"), { card: c.slice(0, 200) });
  } else J.check("phone: T2507 opens on its sheets", false, "did not open");
  await phone.close();
});
