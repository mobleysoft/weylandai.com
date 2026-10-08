// weyland-docs-worker/src/pages/safety-log-page.js
//
// /safetyx/log (2026-10-08): the account's safety record across every report
// SafetyX has read. Four views: OVERVIEW (hazards by OSHA category, Focus Four
// share, injuries, open and overdue actions), FINDINGS (each flagged line with
// its hazard, the 29 CFR 1926 standard and a 1904.7 recording hint, one click
// to a corrective action or an OSHA 300 case), ACTIONS (owner, due date,
// close-out, CSV) and OSHA 300 (the year's log, the 300A totals, the forms as
// a PDF). API: routes/safety-log.js.

import { CSS, NAV } from "./tool-page.js";

const PAGE_CSS = [
  ".tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}.tabs button{border:1px solid var(--line);border-radius:99px;padding:9px 14px;background:transparent;color:var(--text);font:750 10px/1 ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}",
  ".tabs button.on{border-color:var(--primary);color:var(--primary)}",
  ".kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}.kpis div{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px;color:var(--muted);font-size:11px}.kpis b{display:block;color:var(--text);font-size:22px;margin-bottom:4px}",
  ".bar{display:flex;align-items:center;gap:10px;margin:6px 0;font-size:13px}.bar span.l{flex:0 0 210px}.bar i{display:block;height:10px;border-radius:5px;background:var(--primary)}.bar i.ff{background:var(--red)}.bar em{color:var(--muted);font-style:normal;font-size:12px}",
  ".chip{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:2px 8px;font:700 10px/1.5 ui-monospace,monospace;margin-right:6px;white-space:nowrap}.chip.ff{border-color:var(--red);color:var(--red)}.chip.rec{border-color:var(--gold);color:var(--gold)}.chip.ok{border-color:var(--green);color:var(--green)}",
  ".find{border-top:1px solid var(--line);padding:10px 0;font-size:13px;line-height:1.5}.find .meta{margin-top:6px;color:var(--muted);font-size:11.5px}.find .btns{margin-top:6px;display:flex;gap:8px;flex-wrap:wrap}",
  ".mini{border:1px solid var(--line);border-radius:99px;padding:5px 10px;background:transparent;color:var(--text);font:700 9.5px/1 ui-monospace,monospace;cursor:pointer}.mini:hover{border-color:var(--primary);color:var(--primary)}",
  "select,textarea{width:100%;padding:10px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:14px;font-family:inherit}",
  ".rpt{margin-top:18px;font:800 11px/1.4 ui-monospace,monospace;letter-spacing:.06em;color:var(--blue)}",
  ".err{color:var(--red)}.okc{color:var(--green)}.pay{border:1px solid var(--gold);border-radius:10px;padding:12px;margin-top:12px;color:var(--gold);font-size:13px}",
].join("\n");

