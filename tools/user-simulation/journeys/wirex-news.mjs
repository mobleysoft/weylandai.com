// tools/user-simulation/journeys/wirex-news.mjs
//
// Journey map id "wirex-news" (priority 3): a guest reads the WireX chapter on the homepage, opens
// an article, opens News in the overlay (also through its /wire alias), and presses the WireX Pro
// upgrade, in the overlay and on the standalone /news page.
// Expected: current headlines, each opening its publisher's article (an outside site, in a new tab:
// the homepage stays where it was); News works in the overlay; the upgrade opens payment inside the
// page (Stripe's embedded form, 2026-10-07 afce86f) with the right product and price, and closing it
// leaves the visitor on the same page. STOPS at the loaded payment form: nothing typed, nothing
// paid. Each upgrade press creates one live Checkout Session that is left to expire.
// No account. Demo clones the homepage creates for the guest are captured and deleted.
//
// Usage: node tools/user-simulation/journeys/wirex-news.mjs   (exit 0 = all passed)
import { Journey, BASE, openHome, raiseDossier, setMark, placeState, press, pressIn, until, sleep, openApp, frameInfo, findPaymentForm } from "../lib/journey-kit.mjs";

const J = new Journey("wirex-news", "WireX news");
const WIRE = { product: /Wire/i, price: /\$49(\.00)?\b/ };
const modalOpen = (target) => target.evaluate(() => !!document.querySelector(".wco-backdrop")).catch(() => false);

// Press WireX Pro's upgrade on a News surface (the overlay frame or a page), then judge the form.
async function upgrade(label, page, surface, mark) {
  await until(() => surface.evaluate(() => { const b = document.getElementById("upgrade-box"); return !!b && getComputedStyle(b).display !== "none"; }), 20000, 500);
  const btn = surface.locator("#upgrade-btn");
  if (!(await btn.count()) || !(await btn.isVisible().catch(() => false))) {
    J.check(label + ": the WireX Pro upgrade opens payment inside the page", false, "no visible upgrade button");
    return;
  }
  const addressBefore = await page.evaluate(() => location.pathname + location.search);
  const popBefore = page.__popups.length;
  await pressIn(surface, btn);
  const form = await findPaymentForm(page, WIRE, 45000);
  const ps = await placeState(page, mark);
  J.check(label + ": the WireX Pro upgrade opens payment inside the page (no hop to checkout.stripe.com)", form.where === "embedded" && form.visible && ps.sameDocument && ps.onSite && page.__popups.length === popBefore,
    { where: form.where, visible: form.visible, hosts: form.hosts, newTabs: page.__popups.length - popBefore, ...ps });
  J.check(label + ": the payment form shows WireX Pro at $49 a month", !!form.product && !!form.price, { where: form.where, text: form.text });
  if (form.where === "embedded" && ps.sameDocument) {
    const close = surface.locator(".wco-backdrop .wco-close").first();
    if (await close.count()) await pressIn(surface, close);
    await until(async () => !(await modalOpen(surface)), 8000, 300);
    const after = await placeState(page, mark);
    const addressAfter = await page.evaluate(() => location.pathname + location.search).catch(() => null);
    J.check(label + ": closing the payment form leaves the visitor on the same page", !(await modalOpen(surface)) && after.sameDocument && addressAfter === addressBefore,
      { modalOpen: await modalOpen(surface), sameDocument: after.sameDocument, before: addressBefore, after: addressAfter });
  }
}

