# Plan-set corpus (real architectural drawings for the PDF-to-twin pipeline)

Started 2026-10-04 (John: "we search for open source architectural plan PDF"). Purpose: development and verification data for stage 1 to 9 of `docs/PDF_TO_TWIN_RULES.md`. Every file lists its source and the basis on which we hold a copy. Nothing here is redistributed as a product; the twin pipeline reads them locally.

| File | Source | Basis | What it has |
|---|---|---|---|
| `../door-schedules/f0e863d88ea688ff.pdf` (already in corpus) | Rockford Public Schools #205, Carlson Elementary additions and renovation, Larson and Darby Group, progress print 03/10/2026, bid set 30 pages | Public procurement record (school district bid documents) | Life-safety plan p.24 (1/16" = 1'-0"), floor plans p.25-27 (vector: ~54k path ops on p.25), door schedule + hardware sets p.3, 12, 29 |
| `grandview_chiefarchitect_sample.pdf` | https://cloud.chiefarchitect.com/1/samples/projects/grandview/grandview.pdf | Vendor-published sample construction-document set, publicly hosted for download | 19 pages, residential; floor plans p.4-5, 18-19 with scale strings, window schedule p.14 |
| `fayette_ga_2419_addendum1_plans.pdf` | https://fayettecountyga.gov/Documents/Departments/Purchasing/Bids/2024/2419-I-Addendum-1-Plans.pdf | Public procurement record (county purchasing portal) | See triage note below once downloaded |

Rejected: University of Florida Rinker Hall drawings (coremng.dcp.ufl.edu) carry an explicit no-reproduction statement; not copied.

Datasets considered for later stages (images or SVG, not construction PDFs): CubiCasa5K (5,000 annotated floor-plan images with SVG, github.com/CubiCasa/CubiCasa5k), ResPlan (17,000 vector residential plans, arXiv 2508.14006). Useful for wall/room segmentation benchmarks, not for door-schedule or hardware work.

Where to find more of the right kind: state and county purchasing portals that post full drawing sets as addenda (bidcondocs.delaware.gov, county purchasing pages), school district bid pages (thrillshare and finalsite hosted PDFs). Search pattern that worked: "issued for bid" OR "bid set" architectural drawings pdf "door schedule" "floor plan".

## Procurement additions - 2026-10-09

Machine-readable provenance and rendered-page triage for new files: [manifest.json](manifest.json). This dated acquisition admits public procurement records only and excludes PDFs with reproduction restrictions; it does not change the legacy entries above.

| File | Source | Basis | What it has |
|---|---|---|---|
| [fb77f58b8f8faae8.pdf](fb77f58b8f8faae8.pdf) | [Montgomery County EMS Station 28, Addendum 3](https://montgomerytn.gov/storage/departments/purchasing/BID/2025-12-01%20Montgomery%20County%20EMS%20Station%2028%20-%20Addendum%20No_%2003.pdf) | Public procurement record; all 10 pages visually screened, no explicit reproduction restriction found | Partial replacement set only. Electrical power floor plan E2.0 p.7 (page index 6), 34 x 22 inch drawing sheets, text layer. 08 71 00 amendments pp.1-2, no hardware groups or door schedule. |

The requested complete Delaware sets could not be admitted: unavailable drawing URLs and restrictive project manuals. See [dated additions and blockers](../README-additions-2026-10-09.md) and [acquisition log](../acquisition-2026-10-09.json).
