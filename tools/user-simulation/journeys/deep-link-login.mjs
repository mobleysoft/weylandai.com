// tools/user-simulation/journeys/deep-link-login.mjs
//
// Journey map id "deep-link-login" (priority 3): a visitor arrives from a shared link - a product
// page, a workspace link, a MeetingX room link, or a /login?redirect=<app> link - is not signed in,
// signs in from there, and should end up working in the product they came for.
// Expected: signed in and inside the requested product; the sign-in happens where the visitor is
// (standing order: no page hop ever, for anything). Each case counts the documents the browser
// loads from arrival to working in the product: 1 means everything happened in place.
// Cases: /subx (the workspace since 82aea46; START A SUBMITTAL before), /subx-app (SIGN IN), /meetingx?room=<new id> (JOIN ROOM, then
// SIGN IN TO JOIN: sign-in in place over the room, 2026-10-07 8fbb52d), /login?redirect=/propx-app
// and /login?redirect=/huntx.
// One throwaway SubConP account; its rows and any demo clones are deleted in finally. The MeetingX
// room is a random id (Durable Object state, nothing stored in D1).
//
// Usage: node tools/user-simulation/journeys/deep-link-login.mjs   (exit 0 = all passed)
import { Journey, BASE, setMark, placeState, press, pressIn, until, sleep, waitText, waitSignInOutcome, shellState, overlayFrame, frameInfo, subxWorkspace } from "../lib/journey-kit.mjs";

const J = new Journey("deep-link-login", "Arriving on a product page and signing in from it");

// Fills the shell's sign-in form wherever the current document shows it.
async function signInHere(page, acct, ms = 20000) {
  const shown = await page.waitForSelector("#weyland-signin-email", { state: "visible", timeout: ms }).then(() => true).catch(() => false);
  if (!shown) return { shown: false };
  await page.fill("#weyland-signin-email", acct.email);
  await page.fill("#weyland-signin-password", acct.password);
  const t0 = Date.now();
  await press(page, "#weyland-signin-submit");
  await waitSignInOutcome(page, 90000);
  const st = await shellState(page).catch(() => ({}));
  return { shown: true, auth: st.auth, error: st.error, seconds: Math.round((Date.now() - t0) / 100) / 10 };
}

async function arrive(path) {
  const ctx = await J.context("desktop");
  const page = await J.page(ctx);
  page.__docs = [];
  page.on("domcontentloaded", () => page.__docs.push(page.url().replace(BASE, "").split("#")[0].slice(0, 80)));
  await page.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
  await sleep(1500);
  return { ctx, page };
}

// The SubX workspace, signed in, wherever it ended up (the overlay frame or the page itself).
async function subxSignedIn(page) {
  const f = await overlayFrame(page, 15000);
  const target = f || page;
  const ws = await subxWorkspace(target, 25000);
  return { where: f ? "overlay" : "page", ...ws };
}

