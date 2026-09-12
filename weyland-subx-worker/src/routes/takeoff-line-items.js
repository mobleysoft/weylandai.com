// src/routes/takeoff-line-items.js
//
// Takeoff settings + manual line-item CRUD (doors/frames/services),
// hardware-set price overrides, and materializing a door-schedule
// extraction session (or a whole project's sessions) into takeoff line
// items. Extracted 2026-09-10 from legacy-monolith.js (previously
// inline, lines 151818-152367).

import { jsonResponse3 } from "../lib/json-response.js";

export function registerTakeoffLineItemsRoutes(router, { authenticate, requireProductAccess }) {
router.post("/api/takeoff/session/:sessionId/settings", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const sessionId = request2.params.sessionId;
    const body = await request2.json();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existing = await env2.DB.prepare(`
      SELECT id FROM takeoff_settings WHERE session_id = ?
    `).bind(sessionId).first();
    if (existing) {
      await env2.DB.prepare(`
        UPDATE takeoff_settings SET
          tax_rate = ?,
          tax_jurisdiction = ?,
          validity_days = ?,
          exclusions_text = ?,
          company_name = ?,
          company_address = ?,
          company_phone = ?,
          company_email = ?,
          logo_url = ?,
          show_unit_prices = ?,
          show_extended_prices = ?,
          include_addendum = ?,
          grouping_mode = ?,
          updated_at = ?
        WHERE session_id = ?
      `).bind(
        body.tax_rate || 0,
        body.tax_jurisdiction || null,
        body.validity_days || 30,
        body.exclusions_text || null,
        body.company_name || null,
        body.company_address || null,
        body.company_phone || null,
        body.company_email || null,
        body.logo_url || null,
        body.show_unit_prices !== false ? 1 : 0,
        body.show_extended_prices !== false ? 1 : 0,
        body.include_addendum ? 1 : 0,
        body.grouping_mode || "by_set",
        now,
        sessionId
      ).run();
    } else {
      const settingsId = crypto.randomUUID();
      await env2.DB.prepare(`
        INSERT INTO takeoff_settings
        (id, session_id, tax_rate, tax_jurisdiction, validity_days, exclusions_text,
         company_name, company_address, company_phone, company_email, logo_url,
         show_unit_prices, show_extended_prices, include_addendum, grouping_mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        settingsId,
        sessionId,
        body.tax_rate || 0,
        body.tax_jurisdiction || null,
        body.validity_days || 30,
        body.exclusions_text || null,
        body.company_name || null,
        body.company_address || null,
        body.company_phone || null,
        body.company_email || null,
        body.logo_url || null,
        body.show_unit_prices !== false ? 1 : 0,
        body.show_extended_prices !== false ? 1 : 0,
        body.include_addendum ? 1 : 0,
        body.grouping_mode || "by_set",
        now,
        now
      ).run();
    }
    return jsonResponse3({ success: true, message: "Settings saved" });
  } catch (error5) {
    console.error("[Takeoff Settings] Error:", error5);
    return jsonResponse3({ error: "Failed to save settings", details: error5.message }, 500);
  }
});
router.post("/api/takeoff/session/:sessionId/line-items", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const sessionId = request2.params.sessionId;
    const body = await request2.json();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const itemId = crypto.randomUUID();
    if (!body.category || !["door", "frame", "service"].includes(body.category)) {
      return jsonResponse3({ error: "Invalid category. Must be door, frame, or service" }, 400);
    }
    await env2.DB.prepare(`
      INSERT INTO takeoff_line_items
      (id, session_id, category, sort_order, description, spec_type, size, material, finish, rating,
       quantity, uom, unit_price, notes, taxable, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      itemId,
      sessionId,
      body.category,
      body.sort_order || 0,
      body.description || null,
      body.spec_type || null,
      body.size || null,
      body.material || null,
      body.finish || null,
      body.rating || null,
      body.quantity || 1,
      body.uom || "EA",
      body.unit_price || null,
      body.notes || null,
      body.taxable !== false ? 1 : 0,
      now,
      now
    ).run();
    return jsonResponse3({ success: true, id: itemId, message: "Line item added" });
  } catch (error5) {
    console.error("[Takeoff Line Item] Error:", error5);
    return jsonResponse3({ error: "Failed to add line item", details: error5.message }, 500);
  }
});
router.delete("/api/takeoff/session/:sessionId/line-items/:itemId", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const { sessionId, itemId } = request2.params;
    const result = await env2.DB.prepare(`
      DELETE FROM takeoff_line_items WHERE id = ? AND session_id = ?
    `).bind(itemId, sessionId).run();
    if (result.changes === 0) {
      return jsonResponse3({ error: "Line item not found" }, 404);
    }
    return jsonResponse3({ success: true, message: "Line item deleted" });
  } catch (error5) {
    console.error("[Takeoff Delete Line Item] Error:", error5);
    return jsonResponse3({ error: "Failed to delete line item", details: error5.message }, 500);
  }
});
router.put("/api/takeoff/session/:sessionId/line-items/:itemId", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const { sessionId, itemId } = request2.params;
    const body = await request2.json();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const editableFields = [
      "description",
      "spec_type",
      "size",
      "material",
      "finish",
      "rating",
      "quantity",
      "uom",
      "unit_price",
      "notes",
      "taxable",
      "sort_order"
    ];
    const setClauses = [];
    const values2 = [];
    for (const field of editableFields) {
      if (field in body) {
        setClauses.push(`${field} = ?`);
        if (field === "taxable") {
          values2.push(body[field] ? 1 : 0);
        } else {
          values2.push(body[field]);
        }
      }
    }
    if (setClauses.length === 0) {
      return jsonResponse3({ error: "No editable fields provided" }, 400);
    }
    setClauses.push("updated_at = ?");
    values2.push(now);
    values2.push(itemId, sessionId);
    const result = await env2.DB.prepare(`
      UPDATE takeoff_line_items SET ${setClauses.join(", ")} WHERE id = ? AND session_id = ?
    `).bind(...values2).run();
    if (result.changes === 0) {
      return jsonResponse3({ error: "Line item not found" }, 404);
    }
    return jsonResponse3({ success: true, message: "Line item updated" });
  } catch (error5) {
    console.error("[Takeoff Update Line Item] Error:", error5);
    return jsonResponse3({ error: "Failed to update line item", details: error5.message }, 500);
  }
});
router.put("/api/takeoff/sets/:setId/price", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const setId = request2.params.setId;
    const body = await request2.json();
    const set = await env2.DB.prepare(`
      SELECT hs.id, hs.set_number, hs.session_id, hes.user_id
      FROM hardware_sets hs
      JOIN hardware_extraction_sessions hes ON hs.session_id = hes.id
      WHERE hs.id = ?
    `).bind(setId).first();
    if (!set) {
      return jsonResponse3({ error: "Hardware set not found" }, 404);
    }
    if (set.user_id !== user.userId) {
      return jsonResponse3({ error: "Unauthorized" }, 403);
    }
    const priceOverride = body.unit_price_override !== void 0 ? body.unit_price_override : void 0;
    if (priceOverride === void 0) {
      return jsonResponse3({ error: "unit_price_override field required (number or null to clear)" }, 400);
    }
    let overrideValue = null;
    if (priceOverride !== null) {
      const n = Number(priceOverride);
      const emptyStr = typeof priceOverride === "string" && priceOverride.trim() === "";
      if (emptyStr || !Number.isFinite(n) || n < 0) {
        return jsonResponse3({ error: "unit_price_override must be a non-negative number, or null to clear" }, 400);
      }
      overrideValue = n;
    }
    await env2.DB.prepare(
      "UPDATE hardware_sets SET unit_price_override = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(overrideValue, setId).run();
    console.log(`[Set Price] Set ${set.set_number} (${setId}): unit_price_override = ${priceOverride}`);
    return jsonResponse3({
      success: true,
      set_id: setId,
      set_number: set.set_number,
      unit_price_override: priceOverride
    });
  } catch (error5) {
    console.error("[Set Price] Error:", error5);
    return jsonResponse3({ error: "Failed to update set price", details: error5.message }, 500);
  }
});
router.post("/api/takeoff/session/:sessionId/materialize-from-schedule", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const sessionId = request2.params.sessionId;
    const body = await request2.json().catch(() => ({}));
    const categories = body.categories || ["door", "frame"];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const dseResult = await env2.DB.prepare(`
      SELECT mark, hardware_group, width, height, door_type, door_material,
             frame_type, frame_material, fire_rating, panic, thickness
      FROM door_schedule_entries WHERE session_id = ?
    `).bind(sessionId).all();
    const entries = dseResult.results || [];
    if (entries.length === 0) {
      return jsonResponse3({ success: true, message: "No door schedule entries found", doors_created: 0, frames_created: 0 });
    }
    let doorsCreated = 0;
    let framesCreated = 0;
    if (categories.includes("door")) {
      await env2.DB.prepare(
        "DELETE FROM takeoff_line_items WHERE session_id = ? AND category = 'door' AND notes LIKE '%[auto:dse]%'"
      ).bind(sessionId).run();
      const doorGroups = {};
      for (const e of entries) {
        const size = e.width && e.height ? `${e.width} x ${e.height}` : "Standard";
        const key = `${size}|${e.door_type || ""}|${e.door_material || ""}|${e.fire_rating || ""}`;
        if (!doorGroups[key]) {
          doorGroups[key] = {
            size,
            door_type: e.door_type || null,
            door_material: e.door_material || null,
            fire_rating: e.fire_rating || null,
            marks: [],
            count: 0
          };
        }
        doorGroups[key].marks.push(e.mark);
        doorGroups[key].count++;
      }
      let sortOrder = 1;
      for (const [key, group3] of Object.entries(doorGroups)) {
        const parts = [group3.door_type, group3.door_material].filter(Boolean);
        const description = parts.length > 0 ? parts.join(" ") : "Door";
        const rating = group3.fire_rating || null;
        await env2.DB.prepare(`
          INSERT INTO takeoff_line_items
          (id, session_id, category, sort_order, description, size, material, rating,
           quantity, uom, unit_price, notes, taxable, created_at, updated_at)
          VALUES (?, ?, 'door', ?, ?, ?, ?, ?, ?, 'EA', NULL, ?, 1, ?, ?)
        `).bind(
          crypto.randomUUID(),
          sessionId,
          sortOrder++,
          description,
          group3.size,
          group3.door_material,
          rating,
          group3.count,
          `[auto:dse] Marks: ${group3.marks.join(", ")}`,
          now,
          now
        ).run();
        doorsCreated++;
      }
    }
    if (categories.includes("frame")) {
      await env2.DB.prepare(
        "DELETE FROM takeoff_line_items WHERE session_id = ? AND category = 'frame' AND notes LIKE '%[auto:dse]%'"
      ).bind(sessionId).run();
      const frameGroups = {};
      for (const e of entries) {
        const fType = e.frame_type || null;
        const fMat = e.frame_material || null;
        if (!fType && !fMat)
          continue;
        const size = e.width && e.height ? `${e.width} x ${e.height}` : "Standard";
        const key = `${size}|${fType || ""}|${fMat || ""}|${e.fire_rating || ""}`;
        if (!frameGroups[key]) {
          frameGroups[key] = {
            size,
            frame_type: fType,
            frame_material: fMat,
            fire_rating: e.fire_rating || null,
            marks: [],
            count: 0
          };
        }
        frameGroups[key].marks.push(e.mark);
        frameGroups[key].count++;
      }
      let sortOrder = 1;
      for (const [key, group3] of Object.entries(frameGroups)) {
        const parts = [group3.frame_type, group3.frame_material].filter(Boolean);
        const description = parts.length > 0 ? parts.join(" ") : "Frame";
        await env2.DB.prepare(`
          INSERT INTO takeoff_line_items
          (id, session_id, category, sort_order, description, size, material, rating,
           quantity, uom, unit_price, notes, taxable, created_at, updated_at)
          VALUES (?, ?, 'frame', ?, ?, ?, ?, ?, ?, 'EA', NULL, ?, 1, ?, ?)
        `).bind(
          crypto.randomUUID(),
          sessionId,
          sortOrder++,
          description,
          group3.size,
          group3.frame_material,
          group3.fire_rating,
          group3.count,
          `[auto:dse] Marks: ${group3.marks.join(", ")}`,
          now,
          now
        ).run();
        framesCreated++;
      }
    }
    console.log(`[Materialize DSE] Session ${sessionId}: ${doorsCreated} door groups, ${framesCreated} frame groups from ${entries.length} marks`);
    return jsonResponse3({
      success: true,
      session_id: sessionId,
      total_marks: entries.length,
      doors_created: doorsCreated,
      frames_created: framesCreated
    });
  } catch (error5) {
    console.error("[Materialize DSE] Error:", error5.message, error5.stack);
    return jsonResponse3({ error: "Failed to materialize from schedule", message: error5.message, details: error5.stack }, 500);
  }
});
router.post("/api/takeoff/project/:projectId/materialize-from-schedule", async (request2, env2) => {
  const { error: error4, user } = await authenticate(request2, env2);
  if (error4)
    return error4;
  {
    const _prodErr = await requireProductAccess(user, env2, "takeoffx");
    if (_prodErr) return _prodErr;
  }
  try {
    const projectId = request2.params.projectId;
    const body = await request2.json().catch(() => ({}));
    const categories = body.categories || ["door", "frame"];
    const project = await env2.DB.prepare(
      "SELECT id, name FROM projects WHERE id = ? AND tenant_id = ?"
    ).bind(projectId, user.tenantId).first();
    if (!project) {
      return jsonResponse3({ error: "Project not found" }, 404);
    }
    const sessionsResult = await env2.DB.prepare(`
      SELECT hes.id, hes.filename,
             (SELECT COUNT(*) FROM door_schedule_entries WHERE session_id = hes.id) as dse_count
      FROM hardware_extraction_sessions hes
      WHERE hes.project_id = ?
    `).bind(projectId).all();
    const sessionsWithDse = (sessionsResult.results || []).filter((s) => s.dse_count > 0);
    if (sessionsWithDse.length === 0) {
      return jsonResponse3({ success: true, message: "No sessions with door schedule data", results: [] });
    }
    const results = [];
    let totalDoors = 0;
    let totalFrames = 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const session of sessionsWithDse) {
      const dseResult = await env2.DB.prepare(`
        SELECT mark, hardware_group, width, height, door_type, door_material,
               frame_type, frame_material, fire_rating, panic, thickness
        FROM door_schedule_entries WHERE session_id = ?
      `).bind(session.id).all();
      const entries = dseResult.results || [];
      let doorsCreated = 0;
      let framesCreated = 0;
      if (categories.includes("door")) {
        await env2.DB.prepare(
          "DELETE FROM takeoff_line_items WHERE session_id = ? AND category = 'door' AND notes LIKE '%[auto:dse]%'"
        ).bind(session.id).run();
        const doorGroups = {};
        for (const e of entries) {
          const size = e.width && e.height ? `${e.width} x ${e.height}` : "Standard";
          const key = `${size}|${e.door_type || ""}|${e.door_material || ""}|${e.fire_rating || ""}`;
          if (!doorGroups[key]) {
            doorGroups[key] = {
              size,
              door_type: e.door_type || null,
              door_material: e.door_material || null,
              fire_rating: e.fire_rating || null,
              marks: [],
              count: 0
            };
          }
          doorGroups[key].marks.push(e.mark);
          doorGroups[key].count++;
        }
        let sortOrder = 1;
        for (const [, group3] of Object.entries(doorGroups)) {
          const parts = [group3.door_type, group3.door_material].filter(Boolean);
          const description = parts.length > 0 ? parts.join(" ") : "Door";
          const rating = group3.fire_rating || null;
          await env2.DB.prepare(`
            INSERT INTO takeoff_line_items
            (id, session_id, category, sort_order, description, size, material, rating,
             quantity, uom, unit_price, notes, taxable, created_at, updated_at)
            VALUES (?, ?, 'door', ?, ?, ?, ?, ?, ?, 'EA', NULL, ?, 1, ?, ?)
          `).bind(
            crypto.randomUUID(),
            session.id,
            sortOrder++,
            description,
            group3.size,
            group3.door_material || null,
            rating,
            group3.count,
            `[auto:dse] Marks: ${group3.marks.join(", ")}`,
            now,
            now
          ).run();
          doorsCreated++;
        }
      }
      if (categories.includes("frame")) {
        await env2.DB.prepare(
          "DELETE FROM takeoff_line_items WHERE session_id = ? AND category = 'frame' AND notes LIKE '%[auto:dse]%'"
        ).bind(session.id).run();
        const frameGroups = {};
        for (const e of entries) {
          const fType = e.frame_type || null;
          const fMat = e.frame_material || null;
          if (!fType && !fMat)
            continue;
          const size = e.width && e.height ? `${e.width} x ${e.height}` : "Standard";
          const key = `${size}|${fType || ""}|${fMat || ""}|${e.fire_rating || ""}`;
          if (!frameGroups[key]) {
            frameGroups[key] = {
              size,
              frame_type: fType,
              frame_material: fMat,
              fire_rating: e.fire_rating || null,
              marks: [],
              count: 0
            };
          }
          frameGroups[key].marks.push(e.mark);
          frameGroups[key].count++;
        }
        let sortOrder = 1;
        for (const [, group3] of Object.entries(frameGroups)) {
          const parts = [group3.frame_type, group3.frame_material].filter(Boolean);
          const description = parts.length > 0 ? parts.join(" ") : "Frame";
          await env2.DB.prepare(`
            INSERT INTO takeoff_line_items
            (id, session_id, category, sort_order, description, size, material, rating,
             quantity, uom, unit_price, notes, taxable, created_at, updated_at)
            VALUES (?, ?, 'frame', ?, ?, ?, ?, ?, ?, 'EA', NULL, ?, 1, ?, ?)
          `).bind(
            crypto.randomUUID(),
            session.id,
            sortOrder++,
            description,
            group3.size,
            group3.frame_material || null,
            group3.fire_rating || null,
            group3.count,
            `[auto:dse] Marks: ${group3.marks.join(", ")}`,
            now,
            now
          ).run();
          framesCreated++;
        }
      }
      results.push({ session_id: session.id, filename: session.filename, doors_created: doorsCreated, frames_created: framesCreated, total_marks: entries.length });
      totalDoors += doorsCreated;
      totalFrames += framesCreated;
    }
    console.log(`[Materialize DSE Project] ${project.name}: ${totalDoors} door groups, ${totalFrames} frame groups across ${sessionsWithDse.length} sessions`);
    return jsonResponse3({
      success: true,
      project_id: projectId,
      project_name: project.name,
      total_doors_created: totalDoors,
      total_frames_created: totalFrames,
      sessions_processed: sessionsWithDse.length,
      results
    });
  } catch (error5) {
    console.error("[Materialize DSE Project] Error:", error5.message, error5.stack);
    return jsonResponse3({ error: "Failed to materialize from schedule", message: error5.message, details: error5.stack }, 500);
  }
});
}
