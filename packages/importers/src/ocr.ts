import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {createWorker,OEM} from 'tesseract.js';
import type {Extraction,Passage} from './extract.js';
const require=createRequire(import.meta.url);
export const OCR_SHA='7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2';
export function ocrAssetPath():string{return path.resolve(process.env.COLLEGENOTES_MODELS_DIR??path.join(path.dirname(require.resolve('@collegenotes/importers')),'../../../.local/models'),'tesseract');}
export function verifyOcrModel():string {const dir=ocrAssetPath();const file=path.join(dir,'eng.traineddata');if(!fs.existsSync(file))throw new Error('ocr_model_missing');if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==OCR_SHA)throw new Error('ocr_model_checksum_mismatch');return dir;}
export async function renderPdfPage(bytes:Buffer,pageNumber:number):Promise<Buffer>{
 const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');const loading=pdf.getDocument({data:new Uint8Array(bytes),enableXfa:false,useSystemFonts:false,standardFontDataUrl:path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts/')});
 try{const doc=await loading.promise;if(doc.numPages>250||pageNumber<1||pageNumber>doc.numPages)throw new Error('page_limit_exceeded');const page=await doc.getPage(pageNumber);const viewport=page.getViewport({scale:2});if(viewport.width*viewport.height>16_000_000)throw new Error('image_dimensions_exceeded');const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));const context=canvas.getContext('2d');await page.render({canvas:canvas as unknown as HTMLCanvasElement,canvasContext:context as unknown as CanvasRenderingContext2D,viewport}).promise;return canvas.toBuffer('image/png');}finally{await loading.destroy();}
}
export async function extractOcr(bytes:Buffer,pageNumber=1):Promise<Extraction>{
 const langPath=verifyOcrModel();const image=await loadImage(bytes);if(image.width*image.height>16_000_000)throw new Error('image_dimensions_exceeded');
 const worker=await createWorker('eng',OEM.LSTM_ONLY,{langPath,gzip:false,cacheMethod:'none',workerPath:path.join(path.dirname(require.resolve('tesseract.js/package.json')),'src/worker-script/node/index.js'),corePath:path.dirname(require.resolve('tesseract.js-core/package.json'))});
 try{const result=await worker.recognize(bytes,{}, {blocks:true,text:true});const passages:Passage[]=[];
  for(const block of result.data.blocks??[])for(const paragraph of block.paragraphs)for(const line of paragraph.lines){const text=line.text.trim();if(text){const b=line.bbox;passages.push({text,anchor:{type:'region',locator:`page:${pageNumber}:rect:${b.x0},${b.y0},${b.x1-b.x0},${b.y1-b.y0}`}});}}
  if(!passages.length&&result.data.text.trim())passages.push({text:result.data.text.trim(),anchor:{type:'region',locator:`page:${pageNumber}:rect:0,0,${image.width},${image.height}`}});
  return {method:'tesseract-english-fast',passages,warnings:[`page:${pageNumber}:OCR requires user review; handwriting, small text, formulas and numeric facts may be wrong.`,...(result.data.confidence<85?['Low OCR confidence; correction required before approving this text.']:[])]};
 }finally{await worker.terminate();}
}
