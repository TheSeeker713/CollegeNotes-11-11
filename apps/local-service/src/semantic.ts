import {Worker} from 'node:worker_threads';
import {createRequire} from 'node:module';
import path from 'node:path';
import {beginIndex,finishIndex,failIndex,indexStatus,semanticSearch,requireCourse,CourseError,type Store,type IndexModel} from '@collegenotes/storage';
import {EMBEDDING_MANIFEST,EMBEDDING_VERSION,verifyEmbeddingModel} from '@collegenotes/importers';
const require=createRequire(import.meta.url);
export const LOCAL_MODEL:IndexModel={id:EMBEDDING_MANIFEST.id,version:EMBEDDING_VERSION,checksum:EMBEDDING_MANIFEST.files.find(f=>f.path.endsWith('.onnx'))!.sha256};
export function embeddingWorker(texts:string[],cancelled:()=>boolean=()=>false):Promise<number[][]>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(path.join(path.dirname(require.resolve('@collegenotes/importers')),'embedding-worker.js'),{workerData:{texts},env:{...process.env,ORT_DISABLE_TELEMETRY:'1'},resourceLimits:{maxOldGenerationSizeMb:512}});
  const cleanup=()=>{clearTimeout(timeout);clearInterval(poll);};
  const timeout=setTimeout(()=>{cleanup();void worker.terminate();reject(new Error('embedding_timeout_retry'));},300000);
  const poll=setInterval(()=>{let stop:boolean;try{stop=cancelled();}catch{stop=true;}if(stop){cleanup();void worker.terminate();reject(new Error('index_cancelled_or_changed'));}},100);
  worker.on('message',(m:{vectors?:number[][];error?:string})=>{if(!m.vectors&&!m.error)return;cleanup();void worker.terminate();if(m.vectors)resolve(m.vectors);else reject(new Error(m.error));});
  worker.once('error',e=>{cleanup();reject(e);});worker.once('exit',()=>{cleanup();reject(new Error('embedding_worker_interrupted'));});
 });
}
export function rebuildIndex(store:Store,courseId:string){
 verifyEmbeddingModel();const snapshot=beginIndex(store,courseId,LOCAL_MODEL);
 return (async()=>{try{
  const vectors=snapshot.chunks.length?await embeddingWorker(snapshot.chunks.map(c=>c.text),()=>!store.db.open||indexStatus(store,courseId)?.rebuildReason!==snapshot.token):[];
  finishIndex(store,snapshot,vectors);return indexStatus(store,courseId);
 }catch(error){failIndex(store,courseId,snapshot.token,error instanceof Error?error.message:'embedding_failed');throw error;}})();
}
export async function searchIndex(store:Store,courseId:string,query:unknown){
 requireCourse(store,courseId,true);if(typeof query!=='string'||!query.trim()||query.length>240)throw new CourseError('invalid_search');
 if(indexStatus(store,courseId)?.status!=='ready')throw new CourseError('index_rebuild_required',409);
 const [vector]=await embeddingWorker([query]);return semanticSearch(store,courseId,vector!,LOCAL_MODEL);
}
