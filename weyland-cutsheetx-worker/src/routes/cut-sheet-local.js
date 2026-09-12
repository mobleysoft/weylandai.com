import { jsonResponse3 } from "../lib/json-response.js";

/**
 * @param {object} router
 * @param {{ authenticate: Function, requireProductAccess: Function, searchLocalCatalogue: Function, LOCAL_CATALOGUE_INDEX: object }} deps
 */
export function registerCutSheetLocalRoutes(router, { authenticate, requireProductAccess, searchLocalCatalogue, LOCAL_CATALOGUE_INDEX }) {
  router.get("/api/cut-sheets/local-search", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
      if (_prodErr) return _prodErr;
    }
    try {
      const url = new URL(request2.url);
      const manufacturer = url.searchParams.get("manufacturer");
      const model = url.searchParams.get("model");
      const series = url.searchParams.get("series");
      if (!manufacturer) {
        return jsonResponse3({ error: "manufacturer parameter is required" }, 400);
      }
      const result = await searchLocalCatalogue(manufacturer, model, series, env2);
      if (result) {
        return jsonResponse3({
          found: true,
          source: "local_catalogue",
          ...result
        });
      } else {
        return jsonResponse3({
          found: false,
          source: "local_catalogue",
          message: "No match in local catalogue",
          searchedFor: { manufacturer, model, series }
        });
      }
    } catch (err) {
      return jsonResponse3({ error: "Local catalogue search failed: " + err.message }, 500);
    }
  });
  router.get("/api/cut-sheets/local-index", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "cutsheetx");
      if (_prodErr) return _prodErr;
    }
    try {
      const manufacturers = [...new Set(LOCAL_CATALOGUE_INDEX.files.map((f) => f.manufacturer))];
      const parentCompanies = [...new Set(LOCAL_CATALOGUE_INDEX.files.map((f) => f.parent_company))];
      return jsonResponse3({
        version: LOCAL_CATALOGUE_INDEX.version,
        totalFiles: LOCAL_CATALOGUE_INDEX.files.length,
        manufacturers,
        parentCompanies,
        manufacturerCounts: manufacturers.reduce((acc, mfr) => {
          acc[mfr] = LOCAL_CATALOGUE_INDEX.files.filter((f) => f.manufacturer === mfr).length;
          return acc;
        }, {})
      });
    } catch (err) {
      return jsonResponse3({ error: "Failed to get local index: " + err.message }, 500);
    }
  });
}
