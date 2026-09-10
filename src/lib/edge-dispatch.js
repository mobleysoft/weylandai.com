// src/lib/edge-dispatch.js
//
// MONOLITH_HELPER_MAP.md's Cluster I: R2/CORS/static-asset dispatch
// plumbing. Extracted from two non-contiguous regions of
// legacy-monolith.js - D1KVShim (its own `// d1_kv_shim.js` esbuild
// module-boundary comment) and MIME_MAP/serveR2/checkSession
// (immediately before the `monolith` dispatcher object's own
// definition) - grouped together here because the cataloguing pass
// treated them as one conceptual cluster, not because they were ever
// physically adjacent in the bundle.
//
// D1KVShim: confirmed dead code (defined, never instantiated -
// `new D1KVShim(` does not appear anywhere in legacy-monolith.js).
// This was already investigated and decided in-repo on 2026-09-09
// (see the still-inline `monolith.fetch`'s own header comment, not
// moved by this extraction): the class is left defined, not deleted,
// because it may represent real in-progress KV->D1 migration work
// (its own "PENDING"/"CONVERTED" logging states suggest active
// design intent) - only its automatic, blanket activation on every
// request was removed, since a broken shim silently replacing a real
// KV binding is strictly worse than just using the real binding. This
// extraction carries that same status forward unchanged: still
// defined, still unused, still not deleted. Whether to finish the
// migration or remove the class remains a real decision for whoever
// picks that up, not something to resolve silently here.
//
// checkSession: a second, real finding from this extraction, not
// previously documented - confirmed dead code with zero call sites
// anywhere in legacy-monolith.js. The still-inline `monolith.fetch`
// handler (not moved by this extraction; see MONOLITH_HELPER_MAP.md's
// note on deferring it until Cluster E is extracted) has its own
// separate inline session-check logic reading the same
// `weyland_session` cookie and querying the same `weyland_sessions`
// table directly, rather than calling this function. Kept, not
// deleted, following this phase's standing "don't silently drop dead
// code found mid-extraction" rule.
//
// serveR2/MIME_MAP are real and live - called from the top-level
// fetch handler (Cluster K, not yet extracted) - exported here and
// imported back into legacy-monolith.js so those call sites keep
// resolving unchanged.
//
// esbuild's cosmetic __name(...) calls dropped, same as every other
// extraction in this effort.

