// Runs the shipped workspace handlers with a small DOM stand-in. Real Rockford
// PDF reader; controlled page-finder/API responses. No layout/browser claim.
// node --experimental-vm-modules --test tools/user-simulation/estimator-dom-regression.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { readPageFromTextLayer } from '../../weyland-subx-worker/src/lib/text-layer-read.js';
import * as workspace from '../../weyland-subx-worker/assets/client-ocr-src/schedule-workspace.mjs';

const html = readFileSync(new URL('../../weyland-subx-worker/src/pages/subx-app.html', import.meta.url), 'utf8');
const sheet = new File([readFileSync(new URL('roles/rockford-A2.2-p29.pdf', import.meta.url))], 'rockford-A2.2-p29.pdf', { type: 'application/pdf' });
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const flush = () => new Promise(r => setTimeout(r, 5));
async function until(fn) { for (let i = 0; i < 800; i++) { if (fn()) return; await flush(); } throw new Error('DOM condition timed out'); }
class Element {
  constructor() {
    this.listeners = {}; this.children = []; this.style = {}; this.attrs = {}; this.value = ''; this.disabled = false; this._html = ''; this.files = [];
    const classes = new Set();
    this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, on = !classes.has(x)) { on ? classes.add(x) : classes.delete(x); } };
  }
  get innerHTML() { return this._html; } set innerHTML(v) { this._html = String(v); this.children = []; }
  get textContent() { return this._html; } set textContent(v) { this._html = String(v); }
  addEventListener(n, fn) { (this.listeners[n] ||= []).push(fn); }
  async emit(n) { for (const f of this.listeners[n] || []) await f.call(this, { preventDefault() {} }); }
  appendChild(e) { this.children.push(e); return e; }
  querySelectorAll() { return []; } querySelector() { return null; }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; } removeAttribute(k) { delete this.attrs[k]; }
  scrollIntoView() {} focus() {} remove() {} click() {} insertAdjacentHTML(_, v) { this._html += v; }
}
async function fixture({ authed = false, failUpload = false, failRead = false, pendingDraft = null, plannedPages = [1], stopAfterPage = null } = {}) {
  const nodes = {};
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) nodes[m[1]] = new Element();
  for (const m of html.matchAll(/<[^>]*class="[^"]*\bhide\b[^>]*id="([^"]+)"/g)) nodes[m[1]]?.classList.add('hide');
  nodes['f-doctype'].value = 'door_schedule'; nodes['f-file'].files = [sheet]; nodes['f-project'].value = 'Rockford';
  const win = new Element(); win.WeylandPage = { signIn() {}, signOut: async () => {} };
  const doc = new Element(); doc.documentElement = new Element(); doc.body = new Element(); doc.getElementById = id => nodes[id]; doc.createElement = () => new Element();
  const calls = [], reads = []; let detail = workspace.guestDetail(sheet, 'Rockford', 1, []);
  detail.session.guest = false;
  let releaseFind;
  const finding = new Promise(r => { releaseFind = r; });
  const reader = {
    findSchedulePages: () => finding,
    extractDoorScheduleFromPdf: async (bytes, page) => {
      reads.push(page);
      const result = (await readPageFromTextLayer(bytes, page, 'door_schedule')).result;
      if (page === stopAfterPage) await nodes['stop-read-btn'].emit('click');
      return result;
    },
    extractHardwareScheduleFromPdf: async (bytes, page) => (await readPageFromTextLayer(bytes, page, 'hardware_schedule')).result,
  };
  const ctx = vm.createContext({ window: win, document: doc, location: { search: '', pathname: '/subx-app' }, localStorage: { getItem: () => null }, URLSearchParams, URL, FormData, Blob, AbortController, performance, console, navigator: { maxTouchPoints: 0 }, screen: { width: 1440, height: 900 }, setTimeout, clearTimeout, setInterval, clearInterval,
    fetch: async (url, opts = {}) => {
      calls.push({ url, method: opts.method || 'GET' });
      const answer = (body, status = 200) => new Response(JSON.stringify(body), { status });
      if (url.startsWith('/api/hardware-schedule/sessions')) return answer({ signed_in: authed, sessions: authed ? [{ id: 'test', project_name: 'Rockford' }] : [] });
      if (url.endsWith('/start')) return failUpload ? answer({ detail: 'Upload unavailable' }, 503) : answer({ sessionId: 'test', totalPages: 1 });
      if (url.endsWith('/doors')) return answer(detail);
      if (url.endsWith('/read-pages') && stopAfterPage != null) return answer({ results: plannedPages.map(page => ({ page, type: 'door_schedule', ok: false, error: 'Use the browser reader' })) });
      if (url.includes('/page/1?')) {
        if (failRead) return answer({ detail: 'Reader unavailable' }, 503);
        const r = await readPageFromTextLayer(await sheet.arrayBuffer(), 1, 'door_schedule');
        detail = workspace.guestDetail(sheet, 'Rockford', 1, [{ page: 1, extraction: r.result }]); detail.session.guest = false;
        return answer({ data: { schedule_type: 'door_schedule', entry_count: 65, metadata: r.result.metadata } });
      }
      return answer({});
    },
  });
  const nativeWorkspace = { ...workspace, pendingSchedule: async action => { if (action === "delete") pendingDraft = null; return pendingDraft; } };
  async function asModule(obj) { const mod = new vm.SyntheticModule(Object.keys(obj), function () { for (const k of Object.keys(obj)) this.setExport(k, obj[k]); }, { context: ctx }); await mod.link(() => {}); await mod.evaluate(); return mod; }
  const readModule = await asModule(reader), workspaceModule = await asModule(nativeWorkspace);
  const opts = { importModuleDynamically: spec => spec.includes('schedule-workspace') ? workspaceModule : readModule };
  new vm.Script(scripts.at(-2), opts).runInContext(ctx);
  new vm.Script(scripts.at(-1), opts).runInContext(ctx);
  await until(() => calls.some(c => c.url.includes('/sessions'))); await flush();
  return { nodes, win, calls, reads, releaseFind: () => releaseFind({ pages: Math.max(...plannedPages), door_schedule_pages: plannedPages, hardware_pages: [], details: [{ door_schedule: { rows: 65 } }] }) };
}

