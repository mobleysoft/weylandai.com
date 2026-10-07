// weyland-cutsheetx-worker/src/routes/find.js
//
// The free, public cut-sheet finder (plan/weylandai.md, phase 1 move 3).
// A spec writer types a manufacturer and model and gets the catalogued
// product, its price-book citation or the catalogue page that names it, and
// a way to open the page. Every product has its own indexable URL
// (/find/<manufacturer-slug>/<model>) and a sitemap, so the weekly "<model>
// cut sheet" searches land on us; SubX is one click behind.
//
// Everything is read from our own store (products_fts, product_documents,
// catalogue_pages_fts) - no call leaves the conglomerate. The PDF routes stay
// behind the existing ephemeral-token gate; the page mints a token on click,
// so no document is served anonymously and no accounts are needed.

import { jsonResponse3 } from "../lib/json-response.js";
import { kvRateLimit } from "../lib/cut-sheet-misses.js";
import { getCutSheetsForProduct, cutSheetCitation, getCataloguePagesForModel } from "../lib/product-database.js";

const SITE = "https://weylandai.com";

function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function ftsQuery(q) {
  const cleaned = String(q || "").replace(/[-]/g, " ").replace(/[^\w\s*]/g, " ").trim();
  if (cleaned.length < 2) return null;
  return cleaned.split(/\s+/).map((t) => t.replace(/\*+$/, "") + "*").join(" ");
}
function clientIp(request) {
  const raw = request.headers.get("CF-Connecting-IP") || "unknown";
  return raw.includes(":") ? raw.split(":").slice(0, 4).join(":") + "::/64" : raw;
}
function productUrl(p) {
  return "/find/" + encodeURIComponent(p.manufacturer_slug || "unknown") + "/" + encodeURIComponent(p.base_model);
}

async function searchProducts(env, q, limit = 20) {
  // No products_fts table exists in D1 (the older /api/catalogue/products/search
  // route assumed one and has always failed). 10,508 rows: a tokenised LIKE over
  // model, name, series and manufacturer is fast and honest. Exact model first.
  const tokens = String(q || "").toLowerCase().replace(/[^a-z0-9\s.\-\/]/g, " ").split(/\s+/).filter((t) => t.length >= 1).slice(0, 6);
  if (!tokens.length || tokens.join("").length < 2) return [];
  const hay = "lower(p.base_model || ' ' || coalesce(p.display_name,'') || ' ' || coalesce(p.product_series,'') || ' ' || coalesce(m.name,'') || ' ' || coalesce(m.slug,''))";
  const where = tokens.map(() => hay + " LIKE ?").join(" AND ");
  const binds = tokens.map((t) => "%" + t + "%");
  const exact = tokens[tokens.length - 1];
  const rows = await env.DB.prepare(
    "SELECT p.id, p.base_model, p.display_name, p.product_series, p.category_level_1, m.name AS manufacturer_name, m.slug AS manufacturer_slug " +
    "FROM products p LEFT JOIN manufacturers m ON m.id = p.manufacturer_id WHERE " + where +
    " ORDER BY CASE WHEN lower(p.base_model) = ? THEN 0 WHEN lower(p.base_model) LIKE ? THEN 1 ELSE 2 END, length(p.base_model), p.display_name LIMIT ?"
  ).bind(...binds, exact, exact + "%", limit).all();
  return rows.results || [];
}

async function loadProduct(env, slug, model) {
  return env.DB.prepare(
    "SELECT p.*, m.name AS manufacturer_name, m.slug AS manufacturer_slug FROM products p LEFT JOIN manufacturers m ON m.id = p.manufacturer_id " +
    "WHERE lower(m.slug) = lower(?) AND lower(p.base_model) = lower(?) LIMIT 1"
  ).bind(slug, model).first();
}

async function documentsFor(env, product) {
  const sheets = await getCutSheetsForProduct(product.id, env);
  const cutSheets = sheets.map((cs) => ({ id: cs.id, title: cs.document_title, pages: cs.page_count, ...cutSheetCitation(cs) }));
  const cataloguePages = await getCataloguePagesForModel(product.manufacturer_name, product.base_model, env, 5);
  return { cutSheets, cataloguePages };
}

