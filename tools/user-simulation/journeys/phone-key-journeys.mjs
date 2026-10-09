// tools/user-simulation/journeys/phone-key-journeys.mjs
//
// Journey map id "phone-key-journeys" (priority 1): the key journeys on a phone (390x844, touch,
// iPhone user agent), every step by tap.
// Expected: every step fits the 390 px screen and works by tap: first view (the dossier directly,
// no 3D backdrop; nothing cut off, the account control covers nothing); paste a schedule and open a
// citation (drawn in place); WALK THIS SCHEDULE IN SIGHTX with the joystick, then [raise dossier];
// PropX GENERATE; sign in from the account control, the account card, OPEN SUBX (fits the screen),
// sign out; pricing START HUNTX shows the payment form for HuntX at $799 inside the page (stops at
// the loaded form: nothing typed, nothing paid; one live Checkout Session left to expire).
// Throwaway SubConP account; its rows and the demo clones are deleted in finally.
//
// Usage: node tools/user-simulation/journeys/phone-key-journeys.mjs   (exit 0 = all passed)
import { Journey, openHome, setMark, placeState, press, until, sleep, waitText, signIn, shellState, pasteSchedule, documentOutcome, closeOverlay, citedPage, openAccountCard, overlayFrame, subxWorkspace, findPaymentForm, SAMPLE_LINES } from "../lib/journey-kit.mjs";

import { checkFirstScreen } from "../lib/first-screen.mjs";

const J = new Journey("phone-key-journeys", "Key journeys on a phone (390x844, touch, iPhone user agent)");
const touch = true;

// Visible controls that poke past the screen's left or right edge (cut off, cannot be tapped
// whole), outside horizontal scrollers, the shell overlay and hidden containers.
async function cutOffControls(page) {
  return page.evaluate(() => {
    const out = [];
    const hiddenUp = (el) => { for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.visibility === "hidden" || cs.opacity === "0" || n.getAttribute("aria-hidden") === "true" || n.hidden) return true; } return false; };
    const inScroller = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const ox = getComputedStyle(n).overflowX; if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 1) return true; } return false; };
    for (const el of document.querySelectorAll("a[href], button, input, select, textarea, [role=button]")) {
      if (el.closest("#wa-overlay, #upgrade-modal, #stage-backdrop")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || el.offsetParent === null) continue;
      if (r.right <= innerWidth + 1 && r.left >= -1) continue;
      if (hiddenUp(el) || inScroller(el)) continue;
      out.push({ text: (el.innerText || el.value || el.getAttribute("aria-label") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right), section: (el.closest("section[id]") || {}).id || "" });
    }
    return out;
  });
}

// Controls the account control sits on top of.
async function underChip(page) {
  return page.evaluate(() => {
    const chip = document.getElementById("wa-account-chip");
    if (!chip) return [{ text: "no account control" }];
    const c = chip.getBoundingClientRect();
    const hit = [];
    for (const el of document.querySelectorAll("a[href], button, input, select, [role=button]")) {
      if (el === chip || chip.contains(el) || el.contains(chip) || el.closest("#wa-overlay")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || el.offsetParent === null || getComputedStyle(el).visibility === "hidden") continue;
      if (!(r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top)) continue;
      // Which one a finger gets where they overlap.
      const ox = (Math.max(r.left, c.left) + Math.min(r.right, c.right)) / 2, oy = (Math.max(r.top, c.top) + Math.min(r.bottom, c.bottom)) / 2;
      const top = document.elementFromPoint(ox, oy);
      const onTop = !top ? "nothing" : (top === chip || chip.contains(top)) ? "account control" : (top === el || el.contains(top)) ? "this control" : top.tagName.toLowerCase() + (top.id ? "#" + top.id : "");
      hit.push({ text: (el.innerText || el.getAttribute("aria-label") || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40), id: el.id || "", box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], onTop });
    }
    return hit.length ? [{ chip: [Math.round(c.left), Math.round(c.top), Math.round(c.right), Math.round(c.bottom)] }, ...hit] : [];
  });
}

