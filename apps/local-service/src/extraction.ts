import {Worker} from 'node:worker_threads';
import {createRequire} from 'node:module';
import path from 'node:path';
import {CourseError,requireCourse,listImportTasks,readOriginal,type Store} from '@collegenotes/storage';
import type {SourceDocument} from '@collegenotes/domain';
import type {Extraction} from '@collegenotes/importers';
const require=createRequire(import.meta.url);
export async function processImport(store:Store,courseId:string,taskId:string):Promise<void>{
 requireCourse(store,courseId,true);const task=listImportTasks(store,courseId).find(t=>t.id===taskId);if(!task||task.status!=='queued')throw new CourseError('import_not_queued',409);
 const doc=store.db.prepare('select id,course_id as courseId,filename,checksum,byte_length as byteLength,stored_rel_path as storedRelPath,created_at as createdAt from source_documents where id=? and course_id=? and deleted_at is null and trashed_at is null').get(task.sourceId,courseId) as SourceDocument|undefined;
 if(!doc)throw new CourseError('material_unavailable',404);
 store.db.prepare("update import_tasks set status='running',progress=5 where id=?").run(taskId);
 try{
  const result=await new Promise<Extraction>((resolve,reject)=>{
   const worker=new Worker(path.join(path.dirname(require.resolve('@collegenotes/importers')),'extract-worker.js'),{workerData:{filename:doc.filename,bytes:readOriginal(store,doc)},resourceLimits:{maxOldGenerationSizeMb:256}});
   const timeout=setTimeout(()=>{void worker.terminate();reject(new Error('extraction_timeout'));},120000);
   const cancelled=setInterval(()=>{if(!store.db.open||!listImportTasks(store,courseId).some(t=>t.id===taskId&&t.status==='running')){void worker.terminate();reject(new Error('import_cancelled'));}},100);
   const cleanup=()=>{clearTimeout(timeout);clearInterval(cancelled);};
   worker.once('message',(message:{result?:Extraction;error?:string})=>{cleanup();void worker.terminate();if(message.result)resolve(message.result);else reject(new Error(message.error??'extraction_failed'));});
   worker.once('error',error=>{cleanup();reject(error);});worker.once('exit',()=>{cleanup();reject(new Error('worker_interrupted'));});
  });
  const current=listImportTasks(store,courseId).find(t=>t.id===taskId);if(current?.status!=='running')return;
  if(!result.passages.length)throw new Error(result.warnings.some(w=>w.includes('ocr_required'))?'ocr_required':'no_text_extracted');
  store.db.transaction(()=>{
   store.db.prepare("insert into material_revisions(source_id,course_id,revision,text,anchors,author,created_at) values (?,?,1,?,?,'extraction',?)").run(doc.id,courseId,result.passages.map(p=>p.text).join('\n\n'),JSON.stringify(result.passages.map(p=>p.anchor)),new Date().toISOString());
   store.db.prepare("update import_tasks set status='completed',progress=100,error=?,updated_at=? where id=?").run(result.warnings.length?result.warnings.join(' '):null,new Date().toISOString(),taskId);
  })();
 }catch(error){if(store.db.open)store.db.prepare("update import_tasks set status='failed',error=?,progress=0 where id=? and status='running'").run(error instanceof Error?error.message:'extraction_failed',taskId);}
}
