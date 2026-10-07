// tools/user-simulation/journeys/code-sign-in.mjs
//
// Sign in by emailed code (fc:shell + fc:identity, 2026-10-07): the sign-in view offers "Email me
// a sign-in code" beside the password. A REAL code is sent, to one of John's own test aliases
// (jmobleyworks+wa-code-<run>@gmail.com, the only addresses tests may mail), and the journey reads
// AuthFor's API answer: sent:true, WeylandAI's brand, an 8-digit code, 15 minutes, a request id and
// no code in the answer. The page moves to the code step and names the address; a wrong code is
// refused in words with the tries left (AuthFor's 401 CODE_INVALID); "Send a new code" waits for
// AuthFor's resend_after. A browser that bought without a password opens the sign-in on the code,
// prefilled with that email.
// The code itself is only in the email, so by default the journey stops there. With
// CODE_FILE=<path> it waits (up to 10 minutes) for the code to be written into that file by whoever
// reads the alias's inbox, then signs in with it: signed in, the account card, sign-out, and the
// next sign-in on this browser opens on the code.
// Throwaway rows only: with CODE_FILE a WeylandAI users row (usersim_code_<run>, the alias email) is
// made first and deleted in finally with its sessions; the AuthFor identity a first code sign-in
// creates stays at AuthFor (it cannot be deleted from here).
//
// Usage: node tools/user-simulation/journeys/code-sign-in.mjs   (exit 0 = all passed)
import { existsSync, readFileSync } from "node:fs";
import { Journey, d1, q, openHome, raiseDossier, setMark, press, until, sleep, shellState, serverSession, openAccountCard, ALL_PRODUCTS } from "../lib/journey-kit.mjs";

const J = new Journey("code-sign-in", "Sign in with an emailed code");
const ALIAS = "jmobleyworks+wa-code-" + J.suffix + "@gmail.com";
const CODE_FILE = process.env.CODE_FILE || "";
const MAGIC = /authfor\.com\/api\/v1\/auth\/magic-link$/;
const VERIFY = /authfor\.com\/api\/v1\/auth\/magic-link\/verify$/;

