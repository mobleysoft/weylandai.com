/**
 * gofaineat_pricerowtype.iife.js
 *
 * GOFAINEAT compiled function — GA-EVOLVED, not hand-written.
 * Slot: price_row_type — Stage 1 of the catalogue/price-book extraction
 * cascade (see /Users/johnmobley/weylandai.com/GOFAINEAT_CANDIDATE_SURFACES.md
 * candidate #1 and /Users/johnmobley/gofaineats/GOFAINEAT_CASCADE_DESIGN_PATTERN.md).
 *
 * Given one OCR'd line from a manufacturer price-book page, classifies it
 * into one of "priced_data_row" | "header_or_noise" | "call_for_quote".
 * Wired into weyland-cutsheetx-worker's
 * src/lib/catalogue-price-extraction.js to pre-filter lines BEFORE they're
 * chunked and sent to the local Qwen bridge in
 * extractPriceRowsFromOcrText()'s LLM fallback branch — dropping
 * header_or_noise/call_for_quote lines so only real priced_data_row lines
 * reach the (unchanged, still-LLM-backed) extraction step.
 *
 * HONEST SCOPE: this REDUCES, it does NOT ELIMINATE, the Qwen dependency
 * in that fallback path — stage 2 (finish-code format classification) and
 * stage 3 (final constrained extraction) are future work, not built here.
 *
 * PROVENANCE (never shipped as an unlabeled black box):
 * {
 *   "slot_type": "price_row_type",
 *   "stage": "Stage 1 of 3 of the catalogue/price-book extraction cascade (GOFAINEAT_CANDIDATE_SURFACES.md candidate #1) - finish-code format classification (stage 2) and final constrained extraction (stage 3) are NOT built; this stage only narrows what reaches the Qwen fallback path, it does not eliminate it",
 *   "corpus_version": "v1",
 *   "corpus_source": "pricerowtype_corpus_v1.reviewed.jsonl (120 real-shaped example lines, bootstrap-labeled twice each by the local Qwen3-8B bridge, reviewed against deterministic ground truth traced to catalogue-price-extraction.js's real regexes - 2 corrections, 1.7% correction rate)",
 *   "train_size": 95,
 *   "test_size": 25,
 *   "ga_seed": 20261002,
 *   "ga_pop_size": 200,
 *   "ga_max_generations": 600,
 *   "ga_generations_run": 10,
 *   "selection_criterion": "inner_val_accuracy (not training fitness) - anti-overfit, per blockertype precedent",
 *   "training_accuracy": 1,
 *   "held_out_test_accuracy": 1,
 *   "held_out_test_correct": 25,
 *   "held_out_test_total": 25,
 *   "held_out_accuracy_per_label": {
 *     "call_for_quote": 1,
 *     "header_or_noise": 1,
 *     "priced_data_row": 1
 *   },
 *   "naive_baseline_accuracy": 0.44,
 *   "naive_baseline_strategy": "always-guess-most-common-training-label",
 *   "compiled_at": "2026-10-02T19:54:28.502Z",
 *   "num_rules": 7,
 *   "default_action": "header_or_noise",
 *   "mistakes": []
 * }
 *
 * Zero dependency, zero network call, zero import — a standard JS engine
 * is the only runtime requirement. The feature extractor below is a
 * deliberate, intentional duplicate of
 * /Users/johnmobley/gofaineats/pilot/pricerowtype_features.mjs's
 * extractFeatures() (same regexes, same logic) so this compiled artifact
 * has no runtime import of its own.
 */
