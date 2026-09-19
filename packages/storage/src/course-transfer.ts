import fs from 'node:fs';
import path from 'node:path';
import { createId } from '@collegenotes/domain';
import type { Store } from './database.js';
import { CourseError, courseCollection, courseModules, requireCourse } from './courses.js';
import { checksum, getLayout, getSession, setSession } from './repos.js';
import { resolveInside } from './paths.js';

type Original = { id: string; course_id: string; filename: string; checksum: string; byte_length: number; stored_rel_path: string; deleted_at: string | null; cleanup_state: string };
type MediaRow = { id: string; rel_path: string; byte_length: number };
type MediaKind = 'narration' | 'practice';
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
function mediaRows(store: Store, courseId: string, kind: MediaKind): MediaRow[] {
  const table = kind === 'narration' ? 'narration_assets' : 'practice_media';
  return store.db.prepare(`select id,rel_path,byte_length from ${table} where course_id=? order by id`).all(courseId) as MediaRow[];
}
function ownedMediaPath(store: Store, courseId: string, kind: MediaKind, row: MediaRow): string {
  if (path.dirname(row.rel_path) !== path.join(kind, courseId) || !path.basename(row.rel_path).startsWith(`${row.id}.`)) {
    throw new CourseError('unsafe_media_path', 409);
  }
  const table = kind === 'narration' ? 'narration_assets' : 'practice_media';
  if (store.db.prepare(`select id from ${table} where rel_path=? and id<>?`).get(row.rel_path, row.id)) throw new CourseError('shared_media_path', 409);
  try { return resolveInside(store.dataDir, row.rel_path); } catch { throw new CourseError('unsafe_media_path', 409); }
}
function checkedMedia(store: Store, courseId: string, kind: MediaKind, row: MediaRow): Buffer {
  const file = ownedMediaPath(store, courseId, kind, row);
  if (!fs.existsSync(file)) throw new CourseError('media_missing', 409);
  const bytes = fs.readFileSync(file);
  if (bytes.length !== row.byte_length) throw new CourseError('media_length_mismatch', 409);
  return bytes;
}
function courseMediaFiles(store: Store, courseId: string): string[] {
  const files: string[] = [];
  for (const kind of ['narration', 'practice'] as const) {
    let dir: string;
    try { dir = resolveInside(store.dataDir, path.join(kind, courseId)); } catch { throw new CourseError('unsafe_media_path', 409); }
    if (!fs.existsSync(dir)) continue;
    if (!fs.statSync(dir).isDirectory()) throw new CourseError('unsafe_media_path', 409);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) throw new CourseError('unsafe_media_path', 409);
      try { files.push(resolveInside(store.dataDir, path.join(kind, courseId, entry.name))); }
      catch { throw new CourseError('unsafe_media_path', 409); }
    }
  }
  return files;
}
const exportTables = ['visual_experiments', 'practice_history', 'practice_checklist', 'practice_rehearsals', 'practice_cue_cards', 'practice_annotations', 'practice_transcripts', 'practice_observations', 'practice_media', 'voice_interrupt_sessions', 'recognition_transcripts', 'narration_playback', 'narration_assets', 'study_sessions', 'study_schedule', 'study_preferences', 'study_attempts', 'study_activities', 'reading_annotations', 'reading_positions', 'material_revisions', 'semantic_chunks', 'derivatives', 'embedding_indexes', 'research_sessions', 'research_sources', 'research_claims', 'tutor_sessions', 'tutor_turns', 'drafts'] as const;
export function exportCourse(store: Store, id: string) {
  return store.db.transaction(() => {
    const course = requireCourse(store, id);
    const sources = originals(store, id).map((doc) => {
      const metadata = Object.fromEntries(Object.entries(doc).filter(([key]) => key !== 'stored_rel_path'));
      return { ...metadata, contentBase64: doc.deleted_at && doc.cleanup_state === 'complete' ? null : checkedBytes(store, doc).toString('base64') };
    });
    const records = Object.fromEntries(exportTables.map((table) => [table, store.db.prepare(`select * from ${table} where course_id=?`).all(id)]));
    records.study_sources = store.db.prepare('select ss.* from study_sources ss join study_activities sa on sa.id=ss.activity_id where sa.course_id=? order by ss.activity_id,ss.source_id').all(id);
    const files = (['narration', 'practice'] as const).flatMap((kind) => mediaRows(store, id, kind).map((row) => {
      const bytes = checkedMedia(store, id, kind, row);
      return { kind, id: row.id, byteLength: bytes.length, checksum: checksum(bytes), contentBase64: bytes.toString('base64') };
    }));
    const moduleRecords = store.db.prepare('select course_id,module_id,schema_version,enabled from course_modules where course_id=? order by module_id').all(id);
    const data = { course, modules: courseModules(store, id), moduleRecords, layout: getLayout(store, id), sources, files, records };
    return { format: 'collegenotes-course', version: 1, exportedAt: new Date().toISOString(), checksumAlgorithm: 'sha256', dataChecksum: checksum(Buffer.from(JSON.stringify(data))), credentialPolicy: 'Connection configurations, credentials and credential references are excluded.', data };
  })();
}

