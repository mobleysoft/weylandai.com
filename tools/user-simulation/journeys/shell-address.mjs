// tools/user-simulation/journeys/shell-address.mjs
//
// The address of a view open in the single-page shell (assets/weyland-shell.js, 2026-10-07 c3b7202):
// an app open in the overlay is this page's own address plus #<app path> (/#/find), so a reload, a
// shared link or a typed #/<app> opens it again over the same page; Back closes it (or returns to the
// view before it) and Forward opens it again; Close, the WeylandAI brand and Escape leave Back and
// Forward working; the address follows the app (a Finder search survives a reload); a standalone page
// that carries the shell (HuntX) does the same at its own address; a cited document open in the
// shell survives a reload, and Back from it returns to the Finder page it came from.
// Expected: every step happens in the same homepage document (no page hop) and the app's own
// address (/find) never goes into the address bar.
// Guest only, no account. Demo clones the homepage creates are captured and deleted.
//
// Usage: node tools/user-simulation/journeys/shell-address.mjs   (exit 0 = all passed)
import { Journey, BASE, openHome, raiseDossier, setMark, placeState, press, pressIn, until, sleep, openApp, overlayFrame, frameInfo } from "../lib/journey-kit.mjs";

const J = new Journey("shell-address", "The address of an open view: reload, shared link, Back and Forward");
const st = (page) => page.evaluate(() => ({
  path: location.pathname, search: location.search, hash: location.hash,
  overlay: !!document.querySelector("#wa-overlay.is-open"), view: window.WeylandShell ? window.WeylandShell.state().view : null,
  app: window.WeylandShell ? window.WeylandShell.state().path : null, shell: !!window.WeylandShell && !!document.getElementById("wa-account-chip"),
  frame: (() => { const f = document.querySelector("#wa-overlay.is-open iframe"); try { return f ? f.contentWindow.location.pathname : null; } catch (e) { return "x"; } })(),
  frameUrl: (() => { const f = document.querySelector("#wa-overlay.is-open iframe"); try { return f ? f.contentWindow.location.pathname + f.contentWindow.location.search : null; } catch (e) { return "x"; } })(),
  index: window.navigation && navigation.currentEntry ? navigation.currentEntry.index : null, length: history.length,
  state: history.state ? { wa: history.state.wa, path: history.state.path, closed: !!history.state.waClosed } : null
}));
const settle = (page, ms = 700) => page.waitForTimeout(ms);

const docState = (page) => page.evaluate(() => {
  const w = document.querySelector("#wa-overlay.is-open .wa-pdf");
  return { path: location.pathname, search: location.search, hash: location.hash,
    overlay: !!document.querySelector("#wa-overlay.is-open"), view: window.WeylandShell ? window.WeylandShell.state().view : null,
    doc: w ? w.getAttribute("data-wa-doc") : null, page: w ? w.getAttribute("data-wa-page") : null,
    frame: (() => { const f = document.querySelector("#wa-overlay.is-open iframe"); try { return f ? f.contentWindow.location.pathname : null; } catch (e) { return "x"; } })(),
    state: history.state ? { wa: history.state.wa, path: history.state.path || null, url: history.state.url || null } : null };
});

