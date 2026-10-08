// weyland-forms-worker/src/index.js
//
// WeylandAI's form tools, rebuilt off the monolith (2026-10-08): pages at
// /lienx (and each tool's own path as it moves here), APIs under
// /api/forms/<tool>/*. See wrangler.toml for why this worker exists.

import { NativeRouter } from "./lib/router.js";
import { authenticate } from "./lib/auth.js";
import { jsonResponse3 } from "./lib/json-response.js";
import { registerLienxRoutes } from "./routes/lienx.js";
import { registerClosexRoutes } from "./routes/closex.js";
import { PDFDocument } from "pdf-lib";
import closexHtml from "./pages/closex.html";
import { registerChangeOrdxRoutes } from "./routes/changeordx.js";
import changeordxHtml from "./pages/changeordx.html";
import { registerNotesxRoutes } from "./routes/notesx.js";
import notesxHtml from "./pages/notesx.html";
import { registerRfaxRoutes } from "./routes/rfax.js";
import rfaxHtml from "./pages/rfax.html";
import lienxHtml from "./pages/lienx.html";
import { secured } from "../../weyland-shared/security-headers.js";

const router = new NativeRouter();
router.get("/health", () => jsonResponse3({ ok: true, worker: "weyland-forms-worker" }));

const page = (html) => () => new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } });
for (const [paths, html] of [[["/lienx", "/lienx/"], lienxHtml], [["/closex", "/closex/"], closexHtml], [["/changeordx", "/changeordx/"], changeordxHtml], [["/notesx", "/notesx/"], notesxHtml], [["/rfax", "/rfax/"], rfaxHtml]]) for (const p of paths) { router.get(p, page(html)); router.addRoute("HEAD", p, page(html)); }

registerLienxRoutes(router, { authenticate });
registerClosexRoutes(router, { authenticate, PDFDocument });
registerChangeOrdxRoutes(router, { authenticate });
registerNotesxRoutes(router, { authenticate });
registerRfaxRoutes(router, { authenticate, PDFDocument });

export default secured({
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  },
});
