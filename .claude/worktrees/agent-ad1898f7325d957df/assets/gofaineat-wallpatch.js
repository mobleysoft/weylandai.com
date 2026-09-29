/**
 * gofaineat_wallpatch_wall_classification.iife.js
 *
 * GOFAINEAT compiled function — GA-EVOLVED rule population + a
 * hand-engineered (not evolved) feature extractor, NOT hand-written
 * classification logic and NOT a neural network. See
 * /Users/johnmobley/gofaineats/GOFAINEAT_DEFINITION.md for what
 * GOFAINEAT does and does not claim to be.
 *
 * Slot: wallpatch_wall_classification — "is this image patch part of a
 * wall, given only local pixel features?" Runs entirely client-side,
 * zero network call, zero import, zero dependency. Intended to replace
 * (or run alongside) localFallbackMask() in
 * /Users/johnmobley/weyland.ai/assets/sightx-reconstruction.js.
 *
 * PROVENANCE (never shipped as an unlabeled black box):
 * {
 *   "slot_type": "wallpatch_wall_classification",
 *   "methodology": "GOFAINEAT (GOFAI-NEAT): genetic-algorithm-evolved condition->action rule population, NOT a neural net / CNN and NOT general-purpose AI",
 *   "corpus_version": "v1",
 *   "corpus_source": "wallpatch_corpus_v1.jsonl (3750 rows, 50 synthetic procedurally-generated floor-plan raster images, ground truth exact by construction — no hand labeling, no LLM labeling, no review pass needed)",
 *   "corpus_generation_params": {
 *     "n_synthetic_plans": 50,
 *     "image_size": "480x360",
 *     "samples_per_plan": {
 *       "wall": 30,
 *       "hardNegative": 30,
 *       "background": 15
 *     },
 *     "label_counts": {
 *       "wall": 1500,
 *       "not_wall": 2250
 *     },
 *     "category_counts": {
 *       "wall": 1500,
 *       "hardNegative": 1500,
 *       "background": 750
 *     }
 *   },
 *   "train_size": 3000,
 *   "test_size": 750,
 *   "ga_seed": 71203,
 *   "ga_pop_size": 120,
 *   "ga_max_generations": 250,
 *   "ga_generations_run": 133,
 *   "training_accuracy": 0.999,
 *   "held_out_test_accuracy": 0.9946666666666667,
 *   "held_out_test_correct": 746,
 *   "held_out_test_total": 750,
 *   "held_out_confusion_matrix": {
 *     "truePos": 297,
 *     "falsePos": 1,
 *     "trueNeg": 449,
 *     "falseNeg": 3
 *   },
 *   "naive_baseline_accuracy": 0.6,
 *   "production_fallback_mask_baseline_accuracy": 0.868,
 *   "production_fallback_mask_baseline_note": "This is the accuracy of the CURRENTLY SHIPPING localFallbackMask() heuristic (dark<95 threshold + same-axis min-run-length filter) on this same synthetic held-out set, computed by wallpatch_04_baseline.mjs against an exact port of that function.",
 *   "num_rules": 10,
 *   "default_action": false,
 *   "compiled_at": "2026-09-09T12:32:10.871Z",
 *   "KNOWN_LIMITATION": "Trained and evaluated ONLY on a procedurally-generated SYNTHETIC corpus (rectangular rooms, controlled wall thickness, synthetic text/furniture/dimension-line/hatching noise). Generalization to real, hand-drawn, or scanned architectural drawings is UNPROVEN beyond this synthetic corpus — this is a stated, open research risk, not a hidden one, matching GOFAINEAT_FEASIBILITY_STUDY.md's framing of generalization as the real unproven risk for this whole methodology."
 * }
 *
 * KNOWN LIMITATION — read before trusting this beyond the synthetic
 * corpus it was trained on: see provenance.KNOWN_LIMITATION above.
 */
