import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeChunks,
  decodeChunks,
  CDPConnection,
  Browser,
  Page,
  parseInches,
  buildPrintToPdfParams,
  PAPER_FORMATS,
} from './sovereign-cdp.js';

// ---------------------------------------------------------------------
// Section 1: chunked message framing - pure round trip against our own
// decoder (no real socket involved yet, but this is the exact framing
// Cloudflare's real /v1/connectDevtools endpoint speaks, read directly
// out of the vendored @cloudflare/puppeteer bundle's chunking.js).
// ---------------------------------------------------------------------

test('chunking: short message round-trips in a single chunk', () => {
  const msg = JSON.stringify({ id: 1, method: 'Page.enable', params: {} });
  const chunks = encodeChunks(msg);
  assert.equal(chunks.length, 1);
  const decoded = decodeChunks(chunks);
  assert.equal(decoded, msg);
});

test('chunking: empty-object message round-trips', () => {
  const msg = JSON.stringify({});
  const decoded = decodeChunks(encodeChunks(msg));
  assert.equal(decoded, msg);
});

test('chunking: message spanning multiple 1MB frames round-trips', () => {
  const bigString = 'x'.repeat(2_500_000);
  const msg = JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: bigString } });
  const chunks = encodeChunks(msg);
  assert.ok(chunks.length > 2, 'expected the >2.5MB message to split into multiple chunks');
  const decoded = decodeChunks(chunks);
  assert.equal(decoded, msg);
  const parsed = JSON.parse(decoded);
  assert.equal(parsed.params.expression, bigString);
});

test('chunking: decodeChunks returns null until all chunks for a message have arrived', () => {
  const msg = JSON.stringify({ id: 1, method: 'Page.enable', params: {} });
  const chunks = encodeChunks(msg);
  const bigString = 'y'.repeat(2_500_000);
  const bigMsg = JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: bigString } });
  const bigChunks = encodeChunks(bigMsg);
  assert.ok(bigChunks.length >= 3);

  // Feed one chunk at a time from a big message, simulating frames
  // arriving one WebSocket message at a time.
  const buffer = [];
  for (let i = 0; i < bigChunks.length - 1; i++) {
    buffer.push(bigChunks[i]);
    assert.equal(decodeChunks(buffer), null, `should still be incomplete after chunk ${i}`);
  }
  buffer.push(bigChunks[bigChunks.length - 1]);
  assert.equal(decodeChunks(buffer), bigMsg);
  assert.equal(buffer.length, 0, 'consumed chunks should be spliced off');

  // And a fresh small message still decodes correctly afterward (proves
  // the shared buffer array is left in a clean state, matching the real
  // transport's chunks array being reused across many messages).
  buffer.push(...chunks);
  assert.equal(decodeChunks(buffer), msg);
});

test('chunking: two back-to-back small messages through the same buffer decode independently', () => {
  const msgA = JSON.stringify({ id: 1, method: 'A' });
  const msgB = JSON.stringify({ id: 2, method: 'B' });
  const buffer = [...encodeChunks(msgA), ...encodeChunks(msgB)];
  const first = decodeChunks(buffer);
  assert.equal(first, msgA);
  const second = decodeChunks(buffer);
  assert.equal(second, msgB);
  assert.equal(buffer.length, 0);
});

test('chunking: more bytes than declared throws instead of silently combining', () => {
  // A header declaring only 3 payload bytes, but 2 chunks totaling 6
  // real bytes after the header - chunk 1 alone (2 bytes) is under the
  // declared count so the loop keeps going, then chunk 2 pushes the
  // running total past it, which must throw rather than concatenate.
  const header = new Uint8Array(4);
  new DataView(header.buffer).setUint32(0, 3, true);
  const chunk1 = new Uint8Array([...header, 1, 2]);
  const chunk2 = new Uint8Array([9, 9, 9, 9]);
  assert.throws(() => decodeChunks([chunk1, chunk2]));
});

// ---------------------------------------------------------------------
// Section 2: CDPConnection - JSON-RPC id/response matching and
// method+sessionId-scoped event dispatch, using a fake transport (no
// real socket - this is the part that's honestly testable offline).
// ---------------------------------------------------------------------

function makeFakeConnection(handler) {
  const transport = {
    sent: [],
    onmessage: null,
    onclose: null,
    send(json) {
      const msg = JSON.parse(json);
      this.sent.push(msg);
      if (handler) handler(msg, transport);
    },
    close() {
      this._closed = true;
    },
  };
  const connection = new CDPConnection(transport);
  return { connection, transport };
}

