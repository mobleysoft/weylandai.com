// weyland-huntx-worker/src/pages/huntx-nav.js
//
// HuntX page nav (no imports, so node --test can load it without a
// Wrangler text-module loader). The core products link to the paths the
// single-page shell knows (assets/weyland-shell.js APPS), so inside the
// overlay and on the standalone page (which loads the same shell) they open
// in place instead of replacing the page. Inside the overlay (?embed=1)
// only the core products are listed; the marketing pages stay on the
// standalone page.

export var ROUTE_LABELS = {
  onboarding: "ONBOARDING",
  huntx: "HUNTX",
  takeoffx: "TAKEOFFX",
  subx: "SUBX",
  cutsheetx: "CUTSHEETX",
  propx: "PROPX",
  sightx: "SIGHTX",
  meetingx: "MEETX",
  qtext: "QTEXT",
  whyweyland: "WHY WEYLAND",
  investors: "INVESTORS",
  venturedeck: "VENTURE DECK",
  lienx: "LIENX",
  bidx: "BIDX",
  coa: "COA",
  rfax: "RFAX",
  changeordx: "CHANGEORDX",
  permitx: "PERMITX",
  closex: "CLOSEX",
  notesx: "NOTESX",
  inspecx: "INSPECX",
  safetyx: "SAFETYX",
  survx: "SURVX",
  specx: "SPECX",
  drawx: "DRAWX",
  asbuiltx: "ASBUILTX",
  leadx: "LEADX",
  careers: "CAREERS"
};

// Product keys whose real app lives at a path the shell opens in place.
var APP_PATHS = {
  takeoffx: "/takeoffx",
  subx: "/subx-app",
  cutsheetx: "/cutsheetx",
  propx: "/propx-app",
  sightx: "/sightx",
  meetingx: "/meetingx"
};

export function renderNav(current, embedded) {
  var links = "";
  for (var key in ROUTE_LABELS) {
    if (key === current) continue;
    if (embedded && !APP_PATHS[key]) continue;
    var href = APP_PATHS[key] || "/" + key + "/";
    links += "<a href=\"" + href + "\">" + ROUTE_LABELS[key] + "</a>";
  }
  if (embedded) links += "<a href=\"/pricing\">PRICING</a>";
  return links;
}

export function fillHuntxPage(html, embedded) {
  return html.replace("<!--HUNTX_NAV-->", renderNav("huntx", embedded));
}
