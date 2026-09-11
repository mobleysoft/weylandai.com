// src/lib/sovereign-cdp.js
//
// Step 4 of the vendored-library sovereignty plan (MONOLITH_HELPER_MAP.md
// section 3): a real Chrome DevTools Protocol (CDP) client replacing the
// slice of @cloudflare/puppeteer's bundled client code that this app's
// real call sites actually use. This does NOT replace the browser engine
// - `env.BROWSER` stays Cloudflare's own managed remote Chromium either
// way. CDP itself is Google's open, versioned, documented WebSocket
// JSON-RPC protocol (https://chromedevtools.github.io/devtools-protocol/)
// - this file speaks it directly instead of going through the puppeteer
// package.
//
// Real call-site audit this was built against (re-verified against
// checked-in source before writing a line of this, not assumed from the
// prior audit - see MONOLITH_HELPER_MAP.md section 3 step 4 for the
// full record):
//   - src/lib/cutsheet-discovery.js: browser.newPage(), page.setRequestInterception(true),
//     page.on('request'|'response', cb), request.continue(), page.goto(url, {waitUntil, timeout})
//     returning a response with .status()/.headers(), page.content(), page.url(),
//     page.setUserAgent(string), page.evaluate(fn) (zero-argument, synchronous,
//     browser-context DOM query returning serializable data), page.close().
//   - src/routes/document-generators.js + src/routes/quotes-generate.js: 5 real
//     launch call sites (not 4 - corrected during step 4's re-audit), all
//     identical: page.setContent(html, {waitUntil:'load'}) + page.pdf({format,
//     printBackground, margin}).
//   - src/legacy-monolith.js: 2 of its 3 inline launch sites (discovery_engine_default's
//     queue consumer) only need launch()/close() - they hand `browser` to already-covered
//     cutsheet-discovery.js functions, no new API surface. The 3rd
//     (renderRegionAt600DPI2) is Cluster A sub-step (d) - explicitly deferred in
//     the plan until section 3 steps 3 AND 5 both land, and is entangled with
//     step 5 (PDF rasterization, out of scope here) even though it also touches
//     puppeteer - correctly NOT wired to this client, left untouched.
//   - browser.close() lifecycle at every real call site.
//
// Real protocol details below were read directly out of the vendored
// @cloudflare/puppeteer bundle still in src/legacy-monolith.js (lines
// ~130489-130770 for the acquire/connect/transport chain, ~125025-125100
// for lifecycle-event mapping, ~126714-126749 for request-interception
// setup, ~114027-114442 for PDF paper-format/margin conversion) - not
// guessed from generic CDP docs, so this interoperates with Cloudflare's
// real /v1/acquire + /v1/connectDevtools endpoints byte-for-byte on the
// transport framing.
//
// Deliberate, honest scope narrowing (all of these are real
// simplifications vs. the full puppeteer surface, safe because no real
// call site needs the wider behavior - not silent, listed here):
//   - Target.setAutoAttach is sent with waitForDebuggerOnStart:false (the
//     real client uses true, which requires a follow-up
//     Runtime.runIfWaitingForDebugger to unpause each new target - not
//     needed here since none of our real call sites inject
//     addScriptToEvaluateOnNewDocument-style preload scripts before first
//     navigation).
//   - Page.printToPDF is sent WITHOUT transferMode (defaults to CDP's own
//     "ReturnAsBase64", a normal, spec-legal mode - not "ReturnAsStream" +
//     IO.read chunking, which the real client uses for very large PDFs).
//     Fine for this app's quote/proposal/submittal documents; would need
//     revisiting if a call site ever needs to stream a multi-hundred-page
//     PDF.
//   - content() serializes via `document.doctype` + `documentElement.outerHTML`
//     rather than the real client's per-childNode XMLSerializer walk -
//     functionally equivalent full-HTML output for every real caller
//     (cutsheet-discovery.js's own Cloudflare-challenge substring check).
//   - PDF paper-format table and print-margin unit conversion only
//     supports what real call sites pass (`format: "Letter"`, margins as
//     `"Nin"` strings) plus the small set of other paperFormats entries
//     (public, non-proprietary data) for forward compatibility - not the
//     full unit table (px/cm/mm) the real client supports.

// ---------------------------------------------------------------------
// Section 1: message chunking (real wire framing for Cloudflare's
// /v1/connectDevtools WebSocket - a 4-byte little-endian length prefix
// on the first binary frame of a message, followed by continuation
// frames for anything over 1MB). Pure functions, fully unit-testable
// without a real socket.
// ---------------------------------------------------------------------

