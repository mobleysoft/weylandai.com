// tools/user-simulation/journeys/reset-in-page.mjs
//
// Password reset inside WeylandAI (fc:shell + fc:identity, 2026-10-07): the emailed link is
// https://weylandai.com/#/reset?token=<64 hex>, which opens "Choose a new password" over the
// homepage (no page hop), saves it through AuthFor's reset-confirm and lands signed in on the
// account card. The token is the one AuthFor's own API issued: the journey registers a throwaway
// AuthFor account on one of John's aliases (jmobleyworks+wa-reset-<run>@gmail.com, the only
// addresses tests may mail), asks AuthFor's reset-request for it (one real email goes to that alias),
// and reads the token AuthFor stored for that account (KV reset:user:<id>) instead of the inbox.
// Expected: the view opens and drops the token from the address; a short password and two that
// differ are refused in the page; SAVE AND SIGN IN signs in as the account, in the same document; the
// new password signs in from a second browser; the old one no longer does; the link works once.
// Throwaway rows: a WeylandAI users row (usersim_reset_<run>, the alias) with its sessions and nodes
// row, deleted in finally. The AuthFor identity stays at AuthFor (it cannot be deleted from here).
//
// Usage: node tools/user-simulation/journeys/reset-in-page.mjs   (exit 0 = all passed)
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Journey, BASE, d1, q, setMark, press, until, sleep, shellState, serverSession, signIn, raiseDossier, ALL_PRODUCTS } from "../lib/journey-kit.mjs";

const execFileP = promisify(execFile);
const J = new Journey("reset-in-page", "Password reset inside the page");
const ALIAS = "jmobleyworks+wa-reset-" + J.suffix + "@gmail.com";
const AUTHFOR_KV = "b8dd096a7b504403986f888a928ad17c"; // authfor.com/wrangler.toml AUTHFOR_KV
const REPO = new URL("../../../", import.meta.url).pathname;