export function deleteCourse(store: Store, id: string, body: unknown): { deleted: true; courseId: string } {
  const course = courseCollection(store).find(c => c.id === id);
  if (!course) throw new CourseError('course_unavailable', 404);
  const input = body as { confirmation?: unknown; backupsAcknowledged?: unknown } | null;
  if (input?.confirmation !== course.name || input?.backupsAcknowledged !== true) throw new CourseError('deletion_confirmation_required');
  if (store.db.prepare("select id from embedding_indexes where course_id=? and status='building'").get(id) || store.db.prepare("select id from import_tasks where course_id=? and status in ('queued','running')").get(id) || store.db.prepare("select id from jobs where course_id=? and status in ('queued','running')").get(id)) throw new CourseError('course_busy', 409);
  const docs = originals(store, id);
  const media = (['narration', 'practice'] as const).flatMap((kind) => mediaRows(store, id, kind).map((row) => ({ kind, row })));
  let operation = store.db.prepare("select id from lifecycle_operations where course_id=? and kind='permanent_delete' and status in ('pending','running','failed')").get(id) as { id: string } | undefined;
  if (!operation) {
    if (course.trashedAt) throw new CourseError('deletion_record_missing', 409);
    // Preflight the entire set before any destructive operation. Already deleted materials have no original.
    for (const doc of docs) if (!(doc.deleted_at && doc.cleanup_state === 'complete')) checkedBytes(store, doc);
    for (const { kind, row } of media) checkedMedia(store, id, kind, row);
    courseMediaFiles(store, id);
    operation = { id: createId('del') };
    const now = new Date().toISOString();
    store.db.transaction(() => {
      store.db.prepare('update courses set trashed_at=?,updated_at=? where id=?').run(now, now, id);
      store.db.prepare("insert into lifecycle_operations(id,course_id,kind,status,manifest,updated_at) values (?,?,'permanent_delete','pending',?,?)").run(operation!.id, id, JSON.stringify({ sourceIds: docs.map(d => d.id), backupsAcknowledged: true }), now);
    })();
  }
  try {
    // Validate all remaining paths before removing any bytes during a retry.
    const mediaFiles = courseMediaFiles(store, id);
    for (const { kind, row } of media) ownedMediaPath(store, id, kind, row);
    // Missing files are expected only on a previously confirmed, interrupted deletion.
    for (const doc of docs) {
      const file = ownedPath(store, doc);
      if (fs.existsSync(file)) { checkedBytes(store, doc); fs.unlinkSync(file); }
    }
    for (const file of mediaFiles) fs.unlinkSync(file);
    for (const kind of ['narration', 'practice'] as const) {
      const dir = resolveInside(store.dataDir, path.join(kind, id));
      if (fs.existsSync(dir)) fs.rmdirSync(dir);
    }
    store.db.transaction(() => {
      for (const table of ['tutor_sessions','research_sources','research_sessions','derivatives','material_revisions','embedding_indexes','source_documents','course_modules','card_layouts','drafts','jobs','lifecycle_operations']) {
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
