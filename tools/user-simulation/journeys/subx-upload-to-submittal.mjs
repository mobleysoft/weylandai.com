// tools/user-simulation/journeys/subx-upload-to-submittal.mjs
//
// Journey map id "subx-upload-to-submittal" (priority 1): a signed-in subscriber uploads a real
// construction PDF (/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf, a door schedule printed sideways)
// in SubX and gets a submittal.
// Expected: door rows extracted from the schedule, each traceable to its source page and row, and
// a submittal package PDF built and shown in the page, downloadable; all inside the homepage shell
// (the workspace opens in the overlay from the SubX chapter's export button). Since 2026-10-07
// (6d31174) the workspace is: UPLOAD AND READ PAGE 1 -> the door table with a Source column ->
// BUILD THE SUBMITTAL PDF (shown in the page's own viewer, DOWNLOAD PDF). Matched cut sheets come
// from a hardware schedule; for a door schedule alone the package says so, which is recorded.
// Throwaway SubConP account; the upload's D1 rows (by session_id), its R2 object and KV copy, the
// built package (R2 submittals/<session>/final_submittal.pdf), the demo clone and the account rows
// are deleted in finally.
//
// Usage: node tools/user-simulation/journeys/subx-upload-to-submittal.mjs   (exit 0 = all passed)
import { Journey, openHome, raiseDossier, setMark, press, pressIn, waitText, until, sleep, signIn, overlayFrame, subxWorkspace, workspaceDetail, workspaceUploadAndExtract, buildSubmittalPackage } from "../lib/journey-kit.mjs";

const J = new Journey("subx-upload-to-submittal", "Upload a construction PDF and get a submittal (SubX)");

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

  // SubX chapter: the export button opens the workspace in the overlay.
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
  J.check("the SubX chapter's export button (" + (ctaText || "missing") + ") opens the workspace in the overlay, signed in", !!ws && ws.path === "/subx-app" && ws.appVisible && ws.accountToken && !ws.loginVisible, ws || "no overlay workspace");
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
  J.check("the workspace lists the visitor's 'The WeylandAI Building' demo schedule", /WeylandAI Building/i.test(listed || ""), listed || "");
  if (!frame) throw new Error("no SubX workspace frame");

  // Upload the door schedule; the workspace reads page 1 right away.
  const project = "user-sim subx journey " + J.suffix;
  const run = await workspaceUploadAndExtract(frame, { project });
  J.note("upload", { preview: run.preview, upload: run.upload, listed: run.listed, tries: run.tries, detail: run.detail });
  J.check("uploading the PDF creates a schedule in 'Your schedules'", /^Uploaded/i.test(run.upload || "") && run.listed, { upload: run.upload, listed: run.listed });
  const okTry = run.tries.find((t) => /^Page \d+: [1-9]\d* door/i.test(t.result) || /[1-9]\d* doors read in this browser and saved/i.test(t.result));
  J.check("reading the uploaded schedule finds its door rows", !!okTry, run.tries.length ? run.tries : "no read result");
  J.check("the door list shows the rows read", run.doors > 0, run.detail ? { doors: run.doors, note: run.detail.doorNote } : run.upload);
  const traced = run.rows.filter((r) => /^p\.\d+ row \d+/.test(r.source));
  J.check("every door row is traceable to its source page and row", run.doors > 0 && traced.length === run.doors, { rows: run.doors, traced: traced.length, sample: run.rows.slice(0, 3) });

  // The submittal package, built and shown in the page.
  if (run.doors > 0) {
    const dlBefore = page.__downloads.length, popBefore = page.__popups.length;
    const pkg = await buildSubmittalPackage(frame);
    J.note("package", pkg);
    J.check("BUILD THE SUBMITTAL PDF builds the package with the door schedule in it", /^Built:/i.test(pkg.result) && pkg.pages > 0 && /door schedule \(\d+ doors/i.test(pkg.result), pkg.result);
    J.check("the package PDF is shown in the page (no new tab)", !!pkg.viewer && page.__popups.length === popBefore, { viewer: pkg.viewer, newTabs: page.__popups.length - popBefore });
    if (pkg.download) {
      await pressIn(frame, "#package-download");
      const got = await until(async () => page.__downloads.length > dlBefore, 20000, 500);
      J.check("DOWNLOAD PDF saves the package without leaving the page", !!got && page.__popups.length === popBefore, { downloads: page.__downloads.slice(dlBefore), newTabs: page.__popups.length - popBefore });
    } else {
      J.check("DOWNLOAD PDF saves the package without leaving the page", false, "no DOWNLOAD PDF link after building");
    }
  } else {
    J.check("BUILD THE SUBMITTAL PDF builds the package with the door schedule in it", false, "no door rows were read, so there is nothing to package");
  }

  // The demo building: its hardware sets should list the products they hold.
  const demoRow = frame.locator("#sessions-list tr[data-id]").filter({ hasText: /WeylandAI Building/i }).first();
  if (await demoRow.count()) {
    await pressIn(frame, demoRow);
    await until(() => frame.evaluate(() => /WeylandAI Building/i.test((document.getElementById("sd-title") || {}).innerText || "") && (document.querySelectorAll("#doors-wrap tbody tr, #sets-wrap tbody tr").length > 0 || /No rows read yet/i.test((document.getElementById("doors-wrap") || {}).innerText || ""))), 20000, 500);
    const dd = await workspaceDetail(frame);
    J.note("demo_building", { title: dd.title, sub: dd.sub, doors: dd.rows.length, sets: dd.sets.slice(0, 8) });
    const withProducts = dd.sets.filter((s) => /\d+ x \S+/.test(s.items));
    J.check("the demo building's hardware sets list their products", dd.sets.length > 0 && withProducts.length === dd.sets.length, { sets: dd.sets.length, withProducts: withProducts.length, sample: dd.sets.slice(0, 3) });
  }

  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
