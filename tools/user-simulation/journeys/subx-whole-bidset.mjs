// tools/user-simulation/journeys/subx-whole-bidset.mjs
//
// g084: a whole bid set over 30 MB. A signed-in subscriber chooses the whole set in SubX; the tab keeps the door
// schedule, hardware and plan pages, uploads only those, and the read, its sources and WALK IT IN SIGHTX use the bid
// set's own page numbers and sheets. The set is the operator's local copy, never a file in this public repository,
// and the expectations come with it:
//   BIDSET_PDF=<a PDF over 30 MB> EXPECT_ROWS=<schedule rows> EXPECT_SOURCE_PAGES=<p,p,...>
//   EXPECT_PLAN_SHEETS=<sheet,sheet,...> MIN_PLACED=<openings placed on the plans>
// Without BIDSET_PDF the journey fails saying so; it is not part of the default gate.
// Throwaway SubConP account (rows and uploads purged in finally, as every SubX journey); the owner deletes the upload.
// Usage: BIDSET_PDF=... node tools/user-simulation/journeys/subx-whole-bidset.mjs   (exit 0 = all passed)
import { statSync } from "node:fs";
import { Journey, BASE, sleep, openHome, raiseDossier, signIn, setMark, placeState, workspaceUploadAndExtract } from "../lib/journey-kit.mjs";

const PDF = process.env.BIDSET_PDF || "";
const LIMIT = 30 * 1024 * 1024;
const EXPECT_ROWS = parseInt(process.env.EXPECT_ROWS || "0", 10);
const SOURCE_PAGES = new Set((process.env.EXPECT_SOURCE_PAGES || "").split(",").map((s) => s.trim()).filter(Boolean));
const PLAN_SHEETS = (process.env.EXPECT_PLAN_SHEETS || "").split(",").map((s) => s.trim()).filter(Boolean);
const MIN_PLACED = parseInt(process.env.MIN_PLACED || "1", 10);
const J = new Journey("subx-whole-bidset", "A whole bid set over 30 MB: cut in the tab, read with the bid set's own pages, walked in SightX");

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
function sheetOpen(f) { return f.waitForFunction(() => { const x = window.SightXSheets && window.SightXSheets.state(); return !!x && x.source === "walk" && (x.image_loaded || (x.sheets.length === 0 && x.total > 0)); }, null, { timeout: 180000 }).then(() => true, () => false); }

await J.run(async () => {
  let size = 0;
  try { size = PDF ? statSync(PDF).size : 0; } catch (_) { size = 0; }
  J.check("a whole bid set over 30 MB is supplied (BIDSET_PDF)", size > LIMIT, { size_mb: +(size / 1048576).toFixed(1) });
  if (!(size > LIMIT)) return;
  await J.launch();
  const acct = await J.account("bidset");
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const st = await signIn(page, acct);
  J.check("subscriber signs in", st.auth === "signed-in", { auth: st.auth, error: st.error });
  await page.goto(BASE + "/subx-app?journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("#app:not(.hide)", { timeout: 30000 }).catch(() => {});
  const mark = await setMark(page);
  // The upload line while it works is the user's evidence: how many pages the tab kept, how much it sends.
  const seen = [];
  const watch = setInterval(() => {
    page.textContent("#upload-result").then((t) => { t = (t || "").replace(/\s+/g, " ").trim(); if (t && seen[seen.length - 1] !== t) seen.push(t); }).catch(() => {});
  }, 200);
  const project = "Whole bid set (" + J.id + " " + J.suffix + ")";
  let run = { upload: null, tries: [], rows: [], doors: 0 };
  try { run = await workspaceUploadAndExtract(page, { project, pdf: PDF, uploadMs: 900000 }); } finally { clearInterval(watch); }
  J.note("upload", { upload: run.upload, tries: run.tries, lines: seen.slice(0, 12) });
  const kept = seen.map((t) => /Keeping (\d+) of (\d+) pages/i.exec(t)).find(Boolean);
  const sent = seen.map((t) => /Uploading (\d+(?:\.\d+)?) MB/i.exec(t)).find(Boolean);
  J.check("the tab keeps only the schedule and plan pages and says how many (Keeping N of M pages)", !!kept && +kept[1] > 0 && +kept[1] < +kept[2], { kept: kept && kept[0], lines: seen.slice(0, 8) });
  J.check("only the cut leaves the browser, under 30 MB (Uploading X MB)", !!sent && +sent[1] < 30, { uploading: sent && sent[0] });
  J.check("SubX uploads the cut and opens it", /^Uploaded/i.test(run.upload || ""), { upload: run.upload });
  const sessionId = await page.evaluate(() => { const w = document.getElementById("walk-it"); return w ? w.getAttribute("data-walk") : null; });
  if (sessionId) J.uploads.add(sessionId);
  try {
    J.check("SubX reads the door schedule" + (EXPECT_ROWS ? ": " + EXPECT_ROWS + " rows" : ""), EXPECT_ROWS ? run.doors === EXPECT_ROWS : run.doors > 0, { doors: run.doors, tries: run.tries });
    const pages = run.rows.map((r) => (/^p\.(\d+)/.exec(r.source || "") || [])[1]).filter(Boolean);
    const outside = pages.filter((p) => SOURCE_PAGES.size && !SOURCE_PAGES.has(p));
    J.check("every row's source cites the bid set's own page" + (SOURCE_PAGES.size ? " (" + [...SOURCE_PAGES].join(", ") + ")" : ""),
      pages.length > 0 && pages.length === run.rows.length && outside.length === 0,
      { pages: [...new Set(pages)], outside: outside.slice(0, 5), sample: run.rows.slice(0, 3).map((r) => r.source) });
    await walk(page, sessionId, mark);
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

async function walk(page, sessionId, mark) {
  const btn = page.locator("#walk-it");
  J.check("the schedule offers WALK IT IN SIGHTX", !!sessionId && (await btn.count()) === 1, { session: sessionId && sessionId.slice(0, 8) });
  if (!sessionId || !(await btn.count())) return;
  const url0 = page.url();
  await btn.click();
  const f = await walkFrame(page);
  const opened = !!f && await sheetOpen(f);
  const s = f ? await f.evaluate(() => window.SightXSheets && window.SightXSheets.state()) : null;
  J.check("WALK IT opens SightX on the set's own plan sheets" + (PLAN_SHEETS.length ? " (" + PLAN_SHEETS.join(", ") + ")" : ""),
    opened && !!s && s.session === sessionId && (s.sheets || []).length > 0 && PLAN_SHEETS.every((x) => (s.sheets || []).includes(x)),
    { sheets: s && s.sheets, image_loaded: s && s.image_loaded, status: f ? await f.textContent("#sx-status").catch(() => "") : "no SightX frame" });
  if (!opened || !s) return;
  const hud = (await f.textContent("#hud-count").catch(() => "")).trim();
  J.check("door tags are placed on those plans: at least " + MIN_PLACED + " openings (HUD placed-of-total)", s.placed >= MIN_PLACED && hud === s.placed + " OF " + s.total + " PLACED", { hud, placed: s.placed, total: s.total });
  J.check("the sheet draws one ring per placed opening", s.tags_drawn === s.placed, { drawn: s.tags_drawn, placed: s.placed });
  if (process.env.SHOTS_DIR) await page.screenshot({ path: process.env.SHOTS_DIR + "/whole-bidset-walk.png" }).catch(() => {});
  await page.locator("#walk-close").click(); await sleep(400);
  const place = await placeState(page, mark);
  J.check("no page hop: the same SubX document at the same address throughout", place.sameDocument && place.onSite && page.url() === url0, place);
}
