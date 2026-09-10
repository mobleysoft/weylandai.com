import { test } from "node:test";
import assert from "node:assert/strict";
import { generateQuoteHtml } from "./quote-html.js";

const SAMPLE_QUOTE = {
  vendor: { company_name: "WeylandAI Hardware Co." },
  recipient: { client_name: "Acme Construction", client_address: "123 Main St" },
  quoteNumber: "Q-1001",
  quoteDate: "2026-09-10T12:00:00Z",
  validityDays: 30,
  hardwareSets: [],
  doors: [{ door_number: "D-101", description: "Entry door hardware" }],
  frames: [],
  services: [],
  totals: { subtotal: 1200, tax: 96, total: 1296 },
  settings: {},
};

test("generateQuoteHtml(): real end-to-end render with representative data produces well-formed HTML with real content", () => {
  const html = generateQuoteHtml(SAMPLE_QUOTE);
  assert.equal(typeof html, "string");
  assert.match(html, /<html/i);
  assert.match(html, /<\/html>/i);
  assert.match(html, /Q-1001/);
  assert.match(html, /Acme Construction/);
});

test("generateQuoteHtml(): HTML-escapes recipient/vendor fields, doesn't inject raw markup", () => {
  const html = generateQuoteHtml({
    ...SAMPLE_QUOTE,
    recipient: { client_name: `<script>alert(1)</script>` },
  });
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("generateQuoteHtml(): missing/empty optional fields don't throw (doors/frames/services/hardwareSets all empty)", () => {
  assert.doesNotThrow(() => generateQuoteHtml({ vendor: {}, recipient: {}, totals: {} }));
});
