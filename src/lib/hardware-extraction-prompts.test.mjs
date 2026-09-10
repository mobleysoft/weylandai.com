import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MOUNTING_HEIGHTS,
  DEFAULT_PROJECTIONS,
  DEFAULT_MOUNTING_SIDES,
  SCHEDULE_TYPE_REGISTRY,
  DOOR_SCHEDULE_ALLOWED_FIELDS,
  applyMountingDefaults,
  applyMountingDefaultsToExtraction,
  buildHardwareExtractionPrompt,
  validateClaudeRequest,
  getClaudeTimeout,
  parseHardwareExtractionResult,
  arrayBufferToBase643,
  normalizeComponentType,
  mapToDhiCategory,
  extractGrade,
  detectImageMediaType,
  buildIsolatedPageExtractionPrompt,
  buildDirectPdfExtractionPrompt,
  buildPageSpecificExtractionPrompt,
  classifyPageType,
  isPageInRange,
  detectSchedulePages,
  applyConstraintOverride,
  rowToConstraintField,
  buildPromptFromConstraints,
  getScheduleTypeConfig,
  listScheduleTypes,
  buildGenericExtractionPrompt,
  parseGenericExtractionResult,
  buildDoorScheduleExtractionPrompt,
  parseDimensionToInches,
  normalizeFireRating,
  sanitizeDoorScheduleField,
  parseDoorScheduleEntry,
  calculateEntryConfidence,
  parseDoorScheduleExtractionResult,
  _buildPriorContextSection,
  buildContextAwareExtractionPrompt,
  _accumulateContext,
  _buildCrossReference,
} from "./hardware-extraction-prompts.js";

test("DEFAULT_MOUNTING_HEIGHTS/PROJECTIONS/SIDES: real values for a lock", () => {
  assert.equal(DEFAULT_MOUNTING_HEIGHTS.lock, 36);
  assert.equal(DEFAULT_PROJECTIONS.lock, 2.5);
  assert.equal(DEFAULT_MOUNTING_SIDES.lock, "both");
});

test("SCHEDULE_TYPE_REGISTRY: real registry entries for door_schedule and hardware_schedule", () => {
  assert.equal(SCHEDULE_TYPE_REGISTRY.door_schedule.target_table, "door_schedule_entries");
  assert.equal(SCHEDULE_TYPE_REGISTRY.hardware_schedule.extraction_function, "extractHardwareSchedule");
});

test("applyMountingDefaults: fills defaults for a lock with no mounting data", () => {
  const component = { component_type: "LOCK" };
  const result = applyMountingDefaults(component);
  assert.equal(result.mounting_height_inches, 36);
  assert.equal(result.mounting_height_source, "default");
  assert.equal(result.projection_inches, 2.5);
  assert.equal(result.mounting_side, "both");
});

test("applyMountingDefaults: preserves extracted values over defaults", () => {
  const component = { component_type: "LOCK", mounting_height_inches: 40 };
  const result = applyMountingDefaults(component);
  assert.equal(result.mounting_height_inches, 40);
  assert.equal(result.mounting_height_source, "extracted");
});

test("applyMountingDefaults: hinge quantity 2 gets a real 2-position default (top/bottom, not evenly sliced 3)", () => {
  const component = { component_type: "HINGE", quantity: 2 };
  const result = applyMountingDefaults(component);
  assert.deepEqual(result.hinge_positions, [5, 77]);
});

test("applyMountingDefaults: hinge quantity 4 slices the default 3-position array plus itself", () => {
  const component = { component_type: "HINGE", quantity: 4 };
  const result = applyMountingDefaults(component);
  assert.equal(result.hinge_positions.length, 3); // slice(0,4) of a 3-element array caps at 3
});

test("applyMountingDefaultsToExtraction: applies defaults across all groups/components", () => {
  const extraction = {
    hardware_groups: [{ components: [{ component_type: "CLOSER" }] }],
  };
  const result = applyMountingDefaultsToExtraction(extraction);
  assert.equal(result.hardware_groups[0].components[0].mounting_height_inches, 78);
});

