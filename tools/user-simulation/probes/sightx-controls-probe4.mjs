// Fourth probe: the homepage path. The world is an iframe (/sightx/?embed=bg) under the shell; do keys and
// touches typed on the homepage reach it? Count keydown and message events inside the frame, read any
// position-like state it exposes, and check what covers the joystick on a phone.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const OUT = process.env.OUT_DIR || '/tmp/sightx-probe';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const INSTALL = '(function(){ if (window.__probe) return "already"; window.__probe = { kd: 0, msgs: [], touches: 0 }; window.addEventListener("keydown", function(){ window.__probe.kd++; }, true); window.addEventListener("message", function(e){ var d = e.data; window.__probe.msgs.push(typeof d === "object" ? JSON.stringify(d).slice(0, 90) : String(d).slice(0, 90)); }); window.addEventListener("touchstart", function(){ window.__probe.touches++; }, true); window.addEventListener("pointerdown", function(){ window.__probe.touches++; }, true); return "installed"; })()';
const STATE = '(function(){ function vec(v){ if (!v) return null; if (Array.isArray(v) && v.length >= 3 && v.slice(0,3).every(function(n){ return typeof n === "number"; })) return v.slice(0,3); if (typeof v === "object" && typeof v.x === "number" && typeof v.y === "number" && typeof v.z === "number") return [v.x, v.y, v.z]; return null; } var found = {}; ["sxWalk","__sxWalkGeom","__sxTouchStats","sightx","SightX","sxControls","__sx"].forEach(function(k){ var o = window[k]; if (!o) return; found[k] = { type: typeof o, keys: typeof o === "object" ? Object.keys(o).slice(0, 30) : null }; if (typeof o === "object") Object.keys(o).forEach(function(kk){ var v = vec(o[kk]); if (v) found[k + "." + kk] = v.map(function(n){ return +n.toFixed(3); }); var g = o[kk]; if (typeof g === "function" && /pos|pose|state|cam/i.test(kk) && g.length === 0) { try { var r = g.call(o); var vv = vec(r) || (r && (vec(r.pos) || vec(r.position))); if (vv) found[k + "." + kk + "()"] = vv.map(function(n){ return +n.toFixed(3); }); } catch (e) {} } }); }); found.probe = window.__probe || null; found.active = document.activeElement && document.activeElement.tagName; return found; })()';
const out = {};
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
try {
  for (const which of ['desktop', 'phone']) {
    const ctx = await browser.newContext(which === 'desktop' ? { viewport: { width: 1280, height: 800 } } : { ...devices['iPhone 13'] });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message).slice(0, 140)));
    await pg.goto('https://weylandai.com/', { waitUntil: 'load', timeout: 60000 }); await wait(5000);
    const fr = pg.frames().find(f => f.url().includes('/sightx/') && f.url().includes('embed=bg'));
    const r = { frameUrl: fr ? fr.url() : null };
    if (fr) {
      r.install = await fr.evaluate(INSTALL);
      r.stateAtLoad = await fr.evaluate(STATE);
      // 1. W typed on the homepage as loaded (no click)
      await pg.keyboard.down('KeyW'); await wait(1000); await pg.keyboard.up('KeyW'); await wait(200);
      r.afterW_noClick = await fr.evaluate(STATE);
      r.topActive_noClick = await pg.evaluate('document.activeElement && document.activeElement.tagName');
      // 2. open the SightX chapter from the flag, then W
      const opener = await pg.$('[data-target="sightx"]'); r.openerFound = !!opener;
      if (opener) { await opener.click(); await wait(4000); }
      await pg.keyboard.down('KeyW'); await wait(1000); await pg.keyboard.up('KeyW'); await wait(200);
      r.afterW_chapterOpen = await fr.evaluate(STATE);
      r.topActive_chapterOpen = await pg.evaluate('document.activeElement && document.activeElement.tagName + (document.activeElement.className ? "." + String(document.activeElement.className).split(" ")[0] : "")');
      // 3. what covers the world? sample points over the viewport in the top document
      r.coverage = await pg.evaluate('(function(){ var w = innerWidth, h = innerHeight, pts = [[w*0.5,h*0.5],[w*0.85,h*0.85],[w*0.9,h*0.9],[w*0.5,h*0.95],[w*0.1,h*0.5]]; return pts.map(function(p){ var el = document.elementFromPoint(p[0], p[1]); return Math.round(p[0]) + "," + Math.round(p[1]) + " -> " + (el ? el.tagName + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "") : "none"); }); })()');
      // 4. joystick: where is it, and what is on top of it in the top document?
      const joy = await fr.evaluate('(function(){ var el = document.querySelector("[id*=joy],[class*=joy],[id*=stick],[class*=stick]"); if (!el) return null; var rc = el.getBoundingClientRect(), cs = getComputedStyle(el); return { sel: (el.id ? "#" + el.id : "") + "." + String(el.className).split(" ").slice(0,2).join("."), x: rc.x, y: rc.y, w: rc.width, h: rc.height, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, pointerEvents: cs.pointerEvents }; })()');
      r.joystickInFrame = joy;
      const fe = await fr.frameElement(); const fb = await fe.boundingBox(); r.frameBox = fb;
      if (joy && fb && joy.w > 0) {
        const px = fb.x + joy.x + joy.w / 2, py = fb.y + joy.y + joy.h / 2; r.joystickPagePoint = [Math.round(px), Math.round(py)];
        r.whatIsOnTopOfJoystick = await pg.evaluate('(function(x,y){ var el = document.elementFromPoint(x,y); return el ? el.tagName + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "") : "none"; })(' + px + ',' + py + ')');
        if (which === 'phone') {
          const cdp = await ctx.newCDPSession(pg); const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
          await touch('touchStart', [{ x: px, y: py, id: 1 }]); for (let i = 1; i <= 12; i++) { await touch('touchMove', [{ x: px, y: py - i * 6, id: 1 }]); await wait(40); } await wait(1000);
          r.duringJoystickDrag = await fr.evaluate(STATE); await touch('touchEnd', []);
        } else { await pg.mouse.move(px, py); await pg.mouse.down(); for (let i = 1; i <= 12; i++) { await pg.mouse.move(px, py - i * 6); await wait(40); } await wait(800); r.duringJoystickDrag = await fr.evaluate(STATE); await pg.mouse.up(); }
      }
      // 5. click on the world directly (a point the coverage says is the iframe), then W
      const worldPt = await pg.evaluate('(function(){ var w = innerWidth, h = innerHeight; for (var y = 0.02; y < 1; y += 0.04) for (var x = 0.02; x < 1; x += 0.08) { var el = document.elementFromPoint(w*x, h*y); if (el && el.tagName === "IFRAME") return [w*x, h*y]; } return null; })()');
      r.aPointWhereTheIframeIsOnTop = worldPt && worldPt.map(Math.round);
      if (worldPt) { await pg.mouse.click(worldPt[0], worldPt[1]); await wait(300); await pg.keyboard.down('KeyW'); await wait(1000); await pg.keyboard.up('KeyW'); await wait(200); r.afterClickOnWorld_thenW = await fr.evaluate(STATE); }
    }
    r.errors = errs.slice(0, 6);
    await pg.screenshot({ path: OUT + '/p4-' + which + '.png' });
    out[which] = r; await ctx.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(out, null, 1));
