// src/lib/hardware-extraction-materialize.js
//
// Ported verbatim (byte-for-byte function bodies, no logic changes) from
// weylandai.com's src/legacy-monolith.js lines 23525-23966 - esbuild's own
// init_data_transformer() wrapper names this exact span "data-transformer.js",
// confirming it was a real standalone source file before bundling and that
// its boundary here is not a guess. Pure D1 CRUD (materializes an affirmed
// hardware_groups extraction result into real hardware_sets/
// hardware_components/hardware_specifications rows, and the reverse
// unaffirm path) - no dependency on the monolith's vendored pdfjs-dist/
// OffscreenCanvas rendering engine, so unlike getOrRenderPage this was
// safe to port as-is. Used by hardware-schedule-page-affirm.js
// (materializeAffirmedGroup/unaffirmMaterializedGroup) and by
// hardware-extraction-single-page.js's savePageExtraction (provisional
// materialize on every page save).

export async function createHardwareSpecifications(setId, hwSet, env2) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let specificationsCreated = 0;
  if (hwSet.keying?.system) {
    try {
      await env2.DB.prepare(`
        INSERT INTO hardware_specifications (
          id, set_id, component_id, specification_type, specification_text,
          approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId("spec"),
        setId,
        null,
        "function",
        `Keying system: ${hwSet.keying.system}`,
        now,
        now
      ).run();
      specificationsCreated++;
    } catch (error4) {
      console.warn("[Transformer] Failed to create keying spec:", error4.message);
    }
  }
  if (hwSet.keying?.master_key_system) {
    try {
      await env2.DB.prepare(`
        INSERT INTO hardware_specifications (
          id, set_id, component_id, specification_type, specification_text,
          approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId("spec"),
        setId,
        null,
        "function",
        `Master key system: ${hwSet.keying.master_key_system}`,
        now,
        now
      ).run();
      specificationsCreated++;
    } catch (error4) {
      console.warn("[Transformer] Failed to create master key spec:", error4.message);
    }
  }
  const certifications = hwSet.certifications || {};
  if (certifications.fire_rating) {
    try {
      await env2.DB.prepare(`
        INSERT INTO hardware_specifications (
          id, set_id, component_id, specification_type, specification_text,
          approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId("spec"),
        setId,
        null,
        "requirement",
        `Fire rating: ${certifications.fire_rating}`,
        now,
        now
      ).run();
      specificationsCreated++;
    } catch (error4) {
      console.warn("[Transformer] Failed to create fire rating spec:", error4.message);
    }
  }
  if (certifications.ada_compliant) {
    try {
      await env2.DB.prepare(`
        INSERT INTO hardware_specifications (
          id, set_id, component_id, specification_type, specification_text,
          approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId("spec"),
        setId,
        null,
        "requirement",
        "ADA compliant per CBC 11B-404.2.7",
        now,
        now
      ).run();
      specificationsCreated++;
    } catch (error4) {
      console.warn("[Transformer] Failed to create ADA spec:", error4.message);
    }
  }
  if (certifications.standards_met && Array.isArray(certifications.standards_met)) {
    for (const standard of certifications.standards_met) {
      try {
        await env2.DB.prepare(`
          INSERT INTO hardware_specifications (
            id, set_id, component_id, specification_type, specification_text,
            approved_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          generateId("spec"),
          setId,
          null,
          "requirement",
          `Complies with ${standard}`,
          now,
          now
        ).run();
        specificationsCreated++;
      } catch (error4) {
        console.warn(`[Transformer] Failed to create standard spec for ${standard}:`, error4.message);
      }
    }
  }
  if (hwSet.notes) {
    try {
      await env2.DB.prepare(`
        INSERT INTO hardware_specifications (
          id, set_id, component_id, specification_type, specification_text,
          approved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId("spec"),
        setId,
        null,
        "note",
        hwSet.notes,
        now,
        now
      ).run();
      specificationsCreated++;
    } catch (error4) {
      console.warn("[Transformer] Failed to create notes spec:", error4.message);
    }
  }
  return specificationsCreated;
}
export function mapComponentType(rawType) {
  if (!rawType)
    return "other";
  const normalized = rawType.toLowerCase().trim();
  // 2026-10-08: the specific items of a school's hardware groups first; an
  // item nothing here names is "other", not "lock" (the 7 October audit saw
  // power transfers, sweeps, switches and operators all called locks).
  if (/\bsilencer/.test(normalized)) return "silencer";
  if (/\b(mop plate|mop pl)/.test(normalized)) return "mop_plate";
  if (/\barmor plate/.test(normalized)) return "armor_plate";
  if (/\b(kick plate|kickplate)/.test(normalized)) return "kick_plate";
  if (/\b(edge guard|edge plate)/.test(normalized)) return "edge_guard";
  if (/\b(power transfer|ept\b|electric power transfer|electrified hinge)/.test(normalized)) return "power_transfer";
  if (/\b(door position|position switch|dps\b)/.test(normalized)) return "door_position_switch";
  if (/\b(push switch|push button|key switch|actuator|switch)\b/.test(normalized)) return "switch";
  if (/\b(credential reader|card reader|prox reader|reader)\b/.test(normalized)) return "card_reader";
  if (/\b(power supply|power supplies)/.test(normalized)) return "power_supply";
  if (/\b(relay|module)\b/.test(normalized)) return "relay";
  if (/\b(intercom|video|camera)/.test(normalized)) return "intercom";
  if (/\b(bollard|ballard post|post)\b/.test(normalized)) return "bollard";
  if (/\b(operator|automatic door|auto door|low energy)/.test(normalized)) return "power_operator";
  if (/\b(sweep|rain drip|drip cap|weatherstrip|weather strip|gasket|gasketing|smoke seal|meeting stile|astragal seal|perimeter seal)/.test(normalized)) return "seal";
  if (/\bthreshold/.test(normalized)) return "threshold";
  if (/\bastragal/.test(normalized)) return "astragal";
  if (/\b(mullion)\b/.test(normalized) && !/cylinder/.test(normalized)) return "mullion";
  if (/\b(dust proof strike|dustproof strike)/.test(normalized)) return "dust_proof_strike";
  if (/\belectric strike/.test(normalized)) return "electric_strike";
  if (/\bstrike\b/.test(normalized)) return "strike";
  if (/\b(flush bolt|latching bolt|const latching|constant latching|surface bolt|auto bolt|automatic bolt)/.test(normalized)) return "flush_bolt";
  if (/\b(cylinder|keyway|core)\b/.test(normalized)) return /\bcore\b/.test(normalized) && !/cylinder/.test(normalized) ? "core" : "cylinder";
  if (/\b(oh stop|overhead stop|overhead holder|oh holder)/.test(normalized)) return "overhead_stop";
  if (/\bwall stop/.test(normalized)) return "wall_stop";
  if (/\bfloor stop/.test(normalized)) return "floor_stop";
  if (/\b(coordinator)/.test(normalized)) return "coordinator";
  if (/\b(push\/pull|push pull|pull plate|door pull|pull bar|offset pull|pull)\b/.test(normalized) && !/push plate/.test(normalized)) return "pull_handle";
  if (/\b(push plate|push bar)/.test(normalized)) return "push_plate";
  if (/\b(protection plate)/.test(normalized)) return "kick_plate";
  if (/\b(hinge|butt)\b/.test(normalized) || /continuous hinge/.test(normalized)) return "hinge";
  if (normalized.includes("pivot"))
    return "pivot";
  if (normalized.includes("lock") || normalized.includes("mortise") || normalized.includes("cylindrical"))
    return "lock";
  if (normalized.includes("latch"))
    return "latch";
  if (normalized.includes("exit") || normalized.includes("panic"))
    return "exit_device";
  if (normalized.includes("closer"))
    return "closer";
  if (normalized.includes("coordinator"))
    return "coordinator";
  if (normalized.includes("push plate") || normalized.includes("push bar"))
    return "push_plate";
  if (normalized.includes("pull"))
    return "pull_handle";
  if (normalized.includes("kick plate"))
    return "kick_plate";
  if (normalized.includes("stop"))
    return "stop";
  if (normalized.includes("holder"))
    return "holder";
  if (normalized.includes("overhead stop"))
    return "overhead_stop";
  if (normalized.includes("wall stop"))
    return "wall_stop";
  if (normalized.includes("seal") || normalized.includes("gasket"))
    return "seal";
  if (normalized.includes("electric strike"))
    return "electric_strike";
  if (normalized.includes("mag lock") || normalized.includes("magnetic lock"))
    return "mag_lock";
  if (normalized.includes("power operator") || normalized.includes("automatic operator"))
    return "power_operator";
  if (normalized.includes("threshold"))
    return "threshold";
  if (normalized.includes("astragal"))
    return "astragal";
  if (normalized.includes("flush bolt"))
    return "flush_bolt";
  if (/\b(lock|latch|deadbolt|exit|panic|closer|hinge|stop|holder|seal|strike|bolt|cylinder|core|plate|pull|handle|lever|knob|operator|transfer|switch|reader|supply)\b/.test(normalized) === false)
    return "other";
  if (normalized.includes("cylinder"))
    return "cylinder";
  if (normalized.includes("core") || normalized.includes("i/c"))
    return "core";
  if (normalized.includes("key"))
    return "key";
  if (normalized.includes("classroom") || normalized.includes("entry") || normalized.includes("passage") || normalized.includes("privacy") || normalized.includes("storeroom") || normalized.includes("detention")) {
    return "lock";
  }
  console.warn(`[Transformer] Unknown component type: "${rawType}", defaulting to 'lock'`);
  return "lock";
}
export function getDhiCategory(componentType) {
  const categoryMap = {
    "hinge": "Hinges and Pivots",
    "pivot": "Hinges and Pivots",
    "lock": "Locks and Latches",
    "latch": "Locks and Latches",
    "exit_device": "Exit Devices",
    "closer": "Closers and Coordinators",
    "coordinator": "Closers and Coordinators",
    "push_plate": "Architectural Trim",
    "pull_handle": "Architectural Trim",
    "kick_plate": "Architectural Trim",
    "stop": "Stops and Holders",
    "holder": "Stops and Holders",
    "overhead_stop": "Stops and Holders",
    "wall_stop": "Stops and Holders",
    "seal": "Seals and Gasketing",
    "gasket": "Seals and Gasketing",
    "electric_strike": "Electronic Hardware",
    "mag_lock": "Electronic Hardware",
    "power_operator": "Electronic Hardware",
    "threshold": "Thresholds and Saddles",
    "astragal": "Auxiliary Hardware",
    "flush_bolt": "Auxiliary Hardware",
    "cylinder": "Auxiliary Hardware",
    "core": "Auxiliary Hardware",
    "key": "Auxiliary Hardware"
  };
  return categoryMap[componentType] || null;
}
export function normalizeFinishCode(finishCode) {
  if (!finishCode)
    return null;
  const normalized = finishCode.toUpperCase().trim();
  const legacyMap = {
    "US10B": "613",
    "US10": "612",
    "US26D": "626",
    "US26": "625",
    "US32D": "630",
    "US32": "629",
    "US3": "605",
    "US4": "606",
    "US5": "609",
    "US9": "611",
    "US14": "605",
    "US15": "613",
    "US19": "619",
    "US20": "613"
  };
  if (legacyMap[normalized]) {
    return legacyMap[normalized];
  }
  if (/^\d{3}[a-z]?$/i.test(normalized)) {
    return normalized;
  }
  return finishCode;
}
export function parseFireRating(fireRating) {
  if (!fireRating)
    return null;
  const normalized = fireRating.toLowerCase().trim();
  if (normalized === "n/a" || normalized === "none" || normalized === "not rated") {
    return null;
  }
  const minutesMatch = normalized.match(/(\d+)\s*(min|mins|minute|minutes)/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10);
  }
  const hoursMatch = normalized.match(/(\d+)\s*(hr|hrs|hour|hours)/);
  if (hoursMatch) {
    return parseInt(hoursMatch[1], 10) * 60;
  }
  const plainNumber = parseInt(normalized, 10);
  if (!isNaN(plainNumber)) {
    return plainNumber;
  }
  console.warn(`[Transformer] Could not parse fire rating: "${fireRating}"`);
  return null;
}
export function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
}
export async function materializeAffirmedGroup(sessionId, extractionId, pageNumber, groupData, userId, env2, opts = {}) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const groupNumber = groupData.group_number || groupData.groupNumber || "UNKNOWN";
  const provisional = opts.provisional === true;
  const aff = provisional ? 0 : 1;
  const affAt = provisional ? null : now;
  const affBy = provisional ? null : userId;
  const safeUserId = userId || "system:extraction";
  console.log(`[Materializer] Materializing ${provisional ? "PROVISIONAL" : "affirmed"} group ${groupNumber} for session ${sessionId}`);
  const existing = await env2.DB.prepare(`
    SELECT id, affirmed FROM hardware_sets WHERE session_id = ? AND set_number = ?
  `).bind(sessionId, groupNumber).first();
  if (provisional && existing && existing.affirmed === 1) {
    return { setId: existing.id, componentsCreated: 0, isUpdate: true, skipped: "already_affirmed" };
  }
  let setId;
  let preservedPrices = /* @__PURE__ */ new Map();
  if (existing) {
    setId = existing.id;
    await env2.DB.prepare(`
      UPDATE hardware_sets
      SET affirmed = ?, affirmed_at = ?, affirmed_by = ?,
          source_page_extraction_id = ?, updated_at = ?
      WHERE id = ?
    `).bind(aff, affAt, affBy, extractionId, now, setId).run();
    try {
      const priced = await env2.DB.prepare(
        `SELECT component_type, model, finish, unit_price, price_source, product_variant_id, product_match_confidence
         FROM hardware_components WHERE set_id = ? AND price_source IN ('manual','user_selected') AND unit_price IS NOT NULL`
      ).bind(setId).all();
      for (const p of priced.results || []) {
        preservedPrices.set(`${p.component_type}|${p.model || ""}|${p.finish || ""}`, p);
      }
    } catch (e) {
    }
    await env2.DB.prepare(`DELETE FROM hardware_specifications WHERE set_id = ?`).bind(setId).run();
    await env2.DB.prepare(`DELETE FROM hardware_components WHERE set_id = ?`).bind(setId).run();
    console.log(`[Materializer] Updated existing set ${setId}, cleared components for refresh`);
  } else {
    setId = generateId("set");
    const doorCount = groupData.door_numbers?.length || groupData.door_specifications?.length || null;
    await env2.DB.prepare(`
      INSERT INTO hardware_sets (
        id, session_id, user_id, submittal_id,
        set_number, set_name, door_location, door_count,
        approved_from_page, approved_at, approved_by,
        source_page_extraction_id,
        affirmed, affirmed_at, affirmed_by,
        notes, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      setId,
      sessionId,
      safeUserId,
      null,
      groupNumber,
      groupData.group_name || groupData.opening_type || null,
      groupData.door_location || null,
      doorCount,
      pageNumber,
      now,
      safeUserId,
      extractionId,
      aff,
      affAt,
      affBy,
      groupData.notes || null,
      now,
      now
    ).run();
    console.log(`[Materializer] Created new set ${setId} with affirmed=${aff}`);
  }
  let componentsCreated = 0;
  const components = groupData.components || [];
  for (const [index, component] of components.entries()) {
    try {
      const componentId = generateId("comp");
      const componentType = mapComponentType(component.component_type || component.type || component.description);
      const finishCode = normalizeFinishCode(component.finish || component.finish_code || groupData.finish_code);
      const certifications = groupData.certifications || {};
      const specifications = {
        description: component.description,
        catalog_number: component.catalog_number,
        notes: component.notes,
        handing: component.handing,
        backset: component.backset,
        voltage: component.voltage,
        function_description: component.function_description,
        trim_style: component.trim_style,
        ...component.specifications
      };
      await env2.DB.prepare(`
        INSERT INTO hardware_components (
          id, set_id, component_type, dhi_category, sequence_order,
          manufacturer, model, catalog_number, finish,
          quantity, function_code, specifications,
          ansi_bhma_grade, fire_rating_minutes, ul_listing_number, ada_compliant,
          affirmed, affirmed_at, affirmed_by,
          approved_at, approved_by, created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).bind(
        componentId,
        setId,
        componentType,
        getDhiCategory(componentType),
        component.sequence || component.sort_order || index + 1,
        component.manufacturer || component.manufacturer_code || null,
        component.model || component.model_number || component.catalog_number || null,
        component.catalog_number || component.model_number || component.model || null,
        finishCode,
        component.quantity || 1,
        component.function_code || null,
        JSON.stringify(specifications),
        certifications.ansi_grade || null,
        parseFireRating(certifications.fire_rating),
        certifications.ul_listing || null,
        certifications.ada_compliant || false,
        aff,
        affAt,
        affBy,
        now,
        safeUserId,
        now,
        now
      ).run();
      componentsCreated++;
    } catch (error4) {
      console.error(`[Materializer] Failed to create component ${index + 1}:`, error4.message);
    }
  }
  if (preservedPrices.size > 0) {
    for (const [key, p] of preservedPrices) {
      try {
        await env2.DB.prepare(
          `UPDATE hardware_components
           SET unit_price = ?, price_source = ?, product_variant_id = ?, product_match_confidence = ?, updated_at = ?
           WHERE set_id = ? AND (component_type || '|' || COALESCE(model,'') || '|' || COALESCE(finish,'')) = ?`
        ).bind(p.unit_price, p.price_source, p.product_variant_id, p.product_match_confidence, now, setId, key).run();
      } catch (e) {
      }
    }
  }
  const normalizedForSpecs = {
    ...groupData,
    keying: groupData.keying || {
      system: groupData.keying_system || null,
      master_key_system: groupData.master_key_system || null
    },
    certifications: groupData.certifications || {
      fire_rating: groupData.fire_rating || null,
      ada_compliant: groupData.ada_compliant || null,
      standards_met: groupData.standards_met || null
    }
  };
  const specificationsCreated = await createHardwareSpecifications(setId, normalizedForSpecs, env2);
  console.log(
    `[Materializer] Group ${groupNumber}: ${componentsCreated} components, ${specificationsCreated} specifications materialized with affirmed=${aff} (${existing ? "update" : "new"})`
  );
  return {
    setId,
    componentsCreated,
    specificationsCreated,
    isUpdate: !!existing
  };
}

export async function unaffirmMaterializedGroup(sessionId, groupNumber, env2) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const set = await env2.DB.prepare(`
    SELECT id FROM hardware_sets WHERE session_id = ? AND set_number = ?
  `).bind(sessionId, groupNumber).first();
  if (!set)
    return { found: false };
  await env2.DB.prepare(`
    UPDATE hardware_sets
    SET affirmed = 0, affirmed_at = NULL, affirmed_by = NULL, updated_at = ?
    WHERE id = ?
  `).bind(now, set.id).run();
  await env2.DB.prepare(`
    UPDATE hardware_components
    SET affirmed = 0, affirmed_at = NULL, affirmed_by = NULL, updated_at = ?
    WHERE set_id = ?
  `).bind(now, set.id).run();
  console.log(`[Materializer] Unaffirmed set ${set.id} (group ${groupNumber}) and its components`);
  return { found: true, setId: set.id };
}
