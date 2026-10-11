// tools/user-simulation/journeys/sightx-sheets.mjs
//
// g068, reworked by g074: SightX's public sheet view shows the WeylandAI Building, WeylandAI's own sample bid
// set (tools/bidset, set 4847b09e633103f7), from its placement record (/api/sightx/sheets/<sha16>). The sheets
// are drawn in the browser from the set's PDF by the self-hosted pdf.js. No harvested set is shown on sheets.
// From the visitor's side:
//   - /sightx/?set=4847b09e633103f7 opens on its plan sheet A-101, drawn;
//   - the HUD shows placed-of-total from the record (48 OF 48 PLACED);
//   - the sheet draws every placed tag at the record's coordinates, nothing more;
//   - a table row opens its card and brings up its sheet; a real click on a tag ring opens its door card
//     (mark, room, size, hardware group, schedule page) matching the drawn schedule (tools/bidset/out);
//   - one card per opening: the table lists all 48;
//   - a harvested set is not served on sheets (its record answers 404);
//   - one shell: the same document throughout, never leaving the site;
//   - a phone touch tap on a tag opens its card.
// Usage: node tools/user-simulation/journeys/sightx-sheets.mjs   (exit 0 = all passed)
import { readFileSync } from "node:fs";
import { Journey, BASE, sleep, setMark, placeState } from "../lib/journey-kit.mjs";

const SET = "4847b09e633103f7";
const TRUTH = JSON.parse(readFileSync(new URL("../../bidset/out/truth-doors.json", import.meta.url), "utf8"));
const PICK = "104";
const J = new Journey("sightx-sheets", "SightX plan sheets of the WeylandAI Building with its door tags");

