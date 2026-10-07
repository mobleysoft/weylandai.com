// tools/user-simulation/journeys/subx-upload-to-submittal.mjs
//
// Journey map id "subx-upload-to-submittal" (priority 1): a signed-in subscriber uploads a real
// construction PDF (/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf, a door schedule) in SubX and gets
// a submittal.
// Expected: door rows extracted from the schedule, matched cut sheets, and a downloadable submittal
// packet PDF with every line traceable to its source; all inside the homepage shell (the workspace
// opens in the overlay from the SubX chapter's EXPORT THE REAL PDF PACKAGE).
// Throwaway SubConP account; the upload's D1 rows (by session_id), its R2 object and KV copy, the
// demo clone and the account rows are deleted in finally.
//
// Usage: node tools/user-simulation/journeys/subx-upload-to-submittal.mjs   (exit 0 = all passed)
import { Journey, openHome, raiseDossier, setMark, press, pressIn, waitText, until, sleep, signIn, overlayFrame, subxWorkspace, workspaceUploadAndExtract } from "../lib/journey-kit.mjs";

const J = new Journey("subx-upload-to-submittal", "Upload a construction PDF and get a submittal (SubX)");

function parseJson(text) { try { return JSON.parse(text); } catch (e) { return null; } }
// Hardware lines carrying a real manufacturer and model, anywhere in an export document.
function matchedLines(doc) {
  const out = [];
  const walk = (v) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    const mfr = v.manufacturer || v.mfr, model = v.model || v.model_number || v.catalog_number;
    if (typeof mfr === "string" && mfr.trim() && typeof model === "string" && model.trim()) out.push(mfr.trim() + " " + model.trim());
    Object.values(v).forEach(walk);
  };
  walk(doc);
  return out;
}
async function exportLines(frame) {
  await pressIn(frame, "#export-btn");
  const ex = await waitText(frame, "#raw-output", /^\{|HTTP|error/i, 30000, /^Loading/i);
  return { lines: matchedLines(parseJson(ex || "")), raw: (ex || "").replace(/\s+/g, " ").slice(0, 200) };
}

await J.run(async () => {
  await J.launch();
  const acct = await J.account("subx");
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);
  const st = await signIn(page, acct);
  J.check("subscriber signs in on the homepage", st.auth === "signed-in", { auth: st.auth, error: st.error, seconds: st.seconds });
  await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());

  // SubX chapter: the export CTA opens the workspace in the overlay.
  await page.evaluate(() => { const s = document.getElementById("subx"); if (s) s.scrollIntoView({ block: "center" }); });
  // The chapter clones the demo project for this visitor as it comes into view; read it like a
  // visitor would, once the session badge says the private copy is live.
  const badge = await waitText(page, "#session-badge", /LIVE|VERIFIED|fail/i, 45000);
  J.note("subx_chapter_badge", badge);
  await sleep(800);
  const cta = page.locator("#subx a, #subx button").filter({ hasText: /pdf package|export/i }).first();
  const ctaText = (await cta.innerText().catch(() => "")).trim();
  let frame = null;
  if (await cta.count()) {
    await press(page, cta);
    frame = await overlayFrame(page, 25000);
  }
  const ws = frame ? await subxWorkspace(frame, 25000) : null;
  J.check("the SubX chapter's export button (" + (ctaText || "missing") + ") opens the workspace in the overlay, signed in", !!ws && ws.path === "/subx-app" && ws.appVisible && ws.accountToken, ws || "no overlay workspace");
  if (!frame) { await page.evaluate(() => window.WeylandShell.open("app", { path: "/subx-app" })); frame = await overlayFrame(page, 25000); }
  if (!frame) throw new Error("no SubX workspace frame");
  let listed = ws ? ws.sessions : (await subxWorkspace(frame)).sessions;
  J.note("workspace_sessions_first_load", listed);
  if (!/WeylandAI Building/i.test(listed || "")) {
    // Seen intermittently: the list right after the clone is written comes back empty. A visitor
    // would open the workspace again; do the same once and record that it took a second look.
    await page.evaluate(() => window.WeylandShell.close());
    await sleep(4000);
    await page.evaluate(() => window.WeylandShell.open("app", { path: "/subx-app" }));
    frame = await overlayFrame(page, 25000);
    listed = frame ? (await subxWorkspace(frame)).sessions + " (listed only after reopening the workspace)" : "no frame";
  }
  J.check("the workspace lists the visitor's 'The WeylandAI Building' demo session", /WeylandAI Building/i.test(listed || ""), listed || "");
  if (!frame) throw new Error("no SubX workspace frame");

  // Upload the door schedule and extract it.
  const project = "user-sim subx journey " + J.suffix;
  const run = await workspaceUploadAndExtract(frame, { project });
  J.note("upload", { raster: run.raster, upload: run.upload, listed: run.listed });
  J.check("uploading the PDF creates a session", /Session created/i.test(run.upload || ""), run.upload);
  const okTry = run.tries.find((t) => /succeeded/i.test(t.result) && !/\b0 (hardware group|door|row)/i.test(t.result));
  J.check("extraction of the uploaded schedule succeeds with rows found", !!okTry, run.tries.length ? run.tries : "no extraction control");
  J.check("the door index lists the extracted doors", run.doors > 0, run.doorIndex || run.doorIndexRaw.slice(0, 200));
  const ex = run.listed ? await exportLines(frame) : { lines: [], raw: "no session" };
  J.check("the export carries matched products (manufacturer and model) for the uploaded schedule", ex.lines.length > 0, ex.lines.length ? ex.lines.slice(0, 5) : ex.raw);

  // The submittal packet PDF.
  const packetCtl = await frame.evaluate(() => {
    const els = Array.from(document.querySelectorAll("button, a")).filter((el) => el.offsetParent !== null && el.id !== "export-btn");
    const hit = els.find((el) => /submittal|packet|package/i.test(el.innerText) && /pdf|build|generate|export|download|create/i.test(el.innerText));
    if (!hit) return null;
    hit.setAttribute("data-waj-packet", "1");
    return hit.innerText.trim().slice(0, 80);
  });
  if (packetCtl) {
    const t0 = Date.now(), dlBefore = page.__downloads.length, popBefore = page.__popups.length;
    await pressIn(frame, "[data-waj-packet='1']");
    const got = await until(async () => J.responses(t0, /./).some((e) => e.ct === "application/pdf" && e.status === 200) || page.__downloads.length > dlBefore || page.__popups.length > popBefore, 180000, 1000);
    J.check("the workspace builds a downloadable submittal packet PDF", !!got, { control: packetCtl, pdfResponses: J.responses(t0, /./).filter((e) => e.ct === "application/pdf").map((e) => e.path + " " + e.status), downloads: page.__downloads.slice(dlBefore) });
  } else {
    J.check("the workspace builds a downloadable submittal packet PDF", false, "no control to build the submittal packet PDF in the workspace");
  }

  // The demo building's export (the map saw empty type / manufacturer / model on its first component).
  const demoRow = frame.locator("#sessions-list tr[data-session]").filter({ hasText: /WeylandAI Building/i }).first();
  if (await demoRow.count()) {
    await pressIn(frame, demoRow);
    await sleep(2000);
    const dex = await exportLines(frame);
    J.check("the demo building's export carries manufacturer and model for its hardware", dex.lines.length > 0, dex.lines.length ? dex.lines.slice(0, 5) : dex.raw);
  }

  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
