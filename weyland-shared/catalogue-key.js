// weyland-shared/catalogue-key.js
//
// catalogues.storage_path does not always say where the PDF really is in R2
// (UPLOADS): 25 rows point at cps/catalogues/<id>.pdf while the file sits at
// catalogues/<source_filename>, 3 carry a Windows path from another machine,
// 42 are empty although the file may exist. Shared (2026-10-08) because the
// one matcher (cut-sheet-matcher.js) runs in weyland-cutsheetx-worker and
// weyland-subx-worker, and both need to know whether a cited catalogue page
// can be opened. The repair job stays in the cutsheetx worker
// (src/lib/catalogue-storage.js).

const WINDOWS_PATH = /^[A-Za-z]:\\/;

export function isWindowsPath(p) {
  return WINDOWS_PATH.test(String(p || ""));
}

export function catalogueKeyCandidates(row) {
  const c = [];
  if (row.storage_path && !isWindowsPath(row.storage_path)) c.push(row.storage_path);
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
