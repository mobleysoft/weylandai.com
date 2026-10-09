// Actual shipped SDK and sign-in handlers, disposable browser/request fixtures.
// No account, email, credential, network, or visual-acceptance claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const sdkSource = readFileSync(new URL('../../assets/authfor-integration-standard.js', import.meta.url), 'utf8');
const shellSource = readFileSync(new URL('../../assets/weyland-shell.js', import.meta.url), 'utf8');
const now = Date.parse('2026-10-09T20:00:00Z');
const jwt = exp => 'header.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.signature';
const session = (refresh = 'r1') => ({ token: jwt(now / 1000 + 3600), session_id: 's1', refresh_token: refresh, user: { id: 'u1', email: 'fixture@example.test' } });
const answer = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const flush = () => new Promise(r => setImmediate(r));
async function until(fn) { for (let i = 0; i < 100; i++) { if (fn()) return; await flush(); } throw new Error('Fixture condition timed out'); }
function storage() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) };
}
function locks() {
  const tails = new Map();
  return { request(name, callback) { const p = (tails.get(name) || Promise.resolve()).then(callback); tails.set(name, p.catch(() => {})); return p; } };
}
function browser({ fetchImpl = async () => answer({}), localStorage = storage(), webLocks } = {}) {
  const calls = [], timers = new Map(), events = [];
  let timerId = 0, reloads = 0;
  class Clock extends Date { static now() { return now; } }
  const window = { location: { origin: 'https://weylandai.com', search: '', reload() { reloads++; } },
    navigator: { locks: webLocks }, dispatchEvent: event => events.push(event) };
  const context = vm.createContext({ window, document: { querySelector: () => null }, localStorage, sessionStorage: storage(),
    Date: Clock, URLSearchParams, URL, atob, console, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, clearTimeout: id => timers.delete(id),
    fetch: async (url, init = {}) => { calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null }); return fetchImpl(url, init); },
  });
  vm.runInContext(sdkSource, context);
  const auth = new window.AuthForStandard({ clientId: 'af_weyland_login', ventureName: 'weylandai.com' });
  return { context, window, auth, calls, timers, events, localStorage, reloads: () => reloads };
}

// A small DOM tree built from the SDK's actual template. Visibility includes
// ancestors, so showing a child of a hidden login container cannot pass.
function standardLoginDOM() {
  const ids = new Map();
  let focused = null;
  class Node {
    constructor(tag, parent = null, attributes = '') {
      this.tag = tag; this.parentNode = parent; this.children = []; this.style = {};
      this.value = ''; this.disabled = false; this.textContent = '';
      const attrs = Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
      if (attrs.id) ids.set(attrs.id, this);
      for (const pair of (attrs.style || '').split(';')) {
        const at = pair.indexOf(':');
        if (at >= 0) this.style[pair.slice(0, at).trim()] = pair.slice(at + 1).trim();
      }
      if (parent) parent.children.push(this);
    }
    focus() { focused = this; }
    visible() { return this.style.display !== 'none' && (!this.parentNode || this.parentNode.visible()); }
    set innerHTML(html) {
      this.children = []; ids.clear(); ids.set('login-ui', this);
      const stack = [this];
      for (const match of html.matchAll(/<(\/)?([a-z][\w-]*)([^>]*)>/gi)) {
        const [, closing, tag, attributes] = match;
        if (closing) { if (stack.length > 1) stack.pop(); continue; }
        const child = new Node(tag.toLowerCase(), stack.at(-1), attributes);
        if (!['input', 'br', 'hr', 'img', 'meta', 'link'].includes(child.tag)) stack.push(child);
      }
    }
  }
  const root = new Node('div');
  return { root, ids, focused: () => focused,
    document: { querySelector: selector => selector === '#login-ui' ? root : null, getElementById: id => ids.get(id) || null } };
}

