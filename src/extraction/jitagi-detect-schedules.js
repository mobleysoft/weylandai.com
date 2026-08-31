/**
 * JITAGI payload — schedule detection phase
 *
 * Implements the real logic behind /api/hardware-schedule/session/:id/detect-schedules,
 * which in Ron's current code is a stub that returns a message and does nothing.
 *
 * Structure: a fractal graph of IIFEs, one per page, each wrapped in a Promise that
 * races real work against a deadline. A layer resolves into exactly one of four states
 * relative to its deadline - arrived in time, arrived too late, still pending and would
 * still be on time, still pending and would already be late - which is genuine,
 * ordinary async/timeout behavior; nothing here depends on any exotic physics, only on
 * network/scheduler timing being unpredictable in the mundane way it always is.
 *
 * Layers are also cross-linked, not just parent/child: a page that scores as a likely
 * schedule page causes its immediate neighbors to be checked with a widened budget, since
 * real door/hardware schedules are usually printed across several consecutive pages.
 *
 * No external API calls. VERIFIED 2026-08-30 against real evidence, not assumed: the
 * first version of this file assumed each page has an embedded PDF text layer
 * (pdfRenderer.getPageTextLayer(), which doesn't exist anywhere in Ron's codebase - I
 * invented it). Tested against the actual real door-schedule PDFs on disk
 * (/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf) and found they have ZERO embedded
 * text - they're scans, rotated 90 degrees. A text-layer-only classifier would report
 * every real document as unresolved and never work.
 *
 * Real, tested fix: rasterize the page to an image, run tesseract-wasm (real WASM
 * OCR, no native binary, runs in the Worker) with built-in orientation detection to
 * correct the rotation, then OCR just the title-block crop (not the whole dense
 * table - default settings garble that) with tessedit_pageseg_mode=11 (sparse_text).
 * Verified end-to-end in Node against the real file: correctly reads "DOOR SCHEDULE"
 * off a page that started as zero extractable text. Classification then runs the
 * same classifyPageType() keyword registry already in schedule-router.ts, so a "not
 * implemented" schedule type here means exactly what it means there.
 *
 * Not yet verified: rasterizing a PDF page to a pixel buffer *inside the actual
 * Cloudflare Worker* (my local test used pdftoppm, a native binary that can't run
 * there). pdfjs-dist is already a dependency in Ron's code for page metadata; whether
 * its rendering path works without a Canvas binding in the Workers runtime is the
 * one open question before this is deployable end-to-end. This module takes an
 * already-rasterized page image so that boundary is explicit, not papered over.
 */

// classifyPageType() and the registry below are a plain-JS mirror of the real
// registry in Ron's /Users/johnmobley/hascom/29c-reconciliation/src/extraction/
// schedule-router.ts (TypeScript, a separate repo - can't import it directly
// from here). Keep these in sync by hand if that file's registry changes;
// this is deliberately the same keyword sets and status flags, not a
// reinvention of them.
const SCHEDULE_TYPE_REGISTRY = {
  door_schedule: { status: 'active', pageClassifiers: ['door schedule', 'door index', 'door list'] },
  hardware_schedule: { status: 'active', pageClassifiers: ['hardware schedule', 'hardware group', 'hdw', 'hw group'] },
  finish_schedule: { status: 'not_implemented', pageClassifiers: ['finish schedule', 'finish hardware'] },
  ada_compliance: { status: 'not_implemented', pageClassifiers: ['ada compliance', 'accessibility'] },
  municipal_requirements: { status: 'not_implemented', pageClassifiers: ['municipal', 'code requirements'] },
};

function classifyPageType(title) {
  const lower = (title || '').toLowerCase();
  for (const [type, config] of Object.entries(SCHEDULE_TYPE_REGISTRY)) {
    for (const classifier of config.pageClassifiers) {
      if (lower.includes(classifier)) return type;
    }
  }
  return 'unknown_schedule';
}

// --- Timing states -----------------------------------------------------

const ARRIVAL = Object.freeze({
  ON_TIME: 'on_time',
  TOO_LATE: 'too_late',
  PENDING_STILL_ON_TIME: 'pending_still_on_time',
  PENDING_ALREADY_LATE: 'pending_already_late',
});

/**
 * Races a real unit of work against a deadline and reports which of the four
 * timing states it landed in. This is the entire "non-deterministic packet
 * arrival" behavior requested - built on Date.now() and setTimeout, because
 * that's a real, sufficient source of unpredictable timing.
 */
