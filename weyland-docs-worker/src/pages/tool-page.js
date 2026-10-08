// weyland-docs-worker/src/pages/tool-page.js
//
// One page renderer for the six document tools (the monolith had six copies of
// the same page in src/lib/marketing-pages.js). Same look, plus what the
// 7 October audits asked for: results on screen with page numbers (flagged
// lines, sections, sheets, the diff heatmap), progress while a long document
// is read in page jobs, a sign-in that opens in the single-page shell (no page
// hop), and a sign-in / plan probe that is a GET, not an empty POST.

export const PAGES = {
  inspecx: { api: "inspections", mark: "IX", name: "InspecX", eyebrow: "INSPECTION REPORT PROCESSOR", price: "$199/mo",
    blurb: "Upload an inspection report PDF. Pages with a text layer are read directly; scanned pages are OCR'd on our own worker (PDFium + Tesseract, no outside service). Lines that name a deficiency are listed with their page.",
    caveat: "Flagging is by word list (leaking, broken, not working, out of service, cracks, damaged, deficiency ...), not an AI reading for meaning. Review the source document for anything it might miss.",
    fields: [["projectName", "PROJECT NAME", "text", ""], ["inspectionType", "INSPECTION TYPE", "text", "e.g. Fire/Life Safety"], ["inspectorName", "INSPECTOR", "text", ""], ["inspectionDate", "INSPECTION DATE", "date", ""]],
    files: [["file", "INSPECTION REPORT (PDF)"]], stats: [["pageCount", "PAGES"], ["passCount", "PASS LINES"], ["failCount", "FLAGGED"]], list: "flagged" },
  safetyx: { api: "safety-reports", mark: "SX", name: "SafetyX", eyebrow: "SAFETY REPORT PROCESSOR", price: "$199/mo",
    blurb: "Upload a safety report, incident narrative or daily log PDF. Lines that describe an incident, a hazard, a fall, or protection that was not used are listed with their page.",
    caveat: "Flagging is by word list (incident, injury, hazard, fell, fall protection, not used, died, struck by ...), not an AI reading for meaning. Review the source document for anything it might miss.",
    fields: [["projectName", "PROJECT NAME", "text", ""], ["reportType", "REPORT TYPE", "text", "e.g. Incident, Daily Log"], ["reportedBy", "REPORTED BY", "text", ""], ["reportDate", "REPORT DATE", "date", ""]],
    files: [["file", "SAFETY REPORT (PDF)"]], stats: [["pageCount", "PAGES"], ["incidentCount", "FLAGGED"], ["clearCount", "CLEAR LINES"]], list: "flagged" },
  survx: { api: "survey-reports", mark: "VX", name: "SurvX", eyebrow: "SITE SURVEY DATA PROCESSOR", price: "$199/mo",
    blurb: "Upload a site, condition or dilapidation survey PDF. Lines that record a defect or an unresolved condition (cracks, damage, lifted, poor, discrepancy, encroachment, field verify) are listed with their page.",
    caveat: "Flagging is by word list, not an AI reading for meaning. Review the source document for anything it might miss.",
    fields: [["projectName", "PROJECT NAME", "text", ""], ["surveyType", "SURVEY TYPE", "text", "e.g. Condition, Boundary, ALTA"], ["surveyorName", "SURVEYOR", "text", ""], ["surveyDate", "SURVEY DATE", "date", ""]],
    files: [["file", "SURVEY REPORT (PDF)"]], stats: [["pageCount", "PAGES"], ["flaggedCount", "FLAGGED"], ["clearCount", "VERIFIED LINES"]], list: "flagged" },
  specx: { api: "spec-sections", mark: "PX", name: "SpecX", eyebrow: "SPEC SECTION INDEX", price: "$149/mo",
    blurb: "Upload a project manual or spec book PDF. Every CSI section whose header or page footers are in the book is indexed with its page and length; numbers that are only referenced are listed apart.",
    caveat: "A section index and length check, not a code-compliance review.",
    fields: [["projectName", "PROJECT NAME", "text", ""], ["specDate", "SPEC DATE", "date", ""]],
    files: [["file", "SPECIFICATION (PDF)"]], stats: [["pageCount", "PAGES"], ["sectionCount", "SECTIONS"], ["shortCount", "SHORT"]], list: "sections" },
  drawx: { api: "drawing-index", mark: "DX", name: "DrawX", eyebrow: "DRAWING SET SHEET INDEX", price: "$399/mo",
    blurb: "Upload a drawing set PDF (full-size sheets are fine). The sheet number and title are read from each page's title block and the cover-sheet index; a page whose title block cannot be read is listed without a number, never a guess.",
    caveat: "A sheet index from title-block text, not drawing content analysis.",
    fields: [["projectName", "PROJECT NAME", "text", ""], ["drawingSetDate", "DRAWING SET DATE", "date", ""]],
    files: [["file", "DRAWING SET (PDF)"]], stats: [["pageCount", "PAGES"], ["sheetCount", "SHEETS"]], list: "sheets" },
  asbuiltx: { api: "asbuilt-diffs", mark: "AX", name: "AsBuiltX", eyebrow: "ORIGINAL VS AS-BUILT DIFF", price: "$199/mo",
    blurb: "Upload the original sheet and the as-built sheet (one page each, full-size sheets are fine). The two renders are compared cell by cell and the differences shown as a heatmap.",
    caveat: "A pixel difference map, not redline or markup recognition. Scan misalignment and scale differences also show up.",
    fields: [["projectName", "PROJECT NAME", "text", ""], ["sheetLabel", "SHEET", "text", "e.g. A-101"], ["page", "PAGE", "number", "1"]],
    files: [["original", "ORIGINAL (PDF)"], ["revised", "AS-BUILT (PDF)"]], stats: [["overallDiffPercent", "% DIFFERENT"]], list: "heatmap" },
};
export const PAGE_SLUGS = Object.keys(PAGES);

