#!/usr/bin/env node
// Local, read-only handoff. Serves the unchanged SightX app and diagnostic models.
// It does not create production sessions or claim that SubX extracted these rows.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '../../..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json')));
const best = [...index.results].sort((a,b) => b.diagnostic.tags-a.diagnostic.tags || a.rank-b.rank).slice(0,3);
const selected = new Set(best.map(r=>r.sha16));
const escape = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const assetNames = ['vendor/three-r128.min.js', 'weyland-input.js'];
const server = http.createServer((req,res)=>{
  const u = new URL(req.url, 'http://localhost');
  const send = (type,body,status=200) => {res.writeHead(status, {'Content-Type':type,'Cache-Control':'no-store'}); res.end(body);};
  if (req.method !== 'GET') return send('text/plain','Read-only evidence server',405);
  if (u.pathname === '/') {
    const sha = selected.has(u.searchParams.get('set')) ? u.searchParams.get('set') : best[0].sha16;
    const r = best.find(r=>r.sha16===sha);
    const warnings = {
      '7478006f7fd5b43c': '154 matches include four grid labels (1–4). SightX caps this 156-input model at 120 doors; 118 of those are tagged. This is not full-building coverage.',
      '192a16af8f31ae0c': '40 matches use room-number portions of split ROOM / MARK identifiers. Repeated A/B door rows collapse. B2 is a finish-code false input. This is not opening recall.',
      'e3d0cc1bc22fd824': '19 matches include false mark 1. Schedule rows 117, 118, 119 and 121 were omitted by the harvest regex. Some matches use enlarged detail views.'
    };
    return send('text/html', `<!doctype html><html><head><meta charset="utf-8"><title>G020 real-set SightX evidence</title><style>body{margin:0;background:#171a20;color:#f4f5f7;font:15px system-ui}header{padding:14px 22px}a{color:#b8d5ff;margin-right:22px}p{margin:8px 0}strong{color:#ffd486}iframe{display:block;width:100%;height:850px;border:0;background:#fff}</style></head><body><header><nav>${best.map(b=>`<a href="/?set=${b.sha16}">${escape(b.project)}</a>`).join('')}</nav><p><strong>LOCAL DIAGNOSTIC — production reader A found 0 door rows in each of these three PDFs.</strong></p><p>Unchanged S1 reader + harvest regex marks → unchanged SightX model builder and app. Sizes default to 3′ × 7′; hardware was not supplied. No production upload or saved corridor.</p><p>${escape(warnings[sha])}</p><p>${r.diagnostic.tags}/${r.diagnostic.schedule_marks} tag-shaped matches; ${r.diagnostic.unmatched_tags} unmatched candidates. <a href="/evidence/${sha}.json">Full marks, coordinates, sheets and truth evidence</a> <a href="/report">Plan-reader report</a></p></header><iframe title="SightX ${sha}" src="/sightx/?m=${sha}"></iframe></body></html>`);
  }
  if(u.pathname==='/sightx/') return send('text/html',fs.readFileSync(path.join(repo,'weyland-sightx-worker/src/pages/sightx-app.html')));
  const match=u.pathname.match(/^\/api\/sightx\/models\/([a-f0-9]{16})$/);
  if(match && selected.has(match[1])) return send('application/json',JSON.stringify({success:true,name:'G020 harvest-mark diagnostic (local fixture)',shared_at:index.generated_at,model:JSON.parse(fs.readFileSync(path.join(root,match[1]+'.model.json')))}));
  if(u.pathname==='/report') return send('text/plain; charset=utf-8',fs.readFileSync(path.join(root,'REPORT.md')));
  const evidence=u.pathname.match(/^\/evidence\/([a-f0-9]{16})\.json$/);
  if(evidence && selected.has(evidence[1])) return send('application/json',fs.readFileSync(path.join(root,evidence[1]+'.json')));
  const asset=u.pathname.replace(/^\/assets\//,'');
  if(u.pathname.startsWith('/assets/') && assetNames.includes(asset)) return send('text/javascript',fs.readFileSync(path.join(repo,'assets',asset)));
  return send('text/plain','Not found',404);
});
server.listen(Number(process.env.G020_PORT || 8020),'127.0.0.1',()=>console.log('G020 handoff: http://127.0.0.1:'+server.address().port+' (loopback only)'));
