import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {registerHardwareSchedulePageExtractRoutes} from '../../weyland-subx-worker/src/routes/hardware-schedule-page-extract.js';
import {writeDoorScheduleEntries} from '../../weyland-subx-worker/src/lib/hardware-extraction-vision-dispatch.js';
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../../schema.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../../migrations/20261002_door_schedule_entries_unique_index.sql',import.meta.url),'utf8'));
 db.prepare("INSERT INTO hardware_extraction_sessions(id,user_id,project_name,filename,file_buffer_key,total_pages,status,created_at,document_type,tenant_id)VALUES(?,?,?,?,?,?,?,?,?,?)").run('s1','u1','Synthetic','synthetic.pdf','local-only',1,'active','2026-10-06','door_schedule','local-test');
 const DB={prepare(sql){let args=[];return {bind(...a){args=a.map(v=>v===undefined?null:v);return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return{results:db.prepare(sql).all(...args)}},async run(){let r=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}}}};
 const handlers=new Map();registerHardwareSchedulePageExtractRoutes({get(){},post(p,h){handlers.set(p,h)}},{authenticate:async r=>({user:{userId:r.headers.get('X-Fixture-User')||'u1',email:'synthetic@example.test'}}),writeDoorScheduleEntries});
 async function submit(extraction,user='u1'){const r=new Request('https://example.test/api/hardware-schedule/session/s1/page/1/extract-result',{method:'POST',headers:{'Content-Type':'application/json','X-Fixture-User':user},body:JSON.stringify({extraction,provider:{name:'client_grid_deterministic',model:null}})});r.params={sessionId:'s1',pageNum:'1'};return handlers.get('/api/hardware-schedule/session/:sessionId/page/:pageNum/extract-result')(r,{DB})}
 return{db,submit}
}
test('No table / zero doors returns 422 and creates no accepted rows or completion',async()=>{
 const{db,submit}=setup();const r=await submit({doors:[],extraction_confidence:0,metadata:{no_table_detected:true}});
 assert.equal(r.status,422);const b=await r.json();assert.equal(b.success,false);assert.equal(b.error,'EMPTY_DOOR_SCHEDULE');assert.equal(b.requires_review,true);assert.match(b.details,/Review the source page/);
 assert.equal(db.prepare('SELECT count(*) n FROM door_schedule_entries').get().n,0);assert.equal(db.prepare('SELECT door_entries_count FROM hardware_extraction_sessions').get().door_entries_count,0);assert.equal(db.prepare('SELECT door_schedule_extracted FROM hardware_extraction_sessions').get().door_schedule_extracted,0);db.close();
});
test('Nonempty synthetic row uses the actual writer and remains unvalidated',async()=>{
 const{db,submit}=setup();const r=await submit({doors:[{door_number:'SYNTHETIC-101',size:'3-0 x 7-0',width_inches:36,height_inches:84}],extraction_confidence:.9});
 assert.equal(r.status,200,await r.clone().text());const b=await r.json();assert.equal(b.doors,1);
 const row=db.prepare('SELECT mark,validated,validated_by,tenant_id FROM door_schedule_entries').get();assert.equal(row.mark,'SYNTHETIC-101');assert.equal(row.validated,0);assert.equal(row.validated_by,null);assert.equal(row.tenant_id,'local-test');db.close();
});
test('Another synthetic user cannot submit even an empty extraction',async()=>{
 const{db,submit}=setup();const r=await submit({doors:[]},'other-user');assert.equal(r.status,403);assert.equal(db.prepare('SELECT count(*) n FROM door_schedule_entries').get().n,0);db.close();
});