// ES5 client script, built by concatenation (no template literals).
const SCRIPT = [
  "(function(){",
  "var $=function(id){return document.getElementById(id)};",
  "function token(){try{return localStorage.getItem('_authfor_token')||''}catch(e){return ''}}",
  "function H(json){var h={};var t=token();if(t)h.Authorization='Bearer '+t;if(json)h['Content-Type']='application/json';return h}",
  "function esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}",
  "function api(path,opt){opt=opt||{};return fetch('/api/safety-reports/'+path,{method:opt.method||'GET',headers:H(!!opt.body),credentials:'same-origin',body:opt.body?JSON.stringify(opt.body):undefined}).then(function(r){return r.json().catch(function(){return{}}).then(function(d){d._status=r.status;return d})})}",
  "var S={reports:[],tab:'overview',year:new Date().getFullYear()};",
  "function signIn(){location.href='/login?redirect=/safetyx/log'}",
  "function tab(t){S.tab=t;['overview','findings','actions','osha'].forEach(function(k){$('v-'+k).style.display=k===t?'block':'none';$('t-'+k).className=k===t?'on':''});if(t==='overview')loadTrends();if(t==='findings')loadReports();if(t==='actions')loadActions();if(t==='osha')loadCases()}",
  "function guard(d){if(d._status===401){$('app').style.display='none';$('guest').style.display='block';return true}return false}",
  "function payMsg(d,el){el.innerHTML='<div class=\"pay\">'+esc(d.message||'This export needs a plan.')+' <a href=\"/pricing\" style=\"color:inherit\">See plans</a> or the $100 first submittal on the home page.</div>'}",
  // OVERVIEW
  "function loadTrends(){api('trends').then(function(d){if(guard(d))return;var k=[[d.reports,'REPORTS READ'],[d.total,'FLAGGED FINDINGS'],[d.focusFourShare+'%','OSHA FOCUS FOUR'],[d.injuries,'INJURIES NAMED'],[d.recordableHints,'LIKELY RECORDABLE'],[d.nearMisses,'NEAR MISSES'],[d.openActions,'OPEN ACTIONS'],[d.overdueActions,'OVERDUE'],[d.casesThisYear,'OSHA CASES THIS YEAR']];",
  " $('kpis').innerHTML=k.map(function(x){return '<div><b>'+esc(x[0])+'</b>'+esc(x[1])+'</div>'}).join('');",
  " var max=Math.max.apply(null,(d.hazards||[]).map(function(h){return h.n}).concat([1]));",
  " $('hz').innerHTML=(d.hazards||[]).length?(d.hazards||[]).map(function(h){return '<div class=\"bar\"><span class=\"l\">'+esc(h.label)+(h.focusFour?' <span class=\"chip ff\">FOCUS FOUR</span>':'')+'</span><i class=\"'+(h.focusFour?'ff':'')+'\" style=\"width:'+Math.max(4,Math.round(300*h.n/max))+'px\"></i><em>'+h.n+'</em></div>'}).join(''):'<p class=\"sub\">No findings yet. Read a safety report on <a href=\"/safetyx\" style=\"color:var(--blue)\">SafetyX</a> and it shows up here.</p>';",
  " $('months').innerHTML=(d.months||[]).length?'<table><thead><tr><th>MONTH</th><th>FINDINGS</th><th>TOP HAZARD</th></tr></thead><tbody>'+d.months.slice(-12).reverse().map(function(m){var top=Object.keys(m.byHazard).sort(function(a,b){return m.byHazard[b]-m.byHazard[a]})[0];var lab=((d.hazards||[]).filter(function(h){return h.key===top})[0]||{}).label||top;return '<tr><td>'+esc(m.month)+'</td><td>'+m.total+'</td><td>'+esc(lab)+'</td></tr>'}).join('')+'</tbody></table>':'';",
  " $('projects').innerHTML=(d.projects||[]).length?'<table><thead><tr><th>PROJECT</th><th>FINDINGS</th></tr></thead><tbody>'+d.projects.slice(0,15).map(function(p){return '<tr><td>'+esc(p.project)+'</td><td>'+p.n+'</td></tr>'}).join('')+'</tbody></table>':''})}",
  // FINDINGS
  "function loadReports(){api('reports').then(function(d){if(guard(d))return;S.reports=d.reports||[];var only=$('f-only').value;var out='';S.reports.forEach(function(r,ri){var fl=r.flagged.filter(function(f){return only==='all'||(only==='ff'&&f.hazard.focusFour)||(only==='inj'&&f.outcome&&f.outcome.outcome!=='near_miss')||(only==='open'&&!(f.action))});if(!fl.length)return;",
  "  out+='<div class=\"rpt\">'+esc(r.date||'')+' · '+esc(r.project||'(no project)')+' · '+esc(r.type||'report')+(r.reportedBy?' · '+esc(r.reportedBy):'')+'</div>';",
  "  fl.forEach(function(f){var fi=r.flagged.indexOf(f);var o=f.outcome;out+='<div class=\"find\"><span class=\"pg\" style=\"display:inline-block;margin-right:8px\">p.'+esc(f.page)+'</span>'+esc(f.line)+'<div class=\"meta\"><span class=\"chip'+(f.hazard.focusFour?' ff':'')+'\">'+esc(f.hazard.label)+'</span>'+(o?'<span class=\"chip'+(o.recordable==='yes'?' rec':o.recordable==='no'?' ok':'')+'\" title=\"'+esc(o.why)+'\">'+esc(o.label)+'</span>':'')+(f.action?'<span class=\"chip '+(f.action.status==='closed'?'ok':'rec')+'\">ACTION '+esc(f.action.status.toUpperCase())+'</span>':'')+'<br>'+(f.hazard.cfr?'Standard: '+esc(f.hazard.cfr)+'. ':'')+(o?esc(o.why):'')+'</div>'+",
  "   '<div class=\"btns\">'+(f.action?'':'<button class=\"mini\" data-act=\"'+ri+':'+fi+'\">ADD CORRECTIVE ACTION</button>')+(o&&o.outcome!=='near_miss'&&o.recordable!=='no'?'<button class=\"mini\" data-case=\"'+ri+':'+fi+'\">RECORD AS OSHA 300 CASE</button>':'')+'</div></div>'})});",
  "  $('finds').innerHTML=out||'<p class=\"sub\">Nothing to show for this filter. Read a safety report on <a href=\"/safetyx\" style=\"color:var(--blue)\">SafetyX</a> first.</p>'})}",
  "$('finds').addEventListener('click',function(e){var a=e.target.getAttribute('data-act'),c=e.target.getAttribute('data-case');if(!a&&!c)return;var p=(a||c).split(':');var r=S.reports[+p[0]],f=r.flagged[+p[1]];",
  " if(a){var what=prompt('Corrective action for: '+f.line,'');if(!what)return;var owner=prompt('Who owns it? (name)','')||'';var due=prompt('Due date (YYYY-MM-DD)',new Date(Date.now()+7*864e5).toISOString().slice(0,10))||'';api('actions',{method:'POST',body:{reportId:r.id,page:f.page,line:f.line,hazard:f.hazard.key,action:what,owner:owner,due:due}}).then(loadReports);return}",
  " tab('osha');$('c-desc').value=f.line.replace(/^\\s*(?:(?:mon|tue|wed|thu|fri|sat|sun)\\w*\\.?\\s*)?\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?\\s*[:\\-]\\s*/i,'');$('c-date').value=/^\\d{4}-\\d{2}-\\d{2}$/.test(r.date||'')?r.date:'';$('c-loc').value=r.project||'';var o=f.outcome||{};$('c-out').value={death:'death',days_away:'days_away',restricted:'restricted'}[o.outcome]||'other';$('c-msg').textContent='Filled from the report line: add the employee, job title and days, then SAVE CASE.';$('c-emp').focus()});",
  "$('f-only').addEventListener('change',loadReports);",
  // ACTIONS
  "function loadActions(){api('actions?status='+$('a-st').value).then(function(d){if(guard(d))return;var rows=d.actions||[];var today=new Date().toISOString().slice(0,10);",
  " $('acts').innerHTML=rows.length?'<table><thead><tr><th>HAZARD</th><th>FINDING</th><th>ACTION</th><th>OWNER</th><th>DUE</th><th>STATUS</th><th></th></tr></thead><tbody>'+rows.map(function(x){var late=x.status==='open'&&x.due&&x.due<today;return '<tr><td>'+esc(x.hazardLabel||'')+'</td><td>'+esc(x.line||'')+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.owner||'')+'</td><td'+(late?' class=\"short\"':'')+'>'+esc(x.due||'')+(late?' OVERDUE':'')+'</td><td>'+esc(x.status)+'</td><td><button class=\"mini\" data-tog=\"'+esc(x.id)+'\" data-st=\"'+(x.status==='open'?'closed':'open')+'\">'+(x.status==='open'?'CLOSE':'REOPEN')+'</button> <button class=\"mini\" data-del=\"'+esc(x.id)+'\">DELETE</button></td></tr>'}).join('')+'</tbody></table>':'<p class=\"sub\">No corrective actions. Add one from a finding.</p>'})}",
  "$('acts').addEventListener('click',function(e){var t=e.target.getAttribute('data-tog'),d=e.target.getAttribute('data-del');if(t){var note=e.target.getAttribute('data-st')==='closed'?(prompt('How was it closed out? (optional)','')||''):undefined;api('actions/'+t,{method:'PATCH',body:{status:e.target.getAttribute('data-st'),note:note}}).then(loadActions)}if(d&&confirm('Delete this action?'))api('actions/'+d,{method:'DELETE'}).then(loadActions)});",
  "$('a-st').addEventListener('change',loadActions);",
  "$('a-csv').addEventListener('click',function(){download('actions.csv','SafetyX-corrective-actions.csv',$('a-msg'))});",
  "function download(path,name,msgEl,opt){msgEl.textContent='Preparing...';fetch('/api/safety-reports/'+path,{method:(opt&&opt.body)?'POST':'GET',headers:H(!!(opt&&opt.body)),credentials:'same-origin',body:opt&&opt.body?JSON.stringify(opt.body):undefined}).then(function(r){if(r.status===402)return r.json().then(function(d){payMsg(d,msgEl)});if(!r.ok)return r.json().catch(function(){return{}}).then(function(d){msgEl.textContent='Could not export: '+(d.message||d.error||r.status)});return r.blob().then(function(b){var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();msgEl.textContent=''})})}",
  // OSHA 300
  "function loadCases(){S.year=+$('o-year').value;api('cases?year='+S.year).then(function(d){if(guard(d))return;var cs=d.cases||[],t=d.totals||{};var lab={death:'Death',days_away:'Days away',restricted:'Job transfer / restriction',other:'Other recordable'};",
  " $('cases').innerHTML=cs.length?'<table><thead><tr><th>NO.</th><th>EMPLOYEE</th><th>JOB TITLE</th><th>DATE</th><th>WHERE</th><th>DESCRIPTION</th><th>CLASSIFIED</th><th>DAYS AWAY / RESTRICTED</th><th></th></tr></thead><tbody>'+cs.map(function(c){return '<tr><td>'+c.case_no+'</td><td>'+(c.privacy?'Privacy Case':esc(c.employee||''))+'</td><td>'+esc(c.job_title||'')+'</td><td>'+esc(c.event_date||'')+'</td><td>'+esc(c.location||'')+'</td><td>'+esc(c.description||'')+'</td><td>'+esc(lab[c.outcome])+'</td><td>'+c.days_away+' / '+c.days_restricted+'</td><td><button class=\"mini\" data-cdel=\"'+esc(c.id)+'\">DELETE</button></td></tr>'}).join('')+'</tbody></table>':'<p class=\"sub\">No recordable cases for '+S.year+'.</p>';",
  " $('t300a').innerHTML=[[t.G,'(G) DEATHS'],[t.H,'(H) DAYS-AWAY CASES'],[t.I,'(I) RESTRICTION CASES'],[t.J,'(J) OTHER RECORDABLE'],[t.K,'(K) DAYS AWAY'],[t.L,'(L) DAYS RESTRICTED'],[t.M1,'(M1) INJURIES'],[(t.M2||0)+(t.M3||0)+(t.M4||0)+(t.M5||0)+(t.M6||0),'(M2-M6) ILLNESSES']].map(function(x){return '<div><b>'+(x[0]||0)+'</b>'+x[1]+'</div>'}).join('')})}",
  "$('cases').addEventListener('click',function(e){var d=e.target.getAttribute('data-cdel');if(d&&confirm('Delete this case from the log?'))api('cases/'+d,{method:'DELETE'}).then(loadCases)});",
  "$('o-year').addEventListener('change',loadCases);",
  "$('c-save').addEventListener('click',function(){var b={employee:$('c-emp').value,privacy:$('c-priv').checked,jobTitle:$('c-job').value,eventDate:$('c-date').value,location:$('c-loc').value,description:$('c-desc').value,outcome:$('c-out').value,daysAway:$('c-da').value,daysRestricted:$('c-dr').value,caseType:$('c-type').value};api('cases',{method:'POST',body:b}).then(function(d){if(!d.success){$('c-msg').textContent=d.message||'Could not save.';return}$('c-msg').textContent='Saved as case '+d.caseNo+' of '+d.year+'.';['c-emp','c-job','c-date','c-loc','c-desc','c-da','c-dr'].forEach(function(id){$(id).value=''});$('c-priv').checked=false;if(d.year!==S.year){$('o-year').value=d.year}loadCases()})});",
  "var EST=['name','street','city','state','zip','industry','naics','avgEmployees','totalHours','executive','executiveTitle','phone'];",
  "try{var saved=JSON.parse(localStorage.getItem('safetyx_est')||'{}');EST.forEach(function(k){if(saved[k])$('e-'+k).value=saved[k]})}catch(e){}",
  "$('o-pdf').addEventListener('click',function(){var e={};EST.forEach(function(k){e[k]=$('e-'+k).value});try{localStorage.setItem('safetyx_est',JSON.stringify(e))}catch(x){}download('osha300.pdf','OSHA-300-300A-'+S.year+'.pdf',$('o-msg'),{body:{year:S.year,establishment:e}})});",
  "$('o-csv').addEventListener('click',function(){download('osha300.csv?year='+S.year,'OSHA-300-'+S.year+'.csv',$('o-msg'))});",
  "['overview','findings','actions','osha'].forEach(function(k){$('t-'+k).addEventListener('click',function(){tab(k)})});",
  "$('signin').addEventListener('click',function(e){e.preventDefault();signIn()});",
  "var y=new Date().getFullYear();$('o-year').innerHTML=[y,y-1,y-2,y-3,y-4].map(function(v){return '<option>'+v+'</option>'}).join('');",
  "tab('overview');window.addEventListener('weyland-auth',function(){$('app').style.display='block';$('guest').style.display='none';tab(S.tab)});",
  "})();",
].join("\n");

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const input = (id, label, type = "text", ph = "") => `<div><label for="${id}">${esc(label)}</label><input id="${id}" type="${type}"${ph ? ` placeholder="${esc(ph)}"` : ""}></div>`;

