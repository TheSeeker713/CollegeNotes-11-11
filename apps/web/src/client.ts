import type { Appearance, CardLayout, Course, Draft, Job, SessionState } from '@collegenotes/domain';

const BASE = 'http://127.0.0.1:4781';
const headers = { 'content-type': 'application/json', origin: window.location.origin, 'x-cn-client': 'collegenotes-web' };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`http_${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  async health() {
    return req<{ ok: boolean }>(`/health`);
  },
  courses: {
    list: () => req<Course[]>('/courses'),
    create: (name: string) => req<Course>('/courses', { method: 'POST', body: JSON.stringify({ name }) })
  },
  appearance: {
    get: () => req<Appearance>('/appearance'),
    put: (appearance: Appearance) => req<Appearance>('/appearance', { method: 'PUT', body: JSON.stringify(appearance) })
  },
  layouts: {
    get: (courseId: string) => req<CardLayout>(`/courses/${courseId}/layout`),
    put: (courseId: string, layout: CardLayout) => req<CardLayout>(`/courses/${courseId}/layout`, { method: 'PUT', body: JSON.stringify(layout) })
  },
  session: {
    get: () => req<SessionState>('/session'),
    put: (session: SessionState) => req<SessionState>('/session', { method: 'PUT', body: JSON.stringify(session) })
  },
  drafts: {
    get: (key: string) => req<Draft | null>(`/drafts/${encodeURIComponent(key)}`),
    put: (draft: Omit<Draft, 'updatedAt'>) => req<Draft>('/drafts', { method: 'PUT', body: JSON.stringify(draft) })
  },
  jobs: {
    create: (body: { courseId: string; filename: string; contentBase64: string }) => req<Job>('/jobs', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => req<Job>(`/jobs/${id}`),
    cancel: (id: string) => req<Job>(`/jobs/${id}/cancel`, { method: 'POST' }),
    retry: (id: string) => req<Job>(`/jobs/${id}/retry`, { method: 'POST' })
  }
};
