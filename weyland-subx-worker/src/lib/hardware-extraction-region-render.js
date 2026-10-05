// src/lib/hardware-extraction-region-render.js
//
// Ported verbatim from weylandai.com's src/legacy-monolith.js
// renderRegionAt600DPI2 (lines 133139-133350) for the standalone
// weyland-subx-worker extraction (2026-09-12 microservices push). Used
// by hardware-schedule-page-affirm.js (extract-region) and
// hardware-schedule-generate.js (generate-submittal/generate-package
// region rendering).
//
// Real dependency: env.BROWSER (Cloudflare Browser Rendering binding) +
// the real @cloudflare/puppeteer npm package - already a declared
// dependency in this account (used by weylandai-com-worker's own
// document-generator PDF routes). The monolith's own version resolved
// this through a lazy esbuild-vendored init block
// (init_puppeteer_cloudflare()/puppeteer_cloudflare_exports); this
// worker imports the same real package directly instead, which is
// simpler and behavior-identical (same library, same version pin in
// package.json).
//
// *** HONEST FLAG, NOT INTRODUCED BY THIS PORT ***
// Inside the headless-browser page context, this function loads PDF.js
// from our own host (weylandai.com/assets/pdfjs, was cdnjs.cloudflare.com until 2026-10-05) via a <script type="module">
// tag - a real third-party runtime dependency that already exists in
// today's live production code. Carried forward unchanged per the
// extraction task's own instruction (port real working code, don't
// silently "fix" things out of scope) - not a new sovereignty violation
// introduced by this extraction, but worth flagging for whoever picks up
// the sovereignty-doctrine cleanup pass.

import puppeteer from "@cloudflare/puppeteer";

