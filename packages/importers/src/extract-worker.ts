import {parentPort,workerData} from 'node:worker_threads';
import {extractDocument} from './extract.js';
try{const input=workerData as {filename:string;bytes:Uint8Array};parentPort?.postMessage({result:await extractDocument(input.filename,Buffer.from(input.bytes))});}
catch(error){parentPort?.postMessage({error:error instanceof Error?error.message:'extraction_failed'});}
