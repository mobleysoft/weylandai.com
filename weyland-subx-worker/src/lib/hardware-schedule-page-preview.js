// src/lib/hardware-schedule-page-preview.js
//
// getOrRenderPage: the real implementation of the long-dead page-preview
// pipeline. Was a hard stub (getOrRenderPageNotYetPorted in src/index.js)
// since the 2026-09-12 microservices extraction - every call to either
// GET .../page/:n/preview or GET .../candidates/:id/preview threw "not yet
// ported" (a real, honestly-flagged gap, not a silent failure). Fixed
// 2026-10-02 by reusing renderRegionAt600DPI2 (hardware-extraction-region-
// render.js), the same real Browser Rendering (env.BROWSER +
// @cloudflare/puppeteer) pipeline already proven live for region-extraction
// (hardware-schedule-page-affirm.js) and submittal generation (hardware-
// schedule-generate.js) - rendering the FULL page via its existing
// percentage-based bounding-box support (x_percent/y_percent/width_percent/
// height_percent = 0,0,1,1) instead of building new rendering
// infrastructure. The optional overlay highlight (candidate region) is
// drawn inside that SAME real headless-browser render pass - see that
// function's own header comment for why a separate OffscreenCanvas-based
// post-processing step (the old drawBoundingBoxOverlay, now deleted) was
// real but broken (OffscreenCanvas doesn't exist in the bare Workers
// isolate this file itself runs in).
//
// Caches rendered pages in the real OUTPUTS R2 bucket (already bound,
// already used elsewhere in this worker for generated artifacts) - a
// session's PDF content doesn't change after upload, so a given
// page/candidate only ever needs to be rendered once. No TTL: cache
// entries are small, keyed per session, and naturally bounded by how many
// pages/candidates a session actually has.
import { renderRegionAt600DPI2 } from "./hardware-extraction-region-render.js";

const FULL_PAGE_BBOX = { x_percent: 0, y_percent: 0, width_percent: 1, height_percent: 1 };

function cacheKey(sessionId, pageNumber, overlayOpts) {
  if (overlayOpts && overlayOpts.candidateId) {
    return `page-previews/${sessionId}/p${pageNumber}-candidate-${overlayOpts.candidateId}.jpg`;
  }
  return `page-previews/${sessionId}/p${pageNumber}.jpg`;
}

export async function getOrRenderPage(sessionId, pageNumber, pdfBuffer, env2, overlayOpts = null) {
  const key = cacheKey(sessionId, pageNumber, overlayOpts);

  if (env2.OUTPUTS) {
    const cached = await env2.OUTPUTS.get(key);
    if (cached) {
      const imageBuffer = await cached.arrayBuffer();
      const meta = cached.customMetadata || {};
      return {
        imageBuffer,
        width: parseInt(meta.width, 10) || null,
        height: parseInt(meta.height, 10) || null,
        cacheHit: true,
      };
    }
  }

  const overlay = overlayOpts && overlayOpts.box
    ? { box: overlayOpts.box, color: overlayOpts.color || "#6B7280" }
    : null;
  const rendered = await renderRegionAt600DPI2(pdfBuffer, pageNumber, FULL_PAGE_BBOX, env2, 600, null, overlay);

  if (env2.OUTPUTS) {
    await env2.OUTPUTS.put(key, rendered.imageBuffer, {
      httpMetadata: { contentType: "image/jpeg" },
      customMetadata: { width: String(rendered.width), height: String(rendered.height) },
    });
  }

  return {
    imageBuffer: rendered.imageBuffer,
    width: rendered.width,
    height: rendered.height,
    cacheHit: false,
  };
}
