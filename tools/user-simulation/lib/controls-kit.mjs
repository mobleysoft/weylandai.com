// tools/user-simulation/lib/controls-kit.mjs
//
// The four S0 controls journeys (docs/direction-2026-10-08.md, S0): SightX on the app page
// (/sightx/) and on the homepage backdrop, desktop and phone. Each asserts, from the user's side:
//   - W (desktop) or the touch stick (phone) moves the player at least 1 unit,
//   - a mouse drag (desktop) or a one-finger drag (phone) turns the view at least 0.5 rad,
//   - no request leaves MobCorp's own hosts (three.js and every other script are served by us).
// Motion is read from SightXControls.state() ({ pos, yaw, pitch }, read-only), in the page or in
// the world frame, so nothing in the renderer is patched.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { BASE, REPORTS_DIR, sleep } from "./journey-kit.mjs";

// First party: this site and MobCorp's own services (AuthFor sign-in). Anything else, a CDN included, is a third-party request.
const OURS = [new URL(BASE).hostname, "weylandai.com", "authfor.com", "vendyai.com", "mailguyai.com"];
export function thirdPartyWatch(ctx) {
  const seen = new Set();
  ctx.on("request", (r) => {
    let h = ""; try { h = new URL(r.url()).hostname; } catch (e) { return; }
    if (!h || r.url().startsWith("data:") || r.url().startsWith("blob:")) return;
    if (!OURS.some((o) => h === o || h.endsWith("." + o))) seen.add(h);
  });
  return seen;
}

const dist = (a, b) => Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
const turn = (a, b) => { let d = Math.abs(a.yaw - b.yaw) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };

async function touchDrag(ctx, page, from, to, { steps = 10, holdMs = 0, id = 1 } = {}) {
  const cdp = await ctx.newCDPSession(page);
  const t = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
  await t("touchStart", [{ x: from.x, y: from.y, id }]);
  for (let i = 1; i <= steps; i++) { await t("touchMove", [{ x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps, id }]); await sleep(30); }
  if (holdMs) await sleep(holdMs);
  await t("touchEnd", []);
}

/** state reader for a page (app) or a frame (homepage world). */
export const stateOf = (target) => target.evaluate(() => (window.SightXControls && window.SightXControls.state ? window.SightXControls.state() : null));

