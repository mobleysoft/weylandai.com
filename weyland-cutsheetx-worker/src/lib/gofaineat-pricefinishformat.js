/**
 * gofaineat_pricefinishformat.iife.js
 *
 * GOFAINEAT compiled function - GA-EVOLVED rule population + a
 * hand-engineered (not evolved) feature extractor, NOT hand-written
 * classification logic and NOT a neural network.
 *
 * Slot: pricefinishformat - "given a confirmed price-book data row
 * (model + exactly one price), which finish-code format (if any) does
 * it use?" Stage 2 of 3 in the price-book-extraction gofaineat cascade
 * for weylandai.com's SubX/CutSheetX product. Runs entirely
 * dependency-free, zero network call, zero import.
 *
 * PROVENANCE (never shipped as an unlabeled black box):
 * {
 *   "slot_type": "pricefinishformat",
 *   "pilot_name": "pricefinishformat",
 *   "cascade": "gofaineat price-book-extraction cascade, stage 2 of 3 (see /Users/johnmobley/weylandai.com/GOFAINEAT_CANDIDATE_SURFACES.md candidate #1 and /Users/johnmobley/gofaineats/GOFAINEAT_CASCADE_DESIGN_PATTERN.md)",
 *   "methodology": "GOFAINEAT (GOFAI-NEAT): genetic-algorithm-evolved condition->action rule population, NOT a neural net and NOT general-purpose AI",
 *   "labels": [
 *     "bhma_3digit",
 *     "us_letter",
 *     "word_or_abbrev",
 *     "bhma_2digit_variant",
 *     "none_present"
 *   ],
 *   "corpus_version": "v1",
 *   "corpus_source": "pricefinishformat_corpus_v1.jsonl - real bootstrap corpus: synthetic-combinatorial rows built directly from real model-number/finish-code vocabulary (cps-matching.js's FINISH_CODES) PLUS Qwen3-8B-local-distilled diversified rows, 100% re-labeled by a deterministic ground-truth oracle (pricefinishformat_ground_truth.mjs) against the real finish-code categories - never trusted as generated.",
 *   "corpus_total_rows": 370,
 *   "corpus_label_counts": {
 *     "bhma_3digit": 65,
 *     "us_letter": 64,
 *     "word_or_abbrev": 67,
 *     "bhma_2digit_variant": 68,
 *     "none_present": 106
 *   },
 *   "corpus_review_corrections_logged": 36,
 *   "corpus_review_rejections_logged": 28,
 *   "corpus_review_note": "100% of generated rows were re-labeled by the ground-truth oracle, not rubber-stamped. Real defects found and logged (see pricefinishformat_review_log_v1.jsonl): the local Qwen3-8B model sometimes (a) emitted bare-price lines with no model/part number at all, and (b) embedded a requested finish code INSIDE a hyphen-joined model token (e.g. 'L91-400-626') rather than as its own whitespace-separated token - both real findings, not swept under the rug. See KNOWN_LIMITATION below for how (b) bounds this classifier's scope.",
 *   "train_size": 296,
 *   "test_size": 74,
 *   "ga_seed": 81204,
 *   "ga_pop_size": 150,
 *   "ga_max_generations": 300,
 *   "ga_generations_run": 14,
 *   "training_accuracy": 1,
 *   "held_out_test_accuracy": 1,
 *   "held_out_test_correct": 74,
 *   "held_out_test_total": 74,
 *   "held_out_confusion_matrix": {
 *     "bhma_3digit": {
 *       "bhma_3digit": 13,
 *       "us_letter": 0,
 *       "word_or_abbrev": 0,
 *       "bhma_2digit_variant": 0,
 *       "none_present": 0
 *     },
 *     "us_letter": {
 *       "bhma_3digit": 0,
 *       "us_letter": 13,
 *       "word_or_abbrev": 0,
 *       "bhma_2digit_variant": 0,
 *       "none_present": 0
 *     },
 *     "word_or_abbrev": {
 *       "bhma_3digit": 0,
 *       "us_letter": 0,
 *       "word_or_abbrev": 13,
 *       "bhma_2digit_variant": 0,
 *       "none_present": 0
 *     },
 *     "bhma_2digit_variant": {
 *       "bhma_3digit": 0,
 *       "us_letter": 0,
 *       "word_or_abbrev": 0,
 *       "bhma_2digit_variant": 14,
 *       "none_present": 0
 *     },
 *     "none_present": {
 *       "bhma_3digit": 0,
 *       "us_letter": 0,
 *       "word_or_abbrev": 0,
 *       "bhma_2digit_variant": 0,
 *       "none_present": 21
 *     }
 *   },
 *   "naive_baseline_accuracy": 0.28378378378378377,
 *   "production_heuristic_baseline_accuracy": 0.28378378378378377,
 *   "production_heuristic_baseline_note": "today's shipping extractPriceRowsSingleColumn() has no finish-format concept at all - it always emits finish_code: \"\" - so its real equivalent prediction for every row is the constant 'none_present'",
 *   "num_rules": 12,
 *   "default_action": "bhma_2digit_variant",
 *   "compiled_at": "2026-10-02T20:19:55.596Z",
 *   "KNOWN_LIMITATION": "Finish-code tokens are detected only as their OWN whitespace-separated token (same tokenization convention as the existing deterministic functions in catalogue-price-extraction.js, e.g. extractPriceRowsSingleColumn's pre-price token split). A finish code embedded inside a hyphen-joined model string (e.g. 'L91-400-626') will NOT be detected and the line will classify as none_present - a real, documented, non-hidden scope boundary, not a silent gap. Also: bhma_2digit_variant is the lowest-priority/highest-false-positive-risk category when multiple finish-token categories appear on one line (a bare 2-digit number can coincide with a quantity or page fragment) - see pricefinishformat_features.mjs's header comment for the full priority-order rationale."
 * }
 */
