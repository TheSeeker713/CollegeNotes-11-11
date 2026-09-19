import { createId, applyTermCorrections, type RecognitionTranscript } from '@collegenotes/domain';
import { draftRecognition, synthesizeOfflineTranscript } from '@collegenotes/providers';
import type { Store } from './database.js';
import { CourseError, moduleEnabled, requireCourse } from './courses.js';
import { requireAudio } from './narration.js';

function rowToTranscript(row: {
  id: string; course_id: string; raw_text: string; edited_text: string; terms_json: string;
  status: 'draft' | 'final'; created_at: string; updated_at: string;
}): RecognitionTranscript {
  return {
    id: row.id, courseId: row.course_id, rawText: row.raw_text, editedText: row.edited_text,
    terms: JSON.parse(row.terms_json) as RecognitionTranscript['terms'], status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

export function listRecognitionTranscripts(store: Store, courseId: string): RecognitionTranscript[] {
  requireAudio(store, courseId);
  return (store.db.prepare('select * from recognition_transcripts where course_id=? order by created_at,id').all(courseId) as Parameters<typeof rowToTranscript>[0][]).map(rowToTranscript);
}

export function getRecognitionTranscript(store: Store, courseId: string, id: string): RecognitionTranscript {
  requireAudio(store, courseId);
  const row = store.db.prepare('select * from recognition_transcripts where course_id=? and id=?').get(courseId, id) as Parameters<typeof rowToTranscript>[0] | undefined;
  if (!row) throw new CourseError('recognition_unavailable', 404);
  return rowToTranscript(row);
}

export function createRecognitionTranscript(store: Store, courseId: string, input: unknown): RecognitionTranscript {
  requireAudio(store, courseId, true);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CourseError('invalid_recognition_request');
  const body = input as Record<string, unknown>;
  const terms = Array.isArray(body.terms) ? body.terms as Array<{ from: string; to: string }> : [];
  for (const term of terms) {
    if (!term || typeof term.from !== 'string' || typeof term.to !== 'string' || term.from.length > 80 || term.to.length > 80) throw new CourseError('invalid_term_correction');
  }
  let result;
  try {
    result = synthesizeOfflineTranscript({
      courseId,
      expectedText: typeof body.expectedText === 'string' ? body.expectedText : undefined,
      audioHint: typeof body.audioHint === 'string' ? body.audioHint : undefined,
      terms
    });
  } catch {
    throw new CourseError('invalid_recognition_text');
  }
  if (result.costUsd !== 0 || result.downloadedBytes !== 0) throw new CourseError('transcription_cost_bound_exceeded', 500);
  const id = createId('recognition');
  const draft = draftRecognition(courseId, result, id);
  draft.terms = terms;
  draft.editedText = applyTermCorrections(draft.rawText, terms);
  store.db.prepare('insert into recognition_transcripts values (?,?,?,?,?,?,?,?)')
    .run(draft.id, courseId, draft.rawText, draft.editedText, JSON.stringify(draft.terms), draft.status, draft.createdAt, draft.updatedAt);
  return draft;
}

export function updateRecognitionTranscript(store: Store, courseId: string, id: string, input: unknown): RecognitionTranscript {
  requireAudio(store, courseId, true);
  const current = getRecognitionTranscript(store, courseId, id);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CourseError('invalid_recognition_update');
  const body = input as Record<string, unknown>;
  const editedText = typeof body.editedText === 'string' ? body.editedText : current.editedText;
  if (editedText.length > 20_000 || editedText.includes('\0')) throw new CourseError('invalid_recognition_text');
  const terms = Array.isArray(body.terms) ? body.terms as RecognitionTranscript['terms'] : current.terms;
  for (const term of terms) {
    if (!term || typeof term.from !== 'string' || typeof term.to !== 'string' || term.from.length > 80 || term.to.length > 80) throw new CourseError('invalid_term_correction');
  }
  const status = body.status === 'final' || body.status === 'draft' ? body.status : current.status;
  const corrected = applyTermCorrections(editedText, terms);
  const updatedAt = new Date().toISOString();
  store.db.prepare('update recognition_transcripts set edited_text=?, terms_json=?, status=?, updated_at=? where id=? and course_id=?')
    .run(corrected, JSON.stringify(terms), status, updatedAt, id, courseId);
  return getRecognitionTranscript(store, courseId, id);
}

export function requireCourseAudioWrite(store: Store, courseId: string) {
  requireCourse(store, courseId, true);
  if (!moduleEnabled(store, courseId, 'audio')) throw new CourseError('audio_module_disabled', 409);
}