function raceAgainstDeadline(workPromise, deadlineMs) {
  const start = Date.now();
  let settled = false;

  const timed = workPromise.then(
    (value) => {
      settled = true;
      const elapsed = Date.now() - start;
      return { state: elapsed <= deadlineMs ? ARRIVAL.ON_TIME : ARRIVAL.TOO_LATE, value, elapsed };
    },
    (error) => {
      settled = true;
      const elapsed = Date.now() - start;
      return { state: elapsed <= deadlineMs ? ARRIVAL.ON_TIME : ARRIVAL.TOO_LATE, error, elapsed };
    },
  );

  const deadline = new Promise((resolve) => {
    setTimeout(() => {
      if (!settled) {
        const remaining = deadlineMs - (Date.now() - start);
        resolve({
          state: remaining >= 0 ? ARRIVAL.PENDING_STILL_ON_TIME : ARRIVAL.PENDING_ALREADY_LATE,
          pending: workPromise,
        });
      }
    }, deadlineMs);
  });

  return Promise.race([timed, deadline]);
}

// --- Real per-page work --------------------------------------------------
//
// ocrEngine: a tesseract-wasm OCREngine, already constructed via
// createOCREngine() by the caller (one engine, reused across pages - engine
// construction loads the ~1.8MB WASM module, don't pay that cost per page).
// modelBytes: the trained data (e.g. eng.traineddata), loaded once by the caller.

function rotate90CW(img) {
  const { width: w, height: h, data } = img;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      const dstIdx = ((x) * h + (h - 1 - y)) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return { data: out, width: h, height: w };
}