const NAV = [["/", "HOME"], ["/inspecx", "INSPECX"], ["/safetyx", "SAFETYX"], ["/survx", "SURVX"], ["/specx", "SPECX"], ["/drawx", "DRAWX"], ["/asbuiltx", "ASBUILTX"], ["/pricing", "PRICING"]];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = [
  ":root{--bg:#090a0d;--panel:#121419;--panel2:#181b21;--line:#2c3139;--text:#edf0f1;--muted:#9299a3;--gold:#f0b800;--green:#61dfa0;--blue:#66d4ff;--red:#ff756e;--primary:#2a52ff}",
  "*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:\"Avenir Next\",\"Helvetica Neue\",sans-serif}",
  ".shell{position:relative;max-width:980px;margin:auto;padding:20px clamp(16px,3vw,40px) 60px}",
  "header{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:18px;flex-wrap:wrap}",
  ".brand{display:flex;align-items:center;gap:12px;color:var(--text);text-decoration:none}",
  ".mark{width:42px;height:42px;display:grid;place-items:center;background:var(--primary);color:var(--bg);font-weight:900}",
  ".brand b{display:block;letter-spacing:.16em}.brand small{display:block;color:var(--muted);font:700 9px/1.5 ui-monospace,monospace;letter-spacing:.11em}",
  ".nav{display:flex;gap:8px;flex-wrap:wrap}",
  ".nav a,.button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;color:var(--text);text-decoration:none;background:transparent;font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;transition:all .2s}",
  ".nav a:hover,.button:hover{border-color:var(--primary);color:var(--primary)}.nav a.current{border-color:var(--primary);color:var(--primary)}",
  ".button.primary{background:var(--primary);border-color:var(--primary);color:var(--bg);font-weight:900}.button:disabled{opacity:.5;cursor:not-allowed}",
  ".titlebar{margin:22px 0 22px}.eyebrow{color:var(--primary);font:800 11px/1 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase}",
  ".titlebar h1{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.04em;margin:12px 0}.titlebar p{max-width:680px;color:var(--muted);line-height:1.6;margin:0;font-size:15px}",
  ".titlebar .caveat{margin-top:10px;color:var(--gold);font-size:12.5px}",
  ".card{background:rgba(18,20,25,.94);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:18px}",
  ".form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}",
  "label{display:block;color:var(--muted);font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;margin-bottom:8px}",
  "input{width:100%;padding:11px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;font-family:inherit}input:focus{outline:none;border-color:var(--blue)}",
  ".step-log{margin-top:14px;color:var(--muted);font-size:13px}.step-log .ok{color:var(--green)}.step-log .err{color:var(--red)}",
  ".note-card{color:var(--muted);font-size:14px;line-height:1.6}.note-card code{background:#161920;padding:2px 6px;border-radius:4px;color:var(--primary);font-size:13px}",
  ".result-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}.stat-row{display:flex;gap:20px;color:var(--muted);font-size:13px;flex-wrap:wrap}.stat-row b{color:var(--text);font-size:18px;display:block}",
  ".list{margin:16px 0 0;padding:0;list-style:none}.list li{padding:8px 0;border-top:1px solid var(--line);font-size:13px;line-height:1.5;display:flex;gap:12px}",
  ".pg{flex:0 0 auto;min-width:44px;text-align:center;border:1px solid var(--line);border-radius:6px;padding:2px 6px;color:var(--muted);font:700 10px/1.6 ui-monospace,monospace}",
  "table{width:100%;border-collapse:collapse;font-size:13px;margin-top:14px}th{text-align:left;font:750 10px/1 ui-monospace,monospace;letter-spacing:.08em;color:var(--muted);padding:8px 6px;border-bottom:1px solid var(--line)}td{padding:8px 6px;border-bottom:1px solid #1d2026;vertical-align:top}td.short{color:var(--gold)}td.none{color:var(--muted)}",
  ".heat{position:relative;width:100%;max-width:640px;border:1px solid var(--line);background:#fafaf8;margin-top:14px}",
  ".progress{height:6px;background:var(--panel2);border-radius:3px;overflow:hidden;margin-top:10px}.progress i{display:block;height:100%;background:var(--primary);width:0;transition:width .4s}",
  ".sub{color:var(--muted);font-size:12px;margin-top:10px;line-height:1.6}",
  "@media (max-width:640px){.nav{display:none}.shell{padding-top:14px}}",
].join("\n");

