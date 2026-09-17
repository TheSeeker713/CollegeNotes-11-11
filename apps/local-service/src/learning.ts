import type {FastifyInstance} from 'fastify';
import {
  startResearchSession, cancelResearchSession, completeResearchSession, failResearchSession, getResearchSession,
  openTutorSession, getTutorSession, saveTutorContext, recordTutorTurn, buildTutorContext,
  type Store, CourseError
} from '@collegenotes/storage';
import {evaluateResearchClaims, structuredTutorReply, type ResearchTransport, syntheticResearchTransport} from '@collegenotes/providers';
import {embeddingWorker, LOCAL_MODEL} from './semantic.js';

const running = new Map<string, AbortController>();

export function learningRoutes(app: FastifyInstance, store: Store, researchTransport: ResearchTransport = defaultTransport()) {
  app.post('/courses/:id/research/sessions', async (request) => {
    const courseId = (request.params as { id: string }).id;
    const body = (request.body ?? {}) as Record<string, unknown>;
    const session = startResearchSession(store, courseId, {
      query: body.query,
      sharedContext: body.sharedContext,
      acknowledgeTransmission: body.acknowledgeTransmission
    });
    const controller = new AbortController();
    running.set(session.id, controller);
    void (async () => {
      try {
        const pages = await researchTransport.search(session.query, controller.signal);
        if (controller.signal.aborted) return;
        const claims = evaluateResearchClaims(session.query, pages);
        completeResearchSession(store, courseId, session.id, pages, claims);
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          try { cancelResearchSession(store, courseId, session.id); } catch { /* already terminal */ }
        } else {
          failResearchSession(store, courseId, session.id);
        }
      } finally {
        running.delete(session.id);
      }
    })();
    return session;
  });

  app.get('/courses/:id/research/sessions/:sessionId', async (request) => {
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    return getResearchSession(store, id, sessionId);
  });

  app.post('/courses/:id/research/sessions/:sessionId/cancel', async (request) => {
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    running.get(sessionId)?.abort();
    running.delete(sessionId);
    return cancelResearchSession(store, id, sessionId);
  });

  app.post('/courses/:id/tutor/sessions', async (request) => {
    const courseId = (request.params as { id: string }).id;
    const body = (request.body ?? {}) as { unfinishedQuestion?: string; researchSessionId?: string | null; offline?: boolean };
    return openTutorSession(store, courseId, body);
  });

  app.get('/courses/:id/tutor/sessions/:sessionId', async (request) => {
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    return getTutorSession(store, id, sessionId);
  });

  app.post('/courses/:id/tutor/sessions/:sessionId/turns', async (request) => {
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const session = getTutorSession(store, id, sessionId);
    if (session.offline) throw new CourseError('cloud_unavailable_offline', 409);
    if (typeof body.question !== 'string') throw new CourseError('invalid_tutor_question');
    if (!['explain', 'example', 'hint', 'check_understanding'].includes(body.action as string)) throw new CourseError('invalid_tutor_action');
    const [vector] = await embeddingWorker([body.question.trim()]);
    const context = buildTutorContext(store, id, body.question.trim(), vector!, LOCAL_MODEL);
    saveTutorContext(store, id, sessionId, context, body.question.trim());
    const answer = structuredTutorReply(body.action as 'explain' | 'example' | 'hint' | 'check_understanding', body.question.trim(), context);
    return recordTutorTurn(store, id, sessionId, {
      clientRequestId: body.clientRequestId,
      action: body.action,
      question: body.question,
      context,
      answer
    });
  });
}

function defaultTransport(): ResearchTransport {
  return syntheticResearchTransport([
    {
      url: 'https://example.com/synthetic-research',
      title: 'Synthetic research page',
      publisher: 'Example',
      text: 'This synthetic page explains photosynthesis converting sunlight into chemical energy for evaluation fixtures.'
    }
  ]);
}
