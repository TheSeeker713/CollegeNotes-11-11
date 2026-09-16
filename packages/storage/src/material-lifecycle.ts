import fs from 'node:fs';
import path from 'node:path';
import type { Material } from '@collegenotes/domain';
import type { Store } from './database.js';
import { CourseError, requireCourse } from './courses.js';
import { checksum, readOriginal } from './repos.js';
import { resolveInside } from './paths.js';

export type ManagedMaterial = Material & { approvedRevision: number | null };
export type Revision = { revision: number; text: string; anchors: string; author: string; createdAt: string };
export function materialCollection(store: Store, courseId: string): ManagedMaterial[] {
  requireCourse(store, courseId);
  return store.db.prepare(`select id,course_id as courseId,filename,checksum,byte_length as byteLength,stored_rel_path as storedRelPath,
    created_at as createdAt,updated_at as updatedAt,kind,revision,approved_revision as approvedRevision,
    trashed_at as trashedAt,deleted_at as deletedAt,cleanup_state as cleanupState from source_documents where course_id=? order by created_at,id`).all(courseId) as ManagedMaterial[];
}
export function requireMaterial(store: Store, courseId: string, id: string, includeTrash = false): ManagedMaterial {
  const m = materialCollection(store, courseId).find(m => m.id === id);
  if (!m || (!includeTrash && (m.trashedAt || m.deletedAt || m.cleanupState !== 'none'))) throw new CourseError('material_unavailable', 404);
  return m;
}
function publicMaterial({storedRelPath:_private,...metadata}:ManagedMaterial){return metadata;}
export function materialDetail(store: Store, courseId: string, id: string) {
  const material = publicMaterial(requireMaterial(store, courseId, id));
  const revisions = store.db.prepare('select revision,text,anchors,author,created_at as createdAt from material_revisions where source_id=? and course_id=? order by revision desc').all(id, courseId) as Revision[];
  return { material, revisions };
}
function idle(store: Store, id: string) {
  if (store.db.prepare("select id from import_tasks where source_id=? and status='running'").get(id)) throw new CourseError('material_busy', 409);
}
export function correctMaterial(store: Store, courseId: string, id: string, body: unknown) {
  requireCourse(store, courseId, true); const m = requireMaterial(store, courseId, id); idle(store, id);
  const input = body as { text?: unknown; expectedRevision?: unknown } | null;
  if (input?.expectedRevision !== m.revision) throw new CourseError('revision_conflict', 409);
  if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 2_000_000 || input.text.includes('\0')) throw new CourseError('invalid_correction');
  const previous = materialDetail(store, courseId, id).revisions[0];
  if (!previous) throw new CourseError('extraction_required', 409);
  const now = new Date().toISOString();
  store.db.transaction(() => {
    store.db.prepare("insert into material_revisions(source_id,course_id,revision,text,anchors,author,created_at) values (?,?,?,?,?,'user',?)").run(id,courseId,m.revision+1,input.text,previous.anchors,now);
    store.db.prepare('update source_documents set revision=revision+1,approved_revision=null,updated_at=? where id=?').run(now,id);
  })();
  return materialDetail(store,courseId,id);
}
export function approveMaterial(store: Store, courseId: string, id: string, body: unknown) {
  requireCourse(store,courseId,true); const m=requireMaterial(store,courseId,id);idle(store,id);
  const input=body as {expectedRevision?:unknown;reviewed?:unknown}|null;
  if(input?.expectedRevision!==m.revision)throw new CourseError('revision_conflict',409);
  if(input.reviewed!==true)throw new CourseError('review_confirmation_required');
  if(!materialDetail(store,courseId,id).revisions.some(r=>r.revision===m.revision))throw new CourseError('extraction_required',409);
  store.db.prepare('update source_documents set approved_revision=revision,updated_at=? where id=?').run(new Date().toISOString(),id);
  return materialDetail(store,courseId,id);
}
export function trashMaterial(store:Store,courseId:string,id:string,restore=false) {
  requireCourse(store,courseId,true);const m=requireMaterial(store,courseId,id,true);idle(store,id);
  if(m.deletedAt || m.cleanupState!=='none')throw new CourseError('deletion_pending',409);
  store.db.transaction(()=>{
    store.db.prepare("update import_tasks set status='cancelled',error=null where source_id=? and status='queued'").run(id);
    store.db.prepare('update source_documents set trashed_at=?,updated_at=? where id=?').run(restore?null:new Date().toISOString(),new Date().toISOString(),id);
  })();
  return {id,restored:restore};
}
function checkedOriginal(store:Store,m:ManagedMaterial,allowMissing=false) {
  if(path.dirname(m.storedRelPath)!=='originals'||!path.basename(m.storedRelPath).startsWith(`${m.id}_`) || store.db.prepare('select id from source_documents where stored_rel_path=? and id<>?').get(m.storedRelPath,m.id))throw new CourseError('unsafe_original_path',409);
  let file:string;try{file=resolveInside(store.dataDir,m.storedRelPath);}catch{throw new CourseError('unsafe_original_path',409);}
  if(!fs.existsSync(file)){if(allowMissing)return {file,bytes:null};throw new CourseError('original_missing',409);}
  const bytes=readOriginal(store,m);if(bytes.length!==m.byteLength||checksum(bytes)!==m.checksum)throw new CourseError('original_checksum_mismatch',409);
  return {file,bytes};
}
export function deleteMaterial(store:Store,courseId:string,id:string,body:unknown) {
  requireCourse(store,courseId,true);const m=requireMaterial(store,courseId,id,true);idle(store,id);
  const input=body as {confirmation?:unknown;backupsAcknowledged?:unknown}|null;
  if(input?.confirmation!==m.filename||input.backupsAcknowledged!==true)throw new CourseError('deletion_confirmation_required');
  const {file}=checkedOriginal(store,m,Boolean(m.deletedAt));
  // Hide and invalidate before filesystem cleanup; a crash leaves an explicit retryable record.
  store.db.transaction(()=>{
    store.db.prepare("update source_documents set deleted_at=?,cleanup_state='pending' where id=?").run(m.deletedAt??new Date().toISOString(),id);
    store.db.prepare("update import_tasks set status='cancelled' where source_id=? and status='queued'").run(id);
  })();
  try {
    if(fs.existsSync(file))fs.unlinkSync(file);
    store.db.transaction(()=>{
      store.db.prepare('delete from derivatives where source_id=? and course_id=?').run(id,courseId);
      store.db.prepare('delete from material_revisions where source_id=? and course_id=?').run(id,courseId);
      store.db.prepare('delete from jobs where source_id=? and course_id=?').run(id,courseId);
      store.db.prepare('update embedding_indexes set source_revisions=json_remove(source_revisions,?) where course_id=?').run(`$."${id}"`,courseId);
      store.db.prepare('delete from source_documents where id=? and course_id=?').run(id,courseId);
    })();
  }catch{store.db.prepare("update source_documents set cleanup_state='failed' where id=?").run(id);throw new CourseError('deletion_incomplete_retry',409);}
  return {deleted:true};
}
export function exportMaterials(store:Store,courseId:string,ids:unknown) {
  requireCourse(store,courseId);
  if(!Array.isArray(ids)||!ids.length||ids.length>50||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw new CourseError('invalid_selection');
  return store.db.transaction(()=>{
    const materials=ids.map(id=>requireMaterial(store,courseId,id));
    if(materials.reduce((n,m)=>n+m.byteLength,0)>100*1024*1024)throw new CourseError('export_selection_too_large');
    const sources=materials.map(m=>{return {...publicMaterial(m),originalBase64:checkedOriginal(store,m).bytes!.toString('base64'),revisions:materialDetail(store,courseId,m.id).revisions,annotations:store.db.prepare('select * from reading_annotations where source_id=? and course_id=?').all(m.id,courseId),readingPosition:store.db.prepare('select * from reading_positions where source_id=? and course_id=?').get(m.id,courseId)??null};});
    const data={courseId,sources};return {format:'collegenotes-materials',version:1,exportedAt:new Date().toISOString(),dataChecksum:checksum(Buffer.from(JSON.stringify(data))),data};
  })();
}