// Shared client script, built by concatenation (no template literals).
const SCRIPT = [
  "(function(){",
  "var T=window.DOCS_TOOL;var $=function(id){return document.getElementById(id)};",
  "var embedded=false;try{embedded=window.self!==window.top}catch(e){embedded=true}",
  "function parentShell(){try{return embedded&&window.parent&&window.parent.WeylandShell?window.parent.WeylandShell:null}catch(e){return null}}",
  "function shell(){return parentShell()||window.WeylandShell||null}",
  "function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}",
  "var ready=embedded?Promise.resolve():(window.WeylandShell?Promise.resolve():loadScript('/assets/weyland-shell.js')).catch(function(){});",
  "function signIn(){return ready.then(function(){var s=shell();if(s)return s.open('signin',embedded?{continueTo:'/'+T.slug}:{});location.href='/login?redirect=/'+T.slug})}",
  "if(embedded){document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a||a.target||a.hasAttribute('download'))return;var u;try{u=new URL(a.getAttribute('href'),location.href)}catch(err){return}if(u.origin!==location.origin)return;e.preventDefault();var p=parentShell();if(u.pathname==='/'){if(p)p.close();else location.href='/';return}if(p)p.open('app',{path:u.pathname+u.search});else location.href=u.pathname+u.search})}",
  "function token(){try{return localStorage.getItem('_authfor_token')||''}catch(e){return ''}}",
  "function headers(){var t=token();return t?{'Authorization':'Bearer '+t}:{}}",
  "function esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}",
  "var log=$('log');function logLine(msg,cls){var d=document.createElement('div');if(cls)d.className=cls;d.textContent=msg;log.appendChild(d);return d}",
  "function errText(d,status){var e=d&&d.error;if(e&&typeof e==='object')return e.message||e.code||('HTTP '+status);return (e?e+(d.details?' - '+d.details:''):'')||('HTTP '+status)}",
  "function stats(data){$('stats').innerHTML=T.stats.map(function(s){var v=data[s[0]];return '<div><b>'+esc(v==null?'-':v)+(s[0]==='overallDiffPercent'?'%':'')+'</b>'+esc(s[1])+'</div>'}).join('')}",
  "function renderList(data){var out='';",
  " if(T.list==='flagged'){var f=data.flagged||[];out=f.length?'<ul class=\"list\">'+f.map(function(x){return '<li><span class=\"pg\">p.'+esc(x.page)+'</span><span>'+esc(x.line)+'</span></li>'}).join('')+'</ul>':'<p class=\"sub\">No lines matched the word list. The pages were read ('+esc(data.textLayerPages||0)+' from the text layer, '+esc(data.ocrPages||0)+' by OCR).</p>'}",
  " else if(T.list==='sections'){var s=data.sections||[];out=s.length?'<table><thead><tr><th>SECTION</th><th>TITLE</th><th>PAGE</th><th>WORDS</th><th></th></tr></thead><tbody>'+s.map(function(x){return '<tr><td>'+esc(x.number)+'</td><td>'+esc(x.title)+'</td><td>'+esc(x.page)+'</td><td>'+esc(x.wordCount)+'</td><td class=\"short\">'+(x.short?'SHORT':'')+'</td></tr>'}).join('')+'</tbody></table>':'<p class=\"sub\">No SECTION headers or page footers with CSI numbers were found.</p>';var ra=data.referencedAbsent||[];if(ra.length)out+='<p class=\"sub\">'+ra.length+' numbers are referenced in the text but are not sections of this book: '+esc(ra.map(function(r){return r.number}).join(', '))+'</p>'}",
  " else if(T.list==='sheets'){var sh=data.sheets||[];out='<table><thead><tr><th>PAGE</th><th>SHEET</th><th>TITLE</th><th>READ FROM</th></tr></thead><tbody>'+sh.map(function(x){var how={'title-block':'title block','index-title':'index (title)','index-suffix':'index (number)','index-order':'index (order)','sheet-number-label':'SHEET NUMBER label'}[x.how]||'';return '<tr><td>'+esc(x.page)+'</td><td>'+(x.number?esc(x.number):'<span class=\"none\">no sheet number read</span>')+'</td><td>'+esc(x.title||'')+'</td><td class=\"none\">'+esc(how)+'</td></tr>'}).join('')+'</tbody></table>';var ln=data.listedNotFound||[];if(ln.length)out+='<p class=\"sub\">Listed in the cover-sheet index but not found on any page: '+esc(ln.map(function(l){return l.number}).join(', '))+'</p>'}",
  " else if(T.list==='heatmap'){var cd=data.cellDiffs||[];var cols=data.gridCols||24,rows=data.gridRows||32;var cw=100/cols,ch=100/rows;var cells='';for(var y=0;y<cd.length;y++)for(var x=0;x<cd[y].length;x++){var a=Math.min(1,cd[y][x]*3);cells+='<div style=\"position:absolute;left:'+(x*cw).toFixed(3)+'%;top:'+(y*ch).toFixed(3)+'%;width:'+cw.toFixed(3)+'%;height:'+ch.toFixed(3)+'%;background:rgba(168,51,31,'+a.toFixed(3)+')\"></div>'}out='<div class=\"heat\" style=\"aspect-ratio:'+(data.width||4)+'/'+(data.height||3)+'\">'+cells+'</div><p class=\"sub\">Darker cells differ more. Rendered at '+esc(data.rendered&&data.rendered[0]?data.rendered[0].dpi+' dpi':'reduced size')+'.</p>'}",
  " $('list').innerHTML=out}",
  "function showResult(data){stats(data);renderList(data);$('download').href=data.downloadUrl||'#';$('result').style.display='block';logLine('Done - '+(data.documentPages||data.pageCount||'')+' page(s): '+(data.textLayerPages||0)+' from the text layer, '+(data.ocrPages||0)+' by OCR.','ok')}",
  "var pollTimer=null;function poll(url,prog){fetch(url,{headers:headers(),credentials:'same-origin'}).then(function(r){return r.json().then(function(d){return{ok:r.ok,status:r.status,data:d}})}).then(function(res){if(res.status===202){var d=res.data;var pct=d.documentPages?Math.round(100*(d.nextPage-1)/d.documentPages):5;prog.textContent='Reading page '+d.nextPage+(d.documentPages?' of '+d.documentPages:'')+' ('+(d.ocrPages||0)+' OCR so far). Scanned pages take about 15 s each.';$('bar').style.width=pct+'%';pollTimer=setTimeout(function(){poll(url,prog)},3000);return}if(!res.ok){logLine('Error: '+errText(res.data,res.status),'err');$('analyze').disabled=false;return}$('bar').style.width='100%';showResult(res.data);$('analyze').disabled=false}).catch(function(e){logLine('Error: '+e.message,'err');$('analyze').disabled=false})}",
  "$('analyze').addEventListener('click',function(){var btn=$('analyze');log.innerHTML='';$('result').style.display='none';var fd=new FormData();var missing=T.files.filter(function(f){var i=$(f[0]);return !i.files.length});if(missing.length){logLine('Choose a PDF first ('+missing.map(function(f){return f[1]}).join(', ')+').','err');return}T.files.forEach(function(f){fd.append(f[0],$(f[0]).files[0])});T.fields.forEach(function(f){fd.append(f[0],$(f[0]).value.trim())});btn.disabled=true;var prog=logLine('Uploading and reading the document...');$('bar').style.width='2%';fetch('/api/'+T.api+'/analyze',{method:'POST',headers:headers(),body:fd,credentials:'same-origin'}).then(function(r){return r.json().then(function(d){return{ok:r.ok,status:r.status,data:d}})}).then(function(res){if(res.status===202){prog.textContent='Reading page '+res.data.nextPage+(res.data.documentPages?' of '+res.data.documentPages:'')+'...';poll(res.data.statusUrl,prog);return}if(!res.ok){logLine('Error: '+errText(res.data,res.status),'err');btn.disabled=false;return}$('bar').style.width='100%';showResult(res.data);btn.disabled=false}).catch(function(e){logLine('Error: '+e.message,'err');btn.disabled=false})});",
  "$('signin').addEventListener('click',function(e){e.preventDefault();signIn()});",
  "function boot(){fetch('/api/'+T.api+'/access',{headers:headers(),credentials:'same-origin'}).then(function(r){if(r.status===401||r.status===403){$('signin').style.display='inline-block';$('guest').style.display='block';return}if(r.status===402){$('guest').innerHTML='You are signed in, but your plan does not include '+esc(T.name)+' yet. See <code>/pricing</code> to add it.';$('guest').style.display='block';return}if(!r.ok){$('guest').textContent=T.name+' could not check your access (HTTP '+r.status+'). Try again in a moment.';$('guest').style.display='block';return}$('app').style.display='block';$('guest').style.display='none';$('signin').style.display='none'}).catch(function(){$('signin').style.display='inline-block'})}",
  "boot();window.addEventListener('focus',function(){if($('app').style.display!=='block')boot()});",
  "})();",
].join("\n");

