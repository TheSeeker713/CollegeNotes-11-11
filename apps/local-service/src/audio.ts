import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import {
  CourseError,
  advanceVoiceInterrupt,
  echoSuppressedWhileTutorAudio,
  generateNarration,
  getNarrationAsset,
  getPlaybackState,
  getRecognitionTranscript,
  getVoiceInterrupt,
  interruptNarration,
  listNarrationAssets,
  listNarrationVoices,
  listRecognitionTranscripts,
  narrationAudioPath,
  savePlaybackState,
  updateRecognitionTranscript,
  type Store
} from '@collegenotes/storage';

export function audioRoutes(app: FastifyInstance, store: Store) {
  app.get('/audio/voices', async () => listNarrationVoices());
  app.get('/courses/:id/audio/narrations', async (r) => {
    const sourceId = typeof r.query === 'object' && r.query && 'sourceId' in r.query ? String((r.query as { sourceId?: string }).sourceId ?? '') : '';
    return listNarrationAssets(store, (r.params as { id: string }).id, sourceId || undefined);
  });
  app.post('/courses/:id/audio/narrations', async (r) => generateNarration(store, (r.params as { id: string }).id, (r.body ?? {}) as { sourceId: unknown; voiceId: unknown; rate?: unknown; start?: unknown; end?: unknown }));
  app.get('/courses/:id/audio/narrations/:assetId', async (r) => {
    const { id, assetId } = r.params as { id: string; assetId: string };
    return getNarrationAsset(store, id, assetId);
  });
  app.get('/courses/:id/audio/narrations/:assetId/file', async (r, reply) => {
    const { id, assetId } = r.params as { id: string; assetId: string };
    const file = narrationAudioPath(store, id, assetId);
    const buf = fs.readFileSync(file);
    return reply.type('audio/wav').send(buf);
  });
  app.get('/courses/:id/audio/narrations/:assetId/playback', async (r) => {
    const { id, assetId } = r.params as { id: string; assetId: string };
    return getPlaybackState(store, id, assetId);
  });
  app.put('/courses/:id/audio/narrations/:assetId/playback', async (r) => {
    const { id, assetId } = r.params as { id: string; assetId: string };
    return savePlaybackState(store, id, assetId, r.body);
  });
  app.get('/courses/:id/audio/recognition', async (r) => listRecognitionTranscripts(store, (r.params as { id: string }).id));
  app.post('/courses/:id/audio/recognition', async () => { throw new CourseError('speech_recognition_unavailable',409); });
  app.get('/courses/:id/audio/recognition/:transcriptId', async (r) => {
    const { id, transcriptId } = r.params as { id: string; transcriptId: string };
    return getRecognitionTranscript(store, id, transcriptId);
  });
  app.put('/courses/:id/audio/recognition/:transcriptId', async (r) => {
    const { id, transcriptId } = r.params as { id: string; transcriptId: string };
    return updateRecognitionTranscript(store, id, transcriptId, r.body);
  });
  app.post('/courses/:id/audio/interrupt', async (r) => interruptNarration(store, (r.params as { id: string }).id, r.body));
  app.get('/courses/:id/audio/interrupt/:interruptId', async (r) => {
    const { id, interruptId } = r.params as { id: string; interruptId: string };
    return getVoiceInterrupt(store, id, interruptId);
  });
  app.post('/courses/:id/audio/interrupt/:interruptId', async (r) => {
    const { id, interruptId } = r.params as { id: string; interruptId: string };
    return advanceVoiceInterrupt(store, id, interruptId, r.body);
  });
  app.get('/courses/:id/audio/interrupt/:interruptId/echo', async (r) => {
    const { id, interruptId } = r.params as { id: string; interruptId: string };
    return { suppressed: echoSuppressedWhileTutorAudio(store, id, interruptId) };
  });
  app.post('/courses/:id/audio/mic/state', async (r) => {
    const body = (r.body ?? {}) as { permission?: string; capture?: string };
    if (!['unknown', 'granted', 'denied', 'revoked', 'missing_device'].includes(String(body.permission ?? 'unknown'))) throw new CourseError('invalid_mic_permission');
    return { permission: body.permission ?? 'unknown', capture: body.capture ?? 'idle', note: 'Browser permission UI is owner-tested; server records reported state only.' };
  });
}
