import fs from 'node:fs';
import path from 'node:path';
import { createId, estimateSentenceTiming, splitSentences, type NarrationAsset, type NarrationPlaybackState, type SentenceAnchor } from '@collegenotes/domain';
import { listVoices, narrationSettingsHash, narrationTextHash, synthesize, type NarrationExec } from '@collegenotes/providers';
import type { Store } from './database.js';
import { CourseError, moduleEnabled, requireCourse } from './courses.js';
import { materialDetail } from './material-lifecycle.js';
import { ensureDir, resolveInside } from './paths.js';

export function requireAudio(store: Store, courseId: string, write = false) {
  requireCourse(store, courseId, write);
  if (!moduleEnabled(store, courseId, 'audio')) throw new CourseError('audio_module_disabled', 409);
}

function rowToAsset(row: {
  id: string; course_id: string; source_id: string; source_revision: number; voice_id: string; settings_hash: string;
  text_hash: string; rel_path: string; duration_ms: number; byte_length: number; anchors_json: string;
  provider_id: string; status: NarrationAsset['status']; created_at: string;
}): NarrationAsset {
  return {
    id: row.id, courseId: row.course_id, sourceId: row.source_id, sourceRevision: row.source_revision,
    voiceId: row.voice_id, settingsHash: row.settings_hash, textHash: row.text_hash, relPath: row.rel_path,
    durationMs: row.duration_ms, byteLength: row.byte_length, anchors: JSON.parse(row.anchors_json) as SentenceAnchor[],
    providerId: row.provider_id, status: row.status, createdAt: row.created_at
  };
}

export function listNarrationAssets(store: Store, courseId: string, sourceId?: string): NarrationAsset[] {
  requireAudio(store, courseId);
  const rows = sourceId
    ? store.db.prepare('select * from narration_assets where course_id=? and source_id=? order by created_at,id').all(courseId, sourceId)
    : store.db.prepare('select * from narration_assets where course_id=? order by created_at,id').all(courseId);
  return (rows as Parameters<typeof rowToAsset>[0][]).map(rowToAsset);
}

export function getNarrationAsset(store: Store, courseId: string, assetId: string): NarrationAsset {
  requireAudio(store, courseId);
  const row = store.db.prepare('select * from narration_assets where course_id=? and id=?').get(courseId, assetId) as Parameters<typeof rowToAsset>[0] | undefined;
  if (!row) throw new CourseError('narration_unavailable', 404);
  return rowToAsset(row);
}

export async function listNarrationVoices(exec?: NarrationExec) {
  return listVoices(exec);
}

export async function generateNarration(
  store: Store,
  courseId: string,
  input: { sourceId: unknown; voiceId: unknown; rate?: unknown; start?: unknown; end?: unknown },
  exec?: NarrationExec
): Promise<NarrationAsset & { timing: { startupMs: number; throughputCharsPerSec: number; costUsd: 0; downloadedBytes: 0 }; reused: boolean }> {
  requireAudio(store, courseId, true);
  if (typeof input.sourceId !== 'string' || typeof input.voiceId !== 'string') throw new CourseError('invalid_narration_request');
  const rate = input.rate === undefined ? 200 : Number(input.rate);
  if (!Number.isFinite(rate) || rate < 90 || rate > 400) throw new CourseError('invalid_narration_rate');
  const { material, revisions } = materialDetail(store, courseId, input.sourceId);
  if (material.approvedRevision !== material.revision) throw new CourseError('source_not_approved', 409);
  const revision = revisions.find((r) => r.revision === material.revision);
  if (!revision) throw new CourseError('material_unavailable', 404);
  const start = input.start === undefined ? 0 : Number(input.start);
  const end = input.end === undefined ? revision.text.length : Number(input.end);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > revision.text.length || end <= start) throw new CourseError('invalid_narration_range');
  const text = revision.text.slice(start, end);
  if (!text.trim()) throw new CourseError('invalid_narration_text');
  const settingsHash = narrationSettingsHash(input.voiceId, rate);
  const textHash = narrationTextHash(text);
  const existing = store.db.prepare('select * from narration_assets where course_id=? and source_id=? and source_revision=? and voice_id=? and settings_hash=? and status=?')
    .get(courseId, input.sourceId, material.revision, input.voiceId, settingsHash, 'ready') as Parameters<typeof rowToAsset>[0] | undefined;
  if (existing && existing.text_hash === textHash) {
    const absolute = resolveInside(store.dataDir, existing.rel_path);
    if (fs.existsSync(absolute)) {
      return { ...rowToAsset(existing), timing: { startupMs: 0, throughputCharsPerSec: 0, costUsd: 0, downloadedBytes: 0 }, reused: true };
    }
  }
  const id = createId('narration');
  const relPath = path.join('narration', courseId, `${id}.wav`);
  const absolute = resolveInside(store.dataDir, relPath);
  ensureDir(path.dirname(absolute));
  let result;
  try {
    result = await synthesize({ text, voiceId: input.voiceId, outPath: absolute, rate }, exec);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'narration_synthesis_failed';
    throw new CourseError(code, 400);
  }
  if (result.costUsd !== 0 || result.downloadedBytes !== 0) throw new CourseError('narration_cost_bound_exceeded', 500);
  const sentences = splitSentences(text);
  const anchors = estimateSentenceTiming(sentences, result.durationMs);
  const createdAt = new Date().toISOString();
  store.db.prepare(`insert into narration_assets(id,course_id,source_id,source_revision,voice_id,settings_hash,text_hash,rel_path,duration_ms,byte_length,anchors_json,provider_id,status,created_at)
    values (?,?,?,?,?,?,?,?,?,?,?,?, 'ready',?)`).run(id, courseId, input.sourceId, material.revision, input.voiceId, settingsHash, textHash, relPath, result.durationMs, result.byteLength, JSON.stringify(anchors), 'local', createdAt);
  store.db.prepare(`insert into derivatives(id,course_id,source_id,source_revision,kind,status,model_version) values (?,?,?,?,'audio','ready',?)`)
    .run(createId('drv'), courseId, input.sourceId, material.revision, `say:${input.voiceId}`);
  return {
    id, courseId, sourceId: input.sourceId, sourceRevision: material.revision, voiceId: input.voiceId, settingsHash, textHash, relPath,
    durationMs: result.durationMs, byteLength: result.byteLength, anchors, providerId: 'local', status: 'ready', createdAt,
    timing: { startupMs: result.startupMs, throughputCharsPerSec: result.throughputCharsPerSec, costUsd: 0, downloadedBytes: 0 },
    reused: false
  };
}