const gofaineat_wallpatchWallClassification = (function () {
  // ---- Feature extractor (embedded verbatim from wallpatch_features.mjs) ----
  const DARK_THRESHOLD = 128;
  const WINDOW_RADIUS = 3;
  const NEIGHBORHOOD_RADIUS = 5;
  const MAX_RUN = 40;
  
  function clampedAt(gray, width, height, x, y) {
    const cx = x < 0 ? 0 : x >= width ? width - 1 : x;
    const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
    return gray[cy * width + cx];
  }
  
  function runLength(gray, width, height, x, y, dx, dy) {
    let run = 0;
    let cx = x;
    let cy = y;
    while (run < MAX_RUN) {
      cx += dx;
      cy += dy;
      if (cx < 0 || cy < 0 || cx >= width || cy >= height) break;
      if (gray[cy * width + cx] >= DARK_THRESHOLD) break;
      run += 1;
    }
    return run;
  }
  
  function extractFeatures(gray, width, height, x, y) {
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    for (let oy = -WINDOW_RADIUS; oy <= WINDOW_RADIUS; oy += 1) {
      for (let ox = -WINDOW_RADIUS; ox <= WINDOW_RADIUS; ox += 1) {
        const v = clampedAt(gray, width, height, x + ox, y + oy);
        sum += v;
        sumSq += v * v;
        count += 1;
      }
    }
    const meanIntensity = sum / count;
    const variance = Math.max(0, sumSq / count - meanIntensity * meanIntensity);
  
    const left = clampedAt(gray, width, height, x - 1, y);
    const right = clampedAt(gray, width, height, x + 1, y);
    const up = clampedAt(gray, width, height, x, y - 1);
    const down = clampedAt(gray, width, height, x, y + 1);
    const gx = right - left;
    const gy = down - up;
    const gradientMagnitude = Math.sqrt(gx * gx + gy * gy);
  
    const runLeft = runLength(gray, width, height, x, y, -1, 0);
    const runRight = runLength(gray, width, height, x, y, 1, 0);
    const runUp = runLength(gray, width, height, x, y, 0, -1);
    const runDown = runLength(gray, width, height, x, y, 0, 1);
    const self = clampedAt(gray, width, height, x, y) < DARK_THRESHOLD ? 1 : 0;
    const runHoriz = runLeft + runRight + self;
    const runVert = runUp + runDown + self;
    const thickness = Math.min(runHoriz, runVert);
  
    let darkness = 0;
    for (let oy = -NEIGHBORHOOD_RADIUS; oy <= NEIGHBORHOOD_RADIUS; oy += 1) {
      for (let ox = -NEIGHBORHOOD_RADIUS; ox <= NEIGHBORHOOD_RADIUS; ox += 1) {
        if (ox === 0 && oy === 0) continue;
        const dist = Math.sqrt(ox * ox + oy * oy);
        if (dist > NEIGHBORHOOD_RADIUS) continue;
        const v = clampedAt(gray, width, height, x + ox, y + oy);
        if (v < DARK_THRESHOLD) darkness += 1 / (1 + dist);
      }
    }
  
    return {
      meanIntensity,
      variance,
      gradientMagnitude,
      runHoriz,
      runVert,
      thickness,
      neighborhoodDarkness: darkness,
    };
  }
  
  const FEATURE_NAMES = [
    "meanIntensity",
    "variance",
    "gradientMagnitude",
    "runHoriz",
    "runVert",
    "thickness",
    "neighborhoodDarkness",
  ];

  // ---- Rules evolved via genetic algorithm against wallpatch_corpus_v1.train.json ----
  // See /Users/johnmobley/gofaineats/pilot/wallpatch_03_ga_trainer.mjs and
  // wallpatch_evolution_log_v1.jsonl for the real generation/fitness history.
  const rules = [
    { when: (features) => features["runHoriz"] < 1.3753251819871366 && features["runVert"] < 37.45665651932359 && features["variance"] < 14734.030878939935, then: () => false },
    { when: (features) => features["thickness"] >= 35.70521192997694, then: () => true },
    { when: (features) => true && features["gradientMagnitude"] >= 279.49854107488426, then: () => false },
    { when: (features) => features["neighborhoodDarkness"] >= 7.174917185465376 && features["runVert"] >= 45.44506980939768, then: () => true },
    { when: (features) => true && features["runHoriz"] < 27.117525269044563, then: () => false },
    { when: (features) => features["variance"] >= 10102.911369598556, then: () => true },
    { when: (features) => features["neighborhoodDarkness"] >= 12.851174525759308 && features["runHoriz"] >= 23.53351091290824 && features["thickness"] < 42.78496253862977, then: () => true },
    { when: (features) => features["variance"] < 1931.0649137698422 && features["neighborhoodDarkness"] < 16.9240891157149 && features["thickness"] >= 24.890063439309596, then: () => false },
    { when: (features) => features["variance"] < 1931.0649137698422 && features["neighborhoodDarkness"] < 16.9240891157149 && features["thickness"] >= 24.890063439309596, then: () => false },
    { when: (features) => features["neighborhoodDarkness"] >= 7.174917185465376 && features["runVert"] >= 45.44506980939768, then: () => true },
  ];
  const defaultAction = false;

  function classifyFeatures(features) {
    for (const rule of rules) {
      if (rule.when(features)) return rule.then(features);
    }
    return defaultAction;
  }

  /**
   * Classifies a single (x,y) point in a grayscale raster as
   * wall (true) or not-wall (false).
   * @param {Uint8Array|Uint8ClampedArray|number[]} gray - grayscale buffer, row-major, 0=black..255=white
   * @param {number} width
   * @param {number} height
   * @param {number} x
   * @param {number} y
   */
  function classifyPoint(gray, width, height, x, y) {
    return classifyFeatures(extractFeatures(gray, width, height, x, y));
  }

  /**
   * Classifies every pixel of a grayscale raster, returning a
   * Uint8Array mask (1=wall, 0=not-wall) the same shape imageMaskToSdf()
   * already expects (see imageMaskToSdf() in sightx-reconstruction.js —
   * it thresholds an RGBA mask image the same way; this produces the
   * mask directly instead of relying on localFallbackMask()'s
   * threshold+run-length heuristic).
   */
  function classifyImage(gray, width, height) {
    const mask = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        mask[y * width + x] = classifyPoint(gray, width, height, x, y) ? 1 : 0;
      }
    }
    return mask;
  }

  classifyImage.classifyPoint = classifyPoint;
  classifyImage.classifyFeatures = classifyFeatures;
  classifyImage.extractFeatures = extractFeatures;
  classifyImage.provenance = {
    "slot_type": "wallpatch_wall_classification",
    "methodology": "GOFAINEAT (GOFAI-NEAT): genetic-algorithm-evolved condition->action rule population, NOT a neural net / CNN and NOT general-purpose AI",
    "corpus_version": "v1",
    "corpus_source": "wallpatch_corpus_v1.jsonl (3750 rows, 50 synthetic procedurally-generated floor-plan raster images, ground truth exact by construction — no hand labeling, no LLM labeling, no review pass needed)",
    "corpus_generation_params": {
      "n_synthetic_plans": 50,
      "image_size": "480x360",
      "samples_per_plan": {
        "wall": 30,
        "hardNegative": 30,
        "background": 15
      },
      "label_counts": {
        "wall": 1500,
        "not_wall": 2250
      },
      "category_counts": {
        "wall": 1500,
        "hardNegative": 1500,
        "background": 750
      }
    },
    "train_size": 3000,
    "test_size": 750,
    "ga_seed": 71203,
    "ga_pop_size": 120,
    "ga_max_generations": 250,
    "ga_generations_run": 133,
    "training_accuracy": 0.999,
    "held_out_test_accuracy": 0.9946666666666667,
    "held_out_test_correct": 746,
    "held_out_test_total": 750,
    "held_out_confusion_matrix": {
      "truePos": 297,
      "falsePos": 1,
      "trueNeg": 449,
      "falseNeg": 3
    },
    "naive_baseline_accuracy": 0.6,
    "production_fallback_mask_baseline_accuracy": 0.868,
    "production_fallback_mask_baseline_note": "This is the accuracy of the CURRENTLY SHIPPING localFallbackMask() heuristic (dark<95 threshold + same-axis min-run-length filter) on this same synthetic held-out set, computed by wallpatch_04_baseline.mjs against an exact port of that function.",
    "num_rules": 10,
    "default_action": false,
    "compiled_at": "2026-09-09T12:32:10.871Z",
    "KNOWN_LIMITATION": "Trained and evaluated ONLY on a procedurally-generated SYNTHETIC corpus (rectangular rooms, controlled wall thickness, synthetic text/furniture/dimension-line/hatching noise). Generalization to real, hand-drawn, or scanned architectural drawings is UNPROVEN beyond this synthetic corpus — this is a stated, open research risk, not a hidden one, matching GOFAINEAT_FEASIBILITY_STUDY.md's framing of generalization as the real unproven risk for this whole methodology."
  };

  return classifyImage;
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = gofaineat_wallpatchWallClassification;
}
export default gofaineat_wallpatchWallClassification;