// 8 (runs last). A cited document from the Finder in the overlay: reload, Back, Forward, Close.
async function documentView() {
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J, "doc");
  await raiseDossier(page);
  const base = await page.evaluate(() => location.pathname + location.search);
  const f = await openApp(page, "/find/lcn/4040XP");
  const DOC = "a[data-doc-url]";
  if (f) await until(() => f.evaluate((sel) => document.querySelectorAll(sel).length > 0, DOC), 20000, 300);
  let s = await docState(page);
  J.check("the Finder product page opens in the overlay at #/find/lcn/4040XP", s.overlay && s.hash === "#/find/lcn/4040XP" && s.frame === "/find/lcn/4040XP", s);
  if (f && (await f.locator(DOC).count())) {
    await pressIn(f, DOC);
    await until(() => page.evaluate(() => { const w = document.querySelector("#wa-overlay.is-open .wa-pdf"); return !!w && !!w.getAttribute("data-wa-page"); }), 45000, 500);
    s = await docState(page);
    J.check("its document opens in the shell's document view, drawn", s.view === "pdf" && !!s.page, s);
    const before = s;
    await page.reload({ waitUntil: "load" });
    await until(() => page.evaluate(() => { const w = document.querySelector("#wa-overlay.is-open .wa-pdf"); return !!w && !!w.getAttribute("data-wa-page"); }), 45000, 500);
    s = await docState(page);
    J.check("a reload with the document open shows the same document again, drawn, in the shell", s.view === "pdf" && s.doc === before.doc && s.page === before.page && s.hash === before.hash, { before, after: s });
    const mark = await setMark(page);
    await press(page, "#wa-overlay .wa-close");
    await sleep(800);
    s = await docState(page);
    J.check("Close after the reload: the homepage, no fragment, same document", !s.overlay && s.hash === "" && s.path + s.search === base && (await placeState(page, mark)).sameDocument, s);
  } else {
    J.check("its document opens in the shell's document view, drawn", false, "no document link on /find/lcn/4040XP");
  }
  // In one document: Finder page -> document -> Back returns to the Finder page -> Back closes.
  const g = await openApp(page, "/find/lcn/4040XP");
  if (g) await until(() => g.evaluate((sel) => document.querySelectorAll(sel).length > 0, DOC), 20000, 300);
  if (g && (await g.locator(DOC).count())) {
    await pressIn(g, DOC);
    await until(() => page.evaluate(() => !!document.querySelector("#wa-overlay.is-open .wa-pdf")), 20000, 300);
    await page.goBack();
    await overlayFrame(page, 15000);
    await sleep(1200);
    s = await docState(page);
    J.check("Back from the document returns to the Finder page in the overlay", s.overlay && s.view === "app" && s.frame === "/find/lcn/4040XP" && s.hash === "#/find/lcn/4040XP", s);
    await page.goBack(); await sleep(800);
    s = await docState(page);
    J.check("Back again closes the overlay on the homepage", !s.overlay && s.hash === "" && s.path + s.search === base, s);
    await page.goForward(); await overlayFrame(page, 15000); await sleep(800);
    await page.goForward(); await sleep(1500);
    s = await docState(page);
    J.check("Forward twice shows the document again", s.overlay && s.view === "pdf", s);
    await page.keyboard.press("Escape"); await sleep(800);
    s = await docState(page);
    J.check("Escape from the document closes the overlay on the homepage", !s.overlay && s.hash === "" && s.path + s.search === base, s);
  }
  await ctx.close();
}

