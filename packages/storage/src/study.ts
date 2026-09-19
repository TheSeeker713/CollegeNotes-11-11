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
