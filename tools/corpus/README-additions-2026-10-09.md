# Corpus additions - 2026-10-09

Added seven public procurement PDFs (8,921,011 bytes), fetched by sequential GET with declared User-Agent WeylandAI-CorpusReview/1.0 (public procurement research), one-second spacing and a 60,000,000-byte cap. Source URLs, SHA-256, exact bytes and UTC fetch times from date -u are in the manifests. Files are named with the first 16 SHA-256 characters.

Every retained page was rendered with Poppler pdftoppm and visually screened. Target pages were read from PNGs; extracted text only located candidates and checked text-layer presence. Manifest page_number is a 1-based PDF ordinal; page_index is zero-based. Sheet IDs are printed drawing numbers. Page-box dimensions and rotation are recorded separately.

| Added file | Owner / project | Useful for |
|---|---|---|
| [specs/05d675e35802017e.pdf](specs/05d675e35802017e.pdf) | Orchard View Public Schools, Early Elementary Secured Vestibule | Reading eight 08 71 00 hardware groups on pp.22-29; matching door IDs to groups and item lists. Letter-size text PDF; no architectural schedule or plans. |
| [specs/4743b24c01862b5f.pdf](specs/4743b24c01862b5f.pdf) | Worcester Public Schools, 8369-M5 replacement Phase II | Hardware specification reading and a negative page-discovery example: p.15 references separate hardware sets and floor plans that are absent here. Letter-size text PDF. |
| [specs/89ce8170e64b6508.pdf](specs/89ce8170e64b6508.pdf) | Oakton College, exterior door renovations, Addendum 1 | 08 71 00 prose pp.6-17; floor-plan reading and access-control matching on AT102/AT113/AT312/AT321, pp.18-21. No numbered groups or door schedule. Text PDF; letter pages plus rotated 30 x 42 inch drawing boxes. |
| [door-schedules/7586a61c5ac75707.pdf](door-schedules/7586a61c5ac75707.pdf) | Connor Consolidated School, project 3403, Addendum 2 Rebid | Door schedule reading on A601 p.3; matching its door marks to enlarged entry plan A401 p.2. Hardware-set references are present, groups are absent. Text PDF; letter cover and 36 x 24 inch sheets. |
| [specs/df0b49aceba52a7e.pdf](specs/df0b49aceba52a7e.pdf) | Noble County Highway Department renovation | 08 71 00 reading and door-to-set matching, sets 001-006 pp.8-10; item lists pp.9-10. Letter-size text PDF; no architectural schedule or plan. |
| [plan-sets/fb77f58b8f8faae8.pdf](plan-sets/fb77f58b8f8faae8.pdf) | Montgomery County EMS Station 28, Addendum 3 | Floor-plan reading on electrical power plan E2.0 p.7; rooms, walls and doors visible. Partial replacement set, no door schedule or hardware groups. Text PDF; letter narrative and 34 x 22 inch sheets. |
| [specs/636c4b0e68b8036d.pdf](specs/636c4b0e68b8036d.pdf) | Schenectady County Jail Kitchen Door Replacement, Addendum 3 | Scanned OCR and mixed-page routing: text cover p.1, raster handwritten attendance sheet p.2 without text layer. No schedule, hardware groups or floor plan. Letter boxes; p.2 rotated 90 degrees. |

No reproduction prohibition was found in the retained PDFs. Orchard View and Oakton have ordinary copyright reservations; public procurement availability does not imply a redistribution license.

## Exclusions and blockers

All 15 supplied URLs were attempted. Palm Beach Schools, Sacramento City USD, and both Clovis USD links returned HTTP 404. Williamson County p.4 (A9.2), Perry County District Library p.21 (E-101), and Sedgwick County p.62 (G10.1) have explicit reproduction/duplication restrictions and were excluded in full. The library restriction was visible in a PNG despite not appearing in the reproduction-keyword search. Red Clay RCCD2539 was conservatively excluded because p.47 limits reproduction authorization to contract work.

Complete Delaware sets remain blocked: the directory index returned 403; closed public solicitation pages did not expose drawing attachments; the logged drawings/plans filename attempts returned 404. Heritage Elementary's downloaded manual has explicit copying/reproduction restrictions (p.66) and an embedded AIA reproduction warning (p.124). Battery 519's manual was conservatively excluded for its contract-work-only reproduction authorization (p.123). Neither is retained. No complete pair was added; partial addenda above must not be treated as complete bid sets.

[acquisition-2026-10-09.json](acquisition-2026-10-09.json) records each attempted URL, UTC timestamp, HTTP result, rejection or retained path. Structured triage is in door-schedules/manifest.json, specs/manifest.json and plan-sets/manifest.json. No restricted PDFs or temporary renders are committed. Changes are confined to tools/corpus. Commit attempt was blocked; no push was attempted.

## Commit blocker

The filesystem sandbox makes .git read-only. git add failed creating .git/index.lock with Operation not permitted; no commits were created. The Mac session must make the small commits below. Use git commit --only with the same explicit paths after staging so unrelated staged work is excluded. Do not push from this session.

1. Hardware specs: specs/manifest.json and its five listed PDFs.
2. Schedule: door-schedules/manifest.json and door-schedules/7586a61c5ac75707.pdf.
3. Plan addendum: plan-sets/manifest.json, plan-sets/MANIFEST.md and plan-sets/fb77f58b8f8faae8.pdf.
4. Audit: README-additions-2026-10-09.md and acquisition-2026-10-09.json.

Prefix every path with tools/corpus/. Leave the pre-existing untracked field-reports directory untouched.
