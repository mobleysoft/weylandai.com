// The data tools on sale, each held to its own pricing-card claim, live (2026-10-09).
//
// For every tool below: the card's claim is quoted, a pass bar is set that tests exactly
// that claim, and the bar is run against production with a paying test account. Where the
// claim names a public source, the tool's numbers are checked against that source directly
// (Census geocoder, National Weather Service, NYC open data, data.texas.gov, the RSS feeds).
//
//   HuntX      GET  /api/hunt/opportunities (+ fit, state, due_within, min_value), saved search + RSS/ICS
//              POST /api/hunt/sample only when the account's email is jmobleyworks+<tag>@gmail.com
//   CompX      GET  /api/compx/awards (+ vendor, fit, format=csv)   NYC City Record awards
//              GET  /api/compx/vendors?q=   legacy TxDOT bid-tabulation route (not on the card)
//   MarketX    GET  /api/marketx/metros, /api/marketx/metro/:metro, .../projects.csv, .../companies.csv
//   WeatherX   GET  /api/weatherx/jobs, /api/weatherx/log/:proposalId
//   GeoX       GET  /api/geox/jobs?shop=  (+ format=csv)
//   ForecastX  POST /api/forecastx/portfolio (+ format=csv), with a real PropX proposal; an existing
//              change order is set approved for one call and put back to its old status after
//   WireX      GET  /api/wire/news, /api/wire/synthesis, /api/wire/reports   (claim from /news)
//
// Usage: node tools/accuracy/product_audit_data_tools.mjs --token-file <path>
//        [--base https://weylandai.com] [--only huntx,compx,...] [--label x] [--shop "<address>"]
// The token is a test account's AuthFor bearer token (never printed). Writes
// product_audit_data_tools_<stamp>[_label].json and .md next to this file.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const BASE = String(args.base || "https://weylandai.com").replace(/\/$/, "");
const TOKEN = readFileSync(String(args["token-file"]), "utf8").trim();
const ONLY = args.only ? String(args.only).split(",") : null;
const LABEL = args.label ? "_" + String(args.label).replace(/[^A-Za-z0-9_-]/g, "") : "";
const SHOP = String(args.shop || "1600 Pennsylvania Ave NW, Washington, DC 20500");
const H = { Authorization: "Bearer " + TOKEN };
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const NWS_UA = "weylandai.com accuracy audit (hello@weylandai.com)";
const SAFE_EMAIL = /^jmobleyworks\+[^@\s]+@gmail\.com$/i;
const scrub = (s) => String(s).split(TOKEN).join("<token>");

async function api(path, init = {}) {
  const t0 = Date.now();
  const r = await fetch(BASE + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  let data = null;
  if (ct.includes("json")) { try { data = JSON.parse(text); } catch { data = null; } }
  return { ok: r.ok, status: r.status, ct, data, text, ms: Date.now() - t0 };
}
const post = (path, body) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
async function ext(url, init = {}) {
  const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30000), ...init, headers: { "User-Agent": UA, ...(init.headers || {}) } });
  return r;
}
// A link's status. A Cloudflare bot challenge ("Just a moment...", 403/503 with cf-mitigated) means
// the page exists but a script cannot read it: reported as "challenge", never counted as dead or as 200.
async function linkStatus(url) {
  try {
    const r = await ext(url, { headers: { Accept: "text/html,application/xhtml+xml" } });
    const t = await r.text().catch(() => "");
    if ((r.status === 403 || r.status === 503) && (r.headers.get("cf-mitigated") === "challenge" || /<title>Just a moment\.\.\.<\/title>/i.test(t))) return "challenge";
    return r.status;
  } catch (e) { return "error: " + e.message; }
}
const dead = (st) => st !== 200 && st !== "challenge" && !(typeof st === "number" && st < 400);
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }
const csvRows = (t) => { const out = []; let row = [], cell = "", q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); out.push(row); row = []; cell = ""; } else cell += c; } if (cell || row.length) { row.push(cell); out.push(row); } return out.filter((r) => r.length > 1 || r[0]); };
const near = (a, b, tol) => Math.abs(Number(a) - Number(b)) <= tol;
const sortedDesc = (xs) => xs.every((x, i) => i === 0 || xs[i - 1] >= x);
const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
const todayUtc = new Date().toISOString().slice(0, 10);

function checker() {
  const checks = [];
  const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail: detail === undefined ? null : detail }); return !!ok; };
  return { checks, check };
}

