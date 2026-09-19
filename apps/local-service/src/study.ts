import type { FastifyInstance } from 'fastify';
import { createActivity, listActivities, deleteActivity, startAttempt, getAttempt, updateAttempt, studyAttempts, CourseError, type Store } from '@collegenotes/storage';
export function studyRoutes(app: FastifyInstance, store: Store) {
  app.get('/courses/:id/study/attempts',async r=>studyAttempts(store,(r.params as {id:string}).id));
  app.post('/courses/:id/study/activities/:activityId/attempts',async r=>{const {id,activityId}=r.params as {id:string;activityId:string};return startAttempt(store,id,activityId);});
  app.get('/courses/:id/study/attempts/:attemptId',async r=>{const {id,attemptId}=r.params as {id:string;attemptId:string};return getAttempt(store,id,attemptId);});
  app.post('/courses/:id/study/attempts/:attemptId/:action',async r=>{const {id,attemptId,action}=r.params as {id:string;attemptId:string;action:string};if(!['save','hint','submit','reveal'].includes(action))throw new CourseError('invalid_attempt_action');return updateAttempt(store,id,attemptId,action as 'save'|'hint'|'submit'|'reveal',r.body);});
  app.get('/courses/:id/study/activities' , async r => listActivities(store, (r.params as {id:string}).id));
  app.post('/courses/:id/study/activities', async r => createActivity(store, (r.params as {id:string}).id, r.body));
  app.delete('/courses/:id/study/activities/:activityId', async r => {
    const {id,activityId}=r.params as {id:string;activityId:string};return deleteActivity(store,id,activityId);
  });
}
