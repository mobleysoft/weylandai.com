import { jsonResponse3 } from "../lib/json-response.js";

async function updateDiscoveryConfig(key, value, userId, env2) {
  const db = env2.DB;
  await db.prepare(`
        INSERT INTO discovery_engine_config (key, value, updated_at, updated_by)
        VALUES (?, ?, datetime('now'), ?)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
    `).bind(key, value, userId).run();
}

async function getDiscoveryMetrics(env2) {
  const db = env2.DB;
  const queueStats = await db.prepare(`
        SELECT status, COUNT(*) as count
        FROM cut_sheet_discovery_queue
        GROUP BY status
    `).all();
  const discoveryStats = await db.prepare(`
        SELECT status, COUNT(*) as count
        FROM cut_sheet_discoveries
        GROUP BY status
    `).all();
  const aging = await db.prepare(`
        SELECT
            CASE
                WHEN julianday('now') - julianday(discovered_at) < 1 THEN 'under_24h'
                WHEN julianday('now') - julianday(discovered_at) < 3 THEN '1_to_3_days'
                ELSE 'over_3_days'
            END as age_bucket,
            COUNT(*) as count
        FROM cut_sheet_discoveries
        WHERE status = 'pending_review'
        GROUP BY age_bucket
    `).all();
  const domainCount = await db.prepare(`
        SELECT COUNT(*) as total, SUM(verified) as verified
        FROM manufacturer_domains
    `).first();
  const approvalRate = await db.prepare(`
        SELECT
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            COUNT(*) as total
        FROM cut_sheet_discoveries
        WHERE reviewed_at > datetime('now', '-30 days')
    `).first();
  return {
    queue: Object.fromEntries((queueStats.results || []).map((r) => [r.status, r.count])),
    discoveries: Object.fromEntries((discoveryStats.results || []).map((r) => [r.status, r.count])),
    pendingAging: Object.fromEntries((aging.results || []).map((r) => [r.age_bucket, r.count])),
    domains: {
      total: domainCount?.total || 0,
      verified: domainCount?.verified || 0
    },
    approvalRate: {
      approved: approvalRate?.approved || 0,
      rejected: approvalRate?.rejected || 0,
      total: approvalRate?.total || 0,
      rate: approvalRate?.total > 0 ? (approvalRate.approved / approvalRate.total * 100).toFixed(1) + "%" : "N/A"
    }
  };
}

async function addManufacturerDomain(domainData, env2) {
  const db = env2.DB;
  const id = crypto.randomUUID();
  await db.prepare(`
        INSERT INTO manufacturer_domains (
            id, manufacturer_id, domain, domain_type, verified, priority, notes, created_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'))
    `).bind(
    id,
    domainData.manufacturerId,
    domainData.domain.toLowerCase(),
    domainData.domainType || "primary",
    domainData.priority || 5,
    domainData.notes || null
  ).run();
  return { id, ...domainData, verified: false };
}

async function verifyManufacturerDomain(domainId, userId, env2) {
  const db = env2.DB;
  await db.prepare(`
        UPDATE manufacturer_domains
        SET verified = 1, verified_by = ?, verified_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
    `).bind(userId, domainId).run();
}

/**
 * @param {object} router
 * @param {{ authenticate: Function, getDiscoveryConfig: Function, getManufacturerDomains: Function }} deps
 */
export function registerCutSheetIntelligenceRoutes(router, { authenticate, getDiscoveryConfig, getManufacturerDomains }) {
  router.get("/api/cut-sheets/intelligence/metrics", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const metrics = await getDiscoveryMetrics(env2);
      return jsonResponse3({ metrics });
    } catch (err) {
      console.error("[CutSheet Intelligence] Metrics error:", err);
      return jsonResponse3({ error: "Failed to get metrics: " + err.message }, 500);
    }
  });
  router.get("/api/cut-sheets/intelligence/config", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const config3 = await getDiscoveryConfig(env2);
      return jsonResponse3({ config: config3 });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get config: " + err.message }, 500);
    }
  });
  router.put("/api/cut-sheets/intelligence/config/:key", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const { key } = request2.params;
    try {
      const body = await request2.json();
      await updateDiscoveryConfig(key, body.value, user.userId, env2);
      return jsonResponse3({ message: "Configuration updated", key, value: body.value });
    } catch (err) {
      return jsonResponse3({ error: "Failed to update config: " + err.message }, 500);
    }
  });
  router.get("/api/cut-sheets/domains", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const url = new URL(request2.url);
    const manufacturer = url.searchParams.get("manufacturer");
    try {
      if (manufacturer) {
        const domains = await getManufacturerDomains(manufacturer, env2);
        return jsonResponse3({ domains });
      } else {
        const allDomains = await env2.DB.prepare(`
          SELECT md.*, m.name as manufacturer_name, m.slug as manufacturer_code
          FROM manufacturer_domains md
          LEFT JOIN manufacturers m ON md.manufacturer_id = m.id
          ORDER BY m.name, md.priority
        `).all();
        return jsonResponse3({ domains: allDomains.results || [] });
      }
    } catch (err) {
      return jsonResponse3({ error: "Failed to get domains: " + err.message }, 500);
    }
  });
  router.post("/api/cut-sheets/domains", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const domain2 = await addManufacturerDomain(body, env2);
      return jsonResponse3({ message: "Domain added for verification", domain: domain2 }, 201);
    } catch (err) {
      return jsonResponse3({ error: "Failed to add domain: " + err.message }, 500);
    }
  });
  router.post("/api/cut-sheets/domains/:domainId/verify", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const { domainId } = request2.params;
    try {
      await verifyManufacturerDomain(domainId, user.userId, env2);
      return jsonResponse3({ message: "Domain verified", domainId });
    } catch (err) {
      return jsonResponse3({ error: "Failed to verify domain: " + err.message }, 500);
    }
  });
}
