// Every statutory waiver LienX fills is the statute's own form: with the
// filled blanks, blank leaders and blank captions taken out, the words of
// each form (and of its required notice) appear, in order and unchanged, in
// the official text saved in statutes/ (fetched from the state's own site).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STATES, FORM_KINDS, formFor, fill, STATUTORY_NOT_CARRIED } from "../src/lib/lien-forms.js";

function norm(s) {
  return String(s)
    .replace(/[’‘]/g, "'")
    .replace(/\{\w+\}/g, " ")
    .replace(/\$/g, " ")
    .replace(/\(([^()]*)\)/g, (m, inner) => (inner.trim().split(/\s+/).length <= 6 ? " " : m))
    .replace(/_+/g, " ")
    .replace(/\.{2,}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.:;])/g, "$1")
    .trim();
}
function formText(blocks, withNotice) {
  return blocks.filter((b) => withNotice ? b.t === "notice" : b.t !== "notice").map((b) => {
    if (b.t === "field") return b.label;
    if (b.t === "sign") return b.lines.map((l) => l.label || "").join(" ");
    return b.text;
  }).join(" ");
}

for (const [code, st] of Object.entries(STATES)) {
  const statute = norm(readFileSync(new URL("../statutes/" + st.file, import.meta.url), "utf8").split("\n----\n")[1]);
  for (const [kind, blocks] of Object.entries(st.forms)) {
    test(`${code} ${kind}: the form is the statute's words`, () => {
      const body = norm(formText(blocks, false));
      assert.ok(body.length > 200, "form text present");
      if (!statute.includes(body)) {
        // Show where it first differs.
        let lo = 0; while (lo < body.length && statute.includes(body.slice(0, lo + 20))) lo += 20;
        assert.fail(`differs near: "${body.slice(Math.max(0, lo - 40), lo + 60)}"`);
      }
      const notice = norm(formText(blocks, true));
      if (notice) assert.ok(statute.includes(notice), "required notice is the statute's words");
    });
  }
}

test("every unconditional statutory form carries its notice", () => {
  for (const code of ["AZ", "NV"]) for (const kind of ["unconditional_progress", "unconditional_final"]) {
    assert.ok(STATES[code].forms[kind].some((b) => b.t === "notice"), code + " " + kind);
  }
});

test("states with statutory forms not carried refuse a generic waiver; others get the general form", () => {
  assert.match(formFor("CA", "conditional_progress").refused, /8132-8138/);
  assert.match(formFor("TX", "unconditional_final").refused, /53\.284/);
  assert.ok(formFor("OH", "conditional_progress").generic);
  assert.ok(formFor("AZ", "conditional_final").statutory);
  assert.equal(formFor("FL", "unconditional_final").blocks, STATES.FL.forms.final);
  assert.ok(Object.keys(STATUTORY_NOT_CARRIED).every((s) => !STATES[s]));
});

test("blanks fill with the job's values; an empty value stays a blank", () => {
  assert.equal(fill("on the job of {owner} located at {jobDescription}", { owner: "Berryessa USD" }), "on the job of Berryessa USD located at ______________");
});
