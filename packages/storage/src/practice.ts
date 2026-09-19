import fs from 'node:fs';
import path from 'node:path';
import {
  countWords,
  createId,
  inspectSlideReadability,
  parseObservationInput,
  refuseVisualDeliveryClaim,
  resolvePracticeMediaKind,
  type PracticeAnnotation,
  type PracticeChecklistItem,
  type PracticeCueCard,
  type PracticeExportRecord,
  type PracticeHistoryEntry,
  type PracticeMedia,
  type PracticeObservation,
  type PracticeRehearsal,
  type PracticeSlideInspection,
  type PracticeTranscript,
  type PracticeTranscriptSegment
} from '@collegenotes/domain';
import type { Store } from './database.js';
import { CourseError, moduleEnabled, requireCourse } from './courses.js';
import { ensureDir, resolveInside } from './paths.js';

export function requirePractice(store: Store, courseId: string, write = false) {
  requireCourse(store, courseId, write);
  if (!moduleEnabled(store, courseId, 'practice')) throw new CourseError('practice_module_disabled', 409);
}

function rowObservation(r: {
  id: string; course_id: string; category: PracticeObservation['category']; body: string; word_count: number;
  rationale: string; media_id: string | null; timestamp_ms: number | null; status: PracticeObservation['status'];
  created_at: string; updated_at: string;
}): PracticeObservation {
  return {
    id: r.id, courseId: r.course_id, category: r.category, body: r.body, wordCount: r.word_count,
    rationale: r.rationale, mediaId: r.media_id, timestampMs: r.timestamp_ms, status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

export function listObservations(store: Store, courseId: string): PracticeObservation[] {
  requirePractice(store, courseId);
  const rows = store.db.prepare('select * from practice_observations where course_id=? order by created_at,id').all(courseId) as Parameters<typeof rowObservation>[0][];
  return rows.map(rowObservation);
}

export function getObservation(store: Store, courseId: string, id: string): PracticeObservation {
  const found = listObservations(store, courseId).find((o) => o.id === id);
  if (!found) throw new CourseError('observation_unavailable', 404);
  return found;
}

function appendHistory(
  store: Store,
  courseId: string,
  kind: PracticeHistoryEntry['kind'],
  refId: string,
  summary: string,
  practiceStatus: PracticeHistoryEntry['practiceStatus'],
  assignmentStatus: string | null = null
) {
  const id = createId('phist');
  const createdAt = new Date().toISOString();
  store.db.prepare('insert into practice_history(id,course_id,kind,ref_id,summary,practice_status,assignment_status,created_at) values (?,?,?,?,?,?,?,?)')
    .run(id, courseId, kind, refId, summary, practiceStatus, assignmentStatus, createdAt);
}

export function createObservation(store: Store, courseId: string, input: unknown): PracticeObservation {
  requirePractice(store, courseId, true);
  let parsed;
  try { parsed = parseObservationInput(input); } catch (e) { throw new CourseError(e instanceof Error ? e.message : 'invalid_observation'); }
  if (parsed.mediaId) {
    const media = store.db.prepare('select id from practice_media where course_id=? and id=?').get(courseId, parsed.mediaId);
    if (!media) throw new CourseError('practice_media_unavailable', 404);
  }
  const id = createId('pobs');
  const now = new Date().toISOString();
  const wordCount = countWords(parsed.body);
  store.db.prepare(`insert into practice_observations(id,course_id,category,body,word_count,rationale,media_id,timestamp_ms,status,created_at,updated_at)
    values (?,?,?,?,?,?,?,?,?,?,?)`).run(id, courseId, parsed.category, parsed.body, wordCount, parsed.rationale, parsed.mediaId, parsed.timestampMs, parsed.status, now, now);
  if (parsed.status === 'submitted') {
    appendHistory(store, courseId, 'observation', id, `${parsed.category}: ${parsed.body.slice(0, 120)}`, 'complete');
  }
  return getObservation(store, courseId, id);
}

export function updateObservation(store: Store, courseId: string, id: string, input: unknown): PracticeObservation {
  requirePractice(store, courseId, true);
  const existing = getObservation(store, courseId, id);
  let parsed;
  try { parsed = parseObservationInput({ ...existing, ...(input as object), category: (input as { category?: unknown })?.category ?? existing.category, body: (input as { body?: unknown })?.body ?? existing.body }); }
  catch (e) { throw new CourseError(e instanceof Error ? e.message : 'invalid_observation'); }
  const now = new Date().toISOString();
  const wordCount = countWords(parsed.body);
  store.db.prepare(`update practice_observations set category=?, body=?, word_count=?, rationale=?, media_id=?, timestamp_ms=?, status=?, updated_at=? where id=? and course_id=?`)
    .run(parsed.category, parsed.body, wordCount, parsed.rationale, parsed.mediaId, parsed.timestampMs, parsed.status, now, id, courseId);
  if (existing.status !== 'submitted' && parsed.status === 'submitted') {
    appendHistory(store, courseId, 'observation', id, `${parsed.category}: ${parsed.body.slice(0, 120)}`, 'complete');
  }
  return getObservation(store, courseId, id);
}

export function wordCountFeedback(body: string): { wordCount: number; maximum: null; note: string } {
  return {
    wordCount: countWords(body),
    maximum: null,
    note: 'Word count only. No maximum is invented by the app.'
  };
}

/** Policy: fixtures and labels must not embed class-specific curriculum text. */
export function practicePolicyScan(sourceFiles: string[]): { ok: boolean; hits: string[] } {
  const banned = [/\bCOMM\s*110\b/i, /\bPQP\s+activity\s+set\b/i, /\bsyllabus\b/i, /\bassignment\s+\d+\b/i];
  const hits: string[] = [];
  for (const file of sourceFiles) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of banned) {
      if (pattern.test(text)) hits.push(`${file}:${pattern}`);
    }
  }
  return { ok: hits.length === 0, hits };
}

