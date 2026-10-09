// Fifth probe: phone homepage after a first touch (the world loads on first input), the joystick's coverage and a drag;
// desktop homepage: the documented "click to fly" and Enter paths, counting keydowns that reach the world frame.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const OUT = process.env.OUT_DIR || '/tmp/sightx-probe';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const INSTALL = '(function(){ if (window.__probe) return "already"; window.__probe = { kd: 0, msgs: [], downs: 0 }; window.addEventListener("keydown", function(){ window.__probe.kd++; }, true); window.addEventListener("message", function(e){ var d = e.data; window.__probe.msgs.push(typeof d === "object" ? JSON.stringify(d).slice(0, 70) : String(d).slice(0, 70)); }); ["touchstart","pointerdown"].forEach(function(t){ window.addEventListener(t, function(){ window.__probe.downs++; }, true); }); return "installed"; })()';
const STATS = '(function(){ return { probe: window.__probe || null, touch: window.__sxTouchStats ? JSON.parse(JSON.stringify(window.__sxTouchStats)) : null, hasFocus: document.hasFocus(), active: document.activeElement && document.activeElement.tagName }; })()';
const topEl = (pg, x, y) => pg.evaluate('(function(x,y){ var el = document.elementFromPoint(x,y); return el ? el.tagName + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "") : "none"; })(' + x + ',' + y + ')');
const findFrame = (pg) => pg.frames().find(f => f.url().includes('/sightx/') && f.url().includes('embed=bg'));
const out = {};
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
try {
  // PHONE
  { const ctx = await browser.newContext({ ...devices['iPhone 13'] }); const pg = await ctx.newPage(); const r = {};
    await pg.goto('https://weylandai.com/', { waitUntil: 'load', timeout: 60000 }); await wait(3000);
    r.frameBeforeInput = !!findFrame(pg);
    const cdp = await ctx.newCDPSession(pg); const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const vp = pg.viewportSize();
    await touch('touchStart', [{ x: vp.width / 2, y: vp.height * 0.4, id: 1 }]); await touch('touchEnd', []); await wait(6000);
    let fr = findFrame(pg); r.frameAfterFirstTouch = fr ? fr.url() : null;
    if (!fr) { await pg.mouse.wheel(0, 300); await wait(5000); fr = findFrame(pg); r.frameAfterScroll = fr ? fr.url() : null; }
    if (fr) {
      r.install = await fr.evaluate(INSTALL);
      const joy = await fr.evaluate('(function(){ var ui = document.getElementById("sightx-touch-ui"); var st = document.querySelector(".sx-stick"); function box(el){ if (!el) return null; var rc = el.getBoundingClientRect(), cs = getComputedStyle(el); return { x: rc.x, y: rc.y, w: rc.width, h: rc.height, display: cs.display, pe: cs.pointerEvents, cls: String(el.className) }; } return { ui: box(ui), stick: box(st), uiClasses: ui ? String(ui.className) : null, uiHidden: ui ? ui.hidden : null }; })()');
      r.joystick = joy;
      const fe = await fr.frameElement(); const fb = await fe.boundingBox(); r.frameBox = fb;
      const fcs = await fe.evaluate('(function(el){ var cs = getComputedStyle(el); return { pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, position: cs.position, opacity: cs.opacity }; })');
      r.frameStyle = fcs;
      const st = joy.stick && joy.stick.w > 0 ? joy.stick : joy.ui;
      if (st && fb) { const px = fb.x + st.x + st.w / 2, py = fb.y + st.y + st.h / 2; r.stickPagePoint = [Math.round(px), Math.round(py)]; r.onTopOfStick = await topEl(pg, px, py);
        const before = await fr.evaluate(STATS);
        await touch('touchStart', [{ x: px, y: py, id: 1 }]); for (let i = 1; i <= 12; i++) { await touch('touchMove', [{ x: px, y: py - i * 6, id: 1 }]); await wait(40); } await wait(900);
        const during = await fr.evaluate(STATS); await touch('touchEnd', []);
        r.stickDrag = { before, during }; }
      // one-finger look in the middle of the screen: who gets it?
      r.onTopOfCenter = await topEl(pg, vp.width / 2, vp.height / 2);
      const b0 = await fr.evaluate(STATS);
      await touch('touchStart', [{ x: vp.width / 2, y: vp.height / 2, id: 1 }]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: vp.width / 2 + i * 10, y: vp.height / 2, id: 1 }]); await wait(30); } await touch('touchEnd', []); await wait(300);
      r.centerDrag = { before: b0.touch, after: (await fr.evaluate(STATS)).touch };
    }
    await pg.screenshot({ path: OUT + '/p5-phone-home.png' }); out.phone = r; await ctx.close(); }
  // DESKTOP: click to fly, Enter
  { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await ctx.newPage(); const r = {};
    await pg.goto('https://weylandai.com/#sightx', { waitUntil: 'load', timeout: 60000 }); await wait(6000);
    const fr = findFrame(pg); r.frame = fr ? fr.url() : null;
    if (fr) { r.install = await fr.evaluate(INSTALL);
      const tryKeys = async (label) => { const a = await fr.evaluate(STATS); await pg.keyboard.down('KeyW'); await wait(700); await pg.keyboard.up('KeyW'); await wait(150); const b = await fr.evaluate(STATS); r[label] = { kdInFrame: b.probe.kd - a.probe.kd, frameHasFocus: b.hasFocus, topActive: await pg.evaluate('document.activeElement && document.activeElement.tagName + (document.activeElement.className && typeof document.activeElement.className === "string" ? "." + document.activeElement.className.split(" ")[0] : "")') }; };
      await tryKeys('W_asLoaded');
      // click on the HUD badge area (bottom-right), where the page says the controls are
      r.onTopOfHud = await topEl(pg, 1054, 656); await pg.mouse.click(1054, 656); await wait(500); await tryKeys('W_afterClickOnHud');
      // click in the middle of the chapter
      await pg.mouse.click(640, 450); await wait(500); await tryKeys('W_afterClickOnChapter');
      // Enter (documented as raising the dossier) then Escape, then W
      await pg.keyboard.press('Enter'); await wait(800); await tryKeys('W_afterEnter');
      await pg.keyboard.press('Escape'); await wait(800); await tryKeys('W_afterEscape');
      r.msgsSeenByFrame = (await fr.evaluate(STATS)).probe.msgs.slice(0, 8);
      r.frameStyle = await (await fr.frameElement()).evaluate('(function(el){ var cs = getComputedStyle(el); return { pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, tabIndex: el.tabIndex }; })');
    }
    await pg.screenshot({ path: OUT + '/p5-desktop-home.png' }); out.desktop = r; await ctx.close(); }
} finally { await browser.close(); }
console.log(JSON.stringify(out, null, 1));