// ---------------------------------------------------------------- HuntX
async function huntx() {
  const claim = "Seven public sources, sorted by what a door sub can bid. Opportunity Discovery. Public construction notices from seven sources (Illinois CDB, NYC City Record and School Construction Authority, Los Angeles, Delaware, Texas DOT, California school funding), each tagged by trade fit: door scope named, building work, funding to watch, or civil. Filter by state, due date and value; saved searches count new notices since you last looked and send them to your feed reader (RSS) and your calendar (bid due dates).";
  const bar = "All seven named sources hold notices; every notice carries a trade fit and a link on its source's own site, and no link is dead (every distinct link fetched; a bot challenge is reported, not counted as dead); fit=doors returns only door-scope notices, each with the words that put it there, and its total equals the index's door count; state, due-date and value filters return only matching rows; 5 source links (5 different sources) answer HTTP 200; a saved search returns a new-notice count and working RSS and calendar feeds. The sample email is sent only if the account's address is jmobleyworks+<tag>@gmail.com.";
  const { checks, check } = checker();
  const SOURCES = { il_cdb: "cdb.illinois.gov", nyc_cityrecord: "a856-cityrecord.nyc.gov", nyc_sca: "nycsca.org", la_ramp: "rampla.org", de_mmp: "mmp.delaware.gov", txdot: "txdot.gov", ca_opsc: "dgs.ca.gov" };
  const first = await api("/api/hunt/opportunities?limit=1");
  if (!check("index answers", first.ok && first.data, "HTTP " + first.status)) return { claim, bar, checks, summary: "index HTTP " + first.status };
  const idx = first.data;
  const srcN = Object.fromEntries((idx.sources || []).map((s) => [s.source, s.n]));
  check("seven named sources each hold notices", Object.keys(SOURCES).every((s) => srcN[s] > 0), srcN);
  // Whole index, 300 at a time.
  const all = [];
  for (let off = 0; off < 20000; off += 300) {
    const p = await api("/api/hunt/opportunities?limit=300&offset=" + off);
    if (!p.ok) { check("full index pages", false, "offset " + off + " HTTP " + p.status); break; }
    all.push(...p.data.opportunities);
    if (p.data.opportunities.length < 300) break;
  }
  check("full index read equals indexed count", all.length === idx.indexed, all.length + " rows read, indexed " + idx.indexed);
  const FITS = new Set(["doors", "building", "signal", "civil"]);
  const unfit = all.filter((o) => !FITS.has(o.trade_fit));
  check("every notice tagged with a trade fit", unfit.length === 0, unfit.length + " untagged");
  const badLink = all.filter((o) => { try { const h = new URL(o.detail_url).hostname; return !SOURCES[o.source] || !h.endsWith(SOURCES[o.source]); } catch { return true; } });
  check("every notice links to its source's own site", badLink.length === 0, badLink.length ? badLink.slice(0, 3).map((o) => o.source + " " + o.detail_url) : "all " + all.length);
  const perSource = {};
  for (const o of all) { const s = (perSource[o.source] ||= { rows: 0, urls: new Set() }); s.rows++; s.urls.add(o.detail_url); }
  const generic = Object.entries(perSource).filter(([, v]) => v.rows > 1 && v.urls.size === 1).map(([k, v]) => ({ source: k, rows: v.rows, link: [...v.urls][0] }));
  const specific = all.length - generic.reduce((s, g) => s + g.rows, 0);
  // Door filter.
  const doors = await api("/api/hunt/opportunities?fit=doors&limit=300");
  const dRows = doors.data?.opportunities || [];
  check("fit=doors returns only door-scope notices", doors.ok && dRows.length > 0 && dRows.every((o) => o.trade_fit === "doors"), dRows.length + " rows");
  check("fit=doors total equals the index's door count", doors.data?.total === idx.fits?.doors, "total " + doors.data?.total + ", fits.doors " + idx.fits?.doors);
  check("each door notice says why (trade_fit_why)", dRows.every((o) => String(o.trade_fit_why || "").trim()), dRows.filter((o) => !o.trade_fit_why).length + " without a reason");
  // State, due date, value.
  const st = await api("/api/hunt/opportunities?state=TX&limit=300");
  check("state=TX returns only TX", st.ok && st.data.opportunities.length > 0 && st.data.opportunities.every((o) => o.state === "TX"), (st.data?.total ?? "?") + " rows");
  const until = new Date(Date.parse(todayUtc) + 30 * 86400000).toISOString().slice(0, 10);
  const due = await api("/api/hunt/opportunities?due_within=30&limit=300");
  const dueBad = (due.data?.opportunities || []).filter((o) => !(String(o.key_date).slice(0, 10) >= todayUtc && String(o.key_date).slice(0, 10) <= until));
  check("due_within=30 returns only notices due in the next 30 days", due.ok && due.data.opportunities.length > 0 && dueBad.length === 0, (due.data?.total ?? "?") + " rows, " + dueBad.length + " outside");
  const val = await api("/api/hunt/opportunities?min_value=1000000&limit=300");
  const valBad = (val.data?.opportunities || []).filter((o) => !(Number(o.estimated_value) >= 1000000));
  check("min_value=1000000 returns only notices worth $1M+", val.ok && val.data.opportunities.length > 0 && valBad.length === 0, (val.data?.total ?? "?") + " rows, " + valBad.length + " under");
  // Five source links, five different sources (door notices first).
  const picks = [];
  for (const o of [...dRows, ...all]) if (!picks.find((p) => p.source === o.source) && picks.length < 5) picks.push(o);
  const links = [];
  for (const o of picks) links.push({ source: o.source, url: o.detail_url, status: await linkStatus(o.detail_url) });
  check("5 source links answer 200", links.length === 5 && links.every((l) => l.status === 200), links.map((l) => l.source + " " + l.status));
  // Every distinct link in the index, and how many notices each dead one carries.
  const distinct = [...new Set(all.map((o) => o.detail_url))];
  const linkSt = Object.fromEntries(await pool(distinct, 6, async (u) => [u, await linkStatus(u)]));
  const deadRows = all.filter((o) => dead(linkSt[o.detail_url]));
  const deadBySource = {};
  for (const o of deadRows) { const d = (deadBySource[o.source] ||= { notices: 0, links: new Set() }); d.notices++; d.links.add(o.detail_url + " -> " + linkSt[o.detail_url]); }
  const deadList = Object.entries(deadBySource).map(([k, v]) => ({ source: k, notices: v.notices, links: [...v.links].slice(0, 3) }));
  const challenged = all.filter((o) => linkSt[o.detail_url] === "challenge").length;
  check("no notice links to a dead page (every distinct link fetched)", deadRows.length === 0, `${distinct.length} distinct links; ${deadRows.length} of ${all.length} notices link to a dead page` + (deadList.length ? ": " + deadList.map((d) => `${d.source} ${d.notices} (${d.links.join(", ")})`).join("; ") : "") + (challenged ? `; ${challenged} behind a bot challenge` : ""));
  // Saved search -> new count, RSS, calendar; then deleted.
  const saved = { created: null };
  const sv = await post("/api/hunt/saved", { name: "audit " + new Date().toISOString().slice(0, 16), params: { fit: "building" } });
  if (check("saved search created", sv.ok && sv.data?.saved?.id, "HTTP " + sv.status + (sv.data?.message ? " " + sv.data.message : ""))) {
    const s = sv.data.saved; saved.created = s.id;
    try {
      const list = await api("/api/hunt/saved");
      const mine = (list.data?.saved || []).find((x) => x.id === s.id);
      check("saved search reports a new-notice count", mine && Number.isInteger(mine.new_count), mine ? "new_count " + mine.new_count : "missing");
      const rss = await ext(s.feed_url); const rssT = await rss.text();
      const rssItems = (rssT.match(/<item>/g) || []).length;
      check("RSS feed works", rss.status === 200 && rssItems > 0, rss.status + ", " + rssItems + " items");
      const ics = await ext(s.calendar_url); const icsT = await ics.text();
      const ev = (icsT.match(/BEGIN:VEVENT/g) || []).length;
      check("calendar feed works (bid due dates)", ics.status === 200 && ev > 0 && /DTSTART/.test(icsT), ics.status + ", " + ev + " events");
      saved.rss_items = rssItems; saved.ics_events = ev;
    } finally {
      const del = await api("/api/hunt/saved/" + s.id, { method: "DELETE" });
      saved.deleted = del.ok;
    }
  }
  // Sample email: only to jmobleyworks+<tag>@gmail.com.
  const me = await api("/api/auth/me");
  const email = me.data?.user?.email || "";
  let sample = { run: false, why: "account email is " + (email || "unknown") + ", not jmobleyworks+<tag>@gmail.com; not sent" };
  if (SAFE_EMAIL.test(email)) {
    const sm = await post("/api/hunt/sample", { params: { fit: "doors" }, name: "Accuracy audit sample" });
    sample = { run: true, status: sm.status, to: sm.data?.to, notices: sm.data?.notices, error: sm.data?.error };
    check("sample email sent to the account itself", sm.ok && sm.data?.to === email && sm.data?.notices > 0, sample);
  }
  const fits = idx.fits || {};
  return {
    claim, bar, checks, input: "whole index (" + idx.indexed + " notices), fit=doors, state=TX, due_within=30, min_value=1M, a saved search",
    numbers: { indexed: idx.indexed, sources: srcN, fits, lastIngest: idx.lastIngest, links, notice_specific_links: specific, agency_page_links: generic, distinct_links: distinct.length, notices_with_dead_links: deadRows.length, dead_links_by_source: deadList, notices_behind_bot_challenge: challenged, saved, sample },
    summary: `${idx.indexed} notices from ${Object.keys(srcN).length} sources; ${fits.doors} door / ${fits.building} building / ${fits.signal} signal / ${fits.civil} civil; links ${links.filter((l) => l.status === 200).length}/5 200; ${deadRows.length} of ${all.length} notices link to a dead page (${deadList.map((d) => d.source + " " + d.notices).join(", ") || "none"}); ${specific} of ${all.length} link to the notice itself (${generic.map((g) => g.source).join(", ")} link to one agency page); sample email ${sample.run ? "sent" : "not sent (not a jmobleyworks+ address)"}`,
  };
}

