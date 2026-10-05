// weyland-platform-worker/src/lib/wire-tenant.js
//
// WeylandAI Wire — the first real pilot tenant of mobleyreport.com's
// "provenance-first wire" template, parameterized instead of hardcoded.
// Built 2026-10-02 per John's explicit pricing/pilot decision ($49/mo,
// WeylandAI as the pilot). This is WeylandAI selling access to ITS OWN
// wire desk to its own subcontractor customers/prospects — construction
// trade-press headlines plus WeylandAI's own real, audited price-
// extraction engineering reports as a trust signal — not mobleyreport.com
// white-labeling instances to third parties yet (that generic multi-
// tenant provisioning step comes later, once this one pilot proves out).
//
// Everything below is a parameterized fork of the real, already-live
// pieces this was built on top of:
//   - RSS fetch + parseRssItems: byte-for-byte the same small hand-written
//     <item> regex parser already live in nginx/workers/news-wire-worker/
//     src/worker.js, just pointed at WIRE_FEEDS (construction trade press)
//     instead of NEWS_FEEDS (NPR/BBC).
//   - synthesizeHeadlinesDeterministic + its helpers: copied verbatim from
//     nginx/workers/venture-fleet/src/worker.js (lines ~9439-9653,
//     mobleyreport.com's real deterministic Editor's Briefing engine,
//     2026-10-02). Pure/synchronous, no model, no network call, generic
//     over any {title, source, link} array — confirmed by reading it, not
//     hardcoded to NPR/BBC content, so this reuse is exact, not adapted.
//
// Each RSS feed URL below was live-curl-verified 2026-10-02 to return
// real, parseable RSS 2.0 XML before being used here (not guessed):
//   https://www.enr.com/rss/articles           -> HTTP 200, 30 real <item>s
//   https://www.constructiondive.com/feeds/news/ -> HTTP 200, 10 real <item>s
// Two other candidate ENR/trade-press URLs tried first
// (enr.com/rss/national, enr.com/rss, bdcnetwork.com/rss.xml,
// forconstructionpros.com/rss, feedburner.com/EnrNationalNews) either
// 404'd or came back blocked/HTML — not shipped.

export const WIRE_FEEDS = [
  { source: "Engineering News-Record", url: "https://www.enr.com/rss/articles" },
  { source: "Construction Dive", url: "https://www.constructiondive.com/feeds/news/" },
  // Added 2026-10-05, each probed live (HTTP 200, real <item>s): general
  // construction, building enclosure, and the door / access-control /
  // storefront trade press that CutsheetX and SubX customers actually read.
  { source: "For Construction Pros", url: "https://www.forconstructionpros.com/rss" },
  { source: "Building Enclosure", url: "https://www.buildingenclosureonline.com/rss/articles" },
  { source: "SDM Magazine", url: "https://www.sdmmag.com/rss/articles" },
  { source: "Security Sales & Integration", url: "https://www.securitysales.com/feed/" },
  { source: "USGlass", url: "https://www.usglassmag.com/feed/" },
];

// Byte-for-byte the same regex parser as news-wire-worker/src/worker.js's
// parseRssItems — no library, hand-written <item> block matcher.
export function parseRssItems(xml, source, limit) {
  const items = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRe) || [];
  for (const block of matches.slice(0, limit)) {
    const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();
    if (title) items.push({ source, title, link, pubDate });
  }
  return items;
}

export async function fetchWireNews(isPro = false) {
  const limit = isPro ? 20 : 6;
  const results = await Promise.all(
    WIRE_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { headers: { "User-Agent": "weylandai.com wire-desk research" } });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssItems(xml, feed.source, limit);
      } catch {
        return [];
      }
    })
  );
  return results.flat();
}

