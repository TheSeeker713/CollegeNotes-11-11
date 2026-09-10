import type { Course } from '@collegenotes/domain';
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
  if (store.db.prepare("select id from jobs where course_id=? and status in ('queued','running')").get(id)) throw new CourseError('course_busy', 409);
  const now = new Date().toISOString();
  store.db.prepare('update courses set archived_at=?, updated_at=? where id=?').run(archived ? now : null, now, id);
  return requireCourse(store, id);
}
