import { jsonResponse3 } from "../lib/json-response.js";
import { verifyJWT } from "../auth-module.js";
import { launchBrowser } from "../lib/sovereign-cdp.js";

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
  // Real, live self-test for src/lib/sovereign-cdp.js (the MONOLITH_HELPER_MAP.md
  // section 3 step 4 CDP client) against a real env.BROWSER session -
  // exercises goto()/status()/headers(), setContent()/content(),
  // setUserAgent(), setRequestInterception()/request.continue()/response
  // listeners, evaluate(), pdf(), and close() in one real, non-simulated
  // run. Gated by a dedicated secret (CDP_SELFTEST_SECRET) since it opens
  // a real billed Cloudflare Browser Rendering session on every call -
  // not meant for public traffic, only for verifying this client works
  // against production before/after wiring it into real PDF/discovery
  // call sites. Kept in place after verification as a real, reusable
  // diagnostic, same as the other /api/internal/* routes in this file.
  router.get("/api/internal/cdp-selftest", async (request2, env2) => {
    const url = new URL(request2.url);
    const key = url.searchParams.get("key") || request2.headers.get("X-Debug-Key");
    if (!env2.CDP_SELFTEST_SECRET || key !== env2.CDP_SELFTEST_SECRET) {
      return jsonResponse3({ error: "Unauthorized" }, 401);
    }
    if (!env2.BROWSER) {
      return jsonResponse3({ error: "env.BROWSER binding not configured" }, 500);
    }
    const steps = [];
    let browser;
    try {
      browser = await launchBrowser(env2.BROWSER);
      steps.push({ step: "launchBrowser", ok: true });

      const page = await browser.newPage();
      steps.push({ step: "newPage", ok: true });

      const requestsSeen = [];
      const responsesSeen = [];
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        requestsSeen.push(req.url());
        req.continue();
      });
      page.on("response", (res) => {
        responsesSeen.push({ url: res.url(), status: res.status() });
      });

      const gotoResponse = await page.goto("https://example.com/", { waitUntil: "load", timeout: 2e4 });
      steps.push({
        step: "goto",
        ok: !!gotoResponse,
        status: gotoResponse ? gotoResponse.status() : null,
        contentType: gotoResponse ? gotoResponse.headers()["content-type"] || null : null,
        requestsIntercepted: requestsSeen.length,
        responsesObserved: responsesSeen.length
      });

      await page.setUserAgent("SovereignCDP-SelfTest/1.0");
      steps.push({ step: "setUserAgent", ok: true });

      await page.setContent("<!DOCTYPE html><html><head><title>selftest</title></head><body><p>hello sovereign cdp</p></body></html>", { waitUntil: "load" });
      const content = await page.content();
      steps.push({
        step: "setContent+content",
        ok: content.includes("hello sovereign cdp"),
        contentLength: content.length
      });

      const evalResult = await page.evaluate(() => document.title);
      steps.push({ step: "evaluate", ok: evalResult === "selftest", value: evalResult });

      const pdfBytes = await page.pdf({ format: "Letter", printBackground: true, margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" } });
      const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 5));
      const pdfStep = { step: "pdf", ok: pdfHeader === "%PDF-", byteLength: pdfBytes.length, header: pdfHeader };
      if (url.searchParams.get("includePdf") === "1") {
        let binary = "";
        for (let i = 0; i < pdfBytes.length; i += 8192) {
          binary += String.fromCharCode.apply(null, pdfBytes.subarray(i, Math.min(i + 8192, pdfBytes.length)));
        }
        pdfStep.pdfBase64 = btoa(binary);
      }
      steps.push(pdfStep);

      await page.close();
      steps.push({ step: "page.close", ok: true });

      // A second newPage() on the SAME browser session - the real
      // pattern src/lib/cutsheet-discovery.js relies on (each candidate
      // URL gets its own fresh page via a new browser.newPage() call on
      // one shared browser, e.g. verifyPdfWithPuppeteer/
      // searchManufacturerSite/googleSiteSearch all do this in
      // sequence during a real discovery run) - not covered by the
      // first newPage() above, and a real place a per-call listener
      // setup bug could hide.
      const page2 = await browser.newPage();
      const goto2 = await page2.goto("https://example.com/", { waitUntil: "load", timeout: 2e4 });
      await page2.close();
      steps.push({ step: "second newPage on same browser", ok: !!goto2 && goto2.status() === 200 });

      await browser.close();
      steps.push({ step: "browser.close", ok: true });

      const allOk = steps.every((s) => s.ok);
      return jsonResponse3({ ok: allOk, steps }, allOk ? 200 : 500);
    } catch (err) {
      steps.push({ step: "error", ok: false, message: err.message, stack: err.stack });
      try {
        if (browser) await browser.close();
      } catch (_) {
      }
      return jsonResponse3({ ok: false, steps }, 500);
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
