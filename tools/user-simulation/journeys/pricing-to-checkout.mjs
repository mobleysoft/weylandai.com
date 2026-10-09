// tools/user-simulation/journeys/pricing-to-checkout.mjs
//
// Journey map id "pricing-to-checkout" (priority 2): a guest presses a buy button and gets the
// payment form. STOPS when the payment form has loaded and shows the product and the price: the
// card form is never touched, nothing is paid.
// Expected (standing order: payment embedded in the page, no page hop): a Stripe payment form for
// the right product and price, inside weylandai.com (the page itself or the homepage overlay), the
// document never replaced and the URL never on checkout.stripe.com; closing the form leaves the
// visitor on the same page.
// Buttons:
//   - homepage #pricing START HUNTX ($799/mo) and CHOOSE THE SUITE ($2,000/mo; START SUBCONP SUITE
//     until 2026-10-07); since 2026-10-07 (fc:shell) the homepage's offer card BUILD MY FIRST
//     SUBMITTAL and the paste result's BUILD THE PACKET open the $100 first submittal (one-time);
//   - the pricing page in the homepage overlay, ACTIVATE STANDALONE SEAT for HuntX ($799/mo);
//   - since 2026-10-07 (afce86f, 4177fed) the pricing page and /subscribe open Stripe's embedded
//     form in the page: /pricing ACTIVATE STANDALONE SEAT (HuntX) and DEPLOY SUITE (SubConP), and
//     /subscribe CONTINUE TO SECURE CHECKOUT (SubConP seat).
//   - since 2026-10-07: /pricing START WITH MY FIRST SUBMITTAL (the $100 one-time offer), and in
//     every case the Terms step in front of Stripe's form (the box must be ticked before CONTINUE
//     TO PAYMENT works; the kit ticks it the way a person does).
// Each press creates one live Checkout Session that is left to expire (the documented side
// effect). No account.
//
// Usage: node tools/user-simulation/journeys/pricing-to-checkout.mjs   (exit 0 = all passed)
import { Journey, BASE, openHome, raiseDossier, setMark, placeState, press, pressIn, until, sleep, pasteSchedule, openApp, findPaymentForm, SAMPLE_LINES } from "../lib/journey-kit.mjs";

const J = new Journey("pricing-to-checkout", "Pricing to checkout (stop at the payment form)");
const HUNTX = { product: /HuntX/i, price: /\$799(\.00)?\b/ };
const SUITE = { product: /Subcontractor|SubConP/i, price: /\$2,000(\.00)?\b/ };
const OFFER = { product: /First Submittal/i, price: /\$100(\.00)?\b/ };

const CASES = [
  { label: "homepage START HUNTX", start: "home", ...HUNTX, find: (page) => page.locator("#pricing .js-checkout[data-product='weyland-huntx-seat'], #pricing a, #pricing button").filter({ hasText: /start huntx/i }).first() },
  { label: "homepage CHOOSE THE SUITE (SubConP)", start: "home", ...SUITE, find: (page) => page.locator("#pricing .js-checkout[data-product='weyland-subconp-seat'], #pricing a, #pricing button").filter({ hasText: /choose the suite/i }).first() },
  { label: "homepage offer card BUILD MY FIRST SUBMITTAL ($100 offer)", start: "home", ...OFFER, find: (page) => page.locator("#pricing .offer-card .js-checkout[data-product='weyland-first-submittal']").first() },
  { label: "paste result BUILD THE PACKET ($100 offer)", start: "home", ...OFFER, before: async (page) => { await pasteSchedule(page, SAMPLE_LINES.slice(0, 2)); }, find: (page) => page.locator("#hs-results a, #hs-results button").filter({ hasText: /build the packet/i }).first() },
  { label: "pricing page in the overlay, ACTIVATE STANDALONE SEAT (HuntX)", start: "home", overlay: "/pricing", frameSelector: "#btnBuyHunt", ...HUNTX },
  { label: "pricing page, ACTIVATE STANDALONE SEAT (HuntX)", start: "/pricing", selector: "#btnBuyHunt", ...HUNTX },
  { label: "pricing page, DEPLOY SUITE (SubConP)", start: "/pricing", selector: "#btnHeaderDeploy", ...SUITE },
  { label: "/subscribe CONTINUE TO SECURE CHECKOUT (SubConP seat)", start: "/subscribe", selector: "button[data-checkout]", ...SUITE },
  { label: "pricing page, START WITH MY FIRST SUBMITTAL ($100 offer)", start: "/pricing", selector: "#btnBuyOffer", product: /First Submittal/i, price: /\$100(\.00)?\b/ }
];

