import {parentPort,workerData} from 'node:worker_threads';
import {embedTexts} from './embeddings.js';
try {const vectors=await embedTexts(workerData.texts as string[],done=>parentPort?.postMessage({progress:done}));parentPort?.postMessage({vectors});}
catch(error){parentPort?.postMessage({error:error instanceof Error?error.message:'embedding_failed'});}
