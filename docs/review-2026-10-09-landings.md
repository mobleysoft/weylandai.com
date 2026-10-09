# Landing review — 2026-10-09

- Range: `47beefc..683b84ae9c6df19243a11b176f0ea4e3ab0c49da` (18 commits, 176 changed files). Priority paths inspected as requested.
- Only this report written; no application edits, commits, deployment, production API calls, or cleanup execution. Existing untracked `weyland-subx-worker/node_modules` symlink left untouched.
- Findings: **2 high, 3 medium, 1 low**. F4 is an existing routing defect in the requested path, not introduced by these commits; F1 retains an existing unsafe fallback after the new pass.
- Paths below are repository-relative. `G` means `weyland-subx-worker/assets/client-ocr-src/schedule-grid-extraction-client.mjs`; `W` means `weyland-subx-worker/src/routes/subx-workspace.js`.

**F1 — high — The scan pixel budget does not constrain the fallback render.**

- Location: `G:1398–1406`, `G:1425–1429`; shared cap at `G:632–635`.
- Reach: upload a large image-only page on which the first OCR pass finds no door table, then read it. The new capped pass returns null and immediately enters the old fixed-150-DPI detection render. The later table cap also stops reducing at 300 DPI even when the table still exceeds the budget.
- Break: a small/compressible PDF can request gigabytes of canvas storage and fail the read or exhaust the local/hosted browser. The 30 MB PDF upload limit does not bound page dimensions. This is a browser allocation finding, not a measured SubX Worker-isolate OOM.
- Executed allocation-spy reproduction below: a 14,400 × 14,400 pt page requested `[36000000,36000000,36000000,36000000,36000000,900060001]` pixels. Last RGBA allocation request: **3,600,240,004 bytes**, before canvas/render/OCR copies. Pixels and recognition were stubbed to avoid allocating them; extraction control flow was the shipped source.

```sh
node --input-type=module -e 'import fs from "node:fs";import {pathToFileURL} from "node:url";const base="weyland-subx-worker/assets/client-ocr-src/";let s=fs.readFileSync(base+"schedule-grid-extraction-client.mjs","utf8").replace(/from "\.\/schedule-text-layer.mjs[^\"]*"/,"from "+JSON.stringify(pathToFileURL(process.cwd()+"/"+base+"schedule-text-layer.mjs").href)).replace("let pdfjsLibPromise = null;","let pdfjsLibPromise = Promise.resolve(globalThis.reviewPdfjs);").replace("let ocrEnginePromise = null;","let ocrEnginePromise = Promise.resolve(globalThis.reviewEngine);");const pixels=[];const page={getTextContent:async()=>({items:[]}),getViewport:({scale})=>({width:14400*scale,height:14400*scale}),render:()=>({promise:Promise.resolve()})};globalThis.reviewPdfjs={getDocument:()=>({promise:Promise.resolve({getPage:async()=>page})})};globalThis.reviewEngine={clearImage(){},loadImage(){},setVariable(){},getTextBoxes(){return []}};globalThis.document={createElement:()=>({getContext(){const c=this;return {getImageData(){pixels.push(c.width*c.height);if(c.width*c.height>36e6)throw Error("PIXEL BUDGET EXCEEDED");return {width:1,height:1,data:new Uint8ClampedArray([255,255,255,255])}}}}})};const m=await import("data:text/javascript;base64,"+Buffer.from(s).toString("base64"));try{await m.extractDoorScheduleFromPdf(new ArrayBuffer(1),1)}catch(e){console.log(e.message)}console.log(pixels);'
```

**F2 — medium — Pixel-bounded scans still have no recognition-work or cancellation budget.**

