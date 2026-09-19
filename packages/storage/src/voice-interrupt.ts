import { createId, type VoiceInterruptSession } from '@collegenotes/domain';
import type { Store } from './database.js';
import { CourseError } from './courses.js';
import { getNarrationAsset, getPlaybackState, requireAudio, savePlaybackState } from './narration.js';

function rowToSession(row: {
  id: string; course_id: string; asset_id: string; saved_offset_ms: number; tutor_request_id: string | null;
  echo_suppressed: number; status: VoiceInterruptSession['status']; created_at: string; updated_at: string;
}): VoiceInterruptSession {
  return {
    id: row.id, courseId: row.course_id, assetId: row.asset_id, savedOffsetMs: row.saved_offset_ms,
    tutorRequestId: row.tutor_request_id, echoSuppressed: row.echo_suppressed === 1, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

export function getVoiceInterrupt(store: Store, courseId: string, id: string): VoiceInterruptSession {
  requireAudio(store, courseId);
  const row = store.db.prepare('select * from voice_interrupt_sessions where course_id=? and id=?').get(courseId, id) as Parameters<typeof rowToSession>[0] | undefined;
  if (!row) throw new CourseError('voice_interrupt_unavailable', 404);
  return rowToSession(row);
}

export function interruptNarration(store: Store, courseId: string, input: unknown): VoiceInterruptSession {
  requireAudio(store, courseId, true);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CourseError('invalid_voice_interrupt');
  const body = input as Record<string, unknown>;
  if (typeof body.assetId !== 'string') throw new CourseError('invalid_voice_interrupt');
  const asset = getNarrationAsset(store, courseId, body.assetId);
  if (asset.status !== 'ready') throw new CourseError('narration_stale', 409);
  const playback = getPlaybackState(store, courseId, asset.id);
  const offsetMs = typeof body.offsetMs === 'number' ? body.offsetMs : playback.offsetMs;
  if (!Number.isFinite(offsetMs) || offsetMs < 0 || offsetMs > asset.durationMs) throw new CourseError('invalid_playback_offset');
  const clientRequestId = typeof body.clientRequestId === 'string' ? body.clientRequestId : null;
  if (clientRequestId) {
    const existing = store.db.prepare('select * from voice_interrupt_sessions where course_id=? and client_request_id=?').get(courseId, clientRequestId) as Parameters<typeof rowToSession>[0] | undefined;
    if (existing) return rowToSession(existing);
  }
  savePlaybackState(store, courseId, asset.id, { offsetMs, speed: playback.speed, bookmarks: playback.bookmarks });
  const id = createId('vinterrupt');
  const now = new Date().toISOString();
  store.db.prepare(`insert into voice_interrupt_sessions(id,course_id,asset_id,saved_offset_ms,tutor_request_id,echo_suppressed,status,client_request_id,created_at,updated_at)
    values (?,?,?,?,null,1,'interrupted',?,?,?)`).run(id, courseId, asset.id, Math.round(offsetMs), clientRequestId, now, now);
  return getVoiceInterrupt(store, courseId, id);
}

export function advanceVoiceInterrupt(store: Store, courseId: string, id: string, input: unknown): VoiceInterruptSession {
  requireAudio(store, courseId, true);
  const current = getVoiceInterrupt(store, courseId, id);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CourseError('invalid_voice_interrupt');
  const body = input as Record<string, unknown>;
  const action = body.action;
  const now = new Date().toISOString();
  if (action === 'ask') {
    if (current.status === 'asking' && current.tutorRequestId) return current;
    if (body.networkAvailable === false) {
      store.db.prepare(`update voice_interrupt_sessions set status='failed', updated_at=? where id=? and course_id=?`).run(now, id, courseId);
      throw new CourseError('network_unavailable', 503);
    }
    if (body.cancelled === true) {
      store.db.prepare(`update voice_interrupt_sessions set status='cancelled', updated_at=? where id=? and course_id=?`).run(now, id, courseId);
      return getVoiceInterrupt(store, courseId, id);
    }
    const tutorRequestId = typeof body.tutorRequestId === 'string' ? body.tutorRequestId : createId('tutorreq');
    store.db.prepare(`update voice_interrupt_sessions set status='asking', tutor_request_id=?, echo_suppressed=1, updated_at=? where id=? and course_id=?`)
      .run(tutorRequestId, now, id, courseId);
    return getVoiceInterrupt(store, courseId, id);
  }
  if (action === 'resume') {
    const session = getVoiceInterrupt(store, courseId, id);
    const playback = getPlaybackState(store, courseId, session.assetId);
    savePlaybackState(store, courseId, session.assetId, { offsetMs: session.savedOffsetMs, speed: playback.speed, bookmarks: playback.bookmarks });
    store.db.prepare(`update voice_interrupt_sessions set status='resumed', updated_at=? where id=? and course_id=?`).run(now, id, courseId);
    return getVoiceInterrupt(store, courseId, id);
  }
  if (action === 'cancel') {
    store.db.prepare(`update voice_interrupt_sessions set status='cancelled', updated_at=? where id=? and course_id=?`).run(now, id, courseId);
    return getVoiceInterrupt(store, courseId, id);
  }
  throw new CourseError('invalid_voice_interrupt_action');
}

export function echoSuppressedWhileTutorAudio(store: Store, courseId: string, interruptId: string): boolean {
  const session = getVoiceInterrupt(store, courseId, interruptId);
  return session.echoSuppressed && (session.status === 'asking' || session.status === 'interrupted');
}
