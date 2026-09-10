// gateway/src/route-table.js
//
// Declarative "which path prefix goes to which Service Binding" table.
// Built this way from module #2 of the gateway (not module #1) on
// purpose: hardcoding this as growing if/else in index.js would recreate,
// inside the gateway itself, the exact "one file accumulates everything"
// problem the whole migration exists to fix. Every module peeled out of
// the monolith adds one real entry here, nothing else in this file
// changes shape.
//
// A path matches an entry if it starts with one of `prefixes`. First
// match wins - keep prefixes specific enough that this doesn't matter
// in practice (no two entries currently share a prefix).

export const ROUTE_TABLE = [
  {
    binding: "DOCUMENT_GENERATORS",
    prefixes: [
      "/api/asbuilt-diffs/",
      "/api/bid-packages/",
      "/api/change-orders/",
      "/api/closeout-packages/",
      "/api/coa-packages/",
      "/api/drawing-index/",
      "/api/inspections/",
      "/api/lien-waivers/",
      "/api/meeting-notes/",
      "/api/permit-packages/",
      "/api/proposals/",
      "/api/rfas/",
      "/api/safety-reports/",
      "/api/spec-sections/",
      "/api/survey-reports/",
    ],
  },
];

/** Returns the binding name to route `pathname` to, or null for the ORIGIN fallback. */
export function resolveBinding(pathname) {
  for (const entry of ROUTE_TABLE) {
    if (entry.prefixes.some((p) => pathname.startsWith(p))) {
      return entry.binding;
    }
  }
  return null;
}
