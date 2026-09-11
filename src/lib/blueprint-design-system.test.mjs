import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLUEPRINT_BODY_CSS,
  BLUEPRINT_HEADER_CSS,
  BLUEPRINT_TOKENS_CSS,
  BLUEPRINT_NAV_LINKS,
  renderBlueprintHeader,
} from "./blueprint-design-system.js";

test("BLUEPRINT_TOKENS_CSS is the real concatenation of BODY + HEADER, not an independent copy", () => {
  assert.equal(BLUEPRINT_TOKENS_CSS, BLUEPRINT_BODY_CSS + BLUEPRINT_HEADER_CSS);
});

test("BLUEPRINT_NAV_LINKS: real shape - 4 links, exactly one marked cta", () => {
  assert.equal(BLUEPRINT_NAV_LINKS.length, 4);
  const ctas = BLUEPRINT_NAV_LINKS.filter((l) => l.cta);
  assert.equal(ctas.length, 1);
  assert.equal(ctas[0].label, "Start Free Trial");
  for (const link of BLUEPRINT_NAV_LINKS) {
    assert.ok(link.href.startsWith("/"), `href should be a real relative path: ${link.href}`);
  }
});

test("renderBlueprintHeader: renders every nav link, cta link gets the bp-cta class, others don't", () => {
  const html = renderBlueprintHeader();
  for (const link of BLUEPRINT_NAV_LINKS) {
    assert.match(html, new RegExp(`href="${link.href}"`));
    assert.match(html, new RegExp(`>${link.label}<`));
  }
  assert.match(html, /href="\/subscribe" class="bp-cta"/);
  assert.doesNotMatch(html, /href="\/pricing" class="bp-cta"/);
});

test("renderBlueprintHeader: includes the real logo path and accessible nav wiring, not a stub", () => {
  const html = renderBlueprintHeader();
  assert.match(html, /src="\/assets\/weyland-logo\.png"/);
  assert.match(html, /aria-label="WeylandAI home"/);
  assert.match(html, /id="bp-brand-link"/);
  assert.match(html, /id="bp-site-nav"/);
  assert.match(html, /<script>/, "includes the real mobile-nav-toggle script, not just static markup");
  assert.match(html, /classList\.toggle\('bp-open'\)/);
});
