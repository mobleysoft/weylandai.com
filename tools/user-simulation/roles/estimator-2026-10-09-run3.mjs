// Estimator role run, 2026-10-09, third run (headless Chromium on the Mac).
// Usage: node estimator-2026-10-09-run3.mjs desktop|phone
// Keeps one browser open and polls run3-cmd-<mode>/NNN.js; each file is the body of an
// async function with (page, ctx, browser, H, S) in scope. Output goes to NNN.js.out.
// Every file that touches the page is one browser step; H.step() logs it with a running clock.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pw = require('/private/tmp/claude-501/-Users-johnmobley/36836088-d551-4ec6-b6ef-38f1b69cf0bc/scratchpad/node_modules/playwright-core');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] || 'desktop';
const SHOTS = path.join(HERE, 'shots-2026-10-09');
const CMD = path.join(HERE, 'run3-cmd-' + mode);
const LOG = path.join(HERE, 'estimator-2026-10-09-steps-' + mode + '.log');
const SHEET = path.join(HERE, 'rockford-A2.2-p29.pdf');

let t0 = Date.now();
let stepCount = 0;
const log = (kind, msg) => {
  const line = new Date().toISOString() + ' +' + ((Date.now() - t0) / 1000).toFixed(1) + 's [' + kind + '] ' + msg;
  fs.appendFileSync(LOG, line + '\n');
  return line;
};

const browser = await pw.chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const ctxOpts = mode === 'phone' ? { ...pw.devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } };
const ctx = await browser.newContext({ ...ctxOpts, acceptDownloads: true });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { consoleErrors.push(m.text().slice(0, 200)); log('CONSOLE', m.type() + ' ' + m.text().slice(0, 200)); } });
page.on('pageerror', (e) => log('PAGEERROR', String(e).slice(0, 200)));
page.on('response', (r) => { if (r.status() >= 400) log('HTTP', r.status() + ' ' + r.url().slice(0, 160)); });
const S = { pages: [page], downloads: [] };
ctx.on('page', (p) => { S.pages.push(p); log('NEWPAGE', p.url()); });
page.on('download', (d) => { S.downloads.push(d); log('DOWNLOAD', d.suggestedFilename()); });

const H = {
  mode, SHOTS, SHEET, consoleErrors,
  resetClock() { t0 = Date.now(); },
  elapsed() { return ((Date.now() - t0) / 1000).toFixed(1); },
  log,
  step(msg) { stepCount += 1; return log('STEP', 'S' + stepCount + ' ' + msg); },
  async shot(p, name, full = false) {
    const f = path.join(SHOTS, mode[0] + '-' + name + '.png');
    await p.screenshot({ path: f, fullPage: full });
    log('SHOT', path.basename(f));
    return path.basename(f);
  },
  async webgl(p) {
    return p.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return { ok: false };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { ok: true, version: gl.getParameter(gl.VERSION), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
    });
  },
  // Visible text nodes and controls inside the current viewport, top to bottom.
  async view(p) {
    return p.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw &&
          cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
      };
      const texts = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        if (!t || !n.parentElement || !vis(n.parentElement)) continue;
        const r = n.parentElement.getBoundingClientRect();
        texts.push(Math.round(r.top) + ':' + n.parentElement.tagName.toLowerCase() + ': ' + t.slice(0, 160));
      }
      const controls = [...document.querySelectorAll('a,button,input,textarea,select,[role=button],label[for]')]
        .filter(vis).map((el) => {
          const r = el.getBoundingClientRect();
          return el.tagName.toLowerCase() + '#' + (el.id || '') + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + '] ' +
            (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.type || '').replace(/\s+/g, ' ').trim().slice(0, 90) +
            (el.disabled ? ' (disabled)' : '') + (el.href ? ' -> ' + el.href : '');
        });
      return { url: location.href, title: document.title, scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight, texts, controls };
    });
  },
};

log('INFO', 'driver ready mode=' + mode + ' webgl=' + JSON.stringify(await H.webgl(page)));
fs.writeFileSync(path.join(CMD, 'READY'), new Date().toISOString());

for (;;) {
  const files = fs.readdirSync(CMD).filter((f) => /^\d+\.js$/.test(f) && !fs.existsSync(path.join(CMD, f + '.out'))).sort();
  if (!files.length) { await new Promise((r) => setTimeout(r, 150)); continue; }
  const f = files[0];
  const body = fs.readFileSync(path.join(CMD, f), 'utf8');
  if (body.trim() === 'EXIT') { fs.writeFileSync(path.join(CMD, f + '.out'), 'bye'); break; }
  let out;
  try {
    const fn = new Function('page', 'ctx', 'browser', 'H', 'S', 'return (async () => { ' + body + ' })();');
    const r = await fn(page, ctx, browser, H, S);
    out = r === undefined ? '(no output)' : (typeof r === 'string' ? r : JSON.stringify(r, null, 1));
  } catch (e) {
    out = 'ERR ' + String(e && e.stack ? e.stack : e).slice(0, 1500);
  }
  fs.writeFileSync(path.join(CMD, f + '.out'), out);
}
await browser.close();
process.exit(0);
