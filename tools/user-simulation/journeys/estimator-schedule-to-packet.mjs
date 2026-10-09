// Guest journey on production; G018_LOCAL=1 serves this checkout and fixtures
// only unrelated API answers. PDF discovery/extraction/CSV use shipped code.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimatorLocalServer } from '../lib/estimator-local.mjs';
const pw = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const reportDir = path.join(root, 'tools/user-simulation/reports');
const stamp = new Date().toISOString(), id = 'estimator-schedule-to-packet';
const out = path.join(reportDir, id + '-' + stamp.replace(/[:.]/g, '-'));
await mkdir(out, { recursive: true });
const local = process.env.G018_LOCAL === '1' ? await estimatorLocalServer() : null;
const base = local?.base || process.env.WEYLAND_BASE_URL || 'https://weylandai.com';
const checks = [], errors = [], timings = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' ' + JSON.stringify(detail))); };
let browser;
try {
  browser = await pw.chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  for (const mode of ['desktop', 'phone']) {
    const ctx = await browser.newContext(mode === 'phone' ? { ...pw.devices['iPhone 13'], acceptDownloads: true } : { viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    // The background demo is unrelated to the uploaded schedule; don't create a clone.
    await ctx.route('**/api/demo/weyland-building/session', r => r.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"No background demo in this probe"}' }));
    if (local) await ctx.route('**/*', async r => {
      if (new URL(r.request().url()).origin === base) return r.fallback();
      return r.abort();
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push({ mode, message: e.message }));
    const uploads = [];
    page.on('request', r => { if (r.method() === 'POST' && /\/api\/hardware-schedule\//.test(r.url())) uploads.push(r.url()); });
    const t0 = Date.now();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.WeylandShell);
    const initial = await page.locator('#hs-walk').evaluate(el => ({ disabled: el.disabled, opacity: getComputedStyle(el).opacity, cursor: getComputedStyle(el).cursor, background: getComputedStyle(el).backgroundColor, help: document.getElementById(el.getAttribute('aria-describedby'))?.textContent }));
    check(mode + ': disabled walk looks disabled and explains how to enable it', initial.disabled && +initial.opacity <= .6 && initial.cursor === 'not-allowed' && /Match at least one/.test(initial.help), initial);
    await page.locator('#hs-upload').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, mode + '-walk-disabled.png') });
    await page.locator('#hs-upload').click();
    const frameElement = await page.waitForSelector('#wa-overlay iframe');
    const frame = await frameElement.contentFrame();
    await frame.waitForSelector('#upload-btn', { state: 'visible' });
    check(mode + ': upload offered before an account', await frame.locator('#f-file').isVisible(), await frame.locator('#signin-card').innerText());
    await frame.locator('#f-project').fill('Rockford g018');
    await frame.locator('#f-file').setInputFiles(path.join(root, 'tools/user-simulation/roles/rockford-A2.2-p29.pdf'));
    // Deliberately submit immediately: discovery must finish before page selection.
    await frame.locator('#upload-btn').click();
    await frame.waitForFunction(() => document.querySelectorAll('#doors-wrap tr[data-door]').length === 65, null, { timeout: 90000 });
    await frame.waitForFunction(() => /read complete/.test(document.getElementById('upload-result').textContent));
    const elapsed = (Date.now() - t0) / 1000;
    const text = await frame.locator('#session-card').innerText();
    const status = await frame.locator('#upload-result').innerText();
    const citationCount = await frame.locator('#doors-wrap .src-cite').count();
    check(mode + ': 65 doors with 65 source citations before sign-in or upload API', citationCount === 65 && uploads.length === 0, { citationCount, uploads, seconds: elapsed });
    check(mode + ': Reading status clears', !/Reading/i.test(status) && !(await frame.locator('#extract-result .spin').count()), status);
    check(mode + ': one hardware-group vocabulary in the workspace', !/HW group|hardware sets/i.test(text), text.slice(0, 500));
    const need = await frame.locator('#hardware-needed').innerText();
    check(mode + ': A2.2 asks for Section 08 71 00 by name', /Section 08 71 00 — Door Hardware/.test(need), need);
    await frame.locator('#hardware-needed').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, mode + '-first-read.png') });
    const dlP = page.waitForEvent('download');
    await frame.getByRole('button', { name: 'DOWNLOAD THE DOOR LIST (CSV)' }).click();
    const dl = await dlP;
    const csvFile = path.join(out, mode + '-doors.csv'); await dl.saveAs(csvFile);
    const csv = await readFile(csvFile, 'utf8');
    check(mode + ': CSV retains all three pricing columns and 65 rows', /DOOR PAIR,GLAZING,ALTERNATE PRICING/.test(csv.split('\r\n')[0]) && csv.split('\r\n').length === 66, csv.split('\r\n')[0]);
    await frame.locator('#guest-save-btn').click();
    await page.waitForSelector('#weyland-signin-code-send', { state: 'visible' });
    const signIn = await page.locator('#wa-overlay').innerText();
    check(mode + ': single code-first sign-in door explains new accounts and no card', !(await page.locator('#weyland-signin-password').isVisible()) && !/Create a free account/.test(signIn) && /same code verifies your email/.test(signIn) && /No password or card needed/.test(signIn), signIn);
    // Inspect the real browser persistence used when the shell replaces its iframe.
    const draft = await page.evaluate(async () => { const m = await import('/api/hardware-schedule/client-ocr-assets/schedule-workspace.mjs?v=20261009g018'); const d = await m.pendingSchedule('get'); return d && { name: d.file.name, size: d.file.size, project: d.project }; });
    check(mode + ': selected PDF survives the sign-in door', draft?.name === 'rockford-A2.2-p29.pdf' && draft.size > 0, draft);
    await page.screenshot({ path: path.join(out, mode + '-sign-in.png') });
    timings.push({ mode, first_value_seconds: elapsed, account_gate_seconds: 0, scope: local ? 'local source, real PDF read; not production latency' : 'production guest read' });
    await ctx.close();
  }
} catch (e) { check('journey completes', false, e.stack); }
finally { await browser?.close(); await local?.close(); }
const report = { journey: id, started_at: stamp, finished_at: new Date().toISOString(), base, mode: local ? 'local source; unrelated APIs stubbed; real browser PDF extraction' : 'production guest', checks, passed: checks.filter(c => c.ok).length, failed: checks.filter(c => !c.ok).length, timings, page_errors: errors, artifacts: out, cleanup: { ok: true, note: 'Browser contexts and local server closed; no account, email or packet purchase. Background demo creation blocked.' } };
await writeFile(path.join(reportDir, 'journey-' + id + '-latest.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: out }));
process.exitCode = report.failed ? 1 : 0;
