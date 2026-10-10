// node --test tools/accuracy/g051/panel.test.mjs
// g051 (class C5): an electrical panel schedule is not a door schedule. 21d60f1b54e0e3df p.88 (panel
// schedules by circuit, a motor schedule that names an "OH DOOR OPERATOR") read as 39 door rows of
// mark 3 in reader B, and the truth run's page finder took the sheet for a door schedule page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDoorsB, panelHeader, electricalPanelPage } from "../truth/reader_b.mjs";

const fx = (name) => JSON.parse(readFileSync(new URL("./fixtures/" + name + ".json", import.meta.url), "utf8"));

test("21d60f1b p.88: reader B reads no door rows from the two panel schedules", () => {
  const f = fx("21d60f1b54e0e3df-p88");
  const b = readDoorsB(f.items, f.rules, { width: f.width, height: f.height });
  assert.equal(b.doors.length, 0);
  assert.equal(b.tables.length, 0);
});

test("the page finder: p.88 is an electrical panel sheet, p.78 (OPENING SCHEDULE) is not", () => {
  const t = fx("21d60f1b54e0e3df-page-text");
  assert.equal(electricalPanelPage(t.p88), true);
  assert.equal(electricalPanelPage(t.p78), false);
});

test("panel headers and door headers", () => {
  assert.equal(panelHeader(["CKT", "Circuit Description", "# of Poles", "Frame Size", "Trip Rating", "Load", "Remarks"]), true);
  for (const h of [
    ["MARK", "FIRE RATING", "OPENING WIDTH", "OPENING HEIGHT", "OPENING TYPE", "HARDWARE SET"],
    ["DOOR #", "ROOM NAME", "DOOR SIZE", "DOOR TYPE", "HARDWARE GROUP #", "QUANTITY", "REMARKS"],
    ["DOOR #", "ROOM NAME", "WIDTH", "HEIGHT", "HARDWARE SET", "DOOR HARDWARE ACCESS CONTROL POWER ACTUATOR", "LABEL (MIN)"],
  ]) assert.equal(panelHeader(h), false, h.join(" | "));
  // A door schedule sheet that also carries an electrical note keeps its title.
  assert.equal(electricalPanelPage("DOOR SCHEDULE\nMARK\nPANEL\nCIRCUIT\nKVA\nMCB\nPOLES"), false);
});