- Location: `G:590–623`, `G:630–650`; `tools/accuracy/truth/ocr.mjs:120–138`; caller `weyland-subx-worker/src/pages/subx-app.html:2424`.
- Reach: a dense ruled scan, including a deliberately supplied fine grid, enters the new cell recognizer. Every eligible row × column invokes synchronous WASM recognition; dimension cells can add five rereads. There is no cell limit, elapsed-time check, yielding, abort signal, or terminable OCR Web Worker.
- Break: the customer's UI cannot process cancellation while this loop runs; hosted Browser Rendering and the Node truth harness consume the same workload. `browser-grid-extraction.js:130,146` sets a page default timeout but adds no explicit cancellation around the evaluated OCR operation. Eventual browser/protocol termination is not a per-page work bound. Poppler calls at `ocr.mjs:43,56` likewise lack subprocess timeouts.
- Executed probe: **9,802 recognition calls on only 1.44 MP**. The same 12-pixel grid at 6,000² pixels implies 249,002 calls before dimension rereads. Timing of fake recognition is not an estimate of actual OCR time.

```sh
node --input-type=module -e 'import {recognizePageWords} from "./weyland-subx-worker/assets/client-ocr-src/schedule-grid-extraction-client.mjs";const width=1200,height=1200,data=new Uint8ClampedArray(width*height*4).fill(255);for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x%12===0||y%12===0){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=0;}let calls=0;recognizePageWords({width,height,data},{clearImage(){},loadImage(){},setVariable(){},getTextBoxes(){calls++;return []}},150);console.log({pixels:width*height,recognitionCalls:calls});'
```

**F3 — high — Incorrect scan rows feed unqualified totals and unmarked hardware/fire fields.**

- Location: `G:1386–1390`; `weyland-subx-worker/assets/client-ocr-src/schedule-workspace.mjs:38–61`; `W:40–53,351–360`; `weyland-subx-worker/src/pages/subx-app.html:2073–2082,2142–2155`.
- Reach: read the shipped scanned bidset's page 3 through the browser path. The committed measurement returns **47 rows / 46 unique expected marks**, missing **111 and 211**, with **214 duplicated**. One 214 has hardware group 02/fire 90 MIN where the expected 214 is group 05/unrated; 302 is read as Q3 instead of 03.
- Break: the new reader overwrites all door field confidences with 0.85; saved-row warnings only flag confidence below 0.8. Guest warnings ignore confidence altogether. Replaying this result through `guestDetail` produced **Doors=47**, **Sizes read=43/47**, and **43 entirely unflagged rows**, including both 214s and 302. The guest By-size tally also includes four rows whose dimensions failed parsing, despite the UI saying unread sizes are excluded. Duplicate marks overwrite on same-page persistence (`hardware-extraction-vision-dispatch.js:1218–1253`).
- The row table does say “machine-read: check them”; the stat tiles have no OCR uncertainty/completeness qualifier. This is an incorrect, unqualified takeoff, not a claim that the UI literally prints “exact.”
- Evidence: `tools/accuracy/g019-browser.json:4` is `pass:false`; its two asset SHA-256s exactly match HEAD. Score: 46/48 expected rows, 1 extra occurrence, 308/322 scored fields correct. Node/Poppler's 48/48 does not establish browser parity.
- Executed, read-only reproduction (prints the bad clean rows and totals):

```sh
node --input-type=module -e 'import fs from "node:fs";import {guestDetail} from "./weyland-subx-worker/assets/client-ocr-src/schedule-workspace.mjs";const r=JSON.parse(fs.readFileSync("tools/accuracy/g019-browser.json"));const s=r.variants.find(v=>v.variant==="scanned");const d=guestDetail({name:"scan.pdf"},"scan",6,[{page:3,extraction:s.result}]);console.log(JSON.stringify({pass:r.pass,score:s.score,takeoff:d.takeoff,badRows:d.doors.filter(d=>["214","302"].includes(d.mark)).map(d=>({mark:d.mark,group:d.hardware_group,fire:d.fire_rating,unsure:d.unsure}))},null,2));'
```

- Full existing failing browser check: `node tools/accuracy/scanned_sheet_browser.mjs` (requires complete fixtures/Chromium; writes its evidence JSON, so not rerun in this read-only review).

**F4 — medium — Existing sparse-vector routing can still invoke OCR.**

