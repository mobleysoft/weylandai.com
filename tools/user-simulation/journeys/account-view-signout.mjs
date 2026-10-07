// tools/user-simulation/journeys/account-view-signout.mjs
//
// Journey map id "account-view-signout" (priority 2): a signed-in visitor (a trial account) opens
// the account card from the account control, opens SubX from it, and signs out.
// Expected: the card shows the right account and plan (and when the trial ends); OPEN SUBX opens
// the workspace in the overlay, signed in; sign-out happens in place, the control goes back to
// "Sign in", and the server session is gone.
// Throwaway account (trial row: starter / trial / 14 days); rows and demo clones deleted in finally.
//
// Usage: node tools/user-simulation/journeys/account-view-signout.mjs   (exit 0 = all passed)
import { Journey, d1, q, openHome, raiseDossier, setMark, press, until, sleep, signIn, shellState, openAccountCard, overlayFrame, subxWorkspace, serverSession, ALL_PRODUCTS } from "../lib/journey-kit.mjs";

const J = new Journey("account-view-signout", "Account view and sign-out");

await J.run(async () => {
  await J.launch();
  const acct = await J.account("account", { tier: "starter", status: "trial", products: ALL_PRODUCTS, trialDays: 14 });
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);
  const st = await signIn(page, acct);
  J.check("the visitor signs in with the account control", st.auth === "signed-in" && st.user === acct.email, { auth: st.auth, user: st.user, error: st.error, seconds: st.seconds });
  await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());
  J.check("the account control names the account", /user-sim-account-/i.test(st.chip || (await shellState(page)).chip), (await shellState(page)).chip);

  const card = await openAccountCard(page);
  const t = card.overlayText;
  J.check("the account card opens in place from the account control", card.view === "account" && card.overlayOpen, { view: card.view, title: card.overlayTitle });
  J.check("the card shows who is signed in", t.toLowerCase().includes("signed in as " + acct.email), t.slice(0, 200));
  J.check("the card shows the plan and when the trial ends", /plan\s*starter \(trial\)/i.test(t) && /trial ends\s*\d{4}-\d{2}-\d{2}/i.test(t), t.slice(0, 200));
  const buttons = await page.evaluate(() => Array.from(document.querySelectorAll("#wa-overlay.is-open button")).filter((b) => b.offsetParent !== null).map((b) => b.innerText.trim()));
  J.check("the card offers OPEN SUBX, Back to the site and Sign out", ["open subx", "back to the site", "sign out"].every((x) => buttons.some((b) => b.toLowerCase() === x)), buttons);

  const open = page.locator("#wa-overlay.is-open button").filter({ hasText: /open subx/i }).first();
  if (await open.count()) {
    await press(page, open);
    const f = await overlayFrame(page, 25000);
    const ws = f ? await subxWorkspace(f) : null;
    J.check("OPEN SUBX opens the workspace in the overlay, signed in", !!ws && ws.path === "/subx-app" && ws.appVisible && ws.accountToken && !ws.loginVisible, ws);
    await page.evaluate(() => window.WeylandShell.close());
  }

  // Sign out from the card.
  await openAccountCard(page);
  const out = page.locator("#wa-overlay.is-open button").filter({ hasText: /^sign out$/i }).first();
  if (await out.count()) await press(page, out);
  await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-out", null, { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  const after = await shellState(page);
  J.check("sign-out leaves the page signed out and the control says 'Sign in'", after.auth === "signed-out" && /^sign in$/i.test(after.chip) && !after.overlayOpen, { auth: after.auth, chip: after.chip, overlayOpen: after.overlayOpen });
  const sv = await serverSession(page);
  J.check("sign-out ends the server session and clears the token", !sv.valid && !sv.token && sv.me !== 200, sv);
  const [rows] = await d1("SELECT COUNT(*) AS n FROM weyland_sessions WHERE lower(email) = " + q(acct.email) + ";");
  const live = ((rows.results || [])[0] || {}).n;
  J.check("no server session row remains for the account", live === 0, "weyland_sessions rows=" + live);
  await J.checkInPlace(page, mark);
  await ctx.close();
});
