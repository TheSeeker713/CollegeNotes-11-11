import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_APPEARANCE,
  parseAppearance,
  parseCardLayout,
  DEFAULT_CARD_LAYOUT,
  newCourse,
  createId,
  type Appearance,
  type CardLayout,
  type Course,
  type Draft,
  type Job,
  type JobStatus,
  type SessionState,
  type SourceDocument
} from '@collegenotes/domain';
import type { Store } from './database.js';
import { resolveInside } from './paths.js';

export function listCourses(store: Store): Course[] {
  return store.db.prepare('select id, name, created_at as createdAt from courses order by created_at').all() as Course[];
}

export function createCourse(store: Store, name: string): Course {
  const trimmed = name.trim();
  if (!trimmed) throw Object.assign(new Error('name_required'), { code: 'invalid' });
  const course = newCourse(trimmed);
  store.db.prepare('insert into courses(id, name, created_at) values (?, ?, ?)').run(course.id, course.name, course.createdAt);
  return course;
}

export function getAppearance(store: Store): Appearance {
  const row = store.db.prepare('select payload from appearance where id = 1').get() as { payload: string } | undefined;
  if (!row) return { ...DEFAULT_APPEARANCE };
  try {
    return parseAppearance(JSON.parse(row.payload));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function setAppearance(store: Store, appearance: Appearance): Appearance {
  const parsed = parseAppearance(appearance);
  store.db.prepare('insert into appearance(id, payload) values (1, ?) on conflict(id) do update set payload = excluded.payload').run(JSON.stringify(parsed));
  return parsed;
}

export function getLayout(store: Store, courseId: string): CardLayout {
  const row = store.db.prepare('select payload from card_layouts where course_id = ?').get(courseId) as { payload: string } | undefined;
  if (!row) return { order: [...DEFAULT_CARD_LAYOUT.order], pinned: [] };
  return parseCardLayout(JSON.parse(row.payload));
}

export function setLayout(store: Store, courseId: string, layout: CardLayout): CardLayout {
  const parsed = parseCardLayout(layout);
  store.db.prepare('insert into card_layouts(course_id, payload) values (?, ?) on conflict(course_id) do update set payload = excluded.payload').run(courseId, JSON.stringify(parsed));
  return parsed;
}

export function getSession(store: Store): SessionState {
  const row = store.db.prepare('select payload from sessions where id = 1').get() as { payload: string } | undefined;
  if (!row) return { courseId: null, routeHash: '#/home', task: 'home', notice: null };
  return JSON.parse(row.payload) as SessionState;
}

export function setSession(store: Store, session: SessionState): SessionState {
  store.db.prepare('insert into sessions(id, payload) values (1, ?) on conflict(id) do update set payload = excluded.payload').run(JSON.stringify(session));
  return session;
}

export function getDraft(store: Store, key: string): Draft | null {
  const row = store.db.prepare('select key, course_id as courseId, body, updated_at as updatedAt from drafts where key = ?').get(key) as Draft | undefined;
  return row ?? null;
}

export function setDraft(store: Store, draft: Omit<Draft, 'updatedAt'>): Draft {
  const saved = { ...draft, updatedAt: new Date().toISOString() };
  store.db.prepare('insert into drafts(key, course_id, body, updated_at) values (?, ?, ?, ?) on conflict(key) do update set body = excluded.body, updated_at = excluded.updated_at, course_id = excluded.course_id').run(saved.key, saved.courseId, saved.body, saved.updatedAt);
  return saved;
}

export function checksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function storeOriginal(store: Store, courseId: string, filename: string, buffer: Buffer): SourceDocument {
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const id = createId('src');
  const rel = path.join('originals', `${id}_${safeName}`);
  const dest = resolveInside(store.dataDir, rel);
  fs.writeFileSync(dest, buffer);
  const doc: SourceDocument = {
    id,
    courseId,
    filename: safeName,
    checksum: checksum(buffer),
    byteLength: buffer.length,
    storedRelPath: rel,
    createdAt: new Date().toISOString()
  };
  store.db.prepare('insert into source_documents(id, course_id, filename, checksum, byte_length, stored_rel_path, created_at) values (?, ?, ?, ?, ?, ?, ?)').run(doc.id, doc.courseId, doc.filename, doc.checksum, doc.byteLength, doc.storedRelPath, doc.createdAt);
  return doc;
}

export function readOriginal(store: Store, doc: SourceDocument): Buffer {
  return fs.readFileSync(resolveInside(store.dataDir, doc.storedRelPath));
}

export function listJobs(store: Store): Job[] {
  return store.db.prepare('select id, kind, course_id as courseId, fingerprint, status, progress, error, source_id as sourceId, created_at as createdAt, updated_at as updatedAt from jobs order by created_at').all() as Job[];
}

export function insertJob(store: Store, job: Job): Job {
  store.db.prepare('insert into jobs(id, kind, course_id, fingerprint, status, progress, error, source_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(job.id, job.kind, job.courseId, job.fingerprint, job.status, job.progress, job.error, job.sourceId, job.createdAt, job.updatedAt);
  return job;
}

export function updateJob(store: Store, job: Job): Job {
  const updated = { ...job, updatedAt: new Date().toISOString() };
  store.db.prepare('update jobs set status = ?, progress = ?, error = ?, source_id = ?, updated_at = ? where id = ?').run(updated.status, updated.progress, updated.error, updated.sourceId, updated.updatedAt, updated.id);
  return updated;
}

export function findJobByFingerprint(store: Store, fingerprint: string): Job | undefined {
  return store.db.prepare('select id, kind, course_id as courseId, fingerprint, status, progress, error, source_id as sourceId, created_at as createdAt, updated_at as updatedAt from jobs where fingerprint = ? order by created_at desc').get(fingerprint) as Job | undefined;
}

export function getJob(store: Store, id: string): Job | undefined {
  return store.db.prepare('select id, kind, course_id as courseId, fingerprint, status, progress, error, source_id as sourceId, created_at as createdAt, updated_at as updatedAt from jobs where id = ?').get(id) as Job | undefined;
}

export function runInTransaction<T>(store: Store, fn: () => T): T {
  const wrap = store.db.transaction(fn);
  return wrap();
}

export function restoreInterruptedJobs(store: Store): Job[] {
  const running = store.db.prepare("select id from jobs where status in ('queued', 'running')").all() as { id: string }[];
  const now = new Date().toISOString();
  for (const row of running) {
    store.db.prepare("update jobs set status = 'queued', error = null, updated_at = ? where id = ?").run(now, row.id);
  }
  return listJobs(store).filter((job) => job.status === 'queued');
}

export type { JobStatus };
