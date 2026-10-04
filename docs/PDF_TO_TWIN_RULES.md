# From an uploaded PDF to a walkable twin: the rules the cascades must obey

Written 2026-10-04 in answer to John: "we need gofaineat cascades to build the 3D versions of whatever building within whatever pdf is uploaded ... brainstorm what rules of physics and construction we must encode ... accurate to the plans/specs, renders without visual bugs."

Scope: architectural plan sets a subcontractor actually receives (floor plans, door schedules, hardware sets, frame/door elevations, wall sections, finish schedules, reflected ceiling plans). Not structural analysis, not MEP coordination. The output is the SightX building: a walkable, labeled, buyable-hardware twin that a bidder trusts because every element traces to a sheet, a detail, or a schedule line.

Design stance: GOFAINEAT cascades are deterministic, measured extractors with a fallback chain (see the SubX price-extraction and bookeepr classifier precedents). No shipped step may depend on a local model bridge at request time. Every stage emits a confidence and a provenance pointer; anything below threshold is drawn as "unresolved" in the twin, never guessed.

---

## 1. Pipeline stages (each is a cascade with its own validators)

| # | Stage | Input | Output | Deterministic first pass | Fallback |
|---|---|---|---|---|---|
| 1 | Sheet triage | PDF pages | sheet id, discipline, type (plan/schedule/elevation/section/detail), scale, north | title-block OCR + regex on sheet numbers (A-101, A-601…), scale strings ("1/8\" = 1'-0\"", "1:100"), north-arrow glyph detection | page-text heuristics; human confirm |
| 2 | Scale + units lock | plan sheet | px→ft/m transform, confidence | scale string ∧ a measured known dimension (door 3'-0\" leaf, dimension strings) must agree within 2 % | dimension-string only; flag |
| 3 | Wall extraction | vector/raster plan | wall centerlines, thickness, type tag, openings cut out | vector: parallel-line pairs at wall thicknesses from the wall-type legend; raster: skeletonize + pair | relax tolerances; flag |
| 4 | Opening extraction | plan + door schedule | each opening: mark (101, 101A), wall ref, location along wall, width, swing, hand, frame type | door-tag text near swing arcs; arc radius = leaf width | schedule-only placement (unknown position: draw ghost) |
| 5 | Schedule parsing | door/frame/hardware schedules | rows keyed by mark: size, material, rating, frame, hardware set | table grid detection + header matching (the same parser as CutsheetX match-batch text mode) | column heuristics |
| 6 | Hardware resolution | hardware set lines | real products (CutsheetX match) with citations | /api/cut-sheets/match-batch | miss → recorded, drawn generic, labeled unresolved |
| 7 | Room/ceiling/finish | RCP + finish schedule | ceiling height per room, grid type, floor/wall finish | room-tag polygon fill + RCP legend | defaults by occupancy, flagged |
| 8 | Assembly | all above | twin scene graph (walls, openings, doors, hardware, ceilings, floors, fixtures) | pure function of validated inputs | n/a |
| 9 | Verification | scene graph vs source | pass/fail per rule below, a diff report, confidence per element | rules in §2–§4 | human review queue |

The twin never renders a stage-8 element whose stage-9 checks failed; it renders the element's envelope in the "unresolved" material with the reason on its label.

## 2. Construction rules (accuracy to plans and specs)

These are the invariants a drafter would check. Each one is a test the cascade must pass before an element is drawn solid.

**Geometry and dimensioning**
1. Closure: every room's wall loop closes within one wall thickness; unclosed loops flag the gap, never auto-close across an opening.
2. Dimension agreement: any dimension string along a wall must match the extracted length within 1 % or 1 inch, whichever is larger. Two disagreeing strings on the same run fail the run.
3. Grid consistency: column grid lines are straight, labeled in sequence, and spacings match the grid dimension strings; walls that reference a grid (centered, face-of) snap to it.
4. Wall-type legend: thickness drawn = legend thickness for that tag (e.g. 4 7/8\" for a 3 5/8\" stud + two layers of 5/8\" gypsum); a wall drawn at a thickness not in the legend is flagged.
5. Level and story: plan elevation (FFE) from the section/elevation sheets sets floor Z; ceiling height from RCP; top-of-wall from wall sections (to deck vs to ceiling). Walls that stop at the ceiling are not drawn to deck.

**Openings and doors**
6. Door leaf width = swing arc radius = schedule width (±1 inch). Three sources, one number.
7. Hand and swing: the arc side defines swing direction; hand is derived from hinge side relative to the push side and must equal the schedule's hand if present. Mismatch fails the door.
8. Rough opening = leaf + frame per frame type (hollow metal 2\" face, 5 3/4\" or 4 7/8\" jamb depth to match wall thickness); frame depth must equal wall thickness or the frame type must be a wrap type.
9. Fire rating: a rated door (20/45/60/90 min) must sit in a rated wall per the wall legend; a rated door in an unrated wall is a plan error, surfaced, not hidden.
10. Egress: exit doors swing in the direction of egress travel; pairs on egress paths carry exit devices (Von Duprin 99/98 class), not locksets. Doors on an exit path without a device are flagged, not fixed.
11. Clearances: 32\" minimum clear width at 90° open; 18\" strike-side maneuvering clearance on the pull side where the schedule marks accessible routes. Draw the clearance box in the twin so a bidder sees the conflict.
12. Door-to-wall: an opening cannot be closer to a wall return than the frame width plus the schedule's minimum jamb-to-corner distance; two openings cannot overlap.

**Hardware (the part we actually sell)**
13. Hardware sets resolve to real products via the match cascade; each product's mounting location follows its type: closers at the head on the stop or pull side per the set (parallel arm vs regular arm), locks at 38\"–42\" to lever centerline, hinges at 5\" head / 10\" sill / centered or equal spacing for 3, exit devices at 34\"–48\" to crossbar. These numbers are drawn, so a wrong mount reads wrong immediately.
14. Set completeness: a swinging door needs hinges (or pivots), a latching or locking device, and either a closer or an explicit "no closer" note; rated doors need a closer and positive latching. Missing items appear as a red label on that door.
15. Handing of hardware follows the door: a LH door gets LH lever/closer orientation; mirrored geometry, not copied.
16. Thresholds and gasketing (NGP/Zero class) appear only where the schedule or the exterior/rated condition calls for them.

**Scale sanity (catches most extraction failures)**
17. A door is 3'-0\" ± 6\" wide and 7'-0\" ± 6\" tall unless the schedule says otherwise; a corridor is 44\"–96\" wide; a ceiling is 8'–12'. Any element outside its band halts assembly of that element and asks for a human.

## 3. Physics rules (what makes the twin feel and behave like a building)

1. Gravity and support: every element sits on something. Doors hang from hinges on jambs; frames anchor to walls; ceilings hang below deck. Nothing floats.
2. Solid-body non-penetration: no two solids intersect except designed penetrations (frames into walls, closers into heads). The assembler checks pairwise bounding boxes then SDF intersections; an intersection is a build error, not a rendering quirk.
3. Door kinematics: a leaf rotates about its hinge axis through its swing angle (90°, 110°, 180° per hardware stop); the swing volume must be free of other solids. Closers and overhead stops define the stop angle.
4. Walkability: the player collides with walls and closed doors, passes through open leaves' clear width, and stands on floor Z. Eye height 1.6 m. Stairs and ramps use the section's rise/run.
5. Light: troffers emit from the RCP positions; daylight enters only through scheduled glazing and exterior doors; sun direction from the north arrow and site latitude if given, otherwise a stated default.
6. Materials from finish schedule: concrete, VCT, carpet, gypsum paint, CMU, hollow metal, wood veneer, each with a measured albedo/roughness table, not per-scene guesses.

## 4. Render-correctness rules (no visual bugs)

1. One unit, one origin: meters internally, converted once at ingest; a model-space origin at the plan's lower-left grid intersection; all sheets registered to it.
2. No coplanar faces: offset coincident surfaces (wall paint vs frame face, floor vs threshold) by ≥ 1 mm; the assembler rejects exact coincidence.
3. SDF budget: the raymarcher gets a bounded scene: walls as repeated boxes or a baked distance field per room, openings via subtraction, doors/hardware only evaluated inside their opening's bounding volume (the bounding-test-then-detail pattern already used for the schedule doors).
4. Ray step guard: minimum feature size (hinge knuckle ≈ 12 mm) sets the march epsilon; features below it are drawn as decals/normal detail, not geometry.
5. Normals and shading: every SDF is Lipschitz-1 (no scaled distances), so normals from the gradient are clean; mirrored geometry flips consistently.
6. LOD by distance: labels fade past 48 m (as now); hardware detail switches to a flat decal past 12 m; doors beyond 60 m are frames only.
7. Determinism: same PDF, same twin, byte-for-byte. Any randomness (e.g. ajar angles) is seeded from the door mark.
8. Golden-image tests: a fixed set of plan PDFs renders from fixed camera poses; CI compares to approved frames with a tolerance; any diff blocks deploy.
9. Camera safety: spawn in a room's free area at eye height facing the nearest door; never inside a wall; never below floor.

## 5. Verification harness

- Round-trip: regenerate a plan from the twin (walls, openings, tags) and diff it against the extracted plan: positions within 1 inch, counts equal.
- Schedule reconciliation: every schedule mark appears exactly once in the twin; every drawn door has a schedule row. Unmatched on either side is a listed error.
- Hardware reconciliation: every set line resolves or is listed as a miss with its citation attempt (feeds the public coverage counter).
- Human review queue: elements below confidence, with the sheet crop and the extracted numbers side by side (the region-render path from SubX already produces the crops).
- Metrics the cascade reports per PDF: sheets triaged, scale confidence, walls closed %, doors placed %, hardware resolved %, rule failures by rule number, render time.

## 6. What exists today and the order to build

Exists: SubX extraction + page/region rendering (Browser Rendering + pdf.js), CutsheetX match and match-batch with citations, SightX plan mode (sdPlanWall walls from a loaded plan), the door-frame SDF with hardware labels, the first-person embodiment, and the dossier hand-off.

Order: (1) scale lock + wall extraction with closure checks on three real plan sets; (2) opening extraction tied to the door schedule with rules 6–8; (3) hardware resolution and mounting rules 13–15 drawn on the doors; (4) collision + walkability; (5) golden-image CI; (6) RCP/finishes. Each step ships behind the "unresolved" material so partial results are honest, never pretend.
