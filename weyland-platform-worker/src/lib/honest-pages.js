// weyland-platform-worker/src/lib/honest-pages.js
//
// Pages taken over from the repo-root monolith on 2026-10-08 because what they
// said was not what the code does (product inventory of that day, checked live
// and against the source):
//
//   /whyweyland  -> 301 to /. The page presented made-up data as live: a
//                   "$142M+" pipeline of invented HuntX rows, "99.4% CONF"
//                   machine-vision takeoff zones (TakeoffX reads schedules,
//                   not drawings), catalogue citations with invented document
//                   ids, a MeetingX voice call between invented people, a
//                   "verified" $75,360.97 bid, "zero hallucinations". The
//                   homepage tells the same story with the real product.
//   /investors   -> the same page, each product described as it is today.
//   /propx       -> the same page without "live catalogue pricing ... margin
//                   protection": PropX takes the unit prices the user enters.
//   /drawx /leadx /inspecx /survx /specx /asbuiltx /pricex /marketx
//                -> "not on sale": these tools are not in the checkout
//                   (stripe-billing.js) but their pages still quoted a price
//                   and "TakeoffX Pro" / "HuntX Pro" / "SightX Pro" bundles
//                   that do not exist.
//
// The monolith still holds the old copies; Cloudflare routes in wrangler.toml
// (more specific than the monolith's catch-all) send these paths here.

import investorsPage from "../pages/investors-page.js";
import propxPage from "../pages/propx-page.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// What each tool was meant to do, and why it is not sold.
export const NOT_ON_SALE = {
  drawx: { name: "DrawX", what: "Build a sheet index from a drawing set: sheet numbers and titles read from the title blocks.", why: "Reading a full drawing set ran past the server's memory and time limits on real sets." },
  leadx: { name: "LeadX", what: "Turn public notices into a lead list for your trade.", why: "It is not built yet. HuntX lists the public bid notices today." },
  inspecx: { name: "InspecX", what: "Read inspection reports and list what failed and what to fix.", why: "The reader ran past the server's time limits on real reports." },
  survx: { name: "SurvX", what: "Read survey and site documents into a checklist.", why: "The reader ran past the server's time limits on real documents." },
  specx: { name: "SpecX", what: "Pull the sections that matter to your trade out of a project manual.", why: "The reader ran past the server's time limits on real project manuals." },
  asbuiltx: { name: "AsBuiltX", what: "Assemble as-built and closeout documents from the project record.", why: "The reader ran past the server's time limits on real document sets." },
  pricex: { name: "PriceX", what: "Track material price movement before you price a bid.", why: "The price index it was built on is gone, and the catalogue averages that replaced it are not yet trustworthy." },
  marketx: { name: "MarketX", what: "Market sizing for your trade and region.", why: "It is not built yet." },
};

export function notOnSalePage(key) {
  const t = NOT_ON_SALE[key];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0b0d13">
<title>${esc(t.name)} is not on sale | WeylandAI</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0b0d13; color: #e8eaf0; font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 640px; margin: 0 auto; padding: 72px 20px; }
  .tag { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #ffd400; }
  h1 { font-size: 32px; margin: 8px 0 16px; }
  p { color: #b9bfcc; }
  a { color: #8fb0ff; }
  .links a { display: inline-block; margin: 8px 16px 0 0; }
</style>
</head>
<body>
<main>
  <div class="tag">Not on sale</div>
  <h1>${esc(t.name)}</h1>
  <p>${esc(t.what)}</p>
  <p>${esc(t.name)} is not sold: ${esc(t.why)} When it works on real documents, it will be on the pricing page with its price.</p>
  <p class="links"><a href="/">What WeylandAI does today</a><a href="/pricing">Pricing</a></p>
</main>
</body>
</html>`;
}

const HTML = { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=300" };

/** The response for a path this module owns, or null. */
export function honestPage(pathname) {
  const clean = String(pathname || "").toLowerCase().replace(/^\/|\/$/g, "").replace(/\.html$/, "");
  if (clean === "whyweyland") return new Response(null, { status: 301, headers: { Location: "/", "Cache-Control": "public, max-age=3600" } });
  if (clean === "investors") return new Response(investorsPage, { headers: HTML });
  if (clean === "propx") return new Response(propxPage, { headers: HTML });
  if (NOT_ON_SALE[clean]) return new Response(notOnSalePage(clean), { headers: HTML });
  return null;
}
