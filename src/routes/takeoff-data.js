// src/routes/takeoff-data.js
//
// Read-only takeoff data assembly: joins hardware sets/components,
// manual line items (doors/frames/services), settings, and vendor
// profile into the single payload the TakeoffX UI renders, computed
// per-session and per-project. Extracted 2026-09-10 from
// legacy-monolith.js (previously inline, lines 151322-151817).

import { jsonResponse3 } from "../lib/json-response.js";

export function registerTakeoffDataRoutes(router, { authenticate, requireProductAccess }) {
router.get("/api/takeoff/session/:sessionId/data", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const sessionId = request2.params.sessionId;
    const session = await env2.DB.prepare(`
      SELECT hes.id, hes.project_name, hes.filename, hes.created_at, hes.project_id,
             p.name AS proj_name, p.client_name, p.client_address, p.project_address AS proj_address,
             p.billing_name, p.billing_address, p.dsa_number, p.architect, p.contractor,
             p.metadata_affirmed
      FROM hardware_extraction_sessions hes
      LEFT JOIN projects p ON hes.project_id = p.id
      WHERE hes.id = ? AND hes.user_id = ?
    `).bind(sessionId, user.userId).first();
    if (!session) {
      return jsonResponse3({ error: "Session not found" }, 404);
    }
    const hardwareSets = await env2.DB.prepare(`
      SELECT
        hs.id,
        hs.set_number,
        hs.set_name,
        hs.door_count,
        hs.notes,
        hs.unit_price_override,
        hs.affirmed,
        COUNT(hc.id) as component_count,
        COALESCE(hs.unit_price_override, SUM(
          COALESCE(hc.quantity, 1) *
          COALESCE(hc.unit_price, 0) *
          CASE hc.uom
            WHEN 'PR' THEN 2
            ELSE 1
          END
        )) as set_unit_price,
        (hs.door_count * COALESCE(hs.unit_price_override, SUM(
          COALESCE(hc.quantity, 1) *
          COALESCE(hc.unit_price, 0) *
          CASE hc.uom
            WHEN 'PR' THEN 2
            ELSE 1
          END
        ))) as line_total
      FROM hardware_sets hs
      LEFT JOIN hardware_components hc ON hc.set_id = hs.id
      WHERE hs.session_id = ?
      GROUP BY hs.id
      ORDER BY hs.set_number
    `).bind(sessionId).all();
    const componentDetails = await env2.DB.prepare(`
      SELECT
        hc.id,
        hc.set_id,
        hc.quantity,
        hc.component_type,
        hc.manufacturer,
        hc.model,
        hc.finish,
        hc.catalog_number,
        hc.uom,
        hc.unit_price,
        hc.price_source,
        hc.product_variant_id,
        hc.affirmed
      FROM hardware_components hc
      JOIN hardware_sets hs ON hc.set_id = hs.id
      WHERE hs.session_id = ?
      ORDER BY hs.set_number, hc.sequence_order
    `).bind(sessionId).all();
    const componentsBySet = {};
    for (const comp of componentDetails.results || []) {
      if (!componentsBySet[comp.set_id]) {
        componentsBySet[comp.set_id] = [];
      }
      componentsBySet[comp.set_id].push(comp);
    }
    const enrichedSets = (hardwareSets.results || []).map((set) => {
      const comps = componentsBySet[set.id] || [];
      const sources = comps.map((c) => c.price_source).filter(Boolean);
      const priceSource = sources.includes("user_selected") ? "user_selected" : sources.includes("manual") ? "manual" : sources.includes("catalog") ? "catalog" : null;
      return {
        ...set,
        components: comps,
        price_source: priceSource,
        description: comps.map((c) => `${c.quantity || 1} ${c.manufacturer || ""} ${c.model || ""} ${c.finish || ""}`.trim()).join("\n")
      };
    });
    const lineItems = await env2.DB.prepare(`
      SELECT *
      FROM takeoff_line_items
      WHERE session_id = ?
      ORDER BY category, sort_order
    `).bind(sessionId).all();
    const doors = (lineItems.results || []).filter((item) => item.category === "door");
    const frames = (lineItems.results || []).filter((item) => item.category === "frame");
    const services = (lineItems.results || []).filter((item) => item.category === "service");
    const settings = await env2.DB.prepare(`
      SELECT *
      FROM takeoff_settings
      WHERE session_id = ?
    `).bind(sessionId).first();
    let vendorProfile = null;
    if (user && user.tenantId) {
      vendorProfile = await env2.DB.prepare(
        "SELECT * FROM vendor_profile WHERE tenant_id = ?"
      ).bind(user.tenantId).first();
    }
    const hardwareSubtotal = enrichedSets.reduce((sum2, set) => sum2 + (set.line_total || 0), 0);
    const doorsSubtotal = doors.reduce((sum2, d) => sum2 + (d.quantity || 0) * (d.unit_price || 0), 0);
    const framesSubtotal = frames.reduce((sum2, f) => sum2 + (f.quantity || 0) * (f.unit_price || 0), 0);
    const servicesSubtotal = services.reduce((sum2, s) => sum2 + (s.quantity || 0) * (s.unit_price || 0), 0);
    const subtotal = hardwareSubtotal + doorsSubtotal + framesSubtotal + servicesSubtotal;
    const taxRate = settings?.tax_rate || 0;
    const taxableAmount = hardwareSubtotal + doorsSubtotal + framesSubtotal + services.filter((s) => s.taxable).reduce((sum2, s) => sum2 + (s.quantity || 0) * (s.unit_price || 0), 0);
    const taxAmount = taxableAmount * taxRate;
    const grandTotal = subtotal + taxAmount;
    const projectData = session.project_id ? {
      id: session.project_id,
      name: session.proj_name,
      client_name: session.metadata_affirmed ? session.client_name : null,
      client_address: session.metadata_affirmed ? session.client_address : null,
      project_address: session.metadata_affirmed ? session.proj_address : null,
      billing_name: session.metadata_affirmed ? session.billing_name : null,
      billing_address: session.metadata_affirmed ? session.billing_address : null,
      dsa_number: session.metadata_affirmed ? session.dsa_number : null,
      architect: session.metadata_affirmed ? session.architect : null,
      contractor: session.metadata_affirmed ? session.contractor : null,
      metadata_affirmed: session.metadata_affirmed
    } : null;
    return jsonResponse3({
      success: true,
      sessionId,
      project: session.project_name || session.filename,
      projectData,
      createdAt: session.created_at,
      // Hardware sets with pricing
      hardwareSets: enrichedSets,
      hardwareSubtotal,
      // Manual line items
      doors,
      doorsSubtotal,
      frames,
      framesSubtotal,
      services,
      servicesSubtotal,
      // Settings (per-session quote config)
      settings: settings || {
        tax_rate: 0,
        tax_jurisdiction: null,
        validity_days: 30,
        exclusions_text: null
      },
      // Vendor profile (26H — tenant-level identity, WHO THIS IS FROM)
      vendorProfile: vendorProfile || null,
      // Calculated totals
      totals: {
        subtotal,
        taxableAmount,
        taxRate,
        taxAmount,
        grandTotal
      },
      // Summary counts
      summary: {
        totalSets: enrichedSets.length,
        totalDoors: enrichedSets.reduce((sum2, s) => sum2 + (s.door_count || 0), 0),
        totalComponents: enrichedSets.reduce((sum2, s) => sum2 + (s.component_count || 0), 0),
        doorLineItems: doors.length,
        frameLineItems: frames.length,
        serviceLineItems: services.length
      }
    });
  } catch (error5) {
    console.error("[Takeoff Data] Error:", error5);
    return jsonResponse3({ error: "Failed to get takeoff data", details: error5.message }, 500);
  }
});
router.get("/api/takeoff/project/:projectId/data", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const projectId = request2.params.projectId;
    const project = await env2.DB.prepare(
      "SELECT * FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, user.tenantId).first();
    if (!project) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    const sessionsResult = await env2.DB.prepare(`
      SELECT id, project_name, filename, document_type, created_at
      FROM hardware_extraction_sessions
      WHERE project_id = ?
      ORDER BY created_at ASC
    `).bind(projectId).all();
    const sessions2 = sessionsResult.results || [];
    const sessionIds = sessions2.map((s) => s.id);
    if (sessionIds.length === 0) {
      return jsonResponse3({
        success: true,
        scope: "project",
        projectId,
        projectData: {
          id: project.id,
          name: project.name,
          client_name: project.metadata_affirmed ? project.client_name : null,
          client_address: project.metadata_affirmed ? project.client_address : null,
          project_address: project.metadata_affirmed ? project.project_address : null,
          billing_name: project.metadata_affirmed ? project.billing_name : null,
          billing_address: project.metadata_affirmed ? project.billing_address : null,
          dsa_number: project.metadata_affirmed ? project.dsa_number : null,
          architect: project.metadata_affirmed ? project.architect : null,
          contractor: project.metadata_affirmed ? project.contractor : null,
          metadata_affirmed: project.metadata_affirmed
        },
        sessions: [],
        hardwareSets: [],
        hardwareSubtotal: 0,
        doorScheduleEntries: [],
        doorScheduleSummary: { totalMarks: 0, totalGroups: 0, groupBreakdown: [] },
        doors: [],
        doorsSubtotal: 0,
        frames: [],
        framesSubtotal: 0,
        services: [],
        servicesSubtotal: 0,
        settings: { tax_rate: 0, tax_jurisdiction: null, validity_days: 30, exclusions_text: null },
        vendorProfile: null,
        totals: { subtotal: 0, taxableAmount: 0, taxRate: 0, taxAmount: 0, grandTotal: 0 },
        summary: { totalSets: 0, totalDoors: 0, totalComponents: 0, doorLineItems: 0, frameLineItems: 0, serviceLineItems: 0 }
      });
    }
    const placeholders = sessionIds.map(() => "?").join(",");
    const hwScheduleSessionIds = sessions2.filter((s) => s.document_type === "hardware_schedule").map((s) => s.id);
    const canonicalSetSessionIds = hwScheduleSessionIds.length ? hwScheduleSessionIds : sessionIds;
    const setPlaceholders = canonicalSetSessionIds.map(() => "?").join(",");
    const hardwareSets = await env2.DB.prepare(`
      SELECT
        hs.id,
        hs.session_id,
        hs.set_number,
        hs.set_name,
        hs.door_count,
        hs.notes,
        hs.affirmed,
        hs.approved_from_page,
        hs.unit_price_override,
        COUNT(hc.id) as component_count,
        COALESCE(hs.unit_price_override, SUM(
          COALESCE(hc.quantity, 1) *
          COALESCE(hc.unit_price, 0) *
          CASE hc.uom
            WHEN 'PR' THEN 2
            ELSE 1
          END
        )) as set_unit_price,
        (hs.door_count * COALESCE(hs.unit_price_override, SUM(
          COALESCE(hc.quantity, 1) *
          COALESCE(hc.unit_price, 0) *
          CASE hc.uom
            WHEN 'PR' THEN 2
            ELSE 1
          END
        ))) as line_total
      FROM hardware_sets hs
      LEFT JOIN hardware_components hc ON hc.set_id = hs.id
      WHERE hs.session_id IN (${setPlaceholders})
      GROUP BY hs.id
      ORDER BY hs.set_number
    `).bind(...canonicalSetSessionIds).all();
    const componentDetails = await env2.DB.prepare(`
      SELECT
        hc.id,
        hc.set_id,
        hc.quantity,
        hc.component_type,
        hc.manufacturer,
        hc.model,
        hc.finish,
        hc.catalog_number,
        hc.uom,
        hc.unit_price,
        hc.price_source,
        hc.product_variant_id,
        hc.affirmed
      FROM hardware_components hc
      JOIN hardware_sets hs ON hc.set_id = hs.id
      WHERE hs.session_id IN (${setPlaceholders})
      ORDER BY hs.set_number, hc.sequence_order
    `).bind(...canonicalSetSessionIds).all();
    const componentsBySet = {};
    for (const comp of componentDetails.results || []) {
      if (!componentsBySet[comp.set_id]) {
        componentsBySet[comp.set_id] = [];
      }
      componentsBySet[comp.set_id].push(comp);
    }
    const sessionLookup = {};
    for (const s of sessions2) {
      sessionLookup[s.id] = s.filename || s.project_name || s.id;
    }
    const enrichedSets = (hardwareSets.results || []).map((set) => {
      const comps = componentsBySet[set.id] || [];
      const sources = comps.map((c) => c.price_source).filter(Boolean);
      const priceSource = sources.includes("user_selected") ? "user_selected" : sources.includes("manual") ? "manual" : sources.includes("catalog") ? "catalog" : null;
      return {
        ...set,
        source_session: sessionLookup[set.session_id] || set.session_id,
        components: comps,
        price_source: priceSource,
        description: comps.map((c) => `${c.quantity || 1} ${c.manufacturer || ""} ${c.model || ""} ${c.finish || ""}`.trim()).join("\n")
      };
    });
    const dseResult = await env2.DB.prepare(`
      SELECT
        dse.id, dse.session_id, dse.mark, dse.hardware_group, dse.fire_rating,
        dse.width, dse.height, dse.door_type, dse.door_material,
        dse.frame_type, dse.frame_material, dse.panic, dse.thickness,
        dse.notes, dse.validation_status, dse.page_number, dse.hardware_set_id
      FROM door_schedule_entries dse
      WHERE dse.session_id IN (${placeholders})
      ORDER BY dse.hardware_group, dse.mark
    `).bind(...sessionIds).all();
    const doorScheduleEntries = (dseResult.results || []).map((e) => ({
      ...e,
      source_session: sessionLookup[e.session_id] || e.session_id
    }));
    const groupMap = {};
    for (const entry of doorScheduleEntries) {
      const group3 = entry.hardware_group || "Ungrouped";
      if (!groupMap[group3]) {
        groupMap[group3] = { group: group3, markCount: 0, marks: [] };
      }
      groupMap[group3].markCount++;
      groupMap[group3].marks.push(entry.mark);
    }
    const groupBreakdown = Object.values(groupMap).sort((a, b) => a.group.localeCompare(b.group));
    const doorScheduleSummary = {
      totalMarks: doorScheduleEntries.length,
      totalGroups: groupBreakdown.length,
      groupBreakdown
    };
    const lineItems = await env2.DB.prepare(`
      SELECT tli.*
      FROM takeoff_line_items tli
      WHERE tli.session_id IN (${placeholders})
      ORDER BY tli.category, tli.sort_order
    `).bind(...sessionIds).all();
    const doors = (lineItems.results || []).filter((item) => item.category === "door");
    const frames = (lineItems.results || []).filter((item) => item.category === "frame");
    const services = (lineItems.results || []).filter((item) => item.category === "service");
    const settings = await env2.DB.prepare(`
      SELECT * FROM takeoff_settings WHERE session_id IN (${placeholders}) LIMIT 1
    `).bind(...sessionIds).first();
    let vendorProfile = null;
    if (user && user.tenantId) {
      vendorProfile = await env2.DB.prepare(
        "SELECT * FROM vendor_profile WHERE tenant_id = ?"
      ).bind(user.tenantId).first();
    }
    const markCountsBySetId = {};
    const marksBySetId = {};
    const hasDoorSchedule = sessions2.some((s) => s.document_type === "door_schedule");
    for (const e of doorScheduleEntries) {
      if (!e.hardware_set_id)
        continue;
      markCountsBySetId[e.hardware_set_id] = (markCountsBySetId[e.hardware_set_id] || 0) + 1;
      (marksBySetId[e.hardware_set_id] = marksBySetId[e.hardware_set_id] || []).push(e.mark);
    }
    const unpricedComps = [];
    for (const set of enrichedSets) {
      for (const comp of set.components)
        if (comp.unit_price == null)
          unpricedComps.push(comp);
    }
    let pricingCoverage = null;
    if (unpricedComps.length) {
      const resolved = await resolveCataloguePrices(env2, unpricedComps);
      let priced = 0;
      for (let i = 0; i < unpricedComps.length; i++) {
        const r = resolved[i];
        if (r && r.price != null) {
          unpricedComps[i].unit_price = r.price;
          unpricedComps[i].price_source = "cps_catalogue_live";
          unpricedComps[i].price_confidence = r.confidence;
          priced++;
        }
      }
      pricingCoverage = { components_needing_price: unpricedComps.length, priced_live: priced };
    }
    for (const set of enrichedSets) {
      if (set.unit_price_override == null) {
        let setUnitPrice = 0;
        for (const comp of set.components) {
          const uom = String(comp.uom || "EA").toUpperCase();
          setUnitPrice += (comp.quantity || 1) * (comp.unit_price || 0) * (uom === "PR" || uom === "PAIR" ? 2 : 1);
        }
        set.set_unit_price = setUnitPrice;
      }
      if (hasDoorSchedule)
        set.door_count = markCountsBySetId[set.id] || 0;
      set.marks_using = marksBySetId[set.id] || [];
      set.line_total = (set.set_unit_price || 0) * (set.door_count || 0 || (hasDoorSchedule ? 0 : 1));
    }
    const hardwareSubtotal = enrichedSets.reduce((sum2, set) => sum2 + (set.line_total || 0), 0);
    const doorsSubtotal = doors.reduce((sum2, d) => sum2 + (d.quantity || 0) * (d.unit_price || 0), 0);
    const framesSubtotal = frames.reduce((sum2, f) => sum2 + (f.quantity || 0) * (f.unit_price || 0), 0);
    const servicesSubtotal = services.reduce((sum2, s) => sum2 + (s.quantity || 0) * (s.unit_price || 0), 0);
    const subtotal = hardwareSubtotal + doorsSubtotal + framesSubtotal + servicesSubtotal;
    const taxRate = settings?.tax_rate || 0;
    const taxableAmount = hardwareSubtotal + doorsSubtotal + framesSubtotal + services.filter((s) => s.taxable).reduce((sum2, s) => sum2 + (s.quantity || 0) * (s.unit_price || 0), 0);
    const taxAmount = taxableAmount * taxRate;
    const grandTotal = subtotal + taxAmount;
    const projectData = {
      id: project.id,
      name: project.name,
      client_name: project.metadata_affirmed ? project.client_name : null,
      client_address: project.metadata_affirmed ? project.client_address : null,
      project_address: project.metadata_affirmed ? project.project_address : null,
      billing_name: project.metadata_affirmed ? project.billing_name : null,
      billing_address: project.metadata_affirmed ? project.billing_address : null,
      dsa_number: project.metadata_affirmed ? project.dsa_number : null,
      architect: project.metadata_affirmed ? project.architect : null,
      contractor: project.metadata_affirmed ? project.contractor : null,
      metadata_affirmed: project.metadata_affirmed
    };
    return jsonResponse3({
      success: true,
      scope: "project",
      projectId,
      project: project.name,
      projectData,
      sessions: sessions2.map((s) => ({
        id: s.id,
        filename: s.filename,
        document_type: s.document_type,
        created_at: s.created_at
      })),
      // Hardware sets with pricing (canonical sessions, annotated with source)
      hardwareSets: enrichedSets,
      hardwareSubtotal,
      pricing: pricingCoverage,
      // Door schedule entries (Stream A — previously invisible in takeoff)
      doorScheduleEntries,
      doorScheduleSummary,
      // Manual line items (across all sessions)
      doors,
      doorsSubtotal,
      frames,
      framesSubtotal,
      services,
      servicesSubtotal,
      // Settings (from first linked session)
      settings: settings || {
        tax_rate: 0,
        tax_jurisdiction: null,
        validity_days: 30,
        exclusions_text: null
      },
      // Vendor profile (tenant-level identity)
      vendorProfile: vendorProfile || null,
      // Calculated totals
      totals: {
        subtotal,
        taxableAmount,
        taxRate,
        taxAmount,
        grandTotal
      },
      // Summary counts
      summary: {
        totalSets: enrichedSets.length,
        totalDoors: enrichedSets.reduce((sum2, s) => sum2 + (s.door_count || 0), 0),
        totalComponents: enrichedSets.reduce((sum2, s) => sum2 + (s.component_count || 0), 0),
        doorScheduleMarks: doorScheduleEntries.length,
        doorScheduleGroups: groupBreakdown.length,
        doorLineItems: doors.length,
        frameLineItems: frames.length,
        serviceLineItems: services.length,
        sessionCount: sessions2.length
      }
    });
  } catch (error5) {
    console.error("[Takeoff Project Data] Error:", error5);
    return jsonResponse3({ error: "Failed to get project takeoff data", details: error5.message }, 500);
  }
});
}
