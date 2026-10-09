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
    // The same page: same title and every functional element of the direct visit. The address may
    // differ only for an alias that lands on the same page (e.g. /wire shows News at /news).
    const ok = !!o && !o.jsonError && !o.chromeError && !o.evalError && !o.nestedShell && !!s.title && o.title === s.title && missing.length === 0;
    if (o && norm(o.path) !== norm(s.path)) J.note(p + " address in the overlay", { overlay: o.path, direct: s.path });
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

  // Each product page's own links, inside the overlay. Every visible link is classified: an outside
  // site must open in a new tab (inside the frame it would only show the browser's refusal page);
  // our own links (up to 3 distinct ones per page) are pressed one at a time and must stay in the
  // shell and show a working page (or close the overlay back to the same homepage), never a JSON
  // error, a browser error page or a second homepage nested in the overlay.
  const host = new URL(BASE).host;
  for (const p of PATHS) {
    let f = await openApp(page, p, 40000);
    await sleep(2000);
    const links = f ? await f.evaluate((h) => Array.from(document.querySelectorAll("a[href]")).filter((a) => a.offsetParent !== null && a.getBoundingClientRect().width > 0).map((a) => {
      let u = null;
      try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { u = null; }
      return { text: (a.innerText || a.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 30), href: a.getAttribute("href"), host: u ? u.host : "", path: u ? u.pathname + u.search : "", proto: u ? u.protocol : "", target: a.getAttribute("target") || "", sameDoc: !!u && u.host === location.host && u.pathname === location.pathname && u.search === location.search && !!u.hash, data: a.hasAttribute("data-doc") };
    }), host).catch(() => []) : [];
    const outside = links.filter((l) => /^https?:$/.test(l.proto) && l.host !== host);
    const outsideInFrame = outside.filter((l) => l.target !== "_blank");
    J.check(p + " in the overlay: its links to outside sites open in a new tab, not inside the overlay", outsideInFrame.length === 0, { outside: outside.length, inFrame: outsideInFrame.slice(0, 5) });
    const own = [...new Map(links.filter((l) => /^https?:$/.test(l.proto) && l.host === host && !l.sameDoc && !l.data && l.target !== "_blank").map((l) => [l.path, l])).values()].slice(0, 3);
    const bad = [];
    for (const l of own) {
      if (!f) break;
      const before = await placeState(page, mark);
      const clicked = await f.evaluate((href) => { const a = Array.from(document.querySelectorAll("a[href]")).find((x) => x.getAttribute("href") === href && x.offsetParent !== null); if (!a) return false; a.setAttribute("data-waj-nav", "1"); return true; }, l.href).catch(() => false);
      if (!clicked) continue;
      await pressIn(f, "[data-waj-nav='1']").catch(() => {});
      await sleep(3500);
      const closed = !(await overlayOpen(page));
      const g = closed ? null : await overlayFrame(page, 8000);
      const i = g ? await frameInfo(g) : null;
      const ps = await placeState(page, mark);
      const homeAddress = closed ? await page.evaluate(() => location.pathname) : null;
      const ok = ps.sameDocument && ps.onSite && before.sameDocument && (closed ? homeAddress === "/" : !!i && !i.jsonError && !i.chromeError && !i.evalError && !i.nestedShell && /\S/.test(i.text || ""));
      if (!ok) bad.push({ link: l.text || l.href, href: l.href, overlayClosed: closed, shows: i ? { path: i.path, title: i.title, jsonError: i.jsonError, chromeError: i.chromeError, nestedShell: i.nestedShell } : null, sameDocument: ps.sameDocument, onSite: ps.onSite });
      // Back to the product page for the next link.
      if (!closed) await page.evaluate(() => window.WeylandShell.close());
      f = await openApp(page, p, 40000);
      await sleep(1500);
    }
    J.check(p + " in the overlay: its own links stay in the shell and show working pages (" + own.length + " tried)", bad.length === 0, bad.length ? bad : own.map((l) => l.href));
    await page.evaluate(() => window.WeylandShell.close());
  }

  await J.checkInPlace(page, mark);

  // A reload while an app is open (the document is replaced on purpose here, after the in-place check).
  await openApp(page, "/find");
  await sleep(1500);
  // Wait for the shell and the restored app, rather than unrelated page
  // resources finishing. The actual controls below still have to be present.
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await until(() => page.evaluate(() => !!window.WeylandShell && !!document.querySelector("#wa-overlay.is-open iframe")), 20000);
  const restoredFrame = await overlayFrame(page, 20000);
  if (restoredFrame) await restoredFrame.locator('form[role="search"] input[type="search"][name="q"]').waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  const restored = await frameInfo(restoredFrame);
  const finderControls = restoredFrame ? await restoredFrame.evaluate(() => {
    const form = document.querySelector('form[role="search"]');
    const input = form?.querySelector('input[type="search"][name="q"]');
    const submit = form?.querySelector('button[type="submit"]');
    const usable = el => !!el && !el.disabled && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
    return { search: usable(input), submit: usable(submit) };
  }).catch(() => ({ search: false, submit: false })) : { search: false, submit: false };
  const after = await page.evaluate(() => ({ path: location.pathname, shell: !!document.getElementById("wa-account-chip") && !!window.WeylandShell, overlay: !!document.querySelector("#wa-overlay.is-open") }));
  const workingApp = restored && norm(restored.path) === "/find" && !restored.jsonError && !restored.chromeError && !restored.evalError && !restored.nestedShell && finderControls.search && finderControls.submit;
  J.check("a reload with an app open keeps the single-page shell and restores the finder", after.shell && after.path === "/" && after.overlay && workingApp, { ...after, finderControls, restored: restored ? { path: restored.path, title: restored.title, jsonError: restored.jsonError, chromeError: restored.chromeError, evalError: restored.evalError, nestedShell: restored.nestedShell } : null });
  await ctx.close();
});
