import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { savePageExtraction } from "../src/lib/hardware-extraction-single-page.js";

test("hardware completion counts exclude partial pages and recover on a complete reread", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE hardware_extraction_sessions (id TEXT PRIMARY KEY, user_id TEXT, total_pages INTEGER,
      pages_processed INTEGER DEFAULT 0, total_sets_extracted INTEGER, total_components_extracted INTEGER,
      current_page INTEGER, updated_at TEXT);
    CREATE TABLE hardware_page_extractions (id TEXT, session_id TEXT, page_number INTEGER, extracted_data TEXT,
      status TEXT, input_tokens INTEGER, output_tokens INTEGER, extraction_time_ms INTEGER, created_at TEXT,
      previous_extracted_data TEXT, previous_affirm_state TEXT, affirm_state TEXT, extraction_count INTEGER,
      re_extracted_at TEXT, UNIQUE(session_id, page_number));
    CREATE TABLE hardware_sets (session_id TEXT, approved_from_page INTEGER, affirmed INTEGER, updated_at TEXT);
    INSERT INTO hardware_extraction_sessions (id, user_id, total_pages) VALUES ('s', 'u', 4);
  `);
  const env = { DB: { prepare(sql) {
    let args = [];
    const stmt = { bind(...v) { args = v; return stmt; },
      async first() { return db.prepare(sql).get(...args) || null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { return db.prepare(sql).run(...args); } };
    return stmt;
  } } };
  const count = () => db.prepare("SELECT pages_processed FROM hardware_extraction_sessions WHERE id = 's'").get().pages_processed;
  await savePageExtraction("s", 1, { hardware_groups: [] }, env);
  await savePageExtraction("s", 2, { hardware_groups: [], partial: true }, env);
  await savePageExtraction("s", 3, { hardware_groups: [], metadata: { partial: true } }, env);
  await savePageExtraction("s", 4, { hardware_groups: [], done: false }, env);
  assert.equal(count(), 1);
  for (const page of [2, 3, 4]) {
    const stored = JSON.parse(db.prepare("SELECT extracted_data FROM hardware_page_extractions WHERE page_number = ?").get(page).extracted_data);
    assert.equal(stored.partial, true);
    assert.equal(stored.metadata.partial, true);
  }
  await savePageExtraction("s", 2, { hardware_groups: [], partial: false }, env);
  assert.equal(count(), 2);
  const prior = JSON.parse(db.prepare("SELECT previous_extracted_data FROM hardware_page_extractions WHERE page_number = 2").get().previous_extracted_data);
  assert.equal(prior.partial, true, "the partial extraction history remains available");
  await savePageExtraction("s", 2, { hardware_groups: [] }, env);
  assert.equal(count(), 2, "a reread counts the page once");
  db.close();
});
