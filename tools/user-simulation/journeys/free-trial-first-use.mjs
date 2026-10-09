// tools/user-simulation/journeys/free-trial-first-use.mjs
//
// Journey map id "free-trial-first-use" (priority 1): a visitor with a brand-new free-trial account
// uses the suite on the homepage.
// Expected: the trial unlocks the suite, at the very least everything a guest could already do
// (paste, hero RUN IT LIVE, CutsheetX TRY A REAL MATCH, PropX GENERATE, HuntX), and the account
// card shows the trial; all in place.
// The trial is created the real way: a throwaway AuthFor identity (no users row) signs in with the
// account control and starts the trial the page offers (POST /api/auth/authfor-exchange). Rows for
// that email and every demo clone are deleted in finally.
//
// Usage: node tools/user-simulation/journeys/free-trial-first-use.mjs   (exit 0 = all passed)
import { Journey, d1, q, openHome, raiseDossier, setMark, press, waitText, until, sleep, shellState, signIn, pasteSchedule, openAccountCard, overlayFrame, subxWorkspace, SAMPLE_LINES } from "../lib/journey-kit.mjs";

const J = new Journey("free-trial-first-use", "A new free-trial account uses the suite");
const NOT_ALLOWED = /include|plan|402|denied|upgrade|unauthor|not enabled|failed|error/i;

await J.run(async () => {
  await J.launch();
  const acct = await J.account("trial", { usersRow: false });
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  // Sign in with the new identity; the page offers the free trial when no WeylandAI account exists.
  let st = await signIn(page, acct);
  J.note("sign_in", { auth: st.auth, view: st.view, overlay: st.overlayText.slice(0, 160), seconds: st.seconds });
  if (st.auth !== "signed-in") {
    const start = page.locator("#wa-overlay.is-open button").filter({ hasText: /free\s*14-day trial|start my free/i }).first();
    if (await start.count()) {
      await press(page, start);
      await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-in" || !!((document.querySelector("#wa-overlay .wa-error") || {}).offsetParent), null, { timeout: 45000 }).catch(() => {});
      await sleep(1000);
      st = await shellState(page);
    }
  }
  J.check("the new visitor starts a free trial and is signed in", st.auth === "signed-in" && st.user === acct.email, { auth: st.auth, user: st.user, view: st.view, error: st.error });
  const [row] = await d1("SELECT subscription_tier, subscription_status, substr(trial_ends_at,1,10) AS trial_ends, products_enabled FROM users WHERE lower(email) = " + q(acct.email) + ";");
  const user = (row.results || [])[0] || null;
  J.note("users_row", user);
  J.check("a trial account row exists", !!user && /trial/i.test(String(user.subscription_status) + String(user.subscription_tier)), user || "no users row");
  await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());

  // Everything a guest could do, now as the trial account.
  const paste = await pasteSchedule(page, SAMPLE_LINES);
  J.check("trial: paste matches every line (3 of 3)", paste.matched === 3 && paste.total === 3, paste.first);

  await press(page, "#hm-run");
  const hm = await waitText(page, "#hm-note", /Live result|Matcher returned|failed|no match/i, 30000, /^Running against/i);
  J.check("trial: hero RUN IT LIVE shows a live result", /Live result just now/i.test(hm || ""), hm);

  await page.fill("#cx-mfr", "LCN");
  await page.fill("#cx-model", "4040XP");
  await press(page, "#cx-match-btn");
  const cx = await waitText(page, "#cx-match-results", /Matched|No match|include|plan|failed|error/i, 30000, /^Matching against/i);
  J.check("trial: CutsheetX TRY A REAL MATCH (LCN 4040XP) matches", /^Matched/i.test(cx || "") && !NOT_ALLOWED.test((cx || "").split("\n")[0]), (cx || "").split("\n")[0]);

  await page.fill("#px-client", "User Simulation trial");
  await press(page, "#px-generate-btn");
  const px = await waitText(page, "#px-results", /Generated|include|plan|failed|error|Unexpected/i, 45000, /^Pricing the sample/i);
  J.check("trial: PropX GENERATE prices the sample proposal", /^Generated/i.test(px || ""), (px || "").split("\n")[0]);

  await press(page, "#hx-refresh-btn");
  const hx = await waitText(page, "#hx-status", /notices|no notices|Couldn't|include|plan/i, 30000, /^Loading/i);
  J.check("trial: the HuntX chapter loads the opportunity index", /\d+ notices/i.test(hx || ""), hx);

  // The account card shows the trial; OPEN SUBX opens the workspace signed in.
  const card = await openAccountCard(page);
  J.check("trial: the account card shows the plan and when the trial ends", card.view === "account" && /trial/i.test(card.overlayText) && /trial ends\s*(mon|tues|wednes|thurs|fri|satur|sun)day, \w+ \d{1,2}, \d{4} \(\d+ days? left\)/i.test(card.overlayText), card.overlayText);
  const open = page.locator("#wa-overlay.is-open button").filter({ hasText: /open subx/i }).first();
  if (await open.count()) {
    await press(page, open);
    const f = await overlayFrame(page, 25000);
    const ws = f ? await subxWorkspace(f) : null;
    J.check("trial: OPEN SUBX opens the workspace in the overlay, signed in", !!ws && ws.path === "/subx-app" && ws.appVisible && ws.accountToken && !NOT_ALLOWED.test(ws.sessions), ws);
    await page.evaluate(() => window.WeylandShell.close());
  } else {
    J.check("trial: OPEN SUBX opens the workspace in the overlay, signed in", false, "no OPEN SUBX on the account card: " + card.overlayText);
  }
  await J.checkInPlace(page, mark);
  await ctx.close();
});
