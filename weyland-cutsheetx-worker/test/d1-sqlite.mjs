// A D1-shaped adapter over node:sqlite for route tests: prepare/bind/first/all/run and batch.
import { DatabaseSync } from "node:sqlite";

export function sqliteD1(schemaSql) {
  const database = new DatabaseSync(":memory:");
  if (schemaSql) database.exec(schemaSql);
  const statement = (sql, values) => ({
    bind: (...v) => statement(sql, v),
    async first() { return database.prepare(sql).get(...values) || null; },
    async all() { return { results: database.prepare(sql).all(...values) }; },
    async run() { const r = database.prepare(sql).run(...values); return { success: true, meta: { changes: r.changes } }; },
  });
  return {
    database,
    prepare: (sql) => statement(sql, []),
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
}
