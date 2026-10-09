// Second probe: capture the page's camera by extending three.min.js in flight (the camera lives in a closure),
// then measure WASD before and after a click, mouse look, and on the phone the hold buttons and one-finger look.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const URL_ = process.env.SIGHTX_URL || 'https://weylandai.com/sightx/';
const OUT = process.env.OUT_DIR || '/tmp/sightx-probe';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const PATCH = '\n;(function(){ var P = THREE.PerspectiveCamera; function Q(){ var c = new P(arguments[0], arguments[1], arguments[2], arguments[3]); (window.__sxCams = window.__sxCams || []).push(c); return c; } Q.prototype = P.prototype; THREE.PerspectiveCamera = Q; window.__sxCam = function(){ var c = (window.__sxCams || [])[0]; return c ? { pos: c.position.toArray().map(function(v){ return +v.toFixed(3); }), rot: c.rotation.toArray().slice(0,3).map(function(v){ return +v.toFixed(3); }) } : null; }; })();';
const cam = (pg) => pg.evaluate('window.__sxCam ? window.__sxCam() : null');
const dist = (a, b) => (a && b) ? +Math.hypot(a.pos[0]-b.pos[0], a.pos[1]-b.pos[1], a.pos[2]-b.pos[2]).toFixed(3) : null;
const turn = (a, b) => (a && b) ? +Math.hypot(a.rot[0]-b.rot[0], a.rot[1]-b.rot[1], a.rot[2]-b.rot[2]).toFixed(3) : null;
async function prep(ctx) {
  await ctx.route('**/three.min.js*', async (route) => {
    const resp = await route.fetch();
    const body = (await resp.text()) + PATCH;
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'application/javascript' } });
  });
}
const out = { url: URL_, desktop: {}, phone: {} };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
try {
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await prep(dctx);
  const d = await dctx.newPage();
  const derr = []; d.on('pageerror', e => derr.push(String(e.message).slice(0, 160)));
  await d.goto(URL_, { waitUntil: 'load', timeout: 60000 }); await wait(6000);
  const c0 = await cam(d);
  out.desktop.camCaptured = !!c0; out.desktop.start = c0;
  // 1) W with no click first (fresh load)
  await d.keyboard.down('KeyW'); await wait(1500); await d.keyboard.up('KeyW'); await wait(200);
  const c1 = await cam(d); out.desktop.W_noClick_moved = dist(c0, c1);
  // 2) click the canvas, then W
  await d.mouse.click(640, 400); await wait(300);
  out.desktop.activeAfterClick = await d.evaluate('document.activeElement && (document.activeElement.tagName + (document.activeElement.id ? "#" + document.activeElement.id : ""))');
  const c2 = await cam(d);
  await d.keyboard.down('KeyW'); await wait(1500); await d.keyboard.up('KeyW'); await wait(200);
  const c3 = await cam(d); out.desktop.W_afterClick_moved = dist(c2, c3);
  await d.keyboard.down('KeyD'); await wait(1000); await d.keyboard.up('KeyD'); await wait(200);
  const c4 = await cam(d); out.desktop.D_moved = dist(c3, c4);
  await d.keyboard.down('KeyS'); await wait(1000); await d.keyboard.up('KeyS'); await wait(200);
  const c5 = await cam(d); out.desktop.S_moved = dist(c4, c5);
  // 3) mouse look: drag
  await d.mouse.move(640, 400); await d.mouse.down(); await d.mouse.move(900, 420, { steps: 25 }); await d.mouse.up(); await wait(300);
  const c6 = await cam(d); out.desktop.drag_turned = turn(c5, c6);
  // 4) does anything consume keys? check listeners count on window via a fresh keydown that we observe
  out.desktop.keydownReachesWindow = await d.evaluate('new Promise(function(res){ var got = false; window.addEventListener("keydown", function h(e){ got = true; window.removeEventListener("keydown", h); }, true); setTimeout(function(){ res(got); }, 400); document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", key: "w", bubbles: true })); })');
  out.desktop.end = await cam(d); out.desktop.errors = derr;
  await d.screenshot({ path: OUT + '/p2-desktop-end.png' });
  await dctx.close();

  const pctx = await browser.newContext({ ...devices['iPhone 13'] });
  await prep(pctx);
  const p = await pctx.newPage();
  const perr = []; p.on('pageerror', e => perr.push(String(e.message).slice(0, 160)));
  await p.goto(URL_, { waitUntil: 'load', timeout: 60000 }); await wait(6000);
  const m0 = await cam(p); out.phone.camCaptured = !!m0; out.phone.start = m0;
  out.phone.controls = await p.evaluate('(function(){ return ["fwd","back","sx-canvas"].map(function(id){ var el = document.getElementById(id); if (!el) return id + ": missing"; var r = el.getBoundingClientRect(), cs = getComputedStyle(el); return id + ": " + Math.round(r.x) + "," + Math.round(r.y) + " " + Math.round(r.width) + "x" + Math.round(r.height) + " display=" + cs.display + " vis=" + cs.visibility + " text=" + JSON.stringify((el.textContent||"").trim().slice(0,20)); }); })()');
  const cdp = await pctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  // hold the fwd button if it exists
  const fwd = await p.evaluate('(function(){ var el = document.getElementById("fwd"); if (!el) return null; var r = el.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()');
  if (fwd) {
    await touch('touchStart', [{ x: fwd.x, y: fwd.y, id: 1 }]); await wait(1500); await touch('touchEnd', []); await wait(200);
    const m1 = await cam(p); out.phone.fwdHold_moved = dist(m0, m1);
  }
  // one-finger look on the canvas
  const vp = p.viewportSize(); const m2 = await cam(p);
  await touch('touchStart', [{ x: vp.width/2, y: vp.height/2, id: 1 }]);
  for (let i = 1; i <= 15; i++) { await touch('touchMove', [{ x: vp.width/2 + i * 8, y: vp.height/2, id: 1 }]); await wait(30); }
  await touch('touchEnd', []); await wait(300);
  const m3 = await cam(p); out.phone.oneFingerLook_turned = turn(m2, m3);
  // a thumbstick-style drag bottom-left (where a stick would be) to see if anything moves
  await touch('touchStart', [{ x: 80, y: vp.height - 110, id: 1 }]);
  for (let i = 1; i <= 12; i++) { await touch('touchMove', [{ x: 80, y: vp.height - 110 - i * 5, id: 1 }]); await wait(40); }
  await wait(1000); const m4 = await cam(p); out.phone.stickDrag_moved = dist(m3, m4);
  await touch('touchEnd', []);
  out.phone.errors = perr;
  await p.screenshot({ path: OUT + '/p2-phone-end.png' });
  await pctx.close();
} finally { await browser.close(); }
console.log(JSON.stringify(out, null, 1));
