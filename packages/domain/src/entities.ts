import { createId } from './ids.js';

export type Course = {
  id: string;
  name: string;
  createdAt: string;
};

export type SourceDocument = {
  id: string;
  courseId: string;
  filename: string;
  checksum: string;
  byteLength: number;
  storedRelPath: string;
  createdAt: string;
};

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type Job = {
  id: string;
  kind: 'ingest';
  courseId: string;
  fingerprint: string;
  status: JobStatus;
  progress: number;
  error: string | null;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SessionState = {
  courseId: string | null;
  routeHash: string;
  task: string;
  notice: string | null;
};

export type Draft = {
  key: string;
  courseId: string | null;
  body: string;
  updatedAt: string;
};

export function newCourse(name: string): Course {
  return { id: createId('crs'), name: name.trim(), createdAt: new Date().toISOString() };
}
