// Third probe: the canvas sits below the fold, so scroll it into view and aim at its real rect; also test
// the path John uses: the homepage shell (href=#sightx), where SightX may load in a frame that lacks focus.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const OUT = process.env.OUT_DIR || '/tmp/sightx-probe';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const PATCH = '\n;(function(){ var P = THREE.PerspectiveCamera; function Q(){ var c = new P(arguments[0], arguments[1], arguments[2], arguments[3]); (window.__sxCams = window.__sxCams || []).push(c); return c; } Q.prototype = P.prototype; THREE.PerspectiveCamera = Q; window.__sxCam = function(){ var c = (window.__sxCams || [])[0]; return c ? { pos: c.position.toArray().map(function(v){ return +v.toFixed(3); }), rot: c.rotation.toArray().slice(0,3).map(function(v){ return +v.toFixed(3); }) } : null; }; })();';
const cam = (fr) => fr.evaluate('window.__sxCam ? window.__sxCam() : null');
const dist = (a, b) => (a && b) ? +Math.hypot(a.pos[0]-b.pos[0], a.pos[1]-b.pos[1], a.pos[2]-b.pos[2]).toFixed(3) : null;
const turn = (a, b) => (a && b) ? +Math.hypot(a.rot[0]-b.rot[0], a.rot[1]-b.rot[1], a.rot[2]-b.rot[2]).toFixed(3) : null;
async function prep(ctx) { await ctx.route('**/three.min.js*', async (route) => { const resp = await route.fetch(); await route.fulfill({ response: resp, body: (await resp.text()) + PATCH, headers: { ...resp.headers(), 'content-type': 'application/javascript' } }); }); }
const rectOf = (fr, sel) => fr.evaluate('(function(s){ var el = document.querySelector(s); if (!el) return null; el.scrollIntoView({ block: "center" }); var r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(' + JSON.stringify(sel) + ')');
const out = {};
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
try {
  // A. desktop, direct URL, aimed at the canvas
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await prep(ctx); const pg = await ctx.newPage();
    await pg.goto('https://weylandai.com/sightx/', { waitUntil: 'load', timeout: 60000 }); await wait(5000);
    const r = await rectOf(pg, '#sx-canvas'); await wait(400); const a = await cam(pg);
    await pg.mouse.move(r.x + r.w/2, r.y + r.h/2); await pg.mouse.down(); await pg.mouse.move(r.x + r.w/2 + 260, r.y + r.h/2 + 20, { steps: 25 }); await pg.mouse.up(); await wait(300);
    const b = await cam(pg);
    await pg.keyboard.down('KeyW'); await wait(1000); await pg.keyboard.up('KeyW'); await wait(200); const c = await cam(pg);
    out.desktopDirect = { canvasRect: r, mouseLook_turned: turn(a, b), W_moved: dist(b, c), canvasBelowFoldOnLoad: r && r.y > 800 ? 'yes' : 'canvas top at ' + Math.round(r.y) + ' after scrollIntoView' };
    await pg.screenshot({ path: OUT + '/p3-desktop-direct.png' }); await ctx.close(); }
  // B. desktop, through the homepage shell
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await prep(ctx); const pg = await ctx.newPage();
    await pg.goto('https://weylandai.com/', { waitUntil: 'load', timeout: 60000 }); await wait(3000);
    const opener = await pg.$('[data-target="sightx"], a[href="#sightx"]');
    out.shell = { openerFound: !!opener };
    if (opener) { await opener.click(); await wait(6000);
      out.shell.urlAfter = pg.url();
      const frames = pg.frames().map(f => f.url()); out.shell.frames = frames;
      const fr = pg.frames().find(f => /sightx/.test(f.url()));
      out.shell.sightxFrame = fr ? fr.url() : null;
      const target = fr || pg;
      const a = await cam(target); out.shell.camInFrame = !!a;
      await pg.keyboard.down('KeyW'); await wait(1200); await pg.keyboard.up('KeyW'); await wait(200);
      const b = await cam(target); out.shell.W_withoutClick_moved = dist(a, b);
      out.shell.activeEl = await pg.evaluate('document.activeElement && document.activeElement.tagName + (document.activeElement.id ? "#" + document.activeElement.id : "") + (document.activeElement.src ? " " + document.activeElement.src : "")');
      // click inside the SightX canvas, then W again
      let r = null; try { r = await rectOf(target, '#sx-canvas'); } catch (e) {}
      if (fr && r) { const fe = await fr.frameElement(); const fb = await fe.boundingBox(); r = { x: fb.x + r.x, y: fb.y + r.y, w: r.w, h: r.h }; }
      out.shell.canvasRect = r;
      if (r) { await pg.mouse.click(r.x + r.w/2, r.y + r.h/2); await wait(300); }
      const c = await cam(target);
      await pg.keyboard.down('KeyW'); await wait(1200); await pg.keyboard.up('KeyW'); await wait(200);
      const d = await cam(target); out.shell.W_afterClick_moved = dist(c, d);
      out.shell.activeElAfterClick = await pg.evaluate('document.activeElement && document.activeElement.tagName + (document.activeElement.id ? "#" + document.activeElement.id : "")');
      // escape key: does the shell close the overlay while walking?
      await pg.screenshot({ path: OUT + '/p3-shell-desktop.png' }); }
    await ctx.close(); }
  // C. phone, direct URL, aimed at the canvas and the walk button
  { const ctx = await browser.newContext({ ...devices['iPhone 13'] }); await prep(ctx); const pg = await ctx.newPage();
    await pg.goto('https://weylandai.com/sightx/', { waitUntil: 'load', timeout: 60000 }); await wait(5000);
    const cdp = await ctx.newCDPSession(pg); const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const r = await rectOf(pg, '#sx-canvas'); await wait(400); const a = await cam(pg);
    await touch('touchStart', [{ x: r.x + r.w/2, y: r.y + r.h/2, id: 1 }]);
    for (let i = 1; i <= 15; i++) { await touch('touchMove', [{ x: r.x + r.w/2 + i * 8, y: r.y + r.h/2, id: 1 }]); await wait(30); }
    await touch('touchEnd', []); await wait(300); const b = await cam(pg);
    const fb = await rectOf(pg, '#fwd'); await wait(300); const c = await cam(pg);
    await touch('touchStart', [{ x: fb.x + fb.w/2, y: fb.y + fb.h/2, id: 1 }]); await wait(1500); await touch('touchEnd', []); await wait(200); const d = await cam(pg);
    out.phoneDirect = { canvasRect: r, oneFingerLook_turned: turn(a, b), walkHold_moved: dist(c, d), walkButtonRect: fb, thumbstick: 'none on this page' };
    await pg.screenshot({ path: OUT + '/p3-phone-direct.png' }); await ctx.close(); }
} finally { await browser.close(); }
console.log(JSON.stringify(out, null, 1));
