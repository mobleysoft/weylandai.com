// tools/user-simulation/journeys/account-view-signout.mjs
//
// Journey map id "account-view-signout" (priority 2): a signed-in visitor (a trial account) opens
// the account card from the account control, opens SubX from it, and signs out.
// Expected: the card shows the right account and plan (and when the trial ends, with the days
// left); OPEN SUBX opens the workspace in the overlay, signed in; sign-out happens in place, the
// control goes back to "Sign in", and the server session is gone. Since 2026-10-07 (fc:shell): a
// page's own sign-out (WeylandShell.signOut(), as SubX's and TakeOffX's SIGN OUT call it) no longer
// closes a sign-in view the visitor opened while the logout calls were still out.
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
  J.check("the card shows the plan and when the trial ends, with the days left", /plan\s*free trial/i.test(t) && /trial ends\s*(mon|tues|wednes|thurs|fri|satur|sun)day, \w+ \d{1,2}, \d{4} \(1[34] days left\)/i.test(t), t.slice(0, 260));
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

  // A page's own sign-out (product pages call WeylandShell.signOut()) and, at once, the account
  // control: the sign-in view it opens must still be open after the logout calls have answered.
  // Both in the same moment (the account control pressed while the logout calls are still out),
  // so the check never depends on how fast AuthFor answers.
  const raceOpenedAt = await page.evaluate(() => {
    let finished = false;
    window.__waSignOut = window.WeylandShell.signOut().then(() => { finished = true; });
    document.getElementById("wa-account-chip").click();
    return { view: window.WeylandShell.state().view, beforeSignOutFinished: !finished };
  });
  await page.evaluate(() => window.__waSignOut).catch(() => null);
  await sleep(1200);
  const race = await shellState(page);
  J.check("a sign-in view opened while sign-out was still running stays open after it finishes", raceOpenedAt.view === "signin" && raceOpenedAt.beforeSignOutFinished && race.overlayOpen && race.view === "signin", { opened: raceOpenedAt, overlayOpen: race.overlayOpen, view: race.view, auth: race.auth });
  await page.evaluate(() => window.WeylandShell.close());
  const again = await signIn(page, acct);
  J.check("the visitor signs in again", again.auth === "signed-in" && again.user === acct.email, { auth: again.auth, error: again.error });
  await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());

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