export async function moveAndLook(J, { ctx, page, world, kind, where, lookBox }) {
  const s0 = await stateOf(world);
  J.check("SightXControls.state() answers (" + where + ")", !!(s0 && Array.isArray(s0.pos)), s0);
  if (!s0) return;
  const immutable = await world.evaluate(() => {
    const a = window.SightXControls.state(), p = a.pos.slice(), yaw = a.yaw;
    try { a.pos[0] += 100; a.yaw += 100; } catch (_) {}
    const b = window.SightXControls.state(); return b.pos[0] === p[0] && b.yaw === yaw;
  });
  J.check('state snapshots cannot mutate the player', immutable);
  if (kind === "desktop") {
    await page.keyboard.down("KeyW"); await sleep(1500); await page.keyboard.up("KeyW");
  } else {
    const stick = await page.evaluate(() => { const e = document.querySelector(".weyland-stick"); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
    J.check("the touch stick is drawn in the page the finger touches (" + where + ")", !!stick, stick || "no .weyland-stick");
    if (stick) J.check('the topmost element at the stick is the stick', await page.evaluate(p => !!document.elementFromPoint(p.x, p.y)?.closest('.weyland-stick'), stick));
    if (stick) await touchDrag(ctx, page, stick, { x: stick.x, y: stick.y - 60 }, { steps: 8, holdMs: 1500 });
  }
  await sleep(400);
  const s1 = await stateOf(world);
  const moved = dist(s0, s1);
  J.check((kind === "desktop" ? "W" : "the stick") + " moves the player at least 1 unit (" + where + ")", moved >= 1, { moved: +moved.toFixed(2), from: s0.pos, to: s1.pos });
  const b = lookBox;
  const from = { x: b.x + b.width * 0.7, y: b.y + b.height * 0.45 }, to = { x: from.x - 260, y: from.y };
  if (kind === "desktop") {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    for (let i = 1; i <= 13; i++) { await page.mouse.move(from.x - i * 20, from.y); await sleep(16); }
    await page.mouse.up();
  } else {
    await touchDrag(ctx, page, from, to, { steps: 12, id: 2 });
  }
  await sleep(400);
  const s2 = await stateOf(world);
  const turned = turn(s1, s2);
  J.check("a " + (kind === "desktop" ? "mouse" : "finger") + " drag turns the view at least 0.5 rad (" + where + ")", turned >= 0.5, { turned: +turned.toFixed(2) });
}

export async function appJourney(J, kind) {
  await J.launch();
  const ctx = await J.context(kind);
  const third = thirdPartyWatch(ctx);
  const page = await J.page(ctx);
  await page.goto(BASE + "/sightx/?journey=" + J.id + "-" + J.suffix, { waitUntil: "load", timeout: 60000 });
  const built = await page.waitForFunction(() => /Built \d+ doors?/.test((document.getElementById("sx-status") || {}).textContent || ""), null, { timeout: 45000 }).then(() => true, () => false);
  J.check("the schedule has built a rendered corridor", built);
  const box = await page.locator("#sx-canvas").boundingBox();
  const hero = await page.locator("h1").boundingBox().catch(() => null);
  J.check("the 3D view comes before the page's text (canvas first)", !!box && (!hero || box.y < hero.y), { canvasTop: box && Math.round(box.y), headingTop: hero && Math.round(hero.y) });
  J.check("no press-and-hold WALK button", (await page.locator("#fwd, #back").count()) === 0);
  if (kind === "phone") await noHold(J, ctx, page, page, box);
  await moveAndLook(J, { ctx, page, world: page, kind, where: "/sightx/ " + kind, lookBox: box });
  await snapshot(J, page);
  J.check("no third-party request (/sightx/ " + kind + ")", third.size === 0, [...third]);
  await ctx.close();
}

export async function homeJourney(J, kind) {
  await J.launch();
  const ctx = await J.context(kind);
  const third = thirdPartyWatch(ctx);
  const page = await J.page(ctx);
  await page.goto(BASE + "/?journey=" + J.id + "-" + J.suffix + "#sightx", { waitUntil: "load", timeout: 60000 });
  await sleep(2500);
  if (kind === "desktop") {
    // The chapter says W/A/S/D MOVE: W with the chapter in view lowers the dossier into the world.
    await page.evaluate(() => { const c = document.getElementById("sightx"); if (c) c.scrollIntoView({ block: "center" }); });
    await sleep(800);
    await page.keyboard.down("KeyW"); await sleep(300); await page.keyboard.up("KeyW");
  } else {
    await page.evaluate(() => { const b = document.querySelector("#sightx .js-lower-dossier") || document.getElementById("envelope-close"); if (b) b.scrollIntoView({ block: "center" }); });
    await sleep(600);
    const btn = page.locator("#sightx .js-lower-dossier").first();
    if (await btn.count()) await btn.tap().catch(() => btn.click()); else await page.evaluate(() => document.getElementById("envelope-close").click());
  }
  const lowered = await page.waitForFunction(() => document.documentElement.classList.contains("folder-lowered"), null, { timeout: 10000 }).then(() => true, () => false);
  J.check("the world comes in front (" + (kind === "desktop" ? "W in the SightX chapter" : "LOWER THE DOSSIER") + ")", lowered);
  const frameReady = await page.waitForFunction(() => { const f = document.querySelector("#stage-backdrop iframe"); try { return !!(f && f.contentWindow.SightXControls && f.contentWindow.SightXControls.state()); } catch (e) { return false; } }, null, { timeout: 60000 }).then(() => true, () => false);
  J.check("the world frame is loaded and reports its state", frameReady);
  if (!frameReady) { await ctx.close(); return; }
  await sleep(1500);
  const world = page.frames().find((f) => /\/sightx\/?\?embed=bg|sightx\.html\?embed=bg/.test(f.url()));
  const vp = page.viewportSize();
  if (kind === "phone") await noHold(J, ctx, page, world, { x: 0, y: 0, width: vp.width, height: vp.height });
  await moveAndLook(J, { ctx, page, world, kind, where: "homepage " + kind, lookBox: { x: 0, y: 0, width: vp.width, height: vp.height } });
  await snapshot(J, page);
  await page.keyboard.press("Escape"); await sleep(800);
  J.check("Escape raises the dossier again", !(await page.evaluate(() => document.documentElement.classList.contains("folder-lowered"))));
  J.check('no legacy hold controls in the homepage world', await world.locator('#fwd, #back, .sx-action.sprint').count() === 0);
  await page.locator('#envelope-close').click(); await sleep(900);
  await page.keyboard.press('Enter'); await sleep(800);
  J.check('Enter raises the dossier again', !(await page.evaluate(() => document.documentElement.classList.contains('folder-lowered'))));
  J.check("no third-party request (homepage " + kind + ")", third.size === 0, [...third]);
  await ctx.close();
}

async function noHold(J, ctx, page, world, box) {
  const point = { x: box.x + box.width * .65, y: box.y + box.height * .4 };
  const before = await stateOf(world);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
  await sleep(900);
  const after = await stateOf(world);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await cdp.detach();
  const moved = before && after ? dist(before, after) : Infinity;
  J.check('holding the view without moving a stick does not walk', moved < .05, { moved });
}
async function snapshot(J, page) {
  const dir = process.env.OUT_DIR || REPORTS_DIR;
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, J.id + '.png') });
}
