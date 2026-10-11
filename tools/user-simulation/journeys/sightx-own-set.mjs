// tools/user-simulation/journeys/sightx-own-set.mjs
//
// g074: SightX on the customer's own bid set. A signed-in subscriber uploads the WeylandAI Building bid set
// (tools/bidset/out/weylandai-building-bidset.pdf, our own sample, 48 doors on A-601) in SubX, presses
// WALK IT IN SIGHTX, and SightX opens that upload's plan sheets: drawn in the browser from the uploaded PDF
// by the self-hosted pdf.js, door tags where SubX's plan reader (readPlan, weyland-shared) found them, one
// door card per opening, placed-of-total in the HUD, and the openings list as CSV. Checked against the exact
// expectations in tools/bidset/out/truth-doors.json:
//   - SubX reads the door schedule's 48 rows; WALK IT (a button) opens /sightx/?walk=<session> on sheet A-101,
//     drawn, in a same-origin frame over SubX with a close control and focus moved into it; never a page hop:
//     a mark set on the SubX document at load survives the upload, WALK IT, the sheet and CLOSE (focus back on
//     WALK IT, the address unchanged); inside the homepage shell's overlay, WALK IT opens SightX in that overlay;
//   - the HUD's placed-of-total is the openings answer's, and every opening is placed (48 OF 48);
//   - a real click on a tag ring opens its door card: mark, room, size, hardware group, schedule page, the
//     tag's sheet and position;
//   - OPENINGS CSV downloads one row per opening whose mark, room, width, height, pair, hardware group and
//     schedule page equal the drawn schedule's, each placed on A-101;
//   - a phone, signed in as the same subscriber, taps WALK IT in SubX, and a touch tap opens a card (no press-and-hold);
//   - the upload is deleted at the end (DELETE /api/hardware-schedule/session/:id, the owner's own delete).
// Throwaway SubConP account (rows and uploads purged in finally, as every SubX journey).
// Usage: node tools/user-simulation/journeys/sightx-own-set.mjs   (exit 0 = all passed)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Journey, BASE, sleep, openHome, raiseDossier, signIn, setMark, placeState, overlayFrame, workspaceUploadAndExtract } from "../lib/journey-kit.mjs";

const PDF = fileURLToPath(new URL("../../bidset/out/weylandai-building-bidset.pdf", import.meta.url));
const TRUTH = JSON.parse(readFileSync(new URL("../../bidset/out/truth-doors.json", import.meta.url), "utf8"));
const PICK = "100A";
const J = new Journey("sightx-own-set", "SightX on your own bid set: SubX upload, WALK IT, cards and openings CSV");

const card = async (page) => (await page.textContent("#info").catch(() => "")).replace(/\s+/g, " ");
async function ringCentre(page, i) {
  let last = null;
  for (let n = 0; n < 20; n++) {
    const b = await page.locator('#sheet-svg g.tag[data-o="' + i + '"] .ring').boundingBox();
    if (b && last && Math.abs(b.x - last.x) < 0.5 && Math.abs(b.y - last.y) < 0.5) return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    last = b; await sleep(150);
  }
  return last && { x: last.x + last.width / 2, y: last.y + last.height / 2 };
}
/** RFC 4180 rows (quoted cells, doubled quotes). */
export function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, k) => [h, r[k]])));
}
/** Each drawn schedule row against the CSV: the fields an estimator bids from. */
export function csvAgainstTruth(rows, truth, fields = null) {
  const bad = [];
  if (rows.length !== truth.door_count) bad.push("rows " + rows.length + " vs " + truth.door_count);
  for (const t of truth.doors) {
    const r = rows.find((x) => x.mark === t.mark);
    if (!r) { bad.push(t.mark + ": missing"); continue; }
    const want = { room: t.room, width_in: String(t.width_inches), height_in: String(t.height_inches), pair: t.pair ? "yes" : "no", hardware_group: t.hardware_group || "", schedule_page: String(truth.source.pages[0]), placed: "yes", plan_sheet: "A-101" };
    for (const [k, v] of Object.entries(want)) if ((!fields || fields.includes(k)) && r[k] !== v) bad.push(t.mark + " " + k + ": " + JSON.stringify(r[k]) + " vs " + JSON.stringify(v));
  }
  return bad;
}

