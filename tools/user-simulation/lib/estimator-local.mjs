// Local source server for the g018 browser probe. No production API or email.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
export async function estimatorLocalServer() {
  const writes = [];
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost'), p = url.pathname;
    const json = (data, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (req.method !== 'GET') writes.push({ method: req.method, path: p });
    try {
      if (p.startsWith('/api/hardware-schedule/client-ocr-assets/')) {
        const name = path.basename(p), base = path.join(root, 'weyland-subx-worker/assets/client-ocr');
        const aliases = { 'tesseract-core.wasm': 'tesseract-core.bin', 'tesseract-core-fallback.wasm': 'tesseract-core-fallback.bin', 'eng-traineddata.bin': 'eng-traineddata.bin' };
        let body = await readFile(path.join(base, aliases[name] || name + '.bin'));
        if (/^pdf(?:-worker)?\.mjs$/.test(name)) body = Buffer.concat([await readFile(path.join(base, 'pdfjs-compat.js.bin')), Buffer.from('\n'), body]);
        res.writeHead(200, { 'content-type': name.endsWith('.mjs') ? 'text/javascript' : name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' }); res.end(body); return;
      }
      if (p === '/api/hardware-schedule/sessions') return json({ success: true, signed_in: false, sessions: [] });
      if (p === '/api/auth/ephemeral') return json({ token: 'local-guest-probe' });
      if (p === '/api/auth/session/check') return json({ valid: false });
      if (p === '/api/auth/me') return json({ error: 'signed out' }, 401);
      if (p === '/api/cut-sheets/match-batch') return json({ summary: { matched: 1, total: 1 }, results: [{ matched: true, raw: 'LCN 4040XP', product: { model: '4040XP', manufacturer: 'LCN', name: '4040XP closer' }, confidence: 'high', matchType: 'exact' }] });
      if (p.startsWith('/api/')) return json({ success: true, items: [], sessions: [], results: [] });
      let file = p === '/' ? 'index.html' : /^\/subx(?:-app)?\/?$|^\/takeoffx\/?$/.test(p) ? 'weyland-subx-worker/src/pages/subx-app.html' : p.slice(1);
      const absolute = path.resolve(root, file);
      if (!absolute.startsWith(root)) return json({}, 403);
      const body = await readFile(absolute);
      res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : file.endsWith('.js') || file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); res.end(body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { base: 'http://127.0.0.1:' + server.address().port, writes, close: () => new Promise(resolve => server.close(resolve)) };
}
