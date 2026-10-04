# plan-extract: stage 1 of the PDF-to-twin pipeline (prototype, 2026-10-04)

Deterministic sheet triage, scale lock and wall extraction from vector plan PDFs, per `docs/PDF_TO_TWIN_RULES.md` (pipeline stages 1 to 3, construction rules 1 and 4, scale-sanity rule 17). No model calls. It runs on pdf.js, the same renderer the product ships, so the operator walk ports to the browser module unchanged.

```
cd tools/plan-extract && npm install
node extract_walls.mjs triage <file.pdf>                   # per page: type guess, sheet number, path count, scale strings
node extract_walls.mjs text   <file.pdf> <page> [regex]    # joined text lines (debugging scale and schedule parsing)
node extract_walls.mjs walls  <file.pdf> <page> [out.json] # scale lock + walls (feet) + closure score
python3 overlay.py out.json <file.pdf> <page> out.png [dpi] # draw walls over the rendered page
```

## What it does

1. Walks `getOperatorList()` tracking the CTM (save/restore/transform), collecting every stroked segment and every filled polygon in page space.
2. Joins text items into baseline lines (CAD exports jitter y and emit items out of order) and parses announced scales: `SCALE: 3/32" 1'-0"` (the `=` is often a separate glyph or missing), `1/4"=1'`, `1:100`. A sheet with no announced scale fails the scale lock and nothing is drawn.
3. Walls from two sources: filled quads whose short side is 3" to 18" at scale (CAD poche), and pairs of parallel stroked segments at wall thickness with at least 1 ft of overlap. Collinear pieces are merged. Thickness and length are reported in feet.
4. Closure score (rule 1): fraction of wall endpoints that meet another wall within one thickness.

## Results on three real sheets

| Sheet | Scale lock | Walls | Wall length | Closure | Notes |
|---|---|---|---|---|---|
| Rockford Carlson Elementary, A0.1 1st floor demolition (corpus `door-schedules/f0e863d88ea688ff.pdf` p.25) | `SCALE: 3/32" 1'-0"` -> 6.75 pt/ft | 834 (464 from fill) | 3,876 ft | 79% | Hexagonal classroom and corridor walls recovered; key-plan box and legend rectangles are false positives |
| Fayette County GA bid set p.6 (`plan-sets/fayette_ga_2419_addendum1_plans.pdf`) | `SCALE: 3/16" = 1'-0"` -> 13.5 pt/ft | 613 (109 from fill) | 3,230 ft | 93% | Stroke pairs dominate; see overlay before trusting counts |
| Chief Architect Grandview sample p.4 (`plan-sets/grandview_chiefarchitect_sample.pdf`, not in git, URL in the manifest) | `1/4"=1'` -> 18 pt/ft | 1,242 (444 from fill) | 3,847 ft | 86% | Exterior and interior walls recovered; hatch and dimension lines over-pair, legend swatches painted |

The wall totals are too high on every sheet: stroke pairing accepts hatch lines, dimension strings and table rules. The fill-derived walls are clean on all three.

## Next steps (in order)

1. Restrict to the drawing region: find the title block and legends (text density + table rules) and exclude them before pairing.
2. Stroke pairing constraints: both segments similar length, no third parallel segment between them, line width consistent with wall faces; drop pairs inside filled quads already taken.
3. Dimension-string agreement (rule 2): parse `34'-5"` strings with their leader geometry and check extracted lengths within 1% or 1".
4. Stage 2 openings: door swing arcs (`curveTo` runs) with their tags, radius = leaf width, matched to the door schedule page found by `triage`.
5. Port the walk to the browser module (`assets/sightx-reconstruction.js`) behind the "unresolved" material so partial results stay honest.
