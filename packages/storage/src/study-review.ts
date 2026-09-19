import { nextReview } from '@collegenotes/learning';
import type { StudyProgress, ReviewItem } from '@collegenotes/domain';
import type { Store } from './database.js';
import { CourseError } from './courses.js';
import { listActivities, requireActivity, requireStudy, studyAttempts } from './study.js';
type Schedule = {activity_id:string;course_id:string;due_at:string;interval_days:number;last_attempt_id:string|null;undo_json:string|null};
function clock(now:string){if(!Number.isFinite(Date.parse(now)))throw new CourseError('invalid_review_clock');return new Date(now).toISOString();}
export function scheduleAttempt(store:Store,courseId:string,attemptId:string,now:string) {
 const attempt=studyAttempts(store,courseId).find(a=>a.id===attemptId);
 if(!attempt?.feedback||attempt.status!=='submitted')throw new CourseError('submitted_attempt_required');
 const previous=store.db.prepare('select * from study_schedule where activity_id=? and course_id=?').get(attempt.activityId,courseId) as Schedule|undefined;
 if(previous?.last_attempt_id===attemptId)return;
 const next=nextReview(clock(now),previous?.interval_days??0,attempt.feedback,attempt.hintCount>0);
 store.db.prepare('insert into study_schedule values (?,?,?,?,?,null) on conflict(activity_id) do update set due_at=excluded.due_at,interval_days=excluded.interval_days,last_attempt_id=excluded.last_attempt_id,undo_json=null').run(attempt.activityId,courseId,next.dueAt,next.intervalDays,attemptId);
}
export function setStudyWorkload(store:Store,courseId:string,input:unknown) {
 requireStudy(store,courseId,true);
 const limit=(input as {dailyLimit?:unknown}|null)?.dailyLimit;
 if(!Number.isInteger(limit)||Number(limit)<1||Number(limit)>50)throw new CourseError('invalid_daily_limit');
 store.db.prepare('insert into study_preferences values (?,?) on conflict(course_id) do update set daily_limit=excluded.daily_limit').run(courseId,Number(limit));
 return studyProgress(store,courseId);
}
export function studyProgress(store:Store,courseId:string,now=new Date().toISOString()):StudyProgress {
 requireStudy(store,courseId);now=clock(now);const today=now.slice(0,10);
 const activities=listActivities(store,courseId),ready=activities.filter(a=>a.status==='ready'),history=studyAttempts(store,courseId);
 const schedules=store.db.prepare('select * from study_schedule where course_id=?').all(courseId) as Schedule[];
 const due:ReviewItem[]=ready.map(a=>{const s=schedules.find(s=>s.activity_id===a.id);return {activityId:a.id,title:a.title,dueAt:s?.due_at??a.createdAt,intervalDays:s?.interval_days??0,canUndo:Boolean(s?.undo_json)};}).filter(a=>a.dueAt<=now).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)||a.activityId.localeCompare(b.activityId));
 const dailyLimit=(store.db.prepare('select daily_limit from study_preferences where course_id=?').get(courseId) as {daily_limit:number}|undefined)?.daily_limit??5;
 const submitted=history.filter(h=>h.status==='submitted');
 const completedToday=new Set(submitted.filter(h=>h.submittedAt?.slice(0,10)===today).map(h=>h.activityId)).size;
 const current=submitted.filter(h=>ready.some(a=>a.id===h.activityId));
 const remainingToday=Math.max(0,dailyLimit-completedToday);
 return {dailyLimit,due:due.slice(0,remainingToday),dueTotal:due.length,remainingToday,history,submitted:submitted.length,correctUnaided:current.filter(h=>h.feedback?.outcome==='correct'&&!h.hintCount).length,assisted:current.filter(h=>h.hintCount>0).length,needsReview:current.filter(h=>h.feedback?.outcome==='needs_review').length,currentActivities:ready.length,staleActivities:activities.length-ready.length,explanation:'Practice evidence is not mastery or a course grade. Reading time and course completion do not award recall credit. Workload days use UTC; missed days keep overdue work without a streak penalty.'};
}
export function resetReview(store:Store,courseId:string,activityId:string,undo:boolean,now=new Date().toISOString()) {
 requireStudy(store,courseId,true);requireActivity(store,courseId,activityId);clock(now);
 return store.db.transaction(()=>{
 const previous=store.db.prepare('select * from study_schedule where activity_id=? and course_id=?').get(activityId,courseId) as Schedule|undefined;
 if(undo){
  if(!previous?.undo_json)throw new CourseError('review_undo_unavailable',409);
  const saved=JSON.parse(previous.undo_json) as Schedule|null;
  if(saved)store.db.prepare('update study_schedule set due_at=?,interval_days=?,last_attempt_id=?,undo_json=null where activity_id=?').run(saved.due_at,saved.interval_days,saved.last_attempt_id,activityId);
  else store.db.prepare('delete from study_schedule where activity_id=?').run(activityId);
 }else{
  if(previous?.undo_json)throw new CourseError('review_already_reset',409);
  store.db.prepare('insert into study_schedule values (?,?,?,0,null,?) on conflict(activity_id) do update set due_at=excluded.due_at,interval_days=0,last_attempt_id=null,undo_json=excluded.undo_json').run(activityId,courseId,now,JSON.stringify(previous??null));
 }
 return studyProgress(store,courseId,now);
 })();
}
