import { createId, type Job } from '@collegenotes/domain';
import {
  requireCourse,
  checksum,
  findJobByFingerprint,
  getJob,
  insertJob,
  storeOriginal,
  updateJob,
  type Store
} from '@collegenotes/storage';

export function fingerprintFor(courseId: string, digest: string): string {
  return `${courseId}:${digest}`;
}

export function ingestBuffer(store: Store, courseId: string, filename: string, buffer: Buffer): Job {
  requireCourse(store, courseId, true);
  const digest = checksum(buffer);
  const fingerprint = fingerprintFor(courseId, digest);
  const existing = findJobByFingerprint(store, fingerprint);
  if (existing && (existing.status === 'completed' || existing.status === 'running' || existing.status === 'queued')) {
    return existing;
  }
  const now = new Date().toISOString();
  const job: Job = {
    id: createId('job'),
    kind: 'ingest',
    courseId,
    fingerprint,
    status: 'running',
    progress: 0,
    error: null,
    sourceId: null,
    createdAt: now,
    updatedAt: now
  };
  insertJob(store, job);
  try {
    const doc = storeOriginal(store, courseId, filename, buffer);
    return updateJob(store, { ...job, status: 'completed', progress: 100, sourceId: doc.id });
  } catch (error) {
    return updateJob(store, { ...job, status: 'failed', error: error instanceof Error ? error.message : 'ingest_failed' });
  }
}

export function cancelJob(store: Store, id: string): Job {
  const job = getJob(store, id);
  if (!job) throw Object.assign(new Error('not_found'), { code: 'not_found' });
  if (job.status === 'completed') return job;
  return updateJob(store, { ...job, status: 'cancelled' });
}

export function retryJob(store: Store, id: string, load: () => Buffer, filename: string): Job {
  const job = getJob(store, id);
  if (!job) throw Object.assign(new Error('not_found'), { code: 'not_found' });
  requireCourse(store, job.courseId, true);
  if (job.status === 'completed') return job;
  const running: Job = { ...job, status: 'running', error: null, progress: 0 };
  updateJob(store, running);
  try {
    const doc = storeOriginal(store, job.courseId, filename, load());
    return updateJob(store, { ...running, status: 'completed', progress: 100, sourceId: doc.id });
  } catch (error) {
    return updateJob(store, { ...running, status: 'failed', error: error instanceof Error ? error.message : 'retry_failed' });
  }
}
