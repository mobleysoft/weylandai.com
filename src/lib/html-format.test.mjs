import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, fmtDate } from "./html-format.js";

test("esc(): escapes &, <, >, \" and passes through null/undefined as empty string", () => {
  assert.equal(esc(`<b>"Tom & Jerry"</b>`), "&lt;b&gt;&quot;Tom &amp; Jerry&quot;&lt;/b&gt;");
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
  assert.equal(esc(42), "42");
});

test("fmtDate(): formats a real ISO date, em-dash for empty, raw string for unparseable", () => {
  assert.equal(fmtDate("2026-03-05T12:00:00Z"), "March 5, 2026");
  assert.equal(fmtDate(null), "—");
  assert.equal(fmtDate(""), "—");
});