const CHUNK_HEADER_SIZE = 4;
const MAX_CHUNK_MESSAGE_SIZE = 1048575;
const FIRST_CHUNK_DATA_SIZE = MAX_CHUNK_MESSAGE_SIZE - CHUNK_HEADER_SIZE;

/** Encode a JSON string into one or more length-prefixed binary chunks. */
export function encodeChunks(jsonString) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(jsonString);
  const firstChunk = new Uint8Array(
    Math.min(MAX_CHUNK_MESSAGE_SIZE, CHUNK_HEADER_SIZE + encoded.length)
  );
  const view = new DataView(firstChunk.buffer);
  view.setUint32(0, encoded.length, true);
  firstChunk.set(encoded.slice(0, FIRST_CHUNK_DATA_SIZE), CHUNK_HEADER_SIZE);
  const chunks = [firstChunk];
  for (let i = FIRST_CHUNK_DATA_SIZE; i < encoded.length; i += MAX_CHUNK_MESSAGE_SIZE) {
    chunks.push(encoded.slice(i, i + MAX_CHUNK_MESSAGE_SIZE));
  }
  return chunks;
}

/**
 * Try to assemble a complete message from an accumulating chunk buffer.
 * Mutates `chunks` in place (splices off consumed chunks), same
 * contract as the real client's chunksToMessage - callers keep pushing
 * incoming binary frames into the same array and calling this after
 * each push. Returns null until a complete message is available.
 */