test('SDK standard login keeps MFA controls visible through failure, retry and success', async () => {
  let factorAttempts = 0;
  const issued = session();
  const f = browser({ fetchImpl: async url => {
    if (url.endsWith('/login')) return answer({ mfa_required: true, challenge: 'standard-ui-challenge' });
    if (++factorAttempts === 1) return answer({ code: 'UNAUTHORIZED' }, 401);
    // Actual AuthFor MFA verification returns credentials without a user object.
    return answer({ token: issued.token, session_id: issued.session_id, refresh_token: issued.refresh_token, mfa_verified: true });
  } });
  const dom = standardLoginDOM(), alerts = [];
  Object.assign(f.context, { document: dom.document, alert: message => alerts.push(message) });
  f.auth._showLoginUI();
  dom.ids.get('authfor-email').value = 'fixture@example.test';
  dom.ids.get('authfor-password').value = 'fixture-password';
  await dom.ids.get('authfor-login-btn').onclick();
  assert.equal(dom.root.visible(), true);
  assert.equal(dom.ids.get('authfor-primary').visible(), false);
  assert.equal(dom.ids.get('authfor-mfa-code').visible(), true);
  assert.equal(dom.ids.get('authfor-mfa-btn').visible(), true);
  assert.equal(dom.focused(), dom.ids.get('authfor-mfa-code'));
  assert.equal(f.localStorage.getItem('_authfor_token'), null);
  dom.ids.get('authfor-mfa-code').value = '111111';
  await dom.ids.get('authfor-mfa-btn').onclick();
  assert.equal(alerts.length, 1);
  assert.equal(dom.ids.get('authfor-mfa-code').visible(), true);
  assert.equal(dom.ids.get('authfor-mfa-btn').disabled, false);
  assert.equal(f.localStorage.getItem('_authfor_token'), null);
  dom.ids.get('authfor-mfa-code').value = '123456';
  await dom.ids.get('authfor-mfa-btn').onclick();
  assert.deepEqual(f.calls[2].body, { challenge: 'standard-ui-challenge', totp_code: '123456' });
  assert.equal(f.auth.isAuthenticated(), true);
  assert.equal(dom.root.visible(), false);
  assert.equal(f.events.length, 1);
});

test('SDK password MFA retains a challenge and sends challenge/totp_code before saving a session', async () => {
  const f = browser({ fetchImpl: async url => answer(url.endsWith('/login') ? { mfa_required: true, challenge: 'c1' } : session()) });
  const result = await f.auth.login('fixture@example.test', 'fixture-password');
  assert.equal(result.mfa_required, true);
  assert.equal(f.auth._mfaPending, 'c1');
  assert.equal(f.localStorage.getItem('_authfor_token'), null);
  assert.equal(f.events.length, 0);
  await f.auth.verifyMFA('123456');
  assert.deepEqual(f.calls[1].body, { challenge: 'c1', totp_code: '123456' });
  assert.equal(f.localStorage.getItem('_authfor_refresh'), 'r1');
  assert.equal(f.events.length, 1);
});

test('SDK code and reset answers use the same MFA challenge contract', async () => {
  for (const primary of ['code', 'reset']) {
    const f = browser({ fetchImpl: async () => answer(session()) });
    assert.equal(f.auth._processAuthResponse({ mfa_required: true, challenge: primary }).mfa_required, true);
    assert.equal(f.auth.isAuthenticated(), false);
    assert.equal(f.localStorage.getItem('_authfor_token'), null);
    await f.auth.verifyMFA('654321');
    assert.deepEqual(f.calls[0].body, { challenge: primary, totp_code: '654321' });
  }
});

test('SDK retains the legacy MFA alias when an older server explicitly returns it', async () => {
  const f = browser({ fetchImpl: async () => answer(session()) });
  f.auth._processAuthResponse({ mfa_required: true, mfa_token: 'legacy' });
  await f.auth.verifyMFA('123456');
  assert.deepEqual(f.calls[0].body, { mfa_token: 'legacy', code: '123456' });
});

test('SDK treats HTTP 202 email proof as a pending registration, without undefined credentials', async () => {
  const f = browser({ fetchImpl: async () => answer({ code: 'EMAIL_CODE_REQUIRED', verification_required: true }, 202) });
  await assert.rejects(f.auth.register('fixture@example.test', 'fixture-password', 'Fixture'), /Confirm your email/);
  assert.equal(f.localStorage.getItem('_authfor_token'), null);
  assert.equal(f.events.length, 0);
});