await J.run(async () => {
  await J.launch();
  const acct = await J.account("ownset");
  const ctx = await J.context("desktop", { acceptDownloads: true });
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const st = await signIn(page, acct);
  J.check("subscriber signs in", st.auth === "signed-in", { auth: st.auth, error: st.error });
  await page.goto(BASE + "/subx-app?journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("#app:not(.hide)", { timeout: 30000 }).catch(() => {});
  // No page hop ever: a mark set on this document at load must survive the upload, WALK IT, the sheet and closing it.
  const mark = await setMark(page);
  const project = "WeylandAI Building (" + J.id + " " + J.suffix + ")";
  const run = await workspaceUploadAndExtract(page, { project, pdf: PDF });
  J.note("upload", { upload: run.upload, tries: run.tries });
  J.check("SubX reads the Building's door schedule: " + TRUTH.door_count + " rows", run.doors === TRUTH.door_count, { doors: run.doors, upload: run.upload, tries: run.tries });
  const sessionId = await page.evaluate(() => { const w = document.getElementById("walk-it"); return w ? w.getAttribute("data-walk") : null; });
  if (sessionId) J.uploads.add(sessionId);
  try {
    await walkIt(page, ctx, sessionId, mark);
  } finally {
    if (sessionId) {
      const del = await page.evaluate(async (id) => {
        const tok = localStorage.getItem("_authfor_token");
        const r = await fetch("/api/hardware-schedule/session/" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin", headers: tok ? { Authorization: "Bearer " + tok } : {} });
        return { status: r.status, body: await r.json().catch(() => ({})) };
      }, sessionId).catch((e) => ({ status: 0, error: String(e).slice(0, 120) }));
      J.check("the upload is deleted by its owner (rows, PDF and cached copy)", del.status === 200 && del.body && del.body.deleted === sessionId, { status: del.status });
    }
    await ctx.close();
  }
});

/** The SightX frame WALK IT opened over SubX (as the top document: #walk-frame). */
async function walkFrame(page, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const h = await page.$("#walk-overlay #walk-frame").catch(() => null);
    const f = h ? await h.contentFrame().catch(() => null) : null;
    if (f && /\/sightx\/?\?.*walk=/.test(f.url())) return f;
    await sleep(250);
  }
  return null;
}
function sheetOpen(f) { return f.waitForFunction(() => { const x = window.SightXSheets && window.SightXSheets.state(); return !!x && x.source === "walk" && (x.image_loaded || (x.sheets.length === 0 && x.total > 0)); }, null, { timeout: 90000 }).then(() => true, () => false); }

// WALK IT on SubX as the top document: SightX in a same-origin frame over SubX, never a navigation.
async function walkIt(page, ctx, sessionId, mark) {
  const walk = page.locator("#walk-it");
  J.check("the schedule offers WALK IT IN SIGHTX (a button, not a link)", !!sessionId && (await walk.count()) === 1 && /WALK IT/i.test(await walk.innerText().catch(() => "")) && (await walk.evaluate((b) => b.tagName)) === "BUTTON", { session: sessionId && sessionId.slice(0, 8) });
  if (!sessionId || !(await walk.count())) return;
  const url0 = page.url();
  await walk.click();
  const f = await walkFrame(page);
  const opened = !!f && await sheetOpen(f);
  const s0 = f ? await f.evaluate(() => window.SightXSheets && window.SightXSheets.state()) : null;
  const shown = await page.evaluate(() => { const o = document.getElementById("walk-overlay"), c = document.getElementById("walk-close"); return { overlay: !!o && o.getBoundingClientRect().height > 0, close: !!c && c.offsetParent !== null, focus: document.activeElement && document.activeElement.id }; });
  J.check("WALK IT opens SightX in a frame over SubX (close control shown, focus in the frame) on this upload's plan sheet A-101, drawn in the browser from the uploaded PDF",
    opened && !!s0 && s0.session === sessionId && JSON.stringify(s0.sheets) === '["A-101"]' && s0.image_loaded && shown.overlay && shown.close && shown.focus === "walk-frame" && page.url() === url0,
    { frame: f && f.url().replace(/walk=[^&]+/, "walk=<session>"), shown, address_unchanged: page.url() === url0, state: s0 && { sheets: s0.sheets, image_loaded: s0.image_loaded, placed: s0.placed, total: s0.total }, status: f ? await f.textContent("#sx-status").catch(() => "") : "no SightX frame" });
  if (!opened) return;
  const hud = (await f.textContent("#hud-count").catch(() => "")).trim();
  J.check("the HUD shows placed-of-total: every opening of the schedule is placed (" + TRUTH.door_count + " OF " + TRUTH.door_count + " PLACED)", hud === s0.placed + " OF " + s0.total + " PLACED" && s0.total === TRUTH.door_count && s0.placed === TRUTH.door_count, { hud });
  J.check("the sheet draws one ring per placed opening, the table one row per opening", s0.tags_drawn === s0.placed && s0.table_rows === s0.total, { drawn: s0.tags_drawn, rows: s0.table_rows });
  const i = await f.evaluate((m) => [...document.querySelectorAll("#rows tr.tagrow")].findIndex((tr) => tr.querySelector("td b").textContent === m), PICK);
  const t = TRUTH.doors.find((d) => d.mark === PICK);
  await f.locator('#rows tr.tagrow[data-o="' + i + '"] td:nth-child(2)').click(); await sleep(500);
  await f.evaluate(() => { document.getElementById("info").innerHTML = ""; });
  const at = await ringCentre(f, i);
  if (at) { await page.mouse.click(at.x, at.y); await sleep(300); }
  const c = await card(f);
  J.check("clicking tag " + PICK + " opens its door card: " + t.room + ", " + t.width + " x " + t.height + (t.pair ? " (pair)" : "") + ", group " + t.hardware_group + ", schedule page 3, its tag on A-101 with its position",
    c.startsWith(PICK) && c.includes(t.room) && c.includes(t.width + " x " + t.height) && c.includes("HW GROUP" + t.hardware_group) && /SCHEDULE ?page 3/.test(c) && /tag on A-101 p\.2 at x \d+, y \d+ pt/.test(c), { card: c.slice(0, 360) });
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }).catch(() => null), f.locator("#sheet-csv").click()]);
  let rows = [];
  if (dl) { const p = await dl.path().catch(() => null); if (p) rows = parseCsv(readFileSync(p, "utf8")); }
  const bad = csvAgainstTruth(rows, TRUTH, ["room", "width_in", "height_in", "hardware_group", "schedule_page", "placed", "plan_sheet"]);
  J.check("OPENINGS CSV downloads " + TRUTH.door_count + " rows equal to the drawn schedule (mark, room, width, height, group, schedule page, placed on A-101)", !!dl && bad.length === 0, { file: dl && dl.suggestedFilename(), rows: rows.length, mismatches: bad.slice(0, 12), mismatch_count: bad.length });
  // The schedule prints PAIR in its REMARKS column; SubX's reader takes it from there since g074.
  const pairs = csvAgainstTruth(rows, TRUTH, ["pair"]).filter((b) => / pair: /.test(b));
  J.check("the CSV's pair column is the drawn schedule's (" + TRUTH.doors.filter((t) => t.pair).map((t) => t.mark).join(", ") + " pairs, the rest single)", !!dl && rows.length === TRUTH.door_count && pairs.length === 0, { mismatches: pairs });
  if (process.env.SHOTS_DIR) await page.screenshot({ path: process.env.SHOTS_DIR + "/own-set-walk-" + PICK + ".png" }).catch(() => {});
  await page.locator("#walk-close").click(); await sleep(400);
  const after = await page.evaluate(() => ({ overlay: !!document.getElementById("walk-overlay"), focus: document.activeElement && document.activeElement.id }));
  const place = await placeState(page, mark);
  J.check("no page hop: CLOSE returns to SubX, focus back on WALK IT, the same document at the same address throughout", place.sameDocument && place.onSite && page.url() === url0 && !after.overlay && after.focus === "walk-it", { ...place, after });

  const phone = await J.context("phone", { storageState: await ctx.storageState() });
  const pp = await J.page(phone);
  await pp.goto(BASE + "/subx-app?journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
  const pmark = await setMark(pp);
  const row = pp.locator('#sessions-list tr[data-id="' + sessionId + '"]');
  await row.waitFor({ timeout: 30000 }).catch(() => {});
  if (await row.count()) await row.first().tap();
  const pw = pp.locator("#walk-it");
  await pw.waitFor({ timeout: 45000 }).catch(() => {});
  let pc = "", pOpen = false;
  if (await pw.count()) {
    await pw.tap();
    const pf = await walkFrame(pp);
    pOpen = !!pf && await sheetOpen(pf);
    if (pOpen) {
      await pf.locator('#rows tr.tagrow[data-o="' + i + '"] td:nth-child(2)').tap(); await sleep(500);
      await pf.evaluate(() => { document.getElementById("info").innerHTML = ""; });
      const pat = await ringCentre(pf, i);
      if (pat) { await pp.touchscreen.tap(pat.x, pat.y); await sleep(300); }
      pc = await card(pf);
      if (process.env.SHOTS_DIR) await pp.screenshot({ path: process.env.SHOTS_DIR + "/own-set-phone-" + PICK + ".png" }).catch(() => {});
      await pp.locator("#walk-close").tap(); await sleep(400);
    }
  }
  const pplace = await placeState(pp, pmark);
  J.check("phone: WALK IT taps open over SubX, a touch tap on tag " + PICK + " opens its card, CLOSE returns, same document", pOpen && pc.startsWith(PICK) && pc.includes(t.room) && pc.includes("tag on A-101") && pplace.sameDocument && !(await pp.locator("#walk-overlay").count()), { card: pc.slice(0, 200), ...pplace });
  await phone.close();

  // Inside the homepage shell's overlay: WALK IT asks the shell to open SightX in its overlay; the homepage stays.
  const hp = await J.page(ctx);
  await openHome(hp, J);
  const hmark = await setMark(hp);
  await hp.evaluate(() => window.WeylandShell && window.WeylandShell.open("app", { path: "/subx-app" }));
  const sf = await overlayFrame(hp, 25000);
  let viaShell = false;
  if (sf) {
    const r = sf.locator('#sessions-list tr[data-id="' + sessionId + '"]');
    await r.waitFor({ timeout: 30000 }).catch(() => {});
    if (await r.count()) await r.first().click();
    const b = sf.locator("#walk-it");
    await b.waitFor({ timeout: 45000 }).catch(() => {});
    if (await b.count()) {
      await b.click();
      const end = Date.now() + 30000;
      let xf = null;
      while (Date.now() < end && !xf) { const x = await overlayFrame(hp, 2000); if (x && /\/sightx\/?\?.*walk=/.test(x.url())) xf = x; else await sleep(300); }
      viaShell = !!xf && await sheetOpen(xf);
    }
  }
  const hplace = await placeState(hp, hmark);
  J.check("inside the homepage shell's overlay, WALK IT opens SightX in the shell's overlay and the homepage document stays", viaShell && hplace.sameDocument && hplace.onSite, hplace);
  await hp.close();
}
