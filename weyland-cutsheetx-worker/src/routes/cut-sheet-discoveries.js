import { jsonResponse3 } from "../lib/json-response.js";

function isAuthorizedDomain(url, verifiedDomains) {
  try {
    const parsed = new URL(url);
    return verifiedDomains.some(
      (d) => parsed.hostname === d.domain || parsed.hostname.endsWith("." + d.domain)
    );
  } catch {
    return false;
  }
}


async function getPendingDiscoveries(options, env2) {
  const db = env2.DB;
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  const discoveries = await db.prepare(`
        SELECT
            csd.*,
            hc.component_type,
            hc.manufacturer,
            hc.model,
            hc.catalog_number,
            hc.dhi_category
        FROM cut_sheet_discoveries csd
        LEFT JOIN hardware_components hc ON csd.component_id = hc.id
        WHERE csd.status = 'pending_review'
        ORDER BY csd.discovered_at DESC
        LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
  const countResult = await db.prepare(`
        SELECT COUNT(*) as total FROM cut_sheet_discoveries WHERE status = 'pending_review'
    `).first();
  return {
    discoveries: discoveries.results || [],
    total: countResult?.total || 0,
    limit,
    offset
  };
}


async function getDiscoveryForReview(discoveryId, env2) {
  const db = env2.DB;
  const discovery = await db.prepare(`
        SELECT
            csd.*,
            hc.component_type,
            hc.manufacturer,
            hc.model,
            hc.catalog_number,
            hc.dhi_category,
            hc.specifications as component_specs
        FROM cut_sheet_discoveries csd
        LEFT JOIN hardware_components hc ON csd.component_id = hc.id
        WHERE csd.id = ?
    `).bind(discoveryId).first();
  if (discovery && discovery.extracted_metadata) {
    try {
      discovery.extracted_metadata = JSON.parse(discovery.extracted_metadata);
    } catch {
    }
  }
  return discovery;
}


async function approveDiscovery(discoveryId, approvalData, user, env2) {
  const db = env2.DB;
  const discovery = await db.prepare(`
        SELECT * FROM cut_sheet_discoveries WHERE id = ?
    `).bind(discoveryId).first();
  if (!discovery) {
    throw new Error("Discovery not found");
  }
  if (discovery.status !== "pending_review") {
    throw new Error(`Cannot approve discovery with status: ${discovery.status}`);
  }
  const productId = approvalData.productId;
  const corrections = approvalData.corrections || null;
  const docId = crypto.randomUUID();
  const permanentKey = productId ? `products/${productId}/cut_sheets/${discovery.file_hash_sha256 || docId}.pdf` : `unlinked/cut_sheets/${discovery.file_hash_sha256 || docId}.pdf`;
  if (discovery.temp_r2_key && env2.OUTPUTS && env2.UPLOADS) {
    try {
      const tempFile = await env2.UPLOADS.get(discovery.temp_r2_key);
      if (tempFile) {
        await env2.OUTPUTS.put(permanentKey, tempFile);
      }
    } catch (error4) {
      console.error("[Approval] Error moving file:", error4.message);
    }
  }
  await db.prepare(`
        INSERT INTO product_documents (
            id, product_id, document_type, document_title,
            document_url, r2_object_key, r2_bucket,
            file_size_bytes, file_hash_sha256, page_count,
            verified, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'product-docs', ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
    `).bind(
    docId,
    productId || null,
    discovery.document_type || "cut_sheet",
    approvalData.title || discovery.document_title || "Cut Sheet",
    discovery.source_url,
    // Store source URL as document_url
    permanentKey,
    discovery.file_size_bytes,
    discovery.file_hash_sha256,
    discovery.page_count,
    JSON.stringify({
      approved_by: user.userId,
      approved_at: (/* @__PURE__ */ new Date()).toISOString(),
      source_domain: discovery.source_domain,
      extracted_metadata: corrections ? corrections : discovery.extracted_metadata
    })
  ).run();
  await db.prepare(`
        UPDATE cut_sheet_discoveries
        SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now'),
            corrections = ?, product_document_id = ?, updated_at = datetime('now')
        WHERE id = ?
    `).bind(
    user.userId,
    corrections ? JSON.stringify(corrections) : null,
    docId,
    discoveryId
  ).run();
  if (discovery.temp_r2_key && env2.UPLOADS) {
    try {
      await env2.UPLOADS.delete(discovery.temp_r2_key);
    } catch {
    }
  }
  return {
    success: true,
    documentId: docId,
    productId,
    approvedBy: user.name || user.userId,
    approvedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}


async function rejectDiscovery(discoveryId, reason, user, env2) {
  const db = env2.DB;
  if (!reason || reason.trim().length < 5) {
    throw new Error("Rejection reason is required (minimum 5 characters)");
  }
  const discovery = await db.prepare(`
        SELECT * FROM cut_sheet_discoveries WHERE id = ?
    `).bind(discoveryId).first();
  if (!discovery) {
    throw new Error("Discovery not found");
  }
  if (discovery.status !== "pending_review") {
    throw new Error(`Cannot reject discovery with status: ${discovery.status}`);
  }
  await db.prepare(`
        UPDATE cut_sheet_discoveries
        SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'),
            rejection_reason = ?, updated_at = datetime('now')
        WHERE id = ?
    `).bind(user.userId, reason.trim(), discoveryId).run();
  if (discovery.temp_r2_key && env2.UPLOADS) {
    try {
      await env2.UPLOADS.delete(discovery.temp_r2_key);
    } catch {
    }
  }
  return {
    success: true,
    rejectedBy: user.name || user.userId,
    reason: reason.trim()
  };
}


async function submitManualDiscovery(submissionData, user, env2, getManufacturerDomains) {
  const { sourceUrl, componentId, manufacturer, model, documentTitle, notes } = submissionData;
  if (!sourceUrl) {
    throw new Error("Source URL is required");
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    throw new Error("Invalid URL format");
  }
  const sourceDomain = parsedUrl.hostname;
  const domains = await getManufacturerDomains(manufacturer || "", env2);
  const isDomainVerified = isAuthorizedDomain(sourceUrl, domains);
  const id = crypto.randomUUID();
  const db = env2.DB;
  await db.prepare(`
        INSERT INTO cut_sheet_discoveries (
            id, component_id, source_url, source_domain,
            document_title, document_type,
            extracted_metadata, extraction_confidence, status,
            created_at
        ) VALUES (?, ?, ?, ?, ?, 'cut_sheet', ?, ?, 'pending_review', datetime('now'))
    `).bind(
    id,
    componentId || null,
    sourceUrl,
    sourceDomain,
    documentTitle || null,
    JSON.stringify({
      manualSubmission: true,
      submittedBy: user.userId,
      manufacturer,
      model,
      notes,
      domainVerified: isDomainVerified
    }),
    isDomainVerified ? 0.7 : 0.3
    // Lower confidence for unverified domains
  ).run();
  return {
    id,
    status: "pending_review",
    domainVerified: isDomainVerified,
    warning: !isDomainVerified ? `Domain "${sourceDomain}" is not in the verified manufacturer domains list` : null
  };
}


/**
 * @param {object} router
 * @param {{ authenticate: Function, queueForDiscovery: Function, getManufacturerDomains: Function }} deps
 */
export function registerCutSheetDiscoveriesRoutes(router, { authenticate, queueForDiscovery, getManufacturerDomains }) {
  router.post("/api/cut-sheets/queue", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const result = await queueForDiscovery(body, user.userId, env2);
      if (result.status === "queued" && env2.DISCOVERY_QUEUE) {
        const domains = await getManufacturerDomains(body.manufacturer || "", env2);
        await env2.DISCOVERY_QUEUE.send({
          queueItemId: result.id,
          componentId: body.id,
          manufacturer: body.manufacturer || body.manufacturer_code,
          model: body.model || body.model_number,
          catalogNumber: body.catalog_number,
          verifiedDomains: domains
        });
        result.automatedDiscoveryQueued = true;
      }
      return jsonResponse3(result, result.status === "queued" ? 201 : 200);
    } catch (err) {
      return jsonResponse3({ error: "Failed to queue for discovery: " + err.message }, 500);
    }
  });
  router.post("/api/cut-sheets/queue/batch", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const { components } = body;
      if (!components || !Array.isArray(components)) {
        return jsonResponse3({ error: "components array required" }, 400);
      }
      const results = [];
      for (const component of components) {
        try {
          const result = await queueForDiscovery(component, user.userId, env2);
          results.push({ componentId: component.id, ...result });
        } catch (err) {
          results.push({ componentId: component.id, error: err.message });
        }
      }
      const queued = results.filter((r) => r.status === "queued").length;
      const existing = results.filter((r) => r.status === "sheet_exists").length;
      return jsonResponse3({
        message: `Queued ${queued} components, ${existing} already have sheets`,
        results
      });
    } catch (err) {
      return jsonResponse3({ error: "Batch queue failed: " + err.message }, 500);
    }
  });
  router.get("/api/cut-sheets/discoveries", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const url = new URL(request2.url);
    const componentId = url.searchParams.get("componentId");
    const status = url.searchParams.get("status") || "pending_review";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    try {
      const db = env2.DB;
      let query = `
        SELECT csd.*, hc.component_type, hc.manufacturer, hc.model, hc.catalog_number
        FROM cut_sheet_discoveries csd
        LEFT JOIN hardware_components hc ON csd.component_id = hc.id
        WHERE 1=1
      `;
      const params = [];
      if (componentId) {
        query += ` AND csd.component_id = ?`;
        params.push(componentId);
      }
      if (status) {
        query += ` AND csd.status = ?`;
        params.push(status);
      }
      query += ` ORDER BY csd.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      const stmt = db.prepare(query);
      const results = await stmt.bind(...params).all();
      let countQuery = `SELECT COUNT(*) as total FROM cut_sheet_discoveries WHERE 1=1`;
      const countParams = [];
      if (componentId) {
        countQuery += ` AND component_id = ?`;
        countParams.push(componentId);
      }
      if (status) {
        countQuery += ` AND status = ?`;
        countParams.push(status);
      }
      const countStmt = db.prepare(countQuery);
      const countResult = await countStmt.bind(...countParams).first();
      return jsonResponse3({
        discoveries: results.results || [],
        total: countResult?.total || 0,
        limit,
        offset
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get discoveries: " + err.message }, 500);
    }
  });
  router.get("/api/cut-sheets/discoveries/pending", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const url = new URL(request2.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    try {
      const result = await getPendingDiscoveries({ limit, offset }, env2);
      return jsonResponse3(result);
    } catch (err) {
      return jsonResponse3({ error: "Failed to get pending discoveries: " + err.message }, 500);
    }
  });
  router.get("/api/cut-sheets/discoveries/:discoveryId", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const { discoveryId } = request2.params;
    try {
      const discovery = await getDiscoveryForReview(discoveryId, env2);
      if (!discovery) {
        return jsonResponse3({ error: "Discovery not found" }, 404);
      }
      return jsonResponse3({ discovery });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get discovery: " + err.message }, 500);
    }
  });
  router.post("/api/cut-sheets/discoveries/manual", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    try {
      const body = await request2.json();
      const result = await submitManualDiscovery(body, user, env2, getManufacturerDomains);
      return jsonResponse3(result, 201);
    } catch (err) {
      return jsonResponse3({ error: "Manual submission failed: " + err.message }, 400);
    }
  });
  router.post("/api/cut-sheets/discoveries/:discoveryId/approve", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const { discoveryId } = request2.params;
    try {
      const body = await request2.json();
      const result = await approveDiscovery(discoveryId, body, user, env2);
      return jsonResponse3(result);
    } catch (err) {
      return jsonResponse3({ error: "Approval failed: " + err.message }, 400);
    }
  });
  router.post("/api/cut-sheets/discoveries/:discoveryId/reject", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    const { discoveryId } = request2.params;
    try {
      const body = await request2.json();
      const result = await rejectDiscovery(discoveryId, body.reason, user, env2);
      return jsonResponse3(result);
    } catch (err) {
      return jsonResponse3({ error: "Rejection failed: " + err.message }, 400);
    }
  });
}