await J.run(async () => {
  await J.launch();
  const acct = await J.account("phone");
  const ctx = await J.context("phone");
  const page = await J.page(ctx);
  const t0 = Date.now();
  await openHome(page, J, "phone");
  const mark = await setMark(page);

  await checkFirstScreen(J, page, "phone");

  // First view.
  const first = await page.evaluate(() => {
    const h = document.querySelector("#hero h1"); const r = h ? h.getBoundingClientRect() : null;
    const stray = Array.from(document.body.childNodes).filter((n) => n.nodeType === 3 && /^\s*>+\s*$/.test(n.textContent)).length;
    return { heroInView: !!r && r.width > 0 && r.top >= 0 && r.top < innerHeight, lowered: document.documentElement.classList.contains("folder-lowered"),
      backdrop: !!document.querySelector("#stage-backdrop iframe"), scrollWidth: document.documentElement.scrollWidth, innerWidth, strayTextNodes: stray };
  });
  J.note("first_view", { ...first, secondsAfterLoad: Math.round((Date.now() - t0) / 100) / 10 });
  J.check("phone: the dossier hero shows at first view, no 3D backdrop", first.heroInView && !first.lowered && !first.backdrop, first);
  J.check("phone: the page fits the 390 px screen (no sideways scroll, no stray '>' text)", first.scrollWidth <= first.innerWidth && first.strayTextNodes === 0, first);
  const chipHits = await underChip(page);
  J.check("phone: the account control covers no other control", chipHits.length === 0, chipHits);
  const cut = await cutOffControls(page);
  J.check("phone: no button or link is cut off at the screen edge", cut.length === 0, { count: cut.length, controls: cut.slice(0, 8) });

  // Paste and open a citation, by tap.
  const r = await pasteSchedule(page, SAMPLE_LINES, { touch });
  J.check("phone: paste matches every line (3 of 3) by tap", r.matched === 3 && r.total === 3, r.first + " (" + r.seconds + " s)");
  const cite = page.locator("#hs-results a[href*='/api/cut-sheets/sheet/'], #hs-results a[href*='/api/cps/catalogues/']").first();
  if (await cite.count()) {
    const want = citedPage(await cite.getAttribute("href"));
    const ref = { since: Date.now(), apiRe: /\/api\/(cut-sheets\/sheet\/[^/]+\/pdf|cps\/catalogues\/[^/]+\/pages\/\d+\/render)$/, popupsBefore: page.__popups.length, downloadsBefore: page.__downloads.length };
    await press(page, cite, { touch });
    const o = await documentOutcome(J, page, ref);
    const fits = await page.evaluate(() => { const c = document.querySelector("#wa-overlay.is-open canvas.wa-pdf-canvas"); const r = c ? c.getBoundingClientRect() : null; return r ? { left: Math.round(r.left), right: Math.round(r.right), innerWidth } : null; });
    J.check("phone: a citation is drawn in place at the cited page, within the screen", o.ok && !o.refused && !o.newTab && o.pdf.drawn && o.pdf.page === want && !!fits && fits.left >= 0 && fits.right <= fits.innerWidth, { want, pdf: o.pdf, fits, newTab: o.newTab });
    if (o.pdf.open) await closeOverlay(page, "close", { touch });
  } else {
    J.check("phone: a citation is drawn in place at the cited page, within the screen", false, "no citation link in the result");
  }

  // WALK THIS SCHEDULE IN SIGHTX, the joystick, [raise dossier].
  const walk = page.locator("#hs-walk");
  if (await walk.isEnabled().catch(() => false)) {
    await press(page, walk, { touch });
    const note = await waitText(page, "#hs-note", /SightX hung \d+ openings|not loaded/i, 60000);
    const hung = Number(((note || "").match(/hung (\d+) openings/i) || [])[1] || 0);
    J.check("phone: WALK THIS SCHEDULE hangs the matched openings and says to walk with the joystick", hung > 0 && /joystick/i.test(note || ""), note);
    await sleep(1500);
    const stick = await page.locator(".weyland-stick").first().boundingBox().catch(() => null);
    const onScreen = !!stick && stick.x >= 0 && stick.y >= 0 && stick.x + stick.width <= 390 && stick.y + stick.height <= 844;
    let moved = null, topAt = null;
    if (onScreen) {
      const cx = stick.x + stick.width / 2, cy = stick.y + stick.height / 2;
      // What a finger on the stick's centre touches first (the host draws the stick above the SightX frame).
      topAt = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); if (!el) return null; const r = el.getBoundingClientRect(); return { element: el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""), box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }; }, [cx, cy]);
      const knob = () => page.evaluate(() => { const k = document.querySelector(".weyland-stick > div"); return k ? getComputedStyle(k).transform : null; }).catch(() => null);
      const before = await knob();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] });
      for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx, y: cy - i * 5 }] }); await sleep(40); }
      await sleep(600);
      const during = await knob();
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(300);
      moved = { before, during, after: await knob() };
      await cdp.detach().catch(() => {});
    }
    J.check("phone: the joystick is on screen and follows a drag from its centre", onScreen && !!moved && !!moved.during && moved.during !== moved.before, { stick, topAtCentre: topAt, moved });
    const raise = page.locator("#envelope-raise");
    if (await raise.isVisible().catch(() => false)) await press(page, raise, { touch });
    await page.waitForFunction(() => !document.documentElement.classList.contains("folder-lowered"), null, { timeout: 8000 }).catch(() => {});
    J.check("phone: [raise dossier] brings the dossier back by tap", !(await page.evaluate(() => document.documentElement.classList.contains("folder-lowered"))));
  } else {
    J.check("phone: WALK THIS SCHEDULE hangs the matched openings and says to walk with the joystick", false, "WALK THIS SCHEDULE IN SIGHTX is not enabled after the paste");
  }

  // PropX GENERATE by tap.
  await page.evaluate(() => { const s = document.getElementById("propx-live-demo"); if (s) s.scrollIntoView({ block: "center" }); });
  await page.fill("#px-client", "User Simulation phone");
  await press(page, "#px-generate-btn", { touch });
  const px = (await waitText(page, "#px-results", /Generated|include|plan|failed|error|Unexpected/i, 45000, /^Pricing the sample/i)) || "";
  J.check("phone: PropX GENERATE prices the sample proposal by tap", /^Generated/i.test(px), px.split("\n")[0]);

  // Sign in, the account card, OPEN SUBX, sign out: all by tap.
  const st = await signIn(page, acct, { touch });
  J.check("phone: sign-in from the account control by tap", st.auth === "signed-in", { auth: st.auth, error: st.error, seconds: st.seconds });
  await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());
  const card = await openAccountCard(page, { touch });
  J.check("phone: the account card shows the account and plan", card.view === "account" && card.overlayText.toLowerCase().includes(acct.email) && /plan\s*subconp/i.test(card.overlayText), card.overlayText.slice(0, 160));
  const open = page.locator("#wa-overlay.is-open button").filter({ hasText: /open subx/i }).first();
  if (await open.count()) {
    await press(page, open, { touch });
    const f = await overlayFrame(page, 25000);
    const ws = f ? await subxWorkspace(f, 25000) : null;
    const fit = f ? await f.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth })).catch(() => null) : null;
    const box = await page.evaluate(() => { const fr = document.querySelector("#wa-overlay.is-open iframe"); const r = fr ? fr.getBoundingClientRect() : null; return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null; });
    J.check("phone: OPEN SUBX opens the workspace signed in, fitting the screen", !!ws && ws.appVisible && ws.accountToken && !!fit && fit.scrollWidth <= fit.innerWidth && !!box && box.w <= 390, { ws: ws && { appVisible: ws.appVisible, token: ws.accountToken, login: ws.loginVisible }, fit, box });
    await closeOverlay(page, "close", { touch });
  }
  await openAccountCard(page, { touch });
  const out = page.locator("#wa-overlay.is-open button").filter({ hasText: /^sign out$/i }).first();
  if (await out.count()) await press(page, out, { touch });
  await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-out", null, { timeout: 15000 }).catch(() => {});
  const after = await shellState(page);
  J.check("phone: sign-out by tap leaves the page signed out", after.auth === "signed-out" && /^sign in$/i.test(after.chip), { auth: after.auth, chip: after.chip });
  await J.checkInPlace(page, mark, "phone: stayed in place: same document, still on weylandai.com");

  // Pricing START HUNTX by tap (last: a hosted checkout would leave the page).
  await page.evaluate(() => { const s = document.getElementById("pricing"); if (s) s.scrollIntoView({ block: "center" }); });
  const buy = page.locator("#pricing a, #pricing button").filter({ hasText: /start huntx/i }).first();
  if (await buy.count()) {
    const popBefore = page.__popups.length;
    await press(page, buy, { touch });
    const form = await findPaymentForm(page, { product: /HuntX/i, price: /\$799(\.00)?\b/ }, 45000);
    const ps = await placeState(page, mark);
    J.check("phone: START HUNTX shows the payment form inside the page (no hop to checkout.stripe.com)", form.where === "embedded" && form.visible && ps.sameDocument && ps.onSite && page.__popups.length === popBefore, { where: form.where, ...ps });
    J.check("phone: the payment form shows HuntX at $799 a month", !!form.product && !!form.price, { where: form.where, text: form.text });
  } else {
    J.check("phone: START HUNTX shows the payment form inside the page (no hop to checkout.stripe.com)", false, "no START HUNTX button in #pricing");
  }
  await ctx.close();
});