- Location: `weyland-subx-worker/src/routes/hardware-schedule-page-extract.js:369–379`; `weyland-subx-worker/src/lib/hardware-extraction-pipeline.js:451–460`; `G:1344–1379,1459–1463`.
- Reach: a vector notes/cover page with 15–59 readable words but no recognized schedule, selected explicitly or tried as page 1 when discovery finds nothing. The server's “no text” route actually accepts an empty text result with fewer than 60 words. On the client, `hasTextLayer` only skips the early scan pass; the subsequent grid/OCR fallback remains reachable even with text.
- Break: unnecessary OCR cost and exposure to F1/F2 on vector input. The new fallback at `G:1459` also invokes the scan pass when a grid exists but its header has fewer than three matches. This is not evidence that a successfully parsed vector schedule is rerouted.
- Executed reproduction below produces `{source:"text_layer",empty:true,words:30,readPagesRouteUsesBrowser:true}`. A separate canvas spy with these 30 vector text items reached the client's OCR render.

```sh
node --input-type=module -e 'import {createRequire} from "node:module";import {readPageFromTextLayer} from "./weyland-subx-worker/src/lib/text-layer-read.js";const require=createRequire(process.cwd()+"/weyland-subx-worker/package.json");const {PDFDocument}=require("pdf-lib");const d=await PDFDocument.create();const p=d.addPage([2592,1728]);for(let i=0;i<30;i++)p.drawText("GENERAL",{x:100,y:1600-i*20,size:12});const r=await readPageFromTextLayer(await d.save(),1,"door_schedule");const words=r.result.metadata.text_words;console.log({source:r.source,empty:r.empty,words,readPagesRouteUsesBrowser:!(r&&(!r.empty||words>=60))});'
```

**F5 — medium — The first-screen and structured-data promises exceed the measured product.**

- Location: `index.html:21,28,34,63,2050–2054,2072,2221`.
- Reach: any new desktop/mobile visitor, search consumer, or social preview sees “every door read and traced”; F3 demonstrates missing/duplicated rows in the shipped scan path. Desktop names the hardware section; the phone first screen omits that requirement. The next section still says full-size scanned sheets do not read at all, contradicting the landing's partial scan support.
- The JSON-LD Organization description and first-screen offer still promise “30 days of every product”; only the lower pricing list explains that PropX/HuntX join after audits pass. Structured-data consumers do not receive that qualification. JSON is syntactically valid; it is description text, not a separate schema.org Offer object.
- Reproduction: compare the quoted source lines with F3's read-only command and `rg -n 'every product|Every door|every door|scanned full-size|audits pass' index.html`. The lower-page qualification does not make the universal first-screen extraction claim true.

**F6 — low — All five seeds contain standalone UPDATE statements.**

- Locations: `tools/catalogue-seeds/2026-10-09-g021-1-rockwood.sql:24017`, `2026-10-09-g021-2-ngp.sql:4638`, `2026-10-09-g021-3-mckinney.sql:10738`, `2026-10-09-g021-4-hager.sql:62189`, `2026-10-09-g021-5-sargent.sql:14984` (all under the same directory).
- Reach/break: applying a seed can change an existing catalogue row's `index_built` from 0 to 1. These are exceptions to the requested insert/upsert-only review criterion; they are not destructive or unscoped updates. Each checks one literal catalogue ID and page-count equality. No customer-table write was found.
- Reproduction: `rg -n '^UPDATE' tools/catalogue-seeds/2026-10-09-g021-*.sql` returns exactly these five statements.

**Checked and found sound / boundaries**

