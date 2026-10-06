import { createRequire } from 'node:module';
const { PDFDocument } = createRequire(import.meta.url)('../../weyland-subx-worker/node_modules/pdf-lib');
export const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBz8AAAAASUVORK5CYII=', 'base64')).buffer;
export async function pdfFixture(count = 1) {
  const pdf = await PDFDocument.create();
  for (let i=0;i<count;i++) pdf.addPage([612,792]).drawText('Synthetic schedule test page '+(i+1));
  const bytes=await pdf.save();return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
}
export function embeddedEnv(DB, calls = [], text = 'SYNTHETIC SCHEDULE\nMARK 101 HM 36 84\nSET 1 LOCK SCHLAGE L9050') {
  return {DB,QWEN_BRIDGE_CLIENT_ID:'test-only-id',QWEN_BRIDGE_CLIENT_SECRET:'test-only-secret',OCR_SERVICE:{async fetch(url,opts){calls.push({url:String(url),headers:new Headers(opts.headers),body:opts.body});if(String(url).includes('detect-schedules'))return Response.json({candidates:[{scheduleType:'door_schedule',pageNumber:1}]});return Response.json(String(url).includes('extract-schedule-table')?{text}:{pages:[{page:1,text}],documentPageCount:1});}}};
}
export async function withEmbeddedModel(content,fn,calls=[]) {
  const original=globalThis.fetch;
  globalThis.fetch=async(url,opts)=>{assertLocal(url);calls.push({url:String(url),body:JSON.parse(opts.body)});return Response.json({choices:[{message:{content:typeof content==='string'?content:JSON.stringify(content)}}]});};
  try{return await fn();}finally{globalThis.fetch=original;}
}
function assertLocal(url){if(!String(url).startsWith('https://llama.mobleysoft.com/v1/chat/completions'))throw new Error('Unexpected outbound request in test: '+url);}
