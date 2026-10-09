// Serve the exact assets SubX ships. No service credentials, mocked OCR, or expected rows.
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const assets = fileURLToPath(new URL("../../../weyland-subx-worker/assets/client-ocr/", import.meta.url));
// Every shipped client-OCR module (assets/client-ocr/<name>.mjs.bin) is served as /<name>.mjs, plus the runner page,
// so a new module (schedule-workspace.mjs, 2026-10-09) never 404s here while the Worker serves it fine.
const names = Object.fromEntries([
  ...readdirSync(assets).filter((f) => f.endsWith(".mjs.bin")).map((f) => [f.slice(0, -4), f]),
  ["grid-runner.html", "grid-runner.html"],
  // The OCR engine's binaries keep the Worker route's public names (src/routes/hardware-schedule-client-ocr-assets.js).
  ["tesseract-core.wasm", "tesseract-core.bin"], ["tesseract-core-fallback.wasm", "tesseract-core-fallback.bin"],
  ["eng-traineddata.bin", "eng-traineddata.bin"],
]);
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