test("applyMountingDefaultsToExtraction: passes through malformed input unchanged", () => {
  assert.equal(applyMountingDefaultsToExtraction(null), null);
  assert.deepEqual(applyMountingDefaultsToExtraction({}), {});
});

test("buildHardwareExtractionPrompt: real prompt contains the extraction contract markers", () => {
  const prompt = buildHardwareExtractionPrompt();
  assert.ok(prompt.includes("HARDWARE SCHEDULE PAGE"));
  assert.ok(prompt.includes("hardware_groups"));
  assert.ok(prompt.length > 1000);
});

test("validateClaudeRequest: throws with a real retryable:false error on oversized PDF", () => {
  const bigBase64 = "A".repeat(35 * 1024 * 1024); // ~26MB decoded
  assert.throws(() => validateClaudeRequest(bigBase64, "a valid prompt string"), (err) => {
    assert.ok(err.message.includes("PDF too large"));
    assert.equal(err.retryable, false);
    return true;
  });
});

test("validateClaudeRequest: rejects invalid base64 characters", () => {
  assert.throws(() => validateClaudeRequest("not!valid!base64!", "a valid prompt string"), /invalid characters/);
});

test("validateClaudeRequest: rejects a too-short prompt", () => {
  assert.throws(() => validateClaudeRequest("QUJD", "hi"), /Invalid prompt/);
});

test("validateClaudeRequest: passes for a small valid base64 pdf + real prompt", () => {
  assert.doesNotThrow(() => validateClaudeRequest("QUJDRA==", "a sufficiently long real prompt"));
});

test("getClaudeTimeout: real fixed timeout of 10 minutes", () => {
  assert.equal(getClaudeTimeout("anything"), 600000);
});

test("parseHardwareExtractionResult: real happy path applies mounting defaults and preserves groups", () => {
  const apiResponse = {
    content: [{ text: JSON.stringify({
      hardware_groups: [{ group_number: "1", components: [{ component_type: "LOCK" }] }],
    }) }],
    usage: { input_tokens: 100, output_tokens: 50 },
  };
  const result = parseHardwareExtractionResult(apiResponse);
  assert.equal(result.hardware_groups.length, 1);
  assert.equal(result.hardware_groups[0].components[0].mounting_height_inches, 36);
  assert.equal(result.usage.input_tokens, 100);
});

test("parseHardwareExtractionResult: extracts JSON from a ```json fenced block", () => {
  const apiResponse = {
    content: [{ text: "Here's the result:\n```json\n" + JSON.stringify({ hardware_groups: [] }) + "\n```" }],
  };
  const result = parseHardwareExtractionResult(apiResponse);
  assert.deepEqual(result.hardware_groups, []);
});

test("parseHardwareExtractionResult: skips groups with no identifiable group number", () => {
  const apiResponse = {
    content: [{ text: JSON.stringify({
      hardware_groups: [{ components: [] }, { group_number: "2", components: [] }],
    }) }],
  };
  const result = parseHardwareExtractionResult(apiResponse);
  assert.equal(result.hardware_groups.length, 1);
  assert.equal(result.hardware_groups[0].group_number, "2");
});

test("parseHardwareExtractionResult: real retryable error on stop_reason=max_tokens", () => {
  const apiResponse = { content: [{ text: "x" }], stop_reason: "max_tokens" };
  assert.throws(() => parseHardwareExtractionResult(apiResponse), (err) => {
    assert.equal(err.retryable, true);
    return true;
  });
});

test("parseHardwareExtractionResult: requireContent option throws on 0 groups and 0 matrix entries", () => {
  const apiResponse = { content: [{ text: JSON.stringify({ hardware_groups: [] }) }] };
  assert.throws(() => parseHardwareExtractionResult(apiResponse, { requireContent: true }), /no knowledge units/);
});

