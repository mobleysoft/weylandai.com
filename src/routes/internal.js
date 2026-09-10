import { jsonResponse3 } from "../lib/json-response.js";
import { verifyJWT } from "../auth-module.js";

/**
 * @param {object} router
 */
export function registerInternalRoutes(router) {
  const R2_STREAM_CT = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
  function r2StreamContentType(key, headObj) {
    const ext = (key.match(/\.[^.\/]+$/) || [""])[0].toLowerCase();
    return headObj && headObj.httpMetadata && headObj.httpMetadata.contentType || R2_STREAM_CT[ext] || "application/pdf";
  }

  router.addRoute("HEAD", "/api/internal/r2-stream", async (request2, env2) => {
    try {
      const url = new URL(request2.url);
      const token = url.searchParams.get("token");
      if (!token)
        return new Response(null, { status: 401 });
      const payload = await verifyJWT(token, env2.JWT_SECRET);
      if (!payload.key)
        return new Response(null, { status: 400 });
      const head = await env2.UPLOADS.head(payload.key);
      if (!head)
        return new Response(null, { status: 404 });
      return new Response(null, {
        headers: {
          "Content-Type": r2StreamContentType(payload.key, head),
          "Content-Length": head.size.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err) {
      return new Response(null, { status: 403 });
    }
  });
  router.options("/api/internal/r2-stream", async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range",
        "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
        "Access-Control-Max-Age": "86400"
      }
    });
  });
  router.get("/api/internal/r2-stream", async (request2, env2) => {
    try {
      const url = new URL(request2.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return jsonResponse3({ error: "Missing token parameter" }, 401);
      }
      const payload = await verifyJWT(token, env2.JWT_SECRET);
      if (!payload.key) {
        return jsonResponse3({ error: "Invalid token payload" }, 400);
      }
      const rangeHeader = request2.headers.get("Range");
      const _headObj = await env2.UPLOADS.head(payload.key);
      const totalSize = _headObj?.size;
      const contentType = r2StreamContentType(payload.key, _headObj);
      if (rangeHeader && totalSize) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
          const length = end - start + 1;
          console.log(`[R2 Stream] Range request: bytes=${start}-${end} of ${totalSize} (${(length / 1024).toFixed(0)} KB)`);
          const r2Object2 = await env2.UPLOADS.get(payload.key, {
            range: { offset: start, length }
          });
          if (!r2Object2) {
            return jsonResponse3({ error: "Object not found" }, 404);
          }
          return new Response(r2Object2.body, {
            status: 206,
            headers: {
              "Content-Type": contentType,
              "Content-Range": `bytes ${start}-${end}/${totalSize}`,
              "Content-Length": length.toString(),
              "Accept-Ranges": "bytes",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges"
            }
          });
        }
      }
      const r2Object = await env2.UPLOADS.get(payload.key);
      if (!r2Object) {
        return jsonResponse3({ error: "Object not found" }, 404);
      }
      console.log(`[R2 Stream] Full file: ${(r2Object.size / 1024 / 1024).toFixed(1)} MB`);
      return new Response(r2Object.body, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": r2Object.size.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges"
        }
      });
    } catch (err) {
      console.error("[R2 Stream] Error:", err.message);
      return jsonResponse3({ error: "Stream failed: " + err.message }, 403);
    }
  });
  router.get("/api/internal/pdf-render-shell", async (request2, env2) => {
    const html = `<!DOCTYPE html><html><head>
  <script type="module">
  import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  window.pdfjsLib = pdfjsLib;
  window.__pdfjsReady = true;
  <\/script>
  </head><body></body></html>`;
    return new Response(html, {
      headers: { "Content-Type": "text/html", "Cache-Control": "no-store" }
    });
  });
}
