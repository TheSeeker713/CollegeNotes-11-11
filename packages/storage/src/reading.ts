import {readingLocations,type ReadingAnchor,type ReadingDocument} from '@collegenotes/domain';
import {materialDetail} from './material-lifecycle.js';
import {CourseError,requireCourse} from './courses.js';
import type {Store} from './database.js';
export function readingDocument(store:Store,courseId:string,sourceId:string,revision?:number):ReadingDocument{
 requireCourse(store,courseId,true);const detail=materialDetail(store,courseId,sourceId);const r=detail.revisions.find(r=>r.revision===(revision??detail.material.revision));if(!r)throw new CourseError('reading_revision_unavailable',404);
 const anchors=JSON.parse(r.anchors) as ReadingAnchor[];const exact=r.author==='extraction';return {sourceId,courseId,filename:detail.material.filename,revision:r.revision,text:r.text,locations:readingLocations(r.text,anchors,exact),exactOriginalMapping:exact,warnings:['Reflowed extraction may omit tables, figures, equations or layout. Check the original.',...(exact?[]:['Corrected text has revision-specific offsets; original page alignment is not guaranteed.'])]};
}

import {createId,type Annotation,type ReadingPosition} from '@collegenotes/domain';
const annotationColumns='id,course_id as courseId,source_id as sourceId,revision,kind,start_offset as start,end_offset as end,quote,note,version,created_at as createdAt,updated_at as updatedAt';
export function readingAnnotations(store:Store,c:string,s:string){readingDocument(store,c,s);return store.db.prepare(`select ${annotationColumns} from reading_annotations where course_id=? and source_id=? order by revision desc,start_offset,created_at`).all(c,s) as Annotation[];}
function range(text:string,start:unknown,end:unknown){if(!Number.isInteger(start)||!Number.isInteger(end)||Number(start)<0||Number(end)<Number(start)||Number(end)>text.length)throw new CourseError('invalid_reading_range');}
export function addAnnotation(store:Store,c:string,s:string,body:unknown){
 const b=body as Partial<Annotation>|null;if(!b||!Number.isInteger(b.revision))throw new CourseError('invalid_annotation');const d=readingDocument(store,c,s,b.revision);
 range(d.text,b.start,b.end);if(!['highlight','note','bookmark'].includes(b.kind??'')||typeof b.note!=='string'||b.note.length>20000||b.quote!==d.text.slice(b.start,b.end)||Number(b.end)-Number(b.start)>20000||b.kind!=='bookmark'&&b.start===b.end)throw new CourseError('invalid_annotation');
 const id=createId('annotation'),now=new Date().toISOString();store.db.prepare('insert into reading_annotations values (?,?,?,?,?,?,?,?,?,1,?,?)').run(id,c,s,b.revision,b.kind,b.start,b.end,b.quote,b.note,now,now);return readingAnnotations(store,c,s).find(a=>a.id===id)!;
}
export function changeAnnotation(store:Store,c:string,s:string,id:string,body:unknown,remove=false){
 readingDocument(store,c,s);const b=body as {version?:unknown;note?:unknown}|null;const a=readingAnnotations(store,c,s).find(a=>a.id===id);if(!a)throw new CourseError('annotation_unavailable',404);if(b?.version!==a.version)throw new CourseError('annotation_conflict',409);
 if(remove){store.db.prepare('delete from reading_annotations where id=?').run(id);return {deleted:true};}
 if(typeof b.note!=='string'||b.note.length>20000)throw new CourseError('invalid_annotation');store.db.prepare('update reading_annotations set note=?,version=version+1,updated_at=? where id=?').run(b.note,new Date().toISOString(),id);return readingAnnotations(store,c,s).find(a=>a.id===id)!;
}
export function readingPosition(store:Store,c:string,s:string,revision?:number):ReadingPosition|null{
 readingDocument(store,c,s);const r=store.db.prepare('select payload,version from reading_positions where course_id=? and source_id=? and (? is null or revision=?) order by updated_at desc limit 1').get(c,s,revision??null,revision??null) as {payload:string;version:number}|undefined;return r?{frameScrollTop:0,...JSON.parse(r.payload),version:r.version}:null;
}
export function saveReadingPosition(store:Store,c:string,s:string,body:unknown):ReadingPosition{
 const b=body as Partial<ReadingPosition>|null;if(!b||!Number.isInteger(b.revision))throw new CourseError('invalid_reading_position');const d=readingDocument(store,c,s,b.revision);range(d.text,b.offset,b.offset);range(d.text,b.selectionStart,b.selectionEnd);
 if(!['reflow','original'].includes(b.view??'')||!Number.isFinite(b.scrollTop)||Number(b.scrollTop)<0||Number(b.scrollTop)>10000000||!Number.isFinite(b.frameScrollTop??0)||Number(b.frameScrollTop??0)<0||Number(b.frameScrollTop??0)>10000000||!Number.isInteger(b.page)||Number(b.page)<1||Number(b.page)>250||!Number.isInteger(b.chapter)||Number(b.chapter)<0||Number(b.chapter)>499||typeof b.draft!=='string'||b.draft.length>20000)throw new CourseError('invalid_reading_position');
 const existing=readingPosition(store,c,s,b.revision);if(b.version!==(existing?.version??0))throw new CourseError('reading_position_conflict',409);
 const payload={revision:b.revision,offset:b.offset,view:b.view,scrollTop:b.scrollTop,frameScrollTop:b.frameScrollTop??0,page:b.page,chapter:b.chapter,draft:b.draft,selectionStart:b.selectionStart,selectionEnd:b.selectionEnd};const version=(existing?.version??0)+1;const latest=store.db.prepare('select max(updated_at) as at from reading_positions').get() as {at:string|null};const now=new Date(Math.max(Date.now(),(Date.parse(latest.at??'')||0)+1)).toISOString();
 store.db.prepare('insert into reading_positions values (?,?,?,?,?,?) on conflict(source_id,revision) do update set revision=excluded.revision,payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at').run(s,c,b.revision,JSON.stringify(payload),version,now);return {...payload,version} as ReadingPosition;
}

export function lastReadingSource(store:Store,c:string){
 requireCourse(store,c,true);return store.db.prepare("select p.source_id as sourceId,p.revision from reading_positions p join source_documents s on s.id=p.source_id and s.course_id=p.course_id where p.course_id=? and s.trashed_at is null and s.deleted_at is null and s.cleanup_state='none' order by p.updated_at desc limit 1").get(c)??null;
}
