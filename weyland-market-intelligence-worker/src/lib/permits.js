// weyland-market-intelligence-worker/src/lib/permits.js
//
// MarketX's index (2026-10-09): the commercial and multifamily building work
// six cities permit, from each city's own open-data permit records, pulled into
// this worker's D1 by the request-driven job lease (as CompX does with NYC's
// awards), so a page never waits on a city's API. A permit is where a door
// hardware sub's market starts: it names the project, its value, its use, and
// in most cities the owner or the general contractor who will buy the doors.
//   Chicago      Building Permits (ydr8-5enu): new construction, renovation/alteration; GC and owner contacts
//   New York     DOB NOW job filings (w9ak-ipjd): new buildings and alterations, building type Other; owner
//   Los Angeles  LADBS permits (pi9x-tg5x): new, addition, alteration; commercial and apartment
//   Austin       Issued construction permits (3syk-w9eu): building permits, commercial or 5+ family; contractor
//   San Francisco Building permits (i98e-djp9): new construction, alterations; not 1-2 family
//   Seattle      Building permits (76t5-zqzr): commercial, multifamily, institutional, industrial; contractor
// Only work valued at $250,000 or more, single-family and duplex work left out.
// Each city is read from a cursor (issue date + offset within that date), at
// most PAGE rows a request, within the run's time budget; the first runs fill 24
// months, later runs take what each city issued since.

export const MIN_VALUE = 250000;
export const BACKFILL_MONTHS = 24;
// Bumped whenever permitRow reads a permit differently (2: Austin's permit classes, structures with no doors).
export const RULES_VERSION = 2;
const PAGE = 1000;

const RESIDENTIAL_SMALL = /\b(single[- ]family|one[- ]family|two[- ]family|1[- ]family|2[- ]family|duplex|townhouse|accessory dwelling|\badu\b)/i;
// Work with no doors in it whatever the building (a pool, a sign, an antenna).
const NOT_A_BUILDING = /^(?!.*\b(building|apartment|school|hospital|office|hotel|units?)\b).*\b(swimming pool|pool and spa|\bspa\b|solar|photovoltaic|fence|signs?\b|billboard|antenna|cell(ular)? tower|telecom|monopole)/i;