test('SDK concurrent refresh callers share one rotation and retain the next complete pair', async () => {
  const first = deferred();
  let rotations = 0;
  const f = browser({ fetchImpl: async () => ++rotations === 1 ? first.promise : answer(session('r3')) });
  f.auth._processAuthResponse(session());
  const a = f.auth._refreshSession(), b = f.auth._refreshSession(), c = f.auth._refreshSession();
  assert.equal(a, b); assert.equal(a, c);
  await until(() => f.calls.length === 1);
  assert.deepEqual(f.calls[0].body, { refresh_token: 'r1', session_id: 's1' });
  first.resolve(answer(session('r2')));
  await Promise.all([a, b, c]);
  assert.equal(f.auth._refreshToken, 'r2');
  assert.equal(f.localStorage.getItem('_authfor_refresh'), 'r2');
  await f.auth._refreshSession();
  assert.deepEqual(f.calls[1].body, { refresh_token: 'r2', session_id: 's1' });
  assert.equal(f.localStorage.getItem('_authfor_refresh'), 'r3');
});

test('SDK two tabs sharing a Web Lock do not replay the same refresh secret', async () => {
  const shared = storage(), webLocks = locks(), first = deferred();
  let rotations = 0;
  const fetchImpl = async () => { rotations++; return first.promise; };
  const a = browser({ localStorage: shared, webLocks, fetchImpl });
  a.auth._processAuthResponse(session());
  const b = browser({ localStorage: shared, webLocks, fetchImpl });
  const pa = a.auth._refreshSession(), pb = b.auth._refreshSession();
  await until(() => rotations === 1);
  first.resolve(answer(session('r2')));
  await Promise.all([pa, pb]);
  assert.equal(rotations, 1);
  assert.equal(a.auth._refreshToken, 'r2'); assert.equal(b.auth._refreshToken, 'r2');
});

test('SDK refresh timer uses the one-hour access expiry, including an exact expired token', () => {
  const f = browser();
  f.auth._processAuthResponse(session());
  assert.equal([...f.timers.values()][0].ms, 59 * 60 * 1000);
  f.auth._processAuthResponse({ ...session(), token: jwt(now / 1000) });
  assert.equal([...f.timers.values()][0].ms, 0);
});

test('SDK untyped legacy token gets a one-hour refresh fallback, never 24 hours', () => {
  const f = browser();
  f.auth._processAuthResponse({ ...session(), token: 'legacy-token' });
  assert.equal([...f.timers.values()][0].ms, 59 * 60 * 1000);
});

test('SDK an in-flight refresh cannot restore credentials after logout', async () => {
  const refresh = deferred();
  const f = browser({ fetchImpl: async url => url.endsWith('/refresh') ? refresh.promise : answer({}) });
  f.auth._processAuthResponse(session());
  const pending = f.auth._refreshSession();
  await until(() => f.calls.length === 1);
  await f.auth.logout();
  refresh.resolve(answer(session('r2')));
  await assert.rejects(pending, /Session changed/);
  assert.equal(f.localStorage.getItem('_authfor_token'), null);
  assert.equal(f.localStorage.getItem('_authfor_refresh'), null);
  assert.equal(f.auth.getToken(), null);
});

test('SDK logout clears its owned local session before the remote answer and revokes the captured pair', async () => {
  const remote = deferred();
  const f = browser({ fetchImpl: async () => remote.promise });
  const old = session();
  f.auth._processAuthResponse(old);
  const pending = f.auth.logout();
  assert.equal(f.auth.getToken(), null);
  assert.equal(f.auth._sessionId, null);
  assert.equal(f.localStorage.getItem('_authfor_token'), null);
  assert.equal(f.localStorage.getItem('_authfor_session'), null);
  assert.equal(f.localStorage.getItem('_authfor_refresh'), null);
  assert.equal(f.timers.size, 0);
  assert.equal(f.calls[0].init.headers.Authorization, 'Bearer ' + old.token);
  assert.deepEqual(f.calls[0].body, { session_id: old.session_id });
  remote.resolve(answer({}));
  await pending;
  assert.equal(f.reloads(), 1);
});

