import type { FastifyInstance } from 'fastify';
import { createActivity, listActivities, deleteActivity, type Store } from '@collegenotes/storage';
export function studyRoutes(app: FastifyInstance, store: Store) {
  app.get('/courses/:id/study/activities', async r => listActivities(store, (r.params as {id:string}).id));
  app.post('/courses/:id/study/activities', async r => createActivity(store, (r.params as {id:string}).id, r.body));
  app.delete('/courses/:id/study/activities/:activityId', async r => {
    const {id,activityId}=r.params as {id:string;activityId:string};return deleteActivity(store,id,activityId);
  });
}