// The embedded form's own modal (WeylandCheckout, /api/billing/embedded-checkout.js) in a frame.
const modalOpen = (target) => target.evaluate(() => !!document.querySelector(".wco-backdrop")).catch(() => false);

await J.run(async () => {
  await J.launch();
  for (const c of CASES) {
    const ctx = await J.context("desktop");
    const page = await J.page(ctx);
    let surface = page;
    if (c.start === "home") {
      await openHome(page, J, c.label.split(" ")[0]);
      await raiseDossier(page);
    } else {
      await page.goto(BASE + c.start + "?journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
      await sleep(1200);
    }
    const mark = await setMark(page);
    let addressBefore = await page.evaluate(() => location.pathname + location.search);
    let pressed = false;
    try {
      if (c.before) await c.before(page);
      if (c.overlay) {
        const f = await openApp(page, c.overlay);
        addressBefore = await page.evaluate(() => location.pathname + location.search); // the app's address while it is open
        if (f && (await f.locator(c.frameSelector).count())) { surface = f; await pressIn(f, c.frameSelector); pressed = true; }
      } else if (c.selector) {
        if (await page.locator(c.selector).count()) { await press(page, c.selector); pressed = true; }
      } else {
        const btn = c.find(page);
        // The paste result renders its packet box after the match answers (seen 1 of 3 passes on
        // 2026-10-09 as "buy button not found"): wait for the button before pressing.
        await btn.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
        if (await btn.count()) { await press(page, btn); pressed = true; }
      }
    } catch (e) {
      J.note(c.label + " error", String(e.message || e).slice(0, 200));
    }
    if (!pressed) {
      J.check(c.label + ": the payment form opens inside the page", false, "buy button not found");
      await ctx.close();
      continue;
    }
    const form = await findPaymentForm(page, { product: c.product, price: c.price }, 45000);
    const ps = await placeState(page, mark);
    const popups = page.__popups.length;
    J.check(c.label + ": the payment form opens inside the page (no hop to checkout.stripe.com)", form.where === "embedded" && form.visible && ps.sameDocument && ps.onSite && popups === 0,
      { where: form.where, visible: form.visible, hosts: form.hosts, newTabs: popups, ...ps });
    J.check(c.label + ": the payment form shows the right product and price", !!form.product && !!form.price, { where: form.where, text: form.text });
    J.check(c.label + ": the Terms are accepted in the page before the payment form (CONTINUE waits for the box)", !!form.terms && form.terms.shown === true && form.terms.continueDisabledBeforeTick === true, form.terms || null);
    if (form.where === "embedded" && ps.sameDocument) {
      // Closing the form (its Close button; nothing typed, nothing paid) leaves the visitor where they were.
      const closeBtn = surface.locator(".wco-backdrop .wco-close").first();
      if (await closeBtn.count()) await pressIn(surface, closeBtn);
      await until(async () => !(await modalOpen(surface)), 8000, 300);
      const after = await placeState(page, mark);
      const addressAfter = await page.evaluate(() => location.pathname + location.search).catch(() => null);
      J.check(c.label + ": closing the payment form leaves the visitor on the same page", !(await modalOpen(surface)) && after.sameDocument && after.onSite && addressAfter === addressBefore,
        { modalOpen: await modalOpen(surface), sameDocument: after.sameDocument, before: addressBefore, after: addressAfter });
    } else if (form.where === "top-level") {
      // Hosted checkout (a hop). Record where Stripe's Back link would return the visitor.
      const back = await page.evaluate(() => { const a = Array.from(document.querySelectorAll("a[href]")).find((x) => /weylandai\.com/.test(x.getAttribute("href") || "")); return a ? a.getAttribute("href") : null; }).catch(() => null);
      J.note(c.label + " stripe back link", back);
    }
    await ctx.close();
  }
});
