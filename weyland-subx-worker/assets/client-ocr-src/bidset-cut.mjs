import { UPLOAD_LIMIT } from './source-pages.mjs';

// titleBlocks is the shared SightX reader's result, collected by the finder.
// It currently supplies boolean acceptance, not a numeric confidence: accepted
// plans tie. Honour numeric confidence if supplied; break ties by original page.
export function selectBidSetPages(found, readingPlan) {
  if (!found || found.complete === false || !Array.isArray(found.sheets)) {
    throw new Error('The whole bid set could not be checked for schedules and plans. Try again in a desktop browser, or choose a smaller searchable PDF. Nothing was uploaded.');
  }
  const schedules = [...new Set([...(found.door_schedule_pages || []), ...(found.hardware_pages || [])])];
  if (!schedules.length) throw new Error('No schedule pages were found in the bid set\'s text. Choose a searchable PDF or export the schedule and floor-plan pages, then try again. Nothing was uploaded.');
  const byPage = new Map(found.sheets.map(s => [s.page, s]));
  const plans = found.sheets.filter(s => s.plan && !schedules.includes(s.page))
    .sort((a, b) => (Number.isFinite(b.confidence) ? b.confidence : 1) - (Number.isFinite(a.confidence) ? a.confidence : 1) || a.page - b.page);
  const all = [...schedules, ...plans.map(p => p.page)];
  if (all.some(p => !Number.isSafeInteger(p) || p < 1 || p > found.pages)) throw new Error('The finder returned an invalid page. Select the PDF again.');
  return { schedules, plans, byPage, readingPlan };
}

export function makePageMap(selected, selection, found, originalBytes, omitted = []) {
  return {
    version: 1, original_pages: found.pages, original_bytes: originalBytes,
    pages: [...selected].sort((a, b) => a - b).map((p, i) => ({ pdf_page: i + 1, original_page: p, sheet: selection.byPage.get(p)?.sheet || null })),
    omitted_plans: omitted.map(p => ({ original_page: p.page, sheet: p.sheet || null })),
  };
}

export async function cutBidSet(bytes, found, readingPlan, options = {}) {
  const selection = selectBidSetPages(found, readingPlan);
  const progress = options.onProgress || (() => {});
  const limit = options.limit ?? UPLOAD_LIMIT;
  const { PDFDocument } = options.pdfLib || await import('./pdf-lib.mjs');
  let source;
  try { source = await PDFDocument.load(bytes); }
  catch { throw new Error('This PDF could not be copied (it may be locked or damaged). Save an unlocked PDF from your PDF viewer and try again. Nothing was uploaded.'); }
  if (source.getPageCount() !== found.pages) throw new Error('The PDF changed after the finder ran. Select it again.');
  const plans = selection.plans;
  // Rebuild in a fresh document each time: removePage alone leaves unreachable
  // image objects in pdf-lib's context and does not reduce the saved byte size.
  const build = async count => {
    const kept = [...selection.schedules, ...plans.slice(0, count).map(p => p.page)].sort((a, b) => a - b);
    progress('Keeping ' + kept.length + ' of ' + found.pages + ' pages: the door schedule, hardware pages' + (count ? ' and the floor plans' : '') + '.');
    const cut = await PDFDocument.create();
    (await cut.copyPages(source, kept.map(p => p - 1))).forEach(p => cut.addPage(p));
    return { kept, data: await cut.save() };
  };
  let count = plans.length, result = await build(count);
  if (result.data.byteLength > limit) {
    progress('The selected pages exceed 30 MB. Keeping schedules first and checking which floor plans fit...');
    // Keep the longest fitting confidence-ordered prefix. Binary search avoids
    // reserializing a scan-heavy bid set once for every omitted plan sheet.
    result = await build(0);
    if (result.data.byteLength > limit) throw new Error('The schedule pages alone are over 30 MB. Reduce their scan resolution or split the schedule into smaller PDFs, then try again. Nothing was uploaded.');
    let low = 0, high = plans.length;
    while (low + 1 < high) {
      const mid = Math.floor((low + high) / 2), candidate = await build(mid);
      if (candidate.data.byteLength <= limit) { low = mid; result = candidate; }
      else high = mid;
    }
    count = low;
  }
  const source_pdf = makePageMap(result.kept, selection, found, bytes.byteLength, plans.slice(count));
  const local = new Map(source_pdf.pages.map(p => [p.original_page, p.pdf_page]));
  return { bytes: result.data, source_pdf, readingPlan: readingPlan.map(p => ({ ...p, page: local.get(p.page) })) };
}