export function decodeChunks(chunks) {
  if (chunks.length === 0) return null;
  const empty = new Uint8Array(0);
  const firstChunk = chunks[0] || empty;
  if (firstChunk.length < CHUNK_HEADER_SIZE) return null;
  const view = new DataView(firstChunk.buffer, firstChunk.byteOffset, firstChunk.byteLength);
  const expectedBytes = view.getUint32(0, true);
  let totalBytes = -CHUNK_HEADER_SIZE;
  for (let i = 0; i < chunks.length; i++) {
    const cur = chunks[i] || empty;
    totalBytes += cur.length;
    if (totalBytes > expectedBytes) {
      throw new Error('Received more bytes than the chunked message header declared');
    }
    if (totalBytes === expectedBytes) {
      const consumed = chunks.splice(0, i + 1);
      consumed[0] = firstChunk.subarray(CHUNK_HEADER_SIZE);
      const combined = new Uint8Array(expectedBytes);
      let offset = 0;
      for (const c of consumed) {
        combined.set(c, offset);
        offset += c.length;
      }
      return new TextDecoder().decode(combined);
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// Section 2: transport - wraps Cloudflare's real acquire/connect
// endpoints and the chunked WebSocket above.
// ---------------------------------------------------------------------

const CF_BROWSER_RENDERING_HOST = 'https://fake.host';
const CLIENT_ID = 'sovereign-cdp-client/1.0';

/** Acquire a new remote browser session. Real endpoint: GET /v1/acquire. */
export async function acquireBrowserSession(endpoint, options = {}) {
  const params = new URLSearchParams();
  if (options.keepAlive) params.set('keep_alive', String(options.keepAlive));
  if (options.location) params.set('location', options.location);
  const url = `${CF_BROWSER_RENDERING_HOST}/v1/acquire?${params.toString()}`;
  const res = await endpoint.fetch(url);
  const text = await res.text();
  if (res.status !== 200) {
    throw new Error(`Unable to acquire browser session: ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

/**
 * Real transport: length-prefixed chunked JSON-RPC messages over a
 * WebSocket obtained via Cloudflare's fetch-based Upgrade: websocket
 * handshake to /v1/connectDevtools?browser_session=<id>. Ping keepalive
 * every 1s, matching the real client's behavior (Cloudflare's edge
 * appears to expect this to keep the session alive).
 */
class ChunkedWebSocketTransport {
  static async create(endpoint, sessionId) {
    const path = `${CF_BROWSER_RENDERING_HOST}/v1/connectDevtools?browser_session=${sessionId}`;
    const res = await endpoint.fetch(path, {
      headers: { Upgrade: 'websocket', 'cf-brapi-client': CLIENT_ID },
    });
    if (!res.webSocket) {
      throw new Error(`Failed to upgrade to websocket for session ${sessionId}: HTTP ${res.status}`);
    }
    res.webSocket.accept();
    return new ChunkedWebSocketTransport(res.webSocket, sessionId);
  }

  constructor(ws, sessionId) {
    this.ws = ws;
    this.sessionId = sessionId;
    this.chunks = [];
    this.onmessage = null;
    this.onclose = null;
    this.pingInterval = setInterval(() => {
      try {
        this.ws.send('ping');
      } catch {
        // socket already closed; the close handler will fire separately
      }
    }, 1000);
    this.ws.addEventListener('message', (event) => {
      this.chunks.push(new Uint8Array(event.data));
      const message = decodeChunks(this.chunks);
      if (message !== null && this.onmessage) this.onmessage(message);
    });
    this.ws.addEventListener('close', () => {
      clearInterval(this.pingInterval);
      if (this.onclose) this.onclose();
    });
    this.ws.addEventListener('error', () => {
      clearInterval(this.pingInterval);
    });
  }

  send(jsonString) {
    for (const chunk of encodeChunks(jsonString)) this.ws.send(chunk);
  }

  close() {
    clearInterval(this.pingInterval);
    try {
      this.ws.close();
    } catch {
      // already closed
    }
  }
}

// ---------------------------------------------------------------------
// Section 3: JSON-RPC connection - id/response matching and
// method+sessionId-scoped event dispatch. This is the part a fake
// transport can exercise fully offline.
// ---------------------------------------------------------------------

export class CDPConnection {
  constructor(transport) {
    this._transport = transport;
    this._lastId = 0;
    this._callbacks = new Map(); // id -> {resolve, reject}
    this._listeners = new Map(); // `${sessionId||''}:${method}` -> Set<fn>
    transport.onmessage = (raw) => this._onMessage(raw);
    transport.onclose = () => this._onClose();
  }

  send(method, params = {}, sessionId) {
    const id = ++this._lastId;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, { resolve, reject });
      this._transport.send(JSON.stringify(message));
    });
  }

  on(sessionId, method, fn) {
    const key = `${sessionId || ''}:${method}`;
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    this._listeners.get(key).add(fn);
    return () => this._listeners.get(key)?.delete(fn);
  }

  _onMessage(raw) {
    let object;
    try {
      object = JSON.parse(raw);
    } catch {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(object, 'id')) {
      const cb = this._callbacks.get(object.id);
      if (!cb) return;
      this._callbacks.delete(object.id);
      if (object.error) {
        cb.reject(new Error(object.error.message || 'CDP error'));
      } else {
        cb.resolve(object.result);
      }
      return;
    }
    if (object.method) {
      const key = `${object.sessionId || ''}:${object.method}`;
      const set = this._listeners.get(key);
      if (set) for (const fn of set) fn(object.params || {});
    }
  }

  _onClose() {
    for (const [, cb] of this._callbacks) {
      cb.reject(new Error('CDP connection closed'));
    }
    this._callbacks.clear();
  }

  close() {
    this._transport.close();
  }
}

/** Real connect: acquire() already ran, this wraps the transport + does
 * the browser-level Target.setAutoAttach so newPage() gets
 * Target.attachedToTarget events for targets it creates. */
export async function connectBrowser(endpoint, sessionId) {
  const transport = await ChunkedWebSocketTransport.create(endpoint, sessionId);
  const connection = new CDPConnection(transport);
  await connection.send('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: false,
    flatten: true,
  });
  return connection;
}

/** Real launch: PuppeteerWorkers.launch()'s own acquire()->connect()
 * sequence, traced in full for the step-1 `ws` deletion and re-used
 * here unchanged. */
export async function launchBrowser(endpoint, options = {}) {
  const { sessionId } = await acquireBrowserSession(endpoint, options);
  const connection = await connectBrowser(endpoint, sessionId);
  return new Browser(connection);
}

// ---------------------------------------------------------------------
// Section 4: Browser / Page - the puppeteer-shaped surface real call
// sites actually use.
// ---------------------------------------------------------------------

const LIFECYCLE_EVENT_NAMES = {
  load: 'load',
  domcontentloaded: 'DOMContentLoaded',
  networkidle0: 'networkIdle',
  networkidle2: 'networkAlmostIdle',
};

export class Browser {
  constructor(connection) {
    this._connection = connection;
    // Real CDP quirk this fixes: Target.attachedToTarget for a target
    // created via Target.createTarget can arrive on the wire BEFORE
    // that command's own response does (they're two independent
    // messages; Chrome doesn't guarantee response-before-event
    // ordering). A listener registered only *after* awaiting
    // createTarget's response - the first version of this file did
    // that - can miss an event that already fired, hanging forever.
    // The real puppeteer client avoids this the same way: a single
    // persistent, connection-level attach listener that starts
    // tracking every attach as soon as the browser exists, independent
    // of any specific newPage() call being "ready" to receive it.
    this._attachedSessions = new Map(); // targetId -> sessionId
    this._attachWaiters = new Map(); // targetId -> Array<(sessionId) => void>
    this._connection.on(undefined, 'Target.attachedToTarget', (params) => {
      const targetId = params.targetInfo && params.targetInfo.targetId;
      if (!targetId) return;
      this._attachedSessions.set(targetId, params.sessionId);
      const waiters = this._attachWaiters.get(targetId);
      if (waiters) {
        this._attachWaiters.delete(targetId);
        for (const resolve of waiters) resolve(params.sessionId);
      }
    });
  }

  _waitForAttachedSession(targetId, timeoutMs = 30000) {
    if (this._attachedSessions.has(targetId)) {
      return Promise.resolve(this._attachedSessions.get(targetId));
    }
    return new Promise((resolve, reject) => {
      const onAttach = (sessionId) => {
        clearTimeout(timer);
        resolve(sessionId);
      };
      const timer = setTimeout(() => {
        const list = this._attachWaiters.get(targetId);
        if (list) {
          const idx = list.indexOf(onAttach);
          if (idx >= 0) list.splice(idx, 1);
          if (list.length === 0) this._attachWaiters.delete(targetId);
        }
        reject(new Error(`Timed out waiting for Target.attachedToTarget for ${targetId}`));
      }, timeoutMs);
      if (!this._attachWaiters.has(targetId)) this._attachWaiters.set(targetId, []);
      this._attachWaiters.get(targetId).push(onAttach);
    });
  }

  async newPage() {
    const { targetId } = await this._connection.send('Target.createTarget', {
      url: 'about:blank',
    });
    const sessionId = await this._waitForAttachedSession(targetId);
    const page = new Page(this._connection, sessionId, targetId);
    await page._initialize();
    return page;
  }

  async close() {
    try {
      await this._connection.send('Browser.close');
    } catch {
      // best-effort - the session may already be gone server-side
    }
    this._connection.close();
  }
}

class Request {
  constructor(connection, sessionId, event) {
    this._connection = connection;
    this._sessionId = sessionId;
    this._event = event;
  }

  url() {
    return this._event.request.url;
  }

  async continue() {
    await this._connection.send(
      'Fetch.continueRequest',
      { requestId: this._event.requestId },
      this._sessionId
    );
  }
}

class Response {
  constructor(url, status, headers) {
    this._url = url;
    this._status = status;
    this._headers = {};
    for (const [k, v] of Object.entries(headers || {})) {
      this._headers[k.toLowerCase()] = v;
    }
  }

  url() {
    return this._url;
  }

  status() {
    return this._status;
  }

  headers() {
    return this._headers;
  }
}

export class Page {
  constructor(connection, sessionId, targetId) {
    this._connection = connection;
    this._sessionId = sessionId;
    this._targetId = targetId;
    this._url = 'about:blank';
    this._executionContextId = null;
    this._requestInterceptionEnabled = false;
    this._listeners = { request: [], response: [] };
    this._offHandlers = [];

    this._offHandlers.push(
      connection.on(sessionId, 'Runtime.executionContextCreated', (params) => {
        this._executionContextId = params.context.id;
      }),
      connection.on(sessionId, 'Page.frameNavigated', (params) => {
        if (params.frame && !params.frame.parentId) this._url = params.frame.url;
      }),
      connection.on(sessionId, 'Fetch.requestPaused', (event) => {
        const req = new Request(connection, sessionId, event);
        for (const fn of this._listeners.request) fn(req);
      }),
      connection.on(sessionId, 'Network.responseReceived', (event) => {
        const res = new Response(event.response.url, event.response.status, event.response.headers);
        for (const fn of this._listeners.response) fn(res);
        if (event.type === 'Document' && event.frameId === this._targetId) {
          this._pendingNavigationResponse = res;
        }
      })
    );
  }

  async _initialize() {
    await this._connection.send('Page.enable', {}, this._sessionId);
    await this._connection.send('Page.setLifecycleEventsEnabled', { enabled: true }, this._sessionId);
    await this._connection.send('Network.enable', {}, this._sessionId);
    await this._connection.send('Runtime.enable', {}, this._sessionId);
  }

  on(event, fn) {
    if (!this._listeners[event]) throw new Error(`Unsupported page event: ${event}`);
    this._listeners[event].push(fn);
  }

  url() {
    return this._url;
  }

  async setUserAgent(userAgent) {
    await this._connection.send('Network.setUserAgentOverride', { userAgent }, this._sessionId);
  }

  async setRequestInterception(value) {
    this._requestInterceptionEnabled = value;
    if (value) {
      await this._connection.send(
        'Fetch.enable',
        { handleAuthRequests: true, patterns: [{ urlPattern: '*' }] },
        this._sessionId
      );
      await this._connection.send('Network.setCacheDisabled', { cacheDisabled: true }, this._sessionId);
    } else {
      await this._connection.send('Fetch.disable', {}, this._sessionId);
      await this._connection.send('Network.setCacheDisabled', { cacheDisabled: false }, this._sessionId);
    }
  }

  /** Real lifecycle wait, driven by Chrome's own Page.lifecycleEvent -
   * not a reimplemented network-idle heuristic. Returns a cancellable
   * controller rather than a bare promise: callers that bail out early
   * (a navigate error, an evaluate() throw) must cancel the pending
   * listener/timer explicitly, or leak a timer and produce an
   * unhandled rejection once the timeout eventually fires on a promise
   * nobody is still awaiting. */
  _watchLifecycle(waitUntil, loaderId, timeoutMs) {
    const wanted = new Set(
      (Array.isArray(waitUntil) ? waitUntil : [waitUntil]).map((v) => {
        const mapped = LIFECYCLE_EVENT_NAMES[v];
        if (!mapped) throw new Error(`Unknown waitUntil value: ${v}`);
        return mapped;
      })
    );
    const seen = new Set();
    let off = () => {};
    let timer;
    let settled = false;
    const promise = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        settled = true;
        off();
        reject(new Error(`Navigation timeout of ${timeoutMs}ms exceeded`));
      }, timeoutMs);
      off = this._connection.on(this._sessionId, 'Page.lifecycleEvent', (event) => {
        if (loaderId && event.loaderId !== loaderId) return;
        seen.add(event.name);
        for (const w of wanted) {
          if (!seen.has(w)) return;
        }
        settled = true;
        clearTimeout(timer);
        off();
        resolve();
      });
    });
    // Prevent an unawaited rejection (e.g. on cancel()) from surfacing
    // as an unhandled rejection - cancel()/the real await path are the
    // only two ways this settles, and both are handled explicitly.
    promise.catch(() => {});
    return {
      promise,
      cancel() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        off();
      },
    };
  }

  async goto(url, options = {}) {
    const { waitUntil = 'load', timeout = 30000 } = options;
    this._pendingNavigationResponse = undefined;
    // Deliberately wait for Page.navigate's response BEFORE arming the
    // lifecycle watcher, so it can be filtered to the real loaderId
    // this navigation actually got (an earlier version passed
    // loaderId:undefined here, which silently disabled the stale-event
    // filter in _watchLifecycle - caught by a real test, not by
    // inspection). Safe ordering-wise: Page.navigate's own response and
    // any Page.lifecycleEvent it triggers are both messages on the same
    // ordered per-session CDP stream, and Chrome only starts emitting
    // lifecycle events for a navigation after acknowledging the command
    // that started it.
    const navResult = await this._connection.send('Page.navigate', { url }, this._sessionId);
    if (navResult.errorText) {
      throw new Error(`Navigation to ${url} failed: ${navResult.errorText}`);
    }
    const lifecycle = this._watchLifecycle(waitUntil, navResult.loaderId, timeout);
    await lifecycle.promise;
    return this._pendingNavigationResponse || null;
  }

  async setContent(html, options = {}) {
    const { waitUntil = 'load', timeout = 30000 } = options;
    const lifecycle = this._watchLifecycle(waitUntil, undefined, timeout);
    try {
      await this.evaluate(
        (content) => {
          document.open();
          document.write(content);
          document.close();
        },
        html
      );
    } catch (err) {
      lifecycle.cancel();
      throw err;
    }
    await lifecycle.promise;
  }

  async content() {
    return this.evaluate(() => {
      const doctype = document.doctype
        ? `<!DOCTYPE ${document.doctype.name}>`
        : '';
      return doctype + document.documentElement.outerHTML;
    });
  }

  async evaluate(fn, ...args) {
    if (this._executionContextId === null) {
      // No execution context observed yet (e.g. evaluate before any
      // navigation) - Runtime.evaluate against the default context
      // still works and will itself trigger the context-created event
      // for next time.
      const { result, exceptionDetails } = await this._connection.send(
        'Runtime.evaluate',
        { expression: buildCallExpression(fn, args), returnByValue: true, awaitPromise: true },
        this._sessionId
      );
      return unwrapEvaluateResult(result, exceptionDetails);
    }
    const { result, exceptionDetails } = await this._connection.send(
      'Runtime.callFunctionOn',
      {
        functionDeclaration: fn.toString(),
        arguments: args.map((value) => ({ value })),
        executionContextId: this._executionContextId,
        returnByValue: true,
        awaitPromise: true,
      },
      this._sessionId
    );
    return unwrapEvaluateResult(result, exceptionDetails);
  }

  async pdf(options = {}) {
    const params = buildPrintToPdfParams(options);
    const { data } = await this._connection.send('Page.printToPDF', params, this._sessionId);
    return base64ToUint8Array(data);
  }

  async close() {
    for (const off of this._offHandlers) off();
    await this._connection.send('Target.closeTarget', { targetId: this._targetId });
  }
}

function buildCallExpression(fn, args) {
  // Only used for the pre-context-created fallback path; args are
  // JSON-serialized inline since there is no executionContextId yet to
  // target with Runtime.callFunctionOn's structured `arguments`.
  const serializedArgs = args.map((a) => JSON.stringify(a)).join(',');
  return `(${fn.toString()})(${serializedArgs})`;
}

function unwrapEvaluateResult(result, exceptionDetails) {
  if (exceptionDetails) {
    const message =
      exceptionDetails.exception?.description || exceptionDetails.text || 'Evaluation failed';
    throw new Error(message);
  }
  return result ? result.value : undefined;
}

// ---------------------------------------------------------------------
// Section 5: Page.printToPDF param building - real public paperFormats
// table (public, non-proprietary sizes, same data @cloudflare/puppeteer
// itself ships) + the narrow unit conversion real call sites need.
// ---------------------------------------------------------------------

export const PAPER_FORMATS = {
  letter: { width: 8.5, height: 11 },
  legal: { width: 8.5, height: 14 },
  tabloid: { width: 11, height: 17 },
  ledger: { width: 17, height: 11 },
  a0: { width: 33.1, height: 46.8 },
  a1: { width: 23.4, height: 33.1 },
  a2: { width: 16.54, height: 23.4 },
  a3: { width: 11.7, height: 16.54 },
  a4: { width: 8.27, height: 11.7 },
  a5: { width: 5.83, height: 8.27 },
  a6: { width: 4.13, height: 5.83 },
};

// Divisors (units per inch), not multiplicative factors: dividing by
// the same value used to define the unit (e.g. 96px = 1in) gives an
// exact 1.0 under IEEE 754 (x/x === 1 always); pre-computing 1/96 and
// multiplying does not (96 * (1/96) === 0.9999999999999999) - caught by
// a real round-trip test, not a style preference.
const UNITS_PER_INCH = { in: 1, px: 96, cm: 2.54, mm: 25.4 };

/** Real call sites only ever pass "Nin" strings (e.g. "0in"); px/cm/mm
 * supported too since it's a two-line addition and keeps this honest
 * about not silently breaking if a future call site passes one. */
export function parseInches(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  const text = String(value).trim().toLowerCase();
  const unit = text.slice(-2);
  const divisor = UNITS_PER_INCH[unit];
  if (divisor === undefined) {
    throw new Error(`Unsupported print length unit in "${value}"`);
  }
  const num = parseFloat(text.slice(0, -2));
  if (Number.isNaN(num)) throw new Error(`Unsupported print length value "${value}"`);
  return num / divisor;
}

export function buildPrintToPdfParams(options = {}) {
  let width = 8.5;
  let height = 11;
  if (options.format) {
    const format = PAPER_FORMATS[String(options.format).toLowerCase()];
    if (!format) throw new Error(`Unknown paper format: ${options.format}`);
    width = format.width;
    height = format.height;
  } else {
    width = parseInches(options.width) ?? width;
    height = parseInches(options.height) ?? height;
  }
  const margin = options.margin || {};
  return {
    paperWidth: width,
    paperHeight: height,
    printBackground: !!options.printBackground,
    landscape: !!options.landscape,
    marginTop: parseInches(margin.top) || 0,
    marginBottom: parseInches(margin.bottom) || 0,
    marginLeft: parseInches(margin.left) || 0,
    marginRight: parseInches(margin.right) || 0,
  };
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
