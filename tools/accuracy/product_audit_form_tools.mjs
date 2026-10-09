// The form tools on sale, each run live on real project input (2026-10-09).
//
// For each tool: produce its output through the site's own HTTP API as a paying test account,
// read the PDF back with `pdftotext -layout`, and check (a) the pricing card's claim, quoted in
// the report, and (b) that the project facts in the output are the real ones and nothing is a
// placeholder. PASS = every check of that tool holds. Inputs:
//   - Berryessa USD Bid B-09-2023-24 (tools/corpus/door-schedules/dd339f57b51538ed.pdf), read by
//     SubX on the pages tools/corpus/expected/berryessa-*.json name; facts checked against those
//     hand-read files. Rockford Bid 26-27 (f0e863d88ea688ff.pdf) as well for PermitX, the only
//     corpus job with electrified hardware.
//   - The account's PropX proposal priced from that Berryessa job (or --proposal <id>).
//   - A HuntX notice with door scope (first upcoming fit=doors notice naming doors, or --opportunity <id>).
//   - SafetyX: NIOSH FACE Report 2000-16 (a real construction fall fatality report), downloaded
//     from CDC Stacks, or --safety-pdf <path>.
//   - MeetingX/NotesX: a fresh room whose record is written for this job.
//
//   POST /api/hardware-schedule/start, /session/:id/read-pages, DELETE /session/:id   SubX
//   GET  /api/proposals/mine, /api/proposals/:id/download                              PropX
//   GET  /api/hunt/opportunities                                                        HuntX
//   POST /api/forms/lienx/pdf | bidx/preview, bidx/pdf | coa/pdf | permitx/preview, permitx/pdf | closex/preview, closex/pdf
//   GET  /api/forms/rfax/session/:id; POST /api/forms/rfax/save, /:id/answer; GET /:id/pdf
//   GET  /api/forms/changeordx/contracts; POST save, /:id/status; GET /:id/pdf
//   POST /api/safety-reports/analyze (+ /jobs/:id), reports, actions, cases, osha300.csv, osha300.pdf
//   GET  /api/sight/room/:id, /ice, /record; POST /record, /record/:item/done                 MeetingX
//   POST /api/forms/notesx/pdf
//
// Side effects that cannot be undone over the API: RFIs (on the deleted session), two change
// orders on the proposal (set to "rejected" afterwards so the contract sum carried forward is
// unchanged), a SafetyX report record, a MeetingX room record. SubX sessions, the SafetyX
// corrective action and the OSHA case are deleted. No email is sent.
//
// Usage: node tools/accuracy/product_audit_form_tools.mjs --token-file <path>
//        [--only lienx,bidx,coa,rfax,changeordx,permitx,safetyx,closex,notesx,meetingx]
//        [--base https://weylandai.com] [--label x] [--proposal <id>] [--opportunity <id>]
//        [--company "Bidder name"] [--safety-pdf <path>] [--keep-pdfs <dir>]
// The token is a test account's AuthFor bearer token (never printed). Writes
// product_audit_form_tools_<stamp>[_label].json and .md next to this file.
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const BASE = String(args.base || "https://weylandai.com").replace(/\/$/, "");
const TOKEN = readFileSync(String(args["token-file"]), "utf8").trim();
const ONLY = args.only ? String(args.only).split(",") : null;
const LABEL = args.label ? "_" + String(args.label).replace(/[^A-Za-z0-9_-]/g, "") : "";
const COMPANY = String(args.company || "QA Door Hardware Co (WeylandAI test account)");
const H = { Authorization: "Bearer " + TOKEN };
const J = { "Content-Type": "application/json" };
const CORPUS = join(REPO, "tools/corpus/door-schedules"), EXPECTED = join(REPO, "tools/corpus/expected");
const SAFETY_URL = "https://stacks.cdc.gov/view/cdc/167344/cdc_167344_DS1.pdf";
const TMP = mkdtempSync(join(tmpdir(), "pa-forms-"));
const want = (id) => !ONLY || ONLY.includes(id);

// Facts of the Berryessa job, from its project manual (title page, 00 21 13, 08 71 00 1.07).
const BERRY = {
  owner: "Berryessa Union School District",
  project: "Interior Door Replacement at 3 Elementary Schools",
  bid: "B-09-2023-24",
  bondPercent: 10, // 00 21 13: "not less than ten percent (10%) of the amount of the base bid"
  warranties: { LCN: "30 years (closers), per Section 08 71 00 1.07", "Von Duprin": "3 years (exit devices), per Section 08 71 00 1.07", Ives: "2 years (all other hardware), per Section 08 71 00 1.07", Schlage: "2 years (all other hardware), per Section 08 71 00 1.07", "Zero International": "2 years (all other hardware), per Section 08 71 00 1.07" },
};

