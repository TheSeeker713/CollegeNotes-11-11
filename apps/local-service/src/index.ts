import Fastify from 'fastify';
import { parseAppearance, parseCardLayout, type SessionState } from '@collegenotes/domain';
import {
  createCourse,
  defaultDataDir,
  getAppearance,
  getDraft,
  getJob,
  getLayout,
  getSession,
  listCourses,
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
import { describeUnavailable } from '@collegenotes/providers';
import { cancelJob, ingestBuffer, retryJob } from './jobs.js';

export const DEFAULT_PORT = 4781;
const ALLOWED = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:4173', 'http://127.0.0.1:4781']);

export function createService(store?: Store) {
  const opened = store ?? openStore(process.env.COLLEGENOTES_DATA_DIR ?? defaultDataDir());
  restoreInterruptedJobs(opened);
  const app = Fastify({ logger: false });

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && !ALLOWED.has(origin)) {
      await reply.code(403).send({ error: 'origin_rejected', origin });
    }
    const host = request.headers.host ?? '';
    if (host && !host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
      await reply.code(403).send({ error: 'host_rejected', host });
    }
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

  app.get('/courses', async () => listCourses(opened));
  app.post('/courses', async (request, reply) => {
    const name = (request.body as { name?: unknown } | undefined)?.name;
    if (typeof name !== 'string' || !name.trim()) return reply.code(400).send({ error: 'name_required' });
    return createCourse(opened, name);
  });

  app.get('/appearance', async () => getAppearance(opened));
  app.put('/appearance', async (request) => setAppearance(opened, parseAppearance(request.body)));

  app.get('/courses/:id/layout', async (request) => getLayout(opened, (request.params as { id: string }).id));
  app.put('/courses/:id/layout', async (request) => setLayout(opened, (request.params as { id: string }).id, parseCardLayout(request.body)));

  app.get('/session', async () => getSession(opened));
  app.put('/session', async (request) => setSession(opened, request.body as SessionState));

  app.get('/drafts/:key', async (request) => getDraft(opened, (request.params as { key: string }).key));
  app.put('/drafts', async (request, reply) => {
    const body = request.body as { key?: unknown; courseId?: unknown; body?: unknown };
    if (typeof body.key !== 'string' || typeof body.body !== 'string') return reply.code(400).send({ error: 'invalid_draft' });
    return setDraft(opened, { key: body.key, courseId: typeof body.courseId === 'string' ? body.courseId : null, body: body.body });
  });

  app.post('/jobs', async (request, reply) => {
    const body = request.body as { courseId?: unknown; filename?: unknown; contentBase64?: unknown };
    if (typeof body.courseId !== 'string' || typeof body.filename !== 'string' || typeof body.contentBase64 !== 'string') {
      return reply.code(400).send({ error: 'invalid_job' });
    }
    try {
      resolveInside(opened.dataDir, body.filename.replace(/^\/+/, ''));
    } catch {
      return reply.code(400).send({ error: 'path_rejected' });
    }
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
    const body = request.body as { contentBase64?: unknown; filename?: unknown };
    if (typeof body.contentBase64 !== 'string' || typeof body.filename !== 'string') return reply.code(400).send({ error: 'invalid_retry' });
    try {
      return retryJob(opened, (request.params as { id: string }).id, () => Buffer.from(body.contentBase64 as string, 'base64'), body.filename);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  app.post('/files/probe-path', async (request, reply) => {
    const rel = (request.body as { path?: unknown }).path;
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
