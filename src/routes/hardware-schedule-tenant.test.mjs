import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {NativeRouter} from '../../weyland-subx-worker/src/lib/router.js';
import {authenticate,requireActiveSubscription} from '../../weyland-subx-worker/src/lib/auth.js';
import {registerHardwareScheduleExtractRoutes as registerSubx} from '../../weyland-subx-worker/src/routes/hardware-schedule-extract.js';
import {registerHardwareScheduleExtractRoutes as registerRoot} from './hardware-schedule-extract.js';
import {registerHardwareSchedulePageExtractRoutes} from '../../weyland-subx-worker/src/routes/hardware-schedule-page-extract.js';
import {createExtractionSession} from '../../weyland-subx-worker/src/lib/hardware-extraction-pipeline.js';
import {detectFileType,logTelemetryEvent} from '../../weyland-subx-worker/src/lib/edge-telemetry.js';
import {extractPdfBookmarks2} from '../../weyland-subx-worker/src/lib/hardware-extraction-single-page.js';
import {detectSchedulePages} from '../../weyland-subx-worker/src/lib/hardware-extraction-prompts.js';
import {writeDoorScheduleEntries} from '../../weyland-subx-worker/src/lib/hardware-extraction-vision-dispatch.js';
import {pdfFixture} from '../test-support/ocr-fixtures.mjs';
test('Actual root and SubX handlers isolate two synthetic tenants across 16 upload cases', async()=>{
const fixed=true,db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../../schema.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../../migrations/20261002_door_schedule_entries_unique_index.sql',import.meta.url),'utf8'));
const sqlErrors=[],objects=new Map(),cache=new Map(),outbound=[];
const DB={prepare(sql){let args=[];return{bind(...v){args=v.map(x=>x===undefined?null:x);return this},async first(){try{return db.prepare(sql).get(...args)||null}catch(e){sqlErrors.push({sql,error:String(e)});throw e}},async all(){return{results:db.prepare(sql).all(...args)}},async run(){const r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}}}};
const env={DB,CACHE:{async put(k,v){cache.set(k,v)},async get(k){return cache.get(k)||null}},UPLOADS:{async put(k,v){objects.set(k,v)}}};
const oldFetch=globalThis.fetch;globalThis.fetch=async u=>{outbound.push(String(u));throw Error('No external calls allowed')};
const tenants=[randomUUID(),randomUUID()],users=[randomUUID(),randomUUID()],cookies=[randomUUID(),randomUUID()];
for(let i=0;i<2;i++){db.prepare('INSERT INTO users(id,email,name,tenant_id,products_enabled)VALUES(?,?,?,?,?)').run(users[i],'synthetic-'+i+'@example.test','Synthetic tenant '+i,tenants[i],'subx,takeoffx');db.prepare('INSERT INTO weyland_sessions(id,user_id,email,player_json,expires_at)VALUES(?,?,?,?,?)').run(cookies[i],users[i],'synthetic-'+i+'@example.test',JSON.stringify({name:'Synthetic tenant '+i,tenants:[{id:tenants[i]}]}),'2099-01-01')}
const pdf=await pdfFixture(1),report={mode:fixed?'fixed regression':'unmodified baseline',identity:'Synthetic users and unguessable random tenant/session IDs; actual local-session authentication',outbound,sqlErrors,checks:[]};
function snapshot(){return{sessions:db.prepare('SELECT count(*) n FROM hardware_extraction_sessions').get().n,objects:objects.size,cache:cache.size}}
const deps={authenticate,requireActiveSubscription,detectFileType,extractPdfBookmarks2,detectSchedulePages,createExtractionSession,logTelemetryEvent};
for(const [kind,register]of [['subx',registerSubx],['root',registerRoot]]){
 const router=new NativeRouter();register(router,deps);registerHardwareSchedulePageExtractRoutes(router,{authenticate,writeDoorScheduleEntries});
 for(let i=0;i<2;i++){
  const auth=await authenticate(new Request('https://example.test/',{headers:{Cookie:'weyland_session='+cookies[i]}}),env);assert.equal(auth.user.tenant_id,tenants[i]);
  for(const [caseName,selection]of [['default',undefined],['own',tenants[i]],['other',tenants[1-i]],['unrelated',randomUUID()]]){
   const form=new FormData();form.set('file',new File([pdf],'synthetic.pdf',{type:'application/pdf'}));form.set('document_type','door_schedule');form.set('projectName','Synthetic tenant isolation');if(selection!==undefined)form.set('tenant_id',selection);
   const before=snapshot();const req=new Request('https://example.test/api/hardware-schedule/start',{method:'POST',headers:{Cookie:'weyland_session='+cookies[i]},body:form});assert.equal(req.user,undefined);
   const r=await router.handle(req,env,{}),body=await r.json();const row=body.sessionId?db.prepare('SELECT user_id,tenant_id FROM hardware_extraction_sessions WHERE id=?').get(body.sessionId):null;
   const item={kind,tenantIndex:i,case:caseName,status:r.status,authenticatedTenant:auth.user.tenant_id,storedTenant:row?.tenant_id??null,effectsBefore:before,effectsAfter:snapshot()};report.checks.push(item);
   if(fixed){
    if(['other','unrelated'].includes(caseName)){assert.equal(r.status,403,JSON.stringify(item));assert.deepEqual(snapshot(),before);continue}
    assert.equal(r.status,201,JSON.stringify(body));assert.equal(row.tenant_id,tenants[i]);assert.equal(row.user_id,users[i]);
    const crossed=await router.handle(new Request('https://example.test/api/hardware-schedule/session/'+body.sessionId+'/page/1/extract-result',{method:'POST',headers:{Cookie:'weyland_session='+cookies[1-i],'Content-Type':'application/json'},body:JSON.stringify({extraction:{doors:[]},provider:{name:'local-test'}})}),env,{});
    assert.equal(crossed.status,403);item.crossUserSubmissionStatus=crossed.status;assert.equal(db.prepare('SELECT count(*) n FROM door_schedule_entries').get().n,0);
   }
  }
 }
}
assert.equal(outbound.length,0);report.summary={checks:report.checks.length,allowed:report.checks.filter(x=>x.status===201).length,denied:report.checks.filter(x=>x.status===403).length,rows:snapshot().sessions};
console.log(JSON.stringify(report.summary));db.close();globalThis.fetch=oldFetch;
});
