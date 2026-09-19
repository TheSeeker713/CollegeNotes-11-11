import { studyRoutes } from './study.js';
import Fastify from 'fastify';
import { parseAppearance, parseCardLayout, type SessionState } from '@collegenotes/domain';
import {
  readOriginal, checksum,
  materialCollection, materialDetail, correctMaterial, approveMaterial, trashMaterial, deleteMaterial, exportMaterials,
  indexStatus, recoverIndexes, cancelIndex,
  queueImport, listImportTasks, changeImportTask, recoverImportTasks,
  createCourse,
  exportCourse, deleteCourse,
  courseModules, setCourseModule,
  courseCollection, courseInput, editCourse, archiveCourse, requireCourse, CourseError,
  defaultDataDir,
  getAppearance,
  getDraft,
  getJob,
  getLayout,
  getSession,
  listCourses,
  listConnections,
  listMaterials,
  listResearchSessions,
  recoverSession,
  openStore,
  probeSqlite,
  resolveInside,
  restoreInterruptedJobs,
  setAppearance,
  setDraft,
  setLayout,
  setSession,
  type Store
} from '@collegenotes/storage';
import { describeUnavailable, PROVIDERS, connectionSummary } from '@collegenotes/providers';
import { renderPdfPage } from '@collegenotes/importers';
import { processImport } from './extraction.js';
import {rebuildIndex,searchIndex,LOCAL_MODEL} from './semantic.js';
import {verifyEmbeddingModel} from '@collegenotes/importers';
import { cancelJob, ingestBuffer, retryJob } from './jobs.js';

import {accountRoutes} from './accounts.js';
import {offlineRoutes} from './offline.js';
import {readingRoutes} from './reading.js';
import {retrievalRoutes} from './retrieval.js';
import {learningRoutes} from './learning.js';
export const DEFAULT_PORT = 4781;
const ALLOWED = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:4173', 'http://127.0.0.1:4781']);