const gofaineat_priceRowType = (function gofaineat_priceRowType() {
  const PRICE_TOKEN_RE = /\$[\d,]+(?:\.\d{2})?/g;
  const FINISH_TOKEN_RE = /\b\d{2,4}[A-Za-z%]{0,2}\b/g;
  const CALL_FOR_QUOTE_RE = /\b(call for quote|call for price|price (?:upon|on) request|n\/?a\b|tbd\b|contact (?:factory|sales)|see (?:your )?(?:rep|dealer))\b/i;
  const HEADER_KEYWORD_RE = /\b(price\s*list|list price|unit price|finish\s*code|column|legend|effective\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|date)|page\s+\d+|catalog(?:ue)?\s+(?:number|no\.?)|description|continued|section\s+\d+|table\s+of\s+contents|uom\b|qty\b)\b/i;
  const MODEL_TOKEN_RE = /\b(?=[A-Za-z0-9-]{3,}\b)(?=[A-Za-z0-9-]*[0-9])(?:[A-Za-z0-9-]*[A-Za-z-][A-Za-z0-9-]*|[0-9]+-[0-9A-Za-z-]+)\b/;

  function hasModelNumberToken(text) {
    const withoutPrices = text.replace(PRICE_TOKEN_RE, " ");
    return MODEL_TOKEN_RE.test(withoutPrices);
  }
  function countFinishLikeTokens(text) {
    const withoutPrices = text.replace(PRICE_TOKEN_RE, " ");
    return (withoutPrices.match(FINISH_TOKEN_RE) || []).length;
  }
  function isBlankOrSymbolOnly(text) {
    return !/[A-Za-z0-9]/.test(text);
  }
  function bucketLength(text) {
    const n = text.split(/\s+/).filter(Boolean).length;
    if (n === 0) return "short";
    if (n <= 4) return "short";
    if (n <= 10) return "medium";
    return "long";
  }

  function extractFeatures(rawText) {
    const text = String(rawText || "");
    const priceCount = (text.match(PRICE_TOKEN_RE) || []).length;
    return {
      priceTokenCount: priceCount === 0 ? "zero" : priceCount === 1 ? "one" : "two_plus",
      hasCallForQuoteOrNA: CALL_FOR_QUOTE_RE.test(text),
      hasModelNumberToken: hasModelNumberToken(text),
      hasMultipleFinishLikeTokens: countFinishLikeTokens(text) >= 2,
      hasHeaderKeyword: HEADER_KEYWORD_RE.test(text),
      isBlankOrSymbolOnly: isBlankOrSymbolOnly(text),
      lengthBucket: bucketLength(text),
    };
  }

  // Rules evolved via genetic algorithm against
  // pricerowtype_corpus_v1.reviewed.jsonl's training split — see
  // /Users/johnmobley/gofaineats/pilot/pricerowtype_03_ga_trainer.mjs and
  // pricerowtype_evolution_log_v1.jsonl for the real generation/fitness
  // history.
  const rules = [
    { when: (features) => features["lengthBucket"] === "long" && features["priceTokenCount"] === "one" && [true,false].includes(features["hasHeaderKeyword"]), then: () => "header_or_noise" },
    { when: (features) => [true,false].includes(features["hasMultipleFinishLikeTokens"]) && features["hasCallForQuoteOrNA"] === false && features["priceTokenCount"] === "zero", then: () => "header_or_noise" },
    { when: (features) => features["lengthBucket"] === "long" && features["hasCallForQuoteOrNA"] === true && true, then: () => "priced_data_row" },
    { when: (features) => features["hasCallForQuoteOrNA"] === false && true, then: () => "priced_data_row" },
    { when: (features) => features["lengthBucket"] === "medium", then: () => "call_for_quote" },
    { when: (features) => features["hasMultipleFinishLikeTokens"] === true && true, then: () => "priced_data_row" },
    { when: (features) => features["lengthBucket"] === "medium", then: () => "call_for_quote" },
  ];
  const defaultAction = "header_or_noise";

  function classifyFeatures(features) {
    for (const rule of rules) {
      if (rule.when(features)) return rule.then(features);
    }
    return defaultAction;
  }

  function classifyText(text) {
    return classifyFeatures(extractFeatures(text));
  }

  classifyText.classifyFeatures = classifyFeatures;
  classifyText.extractFeatures = extractFeatures;
  classifyText.provenance = {
    "slot_type": "price_row_type",
    "stage": "Stage 1 of 3 of the catalogue/price-book extraction cascade (GOFAINEAT_CANDIDATE_SURFACES.md candidate #1) - finish-code format classification (stage 2) and final constrained extraction (stage 3) are NOT built; this stage only narrows what reaches the Qwen fallback path, it does not eliminate it",
    "corpus_version": "v1",
    "corpus_source": "pricerowtype_corpus_v1.reviewed.jsonl (120 real-shaped example lines, bootstrap-labeled twice each by the local Qwen3-8B bridge, reviewed against deterministic ground truth traced to catalogue-price-extraction.js's real regexes - 2 corrections, 1.7% correction rate)",
    "train_size": 95,
    "test_size": 25,
    "ga_seed": 20261002,
    "ga_pop_size": 200,
    "ga_max_generations": 600,
    "ga_generations_run": 10,
    "selection_criterion": "inner_val_accuracy (not training fitness) - anti-overfit, per blockertype precedent",
    "training_accuracy": 1,
    "held_out_test_accuracy": 1,
    "held_out_test_correct": 25,
    "held_out_test_total": 25,
    "held_out_accuracy_per_label": {
      "call_for_quote": 1,
      "header_or_noise": 1,
      "priced_data_row": 1
    },
    "naive_baseline_accuracy": 0.44,
    "naive_baseline_strategy": "always-guess-most-common-training-label",
    "compiled_at": "2026-10-02T19:54:28.502Z",
    "num_rules": 7,
    "default_action": "header_or_noise",
    "mistakes": []
  };

  return classifyText;
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = gofaineat_priceRowType;
}
export default gofaineat_priceRowType;
