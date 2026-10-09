// These test the journey's failure boundaries, not production's success.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { hardwareChildDeletes } from "./lib/hardware-cleanup.mjs";
import { DOORS, HARDWARE, doorEvidence, csvEvidence, parseCsv, hardwareEvidence, packetEvidence, packetTextEvidence, firstReadWrites } from "./lib/estimator-assertions.mjs";

const doorRows = () => DOORS.doors.map(d => ({ mark: d.mark, group: d.hardware_group || "(empty)", source: "p.29 row " + (d.row - 1) }));
const hardware = () => ({ hardware_schedule_needed: null,
  hardware_sets: HARDWARE.groups.map(g => ({ set_number: g.group, components: g.items.length })),
  components: HARDWARE.groups.flatMap(g => g.items.map(i => ({ set_number: g.group, quantity: i.qty, model: i.catalog }))) });
const manifest = () => {
  const sections = [
    { type: "cover", pages: 1 }, { type: "toc", pages: 2 }, { type: "door_schedule", doors: 65, pages: 2 },
    ...HARDWARE.groups.map(g => ({ type: "hardware_set", title: "Hardware Group " + g.group, components: g.items.length, pages: 2 })),
    { type: "cut_sheet", title: "SELECT hinge catalogue", pages: 1 }, { type: "cut_sheet_misses", pages: 1 }, { type: "schedule", pages: 8 }
  ];
  return { success: true, paid: true, doors: 65, hardware_sets: 14, cut_sheets: 1, sections,
    totalPages: sections.reduce((n, s) => n + s.pages, 0),
    cut_sheet_matching: { components: 2, matched: 1, unmatched: 1, missing: [{ reason: "no catalogue number", need: "supply the model" }] } };
};
const pdfText = packet => packet.sections.flatMap(s => {
  let body = "";
  if (s.type === "cover") body = "Test Estimator Company";
  if (s.type === "hardware_set") body = s.title + "\nQty Description Mfr Model/Series Finish\n" + HARDWARE.groups.find(g => s.title.endsWith(g.group)).items[0].catalog;
  if (s.type === "cut_sheet") body = "SELECT hinge catalogue product dimensions and mounting instructions ".repeat(3);
  if (s.type === "cut_sheet_misses") body = "ITEMS WITHOUT A CUT SHEET";
  return [body, ...Array(s.pages - 1).fill("")];
}).join("\f") + "\f";

test("guest guard detects real email-code, account-exchange and upload endpoints, allowing anonymous demo/auth", () => {
  const req = (host, path) => ({ method: "POST", host, path });
  const anonymous = [req("authfor.com", "/api/v1/ephemeral/create"), req("weylandai.com", "/api/auth/ephemeral"), req("weylandai.com", "/api/demo/weyland-building/session")];
  assert.equal(firstReadWrites(anonymous).length, 0);
  const prohibited = [req("authfor.com", "/api/v1/auth/magic-link"), req("authfor.com", "/api/v1/auth/magic-link/verify"), req("authfor.com", "/api/v1/register"), req("authfor.com", "/api/v1/login"), req("weylandai.com", "/api/auth/authfor-exchange"), req("weylandai.com", "/api/auth/session"), req("weylandai.com", "/api/hardware-schedule/start")];
  assert.deepEqual(firstReadWrites([...anonymous, ...prohibited]), prohibited);
});