function rowMedia(r: {
  id: string; course_id: string; filename: string; mime_type: string; kind: PracticeMedia['kind'];
  rel_path: string; duration_ms: number | null; byte_length: number; created_at: string;
}): PracticeMedia {
  return {
    id: r.id, courseId: r.course_id, filename: r.filename, mimeType: r.mime_type, kind: r.kind,
    relPath: r.rel_path, durationMs: r.duration_ms, byteLength: r.byte_length, createdAt: r.created_at
  };
}

export function listPracticeMedia(store: Store, courseId: string): PracticeMedia[] {
  requirePractice(store, courseId);
  return (store.db.prepare('select * from practice_media where course_id=? order by created_at,id').all(courseId) as Parameters<typeof rowMedia>[0][]).map(rowMedia);
}

export function getPracticeMedia(store: Store, courseId: string, id: string): PracticeMedia {
  requirePractice(store, courseId);
  const row = store.db.prepare('select * from practice_media where course_id=? and id=?').get(courseId, id) as Parameters<typeof rowMedia>[0] | undefined;
  if (!row) throw new CourseError('practice_media_unavailable', 404);
  return rowMedia(row);
}

export function importPracticeMedia(
  store: Store,
  courseId: string,
  input: { filename: unknown; mimeType?: unknown; contentBase64: unknown; durationMs?: unknown }
): PracticeMedia {
  requirePractice(store, courseId, true);
  if (typeof input.filename !== 'string' || !input.filename.trim() || input.filename.includes('\0') || input.filename.length > 500) {
    throw new CourseError('invalid_practice_filename');
  }
  if (typeof input.contentBase64 !== 'string' || !input.contentBase64.trim()) throw new CourseError('invalid_practice_media_payload');
  const mimeType = typeof input.mimeType === 'string' ? input.mimeType : '';
  const kind = resolvePracticeMediaKind(input.filename, mimeType);
  if (!kind) throw new CourseError('unsupported_practice_media');
  let buffer: Buffer;
  try { buffer = Buffer.from(input.contentBase64, 'base64'); } catch { throw new CourseError('invalid_practice_media_payload'); }
  if (!buffer.length) throw new CourseError('invalid_practice_media_payload');
  let durationMs: number | null = null;
  if (input.durationMs !== undefined && input.durationMs !== null) {
    const n = Number(input.durationMs);
    if (!Number.isFinite(n) || n < 0) throw new CourseError('invalid_practice_duration');
    durationMs = Math.floor(n);
  }
  const id = createId('pmedia');
  const ext = path.extname(input.filename).toLowerCase() || (kind === 'video' ? '.mp4' : '.wav');
  const relPath = path.join('practice', courseId, `${id}${ext}`);
  const absolute = resolveInside(store.dataDir, relPath);
  ensureDir(path.dirname(absolute));
  fs.writeFileSync(absolute, buffer);
  const createdAt = new Date().toISOString();
  const resolvedMime = mimeType || (kind === 'video' ? 'video/mp4' : 'audio/wav');
  store.db.prepare(`insert into practice_media(id,course_id,filename,mime_type,kind,rel_path,duration_ms,byte_length,created_at)
    values (?,?,?,?,?,?,?,?,?)`).run(id, courseId, input.filename.trim(), resolvedMime, kind, relPath, durationMs, buffer.length, createdAt);
  return getPracticeMedia(store, courseId, id);
}