export var D1KVShim = class {
  /**
   * @param {D1Database} db - D1 database binding
   * @param {string} namespace - KV namespace name (for logging)
   * @param {object} opts
   * @param {Array} opts.mappings - Schema-aware mappings [{pattern, table, toKV, fromKV}]
   * @param {boolean} opts.logConversions - Log every KV call (default: true)
   * @param {string} opts.compatTable - Name of generic KV compat table (default: 'kv_compat')
   */
  constructor(db, namespace, opts = {}) {
    this._db = db;
    this._ns = namespace;
    this._mappings = opts.mappings || [];
    this._log = opts.logConversions !== false;
    this._compatTable = opts.compatTable || "kv_compat";
  }
  // ═══════════════════════════════════════════════════════════════
  //  KV Interface: get
  // ═══════════════════════════════════════════════════════════════
  async get(key, options) {
    const type = typeof options === "string" ? options : options?.type || "text";
    const mapping = this._findMapping(key);
    if (mapping) {
      const row = await this._mappedGet(key, mapping);
      if (row !== null) {
        await this._logCall("get", key, "CONVERTED");
        return this._coerce(row, type);
      }
    }
    await this._logCall("get", key, "PENDING");
    await this._signalConversion(key, "get");
    const result = await this._db.prepare(
      `SELECT value, metadata FROM ${this._compatTable} WHERE namespace = ? AND key = ? AND (expiration IS NULL OR expiration > unixepoch())`
    ).bind(this._ns, key).first();
    if (!result)
      return null;
    return this._coerce(result.value, type);
  }
  async getWithMetadata(key, options) {
    const type = typeof options === "string" ? options : options?.type || "text";
    const mapping = this._findMapping(key);
    if (mapping) {
      const row = await this._mappedGet(key, mapping);
      if (row !== null) {
        await this._logCall("getWithMetadata", key, "CONVERTED");
        return { value: this._coerce(row, type), metadata: null };
      }
    }
    await this._logCall("getWithMetadata", key, "PENDING");
    await this._signalConversion(key, "getWithMetadata");
    const result = await this._db.prepare(
      `SELECT value, metadata FROM ${this._compatTable} WHERE namespace = ? AND key = ? AND (expiration IS NULL OR expiration > unixepoch())`
    ).bind(this._ns, key).first();
    if (!result)
      return { value: null, metadata: null };
    const metadata = result.metadata ? JSON.parse(result.metadata) : null;
    return { value: this._coerce(result.value, type), metadata };
  }
  // ═══════════════════════════════════════════════════════════════
  //  KV Interface: put
  // ═══════════════════════════════════════════════════════════════
  async put(key, value, options = {}) {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    const metadata = options.metadata ? JSON.stringify(options.metadata) : null;
    const expiration = options.expirationTtl ? Math.floor(Date.now() / 1e3) + options.expirationTtl : options.expiration || null;
    const mapping = this._findMapping(key);
    if (mapping && mapping.fromKV) {
      await this._mappedPut(key, strValue, mapping);
      await this._logCall("put", key, "CONVERTED");
      return;
    }
    await this._logCall("put", key, "PENDING");
    await this._signalConversion(key, "put");
    await this._db.prepare(
      `INSERT OR REPLACE INTO ${this._compatTable} (namespace, key, value, metadata, expiration, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(this._ns, key, strValue, metadata, expiration).run();
  }
  // ═══════════════════════════════════════════════════════════════
  //  KV Interface: delete
  // ═══════════════════════════════════════════════════════════════
  async delete(key) {
    const mapping = this._findMapping(key);
    if (mapping && mapping.deleteSQL) {
      const params = this._extractParams(key, mapping.pattern);
      await this._db.prepare(mapping.deleteSQL).bind(...params).run();
      await this._logCall("delete", key, "CONVERTED");
      return;
    }
    await this._logCall("delete", key, "PENDING");
    await this._signalConversion(key, "delete");
    await this._db.prepare(
      `DELETE FROM ${this._compatTable} WHERE namespace = ? AND key = ?`
    ).bind(this._ns, key).run();
  }
  // ═══════════════════════════════════════════════════════════════
  //  KV Interface: list
  // ═══════════════════════════════════════════════════════════════
  async list(options = {}) {
    const prefix = options.prefix || "";
    const limit = options.limit || 1e3;
    const cursorOffset = options.cursor ? parseInt(options.cursor, 10) : 0;
    const mapping = this._findMappingByPrefix(prefix);
    if (mapping && mapping.listSQL) {
      const result2 = await this._db.prepare(mapping.listSQL).bind(prefix + "%", limit + 1, cursorOffset).all();
      const keys2 = (result2.results || []).slice(0, limit).map((r) => ({
        name: r.key || r.name,
        expiration: r.expiration || void 0,
        metadata: r.metadata ? JSON.parse(r.metadata) : void 0
      }));
      const hasMore = (result2.results || []).length > limit;
      await this._logCall("list", prefix || "*", "CONVERTED");
      return {
        keys: keys2,
        list_complete: !hasMore,
        cursor: hasMore ? String(cursorOffset + limit) : void 0
      };
    }
    await this._logCall("list", prefix || "*", "PENDING");
    await this._signalConversion(prefix || "*", "list");
    const result = await this._db.prepare(
      `SELECT key, metadata, expiration FROM ${this._compatTable} WHERE namespace = ? AND key LIKE ? AND (expiration IS NULL OR expiration > unixepoch()) ORDER BY key LIMIT ? OFFSET ?`
    ).bind(this._ns, prefix + "%", limit + 1, cursorOffset).all();
    const rows = result.results || [];
    const keys = rows.slice(0, limit).map((r) => ({
      name: r.key,
      expiration: r.expiration || void 0,
      metadata: r.metadata ? JSON.parse(r.metadata) : void 0
    }));
    return {
      keys,
      list_complete: rows.length <= limit,
      cursor: rows.length > limit ? String(cursorOffset + limit) : void 0
    };
  }
  // ═══════════════════════════════════════════════════════════════
  //  Schema-Aware Mapping Engine
  // ═══════════════════════════════════════════════════════════════
  _findMapping(key) {
    for (const m of this._mappings) {
      if (typeof m.pattern === "string") {
        if (key.startsWith(m.pattern))
          return m;
      } else if (m.pattern instanceof RegExp) {
        if (m.pattern.test(key))
          return m;
      }
    }
    return null;
  }
  _findMappingByPrefix(prefix) {
    for (const m of this._mappings) {
      if (typeof m.pattern === "string" && prefix.startsWith(m.pattern))
        return m;
    }
    return null;
  }
  _extractParams(key, pattern) {
    if (typeof pattern === "string") {
      return [key.slice(pattern.length)];
    }
    const match = key.match(pattern);
    return match ? match.slice(1) : [key];
  }
  async _mappedGet(key, mapping) {
    if (!mapping.toKV)
      return null;
    const params = this._extractParams(key, mapping.pattern);
    const row = await this._db.prepare(mapping.getSQL).bind(...params).first();
    if (!row)
      return null;
    return mapping.toKV(row, key);
  }
  async _mappedPut(key, value, mapping) {
    const params = this._extractParams(key, mapping.pattern);
    const parsed = this._tryParse(value);
    const sqlParams = mapping.fromKV(parsed, params, key);
    await this._db.prepare(mapping.putSQL).bind(...sqlParams).run();
  }
  // ═══════════════════════════════════════════════════════════════
  //  Conversion Spell Logger (the booby trap)
  // ═══════════════════════════════════════════════════════════════
  async _logCall(operation, keyOrPattern, status = "PENDING") {
    if (!this._log)
      return;
    const keyPattern = this._normalizeKeyPattern(keyOrPattern);
    try {
      await this._db.prepare(
        `INSERT INTO kv_conversion_spells (namespace, key_pattern, operation, call_count, status, first_seen, last_seen) VALUES (?, ?, ?, 1, ?, datetime('now'), datetime('now')) ON CONFLICT(namespace, key_pattern, operation) DO UPDATE SET call_count = call_count + 1, last_seen = datetime('now'), status = CASE WHEN status = 'CONVERTED' THEN 'CONVERTED' ELSE ? END`
      ).bind(this._ns, keyPattern, operation, status, status).run();
    } catch (_) {
    }
  }
  async _signalConversion(keyOrPattern, operation) {
    const keyPattern = this._normalizeKeyPattern(keyOrPattern);
    try {
      await this._db.prepare(
        `INSERT INTO kv_conversion_queue (namespace, key_pattern, status, priority, created_at, updated_at)
         VALUES (?, ?, 'PENDING', 0, datetime('now'), datetime('now'))
         ON CONFLICT(namespace, key_pattern) DO UPDATE SET
           priority = priority + 1,
           updated_at = datetime('now')`
      ).bind(this._ns, keyPattern).run();
    } catch (_) {
    }
  }
  _normalizeKeyPattern(key) {
    if (typeof key !== "string")
      return "*";
    const colonIdx = key.indexOf(":");
    if (colonIdx > 0)
      return key.slice(0, colonIdx + 1) + "*";
    return key;
  }
  // ═══════════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════════
  _coerce(value, type) {
    if (value === null)
      return null;
    switch (type) {
      case "json":
        return typeof value === "string" ? JSON.parse(value) : value;
      case "arrayBuffer":
        return new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)).buffer;
      case "stream":
        return new ReadableStream({ start(c) {
          c.enqueue(new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)));
          c.close();
        } });
      default:
        return typeof value === "string" ? value : JSON.stringify(value);
    }
  }
  _tryParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }
};

export var MIME_MAP = { ".html": "text/html;charset=utf-8", ".js": "application/javascript;charset=utf-8", ".css": "text/css;charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".pdf": "application/pdf", ".woff2": "font/woff2", ".py": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
export async function serveR2(env2, pathname) {
  const keys = [];
  if (pathname === "/")
    keys.push("index.html");
  else {
    const p = pathname.slice(1);
    keys.push(p);
    if (pathname.endsWith("/"))
      keys.push(p + "index.html");
    if (!p.match(/\.[^/]+$/))
      keys.push(p + "/index.html");
  }
  for (const key of keys) {
    try {
      const obj = await env2.ASSETS.get(key);
      if (obj) {
        const ext = (key.match(/\.[^.]+$/) || [".html"])[0].toLowerCase();
        const headers = { "Content-Type": MIME_MAP[ext] || "application/octet-stream", "X-Served-By": "weyland-r2" };
        if (ext === ".html") {
          headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
          headers["Pragma"] = "no-cache";
          headers["Expires"] = "0";
          headers["CDN-Cache-Control"] = "no-store";
          headers["Cloudflare-CDN-Cache-Control"] = "no-store";
        } else {
          headers["Cache-Control"] = "public, max-age=86400, must-revalidate";
        }
        if (obj.httpEtag)
          headers["ETag"] = obj.httpEtag;
        return new Response(obj.body, { headers });
      }
    } catch {
    }
  }
  return null;
}
export async function checkSession(env2, request2) {
  const cookies = request2.headers.get("Cookie") || "";
  const m = cookies.match(/weyland_session=([^;]+)/);
  if (!m)
    return false;
  try {
    const r = await env2.DB.prepare("SELECT id FROM weyland_sessions WHERE id = ? AND expires_at > datetime('now')").bind(m[1]).first();
    return !!r;
  } catch {
    return false;
  }
}