function reply(transport, id, result) {
  transport.onmessage(JSON.stringify({ id, result }));
}

function replyError(transport, id, message) {
  transport.onmessage(JSON.stringify({ id, error: { message } }));
}

function emit(transport, method, params, sessionId) {
  const msg = { method, params };
  if (sessionId) msg.sessionId = sessionId;
  transport.onmessage(JSON.stringify(msg));
}

test('CDPConnection: send() resolves with the result matched by id', async () => {
  const { connection, transport } = makeFakeConnection();
  const promise = connection.send('Page.enable', {}, 'session-1');
  assert.equal(transport.sent.length, 1);
  assert.equal(transport.sent[0].method, 'Page.enable');
  assert.equal(transport.sent[0].sessionId, 'session-1');
  reply(transport, transport.sent[0].id, { ok: true });
  const result = await promise;
  assert.deepEqual(result, { ok: true });
});

test('CDPConnection: send() rejects on a CDP error response', async () => {
  const { connection, transport } = makeFakeConnection();
  const promise = connection.send('Page.bogus');
  replyError(transport, transport.sent[0].id, 'Unknown method');
  await assert.rejects(promise, /Unknown method/);
});

test('CDPConnection: increments ids independently per call and matches each response to the right caller', async () => {
  const { connection, transport } = makeFakeConnection();
  const p1 = connection.send('A');
  const p2 = connection.send('B');
  assert.equal(transport.sent[0].id, 1);
  assert.equal(transport.sent[1].id, 2);
  // Reply out of order - id matching must not depend on arrival order.
  reply(transport, transport.sent[1].id, { which: 'B' });
  reply(transport, transport.sent[0].id, { which: 'A' });
  assert.deepEqual(await p1, { which: 'A' });
  assert.deepEqual(await p2, { which: 'B' });
});

test('CDPConnection: events dispatch only to listeners registered for the matching sessionId', () => {
  const { connection, transport } = makeFakeConnection();
  const seenA = [];
  const seenB = [];
  connection.on('session-A', 'Page.lifecycleEvent', (p) => seenA.push(p));
  connection.on('session-B', 'Page.lifecycleEvent', (p) => seenB.push(p));
  emit(transport, 'Page.lifecycleEvent', { name: 'load' }, 'session-A');
  assert.equal(seenA.length, 1);
  assert.equal(seenB.length, 0);
  emit(transport, 'Page.lifecycleEvent', { name: 'load' }, 'session-B');
  assert.equal(seenA.length, 1);
  assert.equal(seenB.length, 1);
});

test('CDPConnection: browser-level events (no sessionId) only reach browser-level listeners', () => {
  const { connection, transport } = makeFakeConnection();
  const seen = [];
  connection.on(undefined, 'Target.attachedToTarget', (p) => seen.push(p));
  const sessionScoped = [];
  connection.on('session-1', 'Target.attachedToTarget', (p) => sessionScoped.push(p));
  emit(transport, 'Target.attachedToTarget', { sessionId: 'session-1' });
  assert.equal(seen.length, 1);
  assert.equal(sessionScoped.length, 0);
});

test('CDPConnection: an unregistered off() stops further dispatch', () => {
  const { connection, transport } = makeFakeConnection();
  const seen = [];
  const off = connection.on('s1', 'X', (p) => seen.push(p));
  emit(transport, 'X', {}, 's1');
  off();
  emit(transport, 'X', {}, 's1');
  assert.equal(seen.length, 1);
});

test('CDPConnection: closing rejects all pending calls', async () => {
  const { connection } = makeFakeConnection();
  const promise = connection.send('Page.navigate');
  connection._onClose();
  await assert.rejects(promise, /closed/);
});

// ---------------------------------------------------------------------
// Section 3: Browser.newPage() - target creation + auto-attach handshake.
// ---------------------------------------------------------------------

test('Browser.newPage(): creates a target, waits for the matching attachedToTarget, and initializes page domains', async () => {
  const initialized = [];
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Target.createTarget') {
      reply(transport, msg.id, { targetId: 'target-1' });
      emit(transport, 'Target.attachedToTarget', {
        sessionId: 'session-1',
        targetInfo: { targetId: 'target-1', type: 'page' },
      });
      return;
    }
    if (['Page.enable', 'Page.setLifecycleEventsEnabled', 'Network.enable', 'Runtime.enable'].includes(msg.method)) {
      initialized.push(msg.method);
      reply(transport, msg.id, {});
      return;
    }
    throw new Error(`unexpected method in test: ${msg.method}`);
  });

  const browser = new Browser(connection);
  const page = await browser.newPage();
  assert.equal(page._sessionId, 'session-1');
  assert.equal(page._targetId, 'target-1');
  assert.deepEqual(
    initialized.sort(),
    ['Network.enable', 'Page.enable', 'Page.setLifecycleEventsEnabled', 'Runtime.enable'].sort()
  );
});