test('guest first read: discovery awaited, no account/upload call, real 65 rows, named section, terminal status', async () => {
  const f = await fixture();
  assert.equal(f.nodes.app.classList.contains('hide'), false);
  await f.nodes['f-file'].emit('change');
  await f.nodes['upload-form'].emit('submit');
  await flush();
  assert.equal(f.reads.length, 0, 'submit cannot outrun discovery');
  assert.equal(f.nodes['upload-btn'].disabled, true);
  f.releaseFind();
  await until(() => f.nodes['upload-result'].textContent.includes('read complete'));
  assert.deepEqual(f.reads, [1]);
  assert.equal((f.nodes['doors-wrap'].innerHTML.match(/data-door=/g) || []).length, 65);
  assert.equal((f.nodes['doors-wrap'].innerHTML.match(/src-cite/g) || []).length, 65);
  assert.match(f.nodes['hardware-needed'].innerHTML, /Section 08 71 00/);
  assert.equal(f.nodes['guest-save'].classList.contains('hide'), false);
  assert.equal(f.calls.filter(c => c.method === 'POST').length, 0);
  assert.doesNotMatch(f.nodes['upload-result'].textContent, /Reading/i);
  assert.equal(f.nodes['upload-btn'].disabled, false);
  assert.doesNotMatch(f.nodes['doors-wrap'].innerHTML, /HW group|hardware sets/i);
  assert.equal(f.nodes['list-actions'].children[0].textContent, 'DOWNLOAD THE DOOR LIST (CSV)');
});

test('account upload success also replaces Reading with completion', async () => {
  const f = await fixture({ authed: true }); f.releaseFind();
  await f.nodes['upload-form'].emit('submit');
  await until(() => f.nodes['upload-result'].textContent.includes('read complete'));
  assert.equal(f.calls.filter(c => c.url.endsWith('/start')).length, 1);
  assert.match(f.nodes['extract-result'].innerHTML, /65 doors/);
  assert.doesNotMatch(f.nodes['upload-result'].textContent, /Reading/i);
  assert.equal(f.nodes['upload-btn'].disabled, false);
});