test("65 rows pass only with the exact marks, hardware groups and source page/row", () => {
  assert.equal(doorEvidence(doorRows(), 29).ok, true);
  const duplicate = doorRows(); duplicate[1] = duplicate[0];
  assert.equal(doorEvidence(duplicate, 29).ok, false);
  const badSource = doorRows(); badSource[4].source = "p.29 row 6";
  assert.equal(doorEvidence(badSource, 29).ok, false);
  const badGroup = doorRows(); badGroup[1].group = "47 VES";
  assert.equal(doorEvidence(badGroup, 29).ok, false);
  assert.deepEqual(doorEvidence(badGroup, 29).differences, [{ mark: "109.1", field: "hardware_group", expected: "06 CL", actual: "47 VES" }]);
  const ordinal = doorRows(); ordinal[0].source = "p.29 row 1";
  assert.deepEqual(doorEvidence(ordinal, 29).differences, [{ mark: "1J.1", field: "source", expected: "p.29 row 0", actual: "p.29 row 1" }]);
  assert.equal(doorEvidence(doorRows(), 1).ok, false);
  // These are distinct printed marks, not decimal values or OCR typos.
  const collapsed = doorRows(); collapsed[4].mark = "111.1";
  assert.deepEqual(doorEvidence(collapsed, 29).missing, ["111.1.1"]);
});

test("CSV parser preserves quoted size strings, commas and embedded line breaks", () => {
  assert.deepEqual(parseCsv('Mark,Size,Notes\r\n109.1,"3\'-0""","a,b\nnext"\r\n').rows,
    [{ Mark: "109.1", Size: '3\'-0"', Notes: "a,b\nnext" }]);
  assert.throws(() => parseCsv('A,B\n"unterminated'), /Unterminated/);
  assert.throws(() => parseCsv("A,B\n1,2,3"), /columns/);
});

test("CSV rejects the old missing pricing columns and blank/No conflation", () => {
  assert.equal(csvEvidence("Mark,Hardware group\n109.1,06 CL").ok, false);
  const rows = DOORS.doors.map(d => [d.mark, d.pair ? "Yes" : "No", d.glazing || "", d.alternate_pricing ?? ""]);
  const csv = rs => ["Mark,DOOR PAIR,GLAZING,ALTERNATE PRICING", ...rs.map(r => r.join(","))].join("\r\n");
  assert.equal(csvEvidence(csv(rows)).ok, true);
  rows.find(r => r[0] === "126.1.2")[3] = "No";
  assert.equal(csvEvidence(csv(rows)).ok, false);
  rows.find(r => r[0] === "126.1.2")[3] = "";
  // Equal totals and the old four spot checks must not hide swapped cells.
  rows.find(r => r[0] === "138.1")[3] = "No";
  rows.find(r => r[0] === "138.1.1")[3] = "Yes";
  assert.deepEqual(csvEvidence(csv(rows)).badAlternates.map(d => d.mark), ["138.1", "138.1.1"]);
});

test("hardware cannot pass with door-derived empty groups or a duplicate replacing a group", () => {
  assert.equal(hardwareEvidence(hardware()).ok, true);
  const empty = hardware(); empty.components = []; empty.hardware_sets.forEach(s => s.components = 0);
  assert.equal(hardwareEvidence(empty).ok, false);
  const duplicate = hardware(); duplicate.hardware_sets[1] = duplicate.hardware_sets[0];
  assert.equal(hardwareEvidence(duplicate).ok, false);
  assert.equal(hardwareEvidence(null).ok, false);
});

test("hardware counts cannot disguise a missing item, wrong model or unresolved spec", () => {
  const missing = hardware(); missing.components.pop();
  assert.equal(hardwareEvidence(missing).ok, false);
  const model = hardware(); model.components[0].model = "invented hinge";
  assert.equal(hardwareEvidence(model).ok, false);
  const need = hardware(); need.hardware_schedule_needed = { sections: ["08 71 00"] };
  assert.equal(hardwareEvidence(need).ok, false);
});

test("a Built response with just doors/source, or a partial hardware packet, fails", () => {
  assert.equal(packetEvidence(manifest()).ok, true);
  const doors = manifest(); doors.sections = doors.sections.filter(s => s.type !== "hardware_set");
  assert.equal(packetEvidence(doors).ok, false);
  const partial = manifest(); partial.sections.find(s => s.type === "hardware_set").components--;
  assert.equal(packetEvidence(partial).ok, false);
  assert.equal(packetEvidence(null).ok, false);
});