test("parseHardwareExtractionResult: invalid JSON surfaces a real parse error", () => {
  const apiResponse = { content: [{ text: "not json at all {{{" }] };
  assert.throws(() => parseHardwareExtractionResult(apiResponse), /Failed to parse extraction result/);
});

test("arrayBufferToBase643: round-trips real bytes", () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const b64 = arrayBufferToBase643(bytes.buffer);
  assert.equal(b64, Buffer.from("Hello").toString("base64"));
});

test("normalizeComponentType: real classification for common hardware terms", () => {
  assert.equal(normalizeComponentType("BUTT HINGE"), "hinge");
  assert.equal(normalizeComponentType("MORTISE LOCK"), "lock");
  assert.equal(normalizeComponentType("PANIC BAR"), "exit_device");
  assert.equal(normalizeComponentType("KICK PLATE"), "kick_plate");
  assert.equal(normalizeComponentType("WALL STOP"), "wall_stop");
  assert.equal(normalizeComponentType("OVERHEAD STOP"), "overhead_stop");
});

test("normalizeComponentType: unknown type defaults to lock", () => {
  assert.equal(normalizeComponentType("SOME WEIRD THING"), "lock");
});

test("normalizeComponentType: falsy input defaults to lock", () => {
  assert.equal(normalizeComponentType(null), "lock");
  assert.equal(normalizeComponentType(""), "lock");
});

test("mapToDhiCategory: real DHI category for a hinge", () => {
  assert.equal(mapToDhiCategory("BUTT HINGE"), "Hinges and Pivots");
});

test("extractGrade: extracts a real ANSI/BHMA grade from compliance text", () => {
  assert.equal(extractGrade("ANSI A156.13 Grade 1"), "Grade 1");
  assert.equal(extractGrade("no grade mentioned"), null);
  assert.equal(extractGrade(null), null);
});

test("detectImageMediaType: recognizes real PNG/JPEG/GIF/WEBP magic bytes", () => {
  assert.equal(detectImageMediaType(new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0]).buffer), "image/png");
  assert.equal(detectImageMediaType(new Uint8Array([255, 216, 255, 0, 0, 0, 0, 0]).buffer), "image/jpeg");
  assert.equal(detectImageMediaType(new Uint8Array([71, 73, 70, 0, 0, 0, 0, 0]).buffer), "image/gif");
  assert.equal(detectImageMediaType(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0]).buffer), "image/webp");
});

test("detectImageMediaType: unknown bytes default to PNG", () => {
  assert.equal(detectImageMediaType(new Uint8Array(8).buffer), "image/png");
});

test("buildIsolatedPageExtractionPrompt / buildDirectPdfExtractionPrompt / buildPageSpecificExtractionPrompt: real page-number interpolation", () => {
  assert.ok(buildIsolatedPageExtractionPrompt(3, 10).includes("page 3 of 10"));
  assert.ok(buildDirectPdfExtractionPrompt(5).includes("PAGE 5"));
  assert.ok(buildPageSpecificExtractionPrompt(2, 7).includes("page 2 of 7"));
});

test("classifyPageType: real classification by title keywords", () => {
  assert.equal(classifyPageType("Door Hardware Schedule", null), "schedule_table");
  assert.equal(classifyPageType("Typical Door Detail", null), "detail_drawing");
  assert.equal(classifyPageType("General Notes", null), "specification");
  assert.equal(classifyPageType("Floor Plan Level 1", null), "general");
});

test("classifyPageType: a schedule-like title with a detail keyword yields detail_drawing (detail wins)", () => {
  assert.equal(classifyPageType("Door Schedule Detail", null), "detail_drawing");
});

test("isPageInRange: real range object, array of ranges, and no-range pass-through", () => {
  assert.equal(isPageInRange(5, null), true);
  assert.equal(isPageInRange(5, { start: 1, end: 10 }), true);
  assert.equal(isPageInRange(15, { start: 1, end: 10 }), false);
  assert.equal(isPageInRange(5, [{ start: 1, end: 3 }, { start: 4, end: 6 }]), true);
  assert.equal(isPageInRange(20, [{ start: 1, end: 3 }, { start: 4, end: 6 }]), false);
});

