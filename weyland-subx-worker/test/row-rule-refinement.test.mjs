import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refineRowLines } from '../assets/client-ocr-src/schedule-grid-extraction-client.mjs';
function sheet(width=120,height=100) {return {width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};}
function ink(image,x0,x1,y0,y1) {for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*image.width+x)*4;image.data[i]=image.data[i+1]=image.data[i+2]=0;}}
test('refinement locates actual high-resolution horizontal rule centers after low-DPI rounding',()=>{
 const image=sheet();ink(image,10,110,12,15);ink(image,10,110,45,48);ink(image,10,110,80,83);
 assert.deepEqual(refineRowLines(image,[10,50,80],10,110,8),[13,46,81]);
});
test('text and absent rule ink keep original row boundaries',()=>{
 const image=sheet();ink(image,30,60,20,26);ink(image,70,85,20,26);
 assert.deepEqual(refineRowLines(image,[20,50],10,110,8),[20,50]);
});
test('refinement remains within neighboring bands and chooses nearest real rule',()=>{
 const image=sheet();ink(image,10,110,28,31);ink(image,10,110,39,42);ink(image,10,110,69,72);
 assert.deepEqual(refineRowLines(image,[30,45,70],10,110,20),[29,40,70]);
 const close=sheet();ink(close,10,110,21,22);
 assert.deepEqual(refineRowLines(close,[10,20,30],10,110,100),[10,21,30]);
});
test('nonfinite or negative refinement windows perform no unbounded work',()=>{
 for(const invalid of [NaN,Infinity,-1])assert.deepEqual(refineRowLines(sheet(),[10,50],10,110,invalid),[10,50]);
});
