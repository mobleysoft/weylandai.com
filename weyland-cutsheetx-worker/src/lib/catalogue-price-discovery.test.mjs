import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {looksLikePricePage, extractPricesFromPdfBuffer} from "./catalogue-price-discovery.js";
const {PDFDocument}=createRequire(import.meta.url)("pdf-lib");
async function fixture(texts){
 const pdf=await PDFDocument.create();for(const text of texts){const p=pdf.addPage();p.drawText(text);}
 const bytes=await pdf.save();const db=new DatabaseSync(":memory:");db.exec(readFileSync(new URL("../../../migrations/20260930_catalogue_price_candidates.sql",import.meta.url),"utf8"));
 const DB={prepare(sql){let params=[];return {bind(...p){params=p.map(x=>x===undefined?null:x);return this;},async all(){return {results:db.prepare(sql).all(...params)};},async first(){return null;},async run(){return db.prepare(sql).run(...params);}};}};
 const stored=new Map();const env={DB,UPLOADS:{async put(k,v){stored.set(k,v);}},OCR_SERVICE:{async fetch(_url,opts){const n=Number(new Headers(opts.headers).get("X-Start-Page"));if(texts[n-1]==="FAIL")return new Response("fixture OCR failure",{status:422});return Response.json({pages:[{text:texts[n-1]}],documentPageCount:texts.length});}}};
 return {bytes:bytes.buffer,env,db,stored};
}
test("ingestion accepts a single valid row and numeric-only part rows",async()=>{
 for(const [text,count]of [["L9050 06L 626 $412.00",1],["11-068 626 $25.00\n11-069 626 $26.00",2]]){
  assert.equal(looksLikePricePage(text),true);const f=await fixture([text]);const out=await extractPricesFromPdfBuffer(f.bytes,{manufacturer:"Schlage"},f.env);assert.equal(out.candidatesStaged,count);assert.equal(out.pagesSkipped,0);
  const rows=f.db.prepare("SELECT * FROM catalogue_price_candidates").all();assert.ok(rows.every(r=>r.affirmed===0&&r.extraction_model==="catalogue-price-cascade"&&r.raw_model_text));
  const repeat=await extractPricesFromPdfBuffer(f.bytes,{manufacturer:"Schlage"},f.env);assert.equal(repeat.alreadyStaged,true);assert.equal(f.db.prepare("SELECT count(*) n FROM catalogue_price_candidates").get().n,count);
 }
});
test("quote-only, fee and negative rows do not become product prices",async()=>{
 for(const text of ["L9050 626 Call for pricing","Minimum order $100.00","L9050 626 -$25.00"]){assert.equal(looksLikePricePage(text),false);const f=await fixture([text]);const out=await extractPricesFromPdfBuffer(f.bytes,{},f.env);assert.equal(out.candidatesStaged,0);assert.equal(out.pageNotes.length,1);}
});
test("partial OCR failures retain valid rows and visible warnings",async()=>{const f=await fixture(["11-068 626 $25.00","FAIL"]);const out=await extractPricesFromPdfBuffer(f.bytes,{},f.env);assert.equal(out.candidatesStaged,1);assert.ok(out.warnings.some(w=>w.includes("ocr_failed")));});
test("invalid PDF is rejected before storage or database mutation",async()=>{const f=await fixture(["L9050 626 $25.00"]);const out=await extractPricesFromPdfBuffer(new TextEncoder().encode("not a PDF").buffer,{},f.env);assert.equal(out.error,"INVALID_PDF_MAGIC");assert.equal(f.stored.size,0);assert.equal(f.db.prepare("SELECT count(*) n FROM catalogue_price_candidates").get().n,0);});
