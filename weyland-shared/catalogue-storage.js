// weyland-shared/catalogue-storage.js
//
// catalogues.storage_path does not always say where the PDF really is in
// R2 (UPLOADS): 25 rows point at cps/catalogues/<id>.pdf while the file sits
// at catalogues/<source_filename>, 3 carry a Windows path from another
// machine, 42 are empty although the file may exist. The page render route
// and the catalogue-page citations both need a key that exists, so this
// resolves each row against R2 with cheap HEAD calls and repairs the column.
// Idempotent; runs from the corpus ingest job (traffic-driven lease).
//
// Moved here 2026-10-08 from weyland-cutsheetx-worker/src/lib (which
// re-exports it) so the submittal packet in weyland-subx-worker resolves a
// catalogue PDF the same way the citation does.
//
// A note on the eight manufacturer price books (LCN, Ives, Zero, Von Duprin,
// Steelcraft, Falcon, NGP, Glynn-Johnson): their PDFs are in R2 at
// manufacturer-catalogs/<catalogue_id>.pdf (the product_documents rows point
// there) but that file is a different edition from the text indexed in
// catalogue_pages (checked 2026-10-08: page counts and page contents
// differ). That key is therefore NOT a candidate here: a page number from the
// index would open the wrong page of the other edition. It becomes the
// storage_path only when the catalogue's text is re-indexed from that file.

const WINDOWS_PATH = /^[A-Za-z]:\\/;

export function catalogueKeyCandidates(row) {
  const c = [];
  if (row.storage_path && !WINDOWS_PATH.test(row.storage_path)) c.push(row.storage_path);
  if (row.source_filename) c.push("catalogues/" + row.source_filename);
  c.push("cps/catalogues/" + row.catalogue_id + ".pdf");
  return [...new Set(c)];
}

/** Find the R2 key that exists for a catalogue row, or null. */
export async function resolveCatalogueKey(env, row) {
  if (!env.UPLOADS) return null;
  for (const key of catalogueKeyCandidates(row)) {
    try {
      if (await env.UPLOADS.head(key)) return key;
    } catch (e) { /* try the next candidate */ }
  }
  return null;
}

/** Repair storage_path for every catalogue whose recorded key is not in R2. */
export async function resolveCatalogueStoragePaths(env, limit = 100) {
  const rows = await env.DB.prepare("SELECT catalogue_id, storage_path, source_filename FROM catalogues ORDER BY catalogue_id LIMIT ?").bind(limit).all();
  const summary = { checked: 0, alreadyCorrect: 0, repaired: 0, missing: 0 };
  for (const row of rows.results || []) {
    summary.checked++;
    let ok = false;
    if (row.storage_path && !WINDOWS_PATH.test(row.storage_path)) {
      try { ok = !!(await env.UPLOADS.head(row.storage_path)); } catch (e) { ok = false; }
    }
    if (ok) { summary.alreadyCorrect++; continue; }
    const key = await resolveCatalogueKey(env, row);
    if (key) {
      await env.DB.prepare("UPDATE catalogues SET storage_path = ? WHERE catalogue_id = ?").bind(key, row.catalogue_id).run();
      summary.repaired++;
    } else {
      summary.missing++;
    }
  }
  return summary;
}
