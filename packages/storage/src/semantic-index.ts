import {createId} from '@collegenotes/domain';
import type {Store} from './database.js';
import {CourseError,requireCourse} from './courses.js';
export type IndexModel={id:string;version:string;checksum:string};
export type IndexChunk={sourceId:string;revision:number;ordinal:number;text:string;start:number;end:number;anchors:string};
export type Snapshot={token:string;courseId:string;model:IndexModel;sources:Record<string,number>;chunks:IndexChunk[]};
export type IndexStatus={id:string;status:string;rebuildReason:string|null;modelId:string;modelVersion:string;weightsChecksum:string;sourceRevisions:string};
export function indexStatus(store:Store,courseId:string):IndexStatus|null{
 requireCourse(store,courseId);
 return store.db.prepare('select id,status,rebuild_reason as rebuildReason,model_id as modelId,model_version as modelVersion,weights_checksum as weightsChecksum,source_revisions as sourceRevisions from embedding_indexes where id=?').get(`semantic:${courseId}`) as IndexStatus??null;
}
function approved(store:Store,courseId:string){
 return store.db.prepare(`select s.id,s.revision,r.text,r.anchors,r.author from source_documents s join material_revisions r on r.source_id=s.id and r.course_id=s.course_id and r.revision=s.revision
 where s.course_id=? and s.approved_revision=s.revision and s.trashed_at is null and s.deleted_at is null and s.cleanup_state='none' order by s.id`).all(courseId) as Array<{id:string;revision:number;text:string;anchors:string;author:string}>;
}
export function beginIndex(store:Store,courseId:string,model:IndexModel):Snapshot{
 requireCourse(store,courseId,true);if(indexStatus(store,courseId)?.status==='building')throw new CourseError('index_busy',409);
 const sources=approved(store,courseId);const chunks:IndexChunk[]=[];
 for(const s of sources)for(let start=0,ordinal=0;start<s.text.length;start+=208,ordinal++){
  const end=Math.min(start+240,s.text.length),text=s.text.slice(start,end);
  if(text.trim()){
   const refs=JSON.parse(s.anchors) as Array<{textStart?:number;textEnd?:number}>;
   const anchors=s.author==='extraction'?refs.filter(a=>a.textStart===undefined||a.textEnd===undefined||(a.textStart<end&&a.textEnd>start)):refs;
   chunks.push({sourceId:s.id,revision:s.revision,ordinal,text,start,end,anchors:JSON.stringify(anchors)});
  }
  if(chunks.length>10000)throw new CourseError('index_course_too_large');
  if(end===s.text.length)break;
 }
 const snapshot:Snapshot={token:createId('build'),courseId,model,sources:Object.fromEntries(sources.map(s=>[s.id,s.revision])),chunks};
 store.db.prepare(`insert into embedding_indexes(id,course_id,model_id,model_version,weights_checksum,status,source_revisions,rebuild_reason) values (?,?,?,?,?,'building',?,?)
 on conflict(id) do update set model_id=excluded.model_id,model_version=excluded.model_version,weights_checksum=excluded.weights_checksum,source_revisions=excluded.source_revisions where embedding_indexes.model_id<>excluded.model_id or embedding_indexes.model_version<>excluded.model_version or embedding_indexes.weights_checksum<>excluded.weights_checksum`).run(`semantic:${courseId}`,courseId,model.id,model.version,model.checksum,JSON.stringify(snapshot.sources),snapshot.token);
 // Model-change triggers mark stale first; only this new generation can publish.
 store.db.prepare("update embedding_indexes set status='building',rebuild_reason=?,source_revisions=? where id=?").run(snapshot.token,JSON.stringify(snapshot.sources),`semantic:${courseId}`);
 return snapshot;
}
export function finishIndex(store:Store,s:Snapshot,vectors:number[][]){
 requireCourse(store,s.courseId,true);
 const status=indexStatus(store,s.courseId);const sources=Object.fromEntries(approved(store,s.courseId).map(r=>[r.id,r.revision]));
 if(status?.status!=='building'||status.rebuildReason!==s.token||JSON.stringify(sources)!==JSON.stringify(s.sources))throw new CourseError('index_source_changed_retry',409);
 if(vectors.length!==s.chunks.length||vectors.some(v=>v.length!==384||v.some(n=>!Number.isFinite(n))||Math.abs(Math.hypot(...v)-1)>.01))throw new CourseError('invalid_embedding_vectors');
 store.db.transaction(()=>{
  store.db.prepare('delete from semantic_chunks where course_id=?').run(s.courseId);
  store.db.prepare('delete from material_fts where course_id=?').run(s.courseId);
  store.db.prepare("delete from derivatives where course_id=? and kind in ('embedding','lexical')").run(s.courseId);
  for(const [i,c] of s.chunks.entries()){
   const id=createId('chunk');store.db.prepare('insert into semantic_chunks(id,course_id,source_id,source_revision,model_version,ordinal,text,start_offset,end_offset,anchors,vector) values (?,?,?,?,?,?,?,?,?,?,?)').run(id,s.courseId,c.sourceId,c.revision,s.model.version,c.ordinal,c.text,c.start,c.end,c.anchors,JSON.stringify(vectors[i]));
   store.db.prepare('insert into material_fts(chunk_id,course_id,source_id,text) values (?,?,?,?)').run(id,s.courseId,c.sourceId,c.text);
  }
  for(const [source,revision] of Object.entries(s.sources))for(const kind of ['embedding','lexical'])store.db.prepare("insert into derivatives(id,course_id,source_id,source_revision,kind,status,model_version) values (?,?,?,?,?,'ready',?)").run(createId('drv'),s.courseId,source,revision,kind,s.model.version);
  store.db.prepare("update embedding_indexes set status='ready',rebuild_reason=null where id=?").run(`semantic:${s.courseId}`);
 })();
}
export function failIndex(store:Store,courseId:string,token:string,reason:string){
 if(store.db.open)store.db.prepare("update embedding_indexes set status='failed',rebuild_reason=? where id=? and status='building' and rebuild_reason=?").run(reason,`semantic:${courseId}`,token);
}
export function recoverIndexes(store:Store){store.db.prepare("update embedding_indexes set status='failed',rebuild_reason='interrupted_retry_available' where status='building'").run();}
export function cancelIndex(store:Store,courseId:string){requireCourse(store,courseId,true);store.db.prepare("update embedding_indexes set status='stale',rebuild_reason='cancelled_retry_available' where id=? and status='building'").run(`semantic:${courseId}`);}
export function semanticSearch(store:Store,courseId:string,vector:number[],model:IndexModel,limit=5){
 requireCourse(store,courseId,true);const status=indexStatus(store,courseId);
 if(status?.status!=='ready'||status.modelId!==model.id||status.modelVersion!==model.version||status.weightsChecksum!==model.checksum)throw new CourseError('index_rebuild_required',409);
 if(vector.length!==384||vector.some(n=>!Number.isFinite(n))||Math.abs(Math.hypot(...vector)-1)>.01||!Number.isInteger(limit)||limit<1||limit>20)throw new CourseError('invalid_search');
 const rows=store.db.prepare(`select c.source_id as sourceId,c.source_revision as revision,c.text,c.start_offset as start,c.end_offset as end,c.anchors,c.vector
 from semantic_chunks c join source_documents s on s.id=c.source_id and s.course_id=c.course_id
 where c.course_id=? and c.model_version=? and c.source_revision=s.revision and s.approved_revision=s.revision and s.trashed_at is null and s.deleted_at is null and s.cleanup_state='none'`).all(courseId,model.version) as Array<IndexChunk&{vector:string}>;
 return rows.map(({vector:stored,...r})=>{const v=JSON.parse(stored) as number[];return {...r,score:v.reduce((sum,x,i)=>sum+x*vector[i]!,0)};}).sort((a,b)=>b.score-a.score).slice(0,limit);
}
