// weyland-cutsheetx-worker/src/lib/catalog-corpus.js
//
// The manufacturer catalog corpus: every cut sheet / catalog PDF CutsheetX
// can cite lives in our own R2 bucket (env.UPLOADS, prefix catalog-corpus/)
// and is served from there. Per direct instruction (2026-10-05) no visitor
// request may fetch from a manufacturer site: a URL that is not yet in the
// corpus is recorded in catalog_corpus_wanted and pulled by this Worker's
// scheduled() cron, never while someone waits.
//
// Sources of wanted URLs: every direct series URL in EXPANDED_URL_PATTERNS,
// every verified product_documents cut-sheet URL in D1, and any URL the
// discovery path asked for at request time.

const PREFIX = "catalog-corpus/";
const MAX_ATTEMPTS = 5;
const PDF_MAGIC = [37, 80, 68, 70];

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function corpusKey(url) {
  return PREFIX + (await sha256Hex(url.trim())) + ".pdf";
}

export function isExternalUrl(url) {
  try {
    const u = new URL(url, "https://weylandai.com");
    return /^https?:$/.test(u.protocol) && !/(^|\.)weylandai\.com$/.test(u.hostname);
  } catch (e) {
    return false;
  }
}

async function ensureTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS catalog_corpus_wanted (url TEXT PRIMARY KEY, reason TEXT, requested_at TEXT NOT NULL, attempts INTEGER DEFAULT 0, last_error TEXT, fetched_at TEXT, r2_key TEXT, size INTEGER)"
  ).run();
}

/** Serve a PDF from the corpus. Returns { buffer, contentLength, contentType, fetchedAt } or null. */
export async function getFromCorpus(url, env) {
  if (!env?.UPLOADS) return null;
  const key = await corpusKey(url);
  const obj = await env.UPLOADS.get(key);
  if (!obj) return null;
  const buffer = await obj.arrayBuffer();
  return { buffer, contentLength: buffer.byteLength, contentType: "application/pdf", fetchedAt: obj.customMetadata?.fetchedAt || null, r2Key: key };
}

/** Record that a URL should be in the corpus. Cheap, idempotent. */
export async function requestIntoCorpus(url, env, reason = "request") {
  if (!env?.DB || !isExternalUrl(url)) return;
  try {
    await ensureTable(env);
    await env.DB.prepare("INSERT OR IGNORE INTO catalog_corpus_wanted (url, reason, requested_at) VALUES (?, ?, ?)")
      .bind(url.trim(), reason, new Date().toISOString()).run();
  } catch (e) {
    console.warn("[corpus] could not queue", url, e.message);
  }
}

/** Seed the wanted table from the static pattern table and verified D1 documents. */
export async function seedCorpusWanted(env, patterns) {
  await ensureTable(env);
  const urls = new Set();
  for (const cfg of Object.values(patterns || {})) {
    for (const u of Object.values(cfg.directSeriesUrls || {})) if (isExternalUrl(u)) urls.add(u);
  }
  try {
    const rows = await env.DB.prepare(
      "SELECT document_url FROM product_documents WHERE document_type = 'cut_sheet' AND verified = 1 AND (active = 1 OR active IS NULL) AND document_url LIKE 'http%'"
    ).all();
    for (const r of rows.results || []) if (isExternalUrl(r.document_url)) urls.add(r.document_url);
  } catch (e) {
    console.warn("[corpus] product_documents seed skipped:", e.message);
  }
  const now = new Date().toISOString();
  let added = 0;
  for (const u of urls) {
    const res = await env.DB.prepare("INSERT OR IGNORE INTO catalog_corpus_wanted (url, reason, requested_at) VALUES (?, 'seed', ?)").bind(u, now).run();
    if (res.meta?.changes) added++;
  }
  return { candidates: urls.size, added };
}

/** Cron body: pull up to `limit` wanted URLs into R2. The only place this Worker fetches a manufacturer site. */
export async function ingestCorpus(env, limit = 10) {
  await ensureTable(env);
  const rows = await env.DB.prepare(
    "SELECT url, attempts FROM catalog_corpus_wanted WHERE fetched_at IS NULL AND attempts < ? ORDER BY attempts ASC, requested_at ASC LIMIT ?"
  ).bind(MAX_ATTEMPTS, limit).all();
  const summary = { tried: 0, stored: 0, failed: 0 };
  for (const row of rows.results || []) {
    summary.tried++;
    const now = new Date().toISOString();
    try {
      const resp = await fetch(row.url, {
        headers: { "User-Agent": "WeylandAI catalog corpus (+https://weylandai.com/bot)", "Accept": "application/pdf,*/*" },
        signal: AbortSignal.timeout(25000)
      });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const buffer = await resp.arrayBuffer();
      const head = new Uint8Array(buffer.slice(0, 4));
      if (![...head].every((b, i) => b === PDF_MAGIC[i])) throw new Error("not a PDF");
      const key = await corpusKey(row.url);
      await env.UPLOADS.put(key, buffer, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { url: row.url, fetchedAt: now, size: String(buffer.byteLength) } });
      await env.DB.prepare("UPDATE catalog_corpus_wanted SET fetched_at = ?, r2_key = ?, size = ?, attempts = attempts + 1, last_error = NULL WHERE url = ?")
        .bind(now, key, buffer.byteLength, row.url).run();
      summary.stored++;
    } catch (e) {
      summary.failed++;
      await env.DB.prepare("UPDATE catalog_corpus_wanted SET attempts = attempts + 1, last_error = ? WHERE url = ?").bind(String(e.message).slice(0, 200), row.url).run();
    }
  }
  return summary;
}

export async function corpusStatus(env) {
  await ensureTable(env);
  const t = await env.DB.prepare("SELECT COUNT(*) AS wanted, SUM(CASE WHEN fetched_at IS NOT NULL THEN 1 ELSE 0 END) AS stored, SUM(CASE WHEN fetched_at IS NULL AND attempts >= ? THEN 1 ELSE 0 END) AS given_up FROM catalog_corpus_wanted").bind(MAX_ATTEMPTS).first();
  return t || { wanted: 0, stored: 0, given_up: 0 };
}