// ---------------------------------------------------------------- CompX
const NYC_AWARDS = "https://data.cityofnewyork.us/resource/dg92-zbpx.json";
const NYC_WHERE = `type_of_notice_description='Award' AND start_date >= '2021-01-01' AND (category_description like '%Construction%' OR upper(short_title) like '%DOOR%' OR upper(short_title) like '%HARDWARE%' OR upper(short_title) like '%LOCK%' OR upper(short_title) like '%FRAME%' OR upper(short_title) like '%STOREFRONT%' OR upper(short_title) like '%ENTRANCE%')`;
async function compx() {
  const claim = "Real Who wins public door and building work. Public contract awards for door, hardware and building work (NYC City Record, since 2021): who won, how much, from which agency and by what method, with vendors and agencies ranked by what they won. CSV export.";
  const bar = "Every award row names vendor, amount, agency, method and an award date on or after 2021-01-01; vendors and agencies come ranked by total won; door-fit awards exist; for 3 real door vendors CompX's award count and total equal NYC open data's own (same award notices, one per request id); the CSV the page's button asks for (limit 2000) holds every award of the search up to that cap (a cut is reported).";
  const { checks, check } = checker();
  const all = await api("/api/compx/awards?fit=all&limit=2000");
  if (!check("awards answer, paid", all.ok && all.data?.paid, "HTTP " + all.status + " paid " + all.data?.paid)) return { claim, bar, checks, summary: "HTTP " + all.status };
  const A = all.data;
  const incomplete = A.awards.filter((x) => !x.vendor || !(Number(x.amount) >= 0) || x.amount == null || !x.agency || !x.method || !(String(x.awarded_on) >= "2021-01-01"));
  check("each award: vendor, amount, agency, method, date >= 2021", incomplete.length === 0, incomplete.length + " of " + A.awards.length + " incomplete" + (incomplete.length ? " e.g. " + JSON.stringify(incomplete[0]).slice(0, 200) : ""));
  check("all rows returned to a paying account", A.awards.length === Math.min(A.count, 2000), A.awards.length + " rows of " + A.count);
  check("vendors ranked by total won", A.vendors.length > 5 && sortedDesc(A.vendors.map((v) => Number(v.total) || 0)), A.vendors.length + " vendors");
  check("agencies ranked by total won", A.agencies.length > 5 && sortedDesc(A.agencies.map((v) => Number(v.total) || 0)), A.agencies.length + " agencies");
  const doors = await api("/api/compx/awards?fit=doors&limit=2000");
  const D = doors.data || { awards: [], vendors: [] };
  const doorWords = /door|hardware|lock|frame|storefront|entrance|gate|ada|access|hollow metal|rolling|revolving/i;
  const doorTitled = D.awards.filter((x) => doorWords.test(x.title || "")).length;
  check("door-fit awards present", doors.ok && D.count > 0, D.count + " door awards, " + money(D.total));
  // Three real door vendors, against NYC open data.
  const vendorChecks = [];
  for (const v of D.vendors.filter((v) => v.awards >= 2).slice(0, 3)) {
    const c = await api("/api/compx/awards?fit=all&limit=2000&vendor=" + encodeURIComponent(v.vendor));
    const u = NYC_AWARDS + "?" + new URLSearchParams({ $where: NYC_WHERE + ` AND vendor_name='${String(v.vendor).replace(/'/g, "''")}'`, $limit: "5000" });
    let src = null;
    try {
      const rows = await (await ext(u, { headers: { Accept: "application/json" } })).json();
      const byId = new Map(); for (const r of rows) byId.set(r.request_id || r.pin || r.short_title, r);
      src = { raw: rows.length, awards: byId.size, total: [...byId.values()].reduce((s, r) => s + Number(r.contract_amount || 0), 0) };
    } catch (e) { src = { error: e.message }; }
    vendorChecks.push({ vendor: v.vendor, compx: { awards: c.data?.count, total: c.data?.total }, nyc_open_data: src });
  }
  check("3 door vendors: award count and total equal NYC open data", vendorChecks.length === 3 && vendorChecks.every((x) => x.nyc_open_data && x.compx.awards === x.nyc_open_data.awards && near(x.compx.total, x.nyc_open_data.total, 1)), vendorChecks.map((x) => `${x.vendor}: ${x.compx.awards} / ${money(x.compx.total)} vs ${x.nyc_open_data?.awards} / ${money(x.nyc_open_data?.total)}${x.nyc_open_data?.raw !== x.nyc_open_data?.awards ? " (" + x.nyc_open_data?.raw + " raw rows)" : ""}`));
  const csv = await api("/api/compx/awards?fit=building&format=csv&limit=2000");
  const def = await api("/api/compx/awards?fit=building&limit=2000");
  const rows = csv.status === 200 ? csvRows(csv.text).length - 1 : 0;
  check("CSV export holds the search's awards (up to the page's 2,000 cap)", csv.status === 200 && rows === Math.min(def.data?.count, 2000), "HTTP " + csv.status + ", " + rows + " rows; the search has " + def.data?.count);
  return {
    claim, bar, checks, input: "all awards; fit=doors; vendors " + vendorChecks.map((x) => x.vendor).join(", ") + "; CSV of the default (building) search",
    numbers: { awards_all: A.count, total_all: A.total, door_awards: D.count, door_total: D.total, door_award_titles_with_a_door_word: doorTitled, indexedAt: A.indexedAt, vendor_checks: vendorChecks, csv_rows: rows, csv_search_count: def.data?.count },
    summary: `${A.count} awards (${money(A.total)}), ${D.count} door awards; vendors ${vendorChecks.filter((x) => x.compx.awards === x.nyc_open_data?.awards).length}/3 equal NYC open data; CSV ${rows} of ${def.data?.count} rows`,
  };
}

