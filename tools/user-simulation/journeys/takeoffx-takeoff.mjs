// tools/user-simulation/journeys/takeoffx-takeoff.mjs
//
// Journey map id "takeoffx-takeoff" (priority 2): a signed-in subscriber runs a TakeOffX takeoff on
// their own drawing (/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf).
// Expected: door and hardware counts from the visitor's own drawings, with confidence and a review
// step; reached in place (the TakeOffX page opens in the homepage overlay and leads into the
// takeoff workspace there).
// Throwaway SubConP account; upload rows (by session_id), R2 object, KV copy, demo clone and the
// account rows are deleted in finally.
//
// Usage: node tools/user-simulation/journeys/takeoffx-takeoff.mjs   (exit 0 = all passed)
import { Journey, openHome, raiseDossier, setMark, press, pressIn, until, sleep, signIn, openApp, overlayFrame, frameInfo, workspaceUploadAndExtract } from "../lib/journey-kit.mjs";

const J = new Journey("takeoffx-takeoff", "TakeOffX takeoff");

await J.run(async () => {
  await J.launch();
  const acct = await J.account("takeoff");
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  // The homepage chapter: the stage-1 wall extraction of a public bid sheet.
  await page.evaluate(() => { const s = document.getElementById("takeoffx"); if (s) s.scrollIntoView({ block: "center" }); });
  const walls = await until(() => page.evaluate(() => { const n = (document.getElementById("tx-walls-n") || {}).innerText || ""; const ft = (document.getElementById("tx-walls-ft") || {}).innerText || ""; return /\d/.test(n) && /\d/.test(ft) ? n + " / " + ft : null; }), 20000);
  J.check("the homepage TakeOffX chapter shows the wall extraction (segments and length)", !!walls, walls || "still loading");

  const st = await signIn(page, acct);
  J.check("subscriber signs in on the homepage", st.auth === "signed-in", { auth: st.auth, error: st.error, seconds: st.seconds });
  await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());

  // The TakeOffX page in the overlay, then its own call to action.
  const tf = await openApp(page, "/takeoffx");
  const info = await frameInfo(tf);
  J.check("TakeOffX opens in the overlay", !!info && /^\/takeoffx\/?$/.test(info.path || "") && !info.jsonError, info ? { path: info.path, title: info.title, jsonError: info.jsonError } : "no frame");
  const cta = tf ? await tf.evaluate(() => {
    const a = Array.from(document.querySelectorAll("a, button")).find((x) => x.offsetParent !== null && /takeoff/i.test(x.innerText) && /start|run|new|begin|upload/i.test(x.innerText));
    if (!a) return null;
    a.setAttribute("data-waj-cta", "1");
    return { text: a.innerText.trim(), href: a.getAttribute("href") };
  }) : null;
  J.check("signed in, the TakeOffX page does not ask to sign in again", !!cta && !/sign in/i.test(cta.text), cta || "no takeoff call to action on the page");
  let ws = null;
  if (cta) {
    await pressIn(tf, "[data-waj-cta='1']");
    await sleep(3000);
    ws = await overlayFrame(page, 25000);
  }
  const wsInfo = ws ? await frameInfo(ws) : null;
  const signedInWs = ws ? await ws.evaluate(() => ({ token: !!localStorage.getItem("_authfor_token"), upload: !!document.querySelector("input[type=file]"), login: !!document.getElementById("login-ui") && document.getElementById("login-ui").offsetParent !== null && document.getElementById("login-ui").innerText.trim().length > 0 })).catch(() => null) : null;
  J.check("the takeoff workspace opens in the overlay, signed in, with an upload", !!wsInfo && !!signedInWs && signedInWs.token && signedInWs.upload && !signedInWs.login, { path: wsInfo && wsInfo.path, title: wsInfo && wsInfo.title, ...(signedInWs || {}) });

  // A takeoff on the visitor's own drawing.
  if (ws && (await ws.locator("#upload-form").count())) {
    const run = await workspaceUploadAndExtract(ws, { project: "user-sim takeoff journey " + J.suffix });
    J.note("takeoff_run", { upload: run.upload, tries: run.tries, doorIndex: run.doorIndex });
    const conf = /confidence/i.test(run.doorIndexRaw || "") || run.tries.some((t) => /confidence/i.test(t.result));
    J.check("the takeoff returns door and hardware counts from the uploaded drawing", run.doors > 0, { doors: run.doors, tries: run.tries, upload: run.upload });
    J.check("the counts come with a confidence", run.doors > 0 && conf, conf ? "confidence present" : "no confidence in the result");
    const review = await ws.evaluate(() => Array.from(document.querySelectorAll("button, a")).filter((x) => x.offsetParent !== null && /review|approve|affirm|verify|confirm/i.test(x.innerText)).map((x) => x.innerText.trim().slice(0, 40)).slice(0, 5)).catch(() => []);
    J.check("the takeoff offers a review step", run.doors > 0 && review.length > 0, review.length ? review : "no review control");
  } else if (ws) {
    // A dedicated takeoff workspace: any file input plus a run control.
    J.check("the takeoff returns door and hardware counts from the uploaded drawing", false, "workspace without the known upload form; title=" + (wsInfo && wsInfo.title));
  } else {
    J.check("the takeoff returns door and hardware counts from the uploaded drawing", false, "no takeoff workspace");
  }

  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
