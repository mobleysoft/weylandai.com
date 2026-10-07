// tools/user-simulation/journeys/propx-proposal.mjs
//
// Journey map id "propx-proposal" (priority 2): a visitor prices the PropX sample proposal on the
// homepage and opens its PDF, then (signed in) uses the real builder, which belongs in the overlay.
// Expected: a priced proposal with subtotal, tax and total, and a real PDF; in the builder (in the
// overlay), a schedule the visitor has - their own SubX schedules, or SubX's demo schedule for an
// account without one (2026-10-07) - priced into a saved proposal, its PDF shown in place; all in
// place.
// Throwaway SubConP account for the builder; proposals (rows and R2 PDFs), demo clones and the
// account rows are deleted in finally.
//
// Usage: node tools/user-simulation/journeys/propx-proposal.mjs   (exit 0 = all passed)
import { Journey, BASE, d1, q, openHome, raiseDossier, setMark, press, pressIn, waitText, until, sleep, signIn, openApp, frameInfo, documentOutcome, closeOverlay } from "../lib/journey-kit.mjs";

const J = new Journey("propx-proposal", "PropX proposal");

await J.run(async () => {
  await J.launch();
  const acct = await J.account("propx");
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  // Homepage PropX chapter: TRY A REAL PROPOSAL.
  await page.evaluate(() => { const s = document.getElementById("propx-live-demo"); if (s) s.scrollIntoView({ block: "center" }); });
  await page.fill("#px-client", "User Simulation PropX");
  await page.fill("#px-tax", "8.25");
  await press(page, "#px-generate-btn");
  const gen = (await waitText(page, "#px-results", /Generated|include|plan|failed|error|Unexpected/i, 45000, /^Pricing the sample/i)) || "";
  const priced = /^Generated/i.test(gen) && /Subtotal/i.test(gen) && /Tax \(8\.25%\)/i.test(gen) && /Total/i.test(gen) && /\$[\d,]+\.\d\d/.test(gen);
  J.check("PropX GENERATE prices the sample proposal (subtotal, tax, total)", priced, gen.replace(/\s+/g, " ").slice(0, 220));
  const pdfBtn = page.locator("#px-pdf-btn");
  if (await pdfBtn.isEnabled().catch(() => false)) {
    const ref = { since: Date.now(), apiRe: /\/api\/proposals\/demo$/, popupsBefore: page.__popups.length, downloadsBefore: page.__downloads.length };
    await press(page, pdfBtn);
    const o = await documentOutcome(J, page, ref);
    J.check("OPEN REAL PDF opens the rendered proposal PDF", o.ok && (o.newTab || o.downloads.length > 0 || o.pdf.drawn || o.inPage.viewers > 0), o);
    J.check("OPEN REAL PDF shows it in place (no new tab)", o.ok && !o.newTab && (o.pdf.drawn || o.inPage.viewers > 0), { newTab: o.newTab, pdf: o.pdf, inPage: o.inPage });
    if (o.pdf.open) await closeOverlay(page, "escape");
  } else {
    J.check("OPEN REAL PDF opens the rendered proposal PDF", false, "OPEN REAL PDF is not enabled after GENERATE");
  }

  // The real builder, signed in, in the overlay.
  const st = await signIn(page, acct);
  J.check("subscriber signs in on the homepage", st.auth === "signed-in", { auth: st.auth, error: st.error, seconds: st.seconds });
  await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());
  const fr = await openApp(page, "/propx-app");
  const fi = await frameInfo(fr);
  const isBuilder = !!fi && /^\/propx-app\/?$/.test(fi.path || "") && !fi.jsonError && fi.ids.includes("generateBtn");
  J.check("the PropX builder opens in the overlay", isBuilder, fi ? { path: fi.path, title: fi.title, jsonError: fi.jsonError } : "no frame");
  let surface = fr, where = "overlay", standalone = null;
  if (!isBuilder) {
    await page.evaluate(() => window.WeylandShell.close());
    standalone = await J.page(ctx);
    await standalone.goto(BASE + "/propx-app", { waitUntil: "load" });
    surface = standalone; where = "standalone";
  }
  J.note("builder_surface", where);
  // The schedules the builder offers: the visitor's own SubX schedules and/or the demo building.
  const sources = await until(() => surface.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".source[data-source]"));
    if (cards.length) return cards.map((c) => ({ key: c.getAttribute("data-source"), demo: /demo schedule/i.test(c.innerText), text: c.innerText.replace(/\s+/g, " ").trim().slice(0, 80) }));
    const sel = document.querySelector("#submittalListWrap select");
    if (sel) return Array.from(sel.options).filter((o) => o.value).map((o) => ({ key: o.value, demo: false, text: o.textContent.trim().slice(0, 80) }));
    const gate = document.getElementById("gateCard");
    if (gate && !gate.hidden && gate.offsetParent !== null) return [{ gate: gate.innerText.replace(/\s+/g, " ").trim().slice(0, 120) }];
    return null;
  }), 30000, 500);
  const offered = Array.isArray(sources) ? sources.filter((x) => x.key) : [];
  J.note("builder_sources", sources);
  J.check("the builder loads a door schedule to price (" + where + ")", offered.length > 0, sources || "nothing offered");
  // Since 2026-10-07 (66de9a7) the builder prices data the visitor really has: their own SubX
  // sessions and submittals, plus SubX's demo schedule to start from. A fresh account has no
  // schedule of its own (SubX extraction is its own journey), so the expectation is read from D1:
  // the builder must offer every schedule the account owns, and a demo schedule.
  const [ownS, ownSub] = await d1([
    "SELECT h.id FROM hardware_extraction_sessions h WHERE h.user_id = " + q(acct.userId) + " AND COALESCE(h.file_buffer_key, '') NOT LIKE 'demo-clone/%' AND ((SELECT COUNT(*) FROM door_schedule_entries d WHERE d.session_id = h.id) + (SELECT COUNT(*) FROM door_hardware_matrix m WHERE m.session_id = h.id) + (SELECT COUNT(*) FROM hardware_sets s WHERE s.session_id = h.id)) > 0;",
    "SELECT id FROM submittals WHERE user_id = " + q(acct.userId) + " AND deleted_at IS NULL;"
  ]);
  const own = [...(ownS.results || []).map((r) => "session:" + r.id), ...(ownSub.results || []).map((r) => "submittal:" + r.id)];
  J.note("own_schedules_in_d1", own.length);
  J.check("the builder offers a demo schedule to start from (" + where + ")", offered.some((x) => x.demo), offered.map((x) => x.text));
  J.check("the builder offers every schedule the account owns (" + own.length + " in D1) (" + where + ")", own.every((k) => offered.some((x) => x.key === k)), { own, offered: offered.map((x) => x.key) });
  if (offered.length) {
    await until(() => surface.evaluate(() => document.body.getAttribute("data-px-state") === "ready" || (() => { const f = document.getElementById("formCard") || document.getElementById("detailsCard"); return !!f && !f.hidden && f.offsetParent !== null; })()), 30000, 500);
    await surface.fill("#fClientName", "User Simulation PropX builder").catch(() => {});
    await pressIn(surface, "#generateBtn");
    const res = (await waitText(surface, "#resultWrap", /Proposal|error|failed|include/i, 180000)) || "";
    J.check("the builder prices the schedule into a saved proposal (subtotal, tax, total) (" + where + ")", /Proposal #\S+/i.test(res) && /subtotal/i.test(res) && /total/i.test(res) && !/error|failed/i.test(res.split("\n")[0]), res.replace(/\s+/g, " ").slice(0, 220));
    const preview = await until(() => surface.evaluate(() => { const f = document.getElementById("pdfPreview"); if (!f) return null; const r = f.getBoundingClientRect(); return r.width > 200 && r.height > 200 ? (f.getAttribute("src") || "").slice(0, 20) : null; }), 60000, 500);
    J.check("the proposal PDF shows in place (" + where + ")", !!preview, preview || "no PDF preview in the builder");
    const dlLink = surface.locator("#pdfDownload, #downloadBtn").first();
    if (await dlLink.count()) {
      const host = standalone || page;
      const t0 = Date.now(), dl = host.__downloads.length, pop = host.__popups.length;
      await pressIn(surface, dlLink);
      const got = await until(async () => host.__downloads.length > dl || J.responses(t0, /./).some((e) => e.ct === "application/pdf" && e.status === 200), 60000, 500);
      J.check("DOWNLOAD PDF saves the proposal PDF without leaving the page (" + where + ")", !!got && host.__popups.length === pop, { downloads: host.__downloads.slice(dl), newTabs: host.__popups.length - pop });
    } else {
      J.check("DOWNLOAD PDF saves the proposal PDF without leaving the page (" + where + ")", false, "no DOWNLOAD PDF control");
    }
    const saved = await until(() => surface.evaluate(() => { const m = document.getElementById("mineList"); return m && m.innerText.trim() ? m.innerText.replace(/\s+/g, " ").slice(0, 160) : null; }), 15000, 500);
    J.check("the proposal is listed with the account's saved proposals (" + where + ")", !!saved, saved || "no saved proposals listed");
  }
  if (standalone) await standalone.close();
  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