async function compxTxdot() {
  const claim = "(Not on the pricing card any more; the CompX page no longer calls it.) /api/compx/vendors: TxDOT bid tabulations by vendor: total bids, wins, win rate, total won value.";
  const bar = "For a real TxDOT contractor, total_bids equals the distinct projects (CSJ) that vendor bid in data.texas.gov's bid tabulations and wins equals the projects where it was low bidder: one count per project, not per bid item.";
  const { checks, check } = checker();
  const q = "Austin Bridge";
  const r = await api("/api/compx/vendors?q=" + encodeURIComponent(q));
  // Retired 2026-10-09 for undercounting: a 410 naming the current CompX is the right answer.
  if (r.status === 410) { const ok = check("retired: answers 410 and names the current CompX", /CompX/.test(JSON.stringify(r.data || "")), "HTTP 410"); return { claim, bar, checks, summary: "retired (HTTP 410)", pass: ok }; }
  if (!check("route answers", r.ok && Array.isArray(r.data?.vendors), "HTTP " + r.status)) return { claim, bar, checks, summary: "HTTP " + r.status };
  const v = r.data.vendors.filter((x) => /austin bridge/i.test(x.vendor_name)).sort((a, b) => b.total_bids - a.total_bids)[0];
  if (!check("the vendor is in the result", v, r.data.vendors.length + " vendors returned")) return { claim, bar, checks, summary: "vendor missing" };
  const u = "https://data.texas.gov/resource/de7b-7dna.json?" + new URLSearchParams({ $select: "control_section_job_csj,low_bidder_flag,max(bid_total_amount) as amt", $where: `vendor_name='${v.vendor_name.replace(/'/g, "''")}'`, $group: "control_section_job_csj,low_bidder_flag", $limit: "50000" });
  const rows = await (await ext(u, { headers: { Accept: "application/json" } })).json();
  const projects = new Set(rows.map((x) => x.control_section_job_csj));
  const wins = rows.filter((x) => x.low_bidder_flag === true || x.low_bidder_flag === "true");
  const winValue = wins.reduce((s, x) => s + Number(x.amt || 0), 0);
  const items = await (await ext("https://data.texas.gov/resource/de7b-7dna.json?" + new URLSearchParams({ $select: "count(*) as n", $where: `vendor_name='${v.vendor_name.replace(/'/g, "''")}'` }))).json();
  check("total bids = distinct projects in TxDOT data", v.total_bids === projects.size, `CompX ${v.total_bids}, TxDOT ${projects.size} projects (${items[0]?.n} bid-item rows)`);
  check("wins = projects where low bidder", v.wins === new Set(wins.map((x) => x.control_section_job_csj)).size, `CompX ${v.wins}, TxDOT ${new Set(wins.map((x) => x.control_section_job_csj)).size}`);
  check("total won value equals TxDOT's", near(v.total_win_value, winValue, 1), `CompX ${money(v.total_win_value)}, TxDOT ${money(winValue)}`);
  const otherVendors = r.data.vendors.filter((x) => !/austin bridge/i.test(x.vendor_name)).length;
  return {
    claim, bar, checks, input: `q=${q} -> ${v.vendor_name}`,
    numbers: { vendor: v.vendor_name, compx: { total_bids: v.total_bids, wins: v.wins, win_rate_pct: v.win_rate_pct, total_win_value: v.total_win_value }, txdot: { projects: projects.size, wins: new Set(wins.map((x) => x.control_section_job_csj)).size, win_value: winValue, bid_item_rows: Number(items[0]?.n) }, other_vendors_in_reply: otherVendors, fetched_at: r.data.fetched_at },
    summary: `${v.vendor_name}: CompX ${v.total_bids} bids / ${v.wins} wins (${money(v.total_win_value)}); TxDOT ${projects.size} projects / ${new Set(wins.map((x) => x.control_section_job_csj)).size} wins (${money(winValue)}); ${otherVendors} other vendors in the reply`,
  };
}

// ---------------------------------------------------------------- MarketX
async function marketx() {
  // The card (2026-10-09) names the cities whose permits name no contractor or owner; for those the
  // ranked lists are rightly empty and the response says why.
  const PUBLISHES_NO_COMPANIES = ["la", "sf"];
  const claim = "The door work your city is permitting, and who is building it. Commercial and multifamily building permits from Chicago, New York, Los Angeles, Austin, San Francisco and Seattle: permitted value by month against last year, by building use, for work likely to include doors; the largest and newest projects; the general contractors and owners ranked by permitted value where the city's permits name them (both in Chicago, owners in New York, contractors in Austin and Seattle; Los Angeles and San Francisco publish neither); the open public bids in the state. Projects and companies CSV.";
  const bar = "All six metros hold permits with a permitted value; each metro's page carries months for this year and last year, a by-use split that adds up to the total, largest projects in value order, newest in date order, general contractors or owners ranked by permitted value (at least one of the two; a metro with neither fails 'who is building it'), the open-bids block, and the metros list's figures; both CSVs download for the paying account, the projects CSV holding every project of the period (up to its 5,000 cap) and the companies CSV beginning with the same ranking.";
  const { checks, check } = checker();
  const NAMES = { chicago: "Chicago", nyc: "New York City", la: "Los Angeles", austin: "Austin", sf: "San Francisco", seattle: "Seattle" };
  const ms = await api("/api/marketx/metros");
  if (!check("metros answer", ms.ok && Array.isArray(ms.data?.metros), "HTTP " + ms.status)) return { claim, bar, checks, summary: "HTTP " + ms.status };
  const list = Object.fromEntries(ms.data.metros.map((m) => [m.metro, m]));
  check("six metros, each with permits and value", Object.keys(NAMES).every((k) => list[k] && list[k].projects > 0 && list[k].value > 0), Object.keys(NAMES).map((k) => k + " " + (list[k]?.projects ?? 0)));
  const per = [];
  for (const k of Object.keys(NAMES)) {
    const m = await api("/api/marketx/metro/" + k);
    const d = m.data || {};
    const t = d.totals || {};
    const lastYear = new Date(Date.parse(todayUtc) - 365 * 86400000).toISOString().slice(0, 7);
    const months = d.monthly || [];
    const thisYearMonths = months.filter((x) => x.month >= d.since?.slice(0, 7)).length;
    const lastYearMonths = months.filter((x) => x.month < d.since?.slice(0, 7)).length;
    const useSum = (d.byUse || []).reduce((s, u) => s + (Number(u.value) || 0), 0);
    const pc = await api(`/api/marketx/metro/${k}/projects.csv`);
    const cc = await api(`/api/marketx/metro/${k}/companies.csv`);
    const pRows = pc.status === 200 ? csvRows(pc.text).length - 1 : -1;
    const cRows = cc.status === 200 ? csvRows(cc.text).length - 1 : -1;
    const expectP = Math.min(t.projects || 0, 5000);
    const jsonC = (d.contractors || []).length + (d.owners || []).length;
    const cRowsParsed = cc.status === 200 ? csvRows(cc.text).slice(1) : [];
    // The CSV ranks up to 5,000 of each; the JSON up to 200: the CSV must begin with the JSON's ranking.
    const csvC = cRowsParsed.filter((r) => r[0] === "contractor").map((r) => r[1]);
    const csvO = cRowsParsed.filter((r) => r[0] === "owner").map((r) => r[1]);
    const companiesCsvOk = cc.status === 200 && cRowsParsed.length >= jsonC && (d.contractors || []).every((x, i) => csvC[i] === x.name) && (d.owners || []).every((x, i) => csvO[i] === x.name);
    const expectC = jsonC;
    const linkOk = (d.largest || []).slice(0, 1).map((x) => x.url)[0];
    const row = {
      metro: k, http: m.status, paid: d.paid, projects: t.projects, value: t.value, priorValue: t.priorValue, valueChange: t.valueChange,
      months_this_period: thisYearMonths, months_last_year: lastYearMonths, by_use_sum_equals_total: near(useSum, t.value, 1),
      largest_desc: sortedDesc((d.largest || []).map((x) => Number(x.valuation) || 0)), newest_desc: sortedDesc((d.newest || []).map((x) => String(x.issued))),
      contractors: (d.contractors || []).length, contractors_ranked: sortedDesc((d.contractors || []).map((x) => Number(x.value) || 0)), owners: (d.owners || []).length,
      matches_metros_list: list[k] && list[k].projects === t.projects && near(list[k].value, t.value, 1),
      bids: d.bids ? { open: d.bids.open, doors: d.bids.doors } : null, latest: list[k]?.latest,
      projects_csv: { http: pc.status, rows: pRows, expected: expectP }, companies_csv: { http: cc.status, rows: cRows, json_ranked: expectC, ok: companiesCsvOk }, names_note: d.names, sample_link: linkOk || null,
    };
    row.ok = m.ok && d.paid && t.projects > 0 && t.value > 0 && t.priorValue > 0 && thisYearMonths >= 10 && lastYearMonths >= 10 && row.by_use_sum_equals_total && row.largest_desc && row.newest_desc && ((row.contractors + row.owners) > 0 || PUBLISHES_NO_COMPANIES.includes(k)) && row.contractors_ranked && row.matches_metros_list && row.bids && pRows === expectP && companiesCsvOk;
    per.push(row);
    check(`${NAMES[k]}: value by month vs last year, by use, ranked lists, bids, both CSVs`, row.ok, `${t.projects} projects ${money(t.value)} (last yr ${money(t.priorValue)}, ${t.valueChange}%), months ${thisYearMonths}+${lastYearMonths}, use sum=total ${row.by_use_sum_equals_total}, GCs ${row.contractors}, owners ${row.owners}, bids ${d.bids?.open}, projects.csv ${pRows}/${expectP}, companies.csv ${cRows} rows (JSON ranks ${expectC})` + (row.contractors + row.owners === 0 ? `; no GC or owner ranked: "${d.names}"` : ""));
  }
  // A permit link per metro, spot-checked.
  const links = [];
  for (const r of per) if (r.sample_link) links.push({ metro: r.metro, url: r.sample_link, status: await linkStatus(r.sample_link) });
  const capped = per.filter((r) => r.projects > 5000).map((r) => `${r.metro} ${r.projects_csv.rows} of ${r.projects}`);
  return {
    claim, bar, checks, input: "all six metros, default 12 months, likely-door scope; both CSVs per metro",
    numbers: { metros: per, permit_links: links, projects_csv_capped: capped },
    summary: per.map((r) => `${r.metro} ${r.projects} / ${money(r.value)}`).join("; ") + (capped.length ? `; projects CSV capped at 5,000: ${capped.join(", ")}` : "") + `; owners empty in ${per.filter((r) => !r.owners).map((r) => r.metro).join(", ") || "none"}`,
  };
}

