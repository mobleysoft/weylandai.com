// tools/user-simulation/journeys/account-plan.mjs
//
// The account view manages the plan in the page (fc:shell + fc:payments, 2026-10-07). Three
// throwaway accounts are put in real states the platform answers for (users row + the offer's
// purchase row, as the payment webhook writes them), and their account cards are read:
//   - the $100 offer on day 25 (5 days left): plan, "Access until <date> (5 days left)", the first
//     submittal's credit, the prompt to choose a plan (in the card, at the bottom of the page, and as
//     a strip above an app open in the overlay), CHOOSE A PLAN listing the platform's plans (no second
//     offer) and opening the payment helper inside the overlay up to Stripe's loaded form ($2,000
//     SubConP; stops there, nothing paid), and the real (empty) invoice list;
//   - the offer on day 10: the end date and no prompt;
//   - the offer ended yesterday: "the paid tools are paused and your work is kept".
// Then the parts no throwaway account can reach for real (a live monthly plan with a card and
// invoices: none exists on this Stripe account and none is ever paid here) are checked against
// answers given inside the test browser for GET /api/billing/plan, GET /api/billing/invoices and the
// cancel / resume routes: renew date and card, CANCEL AT PERIOD END asked in the page then shown as
// ending, RESUME THE PLAN, and an invoice PDF drawn in the page's own viewer.
// Each CHOOSE leaves one live Checkout Session to expire. Rows deleted in finally.
//
// Usage: node tools/user-simulation/journeys/account-plan.mjs   (exit 0 = all passed)
import { readFileSync } from "node:fs";
import { Journey, d1, q, openHome, raiseDossier, setMark, press, until, sleep, signIn, shellState, openAccountCard, overlayFrame, findPaymentForm, SAMPLE_PDF } from "../lib/journey-kit.mjs";

const J = new Journey("account-plan", "The account view manages the plan in the page");
const DAY = 86400000;
const SUITE = "trial-suite,subx,takeoffx,cutsheetx,sightx,propx,huntx,meetingx";

/** A throwaway account in the offer's state: access window ends `days` from now (negative: ended). */
async function offerAccount(label, days) {
  const acct = await J.account(label, { tier: "starter", status: "trial", products: SUITE, trialDays: 1 });
  const endIso = new Date(Date.now() + days * DAY).toISOString();
  const boughtIso = new Date(Date.now() + (days - 30) * DAY).toISOString();
  const [u] = await d1("UPDATE users SET trial_ends_at = " + q(endIso) + " WHERE id = " + q(acct.userId) + ";");
  const sid = "cs_usersim_" + acct.userId;
  const [p] = await d1("INSERT INTO weyland_purchases (checkout_session_id, kind, product_id, status, user_id, email, amount_total, currency, quantity, purchased_at, granted_at, access_ends_at, credits_total, credits_used, claim_method) VALUES (" +
    [sid, "offer", "weyland-first-submittal", "granted", acct.userId, acct.email].map(q).join(",") + ",10000,'usd',1," + [boughtIso, boughtIso, endIso].map(q).join(",") + ",1,0,'webhook');");
  if (!u.success || !p.success) throw new Error("offer state not written");
  return acct;
}

async function cardOf(page) {
  return page.evaluate(() => {
    const body = document.querySelector("#wa-overlay.is-open .wa-body");
    const rows = {};
    document.querySelectorAll("#wa-account-rows .wa-row").forEach((r) => { const s = r.querySelectorAll("span"); if (s.length === 2) rows[s[0].textContent.trim()] = s[1].textContent.trim(); });
    const choose = document.getElementById("weyland-choose-plan");
    return {
      view: window.WeylandShell && window.WeylandShell.state().view,
      access: window.WeylandShell && window.WeylandShell.state().access,
      rows, note: ((document.getElementById("wa-access-note") || {}).textContent || "").trim(),
      choose: choose ? { text: choose.textContent.trim(), primary: choose.classList.contains("wa-primary") } : null,
      section: ((document.getElementById("wa-plan-section") || {}).innerText || "").replace(/\s+/g, " ").trim(),
      text: body ? body.innerText.replace(/\s+/g, " ").trim().slice(0, 600) : ""
    };
  });
}
const pageCard = (page) => page.evaluate(() => { const c = document.getElementById("wa-access-card"); return c ? { phase: c.getAttribute("data-phase"), text: c.innerText.replace(/\s+/g, " ").trim() } : null; });
const DATE = "(mon|tues|wednes|thurs|fri|satur|sun)day, \\w+ \\d{1,2}, \\d{4}";