const state = (page) => page.evaluate(() => (window.SightXSheets ? window.SightXSheets.state() : null));
const card = async (page) => (await page.textContent("#info").catch(() => "")).replace(/\s+/g, " ");
const drawnOn = (page) => page.evaluate(() => [...document.querySelectorAll("#sheet-svg g.tag")].map((g) => { const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute("transform")); return { mark: g.dataset.mark, i: +g.dataset.o, x: +m[1], y: +m[2] }; }));
// The tag ring's centre on screen, once the page has stopped scrolling (a row click scrolls the viewer into view).
async function ringCentre(page, i) {
  let last = null;
  for (let n = 0; n < 20; n++) {
    const b = await page.locator('#sheet-svg g.tag[data-o="' + i + '"] .ring').boundingBox();
    if (b && last && Math.abs(b.x - last.x) < 0.5 && Math.abs(b.y - last.y) < 0.5) return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    last = b; await sleep(150);
  }
  return last && { x: last.x + last.width / 2, y: last.y + last.height / 2 };
}
async function openSet(ctx) {
  const page = await J.page(ctx);
  await page.goto(BASE + "/sightx/?set=" + SET + "&journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
  const mark = await setMark(page);
  const opened = await page.waitForFunction(() => { const x = window.SightXSheets && window.SightXSheets.state(); return !!x && x.image_loaded; }, null, { timeout: 60000 }).then(() => true, () => false);
  return { page, mark, opened };
}
await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  const { page, mark, opened } = await openSet(ctx);
  J.check("the WeylandAI Building opens on its plan sheet and the sheet is drawn from its PDF", opened, await page.textContent("#sx-status").catch(() => ""));
  if (opened) {
    const rec = await J.api(page, "/api/sightx/sheets/" + SET, "the Building's placement record answers", {
      require: ["sheets", "openings", "summary.placed", "summary.total"],
      validate(d) {
        if (!Array.isArray(d.sheets) || !d.sheets.length) return "sheets must be a nonempty array";
        if (!Array.isArray(d.openings) || d.openings.length !== d.summary.total) return "one opening per schedule row";
        for (const o of d.openings) if (typeof o.mark !== "string" || (o.tag && (!Number.isFinite(o.tag.x) || !Number.isFinite(o.tag.y)))) return "each opening needs a mark and finite tag coordinates";
        return true;
      },
    });
    if (rec) {
      const hud = await page.textContent("#hud-count").catch(() => "");
      J.check("the HUD shows placed-of-total from the record (" + rec.summary.placed + " OF " + rec.summary.total + " PLACED, 48 of 48 drawn on the schedule)", hud.trim() === rec.summary.placed + " OF " + rec.summary.total + " PLACED" && rec.summary.total === TRUTH.door_count, { hud });
      const buttons = await page.evaluate(() => [...document.querySelectorAll("#sheet-bar .btn[data-k]")].map((b) => b.textContent));
      J.check("one sheet button per plan sheet in the record (A-101)", JSON.stringify(buttons.map((b) => b.split(" · ")[0])) === JSON.stringify(rec.sheets.map((x) => x.sheet)), { buttons });
      const drawn = await drawnOn(page);
      const want = rec.openings.map((o, i) => ({ ...o, i })).filter((o) => o.tag && o.tag.page === rec.sheets[0].page);
      J.check("A-101 draws its " + want.length + " placed tags at the record's coordinates, nothing more", drawn.length === want.length && want.every((o) => drawn.some((g) => g.i === o.i && g.mark === o.mark && Math.abs(g.x - o.tag.x) < 0.01 && Math.abs(g.y - o.tag.y) < 0.01)), { drawn: drawn.length, record: want.length });
      const rows = await page.locator("#rows tr.tagrow").count();
      J.check("one card per opening: the table lists all " + rec.summary.total, rows === rec.summary.total, { rows });
      const i = rec.openings.findIndex((o) => o.mark === PICK), t = TRUTH.doors.find((d) => d.mark === PICK);
      await page.locator('#rows tr.tagrow[data-o="' + i + '"] td:nth-child(2)').click(); await sleep(500);
      const st1 = await state(page);
      J.check("the table row " + PICK + " opens its card and brings up its sheet", (await card(page)).startsWith(PICK) && st1 && st1.sheet === "A-101" && st1.selected === PICK, { sheet: st1 && st1.sheet, selected: st1 && st1.selected });
      await page.evaluate(() => { document.getElementById("info").innerHTML = ""; });
      const at = await ringCentre(page, i);
      await page.mouse.click(at.x, at.y); await sleep(300);
      const c = await card(page);
      J.check("clicking tag " + PICK + " opens its door card: " + t.room + ", " + t.width + " x " + t.height + ", group " + t.hardware_group + ", schedule page 3, tag on A-101",
        c.startsWith(PICK) && c.includes(t.room) && c.includes(t.width + " x " + t.height) && c.includes("HW GROUP" + t.hardware_group) && c.includes("page 3") && c.includes("tag on A-101 p.2"), { card: c.slice(0, 320) });
      if (process.env.SHOTS_DIR) { await page.evaluate(() => window.scrollTo(0, 0)); await page.locator("#sheet-fit").click(); await sleep(300); await page.screenshot({ path: process.env.SHOTS_DIR + "/building-a101-" + PICK + ".png" }).catch(() => {}); }
      const layout = await page.textContent("#hud-layout").catch(() => "");
      J.check("2D sheet truth: the HUD says PLAN SHEETS and no 3D corridor is offered for the Building", /^PLAN SHEETS A-101/.test(layout) && (await page.locator("#sheet-3d").count()) === 0, { layout });
    }
    const harvested = await page.evaluate(async () => (await fetch("/api/sightx/sheets/7478006f7fd5b43c")).status);
    J.check("a harvested set's sheets are not served (R2502: 404)", harvested === 404, { status: harvested });
    const place = await placeState(page, mark);
    J.check("one shell: the same document throughout, on the site", place.sameDocument && place.onSite, place);
  }
  await page.close();
  await ctx.close();

  const phone = await J.context("phone");
  const p2 = await openSet(phone);
  if (p2.opened) {
    const rec = JSON.parse(await p2.page.evaluate(async (s) => (await fetch("/api/sightx/sheets/" + s)).text(), SET));
    const i = rec.openings.findIndex((o) => o.mark === PICK);
    await p2.page.locator('#rows tr.tagrow[data-o="' + i + '"] td:nth-child(2)').tap(); await sleep(400);
    await p2.page.evaluate(() => { document.getElementById("info").innerHTML = ""; });
    const at = await ringCentre(p2.page, i);
    await p2.page.touchscreen.tap(at.x, at.y); await sleep(300);
    const c = await card(p2.page);
    if (process.env.SHOTS_DIR) await p2.page.screenshot({ path: process.env.SHOTS_DIR + "/building-phone-" + PICK + ".png" }).catch(() => {});
    J.check("phone: a tap on tag " + PICK + " opens its card", c.startsWith(PICK) && c.includes("tag on A-101"), { card: c.slice(0, 200) });
  } else J.check("phone: the Building opens on its sheet", false, "did not open");
  await phone.close();
});
