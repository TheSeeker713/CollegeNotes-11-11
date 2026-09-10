import Fastify from 'fastify';
import { probeSqlite } from '@collegenotes/storage';
import { describeUnavailable } from '@collegenotes/providers';

export const DEFAULT_PORT = 4781;
const ALLOWED = new Set(['http://127.0.0.1:5173', 'http://127.0.0.1:4173', 'http://127.0.0.1:4781']);

export function createService() {
  const app = Fastify({ logger: false });
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && !ALLOWED.has(origin)) {
      await reply.code(403).send({ error: 'origin_rejected', origin });
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
      tutor: describeUnavailable('tutor')
    };
  });
  app.get('/providers/:kind', async (request, reply) => {
    const kind = (request.params as { kind: string }).kind;
    if (kind !== 'tutor' && kind !== 'narration' && kind !== 'recognition') {
      return reply.code(404).send({ error: 'unknown_provider' });
    }
    return { ok: false, message: describeUnavailable(kind) };
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
      process.exitCode = 2;
      throw error;
    }
    throw error;
  }
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await listen();
}
