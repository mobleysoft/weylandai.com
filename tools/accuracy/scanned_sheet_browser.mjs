#!/usr/bin/env node
// Browser regression for g019: exact shipped grid-runner + pdf.js + Tesseract, vector versus scan.
// node tools/accuracy/scanned_sheet_browser.mjs [--manual]
// --manual: open the printed localhost URL in a browser; otherwise use Playwright Chromium.
// PLAYWRIGHT_CORE / CHROMIUM_PATH select an existing test browser installation.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { serveOcrAssets } from "./truth/browser-ocr.mjs";
import { scoreDoorsVs } from "./truth/agree.mjs";
import { mapResult } from "./truth/reader_a.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const expected = JSON.parse(readFileSync(root + "tools/bidset/out/truth-doors.json"));
const pageNumber = expected.source.pages[0];
const files = Object.fromEntries(["vector", "scanned"].map(v => [v + ".pdf", root + "tools/bidset/out/weylandai-building-bidset" + (v === "scanned" ? "-scanned" : "") + ".pdf"]));
let finish;
const resultPromise = new Promise(resolve => { finish = resolve; });
const html = `<!doctype html><meta charset="utf-8"><title>g019 browser OCR evidence</title>
<style>body{font:16px system-ui;margin:40px;max-width:1000px}pre{white-space:pre-wrap}iframe{display:none}</style>
<h1>Full-sheet door schedule OCR</h1><p>Reading the vector sheet and the sideways scanned sheet through SubX's shipped browser runner.</p><pre id="status">Loading…</pre>
<iframe id="runner" src="/api/hardware-schedule/client-ocr-assets/grid-runner.html"></iframe>
<script type="module">
const status=document.getElementById('status'), frame=document.getElementById('runner');
const results=[];
try {
  await new Promise((resolve,reject)=>{const t=setInterval(()=>{if(frame.contentWindow.__gridRunnerReady){clearInterval(t);resolve();}},100);setTimeout(()=>{clearInterval(t);reject(new Error('runner load timeout'));},30000);});
  for(const variant of ['vector','scanned']) {
    status.textContent+='\\nReading '+variant+' page ${pageNumber}…';
    const bytes=new Uint8Array(await(await fetch('/'+variant+'.pdf')).arrayBuffer());
    const grid=await import('/api/hardware-schedule/client-ocr-assets/schedule-grid-extraction-client.mjs?v=20261009g019');
    const lib=await grid.loadPdfJs(), doc=await lib.getDocument({data:bytes.slice()}).promise;
    const pg=await doc.getPage(${pageNumber}), text=await pg.getTextContent();
    const vp=pg.getViewport({scale:1});
    await doc.destroy();
    await frame.contentWindow.__loadPdf('/'+variant+'.pdf');
    const r=await frame.contentWindow.__runGrid({cached:true},${pageNumber},'door_schedule',{});
    results.push({variant,text_items:text.items.length,width:vp.width,height:vp.height,...r});
    status.textContent+='\\n'+variant+': '+(r.result?.doors?.length||0)+' doors in '+Math.round(r.ms/1000)+' s';
  }
  await fetch('/result',{method:'POST',body:JSON.stringify({user_agent:navigator.userAgent,results})});
  status.textContent+='\\nEvidence saved.';
} catch(e) {status.textContent+='\\nERROR: '+e.message;await fetch('/result',{method:'POST',body:JSON.stringify({error:e.message,results})});}
</script>`;
const server = await serveOcrAssets({ files, html, onResult: finish });
let browser, timer;
try {
  console.log("Browser verification: " + server.base);
  if (!process.argv.includes("--manual")) {
    const pwMod = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
const { chromium } = pwMod.chromium ? pwMod : pwMod.default; // a file-path import of playwright-core puts the API on default
    browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const page = await browser.newPage(); await page.goto(server.base);
  }
  const r = await Promise.race([resultPromise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("browser verification timed out")), 15 * 60e3); })]);
  const variants = (r.results || []).map(v => {
    const doors = mapResult({schedule_type:"door_schedule",result:v.result},"door_schedule").doors || [];
    return { ...v, score: scoreDoorsVs(expected, doors.map(d => ({page:pageNumber,...d}))) };
  });
  const scan=variants.find(v=>v.variant==='scanned'), vector=variants.find(v=>v.variant==='vector');
  const marks=v=>(v?.result?.doors||[]).map(d=>d.door_number).sort();
  const pass=!r.error && variants.length===2 && variants.every(v=>v.ok && v.score.rows_found===expected.doors.length && v.score.extra_rows===0)
    && scan.text_items===0 && Math.max(scan.width,scan.height)>=2592
    && scan.result.metadata.extraction_mode!=='text_layer' && JSON.stringify(marks(scan))===JSON.stringify(marks(vector));
  const assets=["schedule-grid-extraction-client.mjs.bin","schedule-text-layer.mjs.bin"].map(name=>({name,sha256:createHash("sha256").update(readFileSync(root+"weyland-subx-worker/assets/client-ocr/"+name)).digest("hex")}));
  const report={at:new Date().toISOString(),pass,browser:r.user_agent,error:r.error,assets,variants};
  const out=root+"tools/accuracy/g019-browser.json";writeFileSync(out,JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({pass,variants:variants.map(v=>({variant:v.variant,text_items:v.text_items,ms:v.ms,score:v.score,metadata:v.result?.metadata})),report:out},null,2));
  if(!pass)process.exitCode=1;
} finally { clearTimeout(timer); if(browser)await browser.close(); await server.close(); }