const gofaineat_pricefinishformat = (function () {
  // ---- Feature extractor (embedded verbatim from pricefinishformat_features.mjs) ----
  const BHMA_3DIGIT = new Set([
    "605", "606", "609", "612", "613", "619", "622", "625", "626", "629",
    "630", "643E", "643", "644", "651", "652", "689", "690", "691", "694", "695",
  ]);
  const BHMA_2DIGIT_VARIANT = new Set(["03", "04", "05", "09", "10", "14", "15", "26", "28", "32", "32D"]);
  const US_LETTER = new Set(["US3", "US4", "US10", "US10B", "US26", "US26D", "US28", "US32", "US32D"]);
  const WORD_OR_ABBREV = new Set([
    "BSP", "WSP", "SP", "BP", "BLK", "DK", "LT", "AB", "PB", "SN", "PN", "MB",
    "BLACK", "BRONZE", "BRASS", "CHROME", "SATIN", "BRIGHT", "DULL", "OIL",
  ]);
  
  const PRICE_TOKEN_RE = /\$[\d,]+(?:\.\d{2})?/g;
  const PLACEHOLDER_TOKEN_RE = /^[[{][^\]}]*[\]}][:,.]?$/;
  
  function cleanToken(tok) {
    return String(tok).replace(/[^0-9A-Za-z%]/g, "").toUpperCase();
  }
  
  function tokenize(line) {
    return String(line || "").trim().split(/\s+/).filter(Boolean);
  }
  
  function categoryOfToken(cleanTok) {
    if (!cleanTok) return null;
    if (BHMA_3DIGIT.has(cleanTok)) return "bhma_3digit";
    if (US_LETTER.has(cleanTok)) return "us_letter";
    if (WORD_OR_ABBREV.has(cleanTok)) return "word_or_abbrev";
    if (BHMA_2DIGIT_VARIANT.has(cleanTok)) return "bhma_2digit_variant";
    return null;
  }
  
  const FEATURE_NAMES = [
    "hasBhma3Digit",
    "hasUsLetter",
    "hasWordOrAbbrev",
    "hasBhma2DigitVariant",
    "hasAnyFinishToken",
    "numFinishCategoryHits",
    "numPriceTokens",
    "tokenCountBucket",
    "hasPlaceholderToken",
    "lineLength",
  ];
  
  function extractFeatures(line) {
    const text = String(line || "");
    const tokens = tokenize(text);
    const cats = new Set();
    for (const t of tokens) {
      const c = categoryOfToken(cleanToken(t));
      if (c) cats.add(c);
    }
    const priceMatches = text.match(PRICE_TOKEN_RE) || [];
    const hasPlaceholder = tokens.some((t) => PLACEHOLDER_TOKEN_RE.test(t));
    return {
      hasBhma3Digit: cats.has("bhma_3digit") ? 1 : 0,
      hasUsLetter: cats.has("us_letter") ? 1 : 0,
      hasWordOrAbbrev: cats.has("word_or_abbrev") ? 1 : 0,
      hasBhma2DigitVariant: cats.has("bhma_2digit_variant") ? 1 : 0,
      hasAnyFinishToken: cats.size > 0 ? 1 : 0,
      numFinishCategoryHits: cats.size,
      numPriceTokens: Math.min(priceMatches.length, 3),
      tokenCountBucket: tokens.length <= 3 ? 0 : tokens.length <= 6 ? 1 : 2,
      hasPlaceholderToken: hasPlaceholder ? 1 : 0,
      lineLength: Math.min(text.length, 120),
    };
  }

  // ---- Rules evolved via genetic algorithm against pricefinishformat_corpus_v1.train.json ----
  // See /Users/johnmobley/gofaineats/pilot/pricefinishformat_03_ga_trainer.mjs and
  // pricefinishformat_evolution_log_v1.jsonl for the real generation/fitness history.
  const rules = [
    { when: (features) => features["hasWordOrAbbrev"] >= 0.7161277642007917 && features["hasAnyFinishToken"] >= 0.9948954498395324 && features["hasBhma2DigitVariant"] < 0.2306004965212196, then: () => "word_or_abbrev" },
    { when: (features) => features["hasUsLetter"] >= 0.6581516659352928 && features["hasBhma3Digit"] < 0.319050710182637, then: () => "us_letter" },
    { when: (features) => features["hasBhma2DigitVariant"] >= 0.09823058359324932, then: () => "bhma_2digit_variant" },
    { when: (features) => features["hasAnyFinishToken"] >= 0.15059259347617626 && features["hasWordOrAbbrev"] < 0.090853251516819, then: () => "bhma_3digit" },
    { when: (features) => features["hasBhma2DigitVariant"] >= 0.6770053773652762 && features["hasUsLetter"] >= 0.7441576076671481, then: () => "us_letter" },
    { when: (features) => features["numFinishCategoryHits"] >= 0.3762696029152721 && features["hasBhma2DigitVariant"] < 0.7091976611409336, then: () => "bhma_3digit" },
    { when: (features) => features["hasWordOrAbbrev"] < 0.8292134630028158, then: () => "none_present" },
    { when: (features) => features["numPriceTokens"] >= 1 && features["numFinishCategoryHits"] < 0.9997539140749723, then: () => "us_letter" },
    { when: (features) => features["lineLength"] < 30.483519163215533 && features["hasBhma3Digit"] >= 0.6502951269503683, then: () => "bhma_2digit_variant" },
    { when: (features) => features["hasAnyFinishToken"] >= 0.15059259347617626 && features["hasWordOrAbbrev"] < 0.090853251516819, then: () => "bhma_3digit" },
    { when: (features) => features["hasBhma2DigitVariant"] >= 0.6770053773652762 && features["hasUsLetter"] >= 0.7441576076671481, then: () => "us_letter" },
    { when: (features) => features["numFinishCategoryHits"] >= 0.3762696029152721 && features["hasBhma2DigitVariant"] < 0.7091976611409336, then: () => "bhma_3digit" },
  ];
  const defaultAction = "bhma_2digit_variant";

  function classifyFeatures(features) {
    for (const rule of rules) {
      if (rule.when(features)) return rule.then(features);
    }
    return defaultAction;
  }

  /**
   * Classifies a single confirmed price-book data-row line's
   * finish-code format.
   * @param {string} line - the raw OCR'd text line (model + exactly one price)
   * @returns {"bhma_3digit"|"us_letter"|"word_or_abbrev"|"bhma_2digit_variant"|"none_present"}
   */
  function classifyLine(line) {
    return classifyFeatures(extractFeatures(line));
  }

  classifyLine.classifyFeatures = classifyFeatures;
  classifyLine.extractFeatures = extractFeatures;
  classifyLine.labels = ["bhma_3digit","us_letter","word_or_abbrev","bhma_2digit_variant","none_present"];
  classifyLine.provenance = {
    "slot_type": "pricefinishformat",
    "pilot_name": "pricefinishformat",
    "cascade": "gofaineat price-book-extraction cascade, stage 2 of 3 (see /Users/johnmobley/weylandai.com/GOFAINEAT_CANDIDATE_SURFACES.md candidate #1 and /Users/johnmobley/gofaineats/GOFAINEAT_CASCADE_DESIGN_PATTERN.md)",
    "methodology": "GOFAINEAT (GOFAI-NEAT): genetic-algorithm-evolved condition->action rule population, NOT a neural net and NOT general-purpose AI",
    "labels": [
      "bhma_3digit",
      "us_letter",
      "word_or_abbrev",
      "bhma_2digit_variant",
      "none_present"
    ],
    "corpus_version": "v1",
    "corpus_source": "pricefinishformat_corpus_v1.jsonl - real bootstrap corpus: synthetic-combinatorial rows built directly from real model-number/finish-code vocabulary (cps-matching.js's FINISH_CODES) PLUS Qwen3-8B-local-distilled diversified rows, 100% re-labeled by a deterministic ground-truth oracle (pricefinishformat_ground_truth.mjs) against the real finish-code categories - never trusted as generated.",
    "corpus_total_rows": 370,
    "corpus_label_counts": {
      "bhma_3digit": 65,
      "us_letter": 64,
      "word_or_abbrev": 67,
      "bhma_2digit_variant": 68,
      "none_present": 106
    },
    "corpus_review_corrections_logged": 36,
    "corpus_review_rejections_logged": 28,
    "corpus_review_note": "100% of generated rows were re-labeled by the ground-truth oracle, not rubber-stamped. Real defects found and logged (see pricefinishformat_review_log_v1.jsonl): the local Qwen3-8B model sometimes (a) emitted bare-price lines with no model/part number at all, and (b) embedded a requested finish code INSIDE a hyphen-joined model token (e.g. 'L91-400-626') rather than as its own whitespace-separated token - both real findings, not swept under the rug. See KNOWN_LIMITATION below for how (b) bounds this classifier's scope.",
    "train_size": 296,
    "test_size": 74,
    "ga_seed": 81204,
    "ga_pop_size": 150,
    "ga_max_generations": 300,
    "ga_generations_run": 14,
    "training_accuracy": 1,
    "held_out_test_accuracy": 1,
    "held_out_test_correct": 74,
    "held_out_test_total": 74,
    "held_out_confusion_matrix": {
      "bhma_3digit": {
        "bhma_3digit": 13,
        "us_letter": 0,
        "word_or_abbrev": 0,
        "bhma_2digit_variant": 0,
        "none_present": 0
      },
      "us_letter": {
        "bhma_3digit": 0,
        "us_letter": 13,
        "word_or_abbrev": 0,
        "bhma_2digit_variant": 0,
        "none_present": 0
      },
      "word_or_abbrev": {
        "bhma_3digit": 0,
        "us_letter": 0,
        "word_or_abbrev": 13,
        "bhma_2digit_variant": 0,
        "none_present": 0
      },
      "bhma_2digit_variant": {
        "bhma_3digit": 0,
        "us_letter": 0,
        "word_or_abbrev": 0,
        "bhma_2digit_variant": 14,
        "none_present": 0
      },
      "none_present": {
        "bhma_3digit": 0,
        "us_letter": 0,
        "word_or_abbrev": 0,
        "bhma_2digit_variant": 0,
        "none_present": 21
      }
    },
    "naive_baseline_accuracy": 0.28378378378378377,
    "production_heuristic_baseline_accuracy": 0.28378378378378377,
    "production_heuristic_baseline_note": "today's shipping extractPriceRowsSingleColumn() has no finish-format concept at all - it always emits finish_code: \"\" - so its real equivalent prediction for every row is the constant 'none_present'",
    "num_rules": 12,
    "default_action": "bhma_2digit_variant",
    "compiled_at": "2026-10-02T20:19:55.596Z",
    "KNOWN_LIMITATION": "Finish-code tokens are detected only as their OWN whitespace-separated token (same tokenization convention as the existing deterministic functions in catalogue-price-extraction.js, e.g. extractPriceRowsSingleColumn's pre-price token split). A finish code embedded inside a hyphen-joined model string (e.g. 'L91-400-626') will NOT be detected and the line will classify as none_present - a real, documented, non-hidden scope boundary, not a silent gap. Also: bhma_2digit_variant is the lowest-priority/highest-false-positive-risk category when multiple finish-token categories appear on one line (a bare 2-digit number can coincide with a quantity or page fragment) - see pricefinishformat_features.mjs's header comment for the full priority-order rationale."
  };

  return classifyLine;
})();

// ESM deploy copy for the Worker runtime (no CommonJS `module` global here -
// the canonical CommonJS-compatible artifact for Node-side offline
// verification is /Users/johnmobley/gofaineats/pilot/gofaineat_pricefinishformat.iife.js).
export default gofaineat_pricefinishformat;