export function practiceMediaPath(store: Store, courseId: string, id: string): string {
  const media = getPracticeMedia(store, courseId, id);
  const absolute = resolveInside(store.dataDir, media.relPath);
  if (!fs.existsSync(absolute)) throw new CourseError('practice_media_file_missing', 404);
  return absolute;
}

function rowTranscript(r: {
  id: string; course_id: string; media_id: string; segments_json: string; raw_text: string; edited_text: string;
  seek_ms: number; created_at: string; updated_at: string;
}): PracticeTranscript {
  return {
    id: r.id, courseId: r.course_id, mediaId: r.media_id,
    segments: JSON.parse(r.segments_json) as PracticeTranscriptSegment[],
    rawText: r.raw_text, editedText: r.edited_text, seekMs: r.seek_ms,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

export function getOrCreateTranscript(store: Store, courseId: string, mediaId: string, input?: { segments?: unknown; rawText?: unknown }): PracticeTranscript {
  requirePractice(store, courseId, true);
  getPracticeMedia(store, courseId, mediaId);
  const existing = store.db.prepare('select * from practice_transcripts where course_id=? and media_id=?').get(courseId, mediaId) as Parameters<typeof rowTranscript>[0] | undefined;
  if (existing) return rowTranscript(existing);
  const segments = Array.isArray(input?.segments) ? input!.segments as PracticeTranscriptSegment[] : [];
  for (const s of segments) {
    if (!s || typeof s.text !== 'string' || !Number.isFinite(s.startMs) || !Number.isFinite(s.endMs) || s.endMs < s.startMs) {
      throw new CourseError('invalid_transcript_segment');
    }
  }
  const rawText = typeof input?.rawText === 'string' ? input.rawText : segments.map((s) => s.text).join(' ');
  if (rawText.includes('\0') || rawText.length > 500000) throw new CourseError('invalid_transcript_text');
  const id = createId('ptr');
  const now = new Date().toISOString();
  store.db.prepare(`insert into practice_transcripts(id,course_id,media_id,segments_json,raw_text,edited_text,seek_ms,created_at,updated_at)
    values (?,?,?,?,?,?,0,?,?)`).run(id, courseId, mediaId, JSON.stringify(segments), rawText, rawText, now, now);
  return rowTranscript(store.db.prepare('select * from practice_transcripts where id=?').get(id) as Parameters<typeof rowTranscript>[0]);
}

export function updateTranscript(store: Store, courseId: string, transcriptId: string, input: unknown): PracticeTranscript {
  requirePractice(store, courseId, true);
  const row = store.db.prepare('select * from practice_transcripts where course_id=? and id=?').get(courseId, transcriptId) as Parameters<typeof rowTranscript>[0] | undefined;
  if (!row) throw new CourseError('transcript_unavailable', 404);
  const body = (input ?? {}) as { editedText?: unknown; seekMs?: unknown; segments?: unknown };
  let editedText = row.edited_text;
  if (body.editedText !== undefined) {
    if (typeof body.editedText !== 'string' || body.editedText.includes('\0') || body.editedText.length > 500000) throw new CourseError('invalid_transcript_text');
    editedText = body.editedText;
  }
  let seekMs = row.seek_ms;
  if (body.seekMs !== undefined) {
    const n = Number(body.seekMs);
    if (!Number.isFinite(n) || n < 0) throw new CourseError('invalid_seek_ms');
    seekMs = Math.floor(n);
  }
  let segmentsJson = row.segments_json;
  if (body.segments !== undefined) {
    if (!Array.isArray(body.segments)) throw new CourseError('invalid_transcript_segment');
    for (const s of body.segments as PracticeTranscriptSegment[]) {
      if (!s || typeof s.text !== 'string' || !Number.isFinite(s.startMs) || !Number.isFinite(s.endMs) || s.endMs < s.startMs) {
        throw new CourseError('invalid_transcript_segment');
      }
    }
    segmentsJson = JSON.stringify(body.segments);
  }
  const now = new Date().toISOString();
  store.db.prepare('update practice_transcripts set edited_text=?, seek_ms=?, segments_json=?, updated_at=? where id=? and course_id=?')
    .run(editedText, seekMs, segmentsJson, now, transcriptId, courseId);
  return rowTranscript(store.db.prepare('select * from practice_transcripts where id=?').get(transcriptId) as Parameters<typeof rowTranscript>[0]);
}

export function listTranscripts(store: Store, courseId: string): PracticeTranscript[] {
  requirePractice(store, courseId);
  return (store.db.prepare('select * from practice_transcripts where course_id=? order by created_at,id').all(courseId) as Parameters<typeof rowTranscript>[0][]).map(rowTranscript);
}

function rowAnnotation(r: {
  id: string; course_id: string; media_id: string; offset_ms: number; body: string;
  observation_id: string | null; created_at: string; updated_at: string;
}): PracticeAnnotation {
  return {
    id: r.id, courseId: r.course_id, mediaId: r.media_id, offsetMs: r.offset_ms, body: r.body,
    observationId: r.observation_id, createdAt: r.created_at, updatedAt: r.updated_at
  };
}

export function listAnnotations(store: Store, courseId: string, mediaId?: string): PracticeAnnotation[] {
  requirePractice(store, courseId);
  const rows = mediaId
    ? store.db.prepare('select * from practice_annotations where course_id=? and media_id=? order by offset_ms,id').all(courseId, mediaId)
    : store.db.prepare('select * from practice_annotations where course_id=? order by offset_ms,id').all(courseId);
  return (rows as Parameters<typeof rowAnnotation>[0][]).map(rowAnnotation);
}

export function createAnnotation(store: Store, courseId: string, input: unknown): PracticeAnnotation {
  requirePractice(store, courseId, true);
  const body = (input ?? {}) as Record<string, unknown>;
  if (typeof body.mediaId !== 'string') throw new CourseError('invalid_annotation');
  getPracticeMedia(store, courseId, body.mediaId);
  const offsetMs = Number(body.offsetMs);
  if (!Number.isFinite(offsetMs) || offsetMs < 0) throw new CourseError('invalid_annotation_offset');
  if (typeof body.body !== 'string' || !body.body.trim() || body.body.includes('\0') || body.body.length > 10000) throw new CourseError('invalid_annotation_body');
  let observationId: string | null = null;
  if (body.observationId !== undefined && body.observationId !== null) {
    if (typeof body.observationId !== 'string') throw new CourseError('invalid_observation_id');
    getObservation(store, courseId, body.observationId);
    observationId = body.observationId;
  }
  const id = createId('pann');
  const now = new Date().toISOString();
  store.db.prepare(`insert into practice_annotations(id,course_id,media_id,offset_ms,body,observation_id,created_at,updated_at)
    values (?,?,?,?,?,?,?,?)`).run(id, courseId, body.mediaId, Math.floor(offsetMs), body.body, observationId, now, now);
  return rowAnnotation(store.db.prepare('select * from practice_annotations where id=?').get(id) as Parameters<typeof rowAnnotation>[0]);
}

export function evaluateVisualClaim(store: Store, courseId: string, mediaId: string, claim: string): { allowed: boolean; reason: string | null } {
  const media = getPracticeMedia(store, courseId, mediaId);
  if (typeof claim !== 'string') throw new CourseError('invalid_visual_claim');
  const reason = refuseVisualDeliveryClaim(media.kind, claim);
  return { allowed: reason === null, reason };
}

function rowCue(r: {
  id: string; course_id: string; sort_order: number; title: string; notes: string; created_at: string; updated_at: string;
}): PracticeCueCard {
  return {
    id: r.id, courseId: r.course_id, order: r.sort_order, title: r.title, notes: r.notes,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

export function listCueCards(store: Store, courseId: string): PracticeCueCard[] {
  requirePractice(store, courseId);
  return (store.db.prepare('select * from practice_cue_cards where course_id=? order by sort_order,id').all(courseId) as Parameters<typeof rowCue>[0][]).map(rowCue);
}

export function createCueCard(store: Store, courseId: string, input: unknown): PracticeCueCard {
  requirePractice(store, courseId, true);
  const body = (input ?? {}) as Record<string, unknown>;
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.includes('\0') || body.title.length > 500) throw new CourseError('invalid_cue_title');
  if (typeof body.notes !== 'string' || body.notes.includes('\0') || body.notes.length > 20000) throw new CourseError('invalid_cue_notes');
  const existing = listCueCards(store, courseId);
  const order = typeof body.order === 'number' && Number.isInteger(body.order) && body.order >= 0 ? body.order : existing.length;
  const id = createId('pcue');
  const now = new Date().toISOString();
  // User-authored notes are stored verbatim — never rewritten by the app.
  store.db.prepare('insert into practice_cue_cards(id,course_id,sort_order,title,notes,created_at,updated_at) values (?,?,?,?,?,?,?)')
    .run(id, courseId, order, body.title.trim(), body.notes, now, now);
  return rowCue(store.db.prepare('select * from practice_cue_cards where id=?').get(id) as Parameters<typeof rowCue>[0]);
}

export function updateCueCard(store: Store, courseId: string, id: string, input: unknown): PracticeCueCard {
  requirePractice(store, courseId, true);
  const current = listCueCards(store, courseId).find((c) => c.id === id);
  if (!current) throw new CourseError('cue_unavailable', 404);
  const body = (input ?? {}) as Record<string, unknown>;
  const title = body.title === undefined ? current.title : body.title;
  const notes = body.notes === undefined ? current.notes : body.notes;
  const order = body.order === undefined ? current.order : body.order;
  if (typeof title !== 'string' || !title.trim() || title.includes('\0') || title.length > 500) throw new CourseError('invalid_cue_title');
  if (typeof notes !== 'string' || notes.includes('\0') || notes.length > 20000) throw new CourseError('invalid_cue_notes');
  if (typeof order !== 'number' || !Number.isInteger(order) || order < 0) throw new CourseError('invalid_cue_order');
  const now = new Date().toISOString();
  store.db.prepare('update practice_cue_cards set title=?, notes=?, sort_order=?, updated_at=? where id=? and course_id=?')
    .run(title.trim(), notes, order, now, id, courseId);
  return rowCue(store.db.prepare('select * from practice_cue_cards where id=?').get(id) as Parameters<typeof rowCue>[0]);
}

function rowRehearsal(r: {
  id: string; course_id: string; status: PracticeRehearsal['status']; started_at: string | null; ended_at: string | null;
  elapsed_ms: number; cue_index: number; media_id: string | null; configured_duration_ms: number | null;
  created_at: string; updated_at: string;
}): PracticeRehearsal {
  return {
    id: r.id, courseId: r.course_id, status: r.status, startedAt: r.started_at, endedAt: r.ended_at,
    elapsedMs: r.elapsed_ms, cueIndex: r.cue_index, mediaId: r.media_id,
    configuredDurationMs: r.configured_duration_ms, createdAt: r.created_at, updatedAt: r.updated_at
  };
}

export function listRehearsals(store: Store, courseId: string): PracticeRehearsal[] {
  requirePractice(store, courseId);
  return (store.db.prepare('select * from practice_rehearsals where course_id=? order by created_at,id').all(courseId) as Parameters<typeof rowRehearsal>[0][]).map(rowRehearsal);
}

export function getRehearsal(store: Store, courseId: string, id: string): PracticeRehearsal {
  const found = listRehearsals(store, courseId).find((r) => r.id === id);
  if (!found) throw new CourseError('rehearsal_unavailable', 404);
  return found;
}

export function createRehearsal(store: Store, courseId: string, input: unknown = {}): PracticeRehearsal {
  requirePractice(store, courseId, true);
  const body = (input ?? {}) as Record<string, unknown>;
  let configuredDurationMs: number | null = null;
  if (body.configuredDurationMs !== undefined && body.configuredDurationMs !== null) {
    const n = Number(body.configuredDurationMs);
    if (!Number.isFinite(n) || n <= 0) throw new CourseError('invalid_configured_duration');
    configuredDurationMs = Math.floor(n);
  }
  // Missing speech duration stays null — never invent a default.
  let mediaId: string | null = null;
  if (body.mediaId !== undefined && body.mediaId !== null) {
    if (typeof body.mediaId !== 'string') throw new CourseError('invalid_media_id');
    getPracticeMedia(store, courseId, body.mediaId);
    mediaId = body.mediaId;
  }
  const id = createId('preh');
  const now = new Date().toISOString();
  store.db.prepare(`insert into practice_rehearsals(id,course_id,status,started_at,ended_at,elapsed_ms,cue_index,media_id,configured_duration_ms,created_at,updated_at)
    values (?,?, 'idle', null, null, 0, 0, ?, ?, ?, ?)`).run(id, courseId, mediaId, configuredDurationMs, now, now);
  return getRehearsal(store, courseId, id);
}

export function advanceRehearsal(
  store: Store,
  courseId: string,
  id: string,
  input: unknown
): PracticeRehearsal {
  requirePractice(store, courseId, true);
  const current = getRehearsal(store, courseId, id);
  const body = (input ?? {}) as Record<string, unknown>;
  const action = body.action;
  if (!['start', 'stop', 'cancel', 'tick', 'set_cue'].includes(String(action))) throw new CourseError('invalid_rehearsal_action');
  const now = new Date().toISOString();
  let status = current.status;
  let startedAt = current.startedAt;
  let endedAt = current.endedAt;
  let elapsedMs = current.elapsedMs;
  let cueIndex = current.cueIndex;

  if (action === 'start') {
    if (current.status === 'recording') throw new CourseError('rehearsal_already_recording', 409);
    if (current.status === 'cancelled') throw new CourseError('rehearsal_cancelled', 409);
    status = 'recording';
    startedAt = startedAt ?? now;
    endedAt = null;
  } else if (action === 'stop') {
    if (current.status !== 'recording') throw new CourseError('rehearsal_not_recording', 409);
    status = 'stopped';
    endedAt = now;
    if (typeof body.elapsedMs === 'number' && Number.isFinite(body.elapsedMs) && body.elapsedMs >= 0) {
      elapsedMs = Math.floor(body.elapsedMs);
    } else if (startedAt) {
      elapsedMs = Math.max(0, Date.parse(now) - Date.parse(startedAt));
    }
    appendHistory(store, courseId, 'rehearsal', id, `Rehearsal stopped at ${elapsedMs} ms`, 'complete');
  } else if (action === 'cancel') {
    status = 'cancelled';
    endedAt = now;
    appendHistory(store, courseId, 'rehearsal', id, 'Rehearsal cancelled', 'cancelled');
  } else if (action === 'tick') {
    if (current.status !== 'recording') throw new CourseError('rehearsal_not_recording', 409);
    if (typeof body.elapsedMs !== 'number' || !Number.isFinite(body.elapsedMs) || body.elapsedMs < 0) throw new CourseError('invalid_elapsed_ms');
    elapsedMs = Math.floor(body.elapsedMs);
  } else if (action === 'set_cue') {
    if (typeof body.cueIndex !== 'number' || !Number.isInteger(body.cueIndex) || body.cueIndex < 0) throw new CourseError('invalid_cue_index');
    cueIndex = body.cueIndex;
  }

  store.db.prepare(`update practice_rehearsals set status=?, started_at=?, ended_at=?, elapsed_ms=?, cue_index=?, updated_at=? where id=? and course_id=?`)
    .run(status, startedAt, endedAt, elapsedMs, cueIndex, now, id, courseId);
  return getRehearsal(store, courseId, id);
}

export function inspectPracticeSlide(input: unknown): PracticeSlideInspection {
  const body = (input ?? {}) as Record<string, unknown>;
  const width = Number(body.width);
  const height = Number(body.height);
  const fontSizePx = Number(body.fontSizePx);
  const lineCount = Number(body.lineCount);
  const maxCharsPerLine = Number(body.maxCharsPerLine);
  const content = typeof body.content === 'string' ? body.content : '';
  if (![width, height, fontSizePx, lineCount, maxCharsPerLine].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new CourseError('invalid_slide_inspection');
  }
  if (content.includes('\0') || content.length > 50000) throw new CourseError('invalid_slide_content');
  return inspectSlideReadability({ width, height, fontSizePx, lineCount, maxCharsPerLine, content });
}

function rowChecklist(r: {
  id: string; course_id: string; label: string; done: number; sort_order: number; created_at: string; updated_at: string;
}): PracticeChecklistItem {
  return {
    id: r.id, courseId: r.course_id, label: r.label, done: r.done === 1, order: r.sort_order,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

export function listChecklist(store: Store, courseId: string): PracticeChecklistItem[] {
  requirePractice(store, courseId);
  return (store.db.prepare('select * from practice_checklist where course_id=? order by sort_order,id').all(courseId) as Parameters<typeof rowChecklist>[0][]).map(rowChecklist);
}

export function createChecklistItem(store: Store, courseId: string, input: unknown): PracticeChecklistItem {
  requirePractice(store, courseId, true);
  const body = (input ?? {}) as Record<string, unknown>;
  if (typeof body.label !== 'string' || !body.label.trim() || body.label.includes('\0') || body.label.length > 1000) {
    throw new CourseError('invalid_checklist_label');
  }
  const existing = listChecklist(store, courseId);
  const order = typeof body.order === 'number' && Number.isInteger(body.order) && body.order >= 0 ? body.order : existing.length;
  const id = createId('pcheck');
  const now = new Date().toISOString();
  store.db.prepare('insert into practice_checklist(id,course_id,label,done,sort_order,created_at,updated_at) values (?,?,?,0,?,?,?)')
    .run(id, courseId, body.label.trim(), order, now, now);
  appendHistory(store, courseId, 'checklist', id, body.label.trim(), 'draft');
  return rowChecklist(store.db.prepare('select * from practice_checklist where id=?').get(id) as Parameters<typeof rowChecklist>[0]);
}

export function updateChecklistItem(store: Store, courseId: string, id: string, input: unknown): PracticeChecklistItem {
  requirePractice(store, courseId, true);
  const current = listChecklist(store, courseId).find((c) => c.id === id);
  if (!current) throw new CourseError('checklist_item_unavailable', 404);
  const body = (input ?? {}) as Record<string, unknown>;
  const label = body.label === undefined ? current.label : body.label;
  const done = body.done === undefined ? current.done : Boolean(body.done);
  if (typeof label !== 'string' || !label.trim() || label.includes('\0') || label.length > 1000) throw new CourseError('invalid_checklist_label');
  const now = new Date().toISOString();
  store.db.prepare('update practice_checklist set label=?, done=?, updated_at=? where id=? and course_id=?')
    .run(label.trim(), done ? 1 : 0, now, id, courseId);
  if (done && !current.done) appendHistory(store, courseId, 'checklist', id, label.trim(), 'complete');
  return rowChecklist(store.db.prepare('select * from practice_checklist where id=?').get(id) as Parameters<typeof rowChecklist>[0]);
}

function rowHistory(r: {
  id: string; course_id: string; kind: PracticeHistoryEntry['kind']; ref_id: string; summary: string;
  practice_status: PracticeHistoryEntry['practiceStatus']; assignment_status: string | null; created_at: string;
}): PracticeHistoryEntry {
  return {
    id: r.id, courseId: r.course_id, kind: r.kind, refId: r.ref_id, summary: r.summary,
    practiceStatus: r.practice_status, assignmentStatus: r.assignment_status, createdAt: r.created_at
  };
}

export function listPracticeHistory(store: Store, courseId: string): PracticeHistoryEntry[] {
  requirePractice(store, courseId);
  return (store.db.prepare('select * from practice_history where course_id=? order by created_at,id').all(courseId) as Parameters<typeof rowHistory>[0][]).map(rowHistory);
}

export function setAssignmentStatus(store: Store, courseId: string, historyId: string, assignmentStatus: unknown): PracticeHistoryEntry {
  requirePractice(store, courseId, true);
  const row = store.db.prepare('select * from practice_history where course_id=? and id=?').get(courseId, historyId) as Parameters<typeof rowHistory>[0] | undefined;
  if (!row) throw new CourseError('practice_history_unavailable', 404);
  if (assignmentStatus !== null && assignmentStatus !== undefined) {
    if (typeof assignmentStatus !== 'string' || assignmentStatus.includes('\0') || assignmentStatus.length > 200) {
      throw new CourseError('invalid_assignment_status');
    }
  }
  // Never invent assignment status — only store what the user supplies (or clear it).
  const value = assignmentStatus === undefined || assignmentStatus === null || assignmentStatus === '' ? null : String(assignmentStatus);
  store.db.prepare('update practice_history set assignment_status=? where id=? and course_id=?').run(value, historyId, courseId);
  return rowHistory(store.db.prepare('select * from practice_history where id=?').get(historyId) as Parameters<typeof rowHistory>[0]);
}

export function exportPracticeRecords(store: Store, courseId: string): PracticeExportRecord {
  requirePractice(store, courseId);
  return {
    format: 'collegenotes-practice',
    schemaVersion: 1,
    courseId,
    observations: listObservations(store, courseId),
    cues: listCueCards(store, courseId),
    rehearsals: listRehearsals(store, courseId),
    checklist: listChecklist(store, courseId),
    history: listPracticeHistory(store, courseId),
    transcripts: listTranscripts(store, courseId),
    annotations: listAnnotations(store, courseId)
  };
}

/** Optional hook: build a practice question prompt for the existing tutor API when tutoring is enabled. */
export function practiceTutorQuestionHook(store: Store, courseId: string, topic: string): { allowed: boolean; prompt: string | null; reason: string | null } {
  requirePractice(store, courseId);
  if (!moduleEnabled(store, courseId, 'tutoring')) {
    return { allowed: false, prompt: null, reason: 'tutoring_module_disabled' };
  }
  if (typeof topic !== 'string' || !topic.trim() || topic.includes('\0') || topic.length > 2000) {
    throw new CourseError('invalid_practice_tutor_topic');
  }
  return {
    allowed: true,
    prompt: `Practice question from my presentation notes: ${topic.trim()}`,
    reason: null
  };
}
