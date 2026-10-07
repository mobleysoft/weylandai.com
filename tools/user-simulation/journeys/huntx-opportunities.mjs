// tools/user-simulation/journeys/huntx-opportunities.mjs
//
// Journey map id "huntx-opportunities" (priority 2): a visitor reads the HuntX chapter on the
// homepage (index, search, source filter, public source links), then uses the HuntX app in the
// overlay (as a guest, then signed in): search and REFRESH FROM SOURCES.
// Expected: public construction opportunities matching the search, each linking to its public
// source; the homepage search finds what the index holds (not only the rows already loaded);
// REFRESH reports a real number; all in place.
// A throwaway SubConP account for the signed-in part; rows and demo clones deleted in finally.
// REFRESH FROM SOURCES runs one request-driven ingest (the documented side effect of that button).
//
// Usage: node tools/user-simulation/journeys/huntx-opportunities.mjs   (exit 0 = all passed)
import { Journey, openHome, raiseDossier, setMark, placeState, press, pressIn, waitText, until, sleep, signIn, openApp, overlayFrame, frameInfo } from "../lib/journey-kit.mjs";

const J = new Journey("huntx-opportunities", "HuntX opportunities");
const num = (t) => Number(String(t || "").replace(/[^\d]/g, "")) || 0;

async function appState(f) {
  return f.evaluate(() => {
    const app = document.getElementById("app");
    const gate = document.getElementById("signin-btn");
    const note = document.getElementById("guest-note");
    return {
      app: !!app && !app.hidden && app.style.display !== "none" && app.getBoundingClientRect().height > 0,
      gate: (!!gate && !gate.hidden && gate.style.display !== "none" && gate.offsetParent !== null) || (!!note && !note.hidden && note.style.display !== "none" && note.offsetParent !== null),
      count: ((document.getElementById("hx-count") || {}).innerText || "").trim(),
      rows: document.querySelectorAll("#hx-body tr a[href^='http']").length,
      status: ((document.getElementById("hx-status") || {}).innerText || "").trim().slice(0, 200)
    };
  }).catch((e) => ({ error: String(e.message || e).slice(0, 100) }));
}