// --- Store-backed wire (2026-10-05) ------------------------------------
// Per direct instruction, no visitor request may depend on a call outside
// the conglomerate. The RSS feeds above are pulled by the Worker's
// scheduled() cron (every 20 minutes, see wrangler.toml) into the CACHE KV
// namespace; /api/wire/news and /api/wire/synthesis read that store only.
// The first request after a cold deploy finds nothing and kicks one
// background ingest via ctx.waitUntil without waiting on it.
export const WIRE_STORE_KEY = "wire:news:v1";

export async function ingestWireNews(env) {
  const results = await Promise.all(
    WIRE_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { headers: { "User-Agent": "weylandai.com wire-desk research" }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssItems(xml, feed.source, 20);
      } catch {
        return [];
      }
    })
  );
  const items = results.flat();
  const record = { items, fetchedAt: new Date().toISOString(), sources: WIRE_FEEDS.map((f) => f.source) };
  if (items.length && env.CACHE) await env.CACHE.put(WIRE_STORE_KEY, JSON.stringify(record));
  return record;
}

export async function readWireNews(env, isPro = false, ctx = null) {
  const limit = isPro ? 20 : 6;
  let record = null;
  try { record = env.CACHE ? await env.CACHE.get(WIRE_STORE_KEY, "json") : null; } catch { record = null; }
  if (!record) {
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(ingestWireNews(env).catch((e) => console.error("[WireX] warm-up ingest failed:", e.message)));
    return { items: [], fetchedAt: null, warming: true };
  }
  const perSource = new Map();
  const items = [];
  for (const it of record.items) {
    const n = perSource.get(it.source) || 0;
    if (n >= limit) continue;
    perSource.set(it.source, n + 1);
    items.push(it);
  }
  return { items, fetchedAt: record.fetchedAt, warming: false };
}

// --- Deterministic Editor's Briefing engine --------------------------
// Copied verbatim from nginx/workers/venture-fleet/src/worker.js
// (2026-10-02 deterministic replacement for the old Qwen-backed
// "news-synthesis" capability — see that file's own header for the full
// rationale: no model, no network call, genuinely generic over any small
// bounded headline-title array). Not adapted for construction content —
// the keyword/entity-overlap clustering below has no domain-specific
// logic at all, which is exactly why it ports unchanged.
const SYNTHESIS_STOPWORDS = new Set([
  "the","a","an","of","in","on","for","to","and","is","are","was","were","be","been","being",
  "as","at","by","with","from","into","over","after","amid","amidst","new","says","said","say",
  "this","that","these","those","it","its","his","her","their","our","your","my","not","no","but",
  "or","so","if","than","then","will","would","could","should","can","may","might","up","down","out",
  "off","about","against","between","during","without","within","per","via","vs","year","years",
  "week","weeks","day","days","today","first","second","third","more","most","less","least","still",
  "just","also","has","have","had","does","do","did","what","who","why","how","when","where","which",
  "while","gets","get","got","one","two","three","only","even","now","before","like","never",
  "nearly","loses","lose","lost","faces","face","describe","describes","amid","talks","react",
  "reacted","reaction","news","world","global","major","warns","warn","calls","call","plan","plans",
  "woman","women","man","men","officials","official","government","report",
  "reports","family","families","country","countries","attack","attacks",
  "killed","killing","killings","case","cases","vote","votes","support",
  "strike","strikes","protest","protests","minister","president","forces",
  "crisis","inquiry","housing","city","cities","according","dead","death","deaths",
]);