test('stopping a guest read between pages reports partial completion and retains the first page', async () => {
  const f = await fixture({ plannedPages: [1, 2], stopAfterPage: 1 });
  f.releaseFind();
  await f.nodes['upload-form'].emit('submit');
  await until(() => f.nodes['upload-result'].textContent.includes('read finished with page errors'));
  assert.deepEqual(f.reads, [1]);
  assert.match(f.nodes['extract-result'].textContent, /Partial machine read: reading stopped; 1 selected page\(s\) were not read/);
  assert.match(f.nodes['takeoff'].textContent, /Partial read: reading stopped before all selected pages completed/);
  assert.equal((f.nodes['doors-wrap'].innerHTML.match(/data-door=/g) || []).length, 65);
  assert.equal(f.nodes['upload-btn'].disabled, false);
  assert.doesNotMatch(f.nodes['upload-result'].textContent, /read complete/);
});

test('stopping an account browser read between pages reports skipped pages instead of success', async () => {
  const f = await fixture({ authed: true, plannedPages: [1, 2], stopAfterPage: 1 });
  f.releaseFind();
  await f.nodes['upload-form'].emit('submit');
  await until(() => f.nodes['upload-result'].textContent.includes('read finished with page errors'));
  assert.deepEqual(f.reads, [1]);
  assert.match(f.nodes['extract-result'].textContent, /Partial machine read: reading stopped; 1 selected page\(s\) were not read/);
  assert.equal(f.calls.filter(c => c.url.includes('/page/1/extract-result')).length, 1);
  assert.equal(f.calls.filter(c => c.url.includes('/page/2')).length, 0);
  assert.equal(f.nodes['upload-btn'].disabled, false);
});

test('failed upload clears busy status and permits retry', async () => {
  const f = await fixture({ authed: true, failUpload: true }); f.releaseFind();
  await f.nodes['upload-form'].emit('submit');
  await until(() => f.nodes['upload-result'].textContent.includes('Upload unavailable'));
  assert.equal(f.nodes['upload-btn'].disabled, false);
  assert.doesNotMatch(f.nodes['upload-result'].textContent, /Reading/i);
});

// Evaluate the real sign-in view, including its event handlers, without a network.
test('one code-first door explains new accounts; code send and wrong-code response work', async () => {
  const shell = readFileSync(new URL('../../assets/weyland-shell.js', import.meta.url), 'utf8');
  const fn = shell.slice(shell.indexOf('  function viewSignIn('), shell.indexOf('  // ---------- choose a new password'));
  const nodes = {}, calls = [];
  const h = (_, attrs = {}, children = []) => { const el = new Element(); el.attrs = attrs || {}; el.textContent = attrs?.text || ''; el.children = children; if (attrs?.id) nodes[attrs.id] = el; if (attrs?.style === 'display:none') el.style.display = 'none'; if (attrs?.onsubmit) el.addEventListener('submit', attrs.onsubmit); return el; };
  const ctx = vm.createContext({ S: { status: 'signed-out' }, window: {}, h, signinHint: () => null, errorBox: () => new Element(), noteBox: () => new Element(), show: (_, card) => { ctx.card = card; }, validEmail: s => s.includes('@'), showError: (el, msg) => { ctx.lastError = msg; }, say: (el, msg) => { ctx.note = msg; }, AF_CLIENT: 'local', AF_VENTURE: 'local', setTimeout: fn => fn(),
    authforCall: async (url, body) => { calls.push({ url, body }); return url.endsWith('/verify') ? { ok: false, status: 401, data: { code: 'CODE_INVALID', attempts_left: 4 } } : { ok: true, status: 200, data: { token: 'local-request', sent: true } }; },
    authforMessage: () => '',
  });
  vm.runInContext(fn + '\nviewSignIn();', ctx);
  const form = nodes['weyland-signin-form'];
  const pwPart = form.children.find(el => el.children?.includes(nodes['weyland-signin-password']));
  assert.equal(pwPart.style.display, 'none');
  assert.equal(nodes['weyland-signin-code-send'].style.display, 'block');
  const text = ctx.card.children.map(el => el.textContent).join(' ');
  assert.match(text, /same code verifies your email/);
  assert.match(text, /No password or card needed/);
  assert.doesNotMatch(text, /Create a free account/);
  nodes['weyland-signin-email'].value = 'fixture@example.test';
  await nodes['weyland-signin-code-send'].emit('click'); await flush();
  assert.equal(calls[0].url, '/api/v1/auth/magic-link');
  assert.match(ctx.note, /15 minutes/);
  nodes['weyland-signin-code'].value = '0000 0000';
  await form.emit('submit'); await flush();
  assert.equal(calls[1].body.code, '00000000');
  assert.match(ctx.lastError, /does not match/);
  assert.equal(nodes['weyland-signin-code-submit'].disabled, false);
});

