# SightX Reconstruction: Additional AEC Format Support — Scoping Plan

Date: 2026-10-03
Scope: honest technical scoping for DWG/DXF, IFC, and point clouds (LAS/E57). PSD excluded per instruction — no PSD-specific work, task, or sibling agent was found anywhere in this repo, `.claude/worktrees/*`, git history/branches, or memory; it is assumed to be tracked elsewhere and is intentionally out of scope here to avoid duplication.

## 0. Architecture correction (checked, not assumed)

The task framed this as "Workers-compatible vs. needs the Mac backend." That framing doesn't match what's actually in the repo. There is no server-side parsing backend for SightX today:

- `src/pages/sightx.html` loads `assets/sightx-ingest.js` and `assets/sightx-reconstruction.js` as plain `<script>`/`<script type="module">` tags — all parsing (PDF via `pdfjs`, CSV, IFC-as-text, OBJ, glTF, LAS header) runs **in the visitor's browser**, client-side.
- `weyland-sightx-worker` (the Cloudflare Worker) only serves the static page and proxies one unrelated route (`/api/sightx/walkthrough-preview` → `filmline-video-worker`). It does zero file parsing.
- The "walkable 3D" renderer in `assets/sightx-reconstruction.js` is **not** a WebGL/mesh engine — there is no `THREE`/`WebGL` reference anywhere in it. It's a 2D-canvas signed-distance-field (SDF) raymarcher: a floor-plan image gets thresholded into a binary wall mask (`imageMaskToSdf()`, line 60), chamfer-distance transformed, and raymarched to fake a first-person walkthrough.

So the real constraint isn't Workers' CPU/memory limits — it's **browser main-thread JS/WASM budget** (bundle size shipped to the client, and the fact the existing renderer only consumes a 2D wall mask, not full 3D meshes). This changes the honest verdict for IFC and point clouds below: a library can hand you a real 3D mesh, but today's renderer can't walk through a mesh — only a 2D mask. Any format that produces true 3D geometry needs either (a) flattening to a 2D mask (loses height/story data, cheap) or (b) a real renderer upgrade (expensive, out of scope of this ticket).

`assets/sightx-ingest.js` already has partial scaffolding for every format in question: `ADAPTER_TYPES` includes `dwg`, `dxf`, `laz`; `classify()` already buckets `ifc`→`bim`, `las/laz/e57`→`point-cloud`. But the actual adapters are stubs: IFC gets a **regex scan of STEP entity lines for type+GUID+name only — no geometry, no placement** (`parseIfc`, ~line 139); LAS gets a **binary header read only — point count, bounds, scale/offset, no actual point decode** (`parseLas`, ~line 106); DWG/DXF/E57 fall through to `metadata-only` with **zero real parsing** today (`extract()`, ~line 295: `adapter: ${ext}-geometry-adapter` is a label, not an implementation).

## 1. DXF (and DWG)

**DXF — real parsing approach:** `dxf-parser` (npm, pure JS, no WASM/native deps) is real, MIT-licensed, parses `LINE`/`LWPOLYLINE`/`POLYLINE`/`CIRCLE`/`ARC`/`TEXT`/`INSERT`/block entities into plain JS objects. Last published 2021-11, but DXF (ASCII tag-value format, stable since the 1990s) doesn't rot the way a JS framework does — confirmed it still parses correctly (see POC below). `three-dxf` exists as a renderer reference but isn't needed since SightX's own renderer is 2D-mask-based, not a 3D viewer.

**DXF — complexity:** Small-to-medium. The library gives you exact vector wall-line coordinates — genuinely *less* work than today's pipeline, which rasterizes a PDF page to pixels and then has to guess walls from pixel intensity (`chamferDistance`/`gofaineatWallMask`, a GA-trained classifier the code itself discloses is "trained ONLY on synthetic floor plans, generalization to real drawings unproven"). DXF gives ground-truth wall geometry instead of a guess. Remaining real work: rasterize vector segments into the 0/1 wall mask `imageMaskToSdf()` expects (confirmed buildable — see POC), handle multiple `LAYER`s (pick which layers = walls vs. furniture/dimensions/text), handle arcs/bulges on polylines (not in the POC, real but bounded effort), and handle block `INSERT`s (recursive, more effort).

