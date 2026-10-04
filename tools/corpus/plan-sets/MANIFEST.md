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
