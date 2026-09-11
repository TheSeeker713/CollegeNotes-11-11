import fs from 'node:fs';
import path from 'node:path';
import { createId } from '@collegenotes/domain';
import type { Store } from './database.js';
import { CourseError, requireCourse } from './courses.js';
import { checksum, storeOriginal } from './repos.js';
import { resolveInside } from './paths.js';
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export type ImportTask = { id: string; courseId: string; sourceId: string; status: 'queued'|'running'|'completed'|'failed'|'cancelled'; error: string|null; progress: number; createdAt: string; updatedAt: string };
export function validateImport(filename: unknown, bytes: Buffer): string {
  if (typeof filename !== 'string' || !filename.trim() || filename.length > 240 || /[/\\]/.test(filename) || filename.includes('\0')) throw new CourseError('invalid_filename');
  if (!bytes.length || bytes.length > MAX_IMPORT_BYTES) throw new CourseError('invalid_file_size');
  const ext=path.extname(filename).toLowerCase();
  const valid = ext === '.txt' || ext === '.md' ? (()=>{try {new TextDecoder('utf-8',{fatal:true}).decode(bytes);return !bytes.includes(0);}catch{return false;}})() : ext === '.pdf' ? bytes.subarray(0,5).toString()==='%PDF-' : ['.docx','.epub'].includes(ext) ? bytes.subarray(0,4).equals(Buffer.from([80,75,3,4])) : ext === '.png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : ['.jpg','.jpeg'].includes(ext) ? bytes[0]===255&&bytes[1]===216&&bytes[2]===255 : false;
  if (!['.txt','.md','.pdf','.docx','.epub','.png','.jpg','.jpeg'].includes(ext)) throw new CourseError('unsupported_format');
  if (!valid) throw new CourseError('invalid_file_content');
  return ext;
}
export function listImportTasks(store: Store, courseId: string): ImportTask[] {
  requireCourse(store,courseId);
  return store.db.prepare('select id,course_id as courseId,source_id as sourceId,status,error,progress,created_at as createdAt,updated_at as updatedAt from import_tasks where course_id=? order by created_at,id').all(courseId) as ImportTask[];
}
export function queueImport(store: Store, courseId: string, filename: string, bytes: Buffer, kind: 'imported'|'note'='imported'): { sourceId: string; task: ImportTask|null; duplicate: boolean } {
  requireCourse(store,courseId,true); validateImport(filename,bytes);
  if (kind !== 'imported' && kind !== 'note') throw new CourseError('invalid_material_kind');
  const existing=store.db.prepare('select id from source_documents where course_id=? and checksum=? and kind=? and trashed_at is null and deleted_at is null and cleanup_state=\'none\'').get(courseId,checksum(bytes),kind) as {id:string}|undefined;
  if(existing) return {sourceId:existing.id,task:listImportTasks(store,courseId).find(t=>t.sourceId===existing.id)??null,duplicate:true};
  const source=storeOriginal(store,courseId,filename,bytes); const now=new Date().toISOString();
  const task:ImportTask={id:createId('imp'),courseId,sourceId:source.id,status:'queued',error:null,progress:0,createdAt:now,updatedAt:now};
  try {store.db.transaction(()=>{
    store.db.prepare('update source_documents set kind=? where id=?').run(kind,source.id);
    store.db.prepare('insert into import_tasks(id,course_id,source_id,status,error,progress,created_at,updated_at) values (?,?,?,?,?,?,?,?)').run(task.id,courseId,source.id,task.status,null,0,now,now);
  })();} catch(error) {store.db.prepare('delete from source_documents where id=?').run(source.id);fs.unlinkSync(resolveInside(store.dataDir,source.storedRelPath));throw error;}
  return {sourceId:source.id,task,duplicate:false};
}
export function changeImportTask(store:Store,courseId:string,id:string,action:'cancel'|'retry'):ImportTask {
  requireCourse(store,courseId,true);const task=listImportTasks(store,courseId).find(t=>t.id===id);if(!task)throw new CourseError('import_not_found',404);
  if(action==='retry' && !['failed','cancelled'].includes(task.status))throw new CourseError('import_not_retryable',409);
  if(action==='cancel' && task.status==='completed')throw new CourseError('import_already_completed',409);
  store.db.prepare('update import_tasks set status=?,error=null,progress=0,updated_at=? where id=?').run(action==='cancel'?'cancelled':'queued',new Date().toISOString(),id);
  return listImportTasks(store,courseId).find(t=>t.id===id)!;
}
export function recoverImportTasks(store:Store):void {
  store.db.prepare("update import_tasks set status='failed',error='interrupted_retry_available',progress=0 where status='running'").run();
}