function cropTitleRegion(img) {
  // Verified region against real title blocks: top strip, left ~65% of
  // width. Real documents vary - this is a first cut, not guaranteed to
  // frame every title block correctly, and should be revisited against a
  // wider set of real project PDFs before this is trusted broadly.
  const cropW = Math.floor(img.width * 0.65);
  const cropH = Math.floor(img.height * 0.1);
  const out = new Uint8ClampedArray(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (y * img.width + x) * 4;
      const dstIdx = (y * cropW + x) * 4;
      out[dstIdx] = img.data[srcIdx];
      out[dstIdx + 1] = img.data[srcIdx + 1];
      out[dstIdx + 2] = img.data[srcIdx + 2];
      out[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }
  return { data: out, width: cropW, height: cropH };
}

/**
 * Reads the title text off one rasterized page image via real OCR. Returns
 * null (not a guess) only if OCR genuinely produces nothing - it does not
 * silently fall back to fabricating a result.
 */
async function extractPageTitleText(ocrEngine, pageImage) {
  ocrEngine.clearImage();
  ocrEngine.loadImage(pageImage);

  const orientation = ocrEngine.getOrientation();
  let corrected = pageImage;
  if (orientation.rotation !== 0 && orientation.confidence > 0.5) {
    const turns = Math.round(orientation.rotation / 90) % 4;
    for (let i = 0; i < turns; i++) corrected = rotate90CW(corrected);
    ocrEngine.clearImage();
    ocrEngine.loadImage(corrected);
  }

  const titleCrop = cropTitleRegion(corrected);
  ocrEngine.clearImage();
  ocrEngine.loadImage(titleCrop);
  ocrEngine.setVariable('tessedit_pageseg_mode', '11'); // sparse_text

  const text = ocrEngine.getText();
  if (!text || text.trim().length === 0) return null;
  return text;
}

async function classifyOnePage(ocrEngine, pageImage) {
  const text = await extractPageTitleText(ocrEngine, pageImage);
  if (text === null) {
    return { scheduleType: null, resolved: false, reason: 'ocr_produced_no_text' };
  }
  // classifyPageType looks for the same keyword sets Ron's real extraction
  // pipeline already uses - a page only counts as a candidate if the same
  // registry that will later actually extract it agrees it's worth trying.
  const scheduleType = classifyPageType(text);
  const config = SCHEDULE_TYPE_REGISTRY[scheduleType];
  const isCandidate = scheduleType !== 'unknown_schedule' && config && config.status !== 'not_implemented';
  return { scheduleType, resolved: true, isCandidate, ocrText: text.slice(0, 200) };
}

// --- Fractal layer ---------------------------------------------------------

/**
 * One IIFE layer per page. Each layer is awaited by its immediate neighbors
 * (the fractal cross-linking) as well as by its position in the overall
 * detection run - a page that resolves as a real candidate widens the
 * deadline budget given to its immediate neighbors, since schedules print
 * across consecutive pages in real project sets.
 */
function makeLayer({ ocrEngine, pageNumber, pageImage, baseDeadlineMs, corpus }) {
  return (async function layer() {
    const neighborBoost = corpus.pages[pageNumber - 1]?.isCandidate || corpus.pages[pageNumber + 1]?.isCandidate;
    const deadline = neighborBoost ? baseDeadlineMs * 2 : baseDeadlineMs;

    const raced = await raceAgainstDeadline(
      classifyOnePage(ocrEngine, pageImage),
      deadline,
    );

    let outcome;
    if (raced.state === ARRIVAL.ON_TIME || raced.state === ARRIVAL.TOO_LATE) {
      outcome = { pageNumber, ...raced.value, timing: raced.state, elapsed: raced.elapsed };
    } else {
      // PENDING_STILL_ON_TIME or PENDING_ALREADY_LATE: the classification
      // hasn't resolved yet. Record the honest pending state now; the real
      // result (if it ever arrives) updates the corpus when it settles,
      // it does not get guessed at in the meantime.
      outcome = { pageNumber, resolved: false, timing: raced.state };
      raced.pending.then((value) => {
        corpus.pages[pageNumber] = { pageNumber, ...value, timing: raced.state + '_then_resolved' };
      }).catch(() => {
        corpus.pages[pageNumber] = { pageNumber, resolved: false, timing: raced.state + '_then_failed' };
      });
    }

    corpus.pages[pageNumber] = outcome;
    return outcome;
  })();
}

// --- Entry point -------------------------------------------------------

/**
 * Runs schedule detection across a session's pages. Real replacement for the
 * current stub at /api/hardware-schedule/session/:id/detect-schedules.
 *
 * corpus: { pages: { [pageNumber]: layerResult }, candidates: [...], meta: {...} }
 * Sections/subsections as requested - "pages" and "candidates" are the two
 * sections; each page entry is its own subsection.
 *
 * pageImages: Map<pageNumber, {data, width, height}> - already-rasterized
 * pages. Rasterization (PDF page -> pixels) happens before this function is
 * called; see the file-level note on why that boundary is drawn here.
 *
 * IMPORTANT: ocrEngine is one shared, stateful WASM instance - it is not
 * safe to call concurrently. Layers are still deadline-raced individually
 * (each page's real timing outcome is still meaningful and independent),
 * but the actual OCR work is processed one page at a time through the
 * engine. This isn't a limitation introduced here - a single Worker
 * invocation is single-threaded JS regardless; the earlier draft's
 * Promise.all implied parallelism that was never real to begin with.
 */
export async function detectSchedules({ env, sessionId, ocrEngine, pageImages, totalPages, baseDeadlineMs = 4000 }) {
  const corpus = { pages: {}, candidates: [], meta: { totalPages, startedAt: Date.now() } };

  // First pass: pages processed in order through the one OCR engine, each
  // still individually deadline-raced.
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    await makeLayer({ ocrEngine, pageNumber, pageImage: pageImages.get(pageNumber), baseDeadlineMs, corpus });
  }

  // Second pass: neighbor-aware re-check for pages that were still pending
  // when their neighbor came back as a real candidate (the cross-layer
  // dependency) - gives them one more real chance at the widened deadline
  // instead of leaving them permanently unresolved because of scheduling
  // order alone.
  const stillPending = Object.values(corpus.pages).filter((p) => !p.resolved);
  for (const p of stillPending) {
    await makeLayer({ ocrEngine, pageNumber: p.pageNumber, pageImage: pageImages.get(p.pageNumber), baseDeadlineMs: baseDeadlineMs * 2, corpus });
  }

  corpus.candidates = Object.values(corpus.pages)
    .filter((p) => p.resolved && p.isCandidate)
    .map((p) => ({ pageNumber: p.pageNumber, scheduleType: p.scheduleType }));

  const unresolved = Object.values(corpus.pages).filter((p) => !p.resolved);

  if (env?.DB && corpus.candidates.length > 0) {
    const stmt = env.DB.prepare(
      `INSERT INTO schedule_region_candidates (session_id, page_number, schedule_type, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
    );
    await env.DB.batch(corpus.candidates.map((c) => stmt.bind(sessionId, c.pageNumber, c.scheduleType)));
  }

  return {
    sessionId,
    candidates: corpus.candidates,
    unresolved: unresolved.map((p) => ({ pageNumber: p.pageNumber, timing: p.timing })),
    pagesWithNoOcrText: Object.values(corpus.pages).filter((p) => p.resolved && p.reason === 'ocr_produced_no_text').length,
    durationMs: Date.now() - corpus.meta.startedAt,
  };
}