export function createService(store?: Store) {
  const opened = store ?? openStore(process.env.COLLEGENOTES_DATA_DIR ?? defaultDataDir());
  restoreInterruptedJobs(opened);
  recoverImportTasks(opened);
  recoverIndexes(opened);
  const app = Fastify({ logger: false });

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    const host = request.headers.host ?? '';
    if (origin && !ALLOWED.has(origin)) return reply.code(403).send({ error: 'origin_rejected' });
    if (!/^(127\.0\.0\.1|localhost)(:[0-9]+)?$/.test(host)) return reply.code(403).send({ error: 'host_rejected' });
    if (origin) {
      reply.header('access-control-allow-origin', origin).header('vary', 'Origin');
      if (request.method === 'OPTIONS') {
        const method = request.headers['access-control-request-method'];
        if (typeof method !== 'string' || !['GET', 'POST', 'PUT', 'DELETE'].includes(method)) return reply.code(403).send({ error: 'method_rejected' });
        return reply.header('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
          .header('access-control-allow-headers', 'content-type, x-cn-client').code(204).send();
      }
      if (!['GET', 'HEAD'].includes(request.method) && request.headers['x-cn-client'] !== 'collegenotes-web') return reply.code(403).send({ error: 'client_required' });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof CourseError) return reply.code(error.status).send({ error: error.code });
    return reply.code(500).send({ error: 'local_operation_failed' });
  });

  readingRoutes(app,opened);
  offlineRoutes(app,opened);
  accountRoutes(app,opened);
  retrievalRoutes(app,opened);
  learningRoutes(app,opened);
  studyRoutes(app,opened);

  app.get('/health', async () => {
    const sqlite = probeSqlite();
    return {
      ok: true as const,
      service: 'collegenotes-local',
      sqlite: sqlite.sqlite,
      fts5: sqlite.fts5,
      sqliteVersion: sqlite.version,
      tutor: describeUnavailable('tutor'),
      dataDir: opened.dataDir
    };
  });

  app.get('/providers/:kind', async (request, reply) => {
    const kind = (request.params as { kind: string }).kind;
    if (kind !== 'tutor' && kind !== 'narration' && kind !== 'recognition') {
      return reply.code(404).send({ error: 'unknown_provider' });
    }
    return { ok: false, message: describeUnavailable(kind) };
  });

  app.get('/connections', async () => ({ availableProviders: PROVIDERS, connections: listConnections(opened).map(connectionSummary), liveAuthenticationAvailable: false }));
  app.get('/courses/:id/materials', async (request) => materialCollection(opened, (request.params as { id: string }).id).map(({ storedRelPath: _privatePath, ...material }) => material));
  app.get('/courses/:id/research', async (request) => listResearchSessions(opened, (request.params as { id: string }).id));
  app.get('/courses', async () => listCourses(opened));
  app.get('/courses/:id/modules', async (request) => courseModules(opened, (request.params as { id: string }).id));
  app.put('/courses/:id/modules/:moduleId', async (request) => {
    const params = request.params as { id: string; moduleId: string };
    return setCourseModule(opened, params.id, params.moduleId, (request.body as { enabled?: unknown } | null)?.enabled);
  });
  app.get('/courses/:id/export', async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const result = exportCourse(opened, id);
    return reply.header('content-disposition', `attachment; filename="course-${result.data.course.id}.json"`).send(result);
  });
  app.delete('/courses/:id', async (request) => deleteCourse(opened, (request.params as { id: string }).id, request.body));
  app.get('/course-collection', async () => courseCollection(opened));
  app.post('/courses', async (request) => {
    const input = courseInput(request.body);
    return opened.db.transaction(() => editCourse(opened, createCourse(opened, input.name).id, input))();
  });
  app.put('/courses/:id', async (request) => editCourse(opened, (request.params as { id: string }).id, request.body));
  app.post('/courses/:id/archive', async (request) => archiveCourse(opened, (request.params as { id: string }).id, true));
  app.post('/courses/:id/restore', async (request) => archiveCourse(opened, (request.params as { id: string }).id, false));

  app.get('/courses/:id/materials/:sourceId',async(request)=>{
    const {id,sourceId}=request.params as {id:string;sourceId:string};return materialDetail(opened,id,sourceId);
  });
  app.put('/courses/:id/materials/:sourceId', {bodyLimit:8*1024*1024}, async(request)=>{
    const {id,sourceId}=request.params as {id:string;sourceId:string};return correctMaterial(opened,id,sourceId,request.body);
  });
  app.post('/courses/:id/materials/:sourceId/approve',async(request)=>{
    const {id,sourceId}=request.params as {id:string;sourceId:string};return approveMaterial(opened,id,sourceId,request.body);
  });
  app.post('/courses/:id/materials/:sourceId/trash',async(request)=>{
    const {id,sourceId}=request.params as {id:string;sourceId:string};return trashMaterial(opened,id,sourceId);
  });
  app.post('/courses/:id/materials/:sourceId/restore',async(request)=>{
    const {id,sourceId}=request.params as {id:string;sourceId:string};return trashMaterial(opened,id,sourceId,true);
  });
  app.delete('/courses/:id/materials/:sourceId',async(request)=>{
    const {id,sourceId}=request.params as {id:string;sourceId:string};return deleteMaterial(opened,id,sourceId,request.body);
  });
  app.post('/courses/:id/material-export',async(request,reply)=>{
    const {id}=request.params as {id:string};const result=exportMaterials(opened,id,(request.body as {sourceIds?:unknown}|null)?.sourceIds);
    return reply.header('content-disposition','attachment; filename="materials.json"').send(result);
  });
  app.get('/courses/:id/local-index',async(request)=>{
    const {id}=request.params as {id:string};const status=indexStatus(opened,id);let modelReady=true;try{verifyEmbeddingModel();}catch{modelReady=false;}
    return {index:status,model:LOCAL_MODEL,modelReady};
  });
  app.post('/courses/:id/local-index',async(request)=>{
    const {id}=request.params as {id:string};void rebuildIndex(opened,id).catch(()=>undefined);return {started:true};
  });
  app.post('/courses/:id/local-index/cancel',async(request)=>{cancelIndex(opened,(request.params as {id:string}).id);return {cancelled:true};});
  app.post('/courses/:id/local-index/query',async(request)=>searchIndex(opened,(request.params as {id:string}).id,(request.body as {query?:unknown}|null)?.query));
  app.get('/courses/:id/materials/:sourceId/preview/:page',async(request,reply)=>{
    const {id,sourceId,page}=request.params as {id:string;sourceId:string;page:string};requireCourse(opened,id,true);
    const material=listMaterials(opened,id).find(m=>m.id===sourceId);if(!material)throw new CourseError('material_unavailable',404);
    if(!/^[1-9][0-9]{0,2}$/.test(page))throw new CourseError('invalid_page');const bytes=readOriginal(opened,material);if(checksum(bytes)!==material.checksum)throw new CourseError('original_checksum_mismatch',409);
    if(/\.pdf$/i.test(material.filename))return reply.type('image/png').send(await renderPdfPage(bytes,Number(page)));
    if(Number(page)!==1||!(/\.(png|jpe?g)$/i.test(material.filename)))throw new CourseError('preview_unavailable',404);
    return reply.type(/\.png$/i.test(material.filename)?'image/png':'image/jpeg').header('x-content-type-options','nosniff').send(bytes);
  });
  app.get('/courses/:id/materials/:sourceId/original',async(request,reply)=>{
    const {id,sourceId}=request.params as {id:string;sourceId:string};requireCourse(opened,id,true);
    const material=listMaterials(opened,id).find(m=>m.id===sourceId);if(!material)throw new CourseError('material_unavailable',404);
    const bytes=readOriginal(opened,material);if(checksum(bytes)!==material.checksum)throw new CourseError('original_checksum_mismatch',409);
    return reply.header('content-type','application/octet-stream').header('x-content-type-options','nosniff').header('content-disposition',`attachment; filename="${material.filename.replace(/[^a-zA-Z0-9._-]/g,'_')}"`).send(bytes);
  });
  app.get('/courses/:id/imports', async (request) => listImportTasks(opened,(request.params as {id:string}).id));
  app.post('/courses/:id/imports', {bodyLimit:36*1024*1024}, async (request) => {
    const body=request.body as {filename?:unknown;contentBase64?:unknown;kind?:unknown}|null;
    if(!body || typeof body.filename!=='string' || typeof body.contentBase64!=='string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.contentBase64)) throw new CourseError('invalid_import');
    if(body.kind!==undefined && body.kind!=='note' && body.kind!=='imported')throw new CourseError('invalid_material_kind');
    return queueImport(opened,(request.params as {id:string}).id,body.filename,Buffer.from(body.contentBase64,'base64'),body.kind as 'note'|'imported'|undefined);
  });
  app.post('/courses/:id/imports/:taskId/:action',async (request)=>{
    const {id,taskId,action}=request.params as {id:string;taskId:string;action:string};
    if(action==='process'){
      requireCourse(opened,id,true);const task=listImportTasks(opened,id).find(t=>t.id===taskId);
      if(!task||task.status!=='queued')throw new CourseError('import_not_queued',409);
      if(!listMaterials(opened,id).some(m=>m.id===task.sourceId))throw new CourseError('material_unavailable',404);
      void processImport(opened,id,taskId).catch(()=>undefined);return {started:true};
    }
    if(action!=='cancel'&&action!=='retry')throw new CourseError('invalid_import_action');
    return changeImportTask(opened,id,taskId,action);
  });

  app.get('/appearance', async () => getAppearance(opened));
  app.put('/appearance', async (request) => setAppearance(opened, parseAppearance(request.body)));

  app.get('/courses/:id/layout', async (request) => getLayout(opened, (request.params as { id: string }).id));
  app.put('/courses/:id/layout', async (request) => setLayout(opened, (request.params as { id: string }).id, parseCardLayout(request.body)));

  app.get('/session', async () => getSession(opened));
  app.put('/session', async (request, reply) => {
    const body = request.body as Partial<SessionState> | null;
    if (!body || typeof body.routeHash !== 'string') return reply.code(400).send({ error: 'invalid_session' });
    return setSession(opened, recoverSession(opened, body));
  });

  app.get('/drafts/:key', async (request) => getDraft(opened, (request.params as { key: string }).key));
  app.put('/drafts', async (request, reply) => {
    const body = (request.body ?? {}) as { key?: unknown; courseId?: unknown; body?: unknown };
    if (typeof body.key !== 'string' || typeof body.body !== 'string') return reply.code(400).send({ error: 'invalid_draft' });
    if (typeof body.courseId === 'string' && !listCourses(opened).some((course) => course.id === body.courseId)) return reply.code(404).send({ error: 'course_unavailable' });
    try { return setDraft(opened, { key: body.key, courseId: typeof body.courseId === 'string' ? body.courseId : null, body: body.body }); }
    catch { return reply.code(409).send({ error: 'draft_course_mismatch' }); }
  });

  app.post('/jobs', async (request, reply) => {
    const body = (request.body ?? {}) as { courseId?: unknown; filename?: unknown; contentBase64?: unknown };
    if (typeof body.courseId !== 'string' || typeof body.filename !== 'string' || typeof body.contentBase64 !== 'string') {
      return reply.code(400).send({ error: 'invalid_job' });
    }
    try {
      resolveInside(opened.dataDir, body.filename.replace(/^\/+/, ''));
    } catch {
      return reply.code(400).send({ error: 'path_rejected' });
    }
    requireCourse(opened, body.courseId, true);
    const buffer = Buffer.from(body.contentBase64, 'base64');
    return ingestBuffer(opened, body.courseId, body.filename, buffer);
  });

  app.get('/jobs/:id', async (request, reply) => {
    const job = getJob(opened, (request.params as { id: string }).id);
    if (!job) return reply.code(404).send({ error: 'not_found' });
    return job;
  });

  app.post('/jobs/:id/cancel', async (request, reply) => {
    try {
      return cancelJob(opened, (request.params as { id: string }).id);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  app.post('/jobs/:id/retry', async (request, reply) => {
    const body = (request.body ?? {}) as { contentBase64?: unknown; filename?: unknown };
    if (typeof body.contentBase64 !== 'string' || typeof body.filename !== 'string') return reply.code(400).send({ error: 'invalid_retry' });
    try {
      return retryJob(opened, (request.params as { id: string }).id, () => Buffer.from(body.contentBase64 as string, 'base64'), body.filename);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  app.post('/files/probe-path', async (request, reply) => {
    const rel = ((request.body ?? {}) as { path?: unknown }).path;
    if (typeof rel !== 'string') return reply.code(400).send({ error: 'invalid' });
    try {
      return { path: resolveInside(opened.dataDir, rel) };
    } catch {
      return reply.code(400).send({ error: 'path_rejected' });
    }
  });

  return app;
}

export async function listen(port = Number(process.env.COLLEGENOTES_PORT ?? DEFAULT_PORT)) {
  const app = createService();
  try {
    await app.listen({ host: '127.0.0.1', port });
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other process or set COLLEGENOTES_PORT.`);
      process.exit(2);
    }
    throw error;
  }
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await listen();
}