export function narrationAudioPath(store: Store, courseId: string, assetId: string): string {
  const asset = getNarrationAsset(store, courseId, assetId);
  if (asset.status !== 'ready') throw new CourseError('narration_stale', 409);
  const absolute = resolveInside(store.dataDir, asset.relPath);
  if (!fs.existsSync(absolute)) throw new CourseError('narration_file_missing', 404);
  return absolute;
}

export function getPlaybackState(store: Store, courseId: string, assetId: string): NarrationPlaybackState {
  requireAudio(store, courseId);
  getNarrationAsset(store, courseId, assetId);
  const row = store.db.prepare('select * from narration_playback where course_id=? and asset_id=?').get(courseId, assetId) as {
    course_id: string; asset_id: string; offset_ms: number; speed: number; bookmarks_json: string; updated_at: string;
  } | undefined;
  if (!row) {
    return { courseId, assetId, offsetMs: 0, speed: 1, bookmarks: [], updatedAt: new Date().toISOString() };
  }
  return {
    courseId: row.course_id, assetId: row.asset_id, offsetMs: row.offset_ms, speed: row.speed,
    bookmarks: JSON.parse(row.bookmarks_json) as NarrationPlaybackState['bookmarks'], updatedAt: row.updated_at
  };
}

export function savePlaybackState(store: Store, courseId: string, assetId: string, input: unknown): NarrationPlaybackState {
  requireAudio(store, courseId, true);
  const asset = getNarrationAsset(store, courseId, assetId);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CourseError('invalid_playback_state');
  const body = input as Record<string, unknown>;
  const offsetMs = Number(body.offsetMs ?? 0);
  const speed = Number(body.speed ?? 1);
  if (!Number.isFinite(offsetMs) || offsetMs < 0 || offsetMs > asset.durationMs) throw new CourseError('invalid_playback_offset');
  if (![0.5, 0.75, 1, 1.25, 1.5, 2].includes(speed)) throw new CourseError('invalid_playback_speed');
  const bookmarks = Array.isArray(body.bookmarks) ? body.bookmarks : [];
  for (const mark of bookmarks) {
    if (!mark || typeof mark !== 'object') throw new CourseError('invalid_bookmark');
    const row = mark as Record<string, unknown>;
    if (typeof row.label !== 'string' || row.label.length > 80 || typeof row.offsetMs !== 'number' || row.offsetMs < 0 || row.offsetMs > asset.durationMs) {
      throw new CourseError('invalid_bookmark');
    }
  }
  const updatedAt = new Date().toISOString();
  store.db.prepare(`insert into narration_playback(course_id,asset_id,offset_ms,speed,bookmarks_json,updated_at) values (?,?,?,?,?,?)
    on conflict(course_id,asset_id) do update set offset_ms=excluded.offset_ms, speed=excluded.speed, bookmarks_json=excluded.bookmarks_json, updated_at=excluded.updated_at`)
    .run(courseId, assetId, Math.round(offsetMs), speed, JSON.stringify(bookmarks), updatedAt);
  return { courseId, assetId, offsetMs: Math.round(offsetMs), speed, bookmarks: bookmarks as NarrationPlaybackState['bookmarks'], updatedAt };
}

export function seekPlayback(store: Store, courseId: string, assetId: string, offsetMs: number, speed?: number): NarrationPlaybackState {
  const current = getPlaybackState(store, courseId, assetId);
  return savePlaybackState(store, courseId, assetId, { offsetMs, speed: speed ?? current.speed, bookmarks: current.bookmarks });
}

export function activeSentence(asset: NarrationAsset, offsetMs: number): SentenceAnchor | null {
  return asset.anchors.find((a) => offsetMs >= a.startMs && offsetMs < a.endMs) ?? asset.anchors[asset.anchors.length - 1] ?? null;
}