test('SDK delayed logout preserves another tab primary sign-in and does not reload', async () => {
  const shared = storage(), remote = deferred();
  const a = browser({ localStorage: shared, fetchImpl: async () => remote.promise });
  a.auth._processAuthResponse(session());
  const pending = a.auth.logout();
  const b = browser({ localStorage: shared });
  const next = { ...session('new-tab-refresh'), token: jwt(now / 1000 + 7200), session_id: 'new-tab-session' };
  b.auth._processAuthResponse(next);
  remote.resolve(answer({}));
  await pending;
  assert.equal(shared.getItem('_authfor_session'), next.session_id);
  assert.equal(shared.getItem('_authfor_token'), next.token);
  assert.equal(shared.getItem('_authfor_refresh'), next.refresh_token);
  assert.equal(b.auth.getToken(), next.token);
  assert.equal(b.timers.size, 1);
  assert.equal(a.reloads(), 0);
});

test('SDK delayed logout preserves a newer sign-in on the same instance and its timer', async () => {
  const remote = deferred();
  const f = browser({ fetchImpl: async () => remote.promise });
  f.auth._processAuthResponse(session());
  const pending = f.auth.logout();
  const next = { ...session('new-instance-refresh'), token: jwt(now / 1000 + 7200), session_id: 'new-instance-session' };
  f.auth._processAuthResponse(next);
  remote.resolve(answer({}));
  await pending;
  assert.equal(f.auth.getToken(), next.token);
  assert.equal(f.auth._sessionId, next.session_id);
  assert.equal(f.auth._refreshToken, next.refresh_token);
  assert.equal(f.localStorage.getItem('_authfor_session'), next.session_id);
  assert.equal(f.timers.size, 1);
  assert.equal(f.reloads(), 0);
});

test('SDK a stale tab logout does not clear a newer stored primary session', async () => {
  const shared = storage(), remote = deferred();
  const a = browser({ localStorage: shared, fetchImpl: async () => remote.promise });
  a.auth._processAuthResponse(session());
  const b = browser({ localStorage: shared });
  const next = { ...session('already-new-refresh'), session_id: 'already-new-session' };
  b.auth._processAuthResponse(next);
  const pending = a.auth.logout();
  assert.equal(shared.getItem('_authfor_session'), next.session_id);
  assert.deepEqual(a.calls[0].body, { session_id: 's1' });
  remote.resolve(answer({}));
  await pending;
  assert.equal(shared.getItem('_authfor_refresh'), next.refresh_token);
  assert.equal(a.reloads(), 0);
});

test('SDK delayed failed logout preserves a newer primary sign-in', async () => {
  const remote = deferred();
  const f = browser({ fetchImpl: async () => { await remote.promise; throw new Error('fixture network failure'); } });
  f.auth._processAuthResponse(session());
  const pending = f.auth.logout();
  const next = { ...session('new-primary'), session_id: 's2' };
  f.auth._processAuthResponse(next);
  remote.resolve();
  await pending;
  assert.equal(f.localStorage.getItem('_authfor_session'), 's2');
  assert.equal(f.localStorage.getItem('_authfor_refresh'), 'new-primary');
  assert.equal(f.reloads(), 0);
});

test('SDK delayed logout does not reload a newer pending MFA sign-in', async () => {
  const remote = deferred();
  const f = browser({ fetchImpl: async () => remote.promise });
  f.auth._processAuthResponse(session());
  const pending = f.auth.logout();
  f.auth._processAuthResponse({ mfa_required: true, challenge: 'new-primary-challenge' });
  remote.resolve(answer({}));
  await pending;
  assert.equal(f.auth._mfaPending, 'new-primary-challenge');
  assert.equal(f.auth._mfaRequired, true);
  assert.equal(f.reloads(), 0);
});

test('SDK an old refresh timer cannot sign out a newer primary sign-in', async () => {
  const refresh = deferred();
  const f = browser({ fetchImpl: async () => refresh.promise });
  f.auth._processAuthResponse(session());
  const timer = [...f.timers.values()][0].fn();
  await until(() => f.calls.length === 1);
  f.auth._processAuthResponse({ ...session('new-primary'), session_id: 's2' });
  refresh.resolve(answer(session('old-rotation')));
  await timer;
  assert.equal(f.localStorage.getItem('_authfor_session'), 's2');
  assert.equal(f.localStorage.getItem('_authfor_refresh'), 'new-primary');
  assert.equal(f.reloads(), 0);
});

