// Exact evidence checks for cut-sheet coverage in a SubX packet.
// Aggregate matched/unmatched counts cannot prove that a particular scheduled
// item has its own maker, model, and embedded page in the assembled packet.

export const normalize = (value) => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");

const MANUFACTURERS = {
  SEL: ["SELECT", "SELECT HINGE"],
  SCH: ["SCHLAGE"],
  LCN: ["LCN"],
  IVE: ["IVES"],
  VON: ["VON DUPRIN"],
  ZER: ["ZERO"],
  GLY: ["GLYNN-JOHNSON", "GLYNN JOHNSON"],
};

function makerMatches(found, code) {
  const actual = normalize(found);
  if (!actual) return false;
  return actual === normalize(code) || (MANUFACTURERS[code] || []).some((name) => actual.includes(normalize(name)));
}

function embedsExactCitation(item, sections) {
  const wantedModel = normalize(item.catalog);
  if (!wantedModel) return false;
  return sections.some((section) =>
    section?.type === "cut_sheet" &&
    Number.isInteger(Number(section.page)) && Number(section.page) > 0 &&
    normalize(section.model) === wantedModel &&
    makerMatches(section.manufacturer, item.mfr)
  );
}

/**
 * Verify each distinct catalogue-held item against the packet's actual
 * assembled cut-sheet section metadata. A successful global match count is
 * deliberately not accepted as evidence for any individual item.
 */
export function auditHeldCitations(items, sections) {
  const held = items.filter((item) => item.held);
  const missing = held.filter((item) => !embedsExactCitation(item, sections));
  return { heldTotal: held.length, citedCount: held.length - missing.length, missing };
}

/** A report passes only when every check and cleanup succeeds. */
export function variantPasses(variant) {
  return Boolean(
    variant &&
    !variant.errors?.length &&
    variant.checks?.length &&
    variant.checks.every((check) => check.pass === true) &&
    variant.cleanup === "deleted"
  );
}
