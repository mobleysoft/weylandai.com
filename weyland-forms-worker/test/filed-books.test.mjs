// Ives prices read from the filed Price Book 17 (effective 2026-05-29).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ivesHinge, ivesPlate, platePrice, decimalSizes, filedBookPrice, sizedByDoor } from "../src/lib/filed-books.js";

test("hinges: model, size and finish from the book's grid, citing the page", () => {
  const h = ivesHinge("5BB1HW 4.5 X 4.5", "652");
  assert.deepEqual([h.variant.number, h.variant.list, h.basis, h.book.name], ["5BB1 HW 4.5x4.5", 58.4, "exact", "Ives Price Book 17 p.23"]);
  assert.equal(ivesHinge("5BB1 HW 4-1/2 x 4-1/2", "US26D").variant.list, 118.8, "626 is the brass/stainless column");
  assert.equal(ivesHinge("5BB1 4 1/2 x 4 1/2", "652").product.model, "5BB1", "5BB1 is not 5BB1 HW");
  assert.equal(ivesHinge("5BB1HW 5 x 5", "652").variant.list, 86.7, "p.24");
  const nrp = ivesHinge("5BB1HW 4.5 X 4.5 NRP", "652");
  assert.equal(nrp.basis, "options");
  assert.match(ivesHinge("5BB1HW 4.5 x 4.5", "BLK").note, /steel-based; the brass\/stainless hinge in B-BLK lists \$122\.40/);
  assert.equal(ivesHinge("8400 10 x 34", "630"), null, "not a hinge");
  assert.equal(decimalSizes("4-1/2 x 4 1/2"), "4.5 x 4.5");
});

test("plates: stocked price when stocked, the book's rule otherwise, LDW from the door", () => {
  assert.deepEqual([platePrice(10, 40, "630").list, platePrice(10, 40, "630").number], [132.9, "KPLATE.13480"]);
  const rule = platePrice(6.5, 33.5, "630");
  assert.equal(rule.list, 106.35, "the book's own worked example, p.93");
  assert.equal(platePrice(10, 41, "619").list, 482.58, "10 x 41 rounds up to the chart's 10 x 42 = 4.2 hundred sq in x $114.90");
  assert.match(platePrice(10, 41, "626").error, /largest 626 plate \(32" x 38"\)/);
  assert.match(platePrice(40, 48, "626").error, /largest 626 plate/);
  const ldw = ivesPlate('8400 10" X 2" LDW B-CS', "630", 42);
  assert.deepEqual([ldw.variant.number, ldw.variant.list, ldw.basis], ["8400 10x40 (KPLATE.13480)", 132.9, "exact"]);
  assert.match(ldw.note, /from a 42" door less 2"/);
  assert.equal(ivesPlate('8400 10" X 2" LDW B-CS', "630", null).priced, false, "no door width, no price");
  assert.equal(ivesPlate("8400 10 x 34 TK-TX", "US32D").variant.list, 112.9 + 27);
  assert.equal(ivesPlate("8402 10 x 34", "630").variant.list, 112.9 + 39);
  assert.match(ivesPlate("8400 10 x 34 XYZ", "630").note, /options XYZ not priced/);
  assert.equal(ivesPlate("8400 10 x 34", "999").priced, false);
  assert.equal(sizedByDoor({ maker: "IVES", model: '8400 10" X 1" LDW' }), true);
  assert.equal(filedBookPrice({ maker: "Hager", model: "5BB1HW 4.5 x 4.5", finish: "652" }), null, "only Ives' own book");
});

test("a schedule's LDW kick plate is priced once per door width in its set", async () => {
  const { priceSchedule } = await import("../src/routes/pricex.js");
  const job = {
    doors: [{ hardware_group: "1", width_inches: 42 }, { hardware_group: "01", width_inches: 42 }, { hardware_group: "1", width_inches: 36 }, { hardware_group: "1", width_inches: null }],
    sets: new Map([["1", { number: "01", items: [
      { qty: 1, manufacturer: "Ives", model: '8400 10" X 2" LDW B-CS', catalog: "", finish: "630", description: "KICK PLATE" },
      { qty: 4, manufacturer: "Ives", model: "5BB1HW 4.5 X 4.5", catalog: "", finish: "652", description: "HINGE" },
    ] }]]),
  };
  const r = await priceSchedule({ DB: null }, job, { default: 1, byMaker: {} }, async () => null);
  const plates = r.lines.filter((l) => l.item === "KICK PLATE").map((l) => [l.doorWidth || null, l.openings, l.priced, l.priced ? l.extended : l.reason]);
  assert.deepEqual(plates, [[42, 2, true, 265.8], [36, 1, true, 112.9], [null, 1, false, 'Ives 8400 10" x door width less 2": no door width was read for this opening.']]);
  const hinge = r.lines.find((l) => l.item === "HINGE");
  assert.deepEqual([hinge.qty, hinge.list, hinge.extended], [16, 58.4, 934.4]);
});