test('SDK a failed refresh uses Weyland shell sign-out without reloading its page', async () => {
  const f = browser({ fetchImpl: async () => answer({ code: 'UNAUTHORIZED' }, 401) });
  let signOuts = 0;
  f.window.WeylandShell = { signOut: async () => { signOuts++; } };
  f.auth._processAuthResponse(session());
  await [...f.timers.values()][0].fn();
  assert.equal(signOuts, 1);
  assert.equal(f.reloads(), 0);
});

test('SDK an old tab timer does not sign out another tab\'s newer session', async () => {
  const shared = storage(), refresh = deferred();
  const a = browser({ localStorage: shared, fetchImpl: async () => refresh.promise });
  a.auth._processAuthResponse(session());
  const timer = [...a.timers.values()][0].fn();
  await until(() => a.calls.length === 1);
  const b = browser({ localStorage: shared });
  b.auth._processAuthResponse({ ...session('new-primary'), session_id: 's2' });
  refresh.resolve(answer(session('old-rotation')));
  await timer;
  assert.equal(shared.getItem('_authfor_session'), 's2');
  assert.equal(shared.getItem('_authfor_refresh'), 'new-primary');
  assert.equal(a.reloads(), 0);
});

class Element {
  constructor(attrs = {}) { this.attrs = attrs; this.style = {}; this.children = []; this.listeners = {}; this.value = ''; this.disabled = false; this.textContent = attrs.text || ''; }
  addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
  async emit(name) { for (const f of this.listeners[name] || []) await f({ preventDefault() {} }); }
  appendChild(child) { this.children.push(child); }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; }
  focus() {} select() {}
}
function shellView({ confirm = false } = {}) {
  const f = browser({ fetchImpl: async url => answer(url.endsWith('/login') ? { mfa_required: true, challenge: 'password-challenge' } : session()) });
  const nodes = {}, requests = [], completions = [];
  const h = (_, attrs, children = []) => {
    const el = new Element(attrs || {}); el.children = children;
    if (attrs?.id) nodes[attrs.id] = el;
    if (attrs?.style === 'display:none') el.style.display = 'none';
    if (attrs?.onsubmit) el.addEventListener('submit', attrs.onsubmit);
    if (attrs?.onclick) el.addEventListener('click', attrs.onclick);
    return el;
  };
  Object.assign(f.context, { S: { status: confirm ? 'signed-in' : 'signed-out', user: confirm ? { email: 'fixture@example.test' } : null }, h,
    sdk: () => f.auth, signinHint: () => null, errorBox: () => new Element(), noteBox: () => new Element(),
    show: () => {}, validEmail: s => s.includes('@'), showError: (_, msg) => { f.context.lastError = msg; }, say() {},
    AF_CLIENT: 'af_weyland_login', AF_VENTURE: 'weylandai.com', rememberCodeSignIn() {},
    afterAuthFor: async (...args) => { completions.push(args); }, authforMessage: () => '',
    setInterval: () => 1, clearInterval() {},
    authforCall: async (url, body) => {
      requests.push({ url, body });
      return url.endsWith('/verify') ? { ok: true, status: 200, data: { mfa_required: true, challenge: 'code-challenge' } }
        : { ok: true, status: 200, data: { token: 'request-id', sent: true } };
    },
  });
  const login = shellSource.slice(shellSource.indexOf('  function authforLogin('), shellSource.indexOf('  function errorBox('));
  const keep = shellSource.slice(shellSource.indexOf('  function keepLogin('), shellSource.indexOf('  function signinHint('));
  const view = shellSource.slice(shellSource.indexOf('  function viewSignIn('), shellSource.indexOf('  // ---------- choose a new password'));
  vm.runInContext(login + keep + view, f.context);
  f.context.viewSignIn('view:account', 'fixture@example.test', undefined, { confirm });
  return { ...f, nodes, requests, completions };
}