function decodeHeadlineEntities(s) {
  return String(s)
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tokenizeHeadlineTitle(title) {
  const clean = decodeHeadlineEntities(title).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return clean.split(/\s+/).filter((w) => w.length >= 4 && !SYNTHESIS_STOPWORDS.has(w));
}

function extractHeadlineEntities(title) {
  const words = decodeHeadlineEntities(title).split(/\s+/);
  const entities = [];
  let run = [];
  for (const raw of words) {
    const clean = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    const isCap = clean.length >= 2 && /^[A-Z][a-z]/.test(clean);
    if (isCap) {
      run.push(clean);
    } else {
      if (run.length >= 2) entities.push(run.join(" "));
      run = [];
    }
  }
  if (run.length >= 2) entities.push(run.join(" "));
  return entities;
}

function capitalizeSynthesisTheme(s) {
  if (/[A-Z]/.test(s)) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function synthesizeHeadlinesDeterministic(items) {
  const n = items.length;
  const caveat =
    "Generated by matching shared keywords across headline titles, not by reading full articles - " +
    "verify each citation against the real source list below.";
  if (!n) {
    return { synthesis: "No headlines available right now.", caveat };
  }

  const perHeadline = items.map((it, i) => ({
    idx: i,
    title: it.title || "",
    source: it.source || "",
    tokens: tokenizeHeadlineTitle(it.title || ""),
    entities: extractHeadlineEntities(it.title || ""),
  }));

  const termInfo = new Map();
  function addTerm(key, display, isEntity, idx) {
    let info = termInfo.get(key);
    if (!info) {
      info = { indices: new Set(), isEntity, display };
      termInfo.set(key, info);
    }
    info.indices.add(idx);
    if (isEntity) {
      info.isEntity = true;
      info.display = display;
    }
  }
  for (const h of perHeadline) {
    for (const tok of h.tokens) addTerm(tok, tok, false, h.idx);
    for (const ent of h.entities) addTerm(ent.toLowerCase(), ent, true, h.idx);
  }

  let candidates = [];
  for (const info of termInfo.values()) {
    if (info.indices.size >= 2) {
      candidates.push({ display: info.display, isEntity: info.isEntity, indices: info.indices });
    }
  }
  candidates.sort((a, b) => Number(b.isEntity) - Number(a.isEntity) || b.indices.size - a.indices.size);

  const merged = [];
  for (const cand of candidates) {
    let target = null;
    for (const m of merged) {
      let overlap = 0;
      for (const i of cand.indices) if (m.indices.has(i)) overlap++;
      const smaller = Math.min(cand.indices.size, m.indices.size);
      if (smaller > 0 && overlap / smaller >= 0.6) {
        target = m;
        break;
      }
    }
    if (target) {
      for (const i of cand.indices) target.indices.add(i);
      if (cand.isEntity && !target.isEntity) {
        target.isEntity = true;
        target.display = cand.display;
      }
    } else {
      merged.push({ display: cand.display, isEntity: cand.isEntity, indices: new Set(cand.indices) });
    }
  }

  merged.sort((a, b) => b.indices.size - a.indices.size || Number(b.isEntity) - Number(a.isEntity));
  const kept = merged.slice(0, 4);

  if (!kept.length) {
    return {
      synthesis: `No clear overlapping theme across today's ${n} headlines - see the full list below.`,
      caveat,
    };
  }

  const coveredIdx = new Set();
  for (const c of kept) for (const i of c.indices) coveredIdx.add(i);

  const templatesMulti = [
    (count, theme, cites) => `${count} of today's headlines center on ${theme} ${cites}.`,
    (count, theme, cites) => `${theme} is a recurring thread in today's wire, touching ${count} separate headlines ${cites}.`,
    (count, theme, cites) => `Multiple reports today connect back to ${theme} ${cites}.`,
  ];
  const templatesPair = [
    (theme, src1, src2, cites) => `${theme} continues to develop, covered by both ${src1} and ${src2} ${cites}.`,
    (theme, src1, src2, cites) => `${src1} and ${src2} both report on ${theme} ${cites}.`,
  ];

  const sentences = [];
  kept.forEach((c, ci) => {
    const idxArr = [...c.indices].sort((a, b) => a - b);
    const cites = idxArr.map((i) => `[${i + 1}]`).join("");
    const theme = capitalizeSynthesisTheme(c.display);
    if (c.indices.size >= 3) {
      sentences.push(templatesMulti[ci % templatesMulti.length](c.indices.size, theme, cites));
    } else {
      const uniqueSrcs = [...new Set(idxArr.map((i) => perHeadline[i].source))];
      if (uniqueSrcs.length >= 2) {
        sentences.push(templatesPair[ci % templatesPair.length](theme, uniqueSrcs[0], uniqueSrcs[1], cites));
      } else {
        sentences.push(`${theme} appears in two separate ${uniqueSrcs[0]} headlines ${cites}.`);
      }
    }
  });

  if (sentences.length < 5) {
    const uncovered = perHeadline.filter((h) => !coveredIdx.has(h.idx));
    if (uncovered.length) {
      uncovered.sort((a, b) => b.title.length - a.title.length);
      const pick = uncovered[0];
      if (pick.title.length >= 40) {
        sentences.push(`Separately, ${pick.source} reports: "${decodeHeadlineEntities(pick.title)}" [${pick.idx + 1}].`);
      }
    }
  }

  return { synthesis: sentences.slice(0, 5).join(" "), caveat };
}

// --- Reports wire -------------------------------------------------------
// WeylandAI's own real, already-audited engineering-validation history —
// the honest-about-failures equivalent of mobleyreport.com's
// MOBCORP_REPORTS, sourced from this same repo's real files rather than
// invented. `num` is this wire's own internal sequential report number
// (there is no cross-venture paper registry for WeylandAI's engineering
// reports the way mascom/mascom_data/papers_registry.json exists for the
// mobleyreport.com physics corpus) - not to be confused with that
// numbering. Status is copied/derived from each source file's own header
// comments, not softened - entry 2 is a real FALSIFIED finding (later
// corrected by entry 3, kept as its own separate entry rather than
// deleted, same discipline MOBCORP_REPORTS uses for its one FALSIFIED
// row), and entry 5 is PARTIAL because of a real, documented scope
// limitation, not a stretch of VALIDATED.
export const WEYLAND_REPORTS = [
  {
    num: 1,
    title: "Schlage 312-Page Price-Book Extraction — Real OCR Pre-Flight",
    status: "VALIDATED",
    date: "2026-09-30",
    excerpt:
      "Validated the LLM-backed price-row extractor against a real 312-page Schlage Electronics price book (page 40, a dense multi-year-license table). It correctly extracted 20+ real model+price pairs, faithfully transcribed real OCR noise instead of 'fixing' it into a plausible-but-wrong model number, and correctly emitted no row at all for 'Call for quote' lines rather than inventing a price. One real limitation found: the local model's 4096-token context hard-caps how many rows fit in a single extraction call.",
  },
  {
    num: 2,
    title: "Von Duprin Multi-Finish Price Matrix — Column-Mapping Failure",
    status: "FALSIFIED",
    date: "2026-10-01",
    excerpt:
      "Applying the Schlage-validated single-price-per-row extraction path unmodified to a Von Duprin XP98/XP99 multi-finish price matrix (one model, nine finish/price pairs per row) systematically attached every real price to the wrong finish code - every number real, every mapping wrong. Falsifies the assumption that the single-column path generalizes to rigid multi-column price tables.",
  },
  {
    num: 3,
    title: "Positional Extraction Fix for Multi-Finish Tables",
    status: "VALIDATED",
    date: "2026-10-01",
    excerpt:
      "Corrects report #2: replaced the LLM path for fixed N-column price matrices with a deterministic positional zip against the table's own detected header/finish-code order (extractPriceRowsPositionally), and carried header context into every OCR chunk so a late chunk is never separated from the legend it depends on. Verified live: zero transposition errors across every row tested, versus the systematic wrong-column mapping report #2 found.",
  },
  {
    num: 4,
    title: "GOFAINEAT pricerowtype Classifier — Extraction Cascade, Stage 1",
    status: "VALIDATED",
    date: "2026-10-02",
    excerpt:
      "A genetic-algorithm-evolved rule classifier (7 rules, not a neural net) labels each OCR line as call_for_quote / header_or_noise / priced_data_row before any model call is made. 100% accuracy on a 25-example held-out test set (naive always-guess-the-most-common-label baseline: 44%). Narrows what reaches the LLM fallback path - does not eliminate it, and 25 held-out examples is a small sample.",
  },
  {
    num: 5,
    title: "GOFAINEAT pricefinishformat Classifier — Extraction Cascade, Stage 2",
    status: "PARTIAL",
    date: "2026-10-02",
    excerpt:
      "A second GOFAINEAT rule classifier (12 rules) labels a detected finish-code token's format (BHMA 3-digit, US-letter, word/abbreviation, BHMA 2-digit variant, or none present). 100% accuracy on a 74-example held-out test set - but with a real, documented blind spot: a finish code embedded inside a hyphen-joined model string (e.g. 'L91-400-626') isn't detected as its own token and misclassifies as none_present. Marked PARTIAL rather than VALIDATED specifically because of that known, non-hidden scope limit.",
  },
];

// Real Stripe Product+Price, created 2026-10-02 via the same live Stripe
// account every other WEYLAND_PRODUCTS entry's priceId already lives in
// (sk_live_..., same account that issues weylandai's existing seat
// prices). $49.00/mo recurring - John's explicit pricing decision.
export const WEYLAND_WIRE_PRODUCT_ID = "weyland-wire-seat";
export const WEYLAND_WIRE_PRICE_ID = "price_1UMD5fLWTxUJi5AVF6xGy8mK";

// Real vector trace (potrace), not a placeholder - the same file already
// saved at weylandai.com/assets/brand/weylandai-wordmark.svg, inlined
// verbatim because this Worker has no [assets] binding of its own to
// serve a static file from (only D1/KV/service bindings - see
// wrangler.toml). Signal Blue #2A52FF background, Hi-Vis Yellow #FFD400
// "W" glyph.
export const WIRE_WORDMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 536 145" width="134" height="36" role="img" aria-label="WeylandAI">
  <title>WeylandAI wordmark</title>
  <rect x="0" y="0" width="536" height="145" rx="20" fill="#2A52FF"/>
  <g transform="translate(28,28)">
    <g transform="translate(0.000000,89.000000) scale(0.100000,-0.100000)" fill="#FFD400" stroke="none">
      <path d="M50 801 c0 -33 4 -40 25 -45 18 -5 27 -17 35 -49 13 -45 19 -65 80
-262 45 -148 45 -145 26 -145 -9 0 -16 14 -18 38 -6 47 -58 224 -69 237 -5 5
-9 -51 -9 -133 0 -135 -1 -142 -20 -142 -16 0 -20 -7 -20 -34 l0 -34 72 -4
c40 -2 126 -2 190 0 l117 4 40 122 c21 66 47 147 56 179 9 31 19 57 23 57 4 0
32 -80 63 -178 l57 -177 128 -5 c71 -3 155 -4 187 -2 l57 5 0 33 c0 27 -4 34
-20 34 -19 0 -20 7 -20 147 0 80 -3 143 -7 140 -12 -13 -72 -222 -73 -254 0
-23 -5 -33 -15 -33 -8 0 -15 5 -15 12 0 9 45 158 121 405 7 21 19 35 40 42 25
8 29 15 29 45 l0 36 -155 0 -155 0 0 -40 c0 -31 4 -40 18 -40 43 -1 44 -11 11
-151 -17 -74 -35 -140 -38 -147 -6 -11 -75 196 -113 341 l-10 37 -87 0 -86 0
-60 -197 -59 -196 -17 59 c-60 213 -63 246 -29 254 20 5 26 13 28 43 l3 37
-155 0 -156 0 0 -39z"/>
    </g>
    <g transform="translate(0.000000,89.000000) scale(0.100000,-0.100000)" fill="#F5F7FA" stroke="none">
      <path d="M2100 535 l0 -305 65 0 65 0 0 305 0 305 -65 0 -65 0 0 -305z"/>
      <path d="M3610 729 c0 -98 -2 -109 -15 -96 -25 26 -84 40 -138 34 -111 -14
-172 -95 -171 -227 0 -114 43 -183 133 -215 61 -21 99 -19 150 10 52 30 51 30
51 7 0 -16 7 -18 58 -16 l57 3 3 305 2 306 -65 0 -65 0 0 -111z m-27 -190 c23
-25 27 -38 27 -90 0 -93 -32 -139 -97 -139 -111 0 -143 210 -39 256 41 18 75
10 109 -27z"/>
      <path d="M4130 818 c-60 -139 -237 -589 -232 -591 4 -2 38 -3 77 -3 76 1 75 0
109 89 l15 37 124 0 123 0 25 -62 24 -63 77 0 c43 0 78 4 78 9 0 4 -31 83 -68
175 -38 91 -93 226 -122 299 l-54 132 -83 0 c-77 0 -84 -2 -93 -22z m139 -258
c16 -41 27 -78 24 -82 -2 -5 -35 -8 -74 -8 -51 0 -69 4 -69 13 0 12 33 101 62
167 12 29 8 36 57 -90z"/>
      <path d="M4602 533 l3 -308 73 0 72 0 0 307 0 308 -75 0 -75 0 2 -307z"/>
      <path d="M1335 665 c-5 -2 -22 -6 -38 -9 -41 -9 -103 -71 -123 -122 -26 -67
-15 -173 22 -227 90 -130 308 -124 382 10 l22 41 -43 6 c-51 8 -70 2 -103 -30
-26 -27 -97 -33 -126 -10 -22 16 -49 67 -42 78 3 4 74 8 159 8 91 0 156 4 160
10 3 5 1 36 -4 67 -21 110 -97 178 -204 181 -29 0 -56 -1 -62 -3z m89 -95 c21
-8 56 -54 56 -75 0 -3 -43 -5 -95 -5 -85 0 -95 2 -95 18 0 10 10 28 23 39 36
33 68 40 111 23z"/>
      <path d="M2445 664 c-78 -19 -135 -71 -135 -123 0 -19 5 -21 60 -21 54 0 61 2
69 24 11 28 29 36 81 36 38 0 70 -20 70 -43 -1 -28 -22 -39 -106 -52 -49 -8
-106 -22 -126 -31 -66 -29 -86 -115 -43 -181 20 -29 88 -63 130 -63 36 0 122
25 141 41 11 9 14 8 14 -4 0 -12 15 -16 63 -19 34 -2 62 -4 63 -3 0 0 -2 79
-6 175 -7 196 -13 215 -78 246 -36 17 -156 28 -197 18z m142 -281 c-11 -70
-89 -106 -145 -67 -25 17 -28 42 -9 67 12 17 74 34 131 36 28 1 28 0 23 -36z"/>
      <path d="M2996 660 c-16 -5 -39 -19 -52 -31 l-24 -22 0 26 c0 27 -1 27 -65 27
l-65 0 0 -213 c0 -118 2 -216 4 -218 2 -2 34 -3 69 -1 l66 4 3 150 c3 144 4
151 27 169 27 22 79 25 107 5 17 -13 19 -30 22 -170 4 -173 -1 -164 83 -158
l49 4 0 164 c0 144 -2 170 -20 203 -30 60 -119 86 -204 61z"/>
      <path d="M1600 657 c0 -2 36 -95 81 -208 45 -112 81 -214 81 -226 0 -13 -7
-34 -16 -48 -14 -21 -24 -25 -61 -25 l-45 0 0 -50 0 -50 55 0 c64 0 110 17
142 51 12 13 62 132 112 264 49 132 94 253 100 268 l11 28 -67 -3 -66 -3 -48
-140 c-26 -77 -50 -133 -53 -125 -3 8 -25 71 -49 140 l-44 125 -66 3 c-37 2
-67 1 -67 -1z"/>
    </g>
  </g>
</svg>`;
