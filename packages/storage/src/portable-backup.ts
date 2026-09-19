import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {parseAppearance,parseCardLayout,isCourseModuleId} from '@collegenotes/domain';
import type {Store} from './database.js';
import {CourseError} from './courses.js';
import {exportCourse} from './course-transfer.js';
import {getAppearance, setAppearance} from './repos.js';
import {resolveInside} from './paths.js';

const MAX_BACKUP_BYTES=150*1024*1024;
const recordOrder=[
  'material_revisions','derivatives','embedding_indexes','semantic_chunks',
  'reading_annotations','reading_positions','research_sessions','research_sources','research_claims',
  'tutor_sessions','tutor_turns','study_activities','study_sources','study_attempts','study_schedule',
  'study_preferences','study_sessions','narration_assets','narration_playback','voice_interrupt_sessions',
  'recognition_transcripts','practice_observations','practice_media','practice_transcripts',
  'practice_annotations','practice_cue_cards','practice_rehearsals','practice_checklist','practice_history',
  'visual_experiments','drafts'
] as const;
type RecordTable=typeof recordOrder[number];
type Row=Record<string,unknown>;
type FileEntry={kind:'original'|'narration'|'practice';id:string;rel:string;bytes:Buffer};
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
const safeId=(value:unknown):value is string=>typeof value==='string'&&/^[a-z][a-z0-9_-]{1,100}$/i.test(value);
function object(value:unknown):Row{if(!value||typeof value!=='object'||Array.isArray(value))throw new CourseError('invalid_backup');return value as Row;}
function checkedRow(store:Store,table:string,row:Row){
  const columns=(store.db.prepare(`pragma table_info(${table})`).all() as Array<{name:string}>).map(column=>column.name);
  if(Object.keys(row).some(key=>!columns.includes(key))||columns.some(key=>!(key in row))||Object.values(row).some(value=>value!==null&&!['string','number'].includes(typeof value)))throw new CourseError('backup_version_unsupported',409);
  return columns;
}
function bytes(value:unknown,expectedLength:unknown,expectedHash:unknown):Buffer{
  if(typeof value!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw new CourseError('backup_corrupt');
  const buffer=Buffer.from(value,'base64');
  if(buffer.length!==expectedLength||sha(buffer)!==expectedHash)throw new CourseError('backup_corrupt');
  return buffer;
}
function snapshot(store:Store,courseId:string,options:{includeMedia:boolean;includePreferences:boolean}){
  const original=exportCourse(store,courseId);
  const data=structuredClone(original.data);
  if(!options.includeMedia){
    data.files=[];
    for(const table of ['narration_assets','narration_playback','voice_interrupt_sessions','practice_media','practice_transcripts','practice_annotations'] as const)data.records[table]=[];
    data.records.derivatives=(data.records.derivatives as Array<{kind:string}>).filter(row=>row.kind!=='audio');
    data.records.practice_observations=(data.records.practice_observations as Array<Row>).map(row=>({...row,media_id:null,timestamp_ms:null}));
    data.records.practice_rehearsals=(data.records.practice_rehearsals as Array<Row>).map(row=>({...row,media_id:null}));
  }
  const courseExport={...original,data,dataChecksum:sha(JSON.stringify(data))};
  const body={courseExport,mediaPolicy:options.includeMedia?'included':'excluded',modelPolicy:'external-models-excluded',appearance:options.includePreferences?getAppearance(store):null};
  return {format:'collegenotes-portable-backup',version:1,createdAt:new Date().toISOString(),checksumAlgorithm:'sha256',dataChecksum:sha(JSON.stringify(body)),data:body};
}
export function createPortableBackup(store:Store,courseId:string,options:{includeMedia?:boolean;includePreferences?:boolean}={}){
  const result=snapshot(store,courseId,{includeMedia:options.includeMedia!==false,includePreferences:options.includePreferences===true});
  if(Buffer.byteLength(JSON.stringify(result))>MAX_BACKUP_BYTES)throw new CourseError('backup_too_large',409);
  return result;
}
function validated(store:Store,input:unknown){
  const envelope=object(input);
  if(envelope.format!=='collegenotes-portable-backup'||envelope.version!==1)throw new CourseError('backup_version_unsupported',409);
  if(Buffer.byteLength(JSON.stringify(input))>MAX_BACKUP_BYTES)throw new CourseError('backup_too_large',409);
  const outer=object(envelope.data);
  if(envelope.dataChecksum!==sha(JSON.stringify(outer)))throw new CourseError('backup_corrupt',409);
  if(!['included','excluded'].includes(String(outer.mediaPolicy))||outer.modelPolicy!=='external-models-excluded')throw new CourseError('invalid_backup');
  const inner=object(outer.courseExport);
  if(inner.format!=='collegenotes-course'||inner.version!==1)throw new CourseError('backup_version_unsupported',409);
  const data=object(inner.data);
  if(inner.dataChecksum!==sha(JSON.stringify(data)))throw new CourseError('backup_corrupt',409);
  const course=object(data.course),courseId=course.id;
  if(!safeId(courseId)||typeof course.name!=='string'||!course.name.trim())throw new CourseError('invalid_backup');
  const records=object(data.records),sourceRows=data.sources,mediaFiles=data.files;
  if(!Array.isArray(sourceRows)||!Array.isArray(mediaFiles)||!Array.isArray(data.modules))throw new CourseError('invalid_backup');
  if(Object.keys(records).some(table=>!recordOrder.includes(table as RecordTable))||recordOrder.some(table=>!Array.isArray(records[table])))throw new CourseError('backup_version_unsupported',409);
  const files:FileEntry[]=[];
  for(const source of sourceRows){
    const row=object(source);
    if(!safeId(row.id)||row.course_id!==courseId||'stored_rel_path'in row)throw new CourseError('invalid_backup');
    const shape={...row};delete shape.contentBase64;
    checkedRow(store,'source_documents',{...shape,stored_rel_path:path.join('originals',`${row.id}_restored.bin`)});
    if(row.contentBase64===null){
      if(row.deleted_at===null||row.cleanup_state!=='complete')throw new CourseError('backup_missing_original',409);
    }else{
      const content=bytes(row.contentBase64,row.byte_length,row.checksum);
      files.push({kind:'original',id:row.id,rel:path.join('originals',`${row.id}_restored.bin`),bytes:content});
    }
  }
  const requiredMedia=new Map<string,Row>();
  for(const kind of ['narration','practice'] as const){
    const table=kind==='narration'?'narration_assets':'practice_media';
    for(const raw of records[table] as unknown[]){
      const row=object(raw);
      if(!safeId(row.id)||row.course_id!==courseId||typeof row.rel_path!=='string'||path.dirname(row.rel_path)!==path.join(kind,courseId)||!path.basename(row.rel_path).startsWith(`${row.id}.`))throw new CourseError('backup_path_rejected',409);
      requiredMedia.set(`${kind}:${row.id}`,row);
    }
  }
  for(const raw of mediaFiles){
    const file=object(raw),kind=file.kind;
    if((kind!=='narration'&&kind!=='practice')||!safeId(file.id))throw new CourseError('invalid_backup');
    const key=`${kind}:${file.id}`,row=requiredMedia.get(key);
    if(!row)throw new CourseError('invalid_backup');
    const content=bytes(file.contentBase64,file.byteLength,file.checksum);
    if(content.length!==row.byte_length)throw new CourseError('backup_corrupt',409);
    files.push({kind,id:file.id,rel:path.join(kind,courseId,`${file.id}${kind==='narration'?'.wav':'.bin'}`),bytes:content});
    requiredMedia.delete(key);
  }
  if(requiredMedia.size)throw new CourseError('backup_missing_media',409);
  if(outer.mediaPolicy==='excluded'&&mediaFiles.length)throw new CourseError('invalid_backup');
  const filePaths=new Set(files.map(file=>file.rel));
  if(filePaths.size!==files.length)throw new CourseError('invalid_backup');
  for(const table of recordOrder){
    for(const raw of records[table] as unknown[]){
      const row=object(raw);
      checkedRow(store,table,row);
      if(table==='study_sources')continue;
      if(row.course_id!==courseId)throw new CourseError('backup_course_mismatch',409);
    }
  }
  const sourceIds=new Set(sourceRows.map(raw=>(raw as Row).id));
  for(const table of recordOrder)for(const row of records[table] as Row[]){
    if(typeof row.source_id==='string'&&!sourceIds.has(row.source_id))throw new CourseError('backup_course_mismatch',409);
  }
  const activityIds=new Set((records.study_activities as Row[]).map(row=>row.id));
  if((records.study_sources as Row[]).some(row=>!activityIds.has(row.activity_id)))throw new CourseError('backup_course_mismatch',409);
  const modules=(data.modules as unknown[]).map(raw=>{
    const module=object(raw);
    if(!isCourseModuleId(module.moduleId)||module.schemaVersion!==1||typeof module.enabled!=='boolean')throw new CourseError('backup_version_unsupported',409);
    return module as {moduleId:string;schemaVersion:1;enabled:boolean};
  });
  if(new Set(modules.map(module=>module.moduleId)).size!==modules.length)throw new CourseError('invalid_backup');
  const moduleRecords=(Array.isArray(data.moduleRecords)?data.moduleRecords:modules.map(module=>({course_id:courseId,module_id:module.moduleId,schema_version:module.schemaVersion,enabled:module.enabled?1:0}))).map(raw=>{
    const row=object(raw);
    if(Object.keys(row).some(key=>!['course_id','module_id','schema_version','enabled'].includes(key))||row.course_id!==courseId||!safeId(row.module_id)||!Number.isInteger(row.schema_version)||(row.schema_version as number)<1||(row.enabled!==0&&row.enabled!==1))throw new CourseError('invalid_backup');
    return row as {course_id:string;module_id:string;schema_version:number;enabled:0|1};
  });
  if(new Set(moduleRecords.map(row=>row.module_id)).size!==moduleRecords.length)throw new CourseError('invalid_backup');
  const layout=parseCardLayout(data.layout);
  let appearance=null;
  if(outer.appearance!==null){try{appearance=parseAppearance(outer.appearance);}catch{throw new CourseError('invalid_backup_appearance',409);}}
  const conflicts:string[]=[];
  if(store.db.prepare('select 1 from courses where id=?').get(courseId))conflicts.push('course_id_exists');
  for(const source of sourceRows){if(store.db.prepare('select 1 from source_documents where id=?').get((source as Row).id))conflicts.push('source_id_exists');}
  for(const table of recordOrder){
    for(const row of records[table] as Row[]){
      if(typeof row.id==='string'&&store.db.prepare(`select 1 from ${table} where id=?`).get(row.id))conflicts.push(`${table}_id_exists`);
      if(table==='drafts'&&store.db.prepare('select 1 from drafts where key=?').get(row.key))conflicts.push('draft_key_exists');
    }
  }
  for(const file of files){try{if(fs.existsSync(resolveInside(store.dataDir,file.rel)))conflicts.push('file_exists');}catch{conflicts.push('unsafe_path');}}
  return {course,courseId,records,sources:sourceRows as Row[],files,appearance,moduleRecords,layout,conflicts:[...new Set(conflicts)],mediaPolicy:outer.mediaPolicy};
}
export function previewPortableBackup(store:Store,input:unknown){
  const value=validated(store,input);
  return {courseId:value.courseId,courseName:value.course.name,sourceCount:value.sources.length,recordCount:recordOrder.reduce((n,table)=>n+(value.records[table] as Row[]).length,0),fileCount:value.files.length,mediaPolicy:value.mediaPolicy,appearanceAvailable:value.appearance!==null,conflicts:value.conflicts,canRestore:value.conflicts.length===0};
}
function insertRow(store:Store,table:string,row:Row){
  const columns=checkedRow(store,table,row);
  store.db.prepare(`insert into ${table} (${columns.join(',')}) values (${columns.map(()=>'?').join(',')})`).run(...columns.map(key=>row[key]));
}
export function restorePortableBackup(store:Store,input:unknown,options:{restorePreferences?:boolean}={}){
  const value=validated(store,input);
  if(value.conflicts.length)throw new CourseError('backup_conflict',409);
  if(options.restorePreferences&&value.appearance===null)throw new CourseError('backup_preferences_unavailable',409);
  const staging=resolveInside(store.dataDir,`.restore-${randomUUID()}`);
  const moved:string[]=[];
  fs.mkdirSync(staging,{mode:0o700});
  try{
    for(const file of value.files){
      const target=path.join(staging,file.rel);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,file.bytes,{flag:'wx',mode:0o600});
    }
    store.db.transaction(()=>{
      const c=value.course;
      store.db.prepare('insert into courses(id,name,description,created_at,updated_at,archived_at,trashed_at) values (?,?,?,?,?,?,?)').run(c.id,c.name,c.description,c.createdAt,c.updatedAt,c.archivedAt,c.trashedAt);
      for(const module of value.moduleRecords)store.db.prepare('insert into course_modules(course_id,module_id,schema_version,enabled) values (?,?,?,?)').run(value.courseId,module.module_id,module.schema_version,module.enabled);
      store.db.prepare('insert into card_layouts(course_id,payload) values (?,?)').run(value.courseId,JSON.stringify(value.layout));
      for(const source of value.sources){const row={...source};delete row.contentBase64;insertRow(store,'source_documents',{...row,stored_rel_path:path.join('originals',`${source.id}_restored.bin`)});}
      for(const table of recordOrder){for(const raw of value.records[table] as Row[]){
        const row={...raw};
        if(table==='narration_assets')row.rel_path=path.join('narration',value.courseId,`${row.id}.wav`);
        if(table==='practice_media')row.rel_path=path.join('practice',value.courseId,`${row.id}.bin`);
        insertRow(store,table,row);
      }}
      for(const raw of value.records.semantic_chunks as Row[])store.db.prepare('insert into material_fts(chunk_id,course_id,source_id,text) values (?,?,?,?)').run(raw.id,raw.course_id,raw.source_id,raw.text);
      store.db.prepare("update embedding_indexes set status='stale',rebuild_reason='portable_restore' where course_id=?").run(value.courseId);
      for(const file of value.files){
        const destination=resolveInside(store.dataDir,file.rel);
        fs.mkdirSync(path.dirname(destination),{recursive:true});
        if(fs.existsSync(destination))throw new CourseError('backup_conflict',409);
        fs.renameSync(path.join(staging,file.rel),destination);
        moved.push(destination);
      }
      if(options.restorePreferences&&value.appearance)setAppearance(store,value.appearance);
    })();
    return {restored:true,courseId:value.courseId,preferencesRestored:Boolean(options.restorePreferences)};
  }catch(error){
    for(const file of moved.reverse())try{fs.unlinkSync(file);}catch{/* retryable residue is reported */}
    if(error instanceof CourseError)throw error;
    throw new CourseError('restore_failed_retry',409);
  }finally{fs.rmSync(staging,{recursive:true,force:true});}
}
