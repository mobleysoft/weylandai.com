// tools/user-simulation/journeys/overlay-products.mjs
//
// Journey map id "overlay-products" (priority 2): every product path the shell declares opens
// inside the single-page overlay (WeylandShell.open("app", { path })), as a guest.
// Expected: each product's real, current page opens in the overlay (the same page a direct visit
// gets: same title, same functional elements; not a stale copy, a 404 or a redirect to pricing) and
// works; its own navigation stays in the shell (no nested homepage, no error page); closing it
// (Close, the WeylandAI brand, Escape, browser Back) returns to the same homepage; a reload with an
// app open keeps the single-page shell.
// No account. Demo clones the page creates for the guest are captured and deleted.
//
// Usage: node tools/user-simulation/journeys/overlay-products.mjs   (exit 0 = all passed)
import { Journey, BASE, openHome, raiseDossier, setMark, placeState, press, pressIn, until, sleep, openApp, overlayFrame, frameInfo } from "../lib/journey-kit.mjs";

const J = new Journey("overlay-products", "Every product opening inside the single-page overlay");
const PATHS = ["/subx-app", "/subx", "/takeoffx", "/cutsheetx", "/find", "/sightx", "/propx-app", "/meetingx", "/meetx", "/huntx", "/pricing", "/news", "/wire"];
const norm = (p) => String(p || "").replace(/\/+$/, "") || "/";

// Functional ids of a page: ids outside nav / header / footer, minus the shell's own (wa-*).
async function functionalIds(target) {
  return target.evaluate(() => Array.from(document.querySelectorAll("[id]")).filter((e) => !e.closest("nav, header, footer") && /^[A-Za-z][\w-]*$/.test(e.id) && !/^wa-/.test(e.id)).map((e) => e.id)).catch(() => []);
}
const overlayOpen = (page) => page.evaluate(() => !!document.querySelector("#wa-overlay.is-open"));

await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  const ref = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  for (const p of PATHS) {
    // What a direct visit to the path shows.
    let s = { title: null, path: null, ids: [] };
    try {
      await ref.goto(BASE + p, { waitUntil: "load", timeout: 45000 });
      await sleep(2500);
      s = { title: await ref.title(), path: new URL(ref.url()).pathname, ids: await functionalIds(ref) };
    } catch (e) { s.error = String(e.message || e).slice(0, 120); }
    // The same path in the overlay.
    const f = await openApp(page, p, 40000);
    await sleep(2500);
    const o = await frameInfo(f);
    const oids = f ? await functionalIds(f) : [];
    const missing = s.ids.filter((id) => !oids.includes(id));
    const ok = !!o && !o.jsonError && !o.chromeError && !o.evalError && !o.nestedShell && !!s.title && o.title === s.title && norm(o.path) === norm(s.path) && missing.length === 0;
    J.check(p + " opens in the overlay as the same page as a direct visit", ok,
      { overlay: o ? { path: o.path, title: o.title, jsonError: o.jsonError, chromeError: o.chromeError, nestedShell: o.nestedShell } : null, direct: { path: s.path, title: s.title, error: s.error }, missingIds: missing.slice(0, 12) });
    await page.evaluate(() => window.WeylandShell.close());
  }
  await ref.close();

  // Closing the overlay, four ways.
  const closeWays = [
    ["the Close button", async () => press(page, "#wa-overlay .wa-close")],
    ["the WeylandAI brand", async () => press(page, "#wa-overlay .wa-brand")],
    ["Escape", async () => { await press(page, "#wa-overlay .wa-title").catch(() => {}); await page.keyboard.press("Escape"); }],
    ["browser Back", async () => page.goBack({ timeout: 10000 }).catch(() => {})]
  ];
  for (const [how, act] of closeWays) {
    await openApp(page, "/find");
    await sleep(1200);
    await act();
    await until(async () => !(await overlayOpen(page)), 6000, 300);
    const ps = await placeState(page, mark);
    const path = await page.evaluate(() => location.pathname);
    J.check("closing an app with " + how + " returns to the same homepage", !(await overlayOpen(page)) && path === "/" && ps.sameDocument && ps.onSite, { overlayOpen: await overlayOpen(page), path, ...ps });
  }

  // A product page's own navigation inside the overlay.
  const NAV = [
    ["NEWS", (i) => !!i && !i.jsonError && !i.chromeError && /^\/news\/?$/.test(i.path || "") ],
    ["CUTSHEETX", (i) => !!i && /^\/cutsheetx\/?$/.test(i.path || "") && i.ids.includes("match-btn")],
    ["VENTURE DECK", (i) => !!i && !i.chromeError && !i.jsonError && !i.evalError],
    ["the brand link '/'", (i, closed) => closed || (!!i && !i.nestedShell)]
  ];
  for (const [label, good] of NAV) {
    const f = await openApp(page, "/subx");
    await sleep(1500);
    const found = f ? await f.evaluate((l) => {
      const links = Array.from(document.querySelectorAll("a")).filter((a) => a.offsetParent !== null);
      const a = l.startsWith("the brand") ? links.find((x) => x.getAttribute("href") === "/") : links.find((x) => x.innerText.trim().toUpperCase() === l);
      if (!a) return null;
      a.setAttribute("data-waj-nav", "1");
      return a.getAttribute("href");
    }, label).catch(() => null) : null;
    if (!found) { J.note("nav " + label, "no such link on /subx in the overlay"); await page.evaluate(() => window.WeylandShell.close()); continue; }
    await pressIn(f, "[data-waj-nav='1']");
    await sleep(4000);
    const closed = !(await overlayOpen(page));
    const g = closed ? null : await overlayFrame(page, 8000);
    const i = g ? await frameInfo(g) : null;
    const ps = await placeState(page, mark);
    J.check("inside the overlay, the product nav's " + label + " stays in the shell and shows a working page", good(i, closed) && ps.sameDocument && ps.onSite,
      { href: found, overlayClosed: closed, shows: i ? { url: (i.url || "").slice(0, 90), title: i.title, jsonError: i.jsonError, chromeError: i.chromeError, nestedShell: i.nestedShell } : null, ...ps });
    await page.evaluate(() => window.WeylandShell.close());
  }

  await J.checkInPlace(page, mark);

  // A reload while an app is open (the document is replaced on purpose here, after the in-place check).
  await openApp(page, "/find");
  await sleep(1500);
  await page.reload({ waitUntil: "load" });
  await sleep(2500);
  const after = await page.evaluate(() => ({ path: location.pathname, shell: !!document.getElementById("wa-account-chip") && !!window.WeylandShell, overlay: !!document.querySelector("#wa-overlay.is-open") }));
  J.check("a reload with an app open keeps the single-page shell", after.shell, after);
  await ctx.close();
});
