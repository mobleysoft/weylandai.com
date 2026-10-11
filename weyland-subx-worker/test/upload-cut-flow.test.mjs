// Run the shipped submit handler and upload orchestration with browser/API
// boundaries stubbed. PDF selection/copying is exercised with real bytes in
// bidset-cut.test.mjs; no remote request occurs here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../src/pages/subx-app.html', import.meta.url), 'utf8');
const start = html.indexOf('      async function uploadAndRead(');
const end = html.indexOf('      $("guest-save-btn").addEventListener', start);
const code = html.slice(start, end).replaceAll('import(', 'loadModule(');

function flow(authed, { failCut = false, status = 201 } = {}) {
  const elements = new Map(), calls = [], state = { busy: false, authed };
  const file = { name: 'whole-bid-set.pdf', size: 92 * 1024 * 1024, async arrayBuffer() { calls.push('original-bytes'); return new ArrayBuffer(1); } };
  const source_pdf = { original_pages: 148, pages: [{ pdf_page: 1, original_page: 45, sheet: 'A601' }], omitted_plans: [] };
  const plan = [{ page: 45, type: 'door_schedule' }];
  const $ = id => {
    if (!elements.has(id)) elements.set(id, { value: '', files: [], addEventListener(event, fn) { this[event] = fn; } });
    return elements.get(id);
  };
  $('f-file').files = [file]; $('f-doctype').value = 'door_schedule';
  const deps = { $, state, File, FormData, esc: String, plainError: () => 'server failed',
    window: { findChosenSchedule: async f => { assert.equal(f, file); calls.push('finder'); return { pages: 148 }; }, foundPagesPlan: () => plan },
    setBusy: b => { state.busy = b; }, setStep() {}, showSignIn() {},
    readGuest: async (f, project, found, p) => { assert.equal(f, file); assert.equal(p, plan); calls.push('guest'); return false; },
    loadModule: async () => ({ cutBidSet: async (bytes, found, p, options) => {
      assert.equal(p, plan); calls.push('cut');
      if (failCut) throw new Error('schedule pages alone are over 30 MB');
      options.onProgress('Keeping 1 of 148 pages');
      return { bytes: new Uint8Array([1, 2, 3]), source_pdf, readingPlan: [{ page: 1, type: 'door_schedule' }] };
    } }),
    keptPagesNote: () => 'Kept 1 of 148 pages',
    api: async (path, opts) => {
      calls.push('upload'); assert.match(path, /\/start$/);
      assert.equal(opts.form.get('file').size, 3);
      assert.equal(opts.form.get('file').name, file.name);
      assert.deepEqual(JSON.parse(opts.form.get('source_pdf')), source_pdf);
      assert.equal(opts.form.get('totalPages'), '1');
      assert.match($('upload-result').textContent, /^Uploading [\d.]+ MB/);
      return { ok: status === 201, status, data: { sessionId: 'saved' } };
    },
    loadSessions: async () => {}, openSession: async () => {},
    readPlan: async p => { assert.deepEqual(p, [{ page: 1, type: 'door_schedule' }]); assert.equal(state.lastUpload.file.size, 3); calls.push('read'); return false; },
    workspace: Promise.resolve({ pendingSchedule: async () => {} }),
    finishUpload: () => calls.push('finished'),
  };
  // Only these two shipped functions run; there is no DOM implementation or
  // network in this test harness.
  const run = new Function('deps', 'with (deps) { ' + code + '\nreturn uploadAndRead; }')(deps);
  return { run: () => run(file, 'Project', 'door_schedule'), calls, state, $, file };
}

test('large firm upload sends the cut and original-page map, then reads cut indexes', async () => {
  const f = flow(true); await f.run();
  assert.deepEqual(f.calls, ['finder', 'original-bytes', 'cut', 'upload', 'read', 'finished']);
  assert.equal(f.state.busy, false);
});

test('large guest stays in the tab, without loading the writer or uploading bytes', async () => {
  const f = flow(false); await f.run();
  assert.deepEqual(f.calls, ['finder', 'guest', 'finished']);
  // The real submit handler must accept the file too (the former refusal was
  // here, before uploadAndRead could choose its guest branch).
  f.$('upload-form').submit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.calls, ['finder', 'guest', 'finished', 'finder', 'guest', 'finished']);
});

test('a failed cut never calls the upload API and leaves an actionable error', async () => {
  const f = flow(true, { failCut: true }); await f.run();
  assert.deepEqual(f.calls, ['finder', 'original-bytes', 'cut']);
  assert.match(f.$('upload-result').innerHTML, /schedule pages alone are over 30 MB/);
  assert.equal(f.state.busy, false);
});

test('expired sign-in falls back to guest reading of the original file', async () => {
  const f = flow(true, { status: 401 }); await f.run();
  assert.deepEqual(f.calls, ['finder', 'original-bytes', 'cut', 'upload', 'guest', 'finished']);
});