await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  let mark = await setMark(page);
  const base = await page.evaluate(() => location.pathname + location.search);

  // 1. Open, Back, Forward
  await openApp(page, "/find");
  await settle(page);
  let s = await st(page);
  J.check("an app open in the overlay is written as the homepage address with #/find", s.overlay && s.view === "app" && s.path + s.search === base && s.hash === "#/find" && s.frame === "/find", s);
  await page.goBack(); await settle(page);
  s = await st(page);
  J.check("Back closes the app: same homepage address, no fragment, same document", !s.overlay && s.path + s.search === base && s.hash === "" && (await placeState(page, mark)).sameDocument, s);
  await page.goForward(); await settle(page, 1500);
  s = await st(page);
  J.check("Forward opens the same app again at #/find", s.overlay && s.view === "app" && s.hash === "#/find" && s.frame === "/find" && (await placeState(page, mark)).sameDocument, s);

  // 2. Close button and Escape: the address is the base at once; Back is not a dead press, Forward reopens
  const iBefore = s.index;
  await press(page, "#wa-overlay .wa-close");
  const sNow = await st(page);
  await settle(page);
  s = await st(page);
  J.check("Close: overlay closed and the address back to the homepage at once", !sNow.overlay && sNow.path + sNow.search === base && sNow.hash === "", sNow);
  J.check("Close steps back to the homepage's own entry (Forward still holds the app)", !s.overlay && s.index === iBefore - 1 && s.hash === "", { before: iBefore, after: s });
  await page.goForward(); await settle(page, 1500);
  s = await st(page);
  J.check("Forward after Close opens the app again at #/find", s.overlay && s.view === "app" && s.hash === "#/find" && s.frame === "/find", s);
  await page.keyboard.press("Escape"); await settle(page);
  s = await st(page);
  J.check("Escape closes it the same way", !s.overlay && s.hash === "" && s.path + s.search === base, s);

  // 3. Stacked apps: Back walks them, Forward re-walks them
  await openApp(page, "/find"); await settle(page, 1200);
  await openApp(page, "/huntx"); await settle(page, 1200);
  s = await st(page);
  J.check("a second app opened from the first is #/huntx", s.overlay && s.hash === "#/huntx" && s.frame === "/huntx", s);
  await page.goBack(); await settle(page, 1500);
  s = await st(page);
  J.check("Back returns to the first app (#/find)", s.overlay && s.hash === "#/find" && s.frame === "/find", s);
  await page.goBack(); await settle(page);
  s = await st(page);
  J.check("Back again closes the overlay on the homepage", !s.overlay && s.hash === "" && s.path + s.search === base, s);
  await page.goForward(); await settle(page, 1200); await page.goForward(); await settle(page, 1500);
  s = await st(page);
  J.check("Forward twice comes back to #/huntx", s.overlay && s.hash === "#/huntx" && s.frame === "/huntx", s);
  await press(page, "#wa-overlay .wa-close"); await settle(page);
  s = await st(page);
  J.check("Close from the second app closes the overlay on the homepage", !s.overlay && s.hash === "" && s.path + s.search === base, s);

  // 4. Close, then open another app at once (the step back is still under way)
  await openApp(page, "/find"); await settle(page, 1200);
  await page.evaluate(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); window.WeylandShell.open("app", { path: "/huntx" }); });
  await settle(page, 1500);
  s = await st(page);
  J.check("Escape then an immediate open: the new app is open and its address recorded", s.overlay && s.hash === "#/huntx" && s.frame === "/huntx" && s.state && s.state.wa === "app" && s.state.path === "/huntx", s);
  await page.goBack(); await settle(page);
  s = await st(page);
  J.check("...and Back closes it on the homepage", !s.overlay && s.hash === "" && s.path + s.search === base, s);
  J.check("no page hop through steps 1-4 (same document, on weylandai.com)", (await placeState(page, mark)).sameDocument && (await placeState(page, mark)).onSite, await placeState(page, mark));

  // 5. The address follows the app: a Finder search, then a reload comes back to the results
  const f = await openApp(page, "/find");
  if (f) {
    await f.fill("input[name=q]", "LCN 4040XP");
    await f.press("input[name=q]", "Enter");
    await until(() => f.evaluate(() => /[?&]q=/.test(location.search) && !document.querySelector("main[aria-busy]") && document.querySelectorAll("main a[href^='/find/']").length > 0), 20000, 300);
  }
  await settle(page);
  s = await st(page);
  J.check("a Finder search inside the overlay shows in the address (#/find?q=...)", s.overlay && /^#\/find\?q=LCN(\+|%20)4040XP$/i.test(s.hash), s);
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => !!window.WeylandShell && !!document.querySelector("#wa-overlay.is-open iframe"), null, { timeout: 15000 }).catch(() => {});
  const g = await overlayFrame(page, 20000);
  if (g) await until(() => g.evaluate(() => document.querySelectorAll("main a[href^='/find/']").length > 0), 20000, 400);
  s = await st(page);
  const gi = g ? await frameInfo(g) : null;
  J.check("a reload with the Finder open keeps the single-page shell and the same search", s.shell && s.overlay && s.view === "app" && /^#\/find\?q=LCN(\+|%20)4040XP$/i.test(s.hash) && /^\/find\?q=LCN(\+|%20)4040XP&embed=1$/i.test(s.frameUrl || "") && !!gi && /4040XP/i.test(gi.text || ""), { s, frameTitle: gi && gi.title });
  mark = await setMark(page);
  await press(page, "#wa-overlay .wa-close"); await settle(page);
  s = await st(page);
  J.check("Close after the reload: the homepage, no fragment, same document", !s.overlay && s.hash === "" && s.path + s.search === base && (await placeState(page, mark)).sameDocument, s);
  await ctx.close();

  // 6. A shared link: a fresh browser context opens /#/meetingx and /#/find?q=...
  for (const [label, hash, framePath] of [["the Finder search", "#/find?q=LCN%204040XP", /^\/find\?q=LCN(%20|\+)4040XP&embed=1$/i], ["Plans and pricing", "#/pricing", /^\/pricing\?embed=1$/]]) {
    const c2 = await J.context("desktop");
    const p2 = await J.page(c2);
    await p2.goto(BASE + "/" + hash, { waitUntil: "load", timeout: 60000 });
    await p2.waitForFunction(() => !!window.WeylandShell && !!document.querySelector("#wa-overlay.is-open iframe"), null, { timeout: 15000 }).catch(() => {});
    await overlayFrame(p2, 20000);
    await settle(p2, 1200);
    const m2 = await setMark(p2);
    let t = await st(p2);
    J.check("a shared link to " + label + " (/" + hash + ") opens it in the overlay over the homepage", t.shell && t.overlay && t.view === "app" && framePath.test(t.frameUrl || ""), t);
    await press(p2, "#wa-overlay .wa-close"); await settle(p2);
    t = await st(p2);
    J.check("closing the shared " + label + " leaves the homepage at / in the same document", !t.overlay && t.path === "/" && t.hash === "" && t.search === "" && (await placeState(p2, m2)).sameDocument, t);
    // A typed address: #/huntx while on the homepage
    if (label === "Plans and pricing") {
      await p2.evaluate(() => { location.hash = "#/huntx"; });
      await overlayFrame(p2, 15000); await settle(p2, 1200);
      t = await st(p2);
      J.check("typing #/huntx on the homepage opens HuntX in the overlay", t.overlay && t.view === "app" && t.hash === "#/huntx" && t.frameUrl === "/huntx?embed=1", t);
      await p2.goBack(); await settle(p2);
      t = await st(p2);
      J.check("...and Back closes it", !t.overlay && t.hash === "" && (await placeState(p2, m2)).sameDocument, t);
    }
    await c2.close();
  }

  // 7. A standalone product page that carries the shell (HuntX): its own address + #/<app>
  const c3 = await J.context("desktop");
  const p3 = await J.page(c3);
  await p3.goto(BASE + "/huntx", { waitUntil: "load", timeout: 60000 });
  await p3.waitForFunction(() => !!window.WeylandShell, null, { timeout: 20000 }).catch(() => {});
  if (await p3.evaluate(() => !!window.WeylandShell)) {
    await openApp(p3, "/find"); await settle(p3, 1200);
    let t = await st(p3);
    J.check("on the standalone HuntX page an app opens at /huntx#/find", t.overlay && t.path === "/huntx" && t.hash === "#/find", t);
    await p3.reload({ waitUntil: "load" });
    await p3.waitForFunction(() => !!window.WeylandShell && !!document.querySelector("#wa-overlay.is-open iframe"), null, { timeout: 20000 }).catch(() => {});
    await settle(p3, 1500);
    t = await st(p3);
    J.check("a reload there comes back to HuntX with the Finder open over it", t.shell && t.overlay && t.path === "/huntx" && t.hash === "#/find" && t.frameUrl === "/find?embed=1", t);
    await press(p3, "#wa-overlay .wa-close"); await settle(p3);
    t = await st(p3);
    J.check("closing it leaves the standalone HuntX page at /huntx", !t.overlay && t.path === "/huntx" && t.hash === "", t);
  } else {
    J.note("standalone_huntx", "no WeylandShell on the standalone /huntx page");
  }
  await c3.close();

  await documentView();
});
