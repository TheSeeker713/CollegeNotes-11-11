import fs from 'node:fs';
import path from 'node:path';
import { createId } from '@collegenotes/domain';
import type { Store } from './database.js';
import { CourseError, courseCollection, courseModules, requireCourse } from './courses.js';
import { checksum, getLayout, getSession, setSession } from './repos.js';
import { resolveInside } from './paths.js';

type Original = { id: string; course_id: string; filename: string; checksum: string; byte_length: number; stored_rel_path: string; deleted_at: string | null; cleanup_state: string };
function originals(store: Store, id: string): Original[] {
  return store.db.prepare('select * from source_documents where course_id=? order by id').all(id) as Original[];
}
function ownedPath(store: Store, doc: Original): string {
  // Never use arbitrary database paths to delete/export another file, even inside the data directory.
  if (path.dirname(doc.stored_rel_path) !== 'originals' || !path.basename(doc.stored_rel_path).startsWith(`${doc.id}_`)) throw new CourseError('unsafe_original_path', 409);
  if (store.db.prepare('select id from source_documents where stored_rel_path=? and id<>?').get(doc.stored_rel_path, doc.id)) throw new CourseError('shared_original_path', 409);
  try { return resolveInside(store.dataDir, doc.stored_rel_path); } catch { throw new CourseError('unsafe_original_path', 409); }
}
function checkedBytes(store: Store, doc: Original): Buffer {
  const file = ownedPath(store, doc);
  if (!fs.existsSync(file)) throw new CourseError('original_missing', 409);
  const bytes = fs.readFileSync(file);
  if (bytes.length !== doc.byte_length || checksum(bytes) !== doc.checksum) throw new CourseError('original_checksum_mismatch', 409);
  return bytes;
}
const exportTables = ['material_revisions', 'derivatives', 'embedding_indexes', 'research_sessions', 'research_sources', 'drafts'] as const;
export function exportCourse(store: Store, id: string) {
  return store.db.transaction(() => {
    const course = requireCourse(store, id);
    const sources = originals(store, id).map((doc) => {
      const metadata = Object.fromEntries(Object.entries(doc).filter(([key]) => key !== 'stored_rel_path'));
      return { ...metadata, contentBase64: doc.deleted_at && doc.cleanup_state === 'complete' ? null : checkedBytes(store, doc).toString('base64') };
    });
    const records = Object.fromEntries(exportTables.map((table) => [table, store.db.prepare(`select * from ${table} where course_id=?`).all(id)]));
    const data = { course, modules: courseModules(store, id), layout: getLayout(store, id), sources, records };
    return { format: 'collegenotes-course', version: 1, exportedAt: new Date().toISOString(), checksumAlgorithm: 'sha256', dataChecksum: checksum(Buffer.from(JSON.stringify(data))), credentialPolicy: 'Connection configurations, credentials and credential references are excluded.', data };
  })();
}

export function deleteCourse(store: Store, id: string, body: unknown): { deleted: true; courseId: string } {
  const course = courseCollection(store).find(c => c.id === id);
  if (!course) throw new CourseError('course_unavailable', 404);
  const input = body as { confirmation?: unknown; backupsAcknowledged?: unknown } | null;
  if (input?.confirmation !== course.name || input?.backupsAcknowledged !== true) throw new CourseError('deletion_confirmation_required');
  if (store.db.prepare("select id from jobs where course_id=? and status in ('queued','running')").get(id)) throw new CourseError('course_busy', 409);
  const docs = originals(store, id);
  let operation = store.db.prepare("select id from lifecycle_operations where course_id=? and kind='permanent_delete' and status in ('pending','running','failed')").get(id) as { id: string } | undefined;
  if (!operation) {
    if (course.trashedAt) throw new CourseError('deletion_record_missing', 409);
    // Preflight the entire set before any destructive operation. Already deleted materials have no original.
    for (const doc of docs) if (!(doc.deleted_at && doc.cleanup_state === 'complete')) checkedBytes(store, doc);
    operation = { id: createId('del') };
    const now = new Date().toISOString();
    store.db.transaction(() => {
      store.db.prepare('update courses set trashed_at=?,updated_at=? where id=?').run(now, now, id);
      store.db.prepare("insert into lifecycle_operations(id,course_id,kind,status,manifest,updated_at) values (?,?,'permanent_delete','pending',?,?)").run(operation!.id, id, JSON.stringify({ sourceIds: docs.map(d => d.id), backupsAcknowledged: true }), now);
    })();
  }
  try {
    // Missing files are expected only on a previously confirmed, interrupted deletion.
    for (const doc of docs) {
      const file = ownedPath(store, doc);
      if (fs.existsSync(file)) { checkedBytes(store, doc); fs.unlinkSync(file); }
    }
    store.db.transaction(() => {
      for (const table of ['research_sources','research_sessions','derivatives','material_revisions','embedding_indexes','source_documents','course_modules','card_layouts','drafts','jobs','lifecycle_operations']) {
        store.db.prepare(`delete from ${table} where course_id=?`).run(id);
      }
      store.db.prepare('delete from courses where id=?').run(id);
      const session = getSession(store);
      setSession(store, session); // normalize any stale reference without discarding other-course sessions
    })();
    return { deleted: true, courseId: id };
  } catch {
    store.db.prepare("update lifecycle_operations set status='failed',updated_at=? where id=?").run(new Date().toISOString(), operation.id);
    throw new CourseError('deletion_incomplete_retry', 409);
  }
}