// What the building is for, read from the city's use field and the work description.
export const USES = [
  { key: "education", label: "Schools and colleges", doorHeavy: true, re: /\b(school|elementary|middle school|high school|university|college|academy|classroom|campus|day ?care|child ?care|education)/i },
  { key: "healthcare", label: "Healthcare", doorHeavy: true, re: /\b(hospital|medical|clinic|health ?care|surgery|surgical|dental|nursing|assisted living|senior living|memory care|behavioral|patient)/i },
  { key: "multifamily", label: "Multifamily residential", doorHeavy: true, re: /\b(apartment|multi-?family|dwelling units|residential units|condominium|condo|senior housing|affordable housing|five or more|5\+ ?units|\d{2,4} (residential |dwelling )?units)/i },
  { key: "hotel", label: "Hotels and lodging", doorHeavy: true, re: /\b(hotel|motel|hospitality|lodging|dormitor)/i },
  { key: "civic", label: "Civic and assembly", doorHeavy: true, re: /\b(church|worship|library|museum|theat(er|re)|venue|arena|stadium|community center|recreation|fire station|police|courthouse|government|city hall|jail|correctional)/i },
  { key: "office", label: "Offices", doorHeavy: true, re: /\b(office|bank|professional (bldg|building)|tenant improvement|\bti\b|interior build-?out|corporate)/i },
  { key: "retail", label: "Retail and restaurants", doorHeavy: false, re: /\b(retail|store|restaurant|shopping|mercantile|grocery|supermarket|cafe|bar\b|salon)/i },
  { key: "industrial", label: "Industrial, warehouse, lab", doorHeavy: false, re: /\b(warehouse|industrial|manufactur|distribution|storage|data ?center|laborator|\blab\b|factory|cold storage)/i },
  { key: "parking", label: "Parking structures", doorHeavy: false, re: /\b(parking (garage|structure|deck))/i },
];
// The occupancy group a permit cites when its words name no use (IBC: E education, I-2 healthcare,
// R-1 hotels, R-2 multifamily, B business, M mercantile, A assembly, S/F storage and factory).
const OCCUPANCY = [["E", "education"], ["I-2", "healthcare"], ["I-1", "healthcare"], ["R-1", "hotel"], ["R-2", "multifamily"], ["B", "office"], ["M", "retail"], ["A", "civic"], ["S", "industrial"], ["F", "industrial"]];
function occupancyUse(text) {
  const m = String(text || "").toUpperCase().match(/OCCUPANC(?:Y|IES)(?: GROUPS?| CLASSIFICATIONS?| TYPES?)?[:\s]*\(?((?:[A-Z]-?\d?[,\s/&]*(?:AND\s+)?){1,8})/);
  if (!m) return null;
  const groups = (m[1].match(/[A-Z](?:-?\d)?/g) || []).map((g) => g.replace(/^([A-Z])(\d)$/, "$1-$2"));
  for (const [g, use] of OCCUPANCY) if (groups.some((x) => x === g || (g.length === 1 && x[0] === g))) return use;
  return null;
}
export const useOf = (text) => (USES.find((u) => u.re.test(String(text || ""))) || { key: occupancyUse(text) || "other" }).key;

// Whether the work is likely to include doors and hardware: new buildings and interior work
// are; facade, roofing, mechanical-only, structural and site work are not.
const NOT_DOORS = /\b(fa[cç]ade|curtain ?wall|re-?roof|roofing|roof (replacement|repair)|mechanical (only|modification|upgrade)|hvac|boiler|chiller|cooling tower|elevator|escalator|sprinkler|fire alarm|standpipe|plumbing|solar|photovoltaic|parapet|sidewalk|scaffold|window replacement|replace(ment of)? windows|structural repair|underpinning|caissons?|foundation only|excavation|shoring|demolition|antenna|signage|masonry|local law 11|\bll ?11\b|\bfisp\b|generator|electrical service|ev charg)/i;
const DOORS = /\b(interior|tenant|fit-?out|build-?out|renovat|remodel|partition|convert|conversion|change of use|egress|classroom|restroom|gut|new (building|construction)|construct (a |an )?(new )?\d*-?stor|erect|addition|rebuild|full building permit|core and shell|shell building|finish-?out|doors?\b|hardware)/i;
// Structures with next to no door hardware, new or not.
const NO_DOOR_STRUCTURE = /\b(shade structure|gazebo|canopy|carport|boat dock|\bdock\b|trellis|pergola|pavilion|parking (garage|structure|deck|lot)|retaining wall|site work|bridge|tower crane|billboard)/i;
export function doorScope(kind, text, use = null) {
  const t = String(text || "");
  const not = NOT_DOORS.test(t), yes = DOORS.test(t);
  if (use === "parking" || (NO_DOOR_STRUCTURE.test(t) && !/\b(building|apartment|school|office|hotel|clinic|units?)\b/i.test(t.replace(NO_DOOR_STRUCTURE, "")))) return "unlikely";
  if (kind === "new") return /\b(caissons? only|foundation only|excavation only|shoring only)\b/i.test(t) ? "unlikely" : "likely";
  if (yes) return "likely";
  if (not) return "unlikely";
  return "unclear";
}
export const useLabel = (key) => (USES.find((u) => u.key === key) || { label: "Other commercial" }).label;
export const doorHeavy = (key) => !!(USES.find((u) => u.key === key) || {}).doorHeavy;

const num = (v) => { const t = String(v ?? "").replace(/[$,]/g, "").trim(); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };
const day = (v) => (v ? String(v).slice(0, 10) : null);
const clean = (v, n = 200) => { const s = String(v ?? "").replace(/\s+/g, " ").trim(); return s ? s.slice(0, n) : null; };
const join = (...p) => p.map((x) => clean(x)).filter(Boolean).join(" ");

function chicagoContacts(r) {
  const out = {};
  for (let i = 1; i <= 15; i++) {
    const t = String(r[`contact_${i}_type`] || "").toUpperCase(), name = clean(r[`contact_${i}_name`], 120);
    if (!name) continue;
    if (!out.contractor && /GENERAL CONTRACTOR/.test(t)) out.contractor = name;
    else if (!out.owner && /OWNER/.test(t)) out.owner = name;
    else if (!out.applicant && /ARCHITECT/.test(t)) out.applicant = name;
  }
  return out;
}

export const CITIES = {
  chicago: {
    name: "Chicago", state: "IL", dataset: "https://data.cityofchicago.org/resource/ydr8-5enu.json", dateField: "issue_date", order: "issue_date, id",
    where: `reported_cost >= ${MIN_VALUE} AND permit_type in ('PERMIT - NEW CONSTRUCTION', 'PERMIT - RENOVATION/ALTERATION')`,
    row: (r) => {
      const c = chicagoContacts(r);
      return { permit_no: r.permit_, issued: day(r.issue_date), kind: /NEW CONSTRUCTION/.test(r.permit_type) ? "new" : "alteration", use_text: null,
        description: r.work_description, address: join(r.street_number, r.street_direction, r.street_name) + ", Chicago, IL", valuation: num(r.reported_cost),
        sqft: null, units: null, owner: c.owner || null, contractor: c.contractor || null, applicant: c.applicant || null, url: null, lat: num(r.latitude), lon: num(r.longitude) };
    },
  },
  nyc: {
    name: "New York City", state: "NY", dataset: "https://data.cityofnewyork.us/resource/w9ak-ipjd.json", dateField: "approved_date", order: "approved_date, job_filing_number",
    where: `building_type = 'Other' AND initial_cost::number >= ${MIN_VALUE} AND job_type in ('New Building', 'Alteration', 'Alteration CO', 'ALT-CO - New Building with Existing Elements to Remain')`,
    // One job is filed and amended several times (B00509455-I1, -P8): keyed by the job, the latest filing kept.
    key: (r) => String(r.job_filing_number || "").split("-")[0],
    row: (r) => ({ permit_no: String(r.job_filing_number || "").split("-")[0], issued: day(r.approved_date), kind: /New Building/i.test(r.job_type) ? "new" : "alteration", use_text: null,
      description: r.job_description, address: join(r.house_no, r.street_name) + ", " + (clean(r.borough) || "New York") + ", NY", valuation: num(r.initial_cost),
      sqft: num(r.total_construction_floor_area), units: num(r.proposed_dwelling_units), owner: clean(r.owner_s_business_name, 120) || join(r.owner_first_name, r.owner_last_name) || null,
      contractor: null, applicant: clean(r.applicant_business_name, 120) || join(r.applicant_first_name, r.applicant_last_name) || null, url: null, lat: num(r.latitude), lon: num(r.longitude) }),
  },
  la: {
    name: "Los Angeles", state: "CA", dataset: "https://data.lacity.org/resource/pi9x-tg5x.json", dateField: "issue_date", order: "issue_date, permit_nbr",
    where: `valuation::number >= ${MIN_VALUE} AND permit_type in ('Bldg-New', 'Bldg-Alter/Repair', 'Bldg-Addition') AND permit_sub_type in ('Commercial', 'Apartment')`,
    row: (r) => ({ permit_no: r.permit_nbr, issued: day(r.issue_date), kind: r.permit_type === "Bldg-New" ? "new" : "alteration", use_text: join(r.permit_sub_type, r.use_desc),
      description: r.work_desc, address: (clean(r.primary_address) || "") + ", Los Angeles, CA", valuation: num(r.valuation), sqft: num(r.square_footage), units: num(r.du_changed),
      owner: null, contractor: null, applicant: null, url: null, lat: num(r.lat), lon: num(r.lon) }),
  },
  austin: {
    // The Census building-permit class Austin records: the use, and 329 (structures other than buildings) and 321 (parking) carry no doors to speak of.
    classUse: (r) => {
      const c = (String(r.permit_class || "").match(/C-\s*(\d+)/) || [])[1];
      const map = { 105: "multifamily", 104: "multifamily", 326: "education", 324: "office", 327: "retail", 323: "healthcare", 213: "hotel", 318: "civic", 319: "civic", 325: "civic", 320: "industrial", 322: "industrial", 321: "parking" };
      return c ? { use: map[c] || null, noDoors: c === "329" || c === "321" } : null;
    },
    name: "Austin", state: "TX", dataset: "https://data.austintexas.gov/resource/3syk-w9eu.json", dateField: "issue_date", order: "issue_date, permit_number",
    where: `permittype = 'BP' AND total_job_valuation::number >= ${MIN_VALUE} AND (permit_class_mapped = 'Commercial' OR permit_class like '%Five or More%') AND work_class in ('New', 'Remodel', 'Shell', 'Addition and Remodel', 'Addition')`,
    // A project's phase permits each carry the whole job's valuation: one row per project.
    row: (r) => ({ permit_no: r.masterpermitnum ? "master-" + r.masterpermitnum : r.permit_number, issued: day(r.issue_date), kind: /^(New|Shell)$/.test(r.work_class || "") ? "new" : "alteration", use_text: r.permit_class,
      description: r.description, address: (clean(r.permit_location) || clean(r.original_address1) || "") + ", Austin, TX", valuation: num(r.total_job_valuation),
      sqft: num(r.total_new_add_sqft), units: num(r.housing_units), owner: null, contractor: clean(r.contractor_company_name, 120), applicant: clean(r.applicant_org, 120),
      url: (r.link && r.link.url) || null, lat: num(r.latitude), lon: num(r.longitude) }),
  },
  sf: {
    name: "San Francisco", state: "CA", dataset: "https://data.sf.gov/resource/i98e-djp9.json", dateField: "issued_date", order: "issued_date, permit_number",
    where: `coalesce(revised_cost::number, estimated_cost::number) >= ${MIN_VALUE} AND permit_type_definition in ('otc alterations permit', 'additions alterations or repairs', 'new construction wood frame', 'new construction') AND (proposed_use IS NULL OR proposed_use not in ('1 family dwelling', '2 family dwelling'))`,
    row: (r) => ({ permit_no: r.permit_number, issued: day(r.issued_date), kind: /new construction/.test(r.permit_type_definition || "") ? "new" : "alteration", use_text: r.proposed_use,
      description: r.description, address: join(r.street_number, r.street_name, r.street_suffix) + ", San Francisco, CA", valuation: num(r.revised_cost) || num(r.estimated_cost),
      sqft: null, units: num(r.proposed_units), owner: null, contractor: null, applicant: null,
      url: r.permit_number ? "https://dbiweb02.sfgov.org/dbipts/default.aspx?page=Permit&PermitNumber=" + encodeURIComponent(r.permit_number) : null,
      lat: r.location && r.location.coordinates ? num(r.location.coordinates[1]) : null, lon: r.location && r.location.coordinates ? num(r.location.coordinates[0]) : null }),
  },
  seattle: {
    name: "Seattle", state: "WA", dataset: "https://data.seattle.gov/resource/76t5-zqzr.json", dateField: "issueddate", order: "issueddate, permitnum",
    where: `permittypemapped = 'Building' AND estprojectcost::number >= ${MIN_VALUE} AND permitclass in ('Commercial', 'Multifamily', 'Institutional', 'Industrial') AND permittypedesc in ('New', 'Addition/Alteration', 'Tenant Improvment')`,
    row: (r) => ({ permit_no: r.permitnum, issued: day(r.issueddate), kind: r.permittypedesc === "New" ? "new" : "alteration", use_text: r.permitclass,
      description: r.description, address: (clean(r.originaladdress1) || "") + ", Seattle, WA", valuation: num(r.estprojectcost), sqft: null, units: num(r.housingunitsadded),
      owner: null, contractor: clean(r.contractorcompanyname, 120), applicant: null, url: (r.link && r.link.url) || null, lat: num(r.latitude), lon: num(r.longitude) }),
  },
};

/** A city's raw record -> the index row, or null when it is not commercial work worth indexing. */
export function permitRow(metro, r, now) {
  const city = CITIES[metro];
  const p = city.row(r);
  if (!p.permit_no || !p.issued || !(p.valuation >= MIN_VALUE)) return null;
  const text = [p.use_text, p.description].filter(Boolean).join(" ");
  if (NOT_A_BUILDING.test(String(p.description || ""))) return null;
  if (RESIDENTIAL_SMALL.test(text) && !/\b(apartment|multi-?family|units|school|hospital|office|retail|hotel)\b/i.test(text)) return null;
  const cls = city.classUse ? city.classUse(r) : null;
  const use = (cls && cls.use) || useOf(text);
  const scope = cls && cls.noDoors ? "unlikely" : doorScope(p.kind, text, use);
  return {
    id: metro + ":" + p.permit_no, metro, state: city.state, permit_no: String(p.permit_no).slice(0, 60), issued: p.issued, kind: p.kind,
    use, scope, use_text: clean(p.use_text, 120), description: clean(p.description, 600), address: clean(p.address, 200),
    valuation: Math.round(p.valuation), sqft: p.sqft || null, units: p.units || null, owner: p.owner, contractor: p.contractor, applicant: p.applicant,
    url: p.url, lat: p.lat, lon: p.lon, fetched_at: now,
  };
}

let ready = false;
export function resetPermitsForTests() { ready = false; }
export async function ensurePermits(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS marketx_permits (
    id TEXT PRIMARY KEY, metro TEXT NOT NULL, state TEXT, permit_no TEXT, issued TEXT NOT NULL, kind TEXT, use TEXT, scope TEXT, use_text TEXT,
    description TEXT, address TEXT, valuation REAL, sqft REAL, units REAL, owner TEXT, contractor TEXT, applicant TEXT, url TEXT,
    lat REAL, lon REAL, fetched_at TEXT NOT NULL)`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_mxp_metro_issued ON marketx_permits(metro, issued)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_mxp_contractor ON marketx_permits(metro, contractor)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS marketx_ingest (metro TEXT PRIMARY KEY, cursor TEXT NOT NULL, skip INTEGER NOT NULL DEFAULT 0, rows INTEGER NOT NULL DEFAULT 0, last_run TEXT, last_error TEXT)").run();
  // When the reading of a permit changes, every city is read again from the start (rows are upserted).
  await db.prepare("CREATE TABLE IF NOT EXISTS marketx_meta (key TEXT PRIMARY KEY, value TEXT)").run();
  const v = await db.prepare("SELECT value FROM marketx_meta WHERE key = 'rules'").first();
  if (!v || Number(v.value) < RULES_VERSION) {
    await db.prepare("DELETE FROM marketx_ingest").run();
    await db.prepare("INSERT INTO marketx_meta (key, value) VALUES ('rules', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(RULES_VERSION)).run();
  }
  ready = true;
}

function backfillStart(now) {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - BACKFILL_MONTHS);
  return d.toISOString().slice(0, 10);
}

const UPSERT = `INSERT INTO marketx_permits (id, metro, state, permit_no, issued, kind, use, scope, use_text, description, address, valuation, sqft, units, owner, contractor, applicant, url, lat, lon, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET issued=excluded.issued, kind=excluded.kind, use=excluded.use, scope=excluded.scope, use_text=excluded.use_text, description=excluded.description,
    address=excluded.address, valuation=excluded.valuation, sqft=excluded.sqft, units=excluded.units, owner=excluded.owner, contractor=excluded.contractor,
    applicant=excluded.applicant, url=excluded.url, lat=excluded.lat, lon=excluded.lon, fetched_at=excluded.fetched_at`;

/** One page of one city from its cursor. -> { fetched, kept, done } */
export async function ingestCityPage(db, metro, { fetchImpl = fetch, now = new Date() } = {}) {
  await ensurePermits(db);
  const city = CITIES[metro];
  const stamp = now.toISOString();
  let st = await db.prepare("SELECT cursor, skip FROM marketx_ingest WHERE metro = ?").bind(metro).first();
  if (!st) {
    st = { cursor: backfillStart(now), skip: 0 };
    await db.prepare("INSERT OR IGNORE INTO marketx_ingest (metro, cursor, skip, rows) VALUES (?, ?, 0, 0)").bind(metro, st.cursor).run();
  }
  const where = `${city.dateField} >= '${st.cursor}T00:00:00' AND ${city.where}`;
  const url = `${city.dataset}?${new URLSearchParams({ $where: where, $order: city.order, $limit: String(PAGE), $offset: String(st.skip || 0) })}`;
  const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const msg = city.name + " " + res.status;
    await db.prepare("UPDATE marketx_ingest SET last_run = ?, last_error = ? WHERE metro = ?").bind(stamp, msg, metro).run();
    throw new Error(msg);
  }
  const raw = await res.json();
  if (!Array.isArray(raw)) throw new Error(city.name + ": not a list");
  const rows = raw.map((r) => { try { return permitRow(metro, r, stamp); } catch (_) { return null; } }).filter(Boolean);
  const stmts = rows.map((p) => db.prepare(UPSERT).bind(p.id, p.metro, p.state, p.permit_no, p.issued, p.kind, p.use, p.scope, p.use_text, p.description, p.address, p.valuation, p.sqft, p.units, p.owner, p.contractor, p.applicant, p.url, p.lat, p.lon, p.fetched_at));
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  // Advance: the last record's date becomes the cursor, skipping the records already read on that date.
  let cursor = st.cursor, skip = st.skip || 0;
  if (raw.length) {
    const dates = raw.map((r) => day(r[city.dateField])).filter(Boolean);
    const last = dates[dates.length - 1];
    if (last && last > cursor) { cursor = last; skip = dates.filter((d) => d === last).length; }
    else skip += raw.length;
  }
  await db.prepare("UPDATE marketx_ingest SET cursor = ?, skip = ?, rows = rows + ?, last_run = ?, last_error = NULL WHERE metro = ?").bind(cursor, skip, rows.length, stamp, metro).run();
  return { fetched: raw.length, kept: rows.length, done: raw.length < PAGE };
}

/** Every city, page by page, round robin, within budgetMs. */
export async function ingestPermits(db, { fetchImpl = fetch, budgetMs = 20000, now = () => new Date() } = {}) {
  const started = Date.now();
  const out = {};
  const open = new Set(Object.keys(CITIES));
  while (open.size && Date.now() - started < budgetMs) {
    for (const metro of [...open]) {
      if (Date.now() - started >= budgetMs) break;
      try {
        const r = await ingestCityPage(db, metro, { fetchImpl, now: now() });
        const o = out[metro] || (out[metro] = { fetched: 0, kept: 0 });
        o.fetched += r.fetched; o.kept += r.kept;
        if (r.done) open.delete(metro);
      } catch (e) {
        out[metro] = { ...(out[metro] || {}), error: e.message };
        open.delete(metro);
      }
    }
  }
  return out;
}

// ---- Queries ---------------------------------------------------------------

const daysAgo = (today, n) => new Date(Date.parse(today + "T00:00:00Z") - n * 86400000).toISOString().slice(0, 10);
const monthsAgo = (today, n) => { const d = new Date(today + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 10); };

function filterSql(metro, p) {
  let where = "WHERE metro = ?";
  const binds = [metro];
  if (p.scope !== "all") { where += " AND scope = 'likely'"; }
  if (p.use && p.use !== "all") { where += " AND use = ?"; binds.push(p.use); }
  if (p.kind === "new" || p.kind === "alteration") { where += " AND kind = ?"; binds.push(p.kind); }
  if (Number(p.min) > 0) { where += " AND valuation >= ?"; binds.push(Number(p.min)); }
  if (p.q) { where += " AND (description LIKE ? OR address LIKE ? OR owner LIKE ? OR contractor LIKE ? OR applicant LIKE ?)"; const q = `%${p.q}%`; binds.push(q, q, q, q, q); }
  return { where, binds };
}

/** Every metro: the last 12 months of door-likely work, and the index's state. */
export async function metroList(db, today = new Date().toISOString().slice(0, 10)) {
  await ensurePermits(db);
  const since = monthsAgo(today, 12);
  const rows = (await db.prepare(
    `SELECT metro, COUNT(*) AS projects, SUM(valuation) AS value, MAX(issued) AS latest FROM marketx_permits WHERE issued >= ? AND scope = 'likely' GROUP BY metro`
  ).bind(since).all()).results || [];
  const state = (await db.prepare("SELECT metro, cursor, rows, last_run, last_error FROM marketx_ingest").all()).results || [];
  return Object.entries(CITIES).map(([key, c]) => {
    const r = rows.find((x) => x.metro === key) || {};
    const s = state.find((x) => x.metro === key) || {};
    return { metro: key, name: c.name, state: c.state, projects: r.projects || 0, value: r.value || 0, latest: r.latest || null, indexedThrough: s.cursor || null, lastRun: s.last_run || null, filling: !s.cursor || s.cursor < daysAgo(today, 10) };
  });
}

export const NAMES = {
  chicago: "Contractor and owner from the permit's contacts",
  nyc: "Owner from the DOB NOW filing; no contractor (the filing's applicant is the architect or engineer)",
  la: "No owner or contractor in LADBS's open data",
  austin: "Contractor from the permit",
  sf: "No owner or contractor in DBI's open data",
  seattle: "Contractor from the permit when one is listed",
};

/**
 * One metro's market: totals against the prior period, by month, by use and kind, the largest
 * and newest projects, and who builds and owns them. p: { months, scope, use, kind, min, q, limit }.
 */
export async function metroSummary(db, metro, p = {}, today = new Date().toISOString().slice(0, 10)) {
  await ensurePermits(db);
  if (!CITIES[metro]) return null;
  const months = [3, 6, 12, 24].includes(Number(p.months)) ? Number(p.months) : 12;
  const since = monthsAgo(today, months), prior = monthsAgo(today, months * 2);
  const limit = Math.min(Math.max(Number(p.limit) || 5, 1), 500);
  const { where, binds } = filterSql(metro, p);
  const one = async (sql, ...b) => (await db.prepare(sql).bind(...binds, ...b).first()) || {};
  const all = async (sql, ...b) => (await db.prepare(sql).bind(...binds, ...b).all()).results || [];
  const cur = await one(`SELECT COUNT(*) AS projects, SUM(valuation) AS value, SUM(CASE WHEN kind = 'new' THEN valuation ELSE 0 END) AS newValue FROM marketx_permits ${where} AND issued >= ?`, since);
  const prev = await one(`SELECT COUNT(*) AS projects, SUM(valuation) AS value FROM marketx_permits ${where} AND issued >= ? AND issued < ?`, prior, since);
  const monthly = await all(`SELECT substr(issued, 1, 7) AS month, COUNT(*) AS projects, SUM(valuation) AS value FROM marketx_permits ${where} AND issued >= ? GROUP BY month ORDER BY month`, monthsAgo(today, 24));
  const byUse = (await all(`SELECT use, COUNT(*) AS projects, SUM(valuation) AS value FROM marketx_permits ${where} AND issued >= ? GROUP BY use ORDER BY value DESC`, since))
    .map((u) => ({ ...u, label: useLabel(u.use), doorHeavy: doorHeavy(u.use) }));
  const byKind = await all(`SELECT kind, COUNT(*) AS projects, SUM(valuation) AS value FROM marketx_permits ${where} AND issued >= ? GROUP BY kind`, since);
  const cols = "id, permit_no, issued, kind, use, scope, use_text, description, address, valuation, sqft, units, owner, contractor, applicant, url";
  const largest = await all(`SELECT ${cols} FROM marketx_permits ${where} AND issued >= ? ORDER BY valuation DESC LIMIT ?`, since, limit);
  const newest = await all(`SELECT ${cols} FROM marketx_permits ${where} AND issued >= ? ORDER BY issued DESC, valuation DESC LIMIT ?`, since, limit);
  const contractors = await all(`SELECT contractor AS name, COUNT(*) AS projects, SUM(valuation) AS value, MAX(issued) AS latest FROM marketx_permits ${where} AND issued >= ? AND contractor IS NOT NULL GROUP BY contractor ORDER BY value DESC LIMIT ?`, since, limit);
  const owners = await all(`SELECT owner AS name, COUNT(*) AS projects, SUM(valuation) AS value, MAX(issued) AS latest FROM marketx_permits ${where} AND issued >= ? AND owner IS NOT NULL GROUP BY owner ORDER BY value DESC LIMIT ?`, since, limit);
  const fill = await db.prepare("SELECT cursor, last_run FROM marketx_ingest WHERE metro = ?").bind(metro).first();
  const change = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null);
  return {
    metro, name: CITIES[metro].name, state: CITIES[metro].state, months, since, today,
    scope: p.scope === "all" ? "all" : "likely",
    totals: { projects: cur.projects || 0, value: cur.value || 0, newValue: cur.newValue || 0, priorProjects: prev.projects || 0, priorValue: prev.value || 0, valueChange: change(cur.value || 0, prev.value || 0), projectChange: change(cur.projects || 0, prev.projects || 0) },
    monthly, byUse, byKind, largest, newest, contractors, owners,
    names: NAMES[metro],
    index: { through: fill ? fill.cursor : null, lastRun: fill ? fill.last_run : null, backfillFrom: monthsAgo(today, BACKFILL_MONTHS) },
  };
}

/** Open public bids for door and building work in the metro's state (HuntX's index, shared DB). */
export async function openBids(weylandDb, state, today = new Date().toISOString().slice(0, 10), limit = 5) {
  if (!weylandDb || !state) return null;
  try {
    const t = await weylandDb.prepare("SELECT COUNT(*) AS n, SUM(estimated_value) AS value, SUM(CASE WHEN trade_fit = 'doors' THEN 1 ELSE 0 END) AS doors FROM opportunities WHERE state = ? AND trade_fit IN ('doors', 'building') AND key_date >= ?").bind(state, today).first();
    const rows = (await weylandDb.prepare("SELECT title, agency, location, key_date, estimated_value, detail_url, trade_fit FROM opportunities WHERE state = ? AND trade_fit IN ('doors', 'building') AND key_date >= ? ORDER BY trade_fit = 'doors' DESC, key_date ASC LIMIT ?").bind(state, today, limit).all()).results || [];
    return { open: (t && t.n) || 0, doors: (t && t.doors) || 0, value: (t && t.value) || 0, rows };
  } catch (_) {
    return null;
  }
}

/** True while some city's cursor is more than 10 days behind (still reading its 24 months). */
export async function backfilling(db, today = new Date().toISOString().slice(0, 10)) {
  await ensurePermits(db);
  const rows = (await db.prepare("SELECT metro, cursor FROM marketx_ingest").all()).results || [];
  const behind = new Date(Date.parse(today + "T00:00:00Z") - 10 * 86400000).toISOString().slice(0, 10);
  return Object.keys(CITIES).some((m) => { const r = rows.find((x) => x.metro === m); return !r || r.cursor < behind; });
}
