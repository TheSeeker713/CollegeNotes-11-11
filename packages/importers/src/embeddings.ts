import fs from 'node:fs';
import {modelStorageDirectory} from './model-storage.js';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Tokenizer} from '@huggingface/tokenizers';
import type {Tensor} from 'onnxruntime-node';
// Set in the service's main environment before native code can initialize in workers.
process.env.ORT_DISABLE_TELEMETRY='1';

type Manifest={id:string;revision:string;dimensions:number;files:Array<{path:string;sha256:string;bytes:number}>};
const root=fileURLToPath(new URL('../../../',import.meta.url));
export const EMBEDDING_MANIFEST=JSON.parse(fs.readFileSync(path.join(root,'docs/phase6-embedding-model.json'),'utf8')) as Manifest;
export const EMBEDDING_VERSION=crypto.createHash('sha256').update(JSON.stringify(EMBEDDING_MANIFEST.files)+':mean-l2:char240-overlap32:v1').digest('hex');
export function verifyEmbeddingModel():string {
 const dir=path.resolve(modelStorageDirectory(),'minilm');
 for(const entry of EMBEDDING_MANIFEST.files){
  const file=path.join(dir,entry.path);
  if(!fs.existsSync(file))throw new Error('embedding_model_missing');
  const rel=path.relative(fs.realpathSync(dir),fs.realpathSync(file));
  if(rel.startsWith('..')||path.isAbsolute(rel))throw new Error('unsafe_model_path');
  const bytes=fs.readFileSync(file);
  if(bytes.length!==entry.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('embedding_model_checksum_mismatch');
 }
 return dir;
}
/** CPU-only local ONNX inference. No network client or remote model fallback. */
export async function embedTexts(texts:string[],progress?:(done:number)=>void):Promise<number[][]>{
 if(!texts.length||texts.length>10000||texts.some(t=>!t.trim()||t.length>240))throw new Error('embedding_input_bounds');
 const dir=verifyEmbeddingModel();
 // Must be set before loading/initializing the native runtime, including in workers.
 process.env.ORT_DISABLE_TELEMETRY='1';
 const ort=await import('onnxruntime-node');
 const tokenizer=new Tokenizer(JSON.parse(fs.readFileSync(path.join(dir,'tokenizer.json'),'utf8')),JSON.parse(fs.readFileSync(path.join(dir,'tokenizer_config.json'),'utf8')));
 const session=await ort.InferenceSession.create(path.join(dir,'onnx/model_quantized.onnx'),{executionProviders:['cpu'],intraOpNumThreads:2,interOpNumThreads:1});
 try {
  const vectors:number[][]=[];
  for(const text of texts){
   const encoded=tokenizer.encode(text);const ids=encoded.ids;
   if(ids.length>256)throw new Error('embedding_token_limit');
   const feeds:Record<string,Tensor>={};
   for(const name of session.inputNames){const values=name==='input_ids'?ids:name==='attention_mask'?ids.map(()=>1):ids.map(()=>0);feeds[name]=new ort.Tensor('int64',BigInt64Array.from(values.map(BigInt)),[1,ids.length]);}
   const output=await session.run(feeds);const tensor=output.last_hidden_state??output[session.outputNames[0]!];
   if(!tensor||tensor.dims.length!==3||tensor.dims[2]!==384)throw new Error('embedding_output_shape');
   const data=tensor.data as Float32Array;const vector=Array<number>(384).fill(0);
   for(let i=0;i<ids.length;i++)for(let j=0;j<384;j++)vector[j]=vector[j]!+data[i*384+j]!/ids.length;
   const norm=Math.hypot(...vector);if(!Number.isFinite(norm)||norm===0)throw new Error('embedding_invalid_vector');
   vectors.push(vector.map(v=>v/norm));progress?.(vectors.length);
  }
  return vectors;
 }finally{await session.release();}
}