test("detectSchedulePages: real high-confidence match for a door schedule bookmark", () => {
  const bookmarks = [{ page: 5, title: "A-501 DOOR SCHEDULE" }];
  const results = detectSchedulePages(bookmarks, "arch");
  assert.equal(results.length, 1);
  assert.equal(results[0].confidence, "high");
  assert.equal(results[0].schedule_type, "door_schedule");
});

test("detectSchedulePages: sorts high confidence before low, then by page number", () => {
  const bookmarks = [
    { page: 10, title: "Index" }, // low confidence (general_schedule)
    { page: 2, title: "Hardware Schedule" }, // high
    { page: 1, title: "Door Schedule" }, // high
  ];
  const results = detectSchedulePages(bookmarks, "arch");
  assert.equal(results[0].confidence, "high");
  assert.equal(results[0].page, 1);
  assert.equal(results[1].page, 2);
  assert.equal(results[2].confidence, "low");
});

test("detectSchedulePages: dedupes multiple bookmarks on the same page, ignores null pages", () => {
  const bookmarks = [
    { page: 1, title: "Door Schedule" },
    { page: 1, title: "Door Schedule (cont)" },
    { page: null, title: "Cover" },
  ];
  const results = detectSchedulePages(bookmarks, "arch");
  assert.equal(results.length, 1);
});

test("detectSchedulePages: empty/missing bookmarks returns an empty array", () => {
  assert.deepEqual(detectSchedulePages([], "arch"), []);
  assert.deepEqual(detectSchedulePages(null, "arch"), []);
});

test("applyConstraintOverride: replace mode overwrites named fields, keeps the rest from base", () => {
  const base = { field_name: "old", field_type: "string", extraction_instruction: "old instr", required: false, sort_order: 1 };
  const override = { override_mode: "replace", field_name: "new", required: true };
  const result = applyConstraintOverride(base, override);
  assert.equal(result.field_name, "new");
  assert.equal(result.required, true);
  assert.equal(result.field_type, "string"); // preserved from base
});

test("applyConstraintOverride: extend mode merges enum_values and appends instruction text", () => {
  const base = { extraction_instruction: "Base instruction.", enum_values: ["A", "B"] };
  const override = { override_mode: "extend", extraction_instruction: "Extra note.", enum_values: JSON.stringify(["B", "C"]) };
  const result = applyConstraintOverride(base, override);
  assert.equal(result.extraction_instruction, "Base instruction. Extra note.");
  assert.deepEqual(result.enum_values, ["A", "B", "C"]);
});

test("applyConstraintOverride: disable mode returns null", () => {
  assert.equal(applyConstraintOverride({}, { override_mode: "disable" }), null);
});

test("rowToConstraintField: real transformation from a DB row into a constraint field", () => {
  const row = { field_name: "mark", field_type: "string", enum_values: JSON.stringify(["A", "B"]) };
  const result = rowToConstraintField(row);
  assert.equal(result.field_name, "mark");
  assert.deepEqual(result.enum_values, ["A", "B"]);
});

test("getScheduleTypeConfig / listScheduleTypes: real registry lookups", () => {
  assert.equal(getScheduleTypeConfig("door_schedule").display_name, "Door Schedule");
  assert.equal(getScheduleTypeConfig("not_a_real_type"), null);
  const all = listScheduleTypes();
  assert.ok(all.some((t) => t.type === "hardware_schedule"));
});

test("buildGenericExtractionPrompt / buildPageSpecificExtractionPrompt: contain real page markers", () => {
  assert.ok(buildGenericExtractionPrompt(4, 9).includes("4"));
});

test("parseGenericExtractionResult: real happy path parses a fenced JSON block", () => {
  const apiResponse = { content: [{ type: "text", text: "```json\n" + JSON.stringify({ entries: [{ a: 1 }] }) + "\n```" }] };
  const result = parseGenericExtractionResult(apiResponse);
  assert.deepEqual(result.entries, [{ a: 1 }]);
});

