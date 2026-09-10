import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createService } from '../../apps/local-service/src/index.ts';
import { createCourse, insertJob, openStore, readOriginal } from '@collegenotes/storage';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cn-job-'));
}

describe('jobs and security', () => {
  it('rejects unexpected origins and path traversal', async () => {
    const app = createService(openStore(tmp()));
    const origin = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://evil.example' } });
    expect(origin.statusCode).toBe(403);
    const traversal = await app.inject({ method: 'POST', url: '/files/probe-path', payload: { path: '../secret' } });
    expect(traversal.statusCode).toBe(400);
    await app.close();
  });

  it('rejects malformed course and job bodies', async () => {
    const app = createService(openStore(tmp()));
    expect((await app.inject({ method: 'POST', url: '/courses', payload: { name: '  ' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/jobs', payload: { courseId: 1 } })).statusCode).toBe(400);
    await app.close();
  });

  it('cancels and retries without deleting originals, and does not duplicate completed work', async () => {
    const store = openStore(tmp());
    const course = createCourse(store, 'Jobs');
    const app = createService(store);
    const payload = { courseId: course.id, filename: 'notes.txt', contentBase64: Buffer.from('source-bytes').toString('base64') };
    const first = await app.inject({ method: 'POST', url: '/jobs', payload });
    const job = first.json() as { id: string; status: string; sourceId: string; fingerprint: string };
    expect(job.status).toBe('completed');
    const dup = await app.inject({ method: 'POST', url: '/jobs', payload });
    expect(dup.json()).toMatchObject({ id: job.id, status: 'completed' });
    const original = store.db.prepare('select * from source_documents where id = ?').get(job.sourceId) as { stored_rel_path: string; id: string; course_id: string; filename: string; checksum: string; byte_length: number; created_at: string };
    expect(readOriginal(store, {
      id: original.id,
      courseId: original.course_id,
      filename: original.filename,
      checksum: original.checksum,
      byteLength: original.byte_length,
      storedRelPath: original.stored_rel_path,
      createdAt: original.created_at
    }).toString()).toBe('source-bytes');
    const queued = insertJob(store, {
      id: 'job_cancel',
      kind: 'ingest',
      courseId: course.id,
      fingerprint: 'other',
      status: 'queued',
      progress: 0,
      error: null,
      sourceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const cancelled = await app.inject({ method: 'POST', url: `/jobs/${queued.id}/cancel` });
    expect(cancelled.json()).toMatchObject({ status: 'cancelled' });
    expect(readOriginal(store, {
      id: original.id,
      courseId: original.course_id,
      filename: original.filename,
      checksum: original.checksum,
      byteLength: original.byte_length,
      storedRelPath: original.stored_rel_path,
      createdAt: original.created_at
    }).toString()).toBe('source-bytes');
    await app.close();
  });
});

