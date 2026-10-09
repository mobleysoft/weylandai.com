// Offline acceptance of a captured primary-source catalogue seed, with the real matcher.
// Run with Node 22+: node --test tools/catalogue-seeds/glynn-johnson-90s.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sqliteD1 } from '../../weyland-cutsheetx-worker/test/d1-sqlite.mjs';
import { matchComponentToCutSheets, citedPagesFor } from '../../weyland-shared/product-database.js';
import { resetResolvedCatalogueKeys } from '../../weyland-shared/catalogue-storage.js';

const evidence = JSON.parse(readFileSync(new URL('./glynn-johnson-90s-evidence.json', import.meta.url)));
const seed = readFileSync(new URL('./2026-10-09-glynn-johnson-90s.sql', import.meta.url), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
const cid = evidence.source.catalogue_id;
const key = evidence.source.r2_key;

function fixture() {
  resetResolvedCatalogueKeys();
  const DB = sqliteD1(evidence.live_schema.map(row => row.sql + ';').join('\n'));
  DB.database.exec(`PRAGMA foreign_keys=ON;
    INSERT INTO manufacturers(id,name,slug,trade,notes)
      VALUES('mfr-glynnj','Glynn-Johnson','glynn-johnson','doors','existing manufacturer');
    INSERT INTO manufacturer_aliases(alias,manufacturer_id,source)
      VALUES('GLY','mfr-glynnj','existing alias'),('GJ','mfr-glynnj','existing alias');
    INSERT INTO products(id,manufacturer_id,product_series,product_family,base_model,display_name,trade)
      VALUES('prod-gly-904s','mfr-glynnj','904S','stops','904S','Existing sized 904S','doors');`);
  return {
    DB,
    UPLOADS: { async head(candidate) { return candidate === key ? { size: evidence.source.bytes } : null; } },
  };
}

test('seed matches the captured hash, source text, full book and precise family designation', () => {
  assert.equal(digest(seed), evidence.seed_sha256);
  const env = fixture();
  try {
    env.DB.database.exec(seed);
    const pages = env.DB.database.prepare('SELECT page_num,text_content FROM catalogue_pages WHERE catalogue_id=? ORDER BY page_num').all(cid);
    assert.equal(pages.length, 32);
    assert.deepEqual(pages.map(p => p.page_num), Array.from({ length: 32 }, (_, i) => i + 1));
    assert.deepEqual(pages.map(p => digest(p.text_content)), evidence.inspection.page_text_sha256);
    assert.match(pages[13].text_content, /90S Series stop-only model/);
    assert.match(pages[14].text_content, /90S Series stop-only/);
    const cat = env.DB.database.prepare('SELECT * FROM catalogues WHERE catalogue_id=?').get(cid);
    assert.equal(cat.source_url, evidence.source.url);
    assert.equal(cat.source_hash_sha256, evidence.source.sha256);
    assert.equal(cat.storage_path, key);
    assert.equal(cat.index_built, 1);
    const product = env.DB.database.prepare("SELECT * FROM products WHERE base_model='90S'").get();
    assert.equal(product.manufacturer_id, 'mfr-glynnj');
    assert.equal(product.product_series, '90S');
    assert.match(product.description, /Size must be specified separately/);
  } finally { env.DB.database.close(); }
});

test('applying twice writes no duplicates and preserves existing manufacturer, alias and sized product', () => {
  const env = fixture();
  try {
    env.DB.database.exec(seed);
    const changes = env.DB.database.prepare('SELECT total_changes() AS n').get().n;
    env.DB.database.exec(seed);
    assert.equal(env.DB.database.prepare('SELECT total_changes() AS n').get().n, changes);
    assert.equal(env.DB.database.prepare("SELECT notes FROM manufacturers WHERE id='mfr-glynnj'").get().notes, 'existing manufacturer');
    assert.equal(env.DB.database.prepare("SELECT source FROM manufacturer_aliases WHERE alias='GLY'").get().source, 'existing alias');
    assert.equal(env.DB.database.prepare("SELECT display_name FROM products WHERE id='prod-gly-904s'").get().display_name, 'Existing sized 904S');
    assert.deepEqual(env.DB.database.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(env.DB.database.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    // The live schema does not declare these FKs; check both joins explicitly as well.
    assert.equal(env.DB.database.prepare('SELECT COUNT(*) AS n FROM products p LEFT JOIN manufacturers m ON m.id=p.manufacturer_id WHERE m.id IS NULL').get().n, 0);
    assert.equal(env.DB.database.prepare('SELECT COUNT(*) AS n FROM product_documents d LEFT JOIN products p ON p.id=d.product_id WHERE p.id IS NULL').get().n, 0);
    const hits = env.DB.database.prepare('SELECT p.page_num FROM catalogue_pages_fts f JOIN catalogue_pages p ON p.rowid=f.rowid WHERE catalogue_pages_fts MATCH ? AND p.catalogue_id=? ORDER BY p.page_num').all('"90S"', cid);
    assert.deepEqual(hits.map(r => r.page_num), [14, 15]);
  } finally { env.DB.database.close(); }
});

test('real matcher changes the precise 90S miss to an exact family match with a filed primary page', async () => {
  const env = fixture();
  try {
    const before = await matchComponentToCutSheets({ manufacturer: 'Glynn-Johnson', model: '90S' }, env, { pagesWhenUnpinned: true });
    assert.equal(before.matched, false);
    assert.equal(before.reason, 'model_not_in_catalogue');
    env.DB.database.exec(seed);
    const after = await matchComponentToCutSheets({ manufacturer: 'Glynn-Johnson', model: '90S' }, env, { pagesWhenUnpinned: true });
    assert.equal(after.matched, true);
    assert.equal(after.matchType, 'exact');
    assert.equal(after.product.model, '90S');
    assert.equal(after.product.manufacturer, 'Glynn-Johnson');
    assert.equal(after.cutSheets[0].r2Key, key);
    assert.equal(after.cutSheets[0].pageHint, '15');
    assert.equal(after.cutSheets[0].url, evidence.source.url);
    const pages = citedPagesFor(after);
    assert.equal(pages.length, 1);
    assert.equal(pages[0].catalogueId, cid);
    assert.ok([14, 15].includes(pages[0].pageNum));
    const sized = await matchComponentToCutSheets({ manufacturer: 'Glynn-Johnson', model: '904S' }, env);
    assert.equal(sized.product.model, '904S');
    assert.equal(sized.product.id, 'prod-gly-904s');
  } finally { env.DB.database.close(); }
});

test('stored source PDF can be checked independently when a local capture path is supplied', { skip: !process.env.GLYNN_PRIMARY_PDF }, () => {
  const data = readFileSync(process.env.GLYNN_PRIMARY_PDF);
  assert.equal(data.subarray(0, 4).toString(), '%PDF');
  assert.equal(data.length, evidence.source.bytes);
  assert.equal(digest(data), evidence.source.sha256);
});
