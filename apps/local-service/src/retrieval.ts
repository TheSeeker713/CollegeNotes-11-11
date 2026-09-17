import type {FastifyInstance} from 'fastify';
import {buildTutorContext,type Store,CourseError} from '@collegenotes/storage';
import {embeddingWorker,LOCAL_MODEL} from './semantic.js';

export function retrievalRoutes(app: FastifyInstance, store: Store) {
  app.post('/courses/:id/tutor-context', async (request) => {
    const courseId = (request.params as { id: string }).id;
    const query = (request.body as { query?: unknown } | null)?.query;
    if (typeof query !== 'string' || !query.trim() || query.length > 240) throw new CourseError('invalid_search');
    const [vector] = await embeddingWorker([query.trim()]);
    return buildTutorContext(store, courseId, query.trim(), vector!, LOCAL_MODEL);
  });
}