test("packet must be accessible and carry actual cut sheets with explicit missing-item disclosure", () => {
  assert.equal(packetEvidence(manifest()).ok, true, "an honestly disclosed unmatched item is allowed");
  const overcount = manifest(); overcount.cut_sheets++;
  assert.equal(packetEvidence(overcount).ok, false, "a missing-item page is not a catalogue cut sheet");
  assert.equal(packetTextEvidence(pdfText(overcount), overcount, "Test Estimator Company").ok, false);
  const unpaid = manifest(); unpaid.paid = false;
  assert.equal(packetEvidence(unpaid).ok, false);
  const noCuts = manifest(); noCuts.sections = noCuts.sections.filter(s => s.type !== "cut_sheet");
  assert.equal(packetEvidence(noCuts).ok, false);
  const vague = manifest(); delete vague.cut_sheet_matching.missing[0].need;
  assert.equal(packetEvidence(vague).ok, false);
  const hidden = manifest(); hidden.sections = hidden.sections.filter(s => s.type !== "cut_sheet_misses");
  assert.equal(packetEvidence(hidden).ok, false);
});

test("PDF content is checked on generated group pages, not names in the TOC or source appendix", () => {
  const packet = manifest(), text = pdfText(packet);
  assert.equal(packetTextEvidence(text, packet, "Test Estimator Company").ok, true);
  const pages = text.split("\f");
  const firstGroup = 5; // cover + 2 TOC + 2 door pages
  pages[1] += pages[firstGroup]; pages[pages.length - 2] += pages[firstGroup]; pages[firstGroup] = "";
  assert.equal(packetTextEvidence(pages.join("\f"), packet, "Test Estimator Company").ok, false);
  assert.equal(packetTextEvidence(text.replace("SL11 / SL24", "invented hinge"), packet, "Test Estimator Company").ok, false);
});

test("PDF rejects missing catalogue content, page count mismatch and another customer's cover", () => {
  const packet = manifest(), text = pdfText(packet);
  assert.equal(packetTextEvidence(text.replace(/SELECT hinge catalogue[^\f]+/, ""), packet, "Test Estimator Company").ok, false);
  assert.equal(packetTextEvidence(text + "extra page\f", packet, "Test Estimator Company").ok, false);
  assert.equal(packetTextEvidence(text, packet, "Some Other Company").ok, false);
});

test("cleanup removes this run's materialized hardware under either key and preserves another job", () => {
  const schema = { hardware_components: ["id", "set_id", "hardware_set_id"], hardware_specifications: ["id", "set_id"], old_items: ["id", "hardware_set_id"] };
  const statements = hardwareChildDeletes(schema, "session_id IN ('ours')");
  const output = execFileSync("python3", ["-c", `
import json, sqlite3, sys
db = sqlite3.connect(':memory:')
db.executescript('''
CREATE TABLE hardware_sets (id TEXT, session_id TEXT);
INSERT INTO hardware_sets VALUES ('test-group','ours'), ('customer-group','theirs');
CREATE TABLE hardware_components (id TEXT, set_id TEXT, hardware_set_id TEXT);
CREATE TABLE hardware_specifications (id TEXT, set_id TEXT);
CREATE TABLE old_items (id TEXT, hardware_set_id TEXT);
INSERT INTO hardware_components VALUES ('test-item','test-group',NULL), ('customer-item','customer-group',NULL);
INSERT INTO hardware_specifications VALUES ('test-spec','test-group'), ('customer-spec','customer-group');
INSERT INTO old_items VALUES ('test-old','test-group'), ('customer-old','customer-group');
''')
for statement in json.load(sys.stdin): db.execute(statement)
db.execute("DELETE FROM hardware_sets WHERE session_id='ours'")
print(json.dumps({t: list(db.execute('SELECT id FROM '+t)) for t in ['hardware_sets','hardware_components','hardware_specifications','old_items']}))
`], { input: JSON.stringify(statements), encoding: "utf8" });
  assert.deepEqual(JSON.parse(output), { hardware_sets: [["customer-group"]], hardware_components: [["customer-item"]], hardware_specifications: [["customer-spec"]], old_items: [["customer-old"]] });
});
