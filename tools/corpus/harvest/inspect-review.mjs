import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,records} from './common.mjs';
for(const sha of ['674e8c0ea89da178','32b631d235082c7c','61bd6a483519458e','43a1f0db3f7ff345','4af80165bc367de8','a4b7b0a81c5a6602']){
 const doc=records().find(r=>r.sha256?.startsWith(sha)&&r.outcome==='downloaded');
 const texts=execFileSync('pdftotext',['-layout',path.join(root,doc.filename),'-'],{encoding:'utf8',maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']}).split('\f');
 console.log('\n'+sha+' '+doc.pages+' pages');
 texts.forEach((text,i)=>{const titles=text.split('\n').flatMap(s=>s.split(/[ \t]{3,}/)).map(s=>s.trim()).filter(s=>s.length<95&&/PLAN|LAYOUT|SCHEDULE|^A[D-]?1\d/i.test(s)&&!/REFER|NOTE|SHALL|SEE |CONTRACTOR|PER |PROVIDE/i.test(s));if(titles.length)console.log(i+': '+[...new Set(titles)].slice(0,12).join(' | '));});
}
