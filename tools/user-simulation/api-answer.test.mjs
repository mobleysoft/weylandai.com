// node --test tools/user-simulation/api-answer.test.mjs
// g036: an unexpected API answer is a named, failed check with the status and body, never a crash.
import { test } from "node:test";
import assert from "node:assert/strict";
import { apiAnswer, at } from "./lib/api-answer.mjs";

const REQ = { require: ["model.doors", "model.set.rows"], pick: "model" };
const good = JSON.stringify({ success: true, model: { doors: [{ mark: "101" }], set: { rows: 1 } } });

test("a good answer returns the picked value", () => {
  const r = apiAnswer({ status: 200, contentType: "application/json; charset=utf-8", text: good }, REQ);
  assert.equal(r.ok, true);
  assert.equal(r.value.doors[0].mark, "101");
  assert.equal(r.problem, null);
});

test("a 404 during deploy propagation fails with the status, not a crash", () => {
  const r = apiAnswer({ status: 404, contentType: "application/json", text: '{"error":"Not found"}' }, REQ);
  assert.equal(r.ok, false);
  assert.equal(r.value, null);
  assert.match(r.problem, /HTTP 404/);
  assert.match(r.detail.body, /Not found/);
});

test("an HTML page with status 200 is named as such", () => {
  const r = apiAnswer({ status: 200, contentType: "text/html", text: "<!doctype html><title>SightX</title>" }, REQ);
  assert.equal(r.ok, false);
  assert.match(r.problem, /not JSON \(an HTML page\)/);
});

test("JSON without the fields the journey uses names what is missing", () => {
  const r = apiAnswer({ status: 200, contentType: "application/json", text: '{"success":true}' }, REQ);
  assert.equal(r.ok, false);
  assert.equal(r.problem, "the answer lacks model.doors, model.set.rows");
});

test("a 5xx, an empty body, a network error and no answer at all each fail cleanly", () => {
  assert.match(apiAnswer({ status: 503, text: "" }, REQ).problem, /HTTP 503/);
  assert.match(apiAnswer({ status: 200, text: "" }, REQ).problem, /not JSON/);
  assert.match(apiAnswer({ status: 0, error: "net::ERR_CONNECTION_RESET" }, REQ).problem, /request failed: net::ERR_CONNECTION_RESET/);
  assert.match(apiAnswer(undefined, REQ).problem, /HTTP 0/);
  assert.match(apiAnswer({ status: 200, text: "null" }, REQ).problem, /lacks model.doors/);
});

test("at() walks dotted paths and stops at non-objects", () => {
  assert.equal(at({ a: { b: 2 } }, "a.b"), 2);
  assert.equal(at({ a: 1 }, "a.b"), undefined);
  assert.equal(at(null, "a"), undefined);
});

test("an explicit API failure is refused even when the picked model is present", () => {
  for (const failure of [{ success: false }, { ok: false }, { error: "fixture API failed" }]) {
    const r = apiAnswer({ status: 200, text: JSON.stringify({ ...JSON.parse(good), ...failure }) }, REQ);
    assert.equal(r.ok, false);
    assert.equal(r.value, null);
    assert.equal(r.problem, "the API reported failure");
  }
  assert.equal(apiAnswer({ status: 200, text: JSON.stringify({ ...JSON.parse(good), error: null }) }, REQ).ok, true);
});

test("the optional validator sees the picked value and names invalid shapes", () => {
  const answer = { status: 200, text: good };
  assert.equal(apiAnswer(answer, { ...REQ, validate(value, body) { return value === body.model && Array.isArray(value.doors); } }).ok, true);
  assert.equal(apiAnswer(answer, { ...REQ, validate: () => "model.doors must be an array" }).problem, "model.doors must be an array");
  assert.equal(apiAnswer(answer, { ...REQ, validate: () => false }).problem, "the answer has an invalid shape");
  const thrown = apiAnswer(answer, { ...REQ, validate() { throw new Error("private fixture text"); } });
  assert.equal(thrown.ok, false);
  assert.equal(thrown.problem, "the answer failed shape validation");
  assert.doesNotMatch(JSON.stringify(thrown), /private fixture text/);
});

test("a missing picked value is a failed answer even without a require list", () => {
  const r = apiAnswer({ status: 200, text: "{}" }, { pick: "model" });
  assert.equal(r.ok, false);
  assert.equal(r.problem, "the answer lacks model");
});