async function api(path, init = {}) {
  const t0 = Date.now();
  const r = await fetch(BASE + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const ct = r.headers.get("content-type") || "";
  const buf = Buffer.from(await r.arrayBuffer());
  let data = null;
  if (ct.includes("json")) { try { data = JSON.parse(buf.toString()); } catch (_) { data = null; } }
  return { ok: r.ok, status: r.status, ct, data, buf, ms: Date.now() - t0 };
}
const post = (path, body) => api(path, { method: "POST", headers: J, body: JSON.stringify(body) });
const isPdf = (r) => r.ok && /pdf/.test(r.ct) && r.buf.subarray(0, 5).toString() === "%PDF-";

let nPdf = 0;
const KEEP = args["keep-pdfs"] ? String(args["keep-pdfs"]) : null;
function readPdf(buf, name = "out") {
  const f = join(KEEP || TMP, name + "-" + (++nPdf) + ".pdf");
  writeFileSync(f, buf);
  const text = execFileSync("pdftotext", ["-layout", f, "-"], { maxBuffer: 128 * 1024 * 1024 }).toString();
  const pages = Number((execFileSync("pdfinfo", [f]).toString().match(/Pages:\s+(\d+)/) || [])[1] || 0);
  return { text, pages, bytes: buf.length };
}
// One line of text, quotes straightened, footers ("... page 2 of 3") dropped.
// Dashes too: the PDF writer sets an em dash as "--".
const norm = (s) => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, "-").replace(/-{2,}/g, "-").replace(/\s+/g, " ").trim();
const body = (text) => norm(text.split("\n").filter((l) => !/page \d+ of \d+\s*$/.test(l)).join("\n"));
const PLACEHOLDER = /\bundefined\b|\bNaN\b|\[object Object\]|lorem ipsum|\bTBD\b|XXXX|\{\{|\$\{|Invalid Date|\bnull\b(?!,? void)/i;
const placeholders = (text) => [...new Set((norm(text).match(new RegExp(PLACEHOLDER.source, "gi")) || []))];
const money = (n) => "$" + (Math.round(Number(n) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const has = (text, s) => body(text).includes(norm(s));

// Independent amount in words (the bid form's "words and figures").
function words(amount) {
  const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const three = (n) => [Math.floor(n / 100) ? ONES[Math.floor(n / 100)] + " hundred" : "", n % 100 < 20 ? ONES[n % 100] : TENS[Math.floor((n % 100) / 10)] + (n % 10 ? "-" + ONES[n % 10] : "")].filter(Boolean).join(" ");
  const cents = Math.round(amount * 100) % 100;
  let n = Math.floor(Math.round(amount * 100) / 100);
  const parts = [];
  for (const scale of ["", " thousand", " million"]) { if (n % 1000) parts.unshift(three(n % 1000) + scale); n = Math.floor(n / 1000); }
  const s = parts.join(" ") || "zero";
  return s.charAt(0).toUpperCase() + s.slice(1) + " and " + String(cents).padStart(2, "0") + "/100 dollars";
}

class Tool {
  constructor(id, label, claim, input) { Object.assign(this, { id, label, claim, input, checks: [], numbers: {}, notes: [] }); }
  check(name, ok, detail = "") { this.checks.push({ name, ok: !!ok, detail: String(detail).slice(0, 600) }); return !!ok; }
  get pass() { return this.checks.length > 0 && this.checks.every((c) => c.ok); }
}

// ---- SubX: upload a bid set and read the pages its expected files name ----------------------
async function subxSession(file, doorsJson, groupsJson, name) {
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(join(CORPUS, file))], { type: "application/pdf" }), file);
  fd.append("projectName", name);
  fd.append("document_type", "door_schedule");
  const up = await api("/api/hardware-schedule/start", { method: "POST", body: fd });
  if (!up.ok) throw new Error("SubX upload HTTP " + up.status);
  const doors = JSON.parse(readFileSync(join(EXPECTED, doorsJson), "utf8"));
  const groups = JSON.parse(readFileSync(join(EXPECTED, groupsJson), "utf8"));
  const pages = [...doors.source.pages.map((page) => ({ page, type: "door_schedule" })), ...groups.source.pages.map((page) => ({ page, type: "hardware_schedule" }))];
  const rd = await post("/api/hardware-schedule/session/" + up.data.sessionId + "/read-pages", { pages });
  const res = (rd.data && rd.data.results) || [];
  return { id: up.data.sessionId, name, doors, groups, read: { status: rd.status, doors: res.reduce((s, r) => s + (r.doors || 0), 0), groups: res.reduce((s, r) => s + (r.groups || 0), 0), items: res.reduce((s, r) => s + (r.items || 0), 0), failed: res.filter((r) => !r.ok).map((r) => "p" + r.page + ": " + r.error) } };
}
const gkey = (s) => String(s ?? "").trim().toUpperCase().replace(/^(HW|SET|GROUP)[-\s#]*/i, "").replace(/^0+(?=\w)/, "");
// The expected openings keyed the way SubX names them (a mark repeated on a later page gets " [p.N]").
function expectedOpenings(sess) {
  const seen = new Set(), groups = new Map(sess.groups.groups.map((g) => [gkey(g.group), g]));
  return sess.doors.doors.map((d) => {
    const mark = seen.has(d.mark) ? `${d.mark} [p.${d.page}]` : d.mark;
    seen.add(d.mark);
    const g = groups.get(gkey(d.hardware_group));
    return { ...d, subxMark: mark, set: gkey(d.hardware_group), items: g ? g.items : [] };
  });
}

const report = { base: BASE, started_at: new Date().toISOString(), tools: [], setup: {} };
const tools = [];
const sessions = [];
const cleanup = [];
let berry = null, rock = null, proposal = null, contract = null, propxText = "";

try {
  // ---- setup ---------------------------------------------------------------------------------
  berry = await subxSession("dd339f57b51538ed.pdf", "berryessa-a9.2-door-schedules.json", "berryessa-087100-hardware-groups.json", `${BERRY.owner} ${BERRY.bid} ${BERRY.project}`);
  sessions.push(berry.id);
  report.setup.berryessa = { read: berry.read, expected: { doors: berry.doors.doors.length, groups: berry.groups.groups.length, items: berry.groups.groups.reduce((s, g) => s + g.items.length, 0) } };
  if (want("permitx")) {
    rock = await subxSession("f0e863d88ea688ff.pdf", "rockford-a2.2-door-schedule.json", "rockford-087100-hardware-groups.json", "Rockford Bid 26-27 Addendum One");
    sessions.push(rock.id);
    report.setup.rockford = { read: rock.read, expected: { doors: rock.doors.doors.length, groups: rock.groups.groups.length } };
  }
  const mine = await api("/api/proposals/mine");
  const props = (mine.data && mine.data.proposals) || [];
  const berryProp = (re) => props.find((p) => Number(p.door_count) === berry.doors.doors.length && re.test(p.project_address || ""));
  proposal = args.proposal ? props.find((p) => p.id === args.proposal) : berryProp(/Lucretia/i) || berryProp(/San Jose/i);
  if (!proposal) {
    // None on the account: price this session in PropX.
    const g = await post("/api/proposals/generate", { source: { kind: "session", id: berry.id }, projectAddress: "1855 Lucretia Ave, San Jose, CA 95122", taxRate: 0.0925 });
    if (g.data && g.data.proposalId) proposal = ((await api("/api/proposals/mine")).data.proposals || []).find((p) => p.id === g.data.proposalId);
  }
  if (proposal) {
    const cs = await api("/api/forms/changeordx/contracts");
    contract = ((cs.data && cs.data.contracts) || []).find((c) => c.id === proposal.id) || null;
    const dl = await api("/api/proposals/" + proposal.id + "/download");
    if (isPdf(dl)) propxText = readPdf(dl.buf, "propx").text;
    report.setup.proposal = { id: proposal.id, quote: proposal.quote_number, client: proposal.client_name, address: proposal.project_address, doors: proposal.door_count, subtotal: proposal.subtotal, tax: proposal.tax_amount, total: proposal.grand_total, pdf_http: dl.status, pdf_has_total: !!propxText && has(propxText, money(proposal.grand_total)) };
  }

  // ---- LienX ---------------------------------------------------------------------------------
  if (want("lienx")) {
    const t = new Tool("lienx", "LienX", "Fills the state's own statutory lien waiver form word for word (Arizona, California, Florida, Georgia, Michigan, Mississippi, Nevada, Texas, Utah and Wyoming today, checked against the statute's text) from the job's owner, customer, amount and dates. States whose statutory forms LienX does not carry yet are refused rather than given a generic waiver; other states get a general form, labelled as one.",
      "CA conditional progress waiver, Berryessa job (owner from the bid set; customer, job location and amount from the PropX proposal); Ohio for the general form");
    tools.push(t);
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    const values = { company: COMPANY, customer: proposal?.client_name, propertyLocation: proposal?.project_address, owner: BERRY.owner, throughDate: "September 30, 2026", checkMaker: proposal?.client_name, amount: proposal?.grand_total, payee: COMPANY, signerTitle: "President", date: today };
    const r = await post("/api/forms/lienx/pdf", { state: "CA", kind: "conditional_progress", values });
    if (t.check("PDF returned", isPdf(r), "HTTP " + r.status)) {
      const pdf = readPdf(r.buf, "lienx"), txt = body(pdf.text);
      // The statute's form, line by line, in order (Civ. Code § 8132, from the repo's copy of the official text).
      const st = readFileSync(join(REPO, "weyland-forms-worker/statutes/ca-8132-8138.txt"), "utf8");
      const form = st.slice(st.indexOf("CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT"), st.indexOf("§ 8134."));
      const lines = [];
      for (const l of form.split("\n").map((x) => x.trim()).filter(Boolean)) { if (/^[a-z]/.test(l) && lines.length) lines[lines.length - 1] += " " + l; else lines.push(l); }
      let at = 0;
      const missing = [];
      for (const l of lines.map((x) => norm(x.replace(/\s*\$$/, "")))) { const i = txt.indexOf(l, at); if (i < 0) missing.push(l); else at = i + l.length; }
      t.numbers.statute_lines = lines.length; t.numbers.statute_lines_in_order = lines.length - missing.length;
      t.check("every line of the Civ. Code § 8132 form, word for word and in order", !missing.length, missing.length ? "missing/out of order: " + missing.slice(0, 3).join(" | ") : lines.length + " lines");
      const facts = { "Name of Claimant": COMPANY, "Name of Customer": values.customer, "Job Location": values.propertyLocation, Owner: values.owner, "Through Date": values.throughDate, "Maker of Check": values.checkMaker, "Amount of Check": money(values.amount), "Check Payable to": values.payee, "Date of Signature": today };
      const wrong = Object.entries(facts).filter(([, v]) => !v || !txt.includes(norm(v)));
      t.check("job facts filled (owner, customer, location, amount, dates)", !wrong.length, wrong.length ? "not in PDF: " + wrong.map(([k, v]) => k + "=" + v).join("; ") : Object.values(facts).join(" | "));
      const ph = placeholders(pdf.text);
      t.check("no placeholder text", !ph.length, ph.join(", "));
      t.numbers.pages = pdf.pages;
    }
    const states = await api("/api/forms/lienx/states");
    const carried = ((states.data && states.data.statutory) || []).map((s) => s.code).sort();
    const refused = ((states.data && states.data.refused) || []).map((s) => s.code);
    t.numbers.states_carried = carried.join(",");
    t.check("the ten states the card names are the statutory states carried", carried.join(",") === "AZ,CA,FL,GA,MI,MS,NV,TX,UT,WY", carried.join(","));
    t.numbers.states_refused = refused.length;
    if (!refused.length) t.notes.push("The refused list is empty, so no state is refused today; the card's refusal branch cannot be exercised.");
    const oh = await post("/api/forms/lienx/pdf", { state: "OH", kind: "conditional_progress", values });
    if (t.check("Ohio (no statutory form) gets a PDF", isPdf(oh), "HTTP " + oh.status)) {
      const ot = body(readPdf(oh.buf, "lienx-oh").text);
      t.check("Ohio's waiver is labelled a general form", /General-form waiver/i.test(ot) && /general-form waiver/i.test(ot), "label found: " + /General-form waiver/i.test(ot));
    }
    t.summary = `CA § 8132: ${t.numbers.statute_lines_in_order ?? 0} of ${t.numbers.statute_lines ?? "?"} statute lines in order; amount ${money(proposal?.grand_total)}; ${carried.length} statutory states; ${refused.length} refused`;
  }

  // ---- BidX ----------------------------------------------------------------------------------
  if (want("bidx")) {
    const t = new Tool("bidx", "BidX", "Builds the bid form for a public bid from a HuntX notice and your PropX proposal: base bid in words and figures, schedule of values, alternates, unit prices, addenda acknowledged, bid bond, qualifications, and a bidder checklist.", "");
    tools.push(t);
    let opp = null;
    if (args.opportunity) opp = { id: String(args.opportunity) };
    else {
      const h = await api("/api/hunt/opportunities?fit=doors&limit=50");
      const today = new Date().toISOString().slice(0, 10);
      opp = ((h.data && h.data.opportunities) || []).find((o) => /door/i.test(o.title) && o.key_date && o.key_date.slice(0, 10) >= today) || null;
    }
    t.input = `HuntX notice "${opp?.title || opp?.id}" (${opp?.agency || ""}) + PropX quote ${proposal?.quote_number} (Berryessa, ${money(proposal?.grand_total)})`;
    const lines = (contract && contract.lines) || [];
    const set = (n) => lines.find((l) => new RegExp("Hardware set " + n + "$").test(l.description));
    const unitPrices = [set(2), set(1)].filter(Boolean).map((l) => ({ description: l.description + " (per opening, from the PropX quote)", unit: "EA", price: l.unit_price }));
    const alt = set(1) ? [{ no: "1", description: "Deduct hardware set 1 at Majestic Way openings 002 and 003", kind: "deduct", amount: r2(2 * set(1).unit_price) }] : [];
    const req = { opportunityId: opp?.id, proposalId: proposal?.id, company: COMPANY, signer: "QA Signer", signerTitle: "President", bondPercent: BERRY.bondPercent, unitPrices, alternates: alt, addenda: [],
      exclusions: "Permanent cores excluded: the hardware schedule reads VERIFY PERMANENT CORE WITH DISTRICT (sets 1 and 2)." };
    const pv = await post("/api/forms/bidx/preview", req);
    const pkg = pv.data && pv.data.package;
    t.check("preview joins the notice and the proposal", pv.ok && pkg && pkg.bid.agency && /PropX quote/.test(pkg.priceSource || ""), "HTTP " + pv.status + " " + (pkg ? pkg.priceSource : JSON.stringify(pv.data).slice(0, 200)));
    const r = await post("/api/forms/bidx/pdf", req);
    if (t.check("PDF returned", isPdf(r), "HTTP " + r.status) && pkg && proposal) {
      const pdf = readPdf(r.buf, "bidx"), txt = body(pdf.text);
      const notice = { agency: opp.agency || pkg.bid.agency, solicitation: opp.title || pkg.bid.solicitation, location: opp.location || pkg.bid.location, due: String(opp.key_date || pkg.bid.due).slice(0, 40), notice: opp.detail_url || pkg.bid.noticeUrl, reference: pkg.bid.reference };
      // The due date may print as a date ("December 15, 2026") rather than the notice's timestamp.
      const longDate = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v)); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : null; };
      const nmiss = Object.entries(notice).filter(([k, v]) => v && !txt.includes(norm(v)) && !(k === "due" && longDate(v) && txt.includes(longDate(v))));
      t.check("HuntX notice facts on the bid form (agency, solicitation, location, due, notice link)", !nmiss.length, nmiss.length ? "missing: " + nmiss.map(([k, v]) => k + "=" + v).join("; ") : Object.values(notice).filter(Boolean).join(" | "));
      const fig = money(proposal.grand_total), w = words(Number(proposal.grand_total));
      t.check("base bid in words and figures = the PropX total", txt.includes(norm(`${w} (${fig})`)), `${w} (${fig})`);
      const sov = lines.map((l) => [l.description, String(l.quantity), money(l.unit_price), money(r2(l.quantity * l.unit_price))]);
      const sovMiss = sov.filter((row) => !row.every((c) => txt.includes(norm(c))));
      const sum = r2(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0));
      t.numbers.sov_lines = lines.length; t.numbers.sov_sum = sum; t.numbers.proposal_subtotal = proposal.subtotal;
      t.check("schedule of values = the proposal's lines (qty, unit, amount) and sums to its subtotal", !sovMiss.length && Math.abs(sum - Number(proposal.subtotal)) < 0.01 && txt.includes(norm("Base bid (including tax as quoted)")),
        sovMiss.length ? "rows not found: " + sovMiss.map((x) => x.join(" ")).join("; ") : `${lines.length} lines, sum ${money(sum)} vs subtotal ${money(proposal.subtotal)}`);
      t.check("alternate and unit prices printed", alt.every((a) => txt.includes(norm(a.description)) && txt.includes("DEDUCT " + money(a.amount))) && unitPrices.every((u) => txt.includes(norm(u.description))), alt.map((a) => a.description + " " + money(a.amount)).join("; "));
      t.check("addenda section present (none listed)", /Addenda acknowledged/.test(txt) && /None issued \/ none listed/.test(txt));
      const bond = money(r2(Number(proposal.grand_total) * BERRY.bondPercent / 100));
      t.check("bid bond 10% (Berryessa 00 21 13) of the base bid", txt.includes(`bid bond of 10% of the base bid (${bond})`), bond);
      t.check("qualifications/exclusions printed", txt.includes(norm(req.exclusions)));
      const cl = ["Bid form signed", "Bid security (bond or check)", "Addenda acknowledged", "Schedule of values", "Non-collusion affidavit"];
      t.check("bidder checklist printed", /BIDDER'S CHECKLIST/.test(txt) && cl.every((c) => txt.includes(c)));
      const ph = placeholders(pdf.text);
      t.check("no placeholder text", !ph.length, ph.join(", "));
      t.notes.push("HuntX holds no Berryessa notice (searched 'Berryessa', 'door replacement', state CA + fit doors), so the notice and the proposal are different jobs; the check is that each one's facts reach the form.");
      t.numbers.pages = pdf.pages;
      t.summary = `base bid ${fig} in words and figures; SOV ${lines.length} lines = ${money(sum)}; bond ${bond}; notice ${notice.reference || opp.id}`;
    }
  }

  // ---- CoA, CloseX, RFaX: the Berryessa job as SubX read it ------------------------------------
  const bOpen = expectedOpenings(berry);
  const ftin = (i) => Math.floor(i / 12) + "'-" + Math.round(i % 12) + '"';
  const sizeOf = (o) => `${o.pair ? "PR " : ""}${ftin(o.width_inches)} x ${ftin(o.height_inches)}`;

  if (want("coa")) {
    const t = new Tool("coa", "CoA", "The certificate of occupancy request package with an acceptance inspection record for every fire-rated opening in your SubX schedule: rating, hardware, a flag when the set has no closer or latch, and the checks NFPA 80 calls for, with pass/fail and sign-off.",
      `Berryessa SubX session (${bOpen.length} openings, all 120 min rated, sets 1 and 2)`);
    tools.push(t);
    const r = await post("/api/forms/coa/pdf", { sessionId: berry.id, ahj: "Division of the State Architect (DSA)", owner: BERRY.owner, contact: COMPANY });
    if (t.check("PDF returned", isPdf(r), "HTTP " + r.status)) {
      const pdf = readPdf(r.buf, "coa"), txt = body(pdf.text);
      const rated = bOpen.filter((o) => o.fire_rating && o.fire_rating !== "NR");
      const recs = rated.map((o) => ({ o, re: new RegExp("Opening " + o.subxMark.replace(/[.[\]]/g, "\\$&") + "(?: · [^·]*)? · rating " + o.fire_rating + "(?: · [^·]*)? · set " + o.set + "\\b") }));
      const missing = recs.filter((x) => !x.re.test(txt)).map((x) => x.o.subxMark);
      t.numbers.rated_expected = rated.length; t.numbers.records = rated.length - missing.length;
      t.check("one record per fire-rated opening, with its rating and set", !missing.length, missing.length ? "no record for " + missing.join(", ") : rated.length + " records");
      // Every set has a closer and a latching exit device, so a flag would be wrong.
      const flags = (pdf.text.match(/NOT LISTED/g) || []).length;
      t.check("closer / latch flags right (both sets have LCN 4040XP and a Von Duprin exit device: no flags)", flags === 0 && (txt.match(/Self-closing in the set: yes · positive latching in the set: yes/g) || []).length === rated.length, flags + " flags");
      const hw = ["5BB1HW 4.5 X 4.5", "PA-AX-99-L-F-2SI-06", "PA-AX-9927-EO-F-LBR-499F", "20-057 ICX", "4040XP EDA"];
      t.check("hardware of the set listed on the record", hw.every((h) => txt.includes(h)), hw.filter((h) => !txt.includes(h)).join(", "));
      t.check("NFPA 80 checks with PASS / FAIL / NA and sign-off per opening", (txt.match(/PASS \/ FAIL \/ NA/g) || []).length >= rated.length && (txt.match(/Inspected by: _/g) || []).length === rated.length && (txt.match(/Self-closing device operates/g) || []).length === rated.length, `${(txt.match(/Inspected by: _/g) || []).length} sign-off lines`);
      const pairs = bOpen.filter((o) => o.pair);
      const pairShown = pairs.filter((o) => new RegExp("Opening " + o.subxMark.replace(/[.[\]]/g, "\\$&") + "[^\\n]*PR").test(txt) || txt.includes(o.subxMark + " · rating 120 · PR")).length;
      t.numbers.pairs = pairs.length; t.numbers.pairs_shown_as_pairs = pairShown;
      t.check("openings' sizes are the schedule's (pairs shown as pairs)", pairShown === pairs.length, `${pairShown} of ${pairs.length} pairs (PR) shown as pairs; e.g. ${(txt.match(/Opening 001 · [^\n]{0,60}/) || [""])[0]}`);
      t.check("project and owner on the cover", txt.includes(norm(berry.name)) && txt.includes(BERRY.owner));
      const ph = placeholders(pdf.text);
      t.check("no placeholder text", !ph.length, ph.join(", "));
      t.numbers.pages = pdf.pages;
      t.summary = `${t.numbers.records} of ${rated.length} rated openings have a record; ${flags} closer/latch flags (0 expected); pairs shown ${pairShown}/${pairs.length}`;
    }
  }

  if (want("closex")) {
    const t = new Tool("closex", "CloseX", "The Section 08 71 00 closeout from your SubX job: hardware schedule as installed, keying schedule, warranty table per manufacturer, attic stock, checklist with sign-off, and the catalogue page of every installed product.",
      `Berryessa SubX session; warranties from 08 71 00 1.07`);
    tools.push(t);
    const req = { sessionId: berry.id, owner: BERRY.owner, warranties: BERRY.warranties, atticStock: [{ item: "Ives 5BB1HW 4.5 X 4.5 652 hinge", qty: "4" }] };
    const pv = await post("/api/forms/closex/preview", req);
    const r = await post("/api/forms/closex/pdf", req);
    if (t.check("PDF returned", isPdf(r), "HTTP " + r.status)) {
      const pdf = readPdf(r.buf, "closex"), txt = body(pdf.text);
      const heads = bOpen.filter((o) => new RegExp("Opening " + o.subxMark.replace(/[.[\]]/g, "\\$&") + "(?: · [^·]*)? · 120 rated · set " + o.set + "\\b").test(txt));
      t.numbers.openings = heads.length;
      t.check("hardware schedule as installed: every opening with rating and set", heads.length === bOpen.length, `${heads.length} of ${bOpen.length}`);
      const cats = [...new Set(berry.groups.groups.flatMap((g) => g.items.map((i) => i.catalog)))];
      // A long catalogue number wraps inside its table cell; it is looked for with the spaces taken out.
      const flat = txt.replace(/\s+/g, ""), has = (c) => flat.includes(norm(c).replace(/\s+/g, ""));
      t.check("every scheduled item (catalogue number) in the as-installed schedule", cats.every(has), cats.filter((c) => !has(c)).join(", ") || cats.length + " catalogue numbers");
      const pairs = bOpen.filter((o) => o.pair);
      const pairShown = pairs.filter((o) => new RegExp("Opening " + o.subxMark.replace(/[.[\]]/g, "\\$&") + " · PR").test(txt)).length;
      t.numbers.pairs_shown_as_pairs = `${pairShown}/${pairs.length}`;
      t.check("opening sizes are the schedule's (pairs shown as pairs)", pairShown === pairs.length, `${pairShown} of ${pairs.length} pairs shown as PR; e.g. ${(txt.match(/Opening 001 · [^\n]{0,50}/) || [""])[0]}`);
      const ks = txt.slice(txt.lastIndexOf("2. Keying schedule"), txt.lastIndexOf("3. Warranties"));
      t.numbers.keyed = bOpen.filter((o) => ks.includes(o.subxMark)).length;
      t.check("keying schedule lists every keyed opening (all 24 have rim cylinders)", t.numbers.keyed === bOpen.length, `${t.numbers.keyed} of ${bOpen.length}`);
      const wt = txt.slice(txt.lastIndexOf("3. Warranties"), txt.lastIndexOf("4. Attic stock"));
      const wmiss = Object.entries(BERRY.warranties).filter(([m, v]) => !wt.includes(m) || !wt.includes(norm(v).slice(0, 20)));
      t.check("warranty table per manufacturer (terms from the spec)", !wmiss.length && !/enter the manufacturer's terms/.test(wt), wmiss.map(([m]) => m).join(", ") || Object.keys(BERRY.warranties).join(", "));
      t.check("attic stock and checklist with sign-off", txt.includes(norm(req.atticStock[0].item)) && /5\. Closeout checklist/.test(txt) && /Installer:/.test(txt) && /Accepted by:/.test(txt));
      // Product data: every installed product (maker + model; the core line is a note, not a product).
      const products = [...new Map(berry.groups.groups.flatMap((g) => g.items).filter((i) => i.mfr).map((i) => [i.mfr + "|" + i.catalog, i])).values()];
      const pd = txt.slice(txt.lastIndexOf("6. Product data"));
      const m = pd.match(/is cited on follows \((\d+)\)/);
      const noPage = (pd.match(/No catalogue page on file for: ([^.]*)\./) || [])[1] || "";
      t.numbers.products = products.length; t.numbers.cited_pages = m ? Number(m[1]) : 0; t.numbers.no_page_line = noPage;
      const corePages = pdf.text.split("\f").findIndex((p) => /6\. Product data/.test(p));
      t.numbers.appended_pages = pdf.pages - (corePages + 1) - (pdf.text.split("\f").slice(corePages + 1).filter((p) => /door hardware closeout · WeylandAI CloseX/.test(p)).length);
      // The interchangeable-core line is a note on the schedule ("VERIFY PERMANENT CORE WITH DISTRICT"), not a product.
      const realMiss = noPage.split(/,\s*/).filter((x) => x && !/VERIFY PERMANENT CORE/i.test(x));
      t.numbers.products_without_page = realMiss.join("; ");
      t.check("the catalogue page of every installed product", products.length && !realMiss.length && t.numbers.appended_pages >= t.numbers.cited_pages,
        `${t.numbers.cited_pages} pages cited for ${products.length} products, ${t.numbers.appended_pages} appended; products with no page: ${realMiss.join("; ") || "none"}`);
      t.check("project and owner on the cover", txt.includes(norm(berry.name)) && txt.includes(BERRY.owner));
      const ph = placeholders(pdf.text);
      t.check("no placeholder text", !ph.length, ph.join(", "));
      t.numbers.pages = pdf.pages;
      t.numbers.room_names_printed = bOpen.filter((o) => txt.includes(o.room)).length;
      if (!t.numbers.room_names_printed) t.notes.push("No room names (ADMIN LOBBY HALL, A-POD / CORRIDOR, ...) appear: SubX's door rows carry no location for Berryessa.");
      t.summary = `${heads.length}/${bOpen.length} openings, ${t.numbers.keyed} keyed, ${Object.keys(BERRY.warranties).length - wmiss.length}/5 warranties, ${t.numbers.cited_pages} catalogue pages for ${products.length} products${t.numbers.products_without_page ? " (no page: " + t.numbers.products_without_page + ")" : ""}; pairs ${pairShown}/${pairs.length}`;
    }
    if (pv.data) t.numbers.preview_products = pv.data.products;
  }

  if (want("rfax")) {
    const t = new Tool("rfax", "RFaX", "Reads your SubX schedule and finds what to ask: missing hardware sets, fire-rated openings without a closer or latch, missing sizes, unnamed manufacturers. Each becomes a numbered RFI with the affected openings and schedule pages attached, tracked until answered.",
      "Berryessa SubX session");
    tools.push(t);
    // What the hand-read schedule leaves to ask: no set missing, every rated set has a closer and a latch,
    // every opening has a size, one item with no maker (the interchangeable core note, sets 1 and 2).
    const expect = new Set(["no_manufacturer"]);
    const s = await api("/api/forms/rfax/session/" + berry.id);
    const issues = (s.data && s.data.issues) || [];
    t.numbers.issues = issues.map((i) => i.kind).join(",");
    t.check("issues found = the schedule's real gaps (only: core with no manufacturer, sets 1 and 2)", issues.length === expect.size && issues.every((i) => expect.has(i.kind)) && /VERIFY PERMANENT CORE WITH DISTRICT \(sets 1, 2\)/.test(issues[0]?.question || ""), JSON.stringify(issues.map((i) => i.subject + ": " + i.question)).slice(0, 400));
    const before = ((s.data && s.data.rfis) || []).reduce((m, x) => Math.max(m, x.number), 0);
    const iss = issues[0] || { subject: "Hardware items with no manufacturer named", question: "Confirm the permanent core manufacturer." };
    const a = await post("/api/forms/rfax/save", { sessionId: berry.id, subject: iss.subject, question: iss.question, suggestion: "Schlage FSIC cores to match the 20-057 ICX rim cylinders (Section 08 71 00 2.03 names a Schlage masterkey system).", openings: bOpen.map((o) => o.subxMark), to: "Architect of record, " + BERRY.owner, responseBy: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), impact: "Cores cannot be ordered until answered" });
    const pairQ = bOpen.filter((o) => o.pair);
    const b = await post("/api/forms/rfax/save", { sessionId: berry.id, subject: "Pair sizes", question: "The door schedules list pairs as PR 3'-6\" x 7'-10\". Confirm whether 3'-6\" is each leaf or the pair.", openings: pairQ.map((o) => o.subxMark), to: "Architect of record", impact: "Hardware sizes (kick plates, exit devices)" });
    const n1 = a.data?.rfi?.number, n2 = b.data?.rfi?.number;
    t.check("RFIs numbered in turn", n1 === before + 1 && n2 === before + 2, `${n1}, ${n2}`);
    const p = a.data?.rfi?.id ? await api("/api/forms/rfax/" + a.data.rfi.id + "/pdf") : { status: 0 };
    if (t.check("PDF returned", isPdf(p), "HTTP " + p.status)) {
      const pdf = readPdf(p.buf, "rfax"), txt = body(pdf.text);
      t.check("RFI number, project, question on the RFI", txt.includes(`REQUEST FOR INFORMATION No. ${n1}`) && txt.includes(norm(berry.name)) && txt.includes(norm(iss.question)));
      const inTable = bOpen.filter((o) => txt.includes(o.subxMark));
      t.numbers.affected_openings = inTable.length;
      t.check("affected openings listed (mark, set, items, page)", inTable.length === bOpen.length && txt.includes("4040XP EDA"), `${inTable.length} of ${bOpen.length}`);
      const pages = [...new Set(berry.doors.doors.map((d) => d.page))].sort((x, y) => x - y);
      const pagesText = pdf.text.split("\f");
      const attached = pagesText.filter((pg) => /DOOR SCHEDULE/i.test(pg) && /ADMIN LOBBY HALL/.test(pg)).length;
      t.numbers.pdf_pages = pdf.pages; t.numbers.schedule_pages_attached = attached;
      t.check("schedule pages attached", txt.includes(`Attached: schedule pages ${pages.join(", ")}`) && attached === pages.length, `${attached} of ${pages.length} schedule pages (${pages.join(", ")}) in the PDF`);
      const pairs = bOpen.filter((o) => o.pair);
      // Only the RFI's own pages: the attached schedule sheets print "PR" themselves.
      const own = norm(pagesText.filter((pg) => /WeylandAI RFaX/.test(pg)).join("\n"));
      const rows = pairs.filter((o) => new RegExp(o.subxMark.replace(/[.[\]]/g, "\\$&") + "\\s+PR ").test(own)).length;
      t.check("openings' sizes are the schedule's (pairs shown as pairs)", rows === pairs.length, `${rows} of ${pairs.length} pairs shown as PR`);
      const ph = placeholders(pdf.text);
      t.check("no placeholder text", !ph.length, ph.join(", "));
    }
    if (a.data?.rfi?.id) await post("/api/forms/rfax/" + a.data.rfi.id + "/answer", { response: "Provide Schlage FSIC cores, keyed to the district's system.", status: "answered" });
    const s2 = await api("/api/forms/rfax/session/" + berry.id);
    const st = ((s2.data && s2.data.rfis) || []);
    const x1 = st.find((x) => x.number === n1), x2 = st.find((x) => x.number === n2);
    t.check("tracked until answered (answered RFI shows its answer and date; the other stays open)", x1?.status === "answered" && x1?.answered_at && x1?.response && x2?.status === "open" && x2?.days_outstanding === 0, JSON.stringify([x1 && { n: x1.number, status: x1.status, answered_at: x1.answered_at }, x2 && { n: x2.number, status: x2.status, days: x2.days_outstanding }]));
    t.summary = `issues: ${t.numbers.issues || "none"}; RFIs ${n1}, ${n2}; ${t.numbers.affected_openings ?? 0} openings, ${t.numbers.schedule_pages_attached ?? 0} schedule pages attached; answered tracked`;
  }

  // ---- ChangeOrdX ----------------------------------------------------------------------------
  if (want("changeordx")) {
    const t = new Tool("changeordx", "ChangeOrdX", "Prices change orders from your PropX contract's own unit prices plus labor, overhead, profit, tax and bond; numbers them per contract and carries the contract sum and time forward through the approved ones.",
      `PropX quote ${proposal?.quote_number} (Berryessa, ${money(proposal?.grand_total)}): CO A adds one hardware set 2, approved; CO B deletes one set 1`);
    tools.push(t);
    if (contract) {
      const lines = contract.lines, s2 = lines.find((l) => /Hardware set 2$/.test(l.description)), s1 = lines.find((l) => /Hardware set 1$/.test(l.description));
      t.check("the proposal's unit prices match its PropX PDF", propxText && has(propxText, money(s2.unit_price)) && has(propxText, money(s1.unit_price)), `set 2 ${money(s2.unit_price)}, set 1 ${money(s1.unit_price)} in the PropX PDF: ${!!propxText && has(propxText, money(s2.unit_price))}`);
      const taxRate = Number(contract.tax_rate) || 0;
      const price = (mat, lab, mk) => { const sub = r2(mat + lab), oh = r2(sub * mk.overhead / 100), pr = r2((sub + oh) * mk.profit / 100), tax = r2(mat * taxRate), bond = r2((sub + oh + pr + tax) * (mk.bond || 0) / 100); return { sub, oh, pr, tax, bond, total: r2(sub + oh + pr + tax + bond) }; };
      const prior = contract.change_orders || [];
      const approvedBefore = r2(prior.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount), 0));
      const daysBefore = prior.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.days), 0);
      const lastNo = prior.reduce((m, c) => Math.max(m, c.number), 0);
      const mkA = { overhead: 10, profit: 5, bond: 1 }, mkB = { overhead: 10, profit: 5, bond: 0 };
      const A = { proposalId: proposal.id, title: "Add hardware set 2 at one more pair", reason: "Owner adds one pair to the scope.", items: [{ action: "add", ref: s2.ref, qty: 1 }], labor: [{ description: "Install hardware set 2", hours: 4, rate: 95 }], markup: mkA, days: 2, company: COMPANY };
      const B = { proposalId: proposal.id, title: "Delete hardware set 1 at one opening", reason: "Opening 003 at Majestic Way stays as is.", items: [{ action: "delete", ref: s1.ref, qty: 1 }], labor: [], markup: mkB, days: 0, company: COMPANY };
      const eA = price(s2.unit_price, 380, mkA), eB = price(-s1.unit_price, 0, mkB);
      const sa = await post("/api/forms/changeordx/save", A);
      const idA = sa.data?.changeOrder?.id;
      if (idA) cleanup.push(() => post("/api/forms/changeordx/" + idA + "/status", { status: "rejected" }));
      t.check("CO A priced at the contract's unit price + labor, overhead, profit, tax, bond", sa.ok && Math.abs(sa.data.changeOrder.amount - eA.total) < 0.005 && sa.data.changeOrder.number === lastNo + 1, `amount ${sa.data?.changeOrder?.amount} vs expected ${eA.total}; number ${sa.data?.changeOrder?.number} vs ${lastNo + 1}`);
      if (idA) await post("/api/forms/changeordx/" + idA + "/status", { status: "approved" });
      const sb = await post("/api/forms/changeordx/save", B);
      const idB = sb.data?.changeOrder?.id;
      if (idB) cleanup.push(() => post("/api/forms/changeordx/" + idB + "/status", { status: "rejected" }));
      t.check("CO B (a deduct) priced and numbered next", sb.ok && Math.abs(sb.data.changeOrder.amount - eB.total) < 0.005 && sb.data.changeOrder.number === lastNo + 2, `amount ${sb.data?.changeOrder?.amount} vs expected ${eB.total}; number ${sb.data?.changeOrder?.number}`);
      const pa = idA ? await api("/api/forms/changeordx/" + idA + "/pdf") : { status: 0 };
      const pb = idB ? await api("/api/forms/changeordx/" + idB + "/pdf") : { status: 0 };
      if (t.check("PDFs returned", isPdf(pa) && isPdf(pb), `HTTP ${pa.status}, ${pb.status}`)) {
        const ta = body(readPdf(pa.buf, "changeordx-a").text), tbp = readPdf(pb.buf, "changeordx-b"), tb = body(tbp.text);
        t.check("CO A PDF: contract line at contract unit price, tax at the contract's rate, total", ta.includes(norm(s2.description + " (contract unit price)")) && ta.includes(`Sales tax on materials (${r2(taxRate * 100)}%, from the contract) ${money(eA.tax)}`) && ta.includes(`THIS CHANGE ORDER ${money(eA.total)}`), `tax ${money(eA.tax)}, total ${money(eA.total)}`);
        const orig = r2(proposal.grand_total), prevB = r2(orig + approvedBefore + eA.total), newB = r2(prevB + eB.total);
        const rows = [`Original contract sum ${money(orig)}`, `Net change by previously approved change orders ${money(r2(approvedBefore + eA.total))}`, `Contract sum prior to this change order ${money(prevB)}`, `New contract sum including this change order ${money(newB)}`, `Contract time changed by previously approved change orders (days) ${daysBefore + 2}`, `CHANGE ORDER No. ${lastNo + 2}`];
        const miss = rows.filter((x) => !tb.includes(x));
        t.check("CO B PDF carries the sum and time forward through approved CO A", !miss.length, miss.length ? "missing: " + miss.join(" | ") : `prior ${money(prevB)} -> new ${money(newB)}, days ${daysBefore + 2}`);
        t.check("project, customer and base contract on the CO", tb.includes(norm(proposal.project_address)) && tb.includes(norm(proposal.client_name)) && tb.includes(`Quote ${proposal.quote_number}`));
        const ph = placeholders(tbp.text).concat(placeholders(ta));
        t.check("no placeholder text", !ph.length, ph.join(", "));
        t.summary = `CO ${lastNo + 1} ${money(eA.total)} (approved), CO ${lastNo + 2} ${money(eB.total)}; contract ${money(orig)} -> ${money(prevB)} -> ${money(newB)}; both set to rejected afterwards`;
      }
      t.notes.push("Both test change orders are set to 'rejected' afterwards so the contract sum carried forward is unchanged; they stay on the contract (no delete in the API).");
    } else t.check("a Berryessa PropX proposal on the account", false, "none found");
  }

  // ---- PermitX -------------------------------------------------------------------------------
  if (want("permitx")) {
    const t = new Tool("permitx", "PermitX", "Writes the scope of work from your SubX schedule and lists every opening with electrified, access-control or operator hardware, the plan-review coordination (power, fire alarm release, free egress) and the electrified products' catalogue pages.",
      "Berryessa SubX session (no electrified hardware) and Rockford SubX session (sets 32 EXD, 40 UTY, 44 UTY-IT electrified)");
    tools.push(t);
    // Berryessa: scope numbers from the hand-read schedule.
    const items = bOpen.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0);
    const scope = `Furnish and install door hardware at ${bOpen.length} openings (${bOpen.filter((o) => o.fire_rating).length} fire-rated), ${items} hardware items in ${new Set(bOpen.map((o) => o.set)).size} hardware sets per the door and hardware schedules.`;
    const rb = await post("/api/forms/permitx/pdf", { sessionId: berry.id, ahj: "Division of the State Architect (DSA)", applicant: COMPANY, owner: BERRY.owner });
    if (t.check("Berryessa PDF returned", isPdf(rb), "HTTP " + rb.status)) {
      const pdf = readPdf(rb.buf, "permitx-berryessa"), txt = body(pdf.text);
      t.check("Berryessa scope of work = the schedule's counts", txt.includes(norm(scope)), scope);
      t.check("Berryessa: no electrified openings listed (none in the schedule)", txt.includes("Electrified and access-controlled openings (0)") && txt.includes("None in the hardware schedule."));
      t.check("plan-review coordination (power, fire alarm release, free egress)", /Power supply and wiring/.test(txt) && /Fire alarm interface/.test(txt) && /Egress side: doors open from the egress side/.test(txt));
      const ph = placeholders(pdf.text);
      t.check("no placeholder text (Berryessa)", !ph.length, ph.join(", "));
    }
    // Rockford: which openings are truly electrified (electric strike, power transfer, electrified panic hardware).
    const rOpen = expectedOpenings(rock);
    const ELEC = /electri|\bELEC\b|power transfer|mag(netic)? ?lock|card reader|credential reader|keypad|operator|actuator|delayed egress|request.to.exit|door position switch/i;
    const truth = rOpen.filter((o) => o.items.some((i) => ELEC.test(i.description + " " + i.catalog)));
    const pv = await post("/api/forms/permitx/preview", { sessionId: rock.id });
    const listed = ((pv.data && pv.data.electrified) || []);
    const tm = new Set(truth.map((o) => o.subxMark)), lm = new Set(listed.map((o) => o.mark));
    const fn = truth.filter((o) => !lm.has(o.subxMark)).map((o) => `${o.subxMark} (set ${o.hardware_group})`);
    const fp = listed.filter((o) => !tm.has(o.mark)).map((o) => `${o.mark} (set ${o.set}: ${o.items.filter((x) => /strike/i.test(x)).join("; ") || o.items.slice(0, 2).join("; ")})`);
    t.numbers.rockford_electrified_expected = truth.length; t.numbers.rockford_listed = listed.length;
    t.check("Rockford: every electrified opening listed, and only those", !fn.length && !fp.length, `expected ${truth.length} (${truth.map((o) => o.subxMark).join(", ")}); listed ${listed.length}; missed: ${fn.join(", ") || "none"}; not electrified but listed: ${fp.join(", ") || "none"}`);
    const rr = await post("/api/forms/permitx/pdf", { sessionId: rock.id, applicant: COMPANY });
    if (t.check("Rockford PDF returned", isPdf(rr), "HTTP " + rr.status)) {
      const pdf = readPdf(rr.buf, "permitx-rockford"), txt = body(pdf.text);
      const eprod = [...new Map(truth.flatMap((o) => o.items).filter((i) => ELEC.test(i.description + " " + i.catalog) && i.mfr && i.mfr !== "B/O").map((i) => [i.catalog, i])).values()];
      const sec = txt.slice(txt.indexOf("Product data for electrified hardware"));
      const noPage = (sec.match(/No catalogue page on file for: ([^.]*)\./) || [])[1] || "";
      const cited = eprod.filter((p) => sec.includes(norm(p.catalog).split(" ")[0]) && !noPage.includes(norm(p.catalog).split(" ")[0]));
      t.numbers.electrified_products = eprod.map((p) => p.catalog).join("; "); t.numbers.catalogue_pages_cited = cited.length;
      const uncited = eprod.filter((p) => !cited.includes(p)).map((p) => `${p.mfr} ${p.catalog} (${p.description})`);
      t.check("the electrified products' catalogue pages", cited.length === eprod.length, `${cited.length} of ${eprod.length} electrified products have a cited page; not cited: ${uncited.join("; ") || "none"}; PDF's own "no page on file" line: ${noPage || "absent"}`);
      const ph = placeholders(pdf.text);
      t.check("no placeholder text (Rockford)", !ph.length, ph.join(", "));
    }
    t.summary = `Berryessa scope "${bOpen.length} openings (${bOpen.length} fire-rated), ${items} items in 2 sets", 0 electrified; Rockford ${listed.length} listed vs ${truth.length} electrified (missed ${fn.length}, extra ${fp.length}); catalogue pages ${t.numbers.catalogue_pages_cited ?? 0}`;
  }

  // ---- SafetyX -------------------------------------------------------------------------------
  if (want("safetyx")) safety: {
    const t = new Tool("safetyx", "SafetyX", "Reads your safety reports and daily logs (text or scanned) and lists every incident, injury and hazard with its page, sorted by OSHA hazard (falls, struck-by, caught-in, electrocution first) with the 29 CFR 1926 standard. Injuries get a 29 CFR 1904.7 recording hint. Your safety log keeps corrective actions with owners and due dates, and builds the OSHA 300 log and 300A summary from your cases. Reading and the log are free; the 300/300A forms and exports are paid.",
      "NIOSH FACE Report 2000-16 (Alabama, 16-year-old framer fell 27 ft and was struck by a truss; died), 20 pages, text layer");
    tools.push(t);
    let file = args["safety-pdf"] ? String(args["safety-pdf"]) : join(TMP, "face-2000-16.pdf");
    // curl, not fetch: CDC's edge answers Node's fetch with 403.
    if (!args["safety-pdf"]) { try { execFileSync("curl", ["-sSfL", "-m", "120", "-o", file, SAFETY_URL]); } catch (e) { /* checked below */ } }
    const sbytes = existsSync(file) ? readFileSync(file) : Buffer.alloc(0);
    t.numbers.input_sha256 = (await import("node:crypto")).createHash("sha256").update(sbytes).digest("hex").slice(0, 16);
    if (!t.check("input is the FACE 2000-16 PDF", sbytes.subarray(0, 5).toString() === "%PDF-" && (args["safety-pdf"] || t.numbers.input_sha256 === "66e38c02a9e2b8b2"), "sha256 " + t.numbers.input_sha256 + " (the copy audited on 2026-10-09: 66e38c02a9e2b8b2)")) { t.summary = "input PDF not downloaded from " + SAFETY_URL; break safety; }
    const fd = new FormData();
    fd.append("file", new Blob([readFileSync(file)], { type: "application/pdf" }), "FACE-2000-16.pdf");
    fd.append("projectName", "Residential dormitory construction site, Alabama (FACE 2000-16)"); fd.append("reportType", "Incident investigation"); fd.append("reportedBy", "NIOSH Division of Safety Research"); fd.append("reportDate", "2001-02-23");
    let an = await api("/api/safety-reports/analyze", { method: "POST", body: fd });
    for (let i = 0; an.status === 202 && i < 60; i++) { await new Promise((r) => setTimeout(r, 3000)); const jid = an.data && an.data.jobId; an = await api("/api/safety-reports/jobs/" + jid); }
    const d = an.data || {};
    const flagged = d.flagged || [];
    t.numbers.pages_read = d.pageCount; t.numbers.flagged = flagged.length;
    t.check("report read", an.ok && d.safetyReportId && flagged.length > 0, `HTTP ${an.status}, ${d.pageCount} pages (${d.textLayerPages} text layer, ${d.ocrPages} OCR), ${flagged.length} lines${an.ok ? "" : " " + JSON.stringify(d).slice(0, 200)}`);
    t.check("every flagged line has its page", flagged.length > 0 && flagged.every((f) => Number(f.page) >= 1));
    const fall = flagged.filter((f) => f.hazard?.key === "fall" && /1926\.501/.test(f.hazard.cfr || ""));
    const fallPages = [...new Set(fall.map((f) => f.page))].sort();
    t.check("the 27 ft fall flagged as Falls with 29 CFR 1926.501 (pages 1 and 3)", fall.some((f) => f.page === 1) && fall.some((f) => f.page === 3), "fall lines on pages " + fallPages.join(", ") + ": " + fall.slice(0, 2).map((f) => "p" + f.page + " " + f.line).join(" | "));
    const struck = flagged.filter((f) => f.hazard?.key === "struck" && /truss/i.test(f.line));
    t.check("struck on the head by a truss flagged as Struck-by (page 3)", struck.some((f) => f.page === 3), struck.map((f) => "p" + f.page + " " + f.line).join(" | ") || flagged.filter((f) => /truss/i.test(f.line)).map((f) => "p" + f.page + " [" + f.hazard?.label + "] " + f.line).join(" | "));
    const death = flagged.filter((f) => f.outcome?.outcome === "death" && /1904\.7\(b\)\(2\)/.test(f.outcome.why || ""));
    t.check("the death gets the 1904.7 recording hint", death.length > 0, death.slice(0, 2).map((f) => "p" + f.page + " " + f.line).join(" | "));
    // The log: corrective action with owner and due date, closed; the case on the OSHA 300 log and 300A.
    const src = fall.find((f) => f.page === 1) || fall[0] || flagged[0];
    const act = await post("/api/safety-reports/actions", { reportId: d.safetyReportId, page: src?.page, line: src?.line, hazard: "fall", action: "Personal fall arrest for all truss setting at 6 ft or more (1926.501(b)(1))", owner: "Framing foreman", due: "2026-10-16" });
    if (act.data?.id) cleanup.push(() => api("/api/safety-reports/actions/" + act.data.id, { method: "DELETE" }));
    await api("/api/safety-reports/actions/" + act.data?.id, { method: "PATCH", headers: J, body: JSON.stringify({ status: "closed", note: "Lifelines rigged" }) });
    const acts = await api("/api/safety-reports/actions?status=closed");
    const a1 = ((acts.data && acts.data.actions) || []).find((x) => x.id === act.data?.id);
    t.check("corrective action kept with owner, due date, hazard, closed", a1 && a1.owner === "Framing foreman" && a1.due === "2026-10-16" && a1.closed_at && a1.hazard === "fall", JSON.stringify(a1 && { owner: a1.owner, due: a1.due, status: a1.status, hazard: a1.hazardLabel }));
    const before = (await api("/api/safety-reports/cases?year=2000")).data?.totals || {};
    const cs = await post("/api/safety-reports/cases", { employee: "Framing crew member (16)", jobTitle: "Framing crew member", eventDate: "2000-04-04", location: "Residential dormitory construction site, Alabama", description: "Fell 27 ft from third story while setting roof trusses; struck on the head by a truss; blunt force trauma", outcome: "death", caseType: "injury", reportId: d.safetyReportId, page: 3 });
    if (cs.data?.id) cleanup.push(() => api("/api/safety-reports/cases/" + cs.data.id, { method: "DELETE" }));
    const after = (await api("/api/safety-reports/cases?year=2000")).data?.totals || {};
    t.check("300A totals count the case (G deaths +1, M1 injuries +1)", (after.G || 0) - (before.G || 0) === 1 && (after.M1 || 0) - (before.M1 || 0) === 1, `G ${before.G} -> ${after.G}, M1 ${before.M1} -> ${after.M1}`);
    const csv = await api("/api/safety-reports/osha300.csv?year=2000");
    t.check("OSHA 300 CSV export carries the case", csv.ok && /Fell 27 ft/.test(csv.buf.toString()) && /2000-04-04/.test(csv.buf.toString()), "HTTP " + csv.status);
    const o3 = await post("/api/safety-reports/osha300.pdf", { year: 2000, establishment: { name: "Framing subcontractor (FACE 2000-16)" } });
    if (t.check("OSHA 300 / 300A PDF returned", isPdf(o3), "HTTP " + o3.status)) {
      const pdf = readPdf(o3.buf, "safetyx-osha300"), txt = body(pdf.text);
      // 300A: the four case counts print on one line above their labels (G, H, I, J).
      const g = txt.match(/Number of cases (\d+) (\d+) (\d+) (\d+) \(G\) Total number of deaths/);
      t.check("300 log row and 300A summary in the PDF", /Fell 27 ft/.test(txt) && g && Number(g[1]) === after.G, g ? `G H I J = ${g.slice(1).join(" ")}` : "300A counts not found");
      const ph = placeholders(pdf.text);
      t.check("no placeholder text", !ph.length, ph.join(", "));
    }
    t.notes.push("No real safety report exists for the Berryessa job; a published NIOSH incident report is the real input. It has a text layer, so the scanned (OCR) path is not exercised here.");
    t.summary = `${flagged.length} lines over ${d.pageCount} pages; falls on pages ${fallPages.join(", ")}; struck-by ${struck.length}; death hint ${death.length}; action + case + 300/300A`;
  }

  // ---- MeetingX and NotesX -------------------------------------------------------------------
  const room = "pa" + Date.now().toString(36);
  const meeting = [
    { kind: "decision", text: "Permanent cores: hold the core order until Berryessa USD names the manufacturer (RFI on the interchangeable core)." },
    { kind: "decision", text: "LCN 4040XP EDA closers at all 24 openings, sets 1 and 2, as scheduled." },
    { kind: "action", text: "Send the core RFI to the architect (owner: hardware PM)", done: true },
    { kind: "action", text: "Confirm whether PR 3'-6\" is per leaf at Majestic Way, Brooktree and Summerdale (owner: estimator)" },
    { kind: "chat", text: "Sets 1 and 2 both carry Von Duprin PA-AX fire exit hardware; no electrified hardware on this job." },
    { kind: "chat", text: "Brooktree has no tag 007 on its schedule; 7 openings there." },
    { kind: "transcript", text: "Let's walk the three A9.2 sheets, 284, 286 and 288." },
    { kind: "transcript", text: "Majestic Way has 9 openings, Brooktree 7, Summerdale 8." },
  ];
  let posted = [], who = null;
  if (want("meetingx") || want("notesx")) {
    const g = await api("/api/sight/room/" + room);
    who = g.data?.name;
    for (const m of meeting) { const r = await post(`/api/sight/room/${room}/record`, { kind: m.kind, text: m.text }); posted.push({ ...m, status: r.status, item: r.data?.item }); }
    for (const p of posted.filter((x) => x.done && x.item)) await post(`/api/sight/room/${room}/record/${p.item.id}/done`, { done: true });
    if (want("meetingx")) {
      const t = new Tool("meetingx", "MeetingX", "A project room with voice, video and screen share between browsers (up to 6 people). Chat, decisions, actions and transcript are saved with the room, so everyone, and anyone who opens it later, sees the same record. Some strict office networks block direct calls.",
        `Room ${room}: the Berryessa coordination meeting, ${meeting.length} record items`);
      tools.push(t);
      t.check("room access for a MeetingX account", g.ok && g.data?.access === true, `HTTP ${g.status} ${JSON.stringify(g.data).slice(0, 120)}`);
      const ice = await api(`/api/sight/room/${room}/ice`);
      t.numbers.turn_relay = !!ice.data?.relay;
      t.check("ICE servers for the browser-to-browser call", ice.ok && JSON.stringify(ice.data?.iceServers || []).includes("stun:"), `relay (TURN): ${!!ice.data?.relay}`);
      const rec = await api(`/api/sight/room/${room}/record`);
      const items = rec.data?.items || [];
      const same = meeting.every((m, i) => items[i] && items[i].kind === m.kind && items[i].text === m.text && items[i].by === who && !!items[i].done === !!m.done);
      t.numbers.saved = posted.filter((p) => p.status === 200).length; t.numbers.read_back = items.length;
      t.check("chat, decisions, actions, transcript saved and read back in order with who, when and done state", same && items.length === meeting.length && items.every((x) => x.at), `${items.length} of ${meeting.length} back; first mismatch: ${JSON.stringify(meeting.map((m, i) => [m, items[i]]).find(([m, x]) => !x || x.kind !== m.kind || x.text !== m.text || !!x.done !== !!m.done) || null).slice(0, 200)}`);
      t.notes.push("Voice, video and screen share run browser to browser over WebRTC and are not exercised over HTTP; the check covers room access, ICE servers and the saved record.");
      t.summary = `${items.length}/${meeting.length} record items read back intact; TURN relay ${t.numbers.turn_relay ? "on" : "off (STUN only)"}`;
    }
    if (want("notesx")) {
      const t = new Tool("notesx", "NotesX", "Turns a MeetingX room's saved record into minutes: attendees, numbered decisions, action items open and done, discussion, and the transcript as an appendix.",
        `Room ${room} (the MeetingX record above)`);
      tools.push(t);
      const r = await post("/api/forms/notesx/pdf", { room, title: "Berryessa door hardware coordination", project: `${BERRY.owner} ${BERRY.bid} ${BERRY.project}`, includeTranscript: true });
      if (t.check("PDF returned", isPdf(r), "HTTP " + r.status)) {
        const pdf = readPdf(r.buf, "notesx"), txt = body(pdf.text);
        t.check("attendees from the record", who && txt.includes(`Attendees: ${who}`), who);
        const dec = meeting.filter((m) => m.kind === "decision");
        t.check("decisions numbered in order", dec.every((m, i) => new RegExp("\\b" + (i + 1) + " " + norm(m.text).slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(txt)), dec.length + " decisions");
        const act = meeting.filter((m) => m.kind === "action");
        const at = txt.slice(txt.indexOf("Action items"), txt.indexOf("Discussion"));
        const doneOk = at.includes("Done") && at.includes("Open") && (at.match(/\bDone\b/g) || []).length === act.filter((a) => a.done).length;
        t.check("action items with open / done state", act.every((m) => at.includes(norm(m.text).slice(0, 30))) && doneOk, at.slice(0, 200));
        t.check("discussion (room chat)", meeting.filter((m) => m.kind === "chat").every((m) => txt.includes(norm(m.text).slice(0, 40))));
        t.check("transcript as an appendix", txt.includes("Appendix: transcript") && meeting.filter((m) => m.kind === "transcript").every((m) => txt.slice(txt.indexOf("Appendix: transcript")).includes(norm(m.text))));
        t.check("meeting date is today's", txt.includes("Date: " + new Date().toISOString().slice(0, 10)));
        const ph = placeholders(pdf.text);
        t.check("no placeholder text", !ph.length, ph.join(", "));
        t.numbers.pages = pdf.pages;
        t.summary = `attendees ${who}; ${dec.length} decisions, ${act.length} actions (${act.filter((a) => a.done).length} done), ${meeting.filter((m) => m.kind === "chat").length} chat, transcript appendix`;
      }
    }
  }
} catch (e) {
  report.error = String(e && e.stack || e).slice(0, 1000);
} finally {
  for (const f of cleanup) { try { await f(); } catch (_) { /* reported via session list */ } }
  report.cleanup = [];
  for (const sid of sessions) { const d = await api("/api/hardware-schedule/session/" + sid, { method: "DELETE" }); report.cleanup.push(sid.slice(0, 8) + ": " + (d.ok ? "deleted" : "HTTP " + d.status)); }
  rmSync(TMP, { recursive: true, force: true });
}

