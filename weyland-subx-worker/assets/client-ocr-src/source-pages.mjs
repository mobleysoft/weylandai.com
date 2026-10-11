// PDF indexes stay local for extraction/rendering. Citations use the bid set's
// numbering. Stored with the session in document_outline.source_pdf; legacy
// bookmark arrays and sessions without a cut remain unchanged.
export const UPLOAD_LIMIT = 30 * 1024 * 1024;

export function sourcePdf(session) {
  if (session?.source_pdf) return session.source_pdf;
  try {
    const outline = typeof session?.document_outline === 'string'
      ? JSON.parse(session.document_outline) : session?.document_outline;
    return outline?.source_pdf || null;
  } catch { return null; }
}

export function pageSource(session, page) {
  const entry = sourcePdf(session)?.pages?.find(p => p.pdf_page === Number(page));
  return entry ? { page: entry.original_page, sheet: entry.sheet, pdf_page: entry.pdf_page }
    : { page, sheet: null, pdf_page: page };
}

export function pageLabel(session, page) {
  const s = pageSource(session, page);
  return String(s.page) + (s.sheet ? ' (' + s.sheet + ')' : '');
}

// Only the duplicate warning is generated against the stored PDF. Other
// notes are the bid set's printed words and already use original references.
export function sourceNotes(session, text) {
  if (!sourcePdf(session) || !text) return text;
  return String(text).replace(/(Duplicate mark [^;]+ on page )(\d+)(; verify each occurrence)/g,
    (_, prefix, page, suffix) => prefix + pageLabel(session, Number(page)) + suffix);
}

export function validateSourcePdf(value, pageCount) {
  if (!value || value.version !== 1 || !Number.isSafeInteger(value.original_pages) || value.original_pages < pageCount
      || !Number.isSafeInteger(value.original_bytes) || value.original_bytes <= 0
      || !Array.isArray(value.pages) || value.pages.length !== pageCount || pageCount < 1) {
    throw new Error('The original-page map does not match the PDF. Select the bid set again and retry.');
  }
  const used = new Set();
  const entry = (p, i, kept) => {
    if (!p || !Number.isSafeInteger(p.original_page) || p.original_page < 1 || p.original_page > value.original_pages
        || used.has(p.original_page) || (kept && p.pdf_page !== i + 1)
        || (p.sheet !== null && (typeof p.sheet !== 'string' || p.sheet.length > 80))) {
      throw new Error('The original-page map is invalid. Select the bid set again and retry.');
    }
    used.add(p.original_page);
    return { ...(kept ? { pdf_page: i + 1 } : {}), original_page: p.original_page, sheet: p.sheet };
  };
  const pages = value.pages.map((p, i) => entry(p, i, true));
  if (!Array.isArray(value.omitted_plans || []) || (value.omitted_plans || []).length > value.original_pages) throw new Error('Invalid omitted plan pages.');
  const omitted_plans = (value.omitted_plans || []).map((p, i) => entry(p, i, false));
  return { version: 1, original_pages: value.original_pages, original_bytes: value.original_bytes, pages, omitted_plans };
}