test('Browser.newPage(): ignores attachedToTarget events for unrelated targets', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Target.createTarget') {
      reply(transport, msg.id, { targetId: 'target-real' });
      // A decoy event for a different target, then the real one.
      emit(transport, 'Target.attachedToTarget', {
        sessionId: 'session-decoy',
        targetInfo: { targetId: 'target-other', type: 'page' },
      });
      emit(transport, 'Target.attachedToTarget', {
        sessionId: 'session-real',
        targetInfo: { targetId: 'target-real', type: 'page' },
      });
      return;
    }
    reply(transport, msg.id, {});
  });
  const page = await new Browser(connection).newPage();
  assert.equal(page._sessionId, 'session-real');
});

test('Browser.close(): sends Browser.close then closes the transport even if Browser.close errors', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    replyError(transport, msg.id, 'session already gone');
  });
  const browser = new Browser(connection);
  await browser.close();
  assert.equal(transport.sent[0].method, 'Browser.close');
  assert.equal(transport._closed, true);
});

// ---------------------------------------------------------------------
// Section 4: Page.goto() / setContent() - lifecycle-event-driven waiting
// and the response correlation for status()/headers().
// ---------------------------------------------------------------------

test('Page.goto(): resolves once the matching Page.lifecycleEvent arrives for the right loaderId, returns response status/headers', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Page.navigate') {
      reply(transport, msg.id, { frameId: 'target-1', loaderId: 'loader-1' });
      // Deferred to a real macrotask: goto() only registers its
      // lifecycle listener *after* this reply's promise resolution is
      // processed (a microtask), so emitting synchronously here - as
      // an earlier version of this test did - would fire the event
      // before anyone is listening, exactly the real-world ordering
      // hazard Browser.newPage()'s fix (see sovereign-cdp.js) addresses
      // for the attach case. goto() addresses its own version of this
      // by only arming the watcher after Page.navigate's response.
      setTimeout(() => {
        emit(
          transport,
          'Network.responseReceived',
          {
            frameId: 'target-1',
            type: 'Document',
            response: { url: 'https://example.com/x.pdf', status: 200, headers: { 'Content-Type': 'application/pdf' } },
          },
          'session-1'
        );
        emit(transport, 'Page.lifecycleEvent', { loaderId: 'loader-1', name: 'load' }, 'session-1');
      }, 0);
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  const response = await page.goto('https://example.com/x.pdf', { waitUntil: 'load', timeout: 2000 });
  assert.equal(response.status(), 200);
  assert.equal(response.headers()['content-type'], 'application/pdf');
  assert.equal(response.url(), 'https://example.com/x.pdf');
});

test('Page.goto(): a lifecycleEvent for a different (stale) loaderId does not resolve navigation', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Page.navigate') {
      reply(transport, msg.id, { frameId: 'target-1', loaderId: 'loader-new' });
      // Stale event from a previous navigation - must be ignored.
      emit(transport, 'Page.lifecycleEvent', { loaderId: 'loader-old', name: 'load' }, 'session-1');
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  const result = await Promise.race([
    page.goto('https://example.com/', { waitUntil: 'load', timeout: 50 }).then(
      () => 'resolved',
      () => 'rejected'
    ),
  ]);
  assert.equal(result, 'rejected'); // times out, as it should
});

test('Page.goto(): waitUntil array only resolves once every named lifecycle event has fired', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Page.navigate') {
      reply(transport, msg.id, { frameId: 'target-1', loaderId: 'loader-1' });
      setTimeout(() => emit(transport, 'Page.lifecycleEvent', { loaderId: 'loader-1', name: 'DOMContentLoaded' }, 'session-1'), 0);
      // 'load' deliberately delayed further to prove both are required.
      setTimeout(() => emit(transport, 'Page.lifecycleEvent', { loaderId: 'loader-1', name: 'load' }, 'session-1'), 10);
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  const start = Date.now();
  await page.goto('https://example.com/', { waitUntil: ['domcontentloaded', 'load'], timeout: 2000 });
  assert.ok(Date.now() - start >= 10, 'should not resolve before the second required event');
});