report.tools = tools.map((t) => ({ id: t.id, label: t.label, claim: t.claim, input: t.input, pass: t.pass, summary: t.summary || "", numbers: t.numbers, checks: t.checks, notes: t.notes }));
report.finished_at = new Date().toISOString();
const stamp = report.started_at.slice(0, 16).replace(/[:T]/g, "-");
const md = ["# The form tools on sale, on real project input, " + stamp + (LABEL ? " (" + LABEL.slice(1) + ")" : ""), "",
  "Live API " + BASE + ", as a paying test account. Each tool's output was produced through the site's API, its PDF read back with pdftotext -layout, and checked against the pricing card's claim and the job's real facts (tools/accuracy/product_audit_form_tools.mjs). PASS = every check holds.", "",
  "Setup: Berryessa read by SubX: " + JSON.stringify(report.setup.berryessa?.read) + "; PropX proposal: " + JSON.stringify(report.setup.proposal || null) + (report.setup.rockford ? "; Rockford: " + JSON.stringify(report.setup.rockford.read) : "") + ". Sessions cleaned up: " + (report.cleanup || []).join(", ") + (report.error ? ". ERROR: " + report.error : ""), "",
  "| tool | input | result | numbers |", "|---|---|---|---|",
  ...report.tools.map((t) => `| ${t.label} | ${t.input.replace(/\|/g, "/")} | ${t.pass ? "PASS" : "FAIL"} | ${(t.summary || "").replace(/\|/g, "/")} |`), ""];
for (const t of report.tools) {
  md.push("## " + t.label + ": " + (t.pass ? "PASS" : "FAIL"), "", "Card: \"" + t.claim + "\"", "", "| check | ok | detail |", "|---|---|---|");
  for (const c of t.checks) md.push(`| ${c.name.replace(/\|/g, "/")} | ${c.ok ? "yes" : "NO"} | ${c.detail.replace(/\|/g, "/").replace(/\n/g, " ")} |`);
  if (t.notes.length) md.push("", ...t.notes.map((n) => "- " + n));
  md.push("");
}
writeFileSync(join(here, "product_audit_form_tools_" + stamp + LABEL + ".json"), JSON.stringify(report, null, 2));
writeFileSync(join(here, "product_audit_form_tools_" + stamp + LABEL + ".md"), md.join("\n") + "\n");
console.log(md.join("\n"));
