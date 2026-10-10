# Public bid-document harvester

Requires Node 20+; no npm dependencies. Check Poppler with `which pdfinfo pdftotext pdftoppm`. Missing pdfinfo leaves page counts unknown; missing text/render tools are recorded as triage errors. No OCR fallback or dependency installation is attempted.

From the repository root, run sequentially:

    node tools/corpus/harvest/harvest.mjs
    node tools/corpus/harvest/triage.mjs
    node tools/corpus/harvest/report.mjs

All writes stay in this directory. sources.json preserves the supplied seed list and adds the OA and UM PDC enumerators. Standards listed as not-bid sets are next-target references only. Low-priority public seeds are included. Index pages in the seed file are also checked for exposed PDFs. There is no naming-guess crawl, credential use, JavaScript execution or login/registration bypass.

The UA is WeylandAI-corpus/1.0 (+https://weylandai.com). Each host is paced at least two seconds between request starts, including robots, redirects and retries. Each request has a 60-second timeout and one retry for network failures or HTTP 429/5xx. Robots is fetched per origin; User-agent * Disallow rules are enforced, conservatively without Allow overrides. Missing robots (404/410) permits requests; inaccessible/redirected robots fails closed. Delaware /_Drawings is always prohibited. Redirect destinations receive their own robots check. The round is serial.

Files are limited to 150,000,000 bytes (150 MB), and the round to 3,000,000,000 bytes (3 GB) of document/HTML transfer budget, including duplicates and retry bodies. Content-Length is checked before reading and streams are bounded (a final incoming chunk can cross the cap before cancellation; it is discarded and recorded separately). Robots bodies have a separate 2 MiB cap. Over-cap files are not saved; when the next file cannot fit the remaining round budget, new document requests stop and the queue left is recorded. PDF signature is required within the first 1024 bytes; mislabeled PDF responses are rejected.

The first round was interrupted to tighten the original binary limits to decimal limits before either decimal limit was reached. It resumed with `node tools/corpus/harvest/harvest.mjs --resume`, preserving hashes, processed URLs, robots findings and spent budget. An entire original per-file allowance was reserved for the interrupted transfer's unknown byte count; the listing was re-read to reconstruct unprocessed URLs. round.json preserves the original limits and resume event. Use resume only for an unfinished round. Normal re-runs create a new budget.

SHA256 deduplication reads door-schedules/manifest.json, plan-sets/manifest.json, acquisition-2026-10-09.json, hashes PDFs and reads text metadata recursively in specs/, and reads this harvester's previous records. All existing corpus paths are read-only. Local files are downloads/<first 16 hex>.pdf. Downloads and previews are ignored by git; never republish them. Manifests, sources, triage, reports and scripts belong in git; this task does not commit.

manifest.jsonl is append-only, one row per processed URL, plus robots checks and excluded OA bid tabs. Network retries are part of the same URL attempt. Fields: sha256 (nullable), url, host, family, retrieved_at (UTC from the date command), bytes, pages (nullable), http_status (nullable), outcome (downloaded/enumerated/robots/skipped), reason for skipped and enumeration rows; downloaded rows also have filename and final_url. round.json tracks robots findings, caps, queued URLs, received/saved bytes, blockers and next targets. Re-running starts a new round budget and skips prior hashes; report counts are cumulative across the append-only manifest.

Triage counts pages with pdfinfo; runs pdftotext -layout page by page; checks all pages up to 200 and otherwise first 60, last 20 and every tenth page between. Records use zero-based page indexes and one-based page numbers. Pages with no extracted text are labeled scanned (blank/vector-only pages can also qualify). Weighted markers include door/opening schedules and A6xx/A8xx/A9xx, hardware section numbers and set/group headings, floor plans and A1xx, and door-mark/size/type/hardware row patterns. Weights: schedule phrases 5, architectural IDs 1, hardware numbers/headings 3–4, floor-plan phrase 5, row shapes up to 10 per page. All raw marker hits and their scores remain in the record.

Qualification excludes contents/drawing indexes, RFI lists and replace-drawing narratives, and rejects AIA form IDs as floor-plan evidence. Schedule content requires at least two matching rows or a standalone schedule heading with at least three column-header markers. Hardware content requires a hardware-section heading/footer with section body or hardware items, or a numbered set/group heading with hardware items. Plan content requires a standalone FLOOR PLAN heading on a large sheet (over 1,000 points on either side) or wide scale/north-bearing layout evidence. Weak sheet IDs remain recorded but alone do not qualify content. Dimensions are checked with pdfinfo on candidate pages. qualification.mjs performs the final reference/row-shape pass automatically at the end of triage.mjs; it can also be run separately to refine existing records. These checks are heuristic and can miss sparse/scanned content. none can include valid site/grading/roof and other plans beyond the requested floor-plan criteria.

Classification uses qualified_page_indexes: complete (schedule+hardware+plan), pair (schedule+hardware), schedule-only, spec-only, plan-only, none. Floor-plan locations in the first quarter are recorded. Best qualified schedule and first qualified floor-plan pages render at 110 dpi via pdftoppm -f N -l N -r 110 -png into previews/. Inspect the previews before treating a candidate as validated.

REPORT-2026-10-09.md includes family/class counts, complete candidates and previews, all skips, robots findings, blockers, unprocessed queue and noticed next targets. Inspect previews by eye before treating candidate sets as validated test cases.

Verification after triage: run `node tools/corpus/harvest/check-row-shapes.mjs` and `node tools/corpus/harvest/verify.mjs`. The latter writes verification.json and checks hashes, decimal limits, signatures, source coverage, triage coverage, sampling bounds and preview existence. Re-run report.mjs after verification to include its result.

## Round 3 (2026-10-09)

This section supersedes the round 2 triage and cap descriptions above. The original 459-set baseline and SHA256 keys are preserved in round3-baseline.json; round2.json preserves the prior cap state and remaining queue. Round 3 uses 1,000,000,000 additional transfer bytes and the same 150,000,000-byte per-file limit. Known downloaded URLs and final URLs are not fetched again. Use harvest.mjs --round3 only once; it refuses to reset a started round 3 budget.

Run in order: triage.mjs, verify.mjs, report.mjs, sightx.mjs, harvest.mjs --round3, triage.mjs --new-only, sightx.mjs, verify.mjs, report.mjs. All commands are local Node scripts in this directory. The final report appends/replaces the Round 3 re-triage section while retaining the historical round 2 report. Nothing is committed or republished.

Plan classification now keeps floor_plan_architectural and plan_other separately on each examined page and each set. Architectural titles include FLOOR PLAN, LEVEL n PLAN and OVERALL PLAN; architectural title-block IDs include A1xx, A-1xx, A1.xx and AD1xx. An ID on a roof/MEP/ceiling sheet or an architectural drawing reference on a detail sheet does not establish architectural floor-plan content. Other plans include site, grading, roof, ceiling, phasing, MEP, joint, campground layout and civil/structural layouts. content_evidence retains qualifying titles, title-block text and sheet IDs. Complete requires architectural plan + schedule + hardware. Plan-only can contain either plan type.

Sets over 200 pages use first 60, last 20 and every fifth intervening page. Text is extracted once with pdftotext -layout, with verified form-feed page counts; a mismatched page count is an extraction blocker, never a silently shifted page index. No PDF repair or OCR is attempted. raster_only means pdffonts listed zero fonts; it is not proof of raster geometry. vector_text means usable extracted text on examined pages. Unsampled pages remain unclassified.

sightx_candidates.json includes every architectural candidate and the review's top five for explicit confirmation/correction. Indexes are zero-based; first quarter means index < pages/4. Door tag evidence is conservative short layout cells away from the lower title block, with schedule-row matches identified separately. Room numbers and drawing references can resemble door marks. Representative visual findings are in visual-review-round3.json; the R2405-01 visual review in visual-review.json is preserved.

The PDC enumerator follows exposed project.php links and public plans/sealed/ad.pdf/pb.pdf links, plus the canonical project.php route for CP IDs actually found in fetched HTML. It follows exposed adsite HTML/PHP listing links (previously only root/index paths were recognized). It does not guess directory contents. Public HTML observations and exposed links are recorded in round.json; robots/access failures remain blockers, without alternate transports or credentials.

Validation: check-row-shapes.mjs and check-plans.mjs cover schedule shapes and architectural/other boundaries. verify.mjs checks all PDF hashes, baseline preservation, exact page sampling (or an explicit extraction blocker), page/set flags, evidence indexes, complete-class semantics, previews and transfer accounting. The extraction blocker list must be read alongside its integrity outcome.

Round 3 visual QA also found that numbered windows on an elevation could match the old numeric row regex. Schedule rows now require a material/hardware token, and row-based qualification also requires table-header evidence. Type-before-size schedule rows are separately parsed for tag matching. The --schedule-check option of qualification.mjs refreshes these row matches and affected schedule previews. Run sightx.mjs again after that pass.

Live PDC discovery: the supplied UM System URL redirects to a new construction-bids page that exposes https://operations-webapps.missouri.edu/pdc/adsite/ad.php, rather than CP project links directly. The enumerator now recognizes this published host/path. Both operations-webapps.missouri.edu and pdc-projects.missouri.edu fail the robots request with UNABLE_TO_GET_ISSUER_CERT_LOCALLY in this session. TLS validation is retained and no page/PDF fetch is attempted on either host. pdc-robots-round3.json preserves the additional robots observation; merge-pdc-observation.mjs merges it only after the serial harvester finishes, avoiding concurrent state writes.

## Round N (g069, 2026-10-10)

harvest.mjs takes `--round N --cap-bytes B --from-remaining --dry-run`. `--round3` is `--round 3` and behaves as before: its queue comes from the OA/PDC enumerators plus round2.json's work left, and it refuses a resume or a started round 3. A round from 4 up needs `--from-remaining`. It takes round N-1's work-left queue (round.json `remaining`) and keeps only Missouri OA plans, specs, bid documents and addenda. Bid tabs, IFBs and URLs already downloaded are dropped.

On a real run, round N-1's finished state is first preserved as round<N-1>.json, and the round reads its queue from that file. Round N refuses to start in three cases: round N-1 has not finished, the prior state is not round N-1, or round.json already says round N. `--cap-bytes` sets the round's transfer budget in bytes. A numbered round defaults to 1,000,000,000 bytes; the plain run keeps 3,000,000,000.

These are unchanged from round 3:
- the per-file cap (150,000,000 bytes);
- the robots rules and two-second host pacing;
- the append-only manifest rows;
- round.json state, with `round_number`, `from_remaining` and `remaining` at the cap.

`--dry-run` prints the queue, one file per line with a closing count line, then exits. It sends no request and writes no file.

Round 4, from the repository root:

    node tools/corpus/harvest/harvest.mjs --round 4 --cap-bytes 1000000000 --from-remaining --dry-run
    node tools/corpus/harvest/harvest.mjs --round 4 --cap-bytes 1000000000 --from-remaining

Then run triage.mjs --new-only, sightx.mjs, verify.mjs and report.mjs as after round 3. The tests are `node --test tools/corpus/harvest/round-plan.test.mjs`, run over a fake queue and a local HTTP server. g069/ holds the round 4 dry run against round 3's state.
