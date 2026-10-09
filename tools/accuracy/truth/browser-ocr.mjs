// Serve the exact assets SubX ships. No service credentials, mocked OCR, or expected rows.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const assets = fileURLToPath(new URL("../../../weyland-subx-worker/assets/client-ocr/", import.meta.url));
const names = {
  "pdf.mjs": "pdf.mjs.bin", "pdf-worker.mjs": "pdf-worker.mjs.bin",
  "tesseract-wasm-lib.mjs": "tesseract-wasm-lib.mjs.bin",
  "tesseract-core.wasm": "tesseract-core.bin", "tesseract-core-fallback.wasm": "tesseract-core-fallback.bin",
  "eng-traineddata.bin": "eng-traineddata.bin",
  "schedule-grid-extraction-client.mjs": "schedule-grid-extraction-client.mjs.bin",
  "schedule-text-layer.mjs": "schedule-text-layer.mjs.bin", "grid-runner.html": "grid-runner.html",
};
export async function serveOcrAssets({ files = {}, html = "", onResult } = {}) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost"), name = url.pathname.split("/").pop();
    if (url.pathname === "/" && html) { res.setHeader("Content-Type", "text/html"); res.end(html); return; }
    if (url.pathname === "/result" && req.method === "POST" && onResult) {
      if (req.headers.origin !== "http://127.0.0.1:" + server.address().port) { res.writeHead(403); res.end(); return; }
      const chunks = []; let n = 0;
      for await (const c of req) { n += c.length; if (n > 4e6) { res.writeHead(413); res.end(); return; } chunks.push(c); }
      try { const result = JSON.parse(Buffer.concat(chunks)); res.end("saved"); onResult(result); }
      catch (_) { res.writeHead(400); res.end(); }
      return;
    }
    if (files[name]) { res.setHeader("Content-Type", "application/pdf"); res.end(readFileSync(files[name])); return; }
    if (!names[name]) { res.writeHead(404); res.end(); return; }
    res.setHeader("Content-Type", name.endsWith(".mjs") ? "text/javascript" : name.endsWith(".wasm") ? "application/wasm" : name.endsWith(".html") ? "text/html" : "application/octet-stream");
    const data = readFileSync(assets + names[name]);
    res.end(/^pdf(-worker)?\.mjs$/.test(name) ? Buffer.concat([readFileSync(assets + "pdfjs-compat.js.bin"), Buffer.from("\n"), data]) : data);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return { base: "http://127.0.0.1:" + server.address().port,
    close: () => new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); }) };
}