export async function renderRegionAt600DPI2(pdfBuffer, pageNumber, boundingBox, env2 = null, dpi = 600, pdfUrl = null, overlay = null) {
  const DPI = dpi;
  const SCALE = DPI / 72;
  console.log("[Region Renderer 600DPI] " + "=".repeat(50));
  console.log("[Region Renderer 600DPI] Rendering page " + pageNumber + " region at 600 DPI");
  console.log("[Region Renderer 600DPI] Bounding box: " + JSON.stringify(boundingBox));
  const startTime = Date.now();
  if (!pdfUrl && (!pdfBuffer || !(pdfBuffer instanceof ArrayBuffer))) {
    throw new Error("pdfBuffer must be an ArrayBuffer (or provide pdfUrl for streaming)");
  }
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error("Invalid pageNumber: " + pageNumber + " (must be >= 1)");
  }
  const _isPct = boundingBox && typeof boundingBox.x_percent === "number" && typeof boundingBox.y_percent === "number" && typeof boundingBox.width_percent === "number" && typeof boundingBox.height_percent === "number";
  const _isPx = boundingBox && typeof boundingBox.x === "number" && typeof boundingBox.y === "number" && typeof boundingBox.width === "number" && typeof boundingBox.height === "number";
  if (!_isPct && !_isPx) {
    throw new Error("boundingBox must have numeric x/y/width/height (600-DPI px) OR x_percent/y_percent/width_percent/height_percent");
  }
  if (!env2 || !env2.BROWSER) {
    throw new Error("Browser Rendering binding (env.BROWSER) required for PDF rendering");
  }
  console.log("[Region Renderer 600DPI] Launching headless browser...");
  const browser = await puppeteer.launch(env2.BROWSER);
  try {
    const page = await browser.newPage();
    let pdfBase64 = null;
    if (pdfUrl) {
      console.log("[Region Renderer 600DPI] Using streaming URL (browser will fetch PDF directly)");
      const shellUrl = pdfUrl.split("/api/")[0] + "/api/internal/pdf-render-shell";
      await page.goto(shellUrl, { waitUntil: "networkidle0", timeout: 2e4 });
    } else {
      const bytes = new Uint8Array(pdfBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length)));
      }
      pdfBase64 = btoa(binary);
      console.log("[Region Renderer 600DPI] PDF encoded (" + (pdfBase64.length / 1024).toFixed(0) + " KB base64)");
      await page.setContent([
        "<!DOCTYPE html><html><head>",
        '<script type="module">',
        'import * as pdfjsLib from "https://weylandai.com/assets/pdfjs/pdf.min.mjs";',
        'pdfjsLib.GlobalWorkerOptions.workerSrc = "https://weylandai.com/assets/pdfjs/pdf.worker.min.mjs";',
        "window.pdfjsLib = pdfjsLib;",
        "window.__pdfjsReady = true;",
        "<\/script>",
        "</head><body></body></html>"
      ].join("\n"), { waitUntil: "networkidle0" });
    }
    await page.waitForFunction("window.__pdfjsReady === true", { timeout: 15e3 });
    console.log("[Region Renderer 600DPI] PDF.js loaded in browser context");
    const result = await page.evaluate(async (pdfB64, pdfFetchUrl, pgNum, bbox, scale2, overlayArg) => {
      try {
        let doc;
        if (pdfFetchUrl) {
          try {
            doc = await window.pdfjsLib.getDocument({
              url: pdfFetchUrl,
              rangeChunkSize: 65536,
              disableAutoFetch: true,
              disableStream: false
            }).promise;
          } catch (loadErr) {
            let sniff = "";
            try {
              const sr = await fetch(pdfFetchUrl, { headers: { "Range": "bytes=0-1023" } });
              const st = await sr.text();
              sniff = " [stream sniff: http " + sr.status + " ct=" + (sr.headers.get("content-type") || "?") + " first=" + st.slice(0, 100).replace(/\s+/g, " ") + "]";
            } catch (fe) {
              sniff = " [stream sniff failed: " + (fe && fe.message) + "]";
            }
            return { error: (loadErr && loadErr.message ? loadErr.message : String(loadErr)) + sniff };
          }
        } else {
          const binaryStr = atob(pdfB64);
          const pdfBytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            pdfBytes[i] = binaryStr.charCodeAt(i);
          }
          try {
            doc = await window.pdfjsLib.getDocument({ data: pdfBytes }).promise;
          } catch (bufErr) {
            const head = Array.from(pdfBytes.slice(0, 24)).map((c) => c >= 32 && c < 127 ? String.fromCharCode(c) : "\\x" + c.toString(16).padStart(2, "0")).join("");
            return { error: (bufErr && bufErr.message ? bufErr.message : String(bufErr)) + " [buffer sniff: " + pdfBytes.length + " bytes, head=" + head + "]" };
          }
        }
        if (pgNum > doc.numPages) {
          return { error: "Page " + pgNum + " out of range (PDF has " + doc.numPages + " pages)" };
        }
        const pg = await doc.getPage(pgNum);
        const viewport = pg.getViewport({ scale: scale2 });
        const fullW = Math.floor(viewport.width);
        const fullH = Math.floor(viewport.height);
        const viewRot = ((bbox && typeof bbox.view_rotation === "number" ? bbox.view_rotation : 0) % 360 + 360) % 360;
        const padWpct = bbox && typeof bbox.pad_w_percent === "number" ? bbox.pad_w_percent : 0;
        const padHpct = bbox && typeof bbox.pad_h_percent === "number" ? bbox.pad_h_percent : 0;
        if (bbox && typeof bbox.x_percent === "number") {
          bbox = { x: bbox.x_percent * fullW, y: bbox.y_percent * fullH, width: bbox.width_percent * fullW, height: bbox.height_percent * fullH };
        }
        if (padWpct || padHpct) {
          const pw = padWpct * fullW, ph = padHpct * fullH;
          bbox = { x: bbox.x - pw, y: bbox.y - ph, width: bbox.width + 2 * pw, height: bbox.height + 2 * ph };
        }
        const fullCanvas = new OffscreenCanvas(fullW, fullH);
        const fullCtx = fullCanvas.getContext("2d");
        fullCtx.fillStyle = "#FFFFFF";
        fullCtx.fillRect(0, 0, fullW, fullH);
        await pg.render({ canvasContext: fullCtx, viewport, intent: "print" }).promise;
        // Real bug fixed 2026-10-02: getOrRenderPage's page-preview flow
        // needs an optional highlight rectangle drawn on the page (the
        // candidate region it's previewing) - the OLD standalone
        // drawBoundingBoxOverlay helper (hardware-schedule-candidates.js)
        // tried to do this with `new OffscreenCanvas(...)` in the bare
        // Workers isolate, which doesn't have it at all (confirmed live:
        // "ReferenceError: OffscreenCanvas is not defined"). Drawing it
        // HERE instead, inside this function's real headless-browser
        // context (where OffscreenCanvas genuinely exists), avoids that
        // entirely - same real rendering pass, not a second broken one.
        if (overlayArg && overlayArg.box) {
          let ob = overlayArg.box;
          if (typeof ob.x_percent === "number") {
            ob = { x: ob.x_percent * fullW, y: ob.y_percent * fullH, width: ob.width_percent * fullW, height: ob.height_percent * fullH };
          } else if (ob.unit === "pdf_points_72dpi") {
            // Raw x/y/width/height with no enforced DPI convention from
            // whatever caller created the candidate - scale2 (this
            // function's own render scale, e.g. 600/72 at the default
            // dpi=600) converts real PDF-point coordinates into this
            // render's actual pixel space, matching the one real
            // precedent for this field (the old, never-successfully-
            // exercised overlay code used the same 600/72 assumption).
            ob = { x: ob.x * scale2, y: ob.y * scale2, width: ob.width * scale2, height: ob.height * scale2 };
          }
          fullCtx.strokeStyle = overlayArg.color || "#6B7280";
          fullCtx.lineWidth = 4;
          fullCtx.setLineDash([15, 10]);
          fullCtx.strokeRect(ob.x, ob.y, ob.width, ob.height);
          fullCtx.fillStyle = (overlayArg.color || "#6B7280") + "1A";
          fullCtx.fillRect(ob.x, ob.y, ob.width, ob.height);
        }
        const x = Math.max(0, Math.min(Math.floor(bbox.x), fullW - 1));
        const y = Math.max(0, Math.min(Math.floor(bbox.y), fullH - 1));
        const w = Math.max(10, Math.min(Math.floor(bbox.width), fullW - x));
        const h = Math.max(10, Math.min(Math.floor(bbox.height), fullH - y));
        let outW = w;
        let outH = h;
        const MAX_DIM = 7900;
        if (outW > MAX_DIM || outH > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / outW, MAX_DIM / outH);
          outW = Math.floor(outW * ratio);
          outH = Math.floor(outH * ratio);
        }
        const cropCanvas = new OffscreenCanvas(outW, outH);
        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.fillStyle = "#FFFFFF";
        cropCtx.fillRect(0, 0, outW, outH);
        cropCtx.drawImage(fullCanvas, x, y, w, h, 0, 0, outW, outH);
        let outCanvas = cropCanvas;
        if (viewRot === 90 || viewRot === 180 || viewRot === 270) {
          const rW = viewRot === 180 ? outW : outH;
          const rH = viewRot === 180 ? outH : outW;
          outCanvas = new OffscreenCanvas(rW, rH);
          const rctx = outCanvas.getContext("2d");
          rctx.fillStyle = "#FFFFFF";
          rctx.fillRect(0, 0, rW, rH);
          rctx.translate(rW / 2, rH / 2);
          rctx.rotate(viewRot * Math.PI / 180);
          rctx.drawImage(cropCanvas, -outW / 2, -outH / 2);
        }
        const B64_BUDGET = 66e5;
        let blob = await outCanvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
        if (blob.size * 1.34 > B64_BUDGET) {
          for (const q of [0.78, 0.65, 0.55]) {
            blob = await outCanvas.convertToBlob({ type: "image/jpeg", quality: q });
            if (blob.size * 1.34 <= B64_BUDGET)
              break;
          }
        }
        while (blob.size * 1.34 > B64_BUDGET && outCanvas.width > 1200) {
          const sw = Math.floor(outCanvas.width * 0.85), sh = Math.floor(outCanvas.height * 0.85);
          const sc = new OffscreenCanvas(sw, sh);
          const sctx = sc.getContext("2d");
          sctx.fillStyle = "#FFFFFF";
          sctx.fillRect(0, 0, sw, sh);
          sctx.drawImage(outCanvas, 0, 0, sw, sh);
          outCanvas = sc;
          blob = await outCanvas.convertToBlob({ type: "image/jpeg", quality: 0.65 });
        }
        const ab = await blob.arrayBuffer();
        const u8 = new Uint8Array(ab);
        let bin = "";
        for (let i = 0; i < u8.length; i += 8192) {
          bin += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + 8192, u8.length)));
        }
        doc.destroy();
        return {
          imageBase64: btoa(bin),
          width: outCanvas.width,
          height: outCanvas.height,
          fullPageWidth: fullW,
          fullPageHeight: fullH,
          clampedX: x,
          clampedY: y,
          wasClamped: x !== bbox.x || y !== bbox.y || w !== bbox.width || h !== bbox.height
        };
      } catch (err) {
        return { error: err.message || String(err) };
      }
    }, pdfBase64, pdfUrl, pageNumber, boundingBox, SCALE, overlay);
    if (result.error) {
      throw new Error("Browser rendering failed: " + result.error);
    }
    const imgBinary = atob(result.imageBase64);
    const imgBytes = new Uint8Array(imgBinary.length);
    for (let i = 0; i < imgBinary.length; i++) {
      imgBytes[i] = imgBinary.charCodeAt(i);
    }
    const imageBuffer = imgBytes.buffer;
    const renderTime = Date.now() - startTime;
    const fileSizeKB = (imageBuffer.byteLength / 1024).toFixed(1);
    console.log("[Region Renderer 600DPI] COMPLETE via Browser Rendering: " + result.width + "x" + result.height + "px, " + fileSizeKB + "KB, " + renderTime + "ms");
    return {
      imageBuffer,
      width: result.width,
      height: result.height,
      dpi: DPI,
      pageNumber,
      originalBoundingBox: boundingBox,
      clampedBoundingBox: { x: result.clampedX, y: result.clampedY, width: result.width, height: result.height },
      wasClamped: result.wasClamped,
      renderTimeMs: renderTime,
      fileSizeBytes: imageBuffer.byteLength
    };
  } finally {
    await browser.close();
  }
}
