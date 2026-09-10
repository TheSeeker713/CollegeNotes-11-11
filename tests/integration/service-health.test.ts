import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createService } from '../../apps/local-service/src/index.ts';
import { openStore } from '@collegenotes/storage';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cn-health-'));
}

describe('local service', () => {
  it('health reports sqlite and unavailable tutor without claiming a live provider', async () => {
    const app = createService(openStore(tmp()));
    const res = await app.inject({ method: 'GET', url: '/health' });
    const body = res.json() as { ok: boolean; fts5: boolean; tutor: string };
    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.fts5).toBe(true);
    expect(body.tutor).toContain('unavailable');
    await app.close();
  });

  it('rejects unexpected origins', async () => {
    const app = createService(openStore(tmp()));
    const res = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://evil.example' } });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