async function authfor(path, body) {
  const r = await fetch("https://authfor.com" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { status: r.status, d };
}

let userId = null;
const kitCleanup = J.cleanup.bind(J);
J.cleanup = async () => {
  await kitCleanup();
  if (userId) { try { await d1("DELETE FROM nodes WHERE id = " + q(userId) + " OR lower(email) = " + q(ALIAS) + ";"); } catch (e) {} }
};

await J.run(async () => {
  await J.launch();
  const oldPassword = "Us!" + randomBytes(12).toString("base64url");
  const newPassword = "Nw!" + randomBytes(12).toString("base64url");
  J.secrets.push(oldPassword, newPassword);

  // The throwaway account: AuthFor identity (registration sends no mail) and a WeylandAI row.
  const reg = await authfor("/api/v1/register", { email: ALIAS, password: oldPassword, name: "User Simulation (reset-in-page)" });
  const afId = reg.d && reg.d.user && reg.d.user.id;
  if (reg.status >= 300 || !afId) throw new Error("AuthFor register failed: " + reg.status + " " + J.scrub(JSON.stringify(reg.d)).slice(0, 160));
  userId = "usersim_reset_" + J.suffix;
  J.accounts.push({ label: "reset", email: ALIAS, userId, usersRow: true });
  const [ins] = await d1("INSERT INTO users (id, email, name, tenant_id, subscription_tier, subscription_status, submittals_used, submittals_limit, products_enabled, trial_ends_at) VALUES (" +
    [userId, ALIAS, "User Simulation Harness (reset-in-page)", "ven_weyland", "starter", "trial"].map(q).join(",") + ",0,999," + q(ALL_PRODUCTS) + ",datetime('now','+14 days'));");
  if (!ins || !ins.success) throw new Error("users insert failed");

  // AuthFor's own API issues the token (and mails the link to the alias).
  const req = await authfor("/api/v1/password/reset-request", { email: ALIAS, client_id: "af_weyland_login", venture_id: "weylandai.com" });
  J.check("AuthFor's reset-request answers sent, with WeylandAI's mail", req.status === 200 && req.d.sent === true && req.d.brand === "weylandai", { status: req.status, sent: req.d.sent, brand: req.d.brand });
  let token = "";
  for (let i = 0; i < 5 && !token; i++) {
    try {
      const { stdout } = await execFileP("npx", ["wrangler", "kv", "key", "get", "reset:user:" + afId, "--namespace-id", AUTHFOR_KV, "--remote"], { cwd: REPO, maxBuffer: 1024 * 1024 });
      token = String(stdout || "").trim();
    } catch (e) { await sleep(1500); }
  }
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error("the issued reset token could not be read back (" + token.length + " chars)");
  J.secrets.push(token);
  J.check("the token AuthFor issued was read back from its store", true, "64 hex");

  // The emailed link, as the alias's owner would follow it.
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  await page.goto(BASE + "/?journey=" + J.id + "-" + J.suffix + "#/reset?token=" + token, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => !!window.WeylandShell && window.WeylandShell.state().view === "reset", null, { timeout: 20000 }).catch(() => {});
  const mark = await setMark(page);
  const opened = await page.evaluate(() => ({
    view: window.WeylandShell && window.WeylandShell.state().view,
    title: ((document.querySelector("#wa-overlay.is-open .wa-title") || {}).textContent || "").trim(),
    fields: ["weyland-reset-email", "weyland-reset-password", "weyland-reset-password2", "weyland-reset-submit"].map((id) => !!document.getElementById(id)),
    address: location.href
  }));
  J.check("the link opens 'Choose a new password' over the homepage", opened.view === "reset" && /choose a new password/i.test(opened.title) && opened.fields.every(Boolean), opened);
  J.check("the token is gone from the address at once", !/token=|[0-9a-f]{64}/.test(opened.address), opened.address.replace(/[0-9a-f]{64}/g, "<token>"));

  // Refused in the page, nothing sent: too short, then two different passwords.
  await page.fill("#weyland-reset-email", ALIAS);
  await page.fill("#weyland-reset-password", "short");
  await page.fill("#weyland-reset-password2", "short");
  await press(page, "#weyland-reset-submit");
  await sleep(400);
  const tooShort = await shellState(page);
  await page.fill("#weyland-reset-password", newPassword);
  await page.fill("#weyland-reset-password2", newPassword + "x");
  await press(page, "#weyland-reset-submit");
  await sleep(400);
  const differ = await shellState(page);
  J.check("a password under 8 characters and two that differ are refused in the page", /at least 8/i.test(tooShort.error) && /different/i.test(differ.error), { short: tooShort.error, differ: differ.error });

  // Save: signed in as the account, on the account card, same document.
  await page.fill("#weyland-reset-password2", newPassword);
  const confirmP = page.waitForResponse((r) => /authfor\.com\/api\/v1\/password\/reset-confirm$/.test(r.url().split("?")[0]) && r.request().method() === "POST", { timeout: 30000 }).catch(() => null);
  await press(page, "#weyland-reset-submit");
  const confirm = await confirmP;
  await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-in" && window.WeylandShell.state().view === "account", null, { timeout: 45000 }).catch(() => {});
  const after = await shellState(page);
  J.check("SAVE AND SIGN IN saves the password at AuthFor and signs in as the account", !!confirm && confirm.status() === 200 && after.auth === "signed-in" && after.user === ALIAS, { status: confirm && confirm.status(), auth: after.auth, user: after.user, error: after.error });
  J.check("the account card says the password is saved and who is signed in", after.view === "account" && /new password is saved/i.test(after.overlayText) && after.overlayText.toLowerCase().includes(ALIAS), after.overlayText.slice(0, 260));
  const sv = await serverSession(page);
  J.check("the WeylandAI server session is the account's", sv.valid && sv.email === ALIAS, sv);
  await J.checkInPlace(page, mark, "the reset happened in place: same document, still on weylandai.com");

  // The same link again: refused in words.
  await page.evaluate((t) => { window.WeylandShell.open("reset", { token: t, email: "" }); }, token);
  await page.fill("#weyland-reset-password", newPassword);
  await page.fill("#weyland-reset-password2", newPassword);
  await press(page, "#weyland-reset-submit");
  await until(async () => (await shellState(page)).error, 15000, 300);
  const twice = await shellState(page);
  J.check("the link works once: used again, the page says it has expired or was used", /expired or was already used/i.test(twice.error), twice.error);
  await page.evaluate(() => window.WeylandShell.close());
  await ctx.close();

  // The new password signs in from another browser; the old one does not.
  const ctx2 = await J.context("desktop");
  const p2 = await J.page(ctx2);
  await p2.goto(BASE + "/?journey=" + J.id + "-b-" + J.suffix, { waitUntil: "load", timeout: 60000 });
  await p2.waitForFunction(() => !!window.WeylandShell && !!document.getElementById("wa-account-chip"), null, { timeout: 20000 }).catch(() => {});
  await raiseDossier(p2);
  const oldTry = await authfor("/api/v1/login", { email: ALIAS, password: oldPassword, client_id: "af_weyland_login" });
  J.check("the old password no longer signs in (AuthFor 401)", oldTry.status === 401, { status: oldTry.status, code: oldTry.d.code });
  const st2 = await signIn(p2, { email: ALIAS, password: newPassword });
  J.check("the new password signs in from a second browser", st2.auth === "signed-in" && st2.user === ALIAS, { auth: st2.auth, user: st2.user, error: st2.error });
  await p2.evaluate(() => window.WeylandShell && window.WeylandShell.signOut());
  await ctx2.close();
});