await J.run(async () => {
  await J.launch();
  const acct = await J.account("deeplink");

  const cases = [
    {
      // /subx was a product page with START A SUBMITTAL until 82aea46; since then it is the
      // workspace itself, which asks a guest to sign in.
      label: "/subx link", path: "/subx",
      go: async (page) => {
        const start = page.locator("a, button").filter({ hasText: /start a submittal/i }).first();
        if (await start.isVisible().catch(() => false)) {
          await press(page, start);
          await page.waitForLoadState("load").catch(() => {});
          await sleep(2500);
        }
        await until(async () => (await page.locator("#weyland-signin-email").isVisible().catch(() => false)) || (await page.locator("#signin-btn").isVisible().catch(() => false)), 15000, 500);
        if (!(await page.locator("#weyland-signin-email").isVisible().catch(() => false))) {
          if (!(await page.locator("#signin-btn").isVisible().catch(() => false))) return { why: "/subx offered a guest no way to sign in (no START A SUBMITTAL, no SIGN IN)" };
          await press(page, "#signin-btn");
          await page.waitForLoadState("load").catch(() => {});
        }
        const s = await signInHere(page, acct);
        const ws = s.auth === "signed-in" ? await subxSignedIn(page) : null;
        return { signIn: s, inside: !!ws && ws.appVisible && ws.accountToken && !ws.loginVisible, detail: ws };
      }
    },
    {
      label: "/subx-app workspace link, SIGN IN", path: "/subx-app",
      go: async (page) => {
        await until(() => page.locator("#signin-btn").isVisible(), 15000, 500);
        if (!(await page.locator("#signin-btn").isVisible().catch(() => false))) return { why: "the workspace showed no SIGN IN to a guest" };
        await press(page, "#signin-btn");
        await page.waitForLoadState("load").catch(() => {});
        const s = await signInHere(page, acct);
        const ws = s.auth === "signed-in" ? await subxSignedIn(page) : null;
        return { signIn: s, inside: !!ws && ws.appVisible && ws.accountToken && !ws.loginVisible, detail: ws };
      }
    },
    {
      label: "/meetingx shared room link, JOIN ROOM", path: "/meetingx?room=usersim" + J.suffix.slice(-8),
      go: async (page) => {
        await page.waitForSelector("#room-btn", { timeout: 15000 }).catch(() => {});
        await press(page, "#room-btn");
        await until(() => page.locator("#room-signin").isVisible(), 15000, 400);
        if (!(await page.locator("#room-signin").isVisible().catch(() => false))) return { why: "JOIN ROOM did not offer SIGN IN TO JOIN: " + (await page.evaluate(() => ((document.getElementById("room-notice") || {}).innerText || "").trim()).catch(() => "")) };
        await press(page, "#room-signin");
        const s = await signInHere(page, acct);
        const stRoom = await waitText(page, "#room-status", /^CONNECTED$/i, 30000);
        return { signIn: s, inside: /^CONNECTED$/i.test(stRoom || ""), detail: { roomStatus: stRoom, url: page.url().replace(BASE, "").slice(0, 80) } };
      }
    },
    {
      label: "/login?redirect=/propx-app", path: "/login?redirect=/propx-app",
      go: async (page) => {
        const s = await signInHere(page, acct);
        const f = s.auth === "signed-in" ? await overlayFrame(page, 20000) : null;
        await until(() => f && f.evaluate(() => !!document.getElementById("generateBtn") && document.querySelectorAll(".source[data-source]").length > 0), 30000, 500);
        const fi = await frameInfo(f);
        const sources = f ? await f.evaluate(() => document.querySelectorAll(".source[data-source]").length).catch(() => 0) : 0;
        return { signIn: s, inside: !!fi && /^\/propx-app\/?$/.test(fi.path || "") && fi.ids.includes("generateBtn") && sources > 0, detail: { path: fi && fi.path, title: fi && fi.title, sources } };
      }
    },
    {
      label: "/login?redirect=/huntx", path: "/login?redirect=/huntx",
      go: async (page) => {
        const s = await signInHere(page, acct);
        const f = s.auth === "signed-in" ? await overlayFrame(page, 20000) : null;
        await until(() => f && f.evaluate(() => document.querySelectorAll("#hx-body tr a[href^='http']").length > 0), 30000, 500);
        const fi = await frameInfo(f);
        const rows = f ? await f.evaluate(() => document.querySelectorAll("#hx-body tr a[href^='http']").length).catch(() => 0) : 0;
        return { signIn: s, inside: !!fi && /^\/huntx\/?$/.test(fi.path || "") && rows > 0, detail: { path: fi && fi.path, title: fi && fi.title, rows } };
      }
    }
  ];

  for (const c of cases) {
    const { ctx, page } = await arrive(c.path);
    const mark = await setMark(page);
    let r;
    try { r = await c.go(page); } catch (e) { r = { why: String((e && e.message) || e).slice(0, 200) }; }
    const ps = await placeState(page, mark);
    const docs = page.__docs.slice();
    J.note(c.label, { docs, result: r });
    if (r.why) {
      J.check(c.label + ": the visitor can sign in from the link", false, r.why);
    } else {
      J.check(c.label + ": the visitor is offered sign-in and signs in", r.signIn.shown && r.signIn.auth === "signed-in", r.signIn);
      J.check(c.label + ": signed in, the visitor is inside the product", !!r.inside, r.detail);
      J.check(c.label + ": no page hop from arrival to working in the product (documents loaded: " + docs.length + ")", docs.length === 1 && ps.sameDocument && ps.onSite, { docs, sameDocument: ps.sameDocument, onSite: ps.onSite });
    }
    await ctx.close();
  }
});