await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  // The homepage WireX chapter.
  await page.evaluate(() => { const s = document.getElementById("wire"); if (s) s.scrollIntoView({ block: "center" }); });
  const items = await until(async () => {
    const xs = await page.evaluate(() => Array.from(document.querySelectorAll("#wire-feed a.wire-item")).map((a) => ({
      title: ((a.querySelector(".wire-item-title") || {}).innerText || "").trim(), source: ((a.querySelector(".wire-item-source") || {}).innerText || "").trim(),
      href: a.getAttribute("href") || "", target: a.getAttribute("target") || "" })));
    return xs.length ? xs : null;
  }, 20000, 500);
  const feed = items || [];
  J.note("feed", feed.map((x) => x.source + " | " + x.title.slice(0, 80)));
  const external = feed.filter((x) => { try { const u = new URL(x.href); return /^https?:$/.test(u.protocol) && !/(^|\.)weylandai\.com$/.test(u.host); } catch (e) { return false; } });
  J.check("the WireX chapter shows live headlines (up to 6), each with its title and publisher", feed.length >= 1 && feed.length <= 6 && feed.every((x) => x.title && x.source), { items: feed.length, failed: feed.length ? null : await page.evaluate(() => (document.getElementById("wire-feed") || {}).innerText || "") });
  J.check("each headline links to its publisher's article", feed.length > 0 && external.length === feed.length, { items: feed.length, external: external.length, sample: feed.slice(0, 2).map((x) => x.href.slice(0, 90)) });
  if (feed.length) {
    const before = page.__popups.length;
    await press(page, page.locator("#wire-feed a.wire-item").first());
    await until(async () => page.__popups.length > before, 15000, 300);
    const tab = page.__popups[before];
    let opened = null;
    if (tab) { await tab.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {}); opened = tab.url(); await tab.close().catch(() => {}); }
    let sameHost = false;
    try { sameHost = !!opened && new URL(opened).host.replace(/^www\./, "") === new URL(feed[0].href).host.replace(/^www\./, ""); } catch (e) { sameHost = false; }
    const ps = await placeState(page, mark);
    J.check("an article opens at its publisher while the homepage stays where it was", sameHost && ps.sameDocument && ps.onSite, { href: feed[0].href.slice(0, 90), opened: (opened || "").slice(0, 90), homepageSameDocument: ps.sameDocument });
  }
  // UNLOCK FULL WIREX: an in-page link to the pricing chapter.
  const unlock = page.locator("#wire a").filter({ hasText: /unlock full wirex/i }).first();
  if (await unlock.count()) {
    await press(page, unlock);
    await sleep(1200);
    const ps = await placeState(page, mark);
    const at = await page.evaluate(() => { const p = document.getElementById("pricing"); const r = p ? p.getBoundingClientRect() : null; return { hash: location.hash, pricingInView: !!r && r.top < innerHeight && r.bottom > 0 }; });
    J.check("UNLOCK FULL WIREX scrolls to the pricing on the same page", ps.sameDocument && at.pricingInView, { ...at, sameDocument: ps.sameDocument });
  }

  // News in the overlay, under both names the shell knows.
  for (const p of ["/news", "/wire"]) {
    const f = await openApp(page, p, 30000);
    await until(() => f && f.evaluate(() => document.querySelectorAll("#lead-story-slot .lead-story, #wire-list .headline-item").length > 0), 20000, 500);
    const fi = await frameInfo(f);
    const n = f ? await f.evaluate(() => document.querySelectorAll("#lead-story-slot .lead-story, #wire-list .headline-item").length).catch(() => 0) : 0;
    J.check("News opens in the overlay from " + p + " with its headlines", !!fi && !fi.jsonError && !fi.chromeError && !fi.nestedShell && n > 0, { path: fi && fi.path, title: fi && fi.title, jsonError: fi && fi.jsonError, headlines: n });
    if (p === "/news" && f && n > 0) await upgrade("News in the overlay", page, f, mark);
    await page.evaluate(() => window.WeylandShell.close());
  }
  await J.checkInPlace(page, mark);

  // The standalone News page (a shared link): the same upgrade, in that page.
  const solo = await J.page(ctx);
  await solo.goto(BASE + "/news?journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
  const soloMark = await setMark(solo);
  await until(() => solo.evaluate(() => document.querySelectorAll("#lead-story-slot .lead-story, #wire-list .headline-item").length > 0), 20000, 500);
  await upgrade("standalone /news", solo, solo, soloMark);
  await solo.close();
  await ctx.close();
});
