// Verify production retrieval paths against an in-memory R2 substitute, with network disabled.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { corpusKey, getFromCorpus } from '../../../weyland-cutsheetx-worker/src/lib/catalog-corpus.js';
import { registerCutSheetDocumentsRoutes } from '../../../weyland-cutsheetx-worker/src/routes/cut-sheet-documents.js';

const manifest = JSON.parse(await readFile('tools/catalogue-seeds/g021-evidence/seed-manifest.json', 'utf8'));
const bytes = new TextEncoder().encode('%PDF-test-r2-object');
const routes = new Map();
registerCutSheetDocumentsRoutes({ get: (path, handler) => routes.set(path, handler) }, {
  authenticate: async () => ({ user: { id: 'local-verification' } }),
  requireProductAccess: async () => null,
});
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('External request-time fetch forbidden'); };
let citations = 0;
try {
  for (const seed of manifest) {
    assert.equal(await corpusKey(seed.url), seed.r2_key);
    const bucket = { get: async key => {
      assert.equal(key, seed.r2_key);
      return { arrayBuffer: async () => bytes.buffer, body: bytes };
    } };
    const hit = await getFromCorpus(seed.url, { UPLOADS: bucket });
    assert.equal(hit.r2Key, seed.r2_key);
    assert.equal(hit.contentLength, bytes.length);
    assert.equal(await getFromCorpus(seed.url, { UPLOADS: { get: async () => null } }), null);
    for (const product of seed.products) {
      const document = { id: product.document_id, r2_object_key: seed.r2_key, r2_bucket: 'subx-uploads', document_title: seed.title };
      const env = { UPLOADS: bucket, DB: { prepare: () => ({ bind: id => {
        assert.equal(id, product.document_id);
        return { first: async () => document };
      } }) } };
      const handler = routes.get('/api/cut-sheets/download/:docId');
      const request = { params: { docId: product.document_id } };
      const response = await handler(request, env);
      assert.equal(response.status, 200);
      assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
      const missing = await handler(request, { ...env, UPLOADS: { get: async () => null } });
      assert.equal(missing.status, 404);
      citations++;
    }
  }
} finally {
  globalThis.fetch = originalFetch;
}
const receipt = {
  checked_at: new Date().toISOString(),
  modules: ['weyland-cutsheetx-worker/src/lib/catalog-corpus.js', 'weyland-cutsheetx-worker/src/routes/cut-sheet-documents.js'],
  external_fetch_trap: 'throws',
  books_checked: manifest.length,
  r2_hit: true,
  r2_miss_returns_null: true,
  document_routes_checked: citations,
  document_hit_status: 200,
  document_miss_status: 404,
  scope: 'Production handlers with local authentication, D1 and R2 substitutes; not a live HTTP or R2 byte download.',
};
await writeFile('tools/catalogue-seeds/g021-evidence/request-time-check.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
