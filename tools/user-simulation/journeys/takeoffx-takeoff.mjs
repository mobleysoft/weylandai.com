// tools/user-simulation/journeys/takeoffx-takeoff.mjs
//
// Journey map id "takeoffx-takeoff" (priority 2): a signed-in subscriber runs a TakeOffX takeoff on
// their own drawing (/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf, a door schedule).
// Expected: door and hardware counts from the visitor's own schedule, with how sure they are and a
// review step; reached in place (the TakeOffX page opens in the homepage overlay and leads into the
// takeoff workspace there). Since 2026-10-07 (6d31174, 82aea46) /takeoffx is the SubX workspace in
// takeoff mode (before 82aea46 its START A TAKEOFF led there): the counts (doors, sizes read, fire-rated doors, hardware
// groups, by type/size/rating/group) come with every door row traced to the page and row it was
// read from and a "machine-read: check them against the source page" note - that traceability is
// the confidence this product gives, and the Review step with the row list is the review.
// Throwaway SubConP account; upload rows (by session_id), R2 object, KV copy, demo clone and the
// account rows are deleted in finally.
//
// Usage: node tools/user-simulation/journeys/takeoffx-takeoff.mjs   (exit 0 = all passed)
import { Journey, openHome, raiseDossier, setMark, press, pressIn, sleep, signIn, openApp, overlayFrame, frameInfo, subxWorkspace, workspaceUploadAndExtract } from "../lib/journey-kit.mjs";
import { takeoffCounts } from "../lib/takeoff-assertions.mjs";

const J = new Journey("takeoffx-takeoff", "TakeOffX takeoff");

await J.run(async () => {
  await J.launch();
  const acct = await J.account("takeoff");
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  // The homepage explains that TakeOffX uses the schedule SubX read.
  await page.evaluate(() => { const s = document.getElementById("takeoffx"); if (s) s.scrollIntoView({ block: "center" }); });
  const intro = await page.locator("#takeoffx").innerText();
  J.check("the homepage TakeOffX chapter promises door counts from the shared schedule reader", /Door counts, from the schedule SubX read/i.test(intro) && /source page and row/i.test(intro), intro);
  J.check("the homepage door-count action opens the TakeOffX workspace", await page.locator("#takeoffx a.button").getAttribute("href") === "/takeoffx");

  const st = await signIn(page, acct);
  J.check("subscriber signs in on the homepage", st.auth === "signed-in", { auth: st.auth, error: st.error, seconds: st.seconds });
  await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());

  // TakeOffX in the overlay. Since 82aea46 /takeoffx is the workspace itself in takeoff mode (the
  // upload at once for a signed-in visitor); an older product page led there through its own call
  // to action, which is pressed when the page shows one instead of the upload.
  const tf = await openApp(page, "/takeoffx");
  const info = await frameInfo(tf);
  J.check("TakeOffX opens in the overlay", !!info && /^\/takeoffx\/?$/.test(info.path || "") && !info.jsonError && !info.nestedShell, info ? { path: info.path, title: info.title, jsonError: info.jsonError } : "no frame");
  let ws = tf;
  const direct = tf ? await subxWorkspace(tf, 20000) : null;
  let cta = null;
  if (!(direct && direct.appVisible && tf && (await tf.locator("#upload-form").count()))) {
    cta = tf ? await tf.evaluate(() => {
      const a = Array.from(document.querySelectorAll("a, button")).find((x) => x.offsetParent !== null && /takeoff/i.test(x.innerText) && /start|run|new|begin|upload|sign in/i.test(x.innerText));
      if (!a) return null;
      a.setAttribute("data-waj-cta", "1");
      return { text: a.innerText.trim(), href: a.getAttribute("href") };
    }) : null;
    if (cta && !/sign in/i.test(cta.text)) {
      await pressIn(tf, "[data-waj-cta='1']");
      await sleep(2000);
      ws = await overlayFrame(page, 25000);
    }
  }
  J.note("takeoff_entry", direct && direct.appVisible ? "the workspace itself" : cta ? "the page's call to action: " + cta.text : "neither");
  const signInAsked = (!!direct && direct.loginVisible) || (!!cta && /sign in/i.test(cta.text));
  J.check("signed in, TakeOffX does not ask to sign in again", !signInAsked && (!!(direct && direct.appVisible) || !!cta), { direct: direct && { appVisible: direct.appVisible, login: direct.loginVisible }, cta });
  const wsState = ws ? await subxWorkspace(ws, 25000) : null;
  const mode = ws ? await ws.evaluate(() => ({ takeoff: document.documentElement.classList.contains("takeoff"), heading: ((Array.from(document.querySelectorAll("h1")).find((h) => h.offsetParent !== null) || {}).innerText || "").trim(), upload: !!document.getElementById("upload-form") })).catch(() => null) : null;
  J.check("the takeoff workspace opens in the overlay, signed in, with an upload", !!wsState && wsState.appVisible && wsState.accountToken && !wsState.loginVisible && !!mode && mode.upload,
    { path: wsState && wsState.path, search: wsState && wsState.search, appVisible: wsState && wsState.appVisible, login: wsState && wsState.loginVisible, ...(mode || {}) });
  J.note("takeoff_mode", mode);

  // A takeoff on the visitor's own drawing.
  if (ws && mode && mode.upload) {
    const run = await workspaceUploadAndExtract(ws, { project: "user-sim takeoff journey " + J.suffix });
    J.note("takeoff_run", { upload: run.upload, tries: run.tries, detail: run.detail });
    const tiles = Object.fromEntries((run.detail && run.detail.tiles || []).map((t) => [t.label.toLowerCase(), t.value]));
    const counted = takeoffCounts(run.detail?.tiles, run.rows);
    J.check("the takeoff returns door and hardware counts from the uploaded drawing", counted.ok, { ...counted, tiles, doors: run.doors, tries: run.tries });
    J.check("the counts break down by door type, size, fire rating and hardware group", /by door type/i.test(run.detail && run.detail.counts || "") && /by size/i.test(run.detail.counts) && /by fire rating/i.test(run.detail.counts),
      (run.detail && run.detail.counts || "").slice(0, 200) || "no breakdown");
    const traced = run.rows.filter((r) => /^p\.\d+ row \d+/.test(r.source));
    J.check("each counted door is traceable to the page and row it was read from (the takeoff's confidence)", run.doors > 0 && traced.length === run.doors && /machine-read|check them against the source/i.test(run.detail.doorNote || ""),
      { rows: run.doors, traced: traced.length, note: run.detail && run.detail.doorNote });
    J.check("the takeoff offers a review step (Review is the current step, rows listed, the list can be exported)",
      run.doors > 0 && run.detail.steps.review === "now" && run.detail.actions.some((a) => /door list/i.test(a)), { steps: run.detail && run.detail.steps, actions: run.detail && run.detail.actions });
  } else {
    J.check("the takeoff returns door and hardware counts from the uploaded drawing", false, ws ? "no upload form in the takeoff workspace" : "no takeoff workspace");
  }

  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