test('Page.goto(): navigation errorText rejects immediately without leaking the lifecycle timer', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Page.navigate') {
      reply(transport, msg.id, { errorText: 'net::ERR_NAME_NOT_RESOLVED' });
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  await assert.rejects(
    page.goto('https://nonexistent.invalid/', { timeout: 2000 }),
    /ERR_NAME_NOT_RESOLVED/
  );
});

test('Page.goto(): times out if no matching lifecycle event ever arrives', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Page.navigate') {
      reply(transport, msg.id, { frameId: 'target-1', loaderId: 'loader-1' });
      // No lifecycleEvent emitted at all.
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  await assert.rejects(page.goto('https://example.com/', { timeout: 30 }), /timeout/i);
});

test('Page.setContent(): writes via evaluate(document.write) then waits for the lifecycle event', async () => {
  const evaluated = [];
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Runtime.evaluate') {
      evaluated.push(msg.params.expression);
      reply(transport, msg.id, { result: {} });
      emit(transport, 'Page.lifecycleEvent', { name: 'load' }, 'session-1');
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  // No Runtime.executionContextCreated observed yet -> falls back to the
  // Runtime.evaluate(expression) path with inline-serialized arguments.
  await page.setContent('<html><body>hi</body></html>', { waitUntil: 'load', timeout: 2000 });
  assert.equal(evaluated.length, 1);
  assert.match(evaluated[0], /document\.write/);
  assert.match(evaluated[0], /hi/);
});

// ---------------------------------------------------------------------
// Section 5: Page.evaluate() - both the Runtime.callFunctionOn path
// (execution context known) and the Runtime.evaluate fallback path.
// ---------------------------------------------------------------------

test('Page.evaluate(): uses Runtime.callFunctionOn with structured arguments once an execution context is known', async () => {
  let captured;
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Runtime.callFunctionOn') {
      captured = msg.params;
      reply(transport, msg.id, { result: { value: 42 } });
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  // Simulate an already-observed execution context, as would happen
  // after a real navigation fires Runtime.executionContextCreated.
  emit(transport, 'Runtime.executionContextCreated', { context: { id: 7 } }, 'session-1');
  const result = await page.evaluate((a, b) => a + b, 40, 2);
  assert.equal(result, 42);
  assert.equal(captured.executionContextId, 7);
  assert.deepEqual(captured.arguments, [{ value: 40 }, { value: 2 }]);
});

test('Page.evaluate(): falls back to Runtime.evaluate with inline-serialized args when no context is known yet', async () => {
  let captured;
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Runtime.evaluate') {
      captured = msg.params;
      reply(transport, msg.id, { result: { value: 'ok' } });
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  const result = await page.evaluate((name) => `hello ${name}`, 'world');
  assert.equal(result, 'ok');
  assert.match(captured.expression, /hello \$\{name\}/);
  assert.match(captured.expression, /"world"/);
});

test('Page.evaluate(): a real exceptionDetails from CDP is surfaced as a thrown Error, not swallowed', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Runtime.evaluate') {
      reply(transport, msg.id, {
        exceptionDetails: { text: 'Uncaught', exception: { description: 'ReferenceError: x is not defined' } },
      });
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  await assert.rejects(page.evaluate(() => x), /ReferenceError/);
});

test('Page.content(): serializes doctype + documentElement.outerHTML via evaluate', async () => {
  let expr;
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Runtime.evaluate') {
      expr = msg.params.expression;
      reply(transport, msg.id, { result: { value: '<!DOCTYPE html><html>...</html>' } });
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  const html = await page.content();
  assert.equal(html, '<!DOCTYPE html><html>...</html>');
  assert.match(expr, /outerHTML/);
});

// ---------------------------------------------------------------------
// Section 6: request interception - setRequestInterception(true) sends
// the real Fetch.enable shape, request.continue() acks the real
// Fetch.requestPaused event with the real requestId.
// ---------------------------------------------------------------------

test('Page.setRequestInterception(true): enables Fetch with the real catch-all pattern + disables cache', async () => {
  const sentMethods = [];
  const { connection, transport } = makeFakeConnection((msg) => {
    sentMethods.push(msg.method);
    reply(transport, msg.id, {});
  });
  const page = new Page(connection, 'session-1', 'target-1');
  await page.setRequestInterception(true);
  const fetchEnable = transport.sent.find((m) => m.method === 'Fetch.enable');
  assert.deepEqual(fetchEnable.params, { handleAuthRequests: true, patterns: [{ urlPattern: '*' }] });
  assert.ok(sentMethods.includes('Network.setCacheDisabled'));
});

