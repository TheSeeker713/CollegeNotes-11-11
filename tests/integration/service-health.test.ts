import { describe, expect, it } from 'vitest';
import { createService } from '../../apps/local-service/src/index.ts';

describe('local service', () => {
  it('health reports sqlite and unavailable tutor without claiming a live provider', async () => {
    const app = createService();
    const res = await app.inject({ method: 'GET', url: '/health' });
    const body = res.json() as { ok: boolean; fts5: boolean; tutor: string };
    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.fts5).toBe(true);
    expect(body.tutor).toContain('unavailable');
    await app.close();
  });

  it('rejects unexpected origins', async () => {
    const app = createService();
    const res = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://evil.example' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