export function safetyLogHtml() {
  const nav = NAV.map((n) => '<a href="' + n[0] + '"' + (n[0] === "/safetyx" ? ' class="current"' : "") + ">" + n[1] + "</a>").join("");
  const est = [["name", "ESTABLISHMENT NAME"], ["street", "STREET"], ["city", "CITY"], ["state", "STATE"], ["zip", "ZIP"], ["industry", "INDUSTRY DESCRIPTION", "e.g. Door and hardware installation"], ["naics", "NAICS", "e.g. 238350"], ["avgEmployees", "ANNUAL AVERAGE EMPLOYEES"], ["totalHours", "TOTAL HOURS WORKED (YEAR)"], ["executive", "COMPANY EXECUTIVE"], ["executiveTitle", "EXECUTIVE'S TITLE"], ["phone", "PHONE"]];
  return [
    "<!doctype html>", '<html lang="en">', "<head>", '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width,initial-scale=1">', '<meta name="theme-color" content="#090a0d">',
    "<title>SafetyX log | Hazards, corrective actions, OSHA 300</title>",
    '<meta name="description" content="Every safety report SafetyX reads, sorted by OSHA hazard with the 29 CFR 1926 standard, injuries with a 1904.7 recording hint, corrective actions with owners and due dates, and the OSHA 300 log and 300A summary.">',
    "<style>" + CSS + "\n" + PAGE_CSS + "</style>", "</head>", "<body>", '<div class="shell">',
    "<header>", '<a class="brand" href="/"><span class="mark">SX</span><span><b>SAFETYX</b><small>SAFETY LOG</small></span></a>', '<nav class="nav">' + nav + "</nav>", "</header>",
    '<div class="titlebar">', '<div class="eyebrow">SAFETY LOG</div>', "<h1>Your safety record</h1>",
    "<p>Every report SafetyX has read for you, in one place: each finding sorted by OSHA hazard (the Focus Four first) with the 29 CFR 1926 standard to check, injuries with a 29 CFR 1904.7 recording hint, corrective actions you can assign and close, and the OSHA 300 log with its 300A summary. Read a new report on <a href=\"/safetyx\" style=\"color:var(--blue)\">SafetyX</a> and it lands here.</p>",
    '<p class="caveat">Hazards and outcomes are read by word rules, and each one says which words decided it. Whether a case is recordable is your call under 29 CFR 1904; the hint shows the rule.</p>',
    '<a class="button primary" id="signin" href="/login?redirect=/safetyx/log" style="display:none;margin-top:14px">SIGN IN</a>', "</div>",
    '<div id="app">',
    '<div class="tabs"><button id="t-overview">OVERVIEW</button><button id="t-findings">FINDINGS</button><button id="t-actions">CORRECTIVE ACTIONS</button><button id="t-osha">OSHA 300 LOG</button></div>',
    '<div id="v-overview"><div class="card"><div class="kpis" id="kpis"></div></div><div class="card"><label>FINDINGS BY HAZARD</label><div id="hz"></div></div><div class="card"><label>BY MONTH</label><div id="months"></div><label style="margin-top:18px">BY PROJECT</label><div id="projects"></div></div></div>',
    '<div id="v-findings" style="display:none"><div class="card"><div class="form-grid"><div><label>SHOW</label><select id="f-only"><option value="all">All findings</option><option value="ff">OSHA Focus Four only</option><option value="inj">Injuries only</option><option value="open">Without a corrective action</option></select></div></div><div id="finds"></div></div></div>',
    '<div id="v-actions" style="display:none"><div class="card"><div class="result-row"><div style="min-width:200px"><label>STATUS</label><select id="a-st"><option value="open">Open</option><option value="closed">Closed</option><option value="">All</option></select></div><button class="button" id="a-csv">EXPORT CSV</button></div><div id="a-msg" class="sub"></div><div id="acts"></div></div></div>',
    '<div id="v-osha" style="display:none">',
    '<div class="card"><div class="result-row"><div style="min-width:160px"><label>YEAR</label><select id="o-year"></select></div></div><div id="cases"></div><label style="margin-top:18px">FORM 300A TOTALS</label><div class="kpis" id="t300a"></div></div>',
    '<div class="card"><label>ADD A RECORDABLE CASE</label><div class="form-grid">' + input("c-emp", "(B) EMPLOYEE'S NAME") + '<div><label for="c-priv">PRIVACY CASE (1904.29(b)(7))</label><input id="c-priv" type="checkbox" style="width:auto"></div>' + input("c-job", "(C) JOB TITLE", "text", "e.g. Hardware installer") + input("c-date", "(D) DATE OF INJURY OR ONSET", "date") + input("c-loc", "(E) WHERE THE EVENT OCCURRED") +
    '<div><label for="c-out">CLASSIFY THE CASE (MOST SERIOUS)</label><select id="c-out"><option value="other">(J) Other recordable</option><option value="restricted">(I) Job transfer or restriction</option><option value="days_away">(H) Days away from work</option><option value="death">(G) Death</option></select></div>' +
    input("c-da", "(K) DAYS AWAY", "number") + input("c-dr", "(L) DAYS RESTRICTED", "number") +
    '<div><label for="c-type">(M) TYPE</label><select id="c-type"><option value="injury">Injury</option><option value="skin">Skin disorder</option><option value="respiratory">Respiratory condition</option><option value="poisoning">Poisoning</option><option value="hearing">Hearing loss</option><option value="other_illness">All other illnesses</option></select></div>' +
    '<div style="grid-column:1/-1"><label for="c-desc">(F) DESCRIBE THE INJURY OR ILLNESS, PARTS OF BODY AFFECTED, AND WHAT CAUSED IT</label><textarea id="c-desc" rows="3"></textarea></div></div>' +
    '<button class="button primary" id="c-save" style="margin-top:14px">SAVE CASE</button><div id="c-msg" class="sub"></div></div>',
    '<div class="card"><label>ESTABLISHMENT (FOR FORM 300A)</label><div class="form-grid">' + est.map((e) => input("e-" + e[0], e[1], "text", e[2] || "")).join("") + "</div>" +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="button primary" id="o-pdf">DOWNLOAD FORM 300 + 300A (PDF)</button><button class="button" id="o-csv">EXPORT LOG CSV</button></div><div id="o-msg" class="sub"></div>' +
    '<p class="sub">Post the 300A from February 1 to April 30. Construction establishments with 20-249 employees also submit it electronically to OSHA by March 2 (29 CFR 1904.41).</p></div>',
    "</div>",
    "</div>",
    '<div class="card note-card" id="guest" style="display:none">Sign in to see your safety log. <a class="button primary" href="/login?redirect=/safetyx/log" style="margin-left:8px">SIGN IN</a></div>',
    "</div>",
    "<script>" + SCRIPT + "</script>",
    "</body>", "</html>",
  ].join("\n");
}