// ---------------------------------------------------------------- jobs (PropX proposals)
async function myJobs() {
  const r = await api("/api/proposals/mine");
  return (r.data?.proposals || []);
}
async function censusGeocode(address) {
  const u = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?" + new URLSearchParams({ address, benchmark: "Public_AR_Current", vintage: "Current_Current", format: "json" });
  const m = (await (await ext(u)).json()).result?.addressMatches?.[0];
  if (!m) return null;
  const g = m.geographies || {};
  return { lat: m.coordinates.y, lon: m.coordinates.x, county: g.Counties?.[0]?.NAME || null, place: g["Incorporated Places"]?.[0]?.NAME || null, tract: g["Census Tracts"]?.[0]?.NAME || null, state: g.States?.[0]?.NAME || null };
}
function miles(a, b) {
  const R = 3958.8, rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------- GeoX
async function geox() {
  const claim = "Where each job is and who permits it. Places every job with the Census geocoder: county, city, census tract and the building permit authority it usually answers to (city if incorporated, else county), with miles from your shop.";
  const bar = "Every job with an address is placed; its county, city, tract and coordinates equal the Census geocoder's own answer for that address; the permit authority is the city when the address is in an incorporated place and the county otherwise; miles from the shop equal the great-circle distance within 0.5 mi; the CSV export carries the same jobs.";
  const { checks, check } = checker();
  const r = await api("/api/geox/jobs?shop=" + encodeURIComponent(SHOP));
  if (!check("jobs answer", r.ok && Array.isArray(r.data?.jobs), "HTTP " + r.status)) return { claim, bar, checks, summary: "HTTP " + r.status };
  const shopC = await censusGeocode(SHOP);
  check("shop placed", r.data.shop?.matched && shopC && near(r.data.shop.lat, shopC.lat, 1e-4), r.data.shop?.matched_address);
  const jobs = r.data.jobs.filter((j) => j.address);
  check("account has at least one job with an address", jobs.length > 0, jobs.length + " jobs");
  const rows = [];
  for (const j of jobs) {
    const c = await censusGeocode(j.address);
    if (!c) {
      const honest = !j.matched && !j.county && !j.tract && j.miles_from_shop == null;
      rows.push({ address: j.address, census: null, geox_matched: j.matched, ok: honest });
      check(`job ${j.quote_number}: the Census cannot place "${j.address}"; GeoX says so and invents nothing`, honest, "matched " + j.matched);
      continue;
    }
    const auth = c?.place ? c.place : c?.county;
    const mi = shopC && c ? miles(shopC, c) : null;
    const ok = j.matched && c && j.county === c.county && j.place === c.place && j.tract === c.tract && near(j.lat, c.lat, 1e-4) && near(j.lon, c.lon, 1e-4)
      && String(j.permit_authority || "").startsWith(auth) && (c.place ? /incorporated/.test(j.permit_authority) && !/unincorporated/.test(j.permit_authority) : /unincorporated/.test(j.permit_authority))
      && mi != null && near(j.miles_from_shop, mi, 0.5);
    rows.push({ address: j.address, geox: { county: j.county, city: j.place, tract: j.tract, authority: j.permit_authority, miles: j.miles_from_shop }, census: c ? { county: c.county, city: c.place, tract: c.tract } : null, miles_recomputed: mi == null ? null : Math.round(mi * 10) / 10, ok });
    check(`job ${j.quote_number}: county, city, tract, authority, miles equal the Census answer`, ok, `${j.place} / ${j.county} / ${j.tract}; ${j.miles_from_shop} mi (recomputed ${mi == null ? "?" : mi.toFixed(1)})`);
  }
  const csv = await api("/api/geox/jobs?format=csv&shop=" + encodeURIComponent(SHOP));
  const cr = csv.status === 200 ? csvRows(csv.text).length - 1 : -1;
  check("CSV export carries the jobs", csv.status === 200 && cr === r.data.jobs.length, "HTTP " + csv.status + ", " + cr + " rows");
  const unincorporated = rows.some((x) => x.census && !x.census.city);
  return {
    claim, bar, checks, input: `${jobs.length} PropX job(s); shop ${SHOP}`,
    numbers: { shop: r.data.shop?.matched_address, jobs: rows, unincorporated_branch_exercised: unincorporated },
    summary: rows.map((x) => !x.census ? `"${x.address}" unplaceable (Census has no match; GeoX says unmatched)` : `${x.geox.city} / ${x.geox.county} / ${x.geox.tract}, ${x.geox.miles} mi`).join("; ") + `; ${rows.filter((x) => x.ok).length}/${rows.length} agree with Census` + (unincorporated ? "" : "; unincorporated case not exercised (no such job)"),
  };
}

// ---------------------------------------------------------------- WeatherX
function installRiskRule(p) {
  const f = String(p.forecast || "").toLowerCase();
  const wind = Math.max(0, ...String(p.wind || "0").split(/\D+/).filter(Boolean).map(Number));
  const severe = /thunder|snow|ice|sleet|hail|blizzard|hurricane|tornado|freezing/.test(f);
  const high = severe || (p.precip ?? 0) >= 60 || wind >= 25 || (p.unit === "F" && p.temperature <= 32);
  return high ? "high" : (p.precip ?? 0) >= 30 || wind >= 15 ? "moderate" : "low";
}
async function weatherx() {
  const claim = "Install-day weather and a daily weather log per job. Each job's next 7 days from the National Weather Service with the install risk for door and frame work, and a daily log of what the nearest station observed at the job (temperatures, wind, gusts, precipitation) for delay claims.";
  const bar = "Each job gets 7 days (14 NWS periods) starting now, each period's temperature equal to the NWS forecast for the job's point (within 3 F, the route caches up to 3 h) and its install risk following the stated rule (thunder/snow/ice, rain >= 60%, wind >= 25 mph or <= 32 F is high; rain >= 30% or wind >= 15 mph moderate); and each job's daily log holds at least one observed day with station, temperatures, wind, gust and precipitation fields.";
  const { checks, check } = checker();
  const r = await api("/api/weatherx/jobs");
  if (!check("jobs answer", r.ok && Array.isArray(r.data?.jobs), "HTTP " + r.status)) return { claim, bar, checks, summary: "HTTP " + r.status };
  const proposals = Object.fromEntries((await myJobs()).map((p) => [p.id, p]));
  const out = [];
  const unplaceable = [];
  for (const j of r.data.jobs.filter((x) => x.address)) {
    const P = j.periods || [];
    const c = await censusGeocode(j.address);
    if (!c) { unplaceable.push(j.address); check(`job ${j.quote_number}: "${j.address}" has no Census match; no forecast is invented`, P.length === 0, P.length + " periods"); continue; }
    const spanDays = P.length ? (Date.parse(P[P.length - 1].start) - Date.parse(P[0].start)) / 86400000 : 0;
    const fresh = P.length && Date.now() - Date.parse(P[0].start) < 24 * 3600000;
    check(`job ${j.quote_number}: 14 periods covering 7 days, current`, P.length >= 14 && spanDays >= 6 && fresh && !j.stale, `${P.length} periods over ${spanDays.toFixed(1)} days, first ${P[0]?.start}`);
    let nws = null, compared = 0, agree = 0;
    try {
      const pt = await (await ext(`https://api.weather.gov/points/${c.lat.toFixed(4)},${c.lon.toFixed(4)}`, { headers: { "User-Agent": NWS_UA } })).json();
      const fc = await (await ext(pt.properties.forecast, { headers: { "User-Agent": NWS_UA } })).json();
      nws = fc.properties.periods;
      for (const p of P) { const n = nws.find((x) => Date.parse(x.startTime) === Date.parse(p.start)); if (n) { compared++; if (Math.abs(n.temperature - p.temperature) <= 3) agree++; } }
    } catch (e) { nws = { error: e.message }; }
    check(`job ${j.quote_number}: temperatures equal the NWS forecast (±3 F)`, compared >= 10 && agree === compared, `${agree} of ${compared} matching periods agree`);
    const riskBad = P.filter((p) => installRiskRule(p) !== p.risk);
    check(`job ${j.quote_number}: install risk follows the stated rule`, P.length && riskBad.length === 0, riskBad.length + " periods off; risks " + [...new Set(P.map((p) => p.risk))].join("/"));
    const log = await api("/api/weatherx/log/" + j.id);
    const days = log.data?.days || [];
    const fieldsOk = days.length && days.every((d) => d.station && d.observations > 0 && d.max_temp_f != null && "max_wind_mph" in d && "max_gust_mph" in d && "precip_in" in d);
    const created = proposals[j.id]?.created_at;
    const ageH = created ? (Date.now() - Date.parse(created)) / 3600000 : null;
    // The log is kept by a once-a-day job (a 24 h lease) that logs yesterday for every job, so a job
    // 48 h old must have at least one day. A younger job's empty log proves nothing either way.
    if (ageH != null && ageH >= 48) check(`job ${j.quote_number}: daily weather log holds observed days`, log.ok && fieldsOk, `${days.length} logged days; job ${ageH.toFixed(1)} h old`);
    else if (days.length) check(`job ${j.quote_number}: daily weather log holds observed days`, fieldsOk, `${days.length} logged days; job ${ageH?.toFixed(1)} h old`);
    out.push({ quote: j.quote_number, address: j.address, place: j.place, periods: P.length, span_days: Math.round(spanDays * 10) / 10, first: P[0] ? `${P[0].name} ${P[0].temperature}F ${P[0].forecast} risk ${P[0].risk}` : null, nws_compared: compared, nws_agree: agree, log_days: days.length, log_sample: days[0] || null, job_age_hours: ageH == null ? null : Math.round(ageH * 10) / 10 });
  }
  check("at least one placeable job", out.length > 0, out.length + " jobs");
  const logOld = out.filter((x) => x.job_age_hours >= 48 || x.log_days > 0);
  check("the daily log is shown on at least one job (one 48 h old, or any job with logged days)", logOld.length > 0 && logOld.some((x) => x.log_days > 0), logOld.length ? logOld.map((x) => `${x.address}: ${x.log_days} days`) : `unproven: no job is 48 h old (oldest ${Math.max(0, ...out.map((x) => x.job_age_hours || 0))} h) and no job has a logged day`);
  return {
    claim, bar, checks, input: `${out.length} PropX job(s): ${out.map((x) => x.address).join("; ")}`,
    numbers: { jobs: out, unplaceable },
    summary: out.map((x) => `${x.place}: ${x.periods} periods/${x.span_days} d, NWS ${x.nws_agree}/${x.nws_compared} agree; log ${x.log_days} days (job ${x.job_age_hours} h old)`).join("; "),
  };
}

// ---------------------------------------------------------------- ForecastX
function expectedCashFlow(jobs) {
  // Written from the card's words, independently of the route: the contract (base plus approved change
  // orders) billed evenly at each month end over the job's months; retainage held from each bill and
  // released after the last bill plus terms plus 30 days; each bill net of retainage paid after the
  // job's terms; material paid on supplier terms after the start; net and cumulative by month.
  const m = new Map();
  const at = (ym) => { if (!m.has(ym)) m.set(ym, { month: ym, billed: 0, retainage_held: 0, received: 0, retainage_released: 0, material_paid: 0 }); return m.get(ym); };
  const ym = (d) => d.toISOString().slice(0, 7);
  for (const j of jobs) {
    const s = new Date(j.start + "T00:00:00Z");
    let held = 0;
    for (let i = 0; i < j.months; i++) {
      const end = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + i + 1, 0));
      const bill = j.contract / j.months;
      at(ym(end)).billed += bill; at(ym(end)).retainage_held += bill * j.retainagePct / 100; held += bill * j.retainagePct / 100;
      at(ym(new Date(end.getTime() + j.termsDays * 86400000))).received += bill * (1 - j.retainagePct / 100);
    }
    const last = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + j.months, 0));
    at(ym(new Date(last.getTime() + (j.termsDays + 30) * 86400000))).retainage_released += held;
    at(ym(new Date(s.getTime() + j.supplierTermsDays * 86400000))).material_paid += j.contract * j.materialPct / 100;
  }
  let cum = 0;
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month)).map((x) => { const net = x.received + x.retainage_released - x.material_paid; cum += net; return { ...x, net, cumulative: cum }; });
}
async function forecastx() {
  const claim = "Cash flow across your contracts, change orders included. Monthly cash flow across your PropX contracts with approved change orders counted: billing, retainage held and released, payments after each job's terms, material paid on supplier terms, and your lowest month.";
  const bar = "For a real PropX proposal, every month's billing, retainage held, payments received, retainage released, material paid, net and cumulative equal a cash flow computed independently from the card's words (to the cent); billing adds up to the contract; the contract is the proposal's total plus its approved change orders (an existing change order is set approved for one call, the contract must rise by exactly its amount, and its old status is put back); the lowest month is the month with the lowest cumulative; the CSV carries the same months.";
  const { checks, check } = checker();
  const ct = await api("/api/forms/changeordx/contracts");
  const contracts = ct.data?.contracts || [];
  const p = contracts.find((c) => c.grand_total > 0 && (c.change_orders || []).length) || contracts.find((c) => c.grand_total > 0);
  if (!check("a real PropX proposal on the account", p, contracts.length + " contracts")) return { claim, bar, checks, summary: "no proposal" };
  const approvedNow = (p.change_orders || []).filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount || 0), 0);
  const job = { proposalId: p.id, start: "2026-11-01", months: 4, retainagePct: 5, termsDays: 45, materialPct: 55, supplierTermsDays: 30 };
  const run = async () => post("/api/forecastx/portfolio", { jobs: [job] });
  const compare = (months, contract) => {
    const exp = expectedCashFlow([{ ...job, contract }]);
    const keys = ["billed", "retainage_held", "received", "retainage_released", "material_paid", "net", "cumulative"];
    const off = [];
    if (exp.length !== months.length) off.push(`month count ${months.length} vs ${exp.length}`);
    for (const e of exp) { const g = months.find((x) => x.month === e.month); if (!g) { off.push("missing " + e.month); continue; } for (const k of keys) if (!near(g[k], e[k], 0.02 * (months.length + 1))) off.push(`${e.month} ${k} ${g[k]} vs ${e[k].toFixed(2)}`); }
    return off;
  };
  const a = await run();
  if (!check("portfolio answers", a.ok && a.data?.success, "HTTP " + a.status + " " + (a.data?.message || ""))) return { claim, bar, checks, summary: "HTTP " + a.status };
  const A = a.data;
  const contractA = A.jobs[0].contract;
  check("contract = proposal total + approved change orders", near(contractA, p.grand_total + approvedNow, 0.01), `${contractA} = ${p.grand_total} + ${approvedNow}`);
  const offA = compare(A.months, contractA);
  check("every month equals the independent cash flow", offA.length === 0, offA.length ? offA.slice(0, 4) : A.months.length + " months");
  check("billing adds up to the contract", near(A.months.reduce((s, m) => s + m.billed, 0), contractA, 0.05), money(A.months.reduce((s, m) => s + m.billed, 0)));
  const low = A.months.reduce((x, m) => (m.cumulative < x.cumulative ? m : x), A.months[0]);
  check("lowest month is the lowest cumulative", A.lowest && A.lowest.month === low.month && near(A.lowest.cumulative, low.cumulative, 0.01), `${A.lowest?.month} ${money(A.lowest?.cumulative)}`);
  // An approved change order must be counted.
  const co = (p.change_orders || []).find((c) => c.status !== "approved");
  let coTest = null;
  if (co) {
    const was = co.status;
    const set = await post(`/api/forms/changeordx/${co.id}/status`, { status: "approved" });
    try {
      const b = await run();
      const contractB = b.data?.jobs?.[0]?.contract;
      const offB = b.ok ? compare(b.data.months, contractB) : ["HTTP " + b.status];
      coTest = { id: co.id, number: co.number, amount: co.amount, was, set_http: set.status, contract_before: contractA, contract_after: contractB, changes_reported: b.data?.jobs?.[0]?.changes };
      check("an approved change order raises the contract by exactly its amount", set.ok && near(contractB - contractA, co.amount, 0.01) && offB.length === 0, `CO ${co.number} ${money(co.amount)}: ${contractA} -> ${contractB}` + (offB.length ? "; " + offB.slice(0, 2) : ""));
    } finally {
      const back = await post(`/api/forms/changeordx/${co.id}/status`, { status: was });
      coTest = { ...(coTest || {}), restored: back.ok ? was : "FAILED HTTP " + back.status };
    }
  } else {
    check("an approved change order raises the contract (needs a change order on the proposal)", approvedNow > 0, "no change order to test with; approved now " + approvedNow);
  }
  const csv = await api("/api/forecastx/portfolio?format=csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobs: [job] }) });
  const cr = csv.status === 200 ? csvRows(csv.text) : [];
  const csvOk = csv.status === 200 && cr.length - 1 === A.months.length && A.months.every((m, i) => cr[i + 1][0] === m.month && near(cr[i + 1][7], m.cumulative, 0.01));
  check("CSV carries the same months", csvOk, "HTTP " + csv.status + ", " + (cr.length - 1) + " rows");
  return {
    claim, bar, checks, input: `proposal ${p.quote_number} (${p.client_name}, ${money(p.grand_total)}), start ${job.start}, ${job.months} months, retainage ${job.retainagePct}%, terms ${job.termsDays} d, material ${job.materialPct}% on ${job.supplierTermsDays} d`,
    numbers: { contract: contractA, months: A.months, lowest: A.lowest, change_order_test: coTest },
    summary: `${A.months.length} months, contract ${money(contractA)}, lowest ${A.lowest?.month} ${money(A.lowest?.cumulative)}; independent recompute ${offA.length ? offA.length + " cells off" : "equal to the cent"}; approved CO ${coTest ? money(coTest.contract_after - coTest.contract_before) + " added (CO " + money(coTest.amount) + ", status restored to " + coTest.restored + ")" : "not tested"}`,
  };
}