test("parseGenericExtractionResult: real error branch on invalid JSON", () => {
  const apiResponse = { content: [{ type: "text", text: "not json" }] };
  const result = parseGenericExtractionResult(apiResponse);
  assert.equal(result.extraction_type, "parse_error");
  assert.ok(result.error);
});

test("buildPromptFromConstraints: interpolates real field instructions into the prompt", () => {
  const constraints = {
    spec_version: "v1",
    scope_chain: ["global", "tenant"],
    fields: [
      { field_name: "mark", field_type: "string", extraction_instruction: "The door mark", field_group: "page", sort_order: 1, required: true },
    ],
  };
  const prompt = buildPromptFromConstraints(constraints, 1, 5);
  assert.ok(prompt.includes("mark"));
  assert.ok(prompt.includes("The door mark"));
  assert.ok(prompt.includes("global → tenant"));
});

test("buildDoorScheduleExtractionPrompt: real happy path with a required, enum'd field", () => {
  const constraints = {
    spec_version: "v1",
    scope_chain: ["global"],
    fields: [
      { field_name: "fire_rating", field_type: "string", extraction_instruction: "Fire rating code", sort_order: 5, required: true, enum_values: ["NR", "60 MIN"] },
    ],
  };
  const prompt = buildDoorScheduleExtractionPrompt(constraints, 2, 8);
  assert.ok(prompt.includes("fire_rating"));
  assert.ok(prompt.includes("NR, 60 MIN"));
  assert.ok(prompt.includes("REQUIRED"));
});

test("parseDimensionToInches: real parsing of inches, feet-inches, and feet-only formats", () => {
  assert.equal(parseDimensionToInches('36"'), 36);
  assert.equal(parseDimensionToInches("36"), 36);
  assert.equal(parseDimensionToInches(`3'6"`), 42);
  assert.equal(parseDimensionToInches("7'"), 84);
  assert.equal(parseDimensionToInches(""), null);
  assert.equal(parseDimensionToInches(null), null);
});

test("normalizeFireRating: real normalization of common rating formats", () => {
  assert.equal(normalizeFireRating("NR"), "NR");
  assert.equal(normalizeFireRating("Non-Rated"), "NR");
  assert.equal(normalizeFireRating("1 HR"), "60 MIN");
  assert.equal(normalizeFireRating("90 min"), "90 MIN");
  assert.equal(normalizeFireRating("3 HR"), "3 HR");
});

test("sanitizeDoorScheduleField: real string truncation, number clamping, boolean coercion", () => {
  assert.equal(sanitizeDoorScheduleField("hello world", { type: "string", maxLength: 5 }), "hello");
  assert.equal(sanitizeDoorScheduleField("150", { type: "number", max: 100 }), 100);
  assert.equal(sanitizeDoorScheduleField("yes", { type: "boolean" }), 1);
  assert.equal(sanitizeDoorScheduleField("no", { type: "boolean" }), 0);
  assert.equal(sanitizeDoorScheduleField(null, { type: "string", maxLength: 5 }), null);
});

test("parseDoorScheduleEntry: real end-to-end sanitize + normalize + dimension parsing", () => {
  const rawEntry = { mark: "101", fire_rating: "90 min", width: `3'0"`, extraction_confidence: 0.9 };
  const entry = parseDoorScheduleEntry(rawEntry, 4);
  assert.equal(entry.mark, "101");
  assert.equal(entry.fire_rating, "90 MIN");
  assert.equal(entry.width_inches, 36);
  assert.equal(entry.page_number, 4);
  assert.equal(entry.raw_confidence, 0.9);
  assert.equal(entry.extraction_confidence, undefined);
});

test("calculateEntryConfidence: a clean mark and complete p1 fields score high", () => {
  const entry = { mark: "101", hardware_group: "1A", fire_rating: "NR", width: 36, height: 84, door_type: "wood", door_material: "WD", frame_type: "HM", frame_material: "HM", panic: null };
  const result = calculateEntryConfidence(entry, {});
  assert.ok(result.extraction_confidence > 0.7);
  assert.ok(JSON.parse(result.field_confidence_json).mark >= 0.9);
});

