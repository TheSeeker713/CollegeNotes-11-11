import Fastify from 'fastify';
import { parseAppearance, parseCardLayout, type SessionState } from '@collegenotes/domain';
import {
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
import { cancelJob, ingestBuffer, retryJob } from './jobs.js';

export const DEFAULT_PORT = 4781;
const ALLOWED = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:4173', 'http://127.0.0.1:4781']);

export function createService(store?: Store) {
  const opened = store ?? openStore(process.env.COLLEGENOTES_DATA_DIR ?? defaultDataDir());
  restoreInterruptedJobs(opened);
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
  app.get('/courses/:id/materials', async (request) => listMaterials(opened, (request.params as { id: string }).id).map(({ storedRelPath: _privatePath, ...material }) => material));
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
