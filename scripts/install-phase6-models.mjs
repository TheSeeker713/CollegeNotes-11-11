import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=async name=>JSON.parse(await fs.readFile(path.join(root,'docs',name),'utf8'));
const ocr=await read('phase6-ocr-model.json'),embedding=await read('phase6-embedding-model.json');
const files=[{path:'tesseract/eng.traineddata',url:ocr.url,bytes:ocr.bytes,sha256:ocr.sha256},...embedding.files.map(f=>({...f,path:`minilm/${f.path}`}))];
if(files.reduce((n,f)=>n+f.bytes,0)>50_000_000)throw new Error('Approved combined model budget exceeded');
for(const f of files){
 if(!/^[a-f0-9]{64}$/.test(f.sha256)||!Number.isSafeInteger(f.bytes)||f.bytes<=0||f.path.includes('..')||path.isAbsolute(f.path))throw new Error('Invalid pinned manifest');
 const target=path.join(root,'.local/models',f.path);
 try{const existing=await fs.readFile(target);if(existing.length===f.bytes&&sha(existing)===f.sha256){console.log(`Verified ${f.path}`);continue;}}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!process.argv.includes('--confirm-download'))throw new Error('Missing models. Re-run with --confirm-download only after owner approval of the pinned Phase 6 model download.');
 const response=await globalThis.fetch(f.url,{signal:globalThis.AbortSignal.timeout(120000)});if(!response.ok||!response.body)throw new Error(`Model download failed: ${response.status}`);
 const chunks=[];let length=0;
 for await(const part of response.body){length+=part.length;if(length>f.bytes)throw new Error('Model download exceeded pinned size');chunks.push(part);}
 const bytes=Buffer.concat(chunks);if(length!==f.bytes||sha(bytes)!==f.sha256)throw new Error('Pinned model checksum mismatch');
 await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(`${target}.partial`,bytes);await fs.rename(`${target}.partial`,target);console.log(`Installed and verified ${f.path}`);
}
console.log('Phase 6 model assets ready. Application inference never downloads models.');