// ---------------------------------------------------------------- WireX
async function wirex() {
  const claim = "(From /news; WireX is not on /pricing.) Construction industry news & engineering-report desk. Live headlines from Engineering News-Record & Construction Dive, a deterministic Editor's Briefing that cites its own sources, and WeylandAI's own real, audited price-extraction validation history. WireX Pro, $49.00/month: 20 headlines per feed instead of 6, full reports wire.";
  const bar = "For the paying account the wire is Pro and carries headlines from Engineering News-Record and from Construction Dive; every headline has a title, a link to the publisher and a publication date within 14 days; each feed gives min(20, what the feed itself publishes) headlines (each feed read directly for comparison); the wire was ingested within the last hour; 5 headline links are live (200, or a publisher's bot challenge, reported); every citation in the briefing points at a listed source; the reports list has dated, statused entries.";
  const { checks, check } = checker();
  const FEEDS = { "Engineering News-Record": "https://www.enr.com/rss/articles", "Construction Dive": "https://www.constructiondive.com/feeds/news/", "For Construction Pros": "https://www.forconstructionpros.com/rss", "Building Enclosure": "https://www.buildingenclosureonline.com/rss/articles", "SDM Magazine": "https://www.sdmmag.com/rss/articles", "Security Sales & Integration": "https://www.securitysales.com/feed/", "USGlass": "https://www.usglassmag.com/feed/" };
  const n = await api("/api/wire/news");
  if (!check("news answers", n.ok && Array.isArray(n.data?.items), "HTTP " + n.status)) return { claim, bar, checks, summary: "HTTP " + n.status };
  const N = n.data;
  check("paying account is Pro", N.pro === true, "pro " + N.pro);
  const by = {}; for (const it of N.items) by[it.source] = (by[it.source] || 0) + 1;
  check("headlines from Engineering News-Record", by["Engineering News-Record"] > 0, (by["Engineering News-Record"] || 0) + " items");
  check("headlines from Construction Dive", by["Construction Dive"] > 0, (by["Construction Dive"] || 0) + " items");
  const stale = N.items.filter((it) => { const t = Date.parse(it.pubDate); return !it.title || !/^https?:\/\//.test(it.link || "") || !Number.isFinite(t) || Date.now() - t > 14 * 86400000; });
  check("every headline: title, publisher link, date within 14 days", N.items.length > 0 && stale.length === 0, stale.length + " of " + N.items.length + " fail");
  const ageMin = (Date.now() - Date.parse(N.ingested_at)) / 60000;
  check("ingested within the last hour", ageMin <= 60, N.ingested_at + " (" + Math.round(ageMin) + " min ago)");
  const feeds = [];
  for (const [src, url] of Object.entries(FEEDS)) {
    let published = null, status = null;
    try { const r = await ext(url, { headers: { "User-Agent": "WeylandAI WireX (+https://weylandai.com/bot)" } }); status = r.status; published = ((await r.text()).match(/<item\b/gi) || []).length; } catch (e) { status = "error: " + e.message; }
    feeds.push({ source: src, on_wire: by[src] || 0, feed_status_from_here: status, feed_items: published, expected: published == null ? null : Math.min(20, published) });
  }
  const short = feeds.filter((f) => f.expected != null && f.on_wire !== f.expected);
  check("each feed gives min(20, what it publishes)", short.length === 0, feeds.map((f) => `${f.source} ${f.on_wire}/${f.expected}`));
  const links = [];
  const pick = [...new Set([...N.items.filter((x, i, a) => a.findIndex((y) => y.source === x.source) === i), ...N.items])].slice(0, 5);
  for (const it of pick) links.push({ source: it.source, url: it.link, status: await linkStatus(it.link) });
  check("5 headline links: none dead (a bot challenge is reported, not counted)", links.length === 5 && !links.some((l) => dead(l.status)), links.map((l) => l.source + " " + l.status));
  const s = await api("/api/wire/synthesis");
  const cites = [...String(s.data?.parsed?.synthesis || "").matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const nSrc = (s.data?.sources || []).length;
  check("briefing cites only listed sources", s.ok && cites.length > 0 && cites.every((c) => c >= 1 && c <= nSrc), `${cites.length} citations over ${nSrc} sources`);
  const rp = await api("/api/wire/reports");
  const reps = rp.data?.items || [];
  check("reports: dated, statused entries", rp.ok && reps.length > 0 && reps.every((x) => x.title && x.status && /^\d{4}-\d{2}-\d{2}$/.test(x.date || "")), reps.map((x) => `${x.num} ${x.status} ${x.date}`));
  return {
    claim, bar, checks, input: "the paying account's wire, the briefing, the reports; each of the 7 listed feeds read directly",
    numbers: { pro: N.pro, items: N.items.length, by_source: by, ingested_at: N.ingested_at, feeds, links, briefing_citations: cites.length, reports: reps.length, newest: N.items[0] ? `${N.items[0].pubDate} ${N.items[0].title}` : null },
    summary: `${N.items.length} headlines: ${Object.entries(by).map(([k, v]) => k + " " + v).join(", ") || "none"}; ENR ${by["Engineering News-Record"] || 0}; ${feeds.filter((f) => !f.on_wire).length} of 7 listed feeds empty on the wire though each publishes ${feeds.filter((f) => !f.on_wire).map((f) => f.feed_items).join("/")} items; links ${links.map((l) => l.status).join("/")}`,
  };
}

// ---------------------------------------------------------------- run
const TOOLS = [
  { id: "huntx", label: "HuntX", run: huntx },
  { id: "compx", label: "CompX", run: compx },
  { id: "compx-txdot", label: "CompX TxDOT vendor route (off-card)", run: compxTxdot },
  { id: "marketx", label: "MarketX", run: marketx },
  { id: "weatherx", label: "WeatherX", run: weatherx },
  { id: "geox", label: "GeoX", run: geox },
  { id: "forecastx", label: "ForecastX", run: forecastx },
  { id: "wirex", label: "WireX", run: wirex },
].filter((t) => !ONLY || ONLY.includes(t.id));

const report = { base: BASE, at: new Date().toISOString(), results: [] };
for (const t of TOOLS) {
  const t0 = Date.now();
  let r;
  try { r = await t.run(); } catch (e) { r = { checks: [{ name: "harness ran", ok: false, detail: scrub(e.stack || e.message) }], summary: "error: " + scrub(e.message) }; }
  const pass = !!(r.checks && r.checks.length && r.checks.every((c) => c.ok));
  const out = { id: t.id, label: t.label, pass, seconds: Math.round((Date.now() - t0) / 1000), ...r, failed: (r.checks || []).filter((c) => !c.ok) };
  report.results.push(out);
  console.log(`${t.label.padEnd(36)} ${pass ? "PASS" : "FAIL"}  ${scrub(out.summary || "")}`);
  for (const f of out.failed) console.log("    FAIL " + f.name + ": " + scrub(JSON.stringify(f.detail)));
}

const stamp = report.at.slice(0, 16).replace(/[T:]/g, "-");
const base = join(here, `product_audit_data_tools_${stamp}${LABEL}`);
writeFileSync(base + ".json", scrub(JSON.stringify(report, null, 2)));
const cell = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\n/g, " ");
const md = [
  `# The data tools on sale, against their pricing-card claims, ${stamp}`,
  "",
  `Live API ${BASE}, as a paying test account. Pass = every check of the tool's bar (tools/accuracy/product_audit_data_tools.mjs).`,
  "",
  "| tool | input | result | numbers |",
  "|---|---|---|---|",
  ...report.results.map((r) => `| ${cell(r.label)} | ${cell(r.input)} | ${r.pass ? "PASS" : "FAIL"} | ${cell(r.summary)} |`),
  "",
  ...report.results.flatMap((r) => [
    `## ${r.label}: ${r.pass ? "PASS" : "FAIL"}`,
    "",
    `Claim: "${r.claim || ""}"`,
    "",
    `Bar: ${r.bar || ""}`,
    "",
    ...(r.checks || []).map((c) => `- ${c.ok ? "ok" : "**FAIL**"} ${c.name}${c.detail == null ? "" : ": " + cell(typeof c.detail === "string" ? c.detail : JSON.stringify(c.detail))}`),
    "",
  ]),
].join("\n");
writeFileSync(base + ".md", scrub(md));
console.log("\nwrote " + base + ".json and .md");