test('walk stays disabled on failure/no match, resets during a new match, and has disabled styling and help', async () => {
  const home = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const tag = home.match(/<button id="hs-walk"[^>]*>/)[0];
  assert.match(tag, /\bdisabled/); assert.match(tag, /aria-describedby="hs-walk-help"/);
  const disabledCss = home.match(/\.button:disabled,\s*\.button:disabled:hover\s*\{([^}]+)\}/)[1];
  assert.match(disabledCss, /opacity:\s*\.5/); assert.match(disabledCss, /cursor:\s*not-allowed/); assert.match(disabledCss, /background:\s*var\(--panel\)/);
  const a = home.indexOf('    var hsRun ='), b = home.indexOf('    // 5b4b.', a);
  const nodes = Object.fromEntries(['hs-run', 'hs-walk', 'hs-text', 'hs-note', 'hs-results', 'hs-walk-help'].map(k => [k, new Element()]));
  nodes['hs-walk'].disabled = true; nodes['hs-text'].value = 'LCN 4040XP';
  let matched = true, failure = false;
  const ctx = vm.createContext({ document: { getElementById: id => nodes[id] }, window: new Element(), performance,
    ephemeralToken: async () => 'local', hsEsc: v => v, OFFER_LINE: '$100', OFFER_SKU: 'test', paintOffer() {}, dossierRead: () => ({}), dossierWrite() {},
    fetch: async () => ({ ok: !failure, status: failure ? 503 : 200, json: async () => ({ summary: { matched: matched ? 1 : 0, total: 1 }, results: matched ? [{ matched: true, product: { model: '4040XP', manufacturer: 'LCN' } }] : [], error: 'fixture error' }) }),
  });
  vm.runInContext(home.slice(a, b), ctx);
  await nodes['hs-run'].emit('click'); await until(() => !nodes['hs-run'].disabled);
  assert.equal(nodes['hs-walk'].disabled, false); assert.match(nodes['hs-walk-help'].textContent, /Ready to walk/);
  matched = false;
  await nodes['hs-run'].emit('click'); assert.equal(nodes['hs-walk'].disabled, true); await until(() => !nodes['hs-run'].disabled);
  assert.equal(nodes['hs-walk'].disabled, true); assert.match(nodes['hs-walk-help'].textContent, /Match at least one/);
  failure = true; await nodes['hs-run'].emit('click'); await until(() => !nodes['hs-run'].disabled);
  assert.equal(nodes['hs-walk'].disabled, true);
});


test('sign-in resumes the selected PDF before opening another job or allocating a demo', async () => {
  const f = await fixture({ authed: true, pendingDraft: { file: sheet, project: 'Rockford guest', type: 'door_schedule' } });
  f.releaseFind();
  await until(() => f.nodes['upload-result'].textContent.includes('read complete'));
  assert.equal(f.calls.filter(c => c.url.endsWith('/start')).length, 1);
  assert.equal(f.calls.filter(c => c.url.includes('/api/demo/')).length, 0);
  assert.equal((f.nodes['doors-wrap'].innerHTML.match(/data-door=/g) || []).length, 65);
});
