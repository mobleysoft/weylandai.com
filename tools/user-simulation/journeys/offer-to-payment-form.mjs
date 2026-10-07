// tools/user-simulation/journeys/offer-to-payment-form.mjs
//
// The $100 first-submittal offer (John, 2026-10-07): "$100 · your first submittal + 30 days of every
// product · no automatic charge". A guest meets it in two places on the homepage, the paste result
// (BUILD THE PACKET · $100) and the pricing section, which leads with it (BUILD MY FIRST SUBMITTAL ·
// $100). Each button opens the payment helper in the page: first what is bought and the Terms (a
// checkbox that must be ticked; it names "No automatic charge" and Argo LLC), then Stripe's form for
// the first submittal at $100.00. STOPS when Stripe's form has loaded with the product and the price:
// the card form is never touched and nothing is paid. Closing the form leaves the visitor on the
// same page and says nothing was charged. Desktop (both places) and a 390 px phone (the paste result).
// Each CONTINUE TO PAYMENT creates one live Checkout Session that is left to expire (the documented
// side effect).
//
// After a payment (nothing is ever paid here): the box the purchase began in shows the result in
// place. The page is given the events the payment helper sends after a real payment (complete, then
// active with the access end, or held with the masked email), while the helper's Terms step is open
// (nothing created at Stripe); the helper's real chain is fc:payments' and is checked by
// weyland-platform-worker/tools/offer-journey.mjs. Checked: paid -> "Paid. Your first submittal is
// ready to build. Every product is yours until <date> (30 days). Nothing is charged after that..."
// with the $100 button gone and one next step (signed out here: SIGN IN TO OPEN SUBX, on the emailed
// code), fitting a 390 px phone; held -> it says the email already has an account and how to claim
// it (SIGN IN WITH A CODE, that email, the code), and once the account signs in it turns into the
// result with that account's end date and OPEN SUBX: UPLOAD YOUR SCHEDULE, which opens SubX in the
// page. That account (a throwaway put in the offer's state the payment webhook writes: users row
// plus the granted purchase row, as account-plan does) then sees no second $100 button: the pricing
// card and a new paste show its end date and SubX instead. The claim itself (a code sign-in) is
// fc:payments'; here the account that signs in already has the offer running.
// The guest demo copies the homepage makes and the account's rows are deleted in finally; its
// AuthFor identity stays at AuthFor (it cannot be deleted from here).
//
// Usage: node tools/user-simulation/journeys/offer-to-payment-form.mjs   (exit 0 = all passed)
import { Journey, d1, q, openHome, raiseDossier, setMark, press, until, sleep, pasteSchedule, findPaymentForm, signIn, overlayFrame, subxWorkspace, SAMPLE_LINES } from "../lib/journey-kit.mjs";

const J = new Journey("offer-to-payment-form", "The $100 first submittal, up to the loaded payment form");
const OFFER_LINE = /\$100 · your first submittal \+ 30 days of every product · no automatic charge/;
const FORM = { product: /First Submittal/i, price: /\$100(\.00)?\b/ };
const DAY = 86400000;
const SUITE = "trial-suite,subx,takeoffx,cutsheetx,sightx,propx,huntx,meetingx";
const DATE = "(mon|tues|wednes|thurs|fri|satur|sun)day, \\w+ \\d{1,2}, \\d{4}";

/** A throwaway account in the offer's state: 30 days of every product ending days from now. */
async function offerAccount(label, days) {
  const acct = await J.account(label, { tier: "starter", status: "trial", products: SUITE, trialDays: 1 });
  const endIso = new Date(Date.now() + days * DAY).toISOString();
  const boughtIso = new Date(Date.now() + (days - 30) * DAY).toISOString();
  const [u] = await d1("UPDATE users SET trial_ends_at = " + q(endIso) + " WHERE id = " + q(acct.userId) + ";");
  const [p] = await d1("INSERT INTO weyland_purchases (checkout_session_id, kind, product_id, status, user_id, email, amount_total, currency, quantity, purchased_at, granted_at, access_ends_at, credits_total, credits_used, claim_method) VALUES (" +
    ["cs_usersim_" + acct.userId, "offer", "weyland-first-submittal", "granted", acct.userId, acct.email].map(q).join(",") + ",10000,'usd',1," + [boughtIso, boughtIso, endIso].map(q).join(",") + ",1,0,'webhook');");
  if (!u.success || !p.success) throw new Error("offer state not written");
  return acct;
}

