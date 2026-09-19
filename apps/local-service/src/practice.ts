import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import {
  CourseError,
  advanceRehearsal,
  createAnnotation,
  createChecklistItem,
  createCueCard,
  createObservation,
  createRehearsal,
  evaluateVisualClaim,
  exportPracticeRecords,
  getOrCreateTranscript,
  getObservation,
  getPracticeMedia,
  getRehearsal,
  importPracticeMedia,
  inspectPracticeSlide,
  listAnnotations,
  listChecklist,
  listCueCards,
  listObservations,
  listPracticeHistory,
  listPracticeMedia,
  listRehearsals,
  listTranscripts,
  practiceMediaPath,
  practiceTutorQuestionHook,
  setAssignmentStatus,
  updateChecklistItem,
  updateCueCard,
  updateObservation,
  updateTranscript,
  wordCountFeedback,
  type Store
} from '@collegenotes/storage';

export function practiceRoutes(app: FastifyInstance, store: Store) {
  app.get('/courses/:id/practice/observations', async (r) => listObservations(store, (r.params as { id: string }).id));
  app.post('/courses/:id/practice/observations', async (r) => createObservation(store, (r.params as { id: string }).id, r.body));
  app.get('/courses/:id/practice/observations/:observationId', async (r) => {
    const { id, observationId } = r.params as { id: string; observationId: string };
    return getObservation(store, id, observationId);
  });
  app.put('/courses/:id/practice/observations/:observationId', async (r) => {
    const { id, observationId } = r.params as { id: string; observationId: string };
    return updateObservation(store, id, observationId, r.body);
  });
  app.post('/courses/:id/practice/word-count', async (r) => {
    const body = (r.body ?? {}) as { text?: unknown };
    if (typeof body.text !== 'string') throw new CourseError('invalid_observation_body');
    return wordCountFeedback(body.text);
  });

  app.get('/courses/:id/practice/media', async (r) => listPracticeMedia(store, (r.params as { id: string }).id));
  app.post('/courses/:id/practice/media', async (r) => importPracticeMedia(store, (r.params as { id: string }).id, (r.body ?? {}) as { filename: unknown; mimeType?: unknown; contentBase64: unknown; durationMs?: unknown }));
  app.get('/courses/:id/practice/media/:mediaId', async (r) => {
    const { id, mediaId } = r.params as { id: string; mediaId: string };
    return getPracticeMedia(store, id, mediaId);
  });
  app.get('/courses/:id/practice/media/:mediaId/file', async (r, reply) => {
    const { id, mediaId } = r.params as { id: string; mediaId: string };
    const media = getPracticeMedia(store, id, mediaId);
    const file = practiceMediaPath(store, id, mediaId);
    return reply.type(media.mimeType).send(fs.readFileSync(file));
  });
  app.post('/courses/:id/practice/media/:mediaId/transcript', async (r) => {
    const { id, mediaId } = r.params as { id: string; mediaId: string };
    return getOrCreateTranscript(store, id, mediaId, r.body as { segments?: unknown; rawText?: unknown } | undefined);
  });
  app.get('/courses/:id/practice/transcripts', async (r) => listTranscripts(store, (r.params as { id: string }).id));
  app.put('/courses/:id/practice/transcripts/:transcriptId', async (r) => {
    const { id, transcriptId } = r.params as { id: string; transcriptId: string };
    return updateTranscript(store, id, transcriptId, r.body);
  });
  app.get('/courses/:id/practice/annotations', async (r) => {
    const mediaId = typeof r.query === 'object' && r.query && 'mediaId' in r.query ? String((r.query as { mediaId?: string }).mediaId ?? '') : '';
    return listAnnotations(store, (r.params as { id: string }).id, mediaId || undefined);
  });
  app.post('/courses/:id/practice/annotations', async (r) => createAnnotation(store, (r.params as { id: string }).id, r.body));
  app.post('/courses/:id/practice/media/:mediaId/visual-claim', async (r) => {
    const { id, mediaId } = r.params as { id: string; mediaId: string };
    const claim = typeof (r.body as { claim?: unknown })?.claim === 'string' ? (r.body as { claim: string }).claim : '';
    return evaluateVisualClaim(store, id, mediaId, claim);
  });

  app.get('/courses/:id/practice/cues', async (r) => listCueCards(store, (r.params as { id: string }).id));
  app.post('/courses/:id/practice/cues', async (r) => createCueCard(store, (r.params as { id: string }).id, r.body));
  app.put('/courses/:id/practice/cues/:cueId', async (r) => {
    const { id, cueId } = r.params as { id: string; cueId: string };
    return updateCueCard(store, id, cueId, r.body);
  });
  app.get('/courses/:id/practice/rehearsals', async (r) => listRehearsals(store, (r.params as { id: string }).id));
  app.post('/courses/:id/practice/rehearsals', async (r) => createRehearsal(store, (r.params as { id: string }).id, r.body));
  app.get('/courses/:id/practice/rehearsals/:rehearsalId', async (r) => {
    const { id, rehearsalId } = r.params as { id: string; rehearsalId: string };
    return getRehearsal(store, id, rehearsalId);
  });
  app.post('/courses/:id/practice/rehearsals/:rehearsalId', async (r) => {
    const { id, rehearsalId } = r.params as { id: string; rehearsalId: string };
    return advanceRehearsal(store, id, rehearsalId, r.body);
  });
  app.post('/courses/:id/practice/slide-inspect', async (r) => inspectPracticeSlide(r.body));
  app.post('/courses/:id/practice/tutor-question', async (r) => {
    const topic = typeof (r.body as { topic?: unknown })?.topic === 'string' ? (r.body as { topic: string }).topic : '';
    return practiceTutorQuestionHook(store, (r.params as { id: string }).id, topic);
  });

  app.get('/courses/:id/practice/checklist', async (r) => listChecklist(store, (r.params as { id: string }).id));
  app.post('/courses/:id/practice/checklist', async (r) => createChecklistItem(store, (r.params as { id: string }).id, r.body));
  app.put('/courses/:id/practice/checklist/:itemId', async (r) => {
    const { id, itemId } = r.params as { id: string; itemId: string };
    return updateChecklistItem(store, id, itemId, r.body);
  });
  app.get('/courses/:id/practice/history', async (r) => listPracticeHistory(store, (r.params as { id: string }).id));
  app.put('/courses/:id/practice/history/:historyId/assignment-status', async (r) => {
    const { id, historyId } = r.params as { id: string; historyId: string };
    return setAssignmentStatus(store, id, historyId, (r.body as { assignmentStatus?: unknown })?.assignmentStatus);
  });
  app.get('/courses/:id/practice/export', async (r) => exportPracticeRecords(store, (r.params as { id: string }).id));
}
