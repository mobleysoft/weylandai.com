# Claim Check: WeylandAI Front Door (2026-10-09)

## 1 & 2. Claims extracted from the front door and sample packet, with verdicts

| Claim (quoted from text) | Verdict | Evidence |
| :--- | :--- | :--- |
| **Hero (desktop & phone)** | | |
| "Door schedule in. Submittal packet out. $100." | TRUE | `docs/direction-2026-10-08.md` (the offer terms; verified state 65/65); `tools/user-simulation/roles/editor-2026-10-09.md` (Editor confirmed packet output and price). |
| "Upload your door schedule and hardware section (08 71 00): every door read and traced to its row, free; the packet is $100 for your first submittal, no automatic charge." | TRUE | `docs/cloud-status.md` (SubX PASS, 36 of 37 cited); `editor-2026-10-09.md` (confirmed no charge to read/trace). |
| "Every door read and traced to its row, free." | TRUE | `editor-2026-10-09.md` (Estimator section 2 confirmed tracing). |
| "First packet: $100. No automatic charge." | TRUE | `docs/direction-2026-10-08.md` (John's terms: "no automatic charge ever"). |
| "Includes 30 days of every product." | TRUE | `docs/direction-2026-10-08.md` (John's terms: "with 30 days of every product"). |
| **Offer Section** | | |
| "$100 · your first submittal + 30 days of every product · no automatic charge" | TRUE | `docs/direction-2026-10-08.md` (John's offer terms). |
| "One submittal packet: upload the door schedule and the hardware section (08 71 00); SubX reads them, lists the doors and hardware groups with the page and row each came from, and builds the PDF; items our catalogue covers get their cited document." | TRUE | `docs/cloud-status.md` (SubX PASS, traced 65/65 doors, 14/14 groups, PDF built, 36/37 cited). |
| "On a real bid set (Rockford, sheet A2.2) it read 65 of 65 doors and traced each to its row." | TRUE | `docs/cloud-status.md` (Verified state: Rockford A2.2 65 of 65, 100%). |
| "A scanned full-size schedule sheet does not read yet." | TRUE | `docs/cloud-status.md` (The generator section explicitly notes the scanned schedule sheet does not read yet). |
| "30 days of every product: SubX, TakeOffX, CutsheetX, SightX, PropX, MeetingX and HuntX." | OVERCLAIM | `docs/cloud-status.md` (Audit table marks `PropX` as `PENDING_PROPX` and `HuntX` as `PENDING_HUNTX`. By John's rule, tools stay NOT SOLD YET until they pass the audit document). |
| "One payment. Nothing renews: before the 30 days end we ask you to choose a plan. Without one, the paid tools pause and your account and work stay." | TRUE | `docs/direction-2026-10-08.md` (Matches John's terms perfectly: prompt to choose a plan at day 23, account kept). |
| **Sample Packet Cover** | | |
| "65 doors read and traced to their source rows." | TRUE | `docs/cloud-status.md` (Verified state: Rockford A2.2 65 of 65). |
| "This public sample was assembled from the verified door-list export and its uploaded sheet. It illustrates the schedule portion of a packet; it is not an approved hardware submittal." | TRUE | It accurately describes its own provenance. |
| "To include the hardware sets and their cut sheets, upload Section 08 71 00 as well. No hardware items have been inferred from the set references on this door schedule." | TRUE | `docs/cloud-status.md` (Hardware items require the 08 71 00 section). |
| "Source: the Rockford A2.2 reading recorded on 2026-10-09." | TRUE | Refers to the internal reading state. |

## 3. Sample Packet Origin and Honesty
The sample packet (`assets/samples/rockford-schedule-packet.pdf`) is an **assembled illustration**, not the product's direct raw output. The metadata shows it was generated using the open-source `ReportLab PDF Library`. The cover text plainly admits this: "This public sample was assembled from the verified door-list export... it illustrates the schedule portion". The front door's wording is honest: it refers to it specifically as a "sample packet" and a "schedule-only sample".

## 4. Terminology Consistency
There is an inconsistency in terminology:
- **Hardware group vs. Hardware set**: The front door (`index.html`) repeatedly uses "hardware groups" (lines 2072, 2136, 2147, 2173, 2220), whereas the sample packet cover explicitly uses "hardware sets" and "set references". The Editor's brief also stated that "hardware sets" is the term that should be used across the site.
- **Packet vs. Submittal**: The front door uses "submittal packet", "first submittal", and "submittal PDF". The sample packet uses "Door schedule packet" and "hardware submittal". While slightly varied, these are semantically interchangeable in the context.

## Required Fixes (Priority Order)
1. **Remove or label un-audited tools**: `PropX` and `HuntX` must be removed from the "30 days of every product" list in the offer section, or explicitly labelled as "NOT SOLD YET", because they are marked `PENDING` in `docs/cloud-status.md`. (John's rule: tools stay NOT SOLD YET until they pass the audit documents).
2. **Correct terminology**: Replace all instances of "hardware groups" and "hardware group" in `index.html` with "hardware sets" and "hardware set" to ensure consistency with the sample packet and the Editor's instructions.

## Summary
The front door of WeylandAI is highly honest and aligns almost perfectly with the strict boundaries of the product's capabilities. Claims about pricing, absence of automatic charges, and reading exact numbers (65 of 65 doors on Rockford A2.2) are fully backed by the internal documentation and tests. The sample packet clearly identifies itself as an illustration, preventing any deception. The only overclaim involves the inclusion of PropX and HuntX in the 30-day offer, as these tools have not yet passed their required audit documents (`PENDING` in `cloud-status.md`), violating John's rule that un-audited tools must not be sold. A minor inconsistency remains where `index.html` uses "hardware groups" while the sample packet and copy brief use "hardware sets".
