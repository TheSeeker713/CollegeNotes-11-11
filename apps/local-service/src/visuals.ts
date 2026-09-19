import type { FastifyInstance } from 'fastify';
import {
  applyTutorVisualAction,
  applyVisualExperimentAction,
  createVisualExperiment,
  exportVisualRecords,
  getVisualExperiment,
  listVisualExperiments,
  narrationForVisualExperiment,
  restoreVisualExperiment,
  type Store
} from '@collegenotes/storage';

export function visualsRoutes(app: FastifyInstance, store: Store) {
  app.get('/courses/:id/visuals/experiments', async (r) => listVisualExperiments(store, (r.params as { id: string }).id));
  app.post('/courses/:id/visuals/experiments', async (r) => createVisualExperiment(store, (r.params as { id: string }).id, r.body));
  app.get('/courses/:id/visuals/experiments/:experimentId', async (r) => {
    const p = r.params as { id: string; experimentId: string };
    return getVisualExperiment(store, p.id, p.experimentId);
  });
  app.post('/courses/:id/visuals/experiments/:experimentId/actions', async (r) => {
    const p = r.params as { id: string; experimentId: string };
    return applyVisualExperimentAction(store, p.id, p.experimentId, r.body);
  });
  app.put('/courses/:id/visuals/experiments/:experimentId/state', async (r) => {
    const p = r.params as { id: string; experimentId: string };
    return restoreVisualExperiment(store, p.id, p.experimentId, r.body);
  });
  app.get('/courses/:id/visuals/experiments/:experimentId/narration', async (r) => {
    const p = r.params as { id: string; experimentId: string };
    return narrationForVisualExperiment(store, p.id, p.experimentId);
  });
  app.post('/courses/:id/visuals/tutor-action', async (r) => applyTutorVisualAction(store, (r.params as { id: string }).id, r.body));
  app.get('/courses/:id/visuals/export', async (r) => exportVisualRecords(store, (r.params as { id: string }).id));
}