let userId = null;
// nodes rows are keyed by the users id (POST /api/auth/session); the kit deletes the users row and
// its sessions, this deletes the nodes row too.
const kitCleanup = J.cleanup.bind(J);
J.cleanup = async () => {
  await kitCleanup();
  if (userId) { try { await d1("DELETE FROM nodes WHERE id = " + q(userId) + " OR lower(email) = " + q(ALIAS.toLowerCase()) + ";"); } catch (e) {} }
};
await J.run(async () => {
  await J.launch();
  if (CODE_FILE) {
    userId = "usersim_code_" + J.suffix;
    J.accounts.push({ label: "code", email: ALIAS, userId, usersRow: true });
    const [res] = await d1("INSERT INTO users (id, email, name, tenant_id, subscription_tier, subscription_status, submittals_used, submittals_limit, products_enabled, trial_ends_at) VALUES (" +
      [userId, ALIAS, "User Simulation Harness (code-sign-in)", "ven_weyland", "starter", "trial"].map(q).join(",") + ",0,999," + q(ALL_PRODUCTS) + ",datetime('now','+14 days'));");
    if (!res || !res.success) throw new Error("users insert failed");
  }
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  // A browser that bought without a password: the sign-in opens on the code, prefilled.
  await page.evaluate((em) => localStorage.setItem("wa_signin_hint_v1", JSON.stringify({ email: em, mode: "code", at: Date.now() })), ALIAS);
  await press(page, "#wa-account-chip");
  await page.waitForSelector("#weyland-signin-email", { state: "visible", timeout: 10000 }).catch(() => {});
  const hinted = await page.evaluate(() => ({
    email: (document.getElementById("weyland-signin-email") || {}).value || "",
    passwordShown: !!(document.getElementById("weyland-signin-password") || {}).offsetParent,
    sendShown: !!(document.getElementById("weyland-signin-code-send") || {}).offsetParent,
    sendText: ((document.getElementById("weyland-signin-code-send") || {}).innerText || "").trim()
  }));
  J.check("a browser that bought without a password opens the sign-in on the code, prefilled", hinted.email === ALIAS && !hinted.passwordShown && hinted.sendShown && /email me a sign-in code/i.test(hinted.sendText), hinted);
  await page.evaluate(() => { localStorage.removeItem("wa_signin_hint_v1"); window.WeylandShell.close(); });

  // A visitor with no hint: password and the code side by side.
  await press(page, "#wa-account-chip");
  await page.waitForSelector("#weyland-signin-email", { state: "visible", timeout: 10000 }).catch(() => {});
  const plain = await page.evaluate(() => ({
    passwordShown: !!(document.getElementById("weyland-signin-password") || {}).offsetParent,
    sendShown: !!(document.getElementById("weyland-signin-code-send") || {}).offsetParent
  }));
  J.check("the sign-in view offers 'Email me a sign-in code' beside the password", plain.passwordShown && plain.sendShown, plain);

  // The real code request, to John's alias.
  await page.fill("#weyland-signin-email", ALIAS);
  const answerP = page.waitForResponse((r) => MAGIC.test(r.url().split("?")[0]) && r.request().method() === "POST", { timeout: 30000 }).catch(() => null);
  await press(page, "#weyland-signin-code-send");
  const answer = await answerP;
  let body = {}, sentBody = {};
  try { body = answer ? await answer.json() : {}; } catch (e) { body = {}; }
  try { sentBody = answer ? JSON.parse(answer.request().postData() || "{}") : {}; } catch (e) { sentBody = {}; }
  J.note("magic_link_answer", { status: answer && answer.status(), body: { ...body, token: body.token ? "<request id>" : body.token, request_id: body.request_id ? "<request id>" : body.request_id } });
  J.check("the page asks AuthFor for a code for exactly that email, naming WeylandAI", sentBody.email === ALIAS && (sentBody.client_id === "af_weyland_login" || sentBody.venture_id === "weylandai.com"), { email: sentBody.email, client_id: sentBody.client_id, venture_id: sentBody.venture_id, purpose: sentBody.purpose });
  J.check("AuthFor's answer: sent, WeylandAI's mail, an 8-digit code for 15 minutes, a request id and no code", !!answer && answer.status() === 200 && body.sent === true && body.brand === "weylandai" && body.code_length === 8 && body.expires_in === 900 && !!body.token && !("code" in body), { status: answer && answer.status(), sent: body.sent, brand: body.brand, code_length: body.code_length, expires_in: body.expires_in, resend_after: body.resend_after });
  await until(() => page.evaluate(() => !!(document.getElementById("weyland-signin-code") || {}).offsetParent), 8000, 250);
  const step = await page.evaluate(() => ({
    codeShown: !!(document.getElementById("weyland-signin-code") || {}).offsetParent,
    note: ((document.querySelector("#wa-overlay.is-open .wa-note") || {}).textContent || "").trim(),
    resendDisabled: (Array.from(document.querySelectorAll("#wa-overlay.is-open .wa-link")).find((b) => /send a new code/i.test(b.textContent)) || {}).disabled === true,
    emailLocked: !!(document.getElementById("weyland-signin-email") || {}).disabled
  }));
  J.check("the page moves to the code step and says where the code went", step.codeShown && step.note.includes(ALIAS) && /15 minutes/.test(step.note), step);
  J.check("'Send a new code' waits while AuthFor would refuse another (resend_after)", step.resendDisabled, step);

  // A wrong code: AuthFor's 401 CODE_INVALID, said in words with the tries left. (1 in 10^8 that it is right.)
  const vP = page.waitForResponse((r) => VERIFY.test(r.url().split("?")[0]) && r.request().method() === "POST", { timeout: 30000 }).catch(() => null);
  await page.fill("#weyland-signin-code", "0000 0000");
  await press(page, "#weyland-signin-code-submit");
  const v = await vP;
  let vb = {};
  try { vb = v ? await v.json() : {}; } catch (e) { vb = {}; }
  await until(async () => (await shellState(page)).error, 8000, 250);
  const wrong = await shellState(page);
  J.check("a wrong code is refused by AuthFor (401 CODE_INVALID) and the page says so with the tries left", !!v && v.status() === 401 && vb.code === "CODE_INVALID" && /does not match/i.test(wrong.error) && /\d+ tr(y|ies) left/i.test(wrong.error) && wrong.auth !== "signed-in",
    { status: v && v.status(), code: vb.code, attempts_left: vb.attempts_left, error: wrong.error, auth: wrong.auth });

  if (!CODE_FILE) {
    J.note("not_exercised", "a successful code sign-in: the code is only in the email to " + ALIAS + " (set CODE_FILE to finish with it)");
  } else {
    // Whoever reads the alias's inbox writes the code into CODE_FILE.
    console.log("waiting for the code sent to " + ALIAS + " in " + CODE_FILE);
    const code = await until(async () => { if (!existsSync(CODE_FILE)) return null; const c = readFileSync(CODE_FILE, "utf8").replace(/\D+/g, ""); return c.length === 8 ? c : null; }, 10 * 60 * 1000, 2000);
    J.check("the emailed code was read from the alias's inbox", !!code, CODE_FILE);
    if (code) {
      J.secrets.push(code);
      await page.fill("#weyland-signin-code", code);
      const okP = page.waitForResponse((r) => VERIFY.test(r.url().split("?")[0]) && r.request().method() === "POST", { timeout: 30000 }).catch(() => null);
      await press(page, "#weyland-signin-code-submit");
      const ok = await okP;
      let okb = {};
      try { okb = ok ? await ok.json() : {}; } catch (e) { okb = {}; }
      await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-in", null, { timeout: 45000 }).catch(() => {});
      const st = await shellState(page);
      J.check("the right code signs the visitor in, in place", !!ok && ok.status() === 200 && !!okb.token && st.auth === "signed-in" && st.user === ALIAS.toLowerCase(), { status: ok && ok.status(), email_verified: okb.user && okb.user.email_verified, new_account: okb.new_account, auth: st.auth, user: st.user, error: st.error });
      const sv = await serverSession(page);
      J.check("the WeylandAI server session belongs to the alias", sv.valid && sv.email === ALIAS.toLowerCase(), sv);
      await page.evaluate(() => window.WeylandShell && window.WeylandShell.close());
      const card = await openAccountCard(page);
      J.check("the account card opens for the alias", card.view === "account" && card.overlayText.toLowerCase().includes(ALIAS.toLowerCase()), card.overlayText.slice(0, 200));
      const out = page.locator("#wa-overlay.is-open button").filter({ hasText: /^sign out$/i }).first();
      if (await out.count()) await press(page, out);
      await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-out", null, { timeout: 15000 }).catch(() => {});
      await sleep(800);
      await press(page, "#wa-account-chip");
      await page.waitForSelector("#weyland-signin-email", { state: "visible", timeout: 10000 }).catch(() => {});
      const next = await page.evaluate(() => ({ email: (document.getElementById("weyland-signin-email") || {}).value || "", passwordShown: !!(document.getElementById("weyland-signin-password") || {}).offsetParent }));
      J.check("after a code sign-in, this browser's next sign-in opens on the code for that email", next.email === ALIAS.toLowerCase() && !next.passwordShown, next);
      await page.evaluate(() => window.WeylandShell.close());
    }
  }
  await J.checkInPlace(page, mark);
  await ctx.close();
});

