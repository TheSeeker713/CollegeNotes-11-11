import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createService } from '../../apps/local-service/src/index.ts';
import { createCourse, insertJob, openStore, restoreInterruptedJobs, setDraft, setSession } from '@collegenotes/storage';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cn-resume-'));
}

describe('resume and recovery', () => {
  it('restores course, route, draft and appearance after reopen', async () => {
    const dir = tmp();
    const store = openStore(dir);
    const course = createCourse(store, 'COMM 110');
    setDraft(store, { key: 'note:x', courseId: course.id, body: 'Explain the example.' });
    setSession(store, { courseId: course.id, routeHash: `#/courses/${course.id}/study`, task: 'study', notice: null });
    store.db.close();
    const app = createService(openStore(dir));
    const session = (await app.inject({ method: 'GET', url: '/session' })).json() as { courseId: string; routeHash: string };
    const draft = (await app.inject({ method: 'GET', url: '/drafts/note%3Ax' })).json() as { body: string };
    expect(session.courseId).toBe(course.id);
    expect(session.routeHash).toContain('/study');
    expect(draft.body).toBe('Explain the example.');
    await app.close();
  });

  it('keeps a draft if session write is interrupted', () => {
    const store = openStore(tmp());
    const course = createCourse(store, 'Keep draft');
    setDraft(store, { key: 'note:keep', courseId: course.id, body: 'unsaved thought' });
    expect(store.db.prepare('select body from drafts where key = ?').get('note:keep')).toEqual({ body: 'unsaved thought' });
  });

  it('requeues interrupted jobs instead of duplicating them', () => {
    const store = openStore(tmp());
    const course = createCourse(store, 'Jobs');
    insertJob(store, {
      id: 'job_1',
      kind: 'ingest',
      courseId: course.id,
      fingerprint: 'fp',
      status: 'running',
      progress: 40,
      error: null,
      sourceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const queued = restoreInterruptedJobs(store);
    expect(queued).toHaveLength(1);
    expect(queued[0]?.status).toBe('queued');
    expect(store.db.prepare('select count(*) as n from jobs').get()).toEqual({ n: 1 });
  });
});