/** The events WeylandCheckout sends after a real payment: complete, then active or held. */
async function afterPayment(page, status, extra = {}) {
  await page.evaluate(([status, extra]) => {
    const sid = "cs_live_usersim" + Math.random().toString(36).slice(2, 14);
    const send = (d) => window.dispatchEvent(new CustomEvent("weyland-checkout", { detail: Object.assign({ session_id: sid, product_id: "weyland-first-submittal" }, d) }));
    send({ status: "complete" });
    send(Object.assign({ status }, extra));
  }, [status, extra]);
}

/** A first-submittal box: its state, the result's words, whether the $100 button still shows, the next step. */
const boxState = (page, sel) => page.evaluate((sel) => {
  const b = document.querySelector(sel);
  const done = b && b.querySelector(".offer-done");
  const buy = b && b.querySelector(".offer-act .js-checkout");
  const next = done && done.querySelector("button");
  const r = done ? done.getBoundingClientRect() : null;
  return {
    found: !!b, state: b ? b.getAttribute("data-offer-state") || "" : null, doneState: done ? done.getAttribute("data-state") : null,
    text: done ? done.innerText.replace(/\s+/g, " ").trim() : "", buyVisible: !!buy && buy.getClientRects().length > 0,
    next: next ? next.textContent.trim() : "", rect: r ? { right: Math.round(r.right), width: Math.round(r.width), vw: innerWidth } : null
  };
}, sel);

/** The shell's sign-in view, and whether it opened on the emailed code (password hidden). */
async function signinView(page) {
  await until(() => page.evaluate(() => !!window.WeylandShell && window.WeylandShell.state().view === "signin"), 8000, 250);
  return page.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); return !!e && e.getClientRects().length > 0; };
    return { view: window.WeylandShell.state().view, codeMode: vis("weyland-signin-code-send") && !vis("weyland-signin-password") && vis("weyland-signin-use-password") };
  });
}

// The helper's own modal (WeylandCheckout, /api/billing/embedded-checkout.js).
const helperState = (page) => page.evaluate(() => {
  const m = document.querySelector(".wco-backdrop");
  const agree = m && m.querySelector(".wco-agree");
  const go = m && m.querySelector(".wco-continue");
  return {
    open: !!m,
    price: ((m && m.querySelector(".wco-sum-price")) || {}).textContent || "",
    points: ((m && m.querySelector(".wco-sum-list")) || {}).innerText || "",
    terms: ((m && m.querySelector(".wco-check")) || {}).innerText || "",
    agree: !!agree, agreeChecked: !!(agree && agree.checked), continueDisabled: !!(go && go.disabled)
  };
}).catch(() => ({ open: false }));

async function throughTerms(page, label, { touch = false } = {}) {
  await until(async () => (await helperState(page)).agree, 20000, 300);
  await until(async () => /\$100/.test((await helperState(page)).price), 10000, 300);
  const t = await helperState(page);
  J.check(label + ": the helper first shows what is bought and the Terms ($100 one-time, no automatic charge, Argo LLC)", t.open && /\$100(\.00)? one-time/i.test(t.price) && /no automatic charge/i.test(t.points) && /terms of service/i.test(t.terms) && /argo llc/i.test(t.terms), { price: t.price, points: t.points.slice(0, 200), terms: t.terms.slice(0, 160) });
  J.check(label + ": CONTINUE TO PAYMENT waits for the Terms box to be ticked", t.agree && !t.agreeChecked && t.continueDisabled, t);
  await press(page, ".wco-backdrop .wco-agree", { touch });
  await until(async () => !(await helperState(page)).continueDisabled, 5000, 200);
  await press(page, ".wco-backdrop .wco-continue", { touch });
}