test('shell email-code MFA shows its authenticator input and completes only after the factor', async () => {
  const f = shellView();
  await f.nodes['weyland-signin-code-send'].emit('click'); await flush();
  f.nodes['weyland-signin-code'].value = '12345678';
  await f.nodes['weyland-signin-form'].emit('submit'); await flush();
  assert.equal(f.auth._mfaPending, 'code-challenge');
  const pwPart = f.nodes['weyland-signin-form'].children.find(el => el.children.includes(f.nodes['weyland-signin-password']));
  const mfaWrap = pwPart.children.find(el => el.children.includes(f.nodes['weyland-signin-mfa']));
  assert.equal(pwPart.style.display, 'block');
  assert.equal(mfaWrap.style.display, 'block');
  assert.equal(f.nodes['weyland-signin-submit'].textContent, 'VERIFY CODE');
  assert.equal(f.nodes['weyland-signin-password'].required, false);
  assert.equal(f.localStorage.getItem('_authfor_token'), null);
  assert.equal(f.completions.length, 0);
  f.nodes['weyland-signin-mfa'].value = '654321';
  await f.nodes['weyland-signin-form'].emit('submit'); await flush();
  assert.deepEqual(f.calls[0].body, { challenge: 'code-challenge', totp_code: '654321' });
  assert.equal(f.completions.length, 1);
  assert.equal(f.completions[0][2], true);
});

test('shell password MFA uses the shared SDK challenge and never demands another password', async () => {
  const f = shellView();
  await f.nodes['weyland-signin-use-password'].emit('click');
  f.nodes['weyland-signin-password'].value = 'fixture-password';
  await f.nodes['weyland-signin-form'].emit('submit'); await flush();
  assert.equal(f.auth._mfaPending, 'password-challenge');
  assert.equal(f.nodes['weyland-signin-password'].required, false);
  assert.equal(f.completions.length, 0);
  f.nodes['weyland-signin-mfa'].value = '123456';
  await f.nodes['weyland-signin-form'].emit('submit'); await flush();
  assert.deepEqual(f.calls[1].body, { challenge: 'password-challenge', totp_code: '123456' });
  assert.equal(f.completions.length, 1);
});

test('shell signed-in email confirmation requests a purpose its redemption endpoint accepts', async () => {
  const f = shellView({ confirm: true });
  await f.nodes['weyland-signin-code-send'].emit('click'); await flush();
  assert.equal(f.requests[0].body.purpose, 'signin');
  assert.equal(f.nodes['weyland-signin-email'].disabled, true);
});

test('shell reset proof keeps its MFA challenge and completes without another password login', async () => {
  const f = shellView();
  const scratch = storage();
  Object.assign(f.context, { RESET_KEY: 'reset-fixture', ssGet: key => scratch.getItem(key),
    ssSet: (key, value) => scratch.setItem(key, value), ssDel: key => scratch.removeItem(key),
    endSession: async () => { f.context.S.status = 'signed-out'; }, flashSignIn() {},
    authforCall: async (url, body) => {
      f.requests.push({ url, body });
      return { ok: true, status: 200, data: { success: true, email: 'fixture@example.test', mfa_required: true, challenge: 'reset-challenge' } };
    },
  });
  const reset = shellSource.slice(shellSource.indexOf('  function viewReset('), shellSource.indexOf('  // A note on the sign-in view'));
  vm.runInContext(reset, f.context);
  f.context.viewReset('reset-token', 'fixture@example.test');
  f.nodes['weyland-reset-password'].value = 'replacement-password';
  f.nodes['weyland-reset-password2'].value = 'replacement-password';
  await f.nodes['weyland-reset-form'].emit('submit'); await flush();
  assert.deepEqual(JSON.parse(JSON.stringify(f.requests[0].body)), { token: 'reset-token', new_password: 'replacement-password' });
  assert.equal(f.auth._mfaPending, 'reset-challenge');
  assert.equal(f.nodes['weyland-signin-submit'].textContent, 'VERIFY CODE');
  assert.equal(f.calls.length, 0);
  assert.equal(f.localStorage.getItem('_authfor_token'), null);
  f.nodes['weyland-signin-mfa'].value = '123456';
  await f.nodes['weyland-signin-form'].emit('submit'); await flush();
  assert.deepEqual(f.calls[0].body, { challenge: 'reset-challenge', totp_code: '123456' });
  assert.equal(f.completions.length, 1);
  assert.equal(f.completions[0][0], 'view:account');
});

test('SDK registration forwards optional inbox proof and keeps the existing argument contract', async () => {
  const f = browser({ fetchImpl: async () => answer(session()) });
  await f.auth.register('fixture@example.test', 'fixture-password', 'Fixture', { token: 'proof-request', code: '12345678' });
  assert.deepEqual(f.calls[0].body.email_code, { token: 'proof-request', code: '12345678' });
});
