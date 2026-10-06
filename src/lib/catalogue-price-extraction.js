// The dedicated CutSheetX worker owns catalogue extraction. Share the same
// implementation so fixes and regression checks apply to both entry points.
export * from "../../weyland-cutsheetx-worker/src/lib/catalogue-price-extraction.js";
