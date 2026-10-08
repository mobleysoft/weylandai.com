// weyland-cutsheetx-worker/src/lib/catalogue-storage.js
//
// catalogues.storage_path does not always say where the PDF really is in
// R2 (UPLOADS): 25 rows point at cps/catalogues/<id>.pdf while the file sits
// at catalogues/<source_filename>, 3 carry a Windows path from another
// machine, 42 are empty although the file may exist. The page render route
// and the catalogue-page citations both need a key that exists, so this
// resolves each row against R2 with cheap HEAD calls and repairs the column.
// Idempotent; runs from the corpus ingest job (traffic-driven lease).

// The key lookup itself is shared with the one matcher (weyland-shared/
// catalogue-key.js); re-exported here for this worker's existing importers.
import { catalogueKeyCandidates, resolveCatalogueKey, isWindowsPath } from "../../../weyland-shared/catalogue-key.js";
export { catalogueKeyCandidates, resolveCatalogueKey };

/** Repair storage_path for every catalogue whose recorded key is not in R2. */
export async function resolveCatalogueStoragePaths(env, limit = 100) {
  const rows = await env.DB.prepare("SELECT catalogue_id, storage_path, source_filename FROM catalogues ORDER BY catalogue_id LIMIT ?").bind(limit).all();
  const summary = { checked: 0, alreadyCorrect: 0, repaired: 0, missing: 0 };
  for (const row of rows.results || []) {
    summary.checked++;
    let ok = false;
    if (row.storage_path && !isWindowsPath(row.storage_path)) {
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