await J.run(async () => {
  await J.launch();

  // 1. The offer on day 25: 5 days left.
  {
    const acct = await offerAccount("plan-d25", 5);
    const ctx = await J.context("desktop");
    const page = await J.page(ctx);
    await openHome(page, J, "d25");
    await raiseDossier(page);
    const mark = await setMark(page);
    const st = await signIn(page, acct);
    J.check("day 25: the offer account signs in", st.auth === "signed-in", { auth: st.auth, error: st.error });
    await page.evaluate(() => window.WeylandShell.close());
    await sleep(600);
    const prompt = await pageCard(page);
    J.check("day 25: the page prompts to choose a plan, with the end date and no automatic charge", !!prompt && prompt.phase === "offer-ending" && new RegExp("end on " + DATE + " \\(5 days left\\)", "i").test(prompt.text) && /nothing is charged automatically/i.test(prompt.text) && /choose a plan/i.test(prompt.text), prompt);
    await openAccountCard(page);
    await until(() => page.evaluate(() => !/Loading your plan/.test((document.getElementById("wa-plan-section") || {}).innerText || "x")), 15000, 300);
    const c = await cardOf(page);
    J.note("day25_card", c);
    J.check("day 25: the card names the plan and the access end date with the days left", c.view === "account" && /first submittal/i.test(c.rows["Plan"] || "") && new RegExp("^" + DATE + " \\(5 days left\\)$", "i").test(c.rows["Access until"] || ""), c.rows);
    J.check("day 25: the card shows the first submittal's credit", /paid .*\$100.*1 of 1 packet left/i.test(c.rows["First submittal"] || ""), c.rows["First submittal"]);
    J.check("day 25: the card says nothing is charged automatically and offers CHOOSE A PLAN first", /nothing is charged automatically/i.test(c.note) && !!c.choose && c.choose.primary, { note: c.note, choose: c.choose });
    J.check("day 25: the plan section reads the platform (no monthly plan, no invoices yet)", /no monthly plan/i.test(c.section) && /invoices/i.test(c.section), c.section);
    J.check("day 25: the shell's access state is the offer, ending", c.access && c.access.kind === "offer" && c.access.phase === "offer-ending" && c.access.days_left === 5, c.access);

    // Choose a plan: the platform's list, then the helper inside the overlay, up to Stripe's form.
    await press(page, "#weyland-choose-plan");
    await until(() => page.evaluate(() => document.querySelectorAll("#wa-plan-list .wa-plan").length > 0), 15000, 300);
    const plans = await page.evaluate(() => Array.from(document.querySelectorAll("#wa-plan-list .wa-plan")).map((p) => ({ id: p.getAttribute("data-product"), text: p.innerText.replace(/\s+/g, " ").trim() })));
    J.check("day 25: CHOOSE A PLAN lists the platform's plans, SubConP first, and no second offer", plans.length >= 2 && plans[0].id === "weyland-subconp-seat" && /\$2,000 a month/.test(plans[0].text) && !plans.some((p) => p.id === "weyland-first-submittal"), plans.slice(0, 4));
    await press(page, "#wa-plan-list .wa-plan[data-product='weyland-subconp-seat'] button");
    await until(() => page.evaluate(() => !!document.querySelector("#wa-plan-checkout .wco-agree")), 20000, 300);
    const terms = await page.evaluate(() => ({ inOverlay: !!document.querySelector("#wa-overlay.is-open #wa-plan-checkout .wco-terms"), modal: !!document.querySelector(".wco-backdrop"), text: ((document.querySelector("#wa-plan-checkout .wco-terms") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 300) }));
    J.check("day 25: the helper opens inside the overlay (no second window), Terms first", terms.inOverlay && !terms.modal && /terms of service/i.test(terms.text), terms);
    await press(page, "#wa-plan-checkout .wco-agree");
    await press(page, "#wa-plan-checkout .wco-continue");
    const form = await findPaymentForm(page, { product: /SubConP|Subcontractor/i, price: /\$2,000(\.00)?\b/ }, 45000);
    J.check("day 25: Stripe's form loads inside the overlay for SubConP at $2,000 (stopped there)", form.where === "embedded" && form.visible && form.product && form.price, form);
    await press(page, page.locator("#wa-overlay.is-open button").filter({ hasText: /^back to the account$/i }).first()).catch(() => {});
    await sleep(800);
    const back = await page.evaluate(() => ({ view: window.WeylandShell.state().view, helperOpen: !!(window.WeylandCheckout && window.WeylandCheckout.state().open) }));
    J.check("day 25: leaving the plans view closes the payment form", back.view === "account" && !back.helperOpen, back);

    // An app open in the overlay carries the prompt as a strip above it.
    await page.evaluate(() => window.WeylandShell.open("app", { path: "/find" }));
    await overlayFrame(page, 20000);
    const strip = await page.evaluate(() => { const b = document.getElementById("wa-access-banner"); return b && b.style.display !== "none" ? { phase: b.getAttribute("data-phase"), text: b.innerText.replace(/\s+/g, " ").trim() } : null; });
    J.check("day 25: an app open in the overlay shows the prompt above it", !!strip && strip.phase === "offer-ending" && /choose a plan/i.test(strip.text), strip);
    await page.evaluate(() => window.WeylandShell.close());

    await J.checkInPlace(page, mark, "day 25: all in place: same document, still on weylandai.com");
    await ctx.close();
  }

  // 2. The offer on day 10: the end date, no prompt.
  {
    const acct = await offerAccount("plan-d10", 20);
    const ctx = await J.context("desktop");
    const page = await J.page(ctx);
    await openHome(page, J, "d10");
    await raiseDossier(page);
    const st = await signIn(page, acct);
    J.check("day 10: the offer account signs in", st.auth === "signed-in", { auth: st.auth, error: st.error });
    await page.evaluate(() => window.WeylandShell.close());
    await sleep(600);
    J.check("day 10: no prompt on the page yet", !(await pageCard(page)), await pageCard(page));
    await openAccountCard(page);
    const c = await cardOf(page);
    J.check("day 10: the card shows the access end date with 20 days left and no prompt", new RegExp("^" + DATE + " \\(20 days left\\)$", "i").test(c.rows["Access until"] || "") && /includes every product until/i.test(c.note) && !!c.choose && !c.choose.primary && c.access.phase === "offer", { rows: c.rows, note: c.note, choose: c.choose, access: c.access });
    await ctx.close();
  }

  // 3. The offer ended yesterday: paused, work kept.
  {
    const acct = await offerAccount("plan-ended", -1);
    const ctx = await J.context("desktop");
    const page = await J.page(ctx);
    await openHome(page, J, "ended");
    await raiseDossier(page);
    const st = await signIn(page, acct);
    J.check("ended: the account still signs in (it stays, with its email)", st.auth === "signed-in", { auth: st.auth, error: st.error });
    await page.evaluate(() => window.WeylandShell.close());
    await sleep(600);
    const prompt = await pageCard(page);
    J.check("ended: the page says plainly that the paid tools are paused and the work is kept", !!prompt && prompt.phase === "ended" && /paid tools are paused/i.test(prompt.text) && /work is kept/i.test(prompt.text), prompt);
    await openAccountCard(page);
    const c = await cardOf(page);
    J.check("ended: the card says paused, when it ended, and offers CHOOSE A PLAN", /paused/i.test(c.rows["Plan"] || "") && new RegExp("^" + DATE + "$", "i").test(c.rows["Ended on"] || "") && /paid tools are paused/i.test(c.note) && !!c.choose && c.choose.primary, { rows: c.rows, note: c.note, choose: c.choose, access: c.access });
    await ctx.close();
  }

  // 4. A monthly plan with a card and invoices: answered in this browser (no real one exists).
  {
    const acct = await offerAccount("plan-sub", 12);
    const ctx = await J.context("desktop");
    const page = await J.page(ctx);
    const sub = { id: "sub_usersim", product_id: "weyland-subconp-seat", name: "SubConP suite", quantity: 1, unit_amount: 200000, currency: "usd", interval: "month", status: "active",
      current_period_end: new Date(Date.now() + 20 * DAY).toISOString(), cancel_at_period_end: false, card: { brand: "visa", last4: "4242", exp_month: 4, exp_year: 2030 } };
    const calls = [];
    const json = (route, status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    await ctx.route((u) => u.hostname === "weylandai.com" && u.pathname === "/api/billing/plan", (r) => { calls.push("plan"); return json(r, 200, { access: null, plan: { name: "SubConP suite", tier: "subconp", status: "active" }, subscription: sub, subscriptions: [sub], card: sub.card, choices: [] }); });
    await ctx.route((u) => u.hostname === "weylandai.com" && u.pathname === "/api/billing/invoices", (r) => { calls.push("invoices"); return json(r, 200, { invoices: [{ id: "in_usersim", number: "WA-0001", created: new Date(Date.now() - 10 * DAY).toISOString(), total: 200000, amount_paid: 200000, currency: "usd", status: "paid", description: "SubConP suite", pdf_url: "/api/billing/invoices/in_usersim/pdf" }] }); });
    await ctx.route((u) => u.hostname === "weylandai.com" && u.pathname === "/api/billing/invoices/in_usersim/pdf", (r) => { calls.push("pdf"); return r.fulfill({ status: 200, contentType: "application/pdf", body: readFileSync(SAMPLE_PDF) }); });
    await ctx.route((u) => u.hostname === "weylandai.com" && u.pathname === "/api/billing/subscription/cancel", (r) => { calls.push("cancel:" + (r.request().postData() || "")); sub.cancel_at_period_end = true; return json(r, 200, { subscription: sub }); });
    await ctx.route((u) => u.hostname === "weylandai.com" && u.pathname === "/api/billing/subscription/resume", (r) => { calls.push("resume:" + (r.request().postData() || "")); sub.cancel_at_period_end = false; return json(r, 200, { subscription: sub }); });
    await openHome(page, J, "sub");
    await raiseDossier(page);
    const mark = await setMark(page);
    const st = await signIn(page, acct);
    J.check("plan (answers in this browser): the account signs in", st.auth === "signed-in", { auth: st.auth, error: st.error });
    await page.evaluate(() => window.WeylandShell.close());
    await openAccountCard(page);
    await until(() => page.evaluate(() => /Renews on/.test((document.getElementById("wa-plan-section") || {}).innerText || "")), 15000, 300);
    const s1 = await cardOf(page);
    J.check("plan (answers in this browser): the plan, its renewal date and the card are shown", /SubConP suite · \$2,000 a month/.test(s1.section) && new RegExp("Renews on " + DATE, "i").test(s1.section) && /Visa ending 4242 \(expires 04\/30\)/.test(s1.section), s1.section);
    await press(page, "#weyland-cancel-plan");
    const ask = await page.evaluate(() => ((document.querySelector("#wa-plan-section .wa-note.wa-warn") || {}).innerText || "").replace(/\s+/g, " "));
    J.check("plan (answers in this browser): CANCEL AT PERIOD END asks in the page what happens", /stays on until/i.test(ask) && /nothing more is charged/i.test(ask) && /work stays/i.test(ask), ask);
    await press(page, "#weyland-cancel-confirm");
    await until(() => page.evaluate(() => /Ends on/.test((document.getElementById("wa-plan-section") || {}).innerText || "")), 15000, 300);
    const s2 = await cardOf(page);
    J.check("plan (answers in this browser): after cancelling, the plan shows when it ends and offers RESUME", new RegExp("Ends on " + DATE, "i").test(s2.section) && !!(await page.$("#weyland-resume-plan")) && /cancelled at period end/i.test(s2.text) && calls.some((c) => /^cancel:.*sub_usersim/.test(c)), { section: s2.section, calls });
    await press(page, "#weyland-resume-plan");
    await until(() => page.evaluate(() => /Renews on/.test((document.getElementById("wa-plan-section") || {}).innerText || "")), 15000, 300);
    const s3 = await cardOf(page);
    J.check("plan (answers in this browser): RESUME THE PLAN puts the renewal back", new RegExp("Renews on " + DATE, "i").test(s3.section) && !!(await page.$("#weyland-cancel-plan")) && calls.some((c) => /^resume:/.test(c)), { section: s3.section, calls });
    J.check("plan (answers in this browser): the invoice is listed", /\$2,000 · Paid/.test(s3.section), s3.section);
    await press(page, "#wa-plan-section .wa-inv button");
    await until(() => page.evaluate(() => !!document.querySelector("#wa-overlay.is-open .wa-pdf[data-wa-page]")), 30000, 400);
    const pdf = await page.evaluate(() => ({ view: window.WeylandShell.state().view, page: (document.querySelector("#wa-overlay.is-open .wa-pdf") || {}).getAttribute ? document.querySelector("#wa-overlay.is-open .wa-pdf").getAttribute("data-wa-page") : null, back: !!Array.from(document.querySelectorAll("#wa-overlay.is-open .wa-pdf-btn")).find((b) => /account/i.test(b.textContent)) }));
    J.check("plan (answers in this browser): the invoice PDF is drawn in the page, with a way back to the account", pdf.view === "pdf" && pdf.page === "1" && pdf.back && calls.includes("pdf"), pdf);
    await page.evaluate(() => window.WeylandShell.close());
    await J.checkInPlace(page, mark, "plan (answers in this browser): all in place: same document, still on weylandai.com");
    await ctx.close();
  }
});