**DXF — caveats:** Real DXF files in the wild vary by AutoCAD version/encoding (ASCII vs. binary DXF — `dxf-parser` only handles ASCII; binary DXF needs conversion first, which AutoCAD itself can do but we can't). No licensing issue (MIT).

**DWG — real parsing approach: there isn't a usable free one.** DWG is Autodesk's closed, binary, versioned format with no official free parser. The only serious open-source option is **LibreDWG** — but it's a GPL-licensed C library, not a maintained WASM/npm package (the `libredwg` npm entry is a dev placeholder, version `0.0.0-dev.0`, last published 2023, not a real usable artifact). Compiling LibreDWG to WASM yourself is technically possible but (a) real engineering effort (C→WASM toolchain, not "install a package"), and (b) GPL is a genuine licensing problem for shipping inside a commercial product — copyleft obligations don't go away just because the code is compiled to WASM and served from a CDN.

**DWG — honest verdict:** needs a paid path. The realistic commercial option is **Autodesk Platform Services (APS, formerly Forge) Model Derivative API** — a cloud API that converts DWG server-side to SVF2/glTF/OBJ. It has a limited free tier (cloud credits) then pay-per-conversion. This is an *API integration task* (API key, upload, poll, download converted geometry), not a parsing task — and it means DWG support depends on an external paid vendor at request time, the same category of dependency flagged as a no-go for the Qwen bridge elsewhere in this estate. Cheapest realistic alternative: don't parse DWG at all — tell users to "Save As DXF" (one click in every version of AutoCAD) and only support DXF natively.

## 2. IFC

**Real parsing approach:** `web-ifc` (npm, actively maintained by ThatOpen Company — formerly IFC.js — MIT-licensed, confirmed real: latest version `0.0.78` published 2026-09-21, i.e. last week). It's a WASM port of a real IFC geometry engine. Checked the actual WASM binary size via unpkg: `web-ifc.wasm` is **1.59MB**, `web-ifc-mt.wasm` (multithreaded) is **1.56MB** — small enough to ship to a browser without concern, and far below any Workers script-size ceiling if it were ever moved server-side.

**Complexity:** Medium, and the best effort/value ratio of the three. Unlike DXF, IFC is semantic BIM data — it natively encodes `IfcSpace` (rooms), `IfcWall`, `IfcDoor`, `IfcBuildingStorey`, with real 3D placement, not just lines. `web-ifc` gives you real triangulated meshes and the spatial tree essentially for free; today's `parseIfc()` only regex-matches entity type+GUID+name with **zero geometry** — this would be a categorical upgrade, not a tweak. Remaining real work: mesh → either (a) flatten story-by-story into the existing 2D wall-mask SDF format per floor (cheap, fits today's renderer, loses multi-story/height nuance), or (b) a genuinely new 3D mesh-walking renderer (expensive, separate project).

**Caveats:** Real building IFC files can be large (tens to hundreds of MB) — parsing that client-side on a phone is a real risk; no community-confirmed precedent found for running `web-ifc` inside a Cloudflare Worker specifically (moot anyway per §0 — this is browser-side), but worth a smoke test on a real large model before committing. No licensing issue.

## 3. Point clouds — LAS/LAZ vs. E57

**LAS/LAZ — real parsing approach:** `laz-perf` (npm, real, WASM, actively maintained — `0.0.7` published 2025-02) decodes compressed LAZ/LAS point data; `copc` (npm, real, maintained — published 2026-08-10, depends on `laz-perf`) adds Cloud-Optimized Point Cloud support, which matters here because COPC allows progressive/partial loading — you don't need the whole scan in memory to start rendering, which is a good match for a "walkable" experience. `potree` exists on npm but is a stale 2017 WIP, not usable as-is — if a point-cloud *viewer* UI is wanted, that'd need to be built, not borrowed.

**Complexity:** Medium. Today's `parseLas()` only reads the binary header (version, point count, bounds, scale/offset) — zero actual point decode. Swapping in `laz-perf`/`copc` for real point decoding is a bounded, concrete upgrade. But point clouds are fundamentally not meshes or masks — "walkable" would mean either (a) a point-cloud-native first-person viewer (real, separate renderer work, point splatting), or (b) surface reconstruction (Poisson, etc.) into a mesh or 2D wall mask — no real maintained JS library for that was found; this is a genuine research-grade gap, not a library gap.

