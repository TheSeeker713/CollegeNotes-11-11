import { COURSE_MODULES, isCourseModuleId, type ModuleSelection, type Course, type ModuleRegistry } from '@collegenotes/domain';
import type { Store } from './database.js';

export class CourseError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
const columns = 'id, name, description, created_at as createdAt, updated_at as updatedAt, archived_at as archivedAt, trashed_at as trashedAt';
export function courseCollection(store: Store): Course[] {
  return store.db.prepare(`select ${columns} from courses order by created_at, id`).all() as Course[];
}
export function requireCourse(store: Store, id: string, active = false): Course {
  const course = courseCollection(store).find((c) => c.id === id);
  if (!course || course.trashedAt || (active && course.archivedAt)) throw new CourseError('course_unavailable', 404);
  return course;
}
export function courseInput(body: unknown): { name: string; description: string } {
  if (!body || typeof body !== 'object') throw new CourseError('invalid_course');
  const { name, description = '' } = body as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 200 || Array.from(name).some((char) => char.charCodeAt(0) < 32)) throw new CourseError('invalid_name');
  if (typeof description !== 'string' || description.length > 10000 || description.includes('\0')) throw new CourseError('invalid_description');
  return { name: name.trim(), description };
}
export function editCourse(store: Store, id: string, body: unknown): Course {
  const input = courseInput(body);
  requireCourse(store, id);
  store.db.prepare('update courses set name=?, description=?, updated_at=? where id=?').run(input.name, input.description, new Date().toISOString(), id);
  return requireCourse(store, id);
}
export function archiveCourse(store: Store, id: string, archived: boolean): Course {
  requireCourse(store, id);
  if (store.db.prepare("select id from embedding_indexes where course_id=? and status='building'").get(id) || store.db.prepare("select id from import_tasks where course_id=? and status in ('queued','running')").get(id) || store.db.prepare("select id from jobs where course_id=? and status in ('queued','running')").get(id)) throw new CourseError('course_busy', 409);
  const now = new Date().toISOString();
  store.db.prepare('update courses set archived_at=?, updated_at=? where id=?').run(archived ? now : null, now, id);
  return requireCourse(store, id);
}

export function courseModules(store: Store, id: string): ModuleSelection[] {
  requireCourse(store, id);
  const rows = store.db.prepare('select module_id as moduleId, enabled from course_modules where course_id=?').all(id) as { moduleId: string; enabled: number }[];
  return COURSE_MODULES.map((m) => ({ moduleId: m.id, schemaVersion: 1, enabled: rows.some((r) => r.moduleId === m.id && r.enabled === 1) }));
}
export function setCourseModule(store: Store, id: string, moduleId: unknown, enabled: unknown): ModuleSelection[] {
  requireCourse(store, id, true);
  if (!isCourseModuleId(moduleId) || typeof enabled !== 'boolean') throw new CourseError('invalid_module');
  store.db.prepare('insert into course_modules(course_id,module_id,schema_version,enabled) values (?,?,1,?) on conflict(course_id,module_id) do update set enabled=excluded.enabled').run(id, moduleId, enabled ? 1 : 0);
  return courseModules(store, id);
}
export function moduleEnabled(store: Store, id: string, moduleId: string): boolean {
  return courseModules(store, id).some((m) => m.moduleId === moduleId && m.enabled);
}

// Extension descriptors are data-only and explicitly registered by trusted app code.
// This does not load a plugin or execute imported course content.
export function setRegisteredCourseModule(store:Store,courseId:string,registry:ModuleRegistry,moduleId:string,enabled:boolean){
  requireCourse(store,courseId,true);
  const definition=registry.get(moduleId);
  if(!definition||typeof enabled!=='boolean')throw new CourseError('invalid_module');
  const current=store.db.prepare('select schema_version from course_modules where course_id=? and module_id=?').get(courseId,moduleId) as {schema_version:number}|undefined;
  if(current&&current.schema_version!==definition.schemaVersion)throw new CourseError('module_version_mismatch',409);
  store.db.prepare('insert into course_modules(course_id,module_id,schema_version,enabled) values (?,?,?,?) on conflict(course_id,module_id) do update set enabled=excluded.enabled').run(courseId,moduleId,definition.schemaVersion,enabled?1:0);
  return {moduleId,schemaVersion:definition.schemaVersion,enabled};
}
export function registeredModuleEnabled(store:Store,courseId:string,registry:ModuleRegistry,moduleId:string){
  requireCourse(store,courseId);
  const definition=registry.get(moduleId);
  if(!definition)throw new CourseError('invalid_module');
  const row=store.db.prepare('select schema_version,enabled from course_modules where course_id=? and module_id=?').get(courseId,moduleId) as {schema_version:number;enabled:number}|undefined;
  if(row&&row.schema_version!==definition.schemaVersion)throw new CourseError('module_version_mismatch',409);
  return row?.enabled===1;
}