export function toolPageHtml(slug) {
  const t = PAGES[slug];
  if (!t) return null;
  const nav = NAV.map((n) => '<a href="' + n[0] + '"' + (n[0] === "/" + slug ? ' class="current"' : "") + ">" + n[1] + "</a>").join("");
  const fields = t.fields.map((f) => "<div><label>" + esc(f[1]) + '</label><input id="' + f[0] + '" type="' + f[2] + '"' + (f[3] ? ' placeholder="' + esc(f[3]) + '"' : "") + (f[2] === "number" ? ' value="1" min="1"' : "") + "></div>").join("");
  const files = t.files.map((f) => '<div style="grid-column:1/-1"><label>' + esc(f[1]) + '</label><input id="' + f[0] + '" type="file" accept="application/pdf"></div>').join("");
  const config = JSON.stringify({ slug, api: t.api, name: t.name, fields: t.fields, files: t.files, stats: t.stats, list: t.list }).replace(/</g, "\\u003c");
  return [
    "<!doctype html>", '<html lang="en">', "<head>", '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width,initial-scale=1">', '<meta name="theme-color" content="#090a0d">',
    "<title>" + esc(t.name) + " | " + esc(t.eyebrow.charAt(0) + t.eyebrow.slice(1).toLowerCase()) + "</title>",
    "<style>" + CSS + "</style>", "</head>", "<body>", '<div class="shell">',
    "<header>", '<a class="brand" href="/"><span class="mark">' + esc(t.mark) + "</span><span><b>" + esc(t.name.toUpperCase()) + "</b><small>" + esc(t.eyebrow) + "</small></span></a>", '<nav class="nav">' + nav + "</nav>", "</header>",
    '<div class="titlebar">', '<div class="eyebrow">' + esc(t.eyebrow) + "</div>", "<h1>" + esc(t.name) + "</h1>", "<p>" + esc(t.blurb) + "</p>", '<p class="caveat">' + esc(t.caveat) + "</p>",
    '<a class="button primary" id="signin" href="/login?redirect=/' + slug + '" style="display:none;margin-top:14px">SIGN IN</a>', "</div>",
    '<div id="app" style="display:none">', '<div class="card">', '<div class="form-grid">' + fields + files + "</div>",
    '<button id="analyze" class="button primary" style="height:42px;margin-top:16px">' + (t.list === "heatmap" ? "COMPARE SHEETS" : "READ DOCUMENT") + "</button>",
    '<div class="progress"><i id="bar"></i></div>', '<div class="step-log" id="log"></div>', "</div>",
    '<div class="card" id="result" style="display:none">', '<div class="result-row">', '<div class="stat-row" id="stats"></div>', '<a id="download" class="button primary" href="#" target="_blank">DOWNLOAD SUMMARY PDF</a>', "</div>", '<div id="list"></div>', "</div>", "</div>",
    '<div class="card note-card" id="guest" style="display:none">' + esc(t.name) + " is sold standalone at " + esc(t.price) + ". See <code>/pricing</code> for licensing, or sign in above if you already have access.</div>",
    "</div>",
    "<script>window.DOCS_TOOL=" + config + ";</script>", "<script>" + SCRIPT + "</script>",
    "</body>", "</html>",
  ].join("\n");
}
