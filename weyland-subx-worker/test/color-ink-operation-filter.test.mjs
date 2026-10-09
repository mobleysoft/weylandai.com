import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorInkOperationFilter, recognitionBudget } from '../assets/client-ocr-src/schedule-grid-extraction-client.mjs';
const names=['save','restore','setFillRGBColor','setStrokeRGBColor','setFillColorN','setStrokeColorN','setFillTransparent','setStrokeTransparent','clip','eoClip','constructPath','stroke','closeStroke','fill','eoFill','fillStroke','eoFillStroke','closeFillStroke','closeEOFillStroke','endPath','paintImageXObject','showText','paintFormXObjectBegin','paintFormXObjectEnd','beginGroup','endGroup','beginAnnotation','endAnnotation','setGState','beginMarkedContentProps','endMarkedContent','setFillGray','setStrokeGray','setFillCMYKColor','setStrokeCMYKColor','setFillColor','setStrokeColor','setFillColorSpace','setStrokeColorSpace'];
const OPS=Object.fromEntries(names.map((name,i)=>[name,i+1]));
const list=rows=>({fnArray:rows.map(([name])=>OPS[name]),argsArray:rows.map(([, ...args])=>args)});
const survives=(result,indices)=>indices.map(i=>result?.operationsFilter(i)??true);
test('only saturated pure paint is omitted; actual black/grey glyphs and image/text operations survive',()=>{
 const result=colorInkOperationFilter(list([
  ['setFillRGBColor','#000000'],['constructPath',OPS.fill,[]],
  ['setFillRGBColor','#0000ff'],['constructPath',OPS.fill,[]],
  ['paintImageXObject','picture'],['showText','colored glyph'],
  ['setFillRGBColor','#777777'],['constructPath',OPS.eoFill,[]],
  ['setStrokeRGBColor','#ff0000'],['constructPath',OPS.stroke,[]],
 ]),OPS);
 assert.equal(result.omitted,2);assert.deepEqual(survives(result,[1,3,4,5,7,9]),[true,false,true,true,true,false]);
});
test('nested save/restore and form scopes retain original paint colors',()=>{
 for(const [begin,end]of[['save','restore'],['paintFormXObjectBegin','paintFormXObjectEnd']]){
  const result=colorInkOperationFilter(list([
   ['setFillRGBColor','#000000'],[begin],['setFillRGBColor','#ff0000'],['constructPath',OPS.fill,[]],[end],['constructPath',OPS.fill,[]],
  ]),OPS);
  assert.deepEqual(survives(result,[3,5]),[false,true]);
 }
});
test('annotations reset to default black and must retain normal rendering',()=>{
 const ops=list([['setStrokeRGBColor','#0000ff'],['constructPath',OPS.stroke,[]],
  ['beginAnnotation','id',[0,0,10,10],null,null,false],['constructPath',OPS.stroke,[]],['endAnnotation']]);
 assert.equal(colorInkOperationFilter(ops,OPS),null,'the black annotation outline must not inherit the preceding blue flag');
});
test('unsupported compositing and optional visibility fall back before any paint is omitted',()=>{
 for(const unsupported of [['beginGroup',{isGray:true}],['setGState',[['SMask',true]]],
  ['setGState',[['TR',[0,1]]]],['setGState',[['BM','multiply']]],['beginMarkedContentProps','OC',{id:'hidden'}]]){
  assert.equal(colorInkOperationFilter(list([['setFillRGBColor','#0000ff'],['constructPath',OPS.fill,[]],unsupported,['constructPath',OPS.fill,[]]]),OPS),null);
 }
 const benign=colorInkOperationFilter(list([['setGState',[['LW',1],['CA',1],['ca',1]]],['setFillRGBColor','#0000ff'],['constructPath',OPS.fill,[]]]),OPS);
 assert.equal(benign.omitted,1,'ordinary line and opacity state retains the supported color-ink repair');
});
test('a later gray, CMYK or unknown color space cannot inherit a preceding saturated RGB flag',()=>{
 for(const prefix of ['Fill','Stroke'])for(const suffix of ['Gray','CMYKColor','Color','ColorSpace']){
  const paint=prefix==='Fill'?OPS.fill:OPS.stroke;
  const result=colorInkOperationFilter(list([['set'+prefix+'RGBColor','#0000ff'],['constructPath',paint,[]],['set'+prefix+suffix,0],['constructPath',paint,[]]]),OPS);
  assert.deepEqual(survives(result,[1,3]),[false,true]);
 }
});
test('clipping paths survive even when painted with color, and later color paint can be omitted',()=>{
 const result=colorInkOperationFilter(list([
  ['setFillRGBColor','#0000ff'],['eoClip'],['constructPath',OPS.eoFill,[]],['constructPath',OPS.fill,[]],
 ]),OPS);assert.deepEqual(survives(result,[2,3]),[true,false]);
});
test('mixed black and color paint stays intact; unknown patterns do not inherit a stale color flag',()=>{
 const result=colorInkOperationFilter(list([
  ['setFillRGBColor','#0000ff'],['setStrokeRGBColor','#000000'],['constructPath',OPS.fillStroke,[]],
  ['setFillColorN','pattern'],['constructPath',OPS.fill,[]],
  ['setStrokeRGBColor','#00a000'],['constructPath',OPS.stroke,[]],
 ]),OPS);assert.deepEqual(survives(result,[2,4,6]),[true,true,false]);
});
test('monochrome, malformed or oversized lists fall back to normal rendering',()=>{
 assert.equal(colorInkOperationFilter(list([['setFillRGBColor','#000000'],['constructPath',OPS.fill,[]]]),OPS),null);
 assert.equal(colorInkOperationFilter({fnArray:[1],argsArray:[]},OPS),null);
 assert.equal(colorInkOperationFilter({fnArray:new Array(1_000_001),argsArray:new Array(1_000_001)},OPS),null);
});
test('operation analysis respects cooperative stop without claiming omitted content',()=>{
 const budget=recognitionBudget({signal:{aborted:true}});
 assert.equal(colorInkOperationFilter(list([['setFillRGBColor','#0000ff'],['constructPath',OPS.fill,[]]]),OPS,budget),null);
 assert.equal(budget.status().partial,true);
});
