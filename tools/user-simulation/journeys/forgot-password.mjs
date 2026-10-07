// tools/user-simulation/journeys/forgot-password.mjs
//
// Journey map id "forgot-password" (priority 3): a visitor who forgot their password uses
// "Forgot password?" in the sign-in overlay.
// Expected: the request is made from the page, in place, for the email typed, and the page says
// what happens next; with no email typed it asks for one first.
// NO EMAIL IS SENT: the reset request (POST authfor.com/api/v1/password/reset-request) is answered
// inside this browser by the test (page.route) with AuthFor's documented success shape, so nothing
// reaches AuthFor and nobody is mailed. The address is a user-sim-* address registered nowhere.
// Not exercised, for the same reason: the email itself and the reset page it links to (AuthFor's
// code builds https://authfor.com/reset?token=..., a page on authfor.com, not weylandai.com).
// Since 2026-10-07 (fc:shell): the success words are a note, not an error, and when AuthFor answers
// that it could not send (502 {sent:false}) the page says so instead of "on its way".
// No account. Demo clones the homepage creates for the guest are captured and deleted.
//
// Usage: node tools/user-simulation/journeys/forgot-password.mjs   (exit 0 = all passed)
import { Journey, openHome, raiseDossier, setMark, press, until, sleep, shellState } from "../lib/journey-kit.mjs";

const J = new Journey("forgot-password", "Forgot password");
const RESET = "https://authfor.com/api/v1/password/reset-request";

await J.run(async () => {
  await J.launch();
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  // Answer the reset request in this browser: it never reaches AuthFor, so no email is sent.
  const sent = [];
  let failNext = false;
  await ctx.route(RESET, async (route) => {
    const req = route.request();
    const cors = { "Access-Control-Allow-Origin": "https://weylandai.com", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    let body = {};
    try { body = JSON.parse(req.postData() || "{}"); } catch (e) { body = {}; }
    sent.push({ method: req.method(), email: body.email || null, venture: body.client_id || body.venture_id || null });
    if (failNext) { failNext = false; return route.fulfill({ status: 502, headers: cors, contentType: "application/json", body: JSON.stringify({ error: "The email could not be sent. Try again in a minute.", code: "EMAIL_SEND_FAILED", sent: false }) }); }
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ sent: true, brand: "weylandai" }) });
  });
  await openHome(page, J);
  await raiseDossier(page);
  const mark = await setMark(page);

  await press(page, "#wa-account-chip");
  await page.waitForSelector("#weyland-signin-email", { state: "visible", timeout: 10000 }).catch(() => {});
  const forgot = page.locator("#wa-overlay.is-open button, #wa-overlay.is-open a").filter({ hasText: /forgot password/i }).first();
  J.check("the sign-in overlay offers 'Forgot password?'", (await forgot.count()) > 0, await page.evaluate(() => ((document.querySelector("#wa-overlay.is-open .wa-body") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 200)));
  if (!(await forgot.count())) return;

  // No email typed: the page asks for it, nothing is sent.
  await page.fill("#weyland-signin-email", "");
  await press(page, forgot);
  await sleep(600);
  const first = await shellState(page);
  J.check("with no email typed, it asks for the email first and sends nothing", /type your email above first/i.test(first.error) && sent.length === 0, { message: first.error, requests: sent.length });

  // Email typed: one request for exactly that address, and the page says what happens next.
  const email = J.unregisteredEmail("forgot");
  await page.fill("#weyland-signin-email", email);
  await press(page, forgot);
  const note = () => page.evaluate(() => { const n = document.querySelector("#wa-overlay.is-open .wa-note"); return n && n.style.display !== "none" ? n.textContent.trim() : ""; });
  await until(async () => sent.length > 0 && /reset link is on its way/i.test(await note()), 8000, 300);
  const second = await shellState(page);
  const said = await note();
  J.check("with the email typed, one reset request goes out for exactly that email, naming WeylandAI", sent.length === 1 && sent[0].method === "POST" && sent[0].email === email && !!sent[0].venture, sent);
  J.check("the page says a reset link is on its way, without saying whether the account exists", /if that email has an account, a reset link is on its way/i.test(said) && !second.error, { note: said, error: second.error });

  // AuthFor could not send: the page says so, never "on its way".
  failNext = true;
  await press(page, forgot);
  await until(async () => sent.length > 1 && /could not be sent/i.test((await shellState(page)).error), 8000, 300);
  const third = await shellState(page);
  J.check("when AuthFor reports the email could not be sent, the page says so", sent.length === 2 && /could not be sent/i.test(third.error) && !/on its way/i.test(await note()), { error: third.error, note: await note() });
  J.check("it all happens in the sign-in overlay (the form is still there to sign in)", second.overlayOpen && second.view === "signin" && (await page.locator("#weyland-signin-email").isVisible().catch(() => false)), { overlayOpen: second.overlayOpen, view: second.view });
  J.note("not_exercised", "the reset email and the page it links to (https://authfor.com/reset?token=..., per AuthFor's code) - exercising them sends an email");
  J.note("reset_requests_answered_locally", sent.length);
  await page.evaluate(() => window.WeylandShell.close());
  await J.checkInPlace(page, mark);
  await ctx.close();
});
