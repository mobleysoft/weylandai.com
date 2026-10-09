import http from "node:http";
// g036 check: the deploy-propagation case: the page is served, the set's API route is not there yet.
http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/sightx/sets/")) { res.writeHead(404, { "content-type": "text/html" }); return res.end("<!doctype html><title>Not Found</title>"); }
  const r = await fetch((process.env.UPSTREAM || "http://127.0.0.1:8801") + req.url, { headers: { accept: req.headers.accept || "*/*" } });
  const h = {}; r.headers.forEach((v, k) => { if (!/content-encoding|content-length|transfer-encoding/.test(k)) h[k] = v; });
  res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8802, "127.0.0.1");
