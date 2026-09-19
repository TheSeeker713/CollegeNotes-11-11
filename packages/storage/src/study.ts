import { createId, type StudyActivity } from '@collegenotes/domain';
import { parseActivity } from '@collegenotes/learning';
import type { Store } from './database.js';
import { CourseError, moduleEnabled, requireCourse } from './courses.js';
import { materialDetail } from './material-lifecycle.js';
export function requireStudy(store: Store, courseId: string, write = false) {
  requireCourse(store, courseId, write);
  if (!moduleEnabled(store, courseId, 'study')) throw new CourseError('study_module_disabled', 409);
}
export function createActivity(store: Store, courseId: string, input: unknown): StudyActivity {
  requireStudy(store, courseId, true);
  let template;
  try { template = parseActivity(input); } catch (e) { throw new CourseError(e instanceof Error ? e.message : 'invalid_activity'); }
  for (const anchor of template.sources) {
    const { material, revisions } = materialDetail(store, courseId, anchor.sourceId);
    const revision = revisions.find(r => r.revision === anchor.revision);
    if (material.revision !== anchor.revision || material.approvedRevision !== anchor.revision || !revision || revision.text.slice(anchor.start, anchor.end) !== anchor.quote || anchor.end > revision.text.length) throw new CourseError('activity_source_mismatch', 409);
  }
  const activity: StudyActivity = { ...template, id: createId('activity'), courseId, status: 'ready', createdAt: new Date().toISOString() };
  store.db.transaction(() => {
    store.db.prepare('insert into study_activities values (?,?,?,?,?)').run(activity.id, courseId, JSON.stringify(template), activity.status, activity.createdAt);
    for (const s of new Map(template.sources.map(s => [s.sourceId, s])).values()) store.db.prepare('insert into study_sources values (?,?,?)').run(activity.id, s.sourceId, s.revision);
  })();
  return activity;
}
export function listActivities(store: Store, courseId: string): StudyActivity[] {
  requireStudy(store, courseId);
  const rows = store.db.prepare('select * from study_activities where course_id=? order by created_at,id').all(courseId) as { id: string; payload: string; status: 'ready' | 'stale'; created_at: string }[];
  return rows.map(r => ({ ...parseActivity(JSON.parse(r.payload)), id: r.id, courseId, status: r.status, createdAt: r.created_at }));
}
export function requireActivity(store: Store, courseId: string, id: string): StudyActivity {
  const activity = listActivities(store, courseId).find(a => a.id === id);
  if (!activity) throw new CourseError('activity_unavailable', 404);
  if (activity.status !== 'ready') throw new CourseError('activity_needs_rebuild', 409);
  return activity;
}
export function deleteActivity(store: Store, courseId: string, id: string) {
  requireStudy(store, courseId, true);
  store.db.prepare('delete from study_activities where id=? and course_id=?').run(id, courseId);
  return { deleted: true };
}

import { scheduleAttempt } from './study-review.js';
import { scoreActivity } from '@collegenotes/learning';
import type { StudyAttempt, AttemptView } from '@collegenotes/domain';
export function startAttempt(store: Store, courseId: string, activityId: string): AttemptView {
  requireStudy(store, courseId, true);
  const a = requireActivity(store, courseId, activityId);
  const id = createId('attempt');
  const response = a.kind === 'ordering' ? a.items : Array.from({length:a.answer.length},()=> '');
  store.db.prepare('insert into study_attempts(id,course_id,activity_id,response,status,created_at) values (?,?,?,?,?,?)').run(id,courseId,activityId,JSON.stringify(response),'draft',new Date().toISOString());
  return getAttempt(store,courseId,id);
}
export function studyAttempts(store:Store,courseId:string): StudyAttempt[] {
  requireStudy(store,courseId);
  const rows=store.db.prepare('select * from study_attempts where course_id=? order by created_at,id').all(courseId) as Array<{id:string;course_id:string;activity_id:string;response:string;teach_back:string;hint_count:number;revealed:number;status:'draft'|'submitted';feedback:string|null;version:number;created_at:string;submitted_at:string|null}>;
  return rows.map(r=>({id:r.id,courseId:r.course_id,activityId:r.activity_id,response:JSON.parse(r.response),teachBack:r.teach_back,hintCount:r.hint_count,revealed:Boolean(r.revealed),status:r.status,feedback:r.feedback?JSON.parse(r.feedback):null,version:r.version,createdAt:r.created_at,submittedAt:r.submitted_at}));
}
export function getAttempt(store:Store,courseId:string,id:string):AttemptView {
  const attempt=studyAttempts(store,courseId).find(a=>a.id===id);
  if(!attempt)throw new CourseError('attempt_unavailable',404);
  const {answer,rationale,hints,...activity}=requireActivity(store,courseId,attempt.activityId);
  return {attempt,activity,visibleHints:hints.slice(0,attempt.hintCount),hintTotal:hints.length,solution:attempt.revealed?{answer,rationale}:null};
}
export function updateAttempt(store:Store,courseId:string,id:string,action:'save'|'hint'|'submit'|'reveal',input:unknown,now=new Date().toISOString()):AttemptView {
  requireStudy(store,courseId,true);
  const body=input as {version?:unknown;response?:unknown;teachBack?:unknown}|null;
  return store.db.transaction(()=>{
    const view=getAttempt(store,courseId,id),a=view.attempt;
    // Submission retries return the single durable result, even if the first response was lost.
    if(action==='submit'&&a.status==='submitted')return view;
    if(body?.version!==a.version)throw new CourseError('attempt_version_conflict',409);
    if(action==='reveal') {
      if(a.status!=='submitted')throw new CourseError('attempt_before_reveal',409);
      store.db.prepare('update study_attempts set revealed=1,version=version+1 where id=?').run(id);
    } else {
      if(a.status!=='draft')throw new CourseError('attempt_already_submitted',409);
      if(action==='save') {
        if(!Array.isArray(body.response)||body.response.length!==a.response.length||body.response.some(v=>typeof v!=='string'||v.length>10000||v.includes('\0'))||typeof body.teachBack!=='string'||body.teachBack.length>20000||body.teachBack.includes('\0'))throw new CourseError('invalid_attempt_draft');
        store.db.prepare('update study_attempts set response=?,teach_back=?,version=version+1 where id=?').run(JSON.stringify(body.response),body.teachBack,id);
      } else if(action==='hint') {
        store.db.prepare('update study_attempts set hint_count=?,version=version+1 where id=?').run(Math.min(a.hintCount+1,view.hintTotal),id);
      } else {
        const activity=requireActivity(store,courseId,a.activityId);
        if(activity.kind==='prediction'&&!a.teachBack.trim())throw new CourseError('prediction_explanation_required');
        let feedback;try{feedback=scoreActivity(activity,a.response);}catch{throw new CourseError('complete_response_required');}
        store.db.prepare("update study_attempts set status='submitted',feedback=?,submitted_at=?,version=version+1 where id=?").run(JSON.stringify(feedback),now,id);
        scheduleAttempt(store,courseId,id,now);
      }
    }
    return getAttempt(store,courseId,id);
  })();
}