test('request.continue(): sends Fetch.continueRequest with the requestId from the paused event, scoped to the page session', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    reply(transport, msg.id, {});
  });
  const page = new Page(connection, 'session-1', 'target-1');
  const seen = [];
  page.on('request', (req) => seen.push(req));
  emit(transport, 'Fetch.requestPaused', { requestId: 'req-42', request: { url: 'https://x/y.pdf' } }, 'session-1');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url(), 'https://x/y.pdf');
  await seen[0].continue();
  const continueMsg = transport.sent.find((m) => m.method === 'Fetch.continueRequest');
  assert.equal(continueMsg.params.requestId, 'req-42');
  assert.equal(continueMsg.sessionId, 'session-1');
});

test('response listener: headers() keys are lowercased regardless of how CDP cased them', () => {
  const { connection, transport } = makeFakeConnection();
  const page = new Page(connection, 'session-1', 'target-1');
  const seen = [];
  page.on('response', (res) => seen.push(res));
  emit(
    transport,
    'Network.responseReceived',
    { frameId: 'other', type: 'Stylesheet', response: { url: 'https://x/y.css', status: 200, headers: { 'Content-Type': 'text/css' } } },
    'session-1'
  );
  assert.equal(seen.length, 1);
  assert.equal(seen[0].headers()['content-type'], 'text/css');
});

// ---------------------------------------------------------------------
// Section 7: Page.pdf() param building - the real call sites' exact
// {format:'Letter', printBackground:true, margin:{top:'0in',...}} shape.
// ---------------------------------------------------------------------

test('buildPrintToPdfParams: "Letter" + all-zero "0in" margins - the real call sites\' exact input', () => {
  const params = buildPrintToPdfParams({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
  });
  assert.equal(params.paperWidth, PAPER_FORMATS.letter.width);
  assert.equal(params.paperHeight, PAPER_FORMATS.letter.height);
  assert.equal(params.printBackground, true);
  assert.equal(params.marginTop, 0);
  assert.equal(params.marginBottom, 0);
  assert.equal(params.marginLeft, 0);
  assert.equal(params.marginRight, 0);
});

test('buildPrintToPdfParams: defaults when no options given', () => {
  const params = buildPrintToPdfParams();
  assert.equal(params.paperWidth, 8.5);
  assert.equal(params.paperHeight, 11);
  assert.equal(params.printBackground, false);
});

test('buildPrintToPdfParams: unknown format throws rather than silently defaulting', () => {
  assert.throws(() => buildPrintToPdfParams({ format: 'Poster' }), /Unknown paper format/);
});

test('parseInches: supports in/px/cm/mm and rejects unknown units', () => {
  assert.equal(parseInches('0in'), 0);
  assert.equal(parseInches('1in'), 1);
  assert.equal(parseInches('96px'), 1);
  assert.equal(parseInches('2.54cm'), 1);
  assert.equal(parseInches('25.4mm'), 1);
  assert.equal(parseInches(undefined), undefined);
  assert.throws(() => parseInches('5xx'));
});

test('Page.pdf(): sends Page.printToPDF and decodes the real base64 "data" field into bytes', async () => {
  const originalBytes = new TextEncoder().encode('%PDF-1.7 fake content');
  const base64 = Buffer.from(originalBytes).toString('base64');
  let sentParams;
  const { connection, transport } = makeFakeConnection((msg) => {
    if (msg.method === 'Page.printToPDF') {
      sentParams = msg.params;
      reply(transport, msg.id, { data: base64 });
    }
  });
  const page = new Page(connection, 'session-1', 'target-1');
  const bytes = await page.pdf({ format: 'Letter', printBackground: true, margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' } });
  assert.deepEqual(bytes, originalBytes);
  assert.equal(sentParams.paperWidth, 8.5);
  assert.equal(sentParams.printBackground, true);
});

// ---------------------------------------------------------------------
// Section 8: Page.close() - real Target.closeTarget call + listener cleanup.
// ---------------------------------------------------------------------

test('Page.close(): sends Target.closeTarget with this page\'s targetId and stops dispatching events afterward', async () => {
  const { connection, transport } = makeFakeConnection((msg) => {
    reply(transport, msg.id, {});
  });
  const page = new Page(connection, 'session-1', 'target-1');
  const seen = [];
  page.on('response', (r) => seen.push(r));
  await page.close();
  const closeMsg = transport.sent.find((m) => m.method === 'Target.closeTarget');
  assert.equal(closeMsg.params.targetId, 'target-1');
  // Listener was torn down - a late event must not fire it.
  emit(transport, 'Network.responseReceived', { frameId: 'x', type: 'Document', response: { url: 'u', status: 200, headers: {} } }, 'session-1');
  assert.equal(seen.length, 0);
});