function recordFinderView(env, ctx, request, name, url) {
  if (!env.DB || !ctx || typeof ctx.waitUntil !== "function") return;
  ctx.waitUntil(env.DB.prepare(
    "INSERT INTO client_telemetry (id, event_type, event_name, severity, url, user_agent, client_timestamp, ip_address) VALUES (?, 'pageview', ?, 'info', ?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), name, url, request.headers.get("User-Agent") || "unknown", new Date().toISOString(), clientIp(request)).run().catch(() => {}));
}

const STYLE = `
:root{--bg:#090a0d;--panel:#121419;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#7fb4ff;--red:#ff7a7a}
*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 "Avenir Next","Helvetica Neue",system-ui,sans-serif;padding:0 16px}
a{color:var(--blue)}main{max-width:860px;margin:0 auto;padding:28px 0 64px}header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:22px}
.mark{width:38px;height:38px;display:grid;place-items:center;background:var(--gold);color:#111;font-weight:900;border-radius:9px}
h1{font-size:clamp(22px,4vw,34px);margin:14px 0 6px;letter-spacing:-.02em;text-wrap:balance}h2{font-size:17px;margin:26px 0 10px}p.lead{color:var(--muted);margin:0 0 18px}
form{display:flex;gap:10px;flex-wrap:wrap}input[type=search]{flex:1 1 260px;background:#0d0f14;border:1px solid var(--line);border-radius:10px;padding:13px 14px;color:var(--text);font:inherit}
button{background:var(--gold);color:#111;border:0;border-radius:10px;padding:13px 18px;font:inherit;font-weight:800;cursor:pointer}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:12px 0}.meta{color:var(--muted);font-size:12.5px;letter-spacing:.04em;text-transform:uppercase}
.cite{border-left:3px solid var(--green);padding:8px 12px;margin:10px 0;background:#0d0f14;border-radius:0 8px 8px 0}.cite small{color:var(--muted);display:block}
.none{color:var(--muted)}.cta{margin-top:30px;padding:18px;border:1px dashed rgba(240,184,0,.45);border-radius:12px}.cta a{color:var(--gold);font-weight:800}
footer{color:var(--muted);font-size:12.5px;margin-top:40px}ul.results{list-style:none;padding:0;margin:0}ul.results li{padding:12px 0;border-bottom:1px solid var(--line)}
`;

const OPEN_SCRIPT = `
// Documents stay behind the free trial token: mint one on click, fetch the
// PDF with it, and show it. No accounts, nothing served anonymously.
document.addEventListener("click", async function (e) {
  var a = e.target.closest("a[data-doc]"); if (!a) return;
  e.preventDefault(); var win = window.open("", "_blank");
  try {
    var r = await fetch("/api/auth/ephemeral", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    var t = (await r.json()); var token = t.token || t.access_token;
    var pdf = await fetch(a.getAttribute("data-doc"), { headers: { "Authorization": "Bearer " + token } });
    if (!pdf.ok) throw new Error("document " + pdf.status);
    var blob = await pdf.blob(); var url = URL.createObjectURL(blob) + (a.getAttribute("data-page") ? "#page=" + a.getAttribute("data-page") : "");
    if (win) win.location = url; else location.href = url;
  } catch (err) { if (win) win.close(); a.insertAdjacentHTML("afterend", " <span style=\\"color:var(--red)\\">could not open: " + String(err.message).replace(/</g, "&lt;") + "</span>"); }
});
`;

// Finder in place (2026-10-07). The server-rendered pages stay exactly what they
// are - the indexable URLs /find?q=... and /find/<manufacturer>/<model>, with
// the sitemap - and with a script the search form and the finder's own links
// no longer replace the document: the script fetches the same URL's HTML, swaps
// in its <main> and <title>, and records the URL in history, so Back, Forward,
// reload and sharing keep working. Anything unexpected falls back to an
// ordinary navigation. Inside the single-page shell's overlay (iframe, parent
// window.WeylandShell) the URL is replaced rather than pushed, so the browser's
// Back still closes the overlay, and the links to the homepage close the
// overlay instead of loading a second homepage inside it.
// (No backslashes in this template literal: they would not survive into the page.)
export const NAV_SCRIPT = `
(function () {
  var shell = null;
  try { if (window.parent !== window && window.parent.WeylandShell) shell = window.parent.WeylandShell; } catch (e) {}
  function plainClick(e) { return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey; }
  function linkOf(e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || a.target || a.hasAttribute("download") || a.hasAttribute("data-doc")) return null;
    try { return new URL(a.getAttribute("href"), location.href); } catch (err) { return null; }
  }
  if (shell) {
    document.addEventListener("click", function (e) {
      if (!plainClick(e)) return;
      var u = linkOf(e);
      if (!u || u.origin !== location.origin || (u.pathname !== "/" && u.pathname !== "/index.html")) return;
      e.preventDefault();
      shell.close();
      if (u.hash) { try { window.parent.location.hash = u.hash; } catch (err) {} }
    });
  }
  var main = document.querySelector("main");
  if (!main || !window.fetch || !window.DOMParser || !window.URLSearchParams || !history.pushState) return;
  var inflight = null;
  function isFinder(u) {
    if (u.origin !== location.origin) return false;
    var p = u.pathname;
    return p === "/find" || p === "/find/" || (p.indexOf("/find/") === 0 && p.slice(-4) !== ".xml");
  }
  function record(url) {
    if (shell) history.replaceState({ finder: 1 }, "", url); else history.pushState({ finder: 1 }, "", url);
  }
  function show(url, push) {
    if (inflight && inflight.abort) inflight.abort();
    var ctl = window.AbortController ? new AbortController() : {};
    inflight = ctl;
    main.setAttribute("aria-busy", "true");
    fetch(url, { headers: { Accept: "text/html" }, credentials: "same-origin", signal: ctl.signal })
      .then(function (r) {
        if (!r.ok && r.status !== 404) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (html) {
        if (inflight !== ctl) return;
        var doc = new DOMParser().parseFromString(html, "text/html");
        var next = doc.querySelector("main");
        if (!next) throw new Error("no main");
        if (push) record(url);
        main.innerHTML = next.innerHTML;
        document.title = doc.title;
        window.scrollTo(0, 0);
        var h = main.querySelector("h1");
        if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (err) {} }
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") return;
        location.href = url;
      })
      .then(function () {
        if (inflight === ctl) { inflight = null; main.removeAttribute("aria-busy"); }
      });
  }
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || f.getAttribute("action") !== "/find" || String(f.getAttribute("method") || "get").toLowerCase() !== "get") return;
    e.preventDefault();
    var q = String(new FormData(f).get("q") || "").trim();
    show(q ? "/find?" + new URLSearchParams({ q: q }).toString() : "/find", true);
  });
  document.addEventListener("click", function (e) {
    if (!plainClick(e)) return;
    var u = linkOf(e);
    if (!u || !isFinder(u)) return;
    e.preventDefault();
    show(u.pathname + u.search, true);
  });
  history.replaceState({ finder: 1 }, "", location.href);
  window.addEventListener("popstate", function (e) {
    if (e.state && e.state.finder) show(location.pathname + location.search, false);
  });
})();
`;

function page({ title, description, canonical, body, jsonLd }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">
<link rel="icon" href="/favicon.ico"><style>${STYLE}</style>${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}</head>
<body><main><header><a href="/" style="text-decoration:none;display:flex;align-items:center;gap:10px;color:var(--text)"><span class="mark">W</span><strong>WeylandAI</strong></a><span class="meta">Door hardware cut-sheet finder</span></header>
${body}
<footer>Documents are the manufacturers' own, served from WeylandAI's catalogue store. No accounts, no tracking beyond a page count in our own table. <a href="/">weylandai.com</a></footer></main>
<script>${OPEN_SCRIPT}</script><script>${NAV_SCRIPT}</script></body></html>`;
}

function searchForm(q) {
  return `<form action="/find" method="get" role="search"><input type="search" name="q" value="${esc(q || "")}" placeholder="Manufacturer and model, e.g. Von Duprin 99 or LCN 4040XP" aria-label="Search door hardware" autofocus><button type="submit">Find</button></form>`;
}

function renderCitations(docs) {
  const parts = [];
  for (const cs of docs.cutSheets) {
    const title = String(cs.title || "Price book").split(" (")[0];
    parts.push(`<div class="cite"><strong>${esc(title)}</strong>${cs.pageHint ? ", pp. " + esc(cs.pageHint) : ""}${cs.pages ? ` <small>${esc(cs.pages)}-page manufacturer price book</small>` : ""}${cs.pageUrl ? ` <a href="${esc(cs.pageUrl)}" data-doc="${esc(cs.pageUrl.split("#")[0])}" data-page="${esc((cs.pageUrl.split("#page=")[1] || ""))}">open</a>` : ""}</div>`);
  }
  for (const cp of docs.cataloguePages) {
    parts.push(`<div class="cite"><strong>${esc(cp.title)}</strong>, p. ${esc(cp.pageNum)} <small>catalogue page naming this model</small>${cp.pageUrl ? ` <a href="${esc(cp.pageUrl)}" data-doc="${esc(cp.pageUrl)}">open page</a>` : ` <small>PDF not yet on file; the page text is indexed</small>`}</div>`);
  }
  if (!parts.length) parts.push(`<p class="none">No document is filed for this model yet. The miss is recorded and feeds our catalogue intake.</p>`);
  return parts.join("");
}

export function registerFindRoutes(router) {
  // JSON for scripts and for the page's own future client use. 120/hour per network.
  router.get("/api/catalogue/find", async (request, env) => {
    const rl = await kvRateLimit(env, "finder-api", clientIp(request), { limit: 120, windowSeconds: 3600 });
    if (rl.limited) return jsonResponse3({ error: "Too many searches from this network; try again in an hour." }, 429);
    const q = new URL(request.url).searchParams.get("q") || "";
    const results = await searchProducts(env, q, 20);
    return jsonResponse3({ query: q, count: results.length, results: results.map((p) => ({ manufacturer: p.manufacturer_name, model: p.base_model, name: p.display_name, series: p.product_series, category: p.category_level_1, url: SITE + productUrl(p) })) }, 200);
  });

  // Sitemap: every catalogued product has a page. Cached a day at the edge.
  router.get("/find/sitemap.xml", async (request, env, ctx) => {
    const cache = caches.default; const key = new Request(new URL(request.url).toString(), { method: "GET" });
    const hit = await cache.match(key); if (hit) return hit;
    const rows = await env.DB.prepare("SELECT p.base_model, m.slug AS manufacturer_slug FROM products p LEFT JOIN manufacturers m ON m.id = p.manufacturer_id WHERE m.slug IS NOT NULL LIMIT 45000").all();
    const urls = (rows.results || []).map((p) => `<url><loc>${esc(SITE + productUrl(p))}</loc></url>`).join("");
    const resp = new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/find</loc></url>${urls}</urlset>`, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=86400" } });
    if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, resp.clone()));
    return resp;
  });

  // Product page: /find/<manufacturer-slug>/<model>
  router.get("/find/:slug/:model", async (request, env, ctx) => {
    const { slug, model } = request.params;
    const product = await loadProduct(env, decodeURIComponent(slug), decodeURIComponent(model));
    if (!product) {
      return new Response(page({ title: "Not in the catalogue | WeylandAI finder", description: "This model is not catalogued yet.", canonical: SITE + "/find", body: `<h1>Not in the catalogue yet</h1><p class="lead">${esc(decodeURIComponent(slug))} ${esc(decodeURIComponent(model))} is not one of the 10,508 catalogued products.</p>${searchForm(decodeURIComponent(slug) + " " + decodeURIComponent(model))}` }), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    const docs = await documentsFor(env, product);
    const name = product.display_name || `${product.manufacturer_name} ${product.base_model}`;
    const canonical = SITE + productUrl(product);
    recordFinderView(env, ctx, request, "finder-product", new URL(request.url).pathname);
    const nDocs = docs.cutSheets.length + docs.cataloguePages.length;
    const description = `${name}: ${nDocs ? `${nDocs} filed document${nDocs === 1 ? "" : "s"} with page citations` : "catalogued, no document filed yet"}. ${product.product_series ? product.product_series + " series. " : ""}${product.category_level_1 || ""}`.trim();
    const jsonLd = { "@context": "https://schema.org", "@type": "Product", name, brand: { "@type": "Brand", name: product.manufacturer_name }, model: product.base_model, category: product.category_level_1 || undefined, url: canonical };
    const body = `
<p class="meta"><a href="/find" style="color:var(--muted)">Finder</a> / ${esc(product.manufacturer_name)} / ${esc(product.base_model)}</p>
<h1>${esc(name)}</h1>
<p class="lead">${esc(product.manufacturer_name)}${product.product_series ? " · " + esc(product.product_series) + " series" : ""}${product.category_level_1 ? " · " + esc(product.category_level_1) : ""}${product.ansi_grade ? " · ANSI grade " + esc(product.ansi_grade) : ""}${product.fire_rated ? " · fire rated" : ""}${product.ada_compliant ? " · ADA" : ""}</p>
<h2>Documents on file</h2>
${renderCitations(docs)}
<div class="cta"><strong>Have a whole schedule?</strong> Paste it on the homepage and every line is matched and cited in one pass, then built into a submittal packet. <a href="/#subx">Open SubX &rarr;</a></div>
<h2>Find another</h2>${searchForm("")}`;
    return new Response(page({ title: `${name} cut sheet and catalogue pages | WeylandAI`, description, canonical, body, jsonLd }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
  });

  // Search page: /find and /find?q=
  const search = async (request, env, ctx) => {
    const url = new URL(request.url); const q = (url.searchParams.get("q") || "").trim();
    let results = [], limited = false;
    if (q) {
      const rl = await kvRateLimit(env, "finder-search", clientIp(request), { limit: 120, windowSeconds: 3600 });
      limited = rl.limited; if (!limited) results = await searchProducts(env, q, 20);
    }
    recordFinderView(env, ctx, request, q ? "finder-search" : "finder-home", url.pathname + (q ? "?q" : ""));
    const list = q ? (limited ? `<p class="none">Too many searches from this network; try again in an hour.</p>` : results.length ? `<ul class="results">${results.map((p) => `<li><a href="${esc(productUrl(p))}"><strong>${esc(p.display_name || (p.manufacturer_name + " " + p.base_model))}</strong></a><br><span class="meta">${esc(p.manufacturer_name || "")}${p.product_series ? " · " + esc(p.product_series) : ""}${p.category_level_1 ? " · " + esc(p.category_level_1) : ""}</span></li>`).join("")}</ul>` : `<p class="none">Nothing catalogued matches "${esc(q)}". Try the manufacturer and the base model, like "Schlage L9080".</p>`) : "";
    const body = `<h1>Find a door hardware cut sheet</h1><p class="lead">10,508 catalogued products from 42 manufacturers, with page citations into 8 manufacturer price books and 3,618 indexed catalogue pages. Free, no account.</p>${searchForm(q)}${list}
<div class="cta"><strong>Have a whole schedule?</strong> Paste it on the homepage and every line is matched and cited in one pass. <a href="/#subx">Open SubX &rarr;</a></div>`;
    return new Response(page({ title: q ? `${q} cut sheet | WeylandAI finder` : "Door hardware cut-sheet finder | WeylandAI", description: "Free finder for door hardware cut sheets and catalogue pages: Von Duprin, LCN, Schlage, Ives, Hager, Dormakaba and more, with page citations.", canonical: SITE + "/find", body }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": q ? "no-store" : "public, max-age=600" } });
  };
  router.get("/find", search);
  router.get("/find/", search);
}