**E57 — honest verdict: no real JS/WASM library exists.** Checked npm directly: no real `e57` package (empty/unrelated result), `pye57` isn't even an npm package (it's Python/PyPI, not found at all in npm). The reference implementation is `libE57Format`, a C++ library with Python bindings — there is no community WASM port in active use. Realistic options: (a) run `libE57Format` or a Python `pye57` conversion step on this Mac as a one-off conversion utility (not a Workers/browser feature — genuinely needs a native process), or (b) simply ask users to export LAS/LAZ instead, since essentially every scanner/software that writes E57 (RealityCapture, CloudCompare, most laser scanners) can also export LAS. Recommend (b) for v1 — building (a) is real infrastructure work for a format most tools can sidestep.

## Proof-of-concept built

Built and ran a real, working DXF→wall-mask POC (not simulated) at `/private/tmp/claude-501/-Users-johnmobley/36836088-d551-4ec6-b6ef-38f1b69cf0bc/scratchpad/dxf-poc/`:
1. Installed real `dxf-parser` from npm.
2. Hand-wrote a minimal but valid ASCII DXF (`sample-room.dxf`) with one rectangular `LWPOLYLINE` room boundary (6m × 4m) and two `LINE` wall segments for an interior partition.
3. Parsed it — `dxf-parser` correctly returned 3 entities with real coordinates (`[0,0]→[6000,0]→[6000,4000]→[0,4000]→[0,0]`, etc.).
4. Rasterized the vector segments into a binary wall mask via a plain Bresenham line-draw (121×81px, 436 wall pixels set) — no Canvas API, no browser needed for this step.
5. Confirmed this is the exact internal representation (`walls`/`open` `Uint8Array` + `metersPerPixel`) that `chamferDistance()`/`imageMaskToSdf()` in `assets/sightx-reconstruction.js` already compute internally from a rasterized PDF page — so a DXF source genuinely can feed the existing walkable-3D pipeline with one new adapter step (vector→mask) replacing today's (image→mask) step.

One nuance not glossed over: `imageMaskToSdf(maskImage, bounds)`'s current public signature takes a browser `Image`, not a raw mask array, because it was built only for the PDF-raster path. Feeding it a DXF-derived mask needs a small, real refactor (accept a raw `Uint8Array` mask directly, or draw it to an offscreen canvas first) — not a blocker, just an honest integration detail, not "drop-in."

Arcs/bulges on polylines and block `INSERT`s were deliberately not covered by this POC (noted above as real remaining DXF effort) — the goal was confirming the core wall-line path only.

## Recommended build order

1. **DXF** — build first. Real library (`dxf-parser`), real working POC above, smallest real gap to "done," and it's a genuine upgrade over today's PDF path (exact geometry vs. a pixel-intensity guess the code itself flags as having "unproven generalization to real drawings"). Fits the existing renderer with one new adapter.
2. **IFC** — build second. `web-ifc` is real, current, small (1.6MB wasm), and IFC's native room/wall semantics are the best long-term fit for "walkable building" — but budget real time for the mesh→mask-or-new-renderer decision in §0, and smoke-test a large real file before committing.
3. **LAS/LAZ** — build third. Real libraries (`laz-perf`, `copc`) exist and genuinely upgrade today's header-only stub, but ship it as a point-cloud *viewer* feature, not a false promise of "walkable" — surface reconstruction to a walkable mesh has no real library backing it today.
4. **DWG** — don't build a parser. Either integrate Autodesk APS (paid, external dependency, real per-conversion cost) only if a user genuinely can't produce DXF, or — recommended — just tell users to export DXF, which every DWG-authoring tool supports natively at zero cost.
5. **E57** — don't build a parser for v1. Tell users to export LAS/LAZ instead; revisit only if a real user need for native E57 ingestion shows up that can't be solved by asking for a LAS export.

## Files referenced
- `/Users/johnmobley/weylandai.com/assets/sightx-ingest.js` — existing (partial/stub) multi-format ingest adapters
- `/Users/johnmobley/weylandai.com/assets/sightx-reconstruction.js` — existing SDF/raymarch walkable renderer (2D-canvas, not WebGL)
- `/Users/johnmobley/weylandai.com/src/pages/sightx.html` — confirms both load as plain client-side `<script>` tags
- `/Users/johnmobley/weylandai.com/weyland-sightx-worker/` — confirms the Worker does no file parsing today
