# g068: SightX sheet view (reworked by g074)

The g068 sheet view first shipped 100 dpi images of three harvested Missouri sets' plan sheets. g074 removed them: harvested sets are local review copies and are not published. The sheet view now shows the WeylandAI Building, our own sample set, and the customer's own SubX upload (WALK IT). Both are drawn in the browser by the self-hosted pdf.js.

- build-sheets.mjs builds only sets we authored (today the Building, 4847b09e633103f7).
- sheets-summary.json is its output.
- Evidence and journeys: tools/accuracy/g074/README.md.
