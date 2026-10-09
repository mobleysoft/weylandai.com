import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

test("legacy job migration is additive, repeatable and enforces its persistence contract", () => {
  const migration = readFileSync(new URL("../../migrations/20261009_legacy_hardware_extraction_jobs.sql", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../../schema.sql", import.meta.url), "utf8");
  const definition = schema.split("-- Table: hardware_extraction_jobs\n")[1].split("-- Table: hardware_extraction_sessions")[0];
  assert.equal(definition.trim(), migration.split("\n").slice(1).join("\n")
    .replaceAll(" IF NOT EXISTS", "").trim(), "fresh installs and migration must define the same table");
  const result = spawnSync("python3", ["-c", `
import json, sqlite3, sys
data = json.load(sys.stdin)
for sql in [data['migration'], data['definition']]:
    db = sqlite3.connect(':memory:')
    db.executescript("CREATE TABLE hardware_sets(id TEXT PRIMARY KEY); INSERT INTO hardware_sets VALUES ('existing');")
    db.executescript(sql)
    if sql == data['migration']: db.executescript(sql)
    assert db.execute('SELECT id FROM hardware_sets').fetchall() == [('existing',)]
    columns = [row[1] for row in db.execute('PRAGMA table_info(hardware_extraction_jobs)')]
    assert columns == ['id','user_id','submittal_id','project_name','filename','file_buffer_key','total_sets','sets_approved','sets_rejected','status','created_at','updated_at']
    index = [row[2] for row in db.execute('PRAGMA index_info(idx_hardware_extraction_jobs_user_created)')]
    assert index == ['user_id', 'created_at']
    values = ['job','user',None,'Project','schedule.pdf','key',1,0,0,'processing','now','now']
    insert = 'INSERT INTO hardware_extraction_jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    db.execute(insert, values)
    for status in ['pending_review', 'failed']:
        db.execute('UPDATE hardware_extraction_jobs SET status = ? WHERE id = ?', (status,'job'))
        assert db.execute('SELECT status FROM hardware_extraction_jobs').fetchone()[0] == status
    for field, value in [(1,None), (6,-1), (7,-1), (8,-1), (9,'fictional')]:
        bad = values.copy(); bad[0] = 'bad'; bad[field] = value
        try: db.execute(insert, bad)
        except sqlite3.IntegrityError: pass
        else: raise AssertionError('invalid job was accepted')
print('SQLite contract passed')
`], { input: JSON.stringify({ migration, definition }), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /SQLite contract passed/);
});