- **Sample/paid separation:** the sole production assembler caller, `W:513–525`, constructs an allowlist of options and never forwards `body.sample`. The offline builder sets `sample:true,saveToR2:false` (`tools/samples/build-rockford-sample.mjs:80`). No HTTP path enabling that flag or paid-path SAMPLE labeling found. Assembly has no global sample state. Existing source PDFs may naturally contain user-supplied labels.
- **402:** `W:561–578` is unchanged in this range. Ownership is checked before download; unpaid non-demo output returns 402. Existing demo-clone exception is unchanged. Workspace tests exercised unpaid, paid, expired-access, and cross-account behavior.
- **Actual sample:** parsed the committed PDF with pdf-lib and the text reader: all five pages contain `SAMPLE - SCHEDULE ONLY - NOT FOR CONSTRUCTION` inside their crop boxes, including the negative-origin source appendix. Producer is `WeylandAI SubX (sovereign-pdf + pdf-lib)`.
- **Cleanup:** `hardware-cleanup.mjs:4–9` confines each child delete to parent hardware-set IDs selected by the supplied predicate. `journey-kit.mjs:116–147` restricts user/email inputs and verifies sessions; `:157,162,173` supply session/submittal/user predicates. Both key names are handled, with door/matrix exclusions. Executed SQLite probes for all three scopes preserved both other-user children; an input containing an apostrophe and `) OR 1=1 --` remained a literal. `q`/`inList` at `:72–73` escape apostrophes. This conclusion assumes the existing ownership relationships and trusted CLI caller; the helper itself is not an authorization API.
- **Seeds:** independently executed all five files against in-memory SQLite using their recorded schemas and FTS5. Top-level statements: 950 total = 940 INSERT OR IGNORE + 5 FTS INSERT SELECT + 5 scoped UPDATE. Targets: manufacturers, manufacturer_aliases, catalogues, catalogue_pages, products, product_documents, catalogue_pages_fts, catalog_corpus_wanted. Integrity check `ok`; second run changed zero rows. No DELETE, DROP, ALTER, external database attachment, or non-catalogue target.
- **OCR implementation:** source/served module twins match. Node harness calls production preprocessing/recognition with Poppler pixels; `reader_a.mjs:31–62` only maps fields. Expected rows are used for scoring, not fed into recognition. Browser check correctly fails its completeness bar; no false-green claim made here. Shared raster pixel cap works on the new pass alone, not the whole extraction pipeline.
- **Worker boundary:** normal text extraction remains in the Worker; shared OCR runs in a local or Cloudflare browser. Server input guard is 30 MB and multi-page requests cap at 20 pages. The older single-page path still falls back to `weyland-ocr-worker` after browser failure (`hardware-extraction-pipeline.js:465–480,517`); no claim of a universal Worker memory guarantee.
- **Boot splash:** `index.html:1880,1884,1899–1900,1997–2005` has pointer-events:none, independent CSS hiding after 1.05 s, a 1.2 s removal timer, and reduced-motion removal. A failed app init cannot by itself leave this overlay permanently masking the page. It is cosmetic, not a readiness/error indicator; a passing click hit-test alone proves no app health. No persistent failure-hiding regression found.
- **Third-party hosts:** direct script/style/image/iframe assets in index use same-origin or data URLs; OG/Twitter image metadata still names `mobleysoft.github.io` (`index.html:29,35`, pre-existing). `schema.org` is vocabulary, not an asset fetch. Loaded auth code can call `authfor.com`; the shell can load `js.stripe.com` for checkout (`assets/weyland-shell.js:86,1058`). No new third-party executable host introduced by these diffs. Live Cloudflare injection settings were not independently checked.
- **Other small landings:** inspected SightX input-layer fallback/version wiring, sign-in copy/mode, packet terminology, and shared journey assertions; no additional concrete regression established.

**Verification performed**

- **35 tests passed:** asset twins 1; workspace 7; DOM/sign-in/upload 6; journey assertions/cleanup 11; estimator fields/spec/packet 4; text-layer regression 6 (Rockford 65 doors and 110 hardware items; Berryessa annotations/locations).
- Runtime: `/opt/homebrew/bin/node` v26.3.0; DOM tests used `--experimental-vm-modules`. Default Node v20 initially failed VM/sqlite prerequisites. Sparse checkout omitted corpus fixtures and the sample builder; missing fixture reads were supplied from `git show HEAD:<path>` in memory, without materializing files. Those initial harness failures are not product findings.
- Additional executed checks: F1 allocation spy, F2 call-count probe, F3 replay/hash comparison, F4 generated-vector routing probe, three SQLite cleanup/injection probes, sample PDF label/crop inspection, complete seed execution/idempotency check.
- Not executed: fresh real-browser OCR, full Poppler scan test, live user journeys, production cleanup, deployed-Worker checks. Browser accuracy evidence is the committed, hash-matching measurement, not a new live run.
