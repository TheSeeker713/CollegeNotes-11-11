import {createId,type StudySession} from '@collegenotes/domain';
import type {Store} from './database.js';
import {CourseError} from './courses.js';
import {getAttempt,listActivities,requireStudy,startAttempt,studyAttempts} from './study.js';
import {studyProgress} from './study-review.js';
type Row={id:string;course_id:string;activity_ids:string;cursor:number;attempt_id:string|null;status:StudySession['status'];version:number};
function row(store:Store,courseId:string,id:string):Row {
 requireStudy(store,courseId);
 const r=store.db.prepare('select * from study_sessions where id=? and course_id=?').get(id,courseId) as Row|undefined;
 if(!r)throw new CourseError('study_session_unavailable',404);return r;
}
export function studySession(store:Store,courseId:string,id:string):StudySession {
 const r=row(store,courseId,id),ids=JSON.parse(r.activity_ids) as string[];
 let current:StudySession['current']=null,unavailable:string|null=null;
 if(r.status!=='complete'){
  if(r.attempt_id){try{current=getAttempt(store,courseId,r.attempt_id);}catch(e){if(e instanceof CourseError&&['activity_unavailable','activity_needs_rebuild','attempt_unavailable'].includes(e.code))unavailable='This source or activity changed. Your saved writing remains in history where available. Continue to the next available activity.';else throw e;}}
  else unavailable='This activity was deleted. Continue to the next available activity.';
 }
 return {id:r.id,courseId,status:r.status,position:r.cursor,total:ids.length,version:r.version,current,unavailable};
}
export function currentStudySession(store:Store,courseId:string):StudySession|null {
 requireStudy(store,courseId);
 const r=store.db.prepare("select id from study_sessions where course_id=? and status!='complete'").get(courseId) as {id:string}|undefined;
 return r?studySession(store,courseId,r.id):null;
}
function resumeOrStart(store:Store,courseId:string,activityId:string) {
 const saved=studyAttempts(store,courseId).filter(a=>a.activityId===activityId&&a.status==='draft').at(-1);
 return saved?getAttempt(store,courseId,saved.id):startAttempt(store,courseId,activityId);
}
export function openStudySession(store:Store,courseId:string,input:unknown):StudySession {
 requireStudy(store,courseId,true);
 const limit=(input as {limit?:unknown}|null)?.limit??5;
 if(!Number.isInteger(limit)||Number(limit)<1||Number(limit)>10)throw new CourseError('invalid_session_length');
 return store.db.transaction(()=>{
  const current=currentStudySession(store,courseId);if(current)return current;
  const ids=studyProgress(store,courseId).due.slice(0,Number(limit)).map(a=>a.activityId);
  if(!ids.length)throw new CourseError('no_due_activities',409);
  const attempt=resumeOrStart(store,courseId,ids[0]!),id=createId('study-session'),now=new Date().toISOString();
  store.db.prepare('insert into study_sessions(id,course_id,activity_ids,attempt_id,status,created_at,updated_at) values (?,?,?,?,?,?,?)').run(id,courseId,JSON.stringify(ids),attempt.attempt.id,'active',now,now);
  return studySession(store,courseId,id);
 })();
}
export function changeStudySession(store:Store,courseId:string,id:string,input:unknown):StudySession {
 requireStudy(store,courseId,true);
 const body=input as {version?:unknown;action?:unknown}|null;
 if(!body||!['pause','resume','continue','retry'].includes(String(body.action)))throw new CourseError('invalid_session_action');
 return store.db.transaction(()=>{
  const r=row(store,courseId,id);
  if(body.version!==r.version)throw new CourseError('study_session_version_conflict',409);
  if(r.status==='complete')throw new CourseError('study_session_complete',409);
  if(body.action==='pause'||body.action==='resume'){
   store.db.prepare('update study_sessions set status=?,version=version+1,updated_at=? where id=?').run(body.action==='pause'?'paused':'active',new Date().toISOString(),id);
  }else{
   if(r.status!=='active')throw new CourseError('resume_session_first',409);
   const view=studySession(store,courseId,id);
   if(view.current&&view.current.attempt.status!=='submitted')throw new CourseError('finish_attempt_before_continue',409);
   if(body.action==='retry'){
    if(!view.current)throw new CourseError('activity_unavailable',404);
    const attempt=startAttempt(store,courseId,view.current.activity.id);
    store.db.prepare('update study_sessions set attempt_id=?,version=version+1,updated_at=? where id=?').run(attempt.attempt.id,new Date().toISOString(),id);
   }else{
    const ids=JSON.parse(r.activity_ids) as string[],ready=new Set(listActivities(store,courseId).filter(a=>a.status==='ready').map(a=>a.id));
    let cursor=r.cursor+1;while(cursor<ids.length&&!ready.has(ids[cursor]!))cursor++;
    const attempt=cursor<ids.length?resumeOrStart(store,courseId,ids[cursor]!):null;
    store.db.prepare('update study_sessions set cursor=?,attempt_id=?,status=?,version=version+1,updated_at=? where id=?').run(cursor,attempt?.attempt.id??null,attempt?'active':'complete',new Date().toISOString(),id);
   }
  }
  return studySession(store,courseId,id);
 })();
}
