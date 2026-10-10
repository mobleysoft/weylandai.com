# g063: the firm's second project on production (T2507-01, 49 doors)

Goal (Mobley, 2026-10-10 03:52 EDT): on production, as Mobley Contracting (jmobleyworks+mobleycontracting@gmail.com, code sign-in from its inbox), T2507-01 is read, packeted and recorded as the firm's second project:
- 49 of 49 rows, with sources;
- the two 132A openings shown as sharing a tag;
- the packet built, shown and downloaded;
- the card still On account, with the credit at 0 of 1;
- both projects listed;
- nothing deleted.

The journey is `tools/user-simulation/journeys/first-customer.mjs`, run against https://weylandai.com on 2026-10-10 between 07:53 and 08:05 UTC. Its new pieces:
- a `signin` stage;
- `SHARED_MARK` checks in the project stage;
- `EXPECT_CARD` and `EXPECT_PROJECTS` in the record stage.

The container has no GPU, so the browser renders with software WebGL; the reports say so. Reports are in [reports/](reports/), screenshots in [shots/](shots/).

## Upload

T2507-01 (192a16af8f31ae0c, the whole 30-page set, 9.8 MB) was uploaded as the firm's second project, "T2507 (second project)", on 2026-10-10 at 03:23 UTC during g052 ([g052 report 3](../g052/reports/3-project-T2507.json)). That was before the first submittal was bought:
- the finder named page 10, sheet A-103;
- 49 of 49 rows were read;
- the packet was built but gated.

This run reopens that project instead of uploading the same set a second time, so the firm's record holds one T2507 project.

## Stages run here

| Stage | Result | Checks |
|---|---|---|
| sign-in | A new code was read from the firm's inbox (sent 07:53:47 UTC). Signed in as the firm. | [1-signin.json](reports/1-signin.json): **5 of 5** |
| project | T2507 reopened: 49 of 49 rows, each citing its page and row. Both 132A rows kept, at p.10 rows 36 and 37. Packet built (5 pages: cover, contents, door schedule of 49 doors, the uploaded A-103 sheet), shown in the page (5 pages drawn) and downloaded. | [2-project-T2507.json](reports/2-project-T2507.json): **10 of 11** |
| record | The account card says "On account Oct 10, 2026 · $100 invoiced · 0 of 1 packet left to build". SubX lists "R2502 Missouri Hope (first project)" and "T2507 (second project)". Screenshots in [shots/](shots/). | [3-record.json](reports/3-record.json): **5 of 5** |

The packet is [T2507_second_project_submittal.pdf](T2507_second_project_submittal.pdf): "PREPARED BY: Mobley Contracting", 49 doors.

The credit already read 0 of 1 at this run's sign-in, before T2507 was built. Building T2507 did not change it: the count stops at the one credit bought. The second packet falls inside the 30 days of every product, which is the offer's rule (g056).

## What production showed wrong, fixed in this PR (SubX)

1. **The two 132A rows are not shown as sharing a tag.** This is the one failed check.
   - Production marks both rows with "Duplicate mark 132A on page 10 (2 rows); verify each occurrence.", and also repeats a remark saved at read time ("Duplicate mark 132A on page 10; verify each occurrence").
   - So each row says the same thing twice, and only as a possible error, while the plan A-100 tags 132A twice: two openings sharing one tag.
   - Now the note reads "Duplicate mark 132A on page 10 (2 rows): two openings sharing one tag, or a misprint; verify each occurrence." (`assets/client-ocr-src/schedule-workspace.mjs` and its served `.bin`).
   - The door table no longer repeats the older saved remark when this note is shown (`src/pages/subx-app.html`).
2. **The packet printed the workspace's internal key.**
   - The second row came out as "132A [ro…" in the packet: `generateDoorSchedulePages` printed `d.mark`, and the workspace keys a second same-mark row as "132A [row.2]".
   - Now the packet and the door table print the mark as the sheet does (`printedMark` in `src/lib/submittal-assembler.js`). The Source column already says which row it is.

Tests:
- `test/scanned-sheet-review.test.mjs`: "a mark on two rows reads as two openings sharing one tag, or a misprint".
- `test/estimator-defects.test.mjs`: "g063: the packet prints a shared mark as the sheet does (132A twice), not the workspace key "132A [row.2]"". Both 132A rows print, nothing prints "[row", and both p.10 rows 36 and 37 appear.

SubX passes 207 of 208; the one failure is the renderer-bound generated-mark-scan test. Estimator assertions pass 11 of 11.

**After the SubX deploy:** the project stage with `SHARED_MARK=132A` checks the new wording. A rebuild prints both rows as 132A. The record stage stays as above.