await J.run(async () => {
  await J.launch();
  const acct = await J.account("hunt");
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  // Homepage chapter.
  await page.evaluate(() => { const s = document.getElementById("huntx"); if (s) s.scrollIntoView({ block: "center" }); });
  const status = (await waitText(page, "#hx-status", /opportunities in the index|no opportunities|Couldn't|include|plan/i, 30000, /^(Loading|Connecting)/i)) || "";
  J.check("the HuntX chapter loads the opportunity index (count, source, ingest time)", /\d+ opportunities in the index/i.test(status) && /ingested/i.test(status), status);
  const links = await page.evaluate(() => Array.from(document.querySelectorAll("#hx-body tr a")).slice(0, 20).map((a) => a.getAttribute("href") || ""));
  const external = links.filter((h) => { try { const u = new URL(h); return /^https?:$/.test(u.protocol) && u.host && !/weylandai\.com$/.test(u.host); } catch (e) { return false; } });
  J.check("each opportunity links to its public source", links.length > 0 && external.length === links.length, { rows: links.length, external: external.length, sample: links.slice(0, 3) });

  await page.fill("#hx-search", "Bridge");
  const found = await until(async () => num(await page.evaluate(() => (document.getElementById("hx-count") || {}).innerText)) > 0, 10000, 500);
  const bridgeCount = await page.evaluate(() => (document.getElementById("hx-count") || {}).innerText);
  J.check("chapter search 'Bridge' finds matching opportunities", !!found, "count=" + bridgeCount);
  await page.fill("#hx-search", "");
  await sleep(800);
  await page.selectOption("#hx-source", "txdot").catch(() => {});
  await sleep(1500);
  const srcRows = await page.evaluate(() => Array.from(document.querySelectorAll("#hx-body tr")).map((tr) => (tr.querySelector(".status-badge") || {}).innerText || "").filter(Boolean));
  J.check("filtering by source (TxDOT) narrows the list to that source", srcRows.length > 0 && srcRows.every((s) => /TXDOT/i.test(s)), { rows: srcRows.length, sources: [...new Set(srcRows)] });
  await page.selectOption("#hx-source", "").catch(() => {});
  await sleep(800);

  const first = page.locator("#hx-body tr a[href^='http']").first();
  if (await first.count()) {
    const href = await first.getAttribute("href");
    const before = page.__popups.length;
    await press(page, first);
    await until(async () => page.__popups.length > before, 15000, 300);
    const tab = page.__popups[before];
    let url = null;
    if (tab) { await tab.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {}); url = tab.url(); await tab.close().catch(() => {}); }
    let same = false;
    try { same = !!url && new URL(url).host === new URL(href).host; } catch (e) { same = false; }
    J.check("an opportunity opens its public source", same, { href: (href || "").slice(0, 90), opened: (url || "").slice(0, 90) });
    J.note("public_source_opens_in", tab ? "a new tab (external site)" : "nothing opened");
  }

  // HuntX app in the overlay, as a guest: it shows opportunities, or its sign-in opens in place.
  const g = await openApp(page, "/huntx");
  const gi = await frameInfo(g);
  J.check("HuntX opens in the overlay", !!gi && /^\/huntx\/?$/.test(gi.path || "") && !gi.jsonError, gi ? { path: gi.path, title: gi.title } : "no frame");
  let f = null;
  if (g) {
    // Settle first: the page shows its note while it checks access, then the app or a gate.
    const gs = await until(async () => { const x = await appState(g); return x.app && x.rows > 0 ? x : null; }, 15000, 500) || (await appState(g));
    J.note("guest_app_state", gs);
    if (gs.app && gs.rows > 0) {
      J.check("as a guest, HuntX shows opportunities or signs in without leaving the page", true, gs);
    } else {
      const btn = g.locator("#signin-btn:visible, a:visible, button:visible").filter({ hasText: /sign in/i }).first();
      let formShown = false;
      if (await btn.count()) {
        await pressIn(g, btn);
        formShown = await page.waitForSelector("#weyland-signin-email", { state: "visible", timeout: 10000 }).then(() => true).catch(() => false);
      }
      const ps = await placeState(page, mark);
      J.check("as a guest, HuntX shows opportunities or signs in without leaving the page", formShown && ps.sameDocument && ps.onSite, { gate: gs, signInForm: formShown, ...ps });
      if (formShown) {
        const st = await signIn(page, acct);
        J.check("subscriber signs in from HuntX's own sign-in", st.auth === "signed-in", { auth: st.auth, error: st.error, seconds: st.seconds });
        f = await overlayFrame(page, 20000);
        const fi = await frameInfo(f);
        J.check("after signing in, HuntX reopens in the overlay", !!fi && /^\/huntx\/?$/.test(fi.path || ""), fi ? { path: fi.path } : "no overlay app after sign-in");
      }
    }
  }
  if (!f || !/^\/huntx/.test(((await frameInfo(f)) || {}).path || "")) {
    await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());
    if ((await page.evaluate(() => document.documentElement.dataset.weylandAuth)) !== "signed-in") {
      const st = await signIn(page, acct);
      J.check("subscriber signs in on the homepage", st.auth === "signed-in", { auth: st.auth, error: st.error, seconds: st.seconds });
      await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());
    }
    f = await openApp(page, "/huntx");
  }
  if (f) {
    const s0 = await until(async () => { const s = await appState(f); return s.app && s.rows > 0 ? s : null; }, 25000, 500) || (await appState(f));
    J.check("signed in, the HuntX app lists opportunities", s0.app && s0.rows > 0, s0);
    await f.fill("#hx-search", "Bridge").catch(() => {});
    const s1 = await until(async () => { const s = await appState(f); return num(s.count) > 0 && s.rows > 0 ? s : null; }, 15000, 500) || (await appState(f));
    J.check("HuntX app search 'Bridge' finds matching opportunities", num(s1.count) > 0 && s1.rows > 0, s1);
    await f.fill("#hx-search", "").catch(() => {});
    await sleep(800);
    if (await f.locator("#hx-refresh-btn").count()) {
      await pressIn(f, "#hx-refresh-btn");
      const msg = (await waitText(f, "#hx-status", /opportunit|fail|error|still running/i, 120000, /^Pulling/i)) || "";
      J.check("REFRESH FROM SOURCES reports how many opportunities were refreshed", /\b\d[\d,]*\b[^.]*opportunit/i.test(msg) && !/undefined|failed/i.test(msg), msg);
    }
  }
  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