async function closeForm(page, label, mark, noteSel, { touch = false } = {}) {
  await press(page, ".wco-backdrop .wco-close", { touch }).catch(() => {});
  await until(() => page.evaluate(() => !document.querySelector(".wco-backdrop")), 8000, 250);
  await sleep(500);
  const after = await page.evaluate((sel) => ({ modal: !!document.querySelector(".wco-backdrop"), note: ((document.querySelector(sel) || {}).textContent || "").trim() }), noteSel);
  J.check(label + ": closing the form leaves the visitor on the same page, nothing charged", !after.modal && /nothing was charged/i.test(after.note), after);
  await J.checkInPlace(page, mark, label + ": stayed in place: same document, still on weylandai.com");
}

await J.run(async () => {
  await J.launch();

  // Desktop: the pricing section leads with the offer.
  {
    const ctx = await J.context("desktop");
    const page = await J.page(ctx);
    await openHome(page, J, "pricing");
    await raiseDossier(page);
    const mark = await setMark(page);
    await page.evaluate(() => { const s = document.getElementById("pricing"); if (s) s.scrollIntoView({ block: "start" }); });
    await sleep(600);
    const pr = await page.evaluate(() => {
      const sec = document.getElementById("pricing");
      const firstCard = sec && sec.querySelector(".offer-card, .pricing-card");
      const btn = sec && sec.querySelector(".offer-card .js-checkout");
      return { h2: ((sec && sec.querySelector("h2")) || {}).innerText || "", firstIsOffer: !!firstCard && firstCard.classList.contains("offer-card"),
        line: ((sec && sec.querySelector(".offer-card .offer-line")) || {}).innerText || "", button: btn ? btn.innerText.replace(/\s+/g, " ").trim() : "", product: btn ? btn.getAttribute("data-product") : "" };
    });
    J.check("pricing: the section leads with the offer", pr.firstIsOffer && OFFER_LINE.test(pr.line) && /\$100/.test(pr.h2), pr);
    J.check("pricing: its button is the first submittal at $100", /build my first submittal · \$100/i.test(pr.button) && pr.product === "weyland-first-submittal", pr);
    await press(page, "#pricing .offer-card .js-checkout");
    await throughTerms(page, "pricing");
    const form = await findPaymentForm(page, FORM, 45000);
    J.check("pricing: Stripe's form loads inside the page for the first submittal at $100.00", form.where === "embedded" && form.visible && form.product && form.price, form);
    await closeForm(page, "pricing", mark, "#pricing .offer-card .js-checkout-note");
    await ctx.close();
  }

  // Desktop: the paste result's packet box.
  {
    const ctx = await J.context("desktop");
    const page = await J.page(ctx);
    await openHome(page, J, "paste");
    await raiseDossier(page);
    const mark = await setMark(page);
    const paste = await pasteSchedule(page, SAMPLE_LINES.slice(0, 2));
    J.check("paste: the schedule matches (2 of 2)", paste.matched === 2 && paste.total === 2, paste.first);
    const box = await page.evaluate(() => {
      const b = document.querySelector("#hs-results .offer-box");
      const btn = b && b.querySelector(".js-checkout");
      return { line: ((b && b.querySelector(".offer-line")) || {}).innerText || "", copy: ((b && b.querySelector(".offer-copy")) || {}).innerText || "", button: btn ? btn.innerText.replace(/\s+/g, " ").trim() : "", product: btn ? btn.getAttribute("data-product") : "" };
    });
    J.check("paste: the packet box leads with the offer line", OFFER_LINE.test(box.line), box);
    J.check("paste: BUILD THE PACKET is the first submittal at $100", /build the packet · \$100/i.test(box.button) && box.product === "weyland-first-submittal", box);
    await press(page, "#hs-results .offer-box .js-checkout");
    await throughTerms(page, "paste");
    const form = await findPaymentForm(page, FORM, 45000);
    J.check("paste: Stripe's form loads inside the page for the first submittal at $100.00", form.where === "embedded" && form.visible && form.product && form.price, form);
    await closeForm(page, "paste", mark, "#hs-results .offer-box .js-checkout-note");
    await ctx.close();
  }

  // Phone (390 px, by tap): the paste result's packet box.
  {
    const ctx = await J.context("phone");
    const page = await J.page(ctx);
    await openHome(page, J, "phone");
    await raiseDossier(page, { touch: true });
    const mark = await setMark(page);
    const paste = await pasteSchedule(page, SAMPLE_LINES.slice(0, 2), { touch: true });
    J.check("phone: the schedule matches (2 of 2)", paste.matched === 2 && paste.total === 2, paste.first);
    const fits = await page.evaluate(() => { const b = document.querySelector("#hs-results .offer-box"); const r = b && b.getBoundingClientRect(); return r ? { right: Math.round(r.right), width: Math.round(r.width), vw: innerWidth } : null; });
    J.check("phone: the packet box fits the screen", !!fits && fits.right <= fits.vw + 1, fits);
    await press(page, "#hs-results .offer-box .js-checkout", { touch: true });
    await throughTerms(page, "phone", { touch: true });
    const form = await findPaymentForm(page, FORM, 45000);
    J.check("phone: Stripe's form loads inside the page for the first submittal at $100.00", form.where === "embedded" && form.visible && form.product && form.price, form);
    await closeForm(page, "phone", mark, "#hs-results .offer-box .js-checkout-note", { touch: true });
    await ctx.close();
  }

  // Phone, after a payment: the result in place, the end date, nothing charged after it, one next step.
  {
    const ctx = await J.context("phone");
    const page = await J.page(ctx);
    await openHome(page, J, "phone-paid");
    await raiseDossier(page, { touch: true });
    const mark = await setMark(page);
    const paste = await pasteSchedule(page, SAMPLE_LINES.slice(0, 2), { touch: true });
    J.check("phone, paid: the schedule matches (2 of 2)", paste.matched === 2 && paste.total === 2, paste.first);
    await press(page, "#hs-results .offer-box .js-checkout", { touch: true });
    await until(async () => (await helperState(page)).agree, 20000, 300);
    await afterPayment(page, "active", { quantity: 1, access_ends_at: new Date(Date.now() + 30 * DAY).toISOString() });
    await press(page, ".wco-backdrop .wco-close", { touch: true }).catch(() => {});
    await until(() => page.evaluate(() => !document.querySelector(".wco-backdrop")), 8000, 250);
    await sleep(800);
    const r = await boxState(page, "#hs-results .offer-box");
    J.check("phone, paid: the box shows the result in place: paid, every product until <date> (30 days), nothing charged after that", r.doneState === "paid" && new RegExp("^Paid\\. Your first submittal is ready to build\\. Every product is yours until " + DATE + " \\(30 days\\)\\. Nothing is charged after that unless you choose a plan\\.", "i").test(r.text), r);
    J.check("phone, paid: the $100 button is gone from the box", r.found && !r.buyVisible, r);
    J.check("phone, paid: one next step; signed out on this browser, it is the emailed-code sign-in on the way to SubX", r.next === "SIGN IN TO OPEN SUBX" && /next: sign in with the email you paid with/i.test(r.text), r);
    J.check("phone, paid: the result fits the screen", !!r.rect && r.rect.right <= r.rect.vw + 1, r.rect);
    await press(page, "#hs-results .offer-box .offer-done button", { touch: true });
    const si = await signinView(page);
    J.check("phone, paid: the next step opens the sign-in on the emailed code", si.view === "signin" && si.codeMode, si);
    await page.evaluate(() => window.WeylandShell.close());
    await J.checkInPlace(page, mark, "phone, paid: stayed in place: same document, still on weylandai.com");
    await ctx.close();
  }

  // Desktop: a purchase held for an existing account; signing in to that account claims it. Then the
  // account's boxes offer no second purchase and lead to SubX.
  {
    const acct = await offerAccount("offer-held", 30);
    const ctx = await J.context("desktop");
    const page = await J.page(ctx);
    await openHome(page, J, "held");
    await raiseDossier(page);
    const mark = await setMark(page);
    const paste = await pasteSchedule(page, SAMPLE_LINES.slice(0, 2));
    J.check("held: the schedule matches (2 of 2)", paste.matched === 2 && paste.total === 2, paste.first);
    await press(page, "#hs-results .offer-box .js-checkout");
    await until(async () => (await helperState(page)).agree, 20000, 300);
    await afterPayment(page, "held", { email_hint: "us***@weylandai.com" });
    await press(page, ".wco-backdrop .wco-close").catch(() => {});
    await until(() => page.evaluate(() => !document.querySelector(".wco-backdrop")), 8000, 250);
    await sleep(800);
    const h = await boxState(page, "#hs-results .offer-box");
    J.check("held: the box says it is paid and waits on the account that already has that email", h.doneState === "held" && /^Paid\. The email you paid with \(us\*\*\*@weylandai\.com\) already has a WeylandAI account/.test(h.text) && /nothing more is charged/i.test(h.text), h);
    J.check("held: it says plainly how to claim it (SIGN IN WITH A CODE, that email, the code), and the $100 button is gone", /to add it: choose sign in with a code, enter that email, then the code we send to it/i.test(h.text) && h.next === "SIGN IN WITH A CODE" && !h.buyVisible, h);
    await press(page, "#hs-results .offer-box .offer-done button");
    const si = await signinView(page);
    J.check("held: SIGN IN WITH A CODE opens the sign-in on the emailed code", si.view === "signin" && si.codeMode, si);
    await page.evaluate(() => window.WeylandShell.close());
    await sleep(500);
    const st = await signIn(page, acct);
    J.check("held: the account with the offer running signs in", st.auth === "signed-in", { auth: st.auth, error: st.error });
    await page.evaluate(() => window.WeylandShell.close());
    await until(async () => (await boxState(page, "#hs-results .offer-box")).doneState === "paid", 15000, 300);
    const p = await boxState(page, "#hs-results .offer-box");
    J.check("held, then signed in: the box turns into the result with the account's end date (30 days)", p.doneState === "paid" && new RegExp("^Paid\\. Your first submittal is ready to build\\. Every product is yours until " + DATE + " \\(30 days\\)\\.", "i").test(p.text), p);
    J.check("held, then signed in: one next step, SubX with their schedule", p.next === "OPEN SUBX: UPLOAD YOUR SCHEDULE" && /next: open subx and upload the door or hardware schedule for this job/i.test(p.text), p);
    const card = await boxState(page, "#offer");
    J.check("offer running: the pricing card offers no second purchase; it shows the end date and SubX", card.doneState === "owned" && !card.buyVisible && new RegExp("^Your first submittal is paid\\. Every product is yours until " + DATE, "i").test(card.text) && card.next === "OPEN SUBX: UPLOAD YOUR SCHEDULE", card);
    await press(page, "#hs-results .offer-box .offer-done button");
    const frame = await overlayFrame(page, 25000);
    const ws = frame ? await subxWorkspace(frame, 30000) : null;
    const sx = await page.evaluate(() => window.WeylandShell.state());
    const upload = frame ? !!(await frame.$("#upload-form").catch(() => null)) : false;
    J.check("OPEN SUBX: SubX opens inside the page, signed in, at its upload", sx.view === "app" && sx.path === "/subx-app" && !!ws && ws.appVisible && !ws.loginVisible && upload, { shell: sx, ws, upload });
    await page.evaluate(() => window.WeylandShell.close());
    await sleep(500);
    const again = await pasteSchedule(page, SAMPLE_LINES.slice(1, 3));
    const o = await boxState(page, "#hs-results .offer-box");
    J.check("offer running, a new paste: the packet box offers no second $100 purchase and leads to SubX", again.matched >= 1 && o.doneState === "owned" && !o.buyVisible && o.next === "OPEN SUBX: UPLOAD YOUR SCHEDULE", { matched: again.matched, box: o });
    await J.checkInPlace(page, mark, "held: all in place: same document, still on weylandai.com");
    await ctx.close();
  }
});