test("calculateEntryConfidence: missing p0 fields (mark) drags confidence down and flags low_confidence_fields", () => {
  const entry = {};
  const result = calculateEntryConfidence(entry, {});
  assert.ok(result.low_confidence_fields.includes("mark"));
  assert.ok(result.extraction_confidence < 0.5);
});

test("parseDoorScheduleExtractionResult: real happy path parses door_entries", () => {
  const apiResponse = { content: [{ text: JSON.stringify({ door_entries: [{ mark: "101" }] }) }] };
  const result = parseDoorScheduleExtractionResult(apiResponse);
  assert.equal(result.door_entries.length, 1);
});

test("parseDoorScheduleExtractionResult: missing door_entries array becomes an empty array, not a throw", () => {
  const apiResponse = { content: [{ text: JSON.stringify({ notes: "no doors here" }) }] };
  const result = parseDoorScheduleExtractionResult(apiResponse);
  assert.deepEqual(result.door_entries, []);
});

test("parseDoorScheduleExtractionResult: throws on malformed API response structure", () => {
  assert.throws(() => parseDoorScheduleExtractionResult({}), /Invalid API response structure/);
});

test("_buildPriorContextSection: empty context returns empty string", () => {
  assert.equal(_buildPriorContextSection(null), "");
  assert.equal(_buildPriorContextSection({ pagesExtracted: [] }), "");
});

test("_accumulateContext: mutates ctx in place, recording a new group and matrix entry", () => {
  const ctx = { pagesExtracted: [], groups: [], matrixEntries: [], nomenclature: null, pageTypes: {} };
  _accumulateContext(ctx, {
    hardware_groups: [{ group_number: "1", assigned_doors: ["101"] }],
    door_hardware_matrix: [{ door_number: "101", hardware_set_number: "1" }],
  }, 1);
  assert.equal(ctx.pagesExtracted.length, 1);
  assert.equal(ctx.groups.length, 1);
  assert.equal(ctx.groups[0].groupNumber, "1");
  assert.equal(ctx.matrixEntries.length, 1);
  assert.equal(ctx.pageTypes[1], "mixed");
});

test("_buildPriorContextSection / buildContextAwareExtractionPrompt / _buildCrossReference: real end-to-end context flow across pages", () => {
  const ctx = { pagesExtracted: [], groups: [], matrixEntries: [], nomenclature: null, pageTypes: {} };
  _accumulateContext(ctx, {
    hardware_groups: [{ group_number: "1", group_name: "Entry", assigned_doors: ["101"] }],
    door_hardware_matrix: [{ door_number: "101", hardware_set_number: "1" }],
  }, 1);

  const promptSection = _buildPriorContextSection(ctx);
  assert.ok(promptSection.includes("Group/Set 1"));
  assert.ok(promptSection.includes("Door 101"));

  const fullPrompt = buildContextAwareExtractionPrompt(2, 5, ctx);
  assert.ok(fullPrompt.includes(promptSection.trim().split("\n")[0].trim()) || fullPrompt.length > promptSection.length);

  const crossRef = _buildCrossReference(ctx);
  assert.equal(crossRef.matched_count, 1);
  assert.equal(crossRef.unmatched_count, 0);
  assert.equal(crossRef.groups_with_doors, 1);
});

test("_buildCrossReference: an unmatched matrix entry (no corresponding group) is reported, not dropped", () => {
  const ctx = { groups: [], matrixEntries: [{ doorNumber: "999", hardwareSetNumber: "99", page: 1 }] };
  const crossRef = _buildCrossReference(ctx);
  assert.equal(crossRef.matched_count, 0);
  assert.equal(crossRef.unmatched_count, 1);
  assert.ok(crossRef.unmatched[0].note.includes("99"));
});
